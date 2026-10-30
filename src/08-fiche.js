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
     · LE PIED, collé en bas, sobre : le récapitulatif (le geste principal, au filet), « + câble », le relief (en
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
  echange: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
  coche: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  // « juste » (il passe sans la marge) : une vague, entre la coche et la croix
  vague: '<path d="M4.5 13.5c2.2-3.2 4.3-3.2 6.5 0s4.3 3.2 6.5 0"/>',
  // les réglages : deux curseurs
  reglages: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  livre: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H19v-3"/>',
  // la carte (08-carte) : l'épingler à droite (un volet), la détacher (une carte qu'on déplace)
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
const faceAjustee = (f, titre) => `<figure class="fi-face"><svg class="mj" viewBox="0 0 ${f1(f.w)} ${f1(f.h)}" style="max-width:${f1(Math.min(f.w * 1.25, 440))}px" role="img" aria-label="${escA(titre || 'Face')}">${f.svg}</svg>${titre ? `<figcaption>${esc(titre)}</figcaption>` : ''}</figure>`;
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
   bout de ce câble — un interrupteur, un relais à cosses —, Volta prend alors le plus petit contact qui admet sa gauge,
   par prudence (09 bis, `protegerFil` : la règle reste). La fiche le dit sous la ligne du problème. */
function gloseDuProbleme(t) { const m = /^(\S+) \((\w+?(\d{1,2}))\)[^:]*:.*?contact taille (\S+) (?:supposé \(([\d,]+\s?A)\)|\(([\d,]+\s?A), par la gauge\))/.exec(t);
  if (m) return `Le plan ne dit pas quel contact est serti au bout de ${m[1]} : Volta prend le plus petit qui admet un ${m[3]} AWG — la taille ${m[4]}, ${m[5] || m[6]} —, par prudence.`;
  if (/ supposé \(|par la gauge\)/.test(t)) return 'Le plan ne dit pas quel contact est serti : Volta prend le plus petit qui admet la gauge du câble, par prudence.';
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

/* LA BARRE : ‹ ›, discrets ; le repère en petit (il paraît quand l'en-tête passe dessous) ; l'épingle (la carte flottante
   devient le volet de droite, ou l'inverse : 08-carte) ; ×. Toute la barre se tient : on y déplace la carte. */
function barreNav(o) { o = o || {}; const I = pileInsp(), p = I.pile[I.pos - 1], n = I.pile[I.pos + 1];
  const prec = !!app.cible && (I.pos > 0 || app.insp.index), suiv = !!app.cible && I.pos < I.pile.length - 1;
  // ‹ et › disent où ils mènent (l'audit : « muets ») — dans la bulle de l'outil, pas celle du navigateur
  const tPrec = !prec ? 'Rien avant' : I.pos > 0 && p ? 'Revenir à ' + nomDEntree(p) : 'Revenir à la liste des repères', tSuiv = suiv && n ? 'Aller à ' + nomDEntree(n) : 'Rien après';
  return `<nav class="fi-nav" aria-label="Fiches vues"><button type="button" class="fi-pas" id="fi-prec"${prec ? '' : ' disabled'} aria-label="${escA(tPrec + ' (Alt+←)')}" data-bulle="${escA('‹ ' + tPrec + ' — Alt+←')}">${ico('gauche')}</button>`
    + `<button type="button" class="fi-pas" id="fi-suiv"${suiv ? '' : ' disabled'} aria-label="${escA(tSuiv + ' (Alt+→)')}" data-bulle="${escA(tSuiv + ' › — Alt+→')}">${ico('droite')}</button>`
    + `<span class="fi-nav-nom" aria-hidden="true">${esc(o.nom || '')}</span>${boutonEpingle()}${o.fermer === false ? '' : `<button type="button" class="fi-x" id="in-fermer" aria-label="Fermer (Échap)" data-bulle="Fermer — Échap">${ico('fermer')}</button>`}</nav>`; }
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
// (l'état de l'objet — ok, att, ko — se lit en un point à l'angle du symbole : `data-etat`)
const symbole = (type, coul, etat) => `<div class="fi-symbole" aria-hidden="true"${coul ? ` style="--c:${coul}"` : ''}${etat ? ` data-etat="${etat}"` : ''}><svg viewBox="0 0 30 30">${SYMBOLES[type] || SYMBOLES.equipement}</svg></div>`;
/* L'ÉTAT D'UNE FICHE, d'un mot : « ko » s'il y a un problème, « att » s'il n'y a que des points à voir, « ok » sinon. */
const etatDesProblemes = probs => probs.some(p => p.niveau === 'ko') ? 'ko' : probs.length ? 'att' : 'ok';
/* UNE TUILE (la fiche d'un câble seulement) : une étiquette (avec sa majuscule), une valeur forte — ou le champ qui
   l'écrit ; un état (son bord et sa valeur) quand la valeur pose problème. La valeur est du HTML déjà échappé. */
const tuile = (k, v, o) => { o = o || {};
  return `<div class="fi-tuile${o.etat ? ' ' + o.etat : ''}${o.mono ? ' mono' : ''}${o.edit ? ' edit' : ''}"${o.titre ? ` title="${escA(o.titre)}"` : ''}><span class="fi-tuile-k">${esc(k)}</span><span class="fi-tuile-v">${v}</span>${o.sous != null ? `<span class="fi-tuile-s">${o.sous || '&nbsp;'}</span>` : ''}</div>`; };
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
  const nom = o.champ ? `<input class="fi-nom" id="${o.champ}" value="${escA(o.nom)}" aria-label="${escA(o.aide || 'Repère — écrire pour renommer partout')}" spellcheck="false" autocomplete="off">`
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
function barreProblemes(probs, sections, o) { o = o || {}; if (!probs.length) return '';
  const titres = new Map(sections.filter(Boolean).filter(s => !s.vide || s.contenu).map(s => [s.cle, s.titre || SECTIONS[s.cle] || s.cle]));
  const ko = probs.filter(p => p.niveau === 'ko').length, att = probs.length - ko, tri = probs.filter(p => p.niveau === 'ko').concat(probs.filter(p => p.niveau !== 'ko'));
  // une seule règle (le technicien v73, point 5) : « problème » en rouge, « à voir » en ambre, séparés par « · »
  const mots = [ko ? `<b class="ko">${pluriel(ko, 'problème')}</b>` : '', att ? `<span class="att">${att > 1 ? att + ' à voir' : '1 point à voir'}</span>` : ''].filter(Boolean).join(' · ');
  // les gestes d'un point (le domaine C, `gestesDuPoint` : « Tout régler… », « Unifier sur… », « Voir 102CB1 ») : sous sa ligne, chacun
  // une fois dans la barre — et pas ceux que la fiche montre déjà ailleurs (`o.gestesTus`, la cause du câble)
  const vus = new Set(); FI.gestesPb = [];
  const gestesDe = p => { const gs = (p.gestes || []).filter(x => x && x.mot && typeof x.faire === 'function' && !vus.has(x.mot) && !(o.gestesTus && o.gestesTus.test(x.mot))); if (!gs.length) return '';
    const k = FI.gestesPb.push(gs) - 1; gs.forEach(x => vus.add(x.mot));
    return `<span class="fi-pb-gestes">${gs.map((x, i) => `<button type="button" class="btn ${x.principal ? 'papier' : 'lien'} dense" data-geste-pb="${k}:${i}"${x.aide ? ` data-bulle="${escA(x.aide)}"` : ''}>${esc(x.mot)}</button>`).join('')}</span>`; };
  const li = tri.map(p => { const s = titres.has(p.section) ? p.section : '', ou = !s ? '' : s === 'connecteur' && p.connecteur ? 'Connecteur ' + p.connecteur : titres.get(s), t = motDuProbleme(p.texte), g = gloseDuProbleme(p.texte);
    return `<li><button type="button" class="fi-pb-l ${p.niveau === 'ko' ? 'ko' : 'att'}"${s ? ` data-voir="${escA(s)}"` : ''}${p.viser ? ` data-viser="${escA(p.viser)}"` : ''}${p.connecteur ? ` data-connecteur="${escA(p.connecteur)}"` : ''} data-bulle="${escA(t + (g ? '\n' + g : '') + (p.bulle ? '\n' + p.bulle : ''))}">`
      + `<i aria-hidden="true"></i><span class="fi-pb-t">${insecable(esc(t))}</span>${ou ? `<span class="fi-pb-s">${esc(ou)}</span>` : ''}${g ? `<span class="fi-pb-g">${insecable(esc(g))}</span>` : ''}</button>${gestesDe(p)}</li>`; }).join('');
  // le premier point en clair — sauf celui qu'une carte de décision dit déjà (`o.taire`)
  // le premier point en clair, sur deux lignes au plus (l'ergonome v73 : « rognée, sans bulle ») — la bulle le donne en entier
  const p0 = tri.find(p => !(o.taire && o.taire.test(p.texte))) || tri[0], premier = p0 ? `<span class="fi-pb-1">— ${insecable(esc(motDuProbleme(p0.texte)))}</span>` : '';
  const entier = [ko ? pluriel(ko, 'problème') : '', att ? (att > 1 ? att + ' à voir' : '1 point à voir') : ''].filter(Boolean).join(' · ') + (p0 ? ' — ' + motDuProbleme(p0.texte) : '');
  return `<details class="fi-alerte ${ko ? 'ko' : 'att'}" id="fi-pbs"><summary class="fi-pb" id="fi-pb"><span class="fi-pb-k">Problèmes</span><span class="fi-pb-mots" data-bulle="${escA(entier)}"><span class="fi-pb-n">${mots}</span> ${premier}</span>${ico('bas', 'fi-chevron')}</summary><ul class="fi-pbs">${li}</ul></details>`; }

/* ---- PAR RAPPORT AU RETEST (l'idée n°1 de l'audit des fiches : « c'est ce que l'ingénieur doit reporter ; aujourd'hui
   éparpillé dans les problèmes, les bulles et "le retest dit" ») : sous les problèmes, une ligne repliée — « Par rapport
   au retest · 3 changements » — qui se déplie en une ligne par changement : ce qui a été écrit ici (le champ de la
   liaison, `l.avant` gardant ce que portait le fichier) et ce que Volta retient d'autre que le retest (un calibre, un
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
const objetDuChamp = (l, c) => c === 'pnDe' || c === 'de' || c === 'borneDe' ? l.de : c === 'pnVers' || c === 'vers' || c === 'borneVers' ? l.vers : c === 'contactDe' ? l.de + (l.borneDe ? ':' + l.borneDe : '') : c === 'contactVers' ? l.vers + (l.borneVers ? ':' + l.borneVers : '') : l.cable || 'câble sans numéro';
// ce qui a été écrit sur les liaisons d'un objet : `liaisons` [[l, champs (ceux qui le concernent)]] — un changement
// identique d'un même objet sur plusieurs liaisons (la référence d'un disjoncteur, en PN1 ici, en PN2 là) se dit une fois
function changementsEcrits(liaisons) { const m = new Map();
  liaisons.forEach(([l, champs]) => { if (!l || !l.avant) return; champs.forEach(c => { if (!(c in l.avant)) return; const avant = l.avant[c], apres = l[c] == null ? null : l[c]; if (avant === apres) return;
    const objet = objetDuChamp(l, c), k = objet + '|' + MOTS_CHAMPS[c] + '|' + avant + '|' + apres;
    if (!m.has(k)) m.set(k, { sujet: /^(pn|contact)/.test(c) ? '' : l.cable || 'câble', objet, colonnes: new Set(), champ: MOTS_CHAMPS[c] || c, avant: motValeur(c, avant), apres: motValeur(c, apres), rendre: [] });
    const x = m.get(k), col = colonneRetest(c); if (col) x.colonnes.add(col); x.rendre.push([l, c]); }); });
  return [...m.values()].map(x => ({ ...x, colonne: [...x.colonnes].sort().join(' · ') })); }
/* « Par rapport au retest · 1 modification » : une ligne par modification — sa colonne et son objet (« PN1 (102CB1) »),
   ce qu'il portait barré, ce qu'il porte ; « ↺ » le rend. Ce que Volta propose d'autre, marqué « Volta ». */
function blocRetest(ecrits, proposes) { const n = ecrits.length + proposes.length; if (!n) return '';
  const quoi = x => x.colonne ? `<b class="id">${esc(x.colonne)}</b> (${esc(x.objet || x.sujet || '')})` : `${esc(x.champ)}${x.objet ? ` (${esc(x.objet)})` : ''}`;
  const ligne = (x, i) => `<li class="fi-ec-l${x.volta ? ' volta' : ''}"><span class="fi-ec-q" data-bulle="${escA((x.colonne ? 'Colonne ' + x.colonne + ' du retest' : majuscule(x.champ) + ', hors des colonnes du retest') + (x.objet ? ' — ' + x.objet : '') + ' : ' + x.avant + ' → ' + x.apres)}">${quoi(x)}</span>`
    + `<span class="fi-ec-v"><s class="id">${esc(x.avant)}</s>${ico('fleche')}<b class="id">${esc(x.apres)}</b></span>`
    + (x.volta ? `<span class="fi-ec-o">${x.geste || 'Volta'}</span>` : `<button type="button" class="fi-ec-o fi-lien" data-rendre-retest="${i}" aria-label="${escA('Rendre ce que portait le retest : ' + x.avant)}" data-bulle="${escA('Rendre ce que portait le retest (' + x.avant + ')' + (x.rendre.length > 1 ? ' sur ses ' + x.rendre.length + ' liaisons' : '') + ' — Ctrl+Z le défait')}">↺</button>`) + '</li>';
  const mots = 'Par rapport au retest · ' + pluriel(n, 'modification') + (proposes.length ? ` · dont ${proposes.length} proposée${s_(proposes.length)} par Volta` : '');
  FI.ecarts = ecrits;
  return `<details class="fi-ecarts" id="fi-ecarts"><summary class="fi-ec"><span class="fi-pb-k">Retest</span><span class="fi-ec-mots" data-bulle="${escA(mots)}">${esc(mots)}</span>${ico('bas', 'fi-chevron')}</summary>`
    + `<p class="fi-ec-note">Ce qui change par rapport au retest, colonne par colonne, à reporter au bureau d’études.</p><ul class="fi-ec-liste">${proposes.map(x => ligne({ ...x, volta: true })).join('')}${ecrits.map(ligne).join('')}</ul></details>`; }

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
const ALIM = { cle: null, carte: null, V: null, premier: null, dj: new Map() };
function carteDesAlimentations() { const cle = typeof CONTROLE !== 'undefined' ? CONTROLE.cle : null, V = verite();
  if (ALIM.carte && cle && ALIM.cle === cle && ALIM.V === V && ALIM.premier === V[0]) return ALIM.carte;
  const m = new Map(); ALIM.dj = new Map();
  reperesDe(V).filter(estDisjoncteur).forEach(cb => { try { cheminsDepuis(V, cb).forEach(ch => ch.segments.forEach(s => { if (s.fil && !m.has(s.fil)) m.set(s.fil, { cb, chemin: ch }); })); } catch (_) { } });
  ALIM.cle = cle; ALIM.carte = m; ALIM.V = V; ALIM.premier = V[0]; return m; }
function infosDisjoncteur(cb) { if (ALIM.dj.has(cb)) return ALIM.dj.get(cb); const d = disjonctionDe(cb), pts = d.points.length ? d.points : pointsDuProfil(d.profil), perm = pts.find(p => p.t === Infinity), pointe = pts[0];
  // (le calibre ÉCRIT, v73 : celui qui sera monté — le retest tant que la proposition de l'outil ne l'est pas)
  const x = { nom: cb, calibre: d.calibreEcrit || d.calibre, perm: perm ? perm.i : null, pointe: pointe && pointe.t !== Infinity ? pointe : null, points: pts }; ALIM.dj.set(cb, x); return x; }
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
function chuteDuFil(l, x) { x = x || intensiteDuFil(l); const H = x.H, L = l.longueur > 0 ? l.longueur : H.longueur, dU = x.rd.rho != null ? x.rd.rho / 1000 * L * x.I : null;
  const total = x.al ? chuteEnLigne(l, x.al.nom) : null, admise = chuteAdmiseDe(H), max = total && total.admis != null ? total.admis : admise && admise.chuteMax != null ? admise.chuteMax : null, pointe = pireChuteEnPointe(total);
  return { L, dU, total, max, regle: total && total.regle ? total.regle : admise ? admise.regle || '' : '', hyp: !(l.longueur > 0), trop: !!(total && total.trop), reel: !!(total && total.reel), pointe, etat: etatDeChute(total, pointe) }; }
/* CE QU'UN AUTRE TYPE DE CÂBLE PORTERAIT à la place de celui-ci (la même famille, une autre gauge) : le courant qu'il
   porte (le profil du disjoncteur en amont, sinon l'hypothèse) contre ce que ce type admet, déclassé de même. Rend ce
   qu'il admet en continu, ou null s'il ne tient pas (ou que la norme ne le connaît pas). */
function tientLeCourant(l, type) { const x = intensiteDuFil(l), j = jaugeDuType(type), fn = j != null ? filDeNorme(app.norme, type, j) : null; if (!fn || fn.intensite == null) return null;
  const rd = resistanceDuFil(app.norme, type, j, x.H.tconducteur), fac = x.decl * facteurAmbiante(fn, x.H.ambiante) * (rd.kConducteur || 1);
  const pts = x.al ? x.al.points : [{ nom: 'hypothèse', i: x.I, t: Infinity }];
  return pts.every(p => p.i <= intensiteAdmise(fn, p.t) * fac + 1e-9) ? fn.intensite * fac : null; }
// les gauges d'une famille de câbles dans la base, de la plus grosse à la plus fine (DR : 6 … 26)
const gaugesDeFamille = fam => [...(famillesCables().get(String(fam || '').toUpperCase()) || [])].sort((a, b) => a - b);
/* LE PLUS FIN QUI TIENT (le parcours v72 : « W-012 en 18 reste rouge ; on essaie, on se trompe ») : sous un disjoncteur,
   la gauge que le moteur dit pour son calibre (09 bis, `jaugeQuiSuit` : porter la charge, admettre le calibre, rester
   protégé — la même que « Changer les câbles ») ; sans disjoncteur, la plus fine de sa famille qui porte le courant.
   `calibre` : celui sous lequel chercher — v73 (le technicien, n° 1 : « un câble DR12 dimensionné pour un 15 A qui n'est
   pas dans le fichier ») : tant que le calibre que l'outil propose n'est pas écrit, c'est celui du retest. Rend
   { type, pourquoi } ou null. */
function plusFinQuiTient(l, calibre) { const x = intensiteDuFil(l), p = partiesDuType(l.type); if (!l.type || p.jauge == null) return null;
  if (x.al) { try { const d = disjonctionDe(x.al.nom), f = (d.contexte.fils || []).find(y => y.l === l), cal = calibre > 0 ? calibre : d.calibreEcrit || d.calibre; if (f && cal > 0) { const H = { ...HYPOTHESES, ...(d.contexte.hyp || {}) }, ctx = contexteDeProtection(app.norme, H, d.courbes, pointsDuProfil(d.profil)), q = protegerFil(app.norme, cal, f, H, ctx);
    if (filSuit(q)) return null; const s = jaugeQuiSuit(app.norme, cal, f, H, ctx); return s ? { type: s.type, pourquoi: `le plus fin que protège le ${amperes(cal)}${cal !== d.calibre ? ' du retest' : ''} de ${x.al.nom}` } : null; } } catch (_) { } }
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
  const garde = p => !!p && (!!p.cause || /^(protection|contact|calibre|cause)$/.test(p.genre || '') || /protég|contact taille|calibre|retest/.test(p.texte || ''));
  let causeDeC = false;
  if (Array.isArray(deC)) deC.filter(garde).forEach(p => { if (p.cause || /retest/.test(p.texte || '')) causeDeC = true; out.probs.push({ niveau: p.niveau === 'ko' ? 'ko' : 'att', texte: p.texte, section: p.section || 'fils' }); });
  // (jugé sous le calibre ÉCRIT : tant que l'outil propose un autre calibre sans qu'il soit écrit, celui du retest — jamais le 15 A fantôme)
  else { const nonEcrit = typeof propositionNonEcrite === 'function' && propositionNonEcrite(d) && d.pn > 0, cal = nonEcrit ? d.pn : d.calibre, du = nonEcrit ? ' du retest' : '';
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
      if (!causeDeC) out.probs.push({ niveau: k === 'declenche' ? 'ko' : 'att', texte: `${cb} : le ${amperes(d.pn)} du retest ${k === 'declenche' ? motDuVerdict('declenche') : 'est ' + motDuVerdict('juste')} — il protège ce câble ; Volta propose ${amperes(d.calibre)}${ce ? ', ce qui demande ' + ce.x.propose + ' ici' : ''}`, section: 'fils', viser: undefined }); } }
  return out; }
/* La chaîne de cause, en tête de la fiche du câble (le technicien, n° 1) : ce que fait le disjoncteur, ce que Volta propose
   et ce que ça demande ; « Tout régler » (le même geste que la carte de décision du disjoncteur, `deciderCalibre`),
   « Seulement W-012 » (le plus fin que protège le calibre DU RETEST), « Voir 102CB1 ». */
function causeDuCable(l, prot, fin) { const c = prot && prot.cause; if (!c) return '';
  const { cb, d, k, xs, ce } = c, types = [...new Set(xs.map(p => p.x.propose))], nom = l.cable || 'ce câble';
  const tout = `Tout régler : ${cb} en ${amperes(d.calibre)}${xs.length ? ' et ' + (xs.length > 1 ? xs.length + ' câbles' : '1 câble') + (types.length === 1 ? ' en ' + types[0] : ' grossis') : ''}`;
  const phrase = `<b class="id">${esc(cb)}</b> : le ${esc(amperes(d.pn))} du retest ${k === 'declenche' ? motDuVerdict('declenche') : 'est ' + motDuVerdict('juste')}, et il protège ${esc(nom)}. Volta propose <b>${esc(amperes(d.calibre))}</b>${ce ? `, ce qui demande <b class="id">${esc(ce.x.propose)}</b> ici` : ''}.`;
  const seul = fin ? `<button type="button" class="btn papier fi-reparer" data-reparer="${escA(cleFil(l))}" data-type="${escA(fin.type)}" data-bulle="${escA(majuscule(fin.pourquoi) + ' : ' + fin.type + ' — ' + cb + ' garde son ' + amperes(d.pn) + ' ; Ctrl+Z le rend')}">Seulement ${esc(nom)} : ${esc(fin.type)}</button>` : '';
  return `<section class="fi-cause ${k === 'declenche' ? 'ko' : 'att'}" aria-label="${escA('La cause : ' + cb)}"><p class="fi-cause-p">${insecable(phrase)}</p><div class="fi-cause-gestes">`
    + `<button type="button" class="btn cuivre" data-tout-regler="${escA(cb)}" data-bulle="${escA('Écrit au retest : ' + ((d.meilleur || {}).pn && d.meilleur.calibre === d.calibre ? d.meilleur.pn : amperes(d.calibre)) + (xs.length ? ', et ' + xs.map(p => (p.x.cable || 'un câble') + ' en ' + p.x.propose).join(', ') : '') + ' — une seule entrée d’historique, Ctrl+Z défait le tout')}">${esc(tout)}</button>${seul}`
    + `<button type="button" class="btn lien dense" data-choisir-bloc="${escA(cb)}">Voir ${esc(cb)}</button></div></section>`; }

// les câbles d'un repère, chacun une fois (pas les shunts) : { l, borne, vers, borneVers, amont }
const filsDuRepere = nom => liaisonsDeRepere(nom).filter(l => (l.de === nom || l.vers === nom) && l.de !== l.vers).map(l => ({ l: sourceDe(l) || l, borne: l.de === nom ? l.borneDe : l.borneVers, vers: l.de === nom ? l.vers : l.de, borneVers: l.de === nom ? l.borneVers : l.borneDe, amont: l.vers === nom }));
// les barrettes à poser sur les bornes d'un repère : borne → VTn
const barrettesSur = nom => { const m = new Map(); liaisonsDuPlan().forEach(l => { if (l.origine === null && l.de === nom && l.vers === l.aPoser && l.borneVers === '1') m.set(String(l.borneDe), l.aPoser); }); return m; };

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
function choixSertir(ks, x, f, st) { const Q = x.Q, fam = Q ? Q.famille || (Q.modules && Q.modules[0] ? Q.modules[0].module.famille : '') : '';
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
  return `<div class="fi-choix" data-volet="${escA('sertir:' + ks)}">${voletT(`Contacts de taille ${x.taille || '?'}${x.sexe ? ', ' + nomDuSexe(x.sexe) + 's' : ''} — ✓ admet ${cable}`)}${filtre}`
    + (items || auto ? `<div class="fi-puces">${tete}${items}</div>` : '<p class="fi-note">La table Contacts de la norme n’en donne aucun de cette taille.</p>') + '</div>'; }
// un contact choisi à la main que la table connaît pour cette taille, mais qui n'admet pas ce câble : il est forcé, en rouge
const contactForce = (P, f, st) => { if (!(st && st.main && P && P.Q && f && f.type)) return false; const fam = P.Q.famille || (P.Q.modules[0] ? P.Q.modules[0].module.famille : '');
  return contactsDeTaille(app.norme, fam, P.taille).some(c => c.reference === st.reference) && !contactsPossibles(fam, P.taille, P.sexe, f.type).some(c => c.reference === st.reference); };

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
    // la ligne de la table Contacts : d'où vient le contact (vérifié, vos tables, à confirmer) ; et la base SEE quand elle a mis le sien à la place de celui de Volta
    const P = x.plan, fam = P && P.Q ? P.Q.famille || (P.Q.modules[0] ? P.Q.modules[0].module.famille : '') : '', ligne = st && !st.main && P && P.Q ? ligneDuContact(fam, P.taille, P.sexe, f && f.type) : null;
    const dSee = ligne && typeof differenceSEEMots === 'function' && ligne.reference === (st.reference || '') ? differenceSEEMots('contacts', ligne) : '';
    const tit = (mot ? 'Contact ' + mot + (st.main ? ' (choisi ici)' : ligne && ligne.source === 'SEE' ? ' (la base SEE)' : ' (la table de la norme)') : 'La table de la norme ne le dit pas') + (dSee ? ' — ' + dSee : '') + (ks ? ' — cliquer pour en choisir un autre' : '');
    const marque = dSee ? '<i class="ct-see" aria-hidden="true">SEE</i>' : '', conf = ligne && !meme && ligne.reference === (st.reference || '') ? repereConfiance(ligne, 'Vos tables SEE') : '';
    const sertir = ks ? `<button type="button" class="fi-sertir ct-ref${st && st.main ? ' main' : ''}${meme ? ' meme' : ''}" data-sertir="${escA(ks)}" aria-label="${escA(tit)}">${mot ? esc(mot) : '<i>choisir</i>'}${marque}</button>`
      : `<span class="fi-sertir ct-ref${meme ? ' meme' : ''}">${mot ? esc(mot) : '<i>—</i>'}${marque}</span>`;
    const force = contactForce(P, f, st), ok = x.ko || x.coupable || force ? false : x.plan && st ? true : null;
    const jauge = `<span class="fi-jg ct-jg${ok === false ? ' ko' : ok ? ' ok' : ''}">${j != null ? `${j}<small>AWG</small>` : '—'}${ok === false ? ico('fermer') : ok ? ico('coche') : ''}${x.coupable ? `<span class="ct-pourquoi">${esc(x.coupable)}</span>` : ''}</span>`;
    const bulle = [nomDuFil(f || {}), f && f.type ? f.type : '', j != null ? j + ' AWG' + (x.coupable ? ' : ' + x.coupable : ok === false ? ' refusée par le contact' : ok ? ' acceptée' : '') : ''].filter(Boolean).join(' · ') + (x.ko && x.ko !== 'gauge refusée par le contact' ? '\n' + x.ko : '') + (force ? '\nLe contact choisi ici n’admet pas ce câble' : '') + (o.sans ? '' : '\n' + tit);
    return `<li class="fi-fil ct-ligne${x.ko || x.coupable || force ? ' ko' : ''}${x.coupable ? ' coupable' : ''}${f && f.l && f.l.origine === null ? ' neuf' : ''}"${k ? ` data-i="${k}" tabindex="0" role="button"` : ''} data-bulle="${escA(bulle)}"><span class="fi-ct ct-pin">${x.ct}</span>${o.sans ? '' : `<span class="ct-sertir">${sertir}${conf}</span>`}${jauge}<span class="ct-cab">${f ? puceFil(f) : ''}<span class="fi-cab-n">${esc(f ? nomDuFil(f) : '')}</span></span></li>`
      + (ks && FI.liste === 'sertir:' + ks ? `<li class="fi-choix-ligne">${choixSertir(ks, x.plan, f, st)}</li>` : ''); }).join('');
  return `<ul class="ct-liste fi-contacts${o.sans ? ' ct-sans' : ''}${o.premiere === 'Contact' ? ' ct-bornes' : ''}"><li class="ct-legende"><span>${esc(o.premiere || 'Borne')}</span>${o.sans ? '' : `<span>Contact à sertir${aide('contact')}</span>`}<span>Gauge${aide('gauge')}</span><span>Câble</span></li>${rows}</ul>`; }
