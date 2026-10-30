/* ===========================================================================
   08 ter — LES MODULES DE JONCTION ET LES INSERTS, tels qu'on les pose
   ---------------------------------------------------------------------------
   Une barrette du contrat se pose en modules de jonction de la norme ASNE
   0599 ou de la NSA937901 — les deux que l'outil propose pour une barrette :
   celle du part number du fichier, sinon la mieux taillée ; l'une ou l'autre
   d'un clic sur la fiche. Le remplissage est AUTOMATIQUE (`remplirModules`,
   09) : chaque potentiel (une borne, ou les bornes que des shunts relient)
   prend un groupe de contacts reliés, chaque fil un contact dont la taille
   admet sa jauge ; le module le mieux taillé d'abord, un second s'il le faut.
   Un connecteur d'équipement et une prise de coupure se lisent de même : un
   insert (EN 4165, EN 2997, EN 3646, EN 3645, ASNE 0059), chaque borne sur le
   contact de même numéro.

   Ce module dessine la FACE d'un module ou d'un insert comme un DESSIN
   TECHNIQUE, À PLAT — le lecteur : « toujours la même photo, ça fait vieux,
   avec un petit relief ». Deux traits : le contour du corps, à sa forme réelle
   (le bloc rectangulaire ASNE 0599, le module NSA937901 aux bouts ronds ou
   étanche avec sa plaque d'extrémité, le module carré EN 4165 et son
   détrompeur, l'insert circulaire et sa clé), et l'insert en retrait. Les
   contacts sont cerclés et lettrés comme sur la figure de la norme ; les
   contacts reliés (un shunt, une plaque) sont cernés d'un même contour ; un
   contact occupé est PLEIN, à la couleur de la route de son fil (son numéro
   se lit au survol) ; un contact qui refuse son fil est cerclé de rouge. Ni biseau,
   ni épaisseur, ni ombre : ce qui distingue une famille, c'est sa forme.
   La fiche (08 bis) montre la face, vivante : survoler un contact allume son
   fil sur le plan et sa ligne dans la fiche, un clic le choisit ; la bible dessine chaque
   variante en petit (`pictoModule`) et en grand (`zoomModule`).
   =========================================================================== */
'use strict';

/* Le plan d'une barrette du contrat : ses besoins, et ses modules — la variante, ou la norme, retenue à la main. */
function planDeBarrette(nom) { const besoins = besoinsDeBarrette(nom, liaisonsDeRepere(nom)), d = app.contrat.designations.get(nom) || '';
  const plan = remplirModules(besoins, app.norme, d); return { besoins, plan, main: plan.variante }; }
const barretteEnModules = nom => estBarrette(nom) && !estCoupure(nom) && (app.bible || []).some(e => e.module);
const classeFamille = f => 'f-' + String(f || '').toLowerCase();

/* ---- la face d'un module, à plat --------------------------------------- */
/* Mesures en pixels, par calibre de contact : le pas suit la taille (un module de 36 contacts est serré, un module de
   6 gros contacts aéré) ; un contact #12 est plus gros qu'un #20. Une face irrégulière (contacts mêlés, chacun à sa
   place) se mesure au pas de son plus petit contact. */
const MJ = { pas: { 23: 32, 22: 36, 20: 42, 16: 50, 12: 58, 8: 74 }, rayon: { 23: 7.5, 22: 8.5, 20: 10, 16: 13, 12: 16, 8: 22 }, marge: 16 };
const calibresDe = m => [...new Set(m.contacts.map(c => c.calibre))];
const pasDuModule = m => m.libre ? MJ.pas[Math.max(...calibresDe(m))] || 40 : Math.max(...calibresDe(m).map(t => MJ.pas[t] || 34), MJ.pas[NUMERO(m.taille)] || 34);
const rayonDe = c => MJ.rayon[c.calibre] || 8;
/* L'ARBRE d'un groupe : les traits les plus courts qui relient ses contacts (le contour d'une plaque ou d'un shunt
   suit ces traits). */
