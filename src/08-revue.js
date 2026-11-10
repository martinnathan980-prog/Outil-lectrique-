'use strict';
/* ===========================================================================
   08 — LA REVUE (v88) : le fil conducteur.

   Le lecteur, à l'état des lieux du 9 novembre 2026 : « Pas de fil conducteur : il faut le faire. » Après l'ouverture,
   VOLTA disait « 11 à régler » et laissait chercher. La Revue les fait passer UN PAR UN, comme une boîte de réception
   qu'on vide :

       REVUE  3 / 11   102CB1 · Consommation de 104LP1 à écrire      [ Écrire la consommation de 104LP1 ⏎ ]  [ Passer P ]  ×

   · Elle se tient dans une bande fine, sous la barre du haut, sur toute la largeur : le point s'y lit en entier, et rien
     ne la recouvre (le plan, le rail et les fiches commencent dessous : le jeton --entete grandit de sa hauteur).
   · Chaque point ouvre sa fiche au bon endroit (08-controle, `allerAuControle`) ; son geste est celui de la fiche et du
     récapitulatif (08-recap, `rangDuPoint`) : Entrée le fait. Un point réglé s'en va seul : la Revue passe au suivant.
   · P passe au suivant sans régler (Maj+P revient) ; Échap, fiche fermée, quitte.
   · D'abord ce qui est À RÉGLER (ce qui a un geste, ou un problème) ; puis, si l'on veut, ce qui est À VOIR.
   · À la fin : ce qui a été réglé, ce qui a été passé, et « Relire ce qui part » — l'Excel corrigé (08-export).

   Proposée, jamais imposée : le message d'ouverture d'un fichier, le panneau Repères, la recherche (« revue »), la touche V.
   =========================================================================== */
const REVUE = { on: false, phase: 'regler', cle: '', debut: new Set(), passes: new Set(), fin: false, saut: 0, clavier: 0, geste: 0, lie: false };
const estARegler = x => typeof rangDuPoint === 'function' ? !!rangDuPoint(x).regler : x.niveau === 'ko';
/* La clé d'un point pour la Revue : son genre, son repère, sa phrase SANS ses nombres — « le courant de 3 câbles en
   dépend » devient « de 2 câbles » quand on en règle un : c'est le même point, pas un point réglé. Un nombre seul, pas les
   chiffres d'un repère ni d'une borne (104LP1, 300XC1:A5 restent : deux points qui ne diffèrent que par là sont deux points). */
const cleDeRevue = x => (x.genre || '') + '|' + (x.nom || '') + '|' + String(x.texte || '').replace(/(^|[\s(])\d+(?:[.,]\d+)?(?=[\s),;.]|$)/g, '$1#');
const listeDeLaRevue = () => { let X = []; try { X = pointsDansLOrdre(); } catch (_) { X = []; } return X.filter(x => estARegler(x) === (REVUE.phase !== 'voir')); };
const pointDeLaRevue = () => listeDeLaRevue().find(x => cleDeRevue(x) === REVUE.cle) || null;
// ce qui a été réglé depuis le début : les points du départ qui n'y sont plus
const reglesDeLaRevue = () => { const ici = new Set(listeDeLaRevue().map(cleDeRevue)); return [...REVUE.debut].filter(k => !ici.has(k)).length; };
/* Un point, en une phrase : ce qui cloche (les mots de la fiche), puis sa suite — « Consommation de 104LP1 à écrire », « le
   courant de 3 câbles en dépend ». Un câble se dit d'abord (« DR20 vers 103RL1:A1 »), sa raison ensuite. `long` : tout. */
function motsDeLaRevue(x) { const t = majuscule(typeof motDuProbleme === 'function' ? motDuProbleme(x.texte) : x.texte).replace(/[.]\s*$/, ''), k = t.indexOf(' — ');
  const tete = k > 0 ? t.slice(0, k) : t, queue = k > 0 ? t.slice(k + 3) : '', cable = /^(\S+ vers \S+(?: \(par [^)]+\))?) : (.+)$/.exec(tete);
  return cable ? { titre: cable[1], suite: cable[2] + (queue ? ' — ' + queue : ''), long: t } : { titre: tete, suite: queue, long: t }; }
// son geste : celui qui le règle (le même que sa fiche) ; sans geste, ce qu'il faut faire, en mots
function gesteDeLaRevue(x) { let g = null; try { g = typeof rangDuPoint === 'function' ? rangDuPoint(x).geste : null; } catch (_) { g = null; }
  return g && g.mot && typeof g.faire === 'function' ? g : null; }

