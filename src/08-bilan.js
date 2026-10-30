/* ===========================================================================
   08 — LE BILAN ANONYME ET LE CARNET DE SÉANCE (v76). Le lecteur : « comment être plus parfait ? » — Volta n'a jamais
   tourné devant celui qui le construit sur les vrais fichiers (ils ne quittent pas le PC du lecteur). Deux outils pour
   combler ce manque sans rien montrer de confidentiel :
   · LE BILAN ANONYME (⋮ › Plus) : ce que Volta a lu et jugé du plan ouvert, EN CHIFFRES — aucun repère, part number,
     numéro de câble, nom de fichier, de harness ou de client ; une référence ou un type inconnu se dit par sa FORME
     (lettres → A, chiffres → 9). Le texte se relit à l'écran tel qu'il partira, puis se copie ou s'enregistre en .txt.
   · LE CARNET DE SÉANCE (C, ou ⋮ › Plus) : une petite barre pour noter chaque hésitation pendant le travail ; la note se
     garde sur ce PC avec l'écran où l'on était (« fiche d'un disjoncteur · folio 3 », jamais le repère), et part avec le
     bilan. À l'export, tout ce qui ressemble à un nom du plan (repère, référence, câble, harness…) est masqué, y compris
     dans les notes tapées à la main.
   =========================================================================== */
'use strict';

const BILAN = { version: 'v76', erreurs: [], lecture: null, cle: 'volta.carnet' };

/* LES ERREURS DE LA PAGE, gardées depuis l'ouverture (douze au plus, chacune avec son compte) : le bilan les dit, masquées
   comme le reste — c'est souvent là que se cache ce qui casse sur un vrai fichier. */
function noterErreurPage(msg) { msg = String(msg || '').replace(/\s+/g, ' ').trim().slice(0, 160); if (!msg) return;
  const x = BILAN.erreurs.find(y => y.msg === msg); if (x) x.n++; else if (BILAN.erreurs.length < 12) BILAN.erreurs.push({ msg, n: 1 }); }
window.addEventListener('error', e => noterErreurPage(e.message || (e.error && e.error.message)));
window.addEventListener('unhandledrejection', e => noterErreurPage('promesse rejetée : ' + ((e.reason && e.reason.message) || e.reason || '')));

/* LA LECTURE D'UN FICHIER (08-fichiers l'appelle après une ouverture réussie) : son format, ses feuilles, la ligne de ses
   en-têtes, les colonnes reconnues (l'en-tête du fichier et ce que Volta y lit) et celles qu'il ne reconnaît pas. Rien de
   ses lignes. Gardée pour le plan qu'elle a ouvert (`app.nom`) : un autre plan n'en hérite pas. */
const CHAMPS_DU_BILAN = { install: 'installation', ecp: 'ECP', harness: 'harness', device1: 'équipement 1', pin1: 'borne 1', pn1: 'part number 1', desc1: 'description 1',
  cabletg: 'type de câble', cabletag: 'numéro de câble', route: 'route', device2: 'équipement 2', pin2: 'borne 2', pn2: 'part number 2', desc2: 'description 2',
  fwd: 'dessin (FWD)', length: 'longueur', appareil: 'appareil', retest: 'date' };
function noterLecture(L, r) { try {
  const lu = (L && L.lu) || {}, rt = L && L.brutes ? trouverEnteteRetest(L.brutes) : null, x = { cle: app.nom, format: r.format, entetes: r.entetes || 0, ligne: r.entete || 0,
    excel: !!(lu.feuilles && lu.feuilles.length), lues: (lu.lues || []).length, ignorees: (lu.ignorees || []).length, journaux: (lu.journaux || []).length, champs: [], inconnues: [], mm: false };
  if (rt) { const brute = L.brutes[rt.ligne], row = Array.isArray(brute) ? brute.map(v => String(v == null ? '' : v).trim()) : cellules(brute || ''), pris = new Map(Object.entries(rt.col).map(([k, i]) => [i, k]));
    row.forEach((t, i) => { if (!t) return; const k = pris.get(i); if (k) x.champs.push({ entete: t, champ: k }); else x.inconnues.push(t); });
    x.mm = rt.col.length != null && /mm/i.test(row[rt.col.length] || ''); }
  BILAN.lecture = x; } catch (_) { BILAN.lecture = null; } }

