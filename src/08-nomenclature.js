/* ===========================================================================
   08 septies — LA LPA DU PLAN (la nomenclature) : ce qu'il faut commander et sertir
   ---------------------------------------------------------------------------
   (v84) Le lecteur l'appelle la LPA, la liste de pré-approvisionnement : c'est
   le nom qu'il lit partout (le document, ses exports, le dossier PDF). Les
   noms du code (`nomenclatureDuContrat`, `ficheNomenclature`) restent : ils
   ne se voient pas. Une prise se dit par ses mots : « partie mobile »,
   « partie fixe » (jamais « fiche / embase »).
   (passe 87) LA LPA EST LA SOMME DES ONGLETS PIÈCES DES FICHES — une seule
   source, les mêmes pièces : les CONTACTS à sertir (un par alvéole prise d'un
   connecteur d'équipement), les OBTURATEURS des contacts libres (« selon la
   zone » tant que l'étanchéité n'est pas dite), les MODULES de jonction et
   leurs RAILS, les CONNECTEURS D'ACCOUPLEMENT (côté harness, à nous : la
   « référence retenue » du Suivi, lue dans la bible ; inconnue, la ligne le
   dit), les PRISES de coupure, ce qui ENGLOBE chaque connecteur (raccord ou
   cheminée, tyrap, band-it, manchon, gaine, bourrage), les CÂBLES (type,
   nombre, longueur totale à une décimale — celle de votre fichier, sinon
   l'hypothèse). Les barrettes que VOLTA ajoute (deux câbles sur une borne) y
   entrent, marquées. Le connecteur d'un équipement vient avec lui (la charte :
   « fourni par le fournisseur ») : il se cite en face de son accouplement,
   pour mémoire, sans quantité. Un résumé en tête, un classeur Excel ou un CSV
   à enregistrer. Rien n'est écrit à la main : le document se relit à chaque
   ouverture depuis le contrat.
   =========================================================================== */
'use strict';

/* Un compte par clé : { cle → { ...champs, n, ou: Set } } — une pièce « à confirmer » pour un de ses emplois le reste pour tous. */
function compteur() { const m = new Map();
  return { plus(cle, champs, ou, n) { const e = m.get(cle) || m.set(cle, { ...champs, n: 0, ou: new Set() }).get(cle); e.n += n == null ? 1 : n; if (ou) e.ou.add(ou); if (champs.confiance === 'à confirmer') e.confiance = 'à confirmer'; },
           lignes() { return [...m.values()].map(e => ({ ...e, ou: [...e.ou].sort(triNaturel) })).sort((a, b) => b.n - a.n || triNaturel(a.reference, b.reference)); } }; }
/* LES PIÈCES D'UN CONNECTEUR D'ÉQUIPEMENT — l'onglet Pièces de sa fiche (08-fiche, `ficheEquipement`) et la LPA : une seule
   source. Le connecteur de l'équipement vient avec lui : il se lit pour mémoire (« fourni avec l'équipement »). À nous :
   · LE CONNECTEUR QUI S'Y ACCOUPLE, côté harness (passe 87, le lecteur : « à commander par nous ») — la référence que le
     Suivi de fabrication appelle « référence retenue » : la partie mobile que la bible donne à ce part number
     (`connecteursInfos`, 09) ; la bible ne la dit pas, la ligne le dit (« manque dans la bible »), sans rien commander
     d'autre ;
   · les contacts à sertir, UN PAR ALVÉOLE PRISE (deux câbles sur une borne, la barrette que VOLTA ajoute les reprend — un
     seul entre dans l'alvéole, le plus gros, le câble à créer de 01 `avecBarrettesAPoser` ; 340AB1 : trois contacts pour
     trois alvéoles, plus quatre) ;
   · ce qu'on monte autour (`piecesFabrication` : raccord ou cheminée, tyrap, bourrage, obturateurs des alvéoles libres).
   `c` : le connecteur (`connecteursDe`) ; `b` : les besoins du repère ; `k` : sa cavité (`cavitesDe`), son plan de
   contacts. Rend le groupe de l'onglet : { titre, ref, sous, lignes }. */
const ACCOUPLEMENT_LPA = 'connecteur d’accouplement';
function piecesDuConnecteur(nom, c, b, k) { const Q = k && k.plan, M = Q && Q.modules[0], fils = c.bornes.flatMap(bo => b.parBorne.get(bo) || []).filter(f => f.l);
  let mobile = ''; try { mobile = (connecteursInfos(nom, verite(), app.bible).find(x => x.nom === c.nom) || {}).mobile || ''; } catch (_) { mobile = ''; }
  const accouplement = { q: 1, ref: mobile, role: ACCOUPLEMENT_LPA, statut: mobile ? '' : c.pn ? 'manque dans la bible' : 'manque : sans référence dans votre fichier', piece: 'accouplement', face: c.pn || '' };
  // le câble qui entre dans l'alvéole : le plus gros (la gauge lue au bout du type, comme 01), le premier à égalité
  const gauge = t => { const m = /(\d{1,2})\s*$/.exec(String(t || '')); return m ? +m[1] : 99; }, alveoles = new Map();
  (Q ? Q.fils : []).forEach(y => { if (!y.contact) return; const a = y.module + '|' + y.contact.lettre, e = alveoles.get(a); if (!e || gauge(y.f.type) < gauge(e.f.type)) alveoles.set(a, y); });
  const parRef = new Map(); alveoles.forEach(y => { const st = sertirAuBout(nom, y.borne, y), ref = motSertir(st); if (!ref) return;
    const e = parRef.get(ref) || parRef.set(ref, { q: 0, ref, role: 'contact à sertir', reference: st.reference, accessoire: st.accessoire || '', confiance: st.confiance || '', outillage: st.outillage || null }).get(ref);
    e.q++; if (st.confiance === 'à confirmer') e.confiance = 'à confirmer'; });
  let autour = []; try { autour = fils.length ? piecesFabrication(habillageDe({ cle: nom + '|' + c.nom, fils, pn: c.pn, ref: M ? M.reference : '', plan: M ? Q : null })) : []; } catch (_) { autour = []; }
  return { titre: 'Connecteur ' + c.nom, ref: c.pn, sous: 'fourni avec l’équipement', lignes: [accouplement, ...[...parRef.values()].sort((x, y) => y.q - x.q), ...autour] }; }
