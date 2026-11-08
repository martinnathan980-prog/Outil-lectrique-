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
   — « 2 câbles » quand tout passe (le pourcentage est dans le tableau), « 2 à régler », « 1 à voir » (les mots des
   problèmes de la fiche ; « en défaut » se lisait comme un court-circuit) ; sans type, pas de pourcentage. La bulle nomme
   le câble et dit les ampères, ou ce qui cloche, câble par câble. `sF` : la section des câbles (08-fiche, `sectionFils`). */
const statutCables = sF => { if (sF.vide) return { t: 'aucun', etat: '' };
  const n = sF.compte || 0, p = sF.pire, pc = sF.charge != null ? Math.round(sF.charge * 100) : null, raisons = (sF.raisons || []).slice(0, 4).join('\n');
  if (sF.nko) return { t: sF.nko + ' à régler', etat: 'ko', bulle: (sF.nko > 1 ? sF.nko + ' câbles à régler' : '1 câble à régler') + (raisons ? ' :\n' + raisons : '') };
  if (sF.natt) return { t: sF.natt + ' à voir', etat: 'att', bulle: (sF.natt > 1 ? sF.natt + ' câbles à voir' : '1 câble à voir') + (raisons ? ' :\n' + raisons : '') };
  const sans = sF.nsans ? (sF.nsans > 1 ? sF.nsans + ' câbles sans type' : '1 câble sans type') + ' : ce qu’' + (sF.nsans > 1 ? 'ils admettent' : 'il admet') + ' est inconnu' : '';
  if (pc == null) return { t: n > 1 && sF.nsans === n ? n + ' sans type' : sF.nsans ? 'sans type' : pluriel(n, 'câble'), etat: '', bulle: sans };
  const qui = n > 1 ? 'Le plus chargé de ses ' + n + ' câbles' + (p && p.nom ? ', ' + p.nom + ',' : '') : 'Son câble' + (p && p.nom ? ', ' + p.nom + ',' : '');
  // (intégration v86) tout passe : le compte seul, comme « 1 connecteur » à côté ; le pourcentage reste dans le tableau, sous
  // son titre « % de l'admis », et la bulle le dit en ampères — un statut d'onglet ne demande jamais « 80 % de quoi ? »
  return { t: pluriel(n, 'câble'), etat: '',
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
  // un équipement dit sa NATURE quand son code la donne (103RL1 : « Relais », 395SW1 : « Interrupteur ») ; sinon « Équipement »
  const nature = o.type === 'equipement' && nom && typeof natureDe === 'function' ? natureDe(nom) : '';
  const genre = nature && nature !== 'équipement' ? majuscule(nature) : GENRES_FICHE[o.type] || 'Élément';
  const titre = `<span class="nc-genre-mot">${esc(genre)}</span><span class="nc-rep">${rep}</span>`;
  const sil = silhouetteVue(o.type, silhouetteDe(o));
  // (v83) en grand, « module 2 de VT2 » se lit dans la première section (la barrette et tous ses modules) : pas deux fois
  const msG = ms.filter(m => !/^(module|partie) \S+ de /.test(m));
  if (grand) return `<div class="nc-tete fine"><span class="nc-sil" aria-hidden="true">${sil}</span><span class="nc-titre">${titre}</span>${msG.length ? `<span class="nc-meta fi-identite">${msG.map(metaV).join('')}</span>` : ''}</div>`;
  return `<span class="nc-sceau" aria-hidden="true">${sil}</span><div class="nc-tete"><span class="nc-titre${nom.length > 9 ? ' long' : ''}">${titre}</span></div>${meta}`; }
// ce que la silhouette dessine de CET objet : les modules d'une barrette, les connecteurs d'un équipement
function silhouetteDe(o) { const nom = (o.tete || {}).nom || '';
  try { if (o.type === 'barrette') { const n = typeof planDeBarrette === 'function' ? ((planDeBarrette(nom).plan || {}).modules || []).length : 0; return { modules: n || 3 }; }
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
// (jamais « Voir 102CB1 » dans la fiche de 102CB1 : on y est déjà)
const gesteQuiMene = (p, ici) => (p && p.gestes || []).find(x => x && x.mot && typeof x.faire === 'function' && /^Voir\b/.test(x.mot) && !(ici && x.mot === 'Voir ' + ici)) || null;
// le câble dont parle un point : celui qu'il vise, sinon celui que nomme sa phrase (« DR20 vers 103RL1:A1 : … »), vu de la fiche
function cableDuPoint(p, o) { if (p.cable) return p.cable;
  const v = p.viser ? liaisonDeCle(p.viser) : null; if (v) return sourceDe(v) || v;
  if (o.type === 'fil') { const c = app.cible; return c && c.type === 'fil' && c.l && c.l.origine !== null ? sourceDe(c.l) || c.l : null; }
  const m = /^(\S+ vers \S+)(?: \(par [^)]+\))? : /i.exec(String(p.texte || '')), nom = o.tete && o.tete.nom; if (!m || !nom) return null;
  const dit = m[1].replace(/^\S/, c => c.toUpperCase()), egal = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
  try { if (o.type === 'disjoncteur') { const f = (disjonctionDe(nom).fils || []).find(y => y.l && egal(cableEtType(y), dit)); if (f) return sourceDe(f.l) || f.l; } } catch (_) { }
  // (vu d'ici, ou dans le sens de votre fichier : « DR20 vers 103RL1:A1 » dans la fiche de 103RL1 nomme le câble qui y arrive)
  try { const f = filsDuRepere(nom).find(y => egal(cableDit({ type: y.l.type, vers: y.vers, borneVers: y.borneVers }), dit)) || filsDuRepere(nom).find(y => egal(cableDit(y.l), dit)); if (f) return f.l; } catch (_) { }
  return null; }
/* (v86, l'audit G9 : « dans la fiche de 103RL1, le titre est “DR20 vers 103RL1:A1” : on parle de lui comme d'un autre ») —
   QUI, VU D'ICI. Le contrôle écrit un câble comme son disjoncteur le voit ; la fiche part de la borne de SON objet, puis
   l'autre bout, puis le type : « A1 ← 102CB1:2 · DR20 ». La flèche suit le courant — « ← » il arrive de là, « → » il y va —
   quand VOLTA sait d'où il vient (le chemin de son disjoncteur : 08-fiche, `carteDesAlimentations`) ; sinon un trait neutre,
   « – » : votre fichier ne dit pas le sens. Un câble qui ne touche pas cet objet (au-delà d'une barrette) garde sa phrase. */
function amontDuCable(l) { try { const a = typeof carteDesAlimentations === 'function' ? carteDesAlimentations().get(l) : null, s = a && a.chemin && a.chemin.segments.find(y => y.fil === l);
  return !s ? '' : a.amont ? s.vers[0] : s.de[0]; } catch (_) { return ''; } }
// `ligne` : le point parle de toute la ligne (une chute en ligne) — au-delà d'un passage, sa phrase (« vers 104LP1:1 (par
// 103RL1) ») dit le chemin mieux que le seul dernier câble
function quiVuDIci(q, p, o, ligne) { const m = /^(\S+) vers (\S+?)(?::(\S+))?( \(par [^)]+\))?$/.exec(q), nom = o.tete && o.tete.nom, type = m ? m[1] : '';
  if (!m || !nom || o.type === 'fil') return { titre: q, type };
  const l = cableDuPoint(p, o); if (!l || l.de === l.vers) return { titre: q, type };
  const amont = amontDuCable(l), bout = (r, b) => r + (b != null && b !== '' ? ':' + b : '');
  // (un câble au-delà d'une barrette, d'un relais : ses deux bouts, comme le récapitulatif — « 103RL1:A2 → 104LP1:1 · DR22 »)
  if (l.de !== nom && l.vers !== nom) { if (ligne) return { titre: q, type }; const [a, z] = amont === l.vers ? [bout(l.vers, l.borneVers), bout(l.de, l.borneDe)] : [bout(l.de, l.borneDe), bout(l.vers, l.borneVers)];
    return { titre: `${a} ${amont ? '→' : '–'} ${z} · ${type || 'câble'}`, type }; }
  const ici = l.de === nom, b = String((ici ? l.borneDe : l.borneVers) || ''), r = ici ? l.vers : l.de, rb = ici ? l.borneVers : l.borneDe;
  const sens = !amont ? '–' : amont === nom ? '→' : '←';
  return { titre: `${b ? b + ' ' : ''}${sens} ${bout(r, rb)} · ${type || 'câble'}`, type, autre: r }; }
/* (v86, l'audit G5 : « (11,5 A × 0,6 : faisceau de 8 câbles à 60 %) ne s'explique nulle part en clair ») — CE QUI CLOCHE, EN
   MOTS. La phrase du contrôle (« démarrage et transition 9,31 A pendant 2,1 min > 6,9 A admis en continu (11,5 A × 0,6 :
   faisceau de 8 câbles à 60 %) ») devient une phrase : ce qu'il porte, pendant combien de temps, ce qu'il admet — la carte
   s'arrête là (`court`, deux lignes au plus) ; le grand nomme l'état du profil et dit d'où vient l'admis (`long`) : « Ces
   6,9 A : 11,5 A pour un DR20 seul à l'air libre, × 0,6 en faisceau de 8 câbles chargé à 60 %. » Une phrase que VOLTA ne
   sait pas dire autrement reste telle quelle. `suite` : ce qui suivait « — » (« pas protégé en surcharge »). */
const conditionsEnMots = s => String(s || '').split(', ').map(c => { let m;
  if ((m = /^faisceau de (\S+) câbles à (\S+) %$/.exec(c))) return `en faisceau de ${m[1]} câbles chargé à ${m[2]} %`;
  if ((m = /^ambiante (\S+) °C$/.exec(c))) return `à ${m[1]} °C autour`;
  if ((m = /^conducteur (.+)$/.exec(c))) return `en ${m[1]}`;
  if ((m = /^(.+) ft$/.exec(c))) return `à ${m[1]} ft`;
  return c; }).join(', ');
const palierEnMots = p => p === 'en continu' ? 'en continu' : p ? p.replace(/^pour /, 'pendant ') : '';
function motsDuProbleme(reste, suite, type) { const r = String(reste || ''), fin = s => majuscule(s.replace(/\s+$/, '')) + (/[.!?…]$/.test(s) ? '' : '.'); let m;
  // le courant contre ce que le câble admet
  if ((m = /^(.+?) ([\d,]+ A)(?: pendant ([\d,]+ (?:ms|s|min|h)))? > ([\d,]+ A) admis(?: (en continu|pour [\d,]+ (?:s|min)))?(?: \(([\d,]+ A) × ([\d,]+)(?: : ([^)]+))?\))?$/.exec(r))) {
    // (la carte : le courant, la durée, l'admis — deux lignes ; le grand nomme l'état du profil et dit d'où vient l'admis)
    const [, nom, i, t, a, palier, seul, k, pq] = m, quoi = `${i}${t ? ' pendant ' + t : ''}`, sur = ` : plus que les ${a} qu’il admet${palier ? ' ' + palier : ''}`;
    // (« ces 6,9 A » : d'où ils viennent — la table pour un câble seul, le facteur et ce qui le donne)
    const d = seul && k ? ` Ces ${a} : ${seul}${palier && palier !== 'en continu' ? ' ' + palierEnMots(palier) : ''} pour ${type ? 'un ' + type : 'ce câble'} seul à l’air libre, × ${k} ${pq ? conditionsEnMots(pq) : 'ici'}.` : '';
    const cont = palier === 'en continu' && t ? ' Au-delà d’une minute, c’est le continu qui compte.' : '';
    return { court: fin(quoi + sur), long: fin(quoi + (nom ? ' (' + nom.toLowerCase() + ')' : '') + sur) + d + cont }; }
  // ce qu'il admet en continu, sous le calibre : une surcharge entre les deux le chauffe sans que le disjoncteur disjoncte
  if ((m = /^([\d,]+ A) admis en continu(?: \(([\d,]+ A) × ([\d,]+)(?: : ([^)]+))?\))? < calibre ([\d,]+ A)$/i.exec(r))) {
    // (passe 87, variante A : des puces courtes, la conclusion d'abord — « le 10 A ne le protège pas », puis le chiffre qui décide)
    const court = fin(`Le ${m[5]} ne le protège pas en surcharge : il n’admet que ${m[1]} en continu`);
    const d = m[2] && m[3] ? ` Ces ${m[1]} : ${m[2]} pour ${type ? 'un ' + type : 'ce câble'} seul à l’air libre, × ${m[3]} ${m[4] ? conditionsEnMots(m[4]) : 'ici'}.` : '';
    return { court, long: court + ' Entre les deux, il chauffe sans que le disjoncteur disjoncte.' + d, mange: true }; }
  // le permanent contre le contact
  if ((m = /^le permanent \(([\d,]+ A)\) dépasse le contact taille (\S+) (?:supposé \(([\d,]+ A)\)|\(([\d,]+ A), ([^)]+)\))$/i.exec(r))) {
    const court = m[3] ? fin(`${m[1]} en permanence : plus que les ${m[3]} de son contact taille ${m[2]} supposé`) : fin(`${m[1]} en permanence : plus que les ${m[4]} de son contact taille ${m[2]} (${m[5]})`);
    // (supposé : pourquoi celui-là, sans redire sa taille ni son courant)
    const j = type && typeof jaugeDuType === 'function' ? jaugeDuType(type) : null;
    return { court, long: court + (m[3] ? ` Le plan ne dit pas quel contact est serti au bout de ce ${type || 'câble'} : VOLTA prend le plus petit qui admet ${j != null ? 'un ' + j + ' AWG' : 'sa gauge'}, par prudence.` : ''), sansGlose: true }; }
  // le calibre au-delà de la table 11-3
  if ((m = /^calibre ([\d,]+ A) > ([\d,]+ A), le maximum de l’AC 43\.13-1B \(table 11-3\) pour du (\S+) AWG$/i.exec(r))) {
    const court = fin(`Le ${m[1]} dépasse les ${m[2]} que l’AC 43.13-1B (table 11-3) permet au plus sur un ${m[3]} AWG`); return { court, long: court }; }
  // le contact plus faible que le calibre
  if ((m = /^contact taille (\S+) (?:supposé \(([\d,]+ A)\)|\(([\d,]+ A), ([^)]+)\)) < calibre ([\d,]+ A)$/i.exec(r))) {
    const taille = m[2] ? `la taille ${m[1]} supposée n’admet que ${m[2]}` : `sa taille ${m[1]} (${m[4]}) n’admet que ${m[3]}`, protege = /protégé/.test(suite || '');
    const court = fin(protege ? `Le ${m[5]} ne protège pas son contact en surcharge : ${taille}` : `Son contact taille ${m[1]} ${m[2] ? 'supposé' : '(' + m[4] + ')'} n’admet que ${m[2] || m[3]}, moins que le ${m[5]}`);
    return { court, long: court, mange: protege }; }
  // la chute en ligne, au permanent, puis en pointe
  if ((m = /^chute en ligne de ([\d,]+ V)(?: à ([\d,]+ A))?, plus que les ([\d,]+ V) admis( sous [\d,]+ V)?( \(longueurs d’hypothèse\))?$/i.exec(r))) {
    const court = fin(`La ligne perd ${m[1]}${m[2] ? ' sous ' + m[2] : ''}, plus que les ${m[3]} admis${m[4] || ''}${m[5] ? ' — sur des longueurs supposées' : ''}`); return { court, long: court }; }
  if ((m = /^chute en ligne de ([\d,]+ V) en pointe \(([^)]+)\), plus que les ([\d,]+ V) admis( en intermittent)?( \(longueurs d’hypothèse\))?$/i.exec(r))) {
    const court = fin(`En pointe (${m[2]}), la ligne perd ${m[1]}, plus que les ${m[3]} admis${m[4] || ''}${m[5] ? ' — sur des longueurs supposées' : ''}`); return { court, long: court }; }
  // (une phrase que VOLTA ne sait pas dire autrement : telle quelle, sa suite après deux points — « Courant de commande inconnu :
  // écrivez la consommation de la bobine de 103RL1. »)
  // (passe 87 : « VOLTA », « VT1 » gardent leurs capitales — seule une première lettre suivie de minuscules se minusculise)
  const tel = fin(majuscule(r) + (suite ? ' : ' + suite.replace(/^[A-ZÀ-Ý](?=[a-zà-ÿ])/, c => c.toLowerCase()) : '')); return { court: tel, long: tel, mange: !!suite }; }
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
  return { mot: 'Passer en ' + type, cle: 'type|' + cleFil(l) + '|' + type, aide: majuscule(f.pourquoi) + ' : ' + type + (cout ? ' (' + cout + ')' : '') + ' — « Défaire » le rend',
    faire: () => { const avant = cableDit(l); if (parVolta(() => changerLiaison(l, 'type', type, 'type de ' + avant + ' : ' + type))) { dire(majuscule(avant) + ' passe en ' + type + '.', false, typeof defaire === 'function' ? { geste: 'Défaire', faire: defaire } : undefined); if (typeof pulser === 'function') pulser({ type: 'liaisons', ls: [l] }); } } }; }
