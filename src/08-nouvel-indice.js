/* ===========================================================================
   08 — NOUVEL INDICE (v90) : l'indice suivant du fichier d'un plan déjà travaillé.

   Le lecteur : « Comparer deux indices, c'est brillant. » On lui remet l'indice B d'un retest dont il a travaillé
   l'indice A. Il le donne ici (⋮ › « Nouvel indice de ce plan… ») : VOLTA dit CE QUI A CHANGÉ (09-indices,
   `comparerIndices` : ajoutées, retirées, changées, rebranchées, les équipements qui arrivent et ceux qui partent),
   puis « Passer à cet indice » remplace les liaisons du plan par celles du fichier EN GARDANT LE TRAVAIL — les positions
   sur les folios (les retouches), les choix des fiches, les consommations et les profils écrits, le cartouche. Le fichier
   reste la source dure : rien n'y est changé, rien n'est deviné. « Défaire » revient à l'indice d'avant.

   Un fichier qui ne partage aucune liaison avec le plan n'est pas son indice suivant : VOLTA le dit et ne passe pas.
   =========================================================================== */
const INDICES = { recu: null, erreur: '', travail: false, lie: false, max: 120 };
const ficheIndicesOuverte = () => !!(app.fiche && app.fiche.mode === 'indices' && $('fiche') && !$('fiche').hidden);

/* Lire le fichier donné : un retest (Excel ou CSV), rien d'autre ; s'il porte plusieurs harness, celui du plan. */
async function lireIndiceChoisi(f) { const nom = f.name || 'le fichier'; INDICES.recu = null; INDICES.erreur = ''; INDICES.travail = true; rendreIndices();
  const dire = t => { INDICES.travail = false; INDICES.erreur = t; rendreIndices(); };
  let L; try { L = await lireLeFichier(f); } catch (e) { return dire(nom + ' ne s’ouvre pas : ' + String(e && e.message || e)); }
  if (L.erreur) return dire(texteBrut(L.erreur.texte));
  if (!trouverEnteteRetest(L.brutes)) return dire(nom + ' n’a pas les en-têtes d’un retest : VOLTA a besoin au moins de Device1, Pin1, Device2 et Pin2.');
  const r = lireTexte(L.texte); let B = r.toutes || r.liaisons;
  if (!r.liaisons.length) return dire(nom + ' : les en-têtes du retest sont là, mais aucune liaison dessous.');
  const H = new Set(verite().map(l => l.harness).filter(Boolean));
  if (r.harnais && r.harnais.length > 1 && H.size) { B = B.filter(l => H.has(l.harness));
    if (!B.length) return dire(nom + ' ne porte pas le harness de ce plan (' + [...H].join(', ') + ').'); }
  const D = comparerIndices(verite(), B);
  INDICES.travail = false; INDICES.recu = { nom, liaisons: B, D, commun: D.identiques + D.changees.length + D.rebranchees.length }; rendreIndices(); }

/* Une liaison en une ligne : ses deux bouts, le câble porté par la flèche (son type), son folio. */
const boutIndiceHtml = (r, b) => `<span class="in-b"><b>${esc(r)}</b>${b ? `<i>${esc(b)}</i>` : ''}</span>`;
const ligneIndiceHtml = (l, detail) => `<li class="in-l"><span class="in-c">${boutIndiceHtml(l.de, l.borneDe)}<span class="in-f"><em>${esc(l.type || 'câble')}</em></span>${boutIndiceHtml(l.vers, l.borneVers)}</span>`
  + `<span class="in-fo">${l.plan ? 'folio ' + esc(l.plan) : ''}</span>${detail ? `<span class="in-d">${detail}</span>` : ''}</li>`;
const valeurIndice = (champ, v) => champ === 'longueur' && v !== '' ? nombre(v) + ' m' : String(v);
const champIndiceHtml = c => { const a = valeurIndice(c.champ, c.avant), b = valeurIndice(c.champ, c.apres), k = esc(c.champ + (c.de ? ' de ' + c.de : ''));
  return `<span class="in-ch"><small>${k}</small>${a === '' ? `<b>${esc(b)}</b><small>ajouté</small>` : b === '' ? `<s>${esc(a)}</s><small>retiré</small>` : `<s>${esc(a)}</s><span class="in-vers" aria-label="devient"></span><b>${esc(b)}</b>`}</span>`; };
