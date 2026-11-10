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
/* v73 — LES POINTS RATTACHÉS AU CÂBLE (le technicien : « W-012 passe au vert alors que son disjoncteur est rouge » ;
   l'ingénieur : « le câble est l'objet en défaut, et c'est sa fiche qui se tait ») : chaque point qui parle d'un câble
   — la charge qu'il porte, sa protection, son contact contre le calibre, la chute d'un chemin, un conducteur CCA — porte
   `cables` : les liaisons du contrat dont il parle. `problemesDuCable(l)` les rend à la fiche du câble, avec la chaîne de
   cause quand c'est le disjoncteur. Un point de disjoncteur dit son câble en tête (« W-012 (DR20) : … ») : on l'y lit. */
const nomDuCableDit = f => cableEtType(f);
function cablesDuTexte(d, texte) { const t = String(texte || ''); return (d && d.fils || []).filter(f => f.l && (t.startsWith(nomDuCableDit(f) + ' : ') || t.startsWith(nomDuCableDit(f) + ' (par '))).map(f => f.l); }
function controleDuContrat() { const V = verite(), N = app.norme, H = app.simu || HYPOTHESES, items = [], ko = (nom, texte, plus) => items.push({ niveau: 'ko', nom, texte, section: sectionDuPoint(nom, texte), ...plus }), att = (nom, texte, plus) => items.push({ niveau: 'att', nom, texte, section: sectionDuPoint(nom, texte), ...plus });
  // la chute affichée est celle des fiches (`chutesDuDisjoncteur`, 08-fiche) : le contrôle la relit avec le contrat neuf
  if (typeof CHUTES !== 'undefined') CHUTES.cle = null;
  // le contact de chaque bout d'un fil, par les plans (la taille, la référence à sertir) : la protection et le CCA s'en servent
  // (v84 : le câble serti et le fût du contact gardés — le courant du contact en dépend, `intensiteDuContactPose`)
  const contacts = new Map(), noter = (r, fils) => (fils || []).forEach(x => { if (!x.f || !x.f.l) return; (contacts.get(x.f.l) || contacts.set(x.f.l, []).get(x.f.l)).push({ repere: r, taille: x.taille, sertir: x.sertir || null, f: x.f, fut: x.sertir && x.sertir.fut != null ? x.sertir.fut : null }); });
  const reperes = [...new Set(V.flatMap(l => [l.de, l.vers]).filter(Boolean))].sort(triNaturel).filter(r => !estMasse(r) && !estRenvoi(r));
  reperes.forEach(r => {
    try {
      // (v87, S5) le genre d'un point du disjoncteur, quand il le dit (« consommations à écrire »), et ses câbles
      if (estDisjoncteur(r)) { const d = disjonctionDe(r); controleDisjonction(r).forEach(x => (x.niveau === 'ko' ? ko : att)(r, x.texte, { cables: x.cables || (x.l ? [x.l] : cablesDuTexte(d, x.texte)), ...(x.genre ? { genre: x.genre } : {}), ...(x.aEcrire ? { aEcrire: x.aEcrire } : {}) }));
        // v73 — deux part numbers sur un même disjoncteur (l'ingénieur : « une faute que je ne veux pas envoyer à la fabrication »)
        const pns = partNumbersDuRepere(r, V); if (pns.length > 1) ko(r, `porte deux part numbers : ${pns.map(p => p.pn + ' (' + p.cables.join(', ') + ')').join(' ; ')}`, { genre: 'pn', pns: pns.map(p => p.pn) }); }
      if (barretteEnModules(r)) { const Q = planDeBarrette(r).plan, n = Q.fils.filter(x => x.jaugeOk === false).length; noter(r, Q.fils);
        Q.verdicts.filter(v => v.niveau === 'ko').forEach(v => ko(r, v.texte)); if (n) ko(r, pluriel(n, 'câble') + ' refusé' + (n > 1 ? 's' : '') + ' par son contact'); }
      // (passe 87) un écart de lettres entre les deux parties d'une prise (09, `faceDesParties`) porte son genre et son câble
      else if (coupureEnModules(r)) { const Q = planDeCoupure(r).plan; noter(r, Q.fils);
        Q.verdicts.forEach(v => { if (v.niveau === 'ko') ko(r, v.texte); else if (v.niveau === 'attention') att(r, v.texte, { ...(v.genre ? { genre: v.genre } : {}), ...(v.cables ? { cables: v.cables } : {}) }); }); }
      // une cavité : ses problèmes, et ses remarques — sauf les deux fils sur un contact, que la barrette à poser dit déjà ;
      // (passe 87) la référence d'un connecteur fourni qui nomme un arrangement sans toutes ses bornes : une écriture du fichier à vérifier
      else if (!estBornier(r)) cavitesDe(r).forEach(c => { noter(r, c.plan.fils); c.plan.verdicts.forEach(v => { if (v.niveau === 'ko') ko(r, c.nom + ' · ' + v.texte); else if (v.niveau === 'attention' && !/^contact \S+ : \d+ câbles/.test(v.texte)) att(r, c.nom + ' · ' + v.texte, v.genre ? { genre: v.genre } : undefined); }); });
    } catch (_) { } });
  /* LA SÉGRÉGATION (le lecteur, v74) : la route d'un câble (colonne H : 1MO, 2HO…) — impair à gauche de l'hélicoptère, pair
     à droite. Mélanger gauche et droite sur un même connecteur, un même module de barrette ou un même côté d'une prise de
     coupure, c'est un BRANCHEMENT EN CHAÎNE : « pas top », parfois sans choix — à voir, jamais un problème. Deux routes
     d'un même côté : rien à dire. Une prise de coupure CHANGE de route : sa fiche et son embase peuvent différer. */
  try { const lieux = new Map(), poser = (r, lieu, l) => { const s = coteDeRoute(l && l.route); if (!s) return; const k = r + '\u0001' + lieu;
      const x = lieux.get(k) || lieux.set(k, { r, lieu, g: new Set(), d: new Set(), cables: new Set() }).get(k); (s === 'gauche' ? x.g : x.d).add(String(l.route).trim()); x.cables.add(l); };
    // (v84, la vitesse) les bouts de chaque repère, rangés une fois : chaque équipement relisait toutes les liaisons (1,3 s → quelques ms sur 3 000 liaisons)
    const boutsDe = new Map(); V.forEach(l => { if (!liaisonComplete(l)) return; [[l.de, l.borneDe, l.pnDe], [l.vers, l.borneVers, l.pnVers]].forEach(x => (boutsDe.get(x[0]) || boutsDe.set(x[0], []).get(x[0])).push([x, l])); });
    reperes.forEach(r => { if (estDisjoncteur(r)) return;
      if (barretteEnModules(r)) planDeBarrette(r).plan.fils.forEach(x => x.f && poser(r, 'module ' + (x.numero || x.module + 1), x.f.l));
      // (v84, les mots du lecteur) la prise : « partie mobile », « partie fixe » — jamais fiche / embase
      else if (coupureEnModules(r)) planDeCoupure(r).plan.fils.forEach(x => x.f && poser(r, x.f.amont ? 'côté partie mobile' : 'côté partie fixe', x.f.l));
      else if (!estBornier(r) && !estCoupure(r)) (boutsDe.get(r) || []).forEach(([[, b, pn], l]) => { const c = connecteurDeBorne(b, pn); poser(r, c && c.lettre ? 'connecteur ' + c.nom : 'connecteur', l); }); });
    lieux.forEach(x => { if (x.g.size && x.d.size) att(x.r, `branchement en chaîne : ${x.lieu} mélange gauche (${[...x.g].sort(triNaturel).join(', ')}) et droite (${[...x.d].sort(triNaturel).join(', ')})`, { genre: 'segregation', cables: [...x.cables] }); });
  } catch (_) { }
  // un conducteur qui n'est pas du cuivre (AD, VN : aluminium cuivré) serti sur un contact cuivre ordinaire : à qualifier
  contacts.forEach((xs, l) => { const fam = cableFamilleDe(N, l.type); if (!fam || !fam.conducteur || fam.conducteur === 'cuivre') return;
    xs.forEach(x => { if (x.sertir && x.sertir.reference && !contactPourCca(x.sertir.reference)) att(x.repere, `${cableEtType(l)} : conducteur ${fam.conducteur} sur un contact ${x.sertir.reference} — qualification CCA à confirmer`, { cables: [l] }); }); });
  // les disjoncteurs : tout ce qu'ils nourrissent, la table 11-3, les contacts, la chute en ligne
  reperes.filter(estDisjoncteur).forEach(r => { try { controleProtection(r, contacts, V, N, H).forEach(x => (x.niveau === 'ko' ? ko : att)(r, x.texte, { cables: x.cables || [], ...(x.genre ? { genre: x.genre } : {}), ...(x.section ? { section: x.section } : {}) })); } catch (_) { } });
  // les barrettes à poser, folio par folio
  (plans().length ? plans() : ['*']).forEach(p => liaisonsDe(p).forEach(l => {
    if (l.origine === null && l.vers === l.aPoser && estRaccordAPoser(l)) att(l.aPoser, `ajoutée par VOLTA sur ${l.de}:${l.borneDe} (plusieurs câbles sur une borne) — repère provisoire`, { plan: p }); }));
  // les types de fil que la base des câbles ne connaît pas (une faute de frappe, un câble à ajouter)
  if (cablesDe(N).length) { const inc = [...new Set(V.filter(l => liaisonComplete(l) && l.de !== l.vers && l.type && !cableDuType(N, l.type)).map(l => l.type))].sort(triNaturel);
    // (v86, le bilan d'ouverture) ses câbles : leur fiche le dit, et un seul type mène au récapitulatif filtré sur lui
    if (inc.length) { const cs = V.filter(l => liaisonComplete(l) && l.de !== l.vers && inc.includes(l.type));
      att('', (inc.length > 1 ? inc.length + ' types de câble inconnus' : 'un type de câble inconnu') + ' de la base des câbles : ' + inc.slice(0, 5).join(', ') + (inc.length > 5 ? '…' : '') + ' — ' + (cs.length > 1 ? pluriel(cs.length, 'câble') + ' dont la gauge' : 'sa gauge') + ' ne se vérifie pas', { tableau: inc.length === 1 ? inc[0] : '', cables: cs, genre: 'fichier', types: inc }); } }
  // (v86) des écritures du fichier, avec leurs câbles : le bilan d'ouverture et la fiche du câble les désignent
  const sansType = V.filter(l => liaisonComplete(l) && l.de !== l.vers && !l.type);
  if (sansType.length) att('', pluriel(sansType.length, 'câble') + ' sans type : ' + (sansType.length > 1 ? 'leur' : 'sa') + ' gauge ne se vérifie pas', { tableau: '', cables: sansType, genre: 'fichier' });
  const incompletes = V.filter(l => !liaisonComplete(l) && (l.de || l.vers || l.cable)), inc = incompletes.length;
  if (inc) att('', pluriel(inc, 'liaison') + ' incomplète' + (inc > 1 ? 's' : '') + ' : ni dessinée' + (inc > 1 ? 's' : '') + ', ni vérifiée' + (inc > 1 ? 's' : ''), { tableau: '', cables: incompletes, genre: 'fichier', incompletes: true });
  // les câbles qui ne tiennent pas l'ambiante de la simulation (l'EN 2853 les échauffe de 40 °C) : une fois par famille
  const tenues = new Map(); V.forEach(l => { if (!liaisonComplete(l) || l.de === l.vers || !l.type) return; const t = tenueEnTemperature(N, l.type, H.ambiante); if (t && !t.ok && !tenues.has(typeDuFil(l.type))) tenues.set(typeDuFil(l.type), t); });
  if (tenues.size) att('', `ambiante ${nombre(H.ambiante)} °C : ${[...tenues].map(([f, t]) => f + ' (' + nombre(t.tmax) + ' °C max)').join(', ')} ne ${tenues.size > 1 ? 'supportent' : 'supporte'} pas l’échauffement de 40 °C de l’EN 2853 (${nombre(H.ambiante + ECHAUFFEMENT_EN2853)} °C au conducteur)`, { tableau: '' });
  // (v86) une ligne en double, un repère écrit de deux façons : à régler ; le reste de la structure, à voir
  try { controleDeStructure(V).forEach(x => (x.niveau === 'ko' ? ko : att)(x.nom, x.texte, x.plus)); } catch (_) { }
  /* CHAQUE DÉFAUT UNE FOIS (v84) : deux chemins qui relèvent la même phrase sur le même repère (un fil direct et le même vu à
     travers une prise) n'en font qu'un point — ses câbles réunis. */
  const uniques = new Map(), sortie = [];
  items.forEach(x => { const k = x.niveau + '\u0001' + (x.nom || '') + '\u0001' + x.texte, y = uniques.get(k);
    if (!y) { uniques.set(k, x); sortie.push(x); return; }
    if (x.cables && x.cables.length) y.cables = [...new Set([...(y.cables || []), ...x.cables])]; });
  sortie.forEach(x => { if (x.nom && x.plan == null) x.plan = plansDuRepere(x.nom).sort(triNaturel)[0] || ''; x.genre = genreDuPoint(x); });
  return sortie; }
