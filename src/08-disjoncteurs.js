/* ===========================================================================
   08 quinquies — LA DISJONCTION : sur la fiche d'un disjoncteur, le calibre
   que l'outil trouve, le profil de charge, la courbe — et rien à lire
   ---------------------------------------------------------------------------
   Le lecteur : « c'est à toi de trouver le calibre idéal ; il faut que ce
   soit dans le vert et que ça ne touche pas la courbe ; si on gère tout, on
   verra tout sur le graphique ». Donc :
     · LA GAMME en puces — 1, 3, 5, 7,5, 10, 15, 25 A —, chacune jugée sur le
       profil (verte : tient ; rouge : déclenche ; étoile : l'idéale, la plus
       petite qui tient sans toucher la courbe). Celle du part number est
       retenue d'office ; un clic en retient une autre, un second clic la
       rend ; sans part number, l'idéale est retenue toute seule ;
     · LE GRAPHIQUE, en ampères et en secondes (log-log) : la zone verte du
       calibre retenu, ses quatre courbes, les courbes fantômes des autres
       calibres (on clique l'une pour la retenir), l'escalier du profil avec
       ses points — qu'on survole pour lire la marge, qu'on glisse pour
       changer le courant ou la durée ;
     · LES ÉTATS : démarrage, transition, ceux qu'on ajoute, le permanent —
       un courant, une durée. Le profil se garde avec le contrat (Ctrl+Z) ;
     · ses fils (ce qu'ils admettent, jugés) et la chute en ligne jusqu'aux
       équipements. La pastille de la fiche relève ce qui déclenche.
   =========================================================================== */
'use strict';

const COULEURS_COURBES = ['#c0392b', '#d4870f', '#e2b55b', '#1f5fbf'];   // de la plus chaude à la plus froide
const chargeDe = nom => (app.contrat.charges && app.contrat.charges.get(nom)) || null;
/* Le part number d'un repère : celui que ses liaisons portent. */
function pnDuRepere(nom) { for (const l of verite()) { if (l.de === nom && l.pnDe) return l.pnDe; if (l.vers === nom && l.pnVers) return l.pnVers; } return ''; }
/* Les fils d'un disjoncteur, des deux côtés, avec la borne et l'autre bout. */
const filsDuDisjoncteur = nom => verite().filter(l => (l.de === nom || l.vers === nom) && l.de !== l.vers)
  .map(l => ({ cable: l.cable, type: l.type, borne: l.de === nom ? l.borneDe : l.borneVers, autre: l.de === nom ? l.vers + (l.borneVers ? ':' + l.borneVers : '') : l.de + (l.borneDe ? ':' + l.borneDe : ''), l }));
/* Le calibre RETENU : celui qu'on a choisi à la main, sinon celui du part number (NSA935401-10 → 10 A), sinon l'idéal
   que le profil donne. Rend le verdict complet (09 bis), le profil, d'où vient le calibre, et ses fils jugés. */
function disjonctionDe(nom) { const profil = chargeDe(nom), ecrit = profil && profil.calibre > 0 ? profil.calibre : null, pn = calibreDuPn(pnDuRepere(nom));
  let d = verdictDisjonction(app.norme, '', ecrit || pn || 0, profil);
  const calibre = ecrit || pn || d.calibreIdeal || null; if (calibre && calibre !== d.calibre) d = verdictDisjonction(app.norme, '', calibre, profil);
  return { ...d, profil, ecrit, pn, origine: ecrit ? 'main' : pn ? 'pn' : calibre ? 'ideal' : '', fils: protectionDesFils(app.norme, calibre, profil, filsDuDisjoncteur(nom), app.simu) }; }
const calibreDe = nom => disjonctionDe(nom).calibre;
// « pour 10 s », « pour 1 min », « en continu »
const pourPalier = p => p === 2 ? 'pour 2 s' : p === 10 ? 'pour 10 s' : p === 60 ? 'pour 1 min' : 'en continu';
const motFacteur = f => Math.abs(f - 1) < 1e-9 ? '' : ' (× ' + nombre(Math.round(f * 100) / 100) + ')';
/* Un temps, lisible : « 12 ms », « 3,2 s », « 2,1 min », « jamais ». */
function secondes(t) { if (!isFinite(t)) return 'jamais'; if (t < 1) return nombre(Math.round(t * 1000)) + ' ms'; if (t < 60) return nombre(Math.round(t * 10) / 10) + ' s';
  if (t < 3600) return nombre(Math.round(t / 6) / 10) + ' min'; return nombre(Math.round(t / 360) / 10) + ' h'; }
