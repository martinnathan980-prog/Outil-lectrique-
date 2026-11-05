/* ===========================================================================
   08 — L'HISTORIQUE DU PLAN (v86)
   ---------------------------------------------------------------------------
   L'audit (M1) : « il existe l'Historique de chaque fiche et le relevé de l'Excel, mais aucun endroit qui dise tout ce qui
   a changé, par VOLTA ou par vous, d'où ça vient, avec Défaire sur chaque ligne ». Un document — ⋮ › Historique, la
   recherche (« / »), la touche H — qui raconte le plan entier avec les mots et le dessin de l'onglet Historique des fiches
   (08-fiche, `journalDeLaFiche`, `choixEnLignes`, `ligneDuFichier`) : rien n'est réinventé, les mêmes lignes rassemblées.
     · QUOI : avant → après ; SUR QUOI : le repère, ou le câble par son type et ses deux bouts (jamais un numéro) ;
     · D'OÙ venait la valeur d'avant (votre fichier, le choix de VOLTA, la table) ; QUI a mis la nouvelle (vous, en Manuel,
       une proposition de VOLTA acceptée, VOLTA) ; QUAND (l'heure que la fiche note, `QUAND`) ;
     · « Défaire » sur chaque ligne : le même retour que la fiche, une entrée d'historique — le message offre de défaire ce
       retour ; un clic sur la ligne mène à l'objet, sur son folio ; son survol l'allume sur le plan.
   Ce que la fiche ne voyait pas : une barrette ajoutée par VOLTA qui a reçu son repère (« VT2 devient 667VT3 » : elle entre
   dans votre installation, avec son câble à créer et ses shunts) et le dessin retouché à la main, folio par folio.
   Filtrable par sorte (les mots de Modifier : votre fichier, les choix de VOLTA — et le dessin) et par folio ; une ligne dit
   ce qui part dans l'Excel corrigé et mène à son relevé (08-export).
   =========================================================================== */
'use strict';

const JOURNAL = { ouvert: false, sorte: '', folio: '', cle: '', memo: null, memoCle: '' };
const CHAMPS_DU_JOURNAL = ['type', 'longueur', 'route', 'pnDe', 'pnVers', 'contactDe', 'contactVers'];
// les sortes : celles de Modifier (08-niveaux, `SORTES_REG` : leurs mots, leurs icônes), et le dessin
const SORTES_JOURNAL = [
  ['fichier', 'Votre fichier', 'Une valeur de votre fichier a changé : elle part dans l’Excel corrigé', '<path d="M7 3.5h6.5L18 8v12.5H7z"/><path d="M13.5 3.5V8H18M10 12.5h5M10 16h5"/>'],
  ['choix', 'Choix de VOLTA', 'Un choix de VOLTA (module, arrangement, contact, raccord, consommation) : pris en Manuel, ou fait par VOLTA', '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'],
  ['dessin', 'Le dessin', 'Un bloc, une borne ou un câble déplacé à la main sur un folio', '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="m14.5 7.5 3 3"/>']];
const ICO_JOURNAL = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 4.5V8h3.5"/><path d="M12 8v4.2l2.8 1.8"/></svg>';
// une valeur qui est une phrase, pas une référence : elle ne se met pas en chasse fixe
const PHRASE_JOURNAL = /^(celui|le sien|pas écrite|sans option|vide|≈|aucune|rien)/;

/* ---- UN CÂBLE SE DIT PAR SES DEUX BOUTS (la charte : « un câble se dit par son type et ses deux bouts ») -------------- */
const boutDit = (r, b) => (r || '?') + (b ? ':' + b : '');
function boutsDuCable(l) { return l && (l.de || l.vers) ? boutDit(l.de, l.borneDe) + ' → ' + boutDit(l.vers, l.borneVers) : 'une liaison'; }
function cableParSesBouts(l) { const t = String((l && l.type) || '').trim(); return (t ? t + ' ' : '') + boutsDuCable(l); }
// le genre de fiche d'un repère (celui que `choixALaMain` attend)
const typeDuRepere = nom => estDisjoncteur(nom) ? 'disjoncteur' : VT_A_POSER.test(nom) || barretteEnModules(nom) ? 'barrette' : coupureEnModules(nom) ? 'prise' : estMasse(nom) ? 'masse' : 'equipement';

