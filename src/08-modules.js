/* ===========================================================================
   08 ter — LES MODULES DE JONCTION (ASNE 0599, NSA937901), tels qu'on les pose
   ---------------------------------------------------------------------------
   Une barrette du contrat se pose en modules de jonction de la norme ASNE
   0599 ou de la NSA937901 — les deux que l'outil propose pour une barrette :
   celle du part number du fichier, sinon la mieux taillée ; l'une ou l'autre
   d'un clic sur la carte. Le remplissage est
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

/* Le plan d'une barrette du contrat : ses besoins, et ses modules — la variante, ou la norme, retenue à la main. */
function planDeBarrette(nom) { const besoins = besoinsDeBarrette(nom, verite()), d = app.contrat.designations.get(nom) || '';
  const plan = remplirModules(besoins, app.norme, d); return { besoins, plan, main: plan.variante }; }
const barretteEnModules = nom => estBarrette(nom) && !estCoupure(nom) && (app.bible || []).some(e => e.module);
// ce que la carte dit d'une norme de modules
const DIT_FAMILLE = { E0599: 'modules de jonction NF L 53-105 · contacts lettrés, groupes reliés dans le module',
                      NSA937901: 'modules de jonction à contacts (mars 2021) · codes d’arrangement par taille de contact, contacts shuntés' };
const classeFamille = f => 'f-' + String(f || '').toLowerCase();

/* ---- la face d'un module, en léger relief -------------------------------- */
/* Mesures en pixels, par calibre de contact : le pas suit la taille (un module de 36 contacts est serré, un module de
   6 gros contacts aéré) ; un contact #12 est plus gros qu'un #20. Une face irrégulière (contacts mêlés, chacun à sa
   place) se mesure au pas de son plus petit contact. */
const MJ = { pas: { 22: 36, 20: 42, 16: 50, 12: 58 }, rayon: { 22: 8.5, 20: 10, 16: 13, 12: 16 }, marge: 18, prof: 10, tete: 32 };
const calibresDe = m => [...new Set(m.contacts.map(c => c.calibre))];
const pasDuModule = m => m.libre ? MJ.pas[Math.max(...calibresDe(m))] || 40 : Math.max(...calibresDe(m).map(t => MJ.pas[t] || 34), MJ.pas[NUMERO(m.taille)] || 34);
const rayonDe = c => MJ.rayon[c.calibre] || 8;
/* L'ARBRE d'un groupe : les traits les plus courts qui relient ses contacts (une plaque de laiton, ou le contour d'un
   shunt, suit ces traits). */
function arbreDuGroupe(pts) { if (pts.length < 2) return []; const dans = [0], aretes = [];
  while (dans.length < pts.length) { let mieux = null;
    dans.forEach(i => pts.forEach((p, j) => { if (dans.includes(j)) return; const d = Math.hypot(p.x - pts[i].x, p.y - pts[i].y); if (!mieux || d < mieux.d - 0.01) mieux = { i, j, d }; }));
    dans.push(mieux.j); aretes.push([pts[mieux.i], pts[mieux.j]]); }
  return aretes; }
const traitsDe = pts => arbreDuGroupe(pts).map(([a, b]) => `M${f1(a.x)} ${f1(a.y)}L${f1(b.x)} ${f1(b.y)}`).join('') || `M${f1(pts[0].x)} ${f1(pts[0].y)}h0.01`;
/* Le CORPS d'un module, selon la norme : le bloc ASNE 0599 à coins ronds ; le module NSA937901 aux bouts arrondis
   (« ovale »), ou étanche — un bout bombé et la plaque d'extrémité, comme sur la figure de la norme. */
function formeCorps(m, x, y, W, H) { const r = m.corps === 'ovale' ? Math.min(H * 0.3, 26) : m.corps === 'étanche' ? 6 : m.famille === 'E0599' ? 9 : 6;
  return `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(W)}" height="${f1(H)}" rx="${f1(r)}"/>`; }
// un groupe dont les contacts remplissent tout le rectangle de grille qu'ils couvrent
const blocPlein = g => { const rs = g.contacts.map(c => c.r), cs = g.contacts.map(c => c.c);
  return (Math.max(...rs) - Math.min(...rs) + 1) * (Math.max(...cs) - Math.min(...cs) + 1) === g.contacts.length; };
