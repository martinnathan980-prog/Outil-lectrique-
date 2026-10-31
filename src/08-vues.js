/* ===========================================================================
   08 — LES VUES DE LA FICHE (v78) : la pièce dessinée, et pourquoi elle est ainsi
   Le lecteur, sur la maquette : « le schéma qui parle, c'est bien » ; « il faut qu'on comprenne d'où ça vient, pourquoi
   on en est là — toutes les infos de manière précise, propre, mais très simple ». Ce module dessine, pour chaque genre
   d'objet, ce qu'on comprend d'un coup d'œil :
     · le disjoncteur — ce qu'il tire contre ses calibres (le fichier, le retenu, ceux qui passent), puis l'arbre de ses
       câbles, chacun sa charge au bout ;
     · l'équipement — la face de chaque connecteur (plein = pris, creux = libre, rouge = refusé), puis ses broches ;
     · la barrette — ses potentiels en couleur, chacun avec ses câbles ;
     · la prise de coupure — LA TRAVERSÉE : ce qui arrive par la fiche, la lettre du contact, ce qui repart par l'embase ;
     · le câble — son chemin d'un bout à l'autre, et deux jauges (l'intensité, la chute).
   Et sous chaque schéma, « COMMENT VOLTA L'A DÉCIDÉ » : trois ou quatre étapes numérotées, chacune une phrase et sa
   source en pastille (votre fichier, la norme, les tables de Volta, une hypothèse). Puis LA FABRICATION : tout ce qu'il
   faut pour monter la pièce, compté par référence.
   Ces fonctions ne calculent rien : les fiches (08-fiche) leur donnent les chiffres du moteur.
   =========================================================================== */
'use strict';

/* ---- LA FACE d'un connecteur, d'une barrette, d'une prise : chaque contact à sa place (r, c), plein s'il est pris,
   rouge s'il refuse ; `couleur(ct)` (une barrette : la couleur de son potentiel) ; `rond` : une prise circulaire. ---- */
function faceVue(contacts, etatDe, o) { o = o || {}; const n = (contacts || []).length;
  if (!n) return `<svg class="vu-face vu-vide" viewBox="0 0 120 84" width="${o.w || 120}" role="img" aria-label="Aucun arrangement"><rect class="vu-corps" x="4" y="4" width="112" height="76" rx="10"/><text x="60" y="40">aucun</text><text x="60" y="53">arrangement</text></svg>`;
  const xs = contacts.map(c => +c.c || 0), ys = contacts.map(c => +c.r || 0), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  // (les lettres s'écrivent DANS les contacts : au-dessus, elles chevauchaient le rang d'avant)
  const R = o.r || 8, p = Math.max(o.pas || 26, o.lettres ? 2 * R + 6 : 0), m = o.rond ? 28 : 18, W = (x1 - x0) * p + 2 * m, H = (y1 - y0) * p + 2 * m;
  const corps = o.rond ? `<circle class="vu-corps" cx="${W / 2}" cy="${H / 2}" r="${(Math.max(W, H) / 2 - 3).toFixed(1)}"/><rect class="vu-cle" x="${W / 2 - 5}" y="1" width="10" height="7" rx="2"/>`
    : `<rect class="vu-corps" x="2" y="2" width="${W - 4}" height="${H - 4}" rx="${o.mini ? 7 : 11}"/><rect class="vu-cle" x="${W / 2 - 13}" y="${H - 5}" width="26" height="4" rx="2"/>`;
  const cts = contacts.map(c => { const x = m + ((+c.c || 0) - x0) * p, y = m + ((+c.r || 0) - y0) * p, st = etatDe(c) || '', col = o.couleur ? o.couleur(c) : '', L = String(c.lettre || '');
    const style = col ? (st === 'pris' ? ` style="fill:${col};stroke:${col}"` : ` style="stroke:${col}"`) : '';
    return `<g class="vu-ct-g" data-ct="${escA(L)}"><circle class="vu-ct ${st}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${R}"${style}/>${o.lettres ? `<text class="${st}${L.length > 2 ? ' long' : ''}" x="${x.toFixed(1)}" y="${(y + 3.4).toFixed(1)}">${esc(L)}</text>` : ''}</g>`; }).join('');
  return `<svg class="vu-face${o.mini ? ' mini' : ''}" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" width="${o.w || W}" role="img" aria-label="${escA(o.titre || 'La face')}">${corps}${cts}</svg>`; }