/* Les obturateurs d'une barrette : un par contact libre de ses modules, par taille (table Obturateurs de sa norme) — ceux de
   l'onglet Pièces de sa fiche (08-fiche, `ficheBarrette`, la liste `obts`), comptés de même : la LPA les reprend tels quels. */
function obturateursDeLaBarrette(Q) { const M0 = Q && Q.modules[0]; if (!M0) return [];
  const pris = new Set(Q.fils.map(x => x.module + '|' + x.contact.lettre)), libres = new Map();
  Q.modules.forEach((M, k) => M.module.contacts.forEach(ct => { if (!pris.has(k + '|' + ct.lettre)) libres.set(ct.taille, (libres.get(ct.taille) || 0) + 1); }));
  return [...libres].map(([t, q]) => { let o = null; try { o = obturateurDe(app.norme, M0.module.famille, t); } catch (_) { o = null; }
    return o && o.obturateur ? { q, ref: String(o.obturateur), role: 'obturateur, contact libre taille ' + t, statut: 'selon la zone', piece: 'obturateur' } : null; }).filter(Boolean); }
/* Les barrettes que VOLTA ajoute (deux câbles sur une borne), folio par folio : { nom, plan, sur } — celles du récapitulatif
   (« repère provisoire »), chacune avec sa fiche et son onglet Pièces. */
function barrettesAjoutees() { const out = [];
  (plans().length ? plans() : ['*']).forEach(p => liaisonsDe(p).forEach(l => { if (l.origine === null && l.vers === l.aPoser && estRaccordAPoser(l)) out.push({ nom: l.aPoser, plan: p, sur: l.de + ':' + l.borneDe }); }));
  return out; }
/* LES DISJONCTEURS (v73, l'ingénieur, n° 6 : « MS3320-10 · connecteur — un disjoncteur n'est pas un connecteur » ; « le
   folio écrit 15 A, la nomenclature commande un MS3320-10 ») : un groupe à eux, une ligne par repère — le part number à
   COMMANDER (celui du calibre que VOLTA retient : une désignation construite dans la famille du part number, à vérifier
   au catalogue, quand il diffère du retest), le calibre retenu, le retest barré s'il diffère, l'état (le verdict, la table
   unique de 09 bis ; « pas écrit au retest » tant que le retest dit un autre calibre). Une borne de disjoncteur se
   raccorde par une cosse : ni contact à sertir, ni raccord. */
function disjoncteursDeLaNomenclature(V) { return reperesDe(V || verite()).filter(estDisjoncteur).sort(triNaturel).map(r => { const pn = pnDuRepere(r); let d = null; try { d = disjonctionDe(r); } catch (_) { d = null; }
  const F = d && d.famille, cal = d && d.calibre > 0 ? d.calibre : null, calPn = F && F.calibre > 0 ? F.calibre : null, differe = !!(cal && calPn && Math.abs(cal - calPn) > 1e-9);
  const commande = differe && F ? pnAvecCalibre(pn, F, cal) || pn : pn, v = d ? verdictDeCalibre(d) : null;
  const etat = !d || d.sansProfil ? 'profil de charge à écrire' : v ? v.mot + (differe ? ' · pas écrit dans votre fichier' : '') : '';
  return { repere: r, reference: commande || '—', pnRetest: differe ? pn : '', calibre: cal, retest: differe ? calPn : null, verdict: v, etat, construit: differe, n: 1, ou: [r] }; }); }
/* UN SEUL COMPTE DE REPÈRES (v73, l'ingénieur : « la garde annonce 77 repères, le récapitulatif 67 ») : celui du menu et du
   récapitulatif (`reperesDuContrat`, 08-interface : sans les masses, les rails, les renvois ; les barrettes à poser
   comprises) — d'un folio, ceux qui y paraissent. Pour des liaisons qui ne sont pas le plan ouvert (l'API du dossier), la
   même règle sur elles. */
function nombreDeReperes(folio, L) { if (!L && typeof reperesDuContrat === 'function') { const R = reperesDuContrat(); return folio == null ? R.length : R.filter(r => (r.plans || []).includes(folio)).length; }
  return reperesDe(L || verite()).filter(r => !estRenvoi(r) && !estMasse(r) && !estRail(r)).length; }
