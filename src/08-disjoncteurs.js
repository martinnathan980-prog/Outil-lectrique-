/* ===========================================================================
   08 quinquies — LA DISJONCTION : sur la fiche d'un disjoncteur, le calibre
   que l'outil trouve, le profil de charge, le graphique — et rien à lire
   ---------------------------------------------------------------------------
   Le lecteur : « c'est à toi de trouver le calibre idéal ; il faut que ce
   soit dans le vert et que ça ne touche pas la courbe ; si on gère tout, on
   verra tout sur le graphique ». L'écran, de haut en bas :
     · LA GAMME en segments — 1, 3, 5, 7,5, 10, 15, 25 A, et le calibre du
       part number s'il est ailleurs —, chacun jugé sur le profil (une barre
       verte : tient ; ambre : tient en touchant la courbe, sans la marge ;
       rouge : déclenche ; ★ l'idéal du moteur : tient avec la marge, protège
       les fils, sélectif — ou, à défaut, celui de la charge, avec sa
       réserve). Celui du part number (d'une famille de disjoncteurs connue :
       MS3320-10 → 10 A ; NSA935401-10 est un collier) est retenu d'office ;
       un clic en retient un autre, un second clic le rend ; sans part number,
       l'idéal est retenu tout seul. Survoler un segment montre sa courbe ;
     · LE GRAPHIQUE, ampères et secondes en log-log, comme un tracé de
       sélectivité : la grille, les repères 1 min et 1 h, la zone verte (tient
       à toute température) et la bande ambre (selon la température) du
       calibre retenu, ses quatre courbes échantillonnées sur le moteur même
       (`tempsDeDeclenchement`) — l'enveloppe d'un disjoncteur compensé, 125 °C
       la plus rapide, −55 °C la plus lente —, les autres calibres en fils
       gris (un clic les retient), l'escalier du profil et ses points
       (survol : une carte avec ce que le disjoncteur tient à chaque
       température, la fraction du temps de déclenchement consommée, la
       marge ; glisser : le courant et la durée changent, la gamme suit en
       direct), le réticule qui lit le courant et la durée n'importe où, une
       légende qui isole une courbe au survol. Quand le calibre change, les
       courbes GLISSENT : elles sont tracées au calibre 1 A et le groupe se
       décale de log10(calibre) décades, en transition ;
     · LES ÉTATS en table : démarrage, transition, ceux qu'on ajoute, le
       permanent (pour toujours) — un courant, une durée, une pastille qui dit
       le sort de chacun sur la courbe. Le profil se garde avec le contrat
       (Ctrl+Z) ; l'écriture attend que le focus se pose, puis refait en place
       ce qui change (les champs restent sous les doigts) ;
     · SES FILS : ce que chacun admet par palier (2 s, 10 s, 1 min, continu),
       la case que la charge dépasse en rouge avec l'état fautif, la case que
       le disjoncteur laisse dépasser (sur la courbe lente) en ambre avec ce
       qu'il laisse passer ; et LA CHUTE EN LIGNE jusqu'à chaque équipement,
       en volts, en pourcentage, en jauge contre la chute admise. La pastille
       de la fiche relève ce qui déclenche, ce qui n'est pas protégé, la
       sélectivité manquée avec un disjoncteur voisin.
   =========================================================================== */
'use strict';

// les courbes, de la plus chaude à la plus froide : rouge, orange (les deux 23 °C, la plus lente en tirets), bleu
const RAMPE_COURBES = ['#c62828', '#d4870f', '#1f5fbf'];
const styleCourbe = (k, n) => n === 4 ? { couleur: ['#c62828', '#d4870f', '#d4870f', '#1f5fbf'][k], tirets: k === 2 }
  : { couleur: RAMPE_COURBES[Math.round(k / Math.max(1, n - 1) * (RAMPE_COURBES.length - 1))], tirets: false };
const chargeDe = nom => (app.contrat.charges && app.contrat.charges.get(nom)) || null;
/* Le part number d'un repère : celui que ses liaisons portent. */
function pnDuRepere(nom) { for (const l of verite()) { if (l.de === nom && l.pnDe) return l.pnDe; if (l.vers === nom && l.pnVers) return l.pnVers; } return ''; }
/* Les fils d'un disjoncteur, des deux côtés, avec la borne et l'autre bout. */
const filsDuDisjoncteur = nom => verite().filter(l => (l.de === nom || l.vers === nom) && l.de !== l.vers)
  .map(l => ({ cable: l.cable, type: l.type, borne: l.de === nom ? l.borneDe : l.borneVers, autre: l.de === nom ? l.vers + (l.borneVers ? ':' + l.borneVers : '') : l.de + (l.borneDe ? ':' + l.borneDe : ''), amont: l.vers === nom, l }));
/* Les disjoncteurs VOISINS d'un repère : ceux où aboutit un chemin de fils depuis lui (bus → sous-bus) ; leur calibre
   nominal (écrit, sinon le part number) sert à la sélectivité 2:1 — sans passer par l'idéal, qui dépendrait du nôtre. */
const calibreNominal = nom => { const p = chargeDe(nom); return p && p.calibre > 0 ? p.calibre : calibreDuPn(pnDuRepere(nom)); };
const disjoncteursVoisins = nom => [...new Set(cheminsDepuis(verite(), nom).map(ch => ch.bout[0]).filter(r => r && r !== nom && estDisjoncteur(r)))].map(r => ({ nom: r, calibre: calibreNominal(r) }));
/* Le calibre RETENU : celui qu'on a choisi à la main, sinon celui du part number (MS3320-10 → 10 A, si la famille est un
   disjoncteur), sinon l'idéal que le moteur donne. Rend le verdict complet (09 bis, jugé avec ses fils et ses voisins),
   le profil, la famille du part number, d'où vient le calibre, et ses fils jugés. */
function disjonctionDe(nom) { const profil = chargeDe(nom), ecrit = profil && profil.calibre > 0 ? profil.calibre : null, famille = familleDuPn(pnDuRepere(nom)), pn = famille ? famille.calibre : null, voisins = disjoncteursVoisins(nom);
  const contexte = { fils: filsDuDisjoncteur(nom), hyp: app.simu, autres: voisins.map(v => v.calibre).filter(c => c > 0) };
  let d = verdictDisjonction(app.norme, '', ecrit || pn || 0, profil, contexte);
  const calibre = ecrit || pn || d.calibreIdeal || null; if (calibre && calibre !== d.calibre) d = verdictDisjonction(app.norme, '', calibre, profil, contexte);
  return { ...d, profil, ecrit, pn, famille, voisins, contexte, origine: ecrit ? 'main' : pn ? 'pn' : calibre ? 'ideal' : '', fils: protectionDesFils(app.norme, calibre, profil, contexte.fils, app.simu) }; }