const boutChangeHtml = x => `<span class="in-ch"><small>bout</small><s>${esc(x.avant.repere + (x.avant.borne ? ':' + x.avant.borne : ''))}</s><span class="in-vers" aria-label="devient"></span><b>${esc(x.apres.repere + (x.apres.borne ? ':' + x.apres.borne : ''))}</b></span>`;
function sectionIndice(cle, titre, dit, lignes) { if (!lignes.length) return ''; const vues = lignes.slice(0, INDICES.max), reste = lignes.length - vues.length;
  return `<section class="hy-groupe in-bloc in-${cle}" aria-labelledby="in-t-${cle}"><h3 class="hy-titre" id="in-t-${cle}">${esc(titre)}<span class="in-n">${lignes.length}</span></h3>`
    + (dit ? `<p class="in-dit">${esc(dit)}</p>` : '') + `<ul class="in-liste">${vues.join('')}</ul>${reste > 0 ? `<p class="in-suite">… et ${esc(pluriel(reste, 'autre'))}, comptées de la même façon.</p>` : ''}</section>`; }

function corpsIndices() { const X = INDICES.recu, W = INDICES.travail, D = X && X.D;
  const erreur = INDICES.erreur ? `<p class="sv-erreur" role="alert">${esc(INDICES.erreur)}</p>` : '';
  const choisir = (mot, classe) => `<button type="button" class="btn ${classe}" id="in-choisir"${W ? ' disabled' : ''}>${W ? 'Lecture…' : mot}</button>`;
  let corps;
  if (!X) corps = `<section class="hy-groupe in-bloc" aria-labelledby="in-t-donner"><h3 class="hy-titre" id="in-t-donner">Donner le nouvel indice</h3>`
      + '<p class="sv-dit">Le même fichier, à l’indice suivant (Excel ou CSV). VOLTA le compare au plan ouvert, liaison par liaison : une liaison se reconnaît à ses deux bouts.</p>'
      + `<div class="sv-gestes">${choisir('Choisir le fichier…', 'cuivre')}</div>${erreur}</section>`;
  else { const rien = !D.changees.length && !D.rebranchees.length && !D.ajoutees.length && !D.retirees.length, etranger = !X.commun;
    const E = D.equipements, eq = [E.ajoutes.length ? `<p class="in-eq"><small>${E.ajoutes.length > 1 ? 'Nouveaux' : 'Nouveau'}</small>${E.ajoutes.map(r => `<b>${esc(r)}</b>`).join('')}</p>` : '', E.retires.length ? `<p class="in-eq moins"><small>${E.retires.length > 1 ? 'Disparus' : 'Disparu'}</small>${E.retires.map(r => `<b>${esc(r)}</b>`).join('')}</p>` : ''].join('');
    corps = `<div class="sv-recu in-bilan" id="in-bilan"><p class="sv-recu-t"><b>${esc(X.nom)}</b><span>${esc(pluriel(D.total.apres, 'liaison'))}</span></p>`
      + (etranger ? '<p class="in-phrase">Ce fichier ne partage aucune liaison avec ce plan : ce n’est pas son indice suivant.</p><p class="sv-recu-a">Ouvrez-le comme un nouveau plan (⋮ › Ouvrir un fichier…).</p>'
        : `<p class="in-phrase">${esc(motDeLaComparaison(D))}</p>` + (rien ? '<p class="sv-recu-a">Rien à reprendre : le plan ouvert est déjà à cet indice.</p>'
          : `<p class="sv-recu-a">${esc(pluriel(D.identiques, 'liaison'))} ${D.identiques > 1 ? 'n’ont' : 'n’a'} pas bougé. Passer à cet indice garde votre travail : les positions sur les folios, vos choix, les consommations écrites.</p>`))
      + `<div class="sv-gestes">${!etranger && !rien ? `<button type="button" class="btn cuivre" id="in-passer"${W ? ' disabled' : ''}>Passer à cet indice</button>` : ''}${choisir('Choisir un autre fichier…', etranger || rien ? 'papier' : 'lien')}</div></div>${erreur}`
      + (etranger ? '' : sectionIndice('changees', 'Changées', 'Les mêmes deux bouts ; ce que le fichier dit d’elles a changé.', D.changees.map(c => ligneIndiceHtml(c.apres, c.champs.map(champIndiceHtml).join(''))))
        + sectionIndice('rebranchees', 'Rebranchées', 'Le même câble, un bout posé ailleurs.', D.rebranchees.map(c => ligneIndiceHtml(c.apres, c.bouts.map(boutChangeHtml).join('') + c.champs.map(champIndiceHtml).join(''))))
        + sectionIndice('ajoutees', 'Ajoutées', '', D.ajoutees.map(l => ligneIndiceHtml(l)))
        + sectionIndice('retirees', 'Retirées', '', D.retirees.map(l => ligneIndiceHtml(l)))
        + (eq ? `<section class="hy-groupe in-bloc" aria-labelledby="in-t-eq"><h3 class="hy-titre" id="in-t-eq">Équipements</h3>${eq}</section>` : '')); }
  return tete('Ce plan', 'Nouvel indice')
    + '<p class="note sv-chapeau">Votre fichier a un nouvel indice ? Donnez-le : VOLTA dit ce qui a changé, puis passe dessus sans rien perdre de votre travail.</p>'
    + corps + '<input type="file" id="in-fichier" accept=".xlsx,.xlsm,.xls,.csv,.tsv,.txt" hidden>'; }