/* La face : `occupe(contact)` rend le fil (et sa couleur) d'un contact, ou rien. Rend { svg, w, h }. */
function faceModuleSvg(m, occupe, opts) { opts = opts || {};
  // avec les numéros de fil sous les contacts, les rangées s'écartent d'une ligne de texte
  const pas = pasDuModule(m), pasY = pas + (opts.etiquettes ? 10 : 0), bout = m.corps === 'étanche' ? 16 : 0;
  const W = m.colonnes * pas + 2 * MJ.marge + bout, H = m.rangs * pasY + 2 * MJ.marge, P = MJ.prof;
  // le sous-titre se coupe à ses « · » pour tenir dans la largeur du module (5,2 px par signe, à peu près)
  const lignes = []; String(opts.sous || '').split(' · ').forEach(b => { const n = lignes.length - 1;
    if (n >= 0 && (lignes[n] + ' · ' + b).length * 5.2 <= W + P) lignes[n] += ' · ' + b; else lignes.push(b); });
  const T = opts.titre ? MJ.tete + 10.5 * Math.max(0, lignes.length - 1) : 4;
  const pos = c => ({ x: MJ.marge + (c.c + 0.5) * pas, y: T + MJ.marge + (c.r + 0.5) * pasY - (opts.etiquettes ? 4 : 0) });
  let s = `<g class="mj-module ${classeFamille(m.famille)} corps-${m.corps === 'étanche' ? 'etanche' : m.corps}">`;
  // l'ombre portée, l'épaisseur (le bloc répété en retrait, du fond vers la face), puis la face et son insert
  s += `<g class="mj-ombre">${formeCorps(m, P + 3, T + P + 4, W, H)}</g><g class="mj-flanc">${[1, 0.75, 0.5, 0.25].map(k => formeCorps(m, P * k, T + P * k, W, H)).join('')}</g>`;
  s += `<g class="mj-corps">${formeCorps(m, 0, T, W, H)}</g><g class="mj-insert">${formeCorps(m, 6, T + 6, W - 12 - bout, H - 12)}</g>`;
  if (m.corps === 'étanche') s += `<path class="mj-bombe" d="M${f1(14)} ${f1(T + 8)}Q2 ${f1(T + H / 2)} 14 ${f1(T + H - 8)}"/><rect class="mj-plaque-bout" x="${f1(W - bout - 2)}" y="${f1(T + 3)}" width="${f1(bout - 1)}" height="${f1(H - 6)}" rx="2"/>`
    + `<path class="mj-plaque-trait" d="M${f1(W - bout + 3)} ${f1(T + 5)}V${f1(T + H - 5)}M${f1(W - 6)} ${f1(T + 5)}V${f1(T + H - 5)}"/>`;
  // les groupes. ASNE 0599 : une plaque de laiton le long de l'arbre de leurs contacts. NSA937901 : le contour du shunt,
  // comme le trace la norme (un contact seul n'en a pas). Un groupe qui porte un potentiel se teinte.
  const boucle = m.famille !== 'E0599';
  m.groupes.forEach(g => { const pts = g.contacts.map(pos), r = Math.max(...g.contacts.map(rayonDe)), o = occupe ? g.contacts.map(occupe).find(Boolean) : null, d = traitsDe(pts);
    if (boucle) { if (g.contacts.length < 2) return;
      // un groupe qui remplit un bloc de la grille, ou sur une face irrégulière : un contour arrondi autour de lui, comme la norme le trace
      if (m.libre || blocPlein(g)) { const bx = g.contacts.map(c => { const p = pos(c), q = rayonDe(c) + 5; return [p.x - q, p.y - q, p.x + q, p.y + q]; });
        const x0 = Math.min(...bx.map(v => v[0])), y0 = Math.min(...bx.map(v => v[1])), x1 = Math.max(...bx.map(v => v[2])), y1 = Math.max(...bx.map(v => v[3]));
        s += `<rect class="mj-shunt-cadre" x="${f1(x0)}" y="${f1(y0)}" width="${f1(x1 - x0)}" height="${f1(y1 - y0)}" rx="${f1(r + 5)}"${o ? ` style="fill:${o.couleurClaire}"` : ''}/>`; return; }
      s += `<path class="mj-shunt-bord" d="${d}" style="stroke-width:${f1(2 * r + 13)}"/><path class="mj-shunt${o ? ' prise' : ''}" d="${d}" style="stroke-width:${f1(2 * r + 9.5)}${o ? ';stroke:' + o.couleurClaire : ''}"/>`; }
    else s += `<path class="mj-plaque-bord" d="${d}" style="stroke-width:${f1(2 * r + 9)}"/><path class="mj-plaque${o ? ' prise' : ''}" d="${d}" style="stroke-width:${f1(2 * r + 6)}${o ? ';stroke:' + o.couleurClaire : ''}"/>`; });
  // les diodes du module à diodes : de l'anode à la cathode, entre les deux groupes
  (m.diodes || []).forEach(([a, k]) => { const ga = m.groupes.find(g => g.contacts[0].lettre.startsWith(a)), gk = m.groupes.find(g => g.contacts[0].lettre.startsWith(k)); if (!ga || !gk) return;
    const pa = pos(ga.contacts[0]), pk = pos(gk.contacts[gk.contacts.length - 1]), mx = (pa.x + pk.x) / 2, my = (pa.y + pk.y) / 2, sens = pk.y < pa.y ? -1 : 1;
    s += `<path class="mj-diode" d="M${f1(mx)} ${f1(pa.y)}V${f1(pk.y)}M${f1(mx - 6)} ${f1(my - 4 * sens)}h12l-6 ${8 * sens}zM${f1(mx - 6)} ${f1(my + 4 * sens)}h12"/>`; });
  // les contacts : un fût de métal (un joint de caoutchouc sur un module étanche), son trou ; occupé, le trou à la couleur de la route
  m.contacts.forEach(c => { const p = pos(c), r = rayonDe(c), o = occupe ? occupe(c) : null;
    s += `<g class="mj-contact${o ? ' plein' : ''}${o && o.ko ? ' ko' : ''}"${o ? ` data-i="${o.i}" data-fils="${o.i}"` : ''}><circle class="mj-fut" cx="${f1(p.x + 1)}" cy="${f1(p.y + 1.5)}" r="${f1(r + 1)}"/><circle class="mj-bague" cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1(r)}"/>`
      + `<circle class="mj-trou" cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1(r * 0.48)}"${o ? ` style="fill:${o.couleur}"` : ''}/>`
      + `<text class="mj-lettre" x="${f1(p.x - r - 1.5)}" y="${f1(p.y - r + 2)}" text-anchor="end">${esc(c.lettre)}</text>`
      + (o && opts.etiquettes ? `<text class="mj-cable" x="${f1(p.x)}" y="${f1(p.y + r + 8.5)}" text-anchor="middle">${esc(clip(o.cable, 7))}</text>` : '') + '</g>'; });
  if (opts.titre) s += `<text class="mj-titre" x="0" y="12">${esc(opts.titre)}</text>` + lignes.map((l, i) => `<text class="mj-sous" x="0" y="${f1(24 + 10.5 * i)}">${esc(l)}</text>`).join('');
  return { svg: s + '</g>', w: W + P + 4, h: T + H + P + 5 }; }
