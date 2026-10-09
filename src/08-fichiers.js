/* ===========================================================================
   08 — « VOS FICHIERS » : ce que l'outil a reçu, ce qu'il attend, ce qu'il en fait
   ---------------------------------------------------------------------------
   Le lecteur : « Partout "Ouvrir un fichier", mais je ne sais même pas quel
   fichier tu attends. Les contrats déjà faits : je ne vois même pas où est la
   base. […] Il faut suivre l'utilisateur, le porter, lui prendre la main. »

   UN SEUL ENDROIT (menu ⋮ → Vos fichiers ; « Comment ça marche » et « Voir ce
   qui est embarqué » sur l'accueil ; « Voir » dans le mot qui signale une
   erreur) pour les cinq entrées de l'outil — le retest, les contrats déjà
   faits, la bible, les normes, les hypothèses. Chaque carte dit :
     · son ÉTAT, en un voyant : reçu et lu (vert), rien (ambre), erreur (rouge) ;
     · ce qui a été REÇU : le nom, la date, les comptes ;
     · l'ACTION : Remplacer…, Déposer…, Importer…, Régler… ;
     · « CE QUE J'ATTENDS » : le format, TROIS LIGNES D'EXEMPLE, ce qui se passe
       ensuite, l'erreur dite en clair — ouvert d'office quand l'entrée est vide.
   Une carte reçoit aussi un fichier déposé dessus (`data-depot`).

   LES ERREURS ne sont plus un mot de six secondes : elles s'écrivent dans la
   carte et y restent jusqu'au prochain dépôt ; le mot qui passe les signale,
   avec « Voir ». Ce qui est dit (U.md 5.5) : un fichier vide ; des en-têtes
   introuvables (ce que l'outil a lu, ce qu'il lui faut, un modèle) ; une base
   sans Harness (et l'ouvrir comme contrat) ; des feuilles ignorées (en
   liste) ; un fichier qui n'est pas un tableau.

   LE RATTRAPAGE (un tableau sans les en-têtes du retest, 02 `devinerColonnes`)
   ne remplace plus rien sans demander : la carte dit ce qu'elle a compris,
   colonne par colonne, avec un aperçu, et attend « Charger » ; « Corriger »
   laisse attribuer chaque colonne à la main.

   LE COLLAGE (« Coller des lignes ») montre l'ordre des colonnes et un exemple,
   puis, à mesure qu'on colle, l'APERÇU de ce qui est compris ; on AJOUTE au
   contrat ou on le REMPLACE.

   LES CONTRATS DÉJÀ FAITS : un dépôt réussi ramène ici, sur leur carte, avec
   les comptes (« 2 harness · 9 dessins · 261 liaisons ») et « Voir un
   équipement déjà fait » — la fiche du premier équipement du contrat qui a une
   correspondance, la section Déjà fait ouverte.

   Tout reste dans ce navigateur. Les modèles téléchargeables sont écrits ici
   (une seule source) et dans modeles/ (les mêmes lignes).
   =========================================================================== */
'use strict';

/* ---- les modèles : trois lignes d'exemple par entrée (U.md 5.3) ------------------------------------------------ */
const MODELE_RETEST = {
  entetes: ['Harness', 'Device1', 'Pin1', 'PN1', 'Description1', 'Cable TG', 'Cable Tag', 'Route', 'Device2', 'Pin2', 'PN2', 'Description2', 'FWD', 'Cable length (mm)', 'Appareil', 'Date retest'],
  requises: ['Device1', 'Pin1', 'Device2', 'Pin2'],
  lignes: [
    ['332A601150-023-D', '102CB1', '2', 'MS3320-10', 'CB 10A', 'DR20', 'W-012', 'PUISSANCE', '103RL1', 'A1', 'E0836IS35-22SA', 'RELAIS', 'MEE256A7815001A', '2350', 'H160', '08/07/2024'],
    ['332A601150-023-D', '103RL1', 'A2', 'E0836IS35-22SA', 'RELAIS', 'DR22', 'W-013', 'SIGNAL', '104LP1', '1', 'E0644D9S', 'LAMPE', 'MEE256A7815001A', '1800', 'H160', '08/07/2024'],
    ['332A601150-023-D', '101BT1', '1', 'MS3470L14-5P', 'BATTERIE', 'DR16', 'W-011', 'PUISSANCE', '102CB1', '1', 'MS3320-10', 'CB 10A', 'MEE256A7815001A', '900', 'H160', '08/07/2024']] };
const MODELE_BASE = {
  entetes: ['Harness', 'Device1', 'Pin1', 'PN1', 'Cable TG', 'Cable Tag', 'Device2', 'Pin2', 'PN2', 'FWD', 'Appareil', 'Date retest'],
  requises: ['Harness', 'Device1', 'Pin1', 'Device2', 'Pin2'],
  lignes: [
    ['332A601150-031-B', '103RL1', 'A1', 'E0836IS35-22SA', 'DR20', 'W-012', '102CB1', '2', 'MS3320-10', 'MEE256A7815001B', 'H175', '27/10/2025'],
    ['332A601150-031-B', '103RL1', 'A2', 'E0836IS35-22SA', 'DR22', 'W-013', '104LP1', '1', 'E0644D9S', 'MEE256A7815001B', 'H175', '27/10/2025'],
    ['332A601150-023-D', '303RL1', 'A1', 'E0836IS35-22SA', 'DR20', 'W-212', '302CB1', '2', 'MS3320-10', 'MEE256A7815001A', 'H160', '08/07/2024']] };
// le collage, sans en-têtes : l'ordre que le rattrapage prend quand rien ne se devine (02, `lireTexte`)
const MODELE_COLLAGE = {
  entetes: ['Équip.1', 'Borne', 'PN', 'Équip.2', 'Borne', 'PN', 'Fil', 'Type', 'Route', 'Folio'],
  requises: ['Équip.1', 'Équip.2'],
  lignes: [
    ['102CB1', '2', 'MS3320-10', '103RL1', 'A1', 'E0836IS35-22SA', 'W-012', 'DR20', 'PUISSANCE', '1'],
    ['103RL1', 'A2', '', '104LP1', '1', '', 'W-013', 'DR22', 'SIGNAL', '1'],
    ['101BT1', '2', '', '901G', '', '', 'W-018', 'DR16', 'PUISSANCE', '1']] };
const MODELE_BIBLE = {
  entetes: ['Référence', 'Famille', 'Nature', 'Bornes', 'Jauge min', 'Jauge max', 'Intensité', 'Blindage', 'Note', 'Mobile'],
  requises: ['Référence', 'Bornes'],
  lignes: [
    ['ASNE0500-02', 'ASNE0500', 'jonction', '2', '26', '20', '7,5', 'non', 'exemple — remplace par ta bible', ''],
    ['ASNE0500-04', 'ASNE0500', 'jonction', '4', '26', '20', '7,5', 'non', 'exemple', ''],
    ['EN3646A6083AAN', 'EN3646', 'coupure', '3', '26', '20', '7,5', 'non', 'prise de coupure 3 contacts', 'fiche']] };
// une norme : une ligne de titre libre, la ligne d'en-têtes de la table, puis une ligne par entrée (la table Réseau)
const MODELE_NORME = {
  titre: 'Réseau — chute admise (règle du programme, indice C)',
  entetes: ['Tension', 'Nature', 'Chute max', 'Chute max intermittent', 'Chute max en %', 'Note'],
  requises: ['Tension', 'Chute max'],
  lignes: [['28', 'continu', '1', '2', '3,6', ''], ['115', 'alternatif phase-neutre 400 Hz', '4', '8', '3,5', ''], ['200', 'alternatif entre phases 400 Hz', '7', '14', '3,5', '']] };
