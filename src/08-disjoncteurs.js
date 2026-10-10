/* ===========================================================================
   08 quinquies — LE DISJONCTEUR : ce que sa fiche porte en propre
   ---------------------------------------------------------------------------
   Le lecteur : « quand je regarde le graphique du disjoncteur, ça fait
   enfant ; moi je veux savoir le meilleur calibre. Les courbes ne sont pas
   droites, pas smooth. Il y a beaucoup trop de légendes, tellement de
   tableaux. Ajouter ou enlever des états, ça c'est très bien. Tout est
   calculé automatiquement, mais tout doit pouvoir être modifié, et refaire un
   calcul automatique si on s'est trompé. » Dans le squelette commun des
   fiches (08-sections), le disjoncteur a six sections à lui :
     · LE MEILLEUR CALIBRE, d'abord, en un coup d'œil : le calibre en grand,
       son part number, une phrase d'homme (pourquoi lui, pourquoi pas celui
       d'en dessous), l'écart avec ce que le plan porte, et deux gestes —
       « Retenir 15 A » (le part number du disjoncteur suit ; une entrée
       d'historique) et « Changer les N fils » (chaque fil passe à la jauge
       proposée ; une entrée pour le lot), avec « lesquels et pourquoi » ;
       dessous, la gamme en segments pour retenir un autre calibre à la main,
       et « ↺ » qui rend ce que portait le retest ;
     · LA COURBE, sur papier blanc : UNE bande — de la courbe la plus rapide
       (le chaud du tableau) à la plus lente (le froid) — du calibre retenu,
       LISSE (une interpolation cubique monotone en log-log entre les points
       de la norme) ; les états du profil en points nommés à côté d'eux ; la
       limite de dommage du fil le plus faible en pointillé ; chaque trait
       nommé à son bout, aucune légende à part. Deux interrupteurs : comparer
       les calibres voisins (un clic en retient un), toutes les températures.
       Survoler un point dit son sort ; le glisser change son état ;
     · LE PROFIL DE CHARGE : une ligne par état, le permanent en tête, chacun
       sa pastille ; ajouter, enlever ;
     · SES FILS : une ligne chacun, l'intensité contre ce qu'il admet, en barre ;
     · LA CHUTE en ligne vers chaque bout, la pire en tête ;
     · LE DÉTAIL DU CALCUL, fermé d'office : la gamme, les marges, les fils
       palier par palier, les sources — les tableaux ne vivent que là.
   Le moteur (09 bis, 09 quater) juge ; ici on lit, on montre, on écrit au
   contrat. On ne lisse que le DESSIN : le jugement reste celui du moteur.
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
/* Le contact d'un fil par les plans de ses deux bouts (barrette, prise, cavité d'un connecteur) : la taille la plus faible
   en courant — le courant du contact posé, borné par la jauge du fil serti dedans quand le moteur sait le dire
   (`intensiteDuContactPose`), sinon celui de la taille —, et le repère qui la porte. Rien quand aucun plan ne le connaît. */
/* Ce qu'un fil supporte, en mots : la limite de DOMMAGE (R2 : un fil cuivre est protégé tant que ce que le disjoncteur
   laisse passer reste sous ce qu'il supporte avant de s'abîmer), sinon — aluminium, CCA, sans courbe — son intensité de
   service, plus sévère. `x` : la case de `laisse` qui juge. */
const limiteDuFil = (f, x) => f.jugeSur === 'dommage' ? `il s’abîme au-delà de ${amperes(x.admise)}` : `le fil admet ${amperes(x.admise)} en service`;
const courantDuContactPose = x => typeof intensiteDuContactPose === 'function' ? intensiteDuContactPose(app.norme, x) : intensiteDeContact(app.norme, x.taille);
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
   filsInconnus, selectif, serre, reserve } — ce que la fiche du disjoncteur lit pour dire « le meilleur ». */
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
const etatDe = c => c === 'serre' ? 'att' : c;   // la classe d'un verdict dans les mots des pastilles (08-sections)
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
/* CE QUI ALIMENTE un fil : le disjoncteur en amont (le premier dont un chemin passe par ce fil), son courant permanent
   et son courant de pointe — ce qu'il faut pour juger la charge et la chute du fil. */
function alimentationDe(l) { if (!l) return null; const V = verite();
  for (const cb of reperesDe(V).filter(estDisjoncteur)) { if (!cheminsDepuis(V, cb).some(ch => ch.segments.some(s => s.fil === l))) continue;
    const d = disjonctionDe(cb), pts = d.points.length ? d.points : pointsDuProfil(d.profil), perm = pts.find(p => p.t === Infinity), pointe = pts[0];
    return { nom: cb, calibre: d.calibre, perm: perm ? perm.i : null, pointe: pointe && pointe.t !== Infinity ? pointe : null, points: pts }; }
  return null; }

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

/* ---- les sections ------------------------------------------------------------------- */
/* LES SECTIONS DU DISJONCTEUR, pour la fiche à sections (08-sections.js) : le meilleur calibre, la courbe, le profil de
   charge, ses fils et leur intensité, la chute, le détail du calcul. La fiche commune y ajoute l'identité, le
   connecteur, les contacts, l'habillage, « déjà fait » et les problèmes. Rend une liste { cle, titre?, resume?, badge?,
   contenu, vide? } ; chaque contenu est enveloppé d'un `.fi-dj[data-disj][data-part]` : `lierDisjonction` le retrouve
   où que la fiche le pose. `vt` : borne → barrette à poser sur cette borne (ses fils l'étiquettent). */
