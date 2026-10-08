/* ===========================================================================
   08 bis — LA FICHE : ce qu'on voit quand on clique un bloc ou un fil
   ---------------------------------------------------------------------------
   Le lecteur : « l'essentiel, pas trop écrit, carré, qu'on se repère ». Une
   fiche ne dit que quatre choses, dans cet ordre, sans une phrase de plus :
     1. QUI : le repère (on le renomme en écrivant dessus) et, en une pastille,
        s'il est conforme — le détail se déplie d'un clic ;
     2. QUOI : la référence retenue (module, arrangement) et sa norme ;
        « Changer » déplie les autres possibles ;
     3. À QUOI ÇA RESSEMBLE : la face, chaque contact pris à la couleur de son
        fil ;
     4. SES FILS, une ligne chacun : la borne, le fil, où il va. Survoler
        allume le fil sur le plan et son contact sur la face ; cliquer y va.
   Un équipement à plusieurs connecteurs les range en onglets, un à la fois.
   Le reste — renommer, la désignation, supprimer — est sous « ··· ». La fiche
   vit dans l'inspecteur, à droite ; le contrat se corrige dans le tableau.
   =========================================================================== */
'use strict';

const FI = { onglet: {}, change: {} };   // d'une fiche à l'autre : l'onglet ouvert de chaque bloc, « Changer » déplié ou non
const ICONES = {
  fermer: '<path d="M6 6l12 12M18 6 6 18"/>',
  relief: '<path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3zM4 7.5l8 4.5 8-4.5M12 12v9"/>',
  tableau: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M3 14h18M9 5v14"/>',
  fleche: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  bas: '<path d="m6 9 6 6 6-6"/>',
  retour: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  loupe: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  voir: '<circle cx="12" cy="12" r="3"/><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/>',
  points: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>'
};
const ico = (k, cls) => `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[k]}</svg>`;
const coulDeFil = f => couleursDesRoutes().get((f.l && f.l.route) || '') || '#26323f';
const puceFil = f => `<i class="fi-puce" style="background:${coulDeFil(f)}"></i>`;
const typesDe = fils => [...new Set(fils.map(f => f.type).filter(Boolean))].sort(triNaturel).join(', ');
/* La clé d'un fil dans la fiche : son rang dans le contrat — ou, pour un fil que l'outil ajoute (le fil à créer d'une
   barrette à poser), « p » et son rang dans le folio. Les lignes, les contacts de la face et le plan se la partagent. */
function cleFil(l) { const i = rangDe(l); if (i >= 0) return String(i); const p = liaisonsDuPlan().indexOf(l); return p >= 0 ? 'p' + p : ''; }
const filDeCle = k => !k || k === '-1' ? null : k[0] === 'p' ? ((app.dessin && app.dessin.fils) || []).find(w => w.i === +k.slice(1)) || null : filDe(verite()[+k]);
// le numéro d'un fil ; celui que l'outil ajoute (le raccord d'une barrette à poser) n'en a pas encore : « à créer »
const nomDuFil = f => f.cable || (f.l && f.l.origine === null ? 'à créer' : '—');
// le code du repère : « XC » pour 300XC1, « VT » pour une barrette (l'index et le contrôle s'en servent)
const codeDe = nom => { const q = lireRepere(nom); return q && q.code ? q.code.slice(0, 3) : String(nom || '?').slice(0, 2); };
const s_ = n => n > 1 ? 's' : '';

/* ---- les morceaux ---------------------------------------------------------- */
/* La tête : le repère — un champ, qu'on renomme en écrivant dedans — et, dessous, l'état en une pastille, la désignation
   si on en a donné une. `retour` : la fiche vient de l'index, une flèche y ramène. */
function fiTete(o) {
  const nom = o.renommer ? `<input class="fi-nom" id="eq-rep" value="${escA(o.nom)}" aria-label="${escA(o.aide || 'Repère — écrire pour renommer')}" title="${escA(o.aide || 'Écrire ici renomme : chaque fil suit')}" spellcheck="false" autocomplete="off">`
    : `<div class="fi-nom">${esc(o.nom)}</div>`;
  return `<header class="fi-tete">${app.insp.index ? `<button class="fi-x" id="fi-retour" aria-label="Retour à la liste des repères">${ico('retour')}</button>` : ''}`
    + `<div class="min0">${nom}</div><button class="fi-x" id="in-fermer" aria-label="Fermer (Échap)">${ico('fermer')}</button></header>`
    + `<div class="fi-ligne">${o.etat || ''}${o.sous ? `<span class="fi-sous">${o.sous}</span>` : ''}`
    + (o.designation != null ? `<input class="fi-des" id="eq-des" value="${escA(o.designation)}"${o.designation ? '' : ' hidden'} placeholder="désignation" aria-label="Désignation, écrite sous le repère" spellcheck="false" autocomplete="off">` : '') + '</div>'; }
