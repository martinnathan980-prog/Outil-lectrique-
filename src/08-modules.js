/* ===========================================================================
   08 ter — LES MODULES DE JONCTION (ASNE 0599), tels qu'on les pose
   ---------------------------------------------------------------------------
   Une barrette du contrat se pose en modules de jonction de la norme ASNE
   0599 — la seule que l'outil propose pour une barrette. Le remplissage est
   AUTOMATIQUE (`remplirModules`, 09) : chaque potentiel (une borne, ou les
   bornes que des shunts relient) prend un groupe de contacts reliés, chaque
   fil un contact dont la taille admet sa jauge ; le module le mieux taillé
   d'abord, un second s'il le faut.

   La carte d'une barrette dessine la FACE de chaque module, en léger relief
   — le bloc et son épaisseur, les contacts lettrés comme sur la norme, les
   groupes en plaques de laiton, chaque contact occupé à la couleur de la
   route de son fil, le numéro du fil dessous — puis la table contact par
   contact, ce que la norme refuse, et les variantes qui conviennent (une
   d'un clic). La bible dessine chaque variante en petit et en grand ; la vue
   en relief pose les modules sur leur rail, les fils montant des contacts.
   =========================================================================== */
'use strict';

/* Le plan d'une barrette du contrat : ses besoins, et ses modules — la variante retenue à la main, s'il y en a une. */
function planDeBarrette(nom) { const V = verite(), besoins = besoinsDeBarrette(nom, V), d = app.contrat.designations.get(nom) || '';
  const m = d ? moduleDeReference(app.norme, d) : null;
  return { besoins, plan: remplirModules(besoins, app.norme, m ? m.variante : ''), main: m ? m.variante : '' }; }
const barretteEnModules = nom => estBarrette(nom) && !estCoupure(nom) && (app.bible || []).some(e => e.module);

/* ---- la face d'un module, en léger relief -------------------------------- */
/* Mesures en pixels : le pas des contacts suit la taille du module (un module de 36 contacts est serré, un module de
   8 gros contacts aéré) ; un contact #12 est plus gros qu'un #20. */
const MJ = { pas: { 22: 36, 20: 42, 16: 50, 12: 58 }, rayon: { 22: 8.5, 20: 10, 16: 13, 12: 16 }, marge: 18, prof: 10, tete: 32 };
const pasDuModule = m => Math.max(...[...new Set(m.contacts.map(c => c.taille))].map(t => MJ.pas[t] || 34), MJ.pas[m.taille] || 34);
const rayonDe = c => MJ.rayon[c.taille] || 8;
/* L'ARBRE d'un groupe : les traits les plus courts qui relient ses contacts (une plaque de laiton suit ces traits). */
function arbreDuGroupe(pts) { if (pts.length < 2) return []; const dans = [0], aretes = [];
  while (dans.length < pts.length) { let mieux = null;
    dans.forEach(i => pts.forEach((p, j) => { if (dans.includes(j)) return; const d = Math.hypot(p.x - pts[i].x, p.y - pts[i].y); if (!mieux || d < mieux.d - 0.01) mieux = { i, j, d }; }));
    dans.push(mieux.j); aretes.push([pts[mieux.i], pts[mieux.j]]); }
  return aretes; }
