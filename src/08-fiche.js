/* ===========================================================================
   08 bis — LA FICHE : ce qu'on voit quand on clique un équipement, un disjoncteur, une barrette, une prise, un fil
   ---------------------------------------------------------------------------
   Le lecteur : « dès qu'on clique sur un équipement, un disjoncteur, n'importe quoi, c'est le bordel : on ne sait pas
   où on va, on ne comprend pas le fil conducteur. Toujours la même chose : l'équipement, le connecteur, ses contacts,
   l'intensité dans les fils, la chute de tension, le connecteur avec toutes ses infos. Les problèmes : enroulés tout
   en haut, on clique si on veut. TOUT doit être modifiable, avec de quoi refaire le calcul automatique. »
   Chaque fiche a donc le MÊME squelette (08-sections.js), de haut en bas :
     · LA BARRE DE NAVIGATION, collée en haut : ‹ › (Alt+← / Alt+→) dans l'historique de l'inspecteur, le fil
       d'Ariane (Contrat › Folio › Repère › connecteur › Fil), chaque maillon cliquable, et ×. Ouvrir une fiche DEPUIS
       une fiche (un fil, un bout, un repère, un « déjà fait ») EMPILE ; un clic sur le plan ou dans l'index remplace le
       haut de la pile ; revenir rouvre la fiche aux mêmes sections, au même défilement. Le plan ne bouge que si
       l'objet est hors champ (et alors sans changer d'échelle) ;
     · L'EN-TÊTE : le symbole du type, le repère (le crayon, ou F2 : on le renomme partout), la ligne de nature, et
       la pastille des problèmes, REPLIÉE : un clic ouvre la section Problèmes et y descend ;
     · LES SECTIONS, dans l'ordre fixe : Identité, Connecteur(s), Contacts, Fils et intensité, Chute de tension,
       Habillage et raccords, Déjà fait, Le détail du calcul, Problèmes — fermées, elles se lisent encore (un résumé,
       une pastille) ; une section sans donnée garde sa place et dit ce qui manque, et où l'envoyer. Chaque problème
       est compté dans la pastille de la section qui le démontre ; « voir » y mène ;
     · LE PIED, collé en bas : le récapitulatif, « + fil », le relief, « ··· ».
   Chaque valeur porte son ORIGINE (auto, retest, main, hyp., norme) et se change sur place ; « ↺ automatique » rend
   le calcul. Ctrl+Z défait chaque geste, et la fiche reste ouverte sur son objet. Survoler un fil (une ligne, un
   contact de la face) l'allume sur le plan ; un clic ouvre sa fiche. Le disjoncteur ajoute ses propres sections
   (`sectionsDisjoncteur`, 08 quinquies) aux sections communes.
   =========================================================================== */
'use strict';

/* ---- l'état de la fiche, d'un rendu à l'autre ------------------------------------------------------------------- */
// connecteur : le connecteur montré de chaque repère ; tout : « tout montrer » des contacts ; liste : la liste de choix
// ouverte (sa clé) ; viser : la ligne à allumer au prochain rendu (un bout de fil qu'on vient de cliquer)
const FI = { connecteur: {}, tout: {}, liste: '', viser: '' };
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
  // l'idéal (une étoile au trait, pleine) et « pour toujours » (le lemniscate) : des icônes, pas des glyphes que les polices embarquées n'ont pas
  etoile: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill="currentColor"/>',
  infini: '<path d="M12 12c-2-2.6-3.6-4-5.5-4a4 4 0 0 0 0 8c1.9 0 3.5-1.4 5.5-4zm0 0c2 2.6 3.6 4 5.5 4a4 4 0 0 0 0-8c-1.9 0-3.5 1.4-5.5 4z"/>'
};
const ico = (k, cls) => `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[k]}</svg>`;
const coulDeFil = f => couleursDesRoutes().get((f.l && f.l.route) || '') || '#26323f';
// la route d'un fil en trait : sa couleur s'il en a une ; sans route, l'encre du thème (le #26323f ne vaut que sur papier)
const puceFil = f => f.l && f.l.route && couleursDesRoutes().has(f.l.route) ? `<i class="fi-puce" style="--c:${coulDeFil(f)}"></i>` : '<i class="fi-puce"></i>';
// un identifiant (part number, référence, type de câble) dans une phrase : en chasse fixe
const ident = (t, b) => `<${b ? 'b' : 'span'} class="id">${esc(t)}</${b ? 'b' : 'span'}>`;
const typesDe = fils => [...new Set(fils.map(f => f.type).filter(Boolean))].sort(triNaturel).join(', ');
/* La clé d'un fil dans la fiche : son rang dans le contrat — ou, pour un fil que l'outil ajoute (le fil à créer d'une
   barrette à poser), « p » et son rang dans le folio. Les lignes, les contacts de la face et le plan se la partagent. */
function cleFil(l) { const i = rangDe(l); if (i >= 0) return String(i); const p = liaisonsDuPlan().indexOf(l); return p >= 0 ? 'p' + p : ''; }
const filDeCle = k => !k || k === '-1' ? null : k[0] === 'p' ? ((app.dessin && app.dessin.fils) || []).find(w => w.i === +k.slice(1)) || null : filDe(verite()[+k]);
const liaisonDeCle = k => !k ? null : k[0] === 'p' ? liaisonsDuPlan()[+k.slice(1)] || null : verite()[+k] || null;
// le numéro d'un fil ; celui que l'outil ajoute (le raccord d'une barrette à poser) n'en a pas encore : « à créer »
const nomDuFil = f => f.cable || (f.l && f.l.origine === null ? 'à créer' : '—');
// le code du repère : « XC » pour 300XC1, « VT » pour une barrette (l'index et le contrôle s'en servent)
const codeDe = nom => { const q = lireRepere(nom); return q && q.code ? q.code.slice(0, 3) : String(nom || '?').slice(0, 2); };
const s_ = n => n > 1 ? 's' : '';
const mm = x => nombre(Math.round(x * 10) / 10);
const insecable = h => String(h).replace(/(\d) (A|V|mm²|mm|m|s|min|ms|h|AWG|%|g\/m|mΩ\/m|mΩ|Ω\/km)(?![\wé])/g, '$1 $2').replace(/(Ø) (\d)/g, '$1 $2').replace(/(jusqu’à|H|sans) (Ø|\d|raccord)/g, '$1 $2').replace(/ ([:;?!»])/g, ' $1').replace(/(«) /g, '$1 ');
/* Des faits, en grille : la clé en petit, la valeur en linéale, les identifiants en chasse fixe. rows : [[clé, html, titre?]] */
const faits = (rows, cls) => { const xs = rows.filter(r => r && r[1]); return xs.length ? `<dl class="fi-faits${cls ? ' ' + cls : ''}">${xs.map(([k, v, t]) => `<dt>${esc(k)}</dt><dd${t ? ` title="${escA(t)}"` : ''}>${insecable(v)}</dd>`).join('')}</dl>` : ''; };
const arrondi = (x, n) => x == null || !isFinite(x) ? null : Math.round(x * Math.pow(10, n)) / Math.pow(10, n);
const volts = u => u == null ? '—' : nombre(arrondi(u, u < 0.1 ? 3 : 2)) + ' V';
const candidat = (cle, m, retenu) => `<button class="cand" data-cle="${escA(cle)}" data-ref="${escA(m.reference)}" aria-pressed="${m.reference === retenu}">${pictoModule(m)}<b>${esc(m.variante)}</b><span>${insecable(esc(resumeModule(m)))}</span></button>`;
const puces = (attr, items, actif) => `<div class="fi-puces">${items.map(([f, t]) => `<button class="fi-chip${f ? ' ' + classeFamille(f) : ''}" ${attr}="${escA(f)}" aria-pressed="${f === actif}">${esc(t)}</button>`).join('')}</div>`;
const voletT = t => `<p class="fi-rac-t">${esc(t)}</p>`;
/* Une face qui tient dans la largeur de sa place : le SVG se met à l'échelle. */
const faceAjustee = (f, titre) => `<figure class="fi-face"><svg class="mj" viewBox="0 0 ${f1(f.w)} ${f1(f.h)}" style="max-width:${f1(Math.min(f.w * 1.2, 520))}px" role="img" aria-label="${escA(titre || 'Face')}">${f.svg}</svg>${titre ? `<figcaption>${esc(titre)}</figcaption>` : ''}</figure>`;
/* La légende des faces — une fois par fiche : ce qu'un contact plein, vide, cerclé de rouge veut dire, et que le survol allume. */
const legendeFaces = (ko, fils, libres) => { const R = couleursDesRoutes(), cs = [...new Set((fils || []).map(f => f && f.l && f.l.route).filter(r => r && R.has(r)))].sort(triNaturel).map(r => R.get(r));
  const pastilles = (cs.length ? cs : [null]).slice(0, 4).map(c => `<i class="plein"${c ? ` style="--c:${c}"` : ''}></i>`).join('');
  return `<div class="fi-legende"><span><span class="fi-pastilles">${pastilles}</span>${pluriel((fils || []).length, 'fil')}, à la couleur de sa route</span><span><i></i>${libres != null ? plurielLie(libres, 'libre') : 'libre'}</span>${ko ? '<span><i class="ko"></i>fil refusé</span>' : ''}<span class="fi-leg-aide">survoler un contact allume son fil</span></div>`; };
// le symétrique d'un module, comme on voit l'autre partie de face (fiche et embase sont symétriques par l'axe vertical)
const miroir = m => ({ ...m, contacts: m.contacts.map(c => ({ ...c, c: m.colonnes - 1 - c.c })), groupes: m.groupes.map(g => ({ ...g, contacts: g.contacts.map(c => ({ ...c, c: m.colonnes - 1 - c.c })) })) });
// ce qu'un contact pris montre sur la face : la clé de son fil, son numéro, sa couleur
const occupant = (f, ko) => { const cl = coulDeFil(f); return { i: cleFil(f.l), cable: f.cable || (f.l && f.l.origine === null ? 'neuf' : '—'), couleur: cl, couleurClaire: melanger(cl, 0.8), ko: !!ko }; };
/* Le contact à sertir, en un mot : « EN3155-003F2020 + E0718-20-30 ». */
const motSertir = st => st ? st.reference + (st.accessoire ? ' + ' + st.accessoire : '') : '';
/* Le mot « hypothèse » sur une fiche : un lien vers la fiche des hypothèses de la simulation (08, `ficheHypotheses`). */
const motHypothese = '<button class="fi-hyp" data-hyp="1" title="Une hypothèse de la simulation — cliquer pour la régler">hypothèse</button>';
// un nombre écrit à la française (« 5,2 ») ; null s'il n'y en a pas
const nombreEcrit = t => { const x = parseFloat(String(t == null ? '' : t).trim().replace(',', '.')); return isFinite(x) ? x : null; };
const pourcentage = x => Math.round(x * 100) + ' %';

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
const nomDEntree = e => e.type === 'fil' ? (e.l.cable || (e.l.origine === null ? 'fil à créer' : 'fil')) : e.type === 'ref' ? 'Déjà fait · ' + e.c.harness : e.nom;
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
    if (e.type === 'fil') { const l = liaisonVivante(e.l); if (!l) { dire('Ce fil n’est plus au contrat.'); return false; } e.l = l; montrerFil(l); return true; }
    if (!repereVivant(e.nom)) { dire('« ' + e.nom + ' » n’est plus au contrat.'); return false; }
    montrerBloc(e.nom); return true;
  } finally { NAV.mode = null; NAV.but = null; } }
const compDuPlan = nom => (app.dessin && app.dessin.comps.find(k => k.name === nom && k.kind !== 'tag')) || null;
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

/* LA BARRE DE NAVIGATION : ‹ ›, le fil d'Ariane, ×. Les maillons : [texte, action] — la dernière, l'objet, en gras. */
function barreNav(maillons, opts) { opts = opts || {}; const I = pileInsp(), p = I.pile[I.pos - 1], n = I.pile[I.pos + 1];
  const prec = !!app.cible && (I.pos > 0 || app.insp.index), suiv = !!app.cible && I.pos < I.pile.length - 1;
  const tPrec = !prec ? 'Rien avant' : I.pos > 0 && p ? 'Revenir à ' + nomDEntree(p) : 'Revenir à la liste des repères', tSuiv = suiv && n ? 'Aller à ' + nomDEntree(n) : 'Rien après';
  const li = maillons.map(([t, act, titre], k) => k === maillons.length - 1 ? `<li aria-current="page"><b>${esc(t)}</b></li>`
    : `<li><button class="fi-maillon" data-ariane="${escA(act)}"${titre ? ` title="${escA(titre)}"` : ''}>${esc(t)}</button></li>`).join('');
  return `<nav class="fi-nav" aria-label="Où l’on est"><button class="fi-pas" id="fi-prec"${prec ? '' : ' disabled'} aria-label="${escA(tPrec + ' (Alt+←)')}" title="${escA(tPrec + ' (Alt+←)')}">${ico('gauche')}</button>`
    + `<button class="fi-pas" id="fi-suiv"${suiv ? '' : ' disabled'} aria-label="${escA(tSuiv + ' (Alt+→)')}" title="${escA(tSuiv + ' (Alt+→)')}">${ico('droite')}</button>`
    + `<ol class="fi-ariane">${li}</ol>${opts.fermer === false ? '' : `<button class="fi-x" id="in-fermer" aria-label="Fermer (Échap)" title="Fermer (Échap)">${ico('fermer')}</button>`}</nav>`; }
// le folio d'un repère : celui qu'on regarde s'il y est, sinon le premier
const folioDuRepere = nom => { if (VT_A_POSER.test(nom)) return app.plan !== '*' ? app.plan : ''; const ou = plansDuRepere(nom).sort(triNaturel); return ou.includes(app.plan) ? app.plan : ou[0] || ''; };
/* Les fils d'un repère que le courant dépasse : des problèmes de la fiche, montrés dans « Fils et intensité ». */
const problemesDesFils = fils => fils.flatMap(f => { const x = intensiteDuFil(f.l); if (!x.trop.length) return []; const p = x.trop[0];
  return [{ niveau: 'ko', texte: `${f.l.cable || 'fil sans numéro'} (${f.l.type}) : ${p.nom} ${amperes(p.i)}${p.t === Infinity ? '' : ' pendant ' + secondes(p.t)} > ${amperes(intensiteAdmise(x.fn, p.t) * x.fac)} admis${x.al ? ' — sous ' + x.al.nom : ''}`, section: 'fils', viser: cleFil(f.l) }]; });
function arianeDe(c) { const m = [['Contrat', 'index', 'La liste des repères du contrat']], folio = f => { if (f && plans().length > 1) m.push(['Folio ' + f, 'folio:' + f, 'Voir le folio ' + f + ' entier']); };
  if (c.type === 'ref') { m.push([c.nom, 'bloc:' + c.nom]); m.push(['Déjà fait · ' + c.harness]); return m; }
  if (c.type === 'fil') { const l = c.l, I = pileInsp(), p = I.pile[I.pos - 1], fs = l.origine === null ? [app.plan] : foliosDe(l); folio(fs.includes(app.plan) ? app.plan : fs[0]);
    // venu d'un de ses bouts : « 102CB1 : 2 › W-012 » (le repère et la borne, un maillon : la fiche du repère)
    if (p && p.type === 'bloc' && (p.nom === l.de || p.nom === l.vers)) { const b = p.nom === l.de ? l.borneDe : l.borneVers; m.push([p.nom + (b ? ' : ' + b : ''), 'bloc:' + p.nom, 'La fiche de ' + p.nom + (b ? ', borne ' + b : '')]); }
    m.push([l.cable || (l.origine === null ? 'fil à créer' : 'fil sans numéro')]); return m; }
  folio(folioDuRepere(c.nom)); const C = connecteursDe(c.nom, verite()).filter(k => k.nom), k = FI.connecteur[c.nom];
  if (C.length > 1 && k && k !== '—') { m.push([c.nom, 'section:identite']); m.push(['connecteur ' + k]); } else m.push([c.nom]);
  return m; }

/* ---- L'EN-TÊTE --------------------------------------------------------------------------------------------------- */
/* Le SYMBOLE du type, à plat : l'équipement (un boîtier et son connecteur), le disjoncteur (deux bornes, le levier,
   le poussoir), la barrette (une rangée de contacts reliés), la prise (fiche et embase), le fil (un trait à la couleur
   de sa route), la comparaison (deux feuilles). */
const SYMBOLES = {
  equipement: '<rect x="4" y="5" width="15" height="20" rx="1.5"/><rect x="19" y="9" width="5" height="12" rx="1"/><path d="M24 12h3M24 15h3M24 18h3"/>',
  disjoncteur: '<path d="M3 20h5M22 20h5"/><circle cx="9.5" cy="20" r="1.6"/><circle cx="20.5" cy="20" r="1.6"/><path d="M10.5 19 20 12"/><path d="M15 6v9M11.5 6h7"/>',
  barrette: '<rect x="3" y="10" width="24" height="10" rx="2.5"/><circle cx="8.5" cy="15" r="1.8"/><circle cx="15" cy="15" r="1.8"/><circle cx="21.5" cy="15" r="1.8"/><path d="M10.3 15h2.9M16.8 15h2.9"/>',
  prise: '<circle cx="10.5" cy="15" r="7"/><circle cx="19.5" cy="15" r="7"/><circle cx="10.5" cy="12.5" r="1" fill="currentColor"/><circle cx="10.5" cy="17.5" r="1" fill="currentColor"/><circle cx="19.5" cy="12.5" r="1"/><circle cx="19.5" cy="17.5" r="1"/>',
  fil: '<path class="fi-sym-route" d="M7 15h16"/><circle cx="5" cy="15" r="2.4"/><circle cx="25" cy="15" r="2.4"/>',
  ref: '<rect x="4" y="6" width="13" height="18" rx="1.5"/><rect x="13" y="4" width="13" height="18" rx="1.5"/><path d="M16.5 10h6M16.5 13.5h6M16.5 17h4"/>'
};
const symbole = (type, coul) => `<div class="fi-symbole" aria-hidden="true"${coul ? ` style="--c:${coul}"` : ''}><svg viewBox="0 0 30 30">${SYMBOLES[type] || SYMBOLES.equipement}</svg></div>`;
/* La pastille des problèmes, repliée : combien de problèmes, combien de points à voir ; un clic ouvre la section. */
function pastilleProblemes(probs) { const ko = probs.filter(p => p.niveau === 'ko').length, att = probs.length - ko; if (!probs.length) return '';
  const t = [ko ? pluriel(ko, 'problème') : '', att ? (att > 1 ? att + ' à voir' : '1 point à voir') : ''].filter(Boolean).join(' · ');
  return `<button class="fi-pb ${ko ? 'ko' : 'att'}" id="fi-pb" title="Voir la liste"><i aria-hidden="true"></i><span>${esc(t)}</span>${ico('droite')}</button>`; }
