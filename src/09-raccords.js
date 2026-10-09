/* ===========================================================================
   09 ter — LES RACCORDS : ce qui englobe un connecteur
   ---------------------------------------------------------------------------
   Le tutoriel du lecteur, en sept pas : le matériau, le diamètre du toron
   (avec une marge de 10 %), le connecteur, le RACCORD, la GAINE, le MANCHON,
   le COLLIER band-it — complété par la recherche d'octobre 2026 (EN 3660,
   Glenair, HellermannTyton, VG 95343 : normes/raccords.csv). Ce que l'outil
   fait de chaque connecteur :
     · le TORON : les câbles du connecteur (la base des câbles), la section
       cumulée, le diamètre équivalent, plus 10 % ;
     · la TAILLE du boîtier, lue dans le part number quand la table des
       filetages connaît la famille (EN 3645 : 09 à 25 ; EN 2997 et EN 3646 :
       08 à 28), et le FILETAGE d'accessoire qui va avec ;
     · le CHOIX, par la table du tutoriel : reprise de blindage (GND sur le
       corps, BLI par cosse, NO, CONTACT) × étanchéité × gaine — un raccord
       durci par défaut (style K), un tyrap sans reprise ni étanchéité
       (style A), un serre-câble pour une cosse à l'étroit, « pour manchon »
       (style J) droit en zone étanche sans reprise ; un band-it tient la
       tresse reprise sur le corps ; un manchon quand il faut l'étanchéité.
       « L'EN 3645 s'utilise sans raccord » est la règle d'atelier du
       lecteur (l'EN 3660-020 existe) : elle reste, en le disant ;
     · la RÉFÉRENCE du raccord (table Raccords : la norme EN 3660 du style,
       la désignation complète quand le lecteur l'aura donnée), le CODE
       D'ENTRÉE par le toron (table Entrées), le collier par le diamètre
       (table Colliers : band-it, et le tyrap NSA935401 par le toron), la
       gaine par son rôle — un surblindage (tresse cuivre DHS754-160) dont
       l'intérieur passe le toron, une protection (Nomex EN 6049) dont la
       plage encadre le toron —, le manchon (table Manchons, VG 95343) par ce
       qui sort du raccord : Ja > D > Jb, et Ha > C > Hb quand la cote C du
       raccord est connue.
   Rien ici ne touche à la page : le moteur, comme 09.
   =========================================================================== */
'use strict';

const BLINDAGES = { NO: 'aucune reprise de blindage', GND: 'reprise sur le corps du connecteur', BLI: 'reprise par cosse', CONTACT: 'reprise sur un contact' };
const MATERIAUX = ['nickelage alu', 'cadmiage vert olive', 'passivation acier inox', 'anodisation alu noir'];
const CHOIX_RACCORD = { blindage: 'NO', etanche: false, orientation: 'droit', gaine: '', surblindage: false, materiau: '' };
const SANS_RACCORD = ['EN3645'];   // la règle d'atelier du lecteur : l'EN 3645 s'utilise sans raccord
/* La table du tutoriel : reprise de blindage × étanchéité × gaine (et l'orientation, pour le cas sans reprise en zone
   étanche). Rend le type de raccord, s'il faut un band-it, un manchon, et le pourquoi en une phrase. */
function regleRaccord(c) { const b = BLINDAGES[c.blindage] ? c.blindage : 'NO', e = !!c.etanche, g = !!c.gaine, coude = c.orientation === 'coudé';
  if (b === 'GND') return { raccord: 'durci', bandit: true, manchon: e, pourquoi: 'la tresse est reprise sur le corps : un band-it la tient' + (e ? ', et l’étanchéité demande un manchon' : '') };
  if (b === 'BLI') { if (e) return { raccord: 'durci', bandit: g, manchon: true, pourquoi: 'reprise par cosse en zone étanche : un manchon' + (g ? ', et un band-it sur la gaine' : '') };
    if (g) return { raccord: 'durci', bandit: true, manchon: false, pourquoi: 'reprise par cosse, une gaine : un band-it la tient' };
    return { raccord: 'serre-câble', bandit: false, manchon: false, pourquoi: 'reprise par cosse, ni gaine ni étanchéité : un serre-câble (au plus 4 cosses, 2 par vis) — seulement si la place interdit un raccord durci' }; }
  if (e) { if (g) return { raccord: 'durci', bandit: true, manchon: true, pourquoi: 'zone étanche avec gaine : un durci, un band-it, un manchon' };
    return coude ? { raccord: 'durci', bandit: false, manchon: true, pourquoi: 'zone étanche sans gaine, coudé : un durci et un manchon' } : { raccord: 'pour manchon', bandit: false, manchon: true, pourquoi: 'zone étanche sans gaine, droit : un raccord pour manchon et son manchon' }; }
  if (g) return { raccord: 'durci', bandit: true, manchon: false, pourquoi: 'une gaine, pas d’étanchéité : un durci et un band-it' };
  return { raccord: 'tyrap', bandit: false, manchon: false, pourquoi: 'ni reprise de blindage, ni gaine, ni étanchéité : un tyrap' }; }

/* ---- les tables ------------------------------------------------------------- */
const tableNorme = (norme, t) => (normeDesModules(norme)[t] || []);
/* Le band-it qui va au diamètre serré. */
function collierPour(norme, d) { if (d == null) return null;
  return tableNorme(norme, 'colliers').filter(c => c.type !== 'tyrap').find(c => (c.dmin == null || d > c.dmin) && (c.dmax == null || d <= c.dmax)) || null; }
