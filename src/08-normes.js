/* ===========================================================================
   08 octies — LES NORMES : importer, classer, modifier ; et la bible des barrettes
   ---------------------------------------------------------------------------
   Le lecteur : « importer toutes les normes que j'ai pas faites, barrette, prise de coupure, raccord, disjoncteur,
   tout ; tout doit être modifiable et facilement ; trier et classer hyper bien pour bien comprendre ; pouvoir les
   mettre automatiques, pas automatiques, comment c'est choisi, comment ça marche, qu'est-ce que ça vérifie ».
     · LA PAGE « NORMES » (`ficheNormes`) : toutes les tables du moteur (TABLES_NORME) classées par DOMAINE (barrettes, prises et
       connecteurs, contacts, câbles et fils, chute et réseau, disjoncteurs, raccords, contrats faits), chacune avec
       ce qu'elle sert, qui la lit (quelle fiche, quel contrôle), comment une ligne se choisit (automatique, et le geste
       manuel qui passe devant), ses colonnes expliquées, et la table elle-même, triable, filtrable ; une recherche
       dans toutes les tables (une référence, un part number, une jauge).
     · L'IMPORT (`importerNorme`, `importerNormeTexte`) : un Excel (une feuille = une ou plusieurs tables), un CSV, un
       texte collé ; chaque bloc reconnu à son en-tête est PRÉVISUALISÉ — la table cible (à changer quand l'outil
       hésite), les colonnes reconnues et les autres (qu'on peut attribuer à la main), combien de lignes sont
       nouvelles, remplacent, sont identiques — avant d'être ADOPTÉ.
     · LA MODIFICATION (`modifierLigneNorme`…) : double-clic ou « Modifier », les cellules deviennent des champs,
       Entrée valide, Échap annule ; ajouter, dupliquer, supprimer ; Ctrl+Z défait (tant que la page a le focus) ;
       « Revenir à l'embarquée » table par table ; export de n'importe quelle table en CSV, et de toutes les
       modifications en un fichier ; un gabarit CSV par table.
     · LA COUCHE DU NAVIGATEUR (`NORMES.apports`, 09 : `normeAvecApports`) : rien de ce qui est importé ou modifié ne
       touche aux fichiers embarqués ; la norme active = l'embarquée, moins les lignes supprimées, fusionnée avec les
       apports (localStorage). Chaque changement est repris aussitôt par les fiches, le plan et le contrôle.
     · LA BIBLE DES BARRETTES (`ficheBible`, venue de 08) : les références, chacune en petit et, dépliée sous sa ligne,
       en grand ; la base des contrats déjà faits (08 sexies) ; et avec elle la persistance de la bible, de la norme et
       des hypothèses. Normes et Bible sont deux onglets d'un même document : même largeur, même gabarit (`.nm`).
   =========================================================================== */
'use strict';

const CLE_BIBLE = 'atelier.bible.v1', CLE_NORME = 'atelier.norme.v1', CLE_SIMU = 'atelier.simu.v1', CLE_APPORTS = 'atelier.normes.v2';
/* ce que la page garde d'une ouverture à l'autre : les apports (la couche), l'embarquée lue une fois, l'historique
   local (Ctrl+Z), les tables dépliées, leurs filtres et leurs tris, la recherche, l'import en cours, la ligne en
   édition, les colonnes dépliées, les tables montrées en entier, les lignes masquées montrées */
const NORMES = { apports: apportsVides(), embarquee: null, hist: [], ouverts: new Set(), filtres: {}, tris: {}, q: '', import: null, edition: null, colonnes: new Set(), entier: new Set(), masquees: new Set(), guide: false, lie: false };
const MAX_LIGNES_NORME = 120, MAX_HIST_NORMES = 40;

/* ---- la persistance : la bible, la norme, les hypothèses ------------------- */
/* La bible, et avec elle la norme et les hypothèses de simulation : ce que ce navigateur a gardé, sinon ce qui est
   embarqué. Les modules de la norme active sont en tête de la bible (une variante modifiée s'y voit). */
function relireBible() { relireNorme(); relireSimu();
  try { const o = JSON.parse(localStorage.getItem(CLE_BIBLE) || 'null'); if (o && o.entrees && o.entrees.length) { app.bible = avecModules(o.entrees.map(entreeBible).filter(Boolean), app.norme); app.bibleNom = o.nom || ''; return true; } } catch (_) { }
  app.bible = avecModules(bibleExemple(), app.norme); app.bibleNom = ''; return false; }
/* Une autre bible : les références sous les barrettes changent, la carte de la barrette choisie aussi, et la fiche de
   la bible si elle est ouverte. */
function adopterBible(entrees, nom) { app.bible = avecModules(entrees, app.norme); app.bibleNom = nom || '';
  try { localStorage.setItem(CLE_BIBLE, JSON.stringify({ entrees, nom: app.bibleNom, t: Date.now() })); } catch (_) { }
  peindre(); rallumer(); rafraichirBase(); if (app.fiche && app.fiche.mode === 'bible') ficheBible(app.fiche.ref); }
/* La norme : l'embarquée, et par-dessus les apports gardés dans ce navigateur (la couche v2). Une norme entière gardée
   par l'ancien mécanisme (v1, qui remplaçait l'embarquée) n'est plus lue : elle se réimporte, et se voit alors ligne
   par ligne. */
function relireNorme() { NORMES.embarquee = normeEmbarquee(); let A = null;
  try { const o = JSON.parse(localStorage.getItem(CLE_APPORTS) || 'null'); if (o && o.tables) A = o; } catch (_) { }
  try { if (localStorage.getItem(CLE_NORME)) { localStorage.removeItem(CLE_NORME); NORMES.ancienne = true; } } catch (_) { }
  NORMES.apports = A || apportsVides(); app.norme = normeAvecApports(NORMES.embarquee, NORMES.apports); app.normeNom = nomDesApports(NORMES.apports); return !!A; }
const normeEmbarqueeLue = () => NORMES.embarquee || (NORMES.embarquee = normeEmbarquee());
/* Le nom de ce qui est importé ou modifié : les fichiers, et « modifiée ici » pour ce qui l'a été à la main. */
function nomDesApports(A) { const sources = new Set(), tables = []; let main = false;
  TABLES_NORME.forEach(t => { const T = apportsDeTable(A, t); if ((T.lignes || []).length || (T.supprimees || []).length) tables.push(t); (T.lignes || []).forEach(l => { if (l.source && l.source !== 'main') sources.add(l.source); else main = true; }); if ((T.supprimees || []).length) main = true; });
  if (!tables.length) return ''; return [...sources, ...(main ? ['modifiée ici'] : [])].join(' + '); }
/* Une norme lue ailleurs (un CSV, un test) adoptée d'un coup : ses lignes deviennent des apports sous ce nom. */
function adopterNorme(norme, nom) { const A = JSON.parse(JSON.stringify(NORMES.apports)); if (!nom) { adopterApports(apportsVides(), 'retour à la norme embarquée'); return; }
  TABLES_NORME.forEach(t => (norme && norme[t] || []).forEach(x => poserApport(A, t, brutDe(t, x), nom)));
  adopterApports(A, 'import de ' + nom); }
/* LA COUCHE change : la norme active se recalcule, se garde, et tout ce qui la lit se refait — la bible (ses
   modules), le plan (les références sous les barrettes), le tableau, le contrôle (sa clé oublie la norme : on la
   vide), la fiche ouverte, et la page des normes. `quoi` : ce que Ctrl+Z défera. */
function adopterApports(A, quoi, sansHistorique) { if (!sansHistorique) { NORMES.hist.push({ quoi: quoi || 'modification des normes', apports: JSON.stringify(NORMES.apports) }); if (NORMES.hist.length > MAX_HIST_NORMES) NORMES.hist.shift(); }
  NORMES.apports = A; A.t = Date.now(); app.norme = normeAvecApports(normeEmbarqueeLue(), A); app.normeNom = nomDesApports(A);
  try { if (app.normeNom) localStorage.setItem(CLE_APPORTS, JSON.stringify(A)); else localStorage.removeItem(CLE_APPORTS); } catch (_) { dire('Le navigateur refuse d’enregistrer les normes (navigation privée ?) : elles tiennent tant que l’onglet est ouvert.', true); }
  rafraichirApresNorme(); }
function rafraichirApresNorme() { if (typeof document === 'undefined') return;
  app.bible = avecModules((app.bible || []).filter(e => !e.module), app.norme);
  if (typeof CONTROLE !== 'undefined') CONTROLE.cle = null;
  peindre(); rallumer(); rafraichirBase(); if (typeof rendreControle === 'function') rendreControle(); rafraichirCarte();
  if (app.fiche && app.fiche.mode === 'bible') ficheBible(app.fiche.ref); else if (app.fiche && app.fiche.mode === 'normes') rendreNormes(); }
/* Défaire le dernier changement des normes (l'historique local de la page, pas celui du contrat). */
function defaireNormes() { const p = NORMES.hist.pop(); if (!p) return null; adopterApports(JSON.parse(p.apports), '', true); return p.quoi; }
/* Poser une ligne brute dans la couche : elle remplace l'apport de même clé, lève une suppression de même clé, et ne
   s'écrit pas si l'embarquée dit déjà la même chose. Rend la clé, ou null si la ligne est incomplète. */
function poserApport(A, table, brut, source) { const x = ENTREE_NORME[table](brut); if (!x) return null; const k = cleDeLigne(table, x), T = A.tables[table] || (A.tables[table] = { lignes: [], supprimees: [] });
  T.lignes = T.lignes.filter(l => { const y = ENTREE_NORME[table](l.brut); return !y || cleDeLigne(table, y) !== k; }); T.supprimees = (T.supprimees || []).filter(c => c !== k);
  const e = (normeEmbarqueeLue()[table] || []).find(y => cleDeLigne(table, y) === k); if (!(e && memeLigne(e, x))) T.lignes.push({ brut, source: source || 'main', t: Date.now() });
  return k; }
/* Retirer une ligne de la norme active : l'apport de cette clé s'en va ; une ligne embarquée se masque. */
function retirerApport(A, table, k) { const T = A.tables[table] || (A.tables[table] = { lignes: [], supprimees: [] });
  T.lignes = T.lignes.filter(l => { const y = ENTREE_NORME[table](l.brut); return !y || cleDeLigne(table, y) !== k; });
  if ((normeEmbarqueeLue()[table] || []).some(y => cleDeLigne(table, y) === k) && !T.supprimees.includes(k)) T.supprimees.push(k); }
const nettoyerApports = A => { TABLES_NORME.forEach(t => { const T = A.tables[t]; if (T && !(T.lignes || []).length && !(T.supprimees || []).length) delete A.tables[t]; }); return A; };
/* Les hypothèses de la simulation : une commodité de ce navigateur. */
function relireSimu() { app.simu = { ...HYPOTHESES };
  try { const o = JSON.parse(localStorage.getItem(CLE_SIMU) || 'null'); if (o && typeof o === 'object') app.simu = { ...HYPOTHESES, ...o, conditions: Array.isArray(o.conditions) ? o.conditions : HYPOTHESES.conditions }; } catch (_) { } }
function memoriserSimu() { try { localStorage.setItem(CLE_SIMU, JSON.stringify(app.simu)); } catch (_) { } }

/* ---- ce que chaque table est, pour un bureau d'études ------------------------ */
/* Par DOMAINE, les VUES : une vue est une table, parfois filtrée (les modules de barrette d'un côté, les arrangements
   de connecteur de l'autre), avec ce qu'une ligne ajoutée depuis cette vue porte d'office (`defaut`). */