function sectionsDisjoncteur(nom, vt) { const d = disjonctionDe(nom), o = origineDuCalibre(nom, d), vtm = vt || barrettesAPoserSur(nom);
  const part = (cle, html) => `<div class="fi-dj dj-part dj-${cle}" data-disj="${escA(nom)}" data-part="${cle}">${html || ''}</div>`;
  return [djSectionCalibre(nom, d, o), djSectionCourbe(nom, d), djSectionProfil(nom, d), djSectionFils(nom, d, vtm), djSectionChute(nom, d), djSectionDetail(nom, d, o)]
    .map(s => ({ ...s, contenu: part(s.cle, s.contenu) })); }
/* La pastille d'une section qui compte des problèmes (ses fils, la chute) : « ✓ » quand tout va ; sinon, c'est la fiche qui
   la pose, du compte des problèmes qu'elle range dans la section (une seule source pour l'en-tête et les sections) — le
   compte d'ici ne sert qu'à l'enveloppe seule (`secours`). */
const pastille = (n, etat) => n ? { secours: { t: n, etat } } : { badge: { t: '✓', etat: 'ok' } };
/* L'enveloppe d'hier, gardée : les sections du disjoncteur, rendues seules dans l'ordre commun. */
function ficheDisjonction(nom, vt) { return `<div class="dj-fiche">${ficheSections('disjoncteur', sectionsDisjoncteur(nom, vt).map(s => s.badge || !s.secours ? s : { ...s, badge: s.secours }))}</div>`; }
// les barrettes à poser sur ses bornes (un dédoublement), pour étiqueter ses fils comme la fiche d'un équipement
function barrettesAPoserSur(nom) { const m = new Map(); try { liaisonsDuPlan().forEach(l => { if (l.origine === null && l.de === nom && l.vers === l.aPoser && l.borneVers === '1') m.set(String(l.borneDe), l.aPoser); }); } catch (_) { } return m; }

/* 1. LE MEILLEUR CALIBRE : la carte, puis la gamme et ce qui est retenu. */
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
function djSectionCalibre(nom, d, o) {
  if (d.sansCourbe) return { cle: 'calibre', vide: 'aucune courbe de disjonction dans la norme : rien ne se choisit' };
  const m = d.meilleur, cal = m.calibre, retenu = d.calibre, pnLu = pnDuRepere(nom);
  const gamme = gammeHtml(nom, d, o);
  if (d.sansProfil) return { cle: 'calibre', resume: insecable(esc((retenu ? amperes(retenu) + ' retenu · ' : '') + 'le profil de charge est à renseigner')), badge: { t: '—', etat: 'att' },
    contenu: `<div class="dj-meilleur att"><p class="dj-m-phrase">Renseigne le profil de charge (le permanent au moins) : l’outil trouvera le meilleur calibre.</p><button type="button" class="fi-lien" data-dj-geste="voir-profil">Le profil de charge${ico('bas')}</button></div>${gamme}` };
  if (!cal) return { cle: 'calibre', resume: insecable(esc('aucun calibre ' + (m.famille || 'de la gamme') + ' ne tient ce profil')), badge: { t: '✕', etat: 'ko' },
    contenu: `<div class="dj-meilleur ko"><p class="dj-m-phrase">${insecable(esc(majuscule(m.pourquoi) + '.'))}</p></div>${gamme}` };
  const aChanger = filsDuMeilleur(d), proposes = aChanger.filter(p => p.x.propose), sans = aChanger.filter(p => !p.x.propose), egal = retenu === cal;
  const etat = !d.valide && retenu ? 'ko' : !egal || m.reserve ? 'att' : 'ok';
  const tete = `<div class="dj-m-tete"><span class="dj-m-cal">${esc(nombre(cal))}<small>A</small></span><span class="dj-m-id">${m.pn ? `<b class="id">${esc(m.pn)}</b>` : ''}<span>${esc(m.famille ? 'famille ' + m.famille : 'la gamme du lecteur')}</span></span>`
    + (egal ? `<span class="dj-m-retenu">${ico('etoile')}retenu</span>` : `<span class="dj-m-meilleur">${ico('etoile')}le meilleur</span>`) + '</div>';
  const ecart = egal || !retenu ? '' : o.origine === 'retest' ? `Le plan porte ${amperes(retenu)}${pnLu ? ' (' + pnLu + ', du retest)' : ''}${retenu > cal ? ' : un plus petit protège mieux les fils' : ''}.`
    : o.origine === 'main' ? `Tu as retenu ${amperes(retenu)} à la main${retenu > cal ? ' : un plus petit protège mieux les fils' : retenu < cal ? ' : il est trop juste' : ''}.` : '';
  const notes = [m.reserve === 'fils' ? [`Mais ${proposes.length + sans.length > 1 ? (proposes.length + sans.length) + ' fils sont trop fins' : 'un fil est trop fin'} pour un ${amperes(cal)} : ${proposes.length ? 'à grossir avec lui' : 'aucune jauge de leur famille ne le suit'}.`, 'att'] : null,
    m.reserve === 'selectivite' ? ['Pas à 2:1 avec le disjoncteur voisin : aucun calibre qui tient ne l’est.', 'att'] : null,
    m.reserve === 'serre' ? ['Aucun calibre ne tient avec la marge : celui-ci tient, serré.', 'att'] : null,
    !d.fils.length ? ['Aucun fil connu sous ce disjoncteur : leur protection n’est pas jugée.', ''] : null,
    m.filsInconnus.length ? [`${m.filsInconnus.length > 1 ? m.filsInconnus.length + ' fils inconnus' : 'Un fil inconnu'} de la norme (${m.filsInconnus.join(', ')}) : ${m.filsInconnus.length > 1 ? 'leur' : 'sa'} protection n’est pas jugée.`, 'att'] : null].filter(Boolean);
  const actions = (!egal ? `<button type="button" class="btn cuivre" id="dj-retenir" data-dj-geste="retenir" data-cal="${cal}" title="${escA('Le calibre retenu devient ' + amperes(cal) + (m.pn && pnLu ? ' et le part number ' + m.pn + ' (une désignation construite : à vérifier au catalogue)' : '') + ' — Ctrl+Z le défait')}">Retenir ${esc(amperes(cal))}</button>` : '')
    + (proposes.length ? `<button type="button" class="btn papier" id="dj-fils-changer" data-dj-geste="fils" title="Chaque fil passe au câble proposé — une seule entrée d’historique, Ctrl+Z les rend">Changer ${proposes.length > 1 ? 'les ' + proposes.length + ' fils' : 'le fil'}</button>` : '');
  const lesquels = aChanger.length ? `<details class="dj-lesquels"><summary>lesquels et pourquoi${ico('bas', 'fs-chevron')}</summary><ul class="fi-liste dj-changer">${aChanger.map(({ x, f }) => { const k = f && f.l ? cleFil(f.l) : '', dm = x.masseProposee != null && x.masseActuelle != null ? x.masseProposee - x.masseActuelle : null;
      const ct = (m.contactsTouches || []).find(c => c.cable === x.cable && JSON.stringify(c.bouts) === JSON.stringify(x.bouts)), raison = x.propose ? x.raison.split(' ; ')[0] : x.aucune;
      return `<li class="fi-fil"${k ? ` data-i="${k}" tabindex="0" role="button"` : ''} title="${escA(majuscule(x.raison) + (ct ? ' — ' + ct.raison : '') + ' — voir sur le plan')}"><span class="fi-w dj-w">${esc(x.cable || 'fil')}</span><span class="dj-de-a"><span class="id">${esc(x.actuel)}</span>${ico('fleche')}<b class="id">${esc(x.propose || '—')}</b></span>`
        + `<span class="dj-masse">${dm != null ? esc((dm >= 0 ? '+' : '−') + nombre(Math.round(Math.abs(dm) * 10) / 10) + ' g/m') : ''}</span><span class="dj-raison">${insecable(esc(raison))}${ct ? ` · contact ${esc(ct.actuel)} → ${esc(ct.propose)}` : ''}</span></li>`; }).join('')}</ul></details>` : '';
  const carte = `<div class="dj-meilleur ${etat}">${tete}<p class="dj-m-phrase" title="${escA(majuscule(m.pourquoi))}">${insecable(esc(phraseMeilleur(d)))}</p>`
    + (ecart ? `<p class="dj-m-ecart">${insecable(esc(ecart))}</p>` : '') + notes.map(([t, c]) => `<p class="dj-m-note${c ? ' ' + c : ''}">${insecable(esc(t))}</p>`).join('')
    + (actions ? `<div class="dj-m-actions">${actions}</div>` : '') + lesquels + '</div>';
  const resume = (egal ? amperes(cal) + ' · retenu' : amperes(cal) + (retenu ? ' au lieu de ' + amperes(retenu) : '')) + (proposes.length ? ' · ' + pluriel2(proposes.length, 'fil') + ' à grossir' : '');
  return { cle: 'calibre', resume: insecable(esc(resume)), badge: { t: ico('etoile', 'dj-badge-etoile'), etat }, contenu: carte + gamme }; }
