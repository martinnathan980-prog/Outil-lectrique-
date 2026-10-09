/* ===========================================================================
   08 quater — LE CONTRÔLE : ce que le contrat a à reprendre, d'un coup d'œil
   ---------------------------------------------------------------------------
   Le contrat entier se relit à chaque correction (quelques dizaines de
   millisecondes). Rien ne flotte sur le plan pour le dire — le lecteur : « ça
   sert à rien » — : le bouton des repères (R) porte un point avec le compte,
   et l'index s'ouvre sur la liste « à reprendre » ; une ligne y mène : son
   folio, son bloc, sa fiche. Chaque fiche porte sa propre pastille.
     · les PROBLÈMES : un connecteur, une barrette, une prise qu'aucun
       arrangement de la norme ne loge ; un fil que son contact refuse ; un
       disjoncteur qui déclenche, un fil qu'il nourrit — serti sur lui ou
       au-delà d'une prise ou d'une barrette — que la charge dépasse ; un
       permanent qui dépasse le contact ; une chute en ligne qui dépasse le
       réseau sur des longueurs du retest ;
     · les POINTS À VOIR : chaque barrette à poser (un dédoublement), ce
       qu'une prise a de bancal, les fils sans type (leur jauge ne se vérifie
       pas), les liaisons incomplètes (ni dessinées, ni vérifiées), un calibre
       au-dessus du continu d'un fil, de son contact ou du maximum de l'AC
       43.13-1B pour sa jauge, un fil pas protégé en surcharge brève, un part
       number de disjoncteur d'une famille inconnue, une chute en ligne de
       trop sur des longueurs d'hypothèse, un conducteur CCA sur un contact
       cuivre ordinaire, un câble qui ne tient pas l'ambiante.
   Chaque défaut une fois, sur son repère ; ce qui vaut pour tout le contrat
   (les types inconnus, l'ambiante) va sur le tableau.
   =========================================================================== */
'use strict';

