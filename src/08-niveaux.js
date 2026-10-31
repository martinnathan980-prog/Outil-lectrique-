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

const NIVEAU = { grand: false, onglet: {}, tri: { col: '', sens: 1 }, filtre: '' };
const recapOuvert = () => !!(typeof app !== 'undefined' && app.base && app.base.ouvert);
// la fiche entière : le grand demandé, ou le récapitulatif ouvert (la fiche y est le volet de droite)
const ficheEnGrand = () => !!NIVEAU.grand || recapOuvert();
// le grand avec sa liste à gauche : ni au téléphone (la feuille entière), ni à côté du récapitulatif
const grandLarge = () => !!NIVEAU.grand && !recapOuvert() && !telephone();

/* ---- LES ONGLETS (v78, le lecteur : « beaucoup plus lisibles, plus clairs, plus compréhensibles ») : chacun dit en deux
   lignes ce qu'il contient et où il en est — « Calibre · 15 A, il passe », « Câbles · 3, au plus 44 % », « Fabrication ·
   17 pièces ». Toujours le même ordre : l'essentiel d'abord, les réglages et l'historique à la fin. ---- */
const ORDRE_ONGLETS = ['essentiel', 'calibre', 'cables', 'fabrication', 'reglages', 'dejafait', 'modifs'];
const TITRES_ONGLETS = { essentiel: 'L’essentiel', calibre: 'Calibre', cables: 'Câbles', fabrication: 'Fabrication', reglages: 'Réglages', dejafait: 'Déjà fait', modifs: 'Modifications' };
// d'où mène une section d'hier, un point, une case : à quel onglet
const ONGLET_DE_SECTION = { disjoncteur: 'calibre', connecteur: 'essentiel', contacts: 'essentiel', trajet: 'essentiel', raccord: 'reglages', conso: 'reglages', fils: 'cables', dejafait: 'dejafait', modifs: 'modifs' };
const ongletDeSection = (type, cle) => !cle ? '' : (type === 'fil' && cle === 'fils') ? 'essentiel' : ONGLET_DE_SECTION[cle] || cle;
const titreOnglet = s => s.titre || TITRES_ONGLETS[s.cle] || (typeof SECTIONS !== 'undefined' && SECTIONS[s.cle]) || s.cle;
const rangOnglet = s => { const k = ORDRE_ONGLETS.indexOf(s.cle); return k < 0 ? 50 : k; };
// l'onglet ouvert : celui qu'on a choisi pour ce genre de fiche (il suit d'un objet à l'autre), sinon l'essentiel
function ongletActif(type, xs) { const k = NIVEAU.onglet[type]; if (k && xs.some(s => s.cle === k)) return k; return (xs.find(s => s.cle === 'essentiel') || xs[0] || {}).cle || ''; }
function ongletsHtml(type, xs) { if (!xs.length) return '';
  const actif = ongletActif(type, xs);
  const tabs = xs.map(s => { const st = s.statut || {};
    return `<button type="button" role="tab" class="nv-onglet" id="nv-o-${escA(s.cle)}" data-onglet="${escA(s.cle)}" aria-selected="${s.cle === actif}" aria-controls="nv-p-${escA(s.cle)}" tabindex="${s.cle === actif ? 0 : -1}">`
      + `<span class="nv-o-t">${esc(titreOnglet(s))}</span><span class="nv-o-s${st.etat ? ' ' + st.etat : ''}">${st.t != null && st.t !== '' ? esc(st.t) : '&nbsp;'}</span></button>`; }).join('');
  const panneaux = xs.map(s => `<section class="nv-panneau${s.vide ? ' fs-vide' : ''}" role="tabpanel" id="nv-p-${escA(s.cle)}" data-section="${escA(s.cle)}" aria-labelledby="nv-o-${escA(s.cle)}" tabindex="-1"${s.cle === actif ? '' : ' hidden'}>`
    + (s.vide ? `<p class="vu-note">${esc(majuscule(s.vide))}${s.action ? ' ' + s.action : ''}</p>` : '') + (s.contenu || '') + '</section>').join('');
  return `<div class="nv-onglets" role="tablist" aria-label="Ce que dit la fiche">${tabs}</div><div class="nv-panneaux" id="nv-panneaux">${panneaux}</div>`; }