/* ---- LES BARRETTES AJOUTÉES PAR VOLTA QUI ONT REÇU LEUR REPÈRE --------------------------------------------------------
   Poser une barrette (08-interface, `poserBarrette`) l'écrit dans votre installation : un câble à créer de la borne
   dédoublée à sa borne 1, des shunts entre ses bornes, et les câbles de votre fichier qui partaient de cette borne partent
   d'elle. La mémoire des repères provisoires (`provisoires` du contrat : « 340AB1␁4 » → 2, pour VT2) la retrouve : le câble
   à créer part de cette borne vers la borne 1 d'une barrette qui a ses shunts. Rend [{ vt, nom, r, b, sur, pn, cree,
   shunts, arrivent }]. */
function barrettesPosees() { const P = app.contrat && app.contrat.provisoires; if (!P || !P.size) return [];
  const V = verite(), out = [], vus = new Set();
  P.forEach((n, k) => { const i = String(k).indexOf('\u0001'); if (i < 0) return; const r = k.slice(0, i), b = k.slice(i + 1);
    const cree = V.find(l => l.de === r && String(l.borneDe) === b && l.borneVers === '1' && !l.cable && l.vers && l.vers !== r && !VT_A_POSER.test(l.vers));
    if (!cree || vus.has(cree.vers)) return; const nom = cree.vers;
    const shunts = V.filter(l => l.de === nom && l.vers === nom), arrivent = V.filter(l => l !== cree && l.de !== l.vers && (l.de === nom || l.vers === nom));
    if (!shunts.length || !arrivent.length) return; vus.add(nom);
    out.push({ vt: 'VT' + n, nom, r, b, sur: boutDit(r, b), pn: cree.pnDe || '', cree, shunts, arrivent }); });
  return out.sort((a, c) => triNaturel(a.nom, c.nom)); }
/* La défaire : les câbles de votre fichier reviennent sur la borne qu'elle dédoublait, le câble à créer et les shunts
   sortent de l'installation ; la barrette redevient celle que VOLTA propose, sous son repère provisoire (la mémoire le
   garde). Une entrée d'historique. */
function deposerBarrette(x) { const V = verite(); if (!x || !V.includes(x.cree)) return false;
  histPush(x.nom + ' redevient ' + x.vt);
  x.arrivent.forEach(l => { if (l.de === x.nom) { l.de = x.r; l.borneDe = x.b; l.pnDe = x.pn; } if (l.vers === x.nom) { l.vers = x.r; l.borneVers = x.b; l.pnVers = x.pn; } });
  const partent = new Set([x.cree, ...x.shunts]); for (let i = V.length - 1; i >= 0; i--) if (partent.has(V[i])) V.splice(i, 1);
  if (app.cible && app.cible.type === 'bloc' && app.cible.nom === x.nom) { app.cible = null; app.choisi = null; }
  apresEdition(); return true; }
/* LUI DONNER SON REPÈRE (G2 : un seul verbe, partout) : la barrette ajoutée reçoit le repère proposé — celui du
   récapitulatif et de « À reprendre » (`prochainRepereVT`, la suite de la barrette du contrat la plus proche), ou celui que
   vous écrivez — ; le message dit lequel (« VT2 devient 667VT3 ») et offre « Défaire ». Rend le repère donné, ou ''. */
function donnerSonRepere(vt, plan, repere) { const r = (typeof reperes === 'function' ? reperes() : []).find(x => x.aPoser && x.nom === vt && (!plan || !x.plan || x.plan === plan));
  if (r && r.plan && r.plan !== app.plan && plans().includes(r.plan)) allerAuPlan(r.plan);
  const nom = String(repere || (r && typeof prochainRepereVT === 'function' ? prochainRepereVT(r) : '')).trim(); if (!nom) return '';
  const n = liaisonsDuPlan().filter(l => l.aPoser === vt && l.de === vt && l.vers === vt).length;
  if (!poserBarrette(vt, nom)) return '';
  dire(`${vt} devient ${nom} : elle entre dans votre installation, avec un câble à créer et ${pluriel(n, 'shunt')}.`, false, { geste: 'Défaire', faire: defaire });
  return nom; }

/* ---- LE DESSIN RETOUCHÉ À LA MAIN, folio par folio (les retouches : 08-interface, `app.retouches`) ------------------- */
function retouchesDuPlan() { if (!app.retouches || !app.retouches.size) return []; const out = [];
  (plans().length ? plans() : ['*']).forEach(p => { const L = liaisonsDe(p); if (!L.length) return; const cle = clePlacement(L), P = app.retouches.get(cle); if (!P) return;
    const C = consignesDe(P), comps = P.comps || [], blocs = comps.filter(c => c.main && c.kind !== 'tag').map(c => c.name).sort(triNaturel);
    const bornes = comps.reduce((n, c) => n + Object.values(c.rangs || {}).flat().filter(q => q && q.ya != null).length, 0);
    out.push({ plan: p, cle, blocs, bornes, fils: C.fils.length + C.barrettes.length }); });
  return out; }
