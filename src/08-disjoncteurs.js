/* ===========================================================================
   08 quinquies — LE DISJONCTEUR : ce que sa fiche porte en propre
   ---------------------------------------------------------------------------
   Le lecteur (la v3) : « au lieu de "Disjoncteur", vu qu'on le sait, mets
   "Calibre". Le part number, dégage. Ne mets pas tous les calibres, mets le
   calibre retenu ; il doit être plus sexy : n'importe qui doit comprendre en
   un coup d'œil — valide ou pas, je déclenche ou pas. Je choisis mon calibre
   automatiquement, mais je peux le choisir à la main, et alors un bouton
   "automatique". Le profil : des boutons pour supprimer aussi les états
   existants ; la durée en secondes, le courant en ampères. » Dans le
   squelette commun des fiches (08-sections), le disjoncteur a UNE section à
   lui, « Calibre » :
     · LE CALIBRE RETENU en grand, son verdict d'une marque sans un mot (une
       coche verte ; une croix rouge et, en clair, ce qui ne va pas), le fond à
       peine teinté de l'état, et son « ? » (d'où il vient : automatique — le
       meilleur —, à la main, le retest) ;
       UNE commande, deux segments : « Automatique » (pressé quand c'est lui ;
       « Automatique (15 A) » le retient) · « À la main ▾ », qui ouvre la
       gamme qui passe (`d.gamme`) — le part number suit (`retenirCalibre`) ;
       la clé du cadran en mots, dessous ; les câbles que le meilleur demande
       de grossir ;
     · v72, LA CARTE DE DÉCISION en tête de fiche quand le retest ne passe pas
       (`carteDecision`) : « Passer en 15 A et grossir les 3 câbles » (un
       geste, une entrée d'historique : `deciderCalibre`), « Garder le
       10 A… » (ce qu'il faudrait pour qu'il passe) ;
     · LA COURBE, sur papier (son dessin : 08-courbe-dj, `grapheSvg`) — les
       quatre températures, toujours, sans bascule ;
     · LE PROFIL DE CHARGE : un petit tableau — démarrage, transition,
       permanent, puis les états ajoutés —, les unités dans l'en-tête, chaque
       valeur modifiable, chaque état supprimable (×), « + État ».
   Ses câbles (l'intensité au pire contre ce qu'ils admettent, la chute en
   ligne jusqu'au bout de leur chemin) vont dans la section commune « Câbles »
   (`lignesFilsDisjoncteur`). Le moteur (09 bis, 09 quater) juge ; ici on lit,
   on montre, on écrit au contrat. On ne lisse que le DESSIN : le jugement
   reste celui du moteur.
   =========================================================================== */
'use strict';

/* ---- lire le disjoncteur ------------------------------------------------------------ */
/* Le profil de charge d'un disjoncteur : celui qu'on a écrit sur sa fiche ; sinon (rien d'écrit) la SOMME de ce qu'il
   alimente (`profilDesConsommateurs`, plus bas) ; `chargeEcrite` : seulement ce qui est écrit. */
const chargeEcrite = nom => (app.contrat.charges && app.contrat.charges.get(nom)) || null;
const chargeDe = nom => { const c = chargeEcrite(nom); if (phaseEcrite(c) || !estDisjoncteur(nom)) return c;
  const s = profilDesConsommateurs(nom); return s ? { ...(c || {}), ...s } : c; };
/* LA CONSOMMATION D'UN ÉQUIPEMENT (le lecteur, v74 : « le courant de chaque équipement, c'est moi qui l'ai, sur des PDF :
   quand je clique sur un équipement, je rajoute ses consos à la main ; toi, tu en déduis le calibre du disjoncteur ») :
   gardée avec les profils (`app.contrat.charges`, sous le repère de l'équipement : { perm: { i }, dem: { i, t } }) — elle
   suit donc le contrat partout (historique, enregistrement, feuille « Volta » de l'Excel). Un disjoncteur sans profil
   écrit prend la SOMME de ce qu'il alimente, au-delà des prises et des barrettes : les permanents s'ajoutent, les
   démarrages aussi — tous au même instant, le pire —, sur la durée la plus longue. Écrire son profil le remplace. */
const phaseEcrite = c => !!c && ['dem', 'trans', 'perm'].some(k => c[k] && nombreLu(c[k].i) > 0);
const consoDe = nom => { const c = nom && !estDisjoncteur(nom) ? chargeEcrite(nom) : null; return phaseEcrite(c) ? c : null; };
// ce qu'un disjoncteur alimente : les bouts des chemins qui partent de lui (ni disjoncteur, ni masse)
const consommateursDe = nom => !estDisjoncteur(nom) ? [] : [...new Set(cheminsDepuis(verite(), nom).map(ch => ch.bout[0]).filter(r => r && r !== nom && !estDisjoncteur(r) && !estMasse(r)))].sort(triNaturel);
// les disjoncteurs qui alimentent un équipement
const disjoncteursDe = nom => reperesDe(verite()).filter(estDisjoncteur).filter(d => consommateursDe(d).includes(nom)).sort(triNaturel);
let CONSOS = { v: null, sig: '', m: new Map() };
function profilDesConsommateurs(nom) { const V = verite(), C = app.contrat.charges || new Map();
  const sig = [...C].filter(([k, c]) => !estDisjoncteur(k) && phaseEcrite(c)).map(([k, c]) => k + JSON.stringify(c)).join('|');
  if (!sig) return null;   // aucune consommation écrite : rien à sommer (et aucun chemin à suivre)
  if (CONSOS.v !== V || CONSOS.sig !== sig + V.length) CONSOS = { v: V, sig: sig + V.length, m: new Map() };
  if (CONSOS.m.has(nom)) return CONSOS.m.get(nom);
  const xs = consommateursDe(nom).map(r => ({ r, c: consoDe(r) })).filter(x => x.c), v = (c, k) => c[k] && nombreLu(c[k].i) > 0 ? nombreLu(c[k].i) : 0, r3 = x => Math.round(x * 1000) / 1000;
  let out = null;
  if (xs.length) { out = { somme: xs.map(x => x.r) }; const perm = xs.reduce((s, x) => s + v(x.c, 'perm'), 0), dems = xs.filter(x => v(x.c, 'dem') > 0);
    if (perm > 0) out.perm = { i: r3(perm) };
    if (dems.length) out.dem = { i: r3(xs.reduce((s, x) => s + (v(x.c, 'dem') || v(x.c, 'perm')), 0)), t: Math.max(...dems.map(x => nombreLu(x.c.dem.t) || 0)) || null }; }
  CONSOS.m.set(nom, out); return out; }
/* Écrire la consommation d'un équipement : `q` est 'perm', 'dem' (le courant) ou 'demt' (la durée du démarrage). */
function ecrireConso(nom, q, valeur) { const x = valeur === '' || valeur == null ? null : nombreLu(valeur);
  if (valeur !== '' && valeur != null && !(x >= 0)) { dire('Écrivez un nombre (3,5).', true); return false; }
  const c = JSON.parse(JSON.stringify(chargeEcrite(nom) || {}));
  if (q === 'perm') c.perm = x ? { i: x } : undefined; else if (q === 'dem') c.dem = x ? { ...(c.dem || {}), i: x } : undefined; else if (q === 'demt') c.dem = { ...(c.dem || {}), t: x };
  Object.keys(c).forEach(k => c[k] === undefined && delete c[k]);
  if (JSON.stringify(c) === JSON.stringify(chargeEcrite(nom) || {})) return false;
  histPush('consommation de ' + nom); if (!app.contrat.charges) app.contrat.charges = new Map();
  if (phaseEcrite(c) || (c.dem && c.dem.t)) app.contrat.charges.set(nom, c); else app.contrat.charges.delete(nom);
  apresEdition(); const djs = disjoncteursDe(nom);
  dire('Consommation de ' + nom + ' écrite' + (djs.length ? ' — ' + djs.map(d => d + ' en ' + (calibreDe(d) ? amperes(calibreDe(d)) : '—')).join(', ') : '') + '.'); return true; }
/* Le part number d'un repère : celui que ses liaisons portent. */
function pnDuRepere(nom) { for (const l of verite()) { if (l.de === nom && l.pnDe) return l.pnDe; if (l.vers === nom && l.pnVers) return l.pnVers; } return ''; }
/* Les fils d'un disjoncteur : ceux qui le touchent, des deux côtés (la borne, l'autre bout, `amont`), puis tout ce qu'il
   nourrit au-delà des prises de coupure et des barrettes (`via` : le passage), chacun avec le contact du plan quand les
   fiches le connaissent (`taille`, le plus faible des deux bouts — le courant du contact en dépend). */
function filsDuDisjoncteur(nom) { const V = verite(), directs = V.filter(l => (l.de === nom || l.vers === nom) && l.de !== l.vers)
    .map(l => ({ cable: l.cable, type: l.type, borne: l.de === nom ? l.borneDe : l.borneVers, autre: l.de === nom ? l.vers + (l.borneVers ? ':' + l.borneVers : '') : l.de + (l.borneDe ? ':' + l.borneDe : ''), amont: l.vers === nom, direct: true, via: '', l }));
  const vus = new Set(directs.map(f => f.l)), suite = filsDepuis(V, nom).filter(f => !vus.has(f.l)).map(f => ({ ...f, amont: false }));
  return directs.concat(suite).map(f => ({ ...f, ...contactDuPlan(f.l) })); }
/* Ce qu'un fil supporte, en mots : la limite de DOMMAGE (R2 : un fil cuivre est protégé tant que ce que le disjoncteur
   laisse passer reste sous ce qu'il supporte avant de s'abîmer), sinon — aluminium, CCA, sans courbe — son intensité de
   service, plus sévère. `x` : la case de `laisse` qui juge. */
const limiteDuFil = (f, x) => f.jugeSur === 'dommage' ? `il s’abîme au-delà de ${amperes(x.admise)}` : `le câble admet ${amperes(x.admise)} en service`;
const courantDuContactPose = x => typeof intensiteDuContactPose === 'function' ? intensiteDuContactPose(app.norme, x) : intensiteDeContact(app.norme, x.taille);
/* Le contact d'un fil par les plans de ses deux bouts (barrette, prise, cavité d'un connecteur) : la taille la plus faible
   en courant — le courant du contact posé, borné par la jauge du fil serti dedans quand le moteur sait le dire
   (`intensiteDuContactPose`), sinon celui de la taille —, et le repère qui la porte. Rien quand aucun plan ne le connaît. */
function contactDuPlan(l) { const xs = [];
  [l.de, l.vers].forEach(r => { if (!r || estMasse(r) || estRenvoi(r) || estDisjoncteur(r)) return;
    try { const fils = barretteEnModules(r) ? planDeBarrette(r).plan.fils : coupureEnModules(r) ? planDeCoupure(r).plan.fils : estBornier(r) ? [] : cavitesDe(r).flatMap(c => c.plan.fils);
      fils.forEach(x => { if (x.f && x.f.l === l && x.taille) { const i = courantDuContactPose(x); if (i) xs.push({ taille: x.taille, repere: r, i: i.intensite }); } }); } catch (_) { } });
  if (!xs.length) return {}; xs.sort((a, b) => a.i - b.i); return { taille: xs[0].taille, contactRepere: xs[0].repere }; }
/* Les disjoncteurs VOISINS d'un repère : ceux où aboutit un chemin de fils depuis lui (bus → sous-bus) ; leur calibre
   nominal (écrit, sinon le part number) sert à la sélectivité 2:1 — sans passer par l'idéal, qui dépendrait du nôtre. */
const calibreNominal = nom => { const p = chargeDe(nom); if (p && p.calibre > 0) return p.calibre; const f = familleDuPn(pnDuRepere(nom), app.norme); return f ? f.calibre : null; };
/* Le calibre que le FOLIO écrit à côté du symbole : le retenu (l'automatique d'office, comme la fiche — le lecteur : « commence
   directement par l'automatique »), sinon, si le moteur ne sait pas trancher, le nominal. */
const calibreAuFolio = nom => { try { const d = disjonctionDe(nom); return d && d.calibre > 0 ? d.calibre : calibreNominal(nom); } catch (e) { return calibreNominal(nom); } };
/* Le calibre d'un VOISIN, pour la sélectivité : celui que l'outil lui retient (l'automatique, comme sa fiche et son folio)
   — jugé sur un seul niveau : ses propres voisins, eux, comptent pour leur calibre nominal (pas de ricochet sans fin). */
let VOISINS_NOMINAUX = 0;
const calibreDuVoisin = r => { if (VOISINS_NOMINAUX) return calibreNominal(r); VOISINS_NOMINAUX++;
  try { const d = disjonctionDe(r); return d && d.calibre > 0 ? d.calibre : calibreNominal(r); } catch (_) { return calibreNominal(r); } finally { VOISINS_NOMINAUX--; } };
const disjoncteursVoisins = nom => [...new Set(cheminsDepuis(verite(), nom).map(ch => ch.bout[0]).filter(r => r && r !== nom && estDisjoncteur(r)))].map(r => ({ nom: r, calibre: calibreDuVoisin(r) }));
/* Le calibre RETENU (le lecteur, version 62 : « commence directement par l'automatique — mais uniquement le calibre qui
   passe, en tout premier lieu ») : celui qu'on a choisi à la main (écrit au profil, ou le part number changé ici),
   sinon LE MEILLEUR que le moteur trouve — le plus petit de la gamme qui passe —, sinon (aucun ne passe, ou pas de profil)
   celui du part number du retest. Le part number du retest reste lu (`pn`) : le contrôle dit quand il diffère. Rend le
   verdict complet (09 bis, jugé avec ses fils et ses voisins), le profil, la famille du part number, d'où vient le
   calibre, et ses fils jugés. */