/* ---- LA STRUCTURE DU FICHIER (v84) -----------------------------------------------------------------------------------
   Ce que le fichier écrit de travers, que VOLTA ne corrige jamais de lui-même (le retest est la source dure : c'est au
   fichier de changer) mais qu'il DIT, une fois, sur son repère, avec ce qu'il faut faire :
     · À RÉGLER (v86, l'audit B3 : VOLTA dessinait et chiffrait sur une erreur qu'il avait lui-même vue) — chacun a son
       geste, une proposition de VOLTA qui part dans l'Excel corrigé, et rien d'autre ne l'écrit :
         - une ligne en double (01, `cleDeDoublon` : les mêmes bouts, le même type, le même numéro, le même folio) : VOLTA ne la
           dessine qu'une fois, sans barrette ; « Retirer la ligne en double » quand les copies sont pareilles en tout — si
           elles diffèrent ailleurs (une longueur, une route), VOLTA ne choisit pas : il dit en quoi ;
         - un repère écrit de deux façons (« 103rl1 » et « 103RL1 ») : VOLTA le lit d'une seule (02, `unifierLesReperes`) ;
           « Écrire 103RL1 partout » ;
     · à voir (aucun n'est faux à coup sûr) : une borne écrite de deux façons sur un même repère (« 1 » et « 01 ») ; un câble
       qui part et arrive sur la même borne ; un câble sans borne quand les autres en ont une (son contact ne se place pas) ;
       un connecteur à lettre (A12) qui porte deux part numbers (VOLTA ne lit que le premier) ; des liaisons sans folio
       quand le fichier en a plusieurs ; une longueur que VOLTA ne sait pas lire (« abc » : le câble prend l'hypothèse).
   Rend [{ nom, texte, niveau, plus }] ; `plus.cables` : les liaisons dont il parle (la fiche du câble les montre). */
const formeDuRepere = formeEcrite;
// ce qui distingue les copies d'une même ligne (ses autres cases) : « longueur 5 m / 3 m » ; rien quand elles sont pareilles en tout
const CASES_DES_COPIES = [['pnDe', 'part number'], ['pnVers', 'part number'], ['route', 'route'], ['longueur', 'longueur'], ['longueurBrute', 'longueur'], ['descriptionDe', 'description'], ['descriptionVers', 'description'],
  ['fwd', 'FWD'], ['appareil', 'appareil'], ['retest', 'date'], ['install', 'Install'], ['ecp', 'ECP']];
function ecartsDesCopies(xs) { const out = [];
  CASES_DES_COPIES.forEach(([ch, mot]) => { const vs = [...new Set(xs.map(l => l[ch] == null ? '' : String(l[ch])))]; if (vs.length > 1) out.push(mot + ' ' + vs.map(v => v === '' ? 'vide' : ch === 'longueur' ? nombre(+v) + ' m' : v).join(' / ')); });
  if (new Set(xs.map(l => JSON.stringify(l.autres || {}))).size > 1) out.push('d’autres colonnes');
  return [...new Set(out)].slice(0, 2); }
// (v85) sur une barrette, une borne « module + contact » garde sa casse : 51a et 51A sont deux contacts (l'ASNE 0599 en a 36)
const formeDeLaBorne = (b, r) => { const t = String(b || '').replace(/\s+/g, ''), casse = !!(r && estBarrette(r) && /^\d+[A-Za-z]\w*$/.test(t));
  return (casse ? t : t.toUpperCase()).replace(/(\d+)[.,]0+$/, '$1').replace(/\d+/g, d => String(+d)); };