/* La gamme : les calibres du catalogue en segments, chacun jugé (un trait sous le chiffre : vert tient avec la marge, ambre
   serré, rouge déclenche), le retenu à l'encre, le meilleur étoilé ; un clic en retient un autre. Dessous, ce qui est
   retenu, d'où il vient, et « ↺ » quand on l'a forcé. */
function gammeHtml(nom, d, o) { const cal = d.calibre, m = d.meilleur, pn = pnDuRepere(nom);
  const mot = g => g.valide == null ? '' : g.valide ? (g.marge ? 'tient avec la marge' : 'tient, serré') : 'déclenche';
  const segs = d.gamme.map(g => { const cls = g.valide === true ? (g.marge ? ' ok' : ' serre') : g.valide === false ? ' ko' : '';
    return `<button type="button" class="dj-chip${cls}${g.calibre === m.calibre ? ' ideal' : ''}" data-cal="${g.calibre}" aria-pressed="${g.calibre === cal}" title="${escA(amperes(g.calibre) + (mot(g) ? ' : ' + mot(g) : '') + (g.calibre === m.calibre ? ' — le meilleur' : '') + (g.calibre === cal ? ' · retenu' : ' · cliquer pour le retenir'))}">${g.calibre === m.calibre ? `<i class="dj-etoile" aria-hidden="true">${ico('etoile')}</i>` : ''}${esc(nombre(g.calibre))}</button>`; }).join('');
  // « ↺ » nomme ce qu'il rend : le retest (son part number, son calibre) quand le fichier en portait un, sinon le calcul de l'outil
  const versRetest = o.pnRetest != null || d.pn > 0, valRetour = o.pnRetest != null ? (o.calRetest ? amperes(o.calRetest) : o.pnRetest || '—') : d.pn > 0 ? amperes(d.pn) : m.calibre ? amperes(m.calibre) : '—';
  const retour = o.origine !== 'main' ? '' : `<button type="button" class="fs-auto" data-dj-geste="rendre" title="${escA(versRetest ? 'Rendre ce que portait le retest' + (o.pnRetest ? ' (' + o.pnRetest + ')' : '') + ' — Ctrl+Z le défait' : 'Rendre le calibre que l’outil calcule — Ctrl+Z le défait')}">↺ ${versRetest ? 'retest' : 'automatique'} <span>(${esc(valRetour)})</span></button>`;
  return `<div class="dj-gamme"><div class="dj-chips" role="group" aria-label="Retenir un calibre, en ampères">${segs}</div>`
    + `<div class="dj-retenu"><span>retenu <b>${cal ? esc(amperes(cal)) : '—'}</b>${pn ? ` · <span class="id">${esc(pn)}</span>` : ''}${o.origine ? origine(o.origine, o.origine === 'retest' ? 'le part number du retest' : o.origine === 'main' ? 'choisi ici' : 'le meilleur, trouvé par l’outil') : ''}</span>${retour}</div></div>`; }