function ficheIndices() { const deja = ficheIndicesOuverte(), y = deja ? $('fiche-corps').scrollTop : 0; if (!deja) { INDICES.recu = null; INDICES.erreur = ''; }
  ouvrirFiche({ mode: 'indices', large: true }, corpsIndices(), ''); lierFicheIndices(); if (deja) $('fiche-corps').scrollTop = y; }
function rendreIndices() { if (ficheIndicesOuverte()) ficheIndices(); }
function lierFicheIndices() { if (INDICES.lie) return; INDICES.lie = true; const c = $('fiche-corps');
  c.addEventListener('click', e => { if (!ficheIndicesOuverte()) return; const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'in-choisir') { const f = $('in-fichier'); if (f) { f.value = ''; f.click(); } }
    else if (b.id === 'in-passer') passerALIndice(); });
  c.addEventListener('change', e => { if (!ficheIndicesOuverte() || e.target.id !== 'in-fichier') return; const f = e.target.files && e.target.files[0]; if (f) lireIndiceChoisi(f); }); }

/* PASSER À L'INDICE : les liaisons du fichier remplacent celles du plan ; tout le reste du plan se garde (les retouches,
   les choix, les consommations, le cartouche). Un contact à sertir choisi à la main suit sa liaison quand elle est encore
   là. Le découpage en folios se refait s'il y en avait un. Une photo d'abord : « Défaire » rend l'indice d'avant. */
function passerALIndice() { const X = INDICES.recu; if (!X || !X.D || !X.commun) return; const D = X.D;
  histPush('passage au nouvel indice (' + X.nom + ')');
  D.memes.forEach(([a, b]) => { const retourne = a.de !== b.de || a.borneDe !== b.borneDe;
    if (a.contactDe) b[retourne ? 'contactVers' : 'contactDe'] = a.contactDe; if (a.contactVers) b[retourne ? 'contactDe' : 'contactVers'] = a.contactVers; });
  const L = X.liaisons.map(liaison), decoupe = !!app.nFolios, plan = app.plan;
  app.source = null; app.nFolios = 0; app.contrat.liaisons = L; if (decoupe) { app.source = L; refaireFolios(); }
  const P = plans(); app.plan = P.includes(plan) ? plan : P.length > 1 ? P[0] : '*';
  app.nom = X.nom; app.choisi = null; app.cible = null; app.actif = null; app.base.filtre = ''; app.base.tri = null;
  INDICES.recu = null; fermerFiche(); redessiner(); ajuster(); sauver();
  const mot = motDeLaComparaison(D);
  dire('VOLTA est passé au nouvel indice : ' + mot.charAt(0).toLowerCase() + mot.slice(1) + '. Votre travail est gardé.', false, { geste: 'Défaire', faire: () => { annuler(); } }); }

MENU = (typeof MENU !== 'undefined' && MENU) || { actions: {} }; MENU.actions.indice = surLePlan(() => ficheIndices());
