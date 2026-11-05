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
     · LE PIED, collé en bas, sobre : le récapitulatif (le geste principal, au filet), « + câble » (en
       clair), « ··· ».
   v68 (« Graphite 2027 ») : la fiche se lit comme un DOCUMENT, plus comme une pile de cartes — les sections séparées par
   un filet et de l'air, les câbles en lignes au cordeau, l'état de l'objet en un point à l'angle de son symbole (style-
   fiche.css, style-sections.css).
   v72 (l'audit des fiches) : sous le repère, une LIGNE D'IDENTITÉ (« Connecteur · EN4165-2M · 3 connecteurs · folio 3 ») ;
   la barre des problèmes dit le premier ; « Par rapport au retest » dit ce qui change et qu'il faudra reporter ; un
   disjoncteur dont le retest ne passe pas porte en tête une CARTE DE DÉCISION ; les câbles en TABLEAU dense (et la bande
   des marges au-delà de douze) ; une borne qu'aucun arrangement ne loge est nommée, et la gauge qui la loge proposée ;
   chaque valeur lue dans une table des normes dit d'où elle vient (vérifiée, vos tables, à confirmer).
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
// face (sa ligne reste allumée) ; galerie : la norme parcourue dans la galerie des modules d'une barrette ; entree : la
// minuterie qui retire la marque de l'entrée (`.fondu`)
// ecarts : les changements par rapport au retest que la fiche montre (« ↺ » les rend, par leur rang) ; catalogue : les
// disjoncteurs dont « À la main » montre tout le catalogue de la famille ; rendu : 'meme' quand la fiche montrée se refait
// (un geste), 'neuf' quand une autre entre — le cadran ne voyage que dans le premier cas
const FI = { connecteur: {}, liste: '', viser: '', face: {}, pbs: '', choisi: '', galerie: {}, entree: 0, ecarts: [], catalogue: {}, tous: {}, rendu: '' };
const ICONES = {
  fermer: '<path d="M6 6l12 12M18 6 6 18"/>',
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
  echange: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
  coche: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  // « juste » (il passe sans la marge) : une vague, entre la coche et la croix
  vague: '<path d="M4.5 13.5c2.2-3.2 4.3-3.2 6.5 0s4.3 3.2 6.5 0"/>',
  // les réglages : deux curseurs
  reglages: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  livre: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H19v-3"/>',
  // la carte (08-carte) : l'épingler à droite (un volet), la détacher (une carte qu'on déplace)
  agrandir: '<path d="M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5"/>',
  reduire: '<path d="M4 14h6v6M20 10h-6V4M10 14l-6.5 6.5M14 10l6.5-6.5"/>',
  epingler: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M14.5 4.5v15"/>',
  detacher: '<rect x="3.5" y="7.5" width="12" height="12" rx="2"/><path d="M8.5 4.5h10a2 2 0 0 1 2 2v10"/>'
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
// (v78) jamais le numéro : le type (« à créer » pour un câble que VOLTA ajoute)
const nomDuFil = f => (f.l && f.l.origine === null ? 'à créer' : '') || f.type || (f.l && f.l.type) || 'sans type';
// le nom d'un câble dans une phrase (v77) : son numéro, sinon son type et l'autre bout — « DR12 vers 101BT1:1 »
const nomCourtDuCable = r => (r.type || 'câble') + (r.bout && r.bout.rep ? ' vers ' + r.bout.rep + (r.bout.borne ? ':' + r.bout.borne : '') : '');
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
/* LE MÊME PATRON POUR TOUS LES CHOIX (v73 — l'ingénieur, point 7 : « partout, on ne me montre que les candidats qui
   passent » ; le module, l'arrangement, comme le calibre) : après ceux qui passent, TOUS les autres de la norme, une
   ligne chacun, du plus proche au plus loin — sa marque (✕ rouge : il ne loge pas tout ; ! ambre : il loge, à une
   condition), son nom, ce qu'il loge (« loge 5 / 6 »), sa raison en une ligne. Tous se cliquent : on peut forcer ; celui
   qu'on a retenu à la main est pressé, marqué « main ». x : { m, etat, loge, raison, retenu } */
const MARQUE_CAND = { ko: '✕', att: '!', ok: '✓' };
const ligneCandidat = (cle, x) => `<button type="button" class="cand-l ${x.etat || ''}${x.retenu ? ' main' : ''}" data-cle="${escA(cle)}" data-ref="${escA(x.m.reference)}" aria-pressed="${!!x.retenu}" data-bulle="${escA(x.m.reference + ' — ' + x.raison + (x.retenu ? ' — retenu ici' : ' — un clic le retient quand même'))}">`
  + `<i class="cand-l-m" aria-hidden="true">${MARQUE_CAND[x.etat] || ''}</i><b>${esc(x.m.variante)}</b><span class="cand-l-n">${esc(x.loge || '')}${x.retenu ? ' · <em>main</em>' : ''}</span><span class="cand-l-r">${insecable(esc(x.raison))}</span></button>`;
const autresCandidats = (cle, titre, xs) => xs.length ? `<p class="fi-rac-t cand-l-t">${esc(titre)}</p><div class="cand-ls">${xs.map(x => ligneCandidat(cle, x)).join('')}</div>` : '';
/* Pourquoi un module de barrette ne loge pas ces potentiels d'un seul module : le potentiel qui reste, et ce qui
   l'arrête (trop de câbles pour ses groupes, une gauge qu'aucun contact n'admet, trop peu de groupes) ; s'il les loge à
   plusieurs, combien il en faudrait (ambre). Le moteur place (09, `placerDansModule`, `remplirModules`). */
function raisonDuModule(b, m, pots) { const N = normeDesModules(app.norme), pl = placerDansModule(N, m, pots), loge = `loge ${pl.length} / ${pots.length}`;
  const usage = m.auto ? '' : `usage « ${m.usage || 'spécial'} » : jamais retenu d’office`;
  if (pl.length === pots.length) return { m, n: pl.length, etat: 'att', loge, raison: usage || 'loge tout' };
  const p = pots.find(q => !pl.some(x => x.potentiel === q)), maxG = Math.max(0, ...m.groupes.map(g => g.contacts.length)), bo = p ? (p.bornes.length > 1 ? 'bornes ' : 'borne ') + p.bornes.join('-') : '';
  const j = p && p.fils.find(f => f.jauge != null && !m.contacts.some(c => contactAccepte(N, m.famille, c.taille, f.jauge)));
  const pourquoi = !p ? 'ne loge pas ces potentiels' : p.fils.length > maxG ? `${bo} : ${pluriel(p.fils.length, 'câble')}, ses groupes en reçoivent ${maxG} au plus`
    : j ? `aucun de ses contacts n’admet ${j.type || j.jauge + ' AWG'}${j.cable ? ' (' + j.cable + ')' : ''}` : m.groupes.length < pots.length ? `${pluriel(m.groupes.length, 'groupe')} pour ${pluriel(pots.length, 'potentiel')}` : `${bo} : aucun groupe libre ne la reçoit`;
  let n = 0, tout = false; try { const Qv = remplirModules(b, app.norme, m.reference); n = Qv.modules.length; tout = !Qv.restants.length; } catch (_) { }
  return { m, n: pl.length, etat: tout ? 'att' : 'ko', loge, raison: [usage, pourquoi + (tout && n > 1 ? ` — il en faudrait ${n}` : '')].filter(Boolean).join(' ; ') }; }
// le symétrique d'un module, comme on voit l'autre partie de face (fiche et embase sont symétriques par l'axe vertical)
const miroir = m => ({ ...m, contacts: m.contacts.map(c => ({ ...c, c: m.colonnes - 1 - c.c })), groupes: m.groupes.map(g => ({ ...g, contacts: g.contacts.map(c => ({ ...c, c: m.colonnes - 1 - c.c })) })) });
// ce qu'un contact pris montre sur la face : la clé de son câble, sa couleur — et, au survol, son numéro et son type
const occupant = (f, ko, lettre) => { const cl = coulDeFil(f);
  return { i: cleFil(f.l), couleur: cl, couleurClaire: melanger(cl, 0.8), ko: !!ko, bulle: [lettre ? 'Contact ' + lettre : '', nomDuFil(f), f.type || ''].filter(Boolean).join(' · ') + (ko ? '\ngauge refusée par le contact' : '') }; };
/* Une face qui tient dans la largeur de sa place, interactive : survoler un contact allume son câble, un clic le choisit. */
// (v77) sous la face, sa légende : plein = pris, creux = libre, cerné = reliés entre eux, rouge = refusé — rien d'autre
const legendeFace = g => !g ? '' : `<p class="mj-legende"><span><i class="lg-pris" aria-hidden="true"></i>${esc(plurielLie(g.pris, 'pris'))}</span><span><i class="lg-libre" aria-hidden="true"></i>${esc(plurielLie(g.libres, 'libre'))}</span>`
  + (g.relies ? `<span><i class="lg-relie" aria-hidden="true"></i>reliés entre eux</span>` : '') + (g.ko ? `<span class="ko"><i class="lg-ko" aria-hidden="true"></i>${esc(plurielLie(g.ko, 'refusé'))}</span>` : '') + '</p>';
const faceAjustee = (f, titre) => `<figure class="fi-face"><svg class="mj" viewBox="0 0 ${f1(f.w)} ${f1(f.h)}" style="max-width:${f1(Math.min(f.w * 1.25, 440))}px" role="img" aria-label="${escA(titre || 'Face')}">${f.svg}</svg>${legendeFace(f.legende)}${titre ? `<figcaption>${esc(titre)}</figcaption>` : ''}</figure>`;
/* Le contact à sertir, en un mot : « EN3155-003F2020 + E0718-20-30 ». */
const motSertir = st => st ? st.reference + (st.accessoire ? ' + ' + st.accessoire : '') : '';
/* Le mot « hypothèse » sur une fiche : un lien vers la fiche des hypothèses de la simulation (08, `ficheHypotheses`). */
const motHypothese = '<button type="button" class="fi-hyp" data-hyp="1" data-bulle="Une hypothèse de la simulation : un clic mène aux hypothèses, pour la régler">hypothèse</button>';

/* ---- D'OÙ VIENT UNE VALEUR DES TABLES (le lecteur, v72 : « tout est correct ? les contacts, tyrap… ? tout ? ») ------
   Chaque valeur lue dans une table des normes — un contact à sertir, un câble, un raccord, un collier, une gaine, un
   manchon, un obturateur, un rail — porte à côté d'elle un repère de 7 px : PLEIN, vérifiée par deux sources (la bulle
   les nomme) ; À MOITIÉ, la donnée du lecteur (ses tables SEE, sa base des câbles, sa table CHOIX) ; un ANNEAU ambre, à
   confirmer — et pourquoi. Lu dans la ligne de la table (09, `origineStatut`) : `confiance` (vérifié · structure ·
   déduit · à confirmer · vide pour la donnée du lecteur), `statut` (la phrase), `origine` (la source), `note`. */
const sansLiens = t => String(t == null ? '' : t).replace(/\s*\((?:https?:|www\.)[^)]*\)/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s{2,}/g, ' ').replace(/\s+([,;.)])/g, '$1').trim();
function confianceDe(x, lecteur) { if (!x) return null; const c = x.confiance || '', st = sansLiens(x.statut), or = sansLiens(x.origine);
  // « vérifié (deux sources : A, B) », « (trois sources : …) », « (quatre sources : …) » : la bulle les nomme
  if (c === 'vérifié') { const SOURCES = /\(\s*(deux|trois|quatre|cinq|six|\d+) sources\s*:\s*([^)]*)\)/i, n = SOURCES.exec(st), reste = st.replace(SOURCES, '').replace(/^v[ée]rifi[ée]e?s?(?![a-zà-ÿ])\s*/i, '').replace(/^[\s:—–-]+/, '').trim();
    return { niveau: 'v', mot: 'vérifié', bulle: (n ? 'Vérifié par ' + n[1].toLowerCase() + ' sources : ' + n[2].trim() : 'Vérifié' + (or ? ' — ' + or : '')) + (reste ? '\n' + majuscule(reste) : '') }; }
  if (!c) return { niveau: 'l', mot: 'vos tables', bulle: (lecteur || 'Vos tables') + (or ? ' — ' + or : '') };
  const pourquoi = st.replace(/^(?:à confirmer|structure|déduit)\s*[:—–(-]*\s*/i, '').replace(/\)\s*$/, '').trim() || (SENS_STATUT_RACCORD[c] || '').replace(/^./, m => m.toLowerCase());
  return { niveau: 'c', mot: 'à confirmer', bulle: 'À confirmer' + (pourquoi ? ' : ' + pourquoi : '') + (or && !pourquoi.includes(or) ? '\nSource : ' + or : '') }; }
// le repère lui-même ; rien quand la ligne n'est pas connue
const repereConfiance = (x, lecteur) => { const c = confianceDe(x, lecteur); return c ? `<i class="fi-conf ${c.niveau}" data-bulle="${escA(c.bulle)}" role="img" aria-label="${escA(c.mot)}"></i>` : ''; };
// la ligne complète d'un contact à sertir (le moteur ne garde que sa référence et son statut) : la table Contacts la rend
const ligneDuContact = (famille, taille, sexe, type) => { try { return contactDuFil(app.norme, famille, taille, sexe, type, jaugeDuType(type)); } catch (_) { return null; } };
// les trois repères, en une ligne sous ce qu'ils marquent (une fois par section)
const legendeConfiance = () => `<p class="fi-conf-legende"><span><i class="fi-conf v" aria-hidden="true"></i>vérifié par deux sources</span><span><i class="fi-conf l" aria-hidden="true"></i>vos tables</span><span><i class="fi-conf c" aria-hidden="true"></i>à confirmer</span></p>`;

/* ---- CE QU'UN PROBLÈME NE DIT PAS DE LUI-MÊME ------------------------------------------------------------------------
   « contact taille 23 supposé (3 A) » (le lecteur : pourquoi ?) : le plan ne dit pas quel contact est serti au
   bout de ce câble — un interrupteur, un relais à cosses —, VOLTA prend alors le plus petit contact qui admet sa gauge,
   par prudence (09 bis, `protegerFil` : la règle reste). La fiche le dit sous la ligne du problème. */
function gloseDuProbleme(t) { const m = /^([A-Z]+\s*-?(\d{1,2}))(?: vers \S+)?[^:]*:.*?contact taille (\S+) (?:supposé \(([\d,]+\s?A)\)|\(([\d,]+\s?A), par la gauge\))/.exec(t);
  if (m) return `Le plan ne dit pas quel contact est serti au bout de ce ${m[1]} : VOLTA prend le plus petit qui admet un ${m[2]} AWG — la taille ${m[3]}, ${m[4] || m[5]} —, par prudence.`;
  if (/ supposé \(|par la gauge\)/.test(t)) return 'Le plan ne dit pas quel contact est serti : VOLTA prend le plus petit qui admet la gauge du câble, par prudence.';
  return ''; }
// la phrase d'un problème telle que la fiche l'écrit : « supposé » (le contrôle l'écrit ainsi ; l'ancienne forme « par la gauge »
// d'un plan enregistré se lit encore), la glose dit pourquoi
const motDuProbleme = t => String(t).replace(/contact taille (\S+) \(([\d,]+\s?A), par la gauge\)/, 'contact taille $1 supposé ($2)');

/* ---- LA LIGNE D'IDENTITÉ, sous le repère (l'audit v72 : « le premier coup d'œil ne dit pas ce qu'est l'objet ; la
   référence et le calibre, c'est ce que l'ingénieur cherche ») : sa nature, sa référence, ce qu'il porte, son folio. */
const foliosDuRepere = nom => { const s = new Set(); verite().forEach(l => { if (l.de === nom || l.vers === nom) foliosDe(l).forEach(f => s.add(String(f))); }); return [...s].sort(triNaturel); };
const motFolios = fs => !fs.length ? '' : (fs.length > 1 ? 'folios ' : 'folio ') + fs.join(', ');
// la description du retest (Description1 / Description2) d'un repère : la première qui se lit
const descriptionDuRetest = nom => { for (const l of verite()) { const d = l.de === nom ? l.descriptionDe : l.vers === nom ? l.descriptionVers : ''; if (d && String(d).trim()) return String(d).trim(); } return ''; };
const identite = morceaux => morceaux.filter(Boolean).join(' · ');
// un nombre écrit à la française (« 5,2 ») ; null s'il n'y en a pas
// (v84) un nombre tapé : « 2 500 » (espaces de milliers, insécables compris), « 2.500,5 » (points de milliers, virgule
// décimale), « 2,5 », « 1e3 » — comme la lecture du fichier (`longueurLue`)
const nombreEcrit = t => { let s = String(t == null ? '' : t).trim().replace(/[\s  ]/g, '');
  s = /,/.test(s) && /\./.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(',', '.');
  const x = parseFloat(s); return isFinite(x) ? x : null; };

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
const nomDEntree = e => e.type === 'fil' ? (e.l.origine === null ? 'nouveau câble' : cableDit(e.l)) : e.type === 'ref' ? 'Déjà fait · ' + e.c.harness : e.nom;
// la fiche montrée garde sa place (ses sections ouvertes, son défilement, son connecteur) avant qu'une autre la remplace
function memoriserEntree(e, box) { e.haut = box.scrollTop; const p = $('nv-panneaux'); e.panneau = p ? p.scrollTop : null; e.sections = {}; box.querySelectorAll('details.fs').forEach(d => { e.sections[d.dataset.section] = d.open; });
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

/* LA BARRE : ‹ ›, discrets ; le repère en petit (il paraît quand l'en-tête passe dessous) ; l'épingle (la carte flottante
   devient le volet de droite, ou l'inverse : 08-carte) ; ×. Toute la barre se tient : on y déplace la carte. */
function barreNav(o) { o = o || {};
  // (v78, le lecteur : « en haut, il ne faut que la croix ») : une fiche n'a plus que sa poignée, ce qu'elle est, et ×
  if (o.epure) return `<nav class="fi-nav fi-nav-epure" aria-label="La fiche">${o.milieu ? `<span class="fi-nav-milieu">${o.milieu}</span>` : '<span class="espace"></span>'}<button type="button" class="fi-x" id="in-fermer" aria-label="Fermer (Échap)" data-bulle="Fermer — Échap">${ico('fermer')}</button></nav>`;
  const I = pileInsp(), p = I.pile[I.pos - 1], n = I.pile[I.pos + 1];
  const prec = !!app.cible && (I.pos > 0 || app.insp.index), suiv = !!app.cible && I.pos < I.pile.length - 1;
  // ‹ et › disent où ils mènent (l'audit : « muets ») — dans la bulle de l'outil, pas celle du navigateur
  const tPrec = !prec ? 'Rien avant' : I.pos > 0 && p ? 'Revenir à ' + nomDEntree(p) : 'Revenir à la liste des repères', tSuiv = suiv && n ? 'Aller à ' + nomDEntree(n) : 'Rien après';
  return `<nav class="fi-nav" aria-label="Fiches vues"><button type="button" class="fi-pas" id="fi-prec"${prec ? '' : ' disabled'} aria-label="${escA(tPrec + ' (Alt+←)')}" data-bulle="${escA('‹ ' + tPrec + ' — Alt+←')}">${ico('gauche')}</button>`
    + `<button type="button" class="fi-pas" id="fi-suiv"${suiv ? '' : ' disabled'} aria-label="${escA(tSuiv + ' (Alt+→)')}" data-bulle="${escA(tSuiv + ' › — Alt+→')}">${ico('droite')}</button>`
    + (o.milieu ? `<span class="fi-nav-milieu">${o.milieu}</span>` : `<span class="fi-nav-nom" aria-hidden="true">${esc(o.nom || '')}</span>`) + `${boutonEpingle()}${boutonTaille()}${o.fermer === false ? '' : `<button type="button" class="fi-x" id="in-fermer" aria-label="Fermer (Échap)" data-bulle="Fermer — Échap">${ico('fermer')}</button>`}</nav>`; }
/* Les câbles d'un repère que le courant dépasse : des problèmes de la fiche, montrés dans « Câbles ». */
// (v86) la même phrase que le contrôle dans la fiche de son disjoncteur — le palier de la durée, d'où vient l'admis — : les
// deux fiches disent le même problème avec les mêmes mots (08-niveaux, `motsDuProbleme`)
const problemesDesFils = fils => fils.flatMap(f => { const x = intensiteDuFil(f.l); if (!x.trop.length) return []; const p = x.trop[0];
  const palier = typeof pourPalier === 'function' && typeof palierDe === 'function' ? ' ' + pourPalier(palierDe(p.t)) : '';
  let decl = ''; try { decl = typeof motDuDeclassement === 'function' && f.l.type ? motDuDeclassement(app.norme, f.l.type, x.H, p.t) : ''; } catch (_) { decl = ''; }
  return [{ niveau: 'ko', texte: `${cableEtType(f.l)} : ${p.nom} ${amperes(p.i)}${p.t === Infinity ? '' : ' pendant ' + secondes(p.t)} > ${amperes(x.admise(p.t))} admis${palier}${decl ? ' (' + decl + ')' : ''}${x.al ? ' — sous ' + x.al.nom : ''}`, section: 'fils', viser: cleFil(f.l) }]; });

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
// (l'état de l'objet — ok, att, ko — se lit en un point à l'angle du symbole : `data-etat`)
const symbole = (type, coul, etat) => `<div class="fi-symbole" aria-hidden="true"${coul ? ` style="--c:${coul}"` : ''}${etat ? ` data-etat="${etat}"` : ''}><svg viewBox="0 0 30 30">${SYMBOLES[type] || SYMBOLES.equipement}</svg></div>`;
/* L'ÉTAT D'UNE FICHE, d'un mot : « ko » s'il y a un problème, « att » s'il n'y a que des points à voir, « ok » sinon. */
const etatDesProblemes = probs => probs.some(p => p.niveau === 'ko') ? 'ko' : probs.length ? 'att' : 'ok';
/* UNE TUILE (la fiche d'un câble seulement) : une étiquette (avec sa majuscule), une valeur forte — ou le champ qui
   l'écrit ; un état (son bord et sa valeur) quand la valeur pose problème. La valeur est du HTML déjà échappé. */
const tuile = (k, v, o) => { o = o || {};
  return `<div class="fi-tuile${o.etat ? ' ' + o.etat : ''}${o.mono ? ' mono' : ''}${o.edit ? ' edit' : ''}"${o.titre ? ` title="${escA(o.titre)}"` : ''}><span class="fi-tuile-k">${esc(k)}</span><span class="fi-tuile-v">${v}</span>${o.sous != null ? `<span class="fi-tuile-s"${o.sous ? ` data-bulle="${escA(String(o.sous).replace(/<[^>]*>/g, ''))}"` : ''}>${o.sous || '&nbsp;'}</span>` : ''}</div>`; };
/* L'en-tête (le lecteur : « pas besoin de mettre disjoncteur ni batterie, ni de liste déroulante — personne ne s'en
   servira ; juste un texte qu'on tape à la main, qu'on peut modifier ; le repère élec en priorité ») : le symbole ; le
   REPÈRE d'abord — un champ qui a l'air d'un titre, son crayon (clic ou F2), qu'on renomme en écrivant dedans — ; dessous,
   le NOM, un texte libre qu'on tape (la désignation du contrat), et, quand il dit quelque chose, un mot de contexte (« à
   poser · sur 102CB1:2 ») ; les tuiles d'un câble. Le type se lit toujours dans le code du repère : il ne s'affiche plus.
   v72 : sous le repère, la LIGNE D'IDENTITÉ (`identite` : « Connecteur · EN4165-2M · 3 connecteurs · folio 3 ») ; la
   désignation qu'on tape se lit quand elle est écrite, et ne se montre, vide, qu'au survol de l'en-tête (plus de « Nom —
   à taper » sur chaque fiche) ; les tuiles d'un câble passent sous les problèmes (`tuilesHtml`).
   o : { type, genre (HTML, le contexte), identite (HTML), nom, champ (l'id du champ), aide, designation (le repère dont on
   écrit le nom), coul, etat (ok · att · ko : le point à l'angle du symbole) } */
function enTete(o) {
  // `o.ph` : ce que dit le titre quand il est vide (un câble sans numéro se dit par son type, v77) — à l'encre du titre
  const nom = o.champ && (o.aide || o.ph) ? `<input class="fi-nom${o.ph && !o.nom ? ' fi-nom-vide' : ''}" id="${o.champ}" value="${escA(o.nom)}"${o.ph ? ` placeholder="${escA(o.ph)}"` : ''} aria-label="${escA(o.aide || 'Repère — écrire pour renommer partout')}" spellcheck="false" autocomplete="off">`
    + `<button type="button" class="fi-crayon" id="fi-crayon" aria-label="Renommer (F2)" data-bulle="Renommer partout — F2 ; chaque câble suit">${ico('crayon')}</button>` : `<div class="fi-nom">${esc(o.nom)}</div>`;
  const des = o.designation ? app.contrat.designations.get(o.designation) || '' : null;
  const desH = des != null ? `<input class="fi-des${des ? ' plein' : ''}" id="eq-des" value="${escA(des)}" placeholder="Désignation" aria-label="Désignation (un texte libre, gardé avec le contrat)" spellcheck="false" autocomplete="off">` : '';
  const ident = o.identite ? `<span class="fi-identite">${o.identite}</span>` : '';
  const sep = '<span class="fi-sep" aria-hidden="true">·</span>', sep1 = o.genre && ident ? sep : '', sep2 = des && (ident || o.genre) ? sep : '';
  return `<header class="fi-entete">${symbole(o.type, o.coul, o.etat)}<div class="fi-ident"><div class="fi-nom-ligne">${nom}</div>${o.genre || desH || ident ? `<div class="fi-genre">${o.genre ? `<span class="fi-genre-mot">${o.genre}</span>` : ''}${sep1}${ident}${sep2}${desH}</div>` : ''}</div></header>`; }
// les tuiles d'un câble, une bande sous les problèmes (l'audit : « la barre des problèmes passe sous les tuiles ; ailleurs, elle suit l'en-tête »)
const tuilesHtml = ts => { const xs = (ts || []).filter(Boolean); return xs.length ? `<div class="fi-tuiles">${xs.join('')}</div>` : ''; };
/* L'ancienne tête (la comparaison des contrats déjà faits s'en sert encore, quand sa référence a disparu). */
const fiTete = o => `<header class="fi-tete"><div class="min0"><div class="fi-nom">${esc(o.nom)}</div></div></header><div class="fi-ligne">${o.sous ? `<span class="fi-sous">${o.sous}</span>` : ''}</div>`;

/* LA BARRE DES PROBLÈMES, juste sous l'en-tête : repliée, elle dit combien (« 3 problèmes · 7 à voir ») ; dépliée, une
   ligne par point — les problèmes d'abord —, la section qui le démontre en petit ; un clic l'ouvre et l'allume. Rien
   quand il n'y a rien. v72 (l'audit : « la barre rose ne dit pas lequel ») : la première ligne de la fiche technique —
   « Problèmes · 1 problème — B : aucun arrangement… » ; un point qui ne se comprend pas seul porte sa glose dessous
   (`gloseDuProbleme`). `sections` : celles de la fiche (leur clé, leur titre). */
/* LES LIGNES DES POINTS (la barre d'hier, le bandeau du grand : 08-niveaux) : une par point — les problèmes d'abord —, la
   section qui le démontre en petit, sa glose quand il en faut une, ses gestes dessous. `titres` : les sections de la
   fiche (clé → titre) ; `FI.gestesPb` garde les gestes le temps du rendu (le bouton porte leur numéro). */
function lignesProblemes(tri, titres, o) { o = o || {}; if (!FI.gestesPb) FI.gestesPb = [];
  // les gestes d'un point (le domaine C, `gestesDuPoint` : « Tout régler… », « Unifier sur… », « Voir 102CB1 ») : sous sa ligne, chacun
  // une fois — et pas ceux que la fiche montre déjà ailleurs (`o.gestesTus`, la cause du câble)
  const vus = new Set();
  const gestesDe = p => { const gs = (p.gestes || []).filter(x => x && x.mot && typeof x.faire === 'function' && !vus.has(x.mot) && !(o.gestesTus && o.gestesTus.test(x.mot))); if (!gs.length) return '';
    const k = FI.gestesPb.push(gs) - 1; gs.forEach(x => vus.add(x.mot));
    return `<span class="fi-pb-gestes">${gs.map((x, i) => `<button type="button" class="btn ${x.principal ? 'papier' : 'lien'} dense" data-geste-pb="${k}:${i}"${x.aide ? ` data-bulle="${escA(x.aide)}"` : ''}>${esc(x.mot)}</button>`).join('')}</span>`; };
  return tri.map(p => { const s = titres.has(p.section) ? p.section : '', ou = !s ? '' : s === 'connecteur' && p.connecteur ? 'Connecteur ' + p.connecteur : titres.get(s), t = motDuProbleme(p.texte), g = gloseDuProbleme(p.texte);
    return `<li><button type="button" class="fi-pb-l ${p.niveau === 'ko' ? 'ko' : 'att'}"${s ? ` data-voir="${escA(s)}"` : ''}${p.viser ? ` data-viser="${escA(p.viser)}"` : ''}${p.connecteur ? ` data-connecteur="${escA(p.connecteur)}"` : ''} data-bulle="${escA(t + (g ? '\n' + g : '') + (p.bulle ? '\n' + p.bulle : ''))}">`
      + `<i aria-hidden="true"></i><span class="fi-pb-t">${insecable(esc(t))}</span>${ou ? `<span class="fi-pb-s">${esc(ou)}</span>` : ''}${g ? `<span class="fi-pb-g">${insecable(esc(g))}</span>` : ''}</button>${gestesDe(p)}</li>`; }).join(''); }
function barreProblemes(probs, sections, o) { o = o || {}; if (!probs.length) return '';
  const titres = new Map(sections.filter(Boolean).filter(s => !s.vide || s.contenu).map(s => [s.cle, s.titre || SECTIONS[s.cle] || s.cle]));
  const ko = probs.filter(p => p.niveau === 'ko').length, att = probs.length - ko, tri = probs.filter(p => p.niveau === 'ko').concat(probs.filter(p => p.niveau !== 'ko'));
  // une seule règle (le technicien v73, point 5) : « problème » en rouge, « à voir » en ambre, séparés par « · »
  const mots = [ko ? `<b class="ko">${pluriel(ko, 'problème')}</b>` : '', att ? `<span class="att">${att > 1 ? att + ' à voir' : '1 point à voir'}</span>` : ''].filter(Boolean).join(' · ');
  FI.gestesPb = []; const li = lignesProblemes(tri, titres, o);
  // le premier point en clair — sauf celui qu'une carte de décision dit déjà (`o.taire`)
  // le premier point en clair, sur deux lignes au plus (l'ergonome v73 : « rognée, sans bulle ») — la bulle le donne en entier
  const p0 = tri.find(p => !(o.taire && o.taire.test(p.texte))) || tri[0], premier = p0 ? `<span class="fi-pb-1">— ${insecable(esc(motDuProbleme(p0.texte)))}</span>` : '';
  const entier = [ko ? pluriel(ko, 'problème') : '', att ? (att > 1 ? att + ' à voir' : '1 point à voir') : ''].filter(Boolean).join(' · ') + (p0 ? ' — ' + motDuProbleme(p0.texte) : '');
  return `<details class="fi-alerte ${ko ? 'ko' : 'att'}" id="fi-pbs"><summary class="fi-pb" id="fi-pb"><span class="fi-pb-k">Problèmes</span><span class="fi-pb-mots" data-bulle="${escA(entier)}"><span class="fi-pb-n">${mots}</span> ${premier}</span>${ico('bas', 'fi-chevron')}</summary><ul class="fi-pbs">${li}</ul></details>`; }

/* ---- PAR RAPPORT AU RETEST (l'idée n°1 de l'audit des fiches : « c'est ce que l'ingénieur doit reporter ; aujourd'hui
   éparpillé dans les problèmes, les bulles et "l’installation dit" ») : sous les problèmes, une ligne repliée — « Par rapport
   au retest · 3 changements » — qui se déplie en une ligne par changement : ce qui a été écrit ici (le champ de la
   liaison, `l.avant` gardant ce que portait le fichier) et ce que VOLTA retient d'autre que le retest (un calibre, un
   module). « ↺ » rend au retest ce qui a été écrit ici (une entrée d'historique). */
const MOTS_CHAMPS = { cable: 'numéro', type: 'type', longueur: 'longueur', route: 'route', pnDe: 'référence', pnVers: 'référence', contactDe: 'contact', contactVers: 'contact', plan: 'folio', de: 'de', vers: 'vers', borneDe: 'borne', borneVers: 'borne' };
const motValeur = (c, v) => v == null || v === '' ? 'rien' : c === 'longueur' ? nombre(arrondi(+v, 3)) + ' m' : String(v);
/* LA COLONNE DU RETEST qui porte un champ (le technicien v73, n° 10 : « référence MS3320-10 → MS3320-20 : je n'ai pas
   touché ce câble ! » — chaque ligne dit sa colonne et son objet : « PN1 (102CB1) ») : la table des seize colonnes de
   l'export (08-export, `COLONNES_RETEST`), sinon la nôtre ; un champ que le retest ne porte pas (le contact à sertir)
   n'a pas de colonne. */
const COLONNES_FICHE = { harness: 'Harness', de: 'Device1', borneDe: 'Pin1', pnDe: 'PN1', type: 'Cable T/G', cable: 'Cable Tag', route: 'Route', vers: 'Device2', borneVers: 'Pin2', pnVers: 'PN2', plan: 'FWD', longueur: 'Cable length (mm)' };
const colonneRetest = c => { try { if (typeof COLONNES_RETEST !== 'undefined') { const x = COLONNES_RETEST.find(([, ch]) => ch === c); if (x) return x[0]; } } catch (_) { } return COLONNES_FICHE[c] || ''; };
// l'objet d'un champ : le repère pour sa référence (PN1 : l'appareil 1), le bout pour son contact, le câble sinon
const objetDuChamp = (l, c) => c === 'pnDe' || c === 'de' || c === 'borneDe' ? l.de : c === 'pnVers' || c === 'vers' || c === 'borneVers' ? l.vers : c === 'contactDe' ? l.de + (l.borneDe ? ':' + l.borneDe : '') : c === 'contactVers' ? l.vers + (l.borneVers ? ':' + l.borneVers : '') : cableDit(l);
// ce qui a été écrit sur les liaisons d'un objet : `liaisons` [[l, champs (ceux qui le concernent)]] — un changement
// identique d'un même objet sur plusieurs liaisons (la référence d'un disjoncteur, en PN1 ici, en PN2 là) se dit une fois
function changementsEcrits(liaisons) { const m = new Map();
  liaisons.forEach(([l, champs]) => { if (!l || !l.avant) return; champs.forEach(c => { if (!(c in l.avant)) return; const avant = l.avant[c], apres = l[c] == null ? null : l[c]; if (avant === apres) return;
    const objet = objetDuChamp(l, c), k = objet + '|' + MOTS_CHAMPS[c] + '|' + avant + '|' + apres;
    if (!m.has(k)) m.set(k, { sujet: /^(pn|contact)/.test(c) ? '' : cableDit(l), objet, colonnes: new Set(), champ: MOTS_CHAMPS[c] || c, avant: motValeur(c, avant), apres: motValeur(c, apres), rendre: [] });
    const x = m.get(k), col = colonneRetest(c); if (col) x.colonnes.add(col); x.rendre.push([l, c]);
    // écrit par VOLTA (la règle du calibre, les câbles grossis : `avecOrigineVolta`, 08-export) : le résumé le compte
    if (l.avant['volta:' + c] !== undefined && l.avant['volta:' + c] === l[c]) x.parVolta = true; }); });
  return [...m.values()].map(x => ({ ...x, colonne: [...x.colonnes].sort().join(' · ') })); }
/* « Par rapport au retest · 1 modification » : une ligne par modification — sa colonne et son objet (« PN1 (102CB1) »),
   ce qu'il portait barré, ce qu'il porte ; « ↺ » le rend. Ce que VOLTA propose d'autre, marqué « VOLTA ». */
/* ---- L'HISTORIQUE (v86, le lecteur : « l'historique : ce qui a changé, ce qui n'a pas changé, d'où ça vient ») -----------
   Une ligne par changement de l'objet, le plus récent en haut. Chacune dit CE QUI a changé (avant → après) ; D'OÙ venait
   la valeur d'avant (votre fichier, le choix de VOLTA, la table, une hypothèse), sous elle ; QUI a mis la nouvelle (vous,
   VOLTA, une proposition de VOLTA acceptée), sous elle ; QUAND (l'heure du geste) ; et « Défaire », qui rend la valeur
   d'avant (un message offre de défaire ce retour). Ce qui n'a pas changé n'y est pas : une valeur rendue disparaît, un choix
   pris à la main égal à celui de VOLTA ne se compte pas. Trois sources :
     · les valeurs du fichier réécrites (`l.avant` : type, longueur, route, références, contacts) — `changementsEcrits` ;
     · les choix de VOLTA pris à la main (arrangement, module, raccord, sexe, nature, consommation, calibre) — `choixALaMain` ;
     · ce que VOLTA retient d'autre que votre fichier sans qu'on le lui demande (un module, une barrette ajoutée).
   Rend { n, mots, html } pour l'onglet « Historique » (08-niveaux, `composerFiche`) — ou null quand rien n'a changé. */
const MOTS_QUI = { vous: 'par vous', volta: 'par VOLTA', prop: 'proposition de VOLTA, acceptée' };
const MOTS_DEPUIS = { fichier: 'votre fichier', volta: 'choix de VOLTA', table: 'la table de la norme', hyp: 'supposée par VOLTA', calcul: 'calcul de VOLTA' };
const CHAMPS_HISTORIQUE = ['type', 'longueur', 'route', 'pnDe', 'pnVers', 'contactDe', 'contactVers', 'cable'];
/* QUAND : l'heure de chaque changement, notée quand VOLTA le voit pour la première fois (la fiche se refait après chaque
   geste) et gardée pour ce plan dans ce navigateur. Un changement déjà là quand le plan s'ouvre, sans heure gardée, n'a pas
   d'heure : sa ligne n'en dit pas plutôt que d'en inventer une. Chaque changement a sa signature (« l|câble|type|DR16 »). */
const QUAND = { plan: null, m: new Map() }, CLE_QUAND = 'volta-historique-heures';
const profilSansCalibre = v => { const o = { ...(v || {}) }; delete o.calibre; return JSON.stringify(o); };
function signaturesDuPlan() { const S = new Set(), C = (app && app.contrat) || {}, nul = v => v == null || v === '' ? null : v;
  verite().forEach(l => { if (!l.avant) return; CHAMPS_HISTORIQUE.forEach(c => { if (c in l.avant && nul(l.avant[c]) !== nul(l[c])) S.add('l|' + cleFil(l) + '|' + c + '|' + nul(l[c])); }); });
  (C.designations ? [...C.designations] : []).forEach(([k, v]) => { if (typeof barretteEnModules === 'function' && barretteEnModules(k) && typeof choixDesModules === 'function') { const M = choixDesModules(v); M.parModule.forEach((r, n) => S.add('m|' + k + '|' + n + '|' + r)); if (M.global) S.add('d|' + k + '|' + M.global); } else S.add('d|' + k + '|' + v); });
  (C.raccords ? [...C.raccords] : []).forEach(([k, v]) => S.add('r|' + k + '|' + JSON.stringify(v)));
  (C.sexes ? [...C.sexes] : []).forEach(([k, v]) => S.add('s|' + k + '|' + v));
  (C.charges ? [...C.charges] : []).forEach(([k, v]) => { S.add('c|' + k + '|' + profilSansCalibre(v)); if (v && v.calibre > 0) S.add('cal|' + k + '|' + v.calibre); });
  // (v86) une barrette ajoutée par VOLTA qui a reçu son repère ; le dessin retouché d'un folio (08-journal, l'historique du plan)
  try { barrettesPosees().forEach(p => S.add('p|' + p.vt + '|' + p.nom)); retouchesDuPlan().forEach(d => S.add(signatureDuDessin(d)));
    verite().forEach(l => { if (l.avant && l.avant.copies > 0) S.add('l|' + cleFil(l) + '|copies|' + l.avant.copies); }); } catch (_) { }
  return S; }
function sauverHeures(id) { try { const t = JSON.parse(localStorage.getItem(CLE_QUAND) || '{}') || {}; delete t[id]; t[id] = Object.fromEntries([...QUAND.m].filter(([, v]) => v));
  const ks = Object.keys(t); ks.slice(0, Math.max(0, ks.length - 12)).forEach(k => delete t[k]); localStorage.setItem(CLE_QUAND, JSON.stringify(t)); } catch (_) { } }
function noterHeures() { let S; try { S = signaturesDuPlan(); } catch (_) { return; } const id = String(app.planId != null ? app.planId : app.nom || 'plan'), t0 = Date.now();
  if (QUAND.plan !== id) { let t = {}; try { t = JSON.parse(localStorage.getItem(CLE_QUAND) || '{}') || {}; } catch (_) { t = {}; }
    const gardees = t[id] || {}; QUAND.plan = id; QUAND.m = new Map(); S.forEach(k => QUAND.m.set(k, gardees[k] || 0)); sauverHeures(id); return; }
  let neuf = false; S.forEach(k => { if (!QUAND.m.has(k)) { QUAND.m.set(k, t0); neuf = true; } }); [...QUAND.m.keys()].forEach(k => { if (!S.has(k)) { QUAND.m.delete(k); neuf = true; } });
  if (neuf) sauverHeures(id); }
const heureDuChangement = k => QUAND.m.get(k) || 0;
// un geste fait fiche fermée (le récapitulatif, le plan) se date aussi : un coup d'œil toutes les deux secondes, page visible
if (typeof document !== 'undefined' && typeof setInterval === 'function') setInterval(() => { try { if (!document.hidden && app && app.contrat && verite().length) noterHeures(); } catch (_) { } }, 2000);
// « aujourd'hui à 14 h 32 », « hier à 9 h 05 », « le 3 nov. à 14 h 32 » — l'heure exacte, qui ne vieillit pas
function quandDit(t) { const d = new Date(t), j = new Date(), hm = d.getHours() + ' h ' + String(d.getMinutes()).padStart(2, '0'), meme = (a, b) => a.toDateString() === b.toDateString();
  if (meme(d, j)) return 'aujourd’hui à ' + hm; const h = new Date(j); h.setDate(j.getDate() - 1); if (meme(d, h)) return 'hier à ' + hm;
  return 'le ' + d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' à ' + hm; }
// les options d'un raccord, en mots (« sortie coudée · étanchéité requise ») ; `defaut` : ce que VOLTA prend sans option
const motsRaccord = (o, defaut) => PUCES_RACCORD.filter(([k]) => k in o).map(([k, t, opts]) => { const v = defaut ? opts[0][0] : String(o[k]); const m = opts.find(([x]) => x === v); return t.toLowerCase() + ' ' + (m ? m[1] : v); })
  .concat(o.designation ? [defaut ? 'désignation calculée' : 'désignation ' + o.designation] : []).join(' · ');
const motSexe = (s, prise) => (prise ? 'partie mobile ' : '') + (s === 'M' ? 'mâle' : s === 'F' ? 'femelle' : String(s || '').toLowerCase());
/* LES CHOIX DE VOLTA PRIS À LA MAIN sur un objet : chacun { cle (sa signature), quoi, de, avant, depuis, apres, qui, auto
   (le retour à VOLTA : la clé de `retourAutomatique`), faire (un retour particulier), aide, pourquoi }. La valeur d'avant
   est celle que VOLTA prendrait seul ; un choix qui lui est égal n'a rien changé, il ne se compte pas. */
function choixALaMain(nom, type) { const xs = [], C = app.contrat, N = app.norme, V = verite(), essai = f => { try { return f(); } catch (_) { return null; } };
  const ajoute = x => { if (!x || (x.avant && x.apres && x.avant === x.apres)) return; xs.push({ qui: 'vous', depuis: 'volta', ...x }); };
  if (type === 'equipement') {
    const cav = essai(() => cavitesDe(nom)) || [], conns = essai(() => connecteursDe(nom, V)) || [];
    cav.forEach(k => { const Q = k.plan, M = Q && Q.modules && Q.modules[0]; if (!Q || !Q.main || !M) return; const c = conns.find(x => x.nom === k.nom) || {};
      const auto = essai(() => remplirContacts(k.points, N, { pn: c.pn, sexe: sexeChoisi(nom + '|' + k.nom) }).reference);
      ajoute({ cle: 'd|' + nom + '|' + k.nom + '|' + C.designations.get(nom + '|' + k.nom), quoi: 'Arrangement', de: 'du connecteur ' + k.nom, avant: auto || 'le sien', apres: M.reference, mono: true, auto: 'arr:' + nom + '|' + k.nom }); });
    [...(C.sexes || [])].filter(([k]) => k.startsWith(nom + '|')).forEach(([k, v]) => ajoute({ cle: 's|' + k + '|' + v, quoi: 'Sexe', de: 'du connecteur ' + k.slice(nom.length + 1), avant: 'celui de VOLTA', apres: motSexe(v), auto: 'sexe:' + k }));
    const ch = typeof chargeEcrite === 'function' ? chargeEcrite(nom) : null;
    if (ch && phaseEcrite(ch)) { const perm = ch.perm && ch.perm.i > 0 ? ch.perm.i : null, dem = ch.dem && ch.dem.i > 0 ? ch.dem : null, dj = essai(() => disjoncteursDe(nom)) || [];
      ajoute({ cle: 'c|' + nom + '|' + profilSansCalibre(ch), quoi: 'Ce qu’il consomme', avant: 'pas écrite', depuis: 'calcul', apres: [perm ? amperes(perm) + ' en permanence' : '', dem ? amperes(dem.i) + ' au démarrage' + (dem.t ? ' pendant ' + secondes(dem.t) : '') : ''].filter(Boolean).join(', ') || 'écrite',
        auto: 'conso:' + nom, pourquoi: dj.length ? 'Avant, VOLTA comptait pour ses câbles le courant total de ' + dj.join(', ') + ' ; sa consommation fait maintenant leur courant et le profil de ' + (dj.length > 1 ? 'ces disjoncteurs' : 'son disjoncteur') + '.' : '' }); } }
  if (type === 'prise') { const Q = essai(() => planDeCoupure(nom).plan), sx = sexeChoisi(nom);
    const Qa = Q && (Q.main || Q.visee) ? essai(() => coupureEnModule(nom, V, N, '', sx).plan) : null;
    if (Q && (Q.main || Q.visee)) ajoute({ cle: 'd|' + nom + '|' + C.designations.get(nom), quoi: 'Arrangement', avant: (Qa && Qa.reference) || 'le sien', depuis: Qa && Qa.nomme ? 'fichier' : 'volta', apres: Q.reference || (Q.modules && Q.modules[0] ? Q.modules[0].reference : ''), mono: true, auto: 'arr:' + nom });
    // (la valeur de VOLTA qui venait de votre fichier — la référence nomme l'arrangement, dit le sexe — : « votre fichier »)
    const Qs = sx ? essai(() => coupureEnModule(nom, V, N, C.designations.get(nom) || '', '').plan) : null;
    if (sx) ajoute({ cle: 's|' + nom + '|' + sx, quoi: 'Sexe des contacts', avant: motSexe(Qs && Qs.sexe, true), depuis: Qs && Qs.sexeSource === 'part number' ? 'fichier' : 'volta', apres: motSexe(sx, true), auto: 'sexe:' + nom }); }
  if (type === 'barrette') (essai(() => modulesDeLaBarrette(nom)) || []).forEach(M => {
    const fich = M.fichier && cleNorme(M.fichier) !== cleNorme(M.reference);
    if (M.main) { const p = essai(() => modulesPossiblesDe(nom, M.numero)), auto = p && p.auto ? p.auto : '';
      ajoute({ cle: 'm|' + nom + '|' + M.numero + '|' + M.reference, quoi: 'Module ' + M.numero, avant: auto || 'celui de VOLTA', depuis: auto && M.fichier && cleNorme(auto) === cleNorme(M.fichier) ? 'fichier' : 'volta', apres: M.reference, mono: true, auto: 'mod:' + nom + '|' + M.numero, pourquoi: fich && auto && cleNorme(M.fichier) !== cleNorme(auto) ? 'Votre fichier écrit ' + M.fichier + '.' : '' }); }
    else if (fich) xs.push({ cle: '', quoi: 'Module ' + M.numero, avant: M.fichier, depuis: 'fichier', apres: M.reference, qui: 'volta', mono: true, pourquoi: M.ecart && M.ecart.raison ? 'Celui de votre fichier ne convient pas : ' + M.ecart.raison + '.' : 'VOLTA retient un autre module que celui de votre fichier.',
      faire: () => choisirModuleDeBarrette(nom, M.numero, M.fichier), aide: 'Reprendre celui de votre fichier (' + M.fichier + '), à la main — VOLTA dit pourquoi il l’écartait', dit: 'Module ' + M.numero + ' de ' + nom + ' : ' + M.fichier + ', celui de votre fichier, pris à la main.' }); });
  // le raccord (un équipement : par connecteur ; une prise : par partie)
  [...(C.raccords || [])].filter(([k, v]) => k.startsWith(nom + '|') && v && Object.keys(v).length).forEach(([k, v]) => { const p = k.slice(nom.length + 1);
    ajoute({ cle: 'r|' + k + '|' + JSON.stringify(v), quoi: 'Raccord', de: type === 'prise' ? (p === 'fiche' ? 'de la partie mobile' : p === 'embase' ? 'de la partie fixe' : '') : 'du connecteur ' + p, avant: motsRaccord(v, true) || 'sans option', depuis: 'calcul', apres: motsRaccord(v, false), auto: 'raccords:' + k }); });
  // la nature, écrite à la main (le récapitulatif)
  const nat = C.designations.get(CLE_NATURE(nom)); if (nat) ajoute({ cle: 'd|' + CLE_NATURE(nom) + '|' + nat, quoi: 'Nature', avant: natureDe(nom), depuis: 'volta', apres: nat, auto: 'nature:' + nom });
  // le calibre retenu à la main (un disjoncteur) : ce que VOLTA prendrait, ce que vous avez pris
  if (type === 'disjoncteur') { const ch = typeof chargeEcrite === 'function' ? chargeEcrite(nom) : null, d = ch && ch.calibre > 0 ? essai(() => disjonctionDe(nom)) : null;
    if (d) xs.push({ cle: 'cal|' + nom + '|' + ch.calibre, quoi: 'Calibre', avant: d.passe > 0 ? amperes(d.passe) : 'celui de VOLTA', depuis: 'volta', apres: amperes(ch.calibre), qui: 'vous', calibre: true,
      faire: () => rendreCalibre(nom), aide: 'Rendre le calibre à VOLTA' + (d.passe > 0 ? ' : ' + amperes(d.passe) + ', le plus petit qui ne disjoncte pas' : ''), pourquoi: d.passe > 0 ? 'Le plus petit qui ne disjoncte pas est ' + amperes(d.passe) + '.' : '' }); }
  return xs; }
// une valeur du fichier réécrite (`changementsEcrits`), en ligne d'historique
function ligneDuFichier(x, o) { const [l, c] = x.rendre[0] || [], rep = c === 'pnDe' || c === 'contactDe' ? l.de : l.vers, pn = /^pn/.test(c), ct = /^contact/.test(c), nul = v => v == null || v === '' || v === 'rien';
  const marque = l && l.avant && l.avant['volta:' + c] !== undefined && l.avant['volta:' + c] === (l[c] == null ? null : l[c]), dj = pn && estDisjoncteur(rep);
  const t = Math.max(0, ...x.rendre.map(([y, ch]) => heureDuChangement('l|' + cleFil(y) + '|' + ch + '|' + (y[ch] == null || y[ch] === '' ? null : y[ch]))));
  // le câble, vu de la fiche : par son autre bout (« du câble DR16 vers 102CB1:1 ») ; dans la fiche du câble, rien
  const nom = o.tete && o.tete.nom, autre = l.de === nom ? [l.vers, l.borneVers] : l.vers === nom ? [l.de, l.borneDe] : [l.vers, l.borneVers];
  const quoi = ct ? 'Contact à sertir' : pn ? 'Référence' : majuscule(x.champ), de = ct ? 'côté ' + rep + ((c === 'contactDe' ? l.borneDe : l.borneVers) ? ':' + (c === 'contactDe' ? l.borneDe : l.borneVers) : '') : pn ? 'de ' + rep : o.type === 'fil' ? '' : 'du câble ' + (c === 'type' || !l.type ? '' : l.type + ' ') + 'vers ' + autre[0] + (autre[1] ? ':' + autre[1] : '');
  let avant = x.avant, depuis = 'fichier';
  // le fichier n'en disait rien : la valeur d'avant était celle de VOLTA (le contact de la table, la longueur supposée)
  if (nul(x.avant) && ct) { const b = c === 'contactDe' ? l.borneDe : l.borneVers, a = (() => { try { const k = contactAuBout(l, rep, b); return k && k.plan && k.plan.sertir ? motSertir(k.plan.sertir) : ''; } catch (_) { return ''; } })(); avant = a || 'celui de la table'; depuis = 'table'; }
  else if (nul(x.avant) && c === 'longueur') { const H = app.simu || HYPOTHESES; avant = '≈ ' + nombre(H.longueur) + ' m'; depuis = 'hyp'; }
  else if (nul(x.avant)) avant = 'vide';
  const qui = dj && marque ? 'volta' : marque ? 'prop' : 'vous', calF = dj ? (familleDuPn(l.avant[c], app.norme) || {}).calibre : null;
  // un calibre que VOLTA a écrit se réécrirait tout de suite : le défaire, c'est reprendre celui de votre fichier, à la main
  const faire = dj && marque ? (calF > 0 ? () => retenirCalibre(rep, calF) : null) : () => rendreChamps(x.rendre, 'retour à votre fichier : ' + quoi.toLowerCase() + (de ? ' ' + de : ''));
  return { cle: '', t, quoi, de, avant, depuis, apres: nul(x.apres) ? 'vide' : x.apres, qui, mono: c !== 'longueur', faire,
    aide: dj && marque ? 'Reprendre le calibre de votre fichier' + (calF > 0 ? ' (' + amperes(calF) + ')' : '') + ', à la main : VOLTA ne le changera plus' : depuis === 'table' ? 'Rendre le contact de la table (' + avant + ')' : 'Rendre ce que dit votre fichier : ' + avant + (x.rendre.length > 1 ? ', sur ses ' + x.rendre.length + ' câbles' : ''),
    pourquoi: dj && marque ? (calF > 0 ? 'Le ' + amperes(calF) + ' de votre fichier n’est pas le plus petit calibre qui ne disjoncte pas : VOLTA écrit celui-là.' : 'VOLTA écrit le plus petit calibre qui ne disjoncte pas.') : '',
    excel: !ct, dit: c === 'type' && !nul(x.avant) ? (o.type === 'fil' ? 'Le câble' : 'Le câble vers ' + autre[0] + (autre[1] ? ':' + autre[1] : '')) + ' revient en ' + avant + ', comme dans votre fichier.'
      : majuscule(quoi) + (de ? ' ' + de : '') + ' : ' + avant + ' revient, ' + (depuis === 'table' ? 'celui de la table' : depuis === 'hyp' ? 'supposée' : 'comme dans votre fichier') + '.' }; }
/* Les choix de VOLTA pris à la main sur un objet, en lignes d'historique : l'heure, le retour à VOLTA, l'aide, le mot. La
   fiche et l'historique du plan entier (08-journal) les lisent : les mêmes lignes, les mêmes mots. */
function choixEnLignes(nom, type) { let choix = []; try { choix = choixALaMain(nom, type); } catch (_) { choix = []; }
  choix.forEach(x => { x.t = x.t != null ? x.t : heureDuChangement(x.cle); if (x.auto && !x.faire) { const cle = x.auto; x.faire = () => retourAutomatique({ dataset: { auto: cle } }, { type: 'bloc', nom }); }
    if (!x.aide) x.aide = 'Rendre le choix à VOLTA' + (x.avant && !/^(celui|le sien|pas écrite|sans option)/.test(x.avant) ? ' : ' + x.avant : '');
    if (!x.dit) x.dit = majuscule(x.quoi) + (x.de ? ' ' + x.de : '') + (x.depuis === 'fichier' ? ' : celui de votre fichier revient.' : x.auto && /^conso:/.test(x.auto) ? ' : effacée, VOLTA compte sans.' : ' : VOLTA choisit de nouveau.'); });
  return choix; }
// QUI, en mots : un choix de VOLTA pris en Manuel le dit (la fiche et l'historique du plan, les mêmes mots)
const motQui = x => x.qui === 'vous' && x.auto ? 'en Manuel, par vous' : MOTS_QUI[x.qui] || '';
function journalDeLaFiche(o) { const nom = o.tete && o.tete.nom, xs = [];
  const choix = o.type !== 'fil' && nom && !/^Nouveau/.test(nom) ? choixEnLignes(nom, o.type) : [];
  // un calibre retenu à la main réécrit la référence du disjoncteur : une seule ligne, celle du calibre
  const calMain = choix.find(x => x.calibre);
  (o.ecrits || []).forEach(x => { if (calMain && x.objet === nom && /^pn/.test((x.rendre[0] || [])[1] || '')) { calMain.excel = true; calMain.pourquoi = 'Le plus petit qui ne disjoncte pas est ' + calMain.avant + '. Sa référence devient ' + x.apres + ' (votre fichier : ' + x.avant + ') dans l’Excel corrigé.'; return; } xs.push(ligneDuFichier(x, o)); });
  xs.push(...choix);
  // ce que VOLTA ajoute de lui-même (une barrette posée sur une borne qui en reçoit deux)
  (o.proposes || []).filter(x => x.champ !== 'module').forEach(x => xs.push({ cle: '', t: 0, quoi: majuscule(x.champ), de: x.objet ? 'sur ' + x.objet : '', avant: x.avant, depuis: 'fichier', apres: x.apres, qui: 'volta', mono: true,
    pourquoi: x.champ === 'barrette' ? 'VOLTA la pose pour relier les câbles qui arrivent sur une même borne : votre fichier en met plusieurs sur une seule.' : '' }));
  // (v86, la charte : « ce que VOLTA ajoute est marqué comme ajouté et se retrouve dans l'Historique ») une barrette ajoutée
  // par VOLTA qui a reçu son repère le garde : VT2 → 667VT3, et « Défaire » la rend provisoire (08-journal)
  const posee = nom && o.type === 'barrette' && typeof barrettesPosees === 'function' ? barrettesPosees().find(p => p.nom === nom) : null;
  if (posee) { const k = 'p|' + posee.vt + '|' + posee.nom;
    xs.push({ cle: k, t: heureDuChangement(k), quoi: 'Repère donné', de: 'à la barrette ajoutée par VOLTA sur ' + posee.sur, avant: posee.vt, depuisMot: 'repère provisoire', apres: posee.nom, qui: 'vous', mono: true, excel: true,
      pourquoi: 'Elle est dans votre installation, avec un câble à créer et ' + pluriel(posee.shunts.length, 'shunt') + ' : ' + pluriel(1 + posee.shunts.length, 'ligne') + ' de plus dans l’Excel corrigé.',
      faire: () => deposerBarrette(posee), aide: 'Elle redevient ' + posee.vt + ' : les câbles reviennent sur ' + posee.sur + ', le câble à créer et les shunts sortent de votre installation', dit: posee.nom + ' redevient ' + posee.vt + ' : les câbles reviennent sur ' + posee.sur + '.' }); }
  // le plus récent en haut ; sans heure connue, après, dans l'ordre de la fiche
  return xs.map((x, i) => [x, i]).sort((a, b) => (b[0].t || 0) - (a[0].t || 0) || a[1] - b[1]).map(a => a[0]); }
function modificationsDeLaFiche(ecrits, proposes, o) { o = o || {}; noterHeures();
  const xs = journalDeLaFiche({ ...o, ecrits: ecrits || [], proposes: proposes || [] }); FI.journal = xs; FI.ecarts = []; if (!xs.length) return null;
  // (ce qui part dans l'Excel corrigé : une valeur de votre fichier réécrite — pas un choix de VOLTA, qui reste avec le plan)
  const nom = o.tete && o.tete.nom, n = xs.length, nv = xs.filter(x => x.qui === 'volta' || x.qui === 'prop').length, excel = xs.some(x => x.excel);
  // (le nombre et son unité ne se séparent pas : « 200 ms », jamais « 200 » puis « ms » à la ligne)
  const val = (v, mono, b) => `<${b ? 'b' : 's'}${mono ? ' class="id"' : ''}>${insecable(esc(v))}</${b ? 'b' : 's'}>`;
  const ligne = (x, i) => `<li class="hi-i ${x.qui}${x.qui === 'vous' && x.auto ? ' manuel' : ''}">`
    + `<div class="hi-t"><b>${esc(x.quoi)}</b>${x.de ? ` <span>${esc(x.de)}</span>` : ''}</div>`
    + (x.t ? `<time class="hi-q" datetime="${new Date(x.t).toISOString()}">${esc(quandDit(x.t))}</time>` : '')
    + `<div class="hi-v"><span class="hi-av">${val(x.avant, x.mono && !/^(celui|le sien|pas écrite|sans option|vide|≈)/.test(x.avant))}<small>${esc(x.depuisMot || MOTS_DEPUIS[x.depuis] || '')}</small></span><span class="hi-f" aria-hidden="true">${ico('fleche')}</span>`
    + `<span class="hi-ap">${val(x.apres, x.mono, true)}<small>${esc(motQui(x))}</small></span></div>`
    + (x.faire ? `<button type="button" class="hi-d" data-hi="${i}" data-bulle="${escA(x.aide)}">${ico('retour')}<span>Défaire</span></button>` : '')
    + (x.pourquoi ? `<p class="hi-p">${insecable(esc(x.pourquoi))}</p>` : '') + '</li>';
  const sur = o.type === 'fil' ? 'ce câble' : nom || 'cet objet';
  // (v86) sous la liste, l'historique du plan entier (08-journal) : les mêmes cartes, pour tous les objets
  const html = `<div class="hi" id="fi-ecarts"><p class="hi-intro">Ce qui a changé sur <b${o.type === 'fil' ? '' : ' class="id"'}>${esc(sur)}</b> depuis votre fichier, le plus récent en haut.${excel ? ' Ce qui touche votre fichier part dans l’Excel corrigé.' : ''}</p><ol class="hi-l">${xs.map(ligne).join('')}</ol>`
    + (typeof ficheJournal === 'function' ? `<button type="button" class="fi-lien hi-plan" data-journal data-bulle="Tout ce qui a changé dans ce plan, objet par objet, avec « Défaire » sur chaque ligne">L’historique de tout le plan<kbd>H</kbd></button>` : '') + '</div>';
  return { n, mots: pluriel(n, 'changement') + (nv ? (nv === n ? (n > 1 ? ', tous par VOLTA' : ', par VOLTA') : ' (dont ' + nv + ' par VOLTA)') : ''), html }; }

/* ---- LES CHAMPS : une valeur, son retour au calcul ---------------------------------------------------------------- */
/* Une ligne de champ : l'étiquette (un mot, avec sa majuscule), la valeur ou son champ, « Changer » ; dessous, s'il le
   faut, une note courte (ou une valeur seconde, en petit) et la liste de choix. */
const ligneChamp = (k, v, o) => { o = o || {}; const fin = (o.origine || '') + (o.changer || '') + (o.auto || '');
  return `<div class="fc${o.cls ? ' ' + o.cls : ''}"${o.attrs ? ' ' + o.attrs : ''}><span class="fc-k">${esc(k)}</span><span class="fc-v">${v}${fin ? `<span class="fc-o">${fin}</span>` : ''}</span>${o.sous ? `<span class="fc-sous">${o.sous}</span>` : ''}${o.liste || ''}</div>`; };
const champs = lignes => { const xs = lignes.filter(Boolean); return xs.length ? `<div class="fs-champs">${xs.join('')}</div>` : ''; };
/* Un champ qu'on écrit : un fond léger dit qu'il s'écrit (le lecteur : « j'ai l'impression que tout est verrouillé »), le
   survol l'appuie, le clic l'ouvre ; Entrée l'applique, Échap le rend. */
const saisie = (attrs, val, o) => { o = o || {}; return `<input class="fc-in${o.mono ? ' mono' : ''}${o.court ? ' court' : ''}${o.long ? ' long' : ''}${o.cls ? ' ' + o.cls : ''}"${attrs} value="${escA(val == null ? '' : val)}"${o.ph ? ` placeholder="${escA(o.ph)}"` : ''}${o.liste ? ` list="${o.liste}"` : ''}${o.mode ? ` inputmode="${o.mode}"` : ''} aria-label="${escA(o.label || '')}" spellcheck="false" autocomplete="off">`; };
/* « Changer » : un seul par valeur, à sa droite ; il ouvre la liste de choix SOUS la valeur (pas un volet). */
const boutonChanger = (cle, titre, mot) => `<button type="button" class="fi-lien fc-changer" data-changer="${escA(cle)}" aria-expanded="${FI.liste === cle}"${titre ? ` data-bulle="${escA(titre)}"` : ''}>${esc(mot || 'Changer')}${ico('bas', 'fi-chevron')}</button>`;
/* LA LISTE DE CHOIX, sous la valeur qu'elle change : huit lignes en vue, un filtre au-delà ; Échap, ou un clic ailleurs,
   la ferme. Rien tant qu'elle n'est pas ouverte. */
const listeChoix = (cle, contenu, o) => { o = o || {}; if (FI.liste !== cle) return '';
  return `<div class="fi-choix${o.cls ? ' ' + o.cls : ''}" data-volet="${escA(cle)}" role="group" aria-label="${escA(o.titre || 'Choisir')}">${o.filtre ? `<div class="filtre fi-choix-filtre">${ico('loupe')}<input data-filtre-liste placeholder="${escA(o.filtre)}" aria-label="${escA(o.filtre)}" autocomplete="off" spellcheck="false"></div>` : ''}<div class="fi-choix-corps">${contenu}</div>${o.pied ? `<div class="fi-choix-pied">${o.pied}</div>` : ''}</div>`; };
// ce que le fichier portait pour un champ d'une liaison, en mots
const avantDe = (l, c) => l && l.avant && c in l.avant ? (l.avant[c] == null || l.avant[c] === '' ? 'rien' : String(l.avant[c])) : '';

/* ---- LES CALCULS PARTAGÉS : ce qui alimente un câble, ce qu'il admet, sa chute ------------------------------------- */
/* Le disjoncteur en amont de chaque câble du contrat : une passe sur les chemins de chaque disjoncteur (le premier qui
   passe par le câble), gardée tant que le contrat ne change pas (la clé du contrôle). */
// (la carte est faite des liaisons elles-mêmes : un Ctrl+Z rend des copies d'un contrat de même clé — on la refait aussi
// quand la liste des liaisons n'est plus la même)
const ALIM = { cle: null, carte: null, V: null, premier: null, dj: new Map(), br: new Map() };
/* (v84) CE QUE CONSOMME UN REPÈRE, pour le courant des branches (09 quater, `branchesDepuis` : le moteur l'appelle) : un
   équipement, sa consommation écrite (« Ce qu'il consomme » : 08-disjoncteurs, `consoDe`) ; un disjoncteur en aval, son
   profil (écrit, ou la somme de ce qu'il alimente) ; sinon rien. */
function consommationDuRepere(r) { if (!r || estMasse(r)) return null;
  if (estDisjoncteur(r)) { const c = typeof chargeDe === 'function' ? chargeDe(r) : null; return typeof phaseEcrite === 'function' && phaseEcrite(c) ? c : null; }
  return typeof consoDe === 'function' ? consoDe(r) : null; }
// les branches d'un disjoncteur (le courant que porte chacun de ses câbles), gardées avec la carte
const branchesDu = cb => { if (!ALIM.br.has(cb)) { let B; try { B = branchesDepuis(verite(), cb); } catch (_) { B = new Map(); } ALIM.br.set(cb, B); } return ALIM.br.get(cb); };
function carteDesAlimentations() { const cle = typeof CONTROLE !== 'undefined' ? CONTROLE.cle : null, V = verite();
  if (ALIM.carte && cle && ALIM.cle === cle && ALIM.V === V && ALIM.premier === V[0]) return ALIM.carte;
  const m = new Map(), tous = []; ALIM.dj = new Map(); ALIM.br = new Map();
  reperesDe(V).filter(estDisjoncteur).forEach(cb => { try { cheminsDepuis(V, cb).forEach(ch => tous.push({ cb, ch })); } catch (_) { } });
  // (v84) un câble est d'abord alimenté par le disjoncteur EN AVAL duquel il est ; le câble de la source (en amont : 09 quater,
  // `cheminsDepuis`) porte le courant du disjoncteur qu'il nourrit, mais celui-ci ne le protège pas : `amont` le dit
  [false, true].forEach(am => tous.filter(x => !!x.ch.amont === am).forEach(({ cb, ch }) => ch.segments.forEach(s => { if (s.fil && !m.has(s.fil)) m.set(s.fil, { cb, chemin: ch, amont: am }); })));
  ALIM.cle = cle; ALIM.carte = m; ALIM.V = V; ALIM.premier = V[0]; return m; }
function infosDisjoncteur(cb) { if (ALIM.dj.has(cb)) return ALIM.dj.get(cb); const d = disjonctionDe(cb), pts = d.points.length ? d.points : pointsDuProfil(d.profil), perm = pts.find(p => p.t === Infinity), pointe = pts[0];
  const x = { nom: cb, calibre: d.calibre, perm: perm ? perm.i : null, pointe: pointe && pointe.t !== Infinity ? pointe : null, points: pts }; ALIM.dj.set(cb, x); return x; }
const alimentationDuFil = l => { const a = carteDesAlimentations().get(l); return a ? { ...infosDisjoncteur(a.cb), chemin: a.chemin, amont: !!a.amont, branche: a.amont ? null : branchesDu(a.cb).get(l) || null } : null; };
/* CE QU'UN CÂBLE PORTE ET CE QU'IL ADMET : le courant, sa pointe, ce que la norme des câbles admet, déclassé comme la
   simulation (le faisceau, la charge, l'altitude, l'ambiante, le conducteur), et ce qui dépasse.
   (v84) LE MÊME CALCUL QUE LA PROTECTION (09 quater, `admissionDuFil`) : l'ambiante ne déclasse que le continu, et le
   palier d'un état se lit sur sa durée — `admise(t)` est le seuil que chaque phrase doit montrer. LE COURANT : le
   permanent du disjoncteur en amont (`source` 'profil') ; sans permanent, son CALIBRE, au pire (`source` 'calibre' — la
   chute en ligne prend le même : 08-disjoncteurs, `chutesDe` ; avant v84, la fiche prenait l'hypothèse, 2 A, et la chute
   le calibre) ; sans disjoncteur, l'hypothèse (`source` 'hypothese'). LA BRANCHE (v84, `al.branche` : 09 quater,
   `branchesDepuis`) : quand le câble n'alimente qu'une partie de ce que dessert son disjoncteur et que la consommation de
   chacun de ses bouts est écrite, il porte leur somme (`source` 'branche', son propre profil `pts`) ; quand elle manque,
   le courant total du disjoncteur, et `totalFaute` le dit (`aval` : ses bouts, `manque` : ceux sans consommation). SA
   RÉSISTANCE `rd` est celle de son conducteur sous ce courant (`tc` : la température estimée, AC 43.13-1B § 11-66 d(6),
   ou l'hypothèse « fixe ») — la même que sa chute : R × I s'y vérifie. */
const CALCULS = new Map();   // le temps d'un rendu : l'intensité de chaque câble, calculée une fois (vidé par rendreFiche)
function intensiteDuFil(l) { if (CALCULS.has(l)) return CALCULS.get(l); const x = intensiteCalculee(l); CALCULS.set(l, x); return x; }
function intensiteCalculee(l) { const H = app.simu || HYPOTHESES, jauge = jaugeDuType(l.type), neuf = l.origine === null;
  const A = l.type ? admissionDuFil(app.norme, l.type, H) : null, fn = A ? A.fil : null;
  const decl = fn ? A.decl : 1, amb = fn ? A.amb : 1, fac = fn ? A.facteurContinu : 1, facCourt = fn ? A.facteurCourt : 1, admise = t => fn && fn.intensite != null ? intensiteAdmise(fn, t) * A.facteur(t) : null;
  const continu = fn && fn.intensite != null ? fn.intensite * fac : null, al = neuf ? null : alimentationDuFil(l), b = al && al.branche, propre = !!(b && b.ecrite);
  /* (v86, l'audit B1) une BRANCHE DE COMMANDE dont rien n'est écrit (09 quater, `inconnu` : elle ne mène qu'à des bobines, à
     des entrées de calculateur) : `source` 'commande', son courant INCONNU (`I` null) — jamais le courant total du
     disjoncteur : rien ne le juge, rien ne le grossit ; la fiche demande la consommation de la bobine. `traverses` : les
     relais et interrupteurs que le courant passe pour arriver à lui, contact supposé fermé */
  const inconnu = !!(b && b.inconnu), source = propre ? 'branche' : inconnu ? 'commande' : al && al.perm ? 'profil' : al && al.calibre > 0 ? 'calibre' : 'hypothese';
  const I = propre ? b.perm : inconnu ? null : source === 'profil' ? al.perm : source === 'calibre' ? al.calibre : H.courant;
  const tc = l.type ? temperatureDuConducteur(app.norme, l.type, I || 0, H) : { T: +H.tconducteur, estimee: false };
  const rd = l.type ? resistanceDuFil(app.norme, l.type, jauge, tc.T) : { rho: null, kConducteur: 1, conducteur: 'cuivre' };
  const pts = propre ? b.points : inconnu ? [] : al ? al.points : [{ nom: 'hypothèse', i: I, t: Infinity }], trop = fn ? pts.filter(pt => pt.i > admise(pt.t) + 1e-9) : [];
  const p0 = propre ? pts.find(p => p.t !== Infinity) || null : inconnu ? null : al && al.pointe, pointe = p0 ? { ...p0, admis: admise(p0.t) } : null;
  const aval = b ? { bouts: b.bouts, manque: b.manque, tout: b.tout, sans: b.sans || [], commande: !!b.commande } : null, totalFaute = !!(b && !b.tout && !b.ecrite && !inconnu && (source === 'profil' || source === 'calibre'));
  const traverses = al && al.chemin && typeof traverseesDuChemin === 'function' ? traverseesDuChemin(al.chemin, l) : [];
  return { H, jauge, fn, rd, tc, decl, amb, fac, facCourt, admise, continu, al, I, source, pts, pointe, trop, aval, totalFaute, commande: !!(b && b.commande), traverses, charge: continu && I != null ? I / continu : null }; }
/* LA CHUTE ADMISE : celle que le moteur rend pour la tension, le régime et les hypothèses de la simulation (la règle du
   lecteur : 2 V en monophasé et en continu, 4 V en triphasé ; sinon la table Réseau) — jamais un chiffre écrit ici. */
const chuteAdmiseDe = H => chuteAdmise(app.norme, H.tension, H.regime, H);
function chuteAdmiseDeLaSimu(H) { const a = chuteAdmiseDe(H); return a && a.chuteMax != null ? a.chuteMax : null; }
/* SA CHUTE : sur le câble (ρ × L × I), et EN LIGNE depuis le disjoncteur en amont, contre la chute admise.
   UNE SEULE VÉRITÉ (l'audit v72 : « W-012 vaut 1,29 V ambre dans la fiche de 102CB1 et 1,34 V vert dans la sienne ») : la
   chute en ligne d'un câble est celle de la liste de son disjoncteur (08-disjoncteurs, `chutesDe`) — le chemin le plus
   long qui passe par lui, au permanent du profil, la chute propre du CALIBRE RETENU comprise (la fiche du câble prenait
   le premier chemin venu et la chute du calibre du part number) ; son état compte la POINTE comme le contrôle (une pointe
   qui dépasse sur des longueurs supposées : à voir). Les chutes d'un disjoncteur se gardent tant que le contrat ne change
   pas (la clé du contrôle, comme la carte des alimentations). */
const CHUTES = { cle: null, V: null, premier: null, m: new Map() };
function chutesDuDisjoncteur(cb) { const cle = typeof CONTROLE !== 'undefined' ? CONTROLE.cle : null, V = verite();
  if (!(cle && CHUTES.cle === cle && CHUTES.V === V && CHUTES.premier === V[0])) { CHUTES.m = new Map(); CHUTES.cle = cle; CHUTES.V = V; CHUTES.premier = V[0]; }
  if (!CHUTES.m.has(cb)) { let r; try { r = chutesDe(cb, disjonctionDe(cb)); } catch (_) { r = { cs: [] }; } CHUTES.m.set(cb, r); }
  return CHUTES.m.get(cb); }
// le chemin le plus long qui passe par un câble (les chutes sont rangées de la plus forte à la plus faible)
const chuteEnLigne = (l, cb) => (chutesDuDisjoncteur(cb).cs || []).find(c => c.segments.some(s => s.fil === l)) || null;
// l'état d'une chute en ligne : au-delà de l'admis, au permanent ou en pointe — un problème sur des longueurs mesurées, à voir sur des longueurs supposées
const etatDeChute = (c, pointe) => !c ? '' : c.trop || pointe ? (c.reel ? 'ko' : 'att') : 'ok';
const pireChuteEnPointe = c => c ? (c.pointes || []).filter(p => p.trop).sort((a, b) => b.dU / b.admis - a.dU / a.admis)[0] || null : null;
/* (v84) SA PART : son segment dans la chute en ligne — le même courant, la même température de conducteur, le même
   régime et le même retour (avant, « ce câble en fait 0,83 V » sous un total de 1,34 V dont il faisait 1,14 V : sa part
   se calculait à 20 °C) ; sans chemin de disjoncteur, le même calcul sur lui seul (09 quater, `chuteDuCable`), au
   courant de sa fiche. `rho` (Ω/km), `T` (°C) et `I` (A) : ce qui a servi. */
// (v86) un câble de commande au courant inconnu n'a pas de chute qui se calcule (09 quater : elle dépend de ce courant)
function chuteDuFil(l, x) { x = x || intensiteDuFil(l); const H = x.H;
  const total = x.al ? chuteEnLigne(l, x.al.nom) : null, seg = total ? total.segments.find(s => s.fil === l) || null : null, c = seg || (x.I == null ? null : chuteDuCable(app.norme, l, x.I, H));
  const L = c && c.longueur > 0 ? c.longueur : l.longueur > 0 ? l.longueur : H.longueur, dU = c && c.dU != null ? c.dU : null;
  const admise = chuteAdmiseDe(H), max = total && total.admis != null ? total.admis : admise && admise.chuteMax != null ? admise.chuteMax : null, pointe = pireChuteEnPointe(total);
  return { L, dU, rho: c ? c.rho : null, T: c ? c.T : null, I: seg && seg.courant != null ? seg.courant : x.I, total, max, regle: total && total.regle ? total.regle : admise ? admise.regle || '' : '', hyp: !(l.longueur > 0), trop: !!(total && total.trop), reel: !!(total && total.reel), pointe, etat: etatDeChute(total, pointe) }; }
/* CE QU'UN AUTRE TYPE DE CÂBLE PORTERAIT à la place de celui-ci (la même famille, une autre gauge) : le courant qu'il
   porte (le profil du disjoncteur en amont, sinon l'hypothèse) contre ce que ce type admet, déclassé de même. Rend ce
   qu'il admet en continu, ou null s'il ne tient pas (ou que la norme ne le connaît pas). */
function tientLeCourant(l, type) { const x = intensiteDuFil(l), A = jaugeDuType(type) != null ? admissionDuFil(app.norme, type, x.H) : null; if (!A || !A.fil || A.fil.intensite == null) return null;
  return (x.pts || []).every(p => p.i <= intensiteAdmise(A.fil, p.t) * A.facteur(p.t) + 1e-9) ? A.fil.intensite * A.facteurContinu : null; }
// les gauges d'une famille de câbles dans la base, de la plus grosse à la plus fine (DR : 6 … 26)
const gaugesDeFamille = fam => [...(famillesCables().get(String(fam || '').toUpperCase()) || [])].sort((a, b) => a - b);
/* LE PLUS FIN QUI TIENT (le parcours v72 : « W-012 en 18 reste rouge ; on essaie, on se trompe ») : sous un disjoncteur,
   la gauge que le moteur dit pour son calibre (09 bis, `jaugeQuiSuit` : porter la charge, admettre le calibre, rester
   protégé — la même que « Changer les câbles ») ; sans disjoncteur, la plus fine de sa famille qui porte le courant.
   `calibre` : celui sous lequel chercher — v73 (le technicien, n° 1 : « un câble DR12 dimensionné pour un 15 A qui n'est
   pas dans le fichier ») : tant que le calibre que l'outil propose n'est pas écrit, c'est celui du retest. Rend
   { type, pourquoi } ou null. */
// (v86, l'audit B1 : « un DR16 proposé sur le fil d'un interrupteur de commande ») un câble de commande ne grossit pas
function plusFinQuiTient(l, calibre) { const x = intensiteDuFil(l), p = partiesDuType(l.type); if (!l.type || p.jauge == null || x.commande || x.source === 'commande') return null;
  if (x.al) { try { const d = disjonctionDe(x.al.nom), f = (d.contexte.fils || []).find(y => y.l === l), cal = calibre > 0 ? calibre : d.calibre; if (f && cal > 0) { const H = { ...HYPOTHESES, ...(d.contexte.hyp || {}) }, ctx = contexteDeProtection(app.norme, H, d.courbes, pointsDuProfil(d.profil)), q = protegerFil(app.norme, cal, f, H, ctx);
    if (filSuit(q)) return null; const s = jaugeQuiSuit(app.norme, cal, f, H, ctx); return s ? { type: s.type, pourquoi: `le plus fin que protège le ${amperes(cal)}${calibre > 0 && calibre !== d.calibre ? ' de l’installation' : ''} de ${x.al.nom}` } : null; } } catch (_) { } }
  if (!x.trop.length) return null;
  const t = gaugesDeFamille(p.famille).filter(j => j < p.jauge).reverse().map(j => typeDe(p.famille, j)).find(ty => tientLeCourant(l, ty) != null);
  return t ? { type: t, pourquoi: 'le plus fin qui porte ' + (x.al ? 'son profil' : amperes(x.I) + ' supposés') } : null; }
/* LA PROTECTION D'UN CÂBLE PAR SON DISJONCTEUR (v73 — l'ingénieur, point 5 : « le câble est l'objet en défaut, et c'est
   sa fiche qui se tait » ; le technicien, n° 1 : « un câble ne passe pas au vert tant que son disjoncteur est rouge »).
   SES PROPRES problèmes de protection (un calibre plus gros que ce qu'il admet en continu ; une surcharge brève que la
   courbe laisse passer) et LA CHAÎNE DE CAUSE quand c'est le disjoncteur (le calibre du retest déclenche ou touche la
   courbe, l'outil en propose un autre, pas encore écrit). Le domaine de la vérité (08-controle) les rattache au câble :
   `problemesDuCable(l)` → [{ niveau: 'ko' | 'att', texte, section, genre, repere, cause?, gestes }] — tant qu'il manque, la fiche les lit dans la
   disjonction de son disjoncteur, avec les phrases de sa fiche (`controleDisjonction`). Rend { probs, cause, calEcrit }
   — `cause` : { cb, d, k, xs, ce } quand le disjoncteur en est la cause ; `calEcrit` : le calibre sous lequel chercher
   « Seulement ce câble ». */
function protectionDuCable(l, x) { const out = { probs: [], cause: null, calEcrit: null }; if (!x || !x.al) return out;
  const cb = x.al.nom; let d = null; try { d = disjonctionDe(cb); } catch (_) { return out; } if (!d) return out;
  let deC = null; if (typeof problemesDuCable === 'function') { try { deC = problemesDuCable(l); } catch (_) { deC = null; } }
  // (de sa liste, la fiche garde ce qu'elle ne calcule pas elle-même — la protection, le contact contre le calibre, la cause — :
  // la charge et la chute du câble sont déjà ses lignes)
  const garde = p => !!p && (!!p.cause || /^(protection|contact|calibre|cause)$/.test(p.genre || '') || /protég|contact taille|calibre|retest|installation/.test(p.texte || ''));
  let causeDeC = false;
  if (Array.isArray(deC)) deC.filter(garde).forEach(p => { if (p.cause || /retest|de l’installation|de votre fichier/.test(p.texte || '')) causeDeC = true; out.probs.push({ niveau: p.niveau === 'ko' ? 'ko' : 'att', texte: p.texte, section: p.section || 'fils' }); });
  // (jugé sous le calibre ÉCRIT : tant que l'outil propose un autre calibre sans qu'il soit écrit, celui du retest — jamais le 15 A fantôme)
  else { const nonEcrit = typeof propositionNonEcrite === 'function' && propositionNonEcrite(d) && d.pn > 0, cal = nonEcrit ? d.pn : d.calibre, du = nonEcrit ? ' de l’installation' : '';
    let f = (d.fils || []).find(y => y.l === l || (y.cable && l.cable && y.cable === l.cable && y.type === l.type));
    if (nonEcrit) { const f0 = (d.contexte.fils || []).find(y => y.l === l); f = null; if (f0) try { const H = { ...HYPOTHESES, ...(d.contexte.hyp || {}) }; f = protegerFil(app.norme, cal, f0, H, contexteDeProtection(app.norme, H, d.courbes, pointsDuProfil(d.profil))); } catch (_) { f = null; } }
    if (f && f.verdict === 'calibre') out.probs.push({ niveau: 'att', texte: `pas protégé en surcharge : ${amperes(f.continu)} admis en continu${typeof motFacteur === 'function' ? motFacteur(f.facteur) : ''} < le ${amperes(cal)}${du} de ${cb}`, section: 'fils' });
    else if (f && f.protege === false && f.pireLaisse) { const y = f.pireLaisse; out.probs.push({ niveau: 'att', texte: `pas protégé en surcharge brève : le ${amperes(cal)}${du} de ${cb} laisse passer ${amperes(y.courant)}${typeof pourPalier === 'function' ? ' ' + pourPalier(y.palier) : ''} à ${f.courbeLente}${typeof limiteDuFil === 'function' ? ', ' + limiteDuFil(f, y) : ''}`, section: 'fils' }); }
    // son contact contre le calibre — quand le plan le connaît (un contact supposé ne fait pas un problème)
    if (f && f.contact && f.contact.parLePlan) { if (f.contactDepasse) out.probs.push({ niveau: 'att', texte: `son contact taille ${f.contact.taille} (${amperes(f.contact.intensite)}) ne porte pas le permanent de ${cb}`, section: 'trajet' }); else if (f.contactSurcharge) out.probs.push({ niveau: 'att', texte: `son contact taille ${f.contact.taille} n’admet que ${amperes(f.contact.intensite)}, moins que le ${amperes(cal)}${du} de ${cb}`, section: 'trajet' }); } }
  // la cause : le calibre du retest, que l'outil remplacerait (il déclenche, ou il touche la courbe) — tant que ce n'est pas écrit
  // (celle du domaine C d'abord : 08-controle, `causeDuDisjoncteur` — { repere, retest, retenu, verdict, cables, mot, bulle })
  if (typeof causeDuDisjoncteur === 'function') { let c = null; try { c = causeDuDisjoncteur(cb); } catch (_) { c = null; }
    if (c && c.verdict && c.verdict.cle !== 'passe') { const xs = (c.cables || []).map(x => ({ x, f: null })); out.calEcrit = c.retest; out.cause = { cb, d, k: c.verdict.cle, xs, ce: xs.find(p => p.x.cable && p.x.cable === l.cable) || null, bulle: c.bulle }; }
    return out; }
  if (typeof propositionNonEcrite === 'function' && propositionNonEcrite(d)) { const k = cleDuVerdict(d.gPn);
    if (k === 'declenche' || k === 'juste') { out.calEcrit = d.pn;
      const xs = typeof filsDuMeilleur === 'function' && d.calibre === (d.meilleur || {}).calibre ? filsDuMeilleur(d).filter(p => p.f && p.x.propose) : [], ce = xs.find(p => p.f.l === l);
      out.cause = { cb, d, k, xs, ce };
      if (!causeDeC) out.probs.push({ niveau: 'ko', texte: `${cb} : le ${amperes(d.pn)} de votre fichier ${k === 'declenche' ? motDuVerdict('declenche') : motDuVerdict('juste')} — il protège ce câble ; VOLTA propose ${amperes(d.calibre)}${ce ? ', ce qui demande ' + ce.x.propose + ' ici' : ''}`, section: 'fils', viser: undefined }); } }
  return out; }
/* La chaîne de cause, en tête de la fiche du câble (le technicien, n° 1) : ce que fait le disjoncteur, ce que VOLTA propose
   et ce que ça demande ; « Tout régler » (le même geste que la carte de décision du disjoncteur, `deciderCalibre`),
   « Seulement W-012 » (le plus fin que protège le calibre DU RETEST), « Voir 102CB1 ». */
/* (v83) CE QUE COÛTE un câble grossi : la masse en plus sur sa longueur (la base des câbles donne ses g/m ; la longueur
   du fichier, sinon celle des Hypothèses, dite « supposée »). Rien quand la base ne connaît pas l'un des deux types. */
function coutDuType(l, type) { const N = app.norme, a = l && l.type ? cableDuType(N, l.type) : null, b = type ? cableDuType(N, type) : null;
  if (!a || !b || a.masse == null || b.masse == null) return '';
  const lu = l.longueur > 0, L = lu ? l.longueur : ((app.simu || HYPOTHESES).longueur || null); if (!L) return '';
  const g = (b.masse - a.masse) * L; if (Math.abs(g) < 0.5) return '';
  return (g > 0 ? '+' : '−') + nombre(Math.round(Math.abs(g))) + '\u00a0g sur ' + nombre(arrondi(L, 2)) + '\u00a0m' + (lu ? '' : ' supposés'); }
function causeDuCable(l, prot, fin) { const c = prot && prot.cause; if (!c) return '';
  const { cb, d, k, xs, ce } = c, types = [...new Set(xs.map(p => p.x.propose))], nom = 'ce câble';
  const tout = `Tout régler : ${cb} en ${amperes(d.calibre)}${xs.length ? ' et ' + (xs.length > 1 ? xs.length + ' câbles' : '1 câble') + (types.length === 1 ? ' en ' + types[0] : ' grossis') : ''}`;
  const phrase = `<b class="id">${esc(cb)}</b> : le ${esc(amperes(d.pn))} de votre fichier ${k === 'declenche' ? motDuVerdict('declenche') : motDuVerdict('juste')}, et il protège ${esc(nom)}. VOLTA propose <b>${esc(amperes(d.calibre))}</b>${ce ? `, ce qui demande <b class="id">${esc(ce.x.propose)}</b> ici${(m => m ? ` <span class="fi-cout">(${esc(m)})</span>` : '')(coutDuType(l, ce.x.propose))}` : ''}.`;
  const seul = fin ? `<button type="button" class="btn papier fi-reparer" data-reparer="${escA(cleFil(l))}" data-type="${escA(fin.type)}" data-bulle="${escA(majuscule(fin.pourquoi) + ' : ' + fin.type + (coutDuType(l, fin.type) ? ' (' + coutDuType(l, fin.type) + ')' : '') + ' — ' + cb + ' garde son ' + amperes(d.pn) + ' ; « Défaire » le rend')}">Seulement ${esc(nom)} : ${esc(fin.type)}</button>` : '';
  return `<section class="fi-cause ko" aria-label="${escA('La cause : ' + cb)}"><p class="fi-cause-p">${insecable(phrase)}</p><div class="fi-cause-gestes">`
    + `<button type="button" class="btn cuivre" data-tout-regler="${escA(cb)}" data-bulle="${escA('Écrit dans l’installation : ' + ((d.meilleur || {}).pn && d.meilleur.calibre === d.calibre ? d.meilleur.pn : amperes(d.calibre)) + (xs.length ? ', et ' + xs.map(p => (p.x.cable || 'un câble') + ' en ' + p.x.propose).join(', ') : '') + ' — une seule entrée d’historique, Ctrl+Z défait le tout')}">${esc(tout)}</button>${seul}`
    + `<button type="button" class="btn lien dense" data-choisir-bloc="${escA(cb)}">Voir ${esc(cb)}</button></div></section>`; }

// les câbles d'un repère, chacun une fois (pas les shunts) : { l, borne, vers, borneVers, amont }
const filsDuRepere = nom => liaisonsDeRepere(nom).filter(l => (l.de === nom || l.vers === nom) && l.de !== l.vers).map(l => ({ l: sourceDe(l) || l, borne: l.de === nom ? l.borneDe : l.borneVers, vers: l.de === nom ? l.vers : l.de, borneVers: l.de === nom ? l.borneVers : l.borneDe, amont: l.vers === nom }));
// les barrettes à poser sur les bornes d'un repère : borne → VTn
const barrettesSur = nom => { const m = new Map(); liaisonsDuPlan().forEach(l => { if (l.origine === null && l.de === nom && l.vers === l.aPoser && estRaccordAPoser(l)) m.set(String(l.borneDe), l.aPoser); }); return m; };

/* ---- LE CONTACT À SERTIR, choisi à la main --------------------------------------------------------------------- */
/* Le contact qu'on sertit au bout d'un câble se lit dans la table Contacts de la norme (09, `contactDuFil`) ; on peut en
   retenir un autre parmi ceux de la table qui acceptent le câble (même taille, même sexe, même type et gauge, ou « * ») :
   il s'écrit sur la liaison (`contactDe` / `contactVers` : le même champ que le récapitulatif, lu par la nomenclature
   et le contrôle — `contactMain`, 08-modules), et « Automatique », en tête de la liste, rend celui de la table. Un contrat d'avant qui le gardait dans
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
/* La liste des contacts d'un bout, sous sa ligne. v73 (l'ingénieur, point 7 : « Automatique EN3155-003F2020 et
   EN3155-003F2020 : la même référence deux fois, et aucune autre ») : « Automatique » (celui de la table) en tête, une
   seule fois ; puis TOUS les contacts de cette taille et de ce sexe dans la table de la norme — chacun avec son ✓ (il
   admet ce câble : son type, sa gauge) ou son ✕ (et pour quoi il est fait), ceux qui l'admettent d'abord. Tous se
   cliquent : un contact forcé qui n'admet pas le câble se marque rouge dans la table des contacts. */
// (`nu` : sans son cadre — la carte du contact, `carteContact`, la porte sous ce qu'elle dit du contact posé)
function choixSertir(ks, x, f, st, nu) { const Q = x.Q, fam = Q ? Q.famille || (Q.modules && Q.modules[0] ? Q.modules[0].module.famille : '') : '';
  const bons = Q ? contactsPossibles(fam, x.taille, x.sexe, f.type) : [], j = jaugeDuType(f.type), t = typeDuFil(f.type);
  const auto = x.sertir ? motSertir(x.sertir) : '', main = !!(st && st.main), cleC = c => c.reference + '|' + (c.accessoire || '');
  const vus = new Set(), tous = Q ? contactsDeTaille(app.norme, fam, x.taille).filter(c => !x.sexe || !c.sexe || c.sexe === x.sexe).filter(c => { const k = cleC(c); if (vus.has(k)) return false; vus.add(k); return true; }) : [];
  const accepte = c => bons.some(b => cleC(b) === cleC(c)), deAuto = c => x.sertir && c.reference === x.sertir.reference && (c.accessoire || '') === (x.sertir.accessoire || '');
  const xs = tous.filter(c => !deAuto(c)).sort((a, b) => accepte(b) - accepte(a) || triBornes(a.reference, b.reference));
  const pour = c => (c.typeFil === '*' ? 'tout type' : c.typeFil) + (c.jauge != null ? ' · ' + c.jauge + ' AWG' : ' · toute gauge') + (c.accessoire ? ' · avec ' + c.accessoire : '');
  const cable = (f.type || 'ce câble') + (j != null && !/AWG/.test(f.type || '') ? ` (${j} AWG)` : '');
  const tete = `<button type="button" class="fi-chip fi-chip-auto" data-auto="${escA('sertir:' + ks)}" aria-pressed="${!main}" data-bulle="${escA('Le contact que la table de la norme donne' + (auto ? ' : ' + auto : ''))}">${ico('etoile')}Automatique${auto ? ` <i>${esc(auto)}</i>` : ''}</button>`;
  const items = xs.map(c => { const ok = accepte(c);
    return `<button type="button" class="fi-chip ct-chip ${ok ? 'ok' : 'ko'}" data-sertir-ref="${escA(ks)}" data-v="${escA(c.reference)}" aria-pressed="${main && st.reference === c.reference}" data-bulle="${escA(c.reference + ' — ' + pour(c) + ' : ' + (ok ? 'il admet ' : 'il n’admet pas ') + cable + (ok ? '' : ' — un clic le retient quand même'))}">${esc(c.reference)}${c.accessoire ? ' <i>+ ' + esc(c.accessoire) + '</i>' : ''}<b class="ct-chip-m" aria-label="${ok ? 'admet ce câble' : 'n’admet pas ce câble'}">${ok ? '✓' : '✕'}</b></button>`; }).join('');
  const filtre = xs.length > 12 ? `<div class="filtre fi-choix-filtre">${ico('loupe')}<input data-filtre-liste placeholder="Filtrer les contacts" aria-label="Filtrer les contacts" autocomplete="off" spellcheck="false"></div>` : '';
  const corps = voletT(nu ? `Changer de contact — ceux de taille ${x.taille || '?'}${x.sexe ? ', ' + nomDuSexe(x.sexe) + 's' : ''} ; ✓ admet ${cable}` : `Contacts de taille ${x.taille || '?'}${x.sexe ? ', ' + nomDuSexe(x.sexe) + 's' : ''} — ✓ admet ${cable}`) + filtre
    + (items || auto ? `<div class="fi-puces">${tete}${items}</div>` : '<p class="fi-note">La table Contacts de la norme n’en donne aucun de cette taille.</p>');
  return nu ? corps : `<div class="fi-choix" data-volet="${escA('sertir:' + ks)}">${corps}</div>`; }
// un contact choisi à la main que la table connaît pour cette taille, mais qui n'admet pas ce câble : il est forcé, en rouge
const contactForce = (P, f, st) => { if (!(st && st.main && P && P.Q && f && f.type)) return false; const fam = P.Q.famille || (P.Q.modules[0] ? P.Q.modules[0].module.famille : '');
  return contactsDeTaille(app.norme, fam, P.taille).some(c => c.reference === st.reference) && !contactsPossibles(fam, P.taille, P.sexe, f.type).some(c => c.reference === st.reference); };

/* ---- LE CONTACT, OUVERT (v74, lot F — le lecteur : « cliquer sur la gauge doit aller au contact et à sa norme ») -------
   Un clic sur la GAUGE ou le CONTACT d'une ligne de contacts (un connecteur, une barrette, une prise, le bout d'un câble)
   ouvre, sous la ligne, la carte du contact : ce qu'il est (« douille, taille 20, fût 20 »), SA norme (la partie de
   l'EN 3155 qui le définit — pas celle du connecteur : VOLTA ne les mélange pas), la TABLE d'où il sort et SA LIGNE
   (famille · taille · sexe · type · gauge), sa SOURCE (vérifiée par deux sources, vos tables, à confirmer), ce câble
   contre la plage de la taille (table des tailles), sa place (le contact du module, table des faces), son outillage ;
   dessous, quand il se change, les autres contacts de la taille (`choixSertir`). C'est la chaîne de « D'où vient chaque
   pièce » (`traceConnecteur`) pour UN câble, dite à quelqu'un qui découvre.
   o : { st (le contact posé : { reference, accessoire, main }), fam, taille, sexe, type, lettre, variante, ko, cote
   ('fiche', 'embase'), volet (la clé de la liste : `sertir:…` ou `ct:…`), choix (HTML : les autres contacts), trace (le
   connecteur a sa chaîne, plus bas) } */
const MOTS_SEXE_CT = { F: 'douille (femelle)', M: 'broche (mâle)' };
const ligneDeLaTable = x => [x.famille ? nomDeFamille(app.norme, x.famille) || x.famille : '', x.taille ? 'taille ' + x.taille : '', x.sexe ? nomDuSexe(x.sexe) : 'tout sexe', x.typeFil && x.typeFil !== '*' ? x.typeFil : 'tout type', x.jauge != null ? x.jauge + ' AWG' : 'toute gauge'].filter(Boolean).join(' · ');
function carteContact(o) { const N = app.norme, st = o.st || null, ref = st && st.reference ? st.reference : '', fam = o.fam || '', nomF = fam ? nomDeFamille(N, fam) || fam : '';
  const j = o.type ? jaugeDuType(o.type) : null; let T = null, ligne = null, partie = null, outil = null;
  try { T = fam && o.taille ? tailleDe(N, fam, o.taille) : null; } catch (_) { T = null; }
  // la ligne de la table : celle que la table donne à ce câble ; un contact choisi à la main, la ligne de sa référence s'il en a une
  try { const xs = fam && o.taille ? contactsDeTaille(N, fam, o.taille) : [], memeSexe = c => !o.sexe || !c.sexe || c.sexe === o.sexe;
    ligne = st && st.main ? xs.find(c => c.reference === ref && memeSexe(c)) || null : ligneDuContact(fam, o.taille, o.sexe, o.type);
    if (ligne && ref && ligne.reference !== ref) ligne = xs.find(c => c.reference === ref && memeSexe(c)) || ligne; } catch (_) { ligne = null; }
  try { partie = ref && typeof partieDuContact === 'function' ? partieDuContact(N, ref) : null; } catch (_) { partie = null; }
  try { outil = ref && typeof outillageDuContact === 'function' ? outillageDuContact(N, ref) : null; } catch (_) { outil = null; }
  const sexe = o.sexe || (ligne && ligne.sexe) || '', fut = typeof futDeContact === 'function' ? futDeContact(ref) : null, see = !!ligne && (ligne.source === 'SEE' || /^SEE\b/.test(String(ligne.note || '')));
  // ce qu'il est : la note de sa ligne quand elle commence par lui (« EN3155-019F2020 : douille taille 20, fût 20 (24 à 20 AWG)… »), sinon en mots
  const note = ligne ? sansLiens(ligne.note) : '', propre = note && ref && note.indexOf(ref) === 0 ? note.slice(ref.length).replace(/^\s*[:—–-]\s*/, '') : '';
  const quoi = propre || [MOTS_SEXE_CT[sexe] || 'contact', o.taille ? 'taille ' + o.taille : '', fut ? 'fût ' + fut.fut : ''].filter(Boolean).join(', ');
  const c = confianceDe(ligne, see ? 'La base SEE gardée sur ce PC' : 'Vos tables'), admis = ligne ? (o.ko ? false : true) : null;
  const ligneDl = (k, v, d) => v ? `<dt>${esc(k)}</dt><dd>${v}${d ? `<small>${d}</small>` : ''}</dd>` : '';
  const dl = [
    ligneDl('Ce qu’il est', insecable(esc(majuscule(quoi))), !propre && note ? insecable(esc(note.length > 140 ? note.slice(0, 138).replace(/\s+\S*$/, '') + '…' : note)) : ''),
    ligneDl('Sa norme', partie ? `<b class="id">${esc(partie.partie)}</b> — ${esc(partie.titre || '')}` : ref ? '<span class="fi-muet">aucune partie de l’EN 3155 connue ne porte cette référence</span>' : '',
      esc(`La norme du contact${nomF ? ', pas celle du connecteur (' + nomF + ')' : ''} : chaque pièce a la sienne.`) + (partie && partie.emploi ? ' ' + esc('Elle sert à : ' + partie.emploi + '.') : '')),
    ligneDl('Sa table', st && st.main ? 'choisi ici, à la main' : ligne ? esc(see ? 'la base SEE gardée sur ce PC' : !ligne.confiance ? 'vos tables (la table des contacts que vous avez envoyée)' : 'la table des contacts de VOLTA') : '<b class="fi-ko-t">aucune ligne</b>',
      st && st.main ? esc('Écrit sur la liaison (la colonne Contact du récapitulatif)' + (ligne ? ' ; la table a sa ligne : ' + ligneDeLaTable(ligne) : ' ; la table n’a pas cette référence pour cette taille')) : ligne ? esc('Sa ligne : ' + ligneDeLaTable(ligne) + ' → ' + ligne.reference + (ligne.accessoire ? ' + ' + ligne.accessoire : '')) : esc('La table des contacts n’a pas de ligne pour ' + [nomF, o.taille ? 'la taille ' + o.taille : '', sexe ? nomDuSexe(sexe) : '', o.type || ''].filter(Boolean).join(', ') + '.')),
    ligneDl('Sa source', c ? `<i class="fi-conf ${c.niveau}" aria-hidden="true"></i>${insecable(esc(c.bulle.split('\n')[0]))}` : '', c && c.bulle.split('\n')[1] ? insecable(esc(c.bulle.split('\n').slice(1).join(' — '))) : ''),
    ligneDl('Ce câble', o.type ? `${ident(o.type)}${j != null ? ' · ' + esc(j + ' AWG') : ''}${admis === false ? ' <b class="fi-ko-t">✕ refusé</b>' : admis ? ' <b class="ct-carte-ok">✓ admis</b>' : ''}` : '',
      T && T.jaugeMin != null ? esc(`La taille ${o.taille} admet de ${T.jaugeMin} à ${T.jaugeMax} AWG (table des tailles)${o.ko && j != null ? ' : ' + j + ' AWG est hors de la plage' : ''}.`) : ''),
    ligneDl('Sa place', o.lettre ? esc(`contact ${o.lettre}${o.variante ? ' de l’arrangement ' + o.variante : ''}${o.cote ? ', côté ' + o.cote : ''}`) : '', o.lettre ? esc('La taille de chaque cavité vient de la table des faces.') : ''),
    ligneDl('Outillage', outil ? esc([outil.pince ? 'pince ' + outil.pince : '', outil.positionneur ? 'positionneur ' + outil.positionneur : '', outil.insertion ? 'insertion ' + outil.insertion : '', outil.extraction && outil.extraction !== outil.insertion ? 'extraction ' + outil.extraction : '', outil.denudage != null ? 'dénudage ' + nombre(outil.denudage) + ' mm' : ''].filter(Boolean).join(' · ')) : '', '')].join('');
  const gestes = [ref ? `<button type="button" class="fi-lien" data-normes-table="contacts" data-filtre="${escA(ref)}" data-bulle="${escA('Ouvrir la table des contacts, filtrée sur ' + ref)}">${ico('livre')}Sa ligne dans les normes</button>` : '',
    o.trace ? `<button type="button" class="fi-lien" data-trace="1" data-bulle="La chaîne du connecteur entier : référence, norme, arrangement, et chaque câble">${ico('fleche')}Toute la chaîne du connecteur</button>` : ''].filter(Boolean).join('');
  return `<div class="fi-choix ct-carte${o.ko ? ' ko' : ''}" data-volet="${escA(o.volet || '')}" role="group" aria-label="${escA('Le contact ' + (ref || ''))}">`
    + `<div class="ct-carte-tete"><span class="ct-carte-k">Le contact</span>${ref ? ident(ref + (st && st.accessoire ? ' + ' + st.accessoire : ''), true) : '<b class="fi-ko-t">aucun</b>'}${st && st.main ? '<em class="ct-carte-main">choisi ici</em>' : ''}</div>`
    + `<dl class="ct-carte-l">${dl}</dl>${gestes ? `<div class="ct-carte-gestes">${gestes}</div>` : ''}${o.choix ? `<div class="ct-carte-autres">${o.choix}</div>` : ''}</div>`; }

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
const boutonContact = (ct, cls) => `<button type="button" class="fi-sertir fi-ct-puce${cls ? ' ' + cls : ''}${ct.st.main ? ' main' : ''}${ct.ko ? ' ko' : ''}" data-sertir="${escA(ct.ks)}" data-bulle="${escA('Contact côté ' + ct.rep + (ct.borne ? ', borne ' + ct.borne : '') + (ct.st.main ? ' — choisi ici' : ' — la table de la norme') + (ct.ko ? ' ; la gauge du câble est refusée' : '') + ' : cliquer pour en choisir un autre')}">${esc(motSertir(ct.st))}${ct.ko ? '<i>✗</i>' : ''}</button>`;

/* ---- LES CONTACTS : une broche par câble -------------------------------------------------------------------------- */
/* LES CONTACTS d'un connecteur (ou d'un module) — le lecteur : « bien, mais pas hyper sexy » ; « H1 J2 K3, c'est le
   bordel » : une ligne par câble posé, sur une grille fixe. À gauche, la BROCHE : un rond qui porte la borne (ou, pour un
   module, la lettre du contact, et la borne en petit à côté) ; puis le contact de la table de la norme, en clair (un clic
   en choisit un autre ; le même qu'au-dessus s'écrit plus pâle, jamais « ″ ») ; la gauge du câble en pastille, acceptée
   (verte, ✓) ou refusée (rouge, ✕) ; le câble, à la couleur de sa route. Le câble s'allume au survol de la ligne et
   s'ouvre d'un clic. xs : [{ ct (le HTML de la broche), f, sertir, rep, borne, plan, ko, groupe, coupable }]
   v72 (l'audit : « des pastilles lourdes, une colonne de “—”, la borne fautive nulle part ») : la borne à l'encre, sans
   rond, tout aligné à gauche, une ligne de 34 px ; le contact porte d'où il vient (`repereConfiance`) ; quand aucun
   arrangement ne loge le connecteur, la colonne des contacts s'efface (`o.sans`) et la ligne de la borne fautive se
   marque (`coupable` : « trop gros », « trop fin »). */
function tableContacts(xs, o) { o = o || {}; let prec = '';
  const rows = xs.map(x => { if (x.groupe) { prec = ''; return `<li class="ct-groupe">${x.groupe}</li>`; }
    const f = x.f, k = f && f.l ? cleFil(f.l) : '', st = x.sertir, mot = motSertir(st), meme = !!mot && mot === prec; prec = mot;
    const ks = x.rep && x.borne != null && x.plan ? cleSertir(x.rep, x.borne) : '', j = f && f.type ? jaugeDuType(f.type) : null;
    // la ligne de la table Contacts : d'où vient le contact (vérifié, vos tables, à confirmer) ; et la base SEE quand elle a mis le sien à la place de celui de VOLTA
    const P = x.plan, fam = P && P.Q ? P.Q.famille || (P.Q.modules[0] ? P.Q.modules[0].module.famille : '') : '', ligne = st && !st.main && P && P.Q ? ligneDuContact(fam, P.taille, P.sexe, f && f.type) : null;
    const dSee = ligne && typeof differenceSEEMots === 'function' && ligne.reference === (st.reference || '') ? differenceSEEMots('contacts', ligne) : '';
    // v74 : la gauge et le contact OUVRENT le contact (`carteContact`) — sa norme, sa table, sa source ; et, quand il se change
    // (un connecteur : `sertir:…`), les autres contacts de la taille dessous ; sinon (une barrette, une prise) la carte seule (`ct:…`)
    // (v84) la borne dans la clé : les deux bouts d'un pont (même câble, deux bornes du même connecteur) s'ouvrent chacun seul
    const cleCt = !ks && P && P.Q && st && f && f.l ? x.ctCle || (x.rep || 'ct') + '|' + cleFil(f.l) + (x.borne ? '|' + x.borne : '') : '', ouvre = ks ? `data-sertir="${escA(ks)}"` : cleCt ? `data-ct="${escA(cleCt)}"` : '';
    const tit = (mot ? 'Contact ' + mot + (st.main ? ' (choisi ici)' : ligne && ligne.source === 'SEE' ? ' (la base SEE)' : ' (la table de la norme)') : 'La table de la norme ne le dit pas') + (dSee ? ' — ' + dSee : '') + (ks ? ' — cliquer pour l’ouvrir : sa norme, sa table, et les autres contacts' : cleCt ? ' — cliquer pour l’ouvrir : sa norme, sa table, sa source' : '');
    const marque = dSee ? '<i class="ct-see" aria-hidden="true">SEE</i>' : '', conf = ligne && !meme && ligne.reference === (st.reference || '') ? repereConfiance(ligne, 'Vos tables SEE') : '';
    const sertir = ouvre ? `<button type="button" class="fi-sertir ct-ref${st && st.main ? ' main' : ''}${meme ? ' meme' : ''}" ${ouvre} aria-label="${escA(tit)}">${mot ? esc(mot) : '<i>choisir</i>'}${marque}</button>`
      : `<span class="fi-sertir ct-ref${meme ? ' meme' : ''}">${mot ? esc(mot) : '<i>—</i>'}${marque}</span>`;
    const force = contactForce(P, f, st), ok = x.ko || x.coupable || force ? false : x.plan && st ? true : null;
    const jg = `${j != null ? `${j}<small>AWG</small>` : '—'}${ok === false ? ico('fermer') : ok ? ico('coche') : ''}${x.coupable ? `<span class="ct-pourquoi">${esc(x.coupable)}</span>` : ''}`;
    const jauge = ouvre ? `<button type="button" class="fi-jg ct-jg${ok === false ? ' ko' : ok ? ' ok' : ''}" ${ouvre} aria-label="${escA((j != null ? j + ' AWG' : 'Gauge') + (ok === false ? ', refusée' : ok ? ', admise' : '') + ' — ouvrir le contact : sa norme, sa table, sa source')}" data-bulle="${escA((j != null ? j + ' AWG' : 'Gauge inconnue') + (ok === false ? ' : le contact ne l’admet pas' : ok ? ' : le contact l’admet' : '') + ' — un clic ouvre le contact : sa norme, sa table, sa source')}">${jg}</button>`
      : `<span class="fi-jg ct-jg${ok === false ? ' ko' : ok ? ' ok' : ''}">${jg}</span>`;
    const ouvert = (ks && FI.liste === 'sertir:' + ks) || (cleCt && FI.liste === 'ct:' + cleCt), famP = P && P.Q ? fam : '';
    const bulle = [nomDuFil(f || {}), f && f.type ? f.type : '', j != null ? j + ' AWG' + (x.coupable ? ' : ' + x.coupable : ok === false ? ' refusée par le contact' : ok ? ' acceptée' : '') : ''].filter(Boolean).join(' · ') + (x.ko && x.ko !== 'gauge refusée par le contact' ? '\n' + x.ko : '') + (force ? '\nLe contact choisi ici n’admet pas ce câble' : '') + (o.sans ? '' : '\n' + tit);
    return `<li class="fi-fil ct-ligne${x.ko || x.coupable || force ? ' ko' : ''}${x.coupable ? ' coupable' : ''}${f && f.l && f.l.origine === null ? ' neuf' : ''}"${x.lettreCt ? ` data-lettre="${escA(x.lettreCt)}"` : ''}${k ? ` data-i="${k}" tabindex="0" role="button"` : ''} data-bulle="${escA(bulle)}"><span class="fi-ct ct-pin">${x.ct}</span>${o.sans ? '' : `<span class="ct-sertir">${sertir}${conf}</span>`}${jauge}<span class="ct-cab">${f ? puceFil(f) : ''}<span class="fi-cab-n">${esc(f ? nomDuFil(f) : '')}</span></span></li>`
      + (ouvert ? `<li class="fi-choix-ligne">${carteContact({ st, fam: famP, taille: P.taille, sexe: P.sexe, type: f && f.type, lettre: x.lettre || '', variante: x.variante || '', ko: ok === false, volet: ks ? 'sertir:' + ks : 'ct:' + cleCt, choix: ks ? choixSertir(ks, x.plan, f, st, true) : '', trace: !!o.trace })}</li>` : ''); }).join('');
  return `<ul class="ct-liste fi-contacts${o.sans ? ' ct-sans' : ''}${o.premiere === 'Contact' ? ' ct-bornes' : ''}"><li class="ct-legende"><span>${esc(o.premiere || 'Borne')}</span>${o.sans ? '' : `<span>Contact à sertir${aide('contact')}</span>`}<span>Gauge${aide('gauge')}</span><span>Câble</span></li>${rows}</ul>`; }
/* Le sexe des contacts, en deux puces qui ne bougent jamais (le lecteur : « fiche mâle, fiche femelle : le bouton change
   d'endroit, et le retour en arrière, ça sert à rien ») — celle qui est retenue est pressée. Une prise : la fiche (ce
   qui arrive) femelle ou mâle, l'embase l'inverse. */
const pucesSexe = (cle, sexe, mots) => `<span class="fi-seg-mini" role="group" aria-label="Sexe des contacts">${(mots || [['F', 'Femelles'], ['M', 'Mâles']]).map(([v, t, tt]) => `<button type="button" class="fi-chip" data-sexe="${escA(cle)}" data-v="${v}" aria-pressed="${sexe === v}"${tt ? ` data-bulle="${escA(tt)}"` : ''}>${esc(t)}</button>`).join('')}</span>`;
const sexeDeLaFiche = (cle, sexe) => pucesSexe(cle, sexe === 'M' ? 'M' : 'F', [['F', 'Partie mobile femelle', 'La partie mobile (ce qui arrive) en douilles, la partie fixe en broches'], ['M', 'Partie mobile mâle', 'La partie mobile (ce qui arrive) en broches, la partie fixe en douilles']]);

/* ---- LES CÂBLES : un TABLEAU dense — le numéro, le type, la gauge, la longueur s'y écrivent ; l'intensité ET la chute -- */
/* Le lecteur (version 62 : « on doit pouvoir modifier le câble, son type et sa gauge ; intensité et chute, c'est le plus
   important : pas trop gros, propre et classe ») ; l'audit v72 : « un mur — 23 cartes de 134 px, sept hauteurs de carte
   pour 300XC1, les mêmes cinq mots répétés 23 fois ; il compare des câbles entre eux : en cartes, il ne peut pas balayer
   une colonne ». UN TABLEAU (le chemin A de l'audit), une ligne de 34 px par câble : sa route, son NUMÉRO, son TYPE (la
   famille : DR, MLB…) et sa GAUGE — des champs qui ont l'air de valeurs, leur fond paraît au survol —, l'intensité en
   barre fine contre ce qu'il admet (« 2 / 6,9 A », au pire du permanent et de la pointe), la chute en ligne, la LONGUEUR
   (en italique tant que le retest ne la porte pas : elle est supposée), « › » qui ouvre sa fiche. Les mots une seule
   fois, dans l'en-tête collé sous la barre, avec leurs « ? » ; ce qui est supposé, dit une fois, en tête.
   Une valeur garde la couleur de SA MESURE — ambre au-delà de 80 % de l'admis, rouge au-delà de 100 % — ; la ligne d'un
   câble à voir porte un trait de son état dans la marge et, dessous, POURQUOI en une ligne (« trop fin pour la
   transition », « chute en pointe 2,4 V ») ; le détail dans la bulle. Les câbles à voir en tête. Au-delà de douze câbles
   (le gros connecteur d'un vrai retest), LA BANDE DES MARGES se pose au-dessus (le chemin B) : chaque câble un trait à sa
   part de l'admis, l'intensité puis la chute, le plus chargé nommé à droite. Le contact au bout se change dans la fiche
   du câble (un clic sur « › »). rows : [{ l, k, num, neuf, puce, type, charge: { r, mot, i, admis, supp }, chute: { mot,
   u, max, regle, supp }, etat, pourquoi, bulle }] */
/* (v85, le lecteur : « ce qui vient de mon fichier, plus aucune saisie dans VOLTA ») : le type, la gauge et la longueur d'un
   câble ne s'écrivent plus dans la fiche — ni dans ses tableaux, ni dans sa carte : ils se changent dans le fichier ; seules
   les propositions justifiées de VOLTA (« Passer en DR20 ») les changent, d'un clic. */
/* LES FAMILLES de la base des câbles et les gauges de chacune (DR : 26 … 6), gardées tant que la norme ne change pas. */
const FAMILLES_CABLES = { N: null, m: null };
function famillesCables() { if (FAMILLES_CABLES.N === app.norme && FAMILLES_CABLES.m) return FAMILLES_CABLES.m; const m = new Map();
  cablesDe(app.norme).forEach(c => { const p = partiesDuType(c.cable), f = String(c.famille || p.famille || '').toUpperCase(); if (!f) return;
    const j = c.jauge != null && c.jauge !== '' && isFinite(+c.jauge) ? +c.jauge : p.jauge; if (!m.has(f)) m.set(f, new Set()); if (j != null) m.get(f).add(j); });
  FAMILLES_CABLES.N = app.norme; FAMILLES_CABLES.m = m; return m; }
// un type de câble en deux : sa famille (les lettres) et sa gauge (les chiffres de la fin) — « DR20 » : DR, 20 ; « WC » : WC, rien
function partiesDuType(t) { const s = String(t == null ? '' : t).trim().toUpperCase(), m = /^([A-Z]+)\s*-?\s*(\d{1,2})?$/.exec(s);
  return m ? { famille: m[1], jauge: m[2] ? +m[2] : null } : { famille: s, jauge: null }; }
// le type que font une famille et une gauge (« DR » + 22 → « DR22 »)
const typeDe = (famille, jauge) => String(famille || '').trim().toUpperCase() + (jauge != null && jauge !== '' ? String(jauge) : '');
// la couleur d'une mesure contre son admis : ambre au-delà de 80 %, rouge au-delà de 100 %
const classeMesure = r => r == null || !isFinite(r) ? '' : r > 1 + 1e-9 ? 'ko' : r > 0.8 ? 'att' : 'ok';
const nombreA = i => nombre(arrondi(i, i < 10 ? 2 : 1));
// l'intensité : une barre fine contre l'admis (au pire du permanent et de la pointe), la valeur sur l'admis
const celluleI = ch => { const m = classeMesure(ch.r), w = ch.r != null && isFinite(ch.r) ? Math.max(0, Math.min(1, ch.r)) * 100 : 0;
  return `<span class="cb-i ${m}${ch.supp ? ' supp' : ''}"><span class="fi-barre ${m}" aria-hidden="true"><i style="width:${w.toFixed(1)}%"></i></span>`
    + `<span class="cb-i-v">${ch.i != null ? `<b>${esc(nombreA(ch.i))}</b>${ch.admis != null ? ' / ' + esc(nombreA(ch.admis)) + ' A' : ' A'}` : esc(ch.mot || '—')}</span></span>`; };
// la chute en ligne, de la couleur de sa mesure contre l'admis (en italique sur des longueurs supposées)
// (l'audit v72, P2-3 A : la valeur garde la couleur de sa mesure — rouge au-delà de l'admis — et l'italique dit qu'elle
// vient de longueurs supposées ; le PROBLÈME, lui, reste « à voir » tant que les longueurs ne sont pas mesurées)
const celluleU = cu => `<span class="fi-u ${cu.max && cu.u != null ? classeMesure(cu.u / cu.max) : ''}${cu.supp ? ' supp' : ''}">${esc(cu.mot)}</span>`;
/* LA BANDE DES MARGES (au-delà de douze câbles) : deux pistes, l'intensité et la chute ; chaque câble un trait à sa part
   de l'admis (sur 0 à 120 % : au-delà, il bute au bord), les zones à 80 % et 100 % ; le plus chargé nommé à droite. */
function bandeDesCables(rows) {
  const piste = (k, val) => { const xs = rows.map(r => ({ r, v: val(r) })).filter(x => x.v != null && isFinite(x.v)); if (!xs.length) return '';
    const tri = xs.slice().sort((a, b) => b.v - a.v), max = tri[0], pc = v => Math.round(v * 100) + ' %';
    return `<div class="cb-bande-l" data-bulle="${escA(k + ', les plus chargés : ' + tri.slice(0, 5).map(x => nomCourtDuCable(x.r) + ' ' + pc(x.v)).join(' · '))}"><span class="cb-bande-k">${esc(k)}</span>`
      + `<span class="cb-piste" aria-hidden="true">${xs.map(x => `<i class="${classeMesure(x.v)}" style="left:${(Math.min(1.2, x.v) / 1.2 * 100).toFixed(1)}%"></i>`).join('')}</span>`
      + `<span class="cb-bande-max ${classeMesure(max.v)}"><b>${esc(pc(max.v))}</b><small class="id">${esc(nomCourtDuCable(max.r))}</small></span></div>`; };
  const h = piste('Courant', r => r.charge.r) + piste('Chute', r => r.chute.u != null && r.chute.max ? r.chute.u / r.chute.max : null);
  return h ? `<div class="cb-bande">${h}</div>` : ''; }
function listeCables(rows, o) { o = o || {}; if (ficheEnGrand()) return tableCables(rows, o); const rang = r => r.etat === 'ko' ? 0 : r.etat === 'att' ? 1 : 2;
  const maxs = [...new Set(rows.map(r => r.chute.max).filter(m => m != null))], seuil = maxs.length === 1 ? maxs[0] : null, regles = [...new Set(rows.map(r => r.chute.regle).filter(Boolean))];
  const qI = aide('intensite'), qU = aide('chute', seuil != null ? { admis: seuil, regle: regles.length === 1 ? regles[0] : '' } : null);
  const li = rows.slice().sort((a, b) => rang(a) - rang(b) || triNaturel(a.num, b.num)).map((r, n) => {
    // (v85) le type et la longueur viennent du fichier : ils se lisent, ils se changent dans le fichier
    const H = app.simu || HYPOTHESES, L = r.l && r.l.longueur > 0 ? r.l.longueur : null;
    /* LA LIGNE D'UN CÂBLE, sur deux étages (v77, le lecteur : « la chute en ligne et la longueur, trop serré, pas assez
       intuitif ») : en haut, le câble — son type d'abord (son numéro s'il en a un) — et son intensité ; dessous, en clair,
       sa chute en ligne contre l'admis et sa longueur (« supposée » quand l'installation ne la porte pas). */
    const num = '', typeLu = `<span class="cb-type id">${esc(r.type || '—')}</span>`;
    const nomC = nomCourtDuCable(r), ouvrir = r.k ? `<button type="button" class="cb-ouvrir" data-ouvrir-cable="${escA(r.k)}" aria-label="${escA('Ouvrir la fiche du câble ' + nomC)}" data-bulle="${escA('Ouvrir la fiche de ' + nomC)}">${ico('droite')}</button>` : '<span></span>';
    const lg = r.l && r.l.origine !== null ? `<b class="cb-lg">${esc(nombre(L != null ? arrondi(L, 2) : H.longueur))}</b>` : '', supp = r.l && !(r.l.longueur > 0);
    return `<li class="fi-ia fi-cab cb-carte${r.etat ? ' ' + r.etat : ''}"${r.k ? ` data-i="${r.k}"` : ''}${r.bulle ? ` data-bulle="${escA(r.bulle)}"` : ''} style="--n:${n}">`
      // sans numéro, trois lignes « DR12 » se ressemblent : l'autre bout, en petit, les distingue
      + `<span class="cb-puce">${r.puce || ''}</span><span class="cb-id">${num}${typeLu}${!num && r.bout && r.bout.rep ? `<small class="cb-vers id">vers ${esc(r.bout.rep + (r.bout.borne ? ':' + r.bout.borne : ''))}</small>` : ''}</span>${celluleI(r.charge)}${ouvrir}`
      + `<span class="cb-sous"><span class="cb-sous-c"><span class="cb-sous-k">Chute${n === 0 ? qU : ''}</span>${celluleU(r.chute)}${r.chute.max != null ? `<span class="cb-sous-a">sur ${esc(volts(r.chute.max))}</span>` : ''}</span>`
      + (lg ? `<span class="cb-sous-c"><span class="cb-sous-k">Longueur</span>${lg}<span class="cb-sous-a">m${supp ? ' · supposée' : ''}</span></span>` : '') + '</span>'
      + (r.pourquoi ? `<span class="cb-pourquoi">${insecable(esc(r.pourquoi))}</span>` : '') + '</li>'; }).join('');
  const entete = `<li class="cb-entete"><span></span><span>Câble</span><span>Intensité${qI}</span><span></span></li>`;
  return (rows.length > 12 ? bandeDesCables(rows) : '') + `<ul class="fi-cables cb-liste${o.cls ? ' ' + o.cls : ''}">${entete}${li}</ul>`; }
/* La ligne d'un câble d'un repère : son intensité contre ce qu'il admet (au pire du permanent et de la pointe), sa chute
   en ligne depuis le disjoncteur en amont (sinon sur le câble seul), pourquoi il est à voir, et la bulle qui dit d'où
   viennent les chiffres. `f.coupable` : ce que le plan d'un connecteur en dit (aucun arrangement ne le loge). */
// (v86, l'audit B1) ce que demande une branche de commande au courant inconnu, en mots : la consommation de sa bobine à écrire ;
// une entrée de calculateur seule ne demande rien (quelques milliampères)
const motDeCommande = x => { const s = (x && x.aval && x.aval.sans) || [], bob = s.filter(y => y.nature === 'bobine').map(y => y.repere), ent = s.filter(y => y.nature === 'entree').map(y => y.repere);
  return bob.length ? 'écrivez la consommation de la bobine de ' + listeEt(bob) : ent.length ? 'une entrée de ' + listeEt(ent) + ', quelques milliampères' : ''; };
function ligneDeFil(f) { const l = f.l, x = intensiteDuFil(l), c = chuteDuFil(l, x), cmd = x.I == null;
  const rP = x.continu && !cmd ? x.I / x.continu : null, rT = x.pointe && x.pointe.admis ? x.pointe.i / x.pointe.admis : null, r = Math.max(rP || 0, rT || 0), trop = x.trop.length > 0, pointeI = rT != null && rT > (rP || 0);
  const u = c.total ? c.total.dU : c.dU, supp = c.total ? !c.total.reel : c.hyp, motSupp = supp ? ', longueurs supposées' : '';
  // (v86) en mots, sans « > » : ce qu'il porte, pour ce qu'il admet
  const pourquoi = [cmd ? 'courant de commande inconnu' : '', trop ? `trop fin (${x.trop[0].nom}) : ${amperes(x.trop[0].i)} pour ${amperes(x.admise(x.trop[0].t))} admis` : '',
    c.trop ? `chute en ligne ${volts(c.total.dU)} pour ${volts(c.max)} admis${motSupp}` : c.pointe ? `chute en pointe ${volts(c.pointe.dU)} pour ${volts(c.pointe.admis)} admis${motSupp}` : '', f.coupable || ''].filter(Boolean).join(' · ');
  const bulle = [`${l.origine === null ? 'câble à créer' + (l.type ? ' · ' + l.type : '') : cableDit({ ...l, vers: f.vers, borneVers: f.borneVers })} · ${x.al ? 'sous ' + x.al.nom + (x.al.calibre ? ' (' + amperes(x.al.calibre) + ')' : '') : amperes(x.H.courant) + ' supposés (aucun disjoncteur en amont)'}`,
    cmd ? `courant de commande inconnu : ${motDeCommande(x)}` : x.fn ? `permanent ${amperes(x.I)} sur ${amperes(x.continu)} admis en continu${motFacteur(x.fac)}` : (l.type ? 'hors de la norme des câbles : ce qu’il admet ne se lit pas' : 'sans type : ce qu’il admet ne se lit pas'),
    x.pointe && x.pointe.admis ? `pointe ${amperes(x.pointe.i)} pendant ${secondes(x.pointe.t)} sur ${amperes(x.pointe.admis)} admis` : '',
    c.total ? `chute en ligne depuis ${x.al.nom} vers ${c.total.bout[0]}${c.total.bout[1] ? ':' + c.total.bout[1] : ''} : ${volts(c.total.dU)}${c.max != null ? ' (' + volts(c.max) + ' admis)' : ''}${motSupp}` : c.dU != null ? `chute sur ce câble seul : ${volts(c.dU)}${c.max != null ? ' sur les ' + volts(c.max) + ' admis en ligne' : ''} (${nombre(arrondi(c.L, 2))} m${c.hyp ? ' supposés' : ''})` : '',
    c.pointe ? `en pointe : ${volts(c.pointe.dU)} à ${amperes(c.pointe.i)} > ${volts(c.pointe.admis)} admis` : ''].filter(Boolean).join('\n');
  return { l, k: cleFil(l), num: nomDuFil({ ...f, cable: l.cable }), neuf: l.origine === null, puce: puceFil(f), jauge: x.jauge, type: l.type, bout: { rep: f.vers, borne: f.borneVers },
    // les chiffres de la barre : au pire, comme elle — la pointe quand c'est elle qui serre le plus
    charge: { r: x.fn && !cmd ? r : null, mot: cmd ? 'inconnu' : pointeI ? `${nombreA(x.pointe.i)} / ${nombreA(x.pointe.admis)} A` : x.continu ? `${nombreA(x.I)} / ${nombreA(x.continu)} A` : `${nombreA(x.I)} A`,
      i: pointeI ? x.pointe.i : x.I, admis: pointeI ? x.pointe.admis : x.continu || null, supp: !x.al },
    // (v85, le lecteur : « vers 104LP1, DR22, chute en ligne 0,79 V, pas de rond avec le pourcentage : pas homogène ») : sans
    // chemin de disjoncteur, la chute du câble seul se mesure aussi contre la chute admise des Hypothèses (2 V sous 28 V) — sa
    // part de ce que la ligne entière peut perdre ; l'anneau la montre comme pour les autres
    chute: { mot: volts(u), u, max: c.max, regle: c.regle, supp, seul: !c.total }, etat: trop || c.etat === 'ko' || f.coupable ? 'ko' : c.etat === 'att' || (cmd && /^écrivez/.test(motDeCommande(x))) ? 'att' : '', pourquoi, bulle }; }
/* LA SECTION DES CÂBLES : le tableau, son résumé (combien, combien à régler — ou, quand tous portent leur courant, le plus chargé),
   sa pastille. `o.note` : ce qui est supposé, dit une fois, en tête. */
function sectionFils(rows, probs, o) { o = o || {}; if (!rows.length) return { cle: 'fils', titre: o.titre, vide: 'aucun câble' };
  const ko = rows.filter(r => r.etat === 'ko').length, att = rows.filter(r => r.etat === 'att').length, rs = rows.filter(r => r.charge.r != null && isFinite(r.charge.r)), pire = rs.length ? rs.reduce((a, b) => (b.charge.r > a.charge.r ? b : a)) : null;
  // (v74, lot F — le lecteur : « “Tous tiennent”, c'est obscur ») : aucun problème, et le plus chargé nommé, avec ce qu'il porte de ce qu'il admet
  const resume = [pluriel(rows.length, 'câble'), ko ? `<span class="fi-ko-t">${ko} à régler</span>` : att ? `<span class="fi-att-t">${att} à voir</span>` : 'aucun problème' + (pire ? ` · le plus chargé, ${esc(nomCourtDuCable(pire))}, porte ${Math.round(pire.charge.r * 100)} % de ce qu’il admet` : '')].join(' · ');
  // (v86) pour le statut de l'onglet (08-niveaux, `statutCables`) : le plus chargé (son nom, ses ampères, ce qu'il admet), ce
  // qui cloche câble par câble, les câbles sans type (leur courant se lit, la part de l'admis non)
  const raisons = rows.filter(r => ko ? r.etat === 'ko' : r.etat === 'att').map(r => nomCourtDuCable(r) + (r.pourquoi ? ' — ' + r.pourquoi : ''));
  return { cle: 'fils', titre: o.titre, compte: rows.length, nko: ko, natt: att, charge: pire ? pire.charge.r : null, pire: pire ? { nom: nomCourtDuCable(pire), i: pire.charge.i, admis: pire.charge.admis } : null, raisons, nsans: rows.filter(r => !r.type).length, resume: insecable(resume), badge: badgeProblemes(probs, 'fils') || (ko ? { t: String(ko), etat: 'ko' } : att ? { t: String(att), etat: 'att' } : { t: ico('coche'), etat: 'ok' }),
    contenu: (o.note ? `<p class="fi-note cb-note">${o.note}</p>` : '') + listeCables(rows, o) }; }
/* Les câbles d'un repère (équipement, barrette, prise) : une ligne chacun ; ce qui est supposé (le courant quand aucun
   disjoncteur n'est en amont, la longueur que le retest ne porte pas), dit une fois. `coupables` : câble → ce que le plan
   d'un connecteur en dit. */
function sectionFilsDuRepere(fils, probs, coupables) { const C = coupables || new Map(), rows = fils.map(f => ligneDeFil({ ...f, coupable: C.get(f.l) || '' })), H = app.simu || HYPOTHESES;
  return sectionFils(rows, probs, { note: noteSupposes(fils.filter(f => !intensiteDuFil(f.l).al).length, fils.filter(f => !(f.l.longueur > 0)).length, fils.length, H) }); }
/* CE QUI EST SUPPOSÉ, dit une fois et en clair (v74, lot F — le lecteur : « l'italique, l'hypothèse 5 m : compliqué ») : la
   longueur que l'installation ne porte pas, le courant sans disjoncteur en amont — combien de câbles, la valeur, et quoi
   faire ; plus d'italique dans le tableau (une case vide montre la valeur supposée en gris, sans plus). */
// (v84) plus court : le fait, pour combien de câbles, et pourquoi — le geste (la colonne Longueur) est sous les yeux
function noteSupposes(nDj, nL, n, H) { const combien = k => n > 1 ? ' pour ' + (k === n ? (n > 2 ? 'les ' + n + ' câbles' : 'les deux câbles') : k + ' câble' + (k > 1 ? 's' : '') + ' sur ' + n) : '';
  // (v86) un deux-points par phrase : la raison entre parenthèses
  const xs = [nL ? `<b>${esc('Longueur supposée : ' + nombre(H.longueur) + ' m')}</b>${esc(combien(nL) + ' (votre fichier ne la donne pas)')}` : '',
    nDj ? `<b>${esc('Courant supposé : ' + nombre(H.courant) + ' A')}</b>${esc(combien(nDj) + ' (aucun disjoncteur en amont)')}` : ''].filter(Boolean);
  return xs.length ? xs.join(' · ') + ` <span class="fi-note-hyp">— ${motHypothese.replace('>hypothèse<', '>hypothèses<')}</span>` : ''; }

/* « DÉJÀ FAIT » : les machines proches dans la base des contrats déjà faits. Elle se tait tant qu'aucune base n'est
   chargée (le parcours v72 : « du bruit à chaque clic » — le rappel vit dans « Vos fichiers »). */
function sectionDejaFait(nom) { const I = indexReferences();
  if (!I) return null;
  const h = dejaFaitHtml(nom), n = (h.match(/class="fi-cand /g) || []).length;
  if (!h) return { cle: 'dejafait', vide: 'aucun contrat déjà fait ne porte ce repère, ce part number ni ce code', badge: { t: '0', etat: '' } };
  return { cle: 'dejafait', resume: `${pluriel(n, 'machine')} proche${s_(n)} dans la base`, badge: { t: String(n), etat: '' }, contenu: h }; }

/* ---- LE PART NUMBER D'UN CONNECTEUR, d'un geste pour toutes ses liaisons ----------------------------------------- */
// les liaisons d'un connecteur (ses bornes), chacune avec le champ qui porte son part number de ce côté ; « * » : toutes
// celles du repère (un disjoncteur : un seul part number pour ses bornes à vis)
const liaisonsDuConnecteur = (nom, bornes) => { const tout = bornes === '*', B = new Set((tout ? [] : bornes || []).map(String)), xs = [];
  verite().forEach(l => { if (l.de === nom && (tout || B.has(String(l.borneDe)))) xs.push([l, 'pnDe']); if (l.vers === nom && (tout || B.has(String(l.borneVers)))) xs.push([l, 'pnVers']); }); return xs; };
/* LA RÉFÉRENCE d'un connecteur (le lecteur : « part number, on s'en tape : on veut juste le repère électrique et les
   références ») : en chasse fixe. (v85) Elle vient du fichier et ne s'écrit plus ici : elle se change dans le fichier. */
function referenceConnecteur(nom, cle, bornes, pn) {
  return `<span class="fi-pn">${pn ? `<span class="id">${esc(pn)}</span>` : '<span class="fi-muet">à écrire dans votre fichier</span>'}</span>`; }

/* ---- LE RACCORD : ce qui englobe un connecteur (le raccord, le band-it, le manchon, le tyrap, la cheminée, la gaine) -- */
/* Une pièce par ligne, sur deux rangs : son rôle en petit (et son « ? »), sa référence en chasse fixe et sa quantité ; à
   droite, seulement ce qui ne va pas (« manque », « aucun ne va », en rouge) ou ce qu'il faut savoir pour la poser (un
   manchon « à coller ») — une référence lue dans la table mais pas encore vérifiée sur un plan ne s'affiche plus en ambre
   (le lecteur : « tu mets à confirmer : ça veut dire que c'est pas bon ») : sa bulle le dit. La désignation du raccord
   se corrige sur place. Ce qu'on choisit (reprise de blindage, étanchéité, orientation, gaine) dans « Options » : un
   panneau de réglages, chacun en segments. Le moteur donne la liste toute faite, dans l'ordre de montage (`h.pieces` :
   rôle, libellé, référence, quantité, statut, note) ; sinon on la lit dans ses champs.
   LES OPTIONS viennent du tutoriel du lecteur (sa table de décision, onglet Raccord) : la reprise de blindage NO / GND /
   BLI / CONTACT — aucune, sur le corps du raccord, par cosse, sur un contact —, l'étanchéité, l'orientation, la gaine.
   L'emplacement (« dans une boîte ») n'en était pas : il est parti. */
const PUCES_RACCORD = [['blindage', 'Reprise de blindage', [['NO', 'aucune'], ['GND', 'sur le corps'], ['BLI', 'par cosse'], ['CONTACT', 'sur un contact']]],
  ['etanche', 'Étanchéité', [['false', 'non'], ['true', 'requise']]], ['orientation', 'Sortie', [['droit', 'droite'], ['coudé', 'coudée']]], ['gaine', 'Gaine', [['', 'aucune'], ['HFA', 'HFA'], ['NOMEX', 'Nomex']]]];
const SENS_STATUT_RACCORD = { structure: 'La désignation EN 3660 est vérifiée ; les cotes de cette taille ne sont pas encore lues', 'déduit': 'Déduit du filetage commun avec l’EN 2997 : la norme ne nomme pas cette famille', 'à confirmer': 'Lu dans la table des raccords de l’atelier ; pas encore vérifié sur un plan' };
// ce qui s'affiche d'un statut : ce qui manque (rouge), ce qu'il faut savoir pour poser (neutre) ; le reste va dans la bulle
const statutMontre = s => /aucun|manque|à venir/.test(s) ? 'ko' : /coller|précollé/.test(s) ? 'info' : '';
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
// l'état d'une pièce, en petit : rouge ce qui manque, rien sinon (ce qui reste à vérifier se lit dans la bulle)
const classeStatut = s => statutMontre(s) === 'ko' ? 'ko' : '';
/* POURQUOI UNE PIÈCE « MANQUE » (v74, lot F — le lecteur : « le raccord manque : dis pourquoi ») : jamais un « manque » muet.
   Sous la pièce, en clair, ce que la table n'a pas — pour un raccord : sa famille, sa classe, son boîtier, son type ; pour
   le reste, la phrase du moteur (09-raccords, `piecesDHabillage` : « aucun manchon droit de la table ne va à Ø 5,3 mm… ») —,
   puis où la chercher : la base SEE gardée sur ce PC la donne peut-être (ce qu'elle dit s'y monter, quand elle connaît la
   référence). */
function pourquoiManque(p, h, it) { const N = app.norme, fam = h.famille || '', nomF = fam ? nomDeFamille(N, fam) || fam : '', cl = h.classe && h.classe.raccord ? h.classe.raccord : '', type = typeof MOTS_RACCORD !== 'undefined' && MOTS_RACCORD[h.raccord] ? MOTS_RACCORD[h.raccord] : h.raccord || '';
  const dit = (p.role === 'raccord' || p.role === 'cheminee') && !h.reference
    ? (fam ? `aucune ligne de la table des raccords pour un raccord ${type} de l’${nomF}${cl ? ', classe ' + cl : ''}${h.taille ? ', boîtier ' + h.taille : ''}` : `aucune ligne de la table des raccords pour ce connecteur : sa référence${it.pn ? ' (' + it.pn + ')' : ''} n’est d’aucune famille que VOLTA connaît`)
    : p.note || 'aucune ligne de la table ne va';
  let see = ''; try { if (typeof BASE_SEE !== 'undefined' && BASE_SEE.base) { const e = it.pn && typeof equipementSEE === 'function' ? equipementSEE(it.pn) : null, mate = e && Array.isArray(e.m) ? e.m.slice(0, 3).map(x => x && x.p).filter(Boolean) : [];
      see = mate.length ? `la base SEE gardée sur ce PC dit qu’il se monte avec ${mate.join(', ')} : à vérifier` : 'la base SEE gardée sur ce PC la donne peut-être'; }
    else see = 'une base SEE gardée sur ce PC (Vos fichiers) la donnerait peut-être'; } catch (_) { see = ''; }
  return majuscule(sansLiens(dit)) + (see ? ' ; ' + see : '') + '.'; }
// le calcul du raccord d'un connecteur : `it` = { cle, fils, pn, ref, plan? } (gardé le temps d'un rendu)
const HABILLAGES = new Map();
function habillageDe(it) { const k = it.cle; if (HABILLAGES.has(k)) return HABILLAGES.get(k);
  const h = habillage(app.norme, it.fils, app.contrat.raccords.get(k), it.pn, it.ref, app.simu, it.plan ? { modules: it.plan.modules, plan: it.plan } : undefined); HABILLAGES.set(k, h); return h; }
/* Le raccord d'un connecteur (ou d'un côté d'une prise) : `it` = { cle, titre?, fils, pn, ref, plan? } ; le plan de
   contacts (et ses modules), quand il y en a un, donne au moteur le nombre de cheminées d'un EN 4165 et les obturateurs
   des cavités libres. */
/* La ligne de table d'où vient une pièce (le raccord, la cheminée, la bande, le manchon, le tyrap, la gaine, un
   obturateur) : son repère de confiance la lit (`repereConfiance`). */
function ligneDeLaPiece(p, h, it) { const R = p.reference, memeRef = x => x && R && [x.reference, x.designation, x.norme, x.obturateur].some(v => v && String(v) === String(R));
  if (p.role === 'raccord' || p.role === 'cheminee') return h.reference || null;
  if (p.role === 'obturateur') { const M = it.plan && it.plan.modules && it.plan.modules[0], t = /contact (\S+)$/.exec(p.libelle || ''); try { return M && t ? obturateurDe(app.norme, M.module.famille, t[1]) : null; } catch (_) { return null; } }
  const xs = { bande: [h.collier], manchon: [h.manchonRef], tyrap: [h.tyrap], gaine: [h.gaine, h.nomex && h.nomex.dessous, h.nomex && h.nomex.dessus] }[p.role] || [];
  return xs.find(memeRef) || xs.find(Boolean) || null; }
function raccordHtml(it) { const { cle } = it, h = habillageDe(it), c = h.choix, choisi = app.contrat.raccords.get(cle) || {};
  const desMain = choisi.designation || '', desAuto = h.designation || (h.reference ? h.reference.norme : ''), manque = (h.manquants || []).filter(m => !(h.manchon && !h.manchonRef && /^aucun manchon/.test(m)));
  const lignes = piecesHabillage(h).map(p => { const editable = p.role === 'raccord' && !h.sansRaccord && (h.reference || desMain), sc = classeStatut(p.statut || '');
    // la valeur qu'on change et celle qu'on lit ont la même allure (l'audit : « une boîte grise pour l'une, nue pour l'autre ») : le champ ne se montre qu'au survol
    const refH = editable ? saisie(`data-rac-ref="${escA(cle)}"`, desMain || p.reference || desAuto, { mono: true, ph: 'à écrire', label: 'Désignation du raccord', long: true, cls: 'nu' })
      : p.reference ? `<span class="id">${esc(p.reference)}</span>` : p.role === 'raccord' && h.sansRaccord ? '<span class="fi-muet">aucun</span>' : '';
    // d'où vient la pièce : sa ligne de table — et, quand la ligne est vérifiée mais que la pièce ne l'est pas (une désignation dont les suffixes restent à lire), la pièce
    const ligne = p.reference && !desMain && p.statut !== 'manque' ? ligneDeLaPiece(p, h, it) : null, vue = ligne && ligne.confiance === 'vérifié' && p.statut === 'à confirmer' ? { confiance: 'à confirmer', statut: 'à confirmer : ' + (p.note || 'la référence complète'), origine: ligne.origine } : ligne;
    const conf = vue ? repereConfiance(vue, ligne.atelier ? 'Votre table CHOIX' : 'Vos tables') : '';
    const bulle = [p.note ? majuscule(p.note) : '', p.role === 'raccord' || p.role === 'cheminee' ? manque.join('\n') : ''].filter(Boolean).join('\n');
    const q = AIDE_PIECE[p.role] ? aide(AIDE_PIECE[p.role], { habillage: h }) : '';
    const montre = statutMontre(p.statut || ''), pq = montre === 'ko' ? pourquoiManque(p, h, it) : '';
    return `<li class="fi-piece${sc ? ' ' + sc : ''}" data-role="${escA(p.role)}"${bulle ? ` data-bulle="${escA(bulle)}"` : ''}><span class="fi-piece-r">${esc(p.libelle || majuscule(p.role))}${q}</span>`
      + `${montre ? `<span class="fi-piece-st ${montre}">${esc(p.statut)}</span>` : '<span></span>'}${refH || p.quantite > 1 ? `<span class="fi-piece-ref">${refH}${conf}${p.quantite > 1 ? `<i class="fi-qte">× ${p.quantite}</i>` : ''}</span>` : ''}`
      + `${pq ? `<span class="fi-piece-pq"><b>Pourquoi :</b> ${insecable(esc(pq))}</span>` : ''}</li>`; }).join('');
  // les options : un réglage par ligne — son nom à gauche, ses segments à droite, celui qui est retenu en blanc
  const k = 'rac|' + cle, segments = `<div class="fi-options">${PUCES_RACCORD.map(([champ, t, opts]) => `<div class="fi-opt"><span class="fi-opt-k">${esc(t)}</span><span class="fi-opt-seg" role="group" aria-label="${escA(t)}">${opts.map(([v, m]) => `<button type="button" class="fi-opt-b" data-raccord="${escA(cle)}" data-champ="${champ}" data-v="${escA(v)}" aria-pressed="${String(c[champ] == null ? '' : c[champ]) === v}">${esc(m)}</button>`).join('')}</span></div>`).join('')}</div>`;
  const toron = h.faisceau && h.faisceau.diametre != null ? `toron Ø ${mm(h.faisceau.diametre)} mm` : '';
  const choix = [c.blindage && c.blindage !== 'NO' ? 'blindage repris' : '', c.etanche ? 'étanche' : '', c.orientation === 'coudé' ? 'coudé' : '', c.gaine ? 'gaine ' + c.gaine : ''].filter(Boolean).join(' · ');
  // (v85) `it.options` : le raccord en Manuel, dans Modifier — ses options se montrent d'office, sans bouton pour les ouvrir
  const options = h.tableau || it.options ? '' : `<button type="button" class="fi-options-b" data-changer="${escA(k)}" aria-expanded="${FI.liste === k}" data-bulle="Reprise de blindage, étanchéité, sortie, gaine">${ico('reglages')}<span>Options</span></button>`;
  return `<div class="fi-hab" data-hab="${escA(cle)}"${it.titre ? ` data-titre="${escA(it.titre)}"` : ''}><div class="fi-hab-tete">${it.titre ? `<span class="fi-hab-t">${esc(it.titre)}</span>` : ''}<span class="fi-hab-mots">${toron ? `<span data-bulle="${escA('D’où vient ce Ø : ' + (h.foisonnement && h.foisonnement.n ? 'les ' + h.foisonnement.n + ' câbles, chacun son Ø dans la base des câbles' : 'les câbles, leur Ø dans la base des câbles') + (h.foisonnement && h.foisonnement.regle ? ' ; ' + h.foisonnement.regle : ''))}">${insecable(esc(toron))}</span>` : ''}${toron && choix ? ' · ' : ''}${choix ? insecable(esc(choix)) : ''}${toron ? aide('toron', { habillage: h }) : ''}</span>${options}</div>`
    + (h.tableau ? '' : it.options ? `<div class="fi-options-place">${segments}</div>` : listeChoix(k, segments, { titre: 'Les options du raccord', cls: 'fi-options-choix' }))
    + (lignes ? `<ul class="fi-nomen">${lignes}</ul>` : `<p class="fi-note">${h.tableau ? 'Disjoncteur de tableau : ni raccord ni band-it.' : 'Rien à poser.'}</p>`) + '</div>'; }
/* LES MODULES D'UNE MÊME BARRETTE, LES PARTIES D'UNE MÊME PRISE (v82, le lecteur : « une barrette peut avoir plusieurs
   modules : il faudrait les voir tous, même s'ils sont sur d'autres folios — module 1, 2, 3, 4, et le nom du parent ;
   pareil pour les prises ») : le repère dit son parent et son rang — 668VT31 : le n° 668, la barrette VT3, le module 1 ;
   410VC2B : la prise VC2, la partie B. Rend les repères frères, dans l'ordre de leur rang (lui compris). */
const rangDuParent = nom => { const m = /^(\d+)([A-Z]{2,3}\d+)([0-9A-Z])$/.exec(String(nom || '')); return m ? { parent: m[2], rang: m[3] } : null; };
function freresDe(nom, genre) { const f = rangDuParent(nom); if (!f) return [];
  return reperesDuContrat().filter(r => r.genre === genre && (rangDuParent(r.nom) || {}).parent === f.parent).sort((a, b) => triNaturel(rangDuParent(a.nom).rang, rangDuParent(b.nom).rang)); }
function freresVue(nom, genre) { const xs = freresDe(nom, genre); if (xs.length < 2) return ''; const f = rangDuParent(nom), bar = genre === 'barrette';
  return `<section class="vu-bloc vu-freres"><h4 class="vu-titre">${bar ? 'La barrette' : 'La prise'} ${esc(f.parent)} <span>${esc(xs.length + (bar ? ' modules' : ' parties'))}</span></h4><div class="vu-fr-l">`
    + xs.map(r => { const g = rangDuParent(r.nom), ici = r.nom === nom, et = typeof etatDuNom === 'function' ? (etatDuNom(r.nom) || {}).niveau : '';
      // (v84) qu'une carte s'ouvre, son survol le dit (la bulle) ; plus de « un clic ouvre la fiche » dans le titre
      return `<button type="button" class="vu-fr${ici ? ' ici' : ''}${et === 'ko' || et === 'att' ? ' ' + et : ''}" data-frere="${escA(r.nom)}"${ici ? ' aria-current="true"' : ` data-bulle="${escA('Ouvrir ' + r.nom + (r.plans && r.plans.length ? ', ' + motFolios(r.plans) : ''))}"`}><span class="vu-fr-n">${esc(bar ? 'module ' + g.rang : 'partie ' + g.rang)}</span><b class="id">${esc(r.nom)}</b><small class="id">${esc(r.sous || '')}</small><span class="vu-fr-f">${esc(motFolios(r.plans || []))}</span></button>`; }).join('')
    + '</div></section>'; }
/* ---- UN ÉQUIPEMENT ------------------------------------------------------------------------------------------------ */
// la section qu'un point du disjoncteur démontre : ses câbles (la charge, la protection, la chute en ligne), sinon lui
// (v84) un point qui parle d'un câble (« DR24 vers 395SW1:1 : … », une chute, un contact) se démontre dans l'onglet Câbles,
// pas dans Calibre, où tout est vert
const sectionDj = t => /chute en ligne/i.test(t) || /^[A-Z]{1,4}\d{1,2} vers /.test(t) || /contact/i.test(t) || /^(?![\d])\S+ \(|^(fil|câble) sans numéro|^câble \S+ :|^borne /.test(t) ? 'fils' : 'disjoncteur';
/* LA BORNE FAUTIVE d'un connecteur qu'aucun arrangement ne loge (l'audit v72 : « six bornes accusées pour une seule
   fautive ; W-370 est vert ») — le moteur la nomme (09, `remplirContacts` : `coupables`, et `proche`, la référence de
   l'arrangement le plus proche) : pour chaque câble de la borne, ce qui cloche contre le contact de même rang du plus
   proche (trop gros, trop fin) et LA GAUGE DE SA FAMILLE QUI S'Y LOGE — la plus proche de la sienne —, si elle porte
   son courant (`tientLeCourant`). Rend [{ borne, f, l, mot, contact, module, propose: { type, admis } | null }]. */
function coupablesDu(Q, points) { const v = ((Q && Q.verdicts) || []).find(x => x.coupables && x.proche); if (!v) return [];
  const N = app.norme, m = moduleDeReference(N, v.proche); if (!m) return [];
  const lettres = !m.contacts.some(x => /^\d+$/.test(x.lettre));
  return v.coupables.flatMap(cp => { const p = (points || []).find(x => x.borne === cp.borne), num = numeroDeBorne(cp.borne);
    const ct = m.contacts.find(x => x.lettre === num) || (lettres && /^\d+$/.test(num) ? m.contacts[+num - 1] || null : null);
    return ((p && p.fils) || []).filter(f => f.l).map(f => { const j = jaugeDuType(f.type), fam = partiesDuType(f.type).famille, src = sourceDe(f.l) || f.l;
      const acceptees = ct ? gaugesDeFamille(fam).filter(g => contactAccepte(N, m.famille, ct.taille, g, Q.sexe, typeDe(fam, g))) : [];
      const mot = !ct ? `pas de contact ${num} dans le ${m.variante}` : j != null && acceptees.length && acceptees.every(g => g > j) ? 'trop gros' : j != null && acceptees.length && acceptees.every(g => g < j) ? 'trop fin' : 'refusé';
      const t = acceptees.filter(g => g !== j).sort((a, b) => Math.abs(a - j) - Math.abs(b - j)).map(g => typeDe(fam, g)).find(ty => tientLeCourant(src, ty) != null);
      return { borne: cp.borne, f, l: src, mot, contact: ct, module: m, propose: t ? { type: t, admis: tientLeCourant(src, t) } : null }; }); }); }
// le geste qui répare : le câble fautif passe à la gauge qui se loge (une entrée d'historique)
const boutonReparer = x => x.propose ? `<button type="button" class="btn papier fi-reparer" data-reparer="${escA(cleFil(x.l))}" data-type="${escA(x.propose.type)}" data-bulle="${escA(`${cableDit(x.l)} en ${x.propose.type} : le contact ${x.contact ? x.contact.lettre + ' (taille ' + x.contact.taille + ')' : ''} du ${x.module.variante} l’admet, et il porte son courant (${amperes(arrondi(x.propose.admis, 1))} admis)${(m => m ? ' ; ' + m : '')(coutDuType(x.l, x.propose.type))} — Ctrl+Z le rend`)}">${esc('Passer en ' + x.propose.type)}</button>` : '';
function problemesEquipement(nom, cav, b, vt, dj) { const probs = [];
  cav.forEach(c => { const cps = coupablesDu(c.plan, c.points);
    c.plan.verdicts.forEach(v => { if (v.niveau === 'ko') probs.push({ niveau: 'ko', texte: c.nom + ' · ' + v.texte, section: 'connecteur', connecteur: c.nom, viser: v.coupables && cps[0] ? cleFil(cps[0].l) : undefined });
      else if (v.niveau === 'attention' && !/^contact \S+ : \d+ (fils|câbles)/.test(v.texte)) probs.push({ niveau: 'att', texte: c.nom + ' · ' + v.texte, section: 'connecteur', connecteur: c.nom }); }); });
  const parBorne = connecteurParBorne(nom, liaisonsDeRepere(nom));
  [...b.parBorne].filter(([, fs]) => fs.length > 1).forEach(([bo, fs]) => { const g = parBorne.get(String(bo));
    probs.push({ niveau: 'att', texte: `${majuscule(nombreEnMots(fs.length))} câbles arrivent sur la borne ${bo} — Une borne n’en reçoit qu’un : ${vt.has(String(bo)) ? 'VOLTA ajoute une barrette (' + vt.get(String(bo)) + ') qui les relie, à poser au contrat' : 'il faut une barrette pour les relier'}`, section: dj ? 'fils' : 'connecteur', connecteur: !dj && g ? g.nom : undefined }); });
  if (dj) controleDisjonction(nom).forEach(x => probs.push({ niveau: x.niveau === 'ko' ? 'ko' : 'att', texte: x.texte, section: sectionDj(x.texte) }));
  // ce que le contrôle du contrat relève en plus sur ce repère (un conducteur CCA, ce qu'un disjoncteur nourrit au-delà d'un passage)
  ((typeof CONTROLE !== 'undefined' && CONTROLE.items) || []).filter(x => x.nom === nom && !probs.some(p => p.texte === x.texte)).forEach(x => probs.push({ niveau: x.niveau === 'ko' ? 'ko' : 'att', texte: x.texte, section: dj ? sectionDj(x.texte) : x.section || 'connecteur' }));
  return probs; }
/* Ce qui a été écrit ici sur les liaisons d'un repère (« Par rapport au retest ») : de son côté, la référence et le
   contact ; de ses câbles, le numéro, le type, la longueur, la route. */
const ecritsDuRepere = nom => changementsEcrits(verite().filter(l => (l.de === nom || l.vers === nom) && l.avant).map(l => [l, ['type', 'longueur', 'route', ...(l.de === nom ? ['pnDe', 'contactDe'] : []), ...(l.vers === nom ? ['pnVers', 'contactVers'] : [])]]));
/* (v79) « 1 contact pris sur 3 », « 4 contacts pris sur 18 » : accordé */
const prisSur = (n, m, mot) => `${n} contact${n > 1 ? 's' : ''}${mot === '' ? '' : ' ' + (mot || 'pris')} sur ${m}`;
/* (v86) le statut de L'essentiel tient dans l'onglet le plus étroit (« 16 contacts sur 54 » passait à la ligne à côté du
   récapitulatif) : « 16/54 contacts » ; la bulle le dit en mots, avec ce qui reste libre */
const statutContacts = (n, m, etat) => ({ t: n + '/' + m + ' contacts', etat, bulle: prisSur(n, m) + (m - n > 0 ? ' : ' + plurielLie(m - n, 'libre') : ' : tous pris') });
function ficheEquipement(nom) { const V = verite(), b = besoinsDeBarrette(nom, V), dj = estDisjoncteur(nom);
  const C = connecteursDe(nom, V).filter(c => c.nom), cav = cavitesDe(nom), parNom = new Map(cav.map(c => [c.nom, c])), vt = barrettesSur(nom);
  const sans = [...b.parBorne.keys()].filter(bo => !C.some(c => c.bornes.includes(bo))).sort(triNaturel);
  const probs = problemesEquipement(nom, cav, b, vt, dj), fils = filsDuRepere(nom);
  if (dj) return ficheDisjoncteur(nom, probs);
  probs.push(...problemesDesFils(fils));
  // le connecteur montré : celui qu'on a choisi, sinon celui qui porte un problème, sinon le premier
  const ids = C.map(c => c.nom).concat(sans.length ? ['—'] : []), fautif = id => probs.some(p => p.connecteur === id && p.niveau === 'ko');
  const sel = ids.includes(FI.connecteur[nom]) ? FI.connecteur[nom] : ids.find(fautif) || ids[0] || ''; FI.connecteur[nom] = sel;
  /* LES BULLES des connecteurs, sous le titre « Connecteur » (le lecteur : « tu mets juste connecteur, et en dessous A,
     comme une bulle — B, C ; on appuie sur l'une, ça passe d'un connecteur à l'autre ») : une bulle par connecteur, même
     seul ; rouge s'il porte un problème ; le nombre de contacts pris dans la bulle du survol. */
  const bulles = ids.length ? `<span class="ct-bulles" role="group" aria-label="Le connecteur montré">${ids.map(id => { const x = C.find(y => y.nom === id), kx = x && parNom.get(id), n = x ? x.bornes.length : sans.length;
    const compte = kx && kx.plan.modules[0] ? prisSur(kx.plan.utilises, kx.plan.modules[0].module.contacts.length) : pluriel(n, 'borne'), raison = probs.filter(p => p.connecteur === id && p.niveau === 'ko').map(p => p.texte).join(' ; ');
    return `<button type="button" class="seg ct-bulle${fautif(id) ? ' ko' : ''}" data-connecteur="${escA(id)}" aria-pressed="${id === sel}" aria-label="${escA((id === '—' ? 'Les bornes sans connecteur' : 'Le connecteur ' + id) + ' · ' + compte + (raison ? ' — ' + raison : ''))}" data-bulle="${escA((id === '—' ? 'Les bornes sans connecteur' : 'Connecteur ' + id) + ' · ' + compte + (raison ? '\n' + raison : ''))}">${id === '—' ? 'sans' : esc(id)}</button>`; }).join('')}</span>` : '';
  const c = C.find(k => k.nom === sel) || null, k = c ? parNom.get(c.nom) || null : null;
  const P0 = c ? corpsConnecteur(nom, c, k, b, vt, true) : null, corps = P0 ? P0.tete + P0.contacts : sel === '—' ? corpsSansConnecteur(nom, sans, b, vt) : '';
  // le RACCORD du connecteur montré, dans la même section (le lecteur : « le raccord, je l'aurais mis avec le connecteur :
  // tout ce qui est connecteur, tyrap, etc., c'est le même »)
  const filsC = c ? c.bornes.flatMap(bo => b.parBorne.get(bo) || []).filter(f => f.l) : [], M = k && k.plan.modules[0];
  const racH = c && filsC.length ? raccordHtml({ cle: nom + '|' + c.nom, fils: filsC, pn: c.pn, ref: M ? M.reference : '', plan: M ? k.plan : null }) : '', raccord = racH ? groupeSection('Raccord', racH, { cls: 'fi-groupe-raccord' }) : '';
  /* (v85) MODIFIER, en trois sortes — DANS VOTRE FICHIER : la référence de chaque connecteur (fournie avec l'équipement, elle
     se change dans le fichier) ; CHOIX DE VOLTA, pour le connecteur montré : l'arrangement (la norme connue), ses contacts à
     sertir, son raccord ; et ce qu'il consomme (VOLTA compte sans, ou vous l'écrivez) ; INFORMATION : ce qui attend la norme. */
  const regArr = '[data-reg="l-arrangement"]', regCt = '[data-reg="les-contacts-a-sertir"]', regRac = '[data-reg="le-raccord"]', regConso = '[data-reg="ce-qu-il-consomme"]';
  const reglagesEquipement = () => { const Qc = k && k.plan, hR = c && filsC.length ? (() => { try { return habillageDe({ cle: nom + '|' + c.nom, fils: filsC, pn: c.pn, ref: M ? M.reference : '', plan: M ? k.plan : null }); } catch (_) { return null; } })() : null;
    const racMain = c ? app.contrat.raccords.get(nom + '|' + c.nom) : null, racM = !!(racMain && Object.keys(racMain).length), pieces = hR ? (() => { try { return piecesHabillage(hR).filter(x => x.reference); } catch (_) { return []; } })() : [];
    const ch = typeof chargeEcrite === 'function' ? chargeEcrite(nom) : null, ecrit = !!(ch && phaseEcrite(ch)), perm = ch && ch.perm && ch.perm.i > 0 ? ch.perm.i : null, dem = ch && ch.dem && ch.dem.i > 0 ? ch.dem : null;
    const deC = ids.length > 1 && c ? ' de ' + c.nom : '', colsDe = x => [...new Set(liaisonsDuConnecteur(nom, x.bornes).map(([, cc]) => cc === 'pnDe' ? 'PN1' : 'PN2'))].sort().join(' et ');
    const ksMain = c && M ? [...new Set(c.bornes.filter(bo => (b.parBorne.get(bo) || []).length && sertirChoisi(nom, bo)).map(bo => cleSertir(nom, bo)))] : [];
    const autoArr = Qc && Qc.main && M ? (() => { try { return remplirContacts(k.points, app.norme, { pn: c.pn, sexe: sexeChoisi(nom + '|' + c.nom) }).reference; } catch (_) { return ''; } })() : M ? M.reference : '';
    const xs = [
      ...C.slice(0, 4).map(x => ({ sorte: 'fichier', titre: 'Le connecteur ' + x.nom, valeur: x.pn ? ident(x.pn) : 'sans référence', source: 'fichier', etat: x.pn ? '' : 'att',
        pourquoi: x.pn ? 'Fourni avec l’équipement' + (colsDe(x) ? ' (colonne ' + colsDe(x) + ').' : '.') : 'Absente de votre fichier : à y écrire.' })),
      C.length > 4 ? { sorte: 'fichier', titre: 'Ses autres connecteurs', valeur: esc(pluriel(C.length - 4, 'connecteur')), source: 'fichier', pourquoi: 'Leurs références se lisent dans L’essentiel.' } : null,
      Qc ? { sorte: 'choix', titre: 'L’arrangement' + deC, valeur: M ? ident(M.reference) : 'aucun ne loge', etat: M ? (Qc.main && Qc.verdicts.some(v => v.niveau === 'ko') ? 'ko' : '') : 'ko', source: Qc.main ? 'main' : Qc.nomme ? 'fichier' : 'calcul', motSource: Qc.nomme && !Qc.main ? 'votre référence' : '',
        pourquoi: Qc.main ? 'Choisi ici, à la main.' : Qc.nomme ? 'Votre référence le nomme.' : M ? `Le plus petit qui loge ${c.bornes.length > 1 ? 'ces ' + c.bornes.length + ' bornes' : 'cette borne'}.` : 'Aucun ne loge ces bornes : les problèmes disent pourquoi.',
        manuel: !!Qc.main, auto: 'arr:' + nom + '|' + c.nom, vers: regArr, motAuto: 'L’arrangement' + deC + ' revient au choix de VOLTA' + (Qc.main && autoArr ? ' : ' + autoArr : '') + '.' } : null,
      c && M ? { sorte: 'choix', titre: 'Ses contacts à sertir', valeur: refsCt.length ? refsCt.slice(0, 2).map(r => ident(r)).join(' · ') + (refsCt.length > 2 ? ' …' : '') : esc(pluriel(filsC.length, 'contact')), source: ksMain.length ? 'main' : 'tables',
        pourquoi: ksMain.length ? `${majuscule(pluriel(ksMain.length, 'borne'))} choisie${ksMain.length > 1 ? 's' : ''} ici ; les autres, la table.` : 'Un par câble, lu dans la table de la norme.',
        manuel: ksMain.length > 0, auto: 'sertirs:' + ksMain.join(';'), vers: regCt, motAuto: 'Les contacts à sertir reviennent à ceux de la table.' } : null,
      c && !M ? { sorte: 'info', titre: 'Ses contacts à sertir', valeur: 'à préciser', etat: 'att', source: 'norme',
        pourquoi: !Qc ? `La norme de ${c.pn ? ident(c.pn) : 'ce connecteur'} est inconnue : ils viendront avec elle.` : 'Ils viendront avec l’arrangement.' } : null,
      hR ? { sorte: 'choix', titre: 'Le raccord' + deC, valeur: pieces.length ? pieces.slice(0, 2).map(x => ident(x.reference)).join(' · ') : 'rien à poser', source: racM ? 'main' : 'calcul',
        pourquoi: racM ? 'Ses options sont choisies ici.' : hR.faisceau && hR.faisceau.diametre != null ? `Pour un toron de Ø ${esc(nombre(Math.round(hR.faisceau.diametre * 10) / 10))} mm, sans option.` : 'Calculé d’après ses câbles.',
        manuel: racM, auto: 'raccords:' + nom + '|' + c.nom, vers: regRac, motAuto: 'Le raccord' + deC + ' revient au calcul de VOLTA.' } : null,
      sConso ? { sorte: 'choix', titre: 'Ce qu’il consomme', valeur: ecrit ? esc([perm ? amperes(perm) + ' en permanence' : '', dem ? amperes(dem.i) + ' au démarrage' + (dem.t ? ' pendant ' + secondes(dem.t) : '') : ''].filter(Boolean).join(', ')) || 'écrite' : 'pas écrite', source: ecrit ? 'main' : 'calcul', motSource: ecrit ? 'écrite ici' : '',
        // (v86) sans disjoncteur en amont, VOLTA ne compte pas « le courant de son disjoncteur » : il suppose celui des Hypothèses
        pourquoi: ecrit ? (alP ? 'Elle fait le courant de ses câbles et le profil de ' + esc(alP.nom) + '.' : 'Elle fait le courant de ses câbles.') : alP ? 'VOLTA compte le courant total de ' + esc(alP.nom) + '.' : 'Sans disjoncteur en amont, VOLTA suppose ' + esc(nombre((app.simu || HYPOTHESES).courant)) + ' A.',
        manuel: ecrit, auto: 'conso:' + nom, vers: regConso, motAuto: 'Consommation de ' + nom + ' effacée : VOLTA compte sans.' } : null];
    const sections = ids.length ? `<div class="fi-panneau" data-panneau="${escA(sel)}">`
      + (Qc ? regCarte('L’arrangement', Qc.main ? 'Choisi ici. Un autre se prend d’un clic ; « Automatique » rend celui de VOLTA.' : 'Ceux de la norme qui logent ces bornes, puis les autres : un clic en retient un, à la place de celui de VOLTA.', reglageOuvert(regArr) ? listeArrangements(nom + '|' + c.nom, k, Qc, M, autoArr, true) : '', { reg: 'l-arrangement', paresseux: true }) : '')
      + (c && M && P0 ? regCarte('Ses contacts à sertir', 'Un clic sur un contact montre ceux de sa taille : un autre se retient d’un clic.', P0.contacts, { reg: 'les-contacts-a-sertir' }) : '')
      + (hR ? regCarte('Le raccord', 'Ce que nous posons autour du connecteur. Une option changée ici passe le raccord en Manuel.', raccordHtml({ cle: nom + '|' + c.nom, fils: filsC, pn: c.pn, ref: M ? M.reference : '', plan: M ? k.plan : null, options: true }), { reg: 'le-raccord' }) : '') + '</div>' : '';
    const consoS = sConso ? regCarte('Ce qu’il consomme', 'Le courant qu’il tire, phase par phase : écrit ici, il passe en Manuel.', sConso.contenu, { reg: 'ce-qu-il-consomme' }) : '';
    // plusieurs connecteurs : les bulles A · B, au bout de la tête des choix (ils règlent le connecteur montré)
    return ongletReglages(xs, sections + consoS, { tete: { choix: ids.length > 1 ? `<span class="nv-mod-ct">Connecteur</span>${bulles}` : '' } }); };
  // le résumé de la ligne « Connecteur » : sa référence (une, sinon combien), puis les bulles
  const pns = [...new Set(C.map(x => x.pn).filter(Boolean))], refs = pns.length === 1 ? ident(pns[0]) : pns.length > 1 ? esc(pluriel(pns.length, 'référence')) : '';
  // les câbles qu'un plan de connecteur ne loge pas : leur ligne dans « Câbles » le dit
  const coupables = new Map(); cav.forEach(x => coupablesDu(x.plan, x.points).forEach(y => coupables.set(y.l, `connecteur ${x.nom} : aucun arrangement ne le loge (${y.mot} pour la borne ${y.borne})`)));
  // (le compte rouge au bout de la ligne se tait quand la bulle du connecteur fautif le dit déjà — le technicien v73 : « le 1 rouge répète l'info »)
  const pbC = probs.filter(p => p.section === 'connecteur'), dejaDit = pbC.length > 0 && pbC.every(p => p.niveau === 'ko' && p.connecteur && fautif(p.connecteur));
  /* (v77, le lecteur : « je n'arrive pas à ouvrir un connecteur et le fermer, je reste bloqué dessus ») : les bulles étaient
     DANS la ligne de titre — un clic au milieu de la ligne tombait sur une bulle et ne repliait rien. La ligne ne fait plus
     que déplier et replier (la référence, les connecteurs en mots) ; les bulles ouvrent le corps de la section. */
  const quels = ids.filter(id => id !== '—'), enMots = quels.length > 1 ? `<span class="fs-ct-ids">${esc(pluriel(quels.length, 'connecteur') + ' : ' + quels.join(', '))}</span>` : '';
  const choix = ids.length > 1 || sans.length ? `<div class="ct-choix"><span class="ct-choix-t">Le connecteur montré</span>${bulles}</div>` : '';
  const resumeC = (refs ? `<span class="fs-ref">${refs}</span>` : '') + enMots || (ids.length ? '' : 'aucune borne'), badgeC = dejaDit ? null : badgeProblemes(probs, 'connecteur');
  const sFils = sectionFilsDuRepere(fils, probs, coupables), sConso = sectionConso(nom), sDeja = sectionDejaFait(nom);
  const id = identite([majuscule(natureDe(nom)), descriptionDuRetest(nom) ? esc(descriptionDuRetest(nom)) : '', pns.length === 1 ? ident(pns[0]) : '', C.length > 1 ? pluriel(C.length, 'connecteur') : '', esc(motFolios(foliosDuRepere(nom)))]);
  // LES CHIFFRES (v78) : ses connecteurs (ou sa référence), ses contacts pris, ses câbles, ce qui l'alimente
  const pris = cav.reduce((n, x) => n + (x.plan.utilises || 0), 0), places = cav.reduce((n, x) => n + (x.plan.modules[0] ? x.plan.modules[0].module.contacts.length : 0), 0);
  const al = fils.map(f => intensiteDuFil(f.l).al).find(Boolean);
  // (v84) la lettre d'un connecteur seul est déjà sur le dessin de la carte : la case dit plutôt le disjoncteur qui le
  // protège ; un connecteur qui bloque garde sa case, en rouge
  // (côté source d'un disjoncteur — une batterie, une génératrice —, ses câbles l'alimentent et ne sont pas sous sa protection)
  const als = fils.map(f => intensiteDuFil(f.l).al).filter(Boolean), alP = als.find(a => !a.amont), alS = als.find(a => a.amont);
  const chiffres = [alP && !quels.some(fautif) ? { k: 'Disjoncteur', v: `<span class="id">${esc(alP.nom)}</span>`, bulle: 'Le disjoncteur qui protège ses câbles' + (alP.calibre ? ' : ' + amperes(alP.calibre) : '') }
    : alS && !quels.some(fautif) ? { k: 'Alimente', v: `<span class="id">${esc(alS.nom)}</span>`, bulle: 'Il alimente le disjoncteur ' + alS.nom + ' : côté source, ses câbles ne sont pas sous sa protection' }
    : quels.length > 1 ? { k: 'Connecteurs', v: `<span class="id">${quels.map(q => fautif(q) ? `<span class="fi-ko-t">${esc(q)}</span>` : esc(q)).join(' · ')}</span>`, etat: quels.some(fautif) ? 'ko-l' : '', sous: quels.some(fautif) ? esc(quels.filter(fautif).join(', ') + ' bloque') : 'tous logent leurs câbles', onglet: 'essentiel' }
      : { k: 'Connecteur', v: `<span class="id">${esc(quels[0] || '—')}</span>`, etat: quels.some(fautif) ? 'ko-l' : '', onglet: 'essentiel' },
    places ? { k: 'Contacts', v: `${pris}<small>/ ${places}</small>`, sous: places - pris > 0 ? esc(plurielLie(places - pris, 'libre')) : 'tous pris', barre: pris / places, onglet: 'essentiel' } : null,
    chiffreCables(sFils)];
  // le geste qui répare : la gauge qui se loge, quand un arrangement refuse un câble
  let geste = ''; for (const x of cav) { const y = coupablesDu(x.plan, x.points).find(z => z.propose); if (y) { geste = boutonReparer(y).replace('btn papier', 'btn cuivre dense'); break; } }
  /* (v78) L'ESSENTIEL : le connecteur montré (ses bulles A · B · C), sa face, ses broches, comment VOLTA l'a choisi ;
     LA FABRICATION : tout ce qu'il faut pour le monter ; LES RÉGLAGES : ce qui se change (la référence, l'arrangement, le
     sexe, le raccord, la consommation) */
  const Nn = app.norme, Q = k && k.plan, sertirs = new Map(Q ? Q.fils.map(x => [x.f.l, x]) : []);
  const broches = c ? c.bornes.slice().sort(triNaturel).flatMap(bo => (b.parBorne.get(bo) || []).map(f => { const x = sertirs.get(f.l), st = x ? sertirAuBout(nom, bo, x) : null;
      return { lettre: x && x.contact ? x.contact.lettre : '', borne: bo, vers: f.vers, borneVers: f.borne, type: f.type, couleur: coulDeFil(f), sertir: st ? motSertir(st) : '', ko: x && x.jaugeOk === false ? 'gauge refusée' : coupables.get(f.l) ? 'ne se loge pas' : '', k: f.l ? cleFil(f.l) : '' }; })) : [];
  const parL = new Map(Q ? Q.fils.map(x => [x.contact.lettre, x]) : []);
  const faceG = M ? faceVue(M.module.contacts, ct => { const x = parL.get(ct.lettre); return x ? (x.jaugeOk === false ? 'ko' : 'pris') : ''; }, { lettres: true, pas: 30, r: 10, titre: 'La face du connecteur ' + (c ? c.nom : '') }) : faceVue([], () => '', { w: 200 });
  const famC = Q && Q.famille ? Q.famille : c && c.pn ? familleDeReference(Nn, c.pn, 'connecteur') : '', nomF = famC ? nomDeFamille(Nn, famC) || famC : '';
  const colsC = c ? [...new Set(liaisonsDuConnecteur(nom, c.bornes).map(([, ch]) => ch === 'pnDe' ? 'PN1' : 'PN2'))].sort().join(' et ') : '';
  const refsCt = [...new Set(broches.map(x => x.sertir).filter(Boolean))], fautifsC = Q && !M ? coupablesDu(Q, k.points) : [];
  const etapesC = !c ? [] : [
    c.pn ? { html: `Référence <b class="id">${esc(c.pn)}</b>.`, source: 'fichier', mot: 'votre fichier', bulle: colsC ? 'Colonne ' + colsC + ' de votre fichier' : '' } : { html: 'Votre fichier ne donne pas de référence pour ce connecteur.', source: 'fichier', etat: 'att' },
    nomF ? { html: `Norme <b>${esc(nomF)}</b> : la référence la désigne.`, source: 'norme' } : null,
    M ? { html: `Arrangement <b class="id">${esc(M.reference)}</b> : ${esc(Q.main ? 'choisi ici, à la main' : Q.nomme ? 'la référence le nomme' : 'le plus petit qui loge ces ' + pluriel(c.bornes.length, 'borne') + ' avec leurs gauges')}.`, source: Q.main ? 'main' : Q.nomme ? 'fichier' : 'calcul' }
      : Q ? { html: `Aucun arrangement ${esc(nomF)} ne loge ${esc([...new Set(fautifsC.map(x => x.borne))].join(', ') || 'ces bornes')}${fautifsC[0] ? ` : <b class="id">${esc(fautifsC[0].f.type || '?')}</b> ${esc(fautifsC[0].mot)}${fautifsC[0].contact ? ' pour un contact taille ' + esc(fautifsC[0].contact.taille) : ''}` : ''}.${fautifsC[0] && fautifsC[0].propose ? ` En <b class="id">${esc(fautifsC[0].propose.type)}</b>, il s’y loge et porte encore son courant.` : ''}`, source: 'calcul', etat: 'ko' } : null,
    refsCt.length ? { html: `Contacts à sertir : <b class="id">${esc(refsCt.join(', '))}</b>, lus dans la table des contacts (taille, sexe, gauge).`, source: 'tables' } : null];
  const fabC = C.map(x => { const kx = parNom.get(x.nom), Qx = kx && kx.plan, Mx = Qx && Qx.modules[0], fx = x.bornes.flatMap(bo => b.parBorne.get(bo) || []).filter(f => f.l), sx = new Map(Qx ? Qx.fils.map(y => [y.f.l, y]) : []);
    const refs = x.bornes.flatMap(bo => (b.parBorne.get(bo) || []).map(f => { const y = sx.get(f.l), st = y ? sertirAuBout(nom, bo, y) : null; return st ? motSertir(st) : ''; }));
    let pieces = []; try { pieces = fx.length ? piecesFabrication(habillageDe({ cle: nom + '|' + x.nom, fils: fx, pn: x.pn, ref: Mx ? Mx.reference : '', plan: Mx ? Qx : null })) : []; } catch (_) { pieces = []; }
    // (v78, le lecteur : « les connecteurs des équipements sont fournis par le fournisseur ; à nous le raccord, les tyraps ») :
    // le connecteur, fourni ; ce qu'on monte dessus — les contacts à sertir, le raccord et ce qui l'entoure
    return { titre: 'Connecteur ' + x.nom, ref: x.pn, sous: 'fourni avec l’équipement', lignes: [...compterParReference(refs, 'contact à sertir'), ...pieces].filter(Boolean) }; });
  /* (v79) L'ESSENTIEL : ce qu'il relie (le brochage dessiné, tous ses connecteurs), la face du connecteur quand la norme la
     connaît (ses contacts pris), comment VOLTA l'a choisi. Plus de tableau de tirets quand la norme est inconnue. */
  const ligneB = (bo, f) => ({ borne: bo, type: f.type, couleur: coulDeFil(f), vers: f.vers, borneVers: estMasse(f.vers) ? '' : f.borne, masse: estMasse(f.vers), ko: coupables.get(f.l) ? 'ne se loge pas' : '', k: f.l ? cleFil(f.l) : '' });
  const consB = C.map(x => ({ nom: x.nom, ref: x.pn || '', lignes: x.bornes.slice().sort(triNaturel).flatMap(bo => (b.parBorne.get(bo) || []).map(f => ligneB(bo, f))) }))
    .concat(sans.length ? [{ nom: '·', ref: 'sans connecteur', lignes: sans.flatMap(bo => (b.parBorne.get(bo) || []).map(f => ligneB(bo, f))) }] : []);
  const nCab = consB.reduce((n, x) => n + x.lignes.length, 0), brochage = brochageVue(nom, majuscule(natureDe(nom) || ''), consB);
  const blocB = brochage ? `<section class="vu-bloc vu-bloc-bro"><h4 class="vu-titre">Ce qu’il relie <span>${esc(lies([pluriel(nCab, 'câble'), quels.length ? pluriel(quels.length, 'connecteur') : '']))}</span></h4>${brochage}</section>` : '';
  if (c && c.pn && !nomF && !M) etapesC.push({ html: 'VOLTA ne connaît pas encore la norme de cette référence : sa face et ses contacts à sertir restent à préciser.', source: 'norme', etat: 'att' });
  const blocFace = M ? `<section class="vu-bloc vu-bloc-face"><h4 class="vu-titre">La face du connecteur ${esc(c.nom)} <span>${esc(prisSur(Q.utilises || broches.length, M.module.contacts.length))}</span></h4>`
      + (ids.length > 1 ? `<div class="vu-face-choix">${bulles}</div>` : '') + `<figure class="vu-fig vu-fig-face">${faceG}<figcaption>${esc(M.module.variante + ' · vue côté contacts')}</figcaption>${legendeFaceVue(broches.some(x => x.ko))}</figure></section>` : '';
  /* (v86, l'audit : « D'où vient le connecteur A » ne parlait que de A, alors que 103RL1 a aussi X) : sans face dessinée (la
     norme est inconnue), aucune bulle ne passe d'un connecteur à l'autre — la section les dit TOUS, ceux qui partagent une
     référence ensemble (« Connecteurs A et X : référence … »). Avec la face, les bulles A · X choisissent celui qu'elle dit. */
  const tousC = !M && C.length > 1 ? (() => { const parPn = new Map(); C.forEach(x => { const kx = x.pn || ''; (parPn.get(kx) || parPn.set(kx, []).get(kx)).push(x.nom); });
    const noms = xs => xs.length > 1 ? 'Connecteurs ' + xs.slice(0, -1).map(n => `<b class="id">${esc(n)}</b>`).join(', ') + ' et ' + `<b class="id">${esc(xs[xs.length - 1])}</b>` : `Connecteur <b class="id">${esc(xs[0])}</b>`;
    const connue = pn => C.some(x => x.pn === pn && ((parNom.get(x.nom) || {}).plan || {}).famille) || !!familleDeReference(Nn, pn, 'connecteur');
    const pns = [...parPn.keys()].filter(Boolean), inconnus = pns.filter(pn => !connue(pn));
    return [...[...parPn].map(([pn, xs]) => pn ? { html: `${noms(xs)} : référence <b class="id">${esc(pn)}</b>.`, source: 'fichier', mot: 'votre fichier' } : { html: `${noms(xs)} : votre fichier ne donne pas de référence.`, source: 'fichier', etat: 'att' }),
      inconnus.length ? { html: `VOLTA ne connaît pas encore la norme de ${inconnus.length > 1 ? 'ces références' : 'cette référence'} : la face et les contacts à sertir ${C.length > 1 ? 'de ces connecteurs' : 'de ce connecteur'} restent à préciser.`, source: 'norme', etat: 'att' } : null].filter(Boolean); })() : null;
  const ess = !ids.length ? '<p class="vu-note">Cet équipement n’a pas encore de câble.</p>' : `${blocB}${blocFace}${tousC ? pourquoiVue('D’où viennent ses connecteurs', tousC) : c ? pourquoiVue('D’où vient le connecteur ' + c.nom, etapesC) : ''}`;
  const onglets = [
    { cle: 'essentiel', statut: quels.length <= 1 && places ? statutContacts(pris, places, quels.some(fautif) ? 'ko' : 'ok') : { t: quels.length > 1 ? (quels.some(fautif) ? quels.filter(fautif).join(', ') + ' à régler' : pluriel(quels.length, 'connecteur')) : pluriel(ids.length, 'connecteur'), etat: quels.some(fautif) ? 'ko' : 'ok',
      bulle: quels.some(fautif) ? 'Connecteur ' + quels.filter(fautif).join(', ') + ' : aucun arrangement ne loge ses câbles' : quels.length > 1 ? 'Connecteurs ' + quels.join(', ') + ' : chacun loge ses câbles' : '' }, contenu: ess },
    ongletCables(sFils), ongletFabrication(fabC, 'Ce qu’il faut pour le monter'),
    reglagesEquipement(),
    sDeja ? ongletDeLaSection(sDeja) : null];
  const sections = [{ cle: 'connecteur', titre: 'Connecteur', resume: resumeC, badge: badgeC, contenu: `${choix}<div class="fi-panneau" data-panneau="${escA(sel)}">${corps}${raccord}</div>`, vide: ids.length ? '' : 'aucune borne' }, sFils, sConso, sDeja];
  // (v79) la tuile montre ce qu'il relie — le brochage, en petit — plutôt que sa référence une troisième fois
  // (au-delà d'une douzaine de câbles — un calculateur —, la tuile dit ses connecteurs en une ligne chacun ; le brochage entier est dans « Tout voir »)
  const vignette = !brochage ? '' : nCab <= 12 ? brochageVue(nom, majuscule(natureDe(nom) || ''), consB, { petit: true }) : connecteursVue(C.map(x => { const kx = parNom.get(x.nom), Mx = kx && kx.plan.modules[0];
      return { nom: x.nom, ref: x.pn || (Mx ? Mx.reference : ''), pris: kx ? kx.plan.utilises || 0 : 0, places: Mx ? Mx.module.contacts.length : 0, cables: x.bornes.reduce((n, bo) => n + (b.parBorne.get(bo) || []).length, 0), ko: fautif(x.nom) ? 'un câble ne se loge pas' : '' }; }));
  return composerFiche({ type: 'equipement', tete: { nom, champ: 'eq-rep', designation: nom }, meta: [pns.length === 1 ? ident(pns[0]) : pns.length ? esc(pluriel(pns.length, 'référence')) : ''],
    probs, onglets, sections, ecrits: ecritsDuRepere(nom), proposes: [], chiffres, geste, vignette, identite: id,
    ok: 'Ses connecteurs logent tous ses câbles, et chacun porte son courant.', pied: { tableau: nom, menu: MENU_BLOC } }); }
// la case « Câbles » des chiffres (v78) : combien, combien en défaut, ce que porte le plus chargé
/* (v86, l'audit : « le 4 en rouge sur la carte de 103RL1, sans dire pourquoi ») : le compte reste à l'encre — c'est un
   nombre de câbles, pas un nombre de problèmes — et ce qui cloche se dit à côté, dans sa couleur : « 4 · 1 à régler ». Tout
   passe : le compte seul (le pourcentage ne se lit que dans le tableau des câbles, sous « % de l'admis ») ; la bulle nomme
   les câbles en cause. */
const chiffreCables = s => { if (!s) return null; if (s.vide) return { k: 'Câbles', v: '0', onglet: 'fils' };
  const n = s.compte || 0, ko = s.nko || 0, att = ko ? 0 : s.natt || 0, raisons = (s.raisons || []).slice(0, 4).join('\n');
  const etat = ko ? `<small class="nc-etat ko">· ${ko} à régler</small>` : att ? `<small class="nc-etat att">· ${att} à voir</small>` : '';
  return { k: 'Câbles', v: String(n) + etat, onglet: 'fils',
    bulle: ko || att ? `${pluriel(n, 'câble')}, dont ${ko || att} ${ko ? 'à régler' : 'à voir'}${raisons ? ' :\n' + raisons : ''}` : `${n > 1 ? 'Ses ' + n + ' câbles portent leur courant' : 'Son câble porte son courant'} ; le détail, câble par câble, dans l’onglet Câbles` }; };
/* LA CONSOMMATION (le lecteur, v74 : « le courant de chaque équipement, c'est moi qui l'ai — je le rajoute à la main ») :
   le permanent, le démarrage et sa durée ; dessous, le disjoncteur qui l'alimente et le calibre qu'il en tire (la somme
   de tout ce qu'il alimente, 08 bis `profilDesConsommateurs`). Rien pour une masse, un renvoi, un disjoncteur. */
function sectionConso(nom) { if (!nom || estDisjoncteur(nom) || estMasse(nom)) return null;
  const c = chargeEcrite(nom) || {}, v = (k, q) => c[k] && c[k][q] != null && c[k][q] !== '' ? nombre(nombreLu(c[k][q])) : '';
  const champ = (q, val, aide, unite) => `<span class="fi-conso-c">${saisie(` data-conso="${q}" inputmode="decimal" autocomplete="off" aria-label="${escA(aide)}"`, val, { court: true, mono: true, ph: '—' })}<i>${esc(unite)}</i></span>`;
  const djs = disjoncteursDe(nom), ecrit = phaseEcrite(c);
  const qui = djs.length ? djs.map(d => { const s = (chargeEcrite(d) && phaseEcrite(chargeEcrite(d))), cal = calibreDe(d);
      return `<button type="button" class="fi-lien" data-choisir-bloc="${escA(d)}">${esc(d)}</button>${cal ? ' · ' + esc(amperes(cal)) : ''}${s ? ' <em>(son profil est écrit sur sa fiche : il passe devant)</em>' : ''}`; }).join(', ')
    : '<em>aucun disjoncteur ne l’alimente dans ce contrat</em>';
  const contenu = champs([ligneChamp('Permanent', champ('perm', v('perm', 'i'), 'Courant permanent, en ampères', 'A')),
      ligneChamp('Démarrage', champ('dem', v('dem', 'i'), 'Courant de démarrage, en ampères', 'A') + '<span class="fi-conso-mot">pendant</span>' + champ('demt', v('dem', 't'), 'Durée du démarrage, en secondes', 's')),
      ligneChamp('Alimenté par', qui)])
    + `<p class="fi-note">Le disjoncteur additionne la consommation de tout ce qu’il alimente, démarrages ensemble, et en déduit son calibre.</p>`;
  const resume = ecrit ? [v('perm', 'i') ? v('perm', 'i') + ' A' : '', v('dem', 'i') ? 'démarrage ' + v('dem', 'i') + ' A' : ''].filter(Boolean).join(' · ') : '<span class="fi-a-ecrire">à écrire</span>';
  return { cle: 'conso', titre: 'Consommation', resume, contenu }; }
/* LE CONNECTEUR montré : sa RÉFÉRENCE d'abord (un champ ; plus de « part number » ni de « norme » à compléter) ; quand
   la norme est connue, l'ARRANGEMENT que VOLTA retient (en puce, son « ? » ; « Changer » ouvre la liste : « Automatique »
   en tête, les autres arrangements qui logent ces bornes, la bible au pied) ; puis, d'office, sa FACE (le lecteur :
   « avoir du visuel : ce qui est pris, ce qui n'est pas pris ») — les contacts pris à la couleur de leur câble, les
   libres en blanc — et, dessous, ce que dit la norme en une ligne (la norme, combien de contacts et de quelle taille,
   combien de pris et de libres, la bible) ; un clic sur la puce la replie. Puis ses contacts (le sexe à droite). Quand
   aucun arrangement ne loge ses bornes : la borne fautive nommée, la gauge qui s'y loge proposée, et le tableau sans
   colonne de contacts (ils viendront avec l'arrangement). */
/* LA LISTE DES ARRANGEMENTS d'un connecteur, sous « Changer » : « Automatique » en tête, ceux qui logent ces bornes (du
   mieux taillé au moins bien), puis TOUS les autres de la norme, chacun « loge 5 / 6 » et sa raison — une borne sans
   contact, une gauge trop grosse ou trop fine pour la taille du contact (v73, l'ingénieur : « je ne peux pas voir les 30
   arrangements EN 4165-002, ni forcer celui que je sais monter avec un autre contact »). Calculée à l'ouverture. */
/* Les AUTRES arrangements de la norme (ceux qui ne logent pas toutes ces bornes) : chacun « loge 5 / 6 » et sa raison —
   une borne sans contact, une gauge trop grosse ou trop fine pour la taille du contact ; du plus proche au plus loin. */
// (`sansTitre` : la prise de coupure le met dans un pli qui dit déjà combien — v74)
function autresArrangements(cle, points, fam, vs, retenu, sansTitre) { const N = app.norme, NM = normeDesModules(N), n = points.length;
  const trop = (m, c, f) => { const T = tailleDe(NM, m.famille, c.taille); return T && f.jauge != null && T.jaugeMax != null && f.jauge < T.jaugeMax ? 'trop gros' : T && f.jauge != null && T.jaugeMin != null && f.jauge > T.jaugeMin ? 'trop fin' : 'refusé'; };
  const autres = NM.modules.filter(m => m.emploi === 'connecteur' && (!fam || m.famille === fam) && !vs.includes(m)).map(m => { const r = poserPoints(NM, m, points), ok = r.pl.filter(x => x.ok).length;
    const dit = [r.manque.length ? `pas de contact ${r.manque.slice(0, 4).map(p => p.num).join(', ')}${r.manque.length > 4 ? '…' : ''}` : '',
      ...r.refus.slice(0, 2).map(({ p, c, ko }) => `${p.borne} : ${ko.map(f => f.type || f.cable || '?').join(', ')} ${trop(m, c, ko[0])} pour un #${c.taille}`)].filter(Boolean);
    const usage = m.auto ? '' : `usage « ${m.usage || 'spécial'} » : jamais retenu d’office`;
    return { m, n: ok, etat: ok === n && !dit.length ? 'att' : 'ko', loge: `loge ${ok} / ${n}`, raison: [usage, ...dit].filter(Boolean).join(' ; ') || 'loge tout', retenu: m.reference === retenu }; })
    .sort((a, c) => c.n - a.n || a.m.contacts.length - c.m.contacts.length);
  const nomF = fam ? nomDeFamille(N, fam) || fam : 'des normes de connecteurs';
  return { n: autres.length, html: sansTitre ? (autres.length ? `<div class="cand-ls">${autres.map(x => ligneCandidat(cle, x)).join('')}</div>` : '') : autresCandidats(cle, `Les ${autres.length} autres arrangements ${nomF}, du plus proche au plus loin`, autres) }; }
// (v85) `enPlace` : les possibles de l'arrangement en Manuel, dans Modifier — d'office, sans « Automatique » (le sélecteur
// de la ligne le porte), celui de VOLTA marqué parmi les autres
function listeArrangements(cle, k, Q, M, autoRef, enPlace) { if (!enPlace && FI.liste !== 'arr|' + cle) return '';
  const N = app.norme, fam = Q.famille || (M ? M.module.famille : ''), n = k.points.length, retenu = Q.main && M ? M.reference : '';
  const vs = arrangementsQuiLogent(k.points, N, fam), A = autresArrangements(cle, k.points, fam, vs, retenu);
  const auto = `<button type="button" class="cand cand-auto" data-auto="${escA('arr:' + cle)}" aria-pressed="${!Q.main}" data-bulle="Le choix de VOLTA : celui que la référence nomme, sinon le plus petit qui loge ces bornes"><i class="cand-etoile">${ico('etoile')}</i><b>Automatique</b><span>${esc(autoRef || 'aucun ne loge ces bornes')}</span></button>`;
  const cands = enPlace ? vs.map(m => candidat(cle, m, retenu).replace('class="cand"', `class="cand${m.reference === autoRef ? ' de-volta' : ''}"`)).join('') : auto + vs.filter(m => m.reference !== autoRef || Q.main).map(m => candidat(cle, m, retenu)).join('');
  const corps = (enPlace ? '' : voletT('Arrangement')) + `<div class="fi-cands">${cands}</div>`
    + (vs.length ? '' : `<p class="fi-note">Aucun arrangement ${esc(nomDeFamille(N, fam) || fam || '')} ne loge ces ${pluriel(n, 'borne')}.</p>`) + A.html;
  const pied = M ? `<button type="button" class="fi-lien" data-bible="${escA(M.reference)}">${ico('livre')}voir dans la bible</button>` : '';
  if (enPlace) return `<div class="fi-choix fi-choix-place" role="group" aria-label="Les arrangements de la norme"><div class="fi-choix-corps">${corps}</div>${pied ? `<div class="fi-choix-pied">${pied}</div>` : ''}</div>`;
  return listeChoix('arr|' + cle, corps, { titre: 'Les arrangements de la norme', filtre: vs.length + A.n > 8 ? 'Filtrer les arrangements' : '', pied }); }

function corpsConnecteur(nom, c, k, b, vt, enParts) { const cle = nom + '|' + c.nom, Q = k && k.plan, M = Q && Q.modules[0];
  let arr = '', face = '', fautifs = [];
  if (M) { const autoRef = Q.main ? remplirContacts(k.points, app.norme, { pn: c.pn, sexe: sexeChoisi(cle) }).reference : M.reference, par = new Map(Q.fils.map(x => [x.contact.lettre, x]));
    const pourquoi = Q.main ? 'Choisi ici' : Q.nomme ? 'La référence le nomme' : `Le plus petit qui a ces ${pluriel(Q.potentiels, 'contact')} et accepte ${typesDe(Q.fils.map(x => x.f)) || 'ces câbles'}`, montree = FI.face[cle] !== false && FI.liste !== 'recit|' + cle;   // (la carte de la référence ouverte montre déjà le schéma)
    const liste = listeArrangements(cle, k, Q, M, autoRef), force = Q.main && Q.verdicts.some(v => v.niveau === 'ko');
    arr = ligneChamp('Arrangement', `<button type="button" class="fi-norme-puce${Q.main ? ' main' : ''}${force ? ' ko' : ''}" data-face="${escA(cle)}" aria-pressed="${montree}" data-bulle="${escA(pourquoi + (force ? ' : il ne loge pas tout (les problèmes le disent)' : '') + (montree ? ' — un clic replie la face' : ' — un clic montre la face'))}">${esc(M.reference)}${ico('voir')}</button>${aide('arrangement', { plan: Q })}`,
      { changer: boutonChanger('arr|' + cle, 'Choisir un autre arrangement — toute la norme'), liste });
    if (montree) { const n = M.module.contacts.length, pris = Q.utilises || Q.fils.length, tailles = [...new Set(M.module.contacts.map(x => x.taille))].map(t => '#' + t).join(' + '), fam = nomDeFamille(app.norme, Q.famille) || Q.famille || '';
      face = `<div class="fi-faces">${faceAjustee(faceModuleSvg(M.module, ct => { const x = par.get(ct.lettre); return x ? occupant(x.f, x.jaugeOk === false, ct.lettre) : null; }), 'Face côté contacts · ' + M.module.variante)}</div>`
        + `<p class="fi-norme-ligne"><span class="fi-norme-nom">${esc(fam)}</span><span>${esc(plurielLie(n, 'contact') + (tailles ? ' ' + tailles : ''))}</span><button type="button" class="fi-lien" data-bible="${escA(M.reference)}">${ico('livre')}la bible</button></p>`; } }
  // aucun arrangement ne loge : la borne fautive nommée, ce qui cloche, la gauge qui s'y loge (un geste) ; la phrase du moteur dans la bulle
  else if (Q) { fautifs = coupablesDu(Q, k.points); const fam = nomDeFamille(app.norme, Q.famille) || Q.famille || 'la norme', phrase = Q.verdicts.filter(v => v.niveau === 'ko').map(v => v.texte).join(' ; ') || 'aucun arrangement ne convient';
    const dit = fautifs.length ? fautifs.map(x => `<span class="fi-fautif"><b class="id">${esc(x.borne)}</b> : ${ident(x.f.type || '?')}${x.f.vers ? ' vers ' + esc(x.f.vers) : ''}, ${esc(x.mot)}${x.contact ? ` pour le contact ${esc(x.contact.lettre)} du ${esc(x.module.variante)}, le plus proche` : ''}${x.propose ? '' : ' — aucune gauge de sa famille ne s’y loge en portant son courant'}</span>`).join('') : '';
    arr = ligneChamp('Arrangement', `<b class="fi-ko-t" data-bulle="${escA(majuscule(phrase))}">${fautifs.length ? 'Aucun ne loge ' + esc([...new Set(fautifs.map(x => x.borne))].join(', ')) : 'Aucun ne loge ces bornes'}</b>${aide('arrangement', { plan: Q, fautifs, famille: fam })}`,
      // « Changer » ne disparaît jamais (v73, l'ingénieur : « 300XC1 B n'a plus de bouton Changer ») : toute la norme, pour forcer
      { changer: boutonChanger('arr|' + cle, 'Choisir un arrangement quand même — toute la norme'), liste: listeArrangements(cle, k, Q, null, ''),
        sous: (dit ? `<span class="fi-fautifs">${dit}</span>` + fautifs.map(boutonReparer).join('') : '') + (Q.main ? '<button type="button" class="fi-lien" data-auto="' + escA('arr:' + cle) + '">revenir au choix de VOLTA</button>' : '') }); }
  // hors des normes chargées : on ne dit rien de ce qu'on ne sait pas — la référence seule
  // les contacts : une ligne par câble posé, borne par borne
  const sertirs = new Map(Q ? Q.fils.map(x => [x.f.l, x]) : []), fautes = new Map(fautifs.map(x => [x.f.l, x.mot]));
  const xs = c.bornes.slice().sort(triNaturel).flatMap(bo => (b.parBorne.get(bo) || []).map(f => { const x = sertirs.get(f.l), st = x ? sertirAuBout(nom, bo, x) : null;
    return { ct: `<b>${esc(bo)}</b>${vt.get(String(bo)) ? `<i class="fi-tag" data-bulle="Barrette ajoutée par VOLTA sur cette borne (repère provisoire)">${esc(vt.get(String(bo)))}</i>` : ''}`, f, sertir: st, rep: nom, borne: bo, plan: x ? { Q, sertir: x.sertir, taille: x.taille, sexe: x.sexe } : null, ko: x && x.jaugeOk === false ? 'gauge refusée par le contact' : '', coupable: fautes.get(f.l) || '',
      lettre: x && x.contact ? x.contact.lettre : '', variante: M ? M.module.variante : '' }; }));
  // (v81, le lecteur : « il y a toujours rien dans le contact à sertir, je comprends rien ») : tant que la norme n'est pas
  // connue, ou que rien ne loge, pas de colonne de tirets — une phrase qui dit pourquoi, et quand ils viendront
  const sansContacts = !Q || !M;
  const pourquoiSans = !Q ? `VOLTA ne connaît pas encore la norme de ${c.pn ? '<span class="id">' + esc(c.pn) + '</span>' : 'ce connecteur'} : ses contacts à sertir se choisiront dès qu’elle sera précisée (Normes).` : 'Les contacts à sertir viendront avec l’arrangement.';
  const contacts = xs.length ? (sansContacts ? `<p class="fi-note ct-note">${pourquoiSans}</p>` : '') + tableContacts(xs, { sans: sansContacts, trace: !!c.pn }) + (!sansContacts && xs.some(x => x.sertir) ? legendeConfiance() : '') : '';
  // LA RÉFÉRENCE et, à côté, « Pourquoi cette norme » (v74, lot F) : le récit, sous la ligne (`recitReference`)
  // (v77) sous elle, d'où elle vient en trois mots ; « D'où elle vient » ouvre sa carte d'identité et son schéma
  const famRef = Q && Q.famille ? Q.famille : c.pn ? familleDeReference(app.norme, c.pn, 'connecteur') : '';
  const kr = 'recit|' + cle, ref = ligneChamp('Référence', referenceConnecteur(nom, c.nom, c.bornes, c.pn), { changer: c.pn ? boutonChanger(kr, 'D’où vient cette référence, de quelle base, et son schéma', 'D’où elle vient') : '',
    sous: origineCourte(nom, c.bornes, c.pn, famRef, M), liste: c.pn ? recitReference({ cle: kr, nom, bornes: c.bornes, c, Q, M, xs, trace: true }) : '' });
  // le sexe des contacts se choisit dès que la norme a sa table de contacts (même quand aucun arrangement ne loge)
  const table = Q && (M ? Q.tableContacts : (normeDesModules(app.norme).contacts || []).some(x => x.famille === Q.famille));
  // ce que la base SEE dit de cette référence (08 nonies) : sa désignation, fiche ou embase, ce qui s'y accouple ; absente, obsolète, hors programme
  const see = typeof ligneSEEHtml === 'function' ? ligneSEEHtml(c.pn) : '';
  const tete = champs([ref, arr]) + see + face, ctH = groupeSection('Contacts', contacts, { droite: table ? pucesSexe(cle, Q.sexe) : '', compte: xs.length || null }) + traceConnecteur(c, Q, M, xs);
  return enParts ? { tete, contacts: ctH, n: xs.length } : tete + ctH; }
/* D'OÙ VIENT CHAQUE PIÈCE (le lecteur, v74 : « j'ai peur qu'il mélange tout — qu'il prenne la norme connecteur pour la norme
   contact » ; « quelqu'un qui est perdu doit tout retrouver ») : la chaîne, maillon par maillon, et la TABLE d'où sort
   chacun — la référence donne la famille (table des connecteurs), la famille et la référence l'arrangement (table des
   faces), chaque cavité sa taille, chaque câble sa gauge (table des câbles), et la taille, le sexe et la gauge le contact
   (table des contacts — une règle SEE dit sa version et son numéro). Chaque maillon vient de sa table, et d'elle seule.
   Quand un maillon manque, la chaîne s'arrête là, et le dit : c'est pourquoi des contacts restent vides. */
const sourceDeLigne = (x, table) => { if (!x) return ''; const n = String(x.note || ''), s = String(x.source || x.origine || ''), r = /règle\s+\S+(?:\s+v\d+)?(?:\s+n°\s*\d+)?/.exec(n);
  if (s === 'SEE' || /^SEE\b/.test(n)) return 'base SEE' + (r ? ' · ' + r[0] : '');
  // (une source longue se lit en entier dans la Bible : ici, son nom, sans adresse)
  const court = s.replace(/\s*\(?https?:\/\/\S+\)?/g, '').replace(/\s+/g, ' ').trim(), coupe = court.length > 80 ? court.slice(0, 78).replace(/\s+\S*$/, '') + '…' : court;
  return table + (coupe ? ' · ' + coupe : '') + (x.statut ? ' · ' + x.statut : ''); };
// (v74, lot F : la chaîne se partage — « D'où vient chaque pièce » sous les contacts, et le récit de la référence, `recitReference`)
function chaineConnecteur(c, Q, M, xs) { const N = app.norme, fam = Q && Q.famille ? Q.famille : familleDeReference(N, c.pn, 'connecteur'), nomF = fam ? nomDeFamille(N, fam) || fam : '';
  const maillon = (k, v, d) => `<li><span class="fi-tr-k">${esc(k)}</span><span class="fi-tr-v">${v}</span><span class="fi-tr-d">${esc(d)}</span></li>`;
  const lignes = [maillon('Référence', c.pn ? ident(c.pn) : '<em>aucune</em>', c.pn ? 'colonne du fichier d’installation' : 'à écrire dans le fichier ou ici')];
  if (!c.pn) return { lignes, parFil: '', fam, nomF };
  if (!fam) lignes.push(maillon('Famille', '<b class="fi-ko-t">inconnue</b>', 'aucune famille de connecteur ne commence comme cette référence — ni dans les tables de VOLTA, ni dans la base SEE gardée : la chaîne s’arrête ici, d’où les contacts vides'));
  else { lignes.push(maillon('Famille', esc(nomF), 'le début de la référence est celui de la famille ' + fam + ' (table des connecteurs)'));
    if (M) lignes.push(maillon('Arrangement', esc(M.reference), (Q.main ? 'choisi à la main' : Q.nomme ? 'la référence le nomme' : 'le plus petit qui loge tous les câbles') + ' (table des faces' + (M.module.statut ? ' · ' + M.module.statut : '') + ')'));
    else lignes.push(maillon('Arrangement', '<b class="fi-ko-t">aucun</b>', 'aucun arrangement de la famille ne loge ces câbles : pas de cavité, donc pas de contact')); }
  const parFil = M ? (xs || []).filter(x => x.f && x.f.l).map(x => { const p = x.plan, t = p && p.taille, cb = cableDuType(N, x.f.type), j = jaugeDuType(x.f.type), st = x.sertir;
    return `<li class="fi-tr-fil"><b class="id">${esc(x.borne)}</b><span>${t ? 'cavité taille ' + esc(t) : 'cavité ?'}</span><span>${ident(x.f.type || '?')}${j ? ' · ' + esc(j) + ' AWG' : ''}${cb ? '' : ' <em>(câble absent de la table)</em>'}</span>`
      + `<span>${st && st.reference ? ident(st.reference) : '<b class="fi-ko-t">aucun contact</b>'}</span><small>${esc(st && st.main ? 'choisi à la main' : st ? sourceDeLigne(st, 'table des contacts') : 'la table des contacts n’a pas de ligne pour cette taille, ce sexe et cette gauge')}</small></li>`; }).join('') : '';
  return { lignes, parFil, fam, nomF }; }
function traceConnecteur(c, Q, M, xs) { if (!c.pn) return ''; const { lignes, parFil } = chaineConnecteur(c, Q, M, xs);
  return `<details class="fi-trace"><summary>D’où vient chaque pièce</summary><ol class="fi-tr">${lignes.join('')}</ol>`
    + (parFil ? `<p class="fi-tr-t">Puis, câble par câble : la taille de la cavité (table des faces), la gauge du câble (table des câbles), et le contact qui va avec ce sexe, cette taille et cette gauge (table des contacts).</p><ul class="fi-tr-fils">${parFil}</ul>` : '')
    + `<p class="fi-note">Chaque maillon vient de sa table, et d’elle seule : une règle de contact n’a pas les colonnes d’un connecteur, VOLTA ne peut pas prendre l’une pour l’autre.</p></details>`; }

/* ---- LE RÉCIT DE LA RÉFÉRENCE (v74, lot F — le lecteur : « un clic dessus doit ouvrir une fenêtre : la norme, pourquoi
   cette norme, où on l'a trouvée par rapport aux autres — quelqu'un de perdu doit tout retrouver ») ---------------------
   À côté de la référence d'un connecteur (et sous celle d'une prise), « Pourquoi cette norme » ouvre, sous la ligne, le
   récit en cinq pas : 1. la référence, d'où elle vient (la colonne du fichier d'installation, ou écrite ici) ; 2. la norme
   que VOLTA en tire, et comment (le début de la référence contre le nom de chaque famille qu'il connaît) ; 3. où il l'a
   trouvée (ses tables ; la base SEE gardée sur ce PC, si elle la connaît) ; 4. les familles VOISINES ÉCARTÉES, les plus
   proches d'abord, chacune avec sa raison ; 5. ce que la norme donne ensuite (la chaîne de `traceConnecteur`). Une
   référence qu'aucune famille ne nomme le dit, et dit quoi faire.
   o : { cle (la clé du volet : « recit|… »), nom (le repère), bornes (celles du connecteur, « * » : toutes), c ({ pn }), Q,
   M, xs (les lignes de contacts, pour la chaîne), prise } */
const avantQueDeux = t => { const s = sansLiens(t); const m = /^[^:;—(]{3,70}/.exec(s); return m ? m[0].trim().replace(/[,.]$/, '') : s.slice(0, 60); };
function famillesVoisines(pn, retenue) { const N = app.norme, r = cleNorme(pn), mods = new Set(famillesDeModules(N, 'connecteur')), m = new Map();
  mods.forEach(f => m.set(f, { f, nom: nomDeFamille(N, f) || f, nature: 'connecteur', note: '', modules: true }));
  (normeDesModules(N).familles || []).filter(x => !x.exemple).forEach(x => { const f = cleNorme(x.famille); if (!f) return; const y = m.get(f) || { f, modules: mods.has(f) }; m.set(f, { ...y, nom: x.norme || f, nature: x.nature || 'jonction', note: x.note || '' }); });
  const commun = f => { let k = 0; while (k < f.length && k < r.length && f[k] === r[k]) k++; return k; };
  return [...m.values()].filter(x => x.f !== retenue).map(x => ({ ...x, k: commun(x.f) }))
    .sort((a, b) => b.k - a.k || (b.nature === 'connecteur') - (a.nature === 'connecteur') || b.modules - a.modules || triNaturel(a.nom, b.nom)); }
function origineDeLaReference(nom, bornes) { const xs = nom ? liaisonsDuConnecteur(nom, bornes) : [], cols = [...new Set(xs.map(([, ch]) => ch === 'pnDe' ? 'PN1' : 'PN2'))].sort();
  const ecrite = xs.find(([l, ch]) => l.avant && ch in l.avant && l.avant[ch] !== l[ch]);
  return ecrite ? `écrite ici — le fichier d’installation portait ${avantDe(ecrite[0], ecrite[1])}` : xs.length ? `lue dans le fichier d’installation : colonne ${cols.join(' et ')}, sur ${pluriel(xs.length, 'liaison')}` : 'lue dans le fichier d’installation'; }
/* (v77, le lecteur : « pourquoi c'est cette norme… pas évident… plus simple » ; « que je comprenne d'où elle vient, de
   quelle base de données, que je clique dessus, je vois son schéma ») : plus de récit en cinq pas — une carte d'identité.
   D'où elle vient (votre fichier, ou écrite ici), sa norme et LA BASE qui la donne (les tables de VOLTA, ou la base SEE
   gardée), pourquoi en une phrase (le début de la référence), ce que la base SEE en dit, et SON SCHÉMA (la face de
   l'arrangement, les câbles posés dessus). Les familles voisines ne se disent que quand aucune ne la nomme. */
function recitReference(o) { if (FI.liste !== o.cle) return '';   // (calculé à l'ouverture seulement)
  const N = app.norme, pn = (o.c && o.c.pn) || '', r = cleNorme(pn), Q = o.Q || null, M = o.M || null;
  const fam = Q && Q.famille && (!r || r.startsWith(Q.famille)) ? Q.famille : familleDeReference(N, pn, 'connecteur'), F = fam ? (normeDesModules(N).familles || []).find(x => cleNorme(x.famille) === fam && !x.exemple) : null, nomF = fam ? nomDeFamille(N, fam) || fam : '';
  const deSEE = !!(M && String(M.module.source || '') === 'SEE');
  let see = ''; try { if (typeof BASE_SEE !== 'undefined' && BASE_SEE.base && pn) { const e = typeof equipementSEE === 'function' ? equipementSEE(pn) : null;
      see = e ? `la connaît${e.d || e.ty ? ' : « ' + (e.d || e.ty) + ' »' : ''}${e.std && e.std !== e.p ? ' (standard ' + e.std + ')' : ''}` : 'ne la connaît pas'; }
    else see = 'aucune n’est gardée sur ce PC'; } catch (_) { see = ''; }
  const ligne = (k, v) => `<dt>${esc(k)}</dt><dd>${v}</dd>`;
  const pourquoi = fam ? esc(`Elle commence par « ${fam} », comme toutes les références de l’${nomF}.`) + (F && F.note ? `<small>${insecable(esc(majuscule(sansLiens(F.note))))}.</small>` : '')
    : esc(`Aucune norme que VOLTA connaît ne commence comme « ${pn || '?'} » : il ne sait pas quel arrangement ni quels contacts lire.`);
  const vs = fam ? [] : famillesVoisines(pn, '').filter(x => x.k > 0).slice(0, 3);
  const proches = vs.length ? `<small>Les plus proches : ${vs.map(x => `<b class="id">${esc(x.nom)}</b>${x.nature !== 'connecteur' ? esc(' (une barrette, pas un connecteur)') : !x.modules ? esc(' (VOLTA n’a pas ses arrangements)') : ''}`).join(', ')}.</small>` : '';
  const dl = `<dl class="rf-dl">${ligne('Vient de', pn ? esc(majuscule(origineDeLaReference(o.nom, o.bornes || '*'))) : esc('Ni le fichier d’installation ni la fiche ne la donnent : à écrire.'))}`
    + ligne('Sa base', fam ? `<b>${deSEE ? 'La base SEE' : 'Les tables de VOLTA'}</b>${esc(deSEE ? ' gardée sur ce PC' : ' (les normes embarquées)')} : ${esc('norme ' + nomF)}` : '<b class="fi-ko-t">aucune</b>' + esc(' : ni les tables de VOLTA ni la base SEE ne la reconnaissent'))
    + ligne('Pourquoi', pourquoi + proches) + (see ? ligne('Base SEE', esc(majuscule(see))) : '') + '</dl>';
  // SON SCHÉMA : la face de l'arrangement retenu, les câbles posés dessus
  let schema = '';
  if (M) { const par = new Map(((Q && Q.fils) || []).filter(x => x.contact).map(x => [x.contact.lettre, x]));
    try { schema = `<div class="rf-schema">${faceAjustee(faceModuleSvg(M.module, ct => { const x = par.get(ct.lettre); return x ? occupant(x.f, x.jaugeOk === false, ct.lettre) : null; }), 'Son schéma · arrangement ' + (M.module.variante || M.reference) + ' · face côté contacts')}</div>`; } catch (_) { schema = ''; } }
  else if (fam) schema = `<p class="fi-note rf-sans">${esc('Aucun arrangement de l’' + nomF + ' ne loge ces câbles : pas de schéma (« Changer », sous Arrangement, les montre tous).')}</p>`;
  const faire = fam ? '' : `<p class="rf-faire">${esc('Vérifier la référence dans le fichier d’installation, ou envoyer la table de sa norme :')} <button type="button" class="fi-lien recit-lien" data-action="normes">${esc('Normes')}${ico('droite')}</button></p>`;
  const pied = M ? `<button type="button" class="fi-lien" data-bible="${escA(M.reference)}">${ico('livre')}voir dans la bible</button>` : '';
  return listeChoix(o.cle, `<div class="rf-carte">${dl}${schema}${faire}</div>`, { titre: 'D’où vient cette référence', cls: 'recit-recit', pied }); }
/* Sous la référence, toujours : d'où elle vient, en trois mots (votre fichier · sa norme et sa base · la base SEE). */
function origineCourte(nom, bornes, pn, fam, M) { if (!pn) return '';
  const xs = nom ? liaisonsDuConnecteur(nom, bornes) : [], ecrite = xs.some(([l, ch]) => l.avant && ch in l.avant && l.avant[ch] !== l[ch]);
  const nomF = fam ? nomDeFamille(app.norme, fam) || fam : '', deSEE = !!(M && String(M.module.source || '') === 'SEE');
  let see = ''; try { if (typeof BASE_SEE !== 'undefined' && BASE_SEE.base) see = typeof equipementSEE === 'function' && equipementSEE(pn) ? 'connue de la base SEE' : 'inconnue de la base SEE'; } catch (_) { }
  const m = [ecrite ? 'écrite ici' : 'de votre fichier', fam ? `norme ${nomF} · ${deSEE ? 'base SEE' : 'tables de VOLTA'}` : 'norme à préciser', see].filter(Boolean);
  return `<span class="rf-orig${fam ? '' : ' att'}">${m.map(x => `<span>${esc(x)}</span>`).join('')}</span>`; }
// les bornes qui ne sont sur aucun connecteur (CNT, GND…) : elles se raccordent au corps
function corpsSansConnecteur(nom, sans, b, vt) { const xs = sans.flatMap(bo => (b.parBorne.get(bo) || []).map(f => ({ ct: `<b>${esc(bo)}</b>`, f, sertir: null, rep: nom, borne: bo, plan: null })));
  // la référence de l'équipement (celle de ses liaisons), et ce que la base SEE en dit (08 nonies)
  const pn = (liaisonsDuConnecteur(nom, sans).map(([l, ch]) => l[ch]).find(Boolean)) || '', see = pn && typeof ligneSEEHtml === 'function' ? ligneSEEHtml(pn) : '';
  return `<p class="fi-note">Des bornes au corps : ni connecteur ni contact.</p>` + see + groupeSection('Contacts', tableContacts(xs, { sans: true }), { compte: xs.length }); }

/* ---- UN DISJONCTEUR ------------------------------------------------------------------------------------------------- */
/* Calibre (le calibre retenu en grand et son verdict, le meilleur, la courbe, le profil : `sectionDisjoncteur`, 08
   quinquies) · Câbles (l'intensité au pire contre ce qu'ils admettent, la chute en ligne jusqu'au bout de leur chemin)
   · Déjà fait. Un disjoncteur de tableau a des bornes à vis : ni contacts ni raccord, pas de section Connecteur. */
/* (v78, le lecteur : « touche la courbe, consomme 6 % du temps de déclenchement : on ne comprend rien ; explique
   simplement — à tel moment, il touche, donc il disjoncte ») : un calibre en une phrase d'électricien — il disjoncte ou
   non, et le moment qui le décide (le permanent, le démarrage), sur sa courbe à 125 °C. */
/* (v79, le lecteur : « environ 10 % de marge : 10 % de marge de quoi ? ça veut dire quoi, il disjoncterait ? on comprend
   pas ») : un calibre se juge en AMPÈRES, comme on le pense — ce qu'il tire, à quel moment, et ce que ce calibre tient
   pendant ce temps (sur sa courbe à 125 °C, le cas le plus chaud) ; la réserve entre les deux ; VOLTA en exige 10 % (une
   tension basse, un moteur qui force). */
/* UN CALIBRE EN CLAIR (v80, le lecteur : « valide, pas valide, point — pas de réserve ») : ce qu'il tire, pendant combien de
   temps, et le seuil où ce calibre disjoncte sur cette durée ; rien d'autre. */
/* (v86) la même phrase que la conclusion (08-disjoncteurs, `motsDuCalibre` : le point qui décide de la ligne de la gamme,
   `g.pire` — le moteur ne rejuge plus tout le profil pour une bulle), en une ligne : « 10 A : ne disjoncte pas — au
   démarrage, il tire 9,31 A pendant 2,1 min ; ce calibre ne disjoncte qu’au-delà de 9,66 A sur cette durée. » */
function calibreEnClair(d, cal) { const A = amperes(cal), m = typeof motsDuCalibre === 'function' ? motsDuCalibre(d, cal) : null;
  if (!m) return `${A} : pas jugé — le profil de charge manque.`;
  return `${A} : ${m.cle === 'passe' ? 'ne disjoncte pas' : 'disjoncte'}${m.detail ? ' — ' + m.detail.charAt(0).toLowerCase() + m.detail.slice(1) : '.'}`; }
function ficheDisjoncteur(nom, probs) { const d = disjonctionDe(nom), o = origineDuCalibre(nom, d), H = app.simu || HYPOTHESES;
  const rows = lignesFilsDisjoncteur(nom, d), nL = rows.filter(r => r.l && !(r.l.longueur > 0)).length;
  // (v74 : ce qui est supposé, dit une fois et en clair — `noteSupposes` ; plus d'italique)
  const sections = [sectionDisjoncteur(nom, d, o, probs), sectionFils(rows, probs, { cls: 'dj-fils', note: noteSupposes(0, nL, rows.length, H) }), sectionDejaFait(nom)];
  const pn = pnDuRepere(nom), id = identite([majuscule(natureDe(nom)), descriptionDuRetest(nom) ? esc(descriptionDuRetest(nom)) : '', pn ? ident(pn) : '', esc(motFolios(foliosDuRepere(nom)))]);
  // la carte de décision, quand l'outil retient un autre calibre que le retest ; elle porte le point du calibre (la barre, les autres)
  const decision = carteDecision(nom, d, Math.max(0, probs.length - 1));
  // (v78) la carte de décision ouvre l'onglet Calibre ; le bandeau dit son titre et porte son geste
  if (decision && sections[0] && sections[0].contenu != null) sections[0] = { ...sections[0], contenu: decision + sections[0].contenu };
  const v = verdictDuRetenu(d), ch = chargeDuProfil(d), propose = propositionNonEcrite(d), cal = d.calibre, fam = (d.famille && (d.famille.famille || d.famille.nom)) || '';
  const quand = majuscule(String(quandDuPoint(ch.pointeP) || 'en pointe').replace(/^(au|en) /, ''));
  // (v78, le lecteur : « calibre au-dessus, 15 A dessous ; permanent ; démarrage — pendant 2,1 min, on s'en fout ») : trois chiffres nets
  const chiffres = [{ k: 'Calibre', v: cal ? valeurU(nombreCourt(cal), 'A') : '—', etat: v.etat === 'ko' ? 'ko' : '', onglet: 'calibre' },
    ch.perm ? { k: 'Permanent', v: valeurU(nombreCourt(ch.perm), 'A'), onglet: 'calibre' } : null,
    ch.pointe ? { k: quand, v: valeurU(nombreCourt(ch.pointe), 'A'), onglet: 'calibre' } : null,
    chiffreCables(sections[1])];
  const dec = typeof decisionEnMots === 'function' ? decisionEnMots(nom, d) : null;
  const geste = dec ? `<button type="button" class="btn cuivre dense" data-nv-decider="${escA(nom)}" data-bulle="${escA('Écrit dans l’Excel corrigé : ' + amperes(cal) + ', et les câbles qu’il demande — une seule entrée d’historique, « Défaire » la reprend')}">${esc('Passer en ' + amperes(cal))}</button>` : '';
  /* (v78) L'ESSENTIEL — ce qu'il tire contre ses calibres, comment VOLTA a choisi, ce qu'il alimente ; LE CALIBRE — les
     calibres de vos Hypothèses en frise (v86 : le survol explique, seule la proposition de VOLTA écrit), le profil qui s'écrit
     et sa courbe, ensemble */
  const sD = sections[0] || {}, P = sD.parts || {}, sF = sections[1], gamme = (d.gamme || []).filter(g => g.calibre > 0);
  const ec = phaseEcrite(chargeEcrite(nom)), conso = consommateursDe(nom).filter(r => phaseEcrite(chargeEcrite(r))), dur = ch.pointeP && ch.pointeP.t !== Infinity ? secondes(ch.pointeP.t) : '';
  const nonP = gamme.filter(g => cleDuVerdict(g) !== 'passe').map(g => nombre(g.calibre)), oui = gamme.filter(g => cleDuVerdict(g) === 'passe').map(g => nombre(g.calibre));
  const pire = rows.filter(r => r.charge.r != null && isFinite(r.charge.r)).sort((x, y) => y.charge.r - x.charge.r)[0];
  const M = margesDuMeilleur(app.simu || HYPOTHESES), phraseDe = c => calibreEnClair(d, c);
  const calcul = gamme.length ? `<p>Pour chaque calibre, VOLTA compare ce qu’il tire à chaque moment (le permanent, ${esc(quand.toLowerCase())}) au seuil de disjonction du calibre pendant ce temps, lu sur sa courbe à 125 °C : sous le seuil, il ne disjoncte pas ; au-dessus, il disjoncte. Le plus petit qui ne disjoncte jamais est retenu.</p><ul class="vu-pq-l">${gamme.map(g => { const k = cleDuVerdict(g), ph = phraseDe(g.calibre);
      return `<li class="${k === 'passe' ? 'ok' : 'ko'}${g.calibre === cal ? ' ret' : ''}"><i></i><span>${esc(ph)}</span></li>`; }).join('')}</ul>` : '';
  const etapes = d.sansProfil ? [{ html: 'Aucun profil de charge : ni écrit sur sa fiche, ni déduit de ce qu’il alimente. Sans lui, rien ne se juge.', source: 'calcul', etat: 'att', va: { onglet: 'calibre', vers: '[data-part="profil"]', mot: 'l’écrire' } }] : [
    { html: `Ce qu’il alimente tire <b>${esc(amperes(ch.perm || 0))}</b> en permanence${ch.pointe ? ` et <b>${esc(amperes(ch.pointe))}</b> ${esc(quand.toLowerCase())}${dur ? ' pendant ' + esc(dur) : ''}` : ''}.`,
      source: ec ? 'main' : conso.length ? 'calcul' : 'hypothese', mot: ec ? 'écrit sur sa fiche' : conso.length ? 'somme de ' + conso.join(', ') : 'hypothèse', va: { onglet: 'calibre', vers: '[data-part="profil"]', mot: 'le profil' } },
    gamme.length ? { html: `Sur les courbes ${esc(fam || 'de sa famille')}, ${nonP.length ? `<b>${esc(nonP.join(' · '))} A</b> disjonctent ; ` : ''}${oui.length ? `<b>${esc(oui.join(' · '))} A</b> ne disjonctent pas.` : 'tous disjoncteraient.'}`, source: 'norme', mot: 'courbes ' + (fam || 'de la famille'), va: { onglet: 'calibre', vers: '[data-part="courbe"]', mot: 'la courbe' } } : null,
    o.calRetest && o.calRetest !== cal ? { html: `Votre fichier porte <b class="id">${esc(o.pnRetest || amperes(o.calRetest))}</b>, un ${esc(amperes(o.calRetest))} : il ${esc(motDuVerdict(cleDuVerdict(gamme.find(g => g.calibre === o.calRetest) || {})) || 'ne passe pas')}.`, source: 'fichier', etat: 'ko', va: { onglet: 'calibre', vers: '.vu-cals', mot: 'les calibres' } } : propose ? { html: `Votre fichier porte un <b>${esc(amperes(d.pn))}</b> : il ${esc(motDuVerdict(cleDuVerdict(d.gPn)))}.`, source: 'fichier', etat: 'ko', va: { onglet: 'calibre', vers: '.vu-cals', mot: 'les calibres' } } : null,
    cal ? { html: d.origine === 'main' ? `Retenu à la main : <b>${esc(amperes(cal))}</b>. VOLTA aurait pris ${esc(amperes(d.passe || cal))}.` : `VOLTA retient le plus petit qui ne disjoncte pas : <b>${esc(amperes(cal))}</b>${pn ? ` (<span class="id">${esc(pn)}</span>)` : ''}.`, source: d.origine === 'main' ? 'main' : 'calcul', etat: v.etat === 'ko' ? 'ko' : 'ok', detail: calcul, va: { onglet: 'calibre', vers: '[data-part="courbe"]', mot: 'la courbe' } } : null,
    // (v86 : un chiffre en clair, en ampères — plus de « 239 % de ce qu'ils admettent »)
    pire ? { html: `${rows.length > 1 ? `Le plus chargé de ses ${rows.length} câbles` : 'Son câble'}${pire.type ? ` (<span class="id">${esc(pire.type)}</span>${pire.bout ? ' vers <span class="id">' + esc(pire.bout.rep) + '</span>' : ''})` : ''} tire <b>${esc(amperes(pire.charge.i))}</b> ; il ${pire.charge.r > 1 ? 'n’en admet que' : 'en admet'} <b>${esc(amperes(pire.charge.admis))}</b>.`, source: 'norme', mot: 'EN 2853', etat: pire.charge.r > 1 ? 'ko' : '', va: { onglet: 'essentiel', vers: '.vu-arbre', mot: 'ses câbles' } } : null];
  /* (v86) « Courant appelé et calibres » — la conclusion en grand, le courant qui s'écoule dans ses barres, les calibres en
     ampères, la note du fichier — : 08-disjoncteurs, `courantAppele` */
  /* (v86, l'intégrateur, G8 : « le calibre écrit vient du fichier » — plus d'AUTOMATIQUE | MANUEL, la frise ne se clique plus) :
     « Le calibre » — la frise des calibres de vos Hypothèses, chacun en ampères, qui explique au survol ; le seul geste, la
     proposition justifiée de VOLTA (« Retenir le 7,5 A ») — : 08-disjoncteurs, `blocDuCalibre` */
  const blocCal = blocDuCalibre(nom, d, o, !!decision);
  const onglets = [
    // (v86, l'agent « mots » : le statut tient dans l'onglet le plus étroit, à côté du récapitulatif)
    { cle: 'essentiel', statut: { t: cal ? amperes(cal) + (v.etat === 'ko' ? ' · disjoncte' : ' · valide') : 'sans calibre', etat: v.etat === 'ko' ? 'ko' : cal ? 'ok' : '' },
      contenu: `<section class="vu-bloc vu-bloc-courant"><h4 class="vu-titre">Courant appelé et calibres</h4>${courantAppele(nom, d, o)}</section>${pourquoiVue('Comment VOLTA a choisi le calibre', etapes)}`
        + `<section class="vu-bloc"><h4 class="vu-titre">Ce qu’il alimente <span>${esc(pluriel(rows.length, 'câble'))}</span></h4>${arbreVue(nom, cal, rows)}</section>` },
    { cle: 'calibre', statut: { t: d.sansProfil ? 'profil à écrire' : ch.perm ? 'profil ' + amperes(ch.perm) + (ch.pointe ? ' · ' + amperes(ch.pointe) : '') : '', etat: d.sansProfil ? 'att' : '' },
      contenu: (decision || '') + blocCal + (P.profil || '') + (P.courbe || '') + (P.profil ? '' : sD.contenu || '') },
    sF && { cle: 'cables', statut: statutCables(sF), contenu: sF.contenu, vide: sF.vide },
    sections[2] ? ongletDeLaSection(sections[2]) : null];
  return composerFiche({ type: 'disjoncteur', tete: { nom, champ: 'eq-rep', designation: nom }, meta: [pn ? ident(pn) : ''], probs, onglets, ecrits: ecritsDuRepere(nom), proposes: [], chiffres, geste,
    vignette: friseDeLaCarte(nom, d, o), phrase: dec ? dec.titre + ' — ' + majuscule(dec.suite) : '', taire: decision ? /^(le retest|l’installation) porte un / : null,
    ok: d.sansProfil ? 'Sans profil de charge, rien ne se juge : écrivez-le dans l’onglet Calibre.' : `Le ${cal ? amperes(cal) : 'calibre'} passe, et ses câbles portent leur courant.`, pied: { tableau: nom, menu: MENU_BLOC } }); }

/* ---- UNE BARRETTE (et une barrette à poser) ------------------------------------------------------------------------ */
/* Module (sa référence en puce et son « ? » — un clic ouvre, sous elle, la GALERIE des assemblages de la norme ; l'écart
   avec le retest ; la face, vivante ; les contacts, une broche par câble) · Câbles · Déjà fait. Le lecteur (version 61) :
   « la norme, on s'en fout, elle est dans le module » ; « un potentiel, je ne comprends pas — on le voit sur le dessin » :
   plus de ligne Norme, plus de potentiel. Une barrette à poser se pose depuis la barre sous l'en-tête. */
function ficheBarrette(nom) { const aPoser = VT_A_POSER.test(nom), L = liaisonsDeRepere(nom);
  const { besoins: b, plan: Q, main } = planDeBarrette(nom), M0 = Q.modules[0], N = app.norme;
  const refuses = Q.fils.filter(x => x.jaugeOk === false);
  const probs = [...Q.verdicts.filter(v => v.niveau === 'ko').map(v => ({ niveau: 'ko', texte: v.texte, section: 'connecteur' })), ...refuses.map(x => ({ niveau: 'ko', texte: `${x.f.l && x.f.l.origine === null ? 'câble à créer' : cableDit(x.f)} : gauge refusée par le contact ${x.contact.lettre}`, section: 'connecteur', viser: cleFil(x.f.l) }))];
  const raccord = aPoser ? L.find(l => l.aPoser === nom && l.origine === null && l.vers === nom && estRaccordAPoser(l)) : null, sur = raccord ? raccord.de + ':' + raccord.borneDe : '';
  // (v86, l'audit F13) une barrette ajoutée n'a plus, en plus de son bandeau, un point « À voir » qui redit la même chose
  // sans geste : le bandeau « Lui donner son repère » est son seul appel
  ((typeof CONTROLE !== 'undefined' && CONTROLE.items) || []).filter(x => x.nom === nom && !probs.some(p => p.texte === x.texte) && !/^ajoutée par VOLTA sur/.test(x.texte)).forEach(x => probs.push({ niveau: x.niveau === 'ko' ? 'ko' : 'att', texte: x.texte, section: 'connecteur' }));
  const libres = Q.contacts - Q.utilises, famNom = M0 ? nomDeFamille(N, M0.module.famille) || M0.module.famille : Q.famille ? nomDeFamille(N, Q.famille) || Q.famille : '';
  /* le MODULE : sa référence en puce, qui ouvre la galerie (plusieurs modules : chacun sa référence) ; l'écart avec le
     retest ; le RAIL qui les porte ; la face */
  const par = new Map(); Q.fils.forEach(x => par.set(x.module + '|' + x.contact.lettre, x));
  const faces = Q.modules.map((M, k) => faceAjustee(faceModuleSvg(M.module, ct => { const x = par.get(k + '|' + ct.lettre); return x ? occupant(x.f, x.jaugeOk === false, ct.lettre) : null; }), Q.modules.length > 1 ? (k + 1) + ' · ' + M.reference : '')).join('');
  // (v85) une barrette en modules (« 667VT2 51 » + « A ») : l'écart se lit module par module (`M.ecart`), pas sur la barrette
  const ecartRetest = !aPoser && !Q.lettres && b.pn && Q.reference && cleNorme(b.pn) !== cleNorme(Q.reference) && moduleDeReference(N, b.pn);
  // pourquoi l'outil écarte celui du retest (l'ingénieur v73 : « je ne vois pas pourquoi le 1A101Z du retest est écarté »)
  let pqR = ''; if (ecartRetest) { try { const r = raisonDuModule(b, ecartRetest, potentielsDeBarrette(b).sort((a, c) => c.fils.length - a.fils.length)); pqR = ecartRetest.variante + ' : ' + (r.raison === 'loge tout' ? 'il convient aussi, mais VOLTA prend le plus petit qui loge tous les groupes' : r.raison); } catch (_) { pqR = ''; } }
  const ecart = ecartRetest ? `<span class="fi-ecart">votre fichier donne ${ident(b.pn)} <button type="button" class="fi-lien" data-garder="${escA(b.pn)}">garder celui de votre fichier</button>${pqR ? `<span class="fi-ecart-r">${insecable(esc(pqR))}</span>` : ''}</span>` : '';
  const valeur = Q.reference ? `<span class="fi-norme-puce statique" data-bulle="${escA(main ? 'Choisi ici' : Q.nomme ? 'Celui de votre fichier : il loge tous les groupes' : Q.modules.length > 1 ? `${Q.potentiels} potentiels sur ${Q.modules.length} modules` : `Le plus petit module qui loge ${pluriel(Q.potentiels, 'potentiel')}`)}">${esc(Q.reference)}</span>` : '<b class="fi-ko-t">Aucun module</b>';
  const galerie = aPoser || FI.liste !== 'bar|' + nom ? '' : listeChoix('bar|' + nom, galerieModules(nom, b, Q, main), { titre: 'Les assemblages de la norme qui logent ces potentiels', cls: 'fi-galerie-choix', pied: M0 ? `<button type="button" class="fi-lien" data-bible="${escA(M0.reference)}">voir dans la bible</button>` : '' });
  // le module en puce : un clic ouvre la galerie des assemblages de la norme, sous lui (la norme ne s'écrit plus à part)
  const moduleV = aPoser || !Q.reference ? valeur : `<button type="button" class="fi-norme-puce fi-norme-gal${main || Q.main ? ' main' : ''}${(main || Q.main) && (Q.restants || []).length ? ' ko' : ''}" data-changer="${escA('bar|' + nom)}" aria-expanded="${FI.liste === 'bar|' + nom}" data-bulle="${escA((main ? 'Choisi ici' : Q.nomme ? 'Celui de votre fichier : il loge tous les groupes' : 'Le plus petit module qui loge ces câbles') + ' — un clic montre tous les assemblages de la norme, pour en choisir un autre')}">${esc(Q.reference)}${ico('bas', 'fi-chevron')}</button>`;
  // plusieurs modules (le lecteur : « la référence de chaque module, tout seul ») : une puce numérotée chacun ; « Changer »
  // ouvre la galerie
  const plusieurs = Q.modules.length > 1, refs = plusieurs ? `<span class="fi-modules">${Q.modules.map((M, k) => `<span class="fi-mod"><i>${esc(Q.lettres ? M.numero : String(k + 1))}</i>${ident(M.reference)}</span>`).join('')}</span>` : '';
  // le rail (le lecteur : « la bonne référence du rail, celui qui porte tous les modules ») : la table Accessoires de la norme
  const BP = aPoser ? null : barretteParente(nom), porteRail = !!(BP && BP.porteur === nom), R = BP && BP.rails[0] ? { ...BP.rails[0], sous: (BP.freres.length > 1 ? 'barrette ' + BP.parent + ', ' : '') + BP.rails[0].sous } : null, railH = R ? `<span class="fi-rail" data-bulle="${escA([R.role, R.equivalent ? 'équivalent ' + R.equivalent : '', sansLiens(R.source)].filter(Boolean).join(' — '))}">${ident(R.reference)}</span>${repereConfiance(R.ligne, 'Vos tables')}${aide('rail', { rail: R })}` : '';
  const tete = aPoser && !M0 ? '<p class="fi-note">Le module se choisit quand la barrette est posée au contrat.</p>' : champs([
    ligneChamp(plusieurs ? 'Modules' : 'Module', (plusieurs ? refs : moduleV) + aide('module', { plan: Q }), { changer: plusieurs && !aPoser ? boutonChanger('bar|' + nom, 'Les assemblages de la norme', 'Changer') : '', sous: ecart, liste: galerie, cls: 'fc-norme' }),
    R ? ligneChamp('Rail', railH, { sous: R.sous ? `<span>${esc(R.sous)}</span>` : '' }) : '']);
  /* les CONTACTS : une broche par câble — la lettre du contact du module dans le rond, la borne du retest en petit à côté */
  const borneDe = f => f.borneBarrette || (f.l && (f.l.de === nom ? f.l.borneDe : f.l.borneVers)) || '';
  // dans l'ordre des bornes (l'audit v72 : « A, K, D, G, B, E, N… : ni par lettre ni par borne »), la lettre du contact puis la borne sur une ligne
  // (v85) l'étiquette d'un contact : sur une barrette en modules, sa borne telle que le fichier l'écrit (51A : le module 51,
  // son contact A) ; sinon sa lettre, après le rang du module quand il y en a plusieurs
  const etiquette = (k, c) => Q.lettres ? (Q.modules[k] ? Q.modules[k].numero : '') + c.lettre : (Q.modules.length > 1 ? (k + 1) + '·' : '') + c.lettre;
  const tri = Q.fils.slice().sort((a, c) => a.module - c.module || (Q.lettres ? triContacts(a.contact.lettre, c.contact.lettre) : triBornes(borneDe(a.f), borneDe(c.f)) || triNaturel(a.contact.lettre, c.contact.lettre)));
  // (v74 : chaque ligne ouvre son contact — la clé de sa carte, la lettre du contact, l'arrangement du module)
  const xsC = tri.map(x => ({ lettreCt: etiquette(x.module, x.contact), ct: `<b>${esc(etiquette(x.module, x.contact))}</b>${borneDe(x.f) && !Q.lettres ? `<small>borne ${esc(borneDe(x.f))}</small>` : ''}`, f: x.f, sertir: x.sertir || null, plan: x.sertir ? { Q, sertir: x.sertir, taille: x.taille, sexe: x.sexe } : null, ko: x.jaugeOk === false ? 'gauge refusée par le contact' : '',
    ctCle: x.f && x.f.l ? nom + '|' + cleFil(x.f.l) : '', lettre: x.contact.lettre, variante: Q.modules[x.module] ? Q.modules[x.module].module.variante : '' }));
  (Q.restants || []).forEach(p => p.fils.forEach(f => xsC.push({ ct: `<b>?</b><small>borne ${esc(borneDe(f))}</small>`, f, ko: 'sans place dans le module' })));
  const nf = xsC.filter(x => x.f).length, sansTable = M0 && !Q.fils.some(x => x.sertir);
  const contacts = nf ? tableContacts(xsC, { premiere: 'Contact' }) + (Q.fils.some(x => x.sertir) ? legendeConfiance() : '') + (sansTable ? `<p class="fi-note">La table des contacts de la ${esc(famNom)} manque : <button type="button" class="fi-lien" data-action="normes">l’envoyer</button>.</p>` : '') : '<p class="fi-note">Aucun câble.</p>';
  const fils = filsDuRepere(nom); probs.push(...problemesDesFils(fils));
  /* (v86, l'audit G2 : « Retenir » ici, « Lui donner son repère » dans À régler, « Poser » dans le récapitulatif) UN verbe,
     « Lui donner son repère », et UN repère proposé, le même partout : la suite de la barrette du contrat la plus proche
     (`prochainRepereVT`, celui du récapitulatif et de « À reprendre »). Il s'écrit autrement, si vous le voulez. */
  const propose = aPoser ? (typeof prochainRepereVT === 'function' && sur ? prochainRepereVT({ sous: 'ajoutée par VOLTA sur ' + sur }) : repereLibre(raccord ? raccord.de : '', 'VT')) : '';
  const poser = aPoser ? `<div class="fi-poser"><span class="fi-poser-t">VOLTA propose</span><span class="fi-poser-g">${saisie('id="vt-repere"', propose, { mono: true, label: 'Le repère à lui donner — VOLTA propose ' + propose + ', il s’écrit autrement si vous le voulez', court: true })}`
    + `<button type="button" class="btn cuivre" id="vt-poser" data-bulle="${escA('Elle prend ce repère et entre dans votre installation, avec son câble à créer et ses shunts — « Défaire » la rend provisoire')}">Lui donner son repère</button></span></div>` : '';
  const sections = [{ cle: 'connecteur', titre: 'Module', resume: aPoser && !M0 ? 'se choisit quand la barrette a son vrai repère' : Q.reference ? ident(Q.reference) : '<span class="fi-ko-t">aucun module</span>',
      badge: badgeProblemes(probs, 'connecteur'), contenu: tete + (faces ? `<div class="fi-faces">${faces}</div>` : '') + groupeSection('Contacts', contacts, { compte: nf || null }) },
    sectionFilsDuRepere(fils, probs), aPoser ? null : sectionDejaFait(nom)];
  const id = aPoser ? '' : identite([majuscule(natureDe(nom)), Q.reference ? ident(Q.reference) : '', pluriel(fils.length, 'câble'), esc(motFolios(foliosDuRepere(nom)))]);
  // par rapport au retest : ce qui a été écrit ici, et le module que VOLTA retient à la place de celui du retest
  // (sa colonne : le PN de la barrette, PN1 là où elle est l'appareil 1, PN2 là où elle est l'appareil 2)
  const colsPn = [...new Set(L.map(l => l.de === nom ? 'PN1' : l.vers === nom ? 'PN2' : '').filter(Boolean))].sort().join(' · ');
  // (v85) une barrette en modules : un changement par module que VOLTA (ou la main) prend à la place de celui du fichier
  const proposes = Q.lettres ? Q.modules.filter(M => M.fichier && cleNorme(M.fichier) !== cleNorme(M.reference)).map(M => ({ sujet: 'module ' + M.numero, champ: 'module', colonne: colsPn, objet: nom, avant: M.fichier, apres: M.reference, geste: M.main ? 'choisi ici' : 'VOLTA' }))
    : ecartRetest ? [{ sujet: '', champ: 'module', colonne: colsPn, objet: nom, avant: b.pn, apres: Q.reference, geste: main ? 'choisi ici' : 'VOLTA' }] : [];
  /* (v78) L'ESSENTIEL : la face de chaque module — chaque groupe de contacts reliés à sa couleur —, ce qu'elle relie, et
     comment VOLTA a choisi le module ; LA FABRICATION : les modules, le rail, les contacts à sertir, les obturateurs ;
     LES RÉGLAGES : changer de module, le contact de chaque câble */
  const places = Q.contacts || 0, coulG = new Map(); let nG = 0; Q.modules.forEach((M, k) => M.places.forEach(pl => coulG.set(k + '|' + pl.groupe.k, ++nG)));
  /* (v85, le lecteur : « une barrette, c'est plusieurs modules ; qu'elle me sorte les autres modules, bien alignés les uns
     après les autres, comme sur une barrette ») : LA BARRETTE ENTIÈRE (08-vues, `barretteVue`) — ses modules sur le rail,
     chacun sa face, ses zones à la couleur de leurs câbles, ses lettres, son numéro et sa référence. Les modules sont ceux
     du fichier (« 667VT2 51 », « 667VT2 52 »), ou, d'une barrette écrite à l'ancienne, ses repères frères (668VT31,
     669VT32 : chacun son plan). Le module montré est cerné de cuivre : celui de la fiche parmi ses frères ; d'une barrette
     posée sur plusieurs folios, ceux du folio ouvert. Un module mène où il se choisit (l'onglet Modifier), un frère à sa
     fiche ; une lettre (« dans le grand ») à son contact. */
  const couleurDe = i => i ? `var(--vu-g${(i - 1) % 6 + 1})` : '';
  const folioDe = x => (x.f.l && x.f.l.plan) || x.f.plan || '', foliosDe = (P, k) => new Set(P.fils.filter(x => x.module === k).map(folioDe));
  const ailleurs = Q.lettres && app.plan && app.plan !== '*' && Q.modules.some((M, k) => !foliosDe(Q, k).has(app.plan));
  const modsV = mini => { let nAutre = nG; const regMod = '[data-reg="le-module"]';
    const unModule = (P, M, k, o) => { const pr = new Map(); P.fils.filter(x => x.module === k).forEach(x => pr.set(x.contact.lettre, x));
      const coul = new Map(); (M.module.groupes || []).forEach(g => { const i = P === Q ? coulG.get(k + '|' + g.k) : (M.places.some(pl => pl.groupe.k === g.k) ? ++nAutre : 0); g.contacts.forEach(c => coul.set(c.lettre, i || 0)); });
      const etq = ct => P === Q ? etiquette(k, ct) : ct.lettre, ko = !!((M.defauts && M.defauts.length) || P.fils.some(x => x.module === k && x.jaugeOk === false));
      return { titre: o.titre, sous: mini ? M.module.variante : M.reference, contacts: M.module.contacts, etat: ct => { const x = pr.get(ct.lettre); return x ? (x.jaugeOk === false ? 'ko' : 'pris') : ''; },
        couleur: ct => couleurDe(coul.get(ct.lettre)), bus: (M.module.groupes || []).filter(g => g.contacts.length > 1).map(g => ({ contacts: g.contacts, couleur: couleurDe(coul.get(g.contacts[0].lettre)) })),
        va: mini || P !== Q ? null : ct => pr.has(ct.lettre) ? { onglet: 'reglages', vers: `[data-lettre="${etq(ct)}"]` } : null, ici: o.ici, ko,
        lien: mini || o.frere ? null : { onglet: 'reglages', vers: o.vers || regMod }, frere: mini ? '' : o.frere || '', bulle: mini ? '' : o.bulle }; };
    if (!Q.lettres && BP && BP.freres.length > 1) return BP.freres.flatMap((r, i) => { const P = r === nom ? Q : BP.plans[i]; return P ? P.modules.map((M, k) => unModule(P, M, k, { titre: r, ici: r === nom, frere: r === nom ? '' : r, bulle: r === nom ? 'Le module ' + M.reference + ' — le changer' : 'Ouvrir ' + r })) : []; });
    return Q.modules.map((M, k) => { const mot = M.main ? 'choisi ici' : M.nomme ? 'celui de votre fichier' : M.fichier ? 'votre fichier dit ' + M.fichier : 'le plus petit qui convient';
      return unModule(Q, M, k, { titre: Q.lettres ? M.numero : plusieurs ? String(k + 1) : '', ici: ailleurs && foliosDe(Q, k).has(app.plan), vers: Q.lettres ? `[data-reg="le-module-${M.numero}"]` : '', bulle: (Q.lettres ? 'Module ' + M.numero + ' · ' : '') + M.reference + ', ' + mot + ' — le changer' }); }); };
  const barreV = mini => barretteVue(modsV(mini), { mini, titre: 'La barrette ' + nom + ' et ses modules' });
  const filV = f => ({ type: f.type, vers: f.vers + (f.borne ? ':' + f.borne : ''), amont: f.amont, k: f.l ? cleFil(f.l) : '' });
  const groupesV = Q.modules.flatMap((M, k) => M.places.map(pl => ({ lettres: pl.fils.map(([, c]) => etiquette(k, c)), fils: pl.fils.map(([f]) => filV(f)) })));
  (Q.restants || []).forEach(p => groupesV.push({ ko: true, lettres: ['?'], fils: p.fils.map(filV) }));
  const refsCt = compterParReference(Q.fils.map(x => x.sertir ? motSertir(x.sertir) : ''), 'contact à sertir');
  /* (v85) une barrette en modules : ce que dit le fichier (le module et le contact de chaque câble — VOLTA n'en change aucun),
     la règle de la norme (les zones), puis une étape par module : sa référence, et pourquoi */
  const ex0 = Q.fils[0], exB = ex0 ? etiquette(ex0.module, ex0.contact) : '';
  const etapesM = !Q.lettres ? null : [
    // (v86) une barrette ajoutée par VOLTA : c'est lui qui nomme ses bornes, comme sa face (01, `avecBarrettesAPoser`)
    aPoser && nf ? (() => { const ls = [...new Set(Q.fils.map(x => x.contact.lettre))].sort(triContacts), r0 = raccord ? raccord.borneVers : '', num = Q.modules[0] ? Q.modules[0].numero : '';
      return { html: `VOLTA nomme ses bornes comme sa face${r0 ? ` : <b class="id">${esc(r0)}</b> pour le câble à créer, puis une par câble` : ''}${num && ls.length ? ` (module ${esc(num)}, contact${ls.length > 1 ? 's' : ''} ${esc(listeEt(ls))})` : ''} — le plan dit les mêmes.`, source: 'calcul' }; })()
    : nf ? { html: `Votre fichier pose <b>${esc(pluriel(nf, 'câble'))}</b> sur <b>${esc(pluriel(Q.modules.length, 'module'))}</b> : chaque borne dit son module et son contact${exB ? ` (<b class="id">${esc(exB)}</b> : module ${esc(ex0.numero)}, contact ${esc(ex0.contact.lettre)})` : ''}. VOLTA n’en change aucun.`, source: 'fichier' } : null,
    famNom ? { html: `Norme <b>${esc(famNom)}</b> : les contacts d’une même zone sont reliés. Les câbles reliés vont dans une même zone, deux groupes jamais dans la même.`, source: 'norme' } : null,
    ...Q.modules.map(M => { const ref = `<b class="id">${esc(M.reference)}</b>`, num = `Module <b>${esc(M.numero)}</b>`;
      if (M.defauts && M.defauts.length) return { html: `${num} : ${ref}${M.main ? ', choisi ici' : ''} — ${esc(M.defauts[0].texte)}.`, source: M.main ? 'main' : 'calcul', etat: 'ko' };
      if (M.main) return { html: `${num} : ${ref}, choisi ici, à la main.`, source: 'main' };
      if (M.nomme) return { html: `${num} : ${ref}, celui de votre fichier — chaque contact admet sa gauge, les câbles reliés sont dans une même zone.`, source: 'fichier' };
      if (M.ecart && M.fichier) return { html: `${num} : ${ref}, le plus petit qui convient. Votre fichier dit <b class="id">${esc(M.fichier)}</b> : ${esc(M.ecart.raison)}.`, source: 'calcul', etat: 'att' };
      return { html: `${num} : ${ref}, le plus petit qui convient.`, source: 'calcul' }; })];
  const etapesB = [
    aPoser ? { html: `VOLTA l’a ajoutée${sur ? ` sur <b class="id">${esc(sur)}</b>` : ''} : plusieurs câbles y partent de la même borne, la barrette les relie. Elle entre au contrat quand elle a son vrai repère.`, source: 'calcul', etat: 'att' } : null,
    ...(etapesM || [nf ? { html: `Votre fichier y relie <b>${esc(pluriel(nf, 'câble'))}</b>, en <b>${esc(pluriel(Q.potentiels, 'groupe'))}</b> : les câbles d’une même borne, ou de bornes pontées, sont reliés entre eux.`, source: 'fichier' } : null,
    famNom ? { html: `Norme <b>${esc(famNom)}</b> : dans un module, les contacts d’un même groupe sont reliés ; chaque groupe de câbles prend un groupe de contacts.`, source: 'norme' } : null,
    M0 ? { html: plusieurs ? `<b class="id">${esc(Q.reference)}</b> : un seul module ne loge pas ces ${esc(pluriel(Q.potentiels, 'groupe'))}.` : `Module <b class="id">${esc(Q.reference)}</b> : ${main || Q.main ? 'choisi ici, à la main' : Q.nomme ? 'celui de votre fichier : il loge tous les groupes, chaque câble dans un contact qui admet sa gauge' : 'le plus petit qui loge ces ' + esc(pluriel(Q.potentiels, 'groupe')) + ', chaque câble dans un contact qui admet sa gauge'}.`, source: main || Q.main ? 'main' : Q.nomme ? 'fichier' : 'calcul' }
      : aPoser ? null : { html: esc(Q.verdicts[0] ? majuscule(Q.verdicts[0].texte) + '.' : 'Aucun module de la norme ne loge ces câbles.'), source: 'calcul', etat: 'ko' }]),
    ecartRetest ? { html: `Votre fichier dit <b class="id">${esc(b.pn)}</b>${pqR ? ' — ' + esc(pqR) : ''}.`, source: 'fichier', etat: 'att' } : null,
    R ? { html: `Rail <b class="id">${esc(R.reference)}</b>${R.sous ? ', ' + esc(R.sous) : ''} : il porte ${BP.freres.length > 1 ? 'les ' + R.n + ' modules de ' + BP.parent + (porteRail ? '' : ' — compté avec le module 1, ' + BP.porteur) : plusieurs ? 'les modules' : 'le module'}.`, source: 'tables', bulle: sansLiens(R.source) } : null,
    refsCt.length ? { html: `Contacts à sertir : ${refsCt.map(x => `<b class="id">${esc(x.ref)}</b>${x.q > 1 ? ' × ' + x.q : ''}`).join(', ')}.`, source: 'tables' } : null,
    refuses.length ? { html: `${esc(majuscule(pluriel(refuses.length, 'câble')))} trop gros pour leur contact : la gauge est refusée.`, source: 'tables', etat: 'ko' } : null];
  const libresT = new Map(); Q.modules.forEach((M, k) => M.module.contacts.forEach(ct => { if (!par.has(k + '|' + ct.lettre)) libresT.set(ct.taille, (libresT.get(ct.taille) || 0) + 1); }));
  const obts = M0 ? [...libresT].map(([t, q]) => { let o = null; try { o = obturateurDe(N, M0.module.famille, t); } catch (_) { o = null; } return o && o.obturateur ? { q, ref: String(o.obturateur), role: 'obturateur, contact libre taille ' + t, statut: 'selon la zone' } : null; }).filter(Boolean) : [];
  const fabB = M0 ? [{ titre: 'Barrette ' + nom, sous: famNom, lignes: [...compterParReference(Q.modules.map(M => M.reference), 'module de jonction'), R && porteRail ? { q: 1, ref: R.reference, role: 'rail' + (R.sous ? ', ' + R.sous : '') } : null, ...refsCt, ...obts].filter(Boolean) }] : [];
  /* (v81, le lecteur : « ce qu'elle relie, une grande ligne où il y a tout ; on ne comprend pas ; le schéma est petit ;
     “3 contacts pris sur 8”, c'est trop, on le voit ») : CE QU'ELLE RELIE devient un brochage dessiné, comme pour un
     équipement — chaque groupe de contacts reliés est une pièce, ses câbles à la couleur du groupe (la même que sur la
     face), où ils vont et sur quelle borne ; puis LE MODULE, sa face en grand, la légende seule, sans phrase qui la répète */
  let gi = 0;
  const consG = Q.modules.flatMap((M, k) => M.places.map(pl => { const i = coulG.get(k + '|' + pl.groupe.k) || ++gi, coul = `var(--vu-g${(i - 1) % 6 + 1})`;
    return { nom: String(i), ref: '', lignes: pl.fils.map(([f, c]) => ({ borne: etiquette(k, c), type: f.type, couleur: coul, vers: f.vers, borneVers: estMasse(f.vers) ? '' : f.borne, masse: estMasse(f.vers), ko: '', k: f.l ? cleFil(f.l) : '' })) }; }))
    .concat((Q.restants || []).map(p => ({ nom: '?', ref: 'ne loge pas', lignes: p.fils.map(f => ({ borne: '?', type: f.type, couleur: 'var(--ko)', vers: f.vers, borneVers: estMasse(f.vers) ? '' : f.borne, masse: estMasse(f.vers), ko: 'ne se loge pas', k: f.l ? cleFil(f.l) : '' })) })));
  const broB = consG.length ? brochageVue(nom, 'Barrette', consG) : '';
  const essB = (aPoser && !M0 ? '<p class="vu-note">Le module se choisit quand la barrette a son vrai repère.</p>'
    // (v85) LA BARRETTE d'abord — tous ses modules sur leur rail (elle remplace les cartes « module 1 / module 2 ») —, puis
    // ce qu'elle relie, puis comment VOLTA a choisi
    : (M0 ? (() => { const n = Q.lettres || !(BP && BP.freres.length > 1) ? Q.modules.length : modsV(true).length, titre = n > 1 || Q.lettres ? 'La barrette' : 'Le module';
        const sous = n > 1 ? pluriel(n, 'module') + (R ? ' sur un rail' : '') : Q.lettres ? 'module ' + Q.modules[0].numero : M0.reference;
        return `<section class="vu-bloc vu-bloc-face vu-bloc-barrette"><h4 class="vu-titre">${titre} <span${n > 1 ? '' : ' class="id"'}>${esc(sous)}</span></h4><figure class="vu-fig vu-fig-face vu-fig-module">${barreV(false)}${legendeFaceVue(refuses.length > 0)}</figure></section>`; })() : '')
      + (broB ? `<section class="vu-bloc vu-bloc-bro"><h4 class="vu-titre">Ce qu’elle relie <span>${esc(lies([pluriel(nf || consG.reduce((n, g) => n + g.lignes.length, 0), 'câble'), pluriel(groupesV.length, 'groupe')]))}</span></h4>${broB}</section>` : '')) + pourquoiVue('Comment VOLTA a choisi ' + (Q.modules.length > 1 ? 'les modules' : 'le module'), etapesB);
  const sF = sections.find(x => x && x.cle === 'fils'), sD = sections.find(x => x && x.cle === 'dejafait');
  const onglets = [
    { cle: 'essentiel', statut: M0 ? statutContacts(Q.utilises || 0, places, refuses.length ? 'ko' : 'ok') : { t: aPoser ? 'à poser' : 'aucun module', etat: !aPoser ? 'ko' : 'ok' }, contenu: essB },
    ongletCables(sF), ongletFabrication(fabB, 'Ce qu’il faut pour la monter'),
    /* (v85) MODIFIER, en trois sortes — DANS VOTRE FICHIER : le module que votre fichier écrit, quand VOLTA en retient un autre ;
       CHOIX DE VOLTA : le module (Automatique | Manuel : tous les modules de la norme, dessinés) ; INFORMATION : le rail (il
       suit le module) et les contacts à sertir (un par câble, selon sa gauge — une lettre de la face y mène) */
    (() => { const regMod = '[data-reg="le-module"]', man = !!(main || Q.main), dif = !aPoser && b.pn && Q.reference && cleNorme(b.pn) !== cleNorme(Q.reference), refsT = refsCt.map(x => ident(x.ref) + (x.q > 1 ? ' × ' + x.q : ''));
      // (v85) une barrette en modules (« 667VT2 51 » + « A ») : module par module (`reglagesModulesBarrette`, plus bas)
      if (Q.lettres && M0 && !aPoser) return reglagesModulesBarrette(nom, Q, { colsPn, R, refsT, contacts, nf });
      const xs = aPoser && !M0 ? [{ sorte: 'info', titre: 'Le module', valeur: 'à venir', source: 'calcul', pourquoi: 'VOLTA l’a ajoutée : son module se choisit quand elle a son vrai repère.' }] : [
        dif ? { sorte: 'fichier', titre: 'Le module écrit', valeur: ident(b.pn), source: 'fichier', motSource: colsPn ? 'votre fichier · ' + colsPn : '', pourquoi: Q.modules.length > 1 && Q.modules.some(M => cleNorme(M.reference) === cleNorme(b.pn)) ? 'VOLTA le garde et lui ajoute un module : un seul ne loge pas tous les groupes.' : ecartRetest ? (pqR ? esc(majuscule(pqR)) + '.' : 'VOLTA en retient un autre.') : !moduleDeReference(N, b.pn) ? 'VOLTA ne le trouve pas dans ses normes : il en retient un qui loge tous les groupes.' : 'VOLTA en retient un autre, qui loge tous les groupes.' } : null,
        { sorte: 'choix', titre: plusieurs ? 'Ses modules' : 'Le module', valeur: Q.reference ? ident(Q.reference) : 'aucun', etat: Q.reference ? (man && (Q.restants || []).length ? 'ko' : '') : 'ko', source: man ? 'main' : Q.nomme ? 'fichier' : 'calcul', motSource: Q.nomme && !man ? 'votre fichier' : '',
          pourquoi: man ? 'Choisi ici, à la main.' : Q.nomme ? 'Celui de votre fichier : il loge tous les groupes.' : plusieurs ? `Un seul module ne loge pas ces ${pluriel(Q.potentiels, 'groupe')}.` : 'Le plus petit qui loge tous les groupes.',
          manuel: man, auto: 'arr:' + nom, vers: regMod, motAuto: 'Le module revient au choix de VOLTA.' },
        R ? { sorte: 'info', titre: 'Le rail', valeur: ident(R.reference), source: 'tables', pourquoi: BP.freres.length > 1 ? (porteRail ? 'Il porte les ' + R.n + ' modules de ' + BP.parent + ' : commandé une fois, ici.' : 'Celui de ' + BP.parent + ' : commandé une fois, avec le module 1 (' + BP.porteur + ').') : 'Il suit le module : il change avec lui.' } : null,
        nf ? { sorte: 'info', titre: 'Les contacts à sertir', valeur: refsT.length ? refsT.slice(0, 2).join(' · ') + (refsT.length > 2 ? ' …' : '') : esc(pluriel(nf, 'contact')), source: 'tables', pourquoi: 'Un par câble : ils suivent le module et la gauge.', vers: '[data-reg="les-contacts-a-sertir"]' } : null];
      const sectionsB = aPoser && !M0 ? '' : regCarte(plusieurs ? 'Ses modules' : 'Le module', man ? 'Choisi ici. Un autre se prend d’un clic ; « Automatique » rend celui de VOLTA.' : 'Les modules de la norme, dessinés avec ces câbles : un clic en retient un, à la place de celui de VOLTA.', reglageOuvert(regMod) ? galerieModules(nom, b, Q, main) : '', { reg: 'le-module', paresseux: true })
        + (nf ? regCarte('Les contacts à sertir', '', contacts, { reg: 'les-contacts-a-sertir' }) : '');
      return ongletReglages(xs, sectionsB); })(),
    sD ? ongletDeLaSection(sD) : null];
  const chiffres = [places ? { k: 'Contacts', v: `${Q.utilises || 0}<small>/ ${places}</small>`, sous: libres > 0 ? esc(plurielLie(libres, 'libre')) : 'tous pris', barre: (Q.utilises || 0) / places, etat: refuses.length ? 'ko' : '', onglet: 'essentiel' } : null,
    // (v84) « ajoutée par VOLTA sur 102CB1:2 » se lit déjà sous le titre : la case dit ses groupes, comme toute barrette
    chiffreCables(sF), Q.potentiels ? { k: 'Groupes', v: String(groupesV.length), bulle: 'Les groupes de câbles reliés : chacun prend une plage de contacts du module', onglet: 'essentiel' } : null,
    { k: plusieurs ? 'Modules' : 'Module', v: Q.reference ? ident(plusieurs ? Q.modules.length + ' modules' : Q.reference) : aPoser && !M0 ? '—' : '<span class="fi-ko-t">aucun</span>', etat: Q.reference || aPoser ? '' : 'ko', sous: R ? 'rail ' + ident(R.reference) : famNom ? esc(famNom) : '', onglet: 'essentiel' }];
  // (v85) la vignette de la carte : la barrette entière, en petit — ses modules sur le rail, chacun sa variante
  const vignette = M0 ? `<span class="vu-faces">${barreV(true)}</span>` : '';
  // (v85) plusieurs modules : leurs références se lisent sous chacun, dans la vignette — l'en-tête ne les répète pas
  return composerFiche({ type: 'barrette', tete: { nom, champ: 'eq-rep', designation: aPoser ? '' : nom, aide: '' },
    meta: [aPoser ? esc('ajoutée par VOLTA' + (sur ? ' sur ' + sur : '')) : Q.reference && !(Q.lettres && plusieurs) ? ident(Q.reference) : '', freresDe(nom, 'barrette').length > 1 ? esc('module ' + rangDuParent(nom).rang + ' de ' + rangDuParent(nom).parent) : ''],
    // (v84, la charte : « ce que VOLTA ajoute est marqué comme ajouté et se retrouve dans l'Historique ») : la barrette à poser
    // y a sa ligne — sur 102CB1:2, aucune barrette → VT1, par VOLTA
    probs, onglets, sections, avant: poser, ecrits: aPoser ? [] : ecritsDuRepere(nom), proposes: aPoser ? (sur ? [{ sujet: '', champ: 'barrette', colonne: '', objet: sur, avant: 'aucune', apres: nom, geste: 'VOLTA' }] : []) : proposes, chiffres, vignette, identite: id, ok: 'Son module loge tous ses câbles, chacun dans un contact qui admet sa gauge.',
    pied: aPoser ? { voir: raccord && raccord.de } : { tableau: nom, menu: MENU_BLOC } }); }
/* (v85) MODIFIER, D'UNE BARRETTE EN MODULES (« 667VT2 51 » + « A ») — module par module, puisque le fichier dit le module
   et la lettre de chaque câble et que VOLTA ne choisit que la référence de chaque module :
     · DANS VOTRE FICHIER : le module que votre fichier écrit, quand VOLTA en retient un autre, et pourquoi ;
     · CHOIX DE VOLTA : chaque module, Automatique | Manuel — Manuel ouvre ses possibles (`possiblesDuModule`) ; un clic en
       retient un (`choisirModuleDeBarrette`, 08-modules), « Automatique » le rend à VOLTA (`retourAutomatique`, « mod: ») ;
     · INFORMATION : le rail, les contacts à sertir.
   (L'ancienne liste disait « aucun des 29 ne loge ces 4 groupes d'un seul module » puis montrait des modules qui « logent
   4 / 4 » : elle jugeait la barrette entière ; chaque module se juge maintenant avec ses seules lettres.) */
function reglagesModulesBarrette(nom, Q, o) { const xs = [], secs = [];
  Q.modules.forEach(M => { const num = M.numero, sel = `[data-reg="le-module-${num}"]`, d = (M.defauts || [])[0];
    if (M.ecart && M.fichier) xs.push({ sorte: 'fichier', titre: 'Le module ' + num + ' écrit', valeur: ident(M.fichier), source: 'fichier', motSource: o.colsPn ? 'votre fichier · ' + o.colsPn : '',
      pourquoi: M.ecart.convient ? 'Il convient aussi : vous en avez choisi un autre.' : !M.ecart.module ? 'VOLTA ne le trouve pas dans ses normes : ' + (M.main ? 'un autre est choisi ici.' : 'il prend le plus petit qui convient.') : esc(majuscule(M.ecart.raison)) + (M.main ? ' : un autre est choisi ici.' : ' : VOLTA en prend un autre.') });
    xs.push({ sorte: 'choix', titre: 'Le module ' + num, valeur: ident(M.reference), etat: d ? 'ko' : '', source: M.main ? 'main' : M.nomme ? 'fichier' : 'calcul', motSource: M.nomme && !M.main ? 'votre fichier' : '',
      pourquoi: d ? esc(majuscule(d.texte)) + '.' : M.main ? 'Choisi ici, à la main.' : M.nomme ? 'Celui de votre fichier : chaque contact admet sa gauge, les câbles reliés sont dans une même zone.' : M.fichier ? 'Le plus petit qui convient : celui de votre fichier ne convient pas.' : 'Le plus petit qui convient : votre fichier n’en nomme pas.',
      manuel: !!M.main, auto: 'mod:' + nom + '|' + num, vers: sel, motAuto: 'Le module ' + num + ' revient au choix de VOLTA.' });
    secs.push(regCarte('Le module ' + num, M.main ? 'Choisi ici. Un autre se prend d’un clic ; « Automatique » rend celui de VOLTA.' : 'Les modules de la norme pour ce module, avec ses lettres : un clic en retient un, à la place de celui de VOLTA.',
      reglageOuvert(sel) ? possiblesDuModule(nom, num) : '', { reg: 'le-module-' + num, paresseux: true })); });
  if (o.R) xs.push({ sorte: 'info', titre: 'Le rail', valeur: ident(o.R.reference), source: 'tables', pourquoi: Q.modules.length > 1 ? `Il porte les ${o.R.n} modules : il suit leur nombre et leur norme.` : 'Il suit le module : il change avec lui.' });
  if (o.nf) xs.push({ sorte: 'info', titre: 'Les contacts à sertir', valeur: o.refsT.length ? o.refsT.slice(0, 2).join(' · ') + (o.refsT.length > 2 ? ' …' : '') : esc(pluriel(o.nf, 'contact')), source: 'tables', pourquoi: 'Un par câble : ils suivent le module et la gauge.', vers: '[data-reg="les-contacts-a-sertir"]' });
  return ongletReglages(xs, secs.join('') + (o.nf ? regCarte('Les contacts à sertir', '', o.contacts, { reg: 'les-contacts-a-sertir' }) : '')); }
/* LES POSSIBLES D'UN MODULE (09, `modulesPossibles`) : ceux de la norme de la barrette qui conviennent — dessinés, ses
   lettres prises à la couleur de leurs câbles, ce qu'ils laissent libre ; le mieux taillé étoilé (celui de VOLTA), celui de
   votre fichier et le retenu marqués —, puis les autres, ce qu'ils logent (« loge 1 / 2 groupes ») et pourquoi. */
function possiblesDuModule(nom, num) { const P = modulesPossiblesDe(nom, num); if (!P) return '';
  const b = besoinsDeBarrette(nom, liaisonsDeRepere(nom)), parL = new Map();
  b.bornes.forEach(bo => { const x = moduleEtContact(bo); if (x && x.module === String(num)) parL.set(x.contact, b.parBorne.get(bo) || []); });
  const ok = P.candidats.filter(c => c.convient), ko = P.candidats.filter(c => !c.convient), attrs = c => `data-mod-nom="${escA(nom)}" data-mod-num="${escA(num)}" data-ref="${escA(c.reference)}" aria-pressed="${!!c.retenu}"`;
  const marques = c => [c.retenu ? 'retenu' : '', c.fichier ? 'votre fichier' : '', c.jamaisSeul ? motUsage(c.usage) : ''].filter(Boolean).join(' · ');
  const carte = c => { const m = c.m, f = faceModuleSvg(m, ct => { const fs = parL.get(ct.lettre); if (!fs || !fs.length) return null; const cl = coulDeFil(fs[0]);
      return { i: '', couleur: cl, couleurClaire: melanger(cl, 0.8), ko: fs.some(y => { const j = jaugeDuType(y.type); return j != null && !contactAccepte(app.norme, m.famille, ct.taille, j); }) }; });
    return `<button type="button" class="cand cand-g${c.retenu ? ' retenue' : ''}" ${attrs(c)} data-bulle="${escA(c.reference + ' · ' + resumeModule(m) + (c.mieux ? ' — le mieux taillé' : '') + (c.retenu ? ' — retenu' : ' — cliquer pour le retenir'))}">`
      + `<span class="cand-face"><svg class="mj" viewBox="0 0 ${f1(f.w)} ${f1(f.h)}" aria-hidden="true">${f.svg}</svg></span>`
      + `<span class="cand-nom">${c.mieux ? `<i class="cand-etoile" aria-label="Le mieux taillé" role="img">${ico('etoile')}</i>` : ''}<b>${esc(c.variante)}</b></span><span class="cand-mot">${plurielLie(c.libres, 'libre')}${marques(c) ? ' · ' + esc(marques(c)) : ''}</span></button>`; };
  const ligne = c => `<button type="button" class="cand-l ko${c.retenu ? ' main' : ''}" ${attrs(c)} data-bulle="${escA(c.reference + ' — ' + (c.raisons[0] || '') + (c.retenu ? ' — retenu ici' : ' — un clic le retient quand même'))}">`
    + `<i class="cand-l-m" aria-hidden="true">${MARQUE_CAND.ko}</i><b>${esc(c.variante)}</b><span class="cand-l-n">${esc('loge ' + c.loge + ' / ' + pluriel(c.groupes, 'groupe'))}${c.retenu ? ' · <em>main</em>' : ''}${c.fichier ? ' · votre fichier' : ''}</span><span class="cand-l-r">${insecable(esc(majuscule(c.raisons[0] || '')))}</span></button>`;
  const n = P.candidats.length, compte = `<p class="fi-gal-n">${ok.length ? `${ok.length} des ${n} modules ${esc(P.nomFamille)} conviennent au module ${esc(num)}` : `Aucun des ${n} modules ${esc(P.nomFamille)} ne convient au module ${esc(num)} : les plus proches d’abord`}</p>`;
  return compte + (ok.length ? `<div class="fi-galerie">${ok.map(carte).join('')}</div>` : '')
    + (ko.length ? `<p class="fi-rac-t cand-l-t">${esc(`Les ${ko.length} autres, du plus proche au plus loin`)}</p><div class="cand-ls">${ko.map(ligne).join('')}</div>` : ''); }
/* LA GALERIE des assemblages d'une norme (le lecteur : « quand on clique sur la norme, on voit tous les assemblages de
   la norme, très visuel, pour savoir lequel est le mieux, si on peut mieux faire ») : chaque variante qui loge les
   potentiels d'un seul module, dessinée en petit avec ses contacts pris, ce qu'elle laisse de libre ; la retenue
   marquée, la meilleure étoilée ; un clic en retient une (à la main) — « Automatique » rend le choix de l'outil. Les
   onglets parcourent les normes de barrette. */
function galerieModules(nom, b, Q, main) { const N = app.norme, fams = famillesDeModules(N), M0 = Q.modules[0];
  const fam = fams.includes(FI.galerie[nom]) ? FI.galerie[nom] : M0 ? M0.module.famille : Q.famille || fams[0];
  // le module retenu : un seul, ou le même plusieurs fois (« 2 × B204 », retenu à la main)
  const vs = variantesQuiLogent(b, N, fam), retenue = M0 && Q.modules.every(M => M.reference === M0.reference) ? M0.reference : '';
  // v73 : toute la norme — ceux qui logent d'un seul module (dessinés), puis les autres, du plus proche au plus loin
  const pots = potentielsDeBarrette(b).sort((a, c) => c.fils.length - a.fils.length), tous = normeDesModules(N).modules.filter(m => m.emploi === 'barrette' && m.famille === fam);
  const rang = { att: 0, ko: 1 }, autres = tous.filter(m => !vs.includes(m)).map(m => ({ ...raisonDuModule(b, m, pots), retenu: (main || Q.main) && m.reference === retenue }))
    .sort((a, c) => c.n - a.n || rang[a.etat] - rang[c.etat] || a.m.contacts.length - c.m.contacts.length);
  if (autres[0] && autres[0].etat === 'ko') autres[0].raison = 'le plus proche — ' + autres[0].raison;
  const nomF = nomDeFamille(N, fam) || fam, autresH = autresCandidats(nom, `Les ${autres.length} autres modules ${nomF}, du plus proche au plus loin`, autres);
  const onglets = fams.length > 1 ? `<div class="fi-gal-onglets" role="group" aria-label="La norme">${fams.map(f => `<button type="button" class="fi-chip" data-gal-famille="${escA(f)}" aria-pressed="${f === fam}">${esc(nomDeFamille(N, f) || f)}</button>`).join('')}</div>` : '';
  // (v85) « Automatique » est sur la ligne du module (le sélecteur Automatique | Manuel) ; ici, les possibles — celui de votre
  // fichier marqué
  const deFichier = m => !!b.pn && cleNorme(b.pn) === cleNorme(m.reference);
  const cartes = vs.map((m, i) => { let Qv = null; try { Qv = remplirModules(b, N, m.reference); } catch (_) { Qv = null; }
    const pris = new Map(); (Qv ? Qv.fils : []).filter(x => x.module === 0).forEach(x => pris.set(x.contact.lettre, x));
    const f = faceModuleSvg(m, ct => { const x = pris.get(ct.lettre); if (!x) return null; const cl = coulDeFil(x.f); return { i: '', couleur: cl, couleurClaire: melanger(cl, 0.8), ko: x.jaugeOk === false }; });
    const libres = m.contacts.length - (Qv ? Qv.fils.filter(x => x.module === 0).length : 0);
    return `<button type="button" class="cand cand-g${m.reference === retenue ? ' retenue' : ''}" data-cle="${escA(nom)}" data-ref="${escA(m.reference)}" aria-pressed="${m.reference === retenue}" data-bulle="${escA(m.reference + ' · ' + resumeModule(m) + (i === 0 ? ' — le mieux taillé' : '') + (m.reference === retenue ? ' — retenu' : ' — cliquer pour le retenir'))}">`
      + `<span class="cand-face"><svg class="mj" viewBox="0 0 ${f1(f.w)} ${f1(f.h)}" aria-hidden="true">${f.svg}</svg></span>`
      + `<span class="cand-nom">${i === 0 ? `<i class="cand-etoile" aria-label="Le mieux taillé" role="img">${ico('etoile')}</i>` : ''}<b>${esc(m.variante)}</b></span><span class="cand-mot">${plurielLie(libres, 'libre')}${m.reference === retenue ? ' · retenu' : ''}${deFichier(m) ? ' · votre fichier' : ''}</span></button>`; }).join('');
  const compte = `<p class="fi-gal-n">${vs.length ? `${vs.length} sur ${tous.length} logent ces ${pluriel(pots.length, 'groupe')} d’un seul module` : `Aucun des ${tous.length} ne loge ces ${pluriel(pots.length, 'groupe')} d’un seul module`}</p>`;
  return (onglets ? `<div class="fi-gal-tete">${onglets}</div>` : '') + compte
    + (cartes ? `<div class="fi-galerie">${cartes}</div>` : '') + autresH; }
/* LE RAIL d'une barrette : la ligne « rail » de la table Accessoires de sa norme (NN y devient le nombre de modules : le
   rail Amphenol se commande au nombre de modules) ; sa longueur quand la ligne la dit au pas. null sans ligne. */
/* Le prochain repère libre d'un code dans la zone d'un équipement : « 102VT1 » si personne ne le porte. */
function repereLibre(voisin, code) { const q = lireRepere(voisin), zone = q && q.num ? q.num : '', pris = new Set(reperesDe(verite()));
  for (let n = 1; n < 1000; n++) { const r = zone + code + n; if (!pris.has(r)) return r; } return zone + code + '1'; }

/* ---- UNE PRISE DE COUPURE ------------------------------------------------------------------------------------------ */
/* Connecteur (la référence — l'arrangement — en puce et son « ? » ; UNE face — celle de la fiche, ou celle qui porte le
   problème —, l'autre d'un clic ; chaque contact, ce qui arrive et ce qui repart ; le raccord de chaque moitié) · Câbles
   · Déjà fait. */
/* UN ARRANGEMENT RECOMMANDÉ de la prise (v74, lot F) : sa face en petit — les contacts que ces câbles prennent, à la
   couleur de leur route —, son nom et ce qu'il a, sa RAISON (« même boîtier (taille 12) : le même raccord · les mêmes
   contacts à sertir · 1 contact libre »), ses CONTACTS ADMISSIBLES de chaque côté (la fiche, en douilles : EN3155-019F2020
   × 7 ; l'embase, en broches) ; un clic le retient. x : une ligne d'`arrangementsRecommandes` (09). */
function carteRecommandee(nom, x, points, Q, enAuto) { const N = app.norme, m = x.m, s0 = Q.sexe === 'M' ? 'M' : 'F', sexeFil = f => f.amont ? s0 : autreSexe(s0), pris = new Map();
  try { poserPoints(normeDesModules(N), m, points, sexeFil).pl.forEach(y => { const f = y.p.fils.find(g => g.amont) || y.p.fils[0]; if (f) pris.set(y.c.lettre, f); }); } catch (_) { }
  const fc = faceModuleSvg(m, ct => { const f = pris.get(ct.lettre); if (!f) return null; const cl = coulDeFil(f); return { i: '', couleur: cl, couleurClaire: melanger(cl, 0.8), ko: false }; });
  const cotes = ['fiche', 'embase'].map(c => { const ys = x.contacts.filter(y => y.cote === c); if (!ys.length) return '';
    return `<span class="pr-ct"><i>${c === 'fiche' ? 'Partie mobile' : 'Partie fixe'} · ${ys[0].sexe === 'M' ? 'broches' : 'douilles'}</i>${ys.map(y => `<b class="id">${esc(y.reference || 'aucun')}${y.accessoire ? ' + ' + esc(y.accessoire) : ''}</b>${y.n > 1 ? `<small>× ${y.n}</small>` : ''}`).join('')}</span>`; }).join('');
  return `<button type="button" class="cand cand-r${x.retenu ? ' retenue' : ''}" data-cle="${escA(nom)}" data-ref="${escA(m.reference)}" aria-pressed="${!!x.retenu}" data-bulle="${escA(m.reference + ' — ' + x.raisons.join(' ; ') + (x.retenu ? ' — retenu' : ' — un clic le retient'))}">`
    + `<span class="cand-face" aria-hidden="true"><svg class="mj" viewBox="0 0 ${f1(fc.w)} ${f1(fc.h)}">${fc.svg}</svg></span>`
    + `<span class="pr-c"><span class="pr-c-t"><b>${esc(m.variante)}</b>${x.retenu ? `<em>${enAuto ? 'retenu par VOLTA' : 'retenu ici'}</em>` : ''}<small>${esc(taillesDe(m))}</small></span>`
    + `<span class="pr-c-r">${insecable(esc(majuscule(x.raisons.join(' · '))))}</span>${cotes ? `<span class="pr-c-ct">${cotes}</span>` : ''}</span></button>`; }
function ficheCoupure(nom) { const { besoins: b, points, plan: Q } = planDeCoupure(nom), M = Q.modules[0], N = app.norme;
  const cps0 = coupablesDu(Q, points), probs = Q.verdicts.filter(v => v.niveau === 'ko' || v.niveau === 'attention').map(v => ({ niveau: v.niveau === 'ko' ? 'ko' : 'att', texte: v.texte, section: 'connecteur', viser: v.coupables && cps0[0] ? cleFil(cps0[0].l) : undefined }));
  ((typeof CONTROLE !== 'undefined' && CONTROLE.items) || []).filter(x => x.nom === nom && !probs.some(p => p.texte === x.texte)).forEach(x => probs.push({ niveau: x.niveau === 'ko' ? 'ko' : 'att', texte: x.texte, section: 'connecteur' }));
  const nums = points.map(p => p.num).join(', '), types = typesDe(Q.fils.map(x => x.f)), fam = nomDeFamille(N, Q.famille) || Q.famille || '';
  const pourquoi = Q.main ? 'Choisi ici' : Q.nomme ? `Le part number du fichier (${b.pn}) nomme cet arrangement` : !M ? 'Aucun arrangement ne loge ces contacts avec ces gauges' : `Le plus petit arrangement qui a les contacts ${nums} et accepte ${types || 'ces câbles'}`;
  const amont = Q.fils.filter(x => x.f.amont), aval = Q.fils.filter(x => !x.f.amont);
  /* v74, lot F (le lecteur : « la prise de coupure, le bordel total — EN 2997, puis EN 3646 : il faut organiser ; je veux
     des RECOMMANDATIONS, les mêmes types, les contacts admissibles, ultra pensé pour un novice ; je veux le POURQUOI »).
     La fiche se range : la RÉFÉRENCE et, dessous, pourquoi elle (la référence de l'installation la nomme…) et « Pourquoi
     cette norme » (le récit, `recitReference`) ; UNE norme à la fois ; la PARTIE MOBILE (la fiche, ce qui arrive) et la
     PARTIE FIXE (l'embase, ce qui repart) ; le sexe et son pourquoi ; un clic sur un contact ou une gauge ouvre le contact. */
  const famPn = familleDeReference(N, b.pn, 'connecteur'), nomPn = famPn ? nomDeFamille(N, famPn) || famPn : '', nB = points.length;
  /* UNE face : celle qu'on a demandée, sinon celle qui porte un problème, sinon la fiche */
  let face = '';
  if (M) { const koAv = aval.some(x => x.jaugeOk === false), koAm = amont.some(x => x.jaugeOk === false);
    const cote = FI.face[nom] === 'embase' || FI.face[nom] === 'fiche' ? FI.face[nom] : koAv && !koAm ? 'embase' : 'fiche', autre = cote === 'fiche' ? 'embase' : 'fiche';
    const par = (am, ct) => { const xs = Q.fils.filter(x => x.contact === ct && !!x.f.amont === am); return xs.length ? occupant(xs[0].f, xs.some(x => x.jaugeOk === false), ct.lettre) : null; };
    const f = cote === 'fiche' ? faceModuleSvg(M.module, ct => par(true, ct)) : faceModuleSvg(miroir(M.module), ct => par(false, M.module.contacts.find(k => k.lettre === ct.lettre)));
    face = `<div class="fi-face-tete"><span>${cote === 'fiche' ? 'Partie mobile · ce qui arrive' : 'Partie fixe · ce qui repart'}</span><button type="button" class="fi-lien" data-voir-face="${escA(autre)}">${ico('echange')}voir ${autre === 'fiche' ? 'la fiche' : 'l’embase'}</button></div>`
      + `<div class="fi-faces" data-face-montree="${cote}">${faceAjustee(f, '')}</div>`; }
  /* « CHANGER », RANGÉ : la norme en tête (une à la fois), « Automatique », puis les RECOMMANDÉS — même norme, même boîtier
     ou mêmes contacts, ils logent ces câbles (09, `arrangementsRecommandes`) : chacun dessiné, sa raison, ses contacts
     admissibles côté fiche et côté embase ; puis, repliés, ceux qui logent aussi (moins proches), ceux qui ne logent pas
     (et pourquoi), les autres normes (et pourquoi VOLTA ne change pas de norme d'office) ; la bible au pied */
  // (v85) les mêmes possibles, d'office, sous la ligne de l'arrangement dans Modifier (Manuel) — sans « Automatique », que le
  // sélecteur de la ligne porte
  const regArrP = '[data-reg="l-arrangement"]', enPlace = reglageOuvert(regArrP);
  const ouverte = FI.liste === 'cou|' + nom || enPlace, retenu = M ? M.reference : '', enAuto = !Q.main && !Q.visee;
  const autoRef = Q.main || Q.visee ? coupureEnModule(nom, verite(), N, '', sexeChoisi(nom)).plan.reference : retenu;
  let corpsChanger = '', corpsPlace = '';
  if (ouverte) { const famV = Q.visee || Q.famille, nomV = famV ? nomDeFamille(N, famV) || famV : 'toutes les normes', s0 = Q.sexe === 'M' ? 'M' : 'F', sexeFil = f => f.amont ? s0 : autreSexe(s0);
    let recos = []; try { recos = typeof arrangementsRecommandes === 'function' ? arrangementsRecommandes(points, N, famV, { sexe: s0, prise: true, actuel: M ? M.module : null, nomme: Q.nomme }) : []; } catch (_) { recos = []; }
    const N_RECO = 4, recommandes = recos.slice(0, N_RECO), aussi = recos.slice(N_RECO);
    const tete = `<div class="pr-tete"><span class="pr-tete-k">Norme</span><b>${esc(nomV)}</b><span class="pr-tete-d">${esc(Q.visee ? 'choisie ici' : famPn && famPn === famV ? 'celle de la référence de votre fichier' + (b.pn ? ', ' + b.pn : '') : famV ? 'celle de l’arrangement retenu' : '')}</span>${Q.visee ? `<button type="button" class="fi-lien" data-auto="${escA('arr:' + nom)}">${esc('revenir à ' + (nomPn || 'la norme de la référence'))}</button>` : ''}</div>`;
    const auto = `<button type="button" class="cand cand-auto" data-auto="${escA('arr:' + nom)}" aria-pressed="${enAuto}" data-bulle="${escA('Le choix de VOLTA : celui que la référence nomme, sinon le plus petit qui loge ces contacts' + (autoRef ? ' — ' + autoRef : ''))}"><i class="cand-etoile">${ico('etoile')}</i><b>Automatique</b><span>${esc(autoRef || 'le plus petit qui loge')}</span></button>`;
    const reco = recommandes.length ? `<p class="fi-rac-t pr-t">${esc(`Recommandés — ${nomV}, ils logent ${nB > 1 ? 'ces ' + nB + ' contacts' : 'ce contact'} de chaque côté`)}</p><div class="pr-recos">${recommandes.map(x => carteRecommandee(nom, x, points, Q, enAuto)).join('')}</div>` : `<p class="fi-note">${esc(`Aucun arrangement ${nomV} ne loge ces ${nB} contacts avec ces câbles.`)}</p>`;
    const pli = (t, h, n) => n ? `<details class="pr-pli"><summary>${ico('bas', 'pr-pli-ch')}<span>${esc(t)}</span><i>${n}</i></summary><div class="pr-pli-c">${h}</div></details>` : '';
    const aussiH = pli('Ceux qui logent aussi, moins proches', `<div class="cand-ls">${aussi.map(x => ligneCandidat(nom, { m: x.m, etat: 'att', loge: 'loge tout', raison: x.raisons.join(' ; '), retenu: !enAuto && x.retenu })).join('')}</div>`, aussi.length);
    const A = autresArrangements(nom, points, famV, recos.map(x => x.m), enAuto ? '' : retenu, true), nonH = pli('Ceux qui ne logent pas ces câbles — et pourquoi', A.html, A.n);
    // les autres normes : pourquoi VOLTA n'en change pas d'office, et ce que chacune logerait
    const autresN = famillesDeModules(N, 'connecteur').filter(f => f !== famV).map(f => { let n = 0; try { n = arrangementsQuiLogent(points, N, f, sexeFil).length; } catch (_) { n = 0; } const F = (normeDesModules(N).familles || []).find(x => cleNorme(x.famille) === f && !x.exemple);
      return `<div class="pr-norme"><span class="pr-norme-t"><b>${esc(nomDeFamille(N, f) || f)}</b><small>${esc((F && F.note ? avantQueDeux(F.note) + ' · ' : '') + (n ? plurielLie(n, 'arrangement') + ' logerai' + (n > 1 ? 'ent' : 't') + ' ces ' + nB + ' contacts' : 'aucun arrangement ne loge ces câbles'))}</small></span>`
        + (n ? `<button type="button" class="fi-lien pr-norme-b" data-norme-prise="${escA(f)}" data-bulle="${escA('VOLTA y prend le plus petit arrangement qui loge ces contacts ; « Automatique » revient à la norme de la référence')}">${esc('Passer en ' + (nomDeFamille(N, f) || f))}</button>` : '') + '</div>'; }).join('');
    const pourquoiN = famPn ? `La référence de votre fichier (${b.pn}) est une ${nomPn} : changer de norme change toute la prise — le boîtier, le raccord, les contacts. VOLTA ne le fait jamais d’office.` : 'La référence de votre fichier ne dit pas la norme : VOLTA a pris la plus petite prise qui loge tout, toutes normes confondues.';
    const normesH = pli('Les autres normes — et pourquoi pas elles', `<p class="pr-pq">${esc(pourquoiN)}</p>${autresN}`, famillesDeModules(N, 'connecteur').filter(f => f !== famV).length);
    corpsChanger = tete + `<div class="fi-cands">${auto}</div>` + reco + aussiH + nonH + normesH; corpsPlace = tete + reco + aussiH + nonH + normesH; }
  const liste = listeChoix('cou|' + nom, corpsChanger, { titre: 'Les arrangements de la norme', filtre: ouverte ? 'Filtrer les arrangements' : '', cls: 'pr-changer', pied: M ? `<button type="button" class="fi-lien" data-bible="${escA(M.reference)}">${ico('livre')}voir dans la bible</button>` : '' });
  // la référence seule (le lecteur : « un contact fixe, on s'en fiche » : plus de « 7 contacts · fiche femelle » dessous)
  // aucun arrangement ne loge la prise : la borne fautive nommée, la gauge qui s'y loge (un geste)
  const fautifs = M ? [] : coupablesDu(Q, points), dit = fautifs.map(x => `<span class="fi-fautif"><b class="id">${esc(x.borne)}</b> : ${ident(x.f.type || '?')}${x.f.vers ? ' vers ' + esc(x.f.vers) : ''}, ${esc(x.mot)}${x.contact ? ` pour le contact ${esc(x.contact.lettre)} du ${esc(x.module.variante)}, le plus proche` : ''}</span>`).join('');
  // LE POURQUOI de la référence, en clair, sous elle ; « Pourquoi cette norme » ouvre le récit
  const pq = Q.main ? `Choisi ici, à la main — « Automatique » le rend à VOLTA (${autoRef || 'le plus petit qui loge'}).` : Q.visee ? `Norme choisie ici (${fam}) : VOLTA y prend le plus petit arrangement qui loge ces ${nB} contacts.`
    : Q.nomme && M ? `La référence de votre fichier, ${b.pn}, nomme cet arrangement (${M.module.variante}) de l’${fam}.` : M ? (famPn ? `La référence de votre fichier, ${b.pn}, est une ${nomPn} qui ne nomme pas d’arrangement : VOLTA prend le plus petit qui loge ces ${nB} contacts.` : `La référence de votre fichier ne dit pas la norme : VOLTA prend, toutes normes confondues, le plus petit arrangement qui loge ces ${nB} contacts.`) : '';
  const kr = 'recit|' + nom, recit = b.pn ? `<button type="button" class="fi-lien pr-recit" data-changer="${escA(kr)}" aria-expanded="${FI.liste === kr}" data-bulle="D’où vient cette référence, de quelle base, et son schéma">D’où elle vient${ico('bas', 'fi-chevron')}</button>` : '';
  const tete = champs([ligneChamp('Référence', (M ? `<span class="fi-norme-puce statique" data-bulle="${escA(pourquoi)}">${esc(M.reference)}</span>` : `<b class="fi-ko-t">${fautifs.length ? 'Aucun arrangement ne loge ' + esc([...new Set(fautifs.map(x => x.borne))].join(', ')) : 'Aucun arrangement'}</b>`) + aide('prise', { plan: Q, fautifs }),
    { changer: boutonChanger('cou|' + nom, 'Les arrangements recommandés, puis les autres — chacun avec sa raison'), liste: liste + (b.pn ? recitReference({ cle: kr, nom, bornes: '*', c: { pn: b.pn }, Q, M, prise: true }) : ''),
      sous: (pq ? `<span class="pr-pq">${insecable(esc(pq))}</span>${recit}` : recit) + (dit ? `<span class="fi-fautifs">${dit}</span>` + fautifs.map(boutonReparer).join('') : '') })]);
  /* les PAIRES, en broches (comme les contacts d'un connecteur) : le rond porte la lettre du contact ; à côté, ce qui arrive
     (la fiche) et ce qui repart (l'embase) — chacun son contact de la table (le même qu'au-dessus plus pâle), la gauge de
     son câble en pastille (acceptée ✓, refusée ✕), le câble à la couleur de sa route. v74 : le contact et la gauge de
     chaque côté ouvrent le contact (`carteContact`), sous la paire */
  const prec = { am: '', av: '' }, cleCote = x => nom + '|' + cleFil(x.f.l);
  const cote = (x, k) => { if (!x) { prec[k] = ''; return '<span class="fi-cote vide"><i>—</i></span>'; } const st = x.sertir, mot = st ? motSertir(st) : '', meme = !!mot && mot === prec[k], j = jaugeDuType(x.f.type), ok = x.jaugeOk === false ? false : st ? true : null; prec[k] = mot;
    const ligne = st && !meme ? ligneDuContact(Q.famille || (M ? M.module.famille : ''), x.taille, x.sexe, x.f.type) : null, kc = cleCote(x), ouvre = `data-ct="${escA(kc)}" aria-expanded="${FI.liste === 'ct:' + kc}"`;
    return `<span class="fi-cote" data-i="${cleFil(x.f.l)}" tabindex="0" role="button" data-bulle="${escA([nomDuFil(x.f), x.f.type || '', mot].filter(Boolean).join(' · '))}"><span class="ct-sertir"><button type="button" class="fi-sertir ct-ref${meme ? ' meme' : ''}" ${ouvre} data-bulle="${escA((mot || 'Le contact') + ' — un clic l’ouvre : sa norme, sa table, sa source')}">${mot ? esc(mot) : '<i>—</i>'}</button>${ligne && ligne.reference === st.reference ? repereConfiance(ligne, 'Vos tables SEE') : ''}</span>`
      + `<span class="ct-cote-bas">${puceFil(x.f)}<b class="fi-cab-n">${esc(nomDuFil(x.f))}</b><button type="button" class="fi-jg ct-jg${ok === false ? ' ko' : ok ? ' ok' : ''}" ${ouvre} aria-label="${escA((j != null ? j + ' AWG' : 'Gauge') + ' — ouvrir le contact : sa norme, sa table, sa source')}" data-bulle="${escA((j != null ? j + ' AWG' : 'Gauge inconnue') + (ok === false ? ' : le contact ne l’admet pas' : ok ? ' : le contact l’admet' : '') + ' — un clic ouvre le contact')}">${j != null ? `${j}<small>AWG</small>` : '—'}${ok === false ? ico('fermer') : ok ? ico('coche') : ''}</button></span></span>`; };
  const carteCote = (x, ct) => x && FI.liste === 'ct:' + cleCote(x) ? `<li class="fi-choix-ligne">${carteContact({ st: x.sertir, fam: Q.famille || (M ? M.module.famille : ''), taille: x.taille, sexe: x.sexe, type: x.f.type, lettre: ct.lettre, variante: M ? M.module.variante : '', cote: x.f.amont ? 'partie mobile (ce qui arrive)' : 'partie fixe (ce qui repart)', ko: x.jaugeOk === false, volet: 'ct:' + cleCote(x) })}</li>` : '';
  const lignes = (M ? M.module.contacts : []).map(ct => { const am = Q.fils.find(x => x.contact === ct && x.f.amont), av = Q.fils.find(x => x.contact === ct && !x.f.amont); if (!am && !av) return '';
    return `<li class="fi-paire ct-paire${[am, av].some(x => x && x.jaugeOk === false) ? ' ko' : ''}"><span class="fi-ct ct-pin"><b>${esc(ct.lettre)}</b></span>${cote(am, 'am')}${cote(av, 'av')}</li>` + carteCote(am, ct) + carteCote(av, ct); }).join('');
  const nP = (lignes.match(/class="fi-paire/g) || []).length;
  const paires = lignes ? `<ul class="ct-liste fi-paires"><li class="ct-legende ct-legende-paire"><span>Contact</span><span>Partie mobile · ce qui arrive</span><span>Partie fixe · ce qui repart</span></li>${lignes}</ul>` + legendeConfiance() : '<p class="fi-note">Aucun contact posé.</p>';
  const fils = filsDuRepere(nom); probs.push(...problemesDesFils(fils));
  // le sexe de la fiche : deux puces qui ne bougent pas, celle qui est retenue pressée ; et pourquoi ce sexe, en une ligne
  const sexe = Q.tableContacts ? sexeDeLaFiche(nom, Q.sexe) : '';
  const motsSexe = Q.sexe === 'M' ? 'Partie mobile en broches (mâles), partie fixe en douilles (femelles)' : 'Partie mobile en douilles (femelles), partie fixe en broches (mâles)';
  const pqSexe = !Q.tableContacts || !M ? '' : `<p class="fi-note pr-sexe">${insecable(esc(motsSexe + ' : ' + (Q.sexeSource === 'choix' ? 'choisi ici.' : Q.sexeSource === 'part number' ? 'votre référence le dit (' + b.pn + ').' : 'la référence ne le dit pas, VOLTA met d’office des douilles côté partie mobile — l’usage : le côté qui amène le courant porte les douilles, ses contacts ne se touchent pas.')))}</p>`;
  // le raccord de chaque moitié, dans la même section que la prise (le lecteur : « tout ce qui est connecteur, tyrap, etc. »)
  const raccords = [['fiche', 'Partie mobile', amont], ['embase', 'Partie fixe', aval]].filter(([, , xs]) => xs.length).map(([k, t, xs]) => raccordHtml({ cle: nom + '|' + k, titre: t, fils: xs.map(x => x.f), pn: b.pn, ref: Q.reference, plan: M ? Q : null })).join('');
  // pas de résumé sous « Connecteur » (le lecteur : « ne mets pas la référence en dessous de connecteur ») : la ligne Référence la dit
  const sections = [{ cle: 'connecteur', resume: M ? '' : '<span class="fi-ko-t">aucun arrangement</span>', badge: badgeProblemes(probs, 'connecteur'),
      contenu: tete + face + groupeSection('Contacts', pqSexe + paires, { droite: sexe, compte: nP || null, aide: ['contact', null] }) + (raccords ? groupeSection('Raccord', raccords, { cls: 'fi-groupe-raccord' }) : '') },
    sectionFilsDuRepere(fils, probs), sectionDejaFait(nom)];
  // l'identité : la référence de l'installation, une fois (l'arrangement est sur la ligne Référence) — une norme à la fois
  const id = identite([majuscule(natureDe(nom)), b.pn ? ident(b.pn) : M ? ident(M.reference) : '', esc(motFolios(foliosDuRepere(nom)))]);
  /* (v78) L'ESSENTIEL : la face de la fiche, LA TRAVERSÉE (ce qui arrive, la lettre, ce qui repart), comment VOLTA a choisi
     l'arrangement et le sexe ; LA FABRICATION : de chaque côté, les contacts à sertir et le raccord ; LES RÉGLAGES : changer
     d'arrangement, le sexe, le contact de chaque câble, le raccord */
  const places = M ? M.module.contacts.length : 0, nPris = M ? M.module.contacts.filter(ct => Q.fils.some(x => x.contact === ct)).length : 0;
  const rond = M ? formeDuCorps(M.module) === 'circulaire' : false, koP = Q.fils.some(x => x.jaugeOk === false);
  const etatCt = ct => { const xs = Q.fils.filter(x => x.contact === ct); return !xs.length ? '' : xs.some(x => x.jaugeOk === false) ? 'ko' : 'pris'; };
  const faceP = mini => M ? faceVue(M.module.contacts, etatCt, { rond, mini, lettres: true, pas: mini ? 22 : 28, r: mini ? 8 : 9.5, w: mini ? 112 : undefined, echelle: mini ? 1 : 1.8, titre: 'La face de la partie mobile ' + M.reference,
    // (v83, le lecteur : « quand je clique sur A, B, C, ça ne me mène pas au câble ») : une lettre prise mène à son câble
    va: mini ? null : ct => { const x = Q.fils.find(y => y.contact === ct && y.f.l); return x ? { onglet: 'cables', vers: `[data-i="${cleFil(x.f.l)}"]` } : null; } }) : faceVue([], () => '', { w: mini ? 64 : 180 });
  const coteP = (lt, am) => { const ct = M.module.contacts.find(k => k.lettre === lt), x = Q.fils.find(y => y.contact === ct && !!y.f.amont === am); if (!x) return null;
    // (v86) `borne` : la borne de la prise telle que le fichier l'écrit — un fichier qui numérote, « 1 » pour le contact A (08-vues, « 1·A »)
    return { type: x.f.type, de: x.f.vers + (x.f.borne ? ':' + x.f.borne : ''), couleur: coulDeFil(x.f), ko: x.jaugeOk === false, k: x.f.l ? cleFil(x.f.l) : '', borne: x.borne }; };
  const lettresP = M ? M.module.contacts.filter(ct => Q.fils.some(x => x.contact === ct)).map(ct => ct.lettre) : [];
  const refsDe = xs => compterParReference(xs.map(x => x.sertir ? motSertir(x.sertir) : ''), 'contact à sertir');
  const rAm = refsDe(amont), rAv = refsDe(aval), dits = r => r.map(x => `<b class="id">${esc(x.ref)}</b>${x.q > 1 ? ' × ' + x.q : ''}`).join(', ');
  const motsS = Q.sexe === 'M' ? 'la partie mobile en broches, la partie fixe en douilles' : 'la partie mobile en douilles, la partie fixe en broches';
  const etapesP = [
    b.pn ? { html: `Votre fichier donne la référence <b class="id">${esc(b.pn)}</b>${nomPn ? ', une ' + esc(nomPn) : ''}.`, source: 'fichier' } : { html: 'Votre fichier ne donne pas de référence pour cette prise.', source: 'fichier', etat: 'att' },
    M ? { html: Q.main ? `Arrangement <b class="id">${esc(M.reference)}</b>, choisi ici, à la main.` : Q.visee ? `Norme ${esc(fam)} choisie ici : VOLTA y prend le plus petit arrangement qui loge ces ${nB} contacts, <b class="id">${esc(M.reference)}</b>.`
          : Q.nomme ? `La référence nomme l’arrangement <b class="id">${esc(M.reference)}</b> (${esc(M.module.variante)}).` : `Arrangement <b class="id">${esc(M.reference)}</b> : le plus petit ${esc(fam)} qui a ces ${nB} contacts et accepte ${esc(types || 'ces câbles')}.`, source: Q.main || Q.visee ? 'main' : Q.nomme ? 'fichier' : 'calcul' }
      : { html: `Aucun arrangement ne loge ${esc([...new Set(fautifs.map(x => x.borne))].join(', ') || 'ces contacts')}${fautifs[0] ? ` : <b class="id">${esc(fautifs[0].f.type || '?')}</b> ${esc(fautifs[0].mot)}` : ''}.${fautifs[0] && fautifs[0].propose ? ` En <b class="id">${esc(fautifs[0].propose.type)}</b>, il s’y loge.` : ''}`, source: 'calcul', etat: 'ko' },
    M && Q.tableContacts ? { html: `${esc(majuscule(motsS))} : ${esc(Q.sexeSource === 'choix' ? 'choisi ici' : Q.sexeSource === 'part number' ? 'la référence le dit' : 'le côté qui amène le courant porte les douilles')}.`, source: Q.sexeSource === 'choix' ? 'main' : Q.sexeSource === 'part number' ? 'fichier' : 'hypothese', mot: Q.sexeSource === 'choix' || Q.sexeSource === 'part number' ? '' : 'l’usage' } : null,
    rAm.length || rAv.length ? { html: `Contacts à sertir${rAm.length ? ` — côté partie mobile : ${dits(rAm)}` : ''}${rAv.length ? `${rAm.length ? ' ;' : ' —'} côté partie fixe : ${dits(rAv)}` : ''}.`, source: 'tables' } : null,
    koP ? { html: 'Un contact refuse la gauge de son câble : il faut un câble plus fin, ou un autre arrangement.', source: 'tables', etat: 'ko' } : null];
  const fabP = M ? [['fiche', 'Partie mobile', 'ce qui arrive', amont], ['embase', 'Partie fixe', 'ce qui repart', aval]].filter(([, , , xs]) => xs.length).map(([k, t, so, xs], i) => { let pieces = [];
      try { pieces = piecesFabrication(habillageDe({ cle: nom + '|' + k, titre: t, fils: xs.map(x => x.f), pn: b.pn, ref: Q.reference, plan: Q })); } catch (_) { pieces = []; }
      return { titre: t, ref: i === 0 ? M.reference : '', sous: so, lignes: [...refsDe(xs), ...pieces] }; }) : [];
  // (v81) ce qui la traverse, dessiné : la fiche et l'embase accolées, ce qui arrive à gauche, ce qui repart à droite ; puis
  // la face, en grand, sa légende seule (plus de « 1 contact pris sur 3 » : on le voit)
  const essP = freresVue(nom, 'coupure') + (M ? `<section class="vu-bloc vu-bloc-bro"><h4 class="vu-titre">Ce qui la traverse <span>${esc(pluriel(lettresP.length, 'contact'))}</span></h4>${traverseeDessin(nom, lettresP, coteP)}</section>`
      + `<section class="vu-bloc vu-bloc-face"><h4 class="vu-titre">La face <span class="id">${esc(M.reference)}</span></h4><figure class="vu-fig vu-fig-face vu-fig-module">${faceP(false)}${legendeFaceVue(koP)}</figure></section>` : `<div class="vu-schema">${faceP(false)}</div>`)
    + pourquoiVue('Comment VOLTA a choisi la prise', etapesP);
  const sF = sections.find(x => x && x.cle === 'fils'), sD = sections.find(x => x && x.cle === 'dejafait');
  const onglets = [
    { cle: 'essentiel', statut: M ? statutContacts(nPris, places, koP ? 'ko' : 'ok') : { t: 'aucun arrangement', etat: 'ko' }, contenu: essP },
    ongletCables(sF), ongletFabrication(fabP, 'Ce qu’il faut pour la monter'),
    /* (v85) MODIFIER, en trois sortes — DANS VOTRE FICHIER : sa référence ; CHOIX DE VOLTA : l'arrangement, le sexe des
       contacts, le raccord (Automatique | Manuel chacun) ; INFORMATION : les contacts à sertir de chaque côté, qui suivent */
    (() => { const regSexe = '[data-reg="le-sexe"]', regRacP = '[data-reg="le-raccord"]', cotesR = [['fiche', 'Partie mobile', amont], ['embase', 'Partie fixe', aval]].filter(([, , xs]) => xs.length);
      const clesR = cotesR.map(([k]) => nom + '|' + k), racM = clesR.some(k => { const o = app.contrat.raccords.get(k); return !!(o && Object.keys(o).length); });
      const piecesR = cotesR.flatMap(([k, t, xs]) => { try { return piecesHabillage(habillageDe({ cle: nom + '|' + k, titre: t, fils: xs.map(x => x.f), pn: b.pn, ref: Q.reference, plan: M ? Q : null })).filter(x => x.reference).map(x => x.reference); } catch (_) { return []; } });
      const refsR = [...new Set(piecesR)], sexeMan = Q.sexeSource === 'choix';
      const xs = [
        { sorte: 'fichier', titre: 'Sa référence', valeur: b.pn ? ident(b.pn) : 'aucune', source: 'fichier', etat: b.pn ? '' : 'att', pourquoi: b.pn ? (nomPn ? `Une ${esc(nomPn)} : l’arrangement s’en déduit.` : 'VOLTA n’y lit pas de norme.') : 'Absente de votre fichier.' },
        { sorte: 'choix', titre: 'L’arrangement', valeur: M ? ident(M.reference) : 'aucun ne loge', etat: M ? '' : 'ko', source: Q.main || Q.visee ? 'main' : Q.nomme ? 'fichier' : 'calcul', motSource: Q.nomme && !Q.main && !Q.visee ? 'votre référence' : '',
          pourquoi: Q.main ? 'Choisi ici, à la main.' : Q.visee ? `Norme choisie ici (${esc(fam)}) : le plus petit qui loge ${nB > 1 ? 'ces ' + nB + ' contacts' : 'ce contact'}.` : Q.nomme ? 'Votre référence le nomme.' : `Le plus petit qui loge ${nB > 1 ? 'ces ' + nB + ' contacts' : 'ce contact'} avec ${nB > 1 ? 'leurs gauges' : 'sa gauge'}.`,
          manuel: !!(Q.main || Q.visee), auto: 'arr:' + nom, vers: regArrP, motAuto: 'L’arrangement revient au choix de VOLTA' + (Q.main || Q.visee ? (autoRef ? ' : ' + autoRef : '') : '') + '.' },
        lignes && M && Q.tableContacts ? { sorte: 'choix', titre: 'Le sexe des contacts', valeur: Q.sexe === 'M' ? 'partie mobile mâle' : 'partie mobile femelle', source: sexeMan ? 'main' : Q.sexeSource === 'part number' ? 'fichier' : 'calcul', motSource: Q.sexeSource === 'part number' && !sexeMan ? 'votre référence' : !sexeMan ? 'l’usage' : '',
          pourquoi: sexeMan ? 'Choisi ici, à la main.' : Q.sexeSource === 'part number' ? 'Votre référence le dit.' : 'Le côté qui amène le courant porte les douilles.',
          manuel: sexeMan, auto: 'sexe:' + nom, vers: regSexe, motAuto: 'Le sexe des contacts revient au choix de VOLTA.' } : null,
        raccords ? { sorte: 'choix', titre: 'Le raccord', valeur: refsR.length ? refsR.slice(0, 2).map(r => ident(r)).join(' · ') + (refsR.length > 2 ? ' …' : '') : 'rien à poser', source: racM ? 'main' : 'calcul',
          pourquoi: racM ? 'Ses options sont choisies ici.' : 'D’après ses câbles, sans option.', manuel: racM, auto: 'raccords:' + clesR.join(';'), vers: regRacP, motAuto: 'Le raccord revient au calcul de VOLTA.' } : null,
        rAm.length || rAv.length ? { sorte: 'info', titre: 'Les contacts à sertir', valeur: [rAm.length ? 'mobile : ' + dits(rAm) : '', rAv.length ? 'fixe : ' + dits(rAv) : ''].filter(Boolean).join('<br>'), source: 'tables', pourquoi: 'Ils suivent l’arrangement, le sexe, la gauge.' } : null];
      const raccordsM = cotesR.map(([k, t, xs]) => raccordHtml({ cle: nom + '|' + k, titre: t, fils: xs.map(x => x.f), pn: b.pn, ref: Q.reference, plan: M ? Q : null, options: true })).join('');
      const sectionsP = regCarte('L’arrangement', Q.main || Q.visee ? 'Choisi ici. Un autre se prend d’un clic ; « Automatique » rend celui de VOLTA.' : 'Les recommandés d’abord, puis les autres, chacun avec sa raison : un clic en retient un, à la place de celui de VOLTA.', enPlace && corpsPlace ? `<div class="fi-choix fi-choix-place pr-changer" role="group" aria-label="Les arrangements de la norme"><div class="fi-choix-corps">${corpsPlace}</div></div>` : '', { reg: 'l-arrangement', paresseux: true })
        + (lignes && M && Q.tableContacts ? regCarte('Le sexe des contacts', '', `<div class="nv-reg-sexe">${sexe}</div>${pqSexe}`, { reg: 'le-sexe' }) : '')
        + (raccords ? regCarte('Le raccord', 'Ce que nous posons autour de chaque partie. Une option changée ici passe le raccord en Manuel.', raccordsM, { reg: 'le-raccord' }) : '');
      return ongletReglages(xs, sectionsP); })(),
    sD ? ongletDeLaSection(sD) : null];
  const chiffres = [places ? { k: 'Contacts', v: `${nPris}<small>/ ${places}</small>`, sous: places - nPris > 0 ? esc(plurielLie(places - nPris, 'libre')) : 'tous pris', barre: nPris / places, etat: koP ? 'ko' : '', onglet: 'essentiel' } : null,
    chiffreCables(sF), Q.tableContacts && M ? { k: 'Partie mobile', v: Q.sexe === 'M' ? 'mâle' : 'femelle', sous: Q.sexe === 'M' ? 'en broches' : 'en douilles', onglet: 'reglages' } : null,
    { k: 'Référence', v: M ? ident(M.reference) : '<span class="fi-ko-t">aucune</span>', etat: M ? '' : 'ko', sous: fam ? esc(fam) : '', onglet: 'essentiel' }];
  // (v82, le lecteur : « la prise, juste la synthèse, c'est un peu fade ») : la synthèse montre ce qui la traverse, dessiné
  // comme sur le folio — la fiche, l'embase, ce qui arrive, ce qui repart
  const vignette = M ? (lettresP.length ? `<span class="vu-trav-v">${traverseeDessin(nom, lettresP, coteP, { petit: true })}</span>` : `<span class="vu-faces"><span class="vu-face-v${koP ? ' ko' : ''}">${faceP(true)}<b class="id">${esc(M.module.variante)}</b></span></span>`) : '';
  return composerFiche({ type: 'prise', tete: { nom, champ: 'eq-rep', designation: nom }, meta: [b.pn ? ident(b.pn) : M ? ident(M.reference) : '', freresDe(nom, 'coupure').length > 1 ? esc('partie ' + rangDuParent(nom).rang + ' de ' + rangDuParent(nom).parent) : ''],
    probs, onglets, sections, ecrits: ecritsDuRepere(nom), proposes: [], chiffres, vignette, identite: id,
    geste: fautifs.length ? boutonReparer(fautifs.find(x => x.propose) || {}).replace('btn papier', 'btn cuivre dense') : '', ok: 'L’arrangement loge tous ses contacts, de chaque côté, avec leurs gauges.', pied: { tableau: nom, menu: MENU_BLOC } }); }

/* ---- UNE MASSE ------------------------------------------------------------------------------------------------------ */
/* Le lecteur : « une masse : dis-moi la quantité de câbles, mais pas en tuile ; pas d'identité ; mets directement les
   câbles qui y vont ; pas de connecteur ». Une seule section : ses câbles — leur nombre dans le titre —, une ligne
   chacun (son numéro, d'où il vient, sa gauge) ; un clic ouvre sa fiche. */
/* (v84, la passe « fiche » : la masse avait moins de soin que les autres — une liste d'hier, un onglet seul dans une bande
   vide) : la même forme que tous — L'ESSENTIEL, ce qui y revient, dessiné (chaque câble depuis son équipement et sa borne,
   le trait commun, le symbole de masse) ; LES CÂBLES, le tableau de toutes les fiches (courant, chute, longueur) ; la carte
   dit combien de câbles et les gauges à reprendre sous la cosse. */
function ficheMasse(nom) { const fils = filsDuRepere(nom), probs = problemesDesFils(fils);
  const tri = fils.slice().sort((a, b) => triNaturel(a.vers + ':' + (a.borneVers || ''), b.vers + ':' + (b.borneVers || '')));
  const lignes = tri.map(f => { const x = intensiteDuFil(f.l); return { vers: f.vers, borneVers: estMasse(f.vers) ? '' : f.borneVers, type: f.l.type, couleur: coulDeFil(f), ko: x.trop.length ? 'trop fin' : '', k: cleFil(f.l) }; });
  const sF = sectionFilsDuRepere(fils, probs), jauges = [...new Set(fils.map(f => jaugeDuType(f.l.type)).filter(j => j != null))].sort((a, b) => a - b);
  const dessin = masseVue(nom, lignes);
  const ess = !fils.length ? '' : `<section class="vu-bloc vu-bloc-bro"><h4 class="vu-titre">Ce qui y revient <span>${esc(pluriel(fils.length, 'câble'))}</span></h4>${dessin}</section>`;
  const onglets = [{ cle: 'essentiel', statut: { t: jauges.length ? 'gauge ' + (jauges.length > 1 ? jauges[0] + ' à ' + jauges[jauges.length - 1] : jauges[0]) + ' AWG' : pluriel(fils.length, 'câble'), etat: probs.some(p => p.niveau === 'ko') ? 'ko' : probs.length ? 'att' : 'ok' }, contenu: ess, vide: fils.length ? '' : 'aucun câble ne revient à cette masse' },
    ongletCables(sF)];
  // (v86, l'audit : « GAUGE 20 sur la carte d'une masse, 20 AWG sur celle d'un câble ») : une gauge s'écrit partout avec son
  // unité, « 20 AWG », « 16 à 22 AWG » ; le compte des câbles, comme sur les autres cartes (`chiffreCables`)
  const chiffres = [chiffreCables(sF) || { k: 'Câbles', v: String(fils.length), onglet: 'fils' },
    jauges.length ? { k: 'Gauge', v: (jauges.length > 1 ? `${jauges[0]}<small class="nc-a">à</small>${jauges[jauges.length - 1]}` : String(jauges[0])) + '<small>AWG</small>', bulle: 'Les gauges des câbles qui y reviennent, du plus gros au plus fin : la cosse les reprend', onglet: 'fils' } : null];
  return composerFiche({ type: 'masse', tete: { nom, champ: 'eq-rep', designation: nom }, meta: [esc('retour au corps de l’appareil')], probs, onglets, ecrits: ecritsDuRepere(nom), proposes: [],
    chiffres, vignette: masseVue(nom, lignes, { petit: true }), ok: 'Un retour au corps de l’appareil : ni connecteur ni contact.', pied: { tableau: nom, menu: [['fi-copier', 'Copier la fiche']] } }); }

/* ---- UN BORNIER HORS MODULES (une bible importée sans modules) ----------------------------------------------------- */
function ficheBornierAncien(nom) { const V = verite(), b = besoinsDeBarrette(nom, V);
  const P = remplirSelonNorme(physiqueDeBarrette(nom, V, app.bible, app.contrat.designations.get(nom) || ''), app.norme);
  return composerFiche({ type: estCoupure(nom) ? 'prise' : 'barrette', tete: { type: estCoupure(nom) ? 'prise' : 'barrette', genre: estCoupure(nom) ? 'Prise de coupure' : 'Barrette', designation: nom, nom, champ: 'eq-rep' }, probs: [],
    sections: [{ cle: 'connecteur', titre: 'Référence', resume: 'la bible des barrettes', contenu: `<div class="equip">${cartePhysique(nom, P, b)}</div>`, ouvert: true }], ok: 'Lue dans la bible des barrettes.', pied: { tableau: nom, menu: MENU_BLOC } }); }

/* ---- UN CÂBLE ------------------------------------------------------------------------------------------------------- */
/* LA FICHE D'UN CÂBLE, pour celui qui le pose : en tête son numéro et sa ligne d'identité ; les problèmes, puis ses
   tuiles — son type et sa longueur s'y écrivent, sa gauge, son intensité (l'audit v72 : « la barre des problèmes passe
   sous les tuiles ; ailleurs elle suit l'en-tête ») ; puis D'OÙ À OÙ, en une ligne qui se lit comme son chemin
   (« 102CB1 : 2 → VT1 · J → 103RL1 : A1, connecteur A » : un clic sur un bout ouvre l'équipement sur le bon connecteur,
   le contact allumé ; le contact de chaque bout se change d'un clic — plus de deux cartes dans la carte) ; puis
   l'intensité et la chute — une ligne chacune, une barre contre ce qu'il admet ; le résumé ne redit pas la tuile, il dit
   le pourquoi (« sous 102CB1 · en ligne vers 103RL1:A1 »). Un câble trop fin dit LE PLUS FIN QUI TIENT, à prendre d'un
   clic ; un câble qu'aucun arrangement d'un connecteur ne loge porte le point (le connecteur et la borne nommés) et la
   gauge qui s'y loge. Rien de ce qu'on ne sait pas. */
// un câble qu'aucun arrangement ne loge au bout `rep` (un connecteur d'équipement, une prise de coupure) : ce qu'en dit le plan
function coupableAuBout(l, rep) { if (!rep || estMasse(rep) || estDisjoncteur(rep) || estRenvoi(rep) || VT_A_POSER.test(rep)) return null;
  try { const plans = coupureEnModules(rep) ? [{ nom: '', ...planDeCoupure(rep) }] : estBornier(rep) ? [] : cavitesDe(rep).map(c => ({ nom: c.nom, plan: c.plan, points: c.points }));
    for (const P of plans) { const x = coupablesDu(P.plan, P.points).find(y => y.l === l); if (x) return { ...x, rep, connecteur: P.nom, famille: P.plan.famille }; } } catch (_) { }
  return null; }
function ficheFil(l) { const coul = coulDeFil({ l }), neuf = l.origine === null, jauge = jaugeDuType(l.type), st = sertirDuFil(l), N = app.norme;
  const x = intensiteDuFil(l), ch = chuteDuFil(l, x), H = x.H, cab = l.type ? cableDuType(N, l.type) : null;
  // sur le plan, un bout peut passer par une barrette à poser : le chemin le dit
  const p = neuf ? null : liaisonsDuPlan().find(y => y.origine && y.aPoser && sourceDe(y) === l);
  const via = cote => { if (!(p && VT_A_POSER.test(p[cote]))) return ''; let lettre = ''; try { const y = planDeBarrette(p[cote]).plan.fils.find(z => z.f.l === p); if (y) lettre = y.contact.lettre; } catch (_) { }
    return p[cote] + ' · ' + (lettre ? lettre + ' (borne ' + (cote === 'de' ? p.borneDe : p.borneVers) + ')' : 'borne ' + (cote === 'de' ? p.borneDe : p.borneVers)); };
  const fautes = neuf ? [] : ['de', 'vers'].map(k => coupableAuBout(l, l[k])).filter(Boolean);
  const probs = [];
  if (!l.type) probs.push({ niveau: 'att', texte: 'type de câble inconnu : la gauge ne se vérifie pas', section: '' });
  if (neuf) probs.push({ niveau: 'att', texte: 'Nouveau câble — VOLTA l’ajoute avec la barrette ' + l.aPoser + ' ; il entre au contrat quand elle a son vrai repère', section: '' });
  [st.de, st.vers].forEach((s, k) => { if (s && s.ko) probs.push({ niveau: 'ko', texte: 'aucun contact n’accepte ce câble côté ' + (k ? l.vers : l.de), section: 'trajet' }); });
  // le plan d'un connecteur ne le loge pas : c'est ce câble qui l'en empêche (l'audit : « W-370 est vert »)
  fautes.forEach(y => probs.push({ niveau: 'ko', texte: `${y.rep}${y.connecteur ? ' · connecteur ' + y.connecteur : ''} : aucun arrangement ne loge ce ${l.type || 'câble'} sur la borne ${y.borne} (${y.mot})`, section: 'trajet' }));
  if (x.rd.refuse) probs.push({ niveau: 'att', texte: 'conducteur ' + x.rd.conducteur + ' sans résistance dans la base : la chute n’est pas calculée', section: 'fils' });
  // v73 — LE CONTRÔLE RATTACHE AU CÂBLE ses problèmes (le domaine C, 08-controle, `problemesDuCable`) : sa charge, sa protection,
  // son contact contre le calibre, la chute de son chemin, et LA CAUSE quand son disjoncteur ne passe pas — avec leurs gestes ;
  // une seule phrase pour un même fait, celle du contrôle. Sans elle, la fiche les calcule (`protectionDuCable`)
  let deC = null; if (!neuf && x.al && typeof problemesDuCable === 'function') { try { deC = problemesDuCable(l); } catch (_) { deC = null; } }
  if (deC) deC.forEach(p => probs.push({ niveau: p.niveau === 'ko' ? 'ko' : 'att', texte: p.texte, bulle: p.bulle, section: p.section || 'fils', gestes: p.gestes, cause: p.cause, genre: p.genre }));
  else x.trop.forEach(pt => probs.push({ niveau: 'ko', texte: `${pt.nom} ${amperes(pt.i)}${pt.t === Infinity ? '' : ' pendant ' + secondes(pt.t)} : plus que ce que le câble admet (${amperes(x.admise(pt.t))})`, section: 'fils' }));
  // ses PROPRES problèmes de protection, et la cause quand c'est son disjoncteur (v73 : l'ingénieur, point 5 ; le technicien, n° 1)
  const prot = neuf ? null : protectionDuCable(l, x); if (prot && !deC) probs.push(...prot.probs);
  // une masse ou une résistance impossible pour sa jauge (sous le métal seul, sous un cuivre pur) : la ligne de la base se trompe
  const phy = cab && typeof physiqueDuCable === 'function' ? physiqueDuCable(N, cab) : [];
  phy.forEach(q => probs.push({ niveau: 'att', texte: `${cab.cable} dans la base des câbles : ${q.texte} — impossible, à corriger dans sa table`, section: '' }));
  const motSupp = ch.reel ? '' : ' (longueurs supposées)';
  if (deC) { /* la chute : celle du contrôle, dans sa liste */ }
  else if (ch.trop) probs.push({ niveau: ch.reel ? 'ko' : 'att', texte: `la chute en ligne depuis ${x.al.nom} atteint ${volts(ch.total.dU)} : plus que les ${volts(ch.max)} admis${motSupp}`, section: 'fils' });
  else if (ch.pointe) probs.push({ niveau: ch.reel ? 'ko' : 'att', texte: `la chute en ligne depuis ${x.al.nom} atteint ${volts(ch.pointe.dU)} en pointe (${amperes(ch.pointe.i)}) : plus que les ${volts(ch.pointe.admis)} admis${motSupp}`, section: 'fils' });
  /* LES TUILES, quatre de même taille (le lecteur : « le type est bien plus grand que la gauge ; la longueur, pas propre ;
     l'intensité, pas bien proportionnée ») : le type (sa famille) et la gauge s'y écrivent chacun à part, la longueur
     aussi (« supposée » dessous tant que le retest ne la porte pas), l'intensité et ce qu'il admet dessous (« supposé »
     quand aucun disjoncteur ne la donne) */
  const L = l.longueur > 0 ? l.longueur : null, rT = x.pointe && x.pointe.admis ? x.pointe.i / x.pointe.admis : null;
  /* v74, lot F (le lecteur : « un peu compliqué — l'italique, l'hypothèse 5 m ») : l'hypothèse de la longueur est dite UNE
     fois, en clair, sous les tuiles — « Longueur supposée : 5 m, à écrire dans l'installation » —, plus en italique nulle part */
  // (v85, le lecteur : « ce qui vient de mon fichier, plus aucune saisie ») : la note dit le fait et où l'écrire — dans le
  // fichier ; plus de champ ici (les Hypothèses règlent la longueur supposée de tous)
  const hypL = L == null && !neuf ? `<p class="fi-hyp-l">${ico('alerte')}<span><b>${esc('Longueur supposée : ' + nombre(H.longueur) + ' m')}</b>${esc(' — votre fichier ne la donne pas, et la chute en dépend : à écrire dans votre fichier.')}</span></p>` : '';
  const pointeI = rT != null && x.continu && rT > x.I / x.continu, iV = x.fn ? (pointeI ? x.pointe.i : x.I) : null, iA = x.fn ? (pointeI ? x.pointe.admis : x.continu) : null;
  const brins = cab ? [(cab.brins > 1 ? cab.brins + ' brins' : '1 brin') + (cab.blindage ? ' + blindage' : ''), cab.nature, cab.diametre != null ? 'Ø ' + nombre(cab.diametre) + ' mm' : '', cab.section != null ? nombre(cab.section) + ' mm² hors-tout' : '', cab.resistance != null ? nombre(cab.resistance) + ' mΩ/m à 20 °C' : '', cab.masse != null ? nombre(cab.masse) + ' g/m' : ''].filter(Boolean).join(' · ') : '';
  /* (v86, l'audit G7 : « 60 mΩ/m » dans D'où viennent ces chiffres, puis « 79,1 Ω/km × 5 m × 2 A » dans la chute, sans un mot
     sur le lien) : une seule unité, le mΩ/m de la base, et d'où vient la valeur chaude — la résistance à 20 °C, portée à la
     température que son courant donne au câble (ou à la température fixe des Hypothèses) */
  // (« Ces 79,1 mΩ/m : 60 mΩ/m à 20 °C, portés à 101 °C (95 °C autour, plus l'échauffement sous 2 A) » ; rien à 20 °C)
  const rhoChaud = (() => { const rd = x.rd || {}, tc = x.tc || {}; if (rd.rho == null || rd.rho20 == null) return ''; const T = Math.round(tc.T != null ? tc.T : 20); if (Math.abs(T - 20) < 0.5) return '';
    const pourquoi = tc.estimee ? `${nombre(Math.round(tc.tu))} °C autour, plus l’échauffement sous ${nombre(arrondi(x.I, 2))} A${tc.borne ? ', borné à ce que le câble tient' : ''}` : 'la température fixe des Hypothèses';
    return `Ces ${nombre(arrondi(rd.rho, 1))} mΩ/m : ${nombre(arrondi(rd.rho20, 1))} mΩ/m à 20 °C, portés à ${T} °C (${pourquoi}).`; })();
  // (v86, l'audit G5 : « déclassé × 0,6 » ne disait pas d'où venait le facteur) : ce que la table donne pour un câble seul, et
  // ce qui le réduit — les mêmes mots que les problèmes (08-niveaux, `conditionsEnMots`)
  const admisEnMots = (() => { if (!x.fn || !x.fac || Math.abs(x.fac - 1) < 1e-9) return ''; let m = null;
    try { m = /^([\d,]+ A) × ([\d,]+)(?: : (.+))?$/.exec(typeof motDuDeclassement === 'function' ? motDuDeclassement(app.norme, l.type, x.H, Infinity) || '' : ''); } catch (_) { m = null; }
    return m ? ` : ${m[1]} pour un ${l.type} seul à l’air libre, × ${m[2]} ${m[3] && typeof conditionsEnMots === 'function' ? conditionsEnMots(m[3]) : 'ici'}` : ` (× ${nombre(arrondi(x.fac, 2))})`; })();
  // le câble que la base SEE a mis à la place de celui de VOLTA (08 nonies) : la différence se dit dans Modifier, sous le type
  const dCab = cab && typeof differenceSEEMots === 'function' ? differenceSEEMots('cables', cab) : '';
  /* D'OÙ À OÙ : son chemin, une étape par ligne (un bout, la barrette par laquelle il passe, l'autre bout) sur un trait à
     la couleur de sa route ; un clic sur un bout ouvre l'équipement, le connecteur, le contact allumé ; le contact de
     chaque bout en puce, qui se change d'un clic */
  const cts = {};
  const bout = (cote, sens) => { const rep = l[cote], borne = cote === 'de' ? l.borneDe : l.borneVers, s = st[cote], g = rep && !estMasse(rep) && !estDisjoncteur(rep) ? connecteurParBorne(rep, liaisonsDeRepere(rep)).get(String(borne)) : null;
    const ct = neuf ? null : contactAuBout(l, rep, borne); cts[cote] = ct; const fa = fautes.find(y => y.rep === rep);
    const ligne = ct && !ct.st.main && ct.plan && ct.plan.Q ? ligneDuContact(ct.plan.Q.famille || '', ct.plan.taille, ct.plan.sexe, l.type) : null;
    const quoi = g ? `connecteur ${g.nom}${ct && ct.lettre && ct.lettre !== String(borne).replace(/^[A-Z]{1,2}(?=\d)/, '') ? ', contact ' + ct.lettre : ''}` : estMasse(rep) ? 'masse' : estDisjoncteur(rep) ? 'disjoncteur' : '';
    return `<li class="fi-etape fi-bout${(s && s.ko) || fa ? ' ko' : ''}"><button type="button" class="fi-bout-va" data-bout="${cote}" aria-label="${escA('Ouvrir ' + rep + (g ? ', connecteur ' + g.nom : '') + ', le contact allumé')}"><span class="fi-bout-k">${sens}</span>`
      + `<span class="fi-bout-rep"><b>${esc(rep || '—')}</b>${borne ? `<span>:${esc(borne)}</span>` : ''}</span>${quoi ? `<small>${esc(quoi)}</small>` : ''}${ico('droite', 'fi-bout-fl')}</button>`
      + (s && s.ko && !ct ? '<small class="fi-bout-ko">Aucun contact pour ce câble</small>' : ct ? `<span class="fi-bout-ct">${boutonContact(ct, 'fi-bout-puce')}${ligne && ligne.reference === ct.st.reference ? repereConfiance(ligne, 'Vos tables SEE') : ''}</span>` : '') + '</li>'; };
  const passe = [via('de'), via('vers')].filter(Boolean);
  const etapes = bout('de', 'De') + passe.map(t => `<li class="fi-etape via"><span class="fi-bout-k">Par</span><span>${esc(t)}</span><small>barrette ajoutée par VOLTA</small></li>`).join('') + bout('vers', 'Vers');
  // (après les bouts : c'est `bout` qui connaît le contact de chacun)
  // (v74 : la puce ouvre le contact — sa norme, sa table, sa source —, et dessous les autres contacts de la taille)
  const choixCt = ['de', 'vers'].map(k => { const ct = cts[k]; if (!(ct && FI.liste === 'sertir:' + ct.ks)) return ''; const Qc = ct.plan.Q, famC = Qc ? Qc.famille || (Qc.modules && Qc.modules[0] ? Qc.modules[0].module.famille : '') : '';
    return carteContact({ st: ct.st, fam: famC, taille: ct.plan.taille, sexe: ct.plan.sexe, type: l.type, lettre: ct.lettre, variante: Qc && Qc.modules && Qc.modules[0] ? Qc.modules[0].module.variante : '', cote: ct.rep + (ct.borne ? ':' + ct.borne : ''), ko: ct.ko, volet: 'sertir:' + ct.ks, choix: choixSertir(ct.ks, ct.plan, { type: l.type }, ct.st, true) }); }).join('');
  // la gauge qui se loge, quand un plan de connecteur ne loge pas ce câble
  const loge = fautes.filter(y => y.propose).map(y => `<p class="fi-reparer-l"><span>${esc(`${y.rep}${y.connecteur ? ' ' + y.connecteur : ''}, borne ${y.borne} : ${y.mot} pour le ${y.module.variante}`)} — ${esc(y.propose.type)} s’y loge et porte son courant</span>${boutonReparer(y)}</p>`).join('');
  // (v84) ses bouts et leurs contacts d'un côté, sa route de l'autre : chacun son réglage dans « Modifier »
  const trajetB = `<ol class="fi-chemin" style="--c:${coul}">${etapes}</ol>${choixCt}${loge}`;
  const trajet = trajetB;
  /* L'INTENSITÉ ET LA CHUTE : une ligne chacune, une barre contre l'admis ; dessous, ce qui dépasse en pointe, et le plus
     fin qui tient */
  const r = ligneDeFil({ l, vers: l.vers, borneVers: l.borneVers }), pointeTrop = rT != null && rT > 1 + 1e-9;
  /* v74, lot F (le lecteur : « intensité et chute, c'est bien, mais pas présenté de façon fluide ») : chaque mesure se lit
     comme une phrase — son nom, sa valeur « sur » ce qui est admis, la barre, puis en clair d'où elle vient (le
     disjoncteur et son profil, le chemin) ; plus de « / … pointe » ni d'italique ; le détail du calcul reste dans la bulle */
  const mesure = (k, q, v, barre, etat, d, bulle) => `<div class="fi-mes ${etat || ''}"${bulle ? ` data-bulle="${escA(bulle)}"` : ''}><span class="fi-mes-k"><span>${k}${q}</span></span><span class="fi-mes-v">${v}</span>${barre == null ? '' : `<span class="fi-barre ${etat || ''}" aria-hidden="true"><i style="width:${(Math.min(1, barre || 0) * 100).toFixed(1)}%"></i></span>`}${d ? `<p class="fi-mes-d">${d}</p>` : ''}</div>`;
  // son disjoncteur en puce, le calibre ÉCRIT à côté (le technicien v73 : « la porte vers la vraie cause, un petit texte souligné de 11 px ») — ⚠ quand il est la cause
  const calS = prot && prot.calEcrit ? prot.calEcrit : x.al ? x.al.calibre : null, causeS = prot && prot.cause;
  const source = x.al ? `<button type="button" class="fi-sertir fi-ct-puce fi-dj-puce${causeS ? ' ' + (causeS.k === 'declenche' ? 'ko' : 'main') : ''}" data-choisir-bloc="${escA(x.al.nom)}" aria-label="${escA('Son disjoncteur : ' + x.al.nom + (calS ? ', ' + amperes(calS) : ''))}" data-bulle="${escA('Son disjoncteur : ' + x.al.nom + (calS ? ', ' + amperes(calS) + (prot && prot.calEcrit ? ' (votre fichier)' : '') : '') + (causeS ? ' — il est la cause : ' + (causeS.k === 'declenche' ? 'il déclenche' : 'il est juste') : '') + ' — son profil de charge, sa courbe')}">${esc(x.al.nom)}${calS ? ' · ' + esc(amperes(calS)) : ''}${causeS ? ' <i>⚠</i>' : ''}</button>` : `${esc(nombre(H.courant))} A ${origine('hyp', 'Aucun disjoncteur en amont : VOLTA suppose ' + nombre(H.courant) + ' A', 'supposés')}`;
  const bulleI = r.bulle.split('\n').filter(t => !/^chute|^en pointe/.test(t)).slice(1).join('\n');
  const bulleU = ch.total ? `En ligne depuis ${x.al.nom} jusqu’à ${ch.total.bout[0]}${ch.total.bout[1] ? ':' + ch.total.bout[1] : ''} : ${volts(ch.total.dU)}${ch.max != null ? ' (' + volts(ch.max) + ' admis)' : ''}${ch.reel ? '' : ', longueurs supposées'}\nSur ce câble : ${volts(ch.dU)} (${nombre(arrondi(ch.L, 2))} m${ch.hyp ? ' supposés' : ''})${ch.pointe ? `\nEn pointe : ${volts(ch.pointe.dU)} à ${amperes(ch.pointe.i)} > ${volts(ch.pointe.admis)} admis` : ''}` : ch.dU != null ? `Sur ce câble : ${volts(ch.dU)} = ${nombre(arrondi(x.rd.rho, 1))} mΩ/m × ${nombre(arrondi(ch.L, 2))} m × ${nombre(arrondi(x.I, 2))} A` : x.I == null ? 'Le courant de la branche n’est pas écrit : la chute ne se calcule pas' : 'La résistance du câble est inconnue';
  // l'intensité : au pire du permanent et de la pointe, « sur » ce qu'il admet pour cette durée ; dessous, en clair, l'autre
  // régime et d'où vient le courant (son disjoncteur en puce, ou l'hypothèse)
  const dT = x.pointe ? ' pendant ' + secondes(x.pointe.t) : '';
  /* (v86, l'audit B1) LE COURANT TRAVERSE CE QUI CONDUIT : un câble au-delà d'un relais, d'un interrupteur vient de son
     disjoncteur « à travers 103RL1, contact supposé fermé » (le pire cas, dit) ; une branche de commande dont rien n'est écrit a
     un courant INCONNU (`source` 'commande') — jamais le courant total, jamais « Aucun disjoncteur en amont » */
  const cmdF = x.I == null, nT = (x.traverses || []).length, parT = nT && x.al && !x.al.amont ? ' ' + esc(`À travers ${listeEt(x.traverses.map(t => t.repere))}, ${nT > 1 ? 'contacts supposés fermés' : 'contact supposé fermé'}.`) : '';
  // (v86) sans type, le courant se lit quand même : d'où il vient, comme pour les autres
  const dI = (!x.fn || cmdF ? '' : pointeI ? esc(`Le plus fort : ${x.pointe.nom || 'la pointe'}${dT}${Math.abs(x.pointe.admis - x.continu) > 0.05 ? ' (sur cette durée, il admet plus qu’en continu)' : ''}. En continu : ${amperes(x.I)} sur ${amperes(x.continu)}.`)
      : x.pointe && x.pointe.admis ? esc(`Le plus fort : en continu. ${majuscule(x.pointe.nom || 'la pointe')} :${amperes(x.pointe.i)}${dT}, sur ${amperes(x.pointe.admis)} admis.`) : esc('En continu.'))
    // (v84, l'agent « câbles ») côté source du disjoncteur (vers une batterie, une génératrice, un TR), il n'est pas sous sa
    // protection ; sans profil de charge, le courant retenu est le calibre du disjoncteur — chaque cas se dit tel qu'il est
    + (x.al && x.al.amont ? ` ${esc('Côté source de')} ${source} ${esc(': il l’alimente, il n’est pas sous sa protection.')}`
      : x.al && cmdF ? `${esc('Courant de commande inconnu, sous')} ${source}${esc(' : ' + motDeCommande(x) + '.')}`
      : x.al && x.source === 'calibre' ? ` ${esc('Le courant vient de')} ${source} ${esc('— son calibre, faute de profil de charge.')}`
      : x.al && x.source === 'branche' && x.aval ? ` ${esc('Sa branche : ' + x.aval.bouts.join(', ') + ', ' + (x.aval.bouts.length > 1 ? 'leurs consommations écrites' : 'sa consommation écrite') + ' (sous')} ${source}${esc(').')}`
      : x.al && x.totalFaute ? ` ${esc('Courant total de')} ${source} ${esc(': la consommation de ce qui est en aval n’est pas écrite.')}`
      : x.al ? ` ${esc('Le courant vient de')} ${source}.` : ` ${esc(`Aucun disjoncteur en amont : VOLTA suppose ${nombre(H.courant)} A — une`)} ${motHypothese}.`) + parT;
  // (v86, le lecteur : « un câble sans type n'a pas de courant affiché : le courant doit se lire quand même ») : la valeur, sans
  // barre ni anneau (la part de l'admis est impossible), et pourquoi en clair
  const motInconnu = l.type ? l.type + ' n’est pas dans l’EN 2853' : 'votre fichier ne donne pas son type';
  // (v86) une branche de commande au courant inconnu : « inconnu », sans barre — ce qu'il faut écrire, dessous
  const intens = cmdF ? mesure('Courant', '', `<b>${esc('inconnu')}</b> <span class="fi-mes-inc">${esc('une branche de commande')}</span>`, null, '', dI, bulleI)
    : !x.fn ? mesure('Courant', '', `<b>${esc(amperes(x.I))}</b> <span class="fi-mes-inc">${esc(l.type ? 'hors norme : admis inconnu' : 'sans type : admis inconnu')}</span>`, null, '', esc(majuscule(motInconnu) + ' : ce qu’il admet ne se lit pas, VOLTA ne peut pas dire s’il porte ce courant.') + dI, bulleI)
    : mesure('Courant', aide('intensite', { type: l.type, admis: x.continu, base: x.fn.intensite, facteur: x.fac }), `<b>${esc(amperes(iV))}</b> sur ${esc(amperes(iA))} admis`, r.charge.r, classeMesure(r.charge.r), dI, bulleI);
  // la chute : en ligne depuis le disjoncteur jusqu'au bout du chemin, sur ce qui est admis ; dessous, le chemin, la part de
  // ce câble, la pointe qui dépasse (de la couleur de sa mesure) — les longueurs supposées sont dites une fois, sous les tuiles
  const rU = ch.total && ch.max ? ch.total.dU / ch.max : null, etatU = classeMesure(rU), boutU = ch.total ? ch.total.bout[0] + (ch.total.bout[1] ? ':' + ch.total.bout[1] : '') : '';
  const autresSupp = ch.total && !ch.reel && !ch.hyp ? ` ${esc(`D’autres câbles du chemin n’ont pas de longueur : ${nombre(H.longueur)} m supposés chacun.`)}` : '';
  const dU = ch.total ? esc(`Chute depuis ${x.al.nom} jusqu’à ${boutU}, tout le chemin compris ; dont ${volts(ch.dU)} dans ce câble.`) + autresSupp
      + (ch.pointe ? ` <span class="fi-mes-pointe ${classeMesure(ch.pointe.dU / ch.pointe.admis)}">${esc(`En pointe : ${volts(ch.pointe.dU)} à ${amperes(ch.pointe.i)}, ${ch.pointe.dU > ch.pointe.admis ? 'plus que' : 'pour'} les ${volts(ch.pointe.admis)} admis.`)}</span>` : '')
    // (le courant montré au-dessus est la pointe : la chute dit qu'elle se lit en continu, le même instant que sa phrase)
    : ch.dU != null ? esc(`Sur ce câble seul${pointeI ? ', en continu' : ''} : ${nombre(arrondi(x.rd.rho, 1))} mΩ/m × ${nombre(arrondi(ch.L, 2))} m × ${nombre(arrondi(x.I, 2))} A.${rhoChaud ? ' ' + rhoChaud : ''}`)
    : cmdF ? esc('Elle dépend du courant de la branche, qui n’est pas écrit : ' + motDeCommande(x) + '.') : esc('La résistance du câble est inconnue : la chute ne se calcule pas.');
  const chute = mesure('Chute', aide('chute', ch.total ? { chemin: { ...ch.total, admis: ch.max, regle: ch.regle } } : { dU: ch.dU, admis: ch.max, regle: ch.regle }),
    // (v84) sans admis à comparer, pas de barre vide : la valeur seule
    ch.total ? `<b>${esc(volts(ch.total.dU))}</b>${ch.max != null ? ' sur ' + esc(volts(ch.max)) + ' admis' : ''}` : ch.dU == null && cmdF ? `<b>${esc('inconnue')}</b>` : `<b>${esc(volts(ch.dU))}</b>`, rU != null && isFinite(rU) ? rU : null, etatU, dU, bulleU);
  // le plus fin qui tient : la gauge que le moteur dit pour son disjoncteur (sinon la plus fine qui porte le courant), d'un clic
  // (« Seulement ce câble », sous le calibre ÉCRIT : celui du domaine C, 08-controle, `plusFinSousLeRetest`, sinon le nôtre)
  let seul = null; if (!neuf && prot && prot.cause && typeof plusFinSousLeRetest === 'function') { try { seul = plusFinSousLeRetest(l); } catch (_) { seul = null; } }
  const fin = neuf ? null : seul || plusFinQuiTient(l, prot && prot.calEcrit), cause = causeDuCable(l, prot, fin);
  const reparer = fin && !cause ? `<p class="fi-reparer-l"><span>${esc(majuscule(fin.pourquoi))} : <b class="id">${esc(fin.type)}</b> (${esc(String(jaugeDuType(fin.type)))} AWG)${(m => m ? ` <span class="fi-cout">· ${esc(m)}</span>` : '')(coutDuType(l, fin.type))}</span><button type="button" class="btn papier fi-reparer" data-reparer="${escA(cleFil(l))}" data-type="${escA(fin.type)}" data-bulle="${escA(majuscule(cableDit(l)) + ' passe en ' + fin.type + (coutDuType(l, fin.type) ? ' (' + coutDuType(l, fin.type) + ')' : '') + ' — « Défaire » le rend')}">Passer en ${esc(fin.type)}</button></p>` : '';
  // le résumé, section pliée, dit les deux valeurs (v74 : l'intensité n'a plus de tuile) — « 9,31 A sur 21 A · chute 0,37 V sur 2 V »
  const resumeI = cmdF ? esc('courant de commande inconnu') : !x.fn ? esc(amperes(x.I)) + ' · ce qu’il admet ne se lit pas' : [`${esc(amperes(iV))} sur ${esc(amperes(iA))}`, ch.total ? `chute ${esc(volts(ch.total.dU))}${ch.max != null ? ' sur ' + esc(volts(ch.max)) : ''}` : ch.dU != null ? 'chute ' + esc(volts(ch.dU)) : ''].filter(Boolean).join(' · ');
  const sections = [{ cle: 'trajet', resume: esc(`${l.de}${l.borneDe ? ':' + l.borneDe : ''} → ${l.vers}${l.borneVers ? ':' + l.borneVers : ''}`), badge: badgeProblemes(probs, 'trajet'), contenu: trajet },
    { cle: 'fils', titre: 'Intensité et chute', resume: insecable(resumeI), badge: badgeProblemes(probs, 'fils') || (x.fn ? { t: ico('coche'), etat: 'ok' } : { t: '—', etat: '' }), contenu: `<div class="fi-mesures">${intens}${chute}</div>${reparer}` }];
  const id = identite([l.route ? 'route ' + esc(l.route) : '', esc(motFolios(neuf ? [] : foliosDe(l).map(String)))]);
  const ecrits = neuf ? [] : changementsEcrits([[l, ['type', 'longueur', 'route', 'pnDe', 'pnVers', 'contactDe', 'contactVers']]]);
  // (v77, le lecteur : « les câbles n'ont plus de numéro, il faut mettre le type ») : sans numéro, le titre dit son type
  /* (v78, deux niveaux : 08-niveaux) LE TITRE, c'est son type (le lecteur : « plus de numéro de câble du tout ») ; dessous,
     d'où à où, chaque bout un lien ; LES CHIFFRES : le type et la gauge, la longueur (qui s'écrivent sur place), l'intensité
     et la chute contre l'admis. La cause (son disjoncteur) et la longueur supposée ouvrent l'onglet « Intensité et chute ». */
  const bt = (k, rep, borne) => `<button type="button" class="nv-bout" data-bout="${k}" data-bulle="${escA('Ouvrir ' + (rep || '—'))}"><b class="id">${esc(rep || '—')}</b>${borne ? `<i title="borne ${escA(borne)}">${esc(borne)}</i>` : ''}</button>`;
  const trajetL = `<p class="nv-trajet" style="--c:${coul}">${bt('de', l.de, l.borneDe)}<span class="nv-trajet-f" aria-hidden="true"></span>${passe.length ? `<span class="nv-trajet-via" data-bulle="${escA('Par ' + passe.join(', '))}">par ${esc(passe.map(t => t.split(' · ')[0]).join(', '))}</span><span class="nv-trajet-f" aria-hidden="true"></span>` : ''}${bt('vers', l.vers, l.borneVers)}</p>`;
  /* (v78) L'ESSENTIEL : son chemin dessiné, l'intensité et la chute contre l'admis, d'où viennent ces chiffres ; LA
     FABRICATION : le câble et le contact à sertir de chaque bout ; LES RÉGLAGES : le contact de chaque bout, sa route */
  const sousB = k => { const ct = cts[k]; return ct && ct.st ? 'contact ' + motSertir(ct.st) : ''; };
  const lgMot = L != null ? nombre(arrondi(L, 2)) + ' m' : neuf ? '' : nombre(H.longueur) + ' m supposés';
  const cheminG = cheminVue({ de: l.de, borneDe: l.borneDe, vers: l.vers, borneVers: l.borneVers, via: passe.map(t => t.split(' · ')[0]).join(', '), couleur: coul,
    type: l.type || 'sans type', legende: lgMot, sousDe: sousB('de'), sousVers: sousB('vers') }, largeurVue());
  const etapesF = neuf ? [{ html: `VOLTA le crée quand <b class="id">${esc(l.aPoser)}</b> est posée au contrat : il prend alors sa place dans votre fichier.`, source: 'calcul', etat: 'att' }] : [
    l.type ? { html: `Type <b class="id">${esc(l.type)}</b>${jauge != null ? `, gauge ${esc(String(jauge))} AWG` : ''} : ${cab ? 'la base des câbles le connaît' + (brins ? ' — ' + esc(brins) : '') : 'hors de la base des câbles'}.`, source: 'fichier', etat: cab ? '' : 'att' }
      : { html: 'Votre fichier ne donne pas son type : la gauge ne se vérifie pas.', source: 'fichier', etat: 'att' },
    // (v84, l'agent « câbles ») trois cas : côté source du disjoncteur, il l'alimente et n'est pas sous sa protection ; sans
    // profil de charge, le courant retenu est le calibre ; sinon, ce que tirent les équipements qu'il alimente
    // (v84, le courant par branche) quatre cas, dits tels qu'ils sont : il nourrit le disjoncteur (côté source) ; il porte sa
    // propre branche (la consommation écrite de ce qu'il alimente) ; il porte le total faute de consommation écrite en aval ;
    // le profil du disjoncteur manque et VOLTA prend son calibre
    x.al && x.al.amont ? { html: `Il nourrit <b class="id">${esc(x.al.nom)}</b> : il porte ses <b>${esc(amperes(x.I))}</b>, mais ${esc(x.al.nom)} ne le protège pas.`, source: 'calcul' }
      // (v86) la commande dont rien n'est écrit : son courant est inconnu, jamais le total — ce qu'il faut écrire
      : x.al && cmdF ? { html: `Il ne mène qu’à de la commande, sous <b class="id">${esc(x.al.nom)}</b> : son courant est inconnu — ${esc(motDeCommande(x))}. VOLTA ne lui prête pas le courant total du disjoncteur.`, source: 'calcul', etat: /^écrivez/.test(motDeCommande(x)) ? 'att' : '' }
      : x.al && x.source === 'branche' && x.aval ? { html: `Il alimente ${x.aval.bouts.map(r => `<b class="id">${esc(r)}</b>`).join(', ')} : <b>${esc(amperes(x.I))}</b> en continu, ${x.aval.bouts.length > 1 ? 'leurs consommations écrites' : 'sa consommation écrite'}${(x.aval.sans || []).length ? esc(' — sans ' + listeEt(x.aval.sans.map(y => (y.nature === 'bobine' ? 'la bobine de ' : 'l’entrée de ') + y.repere)) + ', que VOLTA ne connaît pas') : ''}.`, source: 'calcul' }
      : x.al && x.source === 'calibre' ? { html: `Le profil de <b class="id">${esc(x.al.nom)}</b> n’est pas écrit : VOLTA prend son calibre, <b>${esc(amperes(x.I))}</b>, au pire.`, source: 'calcul', etat: 'att' }
      : x.al && x.totalFaute && x.aval && x.aval.manque.length ? { html: `Courant total de <b class="id">${esc(x.al.nom)}</b>, <b>${esc(amperes(x.I))}</b> en continu : la consommation de ce qui est en aval (${x.aval.manque.map(r => `<b class="id">${esc(r)}</b>`).join(', ')}) n’est pas écrite.`, source: 'calcul', etat: 'att' }
      : x.al ? { html: `Le courant vient de <b class="id">${esc(x.al.nom)}</b>${calS ? ' (' + esc(amperes(calS)) + ')' : ''} : ce que tirent les équipements qu’il alimente, <b>${esc(amperes(x.I))}</b> en continu.`, source: 'calcul' }
      : { html: `Aucun disjoncteur en amont : VOLTA suppose <b>${esc(nombre(H.courant))} A</b>.`, source: 'hypothese', etat: 'att' },
    // (v86) ce que le courant traverse pour arriver à lui : un relais, un interrupteur, le contact supposé fermé (le pire cas)
    nT && x.al && !x.al.amont ? { html: `Le courant de <b class="id">${esc(x.al.nom)}</b> lui arrive à travers ${x.traverses.map(t => `<b class="id">${esc(t.repere)}</b> (${esc(t.quoi === 'interrupteur' ? 'interrupteur' : t.quoi + ', ' + t.de + ' → ' + t.a)})`).join(', ')} : ${nT > 1 ? 'contacts supposés fermés' : 'contact supposé fermé'}, le pire cas.`, source: 'calcul' } : null,
    x.fn ? { html: `Il admet <b>${esc(amperes(x.continu))}</b> en continu${esc(admisEnMots)}.`, source: 'norme', mot: 'EN 2853' } : null,
    L != null ? { html: `Longueur <b>${esc(nombre(arrondi(L, 2)))} m</b>.`, source: 'fichier' } : { html: `Longueur supposée <b>${esc(nombre(H.longueur))} m</b> : votre fichier ne la donne pas, et la chute en dépend.`, source: 'hypothese', etat: 'att' },
    ch.total ? { html: `Chute <b>${esc(volts(ch.total.dU))}</b> de ${esc(x.al.nom)} jusqu’à ${esc(boutU)}${ch.max != null ? ', pour ' + esc(volts(ch.max)) + ' admis' : ''} ; ce câble en fait ${esc(volts(ch.dU))}.`, source: 'calcul', etat: ch.trop ? (ch.reel ? 'ko' : 'att') : '' }
      : ch.dU != null ? { html: `Chute <b>${esc(volts(ch.dU))}</b> sur ce câble seul.`, source: 'calcul' } : null,
    ...['de', 'vers'].map(k => cts[k] && cts[k].st ? { html: `Côté <b class="id">${esc(l[k])}</b> : contact à sertir <b class="id">${esc(motSertir(cts[k].st))}</b>.`, source: cts[k].st.main ? 'main' : 'tables' } : null)];
  const fabF = neuf ? [] : [{ titre: 'Le câble', sous: l.route ? 'route ' + l.route : '', lignes: [{ q: 1, ref: l.type || '—', role: (L != null ? nombre(arrondi(L, 2)) + ' m' : nombre(H.longueur) + ' m supposés') + (cab && cab.nature ? ' · ' + cab.nature : '') }] },
    ...['de', 'vers'].filter(k => cts[k] && cts[k].st).map(k => { const bo = k === 'de' ? l.borneDe : l.borneVers; return { titre: 'Côté ' + l[k], sous: bo ? 'borne ' + bo : '', lignes: [{ q: 1, ref: motSertir(cts[k].st), role: 'contact à sertir' }] }; })];
  /* (v84, la passe « fiche » : le câble avait moins de soin que les autres) — L'ESSENTIEL en sections titrées, comme les
     autres fiches : ce qu'il relie (dessiné), le courant et la chute contre l'admis, d'où viennent ces chiffres */
  const essF = `<section class="vu-bloc vu-bloc-bro vu-bloc-chemin"><h4 class="vu-titre">Ce qu’il relie</h4>${cheminG}</section>${cause || ''}${hypL}`
    + `<section class="vu-bloc vu-bloc-mes"><h4 class="vu-titre">Courant et chute</h4><div class="fi-mesures">${intens}${chute}</div>${/* (v85) le geste « Passer en … » est déjà en tête, dans « À régler » : ici, l'information seule */ reparer.replace(/<button type="button" class="btn papier fi-reparer"[\s\S]*?<\/button>/, '')}</section>${pourquoiVue('D’où viennent ces chiffres', etapesF)}`;
  /* MODIFIER (v85, le lecteur : « ce qui vient de mon fichier, plus aucune saisie : une seule source ») — DANS VOTRE FICHIER :
     le type et la gauge, la longueur, ses deux bouts, la route, chacun avec d'où il vient ; une proposition justifiée de
     VOLTA (« Tout régler » quand son disjoncteur est la cause, la gauge qui porte son courant, celle qui se loge) se prend
     d'un clic, avec ce qu'elle coûte, et ira dans l'Excel corrigé. CHOIX DE VOLTA : le contact à sertir de chaque bout
     (Automatique | Manuel). INFORMATION : le courant et la chute, qui découlent du reste. */
  const avantL = c => l.avant && c in l.avant && l.avant[c] !== l[c] ? (l.avant['volta:' + c] !== undefined && l.avant['volta:' + c] === l[c] ? 'calcul' : 'main') : '';
  const motAvant = c => avantL(c) === 'calcul' ? 'corrigé par VOLTA' : avantL(c) === 'main' ? 'écrit dans VOLTA' : '', avantV = c => avantL(c) && l.avant[c] != null && l.avant[c] !== '' ? (c === 'longueur' ? esc(nombre(arrondi(+l.avant[c], 2)) + ' m') : ident(l.avant[c])) : '';
  const ctsMots = [...new Set(['de', 'vers'].map(k => cts[k] && cts[k].st ? motSertir(cts[k].st) : '').filter(Boolean))];
  const ctMain = ['de', 'vers'].filter(k => cts[k] && cts[k].st && cts[k].st.main), sansCt = ['de', 'vers'].filter(k => { const rep = l[k]; return rep && !cts[k] && !estMasse(rep) && !estDisjoncteur(rep) && !estRenvoi(rep); }).map(k => l[k]);
  const cP = prot && prot.cause, yLoge = fautes.find(y => y.propose), btnTout = (/<button type="button" class="btn cuivre" data-tout-regler[\s\S]*?<\/button>/.exec(cause || '') || [''])[0].replace('class="btn cuivre"', 'class="btn cuivre dense"');
  const propType = neuf ? null : cP && btnTout ? { phrase: `<b class="id">${esc(cP.cb)}</b> : le ${esc(amperes(cP.d.pn))} de votre fichier ${esc(motDuVerdict(cP.k === 'declenche' ? 'declenche' : 'juste'))}. VOLTA propose <b>${esc(amperes(cP.d.calibre))}</b>${cP.ce ? `, et <b class="id">${esc(cP.ce.x.propose)}</b> pour ce câble` : ''}.`, cout: cP.ce ? coutDuType(l, cP.ce.x.propose) : '', bouton: btnTout }
    : fin ? { phrase: `<b class="id">${esc(fin.type)}</b> (${esc(String(jaugeDuType(fin.type)))} AWG) : ${esc(fin.pourquoi)}.`, cout: coutDuType(l, fin.type), bouton: `<button type="button" class="btn cuivre dense fi-reparer" data-reparer="${escA(cleFil(l))}" data-type="${escA(fin.type)}" data-bulle="${escA(majuscule(cableDit(l)) + ' passe en ' + fin.type + ' — « Défaire » le rend')}">${esc('Passer en ' + fin.type)}</button>` }
    : yLoge ? { phrase: `<b class="id">${esc(yLoge.propose.type)}</b> : ${esc(`il se loge dans ${yLoge.rep}${yLoge.connecteur ? ' ' + yLoge.connecteur : ''} (borne ${yLoge.borne}) et porte son courant, ${amperes(arrondi(yLoge.propose.admis, 1))} admis`)}.`, cout: coutDuType(l, yLoge.propose.type), bouton: boutonReparer(yLoge).replace('btn papier', 'btn cuivre dense') } : null;
  const reglagesF = neuf ? null : ongletReglages([
    { sorte: 'fichier', titre: 'Le type', valeur: l.type ? ident(l.type) + (jauge != null ? ' · ' + esc(jauge + ' AWG') : '') : 'aucun', avant: avantV('type'), source: avantL('type') || 'fichier', motSource: motAvant('type'), etat: l.type && cab && !phy.length ? '' : 'att',
      pourquoi: !l.type ? 'Absent de votre fichier : la gauge ne se vérifie pas.' : !cab ? 'Inconnu de la base des câbles : ce qu’il admet ne se lit pas.' : 'Sa gauge décide du courant admis et de la chute.' + (dCab ? ' ' + esc(majuscule(dCab)) + '.' : ''), proposition: propType },
    { sorte: 'fichier', titre: 'La longueur', valeur: L != null ? esc(nombre(arrondi(L, 2)) + ' m') : '≈ ' + esc(nombre(H.longueur) + ' m'), avant: avantV('longueur'), source: L != null ? (avantL('longueur') || 'fichier') : 'hypothese', motSource: L != null ? motAvant('longueur') : 'supposée', etat: L == null ? 'att' : '',
      pourquoi: L != null ? 'La chute en dépend.' : `Absente de votre fichier : ${esc(nombre(H.longueur))} m supposés <span class="nv-insec">(<button type="button" class="fi-lien" data-hyp="1" data-bulle="La longueur supposée de tous les câbles sans longueur">Hypothèses</button>).</span>` },
    { sorte: 'fichier', titre: 'Ses deux bouts', valeur: `${ident(l.de + (l.borneDe ? ':' + l.borneDe : ''))} → ${ident(l.vers + (l.borneVers ? ':' + l.borneVers : ''))}`, source: 'fichier', pourquoi: 'Qui va où : VOLTA ne le change jamais.' },
    { sorte: 'fichier', titre: 'La route', valeur: l.route ? `<i class="fi-route" style="--c:${coul}"></i>${esc(l.route)}` : 'aucune', avant: avantV('route'), source: avantL('route') || 'fichier', motSource: motAvant('route'), pourquoi: l.route ? 'Elle donne sa couleur au câble sur le plan.' : 'Votre fichier n’en donne pas.' },
    ctsMots.length ? { sorte: 'choix', titre: 'Les contacts à sertir', valeur: ctsMots.map(t => ident(t)).join(' · '), source: ctMain.length ? 'main' : 'tables',
      pourquoi: ctMain.length ? 'Choisi ici côté ' + ctMain.map(k => esc(l[k])).join(' et ') + '.' : 'Un par bout, lu dans la table de la norme.',
      manuel: ctMain.length > 0, auto: 'sertirs:' + ctMain.map(k => cts[k].ks).join(';'), vers: '[data-reg="les-contacts"]', motAuto: 'Les contacts à sertir reviennent à ceux de la table.' }
      : sansCt.length ? { sorte: 'info', titre: 'Les contacts à sertir', valeur: 'à préciser', etat: 'att', source: 'norme', pourquoi: `La norme côté ${sansCt.map(r => ident(r)).join(' et ')} est inconnue : ils viendront avec elle.` } : null,
    cmdF ? { sorte: 'info', titre: 'Courant et chute', valeur: esc('inconnus'), source: 'calcul', etat: /^écrivez/.test(motDeCommande(x)) ? 'att' : '', pourquoi: esc('Une branche de commande : ' + motDeCommande(x) + '.') }
    : x.fn ? { sorte: 'info', titre: 'Courant et chute', valeur: `${esc(amperes(iV))} <small>sur ${esc(amperes(iA))}</small>` + (ch.total ? ` · ${esc(volts(ch.total.dU))}${ch.max != null ? ` <small>sur ${esc(volts(ch.max))}</small>` : ''}` : ch.dU != null ? ' · ' + esc(volts(ch.dU)) : ''), source: 'calcul', etat: classeMesure(r.charge.r) === 'ko' || etatU === 'ko' ? 'ko' : '', pourquoi: 'Ils suivent le type, la longueur, la charge.' }
      : { sorte: 'info', titre: 'Courant', valeur: esc(amperes(x.I)), source: 'calcul', pourquoi: esc(majuscule(motInconnu) + ' : ce qu’il admet ne se lit pas.') }],
    ctsMots.length ? regCarte('Les contacts à sertir', 'Un clic sur un contact montre ceux de sa taille : un autre se retient d’un clic.', `<ol class="fi-chemin" style="--c:${coul}">${etapes}</ol>${choixCt}`, { reg: 'les-contacts' }) : '');
  const onglets = [
    { cle: 'essentiel', statut: { t: cmdF ? 'courant de commande inconnu' : x.fn ? amperes(iV) + ' sur ' + amperes(iA) : neuf ? 'à créer' : amperes(x.I) + (l.type ? ', hors norme' : ', sans type'), etat: probs.some(q => q.niveau === 'ko') ? 'ko' : probs.length ? 'att' : 'ok' }, contenu: essF },
    ongletFabrication(fabF, 'Ce qu’il faut pour le poser'),
    reglagesF];
  // (v84) LES CHIFFRES de la carte : trois mesures, de même nature — le courant et la chute contre l'admis, la longueur ;
  // (v85) la longueur se lit (elle vient du fichier) : un clic mène à Modifier, qui dit d'où elle vient ; le type est le titre
  const chiffres = neuf ? [{ k: 'Type', v: l.type ? `<span class="id">${esc(l.type)}</span>` : '—' }, { k: 'Gauge', v: jauge != null ? valeurU(jauge, 'AWG') : '—' }] : [
    cmdF ? { k: 'Courant', v: esc('inconnu'), bulle: 'Courant de commande inconnu : ' + motDeCommande(x), onglet: 'fils' }
    : x.fn ? { k: 'Courant', v: valeurU(nombreA(iV), 'A'), barre: r.charge.r, etat: classeMesure(r.charge.r) === 'ko' ? 'ko' : '', bulle: 'sur ' + amperes(iA) + ' admis' + (x.al ? '' : ' — courant supposé'), onglet: 'fils' }
      : { k: 'Courant', v: valeurU(nombreA(x.I), 'A'), bulle: majuscule(motInconnu) + ' : ce qu’il admet ne se lit pas' + (x.al ? '' : ' — courant supposé'), onglet: 'fils' },
    ch.total || ch.dU != null ? { k: 'Chute', v: valeurU(volts(ch.total ? ch.total.dU : ch.dU).replace(/ V$/, ''), 'V'), barre: rU, etat: etatU === 'ko' ? (ch.reel ? 'ko' : 'att') : '', bulle: (ch.max != null && ch.total ? 'sur ' + volts(ch.max) + ' admis' : 'sur ce câble seul') + (ch.reel ? '' : ' — longueurs supposées'), onglet: 'fils' } : null,
    { k: 'Longueur', v: `${L == null ? '<i class="nv-env" aria-hidden="true">≈</i>' : ''}${esc(nombre(L != null ? arrondi(L, 2) : H.longueur))}<small>m</small>`, etat: L == null ? 'supp' : '', bulle: L == null ? 'Supposée : votre fichier ne la donne pas — à écrire dans votre fichier' : 'Celle de votre fichier', onglet: 'reglages' }];
  // le geste qui répare : « Tout régler » quand son disjoncteur est la cause, sinon le plus fin qui tient, sinon la gauge qui se loge
  const pris = h => ((/<button type="button" class="btn cuivre" data-tout-regler[\s\S]*?<\/button>/.exec(h || '') || [])[0] || (/<button type="button" class="btn papier fi-reparer"[\s\S]*?<\/button>/.exec(h || '') || [])[0] || '').replace(/class="btn (cuivre|papier)/, 'class="btn cuivre dense');
  const geste = pris(cause) || pris(reparer) || pris(loge);
  return composerFiche({ type: 'fil', tete: { nom: neuf ? 'Nouveau câble' : (l.type || 'Câble sans type') }, meta: [l.route ? `<i class="nc-route" style="--c:${coul}"></i>route ${esc(l.route)}` : '', cab && cab.nature ? esc(cab.nature) : ''],
    probs, onglets, sections, avant: trajetL, ecrits, proposes: [], chiffres, geste, identite: id,
    gestesTus: cause ? /^(Tout régler|Voir )/ : null, ok: x.fn ? 'Il porte son courant, et sa chute reste sous l’admis.' : 'Rien à reprendre.', pied: neuf ? { voir: l.aPoser } : { tableau: l.de, menu: MENU_FIL } }); }

/* ---- LE PIED ---------------------------------------------------------------------------------------------------------- */
/* Le récapitulatif (filtré sur l'objet), « voir », et sous « ··· » ce qu'on fait rarement (plus de « + câble » : une
   liaison de plus, c'est votre fichier). Collé en bas, toujours en vue, sobre : le premier geste est le principal (au filet),
   les suivants en clair (`.fantome`). */
function fiPied(o) { o = o || {};
  // (v78) dans la carte, « Tout voir » d'abord : la fiche entière, en grand, le plan à côté (08-niveaux)
  const gestes = [o.toutVoir ? { attrs: 'id="fi-tout-voir"', titre: 'Toute la fiche, en grand, le plan à côté — ou un double-clic sur l’objet', ico: 'agrandir', mot: 'Tout voir' } : null,
    o.tableau != null ? { attrs: `id="fi-tableau" data-filtre="${escA(o.tableau)}"`, titre: 'Ses liaisons dans le récapitulatif', ico: 'tableau', mot: 'Récapitulatif' } : null,
    o.fil ? { attrs: `id="fi-fil-plus" data-de="${escA(o.fil)}"`, titre: 'Ajouter un câble depuis ' + o.fil + ' : une ligne de plus dans le récapitulatif, à remplir', ico: 'plus', mot: 'Câble' } : null,
    o.voir ? { attrs: `data-choisir-bloc="${escA(o.voir)}"`, titre: '', ico: 'voir', mot: o.voir } : null].filter(Boolean);
  const boutons = gestes.map((g, k) => `<button type="button" class="fi-bouton${k ? ' fantome' : ''}" ${g.attrs}${g.titre ? ` data-bulle="${escA(g.titre)}"` : ''}>${ico(g.ico)}<span>${esc(g.mot)}</span></button>`).join('');
  const menu = (o.menu || []).map(([id, t, cls]) => `<button type="button" role="menuitem" id="${id}"${cls ? ` class="${cls}"` : ''}>${esc(t)}</button>`).join('');
  return `<footer class="fi-pied">${boutons}<span class="espace"></span>${menu ? `<div class="fi-plus"><button type="button" class="fi-x" id="fi-menu" aria-haspopup="true" aria-expanded="false" aria-label="Plus d’actions" data-bulle="${escA((o.menu || []).map(([, t]) => t).join(', '))}">${ico('points')}</button><div class="fi-menu" id="fi-menu-liste" role="menu" hidden>${menu}</div></div>` : ''}</footer>`; }
// le « ⋯ » : copier la fiche en texte (pour un courriel, une fiche d'écart). (v86, une seule source) Supprimer un équipement ou
// un câble, ou en ajouter un (« + Câble »), c'est changer votre fichier : ces gestes ont quitté la fiche — on change le fichier,
// VOLTA le relit. (Leurs gestionnaires, `eq-del`, `fil-del`, `fi-fil-plus`, ne trouvent plus de bouton.)
const MENU_BLOC = [['fi-copier', 'Copier la fiche']];
const MENU_FIL = [['fi-copier', 'Copier la fiche'], ['fil-tableau', 'Voir dans le récapitulatif']];

/* ---- LE RENDU ----------------------------------------------------------------------------------------------------------- */
// ce qui identifie un bouton de la fiche d'un rendu à l'autre : ses données et son identifiant (pas son texte, qui change)
// (sans sa bulle, qui change avec l'état qu'il montre : le cran retenu d'un cadran dit « Retenu. », plus « un clic le retient »)
const empreinteBouton = b => b.id + '|' + JSON.stringify(Object.entries(b.dataset).filter(([k]) => k !== 'bulle').sort());
function ficheBloc(nom) {
  if (VT_A_POSER.test(nom) || barretteEnModules(nom)) return ficheBarrette(nom);
  if (coupureEnModules(nom)) return ficheCoupure(nom);
  if (estMasse(nom)) return ficheMasse(nom);
  if (estBornier(nom)) return ficheBornierAncien(nom);
  return ficheEquipement(nom); }
// la fiche d'une cible, en HTML (sans la barre), et le nom que la barre écrit quand l'en-tête passe dessous
const ficheDe = c => c.type === 'fil' ? ficheFil(c.l) : c.type === 'ref' ? ficheComparaison(c) : ficheBloc(c.nom);
const nomDeCible = c => c.type === 'fil' ? (c.l.origine === null ? 'nouveau câble' : c.l.type || 'câble') : c.type === 'ref' ? 'Déjà fait · ' + c.harness : c.nom;
// ce qu'un rendu garde le temps de se faire : les intensités, les plans, les raccords
/* UN GESTE QUI SE DÉFAIT (plus de confirm()) : il se fait, le mot le dit, et « Rétablir » dedans le défait — le geste du
   toast (`dire`, troisième argument, 08-interface) ; Ctrl+Z aussi, l'historique est la vérité. `puis` : rouvrir ce qui
   revient. Pour tout l'outil : la fiche, le récapitulatif, le contrôle, les retouches. */
const direRetablir = (msg, puis) => dire(msg, false, { geste: 'Rétablir', faire: () => { const q = annuler(); if (q) dire('Rétabli : ' + q + '.'); if (puis) puis(); } });
const viderCalculs = () => { CALCULS.clear(); PLANS.clear(); HABILLAGES.clear(); CHUTES.cle = null; remettreAides(); };
/* LA FICHE NE BOUGE PLUS SOUS LA SOURIS (le technicien v73, point 8 : « je clique 20 A, la fiche défile toute seule, le
   cadran sort de l'écran ») : avant un rendu de la même fiche, l'ANCRE — ce que la main (ou le clavier) vient de toucher,
   et ses parents qui se retrouvent d'un rendu à l'autre (un bouton par son empreinte, une section, un groupe, une ligne,
   une liste de choix) — et sa hauteur à l'écran ; après, le premier qu'on retrouve revient à cette hauteur. */
const ANCRE = { el: null, t: 0 };
const cleDAncre = el => el.tagName === 'BUTTON' ? 'b' + empreinteBouton(el) : el.id ? '#' + el.id
  : ['section', 'part', 'volet', 'i', 'hab', 'panneau'].map(k => el.dataset && el.dataset[k] != null ? '[data-' + k + '="' + CSS.escape(el.dataset[k]) + '"]' : '').find(Boolean) || (el.classList.contains('fi-decision') ? '.fi-decision' : el.classList.contains('dj-verdict-l') ? '.dj-verdict-l' : '');
function ancresDe(box) { const a = document.activeElement, src = a && box.contains(a) && a !== box ? a : ANCRE.el && Date.now() - ANCRE.t < 4000 && box.contains(ANCRE.el) ? ANCRE.el : null; if (!src) return null;
  const out = []; for (let el = src; el && el !== box && out.length < 8; el = el.parentElement) { const k = cleDAncre(el); if (k) out.push({ k, top: el.getBoundingClientRect().top }); } return out.length ? out : null; }
function recaler(box, ancres) { for (const x of ancres) { let el = null;
    if (x.k[0] === 'b') { const e = x.k.slice(1); el = [...box.querySelectorAll('button')].find(b => empreinteBouton(b) === e) || null; } else { try { el = box.querySelector(x.k); } catch (_) { el = null; } }
    if (!el || !el.getClientRects().length) continue; const d = el.getBoundingClientRect().top - x.top; if (Math.abs(d) <= 0.5) return;
    // ce qui était au-dessus a rétréci (une carte de décision réglée) et la fiche est déjà en haut : une CALE tient l'élément
    // à sa place TANT QUE LA MAIN EST LÀ ; elle se referme en glissant quand la main quitte la carte ou fait défiler la fiche
    // (le prochain rendu la refait s'il le faut ; le mouvement réduit : refermée sans glisser)
    const manque = -(box.scrollTop + d); box.scrollTop += d;
    if (manque > 1) { const nav = box.querySelector('.fi-nav'), cale = document.createElement('div'); cale.className = 'fi-cale'; cale.setAttribute('aria-hidden', 'true'); cale.style.height = manque + 'px';
      if (nav) nav.after(cale); else box.prepend(cale);
      const fermer = () => { box.removeEventListener('pointerleave', fermer); box.removeEventListener('wheel', fermer); if (!cale.isConnected) return; if (mouvementReduit()) { cale.remove(); return; }
        cale.animate([{ height: cale.offsetHeight + 'px' }, { height: '0px' }], { duration: 300, easing: 'cubic-bezier(.65,0,.35,1)' }).onfinish = () => cale.remove(); };
      box.addEventListener('pointerleave', fermer); box.addEventListener('wheel', fermer, { passive: true }); }
    return; } }
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
  // (v77) une fiche qui casse le dit — et le bilan anonyme le garde (masqué), l'autotest le lit (`fi-erreur`, sa pile)
  catch (err) { FI.erreur = err; if (typeof noterErreurPage === 'function') noterErreurPage('fiche : ' + String(err && err.message || err));
    html = enTete({ type: 'equipement', genre: 'Élément', nom: c.nom || (c.l && c.l.cable) || '—' }) + `<p class="fi-note fi-erreur">${esc(String(err && err.message || err))}</p>`; }
  const nav = ficheEnGrand() && c.type !== 'ref' ? '' : barreNav({ fermer: c.type !== 'ref', nom: nomDeCible(c), epure: c.type !== 'ref' });
  const haut = box.scrollTop, a = document.activeElement, presse = meme && a && a.tagName === 'BUTTON' && box.contains(a) ? empreinteBouton(a) : null, ancres = meme ? ancresDe(box) : null;
  noterDefilements(box); box.innerHTML = nav + html; box.dataset.cle = cle; box.className = 'fi ' + (c.type === 'ref' ? '' : ficheEnGrand() ? 'nv-g' : 'nv-c'); box.dataset.type = c.type; rendreDefilements(box, meme);
  // les sections ouvertes et le défilement : ceux qu'on avait (la même fiche, un retour), sinon ceux de la mémoire, en haut
  const etat = (meme || restaurer) && entree && entree.sections; if (etat) box.querySelectorAll('details.fs').forEach(d => { if (d.dataset.section in etat && !d.classList.contains('fs-clos')) d.open = etat[d.dataset.section]; });
  const pbs = $('fi-pbs'); if (pbs && FI.pbs === cle) pbs.open = true;
  // l'entrée (le fondu, les jauges qui se remplissent) ne joue qu'une fois : la marque s'en va quand elle est finie, pour
  // qu'un rendu en place (un champ qu'on écrit) ne la rejoue pas sur ce qu'il remplace
  clearTimeout(FI.entree);
  if (meme) box.scrollTop = haut; else if (restaurer) box.scrollTop = restaurer.haut || 0; else { box.scrollTop = 0; box.classList.remove('fondu'); void box.offsetWidth; box.classList.add('fondu'); FI.entree = setTimeout(() => box.classList.remove('fondu'), 900); }
  if (restaurer && restaurer.panneau != null) { const p = $('nv-panneaux'); if (p) p.scrollTop = restaurer.panneau; }
  FI.rendu = meme ? 'meme' : 'neuf';
  if (c.type === 'ref') { lierComparaison(c); lierNav(box); const r = $('cp-retour'); if (r) r.onclick = () => naviguer(-1); } else lierFiche(c);
  if (presse) { const b = [...box.querySelectorAll('button')].find(x => empreinteBouton(x) === presse); if (b) { try { b.focus({ preventScroll: true }); } catch (_) { b.focus(); } } }
  // la même fiche refaite : ce que la main vient de toucher reste à sa hauteur d'écran
  if (ancres && !but) recaler(box, ancres);
  // ce que l'ouverture demandait : une section, une ligne allumée
  // (v78) le grand : l'onglet demandé, puis la ligne visée — dans l'onglet qui la porte ; la carte : rien à ouvrir
  if (but && box.querySelector('.nv-grand')) { if (but.section) activerOnglet(but.section, false);
    if (but.viser) { const xs = [...box.querySelectorAll(`[data-i="${CSS.escape(but.viser)}"]:not(.mj-contact)`)], li = xs.find(x => !x.closest('[hidden]')) || xs[0], p = li && li.closest('.nv-panneau');
      if (p && p.hidden) activerOnglet(p.dataset.section, false); viserDansLaFiche(but.viser); } }
  else if (but && !box.querySelector('.nc')) { const d = but.section ? ouvrirSection(box, but.section) : null;
    if (but.viser) { const li = box.querySelector(`[data-i="${CSS.escape(but.viser)}"]:not(.mj-contact)`); if (li) { const sec = li.closest('details.fs'); if (sec) sec.open = true; box.querySelectorAll(`[data-i="${CSS.escape(but.viser)}"]`).forEach(x => x.classList.add('vise', 'arrivee')); try { li.scrollIntoView({ block: 'center' }); } catch (_) { } } else if (d) d.scrollIntoView({ block: 'start' }); } }
  FI.viser = ''; suivreDefilement(box); }
/* REFAIRE EN PLACE la fiche montrée quand on écrit dans un de ses champs (le profil d'un disjoncteur, la désignation…) :
   la fiche se recalcule, et chaque morceau qui ne porte pas le champ sous les doigts est remplacé ; celui qui le porte
   garde son élément (et sa saisie), ses voisins suivent. Les sections restent comme l'ingénieur les a laissées. */
function rafraichirFicheEnPlace() { const box = $('ba-equip'), c = app.cible; if (!c || c.type === 'ref' || $('inspecteur').hidden || !box.dataset.type) return false;
  viderCalculs(); let html; try { html = (ficheEnGrand() ? '' : barreNav({ fermer: true, nom: nomDeCible(c), epure: c.type !== 'ref' })) + ficheDe(c); } catch (_) { return false; }
  const t = document.createElement('template'); t.innerHTML = html;
  const ouvertes = {}; box.querySelectorAll('details.fs').forEach(d => { ouvertes[d.dataset.section] = d.open; }); const pbs = $('fi-pbs'), pbsOuvert = !!(pbs && pbs.open);
  noterDefilements(box); const haut = box.scrollTop, cleDe = el => el.tagName === 'DETAILS' && el.dataset.section ? 'fs:' + el.dataset.section : (el.id || String(el.className).split(' ')[0]);
  const vieux = new Map([...box.children].map(el => [cleDe(el), el])), a = document.activeElement; let prec = null;
  [...t.content.children].forEach(n => { const v = vieux.get(cleDe(n)); vieux.delete(cleDe(n));
    if (v) { greffer(v, n); const el = v.isConnected ? v : n; prec = el; }
    else { if (prec) prec.after(n); else box.prepend(n); prec = n; } });
  vieux.forEach(v => { if (!v.contains(a)) v.remove(); });
  box.querySelectorAll('details.fs').forEach(d => { if (d.dataset.section in ouvertes && !d.classList.contains('fs-clos')) d.open = ouvertes[d.dataset.section]; });
  const pb2 = $('fi-pbs'); if (pb2) pb2.open = pbsOuvert;
  box.scrollTop = haut; rendreDefilements(box, true); FI.rendu = 'meme'; lierFiche(c); suivreDefilement(box); return true; }
/* Greffer le neuf sur le vieux : ce qui ne porte pas le champ sous les doigts est remplacé (s'il a changé) ; ce qui le
   porte garde son élément, prend les attributs du neuf, et l'on descend dans ses enfants. */
function greffer(vieux, neuf) { const a = document.activeElement;
  if (!vieux.contains(a)) { if (!vieux.isEqualNode(neuf)) vieux.replaceWith(neuf); return; }
  if (vieux === a || vieux.tagName !== neuf.tagName) return;
  [...neuf.attributes].forEach(x => { if (x.name !== 'open' && x.name !== 'value' && vieux.getAttribute(x.name) !== x.value) vieux.setAttribute(x.name, x.value); });
  const V = [...vieux.children], N = [...neuf.children]; if (V.length !== N.length) return;
  V.forEach((v, i) => greffer(v, N[i])); }
/* La barre écrit le repère quand l'en-tête passe dessous (mesuré à l'écran : pendant l'entrée, l'en-tête qui glisse
   devient le parent de mesure de son repère, et `offsetTop` ne dit plus rien de la fiche). */
function suivreDefilement(box) { const maj = () => { const n = box.querySelector('.fi-nom-ligne'), nav = box.querySelector('.fi-nav');
  box.classList.toggle('defile', !!n && !!nav && n.getBoundingClientRect().bottom - box.getBoundingClientRect().top < nav.offsetHeight); };
  if (!box.dataset.defile) { box.dataset.defile = '1'; box.addEventListener('scroll', () => { if (box.dataset.type) maj(); else box.classList.remove('defile'); }, { passive: true }); }
  maj(); }

/* ---- LA BULLE : le pourquoi, au survol — UNE RÈGLE pour tout l'outil (la fiche, le récapitulatif, les documents, la
   bibliothèque : `lierBulles(boîte)`) -------------------------------------------------------------------------------- */
/* Ce qui porte `data-bulle` (une ligne de câble, une pièce, un cran du cadran, une ligne des problèmes) dit, au survol, ce
   qu'il y a derrière ses chiffres. v73 (le designer, le technicien, l'ergonome : « elle surgit sous la souris immobile et
   cache Automatique » ; « elle reste sur la gamme qu'on vient d'ouvrir » ; « au clavier, elle ne paraît pas ») :
     · elle ne paraît qu'après un VRAI mouvement de la souris (3 px au moins) depuis le dernier rendu de sa boîte — jamais
       parce que le contenu a glissé sous une main immobile ;
     · la première attend 400 ms (`--bulle-delai`), les suivantes paraissent tout de suite pendant `--bulle-chaude` (on
       balaie une rangée, les noms suivent) ;
     · AU CLAVIER, tout de suite (le focus visible), et elle part avec lui ;
     · elle s'éteint à l'appui, et l'élément appuyé reste muet tant que la main ne l'a pas quitté : elle ne couvre jamais ce
       que le clic vient d'ouvrir ;
     · elle reste dans sa carte (ou sa feuille), à 12 px des bords de l'écran au moins ; sous l'élément, retournée au-dessus
       s'il n'y a pas la place. Pas sur ce qu'on écrit (un champ, une puce de contact) : la main y travaille. */
const BULLE = { el: null, t: 0, cible: null, montree: false, muette: '', fin: 0, souris: null, rendu: new WeakMap() };
const jetonMs = (n, d) => { try { const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(), x = parseFloat(v); return isFinite(x) ? (/ms$/.test(v) ? x : x * 1000) : d; } catch (_) { return d; } };
// l'identité d'un élément d'un rendu à l'autre (le même bouton refait n'est pas le même nœud) : sa balise, son id, ses données
const signatureBulle = el => el ? el.tagName + '|' + el.id + '|' + JSON.stringify(Object.entries(el.dataset).filter(([k]) => k !== 'bulle').sort()) + '|' + el.textContent.slice(0, 40) : '';
function cacherBulle() { clearTimeout(BULLE.t); if (BULLE.montree) BULLE.fin = performance.now(); BULLE.cible = null; BULLE.montree = false; if (BULLE.el) BULLE.el.hidden = true; }
function montrerBulle(c) { if (!c || !c.isConnected) return; const txt = c.dataset.bulle; if (!txt) return;
  if (!BULLE.el) { BULLE.el = document.createElement('div'); BULLE.el.className = 'fi-bulle bulle-texte'; BULLE.el.id = 'fi-bulle'; BULLE.el.setAttribute('role', 'tooltip'); document.body.appendChild(BULLE.el); }
  const b = BULLE.el; b.textContent = txt; b.hidden = false; BULLE.cible = c; BULLE.montree = true;
  const r = c.getBoundingClientRect(), w = b.offsetWidth, h = b.offsetHeight, W = window.innerWidth, H = window.innerHeight;
  // sa boîte : la carte, la feuille, le récapitulatif — sinon l'écran ; jamais à moins de 12 px de son bord
  const k = c.closest('#inspecteur, #fiche, #base, .rk-feuille'), q = k && !k.hidden ? k.getBoundingClientRect() : null;
  const L = Math.max(12, q ? q.left + 8 : 12), R = Math.min(W - 12, q ? q.right - 8 : W - 12), T = Math.max(12, q ? q.top + 8 : 12), B = Math.min(H - 12, q ? q.bottom - 8 : H - 12);
  const x = Math.max(L, Math.min(r.left + 8, R - w)), y = r.bottom + 6 + h <= B ? r.bottom + 6 : r.top - 6 - h >= T ? r.top - 6 - h : Math.max(T, Math.min(r.bottom + 6, B - h));
  b.style.left = Math.round(Math.max(12, x)) + 'px'; b.style.top = Math.round(Math.max(12, y)) + 'px'; }
// le dernier VRAI mouvement de la souris (3 px au moins depuis le précédent) : la bulle n'écoute pas un contenu qui glisse
document.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; const s = BULLE.souris;
  if (!s || Math.hypot(e.clientX - s.x, e.clientY - s.y) >= 3) BULLE.souris = { x: e.clientX, y: e.clientY, t: performance.now() }; }, { passive: true, capture: true });
// le rendu d'une boîte (la fiche refaite, le récapitulatif filtré) : ce qui est dessous n'a pas bougé de lui-même
const rendueA = box => { BULLE.rendu.set(box, performance.now()); };
function lierBulles(box) { if (box.dataset.bulles) return; box.dataset.bulles = '1'; rendueA(box);
  if (typeof MutationObserver === 'function') new MutationObserver(() => rendueA(box)).observe(box, { childList: true, subtree: true });
  const exclu = t => t.closest('.fi-cab-ed, .fi-q, input, select, textarea');
  const armer = c => { clearTimeout(BULLE.t); const chaude = performance.now() - BULLE.fin < jetonMs('--bulle-chaude', 1200);
    BULLE.t = setTimeout(() => { const s = BULLE.souris; if (BULLE.cible !== c || BULLE.montree || !s || s.t <= (BULLE.rendu.get(box) || 0) || signatureBulle(c) === BULLE.muette) return; montrerBulle(c); }, chaude ? 0 : jetonMs('--bulle-delai', 400)); };
  box.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; const t = e.target && e.target.closest ? e.target : null;
    const c = t && !exclu(t) ? t.closest('[data-bulle]') : null;
    // la main a quitté l'élément qu'elle avait appuyé : il peut reparler
    if (BULLE.muette && (!c || signatureBulle(c) !== BULLE.muette)) BULLE.muette = '';
    if (c !== BULLE.cible) { if (BULLE.montree || BULLE.cible) cacherBulle(); if (!c || !box.contains(c)) return; BULLE.cible = c; armer(c); return; }
    // la même cible, pas encore montrée (un rendu l'avait tue) : un vrai mouvement la réarme
    if (c && !BULLE.montree && BULLE.souris && BULLE.souris.t > (BULLE.rendu.get(box) || 0)) armer(c); }, { passive: true });
  // au clavier : tout de suite, et elle part avec le focus
  box.addEventListener('focusin', e => { const t = e.target; if (!t || !t.matches || exclu(t) || !t.dataset || !t.dataset.bulle || signatureBulle(t) === BULLE.muette) return; let v = false; try { v = t.matches(':focus-visible'); } catch (_) { } if (!v) return; clearTimeout(BULLE.t); montrerBulle(t); });
  box.addEventListener('focusout', e => { if (BULLE.cible === e.target) cacherBulle(); });
  // la boîte qui défile emporte la bulle ; l'appui l'éteint et rend l'élément muet jusqu'à ce que la main le quitte
  box.addEventListener('pointerleave', () => { cacherBulle(); BULLE.muette = ''; });
  // (celle du clavier suit son élément : Tab fait défiler la boîte jusqu'à lui)
  box.addEventListener('scroll', () => { if (!BULLE.montree) return; const c = BULLE.cible; if (c && c === document.activeElement && c.isConnected) montrerBulle(c); else cacherBulle(); }, { passive: true });
  box.addEventListener('pointerdown', e => { const c = e.target && e.target.closest ? e.target.closest('[data-bulle]') : null; BULLE.muette = c ? signatureBulle(c) : ''; cacherBulle(); }); }
// la main qui touche la fiche pose l'ancre (le clavier, lui, la pose par le focus)
document.addEventListener('pointerdown', e => { const b = $('ba-equip'); if (b && e.target && b.contains(e.target)) { ANCRE.el = e.target; ANCRE.t = Date.now(); } }, true);

/* ---- LES GESTES ----------------------------------------------------------------------------------------------------- */
/* Un écouteur posé une fois par élément : un rendu en place (`rafraichirFicheEnPlace`) relie la fiche sans doubler ceux
   des champs qu'il a gardés. */
const ECOUTES = new WeakMap();
const ecouter = (el, type, fn) => { const s = ECOUTES.get(el) || new Set(); if (s.has(type)) return; s.add(type); ECOUTES.set(el, s); el.addEventListener(type, fn); };
/* La barre : ‹ ›, × */
function lierNav(box) {
  const p = $('fi-prec'), s = $('fi-suiv'); if (p) p.onclick = () => naviguer(-1); if (s) s.onclick = () => naviguer(1);
  const x = $('in-fermer'); if (x) x.onclick = () => deselectionner();
  lierTaille(); }
/* Retenir un autre choix (un arrangement, une variante, une norme) ou rendre le calcul : une entrée d'historique, le
   plan et le contrôle suivent. */
// (v85) le mot qui le dit offre « Défaire »
const choisirDesignation = (cle, d, quoi, mot) => { histPush(quoi); designer(cle, d); apresEdition(); if (mot) dire(mot, false, { geste: 'Défaire', faire: defaire }); };
/* « Automatique » : chaque genre de valeur a son retour au choix de l'outil. `b` : le bouton (sa clé `data-auto`, sa ligne `data-k`).
   (v85, le sélecteur Automatique | Manuel de Modifier) : « sertirs » rend plusieurs contacts à la table d'un geste (clés
   séparées par « ; »), « raccords » rend un raccord entier au calcul (ses options et sa désignation, chaque partie d'une
   prise), « conso » efface la consommation écrite d'un équipement. */
function retourAutomatique(b, c) { const cle = b.dataset.auto, k = cle.indexOf(':'), genre = cle.slice(0, k), v = cle.slice(k + 1);
  if (genre === 'sertirs') { const ks = v.split(';').filter(Boolean); if (!ks.length) return; FI.liste = ''; histPush(ks.length > 1 ? 'contacts à sertir automatiques' : 'contact à sertir automatique');
    ks.forEach(x => { const { rep, borne } = deCleSertir(x); app.contrat.designations.delete(x);
      boutsSur(rep, borne).forEach(([l, ch]) => { delete l[ch]; if (l.avant && ch in l.avant) { const av = { ...l.avant }; delete av[ch]; if (Object.keys(av).length) l.avant = av; else delete l.avant; } }); });
    apresEdition(); return; }
  if (genre === 'raccords') { const ks = v.split(';').filter(x => x && app.contrat.raccords.has(x)); if (!ks.length) return; histPush('raccord automatique'); ks.forEach(x => app.contrat.raccords.delete(x)); apresEdition(); return; }
  if (genre === 'conso') { if (!app.contrat.charges || !app.contrat.charges.has(v)) return; histPush('consommation de ' + v + ' effacée'); app.contrat.charges.delete(v); apresEdition(); return; }
  if (genre === 'arr') { FI.liste = ''; choisirDesignation(v, '', 'choix automatique de ' + v, 'Choix automatique rétabli.'); return; }
  // (v85) le module d'une barrette en modules (« mod:667VT2|52 ») : rendu à VOLTA, les autres modules gardent leur choix
  if (genre === 'mod') { const i = v.lastIndexOf('|'), n = v.slice(0, i), num = v.slice(i + 1), avant = app.contrat.designations.get(n) || '', apres = moduleAutomatique(avant, num); if (apres === avant) return;
    FI.liste = ''; histPush('module ' + num + ' de ' + n + ' : choix de VOLTA'); designer(n, apres); apresEdition(); return; }
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
/* Renommer un repère d'ici : chaque câble suit, la pile aussi (‹ ramène au nouveau nom). Une barrette à poser se POSE. */
function renommerDepuisFiche(nom, nr) { nr = String(nr || '').trim(); if (!nr || nr === nom) return false;
  if (VT_A_POSER.test(nom)) { const xs = pileInsp().pile.filter(e => e.type === 'bloc' && e.nom === nom), box = $('ba-equip'), avant = box.dataset.cle;
    xs.forEach(e => { e.nom = nr; e.ancien = nom; }); if (avant === 'bloc|' + nom) box.dataset.cle = 'bloc|' + nr;
    // (v86, l'audit G2) le message dit le repère donné — « VT2 devient 667VT3 » — et offre « Défaire » (08-journal)
    const ok = typeof donnerSonRepere === 'function' ? !!donnerSonRepere(nom, app.plan, nr) : poserBarrette(nom, nr); if (!ok) { xs.forEach(e => { e.nom = nom; delete e.ancien; }); box.dataset.cle = avant; } return ok; }
  if (verite().some(l => l.de === nr || l.vers === nr)) { dire(nr + ' existe déjà dans votre fichier : choisissez un autre repère.', true); return false; }
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
  const d = ouvrirSection(box, section); if (d && o.viser) { box.querySelectorAll('.vise, .arrivee').forEach(x => x.classList.remove('vise', 'arrivee')); const li = d.querySelector(`[data-i="${CSS.escape(o.viser)}"]:not(.mj-contact)`); if (li) { li.classList.add('vise', 'arrivee'); try { li.scrollIntoView({ block: 'center', behavior: mouvementReduit() ? 'auto' : 'smooth' }); } catch (_) { } } } }
function lierFiche(c) { const box = $('ba-equip'), nom = c.type === 'fil' ? '' : c.nom, l = c.type === 'fil' ? c.l : null;
  lierNav(box); lierBulles(box); lierNiveaux(box, c);
  // un autre module de la même barrette, une autre partie de la même prise : sa fiche, sur son folio (le grand reste ouvert)
  box.querySelectorAll('[data-frere]').forEach(b => { b.onclick = () => { const n = b.dataset.frere; if (n && n !== nom) { const g = NIVEAU.grand; allerAuRepere(n); if (g && typeof ouvrirGrand === 'function') setTimeout(() => { try { ouvrirGrand(''); } catch (_) { } }, 60); } }; });
  // le récapitulatif de l'objet : son onglet (08-recap, `recapitulatifDe`), filtré sur lui — une masse, ses câbles dans Liaisons
  const tab = $('fi-tableau'); if (tab) tab.onclick = () => recapitulatifDe(c.type === 'bloc' && estMasse(c.nom) ? { type: 'fil', l: { cable: c.nom } } : c);
  // l'en-tête : le crayon (ou F2) met le repère sous les doigts
  const crayon = $('fi-crayon'), champNom = $('eq-rep') || $('fil-num'); if (crayon && champNom) crayon.onclick = () => { champNom.focus(); champNom.select(); };
  // la barre des problèmes : dépliée, elle le reste pour cette fiche ; une ligne mène à la section qui le démontre
  const pbs = $('fi-pbs'); if (pbs) ecouter(pbs, 'toggle', () => { FI.pbs = pbs.open ? box.dataset.cle : ''; });
  // la consommation d'un équipement : écrite en quittant le champ (ou à Entrée)
  box.querySelectorAll('[data-conso]').forEach(i => { i.onchange = () => ecrireConso(nom, i.dataset.conso, i.value.trim()); i.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); i.blur(); } }; });
  box.querySelectorAll('[data-voir]').forEach(b => b.onclick = () => allerDansLaFiche(box, nom, b.dataset.voir, { connecteur: b.dataset.connecteur, viser: b.dataset.viser }));
  // les segments de connecteur, la face d'un connecteur, la face d'une prise, « Changer » : la fiche se refait en place
  // une bulle de connecteur l'ouvre, sur place et allumée (v73, l'ingénieur : « un clic sur A ne l'ouvre pas ») — même quand la section est fermée
  box.querySelectorAll('.seg[data-connecteur]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); FI.connecteur[nom] = b.dataset.connecteur; FI.liste = ''; rendreFiche(); const bx = $('ba-equip'); if (bx && !ficheEnGrand()) ouvrirSection(bx, 'connecteur', true, true); });
  // la face d'un connecteur se montre d'office : un clic sur sa puce la replie, un autre la rend
  box.querySelectorAll('[data-face]').forEach(b => b.onclick = () => { const k = b.dataset.face; FI.face[k] = FI.face[k] === false; rendreFiche(); });
  box.querySelectorAll('[data-voir-face]').forEach(b => b.onclick = () => { FI.face[nom] = b.dataset.voirFace; rendreFiche(); });
  box.querySelectorAll('[data-gal-famille]').forEach(b => b.onclick = () => { FI.galerie[nom] = b.dataset.galFamille; rendreFiche(); });
  box.querySelectorAll('[data-changer]').forEach(b => b.onclick = () => { const k = b.dataset.changer; FI.liste = FI.liste === k ? '' : k; rendreFiche();
    const v = box.querySelector(`[data-volet="${CSS.escape(k)}"]`); if (v) { const f = v.querySelector('[data-filtre-liste]'); try { v.scrollIntoView({ block: 'nearest' }); } catch (_) { } if (f) f.focus(); } });
  box.querySelectorAll('[data-sertir]').forEach(b => b.onclick = e => { e.stopPropagation(); const k = 'sertir:' + b.dataset.sertir; FI.liste = FI.liste === k ? '' : k; rendreFiche(); });
  // v74, lot F : la carte d'un contact qui ne se change pas ici (une barrette, une prise) ; sa ligne dans les normes ; la chaîne
  // du connecteur (« D'où vient chaque pièce », dépliée sous les yeux)
  box.querySelectorAll('[data-ct]:not(.vu-ct-g)').forEach(b => b.onclick = e => { e.stopPropagation(); const k = 'ct:' + b.dataset.ct; FI.liste = FI.liste === k ? '' : k; rendreFiche(); });
  box.querySelectorAll('[data-normes-table]').forEach(b => b.onclick = e => { e.stopPropagation(); ficheNormes({ table: b.dataset.normesTable, filtre: b.dataset.filtre || '' }); });
  box.querySelectorAll('[data-trace]').forEach(b => b.onclick = e => { e.stopPropagation(); const d = box.querySelector('details.fi-trace'); if (!d) return; d.open = true; try { d.scrollIntoView({ block: 'start', behavior: mouvementReduit() ? 'auto' : 'smooth' }); } catch (_) { } });
  box.querySelectorAll('[data-filtre-liste]').forEach(f => ecouter(f, 'input', () => { const q = f.value.trim().toLowerCase(); f.closest('.fi-choix').querySelectorAll('.cand, .cand-l, .fi-chip').forEach(x => { x.hidden = !!q && !x.textContent.toLowerCase().includes(q); }); }));
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
  // « Automatique » (en tête d'une liste de choix) : rend le choix de l'outil — déjà retenu, il ne fait que fermer la liste
  box.querySelectorAll('[data-auto]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); if (b.getAttribute('aria-pressed') === 'true') { FI.liste = ''; rendreFiche(); return; } retourAutomatique(b, c); });
  box.querySelectorAll('[data-bible]').forEach(b => b.onclick = () => ficheBible(b.dataset.bible));
  // les câbles d'une fiche : le numéro ouvre sa fiche ; le type et la longueur s'écrivent dans la ligne
  box.querySelectorAll('[data-ouvrir-cable]').forEach(b => b.onclick = e => { e.stopPropagation(); const x = liaisonDeCle(b.dataset.ouvrirCable); if (x) allerAuFil(sourceDe(x) || x); });
  // les deux bouts du câble (v85 : son type, sa longueur, sa route viennent du fichier et ne s'écrivent plus ici)
  if (l) { box.querySelectorAll('[data-bout]').forEach(b => b.onclick = () => { const cote = b.dataset.bout, rep = l[cote], borne = cote === 'de' ? l.borneDe : l.borneVers; if (!rep) return;
      const g = estMasse(rep) ? null : connecteurParBorne(rep, liaisonsDeRepere(rep)).get(String(borne)); allerAuBloc(rep, estMasse(rep) ? { section: 'fils', viser: cleFil(l) } : { connecteur: g ? g.nom : '', section: 'connecteur', viser: cleFil(l) }); });
    if ($('fil-tableau')) $('fil-tableau').onclick = () => recapitulatifDe(c);
    // supprimer : fait tout de suite, « Rétablir » dans le toast (plus de boîte du navigateur ; Ctrl+Z aussi)
    if ($('fil-del')) $('fil-del').onclick = () => { const i = verite().indexOf(l); if (i < 0) return; const quoi = majuscule(l.type || 'câble') + ' (' + l.de + ' → ' + l.vers + ') supprimé (Ctrl+Z).';
      supprimerLiaison(i); deselectionner(); direRetablir(quoi, () => { const x = verite()[i]; if (x) montrerFil(x); }); }; }
  lierChoix(box, c);
  // « Copier la fiche » (le « ⋯ ») ; « ↺ » d'un changement par rapport au retest ; la gauge qui se loge ou qui tient, d'un clic ;
  // « et 7 autres points » de la carte de décision ouvre la barre des problèmes
  if ($('fi-copier')) $('fi-copier').onclick = () => copierLaFiche(box, nomDeCible(c));
  // (v86) « Défaire » d'une ligne de l'Historique : la valeur d'avant revient ; le message le dit et offre de défaire ce retour
  box.querySelectorAll('[data-hi]').forEach(b => b.onclick = e => { e.stopPropagation(); const x = (FI.journal || [])[+b.dataset.hi]; if (!x || typeof x.faire !== 'function') return;
    const avant = app.hist.length; x.faire(); if (app.hist.length !== avant || app.hist.length >= 40) dire(x.dit, false, { geste: 'Défaire', faire: defaire }); });
  // (v86) « L'historique de tout le plan » (08-journal)
  box.querySelectorAll('[data-journal]').forEach(b => b.onclick = e => { e.stopPropagation(); if (typeof ficheJournal === 'function') ficheJournal(); });
  // les gestes d'un point de la barre des problèmes (le domaine C, `gestesDuPoint`)
  box.querySelectorAll('[data-geste-pb]').forEach(b => b.onclick = e => { e.stopPropagation(); const [k, i] = b.dataset.gestePb.split(':').map(Number), g = ((FI.gestesPb || [])[k] || [])[i]; if (!g) return;
    const avant = app.cible; g.faire(); if (app.cible === avant && !$('inspecteur').hidden && !rafraichirFicheEnPlace()) rendreFiche(); });
  // « Tout régler » (la fiche d'un câble dont le disjoncteur est la cause) : le geste de la carte de décision du disjoncteur
  box.querySelectorAll('[data-tout-regler]').forEach(b => b.onclick = e => { e.stopPropagation(); const cb = b.dataset.toutRegler, fait = typeof toutRegler === 'function' ? toutRegler(cb) : typeof deciderCalibre === 'function' ? parVolta(() => deciderCalibre(cb)) : false; if (fait && !rafraichirFicheEnPlace()) rendreFiche(); });
  box.querySelectorAll('[data-reparer]').forEach(b => b.onclick = e => { e.stopPropagation(); const x = liaisonDeCle(b.dataset.reparer), y = x ? sourceDe(x) || x : null; if (!y) return;
    // (v84) le câble se dit AVANT le changement : après, cableDit(y) donne déjà le nouveau type (« DR18 … passe en DR18 »)
    const avant = cableDit(y);
    // (v85) refaite une fois la marque « proposition de VOLTA » posée (après le geste) : Modifier dit « corrigé par VOLTA »
    if (parVolta(() => changerLiaison(y, 'type', b.dataset.type, 'type de ' + avant + ' : ' + b.dataset.type))) { if (!$('inspecteur').hidden && app.cible && !rafraichirFicheEnPlace()) rendreFiche(); dire(majuscule(avant) + ' passe en ' + b.dataset.type + ' (Ctrl+Z le rend).'); } });
  box.querySelectorAll('[data-ouvrir-pbs]').forEach(b => b.onclick = () => { const d = $('fi-pbs'); if (!d) return; d.open = true; FI.pbs = box.dataset.cle; try { d.scrollIntoView({ block: 'nearest', behavior: mouvementReduit() ? 'auto' : 'smooth' }); } catch (_) { } });
  if (!nom) return;
  // le repère, dans l'en-tête ; le type et la désignation, à côté
  const rep = $('eq-rep'); if (rep) ecouter(rep, 'change', () => { if (!renommerDepuisFiche(nom, rep.value)) rep.value = nom; else { const r = $('fi-crayon'); if (r) r.focus(); } });
  const vtp = $('vt-poser'); if (vtp) vtp.onclick = () => { const v = $('vt-repere'); renommerDepuisFiche(nom, v ? v.value : ''); };
  // (v86) Entrée dans le repère proposé : le même geste que le bouton
  const vtr = $('vt-repere'); if (vtr && vtp) ecouter(vtr, 'keydown', e => { if (e.key === 'Enter') { e.preventDefault(); vtp.click(); } });
  const des = $('eq-des'); if (des) ecouter(des, 'change', () => { const v = des.value.trim(); if (v === (app.contrat.designations.get(nom) || '')) return; histPush('désignation de ' + nom); designer(nom, v); apresEdition(); });
  if ($('fi-renommer')) $('fi-renommer').onclick = () => { if (rep) { rep.focus(); rep.select(); } };
  if ($('fi-designer')) $('fi-designer').onclick = () => { const d = $('eq-des'); if (d) { d.focus(); d.select(); } };
  // supprimer : fait tout de suite, « Rétablir » dans le toast (plus de boîte du navigateur ; Ctrl+Z aussi)
  if ($('eq-del')) $('eq-del').onclick = () => { const n = verite().filter(x => x.de === nom || x.vers === nom).length;
    histPush('suppression de ' + nom); supprimerEquipement(nom); app.base.filtre = ''; deselectionner(); apresEdition();
    direRetablir(nom + ' supprimé, et ' + (n > 1 ? 'ses ' + n + ' liaisons' : 'sa liaison') + ' (Ctrl+Z).', () => { if (repereVivant(nom)) montrerBloc(nom); }); };
  if (box.querySelector('.equip') && typeof lierCartePhysique === 'function') lierCartePhysique(nom);
  lierDisjonction(nom); }
// le menu « ··· » se ferme d'un appui ailleurs (un seul écouteur, pour toutes les fiches)
document.addEventListener('pointerdown', e => { const l = $('fi-menu-liste'), m = $('fi-menu'); if (!l || l.hidden || (e.target.closest && e.target.closest('.fi-plus'))) return; l.hidden = true; if (m) m.setAttribute('aria-expanded', 'false'); }, true);
/* Les choix : une norme, une variante, un arrangement, le sexe, le part number, le raccord, le contact à sertir, la
   désignation d'un raccord ; « Déjà fait » ouvre la comparaison (en empilant). */
function lierChoix(box, c) { const nom = c.type === 'bloc' ? c.nom : '';
  box.querySelectorAll('[data-norme-barrette]').forEach(b => b.onclick = () => choisirDesignation(nom, b.dataset.normeBarrette, 'norme de ' + nom));
  box.querySelectorAll('[data-norme-prise]').forEach(b => b.onclick = () => choisirDesignation(nom, b.dataset.normePrise, 'norme de ' + nom));
  // (v85, Modifier : Manuel) un possible pris : la liste se replie, la ligne dit le choix, le mot offre « Défaire »
  const defaireMot = m => dire(m, false, { geste: 'Défaire', faire: defaire });
  box.querySelectorAll('.cand[data-cle], .cand-l[data-cle]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return; FI.liste = ''; NIVEAU.sommOuvert = ''; choisirDesignation(b.dataset.cle, b.dataset.ref, 'choix de ' + b.dataset.cle, b.dataset.ref + ' retenu à la main.'); });
  // (v85) une barrette en modules : un module de la norme retenu pour UN de ses modules (08-modules, `choisirModuleDeBarrette` :
  // l'historique, le mot et son « Défaire »)
  box.querySelectorAll('[data-mod-num]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return; FI.liste = ''; NIVEAU.sommOuvert = ''; choisirModuleDeBarrette(b.dataset.modNom, b.dataset.modNum, b.dataset.ref); });
  box.querySelectorAll('[data-garder]').forEach(b => b.onclick = () => choisirDesignation(nom, b.dataset.garder, 'la référence de votre fichier pour ' + nom, b.dataset.garder + ' retenu, comme votre fichier.'));
  box.querySelectorAll('[data-sexe]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return; const k = b.dataset.sexe, m = b.dataset.v === 'M', prise = typeof coupureEnModules === 'function' && coupureEnModules(k);
    NIVEAU.sommOuvert = ''; histPush('sexe des contacts de ' + k); app.contrat.sexes.set(k, b.dataset.v); apresEdition();
    defaireMot(prise ? 'Partie mobile ' + (m ? 'mâle, en broches' : 'femelle, en douilles') + ' : retenue à la main.' : 'Contacts ' + (m ? 'mâles' : 'femelles') + ' : retenus à la main.'); });
  box.querySelectorAll('[data-raccord]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return; const k = b.dataset.raccord, v = b.dataset.v, quoi = b.closest('.fi-opt') && b.closest('.fi-opt').querySelector('.fi-opt-k');
    histPush('raccord de ' + k); const o = { ...(app.contrat.raccords.get(k) || {}) }; o[b.dataset.champ] = v === 'true' ? true : v === 'false' ? false : v; app.contrat.raccords.set(k, o); apresEdition();
    defaireMot('Raccord' + (quoi ? ', ' + quoi.textContent.toLowerCase() : '') + ' : ' + b.textContent.trim() + '.'); });
  box.querySelectorAll('[data-rac-ref]').forEach(el => ecouter(el, 'change', () => { const k = el.dataset.racRef, v = el.value.trim(), o = { ...(app.contrat.raccords.get(k) || {}) }; if ((o.designation || '') === v || (!o.designation && v === el.defaultValue)) return;
    histPush('désignation du raccord de ' + k); if (v) o.designation = v; else delete o.designation; if (Object.keys(o).length) app.contrat.raccords.set(k, o); else app.contrat.raccords.delete(k); apresEdition(); }));
  box.querySelectorAll('[data-sertir-ref]').forEach(b => b.onclick = () => { const k = b.dataset.sertirRef; if (b.getAttribute('aria-pressed') === 'true') { FI.liste = ''; rendreFiche(); return; }
    const { rep, borne } = deCleSertir(k); FI.liste = ''; app.contrat.designations.delete(k); if (changerLiaisons(boutsSur(rep, borne).map(([l, ch]) => [l, ch, b.dataset.v]), 'contact à sertir') !== false) defaireMot(b.dataset.v + ', côté ' + rep + (borne ? ':' + borne : '') + ' : retenu à la main.'); });
  box.querySelectorAll('.fi-cand[data-ref]').forEach(b => { const aller = () => allerA({ type: 'ref', c: { type: 'ref', nom, harness: b.dataset.ref, repere: b.dataset.rep, fwd: b.dataset.fwd || undefined } });
    b.onclick = aller; b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aller(); } }; }); }
/* Les câbles de la fiche et le plan : survoler une ligne (ou un contact d'une face) allume le câble sur le plan et marque
   tout ce qui le montre dans la fiche ; un clic sur une ligne (ou Entrée) ouvre la fiche du câble — en empilant : ‹
   ramène ici ; un clic sur un contact d'une face le CHOISIT (sa ligne reste allumée, vient sous les yeux), un double
   clic ouvre sa fiche. */
function lierFils(box) { let dernier = null;
  const cible = t => t && t.closest && t.closest('.fi-fil[data-i], .fi-ia[data-i], .fi-cote[data-i], .dj-g-ligne[data-i], .fi-decision-cables li[data-i], .mj-contact.plein');
  // la ligne d'arrivée (« Vers », « De », un problème) reste allumée sous la souris qui passe : elle dit où l'on est arrivé
  const marquer = el => { const k = el.dataset.i; box.querySelectorAll('.vise:not(.arrivee)').forEach(x => x.classList.remove('vise'));
    if (!k) return; box.querySelectorAll(`[data-i="${CSS.escape(k)}"]`).forEach(x => x.classList.add('vise')); allumerCle(k); };
  const lacher = () => { dernier = null; box.querySelectorAll('.vise:not(.arrivee)').forEach(x => x.classList.remove('vise')); rallumer(); if (FI.choisi) allumerCle(FI.choisi); };
  const ouvrir = el => { const l = liaisonDeCle(el.dataset.i); if (l) allerAuFil(sourceDe(l) || l); };
  const choisir = k => { FI.choisi = FI.choisi === k ? '' : k; box.querySelectorAll('.choisi').forEach(x => x.classList.remove('choisi'));
    if (!FI.choisi) return; const xs = [...box.querySelectorAll(`[data-i="${CSS.escape(k)}"]`)]; xs.forEach(x => x.classList.add('choisi')); allumerCle(k);
    const li = xs.find(x => !x.matches('.mj-contact')); if (li) { const d = li.closest('details.fs'); if (d) d.open = true; try { li.scrollIntoView({ block: 'nearest', behavior: mouvementReduit() ? 'auto' : 'smooth' }); } catch (_) { } } };
  if (FI.choisi) box.querySelectorAll(`[data-i="${CSS.escape(FI.choisi)}"]`).forEach(x => x.classList.add('choisi'));
  box.onmouseover = e => { const el = cible(e.target); if (!el || el === dernier) return; dernier = el; marquer(el); };
  box.onmouseout = e => { if (!dernier) return; const vers = cible(e.relatedTarget); if (vers) return; lacher(); };
  box.onclick = e => { if (e.target.closest('button, input, select, a, label, .fi-choix, summary, .fi-cab-ed')) return; const el = cible(e.target); if (!el || !el.dataset.i) return; if (el.matches('.mj-contact')) choisir(el.dataset.i); else ouvrir(el); };
  box.ondblclick = e => { const el = e.target.closest && e.target.closest('.mj-contact.plein'); if (el && el.dataset.i) ouvrir(el); };
  box.onkeydown = e => { if (e.key === 'Escape' && FI.liste) { e.stopPropagation(); e.preventDefault(); FI.liste = ''; rendreFiche(); return; }
    const el = cible(e.target); if (el && (e.key === 'Enter' || e.key === ' ') && !e.target.matches('input, select, button')) { e.preventDefault(); ouvrir(el); } }; }
// un clic hors de la liste de choix ouverte la ferme — au clic, pas à l'appui : ce qu'on clique ne glisse pas sous le
// pointeur quand la liste disparaît (le clic garde sa cible) ; sans refaire la fiche
document.addEventListener('click', e => { if (!FI.liste) return; const t = e.target; if (!t || !t.closest) return;
  if (t.closest('.fi-choix, [data-changer], [data-sertir], [data-ct]:not(.vu-ct-g), .dj-crans')) return; const box = $('ba-equip'); if (!box || !box.contains(t)) return; FI.liste = '';
  box.querySelectorAll('.fi-choix-ligne, .fi-choix').forEach(x => x.remove()); box.querySelectorAll('[data-changer][aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false')); }, true);

/* « COPIER LA FICHE » (l'idée n°5 de l'audit : « un texte propre pour un courriel ou une fiche d'écart ») : le repère et
   sa ligne d'identité, les problèmes, ce qui change par rapport au retest, chaque section en une ligne, et les câbles en
   colonnes — lus dans la fiche telle qu'elle est montrée. */
function copierLaFiche(box, nom) { const t = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '', L = [];
  L.push([nom, t(box.querySelector('.fi-identite')), (box.querySelector('#eq-des') || {}).value || ''].filter(Boolean).join(' — '));
  const pbs = [...box.querySelectorAll('.fi-pb-l .fi-pb-t')].map(t); if (pbs.length) L.push('', t(box.querySelector('.fi-pb-n')), ...pbs.map(x => '  · ' + x));
  const ecs = [...box.querySelectorAll('.fi-ec-l')].map(li => '  · ' + t(li.querySelector('.fi-ec-q')) + ' : ' + t(li.querySelector('.fi-ec-v s')) + ' → ' + t(li.querySelector('.fi-ec-v b'))); if (ecs.length) L.push('', 'Par rapport au fichier d’origine', ...ecs);
  L.push(''); box.querySelectorAll('details.fs').forEach(d => L.push(t(d.querySelector('.fs-titre')) + ' : ' + t(d.querySelector('.fs-resume'))));
  const cab = [...box.querySelectorAll('.cb-carte')].map(li => { const v = s => { const e = li.querySelector(s); return e ? (e.value != null ? e.value : t(e)) : ''; };
    return '  ' + [v('[data-champ="cable"]') || t(li.querySelector('.cb-num')), (v('[data-champ="famille"]') + v('[data-champ="jauge"]')) || t(li.querySelector('.cb-type')), t(li.querySelector('.cb-i-v')), t(li.querySelector('.fi-u')), (v('[data-champ="longueur"]') || (li.querySelector('[data-champ="longueur"]') || {}).placeholder || '') + ' m'].join('\t'); });
  if (cab.length) L.push('', 'Câbles (numéro, type, intensité / admis, chute, longueur)', ...cab);
  const texte = L.join('\n').replace(/ /g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  const fini = () => dire('La fiche de ' + nom + ' est copiée : à coller dans un courriel ou une fiche d’écart.');
  const repli = () => { const a = document.createElement('textarea'); a.value = texte; a.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); fini(); } catch (_) { dire('La copie n’a pas pu se faire.', true); } a.remove(); };
  try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texte).then(fini, repli); else repli(); } catch (_) { repli(); } }

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
