/* ===========================================================================
   08 — LA FICHE À SECTIONS : le squelette commun des fiches (équipement,
   disjoncteur, barrette, prise de coupure, masse, câble), version 4.

   Le lecteur (la v3) : « les tuiles, dégage ; l'identité, avec du recul, ça
   dégage partout ; « fil », dis « câble » ; « habillage », ce n'est pas ça :
   c'est le raccord ». Sous l'en-tête (le type et le repère, modifiables) et
   la barre des problèmes, PEU de sections — des chapitres posés à même la
   feuille, séparés par un filet et de l'air, plus des cartes (v68 : « pas de
   carte dans une carte ») : une icône, un titre affirmé, une ligne de résumé,
   une pastille d'état, le chevron —, dans un ordre fixe (ORDRE_SECTIONS) :
     Calibre (un disjoncteur) · Connecteur (ou Module) · Raccord ·
     De → vers (un câble) · Câbles (intensité et chute ensemble) · Déjà fait.
   Fermée, une section se lit encore ; ouverte, ses groupes sont séparés d'un
   filet et espacés. Toutes sont PLIÉES d'office (le lecteur, version 62 : « toutes les
   sections doivent être pliées : c'est beaucoup plus propre ») ; ce que
   l'ingénieur ouvre ou ferme se garde, par type d'objet.
   Une section dont la donnée manque reste à sa place, en pointillé, et dit ce
   qui manque. Un lien qui y mène (une ligne des problèmes) l'ouvre, la fait
   venir sous les yeux et l'allume un instant.

   Une valeur se change sur place, d'un champ qui se voit. Plus de « ↺ » ni de
   pastille « main » (le lecteur : « le bouton revenir en arrière, ça ne sert
   à rien : si on veut, on retapera ») : ce que l'outil choisit, la liste de
   choix le rend — sa ligne « Automatique ».

   LE « ? » (le lecteur : « explique, avec un petit point d'interrogation,
   comment tu choisis tout » ; puis : « pas une grosse pâte de texte :
   moins, avec des couleurs, plus interactif ») : à côté de chaque valeur que
   l'outil choisit, un petit rond discret ; un clic (ou Entrée) ouvre une
   bulle courte — UNE phrase (ce que l'outil a pris, ici), des pastilles de
   couleur (les chiffres qui comptent), et deux volets qu'on déplie d'un clic :
   « Comment » (la règle en quelques étapes numérotées) et « D'où ça vient »
   (les sources) ; une seule bulle à la fois ; Échap, un autre clic ou un
   clic ailleurs la ferme. Les mots viennent de `explication(cle, contexte)`
   (08-explications) ; des textes provisoires courts les remplacent si elle
   manque.
   =========================================================================== */
'use strict';

const SECTIONS = { disjoncteur: 'Calibre', connecteur: 'Connecteur', raccord: 'Raccord', trajet: 'De → vers', fils: 'Câbles', dejafait: 'Déjà fait' };
const ORDRE_SECTIONS = Object.keys(SECTIONS);
// ouvertes d'office : aucune — une fiche s'ouvre pliée, chaque carte dit l'essentiel dans son résumé
const OUVERTES_D_OFFICE = {};
/* L'icône de chaque section : SVG 24 × 24 au trait de 1,5 px (comme ICONES, 08-fiche). */
const ICONES_SECTIONS = {
  disjoncteur: '<path d="M3 16h3.5M17.5 16H21"/><circle cx="8" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/><path d="M9 15.2 15.4 10.2"/><path d="M12.2 4.5v6M9.6 4.5h5.2"/>',
  connecteur: '<rect x="3.5" y="6.5" width="12" height="11" rx="2"/><path d="M15.5 9.5h3.5M15.5 14.5h3.5"/><circle cx="7.5" cy="10.5" r=".9" fill="currentColor"/><circle cx="11.5" cy="10.5" r=".9" fill="currentColor"/><circle cx="7.5" cy="13.5" r=".9" fill="currentColor"/><circle cx="11.5" cy="13.5" r=".9" fill="currentColor"/>',
  // le raccord : un écrou à collier sur le toron
  raccord: '<path d="M3 12h4M17 12h4"/><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 7v10M14 7v10"/>',
  trajet: '<circle cx="5" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/><path d="M7.2 12h9.6M13.8 9l3 3-3 3"/>',
  fils: '<path d="M3 7.5h7c3 0 4 9 7 9h4M3 16.5h4c3 0 4-9 7-9h7"/>',
  dejafait: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v3.7h3.7"/><path d="M12 8.2V12l2.6 1.8"/>'
};
const icoSection = cle => ICONES_SECTIONS[cle] ? `<span class="fs-ico" aria-hidden="true"><svg class="ico" viewBox="0 0 24 24">${ICONES_SECTIONS[cle]}</svg></span>` : '';

