/* ===========================================================================
   09 ter — LES RACCORDS : ce qui englobe un connecteur
   ---------------------------------------------------------------------------
   Le tutoriel du lecteur, en sept pas : le matériau, le diamètre du toron
   (avec une marge de 10 %), le connecteur, le RACCORD, la GAINE, le MANCHON,
   le COLLIER band-it — complété par les recherches d'octobre 2026 (EN 3660 :
   les dessins TE/Polamco, Glenair, HellermannTyton, VG 95343, l'AC 43.13-1B :
   normes/raccords.csv). Ce que l'outil fait de chaque connecteur :
     · le TORON : les câbles du connecteur (la base des câbles), la section
       cumulée, le diamètre équivalent, plus 10 % ;
     · la TAILLE du boîtier, lue dans le part number quand la table des
       filetages connaît la famille (EN 3645 : 09 à 25 ; EN 2997 et EN 3646 :
       08 à 28), le FILETAGE d'accessoire qui va avec, et la CLASSE du
       connecteur (table Classes : les lettres juste après le nom de la
       famille — W cadmium, R nickel, K inox…) qui donne la classe EN 3660 du
       raccord (W ↔ W, nickel ↔ N, inox ↔ K, jamais A ; N sans classe lue) ;
     · le CHOIX, par la table du tutoriel corrigée : reprise de blindage (GND
       sur le corps, BLI par cosse, NO, CONTACT) × étanchéité × le RÔLE de la
       gaine — une tresse de SURBLINDAGE demande un raccord blindé (durci,
       style K) et un band-it, obligatoires ; une gaine de PROTECTION (Nomex)
       ne demande rien de plus : elle finit sous le manchon ou par un collier.
       GND → durci + band-it (+ manchon si étanche) ; surblindage → pareil ;
       étanche sans surblindage → droit : pour manchon (style J) + manchon,
       coudé : durci + manchon ; ni l'un ni l'autre → tyrap (style A), ou
       serre-câble pour une reprise par cosse (les cosses sous ses deux vis).
       L'étanchéité demande un manchon précollé (T18/T19), ou un T06 collé.
       Deux familles SANS RACCORD (rien ne se calcule, SANS_RACCORD) : l'EN
       4165 — le lecteur : « il n'y en a pas » — et l'EN 3645 — la règle
       d'atelier du tutoriel, à confirmer (les EN 3660-063/-062/-020 existent
       et sont dans la table, prêts) ;
     · la RÉFÉRENCE du raccord, CONSTRUITE depuis le modèle de la ligne
       Raccords (`EN3660-064N08<L><E>`) : la classe du connecteur à la place du
       N, <L> le code de longueur de chambre (A par défaut : à demander au
       lecteur), <E> le CODE D'ENTRÉE que le toron choisit dans la table
       Entrées EN 3660 (A à M, borné au code maximal de la taille : sinon
       « toron trop gros pour ce boîtier ») ; un serre-câble EN 3660-004 n'a
       pas de code, sa plage M min–max juge le toron ; le code Glenair ne sert
       qu'à un serre-câble dont la ligne n'a pas de plage ;
     · la BANDE par le Ø serré : l'EN 3660-033AF sur la plateforme ØBB du code
       d'entrée retenu (sinon le toron), l'E0805 d'Airbus Helicopters en
       équivalent par le toron ; le TYRAP NSA935401 par le toron maximal et la
       longueur ; la GAINE par son rôle — un surblindage dont l'intérieur
       passe le toron, une protection dont la plage encadre le toron — ; le
       MANCHON (table Manchons, VG 95343) par ce qui sort du raccord :
       Ja > D > Jb, et Ha > C > Hb avec la cote C = ØCC du code d'entrée
       retenu (sinon la cote C de la ligne Raccords) ; droit ou coudé selon
       l'orientation — les autres formes (45°, T, Y…) restent dans la table.
   Rien ici ne touche à la page : le moteur, comme 09.
   =========================================================================== */
'use strict';

