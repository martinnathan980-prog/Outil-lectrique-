/* ===========================================================================
   08 septies — LA NOMENCLATURE DU CONTRAT : ce qu'il faut commander et sertir
   ---------------------------------------------------------------------------
   Tout ce que les fiches disent connecteur par connecteur, rassemblé en un
   document : les CONTACTS à sertir (référence, fourreau, quantité, où), les
   MODULES de jonction des barrettes, les CONNECTEURS (part numbers), ce qui
   ENGLOBE chaque connecteur (raccord, band-it, manchon, gaine), les CÂBLES
   (type, nombre de câbles, longueur totale à une décimale — celle du retest, sinon
   l'hypothèse). Un résumé en tête, un classeur Excel ou un CSV à
   enregistrer. Rien n'est écrit à la main : le document se relit à chaque
   ouverture depuis le contrat.
   =========================================================================== */
'use strict';

/* Un compte par clé : { cle → { ...champs, n, ou: Set } } — une pièce « à confirmer » pour un de ses emplois le reste pour tous. */
function compteur() { const m = new Map();
  return { plus(cle, champs, ou, n) { const e = m.get(cle) || m.set(cle, { ...champs, n: 0, ou: new Set() }).get(cle); e.n += n == null ? 1 : n; if (ou) e.ou.add(ou); if (champs.confiance === 'à confirmer') e.confiance = 'à confirmer'; },
           lignes() { return [...m.values()].map(e => ({ ...e, ou: [...e.ou].sort(triNaturel) })).sort((a, b) => b.n - a.n || triNaturel(a.reference, b.reference)); } }; }
/* LES DISJONCTEURS (v73, l'ingénieur, n° 6 : « MS3320-10 · connecteur — un disjoncteur n'est pas un connecteur » ; « le
   folio écrit 15 A, la nomenclature commande un MS3320-10 ») : un groupe à eux, une ligne par repère — le part number à
   COMMANDER (celui du calibre que Volta retient : une désignation construite dans la famille du part number, à vérifier
   au catalogue, quand il diffère du retest), le calibre retenu, le retest barré s'il diffère, l'état (le verdict, la table
   unique de 09 bis ; « pas écrit au retest » tant que le retest dit un autre calibre). Une borne de disjoncteur se
   raccorde par une cosse : ni contact à sertir, ni raccord. */
function disjoncteursDeLaNomenclature(V) { return reperesDe(V || verite()).filter(estDisjoncteur).sort(triNaturel).map(r => { const pn = pnDuRepere(r); let d = null; try { d = disjonctionDe(r); } catch (_) { d = null; }
  const F = d && d.famille, cal = d && d.calibre > 0 ? d.calibre : null, calPn = F && F.calibre > 0 ? F.calibre : null, differe = !!(cal && calPn && Math.abs(cal - calPn) > 1e-9);
  const commande = differe && F ? pnAvecCalibre(pn, F, cal) || pn : pn, v = d ? verdictDeCalibre(d) : null;
  const etat = !d || d.sansProfil ? 'profil de charge à écrire' : v ? v.mot + (differe ? ' · pas écrit au retest' : '') : '';
  return { repere: r, reference: commande || '—', pnRetest: differe ? pn : '', calibre: cal, retest: differe ? calPn : null, verdict: v, etat, construit: differe, n: 1, ou: [r] }; }); }
/* UN SEUL COMPTE DE REPÈRES (v73, l'ingénieur : « la garde annonce 77 repères, le récapitulatif 67 ») : celui du menu et du
   récapitulatif (`reperesDuContrat`, 08-interface : sans les masses, les rails, les renvois ; les barrettes à poser
   comprises) — d'un folio, ceux qui y paraissent. Pour des liaisons qui ne sont pas le plan ouvert (l'API du dossier), la
   même règle sur elles. */
function nombreDeReperes(folio, L) { if (!L && typeof reperesDuContrat === 'function') { const R = reperesDuContrat(); return folio == null ? R.length : R.filter(r => (r.plans || []).includes(folio)).length; }
  return reperesDe(L || verite()).filter(r => !estRenvoi(r) && !estMasse(r) && !estRail(r)).length; }