/* La LPA : relue depuis le contrat, les normes et les choix (références, sexes, raccords) — la somme des onglets Pièces. */
function nomenclatureDuContrat() { const V = verite(), H = app.simu || HYPOTHESES, contacts = compteur(), obturateurs = compteur(), modules = compteur(), rails = compteur(), connecteurs = compteur(), accouplements = compteur(), habits = compteur(), cables = compteur(), faces = new Map(), suivi = [];
  // les habillages se refont ici : la mémoire des fiches (`HABILLAGES`, 08-fiche) peut dater d'avant le dernier geste
  if (typeof HABILLAGES !== 'undefined') HABILLAGES.clear();
  // le contact écrit à la main à un bout (le récapitulatif ou la fiche : `contactMain`) passe devant celui du plan ;
  // un contact « à confirmer » (une référence que la recherche R1 n'a pas pu vérifier) le reste dans la nomenclature
  const force = (x, r) => { const l = x.f && x.f.l, k = l ? contactMain(l, r.split(' ')[0], x.borne) : ''; return k ? { ...x, sertir: { reference: k, accessoire: '' } } : x; };
  const unContact = (x, ou, n) => contacts.plus(x.reference + '|' + (x.accessoire || ''), { reference: x.reference, accessoire: x.accessoire || '', confiance: x.confiance || '', outillage: x.outillage || null }, ou, n);
  const sertir = (xs, ou) => nomenclatureDe(xs.map(x => force(x, ou))).forEach(x => unContact(x, ou, x.n));
  /* une ligne de l'onglet Pièces (`piecesDuConnecteur`, `piecesFabrication`, `obturateursDeLaBarrette`) dans sa section —
     le connecteur d'accouplement (connu : par sa référence, en face du connecteur fourni qu'il rejoint ; inconnu : par le
     connecteur fourni, pour le dire), les obturateurs à part, le reste autour des connecteurs : son nom, sa référence et son
     état, ceux de la fiche */
  const ranger = (p, ou) => { if (!p || !(p.q > 0)) return;
    if (p.piece === 'accouplement') { const k = p.ref || 'inconnu|' + p.face; accouplements.plus(k, { reference: p.ref, face: p.face, note: p.statut || '' }, ou, p.q);
      if (p.face) (faces.get(k) || faces.set(k, new Set()).get(k)).add(p.face); return; }
    if (!p.ref) return;
    if (p.piece === 'obturateur') obturateurs.plus(p.ref + '|' + (p.statut || ''), { reference: p.ref, pour: String(p.role || '').replace(/^obturateur,\s*/, ''), note: p.statut || '' }, ou, p.q);
    else habits.plus(p.role + '|' + p.ref, { quoi: p.role, reference: p.ref, note: p.statut || '' }, ou, p.q); };
  // une barrette, comme l'onglet Pièces de sa fiche : ses modules, ses contacts, les obturateurs de ses contacts libres
  const barrette = (Q, ou, contactsDe) => { Q.modules.forEach(M => modules.plus(M.reference, { reference: M.reference, famille: nomDeFamille(app.norme, M.module.famille) }, ou)); contactsDe(Q.fils, ou); obturateursDeLaBarrette(Q).forEach(p => ranger(p, ou)); };
  /* (passe 87, le lecteur) LE SUIVI DE FABRICATION, dans la même passe — un seul document : une ligne par pièce posée, ce
     qu'on pose (la référence même que la LPA commande : l'accouplement d'un connecteur, les modules d'une barrette, la prise),
     où (le repère, ses bornes, ses folios, ses routes), ce qu'elle reçoit (ses câbles, sans numéro : la charte) */
  const poser = (repere, nature, reference, fichier, bornes, fils, o) => { const fs = (fils || []).filter(f => f && f.l);
    suivi.push({ repere, nature, reference: reference || '', fichier: fichier || '', bornes: [...new Set((bornes || []).map(String))].sort(triNaturel), cables: fs.length,
      routes: [...new Set(fs.map(f => f.route).filter(Boolean))].sort(triNaturel), plans: [...new Set(fs.map(f => f.l.plan || f.plan).filter(Boolean))].sort(triNaturel), shunts: 0, note: '', ...(o || {}) }); };
  reperesDe(V).forEach(r => { if (estMasse(r) || estRenvoi(r) || estRail(r) || estDisjoncteur(r)) return;
    try {
      if (barretteEnModules(r)) { const P = planDeBarrette(r); barrette(P.plan, r, sertir);
        poser(r, 'barrette', P.plan.modules.map(M => M.reference).join(' + '), P.besoins.pn, P.besoins.bornes, [...P.besoins.parBorne.values()].flat(), { shunts: P.besoins.shunts || 0 });
        // le rail : un par barrette parente (VT3 = 668VT31 + 669VT32), compté à son module 1 (`barretteParente`, 08-modules)
        const BP = barretteParente(r); if (BP.porteur === r) BP.rails.forEach(R => rails.plus(R.reference, { reference: R.reference, famille: nomDeFamille(app.norme, R.famille), note: R.coupe ? 'à couper à la longueur des modules' : R.longueur != null ? nombre(R.longueur) + ' mm' : '' }, BP.parent)); }
      else if (coupureEnModules(r)) { const { besoins: b, plan: Q } = planDeCoupure(r); if (!Q.modules[0]) return;
        connecteurs.plus(Q.reference, { reference: Q.reference, nature: 'prise de coupure' }, r); poser(r, 'prise de coupure', Q.reference, b.pn, b.bornes, [...b.parBorne.values()].flat());
        // de chaque côté, comme l'onglet Pièces de sa fiche : les contacts, puis ce qu'on monte autour (les obturateurs compris)
        [['fiche', 'Partie mobile', Q.fils.filter(x => x.f.amont), ' partie mobile'], ['embase', 'Partie fixe', Q.fils.filter(x => !x.f.amont), ' partie fixe']].forEach(([k, t, xs, cote]) => { if (!xs.length) return; sertir(xs, r + cote);
          let P = []; try { P = piecesFabrication(habillageDe({ cle: r + '|' + k, titre: t, fils: xs.map(x => x.f), pn: b.pn, ref: Q.reference, plan: Q })); } catch (_) { P = []; }
          P.forEach(p => ranger(p, r + cote)); }); }
      else if (!estBornier(r)) { const b = besoinsDeBarrette(r, V), cav = new Map(cavitesDe(r).map(c => [c.nom, c]));
        // le connecteur de l'équipement vient avec lui (il se cite en face de son accouplement) ; à nous, ce que dit l'onglet Pièces
        connecteursDe(r, V).filter(c => c.nom).forEach(c => { const k = cav.get(c.nom), ou = r + ' ' + c.nom, g = piecesDuConnecteur(r, c, b, k), ac = g.lignes.find(p => p.piece === 'accouplement') || {};
          g.lignes.forEach(p => p.role === 'contact à sertir' ? unContact(p, ou, p.q) : ranger(p, ou));
          poser(ou, ACCOUPLEMENT_LPA, ac.ref, c.pn, c.bornes, c.bornes.flatMap(bo => b.parBorne.get(bo) || []), { note: ac.ref ? '' : ac.statut || '' }); }); }
    } catch (_) { } });
  // les barrettes que VOLTA ajoute : ce que dit leur fiche — le module, un contact par câble (celui de la table), les obturateurs
  let ajoutees = 0; barrettesAjoutees().filter(x => barretteEnModules(x.nom)).forEach(x => { try { const bV = besoinsDeBarrette(x.nom, liaisonsDe(x.plan)), Q = remplirModules(bV, app.norme, app.contrat.designations.get(x.nom) || '');
    if (!Q.modules[0]) return; ajoutees++; barrette(Q, x.nom + ' (ajoutée par VOLTA)', (xs, ou) => nomenclatureDe(xs.map(y => ({ ...y, ecrit: '' }))).forEach(y => unContact(y, ou, y.n)));
    poser(x.nom + ' (ajoutée par VOLTA)', 'barrette ajoutée par VOLTA, sur ' + x.sur, Q.modules.map(M => M.reference).join(' + '), '', bV.bornes, [...bV.parBorne.values()].flat(), { shunts: bV.shunts || 0 }); } catch (_) { } });
  // les câbles : un fil compte un, la longueur se cumule à part (celle de votre fichier, sinon l'hypothèse)
  const longueurs = new Map(), reelles = new Map(); V.forEach(l => { if (!liaisonComplete(l) || l.de === l.vers || !l.type) return; const L = l.longueur > 0 ? l.longueur : H.longueur;
    cables.plus(l.type, { reference: l.type, cable: cableDuType(app.norme, l.type) }, null, 1);
    longueurs.set(l.type, (longueurs.get(l.type) || 0) + L); if (l.longueur > 0) reelles.set(l.type, (reelles.get(l.type) || 0) + 1); });
  const lc = cables.lignes().map(c => ({ ...c, longueur: longueurs.get(c.reference) || 0, reelles: reelles.get(c.reference) || 0, masse: c.cable && c.cable.masse != null ? c.cable.masse * (longueurs.get(c.reference) || 0) : null }));
  // les accouplements : les connus d'abord ; un même accouplement en face de plusieurs connecteurs fournis les dit tous
  const acc = accouplements.lignes().map(x => ({ ...x, face: [...(faces.get(x.reference || 'inconnu|' + x.face) || [])].sort(triNaturel).join(', ') })).sort((a, b) => (a.reference ? 0 : 1) - (b.reference ? 0 : 1));
  return { contacts: contacts.lignes(), obturateurs: obturateurs.lignes(), modules: modules.lignes(), rails: rails.lignes(), connecteurs: connecteurs.lignes(), accouplements: acc, disjoncteurs: disjoncteursDeLaNomenclature(V), habits: habits.lignes(), cables: lc,
           suivi: suivi.sort((a, b) => triNaturel(a.repere, b.repere)),
           ajoutees, fils: V.filter(l => liaisonComplete(l) && l.de !== l.vers).length, longueur: lc.reduce((s, c) => s + c.longueur, 0), masse: lc.reduce((s, c) => s + (c.masse || 0), 0), hypothese: H.longueur }; }