function controleDeStructure(V) { const out = [], L = V.filter(liaisonComplete), dire = (nom, texte, plus, niveau) => out.push({ nom, texte, niveau: niveau || 'att', plus: { genre: 'fichier', ...(plus || {}) } });
  const potentiel = r => estMasse(r) || estRail(r) || VT_A_POSER.test(r);
  // les lignes en double : la même clé que le dessin, qui ne les dessine qu'une fois (01, `cleDeDoublon`)
  const pareilles = new Map();
  L.forEach(l => { const k = cleDeDoublon(l); (pareilles.get(k) || pareilles.set(k, []).get(k)).push(l); });
  pareilles.forEach((xs, k) => { if (xs.length < 2) return; const l = xs[0], n = xs.length, ecarts = ecartsDesCopies(xs);
    dire(l.de, ecarts.length ? `${cableDit(l)} : écrit ${n} fois dans votre fichier, mais pas à l’identique (${ecarts.join(' ; ')}) — VOLTA ne le dessine qu’une fois ; gardez la bonne ligne dans votre fichier`
      : `${cableDit(l)} : la même ligne ${n} fois dans votre fichier — ${n > 2 ? n - 1 + ' lignes' : 'une ligne'} en double ; VOLTA ne la dessine qu’une fois, sans barrette`,
      { genre: 'doublon', cables: xs, doublon: { cle: k, identiques: !ecarts.length, copies: n - 1 } }, 'ko'); });
  // un câble qui part et arrive sur la même borne
  L.forEach(l => { if (l.de === l.vers && l.borneDe === l.borneVers) dire(l.de, `${cableDit(l)} : il part et arrive sur la même borne (${l.de}${l.borneDe ? ':' + l.borneDe : ''}) — sans effet, sans doute une faute de saisie dans le fichier`, { cables: [l] }); });
  /* les repères écrits de deux façons, d'après ce que le FICHIER écrivait (`ecrit` : VOLTA les lit déjà d'une seule, 02) —
     un plan lu avant la v86 en garde deux au contrat : pour VOLTA, deux équipements, que le même geste réunit — ; sur un
     même repère, les bornes écrites de deux façons ; les câbles sans borne */
  const ecritures = new Map(), bornes = new Map();
  V.forEach(l => ['de', 'vers'].forEach(a => { const r = l[a]; if (!r) return; const e = ecritDuBout(l, a), w = e ? boutLu(e[0], e[1])[0] : r, f = formeDuRepere(w);
    const m = ecritures.get(f) || ecritures.set(f, new Map()).get(f), x = m.get(w) || m.set(w, { n: 0, lus: new Set(), cables: new Set() }).get(w); x.n++; x.lus.add(r); x.cables.add(l); }));
  ecritures.forEach((m, f) => { if (m.size < 2) return; const xs = [...m], lus = new Set(xs.flatMap(([, x]) => [...x.lus])), un = lus.size === 1;
    // la façon que VOLTA lit (02 : en capitales sans espace si le fichier l'écrit ainsi, sinon la plus fréquente) ; les autres
    const cible = un ? [...lus][0] : xs.slice().sort((a, b) => (b[0] === f) - (a[0] === f) || b[1].n - a[1].n || triNaturel(a[0], b[0]))[0][0], autres = xs.filter(([w]) => w !== cible);
    dire(cible, `s’écrit aussi ${autres.map(([w, x]) => '« ' + w + ' » (' + pluriel(x.cables.size, 'ligne') + ')').join(', ')} dans votre fichier : ${un ? 'VOLTA le lit ' + cible + ', un seul équipement' : 'pour VOLTA, ' + (lus.size > 2 ? lus.size : 'deux') + ' équipements différents'} — à écrire pareil partout`,
      { genre: 'casse', cables: [...new Set(autres.flatMap(([, x]) => [...x.cables]))], casse: { forme: f, cible, autres: autres.map(([w]) => w) } }, 'ko'); });
  L.forEach(l => [[l.de, l.borneDe, l.pnDe], [l.vers, l.borneVers, l.pnVers]].forEach(([r, b, pn]) => {
    if (potentiel(r)) return; const x = bornes.get(r) || bornes.set(r, { formes: new Map(), sans: [], avec: 0, pns: new Map() }).get(r);
    if (!b) { x.sans.push(l); return; } x.avec++; const fb = formeDeLaBorne(b, r), y = x.formes.get(fb) || x.formes.set(fb, new Map()).get(fb); y.set(b, (y.get(b) || 0) + 1);
    // le part number de chaque connecteur à lettre (A12 : le connecteur A)
    const c = pn ? connecteurDeBorne(b, pn) : null; if (c && c.lettre) { const m = x.pns.get(c.nom) || x.pns.set(c.nom, new Map()).get(c.nom); (m.get(pn) || m.set(pn, []).get(pn)).push(l); } }));
  bornes.forEach((x, r) => {
    x.formes.forEach(y => { if (y.size < 2) return; const xs = [...y].sort((a, b) => b[1] - a[1] || triNaturel(a[0], b[0]));
      dire(r, `bornes ${xs.map(([s]) => '« ' + s + ' »').join(' et ')} : sans doute la même borne, écrite de ${xs.length > 2 ? xs.length : 'deux'} façons — pour VOLTA, ${xs.length > 2 ? 'des' : 'deux'} bornes différentes ; à unifier dans le fichier`); });
    if (x.sans.length && x.avec) dire(r, `${pluriel(x.sans.length, 'câble')} sans numéro de borne, quand ${x.avec > 1 ? 'les autres câbles' : 'l’autre câble'} de ${r} en ${x.avec > 1 ? 'ont' : 'a'} un : ${x.sans.length > 1 ? 'leur' : 'son'} contact ne se place pas — la borne est à écrire dans le fichier`, { cables: x.sans }); });
  // un connecteur à lettre qui porte deux part numbers (un disjoncteur le dit déjà, en problème ; une barrette, une prise ont leurs modules)
  bornes.forEach((x, r) => { if (estBornier(r) || estDisjoncteur(r)) return;
    x.pns.forEach((m, c) => { if (m.size < 2) return; const xs = [...m], lu = xs[0][0];
      dire(r, `${c} · porte ${xs.length > 2 ? xs.length : 'deux'} part numbers : ${xs.map(([pn, ls]) => pn + ' (' + pluriel(ls.length, 'câble') + ')').join(', ')} — VOLTA lit ${lu} ; à unifier dans le fichier`, { cables: xs.flatMap(([, ls]) => ls) }); }); });
  // des liaisons sans folio, quand le fichier en a plusieurs : aucun folio ne les dessine
  const P = plansDe(V); if (P.length > 1) { const n = L.filter(l => !l.plan).length;
    if (n) dire('', `${pluriel(n, 'liaison')} sans folio (FWD vide) : ${n > 1 ? 'elles ne se dessinent' : 'elle ne se dessine'} sur aucun des ${P.length} folios — le FWD est à écrire dans le fichier`, { tableau: '' }); }
  // (v86, l'audit M6) une longueur que VOLTA ne sait pas lire (« abc », « -3 ») : le câble prend l'hypothèse — jusqu'ici sans un mot
  const illisibles = L.filter(l => l.de !== l.vers && !(l.longueur > 0) && l.longueurBrute);
  if (illisibles.length) { const vs = [...new Set(illisibles.map(l => l.longueurBrute))], H = app.simu || HYPOTHESES, n = illisibles.length;
    dire('', `${n > 1 ? n + ' longueurs illisibles' : 'une longueur illisible'} dans votre fichier (${vs.slice(0, 3).map(v => '« ' + v + ' »').join(', ')}${vs.length > 3 ? '…' : ''}) : VOLTA prend ${nombre(H.longueur)} m, l’hypothèse — ${n > 1 ? 'les longueurs sont' : 'la longueur est'} à écrire dans le fichier`,
      { tableau: '', cables: illisibles, longueurs: true }); }
  return out; }
/* LE GENRE D'UN POINT (audit v72 : sur un grand retest, 192 lignes une par repère, quand huit genres disent tout) :
   chaque point se range dans un genre, que l'index et le récapitulatif montrent groupé, avec son compte et le geste qui
   le traite. L'ordre de GENRES_CONTROLE est celui de la lecture : ce qui casse d'abord. */
// (v86) une ligne en double, un repère écrit de deux façons d'abord : des fautes du fichier qui faussent le dessin et les comptes, réglées d'un geste
// (v87, S5 et le lecteur, Q1) « consommations à écrire » : un genre à lui — une consommation qui manque n'est pas un calibre à revoir
const GENRES_CONTROLE = [['doublon', 'lignes en double', 'ligne en double'], ['casse', 'repères écrits de deux façons', 'repère écrit de deux façons'], ['consommation', 'consommations à écrire', 'consommation à écrire'],
  ['arrangement', 'connecteurs qu’aucun arrangement ne loge', 'connecteur qu’aucun arrangement ne loge'], ['contact', 'contacts à revoir', 'contact à revoir'],
  ['calibre', 'calibres à revoir', 'calibre à revoir'], ['pn', 'disjoncteurs à deux part numbers', 'disjoncteur à deux part numbers'], ['protection', 'câbles mal protégés par leur disjoncteur', 'câble mal protégé par son disjoncteur'],
  ['chute', 'chutes de tension trop fortes', 'chute de tension trop forte'], ['profil', 'disjoncteurs sans profil de charge', 'disjoncteur sans profil de charge'],
  ['segregation', 'mélanges gauche / droite', 'mélange gauche / droite'], ['aposer', 'barrettes au repère provisoire', 'barrette au repère provisoire'], ['cca', 'conducteurs CCA à qualifier', 'conducteur CCA à qualifier'], ['fichier', 'écritures du fichier à vérifier', 'écriture du fichier à vérifier'], ['retest', 'points de votre fichier', 'point de votre fichier'], ['autre', 'autres points', 'autre point']];