// le part number d'un disjoncteur changé ici (le calibre choisi à la main dans la gamme le réécrit, le retest gardé dans `avant`)
const pnChangeIci = nom => verite().some(l => [['de', 'pnDe'], ['vers', 'pnVers']].some(([b, ch]) => l[b] === nom && l.avant && ch in l.avant && l.avant[ch] !== (l[ch] == null ? null : l[ch])));
function disjonctionDe(nom) { const profil = chargeDe(nom), ecrit0 = profil && profil.calibre > 0 ? profil.calibre : null, famille = familleDuPn(pnDuRepere(nom), app.norme), pn = famille ? famille.calibre : null, voisins = disjoncteursVoisins(nom);
  // la famille de courbes : celle que la famille du part number dit (table Familles de disjoncteurs), sinon celle par défaut (la feuille du lecteur)
  const courbe = famille && famille.courbe ? famille.courbe : '', hyp = { ...(app.simu || HYPOTHESES), courbe };
  // la famille du part number donne au moteur son catalogue (la gamme), sa calibration (ce qu'il garantit) et le part number du meilleur
  const contexte = { fils: filsDuDisjoncteur(nom), hyp, autres: voisins.map(v => v.calibre).filter(c => c > 0), famille, pn: pnDuRepere(nom) };
  let d = verdictDisjonction(app.norme, courbe, ecrit0 || pn || 0, profil, contexte);
  // le meilleur, s'il PASSE (le lecteur : « si ça touche la courbe, c'est mort ») : un meilleur « serré » ne passe pas
  const m0 = d.meilleur || {}, passe = !d.sansProfil && m0.calibre && !m0.serre ? m0.calibre : null;
  // à la main : le calibre écrit, ou celui du part number changé ici — sauf quand ce part number porte le meilleur : le retest
  // a été corrigé par le choix de l'outil (la carte de décision, « Passer en 15 A »), le calibre reste l'automatique
  // (un part number que VOLTA a réécrit — la règle du lecteur, plus bas — n'est pas un choix à la main)
  const ecrit = ecrit0 || (pn && pnChangeIci(nom) && !pnDeVolta(nom) && pn !== passe ? pn : null);
  // LA RÈGLE DU LECTEUR (v74) : « dès que ça touche la courbe, on ne prend pas ; on prend que quand ça ne touche pas » —
  // le calibre du fichier est gardé s'il PASSE (avec la marge) ; sinon, le plus petit qui passe
  // (le calibre que Volta a écrit lui-même n'est pas celui du fichier : il suit le profil)
  const gPn0 = pn && !d.sansProfil && !pnDeVolta(nom) ? (d.gamme || []).find(g => g.calibre === pn) : null, pnPasse = gPn0 && cleDuVerdict(gPn0) === 'passe' && !(passe > pn) ? pn : null;   // (plus petit que le meilleur : la sélectivité ou un câble le refuse)
  const calibre = ecrit || pnPasse || passe || pn || d.calibreIdeal || null; if (calibre && calibre !== d.calibre) d = verdictDisjonction(app.norme, courbe, calibre, profil, contexte);
  const chutePropre = chuteDuDisjoncteur(app.norme, famille, calibre);
  // le part number du retest jugé à son tour (passe-t-il ?) quand l'outil en retient un autre
  const gPn = pn && pn !== calibre ? (d.gamme || []).find(g => g.calibre === pn) || null : null;
  return { ...d, profil, ecrit, pn, gPn, famille, courbe, chutePropre, voisins, contexte, passe, origine: ecrit ? 'main' : calibre && calibre === passe ? 'ideal' : pn && calibre === pn ? 'pn' : calibre ? 'ideal' : '', fils: protectionDesFils(app.norme, calibre, profil, contexte.fils, hyp) }; }
const calibreDe = nom => disjonctionDe(nom).calibre;
/* LE MEILLEUR CALIBRE d'un disjoncteur, avec ses fils (09 bis, `meilleurDe`) : { calibre, pn, famille, catalogue, pourquoi,
   marge, filsAChanger: [{ cable, actuel, propose, raison, … }], contactsTouches: [{ cable, actuel, propose, raison, … }],
   filsInconnus, selectif, serre, reserve }. */
const meilleurCalibre = nom => disjonctionDe(nom).meilleur;
/* LE CALIBRE QUE VOLTA ÉCRIT LUI-MÊME (le lecteur, v74 : « si le calibre touche la courbe, tu ne l'expliques pas : tu mets
   directement le calibre automatique qui marche ; on garde automatique / manuel et la possibilité de revenir ») : un
   disjoncteur dont le calibre du fichier touche la courbe ou déclenche prend, sans carte ni question, le plus petit qui
   passe — son part number réécrit sur chaque liaison, les câbles que ce calibre demande grossis —, le fichier gardé dans
   `avant` et la case marquée « Volta » (08-export, `avecOrigineVolta`). Un calibre retenu à la main ne bouge pas ;
   « Automatique » (`rendreCalibre`) revient ici. Sans famille de part number (rien à réécrire) : le calibre de l'outil est
   déjà celui du folio et des exports. Appelé après chaque geste (`apresEdition`) et à l'ouverture d'un plan. Rend le
   nombre de disjoncteurs réécrits. */
const pnDeVolta = nom => verite().some(l => [['de', 'pnDe'], ['vers', 'pnVers']].some(([b, ch]) => { const v = l[b] === nom && l.avant ? l.avant[ORIGINE_VOLTA + ch] : undefined; return v !== undefined && v === (l[ch] == null ? null : l[ch]); }));
function appliquerCalibresVolta() { if (!app.norme || !verite().length || (app.simu || HYPOTHESES).calibreAuto === false) return 0; let n = 0;
  const noms = [...new Set(verite().flatMap(l => [l.de, l.vers]).filter(r => r && estDisjoncteur(r)))];
  noms.forEach(nom => { let d; try { d = disjonctionDe(nom); } catch (_) { return; }
    if (d.origine === 'main' || d.sansProfil || d.sansCourbe || !d.famille || !(d.pn > 0) || !(d.passe > 0) || d.calibre !== d.passe || d.pn === d.passe) return;
    // un calibre que Volta avait écrit, quand le profil change : celui du fichier revient s'il passe désormais
    const pn = pnDuRepere(nom), o = pnDeVolta(nom) ? origineDuCalibre(nom, d) : null, gF = o && o.calRetest ? (d.gamme || []).find(g => g.calibre === o.calRetest) : null;
    if (gF && cleDuVerdict(gF) === 'passe' && o.pnRetest) { verite().forEach(l => [['de', 'pnDe'], ['vers', 'pnVers']].forEach(([b, ch]) => { if (l[b] === nom && l.avant && ch in l.avant) poserChamp(l, ch, l.avant[ch]); })); n++; return; }
    const nouveau = pnAvecCalibre(pn, d.famille, d.passe); if (!nouveau || nouveau === pn) return;
    const xs = d.passe === (d.meilleur || {}).calibre ? filsDuMeilleur(d).filter(p => p.f && p.x.propose) : [];
    avecOrigineVolta(() => { verite().forEach(l => [['de', 'pnDe'], ['vers', 'pnVers']].forEach(([b, ch]) => { if (l[b] === nom && l[ch]) poserChamp(l, ch, nouveau); }));
      xs.forEach(p => poserChamp(p.f.l, 'type', p.x.propose)); });
    n++; });
  return n; }
// à l'ouverture d'un plan (l'exemple, un plan de la bibliothèque) : réécrire, puis refaire les folios si quelque chose a changé
function calibresVoltaALOuverture() { let n = 0; try { n = appliquerCalibresVolta(); } catch (_) { n = 0; } if (n && app.nFolios) refaireFolios(); return n; }
/* D'OÙ VIENT LE CALIBRE RETENU, dans les mots des origines (08-sections) : « main » s'il a été écrit ici ou si le part
   number du disjoncteur a été changé ici (`avant` garde celui du retest), « retest » s'il se lit dans le part number du
   fichier, « auto » si c'est le meilleur que l'outil trouve. Rend aussi le part number du retest et son calibre. */
function origineDuCalibre(nom, d) { let pnRetest = null;
  verite().forEach(l => [['de', 'pnDe'], ['vers', 'pnVers']].forEach(([b, ch]) => { if (l[b] === nom && l.avant && ch in l.avant && l.avant[ch] !== (l[ch] == null ? null : l[ch]) && pnRetest == null) pnRetest = l.avant[ch] || ''; }));
  const Fr = pnRetest ? familleDuPn(pnRetest, app.norme) : null;
  // un part number changé ici qui porte le meilleur (« Passer en 15 A ») : le calibre reste celui de l'outil
  return { origine: d.ecrit ? 'main' : d.origine === 'pn' ? 'retest' : d.calibre ? 'auto' : '', pnRetest, calRetest: Fr ? Fr.calibre : null }; }

/* ---- les mots ----------------------------------------------------------------------- */
const pourcent = x => nombre(Math.round(x * 100)) + ' %';
// « pour 10 s », « pour 1 min », « en continu »
const pourPalier = p => p === 2 ? 'pour 2 s' : p === 10 ? 'pour 10 s' : p === 60 ? 'pour 1 min' : 'en continu';
const motFacteur = f => Math.abs(f - 1) < 1e-9 ? '' : ' (× ' + nombre(Math.round(f * 100) / 100) + ')';
/* Un temps, lisible : « 12 ms », « 3,2 s », « 2,1 min », « jamais ». */
function secondes(t) { if (!isFinite(t)) return 'jamais'; if (t < 1) return nombre(Math.round(t * 1000)) + ' ms'; if (t < 60) return nombre(Math.round(t * 10) / 10) + ' s';
  if (t < 3600) return nombre(Math.round(t / 6) / 10) + ' min'; return nombre(Math.round(t / 360) / 10) + ' h'; }
const amperes = i => nombre(Math.round(i * 100) / 100) + ' A', amperes1 = i => nombre(Math.round(i * 10) / 10) + ' A';
const majuscule = s => s ? s[0].toUpperCase() + s.slice(1) : s;
// la fraction du temps de déclenchement consommée : verte sous 75 %, ambre jusqu'à 100 %, rouge au-delà
const classeFraction = x => x < MARGE_FRACTION - 1e-9 ? 'ok' : x < 1 - 1e-9 ? 'serre' : 'ko';
const motFraction = x => x > 9.995 ? '> 1 000 %' : pourcent(x);
const motMarge = m => (m >= 1 ? '+' : '−') + nombre(Math.round(Math.abs(m - 1) * 100)) + ' %';
/* LES TROIS MOTS DU VERDICT (v73, l'ingénieur, point 8 : « les mots changent d'un écran à l'autre » — tient, touche la
   courbe, ne passe pas, calibre à revoir) : PASSE (il ne déclenche pas, avec la marge), JUSTE (il passe sans la marge :
   il touche la courbe), DÉCLENCHE. « Touche la courbe » et « sans la marge » vont dans la bulle. La table unique est
   celle du domaine C (09-disjoncteurs : `VERDICTS_CALIBRE` { passe, juste, declenche } → { cle, mot, encre, etat, bulle }, et
   `verdictDeCalibre(case)` qui rend son entrée) ; tant qu'elle manque, la même, ici, et la fiche ne change pas d'un mot
   quand elle arrive. */
const MOTS_VERDICT_FICHE = Object.freeze({
  passe: Object.freeze({ mot: 'passe', etat: 'ok', bulle: 'Il ne déclenche pas, avec la marge.' }),
  juste: Object.freeze({ mot: 'juste', etat: 'att', bulle: 'Il passe, sans la marge : il touche la courbe.' }),
  declenche: Object.freeze({ mot: 'déclenche', etat: 'ko', bulle: 'Il déclenche.' }) });
const motsVerdict = () => typeof VERDICTS_CALIBRE === 'object' && VERDICTS_CALIBRE && VERDICTS_CALIBRE.passe && VERDICTS_CALIBRE.juste && VERDICTS_CALIBRE.declenche ? VERDICTS_CALIBRE : MOTS_VERDICT_FICHE;
/* La clé du verdict d'un calibre jugé — une case de la gamme (`valide`, `marge`) ou le verdict d'ensemble (`valide`,
   `avecMarge`) — : 'passe', 'juste', 'declenche' ; '' quand rien ne se juge (pas de profil). */
function cleDuVerdict(g) { if (typeof verdictDeCalibre === 'function') { try { const v = verdictDeCalibre(g), k = v && (v.cle || (typeof v === 'string' ? v : '')); if (k && motsVerdict()[k]) return k; } catch (_) { } }
  if (!g || g.valide == null) return ''; if (g.valide === false) return 'declenche'; return (g.marge != null ? g.marge : g.avecMarge) ? 'passe' : 'juste'; }
const motDuVerdict = k => (motsVerdict()[k] || {}).mot || '';
const etatDuVerdict = k => (motsVerdict()[k] || {}).etat || '';
// le sort d'un point du profil, en trois mots : sa classe (ok, serre — le juste, en ambre —, ko ; rien s'il n'est pas jugé)
// et son mot ; le pourquoi (« touche la courbe ») dans la bulle du point
const classeVerdict = p => !p || p.ok == null ? '' : p.ok === false ? 'ko' : p.serre ? 'serre' : 'ok';
const motVerdict = p => !p || p.ok == null ? 'pas jugé' : p.ok === false ? motDuVerdict('declenche') : p.serre ? motDuVerdict('juste') + ' : touche la courbe' : motDuVerdict('passe');
const pluriel2 = (n, mot, mots) => n + ' ' + (n > 1 ? mots || mot + 's' : mot);

/* Ce que le contrôle en dit : un problème si une phase fait déclencher (le bilan thermique déborde), ou si un fil ne
   tient pas le profil ; à voir sans profil, si le calibre posé n'est pas l'idéal, si le calibre dépasse ce qu'un fil
   admet en continu, si la courbe lente laisse passer plus qu'un fil ne tient à un palier, si un disjoncteur voisin
   n'est pas à 2:1. */