const BLINDAGES = { NO: 'aucune reprise de blindage', GND: 'reprise sur le corps du connecteur', BLI: 'reprise par cosse', CONTACT: 'reprise sur un contact' };
const MATERIAUX = ['nickelage alu', 'cadmiage vert olive', 'passivation acier inox', 'anodisation alu noir'];
const CHOIX_RACCORD = { blindage: 'NO', etanche: false, orientation: 'droit', gaine: '', surblindage: false, materiau: '' };
/* Les familles SANS RACCORD, et pourquoi : rien ne se calcule pour elles — ni raccord, ni band-it, ni manchon, ni gaine,
   ni tyrap. L'EN 4165 : la règle du lecteur (« sauf pour les EN 4165, il n'y en a pas » — les cheminées EN 4165-015/-016
   restent dans la table Raccords, pour mémoire). L'EN 3645 : la règle d'atelier lue dans le tutoriel, que le lecteur
   n'a pas redite — à confirmer (la norme lui nomme les EN 3660-063 droit, -062 coudé, -020/-021 serre-câble : les
   lignes sont dans la table, le jour où le lecteur retire l'EN 3645 d'ici, tout se calcule). */
const SANS_RACCORD = { EN4165: 'sans raccord : un EN 4165 n’en a pas', EN3645: 'sans raccord : un EN 3645 s’utilise sans raccord (la règle d’atelier du tutoriel, à confirmer — l’EN 3660-063 droit et le -062 coudé existent pour lui)' };
const sansRaccord = famille => Object.prototype.hasOwnProperty.call(SANS_RACCORD, famille || '');
/* La classe EN 3660 d'un raccord sans classe lue dans le connecteur, et le code de longueur de chambre par défaut (A =
   27,5 mm ; B 35,5, C 40,5, D 50,5 : à demander au lecteur — les références vendues sont souvent en B). */
const CLASSE_DEFAUT = 'N', LONGUEUR_CHAMBRE = 'A', LONGUEURS_CHAMBRE = { A: 27.5, B: 35.5, C: 40.5, D: 50.5 };
/* Une tresse de surblindage se reconnaît à son nom quand la table des gaines ne dit pas son rôle. */
const NOM_DE_TRESSE = /hfa|dhs|tresse|blind|cem|braid|shield/i;
/* La table du tutoriel, corrigée : reprise de blindage × étanchéité × le RÔLE de la gaine (`surblindage` : une tresse,
   reprise sur le raccord ; sinon une protection, qui finit sous le manchon ou par un collier), et l'orientation pour le
   cas étanche sans tresse. Rend le type de raccord, s'il faut un band-it, un manchon, la règle appliquée et le pourquoi. */
function regleRaccord(c) { const b = BLINDAGES[c.blindage] ? c.blindage : 'NO', e = !!c.etanche, coude = c.orientation === 'coudé', g = !!c.gaine;
  const tresse = g && (c.surblindage != null ? !!c.surblindage : NOM_DE_TRESSE.test(String(c.gaine)));
  const gaineMot = g && !tresse ? ' — la gaine ' + c.gaine + ' est une protection : elle finit ' + (e ? 'sous le manchon' : 'par un collier sur le raccord') + ', sans band-it' : '';
  const manchonMot = e ? ', et l’étanchéité demande un manchon précollé' : '', cosseMot = b === 'BLI' ? ' — la reprise par cosse ne touche pas au raccord' : '';
  if (b === 'GND') return { raccord: 'durci', bandit: true, manchon: e, regle: 'corps', pourquoi: 'la tresse est reprise sur le corps : un raccord blindé et un band-it la tiennent' + manchonMot + gaineMot };
  if (tresse) return { raccord: 'durci', bandit: true, manchon: e, regle: 'surblindage', pourquoi: 'une tresse de surblindage (' + c.gaine + ') : un raccord blindé et un band-it, obligatoires' + manchonMot + cosseMot };
  if (e) { if (coude) return { raccord: 'durci', bandit: false, manchon: true, regle: 'étanche coudé', pourquoi: 'zone étanche, coudé : un durci et un manchon précollé' + gaineMot + cosseMot };
    return { raccord: 'pour manchon', bandit: false, manchon: true, regle: 'étanche droit', pourquoi: 'zone étanche, droit : un raccord pour manchon et son manchon précollé' + gaineMot + cosseMot }; }
  if (b === 'BLI') return { raccord: 'serre-câble', bandit: false, manchon: false, regle: 'cosse', pourquoi: 'reprise par cosse, pas d’étanchéité : un serre-câble, les cosses sous ses deux vis (au plus 4, 2 par vis)' + gaineMot };
  return { raccord: 'tyrap', bandit: false, manchon: false, regle: 'rien', pourquoi: (b === 'CONTACT' ? 'reprise sur un contact : rien pour le raccord — ' : '') + 'ni reprise sur le corps, ni surblindage, ni étanchéité : un tyrap' + gaineMot }; }