/* Une rangée de faces, passant à la ligne quand elles ne tiennent pas en largeur. */
function facesSvg(faces, largeur) { let x = 0, y = 0, ligne = 0, wMax = 0, s = '';
  faces.forEach(f => { if (x > 0 && x + f.w > largeur) { x = 0; y += ligne + 14; ligne = 0; }
    s += `<g transform="translate(${f1(x)},${f1(y)})">${f.svg}</g>`; x += f.w + 18; ligne = Math.max(ligne, f.h); wMax = Math.max(wMax, x - 18); });
  return `<svg class="mj" width="${f1(wMax)}" height="${f1(y + ligne)}" viewBox="0 0 ${f1(wMax)} ${f1(y + ligne)}" role="img" aria-label="Faces des modules de jonction">${s}</svg>`; }
// « 18 × 2 », « 2 × 8 + 2 × 10 » : les groupes d'un module, comptés par taille
const tailleDesGroupes = m => { const n = new Map(); m.groupes.forEach(g => n.set(g.contacts.length, (n.get(g.contacts.length) || 0) + 1));
  return [...n].sort((a, b) => b[1] - a[1] || b[0] - a[0]).map(([t, k]) => k > 1 ? k + ' × ' + t : String(t)).join(' + '); };
const taillesDe = m => { const n = new Map(); m.contacts.forEach(c => n.set(c.taille, (n.get(c.taille) || 0) + 1)); return n.size > 1 ? [...n].map(([t, k]) => k + ' #' + t).join(' + ') : m.contacts.length + ' contacts #' + m.contacts[0].taille; };
const resumeModule = m => `${taillesDe(m)} · ${pluriel(m.groupes.length, 'groupe')} (${tailleDesGroupes(m)})${m.poids != null ? ' · ' + nombre(m.poids) + ' g' : ''}${m.hauteur != null ? ' · H ' + nombre(m.hauteur) + ' mm' : ''}`;
const motUsage = u => u === 'normal' ? 'usage normal' : u === 'possible' ? 'usage possible' : u === 'A350' ? 'A350 (AD12) seulement' : u === 'diodes' ? 'à diodes, jamais choisi seul' : 'à confirmer, jamais choisi seul';

