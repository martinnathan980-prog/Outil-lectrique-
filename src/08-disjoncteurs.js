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
const chargeDe = nom => (app.contrat.charges && app.contrat.charges.get(nom)) || null;
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
  const ecrit = ecrit0 || (pn && pnChangeIci(nom) && pn !== passe ? pn : null);
  const calibre = ecrit || passe || pn || d.calibreIdeal || null; if (calibre && calibre !== d.calibre) d = verdictDisjonction(app.norme, courbe, calibre, profil, contexte);
  const chutePropre = chuteDuDisjoncteur(app.norme, famille, calibre);
  // le part number du retest jugé à son tour (passe-t-il ?) quand l'outil en retient un autre
  const gPn = pn && pn !== calibre ? (d.gamme || []).find(g => g.calibre === pn) || null : null;
  return { ...d, profil, ecrit, pn, gPn, famille, courbe, chutePropre, voisins, contexte, passe, origine: ecrit ? 'main' : calibre && calibre === passe ? 'ideal' : pn && calibre === pn ? 'pn' : calibre ? 'ideal' : '', fils: protectionDesFils(app.norme, calibre, profil, contexte.fils, hyp) }; }
const calibreDe = nom => disjonctionDe(nom).calibre;
/* LE MEILLEUR CALIBRE d'un disjoncteur, avec ses fils (09 bis, `meilleurDe`) : { calibre, pn, famille, catalogue, pourquoi,
   marge, filsAChanger: [{ cable, actuel, propose, raison, … }], contactsTouches: [{ cable, actuel, propose, raison, … }],
   filsInconnus, selectif, serre, reserve }. */
const meilleurCalibre = nom => disjonctionDe(nom).meilleur;
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
// le sort d'un point du profil, en deux mots (le lecteur : « soit ça passe, soit ça passe pas ; touche la courbe, non :
// ça passe pas ») : sa classe (ok, ko — rien s'il n'est pas jugé) et son mot ; toucher la courbe, sans la marge, ne passe pas
const classeVerdict = p => !p || p.ok == null ? '' : p.ok === false || p.serre ? 'ko' : 'ok';
const motVerdict = p => !p || p.ok == null ? 'pas jugé' : p.ok === false ? 'ne passe pas : déclenche' : p.serre ? 'ne passe pas : touche la courbe' : 'passe';
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
    else if (d.calibreIdeal && d.calibre !== d.calibreIdeal) out.push({ niveau: d.calibre < d.calibreIdeal && !d.avecMarge ? 'ko' : 'att', texte: d.calibre > d.calibreIdeal ? `${amperes(d.calibre)}${pnMot} : un ${amperes(d.calibreIdeal)} suffirait`
      : !d.avecMarge ? `${amperes(d.calibre)}${pnMot} ne passe pas : il touche la courbe (${d.somme > d.marges.fraction ? motFraction(d.somme) + ' du temps de déclenchement consommé' : 'sans ' + nombre(d.marges.marge) + ' % de marge de courant'}) : l’idéal est un ${amperes(d.calibreIdeal)}`
      : `${amperes(d.calibre)}${pnMot} tient ; l’idéal est un ${amperes(d.calibreIdeal)} (sélectivité avec le voisin)` }); }
  // le retest porte un autre calibre que celui que l'outil retient : il ne passe pas (à changer), ou il est plus gros qu'il ne faut
  if (d.gPn && d.origine !== 'main' && !d.sansProfil && !d.sansCourbe && d.calibre > 0) { const ok = d.gPn.valide === true && !!d.gPn.marge, m = d.meilleur || {};
    out.push({ niveau: ok ? 'att' : 'ko', texte: ok ? `le retest porte un ${amperes(d.pn)} (${pnDuRepere(nom)}) : ${d.calibre < d.pn ? 'le ' + amperes(d.calibre) + ' suffit' : 'l’outil retient le ' + amperes(d.calibre) + (d.voisins.some(v => v.calibre > 0 && Math.max(v.calibre, d.pn) < SELECTIVITE * Math.min(v.calibre, d.pn) - 1e-9) ? ' (sélectivité avec le voisin)' : '')}` : `le retest porte un ${amperes(d.pn)} (${pnDuRepere(nom)}) qui ne passe pas : l’outil retient le ${amperes(d.calibre)}${m.pn && m.calibre === d.calibre ? ' (' + m.pn + ')' : ''}` }); }
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
function poserCharge(nom, c) { const vide = !(c.calibre > 0) && !['dem', 'trans', 'perm'].some(k => (c[k] && c[k].i != null) || c[k] === null) && !(c.plus && c.plus.length);
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
  histPush('calibre de ' + nom + ' : ' + amperes(cal)); const c = { ...(chargeDe(nom) || {}), calibre: cal };
  if (nouveau && nouveau !== pn) verite().forEach(l => [['de', 'pnDe'], ['vers', 'pnVers']].forEach(([b, ch]) => { if (l[b] === nom && l[ch]) poserChamp(l, ch, nouveau); }));
  poserCharge(nom, c); apresEdition(); dire(nom + ' : ' + amperes(cal) + ' retenu à la main' + (nouveau ? ' (' + nouveau + ')' : '') + '. « Automatique » rend le choix de l’outil.'); return true; }