/* Le sexe des contacts, en deux puces qui ne bougent jamais (le lecteur : « fiche mâle, fiche femelle : le bouton change
   d'endroit, et le retour en arrière, ça sert à rien ») — celle qui est retenue est pressée. Une prise : la fiche (ce
   qui arrive) femelle ou mâle, l'embase l'inverse. */
const pucesSexe = (cle, sexe, mots) => `<span class="fi-seg-mini" role="group" aria-label="Sexe des contacts">${(mots || [['F', 'Femelles'], ['M', 'Mâles']]).map(([v, t, tt]) => `<button type="button" class="fi-chip" data-sexe="${escA(cle)}" data-v="${v}" aria-pressed="${sexe === v}"${tt ? ` data-bulle="${escA(tt)}"` : ''}>${esc(t)}</button>`).join('')}</span>`;
const sexeDeLaFiche = (cle, sexe) => pucesSexe(cle, sexe === 'M' ? 'M' : 'F', [['F', 'Fiche femelle', 'La fiche (ce qui arrive) en douilles, l’embase en broches'], ['M', 'Fiche mâle', 'La fiche (ce qui arrive) en broches, l’embase en douilles']]);

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
const datalistCables = () => `<datalist id="fi-cables">${cablesDe(app.norme).slice(0, 400).map(c => `<option value="${escA(c.cable)}">${escA([c.nature, c.diametre != null ? 'Ø ' + nombre(c.diametre) + ' mm' : ''].filter(Boolean).join(' · '))}</option>`).join('')}</datalist>`
  + `<datalist id="fi-familles">${[...famillesCables().keys()].sort(triNaturel).map(f => `<option value="${escA(f)}"></option>`).join('')}</datalist>`;
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
/* LE TYPE ET LA GAUGE d'un câble, deux champs côte à côte : la famille s'écrit (la base la propose), la gauge se choisit
   dans celles de la famille (une gauge hors de la base reste dans la liste, et la base le signale ailleurs). `attrs` :
   ce qui relie les champs à la liaison (`data-cable="clé"` d'une ligne, `data-edit` de la fiche du câble). */
function editeurType(attrs, type, o) { o = o || {}; const p = partiesDuType(type), js = [...(famillesCables().get(p.famille) || [])];
  if (p.jauge != null && !js.includes(p.jauge)) js.push(p.jauge); js.sort((a, b) => b - a);
  const fam = saisie(`${attrs('famille')}`, p.famille, { mono: true, ph: 'type', liste: 'fi-familles', label: 'Type de câble (sa famille : DR, MLB…)' + (o.num ? ' — ' + o.num : ''), cls: 'cb-fam' });
  const jauge = js.length ? `<span class="cb-sel"><select class="cb-jg" ${attrs('jauge')} aria-label="${escA('Gauge en AWG' + (o.num ? ' — ' + o.num : ''))}">${p.jauge == null ? '<option value="" selected>—</option>' : ''}${js.map(j => `<option value="${j}"${j === p.jauge ? ' selected' : ''}>${j}</option>`).join('')}</select>${ico('bas')}</span>`
    : saisie(`${attrs('jauge')}`, p.jauge != null ? String(p.jauge) : '', { court: true, ph: '—', mode: 'numeric', label: 'Gauge en AWG', cls: 'cb-jg' });
  return { fam, jauge, p }; }
