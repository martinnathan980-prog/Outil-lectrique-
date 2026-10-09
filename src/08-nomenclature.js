/* ===========================================================================
   08 septies — LA NOMENCLATURE DU CONTRAT : ce qu'il faut commander et sertir
   ---------------------------------------------------------------------------
   Tout ce que les fiches disent connecteur par connecteur, rassemblé en un
   document : les CONTACTS à sertir (référence, fourreau, quantité, où), les
   MODULES de jonction des barrettes, les CONNECTEURS (part numbers), ce qui
   ENGLOBE chaque connecteur (raccord, band-it, manchon, gaine), les CÂBLES
   (type, nombre de fils, longueur totale — celle du retest, sinon
   l'hypothèse). Un résumé en tête, un CSV à enregistrer. Rien n'est écrit à
   la main : le document se relit à chaque ouverture depuis le contrat.
   =========================================================================== */
'use strict';

/* Un compte par clé : { cle → { ...champs, n, ou: Set } } — une pièce « à confirmer » pour un de ses emplois le reste pour tous. */
function compteur() { const m = new Map();
  return { plus(cle, champs, ou, n) { const e = m.get(cle) || m.set(cle, { ...champs, n: 0, ou: new Set() }).get(cle); e.n += n == null ? 1 : n; if (ou) e.ou.add(ou); if (champs.confiance === 'à confirmer') e.confiance = 'à confirmer'; },
           lignes() { return [...m.values()].map(e => ({ ...e, ou: [...e.ou].sort(triNaturel) })).sort((a, b) => b.n - a.n || triNaturel(a.reference, b.reference)); } }; }