function arbreDuGroupe(pts) { if (pts.length < 2) return []; const dans = [0], aretes = [];
  while (dans.length < pts.length) { let mieux = null;
    dans.forEach(i => pts.forEach((p, j) => { if (dans.includes(j)) return; const d = Math.hypot(p.x - pts[i].x, p.y - pts[i].y); if (!mieux || d < mieux.d - 0.01) mieux = { i, j, d }; }));
    dans.push(mieux.j); aretes.push([pts[mieux.i], pts[mieux.j]]); }
  return aretes; }
const traitsDe = pts => arbreDuGroupe(pts).map(([a, b]) => `M${f1(a.x)} ${f1(a.y)}L${f1(b.x)} ${f1(b.y)}`).join('') || `M${f1(pts[0].x)} ${f1(pts[0].y)}h0.01`;
// la forme d'un corps, en un mot de classe : « etanche » sans accent, le reste tel quel
const formeDuCorps = m => m.corps === 'étanche' ? 'etanche' : m.corps || 'rectangle';
/* Le CORPS, à plat, par sa forme réelle — deux traits : le contour, et l'insert en retrait. `bout` : la plaque
   d'extrémité d'un module étanche, à droite. L'insert circulaire porte sa clé de détrompage en haut, comme la figure. */
function corpsSvg(m, W, H, T, bout) { const forme = formeDuCorps(m);
  if (forme === 'circulaire') { const cx = W / 2, cy = T + H / 2, R = Math.min(W, H) / 2 - 7;
    return `<circle class="mj-corps" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R + 6)}"/><circle class="mj-insert" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R)}"/>`
      + `<rect class="mj-cle" x="${f1(cx - 4)}" y="${f1(cy - R - 10)}" width="8" height="9.5" rx="1"/>`; }
  const w = W - bout, r = forme === 'ovale' ? Math.min(w, H) / 2 : forme === 'rectangle' ? 5 : forme === 'etanche' ? 7 : 3;
  let s = `<rect class="mj-corps" x="0.6" y="${f1(T + 0.6)}" width="${f1(w - 1.2)}" height="${f1(H - 1.2)}" rx="${f1(r)}"/>`
    + `<rect class="mj-insert" x="6" y="${f1(T + 6)}" width="${f1(w - 12)}" height="${f1(H - 12)}" rx="${f1(Math.max(2, r - 5))}"/>`;
  if (forme === 'module') s += `<rect class="mj-cle" x="${f1(w * 0.62)}" y="${f1(T + H - 0.6)}" width="${f1(Math.min(28, w * 0.22))}" height="5" rx="1.5"/>`;
  if (forme === 'etanche') s += `<rect class="mj-plaque-bout" x="${f1(w + 2)}" y="${f1(T + 3)}" width="${f1(bout - 2.6)}" height="${f1(H - 6)}" rx="2"/>`
    + `<path class="mj-plaque-trait" d="M${f1(w + 6)} ${f1(T + 7)}V${f1(T + H - 7)}M${f1(w + bout - 5)} ${f1(T + 7)}V${f1(T + H - 7)}"/>`
    + `<path class="mj-bombe" d="M9 ${f1(T + 9)}Q2.5 ${f1(T + H / 2)} 9 ${f1(T + H - 9)}"/>`;
  return s; }
// un groupe dont les contacts remplissent tout le rectangle de grille qu'ils couvrent
const blocPlein = g => { const rs = g.contacts.map(c => c.r), cs = g.contacts.map(c => c.c);
  return (Math.max(...rs) - Math.min(...rs) + 1) * (Math.max(...cs) - Math.min(...cs) + 1) === g.contacts.length; };
/* La face : `occupe(contact)` rend le fil d'un contact — { i, couleur, couleurClaire, ko, bulle } — ou rien.
   Rend { svg, w, h }, le dessin dans un repère de (0, 0) à (w, h). */