const VUES_NORMES = {
  'modules:barrette': { table: 'modules', titre: 'Modules de jonction', garde: m => m.emploi === 'barrette', defaut: { emploi: 'barrette' } },
  'modules:connecteur': { table: 'modules', titre: 'Arrangements de connecteur', garde: m => m.emploi === 'connecteur', defaut: { emploi: 'connecteur' } },
  'tailles:barrette': { table: 'tailles', titre: 'Tailles de contact (barrettes)', garde: t => !famillesDeModules(app.norme, 'connecteur').includes(t.famille) },
  'tailles:connecteur': { table: 'tailles', titre: 'Tailles de contact (connecteurs)', garde: t => famillesDeModules(app.norme, 'connecteur').includes(t.famille) },
  'familles:barrette': { table: 'familles', titre: 'Familles (barrettes)', garde: f => f.nature === 'jonction' || f.nature === 'blindage', defaut: { nature: 'jonction' } },
  'familles:connecteur': { table: 'familles', titre: 'Familles (prises et connecteurs)', garde: f => f.nature === 'coupure' || f.nature === 'connecteur', defaut: { nature: 'coupure' } },
  // les accessoires des barrettes (butées, séparateurs…) d'un côté, ceux des connecteurs (les cheminées de l'EN 4165) de l'autre
  'accessoires:barrette': { table: 'accessoires', titre: 'Accessoires (barrettes)', garde: a => !famillesDeModules(app.norme, 'connecteur').includes(a.famille) },
  'accessoires:connecteur': { table: 'accessoires', titre: 'Accessoires des connecteurs (cheminées EN 4165)', garde: a => famillesDeModules(app.norme, 'connecteur').includes(a.famille) }
};
const vueDe = v => VUES_NORMES[v] || { table: v, titre: TITRES_NORME[v], garde: null, defaut: null };
const DOMAINES_NORMES = [
  { id: 'barrettes', titre: 'Barrettes et modules de jonction', sens: 'Une barrette du contrat se pose en modules ASNE 0599 ou NSA937901 : chaque potentiel prend un groupe de contacts reliés, chaque fil un contact qui admet sa jauge.', vues: ['modules:barrette', 'tailles:barrette', 'familles:barrette', 'accessoires:barrette'] },
  { id: 'prises', titre: 'Prises de coupure et connecteurs', sens: 'Un connecteur d’équipement ou une prise de coupure reçoit un arrangement (EN 4165, EN 2997, EN 3645, EN 3646, ASNE 0059) : chaque borne est le contact de même numéro ou de même rang.', vues: ['modules:connecteur', 'tailles:connecteur', 'familles:connecteur'] },
  { id: 'contacts', titre: 'Contacts à sertir', sens: 'Sur chaque fil d’un connecteur ou d’une barrette, le contact à sertir et son accessoire (tables SEE, relues par R1 ; les broches EN 3155-016 des barrettes) ; par taille, la résistance d’une paire et le courant par fût et par jauge ; ce qui entoure le contact : le joint arrière, l’outillage, les obturateurs, les parties de l’EN 3155.', vues: ['contacts', 'resistancesContacts', 'courantsContacts', 'joints', 'outillages', 'obturateurs', 'partiesEN3155'] },
  { id: 'cables', titre: 'Câbles et fils', sens: 'Le câble de chaque fil du retest (la base des câbles), le conducteur de sa famille, et ce qu’une jauge admet (EN 2853).', vues: ['cables', 'cablesFamilles', 'fils'] },
  { id: 'chute', titre: 'Chute, réseau et déclassement', sens: 'Ce que le réseau admet de chute en ligne, et ce qui réduit l’intensité admissible d’un fil (faisceau, altitude).', vues: ['reseau', 'declassements'] },
  { id: 'disjoncteurs', titre: 'Disjoncteurs', sens: 'Les courbes de disjonction qui jugent un profil de charge, ce qu’un fil supporte avant que le disjoncteur s’ouvre (la protection par jauge, la courbe de dommage), les familles, ce qu’elles garantissent de tenir et leur chute propre.', vues: ['disjoncteurs', 'protections', 'dommages', 'disjoncteursFamilles', 'calibrations', 'chutesDisjoncteurs'] },
  { id: 'raccords', titre: 'Raccords, gaines, colliers, manchons', sens: 'Ce qui englobe un connecteur, par le tutoriel du lecteur corrigé par R3 : le toron (le facteur TE selon le nombre de câbles), la taille et la classe du boîtier, le raccord EN 3660 (sa désignation construite, sa masse) ou la cheminée de l’EN 4165, le code d’entrée (la plage de toron de la norme), la chambre, la bande, la gaine, le manchon.', vues: ['raccords', 'torons', 'entrees', 'chambres', 'massesRaccords', 'classes', 'manchons', 'gaines', 'colliers', 'filetages', 'accessoires:connecteur'] },
  { id: 'contrats', titre: 'Contrats déjà faits', sens: 'La base des harness déjà câblés (un retest de plusieurs harness) : « Déjà fait » sur chaque fiche, la comparaison, le FWD dessiné. Elle se dépose dans « Vos fichiers » (menu ⋮ → Contrats déjà faits…) et se cherche depuis la bible.', vues: [] }
];
/* Pour chaque table : d'où elle vient, à quoi elle sert dans l'outil, qui la lit, comment une ligne se choisit. */
const FICHES_TABLES = {
  modules: { source: 'ASNE 0599 (p. 8-11), NSA937901 (fig. 13-15), EN 4165-002, EN 2997-002, EN 3645-002, EN 3646-002, ASNE 0059', sert: 'C’est elle qui dit quels modules et quels arrangements existent : chaque barrette se remplit avec, chaque connecteur ou prise de coupure reçoit un arrangement.',
    lue: 'la fiche d’une barrette (variante, face, groupes), d’une prise de coupure et d’un connecteur (arrangement, face), le relief, la nomenclature, la bible',
    choix: 'automatique : la variante que le part number nomme, sinon celle qui loge le plus de potentiels en perdant le moins de contacts (usage « normal » préféré) ; pour un connecteur, le plus petit arrangement qui loge toutes les bornes avec leurs jauges — manuelle : « Changer » sur la fiche (une variante, une norme)' },
  tailles: { source: 'plages usuelles des contacts EN 3155 ; les titres des figures NSA937901 — à confirmer ; EN 4165 23 et E0599 20 corrigées par R1 (TE DMC-M, Air LB)', sert: 'Les jauges AWG qu’un contact de cette taille reçoit, quand la table Contacts ne connaît pas la taille (EN 3645 8T, NSA937901 22 aluminium).',
    lue: 'le remplissage des modules (un fil refusé par son contact), la taille de contact d’une jauge pour la résistance de contact (chute en ligne)', choix: 'automatique : la famille et la taille exactes, sinon la taille sans famille' },
  familles: { source: 'EN 2997, EN 3645, EN 3646, EN 4165, ASNE 0059, ASNE 0599, NSA937901 ; la prise EN3646 d’exemple (norme-exemple.csv, chiffres inventés)', sert: 'Ce qu’un contact admet (jauges, intensité, résistance), combien de fils par côté, la règle de remplissage : c’est elle qui juge la jauge de chaque fil d’une barrette ou d’une prise hors modules.',
    lue: 'la carte d’une barrette ou d’une prise (trous, règle, verdicts), la simulation (I contact, R contact), la chute en ligne (la résistance de contact des prises traversées)', choix: 'automatique : la famille la plus longue dont le nom commence la référence (EN3646A6083AAN → EN3646) ; la bible peut nommer la famille' },
  contacts: { source: 'tables SEE Electrical Equipment Definition (EN2997 v6, EN3645 v2, EN3646 v13, EN4165 v49), relues par la recherche R1 (octobre 2026) ; les contacts des barrettes NSA937901 et E0599 (EN 3155-016) et des tailles 23 (EN 4165) et 10 (EN 3645) ajoutés par R1 (catalogues Air LB, TE, Carlisle)', sert: 'Le contact à sertir sur chaque fil, et son accessoire — c’est elle qui juge la jauge de chaque fil d’un connecteur et d’une barrette. Une ligne « à confirmer » : une référence qu’aucune source publique ne vérifie (Airbus, Airbus Helicopters, fournisseur) ou un des points à relire de R1.',
    lue: 'la fiche d’un connecteur, d’une prise et d’une barrette (le contact de chaque fil, « à sertir »), la fiche d’un fil (le contact à chaque bout), la nomenclature (avec son statut), le contrôle (un fil qu’aucun contact ne reçoit, un fil CCA sur un contact cuivre)', choix: 'automatique : la ligne la plus précise gagne — le type de fil exact avant « * », la jauge exacte avant « * » ; entre deux arrangements, le moins accommodant (sans fourreau) ; une barrette : ses broches (sexe M) — manuelle : le sexe des contacts, « Changer » sur la fiche ; une ligne importée remplace celle de mêmes norme, sexe, taille, type et jauge', manque: 'la relecture des 11 points de R1 et des 59 références non publiques (la liste : phase5/H/a-relire.md) ; la taille 22 de l’EN 2997 (EN 3155-078/-079 : référence complète non publique) ; le contact aluminium de l’EN 4165 et de la NSA937901 22' },
  resistancesContacts: { source: 'AS39029 / MIL-DTL-39029 (mêmes tailles que l’EN 3155), confirmées sur la fiche Amphenol 38999 p. 18 (recherche R1 : la taille 8 à 0,57 mΩ, 23, 4 et 0 ajoutées), pour les prises et connecteurs ; Amphenol Air LB (NSA937901, E0599 — NF/UTE C 93-462) pour les modules de jonction', sert: 'La résistance d’une paire de contacts par taille et par emploi : elle entre dans la chute en ligne de chaque prise traversée, et deux fois pour une barrette (les lignes « jonction », bien plus basses).',
    lue: 'la chute en ligne (fiche d’un disjoncteur, fiche d’un fil), la simulation d’une barrette ou d’une prise, le courant du contact (fiche et contrôle d’un disjoncteur)', choix: 'automatique : les lignes de l’emploi (barrette = jonction, prise ou connecteur = connecteur) — la taille du contact (par la jauge du fil), sinon la même sans lettre (22D → 22), sinon la plus proche ; les lignes d’un autre emploi seulement quand celui-ci n’en a aucune' },
  courantsContacts: { source: 'AS39029 (courant d’essai nominal), EN 3155-076/-077 (Radiall), TE Deutsch pour l’EN 2997 (recherche R3) ; Amphenol EN3155 p. 9 et 38999 p. 18 (recherche R1, octobre 2026 : les fûts 18 et 14 du contact 12, le 26 AWG sur un 20…)', sert: 'Ce qu’un contact porte avec le fil serti dedans : un 26 AWG dans un contact 20 porte 2 A, pas 7,5 ; un 18 AWG dans un contact 12 porte 7,5 A au fût 18, 10 A au fût 14.',
    lue: 'le courant du contact de chaque fil nourri par un disjoncteur (fiche et contrôle : le permanent et le calibre contre le contact), `intensiteDuContactPose` pour un fil posé', choix: 'automatique : la taille du contact (celle du plan, sinon par la jauge), la jauge exacte du fil, et le fût lu dans la référence EN 3155 du contact (EN3155-018M1218 → 18) — sans fût, la ligne la plus prudente ; sans ligne pour la jauge, le courant nominal de la taille', manque: 'les appelants qui ne donnent que la taille (le contrôle et la fiche d’un disjoncteur) : la jauge et le fût du fil posé y sont à passer' },
  cables: { source: 'l’onglet Câbles de l’Excel du lecteur, vérifié contre les fiches Lynxeo', sert: 'La base des câbles : le câble de chaque fil du retest (brins, blindage, masse, résistance, diamètre, section) — c’est elle qui donne la résistance de la chute en ligne et le toron de chaque connecteur.',
    lue: 'la fiche d’un fil (câble), la chute en ligne (ρ du câble), « autour » de chaque connecteur (toron, raccord, collier, gaine), la nomenclature (masse), le contrôle (un type inconnu de la base)', choix: 'automatique : le type tel quel (DR24), sinon sa famille et sa jauge (« dr 24 » → DR24)' },
  cablesFamilles: { source: 'EN 2267-010, EN 2714-013, ABS 0949, ABS 1356, EN 3375, EN 4604 (recherche d’octobre 2026)', sert: 'Le conducteur d’une famille (cuivre, aluminium cuivré, aluminium) : un câble qui n’est pas en cuivre ne prend jamais la ligne cuivre de l’EN 2853, et son intensité se déclasse.',
    lue: 'la chute en ligne et la simulation (la résistance d’un fil), la fiche d’un fil', choix: 'automatique : la famille lue en tête du type (DR24 → DR)' },
  fils: { source: 'EN 2853:2005, tables 1 et 2', sert: 'Par jauge, ce qu’un fil admet (en continu, 2 s, 10 s, 1 min) et sa résistance : c’est elle qui juge le courant de chaque fil et nourrit la chute.',
    lue: 'la fiche d’un fil (admet), la fiche d’un disjoncteur (chaque fil contre le profil), la simulation d’une barrette ou d’une prise, le contrôle (un fil qui ne tient pas)', choix: 'automatique : le type et la jauge exacts, sinon la ligne « * » de la jauge, sinon la jauge seule (et la fiche le dit) — jamais la jauge seule pour un conducteur qui n’est pas du cuivre' },
  reseau: { source: 'AC 43.13-1B table 11-6 (FAA) — en attendant les règles du programme (ABD0100)', sert: 'La chute de tension admise par tension du réseau : c’est elle qui juge la chute de chaque fil et de chaque chemin.',
    lue: 'la chute en ligne (fiche d’un disjoncteur, d’un fil), la simulation', choix: 'automatique : la ligne de la tension d’hypothèse, sinon la plus proche ; en triphasé, la ligne de la tension composée (115 → 200 V)' },
  declassements: { source: 'AC 43.13-1B fig. 11-5 (43 points lus, ±0,02) et 11-6 (12 points, ±0,01) (FAA) — les mêmes figures que l’AS50881 / MIL-W-5088', sert: 'Les facteurs qui réduisent l’intensité admissible d’un fil : le faisceau (fils × charge), l’altitude.',
    lue: 'la simulation (chaque condition est une case à cocher dans les hypothèses), la fiche d’un fil, la fiche d’un disjoncteur', choix: 'automatique : les conditions cochées dans les hypothèses ; le faisceau prend la colonne de charge la plus proche puis le point exact du nombre de fils, sinon interpole en log(fils) entre les deux points qui l’encadrent (un fil = 1,0) ; l’altitude interpole' },
  disjoncteurs: { source: 'ETA483 : l’Excel du lecteur (feuille Base_de_données) = la fiche E-T-A 483 à 1-4 % près ; 2TC, 6TC, 5TC, 7274, EN2495 : les tracés vectoriels des fiches Sensata et Crouzet (±3 % sur le multiple)', sert: 'Les courbes de disjonction, par famille : c’est elles qui disent si un profil de charge déclenche le disjoncteur.',
    lue: 'la fiche d’un disjoncteur (le graphique, le verdict, le calibre idéal), le contrôle (un disjoncteur qui déclenche)', choix: 'automatique : toutes les courbes de la famille ; le verdict sur la plus rapide (125 °C), la marge sur les autres ; entre deux points, interpolation log-log, en enveloppe' },
  protections: { source: 'AC 43.13-1B table 11-3 (relue sur l’image de la page 11-15 : rien en 1 et 0 AWG pour le disjoncteur)', sert: 'Le calibre maximal du disjoncteur par jauge de fil, et la taille de contact courante d’une jauge.',
    lue: 'la fiche et le contrôle d’un disjoncteur (le calibre contre le maximum de chaque fil nourri : « table 11-3 »), la taille de contact d’une jauge (chute en ligne) quand la table Tailles l’ignore', choix: 'automatique : la jauge du fil', manque: 'rien pour le 24 et le 26 AWG (la table commence au 22) ; la règle du programme (ABD0100) remplacerait la FAA' },
  disjoncteursFamilles: { source: 'Sensata (2TC, 3TC, 6TC, 9TC, 5TC, 7274), feuilles MS (MS3320N, MS22073M, MS14153C, MS14154D), Crouzet (84 406, 84 417), E-T-A (483), titres DIN pour les EN (recherches R2 et R5)', sert: 'Ce qu’une famille de disjoncteurs est : la norme, les pôles, la gamme de calibres, l’ambiante admise, la courbe à prendre, et les motifs de part number qui la nomment.',
    lue: 'la fiche d’un disjoncteur (le calibre lu en queue du part number, la famille de courbes qui juge), le contrôle, la sélectivité (le calibre nominal des voisins)', choix: 'automatique : le premier motif qui commence le part number (« MS3320 » pour MS3320-10 et MS3320L-5, « 2TC » pour 2TC2-10) ; le calibre en queue s’il est de la gamme ; la colonne Courbe dit la famille de courbes — un part number inconnu prend ETA483', manque: 'confirmer avec le lecteur que ses MS3320 sont des E-T-A 483 (les courbes de sa feuille) et non des Klixon 2TC2 (plus lents à −54 °C)' },
  chutesDisjoncteurs: { source: 'feuilles MS3320N / MS22073M / MS14154D / MS14153C (table I), Sensata, E-T-A (recherche R5)', sert: 'La chute propre du disjoncteur à son courant nominal : 1,1 V à 1 A, 0,25 V à 15-25 A — du même ordre que la chute admise d’un réseau 28 V. Elle compte dans la chute en ligne, au prorata I / In (le bilame est plus froid sous In : c’est prudent).',
    lue: 'la chute en ligne depuis un disjoncteur (sa fiche : « dont 0,14 V dans le disjoncteur », la fiche d’un fil, le contrôle)', choix: 'automatique : la famille du part number (sinon sa famille de courbes) et le calibre retenu — manuelle : l’hypothèse « compter la chute du disjoncteur » l’ôte', manque: 'la règle du programme (ABD0100) : la chute se mesure-t-elle depuis le bus amont (avec le disjoncteur, l’AC 43.13-1B) ou depuis le bus aval ?' },
  calibrations: { source: 'Sensata 2TC/3TC/7274/6TC/9TC/5TC, les feuilles MS3320N, MS22073M, MS14153C, MS14154D, Crouzet, E-T-A, Safran 170', sert: 'Les points normalisés des disjoncteurs thermiques — ce qu’ils GARANTISSENT de tenir une heure (« Tient »), ce qui déclenche, les temps à 200, 500, 1000 % de In. Le permanent d’un profil doit rester sous ce que la famille garantit à la température max du tableau : un MS3320 ne garantit que 0,80 In à 121 °C, quand la courbe typique dirait 0,92.',
    lue: 'la fiche et le contrôle d’un disjoncteur : le verdict du permanent, la marge, le meilleur calibre (recherche R2 règle 4)', choix: 'automatique : les lignes de la famille du part number (son nom, sinon une ligne qui commence par lui ou le contient), sinon celles de sa famille de courbes ; à chaque température la plus prudente des lignes ; entre deux températures, interpolée ; au-delà, la valeur du bord', manque: 'confronter chaque courbe importée à la calibration de sa famille' },
  dommages: { source: 'CEI 60949 (l’échauffement adiabatique, K = 226 A·s½/mm², β = 234,5), corrigé de la résistivité réelle du toron (EN 2853) ; le continu : AC 43.13-1B § 11-67 b-c, MIL-W-5088L § 6.7 (recherche R2, octobre 2026)', sert: 'Ce qu’un fil CUIVRE supporte en défaut avant de s’abîmer, par jauge et par tenue du câble (DR 260 °C, coaxiaux 200, BN 150) : en bref l’adiabatique depuis 135 °C, √(I²t / t) ; en long, son intensité EN 2853 portée à sa tenue. Un disjoncteur PROTÈGE un fil quand ce qu’il laisse passer (sa courbe la plus lente) reste dessous à 2 s, 10 s, 1 min et en continu.',
    lue: 'la fiche et le contrôle d’un disjoncteur (la protection de chaque fil qu’il nourrit ; la limite du fil le plus faible, en pointillé sur la courbe), le meilleur calibre (la jauge proposée pour un fil qui ne suit pas)', choix: 'automatique : la jauge du fil, la ligne dont la tenue est la plus haute sans dépasser celle de la famille du câble ; rien pour un conducteur qui n’est pas du cuivre (CCA, aluminium) : la protection se juge alors sur ses intensités de service, plus sévères', manque: 'les lignes de l’aluminium cuivré (AD, VN) : K et β de l’alliage non trouvés' },
  raccords: { source: 'EN 3660 : dessins TE/Polamco P20027 (-064) et c-2275010 (-004), l’index BSI de la série (recherche R4) ; les aperçus iTeh des EN 3660-062, -063, -064, -065:2022, -005, -017/-018, -025 à -027, l’index EN 3660-002:2016 (recherche R3, octobre 2026) ; EN 4165-015 (la cheminée, R3)', sert: 'La référence du raccord arrière par famille de connecteur, taille de boîtier, type que le tutoriel décide et orientation : un MODÈLE de désignation (EN3660-064N12<L><E>) que l’outil complète avec la classe du connecteur, la chambre et le code d’entrée du toron ; les cotes A (toron admis), B (plateforme de bande), C (épaulement du manchon).',
    lue: '« autour » de chaque connecteur et de chaque côté d’une prise (raccord, désignation construite, statut), la nomenclature', choix: 'automatique : la famille du connecteur, la taille lue dans le part number (sinon la famille sans sa taille, désignation incomplète), le type de la table de décision (reprise de blindage × étanchéité × rôle de la gaine), l’orientation ; la classe N (EN 3660-001:2019) devient celle du connecteur (table Classes), <L> la chambre de l’hypothèse (A par défaut), <E> le code d’entrée (table Entrées EN 3660 : la plage de toron, borné à la taille — sinon « toron trop gros ») ; un EN 4165 : sa cheminée EN 4165-015 ; une ligne dont la clause de désignation n’est pas lue le dit (modèle) — manuelle : « Changer » (reprise, étanchéité, orientation, gaine), la fiche des hypothèses (toron, chambre)', manque: 'les clauses de désignation des -005, -017/-018, -020/-021, -025 à -027, la famille des -009 à -016, les cotes du -020 (l’équivalent US en attendant), l’ASNE 0059 (tout « déduit »), la règle de chambre de l’atelier, les cotes des cheminées EN 4165 (payantes)' },
  manchons: { source: 'VG 95343 T06 / T08 / T18 / T19 (HellermannTyton, guide « Heat Shrinkable Moulded Shapes » 2024 ; l’index VG p. 107-108 pour les T18, recherche R3)', sert: 'Le manchon thermorétractable, par ce qui sort du raccord et par l’épaulement du raccord : 112 formes — droit à lèvre (T06 et sa version précollée T18), coudé à nervure et à lèvre, sortie longue, 45°, transitions en T, 2 à 4 sorties.',
    lue: '« autour » (manchon), la nomenclature', choix: 'automatique : droit (la sortie longue quand aucun droit ne va), droit sur un raccord coudé (il fait déjà l’angle) ; coudé (à nervure ou à lèvre) seulement pour donner l’angle à un raccord droit ou à une cheminée — les autres formes restent à la main ; Ja > Ø > Jb côté toron, et Ha > C > Hb côté raccord, C = le ØCC du code d’entrée retenu (sinon la cote C de la ligne Raccords) ; le plus petit qui passe, le précollé (T18/T19) d’abord à cotes égales : l’étanchéité le demande', manque: 'la T18 H 001 A (le guide se contredit) ; un manchon droit pour le code d’entrée A' },
  gaines: { source: 'HellermannTyton HEGMAN / HEGMANWO 02/2010 (EN 6049-003, -004 : vérifiées) ; l’Excel du lecteur (DHS754-160, Airbus Helicopters, non publiée)', sert: 'Ce qui habille le toron : un surblindage (tresse cuivre) ou une protection (Nomex) — c’est le rôle qui décide du raccord : une tresse se reprend par une bande sur un raccord blindé, une protection finit sous le manchon ou par un collier.',
    lue: '« autour » (gaine), la table de décision du raccord, la nomenclature', choix: 'automatique, dans la famille choisie sur la fiche (« Changer » : gaine) : un surblindage dont l’intérieur passe le toron (le plus petit), une protection dont la plage encadre le toron' },
  colliers: { source: 'EN 3660-033:2019 tableau 1 (recherche R3) et le dessin TE P42936, Glenair 600-0xx, Airbus Helicopters (E0805), HellermannTyton, Octopart et Arrow (NSA935401 ; le -05 à 200 mm et le -08, à confirmer) ; Glenair H-52 / F-20 (bandes), Aviatec et Boeing Distribution (NSA935401-06, -13)', sert: 'La bande de reprise de blindage (EN 3660-033AF standard, micro -033CF, les Glenair équivalentes : largeur, épaisseur, longueur, boucle, Ø serré, masse, outil, tension de pose), le band-it d’atelier E0805, et les tyraps NSA935401.',
    lue: '« autour » (band-it, tyrap), la nomenclature', choix: 'automatique : le band-it par défaut de la table (colonne Défaut : l’EN3660-033AF) tant que son Ø serré passe la plateforme ØBB du code d’entrée retenu (sinon le toron) ; au-delà, la bande EN 3660-033 qui serre (la BF jusqu’à 63,5) ; l’E0805 en équivalent par le toron ; le tyrap au toron maximal le plus serré qui passe, puis le plus court', manque: 'les cotes des tyraps NSA935401-10 et -12 (EN 4056-003, payante)' },
  classes: { source: 'EN 2997, EN 3646, EN 3645 (règles de désignation, recherche R3) ; EN 3660-001 (classes des raccords, recherche R4)', sert: 'La classe du connecteur, lue dans son part number juste après le nom de la famille (W cadmium, R nickel, K inox, SE inox 260 °C…), et la lettre de classe EN 3660 du raccord qui va avec (le fini du raccord suit celui du connecteur ; jamais A, anodisé non conducteur).',
    lue: '« autour » (la classe dans la désignation construite du raccord), la nomenclature', choix: 'automatique : les lettres qui suivent le nom de la famille dans le part number, suivies du chiffre du style (EN2997 SE 6… → SE ; EN3645 F 0… → F), les classes à deux lettres avant celles à une ; sans classe lisible : N — la lettre de l’EN 3660-001:2019 (F n’y est plus, TE/Polamco l’imprime encore : commander la lettre que le fournisseur reconnaît)' },
  filetages: { source: 'EN 3645-002, EN 2997-002, EN 3646-002 ; Glenair AS85049/18', sert: 'Le filetage d’accessoire par famille et taille de boîtier — et c’est par elle que la taille se lit dans le part number.',
    lue: '« autour » (boîtier, filetage), le choix du raccord et du code d’entrée', choix: 'automatique : la famille, puis la lettre de taille quand la famille l’écrit (EN 3645 : EN3645F0CN26MN → C = 13), sinon la première paire de chiffres du part number qui est une taille de la famille (EN3646-002-12-08 → 12)' },
  accessoires: { source: 'catalogue Amphenol Air LB 01/19 (pages 39, 41, 44-45, 49-50, 57-58), Boeing (recherche R3) ; pour l’EN 4165, les titres et domaines des EN 4165-013 à -018 et -026 (aperçus iTeh, AFNOR, BSI : recherche R3, octobre 2026)', sert: 'Les références annexes d’une famille : pour les modules de jonction, butées d’extrémité, séparateurs, blocs à tige, shunts, étiquettes, étriers — et leur équivalent catalogue ; pour l’EN 4165, ce qui entoure ses cheminées (corps d’accessoire, cheminée ronde et double ovale, obturateur, collier).',
    lue: 'la cheminée d’un EN 4165 (« autour », le pourquoi) ; sinon personne : informative', choix: '—', manque: 'compter les butées (deux par rail) et les séparateurs dans la nomenclature d’une barrette ; les cotes des cheminées EN 4165 (payantes)' },
  entrees: { source: 'EN 3660-062 et -065:2022 (la plage de toron de chaque code, recherche R3) ; EN 3660-064 (dessin TE/Polamco P20027, table 4 : les cotes) ; Glenair 360A*001 (2022)', sert: 'Le code d’entrée de câble d’un raccord, par système : les codes lettrés A à M de l’EN 3660 (Dmin–Dmax la plage de toron de la norme, ØAA l’alésage, ØBB la plateforme où la bande serre la tresse, ØCC l’épaulement où vient le manchon : la cote C) et les codes 03 à 32 du serre-câble Glenair série 36.',
    lue: '« autour » (code d’entrée, ses cotes), la désignation construite du raccord (<E>), la bande (ØBB), le manchon (ØCC)', choix: 'automatique : le système que le raccord retenu dit (une désignation EN 3660 qui attend <E> → EN 3660 ; un serre-câble sans cotes → Glenair) ; le plus petit code dont le maximum passe le toron et que la taille du boîtier admet (EN 3660-062 : « selected in accordance with the maximum diameter of the cable bundle ») — un toron sous la plage du code (un des quatre trous entre deux plages) le prend avec un bourrage ; au-delà du code maximal de la taille (08/09 → D, 12/13 → H, 22 → M), « toron trop gros pour ce boîtier »' },
  torons: { source: 'TE/Polamco « Circular Backshells » p. 11, table 1 (vérifié) ; Glenair « Wire Bundle Diameter Calculator » (contrôle) ; l’Excel du lecteur (tutoriel Raccords) — recherche R3, octobre 2026', sert: 'Le diamètre du toron d’un connecteur : √(Σ Ø²) des câbles (la base des câbles), multiplié par le facteur de TE selon le nombre de câbles — 1,415 pour deux, 1,242 pour trois… 1,15 dès sept. Le toron choisit le code d’entrée, la bande, le tyrap, la gaine, le manchon.',
    lue: '« autour » de chaque connecteur (toron), la nomenclature', choix: 'automatique : la ligne TE/Polamco du nombre de câbles (« 7 et plus » au-delà) — hypothèse « comme l’Excel » : la ligne Excel (+ 10 %) ; les lignes Glenair restent pour contrôle', manque: 'les épaisseurs de tresse et de gaine qu’un serre-câble ou un tyrap serrent en plus (TE, Glenair), et le facteur que l’atelier retient (R3 : à décider)' },
  chambres: { source: 'EN 3660-064:2022 et -063:2022, tableaux 1 à 4 (aperçus iTeh, recherche R3)', sert: 'La longueur de la chambre de câblage des raccords droits à bande, par partie et code (A à D) : la longueur derrière la face, la masse de la pièce en dépendent.',
    lue: '« autour » (la chambre de la désignation construite), la masse du raccord', choix: 'l’hypothèse « chambre » (A par défaut) ; la pratique que R3 propose est dite en conseil quand des câbles blindés un à un sont repris : B ou plus', manque: 'la règle de l’atelier (aucune source publique ne dit comment choisir)' },
  massesRaccords: { source: 'EN 3660-062, -063, -064, -065:2022, tableaux de masses (aperçus iTeh, recherche R3) — deux coquilles de la norme « à confirmer »', sert: 'La masse nominale de la pièce que l’outil désigne (partie, taille, chambre, code d’entrée, classe) : le premier pas du devis de masse du connecteur habillé.',
    lue: '« autour » (la masse du raccord désigné), la nomenclature (en note)', choix: 'automatique : la ligne de la partie, de la taille, de la chambre (les droits), du code et de la classe (N, W, T, Z ensemble ; K l’inox)', manque: 'la masse des connecteurs, des manchons et des tyraps (catalogues)' },
  joints: { source: 'Souriau 8D p. 65 et Milnec p. B-9 (EN 3645), TE 983 (EN 2997, lu dans un extrait), Amphenol Air LB p. 80 (barrettes) — recherche R1 ; EN 4165-002:2023 tableau 6 (recherche R3)', sert: 'Le Ø sur isolant que le trou du joint arrière serre, par famille, taille (et fût) : dessous, l’eau passe (c’est le manchon E0718 de la table Contacts qui grossit le fil) ; dessus, le fil n’entre pas (l’EN 4165 l’interdit).',
    lue: 'le remplissage d’un connecteur et d’une prise (le fil contre le joint : une remarque quand il est trop gros, ou trop fin sans manchon)', choix: 'automatique : la famille, la taille, le fût lu dans la référence du contact (sans fût : la plage la plus étroite) ; seuls les câbles à un conducteur se jugent (le Ø d’un multiconducteur est celui de sa gaine)', manque: 'les plages de l’EN 3646 (déduites de l’EN 2997) et de l’EN 2997 (lues dans un extrait : à confirmer)' },
  outillages: { source: 'Amphenol Signal Contacts p. 10, Souriau 8D p. 69-71, TE DMC-M p. 36-37, Glenair, Amphenol Air LB p. 80 — recherche R1', sert: 'Par contact : la pince et son positionneur, l’outil d’insertion et d’extraction, la longueur de dénudage, les bagues couleur — la fiche d’atelier et la liste d’outillage du contrat.',
    lue: 'le contact à sertir de chaque fil posé (`sertir.outillage`), la nomenclature (avec chaque contact)', choix: 'automatique : la ligne qui nomme la référence du contact (« EN3155-008M / -003F / -009F 2018 » vaut pour les trois)', manque: 'l’outillage des -018/-019 de l’EN 2997 et de l’EN 3646 ; les positionneurs EN (EN 4008, payante)' },
  obturateurs: { source: 'Souriau 8D p. 68, Amphenol 38999 p. 18 (EN 3645), Amphenol Air LB p. 81 (barrettes) — recherche R1 ; la règle de pose : AC 43.13-1B § 11-234, 11-262, 11-263', sert: 'L’obturateur qui ferme une cavité sans fil, par famille et taille ; la règle de pose dépend de la zone (contact de réserve et fil témoin en zone feu, obturateur en zone pressurisée étanche).',
    lue: '`obturateurDe` (pour une fiche ou une nomenclature à venir)', choix: 'automatique : la famille et la taille', manque: 'les obturateurs de l’EN 2997, de l’EN 3646 et d’un contact libre de l’EN 4165 ; la zone de chaque équipement' },
  partiesEN3155: { source: 'les titres officiels des parties (en-standard.eu), Souriau EN3155 Qualified Contacts, Carlisle/Tri-Star — recherche R1', sert: 'Ce que chaque numéro de partie de l’EN 3155 désigne : le type, le sexe, la taille, la terminaison, la classe de température, les connecteurs qui l’emploient.',
    lue: '`partieDuContact` (pour une fiche)', choix: 'automatique : le numéro de partie de la référence (EN3155-016M2018 → 016)', manque: 'les EN 3155-001 et -002 (payantes) : la limite de résistance, les fûts officiels' }
};
/* Comment faire entrer une norme que l'outil ne connaît pas encore : par les tables existantes, cas par cas. */
const GUIDE_NORMES = [
  ['Une nouvelle norme de barrette (modules de jonction)', 'Familles (une ligne : la famille, les jauges), Tailles (une ligne par taille de contact), Modules (une ligne par variante : la face, les groupes de contacts reliés), et Contacts si la norme a ses propres contacts à sertir.', ['familles', 'tailles', 'modules', 'contacts']],
  ['Une nouvelle famille de prise de coupure ou de connecteur', 'Familles (nature coupure ou connecteur), Tailles, Modules (emploi connecteur : les arrangements, la face), Contacts (le contact à sertir par taille, sexe, type et jauge), Filetages (les tailles de boîtier), Raccords.', ['familles', 'tailles', 'modules', 'contacts', 'filetages', 'raccords']],
  ['Un nouveau câble, une nouvelle famille de câbles', 'Câbles (une ligne par type tel que le retest l’écrit) et Familles de câbles (le conducteur : cuivre, CCA, aluminium).', ['cables', 'cablesFamilles']],
  ['Les règles du programme (chute admise, déclassement, intensités par type)', 'Réseau (une ligne par tension), Déclassement (une ligne par point), Fils (une ligne par type et jauge : une ligne au type exact passe devant l’EN 2853).', ['reseau', 'declassements', 'fils']],
  ['Un disjoncteur', 'Courbes de disjonction (une ligne par point : famille, courbe, multiple, temps) ; Familles de disjoncteurs (le préfixe du part number, la gamme, la courbe à prendre) ; Calibration (ce qu’il garantit de tenir, les points normalisés) ; Chute disjoncteur (sa chute à In). Dommage des fils dit ce qu’un fil supporte avant qu’il s’ouvre.', ['disjoncteurs', 'disjoncteursFamilles', 'calibrations', 'chutesDisjoncteurs', 'dommages']],
  ['Un raccord, un manchon, une gaine, un collier, une entrée', 'Chacun sa table : la référence, et les diamètres qui décident du choix (toron, cotes) ; la masse d’une pièce, la longueur d’une chambre, le facteur du toron.', ['raccords', 'manchons', 'gaines', 'colliers', 'entrees', 'massesRaccords', 'chambres', 'torons']],
  ['Ce qui entoure un contact', 'Le joint arrière (la plage de Ø sur isolant), l’outillage (pince, positionneur, insertion), les obturateurs, les parties de l’EN 3155.', ['joints', 'outillages', 'obturateurs', 'partiesEN3155']],
  ['Une photo de norme', 'Pas encore lue par l’outil : transcris les tables dans un gabarit (les en-têtes de l’outil, une ligne par entrée), puis importe-le. Les gabarits se téléchargent ici.', []]
];