/* ---- le document ---------------------------------------------------------------
   Un document qu'on a envie d'imprimer : en tête, six chiffres posés sur une grille de filets (ce qu'on sertit, ce qu'on
   bouche, ce qu'on monte, ce qu'on tire de câble) ; puis une table par famille d'articles, son titre et ce qu'elle compte,
   les références en chasse fixe, les quantités à droite, les repères où elles vont en petit — les quatre premiers, le
   reste au survol. Une note (« à confirmer », « selon la zone ») est un mot ambre précédé d'un point, sous la référence ;
   la table coule avec le document (pas de boîte qui défile dans la boîte). Le connecteur d'un équipement, fourni avec lui,
   se cite en face de son accouplement, pour mémoire : sans quantité à lui. */
const NOMEN_SECTIONS = [['contacts', 'Contacts à sertir'], ['obturateurs', 'Obturateurs des contacts libres'], ['modules', 'Modules de jonction'], ['rails', 'Rails des barrettes'], ['accouplements', 'Connecteurs d’accouplement'], ['connecteurs', 'Prises de coupure'], ['disjoncteurs', 'Disjoncteurs'], ['habits', 'Autour des connecteurs'], ['cables', 'Câbles']];
const titreNomen = cle => (NOMEN_SECTIONS.find(s => s[0] === cle) || [, cle])[1];
/* (passe 87, le lecteur : « le Suivi de fabrication entre dans la LPA ») UN SEUL DOCUMENT, DEUX ONGLETS — « Pièces », ce qu'il
   faut commander ; « Suivi », qui pose quoi et où, avec les mêmes références (celles de la même passe). La barre est celle des
   documents (Normes et bible) : deux onglets de même largeur, ← → passent de l'un à l'autre. `vue` : 'pieces' ou 'suivi'. */
