/* ===========================================================================
   08 bis — LA FICHE : ce qu'on voit quand on clique un bloc ou un fil
   ---------------------------------------------------------------------------
   Le lecteur : « les infos essentielles, pas trop écrit, tout cadré, qu'on se
   repère hyper facilement ». Chaque fiche a le même squelette :
     1. LA TÊTE : le code du repère en pastille (XC, RL, VT…), le repère —
        on le renomme en écrivant dessus —, ce qu'il est, sa désignation ;
     2. TROIS CHIFFRES, chacun dans sa case ;
     3. L'ÉTAT, en une ligne verte, orange ou rouge ; le détail se déplie ;
     4. UN CADRE pour ce que l'outil a choisi : la référence, le pourquoi en
        une ligne, la face où chaque contact pris a la couleur de son fil ;
        « Changer » déplie les autres possibles ;
     5. SES FILS, une ligne chacun : contact, fil, type, l'autre bout.
        Survoler une ligne allume le fil sur le plan et son contact sur la
        face ; la cliquer va le voir.
   Un équipement à plusieurs connecteurs les range en ONGLETS : un à la fois,
   tout tient sans défiler. Elle vit dans l'INSPECTEUR, à droite ; les lignes
   du contrat se corrigent dans le tableau, en bas.
   =========================================================================== */
'use strict';

