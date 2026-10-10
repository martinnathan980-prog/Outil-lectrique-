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

/* ---- le graphique ------------------------------------------------------------------- */
/* Ce que le graphique montre, d'une fiche à l'autre (dans ce navigateur) : comparer les calibres, toutes les températures. */
const CLE_VUE_DJ = 'atelier.dj.vue';
const DJ_VUE = (() => { try { const o = JSON.parse(localStorage.getItem(CLE_VUE_DJ) || '{}') || {}; return { comparer: !!o.comparer, temperatures: !!o.temperatures }; } catch (_) { return { comparer: false, temperatures: false }; } })();
const retenirVue = () => { try { localStorage.setItem(CLE_VUE_DJ, JSON.stringify(DJ_VUE)); } catch (_) { } };
/* La géométrie : ampères en abscisse, secondes en ordonnée, en log-log ; 10 ms en bas, 2 h en haut (le permanent dure
   toujours : il se pose sur le bord du haut). L'abscisse prend les décades qui couvrent le profil, la bande du calibre
   retenu et le fil le plus faible ; le SVG est dessiné à la largeur où il se pose (1 unité = 1 pixel : net). */
const DJG = { L: 46, R: 12, T: 40, B: 24, ylo: -2, yhi: Math.log10(7200), ubas: -2.4, uhaut: 4.4 };
const DJ_TEMPS = [[0.01, '10 ms'], [1, '1 s'], [60, '1 min'], [3600, '1 h']], DJ_TEMPS_FINS = [0.1, 10, 600];
function largeurGrapheEstimee() { const b = typeof $ === 'function' ? $('ba-equip') : null; return b && b.clientWidth > 200 ? b.clientWidth - 48 : 392; }
function geometrieGraphe(d, W, faible, vue) { W = Math.max(280, Math.round(W || 392)); const T = DJG.T + (vue && vue.temperatures ? 13 : 0), H = Math.round(Math.max(276, Math.min(350, W * 0.74)) + T - DJG.T);
  const { L, R, B, ylo, yhi } = DJG, rapide = d.courbes[0], cal = d.calibre, I = d.points.map(p => p.i).filter(i => i > 0);
  const bas = [...I, cal ? cal * rapide.points[0].m : Infinity, faible ? faible.continu : Infinity].filter(x => x > 0 && isFinite(x));
  const hauts = [...I.map(i => i * 1.5), cal ? cal * multipleAdmis(rapide, 0.02) : 0];
  let xlo = Math.floor(Math.log10((bas.length ? Math.min(...bas) : 1) / 1.4) + 1e-9), xhi = Math.ceil(Math.log10(Math.max(...hauts, 1e-9)) - 1e-9); if (xhi - xlo < 2) xhi = xlo + 2;
  const kx = (W - L - R) / (xhi - xlo), ky = (H - T - B) / (yhi - ylo), xv = v => L + (v - xlo) * kx, yu = u => T + (yhi - u) * ky;
  return { W, H, L, R, T, B, xlo, xhi, ylo, yhi, kx, ky, xv, yu, X: i => xv(Math.log10(i)), Y: t => yu(Math.max(ylo, Math.min(yhi, Math.log10(t)))),
    iDe: x => Math.pow(10, xlo + (x - L) / kx), tDe: y => Math.pow(10, yhi - (y - T) / ky), dx: c => c > 0 ? Math.log10(c) * kx : 0 }; }
/* L'interpolation cubique MONOTONE de Fritsch et Carlson (1980) : par des nœuds (u croissant, v monotone), une courbe C¹
   qui passe par chacun sans jamais sortir de l'intervalle de deux voisins — ni bosse, ni retour, ni cassure. `fin` force
   la pente au dernier nœud (0 : la courbe y devient verticale et rejoint son asymptote). Rend les segments de Bézier. */
function bezierMonotone(N, fin) { const n = N.length; if (n < 2) return [];
  const s = []; for (let k = 0; k < n - 1; k++) s.push((N[k + 1].v - N[k].v) / (N[k + 1].u - N[k].u));
  const m = N.map((_, k) => k === 0 ? s[0] : k === n - 1 ? s[n - 2] : s[k - 1] * s[k] <= 0 ? 0 : (s[k - 1] + s[k]) / 2); if (fin != null) m[n - 1] = fin;
  for (let k = 0; k < n - 1; k++) { if (s[k] === 0) { m[k] = m[k + 1] = 0; continue; }
    const a = m[k] / s[k], b = m[k + 1] / s[k], r = a * a + b * b; if (r > 9) { const t = 3 / Math.sqrt(r); m[k] = t * a * s[k]; m[k + 1] = t * b * s[k]; } }
  return s.map((_, k) => { const A = N[k], Bn = N[k + 1], h = Bn.u - A.u; return [[A.u, A.v], [A.u + h / 3, A.v + m[k] * h / 3], [Bn.u - h / 3, Bn.v - m[k + 1] * h / 3], [Bn.u, Bn.v]]; }); }
/* LA COURBE LISSE d'une courbe de disjonction, au calibre 1 A (le multiple vaut l'ampère : un calibre la décale de
   log10(calibre) décades). En log-log, le multiple en fonction du temps — vers les temps longs la courbe devient verticale,
   c'est le temps qui la parcourt sans peine — : les points de l'enveloppe du moteur, un par temps, lissés (`lisserNoeuds`),
   la pente du dernier segment au-delà du dernier point (comme le moteur), verticale au premier ; puis, du haut vers le
   bas, la droite de l'asymptote et les segments de Bézier (`bezierMonotone`). Rend { haut, coude, segs, fin } en pixels. */
function noeudsLisses(c) { const par = new Map();
  c.points.forEach(p => { if (!(p.t > 0 && p.m > 0)) return; const u = Math.log10(p.t), v = Math.log10(p.m), k = u.toFixed(5), x = par.get(k); if (!x || x.v < v) par.set(k, { u, v }); });
  return lisserNoeuds([...par.values()].sort((a, b) => a.u - b.u), u => Math.log10(multipleAdmis(c, Math.pow(10, u)))); }