const amperes = i => nombre(Math.round(i * 100) / 100) + ' A';
/* Ce que le contrôle en dit : un problème si une phase fait déclencher, ou si un fil ne tient pas le profil ; à voir
   sans profil, si le calibre posé n'est pas l'idéal, ou si le calibre dépasse ce qu'un fil admet en continu. */
function controleDisjonction(nom) { const d = disjonctionDe(nom), out = [];
  if (!d.sansCourbe) { if (d.sansProfil) out.push({ niveau: 'att', texte: (d.calibre ? amperes(d.calibre) + ' · ' : '') + 'le profil de charge est à renseigner : l’outil trouve le calibre' });
    else if (!(d.calibre > 0)) out.push({ niveau: 'att', texte: 'aucun calibre de la gamme ne tient ce profil' });
    else if (!d.valide) { const p = d.pire, m = p.marges[0], mini = d.calibreIdeal ? ` — l’idéal est un ${amperes(d.calibreIdeal)}` : ' — aucun calibre de la gamme ne tient';
      out.push({ niveau: 'ko', texte: (p.t === Infinity ? `le permanent (${amperes(p.i)}) fait déclencher le ${amperes(d.calibre)} à ${m.courbe} (il tient jusqu'à ${amperes(m.admis)})`
        : `${p.nom} ${amperes(p.i)} pendant ${secondes(p.t)} : le ${amperes(d.calibre)} déclenche en ${secondes(m.temps)} à ${m.courbe}`) + mini }); }
    else if (d.calibreIdeal && d.calibre !== d.calibreIdeal) out.push({ niveau: 'att', texte: d.calibre > d.calibreIdeal ? `${amperes(d.calibre)}${d.origine === 'pn' ? ' (part number)' : ''} : un ${amperes(d.calibreIdeal)} suffirait` : `${amperes(d.calibre)} tient mais touche la courbe : l’idéal est un ${amperes(d.calibreIdeal)}` }); }
  d.fils.forEach(f => { const nomF = (f.cable || 'fil sans numéro') + (f.type ? ' (' + f.type + ')' : '');
    if (f.verdict === 'fil') out.push({ niveau: 'ko', texte: `${nomF} : ${f.pire.nom} ${amperes(f.pire.i)}${f.pire.t === Infinity ? '' : ' / ' + secondes(f.pire.t)} > ${amperes(f.pire.admise)} admis ${pourPalier(f.pire.palier)}${motFacteur(f.facteur)}` });
    else if (f.verdict === 'calibre') out.push({ niveau: 'att', texte: `${nomF} : ${amperes(f.continu)} admis en continu${motFacteur(f.facteur)} < calibre ${amperes(d.calibre)} — pas protégé en surcharge` }); });
  return out; }
/* CE QUI ALIMENTE un fil : le disjoncteur en amont (le premier dont un chemin passe par ce fil), son courant permanent
   et son courant de pointe — ce qu'il faut pour juger la charge et la chute du fil. */
function alimentationDe(l) { if (!l) return null; const V = verite();
  for (const cb of reperesDe(V).filter(estDisjoncteur)) { if (!cheminsDepuis(V, cb).some(ch => ch.segments.some(s => s.fil === l))) continue;
    const d = disjonctionDe(cb), pts = d.points.length ? d.points : pointsDuProfil(d.profil), perm = pts.find(p => p.t === Infinity), pointe = pts[0];
    return { nom: cb, calibre: d.calibre, perm: perm ? perm.i : null, pointe: pointe && pointe.t !== Infinity ? pointe : null, points: pts }; }
  return null; }