const FI = { onglet: {}, change: {} };   // d'une fiche à l'autre : l'onglet ouvert de chaque bloc, « Changer » déplié ou non
const ICONES = {
  fermer: '<path d="M6 6l12 12M18 6 6 18"/>',
  relief: '<path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3zM4 7.5l8 4.5 8-4.5M12 12v9"/>',
  tableau: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M3 14h18M9 5v14"/>',
  fleche: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  bas: '<path d="m6 9 6 6 6-6"/>',
  fil: '<circle cx="5" cy="12" r="2.4"/><path d="M7.4 12h9.2"/><circle cx="19" cy="12" r="2.4"/>',
  voir: '<circle cx="12" cy="12" r="3"/><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/>'
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
// le code du repère, en pastille : « XC » pour 300XC1, « VT » pour une barrette à poser
const codeDe = nom => { const q = lireRepere(nom); return q && q.code ? q.code.slice(0, 3) : String(nom || '?').slice(0, 2); };
const s_ = n => n > 1 ? 's' : '';

/* ---- les morceaux ---------------------------------------------------------- */
function fiTete(o) {
  const nom = o.renommer ? `<input class="fi-nom" id="eq-rep" value="${escA(o.nom)}" aria-label="${escA(o.aide || 'Repère — écrire pour renommer')}" title="${escA(o.aide || 'Renommer : chaque fil suit')}" spellcheck="false" autocomplete="off">`
    : `<div class="fi-nom">${o.nomHtml || esc(o.nom)}</div>`;
  return `<header class="fi-tete"><span class="fi-code ${o.genre}"${o.style ? ` style="${o.style}"` : ''} aria-hidden="true">${o.codeHtml || esc(o.code)}</span>`
    + `<div class="min0">${nom}<div class="fi-sous">${o.sous}</div>`
    + (o.designation != null ? `<input class="fi-des" id="eq-des" value="${escA(o.designation)}" placeholder="+ désignation" aria-label="Désignation, écrite sous le repère" spellcheck="false" autocomplete="off">` : '') + '</div>'
    + `<div class="fi-actions">${o.relief ? `<button class="fi-bouton" id="eq-relief" title="La pièce en perspective (ou double-clic sur le bloc)">${ico('relief')}<span>Relief</span></button>` : ''}`
    + `<button class="fi-x" id="in-fermer" aria-label="Fermer la fiche (Échap)">${ico('fermer')}</button></div></header>`; }
// les chiffres : [valeur, libellé, classe]
const fiChiffres = cs => `<div class="fi-chiffres">${cs.map(([v, lib, cls]) => `<div class="fi-chiffre${cls ? ' ' + cls : ''}"><b>${esc(String(v))}</b><span>${esc(lib)}</span></div>`).join('')}</div>`;
/* L'état : `ko` les problèmes, `att` les points à voir ; une ligne, le détail se déplie (les problèmes, dépliés). */
function fiEtat(ko, att, okTexte) {
  const deplie = (cls, titre, xs, ouvert) => `<details class="fi-etat ${cls}"${ouvert ? ' open' : ''}><summary><i aria-hidden="true">${cls === 'ko' ? '✕' : '!'}</i><b>${titre}</b>`
    + `<span>${esc(xs[0])}</span>${ico('bas', 'fi-chevron')}</summary><ul>${xs.map(t => `<li>${esc(t)}</li>`).join('')}</ul></details>`;
  if (ko.length) return deplie('ko', ko.length > 1 ? ko.length + ' problèmes' : '1 problème', ko, true);
  if (att.length) return deplie('att', att.length > 1 ? att.length + ' points à voir' : '1 point à voir', att, false);
  return `<div class="fi-etat ok"><i aria-hidden="true">✓</i><b>Conforme</b><span>${esc(okTexte)}</span></div>`; }
const fiCadre = (titre, corps, o) => { o = o || {};
  return `<section class="fi-cadre${o.cls ? ' ' + o.cls : ''}">${titre || o.action ? `<div class="fi-cadre-tete"><span class="fi-sur">${titre || ''}</span>${o.action || ''}</div>` : ''}${corps}</section>`; };
// la référence retenue, sa norme en pastille, le pourquoi en une ligne
const fiRef = (ref, famille, pourquoi) => `<div class="fi-ref-ligne"><span class="fi-ref">${esc(ref || '—')}</span>`
  + (famille ? `<span class="fi-norme ${classeFamille(famille)}">${esc(nomDeFamille(app.norme, famille))}</span>` : '') + '</div>'
  + (pourquoi ? `<p class="fi-pourquoi">${pourquoi}</p>` : '');
/* « Changer » : un bouton dans la tête du cadre, un volet sous la référence. */
const boutonChanger = cle => `<button class="fi-lien" data-changer="${escA(cle)}" aria-expanded="${!!FI.change[cle]}">Changer${ico('bas', 'fi-chevron')}</button>`;
const voletChanger = (cle, corps) => `<div class="fi-changer" data-volet="${escA(cle)}"${FI.change[cle] ? '' : ' hidden'}>${corps}</div>`;
const puces = (attr, items, actif) => `<div class="fi-puces">${items.map(([f, t]) => `<button class="fi-chip${f ? ' ' + classeFamille(f) : ''}" ${attr}="${escA(f)}" aria-pressed="${f === actif}">${esc(t)}</button>`).join('')}</div>`;
const candidat = (cle, m, retenu, mot) => `<button class="cand" data-cle="${escA(cle)}" data-ref="${escA(m.reference)}" aria-pressed="${m.reference === retenu}">${pictoModule(m)}<b>${esc(m.variante)}</b><span>${esc(resumeModule(m))}</span>${m.reference === retenu ? `<span class="ok">${mot}</span>` : ''}</button>`;
/* Une face qui tient dans la largeur de la fiche : le SVG se met à l'échelle. */
const faceAjustee = (f, titre) => `<figure class="fi-face"><svg class="mj" viewBox="0 0 ${f1(f.w)} ${f1(f.h)}" style="max-width:${f1(Math.min(f.w * 1.15, 520))}px" role="img" aria-label="${escA(titre || 'Face')}">${f.svg}</svg>${titre ? `<figcaption>${esc(titre)}</figcaption>` : ''}</figure>`;
// le symétrique d'un module, comme on voit l'autre partie de face (fiche et embase sont symétriques par l'axe vertical)
const miroir = m => ({ ...m, contacts: m.contacts.map(c => ({ ...c, c: m.colonnes - 1 - c.c })), groupes: m.groupes.map(g => ({ ...g, contacts: g.contacts.map(c => ({ ...c, c: m.colonnes - 1 - c.c })) })) });
// ce qu'un contact pris montre sur la face : la clé de son fil, son numéro, sa couleur
const occupant = (f, ko) => { const cl = coulDeFil(f); return { i: cleFil(f.l), cable: f.cable || (f.l && f.l.origine === null ? 'neuf' : '—'), couleur: cl, couleurClaire: melanger(cl, 0.72), ko: !!ko }; };
/* Une ligne de fil : ce qui la repère (contact, borne), le fil, son type, l'autre bout. Un fil que l'outil ajoute (le
   raccord d'une barrette à poser) se dit « à créer ». */
function ligneFil(ct, f, o) { o = o || {}; const k = cleFil(f.l), neuf = !!(f.l && f.l.origine === null);
  return `<li class="fi-fil${o.ko ? ' ko' : ''}${neuf ? ' neuf' : ''}"${k ? ` data-i="${k}" tabindex="0" role="button" aria-label="${escA('Voir le fil ' + (f.cable || 'à créer') + ' sur le plan')}"` : ''}>`
    + `<span class="fi-ct">${ct}</span>${puceFil(f)}<b class="fi-w">${neuf ? 'à créer' : esc(f.cable || '—')}</b><span class="fi-t">${esc(f.type || '')}</span>`
    + `<span class="fi-dest${f.amont ? ' amont' : ''}">${ico('fleche')}<span>${esc(o.dest != null ? o.dest : destination(f))}</span></span>`
    + (o.tag ? `<span class="fi-tag" title="Barrette à poser sur cette borne">${esc(o.tag)}</span>` : '') + (o.ko ? `<span class="fi-ko">${esc(o.ko)}</span>` : '') + '</li>'; }
const fiListe = lignes => lignes ? `<ul class="fi-liste">${lignes}</ul>` : '';
/* Les onglets : un seul panneau à la fois ; l'onglet ouvert se garde par bloc. items [{ id, titre, compte, ko, corps }] */
function fiOnglets(cle, items) { if (items.length === 1) return items[0].corps;
  const actif = items.some(x => x.id === FI.onglet[cle]) ? FI.onglet[cle] : items[0].id;
  return `<div class="fi-onglets" role="tablist" data-cle="${escA(cle)}">${items.map(x => `<button role="tab" data-onglet="${escA(x.id)}" aria-selected="${x.id === actif}"${x.ko ? ' class="ko"' : ''}><b>${esc(x.titre)}</b><span>${esc(x.compte)}</span></button>`).join('')}</div>`
    + items.map(x => `<div class="fi-panneau" role="tabpanel" data-panneau="${escA(x.id)}"${x.id === actif ? '' : ' hidden'}>${x.corps}</div>`).join(''); }
const fiPied = (gauche, droite) => `<footer class="fi-pied">${gauche || ''}<span class="espace"></span>${droite || ''}</footer>`;
const boutonTableau = (filtre, texte) => `<button class="fi-bouton" id="fi-tableau" data-filtre="${escA(filtre)}">${ico('tableau')}<span>${esc(texte)}</span></button>`;
const boutonVoir = nom => `<button class="fi-bouton" data-choisir-bloc="${escA(nom)}">${ico('voir')}<span>${esc(nom)}</span></button>`;
const boutonSupprimer = '<button class="fi-lien danger" id="eq-del">Supprimer</button>';

/* ---- la fiche ------------------------------------------------------------------ */
function rendreFiche() { const box = $('ba-equip'), c = app.cible; if ($('inspecteur').hidden) return;
  if (!c) { box.innerHTML = ''; box.dataset.cle = ''; return; }
  const cle = c.type + '|' + (c.nom || (c.l && (c.l.cable || cleDe(c.l))) || '');
  let html; try { html = c.type === 'fil' ? ficheFil(c.l) : ficheBloc(c.nom); }
  catch (e) { html = fiTete({ code: '?', genre: 'eqpt', nom: c.nom || '—', sous: 'élément' }) + `<p class="fi-pourquoi">${esc(String(e && e.message || e))}</p>`; }
  const meme = box.dataset.cle === cle, haut = box.scrollTop;
  box.innerHTML = html; box.dataset.cle = cle;
  if (meme) box.scrollTop = haut; else { box.scrollTop = 0; box.classList.remove('fondu'); void box.offsetWidth; box.classList.add('fondu'); }
  lierFiche(c); }
function ficheBloc(nom) {
  if (VT_A_POSER.test(nom) || barretteEnModules(nom)) return ficheBarrette(nom);
  if (coupureEnModules(nom)) return ficheCoupure(nom);
  if (estBornier(nom)) return ficheBornierAncien(nom);
  return ficheEquipement(nom); }
const foliosTexte = nom => { const P = plansDuRepere(nom).sort(triNaturel); return P.length ? [P.length > 3 ? P.length : P.join(' · '), P.length > 1 ? 'folios' : 'folio'] : ['—', 'folio']; };

/* ---- un fil ---------------------------------------------------------------------- */
const boutDeFil = (rep, borne, pn, via) => `<button class="fi-bout" data-choisir-bloc="${escA(rep)}"><b>${esc(rep)}</b><span>borne ${esc(borne || '—')}</span>`
  + (pn ? `<small>${esc(pn)}</small>` : '') + (via ? `<em>par ${esc(via)}</em>` : '') + '</button>';
function ficheFil(l) { const coul = coulDeFil({ l }), neuf = l.origine === null, jauge = jaugeDuType(l.type);
  const folios = neuf ? [app.plan] : app.nFolios ? (foliosParSource().get(cleDe(l)) || []) : (l.plan ? [l.plan] : []);
  // sur le plan, un bout peut passer par une barrette à poser : on le dit sous ce bout
  const p = neuf ? null : liaisonsDuPlan().find(x => x.origine && x.aPoser && sourceDe(x) === l);
  const via = cote => p && VT_A_POSER.test(p[cote]) ? p[cote] + ' · borne ' + (cote === 'de' ? p.borneDe : p.borneVers) : '';
  const att = []; if (!l.type) att.push('type de fil inconnu : la jauge ne se vérifie pas');
  if (neuf) att.push('fil à créer : donne-lui son numéro en posant ' + l.aPoser + ' au contrat');
  return fiTete({ code: '', codeHtml: ico('fil'), genre: 'fil', style: `--c:${coul}`, nom: neuf ? 'à créer' : (l.cable || 'sans numéro'),
      sous: esc(neuf ? 'raccord de ' + l.aPoser : (l.route || 'fil')) + (l.type ? ' · ' + esc(l.type) : '') })
    + `<div class="fi-trajet" style="--c:${coul}">${boutDeFil(l.de, l.borneDe, l.pnDe, via('de'))}<span class="fi-fleche"></span>${boutDeFil(l.vers, l.borneVers, l.pnVers, via('vers'))}</div>`
    + fiChiffres([[l.type || '—', 'type'], [jauge != null ? jauge : '—', 'jauge AWG'], [folios.join(' · ') || '—', folios.length > 1 ? 'folios' : 'folio']])
    + (att.length ? fiEtat([], att, '') : '')
    + fiPied(neuf ? boutonVoir(l.aPoser) : boutonTableau(l.cable || l.de, 'Corriger dans le tableau')); }

/* ---- une barrette (et une barrette à poser) ------------------------------------- */
function ficheBarrette(nom) { const aPoser = VT_A_POSER.test(nom), L = liaisonsDeRepere(nom);
  const { besoins: b, plan: Q, main } = planDeBarrette(nom), M0 = Q.modules[0], nomF = f => nomDeFamille(app.norme, f);
  const ko = [...Q.verdicts.filter(v => v.niveau === 'ko').map(v => v.texte), ...Q.fils.filter(x => x.jaugeOk === false).map(x => `${x.f.cable || 'fil à créer'} (${x.f.type}) : jauge refusée par le contact ${x.contact.lettre}`)];
  // la barrette à poser : la borne qu'elle dédouble, ses fils du contrat, le fil à créer
  const raccord = aPoser ? L.find(l => l.aPoser === nom && l.origine === null && l.vers === nom && l.borneVers === '1') : null;
  const sur = raccord ? raccord.de + ':' + raccord.borneDe : '';
  const nContrat = aPoser ? L.filter(l => l.origine && (l.de === nom || l.vers === nom)).length : 0;
  const famille = Q.famille ? nomF(Q.famille) : '';
  const tete = aPoser
    ? fiTete({ code: 'VT', genre: 'aposer', nom, renommer: true, aide: 'Écrire le vrai repère : la barrette entre au contrat', sous: `À poser · sur <b>${esc(sur)}</b>`, relief: !!M0 })
    : fiTete({ code: codeDe(nom), genre: 'barrette', nom, renommer: true, sous: 'Barrette' + (famille ? ' · ' + esc(famille) : ''), relief: true });
  const chiffres = aPoser ? fiChiffres([[nContrat + 1, 'bornes'], [nContrat, 'fils'], [1, 'à créer', 'att']])
    : fiChiffres([[Q.potentiels, 'potentiel' + s_(Q.potentiels)], [Q.fils.length, 'fil' + s_(Q.fils.length)], [M0 ? Q.contacts - Q.utilises : '—', 'libre' + s_(Q.contacts - Q.utilises)]]);
  const etat = aPoser ? fiEtat(ko, ['repère provisoire : écris le vrai repère en tête de fiche, la barrette entre au contrat'], '')
    : fiEtat(ko, [], 'chaque jauge acceptée.');
  // pourquoi ce module, en une ligne
  const pnNorme = b.pn && familleDeReference(app.norme, b.pn);
  const pourquoi = aPoser ? `${nContrat} fils sur ${esc(sur)} : on n’en sertit qu’un par contact, la barrette les reprend.`
    : main ? 'Choisi à la main.' : !Q.modules.length ? 'Aucun module ne loge ces fils.'
    : (Q.main ? 'Norme choisie à la main · ' : pnNorme ? 'Norme du part number · ' : '')
      + (Q.modules.length > 1 ? `${Q.potentiels} potentiels sur ${Q.modules.length} modules.` : `le plus petit module qui loge ${pluriel(Q.potentiels, 'potentiel')}.`);
  const par = new Map(); Q.fils.forEach(x => par.set(x.module + '|' + x.contact.lettre, x));
  const faces = Q.modules.map((M, k) => faceAjustee(faceModuleSvg(M.module, ct => { const x = par.get(k + '|' + ct.lettre); return x ? occupant(x.f, x.jaugeOk === false) : null; }, { etiquettes: true }),
    Q.modules.length > 1 ? (k + 1) + ' · ' + M.reference : '')).join('');
  // changer : la norme, puis une variante d'un seul module
  const cle = 'bar|' + nom, fs = Q.famille ? [Q.famille] : famillesDeModules(app.norme), retenu = M0 && (main || Q.modules.length === 1) ? M0.reference : '';
  const cands = fs.map(f => variantesQuiLogent(b, app.norme, f).slice(0, 6)).flat().map(m => candidat(nom, m, retenu, 'retenue')).join('');
  const changer = aPoser ? '' : puces('data-norme-barrette', [['', 'Automatique'], ...famillesDeModules(app.norme).map(f => [f, nomF(f)])], main ? null : Q.main ? Q.famille : '')
    + (cands || '<p class="fi-pourquoi">Aucune variante ne loge la barrette d’un seul module.</p>')
    + `<div class="fi-liens">${main ? `<button class="fi-lien" data-auto="${escA(nom)}">Revenir au choix automatique</button>` : ''}${M0 ? `<button class="fi-lien" data-bible="${escA(M0.reference)}">Voir dans la bible</button>` : ''}</div>`;
  const module = fiCadre(aPoser ? 'Module proposé' : Q.modules.length > 1 ? 'Modules' : 'Module',
    fiRef(Q.reference || (aPoser ? 'à choisir' : '—'), Q.famille, pourquoi) + (faces ? `<div class="fi-faces">${faces}</div>` : '') + (changer ? voletChanger(cle, changer) : ''),
    { action: changer ? boutonChanger(cle) : '' });
  // les fils : par potentiel (les bornes reliées), la borne du plan d'abord, la lettre du contact ensuite
  const borneDe = f => f.borneBarrette || (f.l && (f.l.de === nom ? f.l.borneDe : f.l.borneVers)) || '';
  const tri = Q.fils.slice().sort((a, c) => a.module - c.module || a.groupe.k - c.groupe.k || triBornes(borneDe(a.f), borneDe(c.f)));
  let dernier = null, lignes = '';
  tri.forEach(x => { const pot = x.potentiel.bornes.join(' · ');
    if (!aPoser && Q.potentiels > 1 && pot !== dernier) { lignes += `<li class="fi-groupe">${x.potentiel.bornes.length > 1 ? 'bornes' : 'borne'} ${esc(pot)}</li>`; dernier = pot; }
    lignes += ligneFil(`<b>${esc(borneDe(x.f))}</b><i>${esc((Q.modules.length > 1 ? (x.module + 1) + '·' : '') + x.contact.lettre)}</i>`, x.f, { ko: x.jaugeOk === false ? 'jauge refusée par le contact' : '' }); });
  (Q.restants || []).forEach(p => p.fils.forEach(f => { lignes += ligneFil(`<b>${esc(borneDe(f))}</b>`, f, { ko: 'sans place dans le module' }); }));
  const pied = aPoser ? fiPied(sur ? boutonVoir(raccord.de) : '') : fiPied(boutonTableau(nom, 'Ses ' + pluriel(L.filter(l => l.de === nom || l.vers === nom).length, 'liaison')), boutonSupprimer);
  return tete + chiffres + etat + module + fiCadre(aPoser ? 'Bornes' : 'Fils', fiListe(lignes)) + pied; }

/* ---- une prise de coupure -------------------------------------------------------- */
function ficheCoupure(nom) { const { besoins: b, points, plan: Q } = planDeCoupure(nom), M = Q.modules[0], nomF = f => nomDeFamille(app.norme, f);
  const ko = Q.verdicts.filter(v => v.niveau === 'ko').map(v => v.texte), att = Q.verdicts.filter(v => v.niveau === 'attention').map(v => v.texte);
  const nums = points.map(p => p.num).join(', '), types = typesDe(Q.fils.map(x => x.f));
  const pourquoi = Q.main ? 'Choisi à la main.' : Q.nomme ? `Nommé par le part number du fichier (${esc(b.pn)}).`
    : !M ? 'Aucun arrangement ne loge ces contacts avec ces jauges.'
    : `Le plus petit arrangement qui a les contacts ${esc(nums)} et accepte ${esc(types || 'ces fils')}.`;
  // les deux parties, face à face : la fiche (mobile) reçoit ce qui arrive, l'embase (fixe) ce qui repart
  let faces = '';
  if (M) { const par = (amont, ct) => { const xs = Q.fils.filter(x => x.contact === ct && !!x.f.amont === amont); return xs.length ? occupant(xs[0].f, xs.some(x => x.jaugeOk === false)) : null; };
    faces = `<div class="fi-faces deux">${faceAjustee(faceModuleSvg(M.module, ct => par(true, ct), { etiquettes: true }), 'Fiche · partie mobile')}`
      + `${faceAjustee(faceModuleSvg(miroir(M.module), ct => par(false, M.module.contacts.find(k => k.lettre === ct.lettre)), { etiquettes: true }), 'Embase · partie fixe')}</div>`; }
  const cote = x => x ? `<span class="fi-cote" data-i="${cleFil(x.f.l)}" tabindex="0" role="button">${puceFil(x.f)}<b>${esc(x.f.cable || '—')}</b><small>${esc(destination(x.f))}</small></span>` : '<span class="fi-cote vide">—</span>';
  const lignes = (M ? M.module.contacts : []).map(ct => { const am = Q.fils.find(x => x.contact === ct && x.f.amont), av = Q.fils.find(x => x.contact === ct && !x.f.amont); if (!am && !av) return '';
    return `<li class="fi-paire${[am, av].some(x => x && x.jaugeOk === false) ? ' ko' : ''}"><span class="fi-ct"><b>${esc(ct.lettre)}</b></span>${cote(am)}<span class="fi-entre" aria-hidden="true"></span>${cote(av)}</li>`; }).join('');
  const cle = 'cou|' + nom, vs = arrangementsQuiLogent(points, app.norme, Q.visee || Q.famille).slice(0, 6), retenu = M ? M.reference : '';
  const changer = puces('data-norme-prise', [['', 'Automatique'], ...famillesDeModules(app.norme, 'connecteur').map(f => [f, nomF(f)])], Q.main ? null : (Q.visee || ''))
    + (vs.map(m => candidat(nom, m, retenu, 'retenu')).join('') || '<p class="fi-pourquoi">Aucun arrangement de cette norme ne convient.</p>')
    + `<div class="fi-liens">${Q.main ? `<button class="fi-lien" data-auto="${escA(nom)}">Revenir au choix automatique</button>` : ''}${M ? `<button class="fi-lien" data-bible="${escA(M.reference)}">Voir dans la bible</button>` : ''}</div>`;
  const info = Q.verdicts.filter(v => v.niveau === 'info').map(v => `<p class="fi-pourquoi">${esc(v.texte)}</p>`).join('');
  const js = Q.fils.map(x => jaugeDuType(x.f.type)).filter(j => j != null), jauge = js.length ? (Math.min(...js) === Math.max(...js) ? String(js[0]) : Math.max(...js) + '–' + Math.min(...js)) : '—';
  return fiTete({ code: codeDe(nom), genre: 'coupure', nom, renommer: true, sous: 'Prise de coupure' + (Q.famille ? ' · ' + esc(nomF(Q.famille)) : ''), relief: true })
    + fiChiffres([[points.length, 'contact' + s_(points.length)], [Q.fils.length, 'fil' + s_(Q.fils.length)], [jauge, 'jauge AWG']])
    + fiEtat(ko, att, 'jauges acceptées des deux côtés.')
    + fiCadre('Arrangement', fiRef(Q.reference, Q.famille, pourquoi) + faces + voletChanger(cle, changer), { action: boutonChanger(cle) })
    + fiCadre('Contacts', lignes ? `<div class="fi-paires-tete"><span></span><span>fiche · arrive</span><span></span><span>embase · repart</span></div><ul class="fi-liste paires">${lignes}</ul>${info}` : '<p class="fi-pourquoi">Aucun contact.</p>')
    + fiPied(boutonTableau(nom, 'Ses ' + pluriel(verite().filter(l => l.de === nom || l.vers === nom).length, 'liaison')), boutonSupprimer); }

/* ---- un équipement --------------------------------------------------------------- */
function ficheEquipement(nom) { const V = verite(), mes = V.filter(l => l.de === nom || l.vers === nom), b = besoinsDeBarrette(nom, V);
  const C = connecteursDe(nom, V).filter(c => c.nom), cav = cavitesDe(nom), parNom = new Map(cav.map(c => [c.nom, c]));
  // une borne qui porte plusieurs fils : une barrette à poser (VT1… sur ce folio)
  const vt = new Map(); liaisonsDuPlan().forEach(l => { if (l.origine === null && l.de === nom && l.vers === l.aPoser && l.borneVers === '1') vt.set(String(l.borneDe), l.aPoser); });
  const doubles = [...b.parBorne].filter(([, fs]) => fs.length > 1);
  const ko = cav.flatMap(c => c.plan.verdicts.filter(v => v.niveau === 'ko').map(v => c.nom + ' · ' + v.texte));
  const att = [...doubles.map(([bo, fs]) => `borne ${bo} : ${fs.length} fils — ${vt.has(String(bo)) ? 'barrette ' + vt.get(String(bo)) : 'une barrette'} à poser`),
    ...cav.flatMap(c => c.plan.verdicts.filter(v => v.niveau === 'attention' && !/contact .* : \d fils/.test(v.texte)).map(v => c.nom + ' · ' + v.texte))];
  const ligne = (bo, f) => ligneFil(`<b>${esc(bo)}</b>`, f, { tag: vt.get(String(bo)) });
  const onglets = C.map(c => { const k = parNom.get(c.nom), Q = k && k.plan, M = Q && Q.modules[0], cle = 'arr|' + nom + '|' + c.nom;
    const fils = c.bornes.slice().sort(triNaturel).flatMap(bo => (b.parBorne.get(bo) || []).map(f => ligne(bo, f))).join('');
    let haut = '', action = '';
    if (M) { const pourquoi = Q.main ? 'Choisi à la main.' : Q.nomme ? 'Nommé par le part number.' : 'Le plus petit qui a ces contacts et ces jauges.';
      const par = new Map(Q.fils.map(x => [x.contact.lettre, x]));
      const vs = arrangementsQuiLogent(k.points, app.norme, Q.famille).slice(0, 5);
      haut += fiRef(M.reference, M.module.famille, pourquoi)
        + faceAjustee(faceModuleSvg(M.module, ct => { const x = par.get(ct.lettre); return x ? occupant(x.f, x.jaugeOk === false) : null; }, { etiquettes: true }))
        + voletChanger(cle, vs.map(m => candidat(nom + '|' + c.nom, m, M.reference, 'retenu')).join('') + (Q.main ? `<div class="fi-liens"><button class="fi-lien" data-auto="${escA(nom + '|' + c.nom)}">Revenir au choix automatique</button></div>` : ''));
      action = boutonChanger(cle); }
    const koC = ko.some(t => t.startsWith(c.nom + ' · '));
    // la tête du cadre : le part number du connecteur (et sa lettre, s'il est seul : pas d'onglets pour la dire)
    const titre = `${C.length > 1 ? '' : `<span class="fi-ct"><b>${esc(c.nom)}</b></span>`}<span class="fi-pn">${esc(c.pn || 'sans part number')}</span>`;
    return { id: c.nom, titre: c.nom, compte: String(c.bornes.length), ko: koC, corps: fiCadre(titre, haut + fiListe(fils), { action, cls: 'fi-connecteur' }) }; });
  // les bornes sans connecteur
  const sans = [...b.parBorne].filter(([bo]) => !C.some(c => c.bornes.includes(bo))).sort((u, v) => triNaturel(u[0], v[0])).flatMap(([bo, fs]) => fs.map(f => ligne(bo, f))).join('');
  if (sans) onglets.push({ id: '—', titre: C.length ? 'Autres' : 'Fils', compte: String(b.parBorne.size - C.reduce((n, c) => n + c.bornes.length, 0)), corps: fiCadre(C.length ? '' : 'Fils', fiListe(sans)) });
  const [fo, foLib] = foliosTexte(nom);
  return fiTete({ code: codeDe(nom), genre: 'eqpt', nom, renommer: true, sous: esc(natureDe(nom).replace(/^./, x => x.toUpperCase())), relief: cav.length > 0, designation: app.contrat.designations.get(nom) || '' })
    + fiChiffres([[mes.length, 'fil' + s_(mes.length)], [C.length || '—', 'connecteur' + s_(C.length)], [fo, foLib]])
    + fiEtat(ko, att, cav.length ? 'chaque jauge acceptée.' : 'rien à redire.')
    + (onglets.length ? fiOnglets('eq|' + nom, onglets) : '')
    + fiPied(boutonTableau(nom, 'Ses ' + pluriel(mes.length, 'liaison')), boutonSupprimer); }

/* ---- un bornier hors modules (une bible importée sans modules) ------------------- */
function ficheBornierAncien(nom) { const V = verite(), b = besoinsDeBarrette(nom, V), n = V.filter(l => l.de === nom || l.vers === nom).length;
  const P = remplirSelonNorme(physiqueDeBarrette(nom, V, app.bible, app.contrat.designations.get(nom) || ''), app.norme);
  return fiTete({ code: codeDe(nom), genre: estCoupure(nom) ? 'coupure' : 'barrette', nom, renommer: true, sous: estCoupure(nom) ? 'Prise de coupure' : 'Barrette', relief: true })
    + `<div class="equip">${cartePhysique(nom, P, b)}</div>` + fiPied(boutonTableau(nom, 'Ses ' + pluriel(n, 'liaison')), boutonSupprimer); }

/* ---- les gestes ------------------------------------------------------------------- */
function lierFiche(c) { const box = $('ba-equip'), nom = c.type === 'fil' ? '' : c.nom;
  $('in-fermer').onclick = () => deselectionner();
  const tab = $('fi-tableau'); if (tab) tab.onclick = () => { app.base.filtre = tab.dataset.filtre; app.base.filtreAuto = false; app.base.portee = 'tout'; app.base.defiler = true; if (app.base.ouvert) rendreBase(); else ouvrirBase(); };
  box.querySelectorAll('[data-choisir-bloc]').forEach(b => b.onclick = () => { const n = b.dataset.choisirBloc, k = ((app.dessin && app.dessin.comps) || []).find(x => x.name === n && x.kind !== 'tag');
    if (k) choisirBloc(k); else { app.cible = { type: 'bloc', nom: n }; rendreFiche(); } });
  // les onglets : on montre un autre panneau, rien ne se refait
  box.querySelectorAll('.fi-onglets').forEach(t => t.addEventListener('click', e => { const b = e.target.closest('[data-onglet]'); if (!b) return; const id = b.dataset.onglet; FI.onglet[t.dataset.cle] = id;
    t.querySelectorAll('[data-onglet]').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    box.querySelectorAll('[data-panneau]').forEach(p => { p.hidden = p.dataset.panneau !== id; }); }));
  box.querySelectorAll('[data-changer]').forEach(b => b.onclick = () => { const k = b.dataset.changer, v = box.querySelector(`[data-volet="${CSS.escape(k)}"]`); if (!v) return;
    v.hidden = !v.hidden; FI.change[k] = !v.hidden; b.setAttribute('aria-expanded', String(!v.hidden)); });
  box.querySelectorAll('input').forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } else if (e.key === 'Escape') { e.stopPropagation(); el.value = el.defaultValue; el.blur(); } }));
  lierFils(box);
  if (!nom) return;
  const rep = $('eq-rep'); if (rep) rep.addEventListener('change', e => { const nr = e.target.value.trim(); if (!nr || nr === nom) { e.target.value = nom; return; }
    if (VT_A_POSER.test(nom)) { if (!poserBarrette(nom, nr)) e.target.value = nom; return; }
    histPush('renommage de ' + nom); renommer(nom, nr); app.choisi = nr; app.cible = { type: 'bloc', nom: nr }; if (app.base.filtre === nom) app.base.filtre = nr; apresEdition(); });
  const des = $('eq-des'); if (des) des.addEventListener('change', e => { histPush('désignation de ' + nom); designer(nom, e.target.value.trim()); apresEdition(); });
  if ($('eq-del')) $('eq-del').onclick = () => { const n = verite().filter(l => l.de === nom || l.vers === nom).length; if (!confirm('Supprimer « ' + nom + ' » et ses ' + n + ' liaison(s) ?')) return;
    histPush('suppression de ' + nom); supprimerEquipement(nom); app.base.filtre = ''; deselectionner(); apresEdition(); dire(nom + ' supprimé.'); };
  if ($('eq-relief')) $('eq-relief').onclick = () => ouvrirRelief(nom);
  // les choix : une norme, une variante, un arrangement, le retour à l'automatique
  const choisir = (cle, d, quoi, mot) => { histPush(quoi); designer(cle, d); apresEdition(); if (mot) dire(mot); };
  box.querySelectorAll('[data-norme-barrette]').forEach(b => b.onclick = () => choisir(nom, b.dataset.normeBarrette, 'norme de ' + nom));
  box.querySelectorAll('[data-norme-prise]').forEach(b => b.onclick = () => choisir(nom, b.dataset.normePrise, 'norme de ' + nom));
  box.querySelectorAll('.cand[data-cle]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') !== 'true') choisir(b.dataset.cle, b.dataset.ref, 'choix de ' + b.dataset.cle, b.dataset.ref + ' retenu.'); });
  box.querySelectorAll('[data-auto]').forEach(b => b.onclick = () => choisir(b.dataset.auto, '', 'choix automatique', 'Choix automatique rétabli.'));
  box.querySelectorAll('[data-bible]').forEach(b => b.onclick = () => ficheBible(b.dataset.bible));
  if (box.querySelector('.equip') && typeof lierCartePhysique === 'function') lierCartePhysique(nom); }