/* La mémoire des sections, par type : ce que l'ingénieur a ouvert ou fermé (dans ce navigateur ; une mémoire
   indisponible — navigation privée — n'empêche rien : on garde les valeurs d'office). La clé change avec la v5 :
   tout se plie d'office, ce qu'on avait ouvert avant ne compte plus. */
const CLE_SECTIONS = 'atelier.fiche.sections.v5';
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
/* Un GROUPE dans une section : un petit titre (son « ? » à côté, et, à sa droite, ce qu'on y fait), puis son contenu —
   cadré par l'espace et un filet au-dessus du suivant. o : { cls, attrs, droite, compte, aide: [cle, contexte] } */
const groupeSection = (titre, contenu, o) => { o = o || {}; if (!contenu) return '';
  const q = o.aide ? aide(o.aide[0], o.aide[1]) : '';
  return `<div class="fs-groupe${o.cls ? ' ' + o.cls : ''}"${o.attrs ? ' ' + o.attrs : ''}>${titre || o.droite ? `<div class="fs-st"><span>${titre ? esc(titre) : ''}${o.compte != null ? ` <i>${o.compte}</i>` : ''}${q}</span>${o.droite || ''}</div>` : ''}${contenu}</div>`; };
/* Ouvrir une section par programme (une ligne des problèmes, un lien « voir ») : elle s'ouvre, vient sous les yeux et
   s'allume un instant ; ce n'est pas un choix de l'ingénieur, on ne le retient pas. */
function ouvrirSection(box, cle, allumer) { const d = box && box.querySelector(`details.fs[data-section="${CSS.escape(cle)}"]`); if (!d) return null;
  d.open = true; try { d.scrollIntoView({ block: 'start', behavior: mouvementReduit() ? 'auto' : 'smooth' }); } catch (_) { d.scrollIntoView(); }
  if (allumer !== false) { d.classList.remove('fs-allume'); void d.offsetWidth; d.classList.add('fs-allume'); setTimeout(() => d.classList.remove('fs-allume'), 1400); }
  return d; }