/* 2. LA COURBE : le graphique, ses deux interrupteurs. */
function djSectionCourbe(nom, d) { if (d.sansCourbe) return { cle: 'courbe', vide: 'aucune courbe de disjonction dans la norme' };
  const cal = d.calibre, gros = d.points.filter(p => p.t !== Infinity && p.i > 0).sort((a, b) => (b.marges[0] ? b.marges[0].fraction : 0) - (a.marges[0] ? a.marges[0].fraction : 0))[0];
  const p = d.pire, sort = !cal ? ['aucun calibre retenu', ''] : d.sansProfil ? [amperes(cal) + ' · le profil de charge est à renseigner', 'att']
    : !d.valide ? [amperes(cal) + ' · ' + (p && p.t === Infinity ? 'le permanent le fait déclencher' : (p ? p.nom : 'une pointe') + ' le fait déclencher'), 'ko']
    : d.serre ? [amperes(cal) + ' · ' + (d.points.find(x => x.serre) || gros || { nom: 'le profil' }).nom + ' touche la courbe', 'att'] : [amperes(cal) + ' · le profil reste à gauche de la courbe', 'ok'];
  return { cle: 'courbe', resume: insecable(esc(sort[0])), badge: { t: sort[1] === 'ok' ? '✓' : sort[1] === 'ko' ? '✕' : sort[1] === 'att' ? '!' : '—', etat: sort[1] },
    contenu: `<figure class="dj-graphe ilot-clair">${grapheSvg(d, DJ_VUE, largeurGrapheEstimee())}<div class="dj-tip" hidden></div></figure>`
      + `<div class="dj-bascules" role="group" aria-label="Ce que le graphique montre">${[['comparer', 'comparer les calibres', 'Les bandes des calibres voisins, en gris : un clic en retient un'], ['temperatures', 'toutes les températures', 'Chaque courbe de la norme, du froid au chaud']]
        .map(([k, t, b]) => `<button type="button" class="dj-bascule" role="switch" data-vue="${k}" aria-checked="${!!DJ_VUE[k]}" title="${escA(b)}"><i aria-hidden="true"></i>${esc(t)}</button>`).join('')}</div>` }; }

/* 3. LE PROFIL DE CHARGE : une ligne par état, le permanent en tête — la pastille (le sort de son point sur la courbe), le
   nom (écrit pour ceux qu'on ajoute), le courant, la durée (le permanent : toujours), la croix. */
function djSectionProfil(nom, d) { const E = etatsDuProfil(d.profil), parI = new Map(d.points.map(p => [p.i, p])), ordre = [E.find(e => e.k === 'perm'), ...E.filter(e => e.k !== 'perm')];
  const val = (e, q) => e[q] != null && isFinite(e[q]) ? nombre(e[q]) : '';
  const ligne = e => { const plus = /^plus/.test(e.k), p = e.i > 0 ? parI.get(e.i) : null, c = classeVerdict(p);
    return `<div class="dj-etat${e.k === 'perm' ? ' perm' : ''}" data-k="${e.k}" role="row"><i class="dj-verdict${c ? ' ' + c : ''}" title="${escA(majuscule(motVerdict(p)))}"></i>`
      + (plus ? `<input class="dj-nom" data-dj="${e.k}" data-q="nom" value="${escA(e.nom)}" aria-label="Nom de l’état" spellcheck="false" autocomplete="off">` : `<span class="dj-nom">${esc(majuscule(e.nom))}</span>`)
      + `<label class="dj-champ"><input data-dj="${e.k}" data-q="i" value="${escA(val(e, 'i'))}" inputmode="decimal" placeholder="—" autocomplete="off" aria-label="${escA(e.nom + ' : courant en ampères')}"><i>A</i></label>`
      + (e.k === 'perm' ? `<span class="dj-inf" title="Pour toujours">${ico('infini')}<span>toujours</span></span>` : `<label class="dj-champ"><input data-dj="${e.k}" data-q="t" value="${escA(val(e, 't'))}" inputmode="decimal" placeholder="—" autocomplete="off" aria-label="${escA(e.nom + ' : durée en secondes')}"><i>s</i></label>`)
      + (plus ? `<button type="button" class="dj-x" data-x="${e.k}" aria-label="Retirer cet état" title="Retirer cet état">×</button>` : '<span></span>') + '</div>'; };
  const remplis = E.filter(e => e.i > 0), pts = d.points, perm = pts.find(p => p.t === Infinity), pointe = pts.find(p => p.t !== Infinity);
  const pire = pts.some(p => p.ok === false) ? 'ko' : pts.some(p => p.serre) ? 'att' : pts.length ? 'ok' : '';
  const resume = !remplis.length ? 'aucun état : écris au moins le permanent' : [perm ? 'permanent ' + amperes(perm.i) : 'sans permanent', pointe ? 'pointe ' + amperes(pointe.i) + ' pendant ' + secondes(pointe.t) : ''].filter(Boolean).join(' · ') + (remplis.length > 3 ? ' · ' + remplis.length + ' états' : '');
  return { cle: 'profil', resume: insecable(esc(resume)), badge: { t: remplis.length || '—', etat: remplis.length ? pire : 'att' },
    contenu: `<div class="dj-etats" role="table" aria-label="Profil de charge"><div class="dj-entete" role="row"><span></span><span>état</span><span>courant</span><span>durée</span><span></span></div>${ordre.map(ligne).join('')}</div>`
      + `<button type="button" class="fi-lien dj-plus" id="dj-plus">${ico('plus')}un état</button>` }; }

