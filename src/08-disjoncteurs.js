/* ===========================================================================
   08 quinquies — LA DISJONCTION : sur la fiche d'un disjoncteur, son calibre,
   le profil de charge de ce qu'il protège, la courbe et le verdict
   ---------------------------------------------------------------------------
   Le lecteur vérifiait ça dans un Excel : le profil (démarrage, transition,
   permanent) en escalier sur les courbes de disjonction, valide s'il reste à
   gauche. Ici c'est une section de la fiche de chaque CB : le calibre (lu dans
   le part number, ou écrit), trois lignes à remplir, le graphique log-log, une
   pastille — « Tient » ou « Déclenche » — et, en une phrase, la marge ou le
   calibre qui tiendrait. Le profil se garde avec le contrat (Ctrl+Z le défait)
   et la pastille de contrôle du contrat relève chaque disjoncteur qui
   déclenche ou qu'on n'a pas renseigné.
   =========================================================================== */
'use strict';

const PHASES = [['dem', 'Démarrage', true], ['trans', 'Transition', true], ['perm', 'Permanent', false]];
const COULEURS_COURBES = ['#c0392b', '#d4870f', '#e2b55b', '#1f5fbf'];   // de la plus chaude à la plus froide
const chargeDe = nom => (app.contrat.charges && app.contrat.charges.get(nom)) || null;
/* Le part number d'un repère : celui que ses liaisons portent. */
function pnDuRepere(nom) { for (const l of verite()) { if (l.de === nom && l.pnDe) return l.pnDe; if (l.vers === nom && l.pnVers) return l.pnVers; } return ''; }
/* Le calibre : celui qu'on a écrit, sinon celui que le part number porte en queue (NSA935401-10 → 10 A). */
function calibreDe(nom) { const c = chargeDe(nom); return c && c.calibre > 0 ? c.calibre : calibreDuPn(pnDuRepere(nom)); }
/* Les fils d'un disjoncteur, des deux côtés, avec la borne et l'autre bout. */
const filsDuDisjoncteur = nom => verite().filter(l => (l.de === nom || l.vers === nom) && l.de !== l.vers)
  .map(l => ({ cable: l.cable, type: l.type, borne: l.de === nom ? l.borneDe : l.borneVers, autre: l.de === nom ? l.vers + (l.borneVers ? ':' + l.borneVers : '') : l.de + (l.borneDe ? ':' + l.borneDe : ''), l }));
function disjonctionDe(nom) { const calibre = calibreDe(nom), profil = chargeDe(nom), c = profil && profil.calibre > 0;
  return { ...verdictDisjonction(app.norme, '', calibre, profil), profil, duPn: !c, fils: protectionDesFils(app.norme, calibre, profil, filsDuDisjoncteur(nom), app.simu) }; }
// « pour 10 s », « pour 1 min », « en continu »
const pourPalier = p => p === 2 ? 'pour 2 s' : p === 10 ? 'pour 10 s' : p === 60 ? 'pour 1 min' : 'en continu';
const motFacteur = f => Math.abs(f - 1) < 1e-9 ? '' : ' (× ' + nombre(Math.round(f * 100) / 100) + ')';
/* Un temps, lisible : « 12 ms », « 3,2 s », « 2,1 min », « jamais ». */
function secondes(t) { if (!isFinite(t)) return 'jamais'; if (t < 1) return nombre(Math.round(t * 1000)) + ' ms'; if (t < 60) return nombre(Math.round(t * 10) / 10) + ' s';
  if (t < 3600) return nombre(Math.round(t / 6) / 10) + ' min'; return nombre(Math.round(t / 360) / 10) + ' h'; }
const amperes = i => nombre(Math.round(i * 100) / 100) + ' A';
/* Ce que le contrôle en dit : un problème si une phase fait déclencher, ou si un fil ne tient pas le profil ; à voir
   sans profil, sans calibre, ou si le calibre dépasse ce qu'un fil admet en continu. */