/* La nomenclature : relue depuis le contrat, les normes et les choix (références, sexes, raccords). */
function nomenclatureDuContrat() { const V = verite(), H = app.simu || HYPOTHESES, contacts = compteur(), modules = compteur(), connecteurs = compteur(), habits = compteur(), cables = compteur();
  // un contact « à confirmer » (une référence que la recherche R1 n'a pas pu vérifier) le reste dans la nomenclature
  const sertir = (xs, ou) => nomenclatureDe(xs).forEach(x => contacts.plus(x.reference + '|' + x.accessoire, { reference: x.reference, accessoire: x.accessoire, confiance: x.confiance, outillage: x.outillage }, ou, x.n));
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
  reperesDe(V).forEach(r => { if (estMasse(r) || estRenvoi(r) || estRail(r)) return;
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
  return { contacts: contacts.lignes(), modules: modules.lignes(), connecteurs: connecteurs.lignes(), habits: habits.lignes(), cables: lc,
           fils: V.filter(l => liaisonComplete(l) && l.de !== l.vers).length, longueur: lc.reduce((s, c) => s + c.longueur, 0), masse: lc.reduce((s, c) => s + (c.masse || 0), 0), hypothese: H.longueur }; }

/* ---- le document --------------------------------------------------------------- */
const NOMEN_SECTIONS = [['contacts', 'Contacts à sertir'], ['modules', 'Modules de jonction'], ['connecteurs', 'Connecteurs et prises'], ['habits', 'Autour des connecteurs'], ['cables', 'Câbles']];
function ficheNomenclature() { const N = nomenclatureDuContrat(), ou = xs => xs.length > 4 ? xs.slice(0, 4).join(', ') + ' … (' + xs.length + ')' : xs.join(', ');
  const tuile = (v, t) => `<div class="no-tuile"><b>${v}</b><span>${t}</span></div>`;
  const resume = `<div class="no-resume">${tuile(N.contacts.reduce((s, x) => s + x.n, 0), 'contacts à sertir')}${tuile(N.modules.reduce((s, x) => s + x.n, 0), 'modules de jonction')}${tuile(N.connecteurs.reduce((s, x) => s + x.n, 0), 'connecteurs et prises')}${tuile(N.fils, 'fils')}${tuile(nombre(Math.round(N.longueur)) + '\u00a0m', 'de câble')}${N.masse > 0 ? tuile(nombre(Math.round(N.masse / 100) / 10) + '\u00a0kg', 'de câble (masse)') : ''}</div>`;
  // les colonnes de chiffres se rangent à droite, leur en-tête avec elles
  const table = (titre, tete, lignes) => lignes.length ? `<h3 class="sous-titre">${titre}</h3><div class="norme-defile"><table class="norme no-table"><thead><tr>${tete.map(t => `<th${/^(Qté|Fils|Longueur|Masse)$/.test(t) ? ' class="d"' : ''}>${t}</th>`).join('')}</tr></thead><tbody>${lignes}</tbody></table></div>` : '';
  const corps = tete('Le contrat', 'Nomenclature', true) + `<p class="note">Ce qu’il faut commander et sertir, relu depuis le contrat, les normes et les choix des fiches. Les longueurs sont celles du retest\u00a0; sans longueur, l’hypothèse de la simulation (${esc(nombre(N.hypothese))}\u00a0m par fil).</p>` + resume
    + table('Contacts à sertir', ['Contact', 'Fourreau', 'Qté', 'Où'], N.contacts.map(x => `<tr><td class="ref">${esc(x.reference)}${x.confiance === 'à confirmer' ? ' <i class="fi-avenir">à confirmer</i>' : ''}</td><td>${esc(x.accessoire || '—')}</td><td class="d">${x.n}</td><td class="sans">${esc(ou(x.ou))}</td></tr>`).join(''))
    + table('Modules de jonction', ['Module', 'Norme', 'Qté', 'Barrettes'], N.modules.map(x => `<tr><td class="ref">${esc(x.reference)}</td><td class="sans">${esc(x.famille || '')}</td><td class="d">${x.n}</td><td class="sans">${esc(ou(x.ou))}</td></tr>`).join(''))
    + table('Connecteurs et prises', ['Part number', 'Nature', 'Qté', 'Repères'], N.connecteurs.map(x => `<tr><td class="ref">${esc(x.reference)}</td><td class="sans">${esc(x.nature)}</td><td class="d">${x.n}</td><td class="sans">${esc(ou(x.ou))}</td></tr>`).join(''))
    + table('Autour des connecteurs', ['Quoi', 'Référence', 'Qté', 'Où'], N.habits.map(x => `<tr><td class="sans">${esc(x.quoi)}</td><td class="ref">${esc(x.reference)}${x.note ? ` <i class="fi-avenir">${esc(x.note)}</i>` : ''}</td><td class="d">${x.n}</td><td class="sans">${esc(ou(x.ou))}</td></tr>`).join(''))
    + table('Câbles', ['Type', 'Fils', 'Longueur', 'Masse', 'Base'], N.cables.map(x => `<tr><td class="ref">${esc(x.reference)}</td><td class="d">${x.n}</td><td class="d">${esc(nombre(Math.round(x.longueur * 10) / 10))} m${x.reelles < x.n ? ` <i title="${x.n - x.reelles} fil(s) sans longueur : l’hypothèse">~</i>` : ''}</td><td class="d">${x.masse != null ? esc(nombre(Math.round(x.masse))) + ' g' : '—'}</td><td class="sans">${x.cable ? esc([x.cable.nature, x.cable.diametre != null ? 'Ø ' + nombre(x.cable.diametre) : '', x.cable.section != null ? nombre(x.cable.section) + ' mm²' : ''].filter(Boolean).join(' · ')) : '<span class="fi-ko">inconnu de la base</span>'}</td></tr>`).join(''));
  const pied = '<button class="btn cuivre" id="no-csv">Enregistrer en CSV</button><span class="espace"></span><button class="btn lien" id="no-suivi">Le suivi (barrettes, prises)</button>';
  ouvrirFiche({ mode: 'nomenclature', large: true }, corps, pied);
  $('no-csv').onclick = () => exporterNomenclature(N); $('no-suivi').onclick = exporterSuivi; }
/* Le CSV : une ligne par article, avec sa section, pour tableur. */
function exporterNomenclature(N) { N = N || nomenclatureDuContrat(); const cell = v => { const t = String(v == null ? '' : v); return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const L = [['Section', 'Référence', 'Détail', 'Quantité', 'Unité', 'Où'].join(';')];
  N.contacts.forEach(x => L.push(['Contacts', x.reference, [x.accessoire, x.confiance === 'à confirmer' ? 'à confirmer' : ''].filter(Boolean).join(' — '), x.n, 'pièce', x.ou.join(', ')].map(cell).join(';')));
  N.modules.forEach(x => L.push(['Modules', x.reference, x.famille, x.n, 'pièce', x.ou.join(', ')].map(cell).join(';')));
  N.connecteurs.forEach(x => L.push(['Connecteurs', x.reference, x.nature, x.n, 'pièce', x.ou.join(', ')].map(cell).join(';')));
  N.habits.forEach(x => L.push(['Habillage', x.reference, x.quoi + (x.note ? ' — ' + x.note : ''), x.n, 'pièce', x.ou.join(', ')].map(cell).join(';')));
  N.cables.forEach(x => L.push(['Câbles', x.reference, x.n + ' fils', nombre(Math.round(x.longueur * 10) / 10), 'm', ''].map(cell).join(';')));
  telecharger(new Blob(['﻿' + L.join('\n')], { type: 'text/csv;charset=utf-8' }), (app.nom || 'contrat').replace(/\.[^.]+$/, '') + ' — nomenclature.csv');
  dire(pluriel(L.length - 1, 'ligne') + ' de nomenclature enregistrée' + (L.length > 2 ? 's' : '') + '.'); }