const ONGLETS_LPA = [['pieces', 'Pièces'], ['suivi', 'Suivi']];
function ficheNomenclature(vue) { vue = vue === 'suivi' ? 'suivi' : 'pieces'; const N = nomenclatureDuContrat(), somme = xs => xs.reduce((s, x) => s + x.n, 0);
  // où va une pièce : les quatre premiers repères, puis « +11 » ; un repère et la lettre de son connecteur ne se séparent
  // pas en fin de ligne, ni « +11 » du dernier. « +11 » est un bouton (v74, l'ingénieur v73 : « impossible de voir la liste
  // complète sans exporter ») : un clic déplie la ligne EN PLACE, « moins » la replie
  const brin = xs => xs.map(x => x.replace(/ /g, INSECABLE)).join(', ');
  const ou = xs => `<span class="no-ou">${esc(brin(xs.slice(0, 4)))}${xs.length > 4 ? `<span class="no-reste" hidden>, ${esc(brin(xs.slice(4)))}</span>${INSECABLE}<button type="button" class="no-plus" aria-expanded="false" data-n="${xs.length - 4}" aria-label="${escA('Les ' + (xs.length - 4) + ' autres repères')}" data-bulle="${escA('Déplier : ' + xs.slice(4).join(', '))}">+${xs.length - 4}</button>` : ''}</span>`;
  const note = t => `<i class="no-note-l">${esc(t)}</i>`, rien = '<span class="no-rien">—</span>';
  const tuile = (v, u, t) => `<div class="no-tuile"><b>${v}${u ? `<small>${INSECABLE}${u}</small>` : ''}</b><span>${t}</span></div>`, mot = (n, un, des) => n > 1 ? des : un;
  // (passe 87) six chiffres, ce qu'on commande : les contacts, les obturateurs, les connecteurs (accouplements et prises), les
  // modules, les câbles et leurs mètres — la masse se lit avec les câbles
  const nC = somme(N.contacts), nO = somme(N.obturateurs), nK = somme(N.accouplements) + somme(N.connecteurs), nM = somme(N.modules);
  const resume = `<div class="no-resume">${tuile(nC, '', mot(nC, 'contact à sertir', 'contacts à sertir'))}${tuile(nO, '', mot(nO, 'obturateur', 'obturateurs'))}${tuile(nK, '', 'connecteurs et prises')}`
    + `${tuile(nM, '', mot(nM, 'module de jonction', 'modules de jonction'))}${tuile(N.fils, '', mot(N.fils, 'câble', 'câbles'))}${tuile(nombre(Math.round(N.longueur)), 'm', 'de câble en tout')}</div>`;
  /* une table : son titre et ce qu'elle compte ; les colonnes de chiffres se rangent à droite, leur en-tête avec elles ; une
     colonne que ses lignes ne remplissent pas ne s'écrit pas (DESIGN.md ; l'ingénieur : « la colonne Fourreau est vide de
     haut en bas »). `lignes` : des rangs de cases [html, vide?] */
  // (passe 87) `dit` : ce que toute la table partage, dit une fois sous son titre (jamais la même note à chaque ligne)
  const table = (titre, compte, tete, lignes, dit) => { if (!lignes.length) return ''; const garde = tete.map((_, k) => lignes.some(L => !L[k][1]));
    const th = tete.filter((_, k) => garde[k]).map(t => `<th${/^(Qté|Longueur|Masse|Calibre|Votre fichier|Taille)$/.test(t) ? ' class="d"' : ''}>${t}</th>`).join('');
    return `<section class="no-section"><h3 class="sous-titre no-st">${titre}<small>${compte}</small></h3>${dit ? `<p class="note no-intro">${dit}</p>` : ''}<div class="norme-defile no-defile"><table class="norme no-table tableau normal"><thead><tr>${th}</tr></thead><tbody>${lignes.map(L => `<tr>${L.filter((_, k) => garde[k]).map(c => c[0]).join('')}</tr>`).join('')}</tbody></table></div></section>`; };
  const td = (cls, html, vide) => [`<td${cls ? ` class="${cls}"` : ''}>${html}</td>`, !!vide];
  // une référence qui en offre une autre (« TE 006-0893-20 (200 °C) / 097-0140-20 (260 °C) ») : la seconde dessous ; un mot
  // d'atelier sous une référence (« 28 mm », « à couper… ») en écriture courante — la colonne garde sa largeur
  const refDouble = r => { const [a, ...b] = String(r).split(' / '); return esc(a) + (b.length ? `<span class="no-arr">ou ${esc(b.join(' / '))}</span>` : ''); };
  const dessous = t => t ? `<br><span class="no-ou">${esc(t)}</span>` : '';
  const refs = (xs, mot) => plurielLie(xs.length, mot) + ' · ' + plurielLie(somme(xs), 'pièce');
  // l'état d'un disjoncteur : le verdict à sa couleur (la table unique, 09 bis), « pas écrit dans votre fichier » en ambre dessous
  const etatDj = x => x.verdict ? `<span class="no-etat ${x.verdict.etat}" data-bulle="${escA(x.verdict.bulle)}">${esc(x.verdict.mot)}</span>${x.retest ? note('pas écrit dans votre fichier') : ''}` : `<span class="no-rien">${esc(x.etat || '—')}</span>`;
  const nF = typeof plans === 'function' ? plans().length : 0, nA = N.ajoutees || 0;
  /* (v86, l'audit G6 : « la LPA compte les modules choisis par VOLTA, l'Excel garde ceux du fichier : les deux sorties se
     contredisent sans le dire ») : quand VOLTA retient un module ou un calibre que votre Excel n'a pas encore, une ligne le
     dit — lesquels — et mène au relevé, où ils s'écrivent d'un geste */
  const nonEcrits = propositionsDeLaLPA(), ne = nonEcrits.length;
  // (la référence en chasse fixe, le reste en mots : « E0599-1B202Z pour 667VT2, module 52 » ; « 102CB1 en 15 A »)
  const quoiNonEcrit = p => p.genre === 'calibre' ? `${esc(p.repere)} en ${esc(amperes(p.retenu))}` : `<span class="id">${esc(p.retenu)}</span> pour ${esc(String(p.repere).replace(' · ', ', '))}`;
  const avertir = ne ? `<div class="no-volta" role="note"><p><b>Comptée selon les choix de VOLTA</b>, dont ${ne > 1 ? ne + ' pas encore écrits' : '1 pas encore écrit'} dans votre Excel : ${nonEcrits.map(quoiNonEcrit).join(' · ')}.</p>`
    + `<button type="button" class="btn papier dense" id="no-releve" data-bulle="Le relevé de ce qui part dans l’Excel corrigé : ces choix s’y écrivent d’un geste">Relire ce qui part</button></div>` : '';
  // (passe 87) d'où vient chaque chiffre : la somme des onglets Pièces des fiches — les barrettes que VOLTA ajoute comprises
  const piecesHtml = () => `<p class="note no-intro">Tout ce qu’il faut commander pour monter le plan entier${nF > 1 ? ', ses ' + nF + ' folios' : ''} : la somme des onglets Pièces de ses fiches${nA ? ', ' + (nA > 1 ? 'les ' + nA + ' barrettes que VOLTA ajoute comprises' : 'la barrette que VOLTA ajoute comprise') : ''}. Un câble sans longueur dans votre fichier compte ${esc(nombre(N.hypothese))} m (les hypothèses).</p>` + avertir + resume
    // (v84) le fourreau sous son contact, pas dans une colonne de tirets (la charte : « pas de colonne pleine de tirets »)
    + table(titreNomen('contacts'), refs(N.contacts, 'référence'), ['Contact', 'Qté', 'Où'], N.contacts.map(x => [td('ref', esc(x.reference) + (x.accessoire ? `<span class="no-arr">avec ${esc(x.accessoire)}</span>` : '') + (x.confiance === 'à confirmer' ? note('à confirmer') : '')), td('d', x.n), td('sans', ou(x.ou))]))
    // (passe 87) les obturateurs que demandent les fiches (une alvéole vide, un obturateur) : la taille de contact qu'ils
    // bouchent ; « selon la zone » dit une fois quand toutes l'ont (aucun connecteur dit étanche), sinon sous chacune
    + (() => { const zone = N.obturateurs.length > 0 && N.obturateurs.every(x => /selon la zone/.test(x.note || '')), reste = x => zone ? String(x.note || '').replace(/(,\s*)?selon la zone/, '').trim() : x.note;
      return table(titreNomen('obturateurs'), refs(N.obturateurs, 'référence'), ['Obturateur', 'Taille', 'Qté', 'Où'], N.obturateurs.map(x => [td('ref', refDouble(x.reference) + (reste(x) ? note(reste(x)) : '')), td('d', esc(String(x.pour || '').replace(/^contact libre taille /, '')), !x.pour), td('d', x.n), td('sans', ou(x.ou))]),
        zone ? 'Un par alvéole vide, selon la zone : là où l’étanchéité le demande.' : ''); })()
    + table(titreNomen('modules'), refs(N.modules, 'référence'), ['Module', 'Norme', 'Qté', 'Barrettes'], N.modules.map(x => [td('ref', esc(x.reference)), td('sans', esc(x.famille || ''), !x.famille), td('d', x.n), td('sans', ou(x.ou))]))
    + table(titreNomen('rails'), refs(N.rails, 'référence'), ['Rail', 'Norme', 'Qté', 'Barrettes'], N.rails.map(x => [td('ref', esc(x.reference) + dessous(x.note)), td('sans', esc(x.famille || ''), !x.famille), td('d', x.n), td('sans', ou(x.ou))]))
    /* (passe 87, le lecteur) le connecteur côté harness, qui s'accouple à celui de l'équipement, est à nous : sa référence (la
       « référence retenue » du Suivi), en face du connecteur fourni qu'il rejoint, cité pour mémoire ; inconnue, la ligne le
       dit — rien d'autre ne se commande à sa place */
    + (() => { const inc = N.accouplements.filter(x => !x.reference), nInc = somme(inc);
      return table(titreNomen('accouplements'), plurielLie(somme(N.accouplements), 'pièce') + (nInc ? ' · ' + nInc + ' sans référence' : ''), ['Connecteur', 'Face à', 'Qté', 'Où'],
        N.accouplements.map(x => [td('ref', x.reference ? esc(x.reference) : `<i class="no-note-l" data-bulle="${escA(x.face ? 'La bible ne dit pas la partie mobile de ' + x.face + ' : l’y écrire (colonne Partie mobile), elle se commande ici' : 'Votre fichier ne donne pas la référence de ce connecteur')}">inconnu</i>`), td('ref', x.face ? esc(x.face) : rien, !x.face), td('d', x.n), td('sans', ou(x.ou))]),
        'En face, le connecteur de l’équipement : fourni avec lui, cité pour mémoire.' + (inc.length ? ' « Inconnu » : la bible ne dit pas sa partie mobile — à y écrire.' : '')); })()
    + table(titreNomen('connecteurs'), refs(N.connecteurs, 'référence'), ['Référence', 'Qté', 'Repères'], N.connecteurs.map(x => [td('ref', esc(x.reference)), td('d', x.n), td('sans', ou(x.ou))]))
    + table(titreNomen('disjoncteurs'), plurielLie(N.disjoncteurs.length, 'disjoncteur'), ['Repère', 'Part number à commander', 'Calibre', 'Votre fichier', 'État'], N.disjoncteurs.map(x => [td('ref', esc(x.repere)),
      td('ref', esc(x.reference) + (x.construit ? `<i class="no-note-l no-construit" data-bulle="Le part number du calibre que VOLTA retient, construit dans la famille de celui de votre fichier : à vérifier au catalogue">construit · à vérifier</i>` : '')),
      td('d', x.calibre ? esc(nombre(x.calibre)) + INSECABLE + 'A' : rien, !x.calibre), td('d', x.retest ? `<s class="no-barre" data-bulle="${escA('Votre fichier dit ' + x.pnRetest)}">${esc(nombre(x.retest))}${INSECABLE}A</s>` : rien, !x.retest), td('sans no-etat-c', etatDj(x))]))
    + table(titreNomen('habits'), refs(N.habits, 'article'), ['Quoi', 'Référence', 'Qté', 'Où'], N.habits.map(x => [td('sans no-quoi', esc(x.quoi)), td('ref', esc(x.reference) + (x.note ? note(x.note) : '')), td('d', x.n), td('sans', ou(x.ou))]))
    + table(titreNomen('cables'), plurielLie(N.cables.length, 'type') + ' · ' + nombre(Math.round(N.longueur)) + ' m' + (N.masse > 0 ? ' · ' + nombre(Math.round(N.masse / 100) / 10) + INSECABLE + 'kg' : ''), ['Type', 'Qté', 'Longueur', 'Masse', 'Base'], N.cables.map(x => [td('ref', esc(x.reference)), td('d', x.n),
      td('d', `${x.reelles < x.n ? `<i class="no-hyp" data-bulle="${escA(pluriel(x.n - x.reelles, 'câble') + ' sans longueur dans votre fichier : l’hypothèse de la simulation')}">≈</i>` : ''}${esc((Math.round(x.longueur * 10) / 10).toFixed(1).replace('.', ','))} m`),
      td('d', x.masse != null ? esc(nombre(Math.round(x.masse))) + ' g' : rien, x.masse == null), td('sans', x.cable ? esc([x.cable.nature, x.cable.diametre != null ? 'Ø ' + nombre(x.cable.diametre) : '', x.cable.section != null ? nombre(x.cable.section) + ' mm²' : ''].filter(Boolean).join(' · ')) : '<span class="no-ko">inconnu de la base</span>')]));
  /* LE SUIVI : une table par genre de pièce — le repère, ce qu'on y pose (la référence que l'onglet Pièces commande), ses
     bornes, ses câbles, ses folios et ses routes. Un accouplement inconnu reste « inconnu », comme dans les Pièces. */
  const suiviHtml = () => { const S = N.suivi, nb = xs => xs.length;
    const ici = x => esc(x.repere.replace(/ \(ajoutée par VOLTA\)$/, '')) + (/\(ajoutée par VOLTA\)$/.test(x.repere) ? dessous(x.nature.replace(/^barrette /, '')) : '');
    const ou2 = x => esc(x.plans.join(' · ') || '—') + dessous(x.routes.join(' · '));
    const autre = x => x.fichier && cleNorme(x.fichier) !== cleNorme(x.reference) ? dessous('votre fichier : ' + x.fichier) : '';
    const conn = S.filter(x => x.nature === ACCOUPLEMENT_LPA), bar = S.filter(x => /^barrette/.test(x.nature)), pri = S.filter(x => x.nature === 'prise de coupure'), inc = conn.filter(x => !x.reference).length;
    return `<p class="note no-intro">Ce qu’on pose, et où : une ligne par pièce, avec la référence que commande l’onglet Pièces${nA ? ' — les barrettes que VOLTA ajoute comprises' : ''}.</p>`
      + table(titreNomen('accouplements'), plurielLie(nb(conn), 'connecteur') + (inc ? ' · ' + inc + ' sans référence' : ''), ['Repère', 'On pose', 'Bornes', 'Câbles', 'Folios'],
        conn.map(x => [td('ref', ici(x)), td('ref', (x.reference ? esc(x.reference) : `<i class="no-note-l" data-bulle="${escA(x.note || 'manque dans la bible')}">inconnu</i>`) + (x.fichier ? dessous('face à ' + x.fichier) : '')), td('d', x.bornes.length), td('d', x.cables), td('sans', ou2(x))]),
        'Chacun sur le connecteur de son équipement, fourni avec lui.')
      + table('Barrettes', plurielLie(nb(bar), 'barrette'), ['Repère', 'On pose', 'Bornes', 'Câbles', 'Folios'],
        bar.map(x => [td('ref', ici(x)), td('ref', x.reference.split(' + ').map(esc).join('<br>') + autre(x)), td('d', x.bornes.length), td('d', x.cables), td('sans', ou2(x))]))
      + table(titreNomen('connecteurs'), plurielLie(nb(pri), 'prise'), ['Repère', 'On pose', 'Contacts', 'Câbles', 'Folios'],
        pri.map(x => [td('ref', ici(x)), td('ref', esc(x.reference) + autre(x)), td('d', x.bornes.length), td('d', x.cables), td('sans', ou2(x))])); };
  const nav = `<div class="onglets nm-nav" role="tablist" aria-label="La LPA">${ONGLETS_LPA.map(([k, t]) => `<button type="button" class="onglet" role="tab" data-no-vue="${k}" aria-selected="${vue === k}" tabindex="${vue === k ? 0 : -1}"${vue === k ? ' data-clavier' : ''}>${t}</button>`).join('')}</div>`;
  const corps = nmTitre('Liste de pré-approvisionnement', 'LPA', nav) + (vue === 'suivi' ? suiviHtml() : piecesHtml());
  // le pied : le classeur Excel, plein (on commande avec : la LPA et son Suivi, une feuille chacun) ; le CSV de l'onglet ouvert au trait
  const pied = '<span class="espace"></span>' + (vue === 'suivi' ? '<button class="btn papier" id="no-csv" data-bulle="Le Suivi en CSV : une ligne par pièce posée, sa référence, où elle va">Suivi en CSV</button>'
    : '<button class="btn papier" id="no-csv" data-bulle="La même liste, en CSV : une ligne par article">LPA en CSV</button>')
    + '<button class="btn cuivre" id="no-xlsx" data-bulle="Un classeur : la LPA (une ligne par article, sa quantité, où il va) et le Suivi (une ligne par pièce posée), une feuille chacun">LPA en Excel</button>';
  ouvrirFiche({ mode: 'nomenclature', large: true }, corps, pied);
  $('no-xlsx').onclick = () => exporterNomenclatureExcel(N); $('no-csv').onclick = () => vue === 'suivi' ? exporterSuiviLPA(N) : exporterNomenclature(N);
  // les deux onglets : un clic, ou ← → (le clavier suit l'onglet choisi)
  document.querySelectorAll('#fiche [data-no-vue]').forEach(b => { b.onclick = () => { if (b.dataset.noVue !== vue) ficheNomenclature(b.dataset.noVue); };
    b.onkeydown = e => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); e.stopPropagation(); ficheNomenclature(vue === 'suivi' ? 'pieces' : 'suivi'); }; });
  const rel = $('no-releve'); if (rel) rel.onclick = () => { if (typeof exporterRetestCorrige === 'function') exporterRetestCorrige(); };
  // « +11 » déplie ses repères en place ; « moins » les replie (le clavier reste sur le bouton)
  const fc = $('fiche-corps'); if (fc && !fc.dataset.noPlus) { fc.dataset.noPlus = '1'; fc.addEventListener('click', e => { const b = e.target.closest('.no-plus'); if (!b) return;
    const r = b.parentElement.querySelector('.no-reste'), ouvre = r.hidden; r.hidden = !ouvre; b.setAttribute('aria-expanded', String(ouvre)); b.textContent = ouvre ? 'moins' : '+' + b.dataset.n;
    if (typeof cacherBulle === 'function') cacherBulle(); }); }
  // (v84) le clavier entre par le titre, comme dans tous les documents : posé sur « LPA en Excel », il faisait paraître sa
  // bulle à l'ouverture, par-dessus la liste
  if (typeof lierBullesDoc === 'function') lierBullesDoc(); }