function faceModuleSvg(m, occupe) { const forme = formeDuCorps(m), rond = forme === 'circulaire';
  const pas = pasDuModule(m), bout = forme === 'etanche' ? 14 : 0, M = MJ.marge + (rond ? 4 : 0);
  const W = m.colonnes * pas + 2 * M + bout, H = m.rangs * pas + 2 * M, T = rond ? 8 : 2;
  const pos = c => ({ x: M + (c.c + 0.5) * pas, y: T + M + (c.r + 0.5) * pas });
  let s = `<g class="mj-module ${classeFamille(m.famille)} corps-${forme}">${corpsSvg(m, W, H, T, bout)}`;
  // les groupes : le contour qui cerne les contacts reliés — une plaque (ASNE 0599) ou un shunt (NSA937901) ; un groupe
  // qui porte un potentiel se teinte à la couleur de la route. Un contact seul n'a pas de contour.
  const plaque = m.famille === 'E0599';
  m.groupes.forEach(g => { if (g.contacts.length < 2) return;
    const pts = g.contacts.map(pos), r = Math.max(...g.contacts.map(rayonDe)), o = occupe ? g.contacts.map(occupe).find(Boolean) : null, cls = plaque ? 'plaque' : 'shunt';
    // un groupe qui remplit un bloc de la grille, ou sur une face irrégulière : un cadre arrondi, comme la norme le trace
    if (!plaque && (m.libre || blocPlein(g))) { const bx = g.contacts.map(c => { const p = pos(c), q = rayonDe(c) + 5; return [p.x - q, p.y - q, p.x + q, p.y + q]; });
      const x0 = Math.min(...bx.map(v => v[0])), y0 = Math.min(...bx.map(v => v[1])), x1 = Math.max(...bx.map(v => v[2])), y1 = Math.max(...bx.map(v => v[3]));
      s += `<rect class="mj-shunt-cadre${o ? ' prise' : ''}" x="${f1(x0)}" y="${f1(y0)}" width="${f1(x1 - x0)}" height="${f1(y1 - y0)}" rx="${f1(r + 5)}"${o ? ` style="fill:${o.couleurClaire}"` : ''}/>`; return; }
    const d = traitsDe(pts);
    s += `<path class="mj-${cls}-bord" d="${d}" style="stroke-width:${f1(2 * r + 11)}"/><path class="mj-${cls}${o ? ' prise' : ''}" d="${d}" style="stroke-width:${f1(2 * r + 9)}${o ? ';stroke:' + o.couleurClaire : ''}"/>`; });
  // les diodes du module à diodes : de l'anode à la cathode, entre les deux groupes
  (m.diodes || []).forEach(([a, k]) => { const ga = m.groupes.find(g => g.contacts[0].lettre.startsWith(a)), gk = m.groupes.find(g => g.contacts[0].lettre.startsWith(k)); if (!ga || !gk) return;
    const pa = pos(ga.contacts[0]), pk = pos(gk.contacts[gk.contacts.length - 1]), mx = (pa.x + pk.x) / 2, my = (pa.y + pk.y) / 2, sens = pk.y < pa.y ? -1 : 1;
    s += `<path class="mj-diode" d="M${f1(mx)} ${f1(pa.y)}V${f1(pk.y)}M${f1(mx - 6)} ${f1(my - 4 * sens)}h12l-6 ${8 * sens}zM${f1(mx - 6)} ${f1(my + 4 * sens)}h12"/>`; });
  // les contacts : un cercle, sa lettre ; occupé, le trou plein à la couleur de la route ; un fil refusé cercle le
  // contact de rouge. Le halo (invisible d'office) dit le survol et le choix dans la fiche ; la bulle (`data-bulle`) y
  // dit le fil.
  m.contacts.forEach(c => { const p = pos(c), r = rayonDe(c), o = occupe ? occupe(c) : null;
    s += `<g class="mj-contact${o ? ' plein' : ''}${o && o.ko ? ' ko' : ''}" data-lettre="${escA(c.lettre)}"${o ? ` data-i="${o.i}" data-fils="${o.fils || o.i}"${o.bulle ? ` data-bulle="${escA(o.bulle)}"` : ''}` : ''}>`
      + `<circle class="mj-halo" cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1(r + 4.5)}" fill="transparent"/>`
      + `<circle class="mj-bague" cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1(r)}"/>`
      + `<circle class="mj-trou" cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1(o ? r * 0.62 : r * 0.3)}"${o ? ` style="fill:${o.couleur}"` : ''}/>`
      + `<text class="mj-lettre" x="${f1(p.x - r - 1.5)}" y="${f1(p.y - r + 2.5)}" text-anchor="end">${esc(c.lettre)}</text></g>`; });
  return { svg: s + '</g>', w: W, h: T + H + (forme === 'module' ? 6 : 2) }; }