/* ---- les tables ------------------------------------------------------------- */
const tableNorme = (norme, t) => (normeDesModules(norme)[t] || []);
const mmTexte = x => String(Math.round(x * 10) / 10).replace('.', ',');
/* Le RÔLE d'une famille de gaine : ce que la table dit (surblindage / protection), sinon son nom. */
function roleDeGaine(norme, famille) { const g = tableNorme(norme, 'gaines').find(x => x.famille === cleNorme(famille)); return g ? g.role : NOM_DE_TRESSE.test(String(famille || '')) ? 'surblindage' : 'protection'; }
/* Le collier qui serre : la BANDE de la norme (EN 3660-033, la standard avant la micro) dont le Ø serré passe `d` (la
   plateforme ØBB du raccord, sinon le toron), avec en `equivalent` le band-it d'atelier (E0805) choisi par le toron ;
   sans bande dans la table, le band-it d'atelier lui-même. */
function collierPour(norme, d, dToron) { if (d == null) return null; const B = tableNorme(norme, 'colliers').filter(c => c.type !== 'tyrap'), va = (c, x) => (c.dmin == null || x > c.dmin) && (c.dmax == null || x <= c.dmax);
  const bande = B.find(c => c.norme && !c.micro && va(c, d)) || B.find(c => c.norme && va(c, d)) || null, atelier = B.find(c => !c.norme && va(c, dToron != null ? dToron : d)) || null;
  return bande ? { ...bande, equivalent: atelier } : atelier; }
/* Le tyrap pour un toron : le toron maximal le plus serré qui passe, puis le plus court ; sans dimensions, le premier de la table. */
function tyrapPour(norme, d) { const T = tableNorme(norme, 'colliers').filter(c => c.type === 'tyrap'); if (!T.length) return null;
  const connus = T.filter(c => c.dmax != null && (d == null || d <= c.dmax)).sort((a, b) => a.dmax - b.dmax || (a.longueur || 0) - (b.longueur || 0)); return connus[0] || T.find(c => c.dmax == null) || null; }
/* La gaine d'une famille pour un toron : un surblindage dont l'intérieur passe le toron (le plus petit) ; une
   protection dont la plage encadre le toron, celle où il est le plus près du milieu de la plage. */
function gainePour(norme, famille, d) { const G = tableNorme(norme, 'gaines').filter(g => !famille || g.famille === cleNorme(famille)); if (d == null || !G.length) return null;
  const blind = G.filter(g => g.role === 'surblindage' && g.dint != null && g.dint > d).sort((a, b) => a.dint - b.dint);
  const prot = G.filter(g => g.role !== 'surblindage' && g.dmin != null && g.dmax != null && d >= g.dmin && d <= g.dmax).sort((a, b) => Math.abs(d - (a.dmin + a.dmax) / 2) / (a.dmax - a.dmin) - Math.abs(d - (b.dmin + b.dmax) / 2) / (b.dmax - b.dmin));
  return blind[0] || prot[0] || null; }
/* La taille du boîtier, lue dans le part number : après le nom de la famille, la première paire de chiffres qui est une
   taille de la famille dans la table des filetages — la taille précède toujours l'arrangement (EN3646-002-12-08 → 12 ;
   EN3645-002-13N26 → 13 ; EN3646A6088AAN → 08, la classe 6 devant). */
function tailleDuPn(norme, famille, pn) { const F = tableNorme(norme, 'filetages').filter(f => f.famille === famille); if (!F.length || !pn) return '';
  const tailles = new Set(F.map(f => f.taille)), reste = String(pn).toUpperCase().replace(/^[A-Z]+\d+/, ''), fenetres = [];
  for (let i = 0; i + 1 < reste.length; i++) if (/^\d\d$/.test(reste.slice(i, i + 2))) fenetres.push(reste.slice(i, i + 2));
  return fenetres.map(TAILLE_BOITIER).find(t => tailles.has(t)) || ''; }
