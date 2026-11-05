/* ===========================================================================
   08 — LA FICHE À DEUX NIVEAUX (v78)
   Le lecteur : « quand je clique sur un disjoncteur, une barrette, une prise de coupure, un équipement, on a une certaine
   forme pour présenter les données ; refais ça de la manière la plus habile, la plus belle, la plus expérience
   utilisateur — une sorte de base de données en temps réel sur chaque plan ». Ses choix, un par un :
     · DEUX NIVEAUX — un clic sur le plan : la CARTE, près du bloc, l'essentiel (l'état et quoi faire, les chiffres clés,
       les problèmes) et « Tout voir » ; « Tout voir », ou un double-clic : LE GRAND, la fiche entière ;
     · LE GRAND À DROITE, LE PLAN VISIBLE — il prend les deux tiers droits ; le plan vit à gauche : survoler un câble de la
       fiche l'allume sur le plan, et l'objet reste cadré ;
     · LA LISTE À GAUCHE — les objets du même genre (les disjoncteurs de l'installation, les câbles du folio…), chacun de
       la couleur de son état ; un clic change la fiche, l'onglet ouvert reste le même : on passe d'un disjoncteur à
       l'autre en regardant toujours ses câbles ;
     · UN RÉSUMÉ FIXE, PUIS DES ONGLETS — un sujet chacun (Calibre · Connecteur · Contacts · Raccord · Câbles ·
       Modifications) ; le résumé ne bouge pas, seul l'onglet défile ;
     · L'ÉTAT ET QUOI FAIRE D'ABORD — un bandeau vert « Tout va bien », ou rouge « 2 problèmes — … » avec le geste qui
       répare ;
     · LES CÂBLES EN TABLEAU TRIABLE — une ligne par câble (type · vers · intensité · chute · longueur · contact) ; un
       clic sur un en-tête trie, un clic sur une ligne ouvre le câble ;
     · LA VALEUR SE CHANGE AU CLIC — elle se lit comme un texte, un crayon paraît au survol, un clic l'écrit sur place.
   Les fiches (08-fiche) disent ce qu'elles montrent — l'en-tête, les problèmes, les sections, les chiffres, les
   modifications, le pied — à `composerFiche` ; ce module dit comment, au niveau où l'on est. Les calculs ne changent pas.
   Le récapitulatif ouvert, la fiche est le volet de droite : la fiche entière, à onglets, sans la liste.
   =========================================================================== */
'use strict';

const NIVEAU = { grand: false, onglet: { objet: '', vus: new Map() }, tri: { col: '', sens: 1 }, filtre: '', pbsOuvert: '' };
const recapOuvert = () => !!(typeof app !== 'undefined' && app.base && app.base.ouvert);
// la fiche entière : le grand demandé, ou le récapitulatif ouvert (la fiche y est le volet de droite)
const ficheEnGrand = () => !!NIVEAU.grand || recapOuvert();
// le grand avec sa liste à gauche : ni au téléphone (la feuille entière), ni à côté du récapitulatif
const grandLarge = () => !!NIVEAU.grand && !recapOuvert() && !telephone();

/* ---- LES ONGLETS (v78, le lecteur : « beaucoup plus lisibles, plus clairs, plus compréhensibles ») : chacun dit en deux
   lignes ce qu'il contient et où il en est — « Calibre · 15 A, il passe », « Câbles · 3, au plus 44 % », « Fabrication ·
   17 pièces ». Toujours le même ordre : l'essentiel d'abord, les réglages et l'historique à la fin. ---- */
const ORDRE_ONGLETS = ['essentiel', 'calibre', 'cables', 'fabrication', 'reglages', 'dejafait', 'modifs'];
const TITRES_ONGLETS = { essentiel: 'L’essentiel', calibre: 'Calibre', cables: 'Câbles', fabrication: 'Pièces', reglages: 'Modifier', dejafait: 'Déjà fait', modifs: 'Historique' };
// d'où mène une section d'hier, un point, une case : à quel onglet
const ONGLET_DE_SECTION = { disjoncteur: 'calibre', connecteur: 'essentiel', contacts: 'essentiel', trajet: 'essentiel', raccord: 'reglages', conso: 'reglages', fils: 'cables', dejafait: 'dejafait', modifs: 'modifs' };
const ongletDeSection = (type, cle) => !cle ? '' : (type === 'fil' && cle === 'fils') ? 'essentiel' : ONGLET_DE_SECTION[cle] || cle;
const titreOnglet = s => s.titre || TITRES_ONGLETS[s.cle] || (typeof SECTIONS !== 'undefined' && SECTIONS[s.cle]) || s.cle;
const rangOnglet = s => { const k = ORDRE_ONGLETS.indexOf(s.cle); return k < 0 ? 50 : k; };
/* L'ONGLET OUVERT (v85, le lecteur : « quand je vais sur la fiche détaillée d'un autre objet, je reste sur l'onglet de
   l'ancien — Modifier — : à chaque fois je dois revenir sur L'essentiel ») : une fiche ouverte sur un AUTRE objet que la
   précédente commence à L'essentiel. L'onglet ne se garde que pour le même objet (on ferme, on rouvre), au retour par ‹ ›
   (on retrouve la fiche comme on l'a laissée), ou quand un geste le demande (un point qui mène à Câbles, « Comment VOLTA a
   choisi » qui mène à Calibre : `ouvrirGrand(onglet)`, `activerOnglet`). `NIVEAU.onglet` : { objet (le dernier montré en
   grand), vus (objet → son onglet) }. */
const ongletRetenu = (ici, k) => { const O = NIVEAU.onglet; O.objet = ici; if (!ici) return; O.vus.delete(ici); O.vus.set(ici, k); if (O.vus.size > 60) O.vus.delete(O.vus.keys().next().value); };
function ongletActif(type, xs) { const ici = cleObjet(), O = NIVEAU.onglet, retour = typeof NAV !== 'undefined' && NAV.mode === 'histoire';
  const garde = ici && (ici === O.objet || retour) ? O.vus.get(ici) : '', k = garde && xs.some(s => s.cle === garde) ? garde : (xs.find(s => s.cle === 'essentiel') || xs[0] || {}).cle || '';
  ongletRetenu(ici, k); return k; }
function ongletsHtml(type, xs) { if (!xs.length) return '';
  const actif = ongletActif(type, xs);
  const tabs = xs.map(s => { const st = s.statut || {};
    return `<button type="button" role="tab" class="nv-onglet" id="nv-o-${escA(s.cle)}" data-onglet="${escA(s.cle)}" aria-selected="${s.cle === actif}" aria-controls="nv-p-${escA(s.cle)}" tabindex="${s.cle === actif ? 0 : -1}"${st.bulle ? ` data-bulle="${escA(st.bulle)}"` : ''}>`
      + `<span class="nv-o-t">${esc(titreOnglet(s))}</span><span class="nv-o-s${st.etat ? ' ' + st.etat : ''}">${st.t != null && st.t !== '' ? esc(st.t) : '&nbsp;'}</span></button>`; }).join('');
  const panneaux = xs.map(s => `<section class="nv-panneau${s.vide ? ' fs-vide' : ''}" role="tabpanel" id="nv-p-${escA(s.cle)}" data-section="${escA(s.cle)}" aria-labelledby="nv-o-${escA(s.cle)}" tabindex="-1"${s.cle === actif ? '' : ' hidden'}>`
    + (s.vide ? `<p class="vu-note">${esc(majuscule(s.vide))}${s.action ? ' ' + s.action : ''}</p>` : '') + (s.contenu || '') + '</section>').join('');
  return `<div class="nv-onglets" role="tablist" aria-label="Ce que dit la fiche">${tabs}</div><div class="nv-panneaux" id="nv-panneaux">${panneaux}</div>`; }
// une section d'hier (une fiche pas encore redessinée) devient un onglet
const ongletDeLaSection = s => ({ cle: s.cle === 'fils' ? 'cables' : s.cle === 'connecteur' ? 'essentiel' : s.cle, titre: s.cle === 'fils' || s.cle === 'connecteur' ? '' : s.titre, statut: s.resume ? { t: String(s.resume).replace(/<[^>]*>/g, '').slice(0, 40) } : null, contenu: s.contenu, vide: s.vide, action: s.action });

// les onglets que toutes les fiches partagent : les câbles (la section d'hier, son statut en mots), la fabrication
/* (v86, le lecteur : « 2 câbles · 80 % : on ne comprend pas ce que veut dire 80 % ; si je me pose la question, c'est que ce
   n'est pas bon ») : le statut se lit sans réfléchir et tient dans l'onglet le plus étroit (132 px, à côté du récapitulatif)
   — « chargés à 80 % » (le plus chargé porte 80 % du courant qu'il admet), « 2 à régler », « 1 à voir » (les mots des
   problèmes de la fiche ; « en défaut » se lisait comme un court-circuit) ; sans type, pas de pourcentage. La bulle nomme
   le câble et dit les ampères, ou ce qui cloche, câble par câble. `sF` : la section des câbles (08-fiche, `sectionFils`). */
const statutCables = sF => { if (sF.vide) return { t: 'aucun', etat: '' };
  const n = sF.compte || 0, p = sF.pire, pc = sF.charge != null ? Math.round(sF.charge * 100) : null, raisons = (sF.raisons || []).slice(0, 4).join('\n');
  if (sF.nko) return { t: sF.nko + ' à régler', etat: 'ko', bulle: (sF.nko > 1 ? sF.nko + ' câbles à régler' : '1 câble à régler') + (raisons ? ' :\n' + raisons : '') };
  if (sF.natt) return { t: sF.natt + ' à voir', etat: 'att', bulle: (sF.natt > 1 ? sF.natt + ' câbles à voir' : '1 câble à voir') + (raisons ? ' :\n' + raisons : '') };
  const sans = sF.nsans ? (sF.nsans > 1 ? sF.nsans + ' câbles sans type' : '1 câble sans type') + ' : ce qu’' + (sF.nsans > 1 ? 'ils admettent' : 'il admet') + ' est inconnu' : '';
  if (pc == null) return { t: n > 1 && sF.nsans === n ? n + ' sans type' : sF.nsans ? 'sans type' : pluriel(n, 'câble'), etat: '', bulle: sans };
  const qui = n > 1 ? 'Le plus chargé de ses ' + n + ' câbles' + (p && p.nom ? ', ' + p.nom + ',' : '') : 'Son câble' + (p && p.nom ? ', ' + p.nom + ',' : '');
  return { t: (n > 1 ? 'chargés à ' : 'chargé à ') + pc + ' %', etat: '',
    bulle: qui + (p && p.i != null && p.admis != null ? ' porte ' + nombreA(p.i) + ' A ; il en admet ' + nombreA(p.admis) + ' : il est chargé à ' + pc + ' %.' : ' porte ' + pc + ' % du courant qu’il admet.') + (sans ? '\n' + majuscule(sans) + '.' : '') }; };