// « 18 × 2 », « 2 × 8 + 2 × 10 » : les groupes d'un module, comptés par taille
const tailleDesGroupes = m => { const n = new Map(); m.groupes.forEach(g => n.set(g.contacts.length, (n.get(g.contacts.length) || 0) + 1));
  return [...n].sort((a, b) => b[1] - a[1] || b[0] - a[0]).map(([t, k]) => k > 1 ? k + ' × ' + t : String(t)).join(' + '); };
const taillesDe = m => { if (!m.contacts.length) return 'sans contact'; const n = new Map(); m.contacts.forEach(c => n.set(c.taille, (n.get(c.taille) || 0) + 1)); return n.size > 1 ? [...n].map(([t, k]) => k + ' #' + t).join(' + ') : m.contacts.length + ' contacts #' + m.contacts[0].taille; };
// un module dont aucun contact n'est relié à un autre (un module de connecteur) ne compte pas de groupes
const seulsDe = m => m.groupes.every(g => g.contacts.length < 2);
const resumeModule = m => `${taillesDe(m)}${seulsDe(m) ? '' : ` · ${pluriel(m.groupes.length, 'groupe')} (${tailleDesGroupes(m)})`}${m.poids != null ? ' · ' + nombre(m.poids) + ' g' : ''}${m.hauteur != null ? ' · H ' + nombre(m.hauteur) + ' mm' : ''}`;
const motUsage = u => u === 'normal' ? 'usage normal' : u === 'possible' ? 'usage possible' : u === 'A350' ? 'A350 (AD12) seulement' : u === 'diodes' ? 'à diodes, jamais choisi seul'
  : u === 'ancien' ? 'pas pour une nouvelle conception, jamais choisi seul' : u === 'shuntés' ? 'contacts shuntés, jamais choisi seul' : u === 'spécial' ? 'spécial, jamais choisi seul' : 'à confirmer, jamais choisi seul';

// une couleur éclaircie vers le blanc, pour le contour d'un groupe pris
// une couleur « #rrggbb » en ses trois composantes
const rvb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const melanger = (h, k) => '#' + rvb(h).map(c => Math.round(c + (255 - c) * k).toString(16).padStart(2, '0')).join('');
/* ---- la bible : chaque variante en petit, et en grand ------------------- */
/* Le picto d'une variante : la même face, en 30 px — le contour à sa forme, les groupes en traits, les contacts en points. */
function pictoModule(m) { const k = 30 / Math.max(m.colonnes * 6, m.rangs * 6), W = m.colonnes * 6 * k, H = m.rangs * 6 * k, pos = c => ({ x: (c.c + 0.5) * 6 * k, y: (c.r + 0.5) * 6 * k }), forme = formeDuCorps(m);
  const corps = forme === 'circulaire' ? `<circle class="p-corps" cx="${f1(W / 2)}" cy="${f1(H / 2)}" r="${f1(Math.min(W, H) / 2 + 1.5)}"/>`
    : `<rect class="p-corps" x="-1.5" y="-1.5" width="${f1(W + 3)}" height="${f1(H + 3)}" rx="${f1(forme === 'ovale' ? Math.min(W + 3, H + 3) / 2 : forme === 'rectangle' ? 3 : 1.5)}"/>`;
  return `<svg class="picto mj-picto ${classeFamille(m.famille)} corps-${forme}" width="${f1(W + 4)}" height="${f1(H + 4)}" viewBox="-2 -2 ${f1(W + 4)} ${f1(H + 4)}" aria-hidden="true">${corps}`
    + m.groupes.filter(g => g.contacts.length > 1).map(g => `<path class="p-groupe" d="${traitsDe(g.contacts.map(pos))}" style="stroke-width:${f1(4 * k)}"/>`).join('')
    + m.contacts.map(c => { const p = pos(c); return `<circle class="p-contact" cx="${f1(p.x)}" cy="${f1(p.y)}" r="${f1((c.calibre <= 12 ? 2 : c.calibre <= 16 ? 1.7 : 1.3) * k)}"/>`; }).join('') + '</svg>'; }