/* L'état, en une pastille : vert, orange ou rouge ; un clic déplie le détail (les problèmes, d'office). */
function fiEtat(ko, att, texteOk) {
  if (!ko.length && !att.length) return `<span class="fi-etat ok" title="${escA(texteOk || '')}"><i aria-hidden="true">✓</i>Conforme</span>`;
  const cls = ko.length ? 'ko' : 'att', xs = ko.length ? ko : att, titre = ko.length ? (ko.length > 1 ? ko.length + ' problèmes' : '1 problème') : (att.length > 1 ? att.length + ' à voir' : '1 à voir');
  return `<details class="fi-etat ${cls}"${ko.length ? ' open' : ''}><summary><i aria-hidden="true">${cls === 'ko' ? '✕' : '!'}</i>${titre}${ico('bas', 'fi-chevron')}</summary><ul>${xs.map(t => `<li>${esc(t)}</li>`).join('')}</ul></details>`; }
/* La référence retenue, sa norme, et « Changer » qui déplie les autres. */
function fiRef(ref, famille, cle, changer, titre) {
  return `<div class="fi-ref-ligne"><b class="fi-ref"${titre ? ` title="${escA(titre)}"` : ''}>${esc(ref || '—')}</b>`
    + (famille ? `<span class="fi-norme ${classeFamille(famille)}">${esc(nomDeFamille(app.norme, famille))}</span>` : '') + '<span class="espace"></span>'
    + (changer ? `<button class="fi-lien" data-changer="${escA(cle)}" aria-expanded="${!!FI.change[cle]}">Changer${ico('bas', 'fi-chevron')}</button>` : '') + '</div>'
    + (changer ? `<div class="fi-changer" data-volet="${escA(cle)}"${FI.change[cle] ? '' : ' hidden'}>${changer}</div>` : ''); }
const puces = (attr, items, actif) => `<div class="fi-puces">${items.map(([f, t]) => `<button class="fi-chip${f ? ' ' + classeFamille(f) : ''}" ${attr}="${escA(f)}" aria-pressed="${f === actif}">${esc(t)}</button>`).join('')}</div>`;
const candidat = (cle, m, retenu) => `<button class="cand" data-cle="${escA(cle)}" data-ref="${escA(m.reference)}" aria-pressed="${m.reference === retenu}">${pictoModule(m)}<b>${esc(m.variante)}</b><span>${esc(resumeModule(m))}</span></button>`;
const liens = xs => xs.filter(Boolean).length ? `<div class="fi-liens">${xs.filter(Boolean).join('')}</div>` : '';
/* Le sexe des contacts qu'on sertit : deux puces (une prise : la fiche d'un sexe, l'embase de l'autre). */
const pucesSexe = (cle, actif, prise) => `<div class="fi-puces">${[['F', prise ? 'Fiche femelle · embase mâle' : 'Contacts femelles'], ['M', prise ? 'Fiche mâle · embase femelle' : 'Contacts mâles']]
  .map(([v, t]) => `<button class="fi-chip" data-sexe="${escA(cle)}" data-v="${v}" aria-pressed="${v === actif}">${esc(t)}</button>`).join('')}</div>`;
/* La nomenclature : ce qu'il faut sertir, chaque contact avec son nombre. */
const nomenclature = (xs, titre) => xs && xs.length ? `<div class="fi-nomen">${titre ? `<span class="fi-nomen-t">${esc(titre)}</span>` : ''}${xs.map(x => `<span><b>${x.n}×</b>${esc(x.reference)}${x.accessoire ? `<i>+ ${esc(x.accessoire)}</i>` : ''}</span>`).join('')}</div>` : '';
/* Une face qui tient dans la largeur de la fiche : le SVG se met à l'échelle. */
const faceAjustee = (f, titre) => `<figure class="fi-face"><svg class="mj" viewBox="0 0 ${f1(f.w)} ${f1(f.h)}" style="max-width:${f1(Math.min(f.w * 1.15, 520))}px" role="img" aria-label="${escA(titre || 'Face')}">${f.svg}</svg>${titre ? `<figcaption>${esc(titre)}</figcaption>` : ''}</figure>`;
// le symétrique d'un module, comme on voit l'autre partie de face (fiche et embase sont symétriques par l'axe vertical)
const miroir = m => ({ ...m, contacts: m.contacts.map(c => ({ ...c, c: m.colonnes - 1 - c.c })), groupes: m.groupes.map(g => ({ ...g, contacts: g.contacts.map(c => ({ ...c, c: m.colonnes - 1 - c.c })) })) });
// ce qu'un contact pris montre sur la face : la clé de son fil, son numéro, sa couleur
const occupant = (f, ko) => { const cl = coulDeFil(f); return { i: cleFil(f.l), cable: f.cable || (f.l && f.l.origine === null ? 'neuf' : '—'), couleur: cl, couleurClaire: melanger(cl, 0.72), ko: !!ko }; };
/* Le contact à sertir, en un mot : « EN3155-003F2020 + E0718-20-30 ». */
const motSertir = st => st ? st.reference + (st.accessoire ? ' + ' + st.accessoire : '') : '';
/* Une ligne de fil : la borne (ou le contact), le fil, son type en retrait — et le contact à sertir, quand la norme le
   dit —, où il va. */