const ongletCables = sF => !sF ? null : { cle: 'cables', statut: statutCables(sF), contenu: sF.contenu, vide: sF.vide };
function ongletFabrication(groupes, titre) { const gs = (groupes || []).filter(g => g && g.lignes && g.lignes.length); if (!gs.length) return null;
  const n = gs.reduce((s, g) => s + g.lignes.reduce((t, l) => t + (l.q || 0), 0), 0);
  return { cle: 'fabrication', statut: { t: n + '\u00a0à commander' }, contenu: `<section class="vu-bloc"><h4 class="vu-titre nv-lpa-t">${esc(titre || 'Ce qu’il faut pour la monter')} <span>${esc(pluriel(n, 'pièce'))}</span>
    ${/* (v83) la LPA du plan entier, d'un clic : la même que la nomenclature, en Excel */ ''}<button type="button" class="nv-lpa-b" data-lpa data-bulle="Ce qu’il faut commander pour tout le plan, compté : contacts, modules, connecteurs, câbles"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v7.5M4.8 7 8 10.2 11.2 7M3 12.5h10"/></svg>LPA du plan · Excel</button></h4>${fabricationVue(gs)}</section>` }; }

/* ---- L'EN-TÊTE (v78, le lecteur : « le disjoncteur doit être centré, en gros : on doit direct comprendre ce que c'est ;
   et proprement à côté, son nom ; en dessous, sa référence, sa gamme — le folio, on s'en fout ; plus de pastille d'état »)
   : le symbole du genre en grand, le genre en mot, le repère à côté (il se renomme d'un clic) ; dessous, ce qui l'identifie.
   Dans le grand, la même chose sur une ligne fine : la barre qu'on tient pour déplacer la fenêtre. ---- */
const GENRES_FICHE = { equipement: 'Équipement', disjoncteur: 'Disjoncteur', barrette: 'Barrette de jonction', prise: 'Prise de coupure', masse: 'Masse', fil: 'Câble' };
function enteteFiche(o, grand) { const t = o.tete || {}, nom = t.nom || '';
  // (v78, le lecteur : « le genre et la référence, même taille, même police — un tiret au milieu ; pas d'écarts de gras »)
  // (v85) le repère vient du fichier : il ne se renomme pas ici (charte) — seule une barrette AJOUTÉE par VOLTA reçoit son vrai
  // repère (son champ porte une aide qui le dit)
  const rep = t.champ && t.aide ? `<input class="nc-rep-in" id="${t.champ}" value="${escA(nom)}" size="${Math.max(3, nom.length)}" style="width:calc(${Math.max(3, nom.length) + 1}ch + 14px)" aria-label="${escA(t.aide || 'Repère — écrire pour renommer partout')}" data-bulle="${escA(t.aide || 'Un clic pour le renommer : chaque câble suit')}" spellcheck="false" autocomplete="off">`
    : `<span class="nc-rep-t">${esc(nom)}</span>`;
  const ms = (o.meta || []).filter(Boolean);
  // (v84) une référence se lit en puce, à la chasse fixe ; une phrase (« ajoutée par VOLTA sur 102CB1:2 », « route PUISSANCE »)
  // reste une phrase, en clair — une puce de code autour d'une phrase la fait passer pour une référence
  // (v86) plus d'étiquette « Référence » devant la puce : sous un repère, un code au trait se lit de lui-même (sa bulle le dit)
  const metaV = m => /class="id"/.test(m) ? `<span class="nc-meta-v" data-bulle="Sa référence">${m}</span>` : `<span class="nc-meta-v texte">${m}</span>`;
  const meta = ms.length ? `<div class="nc-meta fi-identite">${ms.map(metaV).join('')}</div>` : '';
  /* (v86, le lecteur : « Disjoncteur, 102CB1, Référence : trop de variations de couleurs et de fonds, trop de gras différents ;
     quelque chose de plus homogène » — et : « je ne sais pas différencier les équipements des disjoncteurs, des barrettes ») :
     UNE hiérarchie, la même dans la carte et dans le grand — la SILHOUETTE de l'objet, sa forme du folio en trait de cuivre
     (08-vues, `silhouetteVue` : le genre se reconnaît d'un coup d'œil), qui se trace à l'ouverture ; le genre en mot, en gris,
     discret ; le REPÈRE, le seul grand ; la référence dessous, une seule pastille au trait. Deux graisses (500, 600), l'encre
     et un gris, aucun fond (style-z-carte). Dans la carte, la silhouette est le SCEAU de la barre (à la place de la poignée :
     la barre se tient toujours) ; dans le grand, elle ouvre la ligne. */
  const genre = GENRES_FICHE[o.type] || 'Élément';
  const titre = `<span class="nc-genre-mot">${esc(genre)}</span><span class="nc-rep">${rep}</span>`;
  const sil = silhouetteVue(o.type, silhouetteDe(o));
  // (v83) en grand, « module 2 de VT2 » se lit dans la première section (la barrette et tous ses modules) : pas deux fois
  const msG = ms.filter(m => !/^(module|partie) \S+ de /.test(m));
  if (grand) return `<div class="nc-tete fine"><span class="nc-sil" aria-hidden="true">${sil}</span><span class="nc-titre">${titre}</span>${msG.length ? `<span class="nc-meta fi-identite">${msG.map(metaV).join('')}</span>` : ''}</div>`;
  return `<span class="nc-sceau" aria-hidden="true">${sil}</span><div class="nc-tete"><span class="nc-titre${nom.length > 9 ? ' long' : ''}">${titre}</span></div>${meta}`; }
// ce que la silhouette dessine de CET objet : les modules d'une barrette, les connecteurs d'un équipement
function silhouetteDe(o) { const nom = (o.tete || {}).nom || '';
  try { if (o.type === 'barrette') { const n = typeof modulesDeLaBarrette === 'function' ? modulesDeLaBarrette(nom).length : 0; return { modules: n || 3 }; }
    if (o.type === 'equipement' && typeof connecteursDe === 'function') return { connecteurs: connecteursDe(nom, verite()).filter(c => c.nom).length || 1 }; } catch (_) { }
  return {}; }
// la désignation (un texte libre, gardé avec le contrat) : dans l'onglet « Modifier » du grand
/* (v78c, le lecteur : « Modifier, faut tout reprendre, c'est pas hyper compréhensible ») : l'onglet « Modifier » se lit en
   CARTES — chacune son titre, une phrase qui dit ce que ça change, puis le réglage. */
const DESIGNATION_SAISIE = false;
const slugReg = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// (v85) `o.paresseux` : une liste longue (les modules de la norme, les arrangements) ne se calcule qu'ouverte — fermée, la
// section est là, vide, marquée ; l'ouvrir refait la fiche (`lierSommaire`)
const regCarte = (titre, phrase, corps, o) => { o = o || {}; if (!corps && !o.paresseux) return '';
  return `<section class="nv-reg${o.cls ? ' ' + o.cls : ''}" data-reg="${escA(o.reg || slugReg(titre))}"${!corps ? ' data-paresseux="1"' : ''}><header class="nv-reg-t"><h4>${esc(titre)}</h4>${phrase ? `<p>${phrase}</p>` : ''}${o.droite ? `<span class="nv-reg-d">${o.droite}</span>` : ''}</header><div class="nv-reg-c">${corps || ''}</div></section>`; };
// (v79, le lecteur : « c'est pas à moi de mettre un nom : je change le fichier de base si je veux un nom ; tout au même
// endroit ») : plus de saisie du nom dans la fiche — la carte reste (`regCarte`) pour d'autres réglages
const designationFiche = o => { const t = o.tete || {}; if (!t.designation || !DESIGNATION_SAISIE) return ''; const des = app.contrat.designations.get(t.designation) || '';
  return regCarte('Son nom en clair', 'Gardé avec le contrat, montré sous le repère. Le repère, lui, vient de votre fichier et ne change pas.',
    `<label class="nv-des"><span class="sr">Nom en clair</span><input class="nc-des${des ? ' plein' : ''}" id="eq-des" value="${escA(des)}" placeholder="par exemple : relais de démarrage" spellcheck="false" autocomplete="off"></label>`, { cls: 'nv-reg-nom' }); };

/* CE QUE VOUS POUVEZ CHANGER (v82, le lecteur : « Modifier, ce n'est pas intuitif : je ne vois pas les boutons, ce qu'il
   y avait avant, ce qu'il y a après, ce que ça m'apporte, où il a cherché, pourquoi ; les sections dans l'ordre ») : en
   tête de l'onglet, une ligne par réglage — ce que c'est ; ce qui est retenu et d'où ça vient ; avant → après quand il a
   changé ; pourquoi, en une phrase ; le bouton qui mène à sa section, allumée. `xs` : [{ titre, valeur (html), source,
   avant (html), pourquoi (html), vers (sélecteur), geste, etat }]. */
/* MODIFIER EN TROIS SORTES (v85, le lecteur : « ce qui vient de mon fichier, je ne veux plus le saisir ici — une seule
   source, sinon je m'emmêle les pinceaux ; les choix de VOLTA, avec un Automatique / Manuel bien visible ; l'information,
   ce que je ne dois pas modifier, se lit ») : trois cartes, chacune son titre, son signe et sa phrase.
     · DANS VOTRE FICHIER — la valeur, d'où elle vient ; aucune saisie : elle se change dans le fichier. Seule une
       PROPOSITION justifiée de VOLTA (« Passer en DR20 », « Tout régler ») se prend d'un clic : ce qu'elle change, ce
       qu'elle coûte ; elle ira dans l'Excel corrigé, qui devient le fichier source ;
     · CHOIX DE VOLTA — la valeur, pourquoi VOLTA l'a prise, et AUTOMATIQUE | MANUEL : Manuel ouvre les possibles sur
       place (on en prend un, un mot le dit, « Défaire ») ; Automatique, d'un geste, rend le choix à VOLTA ;
     · INFORMATION — ce qui se calcule et ne se règle pas : ça se lit, sans bouton.
   `xs` : [{ sorte ('fichier' · 'choix' · 'info'), titre, valeur (html), source, motSource, avant (html), pourquoi (html),
   etat ; choix : vers (la section des possibles), manuel, auto (la clé du retour : « arr:… », « sexe:… »), motAuto (ce que dit
   le retour) ; fichier : proposition ({ phrase (html), cout, bouton (html) }) }] */