/* L'en-tête : le symbole, le repère — un champ qui a l'air d'un titre, son crayon (clic ou F2), qu'on renomme en
   écrivant dedans —, la ligne de nature, la pastille. o : { type, nom, champ (l'id du champ), aide, sous, probs, coul } */
function enTete(o) {
  const nom = o.champ ? `<input class="fi-nom" id="${o.champ}" value="${escA(o.nom)}" aria-label="${escA(o.aide || 'Repère — écrire pour renommer')}" title="${escA(o.aide || 'Écrire ici renomme partout : chaque fil suit')}" spellcheck="false" autocomplete="off">`
    + `<button class="fi-crayon" id="fi-crayon" aria-label="Renommer (F2)" title="Renommer (F2)">${ico('crayon')}</button>` : `<div class="fi-nom">${esc(o.nom)}</div>`;
  return `<header class="fi-entete">${symbole(o.type, o.coul)}<div class="fi-ident"><div class="fi-nom-ligne">${nom}</div>${o.sous ? `<div class="fi-sous">${o.sous}</div>` : ''}${pastilleProblemes(o.probs || [])}</div></header>`; }
/* L'ancienne tête (la comparaison des contrats déjà faits s'en sert encore, quand sa référence a disparu). */
const fiTete = o => `<header class="fi-tete"><div class="min0"><div class="fi-nom">${esc(o.nom)}</div></div></header><div class="fi-ligne">${o.sous ? `<span class="fi-sous">${o.sous}</span>` : ''}</div>`;

/* ---- LES CHAMPS : une valeur, son origine, son retour au calcul ---------------------------------------------------- */
/* Une ligne de champ : l'étiquette (un mot en minuscules), la valeur ou son champ, l'origine et « ↺ automatique » ;
   dessous, s'il le faut, une note sur toute la largeur et la liste de choix. */
const ligneChamp = (k, v, o) => { o = o || {}; const fin = (o.origine || '') + (o.changer || '') + (o.auto || '');
  return `<div class="fc${o.cls ? ' ' + o.cls : ''}"${o.attrs ? ' ' + o.attrs : ''}><span class="fc-k">${esc(k)}</span><span class="fc-v">${v}${fin ? `<span class="fc-o">${fin}</span>` : ''}</span>${o.sous ? `<span class="fc-sous">${o.sous}</span>` : ''}${o.liste || ''}</div>`; };
const champs = lignes => `<div class="fs-champs">${lignes.filter(Boolean).join('')}</div>`;
/* Un champ qu'on écrit : il a l'air d'une valeur, se révèle au survol, s'écrit au clic ; Entrée l'applique, Échap le rend. */
const saisie = (attrs, val, o) => { o = o || {}; return `<input class="fc-in${o.mono ? ' mono' : ''}${o.court ? ' court' : ''}${o.long ? ' long' : ''}"${attrs} value="${escA(val == null ? '' : val)}"${o.ph ? ` placeholder="${escA(o.ph)}"` : ''}${o.liste ? ` list="${o.liste}"` : ''}${o.mode ? ` inputmode="${o.mode}"` : ''} aria-label="${escA(o.label || '')}" spellcheck="false" autocomplete="off">`; };
/* « Changer » : un seul par valeur, à sa droite ; il ouvre la liste de choix SOUS la valeur (pas un volet). */
const boutonChanger = (cle, titre) => `<button class="fi-lien fc-changer" data-changer="${escA(cle)}" aria-expanded="${FI.liste === cle}"${titre ? ` title="${escA(titre)}"` : ''}>Changer${ico('bas', 'fi-chevron')}</button>`;
/* LA LISTE DE CHOIX, sous la valeur qu'elle change : huit lignes en vue, un filtre au-delà ; Échap, ou un clic ailleurs,
   la ferme. Rien tant qu'elle n'est pas ouverte. */
const listeChoix = (cle, contenu, o) => { o = o || {}; if (FI.liste !== cle) return '';
  return `<div class="fi-choix" data-volet="${escA(cle)}" role="group" aria-label="${escA(o.titre || 'Choisir')}">${o.filtre ? `<div class="filtre fi-choix-filtre">${ico('loupe')}<input data-filtre-liste placeholder="${escA(o.filtre)}" aria-label="${escA(o.filtre)}" autocomplete="off" spellcheck="false"></div>` : ''}<div class="fi-choix-corps">${contenu}</div>${o.pied ? `<div class="fi-choix-pied">${o.pied}</div>` : ''}</div>`; };

/* ---- LES CALCULS PARTAGÉS : ce qui alimente un fil, ce qu'il admet, sa chute ---------------------------------------- */
/* Le disjoncteur en amont de chaque fil du contrat : une passe sur les chemins de chaque disjoncteur (le premier qui
   passe par le fil, comme `alimentationDe`), gardée tant que le contrat ne change pas (la clé du contrôle). */
const ALIM = { cle: null, carte: null, dj: new Map() };
function carteDesAlimentations() { const cle = typeof CONTROLE !== 'undefined' ? CONTROLE.cle : null; if (ALIM.carte && cle && ALIM.cle === cle) return ALIM.carte;
  const V = verite(), m = new Map(); ALIM.dj = new Map();
  reperesDe(V).filter(estDisjoncteur).forEach(cb => { try { cheminsDepuis(V, cb).forEach(ch => ch.segments.forEach(s => { if (s.fil && !m.has(s.fil)) m.set(s.fil, { cb, chemin: ch }); })); } catch (_) { } });
  ALIM.cle = cle; ALIM.carte = m; return m; }
function infosDisjoncteur(cb) { if (ALIM.dj.has(cb)) return ALIM.dj.get(cb); const d = disjonctionDe(cb), pts = d.points.length ? d.points : pointsDuProfil(d.profil), perm = pts.find(p => p.t === Infinity), pointe = pts[0];
  const x = { nom: cb, calibre: d.calibre, perm: perm ? perm.i : null, pointe: pointe && pointe.t !== Infinity ? pointe : null, points: pts }; ALIM.dj.set(cb, x); return x; }
const alimentationDuFil = l => { const a = carteDesAlimentations().get(l); return a ? { ...infosDisjoncteur(a.cb), chemin: a.chemin } : null; };
/* CE QU'UN FIL PORTE ET CE QU'IL ADMET : le courant (le permanent du disjoncteur en amont, sinon l'hypothèse), sa
   pointe, ce que la norme des fils admet, déclassé comme la simulation (le faisceau, la charge, l'altitude, l'ambiante,
   le conducteur), et ce qui dépasse. */
const CALCULS = new Map();   // le temps d'un rendu : l'intensité de chaque fil, calculée une fois (vidé par rendreFiche)
function intensiteDuFil(l) { if (CALCULS.has(l)) return CALCULS.get(l); const x = intensiteCalculee(l); CALCULS.set(l, x); return x; }
function intensiteCalculee(l) { const H = app.simu || HYPOTHESES, jauge = jaugeDuType(l.type), neuf = l.origine === null;
  const fn = l.type ? filDeNorme(app.norme, l.type, jauge) : null, rd = l.type ? resistanceDuFil(app.norme, l.type, jauge, H.tconducteur) : { rho: null, kConducteur: 1, conducteur: 'cuivre' };
  const decl = fn ? facteurDeclassement(app.norme, H.conditions, { fils: H.fils, charge: H.charge, altitude: H.altitude }) : 1, amb = fn ? facteurAmbiante(fn, H.ambiante) : 1, fac = decl * amb * (rd.kConducteur || 1);
  const continu = fn && fn.intensite != null ? fn.intensite * fac : null, al = neuf ? null : alimentationDuFil(l), I = al && al.perm ? al.perm : H.courant;
  const pts = al ? al.points : [{ nom: 'hypothèse', i: I, t: Infinity }], trop = fn ? pts.filter(pt => pt.i > intensiteAdmise(fn, pt.t) * fac + 1e-9) : [];
  const pointe = al && al.pointe ? { ...al.pointe, admis: fn ? intensiteAdmise(fn, al.pointe.t) * fac : null } : null;
  return { H, jauge, fn, rd, decl, amb, fac, continu, al, I, pointe, trop, charge: continu ? I / continu : null }; }
/* SA CHUTE : sur le fil (ρ × L × I), et en ligne depuis le disjoncteur en amont, contre la chute admise. */
function chuteDuFil(l, x) { x = x || intensiteDuFil(l); const H = x.H, L = l.longueur > 0 ? l.longueur : H.longueur, dU = x.rd.rho != null ? x.rd.rho / 1000 * L * x.I : null;
  const total = x.al && x.al.chemin ? chuteDuChemin(app.norme, x.al.chemin, x.I, H) : null, admise = chuteAdmise(app.norme, H.tension), max = admise && admise.chuteMax != null ? admise.chuteMax : null;
  return { L, dU, total, max, hyp: !(l.longueur > 0), trop: !!(total && max != null && total.dU > max + 1e-9), reel: !!(total && total.reel) }; }
// les fils d'un repère, chacun une fois (pas les shunts) : { l, borne, vers, borneVers, amont }
const filsDuRepere = nom => liaisonsDeRepere(nom).filter(l => (l.de === nom || l.vers === nom) && l.de !== l.vers).map(l => ({ l: sourceDe(l) || l, borne: l.de === nom ? l.borneDe : l.borneVers, vers: l.de === nom ? l.vers : l.de, borneVers: l.de === nom ? l.borneVers : l.borneDe, amont: l.vers === nom }));
// les barrettes à poser sur les bornes d'un repère : borne → VTn
const barrettesSur = nom => { const m = new Map(); liaisonsDuPlan().forEach(l => { if (l.origine === null && l.de === nom && l.vers === l.aPoser && l.borneVers === '1') m.set(String(l.borneDe), l.aPoser); }); return m; };

/* ---- LE CONTACT À SERTIR, choisi à la main --------------------------------------------------------------------- */
/* Le contact qu'on sertit au bout d'un fil se lit dans la table Contacts de la norme (09, `contactDuFil`) ; on peut en
   retenir un autre parmi ceux de la table qui acceptent le fil (même taille, même sexe, même type et jauge, ou « * ») :
   il s'écrit sur la liaison (`contactDe` / `contactVers` : le même champ que le récapitulatif, lu par la nomenclature
   et le contrôle — `contactMain`, 08-modules), et « ↺ automatique » rend celui de la table. Un contrat d'avant qui le
   gardait dans les désignations (clé « sertir|repère|borne ») se lit encore. */
const cleSertir = (rep, borne) => 'sertir|' + rep + '|' + borne;
const deCleSertir = k => { const xs = k.split('|'); return { rep: xs[1], borne: xs.slice(2).join('|') }; };
// les bouts de fil posés sur (repère, borne) : [liaison, champ du contact]
const boutsSur = (rep, borne) => verite().flatMap(l => [l.de === rep && String(l.borneDe) === String(borne) ? [l, 'contactDe'] : null, l.vers === rep && String(l.borneVers) === String(borne) ? [l, 'contactVers'] : null].filter(Boolean));
const sertirChoisi = (rep, borne) => { const x = boutsSur(rep, borne).find(([l, ch]) => l[ch]); return x ? x[0][x[1]] : app.contrat.designations.get(cleSertir(rep, borne)) || ''; };
function contactsPossibles(famille, taille, sexe, type) { const t = typeDuFil(type), j = jaugeDuType(type), vus = new Set();
  return contactsDeTaille(app.norme, famille, taille).filter(c => (!sexe || c.sexe === sexe) && (c.typeFil === '*' || c.typeFil === t) && (c.jauge == null || c.jauge === j))
    .filter(c => { const k = c.reference + '|' + (c.accessoire || ''); if (vus.has(k)) return false; vus.add(k); return true; }); }
// le contact d'un fil sur un plan (x : la ligne du plan), en tenant compte du choix à la main
const sertirAuBout = (rep, borne, x) => { const main = sertirChoisi(rep, borne); return main ? { reference: main, accessoire: '', main: true } : x && x.sertir ? { ...x.sertir, main: false } : null; };

/* ---- LES SECTIONS COMMUNES ---------------------------------------------------------------------------------------- */
/* LES CONTACTS d'un connecteur (ou d'un module) : une ligne par fil — le contact, à sertir, le fil (son numéro ouvre
   sa fiche), son câble, où il va. Douze lignes, puis « tout montrer ». lignes : [{ ct, f, sertir, rep, borne, plan, ko, tag }] */
function lignesContacts(cle, xs, o) { o = o || {}; const n = xs.length, tout = FI.tout[cle] || n <= 14 || (FI.viser && xs.some(x => x.f && x.f.l && cleFil(x.f.l) === FI.viser)); let prec = '', html = '';
  (tout ? xs : xs.slice(0, 12)).forEach(x => { if (x.groupe) { html += `<li class="fi-groupe">${x.groupe}</li>`; prec = ''; return; }
    const f = x.f, k = f && f.l ? cleFil(f.l) : '', st = x.sertir, mot = motSertir(st), meme = mot && mot === prec, neuf = !!(f && f.l && f.l.origine === null); prec = mot;
    const ks = x.rep && x.borne != null && x.plan ? cleSertir(x.rep, x.borne) : '';
    const sertir = ks ? `<button class="fi-sertir${st && st.main ? ' main' : ''}${meme ? ' meme' : ''}" data-sertir="${escA(ks)}" title="${escA((mot ? 'Contact à sertir : ' + mot + (st.main ? ' (choisi à la main)' : ' (la table de la norme)') : 'Aucun contact de la table pour ce fil') + ' — cliquer pour en choisir un autre')}">${mot ? (meme ? '″' : esc(mot)) : '—'}</button>`
      : `<span class="fi-sertir"${mot ? ` title="${escA(mot)}"` : ''}>${mot ? (meme ? '″' : esc(mot)) : o.sansTable ? '—' : ''}</span>`;
    html += `<li class="fi-fil${x.ko ? ' ko' : ''}${neuf ? ' neuf' : ''}"${k ? ` data-i="${k}" tabindex="0" role="button" title="${escA((f.cable || 'fil à créer') + (f.type ? ' · ' + f.type : '') + ' — ouvrir sa fiche')}"` : ''}>`
      + `<span class="fi-ct">${x.ct}</span>${sertir}<span class="fi-num">${puceFil(f)}<b class="${neuf ? 'neuf' : ''}">${esc(neuf ? 'à créer' : f.cable || '—')}</b></span><span class="fi-type">${esc(f.type || '—')}</span>`
      + `<span class="fi-dest${f.amont ? ' amont' : ''}">${ico('fleche')}<span>${esc(x.dest != null ? x.dest : destination(f))}</span>${x.tag ? `<span class="fi-tag" title="Barrette à poser sur cette borne">${esc(x.tag)}</span>` : ''}</span>`
      + (x.ko ? `<span class="fi-ko">${esc(x.ko)}</span>` : '') + '</li>';
    if (ks && FI.liste === 'sertir:' + ks) html += `<li class="fi-choix-ligne">${choixSertir(ks, x.plan, f, st)}</li>`; });
  const reste = xs.slice(12).filter(x => !x.groupe).length;
  return `<ul class="fi-liste fi-contacts">${o.tete !== false ? '<li class="fi-entetes" aria-hidden="true"><span>contact</span><span>à sertir</span><span>fil</span><span>câble</span><span>vers</span></li>' : ''}${html}</ul>`
    + (!tout && reste > 0 ? `<button class="fi-lien fi-plus-lignes" data-tout="${escA(cle)}">… ${pluriel(reste, 'contact')} de plus · tout montrer</button>` : ''); }
/* La liste des contacts à sertir qu'accepte un fil, sous sa ligne. */
function choixSertir(ks, x, f, st) { const Q = x.Q, cands = Q ? contactsPossibles(Q.famille, x.taille, x.sexe, f.type) : [];
  const auto = x.sertir ? motSertir(x.sertir) : '';
  const items = cands.map(c => `<button class="fi-chip" data-sertir-ref="${escA(ks)}" data-v="${escA(c.reference)}" aria-pressed="${!!st && st.reference === c.reference}" title="${escA((c.typeFil === '*' ? 'tout type' : c.typeFil) + (c.jauge != null ? ' · ' + c.jauge + ' AWG' : ' · toute jauge') + (c.accessoire ? ' · avec ' + c.accessoire : ''))}">${esc(c.reference)}${c.accessoire ? ' <i>+ ' + esc(c.accessoire) + '</i>' : ''}</button>`).join('');
  return `<div class="fi-choix" data-volet="${escA('sertir:' + ks)}">${voletT(`contacts de taille ${x.taille || '?'}${x.sexe ? ' ' + nomDuSexe(x.sexe) + 's' : ''} qui acceptent ${f.type || 'ce fil'}`)}`
    + (items ? `<div class="fi-puces">${items}</div>` : '<p class="fi-note">La table Contacts de la norme n’en donne aucun pour ce fil.</p>')
    + (st && st.main ? `<div class="fi-choix-pied">${retourAuto('sertir:' + ks, auto || 'la table')}</div>` : '') + '</div>'; }