// le genre en mots, au nombre qu'il compte : « 2 chutes de tension trop fortes », « 1 barrette à poser »
const motDuGenre = (g, n) => { const G = GENRES_CONTROLE.find(x => x[0] === g) || GENRES_CONTROLE[GENRES_CONTROLE.length - 1]; return n > 1 ? G[1] : G[2]; };
const rangDuGenre = g => { const i = GENRES_CONTROLE.findIndex(x => x[0] === g); return i < 0 ? GENRES_CONTROLE.length : i; };
function genreDuPoint(x) { const t = x.texte || '';
  if (x.genre) return x.genre;
  if (x.tableau != null) return 'retest';
  if (/^ajoutée par VOLTA sur/.test(t)) return 'aposer';
  if (/qualification CCA/.test(t)) return 'cca';
  if (/profil de charge est à renseigner/.test(t)) return 'profil';
  if (/(^|: )chute en ligne/.test(t)) return 'chute';
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
// le contact d'un câble en mots : celui du plan (« taille 20 (7,5 A, 103J1) »), sinon celui que VOLTA suppose — le plus petit
// qui admet la gauge, par prudence (« taille 23 supposé (3 A) » ; la fiche dit pourquoi sous le problème)
const motContact = f => `taille ${f.contact.taille} ${f.contact.parLePlan ? '(' + amperes(f.contact.intensite) + ', ' + f.contactRepere + ')' : 'supposé (' + amperes(f.contact.intensite) + ')'}`;
/* (v84) DEUX CHIFFRES COMPARÉS, sans que l'arrondi inverse le verdict (09 quater, `enOrdre` : « 2,004 V > 2 V » ne s'écrit
   plus « 2 V > 2 V ») ; `u` : l'unité. */
const chiffresEnOrdre = (a, b, u) => enOrdre(a, b).map(x => nombre(x) + ' ' + u);
// le « × 0,6 » en clair (09 quater, `motDuDeclassement`) : « (11,5 A × 0,6 : faisceau de 8 câbles à 60 %) »
const motDeclasse = (N, H, f, t) => { const m = typeof motDuDeclassement === 'function' && f && f.type ? motDuDeclassement(N, f.type, H, t) : ''; return m ? ' (' + m + ')' : ''; };
/* LE CONTACT QUI NE PORTE PAS LE PERMANENT : un problème quand c'est sûr — le contact du plan, ou un courant que la GAUGE du
   câble serti borne (AS39029 : un 24 AWG porte 3 A dans n'importe quel contact) ; à voir quand VOLTA ne fait que supposer la
   taille du contact (le connecteur d'un équipement vient du fournisseur : sa vraie taille peut porter plus). */
const contactSur = f => !!(f.contact && (f.contact.parLePlan || f.contact.source === 'courants'));
function controleProtection(nom, contacts, V, N, H) { const d = disjonctionDe(nom), out = [], cal = d.calibre, pn = pnDuRepere(nom);
  if (pn && !d.famille && !d.ecrit) out.push({ niveau: 'att', texte: `part number ${pn} : famille de disjoncteur inconnue, le calibre ne s’y lit pas${cal ? ' — ' + amperes(cal) + ' (l’idéal) retenu' : ''}` });
  // le courant de chaque contact du câble, borné par la gauge du câble serti (R1) et le fût du contact ; le plus faible des deux bouts juge
  const fils = filsDepuis(V, nom).map(f => { const xs = (contacts.get(f.l) || []).map(x => ({ x, i: intensiteDuContactPose(N, x) })).filter(y => y.i).sort((a, b) => a.i.intensite - b.i.intensite);
    return xs.length ? { ...f, taille: xs[0].x.taille, contactRepere: xs[0].x.repere, fut: xs[0].x.fut } : f; });
  /* (v84) chaque câble jugé comme sa fiche le juge : les hypothèses du disjoncteur (sa famille de courbes : `d.contexte.hyp`
     — la courbe par défaut jugeait jusqu'ici les câbles au-delà des passages), et le profil de SA BRANCHE quand la
     consommation de ce qu'il alimente est écrite (09 quater, `filsDepuis` : `points`), sinon celui du disjoncteur */
  const Hd = { ...HYPOTHESES, ...(d.contexte && d.contexte.hyp ? d.contexte.hyp : H) }, ctx = contexteDeProtection(N, Hd, null, pointsDuProfil(d.profil));
  /* (v87, le lecteur, Q3) LA PROTECTION D'UN CÂBLE en une phrase : la plus sévère de l'EN 2853 déclassée et de la table 11-3 de
     l'AC 43.13-1B, et laquelle décide (08-disjoncteurs, `protectionEnMots`) — les câbles directs, la fiche du disjoncteur les dit
     (`controleDisjonction`), ceux au-delà d'un passage, ici. Elle ne dépend d'aucun courant : une branche dont la consommation
     n'est pas écrite reste jugée. (v87, S7) LE CONTACT : quand c'est la GAUGE qui le borne (aucune taille n'admet plus avec elle)
     et que le câble a déjà son point, la gauge plus forte règle les deux — un seul point, celui du câble ; sinon la phrase dit la
     taille qui suffit, ou que la gauge limite (le remède : 08-recap, `remede`). */
  const protection = (f, cal) => typeof protectionEnMots === 'function' ? protectionEnMots(f, cal, Hd) : '';
  fils.map(f => protegerFil(N, cal, f, Hd, f.points ? { ...ctx, pts: f.points } : ctx)).forEach(f => { const nomF = nomDuCableDit(f) + (f.direct ? '' : ' (par ' + f.via + ')'), cables = f.l ? [f.l] : [], pm = protection(f, cal);
    if (!f.direct) {
      if (f.verdict === 'fil') { const [i, a] = chiffresEnOrdre(f.pire.i, f.pire.admise, 'A'); out.push({ niveau: 'ko', cables, texte: `${nomF} : ${f.pire.nom} ${i}${f.pire.t === Infinity ? '' : ' pendant ' + secondes(f.pire.t)} > ${a} admis ${pourPalier(f.pire.palier)}${motDeclasse(N, H, f, f.pire.t)}` }); }
      if (pm) out.push({ niveau: 'att', cables, genre: 'protection', texte: `${nomF} : ${pm}` });
      else if (f.protege === false && f.verdict !== 'fil') { const x = f.pireLaisse; out.push({ niveau: 'att', cables, texte: `${nomF} : pas protégé en surcharge brève — le ${amperes(cal)} laisse passer ${amperes(x.courant)} ${pourPalier(x.palier)} à ${f.courbeLente}, ${limiteDuCable(f, x)}` }); } }
    if (f.refuse) out.push({ niveau: 'att', cables, texte: `${nomF} : conducteur ${f.conducteur} sans résistance dans la base, son intensité admissible est inconnue` });
    const G = (f.contactDepasse || f.contactSurcharge) && typeof contactsDeLaGauge === 'function' ? contactsDeLaGauge(f.jauge != null ? f.jauge : jaugeDuType(f.type), f.contactDepasse ? f.permanent : cal) : null;
    const fondu = !!(G && G.parLaGauge && (f.contactDepasse ? f.verdict === 'fil' : !!pm));
    const remedeC = !G ? '' : G.parLaGauge ? `la gauge limite : avec un ${G.jauge || f.jauge || jaugeDuType(f.type)} AWG, aucun contact n’admet plus de ${amperes(G.max.intensite)}` : G.suffit && G.suffit.taille !== String(f.contact.taille) ? `un contact taille ${G.suffit.taille} suffit (${amperes(G.suffit.intensite)})` : '';
    if (fondu) { /* fondu dans le point du câble : la gauge plus forte règle aussi le contact */ }
    else if (f.contactDepasse) { const [p, c] = chiffresEnOrdre(f.permanent, f.contact.intensite, 'A'); out.push({ niveau: contactSur(f) ? 'ko' : 'att', cables, genre: 'contact', texte: `${nomF} : le permanent (${p}) dépasse le contact taille ${f.contact.taille} ${f.contact.parLePlan ? '(' + c + ', ' + f.contactRepere + ')' : 'supposé (' + c + ')'}${remedeC ? ' — ' + remedeC : ''}` }); }
    else if (f.contactSurcharge) out.push({ niveau: 'att', cables, genre: 'contact', texte: `${nomF} : contact ${motContact(f)} < calibre ${amperes(cal)} — pas protégé en surcharge${remedeC ? ' ; ' + remedeC : ''}` }); });
  /* LA CHUTE EN LIGNE — UNE SEULE (v73, l'ingénieur : « 2,28 V sur la fiche du câble, 2,33 V dans les problèmes et le PDF ;
     même mot, même câble, deux valeurs ») : celle que les fiches montrent (`chutesDuDisjoncteur`, 08-fiche — la chute
     propre du CALIBRE RETENU comprise ; le contrôle prenait celle du part number), et sa pire pointe comme elles
     (`pireChuteEnPointe`). Au permanent du profil (v88 : sans profil, aucune chute ne se calcule — ni le calibre, ni une hypothèse), et à chaque état court. */
  const C = typeof chutesDuDisjoncteur === 'function' ? chutesDuDisjoncteur(nom) : null, I = C && C.I > 0 ? C.I : d.profil && d.profil.perm && d.profil.perm.i > 0 ? d.profil.perm.i : 0;   // (v88) jamais le calibre ni une hypothèse : sans profil, aucune chute ne se calcule
  const cs = C && C.cs ? C.cs : chutesDepuis(N, V, nom, I, H, d.points.filter(p => p.t !== Infinity && p.i > 0), { famille: d.famille, calibre: cal });
  const pire = c => typeof pireChuteEnPointe === 'function' ? pireChuteEnPointe(c) : (c.pointes || []).find(x => x.trop);
  /* (v84, l'agent « recap » : un problème commence par son câble) la phrase dit le câble qui arrive au bout du chemin
     (« DR24 vers 395SW1:1 », « (par 411VC3A) » quand il traverse des passages), puis la chute : « chute en ligne de 4,63 V
     à 5 A, plus que les 2 V admis sous 28 V » ; le courant n'est dit que si tout le chemin porte le même (une branche
     dont la consommation est écrite porte la sienne) */
  cs.forEach(c => { const ou = c.bout[0] + (c.bout[1] ? ':' + c.bout[1] : ''), hyp = c.reel ? '' : ' (longueurs d’hypothèse)', niveau = c.reel ? 'ko' : 'att', fils = c.segments.filter(s => s.fil), cables = fils.map(s => s.fil);
    const dernier = fils[fils.length - 1], par = c.segments.filter(s => s.passage).map(s => s.passage), quoi = `${(dernier && dernier.fil.type) || 'câble'} vers ${ou}${par.length ? ' (par ' + par.join(', ') + ')' : ''}`;
    const uni = fils.every(s => s.courant == null || Math.abs(s.courant - I) < 1e-9), plus = { niveau, cables, genre: 'chute', section: 'fils' };
    if (c.trop) { const [u, a] = chiffresEnOrdre(c.dU, c.admis, 'V'); out.push({ ...plus, texte: `${quoi} : chute en ligne de ${u}${uni ? ' à ' + amperes(I) : ''}, plus que les ${a} admis sous ${nombre(c.tension)} V${hyp}` }); }
    else { const p = pire(c); if (p) { const [u, a] = chiffresEnOrdre(p.dU, p.admis, 'V'); out.push({ ...plus, texte: `${quoi} : chute en ligne de ${u} en pointe (${uni ? amperes(p.i) + ' ' : ''}pendant ${secondes(p.t)}), plus que les ${a} admis${p.intermittent && p.admis !== c.admis ? ' en intermittent' : ''}${hyp}` }); } } });
  return out; }
/* LES PART NUMBERS d'un repère, chacun avec les câbles qui le portent : [{ pn, cables, liaisons: [[l, champ]] }], du plus
   porté au moins porté. Un disjoncteur n'en a qu'un ; deux, c'est une faute (« Unifier sur… »). */
function partNumbersDuRepere(nom, V) { const m = new Map();
  (V || verite()).forEach(l => [['de', 'pnDe'], ['vers', 'pnVers']].forEach(([b, ch]) => { if (l[b] !== nom || !l[ch]) return; const pn = String(l[ch]).trim(); if (!pn) return;
    const e = m.get(pn) || m.set(pn, { pn, cables: [], liaisons: [] }).get(pn); e.liaisons.push([l, ch]);
    // (v89) le câble se dit depuis CE repère, vers son autre bout : « DR24 vers 395SW1:1 » (il disait « vers 102CB1:2 », le repère lui-même, quand le câble y arrivait)
    const ab = b === 'de' ? [l.vers, l.borneVers] : [l.de, l.borneDe], c = (String(l.type || '').trim() || 'câble') + (ab[0] ? ' vers ' + ab[0] + (ab[1] ? ':' + ab[1] : '') : '');
    if (!e.cables.includes(c)) e.cables.push(c); }));
  return [...m.values()].sort((a, b) => b.liaisons.length - a.liaisons.length || triNaturel(a.pn, b.pn)); }
/* UNIFIER un repère sur un part number : chaque liaison qui en porte un autre prend celui-ci (le fichier gardé dans
   `avant`) ; une entrée d'historique, Ctrl+Z la défait. */
function unifierPartNumber(nom, pn) { const xs = partNumbersDuRepere(nom).filter(p => p.pn !== pn).flatMap(p => p.liaisons.map(([l, ch]) => [l, ch, pn]));
  if (!xs.length || typeof changerLiaisons !== 'function') return false;
  if (!changerLiaisons(xs, nom + ' : un seul part number, ' + pn)) return false;
  if (typeof direRetablir === 'function') direRetablir(`${nom} porte maintenant ${pn} sur ${pluriel(xs.length, 'liaison')} de plus.`); else dire(`${nom} : ${pn} partout.`); return true; }
/* Le contrôle se relit si le contrat a changé (`controleAJour` : les points, à jour, sans rien peindre) ; le bouton des
   repères porte le compte ; l'index ouvert se refait. */
function controleAJour() { const V = verite();
  // les hypothèses de la simulation comptent aussi : l'ambiante, le tableau, le retour changent ce que le contrôle relève
  // (v86) et ce que le fichier écrivait (`ecrit`) : « Écrire 103RL1 partout » ne change pas le repère lu, mais règle un point
  const cle = signature(V) + '|' + V.map(l => l.ecrit ? JSON.stringify(l.ecrit) : '').join(',') + '|' + JSON.stringify([...app.contrat.designations]) + '|' + JSON.stringify([...(app.contrat.sexes || [])]) + '|' + JSON.stringify([...(app.contrat.charges || [])]) + '|' + JSON.stringify([...(app.contrat.raccords || [])]) + '|' + (app.normeNom || '') + '|' + (app.bibleNom || '') + '|' + JSON.stringify(app.simu || {});
  if (cle !== CONTROLE.cle) { CONTROLE.cle = cle; CONTROLE.items = V.length ? controleDuContrat() : []; }
  return CONTROLE.items; }
function rendreControle() { if (typeof reprendreVoltaEnAttente === 'function') reprendreVoltaEnAttente();
  const xs = controleAJour(), C = compteProblemes(), b = $('btnIndex');
  // le relevé du retest corrigé, ouvert, suit le plan (08-export) ; (v84) le bord rouge / ambre des blocs suit le contrôle
  if (typeof suivreLeReleve === 'function') suivreLeReleve(); if (typeof peindreEtats === 'function') peindreEtats();
  if (typeof suivreLaRevue === 'function') suivreLaRevue();   // (v88) la revue suit le contrôle : un point réglé s'en va, elle passe au suivant
  if (!b) return;
  // la pastille : les problèmes ROUGES du plan ; sans rouge, ce qui est à voir, en ambre (le technicien, n° 5 : une règle)
  let p = b.querySelector('.rd-point'); if (!p) { p = document.createElement('i'); p.className = 'rd-point'; b.appendChild(p); }
  p.hidden = !xs.length; p.className = 'rd-point ' + (C.ko ? 'ko' : 'att'); p.textContent = String(C.ko || C.att);
  b.setAttribute('aria-label', 'Repères et problèmes (R)' + (xs.length ? ' — ' + C.mot : ''));
  if (app.insp.index && !$('inspecteur').hidden && !app.cible) rendreIndex($('ba-equip')); }
/* LE COMPTE DES PROBLÈMES — UNE SEULE SOURCE (v73, le technicien, n° 5 : « pastille 5 puis 4, Repères 4 · 8, le
   récapitulatif 4 · 8, P : 1 / 10, À reprendre 3, la bibliothèque 5 : je ne sais plus combien il m'en reste ») :
   « problème » = rouge seulement, « à voir » = ambre, séparés par « · », sur TOUT le plan ; le folio en second. La
   pastille du rail, l'index, P, le récapitulatif, la bibliothèque et le dossier PDF lisent ceci, et rien d'autre.
   `folio` : un folio (par défaut celui qu'on regarde). Rend { ko, att, mot, parFolio: Map(folio → { ko, att }), folio }. */
// (passe 87, S4 — le lecteur : « À régler, c'est ce qui a un geste ») `ko` compte ce qui est À RÉGLER (un problème ou un geste),
// `att` ce qui est À VOIR : la règle de la fiche (08-recap, `compteARegler`), que le panneau, P, la bibliothèque et l'export lisent
const motProblemes = (ko, att) => typeof motARegler === 'function' ? motARegler(ko, att) : !ko && !att ? 'Rien à reprendre' : [ko ? pluriel(ko, 'problème') : '', att ? (att > 1 ? att + ' à voir' : '1 point à voir') : ''].filter(Boolean).join(' · ');
const COMPTE = { items: null, parFolio: null };
function compteProblemes(folio) { const xs = controleAJour(), A = typeof compteARegler === 'function' ? compteARegler(xs) : null, ko = A ? A.regler : xs.filter(x => x.niveau === 'ko').length, att = xs.length - ko;
  const aRegler = x => typeof rangDuPoint === 'function' ? rangDuPoint(x).regler : x.niveau === 'ko';
  // un point compte sur chaque folio où son repère paraît (une barrette à poser : le sien) ; un point du tableau, sur le plan
  // seul — compté une fois par contrôle
  if (COMPTE.items !== xs || COMPTE.liaisons !== app.contrat.liaisons) { const parFolio = new Map(), folios = new Map(); COMPTE.liaisons = app.contrat.liaisons;
    app.contrat.liaisons.forEach(l => [l.de, l.vers].forEach(r => { if (r && l.plan) (folios.get(r) || folios.set(r, new Set()).get(r)).add(l.plan); }));
    const foliosDu = x => !x.nom ? [] : VT_A_POSER.test(x.nom) ? (x.plan && x.plan !== '*' ? [x.plan] : []) : [...(folios.get(x.nom) || [])];
    xs.forEach(x => foliosDu(x).forEach(f => { const e = parFolio.get(f) || parFolio.set(f, { ko: 0, att: 0 }).get(f); e[aRegler(x) ? 'ko' : 'att']++; }));
    COMPTE.items = xs; COMPTE.parFolio = parFolio; }
  const parFolio = COMPTE.parFolio;
  const f = folio == null ? app.plan : folio, ici = f && f !== '*' && plans().length > 1 ? parFolio.get(f) || { ko: 0, att: 0 } : null;
  return { ko, att, mot: motProblemes(ko, att), parFolio, folio: ici }; }

/* ---- LES PROBLÈMES D'UN CÂBLE, AVEC LA CHAÎNE DE CAUSE (v73, le technicien, n° 1 ; l'ingénieur, n° 5) ------------------
   La fiche d'un câble montre SES problèmes : ceux que le contrôle relève sur lui (la charge qu'il porte, sa protection,
   son contact contre le calibre, la chute d'un chemin où il est) — la phrase sans son nom en tête —, et, quand le calibre
   que le retest ÉCRIT sur son disjoncteur ne passe pas, la CAUSE : « 102CB1 : le 10 A du retest déclenche — il protège
   ce câble ». Un câble ne passe pas au vert tant que son disjoncteur est rouge. Chaque point porte ses gestes
   (`gestesDuPoint`) : « Tout régler » quand la cause est le disjoncteur. */
const cleDeLiaison = l => [l.de, l.borneDe, l.vers, l.borneVers, l.cable, l.type].join('\u0001');
const memeLiaison = (a, b) => a === b || (!!a && !!b && cleDeLiaison(a) === cleDeLiaison(b));
const parleDuCable = (x, l) => (x.cables || []).some(c => memeLiaison(c, l));
// une phrase de disjoncteur vue depuis le câble : son nom en tête s'efface (« W-012 (DR20) : démarrage… » → « Démarrage… »)
const sansLeCable = (texte, l) => { const t = String(texte || ''), n = nomDuCableDit(l); if (t.startsWith(n + ' : ')) return t.slice(n.length + 3);
  // (v78 : un câble se dit « DR12 vers 103RL1:A1 » — l'autre bout dépend d'où on le regarde)
  // (v86) … même quand le courant arrive « (par 395SW1) », à travers un équipement (09-chute, la traversée)
  const m = /^\S+ vers \S+(?: \(par [^)]*\))? : /.exec(t); if (m) return t.slice(m[0].length);
  if (t.startsWith(n + ' (par ')) { const k = t.indexOf(') : ', n.length); if (k > 0) return t.slice(k + 4); } return t; };
