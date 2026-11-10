/* ===========================================================================
   08 — LE PLAN VIVANT (v92) : ouvrir un disjoncteur, un relais, couper un câble — et voir ce qui n'est plus alimenté.

   Le lecteur : « Le plan vivant, c'est brillant. » ⋮ › Plan vivant met le plan SOUS TENSION : depuis chaque source (une
   batterie, une génératrice, un TR — 09-chute, `estSource`), le courant suit les câbles, passe les disjoncteurs, traverse
   les relais et les interrupteurs (`cheminsDepuis`) jusqu'aux équipements. Au départ TOUT EST FERMÉ — le pire cas, celui
   des calculs. Un clic sur un disjoncteur, un relais ou un interrupteur l'OUVRE ; un clic sur un câble le COUPE (« si ce
   câble casse ») ; un second clic referme. Ce qui était alimenté et ne l'est plus se voit (le câble en tirets rouges,
   l'équipement éteint) et se dit dans le bandeau, sur tout le plan — pas seulement le folio affiché.

   VOLTA n'invente rien : il ne sait pas quel contact est au repos, il ne devine pas un état ; c'est le lecteur qui ouvre.
   Rien n'est écrit dans le plan : le mode se quitte (Échap, « Quitter ») et tout revient.
   =========================================================================== */
const VIVANT = { actif: false, ouverts: new Set(), coupes: new Set(), E: null, lie: false };
const CLASSES_VIVANT = ['vv-vif', 'vv-mort', 'vv-coupe', 'vv-ouvrable', 'vv-ouvert', 'vv-prive'];

/* L'état du plan : deux passes sur les mêmes chemins — tout fermé (ce qui est alimenté d'ordinaire), puis avec ce que le
   lecteur a ouvert ou coupé. Un chemin s'arrête au premier câble coupé, au premier passage ouvert. */
function etatVivant() { const V = verite(), sources = reperesDe(V).filter(estSource), ouvrables = new Set();
  const passe = (ouverts, coupes) => { const fils = new Set(), bouts = new Set(), vus = new Set();
    const depuis = rep => { if (vus.has(rep)) return; vus.add(rep); let chs = []; try { chs = cheminsDepuis(V, rep).filter(ch => !ch.amont); } catch (_) { chs = []; }
      chs.forEach(ch => { for (const s of ch.segments) { if (s.fil) { if (coupes.has(s.fil)) return; fils.add(s.fil); } else if (s.passage) { ouvrables.add(s.passage); if (ouverts.has(s.passage)) return; } }
        const r = ch.bout[0]; if (!r) return; if (estDisjoncteur(r)) { ouvrables.add(r); if (!ouverts.has(r)) depuis(r); } else if (!estMasse(r)) bouts.add(r); }); };
    sources.forEach(depuis); return { fils, bouts }; };
  const normal = passe(new Set(), new Set()), vif = passe(VIVANT.ouverts, VIVANT.coupes);
  return { sources, ouvrables, normal, vif, prives: [...normal.bouts].filter(r => !vif.bouts.has(r)).sort(triNaturel) }; }

function peindreVivant() { const sc = $('scene'); if (sc) { sc.classList.toggle('vivant', VIVANT.actif); sc.querySelectorAll('.' + CLASSES_VIVANT.join(',.')).forEach(e => e.classList.remove(...CLASSES_VIVANT)); }
  if (!VIVANT.actif) return; const E = VIVANT.E = etatVivant(); rendreBandeauVivant();
  if (!sc || !app.dessin) return; const L = liaisonsDuPlan(), src = i => { const l = L[i]; return l ? (sourceDe(l) || null) : null; };
  // ce que VOLTA ajoute (le câble d'une barrette à poser, ses shunts) n'est pas dans le fichier : il suit sa barrette
  const vtVif = new Set(), vtNormal = new Set(); L.forEach(l => { const s = sourceDe(l); if (!s) return; [l.de, l.vers].forEach(r => { if (!VT_A_POSER.test(r || '')) return; if (E.vif.fils.has(s)) vtVif.add(r); if (E.normal.fils.has(s)) vtNormal.add(r); }); });
  sc.querySelectorAll('[data-i]').forEach(e => { const is = e.dataset.i.split(' ').map(Number), ls = is.map(src).filter(Boolean), ajoutes = is.map(i => L[i]).filter(l => l && !sourceDe(l));
    const vif = ls.some(l => E.vif.fils.has(l)) || ajoutes.some(l => vtVif.has(l.de) || vtVif.has(l.vers)), normal = ls.some(l => E.normal.fils.has(l)) || ajoutes.some(l => vtNormal.has(l.de) || vtNormal.has(l.vers));
    if (ls.some(l => VIVANT.coupes.has(l))) e.classList.add('vv-coupe'); if (vif) e.classList.add('vv-vif'); else if (normal) e.classList.add('vv-mort'); });
  const prives = new Set(E.prives);
  sc.querySelectorAll('.comp[data-name]').forEach(g => { const n = g.dataset.name; if (E.ouvrables.has(n)) g.classList.add('vv-ouvrable'); if (VIVANT.ouverts.has(n)) g.classList.add('vv-ouvert'); if (prives.has(n)) g.classList.add('vv-prive'); }); }