// l'objet montré, en une clé (« bloc|102CB1 », « fil#… ») : l'onglet ouvert et les points dépliés ne se gardent que pour lui
const cleObjet = () => { const c = typeof app !== 'undefined' && app.cible; if (!c) return ''; try { return cleDEntree(entreeDeCible(c)); } catch (_) { return c.type === 'fil' ? 'fil' : 'bloc|' + (c.nom || ''); } };
/* (passe 87 — le lecteur a choisi la variante A de la planche P1) UNE LIGNE PAR CÂBLE. Un câble qui a plusieurs raisons (son
   courant, sa protection, son contact, la chute de sa ligne) revenait deux ou trois fois, une ligne par règle, avec le même
   « Passer en DR16 ». Il paraît une fois : QUI, vu d'ici (« 2 → 103RL1:A1 · DR20 »), ses raisons en puces dessous, une par
   règle, dans les mots du contrôle (`motsDuProbleme` : les mêmes que le récapitulatif, le panneau Repères et le dossier) ;
   UN geste. La carte dit les règles en mots (« protection · courant · contact »), sa bulle les phrases. Ce qui n'est pas un
   câble (une barrette à poser, un connecteur) garde sa ligne. À RÉGLER : la ligne a un problème ou un geste (la règle de la
   fiche, que le lecteur aime) ; le récapitulatif, le panneau Repères et la garde du dossier PDF rangent et comptent pareil
   (08-recap, `rangsDesPoints`). */
