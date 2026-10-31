/* ===========================================================================
   08 — « VOS FICHIERS » : ce que l'outil a reçu, ce qu'il attend, ce qu'il en fait
   ---------------------------------------------------------------------------
   Le lecteur : « Partout "Ouvrir un fichier", mais je ne sais même pas quel
   fichier tu attends. Les contrats déjà faits : je ne vois même pas où est la
   base. […] Il faut suivre l'utilisateur, le porter, lui prendre la main. »

   UN SEUL ENDROIT (menu ⋮ → Vos fichiers ; « Voir » dans le mot qui signale
   une erreur) pour les six entrées de l'outil — la bibliothèque (les installations
   et leurs plans, 08-bibliotheque : l'entrée principale), le retest, les
   contrats déjà faits, la bible, les normes, les hypothèses. Peu de mots (le
   lecteur : « il y a tellement de choses, je n'ai pas envie de lire ») ;
   chaque entrée — un groupe aéré, séparé du suivant par un filet, pas une
   carte dans la feuille (la classe garde son nom, `.vf-carte`) — dit :
     · son ÉTAT, en un voyant : reçu et lu (vert), rien (ambre), erreur (rouge) ;
     · ce qui a été REÇU : le nom, la date, les comptes ;
     · l'ACTION : Ouvrir…, Déposer…, Importer…, Régler… ;
     · pour la bibliothèque, le retest et la base, ce qu'elle attend EN UNE
       LIGNE (la base : un seul Excel, une ligne par liaison, Harness = la
       machine, FWD = le dessin, Appareil = le contrat) et, tant qu'elle est
       vide, sa ZONE DE DÉPÔT ;
     · « CE QUE J'ATTENDS », replié (ouvert sur la carte qu'on vient
       chercher) : TROIS LIGNES D'EXEMPLE, ce qui se passe ensuite en une
       phrase, le modèle.
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
   correspondance, la section Déjà fait ouverte. Une base qui dit l'installation de
   ses lignes range aussi ses plans dans la bibliothèque ; sinon on propose de
   les y ranger.

   UN FICHIER OUVERT (Ctrl+O, le menu, glissé sur la table) devient un PLAN
   NEUF de l'installation ouverte, sur la table ; Ctrl+Z revient au plan d'avant.
   Un très gros fichier (une base entière) se lit dans un Worker, la page libre
   (08-references) ; un retest ouvert alors qu'une base est là propose le
   contrat déjà fait le plus proche (« Comparer »).

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
  entetes: ['Équip.1', 'Borne', 'PN', 'Équip.2', 'Borne', 'PN', 'Câble', 'Type', 'Route', 'Folio'],
  requises: ['Équip.1', 'Équip.2'],
  lignes: [
    ['102CB1', '2', 'MS3320-10', '103RL1', 'A1', 'E0836IS35-22SA', 'W-012', 'DR20', 'PUISSANCE', '1'],
    ['103RL1', 'A2', '', '104LP1', '1', '', 'W-013', 'DR22', 'SIGNAL', '1'],
    ['101BT1', '2', '', '901G', '', '', 'W-018', 'DR16', 'PUISSANCE', '1']] };
const MODELE_BIBLE = {
  entetes: ['Référence', 'Famille', 'Nature', 'Bornes', 'Jauge min', 'Jauge max', 'Intensité', 'Blindage', 'Note', 'Mobile'],
  requises: ['Référence', 'Bornes'],
  lignes: [
    ['ASNE0500-02', 'ASNE0500', 'jonction', '2', '26', '20', '7,5', 'non', 'exemple — remplacez par votre bible', ''],
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
   encore ouvrir comme un plan ; `succes` : la base vient d'être déposée (la carte le dit, avec la main qu'on tend), et
   `rangee` ce qu'elle a rangé dans la bibliothèque ; `oubli` : « Oublier la base » attend sa confirmation ; `volets` :
   « Ce que j'attends » ouvert ou fermé à la main, par entrée. */
const CLE_FICHIERS = 'atelier.fichiers.v1';
const FICHIERS = { retest: null, erreurs: {}, avis: {}, attente: null, corriger: false, base: null, succes: null, rangee: null, oubli: false, volets: new Map(), lie: false };
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
/* Le mot qui passe SIGNALE ; la carte DIT. « Voir » (le bouton du mot qui passe, `dire`) ouvre la carte. Il reste le
   temps de le lire, et tant qu'on le survole ; une erreur reste jusqu'au clic suivant. */
function signaler(msg, entree, erreur) { dire(msg, erreur, entree ? { geste: 'Voir', faire: () => ficheFichiers(entree) } : null); }

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
  const brutes = lignesDuTexte(texte), pleines = brutes.filter(l => l.trim() && l.replace(/[\t;,]/g, '').trim());
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
/* Un tableau qui n'est pas un retest : une bible ou une norme vont à leur place (rend vrai) — sur la table comme dans la
   bibliothèque (08-bibliotheque, `plansDuFichier`). */
async function rangerAilleurs(L, nom, fichier) { const b = lireBible(L.texte);
  if (b.entrees.length) { adopterBible(b.entrees, nom); effacerErreur('bible'); rendreFichiers(); signaler('Bible : ' + pluriel(b.entrees.length, 'référence') + ' lue' + (b.entrees.length > 1 ? 's' : '') + ' dans ' + guillemets(nom) + ' ; les barrettes suivent.', 'bible'); return true; }
  if (normeLue(lireNorme(L.texte))) { await importerNorme(fichier); return true; }   // une norme : reconnue à ses tables
  return false; }
/* Un fichier ouvert ou déposé sur la table : un retest (reconnu à ses en-têtes) devient un plan neuf de l'installation ouverte,
   sur la table ; plusieurs harness : la base des contrats déjà faits (rangée dans la bibliothèque si elle dit ses
   installations), et l'on demande lequel ouvrir ; une bible ou une norme vont à leur place ; un tableau sans les en-têtes du
   retest attend « Charger » ; le reste est une erreur dite dans la carte du retest. */