function ligneFil(ct, f, o) { o = o || {}; const k = cleFil(f.l), neuf = !!(f.l && f.l.origine === null), st = motSertir(o.sertir);
  return `<li class="fi-fil${o.ko ? ' ko' : ''}${neuf ? ' neuf' : ''}"${k ? ` data-i="${k}" tabindex="0" role="button" title="${escA((f.cable || 'fil à créer') + (f.type ? ' · ' + f.type : '') + (st ? ' · contact ' + st : '') + ' — voir sur le plan')}"` : ''}>`
    + `<span class="fi-ct">${ct}</span>${puceFil(f)}<b class="fi-w">${neuf ? 'à créer' : esc(f.cable || '—')}</b><span class="fi-t">${esc(f.type || '')}${st ? `<em>${esc(st)}</em>` : ''}</span>`
    + `<span class="fi-dest${f.amont ? ' amont' : ''}">${ico('fleche')}<span>${esc(o.dest != null ? o.dest : destination(f))}</span></span>`
    + (o.tag ? `<span class="fi-tag" title="Barrette à poser sur cette borne">${esc(o.tag)}</span>` : '') + (o.ko ? `<span class="fi-ko">${esc(o.ko)}</span>` : '') + '</li>'; }
const fiListe = lignes => lignes ? `<ul class="fi-liste">${lignes}</ul>` : '';
/* Les onglets : un panneau à la fois ; l'onglet ouvert se garde par bloc. items [{ id, titre, compte, ko, corps }] */
function fiOnglets(cle, items) { if (items.length === 1) return items[0].corps;
  const actif = items.some(x => x.id === FI.onglet[cle]) ? FI.onglet[cle] : items[0].id;
  return `<div class="fi-onglets" role="tablist" data-cle="${escA(cle)}">${items.map(x => `<button role="tab" data-onglet="${escA(x.id)}" aria-selected="${x.id === actif}"${x.ko ? ' class="ko"' : ''}><b>${esc(x.titre)}</b><span>${esc(x.compte)}</span></button>`).join('')}</div>`
    + items.map(x => `<div class="fi-panneau" role="tabpanel" data-panneau="${escA(x.id)}"${x.id === actif ? '' : ' hidden'}>${x.corps}</div>`).join(''); }
/* Le pied : le tableau, le relief, « voir », et sous « ··· » ce qu'on fait rarement. */
function fiPied(o) { o = o || {};
  const boutons = [o.tableau != null ? `<button class="fi-bouton" id="fi-tableau" data-filtre="${escA(o.tableau)}" title="Ses liaisons dans le tableau">${ico('tableau')}<span>Tableau</span></button>` : '',
    o.relief ? `<button class="fi-bouton" id="eq-relief" title="La pièce en perspective (ou double-clic sur le bloc)">${ico('relief')}<span>Relief</span></button>` : '',
    o.voir ? `<button class="fi-bouton" data-choisir-bloc="${escA(o.voir)}">${ico('voir')}<span>${esc(o.voir)}</span></button>` : ''].join('');
  const menu = (o.menu || []).map(([id, t, cls]) => `<button role="menuitem" id="${id}"${cls ? ` class="${cls}"` : ''}>${esc(t)}</button>`).join('');
  return `<footer class="fi-pied">${boutons}<span class="espace"></span>${menu ? `<div class="fi-plus"><button class="fi-x" id="fi-menu" aria-haspopup="true" aria-expanded="false" aria-label="Plus">${ico('points')}</button><div class="fi-menu" id="fi-menu-liste" role="menu" hidden>${menu}</div></div>` : ''}</footer>`; }
const MENU_BLOC = [['fi-renommer', 'Renommer'], ['fi-designer', 'Désignation'], ['eq-del', 'Supprimer', 'danger']];

/* ---- la fiche ------------------------------------------------------------------ */
function rendreFiche() { const box = $('ba-equip'), c = app.cible; if ($('inspecteur').hidden) return;
  if (!c) { if (typeof rendreIndex === 'function') rendreIndex(box); else { box.innerHTML = ''; box.dataset.cle = ''; } return; }
  const cle = c.type + '|' + (c.nom || (c.l && (c.l.cable || cleDe(c.l))) || '');
  let html; try { html = c.type === 'fil' ? ficheFil(c.l) : ficheBloc(c.nom); }
  catch (e) { html = fiTete({ nom: c.nom || '—', sous: 'élément' }) + `<p class="fi-note">${esc(String(e && e.message || e))}</p>`; }
  const meme = box.dataset.cle === cle, haut = box.scrollTop;
  box.innerHTML = html; box.dataset.cle = cle; box.className = 'fi';
  if (meme) box.scrollTop = haut; else { box.scrollTop = 0; box.classList.remove('fondu'); void box.offsetWidth; box.classList.add('fondu'); }
  lierFiche(c); }
function ficheBloc(nom) {
  if (VT_A_POSER.test(nom) || barretteEnModules(nom)) return ficheBarrette(nom);
  if (coupureEnModules(nom)) return ficheCoupure(nom);
  if (estBornier(nom)) return ficheBornierAncien(nom);
  return ficheEquipement(nom); }