const signatureDuDessin = d => 'dessin|' + d.plan + '|' + d.blocs.join(',') + '|' + d.bornes + '|' + d.fils;
// rendre un folio au dessin automatique (Ctrl+Z, ou « Défaire » du message, rend les retouches)
function rendreLeDessin(d) { if (!d || !app.retouches.has(d.cle)) return false;
  histPush(d.plan === app.plan ? 'retouche de ce folio' : 'retouche du folio ' + d.plan, true); app.retouches.delete(d.cle); garderRetouche(d.cle); rafraichirDessin(); return true; }

/* ---- LES LIGNES ---------------------------------------------------------------------------------------------------
   Chacune : { quoi, sur (l'objet, en mots), surId (en chasse fixe), de, avant, depuis, apres, qui, t, mono, faire, aide,
   dit, pourquoi, excel, action ({ mot, aide, faire } : un geste à la place de Défaire), objet ({ bloc, plan } · { fil } ·
   { plan }), folios, sorte }. */
function lignesDuJournal() { const V = verite(), C = app.contrat, xs = [];
  if (typeof noterHeures === 'function') noterHeures();
  const folioDe = l => { try { return typeof foliosDe === 'function' ? foliosDe(l) : (l.plan ? [l.plan] : []); } catch (_) { return l.plan ? [l.plan] : []; } };
  const folios = ls => [...new Set(ls.flatMap(folioDe).filter(f => f != null && f !== '').map(String))].sort(triNaturel);
  const duRepere = nom => { try { return foliosDuRepere(nom); } catch (_) { return []; } };
  // 1. LES VALEURS DE VOTRE FICHIER RÉÉCRITES — une ligne par changement (le même, sur plusieurs câbles d'un objet : une)
  let ecrits = []; try { ecrits = changementsEcrits(V.filter(l => l.avant && liaisonComplete(l)).map(l => [l, CHAMPS_DU_JOURNAL])); } catch (_) { ecrits = []; }
  ecrits.forEach(x => { const [l, c] = x.rendre[0] || []; if (!l) return; let y; try { y = ligneDuFichier(x, { type: 'fil' }); } catch (_) { return; }
    const pn = /^pn/.test(c), ct = /^contact/.test(c), rep = c === 'pnDe' || c === 'contactDe' ? l.de : c === 'pnVers' || c === 'contactVers' ? l.vers : '', autres = x.rendre.length - 1;
    const sur = pn ? rep : ct ? boutDit(rep, c === 'contactDe' ? l.borneDe : l.borneVers) : (c === 'type' ? boutsDuCable(l) : cableParSesBouts(l)) + (autres > 0 ? ' (et ' + pluriel(autres, 'autre') + ')' : '');
    const dit = pn || ct ? y.dit : c === 'type' ? `Le câble ${boutsDuCable(l)} revient en ${y.avant}, comme dans votre fichier.` : `${majuscule(y.quoi)} de ${cableParSesBouts(l)} : ${y.avant}, ${y.depuis === 'hyp' ? 'supposée' : 'comme dans votre fichier'}.`;
    xs.push({ ...y, de: '', sur, surId: true, dit, objet: pn || ct ? { bloc: rep } : { fil: l }, folios: pn || ct ? duRepere(rep) : folios(x.rendre.map(r => r[0])), sorte: ct ? 'choix' : 'fichier', champ: c, rep }); });
  // 2. LES CHOIX DE VOLTA pris en Manuel, et ce que VOLTA retient de lui-même (un module), repère par repère — seulement
  // ceux qui portent un choix écrit, et les barrettes (le module de votre fichier écarté)
  const presents = new Set(reperesDe(V)), candidats = new Set(), prendre = k => { const r = String(k).split('|')[0]; if (r && r !== 'sertir' && presents.has(r)) candidats.add(r); };
  [C.designations, C.sexes, C.raccords, C.charges].forEach(M => { if (M) [...M.keys()].forEach(prendre); });
  presents.forEach(r => { try { if (!VT_A_POSER.test(r) && barretteEnModules(r)) candidats.add(r); } catch (_) { } });
  [...candidats].filter(r => !VT_A_POSER.test(r) && !estRenvoi(r) && !estRail(r)).sort(triNaturel).forEach(nom => { let ch = []; try { ch = choixEnLignes(nom, typeDuRepere(nom)); } catch (_) { ch = []; }
    ch.forEach(x => { const ligne = { ...x, sur: nom, surId: true, objet: { bloc: nom }, folios: duRepere(nom), sorte: x.calibre ? 'fichier' : 'choix', rep: nom };
      // un calibre retenu à la main réécrit la référence du disjoncteur : une seule ligne, celle du calibre (comme la fiche)
      if (x.calibre) { const k = xs.findIndex(y => y.rep === nom && /^pn/.test(y.champ || '')); if (k >= 0) { const p = xs[k]; ligne.excel = true; ligne.pourquoi = 'Le plus petit qui ne disjoncte pas est ' + x.avant + '. Sa référence devient ' + p.apres + ' (votre fichier : ' + p.avant + ') dans l’Excel corrigé.'; xs.splice(k, 1); } }
      xs.push(ligne); }); });
  // 3. CE QUE VOLTA AJOUTE : une barrette sur une borne qui reçoit plusieurs câbles — son geste, lui donner son repère
  (typeof reperes === 'function' ? reperes() : []).filter(r => r.aPoser).forEach(r => { const sur = String(r.sous || '').replace(/^ajoutée par VOLTA sur /, '');
    xs.push({ cle: '', t: 0, quoi: 'Barrette ajoutée', sur: r.nom, surId: true, de: sur ? 'sur ' + sur : '', avant: 'aucune', depuis: 'fichier', apres: r.nom, qui: 'volta', mono: true, objet: { bloc: r.nom, plan: r.plan }, folios: r.plan ? [String(r.plan)] : [], sorte: 'choix',
      pourquoi: 'Votre fichier met plusieurs câbles sur ' + (sur || 'une même borne') + ' : VOLTA les relie par une barrette. Elle entre dans votre installation quand elle reçoit son repère.',
      action: { mot: 'Lui donner son repère', aide: 'Elle prend ' + (typeof prochainRepereVT === 'function' ? prochainRepereVT(r) : 'le repère que VOLTA propose') + ', le repère que VOLTA propose — « Défaire » le rend provisoire', faire: () => donnerSonRepere(r.nom, r.plan) } }); });
  // 4. … ET QUI A REÇU SON REPÈRE : elle est dans votre installation (ses lignes partent dans l'Excel corrigé)
  barrettesPosees().forEach(p => { const k = 'p|' + p.vt + '|' + p.nom, n = 1 + p.shunts.length;
    xs.push({ cle: k, t: heureDuChangement(k), quoi: 'Repère donné', sur: p.nom, surId: true, de: 'barrette ajoutée par VOLTA sur ' + p.sur, avant: p.vt, depuisMot: 'repère provisoire', apres: p.nom, qui: 'vous', mono: true, excel: true, objet: { bloc: p.nom }, folios: duRepere(p.nom), sorte: 'fichier',
      pourquoi: `Elle est dans votre installation : ${p.arrivent.length > 1 ? 'les ' + p.arrivent.length + ' câbles' : 'le câble'} de ${p.sur} y arrive${p.arrivent.length > 1 ? 'nt' : ''}, avec un câble à créer et ${pluriel(p.shunts.length, 'shunt')} — ${pluriel(n, 'ligne')} de plus dans l’Excel corrigé.`,
      faire: () => deposerBarrette(p), aide: 'Elle redevient ' + p.vt + ' : les câbles reviennent sur ' + p.sur + ', le câble à créer et les shunts sortent de votre installation', dit: p.nom + ' redevient ' + p.vt + ' : les câbles reviennent sur ' + p.sur + '.' }); });
  // 5. LE DESSIN, folio par folio
  retouchesDuPlan().forEach(d => { const k = signatureDuDessin(d), nb = d.blocs.length, f = d.plan === '*' ? '' : String(d.plan);
    const morceaux = [nb ? pluriel(nb, 'bloc') + ' déplacé' + (nb > 1 ? 's' : '') : '', d.bornes ? pluriel(d.bornes, 'borne') + ' déplacée' + (d.bornes > 1 ? 's' : '') : '', d.fils ? pluriel(d.fils, 'câble') + ' retracé' + (d.fils > 1 ? 's' : '') : ''].filter(Boolean);
    xs.push({ cle: k, t: heureDuChangement(k), quoi: 'Le dessin', sur: f ? 'folio ' + f : 'le folio', surId: false, de: '', avant: 'celui de VOLTA', depuisMot: 'dessin automatique', apres: morceaux.length ? etListe(morceaux) : 'retouché', qui: 'vous', mono: false, objet: { plan: d.plan }, folios: f ? [f] : [], sorte: 'dessin',
      pourquoi: nb ? (nb > 1 ? 'Déplacés à la main : ' : 'Déplacé à la main : ') + etListe(d.blocs.slice(0, 6)) + (nb > 6 ? ' et ' + (nb - 6) + ' autres' : '') + '.' : '',
      faire: () => rendreLeDessin(d), aide: 'Rendre ' + (f ? 'le folio ' + f : 'ce folio') + ' au dessin automatique de VOLTA', dit: 'Le dessin automatique revient sur ' + (f ? 'le folio ' + f : 'ce folio') + '.' }); });
  // le plus récent en haut ; sans heure connue, après, dans l'ordre où ils viennent
  return xs.map((x, i) => [x, i]).sort((a, b) => (b[0].t || 0) - (a[0].t || 0) || a[1] - b[1]).map(a => a[0]); }