/* ---- la section de la fiche -------------------------------------------------------- */
function gammeHtml(nom, d) {
  // la gamme : chaque calibre jugé ; celui qui est retenu est pressé ; l'idéal porte l'étoile
  const puces = d.gamme.map(g => `<button class="dj-chip${g.valide === true ? ' ok' : g.valide === false ? ' ko' : ''}${g.serre ? ' serre' : ''}${g.ideal ? ' ideal' : ''}" data-cal="${g.calibre}" aria-pressed="${g.calibre === d.calibre}" title="${escA(g.valide == null ? amperes(g.calibre) : amperes(g.calibre) + (g.valide ? (g.ideal ? ' : l’idéal — tient sans toucher la courbe' : g.serre ? ' : tient, mais touche la courbe' : ' : tient') : ' : déclenche') + (g.calibre === d.calibre ? ' · retenu' + (d.origine === 'pn' ? ' (part number)' : d.origine === 'main' ? ' (choisi à la main)' : '') : ''))}">${nombre(g.calibre)}${g.ideal ? '<i aria-label="idéal">★</i>' : ''}</button>`).join('');
  const dou = d.origine === 'pn' ? `part number ${esc(pnDuRepere(nom))}` : d.origine === 'main' ? 'choisi à la main' : d.origine === 'ideal' ? 'l’idéal, trouvé par l’outil' : 'à choisir';
  return `<div class="dj-gamme"><span class="fi-nomen-t">calibre (A)</span><div class="dj-chips" role="group" aria-label="Calibre, en ampères">${puces}</div><span class="dj-dou">${dou}${d.calibreIdeal ? ` · <i>★</i> ${d.calibre === d.calibreIdeal ? 'l’idéal' : 'idéal : ' + esc(amperes(d.calibreIdeal))}` : ''}</span></div>`; }
function ficheDisjonction(nom) { const d = disjonctionDe(nom), E = etatsDuProfil(d.profil), gamme = gammeHtml(nom, d);
  // les états : un courant, une durée ; ceux qu'on ajoute ont un nom qu'on écrit et une croix
  const ligne = e => { const val = q => e[q] != null && isFinite(e[q]) ? nombre(e[q]) : '', plus = /^plus/.test(e.k);
    return `<div class="dj-etat${e.k === 'perm' ? ' perm' : ''}" data-k="${e.k}">${plus ? `<input class="dj-nom" data-dj="${e.k}" data-q="nom" value="${escA(e.nom)}" aria-label="Nom de l’état" spellcheck="false">` : `<span class="dj-nom">${esc(e.nom[0].toUpperCase() + e.nom.slice(1))}</span>`}`
      + `<input data-dj="${e.k}" data-q="i" value="${escA(val('i'))}" inputmode="decimal" placeholder="—" aria-label="${escA(e.nom + ' : courant en ampères')}"><i>A</i>`
      + (e.k === 'perm' ? '<i class="dj-inf" title="pour toujours">∞</i><i></i>' : `<input data-dj="${e.k}" data-q="t" value="${escA(val('t'))}" inputmode="decimal" placeholder="—" aria-label="${escA(e.nom + ' : durée en secondes')}"><i>s</i>`)
      + (plus ? `<button class="dj-x" data-x="${e.k}" aria-label="Retirer cet état">×</button>` : '<span></span>') + '</div>'; };
  const etats = `<div class="dj-etats"><span class="fi-nomen-t">profil de charge</span>${E.map(ligne).join('')}<button class="fi-lien dj-plus" id="dj-plus">+ un état</button></div>`;
  // ses fils : ce que chacun admet (la norme des fils), et s'il tient le profil
  const lf = d.fils.map(f => { const k = f.l ? cleFil(f.l) : '', titre = f.fil ? [['continu', f.fil.intensite], ['2 s', f.fil.i2s], ['10 s', f.fil.i10s], ['1 min', f.fil.i1min]].filter(x => x[1] != null).map(x => amperes(x[1] * f.facteur) + ' ' + x[0]).join(' · ') + motFacteur(f.facteur) : 'fil inconnu de la norme';
    const dit = f.verdict === 'fil' ? `<span class="fi-ko">${esc(f.pire.nom)} ${esc(amperes(f.pire.i))} pendant ${esc(secondes(f.pire.t))} : dépasse ${esc(amperes(f.pire.admise))} ${pourPalier(f.pire.palier)}</span>`
      : f.verdict === 'calibre' ? `<span class="fi-ko fi-att">admet moins que le calibre : pas protégé en surcharge</span>` : f.verdict === 'inconnu' ? '<span class="fi-ko fi-att">fil inconnu de la norme</span>' : '';
    return `<li class="fi-fil${f.verdict === 'fil' ? ' ko' : ''}"${k ? ` data-i="${k}" tabindex="0" role="button" title="${escA(titre)}"` : ''}><span class="fi-ct"><b>${esc(f.borne)}</b></span>${puceFil(f)}<span class="fi-t">${esc(f.type || '—')}</span><span class="fi-dest"><span>${esc(f.autre)}</span></span><span class="dj-adm" title="${escA(titre)}">${f.continu != null ? esc(amperes(f.continu)) : '—'}</span><span class="fi-w">${esc(f.cable || '')}</span>${dit}</li>`; }).join('');
  const fils = lf ? `<ul class="fi-liste dj-fils"><li class="fi-groupe">ses fils · ce qu'ils admettent en continu</li>${lf}</ul>` : '';
  return `<section class="fi-cadre fi-dj">${gamme}${d.courbes.length ? graphiqueDisjonction(d) : '<p class="fi-note">Aucune courbe de disjonction dans la norme.</p>'}${etats}${fils}${chutesHtml(nom, d)}</section>`; }