function commencerLaRevue(phase) { if (!verite().length) { dire('Aucun plan ouvert : ouvrez un fichier, puis commencez la revue.'); return; }
  REVUE.phase = phase === 'voir' ? 'voir' : 'regler'; const L = listeDeLaRevue();
  if (!L.length && REVUE.phase === 'regler') { REVUE.phase = 'voir'; const V = listeDeLaRevue(); REVUE.phase = 'regler';
    if (!V.length) { dire('Rien à reprendre : le contrôle ne relève rien. Le plan est prêt à exporter.', false, { geste: 'Relire ce qui part', faire: () => relireCeQuiPart() }); return; } }
  REVUE.on = true; REVUE.fin = !L.length; REVUE.debut = new Set(L.map(cleDeRevue)); REVUE.passes = new Set(); REVUE.cle = L.length ? cleDeRevue(L[0]) : '';
  poserLaBandeDeRevue(true); lierLaRevue(); if (L.length) montrerLePointDeLaRevue(); else rendreLaRevue(); }
function quitterLaRevue() { if (!REVUE.on) return; REVUE.on = false; clearTimeout(REVUE.saut); const el = $('revue'); if (el) { el.hidden = true; el.innerHTML = ''; } poserLaBandeDeRevue(false); }
// la bande prend sa place sous la barre du haut : tout ce qui commence dessous (le plan, le rail, les fiches) descend d'autant
function poserLaBandeDeRevue(oui) { const R = document.documentElement; if (R.classList.contains('en-revue') === !!oui) return; R.classList.toggle('en-revue', !!oui);
  try { if (typeof ajuster === 'function') ajuster(true); if (typeof dessinerLien === 'function') dessinerLien(); } catch (_) { } }
const relireCeQuiPart = () => { quitterLaRevue(); if (MENU && MENU.actions && MENU.actions.retestcorrige) MENU.actions.retestcorrige(); };
// le point courant : sa fiche, au bon endroit ; P repartira de lui
function montrerLePointDeLaRevue() { const x = pointDeLaRevue(); rendreLaRevue(); if (!x) return;
  try { const X = pointsDansLOrdre(); CONTROLE.pas = { cle: clePoint(x), rang: X.indexOf(x) }; allerAuControle(x); } catch (_) { }
  clavierALaRevue(); }
/* LE CLAVIER REVIENT À LA BANDE : la fiche qui s'ouvre prend le clavier — Entrée y presserait un de ses boutons. Le geste de
   la revue le reprend (son contour le montre) : Entrée le fait, pour de bon ; sans geste, « Passer ». */
function clavierALaRevue() { clearTimeout(REVUE.clavier); REVUE.clavier = setTimeout(() => { const el = $('revue'); if (!REVUE.on || !el || el.hidden) return;
  const c = document.activeElement; if (c && (c.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(c.tagName))) return;   // on écrit : on n'y touche pas
  const b = el.querySelector('.rvu-principal') || el.querySelector('[data-revue="passer"]'); if (b) b.focus({ preventScroll: true }); }, 140); }
// le premier point pas encore passé, à partir d'une place ; rien : la fin
function prochainDeLaRevue(depuis) { const L = listeDeLaRevue(); for (let i = Math.max(0, depuis); i < L.length; i++) if (!REVUE.passes.has(cleDeRevue(L[i]))) return L[i]; return null; }
/* P : passer au suivant (le point reste à régler, il est « passé ») ; Maj+P : revenir au précédent. */
function allerDansLaRevue(pas) { if (!REVUE.on) return; const L = listeDeLaRevue(), i = L.findIndex(x => cleDeRevue(x) === REVUE.cle);
  if (REVUE.fin) { if (pas < 0 && L.length) { REVUE.fin = false; const x = L[L.length - 1]; REVUE.passes.delete(cleDeRevue(x)); REVUE.cle = cleDeRevue(x); montrerLePointDeLaRevue(); } return; }
  if (pas > 0) { if (i >= 0) REVUE.passes.add(REVUE.cle); const x = prochainDeLaRevue(i + 1); if (x) { REVUE.cle = cleDeRevue(x); montrerLePointDeLaRevue(); } else { REVUE.fin = true; rendreLaRevue(); } }
  else if (i > 0) { const x = L[i - 1]; REVUE.passes.delete(cleDeRevue(x)); REVUE.cle = cleDeRevue(x); montrerLePointDeLaRevue(); } }
// reprendre ce qu'on a passé ; continuer par ce qui est à voir
function reprendreLesPasses() { REVUE.passes = new Set(); REVUE.fin = false; const x = prochainDeLaRevue(0); if (x) { REVUE.cle = cleDeRevue(x); montrerLePointDeLaRevue(); } else { REVUE.fin = true; rendreLaRevue(); } }
// (le clavier quitte la bande : un geste qui ouvre une saisie — « Écrire la consommation… » — le prend pour son champ)
function faireLeGesteDeLaRevue() { const x = pointDeLaRevue(), g = x && gesteDeLaRevue(x); if (!g) return false;
  REVUE.geste = Date.now(); clearTimeout(REVUE.clavier); const el = $('revue'), c = document.activeElement; if (el && c && el.contains(c)) c.blur();
  try { g.faire(); } catch (_) { } return true; }