// ce que le journal lit : quand cela change, il se refait
const cleDuJournal = () => { try { const C = app.contrat, J = M => JSON.stringify([...(M || [])]);
  return [app.planId, verite().length, signature(verite()), JSON.stringify(verite().map(l => l.avant || 0)), J(C.designations), J(C.sexes), J(C.raccords), J(C.charges), J(C.provisoires),
    JSON.stringify(retouchesDuPlan().map(signatureDuDessin)), typeof QUAND !== 'undefined' && QUAND.m ? J(QUAND.m) : ''].join('\u0002'); } catch (_) { return String(Date.now()); } };
function journalDuPlan() { const k = cleDuJournal(); if (JOURNAL.memo && JOURNAL.memoCle === k) return JOURNAL.memo;
  let xs = []; try { xs = lignesDuJournal(); } catch (e) { xs = []; if (typeof console !== 'undefined') console.warn(e); }
  JOURNAL.memo = xs; JOURNAL.memoCle = cleDuJournal(); return xs; }
// pour le menu : « 3 changements », ou rien
const motDuJournal = () => { const n = verite().length ? journalDuPlan().length : 0; return n ? (n > 1 ? n + ' changements' : '1 changement') + ' · Défaire' : 'rien n’a changé'; };

/* ---- LE DOCUMENT ---------------------------------------------------------------------------------------------------
   La coquille des documents (08-interface : la tête, le chapeau) ; une ligne dit ce qui part dans l'Excel corrigé ; deux
   filtres — la sorte, le folio — qui ne paraissent que s'ils trient quelque chose ; puis les jours, du plus récent : une
   carte par changement, celle de l'onglet Historique des fiches. */