/* LES FILS ET LEUR INTENSITÉ : chaque fil, le courant qui le traverse contre ce qu'il admet en continu, en barre. */
function sectionFils(fils, probs, o) { o = o || {}; if (!fils.length) return { cle: 'fils', vide: 'aucun fil' };
  const H = app.simu || HYPOTHESES, xs = fils.map(f => ({ ...f, x: intensiteDuFil(f.l) })), cbs = [...new Set(xs.map(f => f.x.al && f.x.al.nom).filter(Boolean))], trop = xs.filter(f => f.x.trop.length);
  const source = !cbs.length ? `${nombre(H.courant)} A d’${motHypothese} (aucun disjoncteur en amont)` : cbs.length === 1 && xs.every(f => f.x.al) ? `sous ${esc(cbs[0])}` : `sous ${cbs.map(esc).join(', ')}`;
  const verdict = trop.length ? `<span class="fi-ko-t">${pluriel(trop.length, 'fil')} trop fin${s_(trop.length)} : ${trop.slice(0, 2).map(f => `${esc(f.l.cable || 'fil')} ${amperes(f.x.trop[0].i)} > ${amperes(intensiteAdmise(f.x.fn, f.x.trop[0].t) * f.x.fac)}`).join(' · ')}</span>` : xs.some(f => !f.x.fn) ? 'des fils hors de la norme des fils' : 'tous tiennent';
  const li = xs.map(f => { const x = f.x, k = cleFil(f.l), part = x.continu ? Math.min(1.2, x.I / x.continu) : 0, ko = x.trop.length > 0, cls = ko ? 'ko' : part > 0.8 ? 'att' : 'ok';
    const pt = x.pointe && x.pointe.admis ? ` · pointe ${amperes(x.pointe.i)} (${secondes(x.pointe.t)})` : '';
    return `<li class="fi-ia${ko ? ' ko' : ''}"${k ? ` data-i="${k}" tabindex="0" role="button" title="${escA((f.l.cable || 'fil') + ' — ouvrir sa fiche')}"` : ''}><span class="fi-num">${puceFil(f)}<b>${esc(f.l.cable || (f.l.origine === null ? 'à créer' : '—'))}</b></span><span class="fi-type">${esc(f.l.type || '—')}</span>`
      + `<span class="fi-barre ${cls}" aria-hidden="true"><i style="width:${(Math.min(1, part) * 100).toFixed(1)}%"></i></span><span class="fi-ia-v">${x.continu ? `<b>${esc(amperes(x.I))}</b> / ${esc(amperes(x.continu))}` : `<b>${esc(amperes(x.I))}</b> / ?`}</span>`
      + `<span class="fi-ia-sous">${x.al ? 'sous ' + esc(x.al.nom) + (x.al.calibre ? ' (' + esc(amperes(x.al.calibre)) + ')' : '') : 'hypothèse'}${pt}${ko ? ` · <b class="fi-ko-t">${esc(x.trop[0].nom)} ${esc(amperes(x.trop[0].i))} &gt; ${esc(amperes(intensiteAdmise(x.fn, x.trop[0].t) * x.fac))}</b>` : ''}</span></li>`; }).join('');
  return { cle: 'fils', resume: insecable(`${pluriel(xs.length, 'fil')} · ${source} · ${verdict}`), badge: badgeProblemes(probs, 'fils') || (trop.length ? { t: String(trop.length), etat: 'ko' } : { t: '✓', etat: 'ok' }),
    contenu: `<p class="fi-note">Le courant qui traverse chaque fil (le permanent du disjoncteur en amont, sinon l’${motHypothese}) contre ce qu’il admet en continu, déclassé${motFacteur(xs[0].x.fac)} ; un clic ouvre la fiche du fil.</p><ul class="fi-liste fi-ias">${li}</ul>` }; }
/* LA CHUTE DE TENSION : sur chaque fil, et en ligne depuis le disjoncteur en amont ; `passage` : la chute d'une
   barrette (deux contacts) ou d'une prise (une paire), par la résistance de contact de la taille. */
function sectionChute(fils, probs, o) { o = o || {}; if (!fils.length) return { cle: 'chute', vide: 'aucun fil' };
  const H = app.simu || HYPOTHESES, xs = fils.map(f => { const x = intensiteDuFil(f.l); return { ...f, x, c: chuteDuFil(f.l, x) }; }), dUs = xs.map(f => f.c.dU).filter(u => u != null);
  const max = xs[0].c.max, lignes = xs.filter(f => f.c.total), trop = lignes.filter(f => f.c.trop), cbs = [...new Set(lignes.map(f => f.x.al.nom))];
  const resume = !lignes.length ? (dUs.length ? `sans disjoncteur en amont : ${volts(Math.min(...dUs))}${dUs.length > 1 ? ' à ' + volts(Math.max(...dUs)) : ''} par fil (${xs.some(f => f.c.hyp) ? 'hypothèse ' + nombre(H.longueur) + ' m, ' : ''}${nombre(H.courant)} A)` : 'résistance des fils inconnue')
    : `depuis ${cbs.join(', ')} : ${volts(Math.max(...lignes.map(f => f.c.total.dU)))} au plus${max != null ? ' (' + volts(max) + ' admis)' : ''}${trop.length ? ' · ' + pluriel(trop.length, 'ligne') + ' de trop' : ''}`;
  const li = xs.map(f => { const c = f.c, k = cleFil(f.l), part = c.total && max ? Math.min(1, c.total.dU / max) : 0, cls = c.trop ? (c.reel ? 'ko' : 'att') : 'ok';
    return `<li class="fi-du${c.trop && c.reel ? ' ko' : ''}"${k ? ` data-i="${k}" tabindex="0" role="button"` : ''}><span class="fi-num">${puceFil(f)}<b>${esc(f.l.cable || '—')}</b></span><span class="fi-du-v"><b>${volts(c.dU)}</b> <i>sur ${nombre(arrondi(c.L, 2))} m${c.hyp ? ' (hyp.)' : ''}</i></span>`
      + `<span class="fi-barre ${cls}" aria-hidden="true"${c.total ? '' : ' hidden'}><i style="width:${(part * 100).toFixed(1)}%"></i></span><span class="fi-du-l">${c.total ? `${volts(c.total.dU)} <i>en ligne${H.tension ? ', ' + nombre(Math.round(c.total.dU / H.tension * 1000) / 10) + ' %' : ''}</i>` : '<i>—</i>'}</span></li>`; }).join('');
  const passage = o.passage ? `<p class="fi-note">${o.passage}</p>` : '';
  return { cle: 'chute', resume: insecable(resume), badge: badgeProblemes(probs, 'chute') || (trop.length ? { t: String(trop.length), etat: trop.some(f => f.c.reel) ? 'ko' : 'att' } : lignes.length ? { t: '✓', etat: 'ok' } : { t: '—', etat: '' }),
    contenu: passage + `<ul class="fi-liste fi-dus">${li}</ul><p class="fi-note">ΔU = ρ × L × I sur chaque fil ; en ligne, depuis le disjoncteur en amont jusqu’au bout du chemin, sous ${nombre(H.tension)} V${max != null ? ' (' + volts(max) + ' admis)' : ''}.${xs.some(f => f.c.hyp) ? ` Les longueurs que le retest ne porte pas sont l’${motHypothese} (${nombre(H.longueur)} m) : elles se corrigent sur la fiche de chaque fil.` : ''}</p>` }; }