// une section d'hier (une fiche pas encore redessinée) devient un onglet
const ongletDeLaSection = s => ({ cle: s.cle === 'fils' ? 'cables' : s.cle === 'connecteur' ? 'essentiel' : s.cle, titre: s.cle === 'fils' || s.cle === 'connecteur' ? '' : s.titre, statut: s.resume ? { t: String(s.resume).replace(/<[^>]*>/g, '').slice(0, 40) } : null, contenu: s.contenu, vide: s.vide, action: s.action });

// les onglets que toutes les fiches partagent : les câbles (la section d'hier, son statut en mots), la fabrication
const ongletCables = sF => !sF ? null : { cle: 'cables', statut: { t: sF.vide ? 'aucun' : pluriel(sF.compte || 0, 'câble') + (sF.nko ? ', ' + sF.nko + ' en défaut' : sF.charge != null ? ', au plus ' + Math.round(sF.charge * 100) + ' %' : ''), etat: sF.nko ? 'ko' : sF.natt ? 'att' : '' }, contenu: sF.contenu, vide: sF.vide };
function ongletFabrication(groupes, titre) { const gs = (groupes || []).filter(g => g && g.lignes && g.lignes.length); if (!gs.length) return null;
  const n = gs.reduce((s, g) => s + g.lignes.reduce((t, l) => t + (l.q || 0), 0), 0);
  return { cle: 'fabrication', statut: { t: pluriel(n, 'pièce') }, contenu: `<section class="vu-bloc"><h4 class="vu-titre">${esc(titre || 'Ce qu’il faut pour la monter')} <span>${esc(pluriel(n, 'pièce'))}</span></h4>${fabricationVue(gs)}</section>` }; }

/* ---- L'ÉTIQUETTE : le genre et son état d'un mot ; le repère, en grand, qui se renomme d'un clic ; ce qui l'identifie ---- */
const GENRES_FICHE = { equipement: 'Équipement', disjoncteur: 'Disjoncteur', barrette: 'Barrette de jonction', prise: 'Prise de coupure', masse: 'Masse', fil: 'Câble' };
const motEtatFiche = probs => { const ko = probs.filter(p => p.niveau === 'ko').length, n = probs.length; return ko ? pluriel(ko, 'problème') : n ? (n > 1 ? n + ' points à voir' : '1 point à voir') : 'Tout va bien'; };
const genreFiche = (o, probs) => { const e = etatDesProblemes(probs);
  return `<div class="nc-genre"><span class="nc-sym" aria-hidden="true"><svg viewBox="0 0 30 30">${SYMBOLES[o.type] || SYMBOLES.equipement}</svg></span><span class="nc-genre-mot">${esc(GENRES_FICHE[o.type] || 'Élément')}</span><span class="nc-etat ${e} fi-pb-n">${esc(motEtatFiche(probs))}</span></div>`; };
function etiquetteFiche(o, grand) { const t = o.tete || {}, nom = t.nom || '';
  const rep = t.champ ? `<input class="nc-rep-in" id="${t.champ}" value="${escA(nom)}" aria-label="${escA(t.aide || 'Repère — écrire pour renommer partout')}" spellcheck="false" autocomplete="off"><button type="button" class="nc-crayon" id="fi-crayon" aria-label="Renommer (F2)" data-bulle="Renommer partout — F2 ; chaque câble suit">${ico('crayon')}</button>`
    : `<span class="nc-rep-t">${esc(nom)}</span>`;
  const des = t.designation && grand ? app.contrat.designations.get(t.designation) || '' : null;
  const meta = (o.meta || []).filter(Boolean).map(m => `<span>${m}</span>`).join('') + (des != null ? `<input class="nc-des${des ? ' plein' : ''}" id="eq-des" value="${escA(des)}" placeholder="+ une désignation" aria-label="Désignation (un texte libre, gardé avec le contrat)" spellcheck="false" autocomplete="off">` : '');
  return `<div class="nc-rep">${rep}</div>${meta ? `<div class="nc-meta fi-identite">${meta}</div>` : ''}`; }