// la couleur d'une mesure contre son admis : ambre au-delà de 80 %, rouge au-delà de 100 %
const classeMesure = r => r == null || !isFinite(r) ? '' : r > 1 + 1e-9 ? 'ko' : r > 0.8 ? 'att' : 'ok';
const nombreA = i => nombre(arrondi(i, i < 10 ? 2 : 1));
/* Ce qui s'écrit dans la ligne d'un câble : son numéro, son type et sa gauge (et d'où vient sa ligne de la base des
   câbles), sa longueur. */
function editionsDuCable(r) { const l = r.l, k = r.k, H = app.simu || HYPOTHESES, L = l.longueur > 0 ? l.longueur : null, lie = c => `data-cable="${escA(k)}" data-champ="${c}"`;
  const num = `<span class="cb-num-ed${l.cable ? '' : ' manque'}"${l.cable ? '' : ' data-bulle="Ce câble n’a pas de numéro dans le retest : il manque une information"'}>${saisie(lie('cable'), l.cable || '', { mono: true, ph: 'sans n°', label: 'Numéro du câble' })}</span>`;
  const T = editeurType(lie, l.type, { num: r.num }), cab = l.type ? cableDuType(app.norme, l.type) : null;
  const type = `<span class="cb-type-ed fi-ed">${T.fam}${T.jauge}${repereConfiance(cab, 'Votre base des câbles')}</span>`;
  const lon = `<label class="cb-lg fi-ed${L == null ? ' supp' : ''}">${saisie(lie('longueur'), L != null ? nombre(arrondi(L, 2)) : '', { court: true, ph: nombre(H.longueur), mode: 'decimal', label: 'Longueur du câble ' + r.num + ', en mètres' + (L == null ? ' (supposée : le retest ne la porte pas)' : '') })}</label>`;
  return { num, type, lon }; }
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
    return `<div class="cb-bande-l" data-bulle="${escA(k + ', les plus chargés : ' + tri.slice(0, 5).map(x => x.r.num + ' ' + pc(x.v)).join(' · '))}"><span class="cb-bande-k">${esc(k)}</span>`
      + `<span class="cb-piste" aria-hidden="true">${xs.map(x => `<i class="${classeMesure(x.v)}" style="left:${(Math.min(1.2, x.v) / 1.2 * 100).toFixed(1)}%"></i>`).join('')}</span>`
      + `<span class="cb-bande-max ${classeMesure(max.v)}"><b>${esc(pc(max.v))}</b><small class="id">${esc(max.r.num)}</small></span></div>`; };
  const h = piste('Intensité', r => r.charge.r) + piste('Chute', r => r.chute.u != null && r.chute.max ? r.chute.u / r.chute.max : null);
  return h ? `<div class="cb-bande">${h}</div>` : ''; }
function listeCables(rows, o) { o = o || {}; const rang = r => r.etat === 'ko' ? 0 : r.etat === 'att' ? 1 : 2;
  const maxs = [...new Set(rows.map(r => r.chute.max).filter(m => m != null))], seuil = maxs.length === 1 ? maxs[0] : null, regles = [...new Set(rows.map(r => r.chute.regle).filter(Boolean))];
  const qI = aide('intensite'), qU = aide('chute', seuil != null ? { admis: seuil, regle: regles.length === 1 ? regles[0] : '' } : null);
  const li = rows.slice().sort((a, b) => rang(a) - rang(b) || triNaturel(a.num, b.num)).map((r, n) => {
    const ed = r.l && r.l.origine !== null && r.k && r.k[0] !== 'p' ? editionsDuCable(r) : null;
    const num = ed ? ed.num : `<b class="cb-num${r.neuf ? ' neuf' : ''}">${esc(r.num)}</b>`, typeLu = ed ? ed.type : `<span class="cb-type id">${esc(r.type || '—')}</span>`;
    const ouvrir = r.k ? `<button type="button" class="cb-ouvrir" data-ouvrir-cable="${escA(r.k)}" aria-label="${escA('Ouvrir la fiche du câble ' + r.num)}" data-bulle="${escA('Ouvrir la fiche de ' + r.num)}">${ico('droite')}</button>` : '<span></span>';
    return `<li class="fi-ia fi-cab cb-carte${r.etat ? ' ' + r.etat : ''}"${r.k ? ` data-i="${r.k}"` : ''}${r.bulle ? ` data-bulle="${escA(r.bulle)}"` : ''} style="--n:${n}">`
      + `<span class="cb-puce">${r.puce || ''}</span>${num}${typeLu}${celluleI(r.charge)}${celluleU(r.chute)}${ed ? ed.lon : '<span class="cb-lg"></span>'}${ouvrir}`
      + (r.pourquoi ? `<span class="cb-pourquoi">${insecable(esc(r.pourquoi))}</span>` : '') + '</li>'; }).join('');
  const entete = `<li class="cb-entete"><span></span><span>Câble</span><span>Type</span><span>Intensité${qI}</span><span>Chute${seuil != null ? ' / ' + esc(volts(seuil)) : ''}${qU}</span><span class="dr">m</span><span></span></li>`;
  return (rows.length > 12 ? bandeDesCables(rows) : '') + `<ul class="fi-cables cb-liste${o.cls ? ' ' + o.cls : ''}">${entete}${li}</ul>${datalistCables()}`; }
/* La ligne d'un câble d'un repère : son intensité contre ce qu'il admet (au pire du permanent et de la pointe), sa chute
   en ligne depuis le disjoncteur en amont (sinon sur le câble seul), pourquoi il est à voir, et la bulle qui dit d'où
   viennent les chiffres. `f.coupable` : ce que le plan d'un connecteur en dit (aucun arrangement ne le loge). */
function ligneDeFil(f) { const l = f.l, x = intensiteDuFil(l), c = chuteDuFil(l, x);
  const rP = x.continu ? x.I / x.continu : null, rT = x.pointe && x.pointe.admis ? x.pointe.i / x.pointe.admis : null, r = Math.max(rP || 0, rT || 0), trop = x.trop.length > 0, pointeI = rT != null && rT > (rP || 0);
  const u = c.total ? c.total.dU : c.dU, supp = c.total ? !c.total.reel : c.hyp, motSupp = supp ? ', longueurs supposées' : '';
  const pourquoi = [trop ? `trop fin pour ${x.trop[0].nom} : ${amperes(x.trop[0].i)} > ${amperes(intensiteAdmise(x.fn, x.trop[0].t) * x.fac)}` : '',
    c.trop ? `chute en ligne ${volts(c.total.dU)} > ${volts(c.max)}${motSupp}` : c.pointe ? `chute en pointe ${volts(c.pointe.dU)} > ${volts(c.pointe.admis)}${motSupp}` : '', f.coupable || ''].filter(Boolean).join(' · ');
  const bulle = [`${l.cable || (l.origine === null ? 'câble à créer' : 'câble sans numéro')}${l.type ? ' · ' + l.type : ''} · ${x.al ? 'sous ' + x.al.nom + (x.al.calibre ? ' (' + amperes(x.al.calibre) + ')' : '') : amperes(x.H.courant) + ' supposés (aucun disjoncteur en amont)'}`,
    x.fn ? `permanent ${amperes(x.I)} sur ${amperes(x.continu)} admis en continu${motFacteur(x.fac)}` : (l.type ? 'hors de la norme des câbles : ce qu’il admet ne se lit pas' : 'sans type : ce qu’il admet ne se lit pas'),
    x.pointe && x.pointe.admis ? `pointe ${amperes(x.pointe.i)} pendant ${secondes(x.pointe.t)} sur ${amperes(x.pointe.admis)} admis` : '',
    c.total ? `chute en ligne depuis ${x.al.nom} vers ${c.total.bout[0]}${c.total.bout[1] ? ':' + c.total.bout[1] : ''} : ${volts(c.total.dU)}${c.max != null ? ' (' + volts(c.max) + ' admis)' : ''}${motSupp}` : c.dU != null ? `chute sur ce câble : ${volts(c.dU)} (${nombre(arrondi(c.L, 2))} m${c.hyp ? ' supposés' : ''})` : '',
    c.pointe ? `en pointe : ${volts(c.pointe.dU)} à ${amperes(c.pointe.i)} > ${volts(c.pointe.admis)} admis` : ''].filter(Boolean).join('\n');
  return { l, k: cleFil(l), num: nomDuFil({ ...f, cable: l.cable }), neuf: l.origine === null, puce: puceFil(f), jauge: x.jauge, type: l.type, bout: { rep: f.vers, borne: f.borneVers },
    // les chiffres de la barre : au pire, comme elle — la pointe quand c'est elle qui serre le plus
    charge: { r: x.fn ? r : null, mot: pointeI ? `${nombreA(x.pointe.i)} / ${nombreA(x.pointe.admis)} A` : x.continu ? `${nombreA(x.I)} / ${nombreA(x.continu)} A` : `${nombreA(x.I)} A`,
      i: pointeI ? x.pointe.i : x.I, admis: pointeI ? x.pointe.admis : x.continu || null, supp: !x.al },
    chute: { mot: volts(u), u, max: c.total ? c.max : null, regle: c.regle, supp }, etat: trop || c.etat === 'ko' || f.coupable ? 'ko' : c.etat === 'att' ? 'att' : '', pourquoi, bulle }; }
/* LA SECTION DES CÂBLES : le tableau, son résumé (combien, combien en défaut — ou, quand tous tiennent, le plus chargé),
   sa pastille. `o.note` : ce qui est supposé, dit une fois, en tête. */
function sectionFils(rows, probs, o) { o = o || {}; if (!rows.length) return { cle: 'fils', titre: o.titre, vide: 'aucun câble' };
  const ko = rows.filter(r => r.etat === 'ko').length, att = rows.filter(r => r.etat === 'att').length, rs = rows.map(r => r.charge.r).filter(x => x != null && isFinite(x)), pire = rs.length ? Math.max(...rs) : null;
  const resume = [pluriel(rows.length, 'câble'), ko ? `<span class="fi-ko-t">${ko} en défaut</span>` : att ? `<span class="fi-att-t">${att} à voir</span>` : 'tous tiennent' + (pire != null ? ` · au plus ${Math.round(pire * 100)} % de l’admis` : '')].join(' · ');
  return { cle: 'fils', titre: o.titre, resume: insecable(resume), badge: badgeProblemes(probs, 'fils') || (ko ? { t: String(ko), etat: 'ko' } : att ? { t: String(att), etat: 'att' } : { t: ico('coche'), etat: 'ok' }),
    contenu: (o.note ? `<p class="fi-note cb-note">${o.note}</p>` : '') + listeCables(rows, o) }; }
/* Les câbles d'un repère (équipement, barrette, prise) : une ligne chacun ; ce qui est supposé (le courant quand aucun
   disjoncteur n'est en amont, la longueur que le retest ne porte pas), dit une fois. `coupables` : câble → ce que le plan
   d'un connecteur en dit. */
function sectionFilsDuRepere(fils, probs, coupables) { const C = coupables || new Map(), rows = fils.map(f => ligneDeFil({ ...f, coupable: C.get(f.l) || '' })), H = app.simu || HYPOTHESES;
  const sansDj = fils.some(f => !intensiteDuFil(f.l).al), sansL = fils.some(f => !(f.l.longueur > 0));
  const supp = [sansDj ? `${nombre(H.courant)} A sans disjoncteur en amont` : '', sansL ? `${nombre(H.longueur)} m sans longueur au retest` : ''].filter(Boolean);
  return sectionFils(rows, probs, { note: supp.length ? `En italique, ce qui est supposé — une ${motHypothese} : ${esc(supp.join(', '))}.` : '' }); }

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
   références ») : un champ en chasse fixe ; on la retape pour la changer. */
function referenceConnecteur(nom, cle, bornes, pn) {
  return `<span class="fi-pn">${saisie(`data-pn="${escA(cle)}" data-bornes="${escA(bornes === '*' ? '*' : JSON.stringify(bornes.map(String)))}"`, pn, { mono: true, ph: 'à écrire', label: 'Référence' + (cle === '*' ? '' : ' du connecteur ' + cle) })}</span>`; }

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
    const montre = statutMontre(p.statut || '');
    return `<li class="fi-piece${sc ? ' ' + sc : ''}" data-role="${escA(p.role)}"${bulle ? ` data-bulle="${escA(bulle)}"` : ''}><span class="fi-piece-r">${esc(p.libelle || majuscule(p.role))}${q}</span>`
      + `${montre ? `<span class="fi-piece-st ${montre}">${esc(p.statut)}</span>` : '<span></span>'}${refH || p.quantite > 1 ? `<span class="fi-piece-ref">${refH}${conf}${p.quantite > 1 ? `<i class="fi-qte">× ${p.quantite}</i>` : ''}</span>` : ''}</li>`; }).join('');
  // les options : un réglage par ligne — son nom à gauche, ses segments à droite, celui qui est retenu en blanc
  const k = 'rac|' + cle, segments = `<div class="fi-options">${PUCES_RACCORD.map(([champ, t, opts]) => `<div class="fi-opt"><span class="fi-opt-k">${esc(t)}</span><span class="fi-opt-seg" role="group" aria-label="${escA(t)}">${opts.map(([v, m]) => `<button type="button" class="fi-opt-b" data-raccord="${escA(cle)}" data-champ="${champ}" data-v="${escA(v)}" aria-pressed="${String(c[champ] == null ? '' : c[champ]) === v}">${esc(m)}</button>`).join('')}</span></div>`).join('')}</div>`;
  const toron = h.faisceau && h.faisceau.diametre != null ? `toron Ø ${mm(h.faisceau.diametre)} mm` : '';
  const choix = [c.blindage && c.blindage !== 'NO' ? 'blindage repris' : '', c.etanche ? 'étanche' : '', c.orientation === 'coudé' ? 'coudé' : '', c.gaine ? 'gaine ' + c.gaine : ''].filter(Boolean).join(' · ');
  const options = h.tableau ? '' : `<button type="button" class="fi-options-b" data-changer="${escA(k)}" aria-expanded="${FI.liste === k}" data-bulle="Reprise de blindage, étanchéité, sortie, gaine">${ico('reglages')}<span>Options</span></button>`;
  return `<div class="fi-hab" data-hab="${escA(cle)}"${it.titre ? ` data-titre="${escA(it.titre)}"` : ''}><div class="fi-hab-tete">${it.titre ? `<span class="fi-hab-t">${esc(it.titre)}</span>` : ''}<span class="fi-hab-mots">${toron ? `<span data-bulle="${escA('D’où vient ce Ø : ' + (h.foisonnement && h.foisonnement.n ? 'les ' + h.foisonnement.n + ' câbles, chacun son Ø dans la base des câbles' : 'les câbles, leur Ø dans la base des câbles') + (h.foisonnement && h.foisonnement.regle ? ' ; ' + h.foisonnement.regle : ''))}">${insecable(esc(toron))}</span>` : ''}${toron && choix ? ' · ' : ''}${choix ? insecable(esc(choix)) : ''}${toron ? aide('toron', { habillage: h }) : ''}</span>${options}</div>`
    + (h.tableau ? '' : listeChoix(k, segments, { titre: 'Les options du raccord', cls: 'fi-options-choix' }))
    + (lignes ? `<ul class="fi-nomen">${lignes}</ul>` : `<p class="fi-note">${h.tableau ? 'Disjoncteur de tableau : ni raccord ni band-it.' : 'Rien à poser.'}</p>`) + '</div>'; }