const CONTROLE = { cle: null, items: [], ouvert: false };
const genreDe = nom => VT_A_POSER.test(nom) ? 'aposer' : estCoupure(nom) ? 'coupure' : estBarrette(nom) ? 'barrette' : 'eqpt';
function controleDuContrat() { const V = verite(), N = app.norme, H = app.simu || HYPOTHESES, items = [], ko = (nom, texte) => items.push({ niveau: 'ko', nom, texte }), att = (nom, texte, plus) => items.push({ niveau: 'att', nom, texte, ...plus });
  // le contact de chaque bout d'un fil, par les plans (la taille, la référence à sertir) : la protection et le CCA s'en servent
  const contacts = new Map(), noter = (r, fils) => (fils || []).forEach(x => { if (!x.f || !x.f.l) return; (contacts.get(x.f.l) || contacts.set(x.f.l, []).get(x.f.l)).push({ repere: r, taille: x.taille, sertir: x.sertir || null }); });
  const reperes = [...new Set(V.flatMap(l => [l.de, l.vers]).filter(Boolean))].sort(triNaturel).filter(r => !estMasse(r) && !estRenvoi(r));
  reperes.forEach(r => {
    try {
      if (estDisjoncteur(r)) controleDisjonction(r).forEach(x => (x.niveau === 'ko' ? ko : att)(r, x.texte));
      if (barretteEnModules(r)) { const Q = planDeBarrette(r).plan, n = Q.fils.filter(x => x.jaugeOk === false).length; noter(r, Q.fils);
        Q.verdicts.filter(v => v.niveau === 'ko').forEach(v => ko(r, v.texte)); if (n) ko(r, pluriel(n, 'fil') + ' refusé' + (n > 1 ? 's' : '') + ' par son contact'); }
      else if (coupureEnModules(r)) { const Q = planDeCoupure(r).plan; noter(r, Q.fils);
        Q.verdicts.forEach(v => { if (v.niveau === 'ko') ko(r, v.texte); else if (v.niveau === 'attention') att(r, v.texte); }); }
      // une cavité : ses problèmes, et ses remarques — sauf les deux fils sur un contact, que la barrette à poser dit déjà
      else if (!estBornier(r)) cavitesDe(r).forEach(c => { noter(r, c.plan.fils); c.plan.verdicts.forEach(v => { if (v.niveau === 'ko') ko(r, c.nom + ' · ' + v.texte); else if (v.niveau === 'attention' && !/^contact \S+ : \d+ fils/.test(v.texte)) att(r, c.nom + ' · ' + v.texte); }); });
    } catch (_) { } });
  // un conducteur qui n'est pas du cuivre (AD, VN : aluminium cuivré) serti sur un contact cuivre ordinaire : à qualifier
  contacts.forEach((xs, l) => { const fam = cableFamilleDe(N, l.type); if (!fam || !fam.conducteur || fam.conducteur === 'cuivre') return;
    xs.forEach(x => { if (x.sertir && x.sertir.reference && !contactPourCca(x.sertir.reference)) att(x.repere, `${l.cable || 'fil sans numéro'} (${l.type}) : conducteur ${fam.conducteur} sur un contact ${x.sertir.reference} — qualification CCA à confirmer`); }); });
  // les disjoncteurs : tout ce qu'ils nourrissent, la table 11-3, les contacts, la chute en ligne
  reperes.filter(estDisjoncteur).forEach(r => { try { controleProtection(r, contacts, V, N, H).forEach(x => (x.niveau === 'ko' ? ko : att)(r, x.texte)); } catch (_) { } });
  // les barrettes à poser, folio par folio
  (plans().length ? plans() : ['*']).forEach(p => liaisonsDe(p).forEach(l => {
    if (l.origine === null && l.vers === l.aPoser && l.borneVers === '1') att(l.aPoser, `à poser sur ${l.de}:${l.borneDe}`, { plan: p }); }));
  // les types de fil que la base des câbles ne connaît pas (une faute de frappe, un câble à ajouter)
  if (cablesDe(N).length) { const inc = [...new Set(V.filter(l => liaisonComplete(l) && l.de !== l.vers && l.type && !cableDuType(N, l.type)).map(l => l.type))].sort(triNaturel);
    if (inc.length) att('', (inc.length > 1 ? inc.length + ' types de fil inconnus' : 'un type de fil inconnu') + ' de la base des câbles : ' + inc.slice(0, 5).join(', ') + (inc.length > 5 ? '…' : ''), { tableau: '' }); }
  const sansType = V.filter(l => liaisonComplete(l) && l.de !== l.vers && !l.type).length;
  if (sansType) att('', pluriel(sansType, 'fil') + ' sans type : leur jauge ne se vérifie pas', { tableau: '' });
  const inc = V.filter(l => !liaisonComplete(l) && (l.de || l.vers || l.cable)).length;
  if (inc) att('', pluriel(inc, 'liaison') + ' incomplète' + (inc > 1 ? 's' : '') + ' : ni dessinée' + (inc > 1 ? 's' : '') + ', ni vérifiée' + (inc > 1 ? 's' : ''), { tableau: '' });
  // les câbles qui ne tiennent pas l'ambiante de la simulation (l'EN 2853 les échauffe de 40 °C) : une fois par famille
  const tenues = new Map(); V.forEach(l => { if (!liaisonComplete(l) || l.de === l.vers || !l.type) return; const t = tenueEnTemperature(N, l.type, H.ambiante); if (t && !t.ok && !tenues.has(typeDuFil(l.type))) tenues.set(typeDuFil(l.type), t); });
  if (tenues.size) att('', `ambiante ${nombre(H.ambiante)} °C : ${[...tenues].map(([f, t]) => f + ' (' + nombre(t.tmax) + ' °C max)').join(', ')} ne ${tenues.size > 1 ? 'tiennent' : 'tient'} pas l’échauffement de 40 °C de l’EN 2853 (${nombre(H.ambiante + ECHAUFFEMENT_EN2853)} °C au conducteur)`, { tableau: '' });
  items.forEach(x => { if (x.nom && x.plan == null) x.plan = plansDuRepere(x.nom).sort(triNaturel)[0] || ''; });
  return items; }
/* CE QU'UN DISJONCTEUR PROTÈGE, au-delà de ce que sa fiche relève (`controleDisjonction` : le profil, ses fils directs,
   la sélectivité) : un part number d'une famille inconnue (le calibre ne s'y lit pas) ; chaque fil qu'il nourrit à
   travers les prises et les barrettes, jugé comme les fils directs (la charge, le continu, la surcharge brève) ; pour
   tous, le maximum de l'AC 43.13-1B par jauge et le contact — le contact du plan quand on le connaît, le plus faible
   des deux bouts, sinon la taille usuelle de la jauge ; enfin la chute en ligne de chaque chemin, au permanent contre
   le continu du réseau, à chaque pointe contre l'intermittent (≤ 2 min) — un problème sur des longueurs du retest, à
   voir sur des longueurs d'hypothèse. Rend [{ niveau, texte }]. */
