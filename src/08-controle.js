/* ===========================================================================
   08 quater — LE CONTRÔLE : ce que le contrat a à reprendre, d'un coup d'œil
   ---------------------------------------------------------------------------
   En haut à gauche, une pastille dit l'état de TOUT le contrat — « Conforme »,
   ou « 1 problème · 3 à voir » — tenue à jour à chaque correction (le contrat
   entier se relit en quelques dizaines de millisecondes). Un clic déplie la
   liste ; une ligne y mène : son folio, son bloc, sa fiche.
     · les PROBLÈMES : un connecteur, une barrette, une prise qu'aucun
       arrangement de la norme ne loge ; un fil que son contact refuse ;
     · les POINTS À VOIR : chaque barrette à poser (un dédoublement), ce
       qu'une prise a de bancal, les fils sans type (leur jauge ne se vérifie
       pas), les liaisons incomplètes (ni dessinées, ni vérifiées).
   =========================================================================== */
'use strict';

const CONTROLE = { cle: null, items: [], ouvert: false };
const genreDe = nom => VT_A_POSER.test(nom) ? 'aposer' : estCoupure(nom) ? 'coupure' : estBarrette(nom) ? 'barrette' : 'eqpt';
function controleDuContrat() { const V = verite(), items = [], ko = (nom, texte) => items.push({ niveau: 'ko', nom, texte }), att = (nom, texte, plus) => items.push({ niveau: 'att', nom, texte, ...plus });
  [...new Set(V.flatMap(l => [l.de, l.vers]).filter(Boolean))].sort(triNaturel).forEach(r => { if (estMasse(r) || estRenvoi(r)) return;
    try {
      if (estDisjoncteur(r)) controleDisjonction(r).forEach(x => (x.niveau === 'ko' ? ko : att)(r, x.texte));
      if (barretteEnModules(r)) { const Q = planDeBarrette(r).plan, n = Q.fils.filter(x => x.jaugeOk === false).length;
        Q.verdicts.filter(v => v.niveau === 'ko').forEach(v => ko(r, v.texte)); if (n) ko(r, pluriel(n, 'fil') + ' refusé' + (n > 1 ? 's' : '') + ' par son contact'); }
      else if (coupureEnModules(r)) { const Q = planDeCoupure(r).plan;
        Q.verdicts.forEach(v => { if (v.niveau === 'ko') ko(r, v.texte); else if (v.niveau === 'attention') att(r, v.texte); }); }
      else if (!estBornier(r)) cavitesDe(r).forEach(c => c.plan.verdicts.forEach(v => { if (v.niveau === 'ko') ko(r, c.nom + ' · ' + v.texte); }));
    } catch (_) { } });
  // les barrettes à poser, folio par folio
  (plans().length ? plans() : ['*']).forEach(p => liaisonsDe(p).forEach(l => {
    if (l.origine === null && l.vers === l.aPoser && l.borneVers === '1') att(l.aPoser, `à poser sur ${l.de}:${l.borneDe}`, { plan: p }); }));
  // les types de fil que la base des câbles ne connaît pas (une faute de frappe, un câble à ajouter)
  if (cablesDe(app.norme).length) { const inc = [...new Set(V.filter(l => liaisonComplete(l) && l.de !== l.vers && l.type && !cableDuType(app.norme, l.type)).map(l => l.type))].sort(triNaturel);
    if (inc.length) att('', (inc.length > 1 ? inc.length + ' types de fil inconnus' : 'un type de fil inconnu') + ' de la base des câbles : ' + inc.slice(0, 5).join(', ') + (inc.length > 5 ? '…' : ''), { tableau: '' }); }
  const sansType = V.filter(l => liaisonComplete(l) && l.de !== l.vers && !l.type).length;
  if (sansType) att('', pluriel(sansType, 'fil') + ' sans type : leur jauge ne se vérifie pas', { tableau: '' });
  const inc = V.filter(l => !liaisonComplete(l) && (l.de || l.vers || l.cable)).length;
  if (inc) att('', pluriel(inc, 'liaison') + ' incomplète' + (inc > 1 ? 's' : '') + ' : ni dessinée' + (inc > 1 ? 's' : '') + ', ni vérifiée' + (inc > 1 ? 's' : ''), { tableau: '' });
  items.forEach(x => { if (x.nom && x.plan == null) x.plan = plansDuRepere(x.nom).sort(triNaturel)[0] || ''; });
  return items; }