/* La nomenclature : relue depuis le contrat, les normes et les choix (références, sexes, raccords). */
function nomenclatureDuContrat() { const V = verite(), H = app.simu || HYPOTHESES, contacts = compteur(), modules = compteur(), connecteurs = compteur(), habits = compteur(), cables = compteur();
  // le contact écrit à la main à un bout (le récapitulatif ou la fiche : `contactMain`) passe devant celui du plan ;
  // un contact « à confirmer » (une référence que la recherche R1 n'a pas pu vérifier) le reste dans la nomenclature
  const force = (x, r) => { const l = x.f && x.f.l, k = l ? contactMain(l, r.split(' ')[0], x.borne) : ''; return k ? { ...x, sertir: { reference: k, accessoire: '' } } : x; };
  const sertir = (xs, ou) => nomenclatureDe(xs.map(x => force(x, ou))).forEach(x => contacts.plus(x.reference + '|' + x.accessoire, { reference: x.reference, accessoire: x.accessoire, confiance: x.confiance, outillage: x.outillage }, ou, x.n));
  /* Le raccord entre par sa désignation construite (classe du connecteur, taille, chambre, code d'entrée) quand elle est
     entière, sinon par la partie EN 3660 du style ; la note dit le statut de la ligne (sauf « vérifié »), la chambre quand
     elle n'est pas choisie (A par défaut, ou l'hypothèse de la simulation) et le conseil de chambre, la classe lue, la
     masse (table Masses des raccords) et le couple de pose ; la cheminée EN 4165, une par module câblé ; la bande par sa
     référence, l'E0805 d'atelier en note ; le tyrap (raccord à collier, ou cheminée sans étanchéité) ; le manchon,
     précollé ou à coller. `modules` : les modules câblés du connecteur (le nombre de cheminées). */
  const habiller = (cle, fils, pn, ou, ref, modules) => { if (!fils.length) return; const h = habillage(app.norme, fils, app.contrat.raccords.get(cle), pn, ref, H);
    const R = h.reference, M = h.manchonRef, G = h.gaine, B = h.collier, T = h.tyrap;
    // un « tyrap » est un raccord à collier (style A) : sa ligne quand la table l'a, puis le tyrap lui-même
    if (h.raccord !== 'aucun' && (h.raccord !== 'tyrap' || R)) { const des = h.designation || (R ? R.norme : ''), notes = [];
      if (!R) notes.push('référence à venir'); else if (h.statut !== 'vérifié') notes.push(h.statut);
      if (R && !h.designation && h.manquants.length && h.raccord !== 'tyrap') notes.push(h.manquants[0]);
      // une désignation construite sur une clause que R3 n'a pas lue (-005, -017/-018, -025 à -027) : un modèle, à commander avec ses suffixes confirmés
      if (h.designation && h.manquants.some(m => /est un modèle/.test(m))) notes.push('modèle : suffixes à confirmer');
      if (h.designation && h.chambre && h.chambre.source !== 'choix') notes.push('chambre ' + h.longueur + (h.chambre.source === 'défaut' ? ' par défaut' : ' (hypothèse de la simulation)'));
      if (h.chambreConseil) notes.push(h.chambreConseil);
      if (h.designation && h.classe) notes.push(h.classe.lettre ? 'classe ' + h.classe.raccord + ' du connecteur ' + h.classe.lettre : 'classe N par défaut');
      if (h.masse && h.masse.masse != null) notes.push(nombre(h.masse.masse) + ' g');
      if (h.couple != null) notes.push('couple ' + nombre(h.couple) + ' N·m');
      const quoi = h.raccord === 'cheminée' ? 'cheminée (une par module câblé)' : 'raccord ' + (h.raccord === 'tyrap' ? 'à collier' : h.raccord) + (h.entree ? ', entrée ' + h.entree.code : '');
      habits.plus('raccord|' + h.raccord + '|' + des, { quoi, reference: des || h.raccord, note: notes.join(' · ') }, ou, h.raccord === 'cheminée' ? Math.max(1, modules || 0) : 1); }
    if (h.raccord === 'tyrap' || T) habits.plus('tyrap|' + (T ? T.reference : '?'), { quoi: 'tyrap', reference: T ? T.reference : 'aucun dans la table', note: T && T.confiance === 'à confirmer' ? 'à confirmer' : '' }, ou, h.raccord === 'cheminée' ? Math.max(1, modules || 0) : 1);
    if (h.bandit) habits.plus('collier|' + (B ? B.reference : '?'), { quoi: 'band-it', reference: B ? B.reference : 'aucun ne va au toron', note: B && B.equivalent ? '≈ ' + B.equivalent.reference : '' }, ou);
    if (h.manchon) habits.plus('manchon|' + (M ? M.designation : '?'), { quoi: 'manchon' + (h.colle === 'précollé' ? ' précollé' : ''), reference: M ? M.designation : 'aucun ne va au toron', note: M ? [M.reference, h.colle && h.colle !== 'précollé' ? h.colle : ''].filter(Boolean).join(' — ') : '' }, ou);
    if (h.choix.gaine) habits.plus('gaine|' + (G ? G.reference : h.choix.gaine), { quoi: 'gaine ' + h.choix.gaine + (G ? ' (' + G.role + ')' : ''), reference: G ? G.reference : 'aucune ne va au toron', note: G ? (G.role === 'surblindage' ? 'Ø int. ' + nombre(G.dint) + ' mm' : 'toron ' + nombre(G.dmin) + '–' + nombre(G.dmax) + ' mm') : '' }, ou); };
  reperesDe(V).forEach(r => { if (estMasse(r) || estRenvoi(r) || estRail(r) || estDisjoncteur(r)) return;
    try {
      if (barretteEnModules(r)) { const Q = planDeBarrette(r).plan; Q.modules.forEach(M => modules.plus(M.reference, { reference: M.reference, famille: nomDeFamille(app.norme, M.module.famille) }, r)); sertir(Q.fils, r); }
      else if (coupureEnModules(r)) { const { besoins: b, plan: Q } = planDeCoupure(r); if (Q.reference) connecteurs.plus(Q.reference, { reference: Q.reference, nature: 'prise de coupure' }, r);
        const am = Q.fils.filter(x => x.f.amont), av = Q.fils.filter(x => !x.f.amont); sertir(am, r + ' fiche'); sertir(av, r + ' embase');
        habiller(r + '|fiche', am.map(x => x.f), b.pn, r + ' fiche', Q.reference); habiller(r + '|embase', av.map(x => x.f), b.pn, r + ' embase', Q.reference); }
      else if (!estBornier(r)) { const b = besoinsDeBarrette(r, V), C = connecteursDe(r, V).filter(c => c.nom), cav = new Map(cavitesDe(r).map(c => [c.nom, c]));
        C.forEach(c => { const k = cav.get(c.nom), ou = r + ' ' + c.nom, fils = c.bornes.flatMap(bo => b.parBorne.get(bo) || []);
          if (c.pn) connecteurs.plus(c.pn, { reference: c.pn, nature: 'connecteur' + (k && k.plan.modules[0] ? ' · ' + k.plan.modules[0].reference : '') }, ou);
          if (k) sertir(k.plan.fils, ou); habiller(r + '|' + c.nom, fils, c.pn, ou, k && k.plan.modules[0] ? k.plan.modules[0].reference : '', k ? new Set(k.plan.fils.map(x => x.module)).size : 0); }); }
    } catch (_) { } });
  // les câbles : un fil compte un, la longueur se cumule à part (celle du retest, sinon l'hypothèse)
  const longueurs = new Map(), reelles = new Map(); V.forEach(l => { if (!liaisonComplete(l) || l.de === l.vers || !l.type) return; const L = l.longueur > 0 ? l.longueur : H.longueur;
    cables.plus(l.type, { reference: l.type, cable: cableDuType(app.norme, l.type) }, null, 1);
    longueurs.set(l.type, (longueurs.get(l.type) || 0) + L); if (l.longueur > 0) reelles.set(l.type, (reelles.get(l.type) || 0) + 1); });
  const lc = cables.lignes().map(c => ({ ...c, longueur: longueurs.get(c.reference) || 0, reelles: reelles.get(c.reference) || 0, masse: c.cable && c.cable.masse != null ? c.cable.masse * (longueurs.get(c.reference) || 0) : null }));
  return { contacts: contacts.lignes(), modules: modules.lignes(), connecteurs: connecteurs.lignes(), disjoncteurs: disjoncteursDeLaNomenclature(V), habits: habits.lignes(), cables: lc,
           fils: V.filter(l => liaisonComplete(l) && l.de !== l.vers).length, longueur: lc.reduce((s, c) => s + c.longueur, 0), masse: lc.reduce((s, c) => s + (c.masse || 0), 0), hypothese: H.longueur }; }