/* LE CONTRÔLE A CHANGÉ (08-controle, `rendreControle` : un geste, une saisie, un « Défaire ») : le point courant n'y est
   plus — il est réglé. La barre le dit un instant (« Réglé »), puis la Revue passe au suivant ; il n'en reste plus : la fin. */
function suivreLaRevue() { if (!REVUE.on) return; const L = listeDeLaRevue(), ici = L.some(x => cleDeRevue(x) === REVUE.cle);
  if (ici || REVUE.fin) { rendreLaRevue(); return; }
  // sa place d'avant : le premier point pas encore vu, dans l'ordre du contrôle
  const x = prochainDeLaRevue(0); rendreLaRevue({ regle: true }); clearTimeout(REVUE.saut);
  REVUE.saut = setTimeout(() => { if (!REVUE.on) return; const y = x && listeDeLaRevue().some(z => cleDeRevue(z) === cleDeRevue(x)) ? x : prochainDeLaRevue(0);
    if (y) { REVUE.cle = cleDeRevue(y); montrerLePointDeLaRevue(); } else { REVUE.fin = true; rendreLaRevue(); clavierALaRevue(); } }, 900); }

/* ---- la barre ------------------------------------------------------------------------------------------------------ */
const toucheRevue = t => `<kbd class="rvu-k" aria-hidden="true">${t}</kbd>`;
function rendreLaRevue(o) { const el = $('revue'); if (!el) return; if (!REVUE.on) { el.hidden = true; return; } o = o || {};
  const L = listeDeLaRevue(), n = REVUE.debut.size, faits = reglesDeLaRevue(), passes = [...REVUE.passes].filter(k => L.some(x => cleDeRevue(x) === k)).length, voir = REVUE.phase === 'voir';
  const x = REVUE.fin ? null : pointDeLaRevue(), rang = Math.min(n, faits + passes + (x ? 1 : 0)), part = n ? Math.min(1, (faits + passes) / n) : 1;
  const croix = `<button type="button" class="rvu-x" data-revue="quitter" aria-label="Quitter la revue" data-bulle="Quitter la revue (Échap, fiche fermée)">${ico('fermer')}</button>`;
  const barre = `<i class="rvu-barre" aria-hidden="true"><i style="width:${(part * 100).toFixed(1)}%"></i></i>`;
  let corps;
  if (o.regle) corps = `<span class="rvu-avance"><span class="rvu-mode">Revue</span></span><span class="rvu-point rvu-regle"><span class="rvu-coche" aria-hidden="true">${ico('coche')}</span><span class="rvu-mot">Réglé</span></span><span class="rvu-gestes">${croix}</span>`;
  else if (!x) { // la fin : ce qui a été fait, ce qui reste, et la suite
    let nVoir = 0; if (!voir) { REVUE.phase = 'voir'; nVoir = listeDeLaRevue().length; REVUE.phase = 'regler'; }
    const bilan = voir ? (n ? pluriel(n, 'point') + ' vu' + (n > 1 ? 's' : '') : 'Rien à voir')
      : [faits ? faits + ' réglé' + (faits > 1 ? 's' : '') : '', passes ? passes + ' passé' + (passes > 1 ? 's' : '') : ''].filter(Boolean).join(' · ') || 'Rien à régler';
    const suite = [passes && !voir ? `<button type="button" class="rvu-b" data-revue="reprendre">Reprendre ${passes > 1 ? 'les ' + passes + ' passés' : 'le point passé'}</button>` : '',
      !voir && nVoir ? `<button type="button" class="rvu-b" data-revue="voir">Voir ${nVoir > 1 ? 'les ' + nVoir + ' points à voir' : 'le point à voir'}</button>` : '',
      `<span class="rvu-env" data-bulle="Ce qui part dans l’Excel corrigé, relu avant d’enregistrer"><button type="button" class="rvu-b rvu-principal" data-revue="relire">Relire ce qui part ${toucheRevue('⏎')}</button></span>`].join('');
    corps = `<span class="rvu-avance"><span class="rvu-mode">Revue</span></span><span class="rvu-point rvu-fin"><span class="rvu-coche" aria-hidden="true">${ico('coche')}</span><span class="rvu-mot">${esc(passes && !voir ? 'Revue faite' : voir ? 'Revue faite' : 'Tout est réglé')}</span><span class="rvu-suite">${esc(bilan)}</span></span><span class="rvu-gestes">${suite}${croix}</span>`; }
  else { const M = motsDeLaRevue(x), g = gesteDeLaRevue(x); let que = ''; if (!g) { try { que = typeof remede === 'function' ? (remede(x) || [])[0] || '' : ''; } catch (_) { que = ''; } }
    const bulle = [M.long, !g && que ? que : ''].filter(Boolean).join('\n');
    corps = `<span class="rvu-avance" data-bulle="${escA((voir ? 'À voir' : 'À régler') + ' : le point ' + rang + ' sur ' + n + (faits ? ' — ' + faits + ' déjà réglé' + (faits > 1 ? 's' : '') : ''))}"><span class="rvu-mode">${voir ? 'À voir' : 'Revue'}</span><b>${rang}</b><i>/</i><span>${n}</span></span>`
      + `<span class="rvu-point" data-bulle="${escA(bulle)}">${x.nom ? `<span class="rvu-ou id">${esc(x.nom)}</span>` : ''}<span class="rvu-mot">${esc(M.titre)}</span>${M.suite ? `<span class="rvu-suite">${esc(majuscule(M.suite))}</span>` : !g && que ? `<span class="rvu-suite">${esc(que)}</span>` : ''}</span>`
      // (la bulle d'un geste est portée par son enveloppe : elle parle au survol, pas chaque fois que le clavier revient sur lui)
      + `<span class="rvu-gestes">${g ? `<span class="rvu-env"${g.aide ? ` data-bulle="${escA(g.aide)}"` : ''}><button type="button" class="rvu-b rvu-principal" data-revue="geste">${esc(g.mot)} ${toucheRevue('⏎')}</button></span>` : ''}`
      + `<span class="rvu-env" data-bulle="${escA(voir ? 'Le point suivant (Maj+P : le précédent)' : 'Le suivant, sans régler celui-ci — il reste à régler (Maj+P : le précédent)')}"><button type="button" class="rvu-b" data-revue="passer">${voir ? 'Suivant' : 'Passer'} ${toucheRevue('P')}</button></span>${croix}</span>`; }
  // la bande refaite garde le clavier qu'elle avait (un point réglé, la fin : le geste suivant le prend)
  const avait = el.contains(document.activeElement) && Date.now() - (REVUE.geste || 0) > 1500;
  el.innerHTML = corps + barre; el.hidden = false; el.classList.toggle('rvu-en-fin', !x && !o.regle); if (typeof lierBulles === 'function') lierBulles(el);
  if (avait) { const b = el.querySelector('.rvu-principal') || el.querySelector('[data-revue="passer"]') || el.querySelector('.rvu-x'); if (b) b.focus({ preventScroll: true }); } }