/* ---- À FAIRE : chaque point devient une tâche — ce qui cloche, puis (après « — ») ce que ça veut dire ; le geste qui
   répare au bout de la première ; un clic sur une tâche mène à l'onglet qui la démontre ---- */
const gestePrincipal = p => { const gs = (p && p.gestes || []).filter(x => x && x.mot && typeof x.faire === 'function'); return gs.find(x => x.principal) || gs[0] || null; };
function tachesFiche(o, probs, max) { if (!FI.gestesPb) FI.gestesPb = [];
  if (!probs.length) return `<div class="nc-taches"><div class="nc-tache ok"><span class="nc-rond" aria-hidden="true">${ico('coche')}</span><span class="nc-t"><b>Rien à reprendre</b><small>${esc(o.ok || 'Tout est en ordre sur cette fiche.')}</small></span></div></div>`;
  const tri = probs.filter(p => p.niveau === 'ko').concat(probs.filter(p => p.niveau !== 'ko')), p0 = tri.find(p => !(o.taire && o.taire.test(p.texte))) || tri[0];
  const ordre = [p0, ...tri.filter(p => p !== p0)], montres = ordre.slice(0, max);
  const ligne = (p, i) => { let t = majuscule(motDuProbleme(p.texte)); if (i === 0 && o.phrase) t = o.phrase;
    const k = t.indexOf(' — '), titre = k > 0 ? t.slice(0, k) : t, detail = k > 0 ? majuscule(t.slice(k + 3)) : gloseDuProbleme(p.texte);
    let geste = '';
    if (i === 0 && o.geste) geste = o.geste;
    else { const g = gestePrincipal(p); if (g) { const n = FI.gestesPb.push([g]) - 1; geste = `<button type="button" class="btn ${p.niveau === 'ko' ? 'cuivre' : 'papier'} dense" data-geste-pb="${n}:0"${g.aide ? ` data-bulle="${escA(g.aide)}"` : ''}>${esc(g.mot)}</button>`; } }
    const va = ongletDeSection(o.type, p.section);
    return `<div class="nc-tache fi-pb-l ${p.niveau === 'ko' ? 'ko' : 'att'}"><span class="nc-rond" aria-hidden="true">${ico('alerte')}</span>`
      + `<button type="button" class="nc-t" data-onglet-va="${escA(va)}"${p.viser ? ` data-viser="${escA(p.viser)}"` : ''}${p.connecteur ? ` data-connecteur="${escA(p.connecteur)}"` : ''} data-bulle="${escA(t + (p.bulle ? '\n' + p.bulle : ''))}"><b class="fi-pb-t">${insecable(esc(titre))}</b>${detail ? `<small>${insecable(esc(detail))}</small>` : ''}</button>${geste ? `<span class="nc-geste">${geste}</span>` : ''}</div>`; };
  const reste = ordre.length - montres.length;
  return `<div class="nc-taches">${montres.map(ligne).join('')}${reste > 0 ? `<button type="button" class="nc-autres" data-onglet-va="" data-voir-tout="1">${esc(reste > 1 ? 'et ' + reste + ' autres points' : 'et 1 autre point')}${ico('droite')}</button><div class="nc-taches nc-reste" hidden>${ordre.slice(max).map((p, i) => ligne(p, i + max)).join('')}</div>` : ''}</div>`; }

/* ---- LES CHIFFRES : trois ou quatre nombres, grands, sans boîte — la valeur, une jauge contre l'admis, ce que c'est,
   une ligne dessous. Un clic mène à l'onglet qui l'explique ; une valeur qui s'écrit s'écrit sur place. ---- */
