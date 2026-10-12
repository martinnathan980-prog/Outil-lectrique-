/* ===========================================================================
   08 bis — LA FICHE : ce qu'on voit quand on clique un équipement, un disjoncteur, une barrette, une prise, une masse,
   un câble
   ---------------------------------------------------------------------------
   Le lecteur (la v3) : « les trois petites tuiles en dessous, dégage ; directement les problèmes à traiter, c'est bien ;
   l'identité, avec du recul, ça dégage partout ; "fil", dis "câble" ; je dois pouvoir modifier très facilement la
   longueur, le type de câble, les contacts, tout — là je cherche où c'est ». La fiche v4, la même pour tous, de haut
   en bas :
     · LA BARRE, collée en haut : ‹ › (Alt+← / Alt+→) dans l'historique de l'inspecteur, ×. Quand l'en-tête passe sous
       elle, le repère s'y écrit en petit. Ouvrir une fiche DEPUIS une fiche EMPILE ; un clic sur le plan ou dans
       l'index remplace le haut de la pile ; revenir rouvre la fiche aux mêmes sections, au même défilement ;
     · L'EN-TÊTE : le symbole du type ; le type (« Batterie » — lu dans le code du repère, une liste le change) et la
       désignation, en petit ; le repère en grand (un champ : un clic, ou F2, le renomme partout). Plus de tuiles —
       sauf pour un câble, où elles servent (son type et sa longueur s'y écrivent) ;
     · LES PROBLÈMES, juste dessous : une barre repliée (« 3 problèmes · 7 à voir ») qui se déplie EN PLACE — une
       ligne par point, la section qui le démontre en petit ; un clic l'ouvre et l'allume ;
     · PEU DE SECTIONS (08-sections), dans l'ordre : Calibre · Connecteur (ou Module) · Raccord · De → vers ·
       Câbles (l'intensité ET la chute, une ligne par câble, son type, sa longueur et son contact s'y écrivent) ·
       Déjà fait. Une masse n'a que ses câbles ;
     · LE PIED, collé en bas : le récapitulatif, « + câble », le relief, « ··· ».
   À côté de chaque valeur que l'outil choisit, un « ? » dit comment (08-sections, `aide`). Une valeur se change d'un
   clic ; changée à la main, une pastille « main » et « ↺ » qui la rend. Ctrl+Z défait chaque geste, et la fiche
   reste ouverte sur son objet. Survoler un câble (une ligne, un contact d'une face) l'allume sur le plan et partout
   dans la fiche ; un clic sur une ligne ouvre sa fiche, un clic sur un contact d'une face le choisit. Le pourquoi
   d'un chiffre se lit dans la bulle du survol, pas dans des phrases.
   =========================================================================== */
'use strict';

/* ---- l'état de la fiche, d'un rendu à l'autre ------------------------------------------------------------------- */
// connecteur : le connecteur montré de chaque repère ; liste : la liste de choix ouverte (sa clé) ; viser : la ligne à
// allumer au prochain rendu ; face : les faces dépliées (« repère|connecteur ») et la face montrée d'une prise
// (« fiche » ou « embase ») ; pbs : la fiche dont la barre des problèmes est dépliée ; choisi : le câble choisi sur une
// face (sa ligne reste allumée) ; galerie : la norme parcourue dans la galerie des modules d'une barrette
const FI = { connecteur: {}, liste: '', viser: '', face: {}, pbs: '', choisi: '', galerie: {} };
const ICONES = {
  fermer: '<path d="M6 6l12 12M18 6 6 18"/>',
  relief: '<path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3zM4 7.5l8 4.5 8-4.5M12 12v9"/>',
  tableau: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M3 14h18M9 5v14"/>',
  fleche: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  bas: '<path d="m6 9 6 6 6-6"/>',
  retour: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  gauche: '<path d="m15 5-7 7 7 7"/>',
  droite: '<path d="m9 5 7 7-7 7"/>',
  crayon: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/>',
  loupe: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  voir: '<circle cx="12" cy="12" r="3"/><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/>',
  points: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  alerte: '<path d="M12 3.8 2.8 19.5h18.4L12 3.8z"/><path d="M12 10v4.2M12 17h.01"/>',
  // l'idéal (une étoile au trait, pleine) et « pour toujours » (le lemniscate) : des icônes, pas des glyphes que les polices embarquées n'ont pas
  etoile: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill="currentColor"/>',
  infini: '<path d="M12 12c-2-2.6-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.4 5.5-4zm0 0c2 2.6 3.6 4 5.5 4a4 4 0 0 0 0-8c-1.9 0-3.5 1.4-5.5 4z"/>',
  poubelle: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
  echange: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>'
};
const ico = (k, cls) => `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[k]}</svg>`;
const coulDeFil = f => couleursDesRoutes().get((f.l && f.l.route) || '') || '#26323f';
// la route d'un câble en trait : sa couleur s'il en a une ; sans route, l'encre du thème (le #26323f ne vaut que sur papier)
const puceFil = f => f.l && f.l.route && couleursDesRoutes().has(f.l.route) ? `<i class="fi-puce" style="--c:${coulDeFil(f)}"></i>` : '<i class="fi-puce"></i>';
// un identifiant (part number, référence, type de câble) dans une phrase : en chasse fixe
const ident = (t, b) => `<${b ? 'b' : 'span'} class="id">${esc(t)}</${b ? 'b' : 'span'}>`;
const typesDe = fils => [...new Set(fils.map(f => f.type).filter(Boolean))].sort(triNaturel).join(', ');
/* La clé d'un câble dans la fiche : son rang dans le contrat — ou, pour un câble que l'outil ajoute (le câble à créer
   d'une barrette à poser), « p » et son rang dans le folio. Les lignes, les contacts des faces et le plan se la partagent. */
function cleFil(l) { const i = rangDe(l); if (i >= 0) return String(i); const p = liaisonsDuPlan().indexOf(l); return p >= 0 ? 'p' + p : ''; }
const filDeCle = k => !k || k === '-1' ? null : k[0] === 'p' ? ((app.dessin && app.dessin.fils) || []).find(w => w.i === +k.slice(1)) || null : filDe(verite()[+k]);
const liaisonDeCle = k => !k ? null : k[0] === 'p' ? liaisonsDuPlan()[+k.slice(1)] || null : verite()[+k] || null;
// le numéro d'un câble ; celui que l'outil ajoute (le raccord d'une barrette à poser) n'en a pas encore : « à créer »
const nomDuFil = f => f.cable || (f.l && f.l.origine === null ? 'à créer' : '—');
// le code du repère : « XC » pour 300XC1, « VT » pour une barrette (l'index et le contrôle s'en servent)
const codeDe = nom => { const q = lireRepere(nom); return q && q.code ? q.code.slice(0, 3) : String(nom || '?').slice(0, 2); };
const s_ = n => n > 1 ? 's' : '';
const mm = x => nombre(Math.round(x * 10) / 10);
const insecable = h => String(h).replace(/(\d) (A|V|mm²|mm|m|s|min|ms|h|AWG|%|g\/m|mΩ\/m|mΩ|Ω\/km)(?![\wé])/g, '$1 $2').replace(/(Ø) (\d)/g, '$1 $2').replace(/(jusqu’à|H|sans) (Ø|\d|raccord)/g, '$1 $2').replace(/ ([:;?!»])/g, ' $1').replace(/(«) /g, '$1 ');
const arrondi = (x, n) => x == null || !isFinite(x) ? null : Math.round(x * Math.pow(10, n)) / Math.pow(10, n);
const volts = u => u == null ? '—' : nombre(arrondi(u, u < 0.1 ? 3 : 2)) + ' V';
const candidat = (cle, m, retenu) => `<button type="button" class="cand" data-cle="${escA(cle)}" data-ref="${escA(m.reference)}" aria-pressed="${m.reference === retenu}">${pictoModule(m)}<b>${esc(m.variante)}</b><span>${insecable(esc(resumeModule(m)))}</span></button>`;
const puces = (attr, items, actif) => `<div class="fi-puces">${items.map(([f, t]) => `<button type="button" class="fi-chip${f ? ' ' + classeFamille(f) : ''}" ${attr}="${escA(f)}" aria-pressed="${f === actif}">${esc(t)}</button>`).join('')}</div>`;
const voletT = t => `<p class="fi-rac-t">${esc(t)}</p>`;
// le symétrique d'un module, comme on voit l'autre partie de face (fiche et embase sont symétriques par l'axe vertical)
const miroir = m => ({ ...m, contacts: m.contacts.map(c => ({ ...c, c: m.colonnes - 1 - c.c })), groupes: m.groupes.map(g => ({ ...g, contacts: g.contacts.map(c => ({ ...c, c: m.colonnes - 1 - c.c })) })) });
// ce qu'un contact pris montre sur la face : la clé de son câble, sa couleur — et, au survol, son numéro et son type
const occupant = (f, ko, lettre) => { const cl = coulDeFil(f);
  return { i: cleFil(f.l), couleur: cl, couleurClaire: melanger(cl, 0.8), ko: !!ko, bulle: [lettre ? 'Contact ' + lettre : '', nomDuFil(f), f.type || ''].filter(Boolean).join(' · ') + (ko ? '\ngauge refusée par le contact' : '') }; };
/* Une face qui tient dans la largeur de sa place, interactive : survoler un contact allume son câble, un clic le choisit. */
const faceAjustee = (f, titre) => `<figure class="fi-face"><svg class="mj" viewBox="0 0 ${f1(f.w)} ${f1(f.h)}" style="max-width:${f1(Math.min(f.w * 1.25, 440))}px" role="img" aria-label="${escA(titre || 'Face')}">${f.svg}</svg>${titre ? `<figcaption>${esc(titre)}</figcaption>` : ''}</figure>`;
/* Le contact à sertir, en un mot : « EN3155-003F2020 + E0718-20-30 ». */
const motSertir = st => st ? st.reference + (st.accessoire ? ' + ' + st.accessoire : '') : '';
/* Le mot « hypothèse » sur une fiche : un lien vers la fiche des hypothèses de la simulation (08, `ficheHypotheses`). */
const motHypothese = '<button type="button" class="fi-hyp" data-hyp="1" title="Une hypothèse de la simulation — cliquer pour la régler">hypothèse</button>';
// un nombre écrit à la française (« 5,2 ») ; null s'il n'y en a pas
const nombreEcrit = t => { const x = parseFloat(String(t == null ? '' : t).trim().replace(',', '.')); return isFinite(x) ? x : null; };

/* ---- LA NAVIGATION : la pile de l'inspecteur ------------------------------------------------------------------- */
/* `app.insp.pile` : les fiches vues, 30 au plus, et `app.insp.pos` celle qu'on regarde. Une entrée : { type: 'bloc' |
   'fil' | 'ref', nom | l | c, connecteur, sections (ouvertes ou non), haut (le défilement) }. NAV.mode dit comment
   l'ouverture en cours touche la pile : 'empiler' (depuis la fiche), 'histoire' (‹ ›, Ctrl+Z), sinon on remplace le
   haut (le plan, l'index). NAV.but : ce que la fiche doit montrer en s'ouvrant (un connecteur, une section, une ligne). */
const PILE_MAX = 30;
const NAV = { mode: null, but: null };
const pileInsp = () => { const I = app.insp; if (!I.pile) { I.pile = []; I.pos = -1; } return I; };
const IDS_FILS = new WeakMap(); let idFil = 0;
const idDeLiaison = l => IDS_FILS.get(l) || (IDS_FILS.set(l, ++idFil), idFil);
const entreeDeCible = c => c.type === 'fil' ? { type: 'fil', l: c.l } : c.type === 'ref' ? { type: 'ref', c: { ...c } } : { type: 'bloc', nom: c.nom };
const memeEntree = (a, b) => !!a && !!b && a.type === b.type && (a.type === 'fil' ? a.l === b.l : a.type === 'ref' ? a.c.nom === b.c.nom && a.c.harness === b.c.harness && a.c.repere === b.c.repere : a.nom === b.nom);
const cleDEntree = e => e.type === 'fil' ? 'fil#' + idDeLiaison(e.l) : e.type === 'ref' ? 'ref|' + e.c.nom + '|' + e.c.harness + '|' + e.c.repere : 'bloc|' + e.nom;
const nomDEntree = e => e.type === 'fil' ? (e.l.cable || (e.l.origine === null ? 'câble à créer' : 'câble')) : e.type === 'ref' ? 'Déjà fait · ' + e.c.harness : e.nom;
// la fiche montrée garde sa place (ses sections ouvertes, son défilement, son connecteur) avant qu'une autre la remplace
function memoriserEntree(e, box) { e.haut = box.scrollTop; e.sections = {}; box.querySelectorAll('details.fs').forEach(d => { e.sections[d.dataset.section] = d.open; });
  if (e.type === 'bloc' && FI.connecteur[e.nom] != null) e.connecteur = FI.connecteur[e.nom]; }
// une liaison d'une entrée qui a pu être remplacée (Ctrl+Z rend des copies) : elle-même, sinon celle qui porte les mêmes bouts
const liaisonVivante = l => !l ? null : l.origine === null ? (liaisonsDuPlan().includes(l) ? l : null) : verite().includes(l) ? l : verite().find(x => cleDe(x) === cleDe(l)) || null;
const repereVivant = nom => verite().some(l => l.de === nom || l.vers === nom) || !!barretteAPoser(nom);
/* Ouvrir l'objet d'une entrée : son folio s'il n'est pas sur celui-ci, sa fiche, lui allumé — et le plan ne bouge que
   s'il est hors champ (R5). */
function rouvrir(e, mode, but) { NAV.mode = mode; NAV.but = but ? { ...but, e } : null;
  try {
    if (e.type === 'ref') { app.cible = { ...e.c }; if (app.choisi) { app.choisi = null; peindre(); } ouvrirInspecteur(); return true; }
    if (e.type === 'fil') { const l = liaisonVivante(e.l); if (!l) { dire('Ce câble n’est plus au contrat.'); return false; } e.l = l; montrerFil(l); return true; }
    if (!repereVivant(e.nom)) { dire('« ' + e.nom + ' » n’est plus au contrat.'); return false; }
    montrerBloc(e.nom); return true;
  } finally { NAV.mode = null; NAV.but = null; } }
// le bloc d'un repère sur le plan (une masse : le premier de ses symboles)
const compDuPlan = nom => (app.dessin && app.dessin.comps.find(k => k.name === nom && (k.kind !== 'tag' || estMasse(nom)))) || null;
function montrerBloc(nom) { let k = compDuPlan(nom);
  if (!k && !barretteAPoser(nom)) { const ou = plansDuRepere(nom).sort(triNaturel); if (app.plan !== '*' && ou.length && !ou.includes(app.plan)) { allerAuPlan(ou[0]); k = compDuPlan(nom); } }
  if (k) { choisirBloc(k); montrerSiCache({ x: k.x, y: k.y, w: k.w, h: k.h }); return; }
  const vt = barretteAPoser(nom); if (vt) { choisirBarretteAPoser(vt); const bs = bornesDePiquage(vt); montrerSiCache({ x: vt.x - 20, y: bs[0].y - 12, w: 40, h: bs[bs.length - 1].y - bs[0].y + 24 }); return; }
  if (app.choisi) { app.choisi = null; peindre(); } app.cible = { type: 'bloc', nom }; ouvrirInspecteur(); }
function montrerFil(l) { let w = filDe(l);
  if (!w && l.origine !== null) { const ou = foliosDe(l); if (app.plan !== '*' && ou.length && !ou.includes(app.plan)) { allerAuPlan(ou[0]); w = filDe(l); } }
  if (w) { choisirFil(w); const xs = w.pts.map(p => p.x), ys = w.pts.map(p => p.y), x0 = Math.min(...xs), y0 = Math.min(...ys); montrerSiCache({ x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 }); return; }
  if (app.choisi) { app.choisi = null; peindre(); } app.cible = { type: 'fil', l }; ouvrirInspecteur(); }
/* ‹ et › : la fiche d'avant, celle d'après. Depuis la première fiche venue de l'index, ‹ ramène à l'index ; depuis
   l'index, ‹ rouvre la fiche qu'on y a laissée. */
function naviguer(pas) { const I = pileInsp();
  if (!app.cible) { const e = I.pile[I.pos]; if (pas < 0 && e) rouvrir(e, 'histoire'); return; }
  const j = I.pos + pas; if (j < 0) { if (app.insp.index) deselectionner(); return; } if (j >= I.pile.length) return;
  I.pos = j; if (!rouvrir(I.pile[j], 'histoire')) { I.pile.splice(j, 1); I.pos = Math.min(Math.max(0, j - (pas < 0 ? 0 : 1)), I.pile.length - 1); rendreFiche(); } }
/* Depuis la fiche : ouvrir un autre objet en EMPILANT (‹ y ramènera). */
const allerA = (e, but) => rouvrir(e, 'empiler', but);
const allerAuBloc = (nom, but) => allerA({ type: 'bloc', nom }, but);
const allerAuFil = l => l && allerA({ type: 'fil', l });

/* LA BARRE : ‹ ›, discrets ; le repère en petit (il paraît quand l'en-tête passe dessous) ; ×. */
function barreNav(o) { o = o || {}; const I = pileInsp(), p = I.pile[I.pos - 1], n = I.pile[I.pos + 1];
  const prec = !!app.cible && (I.pos > 0 || app.insp.index), suiv = !!app.cible && I.pos < I.pile.length - 1;
  const tPrec = !prec ? 'Rien avant' : I.pos > 0 && p ? 'Revenir à ' + nomDEntree(p) : 'Revenir à la liste des repères', tSuiv = suiv && n ? 'Aller à ' + nomDEntree(n) : 'Rien après';
  return `<nav class="fi-nav" aria-label="Fiches vues"><button type="button" class="fi-pas" id="fi-prec"${prec ? '' : ' disabled'} aria-label="${escA(tPrec + ' (Alt+←)')}" title="${escA(tPrec + ' (Alt+←)')}">${ico('gauche')}</button>`
    + `<button type="button" class="fi-pas" id="fi-suiv"${suiv ? '' : ' disabled'} aria-label="${escA(tSuiv + ' (Alt+→)')}" title="${escA(tSuiv + ' (Alt+→)')}">${ico('droite')}</button>`
    + `<span class="fi-nav-nom" aria-hidden="true">${esc(o.nom || '')}</span>${o.fermer === false ? '' : `<button type="button" class="fi-x" id="in-fermer" aria-label="Fermer (Échap)" title="Fermer (Échap)">${ico('fermer')}</button>`}</nav>`; }
/* Les câbles d'un repère que le courant dépasse : des problèmes de la fiche, montrés dans « Câbles ». */
const problemesDesFils = fils => fils.flatMap(f => { const x = intensiteDuFil(f.l); if (!x.trop.length) return []; const p = x.trop[0];
  return [{ niveau: 'ko', texte: `${f.l.cable || 'câble sans numéro'} (${f.l.type}) : ${p.nom} ${amperes(p.i)}${p.t === Infinity ? '' : ' pendant ' + secondes(p.t)} > ${amperes(intensiteAdmise(x.fn, p.t) * x.fac)} admis${x.al ? ' — sous ' + x.al.nom : ''}`, section: 'fils', viser: cleFil(f.l) }]; });

/* ---- L'EN-TÊTE --------------------------------------------------------------------------------------------------- */
/* Le SYMBOLE du type, à plat : l'équipement (un boîtier et son connecteur), le disjoncteur (deux bornes, le levier,
   le poussoir), la barrette (une rangée de contacts reliés), la prise (fiche et embase), la masse (le râteau), le câble
   (un trait à la couleur de sa route), la comparaison (deux feuilles). */