// ce que l'ingénieur ouvre ou ferme à la main (un clic, ou Entrée / Espace sur le titre), on le retient pour ce type ; une
// action posée dans le résumé (`.fs-action`, un « ? ») agit sans ouvrir ni fermer ; une section vide sans contenu ne s'ouvre pas
document.addEventListener('click', e => { const t = e.target && e.target.closest && e.target.closest('summary.fs-tete'); if (!t) return;
  if (e.target.closest('.fs-action, .fi-q, .ct-bulle')) { e.preventDefault(); return; }
  const d = t.parentElement; if (!d) return; if (d.classList.contains('fs-clos')) { e.preventDefault(); return; }
  // une section qu'on ouvre entre (son corps en fondu, ses lignes l'une après l'autre) ; la marque s'en va ensuite, pour
  // qu'un rendu en place ne rejoue rien
  if (!d.open) { d.classList.add('fs-entre'); clearTimeout(d._entre); d._entre = setTimeout(() => d.classList.remove('fs-entre'), 700); }
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

/* ---- LE « ? » : comment l'outil a choisi -------------------------------------------------------------------------- */
/* Les textes provisoires, courts : ceux de `explication` (08-explications) les remplacent dès qu'elle est là. */
const AIDES_PROVISOIRES = {
  calibre: ['Le calibre', 'L’outil essaie chaque calibre de la gamme du part number, du plus petit au plus grand, et garde le premier dont la courbe tient tout le profil de charge, avec la marge des hypothèses. Les courbes viennent de la norme de la famille du disjoncteur.'],
  courbe: ['La courbe de déclenchement', 'Le temps que met le disjoncteur à couper selon le courant, à chaque température de la norme. Un point du profil à gauche des courbes ne déclenche pas.'],
  profil: ['Le profil de charge', 'Ce que l’équipement tire : le démarrage, la transition, le permanent, et les états qu’on ajoute. Chaque état se juge sur la courbe.'],
  rail: ['Le rail', 'Le profilé qui porte tous les modules de la barrette, coupé à leur longueur. Sa référence vient de la table Accessoires de la norme ; quand la norme ne le nomme pas, celle du catalogue du fabricant.'],
  module: ['Le module', 'L’outil prend le plus petit module de la norme qui loge tous les potentiels de la barrette, chaque câble dans un contact qui admet sa gauge. Les modules viennent de la bible des barrettes.'],
  arrangement: ['L’arrangement', 'Celui que le part number nomme, sinon le plus petit arrangement de la norme qui a toutes les bornes et dont les contacts admettent les gauges des câbles.'],
  prise: ['L’arrangement de la prise', 'Le plus petit arrangement de la norme qui loge tous les contacts de la prise, côté fiche et côté embase, avec les gauges de leurs câbles.'],
  contact: ['Le contact à sertir', 'La table Contacts de la norme donne, pour la taille du contact, son sexe et la gauge du câble, la référence à sertir.'],
  gauge: ['La gauge acceptée', 'La gauge du câble se lit dans son type (DR20 : 20 AWG) ; la norme dit quelles gauges la taille du contact accepte.'],
  raccord: ['Le raccord', 'Choisi dans la table des raccords selon la norme du connecteur, sa taille, la reprise de blindage, l’étanchéité et l’orientation.'],
  bande: ['Le band-it', 'Le collier qui reprend le blindage sur le raccord : le plus petit dont le diamètre admis couvre le toron.'],
  manchon: ['Le manchon', 'Le manchon thermorétractable dont la plage de diamètre couvre le toron à la sortie du raccord.'],
  tyrap: ['Le tyrap', 'Le collier qui tient le toron : le plus petit dont le diamètre admis couvre le toron.'],
  cheminee: ['La cheminée', 'Un connecteur EN 4165 prend une cheminée par module, à la place d’un raccord.'],
  toron: ['Le toron', 'Le diamètre du faisceau de câbles du connecteur, calculé depuis le diamètre de chaque câble (la base des câbles).'],
  intensite: ['L’intensité admise', 'Ce que le câble admet selon l’EN 2853, déclassé comme la simulation : le faisceau, l’altitude, l’ambiante. Le courant vient du profil du disjoncteur en amont, sinon de l’hypothèse.'],
  chute: ['La chute de tension', 'La résistance du câble × sa longueur × le courant, en ligne depuis le disjoncteur. Le seuil vient du réseau : la tension et le régime de la simulation.'],
  masse: ['La masse', 'Un point de retour au corps de l’appareil : les câbles qui y vont n’ont ni connecteur ni contact.']
};
/* Les mots d'un « ? » : ceux de `explication`, sinon le provisoire (une phrase seule). */
function explicationDe(cle, ctx) { let e = null;
  try { e = typeof explication === 'function' ? explication(cle, ctx || {}) : null; } catch (_) { e = null; }
  const p = AIDES_PROVISOIRES[cle] || ['', ''];
  return { titre: (e && e.titre) || p[0], phrase: (e && (e.phrase || e.texte)) || p[1], chiffres: (e && e.chiffres) || [], etapes: (e && e.etapes) || [], sources: (e && e.sources) || '', texte: (e && e.texte) || p[1] }; }
/* LA BULLE en HTML : la phrase, les pastilles, puis les deux volets — « Comment » ouvert d'office quand il n'y a pas de
   pastille (le « ? » d'un en-tête de colonne : la règle est tout ce qu'on a à dire). */
function bulleAideHtml(e) { const comment = e.etapes.length && !e.chiffres.length;
  const pastilles = e.chiffres.length ? `<div class="q-chiffres">${e.chiffres.map(([k, v, ton]) => `<span class="q-c${ton ? ' ' + ton : ''}"><i>${esc(k)}</i><b>${esc(v)}</b></span>`).join('')}</div>` : '';
  const volet = (cle, mot, html, ouvert) => `<button type="button" class="q-plier" data-q-volet="${cle}" aria-expanded="${ouvert}">${esc(mot)}<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button><div class="q-volet" data-q-corps="${cle}"${ouvert ? '' : ' hidden'}>${html}</div>`;
  const etapes = e.etapes.length ? volet('comment', 'Comment', `<ol class="q-etapes">${e.etapes.map((t, k) => `<li style="--k:${k}"><span>${k + 1}</span>${esc(t)}</li>`).join('')}</ol>`, comment) : '';
  const sources = e.sources ? volet('sources', 'D’où ça vient', `<p class="q-sources">${esc(e.sources)}</p>`, false) : '';
  return `<div class="q-tete"><span class="q-ico" aria-hidden="true">?</span><b id="fi-q-titre">${esc(e.titre || 'Comment l’outil choisit')}</b></div>`
    + `<p class="q-phrase">${esc(e.phrase || 'L’explication arrive.')}</p>${pastilles}${etapes || sources ? `<div class="q-volets">${etapes}${sources}</div>` : ''}`; }
/* Le bouton « ? » d'une valeur : `cle` dit laquelle, `ctx` ce qui la précise — les objets mêmes du moteur (le verdict d'un
   disjoncteur, le plan d'un module, l'habillage d'un connecteur : ce que 08-explications sait lire). Ils se gardent le
   temps d'un rendu, sous un numéro que le bouton porte (`data-q-id`) ; le rendu suivant repart de zéro, dans le même
   ordre (un rendu en place retrouve les mêmes numéros). */
const AIDE_CTX = { n: 0, m: new Map() };
const remettreAides = () => { AIDE_CTX.n = 0; AIDE_CTX.m.clear(); };
const aide = (cle, ctx) => { const t = (AIDES_PROVISOIRES[cle] || [cle])[0]; let id = '';
  if (ctx) { id = String(++AIDE_CTX.n); AIDE_CTX.m.set(id, ctx); }
  return `<button type="button" class="fi-q" data-q="${escA(cle)}"${id ? ` data-q-id="${id}"` : ''} aria-label="${escA('Comment l’outil le choisit — ' + t)}" aria-expanded="false" aria-haspopup="dialog">?</button>`; };
/* LA BULLE du « ? » : une seule à la fois, sous le bouton (au-dessus s'il n'y a pas la place), qui suit le défilement. */
const AIDE = { el: null, bouton: null };
function fermerAide(rendreFocus) { const b = AIDE.bouton; AIDE.bouton = null; if (AIDE.el) AIDE.el.hidden = true;
  if (b) { b.setAttribute('aria-expanded', 'false'); b.removeAttribute('aria-describedby'); b.classList.remove('ouvert'); if (rendreFocus && b.isConnected) b.focus(); } }
function placerAide() { const b = AIDE.bouton, el = AIDE.el; if (!b || !el) return;
  if (!b.isConnected) { fermerAide(); return; } const r = b.getBoundingClientRect();
  if (r.bottom < 0 || r.top > window.innerHeight || (r.width === 0 && r.height === 0)) { fermerAide(); return; }
  const w = el.offsetWidth, h = el.offsetHeight, W = window.innerWidth, H = window.innerHeight;
  const x = Math.max(8, Math.min(r.left + r.width / 2 - 24, W - w - 8)), y = r.bottom + 8 + h <= H - 8 ? r.bottom + 8 : Math.max(8, r.top - 8 - h);
  el.style.left = x + 'px'; el.style.top = y + 'px'; }
function ouvrirAide(b) { if (AIDE.bouton === b) { fermerAide(); return; } fermerAide();
  if (typeof cacherBulle === 'function') cacherBulle();
  const e = explicationDe(b.dataset.q, (b.dataset.qId && AIDE_CTX.m.get(b.dataset.qId)) || {});
  if (!AIDE.el) { AIDE.el = document.createElement('div'); AIDE.el.id = 'fi-q-bulle'; AIDE.el.className = 'fi-q-bulle'; AIDE.el.setAttribute('role', 'dialog'); AIDE.el.setAttribute('aria-modal', 'false'); AIDE.el.setAttribute('aria-labelledby', 'fi-q-titre'); document.body.appendChild(AIDE.el);
    // un volet s'ouvre ou se ferme d'un clic, la bulle se replace (elle a grandi)
    AIDE.el.addEventListener('click', ev => { const v = ev.target.closest && ev.target.closest('.q-plier'); if (!v) return; const corps = AIDE.el.querySelector(`[data-q-corps="${v.dataset.qVolet}"]`); if (!corps) return;
      const ouvert = corps.hidden; corps.hidden = !ouvert; v.setAttribute('aria-expanded', String(ouvert)); placerAide(); }); }
  AIDE.el.innerHTML = bulleAideHtml(e);
  AIDE.el.hidden = false; AIDE.bouton = b; b.setAttribute('aria-expanded', 'true'); b.setAttribute('aria-describedby', 'fi-q-bulle'); b.classList.add('ouvert'); placerAide(); }
// un clic sur un « ? » l'ouvre (ou le ferme) ; ailleurs, la bulle se ferme ; Échap la ferme et rend le clavier au bouton
document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('.fi-q');
  if (b) { e.preventDefault(); e.stopPropagation(); ouvrirAide(b); return; }
  if (AIDE.bouton && !(e.target.closest && e.target.closest('.fi-q-bulle'))) fermerAide(); }, true);
// … et dès l'appui ailleurs : un appui sur le plan le redessine (il désélectionne), et le navigateur n'émet alors pas de
// « click » — la bulle resterait ouverte au-dessus de la table
document.addEventListener('pointerdown', e => { if (AIDE.bouton && !(e.target && e.target.closest && e.target.closest('.fi-q-bulle, .fi-q'))) fermerAide(); }, true);
window.addEventListener('keydown', e => { if (e.key === 'Escape' && AIDE.bouton) { e.preventDefault(); e.stopPropagation(); fermerAide(true); } }, true);
window.addEventListener('scroll', () => { if (AIDE.bouton) placerAide(); }, true);
window.addEventListener('resize', () => { if (AIDE.bouton) placerAide(); });