function controleDisjonction(nom) { const d = disjonctionDe(nom), out = [], pnMot = d.origine === 'pn' ? ' (part number)' : '';
  if (!d.sansCourbe) { if (d.sansProfil) out.push({ niveau: 'att', texte: (d.calibre ? amperes(d.calibre) + ' · ' : '') + 'le profil de charge est à renseigner : l’outil trouve le calibre' });
    else if (!(d.calibre > 0)) out.push({ niveau: 'att', texte: 'aucun calibre de la gamme ne tient ce profil' });
    else if (!d.valide) { const p = d.pire, m = p.marges[0], mini = d.calibreIdeal ? ` — l’idéal est un ${amperes(d.calibreIdeal)}` : ' — aucun calibre de la gamme ne tient';
      out.push({ niveau: 'ko', texte: (p.t === Infinity ? `le permanent (${amperes(p.i)}) fait déclencher le ${amperes(d.calibre)} à ${m.courbe} (il tient jusqu'à ${amperes(m.admis)})`
        : `${p.nom} ${amperes(p.i)} pendant ${secondes(p.t)} : le ${amperes(d.calibre)} déclenche à ${m.courbe} (${motFraction(d.somme)} du temps de déclenchement consommé, il tient ${secondes(m.temps)} à ce courant)`) + mini }); }
    // (les trois mots : JUSTE — il passe sans la marge, il touche la courbe — est à voir, en ambre ; DÉCLENCHE est un problème)
    else if (d.calibreIdeal && d.calibre !== d.calibreIdeal) out.push({ niveau: 'att', texte: d.calibre > d.calibreIdeal ? `${amperes(d.calibre)}${pnMot} : un ${amperes(d.calibreIdeal)} suffirait`
      : !d.avecMarge ? `${amperes(d.calibre)}${pnMot} ${motDuVerdict('juste')} : il touche la courbe (${d.somme > d.marges.fraction ? motFraction(d.somme) + ' du temps de déclenchement consommé' : 'sans ' + nombre(d.marges.marge) + ' % de marge de courant'}) — l’idéal est un ${amperes(d.calibreIdeal)}`
      : `${amperes(d.calibre)}${pnMot} ${motDuVerdict('passe')} ; l’idéal est un ${amperes(d.calibreIdeal)} (sélectivité avec le voisin)` }); }
  // le retest porte un autre calibre que celui que l'outil retient : il déclenche (un problème), il est juste ou plus gros qu'il ne faut (à voir)
  if (d.gPn && d.origine !== 'main' && !d.sansProfil && !d.sansCourbe && d.calibre > 0) { const k = cleDuVerdict(d.gPn), m = d.meilleur || {}, pnR = pnDuRepere(nom), retenu = 'l’outil retient le ' + amperes(d.calibre) + (m.pn && m.calibre === d.calibre ? ' (' + m.pn + ')' : '');
    out.push({ niveau: k === 'declenche' ? 'ko' : 'att', texte: k === 'passe' ? `l’installation porte un ${amperes(d.pn)} (${pnR}) : ${d.calibre < d.pn ? 'le ' + amperes(d.calibre) + ' suffit' : 'l’outil retient le ' + amperes(d.calibre) + (d.voisins.some(v => v.calibre > 0 && Math.max(v.calibre, d.pn) < SELECTIVITE * Math.min(v.calibre, d.pn) - 1e-9) ? ' (sélectivité avec le voisin)' : '')}`
      : k === 'juste' ? `l’installation porte un ${amperes(d.pn)} (${pnR}), ${motDuVerdict('juste')} — il touche la courbe : ${retenu}` : `l’installation porte un ${amperes(d.pn)} (${pnR}) qui ${motDuVerdict('declenche')} : ${retenu}` }); }
  d.voisins.forEach(v => { if (v.calibre > 0 && d.calibre > 0 && Math.max(v.calibre, d.calibre) < SELECTIVITE * Math.min(v.calibre, d.calibre) - 1e-9) out.push({ niveau: 'att', texte: `sélectivité avec ${v.nom} (${amperes(v.calibre)}) : l’amont devrait faire au moins le double de l’aval` }); });
  d.fils.forEach(f => { const nomF = (f.cable || 'câble sans numéro') + (f.type ? ' (' + f.type + ')' : '');
    if (f.verdict === 'fil') out.push({ niveau: 'ko', texte: `${nomF} : ${f.pire.nom} ${amperes(f.pire.i)}${f.pire.t === Infinity ? '' : ' / ' + secondes(f.pire.t)} > ${amperes(f.pire.admise)} admis ${pourPalier(f.pire.palier)}${motFacteur(f.pire.palier === Infinity ? f.facteur : f.facteurCourt)}` });
    else if (f.verdict === 'calibre') out.push({ niveau: 'att', texte: `${nomF} : ${amperes(f.continu)} admis en continu${motFacteur(f.facteur)} < calibre ${amperes(d.calibre)} — pas protégé en surcharge` });
    else if (f.protege === false) { const x = f.pireLaisse; out.push({ niveau: 'att', texte: `${nomF} : pas protégé en surcharge brève — le ${amperes(d.calibre)} laisse passer ${amperes(x.courant)} ${pourPalier(x.palier)} à ${f.courbeLente}, ${limiteDuFil(f, x)}` }); } });
  return out; }

/* ---- les gestes sur le contrat ------------------------------------------------------ */
/* Poser un champ d'une liaison en gardant ce que le fichier portait (`l.avant`, comme `changerLiaison`, 08-sections) — sans
   entrée d'historique : l'appelant en pose une pour tout le lot. Revenu à la valeur du fichier, la trace s'efface. */
function poserChamp(l, champ, valeur) { if (!(l.avant && champ in l.avant)) l.avant = { ...(l.avant || {}), [champ]: l[champ] == null ? null : l[champ] };
  if (valeur == null || valeur === '') delete l[champ]; else l[champ] = valeur;
  if (l.avant[champ] === (l[champ] == null ? null : l[champ])) { const av = { ...l.avant }; delete av[champ]; if (Object.keys(av).length) l.avant = av; else delete l.avant; } }
/* Le profil de charge, écrit au contrat sans perdre ce qui n'est pas lui (le calibre écrit) ; vide, il s'efface — sauf
   s'il garde un état supprimé (`null` à la place du démarrage, de la transition ou du permanent : l'état n'est plus là). */
function poserCharge(nom, c) { if (c && 'somme' in c) { c = { ...c }; delete c.somme; } const vide = !(c.calibre > 0) && !['dem', 'trans', 'perm'].some(k => (c[k] && c[k].i != null) || c[k] === null) && !(c.plus && c.plus.length);
  if (vide) app.contrat.charges.delete(nom); else app.contrat.charges.set(nom, c); }
/* RETENIR UN CALIBRE À LA MAIN : il s'écrit au profil de charge, et un disjoncteur dont le part number dit la famille
   change aussi de part number (MS3320-10 → MS3320-15, sur chacune de ses liaisons, le retest gardé dans `avant`).
   Retenir l'automatique (le meilleur qui passe), c'est rendre le choix à l'outil. Une entrée d'historique : Ctrl+Z le
   défait. */
function retenirCalibre(nom, cal) { const d = disjonctionDe(nom); if (!(cal > 0)) return false;
  if (d.passe && cal === d.passe && !d.ecrit) return false;
  if (d.passe && cal === d.passe) { rendreCalibre(nom); return true; }
  if (d.ecrit === cal) return false;
  const pn = pnDuRepere(nom), F = d.famille, nouveau = F && pn ? pnAvecCalibre(pn, F, cal) : null;
  histPush('calibre de ' + nom + ' : ' + amperes(cal)); const c = { ...(chargeEcrite(nom) || {}), calibre: cal };
  if (nouveau && nouveau !== pn) verite().forEach(l => [['de', 'pnDe'], ['vers', 'pnVers']].forEach(([b, ch]) => { if (l[b] === nom && l[ch]) poserChamp(l, ch, nouveau); }));
  // le mot qui passe dit ce que le calibre retenu fait (un calibre qui déclenche se retient : le lecteur veut voir pourquoi)
  poserCharge(nom, c); apresEdition(); const g = (disjonctionDe(nom).gamme || []).find(x => x.calibre === cal), k = cleDuVerdict(g);
  dire(nom + ' : ' + amperes(cal) + ' retenu à la main' + (nouveau ? ' (' + nouveau + ')' : '') + (k ? ' — il ' + motDuVerdict(k) : '') + '. « Automatique » rend le choix de l’outil.'); return true; }
/* « Automatique » : rendre le choix à l'outil — le part number du retest sur chaque liaison, plus de calibre écrit ; le
   calibre redevient le meilleur qui passe (sinon celui du part number). */
function rendreCalibre(nom) { histPush('calibre de ' + nom + ' : automatique');
  verite().forEach(l => [['de', 'pnDe'], ['vers', 'pnVers']].forEach(([b, ch]) => { if (l[b] === nom && l.avant && ch in l.avant) poserChamp(l, ch, l.avant[ch]); }));
  const c = chargeEcrite(nom); if (c && c.calibre != null) poserCharge(nom, { ...c, calibre: null });
  // (apresEdition réécrit le calibre qui passe, si celui du fichier touche la courbe : la règle du lecteur, v74)
  apresEdition(); const d = disjonctionDe(nom); dire(nom + ' : automatique' + (d.calibre ? ', ' + amperes(d.calibre) : '') + '.'); }
/* CHANGER LES FILS que le meilleur calibre demande : chacun passe au câble proposé (la jauge qui le suit), le fichier gardé
   dans `avant` ; une seule entrée d'historique pour le lot. */
function filsDuMeilleur(d) { const fs = d.contexte.fils, memes = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  return (d.meilleur.filsAChanger || []).map(x => ({ x, f: fs.find(f => f.l && (f.cable || '') === x.cable && f.type === x.actuel && memes([f.l.de, f.l.vers].filter(r => r && !estMasse(r) && !estDisjoncteur(r)), x.bouts)) })); }
function changerFilsDuMeilleur(nom) { const d = disjonctionDe(nom), xs = filsAGrossir(d).filter(p => p.f && p.x.propose); if (!xs.length) return false;
  histPush(xs.length > 1 ? xs.length + ' câbles de ' + nom + ' grossis' : 'un câble de ' + nom + ' grossi');
  xs.forEach(p => poserChamp(p.f.l, 'type', p.x.propose)); apresEdition(); pulserGrossis(xs);
  dire(xs.map(p => (p.x.cable || 'un câble') + ' en ' + p.x.propose).join(', ') + '. Ctrl+Z les rend.'); return true; }
// les câbles grossis s'éclairent deux fois sur le plan (08-interface, `pulser`) : l'œil voit ce que le geste a changé
const pulserGrossis = xs => { if (xs.length && typeof pulser === 'function') pulser({ type: 'liaisons', ls: xs.map(p => p.f.l) }); };
/* DÉCIDER (la carte de décision : « Passer en 15 A et grossir les 3 câbles ») : le retest est corrigé par le choix de
   l'outil — le part number du calibre retenu sur chaque liaison du disjoncteur (sans famille qui le construise, le calibre
   s'écrit au profil), les câbles que ce calibre demande à leur type proposé —, le fichier gardé dans `avant` (« Par
   rapport au retest » les liste). UNE entrée d'historique pour le tout. Le calibre reste l'automatique. */
function deciderCalibre(nom) { const d = disjonctionDe(nom), cal = d.calibre; if (!(cal > 0)) return false;
  const pn = pnDuRepere(nom), F = d.famille, nouveau = F && pn ? pnAvecCalibre(pn, F, cal) : null, xs = cal === (d.meilleur || {}).calibre ? filsDuMeilleur(d).filter(p => p.f && p.x.propose) : [];
  histPush(nom + ' : ' + amperes(cal) + (xs.length ? ' et ' + pluriel2(xs.length, 'câble') + ' grossi' + (xs.length > 1 ? 's' : '') : ''));
  if (nouveau && nouveau !== pn) verite().forEach(l => [['de', 'pnDe'], ['vers', 'pnVers']].forEach(([b, ch]) => { if (l[b] === nom && l[ch]) poserChamp(l, ch, nouveau); }));
  else if (!nouveau) poserCharge(nom, { ...(chargeEcrite(nom) || {}), calibre: cal });
  xs.forEach(p => poserChamp(p.f.l, 'type', p.x.propose)); apresEdition(); pulserGrossis(xs);
  dire(nom + ' : ' + amperes(cal) + (nouveau ? ' (' + nouveau + ')' : '') + (xs.length ? ', ' + xs.map(p => (p.x.cable || 'un câble') + ' en ' + p.x.propose).join(', ') : '') + '. Ctrl+Z défait le tout.'); return true; }
/* LA CARTE DE DÉCISION (le parcours v72 : « 102CB1 coche 15 A en vert sous 4 problèmes rouges ; la vraie histoire est la
   première des onze lignes de la barre, repliée ») : en tête de la fiche, quand le calibre que l'outil retient n'est pas
   celui du retest — ce que fait le retest (il déclenche, il touche la courbe ; ou il est plus gros qu'il ne faut), le
   calibre qui passe et ce qu'il demande ; deux gestes : « Passer en 15 A et grossir les 3 câbles » (`deciderCalibre`),
   « Garder le 10 A… » qui dit ce qu'il faudrait pour qu'il passe (un permanent plus bas, des pointes plus courtes) et
   le retient quand même. `autres` : le nombre des autres points de la fiche. */
function carteDecision(nom, d, autres) { if (!d.gPn || d.origine === 'main' || d.sansProfil || d.sansCourbe || !(d.calibre > 0) || !d.pn) return '';
  const g = d.gPn, k = cleDuVerdict(g), passe = k === 'passe', pn = pnDuRepere(nom), m = d.meilleur || {}, cal = d.calibre, xs = cal === m.calibre ? filsDuMeilleur(d).filter(p => p.f && p.x.propose) : [];
  let p = null; try { p = verdictDisjonction(app.norme, d.courbe, d.pn, d.profil, d.contexte).pire; } catch (_) { p = null; }
  // les trois mots : « déclenche » (un problème), « est juste » (sans la marge : à voir), ou il passe et l'outil en retient un autre
  const titre = passe ? `L’installation porte un ${amperes(d.pn)} : ${cal < d.pn ? 'un ' + amperes(cal) + ' suffit' : 'l’outil retient le ' + amperes(cal)}` : `Le ${amperes(d.pn)} de l’installation ${k === 'declenche' ? motDuVerdict('declenche') : 'est ' + motDuVerdict('juste')}`;
  // deux lignes : ce que fait le retest (au démarrage, 9,31 A pendant 2,1 min touchent sa courbe), le plus petit qui passe
  const quoi = !passe && p ? `${majuscule(p.t === Infinity ? 'en permanence' : quandDuPoint(p))}, <b>${esc(amperes(p.i))}${p.t === Infinity ? '' : ' pendant ' + esc(secondes(p.t))}</b> ${k === 'declenche' ? 'font déclencher le' : 'touchent la courbe du'} ${ident(pn || amperes(d.pn))}. ` : '';
  // (les câbles qu'il demande : derrière le lien « Les 3 câbles », sur la ligne des liens)
  const suite = `Le plus petit qui passe : <b>${esc(amperes(cal))}</b>.`;
  // ce qu'il faudrait pour que le retest passe : le permanent sous ce qu'il garantit (avec la marge), des pointes assez courtes
  const M = d.marges || {}, kM = M.k || 1, garder = [];
  if (!passe && g.tenu && !g.permanentMargeOk) { const perm = (d.points || []).find(x => x.t === Infinity); garder.push(`un permanent d’au plus ${amperes(Math.floor(g.tenu / kM * 100) / 100)}${perm ? ' (il est de ' + amperes(perm.i) + ')' : ''} : le ${amperes(d.pn)} n’en garantit que ${amperes(g.tenu)}${M.marge ? ', moins ' + nombre(M.marge) + ' % de marge' : ''}`); }
  if (!passe && p && p.t !== Infinity && g.sommeMarge > (M.fraction || 1) + 1e-9) { const r = (M.fraction || 1) / g.sommeMarge; garder.push(`des pointes plus courtes : ${p.nom} en ${secondes(p.t * r)} au plus (${secondes(p.t)} aujourd’hui)`); }
  const cleG = 'garder|' + nom, ouvert = FI.liste === cleG;
  const panneau = listeChoix(cleG, (passe ? `<p class="fi-note">Le ${esc(amperes(d.pn))} de l’installation passe aussi : le garder ne change pas les câbles.</p>`
      : `<p class="fi-note">Pour que le ${esc(amperes(d.pn))} passe, il faudrait ${garder.length ? garder.map(esc).join(' ; ou ') : 'un profil plus léger'}. Gardé tel quel, il se dira « ${esc(motDuVerdict(k))} ».</p>`)
    + `<div class="fi-puces"><button type="button" class="btn papier" data-dj-geste="retenir" data-cal="${d.pn}">Retenir le ${esc(amperes(d.pn))}${passe ? '' : ' quand même'}</button>${passe ? '' : '<button type="button" class="btn lien" data-dj-geste="voir-profil">Corriger le profil de charge</button>'}</div>`, { titre: 'Garder le calibre de l’installation', cls: 'fi-decision-garder' });
  // les câbles qu'il demande, repliés (le designer v73 : la carte de décision tient en 180 px, le cadran reste en vue dessous)
  const cleC = 'cables|' + nom, montres = !!FI.tous[cleC];
  const lignes = xs.length ? `<ul class="fi-decision-cables" id="dj-decision-cables"${montres ? '' : ' hidden'}>${xs.map(({ x, f }) => `<li${f && f.l ? ` data-i="${cleFil(f.l)}"` : ''} data-bulle="${escA(majuscule(x.raison))}"><b class="id">${esc(x.cable || 'sans n°')}</b><span class="id">${esc(x.actuel)}</span>${ico('fleche')}<b class="id">${esc(x.propose)}</b></li>`).join('')}</ul>` : '';
  return `<section class="fi-decision ${k === 'declenche' ? 'ko' : 'att'}" aria-label="${escA(titre)}"><h3 class="fi-decision-t">${ico('alerte')}<span>${esc(titre)}</span></h3><p class="fi-decision-p">${insecable(quoi + suite)}</p>`
    + `<div class="fi-decision-gestes"><button type="button" class="btn cuivre" id="dj-decider" data-dj-geste="decider" data-bulle="${escA('Écrit dans l’installation : ' + (m.pn && m.calibre === cal ? m.pn : amperes(cal)) + (xs.length ? ', et ' + xs.map(({ x }) => (x.cable || 'un câble') + ' en ' + x.propose).join(', ') : '') + ' — une seule entrée d’historique, Ctrl+Z défait le tout')}">Passer en ${esc(amperes(cal))}${xs.length ? ' et grossir ' + (xs.length > 1 ? 'les ' + xs.length + ' câbles' : 'le câble') : ''}</button>`
    // les gestes seconds, des liens sur une ligne (la carte tient en 180 px) : les câbles qu'il demande, garder le retest, les autres points
    + `</div><div class="fi-decision-liens">${xs.length ? `<button type="button" class="btn lien dense fi-decision-voir" data-dj-cables="${escA(cleC)}" aria-expanded="${montres}" aria-controls="dj-decision-cables" data-bulle="${escA(xs.map(({ x }) => (x.cable || 'sans n°') + ' : ' + x.actuel + ' → ' + x.propose).join('\n'))}">${ico('droite', 'fi-chevron')}Les ${esc(pluriel2(xs.length, 'câble'))}</button>` : ''}<button type="button" class="btn lien dense fi-decision-garder-b" data-changer="${escA(cleG)}" aria-expanded="${ouvert}">Garder le ${esc(amperes(d.pn))}…</button>`
    // (« et 10 autres points » n'y est plus : la barre des problèmes suit, juste dessous)
    + `</div>${lignes}${panneau}</section>`; }