/* ---- la page des normes ----------------------------------------------------- */
const normeActive = () => app.norme || normeVide();
const vuesNorme = () => DOMAINES_NORMES.flatMap(d => d.vues);
/* Les lignes d'une vue, dans la norme active, et le verdict de chacune (embarquée, modifiée, ajoutée) contre l'embarquée. */
function lignesDeVue(v) { const V = vueDe(v), T = V.table, L = (normeActive()[T] || []).filter(x => !V.garde || V.garde(x)), cmp = comparerTable(T, normeEmbarqueeLue()[T], L.filter(x => x.source != null));
  return { table: T, lignes: L, etat: x => x.source == null ? 'embarquée' : (cmp.parLigne.get(x) === 'identique' ? 'embarquée' : cmp.parLigne.get(x)), cmp }; }
const texteDeLigne = (T, x) => Object.values(brutDe(T, x)).join(' ');
const contient = (texte, q) => MOT(texte).includes(MOT(q));
const aConfirmer = (T, x) => /confirm|provisoire/.test(MOT(texteDeLigne(T, x)));
/* Les lignes masquées d'une table : les embarquées que la couche supprime. */
const masqueesDe = T => { const sup = new Set(apportsDeTable(NORMES.apports, T).supprimees || []); return (normeEmbarqueeLue()[T] || []).filter(x => sup.has(cleDeLigne(T, x))); };
const tableModifiee = T => { const A = apportsDeTable(NORMES.apports, T); return !!((A.lignes || []).length || (A.supprimees || []).length); };
const nmTitre = (sur, titre) => `<div class="fiche-tete"><div class="min0"><div class="sur">${esc(sur)}</div><h2 class="titre sans">${esc(titre)}</h2></div><button class="rond fermer" id="fi-fermer" aria-label="Fermer la fiche"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>`;
/* Le passage d'un document à l'autre : les normes, la bible (et les contrats déjà faits). */
const nmNav = actif => `<div class="segment nm-nav" role="group" aria-label="Documents"><button data-nm-vue="normes" aria-pressed="${actif === 'normes'}">Normes</button><button data-nm-vue="bible" aria-pressed="${actif === 'bible'}">Bible des barrettes</button></div>`;
const badge = (cls, t) => `<span class="nm-badge ${cls}">${esc(t)}</span>`;
/* La largeur des deux onglets (Normes, Bible) : les tables ont jusqu'à seize colonnes ; le plan se recadre à côté.
   `ouvrirFiche` pose sa largeur à lui et recadre quand le document change : on reprend la nôtre aussitôt (dans la même
   tâche, rien ne se peint entre les deux) et on recadre à nouveau — d'un onglet à l'autre, le cadre ne bouge pas. */