// le disjoncteur en amont d'un câble : celui dont un chemin passe par lui
function disjoncteurDuCable(l) { if (typeof alimentationDuFil === 'function') { try { const a = alimentationDuFil(l); if (a && a.nom) return a.nom; } catch (_) { } }
  const V = verite(); for (const r of reperesDe(V).filter(estDisjoncteur)) { try { if (cheminsDepuis(V, r).some(ch => ch.segments.some(s => s.fil && memeLiaison(s.fil, l)))) return r; } catch (_) { } } return ''; }
/* LA CAUSE qu'un disjoncteur fait peser sur ses câbles : le calibre que porte son part number (le retest, écrit) ne passe
   pas, et VOLTA en retient un autre. Rend { repere, retest, retenu, verdict, cables (ceux à grossir), mot } ou null. */
function causeDuDisjoncteur(nom) { let d; try { d = disjonctionDe(nom); } catch (_) { return null; }
  if (!d || !d.pn || !d.gPn || d.origine === 'main' || d.sansProfil || d.sansCourbe || !(d.calibre > 0) || d.calibre === d.pn) return null;
  const v = verdictDeCalibre(d.gPn); if (!v || v === VERDICTS_CALIBRE.passe) return null;
  const m = d.meilleur || {}, xs = d.calibre === m.calibre && typeof filsDuMeilleur === 'function' ? filsDuMeilleur(d).filter(p => p.f && p.x.propose) : [];
  const types = [...new Set(xs.map(p => p.x.propose))];
  const mot = `${nom} : le ${amperes(d.pn)} de votre fichier ${v.cle === 'juste' || v.mot === 'touche la courbe' ? 'touche la courbe' : 'disjoncte'} — VOLTA retient ${amperes(d.calibre)}${xs.length ? ', qui demande ' + (xs.length > 1 ? xs.length + ' câbles' : 'un câble') + (types.length === 1 ? ' en ' + types[0] : ' plus gros') : ''}`;
  // le pourquoi chiffré du retest (09 bis), pour la bulle : « touche la courbe », « sans la marge » s'y disent, pas dans le mot
  let bulle = v.bulle; try { const q = pourquoiDuCalibre(app.norme, d, d.pn); if (q) bulle = majuscule(q.phrase) + '.\n' + v.bulle + ' Il protège ce câble.'; } catch (_) { }
  return { repere: nom, retest: d.pn, retenu: d.calibre, verdict: v, cables: xs.map(p => ({ cable: p.x.cable, actuel: p.x.actuel, propose: p.x.propose })), mot, bulle }; }