/* 4. SES FILS : une ligne chacun — la borne, la route, le type, où il va, son numéro ; dessous, la barre de l'intensité
   qu'il porte au pire contre ce qu'il admet, d'une couleur d'état, et ce qui ne va pas en une ligne. */
function djSectionFils(nom, d, vt) { if (!d.fils.length) return { cle: 'fils', vide: 'aucun fil ne part de ce disjoncteur' };
  const cal = d.calibre, lus = d.fils.map(f => ({ f, ...jugementDuFil(f, cal) }));
  const li = lus.map(({ f, etat, charge, dit }) => { const k = f.l ? cleFil(f.l) : '', tag = vt && vt.get(String(f.borne));
    const titre = (f.cable || 'fil') + (f.type ? ' · ' + f.type : '') + (f.fil ? ' · ' + amperes(f.continu) + ' admis en continu' + motFacteur(f.facteur) : '') + (dit ? ' — ' + dit : '') + ' — voir sur le plan';
    const barre = charge ? `<div class="dj-charge"><span class="dj-barre ${etat}" aria-hidden="true"><i style="width:${(Math.min(1, charge.r) * 100).toFixed(1)}%"></i></span><span class="dj-chiffres"><b>${esc(amperes(charge.i))}</b> sur ${esc(amperes1(charge.admise))} <i>${esc(charge.quand)}</i></span></div>` : '<div class="dj-charge"><span class="dj-chiffres"><i>intensité inconnue</i></span></div>';
    return `<li class="fi-fil ${etat}"${k ? ` data-i="${k}" tabindex="0" role="button" title="${escA(titre)}"` : ''}><span class="fi-ct"><b>${esc(f.borne || '—')}</b></span>${puceFil(f)}<span class="fi-type">${esc(f.type || '—')}</span>`
      + `<span class="fi-dest${f.amont ? ' amont' : ''}">${ico('fleche')}<span>${esc(f.autre)}</span>${tag ? `<span class="fi-tag" title="Barrette à poser sur cette borne">${esc(tag)}</span>` : ''}${f.via ? `<span class="fi-via" title="${escA('Nourri à travers ' + f.via)}">par ${esc(f.via)}</span>` : ''}</span><span class="fi-w">${esc(f.cable || '')}</span>`
      + barre + (dit ? `<span class="dj-dit ${etat}">${insecable(esc(dit))}</span>` : '') + '</li>'; }).join('');
  const ko = lus.filter(x => x.etat === 'ko'), att = lus.filter(x => x.etat === 'att');
  const courts = [...new Set(d.fils.map(f => motFacteur(f.facteurCourt)))], declasse = courts.length === 1 && courts[0] ? ' · déclassés' + courts[0] : '';
  const resume = ko.length ? `${pluriel2(d.fils.length, 'fil')} · ${ko.length > 1 ? ko.length + ' trop fins' : '1 trop fin'} (${ko.map(x => x.f.cable || x.f.type).join(', ')})` + (att.length ? ` · ${att.length} à voir` : '')
    : att.length ? `${pluriel2(d.fils.length, 'fil')} · ${att.length > 1 ? att.length + ' pas protégés' : '1 pas protégé'} (${att.map(x => x.f.cable || x.f.type).join(', ')})` : `${pluriel2(d.fils.length, 'fil')}, ${d.fils.length > 1 ? 'tous protégés' : 'protégé'}`;
  return { cle: 'fils', resume: insecable(esc(resume)), ...pastille(ko.length + att.length, ko.length ? 'ko' : att.length ? 'att' : 'ok'),
    contenu: `<ul class="fi-liste dj-fils"><li class="fi-groupe">au pire, l’intensité contre ce qu’il admet${esc(declasse)}</li>${li}</ul>` }; }
/* Le jugement d'un fil, en mots : son état (ko : la charge le dépasse ou dépasse son contact ; att : pas protégé, sous le
   calibre, hors de la table 11-3, contact sous le calibre ; ok), la charge au pire (le courant d'une phase contre ce qu'il
   admet pour cette durée) et ce qui ne va pas, en une ligne. */