const filetageDe = (norme, famille, taille) => tableNorme(norme, 'filetages').find(f => f.famille === famille && f.taille === taille) || null;
/* La CLASSE du connecteur, lue dans son part number : les lettres juste après le nom de la famille, suivies du chiffre
   du style (EN2997 SE 6 28 42 F N → SE ; EN3645 F 0 C N 26 M N → F ; EN3646 A 6 08 3A A N → A), cherchées dans la table
   Classes de la famille (les classes à deux lettres avant celles à une). La forme provisoire (EN2997-002-12-08) n'en
   porte pas. Rend la ligne de la table, ou null. */
function classeDuPn(norme, famille, pn) { const r = cleNorme(pn); if (!famille || !r || !r.startsWith(famille)) return null; const reste = r.slice(famille.length);
  const C = tableNorme(norme, 'classes').filter(k => k.famille === famille).sort((a, b) => b.classe.length - a.classe.length);
  return C.find(k => reste.startsWith(k.classe) && /^\d/.test(reste.slice(k.classe.length))) || null; }
/* La classe EN 3660 du raccord qui va au connecteur : celle de sa classe lue, sinon N (le nickel, par défaut). */
function classeDeRaccord(norme, famille, pn, reference) { const k = classeDuPn(norme, famille, pn) || classeDuPn(norme, famille, reference);
  return k ? { lettre: k.classe, raccord: k.raccord || CLASSE_DEFAUT, materiau: k.materiau, fini: k.fini, temperature: k.temperature, source: 'part number' } : { lettre: '', raccord: CLASSE_DEFAUT, materiau: 'alu', fini: 'nickel', temperature: null, source: 'par défaut' }; }
/* Le code d'entrée de câble d'un raccord, dans un SYSTÈME (« EN 3660 » : A à M ; « Glenair » : 03 à 32 ; vide : tous) :
   le plus petit dont la plage passe le toron et que la taille du boîtier admet. */
function entreePour(norme, d, taille, systeme) { if (d == null) return null; const t = taille ? parseInt(taille, 10) : null;
  return tableNorme(norme, 'entrees').filter(e => (!systeme || e.systeme === systeme) && d >= e.dmin && d <= e.dmax && (t == null || !e.tailleMin || (t >= parseInt(e.tailleMin, 10) && t <= parseInt(e.tailleMax || '99', 10)))).sort((a, b) => a.dmax - b.dmax)[0] || null; }
/* Le plus gros code d'entrée qu'une taille de boîtier admet (08 → D, 12 → H… pour l'EN 3660-064). */
function entreeMaximale(norme, taille, systeme) { const t = taille ? parseInt(taille, 10) : null; if (t == null || isNaN(t)) return null;
  return tableNorme(norme, 'entrees').filter(e => (!systeme || e.systeme === systeme) && (!e.tailleMin || (t >= parseInt(e.tailleMin, 10) && t <= parseInt(e.tailleMax || '99', 10)))).sort((a, b) => b.dmax - a.dmax)[0] || null; }
/* La ligne de la table Raccords : la taille exacte d'abord ; sinon, quand la famille a des lignes par taille pour ce
   type et cette orientation, la mieux établie d'entre elles SANS sa taille (la désignation restera incomplète :
   `tailleInconnue`) ; sinon la ligne valable pour toutes les tailles. */
const CONFIANCES = { 'vérifié': 0, structure: 1, 'déduit': 2, 'à confirmer': 3 };
function raccordDeTable(norme, famille, taille, type, orientation) { const R = tableNorme(norme, 'raccords').filter(r => r.famille === famille && r.type === type && r.orientation === orientation); if (!R.length) return null;
  const exact = taille ? R.find(r => r.taille === taille) : null; if (exact) return exact;
  const parTaille = R.filter(r => r.taille).sort((a, b) => (CONFIANCES[a.confiance] || 9) - (CONFIANCES[b.confiance] || 9));
  if (parTaille.length) { const m = parTaille[0]; return { ...m, taille: '', amin: null, amax: null, b: null, c: null, masse: null, reference: m.reference.replace(/^(EN ?3660-\d{3}[A-Z]{1,2})\d{2}/i, '$1<T>'), tailleInconnue: true }; }
  return R.find(r => !r.taille) || null; }
