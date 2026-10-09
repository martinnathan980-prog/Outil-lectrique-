/* ===========================================================================
   08 bis — LA FICHE : ce qu'on voit quand on clique un bloc ou un fil
   ---------------------------------------------------------------------------
   Le lecteur : « pas propre, pas net, pas carré ; il n'y a pas toutes les
   infos, mais en même temps c'est trop chargé ; que ça glisse sur les yeux,
   qu'un BD comprenne tout de suite ; tout logique, du fil au contact, à la
   barrette, au raccord ». Une fiche dit, dans cet ordre, et rien d'autre :
     1. L'EN-TÊTE : le repère (un champ : on le renomme en écrivant dedans),
        dessous une ligne de nature et de faits clés (« équipement · 23 fils ·
        3 connecteurs · EN4165-2M »), la désignation si on en a écrit une, et
        — seulement s'il y a quelque chose à reprendre — l'état, déplié ;
     2. LE RÉSUMÉ, en tuiles : ce qu'un technicien regarde d'abord (les
        contacts par connecteur, le toron, le raccord ; les potentiels, les
        fils, ce qui reste libre ; les deux côtés d'une prise) ;
     3. LA RÉFÉRENCE retenue, pourquoi, et « Changer » (un volet : la norme,
        les candidats avec leur picto, le sexe des contacts) ;
     4. LA FACE : un dessin technique à plat (08 ter), chaque contact pris à la
        couleur de son fil, et une légende, une fois ;
     5. AUTOUR du connecteur : ce qu'on sertit, le toron, le raccord, le
        band-it, le manchon, la gaine, avec leur référence ; les choix du
        tutoriel en segments sous « Changer » ;
     6. SES FILS, une ligne chacun : le contact, la route en trait, le type,
        le contact à sertir s'il diffère, où il va, le numéro en retrait.
        Survoler allume le fil sur le plan et sur la face ; cliquer y va.
   La fiche d'un FIL : ses deux bouts, puis les faits (le câble, ce qu'il
   admet, le courant qui le traverse, la chute, la longueur). Celle d'un
   DISJONCTEUR commence par sa disjonction (08 quinquies). Un équipement à
   plusieurs connecteurs les range en onglets, un à la fois. Le pied : le
   tableau, « + fil », le relief ; sous « ··· », renommer, la désignation,
   supprimer. La fiche vit dans l'inspecteur, à droite ; l'index des repères
   (08, `rendreIndex`) y vit aussi, du même monde.
   =========================================================================== */
'use strict';

const FI = { onglet: {}, change: {} };   // d'une fiche à l'autre : l'onglet ouvert de chaque bloc, « Changer » déplié ou non
const ICONES = {
  fermer: '<path d="M6 6l12 12M18 6 6 18"/>',
  relief: '<path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3zM4 7.5l8 4.5 8-4.5M12 12v9"/>',
  tableau: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M3 14h18M9 5v14"/>',
  fleche: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  bas: '<path d="m6 9 6 6 6-6"/>',
  retour: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  loupe: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  voir: '<circle cx="12" cy="12" r="3"/><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/>',
  points: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  plus: '<path d="M12 5v14M5 12h14"/>'
};
const ico = (k, cls) => `<svg class="ico${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true">${ICONES[k]}</svg>`;
const coulDeFil = f => couleursDesRoutes().get((f.l && f.l.route) || '') || '#26323f';
const puceFil = f => `<i class="fi-puce" style="background:${coulDeFil(f)}"></i>`;
const typesDe = fils => [...new Set(fils.map(f => f.type).filter(Boolean))].sort(triNaturel).join(', ');
/* La clé d'un fil dans la fiche : son rang dans le contrat — ou, pour un fil que l'outil ajoute (le fil à créer d'une
   barrette à poser), « p » et son rang dans le folio. Les lignes, les contacts de la face et le plan se la partagent. */
function cleFil(l) { const i = rangDe(l); if (i >= 0) return String(i); const p = liaisonsDuPlan().indexOf(l); return p >= 0 ? 'p' + p : ''; }
const filDeCle = k => !k || k === '-1' ? null : k[0] === 'p' ? ((app.dessin && app.dessin.fils) || []).find(w => w.i === +k.slice(1)) || null : filDe(verite()[+k]);
// le numéro d'un fil ; celui que l'outil ajoute (le raccord d'une barrette à poser) n'en a pas encore : « à créer »
const nomDuFil = f => f.cable || (f.l && f.l.origine === null ? 'à créer' : '—');
// le code du repère : « XC » pour 300XC1, « VT » pour une barrette (l'index et le contrôle s'en servent)
const codeDe = nom => { const q = lireRepere(nom); return q && q.code ? q.code.slice(0, 3) : String(nom || '?').slice(0, 2); };
const s_ = n => n > 1 ? 's' : '';
const mm = x => nombre(Math.round(x * 10) / 10);

/* ---- les morceaux ---------------------------------------------------------- */
/* La tête : le repère — un champ, qu'on renomme en écrivant dedans —, dessous la ligne de nature (`sous`), la
   désignation si on en a donné une, puis l'état s'il y a quelque chose à reprendre. `retour` : la fiche vient de
   l'index, une flèche y ramène. */
function fiTete(o) {
  const nom = o.renommer ? `<input class="fi-nom" id="eq-rep" value="${escA(o.nom)}" aria-label="${escA(o.aide || 'Repère — écrire pour renommer')}" title="${escA(o.aide || 'Écrire ici renomme : chaque fil suit')}" spellcheck="false" autocomplete="off">`
    : `<div class="fi-nom">${esc(o.nom)}</div>`;
  return `<header class="fi-tete">${app.insp.index ? `<button class="fi-x" id="fi-retour" aria-label="Retour à la liste des repères">${ico('retour')}</button>` : ''}`
    + `<div class="min0">${nom}</div><button class="fi-x" id="in-fermer" aria-label="Fermer (Échap)">${ico('fermer')}</button></header>`
    + `<div class="fi-ligne">${o.sous ? `<span class="fi-sous">${o.sous}</span>` : ''}`
    + (o.designation != null ? `<input class="fi-des" id="eq-des" value="${escA(o.designation)}"${o.designation ? '' : ' hidden'} placeholder="désignation" aria-label="Désignation, écrite sous le repère" spellcheck="false" autocomplete="off">` : '') + '</div>'
    + (o.etat || ''); }
/* L'état — seulement s'il y a quelque chose à dire (le lecteur : « conforme, tu peux l'enlever ») : une carte, rouge
   dès qu'il y a un problème, les problèmes d'abord puis les points à voir (en ambre, jamais cachés) ; dépliée d'office
   s'il y a un problème ou un seul point, derrière un clic quand les points à voir sont plusieurs. */
function fiEtat(ko, att) {
  if (!ko.length && !att.length) return '';
  const cls = ko.length ? 'ko' : 'att', titre = [ko.length ? (ko.length > 1 ? ko.length + ' problèmes' : '1 problème') : '', att.length ? (att.length > 1 ? att.length + ' à voir' : '1 point à voir') : ''].filter(Boolean).join(' · ');
  return `<details class="fi-etat ${cls}"${ko.length || att.length === 1 ? ' open' : ''}><summary><i aria-hidden="true">${cls === 'ko' ? '✕' : '!'}</i><span>${titre}</span>${ico('bas', 'fi-chevron')}</summary>`
    + `<ul>${ko.map(t => `<li>${esc(t)}</li>`).join('')}${att.map(t => `<li${ko.length ? ' class="fi-att"' : ''}>${esc(t)}</li>`).join('')}</ul></details>`; }
/* La référence retenue (sa norme se lit dedans : on ne la répète pas), pourquoi en une ligne, et « Changer » qui
   déplie les autres. */
function fiRef(ref, famille, cle, changer, titre) {
  return `<div class="fi-ref-ligne"><div class="min0"><b class="fi-ref">${esc(ref || '—')}</b>${titre ? `<small class="fi-pourquoi">${esc(titre)}</small>` : ''}</div>`
    + (changer ? `<button class="fi-lien" data-changer="${escA(cle)}" aria-expanded="${!!FI.change[cle]}">Changer${ico('bas', 'fi-chevron')}</button>` : '') + '</div>'
    + (changer ? `<div class="fi-changer" data-volet="${escA(cle)}"${FI.change[cle] ? '' : ' hidden'}>${changer}</div>` : ''); }