// le geste qui règle la cause : le calibre retenu ÉCRIT au retest, et ses câbles grossis — une proposition de VOLTA acceptée
const motToutRegler = c => `Tout régler : ${c.repere} en ${amperes(c.retenu)}${c.cables.length ? ' et ' + (c.cables.length > 1 ? c.cables.length + ' câbles' : 'un câble') + ([...new Set(c.cables.map(x => x.propose))].length === 1 ? ' en ' + c.cables[0].propose : ' grossis') : ''}`;
function toutRegler(nom) { const faire = () => typeof deciderCalibre === 'function' ? deciderCalibre(nom) : false;
  return typeof avecOrigineVolta === 'function' ? avecOrigineVolta(faire) : faire(); }
/* « SEULEMENT CE CÂBLE » (le technicien, n° 1 : « le plus fin qui tient sous le calibre du RETEST, pas sous un 15 A qui
   n'est pas écrit ») : la plus fine gauge de sa famille que le calibre ÉCRIT de son disjoncteur protège et qui porte sa
   charge (09 bis, `jaugeQuiSuit`) — rien quand il le suit déjà. Rend { type, calibre, pourquoi } ou null. */
function plusFinSousLeRetest(l) { if (!l) return null; const s = l.origine ? (typeof sourceDe === 'function' ? sourceDe(l) : null) || l : l, cb = disjoncteurDuCable(s); if (!cb) return null;
  let d; try { d = disjonctionDe(cb); } catch (_) { return null; } const cal = d && d.pn > 0 ? d.pn : d && d.calibre > 0 ? d.calibre : null; if (!cal) return null;
  const f = (d.contexte && d.contexte.fils || []).find(y => memeLiaison(y.l, s)); if (!f) return null;
  const H = { ...HYPOTHESES, ...(d.contexte.hyp || {}) }, ctx = contexteDeProtection(app.norme, H, d.courbes, pointsDuProfil(d.profil));
  if (filSuit(protegerFil(app.norme, cal, f, H, ctx))) return null; const j = jaugeQuiSuit(app.norme, cal, f, H, ctx);
  return j ? { type: j.type, calibre: cal, pourquoi: `le plus fin que protège le ${amperes(cal)} de ${cb}${d.pn === cal ? ', celui de votre fichier' : ''}` } : null; }
function problemesDuCable(l) { if (!l) return []; const s = l.origine ? (typeof sourceDe === 'function' ? sourceDe(l) : null) || l : l, out = [];
  controleAJour().forEach(x => { if (!parleDuCable(x, s)) return;
    out.push({ niveau: x.niveau, texte: majuscule(sansLeCable(x.texte, s)), section: 'fils', genre: x.genre, repere: x.nom || '', gestes: gestesDuPoint(x), point: x }); });
  const cb = disjoncteurDuCable(s), c = cb ? causeDuDisjoncteur(cb) : null;
  if (c) out.push({ niveau: 'att', texte: c.mot, bulle: c.bulle, section: 'fils', genre: 'calibre', repere: cb, cause: c,
    gestes: [{ mot: motToutRegler(c), aide: 'Le calibre que VOLTA retient part dans l’Excel corrigé, et les câbles qu’il demande grossissent — une seule entrée d’historique, Ctrl+Z défait le tout', faire: () => toutRegler(cb), principal: true },
      { mot: 'Voir ' + cb, aide: 'Sa fiche : la courbe, le profil, la décision', faire: () => allerAuControle({ nom: cb, texte: '', section: 'disjoncteur', plan: plansDuRepere(cb).sort(triNaturel)[0] || '' }) }] });
  return out.sort((a, b) => (a.niveau === 'ko' ? 0 : 1) - (b.niveau === 'ko' ? 0 : 1)); }
/* LES GESTES D'UN POINT (v73, l'ingénieur, n° 8 : « Ce qu'il faut faire » donne le geste concret, jamais un conseil faux) :
   [{ mot, aide, faire, principal }]. Deux part numbers : « Unifier sur… », un par part number ; un calibre du retest qui ne
   passe pas : « Tout régler » ; une barrette à poser : « La poser » ; sinon la fiche qui le démontre. */