/* ---- UN ÉQUIPEMENT ------------------------------------------------------------------------------------------------ */
// la section qu'un point du disjoncteur démontre : ses câbles (la charge, la protection, la chute en ligne), sinon lui
const sectionDj = t => /^chute en ligne/.test(t) || /^(?![\d])\S+ \(|^(fil|câble) sans numéro|^borne /.test(t) ? 'fils' : 'disjoncteur';
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
const boutonReparer = x => x.propose ? `<button type="button" class="btn papier fi-reparer" data-reparer="${escA(cleFil(x.l))}" data-type="${escA(x.propose.type)}" data-bulle="${escA(`${x.l.cable || 'Ce câble'} en ${x.propose.type} : le contact ${x.contact ? x.contact.lettre + ' (taille ' + x.contact.taille + ')' : ''} du ${x.module.variante} l’admet, et il porte son courant (${amperes(arrondi(x.propose.admis, 1))} admis) — Ctrl+Z le rend`)}">${esc((x.l.cable || 'Le câble') + ' en ' + x.propose.type)}</button>` : '';
function problemesEquipement(nom, cav, b, vt, dj) { const probs = [];
  cav.forEach(c => { const cps = coupablesDu(c.plan, c.points);
    c.plan.verdicts.forEach(v => { if (v.niveau === 'ko') probs.push({ niveau: 'ko', texte: c.nom + ' · ' + v.texte, section: 'connecteur', connecteur: c.nom, viser: v.coupables && cps[0] ? cleFil(cps[0].l) : undefined });
      else if (v.niveau === 'attention' && !/^contact \S+ : \d+ (fils|câbles)/.test(v.texte)) probs.push({ niveau: 'att', texte: c.nom + ' · ' + v.texte, section: 'connecteur', connecteur: c.nom }); }); });
  const parBorne = connecteurParBorne(nom, liaisonsDeRepere(nom));
  [...b.parBorne].filter(([, fs]) => fs.length > 1).forEach(([bo, fs]) => { const g = parBorne.get(String(bo));
    probs.push({ niveau: 'att', texte: `borne ${bo} : ${fs.length} câbles — ${vt.has(String(bo)) ? 'barrette ' + vt.get(String(bo)) : 'une barrette'} à poser`, section: dj ? 'fils' : 'connecteur', connecteur: !dj && g ? g.nom : undefined }); });
  if (dj) controleDisjonction(nom).forEach(x => probs.push({ niveau: x.niveau === 'ko' ? 'ko' : 'att', texte: x.texte, section: sectionDj(x.texte) }));
  // ce que le contrôle du contrat relève en plus sur ce repère (un conducteur CCA, ce qu'un disjoncteur nourrit au-delà d'un passage)
  ((typeof CONTROLE !== 'undefined' && CONTROLE.items) || []).filter(x => x.nom === nom && !probs.some(p => p.texte === x.texte)).forEach(x => probs.push({ niveau: x.niveau === 'ko' ? 'ko' : 'att', texte: x.texte, section: dj ? sectionDj(x.texte) : x.section || 'connecteur' }));
  return probs; }
/* Ce qui a été écrit ici sur les liaisons d'un repère (« Par rapport au retest ») : de son côté, la référence et le
   contact ; de ses câbles, le numéro, le type, la longueur, la route. */
const ecritsDuRepere = nom => changementsEcrits(verite().filter(l => (l.de === nom || l.vers === nom) && l.avant).map(l => [l, ['cable', 'type', 'longueur', 'route', ...(l.de === nom ? ['pnDe', 'contactDe'] : []), ...(l.vers === nom ? ['pnVers', 'contactVers'] : [])]]));
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
    const compte = kx && kx.plan.modules[0] ? `${kx.plan.utilises} contacts pris sur ${kx.plan.modules[0].module.contacts.length}` : pluriel(n, 'borne'), raison = probs.filter(p => p.connecteur === id && p.niveau === 'ko').map(p => p.texte).join(' ; ');
    return `<button type="button" class="seg ct-bulle${fautif(id) ? ' ko' : ''}" data-connecteur="${escA(id)}" aria-pressed="${id === sel}" aria-label="${escA((id === '—' ? 'Les bornes sans connecteur' : 'Le connecteur ' + id) + ' · ' + compte + (raison ? ' — ' + raison : ''))}" data-bulle="${escA((id === '—' ? 'Les bornes sans connecteur' : 'Connecteur ' + id) + ' · ' + compte + (raison ? '\n' + raison : ''))}">${id === '—' ? 'sans' : esc(id)}</button>`; }).join('')}</span>` : '';
  const c = C.find(k => k.nom === sel) || null, k = c ? parNom.get(c.nom) || null : null;
  const corps = c ? corpsConnecteur(nom, c, k, b, vt) : sel === '—' ? corpsSansConnecteur(nom, sans, b, vt) : '';
  // le RACCORD du connecteur montré, dans la même section (le lecteur : « le raccord, je l'aurais mis avec le connecteur :
  // tout ce qui est connecteur, tyrap, etc., c'est le même »)
  const filsC = c ? c.bornes.flatMap(bo => b.parBorne.get(bo) || []).filter(f => f.l) : [], M = k && k.plan.modules[0];
  const raccord = c && filsC.length ? groupeSection('Raccord', raccordHtml({ cle: nom + '|' + c.nom, fils: filsC, pn: c.pn, ref: M ? M.reference : '', plan: M ? k.plan : null }), { cls: 'fi-groupe-raccord' }) : '';
  // le résumé de la ligne « Connecteur » : sa référence (une, sinon combien), puis les bulles
  const pns = [...new Set(C.map(x => x.pn).filter(Boolean))], refs = pns.length === 1 ? ident(pns[0]) : pns.length > 1 ? esc(pluriel(pns.length, 'référence')) : '';
  // les câbles qu'un plan de connecteur ne loge pas : leur ligne dans « Câbles » le dit
  const coupables = new Map(); cav.forEach(x => coupablesDu(x.plan, x.points).forEach(y => coupables.set(y.l, `connecteur ${x.nom} : aucun arrangement ne le loge (${y.mot} pour la borne ${y.borne})`)));
  // (le compte rouge au bout de la ligne se tait quand la bulle du connecteur fautif le dit déjà — le technicien v73 : « le 1 rouge répète l'info »)
  const pbC = probs.filter(p => p.section === 'connecteur'), dejaDit = pbC.length > 0 && pbC.every(p => p.niveau === 'ko' && p.connecteur && fautif(p.connecteur));
  const sections = [{ cle: 'connecteur', titre: 'Connecteur', resume: (refs ? `<span class="fs-ref">${refs}</span>` : '') + bulles || (ids.length ? '' : 'aucune borne'), badge: dejaDit ? null : badgeProblemes(probs, 'connecteur'), contenu: `<div class="fi-panneau" data-panneau="${escA(sel)}">${corps}${raccord}</div>`, vide: ids.length ? '' : 'aucune borne' },
    sectionFilsDuRepere(fils, probs, coupables), sectionDejaFait(nom)];
  const id = identite([majuscule(natureDe(nom)), descriptionDuRetest(nom) ? esc(descriptionDuRetest(nom)) : '', pns.length === 1 ? ident(pns[0]) : '', C.length > 1 ? pluriel(C.length, 'connecteur') : '', esc(motFolios(foliosDuRepere(nom)))]);
  return enTete({ type: 'equipement', designation: nom, nom, champ: 'eq-rep', etat: etatDesProblemes(probs), identite: id }) + barreProblemes(probs, sections) + blocRetest(ecritsDuRepere(nom), []) + ficheSections('equipement', sections)
    + fiPied({ tableau: nom, fil: nom, relief: cav.length > 0, menu: MENU_BLOC }); }
/* LE CONNECTEUR montré : sa RÉFÉRENCE d'abord (un champ ; plus de « part number » ni de « norme » à compléter) ; quand
   la norme est connue, l'ARRANGEMENT que Volta retient (en puce, son « ? » ; « Changer » ouvre la liste : « Automatique »
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
function autresArrangements(cle, points, fam, vs, retenu) { const N = app.norme, NM = normeDesModules(N), n = points.length;
  const trop = (m, c, f) => { const T = tailleDe(NM, m.famille, c.taille); return T && f.jauge != null && T.jaugeMax != null && f.jauge < T.jaugeMax ? 'trop gros' : T && f.jauge != null && T.jaugeMin != null && f.jauge > T.jaugeMin ? 'trop fin' : 'refusé'; };
  const autres = NM.modules.filter(m => m.emploi === 'connecteur' && (!fam || m.famille === fam) && !vs.includes(m)).map(m => { const r = poserPoints(NM, m, points), ok = r.pl.filter(x => x.ok).length;
    const dit = [r.manque.length ? `pas de contact ${r.manque.slice(0, 4).map(p => p.num).join(', ')}${r.manque.length > 4 ? '…' : ''}` : '',
      ...r.refus.slice(0, 2).map(({ p, c, ko }) => `${p.borne} : ${ko.map(f => f.type || f.cable || '?').join(', ')} ${trop(m, c, ko[0])} pour un #${c.taille}`)].filter(Boolean);
    const usage = m.auto ? '' : `usage « ${m.usage || 'spécial'} » : jamais retenu d’office`;
    return { m, n: ok, etat: ok === n && !dit.length ? 'att' : 'ko', loge: `loge ${ok} / ${n}`, raison: [usage, ...dit].filter(Boolean).join(' ; ') || 'loge tout', retenu: m.reference === retenu }; })
    .sort((a, c) => c.n - a.n || a.m.contacts.length - c.m.contacts.length);
  const nomF = fam ? nomDeFamille(N, fam) || fam : 'des normes de connecteurs';
  return { n: autres.length, html: autresCandidats(cle, `Les ${autres.length} autres arrangements ${nomF}, du plus proche au plus loin`, autres) }; }
function listeArrangements(cle, k, Q, M, autoRef) { if (FI.liste !== 'arr|' + cle) return '';
  const N = app.norme, fam = Q.famille || (M ? M.module.famille : ''), n = k.points.length, retenu = Q.main && M ? M.reference : '';
  const vs = arrangementsQuiLogent(k.points, N, fam), A = autresArrangements(cle, k.points, fam, vs, retenu);
  const auto = `<button type="button" class="cand cand-auto" data-auto="${escA('arr:' + cle)}" aria-pressed="${!Q.main}" data-bulle="Le choix de l’outil : celui que la référence nomme, sinon le plus petit qui loge ces bornes"><i class="cand-etoile">${ico('etoile')}</i><b>Automatique</b><span>${esc(autoRef || 'aucun ne loge ces bornes')}</span></button>`;
  return listeChoix('arr|' + cle, voletT('Arrangement') + `<div class="fi-cands">${auto}${vs.filter(m => m.reference !== autoRef || Q.main).map(m => candidat(cle, m, retenu)).join('')}</div>`
    + (vs.length ? '' : `<p class="fi-note">Aucun arrangement ${esc(nomDeFamille(N, fam) || fam || '')} ne loge ces ${pluriel(n, 'borne')}.</p>`) + A.html,
    { titre: 'Les arrangements de la norme', filtre: vs.length + A.n > 8 ? 'Filtrer les arrangements' : '', pied: M ? `<button type="button" class="fi-lien" data-bible="${escA(M.reference)}">${ico('livre')}voir dans la bible</button>` : '' }); }

function corpsConnecteur(nom, c, k, b, vt) { const cle = nom + '|' + c.nom, Q = k && k.plan, M = Q && Q.modules[0];
  const ref = ligneChamp('Référence', referenceConnecteur(nom, c.nom, c.bornes, c.pn));
  let arr = '', face = '', fautifs = [];
  if (M) { const autoRef = Q.main ? remplirContacts(k.points, app.norme, { pn: c.pn, sexe: sexeChoisi(cle) }).reference : M.reference, par = new Map(Q.fils.map(x => [x.contact.lettre, x]));
    const pourquoi = Q.main ? 'Choisi ici' : Q.nomme ? 'La référence le nomme' : `Le plus petit qui a ces ${pluriel(Q.potentiels, 'contact')} et accepte ${typesDe(Q.fils.map(x => x.f)) || 'ces câbles'}`, montree = FI.face[cle] !== false;
    const liste = listeArrangements(cle, k, Q, M, autoRef), force = Q.main && Q.verdicts.some(v => v.niveau === 'ko');
    arr = ligneChamp('Arrangement', `<button type="button" class="fi-norme-puce${Q.main ? ' main' : ''}${force ? ' ko' : ''}" data-face="${escA(cle)}" aria-pressed="${montree}" data-bulle="${escA(pourquoi + (force ? ' : il ne loge pas tout (les problèmes le disent)' : '') + (montree ? ' — un clic replie la face' : ' — un clic montre la face'))}">${esc(M.reference)}${ico('voir')}</button>${aide('arrangement', { plan: Q })}`,
      { changer: boutonChanger('arr|' + cle, 'Choisir un autre arrangement — toute la norme'), liste });
    if (montree) { const n = M.module.contacts.length, pris = Q.utilises || Q.fils.length, tailles = [...new Set(M.module.contacts.map(x => x.taille))].map(t => '#' + t).join(' + '), fam = nomDeFamille(app.norme, Q.famille) || Q.famille || '';
      face = `<div class="fi-faces">${faceAjustee(faceModuleSvg(M.module, ct => { const x = par.get(ct.lettre); return x ? occupant(x.f, x.jaugeOk === false, ct.lettre) : null; }), 'Face côté contacts · ' + M.module.variante)}</div>`
        + `<p class="fi-norme-ligne"><span class="fi-norme-nom">${esc(fam)}</span><span>${esc(plurielLie(n, 'contact') + (tailles ? ' ' + tailles : ''))}</span><span class="fi-pris"><i class="pt pris" aria-hidden="true"></i>${esc(plurielLie(pris, 'pris'))}</span><span class="fi-libres"><i class="pt" aria-hidden="true"></i>${esc(plurielLie(Math.max(0, n - pris), 'libre'))}</span><button type="button" class="fi-lien" data-bible="${escA(M.reference)}">${ico('livre')}la bible</button></p>`; } }
  // aucun arrangement ne loge : la borne fautive nommée, ce qui cloche, la gauge qui s'y loge (un geste) ; la phrase du moteur dans la bulle
  else if (Q) { fautifs = coupablesDu(Q, k.points); const fam = nomDeFamille(app.norme, Q.famille) || Q.famille || 'la norme', phrase = Q.verdicts.filter(v => v.niveau === 'ko').map(v => v.texte).join(' ; ') || 'aucun arrangement ne convient';
    const dit = fautifs.length ? fautifs.map(x => `<span class="fi-fautif"><b class="id">${esc(x.borne)}</b> : ${esc(x.l.cable || 'câble')} (${ident(x.f.type || '?')}), ${esc(x.mot)}${x.contact ? ` pour le contact ${esc(x.contact.lettre)} du ${esc(x.module.variante)}, le plus proche` : ''}${x.propose ? '' : ' — aucune gauge de sa famille ne s’y loge en portant son courant'}</span>`).join('') : '';
    arr = ligneChamp('Arrangement', `<b class="fi-ko-t" data-bulle="${escA(majuscule(phrase))}">${fautifs.length ? 'Aucun ne loge ' + esc([...new Set(fautifs.map(x => x.borne))].join(', ')) : 'Aucun ne loge ces bornes'}</b>${aide('arrangement', { plan: Q, fautifs, famille: fam })}`,
      // « Changer » ne disparaît jamais (v73, l'ingénieur : « 300XC1 B n'a plus de bouton Changer ») : toute la norme, pour forcer
      { changer: boutonChanger('arr|' + cle, 'Choisir un arrangement quand même — toute la norme'), liste: listeArrangements(cle, k, Q, null, ''),
        sous: (dit ? `<span class="fi-fautifs">${dit}</span>` + fautifs.map(boutonReparer).join('') : '') + (Q.main ? '<button type="button" class="fi-lien" data-auto="' + escA('arr:' + cle) + '">revenir au choix de l’outil</button>' : '') }); }
  // hors des normes chargées : on ne dit rien de ce qu'on ne sait pas — la référence seule
  // les contacts : une ligne par câble posé, borne par borne
  const sertirs = new Map(Q ? Q.fils.map(x => [x.f.l, x]) : []), fautes = new Map(fautifs.map(x => [x.f.l, x.mot]));
  const xs = c.bornes.slice().sort(triNaturel).flatMap(bo => (b.parBorne.get(bo) || []).map(f => { const x = sertirs.get(f.l), st = x ? sertirAuBout(nom, bo, x) : null;
    return { ct: `<b>${esc(bo)}</b>${vt.get(String(bo)) ? `<i class="fi-tag" data-bulle="Barrette à poser sur cette borne">${esc(vt.get(String(bo)))}</i>` : ''}`, f, sertir: st, rep: nom, borne: bo, plan: x ? { Q, sertir: x.sertir, taille: x.taille, sexe: x.sexe } : null, ko: x && x.jaugeOk === false ? 'gauge refusée par le contact' : '', coupable: fautes.get(f.l) || '' }; }));
  const sansContacts = !!Q && !M;
  const contacts = xs.length ? (sansContacts ? `<p class="fi-note ct-note">Les contacts à sertir viendront avec l’arrangement.</p>` : '') + tableContacts(xs, { sans: sansContacts }) + (!sansContacts && xs.some(x => x.sertir) ? legendeConfiance() : '') : '<p class="fi-note">Aucun câble sur ce connecteur.</p>';
  // le sexe des contacts se choisit dès que la norme a sa table de contacts (même quand aucun arrangement ne loge)
  const table = Q && (M ? Q.tableContacts : (normeDesModules(app.norme).contacts || []).some(x => x.famille === Q.famille));
  // ce que la base SEE dit de cette référence (08 nonies) : sa désignation, fiche ou embase, ce qui s'y accouple ; absente, obsolète, hors programme
  const see = typeof ligneSEEHtml === 'function' ? ligneSEEHtml(c.pn) : '';
  return champs([ref, arr]) + see + face + groupeSection('Contacts', contacts, { droite: table ? pucesSexe(cle, Q.sexe) : '', compte: xs.length || null }); }