/* Des faits, en grille : la clé en petit, la valeur en linéale, les identifiants en chasse fixe. rows : [[clé, html, titre?]] */
const insecable = h => String(h).replace(/(\d) (A|V|mm²|mm|m|s|min|ms|h|AWG|%|g\/m|mΩ\/m|Ω\/km)(?![\wé])/g, '$1 $2').replace(/(Ø) (\d)/g, '$1 $2');
const faits = (rows, cls) => { const xs = rows.filter(r => r && r[1]); return xs.length ? `<dl class="fi-faits${cls ? ' ' + cls : ''}">${xs.map(([k, v, t]) => `<dt>${esc(k)}</dt><dd${t ? ` title="${escA(t)}"` : ''}>${insecable(v)}</dd>`).join('')}</dl>` : ''; };
/* Le résumé, en tuiles : un chiffre (ou un mot), ce qu'il compte, un détail. xs : [[valeur html, libellé, détail?, attr?]] */
const tuiles = xs => { const ys = xs.filter(x => x && x[1] != null && x[0] !== '' && x[0] != null); return ys.length ? `<div class="fi-tuiles">${ys.map(([v, t, d, attr]) => `<${attr ? 'button' : 'div'} class="fi-tuile"${attr ? ' ' + attr : ''}><b>${v}</b><span>${esc(t)}</span>${d ? `<small>${insecable(d)}</small>` : ''}</${attr ? 'button' : 'div'}>`).join('')}</div>` : ''; };
const arrondi = (x, n) => x == null || !isFinite(x) ? null : Math.round(x * Math.pow(10, n)) / Math.pow(10, n);
const volts = u => u == null ? '—' : nombre(arrondi(u, u < 0.1 ? 3 : 2)) + ' V';
const puces = (attr, items, actif) => `<div class="fi-puces">${items.map(([f, t]) => `<button class="fi-chip${f ? ' ' + classeFamille(f) : ''}" ${attr}="${escA(f)}" aria-pressed="${f === actif}">${esc(t)}</button>`).join('')}</div>`;
const candidat = (cle, m, retenu) => `<button class="cand" data-cle="${escA(cle)}" data-ref="${escA(m.reference)}" aria-pressed="${m.reference === retenu}">${pictoModule(m)}<b>${esc(m.variante)}</b><span>${esc(resumeModule(m))}</span></button>`;
const liens = xs => xs.filter(Boolean).length ? `<div class="fi-liens">${xs.filter(Boolean).join('')}</div>` : '';
// un titre de volet : « norme », « variante », « sexe des contacts »
const voletT = t => `<p class="fi-note fi-rac-t">${esc(t)}</p>`;
/* Le sexe des contacts qu'on sertit : deux puces (une prise : la fiche d'un sexe, l'embase de l'autre). */
const pucesSexe = (cle, actif, prise) => voletT('contacts à sertir') + `<div class="fi-puces">${[['F', prise ? 'Fiche femelle · embase mâle' : 'Femelles'], ['M', prise ? 'Fiche mâle · embase femelle' : 'Mâles']]
  .map(([v, t]) => `<button class="fi-chip" data-sexe="${escA(cle)}" data-v="${v}" aria-pressed="${v === actif}">${esc(t)}</button>`).join('')}</div>`;
/* Une face qui tient dans la largeur de la fiche : le SVG se met à l'échelle. */
const faceAjustee = (f, titre) => `<figure class="fi-face"><svg class="mj" viewBox="0 0 ${f1(f.w)} ${f1(f.h)}" style="max-width:${f1(Math.min(f.w * 1.2, 520))}px" role="img" aria-label="${escA(titre || 'Face')}">${f.svg}</svg>${titre ? `<figcaption>${esc(titre)}</figcaption>` : ''}</figure>`;
/* La légende des faces — une fois par fiche : ce qu'un contact plein, vide, cerclé de rouge veut dire. */
const legendeFaces = ko => `<div class="fi-legende"><span><i class="plein"></i>un fil, à la couleur de sa route</span><span><i></i>libre</span>${ko ? '<span><i class="ko"></i>fil refusé</span>' : ''}</div>`;
// le symétrique d'un module, comme on voit l'autre partie de face (fiche et embase sont symétriques par l'axe vertical)
const miroir = m => ({ ...m, contacts: m.contacts.map(c => ({ ...c, c: m.colonnes - 1 - c.c })), groupes: m.groupes.map(g => ({ ...g, contacts: g.contacts.map(c => ({ ...c, c: m.colonnes - 1 - c.c })) })) });
// ce qu'un contact pris montre sur la face : la clé de son fil, son numéro, sa couleur
const occupant = (f, ko) => { const cl = coulDeFil(f); return { i: cleFil(f.l), cable: f.cable || (f.l && f.l.origine === null ? 'neuf' : '—'), couleur: cl, couleurClaire: melanger(cl, 0.8), ko: !!ko }; };
/* Le contact à sertir, en un mot : « EN3155-003F2020 + E0718-20-30 ». */
const motSertir = st => st ? st.reference + (st.accessoire ? ' + ' + st.accessoire : '') : '';
/* Une ligne de fil : la borne (ou le contact), la route en trait, le type du fil, le contact à sertir quand il diffère
   de la nomenclature, où il va — et le numéro du fil, en retrait (le lecteur : « le nom du fil, on s'en fout un peu ;
   entre quoi et quoi, le DR20, l'intensité, voilà ce qui compte »). */
function ligneFil(ct, f, o) { o = o || {}; const k = cleFil(f.l), neuf = !!(f.l && f.l.origine === null), st = motSertir(o.sertir);
  return `<li class="fi-fil${o.ko ? ' ko' : ''}${neuf ? ' neuf' : ''}"${k ? ` data-i="${k}" tabindex="0" role="button" title="${escA((f.cable || 'fil à créer') + (f.type ? ' · ' + f.type : '') + (st ? ' · contact ' + st : '') + ' — voir sur le plan')}"` : ''}>`
    + `<span class="fi-ct">${ct}</span>${puceFil(f)}<span class="fi-type">${esc(f.type || '—')}</span><span class="fi-sertir">${esc(st)}</span>`
    + `<span class="fi-dest${f.amont ? ' amont' : ''}">${ico('fleche')}<span>${esc(o.dest != null ? o.dest : destination(f))}</span>${o.tag ? `<span class="fi-tag" title="Barrette à poser sur cette borne">${esc(o.tag)}</span>` : ''}</span>`
    + `<span class="fi-w${neuf ? ' neuf' : ''}">${neuf ? 'à créer' : esc(f.cable || '')}</span>` + (o.ko ? `<span class="fi-ko">${esc(o.ko)}</span>` : '') + '</li>'; }
const fiListe = lignes => lignes ? `<ul class="fi-liste">${lignes}</ul>` : '';
/* Les onglets : un panneau à la fois ; l'onglet ouvert se garde par bloc. Chaque onglet est une TUILE du résumé — le
   connecteur, ses contacts, son toron et son raccord — : une seule rangée dit ce qu'il y a et y mène (avant : les
   tuiles, puis une seconde rangée d'onglets pour la même chose). items [{ id, titre, compte, sous, ko, corps }] */
function fiOnglets(cle, items) { if (items.length === 1) return items[0].corps;
  const actif = items.some(x => x.id === FI.onglet[cle]) ? FI.onglet[cle] : (items.find(x => x.ko) || items[0]).id;
  return `<div class="fi-onglets fi-tuiles" role="tablist" data-cle="${escA(cle)}">${items.map(x => `<button role="tab" class="fi-tuile${x.ko ? ' ko' : ''}" data-onglet="${escA(x.id)}" data-onglet-vers="${escA(x.id)}" aria-selected="${x.id === actif}" title="${escA((x.ko ? 'À reprendre · ' : '') + 'voir ' + (x.titre === 'Autres' || x.titre === 'Fils' ? 'les fils sans connecteur' : 'le connecteur ' + x.titre))}"><b>${esc(x.titre)}</b><span>${esc(x.compte)}</span>${x.sous ? `<small>${insecable(esc(x.sous))}</small>` : ''}</button>`).join('')}</div>`
    + items.map(x => `<div class="fi-panneau" role="tabpanel" data-panneau="${escA(x.id)}"${x.id === actif ? '' : ' hidden'}>${x.corps}</div>`).join(''); }
/* Le pied : le tableau, « + fil » (une liaison de plus depuis ce repère, dans le tableau), le relief, « voir », et sous
   « ··· » ce qu'on fait rarement. */
function fiPied(o) { o = o || {};
  const boutons = [o.tableau != null ? `<button class="fi-bouton" id="fi-tableau" data-filtre="${escA(o.tableau)}" title="Ses liaisons dans le tableau">${ico('tableau')}<span>Tableau</span></button>` : '',
    o.fil ? `<button class="fi-bouton" id="fi-fil-plus" data-de="${escA(o.fil)}" title="Ajouter un fil depuis ${escA(o.fil)} : une ligne de plus dans le tableau, à remplir">${ico('plus')}<span>Fil</span></button>` : '',
    o.relief ? `<button class="fi-bouton" id="eq-relief" title="La pièce en perspective (ou double-clic sur le bloc)">${ico('relief')}<span>Relief</span></button>` : '',
    o.voir ? `<button class="fi-bouton" data-choisir-bloc="${escA(o.voir)}">${ico('voir')}<span>${esc(o.voir)}</span></button>` : ''].join('');
  const menu = (o.menu || []).map(([id, t, cls]) => `<button role="menuitem" id="${id}"${cls ? ` class="${cls}"` : ''}>${esc(t)}</button>`).join('');
  return `<footer class="fi-pied">${boutons}<span class="espace"></span>${menu ? `<div class="fi-plus"><button class="fi-x" id="fi-menu" aria-haspopup="true" aria-expanded="false" aria-label="Plus d’actions" title="Renommer, désigner, supprimer…">${ico('points')}</button><div class="fi-menu" id="fi-menu-liste" role="menu" hidden>${menu}</div></div>` : ''}</footer>`; }