/* « Automatique » : rendre le choix à l'outil — le part number du retest sur chaque liaison, plus de calibre écrit ; le
   calibre redevient le meilleur qui passe (sinon celui du part number). */
function rendreCalibre(nom) { histPush('calibre de ' + nom + ' : automatique');
  verite().forEach(l => [['de', 'pnDe'], ['vers', 'pnVers']].forEach(([b, ch]) => { if (l[b] === nom && l.avant && ch in l.avant) poserChamp(l, ch, l.avant[ch]); }));
  const c = chargeDe(nom); if (c && c.calibre != null) poserCharge(nom, { ...c, calibre: null });
  apresEdition(); const d = disjonctionDe(nom); dire(nom + ' : automatique' + (d.calibre ? ', ' + amperes(d.calibre) : '') + '.'); }
/* CHANGER LES FILS que le meilleur calibre demande : chacun passe au câble proposé (la jauge qui le suit), le fichier gardé
   dans `avant` ; une seule entrée d'historique pour le lot. */
function filsDuMeilleur(d) { const fs = d.contexte.fils, memes = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  return (d.meilleur.filsAChanger || []).map(x => ({ x, f: fs.find(f => f.l && (f.cable || '') === x.cable && f.type === x.actuel && memes([f.l.de, f.l.vers].filter(r => r && !estMasse(r) && !estDisjoncteur(r)), x.bouts)) })); }
function changerFilsDuMeilleur(nom) { const d = disjonctionDe(nom), xs = filsDuMeilleur(d).filter(p => p.f && p.x.propose); if (!xs.length) return false;
  histPush(xs.length > 1 ? xs.length + ' câbles de ' + nom + ' grossis' : 'un câble de ' + nom + ' grossi');
  xs.forEach(p => poserChamp(p.f.l, 'type', p.x.propose)); apresEdition();
  dire(xs.map(p => (p.x.cable || 'un câble') + ' en ' + p.x.propose).join(', ') + '. Ctrl+Z les rend.'); return true; }
/* DÉCIDER (la carte de décision : « Passer en 15 A et grossir les 3 câbles ») : le retest est corrigé par le choix de
   l'outil — le part number du calibre retenu sur chaque liaison du disjoncteur (sans famille qui le construise, le calibre
   s'écrit au profil), les câbles que ce calibre demande à leur type proposé —, le fichier gardé dans `avant` (« Par
   rapport au retest » les liste). UNE entrée d'historique pour le tout. Le calibre reste l'automatique. */
function deciderCalibre(nom) { const d = disjonctionDe(nom), cal = d.calibre; if (!(cal > 0)) return false;
  const pn = pnDuRepere(nom), F = d.famille, nouveau = F && pn ? pnAvecCalibre(pn, F, cal) : null, xs = cal === (d.meilleur || {}).calibre ? filsDuMeilleur(d).filter(p => p.f && p.x.propose) : [];
  histPush(nom + ' : ' + amperes(cal) + (xs.length ? ' et ' + pluriel2(xs.length, 'câble') + ' grossi' + (xs.length > 1 ? 's' : '') : ''));
  if (nouveau && nouveau !== pn) verite().forEach(l => [['de', 'pnDe'], ['vers', 'pnVers']].forEach(([b, ch]) => { if (l[b] === nom && l[ch]) poserChamp(l, ch, nouveau); }));
  else if (!nouveau) poserCharge(nom, { ...(chargeDe(nom) || {}), calibre: cal });
  xs.forEach(p => poserChamp(p.f.l, 'type', p.x.propose)); apresEdition();
  dire(nom + ' : ' + amperes(cal) + (nouveau ? ' (' + nouveau + ')' : '') + (xs.length ? ', ' + xs.map(p => (p.x.cable || 'un câble') + ' en ' + p.x.propose).join(', ') : '') + '. Ctrl+Z défait le tout.'); return true; }
/* LA CARTE DE DÉCISION (le parcours v72 : « 102CB1 coche 15 A en vert sous 4 problèmes rouges ; la vraie histoire est la
   première des onze lignes de la barre, repliée ») : en tête de la fiche, quand le calibre que l'outil retient n'est pas
   celui du retest — ce que fait le retest (il déclenche, il touche la courbe ; ou il est plus gros qu'il ne faut), le
   calibre qui passe et ce qu'il demande ; deux gestes : « Passer en 15 A et grossir les 3 câbles » (`deciderCalibre`),
   « Garder le 10 A… » qui dit ce qu'il faudrait pour qu'il passe (un permanent plus bas, des pointes plus courtes) et
   le retient quand même. `autres` : le nombre des autres points de la fiche. */