/* La face : `occupe(contact)` rend le fil (et sa couleur) d'un contact, ou rien. Rend { svg, w, h }. */
function faceModuleSvg(m, occupe, opts) { opts = opts || {};
  // avec les numéros de fil sous les contacts, les rangées s'écartent d'une ligne de texte
  const pas = pasDuModule(m), pasY = pas + (opts.etiquettes ? 10 : 0), W = m.colonnes * pas + 2 * MJ.marge, H = m.rangs * pasY + 2 * MJ.marge, P = MJ.prof;
  // le sous-titre se coupe à ses « · » pour tenir dans la largeur du module (5,2 px par signe, à peu près)
  const lignes = []; String(opts.sous || '').split(' · ').forEach(b => { const n = lignes.length - 1;
    if (n >= 0 && (lignes[n] + ' · ' + b).length * 5.2 <= W + P) lignes[n] += ' · ' + b; else lignes.push(b); });
  const T = opts.titre ? MJ.tete + 10.5 * Math.max(0, lignes.length - 1) : 4;
  const pos = c => ({ x: MJ.marge + (c.c + 0.5) * pas, y: T + MJ.marge + (c.r + 0.5) * pasY - (opts.etiquettes ? 4 : 0) });
  let s = '';
  // l'ombre portée, l'épaisseur (le côté droit et le dessous), puis la face
  s += `<rect class="mj-ombre" x="${P + 3}" y="${T + P + 4}" width="${W}" height="${H}" rx="9"/>`;
  s += `<path class="mj-flanc" d="M${W} ${T + 8} l${P} ${P} V${T + H + P - 8} q0 8 -8 8 H${P + 8} l${-P} ${-P} H${W - 8} q8 0 8 -8 Z"/>`;
  s += `<rect class="mj-corps" x="0" y="${T}" width="${W}" height="${H}" rx="9"/><rect class="mj-insert" x="6" y="${T + 6}" width="${W - 12}" height="${H - 12}" rx="6"/>`;
  // les groupes : une plaque de laiton le long de l'arbre de leurs contacts ; un groupe qui porte un potentiel se teinte
  m.groupes.forEach(g => { const pts = g.contacts.map(pos), r = Math.max(...g.contacts.map(rayonDe)), o = occupe ? g.contacts.map(occupe).find(Boolean) : null;
    const d = arbreDuGroupe(pts).map(([a, b]) => `M${f1(a.x)} ${f1(a.y)}L${f1(b.x)} ${f1(b.y)}`).join('') || `M${f1(pts[0].x)} ${f1(pts[0].y)}h0.01`;
    s += `<path class="mj-plaque-bord" d="${d}" style="stroke-width:${f1(2 * r + 9)}"/><path class="mj-plaque${o ? ' prise' : ''}" d="${d}" style="stroke-width:${f1(2 * r + 6)}${o ? ';stroke:' + o.couleurClaire : ''}"/>`; });
  // les diodes du module à diodes : de l'anode à la cathode, entre les deux groupes
  (m.diodes || []).forEach(([a, k]) => { const ga = m.groupes.find(g => g.contacts[0].lettre.startsWith(a)), gk = m.groupes.find(g => g.contacts[0].lettre.startsWith(k)); if (!ga || !gk) return;
    const pa = pos(ga.contacts[0]), pk = pos(gk.contacts[gk.contacts.length - 1]), mx = (pa.x + pk.x) / 2, my = (pa.y + pk.y) / 2, sens = pk.y < pa.y ? -1 : 1;
    s += `<path class="mj-diode" d="M${f1(mx)} ${f1(pa.y)}V${f1(pk.y)}M${f1(mx - 6)} ${f1(my - 4 * sens)}h12l-6 ${8 * sens}zM${f1(mx - 6)} ${f1(my + 4 * sens)}h12"/>`; });
  // les contacts : un fût de métal, son trou ; occupé, le trou à la couleur de la route
  m.contacts.forEach(c => { const p = pos(c), r = rayonDe(c), o = occupe ? occupe(c) : null;
    s += `<g class="mj-contact${o ? ' plein' : ''}${o && o.ko ? ' ko' : ''}"${o ? ` data-i="${o.i}" data-fils="${o.i}"` : ''}><circle class="mj-fut" cx="${f1(p.x + 1)}" cy="${f1(p.y + 1.5)}" r="${f1(r + 1)}"/><circle class="mj-bague" cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1(r)}"/>`
      + `<circle class="mj-trou" cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1(r * 0.48)}"${o ? ` style="fill:${o.couleur}"` : ''}/>`
      + `<text class="mj-lettre" x="${f1(p.x - r - 1.5)}" y="${f1(p.y - r + 2)}" text-anchor="end">${esc(c.lettre)}</text>`
      + (o && opts.etiquettes ? `<text class="mj-cable" x="${f1(p.x)}" y="${f1(p.y + r + 8.5)}" text-anchor="middle">${esc(clip(o.cable, 7))}</text>` : '') + '</g>'; });
  if (opts.titre) s += `<text class="mj-titre" x="0" y="12">${esc(opts.titre)}</text>` + lignes.map((l, i) => `<text class="mj-sous" x="0" y="${f1(24 + 10.5 * i)}">${esc(l)}</text>`).join('');
  return { svg: s, w: W + P + 4, h: T + H + P + 5 }; }