/* LE MASQUE : tout nom du plan ouvert — repères, part numbers, numéros de câble, harness, appareils, installations, ECP,
   dessins, descriptions, le nom du plan — est remplacé par ‹repère›, ‹référence›, ‹câble› ou ‹nom›, où qu'il paraisse
   (une erreur de page, un en-tête de colonne, une note du carnet). Les plus longs d'abord (« 102CB1-A » avant « 102CB1 »). */
function masqueDuPlan() { const m = new Map(), mettre = (v, mot) => { v = String(v || '').trim(); if (v.length >= 3 && !m.has(v)) m.set(v, mot); };
  verite().forEach(l => { mettre(l.de, '‹repère›'); mettre(l.vers, '‹repère›'); mettre(l.pnDe, '‹référence›'); mettre(l.pnVers, '‹référence›'); mettre(l.cable, '‹câble›');
    ['harness', 'appareil', 'install', 'ecp', 'fwd', 'plan', 'descriptionDe', 'descriptionVers'].forEach(k => mettre(l[k], '‹nom›')); });
  mettre(app.nom, '‹nom›'); mettre(app.planId, '‹nom›');
  const cles = [...m.keys()].sort((a, b) => b.length - a.length); if (!cles.length) return t => String(t || '');
  const re = new RegExp(cles.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi'), parBas = new Map([...m].map(([k, v]) => [k.toLowerCase(), v]));
  return t => String(t || '').replace(re, s => parBas.get(s.toLowerCase()) || '‹nom›'); }
// la forme d'un code : « MS3320-15 » → « AA9999-99 » (les lettres, les chiffres ; le reste tel quel)
const formeDuCode = s => String(s || '').trim().toUpperCase().replace(/[A-Z]/g, 'A').replace(/[0-9]/g, '9');
const pl = (n, mot, mots) => n + ' ' + (n > 1 ? (mots || mot + 's') : mot);
const parFormes = xs => { const c = new Map(); xs.forEach(v => { const f = formeDuCode(v); c.set(f, (c.get(f) || 0) + 1); });
  return [...c].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([f, n]) => f + ' ×' + n).join(', ') + (c.size > 8 ? ', …' : ''); };

/* LE BILAN EN TEXTE : des sections courtes, des chiffres ; chaque section se calcule à part (une qui casse le dit, les
   autres restent). */