function carteDecision(nom, d, autres) { if (!d.gPn || d.origine === 'main' || d.sansProfil || d.sansCourbe || !(d.calibre > 0) || !d.pn) return '';
  const g = d.gPn, passe = g.valide === true && !!g.marge, pn = pnDuRepere(nom), m = d.meilleur || {}, cal = d.calibre, xs = cal === m.calibre ? filsDuMeilleur(d).filter(p => p.f && p.x.propose) : [];
  let p = null; try { p = verdictDisjonction(app.norme, d.courbe, d.pn, d.profil, d.contexte).pire; } catch (_) { p = null; }
  const titre = passe ? `Le retest porte un ${amperes(d.pn)} : ${cal < d.pn ? 'un ' + amperes(cal) + ' suffit' : 'l’outil retient le ' + amperes(cal)}` : `Le ${amperes(d.pn)} du retest ${g.valide === false ? 'déclenche' : 'touche la courbe'}`;
  const quoi = !passe && p ? `${majuscule(p.nom)}, <b>${esc(amperes(p.i))}${p.t === Infinity ? ' en permanence' : ' pendant ' + esc(secondes(p.t))}</b>, ${g.valide === false ? 'fait déclencher le' : 'touche la courbe du'} ${ident(pn || amperes(d.pn))}. ` : '';
  const suite = `Le plus petit qui passe est le <b>${esc(amperes(cal))}</b>${m.pn && m.calibre === cal ? ' (' + ident(m.pn) + ')' : ''}${xs.length ? ` — il demande ${xs.length > 1 ? xs.length + ' câbles' : 'un câble'} plus gros.` : '.'}`;
  // ce qu'il faudrait pour que le retest passe : le permanent sous ce qu'il garantit (avec la marge), des pointes assez courtes
  const M = d.marges || {}, k = M.k || 1, garder = [];
  if (!passe && g.tenu && !g.permanentMargeOk) { const perm = (d.points || []).find(x => x.t === Infinity); garder.push(`un permanent d’au plus ${amperes(Math.floor(g.tenu / k * 100) / 100)}${perm ? ' (il est de ' + amperes(perm.i) + ')' : ''} : le ${amperes(d.pn)} n’en garantit que ${amperes(g.tenu)}${M.marge ? ', moins ' + nombre(M.marge) + ' % de marge' : ''}`); }
  if (!passe && p && p.t !== Infinity && g.sommeMarge > (M.fraction || 1) + 1e-9) { const r = (M.fraction || 1) / g.sommeMarge; garder.push(`des pointes plus courtes : ${p.nom} en ${secondes(p.t * r)} au plus (${secondes(p.t)} aujourd’hui)`); }
  const cleG = 'garder|' + nom, ouvert = FI.liste === cleG;
  const panneau = listeChoix(cleG, (passe ? `<p class="fi-note">Le ${esc(amperes(d.pn))} du retest passe aussi : le garder ne change pas les câbles.</p>`
      : `<p class="fi-note">Pour que le ${esc(amperes(d.pn))} passe, il faudrait ${garder.length ? garder.map(esc).join(' ; ou ') : 'un profil plus léger'}. Gardé tel quel, il se dira « ne passe pas ».</p>`)
    + `<div class="fi-puces"><button type="button" class="btn papier" data-dj-geste="retenir" data-cal="${d.pn}">Retenir le ${esc(amperes(d.pn))}${passe ? '' : ' quand même'}</button>${passe ? '' : '<button type="button" class="fi-lien" data-dj-geste="voir-profil">Écrire le profil</button>'}</div>`, { titre: 'Garder le calibre du retest', cls: 'fi-decision-garder' });
  const lignes = xs.length ? `<ul class="fi-decision-cables">${xs.map(({ x, f }) => `<li${f && f.l ? ` data-i="${cleFil(f.l)}"` : ''} data-bulle="${escA(majuscule(x.raison))}"><b class="id">${esc(x.cable || 'sans n°')}</b><span class="id">${esc(x.actuel)}</span>${ico('fleche')}<b class="id">${esc(x.propose)}</b></li>`).join('')}</ul>` : '';
  return `<section class="fi-decision ${passe ? 'att' : 'ko'}" aria-label="${escA(titre)}"><h3 class="fi-decision-t">${ico('alerte')}<span>${esc(titre)}</span></h3><p class="fi-decision-p">${insecable(quoi + suite)}</p>${lignes}`
    + `<div class="fi-decision-gestes"><button type="button" class="btn cuivre" id="dj-decider" data-dj-geste="decider">Passer en ${esc(amperes(cal))}${xs.length ? ' et grossir ' + (xs.length > 1 ? 'les ' + xs.length + ' câbles' : 'le câble') : ''}</button>`
    + `<button type="button" class="btn papier fi-decision-garder-b" data-changer="${escA(cleG)}" aria-expanded="${ouvert}">Garder le ${esc(amperes(d.pn))}…</button></div>${panneau}`
    + (autres ? `<button type="button" class="fi-lien fi-decision-autres" data-ouvrir-pbs="1">et ${autres > 1 ? autres + ' autres points' : 'un autre point'}</button>` : '') + '</section>'; }