const MENU_BLOC = [['fi-renommer', 'Renommer'], ['fi-designer', 'Désignation'], ['eq-del', 'Supprimer', 'danger']];
const MENU_FIL = [['fil-tableau', 'Corriger dans le tableau'], ['fil-del', 'Supprimer ce fil', 'danger']];

/* ---- la fiche ------------------------------------------------------------------ */
// ce qui identifie un bouton de la fiche d'un rendu à l'autre : ses données et son identifiant (pas son texte, qui change)
const empreinteBouton = b => b.id + '|' + JSON.stringify(Object.entries(b.dataset).sort());
function rendreFiche() { const box = $('ba-equip'), c = app.cible; if ($('inspecteur').hidden) return;
  if (!c) { if (typeof rendreIndex === 'function') rendreIndex(box); else { box.innerHTML = ''; box.dataset.cle = ''; } return; }
  const cle = c.type + '|' + (c.nom || (c.l && (c.l.cable || cleDe(c.l))) || '');
  let html; try { html = c.type === 'fil' ? ficheFil(c.l) : c.type === 'ref' ? ficheComparaison(c) : ficheBloc(c.nom); }
  catch (e) { html = fiTete({ nom: c.nom || '—', sous: 'élément' }) + `<p class="fi-note">${esc(String(e && e.message || e))}</p>`; }
  // la même fiche refaite (un choix cliqué) : le défilement reste, et le bouton qu'on vient de presser garde le focus
  const meme = box.dataset.cle === cle, haut = box.scrollTop, a = document.activeElement, presse = meme && a && a.tagName === 'BUTTON' && box.contains(a) ? empreinteBouton(a) : null;
  box.innerHTML = html; box.dataset.cle = cle; box.className = 'fi';
  if (meme) box.scrollTop = haut; else { box.scrollTop = 0; box.classList.remove('fondu'); void box.offsetWidth; box.classList.add('fondu'); }
  if (c.type === 'ref') lierComparaison(c); else lierFiche(c);
  if (presse) { const b = [...box.querySelectorAll('button')].find(x => empreinteBouton(x) === presse); if (b) { try { b.focus({ preventScroll: true }); } catch (_) { b.focus(); } } } }
function ficheBloc(nom) {
  if (VT_A_POSER.test(nom) || barretteEnModules(nom)) return ficheBarrette(nom);
  if (coupureEnModules(nom)) return ficheCoupure(nom);
  if (estBornier(nom)) return ficheBornierAncien(nom);
  return ficheEquipement(nom); }

/* ---- un fil ---------------------------------------------------------------------- */
const boutDeFil = (rep, borne, pn, via, st, sens) => `<button class="fi-bout" data-choisir-bloc="${escA(rep)}"><i class="fi-bout-k">${sens}</i><b>${esc(rep)}</b><span>borne ${esc(borne || '—')}</span>`
  + (pn ? `<small>${esc(pn)}</small>` : '') + (st ? (st.sertir ? `<small class="fi-bout-ct" title="Le contact à sertir sur ce fil, et son accessoire">${esc(motSertir(st.sertir))}</small>` : st.ko ? '<small class="fi-bout-ct ko">aucun contact pour ce fil</small>' : '') : '')
  + (via ? `<em>par ${esc(via)}</em>` : '') + '</button>';
/* Le mot « hypothèse » sur une fiche : un lien vers la fiche des hypothèses de la simulation (08, `ficheHypotheses`),
   où la valeur se règle. `lierFils` le fait agir (il survit à un rendu en place). */
const motHypothese = '<button class="fi-hyp" data-hyp="1" title="Une hypothèse de la simulation — cliquer pour la régler">hypothèse</button>';
/* LA FICHE D'UN FIL, pour celui qui le pose : d'où à où (ses deux bouts, le contact à sertir à chaque bout), puis les
   faits — le câble, ce qu'il admet, le courant qui le traverse (celui du disjoncteur en amont), la chute en ligne,
   sa longueur, son folio. Le numéro du fil est en tête : la ligne dessous dit ce qu'il est. */