async function ouvrirFichier(fichier) { if (!fichier) return; const nom = fichier.name || 'le fichier';
  if (estPdf(fichier)) { ouvrirPdf(fichier); return; }   // un PDF de schéma : la visionneuse, puis le retest qu'on en lit (08-pdf)
  if (estVisio(fichier) || estVisioAncien(fichier)) { ouvrirVisio(fichier); return; }   // un schéma Visio (.vsdx) : sa relecture (08-visio)
  if (await routerBaseSEE(fichier)) return;   // l'Excel des vues de SEE (EED_View…) : il se résume, il ne s'ouvre pas comme un retest (08-see)
  // un très gros fichier (une base entière, 100 000 lignes et plus) se lit AILLEURS, la page libre : un seul contrat devient un
  // plan, plusieurs la base des contrats déjà faits (08-references, `lireLaBaseAilleurs`)
  if ((fichier.size || 0) > SEUIL_AILLEURS && typeof Worker !== 'undefined' && lireLaBaseAilleurs(fichier, 'ouvrir')) return;
  dire('Lecture de ' + guillemets(nom) + '…');
  const L = await lireLeFichier(fichier);
  if (L.erreur) { echecImport('retest', L.erreur); return; }
  try {
    if (!trouverEnteteRetest(L.brutes)) { if (!(await rangerAilleurs(L, nom, fichier))) proposerRattrapage(nom, L); return; }
    const r = lireTexte(L.texte), ig = feuillesHtml(L.lu), avis = ig.length ? { texte: 'Feuilles ignorées (pas les en-têtes de l’installation) :', liste: ig } : null;
    if (!r.liaisons.length) { echecImport('retest', { texte: `${guillemets(esc(nom))} : les en-têtes de l’installation sont là (ligne ${r.entete}), mais aucune liaison dessous. Chaque ligne doit nommer au moins <span class="id">Device1</span> et <span class="id">Device2</span>.`, liste: avis ? [avis.texte + ' ' + ig.join(', ')] : [] },
      guillemets(nom) + ' : les en-têtes sont là, mais aucune liaison dessous.'); return; }
    if (r.harnais && r.harnais.length > 1) { adopterReferences(r.liaisons, nom); baseRecue(nom, avis, rangerLesContrats(app.references.base, nom));
      ficheHarnais(r, nom); signaler(pluriel(r.harnais.length, 'harness') + ' dans ' + guillemets(nom) + ' : gardés comme contrats déjà faits — lequel ouvrir sur la table ?', 'base'); return; }
    chargerContrat(r.liaisons, 'ouverture de ' + nom, nom, { nouveau: true }); contratRecu(nom, 'retest', avis);
    if (typeof noterLecture === 'function') noterLecture(L, r);   // le bilan anonyme dit comment ce fichier a été lu (08-bilan)
    // les feuilles laissées de côté se NOMMENT (le technicien v73 : « 1 feuille ignorée » m'inquiète : laquelle ?) ; le journal
    // d'un retest corrigé (« Modifications ») n'en est plus une : la lecture le reconnaît et le dit (02, domaine C)
    const noms = (L.lu && L.lu.ignorees) || [], n = r.liaisons.length;
    const msg = pluriel(n, 'liaison') + ' lue' + (n > 1 ? 's' : '') + (plans().length > 1 ? ' · ' + plans().length + ' folios' : '')
      + (noms.length === 1 ? ' · la feuille ' + guillemets(noms[0]) + ' est laissée de côté (pas les en-têtes d’une installation)' : noms.length ? ' · ' + noms.length + ' feuilles laissées de côté : ' + noms.slice(0, 3).map(guillemets).join(', ') + (noms.length > 3 ? '…' : '') : '') + '.';
    if (ig.length) signaler(msg, 'retest'); else dire(msg);
    proposerDejaFait();
  } catch (e) { echecImport('retest', { texte: `${guillemets(esc(nom))} n’a pas pu être lu : ${esc(String(e && e.message || e))}.` }); } }
/* Une base reçue (un dépôt sur sa carte, ou un fichier de plusieurs harness) : la carte le dira, avec ses comptes et ce
   qu'elle a rangé dans la bibliothèque (`rangee`). */
function baseRecue(nom, avis, rangee) { FICHIERS.base = null; effacerErreur('base'); FICHIERS.succes = 'base'; FICHIERS.rangee = rangee || null; FICHIERS.avis.base = avis || null; rendreFichiers(); }

/* ---- le rattrapage : ce qui est compris, puis « Charger » --------------------------------------------------------- */
/* Les rôles d'une colonne, dans l'ordre du collage sans en-têtes (02, `lireTexte`). */
const ROLES = [['eq1', 'De', 'Device1'], ['b1', 'Borne', 'Pin1'], ['pn1', 'PN', 'PN1'], ['eq2', 'Vers', 'Device2'], ['b2', 'Borne', 'Pin2'], ['pn2', 'PN', 'PN2'], ['cable', 'Câble', 'Cable Tag'], ['type', 'Type', 'Cable TG'], ['route', 'Route', 'Route'], ['plan', 'Folio', 'FWD']];
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
  if (!lu.liaisons.length) { echecImport('retest', { texte: `${esc(nom)} : je ne trouve pas les en-têtes de l’installation dans les 30 premières lignes. ${ceQueJaiLu(L.brutes)} ${IL_ME_FAUT}`, gestes: [['modele-retest', 'Télécharger un modèle']] },
    nom + ' : je ne trouve pas les en-têtes de l’installation dans les 30 premières lignes.'); return; }
  effacerErreur('retest'); FICHIERS.attente = { nom, pleines: L.pleines, ...D }; FICHIERS.corriger = false;
  ficheFichiers('retest'); signaler(nom + ' n’a pas les en-têtes de l’installation : voici ce que j’ai compris — rien n’est chargé avant « Charger ».', 'retest'); }
function chargerRattrapage() { const A = FICHIERS.attente; if (!A) return; const lu = lireAvecCarte(A.pleines, A.map, A.debut); if (!lu.liaisons.length) return;
  chargerContrat(lu.liaisons, 'ouverture de ' + A.nom, A.nom, { nouveau: true }); contratRecu(A.nom, 'colonnes devinées');
  dire(pluriel(lu.liaisons.length, 'liaison') + ' chargée' + (lu.liaisons.length > 1 ? 's' : '') + ' de ' + guillemets(A.nom) + (plans().length > 1 ? ' · ' + plans().length + ' folios' : '') + '.'); }