function chiffresHtml(xs, n) { const ys = (xs || []).filter(Boolean).slice(0, n || 9); if (!ys.length) return '';
  return `<div class="nc-chiffres" style="--n:${ys.length}">${ys.map(c => { const va = c.onglet ? ongletDeSection(NIVEAU.typeRendu, c.onglet) : '', bouton = va && !c.edit, tag = bouton ? 'button' : 'div';
    return `<${tag}${bouton ? ` type="button" data-onglet-va="${escA(va)}"` : ''} class="nc-chiffre${c.etat ? ' ' + c.etat : ''}${c.edit ? ' edit' : ''}"${c.bulle ? ` data-bulle="${escA(c.bulle)}"` : ''}>`
      + `<span class="nc-v">${c.v}</span>`
      + (c.barre != null && isFinite(c.barre) ? `<span class="nc-jauge ${classeMesure(c.barre)}" aria-hidden="true"><i style="width:${(Math.min(1, Math.max(0, c.barre)) * 100).toFixed(1)}%"></i></span>` : '')
      + `<span class="nc-k">${esc(c.k)}</span>${c.sous ? `<span class="nc-s">${c.sous}</span>` : ''}</${tag}>`; }).join('')}</div>`; }
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
const COLONNES_TABLE_CABLES = [['type', 'Câble'], ['vers', 'Vers'], ['i', 'Intensité'], ['u', 'Chute'], ['lg', 'Longueur'], ['ct', 'Contact']];
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
    return `<th scope="col" aria-sort="${s}" class="nv-th-${k}"><button type="button" class="nv-tri" data-tri="${k}" data-bulle="${escA('Trier par ' + t.toLowerCase() + (s === 'none' ? '' : ' — un clic renverse'))}">${esc(t)}<span class="nv-tri-f" aria-hidden="true">${s === 'ascending' ? '↑' : s === 'descending' ? '↓' : '↕'}</span></button></th>`; }).join('');
  const lignes = xs.slice().sort(cmp).map(({ r, ct, L }) => { const ed = r.l && r.l.origine !== null && r.k && r.k[0] !== 'p' ? editionsDuCable(r) : null;
    // (v78, le lecteur : « il n'y a plus de numéro de câble du tout ») : un câble se dit par son type, et où il va
    const type = `<b class="id nv-cab-type">${esc(r.type || 'sans type')}</b>`;
    const m = classeMesure(r.charge.r), w = r.charge.r != null && isFinite(r.charge.r) ? Math.max(0, Math.min(1, r.charge.r)) * 100 : 0;
    const iH = `<span class="nv-cab-i ${m}"><span class="fi-barre ${m}" aria-hidden="true"><i style="width:${w.toFixed(1)}%"></i></span><span class="cb-i-v">${r.charge.i != null ? `<b>${esc(nombreA(r.charge.i))}</b>${r.charge.admis != null ? ' / ' + esc(nombreA(r.charge.admis)) : ''} A` : esc(r.charge.mot || '—')}</span></span>`;
    const uH = `${celluleU(r.chute)}${r.chute.max != null ? `<small class="nv-sur">/ ${esc(volts(r.chute.max))}</small>` : ''}`;
    const lgH = ed ? `<span class="nv-cab-lg">${ed.lon}<small>m${L == null ? ' · supposée' : ''}</small></span>` : `<span class="nv-cab-lg">${L != null ? esc(nombre(arrondi(L, 2))) : esc(nombre(H.longueur))}<small>m${L == null ? ' · supposée' : ''}</small></span>`;
    const ctH = ct && ct.st && ct.st.reference ? `<span class="id nv-cab-ct${ct.ko ? ' ko' : ''}" data-bulle="${escA(motSertir(ct.st) + (ct.rep ? ' — ' + ct.rep + (ct.borne ? ':' + ct.borne : '') : ''))}">${esc(ct.st.reference)}</span>` : '<span class="nv-muet">—</span>';
    return `<tr class="fi-ia nv-cab${r.etat ? ' ' + r.etat : ''}"${r.k ? ` data-i="${r.k}" tabindex="0"` : ''}${r.bulle ? ` data-bulle="${escA(r.bulle + (r.pourquoi ? '\n' + r.pourquoi : ''))}"` : ''}>`
      + `<td class="nv-td-type"><span class="nv-cab-id">${r.puce || ''}${type}</span></td>`
      + `<td class="nv-td-vers"><span class="id">${esc(r.bout && r.bout.rep ? r.bout.rep : '—')}</span>${r.bout && r.bout.borne ? `<small>:${esc(r.bout.borne)}</small>` : ''}</td>`
      + `<td class="nv-td-i">${iH}</td><td class="nv-td-u">${uH}</td><td class="nv-td-lg">${lgH}</td><td class="nv-td-ct">${ctH}</td></tr>`; }).join('');
  return `<div class="nv-table-c"><table class="nv-cables${o.cls ? ' ' + o.cls : ''}"><caption class="nv-cap">${esc(pluriel(rows.length, 'câble'))} — un clic sur une ligne ouvre le câble</caption><thead><tr>${tete}</tr></thead><tbody>${lignes}</tbody></table></div>${datalistCables()}`; }

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
    // LA CARTE — le premier regard : l'étiquette, la pièce en vignette, ce qu'il y a à faire, trois chiffres, « Tout voir »
    return `<div class="nc">${genreFiche(o, probs)}${etiquetteFiche(o, false)}${o.avant || ''}`
      + (o.vignette ? `<button type="button" class="nc-vignette" data-onglet-va="essentiel" aria-label="Tout voir : la fiche entière">${o.vignette}<span class="nc-voir">Tout voir${ico('droite')}</span></button>` : '')
      + tachesFiche(o, probs, 2) + chiffresHtml(o.chiffres, 3)
      + (modifs ? `<button type="button" class="nc-modifs" data-onglet-va="modifs" data-bulle="${escA(modifs.mots + ' — les voir')}">${ico('crayon')}<span>${esc(modifs.mots)}</span>${ico('droite')}</button>` : '') + '</div>'
      + fiPied({ ...(o.pied || {}), toutVoir: true }) + (o.fin || ''); }
  // LE GRAND — la fenêtre : la barre (on la tient pour la déplacer), l'étiquette et les chiffres, à faire, les onglets
  const base = o.onglets ? o.onglets.filter(Boolean) : (o.sections || []).filter(Boolean).map(ongletDeLaSection);
  // (les modifications : un onglet quand il y en a ; sinon rien — un onglet « aucune » n'apprend rien)
  const onglets = base.concat(modifs ? [{ cle: 'modifs', statut: { t: modifs.n > 1 ? modifs.n + ' changements' : '1 changement' }, contenu: modifs.html }] : []).slice().sort((x, y) => rangOnglet(x) - rangOnglet(y));
  const corps = `<div class="nv-tete nv-poignee">${barreNav({ milieu: genreFiche(o, probs), fermer: true })}</div>`
    + `<div class="nv-resume"><div class="nv-ident">${etiquetteFiche(o, true)}</div>${chiffresHtml(o.chiffres, 4)}</div>${o.avant ? `<div class="nv-avant">${o.avant}</div>` : ''}`
    + `<div class="nv-afaire">${tachesFiche(o, probs, 3)}</div>` + ongletsHtml(o.type, onglets) + fiPied(o.pied || {}) + (o.fin || '');
  return `<div class="nv-grand${grandLarge() ? '' : ' nv-seul'}" data-nv-type="${escA(o.type)}">${grandLarge() ? listeDuGenre(app.cible, etatDesProblemes(probs)) : ''}<div class="nv-corps">${corps}</div></div>`; }