function ficheFil(l) { const coul = coulDeFil({ l }), neuf = l.origine === null, jauge = jaugeDuType(l.type), st = typeof sertirDuFil === 'function' ? sertirDuFil(l) : { de: null, vers: null };
  const folios = neuf ? [app.plan] : app.nFolios ? (foliosParSource().get(cleDe(l)) || []) : (l.plan ? [l.plan] : []);
  // sur le plan, un bout peut passer par une barrette à poser : on le dit sous ce bout
  const p = neuf ? null : liaisonsDuPlan().find(x => x.origine && x.aPoser && sourceDe(x) === l);
  const via = cote => { if (!(p && VT_A_POSER.test(p[cote]))) return ''; let lettre = ''; try { const x = planDeBarrette(p[cote]).plan.fils.find(y => y.f.l === p); if (x) lettre = x.contact.lettre; } catch (_) { }
    return p[cote] + ' · ' + (lettre ? lettre + ' (borne ' + (cote === 'de' ? p.borneDe : p.borneVers) + ')' : 'borne ' + (cote === 'de' ? p.borneDe : p.borneVers)); };
  const att = [], ko = []; if (!l.type) att.push('type de fil inconnu : la jauge ne se vérifie pas');
  if (neuf) att.push('fil à créer : donne-lui son numéro en posant ' + l.aPoser + ' au contrat');
  [st.de, st.vers].forEach((s, k) => { if (s && s.ko) ko.push('aucun contact n’accepte ce fil côté ' + (k ? l.vers : l.de)); });
  const H = app.simu || HYPOTHESES, fn = l.type ? filDeNorme(app.norme, l.type, jauge) : null, cab = l.type ? cableDuType(app.norme, l.type) : null;
  // le déclassement : le faisceau est celui du repère de départ (ses fils), la charge et l'altitude de la simulation ; un conducteur qui n'est pas du cuivre déclasse encore
  const rd = l.type ? resistanceDuFil(app.norme, l.type, jauge, H.tconducteur) : { rho: null, kConducteur: 1, conducteur: 'cuivre' };
  const faisceau = neuf ? null : verite().filter(x => x.type && x.de !== x.vers && (x.de === l.de || x.vers === l.de)).length;
  const fac = fn ? facteurDeclassement(app.norme, H.conditions, { fils: faisceau, charge: H.charge, altitude: H.altitude }) * facteurAmbiante(fn, H.ambiante) * (rd.kConducteur || 1) : 1;
  if (rd.refuse) att.push('conducteur ' + rd.conducteur + ' sans résistance dans la base : la ligne cuivre de l’EN 2853 ne vaut pas, la chute n’est pas calculée');
  const adm = fn && fn.intensite != null ? [['continu', fn.intensite], ['2 s', fn.i2s], ['10 s', fn.i10s], ['1 min', fn.i1min]].filter(x => x[1] != null).map(x => [x[0], x[1] * fac]) : [];
  // le courant : celui du disjoncteur en amont, sinon l'hypothèse de la simulation
  const al = neuf ? null : alimentationDe(l), I = al && al.perm ? al.perm : H.courant, charge = adm.length && I ? I / adm[0][1] : null;
  const trop = adm.length ? (al ? al.points : [{ nom: 'hypothèse', i: I, t: Infinity }]).filter(pt => pt.i > intensiteAdmise(fn, pt.t) * fac + 1e-9) : [];
  trop.forEach(pt => ko.push(`${pt.nom} ${amperes(pt.i)}${pt.t === Infinity ? '' : ' pendant ' + secondes(pt.t)} : plus que ce que le fil admet (${amperes(intensiteAdmise(fn, pt.t) * fac)})`));
  const L = l.longueur > 0 ? l.longueur : H.longueur, dU = rd.rho != null ? rd.rho / 1000 * L * I : null;
  const chemin = al ? cheminsDepuis(verite(), al.nom).find(ch => ch.segments.some(s => s.fil === l)) : null, total = chemin ? chuteDuChemin(app.norme, chemin, I, H) : null, admise = chuteAdmise(app.norme, H.tension);
  if (total && admise && admise.chuteMax != null && total.dU > admise.chuteMax + 1e-9) ko.push(`la chute en ligne depuis ${al.nom} atteint ${volts(total.dU)} : plus que les ${volts(admise.chuteMax)} admis`);
  const brins = cab ? (cab.brins > 1 ? cab.brins + ' brins' : '1 brin') + (cab.blindage ? ' + blindage' : '') : '';
  const lignes = [
    ['câble', l.type ? `<b>${esc(l.type)}</b>${jauge != null ? ` <i>${jauge} AWG</i>` : ''}${cab ? ' · ' + esc([brins, cab.nature, cab.diametre != null ? 'Ø ' + nombre(cab.diametre) + ' mm' : '', cab.section != null ? nombre(cab.section) + ' mm²' : '', cab.resistance != null ? nombre(cab.resistance) + ' mΩ/m' : '', cab.masse != null ? nombre(cab.masse) + ' g/m' : ''].filter(Boolean).join(' · ')) : (fn && fn.resistance != null ? ' · ' + esc(nombre(fn.resistance)) + ' mΩ/m' : '')}` : '', cab ? 'La base des câbles' : 'La norme des fils (EN 2853)'],
    ['admet', adm.length ? adm.map(([q, i], k) => `${k ? '' : '<b>'}${esc(amperes(i))}${k ? '' : '</b>'} <i>${esc(q)}</i>`).join(' · ') : (l.type ? '<i>fil inconnu de la norme</i>' : ''), adm.length ? 'EN 2853, déclassé' + motFacteur(fac) + ' : ' + (H.conditions || []).join(', ') + ', ' + nombre(H.ambiante) + ' °C' + (rd.kConducteur && rd.kConducteur !== 1 ? ', conducteur ' + rd.conducteur : '') : ''],
    ['courant', I ? `<b>${esc(amperes(I))}</b> <i>${al ? 'permanent' : motHypothese}</i>${al ? ` · sous ${esc(al.nom)}${al.calibre ? ' <i>(' + esc(amperes(al.calibre)) + ')</i>' : ''}` : ''}${al && al.pointe ? ` · pointe <b>${esc(amperes(al.pointe.i))}</b> <i>pendant ${esc(secondes(al.pointe.t))}</i>` : ''}${charge != null ? ` · <span class="${charge > 1 ? 'fi-ko' : ''}">${Math.round(charge * 100)} % du continu</span>` : ''}` : '', al ? 'Le profil de charge de ' + al.nom : 'Le courant d’hypothèse de la simulation (menu → Hypothèses)'],
    ['chute', dU != null ? `<b>${volts(dU)}</b> <i>sur ce fil</i>${total ? ` · ${volts(total.dU)} <i>en ligne depuis ${esc(al.nom)}${H.tension ? ', ' + nombre(Math.round(total.dU / H.tension * 1000) / 10) + ' %' : ''}${admise && admise.chuteMax != null ? ', ' + volts(admise.chuteMax) + ' admis' : ''}</i>` : ''}` : '', dU != null ? 'ΔU = ' + nombre(arrondi(rd.rho, 1)) + ' Ω/km à ' + nombre(rd.T) + ' °C × ' + nombre(arrondi(L, 2)) + ' m × ' + nombre(I) + ' A' + (rd.source === 'câble' ? ' (la résistance du câble ' + rd.cab.cable + ')' : rd.source === 'jauge' ? ' (la jauge seule, EN 2853)' : '') : ''],
    ['longueur', `${esc(nombre(arrondi(L, 2)))} m <i>${l.longueur > 0 ? 'retest' : motHypothese}</i>`],
    ['où', [folios.length ? 'folio ' + esc(folios.join(', ')) : '', l.harness ? esc(l.harness) : ''].filter(Boolean).join(' · ')]];
  const sous = ['fil', l.type ? `<b>${esc(l.type)}</b>${jauge != null ? ' · ' + jauge + ' AWG' : ''}` : '', l.route ? `<i class="fi-route" style="--c:${coul}"></i>${esc(l.route)}` : '', l.longueur > 0 ? insecable(nombre(arrondi(l.longueur, 2)) + ' m') : ''].filter(Boolean).join(' · ');
  return fiTete({ nom: neuf ? 'à créer' : (l.cable || 'sans numéro'), etat: fiEtat(ko, att), sous })
    + `<div class="fi-trajet" style="--c:${coul}">${boutDeFil(l.de, l.borneDe, l.pnDe, via('de'), st.de, 'de')}<span class="fi-fleche"></span>${boutDeFil(l.vers, l.borneVers, l.pnVers, via('vers'), st.vers, 'vers')}</div>`
    + `<section class="fi-cadre">${faits(lignes)}</section>` + fiPied(neuf ? { voir: l.aPoser } : { tableau: l.cable || l.de, menu: MENU_FIL }); }

/* ---- autour du connecteur -------------------------------------------------------- */
/* Ce qu'on sertit, le toron, et ce qui l'englobe — le raccord, le band-it, le manchon, la gaine, avec leur référence
   quand la table la donne — par le tutoriel, selon ce qu'on choisit sous « Changer » (reprise de blindage, étanchéité,
   orientation, gaine). Le choix se garde avec le contrat. `nomen` : les contacts à sertir. */
const PUCES_RACCORD = [['blindage', 'reprise de blindage', [['NO', 'aucune'], ['GND', 'sur le corps'], ['BLI', 'par cosse'], ['CONTACT', 'sur un contact']]],
  ['etanche', 'étanchéité', [['false', 'pas requise'], ['true', 'requise']]], ['orientation', 'raccord', [['droit', 'droit'], ['coudé', 'coudé']]], ['gaine', 'gaine', [['', 'aucune'], ['HFA', 'HFA'], ['NOMEX', 'Nomex']]]];
const MOTS_BLINDAGE = { NO: 'sans reprise de blindage', GND: 'blindage repris sur le corps', BLI: 'blindage repris par cosse', CONTACT: 'blindage repris sur un contact' };
// le toron et le raccord d'un connecteur, en deux mots (pour les tuiles)
function habitDe(cle, fils, pn, ref) { if (!fils.length) return null; const h = habillage(app.norme, fils, app.contrat.raccords.get(cle), pn, ref);
  return { toron: h.faisceau.diametre != null ? 'Ø ' + mm(h.faisceau.diametre) + ' mm' : '', raccord: h.raccord === 'aucun' ? 'sans raccord' : h.raccord, h }; }