const LARGEUR_NORMES = 'min(1040px, calc(100vw - var(--rail) - 320px))';   // le plan garde toujours 320 px à côté
function elargirNormes(memeDocument) { document.documentElement.style.setProperty('--fiche-l', LARGEUR_NORMES); if (!memeDocument) ajuster(true); }
/* La page : l'état, la recherche et les gestes, l'import en cours, les résultats de la recherche, les domaines. */
function ficheNormes(opts) { opts = opts || {};
  if (opts.table) { NORMES.ouverts.add(opts.table); if (opts.filtre != null) NORMES.filtres[opts.table] = opts.filtre; }
  if (opts.q != null) NORMES.q = opts.q;
  const deja = app.fiche && app.fiche.mode === 'normes', pied = normesPiedHtml();
  ouvrirFiche({ mode: 'normes', large: true }, normesHtml(), pied); elargirNormes(deja);
  app.base.normeOuverte = true; lierNormes();
  if (opts.table) { const el = $('fiche-corps').querySelector(`.nm-table[data-vue="${opts.table}"]`); if (el && el.scrollIntoView) { try { el.scrollIntoView({ block: 'start' }); } catch (_) { } } } }
/* La page se refait sur place (la position de lecture reste). */
function rendreNormes() { if (!(app.fiche && app.fiche.mode === 'normes')) return; const c = $('fiche-corps'), y = c.scrollTop, actif = document.activeElement && document.activeElement.id;
  c.innerHTML = normesHtml(); const p = $('fiche-pied'); p.innerHTML = normesPiedHtml(); p.hidden = !p.innerHTML; c.scrollTop = y; lierNormes();
  if (actif) { const el = $(actif); if (el && el.focus) el.focus(); } }
function normesHtml() { const N = normeActive(), E = normeEmbarqueeLue(), total = TABLES_NORME.reduce((n, t) => n + (N[t] || []).length, 0), modifiees = TABLES_NORME.filter(tableModifiee);
  // ce que ce navigateur a importé ou modifié : les lignes de la couche (les lignes embarquées qui portent une source, comme
  // les calibrations, ne comptent pas)
  const nAjout = TABLES_NORME.reduce((n, t) => n + (apportsDeTable(NORMES.apports, t).lignes || []).length, 0), nMasque = TABLES_NORME.reduce((n, t) => n + masqueesDe(t).length, 0);
  const etat = `<div class="bible-etat nm-etat"><span><b>${TABLES_NORME.length} tables</b> · ${plurielLie(total, 'ligne')} · ${E.tables} blocs embarqués (normes/*.csv)`
    + (modifiees.length ? ` · <b class="nm-mod">${plurielLie(modifiees.length, 'table')} modifiée${modifiees.length > 1 ? 's' : ''}</b> dans ce navigateur (${plurielLie(nAjout, 'ligne')} importée${nAjout > 1 ? 's' : ''} ou modifiée${nAjout > 1 ? 's' : ''}${nMasque ? ', ' + plurielLie(nMasque, 'ligne') + ' masquée' + (nMasque > 1 ? 's' : '') : ''}) — ${esc(app.normeNom)}` : ' · rien d’importé ni de modifié : l’embarquée telle quelle')
    + (NORMES.ancienne ? ' · <i>une norme importée par l’ancien mécanisme a été oubliée : réimporte-la, elle se verra ligne par ligne</i>' : '') + '</span></div>';
  // la recherche (son nom dit déjà « toutes les tables »), puis l'action principale de la page — importer — et les autres
  const outils = `<div class="nm-outils"><div class="filtre nm-cherche"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="nm-q" value="${escA(NORMES.q)}" placeholder="Une référence, un part number, une jauge…" aria-label="Chercher dans toutes les tables" autocomplete="off" spellcheck="false"><button class="vider" id="nm-q-vider"${NORMES.q ? '' : ' hidden'} aria-label="Effacer la recherche">×</button></div>`
    + `<div class="nm-gestes"><button class="btn cuivre" id="nm-importer" title="Un Excel (une feuille = une ou plusieurs tables), un CSV">Importer une norme</button><button class="btn papier" id="nm-coller">Coller des lignes</button><button class="btn papier" id="nm-guide" aria-expanded="${NORMES.guide}">Ajouter une norme, les gabarits</button>`
    + (modifiees.length ? `<button class="btn papier" id="nm-exporter-tout" title="Toutes les lignes importées ou modifiées, en un CSV à me renvoyer">Exporter mes modifications</button>` : '') + `<input type="file" id="fichier-norme" accept=".csv,.tsv,.txt,.xlsx,.xlsm,.xls" hidden></div></div>`;
  return `<div class="nm">${nmTitre('Ce que l’outil vérifie, table par table', 'Normes')}${nmNav('normes')}${etat}${outils}${NORMES.guide ? guideHtml() : ''}${NORMES.import ? importHtmlOuColler() : ''}${NORMES.q ? rechercheHtml() : ''}`
    + DOMAINES_NORMES.map(domaineHtml).join('') + '</div>'; }