/* ---- le document ---------------------------------------------------------------
   Un document qu'on a envie d'imprimer : en tête, six chiffres posés sur une grille de filets (ce qu'on sertit, ce qu'on
   commande, ce qu'on tire de câble) ; puis une table par famille d'articles, son titre et ce qu'elle compte, les
   références en chasse fixe, les quantités à droite, les repères où elles vont en petit — les quatre premiers, le
   reste au survol. Une note (« à confirmer », un statut, une cote) est un mot ambre précédé d'un point, sous la
   référence ; la table coule avec le document (pas de boîte qui défile dans la boîte). */
const NOMEN_SECTIONS = [['contacts', 'Contacts à sertir'], ['modules', 'Modules de jonction'], ['connecteurs', 'Connecteurs et prises'], ['habits', 'Autour des connecteurs'], ['cables', 'Câbles']];
function ficheNomenclature() { const N = nomenclatureDuContrat(), somme = xs => xs.reduce((s, x) => s + x.n, 0);
  // où va une pièce : les quatre premiers repères, puis « +11 » (la liste entière au survol) ; un repère et la lettre de
  // son connecteur ne se séparent pas en fin de ligne, ni « +11 » du dernier
  const ou = xs => `<span class="no-ou"${xs.length > 4 ? ` data-bulle="${escA(xs.join(', '))}"` : ''}>${esc(xs.slice(0, 4).map(x => x.replace(/ /g, INSECABLE)).join(', '))}${xs.length > 4 ? `${INSECABLE}<i class="no-plus">+${xs.length - 4}</i>` : ''}</span>`;
  const note = t => `<i class="no-note-l">${esc(t)}</i>`, rien = '<span class="no-rien">—</span>';
  const tuile = (v, u, t) => `<div class="no-tuile"><b>${v}${u ? `<small>${INSECABLE}${u}</small>` : ''}</b><span>${t}</span></div>`;
  const resume = `<div class="no-resume">${tuile(somme(N.contacts), '', 'contacts à sertir')}${tuile(somme(N.modules), '', 'modules de jonction')}${tuile(somme(N.connecteurs), '', 'connecteurs et prises')}`
    + `${tuile(N.fils, '', N.fils > 1 ? 'câbles' : 'câble')}${tuile(nombre(Math.round(N.longueur)), 'm', 'de câble')}${N.masse > 0 ? tuile(nombre(Math.round(N.masse / 100) / 10), 'kg', 'de câble (masse)') : ''}</div>`;
  /* une table : son titre et ce qu'elle compte ; les colonnes de chiffres se rangent à droite, leur en-tête avec elles ; une
     colonne que ses lignes ne remplissent pas ne s'écrit pas (DESIGN.md ; l'ingénieur : « la colonne Fourreau est vide de
     haut en bas »). `lignes` : des rangs de cases [html, vide?] */
  const table = (titre, compte, tete, lignes) => { if (!lignes.length) return ''; const garde = tete.map((_, k) => lignes.some(L => !L[k][1]));
    const th = tete.filter((_, k) => garde[k]).map(t => `<th${/^(Qté|Longueur|Masse|Calibre|Retest)$/.test(t) ? ' class="d"' : ''}>${t}</th>`).join('');
    return `<section class="no-section"><h3 class="sous-titre no-st">${titre}<small>${compte}</small></h3><div class="norme-defile no-defile"><table class="norme no-table tableau normal"><thead><tr>${th}</tr></thead><tbody>${lignes.map(L => `<tr>${L.filter((_, k) => garde[k]).map(c => c[0]).join('')}</tr>`).join('')}</tbody></table></div></section>`; };
  const td = (cls, html, vide) => [`<td${cls ? ` class="${cls}"` : ''}>${html}</td>`, !!vide];
  const refs = (xs, mot) => plurielLie(xs.length, mot) + ' · ' + plurielLie(somme(xs), 'pièce');
  // la nature d'un connecteur et l'arrangement que la norme lui donne : le mot, puis la référence dessous en chasse fixe
  const natureHtml = t => { const [n, ...r] = String(t || '').split(' · '); return esc(n) + (r.length ? `<span class="no-arr">${esc(r.join(' · '))}</span>` : ''); };
  // l'état d'un disjoncteur : le verdict à sa couleur (la table unique, 09 bis), « pas écrit au retest » en ambre dessous
  const etatDj = x => x.verdict ? `<span class="no-etat ${x.verdict.etat}" data-bulle="${escA(x.verdict.bulle)}">${esc(x.verdict.mot)}</span>${x.retest ? note('pas écrit au retest') : ''}` : `<span class="no-rien">${esc(x.etat || '—')}</span>`;
  const corps = tete('Le contrat', 'Nomenclature', true) + resume + `<p class="note no-intro">Ce qu’il faut commander et sertir, relu depuis le contrat, les normes et les choix des fiches. Les longueurs sont celles du retest ; sans longueur, l’hypothèse de la simulation (${esc(nombre(N.hypothese))} m par câble).</p>`
    + table('Contacts à sertir', refs(N.contacts, 'référence'), ['Contact', 'Fourreau', 'Qté', 'Où'], N.contacts.map(x => [td('ref', esc(x.reference) + (x.confiance === 'à confirmer' ? note('à confirmer') : '')), td('', x.accessoire ? esc(x.accessoire) : rien, !x.accessoire), td('d', x.n), td('sans', ou(x.ou))]))
    + table('Modules de jonction', refs(N.modules, 'référence'), ['Module', 'Norme', 'Qté', 'Barrettes'], N.modules.map(x => [td('ref', esc(x.reference)), td('sans', esc(x.famille || ''), !x.famille), td('d', x.n), td('sans', ou(x.ou))]))
    + table('Connecteurs et prises', refs(N.connecteurs, 'part number'), ['Part number', 'Nature', 'Qté', 'Repères'], N.connecteurs.map(x => [td('ref', esc(x.reference)), td('sans', natureHtml(x.nature), !x.nature), td('d', x.n), td('sans', ou(x.ou))]))
    + table('Disjoncteurs', plurielLie(N.disjoncteurs.length, 'disjoncteur'), ['Repère', 'Part number à commander', 'Calibre', 'Retest', 'État'], N.disjoncteurs.map(x => [td('ref', esc(x.repere)),
      td('ref', esc(x.reference) + (x.construit ? `<i class="no-note-l no-construit" data-bulle="Le part number du calibre que Volta retient, construit dans la famille du retest : à vérifier au catalogue">construit · à vérifier</i>` : '')),
      td('d', x.calibre ? esc(nombre(x.calibre)) + INSECABLE + 'A' : rien, !x.calibre), td('d', x.retest ? `<s class="no-barre" data-bulle="${escA('Le retest dit ' + x.pnRetest)}">${esc(nombre(x.retest))}${INSECABLE}A</s>` : rien, !x.retest), td('sans no-etat-c', etatDj(x))]))
    + table('Autour des connecteurs', refs(N.habits, 'article'), ['Quoi', 'Référence', 'Qté', 'Où'], N.habits.map(x => [td('sans no-quoi', esc(x.quoi)), td('ref', esc(x.reference) + (x.note ? note(x.note) : '')), td('d', x.n), td('sans', ou(x.ou))]))
    + table('Câbles', plurielLie(N.cables.length, 'type') + ' · ' + nombre(Math.round(N.longueur)) + ' m', ['Type', 'Qté', 'Longueur', 'Masse', 'Base'], N.cables.map(x => [td('ref', esc(x.reference)), td('d', x.n),
      td('d', `${x.reelles < x.n ? `<i class="no-hyp" data-bulle="${escA(pluriel(x.n - x.reelles, 'câble') + ' sans longueur dans le retest : l’hypothèse de la simulation')}">≈</i>` : ''}${esc((Math.round(x.longueur * 10) / 10).toFixed(1).replace('.', ','))} m`),
      td('d', x.masse != null ? esc(nombre(Math.round(x.masse))) + ' g' : rien, x.masse == null), td('sans', x.cable ? esc([x.cable.nature, x.cable.diametre != null ? 'Ø ' + nombre(x.cable.diametre) : '', x.cable.section != null ? nombre(x.cable.section) + ' mm²' : ''].filter(Boolean).join(' · ')) : '<span class="no-ko">inconnu de la base</span>')]));
  // le pied : le classeur Excel, plein (on commande avec) ; le CSV au trait, comme partout ; le suivi en lien
  const pied = '<button class="btn cuivre" id="no-xlsx" data-bulle="Un classeur : une ligne par article, sa section, sa quantité, où il va">Exporter Excel</button><button class="btn papier" id="no-csv">Exporter CSV</button><span class="espace"></span><button class="btn lien" id="no-suivi">Le suivi (barrettes, prises)</button>';
  ouvrirFiche({ mode: 'nomenclature', large: true }, corps, pied);
  $('no-xlsx').onclick = () => exporterNomenclatureExcel(N); $('no-csv').onclick = () => exporterNomenclature(N); $('no-suivi').onclick = exporterSuivi;
  if (typeof lierBullesDoc === 'function') lierBullesDoc();
  // le document prend le clavier : son action pleine (Tab mène au reste, Échap le ferme)
  const b = $('no-xlsx'); if (b) setTimeout(() => { if (b.isConnected && !b.closest('[hidden]')) b.focus({ preventScroll: true }); }, 30); }