/* Les fils de la fiche et le plan : survoler une ligne (ou un contact de la face) allume le fil et marque tout ce qui
   le montre dans la fiche ; un clic ou Entrée va le voir sur le plan. */
function lierFils(box) { let dernier = null;
  const cible = t => t && t.closest && t.closest('.fi-fil[data-i], .fi-cote[data-i], .mj-contact.plein');
  const marquer = el => { const k = el.dataset.i; box.querySelectorAll('.vise').forEach(x => x.classList.remove('vise'));
    if (!k) return; box.querySelectorAll(`[data-i="${CSS.escape(k)}"]`).forEach(x => x.classList.add('vise')); const w = filDeCle(k); if (w) allumerFil(w); };
  const lacher = () => { dernier = null; box.querySelectorAll('.vise').forEach(x => x.classList.remove('vise')); rallumer(); };
  const voir = el => { const k = el.dataset.i; if (!k) return; if (k[0] !== 'p') { voirFilDeCarte(+k); return; }
    const w = filDeCle(k); if (w) { allumerFil(w); viserFil(w); } };
  box.onmouseover = e => { const el = cible(e.target); if (!el || el === dernier) return; dernier = el; marquer(el); };
  box.onmouseout = e => { if (!dernier) return; const vers = cible(e.relatedTarget); if (vers) return; lacher(); };
  box.onclick = e => { const el = cible(e.target); if (el) voir(el); };
  box.onkeydown = e => { const el = cible(e.target); if (el && (e.key === 'Enter' || e.key === ' ') && !e.target.matches('input')) { e.preventDefault(); voir(el); } }; }