function lierLaRevue() { if (REVUE.lie) return; REVUE.lie = true; const el = $('revue'); if (!el) return;
  el.addEventListener('click', e => { const b = e.target.closest('[data-revue]'); if (!b) return; const k = b.dataset.revue;
    if (k === 'geste') faireLeGesteDeLaRevue(); else if (k === 'passer') allerDansLaRevue(1); else if (k === 'quitter') quitterLaRevue();
    else if (k === 'reprendre') reprendreLesPasses(); else if (k === 'voir') commencerLaRevue('voir'); else if (k === 'relire') relireCeQuiPart(); });
  /* le clavier, AVANT les touches du plan : Entrée fait le geste (ou « Relire ce qui part », à la fin) quand le clavier n'est
     sur rien d'autre ; Échap quitte la revue quand plus rien n'est ouvert (une fiche, le menu, la recherche se ferment d'abord) */
  document.addEventListener('keydown', e => { if (!REVUE.on || e.ctrlKey || e.metaKey || e.altKey) return; const c = e.target;
    const champ = c && (c.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(c.tagName));
    if (e.key === 'Enter' && !champ) { const ailleurs = c && c.closest && c.closest('button, a, summary, [role="button"], [role="menuitem"], [role="tab"], [tabindex]:not(body)') && !c.closest('#revue');
      if (ailleurs || !$('menu').hidden || document.body.classList.contains('cherche')) return;
      if (REVUE.fin) { e.preventDefault(); e.stopPropagation(); relireCeQuiPart(); } else if (faireLeGesteDeLaRevue()) { e.preventDefault(); e.stopPropagation(); } }
    else if (e.key === 'Escape' && !champ) { const ouvert = !$('menu').hidden || document.body.classList.contains('cherche') || !$('fiche').hidden || !$('inspecteur').hidden || (app.base && app.base.ouvert);
      if (!ouvert) { e.preventDefault(); e.stopPropagation(); quitterLaRevue(); } } }, true); }
// la touche V, la recherche (« revue »), le panneau Repères et le message d'ouverture y mènent
MENU = (typeof MENU !== 'undefined' && MENU) || { actions: {} }; MENU.actions.revue = () => (REVUE.on ? quitterLaRevue() : commencerLaRevue());