/* Les lignes, une par article, avec sa section — pour le CSV et pour le classeur ; la quantité reste un nombre. */
const ENTETES_NOMEN = ['Section', 'Référence', 'Détail', 'Quantité', 'Unité', 'Où'];
function lignesNomenclature(N) { const L = [];
  N.contacts.forEach(x => L.push(['Contacts', x.reference, [x.accessoire, x.confiance === 'à confirmer' ? 'à confirmer' : ''].filter(Boolean).join(' — '), x.n, 'pièce', x.ou.join(', ')]));
  N.modules.forEach(x => L.push(['Modules', x.reference, x.famille || '', x.n, 'pièce', x.ou.join(', ')]));
  N.connecteurs.forEach(x => L.push(['Connecteurs', x.reference, x.nature || '', x.n, 'pièce', x.ou.join(', ')]));
  (N.disjoncteurs || []).forEach(x => L.push(['Disjoncteurs', x.reference, [x.calibre ? 'calibre ' + nombre(x.calibre) + ' A' : '', x.retest ? 'retest ' + x.pnRetest + ' (' + nombre(x.retest) + ' A)' : '', x.etat, x.construit ? 'part number construit, à vérifier au catalogue' : ''].filter(Boolean).join(' — '), 1, 'pièce', x.repere]));
  N.habits.forEach(x => L.push(['Habillage', x.reference, x.quoi + (x.note ? ' — ' + x.note : ''), x.n, 'pièce', x.ou.join(', ')]));
  N.cables.forEach(x => L.push(['Câbles', x.reference, pluriel(x.n, 'câble'), Math.round(x.longueur * 10) / 10, 'm', '']));
  return L; }