/* Le tyrap pour un toron : le plus court dont le toron maximal passe ; sans dimensions, le premier de la table. */
function tyrapPour(norme, d) { const T = tableNorme(norme, 'colliers').filter(c => c.type === 'tyrap'); if (!T.length) return null;
  const connus = T.filter(c => c.dmax != null && (d == null || d <= c.dmax)).sort((a, b) => a.dmax - b.dmax); return connus[0] || T.find(c => c.dmax == null) || null; }
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
/* Le code d'entrée de câble d'un raccord à serre-câble : le plus petit dont la plage passe le toron et que la taille
   du boîtier admet. */
function entreePour(norme, d, taille) { if (d == null) return null; const t = taille ? parseInt(taille, 10) : null;
  return tableNorme(norme, 'entrees').filter(e => d >= e.dmin && d <= e.dmax && (t == null || !e.tailleMin || (t >= parseInt(e.tailleMin, 10) && t <= parseInt(e.tailleMax || '99', 10)))).sort((a, b) => a.dmax - b.dmax)[0] || null; }
/* La ligne de la table Raccords : la taille exacte d'abord, sinon la ligne valable pour toutes les tailles. */
function raccordDeTable(norme, famille, taille, type, orientation) { const R = tableNorme(norme, 'raccords').filter(r => r.famille === famille && r.type === type && r.orientation === orientation);
  return R.find(r => taille && r.taille === taille) || R.find(r => !r.taille) || null; }
/* Le manchon : Ja > D > Jb côté toron (D : ce qui sort du raccord, gaine ou toron) et, si la cote C du raccord est
   connue, Ha > C > Hb côté raccord ; la forme suit l'orientation ; le plus petit qui passe. */
function manchonPour(norme, d, c, orientation) { if (d == null) return null; const forme = orientation === 'coudé' ? 'coudé' : 'droit';
  const M = tableNorme(norme, 'manchons').filter(m => m.forme === forme && m.ja > d && (m.jb == null || m.jb < d) && (c == null || (m.ha > c && (m.hb == null || m.hb < c))));
  return M.sort((a, b) => a.ja - b.ja || (a.p || 0) - (b.p || 0))[0] || null; }

/* L'HABILLAGE d'un connecteur : le toron, la taille et le filetage, le choix du tutoriel, la référence du raccord, le
   code d'entrée, le collier, la gaine, le manchon — et ce qui manque. `pn` : le part number du connecteur. */
function habillage(norme, fils, choix, pn, reference) { const c = { ...CHOIX_RACCORD, ...(choix || {}) }, f = faisceauDe(norme, fils), famille = familleDeReference(norme, pn, 'connecteur') || familleDeReference(norme, reference, 'connecteur');
  // la taille : dans le part number du fichier, sinon dans la référence retenue (l'arrangement choisi, EN3646-002-12-08)
  const r = regleRaccord(c), sans = SANS_RACCORD.includes(famille), taille = tailleDuPn(norme, famille, pn) || tailleDuPn(norme, famille, reference), filetage = taille ? filetageDe(norme, famille, taille) : null;
  const raccord = sans ? 'aucun' : r.raccord, ref = sans ? null : raccordDeTable(norme, famille, taille, raccord, c.orientation);
  const entree = !sans && raccord === 'serre-câble' ? entreePour(norme, f.diametre, taille) : null;
  const collier = r.bandit ? collierPour(norme, f.diametre) : null, tyrap = raccord === 'tyrap' ? tyrapPour(norme, f.diametre) : null, gaine = c.gaine ? gainePour(norme, c.gaine, f.diametre) : null;
  // ce qui sort du raccord : la gaine (son extérieur), sinon le toron ; la cote C du raccord si la table la donne
  const sortie = gaine ? (gaine.dext != null ? gaine.dext : gaine.dmax != null ? Math.min(gaine.dmax, (f.diametre || 0) * 1.3) : f.diametre) : f.diametre;
  const manchon = r.manchon ? manchonPour(norme, sortie, ref && ref.c != null ? ref.c : null, c.orientation) : null;
  const manquants = [];
  if (!sans && raccord !== 'tyrap' && !(ref && ref.reference)) manquants.push(ref ? 'la désignation complète du raccord (' + ref.norme + ', ' + (ref.statut || 'à confirmer') + ')' : 'la référence du raccord (table à compléter' + (famille ? ' pour ' + nomDeFamille(norme, famille) : '') + ')');
  if (r.manchon && !manchon) manquants.push('aucun manchon de la table ne va à Ø ' + (sortie != null ? String(Math.round(sortie * 10) / 10).replace('.', ',') + ' mm' : '?'));
  if (r.manchon && manchon && !(ref && ref.c != null)) manquants.push('la cote C du raccord : le manchon est choisi par le toron seulement');
  if (c.gaine && !gaine) manquants.push('aucune gaine ' + c.gaine + ' ne va à ce toron');
  if (r.bandit && !collier) manquants.push('aucun collier ne va à ce toron');
  return { choix: c, toron: f.diametre, deq: f.deq, faisceau: f, famille, taille, filetage, raccord, reference: ref, entree, bandit: r.bandit, manchon: r.manchon, manchonRef: manchon, collier, tyrap, gaine, sortie,
           pourquoi: sans ? 'un connecteur EN 3645 s’utilise sans raccord (la règle d’atelier ; l’EN 3660-020 existe)' : r.pourquoi, manquants }; }