/* « DÉJÀ FAIT » : toujours là, même vide — l'ingénieur apprend qu'elle pourrait exister. */
function sectionDejaFait(nom) { const I = indexReferences();
  if (!I) return { cle: 'dejafait', vide: 'aucune base chargée —', action: '<button class="fs-action" data-action="references">charger les contrats déjà faits</button>', badge: { t: '0', etat: '' } };
  const h = dejaFaitHtml(nom), n = (h.match(/class="fi-cand /g) || []).length;
  if (!h) return { cle: 'dejafait', vide: 'aucun contrat déjà fait ne porte ce repère, ce part number ni ce code', badge: { t: '0', etat: '' } };
  return { cle: 'dejafait', resume: `${pluriel(n, 'machine')} proche${s_(n)} dans la base — un clic compare`, badge: { t: String(n), etat: '' }, contenu: h }; }
/* LE DÉTAIL DU CALCUL : les hypothèses employées, le déclassement, et d'où chaque nombre vient. */
function sectionDetail(x, o) { o = o || {}; const H = app.simu || HYPOTHESES, decl = detailDeclassement(app.norme, H.conditions, { fils: H.fils, charge: H.charge, altitude: H.altitude });
  const admise = chuteAdmise(app.norme, H.tension);
  const lignes = [['longueur', `${nombre(H.longueur)} m <i>par défaut (${motHypothese})</i>`], ['courant', `${nombre(H.courant)} A <i>sans disjoncteur en amont (${motHypothese})</i>`],
    ['réseau', `${nombre(H.tension)} V${admise && admise.chuteMax != null ? ` <i>· ${volts(admise.chuteMax)} de chute admise${admise.chuteInter != null ? ', ' + volts(admise.chuteInter) + ' en intermittent' : ''}</i>` : ''}`],
    ['température', `${nombre(H.ambiante)} °C ambiante · conducteur à ${nombre(H.tconducteur)} °C`],
    ['déclassement', decl.length ? decl.map(d => `${esc(d.condition)} × ${nombre(arrondi(d.facteur, 2))}`).join(' · ') : '<i>aucun</i>']].concat(o.lignes || []);
  return { cle: 'detail', resume: insecable(`${nombre(H.longueur)} m, ${nombre(H.courant)} A, ${nombre(H.tension)} V, ${nombre(H.ambiante)} °C${decl.length ? ' · ' + decl.map(d => d.condition + ' × ' + nombre(arrondi(d.facteur, 2))).join(', ') : ''}`),
    contenu: (o.avant || '') + faits(lignes) + `<p class="fi-note">Les hypothèses valent pour tout le contrat : <button class="fi-lien fi-hyp-l" data-hyp="1">régler les hypothèses</button></p>` }; }
/* LES PROBLÈMES : la même liste que la pastille, chacun avec « voir » (la section qui le démontre). */
function sectionProblemes(probs, cibles) { if (!probs.length) return { cle: 'problemes', vide: 'rien à reprendre', badge: { t: '✓', etat: 'ok' } };
  const ko = probs.filter(p => p.niveau === 'ko'), tri = ko.concat(probs.filter(p => p.niveau !== 'ko')), premier = tri[0];
  const li = tri.map(p => { const s = cibles(p.section); return `<li class="fi-pb-l ${p.niveau === 'ko' ? 'ko' : 'att'}"><i aria-hidden="true"></i><span>${insecable(esc(p.texte))}</span>${s ? `<button class="fi-lien fi-voir" data-voir="${escA(s)}"${p.viser ? ` data-viser="${escA(p.viser)}"` : ''}${p.connecteur ? ` data-connecteur="${escA(p.connecteur)}"` : ''} title="${escA('Ouvrir « ' + (SECTIONS[s] || s) + ' »')}">voir</button>` : ''}</li>`; }).join('');
  return { cle: 'problemes', resume: `<span class="fi-${premier.niveau === 'ko' ? 'ko' : 'att'}-t">${insecable(esc(premier.texte))}</span>`, badge: { t: String(ko.length || probs.length), etat: ko.length ? 'ko' : 'att' }, contenu: `<ul class="fi-pbs">${li}</ul>` }; }

/* ---- L'IDENTITÉ D'UN REPÈRE ------------------------------------------------------------------------------------------ */
/* Les natures qu'on peut donner : chaque code de la nomenclature des repères. La nature SE LIT dans le code du repère
   (RL : relais, CB : disjoncteur…) : la changer renomme le repère (103RL1 → 103CB1) — chaque fil suit, Ctrl+Z défait. */
const NATURES = Object.entries(CODES).filter(([k, v]) => v.forme !== 'masse').map(([k, v]) => [k, v.nom]).sort((a, b) => a[1].localeCompare(b[1], 'fr'));
function sectionIdentiteBloc(nom, probs, o) { o = o || {}; const q = lireRepere(nom), code = q && q.code || '', des = app.contrat.designations.get(nom) || '', aPoser = VT_A_POSER.test(nom), nat = aPoser ? 'barrette à poser' : natureDe(nom);
  const ps = plansDuRepere(nom).sort(triNaturel), folios = aPoser ? (app.plan !== '*' ? [app.plan] : []) : ps;
  const options = (CODES[code] ? '' : `<option value="" selected>${esc(nat)}${code ? ' (code ' + esc(code) + ' inconnu)' : ''}</option>`) + NATURES.map(([k, t]) => `<option value="${k}"${k === code ? ' selected' : ''}>${esc(t)} (${k})</option>`).join('');
  const lignes = [
    ligneChamp('repère', `${ident(nom, true)}${q && q.num ? ` <i>· zone ${esc(q.num)} · code ${esc(code)}${q.suffixe ? ' · n° ' + esc(q.suffixe) : ''}</i>` : ''}`, { origine: aPoser ? origine('auto', 'Un repère provisoire, donné par l’outil') : '', changer: aPoser ? '' : '<button class="fi-lien" data-renommer="1" title="Renommer partout (F2)">renommer</button>' }),
    aPoser ? '' : ligneChamp('désignation', saisie('id="eq-des" data-designation="1"', des, { ph: 'à écrire (« relais de démarrage »)', label: 'Désignation', long: true }), { origine: des ? origine('main') : '' }),
    aPoser ? '' : ligneChamp('nature', `<select class="fc-select" id="eq-nature" aria-label="Nature (le code du repère)">${options}</select>`, { origine: origine('auto', 'Lue dans le code du repère : la changer renomme le repère'), sous: '<i>se lit dans le code du repère : en choisir une autre renomme le repère, chaque fil suit</i>' }),
    ligneChamp(folios.length > 1 ? 'folios' : 'folio', folios.length ? esc(folios.join(', ')) : '<i>aucun</i>', { origine: aPoser || modeFolio() === 'auto' ? origine('auto', aPoser ? 'Le folio où elle est dessinée' : 'Découpé par l’outil') : origine('retest') })].concat(o.lignes || []);
  const resume = [nat + (code ? ' (' + code + ')' : ''), q && q.num ? 'zone ' + q.num : '', folios.length ? 'folio ' + folios.join(', ') : '', aPoser ? 'repère provisoire' : des ? '« ' + des + ' »' : 'sans désignation'].filter(Boolean).join(' · ');
  return { cle: 'identite', resume: esc(resume), badge: badgeProblemes(probs, 'identite'), contenu: champs(lignes) + (o.apres || ''), ouvert: o.ouvert }; }

/* ---- LE PART NUMBER D'UN CONNECTEUR, d'un geste pour toutes ses liaisons ----------------------------------------- */
// les liaisons d'un connecteur (ses bornes), chacune avec le champ qui porte son part number de ce côté
const liaisonsDuConnecteur = (nom, bornes) => { const B = new Set((bornes || []).map(String)), xs = []; verite().forEach(l => { if (l.de === nom && B.has(String(l.borneDe))) xs.push([l, 'pnDe']); if (l.vers === nom && B.has(String(l.borneVers))) xs.push([l, 'pnVers']); }); return xs; };
const pnModifie = xs => xs.some(([l, c]) => origineChamp(l, c) === 'main');
const pnAvant = xs => { const x = xs.find(([l, c]) => l.avant && c in l.avant); return x ? x[0].avant[x[1]] || '' : ''; };
function lignePn(nom, cle, bornes, pn, o) { o = o || {}; const xs = liaisonsDuConnecteur(nom, bornes), main = pnModifie(xs);
  return ligneChamp('part number', saisie(`data-pn="${escA(cle)}" data-bornes="${escA(JSON.stringify(bornes.map(String)))}"`, pn, { mono: true, ph: 'à écrire', label: 'Part number du connecteur ' + cle }),
    { origine: main ? origine('main', 'Écrit sur la fiche ; le fichier portait ' + (pnAvant(xs) || 'rien')) : pn ? origine('retest', 'Lu dans le fichier') : '', auto: main ? retourAuto('pn:' + cle, pnAvant(xs) || 'rien') : '', sous: o.sous }); }

/* ---- UN ÉQUIPEMENT (et un disjoncteur) ---------------------------------------------------------------------------- */
// la section qu'un point du disjoncteur démontre
const sectionDj = t => /^chute en ligne/.test(t) ? 'chute' : /profil de charge est à renseigner/.test(t) ? 'profil' : /^part number/.test(t) ? 'identite' : /^(?![\d])\S+ \(|^fil sans numéro/.test(t) ? 'fils' : 'calibre';
function problemesEquipement(nom, cav, b, vt, dj) { const probs = [];
  cav.forEach(c => c.plan.verdicts.forEach(v => { if (v.niveau === 'ko') probs.push({ niveau: 'ko', texte: c.nom + ' · ' + v.texte, section: /pour ce fil|jauge refusée/.test(v.texte) ? 'contacts' : 'connecteur', connecteur: c.nom });
    else if (v.niveau === 'attention' && !/^contact \S+ : \d+ fils/.test(v.texte)) probs.push({ niveau: 'att', texte: c.nom + ' · ' + v.texte, section: 'connecteur', connecteur: c.nom }); }));
  [...b.parBorne].filter(([, fs]) => fs.length > 1).forEach(([bo, fs]) => probs.push({ niveau: 'att', texte: `borne ${bo} : ${fs.length} fils — ${vt.has(String(bo)) ? 'barrette ' + vt.get(String(bo)) : 'une barrette'} à poser`, section: 'contacts' }));
  if (dj) controleDisjonction(nom).forEach(x => probs.push({ niveau: x.niveau === 'ko' ? 'ko' : 'att', texte: x.texte, section: sectionDj(x.texte) }));
  // ce que le contrôle du contrat relève en plus sur ce repère (un conducteur CCA, ce qu'un disjoncteur nourrit au-delà d'un passage)
  ((typeof CONTROLE !== 'undefined' && CONTROLE.items) || []).filter(x => x.nom === nom && !probs.some(p => p.texte === x.texte)).forEach(x => probs.push({ niveau: x.niveau === 'ko' ? 'ko' : 'att', texte: x.texte, section: dj ? sectionDj(x.texte) : /contact|CCA/.test(x.texte) ? 'contacts' : 'connecteur' }));
  return probs; }
function ficheEquipement(nom) { const V = verite(), b = besoinsDeBarrette(nom, V), dj = estDisjoncteur(nom), type = dj ? 'disjoncteur' : 'equipement';
  const C = connecteursDe(nom, V).filter(c => c.nom), cav = cavitesDe(nom), parNom = new Map(cav.map(c => [c.nom, c])), vt = barrettesSur(nom);
  const sans = [...b.parBorne.keys()].filter(bo => !C.some(c => c.bornes.includes(bo))).sort(triNaturel);
  const probs = problemesEquipement(nom, cav, b, vt, dj);
  // le connecteur montré : celui qu'on a choisi, sinon celui qui porte un problème, sinon le premier
  const ids = C.map(c => c.nom).concat(sans.length ? ['—'] : []), fautif = id => probs.some(p => p.connecteur === id && p.niveau === 'ko');
  const sel = ids.includes(FI.connecteur[nom]) ? FI.connecteur[nom] : ids.find(fautif) || ids[0] || ''; FI.connecteur[nom] = sel;
  const c = C.find(k => k.nom === sel) || null, k = c ? parNom.get(c.nom) : null, Q = k && k.plan, M = Q && Q.modules[0];
  const fils = filsDuRepere(nom), pns = [...new Set(C.map(x => x.pn).filter(Boolean))], cal = dj ? calibreDe(nom) : null;
  if (!dj) probs.push(...problemesDesFils(fils));
  const sous = dj ? ['disjoncteur', cal ? `<b>${esc(amperes(cal))}</b>` : '', pns.length === 1 ? ident(pns[0], true) : '', pluriel(fils.length, 'fil')].filter(Boolean).join(' · ')
    : [esc(app.contrat.designations.get(nom) || natureDe(nom)), pluriel(fils.length, 'fil'), C.length > 1 ? pluriel(C.length, 'connecteur') : '', pns.length === 1 ? ident(pns[0], true) : ''].filter(Boolean).join(' · ');

  /* le CONNECTEUR montré : les segments A · B · C, puis l'arrangement, le part number, le sexe, la face */
  const segs = ids.length > 1 || sans.length ? `<div class="fi-segs" role="group" aria-label="Connecteur montré">${ids.map(id => { const x = C.find(y => y.nom === id), kx = x && parNom.get(id), n = x ? x.bornes.length : sans.length;
    const compte = kx && kx.plan.modules[0] ? `${kx.plan.utilises}/${kx.plan.modules[0].module.contacts.length}` : String(n), raison = probs.filter(p => p.connecteur === id && p.niveau === 'ko').map(p => p.texte).join(' ; ');
    return `<button class="seg${fautif(id) ? ' ko' : ''}" data-connecteur="${escA(id)}" aria-pressed="${id === sel}" title="${escA(raison || (id === '—' ? 'Les bornes sans connecteur' : 'Le connecteur ' + id + (x && x.pn ? ' · ' + x.pn : '')))}">${fautif(id) ? '<i aria-hidden="true"></i>' : ''}<b>${id === '—' ? 'sans connecteur' : esc(id)}</b><small>${esc(compte)}</small></button>`; }).join('')}</div>` : '';
  let corpsC = '';
  if (c && M) { const cle = nom + '|' + c.nom, vs = arrangementsQuiLogent(k.points, app.norme, Q.famille).slice(0, 8), refuses = Q.fils.some(x => x.jaugeOk === false), par = new Map(Q.fils.map(x => [x.contact.lettre, x]));
    const auto = Q.main ? remplirContacts(k.points, app.norme, { pn: c.pn, sexe: sexeChoisi(cle) }).reference : '';
    const pourquoi = Q.main ? 'choisi à la main' : Q.nomme ? 'le part number le nomme' : `le plus petit qui a ces ${pluriel(Q.potentiels, 'contact')} et accepte ${typesDe(Q.fils.map(x => x.f)) || 'ces fils'}`;
    const liste = listeChoix('arr|' + cle, vs.length ? vs.map(m => candidat(cle, m, M.reference)).join('') : '<p class="fi-note">Aucun autre arrangement de cette norme ne loge ces bornes.</p>', { titre: 'Arrangements qui logent ces bornes' });
    corpsC = champs([
      ligneChamp('arrangement', ident(M.reference, true), { origine: Q.main ? origine('main') : Q.nomme ? origine('retest', 'Le part number du fichier le nomme') : origine('auto'), auto: Q.main ? retourAuto('arr:' + cle, auto) : '', changer: boutonChanger('arr|' + cle, 'Choisir un autre arrangement'), sous: `<i>${esc(pourquoi)} · ${esc(nomDeFamille(app.norme, Q.famille) || Q.famille)}</i>`, liste }),
      lignePn(nom, c.nom, c.bornes, c.pn),
      Q.tableContacts ? ligneChamp('contacts', `<span class="fi-puces fi-sexe" role="group" aria-label="Sexe des contacts à sertir">${[['F', 'femelles'], ['M', 'mâles']].map(([v, t]) => `<button class="fi-chip" data-sexe="${escA(cle)}" data-v="${v}" aria-pressed="${Q.sexe === v}">${t}</button>`).join('')}</span>`,
        { origine: sexeChoisi(cle) ? origine('main') : origine('auto', 'Des douilles face à l’embase à broches de l’équipement'), auto: sexeChoisi(cle) ? retourAuto('sexe:' + cle, 'femelles') : '' }) : ''])
      + `<div class="fi-faces">${faceAjustee(faceModuleSvg(M.module, ct => { const x = par.get(ct.lettre); return x ? occupant(x.f, x.jaugeOk === false) : null; }, { etiquettes: true }), 'Face côté contacts · ' + M.module.variante)}</div>${legendeFaces(refuses, Q.fils.map(x => x.f), M.module.contacts.length - Q.utilises)}`; }
  else if (c && Q) { const cle = nom + '|' + c.nom, table = (normeDesModules(app.norme).contacts || []).some(x => x.famille === Q.famille);
    corpsC = champs([ligneChamp('arrangement', '<b class="fi-ko-t">aucun</b>', { origine: Q.main ? origine('main') : origine('auto'), auto: Q.main ? retourAuto('arr:' + cle, 'le plus petit qui loge') : '', sous: `<span class="fi-ko-t">${esc(Q.verdicts.filter(v => v.niveau === 'ko').map(v => v.texte).join(' ; ') || 'aucun arrangement ne convient')}</span>` }),
      lignePn(nom, c.nom, c.bornes, c.pn, { sous: '<i>un autre part number de la norme (une autre taille de boîtier) peut loger ces bornes</i>' }),
      table ? ligneChamp('contacts', `<span class="fi-puces fi-sexe" role="group">${[['F', 'femelles'], ['M', 'mâles']].map(([v, t]) => `<button class="fi-chip" data-sexe="${escA(cle)}" data-v="${v}" aria-pressed="${Q.sexe === v}">${t}</button>`).join('')}</span>`, { origine: sexeChoisi(cle) ? origine('main') : origine('auto'), auto: sexeChoisi(cle) ? retourAuto('sexe:' + cle, 'femelles') : '' }) : '']); }
  else if (c) corpsC = champs([lignePn(nom, c.nom, c.bornes, c.pn, { sous: dj ? '<i>un disjoncteur : des bornes à vis, pas d’insert</i>' : c.pn ? '<i>hors des normes embarquées : pas de face. Écrire le part number d’une norme connue (EN 4165, EN 2997, EN 3645, EN 3646, ASNE 0059) — ou <button class="fi-lien" data-action="normes">compléter les normes</button></i>' : '<i>sans part number : l’écrire, la face et les contacts suivent</i>' }),
    ligneChamp('bornes', esc(c.bornes.slice().sort(triNaturel).join(', ')))]);
  else if (sel === '—') corpsC = `<p class="fi-note">Bornes sans connecteur : ${esc(sans.join(', '))} — une borne sans chiffre (CNT, GND…) se raccorde au corps.</p>`;
  const resumeC = !C.length ? (sans.length ? 'aucun connecteur : des bornes seules' : 'aucun connecteur') : C.length === 1 ? `${esc(c ? c.nom : C[0].nom)} · ${M ? ident(M.reference) : c && c.pn ? ident(c.pn) : 'sans part number'}${Q && Q.tableContacts ? ' · ' + (Q.sexe === 'M' ? 'mâles' : 'femelles') : ''}`
    : `${C.map(x => esc(x.nom)).join(' · ')} — ${[...new Set(C.map(x => { const kx = parNom.get(x.nom); return kx ? nomDeFamille(app.norme, kx.plan.famille) || kx.plan.famille : x.pn || 'sans part number'; }))].map(esc).join(', ')}`;

  /* les CONTACTS du connecteur montré */
  const bornesSel = c ? c.bornes : sel === '—' ? sans : [], sertirs = new Map(Q ? Q.fils.map(x => [x.f.l, x]) : []);
  const xsC = bornesSel.slice().sort(triNaturel).flatMap(bo => (b.parBorne.get(bo) || []).map(f => { const x = sertirs.get(f.l), st = x ? sertirAuBout(nom, bo, x) : null;
    return { ct: `<b>${esc(bo)}</b>`, f, sertir: st, rep: nom, borne: bo, plan: x ? { Q, sertir: x.sertir, taille: x.taille, sexe: x.sexe } : null, tag: vt.get(String(bo)), ko: x && x.jaugeOk === false ? 'jauge refusée par le contact' : '' }; }));
  const nomen = Q && Q.nomenclature || [], refus = xsC.filter(x => x.ko).length;
  const resumeCt = !xsC.length ? 'aucun fil' : !Q ? `${pluriel(xsC.length, 'fil')} · ${dj ? 'bornes à vis' : 'contact à sertir inconnu (hors normes)'}` : !M ? `${pluriel(xsC.length, 'fil')} · aucun arrangement : le contact à sertir ne se lit pas`
    : `${nomen.length === 1 ? nomen[0].n + ' × ' + ident(motSertir(nomen[0])) : pluriel(xsC.length, 'contact')} · ${refus ? `<span class="fi-ko-t">${pluriel(refus, 'refusé')}</span>` : 'tous acceptent leur jauge'}`;
  const secContacts = { cle: 'contacts', titre: ids.length > 1 ? 'Contacts · ' + (sel === '—' ? 'sans connecteur' : sel) : 'Contacts', resume: resumeCt,
    badge: badgeProblemes(probs, 'contacts') || (xsC.length ? { t: String(xsC.length), etat: M ? (refus ? 'ko' : 'ok') : '' } : null), contenu: xsC.length ? lignesContacts(nom + '|' + sel, xsC, { sansTable: !M }) : '', vide: xsC.length ? '' : 'aucun fil sur ce connecteur' };

  /* l'HABILLAGE : une ligne par connecteur */
  const habits = C.map(x => { const kx = parNom.get(x.nom), filsX = x.bornes.flatMap(bo => b.parBorne.get(bo) || []).filter(f => f.l); return { cle: nom + '|' + x.nom, titre: x.nom, fils: filsX, pn: x.pn, ref: kx && kx.plan.modules[0] ? kx.plan.modules[0].reference : '', nomen: kx ? kx.plan.nomenclature : null }; }).filter(h => h.fils.length);
  const sections = [sectionIdentiteBloc(nom, probs),
    { cle: 'connecteur', titre: C.length > 1 ? 'Connecteurs' : 'Connecteur', resume: resumeC, badge: badgeProblemes(probs, 'connecteur') || (C.length ? { t: String(C.length), etat: '' } : null), contenu: segs + `<div data-panneau="${escA(sel)}">${corpsC}</div>`, vide: ids.length ? '' : 'aucune borne' },
    secContacts, sectionHabillage(habits, probs, { tableau: dj }), sectionDejaFait(nom)];
  if (dj) { // le disjoncteur : ses sections propres (08 quinquies) ; ses problèmes vont à la section qui existe
    const propres = sectionsDisjoncteur(nom, vt) || [], cles = new Set([...propres.map(s => s.cle), 'identite', 'connecteur', 'contacts', 'habillage', 'dejafait', 'problemes']);
    const repli = propres.some(s => s.cle === 'calibre') ? 'calibre' : (propres[0] && propres[0].cle) || 'problemes';
    probs.forEach(p => { if (!cles.has(p.section)) p.section = repli; });
    propres.forEach(s => { if (!s.badge) s.badge = badgeProblemes(probs, s.cle); });
    sections.push(...propres); }
  else sections.push(sectionFils(fils, probs), sectionChute(fils, probs), sectionDetail(null));
  const presentes = new Set(sections.map(s => s.cle)); sections.push(sectionProblemes(probs, s => presentes.has(s) ? s : null));
  return enTete({ type, nom, champ: 'eq-rep', sous, probs }) + ficheSections(type, sections)
    + fiPied({ tableau: nom, fil: nom, relief: cav.length > 0, menu: MENU_BLOC }); }

/* ---- L'HABILLAGE : ce qu'on sertit, le toron, ce qui l'englobe ----------------------------------------------------- */
/* Le raccord, le band-it, le manchon, la gaine, avec leur référence quand la table la donne — par le tutoriel, selon
   ce qu'on choisit sous « Changer » (reprise de blindage, étanchéité, orientation, gaine). La désignation du raccord se
   corrige à la main (origine, ↺) ; le choix se garde avec le contrat. items : [{ cle, titre, fils, pn, ref, nomen }] */
const PUCES_RACCORD = [['blindage', 'reprise de blindage', [['NO', 'aucune'], ['GND', 'sur le corps'], ['BLI', 'par cosse'], ['CONTACT', 'sur un contact']]],
  ['etanche', 'étanchéité', [['false', 'pas requise'], ['true', 'requise']]], ['orientation', 'raccord', [['droit', 'droit'], ['coudé', 'coudé']]], ['gaine', 'gaine', [['', 'aucune'], ['HFA', 'HFA'], ['NOMEX', 'Nomex']]]];
const MOTS_BLINDAGE = { NO: 'sans reprise de blindage', GND: 'blindage repris sur le corps', BLI: 'blindage repris par cosse', CONTACT: 'blindage repris sur un contact' };
// le toron et le raccord d'un connecteur, en deux mots — et la désignation construite
function habitDe(cle, fils, pn, ref) { if (!fils.length) return null; const h = habillage(app.norme, fils, app.contrat.raccords.get(cle), pn, ref, app.simu);
  return { toron: h.faisceau.diametre != null ? 'Ø ' + mm(h.faisceau.diametre) + ' mm' : '', raccord: h.raccord === 'aucun' ? 'sans raccord' : h.raccord, designation: h.designation, h }; }
const SENS_STATUT_RACCORD = { structure: 'La désignation EN 3660 est vérifiée ; les cotes de cette taille ne sont pas lues (recherche R4)', 'déduit': 'La norme ne nomme pas cette famille : déduit du filetage commun avec l’EN 2997 (recherche R4)', 'à confirmer': 'Ni dessin ni désignation lus : à confirmer par le lecteur' };
function habillageHtml(it, tableau) { const { cle, fils, pn, ref, nomen } = it, h = habillage(app.norme, fils, app.contrat.raccords.get(cle), pn, ref, app.simu), c = h.choix, f = h.faisceau, choisi = app.contrat.raccords.get(cle) || {};
  const sertir = nomen && nomen.length ? nomen.map(x => `<b>${x.n}×</b> ${ident(x.reference)}${x.accessoire ? ` <i>+ ${ident(x.accessoire)}</i>` : ''}`).join(' · ') : '';
  const toron = f.diametre != null ? `<b>Ø ${esc(mm(f.diametre))} mm</b>${f.complet ? '' : ' <i>?</i>'} · ${f.n} ${f.n > 1 ? 'câbles' : 'câble'}${f.masse > 0 ? ' · ' + esc(mm(f.masse)) + ' g/m' : ''}${f.inconnus.length ? ` <i class="fi-ko-t">${esc(f.inconnus.join(', '))} : inconnu de la base</i>` : ''}` : (f.inconnus.length ? `<i class="fi-ko-t">${esc(f.inconnus.join(', '))} : inconnu de la base</i>` : '');
  const aConfirmer = (t, titre) => `<i class="fi-avenir" title="${escA(titre || 'La désignation complète n’est pas encore dans la table Raccords de la norme')}">${esc(t)}</i>`, R = h.reference, K = h.classe;
  const statut = R && h.statut && h.statut !== 'vérifié' ? ' ' + aConfirmer(h.statut, SENS_STATUT_RACCORD[h.statut]) : '';
  const classeMot = K ? (K.lettre ? `classe ${esc(K.raccord)} (${esc([K.materiau, K.fini].filter(Boolean).join(' '))} : connecteur ${esc(K.lettre)})` : 'classe N (alu nickel, par défaut)') : '';
  const chambre = h.longueur ? `chambre ${esc(h.longueur)} (${esc(nombre(LONGUEURS_CHAMBRE[h.longueur]))} mm, par défaut)` : '';
  const entree = h.entree ? ` · entrée ${ident(h.entree.code, true)} <i>${esc(nombre(h.entree.dmin))}–${esc(nombre(h.entree.dmax))} mm${h.entree.bb != null ? ' · bande sur Ø ' + esc(nombre(h.entree.bb)) : ''}${h.entree.cc != null ? ' · épaulement Ø ' + esc(nombre(h.entree.cc)) : ''}</i>` : '';
  // la désignation du raccord : celle de la table, ou celle qu'on a écrite (origine, ↺)
  const desMain = choisi.designation || '', desAuto = h.designation || (R ? R.norme : '');
  const raccord = tableau ? '<i>disjoncteur de tableau : pas de raccord</i>' : h.sansRaccord ? `<i>${esc(h.pourquoi)}</i>${h.aConfirmer ? ' ' + aConfirmer('à confirmer', 'Une règle d’atelier du tutoriel — l’EN 3660-063 (droit) et le -062 (coudé) existent pour l’EN 3645 : à confirmer par le lecteur') : ''}`
    : h.raccord === 'tyrap' ? `<b>tyrap</b>${R ? ' · ' + (h.designation ? ident(h.designation, true) : ident(R.norme)) + statut : ''}${h.tyrap ? ' · ' + ident(h.tyrap.reference) + (h.tyrap.longueur ? ` <i>${esc(nombre(h.tyrap.longueur))} mm${h.tyrap.dmax != null ? ' · jusqu’à Ø ' + esc(nombre(h.tyrap.dmax)) + ' mm' : ''}</i>` : '') : ''}`
    : `<b>${esc(h.raccord)}</b>${R ? ` <i>· ${classeMot}${chambre ? ' · ' + chambre : ''}</i>` + statut : ' ' + aConfirmer('référence à venir')}${entree}`;
  const B = h.collier, bandit = !tableau && h.bandit ? (B ? `${ident(B.reference, true)} <i>${[B.dmax != null ? 'jusqu’à Ø ' + nombre(B.dmax) + ' mm' : '', B.masse != null ? nombre(B.masse) + ' g' : '', B.equivalent ? '≈ ' + B.equivalent.reference : ''].filter(Boolean).map(esc).join(' · ')}</i>` : '<i class="fi-ko-t">aucun collier ne va à ce toron</i>') : '';
  const M = h.manchonRef, manchon = !tableau && h.manchon ? (M ? `${ident(M.designation, true)}${M.reference ? ` · ${ident(M.reference)}` : ''} <i>${h.cote != null ? 'raccord ' + esc(nombre(M.hb != null ? M.hb : 0)) + '–' + esc(nombre(M.ha)) + ' · ' : ''}toron ${esc(nombre(M.jb != null ? M.jb : 0))}–${esc(nombre(M.ja))} mm${M.p ? ' · ' + esc(nombre(M.p)) + ' mm' : ''}</i>${h.colle ? (h.colle === 'précollé' ? ' · <i>précollé</i>' : ' · <i>à coller (VG 95343 T15) ou T18 précollé</i>') : ''}` : `<i class="fi-ko-t">aucun manchon ${c.orientation === 'coudé' ? 'coudé' : 'droit'} de la table ne va à Ø ${esc(mm(h.sortie || 0))} mm</i>`) : '';
  const G = h.gaine, gaine = !tableau && c.gaine ? (G ? `${ident(G.reference, true)} <i>${G.role === 'surblindage' ? 'surblindage · Ø int. ' + esc(nombre(G.dint)) + (G.dext != null ? ' · ext. ' + esc(nombre(G.dext)) : '') + ' mm' : 'protection · toron ' + esc(nombre(G.dmin)) + '–' + esc(nombre(G.dmax)) + ' mm'}${G.masse != null ? ' · ' + esc(nombre(G.masse)) + ' g/m' : ''}</i>` : `<i class="fi-ko-t">aucune gaine ${esc(c.gaine)} ne va à ce toron</i>`) : '';
  const manque = tableau ? '' : (() => { const xs = h.manquants.filter(m => !(h.manchon && !h.manchonRef && /^aucun manchon/.test(m))); return xs.length ? xs.map(m => `<i class="fi-avenir fi-long">${esc(m)}</i>`).join('<br>') : ''; })();
  const choix = [MOTS_BLINDAGE[c.blindage] || MOTS_BLINDAGE.NO, c.etanche ? 'zone étanche' : 'pas d’étanchéité', c.orientation === 'coudé' ? 'coudé' : 'droit', c.gaine ? 'gaine ' + c.gaine : 'sans gaine'].join(' · ');
  const k = 'rac|' + cle, segments = PUCES_RACCORD.map(([champ, t, opts]) => `<div class="fi-seg">${voletT(t)}<div class="fi-puces">${opts.map(([v, m]) => `<button class="fi-chip" data-raccord="${escA(cle)}" data-champ="${champ}" data-v="${escA(v)}" aria-pressed="${String(c[champ]) === v}">${esc(m)}</button>`).join('')}</div></div>`).join('');
  const designation = !tableau && !h.sansRaccord && (R || desMain) ? ligneChamp('désignation', saisie(`data-rac-ref="${escA(cle)}"`, desMain || desAuto, { mono: true, ph: 'à écrire', label: 'Désignation du raccord', long: true }), { origine: desMain ? origine('main') : origine('norme', 'Construite par la table Raccords de la norme'), auto: desMain ? retourAuto('rac:' + cle, desAuto || 'la table') : '' }) : '';
  return `<div class="fi-hab" data-hab="${escA(cle)}"><div class="fi-hab-tete"><span class="fi-hab-t">${esc(it.titre)}</span><span class="fi-choix-mots" title="${escA(choix + ' — ' + (h.pourquoi || ''))}">${tableau ? 'toron seul' : esc(choix)}</span>${tableau ? '' : boutonChanger(k, 'Les choix du tutoriel : blindage, étanchéité, orientation, gaine')}</div>`
    + listeChoix(k, segments, { titre: 'Les choix d’habillage' })
    + faits([['à sertir', sertir], ['toron', toron, f.diametre != null ? (f.foisonnement && f.foisonnement.regle || 'La section cumulée des câbles, en rond, foisonnée') : ''],
      ['boîtier', h.taille ? `<b>${esc(h.taille)}</b>${h.filetage ? ` · ${esc(h.filetage.filetage)}` : ''}` : '', 'La taille du boîtier, lue dans le part number'], ['raccord', raccord, h.pourquoi],
      ['band-it', bandit], ['manchon', manchon], ['gaine', gaine], ['manque', manque, 'Ce que la norme ne dit pas encore : à compléter dans la table']], 'serre')
    + (designation ? champs([designation]) : '') + '</div>'; }
function sectionHabillage(items, probs, o) { o = o || {}; if (!items.length) return { cle: 'habillage', vide: 'aucun connecteur à habiller' };
  const hs = items.map(it => ({ it, x: habitDe(it.cle, it.fils, it.pn, it.ref) })).filter(y => y.x), raccords = [...new Set(hs.map(y => o.tableau ? 'disjoncteur de tableau' : y.x.h.sansRaccord ? 'sans raccord (' + (nomDeFamille(app.norme, y.x.h.sansRaccord) || y.x.h.sansRaccord) + ')' : y.x.raccord))];
  const manque = hs.reduce((n, y) => n + (o.tableau ? 0 : y.x.h.manquants.length), 0);
  const resume = `${hs.map(y => y.it.titre).join(', ')} : ${raccords.join(', ')} · toron ${hs.map(y => y.x.toron.replace(/^Ø /, '').replace(/ mm$/, '')).filter(Boolean).join(' / ')}${hs.some(y => y.x.toron) ? ' mm' : ''}`;
  return { cle: 'habillage', resume: insecable(esc(resume)), badge: badgeProblemes(probs, 'habillage') || (manque ? { t: String(manque), etat: 'att' } : { t: String(hs.length), etat: '' }), contenu: hs.map(y => habillageHtml(y.it, o.tableau)).join('') }; }

/* ---- UNE BARRETTE (et une barrette à poser) ------------------------------------------------------------------------ */
function ficheBarrette(nom) { const aPoser = VT_A_POSER.test(nom), L = liaisonsDeRepere(nom);
  const { besoins: b, plan: Q, main } = planDeBarrette(nom), M0 = Q.modules[0], N = app.norme;
  const refuses = Q.fils.filter(x => x.jaugeOk === false);
  const probs = [...Q.verdicts.filter(v => v.niveau === 'ko').map(v => ({ niveau: 'ko', texte: v.texte, section: 'connecteur' })), ...refuses.map(x => ({ niveau: 'ko', texte: `${x.f.cable || 'fil à créer'} (${x.f.type}) : jauge refusée par le contact ${x.contact.lettre}`, section: 'contacts', viser: cleFil(x.f.l) }))];
  const raccord = aPoser ? L.find(l => l.aPoser === nom && l.origine === null && l.vers === nom && l.borneVers === '1') : null, sur = raccord ? raccord.de + ':' + raccord.borneDe : '';
  if (aPoser) probs.push({ niveau: 'att', texte: 'repère provisoire : lui donner son vrai repère la pose au contrat', section: 'identite' });
  ((typeof CONTROLE !== 'undefined' && CONTROLE.items) || []).filter(x => x.nom === nom && !probs.some(p => p.texte === x.texte) && !/^à poser sur/.test(x.texte)).forEach(x => probs.push({ niveau: x.niveau === 'ko' ? 'ko' : 'att', texte: x.texte, section: /contact/.test(x.texte) ? 'contacts' : 'connecteur' }));
  const sous = aPoser ? `barrette à poser sur <b>${esc(sur)}</b>` : ['barrette', Q.reference ? ident(Q.reference, true) : '', pluriel(Q.potentiels, 'potentiel'), pluriel(Q.fils.length, 'fil')].filter(Boolean).join(' · ');
  const pnNorme = b.pn && familleDeReference(N, b.pn), groupes = Q.modules.reduce((n, M) => n + M.module.groupes.length, 0), libres = Q.contacts - Q.utilises;
  const pourquoi = main ? 'choisi à la main' : !Q.modules.length ? 'aucun module ne loge ces fils' : (Q.main ? 'norme choisie à la main · ' : pnNorme ? 'la norme du part number · ' : '')
    + (Q.modules.length > 1 ? `${Q.potentiels} potentiels sur ${Q.modules.length} modules` : `le plus petit module qui loge ${pluriel(Q.potentiels, 'potentiel')}`);
  /* le MODULE : la référence (origine, Changer, ↺), l'écart avec le retest, la norme, ce qu'il loge, la face */
  const par = new Map(); Q.fils.forEach(x => par.set(x.module + '|' + x.contact.lettre, x));
  const faces = Q.modules.map((M, k) => faceAjustee(faceModuleSvg(M.module, ct => { const x = par.get(k + '|' + ct.lettre); return x ? occupant(x.f, x.jaugeOk === false) : null; }, { etiquettes: true }), (Q.modules.length > 1 ? (k + 1) + ' · ' + M.reference : M.reference) + ' · face côté contacts')).join('');
  const fs = Q.famille ? [Q.famille] : famillesDeModules(N), retenu = M0 && (main || Q.modules.length === 1) ? M0.reference : '';
  const cands = fs.map(f => variantesQuiLogent(b, N, f).slice(0, 6)).flat().map(m => candidat(nom, m, retenu)).join('');
  const liste = listeChoix('bar|' + nom, voletT('norme') + puces('data-norme-barrette', [['', 'automatique'], ...famillesDeModules(N).map(f => [f, nomDeFamille(N, f)])], main ? null : Q.main ? Q.famille : '')
    + voletT('variante') + (cands ? `<div class="fi-cands">${cands}</div>` : '<p class="fi-note">Aucune variante ne loge la barrette d’un seul module.</p>'), { titre: 'Modules qui logent ces potentiels', pied: M0 ? `<button class="fi-lien" data-bible="${escA(M0.reference)}">voir dans la bible</button>` : '' });
  const autoRef = main || Q.main ? remplirModules(b, N, '').reference : '';
  const ecart = !aPoser && b.pn && Q.reference && cleNorme(b.pn) !== cleNorme(Q.reference) && moduleDeReference(N, b.pn) ? `retest : ${ident(b.pn)} · retenu : ${ident(Q.reference)} — <button class="fi-lien" data-garder="${escA(b.pn)}">garder le retest</button>` : '';
  const corpsC = aPoser && !M0 ? '<p class="fi-note">Le module se choisit quand la barrette est posée au contrat.</p>' : champs([
    ligneChamp('module', Q.reference ? ident(Q.reference, true) : '<b class="fi-ko-t">aucun</b>', { origine: main ? origine('main') : Q.main ? origine('main', 'La norme est choisie à la main') : origine('auto'), auto: main || Q.main ? retourAuto('arr:' + nom, autoRef) : '', changer: aPoser ? '' : boutonChanger('bar|' + nom, 'Choisir une autre norme ou une autre variante'), sous: `<i>${esc(pourquoi)}</i>${ecart ? '<br>' + ecart : ''}`, liste }),
    M0 ? ligneChamp('norme', esc(nomDeFamille(N, M0.module.famille) || M0.module.famille)) : '',
    M0 ? ligneChamp('loge', `${pluriel(Q.potentiels, 'potentiel')} · ${pluriel(Q.fils.length, 'fil')} · ${plurielLie(libres, 'contact')} libre${s_(libres)} · ${pluriel(groupes - Q.places, 'groupe')} libre${s_(groupes - Q.places)}`) : ''])
    + (faces ? `<div class="fi-faces">${faces}</div>${legendeFaces(refuses.length, Q.fils.map(x => x.f), libres)}` : '');
  /* les CONTACTS, par potentiel */
  const borneDe = f => f.borneBarrette || (f.l && (f.l.de === nom ? f.l.borneDe : f.l.borneVers)) || '';
  const tri = Q.fils.slice().sort((a, c) => a.module - c.module || a.groupe.k - c.groupe.k || triBornes(borneDe(a.f), borneDe(c.f)));
  let dernier = null, kPot = 0; const xsC = [];
  tri.forEach(x => { const pot = x.potentiel.bornes.join(', ');
    if (!aPoser && pot !== dernier) { kPot++; xsC.push({ groupe: `Potentiel ${kPot} — ${x.potentiel.bornes.length > 1 ? 'bornes' : 'borne'} ${esc(pot)} <i>· ${esc(x.groupe.nom)}</i>` }); dernier = pot; }
    xsC.push({ ct: `<b>${esc((Q.modules.length > 1 ? (x.module + 1) + '·' : '') + x.contact.lettre)}</b><i>${esc(borneDe(x.f))}</i>`, f: x.f, sertir: x.sertir || null, ko: x.jaugeOk === false ? 'jauge refusée par le contact' : '' }); });
  (Q.restants || []).forEach(p => p.fils.forEach(f => xsC.push({ ct: `<b>${esc(borneDe(f))}</b>`, f, ko: 'sans place dans le module' })));
  const nf = xsC.filter(x => x.f).length, sansTable = !Q.fils.some(x => x.sertir), famT = M0 ? nomDeFamille(N, M0.module.famille) || M0.module.famille : '';
  const secContacts = { cle: 'contacts', titre: 'Contacts', resume: insecable(`${aPoser ? pluriel(nf, 'borne') : pluriel(Q.potentiels, 'potentiel') + ' · ' + pluriel(nf, 'fil')}${sansTable && M0 ? ` · contact à sertir : la table ${esc(famT)} manque` : ''}`),
    badge: badgeProblemes(probs, 'contacts') || (nf ? { t: String(nf), etat: refuses.length ? 'ko' : M0 ? 'ok' : '' } : null),
    contenu: nf ? (sansTable && M0 ? `<p class="fi-note">La table des contacts à sertir de la ${esc(famT)} n’est pas dans les normes embarquées : <button class="fi-lien" data-action="normes">l’envoyer (les normes)</button> — la colonne « à sertir » se remplira.</p>` : '') + lignesContacts(nom, xsC, { sansTable }) : '', vide: nf ? '' : 'aucun fil' };
  // la chute à travers la barrette : deux sertissages et la barre, par la résistance de contact de la taille
  const tailles = [...new Set(Q.fils.map(x => x.taille).filter(Boolean))], R = tailles.map(t => resistanceDeContact(N, t, false, 'jonction')).filter(r => r != null);
  const passage = R.length ? `À travers la barrette : 2 × ${nombre(arrondi(Math.max(...R) * 1000, 2))} mΩ par contact (taille ${tailles.join(', ')}) — ${volts(2 * Math.max(...R) * (app.simu || HYPOTHESES).courant)} sous ${nombre((app.simu || HYPOTHESES).courant)} A.` : '';
  const fils = filsDuRepere(nom), presentes = new Set(['identite', 'connecteur', 'contacts', 'fils', 'chute', 'dejafait', 'detail']); probs.push(...problemesDesFils(fils));
  const poser = aPoser ? `<div class="fi-poser"><span>poser au contrat sous</span>${saisie('id="vt-repere"', repereLibre(raccord ? raccord.de : '', 'VT'), { mono: true, label: 'Le vrai repère de la barrette', court: true })}<button class="btn cuivre" id="vt-poser">Poser</button></div>` : '';
  const sections = [sectionIdentiteBloc(nom, probs, { apres: poser, ouvert: aPoser ? true : undefined }),
    { cle: 'connecteur', titre: 'Module', resume: aPoser && !M0 ? 'se choisit quand la barrette est posée' : `${Q.reference ? ident(Q.reference) : '<span class="fi-ko-t">aucun module</span>'} · ${pluriel(Q.potentiels, 'potentiel')} · ${pluriel(Q.fils.length, 'fil')} · ${plurielLie(libres, 'libre')}`,
      badge: badgeProblemes(probs, 'connecteur') || (Q.modules.length ? { t: String(Q.modules.length), etat: '' } : null), contenu: corpsC },
    secContacts, sectionFils(fils, probs), sectionChute(fils, probs, { passage }), aPoser ? null : sectionDejaFait(nom), sectionDetail(null)];
  sections.push(sectionProblemes(probs, s => presentes.has(s) ? s : null));
  return enTete({ type: 'barrette', nom, champ: 'eq-rep', aide: aPoser ? 'Écrire le vrai repère : la barrette entre au contrat' : '', sous, probs }) + ficheSections('barrette', sections)
    + fiPied(aPoser ? { voir: raccord && raccord.de, relief: !!M0, menu: [['fi-renommer', 'Nommer et poser au contrat']] } : { tableau: nom, fil: nom, relief: true, menu: MENU_BLOC }); }
/* Le prochain repère libre d'un code dans la zone d'un équipement : « 102VT1 » si personne ne le porte. */
function repereLibre(voisin, code) { const q = lireRepere(voisin), zone = q && q.num ? q.num : '', pris = new Set(reperesDe(verite()));
  for (let n = 1; n < 1000; n++) { const r = zone + code + n; if (!pris.has(r)) return r; } return zone + code + '1'; }

/* ---- UNE PRISE DE COUPURE ------------------------------------------------------------------------------------------ */
function ficheCoupure(nom) { const { besoins: b, points, plan: Q } = planDeCoupure(nom), M = Q.modules[0], N = app.norme;
  const probs = Q.verdicts.filter(v => v.niveau === 'ko' || v.niveau === 'attention').map(v => ({ niveau: v.niveau === 'ko' ? 'ko' : 'att', texte: v.texte, section: /pour ce fil|jauge refusée|fils/.test(v.texte) ? 'contacts' : 'connecteur' }));
  ((typeof CONTROLE !== 'undefined' && CONTROLE.items) || []).filter(x => x.nom === nom && !probs.some(p => p.texte === x.texte)).forEach(x => probs.push({ niveau: x.niveau === 'ko' ? 'ko' : 'att', texte: x.texte, section: /contact/.test(x.texte) ? 'contacts' : 'connecteur' }));
  const nums = points.map(p => p.num).join(', '), types = typesDe(Q.fils.map(x => x.f)), refuses = Q.fils.some(x => x.jaugeOk === false);
  const pourquoi = Q.main ? 'choisi à la main' : Q.nomme ? `le part number du fichier (${b.pn}) nomme cet arrangement` : !M ? 'aucun arrangement ne loge ces contacts avec ces jauges' : `le plus petit arrangement qui a les contacts ${nums} et accepte ${types || 'ces fils'}`;
  const amont = Q.fils.filter(x => x.f.amont), aval = Q.fils.filter(x => !x.f.amont);
  let faces = '';
  if (M) { const par = (am, ct) => { const xs = Q.fils.filter(x => x.contact === ct && !!x.f.amont === am); return xs.length ? occupant(xs[0].f, xs.some(x => x.jaugeOk === false)) : null; };
    faces = `<div class="fi-faces deux">${faceAjustee(faceModuleSvg(M.module, ct => par(true, ct), { etiquettes: true }), 'Fiche · ce qui arrive')}`
      + `${faceAjustee(faceModuleSvg(miroir(M.module), ct => par(false, M.module.contacts.find(k => k.lettre === ct.lettre)), { etiquettes: true }), 'Embase · ce qui repart')}</div>` + legendeFaces(refuses, Q.fils.map(x => x.f), M.module.contacts.length - Q.utilises); }
  const vs = arrangementsQuiLogent(points, N, Q.visee || Q.famille).slice(0, 8), retenu = M ? M.reference : '';
  const liste = listeChoix('cou|' + nom, voletT('norme') + puces('data-norme-prise', [['', 'automatique'], ...famillesDeModules(N, 'connecteur').map(f => [f, nomDeFamille(N, f)])], Q.main ? null : (Q.visee || ''))
    + voletT('arrangement') + (vs.length ? `<div class="fi-cands">${vs.map(m => candidat(nom, m, retenu)).join('')}</div>` : '<p class="fi-note">Aucun arrangement de cette norme ne convient.</p>'), { titre: 'Arrangements qui logent ces contacts', pied: M ? `<button class="fi-lien" data-bible="${escA(M.reference)}">voir dans la bible</button>` : '' });
  const autoRef = Q.main || Q.visee ? coupureEnModule(nom, verite(), N, '', sexeChoisi(nom)).plan.reference : '';
  const corpsC = champs([
    ligneChamp('arrangement', M ? ident(M.reference, true) : '<b class="fi-ko-t">aucun</b>', { origine: Q.main ? origine('main') : Q.visee ? origine('main', 'La norme est choisie à la main') : Q.nomme ? origine('retest', 'Le part number du fichier le nomme') : origine('auto'), auto: Q.main || Q.visee ? retourAuto('arr:' + nom, autoRef) : '', changer: boutonChanger('cou|' + nom, 'Choisir une autre norme ou un autre arrangement'), sous: `<i>${esc(pourquoi)}</i>`, liste }),
    lignePn(nom, nom, b.bornes, b.pn),
    Q.tableContacts ? ligneChamp('sexe', `<span class="fi-puces fi-sexe" role="group" aria-label="Sexe des contacts">${[['F', 'fiche femelle', 'La fiche (ce qui arrive) en douilles, l’embase en broches'], ['M', 'fiche mâle', 'La fiche (ce qui arrive) en broches, l’embase en douilles']].map(([v, t, tt]) => `<button class="fi-chip" data-sexe="${escA(nom)}" data-v="${v}" aria-pressed="${Q.sexe === v}" title="${tt}">${t}</button>`).join('')}</span>`,
      { origine: sexeChoisi(nom) ? origine('main') : origine('auto', 'La fiche (ce qui arrive) en douilles'), auto: sexeChoisi(nom) ? retourAuto('sexe:' + nom, 'fiche femelle') : '' }) : ''])
    + faces;
  /* les PAIRES : chaque contact, ce qui arrive ⇄ ce qui repart */
  const unSeul = xs => { const n = nomenclatureDe(xs); return n.length === 1 ? motSertir(n[0]) : ''; }, seulF = unSeul(amont), seulE = unSeul(aval);
  const cote = x => x ? `<span class="fi-cote" data-i="${cleFil(x.f.l)}" tabindex="0" role="button" title="${escA((x.f.cable || 'fil') + (x.sertir ? ' · contact ' + motSertir(x.sertir) : '') + ' — ouvrir sa fiche')}">${puceFil(x.f)}<b>${esc(destination(x.f))}</b><small>${esc(x.f.type || '')}${x.f.cable ? ' · ' + esc(x.f.cable) : ''}${x.sertir && motSertir(x.sertir) !== (x.f.amont ? seulF : seulE) ? ' · ' + esc(motSertir(x.sertir)) : ''}</small></span>` : '<span class="fi-cote vide">—</span>';
  const lignes = (M ? M.module.contacts : []).map(ct => { const am = Q.fils.find(x => x.contact === ct && x.f.amont), av = Q.fils.find(x => x.contact === ct && !x.f.amont); if (!am && !av) return '';
    return `<li class="fi-paire${[am, av].some(x => x && x.jaugeOk === false) ? ' ko' : ''}"><span class="fi-ct"><b>${esc(ct.lettre)}</b></span>${cote(am)}<span class="fi-entre" aria-hidden="true"></span>${cote(av)}</li>`; }).join('');
  const nP = (lignes.match(/class="fi-paire/g) || []).length;
  const secContacts = { cle: 'contacts', titre: 'Contacts', resume: insecable(`${pluriel(nP, 'paire')} arrive ⇄ repart${seulF ? ' · fiche ' + esc(seulF) : ''}${seulE && seulE !== seulF ? ' · embase ' + esc(seulE) : ''}`),
    badge: badgeProblemes(probs, 'contacts') || (nP ? { t: String(nP), etat: refuses ? 'ko' : 'ok' } : null),
    contenu: lignes ? `<div class="fi-paires-tete"><span></span><span>fiche · arrive</span><span></span><span>embase · repart</span></div><ul class="fi-liste paires">${lignes}</ul>` : '', vide: lignes ? '' : 'aucun contact posé' };
  const habits = [['fiche', amont], ['embase', aval]].filter(([, xs]) => xs.length).map(([t, xs]) => ({ cle: nom + '|' + t, titre: t, fils: xs.map(x => x.f), pn: b.pn, ref: Q.reference, nomen: nomenclatureDe(xs) }));
  const F = familleDeNorme(N, null, b.pn), rP = F && F.resistance != null ? F.resistance / 1000 : null;
  const passage = rP != null ? `À travers la prise : une paire accouplée, ${nombre(arrondi(rP * 1000, 2))} mΩ — ${volts(rP * (app.simu || HYPOTHESES).courant)} sous ${nombre((app.simu || HYPOTHESES).courant)} A.` : '';
  const fils = filsDuRepere(nom), presentes = new Set(['identite', 'connecteur', 'contacts', 'fils', 'chute', 'habillage', 'dejafait', 'detail']); probs.push(...problemesDesFils(fils));
  const sous = ['prise de coupure', Q.reference ? ident(Q.reference, true) : '', pluriel(points.length, 'contact'), pluriel(Q.fils.length, 'fil')].filter(Boolean).join(' · ');
  const sections = [sectionIdentiteBloc(nom, probs),
    { cle: 'connecteur', titre: 'Arrangement', resume: `${M ? ident(M.reference) : '<span class="fi-ko-t">aucun arrangement</span>'} · ${pluriel(points.length, 'contact')}${Q.tableContacts ? ' · fiche ' + (Q.sexe === 'M' ? 'mâle' : 'femelle') : ''}`, badge: badgeProblemes(probs, 'connecteur') || { t: '1', etat: '' }, contenu: corpsC },
    secContacts, sectionFils(fils, probs), sectionChute(fils, probs, { passage }), sectionHabillage(habits, probs), sectionDejaFait(nom), sectionDetail(null)];
  sections.push(sectionProblemes(probs, s => presentes.has(s) ? s : null));
  return enTete({ type: 'prise', nom, champ: 'eq-rep', sous, probs }) + ficheSections('prise', sections) + fiPied({ tableau: nom, fil: nom, relief: true, menu: MENU_BLOC }); }

/* ---- UN BORNIER HORS MODULES (une bible importée sans modules) ----------------------------------------------------- */
function ficheBornierAncien(nom) { const V = verite(), b = besoinsDeBarrette(nom, V);
  const P = remplirSelonNorme(physiqueDeBarrette(nom, V, app.bible, app.contrat.designations.get(nom) || ''), app.norme);
  return enTete({ type: estCoupure(nom) ? 'prise' : 'barrette', nom, champ: 'eq-rep', sous: estCoupure(nom) ? 'prise de coupure' : 'barrette', probs: [] })
    + ficheSections('barrette', [sectionIdentiteBloc(nom, []), { cle: 'connecteur', titre: 'Référence', resume: 'la bible des barrettes', contenu: `<div class="equip">${cartePhysique(nom, P, b)}</div>`, ouvert: true }])
    + fiPied({ tableau: nom, relief: true, menu: MENU_BLOC }); }

/* ---- UN FIL --------------------------------------------------------------------------------------------------------- */
/* LA FICHE D'UN FIL, pour celui qui le pose : son identité (numéro, câble, route, longueur, folio — tout se corrige),
   d'où à où (deux cartes : un clic ouvre l'équipement sur le bon connecteur, le contact allumé), les contacts à ses deux
   bouts, l'intensité contre ce qu'il admet, la chute, le détail du calcul. */
function ficheFil(l) { const coul = coulDeFil({ l }), neuf = l.origine === null, jauge = jaugeDuType(l.type), st = sertirDuFil(l), N = app.norme;
  const folios = neuf ? [app.plan] : foliosDe(l), x = intensiteDuFil(l), ch = chuteDuFil(l, x), H = x.H, cab = l.type ? cableDuType(N, l.type) : null;
  // sur le plan, un bout peut passer par une barrette à poser : on le dit sous les cartes
  const p = neuf ? null : liaisonsDuPlan().find(y => y.origine && y.aPoser && sourceDe(y) === l);
  const via = cote => { if (!(p && VT_A_POSER.test(p[cote]))) return ''; let lettre = ''; try { const y = planDeBarrette(p[cote]).plan.fils.find(z => z.f.l === p); if (y) lettre = y.contact.lettre; } catch (_) { }
    return p[cote] + ' · ' + (lettre ? lettre + ' (borne ' + (cote === 'de' ? p.borneDe : p.borneVers) + ')' : 'borne ' + (cote === 'de' ? p.borneDe : p.borneVers)); };
  const probs = [];
  if (!l.type) probs.push({ niveau: 'att', texte: 'type de fil inconnu : la jauge ne se vérifie pas', section: 'identite' });
  if (neuf) probs.push({ niveau: 'att', texte: 'fil à créer : il prend son numéro quand ' + l.aPoser + ' est posée au contrat', section: 'identite' });
  [st.de, st.vers].forEach((s, k) => { if (s && s.ko) probs.push({ niveau: 'ko', texte: 'aucun contact n’accepte ce fil côté ' + (k ? l.vers : l.de), section: 'contacts' }); });
  if (x.rd.refuse) probs.push({ niveau: 'att', texte: 'conducteur ' + x.rd.conducteur + ' sans résistance dans la base : la ligne cuivre de l’EN 2853 ne vaut pas, la chute n’est pas calculée', section: 'detail' });
  x.trop.forEach(pt => probs.push({ niveau: 'ko', texte: `${pt.nom} ${amperes(pt.i)}${pt.t === Infinity ? '' : ' pendant ' + secondes(pt.t)} : plus que ce que le fil admet (${amperes(intensiteAdmise(x.fn, pt.t) * x.fac)})`, section: 'fils' }));
  if (ch.trop) probs.push({ niveau: ch.reel ? 'ko' : 'att', texte: `la chute en ligne depuis ${x.al.nom} atteint ${volts(ch.total.dU)} : plus que les ${volts(ch.max)} admis${ch.reel ? '' : ' (longueurs d’hypothèse)'}`, section: 'chute' });
  /* l'IDENTITÉ : numéro, câble, jauge, route, longueur, folio — chacun avec son origine et ↺ */
  const o = c => origineChamp(l, c), av = c => l.avant && c in l.avant ? (l.avant[c] == null || l.avant[c] === '' ? 'rien' : String(l.avant[c])) : '', retour = c => o(c) === 'main' ? retourAuto('champ:' + c, c === 'longueur' && av(c) === 'rien' ? 'hypothèse ' + nombre(H.longueur) + ' m' : c === 'longueur' ? nombre(arrondi(+l.avant[c], 2)) + ' m' : av(c)) : '';
  const orig = c => o(c) === 'main' ? origine('main', 'Écrit sur la fiche ; le fichier portait ' + av(c)) : o(c) === 'hyp' ? origine('hyp', 'L’hypothèse de la simulation') : l[c] || c === 'longueur' ? origine('retest', 'Lu dans le fichier') : '';
  const routes = [...couleursDesRoutes().keys()].filter(Boolean), brins = cab ? (cab.brins > 1 ? cab.brins + ' brins' : '1 brin') + (cab.blindage ? ' + blindage' : '') : '';
  const L = l.longueur > 0 ? l.longueur : null, modeF = modeFolio();
  const identite = neuf ? champs([ligneChamp('numéro', '<i>à créer</i>', { sous: '<i>il le prend quand la barrette est posée au contrat</i>' }), ligneChamp('câble', l.type ? ident(l.type, true) : '<i>inconnu</i>')]) : champs([
    ligneChamp('numéro', saisie('data-edit="cable"', l.cable, { mono: true, ph: 'à écrire', label: 'Numéro du fil' }), { origine: orig('cable'), auto: retour('cable') }),
    ligneChamp('câble', saisie('data-edit="type"', l.type, { mono: true, ph: 'DR20, DM24…', label: 'Type de câble', liste: 'fi-cables' }), { origine: orig('type'), auto: retour('type'), sous: cab ? `<i>${esc([brins, cab.nature, cab.diametre != null ? 'Ø ' + nombre(cab.diametre) + ' mm' : '', cab.section != null ? nombre(cab.section) + ' mm²' : '', cab.resistance != null ? nombre(cab.resistance) + ' mΩ/m' : '', cab.masse != null ? nombre(cab.masse) + ' g/m' : ''].filter(Boolean).join(' · '))}</i>` : l.type ? '<i class="fi-ko-t">inconnu de la base des câbles</i>' : '' }),
    ligneChamp('jauge', jauge != null ? `${jauge} AWG${cab && cab.diametre != null ? ' · Ø ' + nombre(cab.diametre) + ' mm' : ''}` : '<i>—</i>', { origine: jauge != null ? origine('norme', 'Lue dans le type du câble') : '' }),
    ligneChamp('route', `${l.route ? `<i class="fi-route" style="--c:${coul}"></i>` : ''}${saisie('data-edit="route"', l.route, { ph: 'aucune', label: 'Route', liste: 'fi-routes' })}`, { origine: orig('route'), auto: retour('route') }),
    ligneChamp('longueur', `${saisie('data-edit="longueur"', L != null ? nombre(arrondi(L, 3)) : '', { ph: nombre(H.longueur), label: 'Longueur en mètres', mode: 'decimal', court: true })}<span class="fc-u">m</span>`,
      { origine: orig('longueur'), auto: retour('longueur'), sous: L == null ? `<i>le retest ne la porte pas : l’${motHypothese} (${nombre(H.longueur)} m) la remplace — écrire la longueur mesurée</i>` : '' }),
    ligneChamp(folios.length > 1 ? 'folios' : 'folio', modeF === 'fichier' ? saisie('data-edit="plan"', l.plan, { ph: '—', label: 'Folio', court: true }) : esc(folios.join(', ') || '—'), { origine: modeF === 'auto' ? origine('auto', 'Découpé par l’outil') : orig('plan'), auto: modeF === 'fichier' ? retour('plan') : '', sous: modeF === 'auto' ? '<i>découpé par l’outil</i>' : '' }),
    l.harness ? ligneChamp('harness', esc(l.harness) + (l.appareil ? ' · ' + esc(l.appareil) : '')) : '']);
  const datalists = `<datalist id="fi-cables">${cablesDe(N).slice(0, 400).map(c => `<option value="${escA(c.cable)}">${escA([c.nature, c.diametre != null ? 'Ø ' + nombre(c.diametre) + ' mm' : ''].filter(Boolean).join(' · '))}</option>`).join('')}</datalist><datalist id="fi-routes">${routes.map(r => `<option value="${escA(r)}"></option>`).join('')}</datalist>`;
  const resumeId = [l.cable || (neuf ? 'à créer' : 'sans numéro'), l.type || 'type inconnu', l.route || 'sans route', L != null ? nombre(arrondi(L, 2)) + ' m' : 'longueur d’hypothèse', folios.length ? 'folio ' + folios.join(', ') : ''].filter(Boolean).join(' · ');
  /* DE → VERS : deux cartes ; un clic ouvre l'équipement, le connecteur, le contact allumé */
  const bout = (cote, sens) => { const rep = l[cote], borne = cote === 'de' ? l.borneDe : l.borneVers, pn = cote === 'de' ? l.pnDe : l.pnVers, s = st[cote], g = rep ? connecteurParBorne(rep, liaisonsDeRepere(rep)).get(String(borne)) : null;
    const choisi = s ? sertirAuBout(rep, borne, s) : null;
    return `<button class="fi-bout" data-bout="${cote}" title="${escA('Ouvrir ' + rep + (g ? ', connecteur ' + g.nom : '') + ', le contact allumé')}"><i class="fi-bout-k">${sens}</i><span class="fi-bout-rep"><b>${esc(rep || '—')}</b><span>:${esc(borne || '—')}</span></span>`
      + `<small>${esc([g ? g.nom : '', pn].filter(Boolean).join(' · ') || 'sans part number')}</small>`
      + `<small class="fi-bout-ct${s && s.ko ? ' ko' : ''}">${s && s.ko ? 'aucun contact pour ce fil' : choisi ? 'contact : ' + esc(motSertir(choisi)) : s && s.contact ? 'contact ' + esc(s.contact.lettre) : 'contact : hors normes'}</small>${ico('droite', 'fi-bout-va')}</button>`; };
  const passe = [via('de'), via('vers')].filter(Boolean);
  const trajet = `<div class="fi-trajet" style="--c:${coul}">${bout('de', 'de')}<span class="fi-fleche" aria-hidden="true"></span>${bout('vers', 'vers')}</div>${passe.length ? `<p class="fi-note">passe par ${esc(passe.join(' · '))} — barrette à poser</p>` : ''}`;
  /* LES CONTACTS AUX DEUX BOUTS */
  const ligneBout = (cote) => { const rep = l[cote], borne = cote === 'de' ? l.borneDe : l.borneVers, s = st[cote]; if (!s || !rep) return { ct: `<b>${esc(borne || '—')}</b>`, f: { l, cable: l.cable, type: l.type, vers: rep || '—', borne: '' }, dest: (cote === 'de' ? 'de ' : 'vers ') + (rep || '—'), plan: null };
    const Q = coupureEnModules(rep) ? planDeCoupure(rep).plan : barretteEnModules(rep) ? planDeBarrette(rep).plan : (cavitesDe(rep).find(c => c.plan.fils.some(y => y.f.l === l)) || {}).plan;
    const y = Q && Q.fils.find(z => z.f.l === l);
    return { ct: `<b>${esc(borne || '—')}</b>${s.contact ? `<i>${esc(s.contact.lettre)}</i>` : ''}`, f: { l, cable: l.cable, type: l.type }, dest: (cote === 'de' ? 'de ' : 'vers ') + rep, sertir: sertirAuBout(rep, borne, s), rep, borne, plan: y ? { Q, sertir: y.sertir, taille: y.taille, sexe: y.sexe } : null, ko: s.ko ? 'aucun contact pour ce fil' : '' }; };
  const xsB = neuf ? [] : [ligneBout('de'), ligneBout('vers')], connus = xsB.filter(y => y.plan).length;
  const secContacts = { cle: 'contacts', titre: 'Contacts aux deux bouts', resume: insecable(connus ? xsB.map(y => (y.sertir ? motSertir(y.sertir) : 'hors normes')).join(' · ') : `aucun contact à sertir connu (${[l.pnDe, l.pnVers].filter(Boolean).join(', ') || 'sans part number'})`),
    badge: badgeProblemes(probs, 'contacts') || { t: connus ? String(connus) : '—', etat: connus ? 'ok' : '' }, contenu: xsB.length ? lignesContacts('fil|' + idDeLiaison(l), xsB, { tete: true }) : '', vide: xsB.length ? '' : 'le fil est à créer' };
  /* L'INTENSITÉ, en barres contre l'admis */
  const barre = (mot, i, adm, sous) => { const k = adm ? i / adm : null, cls = k == null ? '' : k > 1 + 1e-9 ? 'ko' : k > 0.8 ? 'att' : 'ok';
    return `<div class="fi-jauge-l"><span class="fi-jauge-k">${mot} <b class="${cls === 'ko' ? 'fi-ko-t' : ''}">${esc(amperes(i))}</b></span><span class="fi-barre ${cls}" aria-hidden="true"><i style="width:${k == null ? 0 : (Math.min(1, k) * 100).toFixed(1)}%"></i></span><span class="fi-jauge-p ${cls}">${k == null ? '—' : pourcentage(k)}</span>${sous || adm ? `<span class="fi-jauge-s">${esc([sous, adm ? 'admis ' + amperes(adm) : ''].filter(Boolean).join(' · '))}</span>` : ''}</div>`; };
  const intens = !x.fn ? `<p class="fi-note">${l.type ? 'Fil inconnu de la norme des fils (EN 2853) : ce qu’il admet ne se lit pas.' : 'Sans type, ce qu’il admet ne se lit pas.'}</p>` : barre('permanent', x.I, x.continu, x.al ? '' : 'hypothèse')
    + (x.pointe ? barre('pointe', x.pointe.i, x.pointe.admis, x.pointe.nom + ' · ' + secondes(x.pointe.t)) : '')
    + `<p class="fi-note">admis ${esc(amperes(x.continu))} en continu (EN 2853${motFacteur(x.fac)} : ${esc((H.conditions || []).join(', ') || 'à l’air libre')}, ${nombre(H.ambiante)} °C)${x.al ? ` · sous ${esc(x.al.nom)}${x.al.calibre ? ' (' + esc(amperes(x.al.calibre)) + ')' : ''} — <button class="fi-lien" data-choisir-bloc="${escA(x.al.nom)}">son profil de charge</button>` : ` · aucun disjoncteur en amont : le courant d’${motHypothese}`}</p>`;
  const resumeI = !x.fn ? 'ce qu’il admet ne se lit pas' : x.trop.length ? `<span class="fi-ko-t">${esc(amperes(x.trop[0].i))}${x.trop[0].t === Infinity ? '' : ' pendant ' + esc(secondes(x.trop[0].t))} &gt; ${esc(amperes(intensiteAdmise(x.fn, x.trop[0].t) * x.fac))} admis</span>` : `${esc(amperes(x.I))} ${x.al ? 'permanent' : 'd’hypothèse'} · ${x.charge != null ? pourcentage(x.charge) + ' du continu' : ''}`;
  /* LA CHUTE */
  const resumeU = ch.dU == null ? 'résistance inconnue' : `${volts(ch.dU)} sur ce fil${ch.total ? ` · ${volts(ch.total.dU)} depuis ${esc(x.al.nom)}${H.tension ? ' (' + nombre(Math.round(ch.total.dU / H.tension * 1000) / 10) + ' %' + (ch.max != null ? ', ' + volts(ch.max) + ' admis' : '') + ')' : ''}` : ''}`;
  const chuteC = faits([['sur ce fil', ch.dU != null ? `<b>${volts(ch.dU)}</b> <i>= ${nombre(arrondi(x.rd.rho, 1))} Ω/km × ${nombre(arrondi(ch.L, 2))} m${ch.hyp ? ' (' + motHypothese + ')' : ''} × ${nombre(arrondi(x.I, 2))} A</i>` : '<i>la résistance du fil est inconnue</i>'],
    ['en ligne', ch.total ? `<b>${volts(ch.total.dU)}</b> <i>depuis ${esc(x.al.nom)} jusqu’à ${esc(ch.total.bout[0])}${ch.max != null ? ', ' + volts(ch.max) + ' admis' : ''}</i>` : '<i>aucun disjoncteur en amont</i>'],
    ['chemin', ch.total ? esc(ch.total.segments.map(s => s.fil ? (s.fil.cable || 'fil') + ' ' + volts(s.dU) : '⇄ ' + s.passage + (s.dU != null ? ' ' + volts(s.dU) : '')).join(' → ')) : '']]);
  const detail = sectionDetail(x, { lignes: [['ce fil', `ρ ${x.rd.rho != null ? nombre(arrondi(x.rd.rho, 1)) + ' Ω/km à ' + nombre(x.rd.T) + ' °C' : 'inconnue'}${x.rd.source === 'câble' ? ' <i>(la résistance du câble ' + esc(x.rd.cab.cable) + ')</i>' : x.rd.source === 'jauge' ? ' <i>(la jauge seule, EN 2853)</i>' : ''} · déclassé × ${nombre(arrondi(x.fac, 2))}${x.amb !== 1 ? ' <i>(dont ambiante × ' + nombre(arrondi(x.amb, 2)) + ')</i>' : ''}`]] });
  const presentes = new Set(['identite', 'connecteur', 'contacts', 'fils', 'chute', 'detail']);
  const sections = [{ cle: 'identite', resume: esc(resumeId), badge: badgeProblemes(probs, 'identite'), contenu: identite + datalists },
    { cle: 'connecteur', titre: 'De → vers', resume: esc(`${l.de}${l.borneDe ? ' borne ' + l.borneDe : ''} → ${l.vers}${l.borneVers ? ' ' + l.borneVers : ''}${passe.length ? ' · par ' + passe.map(t => t.split(' ')[0]).join(', ') : ''}`), badge: { t: '2', etat: '' }, contenu: trajet },
    secContacts,
    { cle: 'fils', titre: 'Intensité', resume: resumeI, badge: badgeProblemes(probs, 'fils') || (x.fn ? { t: '✓', etat: 'ok' } : { t: '—', etat: '' }), contenu: intens },
    { cle: 'chute', resume: insecable(resumeU), badge: badgeProblemes(probs, 'chute') || (ch.total ? { t: '✓', etat: 'ok' } : { t: '—', etat: '' }), contenu: chuteC }, detail];
  sections.push(sectionProblemes(probs, s => presentes.has(s) ? s : null));
  const sous = ['fil', l.type ? `${ident(l.type, true)}${jauge != null ? ' · ' + jauge + ' AWG' : ''}` : '', l.route ? `<i class="fi-route" style="--c:${coul}"></i>${esc(l.route)}` : '', insecable(nombre(arrondi(L != null ? L : H.longueur, 2)) + ' m' + (L != null ? '' : ' (hyp.)'))].filter(Boolean).join(' · ');
  return enTete({ type: 'fil', nom: neuf ? 'fil à créer' : (l.cable || 'sans numéro'), champ: neuf ? '' : 'fil-num', aide: 'Numéro du fil — écrire pour le changer', sous, probs, coul })
    + ficheSections('fil', sections) + fiPied(neuf ? { voir: l.aPoser } : { tableau: l.cable || l.de, menu: MENU_FIL }); }

/* ---- LE PIED ---------------------------------------------------------------------------------------------------------- */
/* Le récapitulatif (filtré sur l'objet), « + fil » (une liaison de plus depuis ce repère), le relief, « voir », et sous
   « ··· » ce qu'on fait rarement. Collé en bas, toujours en vue. */
function fiPied(o) { o = o || {};
  const boutons = [o.tableau != null ? `<button class="fi-bouton" id="fi-tableau" data-filtre="${escA(o.tableau)}" title="Ses liaisons dans le récapitulatif">${ico('tableau')}<span>Récapitulatif</span></button>` : '',
    o.fil ? `<button class="fi-bouton" id="fi-fil-plus" data-de="${escA(o.fil)}" title="Ajouter un fil depuis ${escA(o.fil)} : une ligne de plus dans le récapitulatif, à remplir">${ico('plus')}<span>Fil</span></button>` : '',
    o.relief ? `<button class="fi-bouton" id="eq-relief" title="La pièce en perspective (ou double-clic sur le bloc)">${ico('relief')}<span>Relief</span></button>` : '',
    o.voir ? `<button class="fi-bouton" data-choisir-bloc="${escA(o.voir)}">${ico('voir')}<span>${esc(o.voir)}</span></button>` : ''].join('');
  const menu = (o.menu || []).map(([id, t, cls]) => `<button role="menuitem" id="${id}"${cls ? ` class="${cls}"` : ''}>${esc(t)}</button>`).join('');
  return `<footer class="fi-pied">${boutons}<span class="espace"></span>${menu ? `<div class="fi-plus"><button class="fi-x" id="fi-menu" aria-haspopup="true" aria-expanded="false" aria-label="Plus d’actions" title="Renommer, désigner, supprimer…">${ico('points')}</button><div class="fi-menu" id="fi-menu-liste" role="menu" hidden>${menu}</div></div>` : ''}</footer>`; }
const MENU_BLOC = [['fi-renommer', 'Renommer'], ['fi-designer', 'Désignation'], ['eq-del', 'Supprimer', 'danger']];
const MENU_FIL = [['fil-tableau', 'Voir dans le récapitulatif'], ['fil-del', 'Supprimer ce fil', 'danger']];

/* ---- LE RENDU ----------------------------------------------------------------------------------------------------------- */
// ce qui identifie un bouton de la fiche d'un rendu à l'autre : ses données et son identifiant (pas son texte, qui change)
const empreinteBouton = b => b.id + '|' + JSON.stringify(Object.entries(b.dataset).sort());
function ficheBloc(nom) {
  if (VT_A_POSER.test(nom) || barretteEnModules(nom)) return ficheBarrette(nom);
  if (coupureEnModules(nom)) return ficheCoupure(nom);
  if (estBornier(nom)) return ficheBornierAncien(nom);
  return ficheEquipement(nom); }
/* LA FICHE dans l'inspecteur : la barre de navigation, puis l'objet. La même fiche refaite (un choix cliqué) garde son
   défilement, ses sections ouvertes, et le bouton pressé garde le focus ; une autre fiche entre en fondu — ou, si l'on y
   revient (‹ ›), à la place qu'on y avait. */
function rendreFiche() { const box = $('ba-equip'), c = app.cible; if ($('inspecteur').hidden) return; CALCULS.clear();
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
  if (!meme) FI.liste = '';
  if (c.type === 'bloc' && restaurer && restaurer.connecteur != null) FI.connecteur[c.nom] = restaurer.connecteur;
  if (c.type === 'bloc' && but && but.connecteur) FI.connecteur[c.nom] = but.connecteur;
  FI.viser = but && but.viser || '';
  let html; try { html = c.type === 'fil' ? ficheFil(c.l) : c.type === 'ref' ? ficheComparaison(c) : ficheBloc(c.nom); }
  catch (err) { html = enTete({ type: 'equipement', nom: c.nom || (c.l && c.l.cable) || '—', sous: 'élément' }) + `<p class="fi-note">${esc(String(err && err.message || err))}</p>`; }
  const nav = barreNav(arianeDe(c), { fermer: c.type !== 'ref' });
  const haut = box.scrollTop, a = document.activeElement, presse = meme && a && a.tagName === 'BUTTON' && box.contains(a) ? empreinteBouton(a) : null;
  box.innerHTML = nav + html; box.dataset.cle = cle; box.className = 'fi'; box.dataset.type = c.type;
  // les sections ouvertes et le défilement : ceux qu'on avait (la même fiche, un retour), sinon ceux de la mémoire, en haut
  const etat = (meme || restaurer) && entree && entree.sections; if (etat) box.querySelectorAll('details.fs').forEach(d => { if (d.dataset.section in etat && !d.classList.contains('fs-clos')) d.open = etat[d.dataset.section]; });
  if (meme) box.scrollTop = haut; else if (restaurer) box.scrollTop = restaurer.haut || 0; else { box.scrollTop = 0; box.classList.remove('fondu'); void box.offsetWidth; box.classList.add('fondu'); }
  if (c.type === 'ref') { lierComparaison(c); lierNav(box); const r = $('cp-retour'); if (r) r.onclick = () => naviguer(-1); } else lierFiche(c);
  if (presse) { const b = [...box.querySelectorAll('button')].find(x => empreinteBouton(x) === presse); if (b) { try { b.focus({ preventScroll: true }); } catch (_) { b.focus(); } } }
  // ce que l'ouverture demandait : une section, une ligne allumée
  if (but) { const d = but.section ? ouvrirSection(box, but.section) : null;
    if (but.viser) { const li = box.querySelector(`[data-i="${CSS.escape(but.viser)}"]:not(.mj-contact)`); if (li) { box.querySelectorAll(`[data-i="${CSS.escape(but.viser)}"]`).forEach(x => x.classList.add('vise')); try { li.scrollIntoView({ block: 'center' }); } catch (_) { } } else if (d) d.scrollIntoView({ block: 'start' }); } }
  FI.viser = ''; }

/* ---- LES GESTES ----------------------------------------------------------------------------------------------------- */
/* La barre de navigation : ‹ ›, les maillons du fil d'Ariane, × */
function lierNav(box) {
  const p = $('fi-prec'), s = $('fi-suiv'); if (p) p.onclick = () => naviguer(-1); if (s) s.onclick = () => naviguer(1);
  const x = $('in-fermer'); if (x) x.onclick = () => deselectionner();
  box.querySelectorAll('[data-ariane]').forEach(b => b.onclick = () => { const a = b.dataset.ariane;
    if (a === 'index') { basculerIndex(); return; }
    if (a.startsWith('folio:')) { allerAuPlan(a.slice(6)); ajuster(true); return; }
    if (a.startsWith('section:')) { ouvrirSection(box, a.slice(8)); return; }
    if (a.startsWith('bloc:')) allerAuBloc(a.slice(5)); }); }
/* Retenir un autre choix (un arrangement, une variante, une norme) ou rendre le calcul : une entrée d'historique, le
   plan et le contrôle suivent. */
const choisirDesignation = (cle, d, quoi, mot) => { histPush(quoi); designer(cle, d); apresEdition(); if (mot) dire(mot); };
/* « ↺ automatique » : chaque genre de valeur a son retour au calcul. */
function retourAutomatique(cle, c) { const k = cle.indexOf(':'), genre = cle.slice(0, k), v = cle.slice(k + 1);
  if (genre === 'arr') { choisirDesignation(v, '', 'choix automatique de ' + v, 'Choix automatique rétabli.'); return; }
  if (genre === 'sexe') { histPush('sexe automatique de ' + v); app.contrat.sexes.delete(v); apresEdition(); return; }
  if (genre === 'sertir') { const { rep, borne } = deCleSertir(v); FI.liste = ''; histPush('contact à sertir automatique'); app.contrat.designations.delete(v);
    boutsSur(rep, borne).forEach(([l, ch]) => { delete l[ch]; if (l.avant && ch in l.avant) { const av = { ...l.avant }; delete av[ch]; if (Object.keys(av).length) l.avant = av; else delete l.avant; } }); apresEdition(); return; }
  if (genre === 'rac') { const o = { ...(app.contrat.raccords.get(v) || {}) }; if (!o.designation) return; histPush('désignation automatique du raccord'); delete o.designation;
    if (Object.keys(o).length) app.contrat.raccords.set(v, o); else app.contrat.raccords.delete(v); apresEdition(); return; }
  if (genre === 'pn') { const nom = c.type === 'bloc' ? c.nom : '', conn = v; const C = connecteursDe(nom, verite()).find(x => x.nom === conn), bornes = C ? C.bornes : nom === conn ? besoinsDeBarrette(nom, verite()).bornes : [];
    rendreChamps(liaisonsDuConnecteur(nom, bornes), 'part number du fichier pour ' + nom); return; }
  if (genre === 'champ' && c.type === 'fil') { rendreChamp(c.l, v); } }
/* Écrire un champ du fil (numéro, câble, route, longueur, folio) : la liaison change, l'origine passe à « main ». */
function ecrireChampFil(l, champ, brut) { let v = String(brut == null ? '' : brut).trim();
  if (champ === 'longueur') { if (!v) { changerLiaison(l, 'longueur', null, 'longueur de ' + (l.cable || 'fil')); return; } const x = nombreEcrit(v); if (!(x > 0)) { dire('Une longueur en mètres, plus grande que zéro.', true); rendreFiche(); return; } v = x; }
  if (champ === 'type') v = v.toUpperCase();
  changerLiaison(l, champ, v === '' ? null : v, ({ cable: 'numéro', type: 'câble', route: 'route', longueur: 'longueur', plan: 'folio' }[champ] || champ) + ' de ' + (l.cable || 'fil')); }
/* Renommer un repère d'ici : chaque fil suit, la pile aussi (‹ ramène au nouveau nom). Une barrette à poser se POSE. */
function renommerDepuisFiche(nom, nr) { nr = String(nr || '').trim(); if (!nr || nr === nom) return false;
  if (VT_A_POSER.test(nom)) { const xs = pileInsp().pile.filter(e => e.type === 'bloc' && e.nom === nom), box = $('ba-equip'), avant = box.dataset.cle;
    xs.forEach(e => { e.nom = nr; e.ancien = nom; }); if (avant === 'bloc|' + nom) box.dataset.cle = 'bloc|' + nr;
    const ok = poserBarrette(nom, nr); if (!ok) { xs.forEach(e => { e.nom = nom; delete e.ancien; }); box.dataset.cle = avant; } return ok; }
  if (verite().some(l => l.de === nr || l.vers === nr)) { dire(nr + ' existe déjà au contrat : choisis un autre repère.', true); return false; }
  histPush('renommage de ' + nom); renommer(nom, nr); pileInsp().pile.forEach(e => { if (e.type === 'bloc' && e.nom === nom) { e.nom = nr; e.ancien = nom; } });
  // les choix faits sur la fiche suivent le repère : l'arrangement d'un connecteur (« repère|A »), le contact à sertir d'une borne
  const D = app.contrat.designations; [...D.keys()].forEach(k => { const n = k.startsWith(nom + '|') ? nr + k.slice(nom.length) : k.startsWith('sertir|' + nom + '|') ? 'sertir|' + nr + k.slice(7 + nom.length) : null; if (n) { D.set(n, D.get(k)); D.delete(k); } });
  if (FI.connecteur[nom] != null) FI.connecteur[nr] = FI.connecteur[nom];
  const box = $('ba-equip'); if (box.dataset.cle === 'bloc|' + nom) box.dataset.cle = 'bloc|' + nr;   // la même fiche, sous son nouveau nom : elle garde sa place
  app.choisi = nr; app.cible = { type: 'bloc', nom: nr }; if (app.base.filtre === nom) app.base.filtre = nr; apresEdition(); return true; }
function lierFiche(c) { const box = $('ba-equip'), nom = c.type === 'fil' ? '' : c.nom, l = c.type === 'fil' ? c.l : null;
  lierNav(box);
  const tab = $('fi-tableau'); if (tab) tab.onclick = () => { app.base.filtre = tab.dataset.filtre; app.base.filtreAuto = false; app.base.portee = 'tout'; app.base.defiler = true; if (app.base.ouvert) rendreBase(); else ouvrirBase(); };
  // l'en-tête : le crayon (ou F2) met le repère sous les doigts ; la pastille ouvre les problèmes
  const crayon = $('fi-crayon'), champNom = $('eq-rep') || $('fil-num'); if (crayon && champNom) crayon.onclick = () => { champNom.focus(); champNom.select(); };
  const pb = $('fi-pb'); if (pb) pb.onclick = () => ouvrirSection(box, 'problemes');
  box.querySelectorAll('[data-renommer]').forEach(b => b.onclick = e => { e.preventDefault(); if (champNom) { champNom.focus(); champNom.select(); } });
  // « voir » : la section qui démontre un problème, sa ligne allumée
  box.querySelectorAll('[data-voir]').forEach(b => b.onclick = () => { if (b.dataset.connecteur && nom && FI.connecteur[nom] !== b.dataset.connecteur) { FI.connecteur[nom] = b.dataset.connecteur; rendreFiche(); }
    const d = ouvrirSection(box, b.dataset.voir); if (d && b.dataset.viser) { const li = d.querySelector(`[data-i="${CSS.escape(b.dataset.viser)}"]`); if (li) li.classList.add('vise'); } });
  // les segments de connecteur, « tout montrer », « Changer » : la fiche se refait en place
  box.querySelectorAll('[data-connecteur]:not([data-voir])').forEach(b => b.onclick = () => { FI.connecteur[nom] = b.dataset.connecteur; FI.liste = ''; rendreFiche(); });
  box.querySelectorAll('[data-tout]').forEach(b => b.onclick = () => { FI.tout[b.dataset.tout] = true; rendreFiche(); });
  box.querySelectorAll('[data-changer]').forEach(b => b.onclick = () => { const k = b.dataset.changer; FI.liste = FI.liste === k ? '' : k; rendreFiche();
    const v = box.querySelector(`[data-volet="${CSS.escape(k)}"]`); if (v) { const f = v.querySelector('[data-filtre-liste]'); try { v.scrollIntoView({ block: 'nearest' }); } catch (_) { } if (f) f.focus(); } });
  box.querySelectorAll('[data-sertir]').forEach(b => b.onclick = e => { e.stopPropagation(); const k = 'sertir:' + b.dataset.sertir; FI.liste = FI.liste === k ? '' : k; rendreFiche(); });
  box.querySelectorAll('[data-filtre-liste]').forEach(f => f.addEventListener('input', () => { const q = f.value.trim().toLowerCase(); f.closest('.fi-choix').querySelectorAll('.cand, .fi-chip').forEach(x => { x.hidden = !!q && !x.textContent.toLowerCase().includes(q); }); }));
  // le menu « ··· »
  const menu = $('fi-menu'), liste = $('fi-menu-liste');
  if (menu) { const ouvrir = o => { liste.hidden = !o; menu.setAttribute('aria-expanded', String(o)); };
    menu.onclick = e => { e.stopPropagation(); ouvrir(liste.hidden); };
    liste.addEventListener('click', () => ouvrir(false));
    box.addEventListener('pointerdown', e => { if (!liste.hidden && !e.target.closest('.fi-plus')) ouvrir(false); }, true); }
  // un champ : Entrée l'applique, Échap le rend tel qu'il était
  box.querySelectorAll('input').forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (!el.matches('[data-filtre-liste]')) el.blur(); }
    else if (e.key === 'Escape') { e.stopPropagation(); if (el.matches('[data-filtre-liste]')) { FI.liste = ''; rendreFiche(); return; } el.value = el.defaultValue; el.blur(); } }));
  lierFils(box);
  const plus = $('fi-fil-plus'); if (plus) plus.onclick = () => { if (!app.base.ouvert) ouvrirBase(); ajouterLiaison(plus.dataset.de); dire(plus.dataset.de + ' : un fil de plus — écris « vers » dans le récapitulatif.'); };
  box.querySelectorAll('[data-choisir-bloc]').forEach(b => b.onclick = () => allerAuBloc(b.dataset.choisirBloc, /CB/.test(codeDe(b.dataset.choisirBloc)) ? { section: 'profil' } : null));
  box.querySelectorAll('[data-hyp]').forEach(b => b.onclick = e => { e.preventDefault(); ficheHypotheses(); });
  box.querySelectorAll('[data-action]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); const a = b.dataset.action;
    if (a === 'normes') ficheNormes(); else if (a === 'references') { const m = document.querySelector('#menu [data-act="references"]'); if (m) m.click(); else ficheBible(''); } });
  box.querySelectorAll('[data-auto]').forEach(b => b.onclick = e => { e.preventDefault(); retourAutomatique(b.dataset.auto, c); });
  box.querySelectorAll('[data-bible]').forEach(b => b.onclick = () => ficheBible(b.dataset.bible));
  // la liaison du fil : numéro, câble, route, longueur, folio ; les deux bouts
  if (l) { box.querySelectorAll('[data-edit]').forEach(el => el.addEventListener('change', () => ecrireChampFil(l, el.dataset.edit, el.value)));
    const num = $('fil-num'); if (num) num.addEventListener('change', () => ecrireChampFil(l, 'cable', num.value));
    box.querySelectorAll('[data-bout]').forEach(b => b.onclick = () => { const cote = b.dataset.bout, rep = l[cote], borne = cote === 'de' ? l.borneDe : l.borneVers; if (!rep) return;
      const g = connecteurParBorne(rep, liaisonsDeRepere(rep)).get(String(borne)); allerAuBloc(rep, { connecteur: g ? g.nom : '', section: 'contacts', viser: cleFil(l) }); });
    if ($('fil-tableau')) $('fil-tableau').onclick = () => { app.base.filtre = l.cable || l.de; app.base.filtreAuto = false; app.base.portee = 'tout'; app.base.defiler = true; if (app.base.ouvert) rendreBase(); else ouvrirBase(); };
    if ($('fil-del')) $('fil-del').onclick = () => { const i = verite().indexOf(l); if (i < 0 || !confirm('Supprimer le fil ' + (l.cable || '') + ' entre ' + l.de + ' et ' + l.vers + ' ?')) return; supprimerLiaison(i); deselectionner(); dire('Fil supprimé.'); }; }
  lierChoix(box, c);
  if (!nom) return;
  const rep = $('eq-rep'); if (rep) rep.addEventListener('change', e => { if (!renommerDepuisFiche(nom, e.target.value)) e.target.value = nom; else { const r = $('fi-crayon'); if (r) r.focus(); } });
  const vtp = $('vt-poser'); if (vtp) vtp.onclick = () => { const v = $('vt-repere'); renommerDepuisFiche(nom, v ? v.value : ''); };
  const des = $('eq-des'); if (des) des.addEventListener('change', () => { histPush('désignation de ' + nom); designer(nom, des.value.trim()); apresEdition(); });
  const nat = $('eq-nature'); if (nat) nat.addEventListener('change', () => { const code = nat.value, q = lireRepere(nom); nat.blur(); if (!code || !q) { rendreFiche(); return; }
    let nr = (q.num || '') + code + (q.suffixe || ''); if (nr !== nom && verite().some(x => x.de === nr || x.vers === nr)) nr = repereLibre(nom, code);
    if (renommerDepuisFiche(nom, nr)) dire(`${nom} devient ${nr} : la nature se lit dans le code du repère, chaque fil suit. Ctrl+Z pour défaire.`); else rendreFiche(); });
  if ($('fi-renommer')) $('fi-renommer').onclick = () => { if (rep) { rep.focus(); rep.select(); } };
  if ($('fi-designer')) $('fi-designer').onclick = () => { ouvrirSection(box, 'identite'); const d = $('eq-des'); if (d) d.focus(); };
  if ($('eq-del')) $('eq-del').onclick = () => { const n = verite().filter(x => x.de === nom || x.vers === nom).length; if (!confirm('Supprimer « ' + nom + ' » et ses ' + n + ' liaison(s) ?')) return;
    histPush('suppression de ' + nom); supprimerEquipement(nom); app.base.filtre = ''; deselectionner(); apresEdition(); dire(nom + ' supprimé.'); };
  if ($('eq-relief')) $('eq-relief').onclick = () => ouvrirRelief(nom);
  if (box.querySelector('.equip') && typeof lierCartePhysique === 'function') lierCartePhysique(nom);
  lierDisjonction(nom); }