const heureDit = t => { const d = new Date(t); return d.getHours() + ' h ' + String(d.getMinutes()).padStart(2, '0'); };
function jourDuJournal(x) { if (!x.t) return x.qui === 'volta' ? ['zz', 'À la lecture de votre fichier', 'Ce que VOLTA a fait de lui-même en lisant votre fichier'] : ['zy', 'Plus tôt', 'L’heure de ces changements n’a pas été gardée dans ce navigateur'];
  const d = new Date(x.t), j = new Date(), meme = (a, b) => a.toDateString() === b.toDateString(), h = new Date(j); h.setDate(j.getDate() - 1);
  const cle = 'a' + (9e12 - d.setHours(0, 0, 0, 0)), d0 = new Date(x.t);
  return [cle, meme(d0, j) ? 'Aujourd’hui' : meme(d0, h) ? 'Hier' : 'Le ' + d0.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', ...(d0.getFullYear() !== j.getFullYear() ? { year: 'numeric' } : {}) }), ''];
}
const quiDuJournal = x => x.quiMot || (x.qui === 'vous' && x.auto ? 'en Manuel, par vous' : (typeof MOTS_QUI !== 'undefined' && MOTS_QUI[x.qui]) || '');
const depuisDuJournal = x => x.depuisMot || (typeof MOTS_DEPUIS !== 'undefined' && MOTS_DEPUIS[x.depuis]) || '';
const ouDuJournal = x => !x.folios || !x.folios.length ? '' : x.folios.length > 3 ? x.folios.length + ' folios' : 'f. ' + x.folios.join(', ');
function ligneJournalHtml(x, i) { const val = (v, mono, b) => `<${b ? 'b' : 's'}${mono ? ' class="id"' : ''}>${insecable(esc(v))}</${b ? 'b' : 's'}>`, ou = ouDuJournal(x);
  const manuel = x.qui === 'vous' && x.auto;
  return `<li class="hi-i jo-i ${esc(x.qui)}${manuel ? ' manuel' : ''}" data-jo="${i}">`
    + `<div class="hi-t"><b>${esc(x.quoi)}</b> <button type="button" class="jo-sur${x.surId ? ' id' : ''}" data-jo-va="${i}" data-bulle="${escA('Le voir sur le plan' + (ou ? ' (' + ou.replace(' ', ' ') + ')' : ''))}">${esc(x.sur)}</button>${x.de ? ` <span class="jo-de">${esc(x.de)}</span>` : ''}</div>`
    + `<span class="hi-q jo-q">${ou ? `<span class="jo-f">${esc(ou)}</span>` : ''}${x.t ? `<time datetime="${new Date(x.t).toISOString()}" data-bulle="${escA(typeof quandDit === 'function' ? majuscule(quandDit(x.t)) : '')}">${esc(heureDit(x.t))}</time>` : ''}</span>`
    + `<div class="hi-v"><span class="hi-av">${val(x.avant, x.mono && !PHRASE_JOURNAL.test(x.avant))}<small>${esc(depuisDuJournal(x))}</small></span><span class="hi-f" aria-hidden="true">${ico('fleche')}</span>`
    + `<span class="hi-ap">${val(x.apres, x.mono && !PHRASE_JOURNAL.test(x.apres), true)}<small>${esc(quiDuJournal(x))}${x.excel ? '<i class="jo-xl" data-bulle="Part dans l’Excel corrigé"> · dans l’Excel</i>' : ''}</small></span></div>`
    + (x.faire ? `<button type="button" class="hi-d" data-jo-d="${i}" data-bulle="${escA(x.aide || 'Défaire ce changement')}">${ico('retour')}<span>Défaire</span></button>`
      : x.action ? `<button type="button" class="hi-d jo-agir" data-jo-a="${i}" data-bulle="${escA(x.action.aide || '')}">${esc(x.action.mot)}</button>` : '')
    + (x.pourquoi ? `<p class="hi-p">${insecable(esc(x.pourquoi))}</p>` : '') + '</li>'; }
// ce qui part dans l'Excel corrigé, en une ligne (le relevé le détaille : 08-export)
function excelDuJournal() { let R; try { R = changementsDuRetest(); } catch (_) { return ''; } const np = R.proposes.length, poses = barrettesPosees();
  const morceaux = [R.cases ? pluriel(R.cases, 'case') + (R.liaisons ? ' sur ' + pluriel(R.liaisons, 'liaison') : '') : '', poses.length ? (poses.length > 1 ? poses.length + ' barrettes ajoutées et leurs lignes' : 'la barrette ' + poses[0].nom + ' et ses lignes') : ''].filter(Boolean);
  if (!morceaux.length && !np) return '';
  const att = np ? `<span class="jo-att">${np > 1 ? np + ' choix de VOLTA pas encore écrits' : '1 choix de VOLTA pas encore écrit'}</span>` : '';
  return `<div class="jo-excel" role="note"><span class="jo-excel-i" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8.5 13h7M8.5 16.5h4"/></svg></span>`
    + `<p><b>Dans l’Excel corrigé</b>${morceaux.length ? ' : ' + esc(etListe(morceaux)) : ' : votre fichier tel quel pour l’instant'}${att ? ' · ' + att : ''}</p>`
    + `<button type="button" class="btn papier dense" id="jo-releve" data-bulle="Le relevé : chaque case qui part, ce qu’elle disait avant, d’où vient le changement — puis l’Excel s’enregistre">Relire ce qui part</button></div>`; }
function journalHtml(arrive) { const X = journalDuPlan(), S = JOURNAL;
  let k = 0; const entre = () => arrive ? ` entre-v" style="--k:${++k}` : '';
  // un filtre qui ne trie plus rien (le dernier changement de sa sorte défait) se relâche
  if (S.sorte && !X.some(x => x.sorte === S.sorte)) S.sorte = ''; if (S.folio && !X.some(x => x.folios.includes(S.folio))) S.folio = '';
  const parSorte = x => !S.sorte || x.sorte === S.sorte, parFolio = x => !S.folio || x.folios.includes(S.folio), vus = X.filter(x => parSorte(x) && parFolio(x));
  const nV = X.filter(x => x.qui === 'volta' || x.qui === 'prop').length;
  const intro = X.length ? `Ce qui a changé dans ce plan depuis votre fichier : ${pluriel(X.length, 'changement')}${nV ? (nV === X.length ? (X.length > 1 ? ', tous de VOLTA' : ', de VOLTA') : ', dont ' + nV + ' de VOLTA') : ''}. Le plus récent en haut ; un clic sur une ligne mène à l’objet.`
    : 'Rien n’a changé : ce plan est votre fichier tel que VOLTA l’a lu. Chaque changement, par vous ou par VOLTA, s’écrira ici, avec « Défaire ».';
  // les filtres : les sortes présentes (Tout en tête), les folios qui portent un changement
  const sortes = SORTES_JOURNAL.filter(([s]) => X.some(x => x.sorte === s)), fols = [...new Set(X.flatMap(x => x.folios))].sort(triNaturel);
  const seg = sortes.length > 1 ? `<div class="jo-seg" role="group" aria-label="La sorte de changement" style="--n:${sortes.length + 1}">`
    + [['', 'Tout', 'Tous les changements', '']].concat(sortes).map(([s, mot, aide, svg]) => `<button type="button" class="jo-seg-b" data-jo-sorte="${s}" aria-pressed="${S.sorte === s}" data-bulle="${escA(aide)}">${svg ? `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${svg}</svg>` : ''}<span>${esc(mot)}</span><b>${X.filter(x => (!s || x.sorte === s) && parFolio(x)).length}</b></button>`).join('') + '</div>' : '';
  const folio = fols.length > 1 ? `<div class="jo-fol" role="group" aria-label="Le folio"><span class="jo-fol-k">Folio</span>`
    + [['', 'Tous']].concat(fols.map(f => [f, f])).map(([f, mot]) => `<button type="button" class="jo-fol-b" data-jo-folio="${escA(f)}" aria-pressed="${S.folio === f}" data-bulle="${escA(f ? 'Les changements du folio ' + f : 'Tous les folios')}">${esc(mot)}<b>${X.filter(x => (!f || x.folios.includes(f)) && parSorte(x)).length}</b></button>`).join('') + '</div>' : '';
  const filtres = seg || folio ? `<div class="jo-filtres${entre()}">${seg}${folio}</div>` : '';
  // les jours, du plus récent ; sans heure, « Plus tôt », puis ce que VOLTA a fait en lisant votre fichier
  const jours = new Map(); vus.forEach(x => { const [cle, titre, bulle] = jourDuJournal(x); const j = jours.get(cle) || jours.set(cle, { titre, bulle, xs: [] }).get(cle); j.xs.push(x); });
  const liste = [...jours.entries()].sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0).map(([, j]) => `<section class="jo-jour${entre()}"><h3 class="sous-titre jo-st"${j.bulle ? ` data-bulle="${escA(j.bulle)}"` : ''}>${esc(j.titre)}<small>${j.xs.length}</small></h3>`
    + `<ol class="hi-l jo-l">${j.xs.map(x => ligneJournalHtml(x, X.indexOf(x))).join('')}</ol></section>`).join('');
  return tete(nomAffichePlan() + ' · tout le plan', 'Historique') + `<p class="note jo-intro">${esc(intro)}</p>` + (X.length ? excelDuJournal() : '') + filtres
    + (X.length && !vus.length ? `<p class="jo-rien">Rien de cette sorte ici. <button type="button" class="fi-lien" data-jo-tout>Tout voir</button></p>` : '') + `<div class="jo">${liste}</div>`; }