// les bornes qui ne sont sur aucun connecteur (CNT, GND…) : elles se raccordent au corps
function corpsSansConnecteur(nom, sans, b, vt) { const xs = sans.flatMap(bo => (b.parBorne.get(bo) || []).map(f => ({ ct: `<b>${esc(bo)}</b>`, f, sertir: null, rep: nom, borne: bo, plan: null })));
  // la référence de l'équipement (celle de ses liaisons), et ce que la base SEE en dit (08 nonies)
  const pn = (liaisonsDuConnecteur(nom, sans).map(([l, ch]) => l[ch]).find(Boolean)) || '', see = pn && typeof ligneSEEHtml === 'function' ? ligneSEEHtml(pn) : '';
  return `<p class="fi-note">Des bornes au corps : ni connecteur ni contact.</p>` + see + groupeSection('Contacts', tableContacts(xs, { sans: true }), { compte: xs.length }); }

/* ---- UN DISJONCTEUR ------------------------------------------------------------------------------------------------- */
/* Calibre (le calibre retenu en grand et son verdict, le meilleur, la courbe, le profil : `sectionDisjoncteur`, 08
   quinquies) · Câbles (l'intensité au pire contre ce qu'ils admettent, la chute en ligne jusqu'au bout de leur chemin)
   · Déjà fait. Un disjoncteur de tableau a des bornes à vis : ni contacts ni raccord, pas de section Connecteur. */
function ficheDisjoncteur(nom, probs) { const d = disjonctionDe(nom), o = origineDuCalibre(nom, d), H = app.simu || HYPOTHESES;
  const rows = lignesFilsDisjoncteur(nom, d), sansL = rows.some(r => r.chute.supp);
  const sections = [sectionDisjoncteur(nom, d, o, probs), sectionFils(rows, probs, { cls: 'dj-fils', note: sansL ? `En italique, ce qui est supposé — une ${motHypothese} : ${esc(nombre(H.longueur))} m sans longueur au retest.` : '' }), sectionDejaFait(nom)];
  const pn = pnDuRepere(nom), id = identite([majuscule(natureDe(nom)), descriptionDuRetest(nom) ? esc(descriptionDuRetest(nom)) : '', pn ? ident(pn) : '', esc(motFolios(foliosDuRepere(nom)))]);
  // la carte de décision, quand l'outil retient un autre calibre que le retest ; elle porte le point du calibre (la barre, les autres)
  const decision = carteDecision(nom, d, Math.max(0, probs.length - 1));
  return enTete({ type: 'disjoncteur', designation: nom, nom, champ: 'eq-rep', etat: etatDesProblemes(probs), identite: id }) + decision + barreProblemes(probs, sections, { taire: decision ? /^le retest porte un / : null }) + blocRetest(ecritsDuRepere(nom), []) + ficheSections('disjoncteur', sections)
    + fiPied({ tableau: nom, fil: nom, relief: false, menu: MENU_BLOC }); }

/* ---- UNE BARRETTE (et une barrette à poser) ------------------------------------------------------------------------ */
/* Module (sa référence en puce et son « ? » — un clic ouvre, sous elle, la GALERIE des assemblages de la norme ; l'écart
   avec le retest ; la face, vivante ; les contacts, une broche par câble) · Câbles · Déjà fait. Le lecteur (version 61) :
   « la norme, on s'en fout, elle est dans le module » ; « un potentiel, je ne comprends pas — on le voit sur le dessin » :
   plus de ligne Norme, plus de potentiel. Une barrette à poser se pose depuis la barre sous l'en-tête. */
function ficheBarrette(nom) { const aPoser = VT_A_POSER.test(nom), L = liaisonsDeRepere(nom);
  const { besoins: b, plan: Q, main } = planDeBarrette(nom), M0 = Q.modules[0], N = app.norme;
  const refuses = Q.fils.filter(x => x.jaugeOk === false);
  const probs = [...Q.verdicts.filter(v => v.niveau === 'ko').map(v => ({ niveau: 'ko', texte: v.texte, section: 'connecteur' })), ...refuses.map(x => ({ niveau: 'ko', texte: `${x.f.cable || 'câble à créer'} (${x.f.type}) : gauge refusée par le contact ${x.contact.lettre}`, section: 'connecteur', viser: cleFil(x.f.l) }))];
  const raccord = aPoser ? L.find(l => l.aPoser === nom && l.origine === null && l.vers === nom && l.borneVers === '1') : null, sur = raccord ? raccord.de + ':' + raccord.borneDe : '';
  if (aPoser) probs.push({ niveau: 'att', texte: 'repère provisoire : lui donner son vrai repère la pose au contrat', section: '' });
  ((typeof CONTROLE !== 'undefined' && CONTROLE.items) || []).filter(x => x.nom === nom && !probs.some(p => p.texte === x.texte) && !/^à poser sur/.test(x.texte)).forEach(x => probs.push({ niveau: x.niveau === 'ko' ? 'ko' : 'att', texte: x.texte, section: 'connecteur' }));
  const libres = Q.contacts - Q.utilises, famNom = M0 ? nomDeFamille(N, M0.module.famille) || M0.module.famille : Q.famille ? nomDeFamille(N, Q.famille) || Q.famille : '';
  /* le MODULE : sa référence en puce, qui ouvre la galerie (plusieurs modules : chacun sa référence) ; l'écart avec le
     retest ; le RAIL qui les porte ; la face */
  const par = new Map(); Q.fils.forEach(x => par.set(x.module + '|' + x.contact.lettre, x));
  const faces = Q.modules.map((M, k) => faceAjustee(faceModuleSvg(M.module, ct => { const x = par.get(k + '|' + ct.lettre); return x ? occupant(x.f, x.jaugeOk === false, ct.lettre) : null; }), Q.modules.length > 1 ? (k + 1) + ' · ' + M.reference : '')).join('');
  const ecartRetest = !aPoser && b.pn && Q.reference && cleNorme(b.pn) !== cleNorme(Q.reference) && moduleDeReference(N, b.pn);
  // pourquoi l'outil écarte celui du retest (l'ingénieur v73 : « je ne vois pas pourquoi le 1A101Z du retest est écarté »)
  let pqR = ''; if (ecartRetest) { try { const r = raisonDuModule(b, ecartRetest, potentielsDeBarrette(b).sort((a, c) => c.fils.length - a.fils.length)); pqR = ecartRetest.variante + ' : ' + (r.raison === 'loge tout' ? 'il loge aussi ces potentiels ; l’outil retient le mieux taillé' : r.raison); } catch (_) { pqR = ''; } }
  const ecart = ecartRetest ? `<span class="fi-ecart">le retest dit ${ident(b.pn)} <button type="button" class="fi-lien" data-garder="${escA(b.pn)}">garder le retest</button>${pqR ? `<span class="fi-ecart-r">${insecable(esc(pqR))}</span>` : ''}</span>` : '';
  const valeur = Q.reference ? `<span class="fi-norme-puce statique" data-bulle="${escA(main ? 'Choisi ici' : Q.modules.length > 1 ? `${Q.potentiels} potentiels sur ${Q.modules.length} modules` : `Le plus petit module qui loge ${pluriel(Q.potentiels, 'potentiel')}`)}">${esc(Q.reference)}</span>` : '<b class="fi-ko-t">Aucun module</b>';
  const galerie = aPoser || FI.liste !== 'bar|' + nom ? '' : listeChoix('bar|' + nom, galerieModules(nom, b, Q, main), { titre: 'Les assemblages de la norme qui logent ces potentiels', cls: 'fi-galerie-choix', pied: M0 ? `<button type="button" class="fi-lien" data-bible="${escA(M0.reference)}">voir dans la bible</button>` : '' });
  // le module en puce : un clic ouvre la galerie des assemblages de la norme, sous lui (la norme ne s'écrit plus à part)
  const moduleV = aPoser || !Q.reference ? valeur : `<button type="button" class="fi-norme-puce fi-norme-gal${main || Q.main ? ' main' : ''}${(main || Q.main) && (Q.restants || []).length ? ' ko' : ''}" data-changer="${escA('bar|' + nom)}" aria-expanded="${FI.liste === 'bar|' + nom}" data-bulle="${escA((main ? 'Choisi ici' : 'Le plus petit module qui loge ces câbles') + ' — un clic montre tous les assemblages de la norme, pour en choisir un autre')}">${esc(Q.reference)}${ico('bas', 'fi-chevron')}</button>`;
  // plusieurs modules (le lecteur : « la référence de chaque module, tout seul ») : une puce numérotée chacun ; « Changer »
  // ouvre la galerie
  const plusieurs = Q.modules.length > 1, refs = plusieurs ? `<span class="fi-modules">${Q.modules.map((M, k) => `<span class="fi-mod"><i>${k + 1}</i>${ident(M.reference)}</span>`).join('')}</span>` : '';
  // le rail (le lecteur : « la bonne référence du rail, celui qui porte tous les modules ») : la table Accessoires de la norme
  const R = aPoser ? null : railDeBarrette(Q), railH = R ? `<span class="fi-rail" data-bulle="${escA([R.role, R.equivalent ? 'équivalent ' + R.equivalent : '', sansLiens(R.source)].filter(Boolean).join(' — '))}">${ident(R.reference)}</span>${repereConfiance(R.ligne, 'Vos tables')}${aide('rail', { rail: R })}` : '';
  const tete = aPoser && !M0 ? '<p class="fi-note">Le module se choisit quand la barrette est posée au contrat.</p>' : champs([
    ligneChamp(plusieurs ? 'Modules' : 'Module', (plusieurs ? refs : moduleV) + aide('module', { plan: Q }), { changer: plusieurs && !aPoser ? boutonChanger('bar|' + nom, 'Les assemblages de la norme', 'Changer') : '', sous: ecart, liste: galerie, cls: 'fc-norme' }),
    R ? ligneChamp('Rail', railH, { sous: R.sous ? `<span>${esc(R.sous)}</span>` : '' }) : '']);
  /* les CONTACTS : une broche par câble — la lettre du contact du module dans le rond, la borne du retest en petit à côté */
  const borneDe = f => f.borneBarrette || (f.l && (f.l.de === nom ? f.l.borneDe : f.l.borneVers)) || '';
  // dans l'ordre des bornes (l'audit v72 : « A, K, D, G, B, E, N… : ni par lettre ni par borne »), la lettre du contact puis la borne sur une ligne
  const tri = Q.fils.slice().sort((a, c) => a.module - c.module || triBornes(borneDe(a.f), borneDe(c.f)) || triNaturel(a.contact.lettre, c.contact.lettre));
  const xsC = tri.map(x => ({ ct: `<b>${esc((Q.modules.length > 1 ? (x.module + 1) + '·' : '') + x.contact.lettre)}</b>${borneDe(x.f) ? `<small>borne ${esc(borneDe(x.f))}</small>` : ''}`, f: x.f, sertir: x.sertir || null, plan: x.sertir ? { Q, sertir: x.sertir, taille: x.taille, sexe: x.sexe } : null, ko: x.jaugeOk === false ? 'gauge refusée par le contact' : '' }));
  (Q.restants || []).forEach(p => p.fils.forEach(f => xsC.push({ ct: `<b>?</b><small>borne ${esc(borneDe(f))}</small>`, f, ko: 'sans place dans le module' })));
  const nf = xsC.filter(x => x.f).length, sansTable = M0 && !Q.fils.some(x => x.sertir);
  const contacts = nf ? tableContacts(xsC, { premiere: 'Contact' }) + (Q.fils.some(x => x.sertir) ? legendeConfiance() : '') + (sansTable ? `<p class="fi-note">La table des contacts de la ${esc(famNom)} manque : <button type="button" class="fi-lien" data-action="normes">l’envoyer</button>.</p>` : '') : '<p class="fi-note">Aucun câble.</p>';
  const fils = filsDuRepere(nom); probs.push(...problemesDesFils(fils));
  const poser = aPoser ? `<div class="fi-poser"><span>Poser au contrat sous</span>${saisie('id="vt-repere"', repereLibre(raccord ? raccord.de : '', 'VT'), { mono: true, label: 'Le vrai repère de la barrette', court: true })}<button type="button" class="btn cuivre" id="vt-poser">Poser</button></div>` : '';
  const sections = [{ cle: 'connecteur', titre: 'Module', resume: aPoser && !M0 ? 'se choisit quand la barrette est posée' : Q.reference ? ident(Q.reference) : '<span class="fi-ko-t">aucun module</span>',
      badge: badgeProblemes(probs, 'connecteur'), contenu: tete + (faces ? `<div class="fi-faces">${faces}</div>` : '') + groupeSection('Contacts', contacts, { compte: nf || null }) },
    sectionFilsDuRepere(fils, probs), aPoser ? null : sectionDejaFait(nom)];
  const id = aPoser ? '' : identite([majuscule(natureDe(nom)), Q.reference ? ident(Q.reference) : '', pluriel(fils.length, 'câble'), esc(motFolios(foliosDuRepere(nom)))]);
  // par rapport au retest : ce qui a été écrit ici, et le module que Volta retient à la place de celui du retest
  // (sa colonne : le PN de la barrette, PN1 là où elle est l'appareil 1, PN2 là où elle est l'appareil 2)
  const colsPn = [...new Set(L.map(l => l.de === nom ? 'PN1' : l.vers === nom ? 'PN2' : '').filter(Boolean))].sort().join(' · ');
  const proposes = ecartRetest ? [{ sujet: '', champ: 'module', colonne: colsPn, objet: nom, avant: b.pn, apres: Q.reference, geste: main ? 'choisi ici' : 'Volta' }] : [];
  return enTete({ type: 'barrette', genre: aPoser ? `À poser${sur ? ` · sur ${esc(sur)}` : ''}` : '', designation: aPoser ? '' : nom, nom, champ: 'eq-rep', aide: aPoser ? 'Écrire le vrai repère : la barrette entre au contrat' : '', etat: etatDesProblemes(probs), identite: id })
    + barreProblemes(probs, sections) + poser + (aPoser ? '' : blocRetest(ecritsDuRepere(nom), proposes)) + ficheSections('barrette', sections)
    + fiPied(aPoser ? { voir: raccord && raccord.de, relief: !!M0, menu: [['fi-renommer', 'Nommer et poser au contrat']] } : { tableau: nom, fil: nom, relief: true, menu: MENU_BLOC }); }
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
  const auto = main || Q.main ? `<button type="button" class="btn papier fi-gal-auto" data-auto="${escA('arr:' + nom)}" data-bulle="Rendre le choix de l’outil : le plus petit module qui loge ces potentiels">Automatique</button>` : '<span class="fi-gal-mot">Automatique</span>';
  const cartes = vs.map((m, i) => { let Qv = null; try { Qv = remplirModules(b, N, m.reference); } catch (_) { Qv = null; }
    const pris = new Map(); (Qv ? Qv.fils : []).filter(x => x.module === 0).forEach(x => pris.set(x.contact.lettre, x));
    const f = faceModuleSvg(m, ct => { const x = pris.get(ct.lettre); if (!x) return null; const cl = coulDeFil(x.f); return { i: '', couleur: cl, couleurClaire: melanger(cl, 0.8), ko: x.jaugeOk === false }; });
    const libres = m.contacts.length - (Qv ? Qv.fils.filter(x => x.module === 0).length : 0);
    return `<button type="button" class="cand cand-g${m.reference === retenue ? ' retenue' : ''}" data-cle="${escA(nom)}" data-ref="${escA(m.reference)}" aria-pressed="${m.reference === retenue}" data-bulle="${escA(m.reference + ' · ' + resumeModule(m) + (i === 0 ? ' — le mieux taillé' : '') + (m.reference === retenue ? ' — retenu' : ' — cliquer pour le retenir'))}">`
      + `<span class="cand-face"><svg class="mj" viewBox="0 0 ${f1(f.w)} ${f1(f.h)}" aria-hidden="true">${f.svg}</svg></span>`
      + `<span class="cand-nom">${i === 0 ? `<i class="cand-etoile" aria-label="Le mieux taillé" role="img">${ico('etoile')}</i>` : ''}<b>${esc(m.variante)}</b></span><span class="cand-mot">${plurielLie(libres, 'libre')}${m.reference === retenue ? ' · retenu' : ''}</span></button>`; }).join('');
  const compte = `<p class="fi-gal-n">${vs.length ? `${vs.length} sur ${tous.length} logent ces ${pluriel(pots.length, 'potentiel')} d’un seul module` : `Aucun des ${tous.length} ne loge ces ${pluriel(pots.length, 'potentiel')} d’un seul module`}</p>`;
  return `<div class="fi-gal-tete">${onglets}<span class="espace"></span>${auto}</div>` + compte
    + (cartes ? `<div class="fi-galerie">${cartes}</div>` : '') + autresH; }