/* ---- la section ----------------------------------------------------------------------- */
// la vue de la courbe sur la fiche : les quatre températures, jamais les calibres voisins, sans bascule (le lecteur :
// « les températures, il nous les faut de base : pas de bouton » ; « les calibres voisins, on s'en fiche ») — celle que
// le dessin fixe (08-courbe-dj, `DJ_VUE`), sinon la nôtre
const VUE_DJ_FICHE = Object.freeze({ comparer: false, temperatures: true });
const vueDeLaCourbe = () => typeof DJ_VUE === 'object' && DJ_VUE ? DJ_VUE : VUE_DJ_FICHE;
/* UNE PROPOSITION PAS ENCORE ÉCRITE (le technicien v73, point 1 : « le cadran affiche 15 A, “le retenu”, et le retest
   corrigé garde MS3320-10 ») : l'outil retient un autre calibre que celui que l’installation porte, et rien n'a été écrit —
   la fiche le dit partout (« 10 A retest → 15 A proposé »), jamais « le retenu » sur une valeur qui ne partira pas. */
const propositionNonEcrite = d => !!(d.gPn && d.origine !== 'main' && !d.sansProfil && !d.sansCourbe && d.calibre > 0 && d.pn && d.pn !== d.calibre);
/* LA SECTION « CALIBRE » (08-sections) : trois groupes, chacun dans un `.fi-dj[data-disj][data-part]` que
   `lierDisjonction` retrouve — le calibre (le cadran, la ligne du verdict, le choix), la courbe, le profil. `probs` : les
   problèmes de la fiche (la pastille compte ceux qu'elle démontre). */
function sectionDisjoncteur(nom, d, o, probs) { d = d || disjonctionDe(nom); o = o || origineDuCalibre(nom, d);
  const part = (cle, titre, html, droite, aideCle) => groupeSection(titre, html, { cls: `fi-dj dj-part dj-${cle}`, attrs: `data-disj="${escA(nom)}" data-part="${cle}"`, droite, aide: aideCle ? [aideCle, contexteAide(aideCle, d)] : null });
  const tete = part('calibre', '', heroCalibre(nom, d, o));
  if (d.sansCourbe) return { cle: 'disjoncteur', vide: 'aucune courbe de disjonction dans la norme : rien ne se choisit', contenu: tete };
  const cal = d.calibre, v = verdictDuRetenu(d);
  const courbe = part('courbe', 'Courbe de déclenchement', `<figure class="dj-graphe ilot-clair">${grapheSvg(d, vueDeLaCourbe(), largeurGrapheEstimee())}<div class="dj-tip" hidden></div></figure>`, confianceDeLaCourbe(d), 'courbe');
  const supprimes = ['dem', 'trans', 'perm'].filter(k => d.profil && d.profil[k] === null), cleP = 'djplus|' + nom;
  const plus = supprimes.length ? `<button type="button" class="fi-lien dj-plus" id="dj-plus" data-changer="${escA(cleP)}" aria-expanded="${FI.liste === cleP}" data-bulle="Un état de plus : un courant, une durée">${ico('plus')}État</button>`
    : `<button type="button" class="fi-lien dj-plus" id="dj-plus" data-bulle="Un état de plus : un courant, une durée">${ico('plus')}État</button>`;
  const ajouts = supprimes.length ? listeChoix(cleP, `<div class="fi-puces">${supprimes.map(k => `<button type="button" class="fi-chip" data-dj-ajout="${k}">${esc(majuscule(NOMS_PHASES[k] || k))}</button>`).join('')}<button type="button" class="fi-chip" data-dj-ajout="plus">Autre état</button></div>`, { titre: 'Ajouter un état' }) : '';
  const profil = part('profil', 'Profil de charge', tableauProfil(d) + ajouts, plus, 'profil');
  // pliée, la ligne dit le calibre en grand, son mot quand il ne passe pas, sa gamme ; et, tant que la proposition de
  // l'outil n'est pas écrite (l'ergonome v73 : « est-il à 10 ou à 15 ? »), le calibre du RETEST en grand et « → 15 A proposé »
  const fam = (d.famille && (d.famille.famille || d.famille.nom)) || '', propose = propositionNonEcrite(d), retest = !propose && o.calRetest && o.calRetest !== cal && !pnDeVolta(nom) ? o.calRetest : null;
  const kR = propose ? cleDuVerdict(d.gPn) : v.cle, mot = k => k && k !== 'passe' ? `<span class="dj-resume-mot ${etatDuVerdict(k)}">${esc(motDuVerdict(k))}</span>` : '';
  const resume = !cal ? '' : propose
    ? `<b class="dj-resume">${nombreCourt(d.pn)}<small>A</small></b>${mot(kR)}<span class="dj-resume-sous">installation ${ico('fleche')} <b>${esc(amperes(cal))}</b> proposé${fam ? ' · ' + esc(fam) : ''}</span>`
    : `<b class="dj-resume">${nombreCourt(cal)}<small>A</small></b>${mot(kR)}<span class="dj-resume-sous">${[fam ? esc(fam) : '', retest ? `installation <s>${esc(amperes(retest))}</s>` : ''].filter(Boolean).join(' · ')}</span>`;
  return { cle: 'disjoncteur', resume, contenu: tete + courbe + profil }; }
// ce que le « ? » de la courbe et du profil lit (08-explications) : la famille de courbes ; le permanent, la pointe, la part consommée
function contexteAide(cle, d) { if (cle === 'courbe') return { famille: d.famille || d.courbe || '' };
  const perm = (d.points || []).find(p => p.t === Infinity), pointe = (d.points || []).find(p => p.t !== Infinity && p.i > 0);
  return { permanent: perm ? perm.i : null, pointe: pointe ? { i: pointe.i, t: pointe.t } : null, somme: d.somme != null ? d.somme : null }; }
/* D'OÙ VIENT LA COURBE (l'ingénieur v73 : « les contacts ont leur repère vérifié / à confirmer, la courbe non ») : le repère
   de confiance des lignes de la table des courbes de sa famille — le statut de la première, que la bulle dit. */
function confianceDeLaCourbe(d) { try { const c = (d.courbes || [])[0], src = app.norme && app.norme.disjoncteurs && app.norme.disjoncteurs.length ? app.norme : normeDesModules(app.norme);
    const fam = c && (c.famille || ''), L = (src.disjoncteurs || []).find(x => cleNorme(x.famille || '') === cleNorme(fam) && (x.statut || x.confiance)); if (!L) return '';
    const x = { confiance: L.confiance || (/^vérifié/i.test(L.statut || '') ? 'vérifié' : /^à confirmer/i.test(L.statut || '') ? 'à confirmer' : ''), statut: L.statut || '', origine: L.source || L.origine || '' };
    return repereConfiance(x, 'Vos tables'); } catch (_) { return ''; } }
/* LE VERDICT du calibre retenu, en trois mots (passe · juste · déclenche) : sa clé, son état (la couleur), son mot, et ce
   que la bulle en dit. Lu dans le jugement du moteur (la gamme jugée, sinon le verdict d'ensemble). */
function verdictDuRetenu(d) { const cal = d.calibre, g = (d.gamme || []).find(x => x.calibre === cal);
  if (d.sansProfil) return { cle: '', etat: '', mot: 'Profil à écrire', raison: 'Sans profil de charge, rien ne se juge.' };
  if (!(cal > 0)) return { cle: 'declenche', etat: 'ko', mot: 'Aucun ne passe', raison: 'Aucun calibre de la gamme ne tient ce profil.' };
  const k = cleDuVerdict(g || { valide: d.valide, avecMarge: d.avecMarge }), M = motsVerdict()[k] || {};
  return { cle: k, etat: M.etat || '', mot: majuscule(M.mot || ''), raison: M.bulle || '' }; }
const nombreCourt = x => esc(nombre(Math.round(x * 100) / 100));
// la charge du profil : le permanent (l'état sans fin) et la plus forte pointe (son point : son nom, sa durée)
function chargeDuProfil(d) { const pts = d.points || [], perm = (pts.find(p => p.t === Infinity) || {}).i, pointes = pts.filter(p => p.t !== Infinity && p.i > 0).sort((a, b) => b.i - a.i);
  return { perm: perm > 0 ? perm : null, pointe: pointes.length ? pointes[0].i : null, pointeP: pointes[0] || null }; }
// « au démarrage » (le technicien v73 : « en pointe » et « démarrage et transition », deux mots pour la même chose) ; un état ajouté, par son nom
const quandDuPoint = p => !p ? '' : p.k === 'dem' || p.k === 'trans' ? 'au démarrage' : 'en ' + String(p.nom || 'pointe').replace(/ et .*$/, '');

/* ---- CE QU'UN CALIBRE FERAIT (le cadran, « À la main », la bulle de chaque cran, la ligne du verdict) ---------------- */
/* LA GAMME ENTIÈRE de la famille (l'ingénieur v73 : « le catalogue MS3320 a 13 calibres, le cadran n'en montre que 7 —
   rien sur la fiche ne le dit ») : la même, jugée sans la liste préférée des hypothèses ; gardée le temps d'un contrat. */
const GAMMES_COMPLETES = { cle: null, m: new Map() };
function gammeComplete(d, nom) { const cle = typeof CONTROLE !== 'undefined' ? CONTROLE.cle : null; if (GAMMES_COMPLETES.cle !== cle) { GAMMES_COMPLETES.cle = cle; GAMMES_COMPLETES.m.clear(); }
  const k = nom + '|' + d.calibre; if (GAMMES_COMPLETES.m.has(k)) return GAMMES_COMPLETES.m.get(k);
  let g = d.gamme || []; try { g = verdictDisjonction(app.norme, d.courbe, d.calibre, d.profil, { ...d.contexte, hyp: { ...(d.contexte.hyp || {}), calibresPreferes: [] } }).gamme; } catch (_) { }
  GAMMES_COMPLETES.m.set(k, g); return g; }
// le temps où un calibre coupe un courant, à la courbe qui juge (la plus rapide) ; un état en service préchauffe le bilame
function tempsDeCoupure(d, cal, i, p) { const c = (d.courbes || [])[0]; if (!c || !(cal > 0) || !(i > 0)) return Infinity; const t = tempsDeDeclenchement(c, i / cal);
  if (t === Infinity || !p || !enService(p)) return t; const H = { ...HYPOTHESES, ...((d.contexte && d.contexte.hyp) || {}) }; return t / facteurPrechauffage(H, phasesDuProfil(d.profil), cal); }
/* POURQUOI, en une ligne chiffrée (le brief v73 : « 5 A — déclencherait au démarrage : 9,31 A pendant 2,1 min ») :
   DÉCLENCHE — le permanent qu'il ne garantit pas, sinon la pointe et le temps où il coupe ; JUSTE — ce que la marge ferait
   (le permanent sans sa marge, la pointe majorée qui le ferait couper, la part du temps de déclenchement consommée) ; PASSE
   — avec la marge, et ce qu'il demande encore (des câbles plus gros, la sélectivité). `g` : sa case de la gamme. La ligne
   détaillée du verdict, sous le cadran ; la bulle d'un cran prend la phrase du domaine C (09, `pourquoiDuCalibre`). */