const REGLES_DES_CABLES = ['protection', 'courant', 'contact', 'chute', 'autre'];
// la règle dont parle un point (la phrase du contrôle, ou celle de la fiche d'un câble)
const regleDuPoint = t => { t = String(t || ''); return /chute en ligne/i.test(t) ? 'chute' : /contact taille|dépasse le contact|aucun contact/i.test(t) ? 'contact'
  : /> [\d,]+ A admis|plus que ce que le câble admet/i.test(t) ? 'courant' : /pas protégé|< calibre|table 11-3|maximum de l’AC|laisse passer/i.test(t) ? 'protection' : 'autre'; };
// son mot dans la carte ; un point qui n'a pas de mot court se dit par sa phrase
const motDeLaRegle = (r, t) => r !== 'autre' ? r : /courant de commande inconnu/i.test(t) ? 'courant inconnu' : /type de câble inconnu|sans type/i.test(t) ? 'type inconnu'
  : /sans résistance/i.test(t) ? 'résistance inconnue' : /en double|même ligne/i.test(t) ? 'ligne en double' : '';
/* le câble dont parle un point, pour le ranger sur sa ligne : celui que le contrôle lui attache — le dernier du chemin pour une
   chute en ligne, celui que sa phrase nomme —, sinon celui que sa phrase nomme, vu de la fiche (`cableDuPoint`) ; la liaison
   vivante (un Défaire rend des copies de même contenu). La fiche et le récapitulatif rangent ainsi les mêmes points ensemble. */