/* Les choix : une norme, une variante, un arrangement, le sexe, le part number, l'habillage, le contact à sertir, la
   désignation d'un raccord ; « Déjà fait » ouvre la comparaison (en empilant). */
function lierChoix(box, c) { const nom = c.type === 'bloc' ? c.nom : '';
  box.querySelectorAll('[data-norme-barrette]').forEach(b => b.onclick = () => choisirDesignation(nom, b.dataset.normeBarrette, 'norme de ' + nom));
  box.querySelectorAll('[data-norme-prise]').forEach(b => b.onclick = () => choisirDesignation(nom, b.dataset.normePrise, 'norme de ' + nom));
  box.querySelectorAll('.cand[data-cle]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return; FI.liste = ''; choisirDesignation(b.dataset.cle, b.dataset.ref, 'choix de ' + b.dataset.cle, b.dataset.ref + ' retenu.'); });
  box.querySelectorAll('[data-garder]').forEach(b => b.onclick = () => choisirDesignation(nom, b.dataset.garder, 'le retest pour ' + nom, b.dataset.garder + ' retenu, comme le retest.'));
  box.querySelectorAll('[data-sexe]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return; histPush('sexe des contacts de ' + b.dataset.sexe); app.contrat.sexes.set(b.dataset.sexe, b.dataset.v); apresEdition(); });
  box.querySelectorAll('[data-raccord]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return; const k = b.dataset.raccord, v = b.dataset.v;
    histPush('raccord de ' + k); const o = { ...(app.contrat.raccords.get(k) || {}) }; o[b.dataset.champ] = v === 'true' ? true : v === 'false' ? false : v; app.contrat.raccords.set(k, o); apresEdition(); });
  box.querySelectorAll('[data-rac-ref]').forEach(el => el.addEventListener('change', () => { const k = el.dataset.racRef, v = el.value.trim(), o = { ...(app.contrat.raccords.get(k) || {}) }; if ((o.designation || '') === v || (!o.designation && v === el.defaultValue)) return;
    histPush('désignation du raccord de ' + k); if (v) o.designation = v; else delete o.designation; if (Object.keys(o).length) app.contrat.raccords.set(k, o); else app.contrat.raccords.delete(k); apresEdition(); }));
  box.querySelectorAll('[data-sertir-ref]').forEach(b => b.onclick = () => { const k = b.dataset.sertirRef; if (b.getAttribute('aria-pressed') === 'true') { FI.liste = ''; rendreFiche(); return; }
    const { rep, borne } = deCleSertir(k); FI.liste = ''; app.contrat.designations.delete(k); changerLiaisons(boutsSur(rep, borne).map(([l, ch]) => [l, ch, b.dataset.v]), 'contact à sertir'); });
  box.querySelectorAll('[data-pn]').forEach(el => el.addEventListener('change', () => { const v = el.value.trim(), bornes = JSON.parse(el.dataset.bornes), xs = liaisonsDuConnecteur(nom, bornes);
    if (!xs.length) return; changerLiaisons(xs.map(([x, ch]) => [x, ch, v]), 'part number de ' + nom + ' ' + el.dataset.pn); }));
  box.querySelectorAll('.fi-cand[data-ref]').forEach(b => { const aller = () => allerA({ type: 'ref', c: { type: 'ref', nom, harness: b.dataset.ref, repere: b.dataset.rep, fwd: b.dataset.fwd || undefined } });
    b.onclick = aller; b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aller(); } }; }); }