/* Les lignes, une par article, avec sa section — pour le CSV et pour le classeur ; la quantité reste un nombre. Un
   connecteur d'accouplement dit, dans le détail, le connecteur fourni qu'il rejoint (pour mémoire) — ou que sa référence
   manque : la ligne garde sa quantité, sans référence. */
const ENTETES_NOMEN = ['Section', 'Référence', 'Détail', 'Quantité', 'Unité', 'Où'];
function lignesNomenclature(N) { const L = [];
  N.contacts.forEach(x => L.push(['Contacts', x.reference, [x.accessoire, x.confiance === 'à confirmer' ? 'à confirmer' : ''].filter(Boolean).join(' — '), x.n, 'pièce', x.ou.join(', ')]));
  (N.obturateurs || []).forEach(x => L.push(['Obturateurs', x.reference, [x.pour, x.note].filter(Boolean).join(' — '), x.n, 'pièce', x.ou.join(', ')]));
  N.modules.forEach(x => L.push(['Modules', x.reference, x.famille || '', x.n, 'pièce', x.ou.join(', ')]));
  (N.rails || []).forEach(x => L.push(['Rails', x.reference, [x.famille, x.note].filter(Boolean).join(' — '), x.n, 'pièce', x.ou.join(', ')]));
  (N.accouplements || []).forEach(x => L.push(['Accouplements', x.reference || '', x.reference ? 'face à ' + x.face + ', fourni avec l’équipement' : (x.face ? 'accouplement de ' + x.face + ' inconnu' : 'accouplement inconnu') + ' : ' + (x.note || 'manque dans la bible'), x.n, 'pièce', x.ou.join(', ')]));
  N.connecteurs.forEach(x => L.push(['Prises', x.reference, x.nature || '', x.n, 'pièce', x.ou.join(', ')]));
  (N.disjoncteurs || []).forEach(x => L.push(['Disjoncteurs', x.reference, [x.calibre ? 'calibre ' + nombre(x.calibre) + ' A' : '', x.retest ? 'votre fichier : ' + x.pnRetest + ' (' + nombre(x.retest) + ' A)' : '', x.etat, x.construit ? 'part number construit, à vérifier au catalogue' : ''].filter(Boolean).join(' — '), 1, 'pièce', x.repere]));
  N.habits.forEach(x => L.push(['Habillage', x.reference, x.quoi + (x.note ? ' — ' + x.note : ''), x.n, 'pièce', x.ou.join(', ')]));
  N.cables.forEach(x => L.push(['Câbles', x.reference, pluriel(x.n, 'câble'), Math.round(x.longueur * 10) / 10, 'm', '']));
  return L; }