function gestesDuPoint(x) { if (!x) return []; const out = [];
  if (x.genre === 'pn' && x.nom) (x.pns || []).forEach((pn, i) => out.push({ mot: 'Unifier sur ' + pn, aide: `Toutes les liaisons de ${x.nom} prennent ${pn} — Ctrl+Z le défait`, faire: () => unifierPartNumber(x.nom, pn), principal: i === 0 }));
  const c = x.nom && estDisjoncteur(x.nom) && x.genre !== 'pn' ? causeDuDisjoncteur(x.nom) : null;
  if (c) out.push({ mot: motToutRegler(c), aide: 'Le calibre que VOLTA retient part dans l’Excel corrigé, et les câbles qu’il demande grossissent — une seule entrée d’historique, Ctrl+Z défait le tout', faire: () => toutRegler(x.nom), principal: !out.length });
  if (x.genre === 'aposer' && x.nom) out.push({ mot: 'Lui donner son repère', aide: 'Elle prend le repère que VOLTA propose (la suite de la barrette la plus proche) — « Défaire » rend le repère provisoire', faire: () => poserLesBarrettes([x.nom]), principal: !out.length });
  // (v87, le lecteur, Q1) une consommation à écrire : « Écrire la consommation de 104LP1 » — sa fiche, Modifier › Ce qu'il consomme
  if (x.genre === 'consommation' && x.aEcrire && typeof gesteDeConsommation === 'function') out.unshift({ ...gesteDeConsommation(x.aEcrire), principal: true });
  // (v86, l'audit B3) une ligne en double, un repère écrit de deux façons : la proposition de VOLTA, qui part dans l'Excel corrigé
  if (x.genre === 'doublon' && x.doublon) out.push(x.doublon.identiques
    ? { mot: x.doublon.copies > 1 ? 'Retirer les ' + x.doublon.copies + ' lignes en double' : 'Retirer la ligne en double', aide: 'La copie quitte le plan et l’Excel corrigé — une proposition de VOLTA ; Défaire la remet', faire: () => retirerLignesEnDouble([x]), principal: !out.length }
    : { mot: 'Voir les lignes', aide: 'Les lignes de ce câble, dans l’onglet Liaisons du récapitulatif : gardez la bonne dans votre fichier', faire: () => montrerLiaisons(((x.cables || [])[0] || {}).cable || x.nom), principal: !out.length });
  if (x.genre === 'casse' && x.casse) out.push({ mot: 'Écrire ' + x.casse.cible + ' partout', aide: `${(x.casse.autres || []).map(w => '« ' + w + ' »').join(', ')} devient ${x.casse.cible} dans l’Excel corrigé — une proposition de VOLTA ; Défaire le rend`, faire: () => ecrireLesReperes([x]), principal: !out.length });
  if (x.tableau == null && x.nom) out.push({ mot: 'Voir ' + x.nom, aide: 'Sa fiche, sur son folio, à la section qui le démontre', faire: () => allerAuControle(x), principal: !out.length });
  else if (x.tableau != null) out.push({ mot: 'Voir les liaisons', aide: 'L’onglet Liaisons du récapitulatif, sur ce qu’il faut reprendre', faire: () => allerAuControle(x), principal: !out.length });
  return out; }
/* ---- « À REPRENDRE », PAR GENRE (l'audit v72, P1-5 : « à l'échelle, la liste noie » — 192 lignes une par repère sur un
   grand retest, quand huit genres disent tout) ------------------------------------------------------------------------
   Les points se rangent par niveau (les problèmes, puis ce qui est à voir), puis par genre, dans l'ordre de la lecture ;
   chaque genre dit son compte et ses repères, « Voir le premier » y mène, et le GESTE qui le traite d'un coup quand il
   existe (« Leur donner leur repère », « Écrire les profils », « Voir les câbles sans longueur », « Voir les disjoncteurs »). Déplié, un
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
  if (g.genre === 'aposer') return { mot: g.lignes.length > 1 ? 'Leur donner leur repère' : 'Lui donner son repère', aide: 'Chacune prend le repère que VOLTA propose (la suite de la barrette la plus proche) ; « Défaire » les rend provisoires', faire: () => poserLesBarrettes(g.lignes.map(l => l.nom)) };
  if (g.genre === 'profil') return { mot: 'Écrire les profils', aide: 'L’onglet Disjoncteurs du récapitulatif : ceux sans profil de charge, la colonne Permanent à écrire', faire: () => ouvrirOngletFiltre('disjoncteurs', ['sansprofil'], ['profil']) };
  if (g.genre === 'pn' && g.lignes.length === 1) { const G = gestesDuPoint(g.lignes[0].xs[0])[0]; if (G) return { mot: G.mot, aide: G.aide, faire: G.faire }; }
  // (v86) toutes les lignes en double d'un coup (celles pareilles en tout), tous les repères écrits de deux façons : un seul Défaire
  if (g.genre === 'doublon') { const ps = xs.filter(x => x.doublon && x.doublon.identiques), n = ps.reduce((s, x) => s + x.doublon.copies, 0);
    return n ? { mot: n > 1 ? 'Retirer les ' + n + ' lignes en double' : 'Retirer la ligne en double', aide: 'Chaque copie pareille en tout quitte le plan et l’Excel corrigé — une proposition de VOLTA ; Défaire les remet', faire: () => retirerLignesEnDouble(ps) } : null; }
  if (g.genre === 'casse') { const ps = xs.filter(x => x.casse); if (!ps.length) return null;
    return { mot: ps.length > 1 ? 'Les écrire pareil partout' : 'Écrire ' + ps[0].casse.cible + ' partout', aide: 'Chaque repère s’écrit comme VOLTA le lit, dans l’Excel corrigé — une proposition de VOLTA ; Défaire le rend', faire: () => ecrireLesReperes(ps) }; }
  if (g.genre === 'calibre' || g.genre === 'protection' || g.genre === 'pn') return { mot: 'Voir les disjoncteurs', aide: 'L’onglet Disjoncteurs du récapitulatif : ceux qui ont quelque chose à reprendre', faire: () => ouvrirOngletFiltre('disjoncteurs', ['probleme']) };
  // (v87) une consommation à écrire : son geste quand elle est seule — à plusieurs, chaque ligne garde le sien (rien ne les écrit d'un coup)
  if (g.genre === 'consommation') { const x = xs.length === 1 ? xs[0] : null; return x && x.aEcrire && typeof gesteDeConsommation === 'function' ? gesteDeConsommation(x.aEcrire) : null; }
  // (v86) la longueur vient du fichier : le geste mène aux câbles sans longueur, il n'écrit rien dans VOLTA
  if (g.genre === 'chute') return xs.every(x => /hypothèse/.test(x.texte)) ? { mot: 'Voir les câbles sans longueur', aide: 'Ces chutes se calculent sur des longueurs supposées : l’onglet Liaisons, les câbles sans longueur dans votre fichier', faire: () => ouvrirOngletFiltre('liaisons', ['hyp'], null, 'tout') }
    : { mot: 'Voir les câbles', aide: 'L’onglet Liaisons du récapitulatif : les liaisons à reprendre', faire: () => ouvrirOngletFiltre('liaisons', ['probleme'], null, 'tout') };
  return null; }
// un onglet du récapitulatif, ses puces pressées (et rien d'autre), des colonnes en plus, la portée
function ouvrirOngletFiltre(onglet, puces, colonnes, portee) { const b = app.base; b.filtreAuto = false; b.filtre = ''; changerOnglet(onglet, true);
  b.puces[onglet] = puces || []; if (colonnes) { const ch = b.colonnes[onglet] || (b.colonnes[onglet] = {}); colonnes.forEach(c => { ch[c] = true; }); }
  if (portee) b.portee = portee; b.filtre = ''; b.tri = null; memoriserBase(); if (b.ouvert) rendreBase(true); else ouvrirBase(); }
/* LUI DONNER SON REPÈRE, une barrette ou toutes d'un coup (v86, G2 : un seul verbe, un seul geste) : chacune par
   `donnerSonRepere` (08-journal : le repère proposé, celui du récapitulatif, relu après chaque pose — les noms se suivent),
   qui dit le repère donné (« VT2 devient 667VT3 ») et offre « Défaire ». Plusieurs : leurs entrées d'historique n'en font
   qu'une — « Défaire » les rend toutes provisoires — et un seul message les nomme. */
function poserLesBarrettes(noms) { const vus = new Set(), faits = [];
  const vts = (noms || []).filter(v => VT_A_POSER.test(v) && !vus.has(v) && vus.add(v)); if (!vts.length || typeof donnerSonRepere !== 'function') return 0;
  vts.forEach(vt => { assurerModele(); const r = reperes().find(x => x.aPoser && x.nom === vt), nom = donnerSonRepere(vt, r ? r.plan || '' : ''); if (nom) faits.push([vt, nom]); });
  if (!faits.length) { dire('Aucune barrette n’a pu recevoir son repère.', true); return 0; }
  if (faits.length > 1) { const debut = app.hist.length - faits.length;   // chaque pose a écrit la sienne, à la suite
    if (debut >= 0 && app.hist[debut]) { app.hist.splice(debut + 1); app.hist[debut].quoi = 'pose de ' + pluriel(faits.length, 'barrette'); synchroniserHistorique(); }
    dire(faits.map(([vt, nom]) => vt + ' devient ' + nom).join(', ') + ' : elles entrent dans l’Excel corrigé, chacune avec son câble à créer et ses shunts.', false, { geste: 'Défaire', faire: defaire }); }
  return faits.length; }