const legendeFaceVue = (avecKo) => `<p class="vu-legende"><span><i class="pris"></i>pris</span><span><i></i>libre</span>${avecKo ? '<span><i class="ko"></i>refusé</span>' : ''}</p>`;

/* ---- CE QU'IL TIRE, CE QU'IL TIENT (un disjoncteur) : le démarrage et le permanent en barres, sur l'échelle des
   ampères ; au pied, les calibres de la gamme (vert : il passe ; rouge : non) ; le retenu en trait plein, celui du
   fichier en pointillé rouge quand il touche la courbe. ---- */
function chargeVue(d, o, W, mini) { const ch = chargeDuProfil(d), cal = d.calibre, gamme = (d.gamme || []).filter(g => g.calibre > 0);
  if (!gamme.length || !(ch.perm || ch.pointe)) return `<p class="vu-note">${esc(d.sansProfil ? 'Sans profil de charge, rien ne se juge : écrivez-le dans l’onglet Calibre.' : 'Aucune gamme de calibres connue pour ce part number.')}</p>`;
  const max = Math.max(...gamme.map(g => g.calibre), ch.pointe || 0, ch.perm || 0) * 1.08, L = 12, X = a => L + (W - 2 * L) * a / max;
  const bh = mini ? 10 : 14, y1 = mini ? 36 : 50, y2 = y1 + (mini ? 28 : 44), H = mini ? 106 : 160, yt = H - 13;
  const cRet = o && o.calRetest && o.calRetest !== cal ? o.calRetest : null, pointe = ch.pointe || ch.perm, dur = ch.pointeP && ch.pointeP.t !== Infinity ? secondes(ch.pointeP.t) : '';
  const quand = majuscule(String(quandDuPoint(ch.pointeP) || 'en pointe').replace(/^(au|en) /, ''));
  const barre = (y, v, cls) => `<rect class="vu-rail" x="${X(0)}" y="${y}" width="${(X(max) - X(0)).toFixed(1)}" height="${bh}" rx="${bh / 2}"/><rect class="${cls}" x="${X(0)}" y="${y}" width="${Math.max(bh, X(v) - X(0)).toFixed(1)}" height="${bh}" rx="${bh / 2}"/>`;
  const ticks = gamme.map(g => { const k = cleDuVerdict(g); return `<circle class="vu-tick ${k === 'passe' ? 'oui' : 'non'}" cx="${X(g.calibre).toFixed(1)}" cy="${yt - 11}" r="3"/><text class="vu-t-pied" x="${X(g.calibre).toFixed(1)}" y="${yt + 2}">${esc(nombre(g.calibre))}</text>`; }).join('');
  const mots = mini ? `<text class="vu-t" x="${X(0)}" y="${y1 - 5}">${esc(quand)} <tspan class="vu-t-fort">${esc(amperes(pointe))}</tspan></text>${ch.perm ? `<text class="vu-t" x="${X(0)}" y="${y2 - 5}">Permanent <tspan class="vu-t-fort">${esc(amperes(ch.perm))}</tspan></text>` : ''}`
    : `<text class="vu-t" x="${X(0)}" y="${y1 - 7}">${esc(quand)} <tspan class="vu-t-fort">${esc(amperes(pointe))}</tspan>${dur ? ' · pendant ' + esc(dur) : ''}</text>${ch.perm ? `<text class="vu-t" x="${X(0)}" y="${y2 - 7}">Permanent <tspan class="vu-t-fort">${esc(amperes(ch.perm))}</tspan></text>` : ''}`;
  // le retenu : son trait, son nom en haut (à droite du trait, ou à gauche quand il est au bout de l'échelle)
  const finCal = cal && X(cal) > W - 90, traitCal = cal ? `<line class="vu-cal" x1="${X(cal).toFixed(1)}" x2="${X(cal).toFixed(1)}" y1="${mini ? 14 : 8}" y2="${yt - 18}"/><text class="vu-t-fort vu-t-cal" x="${(X(cal) + (finCal ? -6 : 6)).toFixed(1)}" y="${mini ? 12 : 18}"${finCal ? ' text-anchor="end"' : ''}>${esc(amperes(cal))} retenu</text>` : '';
  const traitFic = cRet ? `<line class="vu-fic" x1="${X(cRet).toFixed(1)}" x2="${X(cRet).toFixed(1)}" y1="${mini ? 14 : 8}" y2="${yt - 18}"/>${mini ? '' : `<text class="vu-t-ko" x="${(X(cRet) - 6).toFixed(1)}" y="${yt - 24}" text-anchor="end">${esc(amperes(cRet))} du fichier</text>`}` : '';
  return `<svg class="vu-charge" viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="${escA('Ce qu’il tire contre ses calibres : ' + amperes(pointe) + ' au plus, ' + (cal ? amperes(cal) + ' retenu' : 'aucun calibre'))}">${barre(y1, pointe, 'vu-b-pointe')}${ch.perm ? barre(y2, ch.perm, 'vu-b-perm') : ''}${mots}${traitFic}${traitCal}${ticks}</svg>`; }