function rendreJournal(ouvrir) { if (!ouvrir && (!JOURNAL.ouvert || !app.fiche || app.fiche.mode !== 'journal')) { JOURNAL.ouvert = false; return; }
  const corps = $('fiche-corps'), haut = corps && app.fiche && app.fiche.mode === 'journal' ? corps.scrollTop : 0;
  ouvrirFiche({ mode: 'journal', large: true }, journalHtml(!!ouvrir), '');
  JOURNAL.cle = cleDuJournal(); if (corps && !ouvrir) corps.scrollTop = haut; lierJournal(); }
// ⋮ › Historique, la recherche, la touche H (une seconde fois : il se ferme)
function ficheJournal() { if (!verite().length) { dire('Aucun plan ouvert : rien n’a encore changé.'); return null; } JOURNAL.ouvert = true; rendreJournal(true); return true; }
function basculerJournal() { if (app.fiche && app.fiche.mode === 'journal') { fermerFiche(true); return; } ficheJournal(); }
// le journal ouvert suit le plan : un geste, un Défaire, un Ctrl+Z le refont (le contrôle l'appelle, par `suivreLeReleve`)
function suivreLeJournal() { if (!JOURNAL.ouvert) return; if (!app.fiche || app.fiche.mode !== 'journal') { JOURNAL.ouvert = false; return; }
  if (cleDuJournal() !== JOURNAL.cle) rendreJournal(); }