const calibreDe = nom => disjonctionDe(nom).calibre;
const pourcent = x => nombre(Math.round(x * 100)) + ' %';
// « pour 10 s », « pour 1 min », « en continu »
const pourPalier = p => p === 2 ? 'pour 2 s' : p === 10 ? 'pour 10 s' : p === 60 ? 'pour 1 min' : 'en continu';
const motFacteur = f => Math.abs(f - 1) < 1e-9 ? '' : ' (× ' + nombre(Math.round(f * 100) / 100) + ')';
/* Un temps, lisible : « 12 ms », « 3,2 s », « 2,1 min », « jamais ». */
function secondes(t) { if (!isFinite(t)) return 'jamais'; if (t < 1) return nombre(Math.round(t * 1000)) + ' ms'; if (t < 60) return nombre(Math.round(t * 10) / 10) + ' s';
  if (t < 3600) return nombre(Math.round(t / 6) / 10) + ' min'; return nombre(Math.round(t / 360) / 10) + ' h'; }
const amperes = i => nombre(Math.round(i * 100) / 100) + ' A', amperes1 = i => nombre(Math.round(i * 10) / 10) + ' A';
const majuscule = s => s ? s[0].toUpperCase() + s.slice(1) : s;
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
      : !d.avecMarge ? `${amperes(d.calibre)}${pnMot} tient mais touche la courbe (${d.somme > MARGE_FRACTION ? motFraction(d.somme) + ' du temps de déclenchement consommé' : 'sans 10 % de marge de courant'}) : l’idéal est un ${amperes(d.calibreIdeal)}`
      : `${amperes(d.calibre)}${pnMot} tient ; l’idéal est un ${amperes(d.calibreIdeal)} (sélectivité avec le voisin)` }); }
  d.voisins.forEach(v => { if (v.calibre > 0 && d.calibre > 0 && Math.max(v.calibre, d.calibre) < SELECTIVITE * Math.min(v.calibre, d.calibre) - 1e-9) out.push({ niveau: 'att', texte: `sélectivité avec ${v.nom} (${amperes(v.calibre)}) : l’amont devrait faire au moins le double de l’aval` }); });
  d.fils.forEach(f => { const nomF = (f.cable || 'fil sans numéro') + (f.type ? ' (' + f.type + ')' : '');
    if (f.verdict === 'fil') out.push({ niveau: 'ko', texte: `${nomF} : ${f.pire.nom} ${amperes(f.pire.i)}${f.pire.t === Infinity ? '' : ' / ' + secondes(f.pire.t)} > ${amperes(f.pire.admise)} admis ${pourPalier(f.pire.palier)}${motFacteur(f.pire.palier === Infinity ? f.facteur : f.facteurCourt)}` });
    else if (f.verdict === 'calibre') out.push({ niveau: 'att', texte: `${nomF} : ${amperes(f.continu)} admis en continu${motFacteur(f.facteur)} < calibre ${amperes(d.calibre)} — pas protégé en surcharge` });
    else if (f.protege === false) { const x = f.pireLaisse; out.push({ niveau: 'att', texte: `${nomF} : pas protégé en surcharge brève — le ${amperes(d.calibre)} laisse passer ${amperes(x.courant)} ${pourPalier(x.palier)} à ${f.courbeLente}, le fil admet ${amperes(x.admise)}` }); } });
  return out; }
/* CE QUI ALIMENTE un fil : le disjoncteur en amont (le premier dont un chemin passe par ce fil), son courant permanent
   et son courant de pointe — ce qu'il faut pour juger la charge et la chute du fil. */
function alimentationDe(l) { if (!l) return null; const V = verite();
  for (const cb of reperesDe(V).filter(estDisjoncteur)) { if (!cheminsDepuis(V, cb).some(ch => ch.segments.some(s => s.fil === l))) continue;
    const d = disjonctionDe(cb), pts = d.points.length ? d.points : pointsDuProfil(d.profil), perm = pts.find(p => p.t === Infinity), pointe = pts[0];
    return { nom: cb, calibre: d.calibre, perm: perm ? perm.i : null, pointe: pointe && pointe.t !== Infinity ? pointe : null, points: pts }; }
  return null; }

/* ---- la section de la fiche -------------------------------------------------------- */
// le sort d'un point du profil, en classe : ok, serre, ko — rien s'il n'est pas jugé
const classeVerdict = p => !p || p.ok == null ? '' : p.ok === false ? ' ko' : p.serre ? ' serre' : ' ok';
const motVerdict = p => !p || p.ok == null ? 'pas jugé' : p.ok === false ? 'déclenche' : p.serre ? 'tient, mais touche la courbe' : 'tient';
/* LA GAMME : sept segments, chacun jugé ; le retenu est pressé ; l'idéal porte l'étoile ; dessous, d'où vient le
   calibre retenu, et l'idéal s'il est ailleurs. */
const RESERVES = { fils: 'les fils ne suivent pas', selectivite: 'sans sélectivité', serre: 'serré' };
function gammeHtml(nom, d) {
  const mot = g => g.valide == null ? '' : g.valide ? (g.ideal ? 'l’idéal' + (d.reserve ? ' pour la charge' : '') + (g.serre ? ', en touchant la courbe' : ' — tient sans toucher la courbe') : g.serre ? 'tient, mais touche la courbe' : 'tient') + (g.fils === false ? ' · ne protège pas tous les fils' : '') + (g.selectif === false ? ' · pas 2:1 avec le voisin' : '') : 'déclenche';
  const segs = d.gamme.map(g => `<button class="dj-chip${g.valide === true ? ' ok' : g.valide === false ? ' ko' : ''}${g.serre ? ' serre' : ''}${g.ideal ? ' ideal' : ''}" data-cal="${g.calibre}" aria-pressed="${g.calibre === d.calibre}" title="${escA(amperes(g.calibre) + (mot(g) ? ' : ' + mot(g) : '') + (g.somme != null ? ' · ' + motFraction(g.somme) + ' du temps de déclenchement consommé' : '') + (g.calibre === d.calibre ? ' · retenu' : ' · cliquer pour le retenir'))}">${g.ideal ? '<i aria-label="idéal">★</i>' : ''}<b>${nombre(g.calibre)}</b></button>`).join('');
  const dou = d.origine === 'pn' ? `part number <b>${esc(pnDuRepere(nom))}</b>${d.famille ? ` · <span title="${escA(d.famille.norme + (d.famille.compense ? ' · compensé en température' : ' · non compensé') + ' · ' + d.famille.tmin + ' à ' + d.famille.tmax + ' °C')}">${esc(d.famille.famille)}</span>` : ''}` : d.origine === 'main' ? 'choisi à la main' : d.origine === 'ideal' ? 'l’idéal, trouvé par l’outil' : 'à choisir';
  const titreIdeal = d.reserve === 'fils' ? 'Le plus petit calibre qui tient la charge avec sa marge ; aucun ne protège aussi tous les fils : c’est le fil qu’il faut changer' : d.reserve === 'selectivite' ? 'Le plus petit calibre qui tient la charge avec sa marge ; aucun n’est aussi à 2:1 avec le disjoncteur voisin' : d.reserve === 'serre' ? 'Aucun calibre ne tient avec la marge (10 % de courant, 75 % du temps de déclenchement) : le plus petit qui tient' : 'Le plus petit calibre qui tient la charge avec sa marge, protège les fils et reste sélectif';
  const ideal = d.sansCourbe ? '' : d.calibreIdeal ? `<span title="${escA(titreIdeal)}"><i>★</i> ${d.calibre === d.calibreIdeal ? 'l’idéal' : 'l’idéal : <b>' + esc(amperes(d.calibreIdeal)) + '</b>'}${d.reserve ? ' · <em>' + RESERVES[d.reserve] + '</em>' : ''}</span>` : d.sansProfil ? '' : 'aucun calibre ne tient';
  return `<div class="dj-gamme"><div class="dj-gamme-t"><span class="fi-nomen-t">calibre (A)</span><span class="dj-ideal">${ideal}</span></div>`
    + `<div class="dj-chips" role="group" aria-label="Calibre, en ampères">${segs}</div><div class="dj-dou">${d.calibre ? `<b>${esc(amperes(d.calibre))}</b> · ` : ''}${dou}</div></div>`; }