const legendeChargeVue = () => `<p class="vu-legende"><span><i class="carre perm"></i>permanent</span><span><i class="carre pointe"></i>démarrage</span><span><i class="ok"></i>calibre qui passe</span><span><i class="ko"></i>qui ne passe pas</span></p>`;

/* ---- L'ARBRE d'un disjoncteur : lui, puis chacun de ses câbles jusqu'à son bout, sa charge au bout ; une ligne
   s'ouvre d'un clic (data-i : la ligne du câble), son survol l'allume sur le plan. ---- */
function arbreVue(nom, cal, rows) { const n = rows.length; if (!n) return '<p class="vu-note">Aucun câble ne part de ce disjoncteur.</p>';
  const rh = 40, H = n * rh + 12, W = 600, yC = H / 2;
  const lignes = rows.map((r, i) => { const y = 16 + i * rh + 6, col = r.l ? coulDeFil({ l: r.l }) : 'currentColor', m = classeMesure(r.charge.r), w = r.charge.r != null && isFinite(r.charge.r) ? Math.min(1, r.charge.r) : 0;
    return `<g class="vu-branche fi-ia${r.etat ? ' ' + r.etat : ''}"${r.k ? ` data-i="${r.k}" tabindex="0" role="button" aria-label="${escA('Ouvrir le câble ' + (r.type || '') + ' vers ' + (r.bout ? r.bout.rep : ''))}"` : ''}>`
      + `<rect class="vu-b-fond" x="140" y="${y - 18}" width="${W - 140}" height="${rh - 4}" rx="9"/><path class="vu-br" d="M112 ${y}H220" style="stroke:${col}"/><circle class="vu-noeud" cx="112" cy="${y}" r="3.5"/>`
      + `<text class="vu-t-mono" x="232" y="${y + 4}">${esc(r.type || 'sans type')}</text><text class="vu-t" x="286" y="${y + 4}">vers</text><text class="vu-t-mono" x="316" y="${y + 4}">${esc(r.bout ? r.bout.rep : '—')}<tspan class="vu-t">${r.bout && r.bout.borne ? ':' + esc(r.bout.borne) : ''}</tspan></text>`
      + `<rect class="vu-rail" x="436" y="${y - 3}" width="80" height="6" rx="3"/><rect class="vu-j ${m}" x="436" y="${y - 3}" width="${(80 * w).toFixed(1)}" height="6" rx="3"/>`
      + `<text class="vu-t-fort" x="526" y="${y + 4}">${r.charge.i != null ? esc(nombreA(r.charge.i)) : '—'}<tspan class="vu-t">${r.charge.admis != null ? ' / ' + esc(nombreA(r.charge.admis)) + ' A' : ' A'}</tspan></text></g>`; }).join('');
  return `<svg class="vu-arbre" viewBox="0 0 ${W} ${H}" width="${W}" role="group" aria-label="${escA('Les ' + n + ' câbles de ' + nom)}"><rect class="vu-boite" x="4" y="${yC - 25}" width="88" height="50" rx="10"/><text class="vu-t-mono vu-milieu" x="48" y="${yC - 2}">${esc(nom)}</text><text class="vu-t vu-milieu" x="48" y="${yC + 14}">${cal ? esc(amperes(cal)) : ''}</text>`
    + `<path class="vu-bus" d="M92 ${yC}H112M112 22V${16 + (n - 1) * rh + 6}"/>${lignes}</svg>`; }