function raisonDuCalibre(d, g) { const k = cleDuVerdict(g), c = g.calibre, ch = chargeDuProfil(d), p = ch.pointeP, M = d.marges || {}, kM = M.k || 1;
  if (k === 'declenche') { if (g.permanentOk === false && ch.perm) return `il ne garantit que ${amperes(g.tenu)} en permanence, il en faut ${amperes(ch.perm)}`;
    if (p) { const t = tempsDeCoupure(d, c, p.i, p); return `${amperes(p.i)} ${quandDuPoint(p)} pendant ${secondes(p.t)} : il coupe ${t === Infinity ? 'quand le bilan s’accumule' : 'en ' + secondes(t)}`; }
    return 'il déclenche'; }
  if (k === 'juste') { if (g.permanentMargeOk === false && ch.perm) return `le permanent passe sans ${nombre(M.marge || 0)} % de marge : il garantit ${amperes(g.tenu)} pour ${amperes(ch.perm)}`;
    if (p && g.sommeMarge != null && g.sommeMarge >= 1) { const t = tempsDeCoupure(d, c, p.i * kM, p); return `il touche la courbe : avec ${nombre(M.marge || 0)} % de marge, ${amperes(Math.round(p.i * kM * 100) / 100)} le feraient couper en ${secondes(t)} (${quandDuPoint(p)}, ${secondes(p.t)})`; }
    if (p && g.somme != null) return `il touche la courbe : ${quandDuPoint(p)}, ${amperes(p.i)} consomment ${motFraction(g.somme)} de son temps de déclenchement (${Math.round((M.fraction || 1) * 100)} % au plus)`;
    return 'il passe sans la marge : il touche la courbe'; }
  if (k === 'passe') { const r = [`avec ${nombre(M.marge || 0)} % de marge`]; if (g.fils === false) r.push('des câbles à grossir'); if (g.selectif === false) r.push('pas à 2:1 avec le voisin'); return r.join(' · '); }
  return 'rien ne se juge sans profil de charge'; }
/* LES CALIBRES DU CADRAN (et de « À la main ») : chaque calibre de la gamme — `tout` : de toute la famille —, jugé, avec
   ce qui le distingue (l'automatique, le retenu, celui du retest, hors des calibres préférés) et sa bulle. */
function calibresDuCadran(d, tout, nom) { const best = d.passe, cal = d.calibre, oR = nom ? origineDuCalibre(nom, d) : null, pn = nom && pnDeVolta(nom) ? null : oR && oR.calRetest ? oR.calRetest : d.pn, prefs = new Set((d.catalogue || []).map(Number)), propose = propositionNonEcrite(d);
  const base = tout ? [...gammeComplete(d, nom || '')] : [...(d.gamme || [])]; if (cal > 0 && !base.some(g => g.calibre === cal)) { const g = (d.gamme || []).find(x => x.calibre === cal); if (g) base.push(g); }
  return base.sort((a, b) => a.calibre - b.calibre).map(g => { const cle = cleDuVerdict(g), M = motsVerdict()[cle] || {}, retenu = g.calibre === cal, auto = !!best && g.calibre === best, retest = !!pn && g.calibre === pn, hors = !prefs.has(g.calibre);
    const raison = raisonDuCalibre(d, g), A = amperes(g.calibre);
    // le pourquoi chiffré d'un cran : la phrase du moteur (le domaine C, `pourquoiDuCalibre` — la même que le récapitulatif et le
    // contrôle), sinon la nôtre
    let pq = null; if (typeof pourquoiDuCalibre === 'function') { try { pq = pourquoiDuCalibre(app.norme, d, g.calibre); } catch (_) { pq = null; } }
    const role = [auto ? (propose ? 'l’automatique, proposé — « Passer en ' + A + ' » l’écrit dans l’installation' : 'l’automatique, le plus petit qui passe') : '', retest && !retenu ? 'le calibre de l’installation' : '', hors ? 'hors de vos calibres préférés (Hypothèses)' : ''].filter(Boolean).join(' · ');
    const geste = retenu && !propose ? 'Retenu.' : retenu ? '' : 'Un clic le retient' + (cle && cle !== 'passe' ? ', même s’il ne passe pas' : '') + ' — Ctrl+Z le rend.';
    return { calibre: g.calibre, g, cle, mot: M.mot || '', etat: M.etat || '', raison, retenu, auto, retest, hors, propose: retenu && propose,
      bulle: `${pq && pq.phrase ? pq.phrase : A + ' — ' + (M.mot || 'pas jugé') + ' : ' + raison}${role ? '\n' + majuscule(role) : ''}${geste ? '\n' + geste : ''}` }; }); }
/* LE CHOIX DU CALIBRE, pour qui le montre ailleurs (le récapitulatif, 08-recap : la liste au double-clic — un seul
   composant, deux écrans) : la gamme jugée, dans l'ordre, chaque calibre { calibre, cle, mot, etat, raison, bulle, auto,
   retenu, retest, hors } ; `retenirCalibre(nom, cal)` le retient, `rendreCalibre(nom)` rend l'automatique. */
function choixDuCalibre(nom, tout) { const d = disjonctionDe(nom); return d.sansCourbe ? [] : calibresDuCadran(d, !!tout, nom).map(({ g, ...x }) => x); }

/* ---- LE CADRAN (v73, le moment signature n° 2 : « le cadran qu'on tourne ») -------------------------------------------
   Un instrument de bord : la gamme sur un arc de 240°, UN CRAN PAR CALIBRE à pas égaux (1 · 3 · 5 · 7,5 · 10 · 15 · 20 :
   assez loin l'un de l'autre pour qu'on clique chacun), la part qui passe en vert, le juste d'un trait ambre, et, dedans,
   la charge (le permanent plein, la pointe en voile) à sa place entre les crans. CHAQUE CRAN EST UN BOUTON de 30 px posé
   sur son chiffre (`.dj-cran[data-cal]`) : sa bulle dit son verdict et son pourquoi chiffré, un clic le retient, même s'il
   ne passe pas ; au clavier ← → parcourent les crans (l'index y va, en aperçu), Entrée retient, Échap revient. Le chiffre
   du centre est le retenu ; tant que la proposition de l'outil n'est pas écrite, son index est en pointillé et le centre
   dit « proposé » ; le cran du retest porte un anneau pointillé. Tout est à l'échelle de la gamme, pas des ampères : la
   charge se pose entre les deux crans qui l'encadrent. */