/* ---- la section ----------------------------------------------------------------------- */
// la vue de la courbe sur la fiche : les quatre températures, jamais les calibres voisins, sans bascule (le lecteur :
// « les températures, il nous les faut de base : pas de bouton » ; « les calibres voisins, on s'en fiche ») — celle que
// le dessin fixe (08-courbe-dj, `DJ_VUE`), sinon la nôtre
const VUE_DJ_FICHE = Object.freeze({ comparer: false, temperatures: true });
const vueDeLaCourbe = () => typeof DJ_VUE === 'object' && DJ_VUE ? DJ_VUE : VUE_DJ_FICHE;
/* LA SECTION « CALIBRE » (08-sections) : trois groupes, chacun dans un `.fi-dj[data-disj][data-part]` que
   `lierDisjonction` retrouve — le calibre (le retenu en grand et son verdict, le meilleur, le choix), la courbe, le
   profil. `probs` : les problèmes de la fiche (la pastille compte ceux qu'elle démontre). */
function sectionDisjoncteur(nom, d, o, probs) { d = d || disjonctionDe(nom); o = o || origineDuCalibre(nom, d);
  const part = (cle, titre, html, droite, aideCle) => groupeSection(titre, html, { cls: `fi-dj dj-part dj-${cle}`, attrs: `data-disj="${escA(nom)}" data-part="${cle}"`, droite, aide: aideCle ? [aideCle, contexteAide(aideCle, d)] : null });
  const tete = part('calibre', '', heroCalibre(nom, d, o));
  if (d.sansCourbe) return { cle: 'disjoncteur', vide: 'aucune courbe de disjonction dans la norme : rien ne se choisit', contenu: tete };
  const m = d.meilleur || {}, cal = d.calibre, v = verdictDuRetenu(d);
  const courbe = part('courbe', 'Courbe de déclenchement', `<figure class="dj-graphe ilot-clair">${grapheSvg(d, vueDeLaCourbe(), largeurGrapheEstimee())}<div class="dj-tip" hidden></div></figure>`, '', 'courbe');
  const supprimes = ['dem', 'trans', 'perm'].filter(k => d.profil && d.profil[k] === null), cleP = 'djplus|' + nom;
  const plus = supprimes.length ? `<button type="button" class="fi-lien dj-plus" id="dj-plus" data-changer="${escA(cleP)}" aria-expanded="${FI.liste === cleP}" data-bulle="Un état de plus : un courant, une durée">${ico('plus')}État</button>`
    : `<button type="button" class="fi-lien dj-plus" id="dj-plus" data-bulle="Un état de plus : un courant, une durée">${ico('plus')}État</button>`;
  const ajouts = supprimes.length ? listeChoix(cleP, `<div class="fi-puces">${supprimes.map(k => `<button type="button" class="fi-chip" data-dj-ajout="${k}">${esc(majuscule(NOMS_PHASES[k] || k))}</button>`).join('')}<button type="button" class="fi-chip" data-dj-ajout="plus">Autre état</button></div>`, { titre: 'Ajouter un état' }) : '';
  const profil = part('profil', 'Profil de charge', tableauProfil(d) + ajouts, plus, 'profil');
  // pas de pastille (le lecteur : « le petit 1 en jaune, ça sert à rien ») ; pliée, la ligne dit le calibre en grand, sa gamme,
  // et le retest quand il en porte un autre (l'audit v72 : « le 10 A du retest ne se dit que dans la liste repliée des problèmes »)
  const fam = (d.famille && (d.famille.famille || d.famille.nom)) || '', retest = d.pn && cal && d.pn !== cal ? d.pn : o.calRetest && o.calRetest !== cal ? o.calRetest : null;
  const resume = cal ? `<b class="dj-resume">${esc(nombre(Math.round(cal * 100) / 100))}<small>A</small></b>${v.etat === 'ko' ? '<span class="fi-ko-t">ne passe pas</span>' : ''}`
    + `<span class="dj-resume-sous">${[fam ? esc(fam) : '', retest ? `retest <s>${esc(amperes(retest))}</s>` : ''].filter(Boolean).join(' · ')}</span>` : '';
  return { cle: 'disjoncteur', resume, contenu: tete + courbe + profil }; }
// ce que le « ? » de la courbe et du profil lit (08-explications) : la famille de courbes ; le permanent, la pointe, la part consommée
function contexteAide(cle, d) { if (cle === 'courbe') return { famille: d.famille || d.courbe || '' };
  const perm = (d.points || []).find(p => p.t === Infinity), pointe = (d.points || []).find(p => p.t !== Infinity && p.i > 0);
  return { permanent: perm ? perm.i : null, pointe: pointe ? { i: pointe.i, t: pointe.t } : null, somme: d.somme != null ? d.somme : null }; }