function texteDuBilan() { const masque = masqueDuPlan(), V = verite(), N = app.norme, S = [];
  const section = (titre, f) => { let L; try { L = f(); } catch (e) { L = ['(indisponible : ' + masque(e && e.message || e) + ')']; } if (L && L.length) S.push(titre + '\n' + L.map(x => '- ' + x).join('\n')); };
  const quand = new Date(), ua = navigator.userAgent, m = /Edg\/(\d+)/.exec(ua) || /Chrome\/(\d+)/.exec(ua) || /Firefox\/(\d+)/.exec(ua);
  const nav = m ? m[0].split('/')[0].replace('Edg', 'Edge') + ' ' + m[1] : 'navigateur inconnu';
  const entete = ['VOLTA — BILAN ANONYME', `Volta ${BILAN.version} · ${quand.toLocaleDateString('fr-FR')} ${quand.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · ${nav} · fenêtre ${innerWidth} × ${innerHeight}`,
    'Aucun repère, part number, numéro de câble, nom de fichier, de harness ou de client : les noms du plan sont masqués (‹repère›, ‹référence›…).'].join('\n');

  section('LE FICHIER', () => { const x = BILAN.lecture;
    if (!V.length) return ['aucun plan ouvert'];
    if (!x || x.cle !== app.nom) return ['plan ouvert sans lecture de fichier dans cette session (l’exemple, ou un plan rouvert depuis la bibliothèque) : rouvrez le fichier pour que le bilan dise ses colonnes'];
    return [`format : ${x.format === 'retest' ? 'installation (en-têtes ligne ' + x.ligne + (x.entetes > 1 ? ', ' + x.entetes + ' blocs d’en-têtes' : '') + ')' : x.format === 'libre' ? 'tableau libre (colonnes devinées)' : x.format}`,
      x.excel ? `classeur Excel : ${pl(x.lues, 'feuille lue', 'feuilles lues')}, ${pl(x.ignorees, 'feuille laissée de côté', 'feuilles laissées de côté')}${x.journaux ? ', ' + pl(x.journaux, 'journal de Volta', 'journaux de Volta') : ''}` : 'texte (CSV ou collé)',
      x.champs.length ? `colonnes reconnues (${x.champs.length}) : ${x.champs.map(c => masque(c.entete) + ' → ' + (CHAMPS_DU_BILAN[c.champ] || c.champ)).join(' · ')}` : '',
      x.inconnues.length ? `colonnes non reconnues (${x.inconnues.length}) : ${x.inconnues.slice(0, 20).map(t => '« ' + masque(t).slice(0, 40) + ' »').join(', ')}${x.inconnues.length > 20 ? ', …' : ''} — en-têtes recopiés, à relire` : 'colonnes non reconnues : aucune',
      x.champs.some(c => c.champ === 'length') ? 'longueurs ' + (x.mm ? 'en mm (l’en-tête le dit)' : 'en m') : ''].filter(Boolean); });

  if (!V.length) return [entete, ...S].join('\n\n');

  section('LE PLAN', () => { const reps = new Set(); V.forEach(l => { reps.add(l.de); reps.add(l.vers); }); reps.delete(''); reps.delete(undefined);
    const k = { equipement: 0, disjoncteur: 0, barrette: 0, provisoire: 0, prise: 0, masse: 0, renvoi: 0 };
    reps.forEach(r => { if (VT_A_POSER.test(r)) k.provisoire++; else if (estMasse(r)) k.masse++; else if (estDisjoncteur(r)) k.disjoncteur++; else if (estBarrette(r)) k.barrette++; else if (estCoupure(r)) k.prise++; else if (typeof estRenvoi === 'function' && estRenvoi(r)) k.renvoi++; else k.equipement++; });
    const avecNum = V.filter(l => String(l.cable || '').trim()).length, numeros = new Set(V.map(l => String(l.cable || '').trim()).filter(Boolean)), lg = V.filter(l => String(l.longueur || '').trim()).length;
    const rt = V.filter(l => String(l.route || '').trim()), g = rt.filter(l => coteDeRoute(l.route) === 'gauche').length, d = rt.filter(l => coteDeRoute(l.route) === 'droite').length;
    return [`${pl(V.length, 'liaison')} · ${pl(Math.max(1, plans().length), 'folio')}`,
      `repères : ${pl(k.equipement, 'équipement')}, ${pl(k.disjoncteur, 'disjoncteur')}, ${pl(k.barrette, 'barrette')}${k.provisoire ? ' (+' + k.provisoire + ' ajoutée' + (k.provisoire > 1 ? 's' : '') + ' par Volta)' : ''}, ${pl(k.prise, 'prise')} de coupure, ${pl(k.masse, 'masse')}${k.renvoi ? ', ' + pl(k.renvoi, 'renvoi') : ''}`,
      `câbles : ${avecNum} liaisons numérotées (${numeros.size} numéros distincts${numeros.size < avecNum ? ', certains partagés' : ''}), ${V.length - avecNum} sans numéro`,
      `longueurs : ${lg} écrites, ${V.length - lg} supposées (${(app.simu || HYPOTHESES).longueur} m)`,
      `routes : ${rt.length} avec route (${g} gauche, ${d} droite${rt.length - g - d ? ', ' + (rt.length - g - d) + ' sans numéro lisible' : ''}), ${V.length - rt.length} sans route`]; });

  section('LES TYPES DE CÂBLE', () => { const types = [...new Set(V.map(l => String(l.type || '').trim()).filter(Boolean))], inconnus = types.filter(t => !cableDuType(N, t));
    const sans = V.filter(l => !String(l.type || '').trim()).length;
    return [`${pl(types.length, 'type distinct', 'types distincts')} : ${types.length - inconnus.length} dans la base des câbles, ${inconnus.length} inconnu${inconnus.length > 1 ? 's' : ''}${inconnus.length ? ' (formes : ' + parFormes(inconnus) + ')' : ''}`,
      sans ? `${pl(sans, 'liaison')} sans type` : ''].filter(Boolean); });

  section('LES RÉFÉRENCES', () => { const pns = new Map(); V.forEach(l => [[l.de, l.pnDe], [l.vers, l.pnVers]].forEach(([r, p]) => { p = String(p || '').trim(); if (p && !pns.has(p)) pns.set(p, r); }));
    const connue = (p, r) => estDisjoncteur(r) ? !!familleDuPn(p, N) : !!(familleDeNorme(N, '', p) || moduleDeReference(N, p) || (typeof familleDuPn === 'function' && familleDuPn(p, N)));
    const inc = [...pns].filter(([p, r]) => !connue(p, r)).map(([p]) => p), sansPn = new Set(); V.forEach(l => { if (l.de && !l.pnDe && !estMasse(l.de) && !VT_A_POSER.test(l.de)) sansPn.add(l.de); if (l.vers && !l.pnVers && !estMasse(l.vers) && !VT_A_POSER.test(l.vers)) sansPn.add(l.vers); });
    return [`${pl(pns.size, 'part number distinct', 'part numbers distincts')} : ${pns.size - inc.length} reconnus (connecteur, prise, module ou disjoncteur d’une famille de Volta), ${inc.length} dont Volta ne connaît pas la famille${inc.length ? ' (formes : ' + parFormes(inc) + ')' : ''}`,
      `${pl(sansPn.size, 'repère')} sans part number dans l’installation`]; });

  section('LES CONTACTS', () => { let bouts = 0, trouves = 0, main = 0, sans = 0, ko = 0;
    V.forEach(l => ['de', 'vers'].forEach(c => { const x = contactDuBout(l, c); if (!x) return; bouts++; if (x.ref) { trouves++; if (x.main) main++; } else sans++; if (x.ko) ko++; }));
    return [`${pl(bouts, 'bout à sertir', 'bouts à sertir')} : ${trouves} avec leur contact${main ? ' (dont ' + main + ' choisi' + (main > 1 ? 's' : '') + ' à la main)' : ''}, ${sans} sans contact`, ko ? `${pl(ko, 'bout')} dont la gauge sort de la table du contact` : ''].filter(Boolean); });

  section('LES DISJONCTEURS', () => { const cbs = [...new Set(V.flatMap(l => [l.de, l.vers]).filter(r => r && estDisjoncteur(r)))]; if (!cbs.length) return ['aucun'];
    let sansProfil = 0, sansCalibre = 0; cbs.forEach(nom => { const d = disjonctionDe(nom); if (d.sansProfil) sansProfil++; if (!(d.calibre > 0)) sansCalibre++; });
    const reecrits = cbs.filter(nom => typeof pnDeVolta === 'function' && pnDeVolta(nom)).length, grossis = V.filter(l => l.avant && ('volta:type' in l.avant)).length;
    return [`${pl(cbs.length, 'disjoncteur')} : ${cbs.length - sansProfil} avec un profil de charge, ${sansProfil} sans${sansCalibre ? ', ' + sansCalibre + ' sans calibre trouvé' : ''}`,
      `calibres réécrits par Volta (ils touchaient la courbe) : ${reecrits} · câbles grossis par Volta : ${grossis}`,
      `règle du calibre automatique : ${(app.simu || HYPOTHESES).calibreAuto === false ? 'coupée' : 'active'}`]; });

  section('LE CONTRÔLE', () => { const it = controleDuContrat(), ko = it.filter(x => x.niveau === 'ko').length, att = it.length - ko, g = new Map();
    it.forEach(x => { const k = (x.genre || 'autre') + '|' + x.niveau; g.set(k, (g.get(k) || 0) + 1); });
    return [`${pl(ko, 'problème')}, ${att} à voir`, ...[...g].sort((a, b) => b[1] - a[1]).map(([k, n]) => { const [genre, niv] = k.split('|'); return motDuGenre(genre, n) + ' : ' + n + (niv === 'ko' ? ' (problème)' : ' (à voir)'); })]; });

  section('LA BASE SEE', () => { const B = typeof BASE_SEE !== 'undefined' ? BASE_SEE.base : null; if (!B) return ['pas de base SEE gardée sur ce PC'];
    const tables = Object.entries(B).filter(([, v]) => Array.isArray(v) && v.length).map(([k, v]) => k + ' ' + v.length);
    let seul = 0; try { seul = seulVoltaSEE(B).length; } catch (_) { seul = 0; }
    return [`gardée sur ce PC : ${tables.join(', ') || 'vide'}`, `lignes « Seul Volta » : ${seul}`, `« ne prendre que la base SEE » : ${typeof seuleBaseSEE === 'function' && seuleBaseSEE() ? 'cochée' : 'décochée'}`]; });

  section('LES RÉGLAGES', () => { const H = app.simu || HYPOTHESES, ch = Object.keys(HYPOTHESES).filter(k => JSON.stringify(H[k]) !== JSON.stringify(HYPOTHESES[k]));
    return [ch.length ? 'hypothèses changées : ' + ch.map(k => `${k} ${JSON.stringify(HYPOTHESES[k])} → ${JSON.stringify(H[k])}`).join(' · ') : 'hypothèses : celles de Volta, inchangées']; });

  section('LES ERREURS DE LA PAGE', () => BILAN.erreurs.length ? BILAN.erreurs.map(e => masque(e.msg) + (e.n > 1 ? ' (×' + e.n + ')' : '')) : ['aucune depuis l’ouverture']);

  const notes = lireCarnet(); if (notes.length) S.push(`LE CARNET (${pl(notes.length, 'note')})\n` + notes.map(n => `- ${heureDe(n.t)} · ${n.ou} — « ${masque(n.texte).replace(/\s+/g, ' ')} »`).join('\n'));
  return [entete, ...S].join('\n\n'); }