/* La pastille : le nom du contrat, son compte, son état. Ne se relit que si le contrat a changé. */
function rendreControle() { const el = $('controle'), V = verite(); if (!el) return;
  if (!V.length) { el.hidden = true; return; } el.hidden = false;
  const cle = signature(V) + '|' + JSON.stringify([...app.contrat.designations]) + '|' + JSON.stringify([...(app.contrat.sexes || [])]) + '|' + JSON.stringify([...(app.contrat.charges || [])]) + '|' + (app.normeNom || '') + '|' + (app.bibleNom || '');
  if (cle !== CONTROLE.cle) { CONTROLE.cle = cle; CONTROLE.items = controleDuContrat(); }
  const xs = CONTROLE.items, nko = xs.filter(x => x.niveau === 'ko').length, natt = xs.length - nko, P = plans();
  $('co-nom').textContent = (app.contrat.cartouche && app.contrat.cartouche.titre) || app.nom || 'Contrat';
  $('co-sous').textContent = pluriel(V.length, 'liaison') + (P.length ? ' · ' + pluriel(P.length, 'folio') : '');
  const e = $('co-etat'); e.className = 'co-etat ' + (nko ? 'ko' : natt ? 'att' : 'ok');
  e.innerHTML = nko ? `<i aria-hidden="true">✕</i>${nko > 1 ? nko + ' problèmes' : '1 problème'}${natt ? `<em>· ${natt} à voir</em>` : ''}` : natt ? `<i aria-hidden="true">!</i>${natt} à voir` : '<i aria-hidden="true">✓</i>Conforme';
  if (CONTROLE.ouvert) rendreListeControle(); }
function rendreListeControle() { const box = $('co-liste'), xs = CONTROLE.items;
  box.innerHTML = !xs.length ? '<p class="co-vide">Rien à reprendre : chaque connecteur, chaque barrette, chaque prise est logé, chaque jauge acceptée.</p>'
    : [['ko', 'Problèmes'], ['att', 'À voir']].map(([n, t]) => { const ys = xs.filter(x => x.niveau === n); if (!ys.length) return '';
      return `<div class="co-groupe ${n}"><span>${t}</span><b>${ys.length}</b></div>` + ys.map(x => `<button class="co-item" data-k="${xs.indexOf(x)}">`
        + `<span class="co-code ${x.nom ? genreDe(x.nom) : 'tab'}" aria-hidden="true">${x.nom ? esc(codeDe(x.nom)) : ico('tableau')}</span>`
        + `<span class="min0"><b>${esc(x.nom || 'Tableau')}</b><small>${esc(x.texte)}</small></span>`
        + (x.plan && x.plan !== '*' ? `<span class="co-folio">folio ${esc(x.plan)}</span>` : '') + '</button>').join(''); }).join(''); }
function ouvrirControle(ouvert) { CONTROLE.ouvert = ouvert; $('co-liste').hidden = !ouvert; $('co-bouton').setAttribute('aria-expanded', String(ouvert)); $('controle').classList.toggle('ouvert', ouvert);
  if (ouvert) rendreListeControle(); }
// une ligne : son folio, son bloc et sa fiche — ou le tableau, filtré sur ce qu'il faut reprendre
function allerAuControle(x) { ouvrirControle(false);
  if (x.tableau != null) { app.base.filtre = x.tableau; app.base.portee = 'tout'; app.base.tri = x.texte.includes('sans type') ? { k: 'type', sens: 1 } : { k: 'de', sens: 1 }; if (app.base.ouvert) rendreBase(); else ouvrirBase(); return; }
  if (x.plan && x.plan !== app.plan && plans().includes(x.plan)) allerAuPlan(x.plan);
  const c = app.dessin && app.dessin.comps.find(k => k.name === x.nom && k.kind !== 'tag'), vt = c ? null : barretteAPoser(x.nom);
  if (c) choisirBloc(c); else if (vt) choisirBarretteAPoser(vt); else { app.cible = { type: 'bloc', nom: x.nom }; ouvrirInspecteur(); }
  viser(x.nom); }
function lierControle() {
  $('co-bouton').onclick = () => ouvrirControle(!CONTROLE.ouvert);
  $('co-liste').addEventListener('click', e => { const b = e.target.closest('.co-item'); if (b) allerAuControle(CONTROLE.items[+b.dataset.k]); });
  document.addEventListener('pointerdown', e => { if (CONTROLE.ouvert && !$('controle').contains(e.target)) ouvrirControle(false); }); }