const nomDeNomenclature = ext => (app.nom || 'contrat').replace(/\.[^.]+$/, '') + ' — nomenclature.' + ext;
/* Le CSV : une ligne par article, avec sa section, pour tableur. */
function exporterNomenclature(N) { N = N || nomenclatureDuContrat(); const cell = v => { const t = typeof v === 'number' ? nombre(v) : String(v == null ? '' : v); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const L = [ENTETES_NOMEN.join(';'), ...lignesNomenclature(N).map(l => l.map(cell).join(';'))];
  telecharger(new Blob(['\ufeff' + L.join('\n')], { type: 'text/csv;charset=utf-8' }), nomDeNomenclature('csv'));
  dire(pluriel(L.length - 1, 'ligne') + ' de nomenclature enregistrée' + (L.length > 2 ? 's' : '') + ' en CSV.'); }
/* Le classeur Excel (SheetJS, embarqué dans la page) : la même table, l'en-tête filtrable, les colonnes à leur largeur,
   les quantités en nombres (un tableur les somme). */
function exporterNomenclatureExcel(N) { N = N || nomenclatureDuContrat(); const L = lignesNomenclature(N);
  const ws = XLSX.utils.aoa_to_sheet([ENTETES_NOMEN, ...L]);
  ws['!cols'] = ENTETES_NOMEN.map((h, j) => ({ wch: Math.min(60, Math.max(h.length + 2, ...L.map(l => String(l[j] == null ? '' : l[j]).length + 1))) }));
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: L.length, c: ENTETES_NOMEN.length - 1 } }) };
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Nomenclature');
  telecharger(new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nomDeNomenclature('xlsx'));
  dire(pluriel(L.length, 'ligne') + ' de nomenclature enregistrée' + (L.length > 1 ? 's' : '') + ' en Excel.'); }