/* ---- LE CHEMIN d'un câble : un bout, ce qu'il traverse, l'autre bout, à la couleur de sa route ---- */
function cheminVue(o, W, mini) { const H = mini ? 66 : 104, y = mini ? 26 : 42, a = 22, b = W - 22, m = (a + b) / 2;
  const bt = (x, rep, borne, ancre, sous) => `<text class="vu-t-mono" x="${x}" y="${y + 28}" text-anchor="${ancre}">${esc(rep || '—')}<tspan class="vu-t">${borne ? ':' + esc(borne) : ''}</tspan></text>${!mini && sous ? `<text class="vu-t" x="${x}" y="${y + 45}" text-anchor="${ancre}">${esc(sous)}</text>` : ''}`;
  return `<svg class="vu-chemin" viewBox="0 0 ${W} ${H}" width="${W}" role="img" aria-label="${escA('De ' + o.de + ' à ' + o.vers)}"><path class="vu-fil" d="M${a} ${y}H${b}" style="stroke:${o.couleur || 'currentColor'}"/>`
    + `<circle class="vu-bout" cx="${a}" cy="${y}" r="6.5"/><circle class="vu-bout" cx="${b}" cy="${y}" r="6.5"/>`
    + (o.via ? `<rect class="vu-via" x="${m - 18}" y="${y - 10}" width="36" height="20" rx="6"/><text class="vu-t-mono vu-milieu vu-petit" x="${m}" y="${y + 4}">${esc(o.via)}</text>` : '')
    + (mini ? '' : `<text class="vu-t vu-milieu" x="${(a + (o.via ? m - 18 : b)) / 2}" y="${y - 12}">${esc(o.legende || '')}</text>`)
    + bt(a - 4, o.de, o.borneDe, 'start', o.sousDe) + bt(b + 4, o.vers, o.borneVers, 'end', o.sousVers) + '</svg>'; }

/* ---- LA TRAVERSÉE d'une prise de coupure : ce qui arrive par la fiche (à gauche), la lettre du contact, ce qui repart
   par l'embase (à droite) — une ligne par contact ; son survol allume la lettre sur la face et le câble sur le plan ---- */
function traverseeVue(lettres, cote) { const c = (f, g) => !f ? `<span class="vu-tr-c ${g ? 'g' : ''} vide">—</span>`
    : `<span class="vu-tr-c ${g ? 'g' : ''}${f.ko ? ' ko' : ''}"${f.k ? ` data-i="${f.k}"` : ''}>${g ? `<small class="id">${esc(f.de)}</small><b class="id">${esc(f.type || '—')}</b><i class="vu-route" style="--c:${f.couleur}"></i>` : `<i class="vu-route" style="--c:${f.couleur}"></i><b class="id">${esc(f.type || '—')}</b><small class="id">${esc(f.de)}</small>`}</span>`;
  return `<div class="vu-traverse" role="table" aria-label="Ce qui traverse la prise"><div class="vu-tr-t" role="row"><span>Arrive par la fiche</span><span></span><span>Repart par l’embase</span></div>`
    + lettres.map(l => `<div class="vu-tr-l" role="row" data-ct="${escA(l)}">${c(cote(l, true), true)}<span class="vu-tr-p"><b>${esc(l)}</b></span>${c(cote(l, false))}</div>`).join('') + '</div>'; }

/* ---- LES POTENTIELS d'une barrette : la couleur du potentiel, ses contacts, ses câbles (type → où il va) ---- */
function potentielsVue(groupes) { return `<div class="vu-pots">${groupes.map((g, i) => `<div class="vu-pot${g.ko ? ' ko' : ''}" style="--c:${g.ko ? 'var(--vu-ko)' : `var(--vu-g${(i % 6) + 1})`}" data-ct="${escA(g.lettres[0] || '')}"><i aria-hidden="true"></i><b class="id">${esc(g.lettres.join(' '))}</b>`
  + `<span>${g.fils.length ? g.fils.map(f => `<em class="id"${f.k ? ` data-i="${f.k}"` : ''}>${esc(f.type || '—')} ${f.amont ? '←' : '→'} ${esc(f.vers)}</em>`).join('') : '<em class="libre">libre</em>'}</span></div>`).join('')}</div>`; }