function autourHtml(cle, fils, pn, nomen, titre, ref) { if (!fils.length) return ''; const h = habillage(app.norme, fils, app.contrat.raccords.get(cle), pn, ref), c = h.choix, f = h.faisceau;
  const sertir = nomen && nomen.length ? nomen.map(x => `<b>${x.n}×</b> ${esc(x.reference)}${x.accessoire ? ` <i>+ ${esc(x.accessoire)}</i>` : ''}`).join(' · ') : '';
  const toron = f.diametre != null ? `<b>Ø ${esc(mm(f.diametre))} mm</b>${f.complet ? '' : ' <i>?</i>'} · ${f.n} ${f.n > 1 ? 'câbles' : 'câble'}${f.masse > 0 ? ' · ' + esc(mm(f.masse)) + ' g/m' : ''}${f.inconnus.length ? ` <i class="fi-ko">${esc(f.inconnus.join(', '))} : inconnu de la base</i>` : ''}` : (f.inconnus.length ? `<i class="fi-ko">${esc(f.inconnus.join(', '))} : inconnu de la base</i>` : '');
  const aConfirmer = (t, titre) => `<i class="fi-avenir" title="${escA(titre || 'La désignation complète n’est pas encore dans la table Raccords de la norme')}">${esc(t)}</i>`, R = h.reference;
  // le raccord : son type, la norme EN 3660 du style (la désignation complète quand la table l'a), son code d'entrée pour un serre-câble
  // sans raccord (EN 4165, EN 3645) : le moteur le dit en une phrase, rien d'autre ne se calcule (ni band-it, ni manchon, ni gaine)
  const raccord = h.sansRaccord ? `<i>${esc(h.pourquoi)}</i>${h.aConfirmer ? ' ' + aConfirmer('à confirmer', 'Une règle d’atelier du tutoriel — l’EN 3660-020 existe pour l’EN 3645 : à confirmer par le lecteur') : ''}` : h.raccord === 'tyrap' ? `<b>tyrap</b>${h.tyrap ? ' · ' + esc(h.tyrap.reference) + (h.tyrap.longueur ? ` <i>${esc(nombre(h.tyrap.longueur))} mm</i>` : '') : ''}`
    : `<b>${esc(h.raccord)}</b>${R ? ' · ' + (R.reference ? `<b>${esc(R.reference)}</b>` : esc(R.norme) + ' ' + aConfirmer(R.statut || 'à confirmer')) + (R.materiau ? ` <i>${esc([R.materiau, R.fini].filter(Boolean).join(' '))}</i>` : '') : ' ' + aConfirmer('référence à venir')}${h.entree ? ` · entrée <b>${esc(h.entree.code)}</b> <i>${esc(nombre(h.entree.dmin))}–${esc(nombre(h.entree.dmax))} mm</i>` : ''}`;
  const boitier = h.taille ? `<b>${esc(h.taille)}</b>${h.filetage ? ` · ${esc(h.filetage.filetage)}${h.filetage.lettre ? ' <i>(' + esc(h.filetage.lettre) + ')' + '</i>' : ''}${h.filetage.dmaxBoitier != null ? ` · Ø ${esc(nombre(h.filetage.dmaxBoitier))} mm` : ''}` : ''}` : '';
  const M = h.manchonRef, manchon = h.manchon ? (M ? `<b>${esc(M.designation)}</b>${M.reference ? ` · ${esc(M.reference)}` : ''} <i>toron ${esc(nombre(M.jb != null ? M.jb : 0))}–${esc(nombre(M.ja))} mm${M.p ? ' · ' + esc(nombre(M.p)) + ' mm' : ''}</i>` : `<i class="fi-ko">aucun manchon de la table ne va à Ø ${esc(mm(h.sortie || 0))} mm</i>`) : '';
  const G = h.gaine, gaine = c.gaine ? (G ? `<b>${esc(G.reference)}</b> <i>${G.role === 'surblindage' ? 'surblindage · Ø int. ' + esc(nombre(G.dint)) + (G.dext != null ? ' · ext. ' + esc(nombre(G.dext)) : '') + ' mm' : 'protection · toron ' + esc(nombre(G.dmin)) + '–' + esc(nombre(G.dmax)) + ' mm'}${G.masse != null ? ' · ' + esc(nombre(G.masse)) + ' g/m' : ''}</i>` : `<i class="fi-ko">aucune gaine ${esc(c.gaine)} ne va à ce toron</i>`) : '';
  const lignes = [['à sertir', sertir], ['toron', toron, f.diametre != null ? 'La section cumulée des câbles, en rond, plus 10 % (le tutoriel)' : ''],
    ['boîtier', boitier, 'La taille du boîtier, lue dans le part number, et le filetage de ses accessoires'],
    ['raccord', raccord, h.pourquoi]].concat(h.sansRaccord ? [] : [
    ['band-it', h.bandit ? (h.collier ? `<b>${esc(h.collier.reference)}</b>${h.collier.dmax != null ? ` <i>jusqu’à Ø ${esc(nombre(h.collier.dmax))} mm</i>` : ''}` : '<i class="fi-ko">aucun collier ne va à ce toron</i>') : '', 'Le collier qui tient la tresse ou la gaine'],
    ['manchon', manchon, 'L’étanchéité demande un manchon : Ja > ce qui sort du raccord > Jb (VG 95343)'],
    ['gaine', gaine, G && G.role === 'surblindage' ? 'La plus petite tresse dont l’intérieur passe le toron' : 'La gaine dont la plage encadre le toron'],
    ['manque', h.manquants.length ? h.manquants.map(m => `<i class="fi-avenir fi-long">${esc(m)}</i>`).join('<br>') : '', 'Ce que la norme ne dit pas encore : à compléter dans la table']]);
  const choix = [MOTS_BLINDAGE[c.blindage] || MOTS_BLINDAGE.NO, c.etanche ? 'zone étanche' : 'pas d’étanchéité', c.orientation === 'coudé' ? 'coudé' : 'droit', c.gaine ? 'gaine ' + c.gaine : 'sans gaine'].join(' · ');
  const segments = PUCES_RACCORD.map(([champ, t, opts]) => `<div class="fi-seg">${voletT(t)}<div class="fi-puces">${opts.map(([v, m]) => `<button class="fi-chip" data-raccord="${escA(cle)}" data-champ="${champ}" data-v="${escA(v)}" aria-pressed="${String(c[champ]) === v}">${esc(m)}</button>`).join('')}</div></div>`).join('');
  const k = 'rac|' + cle;
  // la ligne de titre : le mot, les choix du tutoriel en une ligne (coupée s'il le faut, entière au survol), « Changer »
  return `<div class="fi-autour"><div class="fi-ref-ligne fi-habillage"><span class="fi-nomen-t">${esc(titre || 'autour')}</span><span class="fi-choix" title="${escA(choix + ' — ' + h.pourquoi)}">${esc(choix)}</span><button class="fi-lien" data-changer="${escA(k)}" aria-expanded="${!!FI.change[k]}">Changer${ico('bas', 'fi-chevron')}</button></div>`
    + `<div class="fi-changer" data-volet="${escA(k)}"${FI.change[k] ? '' : ' hidden'}>${segments}<p class="fi-note">${esc(h.pourquoi[0].toUpperCase() + h.pourquoi.slice(1))}.</p></div>${faits(lignes, 'serre')}</div>`; }

/* ---- une barrette (et une barrette à poser) ------------------------------------- */
function ficheBarrette(nom) { const aPoser = VT_A_POSER.test(nom), L = liaisonsDeRepere(nom);
  const { besoins: b, plan: Q, main } = planDeBarrette(nom), M0 = Q.modules[0], nomF = f => nomDeFamille(app.norme, f);
  const refuses = Q.fils.filter(x => x.jaugeOk === false);
  const ko = [...Q.verdicts.filter(v => v.niveau === 'ko').map(v => v.texte), ...refuses.map(x => `${x.f.cable || 'fil à créer'} (${x.f.type}) : jauge refusée par le contact ${x.contact.lettre}`)];
  // la barrette à poser : la borne qu'elle dédouble
  const raccord = aPoser ? L.find(l => l.aPoser === nom && l.origine === null && l.vers === nom && l.borneVers === '1') : null, sur = raccord ? raccord.de + ':' + raccord.borneDe : '';
  const etat = aPoser ? fiEtat(ko, ['repère provisoire : écris le vrai repère en tête de fiche, la barrette entre au contrat']) : fiEtat(ko, []);
  const sous = aPoser ? `barrette à poser sur <b>${esc(sur)}</b>` : ['barrette', Q.reference ? `<b>${esc(Q.reference)}</b>` : '', pluriel(Q.potentiels, 'potentiel'), pluriel(Q.fils.length, 'fil')].filter(Boolean).join(' · ');
  const pnNorme = b.pn && familleDeReference(app.norme, b.pn);
  const pourquoi = main ? 'choisi à la main' : !Q.modules.length ? 'aucun module ne loge ces fils' : (Q.main ? 'norme choisie à la main · ' : pnNorme ? 'la norme du part number · ' : '')
    + (Q.modules.length > 1 ? `${Q.potentiels} potentiels sur ${Q.modules.length} modules` : `le plus petit module qui loge ${pluriel(Q.potentiels, 'potentiel')}`);
  // le résumé : les potentiels, les fils, ce qui reste libre
  const groupes = Q.modules.reduce((n, M) => n + M.module.groupes.length, 0), libres = Q.contacts - Q.utilises;
  const resume = aPoser || !M0 ? '' : tuiles([[String(Q.potentiels), pluriel(Q.potentiels, 'potentiel').replace(/^\d+ /, ''), `sur ${pluriel(groupes, 'groupe')}`], [String(Q.fils.length), Q.fils.length > 1 ? 'fils' : 'fil', `sur ${pluriel(Q.contacts, 'contact')}`],
    [String(libres), libres > 1 ? 'libres' : 'libre', `${pluriel(groupes - Q.places, 'groupe')} libre${s_(groupes - Q.places)}`]]);
  const par = new Map(); Q.fils.forEach(x => par.set(x.module + '|' + x.contact.lettre, x));
  const faces = Q.modules.map((M, k) => faceAjustee(faceModuleSvg(M.module, ct => { const x = par.get(k + '|' + ct.lettre); return x ? occupant(x.f, x.jaugeOk === false) : null; }, { etiquettes: true }),
    Q.modules.length > 1 ? (k + 1) + ' · ' + M.reference : '')).join('');
  // changer : la norme, puis une variante d'un seul module
  const cle = 'bar|' + nom, fs = Q.famille ? [Q.famille] : famillesDeModules(app.norme), retenu = M0 && (main || Q.modules.length === 1) ? M0.reference : '';
  const cands = fs.map(f => variantesQuiLogent(b, app.norme, f).slice(0, 6)).flat().map(m => candidat(nom, m, retenu)).join('');
  const changer = aPoser ? '' : voletT('norme') + puces('data-norme-barrette', [['', 'Automatique'], ...famillesDeModules(app.norme).map(f => [f, nomF(f)])], main ? null : Q.main ? Q.famille : '')
    + voletT('variante') + (cands ? `<div class="fi-cands">${cands}</div>` : '<p class="fi-note">Aucune variante ne loge la barrette d’un seul module.</p>')
    + liens([main ? `<button class="fi-lien" data-auto="${escA(nom)}">Choix automatique</button>` : '', M0 ? `<button class="fi-lien" data-bible="${escA(M0.reference)}">Bible</button>` : '']);
  // les fils : par potentiel (les bornes reliées), la borne d'abord, le contact en petit
  const borneDe = f => f.borneBarrette || (f.l && (f.l.de === nom ? f.l.borneDe : f.l.borneVers)) || '';
  const tri = Q.fils.slice().sort((a, c) => a.module - c.module || a.groupe.k - c.groupe.k || triBornes(borneDe(a.f), borneDe(c.f)));
  let dernier = null, lignes = '';
  tri.forEach(x => { const pot = x.potentiel.bornes.join(' · ');
    if (!aPoser && Q.potentiels > 1 && pot !== dernier) { lignes += `<li class="fi-groupe">${x.potentiel.bornes.length > 1 ? 'bornes' : 'borne'} ${esc(pot)} <i>· ${esc(x.groupe.nom)}</i></li>`; dernier = pot; }
    lignes += ligneFil(`<b>${esc(borneDe(x.f))}</b><i>${esc((Q.modules.length > 1 ? (x.module + 1) + '·' : '') + x.contact.lettre)}</i>`, x.f, { ko: x.jaugeOk === false ? 'jauge refusée par le contact' : '' }); });
  (Q.restants || []).forEach(p => p.fils.forEach(f => { lignes += ligneFil(`<b>${esc(borneDe(f))}</b>`, f, { ko: 'sans place dans le module' }); }));
  return fiTete({ nom, renommer: true, aide: aPoser ? 'Écrire le vrai repère : la barrette entre au contrat' : '', etat, sous, designation: aPoser ? null : app.contrat.designations.get(nom) || '' }) + resume
    + `<section class="fi-cadre">${fiRef(Q.reference || (aPoser ? 'à choisir' : '—'), Q.famille, cle, changer, pourquoi)}${faces ? `<div class="fi-faces">${faces}</div>${legendeFaces(refuses.length)}` : ''}${fiListe(lignes)}</section>`
    + (aPoser ? '' : dejaFaitHtml(nom)) + fiPied(aPoser ? { voir: raccord && raccord.de, relief: !!M0, menu: [['fi-renommer', 'Nommer et poser au contrat']] } : { tableau: nom, fil: nom, relief: true, menu: MENU_BLOC }); }