function zoomModule(e) { const m = moduleDeReference(app.norme, e.reference); if (!m) return '';
  const tailles = [...new Set(m.contacts.map(c => c.taille))].map(t => { const T = tailleDe(app.norme, m.famille, t); return '#' + t + (T ? (T.jaugeMin != null ? ' : ' + T.jaugeMin + '–' + T.jaugeMax + ' AWG' : ' : câble spécial') : ''); });
  const f = faceModuleSvg(m, null), E = m.famille === 'E0599', C = m.emploi === 'connecteur';
  const type = m.type === 'mixte' ? 'mixte (tailles de contact variables)' : m.type === 'diodes' ? 'à diodes incorporées' : m.type === 'obturateur' ? 'module neutre, sans contact' : m.type === 'spécial' ? 'contact spécial à clé' : E ? 'type ' + m.type : 'contacts taille ' + m.type.toUpperCase();
  const carac = [['norme', nomDeFamille(app.norme, m.famille) + (E ? ' · NF L 53-105' : C ? ' · 2023' : ' · mars 2021')], [E ? 'variante' : 'arrangement', m.variante], ['type', type],
    ['contacts', taillesDe(m)], ['groupes', seulsDe(m) ? 'aucun : chaque contact seul' : tailleDesGroupes(m)], ['tailles', tailles.join(' ; ') || '—'], ['usage', motUsage(m.usage)],
    ['corps', m.corps === 'étanche' ? 'étanche (plaque d’extrémité)' : m.corps === 'ovale' ? 'bouts arrondis' : m.corps === 'module' ? 'module carré, détrompeur sous la face' : m.corps === 'circulaire' ? 'circulaire, clé de détrompage en haut' : 'rectangulaire'],
    ['emploi', C ? 'connecteur d’équipement, prise de coupure' : 'barrette'],
    ['masse', m.poids != null ? nombre(m.poids) + ' g' : '—'], ['hauteur', m.hauteur != null ? nombre(m.hauteur) + ' mm' : '—'],
    ['désignation', m.reference + (E ? ' (module à retour, tenue aux fluides Z)' : ' (provisoire)')], ['note', m.note]];
  return `<div class="bible-zoom"><div class="bz-tete"><div class="min0"><div class="sur">module ${C ? 'de connecteur' : 'de jonction'} · ${esc(nomDeFamille(app.norme, m.famille))}</div><div class="bz-ref">${esc(e.reference)}</div></div>
      <button class="rond fermer" id="bz-fermer" aria-label="Replier la référence"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <div class="mj-faces"><svg class="mj" width="${f1(f.w)}" height="${f1(f.h)}" viewBox="0 0 ${f1(f.w)} ${f1(f.h)}" role="img" aria-label="${escA('Face du module ' + m.variante)}">${f.svg}</svg></div>
    <div class="bar-faits">${carac.map(([k, v]) => `<span>${esc(k)}</span><span>${esc(v)}</span>`).join('')}</div>
    <p class="note">${E ? 'Borne de jonction : E0599B01. Shunt : E0599S01A (2 trous), B (3), C (4), D (5).' : C ? 'Désignation provisoire : la règle de désignation de la norme n’est pas sur les pages lues. Les jauges par taille de contact sont celles, usuelles, des contacts EN 3155 (EN 3155-002 non fournie) : à confirmer.' : 'La règle de désignation de la NSA937901 n’est pas sur les pages lues : la désignation est provisoire, la face et les groupes viennent des figures 13 à 15.'}</p></div>`; }

