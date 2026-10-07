/* ===========================================================================
   08 bis — LA FICHE d'un bloc : ce qu'on voit quand on clique un équipement,
   une barrette, une prise de coupure
   ---------------------------------------------------------------------------
   Lisible d'un coup d'œil (le lecteur : « trop de données, on est perdu, on
   ne sait pas de quoi on parle ») :
     1. QUI : sa nature, son repère, une phrase qui le résume ;
     2. EST-CE BON : une seule ligne, verte, orange ou rouge ;
     3. CE QU'ON A CHOISI ET POURQUOI : la référence, et une phrase, pas plus ;
     4. À QUOI ÇA RESSEMBLE : la face (pour une prise, la fiche ET l'embase) ;
     5. SES FILS : contact, fil, d'où il vient ou où il va ;
     6. le reste — changer de norme, d'arrangement, le détail des règles —
        replié sous « Changer » et « Détails ».
   Elle vit dans l'INSPECTEUR, à droite ; le plan se recadre à côté. Les lignes
   du tableau se corrigent dans le tiroir du bas (« dans le tableau »).
   =========================================================================== */
'use strict';

const ONGLETS_FICHE = {};
const coulDeFil = f => couleursDesRoutes().get((f.l && f.l.route) || '') || '#26323f';
const puceFil = f => `<i class="fi-puce" style="background:${coulDeFil(f)}"></i>`;
const typesDe = fils => [...new Set(fils.map(f => f.type).filter(Boolean))].sort(triNaturel).join(', ');

/* ---- les morceaux communs ------------------------------------------------ */
function ficheTete(nature, nom, resume, opts) { opts = opts || {};
  return `<div class="fi-tete"><div class="min0"><div class="fi-nature">${esc(nature)}</div>`
    + `<input class="fi-nom" id="eq-rep" value="${escA(nom)}" aria-label="Repère" title="Renommer : chaque fil suit" spellcheck="false">`
    + (opts.designation != null ? `<input class="fi-des" id="eq-des" value="${escA(opts.designation)}" placeholder="Ajouter une désignation (écrite sous le repère)" aria-label="Désignation" spellcheck="false">` : '')
    + `<div class="fi-resume">${resume}</div></div>`
    + `<div class="fi-actions">${opts.relief ? `<button class="fi-relief" id="eq-relief" title="La pièce en perspective (ou double-clic sur le bloc)"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3zM4 7.5l8 4.5 8-4.5M12 12v9"/></svg>Relief</button>` : ''}`
    + `<button class="rond fermer" id="in-fermer" aria-label="Fermer la fiche (Échap)"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div>`; }
// le pied : voir ses lignes dans le tableau (pour les corriger), supprimer
const fichePied = (nom, n, suppr) => `<div class="fi-pied"><button class="btn papier" id="fi-tableau" data-filtre="${escA(nom)}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M3 14h18M9 5v14"/></svg>Ses ${pluriel(n, 'liaison')} dans le tableau</button>`
  + (suppr ? `<button class="btn lien danger" id="eq-del">Supprimer</button>` : '') + '</div>';