/* Le pied : défaire, revenir à l'embarquée — rien quand il n'y a rien à défaire ni à rendre (importer est en tête). */
function normesPiedHtml() { if (!NORMES.hist.length && !app.normeNom) return '';
  return `${NORMES.hist.length ? `<button class="btn papier" id="nm-defaire" title="${escA('Défaire : ' + NORMES.hist[NORMES.hist.length - 1].quoi + ' (Ctrl+Z)')}">Défaire</button>` : ''}<span class="espace"></span>`
  + (app.normeNom ? '<button class="btn lien" id="no-embarquee">Revenir à la norme embarquée</button>' : ''); }
/* Un domaine : son titre, à quoi il sert, ses tables. */
function domaineHtml(d) { const corps = d.id === 'contrats' ? contratsHtml() : d.vues.map(tableHtml).join('');
  return `<section class="nm-dom" id="nm-dom-${d.id}"><h3 class="nm-dom-t">${esc(d.titre)}</h3><p class="nm-dom-sens">${esc(d.sens)}</p>${corps}</section>`; }
function contratsHtml() { const R = app.references, I = typeof indexReferences === 'function' ? indexReferences() : null;
  return `<article class="nm-table nm-contrats"><div class="nm-t-tete nm-t-fixe"><div class="nm-t-titre"><b>Base déposée</b><span class="nm-t-source">${R ? esc(R.nom || 'base') + '\u00a0· ' + plurielLie(I.harnais.size, 'harness') + '\u00a0· ' + plurielLie(I.dessins.size, 'dessin') + '\u00a0· ' + plurielLie(R.liaisons.length, 'liaison') : 'aucune base déposée'}</span></div>`
    + `<div class="nm-t-badges">${R ? badge('import', 'gardée dans ce navigateur') : badge('rien', 'vide')}</div><button class="fi-lien" data-nm-vue="bible">Voir dans la bible</button></div></article>`; }
/* Une table : sa tête (titre, source, compte, badges), et dépliée, sa fiche, ses gestes, la table elle-même. L'état
   par défaut (l'embarquée telle quelle) ne se dit pas table par table — l'état du haut le dit une fois : les badges ne
   montrent que les exceptions (modifiée, ajoutée, masquée, à confirmer, vide). */
function tableHtml(v) { const V = vueDe(v), T = V.table, L = lignesDeVue(v), F = FICHES_TABLES[T] || {}, ouvert = NORMES.ouverts.has(v);
  const n = L.lignes.length, nMod = L.lignes.filter(x => L.etat(x) === 'modifiée').length, nAjo = L.lignes.filter(x => L.etat(x) === 'ajoutée').length, nConf = L.lignes.filter(x => aConfirmer(T, x)).length, nMasq = masqueesDe(T).filter(x => !V.garde || V.garde(x)).length;
  const badges = [nMod ? badge('mod', nMod + ' modifiée' + (nMod > 1 ? 's' : '')) : '', nAjo ? badge('ajo', nAjo + ' ajoutée' + (nAjo > 1 ? 's' : '')) : '', nMasq ? badge('masq', nMasq + ' masquée' + (nMasq > 1 ? 's' : '')) : '', nConf ? badge('conf', nConf + ' à confirmer') : '', !n ? badge('rien', 'vide') : ''].filter(Boolean).join('');
  const sources = [...new Set(L.lignes.map(x => x.source).filter(s => s && s !== 'main'))];
  return `<article class="nm-table${ouvert ? ' ouvert' : ''}${nMod || nAjo || nMasq ? ' modifiee' : ''}" data-vue="${escA(v)}" data-table="${escA(T)}">`
    + `<button class="nm-t-tete" aria-expanded="${ouvert}" aria-controls="nm-corps-${escA(v)}"><div class="nm-t-titre"><b>${esc(V.titre)}</b><span class="nm-t-source">${esc(F.source || '')}${sources.length ? ' · importé : ' + esc(sources.join(', ')) : ''}</span></div><span class="nm-t-compte">${pluriel(n, 'ligne')}</span><div class="nm-t-badges">${badges}</div><svg class="ico nm-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>`
    + (ouvert ? `<div class="nm-t-corps" id="nm-corps-${escA(v)}">${ficheTableHtml(v, L)}${barreTableHtml(v, L)}<div class="nm-t-zone">${corpsTableHtml(v, L)}</div></div>` : '') + '</article>'; }
/* La fiche d'une table : d'où elle vient (la source entière : la tête n'en montre que deux lignes), à quoi elle sert,
   qui la lit, comment une ligne se choisit, ce qui manque ; les colonnes. */
function ficheTableHtml(v, L) { const T = L.table, F = FICHES_TABLES[T] || {}, cols = colonnesDeTable(T), O = OBLIGATOIRES_NORME[T] || {};
  const colonnes = NORMES.colonnes.has(v) ? `<dl class="nm-cols">${cols.map(c => `<dt>${esc(c.libelle)}${c.obligatoire ? '<i title="obligatoire">*</i>' : ''}</dt><dd>${esc(c.sens)}${c.alias.length ? `<span class="nm-alias">aussi : ${esc(c.alias.slice(0, 6).join(', '))}</span>` : ''}</dd>`).join('')}</dl><p class="nm-note">* obligatoire. Reconnue à son en-tête par : ${esc(O.entete || '')}. Les colonnes se lisent dans n’importe quel ordre, avec ou sans unité entre parenthèses.</p>` : '';
  return `<dl class="nm-doc">${F.source ? `<dt>source</dt><dd>${esc(F.source)}</dd>` : ''}<dt>sert à</dt><dd>${esc(F.sert || '')}</dd><dt>lue par</dt><dd>${esc(F.lue || '')}</dd><dt>choix</dt><dd>${esc(F.choix || '')}</dd>${F.manque ? `<dt>manque</dt><dd class="nm-manque">${esc(F.manque)}</dd>` : ''}<dt>colonnes</dt><dd><button class="fi-lien nm-voir-cols" data-cols="${escA(v)}" aria-expanded="${NORMES.colonnes.has(v)}">${cols.length} colonnes${NORMES.colonnes.has(v) ? ' — replier' : ' — les expliquer'}</button></dd></dl>${colonnes}`; }
/* La barre d'une table : le filtre, ajouter une ligne, exporter, le gabarit, revenir à l'embarquée, les masquées. */
function barreTableHtml(v, L) { const T = L.table, masq = masqueesDe(T), modif = tableModifiee(T);
  return `<div class="nm-t-barre"><div class="filtre nm-filtre"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input data-filtre="${escA(v)}" value="${escA(NORMES.filtres[v] || '')}" placeholder="Filtrer la table" aria-label="Filtrer ${escA(vueDe(v).titre)}" autocomplete="off" spellcheck="false"></div>`
    + `<button class="btn papier nm-ajouter" data-ajouter="${escA(v)}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Ligne</button><button class="btn lien" data-exporter="${escA(v)}" title="La table telle que l’outil la lit, en CSV">Exporter CSV</button><button class="btn lien" data-gabarit="${escA(T)}" title="Les en-têtes et une ligne d’exemple">Gabarit</button>`
    + (modif ? `<button class="btn lien" data-embarquee="${escA(T)}">Revenir à l’embarquée</button>` : '') + (masq.length ? `<button class="btn lien" data-masquees="${escA(v)}" aria-expanded="${NORMES.masquees.has(v)}">${pluriel(masq.length, 'ligne')} masquée${masq.length > 1 ? 's' : ''}</button>` : '') + '</div>'; }
/* La table : l'en-tête triable, les lignes (filtrées, triées, les premières seulement au-delà de MAX_LIGNES_NORME),
   chacune avec son état, ses gestes au survol — ou en édition. `lecture` : sans geste (les résultats de recherche).
   L'alignement se décide par COLONNE, sur toutes les lignes de la table (pas sur celles qu'un filtre laisse) : une
   colonne dont chaque valeur est un nombre (hors identifiants : référence, câble, code…) se range à droite, en-tête
   compris ; les textes longs (note, source…) en linéale. */
const COLONNE_TEXTE = /note|source|statut|sens|disposition|groupes/, COLONNE_IDENTIFIANT = /reference|cable|famille|variante|code|taille|designation|contact|courbe|type|filetage|lettre/;
function corpsTableHtml(v, L, opts) { opts = opts || {}; const T = L.table, cols = colonnesDeTable(T), filtre = opts.filtre != null ? opts.filtre : (NORMES.filtres[v] || ''), tri = NORMES.tris[v];
  let rows = L.lignes.map(x => ({ x, b: brutDe(T, x), etat: L.etat(x) }));
  const droite = new Set(cols.filter(c => !COLONNE_TEXTE.test(c.champ) && !COLONNE_IDENTIFIANT.test(c.champ) && rows.some(r => r.b[c.champ]) && rows.every(r => !r.b[c.champ] || NUMERO(r.b[c.champ]) != null)).map(c => c.champ));
  const classe = c => COLONNE_TEXTE.test(c.champ) ? 'nm-texte' : droite.has(c.champ) ? 'd' : '';
  if (filtre) rows = rows.filter(r => contient(Object.values(r.b).join(' '), filtre));
  if (tri && !opts.lecture) { const num = rows.every(r => !r.b[tri.champ] || NUMERO(r.b[tri.champ]) != null);
    rows.sort((a, b) => { const u = a.b[tri.champ] || '', w = b.b[tri.champ] || ''; return tri.sens * (num ? (NUMERO(u) == null ? 1e9 : NUMERO(u)) - (NUMERO(w) == null ? 1e9 : NUMERO(w)) : u.localeCompare(w, 'fr', { numeric: true })); }); }
  const max = opts.max || (NORMES.entier.has(v) ? Infinity : MAX_LIGNES_NORME), vus = rows.slice(0, max), E = NORMES.edition, enEdition = r => E && E.vue === v && E.cle != null && E.cle === cleDeLigne(T, r.x);
  const th = cols.map(c => `<th${droite.has(c.champ) ? ' class="d"' : ''}${opts.lecture ? '' : ` data-tri="${escA(c.champ)}" role="button" tabindex="0" aria-sort="${tri && tri.champ === c.champ ? (tri.sens > 0 ? 'ascending' : 'descending') : 'none'}"`} title="${escA(c.sens)}">${esc(c.libelle)}${tri && tri.champ === c.champ && !opts.lecture ? (tri.sens > 0 ? ' ↑' : ' ↓') : ''}</th>`).join('');
  const ligne = r => enEdition(r) ? ligneEditionHtml(v, T, cols) : `<tr class="nm-l nm-${r.etat === 'modifiée' ? 'mod' : r.etat === 'ajoutée' ? 'ajo' : 'emb'}" data-cle="${escA(cleDeLigne(T, r.x))}"${opts.lecture ? '' : ' tabindex="0" title="Double-clic : modifier"'}>`
    + `<td class="nm-etat">${r.etat !== 'embarquée' ? badge(r.etat === 'modifiée' ? 'mod' : 'ajo', r.etat) : ''}${r.x.source && r.x.source !== 'main' ? `<span class="nm-src" title="${escA('importée de ' + r.x.source)}">${esc(r.x.source)}</span>` : ''}</td>`
    + cols.map(c => `<td class="${classe(c)}" title="${escA(r.b[c.champ] || '')}">${esc(r.b[c.champ] || '')}</td>`).join('')
    + (opts.lecture ? '' : `<td class="nm-gestes-l"><button class="nm-g" data-modifier="${escA(v)}" title="Modifier (ou double-clic)"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16z"/></svg></button><button class="nm-g" data-dupliquer="${escA(v)}" title="Dupliquer"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button><button class="nm-g danger" data-supprimer="${escA(v)}" title="Supprimer"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></td>`) + '</tr>';
  const neuve = E && E.vue === v && E.cle == null && !opts.lecture ? ligneEditionHtml(v, T, cols) : '';
  const masq = !opts.lecture && NORMES.masquees.has(v) ? masqueesDe(T).map(x => { const b = brutDe(T, x); return `<tr class="nm-l nm-masquee" data-masquee="${escA(cleDeLigne(T, x))}"><td class="nm-etat">${badge('masq', 'masquée')}</td>${cols.map(c => `<td class="${classe(c)}">${esc(b[c.champ] || '')}</td>`).join('')}<td class="nm-gestes-l"><button class="fi-lien" data-retablir="${escA(v)}">rétablir</button></td></tr>`; }).join('') : '';
  const reste = rows.length - vus.length;
  return `<div class="nm-defile"><table class="nm-tab"><thead><tr><th class="nm-etat"></th>${th}${opts.lecture ? '' : '<th class="nm-gestes-l"></th>'}</tr></thead><tbody>${neuve}${vus.map(ligne).join('')}${masq}</tbody></table>${!rows.length ? `<p class="nm-vide">${filtre ? 'Rien ne correspond à « ' + esc(filtre) + ' ».' : 'Aucune ligne : ajoute-en une, ou importe la table.'}</p>` : ''}</div>`
    + (reste > 0 ? `<button class="fi-lien nm-plus" data-entier="${escA(v)}">Afficher les ${reste} lignes restantes</button>` : ''); }
/* Une ligne en édition : un champ par colonne (la valeur telle que le fichier l'écrit), Entrée valide, Échap annule. */
function ligneEditionHtml(v, T, cols) { const E = NORMES.edition;
  return `<tr class="nm-l nm-edition" data-edition="${escA(v)}"><td class="nm-etat">${badge(E.cle == null ? 'ajo' : 'mod', E.cle == null ? 'nouvelle' : 'en édition')}</td>`
    + cols.map((c, i) => `<td><input class="nm-champ" data-champ="${escA(c.champ)}" value="${escA(E.brut[c.champ] || '')}" placeholder="${escA(c.libelle)}" title="${escA(c.sens)}" aria-label="${escA(c.libelle)}" spellcheck="false" autocomplete="off"${i === 0 ? ' id="nm-premier-champ"' : ''}${c.obligatoire ? ' data-obligatoire="1"' : ''}></td>`).join('')
    + `<td class="nm-gestes-l nm-valider"><button class="btn cuivre" id="nm-ok" title="Valider (Entrée)">OK</button><button class="btn lien" id="nm-annuler" title="Annuler (Échap)">Annuler</button></td></tr>`; }