/* Les points d'une courbe de la norme sont lus à la main sur une figure : ils tremblent d'un pour cent, et une courbe qui
   passe par chacun tremble aussi. Le DESSIN les lisse d'abord — une régression linéaire locale (poids gaussien de 0,1
   décade en temps) évaluée tous les 0,08 décade —, chaque nœud tenu à ±0,005 décade (1,2 %) de la courbe du moteur
   (`exact` : là où la norme a un vrai coude, le dessin le garde), puis monotone. L'écart au moteur reste de l'ordre du
   tremblement des points (tests/disjoncteur.js le mesure) ; le jugement, lui, reste sur les points lus. */
const TOLERANCE_LISSAGE = 0.005;
function lisserNoeuds(N, exact, h) { if (N.length < 4) return N; h = h || 0.1; const u0 = N[0].u, u1 = N[N.length - 1].u, n = Math.max(2, Math.ceil((u1 - u0) / 0.08)), out = [];
  for (let k = 0; k <= n; k++) { const u = u0 + (u1 - u0) * k / n; let sw = 0, su = 0, sv = 0, suu = 0, suv = 0;
    N.forEach(p => { const w = Math.exp(-0.5 * Math.pow((p.u - u) / h, 2)); sw += w; su += w * p.u; sv += w * p.v; suu += w * p.u * p.u; suv += w * p.u * p.v; });
    const mu = su / sw, mv = sv / sw, vu = suu / sw - mu * mu, b = vu > 1e-9 ? (suv / sw - mu * mv) / vu : 0, v = mv + b * (u - mu), e = exact ? exact(u) : v;
    out.push({ u, v: isFinite(e) ? e + Math.max(-TOLERANCE_LISSAGE, Math.min(TOLERANCE_LISSAGE, v - e)) : v }); }
  for (let k = 1; k < out.length; k++) out[k].v = Math.min(out[k].v, out[k - 1].v);
  return out; }
function traceLisse(c, G) { const N = noeudsLisses(c); if (!N.length) return null;
  if (N.length >= 2 && N[0].u > DJG.ubas) { const a = N[0], b = N[1], pente = (b.v - a.v) / (b.u - a.u); N.unshift({ u: DJG.ubas, v: a.v + pente * (DJG.ubas - a.u) }); }
  const segs = bezierMonotone(N, 0).map(sg => sg.map(([u, v]) => [G.xv(v), G.yu(u)]).reverse()).reverse(), h = N[N.length - 1], x0 = G.xv(h.v);
  return { haut: [x0, G.yu(DJG.uhaut)], coude: [x0, G.yu(h.u)], segs, fin: segs.length ? segs[segs.length - 1][3] : [x0, G.yu(h.u)] }; }
/* LA LIMITE DE DOMMAGE d'un fil (09 bis, `dommageDuFil`) : en bref l'adiabatique √(I²t / t) — une droite en log-log —, en
   long son continu porté à la tenue — une verticale —, le coude arrondi sur ±0,14 décade (2 % au plus) ; sans courbe de
   dommage, ses intensités de service aux paliers, lissées de même. Même forme que `traceLisse`, en ampères. */
function traceDommage(f, G) { const D = f.dommage;
  if (D && D.i2t > 0 && D.continu > 0) { const vc = Math.log10(D.continu), us = Math.log10(D.i2t / (D.continu * D.continu)), h = 0.14, adia = u => 0.5 * Math.log10(D.i2t) - 0.5 * u;
    const P = (u, v) => [G.xv(v), G.yu(u)], A = { u: us - h, v: adia(us - h) }, Bn = { u: us + h, v: vc }, k = Bn.u - A.u;
    const coude = [[Bn.u, Bn.v], [Bn.u - k / 3, Bn.v], [A.u + k / 3, A.v - 0.5 * k / 3], [A.u, A.v]].map(([u, v]) => P(u, v));
    const bas = P(DJG.ubas, adia(DJG.ubas)); return { haut: P(DJG.uhaut, vc), coude: P(Bn.u, vc), segs: [coude, [coude[3], coude[3], bas, bas]], fin: bas }; }
  const L = (f.laisse || []).filter(x => x.service > 0); if (L.length < 2) return null;
  const N = L.map(x => ({ u: x.palier === Infinity ? Math.log10(600) : Math.log10(x.palier), v: Math.log10(x.admise) })).sort((a, b) => a.u - b.u);
  const a = N[0], b = N[1], pente = (b.v - a.v) / (b.u - a.u); N.unshift({ u: DJG.ubas, v: a.v + pente * (DJG.ubas - a.u) });
  const segs = bezierMonotone(N, 0).map(sg => sg.map(([u, v]) => [G.xv(v), G.yu(u)]).reverse()).reverse(), hh = N[N.length - 1];
  return { haut: [G.xv(hh.v), G.yu(DJG.uhaut)], coude: [G.xv(hh.v), G.yu(hh.u)], segs, fin: segs[segs.length - 1][3] }; }