/* ---- PASSER D'UN NIVEAU À L'AUTRE --------------------------------------------------------------------------------- */
/* « Tout voir » (ou un double-clic, ou une case de la carte) : la carte devient le grand — elle glisse jusqu'à sa place
   (08-carte, `epinglerCarte`), le plan se recadre à gauche, l'objet en vue ; `onglet` : celui qui s'ouvre. Réduire
   (Échap, le bouton) : le grand redevient la carte, près de son bloc. */
function ouvrirGrand(onglet, but) { if (onglet) { const t = typeDeLaFicheMontree(); if (t) NIVEAU.onglet[t] = ongletDeSection(t, onglet); }
  if (NIVEAU.grand) { if (onglet) activerOnglet(onglet, true); if (but && but.viser) viserDansLaFiche(but.viser); return; }
  NIVEAU.grand = true; if (typeof epinglerCarte === 'function') epinglerCarte(true); else rendreFiche();
  if (but && but.viser) viserDansLaFiche(but.viser); }
function reduireFiche() { if (!NIVEAU.grand) return; NIVEAU.grand = false; if (typeof epinglerCarte === 'function') epinglerCarte(false); else rendreFiche(); }
// le genre de la fiche montrée (l'onglet retenu en dépend) : celui que porte le grand, sinon celui de la cible
const typeDeLaFicheMontree = () => { const g = document.querySelector('#ba-equip .nv-grand'); if (g) return g.dataset.nvType; const c = app.cible; if (!c) return '';
  return c.type === 'fil' ? 'fil' : estDisjoncteur(c.nom) ? 'disjoncteur' : VT_A_POSER.test(c.nom) || barretteEnModules(c.nom) ? 'barrette' : coupureEnModules(c.nom) ? 'prise' : estMasse(c.nom) ? 'masse' : 'equipement'; };