/* ---- la carte d'une barrette en modules ---------------------------------- */
function carteModules(nom) { const { besoins: b, plan: Q, main } = planDeBarrette(nom), V = verite(), routes = couleursDesRoutes(), s = k => k > 1 ? 's' : '';
  const parContact = new Map(); Q.fils.forEach(x => parContact.set(x.module + '|' + x.contact.lettre, x));
  const infoFil = x => { const l = x.f.l, coul = routes.get((l && l.route) || '') || '#26323f'; return { i: V.indexOf(l), cable: x.f.cable || '—', couleur: coul, couleurClaire: melanger(coul, 0.72), ko: x.jaugeOk === false }; };
  const faces = Q.modules.map((M, k) => faceModuleSvg(M.module, c => { const x = parContact.get(k + '|' + c.lettre); return x ? infoFil(x) : null; },
    { titre: (Q.modules.length > 1 ? (k + 1) + ' · ' : '') + M.reference, sous: resumeModule(M.module), etiquettes: true }));
  const libres = Q.contacts - Q.utilises, ko = Q.fils.filter(x => x.jaugeOk === false).length;
  const familles = [...new Set(Q.modules.map(M => M.module.famille))], nomF = f => nomDeFamille(app.norme, f);
  const selon = Q.famille ? 'la norme ' + nomF(Q.famille) : 'les normes ' + famillesDeModules(app.norme).map(nomF).join(' et ');
  const dou = main ? 'choisie à la main' : Q.modules.length ? 'remplie automatiquement selon ' + selon + (Q.main ? ' (retenue à la main)' : '') : 'aucun module ne convient';
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
  // la norme visée : automatique (celle du fichier, sinon la mieux taillée des deux), ou l'une des deux, d'un clic
  const visee = Q.main && !main ? Q.famille : '';
  const normes = `<div class="mj-normes" role="group" aria-label="Norme des modules"><span>norme</span>`
    + [['', 'automatique'], ...famillesDeModules(app.norme).map(f => [f, nomF(f)])].map(([f, t]) => `<button class="mj-norme ${f ? classeFamille(f) : ''}" data-famille="${escA(f)}" aria-pressed="${!main && visee === f}">${esc(t)}</button>`).join('') + '</div>';
  return `<div class="bar-ref"><span class="ref">${esc(Q.reference || '—')}</span><span class="dou">${dou}</span></div><div class="phy-compte">${compte}</div>` + normes
    + (familles.length ? familles.map(f => `<div class="bar-norme">norme <b>${esc(nomF(f))}</b> · ${esc(DIT_FAMILLE[f] || 'modules de jonction')}</div>`).join('') : '')
    + `<div class="mj-faces">${Q.modules.length ? facesSvg(faces, largeurCarte()) : ''}</div>`
    + `<div class="legende"><span class="l-trou occ"></span>contact pris (couleur de la route) · <span class="l-trou"></span>contact libre · <span class="l-peigne"></span>groupe : contacts reliés dans le module</div>`
    + verdicts + table + choixModules(nom, b, Q, main); }
