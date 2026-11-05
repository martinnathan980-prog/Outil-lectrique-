/* ===========================================================================
   08 — LE RETEST CORRIGÉ, EN EXCEL : le livrable que le lecteur renvoie
   ---------------------------------------------------------------------------
   L'audit v72 (le parcours joué de bout en bout) : « rien ne rend le livrable » — le lecteur corrige dans VOLTA (un
   calibre, trois câbles grossis, un numéro), puis recopie tout à la main dans son retest. VOLTA garde déjà, sur chaque
   liaison, ce que portait le fichier là où on l'a changé (`l.avant` : changerLiaison, poserChamp) : il rend donc le
   retest tel qu'il est maintenant, dans SES seize colonnes et sa mise en page (titre, mémo, en-têtes en ligne 4 — VOLTA
   le relit tel quel), chaque case changée portant en commentaire ce qu'elle disait avant, et une feuille
   « Modifications » qui les liste (le câble, ses deux bouts, la colonne, avant → après, et d'où vient le changement).
   Rien ne part du poste : le fichier est fabriqué dans la page (SheetJS) et téléchargé.

   v73 — CE QUE L'ÉCRAN MONTRE EST CE QUI PART (le technicien, n° 1 : « le cadran affiche 15 A, “le retenu” ; j'envoie un
   retest qui garde MS3320-10 et un câble dimensionné pour un 15 A qui n'est pas dans le fichier »). La décision : VOLTA
   n'écrit JAMAIS dans l’installation un changement que le lecteur n'a pas demandé — un calibre automatique écrit sans grossir
   ses câbles serait dangereux. Alors, avant d'enregistrer, LE RELEVÉ (un document de la page, pas un `confirm()`) :
     · ce qui part — chaque case changée, son objet, avant → après, et son ORIGINE : à la main, ou une proposition de
       VOLTA acceptée (la même colonne dans la feuille Modifications) ;
     · ce que VOLTA a choisi sans l'écrire — un calibre, un module — chacun avec son geste (« Écrire 15 A et grossir les
       2 câbles ») ; sans ce geste, l'Excel garde ce que dit le retest ;
     · ce qui reste à reprendre (le compte du contrôle, 08-controle) ;
     · le bouton plein « Enregistrer l'Excel ».
   ET LE RETEST CORRIGÉ SE RELIT (l'ingénieur, n° 2 : « rouvert, il a 207 liaisons au lieu de 201, et le profil de charge
   est perdu ») : une feuille cachée « VOLTA » garde ce que les seize colonnes ne disent pas — les profils de charge, les
   hypothèses, les contacts choisis à la main, les désignations et les choix des fiches — ; 02-lecture la lit et laisse
   la feuille Modifications de côté (un journal, pas des liaisons) ; `reprendreVolta` la remet sur le plan.
   ========================================================================= */
// les seize colonnes du retest (tests/format-retest.js), dans son ordre, et le champ de la liaison que chacune porte
const COLONNES_RETEST = [['Harness', 'harness'], ['Device1', 'de'], ['Pin1', 'borneDe'], ['PN1', 'pnDe'], ['Description1', 'descriptionDe'],
  ['Cable T/G', 'type'], ['Cable Tag', 'cable'], ['Route', 'route'], ['Device2', 'vers'], ['Pin2', 'borneVers'], ['PN2', 'pnVers'],
  ['Description2', 'descriptionVers'], ['FWD', 'fwd'], ['Cable length (mm)', 'longueur'], ['Appareil', 'appareil'], ['Date retest', 'retest']];
// une colonne en mots, pour le relevé (la colonne de l'Excel reste dans la bulle)
const MOTS_COLONNES = { harness: 'harness', de: 'de', borneDe: 'borne', pnDe: 'part number', descriptionDe: 'description', type: 'type', cable: 'numéro', route: 'route',
  vers: 'vers', borneVers: 'borne', pnVers: 'part number', descriptionVers: 'description', fwd: 'folio', longueur: 'longueur', appareil: 'appareil', retest: 'date de l’installation' };
/* Une valeur telle que la case l'écrit : la longueur en mm (VOLTA la garde en mètres) — sans l'arrondir (3670,5 mm reste
   3670,5), et telle que le fichier l'écrivait quand VOLTA ne la lit pas (« abc », « -3 » : la case revient, pas vide) —,
   le FWD d'origine sinon le folio, un bout tel que le fichier l'écrivait (« 677VT2 51 » + « B », que VOLTA lit 677VT2:51B :
   01, `ecritDuBout`). (v84 — la donnée du fichier reste intacte : l'aller-retour lire → exporter → relire rend les mêmes
   liaisons, et les mêmes cases.) */
const mmDe = m => Math.round(m * 1e6) / 1000;
const BOUTS_RETEST = { de: ['de', 0], borneDe: ['de', 1], vers: ['vers', 0], borneVers: ['vers', 1] };
const valeurRetest = (l, ch) => { if (ch === 'longueur') return l.longueur > 0 ? mmDe(l.longueur) : (l.longueurBrute || '');
  if (ch === 'fwd') return l.fwd || l.plan || '';
  const b = BOUTS_RETEST[ch]; if (b) { const e = ecritDuBout(l, b[0]); if (e) return e[b[1]]; }
  return l[ch] == null ? '' : l[ch]; };
const motAvant = (ch, v) => v == null || v === '' ? 'vide' : ch === 'longueur' ? String(mmDe(v)).replace('.', ',') + ' mm' : String(v);
/* Les colonnes de l'installation corrigée : l'installation et l'ECP en tête quand le fichier les portait, les seize, puis
   les colonnes que VOLTA ne lit pas (`autres`, 02 : « Remarque »…), dans l'ordre où elles paraissent. */
function colonnesDuClasseur(V) { const tete = [['Install', 'install'], ['ECP', 'ecp']].filter(([, ch]) => V.some(l => l[ch])), autres = [], vus = new Set();
  V.forEach(l => { if (l.autres) Object.keys(l.autres).forEach(k => { if (!vus.has(k)) { vus.add(k); autres.push(k); } }); });
  return { tete, autres }; }
// une liaison qu'on rend : ses deux bouts, ou ce qu'une ligne incomplète du fichier portait (un bout, un câble) — elle était au fichier
const aRendre = l => !!l && !!(l.de || l.vers || l.cable);
/* Les modifications d'une liaison : [colonne, champ, avant, après] pour chaque champ que `l.avant` garde et qui a changé. */
/* (v86, l'audit B3) LES LIGNES EN DOUBLE RETIRÉES (08-controle, « Retirer la ligne en double », une proposition de VOLTA) : la
   ligne gardée en porte le compte (`avant.copies`) ; l'Excel corrigé ne les écrit plus, et le dit — la colonne « Modifié par
   VOLTA », la feuille Modifications, le relevé. */