function controleDisjonction(nom) { const d = disjonctionDe(nom), out = [];
  if (!d.sansCourbe) { if (!(d.calibre > 0)) out.push({ niveau: 'att', texte: 'calibre inconnu : écris-le sur la fiche' });
    else if (d.sansProfil) out.push({ niveau: 'att', texte: `${amperes(d.calibre)} · le profil de charge est à renseigner` });
    else if (!d.valide) { const p = d.pire, m = p.marges[0], mini = d.calibreMini ? ` — un ${amperes(d.calibreMini)} tiendrait` : ' — aucun calibre de la gamme ne tient';
      out.push({ niveau: 'ko', texte: (p.t === Infinity ? `le permanent (${amperes(p.i)}) fait déclencher le ${amperes(d.calibre)} à ${m.courbe} (il tient jusqu'à ${amperes(m.admis)})`
        : `${p.nom} ${amperes(p.i)} pendant ${secondes(p.t)} : le ${amperes(d.calibre)} déclenche en ${secondes(m.temps)} à ${m.courbe}`) + mini }); } }
  d.fils.forEach(f => { const nomF = (f.cable || 'fil sans numéro') + (f.type ? ' (' + f.type + ')' : '');
    if (f.verdict === 'fil') out.push({ niveau: 'ko', texte: `${nomF} : ${f.pire.nom} ${amperes(f.pire.i)} pendant ${secondes(f.pire.t)} dépasse ${amperes(f.pire.admise)}, ce que le fil admet ${pourPalier(f.pire.palier)}${motFacteur(f.facteur)}` });
    else if (f.verdict === 'calibre') out.push({ niveau: 'att', texte: `${nomF} admet ${amperes(f.continu)} en continu${motFacteur(f.facteur)}, moins que le calibre ${amperes(d.calibre)} : pas protégé en surcharge` }); });
  return out; }