const SYMBOLES = {
  equipement: '<rect x="4" y="5" width="15" height="20" rx="1.5"/><rect x="19" y="9" width="5" height="12" rx="1"/><path d="M24 12h3M24 15h3M24 18h3"/>',
  disjoncteur: '<path d="M3 20h5M22 20h5"/><circle cx="9.5" cy="20" r="1.6"/><circle cx="20.5" cy="20" r="1.6"/><path d="M10.5 19 20 12"/><path d="M15 6v9M11.5 6h7"/>',
  barrette: '<rect x="3" y="10" width="24" height="10" rx="2.5"/><circle cx="8.5" cy="15" r="1.8"/><circle cx="15" cy="15" r="1.8"/><circle cx="21.5" cy="15" r="1.8"/><path d="M10.3 15h2.9M16.8 15h2.9"/>',
  prise: '<circle cx="10.5" cy="15" r="7"/><circle cx="19.5" cy="15" r="7"/><circle cx="10.5" cy="12.5" r="1" fill="currentColor"/><circle cx="10.5" cy="17.5" r="1" fill="currentColor"/><circle cx="19.5" cy="12.5" r="1"/><circle cx="19.5" cy="17.5" r="1"/>',
  masse: '<path d="M15 4v11M7 15h16M10 19.5h10M13 24h4"/>',
  fil: '<path class="fi-sym-route" d="M7 15h16"/><circle cx="5" cy="15" r="2.4"/><circle cx="25" cy="15" r="2.4"/>',
  ref: '<rect x="4" y="6" width="13" height="18" rx="1.5"/><rect x="13" y="4" width="13" height="18" rx="1.5"/><path d="M16.5 10h6M16.5 13.5h6M16.5 17h4"/>'
};
const symbole = (type, coul) => `<div class="fi-symbole" aria-hidden="true"${coul ? ` style="--c:${coul}"` : ''}><svg viewBox="0 0 30 30">${SYMBOLES[type] || SYMBOLES.equipement}</svg></div>`;
/* UNE TUILE (la fiche d'un câble seulement) : une étiquette (avec sa majuscule), une valeur forte — ou le champ qui
   l'écrit ; un état (son bord et sa valeur) quand la valeur pose problème. La valeur est du HTML déjà échappé. */
const tuile = (k, v, o) => { o = o || {};
  return `<div class="fi-tuile${o.etat ? ' ' + o.etat : ''}${o.mono ? ' mono' : ''}${o.edit ? ' edit' : ''}"${o.titre ? ` title="${escA(o.titre)}"` : ''}><span class="fi-tuile-k">${esc(k)}</span><span class="fi-tuile-v">${v}</span></div>`; };
/* LE TYPE d'un équipement, en tête : celui que le code du repère dit (BT → batterie), qu'une liste change (le même choix
   que la colonne Nature du récapitulatif : `natureDite`, 08-recap) ; « ↺ » rend celui du code. */