/* LA CHUTE EN LIGNE depuis le disjoncteur, comme la feuille du lecteur : chaque chemin jusqu'à un équipement, à
   travers les prises de coupure et les barrettes, au courant permanent du profil (sinon le calibre, sinon l'hypothèse). */
function chutesHtml(nom, d) { const H = app.simu || HYPOTHESES, I = d.profil && d.profil.perm && d.profil.perm.i > 0 ? d.profil.perm.i : d.calibre > 0 ? d.calibre : H.courant;
  const cs = chutesDepuis(app.norme, verite(), nom, I, H); if (!cs.length) return '';
  const li = cs.map(c => { const detail = c.segments.map(s => s.fil ? `${s.fil.cable || 'fil'} : ${s.dU != null ? nombre(Math.round(s.dU * 1000) / 1000) + ' V' : '?'} (${nombre(Math.round(s.longueur * 100) / 100)} m${s.reelle ? '' : ', hypothèse'})` : `${s.passage} : ${s.dU != null ? nombre(Math.round(s.dU * 1000) / 1000) + ' V' : 'contact inconnu'}`).join(' · ');
    return `<li class="fi-fil${c.trop ? ' ko' : ''}" title="${escA(detail + (c.inconnus.length ? ' — ' + c.inconnus.join(' ; ') : ''))}"><span class="fi-ct"><b>${esc(c.bout[0])}</b>${c.bout[1] ? `<i>${esc(c.bout[1])}</i>` : ''}</span><span></span><b class="dj-du">${c.dU != null ? esc(nombre(Math.round(c.dU * 100) / 100)) + ' V' : '—'}</b><span class="fi-t">${c.pct != null ? esc(nombre(Math.round(c.pct * 10) / 10)) + ' %' : ''}${c.inconnus.length ? ' · ' + c.inconnus.length + ' inconnu' + (c.inconnus.length > 1 ? 's' : '') : ''}</span><span class="fi-dest"><span>${esc(c.mots)}</span></span><span></span>${c.trop ? '<span class="fi-ko">dépasse la chute admise</span>' : !c.fini ? '<span class="fi-ko fi-att">chemin sans fin</span>' : ''}</li>`; }).join('');
  return `<ul class="fi-liste dj-chutes"><li class="fi-groupe">chute en ligne à ${esc(nombre(I))} A${H.tension ? ' sous ' + esc(nombre(H.tension)) + ' V' : ''}${cs[0].admis != null ? ' · admise ' + esc(nombre(cs[0].admis)) + ' V' : ''}</li>${li}</ul>`; }

/* ---- le graphique ------------------------------------------------------------------- */
/* La géométrie : ampères en abscisse (log), secondes en ordonnée (log, 1 ms à 10 000 s). L'abscisse couvre la gamme et
   le profil, jamais moins de trois décades. */