/* LES ÉTATS : une table — la pastille (le sort du point sur la courbe), le nom, le courant, la durée ; le permanent
   dure toujours ; ceux qu'on ajoute ont un nom qu'on écrit et une croix. */
function etatsHtml(d) { const E = etatsDuProfil(d.profil), parI = new Map(d.points.map(p => [p.i, p]));
  const ligne = e => { const plus = /^plus/.test(e.k), p = e.i > 0 ? parI.get(e.i) : null, val = q => e[q] != null && isFinite(e[q]) ? nombre(e[q]) : '';
    return `<div class="dj-etat${e.k === 'perm' ? ' perm' : ''}" data-k="${e.k}" role="row"><i class="dj-verdict${classeVerdict(p)}" title="${escA(motVerdict(p))}"></i>`
      + (plus ? `<input class="dj-nom" data-dj="${e.k}" data-q="nom" value="${escA(e.nom)}" aria-label="Nom de l’état" spellcheck="false">` : `<span class="dj-nom">${esc(majuscule(e.nom))}</span>`)
      + `<label class="dj-champ"><input data-dj="${e.k}" data-q="i" value="${escA(val('i'))}" inputmode="decimal" placeholder="—" aria-label="${escA(e.nom + ' : courant en ampères')}"><i>A</i></label>`
      + (e.k === 'perm' ? '<span class="dj-inf" title="pour toujours">∞</span>' : `<label class="dj-champ"><input data-dj="${e.k}" data-q="t" value="${escA(val('t'))}" inputmode="decimal" placeholder="—" aria-label="${escA(e.nom + ' : durée en secondes')}"><i>s</i></label>`)
      + (plus ? `<button class="dj-x" data-x="${e.k}" aria-label="Retirer cet état" title="Retirer cet état">×</button>` : '<span></span>') + '</div>'; };
  return `<div class="dj-etats" role="table" aria-label="Profil de charge"><div class="dj-entete" role="row"><span class="fi-nomen-t">profil de charge</span><span>courant</span><span>durée</span><span></span></div>${E.map(ligne).join('')}`
    + `<button class="fi-lien dj-plus" id="dj-plus">+ un état</button></div>`; }
/* SES FILS : ce que chacun admet par palier (la norme des fils, déclassée comme la simulation — l'ambiante sur le
   continu seulement), la case que la charge dépasse en rouge avec l'état qui la dépasse ; en ambre, la case que le
   disjoncteur laisse dépasser sur la courbe lente, avec ce qu'il laisse passer, et le continu sous le calibre. */
const PALIERS_FIL = [[2, 'i2s', '2 s'], [10, 'i10s', '10 s'], [60, 'i1min', '1 min'], [Infinity, 'intensite', 'continu']];
/* `vt` : borne → barrette à poser sur cette borne (un dédoublement), étiquetée comme sur la fiche d'un équipement. */
function filsHtml(d, vt) { if (!d.fils.length) return '';
  const li = d.fils.map(f => { const k = f.l ? cleFil(f.l) : '', tag = vt && vt.get(String(f.borne));
    // chaque palier : ce que le fil admet ; en ambre ce que le disjoncteur laisse dépasser, le chiffre sur la case la pire
    const cases = f.fil ? PALIERS_FIL.filter(([, q]) => f.fil[q] != null).map(([pal, q, mot]) => { const ko = f.phases.some(p => !p.ok && p.palier === pal), lp = f.laisse.find(x => x.palier === pal), att = (lp && !lp.ok) || (pal === Infinity && f.verdict === 'calibre');
      return `<span class="dj-pal${ko ? ' ko' : att ? ' att' : ''}" title="${escA('admis ' + pourPalier(pal) + (lp ? ' · le ' + amperes(d.calibre) + ' laisse passer ' + amperes1(lp.courant) + ' à ' + f.courbeLente : ''))}"><b>${esc(amperes(f.fil[q] * (pal === Infinity ? f.facteur : f.facteurCourt)))}</b><i>${mot}</i>${lp && !lp.ok && f.pireLaisse && lp.palier === f.pireLaisse.palier ? `<em>laisse ${esc(amperes1(lp.courant))}</em>` : ''}</span>`; }).join('') : '';
    const dep = f.verdict === 'fil' ? `<span class="dj-dep ko">${esc(f.pire.nom)} ${esc(amperes(f.pire.i))}${f.pire.t === Infinity ? '' : ' · ' + esc(secondes(f.pire.t))}</span>`
      : f.verdict === 'calibre' ? `<span class="dj-dep att">sous le calibre ${esc(amperes(d.calibre))} : pas protégé en surcharge</span>` : f.protege === false ? `<span class="dj-dep att">pas protégé en surcharge brève (${esc(f.courbeLente)})</span>` : f.verdict === 'inconnu' ? '<span class="dj-dep att">fil inconnu de la norme</span>' : '';
    const titre = (f.cable || 'fil') + (f.type ? ' · ' + f.type : '') + (f.fil ? ' · ' + amperes(f.continu) + ' en continu' + motFacteur(f.facteur) : '') + ' — voir sur le plan';
    return `<li class="fi-fil${f.verdict === 'fil' ? ' ko' : ''}"${k ? ` data-i="${k}" tabindex="0" role="button" title="${escA(titre)}"` : ''}><span class="fi-ct"><b>${esc(f.borne)}</b></span>${puceFil(f)}<span class="fi-type">${esc(f.type || '—')}</span>`
      + `<span class="fi-dest${f.amont ? ' amont' : ''}">${ico('fleche')}<span>${esc(f.autre)}</span>${tag ? `<span class="fi-tag" title="Barrette à poser sur cette borne">${esc(tag)}</span>` : ''}</span><span class="fi-w">${esc(f.cable || '')}</span><div class="dj-admet">${cases}${dep}</div></li>`; }).join('');
  const courts = [...new Set(d.fils.map(f => motFacteur(f.facteurCourt)))], continus = [...new Set(d.fils.map(f => motFacteur(f.facteur)))];
  const declasse = courts.length === 1 && courts[0] ? ', déclassés' + courts[0] + (continus.length === 1 && continus[0] !== courts[0] ? ', le continu' + continus[0] : '') : courts.some(Boolean) || continus.some(Boolean) ? ', déclassés' : '';
  return `<ul class="fi-liste dj-fils"><li class="fi-groupe">ses fils · ce qu’ils admettent${declasse}</li>${li}</ul>`; }