function jugementDuFil(f, cal) { const r = [];
  if (f.verdict === 'inconnu') return { etat: 'att', charge: null, dit: f.refuse ? 'conducteur ' + f.conducteur + ' : pas de résistance dans la base' : 'fil inconnu de la norme' };
  const ph = (f.phases || []).slice().sort((a, b) => b.i / b.admise - a.i / a.admise)[0];
  const charge = ph ? { i: ph.i, admise: ph.admise, r: ph.i / ph.admise, quand: ph.t === Infinity ? 'en permanence' : 'pendant ' + secondes(ph.t) } : null;
  // la barre dit déjà les chiffres de la charge : la ligne dit le verdict, court
  if (f.verdict === 'fil') r.push(`trop fin pour ${f.pire.nom}`);
  if (f.contactDepasse) r.push(`son contact ${f.contact.taille} ne porte que ${amperes(f.contact.intensite)}`);
  if (f.verdict === 'calibre') r.push(`admet ${amperes1(f.continu)} en continu, moins que le ${amperes(cal)} : pas protégé en surcharge`);
  else if (f.protege === false && f.pireLaisse && f.verdict !== 'fil') { const x = f.pireLaisse; r.push(`pas protégé : le ${amperes(cal)} laisse passer ${amperes1(x.courant)} ${pourPalier(x.palier)}, ${f.jugeSur === 'dommage' ? 'il s’abîme au-delà de' : 'il n’admet que'} ${amperes1(x.admise)}`); }
  if (f.horsTable) r.push(`la table 11-3 le limite à un ${amperes(f.calibreMax)}`);
  if (f.contactSurcharge && !f.contactDepasse) r.push(`contact ${f.contact.taille} : ${amperes(f.contact.intensite)}, sous le calibre`);
  const etat = f.verdict === 'fil' || f.contactDepasse ? 'ko' : r.length ? 'att' : 'ok';
  return { etat, charge, dit: r.join(' · ') }; }

/* 5. LA CHUTE EN LIGNE depuis le disjoncteur, comme la feuille du lecteur : chaque chemin jusqu'à un équipement, à travers
   les prises de coupure et les barrettes, au courant permanent du profil (sinon le calibre, sinon l'hypothèse) — une
   ligne par bout, la pire en tête : le repère d'arrivée, la jauge contre la chute admise, les volts, le pourcentage, et
   le câble qui pèse le plus (« DR24 à 161 °C »). La part du disjoncteur se dit une fois, en tête. */
function chutesDe(nom, d) { const H = app.simu || HYPOTHESES, perm = d.profil && d.profil.perm && nombreLu(d.profil.perm.i) > 0 ? nombreLu(d.profil.perm.i) : null, I = perm || (d.calibre > 0 ? d.calibre : H.courant);
  const courts = (d.points || []).filter(p => p.t !== Infinity && p.i > 0);
  const cs = chutesDepuis(app.norme, verite(), nom, I, H, courts, { famille: d.famille, calibre: d.calibre });
  return { H, I, perm, cs: cs.slice().sort((a, b) => (b.dU || 0) - (a.dU || 0)) }; }
function djSectionChute(nom, d) { const { H, I, perm, cs } = chutesDe(nom, d); if (!cs.length) return { cle: 'chute', vide: 'aucun chemin jusqu’à un équipement' };
  const admis = cs[0].admis, mV = u => nombre(Math.round(u * 1000) / 1000) + ' V', tousHyp = cs.every(c => !c.reel), cb = (cs.find(c => c.disjoncteur) || {}).disjoncteur;
  const li = cs.map(c => { const fils = c.segments.filter(s => s.fil), lourd = fils.slice().sort((a, b) => (b.dU || 0) - (a.dU || 0))[0];
    const detail = (c.disjoncteur && c.disjoncteur.dU != null ? [`${c.disjoncteur.nom} : ${mV(c.disjoncteur.dU)} (sa chute propre)`] : []).concat(c.segments.map(s => s.fil ? `${s.fil.cable || 'fil'} : ${s.dU != null ? mV(s.dU) : '?'} (${nombre(Math.round(s.longueur * 100) / 100)} m${s.reelle ? '' : ', hypothèse'}${s.T != null ? ', ' + nombre(Math.round(s.T)) + ' °C' : ''})` : `${s.passage} : ${s.dU != null ? mV(s.dU) : 'contact inconnu'}`)).join(' · ');
    const part = c.dU != null && admis ? Math.min(1, c.dU / admis) : 0;
    const pointe = (c.pointes || []).filter(p => p.trop).sort((a, b) => b.dU / b.admis - a.dU / a.admis)[0] || null, ko = c.trop || (pointe && c.reel);
    const notes = [lourd && lourd.fil.type ? `${lourd.fil.type}${lourd.T != null ? ' à ' + nombre(Math.round(lourd.T)) + ' °C' : ''}` : '', c.mots.replace(/ → [^→]*$/, '')]
      .concat(c.inconnus.length ? [`<em>${c.inconnus.length > 1 ? c.inconnus.length + ' inconnus' : '1 inconnu'}</em>`] : []).concat(c.trop ? [`<em class="ko">dépasse ${esc(volts(admis))}</em>`] : !c.fini ? ['<em>chemin sans fin</em>'] : [])
      .concat(pointe ? [`<em class="${c.reel ? 'ko' : 'att'}" title="${escA('À ' + amperes(pointe.i) + ' pendant ' + secondes(pointe.t) + (pointe.nom ? ' (' + pointe.nom + ')' : '') + ' : ' + volts(pointe.dU) + ' contre ' + volts(pointe.admis) + ' admis' + (pointe.intermittent ? ' en intermittent' : ''))}">en pointe ${esc(volts(pointe.dU))} &gt; ${esc(volts(pointe.admis))}</em>`] : [])
      .concat(c.reel || tousHyp ? [] : ['<em><button type="button" class="fi-hyp" data-hyp="1" title="Le retest ne porte pas toutes les longueurs : l’hypothèse de la simulation les remplace — cliquer pour la régler">longueurs d’hypothèse</button></em>']).filter(Boolean);
    return `<li class="fi-fil${ko ? ' ko' : ''}" title="${escA(detail + (c.inconnus.length ? ' — ' + c.inconnus.join(' ; ') : ''))}"><span class="fi-ct"><b>${esc(c.bout[0])}</b>${c.bout[1] ? `<i>${esc(c.bout[1])}</i>` : ''}</span>`
      + `<span class="dj-jauge"${admis ? '' : ' hidden'} aria-hidden="true"><i style="width:${(part * 100).toFixed(1)}%"></i></span><b class="dj-du">${c.dU != null ? esc(volts(c.dU)) : '—'}</b><span class="dj-pct">${c.pct != null ? esc(nombre(Math.round(c.pct * 10) / 10)) + ' %' : ''}</span>`
      + `<span class="dj-chemin">${notes.map(n => /^</.test(n) ? n : esc(n)).join(' · ')}</span></li>`; }).join('');
  const pire = cs[0], trop = cs.filter(c => c.trop), tete = [`à ${amperes(I)}${perm ? ' permanents' : d.calibre > 0 ? ' (le calibre)' : ' (hypothèse)'}${H.tension ? ' sous ' + nombre(H.tension) + ' V' : ''}`, admis != null ? 'admise ' + volts(admis) : '',
    cb && cb.dU != null ? `dont ${mV(cb.dU)} dans le disjoncteur` : H.chuteDisjoncteur === false ? 'sans la chute du disjoncteur (hypothèse)' : cb ? 'chute du disjoncteur inconnue' : ''].filter(Boolean).join(' · ');
  const resume = trop.length ? `pire : ${pire.bout[0]}, ${volts(pire.dU)} > ${volts(admis)} admis` + (trop.length > 1 ? ` · ${trop.length} chemins trop longs` : '') + (tousHyp ? ' (longueurs d’hypothèse)' : '')
    : pire.dU != null ? `au plus ${volts(pire.dU)} vers ${pire.bout[0]}${admis != null ? ' · ' + volts(admis) + ' admis' : ''}` : 'chute inconnue';
  return { cle: 'chute', resume: insecable(esc(resume)), ...pastille(trop.length, trop.length ? (trop.some(c => c.reel) ? 'ko' : 'att') : 'ok'),
    contenu: `<ul class="fi-liste dj-chutes"><li class="fi-groupe">${insecable(esc(tete))}</li>${tousHyp ? `<li class="fi-note dj-hyp"><button type="button" class="fi-hyp" data-hyp="1" title="Le retest ne porte pas de longueur : l’hypothèse de la simulation les remplace — cliquer pour la régler">longueurs d’hypothèse</button> : ${esc(nombre(H.longueur))} m par fil</li>` : ''}${li}</ul>` }; }