/* LE RAIL d'une barrette : la ligne « rail » de la table Accessoires de sa norme (NN y devient le nombre de modules : le
   rail Amphenol se commande au nombre de modules) ; sa longueur quand la ligne la dit au pas. null sans ligne. */
function railDeBarrette(Q) { const M0 = Q && Q.modules && Q.modules[0]; if (!M0) return null; const n = Q.modules.length;
  const a = accessoiresDe(app.norme, M0.module.famille).find(x => /^rail/i.test(String(x.role || ''))); if (!a) return null;
  const reference = String(a.reference).replace(/NN/, String(n).padStart(2, '0')), pas = /pas (\d+(?:[.,]\d+)?) mm/.exec(String(a.role || '') + ' ' + String(a.note || ''));
  const longueur = /NN/.test(a.reference) && pas ? (n === 1 ? 18 : nombreLu(pas[1]) * n) : null;
  return { reference, role: a.role || '', equivalent: a.equivalent || '', source: a.origine || a.note || '', ligne: a, n, sous: longueur ? `${plurielLie(n, 'module')} · ${nombre(longueur)} mm` : /2000|2 m/.test(String(a.role || '') + a.reference) ? 'à couper à la longueur des modules' : '' }; }
/* Le prochain repère libre d'un code dans la zone d'un équipement : « 102VT1 » si personne ne le porte. */
function repereLibre(voisin, code) { const q = lireRepere(voisin), zone = q && q.num ? q.num : '', pris = new Set(reperesDe(verite()));
  for (let n = 1; n < 1000; n++) { const r = zone + code + n; if (!pris.has(r)) return r; } return zone + code + '1'; }

/* ---- UNE PRISE DE COUPURE ------------------------------------------------------------------------------------------ */
/* Connecteur (la référence — l'arrangement — en puce et son « ? » ; UNE face — celle de la fiche, ou celle qui porte le
   problème —, l'autre d'un clic ; chaque contact, ce qui arrive et ce qui repart ; le raccord de chaque moitié) · Câbles
   · Déjà fait. */
function ficheCoupure(nom) { const { besoins: b, points, plan: Q } = planDeCoupure(nom), M = Q.modules[0], N = app.norme;
  const cps0 = coupablesDu(Q, points), probs = Q.verdicts.filter(v => v.niveau === 'ko' || v.niveau === 'attention').map(v => ({ niveau: v.niveau === 'ko' ? 'ko' : 'att', texte: v.texte, section: 'connecteur', viser: v.coupables && cps0[0] ? cleFil(cps0[0].l) : undefined }));
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
  /* « Changer » (le lecteur : « je peux switcher par rapport aux normes, à chaque norme les emplacements, la bible : c'est
     génial — le côté automatique et le côté manuel ») : la norme (automatique ou l'une des normes de connecteur), puis
     les arrangements qui logent ces contacts — « Automatique » en tête —, la bible au pied */
  const ouverte = FI.liste === 'cou|' + nom, vs = ouverte ? arrangementsQuiLogent(points, N, Q.visee || Q.famille) : [], retenu = M ? M.reference : '';
  const autoRef = Q.main || Q.visee ? coupureEnModule(nom, verite(), N, '', sexeChoisi(nom)).plan.reference : retenu, enAuto = !Q.main && !Q.visee;
  const auto = `<button type="button" class="cand cand-auto" data-auto="${escA('arr:' + nom)}" aria-pressed="${enAuto}" data-bulle="Le choix de l’outil : le plus petit arrangement qui loge ces contacts"><i class="cand-etoile">${ico('etoile')}</i><b>Automatique</b><span>${esc(autoRef || 'le plus petit qui loge')}</span></button>`;
  const liste = listeChoix('cou|' + nom, voletT('Norme') + puces('data-norme-prise', [['', 'automatique'], ...famillesDeModules(N, 'connecteur').map(f => [f, nomDeFamille(N, f)])], Q.main ? null : (Q.visee || ''))
    + voletT('Arrangement') + `<div class="fi-cands">${auto}${vs.filter(m => !enAuto || m.reference !== retenu).map(m => candidat(nom, m, enAuto ? '' : retenu)).join('')}</div>` + (vs.length ? '' : '<p class="fi-note">Aucun arrangement de cette norme ne convient.</p>') + (ouverte ? autresArrangements(nom, points, Q.visee || Q.famille, vs, enAuto ? '' : retenu).html : ''),
    { titre: 'Les arrangements de la norme', filtre: ouverte ? 'Filtrer les arrangements' : '', pied: M ? `<button type="button" class="fi-lien" data-bible="${escA(M.reference)}">${ico('livre')}voir dans la bible</button>` : '' });
  // la référence seule (le lecteur : « un contact fixe, on s'en fiche » : plus de « 7 contacts · fiche femelle » dessous)
  // aucun arrangement ne loge la prise : la borne fautive nommée, la gauge qui s'y loge (un geste)
  const fautifs = M ? [] : coupablesDu(Q, points), dit = fautifs.map(x => `<span class="fi-fautif"><b class="id">${esc(x.borne)}</b> : ${esc(x.l.cable || 'câble')} (${ident(x.f.type || '?')}), ${esc(x.mot)}${x.contact ? ` pour le contact ${esc(x.contact.lettre)} du ${esc(x.module.variante)}, le plus proche` : ''}</span>`).join('');
  const tete = champs([ligneChamp('Référence', (M ? `<span class="fi-norme-puce statique" data-bulle="${escA(pourquoi)}">${esc(M.reference)}</span>` : `<b class="fi-ko-t">${fautifs.length ? 'Aucun arrangement ne loge ' + esc([...new Set(fautifs.map(x => x.borne))].join(', ')) : 'Aucun arrangement'}</b>`) + aide('prise', { plan: Q, fautifs }),
    { changer: boutonChanger('cou|' + nom, 'Choisir une autre norme ou un autre arrangement'), liste, sous: dit ? `<span class="fi-fautifs">${dit}</span>` + fautifs.map(boutonReparer).join('') : '' })]);
  /* les PAIRES, en broches (comme les contacts d'un connecteur) : le rond porte la lettre du contact ; à côté, ce qui arrive
     (la fiche) et ce qui repart (l'embase) — chacun son contact de la table (le même qu'au-dessus plus pâle), la gauge de
     son câble en pastille (acceptée ✓, refusée ✕), le câble à la couleur de sa route */
  const prec = { am: '', av: '' };
  const cote = (x, k) => { if (!x) { prec[k] = ''; return '<span class="fi-cote vide"><i>—</i></span>'; } const st = x.sertir, mot = st ? motSertir(st) : '', meme = !!mot && mot === prec[k], j = jaugeDuType(x.f.type), ok = x.jaugeOk === false ? false : st ? true : null; prec[k] = mot;
    const ligne = st && !meme ? ligneDuContact(Q.famille || (M ? M.module.famille : ''), x.taille, x.sexe, x.f.type) : null;
    return `<span class="fi-cote" data-i="${cleFil(x.f.l)}" tabindex="0" role="button" data-bulle="${escA([nomDuFil(x.f), x.f.type || '', mot].filter(Boolean).join(' · '))}"><span class="ct-sertir"><span class="fi-sertir ct-ref${meme ? ' meme' : ''}">${mot ? esc(mot) : '<i>—</i>'}</span>${ligne && ligne.reference === st.reference ? repereConfiance(ligne, 'Vos tables SEE') : ''}</span>`
      + `<span class="ct-cote-bas">${puceFil(x.f)}<b class="fi-cab-n">${esc(nomDuFil(x.f))}</b><span class="fi-jg ct-jg${ok === false ? ' ko' : ok ? ' ok' : ''}">${j != null ? `${j}<small>AWG</small>` : '—'}${ok === false ? ico('fermer') : ok ? ico('coche') : ''}</span></span></span>`; };
  const lignes = (M ? M.module.contacts : []).map(ct => { const am = Q.fils.find(x => x.contact === ct && x.f.amont), av = Q.fils.find(x => x.contact === ct && !x.f.amont); if (!am && !av) return '';
    return `<li class="fi-paire ct-paire${[am, av].some(x => x && x.jaugeOk === false) ? ' ko' : ''}"><span class="fi-ct ct-pin"><b>${esc(ct.lettre)}</b></span>${cote(am, 'am')}${cote(av, 'av')}</li>`; }).join('');
  const nP = (lignes.match(/class="fi-paire/g) || []).length;
  const paires = lignes ? `<ul class="ct-liste fi-paires"><li class="ct-legende ct-legende-paire"><span>Contact</span><span>Fiche · ce qui arrive</span><span>Embase · ce qui repart</span></li>${lignes}</ul>` + legendeConfiance() : '<p class="fi-note">Aucun contact posé.</p>';
  const fils = filsDuRepere(nom); probs.push(...problemesDesFils(fils));
  // le sexe de la fiche : deux puces qui ne bougent pas, celle qui est retenue pressée
  const sexe = Q.tableContacts ? sexeDeLaFiche(nom, Q.sexe) : '';
  // le raccord de chaque moitié, dans la même section que la prise (le lecteur : « tout ce qui est connecteur, tyrap, etc. »)
  const raccords = [['Fiche', amont], ['Embase', aval]].filter(([, xs]) => xs.length).map(([t, xs]) => raccordHtml({ cle: nom + '|' + t.toLowerCase(), titre: t, fils: xs.map(x => x.f), pn: b.pn, ref: Q.reference, plan: M ? Q : null })).join('');
  // pas de résumé sous « Connecteur » (le lecteur : « ne mets pas la référence en dessous de connecteur ») : la ligne Référence la dit
  const sections = [{ cle: 'connecteur', resume: M ? '' : '<span class="fi-ko-t">aucun arrangement</span>', badge: badgeProblemes(probs, 'connecteur'),
      contenu: tete + face + groupeSection('Contacts', paires, { droite: sexe, compte: nP || null, aide: ['contact', null] }) + (raccords ? groupeSection('Raccord', raccords, { cls: 'fi-groupe-raccord' }) : '') },
    sectionFilsDuRepere(fils, probs), sectionDejaFait(nom)];
  const id = identite([majuscule(natureDe(nom)), M ? ident(M.reference) : '', b.pn && (!M || cleNorme(b.pn) !== cleNorme(M.reference)) ? ident(b.pn) : '', esc(motFolios(foliosDuRepere(nom)))]);
  return enTete({ type: 'prise', designation: nom, nom, champ: 'eq-rep', etat: etatDesProblemes(probs), identite: id }) + barreProblemes(probs, sections) + blocRetest(ecritsDuRepere(nom), []) + ficheSections('prise', sections) + fiPied({ tableau: nom, fil: nom, relief: true, menu: MENU_BLOC }); }

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
  return enTete({ type: 'masse', genre: 'Masse' + aide('masse', { cables: fils.length }), identite: esc(motFolios(foliosDuRepere(nom))), designation: nom, nom, champ: 'eq-rep', etat: etatDesProblemes(probs) }) + barreProblemes(probs, sections) + ficheSections('masse', sections)
    + fiPied({ tableau: nom, menu: [['fi-copier', 'Copier la fiche']] }); }

/* ---- UN BORNIER HORS MODULES (une bible importée sans modules) ----------------------------------------------------- */
function ficheBornierAncien(nom) { const V = verite(), b = besoinsDeBarrette(nom, V);
  const P = remplirSelonNorme(physiqueDeBarrette(nom, V, app.bible, app.contrat.designations.get(nom) || ''), app.norme);
  return enTete({ type: estCoupure(nom) ? 'prise' : 'barrette', genre: estCoupure(nom) ? 'Prise de coupure' : 'Barrette', designation: nom, nom, champ: 'eq-rep' })
    + ficheSections('barrette', [{ cle: 'connecteur', titre: 'Référence', resume: 'la bible des barrettes', contenu: `<div class="equip">${cartePhysique(nom, P, b)}</div>`, ouvert: true }])
    + fiPied({ tableau: nom, relief: true, menu: MENU_BLOC }); }

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
  if (neuf) probs.push({ niveau: 'att', texte: 'câble à créer : il prend son numéro quand ' + l.aPoser + ' est posée au contrat', section: '' });
  [st.de, st.vers].forEach((s, k) => { if (s && s.ko) probs.push({ niveau: 'ko', texte: 'aucun contact n’accepte ce câble côté ' + (k ? l.vers : l.de), section: 'trajet' }); });
  // le plan d'un connecteur ne le loge pas : c'est ce câble qui l'en empêche (l'audit : « W-370 est vert »)
  fautes.forEach(y => probs.push({ niveau: 'ko', texte: `${y.rep}${y.connecteur ? ' · connecteur ' + y.connecteur : ''} : aucun arrangement ne loge ce ${l.type || 'câble'} sur la borne ${y.borne} (${y.mot})`, section: 'trajet' }));
  if (x.rd.refuse) probs.push({ niveau: 'att', texte: 'conducteur ' + x.rd.conducteur + ' sans résistance dans la base : la chute n’est pas calculée', section: 'fils' });
  // v73 — LE CONTRÔLE RATTACHE AU CÂBLE ses problèmes (le domaine C, 08-controle, `problemesDuCable`) : sa charge, sa protection,
  // son contact contre le calibre, la chute de son chemin, et LA CAUSE quand son disjoncteur ne passe pas — avec leurs gestes ;
  // une seule phrase pour un même fait, celle du contrôle. Sans elle, la fiche les calcule (`protectionDuCable`)
  let deC = null; if (!neuf && x.al && typeof problemesDuCable === 'function') { try { deC = problemesDuCable(l); } catch (_) { deC = null; } }
  if (deC) deC.forEach(p => probs.push({ niveau: p.niveau === 'ko' ? 'ko' : 'att', texte: p.texte, bulle: p.bulle, section: p.section || 'fils', gestes: p.gestes, cause: p.cause, genre: p.genre }));
  else x.trop.forEach(pt => probs.push({ niveau: 'ko', texte: `${pt.nom} ${amperes(pt.i)}${pt.t === Infinity ? '' : ' pendant ' + secondes(pt.t)} : plus que ce que le câble admet (${amperes(intensiteAdmise(x.fn, pt.t) * x.fac)})`, section: 'fils' }));
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
  const L = l.longueur > 0 ? l.longueur : null, rT = x.pointe && x.pointe.admis ? x.pointe.i / x.pointe.admis : null, T = editeurType(c => `data-edit="${c}"`, l.type);
  const hyp = L == null ? origine('hyp', 'Le retest ne porte pas la longueur : Volta suppose ' + nombre(H.longueur) + ' m (les hypothèses de la simulation)', 'supposée') : '';
  const pointeI = rT != null && x.continu && rT > x.I / x.continu, iV = x.fn ? (pointeI ? x.pointe.i : x.I) : null, iA = x.fn ? (pointeI ? x.pointe.admis : x.continu) : null;
  const brins = cab ? [(cab.brins > 1 ? cab.brins + ' brins' : '1 brin') + (cab.blindage ? ' + blindage' : ''), cab.nature, cab.diametre != null ? 'Ø ' + nombre(cab.diametre) + ' mm' : '', cab.section != null ? nombre(cab.section) + ' mm² hors-tout' : '', cab.resistance != null ? nombre(cab.resistance) + ' mΩ/m' : '', cab.masse != null ? nombre(cab.masse) + ' g/m' : ''].filter(Boolean).join(' · ') : '';
  // sous la gauge, la section du CONDUCTEUR (EN 2853) — pas celle de la base des câbles, hors-tout (isolant et gaine compris)
  const cuivre = T.p && T.p.jauge != null ? filDeNorme(app.norme, l.type, +T.p.jauge) : null;
  // le câble que la base SEE a mis à la place de celui de Volta (08 nonies) : la différence dans la bulle du type
  const dCab = cab && typeof differenceSEEMots === 'function' ? differenceSEEMots('cables', cab) : '';
  const tuiles = neuf ? [tuile('Type', l.type ? esc(T.p.famille) : '—', { mono: true }), tuile('Gauge', jauge != null ? jauge + '<i>AWG</i>' : '—')] : [
    tuile('Type', T.fam, { mono: true, edit: true, etat: l.type ? (cab && !phy.length ? '' : 'att') : 'att', titre: [brins || (l.type ? 'Inconnu de la base des câbles' : 'Sans type'), dCab, ...phy.map(q => majuscule(q.texte) + ' : impossible')].filter(Boolean).join('\n'), sous: [cab && cab.nature ? esc(cab.nature) : l.type ? (cab ? '' : 'hors de la base') : 'à écrire', dCab ? '<i class="ct-see">SEE</i>' : '', repereConfiance(cab, 'Votre base des câbles') + (cab && !cab.nature && !dCab ? esc((confianceDe(cab) || {}).mot || '') : '')].filter(Boolean).join(' ') }),
    tuile('Gauge', T.jauge, { edit: true, sous: 'AWG' + (cuivre && cuivre.section != null ? ' · ' + esc(nombre(arrondi(cuivre.section, 2))) + ' mm²' : '') }),
    tuile('Longueur', `${saisie('data-edit="longueur"', L != null ? nombre(arrondi(L, 3)) : '', { ph: nombre(H.longueur), label: 'Longueur en mètres', mode: 'decimal', court: true })}<i>m</i>`, { edit: true, sous: hyp, etat: L == null ? 'supp' : '' }),
    tuile('Intensité', iV != null ? `${esc(nombreA(iV))}<i>A</i>` : '—', { etat: [x.trop.length ? 'ko' : prot && prot.probs.length ? 'att' : '', x.al ? '' : 'supp'].filter(Boolean).join(' '), titre: pointeI ? 'Au pire : la pointe' : '', sous: (iA != null ? 'sur ' + esc(nombreA(iA)) + ' A' : '') + (x.al ? '' : ' ' + origine('hyp', 'Aucun disjoncteur en amont : Volta suppose ' + nombre(H.courant) + ' A (les hypothèses de la simulation)')) })];
  const routes = [...couleursDesRoutes().keys()].filter(Boolean);
  const datalists = datalistCables() + `<datalist id="fi-routes">${routes.map(r => `<option value="${escA(r)}"></option>`).join('')}</datalist>`;
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
  const etapes = bout('de', 'De') + passe.map(t => `<li class="fi-etape via"><span class="fi-bout-k">Par</span><span>${esc(t)}</span><small>barrette à poser</small></li>`).join('') + bout('vers', 'Vers');
  // (après les bouts : c'est `bout` qui connaît le contact de chacun)
  const choixCt = ['de', 'vers'].map(k => cts[k] && FI.liste === 'sertir:' + cts[k].ks ? choixSertir(cts[k].ks, cts[k].plan, { type: l.type }, cts[k].st) : '').join('');
  // la gauge qui se loge, quand un plan de connecteur ne loge pas ce câble
  const loge = fautes.filter(y => y.propose).map(y => `<p class="fi-reparer-l"><span>${esc(`${y.rep}${y.connecteur ? ' ' + y.connecteur : ''}, borne ${y.borne} : ${y.mot} pour le ${y.module.variante}`)} — ${esc(y.propose.type)} s’y loge et porte son courant</span>${boutonReparer(y)}</p>`).join('');
  const trajet = `<ol class="fi-chemin" style="--c:${coul}">${etapes}</ol>${choixCt}${loge}`
    + (neuf ? '' : champs([ligneChamp('Route', `${l.route ? `<i class="fi-route" style="--c:${coul}"></i>` : ''}${saisie('data-edit="route"', l.route, { ph: 'aucune', label: 'Route', liste: 'fi-routes' })}`)]));
  /* L'INTENSITÉ ET LA CHUTE : une ligne chacune, une barre contre l'admis ; dessous, ce qui dépasse en pointe, et le plus
     fin qui tient */
  const r = ligneDeFil({ l, vers: l.vers, borneVers: l.borneVers }), pointeTrop = rT != null && rT > 1 + 1e-9;
  const mesure = (k, q, sous, barre, etat, v, bulle) => `<div class="fi-mes ${etat || ''}"${bulle ? ` data-bulle="${escA(bulle)}"` : ''}><span class="fi-mes-k"><span>${k}${q}</span>${sous ? `<small>${sous}</small>` : ''}</span><span class="fi-barre ${etat || ''}" aria-hidden="true"><i style="width:${(Math.min(1, barre || 0) * 100).toFixed(1)}%"></i></span><span class="fi-mes-v">${v}</span></div>`;
  // son disjoncteur en puce, le calibre ÉCRIT à côté (le technicien v73 : « la porte vers la vraie cause, un petit texte souligné de 11 px ») — ⚠ quand il est la cause
  const calS = prot && prot.calEcrit ? prot.calEcrit : x.al ? x.al.calibre : null, causeS = prot && prot.cause;
  const source = x.al ? `<button type="button" class="fi-sertir fi-ct-puce fi-dj-puce${causeS ? ' ' + (causeS.k === 'declenche' ? 'ko' : 'main') : ''}" data-choisir-bloc="${escA(x.al.nom)}" aria-label="${escA('Son disjoncteur : ' + x.al.nom + (calS ? ', ' + amperes(calS) : ''))}" data-bulle="${escA('Son disjoncteur : ' + x.al.nom + (calS ? ', ' + amperes(calS) + (prot && prot.calEcrit ? ' (le retest)' : '') : '') + (causeS ? ' — il est la cause : ' + (causeS.k === 'declenche' ? 'il déclenche' : 'il est juste') : '') + ' — son profil de charge, sa courbe')}">${esc(x.al.nom)}${calS ? ' · ' + esc(amperes(calS)) : ''}${causeS ? ' <i>⚠</i>' : ''}</button>` : `${esc(nombre(H.courant))} A ${origine('hyp', 'Aucun disjoncteur en amont : Volta suppose ' + nombre(H.courant) + ' A', 'supposés')}`;
  const bulleI = r.bulle.split('\n').filter(t => !/^chute|^en pointe/.test(t)).slice(1).join('\n');
  const bulleU = ch.total ? `En ligne depuis ${x.al.nom} jusqu’à ${ch.total.bout[0]}${ch.total.bout[1] ? ':' + ch.total.bout[1] : ''} : ${volts(ch.total.dU)}${ch.max != null ? ' (' + volts(ch.max) + ' admis)' : ''}${ch.reel ? '' : ', longueurs supposées'}\nSur ce câble : ${volts(ch.dU)} (${nombre(arrondi(ch.L, 2))} m${ch.hyp ? ' supposés' : ''})${ch.pointe ? `\nEn pointe : ${volts(ch.pointe.dU)} à ${amperes(ch.pointe.i)} > ${volts(ch.pointe.admis)} admis` : ''}` : ch.dU != null ? `Sur ce câble : ${volts(ch.dU)} = ${nombre(arrondi(x.rd.rho, 1))} Ω/km × ${nombre(arrondi(ch.L, 2))} m × ${nombre(arrondi(x.I, 2))} A` : 'La résistance du câble est inconnue';
  const intens = !x.fn ? `<p class="fi-note">${l.type ? 'Hors de l’EN 2853 : ce qu’il admet ne se lit pas.' : 'Sans type, ce qu’il admet ne se lit pas.'}</p>`
    : mesure('Intensité', aide('intensite', { type: l.type, admis: x.continu, base: x.fn.intensite, facteur: x.fac }), source, r.charge.r, classeMesure(r.charge.r), pointeI ? `<b>${esc(amperes(x.pointe.i))}</b> / ${esc(amperes(x.pointe.admis))} <em class="${pointeTrop ? 'fi-ko-t' : ''}">pointe</em>` : `<b${x.al ? '' : ' class="supp"'}>${esc(amperes(x.I))}</b> / ${esc(amperes(x.continu))}`, bulleI);
  // (comme la ligne du câble dans la fiche de son disjoncteur : la couleur de la mesure, l'italique des longueurs supposées)
  const rU = ch.total && ch.max ? ch.total.dU / ch.max : null, etatU = classeMesure(rU);
  const chute = mesure('Chute', aide('chute', ch.total ? { chemin: { ...ch.total, admis: ch.max, regle: ch.regle } } : { dU: ch.dU, admis: ch.max, regle: ch.regle }), ch.total ? 'en ligne' : 'sur ce câble', rU || 0, etatU,
    ch.total ? `<b${ch.reel ? '' : ' class="supp"'}>${esc(volts(ch.total.dU))}</b>${ch.max != null ? ' / ' + esc(volts(ch.max)) : ''}${ch.pointe ? ` <em class="fi-ko-t${ch.reel ? '' : ' supp'}">${esc(volts(ch.pointe.dU))} en pointe</em>` : ''}` : `<b${ch.hyp ? ' class="supp"' : ''}>${esc(volts(ch.dU))}</b>`, bulleU);
  // le plus fin qui tient : la gauge que le moteur dit pour son disjoncteur (sinon la plus fine qui porte le courant), d'un clic
  // (« Seulement ce câble », sous le calibre ÉCRIT : celui du domaine C, 08-controle, `plusFinSousLeRetest`, sinon le nôtre)
  let seul = null; if (!neuf && prot && prot.cause && typeof plusFinSousLeRetest === 'function') { try { seul = plusFinSousLeRetest(l); } catch (_) { seul = null; } }
  const fin = neuf ? null : seul || plusFinQuiTient(l, prot && prot.calEcrit), cause = causeDuCable(l, prot, fin);
  const reparer = fin && !cause ? `<p class="fi-reparer-l"><span>${esc(majuscule(fin.pourquoi))} : <b class="id">${esc(fin.type)}</b> (${esc(String(jaugeDuType(fin.type)))} AWG)</span><button type="button" class="btn papier fi-reparer" data-reparer="${escA(cleFil(l))}" data-type="${escA(fin.type)}" data-bulle="${escA((l.cable || 'Ce câble') + ' passe en ' + fin.type + ' — une entrée d’historique, Ctrl+Z le rend')}">Passer en ${esc(fin.type)}</button></p>` : '';
  // le résumé ne redit pas la tuile : il dit d'où vient le courant et où va la chute
  const resumeI = !x.fn ? 'ce qu’il admet ne se lit pas' : [x.al ? 'sous ' + esc(x.al.nom) : esc(nombre(H.courant)) + ' A supposés', ch.total ? 'en ligne vers ' + esc(ch.total.bout[0]) : ch.dU != null ? 'sur ce câble' : ''].filter(Boolean).join(' · ');
  const sections = [{ cle: 'trajet', resume: esc(`${l.de}${l.borneDe ? ':' + l.borneDe : ''} → ${l.vers}${l.borneVers ? ':' + l.borneVers : ''}`), badge: badgeProblemes(probs, 'trajet'), contenu: trajet },
    { cle: 'fils', titre: 'Intensité et chute', resume: insecable(resumeI), badge: badgeProblemes(probs, 'fils') || (x.fn ? { t: ico('coche'), etat: 'ok' } : { t: '—', etat: '' }), contenu: `<div class="fi-mesures">${intens}${chute}</div>${reparer}` }];
  const id = identite([l.type ? ident(l.type) : '', l.route ? esc(l.route) : '', esc(motFolios(neuf ? [] : foliosDe(l).map(String)))]);
  const ecrits = neuf ? [] : changementsEcrits([[l, ['cable', 'type', 'longueur', 'route', 'pnDe', 'pnVers', 'contactDe', 'contactVers']]]);
  return enTete({ type: 'fil', genre: 'Câble', identite: id, nom: neuf ? 'à créer' : (l.cable || 'sans numéro'), champ: neuf ? '' : 'fil-num', aide: 'Numéro du câble — écrire pour le changer', coul, etat: etatDesProblemes(probs) })
    + barreProblemes(probs, sections, { gestesTus: cause ? /^(Tout régler|Voir )/ : null }) + cause + blocRetest(ecrits, []) + tuilesHtml(tuiles) + ficheSections('fil', sections) + datalists + fiPied(neuf ? { voir: l.aPoser } : { tableau: l.cable || l.de, menu: MENU_FIL }); }

