/* ===========================================================================
   08 — LA FICHE À SECTIONS : le squelette commun des cinq fiches
   (équipement, disjoncteur, barrette, prise de coupure, fil) — le fil
   conducteur que le lecteur demande : « toujours la même chose, ne jamais
   perdre l'utilisateur ».

   Sous l'en-tête d'une fiche, des SECTIONS dans un ordre fixe (ORDRE_SECTIONS).
   Une section fermée parle encore : son titre, une ligne de résumé, une
   pastille (un nombre, ✓, ★, « — ») de la couleur de ce qu'elle contient
   (rouge un problème, ambre un point à voir, vert bon, gris sinon). On ouvre
   d'office ce qui définit l'objet (OUVERTES_D_OFFICE) ; ce que l'ingénieur
   ouvre ou ferme se garde, par type d'objet (s'il ouvre « Chute » sur un
   disjoncteur, elle sera ouverte sur le suivant). Une section dont la donnée
   manque reste à sa place, fermée, grise, et dit ce qui manque.

   Une valeur calculée porte son ORIGINE (auto, retest, main, hyp., norme) ;
   forcée à la main, « ↺ automatique (la valeur calculée) » la rend.
   =========================================================================== */
'use strict';

const SECTIONS = { identite: 'Identité', calibre: 'Le meilleur calibre', courbe: 'Courbe de déclenchement', profil: 'Profil de charge',
  connecteur: 'Connecteur', contacts: 'Contacts', fils: 'Fils et intensité', chute: 'Chute de tension', habillage: 'Habillage et raccords',
  dejafait: 'Déjà fait', detail: 'Le détail du calcul', problemes: 'Problèmes' };
const ORDRE_SECTIONS = Object.keys(SECTIONS);
const OUVERTES_D_OFFICE = { equipement: ['connecteur', 'contacts'], disjoncteur: ['calibre', 'courbe', 'profil'], barrette: ['connecteur', 'contacts'],
  prise: ['connecteur', 'contacts'], fil: ['identite', 'connecteur', 'fils'] };

/* La mémoire des sections, par type : ce que l'ingénieur a ouvert ou fermé (dans ce navigateur ; une mémoire
   indisponible — navigation privée — n'empêche rien : on garde les valeurs d'office). */
const CLE_SECTIONS = 'atelier.fiche.sections';
const MEMOIRE_SECTIONS = (() => { try { return JSON.parse(localStorage.getItem(CLE_SECTIONS) || '{}') || {}; } catch (_) { return {}; } })();
function sectionOuverte(type, cle) { const m = MEMOIRE_SECTIONS[type]; return m && cle in m ? !!m[cle] : (OUVERTES_D_OFFICE[type] || []).includes(cle); }
function retenirSection(type, cle, ouvert) { (MEMOIRE_SECTIONS[type] = MEMOIRE_SECTIONS[type] || {})[cle] = !!ouvert;
  try { localStorage.setItem(CLE_SECTIONS, JSON.stringify(MEMOIRE_SECTIONS)); } catch (_) { } }

/* Une section : { cle, titre?, resume?, badge?: { t, etat: 'ko'|'att'|'ok'|'' }, contenu, vide?, ouvert? }.
   `resume` et `contenu` sont du HTML déjà échappé ; `vide` est la raison (texte) quand la donnée manque. */
function ficheSection(type, s) { const titre = s.titre || SECTIONS[s.cle] || s.cle, ouvert = !s.vide && (s.ouvert != null ? s.ouvert : sectionOuverte(type, s.cle));
  const badge = s.badge && s.badge.t != null && s.badge.t !== '' ? `<span class="fs-badge${s.badge.etat ? ' ' + s.badge.etat : ''}">${s.badge.t}</span>` : '';
  const resume = s.vide ? esc(s.vide) : s.resume || '';
  return `<details class="fs${s.vide ? ' fs-vide' : ''}" data-section="${escA(s.cle)}" data-type="${escA(type)}"${ouvert ? ' open' : ''}>`
    + `<summary class="fs-tete"><span class="fs-titres"><span class="fs-titre">${esc(titre)}</span>${resume ? `<span class="fs-resume">${resume}</span>` : ''}</span>`
    + `${badge}${ico('bas', 'fs-chevron')}</summary><div class="fs-corps">${s.contenu || ''}</div></details>`; }
/* Les sections d'une fiche, dans l'ordre fixe ; une clé hors de l'ordre se met à la fin. */
function ficheSections(type, liste) { const xs = liste.filter(Boolean), rang = s => { const k = ORDRE_SECTIONS.indexOf(s.cle); return k < 0 ? 99 : k; };
  return xs.slice().sort((a, b) => rang(a) - rang(b)).map(s => ficheSection(type, s)).join(''); }
/* Ouvrir une section par programme (un lien « voir » d'un problème, une pastille) : elle s'ouvre et vient sous les yeux ;
   ce n'est pas un choix de l'ingénieur, on ne le retient pas. */
function ouvrirSection(box, cle) { const d = box && box.querySelector(`details.fs[data-section="${CSS.escape(cle)}"]`); if (!d) return null;
  d.open = true; try { d.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (_) { d.scrollIntoView(); } return d; }
// ce que l'ingénieur ouvre ou ferme à la main (un clic, ou Entrée / Espace sur le titre), on le retient pour ce type
document.addEventListener('click', e => { const t = e.target && e.target.closest && e.target.closest('summary.fs-tete'); if (!t) return;
  const d = t.parentElement; if (!d || d.classList.contains('fs-vide')) return; setTimeout(() => retenirSection(d.dataset.type, d.dataset.section, d.open), 0); });

/* L'ORIGINE d'une valeur, en petit à côté d'elle : d'où vient ce qu'on lit. */
const ORIGINES = { auto: 'auto', retest: 'retest', main: 'main', hyp: 'hyp.', norme: 'norme' };
const origine = (o, titre) => `<i class="orig orig-${escA(o)}"${titre ? ` title="${escA(titre)}"` : ''}>${esc(ORIGINES[o] || o)}</i>`;
/* « ↺ automatique (valeur) » : rend le calcul à une valeur forcée à la main. `cle` dit quoi rendre ; la fiche lie le
   bouton par [data-auto]. */
const retourAuto = (cle, valeurAuto) => `<button type="button" class="fs-auto" data-auto="${escA(cle)}" title="Rendre la valeur calculée par l’outil">↺ automatique${valeurAuto != null && valeurAuto !== '' ? ' <span>(' + esc(valeurAuto) + ')</span>' : ''}</button>`;

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