const MODELES = { retest: [MODELE_RETEST, 'modele-retest.csv'], base: [MODELE_BASE, 'modele-contrats-deja-faits.csv'], bible: [MODELE_BIBLE, 'modele-bible.csv'] };
/* Un modèle en CSV (séparateur « ; », comme l'Excel français l'écrit) : les en-têtes, les trois lignes. */
const csvDuModele = M => [M.entetes, ...M.lignes].map(r => r.join(';')).join('\r\n') + '\r\n';
function telechargerModele(entree) { const [M, nom] = MODELES[entree] || MODELES.retest;
  telecharger(new Blob(['\ufeff' + csvDuModele(M)], { type: 'text/csv;charset=utf-8' }), nom);
  dire(nom + ' enregistré : ' + M.entetes.length + ' colonnes, trois lignes d’exemple — remplacez-les par les vôtres.'); }

/* ---- l'état : ce qui a été reçu, les erreurs, ce qui attend une réponse ------------------------------------------ */
/* `retest` : le dernier contrat ouvert (nom, date, comptes) — gardé dans ce navigateur pour que la carte dise encore
   « ouvert hier à 17:22 » ; `erreurs` et `avis` (les feuilles ignorées) : par entrée, jusqu'au prochain dépôt ;
   `attente` : un fichier lu par le rattrapage, qui attend « Charger » ; `base` : un fichier déposé comme base, qu'on peut
   encore ouvrir comme contrat ; `succes` : la base vient d'être déposée (la carte le dit, avec la main qu'on tend) ;
   `volets` : « Ce que j'attends » ouvert ou fermé à la main, par entrée. */
const CLE_FICHIERS = 'atelier.fichiers.v1';
const FICHIERS = { retest: null, erreurs: {}, avis: {}, attente: null, corriger: false, base: null, succes: null, volets: new Map(), lie: false };
try { const o = JSON.parse(localStorage.getItem(CLE_FICHIERS) || 'null'); if (o && o.retest) FICHIERS.retest = o.retest; } catch (_) { }
function memoriserFichiers() { try { localStorage.setItem(CLE_FICHIERS, JSON.stringify({ retest: FICHIERS.retest })); } catch (_) { } }
/* Un contrat vient d'être ouvert : la carte le dit, ses erreurs s'effacent. */
function contratRecu(nom, quoi, avis) { FICHIERS.retest = { nom, t: Date.now(), n: verite().length, folios: plans().length, quoi: quoi || '' };
  delete FICHIERS.erreurs.retest; FICHIERS.avis.retest = avis || null; FICHIERS.attente = null; FICHIERS.corriger = false; memoriserFichiers(); rendreFichiers(); }