// l'aperçu de ce qui est compris : les premières liaisons, chaque champ à sa place
function apercuLiaisonsHtml(L, max) { const cols = [['de', 'De'], ['borneDe', 'Borne'], ['vers', 'Vers'], ['borneVers', 'Borne'], ['cable', 'Câble'], ['type', 'Type'], ['route', 'Route'], ['plan', 'Folio']].filter(([k], j) => j < 4 || L.some(l => l[k]));
  return `<div class="vf-apercu"><table><thead><tr>${cols.map(([k, t]) => `<th${k === 'de' || k === 'vers' ? ' class="req"' : ''}>${t}</th>`).join('')}</tr></thead><tbody>${L.slice(0, max || 3).map(l => `<tr>${cols.map(([k]) => `<td${k === 'de' || k === 'vers' ? ' class="req"' : ''}>${esc(l[k] == null ? '' : l[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
    + (L.length > (max || 3) ? `<p class="vf-note">… et ${pluriel(L.length - (max || 3), 'autre liaison')}.</p>` : ''); }
function attenteHtml() { const A = FICHIERS.attente; if (!A) return ''; const lu = lireAvecCarte(A.pleines, A.map, A.debut);
  const dit = A.entete && A.devine ? `${esc(A.nom)} n’a pas les en-têtes de l’installation. J’ai compris : ${comprisHtml(A)}.` : `${esc(A.nom)} n’a pas d’en-têtes que je reconnaisse : je l’ai lu dans l’ordre du collage — ${comprisHtml(A)}.`;
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
    chargerContrat(L, 'ouverture de ' + h + ' (' + nom + ')', h + ' (' + nom + ')', { nouveau: true }); contratRecu(h + ' (' + nom + ')', 'un harness de la base');
    dire(h + ' : ' + pluriel(L.length, 'liaison') + (plans().length > 1 ? ' · ' + plans().length + ' folios' : '') + ' — les autres harness restent des contrats déjà faits.'); });
  $('ch-aucun').onclick = () => fermerFiche(true); $('ch-base').onclick = () => ficheFichiers('base'); }

/* ---- coller des lignes : l'ordre, un exemple, l'aperçu, ajouter ou remplacer ------------------------------------- */
/* Ce qu'un texte collé donne : un retest reconnu à ses en-têtes (02, `lireTexte`), sinon le rattrapage (des en-têtes
   devinées, ou l'ordre du collage). Rend { liaisons, rejets, comment (en mots) }. */
function lireCollage(texte) { const brutes = lignesDuTexte(texte), pleines = brutes.filter(l => l.trim());
  if (!pleines.length) return { liaisons: [], rejets: [], comment: '' };
  const rt = trouverEnteteRetest(brutes);
  if (rt) { const r = lireTexte(texte), n = brutes.slice(rt.ligne + 1).filter(l => l.trim()).length - ((r.entetes || 1) - 1);   // les lignes sous les en-têtes
    return { liaisons: r.liaisons, rejets: Array.from({ length: Math.max(0, n - r.liaisons.length) }), comment: 'reconnues à leurs en-têtes (l’installation, ligne ' + r.entete + ')' }; }
  const D = devinerTableau(pleines), lu = lireAvecCarte(pleines, D.map, D.debut);
  return { ...lu, comment: D.entete && D.devine ? 'colonnes devinées à leurs en-têtes : ' + comprisHtml(D) : 'lues dans l’ordre ci-dessus' }; }
/* Le plan sur la table reçoit les lignes (« Ajouter au plan ») ou les prend à la place des siennes (« Remplacer le plan » :
   il garde son nom ; l'exemple, lui, ne se remplace pas : un plan neuf « Collage ») ; depuis la bibliothèque, ou sans
   plan, elles font un plan neuf de l'installation ouverte (« Charger »). */
function ficheColler() { const ouvert = verite().length > 0 && !bibliothequeOuverte();
  /* Trois temps, l'un sous l'autre, groupés par l'espace : ce qu'on colle (l'ordre des colonnes, un exemple qu'on peut
     coller d'un clic), le champ, ce qui est compris. */
  const corps = tete('Sans fichier', 'Coller des lignes')
    + '<p class="co-lead"><b>Une liaison par ligne</b>, copiée d’Excel ou tapée ; les colonnes séparées par une tabulation, <b>;</b> ou <b>,</b>. Sous les en-têtes de l’installation, elles sont reconnues à leur nom.</p>'
    + `<section class="co-bloc"><h3 class="co-etiquette">Sans en-têtes, dans cet ordre<small>seuls les deux équipements sont obligatoires</small></h3>`
    + `<ol class="co-ordre">${MODELE_COLLAGE.entetes.map((t, i) => `<li${MODELE_COLLAGE.requises.includes(t) ? ' class="req"' : ''}><i>${i + 1}</i>${esc(t)}</li>`).join('')}</ol></section>`
    + `<section class="co-bloc co-exemple"><h3 class="co-etiquette">Par exemple<button class="btn lien" id="co-essai">Coller cet exemple</button></h3>${apercuHtml(MODELE_COLLAGE)}</section>`
    + '<label class="champ co-champ" id="co-champ"><span class="co-etiquette">Vos lignes</span><textarea id="co-txt" placeholder="102CB1;2;MS3320-10;103RL1;A1;;W-012;DR20;PUISSANCE;1" spellcheck="false" aria-describedby="co-apercu"></textarea></label>'
    + '<section class="co-apercu" id="co-apercu" aria-live="polite"></section>';
  const pied = ouvert ? '<button class="btn cuivre" id="co-ajouter" disabled>Ajouter au plan</button><button class="btn papier" id="co-remplacer" disabled>Remplacer le plan</button><span class="espace"></span><button class="btn lien" id="co-fichier">…ou un fichier</button>'
    : '<button class="btn cuivre" id="co-remplacer" disabled>Charger</button><span class="espace"></span><button class="btn lien" id="co-fichier">…ou un fichier</button>';
  ouvrirFiche({ mode: 'coller', large: true }, corps, pied);
  const txt = $('co-txt'); let lu = { liaisons: [], rejets: [] }, t = 0;
  const voir = () => { lu = lireCollage(txt.value); const n = lu.liaisons.length, vide = !txt.value.trim(), box = $('co-apercu');
    box.innerHTML = vide ? '' : n ? `<h3 class="co-etiquette">Ce que je comprends</h3><p class="co-dit"><i class="co-point" aria-hidden="true"></i><span><b>${pluriel(n, 'liaison')}</b>, ${lu.comment}${lu.rejets.length ? ` · <span class="co-rejet">${pluriel(lu.rejets.length, 'ligne')} sans ses deux bouts, laissée${lu.rejets.length > 1 ? 's' : ''} de côté</span>` : ''}.</span></p>${apercuLiaisonsHtml(lu.liaisons, 4)}`
      : `<div class="vf-boite vf-erreur"><p>Aucune liaison reconnue : chaque ligne doit nommer ses deux équipements, dans l’ordre ci-dessus (ou sous les en-têtes de l’installation). Vérifiez le séparateur.</p></div>`;
    $('co-champ').classList.toggle('erreur', !vide && !n); txt.setAttribute('aria-invalid', String(!vide && !n));
    ['co-ajouter', 'co-remplacer'].forEach(id => { const b = $(id); if (b) b.disabled = !n; });
    if ($('co-ajouter')) $('co-ajouter').textContent = n ? 'Ajouter ' + pluriel(n, 'liaison') + ' au plan' : 'Ajouter au plan'; };
  txt.addEventListener('input', () => { clearTimeout(t); t = setTimeout(voir, 120); });
  txt.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); voir(); const b = $('co-ajouter') || $('co-remplacer'); if (b && !b.disabled) b.click(); } });
  $('co-essai').onclick = () => { txt.value = MODELE_COLLAGE.lignes.map(r => r.join(';')).join('\n'); voir(); txt.focus(); };
  $('co-remplacer').onclick = () => { if (!lu.liaisons.length) return; const n = lu.liaisons.length, garde = ouvert && app.planId !== ID_EXEMPLE, nom = garde ? app.nom : 'Collage';
    chargerContrat(lu.liaisons, 'collage de ' + pluriel(n, 'liaison'), nom, garde ? {} : { nouveau: true }); contratRecu(nom, 'lignes collées');
    dire(pluriel(n, 'liaison') + ' chargée' + (n > 1 ? 's' : '') + (garde ? ' : les liaisons d’avant sont remplacées (Ctrl+Z les rend).' : '.')); };
  if ($('co-ajouter')) $('co-ajouter').onclick = () => { if (!lu.liaisons.length) return; const n = ajouterAuContrat(lu.liaisons, 'ajout de ' + pluriel(lu.liaisons.length, 'liaison') + ' collée' + (lu.liaisons.length > 1 ? 's' : ''));
    fermerFiche(true); dire(pluriel(n, 'liaison') + ' ajoutée' + (n > 1 ? 's' : '') + ' au plan · Ctrl+Z pour défaire.'); };
  $('co-fichier').onclick = () => $('fichier').click();
  txt.focus(); }
/* Ajouter des liaisons au contrat ouvert (le collage) : sans folio, elles vont sur le folio affiché quand les folios
   viennent du fichier ; le plan, le contrôle, l'enregistrement suivent ; Ctrl+Z les retire. */
function ajouterAuContrat(L, quoi) { histPush(quoi); const V = verite(), plan = modeFolio() === 'fichier' && app.plan !== '*' ? app.plan : '';
  L.forEach(l => V.push(liaison({ ...l, plan: l.plan || plan }))); apresEdition(); return L.length; }

/* ---- l'exemple ----------------------------------------------------------------------------------------------------- */
/* L'exemple embarqué, tel qu'il est livré, avec son profil de charge : le plan de l'installation de démonstration
   (08-bibliotheque), à la demande (le menu Plus, la bibliothèque), jamais d'office. `neuf` : sans historique (l'API de
   contrôle, `atelier.exemple()`, le pose comme si on venait de l'ouvrir). */
function ouvrirExemple(neuf) { chargerContrat(contratExemple(), 'contrat d’exemple', NOM_EXEMPLE, { planId: ID_EXEMPLE }); app.contrat.charges = chargesExemple(); if (calibresVoltaALOuverture()) redessiner(); rendreControle();
  // les profils changent le calibre retenu : le folio le repeint (sinon il dit le 10 A du retest, la fiche le 15 A — audit v72)
  if (typeof peindre === 'function') peindre();
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
  bibliotheque: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  retest: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8.5 12.5h7M8.5 16h7"/>',
  base: '<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>',
  bible: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v16H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v4H6.5A2.5 2.5 0 0 1 4 20.5M9 7h7M9 10.5h5"/>',
  normes: '<path d="M4 5h16M4 10h16M4 15h10M4 20h7"/><path d="m16 18 2 2 4-4"/>',
  hypotheses: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  depot: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>'
};
const icoVf = k => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONES_VF[k]}</svg>`;
/* Les trois colonnes qui rangent la base, chacune avec ce qu'elle dit */
const CLES_BASE = [['Harness', 'la machine'], ['FWD', 'le dessin'], ['Appareil', 'le contrat']];
const clesBaseHtml = () => `<dl class="vf-cles">${CLES_BASE.map(([k, d]) => `<div><dt>${k}</dt><dd>${d}</dd></div>`).join('')}</dl>`;
/* L'état de chaque entrée : 'ok' (reçu et lu), 'vide' (rien : ambre), 'ko' (une erreur), et la ligne qui le dit. */
function etatsDesFichiers() { const E = {}, V = verite(), err = k => FICHIERS.erreurs[k];
  // la bibliothèque : ses installations et ses plans (l'Exemple n'en est pas)
  const nI = installsVraies().length, nP = plansVrais().length;
  E.bibliotheque = nI ? { niveau: 'ok', dit: lies([plurielLie(nI, 'installation'), plurielLie(nP, 'plan'), BIB.garde ? 'gardés dans ce navigateur' : 'pas gardés dans ce navigateur']) } : { niveau: 'vide', dit: 'aucune installation pour l’instant' };
  // le retest : le plan sur la table, l'exemple, rien
  const n = V.length, exemple = n && app.nom === NOM_EXEMPLE, R = FICHIERS.retest && FICHIERS.retest.nom === app.nom ? FICHIERS.retest : null, P = plans().length;
  E.retest = err('retest') ? { niveau: 'ko', dit: 'le dernier fichier n’a pas pu être ouvert' + (n && !exemple ? ' — ' + (app.nom || 'le plan') + ' reste ouvert' : '') }
    : FICHIERS.attente ? { niveau: 'att', dit: FICHIERS.attente.nom + ' attend « Charger »' }
    : !n ? { niveau: 'vide', dit: 'aucun plan ouvert : la bibliothèque, ou votre installation' }
    : exemple ? { niveau: 'vide', dit: 'l’exemple embarqué est ouvert — pas votre contrat' }
    : { niveau: 'ok', dit: lies([app.nom === 'Collage' ? 'des lignes collées' : app.nom || 'sans nom', R ? 'ouvert ' + quand(R.t) : '', pluriel(n, 'liaison'), P > 1 ? pluriel(P, 'folio') : '']) };
  const B = app.references, M = B && B.base ? B.base.meta : null, K = typeof BASE !== 'undefined' ? BASE : {};
  E.base = K.lecture ? { niveau: 'att', dit: 'lecture de ' + K.lecture.nom + ' en cours' }
    : err('base') ? { niveau: 'ko', dit: 'le dernier dépôt n’a pas pu être lu' + (B ? ' — la base d’avant reste' : '') }
    : !B || !M ? { niveau: 'vide', dit: 'aucune base dans ce navigateur' }
    : { niveau: 'ok', dit: lies([B.nom || 'base', B.t ? 'déposée ' + quand(B.t) : '', plurielLie(M.harnais, 'harness'), plurielLie(M.dessins, 'dessin'), plurielLie(M.n, 'liaison'), B.pret ? '' : '« Déjà fait » s’indexe']) };
  const nb = (app.bible || []).length; let tb = 0; try { const o = JSON.parse(localStorage.getItem(CLE_BIBLE) || 'null'); tb = o && o.t || 0; } catch (_) { }
  E.bible = err('bible') ? { niveau: 'ko', dit: 'le dernier fichier n’est pas une bible — ' + (app.bibleNom ? app.bibleNom : 'l’embarquée') + ' reste' }
    : { niveau: 'ok', dit: app.bibleNom ? lies([app.bibleNom, tb ? 'importée ' + quand(tb) : '', pluriel(nb, 'référence')]) : lies(['embarquée', pluriel(nb, 'référence')]) };
  const N = app.norme || normeVide(), lignes = TABLES_NORME.reduce((k, t) => k + (N[t] || []).length, 0), mod = typeof tableModifiee === 'function' ? TABLES_NORME.filter(tableModifiee).length : 0;
  E.normes = err('normes') ? { niveau: 'ko', dit: 'le dernier fichier n’a pas été lu comme une norme' }
    : { niveau: 'ok', dit: lies([mod ? lies([pluriel(mod, 'table') + ' modifiée' + (mod > 1 ? 's' : '') + ' dans ce navigateur', app.normeNom, pluriel(lignes, 'ligne')]) : lies(['embarquées', pluriel(TABLES_NORME.length, 'table'), 'rien de modifié']),
        typeof BASE_SEE !== 'undefined' && BASE_SEE.base ? 'base SEE gardée ' + quand(BASE_SEE.base.quand) : ''].filter(Boolean)) };
  const H = app.simu || HYPOTHESES, d = ['longueur', 'courant', 'tension', 'ambiante'].some(k => H[k] !== HYPOTHESES[k]);
  E.hypotheses = { niveau: 'ok', dit: lies([nombre(H.longueur) + ' m par câble sans longueur', nombre(H.courant) + ' A sans disjoncteur', nombre(H.tension) + ' V', nombre(H.ambiante) + ' °C', d ? 'réglées ici' : 'les valeurs de l’outil']) };
  return E; }
/* Une carte. `o` : { cle, titre, une (html : ce qu'elle attend, en une ligne), action: [vf, libelle], zone: [vf, mot] (la zone
   de dépôt, tant que l'entrée est vide), liens: [[vf, libelle]], boites (html), attend: { sous, format, apercu, ensuite,
   gestes: [[vf, libelle]] } } — « Ce que j'attends » se déplie : replié d'office (la ligne et la zone de dépôt disent
   l'essentiel), ouvert sur la carte qu'on vient chercher ; l'outil se souvient de ce qu'on ouvre ou ferme à la main */
function carteHtml(o, etat, focus, primaire) { const ouvert = FICHIERS.volets.has(o.cle) ? FICHIERS.volets.get(o.cle) : focus === o.cle;
  const A = o.attend;
  /* ALLÉGÉ (v73 : « trois zones pointillées et deux « Ce que j'attends » d'un coup » — le designer ; « deux façons d'ouvrir le
     retest l'une sous l'autre » — le technicien) : seule l'entrée qu'on vient chercher (la première qui manque) garde sa
     zone de dépôt, et elle EST son geste (« ou cliquez ») ; les autres gardent leur bouton au trait, et toute l'entrée reçoit
     encore un fichier qu'on y glisse (`data-depot`). */
  const zone = o.zone && etat.niveau !== 'ok' && primaire;
  return `<section class="vf-carte e-${etat.niveau}${o.grande ? ' vf-grande' : ''}${focus === o.cle ? ' vf-vise' : ''}" id="vf-${o.cle}" data-entree="${o.cle}"${o.depot ? ` data-depot="${o.depot}"` : ''} aria-labelledby="vf-t-${o.cle}">`
    + `<div class="vf-tete"><span class="vf-ic">${icoVf(o.cle)}</span><div class="vf-titres"><h3 id="vf-t-${o.cle}">${esc(o.titre)}</h3><div class="vf-etat"><i aria-hidden="true"></i><span class="sr">${{ ok: 'reçu et lu', vide: 'rien', att: 'en attente', ko: 'erreur' }[etat.niveau]} : </span><span>${esc(etat.dit)}</span></div></div>`
    + (o.action && !zone ? `<button class="btn ${primaire ? 'cuivre' : 'papier'} vf-action" data-vf="${o.action[0]}">${esc(o.action[1])}</button>` : '') + '</div>'
    + (o.une ? `<div class="vf-une">${o.une}</div>` : '')
    + (zone ? `<button type="button" class="vf-zone" data-vf="${o.zone[0]}">${icoVf('depot')}<span><b>Glissez ${o.zone[1]} ici</b> ou cliquez</span></button>` : '')
    + (o.liens && o.liens.length ? `<div class="vf-liens">${o.liens.map(([vf, t]) => `<button class="btn lien" data-vf="${vf}">${esc(t)}</button>`).join('')}</div>` : '')
    + (o.boites || '')
    + (A ? `<details class="vf-attend" data-volet="${o.cle}"${ouvert ? ' open' : ''}><summary><span class="vf-attend-t">Ce que j’attends</span><span class="vf-attend-s">${esc(A.sous || 'trois lignes d’exemple, un modèle')}</span>${ico('bas', 'vf-chevron')}</summary><div class="vf-corps">`
      + (A.format ? `<p class="vf-format">${A.format}</p>` : '') + (A.apercu || '')
      + (A.ensuite ? `<p class="vf-ensuite">${A.ensuite}</p>` : '')
      + (A.gestes && A.gestes.length ? `<div class="vf-gestes">${A.gestes.map(([vf, t]) => `<button class="btn papier" data-vf="${vf}">${esc(t)}</button>`).join('')}</div>` : '')
      + '</div></details>' : '') + '</section>'; }
function erreurHtml(k) { const e = FICHIERS.erreurs[k]; if (!e) return '';
  return `<div class="vf-boite vf-erreur"><p>${e.texte}</p>${e.liste && e.liste.length ? `<ul>${e.liste.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}`
    + `<div class="vf-gestes">${(e.gestes || []).map(([vf, t]) => `<button class="btn papier" data-vf="${vf}">${esc(t)}</button>`).join('')}<span class="vf-quand">${quand(e.t)}</span><button class="btn lien" data-vf="oublier-erreur" data-entree="${k}">Effacer ce message</button></div></div>`; }
function avisHtml(k) { const a = FICHIERS.avis[k]; return a ? `<div class="vf-boite vf-avis"><p>${a.texte}</p><ul>${a.liste.map(x => `<li>${x}</li>`).join('')}</ul></div>` : ''; }
/* Le succès d'un dépôt de base : les comptes, ce qui se passe maintenant (et ce qui est rangé dans la bibliothèque), et la
   main qu'on tend. */
function succesBaseHtml() { if (FICHIERS.succes !== 'base' || !app.references || !app.references.base) return ''; const R = app.references, M = R.base.meta, V = verite(), p = V.length && R.pret ? premierDejaFait() : null, G = FICHIERS.rangee;
  return `<div class="vf-boite vf-succes"><p><b>${esc(R.nom || 'La base')}</b> est rangée : ${lies([plurielLie(M.harnais, 'harness'), plurielLie(M.dessins, 'dessin'), plurielLie(M.n, 'liaison')])}. ${R.pret ? 'Chaque fiche dit maintenant ce qui a déjà été fait.' : '« Déjà fait » s’indexe : les fiches le diront dans un instant.'}${G ? ` La bibliothèque compte ${esc(lies([plurielLie(G.installs, 'installation'), plurielLie(G.plans, 'plan')]))} venus d’elle.` : ''}</p>`
    + (p ? `<div class="vf-gestes"><button class="btn cuivre" data-vf="deja-fait">Voir un équipement déjà fait</button><span class="vf-note">${esc(p.nom)} : ${Math.round(p.c.taux * 100)}\u00a0% pareil sur ${esc(p.c.harness)}</span></div>`
      : V.length ? '<p class="vf-note">Aucun équipement du plan ouvert n’a de correspondance dans cette base (ni même part number, ni même code).</p>'
      : '<div class="vf-gestes"><button class="btn cuivre" data-vf="bibliotheque">Voir la bibliothèque</button><span class="vf-note">chaque fiche dira ce qui a déjà été fait</span></div>') + '</div>'; }
function baseSansHarnessHtml() { const B = FICHIERS.base; if (!B) return '';
  return `<div class="vf-gestes vf-base-contrat"><button class="btn papier" data-vf="base-contrat">Ouvrir ${esc(B.nom)} comme un plan (${pluriel(B.liaisons.length, 'liaison')})</button></div>`; }
// oublier la base : la confirmation s'écrit dans la carte (pas une boîte du navigateur)
const oubliBaseHtml = () => FICHIERS.oubli ? '<div class="vf-boite vf-erreur"><p><b>Oublier la base des contrats déjà faits ?</b> Les fiches ne diront plus ce qui a déjà été fait ; il faudra la redéposer. Les plans rangés dans la bibliothèque restent.</p><div class="vf-gestes"><button class="btn vf-danger" data-vf="oublier-base-oui">Oublier la base</button><button class="btn lien" data-vf="oublier-base-non">Garder</button></div></div>' : '';
/* Les six entrées : la bibliothèque d'abord (l'entrée principale), le retest, la base ; puis, sous « Facultatif », ce que
   l'outil embarque déjà — la bible, les normes, les hypothèses. */
function cartesFichiers(focus) { const E = etatsDesFichiers(), V = verite();
  // l'action pleine : celle de l'entrée qu'on vient chercher, sinon de la première qui manque — pas la bibliothèque quand elle est
  // déjà sous les yeux (son geste plein, « Nouvelle installation », y est)
  const surBiblio = typeof bibliothequeOuverte === 'function' && bibliothequeOuverte();
  const primaire = focus && E[focus] && E[focus].niveau !== 'ok' ? focus : E.bibliotheque.niveau !== 'ok' && !V.length ? (surBiblio ? '' : 'bibliotheque') : E.retest.niveau !== 'ok' ? 'retest' : E.base.niveau !== 'ok' ? 'base' : '';
  const nm = TABLES_NORME.length, nb = (app.bible || []).length, id = h => `<b class="id">${h}</b>`;
  // les aperçus : sept colonnes, celles qui comptent — le reste du retest est lu s'il est là
  const colonnes = (M, noms) => noms.map(n => M.entetes.indexOf(n)).filter(i => i >= 0);
  const nonRanges = app.references ? aRanger().length : 0;
  const C = [
    { cle: 'bibliotheque', titre: 'Bibliothèque', depot: 'plans', grande: true, action: ['bibliotheque', 'Ouvrir la bibliothèque'], zone: ['ajouter-plans', 'vos installations'],
      une: `<p><b>Un plan par installation</b>. Ceux qu’on glisse ici vont dans ${esc(guillemets(nomInstallCible()))}.</p>` },
    { cle: 'retest', titre: 'Votre installation', depot: 'retest', grande: true, action: ['ouvrir', 'Ouvrir une installation…'], zone: ['ouvrir', 'l’installation'],
      une: `<p>Un Excel ou un CSV, <b>une ligne par câble</b>, avec au moins ${MODELE_RETEST.requises.map(id).join(POINT)}. Il devient un plan de l’installation ouverte.</p>`,
      liens: [['pdf', 'Un schéma en PDF ? Le lire…'], ...(V.length ? [] : [['exemple', 'Pas de fichier sous la main ? Ouvrir l’exemple']])],
      boites: attenteHtml() + erreurHtml('retest') + avisHtml('retest'),
      attend: { format: 'Les en-têtes sont reconnus par leur nom ; les autres colonnes de l’installation (Harness, PN, Route, FWD, longueur…) sont lues si elles sont là.',
        apercu: apercuHtml(MODELE_RETEST, { label: 'Trois lignes d’exemple de l’installation', colonnes: colonnes(MODELE_RETEST, ['Device1', 'Pin1', 'Cable TG', 'Cable Tag', 'Device2', 'Pin2', 'FWD']) }),
        ensuite: 'Ensuite, les folios se dessinent et chaque câble est jugé. Plusieurs harness : on vous demande lequel ouvrir.',
        gestes: [['modele-retest', 'Modèle (CSV)'], ['coller', 'Coller des lignes…']] } },
    { cle: 'base', titre: 'Contrats déjà faits', depot: 'base', grande: true, action: ['base', app.references ? 'Remplacer…' : 'Déposer la base…'], zone: ['base', 'la base'],
      une: `<p>Le grand fichier de tous vos contrats déjà faits : un seul Excel, <b>une ligne par liaison</b>, et :</p>${clesBaseHtml()}`,
      liens: app.references ? [...(V.length && FICHIERS.succes !== 'base' ? [['deja-fait', 'Voir un équipement déjà fait']] : []), ...(V.length ? [['comparer-contrat', 'Comparer le plan ouvert au déjà-fait']] : []), ...(nonRanges ? [['ranger', 'Ranger ses ' + pluriel(nonRanges, 'harness') + ' dans la bibliothèque']] : []), ['chercher-base', 'Chercher dans la base'], ['oublier-base', 'Oublier la base']] : [],
      boites: oubliBaseHtml() + succesBaseHtml() + erreurHtml('base') + baseSansHarnessHtml() + avisHtml('base'),
      attend: { apercu: apercuHtml(MODELE_BASE, { label: 'Trois lignes d’exemple de la base', colonnes: colonnes(MODELE_BASE, ['Harness', 'FWD', 'Appareil', 'Device1', 'Pin1', 'Device2', 'Pin2']) }),
        ensuite: 'Ensuite, chaque fiche dit « déjà fait sur H175, 92 % pareil » et reprend ce que vous cochez. Une colonne Installation (et ECP) range aussi chaque installation et ses plans dans la bibliothèque. Gardée dans ce navigateur.',
        gestes: [['modele-base', 'Modèle (CSV)']] } },
    { cle: 'bible', titre: 'Bible des barrettes', depot: 'bible', action: ['bible', 'Importer la vôtre…'], liens: [['voir-bible', 'Voir la bible'], ...(app.bibleNom ? [['bible-outil', 'Revenir à la bible de l’outil']] : [])],
      boites: erreurHtml('bible'),
      attend: { sous: pluriel(nb, 'référence') + ' embarquées, un modèle', format: `${id('Référence')} et ${id('Bornes')} au minimum ; les autres colonnes sont reconnues à leur nom.`,
        apercu: apercuHtml(MODELE_BIBLE, { label: 'Trois lignes d’exemple de la bible' }), gestes: [['modele-bible', 'Modèle (CSV)']] } },
    { cle: 'normes', titre: 'Normes', depot: 'normes', action: ['normes', 'Importer une table…'], liens: [['voir-normes', 'Voir les normes'], ['see', 'Lire la base SEE…'], ...(typeof BASE_SEE !== 'undefined' && BASE_SEE.base ? [['see-gardee', 'La base SEE gardée']] : []), ...(app.normeNom ? [['normes-outil', 'Revenir à la norme embarquée']] : [])],
      boites: erreurHtml('normes'),
      attend: { sous: 'une table par bloc, ses gabarits', format: 'Une table par bloc : une ligne de titre, ses en-têtes (un gabarit par table), une ligne par entrée.',
        apercu: apercuHtml(MODELE_NORME, { label: 'Un exemple : la table Réseau' }), gestes: [['gabarit-reseau', 'Gabarit Réseau (CSV)'], ['gabarits', 'Tous les gabarits']] } },
    { cle: 'hypotheses', titre: 'Hypothèses', action: ['hypotheses', 'Régler…'] }];
  return C.map(o => (o.cle === 'bible' ? '<h3 class="vf-groupe">Facultatif<span>l’outil a les siens</span></h3>' : '') + carteHtml(o, E[o.cle], focus, primaire === o.cle)).join(''); }
function fichiersHtml(focus) { return tete('Ce que l’outil a reçu', 'Vos fichiers')
  + '<p class="vf-lead">Vos installations suffisent pour commencer : glissez un fichier sur son entrée, ou n’importe où.</p>'
  + `<div class="vf-cartes">${cartesFichiers(focus)}</div>`; }
/* Ouvrir « Vos fichiers », sur une carte (`focus`) s'il y a lieu : elle vient sous les yeux, son volet ouvert. */
function ficheFichiers(focus) { const deja = app.fiche && app.fiche.mode === 'fichiers', y = deja ? $('fiche-corps').scrollTop : 0;
  if (focus) FICHIERS.volets.delete(focus);
  ouvrirFiche({ mode: 'fichiers', large: true, focus: focus || '' }, fichiersHtml(focus || ''), '');
  lierFichiers(); const c = $('fiche-corps');
  if (focus) { const el = $('vf-' + focus); if (el) { c.scrollTop = 0; c.scrollTop = Math.max(0, el.getBoundingClientRect().top - c.getBoundingClientRect().top - 8); } }
  else if (deja) c.scrollTop = y; }
/* Refaire « Vos fichiers » sur place (après un dépôt, une erreur) — la lecture reste où elle était. */
function rendreFichiers() { if (typeof document === 'undefined' || !(app.fiche && app.fiche.mode === 'fichiers')) return;
  const c = $('fiche-corps'), y = c.scrollTop; c.innerHTML = fichiersHtml(app.fiche.focus || ''); c.scrollTop = y; }
/* Les gestes, posés une fois sur le corps des documents (il se refait souvent). */
function lierFichiers() { if (FICHIERS.lie) return; FICHIERS.lie = true; const c = $('fiche-corps');
  c.addEventListener('toggle', e => { const d = e.target; if (d && d.matches && d.matches('details.vf-attend') && app.fiche && app.fiche.mode === 'fichiers') FICHIERS.volets.set(d.dataset.volet, d.open); }, true);
  // « Corriger » : une colonne prend un rôle (celle qui l'avait le perd), l'aperçu se refait
  c.addEventListener('change', e => { const s = e.target; if (!(app.fiche && app.fiche.mode === 'fichiers') || !FICHIERS.attente || !(s && s.closest && s.closest('.vf-carte-cols'))) return;
    const A = FICHIERS.attente, i = +s.dataset.colonne;
    ROLES.forEach(([k]) => { if (A.map[k] !== '' && A.map[k] != null && +A.map[k] === i) A.map[k] = ''; }); if (s.value) A.map[s.value] = i; A.devine = true; rendreFichiers(); });
  c.addEventListener('click', e => { if (!(app.fiche && app.fiche.mode === 'fichiers')) return; const b = e.target.closest && e.target.closest('[data-vf]'); if (!b) return; const k = b.dataset.vf;
    const faire = {
      ouvrir: () => $('fichier').click(), pdf: () => choisirPdf(), coller: ficheColler, exemple: () => ouvrirExemple(), base: choisirBase, bible: () => $('fichier-bible').click(), normes: () => $('fichier-normes').click(), see: () => $('fichier-see').click(), 'see-gardee': () => ficheBaseSEE(), hypotheses: ficheHypotheses,
      'modele-retest': () => telechargerModele('retest'), 'modele-base': () => telechargerModele('base'), 'modele-bible': () => telechargerModele('bible'),
      'gabarit-reseau': () => telechargerGabaritNorme('reseau'), gabarits: () => { NORMES.guide = true; ficheNormes(); },
      'voir-bible': () => ficheBible(''), 'voir-normes': () => ficheNormes(),
      // chercher dans la base : la recherche de la bibliothèque, qui cherche partout (08-bibliotheque)
      'chercher-base': () => { fermerFiche(); montrerBibliotheque('racine'); setTimeout(() => { const q = $('bi-q'); if (q) q.focus(); }, 30); },
      'comparer-contrat': () => ficheDejaFaitContrat(),
      'bible-outil': () => { adopterBible(bibleExemple(), ''); rendreFichiers(); dire('La bible de l’outil est rétablie.'); },
      'normes-outil': () => { adopterApports(apportsVides(), 'retour à la norme embarquée'); rendreFichiers(); dire('Norme embarquée rétablie.'); },
      'oublier-base': () => { FICHIERS.oubli = true; rendreFichiers(); }, 'oublier-base-non': () => { FICHIERS.oubli = false; rendreFichiers(); },
      'oublier-base-oui': () => { FICHIERS.oubli = false; adopterReferences([], ''); FICHIERS.succes = null; FICHIERS.rangee = null; rendreFichiers(); dire('La base des contrats déjà faits est oubliée.'); },
      bibliotheque: () => { fermerFiche(); montrerBibliotheque('racine'); }, 'ajouter-plans': () => $('fichier-plans').click(),
      ranger: () => { fermerFiche(); ouvrirRanger(); },
      'deja-fait': voirDejaFait, charger: chargerRattrapage, corriger: () => { FICHIERS.corriger = !FICHIERS.corriger; rendreFichiers(); },
      abandonner: () => { FICHIERS.attente = null; FICHIERS.corriger = false; rendreFichiers(); },
      'oublier-erreur': () => { effacerErreur(b.dataset.entree); rendreFichiers(); },
      'base-contrat': () => { const B = FICHIERS.base; if (!B) return; FICHIERS.base = null; effacerErreur('base'); chargerContrat(B.liaisons, 'ouverture de ' + B.nom, B.nom, { nouveau: true }); contratRecu(B.nom, 'retest');
        dire(pluriel(B.liaisons.length, 'liaison') + ' de ' + guillemets(B.nom) + ', ouvert comme un plan.'); }
    }[k];
    if (faire) { e.preventDefault(); faire(); } }); }
// les entrées cachées de « Vos fichiers » (et de la bibliothèque) : la base, une norme ; la bible a la sienne (page.html), les plans aussi (08-bibliotheque)
function lierEntreesFichiers() { const f = (id, fn) => { const el = $(id); if (el && !el.dataset.lie) { el.dataset.lie = '1'; el.addEventListener('change', e => { const x = e.target.files && e.target.files[0]; if (x) fn(x); e.target.value = ''; }); } };
  f('fichier-base', importerReferences); f('fichier-normes', importerNorme); f('fichier-see', lireBaseSEE);
  const t = $('toast'); if (t && !t.dataset.lie) { t.dataset.lie = '1'; t.addEventListener('mouseenter', () => clearTimeout(toastT)); t.addEventListener('mouseleave', () => { if (t.classList.contains('on') && !TOAST.erreur) toastT = setTimeout(() => t.classList.remove('on', 'action'), 2500); }); } }