/* ---- LES BROCHES d'un connecteur : contact, où il va, le câble, le contact à sertir — une ligne chacune ---- */
function brochesVue(xs) { if (!xs.length) return '<p class="vu-note">Aucun câble sur ce connecteur.</p>';
  return `<table class="vu-table vu-broches"><thead><tr><th>Contact</th><th>Vers</th><th>Câble</th><th>Contact à sertir</th></tr></thead><tbody>${xs.map(x => `<tr class="fi-ia${x.ko ? ' ko' : ''}" data-ct="${escA(x.lettre)}"${x.k ? ` data-i="${x.k}" tabindex="0"` : ''}>`
    + `<td><b class="id">${esc(x.lettre || x.borne)}</b>${x.lettre && x.borne && x.borne !== x.lettre ? `<small> borne ${esc(x.borne)}</small>` : ''}</td><td class="id">${esc(x.vers)}<small>${x.borneVers ? ':' + esc(x.borneVers) : ''}</small></td>`
    + `<td><span class="vu-cab"><i class="vu-route" style="--c:${x.couleur}"></i><b class="id">${esc(x.type || '—')}</b></span>${x.ko ? `<small class="vu-ko"> ${esc(x.ko)}</small>` : ''}</td><td class="id vu-sertir">${esc(x.sertir || '—')}</td></tr>`).join('')}</tbody></table>`; }

/* ---- COMMENT VOLTA L'A DÉCIDÉ : des étapes numérotées, une phrase chacune et sa source ---- */
// sources : fichier (votre fichier), norme, tables (les tables de Volta), calcul, hypothese, main (choisi ici), base (la base SEE)
const MOTS_SOURCES = { fichier: 'votre fichier', norme: 'la norme', tables: 'tables de Volta', calcul: 'calcul de Volta', hypothese: 'hypothèse', main: 'choisi ici', base: 'base SEE' };
function pourquoiVue(titre, etapes) { const xs = (etapes || []).filter(Boolean); if (!xs.length) return '';
  return `<section class="vu-pq" aria-label="${escA(titre)}"><h4 class="vu-titre">${esc(titre)}</h4><ol>${xs.map((e, i) => `<li class="${e.etat || ''}"><span class="vu-pq-n">${i + 1}</span><span class="vu-pq-t">${e.html || esc(e.texte)}</span>`
    + `${e.source ? `<span class="vu-src ${escA(e.source)}"${e.bulle ? ` data-bulle="${escA(e.bulle)}"` : ''}>${esc(e.mot || MOTS_SOURCES[e.source] || e.source)}</span>` : ''}</li>`).join('')}</ol></section>`; }

/* ---- LA FABRICATION : tout ce qu'il faut pour monter la pièce, groupé, compté par référence ---- */
function fabricationVue(groupes) { const gs = (groupes || []).filter(g => g && g.lignes && g.lignes.length);
  if (!gs.length) return '<p class="vu-note">Rien à monter : la référence de la pièce n’est pas encore connue.</p>';
  const n = gs.reduce((s, g) => s + g.lignes.reduce((t, l) => t + (l.q || 0), 0), 0);
  return `<div class="vu-fab" data-pieces="${n}">${gs.map(g => `<section class="vu-fab-g"><h4><span>${esc(g.titre)}</span>${g.ref ? `<span class="id">${esc(g.ref)}</span>` : ''}${g.sous ? `<small>${esc(g.sous)}</small>` : ''}</h4>`
    + g.lignes.map(l => `<div class="vu-fab-l"><span class="vu-q">${l.q}<small>×</small></span><span class="vu-r"><b class="id">${esc(l.ref || '—')}</b><small>${esc(l.role || '')}</small></span>${l.statut ? `<span class="vu-st${/confirmer|manque/.test(l.statut) ? ' att' : ''}">${esc(l.statut)}</span>` : '<span></span>'}</div>`).join('') + '</section>').join('')}</div>`; }
const compterParReference = (refs, role) => { const m = new Map(); refs.filter(Boolean).forEach(r => m.set(r, (m.get(r) || 0) + 1)); return [...m].sort((a, b) => b[1] - a[1]).map(([ref, q]) => ({ q, ref, role })); };
const piecesFabrication = h => { try { return piecesHabillage(h).map(p => ({ q: p.quantite || 1, ref: p.reference || '', role: ({ cheminee: 'cheminée, à la place du raccord', tyrap: 'collier', raccord: 'raccord', bande: 'collier de blindage (band-it)', manchon: 'manchon', gaine: 'gaine', obturateur: 'obturateur des contacts libres' })[p.role] || p.libelle || p.role || '', statut: p.statut || '' })).filter(p => p.ref); } catch (_) { return []; } };