const nomDeNomenclature = ext => (app.nom || 'contrat').replace(/\.[^.]+$/, '') + ' — LPA.' + ext;
// (v86, G6) les choix de VOLTA que votre Excel n'a pas encore (un module, un calibre) : la LPA les compte, elle le dit
const propositionsDeLaLPA = () => { try { return typeof propositionsNonEcrites === 'function' ? propositionsNonEcrites() : []; } catch (_) { return []; } };
// (v86, l'audit F3) le message d'un enregistrement dit le nom du fichier — et, s'il le faut, que la LPA suit des choix pas encore écrits
const motLPA = (ext, n) => { const ne = propositionsDeLaLPA().length; return 'LPA enregistrée : ' + nomAscii(nomDeNomenclature(ext)) + ' — ' + pluriel(n, 'ligne') + (ne ? ', selon les choix de VOLTA (' + (ne > 1 ? ne + ' pas encore écrits' : '1 pas encore écrit') + ' dans votre Excel)' : '') + '.'; };
/* Le CSV : une ligne par article, avec sa section, pour tableur. */
function exporterNomenclature(N) { N = N || nomenclatureDuContrat();
  const L = [ENTETES_NOMEN.join(';'), ...lignesNomenclature(N).map(l => l.map(celluleCsvLPA).join(';'))];
  telecharger(new Blob(['﻿' + L.join('\n')], { type: 'text/csv;charset=utf-8' }), nomDeNomenclature('csv'));
  dire(motLPA('csv', L.length - 1)); }