function ficheDisjonction(nom, vt) { const d = disjonctionDe(nom);
  return `<section class="fi-cadre fi-dj">${gammeHtml(nom, d)}${d.courbes.length ? graphiqueDisjonction(d) : '<p class="fi-note">Aucune courbe de disjonction dans la norme.</p>'}${etatsHtml(d)}${filsHtml(d, vt)}${chutesHtml(nom, d)}</section>`; }
/* LA CHUTE EN LIGNE depuis le disjoncteur, comme la feuille du lecteur : chaque chemin jusqu'à un équipement, à
   travers les prises de coupure et les barrettes, au courant permanent du profil (sinon le calibre, sinon l'hypothèse) :
   la chute en volts et en pourcentage, une jauge contre la chute admise. */
function chutesHtml(nom, d) { const H = app.simu || HYPOTHESES, I = d.profil && d.profil.perm && d.profil.perm.i > 0 ? d.profil.perm.i : d.calibre > 0 ? d.calibre : H.courant;
  const cs = chutesDepuis(app.norme, verite(), nom, I, H); if (!cs.length) return ''; const admis = cs[0].admis, mV = u => nombre(Math.round(u * 1000) / 1000) + ' V';
  const li = cs.map(c => { const detail = c.segments.map(s => s.fil ? `${s.fil.cable || 'fil'} : ${s.dU != null ? mV(s.dU) : '?'} (${nombre(Math.round(s.longueur * 100) / 100)} m${s.reelle ? '' : ', hypothèse'})` : `${s.passage} : ${s.dU != null ? mV(s.dU) : 'contact inconnu'}`).join(' · ');
    const part = c.dU != null && admis ? Math.min(1, c.dU / admis) : 0, chemin = c.mots.replace(/ → [^→]*$/, '');
    const notes = (c.inconnus.length ? [`<em>${c.inconnus.length} inconnu${c.inconnus.length > 1 ? 's' : ''}</em>`] : []).concat(c.trop ? [`<em class="ko">dépasse ${esc(volts(admis))}</em>`] : !c.fini ? ['<em>chemin sans fin</em>'] : []);
    return `<li class="fi-fil${c.trop ? ' ko' : ''}" title="${escA(detail + (c.inconnus.length ? ' — ' + c.inconnus.join(' ; ') : ''))}"><span class="fi-ct"><b>${esc(c.bout[0])}</b>${c.bout[1] ? `<i>${esc(c.bout[1])}</i>` : ''}</span>`
      + `<span class="dj-jauge"${admis ? '' : ' hidden'} aria-hidden="true"><i style="width:${(part * 100).toFixed(1)}%"></i></span><b class="dj-du">${c.dU != null ? esc(volts(c.dU)) : '—'}</b><span class="dj-pct">${c.pct != null ? esc(nombre(Math.round(c.pct * 10) / 10)) + ' %' : ''}</span>`
      + `<span class="dj-chemin">${esc(chemin)}${notes.length ? ' · ' + notes.join(' · ') : ''}</span></li>`; }).join('');
  return `<ul class="fi-liste dj-chutes"><li class="fi-groupe">chute en ligne · ${esc(nombre(I))} A${H.tension ? ' sous ' + esc(nombre(H.tension)) + ' V' : ''}${admis != null ? ' · admise ' + esc(volts(admis)) : ''}</li>${li}</ul>`; }

/* ---- le graphique ------------------------------------------------------------------- */
/* La géométrie : ampères en abscisse (log), secondes en ordonnée (log, 10 ms à 10 000 s). L'abscisse couvre toute la
   gamme (la moitié du plus petit calibre, vingt fois le plus grand) et le profil : elle ne bouge pas quand le calibre
   change, et les courbes peuvent glisser. */
const DJ = { W: 400, H: 322, L: 44, R: 12, T: 22, B: 34, ylo: -2, yhi: 4 };
function geometrieDisjonction(d) { const P = d.points.filter(p => p.i > 0);
  let lo = Math.min(CALIBRES[0] * 0.5, ...P.map(p => p.i / 3)), hi = Math.max(CALIBRES[CALIBRES.length - 1] * 20, ...P.map(p => p.i * 3));
  lo = Math.pow(10, Math.floor(Math.log10(lo) * 2) / 2); hi = Math.pow(10, Math.ceil(Math.log10(hi) * 2) / 2);
  const xlo = Math.log10(lo), xhi = Math.log10(hi), { W, H, L, R, T, B, ylo, yhi } = DJ, kx = (W - L - R) / (xhi - xlo), ky = (H - T - B) / (yhi - ylo);
  const X = i => L + (Math.log10(i) - xlo) * kx, Y = t => T + (yhi - Math.max(ylo, Math.min(yhi, Math.log10(t)))) * ky;
  return { lo, hi, xlo, xhi, kx, ky, X, Y, xb: i => Math.min(W - R, Math.max(L, X(i))), iDe: x => Math.pow(10, xlo + (x - L) / kx), tDe: y => Math.pow(10, yhi - (y - T) / ky), dx: cal => Math.log10(cal) * kx }; }
/* Le tracé d'une courbe au calibre 1 A (le multiple vaut l'ampère) : une verticale depuis le haut du cadre jusqu'au
   premier point (en dessous, le disjoncteur ne déclenche jamais), puis la courbe échantillonnée tous les deux pixels
   sur `tempsDeDeclenchement` — le dessin est exactement ce que le moteur calcule, extrapolation comprise — jusqu'au
   bas du cadre. Rend le chemin et ses points ; le groupe qui le porte se décale ensuite de log10(calibre) décades. */
function traceCourbe(c, G) { const { W, T, H, B } = DJ, x0 = G.X(c.points[0].m), pts = [[x0, T], [x0, G.Y(c.points[0].t)]];
  for (let x = x0 + 2; x < W + 400; x += 2) { const y = G.Y(tempsDeDeclenchement(c, G.iDe(x))); pts.push([x, y]); if (y >= H - B - 1e-6) break; }
  return { pts, d: 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join(' L') }; }