/* ---- une prise de coupure -------------------------------------------------------- */
function ficheCoupure(nom) { const { besoins: b, points, plan: Q } = planDeCoupure(nom), M = Q.modules[0], nomF = f => nomDeFamille(app.norme, f);
  const ko = Q.verdicts.filter(v => v.niveau === 'ko').map(v => v.texte), att = Q.verdicts.filter(v => v.niveau === 'attention').map(v => v.texte);
  const nums = points.map(p => p.num).join(', '), types = typesDe(Q.fils.map(x => x.f)), refuses = Q.fils.some(x => x.jaugeOk === false);
  const pourquoi = Q.main ? 'choisi à la main' : Q.nomme ? `le part number du fichier (${b.pn}) nomme cet arrangement` : !M ? 'aucun arrangement ne loge ces contacts avec ces jauges'
    : `le plus petit arrangement qui a les contacts ${nums} et accepte ${types || 'ces fils'}`;
  const amont = Q.fils.filter(x => x.f.amont), aval = Q.fils.filter(x => !x.f.amont), hF = habitDe(nom + '|fiche', amont.map(x => x.f), b.pn, Q.reference), hE = habitDe(nom + '|embase', aval.map(x => x.f), b.pn, Q.reference);
  const resume = tuiles([[String(points.length), pluriel(points.length, 'contact').replace(/^\d+ /, ''), M ? `sur ${M.module.contacts.length} · ${M.module.contacts.length - Q.utilises} libre${s_(M.module.contacts.length - Q.utilises)}` : ''],
    [String(amont.length), 'fiche', hF ? [hF.toron, hF.raccord].filter(Boolean).join(' · ') : 'ce qui arrive'], [String(aval.length), 'embase', hE ? [hE.toron, hE.raccord].filter(Boolean).join(' · ') : 'ce qui repart']]);
  let faces = '';
  if (M) { const par = (am, ct) => { const xs = Q.fils.filter(x => x.contact === ct && !!x.f.amont === am); return xs.length ? occupant(xs[0].f, xs.some(x => x.jaugeOk === false)) : null; };
    faces = `<div class="fi-faces deux">${faceAjustee(faceModuleSvg(M.module, ct => par(true, ct), { etiquettes: true }), 'Fiche · ce qui arrive')}`
      + `${faceAjustee(faceModuleSvg(miroir(M.module), ct => par(false, M.module.contacts.find(k => k.lettre === ct.lettre)), { etiquettes: true }), 'Embase · ce qui repart')}</div>` + legendeFaces(refuses); }
  const unSeul = xs => { const n = nomenclatureDe(xs); return n.length === 1 ? motSertir(n[0]) : ''; }, seulF = unSeul(amont), seulE = unSeul(aval);
  const cote = x => x ? `<span class="fi-cote" data-i="${cleFil(x.f.l)}" tabindex="0" role="button"${x.sertir ? ` title="${escA('contact ' + motSertir(x.sertir))}"` : ''}>${puceFil(x.f)}<b>${esc(destination(x.f))}</b><small>${esc(x.f.type || '')}${x.f.cable ? ' · ' + esc(x.f.cable) : ''}${x.sertir && motSertir(x.sertir) !== (x.f.amont ? seulF : seulE) ? ' · ' + esc(motSertir(x.sertir)) : ''}</small></span>` : '<span class="fi-cote vide">—</span>';
  const lignes = (M ? M.module.contacts : []).map(ct => { const am = Q.fils.find(x => x.contact === ct && x.f.amont), av = Q.fils.find(x => x.contact === ct && !x.f.amont); if (!am && !av) return '';
    return `<li class="fi-paire${[am, av].some(x => x && x.jaugeOk === false) ? ' ko' : ''}"><span class="fi-ct"><b>${esc(ct.lettre)}</b></span>${cote(am)}<span class="fi-entre" aria-hidden="true"></span>${cote(av)}</li>`; }).join('');
  const cle = 'cou|' + nom, vs = arrangementsQuiLogent(points, app.norme, Q.visee || Q.famille).slice(0, 6), retenu = M ? M.reference : '';
  const changer = (Q.tableContacts ? pucesSexe(nom, Q.sexe, true) : '') + voletT('norme') + puces('data-norme-prise', [['', 'Automatique'], ...famillesDeModules(app.norme, 'connecteur').map(f => [f, nomF(f)])], Q.main ? null : (Q.visee || ''))
    + voletT('arrangement') + (vs.length ? `<div class="fi-cands">${vs.map(m => candidat(nom, m, retenu)).join('')}</div>` : '<p class="fi-note">Aucun arrangement de cette norme ne convient.</p>')
    + liens([Q.main ? `<button class="fi-lien" data-auto="${escA(nom)}">Choix automatique</button>` : '', M ? `<button class="fi-lien" data-bible="${escA(M.reference)}">Bible</button>` : '']);
  const sous = ['prise de coupure', Q.reference ? `<b>${esc(Q.reference)}</b>` : '', pluriel(points.length, 'contact'), pluriel(Q.fils.length, 'fil')].filter(Boolean).join(' · ');
  return fiTete({ nom, renommer: true, etat: fiEtat(ko, att), sous, designation: app.contrat.designations.get(nom) || '' }) + resume
    + `<section class="fi-cadre">${fiRef(Q.reference, Q.famille, cle, changer, pourquoi)}${faces}`
    + autourHtml(nom + '|fiche', amont.map(x => x.f), b.pn, nomenclatureDe(amont), 'fiche', Q.reference)
    + autourHtml(nom + '|embase', aval.map(x => x.f), b.pn, nomenclatureDe(aval), 'embase', Q.reference)
    + (lignes ? `<div class="fi-paires-tete"><span></span><span>fiche · arrive</span><span></span><span>embase · repart</span></div><ul class="fi-liste paires">${lignes}</ul>` : '') + '</section>'
    + dejaFaitHtml(nom) + fiPied({ tableau: nom, fil: nom, relief: true, menu: MENU_BLOC }); }