/* ---- LE CARNET : les notes, gardées dans ce navigateur (rien ne part tout seul) ---- */
function lireCarnet() { try { const x = JSON.parse(localStorage.getItem(BILAN.cle) || '[]'); return Array.isArray(x) ? x.filter(n => n && n.texte) : []; } catch (_) { return []; } }
function ecrireCarnet(xs) { try { localStorage.setItem(BILAN.cle, JSON.stringify(xs)); return true; } catch (_) { return false; } }
const heureDe = t => { const d = new Date(t); return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); };
// l'écran où l'on est, sans un nom : le genre de l'objet ouvert, l'onglet, le folio par son rang
const MOTS_DOCS = { normes: 'Normes', bible: 'Bible', hypotheses: 'Hypothèses', nomenclature: 'Nomenclature', comprendre: 'Comment Volta réfléchit', bilan: 'Bilan anonyme', fichiers: 'Vos fichiers', see: 'base SEE', cartouche: 'Cartouche', 'deja-contrat': 'Déjà fait' };
function natureAnonyme(r) { return VT_A_POSER.test(r || '') ? 'd’une barrette ajoutée par Volta' : estMasse(r) ? 'd’une masse' : estDisjoncteur(r) ? 'd’un disjoncteur' : estBarrette(r) ? 'd’une barrette' : estCoupure(r) ? 'd’une prise de coupure' : 'd’un équipement'; }
function ecranAnonyme() { try {
  if (typeof bibliothequeOuverte === 'function' && bibliothequeOuverte()) return 'bibliothèque';
  const P = plans(), i = P.indexOf(app.plan), folio = P.length > 1 && i >= 0 ? 'folio ' + (i + 1) + ' / ' + P.length : '';
  const ins = $('inspecteur'), k = app.cible && ins && !ins.hidden ? app.cible : null;
  const ici = app.fiche ? 'document « ' + (MOTS_DOCS[app.fiche.mode] || 'sans nom') + ' »'
    : k ? (k.type === 'fil' ? 'fiche d’un câble' : 'fiche ' + natureAnonyme(k.nom))
    : app.base && app.base.ouvert ? 'récapitulatif ' + (app.base.taille === 'page' ? 'en page' : 'en moitié') + (app.base.onglet ? ', onglet ' + app.base.onglet : '') : 'plan';
  return [ici, folio].filter(Boolean).join(' · '); } catch (_) { return 'écran inconnu'; } }

