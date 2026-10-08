/* ===========================================================================
   08 quater — LE CONTRÔLE : ce que le contrat a à reprendre, d'un coup d'œil
   ---------------------------------------------------------------------------
   Le contrat entier se relit à chaque correction (quelques dizaines de
   millisecondes). Rien ne flotte sur le plan pour le dire — le lecteur : « ça
   sert à rien » — : le bouton des repères (R) porte un point avec le compte,
   et l'index s'ouvre sur la liste « à reprendre » ; une ligne y mène : son
   folio, son bloc, sa fiche. Chaque fiche porte sa propre pastille.
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
/* Le contrôle se relit si le contrat a changé ; le bouton des repères porte le compte ; l'index ouvert se refait. */
function rendreControle() { const V = verite();
  const cle = signature(V) + '|' + JSON.stringify([...app.contrat.designations]) + '|' + JSON.stringify([...(app.contrat.sexes || [])]) + '|' + JSON.stringify([...(app.contrat.charges || [])]) + '|' + JSON.stringify([...(app.contrat.raccords || [])]) + '|' + (app.normeNom || '') + '|' + (app.bibleNom || '');
  if (cle !== CONTROLE.cle) { CONTROLE.cle = cle; CONTROLE.items = V.length ? controleDuContrat() : []; }
  const xs = CONTROLE.items, nko = xs.filter(x => x.niveau === 'ko').length, natt = xs.length - nko, b = $('btnIndex'); if (!b) return;
  let p = b.querySelector('.rd-point'); if (!p) { p = document.createElement('i'); p.className = 'rd-point'; b.appendChild(p); }
  p.hidden = !xs.length; p.className = 'rd-point ' + (nko ? 'ko' : 'att'); p.textContent = String(nko || natt);
  b.setAttribute('aria-label', 'Repères du contrat (R)' + (nko ? ' — ' + pluriel(nko, 'problème') : natt ? ' — ' + natt + ' à voir' : ''));
  if (app.insp.index && !$('inspecteur').hidden && !app.cible) rendreIndex($('ba-equip')); }
/* La liste « à reprendre », en tête de l'index : les problèmes, puis les points à voir ; une ligne y mène. */
function listeControleHtml() { const xs = CONTROLE.items; if (!xs.length) return '';
  // une ligne par repère : son premier point, et combien d'autres
  return [['ko', 'Problèmes'], ['att', 'À voir']].map(([n, t]) => { const ys = xs.filter(x => x.niveau === n); if (!ys.length) return '';
    const par = new Map(); ys.forEach(x => { const k = x.nom || '\u0001' + x.texte; (par.get(k) || par.set(k, []).get(k)).push(x); });
    return `<div class="ix-groupe ${n}"><span>${t}</span><b>${ys.length}</b></div><ul class="ix-liste co-liste">` + [...par.values()].map(g => { const x = g[0];
      return `<li><button class="ix-item co-item" data-k="${xs.indexOf(x)}" title="${escA(g.map(y => y.texte).join('\n'))}">`
      + `<span class="co-code ${x.nom ? genreDe(x.nom) : 'tab'}" aria-hidden="true">${x.nom ? esc(codeDe(x.nom)) : ico('tableau')}</span>`
      + `<span class="min0"><b>${esc(x.nom || 'Tableau')}${g.length > 1 ? ` <em>${g.length} ${n === 'ko' ? 'problèmes' : 'points'}</em>` : ''}</b><small>${esc(x.texte)}${g.length > 1 ? ' …' : ''}</small></span>`
      + (x.plan && x.plan !== '*' ? `<span class="ix-folio">f. ${esc(x.plan)}</span>` : '') + '</button></li>'; }).join('') + '</ul>'; }).join(''); }
// une ligne : son folio, son bloc et sa fiche — ou le tableau, filtré sur ce qu'il faut reprendre
function allerAuControle(x) {
  if (x.tableau != null) { app.base.filtre = x.tableau; app.base.portee = 'tout'; app.base.tri = x.texte.includes('sans type') ? { k: 'type', sens: 1 } : { k: 'de', sens: 1 }; if (app.base.ouvert) rendreBase(); else ouvrirBase(); return; }
  if (x.plan && x.plan !== app.plan && plans().includes(x.plan)) allerAuPlan(x.plan);
  const c = app.dessin && app.dessin.comps.find(k => k.name === x.nom && k.kind !== 'tag'), vt = c ? null : barretteAPoser(x.nom);
  if (c) choisirBloc(c); else if (vt) choisirBarretteAPoser(vt); else { app.cible = { type: 'bloc', nom: x.nom }; ouvrirInspecteur(); }
  viser(x.nom); }
function lierControle() { }
