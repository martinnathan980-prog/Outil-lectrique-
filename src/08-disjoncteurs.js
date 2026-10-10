/* ===========================================================================
   08 quinquies — LE DISJONCTEUR : ce que sa fiche porte en propre
   ---------------------------------------------------------------------------
   Le lecteur : « le calibre : trop d'infos ; le meilleur calibre et la courbe
   de déclenchement, il faut les fusionner, c'est le disjoncteur. La carte
   15 A remet la norme, rebelote, plein de messages, trop lourd. Le profil :
   démarrage, transition, permanent — pas dans le désordre ; pas de phrase en
   dessous, épuré, classe. » Dans le squelette commun des fiches
   (08-sections), le disjoncteur a UNE section à lui, « Disjoncteur » :
     · son PART NUMBER (MS3320-10 : le calibre s'y lit), modifiable ;
     · les CALIBRES de la gamme (ceux que la famille du part number propose,
       `d.gamme`) en segments : le retenu pressé, le meilleur étoilé, un trait
       d'état sous chacun ; un clic en retient un autre (le part number suit) ;
     · UNE LIGNE pour le meilleur quand il diffère du retenu, ou quand des fils
       sont à grossir avec lui : « Meilleur 15 A · 3 fils à grossir —
       Retenir 15 A · Changer les fils », « lesquels » replié, le pourquoi au
       survol ;
     · LA COURBE, sur papier (son dessin vit plus bas : `grapheSvg`) ;
     · LE PROFIL DE CHARGE : un petit tableau — démarrage, transition,
       permanent, puis les états ajoutés —, chaque valeur modifiable, + état, ×.
   Ses fils (l'intensité au pire contre ce qu'ils admettent, la chute en ligne
   jusqu'au bout de leur chemin) vont dans la section commune « Fils »
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
const limiteDuFil = (f, x) => f.jugeSur === 'dommage' ? `il s’abîme au-delà de ${amperes(x.admise)}` : `le fil admet ${amperes(x.admise)} en service`;
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
const disjoncteursVoisins = nom => [...new Set(cheminsDepuis(verite(), nom).map(ch => ch.bout[0]).filter(r => r && r !== nom && estDisjoncteur(r)))].map(r => ({ nom: r, calibre: calibreNominal(r) }));
/* Le calibre RETENU : celui qu'on a écrit à la main, sinon celui du part number (MS3320-10 → 10 A, si la famille est un
   disjoncteur), sinon le meilleur que le moteur trouve. Rend le verdict complet (09 bis, jugé avec ses fils et ses
   voisins), le profil, la famille du part number, d'où vient le calibre, et ses fils jugés. */