const copiesRetirees = l => l && l.avant && l.avant.copies > 0 ? l.avant.copies : 0;
const motCopies = n => n > 1 ? n + ' lignes en double retirées' : 'ligne en double retirée';
function modificationsDe(l) { if (!l.avant) return [];
  return COLONNES_RETEST.filter(([, ch]) => ch in l.avant && (l.avant[ch] == null ? null : l.avant[ch]) !== (l[ch] == null ? null : l[ch]))
    .map(([col, ch]) => [col, ch, l.avant[ch], l[ch]]); }

/* ---- L'ORIGINE D'UNE CASE CHANGÉE : à la main, ou une proposition de VOLTA acceptée -----------------------------------
   Un geste de VOLTA (« Passer en 15 A et grossir les 3 câbles », « Passer en DR12 », les gestes du relevé) se fait dans
   `avecOrigineVolta` : chaque champ qu'il change garde, à côté de ce que portait le fichier (`l.avant`), la valeur que
   VOLTA y a mise (`l.avant['volta:type']`) — la liaison, l'historique et la bibliothèque la gardent avec elle. La case
   est « proposition de VOLTA acceptée » tant qu'elle porte encore cette valeur ; réécrite à la main, elle redevient « à
   la main ». Un part number de disjoncteur qui porte le calibre que l'outil retient (la carte de décision) l'est aussi. */
const ORIGINE_VOLTA = 'volta:', ORIGINES_MOTS = { main: 'à la main', volta: 'proposition de VOLTA acceptée' };
function avecOrigineVolta(faire) { const avant = new Map(); verite().forEach(l => avant.set(l, COLONNES_RETEST.map(([, ch]) => l[ch])));
  const r = faire(); let n = 0;
  verite().forEach(l => { const a = avant.get(l); if (!a || !l.avant) return;
    COLONNES_RETEST.forEach(([, ch], k) => { if (a[k] === l[ch] || !(ch in l.avant)) return; l.avant = { ...l.avant, [ORIGINE_VOLTA + ch]: l[ch] == null ? null : l[ch] }; n++; }); });
  if (n && typeof sauver === 'function') sauver();
  return r; }
function origineDeCase(l, ch, ouvert) { const v = l.avant && l.avant[ORIGINE_VOLTA + ch];
  if (v !== undefined && v === (l[ch] == null ? null : l[ch])) return 'volta';
  // le part number d'un disjoncteur que la carte de décision a écrit : il porte le calibre que l'outil retient (08 bis)
  if (ouvert && /^pn/.test(ch)) { const r = ch === 'pnDe' ? l.de : l.vers; if (r && estDisjoncteur(r)) { try { const d = disjonctionDe(r); if (d.origine !== 'main' && d.calibre > 0 && d.calibre === d.passe) return 'volta'; } catch (_) { } } }
  return 'main'; }

/* ---- LE CLASSEUR ---------------------------------------------------------------------------------------------------
   La feuille « Retest » (titre, mémo, en-têtes en ligne 4, une ligne par liaison, les cases changées commentées, une 17e
   colonne « Modifié par VOLTA » qui les nomme), la feuille « Modifications » (avec son Origine) et, pour le plan ouvert
   (`o.volta`), la feuille cachée « VOLTA ». `o.ouvert` : ce sont les liaisons du plan sur la table (l'origine se lit
   aussi par ses disjoncteurs) ; la conversion en lot (08-bibliotheque) appelle sans. */