/* 6. LE DÉTAIL DU CALCUL, fermé d'office : la phrase entière du moteur, la gamme jugée, les marges et ce que la famille
   garantit, les fils palier par palier (ce que le disjoncteur laisse passer contre ce que le fil supporte), les sources. */
function djSectionDetail(nom, d, o) { if (d.sansCourbe) return { cle: 'detail', vide: 'rien à calculer sans courbe de disjonction' };
  const m = d.meilleur, H = { ...HYPOTHESES, ...(app.simu || {}) }, C = d.courbes, T = d.tenue, cal = d.calibre;
  const pourquoi = m.pourquoi ? `<p class="dj-pourquoi">${insecable(esc(majuscule(m.pourquoi) + '.'))}</p>` : '';
  const verdict = g => g.valide == null ? ['—', ''] : g.valide ? (g.marge ? ['tient', 'ok'] : ['serré', 'att']) : ['déclenche', 'ko'];
  const courts = d.points.some(p => p.t !== Infinity && p.i > 0);
  const gamme = d.sansProfil ? '' : `<div class="sur">la gamme, jugée au ${esc(C[0].nom)}</div><div class="dj-defile"><table class="dj-table"><thead><tr><th>calibre</th><th title="Ce qu’il garantit de tenir en permanence, au max du tableau">garantit</th>${courts ? `<th title="La part du temps de déclenchement que les pointes consomment, le courant majoré de la marge">pointes${H.marge ? ' +' + esc(nombre(H.marge)) + ' %' : ''}</th>` : ''}<th>fils</th><th>verdict</th></tr></thead><tbody>`
    + d.gamme.map(g => { const [v, c] = verdict(g); return `<tr class="${g.calibre === cal ? 'retenu' : ''}${g.calibre === m.calibre ? ' meilleur' : ''}"><td>${esc(amperes(g.calibre))}</td><td>${g.tenu != null ? esc(amperes(g.tenu)) : '—'}</td>`
      + (courts ? `<td>${g.sommeMarge != null ? esc(motFraction(g.sommeMarge)) : '—'}</td>` : '') + `<td class="${g.fils === false ? 'att' : g.fils ? 'ok' : ''}">${g.fils == null ? '—' : g.fils ? 'protégés' : 'non'}</td><td class="${c}">${esc(v)}${g.selectif === false ? ' · pas 2:1' : ''}${g.calibre === m.calibre ? ' · le meilleur' : g.calibre === cal ? ' · retenu' : ''}</td></tr>`; }).join('') + '</tbody></table></div>';
  const lente = C[C.length - 1], interp = c => c.interpolee ? ' (interpolée entre ' + c.entre.join(' et ') + ')' : '';
  const marges = faits([['marge de courant', esc(nombre(d.marges.marge) + ' %') + origine('hyp')], ['marge de temps', esc('au plus ' + nombre(Math.round(d.marges.fraction * 100)) + ' % du temps de déclenchement') + origine('hyp')],
    ['préchauffage', esc(d.chauffe > 1 ? '÷ ' + nombre(Math.round(d.chauffe * 100) / 100) + ' sur les états en service (' + nombre(H.prechauffage) + ' à 60 % de In)' : 'aucun') + origine('hyp')],
    ['il garantit', T ? esc(nombre(Math.round(T.tient * 100) / 100) + ' In à ' + nombre(T.temperature) + ' °C' + (T.horsPlage ? ' (la valeur du bord de la table)' : T.interpolee ? ' (interpolé en température)' : '')) + origine('norme', 'Table Calibration : ' + T.famille + (T.source ? ' — ' + T.source : '')) : 'la courbe seule'],
    ['courbe qui juge', esc(C[0].nom + interp(C[0]) + ' — la plus rapide, au max du tableau (' + nombre(H.tableauMax) + ' °C)')], ['courbe lente', esc(lente.nom + interp(lente) + ' — ce qu’il laisse passer, au min (' + nombre(H.tableauMin) + ' °C)')],
    ['famille', esc((d.famille ? d.famille.famille + ' · ' + d.famille.norme + ' · ' : '') + 'courbes ' + C[0].famille)]]);
  const P = [[2, '2 s'], [10, '10 s'], [60, '1 min'], [Infinity, 'continu']];
  const paliers = !d.fils.some(f => f.laisse && f.laisse.length) ? '' : `<div class="sur">les fils, palier par palier : ce que le ${esc(amperes(cal))} laisse passer à ${esc(lente.nom)} / ce que le fil supporte</div><div class="dj-defile"><table class="dj-table"><thead><tr><th>fil</th>${P.map(([, t]) => `<th>${t}</th>`).join('')}</tr></thead><tbody>`
    + d.fils.map(f => `<tr><td><span class="id">${esc(f.cable || '—')}</span> ${esc(f.type || '')}</td>${P.map(([p]) => { const x = (f.laisse || []).find(y => y.palier === p); return x ? `<td class="${x.ok ? '' : 'att'}" title="${escA((f.jugeSur === 'dommage' ? 'avant dommage' : 'en service') + ' : ' + amperes(x.admise) + ' · en service : ' + amperes(x.service))}">${esc(nombre(Math.round(x.courant * 10) / 10))} / ${esc(nombre(Math.round(x.admise * 10) / 10))}</td>` : '<td>—</td>'; }).join('')}</tr>`).join('') + '</tbody></table></div>'
    + `<p class="fi-note">En ampères. La limite : la courbe de dommage du fil (table Dommage des fils) quand elle est connue, sinon ses intensités de service (EN 2853, déclassées).</p>`;
  const dom = (d.fils.find(f => f.dommage) || {}).dommage, cb = d.chutePropre;
  const sources = faits([['calibration', T ? esc(T.famille + (T.norme ? ' — ' + T.norme : '') + (T.source ? ' (' + T.source + ')' : '')) : ''], ['dommage des fils', dom ? esc(dom.source) : ''],
    ['chute du disjoncteur', cb ? esc(volts(cb.chute) + ' à In (' + cb.nom + (cb.note ? ', ' + cb.note : '') + ')') : ''], ['courbes', esc(FICHES_TABLES && FICHES_TABLES.disjoncteurs ? FICHES_TABLES.disjoncteurs.source : C[0].famille)]], 'dj-sources');
  const resume = `${pluriel2(d.gamme.length, 'calibre')} jugés · ${nombre(d.marges.marge)} % de courant, ${nombre(Math.round(d.marges.fraction * 100))} % du temps · courbes ${C[0].famille}`;
  return { cle: 'detail', resume: insecable(esc(resume)), badge: { t: d.gamme.length, etat: '' },
    contenu: pourquoi + gamme + `<div class="sur">les marges</div>` + marges + paliers + `<div class="sur">les sources</div>` + sources
      + `<p class="fi-note"><button type="button" class="fi-hyp" data-hyp="1" title="Les marges, le préchauffage, l’ambiante du tableau, les calibres préférés">Régler les hypothèses</button> : les marges, le préchauffage, l’ambiante du tableau, les calibres préférés.</p>` }; }

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
  // refaire en place : chaque section garde son élément (et s'il est ouvert) ; ses titres et son corps se refont — le
  // corps du profil se garde quand on écrit dedans, seules ses pastilles changent
  const rafraichir = garderProfil => { E.d = disjonctionDe(nom);
    sectionsDisjoncteur(nom).forEach(s => { const p = Q(`[data-part="${s.cle}"]`), det = p && p.closest('details.fs'); if (!det) return;
      const sb = s.badge || !s.secours || !p.closest('.dj-fiche') ? s : { ...s, badge: s.secours };
      const t = document.createElement('template'); t.innerHTML = ficheSection(det.dataset.type || 'disjoncteur', { ...sb, ouvert: det.open }); const neuf = t.content.firstElementChild;
      det.replaceChild(neuf.querySelector('summary'), det.querySelector('summary')); det.classList.toggle('fs-vide', !!s.vide);
      if (s.cle === 'profil' && garderProfil) { const parI = new Map(E.d.points.map(x => [x.i, x])); etatsDuProfil(E.d.profil).forEach(e => { const el = Q(`.dj-etat[data-k="${e.k}"] .dj-verdict`), x = e.i > 0 ? parI.get(e.i) : null, c = classeVerdict(x); if (el) { el.className = 'dj-verdict' + (c ? ' ' + c : ''); el.title = majuscule(motVerdict(x)); } }); }
      else det.replaceChild(neuf.querySelector('.fs-corps'), det.querySelector('.fs-corps')); });
    relier(); };
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
