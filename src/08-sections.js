/* ===========================================================================
   08 — LA FICHE À SECTIONS : le squelette commun des cinq fiches
   (équipement, disjoncteur, barrette, prise de coupure, fil), version 3.

   Le lecteur : « trop d'écrit, trop de gris, trop de sections, rien de
   carré ». Sous l'en-tête et la barre des problèmes, PEU de sections, chacune
   une CARTE (une icône, un titre affirmé, une ligne de résumé, une pastille
   d'état, le chevron), dans un ordre fixe (ORDRE_SECTIONS) :
     Identité · Disjoncteur (un disjoncteur) · Connecteur (ou Module) ·
     De → vers (un fil) · Fils (intensité et chute ensemble) · Déjà fait.
   Fermée, une carte se lit encore ; ouverte, ses groupes sont cadrés et
   espacés. Ce que l'ingénieur ouvre ou ferme se garde, par type d'objet.
   Une section dont la donnée manque reste à sa place, grise, et dit ce qui
   manque. Un lien qui y mène (une ligne des problèmes, une tuile de l'en-tête)
   l'ouvre, la fait venir sous les yeux et l'allume un instant.

   Une valeur se change sur place ; changée à la main, elle porte la pastille
   « main » et « ↺ » qui rend ce que portait le fichier ou le calcul.
   =========================================================================== */
'use strict';

const SECTIONS = { identite: 'Identité', disjoncteur: 'Disjoncteur', connecteur: 'Connecteur', trajet: 'De → vers', fils: 'Fils', dejafait: 'Déjà fait' };
const ORDRE_SECTIONS = Object.keys(SECTIONS);
// ouvertes d'office : tout ce qui définit l'objet — « Déjà fait » attend un clic
const OUVERTES_D_OFFICE = { equipement: ['identite', 'connecteur', 'fils'], disjoncteur: ['identite', 'disjoncteur', 'fils'], barrette: ['identite', 'connecteur', 'fils'],
  prise: ['identite', 'connecteur', 'fils'], fil: ['identite', 'trajet', 'fils'] };
/* L'icône de chaque section : SVG 24 × 24 au trait de 1,5 px (comme ICONES, 08-fiche). */
const ICONES_SECTIONS = {
  identite: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16.2c.7-1.6 1.9-2.4 3.2-2.4s2.5.8 3.2 2.4M14.5 10h3.5M14.5 13.5h2.5"/>',
  disjoncteur: '<path d="M3 16h3.5M17.5 16H21"/><circle cx="8" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/><path d="M9 15.2 15.4 10.2"/><path d="M12.2 4.5v6M9.6 4.5h5.2"/>',
  connecteur: '<rect x="3.5" y="6.5" width="12" height="11" rx="2"/><path d="M15.5 9.5h3.5M15.5 14.5h3.5"/><circle cx="7.5" cy="10.5" r=".9" fill="currentColor"/><circle cx="11.5" cy="10.5" r=".9" fill="currentColor"/><circle cx="7.5" cy="13.5" r=".9" fill="currentColor"/><circle cx="11.5" cy="13.5" r=".9" fill="currentColor"/>',
  trajet: '<circle cx="5" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/><path d="M7.2 12h9.6M13.8 9l3 3-3 3"/>',
  fils: '<path d="M3 7.5h7c3 0 4 9 7 9h4M3 16.5h4c3 0 4-9 7-9h7"/>',
  dejafait: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.7h3.7"/><path d="M12 8.2V12l2.6 1.8"/>'
};
const icoSection = cle => ICONES_SECTIONS[cle] ? `<span class="fs-ico" aria-hidden="true"><svg class="ico" viewBox="0 0 24 24">${ICONES_SECTIONS[cle]}</svg></span>` : '';

/* La mémoire des sections, par type : ce que l'ingénieur a ouvert ou fermé (dans ce navigateur ; une mémoire
   indisponible — navigation privée — n'empêche rien : on garde les valeurs d'office). La clé change avec la v3 : les
   sections d'hier (« Contacts », « Chute »…) n'existent plus. */
const CLE_SECTIONS = 'atelier.fiche.sections.v3';
const MEMOIRE_SECTIONS = (() => { try { return JSON.parse(localStorage.getItem(CLE_SECTIONS) || '{}') || {}; } catch (_) { return {}; } })();
function sectionOuverte(type, cle) { const m = MEMOIRE_SECTIONS[type]; return m && cle in m ? !!m[cle] : (OUVERTES_D_OFFICE[type] || []).includes(cle); }
function retenirSection(type, cle, ouvert) { (MEMOIRE_SECTIONS[type] = MEMOIRE_SECTIONS[type] || {})[cle] = !!ouvert;
  try { localStorage.setItem(CLE_SECTIONS, JSON.stringify(MEMOIRE_SECTIONS)); } catch (_) { } }