/* Le bandeau : ce qui est ouvert, ce qui est coupé, et ce que cela prive de courant — sur tout le plan. */
function rendreBandeauVivant() { let el = document.getElementById('vivant'); if (!VIVANT.actif) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'vivant'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); $('app').appendChild(el); }
  const E = VIVANT.E || etatVivant(), nO = VIVANT.ouverts.size, nC = VIVANT.coupes.size, liste = xs => xs.slice(0, 8).join(', ') + (xs.length > 8 ? ' et ' + pluriel(xs.length - 8, 'autre') : '');
  let dit;
  if (!E.sources.length) dit = '<b>Ce plan ne porte pas de source</b><span>Sans batterie, génératrice ni TR dans votre fichier, rien n’est à mettre sous tension.</span>';
  else if (!nO && !nC) dit = `<b>Tout est fermé : ${esc(pluriel(E.normal.bouts.size, 'équipement'))} sous tension</b><span>Cliquez un disjoncteur, un relais, un interrupteur ou un câble pour l’ouvrir.</span>`;
  else { const quoi = [nO ? [...VIVANT.ouverts].sort(triNaturel).join(', ') + (nO > 1 ? ' ouverts' : ' ouvert') : '', nC ? pluriel(nC, 'câble') + (nC > 1 ? ' coupés' : ' coupé') : ''].filter(Boolean).join(' · ');
    dit = `<b>${esc(quoi)}</b><span>${E.prives.length ? esc(pluriel(E.prives.length, 'équipement')) + (E.prives.length > 1 ? ' privés' : ' privé') + ' de courant : ' + esc(liste(E.prives)) : 'Aucun équipement n’est privé de courant : un autre chemin les alimente.'}</span>`; }
  el.innerHTML = `<i class="vv-pt" aria-hidden="true"></i><div class="vv-dit"><small>Plan vivant</small>${dit}</div>${nO || nC ? '<button type="button" class="btn papier dense" data-vv="refermer">Tout refermer</button>' : ''}<button type="button" class="btn lien" data-vv="quitter">Quitter</button>`; }

/* Ce qu'un clic vise : un disjoncteur, un relais, un interrupteur que le courant passe ; un câble qu'il emprunte. */
function cibleVivante(t) { const E = VIVANT.E; if (!E || !t || !t.closest) return null;
  const w = t.closest('[data-i]'); if (w && !w.classList.contains('lead')) { const L = liaisonsDuPlan(), ls = w.dataset.i.split(' ').map(i => { const l = L[+i]; return l ? sourceDe(l) : null; }).filter(l => l && (E.normal.fils.has(l) || VIVANT.coupes.has(l))); if (ls.length) return { fil: ls[0] }; }
  const g = t.closest('.comp[data-name]'); if (g && E.ouvrables.has(g.dataset.name)) return { nom: g.dataset.name };
  return null; }
// ce que dit le survol d'un bloc pendant le plan vivant : le clic l'ouvre ou le referme (08-interface, 08-survol)
const gesteVivant = nom => !VIVANT.actif || !VIVANT.E || !VIVANT.E.ouvrables.has(nom) ? '' : VIVANT.ouverts.has(nom) ? 'Clic : le refermer' : 'Clic : l’ouvrir';
function basculerVivant(c) { const S = c.fil ? VIVANT.coupes : VIVANT.ouverts, k = c.fil || c.nom; if (S.has(k)) S.delete(k); else S.add(k); peindreVivant(); }
function lierVivant() { if (VIVANT.lie) return; VIVANT.lie = true; const stage = $('planche'); let depart = null;
  stage.addEventListener('pointerdown', e => { if (!VIVANT.actif) return; const c = cibleVivante(e.target); depart = c ? { x: e.clientX, y: e.clientY, c } : null; if (c) e.stopPropagation(); }, true);
  stage.addEventListener('pointerup', e => { if (!VIVANT.actif || !depart) return; const d = depart; depart = null; e.stopPropagation(); if (Math.hypot(e.clientX - d.x, e.clientY - d.y) <= 5) basculerVivant(d.c); }, true);
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('#vivant [data-vv]'); if (!b) return; if (b.dataset.vv === 'quitter') quitterVivant(); else { VIVANT.ouverts.clear(); VIVANT.coupes.clear(); peindreVivant(); } });
  document.addEventListener('keydown', e => { if (!VIVANT.actif || e.key !== 'Escape' || e.defaultPrevented) return; if (!$('fiche').hidden || !$('inspecteur').hidden || (typeof menuOuvert === 'function' && menuOuvert())) return; quitterVivant(); }); }
function entrerVivant() { lierVivant(); if (VIVANT.actif) return; VIVANT.actif = true; VIVANT.ouverts.clear(); VIVANT.coupes.clear();
  // la place est faite : le document, la fiche d'un objet, le panneau Repères se ferment (ils couvriraient les câbles)
  if (typeof NIVEAU !== 'undefined' && NIVEAU.grand && typeof reduireFiche === 'function') reduireFiche();
  if (typeof fermerFiche === 'function') fermerFiche(); if (typeof deselectionner === 'function') deselectionner(); if (typeof fermerInspecteur === 'function') fermerInspecteur();
  if (typeof eteindre === 'function') eteindre(); peindreVivant(); }
function quitterVivant() { if (!VIVANT.actif) return; VIVANT.actif = false; VIVANT.ouverts.clear(); VIVANT.coupes.clear(); VIVANT.E = null; peindreVivant(); rendreBandeauVivant(); }

MENU = (typeof MENU !== 'undefined' && MENU) || { actions: {} }; MENU.actions.vivant = surLePlan(() => (VIVANT.actif ? quitterVivant() : entrerVivant()));