/* LA BARRE DU CARNET : elle naît au-dessus du plan, en bas au milieu ; Entrée garde (Maj+Entrée va à la ligne), Échap
   ferme et rend le clavier d'où il venait. L'écran est lu à l'ouverture (là où l'hésitation est née). */
const CARNET = { ouvreur: null, ou: '' };
function ouvrirCarnet() { let el = $('carnet'); if (typeof fermerMenu === 'function') fermerMenu();
  if (!el) { el = document.createElement('div'); el.id = 'carnet'; el.className = 'carnet'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-labelledby', 'cn-titre');
    el.innerHTML = `<div class="cn-tete"><b id="cn-titre">Carnet de séance</b><span class="cn-ou" id="cn-ou"></span><button type="button" class="fi-x cn-x" id="cn-fermer" aria-label="Fermer le carnet (Échap)" data-bulle="Fermer · Échap">${ico('fermer')}</button></div>`
      + `<textarea id="cn-texte" rows="2" spellcheck="true" aria-label="La note" placeholder="Une hésitation, un chiffre qui étonne, une idée…"></textarea>`
      + `<div class="cn-pied"><span class="cn-aide"><kbd>Entrée</kbd> garde · <kbd>Échap</kbd> ferme</span><span class="cn-compte" id="cn-compte"></span><button type="button" class="btn cuivre dense" id="cn-garder">Garder la note</button></div>`;
    document.body.appendChild(el);
    $('cn-fermer').onclick = fermerCarnet; $('cn-garder').onclick = garderNote;
    $('cn-texte').addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fermerCarnet(); }
      else if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); garderNote(); } });
    el.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fermerCarnet(); } }); }
  if (el.hidden) { const a = document.activeElement; CARNET.ouvreur = a && a !== document.body && !el.contains(a) ? a : null; CARNET.ou = ecranAnonyme(); }
  $('cn-ou').textContent = CARNET.ou; compterCarnet(); el.hidden = false; el.classList.remove('entre'); void el.offsetWidth; el.classList.add('entre');
  const t = $('cn-texte'); try { t.focus({ preventScroll: true }); } catch (_) { t.focus(); } }