/* LE VERDICT du calibre retenu, en deux mots (le lecteur : « soit ça passe, soit ça passe pas — c'est A ou B ») : il
   PASSE s'il ne déclenche pas avec la marge ; sinon il NE PASSE PAS — qu'il déclenche ou qu'il touche la courbe. Lu dans le
   jugement du moteur (la gamme jugée, sinon le verdict d'ensemble) ; le pourquoi en clair dans `raison`, pour la bulle. */
function verdictDuRetenu(d) { const cal = d.calibre, g = (d.gamme || []).find(x => x.calibre === cal);
  if (d.sansProfil) return { etat: '', mot: 'Profil à écrire', raison: 'Sans profil de charge, rien ne se juge.' };
  if (!(cal > 0)) return { etat: 'ko', mot: 'Aucun ne passe', raison: 'Aucun calibre de la gamme ne tient ce profil.' };
  const valide = g && g.valide != null ? g.valide : d.valide, marge = g && g.marge != null ? g.marge : d.avecMarge;
  if (valide === false) return { etat: 'ko', mot: 'Ne passe pas', raison: 'Il déclenche.' };
  if (!marge) return { etat: 'ko', mot: 'Ne passe pas', raison: 'Il touche la courbe : sans la marge.' };
  return { etat: 'ok', mot: 'Passe', raison: 'Il ne déclenche pas, avec la marge.' }; }
/* LE CALIBRE, sur son CADRAN (v72, « Nuit bleue » ; le lecteur, v62 : « commence directement par l'automatique —
   uniquement le calibre qui passe ; le A à la même taille ; passe ou passe pas, pas besoin : on comprend que ça passe » ;
   v72 : « le calibre du 15 A, la manière dont tu l'as créé, c'est horrible ») : comme un instrument de bord, la gamme
   sur un arc, de 0 au plus gros calibre — la part qui passe en vert, le serré (il passe sans la marge) d'un trait ambre —
   et, à l'intérieur, la charge (le permanent plein, la pointe en voile) ; le retenu est l'index, le nombre au centre, son
   unité à sa taille. Ni pastille ni mot quand il passe : l'index est dans le vert, la charge loin derrière. Quand il ne
   passe pas, le nombre rougit et la phrase le dit (`.dj-h-ko`). À côté, la charge en chiffres et la gamme, son « ? ».
   « Automatique » (pressé, étoilé, quand c'est lui) rend le choix de l'outil ; « À la main ▾ » ouvre les calibres de la
   gamme QUI PASSENT, pour un choix à la main. Puis, en une carte, les câbles que le calibre demande. */
const nombreCourt = x => esc(nombre(Math.round(x * 100) / 100));
// la charge du profil : le permanent (l'état sans fin) et la plus forte pointe
function chargeDuProfil(d) { const pts = d.points || [], perm = (pts.find(p => p.t === Infinity) || {}).i, pointes = pts.filter(p => p.t !== Infinity && p.i > 0).map(p => p.i);
  return { perm: perm > 0 ? perm : null, pointe: pointes.length ? Math.max(...pointes) : null }; }
/* Le cadran : 240° d'arc, de 0 (en bas à gauche) au plus gros calibre de la gamme (en bas à droite) ; un cran et son
   nombre par calibre — le retenu en gras, l'index posé dessus. Tout est à l'échelle des ampères. */
function cadranCalibre(d) { const cal = d.calibre, g = d.gamme || [], ch = chargeDuProfil(d);
  const cat = [...new Set((d.catalogue && d.catalogue.length ? d.catalogue : g.map(x => x.calibre)).concat(cal > 0 ? [cal] : []))].filter(x => x > 0).sort((a, b) => a - b);
  if (!cat.length) return '';
  const etat = c => { const x = g.find(y => y.calibre === c); return !x || x.valide == null ? 'inconnu' : x.valide === true && x.marge ? 'passe' : x.valide === true ? 'serre' : 'non'; };
  const max = cat[cat.length - 1], A0 = 150, BAL = 240, R = 62, R2 = 50, cx = 80, cy = 78;
  const ang = x => (A0 + BAL * Math.max(0, Math.min(1, x / max))) * Math.PI / 180, P = (x, r) => [cx + r * Math.cos(ang(x)), cy + r * Math.sin(ang(x))].map(z => z.toFixed(2));
  const arc = (a, b, r) => { if (b <= a) return ''; const [x1, y1] = P(a, r), [x2, y2] = P(b, r); return `M${x1} ${y1}A${r} ${r} 0 ${(b - a) / max * BAL > 180 ? 1 : 0} 1 ${x2} ${y2}`; };
  const i0 = cat.find(c => etat(c) === 'passe'), serres = cat.filter(c => etat(c) === 'serre');
  const crans = cat.map(c => { const [x1, y1] = P(c, R + 4), [x2, y2] = P(c, R - 4), [tx, ty] = P(c, R + 15), cls = etat(c) + (c === cal ? ' retenu' : '');
    return `<line class="dj-arc-cran ${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/><text class="dj-arc-n ${cls}" x="${tx}" y="${ty}">${nombreCourt(c)}</text>`; }).join('');
  const [ix, iy] = cal > 0 ? P(cal, R) : [0, 0];
  return `<svg class="dj-arc" viewBox="-4 -6 168 152" aria-hidden="true"><path class="dj-arc-piste" d="${arc(0, max, R)}"/>`
    + (i0 ? `<path class="dj-arc-passe" d="${arc(i0, max, R)}"/>` : '') + serres.map(c => `<path class="dj-arc-serre" d="${arc(Math.max(0, c - max * .012), Math.min(max, c + max * .012), R)}"/>`).join('')
    + `<path class="dj-arc-fond" d="${arc(0, max, R2)}"/>` + (ch.pointe ? `<path class="dj-arc-pointe" d="${arc(0, Math.min(max, ch.pointe), R2)}"/>` : '') + (ch.perm ? `<path class="dj-arc-perm" d="${arc(0, Math.min(max, ch.perm), R2)}"/>` : '')
    + crans + (cal > 0 ? `<circle class="dj-arc-index" cx="${ix}" cy="${iy}" r="5.5"/>` : '') + '</svg>'; }