// une couleur éclaircie vers le blanc, pour la plaque d'un groupe pris
const melanger = (h, k) => '#' + rvb(h).map(c => Math.round(c + (255 - c) * k).toString(16).padStart(2, '0')).join('');
/* Les variantes qui logent la barrette d'un seul module, norme par norme, d'un clic ; le retour au remplissage automatique. */
function choixModules(nom, b, Q, main) { const retenue = main ? Q.modules.length && Q.modules[0].reference : Q.modules.length === 1 ? Q.modules[0].reference : '';
  const fs = Q.famille ? [Q.famille] : famillesDeModules(app.norme);
  const listes = fs.map(f => ({ f, vs: variantesQuiLogent(b, app.norme, f).slice(0, 8) })).filter(x => x.vs.length);
  return `<details class="choix"${app.base.choixOuvert ? ' open' : ''}><summary><span>Les variantes qui conviennent</span><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>`
    + `<div class="raisons"><span>${pluriel(Q.potentiels, 'potentiel')} à loger</span><span>${pluriel(Q.fils.length + Q.restants.reduce((n, p) => n + p.fils.length, 0), 'fil')}</span>${b.jaugeFine != null ? `<span>jauge ${jaugeTexte(b)}</span>` : ''}${b.pn ? `<span>fichier : ${esc(b.pn)}</span>` : ''}</div>`
    + (listes.length ? listes.map(({ f, vs }) => `<div class="cands"><div class="sur">${esc(nomDeFamille(app.norme, f))} — d'un seul module</div>`
        + vs.map(m => `<button class="cand" data-ref="${escA(m.reference)}" aria-pressed="${m.reference === retenue}">${pictoModule(m)}<b>${esc(m.variante)}</b><span>${esc(resumeModule(m))}${m.usage !== 'normal' ? ' · ' + esc(motUsage(m.usage)) : ''}</span>${m.reference === retenue ? '<span class="ok">retenue</span>' : ''}</button>`).join('') + '</div>').join('')
      : '<p class="note">Aucune variante ne loge la barrette d’un seul module : elle en prend plusieurs.</p>')
    + (main ? '<button class="btn lien" id="bar-auto">Revenir au remplissage automatique</button>' : '')
    + `<button class="btn lien" id="bar-bible" data-ref="${escA(Q.modules.length ? Q.modules[0].reference : '')}">Voir dans la bible</button></details>`; }
function lierCarteModules(nom) { const box = $('ba-equip');
  const choix = box.querySelector('details.choix'); if (choix) choix.addEventListener('toggle', () => { app.base.choixOuvert = choix.open; });
  box.querySelectorAll('.cand').forEach(bt => bt.onclick = () => { if (bt.getAttribute('aria-pressed') === 'true') return; const ref = bt.dataset.ref;
    histPush('modules de ' + nom); designer(nom, ref); apresEdition(); dire(nom + ' : ' + ref + ' retenue.'); });
  box.querySelectorAll('.mj-norme').forEach(bt => bt.onclick = () => { if (bt.getAttribute('aria-pressed') === 'true') return; const f = bt.dataset.famille;
    histPush('norme de ' + nom); designer(nom, f); apresEdition(); dire(nom + ' : ' + (f ? 'modules ' + nomDeFamille(app.norme, f) : 'remplissage automatique') + '.'); });
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
  const r = m.corps === 'ovale' ? Math.min(H * 0.3, 6) : 2;
  return `<svg class="picto mj-picto ${classeFamille(m.famille)}" width="${f1(W + 4)}" height="${f1(H + 4)}" viewBox="-2 -2 ${f1(W + 4)} ${f1(H + 4)}" aria-hidden="true"><rect class="p-corps" x="-1.5" y="-1.5" width="${f1(W + 3)}" height="${f1(H + 3)}" rx="${f1(r)}"/>`
    + m.groupes.filter(g => g.contacts.length > 1 || m.famille === 'E0599').map(g => `<path class="p-groupe" d="${traitsDe(g.contacts.map(pos))}" style="stroke-width:${f1(4 * k)}"/>`).join('')
    + m.contacts.map(c => { const p = pos(c); return `<circle class="p-contact" cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1((c.calibre <= 12 ? 2 : c.calibre <= 16 ? 1.7 : 1.3) * k)}"/>`; }).join('') + '</svg>'; }