/* Une rangée de faces, passant à la ligne quand elles ne tiennent pas en largeur. */
function facesSvg(faces, largeur) { let x = 0, y = 0, ligne = 0, wMax = 0, s = '';
  faces.forEach(f => { if (x > 0 && x + f.w > largeur) { x = 0; y += ligne + 14; ligne = 0; }
    s += `<g transform="translate(${f1(x)},${f1(y)})">${f.svg}</g>`; x += f.w + 18; ligne = Math.max(ligne, f.h); wMax = Math.max(wMax, x - 18); });
  return `<svg class="mj" width="${f1(wMax)}" height="${f1(y + ligne)}" viewBox="0 0 ${f1(wMax)} ${f1(y + ligne)}" role="img" aria-label="Faces des modules de jonction">${s}</svg>`; }
// « 18 × 2 », « 2 × 8 + 2 × 10 » : les groupes d'un module, comptés par taille
const tailleDesGroupes = m => { const n = new Map(); m.groupes.forEach(g => n.set(g.contacts.length, (n.get(g.contacts.length) || 0) + 1));
  return [...n].sort((a, b) => b[1] - a[1] || b[0] - a[0]).map(([t, k]) => k > 1 ? k + ' × ' + t : String(t)).join(' + '); };
const resumeModule = m => `${m.contacts.length} contacts #${[...new Set(m.contacts.map(c => c.taille))].join('/#')} · ${pluriel(m.groupes.length, 'groupe')} (${tailleDesGroupes(m)})${m.poids != null ? ' · ' + nombre(m.poids) + ' g' : ''}${m.hauteur != null ? ' · H ' + nombre(m.hauteur) + ' mm' : ''}`;