/* ---- un fil ---------------------------------------------------------------------- */
const boutDeFil = (rep, borne, pn, via, st) => `<button class="fi-bout" data-choisir-bloc="${escA(rep)}"><b>${esc(rep)}</b><span>borne ${esc(borne || '—')}</span>`
  + (pn ? `<small>${esc(pn)}</small>` : '') + (st ? (st.sertir ? `<small class="fi-bout-ct" title="Le contact à sertir sur ce fil, et son accessoire">${esc(motSertir(st.sertir))}</small>` : st.ko ? '<small class="fi-bout-ct ko">aucun contact pour ce fil</small>' : '') : '')
  + (via ? `<em>par ${esc(via)}</em>` : '') + '</button>';
function ficheFil(l) { const coul = coulDeFil({ l }), neuf = l.origine === null, jauge = jaugeDuType(l.type), st = typeof sertirDuFil === 'function' ? sertirDuFil(l) : { de: null, vers: null };
  const folios = neuf ? [app.plan] : app.nFolios ? (foliosParSource().get(cleDe(l)) || []) : (l.plan ? [l.plan] : []);
  // sur le plan, un bout peut passer par une barrette à poser : on le dit sous ce bout
  const p = neuf ? null : liaisonsDuPlan().find(x => x.origine && x.aPoser && sourceDe(x) === l);
  const via = cote => p && VT_A_POSER.test(p[cote]) ? p[cote] + ' · borne ' + (cote === 'de' ? p.borneDe : p.borneVers) : '';
  const att = []; if (!l.type) att.push('type de fil inconnu : la jauge ne se vérifie pas');
  if (neuf) att.push('fil à créer : donne-lui son numéro en posant ' + l.aPoser + ' au contrat');
  const sous = [l.route ? esc(l.route) : '', l.type ? esc(l.type) + (jauge != null ? ' · ' + jauge + ' AWG' : '') : '', folios.length ? 'folio ' + esc(folios.join(', ')) : ''].filter(Boolean).join(' · ');
  return fiTete({ nom: neuf ? 'à créer' : (l.cable || 'sans numéro'), etat: `<span class="fi-route" style="--c:${coul}"></span>` + (att.length ? fiEtat([], att) : ''), sous })
    + `<div class="fi-trajet" style="--c:${coul}">${boutDeFil(l.de, l.borneDe, l.pnDe, via('de'), st.de)}<span class="fi-fleche"></span>${boutDeFil(l.vers, l.borneVers, l.pnVers, via('vers'), st.vers)}</div>`
    + fiPied(neuf ? { voir: l.aPoser } : { tableau: l.cable || l.de }); }