/* La DÉSIGNATION construite depuis le modèle d'une ligne Raccords (`EN3660-064N08<L><E>`) : la classe du connecteur à la
   place de la lettre qui suit la partie, <L> le code de longueur de chambre, <E> le code d'entrée. Vide tant qu'il
   manque quelque chose (le code d'entrée, la taille). */
function designationRaccord(modele, classe, longueur, entree) { if (!modele) return '';
  let s = String(modele).trim().replace(/^(EN ?3660-\d{3})[A-Z]{1,2}(?=\d{2}|<T>)/i, (m, p) => p + (classe || CLASSE_DEFAUT)).replace(/<L>/g, longueur || LONGUEUR_CHAMBRE);
  if (/<E>/.test(s)) { if (!entree) return ''; s = s.replace(/<E>/g, entree); }
  return /[<>]/.test(s) ? '' : s; }
/* Le manchon : Ja > D > Jb côté toron (D : ce qui sort du raccord, gaine ou toron) et, si la cote C du raccord est
   connue, Ha > C > Hb côté raccord ; droit, ou coudé (à nervure ou à lèvre) selon l'orientation — les autres formes
   (sortie longue, 45°, transitions, 2 à 4 sorties) restent dans la table, à la main ; le plus petit qui passe. */
function manchonPour(norme, d, c, orientation) { if (d == null) return null; const formes = orientation === 'coudé' ? ['coudé', 'coudé à lèvre'] : ['droit'];
  const M = tableNorme(norme, 'manchons').filter(m => formes.includes(m.forme) && m.ja > d && (m.jb == null || m.jb < d) && (c == null || (m.ha > c && (m.hb == null || m.hb < c))));
  return M.sort((a, b) => a.ja - b.ja || (a.p || 0) - (b.p || 0))[0] || null; }

/* L'HABILLAGE d'un connecteur : le toron, la taille, le filetage et la classe, le choix du tutoriel, la ligne Raccords
   et la désignation construite, le code d'entrée, la bande, la gaine, le manchon — et ce qui manque. `pn` : le part
   number du connecteur ; `reference` : l'arrangement retenu (EN3646-002-12-08), qui porte la taille à défaut. */