/* L'escalier du profil et ses points : du permanent (en haut : pour toujours) vers le bas — à chaque point, descendre
   à sa durée puis aller à droite à son courant. Le point fautif en rouge, le point serré en ambre. */
function profilSvg(d, G) { const P = d.points.filter(p => p.i > 0).slice().sort((a, b) => a.i - b.i), { W, T, H, B } = DJ; if (!P.length) return '';
  let x = G.xb(P[0].i), y = P[0].t === Infinity ? T : G.Y(P[0].t), path = `M${f1(x)} ${f1(y)}`, ronds = '';
  P.forEach((p, k) => { if (k) { y = G.Y(p.t); path += ` L${f1(x)} ${f1(y)}`; x = G.xb(p.i); path += ` L${f1(x)} ${f1(y)}`; }
    // l'étiquette à gauche du point, dans la zone qui tient (vide) — à droite seulement près du bord gauche
    const haut = y <= T + 1e-6, cy = haut ? T + 5 : y, droite = x < W * 0.36;
    ronds += `<g class="dj-pt${classeVerdict(p)}" data-k="${escA(p.k)}" tabindex="0" role="button" aria-label="${escA(p.nom + ' : ' + amperes(p.i) + (p.t === Infinity ? ', pour toujours' : ' pendant ' + secondes(p.t)) + ' — ' + motVerdict(p))}">`
      + `<circle class="dj-halo" cx="${f1(x)}" cy="${f1(cy)}" r="13"/><circle class="dj-aura" cx="${f1(x)}" cy="${f1(cy)}" r="9"/><circle class="dj-point" cx="${f1(x)}" cy="${f1(cy)}" r="4.5"/>`
      + `<text class="dj-etiq" x="${f1(droite ? x + 10 : x - 10)}" y="${f1(cy + (haut ? 12 : -7))}" text-anchor="${droite ? 'start' : 'end'}">${esc(p.nom)}</text></g>`; });
  path += ` L${f1(x)} ${H - B}`;
  return `<path class="dj-systeme-halo" d="${path}"/><path class="dj-systeme" d="${path}"/>${ronds}`; }
let DJ_CLIP = 0;
function graphiqueDisjonction(d) { const G = geometrieDisjonction(d), { W, H, L, R, T, B, ylo, yhi } = DJ, cal = d.calibre, clip = 'dj-clip-' + (++DJ_CLIP);
  let s = `<rect class="dj-fond" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}"/>`;
  // la grille : en abscisse chaque décade (majeure à 1, mineures de 2 à 9, étiquettes à 1, 2 et 5) ; en ordonnée les
  // décades et 2, 5 entre elles ; les repères 1 min et 1 h
  const etiq = v => v >= 1000 ? String(Math.round(v)).replace(/(\d)(?=(\d{3})+$)/g, '$1 ') : nombre(v), grads = [];
  for (let e = Math.floor(G.xlo); e <= Math.ceil(G.xhi); e++) for (let m = 1; m <= 9; m++) { const v = m * Math.pow(10, e); if (v < G.lo - 1e-9 || v > G.hi + 1e-9) continue; const x = G.X(v);
    s += `<line class="dj-grille ${m === 1 ? 'maj' : m === 2 || m === 5 ? 'min' : 'fin'}" x1="${f1(x)}" y1="${T}" x2="${f1(x)}" y2="${H - B}"/>`;
    if (m === 1 || m === 2 || m === 5) grads.push({ v, x, m, ancre: v >= G.hi * 0.99 ? 'end' : v <= G.lo * 1.01 ? 'start' : 'middle' }); }
  // les étiquettes de l'abscisse : les décades d'abord, puis 2 et 5 là où elles ne chevauchent rien
  const poses = []; grads.sort((a, b) => a.m - b.m || a.x - b.x).forEach(g => { const texte = etiq(g.v), l = texte.length * 5.2, x0 = g.ancre === 'end' ? g.x - l : g.ancre === 'start' ? g.x : g.x - l / 2, x1 = x0 + l;
    if (poses.some(p => x0 < p[1] + 4 && x1 > p[0] - 4)) return; poses.push([x0, x1]); s += `<text class="dj-grad" x="${f1(g.x)}" y="${H - B + 11}" text-anchor="${g.ancre}">${texte}</text>`; });
  for (let e = ylo; e <= yhi; e++) { const y = f1(G.Y(Math.pow(10, e))); s += `<line class="dj-grille maj" x1="${L}" y1="${y}" x2="${W - R}" y2="${y}"/><text class="dj-grad" x="${L - 6}" y="${+y + 3}" text-anchor="end">${etiq(Math.pow(10, e))}</text>`;
    if (e < yhi) [2, 5].forEach(m => { const ym = f1(G.Y(m * Math.pow(10, e))); s += `<line class="dj-grille min" x1="${L}" y1="${ym}" x2="${W - R}" y2="${ym}"/>`; }); }
  // les repères 1 min et 1 h, nommés à gauche sous leur trait (la zone qui tient est vide là)
  [[60, '1 min'], [3600, '1 h']].forEach(([t, mot]) => { const y = f1(G.Y(t)); s += `<line class="dj-repere" x1="${L}" y1="${y}" x2="${W - R}" y2="${y}"/><text class="dj-repere-t" x="${L + 4}" y="${+y + 9}">${mot}</text>`; });
  s += `<text class="dj-titre" x="${L + (W - L - R) / 2}" y="${H - 3}" text-anchor="middle">courant (A)</text><text class="dj-titre" x="2" y="${T - 8}" text-anchor="start">temps (s)</text>`;
  // les deux régions, nommées dans leurs coins vides : en bas à gauche on tient, en haut à droite on déclenche
  s += `<text class="dj-zone-t ok" x="${L + 7}" y="${H - B - 7}">tient</text><text class="dj-zone-t ko" x="${W - R - 7}" y="${T + 13}" text-anchor="end">déclenche</text>`;
  s += `<rect class="dj-capte" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent"/>`;
  // les courbes au calibre 1 A, dans un cadre qui coupe au bord du graphique (et laisse la marge du haut aux étiquettes)
  const traces = d.courbes.map(c => traceCourbe(c, G)), rapide = traces[0], lente = traces[traces.length - 1], n = d.courbes.length;
  s += `<defs><clipPath id="${clip}"><rect x="${L}" y="0" width="${W - L - R}" height="${H - B}"/></clipPath></defs><g clip-path="url(#${clip})">`;
  // les calibres de la gamme en fantômes : la courbe la plus rapide de chacun, décalée ; le retenu est caché (ses
  // vraies courbes sont là) ; les étiquettes qui se chevaucheraient attendent le survol
  const x0 = rapide.pts[0][0], gardes = cal ? [x0 + G.dx(cal)] : [], ordre = d.gamme.slice().sort((a, b) => Math.abs(Math.log10(a.calibre / (cal || 1))) - Math.abs(Math.log10(b.calibre / (cal || 1))));
  const visibles = new Set(); ordre.forEach(g => { if (g.calibre === cal) return; const x = x0 + G.dx(g.calibre); if (gardes.every(gx => Math.abs(gx - x) >= 15)) { gardes.push(x); visibles.add(g.calibre); } });
  s += '<g class="dj-fantomes">' + d.gamme.map(g => `<g class="dj-fantome${g.valide === true ? ' ok' : g.valide === false ? ' ko' : ''}${g.serre ? ' serre' : ''}${g.calibre === cal ? ' retenu' : ''}" data-cal="${g.calibre}" style="transform:translate(${f1(G.dx(g.calibre))}px,0)">`
    + `<path class="dj-prise" d="${rapide.d}"/><path d="${rapide.d}"/><text class="dj-fantome-t${visibles.has(g.calibre) ? '' : ' cache'}" x="${f1(x0)}" y="${T - 7}" text-anchor="middle">${nombre(g.calibre)}</text></g>`).join('') + '</g>';
  if (cal) { const tx = f1(G.dx(cal)), fin = rapide.pts[rapide.pts.length - 1], finL = lente.pts[lente.pts.length - 1];
    const zone = `M${L - 400} ${T} L${rapide.d.slice(1)} L${f1(fin[0])} ${H - B} L${L - 400} ${H - B} Z`;
    const bande = `M${rapide.d.slice(1)} L${f1(fin[0])} ${H - B} L${f1(finL[0])} ${H - B} L${lente.pts.slice().reverse().map(p => f1(p[0]) + ' ' + f1(p[1])).join(' L')} Z`;
    s += `<g class="dj-cal" data-tx="${tx}" data-cal="${cal}" style="transform:translate(${tx}px,0)"><path class="dj-zone" d="${zone}"/>${n > 1 ? `<path class="dj-bande" d="${bande}"/>` : ''}`
      + d.courbes.map((c, k) => { const st = styleCourbe(k, n); return `<path class="dj-courbe${st.tirets ? ' tirets' : ''}" data-courbe="${k}" style="stroke:${st.couleur}" d="${traces[k].d}"><title>${escA(c.nom + ' · ' + amperes(cal))}</title></path>`; }).join('')
      + `<text class="dj-cal-etiq" x="${f1(x0)}" y="${T - 7}" text-anchor="middle">${nombre(cal)}</text></g>`; }
  s += '</g>';
  s += `<g class="dj-prof">${profilSvg(d, G)}</g>`;
  s += `<g class="dj-vise" hidden><line class="dj-croix" x1="0" y1="0" x2="0" y2="0"/><line class="dj-croix" x1="0" y1="0" x2="0" y2="0"/></g>`;
  s += `<rect class="dj-axe" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="none"/>`;
  const legende = d.courbes.map((c, k) => { const st = styleCourbe(k, n); return `<button class="dj-leg" data-courbe="${k}" title="${escA('Isoler la courbe ' + c.nom)}"><i class="${st.tirets ? 'tirets' : ''}" style="--c:${st.couleur}"></i>${esc(c.nom)}</button>`; }).join('')
    + '<span class="dj-leg"><i class="zone ok"></i>tient à toute température</span>' + (n > 1 ? '<span class="dj-leg"><i class="zone bande"></i>selon la température</span>' : '')
    + (d.points.length ? '<span class="dj-leg"><i class="prof"></i>profil</span>' : '') + '<span class="dj-leg"><i class="fant"></i>autres calibres</span>';
  return `<figure class="dj-graphe" data-xlo="${G.xlo}" data-xhi="${G.xhi}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbes de disjonction du calibre retenu, les autres calibres en gris, et le profil de charge">${s}</svg><div class="dj-tip" hidden></div><figcaption class="dj-legende">${legende}</figcaption></figure>`; }