const f2 = n => String(Math.round(n * 1000) / 1000);   // trois décimales : arrondir au centième faisait trembler la tangente (le dessin fait 390 unités de large)
const pt2 = p => f2(p[0]) + ' ' + f2(p[1]);
// du haut vers le bas, puis (pour fermer une bande) du bas vers le haut
const descente = tr => `M${pt2(tr.haut)} L${pt2(tr.coude)}` + tr.segs.map(s => ` C${pt2(s[1])} ${pt2(s[2])} ${pt2(s[3])}`).join('');
const montee = tr => ` L${pt2(tr.fin)}` + tr.segs.slice().reverse().map(s => ` C${pt2(s[2])} ${pt2(s[1])} ${pt2(s[0])}`).join('') + ` L${pt2(tr.haut)}`;
const bandeDe = (a, b) => descente(a) + montee(b) + ' Z';
/* Des points le long d'un tracé (pour que les étiquettes ne se posent pas dessus), décalés de `dx`. */
function echantillons(tr, dx, haut) { const out = [], bz = (s, t) => { const u = 1 - t; return [0, 1].map(j => u * u * u * s[0][j] + 3 * u * u * t * s[1][j] + 3 * u * t * t * s[2][j] + t * t * t * s[3][j]); };
  for (let y = Math.max(tr.haut[1], haut != null ? haut : DJG.T); y < tr.coude[1]; y += 4) out.push([tr.coude[0] + dx, y]);   // la part visible : au-dessus du cadre, le trait est coupé
  // un échantillon tous les 4 pixels environ (la longueur du polygone de contrôle borne celle du segment)
  tr.segs.forEach(s => { const lg = Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]) + Math.hypot(s[2][0] - s[1][0], s[2][1] - s[1][1]) + Math.hypot(s[3][0] - s[2][0], s[3][1] - s[2][1]), n = Math.max(4, Math.ceil(lg / 4));
    for (let k = 0; k <= n; k++) { const p = bz(s, k / n); out.push([p[0] + dx, p[1]]); } }); return out; }
// l'abscisse d'un tracé à une hauteur (le premier échantillon à cette hauteur ou au-dessous)
const xA = (ech, y) => { let best = null; for (const p of ech) if (best == null || Math.abs(p[1] - y) < Math.abs(best[1] - y)) best = p; return best ? best[0] : null; };
/* LES ÉTIQUETTES, posées sans chevaucher : la largeur d'un texte en Inter, estimée (le dessin se fait en chaîne, avant la
   page) ; un « poseur » garde les boîtes prises (traits, points, étiquettes) et essaie, pour chaque étiquette, ses places
   dans l'ordre de préférence — la première libre, dans le cadre, gagne ; sans place, l'étiquette se tait (la bulle du
   survol la dit). */