function habillage(norme, fils, choix, pn, reference) { const c = { ...CHOIX_RACCORD, ...(choix || {}) }, f = faisceauDe(norme, fils), famille = familleDeReference(norme, pn, 'connecteur') || familleDeReference(norme, reference, 'connecteur');
  // la taille : dans le part number du fichier, sinon dans la référence retenue (l'arrangement choisi, EN3646-002-12-08) ; la classe, dans le part number
  const taille = tailleDuPn(norme, famille, pn) || tailleDuPn(norme, famille, reference), filetage = taille ? filetageDe(norme, famille, taille) : null, classe = classeDeRaccord(norme, famille, pn, reference);
  const vide = { choix: c, toron: f.diametre, deq: f.deq, faisceau: f, famille, taille, filetage, classe, reference: null, designation: '', longueur: '', entree: null, cote: null, bandit: false, manchon: false, manchonRef: null, colle: '', collier: null, tyrap: null, gaine: null, roleGaine: '', sortie: null, statut: '' };
  // une famille sans raccord : le toron et le boîtier se disent, rien d'autre ne se calcule
  if (sansRaccord(famille)) return { ...vide, raccord: 'aucun', sansRaccord: famille, regle: 'sans raccord', pourquoi: SANS_RACCORD[famille], aConfirmer: famille === 'EN3645', manquants: [] };
  const roleGaine = c.gaine ? roleDeGaine(norme, c.gaine) : '', r = regleRaccord({ ...c, surblindage: c.gaine ? roleGaine === 'surblindage' : false }), raccord = r.raccord;
  const ref = raccordDeTable(norme, famille, taille, raccord, c.orientation), modele = ref ? ref.reference : '', attendE = /<E>/.test(modele), attendL = /<L>/.test(modele);
  // le code d'entrée : lettré EN 3660 quand la désignation l'attend ; Glenair pour un serre-câble dont la ligne n'a pas de plage ; rien sinon
  const entree = f.diametre == null ? null : attendE ? entreePour(norme, f.diametre, taille, 'EN 3660') : raccord === 'serre-câble' && !(ref && ref.amax != null) ? entreePour(norme, f.diametre, taille, 'Glenair') : null;
  const designation = designationRaccord(modele, classe.raccord, LONGUEUR_CHAMBRE, entree && attendE ? entree.code : '');
  // la bande serre la tresse sur la plateforme ØBB du code retenu (sinon le toron) ; l'E0805 d'atelier se choisit par le toron
  const collier = r.bandit ? collierPour(norme, entree && entree.bb != null ? entree.bb : f.diametre, f.diametre) : null, tyrap = raccord === 'tyrap' ? tyrapPour(norme, f.diametre) : null, gaine = c.gaine ? gainePour(norme, c.gaine, f.diametre) : null;
  // ce qui sort du raccord : la gaine (son extérieur), sinon le toron ; la cote C : le ØCC du code retenu, sinon celle de la ligne
  const sortie = gaine ? (gaine.dext != null ? gaine.dext : gaine.dmax != null ? Math.min(gaine.dmax, (f.diametre || 0) * 1.3) : f.diametre) : f.diametre;
  const cote = entree && entree.cc != null ? entree.cc : ref && ref.c != null ? ref.c : null, manchon = r.manchon ? manchonPour(norme, sortie, cote, c.orientation) : null;
  const colle = manchon ? (manchon.precolle ? 'précollé' : 'à coller : VG 95343 T15 (V9500), ou sa version T18 précollée') : '';
  const manquants = [], mm = mmTexte;
  if (raccord !== 'tyrap') {
    if (!ref) manquants.push('la référence du raccord (table à compléter' + (famille ? ' pour ' + nomDeFamille(norme, famille) : '') + ')');
    else if (!modele) manquants.push('la désignation complète du raccord (' + ref.norme + ', ' + ref.confiance + ')');
    else if (ref.tailleInconnue) manquants.push('la taille du boîtier ne se lit pas dans le part number' + (pn ? ' ' + pn : '') + ' : la désignation ' + ref.norme + ' reste incomplète');
    else if (attendE && !entree) { const max = entreeMaximale(norme, taille, 'EN 3660');
      manquants.push(f.diametre == null ? 'le code d’entrée du raccord : toron inconnu' : 'toron Ø ' + mm(f.diametre) + ' mm trop gros pour ce boîtier' + (taille ? ' ' + taille : '') + (max ? ' (code ' + max.code + ' au plus : ' + mm(max.dmax) + ' mm)' : '')); }
    else if (f.diametre != null && ref.amax != null && f.diametre > ref.amax) manquants.push('toron Ø ' + mm(f.diametre) + ' mm trop gros pour ce raccord (' + mm(ref.amax) + ' mm au plus)');
    else if (f.diametre != null && ref.amin != null && raccord === 'serre-câble' && f.diametre < ref.amin) manquants.push('toron Ø ' + mm(f.diametre) + ' mm sous l’ouverture du serre-câble (' + mm(ref.amin) + '–' + mm(ref.amax) + ' mm) : bourrage de ruban silicone'); }
  if (r.manchon && !manchon) manquants.push('aucun manchon ' + (c.orientation === 'coudé' ? 'coudé' : 'droit') + ' de la table ne va à Ø ' + (sortie != null ? mm(sortie) + ' mm' : '?') + (cote != null ? ' sur un épaulement Ø ' + mm(cote) + ' mm' : ''));
  if (r.manchon && manchon && cote == null) manquants.push('la cote C du raccord : le manchon est choisi par le toron seulement');
  if (c.gaine && !gaine) manquants.push('aucune gaine ' + c.gaine + ' ne va à ce toron');
  if (r.bandit && !collier) manquants.push('aucun collier ne va à ce toron');
  return { ...vide, raccord, sansRaccord: '', reference: ref, designation, longueur: attendL ? LONGUEUR_CHAMBRE : '', entree, cote, bandit: r.bandit, manchon: r.manchon, manchonRef: manchon, colle, collier, tyrap, gaine, roleGaine, sortie,
           statut: ref ? ref.confiance : '', regle: r.regle, pourquoi: r.pourquoi, aConfirmer: false, manquants }; }