/* Une section : { cle, titre?, resume?, badge?: { t, etat: 'ko'|'att'|'ok'|'' }, contenu, vide?, action?, ouvert? }.
   `resume`, `contenu` et `action` sont du HTML déjà échappé ; `vide` est la raison (texte) quand la donnée manque, et
   `action` ce qu'on peut y faire (un bouton `.fs-action` : « charger les contrats déjà faits »), posé au bout du résumé.
   Une section vide qui a quand même un contenu (où envoyer la donnée, ce qu'on peut saisir) s'ouvre ; sans contenu, non. */
function ficheSection(type, s) { const titre = s.titre || SECTIONS[s.cle] || s.cle, ouvrable = !s.vide || !!s.contenu;
  const ouvert = ouvrable && (s.ouvert != null ? s.ouvert : !s.vide && sectionOuverte(type, s.cle));
  const badge = s.badge && s.badge.t != null && s.badge.t !== '' ? `<span class="fs-badge${s.badge.etat ? ' ' + s.badge.etat : ''}">${s.badge.t}</span>` : '';
  const resume = (s.vide ? esc(s.vide) : s.resume || '') + (s.action ? ' ' + s.action : '');
  return `<details class="fs${s.vide ? ' fs-vide' : ''}${ouvrable ? '' : ' fs-clos'}" data-section="${escA(s.cle)}" data-type="${escA(type)}"${ouvert ? ' open' : ''}>`
    + `<summary class="fs-tete">${icoSection(s.cle)}<span class="fs-titres"><span class="fs-titre">${esc(titre)}</span>${resume ? `<span class="fs-resume">${resume}</span>` : ''}</span>`
    + `${badge}${ico('bas', 'fs-chevron')}</summary><div class="fs-corps">${s.contenu || ''}</div></details>`; }
/* Les sections d'une fiche, dans l'ordre fixe ; une clé hors de l'ordre se met à la fin. */
function ficheSections(type, liste) { const xs = liste.filter(Boolean), rang = s => { const k = ORDRE_SECTIONS.indexOf(s.cle); return k < 0 ? 99 : k; };
  return xs.slice().sort((a, b) => rang(a) - rang(b)).map(s => ficheSection(type, s)).join(''); }
/* Un GROUPE dans une section : un petit titre (et, à sa droite, ce qu'on y fait), puis son contenu — cadré par l'espace
   et un filet au-dessus du suivant. */
const groupeSection = (titre, contenu, o) => { o = o || {}; if (!contenu) return '';
  return `<div class="fs-groupe${o.cls ? ' ' + o.cls : ''}"${o.attrs ? ' ' + o.attrs : ''}>${titre || o.droite ? `<div class="fs-st"><span>${titre ? esc(titre) : ''}${o.compte != null ? ` <i>${o.compte}</i>` : ''}</span>${o.droite || ''}</div>` : ''}${contenu}</div>`; };
/* Ouvrir une section par programme (une ligne des problèmes, une tuile, un lien « voir ») : elle s'ouvre, vient sous les
   yeux et s'allume un instant ; ce n'est pas un choix de l'ingénieur, on ne le retient pas. */
function ouvrirSection(box, cle, allumer) { const d = box && box.querySelector(`details.fs[data-section="${CSS.escape(cle)}"]`); if (!d) return null;
  d.open = true; try { d.scrollIntoView({ block: 'start', behavior: mouvementReduit() ? 'auto' : 'smooth' }); } catch (_) { d.scrollIntoView(); }
  if (allumer !== false) { d.classList.remove('fs-allume'); void d.offsetWidth; d.classList.add('fs-allume'); setTimeout(() => d.classList.remove('fs-allume'), 1400); }
  return d; }
// ce que l'ingénieur ouvre ou ferme à la main (un clic, ou Entrée / Espace sur le titre), on le retient pour ce type ; une
// action posée dans le résumé (`.fs-action`) agit sans ouvrir ni fermer ; une section vide sans contenu ne s'ouvre pas
document.addEventListener('click', e => { const t = e.target && e.target.closest && e.target.closest('summary.fs-tete'); if (!t) return;
  if (e.target.closest('.fs-action')) { e.preventDefault(); return; }
  const d = t.parentElement; if (!d) return; if (d.classList.contains('fs-clos')) { e.preventDefault(); return; }
  if (d.classList.contains('fs-vide')) return; setTimeout(() => retenirSection(d.dataset.type, d.dataset.section, d.open), 0); });

/* LA PASTILLE D'UNE SECTION par ses problèmes : chaque problème d'une fiche porte la section qui le démontre
   (`{ niveau: 'ko'|'att', texte, section }`) ; la section le compte dans sa pastille, rouge s'il y a un problème, ambre
   s'il n'y a que des points à voir. Rend la pastille, ou null s'il n'y a rien (la section garde alors la sienne). */