/* (v86, l'audit B3) LES GESTES DES ÉCRITURES DU FICHIER — des propositions de VOLTA, qui partent dans l'Excel corrigé (rien
   d'autre ne réécrit le fichier : jusque-là, VOLTA dessine juste et rend le fichier tel qu'il l'a lu) ; chacun une entrée
   d'historique, que « Défaire » rend.
   RETIRER LA LIGNE EN DOUBLE : chaque copie pareille en tout quitte le plan ; la première ligne reste et garde le compte des
   copies retirées (`avant.copies` : le relevé et la feuille Modifications le disent, 08-export). */
function retirerLignesEnDouble(points) { const cles = new Set((points || []).filter(x => x && x.doublon && x.doublon.identiques).map(x => x.doublon.cle)); if (!cles.size) return 0;
  const V = verite(), garde = new Map(), retirees = [];
  V.forEach(l => { if (!liaisonComplete(l)) return; const k = cleDeDoublon(l); if (!cles.has(k)) return; if (garde.has(k)) retirees.push(l); else garde.set(k, l); });
  if (!retirees.length) return 0;
  histPush(retirees.length > 1 ? 'retrait de ' + retirees.length + ' lignes en double' : 'retrait d’une ligne en double');
  const n = new Map(); retirees.forEach(l => { const k = cleDeDoublon(l); n.set(k, (n.get(k) || 0) + 1); });
  garde.forEach((l, k) => { if (n.get(k)) l.avant = { ...(l.avant || {}), copies: ((l.avant && l.avant.copies) || 0) + n.get(k) }; });
  const hors = new Set(retirees); for (let i = V.length - 1; i >= 0; i--) if (hors.has(V[i])) V.splice(i, 1);
  apresEdition();
  const l0 = [...garde.values()][0], ou = l => l.de + (l.borneDe ? ':' + l.borneDe : '') + ' → ' + l.vers + (l.borneVers ? ':' + l.borneVers : '');
  dire(retirees.length > 1 ? `VOLTA retire ${retirees.length} lignes en double : chaque câble reste une fois, et elles quittent l’Excel corrigé.` : `VOLTA retire la ligne en double (${ou(l0)}) : le câble reste une fois, et la copie quitte l’Excel corrigé.`, false, { geste: 'Défaire', faire: defaire });
  return retirees.length; }
/* ÉCRIRE 103RL1 PARTOUT : chaque bout que le fichier écrivait autrement (« 103rl1 ») s'écrit comme VOLTA le lit ; la case
   garde ce qu'elle portait (`avant` : la feuille Modifications dit « 103rl1 → 103RL1 », proposition de VOLTA acceptée), et
   l'écriture du fichier gardée sur la liaison (`ecrit`, 01) suit — « 667vt2 51 » devient « 667VT2 51 » —, ou s'efface quand
   elle dit la même chose que VOLTA. */
function ecrireLesReperes(points) { const cibles = new Map((points || []).filter(x => x && x.casse).map(x => [x.casse.forme, x.casse.cible])); if (!cibles.size) return 0;
  const faits = [];
  verite().forEach(l => [['de', 'borneDe'], ['vers', 'borneVers']].forEach(([a, b]) => { const r = l[a]; if (!r) return;
    const e = ecritDuBout(l, a), w = e ? boutLu(e[0], e[1])[0] : r, c = cibles.get(formeEcrite(w)); if (c && w !== c) faits.push([l, a, b, w, c, !!e]); }));
  if (!faits.length) return 0;
  const noms = [...new Set(faits.map(f => f[4]))];
  histPush('écriture de ' + noms.join(', ') + ' partout');
  faits.forEach(([l, a, b, w, c, garde]) => { const ec = { ...(l.ecrit || {}) };
    if (garde && ec[a] != null) { const t = String(ec[a]); ec[a] = t.startsWith(w) ? c + t.slice(w.length) : c;
      if (ec[a] === c && String(ec[b] == null ? '' : ec[b]) === String(l[b] == null ? '' : l[b])) { delete ec[a]; delete ec[b]; } }
    if (Object.keys(ec).length) l.ecrit = ec; else delete l.ecrit;
    l.avant = { ...(l.avant || {}), ...(l.avant && a in l.avant ? {} : { [a]: w }), [ORIGINE_VOLTA + a]: c };
    l[a] = c; });
  apresEdition();
  dire(`VOLTA écrit ${noms.join(', ')} partout : ${pluriel(faits.length, 'case')} ${faits.length > 1 ? 'changent' : 'change'} dans l’Excel corrigé.`, false, { geste: 'Défaire', faire: defaire });
  return faits.length; }

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
/* P : le point suivant (Maj+P : le précédent), d'un bout à l'autre de la liste — un pas par POINT (v73, le technicien,
   n° 5 : « Problème 1 / 10 » quand le plan en compte 4) : d'abord les problèmes (« Problème 1 / 4 »), puis ce qui est à
   voir (« À voir 1 / 8 ») — les mêmes nombres que la pastille. La place se garde par la clé du point (corriger un point le
   fait disparaître : on repart de celui qui a pris sa place) ; une ligne de l'index choisie (`CONTROLE.pas.cle` d'une
   ligne) reprend à son premier point. */
const clePoint = x => x.niveau + '|' + (x.nom || '') + '|' + x.texte;
// (v89) ce qui est à régler d'abord, puis ce qui est à voir : une ligne du contrôle peut porter les deux (sept câbles mal
// protégés, quatre avec un geste), et P annonçait « À régler 7 / 11 », « À voir 1 / 3 », puis « À régler 8 / 11 »
const pointsDansLOrdre = () => { const X = lignesDuControle().flatMap(l => l.xs), r = x => typeof rangDuPoint === 'function' ? (rangDuPoint(x).regler ? 0 : 1) : (x.niveau === 'ko' ? 0 : 1);
  return X.map((x, i) => [x, i]).sort((a, b) => r(a[0]) - r(b[0]) || a[1] - b[1]).map(a => a[0]); };
function problemeSuivant(pas) { if (typeof REVUE !== 'undefined' && REVUE.on) { allerDansLaRevue(pas); return; }   // (v88) pendant la revue, P passe au point suivant de la revue
  const X = pointsDansLOrdre(); if (!X.length) { dire('Rien à reprendre : le contrôle ne relève rien.'); return; }
  const P = CONTROLE.pas; let i = P ? X.findIndex(x => clePoint(x) === P.cle) : -1;
  if (i < 0 && P) { const l = lignesDuControle().find(y => y.cle === P.cle); if (l) i = X.indexOf(l.xs[0]); }
  if (i < 0) i = P ? Math.min(P.rang, X.length) - (pas > 0 ? 1 : 0) : (pas > 0 ? -1 : X.length);
  const j = i + pas; allerAuPoint((j % X.length + X.length) % X.length, X, j >= X.length || j < 0); }
function allerAuPoint(i, X, tour) { const x = X[i]; if (!x) return; CONTROLE.pas = { cle: clePoint(x), rang: i };
  // (passe 87) P compte comme partout : « à régler », c'est ce qui a un geste (08-recap, `rangDuPoint`)
  const regle = y => typeof rangDuPoint === 'function' ? !!rangDuPoint(y).regler : y.niveau === 'ko', ici = regle(x);
  const meme = X.filter(y => regle(y) === ici), rang = meme.indexOf(x) + 1, total = meme.length;
  allerAuControle(x);
  dire(`${tour ? 'De nouveau au début · ' : ''}${ici ? 'À régler' : 'À voir'} ${rang} / ${total} · ${majuscule(motDuGenre(x.genre, 1))}${x.nom ? ' · ' + x.nom : ''} — P : le suivant`); }
// (l'index et le récapitulatif mènent encore à une LIGNE : son premier point)
function allerALaLigne(i, L) { const l = L[i]; if (!l) return; const X = pointsDansLOrdre(); allerAuPoint(Math.max(0, X.indexOf(l.xs[0])), X); }
// le bouton des repères, son compte : l'index ouvert sur les problèmes (« à reprendre » déplié)
function ouvrirProblemes() { CONTROLE.ouvert = true; const ix = !$('inspecteur').hidden && app.insp.index;
  if (ix && !app.cible) rendreIndex($('ba-equip')); else if (ix) retourIndex(); else basculerIndex(); }
// une ligne : son folio, son bloc et sa fiche — ou l'onglet Liaisons du récapitulatif, trié sur ce qu'il faut reprendre
function allerAuControle(x) {
  // (v86, le bilan d'ouverture) un point du tableau qui ne parle que d'un câble mène à sa fiche ; des longueurs illisibles, aux câbles à longueur supposée
  if (x.tableau != null && x.cables && x.cables.length === 1 && liaisonComplete(x.cables[0]) && typeof montrerFil === 'function') { montrerFil(x.cables[0]); return; }
  if (x.tableau != null && x.longueurs) { ouvrirOngletFiltre('liaisons', ['hyp'], null, 'tout'); return; }
  if (x.tableau != null && x.incompletes) { ouvrirOngletFiltre('liaisons', ['probleme'], null, 'tout'); return; }
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