/* ---- un équipement --------------------------------------------------------------- */
function ficheEquipement(nom) { const V = verite(), b = besoinsDeBarrette(nom, V);
  const C = connecteursDe(nom, V).filter(c => c.nom), cav = cavitesDe(nom), parNom = new Map(cav.map(c => [c.nom, c]));
  // une borne qui porte plusieurs fils : une barrette à poser (VT1… sur ce folio)
  const vt = new Map(); liaisonsDuPlan().forEach(l => { if (l.origine === null && l.de === nom && l.vers === l.aPoser && l.borneVers === '1') vt.set(String(l.borneDe), l.aPoser); });
  const doubles = [...b.parBorne].filter(([, fs]) => fs.length > 1);
  const ko = cav.flatMap(c => c.plan.verdicts.filter(v => v.niveau === 'ko').map(v => c.nom + ' · ' + v.texte));
  const att = [...doubles.map(([bo, fs]) => `borne ${bo} : ${fs.length} fils — ${vt.has(String(bo)) ? 'barrette ' + vt.get(String(bo)) : 'une barrette'} à poser`),
    ...cav.flatMap(c => c.plan.verdicts.filter(v => v.niveau === 'attention' && !/contact .* : \d fils/.test(v.texte)).map(v => c.nom + ' · ' + v.texte))];
  // un disjoncteur : son calibre et le profil de charge, jugés sur la courbe de disjonction
  const dj = estDisjoncteur(nom); if (dj) controleDisjonction(nom).forEach(x => (x.niveau === 'ko' ? ko : att).push(x.texte));
  const ligne = (bo, f, st) => ligneFil(`<b>${esc(bo)}</b>`, f, { tag: vt.get(String(bo)), sertir: st });
  const filsDe = c => c.bornes.flatMap(bo => b.parBorne.get(bo) || []), refDe = c => { const k = parNom.get(c.nom); return k && k.plan && k.plan.modules[0] ? k.plan.modules[0].reference : ''; }, habits = new Map(C.map(c => [c.nom, habitDe(nom + '|' + c.nom, filsDe(c).filter(f => f.l), c.pn, refDe(c))]));
  const onglets = C.map(c => { const k = parNom.get(c.nom), Q = k && k.plan, M = Q && Q.modules[0], cle = 'arr|' + nom + '|' + c.nom, h = habits.get(c.nom);
    const sertir = new Map(Q ? Q.fils.map(x => [x.f.l, x.sertir]) : []), seul = Q && Q.nomenclature && Q.nomenclature.length === 1 ? motSertir(Q.nomenclature[0]) : '';
    // un disjoncteur a déjà ses fils, jugés, dans sa disjonction : son connecteur ne les répète pas
    const fils = dj ? '' : c.bornes.slice().sort(triNaturel).flatMap(bo => (b.parBorne.get(bo) || []).map(f => { const st = sertir.get(f.l); return ligne(bo, f, st && motSertir(st) === seul ? null : st); })).join('');
    let corps = '';
    if (M) { const pourquoi = (c.pn ? c.pn + ' — ' : '') + (Q.main ? 'choisi à la main' : Q.nomme ? 'le part number le nomme' : 'le plus petit qui a ces contacts et ces jauges'), refuses = Q.fils.some(x => x.jaugeOk === false);
      const par = new Map(Q.fils.map(x => [x.contact.lettre, x])), vs = arrangementsQuiLogent(k.points, app.norme, Q.famille).slice(0, 5);
      const changer = (Q.tableContacts ? pucesSexe(nom + '|' + c.nom, Q.sexe, false) : '') + voletT('arrangement') + (vs.length ? `<div class="fi-cands">${vs.map(m => candidat(nom + '|' + c.nom, m, M.reference)).join('')}</div>` : '<p class="fi-note">Aucun autre arrangement ne loge ces bornes.</p>') + liens([Q.main ? `<button class="fi-lien" data-auto="${escA(nom + '|' + c.nom)}">Choix automatique</button>` : '']);
      corps = fiRef(M.reference, M.module.famille, cle, changer, pourquoi)
        + faceAjustee(faceModuleSvg(M.module, ct => { const x = par.get(ct.lettre); return x ? occupant(x.f, x.jaugeOk === false) : null; }, { etiquettes: true })) + legendeFaces(refuses); }
    else if (Q) { // une cavité d'une norme connue, mais aucun arrangement ne loge ces bornes : on le dit, et on laisse changer la norme ou le sexe
      const table = (normeDesModules(app.norme).contacts || []).some(x => x.famille === Q.famille);   // la norme juge par sa table de contacts : le sexe compte
      const changer = (table ? pucesSexe(nom + '|' + c.nom, Q.sexe, false) : '') + `<p class="fi-note">${esc(Q.verdicts.filter(v => v.niveau === 'ko').map(v => v.texte).join(' ; ') || 'Aucun arrangement ne convient.')}</p>` + liens([Q.main ? `<button class="fi-lien" data-auto="${escA(nom + '|' + c.nom)}">Choix automatique</button>` : '']);
      corps = fiRef('aucun arrangement', Q.famille, cle, changer, c.pn || ''); }   // l'état en tête dit déjà pourquoi : on ne le répète pas
    else corps = `<div class="fi-ref-ligne"><span class="fi-ct"><b>${esc(c.nom)}</b></span><div class="min0"><b class="fi-ref${c.pn ? '' : ' vide'}">${esc(c.pn || 'sans part number')}</b>${c.pn && !dj ? '<small class="fi-pourquoi">connecteur hors des normes embarquées — pas de face</small>' : ''}</div></div>`;
    const fsc = autourHtml(nom + '|' + c.nom, filsDe(c), c.pn, Q ? Q.nomenclature : null, '', refDe(c));
    // l'onglet est une tuile : le connecteur, ses contacts, son toron et son raccord
    return { id: c.nom, titre: c.nom, compte: pluriel(c.bornes.length, 'contact'), sous: h ? [h.toron, h.raccord].filter(Boolean).join(' · ') : (c.pn || ''), ko: ko.some(t => t.startsWith(c.nom + ' · ')), corps: `<section class="fi-cadre">${corps}${fsc}${fiListe(fils)}</section>` }; });
  // les bornes sans connecteur
  const sans = [...b.parBorne].filter(([bo]) => !C.some(c => c.bornes.includes(bo))).sort((u, v) => triNaturel(u[0], v[0])).flatMap(([bo, fs]) => fs.map(f => ligne(bo, f))).join('');
  const nSans = b.parBorne.size - C.reduce((n, c) => n + c.bornes.length, 0);
  if (sans) onglets.push({ id: '—', titre: C.length ? 'Autres' : 'Fils', compte: pluriel(nSans, 'fil'), sous: C.length ? 'sans connecteur' : '', corps: `<section class="fi-cadre">${fiListe(sans)}</section>` });
  const nFils = V.filter(l => l.de === nom || l.vers === nom).length, pns = [...new Set(C.map(c => c.pn).filter(Boolean))], cal = dj ? calibreDe(nom) : null;
  const sous = dj ? ['disjoncteur', cal ? `<b>${esc(amperes(cal))}</b>` : '', pns.length === 1 ? esc(pns[0]) : '', pluriel(nFils, 'fil')].filter(Boolean).join(' · ')
    : ['équipement', pluriel(nFils, 'fil'), C.length > 1 ? pluriel(C.length, 'connecteur') : '', pns.length === 1 ? `<b>${esc(pns[0])}</b>` : ''].filter(Boolean).join(' · ');
  // un seul connecteur : son cadre est là, sous les yeux — pas de résumé qui le répète ; plusieurs : les onglets-tuiles
  return fiTete({ nom, renommer: true, etat: fiEtat(ko, att), sous, designation: app.contrat.designations.get(nom) || '' })
    + (dj ? ficheDisjonction(nom, vt) : '') + (onglets.length ? fiOnglets('eq|' + nom, onglets) : '') + dejaFaitHtml(nom)
    + fiPied({ tableau: nom, fil: nom, relief: cav.length > 0, menu: MENU_BLOC }); }

/* ---- un bornier hors modules (une bible importée sans modules) ------------------- */
function ficheBornierAncien(nom) { const V = verite(), b = besoinsDeBarrette(nom, V);
  const P = remplirSelonNorme(physiqueDeBarrette(nom, V, app.bible, app.contrat.designations.get(nom) || ''), app.norme);
  return fiTete({ nom, renommer: true, sous: estCoupure(nom) ? 'prise de coupure' : 'barrette', designation: app.contrat.designations.get(nom) || '' })
    + `<div class="equip">${cartePhysique(nom, P, b)}</div>` + fiPied({ tableau: nom, relief: true, menu: MENU_BLOC }); }