// un onglet devient le montré (sans refaire la fiche) : son panneau paraît, en haut ; `allumer` le fait briller un instant
function activerOnglet(cle, allumer) { const box = $('ba-equip'), g = box && box.querySelector('.nv-grand'); if (!g) return null;
  cle = ongletDeSection(g.dataset.nvType, cle); const tab = g.querySelector(`.nv-onglet[data-onglet="${CSS.escape(cle)}"]`); if (!tab) return null;
  NIVEAU.onglet[g.dataset.nvType] = cle;
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
function lierNiveaux(box, c) {
  // « Tout voir », une case de la carte, « et 2 autres points », une ligne des modifications : le grand, sur l'onglet
  box.querySelectorAll('[data-onglet-va]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); const k = b.dataset.ongletVa || '';
    if (b.dataset.voirTout && ficheEnGrand()) { const r = b.parentElement.querySelector('.nc-reste'); if (r) { r.hidden = !r.hidden; b.classList.toggle('ouvert', !r.hidden); } return; }
    if (ficheEnGrand()) { if (k) activerOnglet(k, true); if (b.dataset.viser) viserDansLaFiche(b.dataset.viser); return; }
    ouvrirGrand(k, b.dataset.viser ? { viser: b.dataset.viser } : null); if (b.dataset.voirTout) { const r = $('ba-equip').querySelector('.nc-reste'); if (r) r.hidden = false; } });
  const tv = $('fi-tout-voir'); if (tv) tv.onclick = e => { e.stopPropagation(); ouvrirGrand(''); };
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
  // (v78) les touches du calibre : un clic retient ce calibre ; « Revenir au choix de Volta » rend l'automatique
  const refaire = () => { if (!$('inspecteur').hidden && app.cible && !rafraichirFicheEnPlace()) rendreFiche(); };
  box.querySelectorAll('[data-nv-cal]').forEach(b => b.onclick = e => { e.stopPropagation(); if (c && c.nom && retenirCalibre(c.nom, +b.dataset.nvCal) !== false) refaire(); });
  box.querySelectorAll('[data-nv-auto]').forEach(b => b.onclick = e => { e.stopPropagation(); rendreCalibre(b.dataset.nvAuto); refaire(); });
  if (c && c.type !== 'ref') document.body.classList.toggle('insp-grand-ouvert', ficheEnGrand()); }

/* ---- LA LISTE, LE PANNEAU : leur défilement se garde d'un rendu de la même fiche à l'autre -------------------------- */
const DEFILEMENTS = { liste: 0, panneau: 0, cle: '' };
function noterDefilements(box) { const l = $('nv-liste-l'), p = $('nv-panneaux'); DEFILEMENTS.liste = l ? l.scrollTop : 0; DEFILEMENTS.panneau = p ? p.scrollTop : 0; DEFILEMENTS.cle = box.dataset.cle || ''; }
function rendreDefilements(box, meme) { const l = $('nv-liste-l'), p = $('nv-panneaux'); if (l) l.scrollTop = DEFILEMENTS.liste; if (p) p.scrollTop = meme ? DEFILEMENTS.panneau : 0; }