/* ---- LE PIED ---------------------------------------------------------------------------------------------------------- */
/* Le récapitulatif (filtré sur l'objet), « + câble » (une liaison de plus depuis ce repère), le relief, « voir », et sous
   « ··· » ce qu'on fait rarement. Collé en bas, toujours en vue, sobre : le premier geste est le principal (au filet),
   les suivants en clair (`.fantome`). */
function fiPied(o) { o = o || {};
  const gestes = [o.tableau != null ? { attrs: `id="fi-tableau" data-filtre="${escA(o.tableau)}"`, titre: 'Ses liaisons dans le récapitulatif', ico: 'tableau', mot: 'Récapitulatif' } : null,
    o.fil ? { attrs: `id="fi-fil-plus" data-de="${escA(o.fil)}"`, titre: 'Ajouter un câble depuis ' + o.fil + ' : une ligne de plus dans le récapitulatif, à remplir', ico: 'plus', mot: 'Câble' } : null,
    o.relief ? { attrs: 'id="eq-relief"', titre: 'La pièce en perspective (ou double-clic sur le bloc)', ico: 'relief', mot: 'Relief' } : null,
    o.voir ? { attrs: `data-choisir-bloc="${escA(o.voir)}"`, titre: '', ico: 'voir', mot: o.voir } : null].filter(Boolean);
  const boutons = gestes.map((g, k) => `<button type="button" class="fi-bouton${k ? ' fantome' : ''}" ${g.attrs}${g.titre ? ` data-bulle="${escA(g.titre)}"` : ''}>${ico(g.ico)}<span>${esc(g.mot)}</span></button>`).join('');
  const menu = (o.menu || []).map(([id, t, cls]) => `<button type="button" role="menuitem" id="${id}"${cls ? ` class="${cls}"` : ''}>${esc(t)}</button>`).join('');
  return `<footer class="fi-pied">${boutons}<span class="espace"></span>${menu ? `<div class="fi-plus"><button type="button" class="fi-x" id="fi-menu" aria-haspopup="true" aria-expanded="false" aria-label="Plus d’actions" data-bulle="${escA((o.menu || []).map(([, t]) => t).join(', '))}">${ico('points')}</button><div class="fi-menu" id="fi-menu-liste" role="menu" hidden>${menu}</div></div>` : ''}</footer>`; }