const CADRAN = { W: 184, H: 166, cx: 92, cy: 94, R: 60, R2: 48, Rn: 82, A0: 150, BAL: 240, AMORCE: 16 };
const radians = a => a * Math.PI / 180;
function geometrieCadran(cals) { const C = CADRAN, n = cals.length, pas = n > 1 ? C.BAL / (n - 1) : 0;
  const angCran = k => n > 1 ? C.A0 + pas * k : C.A0 + C.BAL / 2;
  // une valeur entre deux crans : à sa proportion ; sous le premier, sur l'amorce (0 A au début de la piste) ; au-delà du dernier, au bout
  const angDe = v => { if (!n) return C.A0; if (!(v > 0)) return C.A0 - C.AMORCE; if (v <= cals[0]) return C.A0 - C.AMORCE + (angCran(0) - C.A0 + C.AMORCE) * v / cals[0];
    if (v >= cals[n - 1]) return angCran(n - 1); const k = cals.findIndex(c => c >= v), a = cals[k - 1], b = cals[k]; return angCran(k - 1) + (angCran(k) - angCran(k - 1)) * (v - a) / (b - a); };
  const pt = (a, r) => [C.cx + r * Math.cos(radians(a)), C.cy + r * Math.sin(radians(a))];
  const arc = (a, b, r) => { if (b <= a + 0.01) return ''; const [x1, y1] = pt(a, r), [x2, y2] = pt(b, r); return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`; };
  return { n, angCran, angDe, pt, arc, debut: C.A0 - C.AMORCE, fin: n > 1 ? angCran(n - 1) : C.A0 + C.BAL }; }
// le dessin (le SVG, sans un mot) ; `items` : les calibres du cadran (`calibresDuCadran`)
function cadranCalibre(d, items, propose) { const cats = items.map(x => x.calibre), G = geometrieCadran(cats), C = CADRAN, ch = chargeDuProfil(d); if (!G.n) return '';
  const k0 = items.findIndex(x => x.cle === 'passe'), kr = items.findIndex(x => x.retenu), arcs = [];
  arcs.push(`<path class="dj-arc-piste" d="${G.arc(G.debut, G.fin, C.R)}"/>`);
  if (k0 >= 0) arcs.push(`<path class="dj-arc-passe" d="${G.arc(G.angCran(k0), G.fin, C.R)}"/>`);
  items.forEach((x, k) => { if (x.cle === 'juste') { const a = G.angCran(k); arcs.push(`<path class="dj-arc-serre" d="${G.arc(Math.max(G.debut, a - 6), Math.min(G.fin, a + 6), C.R)}"/>`); } });
  arcs.push(`<path class="dj-arc-fond" d="${G.arc(G.debut, G.fin, C.R2)}"/>`);
  if (ch.pointe) arcs.push(`<path class="dj-arc-pointe" d="${G.arc(G.debut, G.angDe(ch.pointe), C.R2)}"/>`);
  if (ch.perm) arcs.push(`<path class="dj-arc-perm" d="${G.arc(G.debut, G.angDe(ch.perm), C.R2)}"/>`);
  const crans = items.map((x, k) => { const a = G.angCran(k), [x1, y1] = G.pt(a, C.R + 5), [x2, y2] = G.pt(a, C.R - 5); return `<line class="dj-arc-cran ${x.cle || 'inconnu'}${x.retenu ? ' retenu' : ''}" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`; }).join('');
  const [ix, iy] = kr >= 0 ? G.pt(G.angCran(kr), C.R) : [0, 0];
  return `<svg class="dj-arc" viewBox="0 0 ${C.W} ${C.H}" width="${C.W}" height="${C.H}" aria-hidden="true">${arcs.join('')}${crans}`
    + (kr >= 0 ? `<circle class="dj-arc-index${propose ? ' propose' : ''}" cx="${ix.toFixed(2)}" cy="${iy.toFixed(2)}" r="6.5"/>` : '') + '</svg>'; }
// les crans, des boutons posés sur leurs chiffres (un seul arrêt de Tab : le retenu ; ← → parcourent les autres)
function boutonsDuCadran(items) { const G = geometrieCadran(items.map(x => x.calibre)), C = CADRAN, focal = Math.max(0, items.findIndex(x => x.retenu));
  return `<div class="dj-crans" role="group" aria-label="Les calibres de la gamme — ← → les parcourent, Entrée retient, Échap revient">` + items.map((x, k) => { const [px, py] = G.pt(G.angCran(k), C.Rn);
    return `<button type="button" class="dj-cran ${x.cle || 'inconnu'}${x.retenu ? ' retenu' : ''}${x.auto ? ' auto' : ''}${x.retest ? ' retest' : ''}" data-cal="${x.calibre}" data-k="${k}" style="left:${px.toFixed(1)}px;top:${py.toFixed(1)}px" tabindex="${k === focal ? 0 : -1}" aria-pressed="${x.retenu}"`
      + ` aria-label="${escA(amperes(x.calibre) + (x.mot ? ', ' + x.mot : '') + (x.retenu ? (x.propose ? ', proposé' : ', retenu') : '') + (x.retest ? ', celui de l’installation' : ''))}" data-bulle="${escA(x.bulle)}"><span class="dj-arc-n">${nombreCourt(x.calibre)}</span></button>`; }).join('') + '</div>'; }
// les marques des trois mots : ✓ passe, ~ juste, ✕ déclenche (des icônes : les polices embarquées n'ont pas ces glyphes)
const MARQUES_VERDICT = { passe: 'coche', juste: 'vague', declenche: 'fermer' };
const marqueVerdict = k => MARQUES_VERDICT[k] ? ico(MARQUES_VERDICT[k], 'dj-marque') : '';
/* LA LIGNE DU VERDICT, sous le cadran (le designer v73 : « le verdict s'écrit en une ligne, dans sa couleur ») : le calibre
   et son mot, en gras et dans sa couleur, puis le pourquoi chiffré ; d'où vient le retenu (proposé, à la main) ; sans
   profil, le geste qui l'écrit. `apercu` : un calibre que le clavier montre sans le retenir encore. */
function ligneDuVerdict(d, x, o) { o = o || {};
  if (d.sansProfil) return `<div class="dj-verdict-l neutre" aria-live="polite"><span>Sans profil de charge, rien ne se juge : Volta trouve le calibre dès qu’il est écrit.</span><button type="button" class="btn cuivre dense" data-dj-geste="voir-profil">Écrire le profil</button></div>`;
  if (!x) return `<div class="dj-verdict-l ko" aria-live="polite"><span><b>Aucun calibre</b> de la gamme ne passe ce profil.</span></div>`;
  const best = d.passe, A = amperes(x.calibre), fam = (d.famille && (d.famille.famille || d.famille.nom)) || '';
  let quoi = x.raison;
  if (x.cle === 'passe' && x.auto) { const prev = calibresDuCadran(d, false, o.nom).filter(y => y.calibre < x.calibre).pop(), pr = x.propose && d.pn ? calibresDuCadran(d, false, o.nom).find(y => y.calibre === d.pn) : null;
    quoi = `le plus petit ${fam ? 'de la gamme ' + fam + ' ' : ''}qui passe${pr ? ` ; le ${amperes(pr.calibre)} de l’installation est ${pr.mot}` : prev ? ` ; le ${amperes(prev.calibre)} est ${prev.mot}` : ''}.`; }
  else quoi = quoi + '.';
  const suite = o.apercu ? 'Aperçu — Entrée le retient, Échap revient.' : x.propose ? 'Proposé : pas encore écrit dans l’installation.' : d.origine === 'main' && x.retenu ? `Retenu à la main${best && best !== x.calibre ? ' ; l’automatique est le ' + amperes(best) : ''}.` : '';
  return `<div class="dj-verdict-l ${x.etat || 'neutre'}${o.apercu ? ' apercu' : ''}" aria-live="polite"><span class="dj-v-mot">${marqueVerdict(x.cle)}<b>${esc(A)} ${esc(x.mot)}</b></span><span class="dj-v-pourquoi">${insecable(esc(quoi))}${suite ? ` <i>${esc(suite)}</i>` : ''}</span></div>`; }

/* LE CALIBRE (le lecteur, v62 : « commence directement par l'automatique ; le A à la même taille » ; v72 : « le calibre
   du 15 A, la manière dont tu l'as créé, c'est horrible » ; v73 : « il ne peut choisir que les calibres au-dessus — il
   doit TOUT pouvoir sélectionner ») : le cadran et ses crans, le chiffre au centre ; à côté, la charge en chiffres et la
   gamme, son « ? » ; dessous, la clé du cadran, la ligne du verdict, puis le choix — « ★ Automatique » (pressé quand
   c'est lui) | « À la main ▾ », qui ouvre TOUTE LA GAMME : chaque calibre avec son mot (✓ passe, ~ juste, ✕ déclenche,
   au trait rouge), tous cliquables, et « Tout le catalogue MS3320 (13) » pour ceux que les calibres préférés écartent.
   Puis les câbles que le calibre RETENU demande de grossir. */
function heroCalibre(nom, d, o) { const m = d.meilleur || {}, cal = d.calibre, best = d.passe, auto = !!best && best === cal && d.origine !== 'main', v = verdictDuRetenu(d), propose = propositionNonEcrite(d);
  const items = d.sansProfil ? (d.gamme || []).map(g => ({ calibre: g.calibre, g, cle: '', mot: '', etat: '', raison: '', retenu: g.calibre === cal, auto: false, retest: g.calibre === d.pn, hors: false, bulle: amperes(g.calibre) + ' — pas jugé : le profil de charge manque' })) : calibresDuCadran(d, false, nom);
  const x = items.find(y => y.retenu) || null, cleL = 'dj|' + nom, ouverte = FI.liste === cleL;
  // le centre : le chiffre (son unité à sa taille) — et ce qu'il est quand ce n'est pas l'automatique écrit : proposé, à la main
  const etatC = propose ? 'proposé' : d.origine === 'main' && cal ? 'à la main' : '';
  const ch = chargeDuProfil(d), stat = (val, cls, mot) => val ? `<span class="dj-stat ${cls}"><b>${nombreCourt(val)}<small>A</small></b><span><i aria-hidden="true"></i>${esc(mot)}</span></span>` : '';
  const famille = (d.famille && (d.famille.famille || d.famille.nom)) || d.courbe || '';
  const heros = `<div class="dj-heros ${v.etat || 'neutre'}${propose ? ' propose' : ''}"><div class="dj-cadran">${cadranCalibre(d, items, propose)}${boutonsDuCadran(items)}`
    + `<div class="dj-h-centre"><b class="dj-h-cal"><span class="dj-h-n">${cal ? nombreCourt(cal) : '—'}</span>${cal ? '<span class="dj-h-u">A</span>' : ''}</b>${etatC ? `<small class="dj-h-etat">${esc(etatC)}</small>` : ''}</div></div>`
    + `<div class="dj-h-cote">${ch.perm || ch.pointe ? `<div class="dj-stats">${stat(ch.perm, 'perm', 'permanent')}${stat(ch.pointe, 'pointe', (quandDuPoint(ch.pointeP) || 'en pointe').replace(/^(au|en) /, ''))}</div>` : ''}`
    + `<div class="dj-h-pied">${famille ? `<span>Gamme ${esc(famille)}</span>` : ''}${aide('calibre', { verdict: d, calibre: cal || null, origine: o.origine === 'main' ? 'main' : d.origine, meilleur: best || null })}</div></div></div>`;
  // la clé du cadran, en mots — les trois mots, la charge, le retest quand il en porte un autre
  const cles = d.sansProfil ? '' : `<p class="dj-cle">${['passe', 'juste', 'declenche'].filter(k => items.some(y => y.cle === k)).map(k => `<span class="${k}"><i aria-hidden="true"></i>${esc(motDuVerdict(k))}</span>`).join('')}${ch.perm || ch.pointe ? '<span class="charge"><i aria-hidden="true"></i>la charge</span>' : ''}${items.some(y => y.retest && !y.retenu) ? '<span class="retest"><i aria-hidden="true"></i>l’installation</span>' : ''}</p>`;
  // le choix : « ★ Automatique » | « À la main ▾ » (toute la gamme, dès qu'elle a plus d'un calibre)
  const mainB = (d.gamme || []).length > 1 ? `<button type="button" class="dj-seg dj-main" data-changer="${escA(cleL)}" aria-expanded="${ouverte}" data-bulle="Toute la gamme : un clic retient un calibre, même s’il ne passe pas">${auto || !cal || propose ? 'À la main' : esc(amperes(cal)) + ' à la main'}${ico('bas', 'fi-chevron')}</button>` : '';
  const actions = d.sansProfil ? '' : best || mainB ? `<span class="dj-choix" role="group" aria-label="Le choix du calibre">${best ? `<button type="button" class="dj-seg${auto ? ' dj-auto-pris' : ''}" id="dj-retenir" data-dj-geste="retenir" data-cal="${best}" aria-pressed="${auto}" data-bulle="${escA(phraseMeilleur(d) + (auto ? (propose ? ' Il est proposé : « Passer en ' + amperes(best) + ' » l’écrit dans l’installation.' : ' Il est retenu.') : ' Un clic rend ce choix à l’outil — Ctrl+Z le défait.') + (m.pn ? ' Part number ' + m.pn + ' : une désignation construite, à vérifier au catalogue.' : ''))}">${auto ? ico('etoile', 'dj-auto-etoile') : ''}Automatique${auto ? '' : ` (${esc(amperes(best))})`}</button>` : ''}${mainB}</span>` : '';
  const liste = mainB ? listeChoix(cleL, panneauGamme(nom, d), { titre: 'Toute la gamme : un clic retient un calibre', cls: 'dj-gamme-choix' }) : '';
  return heros + cles + ligneDuVerdict(d, x, { nom }) + (actions ? `<div class="dj-h-actions">${actions}</div>` : '') + liste + ligneCablesAGrossir(nom, d); }
/* « À LA MAIN » : TOUTE LA GAMME, en grille (l'ingénieur v73, point 1 ; le patron de tous les choix, point 7) — chaque
   calibre, son mot et sa marque (✓ passe, ~ juste en ambre, ✕ déclenche au trait rouge), le retenu pressé, l'automatique
   étoilé, celui du retest dit ; TOUS cliquables (le pourquoi dans la bulle). Dessous, « Tout le catalogue MS3320 (13) » :
   les calibres que la liste préférée des hypothèses écarte, en pointillé, et la phrase qui le dit. */
function panneauGamme(nom, d) { const tout = !!FI.catalogue[nom], items = calibresDuCadran(d, tout, nom), F = d.famille, fam = (F && (F.famille || F.nom)) || '';
  const chips = items.map(x => `<button type="button" class="dj-chip ${x.cle || 'inconnu'}${x.auto ? ' ideal' : ''}${x.hors ? ' hors' : ''}${x.retest ? ' retest' : ''}" data-cal="${x.calibre}" aria-pressed="${x.retenu}" data-bulle="${escA(x.bulle)}"`
    + ` aria-label="${escA(amperes(x.calibre) + (x.mot ? ', ' + x.mot : '') + (x.retenu ? ', retenu' : '') + (x.retest ? ', celui de l’installation' : '') + (x.hors ? ', hors des calibres préférés' : ''))}">`
    + `<span class="dj-chip-l"><b>${x.auto ? `<i class="dj-etoile" aria-hidden="true">${ico('etoile')}</i>` : ''}${nombreCourt(x.calibre)}<small>A</small></b>${x.retest ? '<em>installation</em>' : ''}</span><span class="dj-chip-v">${marqueVerdict(x.cle)}${esc(x.mot || '—')}</span></button>`).join('');
  const nPref = (d.catalogue || []).length, complet = F ? gammeComplete(d, nom).length : nPref, hors = items.filter(x => x.hors).length;
  const prefs = (d.catalogue || []).map(c => nombre(c)).join(' · ');
  const pied = complet > nPref ? `<p class="dj-gamme-pied">${tout ? `<button type="button" class="btn lien dense" data-dj-catalogue="0">Seulement vos calibres préférés (${nPref})</button><span>${esc(pluriel2(hors, 'calibre'))} hors de vos calibres préférés, en pointillé — les Hypothèses les règlent</span>`
    : `<button type="button" class="btn lien dense" data-dj-catalogue="1" data-bulle="${escA('Les calibres de la famille ' + fam + ' que vos calibres préférés (Hypothèses) écartent')}">Tout le catalogue ${esc(fam)} (${complet})</button><span>vos calibres préférés : ${esc(prefs)} A</span>`}</p>` : '';
  return `<div class="dj-chips" role="group" aria-label="${escA('Toute la gamme ' + fam)}">${chips}</div>${pied}`; }
/* LES CÂBLES QUE LE CALIBRE RETENU DEMANDE (le technicien v73 : « “3 câbles à grossir avec le 15 A” reste écrit alors que
   j'ai pris 20 A ») : pour l'automatique, ceux du meilleur (09 bis) ; pour un calibre retenu à la main, ses propres câbles
   qui ne le suivent pas, et la gauge de leur famille qui le suivrait (`jaugeQuiSuit`) et le contact qui change. Rend
   [{ x: { cable, actuel, propose, raison, aucune, bouts }, f, ct }]. */
function filsAGrossir(d) { const m = d.meilleur || {}; if (d.sansProfil || !(d.calibre > 0)) return [];
  if (d.calibre === m.calibre) return filsDuMeilleur(d).map(p => ({ ...p, ct: (m.contactsTouches || []).find(c => c.cable === p.x.cable && JSON.stringify(c.bouts) === JSON.stringify(p.x.bouts)) || null }));
  const H = { ...HYPOTHESES, ...((d.contexte && d.contexte.hyp) || {}) }, ctx = contexteDeProtection(app.norme, H, d.courbes, pointsDuProfil(d.profil)), cal = d.calibre;
  return ((d.contexte && d.contexte.fils) || []).map(f => { let p; try { p = protegerFil(app.norme, cal, f, H, ctx); } catch (_) { return null; } if (!p || p.verdict === 'inconnu' || filSuit(p)) return null;
    const s = jaugeQuiSuit(app.norme, cal, f, H, ctx), bouts = f.l ? [f.l.de, f.l.vers].filter(r => r && !estMasse(r) && !estDisjoncteur(r)) : [];
    const avant = p.contact ? p.contact.taille : '', apres = s && s.p.contact ? s.p.contact.taille : '';
    return { f, x: { cable: f.cable || '', actuel: f.type, propose: s ? s.type : null, raison: raisonsDuFil(p, cal).join(' ; '), aucune: s ? '' : 'aucune gauge de la famille ' + typeDuFil(f.type) + ' ne suit le ' + amperes(cal), bouts },
      ct: s && apres && apres !== avant ? { actuel: avant, propose: apres, raison: `le ${s.type} se sertit sur un contact taille ${apres}${avant ? ', le ' + f.type + ' était sur un ' + avant : ''} : la cavité change` } : null }; }).filter(Boolean); }
/* LES CÂBLES À GROSSIR (le lecteur : « trois câbles à grossir : sur ordi on ne voit pas, les écritures se chevauchent » ;
   « des fois il y a marqué câble et pas le numéro : il manque une information ») : en tête combien, AVEC LE CALIBRE
   RETENU, et « Changer les câbles » ; puis une ligne par câble — son numéro (« sans n° » en ambre), son type et celui qu'il
   lui faut ; dessous, en petit, le contact qui change avec lui. Un clic sur une ligne ouvre le câble. */
function ligneCablesAGrossir(nom, d) { const aChanger = filsAGrossir(d), proposes = aChanger.filter(p => p.x.propose); if (!aChanger.length) return '';
  const lignes = aChanger.map(({ x, f, ct }) => { const k = f && f.l ? cleFil(f.l) : '';
    return `<li class="dj-g-ligne"${k ? ` data-i="${k}" tabindex="0" role="button"` : ''} data-bulle="${escA(majuscule(x.propose ? x.raison : x.aucune || x.raison) + (ct ? '\n' + majuscule(ct.raison) : ''))}">`
      + (x.cable ? `<span class="dj-g-num">${esc(x.cable)}</span>` : `<span class="dj-g-num manque" data-bulle="Ce câble n’a pas de numéro dans le retest : il manque une information">sans n°</span>`)
      + `<span class="dj-g-de-a"><span class="id">${esc(x.actuel)}</span>${ico('fleche')}<b class="id${x.propose ? '' : ' manque'}">${esc(x.propose || 'aucun')}</b></span>`
      + (ct ? `<span class="dj-g-ct">contact ${esc(ct.actuel)} ${ico('fleche')} ${esc(ct.propose)}</span>` : '') + '</li>'; }).join('');
  return `<div class="dj-grossir"><div class="dj-g-tete">${ico('alerte', 'dj-g-ico')}<span class="dj-g-titre"><b>${pluriel2(aChanger.length, 'câble')} à grossir</b> <span>avec le ${esc(amperes(d.calibre))}</span></span>`
    + (proposes.length ? `<button type="button" class="btn papier" id="dj-fils-changer" data-dj-geste="fils" data-bulle="Chaque câble passe au type proposé — une seule entrée d’historique, Ctrl+Z les rend">Changer les câbles</button>` : '') + `</div><ul class="dj-g-liste">${lignes}</ul></div>`; }
/* Le pourquoi du meilleur, en une phrase d'homme : la bulle du bouton « Automatique ». */
function phraseMeilleur(d) { const m = d.meilleur, cal = m.calibre, fam = m.famille ? m.famille : 'calibre de la gamme', T = nombre(m.marge.temperature);
  const perm = m.marge.permanent, courts = d.points.some(p => p.t !== Infinity && p.i > 0);
  const tes = [perm > 0 ? (perm < 2 ? `votre ${amperes(perm)} permanent` : `vos ${amperes(perm)} permanents`) : '', courts ? 'vos pointes' : ''].filter(Boolean).join(' et ');
  const marge = m.marge.courant ? `avec ${nombre(m.marge.courant)} % de marge` : 'sans marge';
  let s = m.serre ? `aucun ${fam} ne tient ${tes} ${marge} à ${T} °C : le ${amperes(cal)} les tient, mais sans la marge` : `le plus petit ${fam} qui tient ${tes} ${marge} à ${T} °C`;
  // pourquoi pas celui d'en dessous, en mots simples
  const cat = d.gamme.filter(g => g.catalogue), prev = cat.filter(g => g.calibre < cal - 1e-9).pop();
  if (prev && !m.serre) { const Ap = 'le ' + amperes(prev.calibre);
    s += ' ; ' + (!prev.valide ? (!prev.permanentOk ? `${Ap} ne garantit que ${amperes(prev.tenu)} en permanence` : `${Ap} déclencherait en pointe`)
      : !prev.marge ? (!prev.permanentMargeOk ? `${Ap} serait trop juste en permanence` : `${Ap} serait trop juste en pointe`)
      : prev.selectif === false ? `${Ap} ne serait pas à 2:1 avec le disjoncteur voisin` : `${Ap} conviendrait aussi`); }
  return majuscule(s) + '.'; }

/* LE PROFIL DE CHARGE : un petit tableau — démarrage, transition, permanent (pour toujours), puis les états ajoutés —, la
   pastille du sort de chaque point sur la courbe, le courant, la durée ; les unités dans l'en-tête des colonnes, pas
   dans les cases ; chaque état se supprime (×), le démarrage, la transition et le permanent compris (le profil garde
   alors `null` à sa place : l'état n'est plus là, pas seulement vide) ; « + État » en ajoute — ou rend l'un des trois. */
function tableauProfil(d) { const P = d.profil, E = etatsDuProfil(P), parI = new Map(d.points.map(p => [p.i, p])), k = x => E.find(e => e.k === x), la = x => !P || P[x] !== null;
  const ordre = [la('dem') ? k('dem') : null, la('trans') ? k('trans') : null, la('perm') ? k('perm') : null, ...E.filter(e => /^plus/.test(e.k))].filter(Boolean);
  const val = (e, q) => e[q] != null && isFinite(e[q]) ? nombre(e[q]) : '';
  const ligne = e => { const plus = /^plus/.test(e.k), p = e.i > 0 ? parI.get(e.i) : null, c = classeVerdict(p);
    return `<div class="dj-etat${e.k === 'perm' ? ' perm' : ''}" data-k="${e.k}" role="row"><i class="dj-verdict${c ? ' ' + c : ''}" data-bulle="${escA(majuscule(motVerdict(p)))}" role="img" aria-label="${escA(motVerdict(p))}"></i>`
      + (plus ? `<input class="dj-nom" data-dj="${e.k}" data-q="nom" value="${escA(e.nom)}" aria-label="Nom de l’état" spellcheck="false" autocomplete="off">` : `<span class="dj-nom">${esc(majuscule(e.nom))}</span>`)
      + `<label class="dj-champ"><input data-dj="${e.k}" data-q="i" value="${escA(val(e, 'i'))}" inputmode="decimal" placeholder="—" autocomplete="off" aria-label="${escA(e.nom + ' : courant en ampères')}"></label>`
      // une durée d'une minute ou plus se lit aussi en minutes, en petit sous elle (l'ingénieur v73 : « 120 s, 2 min »)
      + (e.k === 'perm' ? `<span class="dj-inf" data-bulle="Pour toujours" role="img" aria-label="Pour toujours">${ico('infini')}</span>` : `<label class="dj-champ"${e.t >= 60 && isFinite(e.t) ? ` data-min="${escA(secondes(e.t))}"` : ''}><input data-dj="${e.k}" data-q="t" value="${escA(val(e, 't'))}" inputmode="decimal" placeholder="—" autocomplete="off" aria-label="${escA(e.nom + ' : durée en secondes' + (e.t >= 60 && isFinite(e.t) ? ', soit ' + secondes(e.t) : ''))}"></label>`)
      + `<button type="button" class="dj-x" data-x="${e.k}" tabindex="-1" aria-label="${escA('Supprimer l’état « ' + e.nom + ' »')}" data-bulle="Supprimer cet état">${ico('fermer')}</button></div>`; };
  return `<div class="dj-etats" role="table" aria-label="Profil de charge"><div class="dj-entete" role="row"><span></span><span>État</span><span>Courant <i>A</i></span><span>Durée <i>s</i></span><span></span></div>${ordre.length ? ordre.map(ligne).join('') : '<p class="fi-note dj-aucun">Aucun état : « + État » en ajoute un.</p>'}</div>`; }

/* ---- ses câbles, pour la section commune « Câbles » (08-fiche, `listeCables`) ------------ */
/* La chute en ligne depuis le disjoncteur, chemin par chemin : au courant permanent du profil (sinon le calibre, sinon
   l'hypothèse), à travers les prises de coupure et les barrettes, la part du disjoncteur comprise. */
function chutesDe(nom, d) { const H = app.simu || HYPOTHESES, perm = d.profil && d.profil.perm && nombreLu(d.profil.perm.i) > 0 ? nombreLu(d.profil.perm.i) : null, I = perm || (d.calibre > 0 ? d.calibre : H.courant);
  const courts = (d.points || []).filter(p => p.t !== Infinity && p.i > 0);
  const cs = chutesDepuis(app.norme, verite(), nom, I, H, courts, { famille: d.famille, calibre: d.calibre });
  return { H, I, perm, cs: cs.slice().sort((a, b) => (b.dU || 0) - (a.dU || 0)) }; }
/* Une ligne par câble qu'il nourrit : l'intensité au pire (le courant d'une phase contre ce que le câble admet pour
   cette durée), la chute en ligne du chemin le plus long qui passe par lui (et le seuil que le moteur rend) — la même que
   sa fiche (08-fiche, `chuteEnLigne`) —, pourquoi il est à voir, en une ligne, et la bulle : ce qui ne va pas, d'où
   viennent les chiffres. La valeur garde la couleur de sa mesure ; l'état de la ligne est le jugement (un câble à 80 %
   « pas protégé en surcharge » est à voir : la ligne le dit). */
function lignesFilsDisjoncteur(nom, d) { d = d || disjonctionDe(nom); const cal = d.calibre, mV = u => nombre(Math.round(u * 1000) / 1000) + ' V';
  return d.fils.map(f => { const j = jugementDuFil(f, cal), c = f.l ? chuteEnLigne(f.l, nom) : null, pointe = pireChuteEnPointe(c), etatU = etatDeChute(c, pointe), motSupp = c && !c.reel ? ', longueurs supposées' : '';
    const etat = j.etat === 'ko' || etatU === 'ko' ? 'ko' : j.etat === 'att' || etatU === 'att' ? 'att' : '';
    const pourquoi = [j.dit, c && c.trop ? `chute en ligne ${volts(c.dU)} > ${volts(c.admis)}${motSupp}` : pointe ? `chute en pointe ${volts(pointe.dU)} > ${volts(pointe.admis)}${motSupp}` : ''].filter(Boolean).join(' · ');
    const bulle = [`${f.cable || 'câble sans numéro'}${f.type ? ' · ' + f.type : ''} · ${f.amont ? '← ' : '→ '}${f.autre}${f.via ? ' (par ' + f.via + ')' : ''}`, j.dit ? majuscule(j.dit) : '', j.contact || '',
      j.charge ? `au pire ${amperes(j.charge.i)} sur ${amperes1(j.charge.admise)} admis ${j.charge.quand}` : '',
      c && c.dU != null ? `chute en ligne vers ${c.bout[0]}${c.bout[1] ? ':' + c.bout[1] : ''} : ${volts(c.dU)}${c.pct != null ? ' (' + nombre(Math.round(c.pct * 10) / 10) + ' %)' : ''}${c.admis != null ? ', ' + volts(c.admis) + ' admis' : ''}${c.reel ? '' : ' — longueurs supposées'}${c.disjoncteur && c.disjoncteur.dU != null ? ', dont ' + mV(c.disjoncteur.dU) + ' dans le disjoncteur' : ''}` : '',
      pointe ? `en pointe : ${volts(pointe.dU)} à ${amperes(pointe.i)} > ${volts(pointe.admis)} admis${pointe.intermittent ? ' en intermittent' : ''}` : ''].filter(Boolean).join('\n');
    const [rep, ...b] = String(f.autre || '').split(':');
    return { l: f.l, k: f.l ? cleFil(f.l) : '', num: f.cable || '—', puce: puceFil(f), jauge: jaugeDuType(f.type), type: f.type, bout: rep ? { rep, borne: b.join(':') } : null,
      charge: j.charge ? { r: j.charge.r, mot: `${nombreA(j.charge.i)} / ${nombreA(j.charge.admise)} A`, i: j.charge.i, admis: j.charge.admise } : { r: null, mot: '—' },
      chute: { mot: c && c.dU != null ? volts(c.dU) : '—', u: c && c.dU != null ? c.dU : null, max: c && c.admis != null ? c.admis : null, regle: c ? c.regle || '' : '', supp: !!(c && !c.reel) }, etat, pourquoi, bulle }; }); }
/* Le jugement d'un câble, en mots : son état (ko : la charge le dépasse ou dépasse son contact ; att : pas protégé, sous le
   calibre, hors de la table 11-3, contact sous le calibre ; ok), la charge au pire (le courant d'une phase contre ce qu'il
   admet pour cette durée) et ce qui ne va pas, en une ligne. */
function jugementDuFil(f, cal) { const r = [];
  if (f.verdict === 'inconnu') return { etat: 'att', charge: null, dit: f.refuse ? 'conducteur ' + f.conducteur + ' : pas de résistance dans la base' : 'câble inconnu de la norme' };
  const ph = (f.phases || []).slice().sort((a, b) => b.i / b.admise - a.i / a.admise)[0];
  const charge = ph ? { i: ph.i, admise: ph.admise, r: ph.i / ph.admise, quand: ph.t === Infinity ? 'en permanence' : 'pendant ' + secondes(ph.t) } : null;
  // le contact que le plan ne nomme pas est SUPPOSÉ (09 bis : le plus petit qui admet la gauge, par prudence) : la ligne le dit, la bulle dit pourquoi
  const supp = f.contact && !f.contact.parLePlan ? ' supposé' : '';
  if (f.verdict === 'fil') r.push(`trop fin pour ${f.pire.nom}`);
  if (f.contactDepasse) r.push(`son contact ${f.contact.taille}${supp} ne porte que ${amperes(f.contact.intensite)}`);
  if (f.verdict === 'calibre') r.push(`admet ${amperes1(f.continu)} en continu, moins que le ${amperes(cal)} : pas protégé en surcharge`);
  else if (f.protege === false && f.pireLaisse && f.verdict !== 'fil') { const x = f.pireLaisse; r.push(`pas protégé : le ${amperes(cal)} laisse passer ${amperes1(x.courant)} ${pourPalier(x.palier)}, ${f.jugeSur === 'dommage' ? 'il s’abîme au-delà de' : 'il n’admet que'} ${amperes1(x.admise)}`); }
  if (f.horsTable) r.push(`la table 11-3 le limite à un ${amperes(f.calibreMax)}`);
  if (f.contactSurcharge && !f.contactDepasse) r.push(`contact ${f.contact.taille}${supp} : ${amperes(f.contact.intensite)}, sous le calibre`);
  const etat = f.verdict === 'fil' || f.contactDepasse ? 'ko' : r.length ? 'att' : 'ok';
  const contact = supp && (f.contactDepasse || f.contactSurcharge) ? `Le plan ne dit pas quel contact est serti au bout de ${f.cable || 'ce câble'} : Volta prend le plus petit qui admet un ${f.jauge != null ? f.jauge : jaugeDuType(f.type)} AWG (taille ${f.contact.taille}, ${amperes(f.contact.intensite)}), par prudence.` : '';
  return { etat, charge, dit: r.join(' · '), contact }; }


/* ---- les gestes --------------------------------------------------------------------- */
// le dernier décalage des courbes dessiné par repère : quand le calibre change, la bande glisse de l'ancien au nouveau
const DJ_ANIM = new Map();
let DJ_OBS = null;   // l'observateur de largeur du graphique ouvert
/* LE CADRAN VIVANT (le moment signature n° 2) : ce que le cadran de chaque repère montrait au dernier rendu — le calibre
   au centre, l'angle de son index, le retenu —, pour que l'index VOYAGE de l'ancien au nouveau quand on en retient un
   autre (un clic, Entrée, « Automatique », Ctrl+Z : le même voyage, à l'envers). */
const CADRAN_VU = new Map();
// la courbe de ce qui va de A à B sous les yeux (--courbe-glisse, cubic-bezier(.65,0,.35,1)), en JS : l'index la suit image par image
function courbeBezier(x1, y1, x2, y2) { const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t, dX = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => { if (x <= 0) return 0; if (x >= 1) return 1; let t = x; for (let i = 0; i < 6; i++) { const e = X(t) - x, d = dX(t); if (Math.abs(e) < 1e-5 || !d) break; t -= e / d; } return Y(Math.max(0, Math.min(1, t))); }; }
const GLISSE = courbeBezier(.65, 0, .35, 1);
/* LE VOYAGE de l'index le long de l'arc (pas en ligne droite) : 120 ms par cran franchi, plus 60, au plus 420 ms ; le
   chiffre du centre ROULE — chaque calibre traversé s'affiche à son tour — ; à l'arrivée, l'index se pose (1,18 → 1, 160
   ms, la courbe d'entrée). `de`, `vers` : des angles ; `chiffres` : les calibres traversés, dans l'ordre ; `fin` : après. */
function voyageDeLIndex(cadran, de, vers, chiffres, fin) { const idx = cadran && cadran.querySelector('.dj-arc-index'), n = cadran && cadran.querySelector('.dj-h-n'); if (!idx) { if (fin) fin(); return; }
  const C = CADRAN, place = a => { idx.setAttribute('cx', (C.cx + C.R * Math.cos(radians(a))).toFixed(2)); idx.setAttribute('cy', (C.cy + C.R * Math.sin(radians(a))).toFixed(2)); };
  const pas = Math.max(1, (chiffres || []).length - 1), duree = mouvementReduit() ? 0 : Math.min(420, 120 * pas + 60), t0 = performance.now(), jeton = (cadran._voyage = (cadran._voyage || 0) + 1);
  // chaque chiffre traversé dit son mot par sa couleur (`chiffres` : des calibres, ou { c, etat }) ; posé, le chiffre reprend celle du héros
  const cal = n && n.closest('.dj-h-cal'), ecrire = x => { if (!n || x == null) return; const c = typeof x === 'object' ? x.c : x; n.textContent = nombre(c); if (cal) { if (typeof x === 'object' && x.etat) cal.dataset.etat = x.etat; else delete cal.dataset.etat; } };
  const poser = () => { if (cal) delete cal.dataset.etat; if (!mouvementReduit()) idx.animate([{ transform: 'scale(1.18)' }, { transform: 'none' }], { duration: 160, easing: 'cubic-bezier(.32,.72,0,1)' }); if (fin) fin(); };
  if (!duree) { place(vers); if (chiffres && chiffres.length) ecrire(chiffres[chiffres.length - 1]); poser(); return; }
  const image = t => { if (cadran._voyage !== jeton || !idx.isConnected) return; const f = Math.min(1, (t - t0) / duree), e = GLISSE(f); place(de + (vers - de) * e);
    if (chiffres && chiffres.length) ecrire(chiffres[Math.min(chiffres.length - 1, Math.round(e * (chiffres.length - 1)))]);
    if (f < 1) requestAnimationFrame(image); else poser(); };
  place(de); requestAnimationFrame(image); }
/* LES TOUCHES DU CADRAN sont à lui : la page pousse aux flèches le bloc choisi sur le plan (08-interface, la retouche : un
   écouteur en capture sur la fenêtre, quel que soit l'endroit où est le clavier) — celui-ci, posé avant lui, garde au cadran
   les flèches, Début, Fin et Échap d'un cran qui a le clavier (`.dj-crans._clavier`, posé par `lierDisjonction`). */
window.addEventListener('keydown', e => { const g = e.target && e.target.closest ? e.target.closest('.dj-crans') : null; if (g && typeof g._clavier === 'function') g._clavier(e); }, true);
// ce qui paraît sous le cadran (la ligne du verdict) s'écrit : un rien de montée, 220 ms
const ecrireLaLigne = el => { if (el && !mouvementReduit()) el.animate([{ opacity: 0.25, transform: 'translateY(3px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.32,.72,0,1)' }); };
/* LE SEUL POINT QUI LIE les gestes du disjoncteur, après le rendu de sa fiche. Ses sections se retrouvent où que la fiche
   les pose (`conteneur`, sinon l'inspecteur, sinon la page) par leur `.fi-dj[data-disj]`. Chaque écriture va au contrat
   (Ctrl+Z la défait) ; la fiche se refait ensuite d'elle-même — sauf si l'on écrit dans un champ du profil : alors
   ce qui change se refait EN PLACE (les champs restent sous les doigts), et de même si la fiche ne s'est pas refaite. */
// un geste qui accepte une proposition de Volta : chaque case qu'il change se marque « proposition de Volta acceptée » (la
// colonne Origine du retest corrigé — le domaine C, 08-export, `avecOrigineVolta`)
const parVolta = faire => typeof avecOrigineVolta === 'function' ? avecOrigineVolta(faire) : faire();
function lierDisjonction(nom, conteneur) {
  const racine = conteneur || (($('ba-equip') && $('ba-equip').querySelector(`.fi-dj[data-disj="${CSS.escape(nom)}"]`)) ? $('ba-equip') : document);
  const parts = () => [...racine.querySelectorAll(`.fi-dj[data-disj="${CSS.escape(nom)}"]`)];
  if (!parts().length) return;
  const Q = sel => { for (const p of parts()) { const e = p.matches(sel) ? p : p.querySelector(sel); if (e) return e; } return null; };
  const QA = sel => parts().flatMap(p => [...p.querySelectorAll(sel)]);
  const E = { d: disjonctionDe(nom) };
  // le profil tel que la fiche le montre : un état de base absent du tableau est un état supprimé (`null`)
  const lire = () => { const c = { ...(chargeDe(nom) || {}), plus: [] }; delete c.dem; delete c.trans; delete c.perm;
    const num = (k, q) => { const el = Q(`[data-dj="${k}"][data-q="${q}"]`); const x = el ? nombreLu(el.value) : null; return x != null && x >= 0 ? x : null; };
    ['dem', 'trans', 'perm'].forEach(k => { c[k] = Q(`.dj-etat[data-k="${k}"]`) ? { i: num(k, 'i'), t: k === 'perm' ? null : num(k, 't') } : null; });
    QA('.dj-etat[data-k^="plus"]').forEach(el => { const k = el.dataset.k, n = el.querySelector('[data-q="nom"]'); c.plus.push({ nom: n ? n.value.trim() : '', i: num(k, 'i'), t: num(k, 't') }); });
    if (!(c.calibre > 0)) c.calibre = null; return c; };
  // refaire en place : la fiche se recalcule, et ce qui ne porte pas le champ sous les doigts se remplace (08-fiche,
  // `rafraichirFicheEnPlace`) ; elle se relie ensuite d'elle-même — ce lien-ci passe la main
  const rafraichir = () => { E.d = disjonctionDe(nom); if (!rafraichirFicheEnPlace()) relier(); };
  // après une écriture : si la fiche ne s'est pas refaite (le focus dans un champ, ou une fiche qui ne suit pas), en place
  const apres = (avant, garder) => { if (avant && avant.isConnected) rafraichir(garder); };
  const dansUnChamp = () => { const a = document.activeElement; return !!(a && a.tagName === 'INPUT' && parts().some(p => p.contains(a))); };
  const ecrire = (quoi, c) => setTimeout(() => { const avant = parts()[0]; histPush(quoi); poserCharge(nom, c); apresEdition(); apres(avant, dansUnChamp()); }, 0);
  const geste = f => (...a) => { const avant = parts()[0]; f(...a); apres(avant, false); };
  const retenir = geste(cal => retenirCalibre(nom, cal)), rendre = geste(() => rendreCalibre(nom)), changerFils = geste(() => parVolta(() => changerFilsDuMeilleur(nom))), decider = geste(() => parVolta(() => deciderCalibre(nom)));
  // le profil, ouvert et sous les yeux, la main dans son permanent
  const voirProfil = () => { const p = Q('[data-part="profil"]'), det = p && p.closest('details.fs'); if (det) { det.open = true; try { p.scrollIntoView({ block: 'start', behavior: mouvementReduit() ? 'auto' : 'smooth' }); } catch (_) { p.scrollIntoView(); } const i = det.querySelector('[data-dj="perm"][data-q="i"]'); if (i) setTimeout(() => i.focus({ preventScroll: true }), 250); } };

  /* L'APERÇU AU CLAVIER : ← → sur un cran y mènent l'index sans rien écrire — le chiffre roule, la ligne du verdict dit ce
     calibre (« Aperçu — Entrée le retient »), la courbe le montre ; Entrée retient, Échap (ou le clavier qui s'en va)
     revient au retenu. */
  const AP = { cal: null };
  const cadran = () => Q('.dj-cadran'), crans = () => QA('.dj-cran'), items = () => calibresDuCadran(E.d, false, nom);
  const angleDe = cal => { const xs = items(), k = xs.findIndex(x => x.calibre === cal); return k < 0 ? null : geometrieCadran(xs.map(x => x.calibre)).angCran(k); };
  const traverses = (a, b) => { const xs = items().map(x => x.calibre), i = xs.indexOf(a), j = xs.indexOf(b); if (i < 0 || j < 0) return [b]; const ys = items(), s = xs.slice(Math.min(i, j), Math.max(i, j) + 1).map(c => ({ c, etat: (ys.find(y => y.calibre === c) || {}).etat || '' })); return i > j ? s.reverse() : s; };
  const montrer = (cal, o) => { const c = cadran(), vu = CADRAN_VU.get(nom) || {}, a0 = vu.ang != null ? vu.ang : angleDe(E.d.calibre), a1 = angleDe(cal); if (!c || a1 == null) return;
    voyageDeLIndex(c, a0 != null ? a0 : a1, a1, traverses(vu.cal != null ? vu.cal : E.d.calibre, cal));
    CADRAN_VU.set(nom, { ...vu, cal, ang: a1 });
    const x = items().find(y => y.calibre === cal), h = Q('.dj-heros'), l = Q('.dj-verdict-l');
    if (h && x) { h.classList.remove('ok', 'att', 'ko', 'neutre'); h.classList.add(x.etat || 'neutre'); h.classList.toggle('apercu', !!(o && o.apercu)); }
    if (l && x) { const t = document.createElement('template'); t.innerHTML = ligneDuVerdict(E.d, x, { ...(o || {}), nom }); const n = t.content.firstElementChild; l.replaceWith(n); ecrireLaLigne(n); }
    // la courbe montre ce calibre (l'aperçu), puis revient au retenu
    const fig = Q('.dj-graphe'); if (fig && E.d.courbes.length) { let dA = E.d; if (cal !== E.d.calibre) { try { dA = { ...E.d, ...verdictDisjonction(app.norme, E.d.courbe, cal, E.d.profil, E.d.contexte) }; } catch (_) { dA = E.d; } }
      const svg = fig.querySelector('svg'), w = Math.round(fig.clientWidth) || +((svg && svg.dataset.w) || 0); if (svg && w > 200) { svg.outerHTML = grapheSvg(dA, vueDeLaCourbe(), w); lierGraphique(fig, nom, { d: dA }, lire, ecrire, retenir); } } };
  const finApercu = () => { if (AP.cal == null) return; AP.cal = null; const x = items().find(y => y.retenu); if (x) montrer(x.calibre); else { const h = Q('.dj-heros'); if (h) h.classList.remove('apercu'); } };
  const apercu = cal => { if (cal === E.d.calibre) { finApercu(); return; } AP.cal = cal; montrer(cal, { apercu: true }); };

  const relier = () => {
    // un calibre retenu d'un clic — un cran du cadran, une puce de « À la main » : TOUS, même ceux qui ne passent pas ;
    // la gamme reste ouverte (on essaie, on compare) ; « Automatique (15 A) » retient le meilleur
    QA('.dj-cran').forEach(b => { b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') { finApercu(); return; } AP.cal = null; retenir(+b.dataset.cal); }; });
    QA('.dj-chip').forEach(b => { b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return; retenir(+b.dataset.cal); }; });
    QA('[data-dj-catalogue]').forEach(b => { b.onclick = () => { FI.catalogue[nom] = b.dataset.djCatalogue === '1'; rendreFiche(); const v = racine.querySelector('[data-dj-catalogue]'); if (v) v.focus({ preventScroll: true }); }; });
    QA('[data-dj-geste="retenir"]').forEach(b => { b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return; retenir(+b.dataset.cal); }; });
    QA('[data-dj-geste="fils"]').forEach(b => { b.onclick = () => changerFils(); });
    QA('[data-dj-geste="rendre"]').forEach(b => { b.onclick = e => { e.stopPropagation(); rendre(); }; });
    QA('[data-dj-geste="voir-profil"]').forEach(b => { b.onclick = voirProfil; });
    // le clavier sur le cadran : ← → (↑ ↓) d'un cran à l'autre, en aperçu ; Début, l'automatique ; Fin, le plus gros ;
    // Entrée retient (le clic du bouton) ; Échap revient au retenu sans fermer la fiche ; le clavier qui s'en va aussi
    QA('.dj-crans').forEach(g => { g._clavier = e => { const cs = crans(), i = cs.indexOf(document.activeElement); if (i < 0) return; let j = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') j = Math.min(cs.length - 1, i + 1); else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') j = Math.max(0, i - 1);
        else if (e.key === 'Home') j = Math.max(0, cs.findIndex(c => c.classList.contains('auto'))); else if (e.key === 'End') j = cs.length - 1;
        else if (e.key === 'Escape' && AP.cal != null) { e.preventDefault(); e.stopImmediatePropagation(); finApercu(); const r = cs.find(c => c.getAttribute('aria-pressed') === 'true'); if (r) { cs.forEach(c => { c.tabIndex = c === r ? 0 : -1; }); r.focus(); } return; }
        if (j == null) return; e.preventDefault(); e.stopImmediatePropagation(); if (j === i) return; cs.forEach((c, k) => { c.tabIndex = k === j ? 0 : -1; }); cs[j].focus(); apercu(+cs[j].dataset.cal); };
      g.addEventListener('focusout', e => { if (!g.contains(e.relatedTarget) && AP.cal != null) finApercu(); }); });
    // la carte de décision, en tête de la fiche (hors des groupes de la section) : décider, garder le retest, écrire le profil
    racine.querySelectorAll('.fi-decision [data-dj-geste]').forEach(b => { const g = b.dataset.djGeste;
      b.onclick = g === 'decider' ? () => { FI.liste = ''; decider(); } : g === 'retenir' ? () => { FI.liste = ''; retenir(+b.dataset.cal); } : g === 'voir-profil' ? voirProfil : null; });
    // « Les 3 câbles » de la carte de décision : leur liste, avant → après, se montre et se cache sur place
    racine.querySelectorAll('.fi-decision [data-dj-cables]').forEach(b => { b.onclick = () => { const k = b.dataset.djCables, ul = racine.querySelector('#dj-decision-cables'), o = !FI.tous[k]; FI.tous[k] = o; b.setAttribute('aria-expanded', String(o)); if (ul) ul.hidden = !o; }; });
    QA('[data-hyp]').forEach(b => { b.onclick = e => { e.stopPropagation(); ficheHypotheses(); }; });
    QA('.dj-etats input').forEach(el => { el.onchange = () => ecrire('profil de charge de ' + nom, lire()); });
    // « + État » : un état de plus — ou, quand le démarrage, la transition ou le permanent ont été supprimés, une petite
    // liste (08-fiche, `[data-changer]`) qui les rend ; × supprime un état, quel qu'il soit
    const ajouter = k => { const c = lire(); if (k && k !== 'plus') c[k] = { i: null, t: null }; else c.plus.push({ nom: 'État ' + (c.plus.length + 3), i: null, t: null }); FI.liste = ''; ecrire((k && k !== 'plus' ? NOMS_PHASES[k] + ' rendu' : 'un état de plus') + ' sur ' + nom, c); };
    const plus = Q('#dj-plus'); if (plus && !plus.dataset.changer) plus.onclick = () => ajouter('plus');
    QA('[data-dj-ajout]').forEach(b => { b.onclick = () => ajouter(b.dataset.djAjout); });
    QA('.dj-x').forEach(b => { b.onclick = () => { const c = lire(), k = b.dataset.x; if (/^plus/.test(k)) c.plus.splice(+k.slice(4), 1); else c[k] = null; ecrire('un état de moins sur ' + nom, c); }; });
    lierGraphe();
    /* LE VOYAGE : le calibre au centre a changé depuis le dernier rendu de CETTE fiche (un clic, Entrée, « Automatique »,
       Ctrl+Z) — l'index part d'où il était, longe l'arc jusqu'au nouveau, le chiffre roule, la ligne du verdict s'écrit.
       Une fiche qu'on ouvre se pose telle quelle. */
    const c = cadran(), cal = E.d.calibre, a1 = angleDe(cal), vu = CADRAN_VU.get(nom), meme = FI.rendu === 'meme' && vu && vu.cle === (($('ba-equip') || {}).dataset || {}).cle;
    if (c && a1 != null && meme && vu.cal !== cal && vu.ang != null) { voyageDeLIndex(c, vu.ang, a1, traverses(vu.cal, cal)); ecrireLaLigne(Q('.dj-verdict-l')); }
    else if (c && a1 != null && meme && vu.retenu !== cal) voyageDeLIndex(c, a1, a1, [cal]);
    CADRAN_VU.set(nom, { cal, ang: a1, retenu: cal, cle: (($('ba-equip') || {}).dataset || {}).cle }); AP.cal = null; };
  // le graphique : dessiné à la largeur où il se pose ; redessiné quand elle change
  const redessinerGraphe = () => { const fig = Q('.dj-graphe'); if (!fig || !E.d.courbes.length) return; const w = Math.round(fig.clientWidth);
    const svg = fig.querySelector('svg'); if (svg) svg.outerHTML = grapheSvg(E.d, vueDeLaCourbe(), w); lierGraphe(); };
  const lierGraphe = () => { const fig = Q('.dj-graphe'); if (!fig) return; const svg = fig.querySelector('svg'), w = Math.round(fig.clientWidth);
    if (svg && w > 200 && Math.abs(w - +svg.dataset.w) > 1) { svg.outerHTML = grapheSvg(E.d, vueDeLaCourbe(), w); }
    lierGraphique(fig, nom, E, lire, ecrire, retenir);
    if (DJ_OBS) DJ_OBS.disconnect(); if (typeof ResizeObserver === 'function') { let large = w; DJ_OBS = new ResizeObserver(() => { const ww = Math.round(fig.clientWidth); if (!fig.isConnected) { DJ_OBS.disconnect(); return; } if (ww > 200 && Math.abs(ww - large) > 1) { large = ww; redessinerGraphe(); } }); DJ_OBS.observe(fig); } };
  relier(); }