/* Le verdict, en une ligne : `ko` des problèmes, `att` des remarques. */
function ficheStatut(ko, att, okTexte) {
  if (ko.length) return `<div class="fi-statut ko"><b>${ko.length > 1 ? ko.length + ' problèmes' : '1 problème'}</b><ul>${ko.slice(0, 4).map(t => `<li>${esc(t)}</li>`).join('')}${ko.length > 4 ? `<li>… et ${ko.length - 4} autres</li>` : ''}</ul></div>`;
  if (att.length) return `<div class="fi-statut att"><b>${att.length > 1 ? att.length + ' points à voir' : '1 point à voir'}</b><ul>${att.slice(0, 4).map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
  return `<div class="fi-statut ok"><b>Conforme</b><span>${esc(okTexte)}</span></div>`; }
const ficheChoix = (ref, pourquoi, etiquette) => `<div class="fi-choix"><div class="fi-sur">${esc(etiquette || 'Référence')}</div><div class="fi-ref">${esc(ref || '—')}</div><p class="fi-pourquoi">${pourquoi}</p></div>`;
const ficheSection = (titre, corps, cls) => corps ? `<section class="fi-sec${cls ? ' ' + cls : ''}"><div class="fi-sur">${titre}</div>${corps}</section>` : '';
const replie = (titre, corps, cle) => corps ? `<details class="fi-replie" data-cle="${cle}"${ONGLETS_FICHE[cle] ? ' open' : ''}><summary>${titre}<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary><div class="fi-replie-corps">${corps}</div></details>` : '';
// une ligne de fil : ce qui la repère (contact, borne), le fil, où il va
const ligneFil = (repere, f, sous, ko) => { const i = verite().indexOf(f.l);
  return `<li class="fi-fil${ko ? ' ko' : ''}" data-i="${i}" data-fils="${i}" tabindex="0" role="button" aria-label="${escA('Voir le fil ' + (f.cable || '') + ' sur le plan')}">`
    + `<span class="fi-ct">${esc(repere)}</span><span class="fi-cable">${puceFil(f)}<b>${esc(f.cable || '—')}</b><small>${esc(f.type || '')}</small></span>`
    + `<span class="fi-dest">${esc(sous)}</span>${ko ? `<span class="fi-ko">${esc(ko)}</span>` : ''}</li>`; };
/* Une face qui tient dans la largeur de la fiche : le SVG se met à l'échelle. */
const faceAjustee = (f, titre) => `<figure class="fi-face"><svg class="mj" viewBox="0 0 ${f1(f.w)} ${f1(f.h)}" style="max-width:${f1(Math.min(f.w * 1.15, 520))}px" role="img" aria-label="${escA(titre || 'Face')}">${f.svg}</svg>${titre ? `<figcaption>${esc(titre)}</figcaption>` : ''}</figure>`;
// le symétrique d'un module, comme on voit l'autre partie de face (fiche et embase sont symétriques par l'axe vertical)
const miroir = m => ({ ...m, contacts: m.contacts.map(c => ({ ...c, c: m.colonnes - 1 - c.c })), groupes: m.groupes.map(g => ({ ...g, contacts: g.contacts.map(c => ({ ...c, c: m.colonnes - 1 - c.c })) })) });

/* ---- la fiche ------------------------------------------------------------ */
function rendreFiche() { const box = $('ba-equip'), c = app.cible; if ($('inspecteur').hidden) return;
  if (!c) { box.innerHTML = ''; return; }
  let corps, nom = '', n = 0;
  try {
    if (c.type === 'fil') corps = ficheFil(c.l);
    else if (c.type === 'vt') corps = ficheBarretteAPoser(c);
    else { nom = c.nom; const mes = verite().filter(l => l.de === nom || l.vers === nom); n = mes.length;
      corps = (barretteEnModules(nom) ? ficheBarrette(nom, n) : coupureEnModules(nom) ? ficheCoupure(nom, n) : estBornier(nom) ? ficheBornierAncien(nom, n) : ficheEquipement(nom, n, mes)) + fichePied(nom, n, true); } }
  catch (e) { corps = ficheTete('Élément', nom || '—', '') + `<p class="note">${esc(String(e && e.message || e))}</p>`; }
  const haut = box.scrollTop, meme = box.dataset.cle === (c.type + '|' + (c.nom || (c.l && c.l.cable) || ''));
  box.className = 'fi'; box.innerHTML = corps.replace('<!--onglets-->', ''); box.dataset.cle = c.type + '|' + (c.nom || (c.l && c.l.cable) || '');
  if (meme) box.scrollTop = haut;
  lierFiche(nom, n); }
function lierFiche(nom, n) { const box = $('ba-equip');
  $('in-fermer').onclick = () => deselectionner();
  const tab = $('fi-tableau'); if (tab) tab.onclick = () => { app.base.filtre = tab.dataset.filtre; app.base.defiler = true; if (app.base.ouvert) rendreBase(); else ouvrirBase(); };
  box.querySelectorAll('details.fi-replie').forEach(d => d.addEventListener('toggle', () => { ONGLETS_FICHE[d.dataset.cle] = d.open; }));
  box.querySelectorAll('[data-choisir-bloc]').forEach(b => b.onclick = () => { const k = (app.dessin.comps || []).find(x => x.name === b.dataset.choisirBloc && x.kind !== 'tag'); if (k) choisirBloc(k); else { app.cible = { type: 'bloc', nom: b.dataset.choisirBloc }; rendreFiche(); } });
  if (!nom) { lierFilsDeCarte(box); return; }
  const rep = $('eq-rep'); if (rep) rep.addEventListener('change', e => { const nr = e.target.value.trim(); if (!nr || nr === nom) { e.target.value = nom; return; }
    histPush('renommage de ' + nom); renommer(nom, nr); app.choisi = nr; app.cible = { type: 'bloc', nom: nr }; if (app.base.filtre === nom) app.base.filtre = nr; apresEdition(); });
  const des = $('eq-des'); if (des) des.addEventListener('change', e => { histPush('désignation de ' + nom); designer(nom, e.target.value.trim()); apresEdition(); });
  if ($('eq-del')) $('eq-del').onclick = () => { if (!confirm('Supprimer « ' + nom + ' » et ses ' + n + ' liaison(s) ?')) return;
    histPush('suppression de ' + nom); supprimerEquipement(nom); app.base.filtre = ''; deselectionner(); apresEdition(); dire(nom + ' supprimé.'); };
  if ($('eq-relief')) $('eq-relief').onclick = () => ouvrirRelief(nom);
  box.querySelectorAll('input').forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } }));
  // les choix : une norme, une variante, un arrangement, le retour à l'automatique
  const choisir = (cle, d, quoi) => { histPush(quoi); designer(cle, d); apresEdition(); };
  box.querySelectorAll('[data-norme-barrette]').forEach(b => b.onclick = () => choisir(nom, b.dataset.normeBarrette, 'norme de ' + nom));
  box.querySelectorAll('[data-norme-prise]').forEach(b => b.onclick = () => choisir(nom, b.dataset.normePrise, 'norme de ' + nom));
  box.querySelectorAll('.cand[data-cle]').forEach(b => b.onclick = () => { if (b.getAttribute('aria-pressed') !== 'true') { choisir(b.dataset.cle, b.dataset.ref, 'choix de ' + b.dataset.cle); dire(b.dataset.ref + ' retenu.'); } });
  box.querySelectorAll('[data-auto]').forEach(b => b.onclick = () => { choisir(b.dataset.auto, '', 'choix automatique'); dire('Choix automatique rétabli.'); });
  box.querySelectorAll('[data-bible]').forEach(b => b.onclick = () => ficheBible(b.dataset.bible));
  if (estBornier(nom) && !barretteEnModules(nom) && !coupureEnModules(nom) && typeof lierCartePhysique === 'function') lierCartePhysique(nom);
  lierFilsDeCarte(box);
  box.querySelectorAll('.fi-fil').forEach(li => li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); voirFilDeCarte(+li.dataset.i); } })); }

/* ---- un fil -------------------------------------------------------------- */
const boutDeFil = (rep, borne, pn) => `<button class="fi-bout" data-choisir-bloc="${escA(rep)}"><b>${esc(rep)}</b><span>borne ${esc(borne || '—')}</span>${pn ? `<small>${esc(pn)}</small>` : ''}</button>`;
function ficheFil(l) { const V = verite(), i = V.indexOf(l), coul = coulDeFil({ l }), route = l.route || '';
  const folios = app.nFolios ? (foliosParSource().get(cleDe(l)) || []) : (l.plan ? [l.plan] : []);
  const jauge = jaugeDuType(l.type), att = [];
  if (!l.type) att.push('type de fil inconnu : la jauge ne se vérifie pas');
  const corps = `<div class="fi-tete"><div class="min0"><div class="fi-nature">Fil${route ? ' · ' + esc(route) : ''}</div><div class="fi-nom fi-nom-fil"><i class="fi-puce gros" style="background:${coul}"></i>${esc(l.cable || 'sans numéro')}</div>`
    + `<div class="fi-resume">${esc(l.type || 'type inconnu')}${jauge != null ? ' · jauge ' + jauge + ' AWG' : ''}${folios.length ? ' · folio ' + folios.join(', ') : ''}</div></div>`
    + `<div class="fi-actions"><button class="rond fermer" id="in-fermer" aria-label="Fermer la fiche (Échap)"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div>`;
  return corps + (att.length ? ficheStatut([], att, '') : '')
    + `<div class="fi-trajet">${boutDeFil(l.de, l.borneDe, l.pnDe)}<span class="fi-fleche" style="background:${coul}"></span>${boutDeFil(l.vers, l.borneVers, l.pnVers)}</div>`
    + `<div class="fi-pied"><button class="btn papier" id="fi-tableau" data-filtre="${escA(l.cable || l.de)}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M3 14h18M9 5v14"/></svg>Corriger dans le tableau</button></div>`; }

/* ---- une barrette à poser (un dédoublement de fils) ----------------------- */
function ficheBarretteAPoser(c) { const b = besoinsDeBarrette(c.propre, verite()), fils = (b.parBorne.get(c.borne) || []).map(f => ({ ...f, jauge: jaugeDuType(f.type) }));
  const js = fils.map(f => f.jauge).filter(j => j != null), raccord = { cable: '', type: js.length ? 'jauge ' + Math.min(...js) : '', jauge: js.length ? Math.min(...js) : null, l: fils[0] && fils[0].l };
  // la barrette que la norme propose : un potentiel, autant de contacts que de fils (le raccord vers la borne compris)
  let prop = null; try { prop = remplirModules({ bornes: ['1'], ponts: [], parBorne: new Map([['1', [...fils, raccord]]]), pn: '' }, app.norme); } catch (_) { }
  const n = fils.length + 1;
  const tete = `<div class="fi-tete"><div class="min0"><div class="fi-nature">Barrette à poser</div><div class="fi-nom">${esc(c.nom)}</div>`
    + `<div class="fi-resume">${pluriel(n, 'fil')} sur la borne ${esc(c.borne)} de ${esc(c.propre)}</div></div>`
    + `<div class="fi-actions"><button class="rond fermer" id="in-fermer" aria-label="Fermer la fiche (Échap)"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div></div>`;
  const pourquoi = `${pluriel(fils.length, 'fil')} du contrat partent de la même borne (${esc(c.propre)}:${esc(c.borne)}). On ne sertit pas ${fils.length} fils dans un contact : on pose une barrette, `
    + `un fil de la borne à la barrette, puis un fil par départ — ${n} contacts.`;
  // les numéros de contact, ceux du plan : chaque fil à la hauteur où il touche la barrette, le raccord du côté de la borne
  const B = (app.dessin && app.dessin.barrettes) || [], vb = B.find(x => x.propre === c.propre && x.etiquette === String(c.borne));
  const num = new Map(); let nRaccord = 1;
  if (vb) { const cs = contactsDePiquage(vb), pris = new Set(), L = liaisonsDuPlan();
    const prendre = (y, cote) => { const k = cs.filter(x => !pris.has(x) && Math.abs(x.y - y) < 0.6).sort((u, v) => cote * (u.x - v.x))[0]; if (k) pris.add(k); return k; };
    const kr = prendre(vb.py, vb.px < vb.x ? 1 : -1); if (kr) nRaccord = kr.n;
    fils.forEach(f => { const w = (app.dessin.fils || []).find(w => L[w.i] && L[w.i] === f.l) || (app.dessin.fils || []).find(w => w.cable === f.cable); if (!w) return;
      let y = null; for (let i = 0; i < w.pts.length; i++) { const p = w.pts[i], q = w.pts[i + 1];
        if (Math.abs(p.x - vb.x) < 0.6) { y = p.y; break; } if (q && Math.abs(p.y - q.y) < 0.6 && (p.x - vb.x) * (q.x - vb.x) < 0) { y = p.y; break; } }
      const k = y != null ? prendre(y, 1) : null; if (k) num.set(f, k.n); }); }
  let libre = 1; const suivant = () => { while (nRaccord === libre || [...num.values()].includes(libre)) libre++; return libre++; };
  fils.forEach(f => { if (!num.has(f)) num.set(f, suivant()); });
  const lignes = [{ n: nRaccord, h: `<li class="fi-fil fi-nouveau"><span class="fi-ct">${nRaccord}</span><span class="fi-cable"><b>à créer</b><small>${esc(raccord.type)}</small></span><span class="fi-dest">→ ${esc(c.propre)}:${esc(c.borne)}</span></li>` },
    ...fils.map(f => ({ n: num.get(f), h: ligneFil(String(num.get(f)), f, '→ ' + destination(f)) }))].sort((u, v) => u.n - v.n).map(x => x.h).join('');
  return tete + ficheStatut([], ['repère provisoire : donne-lui son vrai repère dans le tableau (un repère « …VT… »), et numérote le fil à créer'], '')
    + ficheChoix(prop && prop.reference ? prop.reference : 'à choisir', pourquoi + (prop && prop.reference ? ' La norme propose ce module : le plus petit groupe qui reçoit ces fils.' : ''), 'Barrette proposée')
    + ficheSection('Contacts', `<ul class="fi-liste">${lignes}</ul>`)
    + `<div class="fi-pied"><button class="btn papier" data-choisir-bloc="${escA(c.propre)}">Voir ${esc(c.propre)}</button></div>`; }

/* ---- une barrette en modules de jonction --------------------------------- */
function ficheBarrette(nom, n) { const { besoins: b, plan: Q, main } = planDeBarrette(nom), s = k => k > 1 ? 's' : '';
  const nomF = f => nomDeFamille(app.norme, f), M0 = Q.modules[0];
  const resume = `${pluriel(Q.potentiels, 'potentiel')} · ${pluriel(Q.fils.length, 'fil')}${b.jaugeFine != null ? ' · jauge ' + jaugeTexte(b) : ''}`;
  const ko = [...Q.verdicts.filter(v => v.niveau === 'ko').map(v => v.texte), ...Q.fils.filter(x => x.jaugeOk === false).map(x => `${x.f.cable} (${x.f.type}) : jauge refusée par le contact ${x.contact.lettre}`)];
  // pourquoi : la norme, puis la variante, en une phrase
  const norme = Q.famille ? nomF(Q.famille) : '', pnNorme = b.pn && familleDeReference(app.norme, b.pn);
  const pourquoi = main ? 'Choisie à la main.'
    : !Q.modules.length ? 'Aucune variante ne loge ces fils.'
    : (Q.main ? `Norme ${esc(norme)}, choisie à la main. ` : pnNorme ? `Norme ${esc(norme)}, celle du part number du fichier. ` : `Norme ${esc(norme)}, la mieux taillée des deux. `)
      + (Q.modules.length > 1 ? `Un module ne suffit pas : ${Q.potentiels} potentiels répartis sur ${Q.modules.length} modules.`
        : `La variante <b>${esc(M0.module.variante)}</b> reçoit les ${pluriel(Q.potentiels, 'potentiel')} dans ${Q.places > 1 ? 'des groupes distincts' : 'un groupe'}, en perdant le moins de contacts.`);
  // la face : chaque contact pris à la couleur de son fil
  const V = verite(), par = new Map(); Q.fils.forEach(x => par.set(x.module + '|' + x.contact.lettre, x));
  const faces = Q.modules.map((M, k) => faceAjustee(faceModuleSvg(M.module, ct => { const x = par.get(k + '|' + ct.lettre); if (!x) return null; const cl = coulDeFil(x.f);
    return { i: V.indexOf(x.f.l), cable: x.f.cable || '—', couleur: cl, couleurClaire: melanger(cl, 0.72), ko: x.jaugeOk === false }; }, { etiquettes: true }), Q.modules.length > 1 ? (k + 1) + ' · ' + M.reference : ''));
  const fils = Q.fils.slice().sort((a, c) => a.module - c.module || a.groupe.k - c.groupe.k || triBornes(a.contact.lettre, c.contact.lettre))
    .map(x => ligneFil((Q.modules.length > 1 ? (x.module + 1) + '·' : '') + x.contact.lettre, x.f, (x.f.amont ? '← ' : '→ ') + destination(x.f) + ' · borne ' + x.potentiel.bornes.join('-'), x.jaugeOk === false ? 'jauge refusée' : '')).join('');
  // changer : la norme, puis une variante d'un seul module
  const normes = `<div class="fi-puces">` + [['', 'Automatique'], ...famillesDeModules(app.norme).map(f => [f, nomF(f)])].map(([f, t]) => `<button class="fi-chip" data-norme-barrette="${escA(f)}" aria-pressed="${!main && (Q.main ? Q.famille === f : !f)}">${esc(t)}</button>`).join('') + '</div>';
  const fs = Q.famille ? [Q.famille] : famillesDeModules(app.norme), retenu = M0 && (main || Q.modules.length === 1) ? M0.reference : '';
  const cands = fs.map(f => variantesQuiLogent(b, app.norme, f).slice(0, 6)).flat()
    .map(m => `<button class="cand" data-cle="${escA(nom)}" data-ref="${escA(m.reference)}" aria-pressed="${m.reference === retenu}">${pictoModule(m)}<b>${esc(m.variante)}</b><span>${esc(resumeModule(m))}</span>${m.reference === retenu ? '<span class="ok">retenue</span>' : ''}</button>`).join('');
  const changer = `<div class="fi-sur">Norme</div>${normes}<div class="fi-sur">Variante (un seul module)</div>${cands || '<p class="note">Aucune variante ne loge la barrette d’un seul module.</p>'}`
    + (main ? `<button class="btn lien" data-auto="${escA(nom)}">Revenir au choix automatique</button>` : '') + (M0 ? `<button class="btn lien" data-bible="${escA(M0.reference)}">Voir dans la bible</button>` : '');
  return ficheTete('Barrette · modules de jonction', nom, resume, { relief: true }) + '<!--onglets-->'
    + ficheStatut(ko, [], `chaque fil sur un contact qui accepte sa jauge, ${pluriel(Q.contacts - Q.utilises, 'contact')} libre${s(Q.contacts - Q.utilises)}.`)
    + ficheChoix(Q.reference, pourquoi, Q.modules.length > 1 ? 'Modules' : 'Module') + (faces.length ? `<div class="fi-faces">${faces.join('')}</div>` : '')
    + ficheSection('Fils', fils ? `<ul class="fi-liste">${fils}</ul>` : '') + replie('Changer de norme ou de variante', changer, 'changer'); }

/* ---- une prise de coupure ------------------------------------------------ */
function ficheCoupure(nom, n) { const { besoins: b, points, plan: Q } = planDeCoupure(nom), M = Q.modules[0], V = verite();
  const nomF = f => nomDeFamille(app.norme, f);
  const resume = `${pluriel(points.length, 'contact')} · ${pluriel(Q.fils.length, 'fil')}${b.jaugeFine != null ? ' · jauge ' + jaugeTexte(b) : ''}`;
  const ko = [...Q.verdicts.filter(v => v.niveau === 'ko').map(v => v.texte)], att = Q.verdicts.filter(v => v.niveau === 'attention').map(v => v.texte);
  const nums = points.map(p => p.num).join(', '), types = typesDe(Q.fils.map(x => x.f));
  const pourquoi = Q.main ? 'Choisi à la main.' : Q.nomme ? `Le part number du fichier (${esc(b.pn)}) nomme cet arrangement.`
    : !M ? 'Aucun arrangement ne loge ces contacts avec ces jauges.'
    : `Le plus petit arrangement ${esc(nomF(M.module.famille))}${Q.visee ? '' : ', parmi les normes de connecteurs,'} qui a les contacts ${esc(nums)} et accepte des fils ${esc(types || 'de jauge inconnue')}.`;
  // les deux parties, face à face : la fiche (mobile) reçoit ce qui arrive, l'embase (fixe) ce qui repart
  let faces = '';
  if (M) { const par = (amont, ct) => { const xs = Q.fils.filter(x => x.contact === ct && !!x.f.amont === amont); if (!xs.length) return null; const cl = coulDeFil(xs[0].f);
      return { i: V.indexOf(xs[0].f.l), cable: xs[0].f.cable || '—', couleur: cl, couleurClaire: melanger(cl, 0.72), ko: xs.some(x => x.jaugeOk === false) }; };
    const fm = faceModuleSvg(M.module, ct => par(true, ct), { etiquettes: true }), mm = miroir(M.module);
    const fe = faceModuleSvg(mm, ct => par(false, M.module.contacts.find(k => k.lettre === ct.lettre)), { etiquettes: true });
    faces = `<div class="fi-faces deux">${faceAjustee(fm, 'Fiche (partie mobile) · ce qui arrive')}${faceAjustee(fe, 'Embase (partie fixe) · ce qui repart')}</div>`; }
  const lignes = (M ? M.module.contacts : []).map(ct => { const am = Q.fils.find(x => x.contact === ct && x.f.amont), av = Q.fils.find(x => x.contact === ct && !x.f.amont); if (!am && !av) return '';
    const ko = [am, av].some(x => x && x.jaugeOk === false);
    return `<li class="fi-paire${ko ? ' ko' : ''}"><span class="fi-ct">${esc(ct.lettre)}</span>`
      + [am, av].map(x => x ? `<span class="fi-fil fi-cote" data-i="${V.indexOf(x.f.l)}" data-fils="${V.indexOf(x.f.l)}" tabindex="0" role="button">${puceFil(x.f)}<b>${esc(x.f.cable || '—')}</b><small>${esc(x.f.amont ? x.f.vers : x.f.vers)}</small></span>` : '<span class="fi-vide">—</span>').join('<span class="fi-entre"></span>') + '</li>'; }).join('');
  const normes = `<div class="fi-puces">` + [['', 'Automatique'], ...famillesDeModules(app.norme, 'connecteur').map(f => [f, nomF(f)])].map(([f, t]) => `<button class="fi-chip" data-norme-prise="${escA(f)}" aria-pressed="${!Q.main && (Q.visee || '') === f}">${esc(t)}</button>`).join('') + '</div>';
  const vs = arrangementsQuiLogent(points, app.norme, Q.visee || Q.famille).slice(0, 6), retenu = M ? M.reference : '';
  const cands = vs.map(m => `<button class="cand" data-cle="${escA(nom)}" data-ref="${escA(m.reference)}" aria-pressed="${m.reference === retenu}">${pictoModule(m)}<b>${esc(m.variante)}</b><span>${esc(resumeModule(m))}</span>${m.reference === retenu ? '<span class="ok">retenu</span>' : ''}</button>`).join('');
  const changer = `<div class="fi-sur">Norme</div>${normes}<div class="fi-sur">Arrangement</div>${cands || '<p class="note">Aucun arrangement de cette norme ne convient.</p>'}`
    + (Q.main ? `<button class="btn lien" data-auto="${escA(nom)}">Revenir au choix automatique</button>` : '') + (M ? `<button class="btn lien" data-bible="${escA(M.reference)}">Voir dans la bible</button>` : '');
  const info = Q.verdicts.filter(v => v.niveau === 'info').map(v => `<p class="note">${esc(v.texte)}</p>`).join('');
  return ficheTete('Prise de coupure', nom, resume, { relief: true }) + '<!--onglets-->'
    + ficheStatut(ko, att, 'un fil de chaque côté par contact, chaque jauge acceptée.')
    + ficheChoix(Q.reference, pourquoi, 'Arrangement') + faces
    + ficheSection('Fils · fiche ⇄ embase', lignes ? `<ul class="fi-liste paires">${lignes}</ul>${info}` : '') + replie('Changer de norme ou d’arrangement', changer, 'changer'); }

/* ---- un équipement ------------------------------------------------------- */
function ficheEquipement(nom, n, mes) { const V = verite(), C = connecteursDe(nom, V).filter(c => c.nom), cav = cavitesDe(nom), parNom = new Map(cav.map(c => [c.nom, c]));
  const b = besoinsDeBarrette(nom, V);
  const resume = `${natureDe(nom)} · ${pluriel(C.length, 'connecteur')} · ${pluriel(n, 'fil')}`;
  // deux fils sur une même borne : c'est un double sertissage (ou une barrette à poser), on le dit
  const B = (app.dessin && app.dessin.barrettes) || []; nommerBarrettesAPoser(B);
  const vtDe = bo => (B.find(x => x.propre === nom && x.etiquette === String(bo)) || {}).nomVT;
  const doubles = [...b.parBorne].filter(([, fs]) => fs.length > 1).map(([bo, fs]) => `borne ${bo} : ${fs.length} fils (${fs.map(f => f.cable).join(', ')}) — une barrette à poser${vtDe(bo) ? ' (' + vtDe(bo) + ' sur le plan)' : ''}`);
  const ko = cav.flatMap(c => c.plan.verdicts.filter(v => v.niveau === 'ko').map(v => c.nom + ' · ' + v.texte));
  const att = [...doubles, ...cav.flatMap(c => c.plan.verdicts.filter(v => v.niveau === 'attention' && !/contact .* : \d fils/.test(v.texte)).map(v => c.nom + ' · ' + v.texte))];
  const blocs = C.map(c => { const k = parNom.get(c.nom), Q = k && k.plan, M = Q && Q.modules[0];
    const fils = c.bornes.slice().sort(triNaturel).flatMap(bo => (b.parBorne.get(bo) || []).map(f => ligneFil(bo, f, '→ ' + destination(f))));
    let haut = `<div class="fi-conn"><span class="fi-lettre">${esc(c.nom)}</span><div class="min0"><b>${esc(c.pn || 'sans part number')}</b><small>${pluriel(c.bornes.length, 'borne')}</small></div></div>`;
    if (M) { const pourquoi = Q.main ? 'choisi à la main' : Q.nomme ? 'nommé par le part number' : `le plus petit ${nomDeFamille(app.norme, M.module.famille)} qui a ces contacts et ces jauges`;
      const par = new Map(Q.fils.map(x => [x.contact.lettre, x]));
      haut += `<div class="fi-arr"><span class="fi-ref petit">${esc(M.reference)}</span><span class="fi-pq">${esc(pourquoi)}</span></div>`
        + faceAjustee(faceModuleSvg(M.module, ct => { const x = par.get(ct.lettre); if (!x) return null; const cl = coulDeFil(x.f); return { i: V.indexOf(x.f.l), cable: x.f.cable, couleur: cl, couleurClaire: melanger(cl, 0.72), ko: x.jaugeOk === false }; }, { etiquettes: true }));
      const vs = arrangementsQuiLogent(k.points, app.norme, Q.famille).slice(0, 5);
      haut += replie('Changer d’arrangement', vs.map(m => `<button class="cand" data-cle="${escA(nom + '|' + c.nom)}" data-ref="${escA(m.reference)}" aria-pressed="${m.reference === M.reference}">${pictoModule(m)}<b>${esc(m.variante)}</b><span>${esc(resumeModule(m))}</span></button>`).join('')
        + (Q.main ? `<button class="btn lien" data-auto="${escA(nom + '|' + c.nom)}">Revenir au choix automatique</button>` : ''), 'arr-' + c.nom); }
    return `<section class="fi-sec fi-bloc-conn">${haut}<ul class="fi-liste">${fils.join('')}</ul></section>`; }).join('');
  // les bornes sans connecteur
  const sans = [...b.parBorne].filter(([bo]) => !C.some(c => c.bornes.includes(bo))).flatMap(([bo, fs]) => fs.map(f => ligneFil(bo, f, '→ ' + destination(f)))).join('');
  return ficheTete('Équipement', nom, resume, { relief: cav.length > 0, designation: app.contrat.designations.get(nom) || '' }) + '<!--onglets-->'
    + ficheStatut(ko, att, cav.length ? 'chaque borne sur son contact, chaque jauge acceptée.' : 'rien à redire sur ses fils.')
    + (blocs ? `<div class="fi-sur fi-titre-conns">Connecteurs</div>${blocs}` : '') + ficheSection(C.length ? 'Autres bornes' : 'Fils', sans ? `<ul class="fi-liste">${sans}</ul>` : ''); }

/* ---- un bornier hors modules (une bible importée sans modules) ----------- */
function ficheBornierAncien(nom, n) { const V = verite(), b = besoinsDeBarrette(nom, V);
  const P = remplirSelonNorme(physiqueDeBarrette(nom, V, app.bible, app.contrat.designations.get(nom) || ''), app.norme);
  return ficheTete(estCoupure(nom) ? 'Prise de coupure' : 'Barrette', nom, pluriel(n, 'fil'), { relief: true }) + '<!--onglets-->'
    + `<div class="equip">${cartePhysique(nom, P, b)}</div>`; }