// après un geste du journal : le message, et « Défaire » qui rend le geste et rouvre le journal là où il était
function direDuJournal(mot) { const rouvrir = () => { if (verite().length) { JOURNAL.ouvert = true; rendreJournal(true); } };
  dire(mot, false, { geste: 'Défaire', faire: () => { const q = defaire(); if (q) setTimeout(rouvrir, 0); } }); }
function allerALObjet(x) { const o = x.objet || {}; fermerFiche();
  if (o.fil) { montrerFil(o.fil); return; }
  if (o.bloc) { if (o.plan && o.plan !== app.plan && plans().includes(o.plan)) allerAuPlan(o.plan); montrerBloc(o.bloc); return; }
  if (o.plan != null && o.plan !== '*' && plans().includes(o.plan)) allerAuPlan(o.plan); }
function lierJournal() { const box = $('fiche-corps'), X = JOURNAL.memo || [];
  const rel = $('jo-releve'); if (rel) rel.onclick = () => { if (typeof exporterRetestCorrige === 'function') exporterRetestCorrige(); };
  box.querySelectorAll('[data-jo-sorte]').forEach(b => b.onclick = () => { JOURNAL.sorte = b.dataset.joSorte; rendreJournal(); const n = $('fiche-corps').querySelector(`[data-jo-sorte="${CSS.escape(JOURNAL.sorte)}"]`); if (n) n.focus({ preventScroll: true }); });
  box.querySelectorAll('[data-jo-folio]').forEach(b => b.onclick = () => { JOURNAL.folio = b.dataset.joFolio; rendreJournal(); const n = $('fiche-corps').querySelector(`[data-jo-folio="${CSS.escape(JOURNAL.folio)}"]`); if (n) n.focus({ preventScroll: true }); });
  box.querySelectorAll('[data-jo-tout]').forEach(b => b.onclick = () => { JOURNAL.sorte = ''; JOURNAL.folio = ''; rendreJournal(); });
  box.querySelectorAll('[data-jo-d]').forEach(b => b.onclick = e => { e.stopPropagation(); const x = X[+b.dataset.joD]; if (!x || typeof x.faire !== 'function') return;
    const avant = app.hist.length; x.faire(); if (app.hist.length !== avant || app.hist.length >= 40) direDuJournal(x.dit || 'Défait.'); });
  box.querySelectorAll('[data-jo-a]').forEach(b => b.onclick = e => { e.stopPropagation(); const x = X[+b.dataset.joA]; if (x && x.action) x.action.faire(); });
  // la ligne mène à l'objet ; son survol l'allume sur le plan, quand il est sur le folio montré
  box.querySelectorAll('[data-jo-va]').forEach(b => b.onclick = e => { e.stopPropagation(); const x = X[+b.dataset.joVa]; if (x) allerALObjet(x); });
  box.querySelectorAll('.jo-i').forEach(li => { const x = X[+li.dataset.jo]; if (!x) return;
    li.onclick = e => { if (e.target.closest('button, a, input, summary')) return; allerALObjet(x); };
    li.onmouseenter = () => { const o = x.objet || {}; try { if (o.bloc && app.dessin && app.dessin.compDe.get(o.bloc)) allumerBloc(o.bloc); else if (o.fil) { const k = cleFil(o.fil); if (k) allumerCle(k); } } catch (_) { } };
    li.onmouseleave = () => { try { rallumer(); } catch (_) { } }; });
  if (typeof lierBullesDoc === 'function') lierBullesDoc(); }
// le menu ⋮ : son geste, et le compte dessous, relu quand le menu s'ouvre
MENU = (typeof MENU !== 'undefined' && MENU) || { actions: {} };
MENU.actions.historique = (...a) => (typeof surLePlan === 'function' ? surLePlan(ficheJournal) : ficheJournal)(...a);
function majMenuJournal() { const s = document.getElementById('mn-historique'); if (!s) return; let t = ''; try { t = motDuJournal(); } catch (_) { t = ''; } if (t && s.textContent !== t) s.textContent = t; }
if (typeof document !== 'undefined') document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('#btnMenu')) majMenuJournal(); }, true);