/* ---- la carte d'une barrette en modules ---------------------------------- */
function carteModules(nom) { const { besoins: b, plan: Q, main } = planDeBarrette(nom), V = verite(), routes = couleursDesRoutes(), s = k => k > 1 ? 's' : '';
  const parContact = new Map(); Q.fils.forEach(x => parContact.set(x.module + '|' + x.contact.lettre, x));
  const infoFil = x => { const l = x.f.l, coul = routes.get((l && l.route) || '') || '#26323f'; return { i: V.indexOf(l), cable: x.f.cable || '—', couleur: coul, couleurClaire: melanger(coul, 0.72), ko: x.jaugeOk === false }; };
  const faces = Q.modules.map((M, k) => faceModuleSvg(M.module, c => { const x = parContact.get(k + '|' + c.lettre); return x ? infoFil(x) : null; },
    { titre: (Q.modules.length > 1 ? (k + 1) + ' · ' : '') + M.reference, sous: resumeModule(M.module), etiquettes: true }));
  const libres = Q.contacts - Q.utilises, ko = Q.fils.filter(x => x.jaugeOk === false).length;
  const dou = main ? 'choisie à la main' : Q.modules.length ? 'remplie automatiquement selon la norme ASNE 0599' : 'aucun module ne convient';
  const compte = [pluriel(Q.modules.length, 'module'), `${Q.places} potentiel${s(Q.places)} sur ${Q.potentiels}`, pluriel(Q.utilises, 'contact') + ' pris', pluriel(libres, 'libre')].join(' · ')
    + (b.jaugeFine != null ? ` · jauge ${jaugeTexte(b)}` : '') + (ko ? ` · <span class="ko">${pluriel(ko, 'fil')} hors taille</span>` : '');
  const ligne = x => { const l = x.f.l, i = V.indexOf(l), coul = routes.get((l && l.route) || '') || '#26323f', g = x.groupe;
    return `<tr class="fil${x.jaugeOk === false ? ' sim-jauge' : ''}" data-i="${i}" data-fils="${i}" tabindex="0" role="button" aria-label="${escA('Voir le fil ' + (x.f.cable || '') + ' sur le plan')}">`
      + `<td class="c">${Q.modules.length > 1 ? (x.module + 1) + '·' : ''}<b>${esc(x.contact.lettre)}</b><span class="sens">#${x.taille}</span></td><td>${esc(x.potentiel.bornes.join('-'))}<span class="sens">groupe ${esc(g.nom)}</span></td>`
      + `<td class="m"><i class="mj-pastille" style="background:${coul}"></i><b>${esc(x.f.cable || '—')}</b><span class="dest">${esc(destination(x.f))}</span></td>`
      + `<td class="m${x.jaugeOk === false ? ' ko' : ''}">${esc(x.f.type || '—')}${x.jaugeOk === false ? '<span class="ko">refusé par le contact</span>' : x.jaugeOk == null ? '<span class="att">jauge inconnue</span>' : ''}</td></tr>`; };
  const table = Q.fils.length ? `<div class="mj-table simu-defile"><table class="simu-tab mj-tab"><thead><tr><th>contact</th><th>borne · groupe</th><th>fil</th><th>type</th></tr></thead><tbody>`
    + Q.fils.slice().sort((a, b2) => a.module - b2.module || a.groupe.k - b2.groupe.k || a.groupe.contacts.indexOf(a.contact) - b2.groupe.contacts.indexOf(b2.contact)).map(ligne).join('') + '</tbody></table></div>' : '';
  const verdicts = `<div class="verdicts"><div class="regle">remplissage : un potentiel par groupe, un fil par contact, la jauge admise par la taille du contact — ${Q.verdicts.length + ko ? pluriel(Q.verdicts.length + ko, 'remarque') : 'rien à redire'}</div>`
    + Q.verdicts.map(v => `<div class="verdict-l ${v.niveau}">${esc(v.texte)}</div>`).join('')
    + Q.fils.filter(x => x.jaugeOk === false).map(x => `<div class="verdict-l ko">${esc((x.f.cable || '') + ' (' + x.f.type + ') : jauge ' + x.f.jauge + ' refusée par un contact #' + x.taille)}</div>`).join('') + '</div>';
  return `<div class="bar-ref"><span class="ref">${esc(Q.reference || '—')}</span><span class="dou">${dou}</span></div><div class="phy-compte">${compte}</div>`
    + `<div class="bar-norme">norme <b>ASNE 0599</b> · modules de jonction NF L 53-105 · contacts lettrés, groupes reliés dans le module</div>`
    + `<div class="mj-faces">${Q.modules.length ? facesSvg(faces, largeurCarte()) : ''}</div>`
    + `<div class="legende"><span class="l-trou occ"></span>contact pris (couleur de la route) · <span class="l-trou"></span>contact libre · <span class="l-peigne"></span>groupe : contacts reliés dans le module</div>`
    + verdicts + table + choixModules(nom, b, Q, main); }
// une couleur éclaircie vers le blanc, pour la plaque d'un groupe pris
const melanger = (h, k) => '#' + rvb(h).map(c => Math.round(c + (255 - c) * k).toString(16).padStart(2, '0')).join('');
/* Les variantes qui logent la barrette d'un seul module, d'un clic ; le retour au remplissage automatique. */
function choixModules(nom, b, Q, main) { const vs = variantesQuiLogent(b, app.norme).slice(0, 10), retenue = main || (Q.modules.length === 1 ? Q.modules[0].module.variante : '');
  return `<details class="choix"${app.base.choixOuvert ? ' open' : ''}><summary><span>Les variantes qui conviennent</span><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>`
    + `<div class="raisons"><span>${pluriel(Q.potentiels, 'potentiel')} à loger</span><span>${pluriel(Q.fils.length + Q.restants.reduce((n, p) => n + p.fils.length, 0), 'fil')}</span>${b.jaugeFine != null ? `<span>jauge ${jaugeTexte(b)}</span>` : ''}${b.pn ? `<span>fichier : ${esc(b.pn)}</span>` : ''}</div>`
    + (vs.length ? `<div class="cands"><div class="sur">D'un seul module</div>` + vs.map(m => `<button class="cand" data-ref="${escA(m.reference)}" aria-pressed="${m.variante === retenue}"><b>${esc(m.variante)}</b><span>${esc(resumeModule(m))}</span>${m.variante === retenue ? '<span class="ok">retenue</span>' : ''}</button>`).join('') + '</div>'
      : '<p class="note">Aucune variante ne loge la barrette d’un seul module : elle en prend plusieurs.</p>')
    + (main ? '<button class="btn lien" id="bar-auto">Revenir au remplissage automatique</button>' : '')
    + `<button class="btn lien" id="bar-bible" data-ref="${escA(Q.modules.length ? Q.modules[0].reference : '')}">Voir dans la bible</button></details>`; }