/* ---- la section de la fiche -------------------------------------------------------- */
function ficheDisjonction(nom) { const d = disjonctionDe(nom), c = d.profil || {}, val = (k, q) => (c[k] && c[k][q] != null ? nombre(c[k][q]) : '');
  const etat = d.sansCourbe ? '' : !(d.calibre > 0) ? '<span class="fi-etat att"><i aria-hidden="true">!</i>Calibre ?</span>' : d.sansProfil ? '<span class="fi-etat att"><i aria-hidden="true">!</i>Profil à renseigner</span>'
    : d.valide ? '<span class="fi-etat ok"><i aria-hidden="true">✓</i>Tient</span>' : '<span class="fi-etat ko"><i aria-hidden="true">✕</i>Déclenche</span>';
  let note = '';
  if (d.calibre > 0 && !d.sansProfil && d.pire) { const p = d.pire, m = p.marges[0], froid = p.marges[p.marges.length - 1];
    if (d.valide) note = p.t === Infinity ? `Le permanent (${amperes(p.i)}) reste sous ${amperes(m.admis)}, où le ${amperes(d.calibre)} ne déclenche jamais à ${m.courbe}.`
      : `${p.nom[0].toUpperCase() + p.nom.slice(1)} ${amperes(p.i)} pendant ${secondes(p.t)} : à ${m.courbe} le ${amperes(d.calibre)} tient ${secondes(m.temps)}${froid !== m ? `, à ${froid.courbe} ${secondes(froid.temps)}` : ''}.`
      + (d.calibreMini && d.calibreMini < d.calibre ? ` Un ${amperes(d.calibreMini)} tiendrait aussi.` : '');
    else note = (controleDisjonction(nom).find(x => x.niveau === 'ko') || { texte: '' }).texte; if (note) { note = note[0].toUpperCase() + note.slice(1); if (!/[.!]$/.test(note)) note += '.'; } }
  // ses fils : ce que chacun admet (la norme des fils), et s'il tient le profil
  const lf = d.fils.map(f => { const k = f.l ? cleFil(f.l) : '', titre = f.fil ? [['continu', f.fil.intensite], ['2 s', f.fil.i2s], ['10 s', f.fil.i10s], ['1 min', f.fil.i1min]].filter(x => x[1] != null).map(x => amperes(x[1] * f.facteur) + ' ' + x[0]).join(' · ') + motFacteur(f.facteur) : 'fil inconnu de la norme';
    const dit = f.verdict === 'fil' ? `<span class="fi-ko">${esc(f.pire.nom)} ${esc(amperes(f.pire.i))} pendant ${esc(secondes(f.pire.t))} : dépasse ${esc(amperes(f.pire.admise))} ${pourPalier(f.pire.palier)}</span>`
      : f.verdict === 'calibre' ? `<span class="fi-ko fi-att">sous le calibre : pas protégé en surcharge</span>` : f.verdict === 'inconnu' ? '<span class="fi-ko fi-att">fil inconnu de la norme</span>' : '';
    return `<li class="fi-fil${f.verdict === 'fil' ? ' ko' : ''}"${k ? ` data-i="${k}" tabindex="0" role="button" title="${escA(titre)}"` : ''}><span class="fi-ct"><b>${esc(f.borne)}</b></span>${puceFil(f)}<b class="fi-w">${esc(f.cable || '—')}</b><span class="fi-t">${esc(f.type || '')}</span><span class="dj-adm">${f.continu != null ? esc(amperes(f.continu)) : '—'}</span><span></span>${dit}</li>`; }).join('');
  const fils = lf ? `<ul class="fi-liste dj-fils"><li class="fi-groupe">ses fils · ce qu'ils admettent en continu</li>${lf}</ul>` : '';
  const champs = PHASES.map(([k, t, duree]) => `<div class="dj-phase"><span>${t}</span><input data-dj="${k}" data-q="i" value="${escA(val(k, 'i'))}" inputmode="decimal" placeholder="—" aria-label="${t} : courant en ampères"><i>A</i>`
    + (duree ? `<input data-dj="${k}" data-q="t" value="${escA(val(k, 't'))}" inputmode="decimal" placeholder="—" aria-label="${t} : durée en secondes"><i>s</i>` : '<i class="dj-inf">∞</i><i></i>') + '</div>').join('');
  return `<section class="fi-cadre fi-dj"><div class="fi-ref-ligne"><b class="fi-ref">Disjoncteur</b><label class="dj-calibre" title="${d.duPn && d.calibre ? 'Calibre lu dans le part number ' + escA(pnDuRepere(nom)) : 'Le calibre, en ampères'}"><input id="dj-calibre" value="${d.calibre > 0 ? escA(nombre(d.calibre)) : ''}" inputmode="decimal" placeholder="calibre" list="dj-calibres" aria-label="Calibre en ampères"><i>A</i></label>`
    + `<datalist id="dj-calibres">${CALIBRES.map(x => `<option value="${nombre(x)}">`).join('')}</datalist><span class="espace"></span>${etat}</div>`
    + (d.courbes.length ? graphiqueDisjonction(d) : '<p class="fi-note">Aucune courbe de disjonction dans la norme.</p>')
    + `<div class="dj-profil">${champs}</div>${note ? `<p class="fi-note dj-note">${esc(note)}</p>` : ''}${fils}</section>`; }
/* Le graphique : multiples de In en abscisse (0,1 à 100), temps en ordonnée (1 ms à 10 000 s), tous deux en log ; la
   zone où tout tient, à gauche de la courbe la plus rapide, en vert ; le profil en escalier, rouge s'il déclenche. */
