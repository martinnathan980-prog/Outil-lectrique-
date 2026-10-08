/* ===========================================================================
   08 sexies — LES CONTRATS DÉJÀ FAITS, à l'écran : « Déjà fait », la
   comparaison à trois échelles, le DESSIN (FWD) qu'on ouvre, la bible
   ---------------------------------------------------------------------------
   On dépose la grande base (un retest de plusieurs harness) ; elle se garde
   dans ce navigateur (IndexedDB), indexée une fois (09 quinquies).
     · Sur la fiche de chaque équipement, « DÉJÀ FAIT » : les trois machines
       les plus proches, chacune avec le repère décodé en mots, le harness,
       l'appareil, la date — et LE DESSIN où l'équipement apparaît : combien
       d'équipements, combien chez nous, ce qui nous manque.
     · Un clic ouvre la COMPARAISON : à l'échelle de l'ÉQUIPEMENT (ses
       lignes), de son VOISINAGE (ce qui lui est relié dans le dessin, à un
       ou deux pas) ou du DESSIN entier — en vert ce que la machine a et que
       nous n'avons pas, en orange ce qui diffère, en gris ce qui est pareil,
       en bleu ce que nous avons en plus ; ses repères lus avec les nôtres
       (même repère, part number, voisins, code — « ? » quand c'est proposé).
       On coche, « Reprendre » l'ajoute au contrat (Ctrl+Z le défait), et ce
       qui est repris passe les mêmes contrôles que le reste.
     · « DESSIN » ouvre un calque plein écran (`#fwd`, créé ici) qui DESSINE
       le FWD avec le moteur de l'outil — placé et routé comme un folio, sur
       sa feuille, qu'on zoome et déplace —, l'équipement comparé encadré,
       ceux que nous avons en gris, ceux qui nous manquent en vert, les fils
       qui manquent ou diffèrent en pointillé ; à côté, la colonne qui
       EXPLIQUE le dessin : chaque repère décodé, ce qui lui est relié, ce
       qu'il devient chez nous. Échap ferme. Un dessin ne se calcule que
       quand on l'ouvre, et se garde.
     · Dans la BIBLE, la base par harness et par dessin, une recherche
       (harness, dessin, appareil, repère), un clic sur un dessin l'ouvre.
   Tout reste hors ligne, dans ce navigateur.
   =========================================================================== */
'use strict';

const IDB_REFERENCES = 'references';
/* ce que l'écran garde d'une fiche à l'autre : les lignes cochées, l'échelle de la comparaison (équipement, voisinage à
   `pas` pas, dessin), la recherche de la bible ; et les caches : les dessins calculés, les comparaisons de dessins */
const REF = { coches: new Set(), portee: 'equipement', pas: 1, q: '', dessins: new Map(), cmp: new Map(), lie: false };
const MOTS_SUR = { cible: 'l’équipement comparé', 'repère': 'même repère', pn: 'même part number', voisins: 'même code, mêmes voisins — à confirmer', code: 'même code, le plus proche — à confirmer', nouveau: 'nouveau chez nous' };
const incertain = sur => sur === 'code' || sur === 'voisins';

/* ---- la base : garder, relire, oublier ---------------------------------- */
function viderCachesReferences() { REF.dessins.clear(); REF.cmp.clear(); }
function adopterReferences(liaisons, nom) { app.references = liaisons && liaisons.length ? { nom: nom || '', liaisons, index: indexerReferences(liaisons), t: Date.now() } : null; viderCachesReferences();
  ouvrirIDB().then(db => { const st = db.transaction(IDB_REFERENCES, 'readwrite').objectStore(IDB_REFERENCES); if (app.references) st.put({ nom: app.references.nom, liaisons, t: app.references.t }, 'base'); else st.delete('base'); }).catch(() => { });
  CONTROLE.cle = null; if (app.cible) rendreFiche(); if (app.fiche && app.fiche.mode === 'bible') ficheBible(app.fiche.ref); }
function relireReferences() { ouvrirIDB().then(db => { const req = db.transaction(IDB_REFERENCES).objectStore(IDB_REFERENCES).get('base');
  req.onsuccess = () => { const o = req.result; if (!o || !o.liaisons || !o.liaisons.length) return; app.references = { nom: o.nom || '', liaisons: o.liaisons.map(liaison), t: o.t || 0 }; app.references.index = indexerReferences(app.references.liaisons); viderCachesReferences();
    if (app.cible) rendreFiche(); if (app.fiche && app.fiche.mode === 'bible') ficheBible(app.fiche.ref); }; }).catch(() => { }); }
async function importerReferences(fichier) { if (!fichier) return;
  try { dire('Lecture de « ' + fichier.name + ' »…'); const r = lireTexte(await texteDuFichier(fichier));
    if (!r.liaisons.length) { dire('« ' + fichier.name + ' » est lu, mais aucune liaison n’est reconnue — il faut les seize colonnes du retest.', true); return; }
    adopterReferences(r.liaisons, fichier.name);
    const I = app.references.index; dire(pluriel(r.liaisons.length, 'liaison') + ' de ' + I.harnais.size + ' harness et ' + pluriel(I.dessins.size, 'dessin') + ' gardée' + (r.liaisons.length > 1 ? 's' : '') + ' : les fiches disent ce qui a déjà été fait.');
  } catch (e) { dire('Erreur : ' + (e && e.message || e), true); } }