const DJ = { W: 440, H: 300, L: 46, R: 14, T: 26, B: 30, ylo: -3, yhi: 4 };
function geometrieDisjonction(d) { const P = d.points.filter(p => p.i > 0), cal = d.calibre || 10;
  let lo = Math.min(0.3, ...P.map(p => p.i / 3), cal * 0.5), hi = Math.max(300, ...P.map(p => p.i * 3), cal * 20); lo = Math.pow(10, Math.floor(Math.log10(lo) * 2) / 2); hi = Math.pow(10, Math.ceil(Math.log10(hi) * 2) / 2);
  const xlo = Math.log10(lo), xhi = Math.log10(hi), { W, H, L, R, T, B, ylo, yhi } = DJ;
  const X = i => L + (Math.log10(i) - xlo) / (xhi - xlo) * (W - L - R), Y = t => T + (yhi - Math.log10(Math.min(Math.pow(10, yhi), Math.max(Math.pow(10, ylo), t)))) / (yhi - ylo) * (H - T - B);
  return { xlo, xhi, X, Y, xb: i => Math.min(W - R, Math.max(L, X(i))), iDe: x => Math.pow(10, xlo + (x - L) / (W - L - R) * (xhi - xlo)), tDe: y => Math.pow(10, yhi - (y - T) / (H - T - B) * (yhi - ylo)) }; }
/* L'escalier du profil et ses points : du haut (le permanent, pour toujours) vers le bas — à chaque point, descendre à sa
   durée puis aller à droite à son courant. Rouge s'il déclenche. */
function profilSvg(d, G) { const P = d.points.filter(p => p.i > 0).slice().sort((a, b) => a.i - b.i), { T, H, B } = DJ; if (!P.length) return '';
  let x = G.xb(P[0].i), y = T, path = `M${f1(x)} ${f1(y)}`, ronds = '';
  P.forEach((p, k) => { if (k) { y = G.Y(p.t); path += ` L${f1(x)} ${f1(y)}`; x = G.xb(p.i); path += ` L${f1(x)} ${f1(y)}`; }
    const cy = k ? y : T + 4, droite = x < DJ.W * 0.68;
    ronds += `<g class="dj-pt${p.ok === false ? ' ko' : p.serre ? ' serre' : ''}" data-k="${escA(p.k)}"><circle class="dj-halo" cx="${f1(x)}" cy="${f1(cy)}" r="11"/><circle class="dj-point" cx="${f1(x)}" cy="${f1(cy)}" r="${p.ok === false ? 5 : 4}"/><text class="dj-etiq" x="${f1(droite ? x + 9 : x - 9)}" y="${f1(cy + (k ? -6 : 10))}" text-anchor="${droite ? 'start' : 'end'}">${esc(p.nom)}</text></g>`; });
  path += ` L${f1(x)} ${H - B}`;
  return `<path class="dj-systeme" d="${path}"/>${ronds}`; }