function graphiqueDisjonction(d) { const W = 320, H = 236, L = 40, R = 10, T = 10, B = 26, x0 = -1, x1 = 2, y0 = -3, y1 = 4;
  const X = m => L + (Math.log10(m) - x0) / (x1 - x0) * (W - L - R), Y = t => T + (y1 - Math.log10(t)) / (y1 - y0) * (H - T - B);
  const borne = t => Math.min(Math.pow(10, y1), Math.max(Math.pow(10, y0), t)), xb = m => Math.min(W - R, Math.max(L, X(m)));
  const pt = p => f1(xb(p.m)) + ' ' + f1(Y(borne(p.t)));
  let s = '';
  for (let e = x0; e <= x1; e++) s += `<line class="dj-grille" x1="${f1(X(Math.pow(10, e)))}" y1="${T}" x2="${f1(X(Math.pow(10, e)))}" y2="${H - B}"/><text x="${f1(X(Math.pow(10, e)))}" y="${H - B + 11}" text-anchor="middle">${nombre(Math.pow(10, e))}</text>`;
  for (let e = y0; e <= y1; e++) s += `<line class="dj-grille" x1="${L}" y1="${f1(Y(Math.pow(10, e)))}" x2="${W - R}" y2="${f1(Y(Math.pow(10, e)))}"/><text x="${L - 4}" y="${f1(Y(Math.pow(10, e))) + 3}" text-anchor="end">${e >= 3 ? nombre(Math.pow(10, e - 3)) + 'k' : nombre(Math.pow(10, e))}</text>`;
  s += `<text x="${f1((L + W - R) / 2)}" y="${H - 2}" text-anchor="middle" class="dj-titre">× In</text><text transform="translate(9 ${f1((T + H - B) / 2)}) rotate(-90)" text-anchor="middle" class="dj-titre">s</text>`;
  const rapide = d.courbes[0], b0 = rapide.brut[0], bn = rapide.brut[rapide.brut.length - 1];
  s += `<path class="dj-zone" d="M${L} ${T} L${f1(xb(b0.m))} ${T} L${rapide.brut.map(pt).join(' L')} L${f1(xb(bn.m))} ${H - B} L${L} ${H - B} Z"/>`;
  d.courbes.forEach((c, k) => { s += `<path class="dj-courbe" style="stroke:${COULEURS_COURBES[Math.min(k, COULEURS_COURBES.length - 1)]}" d="M${c.brut.map(pt).join(' L')}"/>`; });
  // le profil : du haut (le permanent, pour toujours) vers le bas, un escalier — à chaque point, descendre puis aller à droite
  const P = d.points.filter(p => p.multiple > 0).slice().sort((a, b) => a.i - b.i);
  if (P.length) { let x = xb(P[0].multiple), y = T, path = `M${f1(x)} ${f1(y)}`, ronds = '';
    P.forEach((p, k) => { if (k) { y = Y(borne(p.t)); path += ` L${f1(x)} ${f1(y)}`; x = xb(p.multiple); path += ` L${f1(x)} ${f1(y)}`; }
      ronds += `<circle class="dj-point${p.ok === false ? ' ko' : ''}" cx="${f1(x)}" cy="${f1(k ? y : T + 3)}" r="3.2"><title>${escA(p.nom + ' : ' + amperes(p.i) + (isFinite(p.t) ? ' pendant ' + secondes(p.t) : ', pour toujours'))}</title></circle>`; });
    path += ` L${f1(x)} ${H - B}`; s += `<path class="dj-systeme${d.valide ? '' : ' ko'}" d="${path}"/>${ronds}`; }
  s += `<rect class="dj-axe" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="none"/>`;
  const legende = d.courbes.map((c, k) => `<span><i style="background:${COULEURS_COURBES[Math.min(k, COULEURS_COURBES.length - 1)]}"></i>${esc(c.nom)}</span>`).join('') + (P.length ? '<span><i style="background:#26323f"></i>profil</span>' : '');
  return `<figure class="dj-graphe"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbes de disjonction et profil de charge">${s}</svg><figcaption class="dj-legende">${legende}</figcaption></figure>`; }
/* Les champs : chaque changement s'écrit au contrat (Ctrl+Z le défait) et la fiche se refait. */
function lierDisjonction(nom) { const sec = $('ba-equip').querySelector('.fi-dj'); if (!sec) return;
  const n = v => { const t = String(v == null ? '' : v).trim().replace(',', '.'); if (t === '') return null; const x = parseFloat(t); return isNaN(x) || x < 0 ? null : x; };
  const lire = () => { const c = {}; const cal = n($('dj-calibre').value); c.calibre = cal > 0 ? cal : null;
    PHASES.forEach(([k]) => { const i = sec.querySelector(`[data-dj="${k}"][data-q="i"]`), t = sec.querySelector(`[data-dj="${k}"][data-q="t"]`); c[k] = { i: i ? n(i.value) : null, t: t ? n(t.value) : null }; });
    return c; };
  sec.querySelectorAll('input').forEach(el => el.addEventListener('change', () => { histPush('profil de charge de ' + nom); app.contrat.charges.set(nom, lire()); apresEdition(); })); }