/* ---- une barrette (et une barrette à poser) ------------------------------------- */
function ficheBarrette(nom) { const aPoser = VT_A_POSER.test(nom), L = liaisonsDeRepere(nom);
  const { besoins: b, plan: Q, main } = planDeBarrette(nom), M0 = Q.modules[0], nomF = f => nomDeFamille(app.norme, f);
  const ko = [...Q.verdicts.filter(v => v.niveau === 'ko').map(v => v.texte), ...Q.fils.filter(x => x.jaugeOk === false).map(x => `${x.f.cable || 'fil à créer'} (${x.f.type}) : jauge refusée par le contact ${x.contact.lettre}`)];
  // la barrette à poser : la borne qu'elle dédouble
  const raccord = aPoser ? L.find(l => l.aPoser === nom && l.origine === null && l.vers === nom && l.borneVers === '1') : null, sur = raccord ? raccord.de + ':' + raccord.borneDe : '';
  const etat = aPoser ? fiEtat(ko, [`à poser sur ${sur} — repère provisoire : écris le vrai repère en tête de fiche, la barrette entre au contrat`])
    : fiEtat(ko, [], 'chaque fil sur un contact qui accepte sa jauge');
  const sous = aPoser ? `à poser sur <b>${esc(sur)}</b>` : `${pluriel(Q.potentiels, 'potentiel')} · ${pluriel(Q.fils.length, 'fil')}`;
  const pnNorme = b.pn && familleDeReference(app.norme, b.pn);
  const pourquoi = main ? 'Choisi à la main.' : !Q.modules.length ? 'Aucun module ne loge ces fils.' : (Q.main ? 'Norme choisie à la main. ' : pnNorme ? 'La norme du part number. ' : '')
    + (Q.modules.length > 1 ? `${Q.potentiels} potentiels sur ${Q.modules.length} modules.` : `Le plus petit module qui loge ${pluriel(Q.potentiels, 'potentiel')}.`);
  const par = new Map(); Q.fils.forEach(x => par.set(x.module + '|' + x.contact.lettre, x));
  const faces = Q.modules.map((M, k) => faceAjustee(faceModuleSvg(M.module, ct => { const x = par.get(k + '|' + ct.lettre); return x ? occupant(x.f, x.jaugeOk === false) : null; }, { etiquettes: true }),
    Q.modules.length > 1 ? (k + 1) + ' · ' + M.reference : '')).join('');
  // changer : la norme, puis une variante d'un seul module
  const cle = 'bar|' + nom, fs = Q.famille ? [Q.famille] : famillesDeModules(app.norme), retenu = M0 && (main || Q.modules.length === 1) ? M0.reference : '';
  const cands = fs.map(f => variantesQuiLogent(b, app.norme, f).slice(0, 6)).flat().map(m => candidat(nom, m, retenu)).join('');
  const changer = aPoser ? '' : puces('data-norme-barrette', [['', 'Automatique'], ...famillesDeModules(app.norme).map(f => [f, nomF(f)])], main ? null : Q.main ? Q.famille : '')
    + (cands || '<p class="fi-note">Aucune variante ne loge la barrette d’un seul module.</p>')
    + liens([main ? `<button class="fi-lien" data-auto="${escA(nom)}">Choix automatique</button>` : '', M0 ? `<button class="fi-lien" data-bible="${escA(M0.reference)}">Bible</button>` : '']);
  // les fils : par potentiel (les bornes reliées), la borne d'abord, le contact en petit
  const borneDe = f => f.borneBarrette || (f.l && (f.l.de === nom ? f.l.borneDe : f.l.borneVers)) || '';
  const tri = Q.fils.slice().sort((a, c) => a.module - c.module || a.groupe.k - c.groupe.k || triBornes(borneDe(a.f), borneDe(c.f)));
  let dernier = null, lignes = '';
  tri.forEach(x => { const pot = x.potentiel.bornes.join(' · ');
    if (!aPoser && Q.potentiels > 1 && pot !== dernier) { lignes += `<li class="fi-groupe">${x.potentiel.bornes.length > 1 ? 'bornes' : 'borne'} ${esc(pot)}</li>`; dernier = pot; }
    lignes += ligneFil(`<b>${esc(borneDe(x.f))}</b><i>${esc((Q.modules.length > 1 ? (x.module + 1) + '·' : '') + x.contact.lettre)}</i>`, x.f, { ko: x.jaugeOk === false ? 'jauge refusée par le contact' : '' }); });
  (Q.restants || []).forEach(p => p.fils.forEach(f => { lignes += ligneFil(`<b>${esc(borneDe(f))}</b>`, f, { ko: 'sans place dans le module' }); }));
  return fiTete({ nom, renommer: true, aide: aPoser ? 'Écrire le vrai repère : la barrette entre au contrat' : '', etat, sous, designation: aPoser ? null : app.contrat.designations.get(nom) || '' })
    + `<section class="fi-cadre">${fiRef(Q.reference || (aPoser ? 'à choisir' : '—'), Q.famille, cle, changer, pourquoi)}${faces ? `<div class="fi-faces">${faces}</div>` : ''}${fiListe(lignes)}</section>`
    + fiPied(aPoser ? { voir: raccord && raccord.de, relief: !!M0, menu: [['fi-renommer', 'Nommer et poser au contrat']] } : { tableau: nom, relief: true, menu: MENU_BLOC }); }