function graphiqueDisjonction(d) { const G = geometrieDisjonction(d), { W, H, L, R, T, B, ylo, yhi } = DJ, cal = d.calibre;
  let s = '';
  // la grille : les décades en abscisse (et 2, 5 entre elles), en ordonnée
  for (let e = Math.floor(G.xlo); e <= Math.ceil(G.xhi); e++) [1, 2, 5].forEach(m => { const v = m * Math.pow(10, e); if (v < Math.pow(10, G.xlo) - 1e-9 || v > Math.pow(10, G.xhi) + 1e-9) return;
    s += `<line class="dj-grille${m === 1 ? '' : ' fine'}" x1="${f1(G.X(v))}" y1="${T}" x2="${f1(G.X(v))}" y2="${H - B}"/><text x="${f1(G.X(v))}" y="${H - B + 12}" text-anchor="middle">${nombre(v)}</text>`; });
  for (let e = ylo; e <= yhi; e++) s += `<line class="dj-grille" x1="${L}" y1="${f1(G.Y(Math.pow(10, e)))}" x2="${W - R}" y2="${f1(G.Y(Math.pow(10, e)))}"/><text x="${L - 5}" y="${f1(G.Y(Math.pow(10, e))) + 3}" text-anchor="end">${e >= 3 ? nombre(Math.pow(10, e - 3)) + 'k' : nombre(Math.pow(10, e))}</text>`;
  s += `<text x="${W - R}" y="${H - 3}" text-anchor="end" class="dj-titre">courant (A)</text><text x="2" y="${T - 6}" text-anchor="start" class="dj-titre">temps (s)</text>`;
  const pt = (p, c) => f1(G.xb(p.m * c)) + ' ' + f1(G.Y(p.t)), rapide = d.courbes[0];
  s += `<rect class="dj-capte" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent"/>`;
  // les courbes fantômes des autres calibres de la gamme : la plus rapide de chacun, en gris ; un clic la retient
  d.gamme.forEach(g => { if (g.calibre === cal) return; const xe = G.X(rapide.brut[0].m * g.calibre); if (xe < L || xe > W - R) return;
    s += `<g class="dj-fantome${g.valide === true ? ' ok' : g.valide === false ? ' ko' : ''}" data-cal="${g.calibre}"><path d="M${rapide.brut.map(p => pt(p, g.calibre)).join(' L')}"/><text x="${f1(xe)}" y="${T - 6}" text-anchor="middle">${nombre(g.calibre)}</text></g>`; });
  if (cal) { const b0 = rapide.brut[0], bn = rapide.brut[rapide.brut.length - 1];
    s += `<path class="dj-zone" d="M${L} ${T} L${f1(G.xb(b0.m * cal))} ${T} L${rapide.brut.map(p => pt(p, cal)).join(' L')} L${f1(G.xb(bn.m * cal))} ${H - B} L${L} ${H - B} Z"/>`;
    d.courbes.forEach((c, k) => { s += `<path class="dj-courbe" style="stroke:${COULEURS_COURBES[Math.min(k, COULEURS_COURBES.length - 1)]}" d="M${c.brut.map(p => pt(p, cal)).join(' L')}"><title>${escA(c.nom + ' · ' + amperes(cal))}</title></path>`; }); }
  s += `<g class="dj-prof">${profilSvg(d, G)}</g>`;
  s += `<g class="dj-vise" hidden><line class="dj-croix" x1="0" y1="0" x2="0" y2="0"/><line class="dj-croix" x1="0" y1="0" x2="0" y2="0"/></g>`;
  s += `<rect class="dj-axe" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="none"/>`;
  const legende = d.courbes.map((c, k) => `<span><i style="background:${COULEURS_COURBES[Math.min(k, COULEURS_COURBES.length - 1)]}"></i>${esc(c.nom)}</span>`).join('') + (d.points.length ? '<span><i class="prof"></i>profil</span>' : '') + '<span><i class="fant"></i>autres calibres</span>';
  return `<figure class="dj-graphe" data-xlo="${G.xlo}" data-xhi="${G.xhi}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbes de disjonction du calibre retenu, les autres calibres en gris, et le profil de charge">${s}</svg><div class="dj-tip" hidden></div><figcaption class="dj-legende">${legende}</figcaption></figure>`; }

/* ---- les gestes --------------------------------------------------------------------- */
/* Les puces, les états, le graphique : chaque changement s'écrit au contrat (Ctrl+Z le défait). L'écriture attend que
   le focus se pose : si l'on est passé à un autre champ de la fiche, la gamme et le graphique se refont EN PLACE (les
   champs restent sous les doigts) ; sinon la fiche entière se refait. */