/* ---- les connecteurs et les prises de coupure en modules EN 4165 -------------
   Un connecteur d'équipement EN 4165 : une carte par cavité (A, B…), la face
   de son module, chaque borne sur le contact de même numéro, sa jauge jugée
   par la taille du contact ; l'arrangement que le part number nomme, sinon le
   plus petit qui loge tout — un autre d'un clic. Une prise de coupure : un
   module, chaque contact avec son fil de fiche et son fil d'embase. */
const aDesModulesDeConnecteur = () => normeDesModules(app.norme).modules.some(m => m.emploi === 'connecteur');
const coupureEnModules = nom => estCoupure(nom) && aDesModulesDeConnecteur() && (app.bible || []).some(e => e.module);
const sexeChoisi = k => (app.contrat.sexes && app.contrat.sexes.get(k)) || '';
const cavitesDe = nom => aDesModulesDeConnecteur() && !estBornier(nom) ? connecteursEnModules(nom, verite(), app.norme, k => app.contrat.designations.get(k) || '', sexeChoisi) : [];
const planDeCoupure = nom => coupureEnModule(nom, verite(), app.norme, app.contrat.designations.get(nom) || '', sexeChoisi(nom));
/* Le contact à sertir à chaque bout d'un fil du contrat : { de, vers } — ce que le plan de l'équipement, de la prise ou
   de la barrette lui a donné (null si rien ne le dit). Un contact écrit à la main (`contactMain` : le récapitulatif ou
   la fiche) passe devant celui de la table : `main` le dit, `auto` garde celui de la table. */
function sertirDuFil(l) { const bout = (rep, borne) => { if (!rep || VT_A_POSER.test(rep) || estMasse(rep) || estRenvoi(rep)) return null; let x = null;
    try { const plans = coupureEnModules(rep) ? [planDeCoupure(rep).plan] : barretteEnModules(rep) ? [planDeBarrette(rep).plan] : cavitesDe(rep).map(c => c.plan);
      for (const Q of plans) { x = (Q.fils || []).find(y => y.f.l === l); if (x) break; } } catch (_) { }
    const main = contactMain(l, rep, borne), auto = x ? x.sertir || null : null;
    if (main) return { sertir: { reference: main, accessoire: '' }, auto, main: true, contact: x ? x.contact : null, sexe: x ? x.sexe || '' : '', ko: false };
    return x ? { sertir: auto, auto, main: false, contact: x.contact, sexe: x.sexe || '', ko: x.jaugeOk === false } : null; };
  return { de: bout(l.de, l.borneDe), vers: bout(l.vers, l.borneVers) }; }
/* LE CONTACT ÉCRIT À LA MAIN au bout `rep` (borne `borne`) d'un fil : sur la liaison (le récapitulatif : `contactDe`,
   `contactVers`), sinon choisi sur la fiche (gardé avec le contrat : `designations`, « sertir|repère|borne »). Le
   récapitulatif, la fiche, la nomenclature et le contrôle lisent celui-ci. */
function contactMain(l, rep, borne) { if (!l || !rep) return ''; const k = rep === l.de && l.contactDe ? l.contactDe : rep === l.vers && l.contactVers ? l.contactVers : '';
  return k || (app.contrat.designations && app.contrat.designations.get('sertir|' + rep + '|' + (borne != null ? borne : rep === l.de ? l.borneDe : l.borneVers))) || ''; }