function lierCarteModules(nom) { const box = $('ba-equip');
  const choix = box.querySelector('details.choix'); if (choix) choix.addEventListener('toggle', () => { app.base.choixOuvert = choix.open; });
  box.querySelectorAll('.cand').forEach(bt => bt.onclick = () => { if (bt.getAttribute('aria-pressed') === 'true') return; const ref = bt.dataset.ref;
    histPush('modules de ' + nom); designer(nom, ref); apresEdition(); dire(nom + ' : ' + ref + ' retenue.'); });
  const auto = $('bar-auto'); if (auto) auto.onclick = () => { histPush('modules de ' + nom); designer(nom, ''); apresEdition(); dire(nom + ' : remplissage automatique.'); };
  const bible = $('bar-bible'); if (bible) bible.onclick = () => ficheBible(bible.dataset.ref);
  const indices = el => (el.dataset.fils || '').split(' ').filter(Boolean).map(Number); let dernier = null;
  const viser = t => { const idx = indices(t), V = verite(); allumerFils(idx.map(i => filDe(V[i])).filter(Boolean)); marquerVisees(idx);
    box.querySelectorAll('.mj-contact, .mj-tab tr.fil').forEach(x => x.classList.toggle('vise', !!x.dataset.i && x.dataset.i === t.dataset.i)); };
  const lacher = () => { dernier = null; box.querySelectorAll('.vise').forEach(x => x.classList.remove('vise')); marquerVisees([]); rallumer(); };
  box.addEventListener('mouseover', e => { const t = e.target.closest('.mj-contact.plein, .mj-tab tr.fil'); if (!t || t === dernier) return; dernier = t; viser(t); });
  box.addEventListener('mouseout', e => { if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.mj, .mj-tab')) return; if (dernier) lacher(); });
  box.addEventListener('click', e => { const t = e.target.closest('.mj-contact.plein, .mj-tab tr.fil'); if (t) voirFilDeCarte(+t.dataset.i); });
  box.addEventListener('keydown', e => { const t = e.target.closest('.mj-tab tr.fil'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); voirFilDeCarte(+t.dataset.i); } }); }

/* ---- la bible : chaque variante en petit, et en grand ------------------- */
function pictoModule(m) { const k = 30 / Math.max(m.colonnes * 6, m.rangs * 6), W = m.colonnes * 6 * k, H = m.rangs * 6 * k, pos = c => ({ x: (c.c + 0.5) * 6 * k, y: (c.r + 0.5) * 6 * k });
  return `<svg class="picto mj-picto" width="${f1(W + 4)}" height="${f1(H + 4)}" viewBox="-2 -2 ${f1(W + 4)} ${f1(H + 4)}" aria-hidden="true"><rect class="p-corps" x="-1.5" y="-1.5" width="${f1(W + 3)}" height="${f1(H + 3)}" rx="2"/>`
    + m.groupes.map(g => { const pts = g.contacts.map(pos), d = arbreDuGroupe(pts).map(([a, b]) => `M${f1(a.x)} ${f1(a.y)}L${f1(b.x)} ${f1(b.y)}`).join('') || `M${f1(pts[0].x)} ${f1(pts[0].y)}h0.01`;
      return `<path class="p-groupe" d="${d}" style="stroke-width:${f1(4 * k)}"/>`; }).join('')
    + m.contacts.map(c => { const p = pos(c); return `<circle class="p-contact" cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1((c.taille <= 12 ? 2 : c.taille <= 16 ? 1.7 : 1.3) * k)}"/>`; }).join('') + '</svg>'; }
function zoomModule(e) { const m = moduleDeReference(app.norme, e.reference); if (!m) return '';
  const N = normeDesModules(app.norme), tailles = [...new Set(m.contacts.map(c => c.taille))].map(t => { const T = N.tailles.find(x => x.taille === t); return '#' + t + (T ? ' : ' + T.jaugeMin + '–' + T.jaugeMax + ' AWG' : ''); });
  const f = faceModuleSvg(m, null, {});
  const carac = [['norme', 'ASNE 0599 · NF L 53-105'], ['variante', m.variante], ['type', m.type === 'mixte' ? 'mixte (tailles de contact variables)' : m.type === 'diodes' ? 'à diodes incorporées' : 'type ' + m.type],
    ['contacts', String(m.contacts.length)], ['groupes', tailleDesGroupes(m)], ['tailles', tailles.join(' ; ')],
    ['masse', m.poids != null ? nombre(m.poids) + ' g' : '—'], ['hauteur', m.hauteur != null ? nombre(m.hauteur) + ' mm' : '—'],
    ['désignation', m.reference + ' (module à retour, tenue aux fluides Z)'], ['note', m.note]];
  return `<div class="bible-zoom"><div class="bz-tete"><div class="min0"><div class="sur">module de jonction</div><div class="bz-ref">${esc(e.reference)}</div></div>
      <button class="rond fermer" id="bz-fermer" aria-label="Replier la référence"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="mj-faces"><svg class="mj" width="${f1(f.w)}" height="${f1(f.h)}" viewBox="0 0 ${f1(f.w)} ${f1(f.h)}" role="img" aria-label="${escA('Face du module ' + m.variante)}">${f.svg}</svg></div>
    <div class="bar-faits">${carac.map(([k, v]) => `<span>${esc(k)}</span><span>${esc(v)}</span>`).join('')}</div>
    <p class="note">Borne de jonction : E0599B01. Shunt : E0599S01A (2 trous), B (3), C (4), D (5).</p></div>`; }

/* ---- le relief : les modules sur leur rail, les fils montant des contacts -- */
// un cylindre debout (axe Y), de y0 à y1
function cylindreDebout(cx, cz, y0, y1, r, coul, extra, n) { n = n || 14; const fs = [], pt = (k, y) => ({ x: cx + r * Math.cos(2 * Math.PI * k / n), y, z: cz + r * Math.sin(2 * Math.PI * k / n) });
  for (let k = 0; k < n; k++) { const a = 2 * Math.PI * (k + 0.5) / n; fs.push(face([pt(k + 1, y0), pt(k, y0), pt(k, y1), pt(k + 1, y1)], { x: Math.cos(a), y: 0, z: Math.sin(a) }, coul, extra)); }
  fs.push(face(Array.from({ length: n }, (_, k) => pt(k, y1)), { x: 0, y: 1, z: 0 }, coul, extra));
  return fs; }
const RM = { pas: { 22: 26, 20: 30, 16: 36, 12: 42 }, marge: 14, ecart: 34 };
function sceneModules(Q) { const faces = [], fils = [], textes = [], trous = [], routes = couleursDesRoutes(), V = verite();
  const parContact = new Map(); Q.fils.forEach(x => parContact.set(x.module + '|' + x.contact.lettre, x));
  let x0 = 0;
  Q.modules.forEach((M, k) => { const m = M.module, pas = RM.pas[m.taille] || 15, w = m.colonnes * pas + 2 * RM.marge, d = m.rangs * pas + 2 * RM.marge, h = (m.hauteur || 20) * 2.2;
    const pos = c => ({ x: x0 + RM.marge + (c.c + 0.5) * pas, z: RM.marge + (c.r + 0.5) * pas });
    faces.push(...boite(x0 - 3, -6, -4, x0 + w + 3, 0, d + 4, '#9aa4ae'));                 // le rail
    faces.push(...boite(x0, 0, 0, x0 + w, h, d, '#3f4b5a'));                               // le corps
    // les plaques des groupes, à peine en saillie, le long de l'arbre de leurs contacts
    m.groupes.forEach(g => { const pts = g.contacts.map(pos), pris = g.contacts.some(c => parContact.has(k + '|' + c.lettre));
      arbreDuGroupe(pts.map(p => ({ x: p.x, y: p.z }))).forEach(([a, b]) => { const e = pas * 0.28;
        faces.push(...boite(Math.min(a.x, b.x) - e, h, Math.min(a.y, b.y) - e, Math.max(a.x, b.x) + e, h + 1.6, Math.max(a.y, b.y) + e, pris ? '#c8954a' : '#a8916b')); });
      if (pts.length === 1) faces.push(...boite(pts[0].x - pas * 0.28, h, pts[0].z - pas * 0.28, pts[0].x + pas * 0.28, h + 1.6, pts[0].z + pas * 0.28, pris ? '#c8954a' : '#a8916b')); });
    m.contacts.forEach(c => { const p = pos(c), x = parContact.get(k + '|' + c.lettre), r = (c.taille <= 12 ? 0.36 : c.taille <= 16 ? 0.32 : 0.28) * pas;
      faces.push(...cylindreDebout(p.x, p.z, h + 1.6, h + 6, r, x ? '#d9b36a' : '#b7bec6'));
      const f = x ? { i: V.indexOf(x.f.l), f: x.f, cable: x.f.cable, vers: x.f.vers, borne: x.f.borne, type: x.f.type } : null;
      trous.push({ p: { x: p.x, y: h + 6.1, z: p.z }, f, mauvais: !!(x && x.jaugeOk === false) });
      textes.push({ p: { x: p.x - r - 2.5, y: h + 6.1, z: p.z - r - 1 }, t: c.lettre, cls: 're-num petit', face: { x: 0, y: 1, z: 0 } });
      if (!f) return;
      // le fil monte du contact, puis part vers l'arrière (ce qui arrive) ou vers l'avant (ce qui repart)
      const amont = !!x.f.amont, monte = 26 + 8 * (c.r % 4), loin = amont ? -RM.ecart : d + RM.ecart;
      fils.push({ pts: [{ x: p.x, y: h + 6, z: p.z }, { x: p.x, y: h + monte, z: p.z }, { x: p.x, y: h + monte, z: loin }], f, sens: amont ? 'amont' : 'aval' }); });
    textes.push({ p: { x: x0 + w / 2, y: h * 0.45, z: d }, t: m.variante, cls: 're-num', face: { x: 0, y: 0, z: 1 } });
    x0 += w + RM.ecart; });
  return { faces, fils, textes, trous }; }
function tableauModules(Q) { const routes = couleursDesRoutes(), V = verite();
  const lignes = Q.fils.slice().sort((a, b) => a.module - b.module || a.groupe.k - b.groupe.k || a.groupe.contacts.indexOf(a.contact) - b.groupe.contacts.indexOf(b.contact)).map(x => {
    const l = x.f.l, i = V.indexOf(l), coul = routes.get((l && l.route) || '') || '#26323f';
    return `<tr><td class="n">${Q.modules.length > 1 ? (x.module + 1) + '·' : ''}${esc(x.contact.lettre)}</td><td>${esc(x.groupe.nom)} · borne ${esc(x.potentiel.bornes.join('-'))}</td>`
      + `<td><span class="re-f" data-i="${i}"><i style="background:${coul}"></i><b>${esc(x.f.cable || '—')}</b> ${esc(destination(x.f))}${x.f.type ? ' <em>' + esc(x.f.type) + '</em>' : ''}${x.jaugeOk === false ? ' <span class="ko">refusé par le contact</span>' : ''}</span></td></tr>`; }).join('');
  return `<table class="re-tab"><thead><tr><th>Contact</th><th>Groupe · potentiel</th><th>Fil</th></tr></thead><tbody>${lignes}</tbody></table>`; }