/* ---- une prise de coupure -------------------------------------------------------- */
function ficheCoupure(nom) { const { besoins: b, points, plan: Q } = planDeCoupure(nom), M = Q.modules[0], nomF = f => nomDeFamille(app.norme, f);
  const ko = Q.verdicts.filter(v => v.niveau === 'ko').map(v => v.texte), att = Q.verdicts.filter(v => v.niveau === 'attention').map(v => v.texte);
  const nums = points.map(p => p.num).join(', '), types = typesDe(Q.fils.map(x => x.f));
  const pourquoi = Q.main ? 'Choisi à la main.' : Q.nomme ? `Le part number du fichier (${b.pn}) nomme cet arrangement.` : !M ? 'Aucun arrangement ne loge ces contacts avec ces jauges.'
    : `Le plus petit arrangement qui a les contacts ${nums} et accepte ${types || 'ces fils'}.`;
  let faces = '';
  if (M) { const par = (amont, ct) => { const xs = Q.fils.filter(x => x.contact === ct && !!x.f.amont === amont); return xs.length ? occupant(xs[0].f, xs.some(x => x.jaugeOk === false)) : null; };
    faces = `<div class="fi-faces deux">${faceAjustee(faceModuleSvg(M.module, ct => par(true, ct), { etiquettes: true }), 'Fiche · ce qui arrive')}`
      + `${faceAjustee(faceModuleSvg(miroir(M.module), ct => par(false, M.module.contacts.find(k => k.lettre === ct.lettre)), { etiquettes: true }), 'Embase · ce qui repart')}</div>`; }
  const cote = x => x ? `<span class="fi-cote" data-i="${cleFil(x.f.l)}" tabindex="0" role="button"${x.sertir ? ` title="${escA('contact ' + motSertir(x.sertir))}"` : ''}>${puceFil(x.f)}<b>${esc(x.f.cable || '—')}</b><small>${esc(destination(x.f))}</small>${x.sertir ? `<small class="fi-sertir">${esc(motSertir(x.sertir))}</small>` : ''}</span>` : '<span class="fi-cote vide">—</span>';
  const lignes = (M ? M.module.contacts : []).map(ct => { const am = Q.fils.find(x => x.contact === ct && x.f.amont), av = Q.fils.find(x => x.contact === ct && !x.f.amont); if (!am && !av) return '';
    return `<li class="fi-paire${[am, av].some(x => x && x.jaugeOk === false) ? ' ko' : ''}"><span class="fi-ct"><b>${esc(ct.lettre)}</b></span>${cote(am)}<span class="fi-entre" aria-hidden="true"></span>${cote(av)}</li>`; }).join('');
  const cle = 'cou|' + nom, vs = arrangementsQuiLogent(points, app.norme, Q.visee || Q.famille).slice(0, 6), retenu = M ? M.reference : '';
  const changer = (Q.tableContacts ? pucesSexe(nom, Q.sexe, true) : '') + puces('data-norme-prise', [['', 'Automatique'], ...famillesDeModules(app.norme, 'connecteur').map(f => [f, nomF(f)])], Q.main ? null : (Q.visee || ''))
    + (vs.map(m => candidat(nom, m, retenu)).join('') || '<p class="fi-note">Aucun arrangement de cette norme ne convient.</p>')
    + liens([Q.main ? `<button class="fi-lien" data-auto="${escA(nom)}">Choix automatique</button>` : '', M ? `<button class="fi-lien" data-bible="${escA(M.reference)}">Bible</button>` : '']);
  return fiTete({ nom, renommer: true, etat: fiEtat(ko, att, 'un fil de chaque côté par contact, chaque jauge acceptée'), sous: `${pluriel(points.length, 'contact')} · ${pluriel(Q.fils.length, 'fil')}`, designation: app.contrat.designations.get(nom) || '' })
    + `<section class="fi-cadre">${fiRef(Q.reference, Q.famille, cle, changer, pourquoi)}${faces}`
    + (lignes ? `<div class="fi-paires-tete"><span></span><span>fiche · arrive</span><span></span><span>embase · repart</span></div><ul class="fi-liste paires">${lignes}</ul>` : '')
    + nomenclature(nomenclatureDe(Q.fils.filter(x => x.f.amont)), 'fiche') + nomenclature(nomenclatureDe(Q.fils.filter(x => !x.f.amont)), 'embase') + '</section>'
    + fiPied({ tableau: nom, relief: true, menu: MENU_BLOC }); }

/* ---- un équipement --------------------------------------------------------------- */
function ficheEquipement(nom) { const V = verite(), b = besoinsDeBarrette(nom, V);
  const C = connecteursDe(nom, V).filter(c => c.nom), cav = cavitesDe(nom), parNom = new Map(cav.map(c => [c.nom, c]));
  // une borne qui porte plusieurs fils : une barrette à poser (VT1… sur ce folio)
  const vt = new Map(); liaisonsDuPlan().forEach(l => { if (l.origine === null && l.de === nom && l.vers === l.aPoser && l.borneVers === '1') vt.set(String(l.borneDe), l.aPoser); });
  const doubles = [...b.parBorne].filter(([, fs]) => fs.length > 1);
  const ko = cav.flatMap(c => c.plan.verdicts.filter(v => v.niveau === 'ko').map(v => c.nom + ' · ' + v.texte));
  const att = [...doubles.map(([bo, fs]) => `borne ${bo} : ${fs.length} fils — ${vt.has(String(bo)) ? 'barrette ' + vt.get(String(bo)) : 'une barrette'} à poser`),
    ...cav.flatMap(c => c.plan.verdicts.filter(v => v.niveau === 'attention' && !/contact .* : \d fils/.test(v.texte)).map(v => c.nom + ' · ' + v.texte))];
  // un disjoncteur : son calibre et le profil de charge, jugés sur la courbe de disjonction
  const dj = estDisjoncteur(nom), cd = dj ? controleDisjonction(nom) : null; if (cd) (cd.niveau === 'ko' ? ko : att).unshift(cd.texte);
  const ligne = (bo, f, st) => ligneFil(`<b>${esc(bo)}</b>`, f, { tag: vt.get(String(bo)), sertir: st });
  const onglets = C.map(c => { const k = parNom.get(c.nom), Q = k && k.plan, M = Q && Q.modules[0], cle = 'arr|' + nom + '|' + c.nom;
    const sertir = new Map(Q ? Q.fils.map(x => [x.f.l, x.sertir]) : []);
    const fils = c.bornes.slice().sort(triNaturel).flatMap(bo => (b.parBorne.get(bo) || []).map(f => ligne(bo, f, sertir.get(f.l)))).join('');
    let corps = '', nomen = '';
    if (M) { const pourquoi = Q.main ? 'Choisi à la main.' : Q.nomme ? 'Le part number le nomme.' : 'Le plus petit qui a ces contacts et ces jauges.';
      const par = new Map(Q.fils.map(x => [x.contact.lettre, x])), vs = arrangementsQuiLogent(k.points, app.norme, Q.famille).slice(0, 5);
      const changer = (Q.tableContacts ? pucesSexe(nom + '|' + c.nom, Q.sexe, false) : '') + vs.map(m => candidat(nom + '|' + c.nom, m, M.reference)).join('') + liens([Q.main ? `<button class="fi-lien" data-auto="${escA(nom + '|' + c.nom)}">Choix automatique</button>` : '']);
      nomen = nomenclature(Q.nomenclature);
      corps = fiRef(M.reference, M.module.famille, cle, changer, (c.pn ? c.pn + ' — ' : '') + pourquoi)
        + faceAjustee(faceModuleSvg(M.module, ct => { const x = par.get(ct.lettre); return x ? occupant(x.f, x.jaugeOk === false) : null; }, { etiquettes: true })); }
    else corps = `<div class="fi-ref-ligne"><span class="fi-ct"><b>${esc(c.nom)}</b></span><b class="fi-ref">${esc(c.pn || 'sans part number')}</b></div>`;
    return { id: c.nom, titre: c.nom, compte: String(c.bornes.length), ko: ko.some(t => t.startsWith(c.nom + ' · ')), corps: `<section class="fi-cadre">${corps}${fiListe(fils)}${nomen}</section>` }; });
  // les bornes sans connecteur
  const sans = [...b.parBorne].filter(([bo]) => !C.some(c => c.bornes.includes(bo))).sort((u, v) => triNaturel(u[0], v[0])).flatMap(([bo, fs]) => fs.map(f => ligne(bo, f))).join('');
  if (sans) onglets.push({ id: '—', titre: C.length ? 'Autres' : 'Fils', compte: String(b.parBorne.size - C.reduce((n, c) => n + c.bornes.length, 0)), corps: `<section class="fi-cadre">${fiListe(sans)}</section>` });
  const nFils = V.filter(l => l.de === nom || l.vers === nom).length;
  return fiTete({ nom, renommer: true, etat: fiEtat(ko, att, cav.length ? 'chaque borne sur son contact, chaque jauge acceptée' : 'rien à redire'),
      sous: `${pluriel(nFils, 'fil')}${C.length > 1 ? ' · ' + pluriel(C.length, 'connecteur') : ''}`, designation: app.contrat.designations.get(nom) || '' })
    + (dj ? ficheDisjonction(nom) : '') + (onglets.length ? fiOnglets('eq|' + nom, onglets) : '')
    + fiPied({ tableau: nom, relief: cav.length > 0, menu: MENU_BLOC }); }