function natureChoix(nom) { const auto = typeof natureAuto === 'function' ? natureAuto(nom) : natureDe(nom), dite = typeof natureDite === 'function' ? natureDite(nom) : '';
  if (typeof CLE_NATURE !== 'function') return esc(majuscule(natureDe(nom)));
  const q = lireRepere(nom), codeAuto = q && (q.codeLu || q.code), xs = Object.entries(CODES).filter(([k, c]) => c.forme === 'equipement' && k !== codeAuto);
  const noms = xs.map(([, c]) => c.nom), opts = [['', majuscule(auto)], ...xs.sort((a, b) => a[1].nom.localeCompare(b[1].nom, 'fr')).map(([k, c]) => [k, majuscule(c.nom) + (noms.filter(n => n === c.nom).length > 1 ? ' (' + k + ')' : '')]), ['EQ', 'Équipement']];
  return `<span class="fi-nature"><select id="eq-nature" aria-label="${escA('Le type de ' + nom + ' : lu dans le code du repère, une liste le change')}" title="Le type, lu dans le code du repère — changer">${opts.map(([v, t]) => `<option value="${escA(v)}"${v === dite ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>${ico('bas', 'fi-nature-v')}</span>`
    + (dite ? retourAuto('nature:' + nom, majuscule(auto)) : ''); }
/* L'en-tête : le symbole ; le type en petit (et la désignation, qui s'écrit à côté) ; le repère — un champ qui a l'air
   d'un titre, son crayon (clic ou F2), qu'on renomme en écrivant dedans ; les tuiles d'un câble.
   o : { type, genre (HTML), nom, champ (l'id du champ), aide, designation (le repère dont on écrit la désignation),
   tuiles, coul } */
function enTete(o) {
  const nom = o.champ ? `<input class="fi-nom" id="${o.champ}" value="${escA(o.nom)}" aria-label="${escA(o.aide || 'Repère — écrire pour renommer')}" title="${escA(o.aide || 'Écrire ici renomme partout : chaque câble suit')}" spellcheck="false" autocomplete="off">`
    + `<button type="button" class="fi-crayon" id="fi-crayon" aria-label="Renommer (F2)" title="Renommer (F2)">${ico('crayon')}</button>` : `<div class="fi-nom">${esc(o.nom)}</div>`;
  const des = o.designation ? app.contrat.designations.get(o.designation) || '' : null;
  const desH = des != null ? `<input class="fi-des${des ? ' plein' : ''}" id="eq-des" value="${escA(des)}" placeholder="désignation" aria-label="Désignation" title="La désignation : un texte libre" spellcheck="false" autocomplete="off">` : '';
  const tuiles = (o.tuiles || []).filter(Boolean);
  return `<header class="fi-entete">${symbole(o.type, o.coul)}<div class="fi-ident">${o.genre || desH ? `<div class="fi-genre">${o.genre || ''}${desH}</div>` : ''}<div class="fi-nom-ligne">${nom}</div></div>`
    + (tuiles.length ? `<div class="fi-tuiles">${tuiles.join('')}</div>` : '') + '</header>'; }
/* L'ancienne tête (la comparaison des contrats déjà faits s'en sert encore, quand sa référence a disparu). */
const fiTete = o => `<header class="fi-tete"><div class="min0"><div class="fi-nom">${esc(o.nom)}</div></div></header><div class="fi-ligne">${o.sous ? `<span class="fi-sous">${o.sous}</span>` : ''}</div>`;

/* LA BARRE DES PROBLÈMES, juste sous l'en-tête : repliée, elle dit combien (« 3 problèmes · 7 à voir ») ; dépliée, une
   ligne par point — les problèmes d'abord —, la section qui le démontre en petit ; un clic l'ouvre et l'allume. Rien
   quand il n'y a rien. `sections` : celles de la fiche (leur clé, leur titre). */
function barreProblemes(probs, sections) { if (!probs.length) return '';
  const titres = new Map(sections.filter(Boolean).filter(s => !s.vide || s.contenu).map(s => [s.cle, s.titre || SECTIONS[s.cle] || s.cle]));
  const ko = probs.filter(p => p.niveau === 'ko').length, att = probs.length - ko, tri = probs.filter(p => p.niveau === 'ko').concat(probs.filter(p => p.niveau !== 'ko'));
  const mots = [ko ? `<b>${pluriel(ko, 'problème')}</b>` : '', att ? (ko ? '' : '<b>') + (att > 1 ? att + ' à voir' : '1 point à voir') + (ko ? '' : '</b>') : ''].filter(Boolean).join(' · ');
  const li = tri.map(p => { const s = titres.has(p.section) ? p.section : '', ou = !s ? '' : s === 'connecteur' && p.connecteur ? 'Connecteur ' + p.connecteur : titres.get(s);
    return `<li><button type="button" class="fi-pb-l ${p.niveau === 'ko' ? 'ko' : 'att'}"${s ? ` data-voir="${escA(s)}"` : ''}${p.viser ? ` data-viser="${escA(p.viser)}"` : ''}${p.connecteur ? ` data-connecteur="${escA(p.connecteur)}"` : ''} data-bulle="${escA(p.texte)}">`
      + `<i aria-hidden="true"></i><span class="fi-pb-t">${insecable(esc(p.texte))}</span>${ou ? `<span class="fi-pb-s">${esc(ou)}</span>` : ''}</button></li>`; }).join('');
  return `<details class="fi-alerte ${ko ? 'ko' : 'att'}" id="fi-pbs"><summary class="fi-pb" id="fi-pb"><span class="fi-alerte-ico">${ico('alerte')}</span><span class="fi-pb-mots">${mots}</span>${ico('bas', 'fi-chevron')}</summary><ul class="fi-pbs">${li}</ul></details>`; }

/* ---- LES CHAMPS : une valeur, son retour au calcul ---------------------------------------------------------------- */
/* Une ligne de champ : l'étiquette (un mot, avec sa majuscule), la valeur ou son champ, la pastille « main » et « ↺ » ;
   dessous, s'il le faut, une note courte (ou une valeur seconde, en petit) et la liste de choix. */
const ligneChamp = (k, v, o) => { o = o || {}; const fin = (o.origine || '') + (o.changer || '') + (o.auto || '');
  return `<div class="fc${o.cls ? ' ' + o.cls : ''}"${o.attrs ? ' ' + o.attrs : ''}><span class="fc-k">${esc(k)}</span><span class="fc-v">${v}${fin ? `<span class="fc-o">${fin}</span>` : ''}</span>${o.sous ? `<span class="fc-sous">${o.sous}</span>` : ''}${o.liste || ''}</div>`; };
const champs = lignes => { const xs = lignes.filter(Boolean); return xs.length ? `<div class="fs-champs">${xs.join('')}</div>` : ''; };
/* Un champ qu'on écrit : il a l'air d'une valeur, se révèle au survol, s'écrit au clic ; Entrée l'applique, Échap le rend. */
const saisie = (attrs, val, o) => { o = o || {}; return `<input class="fc-in${o.mono ? ' mono' : ''}${o.court ? ' court' : ''}${o.long ? ' long' : ''}${o.cls ? ' ' + o.cls : ''}"${attrs} value="${escA(val == null ? '' : val)}"${o.ph ? ` placeholder="${escA(o.ph)}"` : ''}${o.liste ? ` list="${o.liste}"` : ''}${o.mode ? ` inputmode="${o.mode}"` : ''} aria-label="${escA(o.label || '')}" spellcheck="false" autocomplete="off">`; };
/* « Changer » : un seul par valeur, à sa droite ; il ouvre la liste de choix SOUS la valeur (pas un volet). */
const boutonChanger = (cle, titre, mot) => `<button type="button" class="fi-lien fc-changer" data-changer="${escA(cle)}" aria-expanded="${FI.liste === cle}"${titre ? ` title="${escA(titre)}"` : ''}>${esc(mot || 'Changer')}${ico('bas', 'fi-chevron')}</button>`;
/* LA LISTE DE CHOIX, sous la valeur qu'elle change : huit lignes en vue, un filtre au-delà ; Échap, ou un clic ailleurs,
   la ferme. Rien tant qu'elle n'est pas ouverte. */
const listeChoix = (cle, contenu, o) => { o = o || {}; if (FI.liste !== cle) return '';
  return `<div class="fi-choix${o.cls ? ' ' + o.cls : ''}" data-volet="${escA(cle)}" role="group" aria-label="${escA(o.titre || 'Choisir')}">${o.filtre ? `<div class="filtre fi-choix-filtre">${ico('loupe')}<input data-filtre-liste placeholder="${escA(o.filtre)}" aria-label="${escA(o.filtre)}" autocomplete="off" spellcheck="false"></div>` : ''}<div class="fi-choix-corps">${contenu}</div>${o.pied ? `<div class="fi-choix-pied">${o.pied}</div>` : ''}</div>`; };
// la pastille « main » d'une valeur changée ici (ce que portait le fichier, au survol)
const pastilleMain = avant => origine('main', 'Changé ici' + (avant != null ? ' ; le fichier portait ' + (avant || 'rien') : ''));
// ce que le fichier portait pour un champ d'une liaison, en mots
const avantDe = (l, c) => l && l.avant && c in l.avant ? (l.avant[c] == null || l.avant[c] === '' ? 'rien' : String(l.avant[c])) : '';

/* ---- LES CALCULS PARTAGÉS : ce qui alimente un câble, ce qu'il admet, sa chute ------------------------------------- */
/* Le disjoncteur en amont de chaque câble du contrat : une passe sur les chemins de chaque disjoncteur (le premier qui
   passe par le câble), gardée tant que le contrat ne change pas (la clé du contrôle). */
// (la carte est faite des liaisons elles-mêmes : un Ctrl+Z rend des copies d'un contrat de même clé — on la refait aussi
// quand la liste des liaisons n'est plus la même)
const ALIM = { cle: null, carte: null, V: null, premier: null, dj: new Map() };
function carteDesAlimentations() { const cle = typeof CONTROLE !== 'undefined' ? CONTROLE.cle : null, V = verite();
  if (ALIM.carte && cle && ALIM.cle === cle && ALIM.V === V && ALIM.premier === V[0]) return ALIM.carte;
  const m = new Map(); ALIM.dj = new Map();
  reperesDe(V).filter(estDisjoncteur).forEach(cb => { try { cheminsDepuis(V, cb).forEach(ch => ch.segments.forEach(s => { if (s.fil && !m.has(s.fil)) m.set(s.fil, { cb, chemin: ch }); })); } catch (_) { } });
  ALIM.cle = cle; ALIM.carte = m; ALIM.V = V; ALIM.premier = V[0]; return m; }
function infosDisjoncteur(cb) { if (ALIM.dj.has(cb)) return ALIM.dj.get(cb); const d = disjonctionDe(cb), pts = d.points.length ? d.points : pointsDuProfil(d.profil), perm = pts.find(p => p.t === Infinity), pointe = pts[0];
  const x = { nom: cb, calibre: d.calibre, perm: perm ? perm.i : null, pointe: pointe && pointe.t !== Infinity ? pointe : null, points: pts }; ALIM.dj.set(cb, x); return x; }
const alimentationDuFil = l => { const a = carteDesAlimentations().get(l); return a ? { ...infosDisjoncteur(a.cb), chemin: a.chemin } : null; };
/* CE QU'UN CÂBLE PORTE ET CE QU'IL ADMET : le courant (le permanent du disjoncteur en amont, sinon l'hypothèse), sa
   pointe, ce que la norme des câbles admet, déclassé comme la simulation (le faisceau, la charge, l'altitude, l'ambiante,
   le conducteur), et ce qui dépasse. */
const CALCULS = new Map();   // le temps d'un rendu : l'intensité de chaque câble, calculée une fois (vidé par rendreFiche)
function intensiteDuFil(l) { if (CALCULS.has(l)) return CALCULS.get(l); const x = intensiteCalculee(l); CALCULS.set(l, x); return x; }
function intensiteCalculee(l) { const H = app.simu || HYPOTHESES, jauge = jaugeDuType(l.type), neuf = l.origine === null;
  const fn = l.type ? filDeNorme(app.norme, l.type, jauge) : null, rd = l.type ? resistanceDuFil(app.norme, l.type, jauge, H.tconducteur) : { rho: null, kConducteur: 1, conducteur: 'cuivre' };
  const decl = fn ? facteurDeclassement(app.norme, H.conditions, { fils: H.fils, charge: H.charge, altitude: H.altitude }) : 1, amb = fn ? facteurAmbiante(fn, H.ambiante) : 1, fac = decl * amb * (rd.kConducteur || 1);
  const continu = fn && fn.intensite != null ? fn.intensite * fac : null, al = neuf ? null : alimentationDuFil(l), I = al && al.perm ? al.perm : H.courant;
  const pts = al ? al.points : [{ nom: 'hypothèse', i: I, t: Infinity }], trop = fn ? pts.filter(pt => pt.i > intensiteAdmise(fn, pt.t) * fac + 1e-9) : [];
  const pointe = al && al.pointe ? { ...al.pointe, admis: fn ? intensiteAdmise(fn, al.pointe.t) * fac : null } : null;
  return { H, jauge, fn, rd, decl, amb, fac, continu, al, I, pointe, trop, charge: continu ? I / continu : null }; }
/* LA CHUTE ADMISE : celle que le moteur rend pour la tension, le régime et les hypothèses de la simulation (la règle du
   lecteur : 2 V en monophasé et en continu, 4 V en triphasé ; sinon la table Réseau) — jamais un chiffre écrit ici. */
const chuteAdmiseDe = H => chuteAdmise(app.norme, H.tension, H.regime, H);
function chuteAdmiseDeLaSimu(H) { const a = chuteAdmiseDe(H); return a && a.chuteMax != null ? a.chuteMax : null; }
/* SA CHUTE : sur le câble (ρ × L × I), et en ligne depuis le disjoncteur en amont, contre la chute admise. */
function chuteDuFil(l, x) { x = x || intensiteDuFil(l); const H = x.H, L = l.longueur > 0 ? l.longueur : H.longueur, dU = x.rd.rho != null ? x.rd.rho / 1000 * L * x.I : null;
  const total = x.al && x.al.chemin ? chuteDuChemin(app.norme, x.al.chemin, x.I, H) : null, admise = chuteAdmiseDe(H), max = admise && admise.chuteMax != null ? admise.chuteMax : null;
  return { L, dU, total, max, regle: admise ? admise.regle || '' : '', hyp: !(l.longueur > 0), trop: !!(total && max != null && total.dU > max + 1e-9), reel: !!(total && total.reel) }; }
// les câbles d'un repère, chacun une fois (pas les shunts) : { l, borne, vers, borneVers, amont }
const filsDuRepere = nom => liaisonsDeRepere(nom).filter(l => (l.de === nom || l.vers === nom) && l.de !== l.vers).map(l => ({ l: sourceDe(l) || l, borne: l.de === nom ? l.borneDe : l.borneVers, vers: l.de === nom ? l.vers : l.de, borneVers: l.de === nom ? l.borneVers : l.borneDe, amont: l.vers === nom }));
// les barrettes à poser sur les bornes d'un repère : borne → VTn
const barrettesSur = nom => { const m = new Map(); liaisonsDuPlan().forEach(l => { if (l.origine === null && l.de === nom && l.vers === l.aPoser && l.borneVers === '1') m.set(String(l.borneDe), l.aPoser); }); return m; };

/* ---- LE CONTACT À SERTIR, choisi à la main --------------------------------------------------------------------- */
/* Le contact qu'on sertit au bout d'un câble se lit dans la table Contacts de la norme (09, `contactDuFil`) ; on peut en
   retenir un autre parmi ceux de la table qui acceptent le câble (même taille, même sexe, même type et gauge, ou « * ») :
   il s'écrit sur la liaison (`contactDe` / `contactVers` : le même champ que le récapitulatif, lu par la nomenclature
   et le contrôle — `contactMain`, 08-modules), et « ↺ » rend celui de la table. Un contrat d'avant qui le gardait dans
   les désignations (clé « sertir|repère|borne ») se lit encore. */
const cleSertir = (rep, borne) => 'sertir|' + rep + '|' + borne;
const deCleSertir = k => { const xs = k.split('|'); return { rep: xs[1], borne: xs.slice(2).join('|') }; };
// les bouts de câble posés sur (repère, borne) : [liaison, champ du contact]
const boutsSur = (rep, borne) => verite().flatMap(l => [l.de === rep && String(l.borneDe) === String(borne) ? [l, 'contactDe'] : null, l.vers === rep && String(l.borneVers) === String(borne) ? [l, 'contactVers'] : null].filter(Boolean));
const sertirChoisi = (rep, borne) => { const x = boutsSur(rep, borne).find(([l, ch]) => l[ch]); return x ? x[0][x[1]] : app.contrat.designations.get(cleSertir(rep, borne)) || ''; };
function contactsPossibles(famille, taille, sexe, type) { const t = typeDuFil(type), j = jaugeDuType(type), vus = new Set();
  return contactsDeTaille(app.norme, famille, taille).filter(c => (!sexe || c.sexe === sexe) && (c.typeFil === '*' || c.typeFil === t) && (c.jauge == null || c.jauge === j))
    .filter(c => { const k = c.reference + '|' + (c.accessoire || ''); if (vus.has(k)) return false; vus.add(k); return true; }); }
// le contact d'un câble sur un plan (x : la ligne du plan), en tenant compte du choix à la main
const sertirAuBout = (rep, borne, x) => { const main = sertirChoisi(rep, borne); return main ? { reference: main, accessoire: '', main: true } : x && x.sertir ? { ...x.sertir, main: false } : null; };
/* La liste des contacts qu'accepte un câble, sous sa ligne. */
function choixSertir(ks, x, f, st) { const Q = x.Q, cands = Q ? contactsPossibles(Q.famille, x.taille, x.sexe, f.type) : [];
  const auto = x.sertir ? motSertir(x.sertir) : '';
  const items = cands.map(c => `<button type="button" class="fi-chip" data-sertir-ref="${escA(ks)}" data-v="${escA(c.reference)}" aria-pressed="${!!st && st.reference === c.reference}" title="${escA((c.typeFil === '*' ? 'tout type' : c.typeFil) + (c.jauge != null ? ' · ' + c.jauge + ' AWG' : ' · toute gauge') + (c.accessoire ? ' · avec ' + c.accessoire : ''))}">${esc(c.reference)}${c.accessoire ? ' <i>+ ' + esc(c.accessoire) + '</i>' : ''}</button>`).join('');
  return `<div class="fi-choix" data-volet="${escA('sertir:' + ks)}">${voletT(`Contacts de taille ${x.taille || '?'}${x.sexe ? ', ' + nomDuSexe(x.sexe) + 's' : ''}, pour ${f.type || 'ce câble'}`)}`
    + (items ? `<div class="fi-puces">${items}</div>` : '<p class="fi-note">La table Contacts de la norme n’en donne aucun pour ce câble.</p>')
    + (st && st.main ? `<div class="fi-choix-pied">${retourAuto('sertir:' + ks, auto || 'la table')}</div>` : '') + '</div>'; }
/* LES PLANS d'un repère (ses cavités, son module, sa prise), le temps d'un rendu ; le contact d'un câble à ce bout. */
const PLANS = new Map();
function plansDuRepereFiche(rep) { if (PLANS.has(rep)) return PLANS.get(rep); let xs = [];
  try { xs = coupureEnModules(rep) ? [planDeCoupure(rep).plan] : barretteEnModules(rep) ? [planDeBarrette(rep).plan] : estBornier(rep) ? [] : cavitesDe(rep).map(c => c.plan); } catch (_) { xs = []; }
  PLANS.set(rep, xs); return xs; }
function planAuBout(l, rep) { for (const Q of plansDuRepereFiche(rep)) { const x = (Q.fils || []).find(y => y.f && y.f.l === l); if (x) return { Q, x }; } return null; }
/* Le contact au bout `rep` (borne `borne`) d'un câble, quand on le connaît : sa référence (la table, ou la main), de
   quoi en choisir un autre, sa gauge refusée. Rien quand on ne sait pas (un bornier à vis, une masse, hors normes). */
function contactAuBout(l, rep, borne) { if (!l || !rep || estMasse(rep) || estRenvoi(rep) || estDisjoncteur(rep) || VT_A_POSER.test(rep)) return null;
  const pb = planAuBout(l, rep); if (!pb) return null; const st = sertirAuBout(rep, borne, pb.x); if (!st) return null;
  return { ks: cleSertir(rep, borne), rep, borne, st, ko: pb.x.jaugeOk === false, lettre: pb.x.contact ? pb.x.contact.lettre : '', plan: { Q: pb.Q, sertir: pb.x.sertir, taille: pb.x.taille, sexe: pb.x.sexe } }; }
// le contact d'un bout, en puce : un clic ouvre les contacts que la table accepte pour ce câble
const boutonContact = (ct, cls) => `<button type="button" class="fi-sertir fi-ct-puce${cls ? ' ' + cls : ''}${ct.st.main ? ' main' : ''}${ct.ko ? ' ko' : ''}" data-sertir="${escA(ct.ks)}" title="${escA('Contact côté ' + ct.rep + (ct.borne ? ', borne ' + ct.borne : '') + (ct.st.main ? ' — choisi ici' : ' — la table de la norme') + (ct.ko ? ' ; la gauge du câble est refusée' : '') + ' : cliquer pour en choisir un autre')}">${esc(motSertir(ct.st))}${ct.ko ? '<i>✗</i>' : ''}</button>`;

/* ---- LES CONTACTS : Borne · Contact · Gauge · Câble ------------------------------------------------------------- */
/* LES CONTACTS d'un connecteur (ou d'un module) : une ligne par câble posé — la borne (et la lettre du contact d'un
   module), le contact de la table de la norme (un clic en choisit un autre ; « ″ » quand c'est le même qu'au-dessus),
   la gauge du câble, acceptée ✓ ou refusée ✗, le numéro du câble en petit. Le câble s'allume au survol de la ligne et
   s'ouvre d'un clic. Rien quand on ne sait pas. xs : [{ ct, f, sertir, rep, borne, plan, ko, groupe }] */
function tableContacts(xs, o) { o = o || {}; let prec = '';
  const rows = xs.map(x => { if (x.groupe) { prec = ''; return `<li class="fi-groupe">${x.groupe}</li>`; }
    const f = x.f, k = f && f.l ? cleFil(f.l) : '', st = x.sertir, mot = motSertir(st), meme = !!mot && mot === prec; prec = mot;
    const ks = x.rep && x.borne != null && x.plan ? cleSertir(x.rep, x.borne) : '';
    const tit = (mot ? 'Contact ' + mot + (st.main ? ' (choisi ici)' : ' (la table de la norme)') : 'La table de la norme ne le dit pas') + (ks ? ' — cliquer pour en choisir un autre' : '');
    const sertir = ks ? `<button type="button" class="fi-sertir${st && st.main ? ' main' : ''}${meme ? ' meme' : ''}" data-sertir="${escA(ks)}" aria-label="${escA(tit)}">${mot ? (meme ? '″' : esc(mot)) : ''}</button>`
      : `<span class="fi-sertir${meme ? ' meme' : ''}">${mot ? (meme ? '″' : esc(mot)) : ''}</span>`;
    const j = f && f.type ? jaugeDuType(f.type) : null, ok = x.ko ? false : x.plan && st ? true : null;
    const jauge = `<span class="fi-jg${ok === false ? ' ko' : ok ? ' ok' : ''}">${j != null ? j : ''}${ok === false ? '<i>✗</i>' : ok ? '<i>✓</i>' : ''}</span>`;
    const bulle = [nomDuFil(f || {}), f && f.type ? f.type : '', j != null ? j + ' AWG' + (ok === false ? ' refusée par le contact' : ok ? ' acceptée' : '') : ''].filter(Boolean).join(' · ') + (x.ko && x.ko !== 'gauge refusée par le contact' ? '\n' + x.ko : '') + '\n' + tit;
    return `<li class="fi-fil${x.ko ? ' ko' : ''}${f && f.l && f.l.origine === null ? ' neuf' : ''}"${k ? ` data-i="${k}" tabindex="0" role="button"` : ''} data-bulle="${escA(bulle)}"><span class="fi-ct">${x.ct}</span>${sertir}${jauge}<span class="fi-cab-n">${esc(f ? nomDuFil(f) : '')}</span></li>`
      + (ks && FI.liste === 'sertir:' + ks ? `<li class="fi-choix-ligne">${choixSertir(ks, x.plan, f, st)}</li>` : ''); }).join('');
  return `<ul class="fi-liste fi-contacts"><li class="fi-entetes"><span>${esc(o.borne || 'Borne')}</span><span>Contact${aide('contact')}</span><span>Gauge${aide('gauge')}</span><span>Câble</span></li>${rows}</ul>`; }
/* Le sexe des contacts d'un connecteur, en deux puces. */
const pucesSexe = (cle, sexe, mots) => `<span class="fi-seg-mini" role="group" aria-label="Sexe des contacts">${(mots || [['F', 'Femelles'], ['M', 'Mâles']]).map(([v, t, tt]) => `<button type="button" class="fi-chip" data-sexe="${escA(cle)}" data-v="${v}" aria-pressed="${sexe === v}"${tt ? ` title="${escA(tt)}"` : ''}>${esc(t)}</button>`).join('')}${sexeChoisi(cle) ? retourAuto('sexe:' + cle, (mots || [['F', 'femelles']])[0][1].toLowerCase()) : ''}</span>`;

/* ---- LES CÂBLES : l'intensité ET la chute, d'un coup d'œil ; le type, la longueur, le contact, d'un clic ---------- */
/* Une ligne par câble, sur deux rangs. En haut ce qu'on lit : son numéro (un clic ouvre sa fiche), une barre de
   l'intensité contre ce qu'il admet, la chute en volts de la couleur de son état (le seuil, celui que le moteur rend,
   dans l'en-tête de colonne). En bas ce qu'on écrit, là où on le voit : son type (une liste de la base des câbles), sa
   longueur (« hyp. » tant que le retest ne la porte pas), et, au bout où il arrive, le contact qu'on y sertit. « ↺ »
   rend ce que portait le fichier. Les câbles en défaut en tête ; le pourquoi des chiffres dans la bulle du survol.
   rows : [{ l, k, num, neuf, puce, type, charge: { r, mot, etat }, chute: { mot, etat, max }, etat, bulle, bout: { rep, borne } }] */
const datalistCables = () => `<datalist id="fi-cables">${cablesDe(app.norme).slice(0, 400).map(c => `<option value="${escA(c.cable)}">${escA([c.nature, c.diametre != null ? 'Ø ' + nombre(c.diametre) + ' mm' : ''].filter(Boolean).join(' · '))}</option>`).join('')}</datalist>`;
function editionsDuCable(r) { const l = r.l, k = r.k, H = app.simu || HYPOTHESES, main = c => origineChamp(l, c) === 'main', L = l.longueur > 0 ? l.longueur : null;
  const ret = (c, mot) => main(c) ? retourAuto('cable:' + c, mot, `data-k="${escA(k)}"`) : '';
  const type = `<span class="fi-ed${main('type') ? ' main' : ''}">${saisie(`data-cable="${escA(k)}" data-champ="type"`, l.type, { mono: true, ph: 'type', liste: 'fi-cables', label: 'Type du câble ' + r.num })}${ret('type', avantDe(l, 'type'))}</span>`;
  const lon = `<span class="fi-ed${main('longueur') ? ' main' : ''}">${saisie(`data-cable="${escA(k)}" data-champ="longueur"`, L != null ? nombre(arrondi(L, 2)) : '', { court: true, ph: nombre(H.longueur), mode: 'decimal', label: 'Longueur du câble ' + r.num + ', en mètres' })}<span class="fi-ed-u">m</span>`
    + `${L == null ? '<i class="fi-ed-hyp" title="Le retest ne porte pas la longueur : celle de l’hypothèse">hyp.</i>' : ''}${ret('longueur', avantDe(l, 'longueur') === 'rien' ? 'hypothèse' : avantDe(l, 'longueur') ? nombre(arrondi(+l.avant.longueur, 2)) + ' m' : '')}</span>`;
  const b = r.bout, ct = b && b.rep ? contactAuBout(l, b.rep, b.borne) : null;
  return { html: `<span class="fi-cab-ed">${type}${lon}${b && b.rep ? `<span class="fi-ed-bout"><span class="fi-ed-vers" title="${escA('Il arrive à ' + b.rep + (b.borne ? ', borne ' + b.borne : ''))}">→ ${esc(b.rep)}</span>${ct ? boutonContact(ct) : ''}</span>` : ''}</span>`,
    choix: ct && FI.liste === 'sertir:' + ct.ks ? `<li class="fi-choix-ligne">${choixSertir(ct.ks, ct.plan, { type: l.type }, ct.st)}</li>` : '' }; }
function listeCables(rows, o) { o = o || {}; const rang = r => r.etat === 'ko' ? 0 : r.etat === 'att' ? 1 : 2;
  const maxs = [...new Set(rows.map(r => r.chute.max).filter(m => m != null))], seuil = maxs.length === 1 ? maxs[0] : null, regles = [...new Set(rows.map(r => r.chute.regle).filter(Boolean))];
  const li = rows.slice().sort((a, b) => rang(a) - rang(b) || triNaturel(a.num, b.num)).map(r => {
    const ed = r.l && r.l.origine !== null && r.k && r.k[0] !== 'p' ? editionsDuCable(r) : { html: r.type ? `<span class="fi-cab-ed"><span class="fi-ed-lu">${ident(r.type)}</span></span>` : '', choix: '' };
    return `<li class="fi-ia fi-cab${r.etat ? ' ' + r.etat : ''}"${r.k ? ` data-i="${r.k}"` : ''}${r.bulle ? ` data-bulle="${escA(r.bulle)}"` : ''}>`
      + `<span class="fi-num">${r.puce || ''}${r.k ? `<button type="button" class="fi-num-b${r.neuf ? ' neuf' : ''}" data-ouvrir-cable="${escA(r.k)}" title="${escA('Ouvrir le câble ' + r.num)}">${esc(r.num)}</button>` : `<b>${esc(r.num)}</b>`}</span>`
      + `<span class="fi-mesure"><span class="fi-barre ${r.charge.etat || ''}" aria-hidden="true"><i style="width:${(Math.min(1, r.charge.r || 0) * 100).toFixed(1)}%"></i></span><span class="fi-v">${r.charge.mot}</span></span>`
      + `<span class="fi-u ${r.chute.etat || ''}">${esc(r.chute.mot)}${seuil == null && r.chute.max != null ? `<i> / ${esc(volts(r.chute.max))}</i>` : ''}</span>`
      + ed.html + '</li>' + ed.choix; }).join('');
  const entetes = `<li class="fi-entetes"><span>Câble</span><span>Intensité / admis${aide('intensite')}</span><span>Chute${seuil != null ? ` <em>≤ ${esc(volts(seuil))}</em>` : ''}${aide('chute', seuil != null ? { admis: seuil, regle: regles.length === 1 ? regles[0] : '' } : null)}</span></li>`;
  return `<ul class="fi-liste fi-ias fi-cables${o.cls ? ' ' + o.cls : ''}">${entetes}${li}</ul>${datalistCables()}`; }
const nombreA = i => nombre(arrondi(i, i < 10 ? 2 : 1));
/* La ligne d'un câble d'un repère : son intensité contre ce qu'il admet (au pire du permanent et de la pointe), sa chute
   en ligne depuis le disjoncteur en amont (sinon sur le câble seul), et la bulle qui dit d'où viennent les chiffres. */
function ligneDeFil(f) { const l = f.l, x = intensiteDuFil(l), c = chuteDuFil(l, x);
  const rP = x.continu ? x.I / x.continu : null, rT = x.pointe && x.pointe.admis ? x.pointe.i / x.pointe.admis : null, r = Math.max(rP || 0, rT || 0), trop = x.trop.length > 0;
  const etatI = !x.fn ? '' : trop ? 'ko' : r > 0.8 ? 'att' : 'ok', u = c.total ? c.total.dU : c.dU, etatU = c.trop ? (c.reel ? 'ko' : 'att') : c.total ? 'ok' : '';
  const bulle = [`${l.cable || (l.origine === null ? 'câble à créer' : 'câble sans numéro')}${l.type ? ' · ' + l.type : ''} · ${x.al ? 'sous ' + x.al.nom + (x.al.calibre ? ' (' + amperes(x.al.calibre) + ')' : '') : amperes(x.H.courant) + ' d’hypothèse'}`,
    trop ? `trop fin : ${x.trop[0].nom} ${amperes(x.trop[0].i)}${x.trop[0].t === Infinity ? '' : ' pendant ' + secondes(x.trop[0].t)} > ${amperes(intensiteAdmise(x.fn, x.trop[0].t) * x.fac)} admis` : '',
    x.fn ? `permanent ${amperes(x.I)} sur ${amperes(x.continu)} admis en continu${motFacteur(x.fac)}` : (l.type ? 'hors de la norme des câbles : ce qu’il admet ne se lit pas' : 'sans type : ce qu’il admet ne se lit pas'),
    x.pointe && x.pointe.admis ? `pointe ${amperes(x.pointe.i)} pendant ${secondes(x.pointe.t)} sur ${amperes(x.pointe.admis)} admis` : '',
    c.total ? `chute en ligne depuis ${x.al.nom} : ${volts(c.total.dU)}${c.max != null ? ' (' + volts(c.max) + ' admis)' : ''}${c.reel ? '' : ', longueurs d’hypothèse'}` : c.dU != null ? `chute sur ce câble : ${volts(c.dU)} (${nombre(arrondi(c.L, 2))} m${c.hyp ? ' d’hypothèse' : ''})` : ''].filter(Boolean).join('\n');
  return { l, k: cleFil(l), num: nomDuFil({ ...f, cable: l.cable }), neuf: l.origine === null, puce: puceFil(f), jauge: x.jauge, type: l.type, bout: { rep: f.vers, borne: f.borneVers },
    // les chiffres de la barre : au pire, comme elle — la pointe quand c'est elle qui serre le plus
    charge: { r, mot: rT != null && rT > (rP || 0) ? `${nombreA(x.pointe.i)} / ${nombreA(x.pointe.admis)} A` : x.continu ? `${nombreA(x.I)} / ${nombreA(x.continu)} A` : `${nombreA(x.I)} A`, etat: etatI },
    chute: { mot: volts(u), etat: etatU, max: c.max, regle: c.regle }, etat: trop || (c.trop && c.reel) ? 'ko' : c.trop ? 'att' : '', bulle }; }
/* LA SECTION DES CÂBLES : la liste, son résumé (combien, combien en défaut), sa pastille. `o.note` : une ligne sous la
   liste (le courant d'hypothèse quand aucun disjoncteur n'alimente ces câbles). */
function sectionFils(rows, probs, o) { o = o || {}; if (!rows.length) return { cle: 'fils', titre: o.titre, vide: 'aucun câble' };
  const ko = rows.filter(r => r.etat === 'ko').length, att = rows.filter(r => r.etat === 'att').length;
  const resume = [pluriel(rows.length, 'câble'), ko ? `<span class="fi-ko-t">${ko} en défaut</span>` : att ? `<span class="fi-att-t">${att} à voir</span>` : 'tous tiennent'].join(' · ');
  return { cle: 'fils', titre: o.titre, resume: insecable(resume), badge: badgeProblemes(probs, 'fils') || (ko ? { t: String(ko), etat: 'ko' } : att ? { t: String(att), etat: 'att' } : { t: '✓', etat: 'ok' }),
    contenu: listeCables(rows, o) + (o.note ? `<p class="fi-note fi-pied-liste">${o.note}</p>` : '') }; }
/* Les câbles d'un repère (équipement, barrette, prise) : une ligne chacun ; la note de l'hypothèse quand aucun n'a de
   disjoncteur en amont. */
function sectionFilsDuRepere(fils, probs) { const rows = fils.map(ligneDeFil), H = app.simu || HYPOTHESES, hyp = fils.some(f => !intensiteDuFil(f.l).al);
  return sectionFils(rows, probs, { note: hyp ? `Sans disjoncteur en amont : ${nombre(H.courant)} A d’${motHypothese}.` : '' }); }

/* « DÉJÀ FAIT » : toujours là, même vide — l'ingénieur apprend qu'elle pourrait exister. */
function sectionDejaFait(nom) { const I = indexReferences();
  if (!I) return { cle: 'dejafait', vide: 'aucune base chargée —', action: '<button type="button" class="fs-action" data-action="references">charger les contrats déjà faits</button>', badge: { t: '0', etat: '' } };
  const h = dejaFaitHtml(nom), n = (h.match(/class="fi-cand /g) || []).length;
  if (!h) return { cle: 'dejafait', vide: 'aucun contrat déjà fait ne porte ce repère, ce part number ni ce code', badge: { t: '0', etat: '' } };
  return { cle: 'dejafait', resume: `${pluriel(n, 'machine')} proche${s_(n)} dans la base`, badge: { t: String(n), etat: '' }, contenu: h }; }

/* ---- LE PART NUMBER D'UN CONNECTEUR, d'un geste pour toutes ses liaisons ----------------------------------------- */
// les liaisons d'un connecteur (ses bornes), chacune avec le champ qui porte son part number de ce côté ; « * » : toutes
// celles du repère (un disjoncteur : un seul part number pour ses bornes à vis)
const liaisonsDuConnecteur = (nom, bornes) => { const tout = bornes === '*', B = new Set((tout ? [] : bornes || []).map(String)), xs = [];
  verite().forEach(l => { if (l.de === nom && (tout || B.has(String(l.borneDe)))) xs.push([l, 'pnDe']); if (l.vers === nom && (tout || B.has(String(l.borneVers)))) xs.push([l, 'pnVers']); }); return xs; };
const pnModifie = xs => xs.some(([l, c]) => origineChamp(l, c) === 'main');
const pnAvant = xs => { const x = xs.find(([l, c]) => l.avant && c in l.avant); return x ? x[0].avant[x[1]] || '' : ''; };
/* Le part number en PETIT, sous la norme : un champ qui a l'air d'une valeur seconde ; « main » et ↺ quand on l'a changé. */
function partNumberPetit(nom, cle, bornes, pn) { const xs = liaisonsDuConnecteur(nom, bornes), main = pnModifie(xs);
  return `<span class="fi-pn"><span class="fi-pn-k">part number</span>${saisie(`data-pn="${escA(cle)}" data-bornes="${escA(bornes === '*' ? '*' : JSON.stringify(bornes.map(String)))}"`, pn, { mono: true, ph: 'à écrire', label: 'Part number' + (cle === '*' ? '' : ' du connecteur ' + cle) })}`
    + `${main ? pastilleMain(pnAvant(xs)) + retourAuto('pn:' + cle, pnAvant(xs) || 'rien') : ''}</span>`; }

/* ---- LE RACCORD : ce qui englobe un connecteur (le raccord, le band-it, le manchon, le tyrap, la cheminée, la gaine) -- */
/* Une pièce par ligne, sur deux rangs : son rôle en petit (et son « ? »), sa référence en chasse fixe et sa quantité ;
   son état à droite (« à confirmer » en ambre, « manque » en rouge ; « vérifié » ne s'écrit pas) ; le pourquoi au
   survol. La désignation du raccord se corrige sur place (↺ rend celle de la table). Ce qu'on choisit (reprise de
   blindage, étanchéité, orientation, gaine) dans « Options ». Le moteur donne la liste toute faite, dans l'ordre de
   montage (`h.pieces` : rôle, libellé, référence, quantité, statut, note) ; sinon on la lit dans ses champs. */
const PUCES_RACCORD = [['blindage', 'Reprise de blindage', [['NO', 'aucune'], ['GND', 'sur le corps'], ['BLI', 'par cosse'], ['CONTACT', 'sur un contact']]],
  ['etanche', 'Étanchéité', [['false', 'pas requise'], ['true', 'requise']]], ['orientation', 'Raccord', [['droit', 'droit'], ['coudé', 'coudé']]], ['gaine', 'Gaine', [['', 'aucune'], ['HFA', 'HFA'], ['NOMEX', 'Nomex']]]];
const SENS_STATUT_RACCORD = { structure: 'La désignation EN 3660 est vérifiée ; les cotes de cette taille ne sont pas lues (recherche R4)', 'déduit': 'La norme ne nomme pas cette famille : déduit du filetage commun avec l’EN 2997 (recherche R4)', 'à confirmer': 'Ni dessin ni désignation lus : à confirmer' };
// le « ? » de chaque pièce
const AIDE_PIECE = { raccord: 'raccord', cheminee: 'cheminee', bande: 'bande', manchon: 'manchon', tyrap: 'tyrap', gaine: 'raccord' };
function piecesHabillage(h) { if (h.tableau) return [];
  if (Array.isArray(h.pieces)) return h.pieces.map(p => ({ ...p, statut: p.statut === 'vérifié' ? '' : p.statut || '' }));
  const R = h.reference, st = R && h.statut && h.statut !== 'vérifié' ? h.statut : '', P = [], fait = (o) => P.push({ quantite: 1, ...o });
  if (h.sansRaccord) fait({ role: 'raccord', libelle: 'Raccord', reference: '', statut: h.aConfirmer ? 'à confirmer' : '', note: majuscule(h.pourquoi || 'sans raccord') });
  else if (h.cheminee) fait({ role: 'cheminee', libelle: 'Cheminée', reference: h.designation || (R ? R.norme : ''), statut: st || (R ? '' : 'à venir'), note: majuscule(h.pourquoi || '') });
  else if (h.raccord !== 'tyrap') fait({ role: 'raccord', libelle: 'Raccord', reference: h.designation || (R ? R.norme : ''), statut: R ? st : 'référence à venir', note: majuscule(h.raccord) + (h.pourquoi ? ' — ' + h.pourquoi : '') });
  if (h.bandit) fait({ role: 'bande', libelle: 'Band-it', reference: h.collier ? h.collier.reference : '', statut: h.collier ? '' : 'aucun ne va', note: h.collier && h.collier.dmax != null ? 'Jusqu’à Ø ' + nombre(h.collier.dmax) + ' mm' : '' });
  if (h.manchon) fait({ role: 'manchon', libelle: 'Manchon', reference: h.manchonRef ? h.manchonRef.designation : '', statut: h.manchonRef ? (h.colle === 'précollé' ? 'précollé' : 'à coller') : 'aucun ne va', note: h.manchonRef ? 'Toron ' + nombre(h.manchonRef.jb != null ? h.manchonRef.jb : 0) + '–' + nombre(h.manchonRef.ja) + ' mm' + (h.colle && h.colle !== 'précollé' ? ' · ' + h.colle : '') : '' });
  if (h.tyrap) fait({ role: 'tyrap', libelle: 'Tyrap', reference: h.tyrap.reference, statut: '', note: h.tyrap.dmax != null ? 'Jusqu’à Ø ' + nombre(h.tyrap.dmax) + ' mm' : '' });
  if (h.choix && h.choix.gaine) fait({ role: 'gaine', libelle: 'Gaine', reference: h.gaine ? h.gaine.reference : '', statut: h.gaine ? '' : 'aucune ne va', note: h.gaine ? (h.gaine.role === 'surblindage' ? 'Surblindage' : 'Protection') : '' });
  return P; }
// l'état d'une pièce, en petit : ambre ce qui est à confirmer, rouge ce qui manque
const classeStatut = s => /aucun|manque|à venir/.test(s) ? 'ko' : s && !/précollé/.test(s) ? 'att' : '';
// le calcul du raccord d'un connecteur : `it` = { cle, fils, pn, ref, plan? } (gardé le temps d'un rendu)
const HABILLAGES = new Map();
function habillageDe(it) { const k = it.cle; if (HABILLAGES.has(k)) return HABILLAGES.get(k);
  const h = habillage(app.norme, it.fils, app.contrat.raccords.get(k), it.pn, it.ref, app.simu, it.plan ? { modules: it.plan.modules, plan: it.plan } : undefined); HABILLAGES.set(k, h); return h; }
/* Le raccord d'un connecteur (ou d'un côté d'une prise) : `it` = { cle, titre?, fils, pn, ref, plan? } ; le plan de
   contacts (et ses modules), quand il y en a un, donne au moteur le nombre de cheminées d'un EN 4165 et les obturateurs
   des cavités libres. */
function raccordHtml(it) { const { cle } = it, h = habillageDe(it), c = h.choix, choisi = app.contrat.raccords.get(cle) || {};
  const desMain = choisi.designation || '', desAuto = h.designation || (h.reference ? h.reference.norme : ''), manque = (h.manquants || []).filter(m => !(h.manchon && !h.manchonRef && /^aucun manchon/.test(m)));
  const lignes = piecesHabillage(h).map(p => { const editable = p.role === 'raccord' && !h.sansRaccord && (h.reference || desMain), sc = classeStatut(p.statut || '');
    const refH = editable ? saisie(`data-rac-ref="${escA(cle)}"`, desMain || p.reference || desAuto, { mono: true, ph: 'à écrire', label: 'Désignation du raccord', long: true }) + (desMain ? pastilleMain(null) + retourAuto('rac:' + cle, desAuto || 'la table') : '')
      : p.reference ? `<span class="id">${esc(p.reference)}</span>` : p.role === 'raccord' && h.sansRaccord ? '<span class="fi-muet">aucun</span>' : '';
    const bulle = [p.note ? majuscule(p.note) : '', p.statut && SENS_STATUT_RACCORD[p.statut] ? SENS_STATUT_RACCORD[p.statut] : '', p.role === 'raccord' || p.role === 'cheminee' ? manque.join('\n') : ''].filter(Boolean).join('\n');
    const q = AIDE_PIECE[p.role] ? aide(AIDE_PIECE[p.role], { habillage: h }) : '';
    return `<li class="fi-piece${sc ? ' ' + sc : ''}" data-role="${escA(p.role)}"${bulle ? ` data-bulle="${escA(bulle)}"` : ''}><span class="fi-piece-r">${esc(p.libelle || majuscule(p.role))}${q}</span>`
      + `${p.statut ? `<span class="fi-piece-st">${esc(p.statut)}</span>` : '<span></span>'}${refH || p.quantite > 1 ? `<span class="fi-piece-ref">${refH}${p.quantite > 1 ? `<i class="fi-qte">× ${p.quantite}</i>` : ''}</span>` : ''}</li>`; }).join('');
  const k = 'rac|' + cle, segments = PUCES_RACCORD.map(([champ, t, opts]) => `<div class="fi-seg">${voletT(t)}<div class="fi-puces">${opts.map(([v, m]) => `<button type="button" class="fi-chip" data-raccord="${escA(cle)}" data-champ="${champ}" data-v="${escA(v)}" aria-pressed="${String(c[champ]) === v}">${esc(m)}</button>`).join('')}</div></div>`).join('');
  const toron = h.faisceau && h.faisceau.diametre != null ? `toron Ø ${mm(h.faisceau.diametre)} mm` : '';
  const choix = [c.blindage && c.blindage !== 'NO' ? 'blindage repris' : '', c.etanche ? 'étanche' : '', c.orientation === 'coudé' ? 'coudé' : '', c.gaine ? 'gaine ' + c.gaine : ''].filter(Boolean).join(' · ');
  return `<div class="fi-hab" data-hab="${escA(cle)}"${it.titre ? ` data-titre="${escA(it.titre)}"` : ''}><div class="fi-hab-tete">${it.titre ? `<span class="fi-hab-t">${esc(it.titre)}</span>` : ''}<span class="fi-hab-mots">${insecable(esc([toron, choix].filter(Boolean).join(' · ')))}${toron ? aide('toron', { habillage: h }) : ''}</span>${h.tableau ? '' : boutonChanger(k, 'Reprise de blindage, étanchéité, orientation, gaine', 'Options')}</div>`
    + (h.tableau ? '' : listeChoix(k, segments, { titre: 'Les options du raccord' }))
    + (lignes ? `<ul class="fi-nomen">${lignes}</ul>` : `<p class="fi-note">${h.tableau ? 'Disjoncteur de tableau : ni raccord ni band-it.' : 'Rien à poser.'}</p>`) + '</div>'; }
/* La SECTION « Raccord » : un bloc par connecteur (ou par côté d'une prise) ; son résumé dit les références. */
function sectionRaccord(items, probs, o) { o = o || {}; const xs = items.filter(it => it && it.fils && it.fils.length); if (!xs.length) return o.vide ? { cle: 'raccord', titre: o.titre, vide: o.vide } : null;
  const P = xs.flatMap(it => piecesHabillage(habillageDe(it)));
  const princ = [...new Set(P.filter(p => p.role === 'raccord' || p.role === 'cheminee').map(p => p.reference).filter(Boolean))], autres = [...new Set(P.filter(p => ['bande', 'manchon', 'tyrap', 'gaine'].includes(p.role)).map(p => ({ bande: 'band-it', manchon: 'manchon', tyrap: 'tyrap', gaine: 'gaine' })[p.role]))];
  const resume = [princ.length ? princ.map(ident).join(' · ') : P.some(p => p.role === 'raccord' && !p.reference) ? 'sans raccord' : '', autres.join(' · ')].filter(Boolean).join(' · ');
  return { cle: 'raccord', titre: o.titre, resume, badge: badgeProblemes(probs, 'raccord'), contenu: xs.map(raccordHtml).join('') }; }

/* ---- UN ÉQUIPEMENT ------------------------------------------------------------------------------------------------ */
// la section qu'un point du disjoncteur démontre : ses câbles (la charge, la protection, la chute en ligne), sinon lui
const sectionDj = t => /^chute en ligne/.test(t) || /^(?![\d])\S+ \(|^(fil|câble) sans numéro|^borne /.test(t) ? 'fils' : 'disjoncteur';
function problemesEquipement(nom, cav, b, vt, dj) { const probs = [];
  cav.forEach(c => c.plan.verdicts.forEach(v => { if (v.niveau === 'ko') probs.push({ niveau: 'ko', texte: c.nom + ' · ' + v.texte, section: 'connecteur', connecteur: c.nom });
    else if (v.niveau === 'attention' && !/^contact \S+ : \d+ (fils|câbles)/.test(v.texte)) probs.push({ niveau: 'att', texte: c.nom + ' · ' + v.texte, section: 'connecteur', connecteur: c.nom }); }));
  const parBorne = connecteurParBorne(nom, liaisonsDeRepere(nom));
  [...b.parBorne].filter(([, fs]) => fs.length > 1).forEach(([bo, fs]) => { const g = parBorne.get(String(bo));
    probs.push({ niveau: 'att', texte: `borne ${bo} : ${fs.length} câbles — ${vt.has(String(bo)) ? 'barrette ' + vt.get(String(bo)) : 'une barrette'} à poser`, section: dj ? 'fils' : 'connecteur', connecteur: !dj && g ? g.nom : undefined }); });
  if (dj) controleDisjonction(nom).forEach(x => probs.push({ niveau: x.niveau === 'ko' ? 'ko' : 'att', texte: x.texte, section: sectionDj(x.texte) }));
  // ce que le contrôle du contrat relève en plus sur ce repère (un conducteur CCA, ce qu'un disjoncteur nourrit au-delà d'un passage)
  ((typeof CONTROLE !== 'undefined' && CONTROLE.items) || []).filter(x => x.nom === nom && !probs.some(p => p.texte === x.texte)).forEach(x => probs.push({ niveau: x.niveau === 'ko' ? 'ko' : 'att', texte: x.texte, section: dj ? sectionDj(x.texte) : x.section || 'connecteur' }));
  return probs; }
function ficheEquipement(nom) { const V = verite(), b = besoinsDeBarrette(nom, V), dj = estDisjoncteur(nom);
  const C = connecteursDe(nom, V).filter(c => c.nom), cav = cavitesDe(nom), parNom = new Map(cav.map(c => [c.nom, c])), vt = barrettesSur(nom);
  const sans = [...b.parBorne.keys()].filter(bo => !C.some(c => c.bornes.includes(bo))).sort(triNaturel);
  const probs = problemesEquipement(nom, cav, b, vt, dj), fils = filsDuRepere(nom);
  if (dj) return ficheDisjoncteur(nom, probs);
  probs.push(...problemesDesFils(fils));
  // le connecteur montré : celui qu'on a choisi, sinon celui qui porte un problème, sinon le premier
  const ids = C.map(c => c.nom).concat(sans.length ? ['—'] : []), fautif = id => probs.some(p => p.connecteur === id && p.niveau === 'ko');
  const sel = ids.includes(FI.connecteur[nom]) ? FI.connecteur[nom] : ids.find(fautif) || ids[0] || ''; FI.connecteur[nom] = sel;
  const segs = ids.length > 1 ? `<div class="fi-segs" role="group" aria-label="Connecteur montré">${ids.map(id => { const x = C.find(y => y.nom === id), kx = x && parNom.get(id), n = x ? x.bornes.length : sans.length;
    const compte = kx && kx.plan.modules[0] ? `${kx.plan.utilises}/${kx.plan.modules[0].module.contacts.length}` : String(n), raison = probs.filter(p => p.connecteur === id && p.niveau === 'ko').map(p => p.texte).join(' ; ');
    return `<button type="button" class="seg${fautif(id) ? ' ko' : ''}" data-connecteur="${escA(id)}" aria-pressed="${id === sel}" title="${escA(raison || (id === '—' ? 'Les bornes sans connecteur' : 'Le connecteur ' + id))}">${fautif(id) ? '<i aria-hidden="true"></i>' : ''}<b>${id === '—' ? 'sans' : esc(id)}</b><small>${esc(compte)}</small></button>`; }).join('')}</div>` : '';
  const c = C.find(k => k.nom === sel) || null, k = c ? parNom.get(c.nom) || null : null;
  const corps = c ? corpsConnecteur(nom, c, k, b, vt) : sel === '—' ? corpsSansConnecteur(nom, sans, b, vt) : '';
  const familles = [...new Set(C.map(x => { const kx = parNom.get(x.nom); return kx ? nomDeFamille(app.norme, kx.plan.famille) || kx.plan.famille : ''; }).filter(Boolean))];
  const resumeC = !C.length ? (sans.length ? 'des bornes au corps' : 'aucun connecteur') : `${C.map(x => esc(x.nom)).join(' · ')}${familles.length ? ' — ' + familles.map(esc).join(', ') : ''}`;
  // le raccord du connecteur montré
  const filsC = c ? c.bornes.flatMap(bo => b.parBorne.get(bo) || []).filter(f => f.l) : [], M = k && k.plan.modules[0];
  const raccord = c ? sectionRaccord([{ cle: nom + '|' + c.nom, fils: filsC, pn: c.pn, ref: M ? M.reference : '', plan: M ? k.plan : null }], probs, { titre: C.length > 1 ? 'Raccord · ' + c.nom : 'Raccord', vide: 'aucun câble sur ce connecteur' }) : null;
  const sections = [{ cle: 'connecteur', titre: C.length > 1 ? 'Connecteurs' : 'Connecteur', resume: resumeC, badge: badgeProblemes(probs, 'connecteur'), contenu: segs + `<div class="fi-panneau" data-panneau="${escA(sel)}">${corps}</div>`, vide: ids.length ? '' : 'aucune borne' },
    raccord, sectionFilsDuRepere(fils, probs), sectionDejaFait(nom)];
  return enTete({ type: 'equipement', genre: natureChoix(nom), designation: nom, nom, champ: 'eq-rep' }) + barreProblemes(probs, sections) + ficheSections('equipement', sections)
    + fiPied({ tableau: nom, fil: nom, relief: cav.length > 0, menu: MENU_BLOC }); }
/* LE CONNECTEUR montré : la NORME d'abord (l'arrangement en puce — un clic montre la face — et son « ? » ; « Changer »
   ouvre les autres arrangements), la famille et le part number en petit (modifiable) ; puis ses contacts (le sexe à
   droite). Plus de « Bornes 1 à 2 » : les contacts les disent. */
function corpsConnecteur(nom, c, k, b, vt) { const cle = nom + '|' + c.nom, Q = k && k.plan, M = Q && Q.modules[0];
  const pn = partNumberPetit(nom, c.nom, c.bornes, c.pn), fam = Q ? nomDeFamille(app.norme, Q.famille) || Q.famille || '' : '';
  let norme = '', face = '';
  if (M) { const vs = arrangementsQuiLogent(k.points, app.norme, Q.famille).slice(0, 8), auto = Q.main ? remplirContacts(k.points, app.norme, { pn: c.pn, sexe: sexeChoisi(cle) }).reference : '', par = new Map(Q.fils.map(x => [x.contact.lettre, x]));
    const pourquoi = Q.main ? 'Choisi ici' : Q.nomme ? 'Le part number le nomme' : `Le plus petit qui a ces ${pluriel(Q.potentiels, 'contact')} et accepte ${typesDe(Q.fils.map(x => x.f)) || 'ces câbles'}`;
    const liste = listeChoix('arr|' + cle, vs.length ? vs.map(m => candidat(cle, m, M.reference)).join('') : '<p class="fi-note">Aucun autre arrangement de cette norme ne loge ces bornes.</p>', { titre: 'Arrangements qui logent ces bornes' });
    norme = ligneChamp('Norme', `<button type="button" class="fi-norme-puce" data-face="${escA(cle)}" aria-pressed="${!!FI.face[cle]}" title="${escA(pourquoi + ' · ' + (fam || '') + ' — un clic montre la face')}">${esc(M.reference)}${ico('voir')}</button>${aide('arrangement', { plan: Q })}`,
      { origine: Q.main ? pastilleMain(null) : '', auto: Q.main ? retourAuto('arr:' + cle, auto) : '', changer: boutonChanger('arr|' + cle, 'Choisir un autre arrangement'), liste, sous: `${fam ? `<span class="fi-fam">${esc(fam)}</span>` : ''}${pn}` });
    if (FI.face[cle]) face = `<div class="fi-faces">${faceAjustee(faceModuleSvg(M.module, ct => { const x = par.get(ct.lettre); return x ? occupant(x.f, x.jaugeOk === false, ct.lettre) : null; }), 'Face côté contacts · ' + M.module.variante)}</div>`; }
  // aucun arrangement ne loge : le mot, la norme ; la phrase du moteur dans la bulle (la barre des problèmes la porte aussi)
  else if (Q) norme = ligneChamp('Norme', `<b class="fi-ko-t" data-bulle="${escA(majuscule(Q.verdicts.filter(v => v.niveau === 'ko').map(v => v.texte).join(' ; ') || 'aucun arrangement ne convient'))}">Aucun arrangement</b>${aide('arrangement', { plan: Q })}`,
    { origine: Q.main ? pastilleMain(null) : '', auto: Q.main ? retourAuto('arr:' + cle, 'le plus petit qui loge') : '', sous: `${fam ? `<span class="fi-fam">${esc(fam)}</span>` : ''}${pn}` });
  // hors des normes chargées : on ne dit rien de ce qu'on ne sait pas — le part number, et où compléter
  else norme = ligneChamp('Norme', `<span class="fi-muet">—</span>${c.pn ? '<button type="button" class="fi-lien" data-action="normes">compléter les normes</button>' : ''}`, { sous: pn });
  // les contacts : une ligne par câble posé, borne par borne
  const sertirs = new Map(Q ? Q.fils.map(x => [x.f.l, x]) : []);
  const xs = c.bornes.slice().sort(triNaturel).flatMap(bo => (b.parBorne.get(bo) || []).map(f => { const x = sertirs.get(f.l), st = x ? sertirAuBout(nom, bo, x) : null;
    return { ct: `<b>${esc(bo)}</b>${vt.get(String(bo)) ? `<i class="fi-tag" title="Barrette à poser sur cette borne">${esc(vt.get(String(bo)))}</i>` : ''}`, f, sertir: st, rep: nom, borne: bo, plan: x ? { Q, sertir: x.sertir, taille: x.taille, sexe: x.sexe } : null, ko: x && x.jaugeOk === false ? 'gauge refusée par le contact' : '' }; }));
  const contacts = xs.length ? tableContacts(xs) : '<p class="fi-note">Aucun câble sur ce connecteur.</p>';
  // le sexe des contacts se choisit dès que la norme a sa table de contacts (même quand aucun arrangement ne loge)
  const table = Q && (M ? Q.tableContacts : (normeDesModules(app.norme).contacts || []).some(x => x.famille === Q.famille));
  return champs([norme]) + face + groupeSection('Contacts', contacts, { droite: table ? pucesSexe(cle, Q.sexe) : '', compte: xs.length || null }); }
// les bornes qui ne sont sur aucun connecteur (CNT, GND…) : elles se raccordent au corps
function corpsSansConnecteur(nom, sans, b, vt) { const xs = sans.flatMap(bo => (b.parBorne.get(bo) || []).map(f => ({ ct: `<b>${esc(bo)}</b>`, f, sertir: null, rep: nom, borne: bo, plan: null })));
  return `<p class="fi-note">Des bornes au corps : ni connecteur ni contact.</p>` + groupeSection('Contacts', tableContacts(xs), { compte: xs.length }); }

/* ---- UN DISJONCTEUR ------------------------------------------------------------------------------------------------- */
/* Calibre (le calibre retenu en grand et son verdict, le meilleur, la courbe, le profil : `sectionDisjoncteur`, 08
   quinquies) · Câbles (l'intensité au pire contre ce qu'ils admettent, la chute en ligne jusqu'au bout de leur chemin)
   · Déjà fait. Un disjoncteur de tableau a des bornes à vis : ni contacts ni raccord, pas de section Connecteur. */
function ficheDisjoncteur(nom, probs) { const d = disjonctionDe(nom), o = origineDuCalibre(nom, d);
  const rows = lignesFilsDisjoncteur(nom, d), sections = [sectionDisjoncteur(nom, d, o, probs), sectionFils(rows, probs, { cls: 'dj-fils' }), sectionDejaFait(nom)];
  return enTete({ type: 'disjoncteur', genre: natureChoix(nom), designation: nom, nom, champ: 'eq-rep' }) + barreProblemes(probs, sections) + ficheSections('disjoncteur', sections)
    + fiPied({ tableau: nom, fil: nom, relief: false, menu: MENU_BLOC }); }

/* ---- UNE BARRETTE (et une barrette à poser) ------------------------------------------------------------------------ */
/* Module (sa référence et son « ? » ; sa norme — un clic ouvre, sous elle, la GALERIE des assemblages de la norme ;
   l'écart avec le retest ; la face, vivante ; les contacts par potentiel) · Câbles · Déjà fait. Une barrette à poser se
   pose depuis la barre sous l'en-tête. */
function ficheBarrette(nom) { const aPoser = VT_A_POSER.test(nom), L = liaisonsDeRepere(nom);
  const { besoins: b, plan: Q, main } = planDeBarrette(nom), M0 = Q.modules[0], N = app.norme;
  const refuses = Q.fils.filter(x => x.jaugeOk === false);
  const probs = [...Q.verdicts.filter(v => v.niveau === 'ko').map(v => ({ niveau: 'ko', texte: v.texte, section: 'connecteur' })), ...refuses.map(x => ({ niveau: 'ko', texte: `${x.f.cable || 'câble à créer'} (${x.f.type}) : gauge refusée par le contact ${x.contact.lettre}`, section: 'connecteur', viser: cleFil(x.f.l) }))];
  const raccord = aPoser ? L.find(l => l.aPoser === nom && l.origine === null && l.vers === nom && l.borneVers === '1') : null, sur = raccord ? raccord.de + ':' + raccord.borneDe : '';
  if (aPoser) probs.push({ niveau: 'att', texte: 'repère provisoire : lui donner son vrai repère la pose au contrat', section: '' });
  ((typeof CONTROLE !== 'undefined' && CONTROLE.items) || []).filter(x => x.nom === nom && !probs.some(p => p.texte === x.texte) && !/^à poser sur/.test(x.texte)).forEach(x => probs.push({ niveau: x.niveau === 'ko' ? 'ko' : 'att', texte: x.texte, section: 'connecteur' }));
  const libres = Q.contacts - Q.utilises, famNom = M0 ? nomDeFamille(N, M0.module.famille) || M0.module.famille : Q.famille ? nomDeFamille(N, Q.famille) || Q.famille : '';
  /* le MODULE : sa référence (origine, ↺) ; la norme en puce, qui ouvre la galerie ; l'écart avec le retest ; la face */
  const par = new Map(); Q.fils.forEach(x => par.set(x.module + '|' + x.contact.lettre, x));
  const faces = Q.modules.map((M, k) => faceAjustee(faceModuleSvg(M.module, ct => { const x = par.get(k + '|' + ct.lettre); return x ? occupant(x.f, x.jaugeOk === false, ct.lettre) : null; }), Q.modules.length > 1 ? (k + 1) + ' · ' + M.reference : '')).join('');
  const autoRef = main || Q.main ? remplirModules(b, N, '').reference : '';
  const ecart = !aPoser && b.pn && Q.reference && cleNorme(b.pn) !== cleNorme(Q.reference) && moduleDeReference(N, b.pn) ? `<span class="fi-ecart">le retest dit ${ident(b.pn)} <button type="button" class="fi-lien" data-garder="${escA(b.pn)}">garder le retest</button></span>` : '';
  const valeur = Q.reference ? `<span class="fi-norme-puce statique" title="${escA(main ? 'Choisi ici' : Q.modules.length > 1 ? `${Q.potentiels} potentiels sur ${Q.modules.length} modules` : `Le plus petit module qui loge ${pluriel(Q.potentiels, 'potentiel')}`)}">${esc(Q.reference)}</span>` : '<b class="fi-ko-t">Aucun module</b>';
  const galerie = aPoser ? '' : listeChoix('bar|' + nom, galerieModules(nom, b, Q, main), { titre: 'Les assemblages de la norme qui logent ces potentiels', cls: 'fi-galerie-choix', pied: M0 ? `<button type="button" class="fi-lien" data-bible="${escA(M0.reference)}">voir dans la bible</button>` : '' });
  const normeV = aPoser || !famNom ? `<span>${esc(famNom || '—')}</span>` : `<button type="button" class="fi-norme-puce fi-norme-gal" data-changer="${escA('bar|' + nom)}" aria-expanded="${FI.liste === 'bar|' + nom}" title="Voir tous les assemblages de la norme qui logent ces potentiels, et en choisir un">${esc(famNom)}${ico('bas', 'fi-chevron')}</button>`;
  const tete = aPoser && !M0 ? '<p class="fi-note">Le module se choisit quand la barrette est posée au contrat.</p>' : champs([
    ligneChamp('Module', valeur + aide('module', { plan: Q }), { origine: main || Q.main ? pastilleMain(null) : '', auto: main || Q.main ? retourAuto('arr:' + nom, autoRef) : '', sous: ecart }),
    ligneChamp('Norme', normeV + `<span class="fc-aide">${pluriel(Q.potentiels, 'potentiel')}${M0 ? ' · ' + plurielLie(libres, 'contact') + ' libre' + s_(libres) : ''}</span>`, { liste: galerie, cls: 'fc-norme' })]);
  /* les CONTACTS, par potentiel */
  const borneDe = f => f.borneBarrette || (f.l && (f.l.de === nom ? f.l.borneDe : f.l.borneVers)) || '';
  const tri = Q.fils.slice().sort((a, c) => a.module - c.module || a.groupe.k - c.groupe.k || triBornes(borneDe(a.f), borneDe(c.f)));
  let dernier = null, kPot = 0; const xsC = [];
  tri.forEach(x => { const pot = x.potentiel.bornes.join(', ');
    if (!aPoser && pot !== dernier) { kPot++; xsC.push({ groupe: `Potentiel ${kPot} — ${x.potentiel.bornes.length > 1 ? 'bornes' : 'borne'} ${esc(pot)}` }); dernier = pot; }
    xsC.push({ ct: `<b>${esc((Q.modules.length > 1 ? (x.module + 1) + '·' : '') + x.contact.lettre)}</b><i>${esc(borneDe(x.f))}</i>`, f: x.f, sertir: x.sertir || null, plan: x.sertir ? { Q } : null, ko: x.jaugeOk === false ? 'gauge refusée par le contact' : '' }); });
  (Q.restants || []).forEach(p => p.fils.forEach(f => xsC.push({ ct: `<b>${esc(borneDe(f))}</b>`, f, ko: 'sans place dans le module' })));
  const nf = xsC.filter(x => x.f).length, sansTable = M0 && !Q.fils.some(x => x.sertir);
  const contacts = nf ? tableContacts(xsC, { borne: 'Contact · borne' }) + (sansTable ? `<p class="fi-note">La table des contacts de la ${esc(famNom)} manque : <button type="button" class="fi-lien" data-action="normes">l’envoyer</button>.</p>` : '') : '<p class="fi-note">Aucun câble.</p>';
  const fils = filsDuRepere(nom); probs.push(...problemesDesFils(fils));
  const poser = aPoser ? `<div class="fi-poser"><span>Poser au contrat sous</span>${saisie('id="vt-repere"', repereLibre(raccord ? raccord.de : '', 'VT'), { mono: true, label: 'Le vrai repère de la barrette', court: true })}<button type="button" class="btn cuivre" id="vt-poser">Poser</button></div>` : '';
  const sections = [{ cle: 'connecteur', titre: 'Module', resume: aPoser && !M0 ? 'se choisit quand la barrette est posée' : `${Q.reference ? ident(Q.reference) : '<span class="fi-ko-t">aucun module</span>'} · ${pluriel(Q.potentiels, 'potentiel')} · ${plurielLie(libres, 'libre')}`,
      badge: badgeProblemes(probs, 'connecteur'), contenu: tete + (faces ? `<div class="fi-faces">${faces}</div>` : '') + groupeSection('Contacts', contacts, { compte: nf || null }) },
    sectionFilsDuRepere(fils, probs), aPoser ? null : sectionDejaFait(nom)];
  return enTete({ type: 'barrette', genre: aPoser ? `Barrette à poser${sur ? ` <span>· sur ${esc(sur)}</span>` : ''}` : 'Barrette', designation: aPoser ? '' : nom, nom, champ: 'eq-rep', aide: aPoser ? 'Écrire le vrai repère : la barrette entre au contrat' : '' })
    + barreProblemes(probs, sections) + poser + ficheSections('barrette', sections)
    + fiPied(aPoser ? { voir: raccord && raccord.de, relief: !!M0, menu: [['fi-renommer', 'Nommer et poser au contrat']] } : { tableau: nom, fil: nom, relief: true, menu: MENU_BLOC }); }
/* LA GALERIE des assemblages d'une norme (le lecteur : « quand on clique sur la norme, on voit tous les assemblages de
   la norme, très visuel, pour savoir lequel est le mieux, si on peut mieux faire ») : chaque variante qui loge les
   potentiels d'un seul module, dessinée en petit avec ses contacts pris, ce qu'elle laisse de libre ; la retenue
   marquée, la meilleure étoilée ; un clic en retient une (à la main) — « Automatique » rend le choix de l'outil. Les
   onglets parcourent les normes de barrette. */
function galerieModules(nom, b, Q, main) { const N = app.norme, fams = famillesDeModules(N), M0 = Q.modules[0];
  const fam = fams.includes(FI.galerie[nom]) ? FI.galerie[nom] : M0 ? M0.module.famille : Q.famille || fams[0];
  const vs = variantesQuiLogent(b, N, fam).slice(0, 9), retenue = M0 && Q.modules.length === 1 ? M0.reference : '';
  const onglets = fams.length > 1 ? `<div class="fi-gal-onglets" role="group" aria-label="La norme">${fams.map(f => `<button type="button" class="fi-chip" data-gal-famille="${escA(f)}" aria-pressed="${f === fam}">${esc(nomDeFamille(N, f) || f)}</button>`).join('')}</div>` : '';
  const auto = main || Q.main ? `<button type="button" class="btn papier fi-gal-auto" data-auto="${escA('arr:' + nom)}" title="Rendre le choix de l’outil : le plus petit module qui loge ces potentiels">Automatique</button>` : '<span class="fi-gal-mot">Automatique</span>';
  const cartes = vs.map((m, i) => { let Qv = null; try { Qv = remplirModules(b, N, m.reference); } catch (_) { Qv = null; }
    const pris = new Map(); (Qv ? Qv.fils : []).filter(x => x.module === 0).forEach(x => pris.set(x.contact.lettre, x));
    const f = faceModuleSvg(m, ct => { const x = pris.get(ct.lettre); if (!x) return null; const cl = coulDeFil(x.f); return { i: '', couleur: cl, couleurClaire: melanger(cl, 0.8), ko: x.jaugeOk === false }; });
    const libres = m.contacts.length - (Qv ? Qv.fils.filter(x => x.module === 0).length : 0);
    return `<button type="button" class="cand cand-g${m.reference === retenue ? ' retenue' : ''}" data-cle="${escA(nom)}" data-ref="${escA(m.reference)}" aria-pressed="${m.reference === retenue}" title="${escA(m.reference + ' · ' + resumeModule(m) + (i === 0 ? ' — le mieux taillé' : '') + (m.reference === retenue ? ' — retenu' : ' — cliquer pour le retenir'))}">`
      + `<span class="cand-face"><svg class="mj" viewBox="0 0 ${f1(f.w)} ${f1(f.h)}" aria-hidden="true">${f.svg}</svg></span>`
      + `<span class="cand-nom">${i === 0 ? `<i class="cand-etoile" title="Le mieux taillé">${ico('etoile')}</i>` : ''}<b>${esc(m.variante)}</b></span><span class="cand-mot">${plurielLie(libres, 'libre')}${m.reference === retenue ? ' · retenu' : ''}</span></button>`; }).join('');
  return `<div class="fi-gal-tete">${onglets}<span class="espace"></span>${auto}</div>`
    + (cartes ? `<div class="fi-galerie">${cartes}</div>` : `<p class="fi-note">Aucun assemblage de la ${esc(nomDeFamille(N, fam) || fam)} ne loge ces potentiels d’un seul module.</p>`); }
/* Le prochain repère libre d'un code dans la zone d'un équipement : « 102VT1 » si personne ne le porte. */
function repereLibre(voisin, code) { const q = lireRepere(voisin), zone = q && q.num ? q.num : '', pris = new Set(reperesDe(verite()));
  for (let n = 1; n < 1000; n++) { const r = zone + code + n; if (!pris.has(r)) return r; } return zone + code + '1'; }

/* ---- UNE PRISE DE COUPURE ------------------------------------------------------------------------------------------ */
/* Connecteur (la norme en puce et son « ? » ; UNE face — celle de la fiche, ou celle qui porte le problème —, l'autre
   d'un clic ; chaque contact, ce qui arrive et ce qui repart) · Raccord (un bloc par côté) · Câbles · Déjà fait. Plus
   de part number : la norme le dit. */
function ficheCoupure(nom) { const { besoins: b, points, plan: Q } = planDeCoupure(nom), M = Q.modules[0], N = app.norme;
  const probs = Q.verdicts.filter(v => v.niveau === 'ko' || v.niveau === 'attention').map(v => ({ niveau: v.niveau === 'ko' ? 'ko' : 'att', texte: v.texte, section: 'connecteur' }));
  ((typeof CONTROLE !== 'undefined' && CONTROLE.items) || []).filter(x => x.nom === nom && !probs.some(p => p.texte === x.texte)).forEach(x => probs.push({ niveau: x.niveau === 'ko' ? 'ko' : 'att', texte: x.texte, section: 'connecteur' }));
  const nums = points.map(p => p.num).join(', '), types = typesDe(Q.fils.map(x => x.f)), fam = nomDeFamille(N, Q.famille) || Q.famille || '';
  const pourquoi = Q.main ? 'Choisi ici' : Q.nomme ? `Le part number du fichier (${b.pn}) nomme cet arrangement` : !M ? 'Aucun arrangement ne loge ces contacts avec ces gauges' : `Le plus petit arrangement qui a les contacts ${nums} et accepte ${types || 'ces câbles'}`;
  const amont = Q.fils.filter(x => x.f.amont), aval = Q.fils.filter(x => !x.f.amont);
  /* UNE face : celle qu'on a demandée, sinon celle qui porte un problème, sinon la fiche */
  let face = '';
  if (M) { const koAv = aval.some(x => x.jaugeOk === false), koAm = amont.some(x => x.jaugeOk === false);
    const cote = FI.face[nom] === 'embase' || FI.face[nom] === 'fiche' ? FI.face[nom] : koAv && !koAm ? 'embase' : 'fiche', autre = cote === 'fiche' ? 'embase' : 'fiche';
    const par = (am, ct) => { const xs = Q.fils.filter(x => x.contact === ct && !!x.f.amont === am); return xs.length ? occupant(xs[0].f, xs.some(x => x.jaugeOk === false), ct.lettre) : null; };
    const f = cote === 'fiche' ? faceModuleSvg(M.module, ct => par(true, ct)) : faceModuleSvg(miroir(M.module), ct => par(false, M.module.contacts.find(k => k.lettre === ct.lettre)));
    face = `<div class="fi-face-tete"><span>${cote === 'fiche' ? 'Fiche · ce qui arrive' : 'Embase · ce qui repart'}</span><button type="button" class="fi-lien" data-voir-face="${escA(autre)}">${ico('echange')}voir ${autre === 'fiche' ? 'la fiche' : 'l’embase'}</button></div>`
      + `<div class="fi-faces" data-face-montree="${cote}">${faceAjustee(f, '')}</div>`; }
  const vs = arrangementsQuiLogent(points, N, Q.visee || Q.famille).slice(0, 8), retenu = M ? M.reference : '';
  const liste = listeChoix('cou|' + nom, voletT('Norme') + puces('data-norme-prise', [['', 'automatique'], ...famillesDeModules(N, 'connecteur').map(f => [f, nomDeFamille(N, f)])], Q.main ? null : (Q.visee || ''))
    + voletT('Arrangement') + (vs.length ? `<div class="fi-cands">${vs.map(m => candidat(nom, m, retenu)).join('')}</div>` : '<p class="fi-note">Aucun arrangement de cette norme ne convient.</p>'), { titre: 'Arrangements qui logent ces contacts', pied: M ? `<button type="button" class="fi-lien" data-bible="${escA(M.reference)}">voir dans la bible</button>` : '' });
  const autoRef = Q.main || Q.visee ? coupureEnModule(nom, verite(), N, '', sexeChoisi(nom)).plan.reference : '';
  const tete = champs([ligneChamp('Norme', (M ? `<span class="fi-norme-puce statique" title="${escA(pourquoi)}">${esc(M.reference)}</span>` : '<b class="fi-ko-t">Aucun arrangement</b>') + aide('prise', { plan: Q }),
    { origine: Q.main || Q.visee ? pastilleMain(null) : '', auto: Q.main || Q.visee ? retourAuto('arr:' + nom, autoRef) : '', changer: boutonChanger('cou|' + nom, 'Choisir une autre norme ou un autre arrangement'), liste,
      sous: `${fam ? `<span class="fi-fam">${esc(fam)}</span>` : ''}<span>${pluriel(points.length, 'contact')}${Q.tableContacts ? ' · fiche ' + (Q.sexe === 'M' ? 'mâle' : 'femelle') : ''}</span>` })]);
  /* les PAIRES : chaque contact, son contact de la table côté fiche et côté embase, la gauge de chacun */
  // chaque côté : le contact de la table (« ″ » quand c'est le même qu'au-dessus, dans sa colonne), la gauge acceptée ✓ ou ✗
  const prec = { am: '', av: '' };
  const cote = (x, k) => { if (!x) { prec[k] = ''; return '<span class="fi-cote vide"></span>'; } const st = x.sertir, mot = st ? motSertir(st) : '', meme = !!mot && mot === prec[k], j = jaugeDuType(x.f.type), ok = x.jaugeOk === false ? false : st ? true : null; prec[k] = mot;
    return `<span class="fi-cote" data-i="${cleFil(x.f.l)}" tabindex="0" role="button" data-bulle="${escA([nomDuFil(x.f), x.f.type || '', mot].filter(Boolean).join(' · '))}"><span class="fi-sertir${meme ? ' meme' : ''}">${mot ? (meme ? '″' : esc(mot)) : ''}</span><span class="fi-jg${ok === false ? ' ko' : ok ? ' ok' : ''}">${j != null ? j : ''}${ok === false ? '<i>✗</i>' : ok ? '<i>✓</i>' : ''}</span></span>`; };
  const lignes = (M ? M.module.contacts : []).map(ct => { const am = Q.fils.find(x => x.contact === ct && x.f.amont), av = Q.fils.find(x => x.contact === ct && !x.f.amont); if (!am && !av) return '';
    return `<li class="fi-paire${[am, av].some(x => x && x.jaugeOk === false) ? ' ko' : ''}"><span class="fi-ct"><b>${esc(ct.lettre)}</b></span>${cote(am, 'am')}${cote(av, 'av')}</li>`; }).join('');
  const nP = (lignes.match(/class="fi-paire/g) || []).length;
  const paires = lignes ? `<ul class="fi-liste fi-paires"><li class="fi-entetes"><span>Contact</span><span>Fiche · arrive</span><span>Embase · repart</span></li>${lignes}</ul>` : '<p class="fi-note">Aucun contact posé.</p>';
  const fils = filsDuRepere(nom); probs.push(...problemesDesFils(fils));
  const sexe = Q.tableContacts ? pucesSexe(nom, Q.sexe, [['F', 'Fiche femelle', 'La fiche (ce qui arrive) en douilles, l’embase en broches'], ['M', 'Fiche mâle', 'La fiche (ce qui arrive) en broches, l’embase en douilles']]) : '';
  const raccord = sectionRaccord([['Fiche', amont], ['Embase', aval]].map(([t, xs]) => ({ cle: nom + '|' + t.toLowerCase(), titre: t, fils: xs.map(x => x.f), pn: b.pn, ref: Q.reference, plan: M ? Q : null })), probs);
  const sections = [{ cle: 'connecteur', resume: `${M ? ident(M.reference) : '<span class="fi-ko-t">aucun arrangement</span>'} · ${pluriel(points.length, 'contact')}${Q.tableContacts ? ' · fiche ' + (Q.sexe === 'M' ? 'mâle' : 'femelle') : ''}`, badge: badgeProblemes(probs, 'connecteur'),
      contenu: tete + face + groupeSection('Contacts', paires, { droite: sexe, compte: nP || null, aide: ['contact', null] }) },
    raccord, sectionFilsDuRepere(fils, probs), sectionDejaFait(nom)];
  return enTete({ type: 'prise', genre: 'Prise de coupure', designation: nom, nom, champ: 'eq-rep' }) + barreProblemes(probs, sections) + ficheSections('prise', sections) + fiPied({ tableau: nom, fil: nom, relief: true, menu: MENU_BLOC }); }

/* ---- UNE MASSE ------------------------------------------------------------------------------------------------------ */
/* Le lecteur : « une masse : dis-moi la quantité de câbles, mais pas en tuile ; pas d'identité ; mets directement les
   câbles qui y vont ; pas de connecteur ». Une seule section : ses câbles — leur nombre dans le titre —, une ligne
   chacun (son numéro, d'où il vient, sa gauge) ; un clic ouvre sa fiche. */
function ficheMasse(nom) { const fils = filsDuRepere(nom), probs = problemesDesFils(fils);
  const rows = fils.slice().sort((a, b) => triNaturel(nomDuFil({ ...a, cable: a.l.cable }), nomDuFil({ ...b, cable: b.l.cable }))).map(f => { const l = f.l, k = cleFil(l), j = jaugeDuType(l.type), x = intensiteDuFil(l), ko = x.trop.length > 0;
    return `<li class="fi-fil${ko ? ' ko' : ''}"${k ? ` data-i="${k}" tabindex="0" role="button"` : ''} data-bulle="${escA([nomDuFil({ ...f, cable: l.cable }), l.type || '', j != null ? j + ' AWG' : '', 'de ' + f.vers + (f.borneVers ? ':' + f.borneVers : '')].filter(Boolean).join(' · '))}">`
      + `<span class="fi-num">${puceFil(f)}<b>${esc(nomDuFil({ ...f, cable: l.cable }))}</b></span><span class="fi-dest amont">${ico('fleche')}<span>${esc(f.vers)}${f.borneVers ? `<i>:${esc(f.borneVers)}</i>` : ''}</span></span><span class="fi-jg${ko ? ' ko' : ''}">${j != null ? j + '<small> AWG</small>' : ''}</span></li>`; }).join('');
  const sections = [{ cle: 'fils', titre: pluriel(fils.length, 'câble'), badge: badgeProblemes(probs, 'fils'),
    contenu: rows ? `<ul class="fi-liste fi-masse"><li class="fi-entetes"><span>Câble</span><span>D’où il vient</span><span>Gauge</span></li>${rows}</ul>` : '', vide: fils.length ? '' : 'aucun câble' }];
  return enTete({ type: 'masse', genre: 'Masse' + aide('masse', { cables: fils.length }), designation: nom, nom, champ: 'eq-rep' }) + barreProblemes(probs, sections) + ficheSections('masse', sections)
    + fiPied({ tableau: nom, menu: [['fi-renommer', 'Renommer'], ['fi-designer', 'Désignation']] }); }

/* ---- UN BORNIER HORS MODULES (une bible importée sans modules) ----------------------------------------------------- */
function ficheBornierAncien(nom) { const V = verite(), b = besoinsDeBarrette(nom, V);
  const P = remplirSelonNorme(physiqueDeBarrette(nom, V, app.bible, app.contrat.designations.get(nom) || ''), app.norme);
  return enTete({ type: estCoupure(nom) ? 'prise' : 'barrette', genre: estCoupure(nom) ? 'Prise de coupure' : 'Barrette', designation: nom, nom, champ: 'eq-rep' })
    + ficheSections('barrette', [{ cle: 'connecteur', titre: 'Référence', resume: 'la bible des barrettes', contenu: `<div class="equip">${cartePhysique(nom, P, b)}</div>`, ouvert: true }])
    + fiPied({ tableau: nom, relief: true, menu: MENU_BLOC }); }

/* ---- UN CÂBLE ------------------------------------------------------------------------------------------------------- */
/* LA FICHE D'UN CÂBLE, pour celui qui le pose : en tête son numéro et ses tuiles — son type et sa longueur s'y écrivent,
   sa gauge, son intensité —, puis d'où à où (deux cartes : un clic ouvre l'équipement sur le bon connecteur, le contact
   allumé ; le contact de chaque bout se change d'un clic ; la route dessous), puis l'intensité et la chute — une ligne
   chacune, une barre contre ce qu'il admet, le détail dans la bulle. Rien de ce qu'on ne sait pas. */
function ficheFil(l) { const coul = coulDeFil({ l }), neuf = l.origine === null, jauge = jaugeDuType(l.type), st = sertirDuFil(l), N = app.norme;
  const x = intensiteDuFil(l), ch = chuteDuFil(l, x), H = x.H, cab = l.type ? cableDuType(N, l.type) : null;
  // sur le plan, un bout peut passer par une barrette à poser : on le dit sous les cartes
  const p = neuf ? null : liaisonsDuPlan().find(y => y.origine && y.aPoser && sourceDe(y) === l);
  const via = cote => { if (!(p && VT_A_POSER.test(p[cote]))) return ''; let lettre = ''; try { const y = planDeBarrette(p[cote]).plan.fils.find(z => z.f.l === p); if (y) lettre = y.contact.lettre; } catch (_) { }
    return p[cote] + ' · ' + (lettre ? lettre + ' (borne ' + (cote === 'de' ? p.borneDe : p.borneVers) + ')' : 'borne ' + (cote === 'de' ? p.borneDe : p.borneVers)); };
  const probs = [];
  if (!l.type) probs.push({ niveau: 'att', texte: 'type de câble inconnu : la gauge ne se vérifie pas', section: '' });
  if (neuf) probs.push({ niveau: 'att', texte: 'câble à créer : il prend son numéro quand ' + l.aPoser + ' est posée au contrat', section: '' });
  [st.de, st.vers].forEach((s, k) => { if (s && s.ko) probs.push({ niveau: 'ko', texte: 'aucun contact n’accepte ce câble côté ' + (k ? l.vers : l.de), section: 'trajet' }); });
  if (x.rd.refuse) probs.push({ niveau: 'att', texte: 'conducteur ' + x.rd.conducteur + ' sans résistance dans la base : la chute n’est pas calculée', section: 'fils' });
  x.trop.forEach(pt => probs.push({ niveau: 'ko', texte: `${pt.nom} ${amperes(pt.i)}${pt.t === Infinity ? '' : ' pendant ' + secondes(pt.t)} : plus que ce que le câble admet (${amperes(intensiteAdmise(x.fn, pt.t) * x.fac)})`, section: 'fils' }));
  if (ch.trop) probs.push({ niveau: ch.reel ? 'ko' : 'att', texte: `la chute en ligne depuis ${x.al.nom} atteint ${volts(ch.total.dU)} : plus que les ${volts(ch.max)} admis${ch.reel ? '' : ' (longueurs d’hypothèse)'}`, section: 'fils' });
  /* LES TUILES : le type et la longueur s'y écrivent (« main » et ↺ quand on les a changés), la gauge, l'intensité */
  const o = c => origineChamp(l, c), av = c => avantDe(l, c);
  const retour = c => o(c) === 'main' ? retourAuto('champ:' + c, c === 'longueur' && av(c) === 'rien' ? 'hypothèse ' + nombre(H.longueur) + ' m' : c === 'longueur' ? nombre(arrondi(+l.avant[c], 2)) + ' m' : av(c)) : '';
  const orig = c => o(c) === 'main' ? pastilleMain(av(c)) : '';
  const L = l.longueur > 0 ? l.longueur : null, rT = x.pointe && x.pointe.admis ? x.pointe.i / x.pointe.admis : null;
  const hyp = L == null ? `<button type="button" class="orig orig-hyp fi-hyp" data-hyp="1" title="Le retest ne porte pas la longueur : l’hypothèse de la simulation la remplace — cliquer pour la régler">hyp.</button>` : '';
  const brins = cab ? [(cab.brins > 1 ? cab.brins + ' brins' : '1 brin') + (cab.blindage ? ' + blindage' : ''), cab.nature, cab.diametre != null ? 'Ø ' + nombre(cab.diametre) + ' mm' : '', cab.section != null ? nombre(cab.section) + ' mm²' : '', cab.resistance != null ? nombre(cab.resistance) + ' mΩ/m' : '', cab.masse != null ? nombre(cab.masse) + ' g/m' : ''].filter(Boolean).join(' · ') : '';
  const tuiles = neuf ? [tuile('Type', l.type ? esc(l.type) : '—', { mono: true }), tuile('Gauge', jauge != null ? jauge + ' AWG' : '—')] : [
    tuile('Type', saisie('data-edit="type"', l.type, { mono: true, ph: 'DR20…', label: 'Type du câble', liste: 'fi-cables' }) + orig('type') + retour('type'), { mono: true, edit: true, etat: l.type ? (cab ? '' : 'att') : 'att', titre: brins || (l.type ? 'Inconnu de la base des câbles' : 'Sans type') }),
    tuile('Gauge', jauge != null ? jauge + ' <i>AWG</i>' : '—'),
    tuile('Longueur', `${saisie('data-edit="longueur"', L != null ? nombre(arrondi(L, 3)) : '', { ph: nombre(H.longueur), label: 'Longueur en mètres', mode: 'decimal', court: true })}<i>m</i>${orig('longueur') || hyp}${retour('longueur')}`, { edit: true }),
    tuile('Intensité', x.fn ? esc(amperes(rT != null && rT > x.I / x.continu ? x.pointe.i : x.I)) : '—', { etat: x.trop.length ? 'ko' : '' })];
  const routes = [...couleursDesRoutes().keys()].filter(Boolean);
  const datalists = datalistCables() + `<datalist id="fi-routes">${routes.map(r => `<option value="${escA(r)}"></option>`).join('')}</datalist>`;
  /* DE → VERS : deux cartes ; un clic ouvre l'équipement, le connecteur, le contact allumé ; le contact de chaque bout */
  const cts = {};
  const bout = (cote, sens) => { const rep = l[cote], borne = cote === 'de' ? l.borneDe : l.borneVers, s = st[cote], g = rep && !estMasse(rep) && !estDisjoncteur(rep) ? connecteurParBorne(rep, liaisonsDeRepere(rep)).get(String(borne)) : null;
    const ct = neuf ? null : contactAuBout(l, rep, borne); cts[cote] = ct;
    return `<div class="fi-bout${s && s.ko ? ' ko' : ''}"><button type="button" class="fi-bout-va" data-bout="${cote}" title="${escA('Ouvrir ' + rep + (g ? ', connecteur ' + g.nom : '') + ', le contact allumé')}"><span class="fi-bout-k">${sens}</span><span class="fi-bout-rep"><b>${esc(rep || '—')}</b>${borne ? `<span>:${esc(borne)}</span>` : ''}</span>`
      + `${g ? `<small>Connecteur ${esc(g.nom)}${ct && ct.lettre && ct.lettre !== String(borne).replace(/^[A-Z]{1,2}(?=\d)/, '') ? ' · contact ' + esc(ct.lettre) : ''}</small>` : estMasse(rep) ? '<small>Masse</small>' : ''}${ico('droite', 'fi-bout-fl')}</button>`
      + (s && s.ko && !ct ? '<small class="fi-bout-ko">Aucun contact pour ce câble</small>' : ct ? boutonContact(ct, 'fi-bout-ct') : '') + '</div>'; };
  const passe = [via('de'), via('vers')].filter(Boolean);
  const choixCt = ['de', 'vers'].map(k => cts[k] && FI.liste === 'sertir:' + cts[k].ks ? choixSertir(cts[k].ks, cts[k].plan, { type: l.type }, cts[k].st) : '').join('');
  const trajet = `<div class="fi-trajet" style="--c:${coul}">${bout('de', 'De')}<span class="fi-fleche" aria-hidden="true"></span>${bout('vers', 'Vers')}</div>${choixCt}${passe.length ? `<p class="fi-note">Passe par ${esc(passe.join(' · '))} — barrette à poser</p>` : ''}`
    + (neuf ? '' : champs([ligneChamp('Route', `${l.route ? `<i class="fi-route" style="--c:${coul}"></i>` : ''}${saisie('data-edit="route"', l.route, { ph: 'aucune', label: 'Route', liste: 'fi-routes' })}`, { origine: orig('route'), auto: retour('route') })]));
  /* L'INTENSITÉ ET LA CHUTE : une ligne chacune, une barre contre l'admis */
  const r = ligneDeFil({ l, vers: l.vers, borneVers: l.borneVers }), pointeTrop = rT != null && rT > 1 + 1e-9;
  const mesure = (k, q, sous, barre, etat, v, bulle) => `<div class="fi-mes ${etat || ''}"${bulle ? ` data-bulle="${escA(bulle)}"` : ''}><span class="fi-mes-k"><span>${k}${q}</span>${sous ? `<small>${sous}</small>` : ''}</span><span class="fi-barre ${etat || ''}" aria-hidden="true"><i style="width:${(Math.min(1, barre || 0) * 100).toFixed(1)}%"></i></span><span class="fi-mes-v">${v}</span></div>`;
  const source = x.al ? `<button type="button" class="fi-lien" data-choisir-bloc="${escA(x.al.nom)}" title="${escA('Son disjoncteur : ' + x.al.nom + ' — son profil de charge')}">sous ${esc(x.al.nom)}</button>` : motHypothese;
  const bulleI = r.bulle.split('\n').filter(t => !/^chute/.test(t)).slice(1).join('\n'), bulleU = ch.total ? `En ligne depuis ${x.al.nom} jusqu’à ${ch.total.bout[0]} : ${volts(ch.total.dU)}${ch.max != null ? ' (' + volts(ch.max) + ' admis)' : ''}\nSur ce câble : ${volts(ch.dU)} (${nombre(arrondi(ch.L, 2))} m${ch.hyp ? ' d’hypothèse' : ''})` : ch.dU != null ? `Sur ce câble : ${volts(ch.dU)} = ${nombre(arrondi(x.rd.rho, 1))} Ω/km × ${nombre(arrondi(ch.L, 2))} m × ${nombre(arrondi(x.I, 2))} A` : 'La résistance du câble est inconnue';
  const intens = !x.fn ? `<p class="fi-note">${l.type ? 'Hors de l’EN 2853 : ce qu’il admet ne se lit pas.' : 'Sans type, ce qu’il admet ne se lit pas.'}</p>`
    : mesure('Intensité', aide('intensite', { type: l.type, admis: x.continu, base: x.fn.intensite, facteur: x.fac }), source, r.charge.r, r.charge.etat, rT != null && rT > x.I / x.continu ? `<b>${esc(amperes(x.pointe.i))}</b> / ${esc(amperes(x.pointe.admis))} <em class="${pointeTrop ? 'fi-ko-t' : ''}">pointe</em>` : `<b>${esc(amperes(x.I))}</b> / ${esc(amperes(x.continu))}`, bulleI);
  const chute = mesure('Chute', aide('chute', ch.total ? { chemin: { ...ch.total, admis: ch.max, regle: ch.regle } } : { dU: ch.dU, admis: ch.max, regle: ch.regle }), ch.total ? 'en ligne' : 'sur ce câble', ch.total && ch.max ? ch.total.dU / ch.max : 0, ch.total ? r.chute.etat : '', ch.total ? `<b>${esc(volts(ch.total.dU))}</b>${ch.max != null ? ' / ' + esc(volts(ch.max)) : ''}` : `<b>${esc(volts(ch.dU))}</b>`, bulleU);
  const resumeI = !x.fn ? 'ce qu’il admet ne se lit pas' : `${x.trop.length ? `<span class="fi-ko-t">${esc(r.charge.mot)}</span>` : esc(r.charge.mot)} · ${esc(volts(ch.total ? ch.total.dU : ch.dU))}`;
  const sections = [{ cle: 'trajet', resume: esc(`${l.de}${l.borneDe ? ':' + l.borneDe : ''} → ${l.vers}${l.borneVers ? ':' + l.borneVers : ''}`), badge: badgeProblemes(probs, 'trajet'), contenu: trajet },
    { cle: 'fils', titre: 'Intensité et chute', resume: insecable(resumeI), badge: badgeProblemes(probs, 'fils') || (x.fn ? { t: '✓', etat: 'ok' } : { t: '—', etat: '' }), contenu: `<div class="fi-mesures">${intens}${chute}</div>` }];
  return enTete({ type: 'fil', genre: 'Câble', nom: neuf ? 'à créer' : (l.cable || 'sans numéro'), champ: neuf ? '' : 'fil-num', aide: 'Numéro du câble — écrire pour le changer', tuiles, coul })
    + barreProblemes(probs, sections) + ficheSections('fil', sections) + datalists + fiPied(neuf ? { voir: l.aPoser } : { tableau: l.cable || l.de, menu: MENU_FIL }); }

/* ---- LE PIED ---------------------------------------------------------------------------------------------------------- */
/* Le récapitulatif (filtré sur l'objet), « + câble » (une liaison de plus depuis ce repère), le relief, « voir », et sous
   « ··· » ce qu'on fait rarement. Collé en bas, toujours en vue. */
function fiPied(o) { o = o || {};
  const boutons = [o.tableau != null ? `<button type="button" class="fi-bouton" id="fi-tableau" data-filtre="${escA(o.tableau)}" title="Ses liaisons dans le récapitulatif">${ico('tableau')}<span>Récapitulatif</span></button>` : '',
    o.fil ? `<button type="button" class="fi-bouton" id="fi-fil-plus" data-de="${escA(o.fil)}" title="Ajouter un câble depuis ${escA(o.fil)} : une ligne de plus dans le récapitulatif, à remplir">${ico('plus')}<span>Câble</span></button>` : '',
    o.relief ? `<button type="button" class="fi-bouton" id="eq-relief" title="La pièce en perspective (ou double-clic sur le bloc)">${ico('relief')}<span>Relief</span></button>` : '',
    o.voir ? `<button type="button" class="fi-bouton" data-choisir-bloc="${escA(o.voir)}">${ico('voir')}<span>${esc(o.voir)}</span></button>` : ''].join('');
  const menu = (o.menu || []).map(([id, t, cls]) => `<button type="button" role="menuitem" id="${id}"${cls ? ` class="${cls}"` : ''}>${esc(t)}</button>`).join('');
  return `<footer class="fi-pied">${boutons}<span class="espace"></span>${menu ? `<div class="fi-plus"><button type="button" class="fi-x" id="fi-menu" aria-haspopup="true" aria-expanded="false" aria-label="Plus d’actions" title="Renommer, désigner, supprimer…">${ico('points')}</button><div class="fi-menu" id="fi-menu-liste" role="menu" hidden>${menu}</div></div>` : ''}</footer>`; }
const MENU_BLOC = [['fi-renommer', 'Renommer'], ['fi-designer', 'Désignation'], ['eq-del', 'Supprimer', 'danger']];
const MENU_FIL = [['fil-tableau', 'Voir dans le récapitulatif'], ['fil-del', 'Supprimer ce câble', 'danger']];

/* ---- LE RENDU ----------------------------------------------------------------------------------------------------------- */
// ce qui identifie un bouton de la fiche d'un rendu à l'autre : ses données et son identifiant (pas son texte, qui change)
const empreinteBouton = b => b.id + '|' + JSON.stringify(Object.entries(b.dataset).sort());
function ficheBloc(nom) {
  if (VT_A_POSER.test(nom) || barretteEnModules(nom)) return ficheBarrette(nom);
  if (coupureEnModules(nom)) return ficheCoupure(nom);
  if (estMasse(nom)) return ficheMasse(nom);
  if (estBornier(nom)) return ficheBornierAncien(nom);
  return ficheEquipement(nom); }
// la fiche d'une cible, en HTML (sans la barre), et le nom que la barre écrit quand l'en-tête passe dessous
const ficheDe = c => c.type === 'fil' ? ficheFil(c.l) : c.type === 'ref' ? ficheComparaison(c) : ficheBloc(c.nom);
const nomDeCible = c => c.type === 'fil' ? (c.l.cable || (c.l.origine === null ? 'câble à créer' : 'câble')) : c.type === 'ref' ? 'Déjà fait · ' + c.harness : c.nom;
// ce qu'un rendu garde le temps de se faire : les intensités, les plans, les raccords
const viderCalculs = () => { CALCULS.clear(); PLANS.clear(); HABILLAGES.clear(); remettreAides(); };
/* LA FICHE dans l'inspecteur : la barre, puis l'objet. La même fiche refaite (un choix cliqué) garde son défilement, ses
   sections ouvertes, et le bouton pressé garde le focus ; une autre fiche entre en fondu — ou, si l'on y revient (‹ ›),
   à la place qu'on y avait. */
function rendreFiche() { const box = $('ba-equip'), c = app.cible; if ($('inspecteur').hidden) return; viderCalculs(); cacherBulle(); fermerAide();
  const I = pileInsp(), montree = I.pile.find(x => cleDEntree(x) === box.dataset.cle);
  if (montree) memoriserEntree(montree, box);
  if (!c) { FI.liste = ''; delete box.dataset.type; if (typeof rendreIndex === 'function') rendreIndex(box); else { box.innerHTML = ''; box.dataset.cle = ''; } return; }
  // la pile : empiler (depuis la fiche), revenir (‹ ›), sinon remplacer le haut (le plan, l'index)
  const e = entreeDeCible(c), cur = I.pile[I.pos] || null; let restaurer = null;
  if (!memeEntree(cur, e)) {
    if (NAV.mode === 'histoire') { /* un rendu intermédiaire (le folio change) : la pile ne bouge pas */ }
    else { if (NAV.mode === 'empiler' && cur) { I.pile.splice(I.pos + 1); I.pile.push(e); } else I.pile.splice(Math.max(0, I.pos), I.pile.length, e);
      if (I.pile.length > PILE_MAX) I.pile.splice(0, I.pile.length - PILE_MAX); I.pos = I.pile.length - 1; } }
  else if (NAV.mode === 'histoire') restaurer = cur;
  const entree = I.pile[I.pos] && memeEntree(I.pile[I.pos], e) ? I.pile[I.pos] : null, but = NAV.but && memeEntree(NAV.but.e, e) ? NAV.but : null;
  const cle = entree ? cleDEntree(entree) : cleDEntree(e), meme = box.dataset.cle === cle;
  if (!meme) { FI.liste = ''; FI.choisi = ''; }
  if (c.type === 'bloc' && restaurer && restaurer.connecteur != null) FI.connecteur[c.nom] = restaurer.connecteur;
  if (c.type === 'bloc' && but && but.connecteur) FI.connecteur[c.nom] = but.connecteur;
  FI.viser = but && but.viser || '';
  let html; try { html = ficheDe(c); }
  catch (err) { html = enTete({ type: 'equipement', genre: 'Élément', nom: c.nom || (c.l && c.l.cable) || '—' }) + `<p class="fi-note">${esc(String(err && err.message || err))}</p>`; }
  const nav = barreNav({ fermer: c.type !== 'ref', nom: nomDeCible(c) });
  const haut = box.scrollTop, a = document.activeElement, presse = meme && a && a.tagName === 'BUTTON' && box.contains(a) ? empreinteBouton(a) : null;
  box.innerHTML = nav + html; box.dataset.cle = cle; box.className = 'fi'; box.dataset.type = c.type;
  // les sections ouvertes et le défilement : ceux qu'on avait (la même fiche, un retour), sinon ceux de la mémoire, en haut
  const etat = (meme || restaurer) && entree && entree.sections; if (etat) box.querySelectorAll('details.fs').forEach(d => { if (d.dataset.section in etat && !d.classList.contains('fs-clos')) d.open = etat[d.dataset.section]; });
  const pbs = $('fi-pbs'); if (pbs && FI.pbs === cle) pbs.open = true;
  if (meme) box.scrollTop = haut; else if (restaurer) box.scrollTop = restaurer.haut || 0; else { box.scrollTop = 0; box.classList.remove('fondu'); void box.offsetWidth; box.classList.add('fondu'); }
  if (c.type === 'ref') { lierComparaison(c); lierNav(box); const r = $('cp-retour'); if (r) r.onclick = () => naviguer(-1); } else lierFiche(c);
  if (presse) { const b = [...box.querySelectorAll('button')].find(x => empreinteBouton(x) === presse); if (b) { try { b.focus({ preventScroll: true }); } catch (_) { b.focus(); } } }
  // ce que l'ouverture demandait : une section, une ligne allumée
  if (but) { const d = but.section ? ouvrirSection(box, but.section) : null;
    if (but.viser) { const li = box.querySelector(`[data-i="${CSS.escape(but.viser)}"]:not(.mj-contact)`); if (li) { const sec = li.closest('details.fs'); if (sec) sec.open = true; box.querySelectorAll(`[data-i="${CSS.escape(but.viser)}"]`).forEach(x => x.classList.add('vise')); try { li.scrollIntoView({ block: 'center' }); } catch (_) { } } else if (d) d.scrollIntoView({ block: 'start' }); } }
  FI.viser = ''; suivreDefilement(box); }
/* REFAIRE EN PLACE la fiche montrée quand on écrit dans un de ses champs (le profil d'un disjoncteur, la désignation…) :
   la fiche se recalcule, et chaque morceau qui ne porte pas le champ sous les doigts est remplacé ; celui qui le porte
   garde son élément (et sa saisie), ses voisins suivent. Les sections restent comme l'ingénieur les a laissées. */
function rafraichirFicheEnPlace() { const box = $('ba-equip'), c = app.cible; if (!c || c.type === 'ref' || $('inspecteur').hidden || !box.dataset.type) return false;
  viderCalculs(); let html; try { html = barreNav({ fermer: true, nom: nomDeCible(c) }) + ficheDe(c); } catch (_) { return false; }
  const t = document.createElement('template'); t.innerHTML = html;
  const ouvertes = {}; box.querySelectorAll('details.fs').forEach(d => { ouvertes[d.dataset.section] = d.open; }); const pbs = $('fi-pbs'), pbsOuvert = !!(pbs && pbs.open);
  const haut = box.scrollTop, cleDe = el => el.tagName === 'DETAILS' && el.dataset.section ? 'fs:' + el.dataset.section : (el.id || String(el.className).split(' ')[0]);
  const vieux = new Map([...box.children].map(el => [cleDe(el), el])), a = document.activeElement; let prec = null;
  [...t.content.children].forEach(n => { const v = vieux.get(cleDe(n)); vieux.delete(cleDe(n));
    if (v) { greffer(v, n); const el = v.isConnected ? v : n; prec = el; }
    else { if (prec) prec.after(n); else box.prepend(n); prec = n; } });
  vieux.forEach(v => { if (!v.contains(a)) v.remove(); });
  box.querySelectorAll('details.fs').forEach(d => { if (d.dataset.section in ouvertes && !d.classList.contains('fs-clos')) d.open = ouvertes[d.dataset.section]; });
  const pb2 = $('fi-pbs'); if (pb2) pb2.open = pbsOuvert;
  box.scrollTop = haut; lierFiche(c); suivreDefilement(box); return true; }
/* Greffer le neuf sur le vieux : ce qui ne porte pas le champ sous les doigts est remplacé (s'il a changé) ; ce qui le
   porte garde son élément, prend les attributs du neuf, et l'on descend dans ses enfants. */
function greffer(vieux, neuf) { const a = document.activeElement;
  if (!vieux.contains(a)) { if (!vieux.isEqualNode(neuf)) vieux.replaceWith(neuf); return; }
  if (vieux === a || vieux.tagName !== neuf.tagName) return;
  [...neuf.attributes].forEach(x => { if (x.name !== 'open' && x.name !== 'value' && vieux.getAttribute(x.name) !== x.value) vieux.setAttribute(x.name, x.value); });
  const V = [...vieux.children], N = [...neuf.children]; if (V.length !== N.length) return;
  V.forEach((v, i) => greffer(v, N[i])); }
/* La barre écrit le repère quand l'en-tête passe dessous. */
function suivreDefilement(box) { const maj = () => { const n = box.querySelector('.fi-nom-ligne'), nav = box.querySelector('.fi-nav'); box.classList.toggle('defile', !!n && !!nav && n.offsetTop + n.offsetHeight - box.scrollTop < nav.offsetHeight); };
  if (!box.dataset.defile) { box.dataset.defile = '1'; box.addEventListener('scroll', () => { if (box.dataset.type) maj(); else box.classList.remove('defile'); }, { passive: true }); }
  maj(); }

/* ---- LA BULLE : le pourquoi, au survol ------------------------------------------------------------------------------ */
/* Ce qui porte `data-bulle` (une ligne de câble, une pièce, une ligne des problèmes, un contact d'une face) dit, au
   survol, ce qu'il y a derrière ses chiffres : sur la feuille flottante, sous l'élément (au-dessus s'il n'y a pas la
   place), jamais coupée par le bord. Pas sur ce qu'on écrit (un champ, une puce de contact) : la main y travaille. */
const BULLE = { el: null, t: 0, cible: null };
function cacherBulle() { clearTimeout(BULLE.t); BULLE.cible = null; if (BULLE.el) BULLE.el.hidden = true; }
function montrerBulle(c) { if (!c.isConnected) return; const txt = c.dataset.bulle; if (!txt) return;
  if (!BULLE.el) { BULLE.el = document.createElement('div'); BULLE.el.className = 'fi-bulle'; BULLE.el.setAttribute('role', 'tooltip'); document.body.appendChild(BULLE.el); }
  const b = BULLE.el; b.textContent = txt; b.hidden = false; const r = c.getBoundingClientRect(), w = b.offsetWidth, h = b.offsetHeight, W = window.innerWidth, H = window.innerHeight;
  const x = Math.max(8, Math.min(r.left + 8, W - w - 8)), y = r.bottom + 6 + h <= H - 8 ? r.bottom + 6 : Math.max(8, r.top - 6 - h);
  b.style.left = x + 'px'; b.style.top = y + 'px'; }
function lierBulles(box) { if (box.dataset.bulles) return; box.dataset.bulles = '1';
  box.addEventListener('mouseover', e => { const t = e.target && e.target.closest ? e.target : null; if (t && t.closest('.fi-cab-ed, .fi-q, input, select')) { cacherBulle(); return; }
    const c = t ? t.closest('[data-bulle]') : null; if (c === BULLE.cible) return; cacherBulle(); if (!c || !box.contains(c)) return;
    BULLE.cible = c; BULLE.t = setTimeout(() => montrerBulle(c), 260); });
  // la fiche qui défile emporte la bulle montrée (celle qui attend encore se posera où est son élément)
  box.addEventListener('mouseleave', cacherBulle); box.addEventListener('scroll', () => { if (BULLE.el && !BULLE.el.hidden) cacherBulle(); }, { passive: true }); box.addEventListener('pointerdown', cacherBulle); }

/* ---- LES GESTES ----------------------------------------------------------------------------------------------------- */
/* Un écouteur posé une fois par élément : un rendu en place (`rafraichirFicheEnPlace`) relie la fiche sans doubler ceux
   des champs qu'il a gardés. */
const ECOUTES = new WeakMap();
const ecouter = (el, type, fn) => { const s = ECOUTES.get(el) || new Set(); if (s.has(type)) return; s.add(type); ECOUTES.set(el, s); el.addEventListener(type, fn); };
/* La barre : ‹ ›, × */
function lierNav(box) {
  const p = $('fi-prec'), s = $('fi-suiv'); if (p) p.onclick = () => naviguer(-1); if (s) s.onclick = () => naviguer(1);
  const x = $('in-fermer'); if (x) x.onclick = () => deselectionner(); }
/* Retenir un autre choix (un arrangement, une variante, une norme) ou rendre le calcul : une entrée d'historique, le
   plan et le contrôle suivent. */
const choisirDesignation = (cle, d, quoi, mot) => { histPush(quoi); designer(cle, d); apresEdition(); if (mot) dire(mot); };
/* « ↺ » : chaque genre de valeur a son retour au calcul. `b` : le bouton (sa clé `data-auto`, sa ligne `data-k`). */
function retourAutomatique(b, c) { const cle = b.dataset.auto, k = cle.indexOf(':'), genre = cle.slice(0, k), v = cle.slice(k + 1);
  if (genre === 'arr') { FI.liste = ''; choisirDesignation(v, '', 'choix automatique de ' + v, 'Choix automatique rétabli.'); return; }
  if (genre === 'sexe') { histPush('sexe automatique de ' + v); app.contrat.sexes.delete(v); apresEdition(); return; }
  if (genre === 'nature') { histPush('nature de ' + v); designer(CLE_NATURE(v), ''); apresEdition(); return; }
  if (genre === 'sertir') { const { rep, borne } = deCleSertir(v); FI.liste = ''; histPush('contact à sertir automatique'); app.contrat.designations.delete(v);
    boutsSur(rep, borne).forEach(([l, ch]) => { delete l[ch]; if (l.avant && ch in l.avant) { const av = { ...l.avant }; delete av[ch]; if (Object.keys(av).length) l.avant = av; else delete l.avant; } }); apresEdition(); return; }
  if (genre === 'rac') { const o = { ...(app.contrat.raccords.get(v) || {}) }; if (!o.designation) return; histPush('désignation automatique du raccord'); delete o.designation;
    if (Object.keys(o).length) app.contrat.raccords.set(v, o); else app.contrat.raccords.delete(v); apresEdition(); return; }
  if (genre === 'pn') { const nom = c.type === 'bloc' ? c.nom : '', conn = v; const C = connecteursDe(nom, verite()).find(x => x.nom === conn), bornes = conn === '*' ? '*' : C ? C.bornes : nom === conn ? besoinsDeBarrette(nom, verite()).bornes : [];
    rendreChamps(liaisonsDuConnecteur(nom, bornes), 'part number du fichier pour ' + nom); return; }
  if (genre === 'cable') { const l = liaisonDeCle(b.dataset.k); if (l) rendreChamp(sourceDe(l) || l, v); return; }
  if (genre === 'champ' && c.type === 'fil') { rendreChamp(c.l, v); } }
/* Écrire un champ d'un câble (numéro, type, route, longueur) : la liaison change, l'origine passe à « main ». */
function ecrireChampFil(l, champ, brut) { if (!l) return; let v = String(brut == null ? '' : brut).trim();
  if (champ === 'longueur') { if (!v) { changerLiaison(l, 'longueur', null, 'longueur de ' + (l.cable || 'câble')); return; } const x = nombreEcrit(v); if (!(x > 0)) { dire('Une longueur en mètres, plus grande que zéro.', true); rendreFiche(); return; } v = x; }
  if (champ === 'type') v = v.toUpperCase();
  changerLiaison(l, champ, v === '' ? null : v, ({ cable: 'numéro', type: 'type', route: 'route', longueur: 'longueur', plan: 'folio' }[champ] || champ) + ' de ' + (l.cable || 'câble')); }
/* Renommer un repère d'ici : chaque câble suit, la pile aussi (‹ ramène au nouveau nom). Une barrette à poser se POSE. */
function renommerDepuisFiche(nom, nr) { nr = String(nr || '').trim(); if (!nr || nr === nom) return false;
  if (VT_A_POSER.test(nom)) { const xs = pileInsp().pile.filter(e => e.type === 'bloc' && e.nom === nom), box = $('ba-equip'), avant = box.dataset.cle;
    xs.forEach(e => { e.nom = nr; e.ancien = nom; }); if (avant === 'bloc|' + nom) box.dataset.cle = 'bloc|' + nr;
    const ok = poserBarrette(nom, nr); if (!ok) { xs.forEach(e => { e.nom = nom; delete e.ancien; }); box.dataset.cle = avant; } return ok; }
  if (verite().some(l => l.de === nr || l.vers === nr)) { dire(nr + ' existe déjà au contrat : choisis un autre repère.', true); return false; }
  histPush('renommage de ' + nom); renommer(nom, nr); pileInsp().pile.forEach(e => { if (e.type === 'bloc' && e.nom === nom) { e.nom = nr; e.ancien = nom; } });
  // les choix faits sur la fiche suivent le repère : l'arrangement d'un connecteur (« repère|A »), l'emplacement, le contact à sertir d'une borne
  const D = app.contrat.designations; [...D.keys()].forEach(k => { const n = k.startsWith(nom + '|') ? nr + k.slice(nom.length) : k.startsWith('sertir|' + nom + '|') ? 'sertir|' + nr + k.slice(7 + nom.length) : null; if (n) { D.set(n, D.get(k)); D.delete(k); } });
  if (FI.connecteur[nom] != null) FI.connecteur[nr] = FI.connecteur[nom];
  const box = $('ba-equip'); if (box.dataset.cle === 'bloc|' + nom) box.dataset.cle = 'bloc|' + nr;   // la même fiche, sous son nouveau nom : elle garde sa place
  app.choisi = nr; app.cible = { type: 'bloc', nom: nr }; if (app.base.filtre === nom) app.base.filtre = nr; apresEdition(); return true; }
/* Aller à une section d'un lien (une ligne des problèmes) : le connecteur qu'il nomme, la section ouverte et allumée, la
   ligne qu'il vise allumée. */
function allerDansLaFiche(box, nom, section, o) { o = o || {};
  if (o.connecteur && nom && FI.connecteur[nom] !== o.connecteur) { FI.connecteur[nom] = o.connecteur; FI.liste = ''; rendreFiche(); }
  const d = ouvrirSection(box, section); if (d && o.viser) { box.querySelectorAll('.vise').forEach(x => x.classList.remove('vise')); const li = d.querySelector(`[data-i="${CSS.escape(o.viser)}"]:not(.mj-contact)`); if (li) { li.classList.add('vise'); try { li.scrollIntoView({ block: 'center', behavior: mouvementReduit() ? 'auto' : 'smooth' }); } catch (_) { } } } }
function lierFiche(c) { const box = $('ba-equip'), nom = c.type === 'fil' ? '' : c.nom, l = c.type === 'fil' ? c.l : null;
  lierNav(box); lierBulles(box);
  // le récapitulatif de l'objet : son onglet (08-recap, `recapitulatifDe`), filtré sur lui — une masse, ses câbles dans Liaisons
  const tab = $('fi-tableau'); if (tab) tab.onclick = () => recapitulatifDe(c.type === 'bloc' && estMasse(c.nom) ? { type: 'fil', l: { cable: c.nom } } : c);
  // l'en-tête : le crayon (ou F2) met le repère sous les doigts
  const crayon = $('fi-crayon'), champNom = $('eq-rep') || $('fil-num'); if (crayon && champNom) crayon.onclick = () => { champNom.focus(); champNom.select(); };
  // la barre des problèmes : dépliée, elle le reste pour cette fiche ; une ligne mène à la section qui le démontre
  const pbs = $('fi-pbs'); if (pbs) ecouter(pbs, 'toggle', () => { FI.pbs = pbs.open ? box.dataset.cle : ''; });
  box.querySelectorAll('[data-voir]').forEach(b => b.onclick = () => allerDansLaFiche(box, nom, b.dataset.voir, { connecteur: b.dataset.connecteur, viser: b.dataset.viser }));
  // les segments de connecteur, la face d'un connecteur, la face d'une prise, « Changer » : la fiche se refait en place
  box.querySelectorAll('.seg[data-connecteur]').forEach(b => b.onclick = () => { FI.connecteur[nom] = b.dataset.connecteur; FI.liste = ''; rendreFiche(); });
  box.querySelectorAll('[data-face]').forEach(b => b.onclick = () => { const k = b.dataset.face; FI.face[k] = !FI.face[k]; rendreFiche(); });
  box.querySelectorAll('[data-voir-face]').forEach(b => b.onclick = () => { FI.face[nom] = b.dataset.voirFace; rendreFiche(); });
  box.querySelectorAll('[data-gal-famille]').forEach(b => b.onclick = () => { FI.galerie[nom] = b.dataset.galFamille; rendreFiche(); });
  box.querySelectorAll('[data-changer]').forEach(b => b.onclick = () => { const k = b.dataset.changer; FI.liste = FI.liste === k ? '' : k; rendreFiche();
    const v = box.querySelector(`[data-volet="${CSS.escape(k)}"]`); if (v) { const f = v.querySelector('[data-filtre-liste]'); try { v.scrollIntoView({ block: 'nearest' }); } catch (_) { } if (f) f.focus(); } });
  box.querySelectorAll('[data-sertir]').forEach(b => b.onclick = e => { e.stopPropagation(); const k = 'sertir:' + b.dataset.sertir; FI.liste = FI.liste === k ? '' : k; rendreFiche(); });
  box.querySelectorAll('[data-filtre-liste]').forEach(f => ecouter(f, 'input', () => { const q = f.value.trim().toLowerCase(); f.closest('.fi-choix').querySelectorAll('.cand, .fi-chip').forEach(x => { x.hidden = !!q && !x.textContent.toLowerCase().includes(q); }); }));
  // le menu « ··· »
  const menu = $('fi-menu'), liste = $('fi-menu-liste');
  if (menu) { const ouvrir = o => { liste.hidden = !o; menu.setAttribute('aria-expanded', String(o)); };
    menu.onclick = e => { e.stopPropagation(); ouvrir(liste.hidden); }; liste.onclick = () => ouvrir(false); }
  // un champ : Entrée l'applique, Échap le rend tel qu'il était
  box.querySelectorAll('input').forEach(el => ecouter(el, 'keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (!el.matches('[data-filtre-liste]')) el.blur(); }
    else if (e.key === 'Escape') { e.stopPropagation(); if (el.matches('[data-filtre-liste]')) { FI.liste = ''; rendreFiche(); return; } el.value = el.defaultValue; el.blur(); } }));
  lierFils(box);
  const plus = $('fi-fil-plus'); if (plus) plus.onclick = () => { if (!app.base.ouvert) ouvrirBase(); ajouterLiaison(plus.dataset.de); dire(plus.dataset.de + ' : un câble de plus — écris « vers » dans le récapitulatif.'); };
  box.querySelectorAll('[data-choisir-bloc]').forEach(b => b.onclick = () => allerAuBloc(b.dataset.choisirBloc, /CB/.test(codeDe(b.dataset.choisirBloc)) ? { section: 'disjoncteur' } : null));
  box.querySelectorAll('[data-hyp]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); ficheHypotheses(); });
  box.querySelectorAll('[data-action]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); const a = b.dataset.action;
    if (a === 'normes') ficheNormes(); else if (a === 'references') { const m = document.querySelector('#menu [data-act="references"]'); if (m) m.click(); else ficheBible(''); } });
  box.querySelectorAll('[data-auto]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); retourAutomatique(b, c); });
  box.querySelectorAll('[data-bible]').forEach(b => b.onclick = () => ficheBible(b.dataset.bible));
  // les câbles d'une fiche : le numéro ouvre sa fiche ; le type et la longueur s'écrivent dans la ligne
  box.querySelectorAll('[data-ouvrir-cable]').forEach(b => b.onclick = e => { e.stopPropagation(); const x = liaisonDeCle(b.dataset.ouvrirCable); if (x) allerAuFil(sourceDe(x) || x); });
  box.querySelectorAll('[data-cable][data-champ]').forEach(el => ecouter(el, 'change', () => { const x = liaisonDeCle(el.dataset.cable); if (x) ecrireChampFil(sourceDe(x) || x, el.dataset.champ, el.value); }));
  // la liaison du câble : numéro, type, route, longueur ; les deux bouts
  if (l) { box.querySelectorAll('[data-edit]').forEach(el => ecouter(el, 'change', () => ecrireChampFil(l, el.dataset.edit, el.value)));
    const num = $('fil-num'); if (num) ecouter(num, 'change', () => ecrireChampFil(l, 'cable', num.value));
    box.querySelectorAll('[data-bout]').forEach(b => b.onclick = () => { const cote = b.dataset.bout, rep = l[cote], borne = cote === 'de' ? l.borneDe : l.borneVers; if (!rep) return;
      const g = estMasse(rep) ? null : connecteurParBorne(rep, liaisonsDeRepere(rep)).get(String(borne)); allerAuBloc(rep, estMasse(rep) ? { section: 'fils', viser: cleFil(l) } : { connecteur: g ? g.nom : '', section: 'connecteur', viser: cleFil(l) }); });
    if ($('fil-tableau')) $('fil-tableau').onclick = () => recapitulatifDe(c);
    if ($('fil-del')) $('fil-del').onclick = () => { const i = verite().indexOf(l); if (i < 0 || !confirm('Supprimer le câble ' + (l.cable || '') + ' entre ' + l.de + ' et ' + l.vers + ' ?')) return; supprimerLiaison(i); deselectionner(); dire('Câble supprimé.'); }; }
  lierChoix(box, c);
  if (!nom) return;
  // le repère, dans l'en-tête ; le type et la désignation, à côté
  const rep = $('eq-rep'); if (rep) ecouter(rep, 'change', () => { if (!renommerDepuisFiche(nom, rep.value)) rep.value = nom; else { const r = $('fi-crayon'); if (r) r.focus(); } });
  const vtp = $('vt-poser'); if (vtp) vtp.onclick = () => { const v = $('vt-repere'); renommerDepuisFiche(nom, v ? v.value : ''); };
  const des = $('eq-des'); if (des) ecouter(des, 'change', () => { const v = des.value.trim(); if (v === (app.contrat.designations.get(nom) || '')) return; histPush('désignation de ' + nom); designer(nom, v); apresEdition(); });
  const nat = $('eq-nature'); if (nat) ecouter(nat, 'change', () => { const v = nat.value; if (typeof natureDite === 'function' && v === natureDite(nom)) return; histPush('nature de ' + nom); designer(CLE_NATURE(nom), v); apresEdition(); dire(nom + ' : ' + natureDe(nom) + (v ? ', dit à la main.' : ', comme le code le dit.')); });
  if ($('fi-renommer')) $('fi-renommer').onclick = () => { if (rep) { rep.focus(); rep.select(); } };
  if ($('fi-designer')) $('fi-designer').onclick = () => { const d = $('eq-des'); if (d) { d.focus(); d.select(); } };
  if ($('eq-del')) $('eq-del').onclick = () => { const n = verite().filter(x => x.de === nom || x.vers === nom).length; if (!confirm('Supprimer « ' + nom + ' » et ses ' + n + ' liaison(s) ?')) return;
    histPush('suppression de ' + nom); supprimerEquipement(nom); app.base.filtre = ''; deselectionner(); apresEdition(); dire(nom + ' supprimé.'); };
  if ($('eq-relief')) $('eq-relief').onclick = () => ouvrirRelief(nom);
  if (box.querySelector('.equip') && typeof lierCartePhysique === 'function') lierCartePhysique(nom);
  lierDisjonction(nom); }
// le menu « ··· » se ferme d'un appui ailleurs (un seul écouteur, pour toutes les fiches)
document.addEventListener('pointerdown', e => { const l = $('fi-menu-liste'), m = $('fi-menu'); if (!l || l.hidden || (e.target.closest && e.target.closest('.fi-plus'))) return; l.hidden = true; if (m) m.setAttribute('aria-expanded', 'false'); }, true);
/* Les choix : une norme, une variante, un arrangement, le sexe, le part number, le raccord, le contact à sertir, la
   désignation d'un raccord ; « Déjà fait » ouvre la comparaison (en empilant). */
function lierChoix(box, c) { const nom = c.type === 'bloc' ? c.nom : '';
  box.querySelectorAll('[data-norme-barrette]').forEach(b => b.onclick = () => choisirDesignation(nom, b.dataset.normeBarrette, 'norme de ' + nom));
  box.querySelectorAll('[data-norme-prise]').forEach(b => b.onclick = () => choisirDesignation(nom, b.dataset.normePrise, 'norme de ' + nom));
  box.querySelectorAll('.cand[data-cle]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return; FI.liste = ''; choisirDesignation(b.dataset.cle, b.dataset.ref, 'choix de ' + b.dataset.cle, b.dataset.ref + ' retenu.'); });
  box.querySelectorAll('[data-garder]').forEach(b => b.onclick = () => choisirDesignation(nom, b.dataset.garder, 'le retest pour ' + nom, b.dataset.garder + ' retenu, comme le retest.'));
  box.querySelectorAll('[data-sexe]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return; histPush('sexe des contacts de ' + b.dataset.sexe); app.contrat.sexes.set(b.dataset.sexe, b.dataset.v); apresEdition(); });
  box.querySelectorAll('[data-raccord]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return; const k = b.dataset.raccord, v = b.dataset.v;
    histPush('raccord de ' + k); const o = { ...(app.contrat.raccords.get(k) || {}) }; o[b.dataset.champ] = v === 'true' ? true : v === 'false' ? false : v; app.contrat.raccords.set(k, o); apresEdition(); });
  box.querySelectorAll('[data-rac-ref]').forEach(el => ecouter(el, 'change', () => { const k = el.dataset.racRef, v = el.value.trim(), o = { ...(app.contrat.raccords.get(k) || {}) }; if ((o.designation || '') === v || (!o.designation && v === el.defaultValue)) return;
    histPush('désignation du raccord de ' + k); if (v) o.designation = v; else delete o.designation; if (Object.keys(o).length) app.contrat.raccords.set(k, o); else app.contrat.raccords.delete(k); apresEdition(); }));
  box.querySelectorAll('[data-sertir-ref]').forEach(b => b.onclick = () => { const k = b.dataset.sertirRef; if (b.getAttribute('aria-pressed') === 'true') { FI.liste = ''; rendreFiche(); return; }
    const { rep, borne } = deCleSertir(k); FI.liste = ''; app.contrat.designations.delete(k); changerLiaisons(boutsSur(rep, borne).map(([l, ch]) => [l, ch, b.dataset.v]), 'contact à sertir'); });
  box.querySelectorAll('[data-pn]').forEach(el => ecouter(el, 'change', () => { const v = el.value.trim(), bornes = el.dataset.bornes === '*' ? '*' : JSON.parse(el.dataset.bornes), xs = liaisonsDuConnecteur(nom, bornes);
    if (!xs.length) return; changerLiaisons(xs.map(([x, ch]) => [x, ch, v]), 'part number de ' + nom + (el.dataset.pn === '*' ? '' : ' ' + el.dataset.pn)); }));
  box.querySelectorAll('.fi-cand[data-ref]').forEach(b => { const aller = () => allerA({ type: 'ref', c: { type: 'ref', nom, harness: b.dataset.ref, repere: b.dataset.rep, fwd: b.dataset.fwd || undefined } });
    b.onclick = aller; b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aller(); } }; }); }
/* Les câbles de la fiche et le plan : survoler une ligne (ou un contact d'une face) allume le câble sur le plan et marque
   tout ce qui le montre dans la fiche ; un clic sur une ligne (ou Entrée) ouvre la fiche du câble — en empilant : ‹
   ramène ici ; un clic sur un contact d'une face le CHOISIT (sa ligne reste allumée, vient sous les yeux), un double
   clic ouvre sa fiche. */
function lierFils(box) { let dernier = null;
  const cible = t => t && t.closest && t.closest('.fi-fil[data-i], .fi-ia[data-i], .fi-cote[data-i], .mj-contact.plein');
  const marquer = el => { const k = el.dataset.i; box.querySelectorAll('.vise').forEach(x => x.classList.remove('vise'));
    if (!k) return; box.querySelectorAll(`[data-i="${CSS.escape(k)}"]`).forEach(x => x.classList.add('vise')); allumerCle(k); };
  const lacher = () => { dernier = null; box.querySelectorAll('.vise').forEach(x => x.classList.remove('vise')); rallumer(); if (FI.choisi) allumerCle(FI.choisi); };
  const ouvrir = el => { const l = liaisonDeCle(el.dataset.i); if (l) allerAuFil(sourceDe(l) || l); };
  const choisir = k => { FI.choisi = FI.choisi === k ? '' : k; box.querySelectorAll('.choisi').forEach(x => x.classList.remove('choisi'));
    if (!FI.choisi) return; const xs = [...box.querySelectorAll(`[data-i="${CSS.escape(k)}"]`)]; xs.forEach(x => x.classList.add('choisi')); allumerCle(k);
    const li = xs.find(x => !x.matches('.mj-contact')); if (li) { const d = li.closest('details.fs'); if (d) d.open = true; try { li.scrollIntoView({ block: 'nearest', behavior: mouvementReduit() ? 'auto' : 'smooth' }); } catch (_) { } } };
  if (FI.choisi) box.querySelectorAll(`[data-i="${CSS.escape(FI.choisi)}"]`).forEach(x => x.classList.add('choisi'));
  box.onmouseover = e => { const el = cible(e.target); if (!el || el === dernier) return; dernier = el; marquer(el); };
  box.onmouseout = e => { if (!dernier) return; const vers = cible(e.relatedTarget); if (vers) return; lacher(); };
  box.onclick = e => { if (e.target.closest('button, input, select, a, .fi-choix, summary, .fi-cab-ed')) return; const el = cible(e.target); if (!el || !el.dataset.i) return; if (el.matches('.mj-contact')) choisir(el.dataset.i); else ouvrir(el); };
  box.ondblclick = e => { const el = e.target.closest && e.target.closest('.mj-contact.plein'); if (el && el.dataset.i) ouvrir(el); };
  box.onkeydown = e => { if (e.key === 'Escape' && FI.liste) { e.stopPropagation(); e.preventDefault(); FI.liste = ''; rendreFiche(); return; }
    const el = cible(e.target); if (el && (e.key === 'Enter' || e.key === ' ') && !e.target.matches('input, select, button')) { e.preventDefault(); ouvrir(el); } }; }
// un clic hors de la liste de choix ouverte la ferme — au clic, pas à l'appui : ce qu'on clique ne glisse pas sous le
// pointeur quand la liste disparaît (le clic garde sa cible) ; sans refaire la fiche
document.addEventListener('click', e => { if (!FI.liste) return; const t = e.target; if (!t || !t.closest) return;
  if (t.closest('.fi-choix, [data-changer], [data-sertir]')) return; const box = $('ba-equip'); if (!box || !box.contains(t)) return; FI.liste = '';
  box.querySelectorAll('.fi-choix-ligne, .fi-choix').forEach(x => x.remove()); box.querySelectorAll('[data-changer][aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false')); }, true);

/* ---- LE CLAVIER DE L'INSPECTEUR ------------------------------------------------------------------------------------ */
// Alt+← / Alt+→ : la fiche d'avant, d'après ; F2 : renommer ; Ctrl+Z (ou le bouton Annuler) défait sans fermer la fiche
document.addEventListener('keydown', e => { const insp = $('inspecteur'); if (!insp || insp.hidden) return;
  const champ = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '');
  if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !champ) { e.preventDefault(); naviguer(e.key === 'ArrowLeft' ? -1 : 1); return; }
  if (e.key === 'F2' && !champ && app.cible) { const r = $('eq-rep') || $('fil-num'); if (r) { e.preventDefault(); r.focus(); r.select(); } return; }
  if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'z' && !champ) garderLaFiche(); });
document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('#btnUndo')) garderLaFiche(); }, true);
/* Annuler rend le contrat d'avant et ferme la fiche (08, `annuler`) : on la rouvre sur le même objet s'il existe encore,
   à la même place. */
function garderLaFiche() { const I = pileInsp(), e = I.pile[I.pos], insp = $('inspecteur'); if (!e || !app.cible || insp.hidden || e.type === 'ref') return;
  const k = e.type === 'fil' ? verite().indexOf(e.l) : -1, box = $('ba-equip'); if (box.dataset.cle === cleDEntree(e)) memoriserEntree(e, box);
  setTimeout(() => { if (app.cible || $('inspecteur').hidden) return;
    if (e.type === 'fil') { const l = k >= 0 ? verite()[k] : null; if (!l) return; e.l = l; }
    else if (!repereVivant(e.nom)) { if (!(e.ancien && repereVivant(e.ancien))) return; e.nom = e.ancien; delete e.ancien; }   // un renommage défait : la fiche reprend l'ancien nom
    rouvrir(e, 'histoire'); }, 0); }