function noterErreur(entree, err) { FICHIERS.erreurs[entree] = { ...err, t: Date.now() }; if (entree === 'retest') FICHIERS.attente = null; rendreFichiers(); }
function effacerErreur(entree) { delete FICHIERS.erreurs[entree]; delete FICHIERS.avis[entree]; }
// le texte d'une erreur (du HTML : des identifiants en chasse fixe) pour le mot qui passe
const texteBrut = h => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent; };
/* Une erreur d'import : écrite dans sa carte, signalée par le mot qui passe (le texte court s'il y en a un). */
function echecImport(entree, err, court) { court = court || texteBrut(err.texte); noterErreur(entree, { ...err, court }); signaler(court, entree, true); }
/* Le mot qui passe SIGNALE ; la carte DIT. « Voir » ouvre la carte. Il reste le temps de le lire, et tant qu'on le survole. */
function signaler(msg, entree, erreur) { dire(msg, erreur); const t = $('toast'); if (!entree) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'toast-voir'; b.textContent = 'Voir';
  b.addEventListener('click', () => { t.classList.remove('on', 'action'); ficheFichiers(entree); });
  t.appendChild(b); t.classList.add('action'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on', 'action'), 9000); }

/* ---- les mots ---------------------------------------------------------------------------------------------------- */
const deux = n => String(n).padStart(2, '0');
function quand(t) { if (!t) return ''; const d = new Date(t), h = deux(d.getHours()) + ':' + deux(d.getMinutes()), auj = new Date(), hier = new Date(auj.getTime() - 864e5);
  if (d.toDateString() === auj.toDateString()) return 'aujourd’hui à ' + h;
  if (d.toDateString() === hier.toDateString()) return 'hier à ' + h;
  return 'le ' + deux(d.getDate()) + '/' + deux(d.getMonth() + 1) + (d.getFullYear() !== auj.getFullYear() ? '/' + d.getFullYear() : '') + ' à ' + h; }
const POINT = '\u00a0· ';
const lies = xs => xs.filter(Boolean).join(POINT);
const guillemets = s => '«\u00a0' + s + '\u00a0»';
/* Un aperçu : un petit tableau, les colonnes obligatoires à l'encre et soulignées, les autres en retrait. */
function apercuHtml(M, opts) { opts = opts || {}; const req = new Set(M.requises || []), cols = opts.colonnes || M.entetes.map((_, i) => i);
  return `<div class="vf-apercu"${opts.label ? ` aria-label="${escA(opts.label)}"` : ''}><table><thead>${M.titre ? `<tr class="vf-ap-titre"><td colspan="${cols.length}">${esc(M.titre)}</td></tr>` : ''}<tr>${cols.map(i => `<th${req.has(M.entetes[i]) ? ' class="req"' : ''}>${esc(M.entetes[i])}</th>`).join('')}</tr></thead>`
    + `<tbody>${M.lignes.map(r => `<tr>${cols.map(i => `<td${req.has(M.entetes[i]) ? ' class="req"' : ''}>${esc(r[i] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }

/* ---- lire un fichier, et dire ce qui ne va pas ------------------------------------------------------------------ */
/* Un fichier → sa lecture (02, `lectureDuFichier` : les feuilles lues ou ignorées) ; ou l'erreur dite en clair : un
   classeur illisible, un fichier qui n'est pas un tableau (une image, un PDF, un classeur renommé), un fichier vide. */
async function lireLeFichier(fichier) { const nom = fichier.name || 'le fichier', type = fichier.type || '', pasUnTableau = { erreur: { texte: `${esc(nom)} n’est pas un tableau (Excel ou CSV).` } };
  if (/^(image|audio|video)\//.test(type) || (/pdf|zip|msword|presentation|wordprocessing/.test(type) && !/sheet|excel/.test(type))) return pasUnTableau;
  let lu; try { lu = await lectureDuFichier(fichier); }
  catch (e) { return { erreur: { texte: `${esc(nom)} ne s’ouvre pas comme un classeur Excel : ${esc(String(e && e.message || e))}. Enregistrez-le en .xlsx ou en .csv, puis redéposez-le.` } }; }
  const texte = lu.texte || '', debut = texte.slice(0, 4000);
  // une archive (un classeur Excel est un zip) : un .csv ou un .txt qui en est un est un classeur renommé ; le reste n'est pas un tableau
  if (/^PK\u0003\u0004/.test(texte)) return /\.(csv|tsv|txt)$/i.test(nom) ? { erreur: { texte: `${esc(nom)} est un classeur Excel enregistré sous un autre nom : renommez-le en .xlsx, puis redéposez-le.` } } : pasUnTableau;
  let bizarres = 0; for (const c of debut) { const k = c.charCodeAt(0); if (k === 0xfffd || (k < 32 && k !== 9 && k !== 10 && k !== 13)) bizarres++; }
  if (debut && (/\u0000/.test(debut) || bizarres / debut.length > 0.02)) return { erreur: { texte: `${esc(nom)} n’est pas un tableau (Excel ou CSV).` } };
  const brutes = texte.split(/\r?\n/), pleines = brutes.filter(l => l.trim() && l.replace(/[\t;,]/g, '').trim());
  if (!pleines.length) return { erreur: { texte: `${esc(nom)} est vide : aucune ligne.` } };
  return { lu, texte, brutes, pleines }; }
/* Ce que l'outil a lu d'un tableau qui n'est pas un retest : la ligne la plus remplie des trente premières (sans doute
   ses en-têtes), ses cellules. */
function ceQueJaiLu(brutes) { let best = null;
  brutes.slice(0, 30).forEach((l, i) => { const cs = cellules(l).filter(Boolean); if (cs.length && (!best || cs.length > best.cs.length)) best = { i, cs }; });
  if (!best) return ''; const cs = best.cs.slice(0, 8).map(c => c.length > 28 ? c.slice(0, 27) + '…' : c);
  return `J’ai lu${best.i ? ', ligne ' + (best.i + 1) : ''} : <span class="id">${cs.map(esc).join('</span>' + POINT + '<span class="id">')}</span>${best.cs.length > 8 ? '…' : ''}.`; }
const IL_ME_FAUT = 'Il me faut au moins <span class="id">Device1</span>, <span class="id">Pin1</span>, <span class="id">Device2</span>, <span class="id">Pin2</span>.';
const feuillesHtml = lu => lu && lu.ignorees && lu.ignorees.length ? lu.ignorees.map(n => guillemets(esc(n))) : [];

/* ---- ouvrir un fichier : le retest, ou ce qu'il est (une bible, une norme, une base) ------------------------------ */
/* Un fichier ouvert ou déposé sur la table : un retest (reconnu à ses en-têtes) devient le contrat ; plusieurs harness :
   la base des contrats déjà faits, et l'on demande lequel ouvrir ; une bible ou une norme vont à leur place ; un
   tableau sans les en-têtes du retest attend « Charger » ; le reste est une erreur dite dans la carte du retest. */
async function ouvrirFichier(fichier) { if (!fichier) return; const nom = fichier.name || 'le fichier';
  dire('Lecture de ' + guillemets(nom) + '…');
  const L = await lireLeFichier(fichier);
  if (L.erreur) { echecImport('retest', L.erreur); return; }
  try {
    if (!trouverEnteteRetest(L.brutes)) { const b = lireBible(L.texte);
      if (b.entrees.length) { adopterBible(b.entrees, nom); effacerErreur('bible'); rendreFichiers(); signaler('Bible : ' + pluriel(b.entrees.length, 'référence') + ' lue' + (b.entrees.length > 1 ? 's' : '') + ' dans ' + guillemets(nom) + ' ; les barrettes suivent.', 'bible'); return; }
      if (normeLue(lireNorme(L.texte))) { await importerNorme(fichier); return; }   // une norme déposée sur la table : reconnue à ses tables
      proposerRattrapage(nom, L); return; }
    const r = lireTexte(L.texte), ig = feuillesHtml(L.lu), avis = ig.length ? { texte: 'Feuilles ignorées (pas les en-têtes du retest) :', liste: ig } : null;
    if (!r.liaisons.length) { echecImport('retest', { texte: `${guillemets(esc(nom))} : les en-têtes du retest sont là (ligne ${r.entete}), mais aucune liaison dessous. Chaque ligne doit nommer au moins <span class="id">Device1</span> et <span class="id">Device2</span>.`, liste: avis ? [avis.texte + ' ' + ig.join(', ')] : [] },
      guillemets(nom) + ' : les en-têtes sont là, mais aucune liaison dessous.'); return; }
    if (r.harnais && r.harnais.length > 1) { adopterReferences(r.liaisons, nom); baseRecue(nom, avis);
      ficheHarnais(r, nom); signaler(pluriel(r.harnais.length, 'harness') + ' dans ' + guillemets(nom) + ' : gardés comme contrats déjà faits — lequel ouvrir sur la table ?', 'base'); return; }
    chargerContrat(r.liaisons, 'ouverture de ' + nom, nom); contratRecu(nom, 'retest', avis);
    const msg = pluriel(r.liaisons.length, 'liaison') + ' — format retest, en-têtes ligne ' + r.entete + (plans().length > 1 ? ' · ' + plans().length + ' folios' : '') + (ig.length ? ' · ' + pluriel(ig.length, 'feuille') + ' ignorée' + (ig.length > 1 ? 's' : '') : '') + '.';
    if (ig.length) signaler(msg, 'retest'); else dire(msg);
  } catch (e) { echecImport('retest', { texte: `${guillemets(esc(nom))} n’a pas pu être lu : ${esc(String(e && e.message || e))}.` }); } }
/* Une base reçue (un dépôt sur sa carte, ou un fichier de plusieurs harness) : la carte le dira, avec ses comptes. */
function baseRecue(nom, avis) { FICHIERS.base = null; effacerErreur('base'); FICHIERS.succes = 'base'; FICHIERS.avis.base = avis || null; rendreFichiers(); }

/* ---- le rattrapage : ce qui est compris, puis « Charger » --------------------------------------------------------- */
/* Les rôles d'une colonne, dans l'ordre du collage sans en-têtes (02, `lireTexte`). */
const ROLES = [['eq1', 'De', 'Device1'], ['b1', 'Borne', 'Pin1'], ['pn1', 'PN', 'PN1'], ['eq2', 'Vers', 'Device2'], ['b2', 'Borne', 'Pin2'], ['pn2', 'PN', 'PN2'], ['cable', 'Fil', 'Cable Tag'], ['type', 'Type', 'Cable TG'], ['route', 'Route', 'Route'], ['plan', 'Folio', 'FWD']];
const ORDRE_LIBRE = { eq1: 0, b1: 1, pn1: 2, eq2: 3, b2: 4, pn2: 5, cable: 6, type: 7, route: 8, plan: 9 };
/* Deviner un tableau comme le rattrapage le fait (02) : la première ligne, si elle ressemble à des en-têtes, nomme les
   colonnes ; sinon l'ordre du collage. */
function devinerTableau(pleines) { const premiere = cellules(pleines[0] || ''); let map = null, debut = 0, entete = null;
  if (ressembleAUnEntete(premiere)) { map = devinerColonnes(premiere); debut = 1; entete = premiere; }
  const devine = !!(map && map.eq1 != null && map.eq2 != null); if (!devine) map = { ...ORDRE_LIBRE };
  return { map, debut, entete, devine, n: Math.max(...pleines.slice(0, 30).map(l => cellules(l).length)) }; }
function lireAvecCarte(pleines, map, debut) { const g = (row, i) => i != null && i !== '' && row[i] != null ? row[i] : '', liaisons = [], rejets = [];
  for (let r = debut; r < pleines.length; r++) { const row = cellules(pleines[r]);
    const l = liaison({ de: g(row, map.eq1), borneDe: g(row, map.b1), pnDe: g(row, map.pn1), vers: g(row, map.eq2), borneVers: g(row, map.b2), pnVers: g(row, map.pn2),
      cable: g(row, map.cable), type: g(row, map.type), route: g(row, map.route), plan: g(row, map.plan) });
    if (liaisonComplete(l)) liaisons.push(l); else rejets.push(r + 1); }
  return { liaisons, rejets }; }
/* « J'ai compris : Equipement → De, Broche → Borne… » : chaque colonne lue, dans l'ordre du fichier. */
function comprisHtml(D) { const parCol = new Map(); ROLES.forEach(([k, mot]) => { const i = D.map[k]; if (i != null && i !== '') parCol.set(+i, mot); });
  return [...parCol].sort((a, b) => a[0] - b[0]).map(([i, mot]) => `<span class="id">${esc(D.entete ? D.entete[i] || 'colonne ' + (i + 1) : 'colonne ' + (i + 1))}</span>\u00a0→ ${mot}`).join(', '); }
function proposerRattrapage(nom, L) { const D = devinerTableau(L.pleines), lu = lireAvecCarte(L.pleines, D.map, D.debut);
  if (!lu.liaisons.length) { echecImport('retest', { texte: `${esc(nom)} : je ne trouve pas les en-têtes du retest dans les 30 premières lignes. ${ceQueJaiLu(L.brutes)} ${IL_ME_FAUT}`, gestes: [['modele-retest', 'Télécharger un modèle']] },
    nom + ' : je ne trouve pas les en-têtes du retest dans les 30 premières lignes.'); return; }
  effacerErreur('retest'); FICHIERS.attente = { nom, pleines: L.pleines, ...D }; FICHIERS.corriger = false;
  ficheFichiers('retest'); signaler(nom + ' n’a pas les en-têtes du retest : voici ce que j’ai compris — rien n’est chargé avant « Charger ».', 'retest'); }
function chargerRattrapage() { const A = FICHIERS.attente; if (!A) return; const lu = lireAvecCarte(A.pleines, A.map, A.debut); if (!lu.liaisons.length) return;
  chargerContrat(lu.liaisons, 'ouverture de ' + A.nom, A.nom); contratRecu(A.nom, 'colonnes devinées');
  dire(pluriel(lu.liaisons.length, 'liaison') + ' chargée' + (lu.liaisons.length > 1 ? 's' : '') + ' de ' + guillemets(A.nom) + (plans().length > 1 ? ' · ' + plans().length + ' folios' : '') + '.'); }
// l'aperçu de ce qui est compris : les premières liaisons, chaque champ à sa place
function apercuLiaisonsHtml(L, max) { const cols = [['de', 'De'], ['borneDe', 'Borne'], ['vers', 'Vers'], ['borneVers', 'Borne'], ['cable', 'Fil'], ['type', 'Type'], ['route', 'Route'], ['plan', 'Folio']].filter(([k], j) => j < 4 || L.some(l => l[k]));
  return `<div class="vf-apercu"><table><thead><tr>${cols.map(([k, t]) => `<th${k === 'de' || k === 'vers' ? ' class="req"' : ''}>${t}</th>`).join('')}</tr></thead><tbody>${L.slice(0, max || 3).map(l => `<tr>${cols.map(([k]) => `<td${k === 'de' || k === 'vers' ? ' class="req"' : ''}>${esc(l[k] == null ? '' : l[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
    + (L.length > (max || 3) ? `<p class="vf-note">… et ${pluriel(L.length - (max || 3), 'autre liaison')}.</p>` : ''); }
function attenteHtml() { const A = FICHIERS.attente; if (!A) return ''; const lu = lireAvecCarte(A.pleines, A.map, A.debut);
  const dit = A.entete && A.devine ? `${esc(A.nom)} n’a pas les en-têtes du retest. J’ai compris : ${comprisHtml(A)}.` : `${esc(A.nom)} n’a pas d’en-têtes que je reconnaisse : je l’ai lu dans l’ordre du collage — ${comprisHtml(A)}.`;
  const choix = FICHIERS.corriger ? `<div class="vf-carte-cols" role="group" aria-label="Le rôle de chaque colonne">${Array.from({ length: A.n }, (_, i) => { const role = ROLES.find(([k]) => A.map[k] !== '' && A.map[k] != null && +A.map[k] === i), ex = cellules(A.pleines[A.debut] || '')[i] || '';
      return `<label class="vf-col"><span class="vf-col-nom">${esc(A.entete ? A.entete[i] || 'colonne ' + (i + 1) : 'colonne ' + (i + 1))}</span><span class="vf-col-ex id">${esc(ex) || '—'}</span><select data-colonne="${i}" aria-label="${escA('Lire la colonne ' + (i + 1) + ' comme')}"><option value="">ignorer</option>${ROLES.map(([k, mot, en]) => `<option value="${k}"${role && role[0] === k ? ' selected' : ''}>${mot} (${en})</option>`).join('')}</select></label>`; }).join('')}</div>` : '';
  return `<div class="vf-boite vf-attente"><p>${dit}</p>${lu.liaisons.length ? apercuLiaisonsHtml(lu.liaisons, 3) : '<p class="vf-note">Avec ces colonnes, aucune ligne ne nomme ses deux bouts.</p>'}${lu.rejets.length ? `<p class="vf-note">${pluriel(lu.rejets.length, 'ligne')} sans ses deux bouts, laissée${lu.rejets.length > 1 ? 's' : ''} de côté.</p>` : ''}${choix}`
    + `<div class="vf-gestes"><button class="btn cuivre" data-vf="charger"${lu.liaisons.length ? '' : ' disabled'}>Charger ${pluriel(lu.liaisons.length, 'liaison')}</button><button class="btn papier" data-vf="corriger" aria-expanded="${FICHIERS.corriger}">Corriger</button><button class="btn lien" data-vf="abandonner">Abandonner</button></div></div>`; }

/* ---- plusieurs harness : lequel ouvrir ? ------------------------------------------------------------------------- */
/* Un fichier à PLUSIEURS HARNESS (un extrait de la base : une machine par harness) : tout est entré dans la base des
   contrats déjà faits ; cette petite fiche demande lequel ouvrir comme contrat — un contrat, c'est un harness —, ou
   aucun. `r` : la lecture (liaisons, harnais). */
function ficheHarnais(r, nom) { const H = r.harnais.map(h => { const L = r.liaisons.filter(l => l.harness === h);
    return { h, n: L.length, dessins: new Set(L.map(l => l.plan).filter(Boolean)).size, appareil: (L.find(l => l.appareil) || {}).appareil || '' }; });
  const corps = tete('Ouvrir ' + guillemets(nom), pluriel(H.length, 'harness') + ' : lequel ouvrir ?', true)
    + `<p class="note">Un contrat, c’est un harness. Les ${H.length} sont gardés comme <b>contrats déjà faits</b> : les fiches diront ce qui a déjà été fait. Celui qu’on ouvre devient le contrat sur la table.</p>`
    + `<ul class="ch-liste" id="choix-harness">${H.map(x => `<li><button class="ch-harness" data-harness="${escA(x.h)}"><b>${esc(x.h)}</b><span>${[pluriel(x.n, 'liaison'), x.dessins ? pluriel(x.dessins, 'dessin') : '', x.appareil].filter(Boolean).map(esc).join(' · ')}</span>${ico('fleche')}</button></li>`).join('')}</ul>`;
  ouvrirFiche({ mode: 'harnais' }, corps, '<button class="btn papier" id="ch-aucun">N’en ouvrir aucun</button><span class="espace"></span><button class="btn lien" id="ch-base">Voir la base</button>');
  $('fiche-corps').querySelectorAll('.ch-harness').forEach(b => b.onclick = () => { const h = b.dataset.harness, L = r.liaisons.filter(l => l.harness === h);
    chargerContrat(L, 'ouverture de ' + h + ' (' + nom + ')', h + ' (' + nom + ')'); contratRecu(h + ' (' + nom + ')', 'un harness de la base');
    dire(h + ' : ' + pluriel(L.length, 'liaison') + (plans().length > 1 ? ' · ' + plans().length + ' folios' : '') + ' — les autres harness restent des contrats déjà faits.'); });
  $('ch-aucun').onclick = () => fermerFiche(true); $('ch-base').onclick = () => ficheFichiers('base'); }

/* ---- coller des lignes : l'ordre, un exemple, l'aperçu, ajouter ou remplacer ------------------------------------- */
/* Ce qu'un texte collé donne : un retest reconnu à ses en-têtes (02, `lireTexte`), sinon le rattrapage (des en-têtes
   devinées, ou l'ordre du collage). Rend { liaisons, rejets, comment (en mots) }. */
function lireCollage(texte) { const brutes = String(texte || '').split(/\r?\n/), pleines = brutes.filter(l => l.trim());
  if (!pleines.length) return { liaisons: [], rejets: [], comment: '' };
  const rt = trouverEnteteRetest(brutes);
  if (rt) { const r = lireTexte(texte), n = brutes.slice(rt.ligne + 1).filter(l => l.trim()).length - ((r.entetes || 1) - 1);   // les lignes sous les en-têtes
    return { liaisons: r.liaisons, rejets: Array.from({ length: Math.max(0, n - r.liaisons.length) }), comment: 'reconnues à leurs en-têtes (le retest, ligne ' + r.entete + ')' }; }
  const D = devinerTableau(pleines), lu = lireAvecCarte(pleines, D.map, D.debut);
  return { ...lu, comment: D.entete && D.devine ? 'colonnes devinées à leurs en-têtes : ' + comprisHtml(D) : 'lues dans l’ordre ci-dessus' }; }
function ficheColler() { const ouvert = verite().length > 0;
  const corps = tete('Sans fichier', 'Coller des lignes')
    + '<p class="note">Quelques lignes copiées d’Excel, ou tapées : <b>une liaison par ligne</b>, les colonnes séparées par une tabulation, <b>;</b> ou <b>,</b>. Avec les en-têtes du retest, elles sont reconnues à leurs noms ; sans en-têtes, dans cet ordre (seuls les deux équipements sont obligatoires) :</p>'
    + `<ol class="co-ordre">${MODELE_COLLAGE.entetes.map((t, i) => `<li${MODELE_COLLAGE.requises.includes(t) ? ' class="req"' : ''}><i>${i + 1}</i>${esc(t)}</li>`).join('')}</ol>`
    + `<div class="co-exemple"><div class="sur">Par exemple</div>${apercuHtml(MODELE_COLLAGE)}<button class="btn lien" id="co-essai">Coller cet exemple</button></div>`
    + '<label class="champ" id="co-champ"><span>Vos lignes</span><textarea id="co-txt" placeholder="102CB1;2;MS3320-10;103RL1;A1;;W-012;DR20;PUISSANCE;1" spellcheck="false" aria-describedby="co-apercu"></textarea></label>'
    + '<section class="co-apercu" id="co-apercu" aria-live="polite"></section>';
  const pied = ouvert ? '<button class="btn cuivre" id="co-ajouter" disabled>Ajouter au contrat</button><button class="btn papier" id="co-remplacer" disabled>Remplacer le contrat</button><span class="espace"></span><button class="btn lien" id="co-fichier">…ou un fichier</button>'
    : '<button class="btn cuivre" id="co-remplacer" disabled>Charger</button><span class="espace"></span><button class="btn lien" id="co-fichier">…ou un fichier</button>';
  ouvrirFiche({ mode: 'coller', large: true }, corps, pied);
  const txt = $('co-txt'); let lu = { liaisons: [], rejets: [] }, t = 0;
  const voir = () => { lu = lireCollage(txt.value); const n = lu.liaisons.length, vide = !txt.value.trim(), box = $('co-apercu');
    box.innerHTML = vide ? '' : n ? `<div class="sur">Ce que je comprends</div><p class="co-dit"><b>${pluriel(n, 'liaison')}</b>, ${lu.comment}${lu.rejets.length ? ` · <span class="co-rejet">${pluriel(lu.rejets.length, 'ligne')} sans ses deux bouts, laissée${lu.rejets.length > 1 ? 's' : ''} de côté</span>` : ''}.</p>${apercuLiaisonsHtml(lu.liaisons, 4)}`
      : `<div class="vf-boite vf-erreur"><p>Aucune liaison reconnue : chaque ligne doit nommer ses deux équipements, dans l’ordre ci-dessus (ou sous les en-têtes du retest). Vérifiez le séparateur.</p></div>`;
    $('co-champ').classList.toggle('erreur', !vide && !n); txt.setAttribute('aria-invalid', String(!vide && !n));
    ['co-ajouter', 'co-remplacer'].forEach(id => { const b = $(id); if (b) b.disabled = !n; });
    if ($('co-ajouter')) $('co-ajouter').textContent = n ? 'Ajouter ' + pluriel(n, 'liaison') + ' au contrat' : 'Ajouter au contrat'; };
  txt.addEventListener('input', () => { clearTimeout(t); t = setTimeout(voir, 120); });
  txt.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); voir(); const b = $('co-ajouter') || $('co-remplacer'); if (b && !b.disabled) b.click(); } });
  $('co-essai').onclick = () => { txt.value = MODELE_COLLAGE.lignes.map(r => r.join(';')).join('\n'); voir(); txt.focus(); };
  $('co-remplacer').onclick = () => { if (!lu.liaisons.length) return; const n = lu.liaisons.length;
    chargerContrat(lu.liaisons, 'collage de ' + pluriel(n, 'liaison'), 'Collage'); contratRecu('Collage', 'lignes collées');
    dire(pluriel(n, 'liaison') + ' chargée' + (n > 1 ? 's' : '') + (ouvert ? ' : le contrat d’avant est remplacé (Ctrl+Z le rend).' : '.')); };
  if ($('co-ajouter')) $('co-ajouter').onclick = () => { if (!lu.liaisons.length) return; const n = ajouterAuContrat(lu.liaisons, 'ajout de ' + pluriel(lu.liaisons.length, 'liaison') + ' collée' + (lu.liaisons.length > 1 ? 's' : ''));
    fermerFiche(true); dire(pluriel(n, 'liaison') + ' ajoutée' + (n > 1 ? 's' : '') + ' au contrat · Ctrl+Z pour défaire.'); };
  $('co-fichier').onclick = () => $('fichier').click();
  txt.focus(); }
/* Ajouter des liaisons au contrat ouvert (le collage) : sans folio, elles vont sur le folio affiché quand les folios
   viennent du fichier ; le plan, le contrôle, l'enregistrement suivent ; Ctrl+Z les retire. */
function ajouterAuContrat(L, quoi) { histPush(quoi); const V = verite(), plan = modeFolio() === 'fichier' && app.plan !== '*' ? app.plan : '';
  L.forEach(l => V.push(liaison({ ...l, plan: l.plan || plan }))); apresEdition(); return L.length; }

/* ---- l'exemple ----------------------------------------------------------------------------------------------------- */
/* L'exemple embarqué, avec son profil de charge : à la demande (l'accueil, le menu), jamais d'office. `neuf` : sans
   historique (l'API de contrôle, `atelier.exemple()`, le pose comme si on venait d'ouvrir l'outil). */
function ouvrirExemple(neuf) { chargerContrat(contratExemple(), 'contrat d’exemple', NOM_EXEMPLE); app.contrat.charges = chargesExemple(); rendreControle();
  if (neuf) app.hist = []; synchroniser(); sauver(); }

/* ---- les contrats déjà faits : déposer, puis prendre la main ------------------------------------------------------ */
const choisirBase = () => $('fichier-base').click();
/* Le premier équipement du contrat ouvert que la base connaît (même part number, sinon même code) : ceux du folio
   affiché d'abord, dans l'ordre du contrat. */
function premierDejaFait() { const I = indexReferences(), V = verite(); if (!I || !V.length) return null;
  const ici = app.plan !== '*' ? new Set(liaisonsDuPlan().flatMap(l => [l.de, l.vers])) : null;
  const R = reperesDe(V).filter(r => !estMasse(r) && !estRail(r) && !estRenvoi(r)), ordre = ici ? [...R.filter(r => ici.has(r)), ...R.filter(r => !ici.has(r))] : R;
  for (const nom of ordre) { const c = candidatsDeReference(I, V, nom, 1)[0]; if (c) return { nom, c }; } return null; }
function voirDejaFait() { const p = premierDejaFait(); if (!p) { dire('Aucun équipement du contrat ouvert n’a de correspondance dans la base (ni même part number, ni même code).'); return; }
  aller({ type: 'repere', nom: p.nom });
  setTimeout(() => { const box = $('ba-equip'); if (!box) return; const s = typeof ouvrirSection === 'function' ? ouvrirSection(box, 'dejafait') : null;
    if (!s) { const d = box.querySelector('.fi-deja'); if (d) { try { d.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (_) { d.scrollIntoView(); } d.classList.add('vf-montre'); setTimeout(() => d.classList.remove('vf-montre'), 1600); } } }, 80); }

/* ---- « VOS FICHIERS » -------------------------------------------------------------------------------------------- */
const ICONES_VF = {
  retest: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8.5 12.5h7M8.5 16h7"/>',
  base: '<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>',
  bible: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v4H6.5A2.5 2.5 0 0 1 4 20.5M9 7h7M9 10.5h5"/>',
  normes: '<path d="M4 5h16M4 10h16M4 15h10M4 20h7"/><path d="m16 18 2 2 4-4"/>',
  hypotheses: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'
};
const icoVf = k => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONES_VF[k]}</svg>`;
const ENTREES = [['retest', 'Le retest'], ['base', 'Contrats déjà faits'], ['bible', 'Bible'], ['normes', 'Normes'], ['hypotheses', 'Hypothèses']];
/* L'état de chaque entrée : 'ok' (reçu et lu), 'vide' (rien : ambre), 'ko' (une erreur), et la ligne qui le dit. */
function etatsDesFichiers() { const E = {}, V = verite(), err = k => FICHIERS.erreurs[k];
  // le retest : le contrat ouvert, l'exemple, rien
  const n = V.length, exemple = n && app.nom === NOM_EXEMPLE, R = FICHIERS.retest && FICHIERS.retest.nom === app.nom ? FICHIERS.retest : null, P = plans().length;
  E.retest = err('retest') ? { niveau: 'ko', dit: 'le dernier fichier n’a pas pu être ouvert' + (n && !exemple ? ' — ' + (app.nom || 'le contrat') + ' reste ouvert' : '') }
    : FICHIERS.attente ? { niveau: 'att', dit: FICHIERS.attente.nom + ' attend « Charger »' }
    : !n ? { niveau: 'vide', dit: 'rien d’ouvert : l’outil attend votre retest' }
    : exemple ? { niveau: 'vide', dit: 'l’exemple embarqué est ouvert — pas votre contrat' }
    : { niveau: 'ok', dit: lies([app.nom === 'Collage' ? 'des lignes collées' : app.nom || 'sans nom', R ? 'ouvert ' + quand(R.t) : '', pluriel(n, 'liaison'), P > 1 ? pluriel(P, 'folio') : '']) };
  const I = indexReferences(), B = app.references;
  E.base = err('base') ? { niveau: 'ko', dit: 'le dernier dépôt n’a pas pu être lu' + (B ? ' — la base d’avant reste' : '') }
    : !B ? { niveau: 'vide', dit: 'aucune base dans ce navigateur' }
    : { niveau: 'ok', dit: lies([B.nom || 'base', B.t ? 'déposée ' + quand(B.t) : '', plurielLie(I.harnais.size, 'harness'), plurielLie(I.dessins.size, 'dessin'), plurielLie(B.liaisons.length, 'liaison')]) };
  const nb = (app.bible || []).length; let tb = 0; try { const o = JSON.parse(localStorage.getItem(CLE_BIBLE) || 'null'); tb = o && o.t || 0; } catch (_) { }
  E.bible = err('bible') ? { niveau: 'ko', dit: 'le dernier fichier n’est pas une bible — ' + (app.bibleNom ? app.bibleNom : 'l’embarquée') + ' reste' }
    : { niveau: 'ok', dit: app.bibleNom ? lies([app.bibleNom, tb ? 'importée ' + quand(tb) : '', pluriel(nb, 'référence')]) : lies(['embarquée', pluriel(nb, 'référence'), 'Référence et Bornes au minimum']) };
  const N = app.norme || normeVide(), lignes = TABLES_NORME.reduce((k, t) => k + (N[t] || []).length, 0), mod = typeof tableModifiee === 'function' ? TABLES_NORME.filter(tableModifiee).length : 0;
  E.normes = err('normes') ? { niveau: 'ko', dit: 'le dernier fichier n’a pas été lu comme une norme' }
    : { niveau: 'ok', dit: mod ? lies([pluriel(mod, 'table') + ' modifiée' + (mod > 1 ? 's' : '') + ' dans ce navigateur', app.normeNom, pluriel(lignes, 'ligne')]) : lies(['embarquées', pluriel(lignes, 'ligne'), 'rien de modifié', 'un gabarit par table']) };
  const H = app.simu || HYPOTHESES, d = ['longueur', 'courant', 'tension', 'ambiante'].some(k => H[k] !== HYPOTHESES[k]);
  E.hypotheses = { niveau: 'ok', dit: lies([nombre(H.longueur) + ' m par fil sans longueur', nombre(H.courant) + ' A sans disjoncteur', nombre(H.tension) + ' V', nombre(H.ambiante) + ' °C', d ? 'réglées ici' : 'les valeurs de l’outil']) };
  return E; }
/* Une carte. `o` : { cle, titre, action: [vf, libelle], liens: [[vf, libelle]], boites (html), attend: { format, apercu, ensuite: [], si, gestes: [[vf, libelle]] } } */
function carteHtml(o, etat, focus, primaire) { const ouvert = FICHIERS.volets.has(o.cle) ? FICHIERS.volets.get(o.cle) : (etat.niveau !== 'ok' || focus === o.cle);
  const A = o.attend;
  return `<section class="vf-carte e-${etat.niveau}${focus === o.cle ? ' vf-vise' : ''}" id="vf-${o.cle}" data-entree="${o.cle}"${o.depot ? ` data-depot="${o.depot}"` : ''} aria-labelledby="vf-t-${o.cle}">`
    + `<div class="vf-tete"><span class="vf-ic">${icoVf(o.cle)}</span><div class="vf-titres"><h3 id="vf-t-${o.cle}">${esc(o.titre)}</h3><div class="vf-etat"><i aria-hidden="true"></i><span class="sr">${{ ok: 'reçu et lu', vide: 'rien', att: 'en attente', ko: 'erreur' }[etat.niveau]} : </span><span>${esc(etat.dit)}</span></div></div>`
    + (o.action ? `<button class="btn ${primaire ? 'cuivre' : 'papier'} vf-action" data-vf="${o.action[0]}">${esc(o.action[1])}</button>` : '') + '</div>'
    + (o.liens && o.liens.length ? `<div class="vf-liens">${o.liens.map(([vf, t]) => `<button class="btn lien" data-vf="${vf}">${esc(t)}</button>`).join('')}</div>` : '')
    + (o.boites || '')
    + (A ? `<details class="vf-attend" data-volet="${o.cle}"${ouvert ? ' open' : ''}><summary><span class="vf-attend-t">Ce que j’attends</span><span class="vf-attend-s">${esc(A.sous || 'le format, trois lignes d’exemple, la suite')}</span>${ico('bas', 'vf-chevron')}</summary><div class="vf-corps">`
      + `<p class="vf-format">${A.format}</p>${A.apercu || ''}${A.apres || ''}`
      + (A.ensuite && A.ensuite.length ? `<div class="vf-ensuite"><div class="vf-st">Ensuite</div><ol>${A.ensuite.map(x => `<li>${x}</li>`).join('')}</ol></div>` : '')
      + (A.si ? `<div class="vf-si"><div class="vf-st">Si le fichier ne convient pas</div><p>${A.si}</p></div>` : '')
      + (A.gestes && A.gestes.length ? `<div class="vf-gestes">${A.gestes.map(([vf, t]) => `<button class="btn papier" data-vf="${vf}">${esc(t)}</button>`).join('')}</div>` : '')
      + '</div></details>' : '') + '</section>'; }
function erreurHtml(k) { const e = FICHIERS.erreurs[k]; if (!e) return '';
  return `<div class="vf-boite vf-erreur"><p>${e.texte}</p>${e.liste && e.liste.length ? `<ul>${e.liste.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}`
    + `<div class="vf-gestes">${(e.gestes || []).map(([vf, t], i) => `<button class="btn ${i ? 'papier' : 'cuivre'}" data-vf="${vf}">${esc(t)}</button>`).join('')}<span class="vf-quand">${quand(e.t)}</span><button class="btn lien" data-vf="oublier-erreur" data-entree="${k}">Effacer ce message</button></div></div>`; }
function avisHtml(k) { const a = FICHIERS.avis[k]; return a ? `<div class="vf-boite vf-avis"><p>${a.texte}</p><ul>${a.liste.map(x => `<li>${x}</li>`).join('')}</ul></div>` : ''; }
/* Le succès d'un dépôt de base : les comptes, ce qui se passe maintenant, et la main qu'on tend. */
function succesBaseHtml() { if (FICHIERS.succes !== 'base' || !app.references) return ''; const I = indexReferences(), R = app.references, V = verite(), p = V.length ? premierDejaFait() : null;
  return `<div class="vf-boite vf-succes"><p><b>${esc(R.nom || 'La base')}</b> est rangée : ${lies([plurielLie(I.harnais.size, 'harness'), plurielLie(I.dessins.size, 'dessin'), plurielLie(R.liaisons.length, 'liaison')])}.</p>`
    + `<ol><li>La base est rangée par harness et par dessin. Elle reste dans ce navigateur.</li><li>Sur la fiche de chaque équipement, «\u00a0Déjà fait\u00a0» donne les trois machines les plus proches.</li><li>Un clic compare : l’équipement, son voisinage, le dessin. On coche, on reprend, et Ctrl+Z défait.</li></ol>`
    + (p ? `<div class="vf-gestes"><button class="btn cuivre" data-vf="deja-fait">Voir un équipement déjà fait</button><span class="vf-note">${esc(p.nom)} : ${Math.round(p.c.taux * 100)}\u00a0% pareil sur ${esc(p.c.harness)}</span></div>`
      : V.length ? '<p class="vf-note">Aucun équipement du contrat ouvert n’a de correspondance dans cette base (ni même part number, ni même code).</p>'
      : '<div class="vf-gestes"><button class="btn cuivre" data-vf="ouvrir">Ouvrir mon retest…</button><span class="vf-note">chaque fiche dira ce qui a déjà été fait</span></div>') + '</div>'; }
function baseSansHarnessHtml() { const B = FICHIERS.base; if (!B) return '';
  return `<div class="vf-gestes vf-base-contrat"><button class="btn papier" data-vf="base-contrat">Ouvrir ${esc(B.nom)} comme contrat (${pluriel(B.liaisons.length, 'liaison')})</button></div>`; }
/* Les cinq cartes. */
function cartesFichiers(focus) { const E = etatsDesFichiers(), V = verite(), contrat = V.length && app.nom !== NOM_EXEMPLE;
  const primaire = focus && E[focus] && E[focus].niveau !== 'ok' ? focus : E.retest.niveau !== 'ok' ? 'retest' : E.base.niveau !== 'ok' ? 'base' : '';
  const nm = TABLES_NORME.length, nb = (app.bible || []).length;
  const C = [
    { cle: 'retest', titre: 'Le contrat — votre retest', depot: 'retest', action: ['ouvrir', contrat ? 'Remplacer…' : 'Ouvrir mon retest…'], liens: V.length ? [] : [['exemple', 'Pas de fichier sous la main ? Ouvrir l’exemple']],
      boites: attenteHtml() + erreurHtml('retest') + avisHtml('retest'),
      attend: { format: 'Un Excel (<span class="id">.xlsx</span>, <span class="id">.xlsm</span>, <span class="id">.xls</span>) ou un CSV (séparateur <b>;</b> <b>,</b> ou tabulation), <b>une ligne par fil</b>. Les colonnes sont reconnues par leur nom et leurs alias, en-têtes dans les 30 premières lignes : '
          + MODELE_RETEST.entetes.map(h => MODELE_RETEST.requises.includes(h) ? `<b class="id">${h}</b>` : `<span class="id">${h}</span>`).join(POINT) + '. En gras, le minimum.',
        apercu: apercuHtml(MODELE_RETEST, { label: 'Trois lignes d’exemple du retest' }),
        ensuite: ['Les folios se dessinent (un par FWD), chaque fil est jugé, et les fiches se remplissent.', 'Plusieurs harness dans le fichier : on vous demande lequel ouvrir ; les autres deviennent la base des contrats déjà faits.', 'Le contrat ouvert est remplacé ; Ctrl+Z le rend.'],
        si: 'L’outil le dit ici et ne touche pas au contrat ouvert : un fichier vide, des en-têtes introuvables (il dit ce qu’il a lu et ce qu’il lui faut), des colonnes devinées (il montre ce qu’il a compris et attend «\u00a0Charger\u00a0»), des feuilles ignorées, un fichier qui n’est pas un tableau.',
        gestes: [['modele-retest', 'Télécharger un modèle (CSV)'], ['coller', 'Coller des lignes…']] } },
    { cle: 'base', titre: 'Les contrats déjà faits — la base', depot: 'base', action: ['base', app.references ? 'Remplacer…' : 'Déposer la base…'],
      liens: app.references ? [...(V.length && FICHIERS.succes !== 'base' ? [['deja-fait', 'Voir un équipement déjà fait']] : []), ['chercher-base', 'Chercher dans la base'], ['oublier-base', 'Oublier la base']] : [],
      boites: succesBaseHtml() + erreurHtml('base') + baseSansHarnessHtml() + avisHtml('base'),
      attend: { format: 'Votre grande base, téléchargée une fois : un Excel ou un CSV, <b>une ligne par liaison</b>, aux <b>mêmes colonnes que le retest</b>, avec <b class="id">Harness</b> rempli (une machine = un harness). <span class="id">FWD</span> (le dessin), <span class="id">Appareil</span> (le contrat) et <span class="id">Date retest</span> sont fortement conseillés. Une feuille par harness, ou tout à la suite.',
        apercu: apercuHtml(MODELE_BASE, { label: 'Trois lignes d’exemple de la base' }),
        ensuite: ['La base est rangée par harness et par dessin. Elle reste dans ce navigateur.', 'Sur la fiche de chaque équipement, «\u00a0Déjà fait\u00a0» donne les trois machines les plus proches.', 'Un clic compare : l’équipement, son voisinage, le dessin. On coche, on reprend, et Ctrl+Z défait.'],
        si: '«\u00a0base-2024.xlsx : aucune colonne Harness. Sans elle, je ne sais pas séparer les machines. Ajoutez-la, ou ouvrez ce fichier comme contrat.\u00a0» L’outil le dit ici et garde la base d’avant.',
        gestes: [['modele-base', 'Télécharger un modèle (CSV)']] } },
    { cle: 'bible', titre: 'La bible — barrettes, modules, connecteurs', depot: 'bible', action: ['bible', 'Importer la vôtre…'], liens: [['voir-bible', 'Voir la bible'], ...(app.bibleNom ? [['bible-outil', 'Revenir à la bible de l’outil']] : [])],
      boites: erreurHtml('bible'),
      attend: { sous: 'facultatif : ' + pluriel(nb, 'référence') + ' embarquées', format: `<b class="id">Référence</b> ; <b class="id">Bornes</b> au minimum, puis Famille ; Nature ; Jauge min ; Jauge max ; Intensité ; Blindage ; Note ; Mobile — dans n’importe quel ordre, reconnus à leur nom. L’outil embarque déjà ${pluriel(nb, 'référence')} (ASNE 0599, NSA937901, EN 4165…).`,
        apercu: apercuHtml(MODELE_BIBLE, { label: 'Trois lignes d’exemple de la bible' }),
        ensuite: ['Chaque barrette et chaque prise rechoisit sa référence, et les fiches le disent.'],
        si: 'Sans les colonnes Référence et Bornes, l’outil dit ce qu’il a lu et garde la bible d’avant.', gestes: [['modele-bible', 'Télécharger un modèle (CSV)']] } },
    { cle: 'normes', titre: 'Les normes — ' + pluriel(nm, 'table'), depot: 'normes', action: ['normes', 'Importer une table…'], liens: [['voir-normes', 'Voir les normes'], ...(app.normeNom ? [['normes-outil', 'Revenir à la norme embarquée']] : [])],
      boites: erreurHtml('normes'),
      attend: { sous: 'facultatif : ' + pluriel(nm, 'table') + ' embarquées', format: `Une table par bloc : une ligne de titre libre, la ligne d’en-têtes de la table (${nm} tables, un gabarit par table dans la page Normes), puis une ligne par entrée. Une ligne de même clé remplace la ligne embarquée. Un Excel peut porter plusieurs tables.`,
        apercu: apercuHtml(MODELE_NORME, { label: 'Un exemple : la table Réseau' }),
        ensuite: ['Chaque table reconnue est montrée avant d’être adoptée : les lignes nouvelles, celles qui remplacent.', 'Tout est rejugé, et la page Normes marque la table «\u00a0modifiée dans ce navigateur\u00a0».'],
        si: 'Sans en-têtes reconnus, l’outil le dit et ne touche à rien : il faut les en-têtes de l’outil (les gabarits les donnent tous).', gestes: [['gabarit-reseau', 'Gabarit Réseau (CSV)'], ['gabarits', 'Tous les gabarits']] } },
    { cle: 'hypotheses', titre: 'Les hypothèses — ce que le retest ne dit pas', action: ['hypotheses', 'Régler…'],
      attend: { sous: 'pas un fichier : des valeurs', format: 'Rien à déposer : ce que l’outil suppose quand le retest ne le dit pas — la longueur d’un fil sans longueur, le courant d’un fil sans disjoncteur, la tension du réseau, les températures, le déclassement.',
        ensuite: ['Les changer refait tous les calculs : chutes, intensités, disjonction, contrôle.'] } }];
  return C.map(o => carteHtml(o, E[o.cle], focus, primaire === o.cle)).join(''); }
function sommaireHtml() { const E = etatsDesFichiers();
  return `<nav class="vf-sommaire" aria-label="Les cinq entrées">${ENTREES.map(([k, t]) => `<button class="vf-puce e-${E[k].niveau}" data-vf="aller" data-entree="${k}"><i aria-hidden="true"></i>${t}</button>`).join('')}</nav>`; }
function fichiersHtml(focus) { return tete('Ce que l’outil a reçu', 'Vos fichiers')
  + '<p class="vf-lead">Cinq entrées. Une seule est indispensable : le retest. Les autres ont une version embarquée ou sont facultatives. Tout reste dans ce navigateur ; on peut aussi déposer un fichier sur sa carte.</p>'
  + sommaireHtml() + `<div class="vf-cartes">${cartesFichiers(focus)}</div>`; }
/* Ouvrir « Vos fichiers », sur une carte (`focus`) s'il y a lieu : elle vient sous les yeux, son volet ouvert. */
function ficheFichiers(focus) { const deja = app.fiche && app.fiche.mode === 'fichiers', y = deja ? $('fiche-corps').scrollTop : 0;
  if (focus) FICHIERS.volets.delete(focus);
  ouvrirFiche({ mode: 'fichiers', large: true, focus: focus || '' }, fichiersHtml(focus || ''), '');
  lierFichiers(); const c = $('fiche-corps');
  if (focus) { const el = $('vf-' + focus); if (el) { c.scrollTop = 0; c.scrollTop = Math.max(0, el.getBoundingClientRect().top - c.getBoundingClientRect().top - 8); } }
  else if (deja) c.scrollTop = y; }
/* Refaire « Vos fichiers » sur place (après un dépôt, une erreur) — la lecture reste où elle était. */
function rendreFichiers() { if (typeof document === 'undefined' || !(app.fiche && app.fiche.mode === 'fichiers')) { if (typeof rendreAccueil === 'function') rendreAccueil(); return; }
  const c = $('fiche-corps'), y = c.scrollTop; c.innerHTML = fichiersHtml(app.fiche.focus || ''); c.scrollTop = y; if (typeof rendreAccueil === 'function') rendreAccueil(); }
/* Les gestes, posés une fois sur le corps des documents (il se refait souvent). */
function lierFichiers() { if (FICHIERS.lie) return; FICHIERS.lie = true; const c = $('fiche-corps');
  c.addEventListener('toggle', e => { const d = e.target; if (d && d.matches && d.matches('details.vf-attend') && app.fiche && app.fiche.mode === 'fichiers') FICHIERS.volets.set(d.dataset.volet, d.open); }, true);
  // « Corriger » : une colonne prend un rôle (celle qui l'avait le perd), l'aperçu se refait
  c.addEventListener('change', e => { const s = e.target; if (!(app.fiche && app.fiche.mode === 'fichiers') || !FICHIERS.attente || !(s && s.closest && s.closest('.vf-carte-cols'))) return;
    const A = FICHIERS.attente, i = +s.dataset.colonne;
    ROLES.forEach(([k]) => { if (A.map[k] !== '' && A.map[k] != null && +A.map[k] === i) A.map[k] = ''; }); if (s.value) A.map[s.value] = i; A.devine = true; rendreFichiers(); });
  c.addEventListener('click', e => { if (!(app.fiche && app.fiche.mode === 'fichiers')) return; const b = e.target.closest && e.target.closest('[data-vf]'); if (!b) return; const k = b.dataset.vf;
    const faire = {
      ouvrir: () => $('fichier').click(), coller: ficheColler, exemple: () => ouvrirExemple(), base: choisirBase, bible: () => $('fichier-bible').click(), normes: () => $('fichier-normes').click(), hypotheses: ficheHypotheses,
      'modele-retest': () => telechargerModele('retest'), 'modele-base': () => telechargerModele('base'), 'modele-bible': () => telechargerModele('bible'),
      'gabarit-reseau': () => telechargerGabaritNorme('reseau'), gabarits: () => { NORMES.guide = true; ficheNormes(); },
      'voir-bible': () => ficheBible(''), 'voir-normes': () => ficheNormes(), 'chercher-base': () => { ficheBible(''); const t = [...$('fiche-corps').querySelectorAll('h3.sous-titre')].find(h => /contrats déjà faits/i.test(h.textContent)); if (t) t.scrollIntoView({ block: 'start' }); },
      'bible-outil': () => { adopterBible(bibleExemple(), ''); rendreFichiers(); dire('La bible de l’outil est rétablie.'); },
      'normes-outil': () => { adopterApports(apportsVides(), 'retour à la norme embarquée'); rendreFichiers(); dire('Norme embarquée rétablie.'); },
      'oublier-base': () => { if (!confirm('Oublier la base des contrats déjà faits ? Il faudra la redéposer.')) return; adopterReferences([], ''); FICHIERS.succes = null; rendreFichiers(); dire('La base des contrats déjà faits est oubliée.'); },
      'deja-fait': voirDejaFait, charger: chargerRattrapage, corriger: () => { FICHIERS.corriger = !FICHIERS.corriger; rendreFichiers(); },
      abandonner: () => { FICHIERS.attente = null; FICHIERS.corriger = false; rendreFichiers(); },
      'oublier-erreur': () => { effacerErreur(b.dataset.entree); rendreFichiers(); },
      'base-contrat': () => { const B = FICHIERS.base; if (!B) return; FICHIERS.base = null; effacerErreur('base'); chargerContrat(B.liaisons, 'ouverture de ' + B.nom, B.nom); contratRecu(B.nom, 'retest');
        dire(pluriel(B.liaisons.length, 'liaison') + ' de ' + guillemets(B.nom) + ', ouvert comme contrat.'); },
      // le sommaire : la carte vient sous les yeux ; son volet s'ouvre si l'entrée attend quelque chose
      aller: () => { const el = $('vf-' + b.dataset.entree); if (!el) return; const d = el.querySelector('details.vf-attend'); if (d && !el.classList.contains('e-ok')) d.open = true;
        try { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (_) { el.scrollIntoView(); } el.classList.add('vf-montre'); setTimeout(() => el.classList.remove('vf-montre'), 1200); }
    }[k];
    if (faire) { e.preventDefault(); faire(); } }); }
// les entrées cachées de « Vos fichiers » (et de l'accueil) : la base, une norme ; la bible a la sienne (page.html)
function lierEntreesFichiers() { const f = (id, fn) => { const el = $(id); if (el && !el.dataset.lie) { el.dataset.lie = '1'; el.addEventListener('change', e => { const x = e.target.files && e.target.files[0]; if (x) fn(x); e.target.value = ''; }); } };
  f('fichier-base', importerReferences); f('fichier-normes', importerNorme);
  const t = $('toast'); if (t && !t.dataset.lie) { t.dataset.lie = '1'; t.addEventListener('mouseenter', () => clearTimeout(toastT)); t.addEventListener('mouseleave', () => { if (t.classList.contains('on')) toastT = setTimeout(() => t.classList.remove('on', 'action'), 2500); }); } }