/* ---- un bornier hors modules (une bible importée sans modules) ------------------- */
function ficheBornierAncien(nom) { const V = verite(), b = besoinsDeBarrette(nom, V);
  const P = remplirSelonNorme(physiqueDeBarrette(nom, V, app.bible, app.contrat.designations.get(nom) || ''), app.norme);
  return fiTete({ nom, renommer: true, sous: estCoupure(nom) ? 'Prise de coupure' : 'Barrette', designation: app.contrat.designations.get(nom) || '' })
    + `<div class="equip">${cartePhysique(nom, P, b)}</div>` + fiPied({ tableau: nom, relief: true, menu: MENU_BLOC }); }

/* ---- les gestes ------------------------------------------------------------------- */
function lierFiche(c) { const box = $('ba-equip'), nom = c.type === 'fil' ? '' : c.nom;
  $('in-fermer').onclick = () => deselectionner();
  const ret = $('fi-retour'); if (ret) ret.onclick = () => retourIndex();
  const tab = $('fi-tableau'); if (tab) tab.onclick = () => { app.base.filtre = tab.dataset.filtre; app.base.filtreAuto = false; app.base.portee = 'tout'; app.base.defiler = true; if (app.base.ouvert) rendreBase(); else ouvrirBase(); };
  box.querySelectorAll('[data-choisir-bloc]').forEach(b => b.onclick = () => { const n = b.dataset.choisirBloc, k = ((app.dessin && app.dessin.comps) || []).find(x => x.name === n && x.kind !== 'tag');
    const vt = k ? null : barretteAPoser(n); if (k) choisirBloc(k); else if (vt) choisirBarretteAPoser(vt); else { app.cible = { type: 'bloc', nom: n }; rendreFiche(); } viser(n); });
  // les onglets : on montre un autre panneau, rien ne se refait
  box.querySelectorAll('.fi-onglets').forEach(t => t.addEventListener('click', e => { const b = e.target.closest('[data-onglet]'); if (!b) return; const id = b.dataset.onglet; FI.onglet[t.dataset.cle] = id;
    t.querySelectorAll('[data-onglet]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    box.querySelectorAll('[data-panneau]').forEach(p => { p.hidden = p.dataset.panneau !== id; }); }));
  box.querySelectorAll('[data-changer]').forEach(b => b.onclick = () => { const k = b.dataset.changer, v = box.querySelector(`[data-volet="${CSS.escape(k)}"]`); if (!v) return;
    v.hidden = !v.hidden; FI.change[k] = !v.hidden; b.setAttribute('aria-expanded', String(!v.hidden)); });
  // le menu « ··· »
  const menu = $('fi-menu'), liste = $('fi-menu-liste');
  if (menu) { const ouvrir = o => { liste.hidden = !o; menu.setAttribute('aria-expanded', String(o)); };
    menu.onclick = e => { e.stopPropagation(); ouvrir(liste.hidden); };
    liste.addEventListener('click', () => ouvrir(false));
    box.addEventListener('pointerdown', e => { if (!liste.hidden && !e.target.closest('.fi-plus')) ouvrir(false); }, true); }
  box.querySelectorAll('input').forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } else if (e.key === 'Escape') { e.stopPropagation(); el.value = el.defaultValue; el.blur(); } }));
  lierFils(box);
  if (!nom) return;
  const rep = $('eq-rep'); if (rep) rep.addEventListener('change', e => { const nr = e.target.value.trim(); if (!nr || nr === nom) { e.target.value = nom; return; }
    if (VT_A_POSER.test(nom)) { if (!poserBarrette(nom, nr)) e.target.value = nom; return; }
    histPush('renommage de ' + nom); renommer(nom, nr); app.choisi = nr; app.cible = { type: 'bloc', nom: nr }; if (app.base.filtre === nom) app.base.filtre = nr; apresEdition(); });
  const des = $('eq-des'); if (des) { des.addEventListener('change', e => { histPush('désignation de ' + nom); designer(nom, e.target.value.trim()); apresEdition(); });
    des.addEventListener('blur', () => { if (!des.value.trim()) des.hidden = true; }); }
  if ($('fi-renommer')) $('fi-renommer').onclick = () => { if (rep) { rep.focus(); rep.select(); } };
  if ($('fi-designer')) $('fi-designer').onclick = () => { if (des) { des.hidden = false; des.focus(); } };
  if ($('eq-del')) $('eq-del').onclick = () => { const n = verite().filter(l => l.de === nom || l.vers === nom).length; if (!confirm('Supprimer « ' + nom + ' » et ses ' + n + ' liaison(s) ?')) return;
    histPush('suppression de ' + nom); supprimerEquipement(nom); app.base.filtre = ''; deselectionner(); apresEdition(); dire(nom + ' supprimé.'); };
  if ($('eq-relief')) $('eq-relief').onclick = () => ouvrirRelief(nom);
  // les choix : une norme, une variante, un arrangement, le retour à l'automatique
  const choisir = (cle, d, quoi, mot) => { histPush(quoi); designer(cle, d); apresEdition(); if (mot) dire(mot); };
  box.querySelectorAll('[data-norme-barrette]').forEach(b => b.onclick = () => choisir(nom, b.dataset.normeBarrette, 'norme de ' + nom));
  box.querySelectorAll('[data-norme-prise]').forEach(b => b.onclick = () => choisir(nom, b.dataset.normePrise, 'norme de ' + nom));
  box.querySelectorAll('.cand[data-cle]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') !== 'true') choisir(b.dataset.cle, b.dataset.ref, 'choix de ' + b.dataset.cle, b.dataset.ref + ' retenu.'); });
  box.querySelectorAll('[data-auto]').forEach(b => b.onclick = () => choisir(b.dataset.auto, '', 'choix automatique', 'Choix automatique rétabli.'));
  box.querySelectorAll('[data-sexe]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return;
    histPush('sexe des contacts de ' + b.dataset.sexe); app.contrat.sexes.set(b.dataset.sexe, b.dataset.v); apresEdition(); });
  box.querySelectorAll('[data-bible]').forEach(b => b.onclick = () => ficheBible(b.dataset.bible));
  if (box.querySelector('.equip') && typeof lierCartePhysique === 'function') lierCartePhysique(nom);
  lierDisjonction(nom); }