const indexReferences = () => app.references && app.references.index || null;
/* Une empreinte courte du contrat (ce que la comparaison lit) : les comparaisons gardées se périment quand il change. */
function empreinteContrat() { const V = verite(); let h = 2166136261; const s = V.length + '|' + V.map(l => l.de + l.borneDe + l.vers + l.borneVers + l.type + l.pnDe + l.pnVers).join('\u0001');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
/* La comparaison d'un dessin, ou du voisinage d'un équipement, contre le contrat — gardée tant que rien ne change. */
function comparaisonDe(harness, fwd, repereRef, repere, portee, pas) { const D = dessinDe(indexReferences(), harness, fwd); if (!D) return null;
  const k = [harness, fwd, repereRef || '', repere || '', portee, pas || 1, empreinteContrat()].join('\u0001'); if (REF.cmp.has(k)) return REF.cmp.get(k);
  const c = portee === 'voisinage' ? comparerVoisinage(verite(), D, repereRef, repere, pas || 1) : comparerDessin(verite(), D, repereRef, repere);
  if (REF.cmp.size > 40) REF.cmp.delete(REF.cmp.keys().next().value); REF.cmp.set(k, c); return c; }

/* ---- les mots ------------------------------------------------------------- */
/* Un repère décodé, en chasse fixe : la zone, le code (la nature, au survol), l'ordre, la variante. */
function repereHtml(r) { const d = decoderRepere(r); if (!d) return `<span class="rp">${esc(r)}</span>`;
  return `<span class="rp" title="${escA(direRepere(r))}"><span class="rp-zone">${esc(d.zone)}</span><span class="rp-code${d.connu ? '' : ' inconnu'}">${esc(d.code)}</span><span class="rp-ordre">${d.ordre != null ? d.ordre : ''}</span>${d.variante ? `<span class="rp-var">${esc(d.variante)}</span>` : ''}</span>`; }
const plurielNature = (n, k) => k > 1 && !/[sx]$/.test(n.split(' ')[0]) ? n.replace(/^(\S+)/, '$1s') : n;
// « 3 pareils · 1 diffère · 2 manquent · 1 en plus » — seulement ce qui est là
function compteMots(c) { return [c.identique ? c.identique + ' pareil' + (c.identique > 1 ? 's' : '') : '', c.differe ? c.differe + ' diffère' + (c.differe > 1 ? 'nt' : '') : '', c.manque ? c.manque + ' manque' + (c.manque > 1 ? 'nt' : '') : '', c.enplus ? c.enplus + ' en plus' : ''].filter(Boolean).join(' · ') || 'aucune ligne'; }
// les descriptions que le retest porte, par repère
function descriptionsDe(D) { const m = new Map(); D.liaisons.forEach(l => { if (l.descriptionDe && !m.has(l.de)) m.set(l.de, l.descriptionDe); if (l.descriptionVers && !m.has(l.vers)) m.set(l.vers, l.descriptionVers); }); return m; }
const etatEquipement = e => e.sur === 'cible' ? 'cible' : !e.chezNous ? 'manque' : incertain(e.sur) ? 'propose' : 'chez';
function versMots(e) { return e.sur === 'cible' ? `= <b>${esc(e.vers)}</b> · ${MOTS_SUR.cible}` : !e.chezNous ? 'manque chez nous' : `→ <b>${esc(e.vers)}</b>${incertain(e.sur) ? ' ?' : ''} · ${MOTS_SUR[e.sur] || e.sur}`; }

/* ---- « Déjà fait » sur la fiche d'un équipement ------------------------- */
function dejaFaitHtml(nom) { const I = indexReferences(); if (!I) return '';
  const cs = candidatsDeReference(I, verite(), nom, 3); if (!cs.length) return '';
  const ligne = c => { const D = c.fwd ? dessinDe(I, c.harness, c.fwd) : null, C = D ? comparaisonDe(c.harness, c.fwd, c.repere, nom, 'dessin') : null;
    const manque = C ? C.manquent.slice(0, 3).map(e => `<b>${esc(e.repere)}</b>${e.nature ? ' <i>' + esc(e.nature) + '</i>' : ''}`).join(', ') + (C.manquent.length > 3 ? ' …' : '') : '';
    const dessin = D ? `<span class="cd-ligne cd-dessin"><span class="cd-fwd" title="Le dessin (FWD) où ${escA(c.repere)} apparaît">${esc(c.fwd)}</span> · ${pluriel(D.equipements.size, 'équipement')}${C ? ` · <b>${C.chezNous}</b> chez nous${C.manquent.length ? ' · il manque ' + manque : ''}${C.compte.differe ? ` · ${C.compte.differe} fil${C.compte.differe > 1 ? 's' : ''} diffère${C.compte.differe > 1 ? 'nt' : ''}` : ''}` : ''}${c.fwds.length > 1 ? ` · sur ${c.fwds.length} dessins` : ''}</span>` : '';
    return `<li class="fi-cand cd-${c.taux >= 0.8 ? 'ok' : c.taux >= 0.4 ? 'att' : 'ko'}" data-ref="${escA(c.harness)}" data-rep="${escA(c.repere)}" data-fwd="${escA(c.fwd || '')}" tabindex="0" role="button" title="${escA('Comparer avec ' + c.repere + ' de ' + c.harness)}">`
      + `<span class="cd-taux"><b>${Math.round(c.taux * 100)} %</b></span><span class="cd-corps"><span class="cd-ligne">${repereHtml(c.repere)}<span class="cd-mots">${esc(direRepere(c.repere))}</span></span>`
      + `<span class="cd-ligne cd-ou"><b>${esc(c.harness)}</b>${c.appareil ? ' · ' + esc(c.appareil) : ''}${c.retest ? ' · ' + esc(c.retest) : ''} · <i>${c.par === 'pn' ? 'même part number' : 'même code'}</i></span>${dessin}</span>${ico('fleche', 'cd-fleche')}</li>`; };
  return `<section class="fi-cadre fi-deja"><div class="fi-ref-ligne"><b class="fi-ref">Déjà fait</b><span class="cd-compte">${pluriel(I.harnais.size, 'machine')} · ${pluriel(I.dessins.size, 'dessin')}</span></div><ul class="fi-liste cd-liste">${cs.map(ligne).join('')}</ul></section>`; }

/* ---- LA COMPARAISON : la fiche de l'équipement contre l'équipement d'une machine, à trois échelles ------------ */
const cleComparaison = (c, portee) => c.harness + '|' + c.repere + (portee === 'equipement' ? '' : '|' + portee + (portee === 'voisinage' ? REF.pas : ''));
// le dessin d'une comparaison : celui qu'on a demandé, sinon le dessin principal du repère de la machine
function dessinDeComparaison(c) { const I = indexReferences(), h = I && I.harnais.get(c.harness); if (!h) return null;
  const fwd = c.fwd || dessinPrincipal(h.equipements.get(c.repere) || {}); return fwd ? dessinDe(I, c.harness, fwd) : null; }
function ficheComparaison(c) { const I = indexReferences(), h = I && I.harnais.get(c.harness); if (!h) return fiTete({ nom: c.nom, sous: 'référence introuvable' }) + '<p class="fi-note">La base des contrats faits n’est plus là.</p>';
  const D = dessinDeComparaison(c), portee = D ? REF.portee : 'equipement', cle = cleComparaison(c, portee), mots = { identique: 'pareil', differe: 'diffère', manque: 'manque chez nous', enplus: 'en plus chez nous' };
  const E = differentiel(verite(), c.nom, h.liaisons, c.repere), CD = D ? comparaisonDe(c.harness, D.fwd, c.repere, c.nom, 'dessin') : null, C = portee === 'equipement' ? null : comparaisonDe(c.harness, D.fwd, c.repere, c.nom, portee, REF.pas);
  const corrDe = portee === 'equipement' ? E.correspondance : C.correspondance;
  const vers = r => { const m = corrDe.get(r); return !m || m.vers === r ? esc(r) : `${esc(m.vers)}<i class="fi-corr" title="${escA(r + ' chez ' + c.harness + ' : ' + (MOTS_SUR[m.sur] || m.sur))}">← ${esc(r)}${incertain(m.sur) ? ' ?' : ''}</i>`; };
  const coche = (etat, k) => etat === 'manque' || etat === 'differe' ? `<input type="checkbox" class="cp-coche" data-k="${escA(k)}"${REF.coches.has(cle + '|' + k) ? ' checked' : ''} aria-label="Reprendre cette ligne">` : '<span></span>';
  const bout = b => b ? ':' + esc(b) : '';   // une masse n'a pas de borne : pas de deux-points orphelin
  let liste, bilan, nb;
  if (portee === 'equipement') {
    const ligne = x => { const b = x.ref || x.notre, k = x.ref ? cleLigne(x.ref) : '';
      return `<li class="fi-fil cp-${x.etat}">${coche(x.etat, k)}<span class="fi-ct"><b>${esc(b.borne)}</b></span><span class="fi-w">${esc(b.typeBrut || '—')}</span><span class="fi-dest${b.amont ? ' amont' : ''}">${ico('fleche')}<span>${x.ref ? vers(x.ref.autre) : esc(x.notre.autre)}${bout(b.borneAutre)}</span></span>`
        + (x.etat === 'differe' ? `<span class="fi-ko">chez nous : ${esc(x.notre.typeBrut || '—')} → ${esc(x.notre.autre)}${bout(x.notre.borneAutre)}</span>` : '') + '</li>'; };
    liste = ['manque', 'differe', 'identique', 'enplus'].map(e => { const xs = E.lignes.filter(x => x.etat === e); return xs.length ? `<li class="fi-groupe cp-${e}">${mots[e]} · ${xs.length}</li>` + xs.map(ligne).join('') : ''; }).join('');
    nb = E.lignes.filter(x => (x.etat === 'manque' || x.etat === 'differe') && REF.coches.has(cle + '|' + cleLigne(x.ref))).length;
    bilan = CD ? `<p class="cp-bilan">Dessin <b class="cd-fwd">${esc(D.fwd)}</b> · ${pluriel(CD.nEquipements, 'équipement')} · <b>${CD.chezNous}</b> chez nous${CD.manquent.length ? ' · il manque ' + CD.manquent.slice(0, 4).map(e => `<b>${esc(e.repere)}</b>${e.nature ? ' <i>' + esc(e.nature) + '</i>' : ''}`).join(', ') + (CD.manquent.length > 4 ? ' …' : '') : ''} · ${compteMots(CD.compte)}</p>` : '';
  } else {
    // une ligne de la référence vue de l'équipement `e` de l'ensemble ; une ligne en plus, vue de son image chez nous
    const ligne = (x, e) => { if (x.ref) { const L = x.ref, amont = L.vers === e.repere && L.de !== e.repere, borne = amont ? L.borneVers : L.borneDe, autre = amont ? L.de : L.vers, bAutre = amont ? L.borneDe : L.borneVers;
        return `<li class="fi-fil cp-${x.etat}">${coche(x.etat, x.k)}<span class="fi-ct"><b>${esc(borne)}</b></span><span class="fi-w">${esc(L.type || '—')}</span><span class="fi-dest${amont ? ' amont' : ''}">${ico('fleche')}<span>${L.de === L.vers ? 'pontage' + bout(bAutre) : vers(autre) + bout(bAutre)}</span></span>`
          + (x.etat === 'differe' && x.notre ? `<span class="fi-ko">chez nous : ${esc(x.notre.type || '—')} · ${esc(x.notre.de)}${bout(x.notre.borneDe)} → ${esc(x.notre.vers)}${bout(x.notre.borneVers)}</span>` : '') + '</li>'; }
      const l = x.notre, amont = l.vers === e.vers && l.de !== e.vers, borne = amont ? l.borneVers : l.borneDe, autre = amont ? l.de : l.vers, bAutre = amont ? l.borneDe : l.borneVers;
      return `<li class="fi-fil cp-enplus"><span></span><span class="fi-ct"><b>${esc(borne)}</b></span><span class="fi-w">${esc(l.type || '—')}</span><span class="fi-dest${amont ? ' amont' : ''}">${ico('fleche')}<span>${esc(autre)}${bout(bAutre)}</span></span></li>`; };
    liste = C.equipements.map(e => `<li class="fi-groupe cp-eq cp-eq-${etatEquipement(e)}"><span class="cp-eq-rep">${repereHtml(e.repere)}</span><span class="cp-eq-mots">${esc(e.nature || 'équipement')}</span><span class="cp-eq-vers">${versMots(e)}</span><span class="cp-eq-n">${compteMots(e.compte)}</span></li>` + e.lignes.map(x => ligne(x, e)).join('')).join('');
    const uniques = new Map(); C.lignes.forEach(x => { if (x.k && (x.etat === 'manque' || x.etat === 'differe')) uniques.set(x.k, x); });
    nb = [...uniques.keys()].filter(k => REF.coches.has(cle + '|' + k)).length;
    bilan = `<p class="cp-bilan">${portee === 'dessin' ? 'Dessin' : 'Voisinage à ' + pluriel(REF.pas, 'pas') + ' dans'} <b class="cd-fwd">${esc(D.fwd)}</b> · ${pluriel(C.nEquipements, 'équipement')} · <b>${C.chezNous}</b> chez nous${C.manquent.length ? ' · il manque ' + C.manquent.slice(0, 4).map(e => `<b>${esc(e.repere)}</b>${e.nature ? ' <i>' + esc(e.nature) + '</i>' : ''}`).join(', ') + (C.manquent.length > 4 ? ' …' : '') : ''}${C.proposes.length ? ` · ${C.proposes.length} proposé${C.proposes.length > 1 ? 's' : ''} à confirmer` : ''} · ${compteMots(C.compte)}</p>`;
  }
  const taux = portee === 'equipement' ? E.taux : C.taux;
  const portees = D ? `<div class="fi-puces cp-portee" role="group" aria-label="Échelle de la comparaison">${[['equipement', 'Équipement'], ['voisinage', 'Voisinage'], ['dessin', 'Dessin']].map(([p, t]) => `<button class="fi-chip" data-portee="${p}" aria-pressed="${p === portee}">${t}</button>`).join('')}${portee === 'voisinage' ? `<span class="cp-saut"></span><span class="cp-pas-mot">ce qui lui est relié à</span>` + [1, 2].map(n => `<button class="fi-chip cp-pas" data-pas="${n}" aria-pressed="${REF.pas === n}">${n} pas</button>`).join('') : ''}</div>` : '';
  const corr = [...corrDe].filter(([r, m]) => m.sur !== 'cible' && m.sur !== 'repère').map(([r, m]) => `<span class="fi-chip cp-corr-${m.sur}" aria-pressed="false" title="${escA(MOTS_SUR[m.sur] || m.sur)}">${esc(r)} → ${esc(m.vers)}${incertain(m.sur) ? ' ?' : m.sur === 'nouveau' ? ' (nouveau)' : ''}</span>`).join('');
  return `<header class="fi-tete"><button class="fi-x" id="cp-retour" aria-label="Retour à la fiche">${ico('retour')}</button><div class="min0"><div class="fi-nom">${esc(c.nom)}</div></div><button class="fi-x" id="in-fermer" aria-label="Fermer (Échap)">${ico('fermer')}</button></header>`
    + `<div class="fi-ligne"><span class="fi-etat ${taux >= 0.8 ? 'ok' : taux >= 0.4 ? 'att' : 'ko'}"><i aria-hidden="true">${Math.round(taux * 100)}</i>% de lignes communes</span><span class="fi-sous">contre <b>${esc(c.repere)}</b> · ${esc(c.harness)}${h.appareil ? ' · ' + esc(h.appareil) : ''}${h.retest ? ' · ' + esc(h.retest) : ''}</span></div>`
    + portees + bilan
    + `<section class="fi-cadre"><ul class="fi-liste cp-liste">${liste}</ul>${corr ? `<p class="fi-note fi-rac-t">ses repères, chez nous</p><div class="fi-puces">${corr}</div>` : ''}</section>`
    + `<p class="fi-note">Ce que cette machine a fait — pas forcément ce qu’il faut faire : ce qui est repris passe les mêmes contrôles que le reste. Les fils repris n’ont pas encore de numéro.</p>`
    + `<footer class="fi-pied">${D ? `<button class="fi-bouton" id="cp-dessin" title="${escA('Voir le dessin ' + D.fwd + ' de ' + c.harness + ', dessiné par l’outil')}">${ico('voir')}<span>Dessin</span></button>` : ''}<button class="fi-bouton" id="cp-tout">${ico('tableau')}<span>Tout cocher</span></button><span class="espace"></span><button class="fi-bouton cuivre" id="cp-reprendre"${nb ? '' : ' disabled'}>${ico('fleche')}<span>Reprendre${nb ? ' ' + nb : ''}</span></button></footer>`; }
function lierComparaison(c) { const box = $('ba-equip'), I = indexReferences(), h = I && I.harnais.get(c.harness); if (!h) { $('in-fermer').onclick = () => deselectionner(); return; }
  const D = dessinDeComparaison(c), portee = D ? REF.portee : 'equipement', cle = cleComparaison(c, portee);
  $('in-fermer').onclick = () => deselectionner();
  $('cp-retour').onclick = () => { app.cible = { type: 'bloc', nom: c.nom }; rendreFiche(); };
  box.querySelectorAll('.cp-portee [data-portee]').forEach(b => b.onclick = () => { REF.portee = b.dataset.portee; rendreFiche(); });
  box.querySelectorAll('.cp-portee [data-pas]').forEach(b => b.onclick = () => { REF.pas = +b.dataset.pas; rendreFiche(); });
  if ($('cp-dessin')) $('cp-dessin').onclick = () => ouvrirFwd({ harness: c.harness, fwd: D.fwd, repere: c.repere, notre: c.nom });
  box.querySelectorAll('.cp-coche').forEach(el => el.addEventListener('change', () => { const k = cle + '|' + el.dataset.k; if (el.checked) REF.coches.add(k); else REF.coches.delete(k); rendreFiche(); }));
  // ce qui se coche, et ce qui se reprend : les lignes de l'équipement, ou les lignes uniques de l'ensemble
  let cochables, reprendre;
  if (portee === 'equipement') { const E = differentiel(verite(), c.nom, h.liaisons, c.repere);
    cochables = E.lignes.filter(x => x.etat === 'manque' || x.etat === 'differe').map(x => ({ k: cleLigne(x.ref), x }));
    reprendre = (xs, plan) => liaisonsAReprendre(E, c.nom, xs, plan); }
  else { const C = comparaisonDe(c.harness, D.fwd, c.repere, c.nom, portee, REF.pas), u = new Map(); C.lignes.forEach(x => { if (x.k && (x.etat === 'manque' || x.etat === 'differe')) u.set(x.k, x); });
    cochables = [...u].map(([k, x]) => ({ k, x })); reprendre = (xs, plan) => liaisonsDEnsembleAReprendre(C, xs, verite(), plan); }
  const aReprendre = () => cochables.filter(q => REF.coches.has(cle + '|' + q.k));
  $('cp-tout').onclick = () => { const tous = cochables.every(q => REF.coches.has(cle + '|' + q.k)); cochables.forEach(q => { const k = cle + '|' + q.k; if (tous) REF.coches.delete(k); else REF.coches.add(k); }); rendreFiche(); };
  $('cp-reprendre').onclick = () => { const qs = aReprendre(); if (!qs.length) return;
    const plan = plansDuRepere(c.nom)[0] || (app.plan !== '*' ? app.plan : ''), neuves = reprendre(qs.map(q => q.x), plan);
    histPush('reprise de ' + qs.length + ' ligne(s) de ' + c.harness + (portee === 'equipement' ? '' : ' (' + D.fwd + ')')); const cible = verite(); neuves.forEach(l => cible.push(l));
    qs.forEach(q => REF.coches.delete(cle + '|' + q.k)); app.cible = { type: 'bloc', nom: c.nom }; apresEdition(); dire(pluriel(neuves.length, 'liaison') + ' reprise' + (neuves.length > 1 ? 's' : '') + ' de ' + c.harness + ' : à numéroter, puis à vérifier.'); }; }

/* ---- LE DESSIN (FWD) : un calque plein écran, dessiné par le moteur -------------------------------------------- */
const FWD = { ouvert: false, D: null, repere: '', notre: '', L: null, dessin: null, cmp: null, choisi: '', q: '', vue: { s: 1, tx: 0, ty: 0 }, glisse: null };
const ICONES_FWD = { ajuster: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>', enregistrer: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>', comparer: '<path d="M4 7h11M11 3l4 4-4 4M20 17H9M13 13l-4 4 4 4"/>' };
const icoFwd = k => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONES_FWD[k]}</svg>`;
/* Le calque, créé une fois : la tête (le dessin, sa machine, ses chiffres, les outils), la scène, la colonne. */
function assurerFwd() { if ($('fwd')) return; const d = document.createElement('div'); d.id = 'fwd'; d.className = 'fwd'; d.hidden = true; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'fw-titre');
  d.innerHTML = `<div class="fw-boite"><header class="fw-tete"><div class="min0"><div class="sur" id="fw-sur"></div><h2 class="titre" id="fw-titre"></h2><div class="fw-compte" id="fw-compte"></div></div>`
    + `<div class="fw-outils"><button class="fi-bouton" id="fw-comparer" hidden title="La comparaison de ce dessin entier avec notre contrat">${icoFwd('comparer')}<span>Comparer</span></button><button class="fi-bouton" id="fw-ajuster" title="Ajuster le dessin à l’écran (0)">${icoFwd('ajuster')}<span>Ajuster</span></button><button class="fi-bouton" id="fw-svg" title="Enregistrer ce dessin en SVG">${icoFwd('enregistrer')}<span>SVG</span></button></div>`
    + `<button class="fi-x" id="fw-fermer" aria-label="Fermer le dessin (Échap)">${ico('fermer')}</button></header>`
    + `<div class="fw-corps"><div class="fw-scene" id="fw-scene" title="Molette pour zoomer, glisser pour déplacer"></div><aside class="fw-colonne" id="fw-colonne" aria-label="Ce que le dessin contient"></aside></div></div>`;
  document.body.appendChild(d); lierFwd(); }
/* Ouvrir un dessin : `harness` et `fwd` le nomment ; `repere` (dans la machine) et `notre` (chez nous) disent ce qu'on
   compare, s'il y a lieu. Le dessin se calcule après que le calque s'est peint, et se garde. */
function ouvrirFwd(o) { const I = indexReferences(), D = I && dessinDe(I, o.harness, o.fwd); if (!D) { dire('Ce dessin n’est pas dans la base.', true); return; }
  assurerFwd(); Object.assign(FWD, { D, repere: o.repere || '', notre: o.notre || '', L: null, dessin: null, cmp: null, choisi: o.repere || '', q: '', ouvert: true });
  const d = $('fwd'); d.hidden = false; document.body.classList.add('fwd-ouvert');
  $('fw-sur').textContent = ['Dessin', D.harness, D.appareil, D.retest].filter(Boolean).join(' · '); $('fw-titre').textContent = D.fwd;
  const R = resumeDessin(D); $('fw-compte').textContent = [pluriel(R.equipements, 'équipement'), pluriel(R.fils, 'fil'), R.pontages ? pluriel(R.pontages, 'pontage') : '', R.masses ? pluriel(R.masses, 'masse') : ''].filter(Boolean).join(' · ');
  $('fw-comparer').hidden = !(FWD.repere && FWD.notre);
  $('fw-scene').innerHTML = '<div class="fw-attente">Le moteur place et route le dessin…</div>'; $('fw-colonne').innerHTML = ''; $('fw-fermer').focus();
  setTimeout(() => { if (!FWD.ouvert || FWD.D !== D) return;
    try { FWD.cmp = verite().length ? comparaisonDe(D.harness, D.fwd, FWD.repere, FWD.notre, 'dessin') : null; } catch (_) { FWD.cmp = null; }
    dessinDuFwd(D).then(r => { if (!FWD.ouvert || FWD.D !== D) return; FWD.L = r.L; FWD.dessin = r.dessin; peindreFwd(); ajusterFwd(); colonneFwd(); })
      .catch(e => { if (FWD.D === D) $('fw-scene').innerHTML = `<div class="fw-attente">Le dessin n’a pas pu se faire : ${esc(String(e && e.message || e))}</div>`; }); }, 30); }
function fermerFwd() { const d = $('fwd'); if (!d || d.hidden) return; d.hidden = true; FWD.ouvert = false; document.body.classList.remove('fwd-ouvert'); $('fw-scene').innerHTML = ''; $('fw-colonne').innerHTML = ''; }
/* Le placement d'un gros dessin prend quelques secondes : il se calcule dans un Worker refait du moteur (comme
   l'affinage, 08), la page reste fluide ; sans Worker, dans la page. */
function placerAilleurs(L) { return new Promise(resolve => { let w = null;
  try { const src = document.getElementById('moteur').textContent;
    w = new Worker(URL.createObjectURL(new Blob([src + '\nself.onmessage = e => { try { postMessage({ P: meilleurPlacement(e.data) }); } catch (err) { postMessage({ erreur: String(err && err.message || err) }); } };'], { type: 'text/javascript' }))); }
  catch (_) { resolve(meilleurPlacement(L)); return; }
  w.onmessage = e => { w.terminate(); resolve(e.data && e.data.P ? e.data.P : meilleurPlacement(L)); }; w.onerror = () => { w.terminate(); resolve(meilleurPlacement(L)); };
  w.postMessage(L.map(({ origine, ...l }) => l)); }); }
/* Le dessin d'un FWD, exactement comme un folio (08, `calculer`) : ses dédoublements en barrettes à poser, le placement
   du concours, le routage, la feuille, les couleurs de ses routes. Gardé par dessin. */
async function dessinDuFwd(D) { if (REF.dessins.has(D.cle)) return REF.dessins.get(D.cle);
  const L = avecBarrettesAPoser(D.liaisons.filter(liaisonComplete)), P = await placerAilleurs(L); if (!P) throw new Error('rien à dessiner');
  const dessin = { comps: P.comps, links: P.links, bbox: pageDe(P.comps, P.routage.fils), geom: P.geom, compDe: P.compDe, fils: P.routage.fils, points: P.routage.points, barrettes: P.routage.barrettes, piquages: P.routage.piquages };
  // une route que le contrat ouvert connaît garde sa couleur ; les autres prennent la suite de la palette
  const routes = new Map(), connues = couleursDesRoutes(), prises = new Set(connues.values()); let k = 0;
  [...new Set(L.map(l => l.route).filter(Boolean))].sort(triNaturel).forEach(r => { if (connues.has(r)) { routes.set(r, connues.get(r)); return; } while (prises.has(PALETTE_ROUTES[k % PALETTE_ROUTES.length]) && k < PALETTE_ROUTES.length) k++; routes.set(r, PALETTE_ROUTES[k % PALETTE_ROUTES.length]); k++; });
  const routeDe = w => (L[w.i] && L[w.i].route) || ''; dessin.couleurDe = w => routes.get(routeDe(w)) || null;
  dessin.legende = legendeDesRoutes(dessin.fils.filter(w => !w.shunt && String(w.de) !== String(w.vers)), routeDe, routes); nommerBarrettesAPoser(dessin.barrettes, L);
  const r = { L, dessin }; if (REF.dessins.size > 8) REF.dessins.delete(REF.dessins.keys().next().value); REF.dessins.set(D.cle, r); return r; }
const cartoucheFwd = D => ({ titre: D.fwd, auteur: D.appareil || '', indice: '', date: D.retest || '', echelle: '—' });
const transformFwd = () => `translate(${f1(FWD.vue.tx)},${f1(FWD.vue.ty)}) scale(${FWD.vue.s.toFixed(4)})`;
function peindreFwd() { const d = FWD.dessin, D = FWD.D; if (!d) return; const des = descriptionsDe(D);
  $('fw-scene').innerHTML = `<svg id="fw-svg-dessin" xmlns="http://www.w3.org/2000/svg">${styleDessin()}<g id="fw-vue" transform="${transformFwd()}">${sceneSvg(d, cartoucheFwd(D), '1 / 1', n => des.get(n) || '', FWD.repere || null)}</g></svg>`;
  marquerFwd(); }
/* Ce que le dessin dit de chaque bloc : comparé (encadré), chez nous, proposé (à confirmer), manque chez nous ; et de
   chaque fil : manque chez nous, diffère — en pointillé, la couleur de la route reste. */
function marquerFwd() { const sc = $('fw-vue'); if (!sc) return; const C = FWD.cmp, etat = new Map();
  if (C) C.equipements.forEach(e => etat.set(e.repere, etatEquipement(e))); if (FWD.repere && !etat.has(FWD.repere)) etat.set(FWD.repere, 'cible');
  sc.querySelectorAll('.comp[data-name]').forEach(g => { const n = g.dataset.name, s = etat.get(n); g.classList.remove('fw-cible', 'fw-chez', 'fw-manque', 'fw-propose'); if (s) g.classList.add('fw-' + s); g.classList.toggle('fw-on', !!FWD.choisi && n === FWD.choisi); });
  const parCle = new Map(); if (C) C.lignes.forEach(x => { if (x.k) parCle.set(x.k, x.etat); });
  sc.querySelectorAll('.cab[data-i]').forEach(p => { const l = FWD.L && FWD.L[+p.dataset.i]; if (!l) return; const src = l.origine === undefined ? l : l.origine; if (!src) return;
    const s = parCle.get(cleRef(src)); p.classList.remove('fw-l-manque', 'fw-l-differe'); if (s === 'manque' || s === 'differe') p.classList.add('fw-l-' + s); }); }
// la vue : ajuster la feuille à la scène, zoomer, déplacer, aller sur un bloc
function appliquerVueFwd() { const g = $('fw-vue'); if (g) g.setAttribute('transform', transformFwd()); }
function ajusterFwd() { const d = FWD.dessin, sc = $('fw-scene'); if (!d || !sc) return; const bb = d.bbox, W = sc.clientWidth || 800, H = sc.clientHeight || 600, m = 16;
  const s = Math.max(0.02, Math.min(6, Math.min((W - 2 * m) / bb.w, (H - 2 * m) / bb.h))); FWD.vue = { s, tx: (W - bb.w * s) / 2 - bb.x * s, ty: (H - bb.h * s) / 2 - bb.y * s }; appliquerVueFwd(); }
function zoomerFwd(k, mx, my) { const sc = $('fw-scene'), r = sc.getBoundingClientRect(); if (mx == null) { mx = r.width / 2; my = r.height / 2; }
  const v = FWD.vue, wx = (mx - v.tx) / v.s, wy = (my - v.ty) / v.s, ns = Math.max(0.02, Math.min(8, v.s * k)); FWD.vue = { s: ns, tx: mx - wx * ns, ty: my - wy * ns }; appliquerVueFwd(); }
function viserFwd(nom) { const d = FWD.dessin, c = d && d.comps.find(k => k.name === nom && k.kind !== 'tag') || (d && d.compDe.get(nom)); if (!c) return;
  const sc = $('fw-scene'), W = sc.clientWidth, H = sc.clientHeight, s = Math.max(FWD.vue.s, Math.min(1.2, Math.min(W / (c.w + 160), H / (c.h + 160))));
  FWD.vue = { s, tx: W / 2 - (c.x + c.w / 2) * s, ty: H / 2 - (c.y + c.h / 2) * s }; appliquerVueFwd(); }
function choisirDansFwd(nom, aller) { FWD.choisi = nom || ''; marquerFwd(); const col = $('fw-colonne');
  col.querySelectorAll('.fw-eq').forEach(li => li.classList.toggle('on', li.dataset.nom === FWD.choisi));
  const li = col.querySelector('.fw-eq.on'); if (li && li.scrollIntoView) { try { li.scrollIntoView({ block: 'nearest' }); } catch (_) { } }
  if (aller && nom) viserFwd(nom); }
/* LA COLONNE qui explique le dessin : ce qu'il contient (par nature), le bilan contre notre contrat, la légende, puis
   chaque équipement — le repère décodé, sa description et son part number, ce qu'il devient chez nous, ce qui lui est
   relié, ses lignes (pareilles, différentes, manquantes). Le comparé d'abord, puis ce qui manque, puis le reste. */
function colonneFwd() { const D = FWD.D, C = FWD.cmp, R = resumeDessin(D), des = descriptionsDe(D), parRep = new Map((C ? C.equipements : []).map(e => [e.repere, e]));
  const chiffres = `<div class="fw-chiffres"><span><b>${R.equipements}</b> équipement${R.equipements > 1 ? 's' : ''}</span><span><b>${R.fils}</b> fil${R.fils > 1 ? 's' : ''}</span>${R.pontages ? `<span><b>${R.pontages}</b> pontage${R.pontages > 1 ? 's' : ''}</span>` : ''}${R.masses ? `<span><b>${R.masses}</b> masse${R.masses > 1 ? 's' : ''}</span>` : ''}</div>`
    + `<p class="fw-natures">${esc(R.natures.map(([n, k]) => k + ' ' + plurielNature(n === 'équipement' && R.natures.length > 1 ? 'autre équipement' : n, k)).join(', '))}${R.masses ? ' · ' + esc([...D.masses.keys()].sort(triNaturel).join(', ')) : ''}</p>`;
  const bilan = C ? `<div class="fw-bilan"><span class="fw-pastille chez"><b>${C.chezNous}</b> chez nous</span>${C.manquent.length ? `<span class="fw-pastille manque"><b>${C.manquent.length}</b> manque${C.manquent.length > 1 ? 'nt' : ''}</span>` : ''}${C.proposes.length ? `<span class="fw-pastille propose"><b>${C.proposes.length}</b> à confirmer</span>` : ''}${C.compte.differe ? `<span class="fw-pastille differe"><b>${C.compte.differe}</b> fil${C.compte.differe > 1 ? 's' : ''} diffère${C.compte.differe > 1 ? 'nt' : ''}</span>` : ''}${C.compte.manque ? `<span class="fw-pastille fil-manque"><b>${C.compte.manque}</b> fil${C.compte.manque > 1 ? 's' : ''} manque${C.compte.manque > 1 ? 'nt' : ''}</span>` : ''}${C.compte.enplus ? `<span class="fw-pastille enplus"><b>${C.compte.enplus}</b> en plus chez nous</span>` : ''}</div>`
    + `<ul class="fw-legende">${FWD.repere ? '<li><i class="cible"></i>comparé</li>' : ''}<li><i class="chez"></i>chez nous</li><li><i class="propose"></i>proposé, à confirmer</li><li><i class="manque"></i>manque chez nous</li><li><i class="fil-manque"></i>fil qui manque</li><li><i class="fil-differe"></i>fil qui diffère</li></ul>` : '<p class="fw-natures">Aucun contrat ouvert : rien à comparer, le dessin se lit tel quel.</p>';
  const cherche = `<div class="fw-cherche">${ico('loupe')}<input id="fw-q" value="${escA(FWD.q)}" placeholder="Un repère, une nature, un part number" aria-label="Chercher dans le dessin" autocomplete="off" spellcheck="false"></div>`;
  $('fw-colonne').innerHTML = `<div class="fw-resume">${chiffres}${bilan}</div>${cherche}<ul class="fw-liste" id="fw-liste">${listeFwdHtml(parRep, des)}</ul>`;
  const q = $('fw-q'); q.addEventListener('input', () => { FWD.q = q.value; $('fw-liste').innerHTML = listeFwdHtml(parRep, des); }); }
function listeFwdHtml(parRep, des) { const D = FWD.D, t = FWD.q.trim().toLowerCase(), rang = { cible: 0, manque: 1, propose: 2, chez: 3, '': 4 };
  const items = [...D.equipements.values()].map(e => ({ e, c: parRep.get(e.repere) || null, etat: parRep.has(e.repere) ? etatEquipement(parRep.get(e.repere)) : (e.repere === FWD.repere ? 'cible' : '') }))
    .filter(x => !t || x.e.repere.toLowerCase().includes(t) || (x.e.nature || '').includes(t) || direRepere(x.e.repere).toLowerCase().includes(t) || x.e.pns.some(p => p.toLowerCase().includes(t)) || (des.get(x.e.repere) || '').toLowerCase().includes(t))
    .sort((u, v) => rang[u.etat] - rang[v.etat] || triNaturel(u.e.repere, v.e.repere));
  if (!items.length) return '<li class="fw-vide">Rien qui corresponde.</li>';
  return items.map(({ e, c, etat }) => { const vs = [...e.voisins].sort((u, v) => v[1] - u[1] || triNaturel(u[0], v[0])), masses = vs.filter(([r]) => estMasse(r)), autres = vs.filter(([r]) => !estMasse(r));
    const relie = autres.length ? 'relié à ' + autres.slice(0, 6).map(([r, n]) => `<b>${esc(r)}</b>${n > 1 ? ` <i>(${n} fils)</i>` : ''}`).join(', ') + (autres.length > 6 ? ` <i>et ${autres.length - 6} autres</i>` : '') : 'relié à rien d’autre';
    const sous = [e.pns.join(', '), des.get(e.repere) || ''].filter(Boolean).map(esc).join(' · ');
    return `<li class="fw-eq ${etat || 'neutre'}${e.repere === FWD.choisi ? ' on' : ''}" data-nom="${escA(e.repere)}" tabindex="0" role="button" title="${escA('Voir ' + e.repere + ' sur le dessin')}"><span class="fw-eq-etat" aria-hidden="true"></span><span class="fw-eq-corps">`
      + `<span class="fw-eq-tete">${repereHtml(e.repere)}<span class="fw-eq-mots">${esc(direRepere(e.repere))}</span></span>${sous ? `<span class="fw-eq-sous">${sous}</span>` : ''}`
      + (c ? `<span class="fw-eq-vers">${versMots(c)}</span>` : '') + `<span class="fw-eq-pos">${relie}${masses.length ? ' · masse ' + masses.map(([r]) => esc(r)).join(', ') : ''}${e.pontages ? ' · ' + pluriel(e.pontages, 'pontage') : ''}</span>`
      + `<span class="fw-eq-n">${e.lignes.length} fil${e.lignes.length > 1 ? 's' : ''}${c ? ' : ' + compteMots(c.compte) : ''}</span></span></li>`; }).join(''); }
// les gestes du calque : fermer, ajuster, enregistrer, comparer ; zoomer, déplacer ; un bloc ou une ligne choisit
function lierFwd() { const d = $('fwd'), sc = $('fw-scene');
  $('fw-fermer').onclick = fermerFwd; $('fw-ajuster').onclick = ajusterFwd;
  $('fw-svg').onclick = () => { if (!FWD.dessin) return; const des = descriptionsDe(FWD.D), S = svgAutonome(FWD.dessin, cartoucheFwd(FWD.D), '1 / 1', n => des.get(n) || '');
    telecharger(new Blob([S.txt], { type: 'image/svg+xml;charset=utf-8' }), (FWD.D.harness + '-' + FWD.D.fwd).replace(/[^\w.-]+/g, '_') + '.svg'); dire('Dessin enregistré en SVG.'); };
  $('fw-comparer').onclick = () => { if (!(FWD.repere && FWD.notre)) return; const o = { type: 'ref', nom: FWD.notre, harness: FWD.D.harness, repere: FWD.repere, fwd: FWD.D.fwd }; fermerFwd(); REF.portee = 'dessin'; app.cible = o; ouvrirInspecteur(); };
  d.addEventListener('click', e => { if (e.target === d) fermerFwd(); });
  sc.addEventListener('wheel', e => { e.preventDefault(); const r = sc.getBoundingClientRect(); zoomerFwd(Math.exp(-e.deltaY * 0.0014), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  sc.addEventListener('pointerdown', e => { if (e.button) return; FWD.glisse = { x: e.clientX, y: e.clientY, tx: FWD.vue.tx, ty: FWD.vue.ty, bouge: false }; try { sc.setPointerCapture(e.pointerId); } catch (_) { } });
  sc.addEventListener('pointermove', e => { const g = FWD.glisse; if (!g) return; if (Math.abs(e.clientX - g.x) > 3 || Math.abs(e.clientY - g.y) > 3) g.bouge = true; if (!g.bouge) return;
    FWD.vue.tx = g.tx + (e.clientX - g.x); FWD.vue.ty = g.ty + (e.clientY - g.y); sc.classList.add('tient'); appliquerVueFwd(); });
  const fin = e => { const g = FWD.glisse; FWD.glisse = null; sc.classList.remove('tient'); if (!g || g.bouge) return;
    const c = e.target.closest && e.target.closest('.comp[data-name]'); choisirDansFwd(c ? c.dataset.name : '', false); };
  sc.addEventListener('pointerup', fin); sc.addEventListener('pointercancel', () => { FWD.glisse = null; sc.classList.remove('tient'); });
  sc.addEventListener('mouseover', e => { const c = e.target.closest && e.target.closest('.comp[data-name]'); $('fw-colonne').querySelectorAll('.fw-eq.vise').forEach(li => li.classList.remove('vise'));
    if (c) { const li = $('fw-colonne').querySelector(`.fw-eq[data-nom="${CSS.escape(c.dataset.name)}"]`); if (li) li.classList.add('vise'); } });
  const col = $('fw-colonne'); col.addEventListener('click', e => { const li = e.target.closest('.fw-eq'); if (li) choisirDansFwd(li.dataset.nom, true); });
  col.addEventListener('keydown', e => { const li = e.target.closest && e.target.closest('.fw-eq'); if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); choisirDansFwd(li.dataset.nom, true); } });
  col.addEventListener('mouseover', e => { const li = e.target.closest('.fw-eq'); const sv = $('fw-vue'); if (!sv) return; sv.querySelectorAll('.comp.fw-vise').forEach(g => g.classList.remove('fw-vise'));
    if (li) sv.querySelectorAll('.comp[data-name]').forEach(g => { if (g.dataset.name === li.dataset.nom) g.classList.add('fw-vise'); }); }); }

/* ---- LA BIBLE : la base par harness et par dessin, une recherche ---------------------------------------------- */
function ficheReferences() { const R = app.references, I = indexReferences();
  const etat = !R ? '<div class="bible-etat"><span><b>Aucun contrat déjà fait</b> : dépose un retest de plusieurs harness (les seize colonnes), il se garde dans ce navigateur, rien ne part sur le réseau.</span></div>'
    : `<div class="bible-etat"><span><b>${esc(R.nom || 'Contrats déjà faits')}</b> · ${I.harnais.size} harness · ${pluriel(I.dessins.size, 'dessin')} · ${pluriel(R.liaisons.length, 'liaison')} · gardés dans ce navigateur</span></div>`;
  return `<h3 class="sous-titre">Les contrats déjà faits</h3>${etat}` + (I ? `<div id="rf-base">${rfBaseHtml()}</div>` : '')
    + '<p class="note">Pour un équipement du contrat, sa fiche dit les trois machines les plus proches (même part number, sinon même code), le taux de lignes communes, et le dessin (FWD) où il apparaît ; la comparaison — l’équipement, son voisinage, le dessin entier — montre ce qu’elles ont en plus, ce qui diffère, et reprend ce qu’on coche ; « Dessin » ouvre le FWD dessiné par l’outil. « La solution du PH n’est pas forcément la bonne » : ce qui est repris passe les mêmes contrôles que le reste.</p>'; }
function rfBaseHtml() { const I = indexReferences(); if (!I) return ''; const Q = chercherReferences(I, REF.q, 80), t = s => `<div class="sur rf-sur">${s}</div>`;
  const cherche = `<div class="rf-cherche">${ico('loupe')}<input id="rf-q" value="${escA(REF.q)}" placeholder="Chercher un harness, un dessin (FWD), un appareil, un repère" aria-label="Chercher dans les contrats déjà faits" autocomplete="off" spellcheck="false"></div>`;
  // le nom d'un dessin est le bouton qui l'ouvre ; une table large défile de côté (`.norme-defile`, comme la norme)
  const voir = (h, fwd, rep) => `<button class="rf-voir" data-h="${escA(h)}" data-fwd="${escA(fwd)}"${rep ? ` data-rep="${escA(rep)}"` : ''} title="${escA('Voir le dessin ' + fwd + ' de ' + h + (rep ? ', ' + rep + ' en évidence' : ''))}">${ico('voir')}<span>${esc(fwd)}</span></button>`;
  const table = (th, lignes) => `<div class="norme-defile"><table class="norme rf-tab"><thead><tr>${th.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${lignes}</tbody></table></div>`;
  const harnais = Q.harnais.length ? t('Par harness · ' + Q.harnais.length) + table(['Harness', 'Appareil', 'Retest', 'Dessins', 'Équipements', 'Liaisons'],
    Q.harnais.sort((a, b) => triNaturel(a.harness, b.harness)).map(h => `<tr><td class="ref">${esc(h.harness)}</td><td class="sans">${esc(h.appareil || '—')}</td><td class="d">${esc(h.retest || '—')}</td><td class="d">${h.dessins.length}</td><td class="d">${h.equipements.size}</td><td class="d">${h.liaisons.length}</td></tr>`).join('')) : '';
  const dessins = Q.dessins.length ? t('Par dessin (FWD) · ' + Q.dessins.length) + table(['Dessin', 'Harness', 'Appareil', '<span title="Équipements">Équip.</span>', 'Fils'],
    Q.dessins.sort((a, b) => triNaturel(a.fwd, b.fwd) || triNaturel(a.harness, b.harness)).map(d => `<tr><td class="ref">${voir(d.harness, d.fwd)}</td><td>${esc(d.harness)}</td><td class="sans">${esc(d.appareil || '—')}</td><td class="d">${d.equipements.size}</td><td class="d">${d.fils}</td></tr>`).join('')) : '';
  const equipements = Q.equipements.length ? t('Repères · ' + Q.equipements.length) + table(['Repère', 'Nature', 'Part number', 'Dessin', 'Fils'],
    Q.equipements.map(x => `<tr><td class="ref">${repereHtml(x.e.repere)}</td><td class="sans">${esc(direRepere(x.e.repere).replace(/ · zone .*$/, ''))}</td><td>${esc(x.e.pns.join(', ') || '—')}</td><td>${voir(x.harness, x.fwd, x.e.repere)}<div class="rf-sous">${esc(x.harness)}${x.appareil ? ' · ' + esc(x.appareil) : ''}</div></td><td class="d">${x.e.lignes.length}</td></tr>`).join('')) : '';
  return cherche + harnais + dessins + equipements + (!Q.total ? '<p class="note">Rien qui corresponde.</p>' : '') + (Q.plus ? `<p class="note">… et ${Q.plus} de plus — affine la recherche.</p>` : ''); }
/* Les gestes de la bible, posés une fois sur le document (la bible se refait sans nous) : la recherche refait la base
   sous les doigts, « Dessin » ouvre le calque ; et le clavier du calque, avant tout le monde : Échap ferme, 0 ajuste,
   + et − zooment, le reste lui appartient. */
function lierReferencesUneFois() { if (REF.lie || typeof document === 'undefined') return; REF.lie = true;
  document.addEventListener('input', e => { const q = e.target; if (!q || q.id !== 'rf-q') return; REF.q = q.value; const box = $('rf-base'); if (!box) return;
    const pos = q.selectionStart; box.innerHTML = rfBaseHtml(); const q2 = $('rf-q'); if (q2) { q2.focus(); try { q2.setSelectionRange(pos, pos); } catch (_) { } } });
  document.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('.rf-voir'); if (!b) return; e.preventDefault(); e.stopPropagation(); ouvrirFwd({ harness: b.dataset.h, fwd: b.dataset.fwd, repere: b.dataset.rep || '' }); }, true);
  window.addEventListener('keydown', e => { if (!FWD.ouvert) return; const dansChamp = /^(INPUT|TEXTAREA)$/.test((e.target && e.target.tagName) || '');
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (dansChamp && e.target.value) { e.target.value = ''; e.target.dispatchEvent(new Event('input')); return; } fermerFwd(); return; }
    if (dansChamp) { e.stopPropagation(); return; }
    if (e.key === '0' || e.key === 'f') ajusterFwd(); else if (e.key === '+' || e.key === '=') zoomerFwd(1.25); else if (e.key === '-') zoomerFwd(1 / 1.25);
    e.stopPropagation(); }, true); }
lierReferencesUneFois();
