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
       permanent qui dépasse le contact ; une chute en ligne qui dépasse la
       chute admise (la règle du lecteur : 2 V, 4 V en triphasé) sur des
       longueurs du retest ;
     · les POINTS À VOIR : chaque barrette à poser (un dédoublement), ce
       qu'une prise a de bancal, les fils sans type (leur jauge ne se vérifie
       pas), les liaisons incomplètes (ni dessinées, ni vérifiées), un calibre
       au-dessus du continu d'un fil, de son contact ou du maximum de l'AC
       43.13-1B pour sa jauge, un fil pas protégé en surcharge brève, un part
       number de disjoncteur d'une famille inconnue, une chute en ligne de
       trop sur des longueurs d'hypothèse, un conducteur CCA sur un contact
       cuivre ordinaire, un câble qui ne tient pas l'ambiante.
   Chaque défaut une fois, sur son repère ; ce qui vaut pour tout le contrat
   (les types inconnus, l'ambiante) va sur le tableau. Les phrases montrées
   au lecteur disent « câble » et « gauge » (ses mots), le code garde les
   siens (`fil`, `jauge`). Chaque point porte la section de la fiche qui le
   démontre (la fiche v4 en a peu : Calibre, Connecteur — ou Module —,
   Raccord, Câbles) : une ligne de l'index ouvre la fiche sur elle, allumée.
   =========================================================================== */
'use strict';

const CONTROLE = { cle: null, items: [], ouvert: false, genres: new Map(), pas: null, lignes: null };   // genres : ceux qu'on a pliés ou dépliés ; pas : où P en est
const genreDe = nom => VT_A_POSER.test(nom) ? 'aposer' : estCoupure(nom) ? 'coupure' : estBarrette(nom) ? 'barrette' : 'eqpt';
/* La SECTION de la fiche qui démontre un point (08-sections) : la ligne de l'index y mène, ouverte. Un disjoncteur dit
   la sienne (`sectionDj`, 08 bis : son calibre, ou ses câbles) ; un câble qu'un repère nourrit se voit dans « Câbles » ;
   le reste — un arrangement qui ne loge pas, une barrette à poser, un contact ou une gauge refusés, un conducteur CCA —
   se voit dans « Connecteur » (ou « Module » : ses contacts y sont). */
const sectionDuPoint = (nom, texte) => !nom ? '' : estDisjoncteur(nom) ? sectionDj(texte) : estMasse(nom) ? 'fils' : 'connecteur';
function controleDuContrat() { const V = verite(), N = app.norme, H = app.simu || HYPOTHESES, items = [], ko = (nom, texte) => items.push({ niveau: 'ko', nom, texte, section: sectionDuPoint(nom, texte) }), att = (nom, texte, plus) => items.push({ niveau: 'att', nom, texte, section: sectionDuPoint(nom, texte), ...plus });
  // le contact de chaque bout d'un fil, par les plans (la taille, la référence à sertir) : la protection et le CCA s'en servent
  const contacts = new Map(), noter = (r, fils) => (fils || []).forEach(x => { if (!x.f || !x.f.l) return; (contacts.get(x.f.l) || contacts.set(x.f.l, []).get(x.f.l)).push({ repere: r, taille: x.taille, sertir: x.sertir || null }); });
  const reperes = [...new Set(V.flatMap(l => [l.de, l.vers]).filter(Boolean))].sort(triNaturel).filter(r => !estMasse(r) && !estRenvoi(r));
  reperes.forEach(r => {
    try {
      if (estDisjoncteur(r)) controleDisjonction(r).forEach(x => (x.niveau === 'ko' ? ko : att)(r, x.texte));
      if (barretteEnModules(r)) { const Q = planDeBarrette(r).plan, n = Q.fils.filter(x => x.jaugeOk === false).length; noter(r, Q.fils);
        Q.verdicts.filter(v => v.niveau === 'ko').forEach(v => ko(r, v.texte)); if (n) ko(r, pluriel(n, 'câble') + ' refusé' + (n > 1 ? 's' : '') + ' par son contact'); }
      else if (coupureEnModules(r)) { const Q = planDeCoupure(r).plan; noter(r, Q.fils);
        Q.verdicts.forEach(v => { if (v.niveau === 'ko') ko(r, v.texte); else if (v.niveau === 'attention') att(r, v.texte); }); }
      // une cavité : ses problèmes, et ses remarques — sauf les deux fils sur un contact, que la barrette à poser dit déjà
      else if (!estBornier(r)) cavitesDe(r).forEach(c => { noter(r, c.plan.fils); c.plan.verdicts.forEach(v => { if (v.niveau === 'ko') ko(r, c.nom + ' · ' + v.texte); else if (v.niveau === 'attention' && !/^contact \S+ : \d+ câbles/.test(v.texte)) att(r, c.nom + ' · ' + v.texte); }); });
    } catch (_) { } });
  // un conducteur qui n'est pas du cuivre (AD, VN : aluminium cuivré) serti sur un contact cuivre ordinaire : à qualifier
  contacts.forEach((xs, l) => { const fam = cableFamilleDe(N, l.type); if (!fam || !fam.conducteur || fam.conducteur === 'cuivre') return;
    xs.forEach(x => { if (x.sertir && x.sertir.reference && !contactPourCca(x.sertir.reference)) att(x.repere, `${l.cable || 'câble sans numéro'} (${l.type}) : conducteur ${fam.conducteur} sur un contact ${x.sertir.reference} — qualification CCA à confirmer`); }); });
  // les disjoncteurs : tout ce qu'ils nourrissent, la table 11-3, les contacts, la chute en ligne
  reperes.filter(estDisjoncteur).forEach(r => { try { controleProtection(r, contacts, V, N, H).forEach(x => (x.niveau === 'ko' ? ko : att)(r, x.texte)); } catch (_) { } });
  // les barrettes à poser, folio par folio
  (plans().length ? plans() : ['*']).forEach(p => liaisonsDe(p).forEach(l => {
    if (l.origine === null && l.vers === l.aPoser && l.borneVers === '1') att(l.aPoser, `à poser sur ${l.de}:${l.borneDe}`, { plan: p }); }));
  // les types de fil que la base des câbles ne connaît pas (une faute de frappe, un câble à ajouter)
  if (cablesDe(N).length) { const inc = [...new Set(V.filter(l => liaisonComplete(l) && l.de !== l.vers && l.type && !cableDuType(N, l.type)).map(l => l.type))].sort(triNaturel);
    if (inc.length) att('', (inc.length > 1 ? inc.length + ' types de câble inconnus' : 'un type de câble inconnu') + ' de la base des câbles : ' + inc.slice(0, 5).join(', ') + (inc.length > 5 ? '…' : ''), { tableau: '' }); }
  const sansType = V.filter(l => liaisonComplete(l) && l.de !== l.vers && !l.type).length;
  if (sansType) att('', pluriel(sansType, 'câble') + ' sans type : ' + (sansType > 1 ? 'leur' : 'sa') + ' gauge ne se vérifie pas', { tableau: '' });
  const inc = V.filter(l => !liaisonComplete(l) && (l.de || l.vers || l.cable)).length;
  if (inc) att('', pluriel(inc, 'liaison') + ' incomplète' + (inc > 1 ? 's' : '') + ' : ni dessinée' + (inc > 1 ? 's' : '') + ', ni vérifiée' + (inc > 1 ? 's' : ''), { tableau: '' });
  // les câbles qui ne tiennent pas l'ambiante de la simulation (l'EN 2853 les échauffe de 40 °C) : une fois par famille
  const tenues = new Map(); V.forEach(l => { if (!liaisonComplete(l) || l.de === l.vers || !l.type) return; const t = tenueEnTemperature(N, l.type, H.ambiante); if (t && !t.ok && !tenues.has(typeDuFil(l.type))) tenues.set(typeDuFil(l.type), t); });
  if (tenues.size) att('', `ambiante ${nombre(H.ambiante)} °C : ${[...tenues].map(([f, t]) => f + ' (' + nombre(t.tmax) + ' °C max)').join(', ')} ne ${tenues.size > 1 ? 'tiennent' : 'tient'} pas l’échauffement de 40 °C de l’EN 2853 (${nombre(H.ambiante + ECHAUFFEMENT_EN2853)} °C au conducteur)`, { tableau: '' });
  items.forEach(x => { if (x.nom && x.plan == null) x.plan = plansDuRepere(x.nom).sort(triNaturel)[0] || ''; x.genre = genreDuPoint(x); });
  return items; }
/* LE GENRE D'UN POINT (audit v72 : sur un grand retest, 192 lignes une par repère, quand huit genres disent tout) :
   chaque point se range dans un genre, que l'index et le récapitulatif montrent groupé, avec son compte et le geste qui
   le traite. L'ordre de GENRES_CONTROLE est celui de la lecture : ce qui casse d'abord. */
const GENRES_CONTROLE = [['arrangement', 'connecteurs qu’aucun arrangement ne loge', 'connecteur qu’aucun arrangement ne loge'], ['contact', 'contacts à revoir', 'contact à revoir'],
  ['calibre', 'calibres à revoir', 'calibre à revoir'], ['protection', 'câbles mal protégés par leur disjoncteur', 'câble mal protégé par son disjoncteur'],
  ['chute', 'chutes de tension trop fortes', 'chute de tension trop forte'], ['profil', 'disjoncteurs sans profil de charge', 'disjoncteur sans profil de charge'],
  ['aposer', 'barrettes à poser', 'barrette à poser'], ['cca', 'conducteurs CCA à qualifier', 'conducteur CCA à qualifier'], ['retest', 'points du retest', 'point du retest'], ['autre', 'autres points', 'autre point']];
// le genre en mots, au nombre qu'il compte : « 2 chutes de tension trop fortes », « 1 barrette à poser »
const motDuGenre = (g, n) => { const G = GENRES_CONTROLE.find(x => x[0] === g) || GENRES_CONTROLE[GENRES_CONTROLE.length - 1]; return n > 1 ? G[1] : G[2]; };
const rangDuGenre = g => { const i = GENRES_CONTROLE.findIndex(x => x[0] === g); return i < 0 ? GENRES_CONTROLE.length : i; };
function genreDuPoint(x) { const t = x.texte || '';
  if (x.tableau != null) return 'retest';
  if (/^à poser sur/.test(t)) return 'aposer';
  if (/qualification CCA/.test(t)) return 'cca';
  if (/profil de charge est à renseigner/.test(t)) return 'profil';
  if (/^chute en ligne/.test(t)) return 'chute';
  if (/aucun arrangement|n['’]a pas de contact|ne loge /.test(t)) return 'arrangement';
  if (/refusé|aucun contact|dépasse le contact|contact taille \S+ (supposé )?\(|joint arrière|contact \S+ : \d+ câbles/.test(t)) return 'contact';
  if (/pas protégé|admis en continu|> [\d,]+ A admis|table 11-3|sans résistance dans la base/.test(t)) return 'protection';
  if (x.nom && estDisjoncteur(x.nom)) return 'calibre';
  return 'autre'; }
/* CE QU'UN DISJONCTEUR PROTÈGE, au-delà de ce que sa fiche relève (`controleDisjonction` : le profil, ses fils directs,
   la sélectivité) : un part number d'une famille inconnue (le calibre ne s'y lit pas) ; chaque fil qu'il nourrit à
   travers les prises et les barrettes, jugé comme les fils directs (la charge, le continu, la surcharge brève) ; pour
   tous, le maximum de l'AC 43.13-1B par jauge et le contact — le contact du plan quand on le connaît, le plus faible
   des deux bouts, sinon la taille usuelle de la jauge ; enfin la chute en ligne de chaque chemin, au permanent et à
   chaque pointe, contre la chute admise (`chuteAdmise` : la règle du lecteur, 2 V en continu et en monophasé, 4 V en
   triphasé ; sinon la table Réseau, dont l'intermittent ≤ 2 min a droit au double) — un problème sur des longueurs du
   retest, à voir sur des longueurs d'hypothèse. Les phrases disent « câble » et « gauge », les mots du lecteur.
   Rend [{ niveau, texte }]. */
// ce qu'un câble supporte, en mots : avant de s'abîmer (sa courbe de dommage), sinon en service
const limiteDuCable = (f, x) => f.jugeSur === 'dommage' ? `il s’abîme au-delà de ${amperes(x.admise)}` : `le câble admet ${amperes(x.admise)} en service`;
// le contact d'un câble en mots : celui du plan (« taille 20 (7,5 A, 103J1) »), sinon celui que Volta suppose — le plus petit
// qui admet la gauge, par prudence (« taille 23 supposé (3 A) » ; la fiche dit pourquoi sous le problème)
const motContact = f => `taille ${f.contact.taille} ${f.contact.parLePlan ? '(' + amperes(f.contact.intensite) + ', ' + f.contactRepere + ')' : 'supposé (' + amperes(f.contact.intensite) + ')'}`;
function controleProtection(nom, contacts, V, N, H) { const d = disjonctionDe(nom), out = [], cal = d.calibre, pn = pnDuRepere(nom);
  if (pn && !d.famille && !d.ecrit) out.push({ niveau: 'att', texte: `part number ${pn} : famille de disjoncteur inconnue, le calibre ne s’y lit pas${cal ? ' — ' + amperes(cal) + ' (l’idéal) retenu' : ''}` });
  // le courant de chaque contact du câble, borné par la gauge du câble serti (R1) ; le plus faible des deux bouts juge
  const fils = filsDepuis(V, nom).map(f => { const xs = (contacts.get(f.l) || []).map(x => ({ x, i: intensiteDuContactPose(N, x) })).filter(y => y.i).sort((a, b) => a.i.intensite - b.i.intensite);
    return xs.length ? { ...f, taille: xs[0].x.taille, contactRepere: xs[0].x.repere } : f; });
  protectionDesFils(N, cal, d.profil, fils, H).forEach(f => { const nomF = (f.cable || 'câble sans numéro') + (f.type ? ' (' + f.type + ')' : '') + (f.direct ? '' : ' (par ' + f.via + ')');
    if (!f.direct) {
      if (f.verdict === 'fil') out.push({ niveau: 'ko', texte: `${nomF} : ${f.pire.nom} ${amperes(f.pire.i)}${f.pire.t === Infinity ? '' : ' / ' + secondes(f.pire.t)} > ${amperes(f.pire.admise)} admis ${pourPalier(f.pire.palier)}${motFacteur(f.pire.palier === Infinity ? f.facteur : f.facteurCourt)}` });
      else if (f.verdict === 'calibre') out.push({ niveau: 'att', texte: `${nomF} : ${amperes(f.continu)} admis en continu${motFacteur(f.facteur)} < calibre ${amperes(cal)} — pas protégé en surcharge` });
      else if (f.protege === false) { const x = f.pireLaisse; out.push({ niveau: 'att', texte: `${nomF} : pas protégé en surcharge brève — le ${amperes(cal)} laisse passer ${amperes(x.courant)} ${pourPalier(x.palier)} à ${f.courbeLente}, ${limiteDuCable(f, x)}` }); } }
    if (f.refuse) out.push({ niveau: 'att', texte: `${nomF} : conducteur ${f.conducteur} sans résistance dans la base, son intensité admissible est inconnue` });
    if (f.horsTable) out.push({ niveau: 'att', texte: `${nomF} : calibre ${amperes(cal)} > ${amperes(f.calibreMax)}, le maximum de l’AC 43.13-1B (table 11-3) pour du ${f.jauge} AWG` });
    if (f.contactDepasse) out.push({ niveau: 'ko', texte: `${nomF} : le permanent (${amperes(f.permanent)}) dépasse le contact ${motContact(f)}` });
    else if (f.contactSurcharge) out.push({ niveau: 'att', texte: `${nomF} : contact ${motContact(f)} < calibre ${amperes(cal)} — pas protégé en surcharge` }); });
  // la chute en ligne : au permanent du profil (sinon le calibre, sinon l'hypothèse), et à chaque état court
  const I = d.profil && d.profil.perm && d.profil.perm.i > 0 ? d.profil.perm.i : cal > 0 ? cal : H.courant, courts = d.points.filter(p => p.t !== Infinity && p.i > 0);
  chutesDepuis(N, V, nom, I, H, courts).forEach(c => { const ou = c.bout[0] + (c.bout[1] ? ':' + c.bout[1] : ''), hyp = c.reel ? '' : ' (longueurs d’hypothèse)', niveau = c.reel ? 'ko' : 'att';
    if (c.trop) out.push({ niveau, texte: `chute en ligne vers ${ou} : ${volts(c.dU)} à ${amperes(I)} > ${volts(c.admis)} admis sous ${nombre(c.tension)} V${hyp}` });
    else { const p = (c.pointes || []).find(x => x.trop); if (p) out.push({ niveau, texte: `chute en ligne vers ${ou} en pointe : ${volts(p.dU)} à ${amperes(p.i)} pendant ${secondes(p.t)} > ${volts(p.admis)} admis${p.intermittent && p.admis !== c.admis ? ' en intermittent' : ''}${hyp}` }); } });
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
  if (app.insp.index && !$('inspecteur').hidden && !app.cible) rendreIndex($('ba-equip')); }
/* ---- « À REPRENDRE », PAR GENRE (l'audit v72, P1-5 : « à l'échelle, la liste noie » — 192 lignes une par repère sur un
   grand retest, quand huit genres disent tout) ------------------------------------------------------------------------
   Les points se rangent par niveau (les problèmes, puis ce qui est à voir), puis par genre, dans l'ordre de la lecture ;
   chaque genre dit son compte et ses repères, « Voir le premier » y mène, et le GESTE qui le traite d'un coup quand il
   existe (« Toutes les poser », « Écrire les profils », « Écrire les longueurs », « Voir les disjoncteurs »). Déplié, un
   genre montre ses LIGNES (`.co-item`, une par repère : chacun de ses points, en clair) ; un genre se déplie d'office
   quand toute la liste est courte. P mène au point suivant (Maj+P au précédent), d'un bout à l'autre de la liste : le
   mot dit où l'on en est (« 3 / 10 »). Le récapitulatif (l'onglet Problèmes) range ses lignes de même. */
const COURTE = 12;   // au-delà de tant de lignes, les genres restent pliés (on les déplie, ou on suit P)
/* Les lignes, dans l'ordre de la lecture : [{ cle, niveau, genre, nom, xs, plan, k }] — une par niveau, genre et repère
   (le tableau : une par point) ; `k` : le rang de son premier point dans CONTROLE.items. */
function lignesDuControle() { const xs = CONTROLE.items || []; if (CONTROLE.lignes && CONTROLE.lignes.items === xs) return CONTROLE.lignes.L;
  const par = new Map(); xs.forEach(x => { const cle = x.niveau + '|' + (x.genre || 'autre') + '|' + (x.nom || '\u0001' + x.texte); const g = par.get(cle) || par.set(cle, { cle, niveau: x.niveau, genre: x.genre || 'autre', nom: x.nom || '', xs: [] }).get(cle); g.xs.push(x); });
  const L = [...par.values()].sort((a, b) => (a.niveau === 'ko' ? 0 : 1) - (b.niveau === 'ko' ? 0 : 1) || rangDuGenre(a.genre) - rangDuGenre(b.genre) || triNaturel(a.nom || '~', b.nom || '~'));
  L.forEach(l => { l.plan = l.xs[0].plan || ''; l.k = xs.indexOf(l.xs[0]); });
  CONTROLE.lignes = { items: xs, L }; return L; }
// les genres : [{ cle: 'ko|chute', niveau, genre, lignes, n (points), noms (repères) }]
function genresDuControle() { const G = new Map();
  lignesDuControle().forEach(l => { const k = l.niveau + '|' + l.genre, g = G.get(k) || G.set(k, { cle: k, niveau: l.niveau, genre: l.genre, lignes: [], n: 0, noms: new Set() }).get(k); g.lignes.push(l); g.n += l.xs.length; if (l.nom) g.noms.add(l.nom); });
  return [...G.values()]; }
/* LE GESTE QUI TRAITE UN GENRE, quand il existe : { mot, aide, faire }. Les barrettes à poser se posent toutes d'un coup
   (chacune sous le repère que l'outil propose, un seul Ctrl+Z) ; les autres mènent au tableau qui les corrige, filtré. */
function gesteDuGenre(g) { const xs = g.lignes.flatMap(l => l.xs);
  if (g.genre === 'aposer') return { mot: g.lignes.length > 1 ? 'Toutes les poser' : 'La poser', aide: 'Chacune entre au contrat sous le repère que l’outil propose (la suite de la barrette la plus proche) ; « Rétablir » ou Ctrl+Z les rend à poser', faire: () => poserLesBarrettes(g.lignes.map(l => l.nom)) };
  if (g.genre === 'profil') return { mot: 'Écrire les profils', aide: 'L’onglet Disjoncteurs du récapitulatif : ceux sans profil de charge, la colonne Permanent à écrire', faire: () => ouvrirOngletFiltre('disjoncteurs', ['sansprofil'], ['profil']) };
  if (g.genre === 'calibre' || g.genre === 'protection') return { mot: 'Voir les disjoncteurs', aide: 'L’onglet Disjoncteurs du récapitulatif : ceux qui ont quelque chose à reprendre', faire: () => ouvrirOngletFiltre('disjoncteurs', ['probleme']) };
  if (g.genre === 'chute') return xs.every(x => /hypothèse/.test(x.texte)) ? { mot: 'Écrire les longueurs', aide: 'Ces chutes se calculent sur des longueurs supposées : l’onglet Liaisons, les câbles sans longueur au retest', faire: () => ouvrirOngletFiltre('liaisons', ['hyp'], null, 'tout') }
    : { mot: 'Voir les câbles', aide: 'L’onglet Liaisons du récapitulatif : les liaisons à reprendre', faire: () => ouvrirOngletFiltre('liaisons', ['probleme'], null, 'tout') };
  return null; }
// un onglet du récapitulatif, ses puces pressées (et rien d'autre), des colonnes en plus, la portée
function ouvrirOngletFiltre(onglet, puces, colonnes, portee) { const b = app.base; b.filtreAuto = false; b.filtre = ''; changerOnglet(onglet, true);
  b.puces[onglet] = puces || []; if (colonnes) { const ch = b.colonnes[onglet] || (b.colonnes[onglet] = {}); colonnes.forEach(c => { ch[c] = true; }); }
  if (portee) b.portee = portee; b.filtre = ''; b.tri = null; memoriserBase(); if (b.ouvert) rendreBase(true); else ouvrirBase(); }
/* Toutes les barrettes à poser d'un coup : chacune sous le repère proposé (celui du récapitulatif, `prochainRepereVT`,
   relu après chaque pose : les noms se suivent) ; une seule entrée d'historique. */
function poserLesBarrettes(noms) { const vus = new Set(); let n = 0;
  const vts = noms.filter(v => VT_A_POSER.test(v) && !vus.has(v) && vus.add(v)); if (!vts.length) return 0;
  histPush('pose de ' + pluriel(vts.length, 'barrette'));
  vts.forEach(vt => { assurerModele(); const r = reperes().find(x => x.aPoser && x.nom === vt), nom = r ? prochainRepereVT(r) : '';
    if (nom && poserBarrette(vt, nom, { plan: r.plan || '*' })) n++; });
  if (!n) { app.hist.pop(); synchroniserHistorique(); } else { if (app.hist.length) app.hist[app.hist.length - 1].quoi = 'pose de ' + pluriel(n, 'barrette'); apresEdition(); }
  if (n) direRetablir(n > 1 ? n + ' barrettes posées au contrat, chacune sous le repère proposé.' : 'La barrette est posée au contrat sous le repère proposé.');
  else dire('Aucune barrette n’a pu être posée.', true); return n; }

/* La liste « à reprendre », en tête de l'index : les problèmes, puis les points à voir, par genre. */
function listeControleHtml() { const xs = CONTROLE.items; if (!xs.length) return '';
  const G = genresDuControle(), lignes = lignesDuControle().length, I = typeof insecable === 'function' ? insecable : t => t;
  const ouvert = g => CONTROLE.genres.has(g.cle) ? CONTROLE.genres.get(g.cle) : lignes <= COURTE;
  const ligne = l => { const x = l.xs[0], tous = l.xs.map(y => y.texte), vus = tous.slice(0, 3);
    return `<li><button class="ix-item co-item" data-k="${l.k}" data-ligne="${escA(l.cle)}"${tous.length > 3 ? ` data-bulle="${escA(tous.map(majuscule).join('\n'))}"` : ''}>`
      + `<span class="co-code ${x.nom ? genreDe(x.nom) : 'tab'}" aria-hidden="true">${x.nom ? esc(codeDe(x.nom)) : ico('tableau')}</span>`
      + `<span class="min0"><b>${esc(x.nom || 'Tableau')}${tous.length > 1 ? ` <em>${tous.length} ${l.niveau === 'ko' ? 'problèmes' : 'points'}</em>` : ''}</b>${vus.map(t => `<small>${I(esc(majuscule(t)))}</small>`).join('')}${tous.length > 3 ? `<small class="co-plus">et ${tous.length - 3} de plus</small>` : ''}</span>`
      + (l.plan && l.plan !== '*' ? `<span class="ix-folio">f. ${esc(l.plan)}</span>` : '') + '</button></li>'; };
  const genre = g => { const G2 = gesteDuGenre(g), noms = [...g.noms], dit = noms.length === 1 ? noms[0] : noms.length ? plurielLie(noms.length, 'repère') : 'le tableau', o = ouvert(g);
    const folios = [...new Set(g.lignes.map(l => l.plan).filter(p => p && p !== '*'))];
    // la tête : le chevron, le compte, le mot sur toute la largeur ; dessous, ses repères et ses folios, et ses gestes
    return `<div class="co-genre ${g.niveau}" data-genre="${escA(g.cle)}"${o ? ' data-ouvert="1"' : ''}>`
      + `<button type="button" class="co-genre-bascule" aria-expanded="${o}" data-genre-bascule="${escA(g.cle)}">${ico('bas', 'co-chevron')}<b class="co-n">${g.n}</b><span class="co-genre-l">${esc(motDuGenre(g.genre, g.n))}</span></button>`
      + `<div class="co-genre-pied"><small>${esc(dit)}${folios.length ? ' · ' + esc(folios.length > 3 ? folios.length + ' folios' : 'f. ' + folios.join(' · ')) : ''}</small>`
      + `<span class="co-gestes"><button type="button" class="co-voir" data-premier="${escA(g.cle)}" data-bulle="Sa fiche, sur son folio ; P passe au point suivant">${g.lignes.length > 1 ? 'Voir le premier' : 'Voir'}</button>${G2 ? `<button type="button" class="co-geste" data-geste="${escA(g.cle)}" data-bulle="${escA(G2.aide)}">${esc(G2.mot)}</button>` : ''}</span></div>`
      + (o ? `<ul class="ix-liste co-liste">${g.lignes.map(ligne).join('')}</ul>` : '') + '</div>'; };
  return [['ko', 'Problèmes'], ['att', 'À voir']].map(([n, t]) => { const gs = G.filter(g => g.niveau === n); if (!gs.length) return '';
    return `<div class="ix-groupe ${n}"><span>${t}</span><b>${gs.reduce((s, g) => s + g.n, 0)}</b></div><div class="co-genres">${gs.map(genre).join('')}</div>`; }).join('')
    + `<p class="co-astuce"><kbd>P</kbd> le point suivant · <kbd>Maj</kbd> <kbd>P</kbd> le précédent</p>`; }
/* Les gestes de la liste (l'index ; l'onglet Problèmes a les siens) : déplier un genre, « Voir le premier », son geste.
   `rendre` : refaire la liste. */
function lierListeControle(box, rendre) {
  box.querySelectorAll('[data-genre-bascule]').forEach(b => b.onclick = () => { const k = b.dataset.genreBascule, d = b.closest('.co-genre'); CONTROLE.genres.set(k, !d.dataset.ouvert); rendre(); });
  box.querySelectorAll('[data-premier]').forEach(b => b.onclick = e => { e.stopPropagation(); allerAuGenre(b.dataset.premier); });
  box.querySelectorAll('[data-geste]').forEach(b => b.onclick = e => { e.stopPropagation(); faireLeGeste(b.dataset.geste); }); }
const faireLeGeste = cle => { const g = genresDuControle().find(x => x.cle === cle), G = g && gesteDuGenre(g); if (G) G.faire(); };
// le premier point d'un genre ; P continuera de là
function allerAuGenre(cle) { const L = lignesDuControle(), i = L.findIndex(l => l.niveau + '|' + l.genre === cle); if (i >= 0) allerALaLigne(i, L); }
/* P : le point suivant (Maj+P : le précédent), d'un bout à l'autre de la liste ; la place se garde par la clé de la ligne
   (corriger un point le fait disparaître : on repart de la ligne qui a pris sa place). */
function problemeSuivant(pas) { const L = lignesDuControle(); if (!L.length) { dire('Rien à reprendre : le contrôle ne relève rien.'); return; }
  const P = CONTROLE.pas; let i = P ? L.findIndex(l => l.cle === P.cle) : -1;
  if (i < 0) i = P ? Math.min(P.rang, L.length) - (pas > 0 ? 1 : 0) : (pas > 0 ? -1 : L.length);
  const j = i + pas; allerALaLigne((j % L.length + L.length) % L.length, L, j >= L.length || j < 0); }
function allerALaLigne(i, L, tour) { const l = L[i]; if (!l) return; CONTROLE.pas = { cle: l.cle, rang: i };
  allerAuControle(l.xs[0]);
  dire(`${tour ? 'De nouveau au début · ' : ''}${l.niveau === 'ko' ? 'Problème' : 'À voir'} ${i + 1} / ${L.length} · ${majuscule(motDuGenre(l.genre, 1))}${l.nom ? ' · ' + l.nom : ''} — P : le suivant`); }
// le bouton des repères, son compte : l'index ouvert sur les problèmes (« à reprendre » déplié)
function ouvrirProblemes() { CONTROLE.ouvert = true; const ix = !$('inspecteur').hidden && app.insp.index;
  if (ix && !app.cible) rendreIndex($('ba-equip')); else if (ix) retourIndex(); else basculerIndex(); }
// une ligne : son folio, son bloc et sa fiche — ou l'onglet Liaisons du récapitulatif, trié sur ce qu'il faut reprendre
function allerAuControle(x) {
  if (x.tableau != null) { app.base.filtreAuto = false; changerOnglet('liaisons', true); app.base.filtre = x.tableau; app.base.portee = 'tout';
    app.base.tri = x.texte.includes('sans type') ? { k: 'jauge', sens: -1 } : { k: 'de', sens: 1 }; if (app.base.ouvert) rendreBase(true); else ouvrirBase(); return; }
  if (x.plan && x.plan !== app.plan && plans().includes(x.plan)) allerAuPlan(x.plan);
  // le connecteur que le point nomme (« B · aucun arrangement… ») est celui que la fiche montre
  const k = /^([A-Z]{1,2}\d?) · /.exec(x.texte); if (k && typeof FI !== 'undefined') FI.connecteur[x.nom] = k[1];
  const c = app.dessin && app.dessin.comps.find(k => k.name === x.nom && k.kind !== 'tag'), vt = c ? null : barretteAPoser(x.nom);
  if (c) choisirBloc(c); else if (vt) choisirBarretteAPoser(vt); else { app.cible = { type: 'bloc', nom: x.nom }; ouvrirInspecteur(); }
  // la fiche s'ouvre sur la section qui démontre le point, allumée (sinon sur celle du disjoncteur)
  const box = $('ba-equip'); if (x.section && box) [x.section, estDisjoncteur(x.nom) ? 'disjoncteur' : ''].filter(Boolean).some(s => ouvrirSection(box, s));
  viser(x.nom); }
function lierControle() { }