/* Les fils de la fiche et le plan : survoler une ligne (ou un contact de la face) allume le fil et marque tout ce qui
   le montre dans la fiche ; un clic ou Entrée va le voir sur le plan. */
function lierFils(box) { let dernier = null;
  const cible = t => t && t.closest && t.closest('.fi-fil[data-i], .fi-cote[data-i], .mj-contact.plein');
  const marquer = el => { const k = el.dataset.i; box.querySelectorAll('.vise').forEach(x => x.classList.remove('vise'));
    if (!k) return; box.querySelectorAll(`[data-i="${CSS.escape(k)}"]`).forEach(x => x.classList.add('vise')); allumerCle(k); };
  const lacher = () => { dernier = null; box.querySelectorAll('.vise').forEach(x => x.classList.remove('vise')); rallumer(); };
  const voir = el => { const k = el.dataset.i; if (!k) return; if (k[0] !== 'p') { voirFilDeCarte(+k); return; }
    const w = filDeCle(k); if (w) { allumerFil(w); viserFil(w); } else { const l = liaisonsDuPlan()[+k.slice(1)]; if (l && l.aPoser) viser(l.aPoser); } };
  box.onmouseover = e => { const el = cible(e.target); if (!el || el === dernier) return; dernier = el; marquer(el); };
  box.onmouseout = e => { if (!dernier) return; const vers = cible(e.relatedTarget); if (vers) return; lacher(); };
  box.onclick = e => { const el = cible(e.target); if (el) voir(el); };
  box.onkeydown = e => { const el = cible(e.target); if (el && (e.key === 'Enter' || e.key === ' ') && !e.target.matches('input')) { e.preventDefault(); voir(el); } }; }