function classeurRetestCorrige(V, nom, o) { o = o || {}; V = (V || []).filter(aRendre); const mods = V.map(modificationsDe), copies = V.map(copiesRetirees), n = mods.filter((m, i) => m.length || copies[i]).length;
  const K = colonnesDuClasseur(V), quand = new Date().toLocaleDateString('fr-FR'), entetes = [...K.tete.map(c => c[0]), ...COLONNES_RETEST.map(c => c[0]), ...K.autres, 'Modifié par VOLTA'];
  const lignes = [[`Installation corrigée par VOLTA — ${nom || 'plan'}`], [`Le ${quand} · ${plurielLie(V.length, 'liaison')} · ${plurielLie(n, 'liaison')} modifiée${n > 1 ? 's' : ''} : chaque case changée porte en commentaire ce qu'elle disait avant`], [], entetes,
    ...V.map((l, i) => [...K.tete.map(([, ch]) => l[ch] || ''), ...COLONNES_RETEST.map(([, ch]) => valeurRetest(l, ch)), ...K.autres.map(k => (l.autres && l.autres[k]) || ''), [...mods[i].map(m => m[0]), ...(copies[i] ? [motCopies(copies[i])] : [])].join(', ')])];
  const ws = XLSX.utils.aoa_to_sheet(lignes), origine = (l, ch) => origineDeCase(l, ch, !!o.ouvert);
  // le commentaire de chaque case changée : ce que portait le fichier, et d'où vient le changement
  V.forEach((l, i) => mods[i].forEach(([col, ch, av]) => { const c = K.tete.length + COLONNES_RETEST.findIndex(x => x[1] === ch), ref = XLSX.utils.encode_cell({ r: 4 + i, c });
    if (!ws[ref]) ws[ref] = { t: 's', v: '' }; ws[ref].c = [{ a: 'VOLTA', t: 'Avant : ' + motAvant(ch, av) + (origine(l, ch) === 'volta' ? ' · ' + ORIGINES_MOTS.volta : '') }]; ws[ref].c.hidden = true; }));
  ws['!cols'] = entetes.map(h => ({ wch: Math.max(10, Math.min(28, h.length + 3)) })); ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: 3 + V.length, c: entetes.length - 1 } }) };
  const M = [['Harness', 'Cable Tag', 'Device1', 'Pin1', 'Device2', 'Pin2', 'Colonne', 'Avant', 'Après', 'Origine']];
  V.forEach((l, i) => mods[i].forEach(([col, ch, av, ap]) => M.push([l.harness || '', l.cable || '', ...['de', 'borneDe', 'vers', 'borneVers'].map(k => valeurRetest(l, k)), col, motAvant(ch, av), motAvant(ch, ap), ORIGINES_MOTS[origine(l, ch)]])));
  V.forEach((l, i) => { if (copies[i]) M.push([l.harness || '', l.cable || '', ...['de', 'borneDe', 'vers', 'borneVers'].map(k => valeurRetest(l, k)), 'Ligne entière', (copies[i] + 1) + ' lignes identiques', '1 ligne', ORIGINES_MOTS.volta]); });
  const wm = XLSX.utils.aoa_to_sheet(M.length > 1 ? M : [...M, ['', '', '', '', '', '', 'aucune modification', '', '', '']]); wm['!cols'] = M[0].map((h, j) => ({ wch: j < 6 ? 12 : j === 9 ? 30 : 22 }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Installation'); XLSX.utils.book_append_sheet(wb, wm, 'Modifications');
  if (o.volta) { XLSX.utils.book_append_sheet(wb, feuilleVolta(o.volta), FEUILLE_VOLTA); wb.Workbook = { Sheets: [{ Hidden: 0 }, { Hidden: 0 }, { Hidden: 1 }] }; }
  return { wb, liaisons: V.length, modifiees: n, cases: mods.reduce((s, m) => s + m.length, 0) }; }

/* ---- LA FEUILLE CACHÉE « VOLTA » : ce que les seize colonnes ne disent pas -----------------------------------------
   Une ligne par donnée : sa sorte (charge, hypothese, contact, designation, sexe, raccord), sa clé, sa valeur en mots
   (un vérificateur qui la démasque la lit) et sa valeur pour VOLTA (JSON). 02-lecture la relit (`lireFeuilleVolta`). */
const FEUILLE_VOLTA = 'Volta', FORMAT_VOLTA = 'volta-retest-corrige-1';
// ce qu'un plan ouvert garde hors des colonnes : ses choix, et les hypothèses avec lesquelles il a été jugé
function voltaDuPlan() { const C = app.contrat, H = { ...HYPOTHESES, ...(app.simu || {}) }, contacts = [];
  verite().filter(liaisonComplete).forEach(l => { if (l.contactDe || l.contactVers) contacts.push({ cle: cleVolta(l), contactDe: l.contactDe || '', contactVers: l.contactVers || '' }); });
  return { format: FORMAT_VOLTA, nom: app.nom || '', quand: new Date().toISOString(), charges: [...(C.charges || [])], hypotheses: H, contacts,
    designations: [...(C.designations || [])], sexes: [...(C.sexes || [])], raccords: [...(C.raccords || [])] }; }
// une liaison, reconnue d'un fichier à l'autre : ses deux bouts et son numéro
const cleVolta = l => [l.de, l.borneDe, l.vers, l.borneVers, l.cable].map(x => String(x == null ? '' : x)).join('|');
const motProfil = p => !p ? '' : [p.calibre > 0 ? 'calibre ' + nombre(p.calibre) + ' A' : '', ...['dem', 'trans'].filter(k => p[k] && p[k].i != null).map(k => (k === 'dem' ? 'démarrage ' : 'transition ') + nombre(p[k].i) + ' A' + (p[k].t != null ? ' / ' + nombre(p[k].t) + ' s' : '')),
  p.perm && p.perm.i != null ? 'permanent ' + nombre(p.perm.i) + ' A' : '', ...(p.plus || []).map(x => (x.nom || 'état') + ' ' + nombre(x.i) + ' A' + (x.t != null ? ' / ' + nombre(x.t) + ' s' : ''))].filter(Boolean).join(' · ');
function feuilleVolta(v) { const L = [['VOLTA — ce que les colonnes de l’installation ne disent pas : les profils de charge, les hypothèses, les choix des fiches.'], ['VOLTA relit cette feuille quand vous rouvrez ce fichier. Ne la modifiez pas.'], [],
    ['Sorte', 'Clé', 'Valeur', 'Donnée']];
  L.push(['format', FORMAT_VOLTA, v.nom || '', JSON.stringify({ quand: v.quand })]);
  (v.charges || []).forEach(([k, p]) => L.push(['charge', k, motProfil(p), JSON.stringify(p)]));
  Object.entries(v.hypotheses || {}).forEach(([k, x]) => { if (x == null || typeof x === 'function') return; L.push(['hypothese', k, Array.isArray(x) ? x.join(' · ') : typeof x === 'object' ? '' : String(x), JSON.stringify(x)]); });
  (v.contacts || []).forEach(c => L.push(['contact', c.cle, [c.contactDe, c.contactVers].filter(Boolean).join(' · '), JSON.stringify({ contactDe: c.contactDe, contactVers: c.contactVers })]));
  [['designation', v.designations], ['sexe', v.sexes], ['raccord', v.raccords]].forEach(([s, xs]) => (xs || []).forEach(([k, x]) => L.push([s, k, typeof x === 'object' ? '' : String(x), JSON.stringify(x)])));
  const ws = XLSX.utils.aoa_to_sheet(L); ws['!cols'] = [{ wch: 12 }, { wch: 24 }, { wch: 48 }, { wch: 60 }]; return ws; }

/* ---- CE QUI PART, CE QUE VOLTA A CHOISI SANS L'ÉCRIRE ---------------------------------------------------------------
   `changementsDuRetest()` : ce qu'un enregistrement écrirait maintenant — les cases changées, groupées par objet (le part
   number d'un disjoncteur changé sur ses trois liaisons fait une ligne), leur origine ; les choix de VOLTA qui ne sont
   pas écrits (`proposes`) ; ce qui reste à reprendre (le compte unique du contrôle). La pilule de la barre du haut (A2)
   lit `nombreDeChangements()`. */
function changementsDuRetest() { const V = verite().filter(liaisonComplete), par = new Map(); let liaisons = 0, cases = 0;
  V.forEach(l => { const m = modificationsDe(l); if (!m.length) return; liaisons++; cases += m.length;
    // (v86, l'audit B6 : « Ce qui part · W-012 type DR20 → DR16 ») un câble se dit par son type et ses deux bouts, jamais par
    // son numéro, qui reste écrit dans l'Excel, intact ; quand c'est son type qui change, ses deux bouts seuls (08-journal)
    m.forEach(([col, ch, av, ap]) => { const pn = /^pn/.test(ch), objet = pn ? (ch === 'pnDe' ? l.de : l.vers) : ch === 'type' ? boutsDuCable(l) : cableParSesBouts(l), origine = origineDeCase(l, ch, true);
      const k = [objet, MOTS_COLONNES[ch] || col, av, ap, origine].join('\u0001');
      // le part number d'un disjoncteur : le calibre qu'il porte, en clair (« 10 → 15 A »)
      let calibres = ''; if (pn && estDisjoncteur(objet)) { const a = familleDuPn(av, app.norme), b = familleDuPn(ap, app.norme); if (a && b && a.calibre > 0 && b.calibre > 0) calibres = nombre(a.calibre) + ' → ' + nombre(b.calibre) + ' A'; }
      const e = par.get(k) || par.set(k, { objet, mono: true, colonne: MOTS_COLONNES[ch] || col, calibres, colonnes: new Set(), champ: ch, av, ap, avant: motAvant(ch, av), apres: motAvant(ch, ap), origine, n: 0, liaisons: [] }).get(k);
      e.colonnes.add(col); e.n++; e.liaisons.push(l); }); });
  // (v86) une ligne en double retirée : toute la ligne quitte l'Excel, une proposition de VOLTA ; le câble se dit par ses bouts
  V.forEach(l => { const c = copiesRetirees(l); if (!c) return; if (!modificationsDe(l).length) liaisons++;
    const objet = typeof cableParSesBouts === 'function' ? cableParSesBouts(l) : l.de + (l.borneDe ? ':' + l.borneDe : '') + ' → ' + l.vers + (l.borneVers ? ':' + l.borneVers : '');
    par.set('copies\u0001' + par.size + '\u0001' + objet, { objet, mono: true, colonne: 'ligne en double', calibres: '', colonnes: new Set(['toutes']), champ: 'copies', avant: (c + 1) + ' lignes', apres: '1 ligne', origine: 'volta', n: 1, liaisons: [l],
      bulle: (c > 1 ? c + ' copies identiques de cette ligne quittent' : 'Sa copie identique quitte') + ' l’Excel corrigé — « Retirer la ligne en double »' }); });
  const ecrits = [...par.values()].map(e => ({ ...e, colonnes: [...e.colonnes] })).sort((a, b) => triNaturel(a.objet, b.objet) || a.colonne.localeCompare(b.colonne));
  let problemes = { ko: 0, att: 0, mot: '' }; try { problemes = compteProblemes(); } catch (_) { }
  // (v86) les barrettes ajoutées par VOLTA qui ont reçu leur repère : elles sont dans l'installation, leurs lignes partent (08-journal)
  let ajouts = []; try { ajouts = barrettesPosees(); } catch (_) { ajouts = []; }
  return { liaisons, cases, ecrits, ajouts, proposes: propositionsNonEcrites(), problemes }; }
// (v86) une barrette ajoutée qui a reçu son repère compte ses lignes : son câble à créer, ses shunts, les câbles qui arrivent sur elle
const nombreDeChangements = () => { let n = 0; verite().forEach(l => { if (liaisonComplete(l) && (modificationsDe(l).length || copiesRetirees(l))) n++; });
  try { barrettesPosees().forEach(p => { n += 1 + p.shunts.length + p.arrivent.filter(l => !(modificationsDe(l).length || copiesRetirees(l))).length; }); } catch (_) { } return n; };
/* RETIRER une ligne de ce qui part (l'audit M2) : le même retour que l'Historique (08-fiche, `ligneDuFichier`) — la valeur de
   votre fichier revient ; un calibre que VOLTA écrit de lui-même se reprend à la main (rendu, il se réécrirait). Une ligne
   en double retirée revient, telle que votre fichier l'écrivait (08-journal, `remettreLesCopies`). Rend { faire, dit, aide }. */
function retirerDuReleve(e) { if (!e || !e.liaisons || !e.liaisons.length) return null; const ch = e.champ, l = e.liaisons[0];
  if (ch === 'copies') return { faire: () => remettreLesCopies(l), aide: 'La ligne en double revient dans l’Excel corrigé, comme votre fichier l’écrivait', dit: 'Retiré de l’Excel corrigé : la ligne en double ' + boutsDuCable(l) + ' revient, comme dans votre fichier.' };
  let y; try { y = ligneDuFichier({ rendre: e.liaisons.map(x => [x, ch]), avant: motValeur(ch, e.av), apres: motValeur(ch, e.ap), champ: MOTS_CHAMPS[ch] || ch }, { type: 'fil' }); } catch (_) { return null; }
  if (!y || typeof y.faire !== 'function') return null;
  const dit = /^pn/.test(ch) ? y.dit : ch === 'type' ? `le câble ${boutsDuCable(l)} revient en ${y.avant}, comme dans votre fichier.` : `${(y.quoi || '').toLowerCase()} de ${cableParSesBouts(l)} : ${y.avant}, ${y.depuis === 'hyp' ? 'supposée' : 'comme dans votre fichier'}.`;
  return { faire: y.faire, aide: y.aide, dit: 'Retiré de l’Excel corrigé : ' + dit.charAt(0).toLowerCase() + dit.slice(1) }; }
const motChangements = n => n > 1 ? n + ' changements' : n === 1 ? '1 changement' : 'aucun changement';
/* LES CHOIX DE VOLTA PAS ENCORE ÉCRITS : un disjoncteur dont l'outil retient un autre calibre que celui de son part number
   (le meilleur qui passe), une barrette dont il retient un autre module que celui du retest. Chacun : ce que dit le retest,
   ce que VOLTA retient, son verdict (la table unique, 09 bis), ce que le geste écrirait, et le geste. */
function propositionsNonEcrites() { const V = verite(), out = [];
  reperesDe(V).filter(estDisjoncteur).sort(triNaturel).forEach(r => { let d; try { d = disjonctionDe(r); } catch (_) { return; }
    if (!d || !d.pn || !(d.calibre > 0) || d.origine === 'main' || Math.abs(d.calibre - d.pn) < 1e-9) return;
    const m = d.meilleur || {}, xs = d.calibre === m.calibre && typeof filsDuMeilleur === 'function' ? filsDuMeilleur(d).filter(p => p.f && p.x.propose) : [];
    const types = [...new Set(xs.map(p => p.x.propose))], nc = xs.length, pnRetest = pnDuRepere(r), pnVolta = d.famille && pnRetest ? pnAvecCalibre(pnRetest, d.famille, d.calibre) : null;
    // un part number dont la famille ne se lit pas ne sait pas porter un autre calibre : VOLTA ne l'écrit pas, il le dit
    const ecrivable = !!(pnVolta && pnVolta !== pnRetest);
    out.push({ genre: 'calibre', repere: r, retest: d.pn, retenu: d.calibre, pnRetest, pnVolta, ecrivable, verdictRetest: verdictDeCalibre(d.gPn), verdictRetenu: verdictDeCalibre(d),
      // (v86, B6) chaque câble par ses deux bouts, jamais par son numéro
      cables: xs.map(p => ({ cable: p.f && p.f.l ? boutsDuCable(sourceDe(p.f.l) || p.f.l) : (p.x.bouts || []).join(' → ') || 'un câble', actuel: p.x.actuel, propose: p.x.propose })),
      geste: `Écrire ${amperes(d.calibre)}${nc ? ' et grossir ' + (nc > 1 ? 'les ' + nc + ' câbles' : 'le câble') : ''}`,
      // (les câbles se lisent juste dessous, par leurs deux bouts : la phrase dit combien, pas lesquels)
      suite: (nc ? `Le ${amperes(d.calibre)} demande ${nc > 1 ? 'ces ' + nc + ' câbles' : 'ce câble'} en ${types.length === 1 ? types[0] : 'plus gros'}.` : '') + (ecrivable ? '' : ` Son part number (${pnRetest}) ne dit pas sa famille : VOLTA ne sait pas l’écrire, à reporter à la main.`),
      faire: ecrivable ? () => avecOrigineVolta(() => deciderCalibre(r)) : null }); });
  // les barrettes : le module que VOLTA retient à la place de celui du retest
  reperesDe(V).filter(r => !VT_A_POSER.test(r) && barretteEnModules(r)).sort(triNaturel).forEach(r => { try { const b = besoinsDeBarrette(r, V), Q = planDeBarrette(r).plan;
      // (v85) une barrette « module + contact » (677VT2:51B) : chaque module écrit SA référence dans SES cases seulement
      // (`casesDuModule`), jamais « B201 + B202 » partout
      if (Q.lettres) { (Q.modules || []).forEach(M => { if (!M.fichier || !M.reference || cleNorme(M.fichier) === cleNorme(M.reference)) return;
          const ecritures = () => casesDuModule(r, verite(), M.numero).map(([l, c]) => [l, c, M.reference]);
          out.push({ genre: 'module', repere: r + ' · module ' + M.numero, retest: M.fichier, retenu: M.reference, cables: [], geste: 'Écrire ' + M.reference, suite: '', ecritures,
            faire: () => avecOrigineVolta(() => changerLiaisons(ecritures(), r + ', module ' + M.numero + ' : ' + M.reference + ' écrit dans l’Excel corrigé')) }); });
        return; }
      if (!b.pn || !Q.reference || cleNorme(b.pn) === cleNorme(Q.reference) || !moduleDeReference(app.norme, b.pn)) return;
      const ecritures = () => { const xs = []; verite().forEach(l => { if (l.de === r && l.pnDe) xs.push([l, 'pnDe', Q.reference]); if (l.vers === r && l.pnVers) xs.push([l, 'pnVers', Q.reference]); }); return xs; };
      out.push({ genre: 'module', repere: r, retest: b.pn, retenu: Q.reference, cables: [], geste: 'Écrire ' + Q.reference, suite: '', ecritures,
        faire: () => avecOrigineVolta(() => changerLiaisons(ecritures(), r + ' : le module ' + Q.reference + ' écrit dans l’Excel corrigé')) }); } catch (_) { } });
  return out; }

/* ---- LE RELEVÉ, avant d'enregistrer ---------------------------------------------------------------------------------
   Un document de la page (la coquille des documents, 08-interface : la tête, le chapeau, le pied à une action pleine) :
   le relevé se lit comme un ticket — trois chiffres en tête (ce qui part, ce qui reste à écrire, ce qui reste à
   reprendre), puis chaque partie. Il se refait quand le plan change sous lui (un geste du relevé, un Ctrl+Z). */
const RELEVE = { ouvert: false, enregistre: null, cle: '' };
const ICO_TELECHARGER = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/></svg>';
const nomDuRetestCorrige = () => nomContrat() + '-retest-corrige.xlsx';
// la clé de ce que le relevé montre : quand elle change, il se refait (et ce qui avait été enregistré ne l'est plus tel quel)
const cleDuReleve = () => { try { return signature(verite()) + '|' + JSON.stringify(verite().map(l => l.avant || 0)) + '|' + JSON.stringify([...(app.contrat.charges || [])]); } catch (_) { return String(Date.now()); } };
function releveHtml(arrive) { const C = changementsDuRetest(), P = C.problemes, np = C.proposes.length;
  // (une barrette ajoutée qui a reçu son repère : ses lignes comptent, celles qu'elle crée et celles qui arrivent sur elle)
  const n = C.liaisons + C.ajouts.reduce((s, p) => s + 1 + p.shunts.length + p.arrivent.filter(l => !(modificationsDe(l).length || copiesRetirees(l))).length, 0);
  // l'arrivée, une fois : le ticket puis chaque partie, en cascade (`.entre-v`, le socle)
  let k = 0; const entre = () => arrive ? ` entre-v" style="--k:${++k}` : '';
  // le ticket : trois chiffres sur une grille de filets
  const chiffre = (v, mot, cls, bulle) => `<div class="rv-chiffre${cls ? ' ' + cls : ''}"${bulle ? ` data-bulle="${escA(bulle)}"` : ''}><b>${v}</b><span>${mot}</span></div>`;
  const ticket = `<div class="rv-ticket${entre()}" role="group" aria-label="En bref">${chiffre(n, n > 1 ? 'liaisons modifiées' : n === 1 ? 'liaison modifiée' : 'aucune modification', '', pluriel(C.cases, 'case') + ' de l’Excel ' + (C.cases > 1 ? 'changent' : 'change'))}`
    + chiffre(np, np > 1 ? 'choix de VOLTA à écrire' : np === 1 ? 'choix de VOLTA à écrire' : 'tout est écrit', np ? 'att' : '', np ? 'VOLTA les retient, mais ils ne partent que si vous les écrivez' : 'Chaque choix de VOLTA est dans l’installation')
    + chiffre(P.ko ? P.ko : P.att, P.ko ? (P.ko > 1 ? 'problèmes' : 'problème') + (P.att ? ` · ${P.att} à voir` : '') : P.att ? (P.att > 1 ? 'points à voir' : 'point à voir') : 'rien à reprendre', P.ko ? 'ko' : P.att ? 'att-doux' : 'ok', P.mot) + '</div>';
  k++;   // « Ce qui part » vient juste après le ticket
  // (v86, l'audit F3) VOLTA ne sait pas où le navigateur range le fichier : il dit son nom, pas « dans vos Téléchargements »
  const enr = RELEVE.enregistre && RELEVE.enregistre.cle === RELEVE.cle ? `<p class="rv-fait" role="status">${ico('coche')}<span>Enregistré à ${esc(RELEVE.enregistre.heure)} · <span class="id">${esc(RELEVE.enregistre.nom)}</span></span></p>` : '';
  // ce qui part : chaque ligne, son objet (un câble par ses deux bouts), avant → après, qui, et « Retirer » (l'audit M2 : la
  // valeur de votre fichier revient — le message offre « Défaire »)
  const orig = o => `<span class="rv-orig ${o}">${o === 'volta' ? ico('etoile') + 'VOLTA' : 'à la main'}</span>`;
  const retirer = (attr, aide) => `<button type="button" class="rv-retirer" ${attr} data-bulle="${escA('Retirer de l’Excel corrigé' + (aide ? ' : ' + aide.charAt(0).toLowerCase() + aide.slice(1) : ''))}">${ico('retour')}<span>Retirer</span></button>`;
  const ligne = (e, i) => { const R = retirerDuReleve(e);
    return `<li class="rv-l" data-bulle="${escA(e.bulle || (e.n > 1 ? pluriel(e.n, 'liaison') + ' · ' : '') + 'colonne' + (e.colonnes.length > 1 ? 's ' : ' ') + e.colonnes.join(', ') + ' de l’Excel')}"><span class="rv-objet id">${esc(e.objet)}</span>`
      + `<span class="rv-det"><span class="rv-col">${esc(e.colonne)}${e.calibres ? ` · <b>${esc(e.calibres)}</b>` : ''}${e.n > 1 ? `<small> · ${e.n} liaisons</small>` : ''}</span><span class="rv-av"><s class="id">${esc(e.avant)}</s>${ico('fleche')}<b class="id">${esc(e.apres)}</b></span></span>`
      + orig(e.origine) + (R ? retirer(`data-retirer="${i}"`, R.aide) : '') + '</li>'; };
  // une barrette ajoutée par VOLTA qui a reçu son repère : ses lignes entrent dans l'Excel (son câble à créer, ses shunts)
  const ajout = (p, i) => `<li class="rv-l rv-ajout" data-bulle="${escA('VOLTA l’a ajoutée sur ' + p.sur + ', où votre fichier met plusieurs câbles ; vous lui avez donné son repère. ' + majuscule(pluriel(1 + p.shunts.length, 'ligne')) + ' de plus dans l’Excel corrigé : son câble à créer et ' + pluriel(p.shunts.length, 'shunt') + ' ; les câbles de ' + p.sur + ' partent d’elle')}">`
    + `<span class="rv-objet id">${esc(p.nom)}</span><span class="rv-det"><span class="rv-col">barrette ajoutée sur <span class="id">${esc(p.sur)}</span> · <b>${esc(pluriel(1 + p.shunts.length, 'ligne'))} de plus</b></span><span class="rv-av"><s class="id">${esc(p.vt)}</s>${ico('fleche')}<b class="id">${esc(p.nom)}</b></span></span>`
    + orig('volta') + retirer(`data-retirer-ajout="${i}"`, 'Elle redevient ' + p.vt + ', la barrette que VOLTA propose') + '</li>';
  const part = C.ecrits.length || C.ajouts.length ? `<ul class="rv-liste">${C.ecrits.map(ligne).join('')}${C.ajouts.map(ajout).join('')}</ul>` : '<p class="rv-vide">Rien n’a changé : l’Excel sera votre installation telle que VOLTA l’a lue.</p>';
  // ce que VOLTA a choisi sans l'écrire
  const prop = (p, i) => { const vR = p.verdictRetest, vV = p.verdictRetenu;
    const dit = p.genre === 'calibre' ? `l’installation dit <s class="id">${esc(amperes(p.retest))}</s>${vR ? ` · <span class="rv-v ${vR.etat}" data-bulle="${escA(vR.bulle)}">${esc(vR.mot)}</span>` : ''}` : `l’installation dit <s class="id">${esc(p.retest)}</s>`;
    const garde = (p.faire ? 'Sans ce geste, l’Excel garde ' : 'L’Excel garde ') + (p.genre === 'calibre' ? (p.pnRetest ? '<span class="id">' + esc(p.pnRetest) + '</span>' : 'le ' + esc(amperes(p.retest))) : `<span class="id">${esc(p.retest)}</span>`) + '.';
    return `<li class="rv-p"><div class="rv-p-t"><b class="id">${esc(p.repere)}</b><span>VOLTA retient <b class="id">${esc(p.genre === 'calibre' ? amperes(p.retenu) : p.retenu)}</b>${vV && p.genre === 'calibre' ? ` <span class="rv-v ${vV.etat}" data-bulle="${escA(vV.bulle)}">${esc(vV.mot)}</span>` : ''}</span><span class="rv-p-dit">${dit}</span></div>`
      + `<p class="rv-p-n">${garde}${p.suite ? ' ' + esc(p.suite) : ''}</p>`
      + (p.cables.length ? `<ul class="rv-p-cables">${p.cables.map(c => `<li><b class="id">${esc(c.cable)}</b><s class="id">${esc(c.actuel)}</s>${ico('fleche')}<b class="id">${esc(c.propose)}</b></li>`).join('')}</ul>` : '')
      + (p.faire ? `<button type="button" class="btn papier dense rv-ecrire" data-proposition="${i}" data-bulle="${escA('Une proposition de VOLTA : elle part dans l’Excel, marquée comme telle — Ctrl+Z la défait')}">${esc(p.geste)}</button>` : '') + '</li>'; };
  // les modules de barrette se disent ensemble, d'un geste (le calibre d'un disjoncteur, lui, a chacun le sien)
  const cals = C.proposes.map((p, i) => [p, i]).filter(([p]) => p.genre !== 'module'), mods = C.proposes.filter(p => p.genre === 'module');
  const modsHtml = mods.length ? `<li class="rv-p rv-p-mod"><div class="rv-p-t"><b>${mods.length > 1 ? mods.length + ' modules de barrette' : 'Un module de barrette'}</b><span class="rv-p-dit">VOLTA en retient un autre que celui de l’installation</span></div>`
    + `<ul class="rv-p-cables rv-p-mods">${mods.map(p => `<li><b class="id">${esc(p.repere)}</b><s class="id">${esc(p.retest)}</s>${ico('fleche')}<b class="id">${esc(p.retenu)}</b></li>`).join('')}</ul>`
    + `<p class="rv-p-n">Le plus petit module qui loge les câbles de chaque barrette. Sans ce geste, l’Excel garde ceux de l’installation.</p>`
    + `<button type="button" class="btn papier dense rv-ecrire" data-proposition="modules" data-bulle="${escA('Une proposition de VOLTA : elle part dans l’Excel, marquée comme telle — Ctrl+Z la défait')}">${mods.length > 1 ? 'Écrire les ' + mods.length + ' modules' : 'Écrire ' + esc(mods[0].retenu)}</button></li>` : '';
  const props = np ? `<h3 class="sous-titre rv-st${entre()}">Choisi par VOLTA, pas encore écrit<small>${np}</small></h3><ul class="rv-props">${cals.map(([p, i]) => prop(p, i)).join('')}${modsHtml}</ul>` : '';
  // ce qui reste à reprendre : les genres du contrôle, les problèmes d'abord
  let reste = ''; try { const G = genresDuControle(); if (G.length) { const ligneG = g => { const noms = [...g.noms]; return `<li class="rv-g ${g.niveau}"><i aria-hidden="true"></i><b>${g.n}</b><span>${esc(motDuGenre(g.genre, g.n))}</span><small>${esc(noms.length === 1 ? noms[0] : noms.length ? plurielLie(noms.length, 'repère') : 'le tableau')}</small></li>`; };
      reste = `<h3 class="sous-titre rv-st${entre()}">Ce qui reste à reprendre<small>${esc(P.mot)}</small></h3><ul class="rv-reste">${G.slice(0, 5).map(ligneG).join('')}</ul>`
        + `<button type="button" class="btn lien rv-tout" id="rv-problemes" data-bulle="${escA('L’index des repères, sur ce qui reste à reprendre — P passe au point suivant')}">${G.length > 5 ? 'Tout voir sur le plan' : 'Les voir sur le plan'}<kbd>R</kbd></button>`; } } catch (_) { }
  return tete(nomAffichePlan() + ' · Excel corrigé', 'Ce qui part dans l’Excel')
    + `<p class="note">VOLTA n’écrit dans l’Excel corrigé que ce que vous avez demandé. Relisez, puis enregistrez.</p>`
    + enr + ticket + `<h3 class="sous-titre rv-st${arrive ? ' entre-v" style="--k:2' : ''}">Ce qui part<small>${esc([C.cases ? pluriel(C.cases, 'case') : '', C.ajouts.length ? pluriel(C.ajouts.length, 'barrette') : ''].filter(Boolean).join(' · '))}</small></h3>` + part + props + reste
    + `<p class="note rv-volta">Une feuille cachée « VOLTA » garde vos profils de charge, vos hypothèses et vos choix : rouverte dans VOLTA, cette installation reprend où vous en étiez. La feuille Modifications dit l’origine de chaque case.</p>`; }
const nomAffichePlan = () => app.nom ? String(app.nom).replace(/\.[^.]+$/, '') : 'Plan';
function rendreReleve(ouvrir) { if (!ouvrir && (!RELEVE.ouvert || !app.fiche || app.fiche.mode !== 'releve')) { RELEVE.ouvert = false; return; }
  const corps = $('fiche-corps'), haut = corps ? corps.scrollTop : 0; RELEVE.cle = cleDuReleve();
  const fait = RELEVE.enregistre && RELEVE.enregistre.cle === RELEVE.cle;
  ouvrirFiche({ mode: 'releve', large: true }, releveHtml(!!ouvrir), `<button type="button" class="btn ${fait ? 'papier' : 'cuivre'}" id="rv-enregistrer">${ICO_TELECHARGER}${fait ? 'Enregistrer de nouveau' : 'Enregistrer l’Excel'}</button><span class="rv-fichier id" data-bulle="Le nom du fichier que le navigateur enregistre">${esc(nomDuRetestCorrige())}</span>`);
  if (corps) corps.scrollTop = haut; lierReleve(); }
function lierReleve() { const C = changementsDuRetest(), P = C.proposes;
  $('rv-enregistrer').onclick = () => enregistrerRetestCorrige();
  // (v86, M2) « Retirer » : la valeur de votre fichier revient ; le message le dit et « Défaire » rend la case, le relevé rouvert
  const direDuReleve = mot => dire(mot, false, { geste: 'Défaire', faire: () => { const q = defaire(); if (q) setTimeout(() => exporterRetestCorrige(), 0); } });
  document.querySelectorAll('#fiche [data-retirer]').forEach(b => b.onclick = e => { e.stopPropagation(); const R = retirerDuReleve(C.ecrits[+b.dataset.retirer]); if (!R) return;
    const avant = app.hist.length; R.faire(); if (app.hist.length !== avant || app.hist.length >= 40) direDuReleve(R.dit); });
  document.querySelectorAll('#fiche [data-retirer-ajout]').forEach(b => b.onclick = e => { e.stopPropagation(); const p = C.ajouts[+b.dataset.retirerAjout];
    if (p && deposerBarrette(p)) direDuReleve('Retiré de l’Excel corrigé : ' + p.nom + ' redevient ' + p.vt + ', les câbles reviennent sur ' + p.sur + '.'); });
  document.querySelectorAll('#fiche [data-proposition]').forEach(b => b.onclick = () => { const k = b.dataset.proposition;
    if (k === 'modules') { const ms = P.filter(p => p.genre === 'module'); if (!ms.length) return; avecOrigineVolta(() => changerLiaisons(ms.flatMap(p => p.ecritures()), ms.length > 1 ? 'les modules de ' + ms.length + ' barrettes écrits dans l’installation' : ms[0].repere + ' : le module ' + ms[0].retenu + ' écrit dans l’Excel corrigé')); }
    else { const p = P[+k]; if (!p || !p.faire) return; p.faire(); }
    rendreReleve();
    const e = $('rv-enregistrer'); if (e) e.focus({ preventScroll: true }); });
  const pb = $('rv-problemes'); if (pb) pb.onclick = () => { fermerFiche(); if (typeof ouvrirProblemes === 'function') ouvrirProblemes(); };
  if (typeof lierBullesDoc === 'function') lierBullesDoc(); }
/* Le geste : ⋮ → Exporter → « Le retest corrigé (Excel) », la pilule de la barre du haut : LE RELEVÉ d'abord. Rien ne
   s'enregistre ici. */
function exporterRetestCorrige() { const V = verite(); if (!V.length) { dire('Aucun plan ouvert : rien à exporter.', true); return null; }
  RELEVE.ouvert = true; rendreReleve(true);
  const b = $('rv-enregistrer'); if (b) setTimeout(() => { if (b.isConnected) b.focus({ preventScroll: true }); }, 30); return true; }
/* ENREGISTRER L'EXCEL : le bouton plein du relevé (et l'appel direct, pour les batteries) — ce qui part, rien de plus. */
function enregistrerRetestCorrige() { const V = verite(); if (!V.length) { dire('Aucun plan ouvert : rien à exporter.', true); return null; }
  const R = classeurRetestCorrige(V, app.nom, { ouvert: true, volta: voltaDuPlan() }), nom = nomDuRetestCorrige();
  telecharger(new Blob([XLSX.write(R.wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nom);
  const d = new Date(); RELEVE.enregistre = { cle: RELEVE.ouvert ? RELEVE.cle || cleDuReleve() : cleDuReleve(), heure: String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'), nom: nomAscii(nom) };
  // (v86, l'audit F3) le nom du fichier, pas « dans vos Téléchargements » : VOLTA ne sait pas où le navigateur le range
  dire(`Enregistré : ${nomAscii(nom)} — ${R.modifiees ? plurielLie(R.modifiees, 'liaison') + ' modifiée' + (R.modifiees > 1 ? 's' : '') : 'aucune modification'}.`);
  if (RELEVE.ouvert && app.fiche && app.fiche.mode === 'releve') { rendreReleve(); const b = $('rv-enregistrer'); if (b) b.focus({ preventScroll: true }); }
  return R; }
// le relevé ouvert suit le plan : un Ctrl+Z, un geste ailleurs le refont (08-interface appelle `synchroniser` → le contrôle)
// (v86) l'historique du plan ouvert suit de même (08-journal) : le contrôle n'appelle que ceci
function suivreLeReleve() { if (typeof suivreLeJournal === 'function') try { suivreLeJournal(); } catch (_) { }
  if (!RELEVE.ouvert) return; if (!app.fiche || app.fiche.mode !== 'releve') { RELEVE.ouvert = false; return; }
  if (cleDuReleve() !== RELEVE.cle) rendreReleve(); }

/* ---- LE CALIBRE QUE LE FOLIO ÉCRIT (v73, l'ingénieur, n° 6 : « le folio écrit 15 A, la nomenclature commande un
   MS3320-10 ») : le retenu, et — s'il diffère du part number écrit — le calibre du retest, que le dessin écrit dessous
   « (retest 10 A) ». Rend { calibre, retest }. */
function calibresAuFolio(nom) { const calibre = typeof calibreAuFolio === 'function' ? calibreAuFolio(nom) : null; let retest = null;
  try { const F = familleDuPn(pnDuRepere(nom), app.norme); if (F && F.calibre > 0 && calibre > 0 && Math.abs(F.calibre - calibre) > 1e-9) retest = F.calibre; } catch (_) { }
  return { calibre, retest }; }

/* ---- REPRENDRE CE QUE LA FEUILLE « VOLTA » GARDE ---------------------------------------------------------------------
   02-lecture lit la feuille (`lireTexte` rend `volta`, et remet déjà sur chaque liaison ses contacts choisis à la main) ;
   ce qui vit au contrat — les profils de charge, les désignations, les sexes, les raccords — se reprend ici. Quel que
   soit le chemin du fichier (Ctrl+O, un dépôt sur la table, la bibliothèque), la lecture le retient (`retenirVolta`) et le
   premier rendu du plan qu'il accompagne le reprend. Les hypothèses du fichier ne remplacent jamais les vôtres sans vous :
   quand elles diffèrent, le mot qui passe le dit et offre « Reprendre ses hypothèses ». */
const VOLTA = { attente: null };
const empreinteVolta = L => (L || []).filter(liaisonComplete).map(cleVolta).sort().join('\n');
function retenirVolta(volta, liaisons, journaux) { if (!volta && !(journaux && journaux.length)) return;
  VOLTA.attente = { volta: volta || null, journaux: journaux || [], n: (liaisons || []).filter(liaisonComplete).length, cle: empreinteVolta(liaisons), t: Date.now() }; }
function reprendreVoltaEnAttente() { const A = VOLTA.attente; if (!A || typeof verite !== 'function') return;
  if (Date.now() - A.t > 30 * 60 * 1000) { VOLTA.attente = null; return; }
  const V = verite(); if (V.filter(liaisonComplete).length !== A.n || empreinteVolta(V) !== A.cle) return;
  VOLTA.attente = null; setTimeout(() => { const dit = reprendreVolta(A.volta, A.journaux); if (dit) dire(dit.msg, false, dit.geste ? { geste: dit.geste, faire: dit.faire } : null); }, 0); }
function reprendreVolta(v, journaux) { const C = app.contrat, repris = [];
  if (v) { const map = (xs, M) => { let n = 0; (xs || []).forEach(([k, x]) => { if (k != null && !M.has(k)) { M.set(k, x); n++; } }); return n; };
    if (!C.charges) C.charges = new Map(); if (!C.sexes) C.sexes = new Map(); if (!C.raccords) C.raccords = new Map();
    const nc = map(v.charges, C.charges), nd = map(v.designations, C.designations), ns = map(v.sexes, C.sexes), nr = map(v.raccords, C.raccords);
    if (nc) repris.push(nc > 1 ? nc + ' profils de charge' : 'le profil de charge');
    if (nd + ns + nr) repris.push('vos choix des fiches'); }
  // les hypothèses : dites, jamais imposées
  let geste = null, faire = null; const H = { ...HYPOTHESES, ...(app.simu || {}) }, F = v && v.hypotheses ? v.hypotheses : null;
  const differe = F ? Object.keys(F).filter(k => k in HYPOTHESES && JSON.stringify(F[k]) !== JSON.stringify(H[k])) : [];
  if (differe.length) { geste = 'Reprendre ses hypothèses'; faire = () => { app.simu = { ...(app.simu || {}), ...Object.fromEntries(differe.map(k => [k, F[k]])) }; if (typeof apresHypotheses === 'function') apresHypotheses(); else redessiner(); dire('Les hypothèses du fichier sont reprises : ' + differe.length + ' réglage' + (differe.length > 1 ? 's' : '') + ' (⋮ → Plus → Hypothèses).'); }; }
  if (repris.length) { if (typeof redessiner === 'function') redessiner(); if (typeof sauver === 'function') sauver(); }
  const morceaux = [repris.length ? majuscule(repris.join(' et ')) + ' repris de la feuille « VOLTA »' : '', (journaux || []).length ? `la feuille ${journaux.map(j => '« ' + j + ' »').join(', ')} est le journal de VOLTA : laissée de côté` : '',
    differe.length ? `ce fichier a été jugé avec d’autres hypothèses (${differe.length})` : ''].filter(Boolean);
  if (!morceaux.length) return null;
  return { msg: 'Installation corrigée par VOLTA · ' + morceaux.join(' ; ') + '.', geste, faire }; }