/* (passe 87) LE SUIVI, une ligne par pièce posée — pour son CSV et pour sa feuille du classeur : le contrat (on rassemble
   les suivis d'un contrat à l'autre), le repère, ce qu'on y pose et sa référence (celle que la LPA commande), celle de
   votre fichier, les bornes, les câbles (combien : ils n'ont plus de numéro), les routes, les folios. */
const ENTETES_SUIVI = ['Contrat', 'Repère', 'Nature', 'Référence posée', 'Votre fichier', 'Bornes utilisées', 'Bornes', 'Shunts', 'Câbles', 'Routes', 'Folios'];
function lignesSuivi(N) { const contrat = (app.nom || 'contrat').replace(/\.[^.]+$/, '');
  return (N.suivi || []).map(x => [contrat, x.repere, x.nature + (x.note ? ' — inconnu : ' + x.note : ''), x.reference, x.fichier, x.bornes.length, x.bornes.join(' '), x.shunts || 0, x.cables, x.routes.join(' '), x.plans.join(' ')]); }
const celluleCsvLPA = v => { const t = typeof v === 'number' ? nombre(v) : String(v == null ? '' : v); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
function exporterSuiviLPA(N) { N = N || nomenclatureDuContrat(); const L = lignesSuivi(N), nom = (typeof nomContrat === 'function' ? nomContrat() : 'contrat') + '-suivi.csv';
  if (!L.length) { dire('Rien à suivre : ni barrette, ni prise, ni connecteur dans ce contrat.'); return; }
  telecharger(new Blob(['﻿' + [ENTETES_SUIVI.join(';'), ...L.map(l => l.map(celluleCsvLPA).join(';'))].join('\n')], { type: 'text/csv;charset=utf-8' }), nom);
  dire('Suivi enregistré : ' + nom + ' — ' + pluriel(L.length, 'ligne') + ', les références de la LPA.'); }
/* Le classeur Excel (SheetJS, embarqué dans la page) : la LPA et son Suivi, une feuille chacun — l'en-tête filtrable, les
   colonnes à leur largeur, les quantités en nombres (un tableur les somme). */
function feuilleLPA(entetes, L) { const ws = XLSX.utils.aoa_to_sheet([entetes, ...L]);
  ws['!cols'] = entetes.map((h, j) => ({ wch: Math.min(60, Math.max(h.length + 2, ...L.map(l => String(l[j] == null ? '' : l[j]).length + 1))) }));
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: L.length, c: entetes.length - 1 } }) }; return ws; }
function exporterNomenclatureExcel(N) { N = N || nomenclatureDuContrat(); const L = lignesNomenclature(N), S = lignesSuivi(N);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, feuilleLPA(ENTETES_NOMEN, L), 'LPA'); if (S.length) XLSX.utils.book_append_sheet(wb, feuilleLPA(ENTETES_SUIVI, S), 'Suivi');
  telecharger(new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nomDeNomenclature('xlsx'));
  dire(motLPA('xlsx', L.length) + (S.length ? ' Le Suivi : ' + pluriel(S.length, 'ligne') + ', sa feuille.' : '')); }