const largeurEtiquette = (s, px) => [...String(s)].reduce((w, c) => w + (/[0-9]/.test(c) ? 0.6 : /[A-Z]/.test(c) ? 0.68 : /[ ,.·:;’'()]/.test(c) ? 0.3 : c === '°' ? 0.42 : /[mw]/.test(c) ? 0.86 : /[iljtfr]/.test(c) ? 0.34 : 0.56), 0) * px;
function poseur(G) { const pris = [];
  // dans le cadre — ou, pour une étiquette marquée `haut`, dans la marge du haut, au bout d'un trait qui sort par là ; deux
  // étiquettes d'un même rang gardent 3 pixels entre elles, pour ne pas se lire comme une seule
  const dedans = b => b.haut ? b.x0 >= 2 && b.x1 <= G.W - 2 && b.y0 >= 0 : b.x0 >= G.L + 2 && b.x1 <= G.W - G.R - 2 && b.y0 >= G.T + 1 && b.y1 <= G.H - G.B - 2;
  const libre = b => dedans(b) && !pris.some(o => { const g = o.e && b.e ? 3 : 0; return b.x0 < o.x1 + g && b.x1 > o.x0 - g && b.y0 < o.y1 && b.y1 > o.y0; });
  return { pris, traits(ech, r) { ech.forEach(([x, y]) => pris.push({ x0: x - r, x1: x + r, y0: y - r, y1: y + r })); }, boite(b) { pris.push(b); },
    essayer(cands) { for (const c of cands) if (c && libre(c.b) && (c.ext || []).every(b => !pris.some(o => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0))) { pris.push(c.b, ...(c.ext || [])); return c; } return null; } }; }
/* Une étiquette candidate : des lignes [texte, classe, taille, suite?, classe de la suite?] — la suite se lit sur la même
   ligne, plus douce (« démarrage 12 A · 2 s ») —, ancrée (start, end, middle) en (x, y), y la ligne de base de la
   première ; et sa boîte. */
function etiquette(lignes, x, y, ancre, haut) { const w = Math.max(...lignes.map(([t, , px, t2]) => largeurEtiquette(t + (t2 ? ' ' + t2 : ''), px))), x0 = ancre === 'end' ? x - w : ancre === 'middle' ? x - w / 2 : x;
  return { lignes, x, y, ancre, b: { x0: x0 - 2, x1: x0 + w + 2, y0: y - 9, y1: y + (lignes.length - 1) * 12 + 3, e: true, haut: !!haut } }; }
const etiquetteSvg = (e, cls, dx) => `<text class="dj-etiq${cls ? ' ' + cls : ''}" x="${f2(e.x - (dx || 0))}" y="${f2(e.y)}" text-anchor="${e.ancre}">${e.lignes.map(([t, c, , t2, c2], k) => `<tspan${c ? ` class="${c}"` : ''}${k ? ` x="${f2(e.x - (dx || 0))}" dy="12"` : ''}>${esc(t)}</tspan>${t2 ? `<tspan class="${c2 || 'v'}"> ${esc(t2)}</tspan>` : ''}`).join('')}</text>`;
/* Les places d'une étiquette le long d'un tracé : de chaque côté (`cotes` : -1 à gauche, 1 à droite), à des hauteurs
   prises de haut en bas (`sens` 1) ou de bas en haut (-1). */
function lelong(lignes, ech, G, cotes, sens, ecart) { const out = [], hs = [], bas = (lignes.length - 1) * 12 + 3; for (let y = G.T + 12; y <= G.H - G.B - 6; y += 12) hs.push(y); if (sens < 0) hs.reverse();
  // le trait penche : à droite, on se pose après le point le plus à droite qu'il atteint sur la hauteur du texte ; à gauche, avant le plus à gauche
  cotes.forEach(c => hs.forEach(y => { const xs = [xA(ech, y - 9), xA(ech, y - 3), xA(ech, y + bas)].filter(x => x != null); if (!xs.length) return;
    out.push(etiquette(lignes, (c < 0 ? Math.min(...xs) : Math.max(...xs)) + c * (ecart || 6), y, c < 0 ? 'end' : 'start')); })); return out; }
/* Le fil le plus faible du disjoncteur : celui qui supporte le moins à 10 s (sa courbe de dommage, sinon son service). */
function filLePlusFaible(d) { const lim = f => f.dommage ? Math.max(f.dommage.continu, Math.sqrt(f.dommage.i2t / 10)) : ((f.laisse || []).find(x => x.palier === 10) || {}).admise || Infinity;
  const xs = d.fils.filter(f => f.dommage || (f.laisse || []).length).sort((a, b) => lim(a) - lim(b)); const f = xs[0]; if (!f) return null;
  return { f, continu: f.dommage ? f.dommage.continu : ((f.laisse.find(x => x.palier === Infinity) || {}).admise || null) }; }
// la couleur d'une courbe : chaude au plus chaud, froide au plus froid, tiède entre ; la plus lente d'une même température en tirets
function teinteDe(c, C) { const Ts = [...new Set(C.map(x => x.temperature).filter(t => t != null))].sort((a, b) => a - b), t = c.temperature;
  const k = t == null || Ts.length < 2 ? 'tiede' : t === Ts[Ts.length - 1] ? 'chaud' : t === Ts[0] ? 'froid' : 'tiede';
  const memes = C.filter(x => x.temperature === t); return { k, tirets: memes.length > 1 && memes.indexOf(c) > 0 }; }
let DJ_CLIP = 0;
/* LE GRAPHIQUE : la grille (les décades en ampères ; 10 ms, 1 s, 1 min, 1 h), puis dans le cadre — les bandes des calibres
   voisins s'il faut comparer, la bande du calibre retenu et ses deux bords (ou toutes ses courbes), la limite de dommage du
   fil le plus faible —, les étiquettes au bout des traits, les points du profil nommés. Rend le SVG ; `vue` : { comparer,
   temperatures } ; `W` : la largeur en pixels. */
function grapheSvg(d, vue, W) { vue = vue || {}; const faible = filLePlusFaible(d), G = geometrieGraphe(d, W, faible, vue), { L, R, T, B, H } = G, Wd = G.W, cal = d.calibre, C = d.courbes, clip = 'dj-clip-' + (++DJ_CLIP);
  const tr = C.map(c => traceLisse(c, G)), rapide = tr[0], lente = tr[tr.length - 1], dx = G.dx(cal), P = poseur(G);
  let s = '';
  // la grille : les décades en ampères, des traits courts aux unités entre elles ; les durées nommées, et entre elles des filets sans mot
  for (let e = G.xlo; e <= G.xhi; e++) { const x = f2(G.xv(e)); s += `<line class="dj-filet" x1="${x}" y1="${T}" x2="${x}" y2="${H - B}"/>`;
    if (e < G.xhi) for (let k = 2; k <= 9; k++) { const xk = f2(G.xv(e + Math.log10(k))); s += `<line class="dj-tic" x1="${xk}" y1="${H - B}" x2="${xk}" y2="${H - B - 3}"/>`; }
    const v = Math.pow(10, e), mot = v >= 1000 ? nombre(v / 1000) + ' kA' : nombre(+v.toPrecision(3)) + ' A';
    s += `<text class="dj-grad" x="${x}" y="${H - B + 15}" text-anchor="${e === G.xlo ? 'start' : e === G.xhi ? 'end' : 'middle'}">${esc(mot)}</text>`; }
  DJ_TEMPS_FINS.forEach(t => { const y = f2(G.Y(t)); s += `<line class="dj-filet fin" x1="${L}" y1="${y}" x2="${Wd - R}" y2="${y}"/>`; });
  DJ_TEMPS.forEach(([t, mot]) => { const y = f2(G.Y(t)); s += `<line class="dj-filet" x1="${L}" y1="${y}" x2="${Wd - R}" y2="${y}"/><text class="dj-grad" x="${L - 6}" y="${+y + 3.5}" text-anchor="end">${mot}</text>`; });
  // ce que les étiquettes doivent éviter : chaque trait dessiné
  const ech = tr.map(t => t ? echantillons(t, dx, T) : []), dom = faible ? traceDommage(faible.f, G) : null, echDom = dom ? echantillons(dom, 0, T) : [];
  if (cal) (vue.temperatures ? ech : [ech[0], ech[ech.length - 1]]).forEach(e => P.traits(e, 2));
  // les points du profil, d'abord : ce sont eux qu'on lit (leur nom peut passer sur le pointillé du dommage : son halo le détache)
  const pts = pointsSvg(d.points, G, P); P.traits(echDom, 2);
  // les noms dans la marge du haut, là où les traits sortent du cadre : des rangs (deux, trois quand on montre toutes les
  // températures) ; un trait nommé là y monte jusqu'à son nom — un trait court, dans le prolongement de son asymptote, qui
  // ne coupe aucun autre nom
  const rangs = [T - 10, T - 23, T - 36].filter(y => y > 10), traitsNoms = [];
  const marge = (l, x, ancre, tics, ordre) => (ordre < 0 ? rangs.slice().reverse() : rangs).map(y => { const e = etiquette(l, x, y, ancre, true); e.tics = tics || []; e.ext = e.tics.map(tx => ({ x0: tx - 2, x1: tx + 2, y0: y + 3, y1: T - 3 })); return e; });
  const nommerEn = (e, cls, dxg) => { if (!e) return ''; (e.tics || []).forEach(tx => traitsNoms.push(`<line class="dj-tic-nom${cls ? ' ' + cls : ''}" x1="${f2(tx - dxg)}" y1="${T}" x2="${f2(tx - dxg)}" y2="${f2(e.y + 3)}"/>`));
    return etiquetteSvg(e, cls, dxg); };
  // les voisins (comparer) : le calibre de la gamme juste en dessous, celui juste au-dessus, et le meilleur
  let voisins = '', etiqFixes = '', etiqBande = '', ticsBande = '';
  if (vue.comparer && cal && rapide && lente) { const cat = d.gamme.filter(g => g.catalogue || g.calibre === cal).map(g => g.calibre), k = cat.indexOf(cal);
    const choix = [...new Set(cat.slice(Math.max(0, k - 1), k + 2).concat(d.meilleur.calibre ? [d.meilleur.calibre] : []))].filter(c => c !== cal);
    const bande = bandeDe(rapide, lente), bord = descente(rapide), bord2 = descente(lente);
    voisins = choix.map(c => { const g = d.gamme.find(x => x.calibre === c) || {}, cls = g.valide === true ? (g.marge ? ' ok' : ' serre') : g.valide === false ? ' ko' : '';
      return `<g class="dj-voisin${cls}${c === d.meilleur.calibre ? ' meilleur' : ''}" data-cal="${c}" style="transform:translate(${f2(G.dx(c))}px,0)"><path class="dj-v-bande" d="${bande}"/><path class="dj-v-bord" d="${bord}"/><path class="dj-v-bord" d="${bord2}"/></g>`; }).join('');
    // chaque calibre nommé au-dessus de sa bande (le retenu à l'encre, le meilleur en vert), le retenu et le meilleur d'abord
    [cal, d.meilleur.calibre, ...choix].filter((c, n, xs) => c && xs.indexOf(c) === n && (c === cal || choix.includes(c))).forEach(c => { const x = (rapide.coude[0] + lente.coude[0]) / 2 + G.dx(c), l = [[nombre(c), '', 10.5]];
      etiqFixes += nommerEn(P.essayer(marge(l, x, 'middle')), 'dj-v-t' + (c === cal ? ' retenu' : '') + (c === d.meilleur.calibre ? ' meilleur' : ''), 0); }); }
  // la bande du retenu (ou toutes ses courbes), ses traits nommés à leur bout du haut — le plus rapide à gauche de son trait,
  // le plus lent à droite, ceux d'entre eux (une même température, min et max) au milieu de la paire —, sinon le long d'eux
  let bande = '';
  if (cal && rapide && lente) {
    bande = (C.length > 1 ? `<path class="dj-bande" d="${bandeDe(rapide, lente)}"/>` : '')
      + (vue.temperatures ? C.map((c, k) => { const t = teinteDe(c, C); return tr[k] ? `<path class="dj-courbe ${t.k}${t.tirets ? ' tirets' : ''}" data-courbe="${k}" d="${descente(tr[k])}"><title>${esc(c.nom + ' · ' + amperes(cal))}</title></path>` : ''; }).join('')
        : `<path class="dj-bord" d="${descente(rapide)}"><title>${esc(C[0].nom)}</title></path>` + (C.length > 1 ? `<path class="dj-bord" d="${descente(lente)}"><title>${esc(C[C.length - 1].nom)}</title></path>` : ''));
    // entre deux courbes d'une même température : au milieu, à une hauteur où elles s'écartent assez (le texte tient entre
    // elles sur toute sa hauteur), du bas vers le haut
    const entre = (l, a, b) => { const out = [], w = largeurEtiquette(l[0][0], 10.5);
      for (let y = H - B - 6; y >= T + 12; y -= 6) { const xa = Math.max(...[y - 9, y - 3, y + 3].map(z => xA(a, z))), xb = Math.min(...[y - 9, y - 3, y + 3].map(z => xA(b, z)));
        if (isFinite(xa) && isFinite(xb) && xb - xa > w + 12) out.push(etiquette(l, (xa + xb) / 2, y, 'middle')); } return out; };
    const groupes = vue.temperatures ? (() => { const parT = new Map(); C.forEach((c, k) => { const key = c.temperature != null ? c.temperature : c.nom; (parT.get(key) || parT.set(key, []).get(key)).push(k); }); return [...parT.values()]; })()
      : (C.length > 1 ? [[0], [C.length - 1]] : [[0]]);
    const bout = ks => ks[0] === 0 || ks[ks.length - 1] === C.length - 1;
    (vue.comparer && !vue.temperatures ? [] : groupes.filter(bout).concat(groupes.filter(ks => !bout(ks)))).forEach(ks => { const c0 = C[ks[0]], mot = ks.length > 1 && c0.temperature != null ? nombre(Math.round(c0.temperature)) + ' °C' : c0.nom, t = vue.temperatures ? ' ' + teinteDe(c0, C).k : '', l = [[mot, '', 10.5]];
      const a = ech[ks[0]], b = ech[ks[ks.length - 1]], xa = tr[ks[0]].coude[0] + dx, xb = tr[ks[ks.length - 1]].coude[0] + dx, premier = ks[0] === 0, dernier = ks[ks.length - 1] === C.length - 1;
      const cands = premier && !dernier ? [...marge(l, xa - 3, 'end', [xa]), ...lelong(l, a, G, [-1], 1), ...lelong(l, a, G, [1], -1)]
        : dernier && !premier ? [...marge(l, xb + 3, 'start', [xb]), ...lelong(l, b, G, [1], 1), ...lelong(l, b, G, [-1], -1)]
        : [...entre(l, a, b), ...marge(l, (xa + xb) / 2, 'middle', ks.length > 1 ? [xa, xb] : [xa], -1), ...lelong(l, b, G, [1], 1)];
      etiqBande += nommerEn(P.essayer(cands), 'dj-t' + t, dx); });
    ticsBande = traitsNoms.splice(0).join('');
    const mot = P.essayer([etiquette([['déclenche', '', 10.5]], Wd - R - 6, T + 14, 'end'), etiquette([['déclenche', '', 10.5]], Wd - R - 6, T + 40, 'end')]); if (mot) etiqFixes += etiquetteSvg(mot, 'dj-zone', 0); }
  // la limite de dommage du fil le plus faible : un pointillé fin, nommé à son bout — rouge quand le disjoncteur ne le protège pas
  let dommage = '', etiqDom = '';
  if (dom) { const f = faible.f, ko = f.protege === false, mot = (f.cable || 'fil') + ' · ' + (f.type || '?');
    dommage = `<path class="dj-dommage${ko ? ' ko' : ''}" d="${descente(dom)}"><title>${esc('Limite de dommage de ' + mot + (f.jugeSur === 'dommage' ? ' (table Dommage des fils)' : ' (ses intensités de service)') + (ko ? ' : le ' + (cal ? amperes(cal) : 'disjoncteur') + ' ne le protège pas' : ''))}</title></path>`;
    // nommée le long de sa pente d'abord (sous le coude), sinon le long de sa verticale
    const cands = lelong([[mot, '', 10.5]], echDom, G, [-1, 1], 1, 5), sous = c => c.y > dom.coude[1] + 8, e = P.essayer([...cands.filter(sous), ...cands.filter(c => !sous(c))]); if (e) etiqDom = etiquetteSvg(e, 'dj-dom' + (ko ? ' ko' : ''), 0); }
  const glisse = `data-glisse="${f2(dx)}" style="transform:translate(${f2(dx)}px,0)"`;
  s += `<defs><clipPath id="${clip}"><rect x="${L}" y="${T}" width="${Wd - L - R}" height="${H - T - B}"/></clipPath></defs>`
    + `<g clip-path="url(#${clip})"><g class="dj-voisins">${voisins}</g>${cal ? `<g class="dj-cal" data-cal="${cal}" ${glisse}>${bande}</g>` : ''}${dommage}</g>`
    + `<g class="dj-etiquettes">${etiqFixes}${cal ? `<g class="dj-cal-t" ${glisse}>${ticsBande}${etiqBande}</g>` : ''}${etiqDom}</g>`
    + `<g class="dj-prof">${pts}</g><g class="dj-vise" hidden><line class="dj-croix" x1="0" y1="0" x2="0" y2="0"/><line class="dj-croix" x1="0" y1="0" x2="0" y2="0"/></g>`
    + `<rect class="dj-cadre" x="${L}" y="${T}" width="${Wd - L - R}" height="${H - T - B}"/>`;
  return `<svg class="dj-svg" viewBox="0 0 ${Wd} ${H}" width="${Wd}" height="${H}" data-xlo="${G.xlo}" data-xhi="${G.xhi}" data-w="${Wd}" role="img" aria-label="${escA('Courbe de déclenchement' + (cal ? ' du ' + amperes(cal) : '') + ', le profil de charge en points')}">${s}</svg>`; }
/* LES POINTS DU PROFIL : chacun à son courant et à sa durée (le permanent sur le bord du haut : toujours), de la couleur de
   son sort, nommé à côté — sur une ligne si la place le permet, sinon le nom et les chiffres l'un sous l'autre. */
function pointsSvg(points, G, P) { const pts = points.filter(p => p.i > 0), { T } = G;
  const pos = pts.map(p => ({ p, x: G.X(p.i), y: p.t === Infinity ? T : G.Y(p.t) }));
  pos.forEach(({ p, x, y }) => { P.boite({ x0: x - 6, x1: x + 6, y0: y - 6, y1: y + 6 }); if (p.t === Infinity) P.boite({ x0: x - 8, x1: x + 8, y0: T - 18, y1: T }); });
  return pos.map(({ p, x, y }) => { const nom = p.nom, chiffres = p.t === Infinity ? amperes(p.i) : amperes(p.i) + ' · ' + secondes(p.t), coupe = nom.split(' et ');
    const variantes = [[[nom, '', 11, chiffres, 'v']], [[nom, '', 11], [chiffres, 'v', 11]]].concat(coupe.length > 1 ? [[[coupe[0] + ' et', '', 11], [coupe.slice(1).join(' et '), '', 11], [chiffres, 'v', 11]]] : []);
    const places = l => { const n = l.length, hh = (n - 1) * 12; return p.t === Infinity ? [etiquette(l, x - 9, y + 14, 'end'), etiquette(l, x + 9, y + 14, 'start'), etiquette(l, x, y + 18, 'middle')]
      : [etiquette(l, x - 9, y + 4 - hh / 2, 'end'), etiquette(l, x - 7, y - 10 - hh, 'end'), etiquette(l, x - 7, y + 16, 'end'), etiquette(l, x + 9, y + 4 - hh / 2, 'start'), etiquette(l, x, y - 11 - hh, 'middle'), etiquette(l, x, y + 18, 'middle')]; };
    const e = P.essayer(variantes.flatMap(places)), c = classeVerdict(p);
    return `<g class="dj-pt${c ? ' ' + c : ''}" data-k="${escA(p.k)}" tabindex="0" role="button" aria-label="${escA(nom + ' : ' + amperes(p.i) + (p.t === Infinity ? ', pour toujours' : ' pendant ' + secondes(p.t)) + ' — ' + motVerdict(p))}">`
      + `<circle class="dj-halo" cx="${f2(x)}" cy="${f2(y)}" r="12"/><circle class="dj-point" cx="${f2(x)}" cy="${f2(y)}" r="4.5"/></g>` + (e ? etiquetteSvg(e, 'dj-nomme' + (c ? ' ' + c : ''), 0) : ''); }).join(''); }

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
/* La bulle du survol : un titre (le courant, la durée), un sous-titre, des lignes (une par courbe, quand on les montre
   toutes : sa couleur, ce que le disjoncteur tient, la marge), un verdict. */
function carteTip(titre, sous, lignes, verdict, cls) { return `<div class="dj-tip-t"><b>${titre}</b>${sous ? `<span>${sous}</span>` : ''}</div>`
  + lignes.map(l => `<div class="dj-tip-l"><i class="${l.k || ''}${l.tirets ? ' tirets' : ''}"></i><span>${esc(l.nom)}</span><b>${esc(l.tient)}</b>${l.marge ? `<em class="${l.cls || ''}">${esc(l.marge)}</em>` : '<em></em>'}</div>`).join('')
  + (verdict ? `<div class="dj-tip-v${cls ? ' ' + cls : ''}">${verdict}</div>` : ''); }
/* Le graphique vivant : survoler un point dit son sort en une bulle courte (toutes les courbes quand on les montre) ;
   survoler une bande voisine dit ce que ce calibre ferait, un clic le retient ; ailleurs dans le cadre, un réticule lit
   le courant et la durée. Glisser un point change le courant et la durée de son état — les points et la gamme suivent en
   direct, le contrat s'écrit quand on lâche. Quand le calibre a changé depuis le dernier dessin, la bande glisse. */
function lierGraphique(fig, nom, E, lire, ecrire, retenir) { const d = E.d, svg = fig.querySelector('svg'), tip = fig.querySelector('.dj-tip'); if (!svg || !d.courbes.length) return;
  const faible = filLePlusFaible(d), G = geometrieGraphe(d, +svg.dataset.w, faible, DJ_VUE), { L, R, T, B, H } = G, W = G.W, cal = d.calibre, C = d.courbes, vise = svg.querySelector('.dj-vise');
  // la bande glisse : du décalage dessiné la dernière fois pour ce repère à celui d'aujourd'hui (à géométrie égale)
  const grps = [...svg.querySelectorAll('[data-glisse]')], geo = G.xlo + '|' + G.xhi + '|' + W, avant = DJ_ANIM.get(nom);
  if (grps.length) { const tx = +grps[0].dataset.glisse;
    if (avant && avant.geo === geo && Math.abs(avant.tx - tx) > 0.5) { grps.forEach(g => { g.style.transition = 'none'; g.style.transform = `translate(${avant.tx}px,0)`; }); void svg.getBoundingClientRect(); grps.forEach(g => { g.style.transition = ''; g.style.transform = `translate(${tx}px,0)`; }); }
    DJ_ANIM.set(nom, { tx, geo }); }
  const local = e => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
  const dansLeCadre = p => p.x >= L && p.x <= W - R && p.y >= T - 4 && p.y <= H - B;
  // la bulle se pose à droite du pointeur, à gauche quand elle déborderait ; sinon au-dessous ou au-dessus — jamais sur ce qu'elle décrit
  const montrer = (p, html) => { const rs = svg.getBoundingClientRect(), rf = fig.getBoundingClientRect(), px = p.x / W * rs.width + rs.left - rf.left, py = p.y / H * rs.height + rs.top - rf.top;
    tip.innerHTML = html; tip.hidden = false; const w = tip.offsetWidth, h = tip.offsetHeight, droite = px + 16 + w <= rf.width - 2, gauche = px - 16 - w >= 2;
    if (droite || gauche) { tip.style.left = (droite ? px + 16 : px - 16 - w) + 'px'; tip.style.top = Math.max(2, Math.min(py - 16, rf.height - h - 2)) + 'px'; return; }
    const bas = py + 16 + h <= rf.height - 2; tip.style.left = Math.max(2, Math.min(px - w / 2, rf.width - w - 2)) + 'px'; tip.style.top = (bas ? py + 16 : Math.max(2, py - 16 - h)) + 'px'; };
  const cacher = () => { tip.hidden = true; vise.hidden = true; svg.querySelectorAll('.dj-voisin.vise').forEach(g => g.classList.remove('vise')); };
  const croix = p => { const [a, b] = vise.querySelectorAll('line'); a.setAttribute('x1', f2(p.x)); a.setAttribute('x2', f2(p.x)); a.setAttribute('y1', T); a.setAttribute('y2', H - B); b.setAttribute('x1', L); b.setAttribute('x2', W - R); b.setAttribute('y1', f2(p.y)); b.setAttribute('y2', f2(p.y)); vise.hidden = false; };
  const ligneCourbe = (k, tient, marge, cls) => { const t = teinteDe(C[k], C); return { k: t.k, tirets: t.tirets, nom: C[k].nom, tient, marge, cls }; };
  // la bulle d'un point : courte — ce que le calibre tient à la courbe qui juge, le verdict ; toutes les courbes quand on les montre
  const cartePoint = pt => { const m0 = pt.marges[0]; if (!m0) return carteTip(esc(amperes(pt.i)) + (pt.t === Infinity ? ' · toujours' : ' · ' + esc(secondes(pt.t))), esc(pt.nom), [], 'pas jugé', 'info');
    const lignes = !DJ_VUE.temperatures ? [] : pt.marges.map((m, k) => pt.t === Infinity ? ligneCourbe(k, 'jusqu’à ' + amperes(m.admis), motMarge(m.marge), m.marge < 1 ? 'ko' : m.marge < d.marges.k ? 'serre' : 'ok')
      : ligneCourbe(k, m.temps === Infinity ? 'ne déclenche pas' : 'tient ' + secondes(m.temps), m.fraction > 0 ? motFraction(m.fraction) : '', m.ok === false ? 'ko' : classeFraction(m.somme)));
    const rates = pt.marges.filter(m => !m.ok).map(m => m.courbe), bilan = pt.t === Infinity ? '' : ' · ' + esc(motFraction(m0.somme)) + ' du temps consommé';
    const sous = esc(pt.nom) + (DJ_VUE.temperatures || !cal ? '' : ' — le ' + esc(amperes(cal)) + (pt.t === Infinity ? ' garantit ' + esc(amperes(m0.admis)) : m0.temps === Infinity ? ' ne déclenche pas' : ' tient ' + esc(secondes(m0.temps))) + ' à ' + esc(m0.courbe));
    const verdict = pt.ok === false ? `<em>déclenche</em> à ${rates.length === pt.marges.length ? 'toute température' : esc(rates.join(', '))}${bilan}` : pt.serre ? (pt.t === Infinity ? 'tient, sans ' + esc(nombre(d.marges.marge)) + ' % de marge' : 'tient, mais touche la courbe' + bilan) : (pt.t === Infinity ? 'ne déclenche jamais' : 'tient à toute température' + bilan);
    return carteTip(esc(amperes(pt.i)) + (pt.t === Infinity ? ' · toujours' : ' · ' + esc(secondes(pt.t))), sous, lignes, verdict, pt.ok === false ? 'ko' : pt.serre ? 'serre' : 'ok'); };
  // le réticule : à ce courant, ce que le calibre retenu tient à la courbe qui juge
  const carteReticule = (i, t) => { if (!cal) return carteTip(esc(amperes(i)) + ' · ' + esc(secondes(t)), '', [], '', '');
    if (DJ_VUE.temperatures) return carteTip(esc(amperes(i)) + ' · ' + esc(secondes(t)), 'le ' + esc(amperes(cal)) + ' tient', C.map((c, k) => { const tt = tempsDeDeclenchement(c, i / cal), x = tt === Infinity ? 0 : t / tt; return ligneCourbe(k, tt === Infinity ? 'ne déclenche pas' : secondes(tt), tt === Infinity ? '' : motFraction(x), classeFraction(x)); }), '', '');
    const tt = tempsDeDeclenchement(C[0], i / cal); return carteTip(esc(amperes(i)) + ' · ' + esc(secondes(t)), 'le ' + esc(amperes(cal)) + (tt === Infinity ? ' n’y déclenche jamais' : ' y tient ' + esc(secondes(tt))) + ' à ' + esc(C[0].nom), [], '', ''); };
  const carteVoisin = g => carteTip(esc(amperes(g.calibre)), g.valide == null ? '' : g.valide ? (g.calibre === d.meilleur.calibre ? 'tiendrait — le meilleur' : g.marge ? 'tiendrait' : 'tiendrait, serré') : 'déclencherait', [], 'cliquer pour le retenir', 'info');
  // glisser un point : le profil se rejuge en direct (les points et la gamme), le contrat s'écrit au lâcher
  let prise = null, base = null;
  const traitsDeBase = () => { const P = poseur(G), tr = C.map(c => traceLisse(c, G)), dx = G.dx(cal); if (cal) (DJ_VUE.temperatures ? tr : [tr[0], tr[tr.length - 1]]).forEach(t => t && P.traits(echantillons(t, dx, T), 2)); return P; };
  const juger = profil => { const dd = { ...d, ...verdictDisjonction(app.norme, d.courbe, cal, profil, d.contexte) }; base = base || traitsDeBase(); const P = poseur(G); base.pris.forEach(b => P.boite(b));
    svg.querySelector('.dj-prof').innerHTML = pointsSvg(dd.points, G, P);
    document.querySelectorAll(`.fi-dj[data-disj="${CSS.escape(nom)}"] .dj-chip`).forEach(b => { const g = dd.gamme.find(x => x.calibre === +b.dataset.cal); if (g) { b.classList.toggle('ok', g.valide === true && !!g.marge); b.classList.toggle('serre', g.valide === true && !g.marge); b.classList.toggle('ko', g.valide === false); } });
    return dd; };
  svg.onpointermove = e => { const p = local(e);
    if (prise) { const i = Math.max(0.01, G.iDe(Math.min(W - R, Math.max(L, p.x)))), t = G.tDe(Math.min(H - B, Math.max(T, p.y))), el = prise.etat, ri = +i.toPrecision(3), rt = +t.toPrecision(2);
      el.i = ri; if (prise.k !== 'perm') el.t = rt; const dd = juger(prise.profil), pt = dd.points.find(x => x.k === prise.k) || dd.points.find(x => x.i === ri);
      montrer(p, pt ? cartePoint(pt) : carteTip(esc(amperes(ri)) + (prise.k === 'perm' ? '' : ' · ' + esc(secondes(rt))), esc(el.nom || ''), [], '', '')); return; }
    const g = e.target.closest && e.target.closest('.dj-pt'), v = e.target.closest && e.target.closest('.dj-voisin');
    svg.querySelectorAll('.dj-voisin.vise').forEach(x => { if (x !== v) x.classList.remove('vise'); });
    if (g) { const pt = d.points.find(x => x.k === g.dataset.k); if (pt) { vise.hidden = true; montrer(p, cartePoint(pt)); return; } }
    if (v) { const gm = d.gamme.find(x => x.calibre === +v.dataset.cal); if (gm) { v.classList.add('vise'); vise.hidden = true; montrer(p, carteVoisin(gm)); return; } }
    if (!dansLeCadre(p)) { cacher(); return; }
    croix(p); montrer(p, carteReticule(G.iDe(p.x), G.tDe(p.y))); };
  svg.onpointerleave = () => { if (!prise) cacher(); };
  svg.onclick = e => { const v = e.target.closest && e.target.closest('.dj-voisin'); if (v && !prise) retenir(+v.dataset.cal); };
  svg.onpointerdown = e => { const g = e.target.closest && e.target.closest('.dj-pt'); if (!g || e.button) return;
    const profil = lire(), k = g.dataset.k, etat = k === 'perm' ? profil.perm : /^plus/.test(k) ? profil.plus[+k.slice(4)] : profil[k]; if (!etat) return;
    prise = { k, etat, profil }; svg.classList.add('tient'); try { svg.setPointerCapture(e.pointerId); } catch (_) { } e.preventDefault(); };
  const lacher = e => { if (!prise) return; const c = prise.profil; prise = null; svg.classList.remove('tient'); cacher(); try { svg.releasePointerCapture(e.pointerId); } catch (_) { } ecrire('profil de charge de ' + nom, c); };
  svg.onpointerup = lacher; svg.onpointercancel = lacher;
  // au clavier, le focus sur un point montre sa bulle
  svg.querySelectorAll('.dj-pt').forEach(g => { g.onfocus = () => { const pt = d.points.find(x => x.k === g.dataset.k), c = g.querySelector('.dj-point'); if (pt && c) montrer({ x: +c.getAttribute('cx'), y: +c.getAttribute('cy') }, cartePoint(pt)); }; g.onblur = cacher; }); }