function controleProtection(nom, contacts, V, N, H) { const d = disjonctionDe(nom), out = [], cal = d.calibre, pn = pnDuRepere(nom);
  if (pn && !d.famille && !d.ecrit) out.push({ niveau: 'att', texte: `part number ${pn} : famille de disjoncteur inconnue, le calibre ne s’y lit pas${cal ? ' — ' + amperes(cal) + ' (l’idéal) retenu' : ''}` });
  const fils = filsDepuis(V, nom).map(f => { const xs = (contacts.get(f.l) || []).map(x => ({ x, i: intensiteDeContact(N, x.taille) })).filter(y => y.i).sort((a, b) => a.i.intensite - b.i.intensite);
    return xs.length ? { ...f, taille: xs[0].x.taille, contactRepere: xs[0].x.repere } : f; });
  protectionDesFils(N, cal, d.profil, fils, H).forEach(f => { const nomF = (f.cable || 'fil sans numéro') + (f.type ? ' (' + f.type + ')' : '') + (f.direct ? '' : ' (par ' + f.via + ')');
    if (!f.direct) {
      if (f.verdict === 'fil') out.push({ niveau: 'ko', texte: `${nomF} : ${f.pire.nom} ${amperes(f.pire.i)}${f.pire.t === Infinity ? '' : ' / ' + secondes(f.pire.t)} > ${amperes(f.pire.admise)} admis ${pourPalier(f.pire.palier)}${motFacteur(f.pire.palier === Infinity ? f.facteur : f.facteurCourt)}` });
      else if (f.verdict === 'calibre') out.push({ niveau: 'att', texte: `${nomF} : ${amperes(f.continu)} admis en continu${motFacteur(f.facteur)} < calibre ${amperes(cal)} — pas protégé en surcharge` });
      else if (f.protege === false) { const x = f.pireLaisse; out.push({ niveau: 'att', texte: `${nomF} : pas protégé en surcharge brève — le ${amperes(cal)} laisse passer ${amperes(x.courant)} ${pourPalier(x.palier)} à ${f.courbeLente}, le fil admet ${amperes(x.admise)}` }); } }
    if (f.refuse) out.push({ niveau: 'att', texte: `${nomF} : conducteur ${f.conducteur} sans résistance dans la base, son intensité admissible est inconnue` });
    if (f.horsTable) out.push({ niveau: 'att', texte: `${nomF} : calibre ${amperes(cal)} > ${amperes(f.calibreMax)}, le maximum de l’AC 43.13-1B (table 11-3) pour du ${f.jauge} AWG` });
    if (f.contactDepasse) out.push({ niveau: 'ko', texte: `${nomF} : le permanent (${amperes(f.permanent)}) dépasse le contact taille ${f.contact.taille} (${amperes(f.contact.intensite)}${f.contact.parLePlan ? ', ' + f.contactRepere : ', par la jauge'})` });
    else if (f.contactSurcharge) out.push({ niveau: 'att', texte: `${nomF} : contact taille ${f.contact.taille} (${amperes(f.contact.intensite)}${f.contact.parLePlan ? ', ' + f.contactRepere : ', par la jauge'}) < calibre ${amperes(cal)} — pas protégé en surcharge` }); });
  // la chute en ligne : au permanent du profil (sinon le calibre, sinon l'hypothèse), et à chaque état court
  const I = d.profil && d.profil.perm && d.profil.perm.i > 0 ? d.profil.perm.i : cal > 0 ? cal : H.courant, courts = d.points.filter(p => p.t !== Infinity && p.i > 0);
  chutesDepuis(N, V, nom, I, H, courts).forEach(c => { const ou = c.bout[0] + (c.bout[1] ? ':' + c.bout[1] : ''), hyp = c.reel ? '' : ' (longueurs d’hypothèse)', niveau = c.reel ? 'ko' : 'att';
    if (c.trop) out.push({ niveau, texte: `chute en ligne vers ${ou} : ${volts(c.dU)} à ${amperes(I)} > ${volts(c.admis)} admis sous ${nombre(c.tension)} V${hyp}` });
    else { const p = (c.pointes || []).find(x => x.trop); if (p) out.push({ niveau, texte: `chute en ligne vers ${ou} en pointe : ${volts(p.dU)} à ${amperes(p.i)} pendant ${secondes(p.t)} > ${volts(p.admis)} admis${p.intermittent ? ' en intermittent' : ''}${hyp}` }); } });
  return out; }