function badgeProblemes(probs, cle) { const xs = (probs || []).filter(p => p.section === cle); if (!xs.length) return null;
  const ko = xs.filter(p => p.niveau === 'ko').length; return { t: String(ko || xs.length), etat: ko ? 'ko' : 'att' }; }

/* L'ORIGINE d'une valeur, en petit à côté d'elle : la fiche ne la pose que quand elle compte — « main » (changée ici),
   « hyp. » (une hypothèse de la simulation) ; ce que le retest ou le calcul donnent se lit sans pastille. */
const ORIGINES = { auto: 'auto', retest: 'retest', main: 'main', hyp: 'hyp.', norme: 'norme' };
const origine = (o, titre) => `<i class="orig orig-${escA(o)}"${titre ? ` title="${escA(titre)}"` : ''}>${esc(ORIGINES[o] || o)}</i>`;
/* « ↺ » : rend le calcul (ou le fichier) à une valeur forcée à la main. `cle` dit quoi rendre ; la fiche lie le bouton
   par [data-auto] ; la valeur rendue se lit au survol et à côté, en petit. */
const retourAuto = (cle, valeurAuto) => `<button type="button" class="fs-auto" data-auto="${escA(cle)}" title="${escA('Rendre la valeur calculée' + (valeurAuto != null && valeurAuto !== '' ? ' : ' + valeurAuto : ''))}">↺${valeurAuto != null && valeurAuto !== '' ? ' <span>' + esc(valeurAuto) + '</span>' : ''}</button>`;

/* CHANGER UNE LIAISON, d'où qu'on la change (sa fiche, le récapitulatif) : une entrée d'historique (Ctrl+Z), la vérité
   change, le plan et le contrôle suivent. Ce que la liaison portait avant la première retouche de ce champ (le retest,
   ou rien) se garde dans `l.avant` — une copie neuve à chaque fois, pour que l'historique (qui copie la liaison) ne
   la partage pas. `origineChamp` en déduit l'origine : « main » si on l'a changé ici, « hyp » pour une longueur que
   l'hypothèse remplace, « retest » sinon ; `rendreChamp` rend ce que portait le fichier. */
function changerLiaison(l, champ, valeur, quoi) { if (!l || l[champ] === valeur) return false;
  histPush(quoi || 'modification d’une liaison');
  if (!(l.avant && champ in l.avant)) l.avant = { ...(l.avant || {}), [champ]: l[champ] == null ? null : l[champ] };
  if (valeur == null || valeur === '') delete l[champ]; else l[champ] = valeur;
  app.actif = l; apresEdition(); return true; }
function origineChamp(l, champ) { if (!l) return 'auto';
  if (l.avant && champ in l.avant && l.avant[champ] !== (l[champ] == null ? null : l[champ])) return 'main';
  if (champ === 'longueur' && l.longueur == null) return 'hyp';
  return 'retest'; }
function rendreChamp(l, champ) { if (!(l && l.avant && champ in l.avant)) return false; const v = l.avant[champ];
  histPush('retour au fichier'); const av = { ...l.avant }; delete av[champ]; if (Object.keys(av).length) l.avant = av; else delete l.avant;
  if (v == null) delete l[champ]; else l[champ] = v; apresEdition(); return true; }
/* Plusieurs liaisons d'un geste (le part number d'un connecteur : le pnDe ou le pnVers de chacune de ses liaisons) : une
   seule entrée d'historique, l'avant de chaque champ gardé comme `changerLiaison`. `xs` : [[liaison, champ, valeur]]. */
function changerLiaisons(xs, quoi) { const ys = xs.filter(([l, c, v]) => l && l[c] !== v); if (!ys.length) return false; histPush(quoi || 'modification de liaisons');
  ys.forEach(([l, c, v]) => { if (!(l.avant && c in l.avant)) l.avant = { ...(l.avant || {}), [c]: l[c] == null ? null : l[c] }; if (v == null || v === '') delete l[c]; else l[c] = v; });
  apresEdition(); return true; }
/* … et les rendre ensemble à ce que portait le fichier. `xs` : [[liaison, champ]]. */
function rendreChamps(xs, quoi) { const ys = xs.filter(([l, c]) => l && l.avant && c in l.avant); if (!ys.length) return false; histPush(quoi || 'retour au fichier');
  ys.forEach(([l, c]) => { const v = l.avant[c], av = { ...l.avant }; delete av[c]; if (Object.keys(av).length) l.avant = av; else delete l.avant; if (v == null) delete l[c]; else l[c] = v; });
  apresEdition(); return true; }
