/* ===========================================================================
   08 octies — LES NORMES : importer, classer, modifier ; et la bible des barrettes
   ---------------------------------------------------------------------------
   Le lecteur : « importer toutes les normes que j'ai pas faites, barrette, prise de coupure, raccord, disjoncteur,
   tout ; tout doit être modifiable et facilement ; trier et classer hyper bien pour bien comprendre ; pouvoir les
   mettre automatiques, pas automatiques, comment c'est choisi, comment ça marche, qu'est-ce que ça vérifie ».
     · LA PAGE « NORMES » (`ficheNormes`) : les vingt tables du moteur classées par DOMAINE (barrettes, prises et
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
     · LA BIBLE DES BARRETTES (`ficheBible`, venue de 08) : les références, chacune en petit et en grand, la base des
       contrats déjà faits (08 sexies) ; et avec elle la persistance de la bible, de la norme et des hypothèses.
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
  'familles:connecteur': { table: 'familles', titre: 'Familles (prises et connecteurs)', garde: f => f.nature === 'coupure' || f.nature === 'connecteur', defaut: { nature: 'coupure' } }
};
const vueDe = v => VUES_NORMES[v] || { table: v, titre: TITRES_NORME[v], garde: null, defaut: null };
const DOMAINES_NORMES = [
  { id: 'barrettes', titre: 'Barrettes et modules de jonction', sens: 'Une barrette du contrat se pose en modules ASNE 0599 ou NSA937901 : chaque potentiel prend un groupe de contacts reliés, chaque fil un contact qui admet sa jauge.', vues: ['modules:barrette', 'tailles:barrette', 'familles:barrette'] },
  { id: 'prises', titre: 'Prises de coupure et connecteurs', sens: 'Un connecteur d’équipement ou une prise de coupure reçoit un arrangement (EN 4165, EN 2997, EN 3645, EN 3646, ASNE 0059) : chaque borne est le contact de même numéro ou de même rang.', vues: ['modules:connecteur', 'tailles:connecteur', 'familles:connecteur'] },
  { id: 'contacts', titre: 'Contacts à sertir', sens: 'Sur chaque fil d’un connecteur, le contact à sertir et son accessoire (tables SEE) ; par taille, la résistance d’une paire.', vues: ['contacts', 'resistancesContacts'] },
  { id: 'cables', titre: 'Câbles et fils', sens: 'Le câble de chaque fil du retest (la base des câbles), le conducteur de sa famille, et ce qu’une jauge admet (EN 2853).', vues: ['cables', 'cablesFamilles', 'fils'] },
  { id: 'chute', titre: 'Chute, réseau et déclassement', sens: 'Ce que le réseau admet de chute en ligne, et ce qui réduit l’intensité admissible d’un fil (faisceau, altitude).', vues: ['reseau', 'declassements'] },
  { id: 'disjoncteurs', titre: 'Disjoncteurs', sens: 'Les courbes de disjonction qui jugent un profil de charge, la protection par jauge, les familles et leurs points de calibration.', vues: ['disjoncteurs', 'protections', 'disjoncteursFamilles', 'calibrations'] },
  { id: 'raccords', titre: 'Raccords, gaines, colliers, manchons', sens: 'Ce qui englobe un connecteur, par le tutoriel du lecteur : le toron, la taille et la classe du boîtier, le raccord EN 3660 (sa désignation construite), le code d’entrée, la bande, la gaine, le manchon.', vues: ['raccords', 'entrees', 'classes', 'manchons', 'gaines', 'colliers', 'filetages'] },
  { id: 'contrats', titre: 'Contrats déjà faits', sens: 'La base des harness déjà câblés (un retest de plusieurs harness) : « Déjà fait » sur chaque fiche, la comparaison, le FWD dessiné. Elle se dépose et se cherche depuis la bible.', vues: [] }
];
/* Pour chaque table : d'où elle vient, à quoi elle sert dans l'outil, qui la lit, comment une ligne se choisit. */
const FICHES_TABLES = {
  modules: { source: 'ASNE 0599 (p. 8-11), NSA937901 (fig. 13-15), EN 4165-002, EN 2997-002, EN 3645-002, EN 3646-002, ASNE 0059', sert: 'C’est elle qui dit quels modules et quels arrangements existent : chaque barrette se remplit avec, chaque connecteur ou prise de coupure reçoit un arrangement.',
    lue: 'la fiche d’une barrette (variante, face, groupes), d’une prise de coupure et d’un connecteur (arrangement, face), le relief, la nomenclature, la bible',
    choix: 'automatique : la variante que le part number nomme, sinon celle qui loge le plus de potentiels en perdant le moins de contacts (usage « normal » préféré) ; pour un connecteur, le plus petit arrangement qui loge toutes les bornes avec leurs jauges — manuelle : « Changer » sur la fiche (une variante, une norme)' },
  tailles: { source: 'plages usuelles des contacts EN 3155 ; les titres des figures NSA937901 — à confirmer', sert: 'Les jauges AWG qu’un contact de cette taille reçoit, quand la table Contacts ne connaît pas la taille (EN 3645 : 10, 8T).',
    lue: 'le remplissage des modules (un fil refusé par son contact), la taille de contact d’une jauge pour la résistance de contact (chute en ligne)', choix: 'automatique : la famille et la taille exactes, sinon la taille sans famille' },
  familles: { source: 'EN 2997, EN 3645, EN 3646, EN 4165, ASNE 0059, ASNE 0599, NSA937901 ; la prise EN3646 d’exemple (norme-exemple.csv, chiffres inventés)', sert: 'Ce qu’un contact admet (jauges, intensité, résistance), combien de fils par côté, la règle de remplissage : c’est elle qui juge la jauge de chaque fil d’une barrette ou d’une prise hors modules.',
    lue: 'la carte d’une barrette ou d’une prise (trous, règle, verdicts), la simulation (I contact, R contact), la chute en ligne (la résistance de contact des prises traversées)', choix: 'automatique : la famille la plus longue dont le nom commence la référence (EN3646A6083AAN → EN3646) ; la bible peut nommer la famille' },
  contacts: { source: 'tables SEE Electrical Equipment Definition (EN2997 v6, EN3645 v2, EN3646 v13, EN4165 v49)', sert: 'Le contact à sertir sur chaque fil, et son accessoire — c’est elle qui juge la jauge de chaque fil d’un connecteur.',
    lue: 'la fiche d’un connecteur et d’une prise (le contact de chaque fil, « à sertir »), la nomenclature, le contrôle (un fil qu’aucun contact ne reçoit)', choix: 'automatique : la ligne la plus précise gagne — le type de fil exact avant « * », la jauge exacte avant « * » ; entre deux arrangements, le moins accommodant (sans fourreau) — manuelle : le sexe des contacts, « Changer » sur la fiche' },
  resistancesContacts: { source: 'AS39029 / MIL-DTL-39029 (mêmes tailles que l’EN 3155)', sert: 'La résistance d’une paire de contacts par taille : elle entre dans la chute en ligne de chaque prise traversée, et deux fois pour une barrette.',
    lue: 'la chute en ligne (fiche d’un disjoncteur, fiche d’un fil), la simulation d’une barrette ou d’une prise', choix: 'automatique : la taille du contact (par la jauge du fil), sinon la même sans lettre (22D → 22), sinon la plus proche' },
  cables: { source: 'l’onglet Câbles de l’Excel du lecteur, vérifié contre les fiches Lynxeo', sert: 'La base des câbles : le câble de chaque fil du retest (brins, blindage, masse, résistance, diamètre, section) — c’est elle qui donne la résistance de la chute en ligne et le toron de chaque connecteur.',
    lue: 'la fiche d’un fil (câble), la chute en ligne (ρ du câble), « autour » de chaque connecteur (toron, raccord, collier, gaine), la nomenclature (masse), le contrôle (un type inconnu de la base)', choix: 'automatique : le type tel quel (DR24), sinon sa famille et sa jauge (« dr 24 » → DR24)' },
  cablesFamilles: { source: 'EN 2267-010, EN 2714-013, ABS 0949, ABS 1356, EN 3375, EN 4604 (recherche d’octobre 2026)', sert: 'Le conducteur d’une famille (cuivre, aluminium cuivré, aluminium) : un câble qui n’est pas en cuivre ne prend jamais la ligne cuivre de l’EN 2853, et son intensité se déclasse.',
    lue: 'la chute en ligne et la simulation (la résistance d’un fil), la fiche d’un fil', choix: 'automatique : la famille lue en tête du type (DR24 → DR)' },
  fils: { source: 'EN 2853:2005, tables 1 et 2', sert: 'Par jauge, ce qu’un fil admet (en continu, 2 s, 10 s, 1 min) et sa résistance : c’est elle qui juge le courant de chaque fil et nourrit la chute.',
    lue: 'la fiche d’un fil (admet), la fiche d’un disjoncteur (chaque fil contre le profil), la simulation d’une barrette ou d’une prise, le contrôle (un fil qui ne tient pas)', choix: 'automatique : le type et la jauge exacts, sinon la ligne « * » de la jauge, sinon la jauge seule (et la fiche le dit) — jamais la jauge seule pour un conducteur qui n’est pas du cuivre' },
  reseau: { source: 'AC 43.13-1B table 11-6 (FAA) — en attendant les règles du programme (ABD0100)', sert: 'La chute de tension admise par tension du réseau : c’est elle qui juge la chute de chaque fil et de chaque chemin.',
    lue: 'la chute en ligne (fiche d’un disjoncteur, d’un fil), la simulation', choix: 'automatique : la ligne de la tension d’hypothèse, sinon la plus proche ; en triphasé, la ligne de la tension composée (115 → 200 V)' },
  declassements: { source: 'AC 43.13-1B fig. 11-5 et 11-6 (FAA)', sert: 'Les facteurs qui réduisent l’intensité admissible d’un fil : le faisceau (fils × charge), l’altitude.',
    lue: 'la simulation (chaque condition est une case à cocher dans les hypothèses), la fiche d’un fil, la fiche d’un disjoncteur', choix: 'automatique : les conditions cochées dans les hypothèses ; le point « fils × charge » le plus proche du faisceau simulé, l’altitude interpolée' },
  disjoncteurs: { source: 'l’Excel du lecteur (feuille Base_de_données), comparé point par point à la calibration Klixon', sert: 'Les courbes de disjonction : c’est elles qui disent si un profil de charge déclenche le disjoncteur.',
    lue: 'la fiche d’un disjoncteur (le graphique, le verdict, le calibre idéal), le contrôle (un disjoncteur qui déclenche)', choix: 'automatique : toutes les courbes de la famille ; le verdict sur la plus rapide (125 °C), la marge sur les autres ; entre deux points, interpolation log-log, en enveloppe' },
  protections: { source: 'AC 43.13-1B table 11-3', sert: 'Le calibre maximal du disjoncteur par jauge de fil, et la taille de contact courante d’une jauge.',
    lue: 'la taille de contact d’une jauge (chute en ligne) quand la table Tailles l’ignore', choix: 'automatique : la jauge du fil', manque: 'le calibre maximal n’est pas encore confronté au disjoncteur de chaque fil' },
  disjoncteursFamilles: { source: 'Sensata (2TC, 3TC, 6TC, 9TC, 7274), Crouzet, Safran, EN 2495 / 2995, EN 3661 / 3662', sert: 'Ce qu’une famille de disjoncteurs est : la norme, les pôles, la gamme de calibres, l’ambiante admise, la courbe à prendre.',
    lue: 'personne encore : le calibre d’un part number se lit par une liste codée dans l’outil (MS3320, AS33201, 3TC, 6TC, 9TC, 7274…)', choix: 'le préfixe du part number (MS3320-10 → MS3320)', manque: 'brancher la lecture du part number sur cette table (aujourd’hui une liste codée)' },
  calibrations: { source: 'Sensata 2TC/3TC/7274, Military-Fasteners MS3320, Safran 170', sert: 'Les points normalisés des disjoncteurs thermiques — ce qu’ils tiennent une heure, ce qui déclenche, les temps à 200, 500, 1000 % de In — pour vérifier une courbe.',
    lue: 'personne encore : informative (les courbes ont été comparées à ces points en octobre 2026)', choix: '—', manque: 'confronter chaque courbe importée à la calibration de sa famille' },
  raccords: { source: 'EN 3660 : dessins TE/Polamco P20027 (-064) et c-2275010 (-004), iTeh EN 3660-063/-064:2022, prEN 3660-065:2026, l’index BSI de la série (recherche R4, octobre 2026)', sert: 'La référence du raccord arrière par famille de connecteur, taille de boîtier, type que le tutoriel décide et orientation : un MODÈLE de désignation (EN3660-064N12<L><E>) que l’outil complète avec la classe du connecteur, la chambre et le code d’entrée du toron ; les cotes A (toron admis), B (plateforme de bande), C (épaulement du manchon).',
    lue: '« autour » de chaque connecteur et de chaque côté d’une prise (raccord, désignation construite, statut), la nomenclature', choix: 'automatique : la famille du connecteur, la taille lue dans le part number (sinon la famille sans sa taille, désignation incomplète), le type de la table de décision (reprise de blindage × étanchéité × rôle de la gaine), l’orientation ; la classe N devient celle du connecteur (table Classes), <L> la chambre A par défaut, <E> le code d’entrée (table Entrées EN 3660, borné à la taille : sinon « toron trop gros ») — manuelle : « Changer » (reprise, étanchéité, orientation, gaine)', manque: 'les cotes des -063/-065 par taille (tables non lues), les suffixes des -005, -020/-021, -025/-026, -009, -010, la famille des tyraps -013 à -019, l’ASNE 0059 (tout « déduit »), la longueur de chambre que l’atelier prend, et la lettre N ou F de l’alu nickelé' },
  manchons: { source: 'VG 95343 T06 / T08 / T18 / T19 (HellermannTyton, guide « Heat Shrinkable Moulded Shapes » 2024)', sert: 'Le manchon thermorétractable, par ce qui sort du raccord et par l’épaulement du raccord : 82 formes — droit à lèvre, coudé à nervure et à lèvre, sortie longue, 45°, transitions en T, 2 à 4 sorties.',
    lue: '« autour » (manchon), la nomenclature', choix: 'automatique : droit, ou coudé (à nervure ou à lèvre) selon l’orientation du raccord — les autres formes restent à la main ; Ja > Ø > Jb côté toron, et Ha > C > Hb côté raccord, C = le ØCC du code d’entrée retenu (sinon la cote C de la ligne Raccords) ; le plus petit qui passe ; précollé (T18/T19) ou « à coller » (VG 95343 T15) : l’étanchéité le demande' },
  gaines: { source: 'HellermannTyton (DHS754-160), EN 6049-003 / -004', sert: 'Ce qui habille le toron : un surblindage (tresse cuivre) ou une protection (Nomex) — c’est le rôle qui décide du raccord : une tresse se reprend par une bande sur un raccord blindé, une protection finit sous le manchon ou par un collier.',
    lue: '« autour » (gaine), la table de décision du raccord, la nomenclature', choix: 'automatique, dans la famille choisie sur la fiche (« Changer » : gaine) : un surblindage dont l’intérieur passe le toron (le plus petit), une protection dont la plage encadre le toron' },
  colliers: { source: 'EN 3660-033 (dessin TE P42936), Glenair 600-0xx, Airbus Helicopters (E0805), HellermannTyton, Octopart et Arrow (NSA935401)', sert: 'La bande de reprise de blindage (EN 3660-033AF standard, micro -033CF, les Glenair équivalentes : largeur, épaisseur, longueur, boucle, Ø serré, masse, outil, tension de pose), le band-it d’atelier E0805, et les tyraps NSA935401.',
    lue: '« autour » (band-it, tyrap), la nomenclature', choix: 'automatique : la bande EN 3660-033 (standard avant micro) dont le Ø serré passe la plateforme ØBB du code d’entrée retenu (sinon le toron), l’E0805 en équivalent par le toron ; le tyrap au toron maximal le plus serré qui passe, puis le plus court' },
  classes: { source: 'EN 2997, EN 3646, EN 3645 (règles de désignation, recherche R3) ; EN 3660-001 (classes des raccords, recherche R4)', sert: 'La classe du connecteur, lue dans son part number juste après le nom de la famille (W cadmium, R nickel, K inox, SE inox 260 °C…), et la lettre de classe EN 3660 du raccord qui va avec (le fini du raccord suit celui du connecteur ; jamais A, anodisé non conducteur).',
    lue: '« autour » (la classe dans la désignation construite du raccord), la nomenclature', choix: 'automatique : les lettres qui suivent le nom de la famille dans le part number, suivies du chiffre du style (EN2997 SE 6… → SE ; EN3645 F 0… → F), les classes à deux lettres avant celles à une ; sans classe lisible : N', manque: 'la lettre que l’approvisionnement écrit pour l’alu nickelé (N de la norme 2022, ou F de TE/Polamco)' },
  filetages: { source: 'EN 3645-002, EN 2997-002, EN 3646-002 ; Glenair AS85049/18', sert: 'Le filetage d’accessoire par famille et taille de boîtier — et c’est par elle que la taille se lit dans le part number.',
    lue: '« autour » (boîtier, filetage), le choix du raccord et du code d’entrée', choix: 'automatique : la famille, et la première paire de chiffres du part number qui est une taille de la famille (EN3646-002-12-08 → 12)' },
  entrees: { source: 'EN 3660-064 (dessin TE/Polamco P20027, table 4) ; Glenair 360A*001 (2022)', sert: 'Le code d’entrée de câble d’un raccord, par système : les codes lettrés A à M de l’EN 3660 (ØAA l’alésage = le toron maximal, ØBB la plateforme où la bande serre la tresse, ØCC l’épaulement où vient le manchon : la cote C) et les codes 03 à 32 du serre-câble Glenair série 36.',
    lue: '« autour » (code d’entrée, ses cotes), la désignation construite du raccord (<E>), la bande (ØBB), le manchon (ØCC)', choix: 'automatique : le système que le raccord retenu dit (une désignation EN 3660 qui attend <E> → EN 3660 ; un serre-câble sans plage → Glenair) ; le plus petit code dont la plage passe le toron et que la taille du boîtier admet — au-delà du code maximal de la taille (08 → D, 12 → H, 22 → M), « toron trop gros pour ce boîtier »' }
};
/* Comment faire entrer une norme que l'outil ne connaît pas encore : par les tables existantes, cas par cas. */
const GUIDE_NORMES = [
  ['Une nouvelle norme de barrette (modules de jonction)', 'Familles (une ligne : la famille, les jauges), Tailles (une ligne par taille de contact), Modules (une ligne par variante : la face, les groupes de contacts reliés), et Contacts si la norme a ses propres contacts à sertir.', ['familles', 'tailles', 'modules', 'contacts']],
  ['Une nouvelle famille de prise de coupure ou de connecteur', 'Familles (nature coupure ou connecteur), Tailles, Modules (emploi connecteur : les arrangements, la face), Contacts (le contact à sertir par taille, sexe, type et jauge), Filetages (les tailles de boîtier), Raccords.', ['familles', 'tailles', 'modules', 'contacts', 'filetages', 'raccords']],
  ['Un nouveau câble, une nouvelle famille de câbles', 'Câbles (une ligne par type tel que le retest l’écrit) et Familles de câbles (le conducteur : cuivre, CCA, aluminium).', ['cables', 'cablesFamilles']],
  ['Les règles du programme (chute admise, déclassement, intensités par type)', 'Réseau (une ligne par tension), Déclassement (une ligne par point), Fils (une ligne par type et jauge : une ligne au type exact passe devant l’EN 2853).', ['reseau', 'declassements', 'fils']],
  ['Un disjoncteur', 'Courbes de disjonction (une ligne par point : famille, courbe, multiple, temps) ; Familles de disjoncteurs (le préfixe du part number, la gamme, la courbe à prendre) ; Calibration (les points normalisés).', ['disjoncteurs', 'disjoncteursFamilles', 'calibrations']],
  ['Un raccord, un manchon, une gaine, un collier, une entrée', 'Chacun sa table : la référence, et les diamètres qui décident du choix (toron, cotes).', ['raccords', 'manchons', 'gaines', 'colliers', 'entrees']],
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
/* La page : l'état, la recherche et les gestes, l'import en cours, les résultats de la recherche, les domaines. */
function ficheNormes(opts) { opts = opts || {};
  if (opts.table) { NORMES.ouverts.add(opts.table); if (opts.filtre != null) NORMES.filtres[opts.table] = opts.filtre; }
  if (opts.q != null) NORMES.q = opts.q;
  const deja = app.fiche && app.fiche.mode === 'normes';
  ouvrirFiche({ mode: 'normes', large: true }, normesHtml(), normesPiedHtml());
  // plus large que la bible : les tables ont jusqu'à seize colonnes ; le plan se recadre à côté
  document.documentElement.style.setProperty('--fiche-l', 'min(1040px, calc(100vw - var(--rail) - 16px))'); if (!deja) ajuster(true);
  app.base.normeOuverte = true; lierNormes();
  if (opts.table) { const el = $('fiche-corps').querySelector(`.nm-table[data-vue="${opts.table}"]`); if (el && el.scrollIntoView) { try { el.scrollIntoView({ block: 'start' }); } catch (_) { } } } }
/* La page se refait sur place (la position de lecture reste). */
function rendreNormes() { if (!(app.fiche && app.fiche.mode === 'normes')) return; const c = $('fiche-corps'), y = c.scrollTop, actif = document.activeElement && document.activeElement.id;
  c.innerHTML = normesHtml(); const p = $('fiche-pied'); p.innerHTML = normesPiedHtml(); p.hidden = false; c.scrollTop = y; lierNormes();
  if (actif) { const el = $(actif); if (el && el.focus) el.focus(); } }
function normesHtml() { const N = normeActive(), E = normeEmbarqueeLue(), total = TABLES_NORME.reduce((n, t) => n + (N[t] || []).length, 0), modifiees = TABLES_NORME.filter(tableModifiee);
  const nAjout = TABLES_NORME.reduce((n, t) => n + (N[t] || []).filter(x => x.source != null).length, 0), nMasque = TABLES_NORME.reduce((n, t) => n + masqueesDe(t).length, 0);
  const etat = `<div class="bible-etat nm-etat"><span><b>${TABLES_NORME.length} tables</b> · ${pluriel(total, 'ligne')} · ${E.tables} blocs embarqués (normes/*.csv)`
    + (modifiees.length ? ` · <b class="nm-mod">${pluriel(modifiees.length, 'table')} modifiée${modifiees.length > 1 ? 's' : ''}</b> dans ce navigateur (${pluriel(nAjout, 'ligne')} importée${nAjout > 1 ? 's' : ''} ou modifiée${nAjout > 1 ? 's' : ''}${nMasque ? ', ' + pluriel(nMasque, 'ligne') + ' masquée' + (nMasque > 1 ? 's' : '') : ''}) — ${esc(app.normeNom)}` : ' · rien d’importé ni de modifié : l’embarquée telle quelle')
    + (NORMES.ancienne ? ' · <i>une norme importée par l’ancien mécanisme a été oubliée : réimporte-la, elle se verra ligne par ligne</i>' : '') + '</span></div>';
  const outils = `<div class="nm-outils"><div class="filtre nm-cherche"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="nm-q" value="${escA(NORMES.q)}" placeholder="Chercher dans toutes les tables : une référence, un part number, une jauge…" aria-label="Chercher dans toutes les tables" autocomplete="off" spellcheck="false"><button class="vider" id="nm-q-vider"${NORMES.q ? '' : ' hidden'} aria-label="Effacer la recherche">×</button></div>`
    + `<div class="nm-gestes"><button class="btn papier" id="nm-importer" title="Un Excel (une feuille = une ou plusieurs tables), un CSV">Importer un fichier</button><button class="btn papier" id="nm-coller">Coller des lignes</button><button class="btn papier" id="nm-guide" aria-expanded="${NORMES.guide}">Ajouter une norme, les gabarits</button>`
    + (modifiees.length ? `<button class="btn papier" id="nm-exporter-tout" title="Toutes les lignes importées ou modifiées, en un CSV à me renvoyer">Exporter mes modifications</button>` : '') + `<input type="file" id="fichier-norme" accept=".csv,.tsv,.txt,.xlsx,.xlsm,.xls" hidden></div></div>`;
  return `<div class="nm">${nmTitre('Ce que l’outil vérifie, table par table', 'Normes')}${nmNav('normes')}${etat}${outils}${NORMES.guide ? guideHtml() : ''}${NORMES.import ? importHtmlOuColler() : ''}${NORMES.q ? rechercheHtml() : ''}`
    + DOMAINES_NORMES.map(domaineHtml).join('') + '</div>'; }
function normesPiedHtml() { return `<button class="btn cuivre" id="no-importer">Importer une norme</button>${NORMES.hist.length ? `<button class="btn papier" id="nm-defaire" title="${escA('Défaire : ' + NORMES.hist[NORMES.hist.length - 1].quoi + ' (Ctrl+Z)')}">Défaire</button>` : ''}<span class="espace"></span>`
  + (app.normeNom ? '<button class="btn lien" id="no-embarquee">Revenir à la norme embarquée</button>' : ''); }
/* Un domaine : son titre, à quoi il sert, ses tables. */
function domaineHtml(d) { const corps = d.id === 'contrats' ? contratsHtml() : d.vues.map(tableHtml).join('');
  return `<section class="nm-dom" id="nm-dom-${d.id}"><h3 class="nm-dom-t">${esc(d.titre)}</h3><p class="nm-dom-sens">${esc(d.sens)}</p>${corps}</section>`; }
function contratsHtml() { const R = app.references, I = typeof indexReferences === 'function' ? indexReferences() : null;
  return `<article class="nm-table nm-contrats"><div class="nm-t-tete nm-t-fixe"><div class="nm-t-titre"><b>Contrats déjà faits</b><span class="nm-t-source">${R ? esc(R.nom || 'base') + ' · ' + I.harnais.size + ' harness · ' + pluriel(I.dessins.size, 'dessin') + ' · ' + pluriel(R.liaisons.length, 'liaison') : 'aucune base déposée'}</span></div>`
    + `<div class="nm-t-badges">${R ? badge('import', 'gardée dans ce navigateur') : badge('rien', 'vide')}</div><button class="fi-lien" data-nm-vue="bible">Voir dans la bible</button></div></article>`; }
/* Une table : sa tête (titre, source, compte, badges), et dépliée, sa fiche, ses gestes, la table elle-même. */
function tableHtml(v) { const V = vueDe(v), T = V.table, L = lignesDeVue(v), F = FICHES_TABLES[T] || {}, ouvert = NORMES.ouverts.has(v);
  const n = L.lignes.length, nMod = L.lignes.filter(x => L.etat(x) === 'modifiée').length, nAjo = L.lignes.filter(x => L.etat(x) === 'ajoutée').length, nConf = L.lignes.filter(x => aConfirmer(T, x)).length, nMasq = masqueesDe(T).filter(x => !V.garde || V.garde(x)).length;
  const badges = [nMod || nAjo || nMasq ? '' : badge('emb', 'embarquée'), nMod ? badge('mod', nMod + ' modifiée' + (nMod > 1 ? 's' : '')) : '', nAjo ? badge('ajo', nAjo + ' ajoutée' + (nAjo > 1 ? 's' : '')) : '', nMasq ? badge('masq', nMasq + ' masquée' + (nMasq > 1 ? 's' : '')) : '', nConf ? badge('conf', nConf + ' à confirmer') : '', !n ? badge('rien', 'vide') : ''].filter(Boolean).join('');
  const sources = [...new Set(L.lignes.map(x => x.source).filter(s => s && s !== 'main'))];
  return `<article class="nm-table${ouvert ? ' ouvert' : ''}${nMod || nAjo || nMasq ? ' modifiee' : ''}" data-vue="${escA(v)}" data-table="${escA(T)}">`
    + `<button class="nm-t-tete" aria-expanded="${ouvert}" aria-controls="nm-corps-${escA(v)}"><div class="nm-t-titre"><b>${esc(V.titre)}</b><span class="nm-t-source">${esc(F.source || '')}${sources.length ? ' · importé : ' + esc(sources.join(', ')) : ''}</span></div><span class="nm-t-compte">${pluriel(n, 'ligne')}</span><div class="nm-t-badges">${badges}</div><svg class="ico nm-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>`
    + (ouvert ? `<div class="nm-t-corps" id="nm-corps-${escA(v)}">${ficheTableHtml(v, L)}${barreTableHtml(v, L)}<div class="nm-t-zone">${corpsTableHtml(v, L)}</div></div>` : '') + '</article>'; }
/* La fiche d'une table : à quoi elle sert, qui la lit, comment une ligne se choisit, ce qui manque ; les colonnes. */
function ficheTableHtml(v, L) { const T = L.table, F = FICHES_TABLES[T] || {}, cols = colonnesDeTable(T), O = OBLIGATOIRES_NORME[T] || {};
  const colonnes = NORMES.colonnes.has(v) ? `<dl class="nm-cols">${cols.map(c => `<dt>${esc(c.libelle)}${c.obligatoire ? '<i title="obligatoire">*</i>' : ''}</dt><dd>${esc(c.sens)}${c.alias.length ? `<span class="nm-alias">aussi : ${esc(c.alias.slice(0, 6).join(', '))}</span>` : ''}</dd>`).join('')}</dl><p class="nm-note">* obligatoire. Reconnue à son en-tête par : ${esc(O.entete || '')}. Les colonnes se lisent dans n’importe quel ordre, avec ou sans unité entre parenthèses.</p>` : '';
  return `<dl class="nm-doc"><dt>sert à</dt><dd>${esc(F.sert || '')}</dd><dt>lue par</dt><dd>${esc(F.lue || '')}</dd><dt>choix</dt><dd>${esc(F.choix || '')}</dd>${F.manque ? `<dt>manque</dt><dd class="nm-manque">${esc(F.manque)}</dd>` : ''}<dt>colonnes</dt><dd><button class="fi-lien nm-voir-cols" data-cols="${escA(v)}" aria-expanded="${NORMES.colonnes.has(v)}">${cols.length} colonnes${NORMES.colonnes.has(v) ? ' — replier' : ' — les expliquer'}</button></dd></dl>${colonnes}`; }
/* La barre d'une table : le filtre, ajouter une ligne, exporter, le gabarit, revenir à l'embarquée, les masquées. */
function barreTableHtml(v, L) { const T = L.table, masq = masqueesDe(T), modif = tableModifiee(T);
  return `<div class="nm-t-barre"><div class="filtre nm-filtre"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input data-filtre="${escA(v)}" value="${escA(NORMES.filtres[v] || '')}" placeholder="Filtrer la table" aria-label="Filtrer ${escA(vueDe(v).titre)}" autocomplete="off" spellcheck="false"></div>`
    + `<button class="btn papier nm-ajouter" data-ajouter="${escA(v)}"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>Ligne</button><button class="btn lien" data-exporter="${escA(v)}" title="La table telle que l’outil la lit, en CSV">Exporter CSV</button><button class="btn lien" data-gabarit="${escA(T)}" title="Les en-têtes et une ligne d’exemple">Gabarit</button>`
    + (modif ? `<button class="btn lien" data-embarquee="${escA(T)}">Revenir à l’embarquée</button>` : '') + (masq.length ? `<button class="btn lien" data-masquees="${escA(v)}" aria-expanded="${NORMES.masquees.has(v)}">${pluriel(masq.length, 'ligne')} masquée${masq.length > 1 ? 's' : ''}</button>` : '') + '</div>'; }
/* La table : l'en-tête triable, les lignes (filtrées, triées, les premières seulement au-delà de MAX_LIGNES_NORME),
   chacune avec son état, ses gestes au survol — ou en édition. `lecture` : sans geste (les résultats de recherche). */
function corpsTableHtml(v, L, opts) { opts = opts || {}; const T = L.table, cols = colonnesDeTable(T), filtre = opts.filtre != null ? opts.filtre : (NORMES.filtres[v] || ''), tri = NORMES.tris[v];
  let rows = L.lignes.map(x => ({ x, b: brutDe(T, x), etat: L.etat(x) })); if (filtre) rows = rows.filter(r => contient(Object.values(r.b).join(' '), filtre));
  if (tri && !opts.lecture) { const num = rows.every(r => !r.b[tri.champ] || NUMERO(r.b[tri.champ]) != null);
    rows.sort((a, b) => { const u = a.b[tri.champ] || '', w = b.b[tri.champ] || ''; return tri.sens * (num ? (NUMERO(u) == null ? 1e9 : NUMERO(u)) - (NUMERO(w) == null ? 1e9 : NUMERO(w)) : u.localeCompare(w, 'fr', { numeric: true })); }); }
  const max = opts.max || (NORMES.entier.has(v) ? Infinity : MAX_LIGNES_NORME), vus = rows.slice(0, max), E = NORMES.edition, enEdition = r => E && E.vue === v && E.cle != null && E.cle === cleDeLigne(T, r.x);
  const th = cols.map(c => `<th${opts.lecture ? '' : ` data-tri="${escA(c.champ)}" role="button" tabindex="0" aria-sort="${tri && tri.champ === c.champ ? (tri.sens > 0 ? 'ascending' : 'descending') : 'none'}"`} title="${escA(c.sens)}">${esc(c.libelle)}${tri && tri.champ === c.champ && !opts.lecture ? (tri.sens > 0 ? ' ↑' : ' ↓') : ''}</th>`).join('');
  const ligne = r => enEdition(r) ? ligneEditionHtml(v, T, cols) : `<tr class="nm-l nm-${r.etat === 'modifiée' ? 'mod' : r.etat === 'ajoutée' ? 'ajo' : 'emb'}" data-cle="${escA(cleDeLigne(T, r.x))}"${opts.lecture ? '' : ' tabindex="0" title="Double-clic : modifier"'}>`
    + `<td class="nm-etat">${r.etat !== 'embarquée' ? badge(r.etat === 'modifiée' ? 'mod' : 'ajo', r.etat) : ''}${r.x.source && r.x.source !== 'main' ? `<span class="nm-src" title="${escA('importée de ' + r.x.source)}">${esc(r.x.source)}</span>` : ''}</td>`
    + cols.map(c => `<td class="${/note|source|statut|sens|disposition|groupes/.test(c.champ) ? 'nm-texte' : NUMERO(r.b[c.champ]) != null && !/reference|cable|famille|variante|code|taille|designation|contact|courbe|type|filetage|lettre/.test(c.champ) ? 'd' : ''}" title="${escA(r.b[c.champ] || '')}">${esc(r.b[c.champ] || '')}</td>`).join('')
    + (opts.lecture ? '' : `<td class="nm-gestes-l"><button class="nm-g" data-modifier="${escA(v)}" title="Modifier (ou double-clic)"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16z"/></svg></button><button class="nm-g" data-dupliquer="${escA(v)}" title="Dupliquer"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button><button class="nm-g danger" data-supprimer="${escA(v)}" title="Supprimer"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></td>`) + '</tr>';
  const neuve = E && E.vue === v && E.cle == null && !opts.lecture ? ligneEditionHtml(v, T, cols) : '';
  const masq = !opts.lecture && NORMES.masquees.has(v) ? masqueesDe(T).map(x => { const b = brutDe(T, x); return `<tr class="nm-l nm-masquee" data-masquee="${escA(cleDeLigne(T, x))}"><td class="nm-etat">${badge('masq', 'masquée')}</td>${cols.map(c => `<td>${esc(b[c.champ] || '')}</td>`).join('')}<td class="nm-gestes-l"><button class="fi-lien" data-retablir="${escA(v)}">rétablir</button></td></tr>`; }).join('') : '';
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
  return `<section class="nm-resultats"><div class="sur">« ${esc(q)} » · ${hits.reduce((n, h) => n + h.n, 0)} lignes dans ${pluriel(hits.length, 'table')}</div>`
    + hits.map(h => `<div class="nm-hit"><div class="nm-hit-t"><b>${esc(vueDe(h.v).titre)}</b><span>${pluriel(h.n, 'ligne')}</span><button class="fi-lien" data-voir-table="${escA(h.v)}">Voir dans la table</button></div>${corpsTableHtml(h.v, h.L, { filtre: q, max: 6, lecture: true })}</div>`).join('') + '</section>'; }
/* Le guide : comment faire entrer ce que l'outil ne connaît pas, et les gabarits. */
function guideHtml() { return `<section class="nm-guide"><div class="sur">Ajouter une norme que l’outil ne connaît pas</div><p class="nm-note">Tout entre par les tables existantes : les en-têtes de l’outil (ou leurs alias, dans n’importe quel ordre), une ligne par entrée ; un Excel peut porter plusieurs tables par feuille. Une ligne de même clé qu’une ligne embarquée la remplace ; les autres s’ajoutent. Un gabarit se télécharge, se remplit et se dépose sur la table.</p>`
  + `<dl class="nm-cas">${GUIDE_NORMES.map(([titre, texte, tables]) => `<dt>${esc(titre)}</dt><dd>${esc(texte)}${tables.length ? `<div class="nm-gabarits">${tables.map(t => `<button class="fi-lien" data-gabarit="${escA(t)}">gabarit ${esc(TITRES_NORME[t])}</button>`).join('')}</div>` : ''}</dd>`).join('')}</dl>`
  + `<div class="nm-gabarits nm-tous"><span class="sur">Tous les gabarits</span>${TABLES_NORME.map(t => `<button class="fi-lien" data-gabarit="${escA(t)}">${esc(TITRES_NORME[t])}</button>`).join('')}</div></section>`; }

/* ---- l'import : lire, prévisualiser, adopter ----------------------------------- */
/* Un fichier déposé ou choisi : lu, découpé en blocs, montré dans la page avant d'être adopté. */
async function importerNorme(fichier) { if (!fichier) return;
  try { dire('Lecture de « ' + fichier.name + ' »…'); importerNormeTexte(await texteDeNormeFichier(fichier), fichier.name); }
  catch (e) { dire('Erreur : ' + (e && e.message || e), true); } }
/* Un texte (un CSV, des lignes collées, les feuilles d'un Excel) : les blocs reconnus, prévisualisés. Rend l'import. */
function importerNormeTexte(texte, nom) { const blocs = decouperTables(texte);
  NORMES.import = { nom: nom || 'texte collé', blocs: blocs.map(b => ({ ...b, cible: b.table, manuel: {} })), vide: !blocs.length };
  NORMES.import.blocs.forEach(preparerBloc);
  if (!blocs.length) dire('« ' + (nom || 'le texte') + '» : aucune ligne d’en-tête reconnue — il faut les en-têtes de l’outil (voir les gabarits).', true);
  else dire(pluriel(blocs.length, 'table') + ' reconnue' + (blocs.length > 1 ? 's' : '') + ' dans « ' + (nom || 'le texte') + ' » : vérifie, puis adopte.');
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
  adopterApports(nettoyerApports(A), 'import de ' + I.nom); dire(pluriel(n, 'ligne') + ' adoptée' + (n > 1 ? 's' : '') + ' de « ' + I.nom + ' » : les fiches et le contrôle suivent.'); }
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
/* `ref` : une référence à montrer en grand, au-dessus de la table — celle qu'on a cliquée dans la table, ou depuis la
   carte d'une barrette. */
function ficheBible(ref) { const B = app.bible || [], nom = app.bibleNom, n = B.length, familles = [...new Set(B.filter(e => e.module).map(e => e.famille))]; ref = typeof ref === 'string' ? ref : '';
  const zoom = ref ? B.find(e => e.reference === ref) || null : null;
  const etat = nom ? `<div class="bible-etat"><span><b>${esc(nom)}</b> · ${pluriel(n, 'référence')} · gardée dans ce navigateur</span></div>`
    : (() => { const compte = fs => fs.map(f => pluriel(B.filter(e => e.module && e.famille === f).length, 'module') + ' ' + nomDeFamille(app.norme, f)).join(' et '), bar = famillesDeModules(app.norme), con = famillesDeModules(app.norme, 'connecteur');
        return `<div class="bible-etat exemple"><span><b>Bible de l’outil</b> · pour les barrettes, ${compte(bar.filter(f => familles.includes(f)))}${con.length ? ` ; pour les connecteurs et les prises de coupure, ${compte(con.filter(f => familles.includes(f)))}` : ''} — et ${pluriel(B.filter(e => !e.module).length, 'référence')} d’exemple (coupures, connecteurs).</span></div>`; })();
  // un filtre par norme : les modules d'une norme, ou le reste (coupures, connecteurs)
  const filtre = app.base.bibleFiltre || '', garde = e => !filtre || (filtre === '-' ? !e.module : e.module && e.famille === filtre), vus = B.filter(e => garde(e) || e === zoom);
  const filtres = B.some(e => e.module) ? `<div class="bible-filtres" role="group" aria-label="Filtrer la bible">` + [['', 'tout', n], ...familles.map(f => [f, nomDeFamille(app.norme, f), B.filter(e => e.module && e.famille === f).length]), ['-', 'coupures et connecteurs', B.filter(e => !e.module).length]]
    .map(([f, t, k]) => `<button class="mj-norme ${f && f !== '-' ? classeFamille(f) : ''}" data-filtre="${escA(f)}" aria-pressed="${filtre === f}">${esc(t)} · ${k}</button>`).join('') + '</div>' : '';
  const ligne = e => `<tr class="${e === zoom ? 'on' : ''}"><td class="pict">${pictoBible(e)}</td><td class="ref"><button class="ref-btn" data-ref="${escA(e.reference)}" aria-pressed="${e === zoom}" title="${e === zoom ? 'Replier' : 'Voir la référence en grand'}">${esc(e.reference)}</button></td>
    <td class="sans">${esc(e.nature)}</td><td class="d">${nombre(e.bornes)}</td>
    <td class="d">${jaugeEntree(e)}</td><td class="d">${e.intensite != null ? nombre(e.intensite) + ' A' : '—'}</td><td>${e.blindage ? 'oui' : '—'}</td><td class="bible-note">${esc(e.note)}</td></tr>`;
  const corps = tete('Barrettes et connecteurs', 'Bible des barrettes', true) + nmNav('bible') + etat + (zoom ? zoomBible(zoom) : '') + filtres
    + (n ? `<table class="bible"><thead><tr><th></th><th>Référence</th><th>Nature</th><th>Bornes</th><th>Jauge</th><th title="Intensité">Int.</th><th title="Blindage">Blindé</th><th>Note</th></tr></thead><tbody>${vus.map(ligne).join('')}</tbody></table>` : '<p class="note">Aucune référence.</p>')
    + `<p class="note">Un Excel ou un CSV dont une ligne d’en-têtes nomme ${COLONNES_BIBLE_TEXTE}. La jauge s’écrit en AWG : « min » est la plus fine acceptée. Une bible se dépose aussi directement sur la table.</p>`
    + resumeNormeHtml() + ficheReferences();
  const pied = '<button class="btn cuivre" id="bi-importer">Importer un Excel / CSV</button><button class="btn papier" id="no-importer">Importer une norme</button><button class="btn papier" id="re-importer">Contrats déjà faits</button><input type="file" id="fichier-norme" accept=".csv,.tsv,.txt,.xlsx,.xlsm,.xls" hidden><input type="file" id="fichier-references" accept=".csv,.tsv,.txt,.xlsx,.xlsm,.xls" hidden><span class="espace"></span>'
    + (nom ? '<button class="btn lien" id="bi-exemple">Revenir à la bible d’exemple</button>' : '') + (app.normeNom ? '<button class="btn lien" id="no-embarquee">Revenir à la norme embarquée</button>' : '');
  ouvrirFiche({ mode: 'bible', large: true, ref: zoom ? ref : '' }, corps, pied); lierNormes();
  $('bi-importer').onclick = () => $('fichier-bible').click();
  $('re-importer').onclick = () => $('fichier-references').click();
  $('fichier-references').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) importerReferences(f); e.target.value = ''; });
  if ($('bi-exemple')) $('bi-exemple').onclick = () => { adopterBible(bibleExemple(), ''); dire('Bible d’exemple rétablie.'); };
  if ($('no-embarquee')) $('no-embarquee').onclick = () => { adopterApports(apportsVides(), 'retour à la norme embarquée'); dire('Norme embarquée rétablie.'); };
  if ($('bi-normes')) $('bi-normes').onclick = () => ficheNormes();
  $('fiche-corps').querySelectorAll('.ref-btn').forEach(b => b.onclick = () => ficheBible(b.getAttribute('aria-pressed') === 'true' ? '' : b.dataset.ref));
  if ($('bz-fermer')) $('bz-fermer').onclick = () => ficheBible('');
  $('fiche-corps').querySelectorAll('.bible-filtres .mj-norme').forEach(b => b.onclick = () => { app.base.bibleFiltre = b.dataset.filtre; ficheBible(zoom ? ref : ''); });
}
/* La norme en deux lignes dans la bible : d'où elle vient, ce qui est modifié, et la page qui dit tout. */
function resumeNormeHtml() { const N = normeActive(), modifiees = TABLES_NORME.filter(tableModifiee), total = TABLES_NORME.reduce((n, t) => n + (N[t] || []).length, 0);
  const compte = [pluriel((N.modules || []).length, 'module'), pluriel((N.contacts || []).length, 'contact') + ' à sertir', pluriel((N.cables || []).length, 'câble'), pluriel(N.fils.length, 'fil') + ' (EN 2853)', pluriel(courbesDeDisjonction(N).length, 'courbe') + ' de disjonction', pluriel((N.raccords || []).length, 'raccord')].join(' · ');
  return `<h3 class="sous-titre">La norme</h3><div class="bible-etat${modifiees.length ? '' : ' exemple'}"><span><b>${modifiees.length ? pluriel(modifiees.length, 'table') + ' modifiée' + (modifiees.length > 1 ? 's' : '') + ' dans ce navigateur' : 'Norme embarquée'}</b> · ${TABLES_NORME.length} tables, ${pluriel(total, 'ligne')} · ${compte}${modifiees.length ? ' — ' + esc(app.normeNom) : ''}</span></div>`
    + `<p class="note">La page <b>Normes</b> classe les vingt tables par domaine, dit ce que chacune vérifie et comment une ligne se choisit, et permet d’importer, de modifier et d’exporter chaque table. <button class="fi-lien" id="bi-normes">Voir les normes</button></p>`; }
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
async function importerBible(fichier) { if (!fichier) return;
  try { const r = await lireBibleFichier(fichier);
    if (!r.entrees.length) { dire('« ' + fichier.name + ' » n’a pas l’air d’une bible : il faut une ligne d’en-têtes avec ' + COLONNES_BIBLE_TEXTE.replace(/<\/?b>/g, '') + '.', true); return; }
    adopterBible(r.entrees, fichier.name); dire(pluriel(r.entrees.length, 'référence') + ' lue' + (r.entrees.length > 1 ? 's' : '') + ' : les barrettes suivent.');
  } catch (e) { dire('Erreur : ' + (e && e.message || e), true); } }