function lierDisjonction(nom) { const box = $('ba-equip'), sec = box.querySelector('.fi-dj'); if (!sec) return;
  const E = { d: disjonctionDe(nom) };
  const lire = () => { const c = { calibre: E.d.ecrit || null, plus: [] };
    const num = (k, q) => { const el = sec.querySelector(`[data-dj="${k}"][data-q="${q}"]`); const x = el ? nombreLu(el.value) : null; return x != null && x >= 0 ? x : null; };
    ['dem', 'trans', 'perm'].forEach(k => { c[k] = { i: num(k, 'i'), t: k === 'perm' ? null : num(k, 't') }; });
    sec.querySelectorAll('.dj-etat[data-k^="plus"]').forEach(el => { const k = el.dataset.k, n = el.querySelector('[data-q="nom"]'); c.plus.push({ nom: n ? n.value.trim() : '', i: num(k, 'i'), t: num(k, 't') }); });
    return c; };
  const rafraichir = () => { E.d = disjonctionDe(nom); const g = sec.querySelector('.dj-gamme'), f = sec.querySelector('.dj-graphe');
    if (g) g.outerHTML = gammeHtml(nom, E.d); if (f && E.d.courbes.length) f.outerHTML = graphiqueDisjonction(E.d); lierPuces(); lierGraphique(sec, nom, E, lire, ecrire); };
  const ecrire = (quoi, c) => setTimeout(() => { histPush(quoi); app.contrat.charges.set(nom, c); apresEdition();
    const a = document.activeElement; if (a && a.tagName === 'INPUT' && box.contains(a)) rafraichir(); else if (box.contains(a)) rendreFiche(); }, 0);
  // les puces : retenir un calibre ; presser celui qui l'est déjà rend celui du part number (ou l'idéal)
  const retenir = cal => { const d = E.d, c = lire(); c.calibre = cal === d.calibre ? null : cal; if (c.calibre === (d.ecrit || null)) return;
    ecrire('calibre de ' + nom, c); dire(c.calibre ? nom + ' : calibre ' + amperes(c.calibre) + ', choisi à la main.' : nom + ' : calibre ' + amperes(d.pn || d.calibreIdeal) + ' repris ' + (d.pn ? 'du part number.' : 'de l’idéal.')); };
  const lierPuces = () => { sec.querySelectorAll('.dj-chip').forEach(b => b.onclick = () => retenir(+b.dataset.cal)); sec.querySelectorAll('.dj-fantome').forEach(g => g.onclick = () => retenir(+g.dataset.cal)); };
  sec.querySelectorAll('input').forEach(el => el.addEventListener('change', () => ecrire('profil de charge de ' + nom, lire())));
  const plus = $('dj-plus'); if (plus) plus.onclick = () => { const c = lire(); c.plus.push({ nom: 'État ' + (c.plus.length + 3), i: null, t: null }); ecrire('un état de plus sur ' + nom, c); };
  sec.querySelectorAll('.dj-x').forEach(b => b.onclick = () => { const c = lire(), j = +b.dataset.x.slice(4); c.plus.splice(j, 1); ecrire('un état de moins sur ' + nom, c); });
  lierPuces(); lierGraphique(sec, nom, E, lire, ecrire); }
/* Le graphique : survoler lit le courant et la durée (et, sur un point, ce que le disjoncteur y tient) ; glisser un point
   change le courant et la durée de son état, écrits au contrat quand on lâche. */