function compterCarnet() { const n = lireCarnet().length, c = $('cn-compte'); if (c) c.textContent = n ? pl(n, 'note') + ' dans le carnet' : ''; }
function fermerCarnet() { const el = $('carnet'); if (!el || el.hidden) return; el.hidden = true; const o = CARNET.ouvreur; CARNET.ouvreur = null;
  if (o && o.isConnected && o.getClientRects().length) { if (typeof rendreLeClavier === 'function') rendreLeClavier(o); else o.focus(); } }
function garderNote() { const t = $('cn-texte'), texte = t.value.trim(); if (!texte) { t.focus(); return; }
  const xs = lireCarnet(); xs.push({ t: Date.now(), ou: CARNET.ou || ecranAnonyme(), texte: texte.slice(0, 2000) });
  if (!ecrireCarnet(xs)) { dire('Le carnet n’a pas pu s’écrire dans ce navigateur (stockage refusé).', true); return; }
  t.value = ''; fermerCarnet(); dire('Noté dans le carnet (' + pl(xs.length, 'note') + ') — ⋮ › Plus › Bilan anonyme pour les relire.');
  if (app.fiche && app.fiche.mode === 'bilan') ficheBilan(); }
const carnetOuvert = () => { const el = $('carnet'); return !!el && !el.hidden; };