/* ---- les gestes --------------------------------------------------------------------- */
// le dernier décalage des courbes dessiné par repère : quand il change, les courbes glissent de l'ancien au nouveau
const DJ_ANIM = new Map();
/* Les segments, les états, le graphique : chaque changement s'écrit au contrat (Ctrl+Z le défait). L'écriture attend que
   le focus se pose : si l'on est passé à un autre champ de la fiche, la gamme, le graphique, les pastilles des états,
   les fils et les chutes se refont EN PLACE (les champs restent sous les doigts) ; sinon la fiche entière se refait. */
function lierDisjonction(nom) { const box = $('ba-equip'), sec = box.querySelector('.fi-dj'); if (!sec) return;
  const E = { d: disjonctionDe(nom) };
  const lire = () => { const c = { calibre: E.d.ecrit || null, plus: [] };
    const num = (k, q) => { const el = sec.querySelector(`[data-dj="${k}"][data-q="${q}"]`); const x = el ? nombreLu(el.value) : null; return x != null && x >= 0 ? x : null; };
    ['dem', 'trans', 'perm'].forEach(k => { c[k] = { i: num(k, 'i'), t: k === 'perm' ? null : num(k, 't') }; });
    sec.querySelectorAll('.dj-etat[data-k^="plus"]').forEach(el => { const k = el.dataset.k, n = el.querySelector('[data-q="nom"]'); c.plus.push({ nom: n ? n.value.trim() : '', i: num(k, 'i'), t: num(k, 't') }); });
    return c; };
  const remplacer = (cls, html, apres) => { const el = sec.querySelector('.' + cls); if (el) { if (html) el.outerHTML = html; else el.remove(); } else if (html) apres.insertAdjacentHTML('afterend', html); };
  // les barrettes à poser sur ses bornes, pour étiqueter ses fils comme la fiche d'un équipement
  const vt = () => { const m = new Map(); liaisonsDuPlan().forEach(l => { if (l.origine === null && l.de === nom && l.vers === l.aPoser && l.borneVers === '1') m.set(String(l.borneDe), l.aPoser); }); return m; };
  const rafraichir = () => { E.d = disjonctionDe(nom);
    remplacer('dj-gamme', gammeHtml(nom, E.d)); if (E.d.courbes.length) remplacer('dj-graphe', graphiqueDisjonction(E.d));
    const parI = new Map(E.d.points.map(p => [p.i, p])); etatsDuProfil(E.d.profil).forEach(e => { const el = sec.querySelector(`.dj-etat[data-k="${e.k}"] .dj-verdict`), p = e.i > 0 ? parI.get(e.i) : null; if (el) { el.className = 'dj-verdict' + classeVerdict(p); el.title = motVerdict(p); } });
    remplacer('dj-fils', filsHtml(E.d, vt()), sec.querySelector('.dj-etats')); remplacer('dj-chutes', chutesHtml(nom, E.d), sec.querySelector('.dj-fils') || sec.querySelector('.dj-etats'));
    lierPuces(); lierGraphique(sec, nom, E, lire, ecrire); };
  // on écrit au contrat ; la fiche se refait (`rafraichirCarte`, 08) sauf si l'on est dans un champ de la fiche : alors
  // seulement ce qui change, en place, les champs restant sous les doigts
  const ecrire = (quoi, c) => setTimeout(() => { histPush(quoi); app.contrat.charges.set(nom, c); apresEdition();
    const a = document.activeElement; if (a && a.tagName === 'INPUT' && box.contains(a)) rafraichir(); }, 0);
  // les segments : retenir un calibre ; presser celui qui l'est déjà rend celui du part number (ou l'idéal) ; en
  // survoler un montre sa courbe
  const retenir = cal => { const d = E.d, c = lire(); c.calibre = cal === d.calibre ? null : cal; if (c.calibre === (d.ecrit || null)) return;
    ecrire('calibre de ' + nom, c); dire(c.calibre ? nom + ' : calibre ' + amperes(c.calibre) + ', choisi à la main.' : nom + ' : calibre ' + amperes(d.pn || d.calibreIdeal) + ' repris ' + (d.pn ? 'du part number.' : 'de l’idéal.')); };
  const viserCal = cal => sec.querySelectorAll('.dj-fantome').forEach(g => g.classList.toggle('vise', cal != null && +g.dataset.cal === cal));
  const lierPuces = () => { sec.querySelectorAll('.dj-chip').forEach(b => { b.onclick = () => retenir(+b.dataset.cal); b.onpointerenter = b.onfocus = () => viserCal(+b.dataset.cal); b.onpointerleave = b.onblur = () => viserCal(null); });
    sec.querySelectorAll('.dj-fantome').forEach(g => g.onclick = () => retenir(+g.dataset.cal)); };
  sec.querySelectorAll('input').forEach(el => el.addEventListener('change', () => ecrire('profil de charge de ' + nom, lire())));
  const plus = $('dj-plus'); if (plus) plus.onclick = () => { const c = lire(); c.plus.push({ nom: 'État ' + (c.plus.length + 3), i: null, t: null }); ecrire('un état de plus sur ' + nom, c); };
  sec.querySelectorAll('.dj-x').forEach(b => b.onclick = () => { const c = lire(), j = +b.dataset.x.slice(4); c.plus.splice(j, 1); ecrire('un état de moins sur ' + nom, c); });
  lierPuces(); lierGraphique(sec, nom, E, lire, ecrire); }