function lierGraphique(sec, nom, E, lire, ecrire) { const d = E.d, fig = sec.querySelector('.dj-graphe'), svg = fig && fig.querySelector('svg'); if (!svg || !d.courbes.length) return;
  const tip = fig.querySelector('.dj-tip'), vise = svg.querySelector('.dj-vise'), G = geometrieDisjonction(d), { W, H, L, R, T, B } = DJ;
  const local = e => { const r = svg.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
  const dansLeCadre = p => p.x >= L && p.x <= W - R && p.y >= T && p.y <= H - B;
  const montrer = (p, html) => { const r = svg.getBoundingClientRect(); tip.innerHTML = html; tip.hidden = false;
    const gauche = p.x > W * 0.62; tip.style.left = gauche ? '' : (p.x / W * r.width + 14) + 'px'; tip.style.right = gauche ? ((W - p.x) / W * r.width + 14) + 'px' : ''; tip.style.top = Math.max(4, p.y / H * r.height - 28) + 'px'; };
  const cacher = () => { tip.hidden = true; vise.hidden = true; };
  const croix = p => { const [a, b] = vise.querySelectorAll('line'); a.setAttribute('x1', f1(p.x)); a.setAttribute('x2', f1(p.x)); a.setAttribute('y1', T); a.setAttribute('y2', H - B); b.setAttribute('x1', L); b.setAttribute('x2', W - R); b.setAttribute('y1', f1(p.y)); b.setAttribute('y2', f1(p.y)); vise.hidden = false; };
  const motPoint = pt => { const m = pt.marges[0], froid = pt.marges[pt.marges.length - 1];
    const tient = t => t === Infinity ? 'ne déclenche pas' : 'tient ' + secondes(t);
    const tenue = !m ? '' : pt.t === Infinity ? (m.ok ? `le ${amperes(d.calibre)} ne déclenche pas (jusqu'à ${amperes(m.admis)})` : `le ${amperes(d.calibre)} finit par déclencher à ${m.courbe} — il tient jusqu'à ${amperes(m.admis)}`)
      : `à ${m.courbe} le ${amperes(d.calibre)} ${tient(m.temps)}${froid && froid !== m ? `, à ${froid.courbe} ${tient(froid.temps)}` : ''}`;
    return `<b>${esc(pt.nom)}</b> ${esc(amperes(pt.i))}${pt.t === Infinity ? ' pour toujours' : ' pendant ' + esc(secondes(pt.t))}${tenue ? `<br>${esc(tenue)}` : ''}${pt.ok === false ? '<br><em>déclenche</em>' : pt.serre ? '<br><em>touche la courbe</em>' : ''}`; };
  let prise = null;   // le point qu'on glisse : son état, et le profil en cours
  svg.addEventListener('pointermove', e => { const p = local(e);
    if (prise) { const i = Math.max(0.01, G.iDe(Math.min(W - R, Math.max(L, p.x)))), t = G.tDe(Math.min(H - B, Math.max(T, p.y)));
      const el = prise.etat, ri = +i.toPrecision(3), rt = +t.toPrecision(2); el.i = ri; if (prise.k !== 'perm') el.t = rt;
      const dd = { ...d, ...verdictDisjonction(app.norme, '', d.calibre, prise.profil) }; svg.querySelector('.dj-prof').innerHTML = profilSvg(dd, G);
      montrer(p, `<b>${esc(el.nom)}</b> ${esc(amperes(ri))}${prise.k === 'perm' ? '' : ' pendant ' + esc(secondes(rt))}`); return; }
    if (!dansLeCadre(p)) { cacher(); return; }
    const g = e.target.closest && e.target.closest('.dj-pt'), fant = e.target.closest && e.target.closest('.dj-fantome');
    if (g) { const pt = d.points.find(x => x.k === g.dataset.k); if (pt) { vise.hidden = true; montrer(p, motPoint(pt)); return; } }
    if (fant) { const gm = d.gamme.find(x => x.calibre === +fant.dataset.cal); vise.hidden = true; montrer(p, `<b>${esc(amperes(gm.calibre))}</b> ${gm.valide == null ? '' : gm.valide ? (gm.ideal ? 'tiendrait — l’idéal' : gm.serre ? 'tiendrait, en touchant la courbe' : 'tiendrait') : 'déclencherait'}<br><em>cliquer pour le retenir</em>`); return; }
    croix(p); montrer(p, `${esc(amperes(G.iDe(p.x)))} · ${esc(secondes(G.tDe(p.y)))}`); });
  svg.addEventListener('pointerleave', () => { if (!prise) cacher(); });
  svg.addEventListener('pointerdown', e => { const g = e.target.closest && e.target.closest('.dj-pt'); if (!g || e.button) return;
    const profil = lire(), k = g.dataset.k, etat = k === 'perm' ? profil.perm : /^plus/.test(k) ? profil.plus[+k.slice(4)] : profil[k]; if (!etat) return;
    // un point qui porte deux états au même courant (démarrage et transition) : on glisse le premier
    prise = { k, etat, profil }; svg.classList.add('tient'); try { svg.setPointerCapture(e.pointerId); } catch (_) { } e.preventDefault(); });
  const lacher = e => { if (!prise) return; const c = prise.profil; prise = null; svg.classList.remove('tient'); cacher(); try { svg.releasePointerCapture(e.pointerId); } catch (_) { } ecrire('profil de charge de ' + nom, c); };
  svg.addEventListener('pointerup', lacher); svg.addEventListener('pointercancel', lacher); }