/* Les fils de la fiche et le plan : survoler une ligne (ou un contact de la face) allume le fil et marque tout ce qui
   le montre dans la fiche ; un clic (ou Entrée) ouvre la fiche du fil — en empilant : ‹ ramène ici. */
function lierFils(box) { let dernier = null;
  const cible = t => t && t.closest && t.closest('.fi-fil[data-i], .fi-ia[data-i], .fi-du[data-i], .fi-cote[data-i], .mj-contact.plein');
  const marquer = el => { const k = el.dataset.i; box.querySelectorAll('.vise').forEach(x => x.classList.remove('vise'));
    if (!k) return; box.querySelectorAll(`[data-i="${CSS.escape(k)}"]`).forEach(x => x.classList.add('vise')); allumerCle(k); };
  const lacher = () => { dernier = null; box.querySelectorAll('.vise').forEach(x => x.classList.remove('vise')); rallumer(); };
  const ouvrir = el => { const l = liaisonDeCle(el.dataset.i); if (l) allerAuFil(sourceDe(l) || l); };
  box.onmouseover = e => { const el = cible(e.target); if (!el || el === dernier) return; dernier = el; marquer(el); };
  box.onmouseout = e => { if (!dernier) return; const vers = cible(e.relatedTarget); if (vers) return; lacher(); };
  box.onclick = e => { if (e.target.closest('button, input, select, a, .fi-choix')) return; const el = cible(e.target); if (el) ouvrir(el); };
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