/* La carte du survol : un titre (le courant, la durée), un sous-titre, une ligne par courbe avec sa couleur, ce que
   le disjoncteur tient et la marge, un verdict. */
function carteTip(titre, sous, lignes, verdict, cls) { return `<div class="dj-tip-t"><b>${titre}</b>${sous ? `<span>${sous}</span>` : ''}</div>`
  + lignes.map(l => `<div class="dj-tip-l"><i class="${l.tirets ? 'tirets' : ''}" style="--c:${l.couleur}"></i><span>${esc(l.nom)}</span><b>${esc(l.tient)}</b>${l.marge ? `<em class="${l.cls || ''}">${esc(l.marge)}</em>` : '<em></em>'}</div>`).join('')
  + (verdict ? `<div class="dj-tip-v${cls ? ' ' + cls : ''}">${verdict}</div>` : ''); }
// la fraction du temps de déclenchement consommée : verte sous 75 %, ambre jusqu'à 100 %, rouge au-delà
const classeFraction = x => x < MARGE_FRACTION - 1e-9 ? 'ok' : x < 1 - 1e-9 ? 'serre' : 'ko';
const motFraction = x => x > 9.995 ? '> 1 000 %' : pourcent(x);
const motMarge = m => (m >= 1 ? '+' : '−') + nombre(Math.round(Math.abs(m - 1) * 100)) + ' %';
/* Le graphique : survoler lit le courant et la durée (et ce que le calibre retenu y tient, à chaque température) ; sur
   un point, la carte complète ; sur un fantôme, ce que ce calibre ferait ; glisser un point change le courant et la
   durée de son état — l'escalier et la gamme suivent en direct, le contrat s'écrit quand on lâche. Quand le calibre a
   changé depuis le dernier dessin, les courbes glissent de l'ancien au nouveau. */