/* ---- les gestes ------------------------------------------------------------------- */
function lierFiche(c) { const box = $('ba-equip'), nom = c.type === 'fil' ? '' : c.nom;
  $('in-fermer').onclick = () => deselectionner();
  const ret = $('fi-retour'); if (ret) ret.onclick = () => retourIndex();
  const tab = $('fi-tableau'); if (tab) tab.onclick = () => { app.base.filtre = tab.dataset.filtre; app.base.filtreAuto = false; app.base.portee = 'tout'; app.base.defiler = true; if (app.base.ouvert) rendreBase(); else ouvrirBase(); };
  box.querySelectorAll('[data-choisir-bloc]').forEach(b => b.onclick = () => { const n = b.dataset.choisirBloc, k = ((app.dessin && app.dessin.comps) || []).find(x => x.name === n && x.kind !== 'tag');
    const vt = k ? null : barretteAPoser(n); if (k) choisirBloc(k); else if (vt) choisirBarretteAPoser(vt); else { app.cible = { type: 'bloc', nom: n }; rendreFiche(); } viser(n); });
  // les onglets : on montre un autre panneau, rien ne se refait ; une tuile du résumé y mène aussi
  const montrer = (t, id) => { FI.onglet[t.dataset.cle] = id; t.querySelectorAll('[data-onglet]').forEach(x => x.setAttribute('aria-selected', String(x.dataset.onglet === id)));
    box.querySelectorAll('[data-panneau]').forEach(p => { p.hidden = p.dataset.panneau !== id; }); };
  box.querySelectorAll('.fi-onglets').forEach(t => t.addEventListener('click', e => { const b = e.target.closest('[data-onglet]'); if (b) montrer(t, b.dataset.onglet); }));
  box.querySelectorAll('[data-onglet-vers]').forEach(b => b.onclick = () => { const t = box.querySelector('.fi-onglets'); if (t) { montrer(t, b.dataset.ongletVers); t.scrollIntoView({ block: 'nearest' }); } });
  box.querySelectorAll('[data-changer]').forEach(b => b.onclick = () => { const k = b.dataset.changer, v = box.querySelector(`[data-volet="${CSS.escape(k)}"]`); if (!v) return;
    v.hidden = !v.hidden; FI.change[k] = !v.hidden; b.setAttribute('aria-expanded', String(!v.hidden)); });
  // le menu « ··· »
  const menu = $('fi-menu'), liste = $('fi-menu-liste');
  if (menu) { const ouvrir = o => { liste.hidden = !o; menu.setAttribute('aria-expanded', String(o)); };
    menu.onclick = e => { e.stopPropagation(); ouvrir(liste.hidden); };
    liste.addEventListener('click', () => ouvrir(false));
    box.addEventListener('pointerdown', e => { if (!liste.hidden && !e.target.closest('.fi-plus')) ouvrir(false); }, true); }
  box.querySelectorAll('input').forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } else if (e.key === 'Escape') { e.stopPropagation(); el.value = el.defaultValue; el.blur(); } }));
  lierFils(box);
  // un fil de plus depuis ce repère : une ligne neuve dans le tableau, le curseur sur « vers »
  const plus = $('fi-fil-plus'); if (plus) plus.onclick = () => { if (!app.base.ouvert) ouvrirBase(); ajouterLiaison(plus.dataset.de); };
  if (!nom) { const l = c.l, i = verite().indexOf(l);
    if ($('fil-tableau')) $('fil-tableau').onclick = () => { app.base.filtre = l.cable || l.de; app.base.filtreAuto = false; app.base.portee = 'tout'; app.base.defiler = true; if (app.base.ouvert) rendreBase(); else ouvrirBase(); };
    if ($('fil-del')) $('fil-del').onclick = () => { if (i < 0 || !confirm('Supprimer le fil ' + (l.cable || '') + ' entre ' + l.de + ' et ' + l.vers + ' ?')) return; supprimerLiaison(i); deselectionner(); dire('Fil supprimé.'); };
    return; }
  const rep = $('eq-rep'); if (rep) rep.addEventListener('change', e => { const nr = e.target.value.trim(); if (!nr || nr === nom) { e.target.value = nom; return; }
    if (VT_A_POSER.test(nom)) { if (!poserBarrette(nom, nr)) e.target.value = nom; return; }
    histPush('renommage de ' + nom); renommer(nom, nr); app.choisi = nr; app.cible = { type: 'bloc', nom: nr }; if (app.base.filtre === nom) app.base.filtre = nr; apresEdition(); });
  const des = $('eq-des'); if (des) { des.addEventListener('change', e => { histPush('désignation de ' + nom); designer(nom, e.target.value.trim()); apresEdition(); });
    des.addEventListener('blur', () => { if (!des.value.trim()) des.hidden = true; }); }
  if ($('fi-renommer')) $('fi-renommer').onclick = () => { if (rep) { rep.focus(); rep.select(); } };
  if ($('fi-designer')) $('fi-designer').onclick = () => { if (des) { des.hidden = false; des.focus(); } };
  if ($('eq-del')) $('eq-del').onclick = () => { const n = verite().filter(l => l.de === nom || l.vers === nom).length; if (!confirm('Supprimer « ' + nom + ' » et ses ' + n + ' liaison(s) ?')) return;
    histPush('suppression de ' + nom); supprimerEquipement(nom); app.base.filtre = ''; deselectionner(); apresEdition(); dire(nom + ' supprimé.'); };
  if ($('eq-relief')) $('eq-relief').onclick = () => ouvrirRelief(nom);
  // les choix : une norme, une variante, un arrangement, le retour à l'automatique
  const choisir = (cle, d, quoi, mot) => { histPush(quoi); designer(cle, d); apresEdition(); if (mot) dire(mot); };
  box.querySelectorAll('[data-norme-barrette]').forEach(b => b.onclick = () => choisir(nom, b.dataset.normeBarrette, 'norme de ' + nom));
  box.querySelectorAll('[data-norme-prise]').forEach(b => b.onclick = () => choisir(nom, b.dataset.normePrise, 'norme de ' + nom));
  box.querySelectorAll('.cand[data-cle]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') !== 'true') choisir(b.dataset.cle, b.dataset.ref, 'choix de ' + b.dataset.cle, b.dataset.ref + ' retenu.'); });
  box.querySelectorAll('[data-auto]').forEach(b => b.onclick = () => choisir(b.dataset.auto, '', 'choix automatique', 'Choix automatique rétabli.'));
  // « Déjà fait » : une ligne ouvre la comparaison (seulement elles : une variante `.cand` porte aussi un data-ref)
  box.querySelectorAll('.fi-cand[data-ref]').forEach(b => { const aller = () => { app.cible = { type: 'ref', nom, harness: b.dataset.ref, repere: b.dataset.rep }; rendreFiche(); }; b.onclick = aller; b.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aller(); } }; });
  box.querySelectorAll('[data-raccord]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return; const k = b.dataset.raccord, v = b.dataset.v;
    histPush('raccord de ' + k); const o = { ...(app.contrat.raccords.get(k) || {}) }; o[b.dataset.champ] = v === 'true' ? true : v === 'false' ? false : v; app.contrat.raccords.set(k, o); FI.change['rac|' + k] = true; apresEdition(); });
  box.querySelectorAll('[data-sexe]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') === 'true') return;
    histPush('sexe des contacts de ' + b.dataset.sexe); app.contrat.sexes.set(b.dataset.sexe, b.dataset.v); apresEdition(); });
  box.querySelectorAll('[data-bible]').forEach(b => b.onclick = () => ficheBible(b.dataset.bible));
  if (box.querySelector('.equip') && typeof lierCartePhysique === 'function') lierCartePhysique(nom);
  lierDisjonction(nom); }
/* Les fils de la fiche et le plan : survoler une ligne (ou un contact de la face) allume le fil et marque tout ce qui
   le montre dans la fiche ; un clic ou Entrée va le voir sur le plan. */
function lierFils(box) { let dernier = null;
  const cible = t => t && t.closest && t.closest('.fi-fil[data-i], .fi-cote[data-i], .mj-contact.plein');
  const marquer = el => { const k = el.dataset.i; box.querySelectorAll('.vise').forEach(x => x.classList.remove('vise'));
    if (!k) return; box.querySelectorAll(`[data-i="${CSS.escape(k)}"]`).forEach(x => x.classList.add('vise')); allumerCle(k); };
  const lacher = () => { dernier = null; box.querySelectorAll('.vise').forEach(x => x.classList.remove('vise')); rallumer(); };
  const voir = el => { const k = el.dataset.i; if (!k) return; if (k[0] !== 'p') { voirFilDeCarte(+k); return; }
    const w = filDeCle(k); if (w) { allumerFil(w); viserFil(w); } else { const l = liaisonsDuPlan()[+k.slice(1)]; if (l && l.aPoser) viser(l.aPoser); } };
  box.onmouseover = e => { const el = cible(e.target); if (!el || el === dernier) return; dernier = el; marquer(el); };
  box.onmouseout = e => { if (!dernier) return; const vers = cible(e.relatedTarget); if (vers) return; lacher(); };
  // le mot « hypothèse » (fiche d'un fil, chutes d'un disjoncteur) ouvre la fiche des hypothèses
  box.onclick = e => { if (e.target.closest && e.target.closest('[data-hyp]')) { ficheHypotheses(); return; } const el = cible(e.target); if (el) voir(el); };
  box.onkeydown = e => { const el = cible(e.target); if (el && (e.key === 'Enter' || e.key === ' ') && !e.target.matches('input')) { e.preventDefault(); voir(el); } }; }