function disjonctionDe(nom) { const profil = chargeDe(nom), ecrit = profil && profil.calibre > 0 ? profil.calibre : null, famille = familleDuPn(pnDuRepere(nom), app.norme), pn = famille ? famille.calibre : null, voisins = disjoncteursVoisins(nom);
  // la famille de courbes : celle que la famille du part number dit (table Familles de disjoncteurs), sinon celle par défaut (la feuille du lecteur)
  const courbe = famille && famille.courbe ? famille.courbe : '', hyp = { ...(app.simu || HYPOTHESES), courbe };
  // la famille du part number donne au moteur son catalogue (la gamme), sa calibration (ce qu'il garantit) et le part number du meilleur
  const contexte = { fils: filsDuDisjoncteur(nom), hyp, autres: voisins.map(v => v.calibre).filter(c => c > 0), famille, pn: pnDuRepere(nom) };
  let d = verdictDisjonction(app.norme, courbe, ecrit || pn || 0, profil, contexte);
  const calibre = ecrit || pn || d.calibreIdeal || null; if (calibre && calibre !== d.calibre) d = verdictDisjonction(app.norme, courbe, calibre, profil, contexte);
  const chutePropre = chuteDuDisjoncteur(app.norme, famille, calibre);
  return { ...d, profil, ecrit, pn, famille, courbe, chutePropre, voisins, contexte, origine: ecrit ? 'main' : pn ? 'pn' : calibre ? 'ideal' : '', fils: protectionDesFils(app.norme, calibre, profil, contexte.fils, hyp) }; }
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
  return { origine: d.ecrit || pnRetest != null ? 'main' : d.origine === 'pn' ? 'retest' : d.calibre ? 'auto' : '', pnRetest, calRetest: Fr ? Fr.calibre : null }; }

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
// le sort d'un point du profil : sa classe (ok, serre, ko — rien s'il n'est pas jugé) et son mot
const classeVerdict = p => !p || p.ok == null ? '' : p.ok === false ? 'ko' : p.serre ? 'serre' : 'ok';
const motVerdict = p => !p || p.ok == null ? 'pas jugé' : p.ok === false ? 'déclenche' : p.serre ? 'tient, mais touche la courbe' : 'tient';
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
    else if (d.calibreIdeal && d.calibre !== d.calibreIdeal) out.push({ niveau: 'att', texte: d.calibre > d.calibreIdeal ? `${amperes(d.calibre)}${pnMot} : un ${amperes(d.calibreIdeal)} suffirait`
      : !d.avecMarge ? `${amperes(d.calibre)}${pnMot} tient mais touche la courbe (${d.somme > d.marges.fraction ? motFraction(d.somme) + ' du temps de déclenchement consommé' : 'sans ' + nombre(d.marges.marge) + ' % de marge de courant'}) : l’idéal est un ${amperes(d.calibreIdeal)}`
      : `${amperes(d.calibre)}${pnMot} tient ; l’idéal est un ${amperes(d.calibreIdeal)} (sélectivité avec le voisin)` }); }
  d.voisins.forEach(v => { if (v.calibre > 0 && d.calibre > 0 && Math.max(v.calibre, d.calibre) < SELECTIVITE * Math.min(v.calibre, d.calibre) - 1e-9) out.push({ niveau: 'att', texte: `sélectivité avec ${v.nom} (${amperes(v.calibre)}) : l’amont devrait faire au moins le double de l’aval` }); });
  d.fils.forEach(f => { const nomF = (f.cable || 'fil sans numéro') + (f.type ? ' (' + f.type + ')' : '');
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
/* Le profil de charge, écrit au contrat sans perdre ce qui n'est pas lui (le calibre écrit) ; vide, il s'efface. */
function poserCharge(nom, c) { const vide = !(c.calibre > 0) && !['dem', 'trans', 'perm'].some(k => c[k] && c[k].i != null) && !(c.plus && c.plus.length);
  if (vide) app.contrat.charges.delete(nom); else app.contrat.charges.set(nom, c); }
/* RETENIR UN CALIBRE : là où l'outil le lit. Un disjoncteur dont le part number dit la famille change de part number
   (MS3320-10 → MS3320-15, sur chacune de ses liaisons, le retest gardé dans `avant`) ; sans famille, le calibre s'écrit
   au profil de charge. Une entrée d'historique : Ctrl+Z le défait. */
function retenirCalibre(nom, cal) { const d = disjonctionDe(nom), pn = pnDuRepere(nom), F = d.famille, nouveau = F && pn ? pnAvecCalibre(pn, F, cal) : null;
  if (!(cal > 0) || (nouveau ? nouveau === pn && !d.ecrit : d.ecrit === cal)) return false;
  histPush('calibre de ' + nom + ' : ' + amperes(cal)); const c = { ...(chargeDe(nom) || {}) };
  if (nouveau) { verite().forEach(l => [['de', 'pnDe'], ['vers', 'pnVers']].forEach(([b, ch]) => { if (l[b] === nom && l[ch]) poserChamp(l, ch, nouveau); })); c.calibre = null; }
  else c.calibre = cal;
  poserCharge(nom, c); apresEdition(); dire(nom + ' : ' + amperes(cal) + ' retenu' + (nouveau ? ' (' + nouveau + ')' : '') + '. Ctrl+Z le défait.'); return true; }
/* « ↺ » : rendre ce que portait le retest — le part number d'origine sur chaque liaison, et plus de calibre écrit ;
   le calibre redevient celui du part number, sinon le meilleur que l'outil trouve. */
function rendreCalibre(nom) { histPush('calibre de ' + nom + ' : retour');
  verite().forEach(l => [['de', 'pnDe'], ['vers', 'pnVers']].forEach(([b, ch]) => { if (l[b] === nom && l.avant && ch in l.avant) poserChamp(l, ch, l.avant[ch]); }));
  const c = chargeDe(nom); if (c && c.calibre != null) poserCharge(nom, { ...c, calibre: null });
  apresEdition(); const d = disjonctionDe(nom); dire(nom + ' : ' + (d.calibre ? amperes(d.calibre) : 'calibre') + ' rendu.'); }
/* CHANGER LES FILS que le meilleur calibre demande : chacun passe au câble proposé (la jauge qui le suit), le fichier gardé
   dans `avant` ; une seule entrée d'historique pour le lot. */
function filsDuMeilleur(d) { const fs = d.contexte.fils, memes = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  return (d.meilleur.filsAChanger || []).map(x => ({ x, f: fs.find(f => f.l && (f.cable || '') === x.cable && f.type === x.actuel && memes([f.l.de, f.l.vers].filter(r => r && !estMasse(r) && !estDisjoncteur(r)), x.bouts)) })); }
function changerFilsDuMeilleur(nom) { const d = disjonctionDe(nom), xs = filsDuMeilleur(d).filter(p => p.f && p.x.propose); if (!xs.length) return false;
  histPush(xs.length > 1 ? xs.length + ' fils de ' + nom + ' grossis' : 'un fil de ' + nom + ' grossi');
  xs.forEach(p => poserChamp(p.f.l, 'type', p.x.propose)); apresEdition();
  dire(xs.map(p => (p.x.cable || 'un fil') + ' en ' + p.x.propose).join(', ') + '. Ctrl+Z les rend.'); return true; }

/* ---- la section ----------------------------------------------------------------------- */
/* LA SECTION « DISJONCTEUR » (08-sections) : trois groupes, chacun dans un `.fi-dj[data-disj][data-part]` que
   `lierDisjonction` retrouve — le calibre (le part number, la gamme, le meilleur), la courbe, le profil. `probs` : les
   problèmes de la fiche (la pastille compte ceux qu'elle démontre). */
function sectionDisjoncteur(nom, d, o, probs) { d = d || disjonctionDe(nom); o = o || origineDuCalibre(nom, d);
  const part = (cle, titre, html, droite) => groupeSection(titre, html, { cls: `fi-dj dj-part dj-${cle}`, attrs: `data-disj="${escA(nom)}" data-part="${cle}"`, droite });
  const tete = part('calibre', '', ligneCalibre(nom, d, o));
  if (d.sansCourbe) return { cle: 'disjoncteur', vide: 'aucune courbe de disjonction dans la norme : rien ne se choisit', contenu: tete };
  const m = d.meilleur, cal = d.calibre, egal = !!m.calibre && m.calibre === cal;
  const courbe = part('courbe', 'Courbe de déclenchement', `<figure class="dj-graphe ilot-clair">${grapheSvg(d, DJ_VUE, largeurGrapheEstimee())}<div class="dj-tip" hidden></div></figure>`,
    `<span class="dj-bascules" role="group" aria-label="Ce que le graphique montre">${[['comparer', 'calibres voisins', 'Les bandes des calibres voisins, en gris : un clic en retient un'], ['temperatures', 'températures', 'Chaque courbe de la norme, du froid au chaud']]
      .map(([k, t, b]) => `<button type="button" class="dj-bascule" role="switch" data-vue="${k}" aria-checked="${!!DJ_VUE[k]}" title="${escA(b)}"><i aria-hidden="true"></i>${esc(t)}</button>`).join('')}</span>`);
  const profil = part('profil', 'Profil de charge', tableauProfil(d), `<button type="button" class="fi-lien dj-plus" id="dj-plus" title="Un état de plus : un courant, une durée">${ico('plus')}État</button>`);
  const pire = d.points.some(p => p.ok === false) ? 'ko' : d.points.some(p => p.serre) ? 'att' : '';
  const resume = !cal ? '<span class="fi-ko-t">aucun calibre ne tient</span>' : d.sansProfil ? `${esc(amperes(cal))} · profil à renseigner`
    : `${esc(amperes(cal))} retenu${egal ? ' · le meilleur' : m.calibre ? ` · <span class="fi-att-t">meilleur ${esc(amperes(m.calibre))}</span>` : ''}${pire === 'ko' ? ' · <span class="fi-ko-t">déclenche</span>' : ''}`;
  const badge = badgeProblemes(probs, 'disjoncteur') || (pire ? { t: pire === 'ko' ? '✕' : '!', etat: pire } : { t: '✓', etat: 'ok' });
  return { cle: 'disjoncteur', resume: insecable(resume), badge, contenu: tete + courbe + profil }; }
/* LE CALIBRE : le part number (tout le disjoncteur : ses bornes à vis n'ont qu'un part number), la gamme en segments, et
   la ligne du meilleur. */
function ligneCalibre(nom, d, o) { const pn = pnDuRepere(nom), m = d.meilleur || {}, cal = d.calibre, xs = liaisonsDuConnecteur(nom, '*'), pnMain = pnModifie(xs);
  const retour = `<button type="button" class="fs-auto" data-dj-geste="rendre" title="${escA('Rendre ce que portait le retest' + (o.pnRetest ? ' (' + o.pnRetest + ')' : '') + ' — Ctrl+Z le défait')}">↺ <span>${esc(o.pnRetest != null ? (o.pnRetest || 'rien') : d.pn > 0 ? amperes(d.pn) : m.calibre ? amperes(m.calibre) : '—')}</span></button>`;
  const lignePN = lignePn(nom, '*', '*', pn, { retour, sous: pn && !d.famille && !d.ecrit ? 'Famille de disjoncteur inconnue : le calibre ne s’y lit pas.' : '' });
  if (d.sansCourbe) return champs([lignePN]);
  const segs = d.gamme.map(g => { const cls = g.valide === true ? (g.marge ? ' ok' : ' serre') : g.valide === false ? ' ko' : '', mot = g.valide == null ? '' : g.valide ? (g.marge ? 'tient avec la marge' : 'tient, serré') : 'déclenche';
    return `<button type="button" class="dj-chip${cls}${g.calibre === m.calibre ? ' ideal' : ''}" data-cal="${g.calibre}" aria-pressed="${g.calibre === cal}" title="${escA(amperes(g.calibre) + (mot ? ' : ' + mot : '') + (g.calibre === m.calibre ? ' — le meilleur' : '') + (g.calibre === cal ? ' · retenu' : ' · cliquer pour le retenir'))}">${g.calibre === m.calibre ? `<i class="dj-etoile" aria-hidden="true">${ico('etoile')}</i>` : ''}${esc(nombre(g.calibre))}</button>`; }).join('');
  // un calibre écrit à la main sans famille (le profil le porte) : son ↺ à côté de la gamme
  const ecrit = d.ecrit && !pnMain ? `<span class="fc-o">${pastilleMain(null)}${retour}</span>` : '';
  const gamme = ligneChamp('Calibre', `<span class="dj-chips" role="group" aria-label="Retenir un calibre, en ampères">${segs}</span>${ecrit}`, { cls: 'dj-gamme' });
  return champs([lignePN, gamme]) + ligneMeilleur(nom, d); }
/* LE MEILLEUR, en une ligne, quand il y a quelque chose à faire : retenir un autre calibre, grossir des fils — le pourquoi
   au survol, « lesquels » replié. Sans profil : ce qui manque, et le chemin. */
function ligneMeilleur(nom, d) { const m = d.meilleur || {}, cal = m.calibre, retenu = d.calibre;
  if (d.sansProfil) return `<div class="dj-meilleur att"><span class="dj-m-mot">Sans profil de charge, le meilleur calibre attend le permanent.</span><span class="dj-m-actions"><button type="button" class="btn papier" data-dj-geste="voir-profil">Écrire le profil</button></span></div>`;
  if (!cal) return `<div class="dj-meilleur ko" data-bulle="${escA(majuscule(m.pourquoi || 'aucun calibre de la gamme ne tient ce profil') + '.')}"><span class="dj-m-mot">Aucun calibre de la gamme ne tient ce profil.</span></div>`;
  const aChanger = filsDuMeilleur(d), proposes = aChanger.filter(p => p.x.propose), egal = retenu === cal; if (egal && !aChanger.length) return '';
  const etat = !egal && d.valide === false ? 'ko' : 'att';
  const mot = `${ico('etoile', 'dj-m-etoile')}<span>${egal ? `<b>${esc(amperes(cal))}</b>, le meilleur` : `Meilleur <b>${esc(amperes(cal))}</b>`}${aChanger.length ? ` · ${pluriel2(aChanger.length, 'fil')} à grossir` : ''}</span>`;
  const actions = (!egal ? `<button type="button" class="btn cuivre" id="dj-retenir" data-dj-geste="retenir" data-cal="${cal}" title="${escA('Le calibre retenu devient ' + amperes(cal) + (m.pn ? ' et le part number ' + m.pn + ' (une désignation construite : à vérifier au catalogue)' : '') + ' — Ctrl+Z le défait')}">Retenir ${esc(amperes(cal))}</button>` : '')
    + (proposes.length ? `<button type="button" class="btn papier" id="dj-fils-changer" data-dj-geste="fils" title="Chaque fil passe au câble proposé — une seule entrée d’historique, Ctrl+Z les rend">Changer les fils</button>` : '');
  const lesquels = aChanger.length ? `<details class="dj-lesquels"><summary>Lesquels${ico('bas', 'fs-chevron')}</summary><ul class="fi-liste dj-changer">${aChanger.map(({ x, f }) => { const k = f && f.l ? cleFil(f.l) : '', dm = x.masseProposee != null && x.masseActuelle != null ? x.masseProposee - x.masseActuelle : null;
      const ct = (m.contactsTouches || []).find(c => c.cable === x.cable && JSON.stringify(c.bouts) === JSON.stringify(x.bouts));
      return `<li class="fi-fil"${k ? ` data-i="${k}" tabindex="0" role="button"` : ''} data-bulle="${escA(majuscule(x.propose ? x.raison : x.aucune || x.raison) + (ct ? '\n' + majuscule(ct.raison) : ''))}"><span class="fi-w dj-w">${esc(x.cable || 'fil')}</span><span class="dj-de-a"><span class="id">${esc(x.actuel)}</span>${ico('fleche')}<b class="id">${esc(x.propose || '—')}</b></span>`
        + `<span class="dj-masse">${dm != null ? esc((dm >= 0 ? '+' : '−') + nombre(Math.round(Math.abs(dm) * 10) / 10) + ' g/m') : ''}${ct ? ` · contact ${esc(ct.actuel)} → ${esc(ct.propose)}` : ''}</span></li>`; }).join('')}</ul></details>` : '';
  return `<div class="dj-meilleur ${etat}"><span class="dj-m-mot" data-bulle="${escA(phraseMeilleur(d))}">${mot}</span>${actions ? `<span class="dj-m-actions">${actions}</span>` : ''}${lesquels}</div>`; }
/* Le pourquoi du meilleur, en une phrase d'homme : la bulle de sa ligne. */
function phraseMeilleur(d) { const m = d.meilleur, cal = m.calibre, fam = m.famille ? m.famille : 'calibre de la gamme', T = nombre(m.marge.temperature);
  const perm = m.marge.permanent, courts = d.points.some(p => p.t !== Infinity && p.i > 0);
  const tes = [perm > 0 ? (perm < 2 ? `ton ${amperes(perm)} permanent` : `tes ${amperes(perm)} permanents`) : '', courts ? 'tes pointes' : ''].filter(Boolean).join(' et ');
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
   pastille du sort de chaque point sur la courbe, le courant, la durée, × pour un état ajouté. Rien dessous. */
function tableauProfil(d) { const E = etatsDuProfil(d.profil), parI = new Map(d.points.map(p => [p.i, p])), k = x => E.find(e => e.k === x);
  const ordre = [k('dem'), k('trans'), k('perm'), ...E.filter(e => /^plus/.test(e.k))].filter(Boolean);
  const val = (e, q) => e[q] != null && isFinite(e[q]) ? nombre(e[q]) : '';
  const ligne = e => { const plus = /^plus/.test(e.k), p = e.i > 0 ? parI.get(e.i) : null, c = classeVerdict(p);
    return `<div class="dj-etat${e.k === 'perm' ? ' perm' : ''}" data-k="${e.k}" role="row"><i class="dj-verdict${c ? ' ' + c : ''}" title="${escA(majuscule(motVerdict(p)))}"></i>`
      + (plus ? `<input class="dj-nom" data-dj="${e.k}" data-q="nom" value="${escA(e.nom)}" aria-label="Nom de l’état" spellcheck="false" autocomplete="off">` : `<span class="dj-nom">${esc(majuscule(e.nom))}</span>`)
      + `<label class="dj-champ"><input data-dj="${e.k}" data-q="i" value="${escA(val(e, 'i'))}" inputmode="decimal" placeholder="—" autocomplete="off" aria-label="${escA(e.nom + ' : courant en ampères')}"><i>A</i></label>`
      + (e.k === 'perm' ? `<span class="dj-inf" title="Pour toujours">${ico('infini')}</span>` : `<label class="dj-champ"><input data-dj="${e.k}" data-q="t" value="${escA(val(e, 't'))}" inputmode="decimal" placeholder="—" autocomplete="off" aria-label="${escA(e.nom + ' : durée en secondes')}"><i>s</i></label>`)
      + (plus ? `<button type="button" class="dj-x" data-x="${e.k}" aria-label="Retirer cet état" title="Retirer cet état">×</button>` : '<span></span>') + '</div>'; };
  return `<div class="dj-etats" role="table" aria-label="Profil de charge"><div class="dj-entete" role="row"><span></span><span>État</span><span>Courant</span><span>Durée</span><span></span></div>${ordre.map(ligne).join('')}</div>`; }

/* ---- ses fils, pour la section commune « Fils » (08-fiche, `listeFils`) ---------------- */
/* La chute en ligne depuis le disjoncteur, chemin par chemin : au courant permanent du profil (sinon le calibre, sinon
   l'hypothèse), à travers les prises de coupure et les barrettes, la part du disjoncteur comprise. */
function chutesDe(nom, d) { const H = app.simu || HYPOTHESES, perm = d.profil && d.profil.perm && nombreLu(d.profil.perm.i) > 0 ? nombreLu(d.profil.perm.i) : null, I = perm || (d.calibre > 0 ? d.calibre : H.courant);
  const courts = (d.points || []).filter(p => p.t !== Infinity && p.i > 0);
  const cs = chutesDepuis(app.norme, verite(), nom, I, H, courts, { famille: d.famille, calibre: d.calibre });
  return { H, I, perm, cs: cs.slice().sort((a, b) => (b.dU || 0) - (a.dU || 0)) }; }
/* Une ligne par fil qu'il nourrit : l'intensité au pire (le courant d'une phase contre ce que le fil admet pour cette
   durée), la chute en ligne du chemin le plus long qui passe par lui, et la bulle : ce qui ne va pas, d'où viennent les
   chiffres. */
function lignesFilsDisjoncteur(nom, d) { d = d || disjonctionDe(nom); const cal = d.calibre, { cs } = chutesDe(nom, d), parFil = new Map(), mV = u => nombre(Math.round(u * 1000) / 1000) + ' V';
  cs.forEach(c => c.segments.forEach(s => { if (!s.fil) return; const x = parFil.get(s.fil); if (!x || (c.dU || 0) > (x.dU || 0)) parFil.set(s.fil, c); }));
  return d.fils.map(f => { const j = jugementDuFil(f, cal), c = f.l ? parFil.get(f.l) : null, pointe = c && (c.pointes || []).filter(p => p.trop).sort((a, b) => b.dU / b.admis - a.dU / a.admis)[0];
    const etatU = c ? (c.trop || (pointe && c.reel) ? (c.reel ? 'ko' : 'att') : pointe ? 'att' : 'ok') : '';
    const etat = j.etat === 'ko' || etatU === 'ko' ? 'ko' : j.etat === 'att' || etatU === 'att' ? 'att' : '';
    const bulle = [`${f.cable || 'fil sans numéro'}${f.type ? ' · ' + f.type : ''} · ${f.amont ? '← ' : '→ '}${f.autre}${f.via ? ' (par ' + f.via + ')' : ''}`, j.dit ? majuscule(j.dit) : '',
      j.charge ? `au pire ${amperes(j.charge.i)} sur ${amperes1(j.charge.admise)} admis ${j.charge.quand}` : '',
      c && c.dU != null ? `chute en ligne vers ${c.bout[0]}${c.bout[1] ? ':' + c.bout[1] : ''} : ${volts(c.dU)}${c.pct != null ? ' (' + nombre(Math.round(c.pct * 10) / 10) + ' %)' : ''}${c.admis != null ? ', ' + volts(c.admis) + ' admis' : ''}${c.reel ? '' : ' — longueurs d’hypothèse'}${c.disjoncteur && c.disjoncteur.dU != null ? ', dont ' + mV(c.disjoncteur.dU) + ' dans le disjoncteur' : ''}` : '',
      pointe ? `en pointe : ${volts(pointe.dU)} > ${volts(pointe.admis)} admis${pointe.intermittent ? ' en intermittent' : ''}` : ''].filter(Boolean).join('\n');
    return { l: f.l, k: f.l ? cleFil(f.l) : '', num: f.cable || '—', puce: puceFil(f), jauge: jaugeDuType(f.type), type: f.type,
      charge: j.charge ? { r: j.charge.r, mot: `${nombreA(j.charge.i)} / ${nombreA(j.charge.admise)} A`, etat: j.etat } : { r: 0, mot: '—', etat: '' },
      chute: { mot: c && c.dU != null ? volts(c.dU) : '—', etat: etatU }, etat, bulle }; }); }
/* Le jugement d'un fil, en mots : son état (ko : la charge le dépasse ou dépasse son contact ; att : pas protégé, sous le
   calibre, hors de la table 11-3, contact sous le calibre ; ok), la charge au pire (le courant d'une phase contre ce qu'il
   admet pour cette durée) et ce qui ne va pas, en une ligne. */
function jugementDuFil(f, cal) { const r = [];
  if (f.verdict === 'inconnu') return { etat: 'att', charge: null, dit: f.refuse ? 'conducteur ' + f.conducteur + ' : pas de résistance dans la base' : 'fil inconnu de la norme' };
  const ph = (f.phases || []).slice().sort((a, b) => b.i / b.admise - a.i / a.admise)[0];
  const charge = ph ? { i: ph.i, admise: ph.admise, r: ph.i / ph.admise, quand: ph.t === Infinity ? 'en permanence' : 'pendant ' + secondes(ph.t) } : null;
  if (f.verdict === 'fil') r.push(`trop fin pour ${f.pire.nom}`);
  if (f.contactDepasse) r.push(`son contact ${f.contact.taille} ne porte que ${amperes(f.contact.intensite)}`);
  if (f.verdict === 'calibre') r.push(`admet ${amperes1(f.continu)} en continu, moins que le ${amperes(cal)} : pas protégé en surcharge`);
  else if (f.protege === false && f.pireLaisse && f.verdict !== 'fil') { const x = f.pireLaisse; r.push(`pas protégé : le ${amperes(cal)} laisse passer ${amperes1(x.courant)} ${pourPalier(x.palier)}, ${f.jugeSur === 'dommage' ? 'il s’abîme au-delà de' : 'il n’admet que'} ${amperes1(x.admise)}`); }
  if (f.horsTable) r.push(`la table 11-3 le limite à un ${amperes(f.calibreMax)}`);
  if (f.contactSurcharge && !f.contactDepasse) r.push(`contact ${f.contact.taille} : ${amperes(f.contact.intensite)}, sous le calibre`);
  const etat = f.verdict === 'fil' || f.contactDepasse ? 'ko' : r.length ? 'att' : 'ok';
  return { etat, charge, dit: r.join(' · ') }; }


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
  const lire = () => { const c = { ...(chargeDe(nom) || {}), plus: [] }; delete c.dem; delete c.trans; delete c.perm;
    const num = (k, q) => { const el = Q(`[data-dj="${k}"][data-q="${q}"]`); const x = el ? nombreLu(el.value) : null; return x != null && x >= 0 ? x : null; };
    ['dem', 'trans', 'perm'].forEach(k => { c[k] = { i: num(k, 'i'), t: k === 'perm' ? null : num(k, 't') }; });
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
  const retenir = geste(cal => retenirCalibre(nom, cal)), rendre = geste(() => rendreCalibre(nom)), changerFils = geste(() => changerFilsDuMeilleur(nom));
  const relier = () => { const d = E.d;
    QA('.dj-chip').forEach(b => { b.onclick = () => { if (b.getAttribute('aria-pressed') !== 'true') retenir(+b.dataset.cal); }; });
    QA('[data-dj-geste="retenir"]').forEach(b => { b.onclick = () => retenir(+b.dataset.cal); });
    QA('[data-dj-geste="fils"]').forEach(b => { b.onclick = () => changerFils(); });
    QA('[data-dj-geste="rendre"]').forEach(b => { b.onclick = e => { e.stopPropagation(); rendre(); }; });
    QA('[data-dj-geste="voir-profil"]').forEach(b => { b.onclick = () => { const p = Q('[data-part="profil"]'), det = p && p.closest('details.fs'); if (det) { det.open = true; try { det.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (_) { det.scrollIntoView(); } const i = det.querySelector('[data-dj="perm"][data-q="i"]'); if (i) setTimeout(() => i.focus(), 250); } }; });
    QA('[data-hyp]').forEach(b => { b.onclick = e => { e.stopPropagation(); ficheHypotheses(); }; });
    QA('.dj-etats input').forEach(el => { el.onchange = () => ecrire('profil de charge de ' + nom, lire()); });
    const plus = Q('#dj-plus'); if (plus) plus.onclick = () => { const c = lire(); c.plus.push({ nom: 'État ' + (c.plus.length + 3), i: null, t: null }); ecrire('un état de plus sur ' + nom, c); };
    QA('.dj-x').forEach(b => { b.onclick = () => { const c = lire(), j = +b.dataset.x.slice(4); c.plus.splice(j, 1); ecrire('un état de moins sur ' + nom, c); }; });
    QA('.dj-bascule').forEach(b => { b.onclick = () => { const k = b.dataset.vue; DJ_VUE[k] = !DJ_VUE[k]; retenirVue(); b.setAttribute('aria-checked', String(DJ_VUE[k])); redessinerGraphe(); }; });
    lierGraphe(); };
  // le graphique : dessiné à la largeur où il se pose ; redessiné quand elle change
  const redessinerGraphe = () => { const fig = Q('.dj-graphe'); if (!fig || !E.d.courbes.length) return; const w = Math.round(fig.clientWidth);
    const svg = fig.querySelector('svg'); if (svg) svg.outerHTML = grapheSvg(E.d, DJ_VUE, w); lierGraphe(); };
  const lierGraphe = () => { const fig = Q('.dj-graphe'); if (!fig) return; const svg = fig.querySelector('svg'), w = Math.round(fig.clientWidth);
    if (svg && w > 200 && Math.abs(w - +svg.dataset.w) > 1) { svg.outerHTML = grapheSvg(E.d, DJ_VUE, w); }
    lierGraphique(fig, nom, E, lire, ecrire, retenir);
    if (DJ_OBS) DJ_OBS.disconnect(); if (typeof ResizeObserver === 'function') { let large = w; DJ_OBS = new ResizeObserver(() => { const ww = Math.round(fig.clientWidth); if (!fig.isConnected) { DJ_OBS.disconnect(); return; } if (ww > 200 && Math.abs(ww - large) > 1) { large = ww; redessinerGraphe(); } }); DJ_OBS.observe(fig); } };
  relier(); }