function lierGraphique(sec, nom, E, lire, ecrire) { const d = E.d, fig = sec.querySelector('.dj-graphe'), svg = fig && fig.querySelector('svg'); if (!svg || !d.courbes.length) return;
  const tip = fig.querySelector('.dj-tip'), vise = svg.querySelector('.dj-vise'), G = geometrieDisjonction(d), { W, H, L, R, T, B } = DJ, n = d.courbes.length, cal = d.calibre;
  // les courbes glissent : du décalage dessiné la dernière fois pour ce repère au décalage d'aujourd'hui
  const grp = svg.querySelector('.dj-cal'), geo = fig.dataset.xlo + '|' + fig.dataset.xhi, avant = DJ_ANIM.get(nom);
  if (grp) { const tx = +grp.dataset.tx; if (avant && avant.geo === geo && Math.abs(avant.tx - tx) > 0.5) { const anc = svg.querySelector(`.dj-fantome[data-cal="${avant.cal}"]`);
      grp.style.transition = 'none'; grp.style.transform = `translate(${avant.tx}px,0)`; if (anc) { anc.style.transition = 'none'; anc.classList.add('retenu'); }
      void svg.getBoundingClientRect(); grp.style.transition = ''; grp.style.transform = `translate(${tx}px,0)`; if (anc) { anc.style.transition = ''; anc.classList.remove('retenu'); } }
    DJ_ANIM.set(nom, { tx, cal, geo }); }
  const local = e => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
  const dansLeCadre = p => p.x >= L && p.x <= W - R && p.y >= T && p.y <= H - B;
  // la carte se pose à droite du pointeur, à gauche quand elle déborderait, et reste dans la figure
  const montrer = (p, html) => { const rs = svg.getBoundingClientRect(), rf = fig.getBoundingClientRect(), px = p.x / W * rs.width + rs.left - rf.left, py = p.y / H * rs.height + rs.top - rf.top;
    tip.innerHTML = html; tip.hidden = false; tip.style.right = ''; const w = tip.offsetWidth, h = tip.offsetHeight, gauche = px + 16 + w > rf.width - 2 && px - 16 - w >= 2;
    tip.style.left = Math.max(2, Math.min(gauche ? px - 16 - w : px + 16, rf.width - w - 2)) + 'px'; tip.style.top = Math.max(2, Math.min(py - 16, rf.height - h - 2)) + 'px'; };
  const cacher = () => { tip.hidden = true; vise.hidden = true; };
  const croix = p => { const [a, b] = vise.querySelectorAll('line'); a.setAttribute('x1', f1(p.x)); a.setAttribute('x2', f1(p.x)); a.setAttribute('y1', T); a.setAttribute('y2', H - B); b.setAttribute('x1', L); b.setAttribute('x2', W - R); b.setAttribute('y1', f1(p.y)); b.setAttribute('y2', f1(p.y)); vise.hidden = false; };
  const ligneCourbe = (k, tient, marge, cls) => ({ ...styleCourbe(k, n), nom: d.courbes[k].nom, tient, marge, cls });
  // la carte d'un point : à chaque température, ce que le calibre tient et la fraction de son temps de déclenchement que
  // les phases du point consomment (le permanent : jusqu'où il peut aller, et la marge) ; le verdict, avec le bilan
  const cartePoint = pt => { const lignes = pt.marges.map((m, k) => pt.t === Infinity ? ligneCourbe(k, 'jusqu’à ' + amperes(m.admis), motMarge(m.marge), m.marge < 1 ? 'ko' : m.marge < MARGE_DISJONCTION ? 'serre' : 'ok')
      : ligneCourbe(k, m.temps === Infinity ? 'ne déclenche pas' : 'tient ' + secondes(m.temps), m.fraction > 0 ? motFraction(m.fraction) : '', m.ok === false ? 'ko' : classeFraction(m.somme)));
    const rates = pt.marges.filter(m => !m.ok).map(m => m.courbe), m0 = pt.marges[0], bilan = pt.t === Infinity || !m0 ? '' : ' · ' + esc(motFraction(m0.somme)) + ' du temps consommé';
    const verdict = pt.ok === false ? `<em>déclenche</em> à ${rates.length === pt.marges.length ? 'toute température' : esc(rates.join(', '))}${bilan}` : pt.serre ? (pt.t === Infinity ? 'tient, sans 10 % de marge de courant' : 'tient, mais touche la courbe' + bilan) : (pt.t === Infinity ? 'ne déclenche jamais' : 'tient à toute température' + bilan);
    return carteTip(esc(amperes(pt.i)) + (pt.t === Infinity ? ' · toujours' : ' · ' + esc(secondes(pt.t))), esc(pt.nom), lignes, verdict, pt.ok === false ? 'ko' : pt.serre ? 'serre' : 'ok'); };
  // la carte du réticule : à ce courant, ce que le calibre retenu tient, et la fraction que la durée visée consommerait
  const carteReticule = (i, t) => carteTip(esc(amperes(i)) + ' · ' + esc(secondes(t)), cal ? 'le ' + esc(amperes(cal)) + ' tient' : '', !cal ? [] : d.courbes.map((c, k) => { const tt = tempsDeDeclenchement(c, i / cal), x = tt === Infinity ? 0 : t / tt;
    return ligneCourbe(k, tt === Infinity ? 'ne déclenche pas' : secondes(tt), tt === Infinity ? '' : motFraction(x), classeFraction(x)); }), '', '');
  const carteFantome = gm => carteTip(esc(amperes(gm.calibre)), gm.valide == null ? '' : gm.valide ? (gm.ideal ? 'tiendrait — l’idéal' : gm.serre ? 'tiendrait, en touchant la courbe' : 'tiendrait') : 'déclencherait', [], 'cliquer pour le retenir', 'info');
  let prise = null;   // le point qu'on glisse : son état, le profil en cours
  const juger = profil => { const dd = { ...d, ...verdictDisjonction(app.norme, '', cal, profil, d.contexte) }; svg.querySelector('.dj-prof').innerHTML = profilSvg(dd, G);
    sec.querySelectorAll('.dj-chip').forEach(b => { const g = dd.gamme.find(x => x.calibre === +b.dataset.cal); if (g) { b.classList.toggle('ok', g.valide === true); b.classList.toggle('ko', g.valide === false); b.classList.toggle('serre', !!g.serre); } }); return dd; };
  svg.addEventListener('pointermove', e => { const p = local(e);
    if (prise) { const i = Math.max(0.01, G.iDe(Math.min(W - R, Math.max(L, p.x)))), t = G.tDe(Math.min(H - B, Math.max(T, p.y)));
      const el = prise.etat, ri = +i.toPrecision(3), rt = +t.toPrecision(2); el.i = ri; if (prise.k !== 'perm') el.t = rt;
      const dd = juger(prise.profil), pt = dd.points.find(x => x.k === prise.k) || dd.points.find(x => x.i === ri);
      montrer(p, pt ? cartePoint(pt) : carteTip(esc(amperes(ri)) + (prise.k === 'perm' ? '' : ' · ' + esc(secondes(rt))), esc(el.nom || ''), [], '', '')); return; }
    if (!dansLeCadre(p)) { cacher(); return; }
    const g = e.target.closest && e.target.closest('.dj-pt'), fant = e.target.closest && e.target.closest('.dj-fantome');
    if (g) { const pt = d.points.find(x => x.k === g.dataset.k); if (pt) { vise.hidden = true; montrer(p, cartePoint(pt)); return; } }
    if (fant) { const gm = d.gamme.find(x => x.calibre === +fant.dataset.cal); if (gm) { vise.hidden = true; montrer(p, carteFantome(gm)); return; } }
    croix(p); montrer(p, carteReticule(G.iDe(p.x), G.tDe(p.y))); });
  svg.addEventListener('pointerleave', () => { if (!prise) cacher(); });
  svg.addEventListener('pointerdown', e => { const g = e.target.closest && e.target.closest('.dj-pt'); if (!g || e.button) return;
    const profil = lire(), k = g.dataset.k, etat = k === 'perm' ? profil.perm : /^plus/.test(k) ? profil.plus[+k.slice(4)] : profil[k]; if (!etat) return;
    // un point qui porte deux états au même courant (démarrage et transition) : on glisse le premier
    prise = { k, etat, profil }; svg.classList.add('tient'); try { svg.setPointerCapture(e.pointerId); } catch (_) { } e.preventDefault(); });
  const lacher = e => { if (!prise) return; const c = prise.profil; prise = null; svg.classList.remove('tient'); cacher(); try { svg.releasePointerCapture(e.pointerId); } catch (_) { } ecrire('profil de charge de ' + nom, c); };
  svg.addEventListener('pointerup', lacher); svg.addEventListener('pointercancel', lacher);
  // la légende isole une courbe ; le clavier aussi (le focus sur un point montre sa carte)
  fig.querySelectorAll('.dj-leg[data-courbe]').forEach(b => { const isoler = on => { svg.classList.toggle('isole', on); svg.querySelectorAll('.dj-courbe').forEach(c => c.classList.toggle('vise', on && c.dataset.courbe === b.dataset.courbe)); };
    b.onpointerenter = b.onfocus = () => isoler(true); b.onpointerleave = b.onblur = () => isoler(false); });
  svg.querySelectorAll('.dj-pt').forEach(g => { g.addEventListener('focus', () => { const pt = d.points.find(x => x.k === g.dataset.k), c = g.querySelector('.dj-point'); if (pt && c) montrer({ x: +c.getAttribute('cx'), y: +c.getAttribute('cy') }, cartePoint(pt)); });
    g.addEventListener('blur', cacher); }); }