const SORTES_REG = {
  fichier: { titre: 'Dans votre fichier', phrase: 'VOLTA le lit tel quel ; pour le changer, changez votre fichier.', ico: '<path d="M7 3.5h6.5L18 8v12.5H7z"/><path d="M13.5 3.5V8H18M10 12.5h5M10 16h5"/>' },
  choix: { titre: 'Choix de VOLTA', phrase: 'VOLTA choisit et dit pourquoi ; en Manuel, vous prenez le vôtre.', ico: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>' },
  info: { titre: 'Information', phrase: 'Calculé par VOLTA : cela se lit, cela ne se règle pas.', ico: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.9v.1"/>' } };
// la fiche montrée, pour la section ouverte : une autre fiche ne rouvre pas le réglage de la précédente
const cleDuReglage = () => { const c = typeof app !== 'undefined' && app.cible; return !c ? '' : c.type === 'fil' ? 'fil|' + (typeof cleFil === 'function' ? cleFil(c.l) : '') : 'bloc|' + (c.nom || ''); };
const reglageOuvert = sel => !!sel && NIVEAU.sommOuvert === sel && NIVEAU.sommCle === cleDuReglage();
const pastilleSource = (s, mot) => s ? `<span class="vu-src ${escA(s)}">${esc(mot || MOTS_SOURCES[s] || s)}</span>` : '';
// AUTOMATIQUE | MANUEL : deux segments qui ne bougent pas, celui qui vaut est pressé ; Manuel ouvre les possibles sous la ligne
function selecteurAM(x) { const man = !!x.manuel, quoi = String(x.titre || '').toLowerCase();
  return `<span class="nv-am${man ? ' manuel' : ''}" role="group" aria-label="${escA('Qui choisit ' + quoi)}">`
    + `<button type="button" class="nv-am-b" data-am="auto"${x.auto ? ` data-am-cle="${escA(x.auto)}"` : ''}${x.motAuto ? ` data-am-mot="${escA(x.motAuto)}"` : ''} aria-pressed="${!man}" data-bulle="${escA(man ? 'Rendre le choix à VOLTA' : 'VOLTA choisit — c’est le cas')}">Automatique</button>`
    + `<button type="button" class="nv-am-b nv-somm-b" data-am="manuel" data-somm="${escA(x.vers)}" aria-pressed="${man}" aria-expanded="false" data-bulle="${escA(man ? 'Retenu à la main — un clic montre les possibles' : 'Voir les possibles et en prendre un')}">Manuel</button></span>`; }
// une proposition de VOLTA sur une valeur du fichier : ce qu'elle change, ce qu'elle coûte, son geste
const propositionReg = p => !p || !p.bouton ? '' : `<li class="nv-prop"><span class="nv-prop-k">Proposition de VOLTA</span><span class="nv-prop-t"><span>${p.phrase}${p.cout ? ` <span class="fi-cout">${esc(p.cout)}</span>` : ''}</span><small>Elle ira dans l’Excel corrigé, votre nouveau fichier.</small></span><span class="nv-prop-b">${p.bouton}</span></li>`;
const ligneReg = x => { const s = x.sorte || 'info';
  // (deux piles côte à côte : ce que c'est et pourquoi ; la valeur et sa source — une valeur sur deux lignes n'écarte plus
  // le pourquoi de son titre)
  return `<li class="nv-somm-i ${s}${x.etat ? ' ' + x.etat : ''}"${x.vers ? ` data-somm-l="${escA(x.vers)}"` : ''}><span class="nv-somm-g"><span class="nv-somm-k">${esc(x.titre)}</span>${x.pourquoi ? `<span class="nv-somm-p">${x.pourquoi}</span>` : ''}</span>`
    + `<span class="nv-somm-v"><b>${x.valeur}${x.avant ? `<small class="nv-somm-av">au lieu de ${x.avant}</small>` : ''}</b>${pastilleSource(x.source, x.motSource)}</span>`
    + `${s === 'choix' && x.vers ? selecteurAM(x) : ''}</li>` + propositionReg(x.proposition); };
// `o.tete` : ce qui s'ajoute au bout de la tête d'une carte, par sorte (les connecteurs A · B d'un équipement, sur les choix)
function sommaireReglages(xs, o) { const ys = (xs || []).filter(Boolean), T = (o && o.tete) || {}; if (!ys.length) return '';
  return ['fichier', 'choix', 'info'].map(s => { const g = ys.filter(x => (x.sorte || 'info') === s), S = SORTES_REG[s]; if (!g.length) return '';
    return `<section class="nv-somm nv-mod ${s}" aria-label="${escA(S.titre)}"><header class="nv-mod-t"><span class="nv-mod-i" aria-hidden="true"><svg viewBox="0 0 24 24">${S.ico}</svg></span><h4>${esc(S.titre)}</h4><p>${esc(S.phrase)}</p>${T[s] ? `<span class="nv-mod-x">${T[s]}</span>` : ''}</header>`
      + `<ol class="nv-somm-l">${g.map(ligneReg).join('')}</ol></section>`; }).join(''); }
// L'ONGLET MODIFIER d'une fiche : son statut dit où l'on en est (une proposition de VOLTA à prendre, des choix faits à la
// main, ou tout automatique), puis les trois cartes, puis les sections qui s'ouvrent sous leur ligne ; `o.avant` : ce qui
// passe devant (le connecteur réglé, quand l'équipement en a plusieurs)
function ongletReglages(xs, sections, o) { o = o || {}; const ys = (xs || []).filter(Boolean); if (!ys.length) return null;
  const props = ys.filter(x => x.proposition && x.proposition.bouton).length, main = ys.filter(x => x.sorte === 'choix' && x.manuel).length, choix = ys.some(x => x.sorte === 'choix' && x.vers);
  const t = props ? pluriel(props, 'proposition') : main ? main + ' choix à la main' : choix ? 'tout automatique' : 'votre fichier';
  return { cle: 'reglages', statut: { t, etat: props ? 'att' : '', bulle: props ? 'VOLTA propose de corriger une valeur de votre fichier : elle irait dans l’Excel corrigé' : main ? 'Des choix de VOLTA sont pris à la main' : choix ? 'VOLTA fait tous les choix ; chacun peut passer en Manuel' : 'Tout vient de votre fichier' },
    contenu: (o.avant || '') + sommaireReglages(ys, o) + (sections || '') }; }

/* ---- À RÉGLER, À VOIR (v85, le lecteur : « 1 à voir… on ne voit pas assez que c'est une action, un problème qu'il faut
   résoudre ; il faut plus mettre en évidence le côté action, et le côté information ») : chaque point est l'un ou l'autre,
   et la section les range comme l'onglet Problèmes du récapitulatif, sous deux intercalaires.
   · À RÉGLER — un problème (rouge), ou un point que VOLTA sait régler d'un clic (ambre) : la ligne se lève (un voile de
     son état, le signe d'alerte), dit QUI (le câble, la borne) puis ce qui cloche en chiffres, et porte son GESTE en cuivre
     (« Passer en DR16 », « Lui donner son repère ») ; sans geste, ce qu'il faut faire, en mots (ceux du récapitulatif).
   · À VOIR — un point qui n'appelle pas de geste : une ligne calme, un point ambre, une phrase ; il informe. Dans le grand,
     ils se replient sous leur intercalaire quand il y a des gestes à faire ; dans la carte, un pied dit ce qui reste.
   Un clic sur une ligne mène à l'onglet qui la démontre. Rien à reprendre : rien. ---- */
const gestePrincipal = p => { const gs = (p && p.gestes || []).filter(x => x && x.mot && typeof x.faire === 'function'); return gs.find(x => x.principal) || gs[0] || null; };
// un geste qui RÈGLE (« Voir 102CB1 » mène ailleurs : il ne règle rien)
const gesteQuiRegle = p => { const gs = (p && p.gestes || []).filter(x => x && x.mot && typeof x.faire === 'function' && !/^Voir\b/.test(x.mot)); return gs.find(x => x.principal) || gs[0] || null; };
const gesteQuiMene = p => (p && p.gestes || []).find(x => x && x.mot && typeof x.faire === 'function' && /^Voir\b/.test(x.mot)) || null;
// le câble dont parle un point : celui qu'il vise, sinon celui que nomme sa phrase (« DR20 vers 103RL1:A1 : … »), vu de la fiche
function cableDuPoint(p, o) { if (p.cable) return p.cable;
  const v = p.viser ? liaisonDeCle(p.viser) : null; if (v) return sourceDe(v) || v;
  if (o.type === 'fil') { const c = app.cible; return c && c.type === 'fil' && c.l && c.l.origine !== null ? sourceDe(c.l) || c.l : null; }
  const m = /^(\S+ vers \S+) : /.exec(String(p.texte || '')), nom = o.tete && o.tete.nom; if (!m || !nom) return null;
  try { if (o.type === 'disjoncteur') { const f = (disjonctionDe(nom).fils || []).find(y => y.l && cableEtType(y) === m[1]); if (f) return sourceDe(f.l) || f.l; } } catch (_) { }
  try { const f = filsDuRepere(nom).find(y => cableDit({ type: y.l.type, vers: y.vers, borneVers: y.borneVers }) === m[1]); if (f) return f.l; } catch (_) { }
  return null; }
/* LE GESTE QUE VOLTA SAIT FAIRE pour un point qui n'en porte pas : un câble trop fin pour son courant (ou que son calibre
   ne protège pas) passe au plus fin qui convient (`plusFinQuiTient` — la même proposition que sa fiche) ; deux câbles sur
   une borne, que VOLTA relie par une barrette à poser : la barrette reçoit son repère (le geste du contrôle). Rend
   { mot, aide, faire, cle } ou null — `cle` : deux points qui demandent le même geste n'en montrent qu'un. */
function gesteDuPoint(p, o) { const t = String(p.texte || '');
  const vt = /une barrette \((\S+?)\)/.exec(t);
  if (vt && VT_A_POSER.test(vt[1])) { const x = ((typeof CONTROLE !== 'undefined' && CONTROLE.items) || []).find(y => y.genre === 'aposer' && y.nom === vt[1]), g = x && typeof gestesDuPoint === 'function' ? gestesDuPoint(x).find(y => !/^Voir\b/.test(y.mot)) : null;
    return g ? { ...g, aide: String(g.aide || '').replace(/^Elle prend/, vt[1] + ', que VOLTA a ajoutée pour les relier, prend'), cle: 'vt|' + vt[1] } : null; }
  if (/contact/i.test(t) || !/(> \S+ A admis|admis en continu|pas protégé|maximum de l’AC)/.test(t)) return null;
  const l = cableDuPoint(p, o); if (!l || !l.type || typeof plusFinQuiTient !== 'function') return null;
  let f = null; try { f = plusFinQuiTient(l); } catch (_) { f = null; } if (!f || !f.type || f.type === l.type) return null;
  const cout = typeof coutDuType === 'function' ? coutDuType(l, f.type) : '', type = f.type;
  return { mot: 'Passer en ' + type, cle: 'type|' + cleFil(l) + '|' + type, aide: majuscule(f.pourquoi) + ' : ' + type + (cout ? ' (' + cout + ')' : '') + ' — Ctrl+Z le rend',
    faire: () => { const avant = cableDit(l); if (parVolta(() => changerLiaison(l, 'type', type, 'type de ' + avant + ' : ' + type))) { dire(majuscule(avant) + ' passe en ' + type + ' (Ctrl+Z le rend).'); if (typeof pulser === 'function') pulser({ type: 'liaisons', ls: [l] }); } } }; }
// l'objet montré, en une clé (« bloc|102CB1 », « fil#… ») : l'onglet ouvert et les points dépliés ne se gardent que pour lui
const cleObjet = () => { const c = typeof app !== 'undefined' && app.cible; if (!c) return ''; try { return cleDEntree(entreeDeCible(c)); } catch (_) { return c.type === 'fil' ? 'fil' : 'bloc|' + (c.nom || ''); } };
function tachesFiche(o, probs, max) { if (!FI.gestesPb) FI.gestesPb = [];
  if (!probs.length) return '';
  // (le geste que la fiche donne au premier point — « Passer en DR16 » d'un câble — ne se répète pas sur un autre point)
  const grand = ficheEnGrand(), vus = new Set(), motFiche = o.geste ? String(o.geste).replace(/<[^>]*>/g, '').trim() : '';
  const tri = probs.filter(p => p.niveau === 'ko').concat(probs.filter(p => p.niveau !== 'ko')), p0 = tri.find(p => !(o.taire && o.taire.test(p.texte))) || tri[0];
  // chaque point : son geste (celui de la fiche pour le premier, le sien, celui que VOLTA sait faire), et s'il est à régler
  const pts = [p0, ...tri.filter(p => p !== p0)].map((p, i) => { const x = { p, phrase: i === 0 && o.phrase ? o.phrase : '' };
    if (i === 0 && o.geste) x.html = o.geste;
    else { const g = gesteQuiRegle(p) || gesteDuPoint(p, o); if (g && !(g.cle && vus.has(g.cle)) && g.mot !== motFiche) { if (g.cle) vus.add(g.cle); x.g = g; } }
    x.agir = !!(x.html || x.g); x.regler = p.niveau === 'ko' || x.agir; return x; });
  // l'ordre : ce qui se règle d'un clic, puis les autres problèmes, puis ce qui se règle en ambre, puis l'information
  const rang = x => (x.p.niveau === 'ko' ? 0 : 2) + (x.agir ? 0 : 1), premier = pts[0] && (o.phrase || o.geste) ? pts[0] : null;
  const ordre = (premier ? [premier] : []).concat(pts.filter(x => x !== premier).map((x, k) => [x, k]).sort((a, b) => rang(a[0]) - rang(b[0]) || a[1] - b[1]).map(a => a[0]));
  const R = ordre.filter(x => x.regler), V = ordre.filter(x => !x.regler), nko = R.filter(x => x.p.niveau === 'ko').length;
  const bouton = (g, cls) => { const n = FI.gestesPb.push([g]) - 1; return `<button type="button" class="btn ${cls || 'cuivre dense nc-agir'}" data-geste-pb="${n}:0"${g.aide ? ` data-bulle="${escA(g.aide)}"` : ''}>${esc(g.mot)}</button>`; };
  const ligne = x => { const p = x.p, t = x.phrase || majuscule(motDuProbleme(p.texte));
    const k = t.indexOf(' — '); let titre = k > 0 ? t.slice(0, k) : t, detail = k > 0 ? majuscule(t.slice(k + 3)) : gloseDuProbleme(p.texte);
    // QUI d'abord (« DR20 vers 103RL1:A1 »), puis ce qui cloche : le câble en titre, la phrase dessous
    const qui = /^(\S+ vers \S+) : (.+)$/.exec(titre); if (qui) { titre = qui[1]; detail = majuscule(qui[2]) + (detail ? ' · ' + detail.replace(/^\S/, c => c.toLowerCase()) : ''); }
    // une phrase longue qui finit sur sa parenthèse (« … admis en continu (11,5 A × 0,6 : faisceau de 8 câbles à 60 %) ») : la
    // parenthèse passe dessous, le titre se lit d'un trait
    else if (titre.length > 48) { const m = /^(.+?) \(([^()]+)\)$/.exec(titre); if (m) { titre = m[1]; detail = majuscule(m[2]) + (detail ? ' · ' + detail.replace(/^\S/, c => c.toLowerCase()) : ''); } }
    const va = ongletDeSection(o.type, p.section), bulle = escA([qui ? qui[1] + ' : ' + qui[2] : titre, k > 0 ? majuscule(t.slice(k + 3)) : '', p.bulle || ''].filter(Boolean).join('\n'));
    const cible = `data-onglet-va="${escA(va)}"${p.viser ? ` data-viser="${escA(p.viser)}"` : ''}${p.connecteur ? ` data-connecteur="${escA(p.connecteur)}"` : ''}`, etat = p.niveau === 'ko' ? 'ko' : 'att';
    if (!x.regler) return `<div class="nc-tache fi-pb-l ${etat} info"><span class="nc-rond" aria-hidden="true"></span><button type="button" class="nc-t" ${cible} data-bulle="${bulle}"><b class="fi-pb-t">${insecable(esc(titre))}</b>${qui ? ` <small>${insecable(esc(majuscule(qui[2])))}</small>` : ''}</button></div>`;
    // sans geste qui règle : ce qu'il faut faire, en mots (ceux du récapitulatif) — et le geste qui mène à la cause, s'il y en a un
    const que = !x.agir && typeof remede === 'function' ? (remede({ texte: p.texte }) || [])[0] : '', mene = !x.agir ? gesteQuiMene(p) : null;
    const geste = x.html || (x.g ? bouton(x.g) : mene ? bouton(mene, 'papier dense') : '');
    // (le titre est le bouton qui mène à l'onglet ; la phrase dessous y mène aussi, à la souris — le geste, à droite, sur la
    // ligne du titre : il ne pousse pas la ligne d'un étage)
    return `<div class="nc-tache fi-pb-l ${etat} agir${x.agir ? ' a-geste' : ''}${titre.length > 30 ? ' long' : ''}"><span class="nc-rond" aria-hidden="true">${ico('alerte')}</span>`
      + `<button type="button" class="nc-t" ${cible} data-bulle="${bulle}"><b class="fi-pb-t">${insecable(esc(titre))}</b></button>${geste ? `<span class="nc-geste">${geste}</span>` : ''}`
      + `${detail ? `<small class="nc-d" ${cible}>${insecable(esc(detail))}</small>` : ''}${que && que !== 'Voir sa fiche' ? `<em class="nc-que">${insecable(esc(que))}</em>` : ''}</div>`; };
  const inter = (cls, mot, n, b) => b ? `<button type="button" class="nc-pbs-g ${cls}${b.cls ? ' ' + b.cls : ''}" ${b.attrs}><i aria-hidden="true"></i><span>${esc(mot)}</span><b>${n}</b>${ico('droite')}</button>`
    : `<div class="nc-pbs-g ${cls}"><i aria-hidden="true"></i><span>${esc(mot)}</span><b>${n}</b></div>`;
  const deplie = !!NIVEAU.pbsOuvert && NIVEAU.pbsOuvert === cleObjet();
  const nVoir = n => (n + '\u00a0à voir');
  let corps = '';
  if (!grand) {
    // LA CARTE : deux lignes au plus — ce qu'il faut régler d'abord — ; un pied dit ce qui reste et mène au grand
    const groupe = R.length ? R : V, montres = groupe.slice(0, max), resteR = R.length ? R.length - montres.length : 0, resteV = R.length ? V.length : V.length - montres.length;
    const pied = [resteR ? (resteR > 1 ? resteR + ' autres à régler' : '1 autre à régler') : '', resteV ? (R.length ? nVoir(resteV) : resteV > 1 ? resteV + ' autres à voir' : '1 autre à voir') : ''].filter(Boolean).join(' · ');
    corps = (R.length ? inter(nko ? 'ko' : 'att', 'À régler', R.length) : inter('voir', 'À voir', V.length)) + montres.map(ligne).join('')
      + (pied ? `<button type="button" class="nc-autres" data-onglet-va="" data-voir-tout="1"><span>${esc('et ' + pied)}</span>${ico('droite')}</button>` : '');
  } else {
    // LE GRAND : tout ce qui est à régler (au-delà de six, ça se déplie) ; l'information sous son intercalaire, repliée quand
    // il y a des gestes à faire, et dépliée sinon
    const vusR = R.slice(0, 6), plusR = R.slice(6);
    if (R.length) corps += inter(nko ? 'ko' : 'att', 'À régler', R.length) + vusR.map(ligne).join('')
      + (plusR.length ? `<button type="button" class="nc-autres${deplie ? ' ouvert' : ''}" data-onglet-va="" data-voir-tout="1" aria-expanded="${deplie}"><span>${esc(plusR.length > 1 ? 'et ' + plusR.length + ' autres à régler' : 'et 1 autre à régler')}</span>${ico('droite')}</button><div class="nc-reste"${deplie ? '' : ' hidden'}>${plusR.map(ligne).join('')}</div>` : '');
    if (V.length && R.length) corps += inter('voir', 'À voir', V.length, { cls: deplie ? 'ouvert' : '', attrs: `data-onglet-va="" data-voir-tout="1" aria-expanded="${deplie}" data-bulle="${escA(deplie ? 'Replier' : 'Ce qui informe : rien à faire d’un clic')}"` }) + `<div class="nc-reste"${deplie ? '' : ' hidden'}>${V.map(ligne).join('')}</div>`;
    else if (V.length) corps += inter('voir', 'À voir', V.length) + V.map(ligne).join('');
  }
  return `<div class="nc-taches nc-pbs ${nko ? 'ko' : 'att'}${R.length ? ' a-regler' : ''}">${corps}</div>`; }

/* ---- LES CHIFFRES (la carte) : trois, centrés — ce que c'est au-dessus, la valeur dessous ; rien d'autre (le détail est
   dans le grand). Un clic mène à l'onglet qui l'explique ; une valeur qui s'écrit s'écrit sur place. ---- */
function chiffresHtml(xs, n) { const ys = (xs || []).filter(Boolean).slice(0, n || 3); if (!ys.length) return '';
  return `<div class="nc-chiffres" style="--n:${ys.length}">${ys.map(c => { const va = c.onglet ? ongletDeSection(NIVEAU.typeRendu, c.onglet) : '', bouton = va && !c.edit, tag = bouton ? 'button' : 'div';
    // (v84) trois natures, trois tailles qui partagent une même ligne de pied : un nombre (le plus grand), un repère ou une
    // référence (à la chasse fixe), un mot (« mâle »)
    const forme = /class="id"/.test(String(c.v)) && !c.edit ? ' ident' : /\d/.test(String(c.v).replace(/<[^>]*>/g, '')) ? '' : ' mot';
    return `<${tag}${bouton ? ` type="button" data-onglet-va="${escA(va)}"` : ''} class="nc-chiffre${c.etat ? ' ' + c.etat : ''}${c.edit ? ' edit' : ''}${forme}"${c.bulle ? ` data-bulle="${escA(c.bulle)}"` : ''}>`
      + `<span class="nc-k">${esc(c.k)}</span><span class="nc-v">${c.v}</span></${tag}>`; }).join('')}</div>`; }
// la largeur d'un dessin du grand : celle de son panneau (au téléphone, l'écran)
const largeurVue = () => typeof telephone === 'function' && telephone() ? 360 : 640;
// une valeur et son unité, l'unité plus petite
const valeurU = (n, u) => n == null || n === '' ? '—' : `${esc(String(n))}<small>${esc(u)}</small>`;

/* ---- LA LISTE À GAUCHE : les objets du même genre ----------------------------------------------------------------- */
const MOTS_GENRES = { cb: 'Disjoncteurs', eqpt: 'Équipements', barrette: 'Barrettes', coupure: 'Prises de coupure', masse: 'Masses', fil: 'Câbles du folio' };
const genreDeLaListe = nom => estDisjoncteur(nom) ? 'cb' : estCoupure(nom) ? 'coupure' : VT_A_POSER.test(nom) || estBarrette(nom) ? 'barrette' : estMasse(nom) ? 'masse' : 'eqpt';
function etatsDuControle() { const m = new Map(); ((typeof CONTROLE !== 'undefined' && CONTROLE.items) || []).forEach(x => { if (!x.nom) return; if (x.niveau === 'ko' || !m.has(x.nom)) m.set(x.nom, x.niveau === 'ko' ? 'ko' : 'att'); }); return m; }
function objetsDuGenre(c) {
  if (c.type === 'fil') { const vus = new Set(), xs = []; const cables = new Map();
    ((typeof CONTROLE !== 'undefined' && CONTROLE.items) || []).forEach(x => (x.cables || []).forEach(n => { if (x.niveau === 'ko' || !cables.has(n)) cables.set(n, x.niveau === 'ko' ? 'ko' : 'att'); }));
    liaisonsDuPlan().forEach(l => { const s = sourceDe(l) || l; if (vus.has(s) || s.de === s.vers) return; vus.add(s); const k = cleFil(s); if (!k) return;
      xs.push({ cle: k, nom: s.type || 'sans type', sous: s.de + (s.borneDe ? ':' + s.borneDe : '') + ' → ' + s.vers + (s.borneVers ? ':' + s.borneVers : ''), etat: (s.cable && cables.get(s.cable)) || 'ok', l: s }); });
    return { genre: 'fil', xs: xs.sort((a, b) => triNaturel(a.sous, b.sous) || triNaturel(a.nom, b.nom)) }; }
  const g = genreDeLaListe(c.nom), etats = etatsDuControle();
  const xs = g === 'masse' ? reperesDe(verite()).filter(estMasse).map(nom => ({ nom, plans: plansDuRepere(nom).sort(triNaturel), sous: pluriel(verite().filter(l => l.de === nom || l.vers === nom).length, 'câble') }))
    : reperesDuContrat().filter(r => r.genre === g);
  return { genre: g, xs: xs.map(r => ({ ...r, etat: etats.get(r.nom) || 'ok' })) }; }
function listeDuGenre(c, etatIci) { const { genre, xs } = objetsDuGenre(c), q = NIVEAU.filtre.trim().toLowerCase();
  const ici = it => c.type === 'fil' ? it.l === c.l : it.nom === c.nom && (!it.plan || it.plan === app.plan || !app.plan);
  const items = xs.map(it => { const actif = ici(it), etat = actif && etatIci ? etatIci : it.etat, cache = q && !(String(it.nom).toLowerCase().includes(q) || String(it.sous || '').toLowerCase().includes(q));
    const fo = it.plans && it.plans.length ? (it.plans.length > 3 ? it.plans.length + ' f.' : 'f. ' + it.plans.join(' · ')) : '';
    return `<li${cache ? ' hidden' : ''}><button type="button" class="nv-item${actif ? ' actif' : ''}" ${c.type === 'fil' ? `data-nv-fil="${escA(it.cle)}"` : `data-nv-bloc="${escA(it.nom)}"${it.plan ? ` data-plan="${escA(it.plan)}"` : ''}`}${actif ? ' aria-current="true"' : ''}>`
      + `<i class="nv-pt ${etat}" aria-label="${escA(etat === 'ko' ? 'un problème' : etat === 'att' ? 'à voir' : 'tout va bien')}"></i><span class="nv-item-t"><b>${esc(it.nom)}</b>${it.sous ? `<small>${esc(it.sous)}</small>` : ''}</span>${fo ? `<span class="nv-item-f">${esc(fo)}</span>` : ''}</button></li>`; }).join('');
  const nko = xs.filter(x => x.etat === 'ko').length;
  return `<aside class="nv-liste" aria-label="${escA(MOTS_GENRES[genre] || 'Les objets')}"><div class="nv-liste-t"><b>${esc(MOTS_GENRES[genre] || 'Objets')}</b><span>${xs.length}</span>${nko ? `<span class="nv-liste-ko" data-bulle="${escA(pluriel(nko, 'objet') + ' avec un problème')}">${nko}</span>` : ''}</div>`
    + `<div class="filtre nv-liste-f">${ico('loupe')}<input id="nv-filtre" value="${escA(NIVEAU.filtre)}" placeholder="Filtrer" aria-label="${escA('Filtrer les ' + (MOTS_GENRES[genre] || 'objets').toLowerCase())}" autocomplete="off" spellcheck="false"></div>`
    + `<ul class="nv-liste-l" id="nv-liste-l">${items || '<li class="nv-liste-vide">Rien à montrer</li>'}</ul></aside>`; }

/* ---- LES CÂBLES EN TABLEAU TRIABLE (le grand) : une ligne par câble ; un clic sur un en-tête trie (un second clic
   renverse), un clic sur une ligne ouvre le câble, son survol l'allume sur le plan ; la longueur s'écrit sur place. ---- */
const COLONNES_TABLE_CABLES = [['type', 'Câble'], ['vers', 'Vers'], ['i', 'Courant'], ['u', 'Chute en ligne'], ['lg', 'Longueur'], ['ct', 'Contact à sertir']];
/* (v86, le lecteur : « 80 %, on ne comprend pas ») : l'anneau dit une part — le titre de sa colonne dit de quoi, en petit
   sous le mot, et sa bulle explique d'où vient l'admis */
const SOUS_COLONNES_CABLES = { i: '% de ce qu’il admet', u: '% de la chute admise' };
const BULLES_COLONNES_CABLES = {
  i: 'Le courant qu’il porte, sur celui qu’il admet (EN 2853, déclassé selon son faisceau, l’altitude et l’ambiante). L’anneau en montre la part : au-delà de 100 %, il est trop fin.',
  u: 'La tension perdue depuis son disjoncteur jusqu’au bout du chemin, sur la chute admise pour ce réseau. L’anneau en montre la part : au-delà de 100 %, la ligne perd trop.' };
function contactDeLaLigne(r) { const c = app.cible, l = r.l; if (!l || !c || c.type !== 'bloc' || l.origine === null) return null;
  const nom = c.nom, borne = l.de === nom ? l.borneDe : l.vers === nom ? l.borneVers : null;
  try { return (borne != null ? contactAuBout(l, nom, borne) : null) || (r.bout && r.bout.rep ? contactAuBout(l, r.bout.rep, r.bout.borne) : null); } catch (_) { return null; } }
function tableCables(rows, o) { o = o || {}; const T = NIVEAU.tri, H = app.simu || HYPOTHESES;
  const xs = rows.map(r => { const ct = contactDeLaLigne(r), L = r.l && r.l.longueur > 0 ? r.l.longueur : null;
    return { r, ct, L, cles: { type: (r.type || '') + ' ' + (r.bout && r.bout.rep ? r.bout.rep : ''), vers: r.bout && r.bout.rep ? r.bout.rep + ':' + (r.bout.borne || '') : '', i: r.charge.r, u: r.chute.u != null && r.chute.max ? r.chute.u / r.chute.max : r.chute.u, lg: L != null ? L : H.longueur, ct: ct && ct.st ? motSertir(ct.st) : '' } }; });
  const rang = x => x.r.etat === 'ko' ? 0 : x.r.etat === 'att' ? 1 : 2;
  const cmp = (a, b) => { const k = T.col; if (!k) return rang(a) - rang(b) || triNaturel(a.cles.type, b.cles.type); const va = a.cles[k], vb = b.cles[k];
    const n = typeof va === 'number' || typeof vb === 'number' ? ((va == null ? -1 : va) - (vb == null ? -1 : vb)) : triNaturel(String(va || ''), String(vb || '')); return (n || triNaturel(a.cles.type, b.cles.type)) * T.sens; };
  const tete = COLONNES_TABLE_CABLES.map(([k, t]) => { const s = T.col === k ? (T.sens > 0 ? 'ascending' : 'descending') : 'none';
    const tri = 'Un clic trie par ' + t.toLowerCase() + (s === 'none' ? '' : ', un second renverse'), sous = SOUS_COLONNES_CABLES[k];
    return `<th scope="col" aria-sort="${s}" class="nv-th-${k}${sous ? ' a-sous' : ''}"><button type="button" class="nv-tri" data-tri="${k}" data-bulle="${escA(BULLES_COLONNES_CABLES[k] ? BULLES_COLONNES_CABLES[k] + '\n' + tri + '.' : majuscule(tri))}"><span class="nv-tri-m">${esc(t)}${sous ? `<small class="nv-th-s">${esc(sous)}</small>` : ''}</span><span class="nv-tri-f" aria-hidden="true">${s === 'ascending' ? '↑' : s === 'descending' ? '↓' : '↕'}</span></button></th>`; }).join('');
  const avecCt = xs.some(x => x.ct && x.ct.st && x.ct.st.reference);
  // (v84) une colonne homogène : si une ligne y porte un anneau, celles qui n'en ont pas gardent sa place (la valeur reste
  // alignée sous les autres) ; si aucune n'en porte, la valeur seule, centrée sous son titre
  const fini = v => v != null && isFinite(v), anI = xs.some(x => fini(x.r.charge.r)), anU = xs.some(x => fini(x.r.chute.u != null && x.r.chute.max ? x.r.chute.u / x.r.chute.max : null));
  const anneauOuPlace = (v, a) => !a ? '' : anneauVue(v, { r: 16, ep: 3.2, texte: true });
  const lignes = xs.slice().sort(cmp).map(({ r, ct, L }) => {
    // (v78, le lecteur : « équipement et borne, mal présentés ; l'intensité, la chute : juste un rapport ») : une nomenclature —
    // le câble, où il va et sur quelle borne, la charge et la chute en anneaux (la part de l'admis), la longueur
    const type = `<span class="nv-cab-id">${r.puce || ''}<b class="id nv-cab-type">${esc(r.type || 'sans type')}</b></span>`;
    const iH = `<span class="nv-mes${anI ? '' : ' seul'}">${anneauOuPlace(r.charge.r, anI)}<span class="nv-mes-t"><b>${r.charge.i != null ? esc(nombreA(r.charge.i)) + ' A' : esc(r.charge.mot || '—')}</b>${r.charge.admis != null ? `<small>sur ${esc(nombreA(r.charge.admis))} A</small>` : r.charge.i != null && r.charge.r == null ? `<small class="nv-mes-inc">${esc(r.type ? 'hors norme : admis inconnu' : 'sans type : admis inconnu')}</small>` : ''}</span></span>`;
    const ru = r.chute.u != null && r.chute.max ? r.chute.u / r.chute.max : null;
    // (v85) sans chemin de disjoncteur, la chute du câble seul — contre la chute admise de toute la ligne : la bulle le dit
    const uH = `<span class="nv-mes${anU ? '' : ' seul'}"${r.chute.seul && r.chute.u != null && r.chute.max != null ? ` data-bulle="${escA('Sur ce câble seul : ' + volts(r.chute.u) + ', ' + Math.round(r.chute.u / r.chute.max * 100) + ' % des ' + volts(r.chute.max) + ' que la ligne entière peut perdre — aucun disjoncteur en amont n’en donne le chemin')}"` : ''}>${anneauOuPlace(ru, anU)}<span class="nv-mes-t"><b>${r.chute.u != null ? esc(volts(r.chute.u)) : '—'}</b>${r.chute.max != null ? `<small>sur ${esc(volts(r.chute.max))}</small>` : ''}</span></span>`;
    // (v81) une longueur supposée s'écrit « ≈ 5 m » en gris, comme au récapitulatif — la cellule reste centrée sous son titre
    // (v85, le lecteur : « ce qui vient de mon fichier, plus aucune saisie ») : la longueur se lit, elle se change dans le fichier
    const lgH = `<span class="nv-cab-lg${L == null ? ' supp' : ''}" data-bulle="${escA(L == null ? 'Votre fichier ne donne pas sa longueur : VOLTA suppose ' + nombre(H.longueur) + ' m (Hypothèses) — à écrire dans votre fichier' : 'Celle de votre fichier')}">${L == null ? '<i class="nv-env">≈</i>' : ''}<b>${L != null ? esc(nombre(arrondi(L, 2))) : esc(nombre(H.longueur))}</b><small>m</small></span>`;
    const ctH = ct && ct.st && ct.st.reference ? `<span class="id nv-cab-ct${ct.ko ? ' ko' : ''}" data-bulle="${escA(motSertir(ct.st) + (ct.rep ? ' — ' + ct.rep + (ct.borne ? ':' + ct.borne : '') : ''))}">${esc(ct.st.reference)}</span>` : '<span class="nv-muet">—</span>';
    return `<tr class="fi-ia nv-cab${r.etat ? ' ' + r.etat : ''}"${r.k ? ` data-i="${r.k}" tabindex="0"` : ''}${r.bulle ? ` data-bulle="${escA(r.bulle + (r.pourquoi ? '\n' + r.pourquoi : ''))}"` : ''}>`
      + `<td class="nv-td-type">${type}</td>`
      + `<td class="nv-td-vers"><span class="nv-vers"><b class="id">${esc(r.bout && r.bout.rep ? r.bout.rep : '—')}</b>${r.bout && r.bout.borne ? `<span class="nv-borne">borne ${esc(r.bout.borne)}</span>` : ''}</span></td>`
      + `<td class="nv-td-i">${iH}</td><td class="nv-td-u">${uH}</td><td class="nv-td-lg">${lgH}</td>${avecCt ? `<td class="nv-td-ct">${ctH}</td>` : ''}</tr>`; }).join('');
  const tete2 = avecCt ? tete : tete.replace(/<th scope="col"[^>]*class="nv-th-ct"[\s\S]*?<\/th>/, '');
  // (v84) le titre et le compte ; qu'une ligne s'ouvre, son survol le montre (la ligne s'éclaire, une flèche paraît au bout)
  return `<div class="nv-table-c"><table class="nv-cables${o.cls ? ' ' + o.cls : ''}"><caption class="nv-cap"><b>${esc(o.titre || 'Ses câbles')}</b><span>${esc(String(rows.length))}</span></caption><thead><tr>${tete2}</tr></thead><tbody>${lignes}</tbody></table></div>`; }

/* ---- COMPOSER : la carte, ou le grand ------------------------------------------------------------------------------- */
/* o : { type (equipement · disjoncteur · barrette · prise · masse · fil), tete ({ nom, champ, aide, designation }), meta
   (ce qui l'identifie, en HTML : sa référence, son folio…), probs, chiffres, vignette (le schéma en petit), onglets
   ([{ cle, titre, statut: { t, etat }, contenu }] — ou, pour une fiche pas encore redessinée, ses sections d'hier),
   ecrits, proposes (les modifications), pied, ok (quand tout va bien), geste (le geste qui répare), phrase (ce que dit la
   première tâche à la place du point : la décision d'un disjoncteur), taire, avant (le vrai repère d'une barrette à
   poser), fin (les listes de saisie) } */
function composerFiche(o) { const probs = o.probs || []; NIVEAU.typeRendu = o.type; FI.gestesPb = [];
  const modifs = modificationsDeLaFiche(o.ecrits || [], o.proposes || []);
  if (!ficheEnGrand()) {
    // LA CARTE — le premier regard : ce que c'est et son nom, la pièce dessinée (un clic ouvre tout), ce qui cloche, trois
    // chiffres, « Tout voir » ; rien d'autre (le lecteur : « épuré, classe »)
    // (v86, le lecteur : « fais quelque chose d'un peu plus interactif en fond ») : sous la carte, une LUMIÈRE de cuivre qui
    // suit la souris et révèle la trame du folio d'où la carte est née (08-carte, `lierLumiere` ; style-z-carte)
    return `<span class="nc-lumiere" aria-hidden="true"><i></i></span><div class="nc">${enteteFiche(o, false)}${o.avant || ''}`
      + (o.vignette ? `<button type="button" class="nc-vignette" data-onglet-va="essentiel" aria-label="Tout voir : la fiche entière">${o.vignette}</button>` : '')
      + tachesFiche(o, probs, 2) + chiffresHtml(o.chiffres, 3) + '</div>'
      + `<footer class="fi-pied nc-pied"><button type="button" class="nc-tout" id="fi-tout-voir" data-bulle="La fiche entière, le plan à côté — ou un double-clic sur l’objet">Tout voir${ico('droite')}</button></footer>` + (o.fin || ''); }
  // LE GRAND — la fenêtre : une barre fine (ce que c'est, son nom ; on la tient pour déplacer la fenêtre), puis tout de suite
  // les onglets ; ce qui cloche ouvre l'essentiel ; la désignation, dans « Modifier »
  const base = (o.onglets ? o.onglets.filter(Boolean) : (o.sections || []).filter(Boolean).map(ongletDeLaSection)).map(x => ({ ...x }));
  const ess = base.find(x => x.cle === 'essentiel') || base[0], afaire = tachesFiche(o, probs, 3);
  if (ess && afaire) ess.contenu = `<div class="nv-afaire">${afaire}</div>` + (ess.contenu || '');
  const des = designationFiche(o), mod = base.find(x => x.cle === 'reglages');
  if (des) { if (mod) mod.contenu = des + (mod.contenu || ''); else if (ess) ess.contenu = (ess.contenu || '') + des; }
  // (l'historique : un onglet quand il y en a un ; sinon rien — un onglet « aucune » n'apprend rien)
  const onglets = base.concat(modifs ? [{ cle: 'modifs', statut: { t: modifs.n > 1 ? modifs.n + ' changements' : '1 changement' }, contenu: modifs.html }] : []).slice().sort((x, y) => rangOnglet(x) - rangOnglet(y));
  const corps = `<div class="nv-tete nv-poignee">${barreNav({ milieu: enteteFiche(o, true), epure: true })}</div>${o.avant && o.type !== 'fil' ? `<div class="nv-avant">${o.avant}</div>` : ''}`
    + ongletsHtml(o.type, onglets) + (o.fin || '');
  return `<div class="nv-grand nv-seul" data-nv-type="${escA(o.type)}"><div class="nv-corps">${corps}</div></div>`; }

/* ---- PASSER D'UN NIVEAU À L'AUTRE --------------------------------------------------------------------------------- */
/* « Tout voir » (ou un double-clic, ou une case de la carte) : la carte devient le grand — elle glisse jusqu'à sa place
   (08-carte, `epinglerCarte`), le plan se recadre à gauche, l'objet en vue ; `onglet` : celui qui s'ouvre. Réduire
   (Échap, le bouton) : le grand redevient la carte, près de son bloc. */
function ouvrirGrand(onglet, but) { if (onglet) { const t = typeDeLaFicheMontree(); if (t) ongletRetenu(cleObjet(), ongletDeSection(t, onglet)); }
  if (NIVEAU.grand) { if (onglet) activerOnglet(onglet, true); if (but && but.viser) viserDansLaFiche(but.viser); return; }
  const avait = clavierDansLaFiche();
  NIVEAU.grand = true; if (typeof epinglerCarte === 'function') epinglerCarte(true); else rendreFiche();
  if (but && but.viser) viserDansLaFiche(but.viser);
  // (v84, le parcours) le clavier ne se perd pas : il passe sur l'onglet montré du grand
  if (avait) poserLeClavier('.nv-grand .nv-onglet[aria-selected="true"]'); }
function reduireFiche() { if (!NIVEAU.grand) return; const avait = clavierDansLaFiche(); NIVEAU.grand = false; if (typeof epinglerCarte === 'function') epinglerCarte(false); else rendreFiche();
  if (avait) poserLeClavier('#fi-tout-voir'); }
// le clavier est-il dans la fiche (ou nulle part) ? alors on le garde dans la fiche quand elle change de taille
const clavierDansLaFiche = () => { const a = document.activeElement, box = $('ba-equip'); return !a || a === document.body || !!(box && box.contains(a)); };
const poserLeClavier = sel => setTimeout(() => { const e = $('ba-equip') && $('ba-equip').querySelector(sel); if (e && e.isConnected) try { e.focus({ preventScroll: true }); } catch (_) { } }, 40);
// le genre de la fiche montrée (l'onglet retenu en dépend) : celui que porte le grand, sinon celui de la cible
const typeDeLaFicheMontree = () => { const g = document.querySelector('#ba-equip .nv-grand'); if (g) return g.dataset.nvType; const c = app.cible; if (!c) return '';
  return c.type === 'fil' ? 'fil' : estDisjoncteur(c.nom) ? 'disjoncteur' : VT_A_POSER.test(c.nom) || barretteEnModules(c.nom) ? 'barrette' : coupureEnModules(c.nom) ? 'prise' : estMasse(c.nom) ? 'masse' : 'equipement'; };
// un onglet devient le montré (sans refaire la fiche) : son panneau paraît, en haut ; `allumer` le fait briller un instant
function activerOnglet(cle, allumer) { const box = $('ba-equip'), g = box && box.querySelector('.nv-grand'); if (!g) return null;
  cle = ongletDeSection(g.dataset.nvType, cle); const tab = g.querySelector(`.nv-onglet[data-onglet="${CSS.escape(cle)}"]`); if (!tab) return null;
  ongletRetenu(cleObjet(), cle);
  g.querySelectorAll('.nv-onglet').forEach(t => { const on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
  let p = null; g.querySelectorAll('.nv-panneau').forEach(x => { const on = x.dataset.section === cle; x.hidden = !on; if (on) p = x; });
  const sc = $('nv-panneaux'); if (sc) sc.scrollTop = 0;
  if (p && allumer !== false && !mouvementReduit()) { p.classList.remove('nv-entre'); void p.offsetWidth; p.classList.add('nv-entre'); setTimeout(() => p.classList.remove('nv-entre'), 500); }
  if (typeof cacherBulle === 'function') cacherBulle(); return p; }
// une ligne de la fiche, allumée et sous les yeux (un câble, un contact)
function viserDansLaFiche(k) { const box = $('ba-equip'); if (!box || !k) return; box.querySelectorAll('.vise, .arrivee').forEach(x => x.classList.remove('vise', 'arrivee'));
  const li = [...box.querySelectorAll(`[data-i="${CSS.escape(k)}"]:not(.mj-contact)`)].find(x => !x.closest('[hidden]')); if (!li) return;
  box.querySelectorAll(`[data-i="${CSS.escape(k)}"]`).forEach(x => x.classList.add('vise', 'arrivee')); try { li.scrollIntoView({ block: 'center', behavior: mouvementReduit() ? 'auto' : 'smooth' }); } catch (_) { } }

/* ---- LES GESTES DES DEUX NIVEAUX (08-fiche, `lierFiche`, les appelle à chaque rendu) -------------------------------- */
/* MODIFIER SE LIT SANS DÉFILER (v83, le lecteur : « plein de sections, il faut scroller ; fluide, simple, carré, propre ») :
   sous le sommaire, les sections se rangent ; le bouton d'une ligne déplie SA section juste sous elle (une seule à la
   fois), et la replie ; la section ouverte se garde quand la fiche se refait. */
function lierSommaire(box) { const somm = box.querySelector('.nv-panneau[data-section="reglages"] .nv-somm, .nv-panneau .nv-somm'); if (!somm) { NIVEAU.devoiler = null; return; }
  const pan = somm.closest('.nv-panneau'); pan.classList.add('avec-somm');
  const fermer = () => { pan.querySelectorAll('.nv-somm-x').forEach(x => { const sec = x.firstElementChild; if (sec) (x.dataset.retour ? pan.querySelector(x.dataset.retour) || pan : pan).appendChild(sec); x.remove(); });
    pan.querySelectorAll('.nv-somm-i.ouvert').forEach(li => li.classList.remove('ouvert')); pan.querySelectorAll('.nv-somm-b').forEach(b => b.setAttribute('aria-expanded', 'false')); };
  // la section `sel` dépliée sous sa ligne (le bouton Manuel, s'il y en a un, dit qu'elle est ouverte)
  const deplier = (li, sec, b, doux) => { const parent = sec.parentElement, x = document.createElement('li'); x.className = 'nv-somm-x';
    if (parent && parent !== pan && parent.classList.contains('fi-panneau')) x.dataset.retour = '.fi-panneau'; li.after(x); x.appendChild(sec);
    if (b) b.setAttribute('aria-expanded', 'true'); li.classList.add('ouvert');
    if (!doux) { x.classList.add('naît'); try { li.scrollIntoView({ block: 'nearest', behavior: mouvementReduit() ? 'auto' : 'smooth' }); } catch (_) { } } };
  const ouvrir = (b, doux) => { const sel = b.dataset.somm, sec = pan.querySelector(sel); if (!sec) return;
    NIVEAU.sommOuvert = sel; NIVEAU.sommCle = cleDuReglage();
    // (v85) les possibles d'une liste longue ne se calculent qu'à l'ouverture : la fiche se refait, et la rouvre ici
    if (sec.dataset.paresseux && !doux) { if (!rafraichirFicheEnPlace()) rendreFiche(); return; }
    deplier(b.closest('.nv-somm-i'), sec, b, doux); };
  pan.querySelectorAll('.nv-somm-b').forEach(b => { b.onclick = e => { e.preventDefault(); e.stopPropagation(); const deja = b.getAttribute('aria-expanded') === 'true'; fermer(); if (deja) { NIVEAU.sommOuvert = ''; return; } ouvrir(b); }; });
  // AUTOMATIQUE : déjà le cas, il replie les possibles ; sinon, d'un geste, le choix revient à VOLTA — le mot le dit, « Défaire »
  pan.querySelectorAll('[data-am="auto"]').forEach(b => { b.onclick = e => { e.preventDefault(); e.stopPropagation(); NIVEAU.sommOuvert = '';
    if (b.getAttribute('aria-pressed') === 'true') { fermer(); return; }
    const cle = b.dataset.amCle, mot = b.dataset.amMot; if (!cle || typeof retourAutomatique !== 'function') return; FI.liste = '';
    retourAutomatique({ dataset: { auto: cle } }, app.cible); if (mot) dire(mot, false, { geste: 'Défaire', faire: defaire }); }; });
  // une ligne d'information qui a son détail (les contacts d'une barrette, où mène une lettre de sa face) : il se déplie
  // sous elle quand un lien y mène (`aller`, plus bas)
  // (une section dont les possibles ne se calculent qu'ouverte — un module de la barrette mène à « Le module » — : la fiche
  // se refait, la section ouverte et remplie ; rend ce qu'il faut viser)
  NIVEAU.devoiler = el => { const sec = el && el.closest && el.closest('.nv-reg'); if (!sec || !pan.contains(sec) || sec.closest('.nv-somm-x')) return el;
    const li = [...pan.querySelectorAll('.nv-somm-i[data-somm-l]')].find(x => { try { return x.dataset.sommL && sec.matches(x.dataset.sommL); } catch (_) { return false; } }); if (!li) return el;
    const sel = li.dataset.sommL; NIVEAU.sommOuvert = sel; NIVEAU.sommCle = cleDuReglage();
    if (sec.dataset.paresseux) { if (!rafraichirFicheEnPlace()) rendreFiche(); const p2 = document.querySelector('#ba-equip .nv-panneau[data-section="reglages"]'); return (p2 && p2.querySelector(sel)) || el; }
    fermer(); deplier(li, sec, li.querySelector('.nv-somm-b'), true); return el; };
  const garde = NIVEAU.sommOuvert && NIVEAU.sommCle === cleDuReglage() && [...pan.querySelectorAll('.nv-somm-b')].find(b => b.dataset.somm === NIVEAU.sommOuvert); if (garde) ouvrir(garde, true); }
function lierNiveaux(box, c) { lierSommaire(box);
  box.querySelectorAll('[data-lpa]').forEach(b => b.onclick = e => { e.stopPropagation(); if (typeof exporterNomenclatureExcel === 'function') exporterNomenclatureExcel(); });
  // (v84) une note qui mène à son réglage (« Longueur supposée… L'écrire ») : l'onglet Modifier, le réglage ouvert sur
  // place sous sa ligne, le curseur dans son champ
  box.querySelectorAll('[data-somm-va]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); const sel = b.dataset.sommVa;
    const ouvrirLa = () => { const p = activerOnglet('reglages', true); if (!p) return; const bt = [...p.querySelectorAll('.nv-somm-b')].find(x => x.dataset.somm === sel);
      if (bt && bt.getAttribute('aria-expanded') !== 'true') bt.click(); const champ = p.querySelector(sel + ' input, ' + sel + ' select'); if (champ) setTimeout(() => { try { champ.focus(); champ.select && champ.select(); } catch (_) { } }, 60); };
    if (ficheEnGrand()) ouvrirLa(); else { ouvrirGrand('reglages'); setTimeout(ouvrirLa, 120); } });
  // « Tout voir », une case de la carte, « et 2 autres points », une ligne des modifications : le grand, sur l'onglet
  box.querySelectorAll('[data-onglet-va]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); const k = b.dataset.ongletVa || '';
    // (v85) un intercalaire (« À voir 5 », « et 2 autres à régler ») déplie ce qu'il replie, juste sous lui ; la fiche refaite
    // le garde déplié, pour cet objet seulement
    if (b.dataset.voirTout && ficheEnGrand()) { const s = b.nextElementSibling, r = s && s.classList.contains('nc-reste') ? s : b.parentElement.querySelector('.nc-reste'); if (!r) return;
      r.hidden = !r.hidden; b.classList.toggle('ouvert', !r.hidden); b.setAttribute('aria-expanded', String(!r.hidden)); NIVEAU.pbsOuvert = r.hidden ? '' : cleObjet(); if (typeof cacherBulle === 'function') cacherBulle(); return; }
    if (ficheEnGrand()) { if (k) activerOnglet(k, true); if (b.dataset.viser) viserDansLaFiche(b.dataset.viser); return; }
    // le pied de la carte (« et 2 autres à régler · 5 à voir ») : le grand, tout déplié
    if (b.dataset.voirTout) NIVEAU.pbsOuvert = cleObjet();
    ouvrirGrand(k, b.dataset.viser ? { viser: b.dataset.viser } : null); });
  const tv = $('fi-tout-voir'); if (tv) tv.onclick = e => { e.stopPropagation(); ouvrirGrand(''); };
  // (v84) un bout dessiné (le chemin d'un câble) se prend au clavier comme à la souris : Entrée ou Espace l'ouvre
  box.querySelectorAll('svg [data-bout][role="button"]').forEach(g => g.onkeydown = e => { if (e.key !== 'Enter' && e.key !== ' ') return; e.preventDefault(); g.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  // les onglets : un clic, ou ← → au clavier (Début, Fin) — le clavier suit l'onglet
  const tabs = [...box.querySelectorAll('.nv-onglet')];
  // les onglets qui débordent : un fondu au bord qui cache, et l'ouvert sous les yeux
  const bande = box.querySelector('.nv-onglets');
  if (bande) { const juger = () => { const d = bande.scrollWidth > bande.clientWidth + 2; bande.classList.toggle('deborde', d); bande.classList.toggle('au-bout', d && bande.scrollLeft + bande.clientWidth >= bande.scrollWidth - 2); };
    bande.onscroll = juger; requestAnimationFrame(() => { const a = bande.querySelector('[aria-selected="true"]'); if (a && a.offsetLeft + a.offsetWidth > bande.clientWidth) bande.scrollLeft = a.offsetLeft - 16; juger(); });
    if (typeof ResizeObserver === 'function') { if (bande._ro) bande._ro.disconnect(); bande._ro = new ResizeObserver(juger); bande._ro.observe(bande); } }
  tabs.forEach((t, i) => { t.onclick = () => activerOnglet(t.dataset.onglet, true);
    t.onkeydown = e => { const j = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
      if (j == null) return; e.preventDefault(); activerOnglet(tabs[j].dataset.onglet, false); tabs[j].focus(); }; });
  // le tri du tableau des câbles : la colonne, puis le sens ; la fiche se refait en place (le défilement reste)
  box.querySelectorAll('[data-tri]').forEach(b => b.onclick = e => { e.stopPropagation(); const k = b.dataset.tri, T = NIVEAU.tri;
    if (T.col === k) { if (T.sens > 0) T.sens = -1; else { T.col = ''; T.sens = 1; } } else { T.col = k; T.sens = k === 'i' || k === 'u' || k === 'lg' ? -1 : 1; }
    if (!rafraichirFicheEnPlace()) rendreFiche(); const nb = box.querySelector(`[data-tri="${CSS.escape(k)}"]`); if (nb) nb.focus({ preventScroll: true }); });
  // la liste à gauche : un clic change la fiche (l'onglet reste) ; son survol allume l'objet sur le plan ; le filtre tape
  const L = box.querySelector('.nv-liste');
  if (L) { L.querySelectorAll('[data-nv-bloc]').forEach(b => { b.onclick = () => { if (b.classList.contains('actif')) return; const nom = b.dataset.nvBloc;
        if (b.dataset.plan && b.dataset.plan !== app.plan && typeof allerAuPlan === 'function') allerAuPlan(b.dataset.plan); allerAuBloc(nom); };
      b.onmouseenter = () => { if (!b.classList.contains('actif') && typeof allumerBloc === 'function' && app.dessin && app.dessin.compDe.get(b.dataset.nvBloc)) allumerBloc(b.dataset.nvBloc); };
      b.onmouseleave = () => { if (typeof rallumer === 'function') rallumer(); }; });
    L.querySelectorAll('[data-nv-fil]').forEach(b => { b.onclick = () => { if (b.classList.contains('actif')) return; const l = liaisonDeCle(b.dataset.nvFil); if (l) allerAuFil(sourceDe(l) || l); };
      b.onmouseenter = () => { if (!b.classList.contains('actif')) allumerCle(b.dataset.nvFil); }; b.onmouseleave = () => { if (typeof rallumer === 'function') rallumer(); }; });
    const f = $('nv-filtre');
    if (f) { f.oninput = () => { NIVEAU.filtre = f.value; const q = f.value.trim().toLowerCase(); L.querySelectorAll('.nv-liste-l > li').forEach(li => { const t = li.textContent.toLowerCase(); li.hidden = !!q && !t.includes(q); }); };
      f.onkeydown = e => { if (e.key === 'Escape' && f.value) { e.preventDefault(); e.stopPropagation(); f.value = ''; f.oninput(); }
        else if (e.key === 'Enter') { e.preventDefault(); const b = [...L.querySelectorAll('.nv-item')].find(x => !x.closest('[hidden]') && !x.classList.contains('actif')); if (b) b.click(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); const b = [...L.querySelectorAll('.nv-item')].find(x => !x.closest('[hidden]')); if (b) b.focus(); } }; }
    // ↑ ↓ dans la liste : d'un objet à l'autre, sans l'ouvrir ; Entrée l'ouvre
    L.onkeydown = e => { if (e.target === f || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return; const xs = [...L.querySelectorAll('.nv-item')].filter(x => !x.closest('[hidden]')), i = xs.indexOf(document.activeElement); if (i < 0) return;
      e.preventDefault(); const j = e.key === 'ArrowDown' ? Math.min(xs.length - 1, i + 1) : Math.max(0, i - 1); xs[j].focus(); };
    // l'objet montré, dans la liste : sous les yeux (sans faire défiler la page)
    const a = L.querySelector('.nv-item.actif'), ul = $('nv-liste-l');
    if (a && ul) { const r = a.getBoundingClientRect(), q = ul.getBoundingClientRect(); if (r.top < q.top || r.bottom > q.bottom) ul.scrollTop += r.top - q.top - (q.height - r.height) / 2; } }
  // le geste qui répare un disjoncteur, dans le bandeau (la carte n'a pas de cadran à qui le demander)
  box.querySelectorAll('[data-nv-decider]').forEach(b => b.onclick = e => { e.stopPropagation(); const nom = b.dataset.nvDecider;
    const fait = typeof parVolta === 'function' && typeof deciderCalibre === 'function' ? parVolta(() => deciderCalibre(nom)) : false; if (fait !== false && !$('inspecteur').hidden && app.cible && !rafraichirFicheEnPlace()) rendreFiche(); });
  // (v78, le lecteur : « tout doit être interactif : je clique sur “les courbes”, ça m'envoie sur la courbe ») : une étape de
  // « Comment VOLTA a décidé » mène où elle se démontre — l'onglet, puis la pièce, allumée un instant ; son calcul se déplie
  // (v83) délégué une fois sur la fiche : un panneau rendu plus tard (l'onglet ouvert ensuite) mène aussi où il dit
  if (!box.dataset.vaLie) { box.dataset.vaLie = '1';
    const aller = (li, e) => { const t = e.target.closest('details, summary, button, a, input'); if (t && t !== li && li.contains(t)) return; e.preventDefault(); e.stopPropagation();
      const p = li.dataset.vaOnglet ? activerOnglet(li.dataset.vaOnglet, false) : li.closest('.nv-panneau'), cible0 = p && li.dataset.vaVers ? p.querySelector(li.dataset.vaVers) : null;
      if (!cible0) return; const cible = (typeof NIVEAU.devoiler === 'function' && NIVEAU.devoiler(cible0)) || cible0;
      try { cible.scrollIntoView({ block: 'center', behavior: mouvementReduit() ? 'auto' : 'smooth' }); } catch (_) { cible.scrollIntoView(); }
      cible.classList.remove('vu-allume'); void cible.offsetWidth; cible.classList.add('vu-allume'); setTimeout(() => cible.classList.remove('vu-allume'), 1600); };
    box.addEventListener('click', e => { const li = e.target.closest && e.target.closest('[data-va-onglet]'); if (li && box.contains(li)) aller(li, e); });
    box.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const li = e.target.closest && e.target.closest('[data-va-onglet]'); if (li && li === e.target) aller(li, e); }); }
  // (v78) les touches du calibre : un clic retient ce calibre ; « Revenir au choix de VOLTA » rend l'automatique
  const refaire = () => { if (!$('inspecteur').hidden && app.cible && !rafraichirFicheEnPlace()) rendreFiche(); };
  // (v85) AUTOMATIQUE | MANUEL du calibre : chaque geste se dit, avec « Défaire » ; Manuel montre les calibres à prendre
  const direDefaire = () => { const t = $('toast'), m = t && t.firstChild && t.firstChild.nodeType === 3 ? t.firstChild.textContent : ''; if (m) dire(m, false, { geste: 'Défaire', faire: defaire }); };
  box.querySelectorAll('[data-nv-cal]').forEach(b => b.onclick = e => { e.stopPropagation(); if (c && c.nom && retenirCalibre(c.nom, +b.dataset.nvCal) !== false) { refaire(); direDefaire(); } });
  box.querySelectorAll('[data-nv-auto]').forEach(b => b.onclick = e => { e.stopPropagation(); if (b.getAttribute('aria-pressed') === 'true') return; rendreCalibre(b.dataset.nvAuto); refaire(); direDefaire(); });
  box.querySelectorAll('[data-am-cal]').forEach(b => b.onclick = e => { e.stopPropagation(); const cs = box.querySelector('.vu-cals'); if (!cs) return;
    cs.classList.remove('a-prendre'); void cs.offsetWidth; cs.classList.add('a-prendre'); const t = cs.querySelector('.vu-cal.oui:not(.on)') || cs.querySelector('.vu-cal'); if (t) try { t.focus({ preventScroll: true }); } catch (_) { }
    if (b.getAttribute('aria-pressed') !== 'true') dire('Prenez un calibre : un clic le retient à la place de celui de VOLTA.'); });
  if (c && c.type !== 'ref') document.body.classList.toggle('insp-grand-ouvert', ficheEnGrand());
  // (v86) la silhouette se trace quand la fiche s'ouvre sur un objet (pas quand elle se refait sur le même : 08-carte)
  if (typeof eveillerSceau === 'function') eveillerSceau(box); }

/* ---- LA LISTE, LE PANNEAU : leur défilement se garde d'un rendu de la même fiche à l'autre -------------------------- */
const DEFILEMENTS = { liste: 0, panneau: 0, cle: '' };
function noterDefilements(box) { const l = $('nv-liste-l'), p = $('nv-panneaux'); DEFILEMENTS.liste = l ? l.scrollTop : 0; DEFILEMENTS.panneau = p ? p.scrollTop : 0; DEFILEMENTS.cle = box.dataset.cle || ''; }
function rendreDefilements(box, meme) { const l = $('nv-liste-l'), p = $('nv-panneaux'); if (l) l.scrollTop = DEFILEMENTS.liste; if (p) p.scrollTop = meme ? DEFILEMENTS.panneau : 0; }