/* La recherche dans toutes les tables : par table, les premières lignes qui contiennent le texte, et le chemin vers la table. */
function rechercheHtml() { const q = NORMES.q, hits = vuesNorme().map(v => { const L = lignesDeVue(v), T = L.table, xs = L.lignes.filter(x => contient(texteDeLigne(T, x), q)); return xs.length ? { v, L, n: xs.length } : null; }).filter(Boolean);
  if (!hits.length) return `<section class="nm-resultats"><p class="nm-vide">Rien dans les ${TABLES_NORME.length} tables pour « ${esc(q)} ».</p></section>`;
  return `<section class="nm-resultats"><div class="sur">«\u00a0${esc(q)}\u00a0»\u00a0· ${plurielLie(hits.reduce((n, h) => n + h.n, 0), 'ligne')} dans ${plurielLie(hits.length, 'table')}</div>`
    + hits.map(h => `<div class="nm-hit"><div class="nm-hit-t"><b>${esc(vueDe(h.v).titre)}</b><span>${pluriel(h.n, 'ligne')}</span><button class="fi-lien" data-voir-table="${escA(h.v)}">Voir dans la table</button></div>${corpsTableHtml(h.v, h.L, { filtre: q, max: 6, lecture: true })}</div>`).join('') + '</section>'; }
/* Le guide : comment faire entrer ce que l'outil ne connaît pas, et les gabarits. */
function guideHtml() { return `<section class="nm-guide"><div class="sur">Ajouter une norme que l’outil ne connaît pas</div><p class="nm-note">Tout entre par les tables existantes : les en-têtes de l’outil (ou leurs alias, dans n’importe quel ordre), une ligne par entrée ; un Excel peut porter plusieurs tables par feuille. Une ligne de même clé qu’une ligne embarquée la remplace ; les autres s’ajoutent. Un gabarit se télécharge, se remplit et se dépose sur la table.</p>`
  + `<dl class="nm-cas">${GUIDE_NORMES.map(([titre, texte, tables]) => `<dt>${esc(titre)}</dt><dd>${esc(texte)}${tables.length ? `<div class="nm-gabarits">${tables.map(t => `<button class="fi-lien" data-gabarit="${escA(t)}">gabarit ${esc(TITRES_NORME[t])}</button>`).join('')}</div>` : ''}</dd>`).join('')}</dl>`
  + `<div class="nm-gabarits nm-tous"><span class="sur">Tous les gabarits</span>${TABLES_NORME.map(t => `<button class="fi-lien" data-gabarit="${escA(t)}">${esc(TITRES_NORME[t])}</button>`).join('')}</div></section>`; }

/* ---- l'import : lire, prévisualiser, adopter ----------------------------------- */
/* Un fichier déposé ou choisi : lu, découpé en blocs, montré dans la page avant d'être adopté. Ce qui ne se lit pas
   s'écrit aussi dans la carte des normes de « Vos fichiers » (08-fichiers), le mot qui passe propose « Voir ». */
async function importerNorme(fichier) { if (!fichier) return;
  try { dire('Lecture de « ' + fichier.name + ' »…'); importerNormeTexte(await texteDeNormeFichier(fichier), fichier.name); }
  catch (e) { echecImport('normes', { texte: `${esc(fichier.name)} n’a pas pu être lu : ${esc(String(e && e.message || e))}.` }); } }
/* Un texte (un CSV, des lignes collées, les feuilles d'un Excel) : les blocs reconnus, prévisualisés. Rend l'import. */
function importerNormeTexte(texte, nom) { const blocs = decouperTables(texte);
  NORMES.import = { nom: nom || 'texte collé', blocs: blocs.map(b => ({ ...b, cible: b.table, manuel: {} })), vide: !blocs.length };
  NORMES.import.blocs.forEach(preparerBloc);
  if (!blocs.length) echecImport('normes', { texte: `«\u00a0${esc(nom || 'le texte')}\u00a0» : aucune ligne d’en-tête reconnue. Il faut les en-têtes de l’outil, une table par bloc (un gabarit par table, dans la page Normes).`, gestes: [['gabarits', 'Les gabarits']] },
    '« ' + (nom || 'le texte') + ' » : aucune ligne d’en-tête reconnue — il faut les en-têtes de l’outil (voir les gabarits).');
  else { effacerErreur('normes'); dire(pluriel(blocs.length, 'table') + ' reconnue' + (blocs.length > 1 ? 's' : '') + ' dans « ' + (nom || 'le texte') + ' » : vérifie, puis adopte.'); }
  ficheNormes(); const imp = $('nm-import'); if (imp && imp.scrollIntoView) { try { imp.scrollIntoView({ block: 'start' }); } catch (_) { } }
  return NORMES.import; }
/* Ce qu'un bloc donne pour sa cible : les colonnes (reconnues, puis celles attribuées à la main), les lignes lues et
   rejetées, la comparaison à la norme active. */
function preparerBloc(b) { if (!b.cible) { b.lecture = null; b.cmp = null; return; }
  const { col, inconnues } = colonnesDEntete(b.cible, b.entete); Object.entries(b.manuel).forEach(([i, champ]) => { if (champ) col[champ] = +i; });
  b.col = col; b.inconnues = inconnues.filter(i => !b.manuel[i]); b.lecture = lireBloc(b, b.cible, col); b.cmp = comparerTable(b.cible, normeActive()[b.cible], b.lecture.lues); }