// le « ⋯ » (l'audit : « Renommer double le crayon, Désignation double le champ du nom ; seul Supprimer est neuf ») : copier la
// fiche en texte (pour un courriel, une fiche d'écart), supprimer — fait tout de suite, « Rétablir » dans le toast
const MENU_BLOC = [['fi-copier', 'Copier la fiche'], ['eq-del', 'Supprimer', 'danger']];
const MENU_FIL = [['fi-copier', 'Copier la fiche'], ['fil-tableau', 'Voir dans le récapitulatif'], ['fil-del', 'Supprimer ce câble', 'danger']];

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
const nomDeCible = c => c.type === 'fil' ? (c.l.cable || (c.l.origine === null ? 'câble à créer' : 'câble')) : c.type === 'ref' ? 'Déjà fait · ' + c.harness : c.nom;
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
  catch (err) { html = enTete({ type: 'equipement', genre: 'Élément', nom: c.nom || (c.l && c.l.cable) || '—' }) + `<p class="fi-note">${esc(String(err && err.message || err))}</p>`; }
  const nav = barreNav({ fermer: c.type !== 'ref', nom: nomDeCible(c) });
  const haut = box.scrollTop, a = document.activeElement, presse = meme && a && a.tagName === 'BUTTON' && box.contains(a) ? empreinteBouton(a) : null, ancres = meme ? ancresDe(box) : null;
  box.innerHTML = nav + html; box.dataset.cle = cle; box.className = 'fi'; box.dataset.type = c.type;
  // les sections ouvertes et le défilement : ceux qu'on avait (la même fiche, un retour), sinon ceux de la mémoire, en haut
  const etat = (meme || restaurer) && entree && entree.sections; if (etat) box.querySelectorAll('details.fs').forEach(d => { if (d.dataset.section in etat && !d.classList.contains('fs-clos')) d.open = etat[d.dataset.section]; });
  const pbs = $('fi-pbs'); if (pbs && FI.pbs === cle) pbs.open = true;
  // l'entrée (le fondu, les jauges qui se remplissent) ne joue qu'une fois : la marque s'en va quand elle est finie, pour
  // qu'un rendu en place (un champ qu'on écrit) ne la rejoue pas sur ce qu'il remplace
  clearTimeout(FI.entree);
  if (meme) box.scrollTop = haut; else if (restaurer) box.scrollTop = restaurer.haut || 0; else { box.scrollTop = 0; box.classList.remove('fondu'); void box.offsetWidth; box.classList.add('fondu'); FI.entree = setTimeout(() => box.classList.remove('fondu'), 900); }
  FI.rendu = meme ? 'meme' : 'neuf';
  if (c.type === 'ref') { lierComparaison(c); lierNav(box); const r = $('cp-retour'); if (r) r.onclick = () => naviguer(-1); } else lierFiche(c);
  if (presse) { const b = [...box.querySelectorAll('button')].find(x => empreinteBouton(x) === presse); if (b) { try { b.focus({ preventScroll: true }); } catch (_) { b.focus(); } } }
  // la même fiche refaite : ce que la main vient de toucher reste à sa hauteur d'écran
  if (ancres && !but) recaler(box, ancres);
  // ce que l'ouverture demandait : une section, une ligne allumée
  if (but) { const d = but.section ? ouvrirSection(box, but.section) : null;
    if (but.viser) { const li = box.querySelector(`[data-i="${CSS.escape(but.viser)}"]:not(.mj-contact)`); if (li) { const sec = li.closest('details.fs'); if (sec) sec.open = true; box.querySelectorAll(`[data-i="${CSS.escape(but.viser)}"]`).forEach(x => x.classList.add('vise', 'arrivee')); try { li.scrollIntoView({ block: 'center' }); } catch (_) { } } else if (d) d.scrollIntoView({ block: 'start' }); } }
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
  box.scrollTop = haut; FI.rendu = 'meme'; lierFiche(c); suivreDefilement(box); return true; }
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
  const e = $('fi-epingle'); if (e) e.onclick = ev => { ev.stopPropagation(); epinglerCarte(!CARTE.epingle); }; }
/* Retenir un autre choix (un arrangement, une variante, une norme) ou rendre le calcul : une entrée d'historique, le
   plan et le contrôle suivent. */
const choisirDesignation = (cle, d, quoi, mot) => { histPush(quoi); designer(cle, d); apresEdition(); if (mot) dire(mot); };
/* « Automatique » : chaque genre de valeur a son retour au choix de l'outil. `b` : le bouton (sa clé `data-auto`, sa ligne `data-k`). */
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
/* Écrire un champ d'un câble (numéro, type — ou sa famille, ou sa gauge, chacune à part —, route, longueur) : la liaison
   change (Ctrl+Z la rend). */
function ecrireChampFil(l, champ, brut) { if (!l) return; let v = String(brut == null ? '' : brut).trim();
  if (champ === 'famille' || champ === 'jauge') { const p = partiesDuType(l.type), f = champ === 'famille' ? v.toUpperCase().replace(/[^A-Z]/g, '') : p.famille, j = champ === 'jauge' ? (v.replace(/\D/g, '') || null) : p.jauge;
    if (champ === 'jauge' && v && !/^\d{1,2}$/.test(v)) { dire('Une gauge en AWG : un nombre (22, 20…).', true); rendreFiche(); return; }
    // une famille seule, sans gauge : la gauge d'avant reste ; une famille vide efface le type
    changerLiaison(l, 'type', f ? typeDe(f, j) : null, (champ === 'famille' ? 'type' : 'gauge') + ' de ' + (l.cable || 'câble')); return; }
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
  const d = ouvrirSection(box, section); if (d && o.viser) { box.querySelectorAll('.vise, .arrivee').forEach(x => x.classList.remove('vise', 'arrivee')); const li = d.querySelector(`[data-i="${CSS.escape(o.viser)}"]:not(.mj-contact)`); if (li) { li.classList.add('vise', 'arrivee'); try { li.scrollIntoView({ block: 'center', behavior: mouvementReduit() ? 'auto' : 'smooth' }); } catch (_) { } } } }
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
  // une bulle de connecteur l'ouvre, sur place et allumée (v73, l'ingénieur : « un clic sur A ne l'ouvre pas ») — même quand la section est fermée
  box.querySelectorAll('.seg[data-connecteur]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); FI.connecteur[nom] = b.dataset.connecteur; FI.liste = ''; rendreFiche(); const bx = $('ba-equip'); if (bx) ouvrirSection(bx, 'connecteur', true, true); });
  // la face d'un connecteur se montre d'office : un clic sur sa puce la replie, un autre la rend
  box.querySelectorAll('[data-face]').forEach(b => b.onclick = () => { const k = b.dataset.face; FI.face[k] = FI.face[k] === false; rendreFiche(); });
  box.querySelectorAll('[data-voir-face]').forEach(b => b.onclick = () => { FI.face[nom] = b.dataset.voirFace; rendreFiche(); });
  box.querySelectorAll('[data-gal-famille]').forEach(b => b.onclick = () => { FI.galerie[nom] = b.dataset.galFamille; rendreFiche(); });
  box.querySelectorAll('[data-changer]').forEach(b => b.onclick = () => { const k = b.dataset.changer; FI.liste = FI.liste === k ? '' : k; rendreFiche();
    const v = box.querySelector(`[data-volet="${CSS.escape(k)}"]`); if (v) { const f = v.querySelector('[data-filtre-liste]'); try { v.scrollIntoView({ block: 'nearest' }); } catch (_) { } if (f) f.focus(); } });
  box.querySelectorAll('[data-sertir]').forEach(b => b.onclick = e => { e.stopPropagation(); const k = 'sertir:' + b.dataset.sertir; FI.liste = FI.liste === k ? '' : k; rendreFiche(); });
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
  box.querySelectorAll('[data-cable][data-champ]').forEach(el => ecouter(el, 'change', () => { const x = liaisonDeCle(el.dataset.cable); if (x) ecrireChampFil(sourceDe(x) || x, el.dataset.champ, el.value); }));
  // la liaison du câble : numéro, type, route, longueur ; les deux bouts
  if (l) { box.querySelectorAll('[data-edit]').forEach(el => ecouter(el, 'change', () => ecrireChampFil(l, el.dataset.edit, el.value)));
    const num = $('fil-num'); if (num) ecouter(num, 'change', () => ecrireChampFil(l, 'cable', num.value));
    box.querySelectorAll('[data-bout]').forEach(b => b.onclick = () => { const cote = b.dataset.bout, rep = l[cote], borne = cote === 'de' ? l.borneDe : l.borneVers; if (!rep) return;
      const g = estMasse(rep) ? null : connecteurParBorne(rep, liaisonsDeRepere(rep)).get(String(borne)); allerAuBloc(rep, estMasse(rep) ? { section: 'fils', viser: cleFil(l) } : { connecteur: g ? g.nom : '', section: 'connecteur', viser: cleFil(l) }); });
    if ($('fil-tableau')) $('fil-tableau').onclick = () => recapitulatifDe(c);
    // supprimer : fait tout de suite, « Rétablir » dans le toast (plus de boîte du navigateur ; Ctrl+Z aussi)
    if ($('fil-del')) $('fil-del').onclick = () => { const i = verite().indexOf(l); if (i < 0) return; const quoi = 'Câble ' + (l.cable || 'sans numéro') + ' (' + l.de + ' → ' + l.vers + ') supprimé (Ctrl+Z).';
      supprimerLiaison(i); deselectionner(); direRetablir(quoi, () => { const x = verite()[i]; if (x) montrerFil(x); }); }; }
  lierChoix(box, c);
  // « Copier la fiche » (le « ⋯ ») ; « ↺ » d'un changement par rapport au retest ; la gauge qui se loge ou qui tient, d'un clic ;
  // « et 7 autres points » de la carte de décision ouvre la barre des problèmes
  if ($('fi-copier')) $('fi-copier').onclick = () => copierLaFiche(box, nomDeCible(c));
  box.querySelectorAll('[data-rendre-retest]').forEach(b => b.onclick = e => { e.stopPropagation(); const x = (FI.ecarts || [])[+b.dataset.rendreRetest]; if (x) { rendreChamps(x.rendre, 'retour au retest : ' + (x.sujet ? x.sujet + ' ' : '') + x.champ); dire('Le retest est rendu : ' + x.avant + ' (Ctrl+Z).'); } });
  // les gestes d'un point de la barre des problèmes (le domaine C, `gestesDuPoint`)
  box.querySelectorAll('[data-geste-pb]').forEach(b => b.onclick = e => { e.stopPropagation(); const [k, i] = b.dataset.gestePb.split(':').map(Number), g = ((FI.gestesPb || [])[k] || [])[i]; if (!g) return;
    const avant = app.cible; g.faire(); if (app.cible === avant && !$('inspecteur').hidden && !rafraichirFicheEnPlace()) rendreFiche(); });
  // « Tout régler » (la fiche d'un câble dont le disjoncteur est la cause) : le geste de la carte de décision du disjoncteur
  box.querySelectorAll('[data-tout-regler]').forEach(b => b.onclick = e => { e.stopPropagation(); const cb = b.dataset.toutRegler, fait = typeof toutRegler === 'function' ? toutRegler(cb) : typeof deciderCalibre === 'function' ? parVolta(() => deciderCalibre(cb)) : false; if (fait && !rafraichirFicheEnPlace()) rendreFiche(); });
  box.querySelectorAll('[data-reparer]').forEach(b => b.onclick = e => { e.stopPropagation(); const x = liaisonDeCle(b.dataset.reparer), y = x ? sourceDe(x) || x : null; if (!y) return;
    if (parVolta(() => changerLiaison(y, 'type', b.dataset.type, 'type de ' + (y.cable || 'câble') + ' : ' + b.dataset.type))) dire((y.cable || 'Le câble') + ' passe en ' + b.dataset.type + ' (Ctrl+Z le rend).'); });
  box.querySelectorAll('[data-ouvrir-pbs]').forEach(b => b.onclick = () => { const d = $('fi-pbs'); if (!d) return; d.open = true; FI.pbs = box.dataset.cle; try { d.scrollIntoView({ block: 'nearest', behavior: mouvementReduit() ? 'auto' : 'smooth' }); } catch (_) { } });
  if (!nom) return;
  // le repère, dans l'en-tête ; le type et la désignation, à côté
  const rep = $('eq-rep'); if (rep) ecouter(rep, 'change', () => { if (!renommerDepuisFiche(nom, rep.value)) rep.value = nom; else { const r = $('fi-crayon'); if (r) r.focus(); } });
  const vtp = $('vt-poser'); if (vtp) vtp.onclick = () => { const v = $('vt-repere'); renommerDepuisFiche(nom, v ? v.value : ''); };
  const des = $('eq-des'); if (des) ecouter(des, 'change', () => { const v = des.value.trim(); if (v === (app.contrat.designations.get(nom) || '')) return; histPush('désignation de ' + nom); designer(nom, v); apresEdition(); });
  if ($('fi-renommer')) $('fi-renommer').onclick = () => { if (rep) { rep.focus(); rep.select(); } };
  if ($('fi-designer')) $('fi-designer').onclick = () => { const d = $('eq-des'); if (d) { d.focus(); d.select(); } };
  // supprimer : fait tout de suite, « Rétablir » dans le toast (plus de boîte du navigateur ; Ctrl+Z aussi)
  if ($('eq-del')) $('eq-del').onclick = () => { const n = verite().filter(x => x.de === nom || x.vers === nom).length;
    histPush('suppression de ' + nom); supprimerEquipement(nom); app.base.filtre = ''; deselectionner(); apresEdition();
    direRetablir(nom + ' supprimé, et ' + (n > 1 ? 'ses ' + n + ' liaisons' : 'sa liaison') + ' (Ctrl+Z).', () => { if (repereVivant(nom)) montrerBloc(nom); }); };
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
  box.querySelectorAll('.cand[data-cle], .cand-l[data-cle]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return; FI.liste = ''; choisirDesignation(b.dataset.cle, b.dataset.ref, 'choix de ' + b.dataset.cle, b.dataset.ref + ' retenu.'); });
  box.querySelectorAll('[data-garder]').forEach(b => b.onclick = () => choisirDesignation(nom, b.dataset.garder, 'le retest pour ' + nom, b.dataset.garder + ' retenu, comme le retest.'));
  box.querySelectorAll('[data-sexe]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return; histPush('sexe des contacts de ' + b.dataset.sexe); app.contrat.sexes.set(b.dataset.sexe, b.dataset.v); apresEdition(); });
  box.querySelectorAll('[data-raccord]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return; const k = b.dataset.raccord, v = b.dataset.v;
    histPush('raccord de ' + k); const o = { ...(app.contrat.raccords.get(k) || {}) }; o[b.dataset.champ] = v === 'true' ? true : v === 'false' ? false : v; app.contrat.raccords.set(k, o); apresEdition(); });
  box.querySelectorAll('[data-rac-ref]').forEach(el => ecouter(el, 'change', () => { const k = el.dataset.racRef, v = el.value.trim(), o = { ...(app.contrat.raccords.get(k) || {}) }; if ((o.designation || '') === v || (!o.designation && v === el.defaultValue)) return;
    histPush('désignation du raccord de ' + k); if (v) o.designation = v; else delete o.designation; if (Object.keys(o).length) app.contrat.raccords.set(k, o); else app.contrat.raccords.delete(k); apresEdition(); }));
  box.querySelectorAll('[data-sertir-ref]').forEach(b => b.onclick = () => { const k = b.dataset.sertirRef; if (b.getAttribute('aria-pressed') === 'true') { FI.liste = ''; rendreFiche(); return; }
    const { rep, borne } = deCleSertir(k); FI.liste = ''; app.contrat.designations.delete(k); changerLiaisons(boutsSur(rep, borne).map(([l, ch]) => [l, ch, b.dataset.v]), 'contact à sertir'); });
  box.querySelectorAll('[data-pn]').forEach(el => ecouter(el, 'change', () => { const v = el.value.trim(), bornes = el.dataset.bornes === '*' ? '*' : JSON.parse(el.dataset.bornes), xs = liaisonsDuConnecteur(nom, bornes);
    if (!xs.length) return; changerLiaisons(xs.map(([x, ch]) => [x, ch, v]), 'référence de ' + nom + (el.dataset.pn === '*' ? '' : ' ' + el.dataset.pn)); }));
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
  if (t.closest('.fi-choix, [data-changer], [data-sertir], .dj-crans')) return; const box = $('ba-equip'); if (!box || !box.contains(t)) return; FI.liste = '';
  box.querySelectorAll('.fi-choix-ligne, .fi-choix').forEach(x => x.remove()); box.querySelectorAll('[data-changer][aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false')); }, true);

/* « COPIER LA FICHE » (l'idée n°5 de l'audit : « un texte propre pour un courriel ou une fiche d'écart ») : le repère et
   sa ligne d'identité, les problèmes, ce qui change par rapport au retest, chaque section en une ligne, et les câbles en
   colonnes — lus dans la fiche telle qu'elle est montrée. */
function copierLaFiche(box, nom) { const t = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '', L = [];
  L.push([nom, t(box.querySelector('.fi-identite')), (box.querySelector('#eq-des') || {}).value || ''].filter(Boolean).join(' — '));
  const pbs = [...box.querySelectorAll('.fi-pb-l .fi-pb-t')].map(t); if (pbs.length) L.push('', t(box.querySelector('.fi-pb-n')), ...pbs.map(x => '  · ' + x));
  const ecs = [...box.querySelectorAll('.fi-ec-l')].map(li => '  · ' + t(li.querySelector('.fi-ec-q')) + ' : ' + t(li.querySelector('.fi-ec-v s')) + ' → ' + t(li.querySelector('.fi-ec-v b'))); if (ecs.length) L.push('', 'Par rapport au retest', ...ecs);
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