function cableDeLaLigne(p, o) { const x = p.point || p, cs = (x.cables || []).filter(c => c && typeof c === 'object');
  let l = cs.length ? cs[cs.length - 1] : null; if (!l) { try { l = cableDuPoint(p, o); } catch (_) { l = null; } } if (!l) return null;
  const V = verite(); if (!V.includes(l) && typeof memeLiaison === 'function') l = V.find(y => memeLiaison(y, l)) || l;
  return (typeof sourceDe === 'function' && sourceDe(l)) || l; }
const finPhrase = s => String(s || '').replace(/\s+$/, '') + (/[.!?…]$/.test(String(s || '').trim()) ? '' : '.');
/* la raison d'un point sur la ligne de son câble : ce qui cloche, en mots (`motsDuProbleme`), sans le câble que la ligne dit
   déjà ; `long` (la bulle) dit tout — d'où vient l'admis, pourquoi VOLTA suppose un contact, son disjoncteur. Une phrase que
   VOLTA ne sait pas dire autrement reste telle quelle, sa suite derrière un tiret. Rend { regle, court, long }. */
function raisonDuPoint(p, o, type) { const t = majuscule(motDuProbleme(p.texte)), k = t.indexOf(' — '), suite = k > 0 ? t.slice(k + 3) : '', titre = k > 0 ? t.slice(0, k) : t;
  const qui = /^(\S+ vers \S+(?: \(par [^)]+\))?) : (.+)$/.exec(titre), reste = qui ? qui[2] : titre, regle = regleDuPoint(reste), brut = majuscule(reste).replace(/[.!?…]\s*$/, '');
  const M = motsDuProbleme(reste, suite, (qui && qui[1].split(' ')[0]) || type || ''), bulle = p.bulle ? '\n' + p.bulle : '';
  if (M.court.startsWith(brut)) { const c = finPhrase(brut + (suite ? ' — ' + suite : '')); return { regle, court: c, long: c + bulle }; }
  const sous = /^sous (\S+)$/i.exec(suite), plus = M.mange || !suite ? '' : sous ? ` Son disjoncteur : ${sous[1]}.` : ' ' + finPhrase(majuscule(suite)), glose = k > 0 || M.sansGlose ? '' : gloseDuProbleme(p.texte);
  return { regle, court: M.court, long: M.long + plus + (glose ? ' ' + glose : '') + bulle }; }
/* TOUT RÉGLER, d'un geste (la variante A, son pied) : chaque câble passe au type qui le règle — une seule entrée d'historique,
   que « Défaire » reprend — ; la phrase dit ce que ça coûte (le cuivre en plus, sur quelles longueurs). `cs` : [{ l, type }]. */