function zoomModule(e) { const m = moduleDeReference(app.norme, e.reference); if (!m) return '';
  const tailles = [...new Set(m.contacts.map(c => c.taille))].map(t => { const T = tailleDe(app.norme, m.famille, t); return '#' + t + (T ? ' : ' + T.jaugeMin + '–' + T.jaugeMax + ' AWG' : ''); });
  const f = faceModuleSvg(m, null, {}), E = m.famille === 'E0599';
  const type = m.type === 'mixte' ? 'mixte (tailles de contact variables)' : m.type === 'diodes' ? 'à diodes incorporées' : E ? 'type ' + m.type : 'contacts taille ' + m.type.toUpperCase();
  const carac = [['norme', nomDeFamille(app.norme, m.famille) + (E ? ' · NF L 53-105' : ' · mars 2021')], [E ? 'variante' : 'arrangement', m.variante], ['type', type],
    ['contacts', taillesDe(m)], ['groupes', tailleDesGroupes(m)], ['tailles', tailles.join(' ; ')], ['usage', motUsage(m.usage)],
    ['corps', m.corps === 'étanche' ? 'étanche (plaque d’extrémité)' : m.corps === 'ovale' ? 'bouts arrondis' : 'rectangulaire'],
    ['masse', m.poids != null ? nombre(m.poids) + ' g' : '—'], ['hauteur', m.hauteur != null ? nombre(m.hauteur) + ' mm' : '—'],
    ['désignation', m.reference + (E ? ' (module à retour, tenue aux fluides Z)' : ' (provisoire)')], ['note', m.note]];
  return `<div class="bible-zoom"><div class="bz-tete"><div class="min0"><div class="sur">module de jonction · ${esc(nomDeFamille(app.norme, m.famille))}</div><div class="bz-ref">${esc(e.reference)}</div></div>
      <button class="rond fermer" id="bz-fermer" aria-label="Replier la référence"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="mj-faces"><svg class="mj" width="${f1(f.w)}" height="${f1(f.h)}" viewBox="0 0 ${f1(f.w)} ${f1(f.h)}" role="img" aria-label="${escA('Face du module ' + m.variante)}">${f.svg}</svg></div>
    <div class="bar-faits">${carac.map(([k, v]) => `<span>${esc(k)}</span><span>${esc(v)}</span>`).join('')}</div>
    <p class="note">${E ? 'Borne de jonction : E0599B01. Shunt : E0599S01A (2 trous), B (3), C (4), D (5).' : 'La règle de désignation de la NSA937901 n’est pas sur les pages lues : la désignation est provisoire, la face et les groupes viennent des figures 13 à 15.'}</p></div>`; }

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
  Q.modules.forEach((M, k) => { const m = M.module, pas = (m.libre ? RM.pas[Math.max(...calibresDe(m))] : Math.max(...calibresDe(m).map(t => RM.pas[t] || 26))) || 26;
    const w = m.colonnes * pas + 2 * RM.marge, d = m.rangs * pas + 2 * RM.marge, h = (m.hauteur || 22) * 2.2, E = m.famille === 'E0599';
    const pos = c => ({ x: x0 + RM.marge + (c.c + 0.5) * pas, z: RM.marge + (c.r + 0.5) * pas });
    faces.push(...boite(x0 - 3, -6, -4, x0 + w + 3, 0, d + 4, '#9aa4ae'));                 // le rail
    faces.push(...boite(x0, 0, 0, x0 + w, h, d, E ? '#3f4b5a' : m.corps === 'étanche' ? '#3b4048' : '#34506c'));     // le corps
    if (m.corps === 'étanche') faces.push(...boite(x0 + w, 0, -2, x0 + w + 7, h + 3, d + 2, '#8a939d'));              // la plaque d'extrémité
    // les plaques des groupes, à peine en saillie, le long de l'arbre de leurs contacts
    m.groupes.forEach(g => { const pts = g.contacts.map(pos), pris = g.contacts.some(c => parContact.has(k + '|' + c.lettre)); if (!E && pts.length < 2) return;
      arbreDuGroupe(pts.map(p => ({ x: p.x, y: p.z }))).forEach(([a, b]) => { const e = pas * 0.28;
        faces.push(...boite(Math.min(a.x, b.x) - e, h, Math.min(a.y, b.y) - e, Math.max(a.x, b.x) + e, h + 1.6, Math.max(a.y, b.y) + e, pris ? '#c8954a' : '#a8916b')); });
      if (pts.length === 1) faces.push(...boite(pts[0].x - pas * 0.28, h, pts[0].z - pas * 0.28, pts[0].x + pas * 0.28, h + 1.6, pts[0].z + pas * 0.28, pris ? '#c8954a' : '#a8916b')); });
    m.contacts.forEach(c => { const p = pos(c), x = parContact.get(k + '|' + c.lettre), r = (MJ.rayon[c.calibre] || 8) / (MJ.pas[c.calibre] || 36) * (RM.pas[c.calibre] || pas);
      faces.push(...cylindreDebout(p.x, p.z, h + 1.6, h + 6, r, x ? '#d9b36a' : m.corps === 'étanche' ? '#3a3f46' : '#b7bec6'));
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