/* LE CHOIX DU CALIBRE (l'audit v72 : « trois commandes pour un choix — les crans, “Automatique” qui a l'air d'une action
   à faire, “Autre calibre” ») : UNE commande, deux segments joints — « ★ Automatique » (pressé quand c'est lui : un état,
   pas un geste) | « À la main ▾ » (ou « 20 A à la main ▾ » quand on en a retenu un) qui ouvre, dessous, les calibres de
   la gamme qui passent. Les crans du cadran se lisent, ils ne se cliquent pas ; la clé, sous le cadran, dit ses
   couleurs. */
function heroCalibre(nom, d, o) { const m = d.meilleur || {}, cal = d.calibre, best = d.passe, auto = !!best && best === cal && d.origine !== 'main', v = verdictDuRetenu(d);
  const passants = (d.gamme || []).filter(g => g.valide === true && !!g.marge), cleL = 'dj|' + nom, ouverte = FI.liste === cleL;
  const gamme = passants.map(g => `<button type="button" class="dj-chip ok${g.calibre === best ? ' ideal' : ''}" data-cal="${g.calibre}" aria-pressed="${g.calibre === cal}" data-bulle="${escA(amperes(g.calibre) + (g.calibre === best ? ' — l’automatique, le plus petit qui passe' : '') + (g.calibre === cal ? ' · retenu' : ' · un clic le retient à la main'))}">${g.calibre === best ? `<i class="dj-etoile" aria-hidden="true">${ico('etoile')}</i>` : ''}${esc(nombre(g.calibre))}<small>A</small></button>`).join('');
  const main = passants.length > 1 || (passants.length && !auto) ? `<button type="button" class="dj-seg dj-main" data-changer="${escA(cleL)}" aria-expanded="${ouverte}" data-bulle="Retenir à la main un autre calibre de la gamme qui passe">${auto || !cal ? 'À la main' : esc(amperes(cal)) + ' à la main'}${ico('bas', 'fi-chevron')}</button>` : '';
  const actions = d.sansProfil ? `<button type="button" class="btn papier" data-dj-geste="voir-profil">Écrire le profil</button>`
    : best || main ? `<span class="dj-choix" role="group" aria-label="Le choix du calibre">${best ? `<button type="button" class="dj-seg${auto ? ' dj-auto-pris' : ''}" id="dj-retenir" data-dj-geste="retenir" data-cal="${best}" aria-pressed="${auto}" data-bulle="${escA(phraseMeilleur(d) + (auto ? ' Il est retenu.' : ' Un clic rend ce choix à l’outil — Ctrl+Z le défait.') + (m.pn ? ' Part number ' + m.pn + ' : une désignation construite, à vérifier au catalogue.' : ''))}">${auto ? ico('etoile', 'dj-auto-etoile') : ''}Automatique${auto ? '' : ` (${esc(amperes(best))})`}</button>` : ''}${main}</span>` : '';
  const liste = gamme ? listeChoix(cleL, `<div class="dj-chips" role="group" aria-label="Retenir à la main un calibre qui passe">${gamme}</div>`, { titre: 'Les calibres de la gamme qui passent', cls: 'dj-gamme-choix' }) : '';
  // la clé du cadran : ses couleurs, en mots (hors du cadran, qui ne porte aucun mot)
  const ch0 = chargeDuProfil(d), serres = (d.gamme || []).some(g => g.valide === true && !g.marge), cle = (d.gamme || []).length && !d.sansProfil ? `<p class="dj-cle"><span><i class="passe" aria-hidden="true"></i>passe</span>${serres ? '<span><i class="serre" aria-hidden="true"></i>juste, sans la marge</span>' : ''}${ch0.perm || ch0.pointe ? '<span><i class="charge" aria-hidden="true"></i>la charge</span>' : ''}<span><i class="index" aria-hidden="true"></i>le retenu</span></p>` : '';
  const ko = v.etat === 'ko' ? `<span class="dj-h-ko">${esc(!(cal > 0) || (!best && !d.sansProfil) ? 'aucun calibre de la gamme ne passe' : 'ne passe pas — ' + v.raison.replace(/\.$/, '').toLowerCase())}</span>` : '';
  // la charge en chiffres, sa pastille de couleur la relie à son trait du cadran
  const ch = chargeDuProfil(d), stat = (x, cls, mot) => x ? `<span class="dj-stat ${cls}"><b>${nombreCourt(x)}<small>A</small></b><span><i aria-hidden="true"></i>${mot}</span></span>` : '';
  const famille = (d.famille && (d.famille.famille || d.famille.nom)) || d.courbe || '';
  const heros = `<div class="dj-heros ${v.etat || 'neutre'}"${v.raison ? ` data-bulle="${escA(v.raison)}"` : ''}><div class="dj-cadran">${cadranCalibre(d)}<div class="dj-h-centre"><b class="dj-h-cal">${cal ? nombreCourt(cal) + '<span class="dj-h-u">A</span>' : '—'}</b></div></div>`
    + `<div class="dj-h-cote">${ko}${ch.perm || ch.pointe ? `<div class="dj-stats">${stat(ch.perm, 'perm', 'permanent')}${stat(ch.pointe, 'pointe', 'en pointe')}</div>` : ''}`
    + `<div class="dj-h-pied">${famille ? `<span>Gamme ${esc(famille)}</span>` : ''}${aide('calibre', { verdict: d, calibre: cal || null, origine: o.origine === 'main' ? 'main' : d.origine, meilleur: best || null })}</div></div></div>`;

  return heros + cle + (actions ? `<div class="dj-h-actions">${actions}</div>` : '') + liste + ligneCablesAGrossir(nom, d); }