/* ---- LE DOCUMENT : le bilan tel qu'il partira, le carnet en dessous, deux gestes ---- */
function ficheBilan() { const texte = texteDuBilan(), notes = lireCarnet();
  const carnet = notes.length ? `<ol class="bl-notes">${notes.map((n, i) => `<li><div class="bl-n-tete"><span class="bl-n-quand">${esc(heureDe(n.t))}</span><span class="bl-n-ou">${esc(n.ou)}</span><button type="button" class="fi-x bl-n-x" data-note="${i}" aria-label="${escA('Effacer la note du ' + heureDe(n.t))}" data-bulle="Effacer cette note">${ico('poubelle')}</button></div><p>${esc(n.texte)}</p></li>`).join('')}</ol>`
    : `<p class="bl-vide">Le carnet est vide. Pendant le travail, appuyez sur <kbd>C</kbd> pour noter une hésitation : l’écran où vous êtes s’écrit avec elle.</p>`;
  const corps = tete('Pour améliorer Volta', 'Bilan anonyme')
    + `<p class="note bl-chapeau">Ce que Volta a lu et jugé de ce plan, en chiffres. <b>Aucun repère, part number, numéro de câble, nom de fichier, de harness ou de client</b> : les noms du plan sont masqués, une référence inconnue se dit par sa forme (lettres → A, chiffres → 9). Relisez-le, puis copiez-le dans la conversation.</p>`
    + `<pre class="bl-texte" id="bl-texte" tabindex="0" aria-label="Le bilan, tel qu’il sera copié">${esc(texte)}</pre>`
    + `<section class="bl-carnet" aria-labelledby="bl-carnet-t"><div class="bl-carnet-tete"><h3 id="bl-carnet-t">Le carnet de séance${notes.length ? ` <span class="bl-n">${notes.length}</span>` : ''}</h3><button type="button" class="btn papier dense" id="bl-noter">Noter <kbd>C</kbd></button></div>${notes.length ? '<p class="bl-masque">Vos notes restent sur ce PC telles que vous les avez tapées ; dans le bilan copié, les repères et références qu’elles nomment sont masqués.</p>' : ''}${carnet}</section>`;
  const pied = `<button type="button" class="btn cuivre" id="bl-copier">Copier le bilan${notes.length ? ' et le carnet' : ''}</button><button type="button" class="btn papier" id="bl-enregistrer">Enregistrer en .txt</button><span class="espace"></span><span class="bl-pied-note">Rien ne part tout seul : c’est vous qui collez.</span>`;
  ouvrirFiche({ mode: 'bilan', largeur: 'ample' }, corps, pied);
  $('bl-copier').onclick = () => copierBilan(texte); $('bl-enregistrer').onclick = () => enregistrerBilan(texte); $('bl-noter').onclick = ouvrirCarnet;
  document.querySelectorAll('#fiche-corps [data-note]').forEach(b => { b.onclick = () => { const xs = lireCarnet(); xs.splice(+b.dataset.note, 1); ecrireCarnet(xs); ficheBilan(); dire('Note effacée.'); }; }); }
function copierBilan(texte) { const fini = () => dire('Le bilan est copié : collez-le dans la conversation.');
  const repli = () => { const a = document.createElement('textarea'); a.value = texte; a.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); fini(); } catch (_) { dire('La copie n’a pas pu se faire : enregistrez-le en .txt.', true); } a.remove(); };
  try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texte).then(fini, repli); else repli(); } catch (_) { repli(); } }
function enregistrerBilan(texte) { const d = new Date(), j = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  telecharger(new Blob(['﻿' + texte], { type: 'text/plain;charset=utf-8' }), 'volta-bilan-anonyme-' + j + '.txt'); dire('Le bilan est enregistré en .txt.'); }

// les deux lignes du menu ⋮ › Plus (page.html, « Améliorer Volta »)
MENU = (typeof MENU !== 'undefined' && MENU) || { actions: {} };
MENU.actions.carnet = () => ouvrirCarnet();
MENU.actions.bilan = () => ficheBilan();