function toutReglerLesCables(cs) { const N = app.norme, H = app.simu || HYPOTHESES, par = new Map(); cs.forEach(c => par.set(c.type, (par.get(c.type) || 0) + 1));
  const quoi = [...par].sort((a, b) => b[1] - a[1]).map(([t, n], i) => (i ? n + ' en ' : n > 1 ? n + ' câbles passent en ' : '1 câble passe en ') + t).join(', ');
  let g = 0, L = 0, Ls = 0, connu = true;
  cs.forEach(c => { const a = c.l.type ? cableDuType(N, c.l.type) : null, b = cableDuType(N, c.type), lu = c.l.longueur > 0, lg = lu ? c.l.longueur : (H.longueur || 0);
    if (!a || !b || a.masse == null || b.masse == null || !lg) { connu = false; return; } g += (b.masse - a.masse) * lg; L += lg; if (!lu) Ls += lg; });
  const cout = connu && Math.abs(g) >= 0.5 ? `${g > 0 ? '+' : '−'}${nombre(Math.round(Math.abs(g)))} g sur ${nombre(arrondi(L, 2))} m${Ls >= L - 1e-9 ? ' supposés' : Ls > 0 ? ', dont ' + nombre(arrondi(Ls, 2)) + ' m supposés' : ''}` : '';
  const phrase = quoi + (cout ? ' : ' + cout : '');
  return { mot: 'Tout régler', phrase, aide: majuscule(phrase) + ' — une seule entrée d’historique, « Défaire » les rend tous',
    faire: () => { const xs = cs.filter(c => c.l && c.l.type !== c.type); if (!xs.length) return;
      if (parVolta(() => changerLiaisons(xs.map(c => [c.l, 'type', c.type]), quoi))) { dire(majuscule(phrase) + '.', false, typeof defaire === 'function' ? { geste: 'Défaire', faire: defaire } : undefined); if (typeof pulser === 'function') pulser({ type: 'liaisons', ls: xs.map(c => c.l) }); } } }; }
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
  // (passe 87, variante A) LES LIGNES : un câble, une ligne (tous ses points) ; un autre point, la sienne — la phrase de décision
  // du premier point (un disjoncteur) aussi. Une ligne prend le geste du premier de ses points qui en a un ; elle est à régler
  // si elle a un problème ou un geste. Dans la fiche d'un câble, ses raisons font une ligne (un point qui a un autre geste que
  // le type — une ligne en double — garde la sienne).
  const fil = o.type === 'fil', typeIci = fil ? ((app.cible && app.cible.l) || {}).type || '' : '', U = [], parCle = new Map();
  pts.forEach((x, i) => { const l = fil || x.phrase ? null : cableDeLaLigne(x.p, o);
    const k = x.phrase ? 'p|' + i : fil ? (x.g && !/^type\|/.test(x.g.cle || '') ? 'p|' + i : 'fil') : l ? 'c|' + cleDeLiaison(l) : 'p|' + i;
    let u = parCle.get(k); if (!u) { u = { k, l, cable: k === 'fil' || k[0] === 'c', xs: [] }; parCle.set(k, u); U.push(u); } u.xs.push(x); });
  U.forEach(u => { const a = u.xs.find(x => x.agir); u.html = a ? a.html : ''; u.g = a ? a.g : null; u.agir = !!a; u.ko = u.xs.some(x => x.p.niveau === 'ko'); u.regler = u.ko || u.agir;
    // (sans geste qui règle, un problème garde celui qui mène à sa cause — « Voir 102CB1 » ; un point à voir reste calme)
    u.mene = u.agir || !u.ko ? null : u.xs.map(x => gesteQuiMene(x.p, o.tete && o.tete.nom)).find(Boolean) || null; });
  // l'ordre : ce qui se règle d'un clic, puis les autres problèmes, puis ce qui se règle en ambre, puis l'information
  const rang = u => (u.ko ? 0 : 2) + (u.agir ? 0 : 1), premier = pts[0] && (o.phrase || o.geste) ? U.find(u => u.xs.includes(pts[0])) : null;
  const ordre = (premier ? [premier] : []).concat(U.filter(u => u !== premier).map((u, k) => [u, k]).sort((a, b) => rang(a[0]) - rang(b[0]) || a[1] - b[1]).map(a => a[0]));
  const R = ordre.filter(u => u.regler), V = ordre.filter(u => !u.regler), nko = R.filter(u => u.ko).length;
  // (l'onglet Câbles du grand compte ses câbles comme cette liste : `composerFiche`)
  const deCable = u => u.cable && !!u.l; o.lignesPbs = { cR: R.filter(deCable).length, cV: V.filter(deCable).length, cKo: R.some(u => deCable(u) && u.ko) };
  const bouton = (g, cls) => { const n = FI.gestesPb.push([g]) - 1; return `<button type="button" class="btn ${cls || 'cuivre dense nc-agir'}" data-geste-pb="${n}:0"${g.aide ? ` data-bulle="${escA(g.aide)}"` : ''}>${esc(g.mot)}</button>`; };
  /* UNE LIGNE DE CÂBLE : QUI vu d'ici, son geste à droite ; ses raisons dessous, une par règle (protection, courant, contact,
     chute) — dans la carte, les règles en mots (la bulle dit les phrases) ; dans le grand, les phrases (la bulle de chacune dit
     d'où vient l'admis). La fiche d'un câble ne redit pas son nom. */
  const ligneCable = u => { const x0 = u.xs[0], p0 = x0.p, etat = u.ko ? 'ko' : 'att', type = u.l ? u.l.type || '' : typeIci, par = new Map();
    u.xs.forEach((x, i) => { const r = raisonDuPoint(x.p, o, type), k = r.regle === 'autre' ? 'autre|' + i : r.regle, niveau = x.p.niveau === 'ko' ? 'ko' : 'att', e = par.get(k);
      if (!e) par.set(k, { ...r, niveau, mot: motDeLaRegle(r.regle, x.p.texte) }); else { if (!e.court.includes(r.court)) { e.court += ' ' + r.court; e.long += '\n' + r.long; } if (niveau === 'ko') e.niveau = 'ko'; } });
    const raisons = [...par.values()].sort((a, b) => REGLES_DES_CABLES.indexOf(a.regle) - REGLES_DES_CABLES.indexOf(b.regle)), tout = raisons.map(r => r.long).join('\n');
    const titre = fil || !u.l ? '' : quiVuDIci(`${type || 'câble'} vers ${u.l.vers}${u.l.borneVers ? ':' + u.l.borneVers : ''}`, { cable: u.l }, o).titre;
    const va = ongletDeSection(o.type, p0.section), vise = u.l && typeof cleFil === 'function' ? cleFil(u.l) : p0.viser || '', cible = `data-onglet-va="${escA(va)}"${vise ? ` data-viser="${escA(vise)}"` : ''}`;
    const enMots = !grand && raisons.length > 1 && raisons.some(r => r.mot);
    const que = !u.agir && u.ko && typeof remede === 'function' ? (remede({ texte: (u.xs.find(x => x.p.niveau === 'ko') || x0).p.texte }) || [])[0] : '';
    const geste = u.html || (u.g ? bouton(u.g) : u.mene ? bouton(u.mene, 'papier dense') : ''), bulleCarte = !grand && tout ? ` data-bulle="${escA(tout)}"` : '';
    const corps = enMots ? `<span class="nc-regles" ${cible}${titre ? '' : bulleCarte}>${raisons.filter(r => r.mot).map(r => `<span class="${r.niveau}">${esc(r.mot)}</span>`).join('')}</span>`
      : `<span class="nc-raisons" ${cible}${titre ? '' : bulleCarte}>${(grand ? raisons : raisons.slice(0, 1)).map(r => `<span class="nc-r ${r.niveau}"${grand && r.long !== r.court ? ` data-bulle="${escA(r.long)}"` : ''}><i aria-hidden="true"></i><span>${insecable(esc(r.court))}</span></span>`).join('')}</span>`;
    return `<div class="nc-tache fi-pb-l nc-ligne ${etat} ${u.regler ? 'agir' : 'info'}${u.agir ? ' a-geste' : ''}${titre ? '' : ' sans-titre'}"><span class="nc-rond" aria-hidden="true">${ico('alerte')}</span>`
      + (titre ? `<button type="button" class="nc-t" ${cible}${bulleCarte}><b class="fi-pb-t">${insecable(esc(titre))}</b></button>` : '')
      + (geste ? `<span class="nc-geste">${geste}</span>` : '') + corps + (que && que !== 'Voir sa fiche' ? `<em class="nc-que">${insecable(esc(que))}</em>` : '') + '</div>'; };
  const ligne = u => u.cable ? ligneCable(u) : lignePoint(u.xs[0]);
  const lignePoint = x => { const p = x.p, t = x.phrase || majuscule(motDuProbleme(p.texte));
    const k = t.indexOf(' — '), suite = k > 0 ? t.slice(k + 3) : ''; let titre = k > 0 ? t.slice(0, k) : t, detail = k > 0 ? majuscule(suite) : gloseDuProbleme(p.texte), tout = '', ar = null;
    // QUI d'abord, VU D'ICI (« A1 ← 102CB1:2 · DR20 »), puis ce qui cloche, EN MOTS : la carte dit l'essentiel en deux lignes au
    // plus, le grand dit tout (d'où vient l'admis, pourquoi VOLTA suppose un contact) ; la bulle de la carte dit ce que le grand dit
    const qui = /^(\S+ vers \S+(?: \(par [^)]+\))?) : (.+)$/.exec(titre);
    if (qui) { const vu = quiVuDIci(qui[1], p, o, /^chute en ligne/i.test(qui[2])), M = motsDuProbleme(qui[2], suite, vu.type), glose = k > 0 || M.sansGlose ? '' : gloseDuProbleme(p.texte);
      // « — sous 102CB1 » : le disjoncteur, quand le titre ne le nomme pas déjà
      const sous = /^sous (\S+)$/.exec(suite), plus = M.mange || !suite ? '' : sous ? (vu.titre.includes(sous[1]) ? '' : ` Son disjoncteur : ${sous[1]}.`) : ' ' + majuscule(suite) + '.';
      // (intégration v86) le grand aussi dit l'essentiel en une phrase — sept problèmes de quatre lignes faisaient un pavé où la
      // même explication revenait sept fois ; d'où vient l'admis se lit au survol, en clair (la bulle), comme dans la carte
      titre = vu.titre; tout = M.long + plus + (glose ? ' ' + glose : ''); detail = M.court; }
    // « B · aucun arrangement EN 4165-002 ne loge B5 : DR12 vers 397TB1 » (un connecteur) : le câble en titre, vu d'ici
    // (« B5 → 397TB1:3 · DR12 »), ce qui cloche dessous — le plus proche, dans le grand
    else if ((ar = /^(\S+) · aucun arrangement (.+?) ne loge (\S+) : (\S+) vers (\S+)$/i.exec(titre))) { const [, cn, fam, bo, type, vers] = ar, nom = o.tete && o.tete.nom;
      let f = null; try { f = nom ? filsDuRepere(nom).find(y => String(y.borne) === bo && y.vers === vers) : null; } catch (_) { f = null; }
      const court = `Aucun arrangement ${fam} ne loge ce ${type} au connecteur ${cn}.`;
      titre = quiVuDIci(`${type} vers ${vers}`, { cable: f ? f.l : null }, o).titre; tout = suite ? court.replace(/\.$/, ' : ' + suite.replace(/^\S/, c => c.toLowerCase()) + '.') : court; detail = grand ? tout : court; }
    // une phrase longue qui finit sur sa parenthèse (« … admis en continu (11,5 A × 0,6 : faisceau de 8 câbles à 60 %) ») : la
    // parenthèse passe dessous, le titre se lit d'un trait
    else if (titre.length > 48) { const m = /^(.+?) \(([^()]+)\)$/.exec(titre); if (m) { titre = m[1]; detail = majuscule(m[2]) + (detail ? ' · ' + detail.replace(/^\S/, c => c.toLowerCase()) : ''); } }
    const va = ongletDeSection(o.type, p.section), bulleT = [tout && tout !== detail ? tout : '', p.bulle || ''].filter(Boolean).join('\n'), bulle = escA(bulleT);
    const cible = `data-onglet-va="${escA(va)}"${p.viser ? ` data-viser="${escA(p.viser)}"` : ''}${p.connecteur ? ` data-connecteur="${escA(p.connecteur)}"` : ''}`, etat = p.niveau === 'ko' ? 'ko' : 'att';
    if (!x.regler) return `<div class="nc-tache fi-pb-l ${etat} info"><span class="nc-rond" aria-hidden="true"></span><button type="button" class="nc-t" ${cible}${bulleT ? ` data-bulle="${bulle}"` : ''}><b class="fi-pb-t">${insecable(esc(titre))}</b>${qui ? ` <small>${insecable(esc(detail))}</small>` : ''}</button></div>`;
    // sans geste qui règle : ce qu'il faut faire, en mots (ceux du récapitulatif) — et le geste qui mène à la cause, s'il y en a un
    const que = !x.agir && typeof remede === 'function' ? (remede({ texte: p.texte }) || [])[0] : '', mene = !x.agir ? gesteQuiMene(p, o.tete && o.tete.nom) : null;
    const geste = x.html || (x.g ? bouton(x.g) : mene ? bouton(mene, 'papier dense') : '');
    // (le titre est le bouton qui mène à l'onglet ; la phrase dessous y mène aussi, à la souris — le geste, à droite, sur la
    // ligne du titre : il ne pousse pas la ligne d'un étage)
    return `<div class="nc-tache fi-pb-l ${etat} agir${x.agir ? ' a-geste' : ''}${titre.length > 30 ? ' long' : ''}"><span class="nc-rond" aria-hidden="true">${ico('alerte')}</span>`
      + `<button type="button" class="nc-t" ${cible}${bulleT ? ` data-bulle="${bulle}"` : ''}><b class="fi-pb-t">${insecable(esc(titre))}</b></button>${geste ? `<span class="nc-geste">${geste}</span>` : ''}`
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
    // (passe 87, variante A) en pied, « Tout régler » : les câbles qu'un type règle passent d'un geste, ce que ça coûte écrit
    const aPasser = R.filter(u => u.g && /^type\|/.test(u.g.cle || '')).map(u => { const m = /^type\|(.*)\|([^|]+)$/.exec(u.g.cle), l = (m && typeof liaisonDeCle === 'function' && liaisonDeCle(m[1])) || u.l; return l && m ? { l, type: m[2] } : null; }).filter(Boolean);
    const tout = !fil && aPasser.length > 1 ? toutReglerLesCables(aPasser) : null;
    const piedTout = tout ? `<div class="nc-tout"><span class="nc-tout-t">${insecable(esc(majuscule(tout.phrase)))}</span><span class="nc-geste">${bouton(tout, 'cuivre dense nc-agir')}</span></div>` : '';
    if (R.length) corps += inter(nko ? 'ko' : 'att', 'À régler', R.length) + vusR.map(ligne).join('')
      + (plusR.length ? `<button type="button" class="nc-autres${deplie ? ' ouvert' : ''}" data-onglet-va="" data-voir-tout="1" aria-expanded="${deplie}"><span>${esc(plusR.length > 1 ? 'et ' + plusR.length + ' autres à régler' : 'et 1 autre à régler')}</span>${ico('droite')}</button><div class="nc-reste"${deplie ? '' : ' hidden'}>${plusR.map(ligne).join('')}</div>` : '') + piedTout;
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
// (court : la colonne de la chute ne fait que 83 px à 1440 quand le contact à sertir a la sienne ; la bulle dit le reste)
const SOUS_COLONNES_CABLES = { i: '% de l’admis', u: '% de l’admis' };
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
  // (passe 87, S12 — « pas de colonne pleine de tirets ») la colonne du contact à sertir ne se pose que si elle sert à la moitié
  // des câbles au moins (la règle des colonnes du récapitulatif, `colonnesUtiles`) : un disjoncteur, vissé, n'en a pas — ses
  // câbles le disent dans leur fiche et dans Pièces
  const nCt = xs.filter(x => x.ct && x.ct.st && x.ct.st.reference).length, avecCt = nCt > 0 && nCt * 2 >= xs.length;
  // (v84) une colonne homogène : si une ligne y porte un anneau, celles qui n'en ont pas gardent sa place (la valeur reste
  // alignée sous les autres) ; si aucune n'en porte, la valeur seule, centrée sous son titre
  const fini = v => v != null && isFinite(v), anI = xs.some(x => fini(x.r.charge.r)), anU = xs.some(x => fini(x.r.chute.u != null && x.r.chute.max ? x.r.chute.u / x.r.chute.max : null));
  // (v86, l'audit F2 : « les 39 % des anneaux, illisibles ») : un anneau un peu plus grand, le trait plus fin — son pourcentage
  // s'écrit à 11 px (style-z-fiche2)
  const anneauOuPlace = (v, a) => !a ? '' : anneauVue(v, { r: 18, ep: 3, texte: true });
  const lignes = xs.slice().sort(cmp).map(({ r, ct, L }) => {
    // (v78, le lecteur : « équipement et borne, mal présentés ; l'intensité, la chute : juste un rapport ») : une nomenclature —
    // le câble, où il va et sur quelle borne, la charge et la chute en anneaux (la part de l'admis), la longueur
    const type = `<span class="nv-cab-id">${r.puce || ''}<b class="id nv-cab-type">${esc(r.type || 'sans type')}</b></span>`;
    const iH = `<span class="nv-mes${anI ? '' : ' seul'}">${anneauOuPlace(r.charge.r, anI)}<span class="nv-mes-t"><b>${r.charge.i != null ? esc(nombreA(r.charge.i)) + ' A' : esc(r.charge.mot || '—')}</b>${r.charge.admis != null ? `<small>sur ${esc(nombreA(r.charge.admis))} A</small>` : r.charge.i != null && r.charge.r == null ? `<small class="nv-mes-inc" data-bulle="${escA(r.type ? r.type + ' n’est pas dans l’EN 2853 : ce qu’il admet ne se lit pas' : 'Votre fichier ne donne pas son type : ce qu’il admet ne se lit pas')}">admis inconnu</small>` : ''}</span></span>`;
    const ru = r.chute.u != null && r.chute.max ? r.chute.u / r.chute.max : null;
    // (v85) sans chemin de disjoncteur, la chute du câble seul — contre la chute admise de toute la ligne : la bulle le dit
    const uH = `<span class="nv-mes${anU ? '' : ' seul'}"${r.chute.seul && r.chute.u != null && r.chute.max != null ? ` data-bulle="${escA('Sur ce câble seul : ' + volts(r.chute.u) + ', ' + Math.round(r.chute.u / r.chute.max * 100) + ' % des ' + volts(r.chute.max) + ' que la ligne entière peut perdre — aucun disjoncteur en amont n’en donne le chemin')}"` : ''}>${anneauOuPlace(ru, anU)}<span class="nv-mes-t"><b>${r.chute.u != null ? esc(volts(r.chute.u)) : esc(r.chute.mot || '—')}</b>${r.chute.max != null && r.chute.u != null ? `<small>sur ${esc(volts(r.chute.max))}</small>` : ''}</span></span>`;
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
  const modifs = modificationsDeLaFiche(o.ecrits || [], o.proposes || [], o);
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
  // (passe 87) l'onglet Câbles dit le même compte que L'essentiel : ses câbles à régler (un problème ou un geste), sinon à voir
  const cab = base.find(x => x.cle === 'cables' || x.cle === 'fils'), Lc = afaire ? o.lignesPbs : null;
  if (cab && Lc && (Lc.cR || Lc.cV)) cab.statut = { ...(cab.statut || {}), t: Lc.cR ? Lc.cR + ' à régler' : Lc.cV + ' à voir', etat: Lc.cR && Lc.cKo ? 'ko' : 'att', bulle: Lc.cR ? pluriel(Lc.cR, 'câble') + ' à régler' + (Lc.cV ? ', ' + Lc.cV + ' à voir' : '') : pluriel(Lc.cV, 'câble') + ' à voir' };
  const des = designationFiche(o), mod = base.find(x => x.cle === 'reglages');
  if (des) { if (mod) mod.contenu = des + (mod.contenu || ''); else if (ess) ess.contenu = (ess.contenu || '') + des; }
  // (l'historique : un onglet quand il y en a un ; sinon rien — un onglet « aucune » n'apprend rien)
  // (v86) son statut : combien de changements ; sa bulle : par qui (« 3 changements (dont 1 par VOLTA) »)
  const onglets = base.concat(modifs ? [{ cle: 'modifs', statut: { t: modifs.n > 1 ? modifs.n + ' changements' : '1 changement', bulle: majuscule(modifs.mots) + ' depuis votre fichier' }, contenu: modifs.html }] : []).slice().sort((x, y) => rangOnglet(x) - rangOnglet(y));
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
  clavierDuGrand(box);
  if (c && c.type !== 'ref') document.body.classList.toggle('insp-grand-ouvert', ficheEnGrand());
  // (v86) la silhouette se trace quand la fiche s'ouvre sur un objet (pas quand elle se refait sur le même : 08-carte)
  if (typeof eveillerSceau === 'function') eveillerSceau(box); }
/* (v86, l'audit F7) LE CLAVIER PARCOURT TOUTE LA FICHE, dans l'ordre où on la lit : la croix, l'onglet (← → passent aux
   autres), puis, panneau par panneau, chaque SECTION (son titre prend Tab : la section vient sous les yeux, l'anneau cuivre
   l'entoure), ses gestes et ses étapes ; un tracé qui s'ouvre au clic s'ouvre aussi au clavier (une ligne du brochage : son
   câble, Entrée ou Espace — 08-fiche, `lierFils`) ; un câble qui a le clavier s'allume sur le plan, comme au survol. Tab
   tourne dans la fiche (08-interface, `lierTabulation`) ; Échap la réduit, puis la ferme. */
function clavierDuGrand(box) {
  box.querySelectorAll('.nv-panneau :is(h4.vu-titre, .nv-mod-t > h4, .nv-reg-t > h4):not([tabindex])').forEach(h => { h.tabIndex = 0; });
  box.querySelectorAll('.nv-panneau svg .bro-l[data-i]:not([tabindex])').forEach(g => { const t = s => { const e = g.querySelector(s); return e ? e.textContent.trim() : ''; }, type = t('.bro-type'), b = t('.bro-borne'), v = t('.bro-vers');
    g.tabIndex = 0; g.setAttribute('role', 'button'); g.setAttribute('aria-label', 'Ouvrir le câble ' + [type && type !== '—' ? type : '', b ? 'de la borne ' + b : '', v ? 'vers ' + v : ''].filter(Boolean).join(' ')); });
  if (box.dataset.clavierLie) return; box.dataset.clavierLie = '1';
  // Échap dans un champ de la fiche : 08-fiche le rend tel qu'il était et le quitte — le clavier tombait sur la page nue ; il
  // revient sur le titre de sa section (08-interface, `quitterLeChamp`)
  box.addEventListener('keydown', e => { if (e.key !== 'Escape' || !/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return; box._echap = e.target; setTimeout(() => { box._echap = null; }, 0); }, true);
  box.addEventListener('focusout', e => { const f = e.target; if (box._echap !== f) return; box._echap = null; if (e.relatedTarget) return;
    setTimeout(() => { const a = document.activeElement; if ((!a || a === document.body) && f.isConnected && typeof quitterLeChamp === 'function') quitterLeChamp(f); }, 0); });
  const ligne = t => t && t.closest && t.closest('#ba-equip [data-i]');
  box.addEventListener('focusin', e => { const el = ligne(e.target); if (el && e.target.matches(':focus-visible') && typeof allumerCle === 'function') allumerCle(el.dataset.i); });
  box.addEventListener('focusout', e => { if (!ligne(e.target) || ligne(e.relatedTarget) || typeof rallumer !== 'function') return; rallumer(); if (typeof FI !== 'undefined' && FI.choisi && typeof allumerCle === 'function') allumerCle(FI.choisi); }); }

/* ---- LA LISTE, LE PANNEAU : leur défilement se garde d'un rendu de la même fiche à l'autre -------------------------- */
const DEFILEMENTS = { liste: 0, panneau: 0, cle: '' };
function noterDefilements(box) { const l = $('nv-liste-l'), p = $('nv-panneaux'); DEFILEMENTS.liste = l ? l.scrollTop : 0; DEFILEMENTS.panneau = p ? p.scrollTop : 0; DEFILEMENTS.cle = box.dataset.cle || ''; }
function rendreDefilements(box, meme) { const l = $('nv-liste-l'), p = $('nv-panneaux'); if (l) l.scrollTop = DEFILEMENTS.liste; if (p) p.scrollTop = meme ? DEFILEMENTS.panneau : 0; }