function importHtml() { const I = NORMES.import, n = I.blocs.filter(b => b.cible).length;
  const option = (b, t, cand) => `<option value="${escA(t)}"${b.cible === t ? ' selected' : ''}>${esc(TITRES_NORME[t])}${cand ? ' · reconnue' : ''}</option>`;
  const bloc = (b, k) => { const cands = b.candidats.map(c => c.nom), autres = TABLES_NORME.filter(t => !cands.includes(t)), cols = b.cible ? colonnesDeTable(b.cible) : [], lib = ch => (cols.find(c => c.champ === ch) || {}).libelle || ch;
    const reconnues = b.cible ? Object.entries(b.col).map(([champ, i]) => `<span class="nm-col-ok" title="${escA('colonne « ' + b.entete[i] + ' » lue comme ' + lib(champ))}">${esc(b.entete[i])}${NORMA(b.entete[i]) !== NORMA(lib(champ)) ? ' → ' + esc(lib(champ)) : ''}</span>`).join('') : '';
    const inconnues = b.cible ? b.inconnues.map(i => `<label class="nm-col-ko"><span>${esc(b.entete[i])}</span><select data-colonne="${k}" data-indice="${i}" aria-label="${escA('Lire la colonne « ' + b.entete[i] + ' » comme')}"><option value="">ignorer</option>${cols.filter(c => b.col[c.champ] == null).map(c => `<option value="${escA(c.champ)}">${esc(c.libelle)}</option>`).join('')}</select></label>`).join('') : '';
    const c = b.cmp, lus = b.lecture ? b.lecture.lues.length : 0, rej = b.lecture ? b.lecture.rejets.length : 0;
    const compte = !b.cible ? 'ignorée' : `${pluriel(lus, 'ligne')} lue${lus > 1 ? 's' : ''} · <b class="nm-ajo">${c.nouvelles.length} nouvelle${c.nouvelles.length > 1 ? 's' : ''}</b> · <b class="nm-mod">${c.remplacees.length} remplace${c.remplacees.length > 1 ? 'nt' : ''}</b> une ligne · ${c.identiques.length} identique${c.identiques.length > 1 ? 's' : ''}${rej ? ` · <b class="nm-ko">${rej} rejetée${rej > 1 ? 's' : ''}</b> (incomplètes : ${esc((OBLIGATOIRES_NORME[b.cible] || {}).entete || '')})` : ''}`;
    const apercu = b.cible && lus ? `<div class="nm-defile"><table class="nm-tab nm-apercu"><thead><tr><th></th>${cols.filter(cc => b.col[cc.champ] != null).map(cc => `<th>${esc(cc.libelle)}</th>`).join('')}</tr></thead><tbody>${b.lecture.lues.slice(0, 4).map(x => `<tr><td class="nm-etat">${badge(c.parLigne.get(x) === 'ajoutée' ? 'ajo' : c.parLigne.get(x) === 'modifiée' ? 'mod' : 'emb', c.parLigne.get(x))}</td>${cols.filter(cc => b.col[cc.champ] != null).map(cc => `<td>${esc(x.brut[cc.champ] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
    return `<div class="nm-bloc${b.hesite ? ' hesite' : ''}" data-bloc="${k}"><div class="nm-bloc-tete"><div class="min0"><b>${esc(b.titre || 'Bloc ' + (k + 1))}</b><span class="nm-bloc-ou">ligne ${b.ligne + 1} · ${pluriel(b.lignes.length, 'ligne')}</span></div>`
      + `<label class="nm-cible">${b.hesite ? badge('conf', 'l’outil hésite') : ''}<span>lire comme</span><select data-cible="${k}" aria-label="Table cible"><optgroup label="Reconnue">${cands.map(t => option(b, t, true)).join('')}</optgroup><optgroup label="Autre table">${autres.map(t => option(b, t, false)).join('')}</optgroup><option value=""${b.cible ? '' : ' selected'}>— ne pas importer</option></select></label></div>`
      + `<div class="nm-bloc-compte">${compte}</div>${b.cible ? `<div class="nm-bloc-cols"><span class="nm-cols-t">colonnes</span>${reconnues}${inconnues ? `<span class="nm-cols-t">non reconnues</span>${inconnues}` : ''}</div>` : ''}${apercu}</div>`; };
  return `<section class="nm-import" id="nm-import"><div class="nm-imp-tete"><div class="min0"><div class="sur">Import — à vérifier avant d’adopter</div><b>${esc(I.nom)}</b> · ${pluriel(I.blocs.length, 'table')} reconnue${I.blocs.length > 1 ? 's' : ''}</div><button class="btn cuivre" id="nm-adopter"${n ? '' : ' disabled'}>Adopter ${n ? pluriel(n, 'table') : ''}</button><button class="btn lien" id="nm-imp-annuler">Annuler</button></div>`
    + (I.vide ? `<p class="nm-vide">Aucune ligne d’en-tête reconnue. Il faut les en-têtes de l’outil, dans n’importe quel ordre : par exemple ${esc(colonnesDeTable('fils').slice(0, 5).map(c => c.libelle).join(' ; '))}. Les gabarits les donnent tous.</p>` : I.blocs.map(bloc).join('')) + '</section>'; }
/* Adopter l'import : les lignes de chaque bloc ciblé deviennent des apports sous le nom du fichier. */
function adopterImportNorme() { const I = NORMES.import; if (!I) return; const A = JSON.parse(JSON.stringify(NORMES.apports)); let n = 0, tables = new Set();
  I.blocs.forEach(b => { if (!b.cible || !b.lecture) return; b.lecture.lues.forEach(x => { if (poserApport(A, b.cible, x.brut, I.nom)) n++; }); if (b.lecture.lues.length) tables.add(b.cible); });
  NORMES.import = null; tables.forEach(t => { vuesNorme().forEach(v => { if (vueDe(v).table === t) NORMES.ouverts.add(v); }); });
  adopterApports(nettoyerApports(A), 'import de ' + I.nom); effacerErreur('normes'); dire(pluriel(n, 'ligne') + ' adoptée' + (n > 1 ? 's' : '') + ' de « ' + I.nom + ' » : les fiches et le contrôle suivent.'); }
function annulerImportNorme() { NORMES.import = null; rendreNormes(); }

/* ---- modifier : une ligne, sur place ----------------------------------------------- */
function modifierLigneNorme(v, cle) { const T = vueDe(v).table, x = (normeActive()[T] || []).find(y => cleDeLigne(T, y) === cle); if (!x) return;
  NORMES.edition = { vue: v, table: T, cle, brut: { ...brutDe(T, x) } }; NORMES.ouverts.add(v); rendreNormes(); focaliserEdition(); }
function ajouterLigneNorme(v, brut) { const V = vueDe(v); NORMES.edition = { vue: v, table: V.table, cle: null, brut: { ...(V.defaut || {}), ...(brut || {}) } }; NORMES.ouverts.add(v); rendreNormes(); focaliserEdition(); }
function dupliquerLigneNorme(v, cle) { const T = vueDe(v).table, x = (normeActive()[T] || []).find(y => cleDeLigne(T, y) === cle); if (!x) return; ajouterLigneNorme(v, brutDe(T, x)); }
function focaliserEdition() { const c = $('nm-premier-champ'); if (c) { c.focus(); try { c.select(); } catch (_) { } const tr = c.closest('tr'); if (tr && tr.scrollIntoView) { try { tr.scrollIntoView({ block: 'nearest' }); } catch (_) { } } } }
/* Relire les champs de la ligne en édition dans son brut. */
function lireEdition() { const E = NORMES.edition, tr = $('fiche-corps') && $('fiche-corps').querySelector('tr.nm-edition'); if (!E || !tr) return;
  tr.querySelectorAll('input.nm-champ').forEach(i => { E.brut[i.dataset.champ] = i.value.trim(); }); }
/* Valider : la ligne doit faire une entrée ; sa clé remplace, ou s'ajoute ; une ligne embarquée dont la clé change se masque. */
function validerLigneNorme() { const E = NORMES.edition; if (!E) return false; lireEdition(); const T = E.table, x = ENTREE_NORME[T](E.brut);
  if (!x) { const O = OBLIGATOIRES_NORME[T] || { champs: [] }, L = LIBELLES_NORME[T] || {}; dire('Ligne incomplète : il faut ' + (O.champs.length ? O.champs.map(c => L[c] || c).join(', ') : 'une valeur lisible') + '.', true); return false; }
  const A = JSON.parse(JSON.stringify(NORMES.apports)), k = cleDeLigne(T, x);
  if (E.cle != null && E.cle !== k) retirerApport(A, T, E.cle);
  poserApport(A, T, E.brut, 'main'); NORMES.edition = null; adopterApports(nettoyerApports(A), (E.cle == null ? 'ajout d’une ligne ' : 'modification d’une ligne ') + TITRES_NORME[T]);
  const tr = $('fiche-corps').querySelector(`.nm-table[data-vue="${E.vue}"] tr[data-cle="${CSS.escape(k)}"]`); if (tr) tr.focus();
  dire((E.cle == null ? 'Ligne ajoutée à ' : 'Ligne modifiée dans ') + TITRES_NORME[T] + ' : les fiches et le contrôle suivent. Ctrl+Z pour défaire.'); return true; }
function annulerLigneNorme() { if (!NORMES.edition) return; const v = NORMES.edition.vue; NORMES.edition = null; rendreNormes(); const t = $('fiche-corps').querySelector(`.nm-table[data-vue="${v}"] .nm-tab`); if (t) t.focus(); }
function supprimerLigneNorme(v, cle) { const T = vueDe(v).table, A = JSON.parse(JSON.stringify(NORMES.apports)); retirerApport(A, T, cle); adopterApports(nettoyerApports(A), 'suppression d’une ligne ' + TITRES_NORME[T]); dire('Ligne retirée de ' + TITRES_NORME[T] + '. Ctrl+Z pour défaire.'); }
function retablirLigneNorme(v, cle) { const T = vueDe(v).table, A = JSON.parse(JSON.stringify(NORMES.apports)), S = apportsDeTable(A, T); if (!A.tables[T]) return; A.tables[T].supprimees = (S.supprimees || []).filter(c => c !== cle); adopterApports(nettoyerApports(A), 'ligne rétablie dans ' + TITRES_NORME[T]); }
function revenirEmbarqueeTable(T) { const A = JSON.parse(JSON.stringify(NORMES.apports)); delete A.tables[T]; adopterApports(A, 'retour à l’embarquée : ' + TITRES_NORME[T]); dire(TITRES_NORME[T] + ' : l’embarquée est de retour. Ctrl+Z pour défaire.'); }

/* ---- exporter : une table, les modifications, un gabarit --------------------------------- */
// un nom de fichier en ASCII : ouvert depuis file://, Chromium remplace par « download » un nom qui porte un accent ou un tiret cadratin
const nomDeFichierNorme = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
function exporterTableNorme(v) { const V = vueDe(v), L = lignesDeVue(v); if (!L.lignes.length) { dire('Rien à exporter.'); return; }
  telecharger(new Blob(['﻿' + csvDeTable(L.table, L.lignes, V.titre + ' — ' + (FICHES_TABLES[L.table] || {}).source + ' — exporté d’Atelier Schéma')], { type: 'text/csv;charset=utf-8' }), 'normes-' + nomDeFichierNorme(V.titre) + '.csv'); dire(pluriel(L.lignes.length, 'ligne') + ' exportée' + (L.lignes.length > 1 ? 's' : '') + '.'); }
function telechargerGabaritNorme(T) { telecharger(new Blob(['﻿' + gabaritCsv(T)], { type: 'text/csv;charset=utf-8' }), 'gabarit-' + nomDeFichierNorme(TITRES_NORME[T]) + '.csv'); dire('Gabarit ' + TITRES_NORME[T] + ' enregistré : remplis-le, dépose-le sur la table.'); }
/* Toutes les modifications du navigateur en un fichier : un bloc par table (ses lignes importées ou modifiées), et en
   tête, les lignes embarquées masquées. Il se relit tel quel. */
function csvDesApports(A) { const blocs = []; TABLES_NORME.forEach(t => { const T = apportsDeTable(A, t), N = normeDesApports({ tables: { [t]: T } });
    if (N[t].length) blocs.push(csvDeTable(t, N[t], TITRES_NORME[t] + ' — lignes importées ou modifiées dans Atelier Schéma'));
    if ((T.supprimees || []).length) blocs.push('Lignes embarquées masquées dans ' + TITRES_NORME[t] + ' (clés) : ' + T.supprimees.join(' | ') + '\n'); });
  return blocs.join('\n'); }
function exporterApportsNormes() { const csv = csvDesApports(NORMES.apports); if (!csv) { dire('Rien de modifié.'); return; }
  telecharger(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), 'normes-mes-modifications.csv'); dire('Tes modifications sont enregistrées en un CSV.'); }

/* ---- les gestes de la page, posés une fois ----------------------------------------------- */
function lierNormes() { const c = $('fiche-corps'); if (!c) return;
  const q = $('nm-q'); if (q) { let t; q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { NORMES.q = q.value.trim(); const pos = q.selectionStart; rendreNormes(); const q2 = $('nm-q'); if (q2) { q2.focus(); try { q2.setSelectionRange(pos, pos); } catch (_) { } } }, 220); }); }
  if ($('nm-q-vider')) $('nm-q-vider').onclick = () => { NORMES.q = ''; rendreNormes(); const q2 = $('nm-q'); if (q2) q2.focus(); };
  if ($('nm-importer')) $('nm-importer').onclick = () => $('fichier-norme').click(); if ($('no-importer')) $('no-importer').onclick = () => $('fichier-norme').click();
  if ($('fichier-norme')) $('fichier-norme').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) importerNorme(f); e.target.value = ''; });
  if ($('nm-coller')) $('nm-coller').onclick = () => { NORMES.import = { nom: 'texte collé', blocs: [], coller: true, vide: false }; rendreNormes(); };
  if ($('nm-guide')) $('nm-guide').onclick = () => { NORMES.guide = !NORMES.guide; rendreNormes(); };
  if ($('nm-exporter-tout')) $('nm-exporter-tout').onclick = exporterApportsNormes;
  if ($('nm-defaire')) $('nm-defaire').onclick = () => { const quoi = defaireNormes(); if (quoi) dire('Défait : ' + quoi + '.'); };
  if ($('no-embarquee')) $('no-embarquee').onclick = () => { adopterApports(apportsVides(), 'retour à la norme embarquée'); dire('Norme embarquée rétablie. Ctrl+Z pour défaire.'); };
  if ($('nm-adopter')) $('nm-adopter').onclick = adopterImportNorme; if ($('nm-imp-annuler')) $('nm-imp-annuler').onclick = annulerImportNorme;
  if ($('nm-coller-ok')) $('nm-coller-ok').onclick = () => importerNormeTexte($('nm-coller-txt').value, 'texte collé');
  if ($('nm-ok')) $('nm-ok').onclick = validerLigneNorme; if ($('nm-annuler')) $('nm-annuler').onclick = annulerLigneNorme;
  c.querySelectorAll('select[data-cible]').forEach(s => s.addEventListener('change', () => { const b = NORMES.import.blocs[+s.dataset.cible]; b.cible = s.value; b.manuel = {}; preparerBloc(b); rendreNormes(); }));
  c.querySelectorAll('select[data-colonne]').forEach(s => s.addEventListener('change', () => { const b = NORMES.import.blocs[+s.dataset.colonne]; b.manuel[s.dataset.indice] = s.value; preparerBloc(b); rendreNormes(); }));
  c.querySelectorAll('input[data-filtre]').forEach(i => { let t; i.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { const v = i.dataset.filtre; NORMES.filtres[v] = i.value.trim(); const z = c.querySelector(`.nm-table[data-vue="${v}"] .nm-t-zone`); if (z) z.innerHTML = corpsTableHtml(v, lignesDeVue(v)); }, 150); });
    i.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); if (i.value) { i.value = ''; i.dispatchEvent(new Event('input')); } else i.blur(); } }); });
  if (NORMES.lie) return; NORMES.lie = true;
  // les gestes qui vivent dans les tables se posent une fois, sur le corps : la page se refait souvent
  c.addEventListener('click', e => { if (!(app.fiche && (app.fiche.mode === 'normes' || app.fiche.mode === 'bible'))) return; const t = e.target.closest('button, th[data-tri]'); if (!t) return;
    const d = t.dataset;
    if (d.nmVue) { if (d.nmVue === 'bible') ficheBible(''); else ficheNormes(); return; }
    if (app.fiche.mode !== 'normes') return;
    if (t.classList.contains('nm-t-tete')) { const v = t.closest('.nm-table').dataset.vue; if (NORMES.ouverts.has(v)) NORMES.ouverts.delete(v); else NORMES.ouverts.add(v); rendreNormes(); return; }
    if (d.cols) { if (NORMES.colonnes.has(d.cols)) NORMES.colonnes.delete(d.cols); else NORMES.colonnes.add(d.cols); rendreNormes(); return; }
    if (d.tri) { const v = t.closest('.nm-table').dataset.vue, tri = NORMES.tris[v]; NORMES.tris[v] = !tri || tri.champ !== d.tri ? { champ: d.tri, sens: 1 } : tri.sens > 0 ? { champ: d.tri, sens: -1 } : null; rendreNormes(); return; }
    if (d.entier) { NORMES.entier.add(d.entier); rendreNormes(); return; }
    if (d.ajouter) { ajouterLigneNorme(d.ajouter); return; }
    if (d.exporter) { exporterTableNorme(d.exporter); return; }
    if (d.gabarit) { telechargerGabaritNorme(d.gabarit); return; }
    if (d.embarquee) { revenirEmbarqueeTable(d.embarquee); return; }
    if (d.masquees) { if (NORMES.masquees.has(d.masquees)) NORMES.masquees.delete(d.masquees); else NORMES.masquees.add(d.masquees); rendreNormes(); return; }
    if (d.voirTable) { NORMES.ouverts.add(d.voirTable); NORMES.filtres[d.voirTable] = NORMES.q; NORMES.q = ''; rendreNormes(); const el = c.querySelector(`.nm-table[data-vue="${d.voirTable}"]`); if (el && el.scrollIntoView) { try { el.scrollIntoView({ block: 'start' }); } catch (_) { } } return; }
    const tr = t.closest('tr');
    if (d.modifier && tr) { modifierLigneNorme(d.modifier, tr.dataset.cle); return; }
    if (d.dupliquer && tr) { dupliquerLigneNorme(d.dupliquer, tr.dataset.cle); return; }
    if (d.supprimer && tr) { supprimerLigneNorme(d.supprimer, tr.dataset.cle); return; }
    if (d.retablir && tr) { retablirLigneNorme(d.retablir, tr.dataset.masquee); return; } });
  c.addEventListener('dblclick', e => { if (!(app.fiche && app.fiche.mode === 'normes')) return; const tr = e.target.closest('tr[data-cle]'); if (!tr || tr.closest('.nm-resultats')) return; const v = tr.closest('.nm-table').dataset.vue; modifierLigneNorme(v, tr.dataset.cle); });
  c.addEventListener('keydown', e => { if (!(app.fiche && app.fiche.mode === 'normes')) return;
    if (e.target.classList && e.target.classList.contains('nm-champ')) { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); validerLigneNorme(); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); annulerLigneNorme(); } return; }
    const th = e.target.closest && e.target.closest('th[data-tri]'); if (th && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); th.click(); return; }
    const tr = e.target.closest && e.target.closest('tr[data-cle]'); if (tr && e.key === 'Enter' && !tr.closest('.nm-resultats')) { e.preventDefault(); modifierLigneNorme(tr.closest('.nm-table').dataset.vue, tr.dataset.cle); return; }
    if (e.key === 'Escape' && NORMES.edition) { e.stopPropagation(); annulerLigneNorme(); } });
  // Ctrl+Z dans la page : l'historique des normes, pas celui du contrat (le gestionnaire de la fenêtre ne le voit pas)
  $('fiche').addEventListener('keydown', e => { if (!(app.fiche && app.fiche.mode === 'normes')) return; if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !(e.target.classList && e.target.classList.contains('nm-champ'))) { e.preventDefault(); e.stopPropagation(); const quoi = defaireNormes(); dire(quoi ? 'Défait : ' + quoi + '.' : 'Rien à défaire dans les normes.'); } }); }
// le mode « coller » de l'import : une zone de texte à la place des blocs
const importCollerHtml = () => `<section class="nm-import" id="nm-import"><div class="nm-imp-tete"><div class="min0"><div class="sur">Coller des lignes</div><b>Une ligne d’en-tête, puis les lignes</b> — colonnes séparées par ; , ou une tabulation (copiées d’un Excel)</div><button class="btn cuivre" id="nm-coller-ok">Lire</button><button class="btn lien" id="nm-imp-annuler">Annuler</button></div><label class="champ"><span>Lignes</span><textarea id="nm-coller-txt" placeholder="Type;Jauge;Section;Résistance 20;Intensité&#10;DR;24;0,24;85;3,5" spellcheck="false"></textarea></label></section>`;
const importHtmlOuColler = () => NORMES.import.coller && !NORMES.import.blocs.length ? importCollerHtml() : importHtml();

/* ---- la bible des barrettes (venue de 08) ------------------------------------------------- */
/* La bible des barrettes : d'où elle vient, ce qu'elle contient, et comment en mettre une autre ; puis la norme en
   deux lignes (la page des normes dit le reste), et les contrats déjà faits. */
const COLONNES_BIBLE_TEXTE = '<b>Référence</b> et <b>Bornes</b> au minimum, puis Famille, Nature, Jauge min, Jauge max, Intensité, Blindage, Note';
const COLONNES_NORME_TEXTE = 'une table <b>Familles</b> (Famille, Pas, Jauge min, Jauge max, Intensité, Résistance, Fils par côté, Ordre, Paquets, Réservés, Masse), une table <b>Fils</b> (Type, Jauge, Section, Résistance, Intensité), <b>Déclassement</b> (Condition, Facteur), <b>Réseau</b> (Tension, Chute max), <b>Contacts</b> (Norme, Sexe, Taille, Type de fil, Jauge, Contact, Accessoire), <b>Câbles</b> (Câble, Famille, Jauge, Brins, Blindage, Nature, Masse, Liaisons, Résistance, Diamètre, Section), <b>Gaines</b> (Famille, Référence, Dint, Dext, Masse), <b>Colliers</b> (Référence, Diamètre min, Diamètre max)';
/* `ref` : la référence à montrer en grand, DÉPLIÉE SOUS SA LIGNE — celle qu'on a cliquée dans la table, ou celle qu'une
   carte de barrette demande (elle vient alors sous les yeux). La bible refaite garde sa position de lecture ; `ancre`
   ({ ref, top }) : la ligne qu'on vient de cliquer reste où elle était à l'écran, quoi qu'il se soit déplié ou replié
   au-dessus d'elle. Même largeur, même gabarit que la page des normes (`.nm`) : ce sont deux onglets. */
function ficheBible(ref, ancre) { const B = app.bible || [], nom = app.bibleNom, n = B.length, familles = [...new Set(B.filter(e => e.module).map(e => e.famille))]; ref = typeof ref === 'string' ? ref : '';
  const zoom = ref ? B.find(e => e.reference === ref) || null : null, deja = !!(app.fiche && app.fiche.mode === 'bible'), y = deja ? $('fiche-corps').scrollTop : 0, avant = deja ? app.fiche.ref || '' : '';
  const etat = nom ? `<div class="bible-etat"><span><b>${esc(nom)}</b>\u00a0· ${plurielLie(n, 'référence')}\u00a0· gardée dans ce navigateur</span></div>`
    : (() => { const compte = fs => fs.map(f => plurielLie(B.filter(e => e.module && e.famille === f).length, 'module') + ' ' + nomDeFamille(app.norme, f)).join(' et '), bar = famillesDeModules(app.norme), con = famillesDeModules(app.norme, 'connecteur');
        return `<div class="bible-etat exemple"><span><b>Bible de l’outil</b>\u00a0· pour les barrettes, ${compte(bar.filter(f => familles.includes(f)))}${con.length ? ` ; pour les connecteurs et les prises de coupure, ${compte(con.filter(f => familles.includes(f)))}` : ''} — et ${pluriel(B.filter(e => !e.module).length, 'référence')} d’exemple (coupures, connecteurs).</span></div>`; })();
  // un filtre par norme : les modules d'une norme, ou le reste (coupures, connecteurs)
  const filtre = app.base.bibleFiltre || '', garde = e => !filtre || (filtre === '-' ? !e.module : e.module && e.famille === filtre), vus = B.filter(e => garde(e) || e === zoom);
  const filtres = B.some(e => e.module) ? `<div class="bible-filtres" role="group" aria-label="Filtrer la bible">` + [['', 'tout', n], ...familles.map(f => [f, nomDeFamille(app.norme, f), B.filter(e => e.module && e.famille === f).length]), ['-', 'coupures et connecteurs', B.filter(e => !e.module).length]]
    .map(([f, t, k]) => `<button class="mj-norme ${f && f !== '-' ? classeFamille(f) : ''}" data-filtre="${escA(f)}" aria-pressed="${filtre === f}">${esc(t)}\u00a0· ${k}</button>`).join('') + '</div>' : '';
  // une ligne, et sous la ligne choisie, la référence en grand ; la note tient sur une ligne (entière au survol)
  const ligne = e => `<tr class="${e === zoom ? 'on' : ''}"><td class="pict">${pictoBible(e)}</td><td class="ref"><button class="ref-btn" data-ref="${escA(e.reference)}" aria-pressed="${e === zoom}" title="${e === zoom ? 'Replier' : 'Voir la référence en grand'}">${esc(e.reference)}</button></td>
    <td class="sans">${esc(e.nature)}</td><td class="d">${nombre(e.bornes)}</td>
    <td class="d">${jaugeEntree(e)}</td><td class="d">${e.intensite != null ? nombre(e.intensite) + '\u00a0A' : '—'}</td><td>${e.blindage ? 'oui' : '—'}</td><td class="bible-note"${e.note ? ` title="${escA(e.note)}"` : ''}>${esc(e.note)}</td></tr>`
    + (e === zoom ? `<tr class="bz-ligne"><td colspan="8">${zoomBible(e)}</td></tr>` : '');
  const corps = '<div class="nm">' + tete('Barrettes et connecteurs', 'Bible des barrettes', true) + nmNav('bible') + etat + filtres
    + (n ? `<table class="bible"><thead><tr><th></th><th>Référence</th><th>Nature</th><th class="d">Bornes</th><th class="d">Jauge</th><th class="d" title="Intensité">Int.</th><th title="Blindage">Blindé</th><th>Note</th></tr></thead><tbody>${vus.map(ligne).join('')}</tbody></table>` : '<p class="note">Aucune référence.</p>')
    + `<p class="note">Un Excel ou un CSV dont une ligne d’en-têtes nomme ${COLONNES_BIBLE_TEXTE}. La jauge s’écrit en AWG : «\u00a0min\u00a0» est la plus fine acceptée. Une bible se dépose aussi directement sur la table.</p>`
    + resumeNormeHtml() + ficheReferences() + '</div>';
  const pied = '<button class="btn cuivre" id="bi-importer">Importer un Excel / CSV</button><button class="btn papier" id="no-importer">Importer une norme</button><button class="btn papier" id="re-importer">Contrats déjà faits</button><input type="file" id="fichier-norme" accept=".csv,.tsv,.txt,.xlsx,.xlsm,.xls" hidden><input type="file" id="fichier-references" accept=".csv,.tsv,.txt,.xlsx,.xlsm,.xls" hidden><span class="espace"></span>'
    + (nom ? '<button class="btn lien" id="bi-exemple">Revenir à la bible d’exemple</button>' : '') + (app.normeNom ? '<button class="btn lien" id="no-embarquee">Revenir à la norme embarquée</button>' : '');
  ouvrirFiche({ mode: 'bible', large: true, ref: zoom ? ref : '' }, corps, pied); elargirNormes(deja); lierNormes();
  // la position : la ligne cliquée reste en place ; sinon la lecture reprend où elle était ; une autre référence demandée
  // d'ailleurs (la carte d'une barrette) vient sous l'en-tête de la table
  const c = $('fiche-corps'), ligneDe = r => { const b = r && c.querySelector(`.ref-btn[data-ref="${CSS.escape(r)}"]`); return b ? b.closest('tr') : null; };
  c.scrollTop = y;
  const tr = ancre && ancre.ref ? ligneDe(ancre.ref) : null;
  if (tr) c.scrollTop += tr.getBoundingClientRect().top - ancre.top;
  else if (zoom && zoom.reference !== avant) { const z = ligneDe(zoom.reference), h = c.querySelector('table.bible thead'); if (z) c.scrollTop += z.getBoundingClientRect().top - c.getBoundingClientRect().top - (h ? h.offsetHeight : 0); }
  const surPlace = b => ({ ref: b.dataset.ref, top: b.closest('tr').getBoundingClientRect().top });
  $('bi-importer').onclick = () => $('fichier-bible').click();
  $('re-importer').onclick = () => $('fichier-references').click();
  $('fichier-references').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) importerReferences(f); e.target.value = ''; });
  if ($('bi-exemple')) $('bi-exemple').onclick = () => { adopterBible(bibleExemple(), ''); dire('Bible d’exemple rétablie.'); };
  if ($('no-embarquee')) $('no-embarquee').onclick = () => { adopterApports(apportsVides(), 'retour à la norme embarquée'); dire('Norme embarquée rétablie.'); };
  if ($('bi-normes')) $('bi-normes').onclick = () => ficheNormes();
  c.querySelectorAll('.ref-btn').forEach(b => b.onclick = () => ficheBible(b.getAttribute('aria-pressed') === 'true' ? '' : b.dataset.ref, surPlace(b)));
  if ($('bz-fermer') && zoom) $('bz-fermer').onclick = () => { const z = ligneDe(zoom.reference); ficheBible('', z ? surPlace(z.querySelector('.ref-btn')) : null); };
  c.querySelectorAll('.bible-filtres .mj-norme').forEach(b => b.onclick = () => { app.base.bibleFiltre = b.dataset.filtre; ficheBible(zoom ? ref : ''); });
}
/* La norme en deux lignes dans la bible : d'où elle vient, ce qui est modifié, et la page qui dit tout. */
function resumeNormeHtml() { const N = normeActive(), modifiees = TABLES_NORME.filter(tableModifiee), total = TABLES_NORME.reduce((n, t) => n + (N[t] || []).length, 0);
  const compte = [plurielLie((N.modules || []).length, 'module'), plurielLie((N.contacts || []).length, 'contact') + ' à sertir', plurielLie((N.cables || []).length, 'câble'), plurielLie(N.fils.length, 'fil') + ' (EN 2853)', plurielLie(courbesDeDisjonction(N).length, 'courbe') + ' de disjonction', plurielLie((N.raccords || []).length, 'raccord')].join(' · ');
  return `<h3 class="sous-titre">La norme</h3><div class="bible-etat${modifiees.length ? '' : ' exemple'}"><span><b>${modifiees.length ? pluriel(modifiees.length, 'table') + ' modifiée' + (modifiees.length > 1 ? 's' : '') + ' dans ce navigateur' : 'Norme embarquée'}</b> · ${TABLES_NORME.length} tables, ${pluriel(total, 'ligne')} · ${compte}${modifiees.length ? ' — ' + esc(app.normeNom) : ''}</span></div>`
    + `<p class="note">La page <b>Normes</b> classe les ${TABLES_NORME.length} tables par domaine, dit ce que chacune vérifie et comment une ligne se choisit, et permet d’importer, de modifier et d’exporter chaque table. <button class="fi-lien" id="bi-normes">Voir les normes</button></p>`; }
/* Le pictogramme d'une référence dans la table : sa physique en petit — un trait par module, à la même échelle pour
   toutes, pour comparer d'un œil. */
function pictoBible(e) { if (e.module) { const m = moduleDeReference(app.norme, e.reference); if (m) return pictoModule(m); }
  const n = Math.min(40, Math.max(1, Math.round(e.bornes || 1))), w = n * 4 + 2, W = Math.min(w, 44), k = W / w;
  if (e.nature === 'coupure' || e.nature === 'connecteur') { const deux = e.nature === 'coupure', H = deux ? 15 : 8;
    const bande = y => `<rect x="0.5" y="${y + 0.5}" width="${w - 1}" height="6.5" rx="1.5"/>` + Array.from({ length: n }, (_, j) => `<circle cx="${j * 4 + 3}" cy="${y + 3.75}" r="1.1"/>`).join('');
    return `<svg class="picto" width="${f1(W)}" height="${f1(H * k)}" viewBox="0 0 ${w} ${H}" aria-hidden="true"><g class="p-bande">${bande(0)}${deux ? bande(8) : ''}</g></svg>`; }
  return `<svg class="picto" width="${f1(W)}" height="${f1(10 * k)}" viewBox="0 0 ${w} 10" aria-hidden="true"><g class="p-cell${e.nature === 'blindage' ? ' p-blind' : ''}">`
    + Array.from({ length: n }, (_, j) => `<rect x="${j * 4 + 1.5}" y="0.5" width="3" height="7"/>`).join('') + `</g><rect class="p-rail" x="0.5" y="8" width="${w - 1}" height="1.5"/></svg>`; }
/* Une référence en grand : le même dessin que la carte d'une barrette, sans contrat — tous ses modules — et ses
   caractéristiques. */
function zoomBible(e) { if (e.module && moduleDeReference(app.norme, e.reference)) return zoomModule(e);
  const P = remplirSelonNorme(physiqueDeReference(e), app.norme), forme = e.nature === 'coupure' ? 'coupure' : e.nature === 'connecteur' ? 'connecteur' : 'reglette', F = P.famille;
  const carac = [['famille', e.famille], ['nature', P.nature], [forme === 'reglette' ? 'modules' : 'contacts', nombre(e.bornes)], ['jauge', e.jaugeMin == null ? '—' : jaugeEntree(e) + ' AWG'],
    ['intensité', e.intensite != null ? nombre(e.intensite) + ' A' : '—'], ['blindage', e.blindage ? 'oui' : 'non'], e.mobile ? ['partie mobile', e.mobile] : null, e.note ? ['note', e.note] : null,
    ['norme', F ? F.norme + (F.pas != null ? ' · pas ' + nombre(F.pas) + ' mm' : '') + (F.resistance != null ? ' · ' + nombre(F.resistance) + ' mΩ' : '') + ' · ' + pluriel(F.filsParCote, 'fil') + ' par côté' : 'aucune pour cette famille']].filter(Boolean);
  return `<div class="bible-zoom"><div class="bz-tete"><div class="min0"><div class="sur">${esc(P.nature)}</div><div class="bz-ref">${esc(e.reference)}</div></div>
      <button class="rond fermer" id="bz-fermer" aria-label="Replier la référence"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    ${dessinPhysique('', P, largeurFiche(), { forme })}
    <div class="bar-faits">${carac.map(([k, v]) => `<span>${esc(k)}</span><span>${esc(v)}</span>`).join('')}</div></div>`; }
/* Importer une bible : ce qui ne convient pas s'écrit dans la carte de la bible de « Vos fichiers » (ce qui a été lu, ce
   qu'il faut, un modèle), et la bible d'avant reste. */
async function importerBible(fichier) { if (!fichier) return; const nom = fichier.name || 'le fichier';
  const L = await lireLeFichier(fichier); if (L.erreur) { echecImport('bible', L.erreur); return; }
  try { const r = lireBible(L.texte);
    if (!r.entrees.length) { echecImport('bible', { texte: `${esc(nom)} n’a pas l’air d’une bible : il faut une ligne d’en-têtes avec ${COLONNES_BIBLE_TEXTE}. ${ceQueJaiLu(L.brutes)}`, gestes: [['modele-bible', 'Télécharger un modèle']] },
      '« ' + nom + ' » n’a pas l’air d’une bible : il faut au moins les colonnes Référence et Bornes.'); return; }
    adopterBible(r.entrees, nom); effacerErreur('bible'); rendreFichiers(); dire(pluriel(r.entrees.length, 'référence') + ' lue' + (r.entrees.length > 1 ? 's' : '') + ' : les barrettes suivent.');
  } catch (e) { echecImport('bible', { texte: `${esc(nom)} n’a pas pu être lu : ${esc(String(e && e.message || e))}.` }); } }