/* Le contrôle se relit si le contrat a changé ; le bouton des repères porte le compte ; l'index ouvert se refait. */
function rendreControle() { const V = verite();
  // les hypothèses de la simulation comptent aussi : l'ambiante, le tableau, le retour changent ce que le contrôle relève
  const cle = signature(V) + '|' + JSON.stringify([...app.contrat.designations]) + '|' + JSON.stringify([...(app.contrat.sexes || [])]) + '|' + JSON.stringify([...(app.contrat.charges || [])]) + '|' + JSON.stringify([...(app.contrat.raccords || [])]) + '|' + (app.normeNom || '') + '|' + (app.bibleNom || '') + '|' + JSON.stringify(app.simu || {});
  if (cle !== CONTROLE.cle) { CONTROLE.cle = cle; CONTROLE.items = V.length ? controleDuContrat() : []; }
  const xs = CONTROLE.items, nko = xs.filter(x => x.niveau === 'ko').length, natt = xs.length - nko, b = $('btnIndex'); if (!b) return;
  let p = b.querySelector('.rd-point'); if (!p) { p = document.createElement('i'); p.className = 'rd-point'; b.appendChild(p); }
  p.hidden = !xs.length; p.className = 'rd-point ' + (nko ? 'ko' : 'att'); p.textContent = String(nko || natt);
  b.setAttribute('aria-label', 'Repères du contrat (R)' + (nko ? ' — ' + pluriel(nko, 'problème') : natt ? ' — ' + natt + ' à voir' : ''));
  // la barre du haut, si la page en a une : l'état du contrat en une pastille, qui ouvre l'index
  const e = $('en-etat'); if (e) { e.hidden = !V.length; e.className = 'fi-etat en-etat ' + (nko ? 'ko' : natt ? 'att' : 'ok'); e.title = xs.length ? 'La liste de ce qu’il y a à reprendre' : 'Rien à reprendre : tout est jugé bon';
    // les mots se rangent quand la barre manque de place (il reste « 3 · 10 », le voyant dit le reste) ; le texte lu est le même
    const mot = t => `<span class="en-mot">${t}</span>`;
    e.innerHTML = `<i aria-hidden="true">${nko ? '✕' : natt ? '!' : '✓'}</i><span>${nko ? nko + mot(nko > 1 ? ' problèmes' : ' problème') + (natt ? ' · ' + natt + mot(' à voir') : '') : natt ? natt + mot(' à voir') : 'rien à reprendre'}</span>`; e.onclick = () => { if (!(app.insp.index && !$('inspecteur').hidden)) basculerIndex(); }; }
  if (app.insp.index && !$('inspecteur').hidden && !app.cible) rendreIndex($('ba-equip')); }
/* La liste « à reprendre », en tête de l'index : les problèmes, puis les points à voir ; une ligne y mène. */
function listeControleHtml() { const xs = CONTROLE.items; if (!xs.length) return '';
  // une ligne par repère : son premier point, et combien d'autres
  return [['ko', 'Problèmes'], ['att', 'À voir']].map(([n, t]) => { const ys = xs.filter(x => x.niveau === n); if (!ys.length) return '';
    const par = new Map(); ys.forEach(x => { const k = x.nom || '\u0001' + x.texte; (par.get(k) || par.set(k, []).get(k)).push(x); });
    return `<div class="ix-groupe ${n}"><span>${t}</span><b>${ys.length}</b></div><ul class="ix-liste co-liste">` + [...par.values()].map(g => { const x = g[0];
      return `<li><button class="ix-item co-item" data-k="${xs.indexOf(x)}" title="${escA(g.map(y => y.texte).join('\n'))}">`
      + `<span class="co-code ${x.nom ? genreDe(x.nom) : 'tab'}" aria-hidden="true">${x.nom ? esc(codeDe(x.nom)) : ico('tableau')}</span>`
      + `<span class="min0"><b>${esc(x.nom || 'Tableau')}${g.length > 1 ? ` <em>${g.length} ${n === 'ko' ? 'problèmes' : 'points'}</em>` : ''}</b><small>${(typeof insecable === 'function' ? insecable : t => t)(esc(x.texte))}${g.length > 1 ? ' …' : ''}</small></span>`
      + (x.plan && x.plan !== '*' ? `<span class="ix-folio">f. ${esc(x.plan)}</span>` : '') + '</button></li>'; }).join('') + '</ul>'; }).join(''); }
// une ligne : son folio, son bloc et sa fiche — ou le tableau, filtré sur ce qu'il faut reprendre
function allerAuControle(x) {
  if (x.tableau != null) { app.base.filtre = x.tableau; app.base.portee = 'tout'; app.base.tri = x.texte.includes('sans type') ? { k: 'type', sens: 1 } : { k: 'de', sens: 1 }; if (app.base.ouvert) rendreBase(); else ouvrirBase(); return; }
  if (x.plan && x.plan !== app.plan && plans().includes(x.plan)) allerAuPlan(x.plan);
  const c = app.dessin && app.dessin.comps.find(k => k.name === x.nom && k.kind !== 'tag'), vt = c ? null : barretteAPoser(x.nom);
  if (c) choisirBloc(c); else if (vt) choisirBarretteAPoser(vt); else { app.cible = { type: 'bloc', nom: x.nom }; ouvrirInspecteur(); }
  viser(x.nom); }
function lierControle() { }