/* LES CÂBLES QUE LE MEILLEUR DEMANDE (le lecteur : « trois câbles à grossir : sur ordi on ne voit pas, les écritures se
   chevauchent » ; puis : « le + 7,7 g/m, on s'en fout ; des fois il y a marqué câble et pas le numéro : il manque une
   information, il faut le faire ressortir ») : une carte, toujours ouverte — en tête combien, avec quel calibre, et
   « Changer les câbles » ; puis une ligne par câble : son numéro (sans numéro : « sans n° », en ambre, il manque), son type
   et celui qu'il lui faut ; dessous, en petit, le contact qui change avec lui. Un clic sur une ligne ouvre le câble. */
function ligneCablesAGrossir(nom, d) { const m = d.meilleur || {}; if (d.sansProfil || !m.calibre) return '';
  const aChanger = filsDuMeilleur(d), proposes = aChanger.filter(p => p.x.propose); if (!aChanger.length) return '';
  const lignes = aChanger.map(({ x, f }) => { const k = f && f.l ? cleFil(f.l) : '';
    const ct = (m.contactsTouches || []).find(c => c.cable === x.cable && JSON.stringify(c.bouts) === JSON.stringify(x.bouts));
    return `<li class="dj-g-ligne"${k ? ` data-i="${k}" tabindex="0" role="button"` : ''} data-bulle="${escA(majuscule(x.propose ? x.raison : x.aucune || x.raison) + (ct ? '\n' + majuscule(ct.raison) : ''))}">`
      + (x.cable ? `<span class="dj-g-num">${esc(x.cable)}</span>` : `<span class="dj-g-num manque" data-bulle="Ce câble n’a pas de numéro dans le retest : il manque une information">sans n°</span>`)
      + `<span class="dj-g-de-a"><span class="id">${esc(x.actuel)}</span>${ico('fleche')}<b class="id${x.propose ? '' : ' manque'}">${esc(x.propose || 'aucun')}</b></span>`
      + (ct ? `<span class="dj-g-ct">contact ${esc(ct.actuel)} ${ico('fleche')} ${esc(ct.propose)}</span>` : '') + '</li>'; }).join('');
  return `<div class="dj-grossir"><div class="dj-g-tete">${ico('alerte', 'dj-g-ico')}<span class="dj-g-titre"><b>${pluriel2(aChanger.length, 'câble')} à grossir</b> <span>avec le ${esc(amperes(m.calibre))}</span></span>`
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
      + (e.k === 'perm' ? `<span class="dj-inf" data-bulle="Pour toujours" role="img" aria-label="Pour toujours">${ico('infini')}</span>` : `<label class="dj-champ"><input data-dj="${e.k}" data-q="t" value="${escA(val(e, 't'))}" inputmode="decimal" placeholder="—" autocomplete="off" aria-label="${escA(e.nom + ' : durée en secondes')}"></label>`)
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
/* LE SEUL POINT QUI LIE les gestes du disjoncteur, après le rendu de sa fiche. Ses sections se retrouvent où que la fiche
   les pose (`conteneur`, sinon l'inspecteur, sinon la page) par leur `.fi-dj[data-disj]`. Chaque écriture va au contrat
   (Ctrl+Z la défait) ; la fiche se refait ensuite d'elle-même — sauf si l'on écrit dans un champ du profil : alors
   ce qui change se refait EN PLACE (les champs restent sous les doigts), et de même si la fiche ne s'est pas refaite. */
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
  const retenir = geste(cal => retenirCalibre(nom, cal)), rendre = geste(() => rendreCalibre(nom)), changerFils = geste(() => changerFilsDuMeilleur(nom)), decider = geste(() => deciderCalibre(nom));
  // le profil, ouvert et sous les yeux, la main dans son permanent
  const voirProfil = () => { const p = Q('[data-part="profil"]'), det = p && p.closest('details.fs'); if (det) { det.open = true; try { p.scrollIntoView({ block: 'start', behavior: mouvementReduit() ? 'auto' : 'smooth' }); } catch (_) { p.scrollIntoView(); } const i = det.querySelector('[data-dj="perm"][data-q="i"]'); if (i) setTimeout(() => i.focus({ preventScroll: true }), 250); } };
  const relier = () => {
    // un calibre à la main (la gamme, ouverte sous « À la main ») ; « Automatique (15 A) » retient le meilleur
    QA('.dj-chip').forEach(b => { b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return; FI.liste = ''; retenir(+b.dataset.cal); }; });
    QA('[data-dj-geste="retenir"]').forEach(b => { b.onclick = () => { FI.liste = ''; retenir(+b.dataset.cal); }; });
    QA('[data-dj-geste="fils"]').forEach(b => { b.onclick = () => changerFils(); });
    QA('[data-dj-geste="rendre"]').forEach(b => { b.onclick = e => { e.stopPropagation(); rendre(); }; });
    QA('[data-dj-geste="voir-profil"]').forEach(b => { b.onclick = voirProfil; });
    // la carte de décision, en tête de la fiche (hors des groupes de la section) : décider, garder le retest, écrire le profil
    racine.querySelectorAll('.fi-decision [data-dj-geste]').forEach(b => { const g = b.dataset.djGeste;
      b.onclick = g === 'decider' ? () => { FI.liste = ''; decider(); } : g === 'retenir' ? () => { FI.liste = ''; retenir(+b.dataset.cal); } : g === 'voir-profil' ? voirProfil : null; });
    QA('[data-hyp]').forEach(b => { b.onclick = e => { e.stopPropagation(); ficheHypotheses(); }; });
    QA('.dj-etats input').forEach(el => { el.onchange = () => ecrire('profil de charge de ' + nom, lire()); });
    // « + État » : un état de plus — ou, quand le démarrage, la transition ou le permanent ont été supprimés, une petite
    // liste (08-fiche, `[data-changer]`) qui les rend ; × supprime un état, quel qu'il soit
    const ajouter = k => { const c = lire(); if (k && k !== 'plus') c[k] = { i: null, t: null }; else c.plus.push({ nom: 'État ' + (c.plus.length + 3), i: null, t: null }); FI.liste = ''; ecrire((k && k !== 'plus' ? NOMS_PHASES[k] + ' rendu' : 'un état de plus') + ' sur ' + nom, c); };
    const plus = Q('#dj-plus'); if (plus && !plus.dataset.changer) plus.onclick = () => ajouter('plus');
    QA('[data-dj-ajout]').forEach(b => { b.onclick = () => ajouter(b.dataset.djAjout); });
    QA('.dj-x').forEach(b => { b.onclick = () => { const c = lire(), k = b.dataset.x; if (/^plus/.test(k)) c.plus.splice(+k.slice(4), 1); else c[k] = null; ecrire('un état de moins sur ' + nom, c); }; });
    lierGraphe(); };
  // le graphique : dessiné à la largeur où il se pose ; redessiné quand elle change
  const redessinerGraphe = () => { const fig = Q('.dj-graphe'); if (!fig || !E.d.courbes.length) return; const w = Math.round(fig.clientWidth);
    const svg = fig.querySelector('svg'); if (svg) svg.outerHTML = grapheSvg(E.d, vueDeLaCourbe(), w); lierGraphe(); };
  const lierGraphe = () => { const fig = Q('.dj-graphe'); if (!fig) return; const svg = fig.querySelector('svg'), w = Math.round(fig.clientWidth);
    if (svg && w > 200 && Math.abs(w - +svg.dataset.w) > 1) { svg.outerHTML = grapheSvg(E.d, vueDeLaCourbe(), w); }
    lierGraphique(fig, nom, E, lire, ecrire, retenir);
    if (DJ_OBS) DJ_OBS.disconnect(); if (typeof ResizeObserver === 'function') { let large = w; DJ_OBS = new ResizeObserver(() => { const ww = Math.round(fig.clientWidth); if (!fig.isConnected) { DJ_OBS.disconnect(); return; } if (ww > 200 && Math.abs(ww - large) > 1) { large = ww; redessinerGraphe(); } }); DJ_OBS.observe(fig); } };
  relier(); }
