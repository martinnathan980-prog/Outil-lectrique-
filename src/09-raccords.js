/* ===========================================================================
   09 ter — LES RACCORDS : ce qui englobe un connecteur
   ---------------------------------------------------------------------------
   Le tutoriel du lecteur, en sept pas : le matériau, le diamètre du toron,
   le connecteur, le RACCORD, la GAINE, le MANCHON, le COLLIER band-it —
   complété par les recherches d'octobre 2026 (EN 3660 : les dessins
   TE/Polamco, les aperçus des normes EN 3660-062 à -065, -005, -017/-018,
   -025 à -027, -033 ; Glenair, HellermannTyton, VG 95343, l'AC 43.13-1B :
   normes/raccords.csv, recherches R2, R3, R4). Ce que l'outil fait de chaque
   connecteur :
     · le TORON : les câbles du connecteur (la base des câbles), la section
       cumulée, le diamètre équivalent √(Σ Ø²), multiplié par le facteur de
       TE/Polamco selon le nombre de câbles (1 ; 1,415 pour 2 ; 1,242 pour 3 ;
       1,205 ; 1,208 ; 1,225 ; 1,15 dès 7 — table Toron, recherche R3) ; ou,
       en hypothèse « comme l'Excel », plus 10 % (HYPOTHESES.toron) ;
     · la TAILLE du boîtier, lue dans le part number quand la table des
       filetages connaît la famille (EN 3645 : 09 à 25 ; EN 2997 et EN 3646 :
       08 à 28), le FILETAGE d'accessoire qui va avec, et la CLASSE du
       connecteur (table Classes : les lettres juste après le nom de la
       famille — W cadmium, R nickel, K inox…) qui donne la classe EN 3660 du
       raccord (W ↔ W, nickel ↔ N — la lettre de l'EN 3660-001:2019 ; F n'est
       plus que celle que TE/Polamco imprime —, inox ↔ K, jamais A) ;
     · le CHOIX, par la table du tutoriel corrigée : reprise de blindage (GND
       sur le corps, BLI par cosse, NO, CONTACT) × étanchéité × le RÔLE de la
       gaine — une tresse de SURBLINDAGE demande un raccord blindé (durci,
       style K) et un band-it, obligatoires ; une gaine de PROTECTION (Nomex)
       ne demande rien de plus : elle finit sous le manchon ou par un collier.
       GND → durci + band-it (+ manchon si étanche) ; surblindage → pareil ;
       étanche sans surblindage → droit : pour manchon (style J) + manchon,
       coudé : durci + manchon ; ni l'un ni l'autre → tyrap (style A), ou
       serre-câble pour une reprise par cosse (les cosses sous ses deux vis).
       L'étanchéité demande un manchon précollé (T18/T19, préféré), ou un T06
       collé. L'EN 3645 reste SANS RACCORD (la règle d'atelier du tutoriel, à
       confirmer : les EN 3660-063/-062/-017/-018/-020 sont dans la table) ;
       l'EN 4165 prend une CHEMINÉE par module (EN 4165-015 ronde, -016 double
       ovale pour deux modules, -017 obturateur d'une cavité vide) : son Ø
       intérieur n'est pas public, le passage du toron est « à confirmer » ;
     · la RÉFÉRENCE du raccord, CONSTRUITE depuis le modèle de la ligne
       Raccords (`EN3660-064N08<L><E>`) : la classe du connecteur à la place du
       N, <L> le code de longueur de chambre (A par défaut : une hypothèse, la
       pratique proposée par R3 dite en conseil), <E> le CODE D'ENTRÉE : le
       plus petit code dont la PLAGE DE TORON normalisée (EN 3660-062/-065 :
       A 2,0–4,0 … M 28,4–31,0 mm — pas l'alésage ØAA) passe le toron, borné
       au code maximal de la taille (sinon « toron trop gros pour ce boîtier ») ;
       un toron entre deux plages, ou sous la première, prend le code au-dessus
       et un bourrage ; un serre-câble EN 3660-004/-005 n'a pas de code : ses
       cotes M sont les LIMITES DU COLLIER (EN 3660-005, note b), pas une plage
       de toron ; le code Glenair ne sert qu'à un serre-câble sans cotes ;
     · la MASSE de la pièce désignée (table Masses des raccords : -062 à -065
       par taille, chambre, code et classe), le COUPLE de pose quand la norme
       le donne (raccords à collier -017/-018, -025 à -027) ;
     · la BANDE : LE BAND-IT PAR DÉFAUT, dit une fois dans la table Colliers
       (colonne Défaut : l'EN 3660-033AF, 6,22 mm, double tour, Ø serré
       ≤ 47,8 mm, outil EN 3660-038) tant qu'il serre la plateforme ØBB du
       code d'entrée retenu (sinon le toron), puis la BF (≤ 63,5) ; l'E0805
       d'Airbus Helicopters en équivalent par le toron ; le TYRAP NSA935401
       par le toron maximal et la longueur ; la GAINE par son rôle — un
       surblindage dont l'intérieur passe le toron, une protection dont la
       plage encadre le toron — ; le MANCHON (table Manchons, VG 95343) par ce
       qui sort du raccord : Ja > D > Jb, et Ha > C > Hb avec la cote C = ØCC
       du code d'entrée retenu (sinon la cote C de la ligne Raccords) ; DROIT
       sur un raccord coudé (il fait déjà l'angle), coudé seulement pour donner
       l'angle à un raccord droit ou à une cheminée — les autres formes (45°,
       T, Y…) restent dans la table ;
     · LA NOMENCLATURE D'HABILLAGE (`pieces`) : une ligne par pièce à
       commander, de la face du connecteur vers le toron — raccord ou
       cheminée, bande, manchon, tyrap, gaine, bourrage, obturateurs des
       cavités libres (avec le plan de contacts) —, chacune son statut
       (vérifié, à confirmer, manque) et une note courte : la fiche du
       connecteur l'affiche telle quelle (vérification D, octobre 2026).
   Rien ici ne touche à la page : le moteur, comme 09.
   =========================================================================== */
'use strict';

const BLINDAGES = { NO: 'aucune reprise de blindage', GND: 'reprise sur le corps du connecteur', BLI: 'reprise par cosse', CONTACT: 'reprise sur un contact' };
const MATERIAUX = ['nickelage alu', 'cadmiage vert olive', 'passivation acier inox', 'anodisation alu noir'];
// `chambre` : un code de longueur de chambre choisi pour ce connecteur (vide : l'hypothèse)
const CHOIX_RACCORD = { blindage: 'NO', etanche: false, orientation: 'droit', gaine: '', surblindage: false, materiau: '', chambre: '' };
/* Les familles SANS RACCORD, et pourquoi : rien ne se calcule pour elles — ni raccord, ni band-it, ni manchon, ni gaine,
   ni tyrap. L'EN 3645 : la règle d'atelier lue dans le tutoriel, que le lecteur n'a pas redite — à confirmer (la norme
   lui nomme les EN 3660-063 droit, -062 coudé, -020/-021 serre-câble, et par le filetage les -017/-018 à collier : les
   lignes sont dans la table, le jour où le lecteur retire l'EN 3645 d'ici, tout se calcule). L'EN 4165 n'en est plus :
   sa CHEMINÉE est son raccord (recherche R3 : c'est le mot de la norme). */
const SANS_RACCORD = { EN3645: 'sans raccord : un EN 3645 s’utilise sans raccord (la règle d’atelier du tutoriel, à confirmer — l’EN 3660-063 droit et le -062 coudé existent pour lui)' };
const sansRaccord = famille => Object.prototype.hasOwnProperty.call(SANS_RACCORD, famille || '');
/* La classe EN 3660 d'un raccord sans classe lue dans le connecteur, et le code de longueur de chambre par défaut (A =
   27,5 mm sur le -064, 27,1 sur le -063 : table Chambres ; B 35,5, C 40,5, D 50,5 — `LONGUEURS_CHAMBRE`, celles du -064,
   quand la table manque). */
const CLASSE_DEFAUT = 'N', LONGUEUR_CHAMBRE = 'A', LONGUEURS_CHAMBRE = { A: 27.5, B: 35.5, C: 40.5, D: 50.5 }, CODES_CHAMBRE = ['A', 'B', 'C', 'D'];
/* Une tresse de surblindage se reconnaît à son nom quand la table des gaines ne dit pas son rôle. */
const NOM_DE_TRESSE = /hfa|dhs|tresse|blind|cem|braid|shield/i;

/* ---- les hypothèses du raccord (octobre 2026) ------------------------------------
   Ce que la norme ne tranche pas, l'outil le SUPPOSE (elles s'ajoutent à celles de la simulation, `HYPOTHESES`, 09 :
   `app.simu` les porte, la nomenclature les lit ; la fiche des hypothèses et la ligne « autour » ne les montrent et ne
   les passent pas encore — 08-interface et 08-fiche, à brancher) :
     · `toron` — « TE » : le facteur de TE/Polamco selon le nombre de câbles (table Toron, vérifié) ; « Excel » : √(Σ Ø²)
       plus 10 %, comme la feuille de calcul du lecteur (un remplissage de 83 %, au-dessus des 80 % de Glenair) ;
     · `chambre` — le code de longueur de chambre <L> des raccords droits à bande : A par défaut. La norme ne dit pas
       comment le choisir ; la pratique que R3 propose (déduite, à confirmer par l'atelier) est dite en conseil. */
const TORONS = { TE: 'TE/Polamco : le facteur selon le nombre de câbles × √(Σ Ø²)', Excel: 'comme l’Excel : √(Σ Ø²) + 10 %' };
const PRATIQUE_CHAMBRE = 'A pour une tresse globale seule ; B ou plus quand on reprend des blindages individuels dans la chambre, ou avec des contacts taille 8 à botte d’étanchéité (« expanded clearance » chez Glenair) — pratique proposée par la recherche R3, déduite, à confirmer par l’atelier';
Object.assign(HYPOTHESES, { toron: 'TE', chambre: LONGUEUR_CHAMBRE });

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
/* Les lignes des tables Toron, Chambres et Masses des raccords se lisent avec les autres (`toronNorme`, `chambreNorme`,
   `masseRaccordNorme`, 09) : le moteur des normes se charge sans ce fichier. */
/* LE TORON d'un faisceau : √(Σ Ø²) (`deq`, le rond de même section hors-tout) multiplié par le facteur de la méthode —
   « TE » : la ligne du nombre de câbles (1 ; 1,415 pour 2… ; « 7 et plus » 1,15), « Excel » : la ligne du tutoriel (1,10).
   Sans table Toron, + 10 % (FOISONNEMENT), et c'est dit. Rend { diametre, facteur, methode, n, regle, ligne }. */
function toronDe(norme, f, methode) { const m = TORONS[methode] ? methode : 'TE', n = f ? f.n : 0, T = tableNorme(norme, 'torons').filter(x => x.cle === m && x.facteur != null);
  const ligne = m === 'Excel' ? T[0] || null : (T.find(x => x.fils === n && !x.etPlus) || T.filter(x => x.etPlus && x.fils != null && n >= x.fils).sort((a, b) => b.fils - a.fils)[0] || null);
  const facteur = ligne ? ligne.facteur : FOISONNEMENT, nom = ligne ? m : 'Excel', virg = x => String(x).replace('.', ',');
  const regle = !f || f.deq == null ? '' : nom === 'TE' ? `√(Σ Ø²) × ${virg(facteur)} — le facteur TE/Polamco pour ${n} câble${n > 1 ? 's' : ''} (Circular Backshells p. 11)` : `√(Σ Ø²) + ${Math.round((facteur - 1) * 100)} % — comme l’Excel du lecteur${ligne || m === 'Excel' ? '' : ' (pas de table Toron)'}`;
  return { diametre: f && f.deq != null ? f.deq * facteur : null, facteur, methode: nom, n, regle, ligne }; }
/* Le RÔLE d'une famille de gaine : ce que la table dit (surblindage / protection), sinon son nom. */
function roleDeGaine(norme, famille) { const g = tableNorme(norme, 'gaines').find(x => x.famille === cleNorme(famille)); return g ? g.role : NOM_DE_TRESSE.test(String(famille || '')) ? 'surblindage' : 'protection'; }
/* Le collier qui serre : LA BANDE PAR DÉFAUT (colonne Défaut de la table Colliers : l'EN3660-033AF, la bande standard
   6,22 mm qu'on prend presque toujours) tant que son Ø serré passe `d` (la plateforme ØBB du raccord, sinon le toron) ;
   sinon la bande de la norme (EN 3660-033, la standard avant la micro, la plus courte qui serre : BF jusqu'à 63,5 mm) ;
   en `equivalent` le band-it d'atelier (E0805) choisi par le toron — ou, si c'est lui le défaut, la bande normalisée ;
   sans bande qui serre, le band-it d'atelier lui-même. `parDefaut` : la bande retenue est celle par défaut. */
function collierPour(norme, d, dToron) { if (d == null) return null; const B = tableNorme(norme, 'colliers').filter(c => c.type !== 'tyrap'), va = (c, x) => (c.dmin == null || x > c.dmin) && (c.dmax == null || x <= c.dmax), dt = dToron != null ? dToron : d;
  const normee = B.find(c => c.norme && !c.micro && va(c, d)) || B.find(c => c.norme && va(c, d)) || null, atelier = B.find(c => !c.norme && va(c, dt)) || null;
  const defaut = B.find(c => c.defaut && va(c, c.norme ? d : dt)) || null, bande = defaut || normee;
  if (!bande) return atelier;
  const equivalent = bande.norme ? (atelier !== bande ? atelier : null) : (normee !== bande ? normee : null);
  return { ...bande, equivalent, parDefaut: bande === defaut }; }
/* La bande par défaut de la table (une ligne « Défaut : oui »), même quand elle ne serre pas ce Ø : la fiche le dit. */
const bandeParDefaut = norme => tableNorme(norme, 'colliers').find(c => c.defaut) || null;
/* Le tyrap pour un toron : le toron maximal le plus serré qui passe, puis le plus court ; sans dimensions, le premier de la table. */
function tyrapPour(norme, d) { const T = tableNorme(norme, 'colliers').filter(c => c.type === 'tyrap'); if (!T.length) return null;
  const connus = T.filter(c => c.dmax != null && (d == null || d <= c.dmax)).sort((a, b) => a.dmax - b.dmax || (a.longueur || 0) - (b.longueur || 0)); return connus[0] || T.find(c => c.dmax == null) || null; }
/* La gaine d'une famille pour un toron : un surblindage dont l'intérieur passe le toron (le plus petit) ; une
   protection dont la plage encadre le toron, celle où il est le plus près du milieu de la plage. */
function gainePour(norme, famille, d) { const G = tableNorme(norme, 'gaines').filter(g => !famille || g.famille === cleNorme(famille)); if (d == null || !G.length) return null;
  const blind = G.filter(g => g.role === 'surblindage' && g.dint != null && g.dint > d).sort((a, b) => a.dint - b.dint);
  const prot = G.filter(g => g.role !== 'surblindage' && g.dmin != null && g.dmax != null && d >= g.dmin && d <= g.dmax).sort((a, b) => Math.abs(d - (a.dmin + a.dmax) / 2) / (a.dmax - a.dmin) - Math.abs(d - (b.dmin + b.dmax) / 2) / (b.dmax - b.dmin));
  return blind[0] || prot[0] || null; }
/* La taille du boîtier, lue dans le part number. Une famille qui écrit sa taille en LETTRE (l'EN 3645 : la colonne
   Lettre de la table des filetages, A = 09 … J = 25) la porte juste après sa classe et le chiffre du style —
   EN3645 F 0 C N 26 M N → C = 13 (rapport R3-connecteurs, structure lue chez Amphenol) : sans quoi l'arrangement 11 de
   « EN3645F0GN11MN » se lisait taille 11 au lieu de 21. Sinon, après le nom de la famille, la première paire de chiffres
   qui est une taille de la famille — la taille précède toujours l'arrangement (EN3646-002-12-08 → 12 ;
   EN3645-002-13N26 → 13 ; EN3646A6088AAN → 08, la classe 6 devant). */
function tailleDuPn(norme, famille, pn) { const F = tableNorme(norme, 'filetages').filter(f => f.famille === famille); if (!F.length || !pn) return '';
  const parLettre = new Map(F.filter(f => f.lettre).map(f => [f.lettre, f.taille])), k = parLettre.size ? classeDuPn(norme, famille, pn) : null;
  const m = k ? /^\d([A-Z])/.exec(cleNorme(pn).slice(famille.length + k.classe.length)) : null; if (m && parLettre.has(m[1])) return parLettre.get(m[1]);
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
/* La classe EN 3660 du raccord qui va au connecteur : celle de sa classe lue, sinon N (le nickel, la lettre de l'EN
   3660-001:2019 — F n'y est plus : TE/Polamco l'imprime encore sur ses références). */
function classeDeRaccord(norme, famille, pn, reference) { const k = classeDuPn(norme, famille, pn) || classeDuPn(norme, famille, reference);
  return k ? { lettre: k.classe, raccord: k.raccord || CLASSE_DEFAUT, materiau: k.materiau, fini: k.fini, temperature: k.temperature, source: 'part number' } : { lettre: '', raccord: CLASSE_DEFAUT, materiau: 'alu', fini: 'nickel', temperature: null, source: 'par défaut' }; }
/* Le CODE D'ENTRÉE de câble d'un raccord, dans un SYSTÈME (« EN 3660 » : A à M ; « Glenair » : 03 à 32 ; vide : tous) :
   le plus petit code que la taille du boîtier admet et dont le MAXIMUM passe le toron (EN 3660-062/-065 : « the cable
   entry shall be selected in accordance with the maximum diameter of the cable bundle »). Un toron sous le minimum du
   code retenu — entre deux plages (9,0–9,4, 12,0–12,4, 25,0–25,4, 28,0–28,4 mm) ou sous la première — le prend quand
   même, avec un BOURRAGE (ruban silicone) : `bourrage` le dit. */
function entreePour(norme, d, taille, systeme) { if (d == null) return null; const t = taille ? parseInt(taille, 10) : null;
  const e = tableNorme(norme, 'entrees').filter(e => (!systeme || e.systeme === systeme) && d <= e.dmax + 1e-9 && (t == null || !e.tailleMin || (t >= parseInt(e.tailleMin, 10) && t <= parseInt(e.tailleMax || '99', 10)))).sort((a, b) => a.dmax - b.dmax || a.dmin - b.dmin)[0] || null;
  return e ? { ...e, bourrage: d < e.dmin - 1e-9 } : null; }
/* Le plus gros code d'entrée qu'une taille de boîtier admet (08/09 → D, 10/11 → F, 12/13 → H… pour l'EN 3660). */
function entreeMaximale(norme, taille, systeme) { const t = taille ? parseInt(taille, 10) : null; if (t == null || isNaN(t)) return null;
  return tableNorme(norme, 'entrees').filter(e => (!systeme || e.systeme === systeme) && (!e.tailleMin || (t >= parseInt(e.tailleMin, 10) && t <= parseInt(e.tailleMax || '99', 10)))).sort((a, b) => b.dmax - a.dmax)[0] || null; }
/* La ligne de la table Raccords : la taille exacte d'abord ; sinon, quand la famille a des lignes par taille pour ce
   type et cette orientation, la mieux établie d'entre elles SANS sa taille (la désignation restera incomplète :
   `tailleInconnue`) ; sinon la ligne valable pour toutes les tailles. */
const CONFIANCES = { 'vérifié': 0, structure: 1, 'déduit': 2, 'à confirmer': 3 };
function raccordDeTable(norme, famille, taille, type, orientation) { const R = tableNorme(norme, 'raccords').filter(r => r.famille === famille && r.type === type && r.orientation === orientation); if (!R.length) return null;
  const exact = taille ? R.find(r => r.taille === taille) : null; if (exact) return exact;
  const parTaille = R.filter(r => r.taille).sort((a, b) => (CONFIANCES[a.confiance] || 9) - (CONFIANCES[b.confiance] || 9));
  if (parTaille.length) { const m = parTaille[0]; return { ...m, taille: '', amin: null, amax: null, b: null, c: null, masse: null, couple: null, reference: m.reference.replace(/^(EN ?3660-\d{3}[A-Z]{1,2})\d{2}/i, '$1<T>'), tailleInconnue: true }; }
  return R.find(r => !r.taille) || null; }
/* Une famille dont le raccord est une CHEMINÉE : sa table Raccords n'a que des cheminées (l'EN 4165 : EN 4165-015 ronde,
   -016 double ovale, -017 obturateur). */
const aCheminee = (norme, famille) => { const R = tableNorme(norme, 'raccords').filter(r => r.famille === famille); return R.length > 0 && R.every(r => r.type === 'cheminée'); };
/* La DÉSIGNATION construite depuis le modèle d'une ligne Raccords (`EN3660-064N08<L><E>`) : la classe du connecteur à la
   place de la lettre qui suit la partie, <L> le code de longueur de chambre, <E> le code d'entrée. Vide tant qu'il
   manque quelque chose (le code d'entrée, la taille). */
function designationRaccord(modele, classe, longueur, entree) { if (!modele) return '';
  let s = String(modele).trim().replace(/^(EN ?3660-\d{3})[A-Z]{1,2}(?=\d{2}|<T>)/i, (m, p) => p + (classe || CLASSE_DEFAUT)).replace(/<L>/g, longueur || LONGUEUR_CHAMBRE);
  if (/<E>/.test(s)) { if (!entree) return ''; s = s.replace(/<E>/g, entree); }
  return /[<>]/.test(s) ? '' : s; }
/* LA CHAMBRE d'un raccord droit à bande : la ligne de la table Chambres pour sa partie et son code (H max, la longueur
   derrière la face), sinon les longueurs du -064 (`LONGUEURS_CHAMBRE`). */
function chambreDe(norme, partie, code) { const p = cleNorme(partie), c = String(code || '').toUpperCase(), L = tableNorme(norme, 'chambres').find(x => x.norme === p && x.code === c);
  return L ? { code: c, hmax: L.hmax, derriere: L.derriere, ligne: L } : LONGUEURS_CHAMBRE[c] != null ? { code: c, hmax: LONGUEURS_CHAMBRE[c], derriere: null, ligne: null } : null; }
/* LA MASSE d'une pièce EN 3660 désignée : la ligne de la table Masses pour sa partie, sa taille, sa chambre (les droits),
   son code d'entrée et sa classe (N, W, T, Z ensemble ; K l'inox à part). Rien quand la table ne la donne pas. */
function masseDeRaccord(norme, partie, taille, chambre, code, classe) { const p = cleNorme(partie), t = TAILLE_BOITIER(taille), c = String(code || '').toUpperCase(), k = String(classe || CLASSE_DEFAUT).toUpperCase(), l = String(chambre || '').toUpperCase();
  return tableNorme(norme, 'massesRaccords').find(x => x.norme === p && x.taille === t && x.code === c && (x.longueur ? x.longueur === l : true) && x.classes.includes(k)) || null; }
/* Le manchon : Ja > D > Jb côté toron (D : ce qui sort du raccord, gaine ou toron) et, si la cote C du raccord est
   connue, Ha > C > Hb côté raccord. `forme` : la forme du MANCHON — droit (ou à sortie longue, la « bouteille » sur un
   petit épaulement, seulement quand aucun droit ne va) ou coudé (à nervure ou à lèvre) ; les autres formes (45°,
   transitions, 2 à 4 sorties) restent dans la table, à la main. Le plus petit qui passe, le PRÉCOLLÉ (T18/T19) d'abord
   à cotes égales — l'étanchéité le demande. */
function manchonPour(norme, d, c, forme) { if (d == null) return null; const coude = forme === 'coudé', formes = coude ? ['coudé', 'coudé à lèvre'] : ['droit', 'sortie longue'];
  const M = tableNorme(norme, 'manchons').filter(m => formes.includes(m.forme) && m.ja > d && (m.jb == null || m.jb < d) && (c == null || (m.ha > c && (m.hb == null || m.hb < c))));
  const rang = m => coude ? 0 : formes.indexOf(m.forme);
  return M.sort((a, b) => rang(a) - rang(b) || a.ja - b.ja || (b.precolle ? 1 : 0) - (a.precolle ? 1 : 0) || (a.p || 0) - (b.p || 0))[0] || null; }
/* LA FORME DU MANCHON. Un manchon coudé DONNE l'angle à un raccord droit — une cheminée, un raccord droit (AC 43.13-1B
   § 11-138 ; R4 ; R3 : « un manchon coudé peut donner l'angle sur un raccord droit ») : la pièce moulée se rétreint en
   équerre sur l'épaulement du raccord. Un raccord COUDÉ (EN 3660-065, -062) fait déjà l'angle : son manchon, posé sur
   l'épaulement de sa sortie, est DROIT — avant octobre 2026, l'outil lui donnait un manchon coudé, un second angle. */
const formeDuManchon = (orientation, ref) => ref && ref.orientation === 'coudé' ? 'droit' : orientation === 'coudé' ? 'coudé' : 'droit';
/* Les câbles blindés un à un d'un faisceau (MLB, KD…) : avec une reprise de blindage, la pratique proposée par R3 conseille
   une chambre plus longue que A. */
const blindesUnAUn = f => (f && f.cables || []).filter(c => c.blindage).length;
/* Une ligne Raccords dont la norme est lue pour ses cotes mais pas pour sa clause de désignation (le statut ou la note le
   disent : « désignation non lue », « codes de désignation non lus », « suffixe … supposé ») : sa référence est un modèle. */
const MODELE_SEUL = /d[ée]signation non lue|d[ée]signation non lus|suppos[ée]|suffixe A = variante A \(d[ée]duit/i;

/* ---- la nomenclature d'habillage ----------------------------------------------------
   UNE LIGNE PAR PIÈCE À COMMANDER pour ce connecteur, de la face du connecteur vers le toron : le raccord (ou la
   cheminée, ou « aucun raccord »), la bande (band-it), le manchon, le tyrap, la gaine, le bourrage, les obturateurs des
   cavités libres. Chaque ligne : `role` (raccord, cheminee, bande, manchon, tyrap, gaine, obturateur, autre), `libelle`,
   `reference`, `quantite`, `statut` — « vérifié » : la ligne de table est lue sur le document et la référence est
   entière ; « à confirmer » : déduite, modèle, ou donnée non relue ; « manque » : la pièce est due mais l'outil ne sait
   pas laquelle (la note dit pourquoi) — et `note`, une phrase courte au plus. La fiche du connecteur l'affiche telle
   quelle ; les autres champs de `habillage` restent. */
const ROLES_PIECE = ['raccord', 'cheminee', 'bande', 'manchon', 'tyrap', 'gaine', 'autre', 'obturateur'];
const STATUTS_PIECE = ['vérifié', 'à confirmer', 'manque'];
const statutDePiece = x => x && x.confiance === 'vérifié' ? 'vérifié' : 'à confirmer';
const NOMS_RACCORD = { durci: 'Raccord blindé étanche (durci)', 'pour manchon': 'Raccord pour manchon', 'serre-câble': 'Raccord à serre-câble', tyrap: 'Raccord à collier' };
// les manques qui empêchent de commander le raccord retenu (sa référence, sa taille, un toron qui n'y passe pas)
const MANQUE_RACCORD = /^la référence du raccord|^la taille du boîtier|trop gros|ne passe pas|ne s’ouvre pas/;
function piecesDHabillage(norme, h, opts, fils) { const P = [], mm = mmTexte, c = h.choix, R = h.reference, O = opts || {};
  const piece = (role, libelle, reference, quantite, statut, note) => P.push({ role, libelle, reference: reference || '', quantite, statut, note: note || '' });
  const nModules = Math.max(1, Math.round(O.modules || 1)), toron = h.toron != null ? 'Ø ' + mm(h.toron) + ' mm' : 'Ø inconnu';
  // 1. le raccord — ou la cheminée d'un EN 4165, une par module câblé — ou rien (l'EN 3645 de la règle d'atelier)
  if (h.sansRaccord) piece('raccord', 'Aucun raccord', '', 0, 'à confirmer', 'un ' + nomDeFamille(norme, h.sansRaccord) + ' s’utilise sans raccord : la règle d’atelier du tutoriel');
  else if (h.cheminee) piece('cheminee', 'Cheminée ronde', R ? R.reference || R.norme : 'EN4165-015', nModules, 'à confirmer', 'une par module câblé ; son Ø intérieur n’est pas public : le passage du toron (' + toron + ') reste à confirmer');
  else if (h.raccord !== 'tyrap' || R) { const libelle = NOMS_RACCORD[h.raccord] + (c.orientation === 'coudé' ? ' 90°' : ' droit'), bloque = h.manquants.find(m => MANQUE_RACCORD.test(m));
    if (!R) piece('raccord', libelle, '', 1, 'manque', 'la table Raccords n’a pas ' + (h.famille ? 'de ligne ' + h.raccord + ' pour l’' + nomDeFamille(norme, h.famille) : 'ce connecteur (famille hors des normes)'));
    else if (!h.designation) piece('raccord', libelle, R.norme, 1, bloque ? 'manque' : 'à confirmer', bloque || 'désignation complète non lue (ligne ' + R.confiance + ')');
    else { const modele = h.manquants.some(m => /est un modèle/.test(m)), horsClasse = h.manquants.find(m => /n’existe qu’en classes/.test(m)), mots = [];
      if (h.entree && h.entree.systeme === 'EN 3660') mots.push('entrée ' + h.entree.code + ' (' + mm(h.entree.dmin) + '–' + mm(h.entree.dmax) + ' mm)');
      if (h.chambre) mots.push('chambre ' + h.longueur + (h.chambre.source === 'choix' ? '' : h.chambre.source === 'défaut' ? ' par défaut' : ' (hypothèse)'));
      if (h.masse && h.masse.masse != null) mots.push(mm(h.masse.masse) + ' g');
      if (h.couple != null) mots.push('couple ' + mm(h.couple) + ' N·m');
      if (modele) mots.push('suffixes à confirmer'); else if (R.confiance !== 'vérifié') mots.push('ligne ' + R.confiance);
      if (horsClasse) mots.push(horsClasse.replace(/ — .*$/, ''));
      if (bloque) mots.push(bloque);
      piece('raccord', libelle, h.designation, 1, bloque ? 'manque' : R.confiance === 'vérifié' && !modele && !horsClasse ? 'vérifié' : 'à confirmer', mots.join(', ')); } }
  // 2. la bande de blindage (band-it) : la bande par défaut tant qu'elle serre, l'outil de pose, l'équivalent d'atelier
  if (h.bandit) { const B = h.collier, defaut = bandeParDefaut(norme), serre = h.serre != null ? 'Ø ' + mm(h.serre) + ' mm' : toron;
    if (!B) piece('bande', 'Bande de blindage (band-it)', '', 1, 'manque', 'aucune bande de la table ne serre ' + serre);
    else { const outil = ((/^[^(–;/]+/.exec(B.outil || '') || [''])[0]).trim();
      piece('bande', 'Bande de blindage (band-it)', B.reference, 1, statutDePiece(B), 'double tour sur ' + serre + (outil ? ', outil ' + outil : '') + (B.equivalent ? ', ≈ ' + B.equivalent.reference : '')
        + (defaut && !B.parDefaut && B !== defaut ? ' (la bande par défaut ' + defaut.reference + ' ne serre pas ce Ø)' : '')); } }
  // 3. le manchon thermorétractable : précollé pour l'étanchéité, droit sur un raccord coudé
  if (h.manchon) { const M = h.manchonRef, coude = h.formeManchon === 'coudé';
    if (!M) piece('manchon', 'Manchon thermorétractable' + (coude ? ' coudé' : ''), '', 1, 'manque', h.manquants.find(m => /^aucun manchon/.test(m)) || 'aucun manchon de la table ne va');
    else piece('manchon', 'Manchon thermorétractable ' + (M.precolle ? 'précollé' : 'à coller') + (coude ? ', coudé' : ''), M.designation, 1, statutDePiece(M),
      [M.reference, M.precolle ? '' : 'colle VG 95343 T15 (V9500)', h.cote != null ? 'sur l’épaulement Ø ' + mm(h.cote) + ' mm' : 'choisi par le toron seul'].filter(Boolean).join(', ')); }
  // 4. le tyrap : sur le bras d'un raccord à collier, ou sur le toron d'une cheminée sans manchon
  if (h.tyrap || h.raccord === 'tyrap' || (h.cheminee && !h.manchon)) { const T = h.tyrap, q = h.cheminee ? nModules : 1;
    if (!T) piece('tyrap', 'Tyrap', '', q, 'manque', 'aucun tyrap de la table ne serre ' + toron);
    else piece('tyrap', 'Tyrap', T.reference, q, statutDePiece(T), 'serre le toron ' + toron + (T.dmax != null ? ' (Ø ' + mm(T.dmax) + ' mm au plus)' : '') + (h.raccord === 'tyrap' && R ? ' sur le bras du raccord' : '')); }
  // 5. la gaine (au mètre) : une tresse de surblindage ou une protection — rien pour une famille sans raccord (rien ne s'y calcule)
  if (c.gaine && !h.sansRaccord) { const G = h.gaine;
    if (!G) piece('gaine', 'Gaine ' + c.gaine, '', 1, 'manque', 'aucune gaine ' + c.gaine + ' ne va à ' + toron);
    else piece('gaine', (G.role === 'surblindage' ? 'Tresse de surblindage' : 'Gaine de protection') + ' (au mètre)', G.reference, 1, statutDePiece(G),
      G.role === 'surblindage' ? 'Ø intérieur ' + mm(G.dint) + ' mm' + (h.bandit ? ', reprise par la bande sur le raccord' : '') : 'toron ' + mm(G.dmin) + '–' + mm(G.dmax) + ' mm, finit ' + (h.manchon ? 'sous le manchon' : 'par un collier')); }
  // 6. le bourrage : un toron sous la plage du code d'entrée (ou sous le collier du serre-câble)
  if (h.bourrage) piece('autre', 'Bourrage', 'ruban silicone', 1, 'à confirmer', h.bourrage);
  // 7. les obturateurs : un par cavité libre du plan de contacts, par taille (table Obturateurs)
  const plan = O.plan; if (plan && plan.modules && plan.modules.length && plan.fils) {
    const vus = new Set(fils || []), miens = plan.fils.filter(x => vus.has(x.f)), pris = miens.length ? miens : plan.fils, libres = new Map();
    plan.modules.forEach((M, i) => { const u = new Set(pris.filter(x => (x.module || 0) === i).map(x => x.contact && x.contact.lettre));
      ((M.module && M.module.contacts) || []).forEach(k => { if (u.has(k.lettre)) return; const cle = M.module.famille + '|' + k.taille; libres.set(cle, (libres.get(cle) || 0) + 1); }); });
    libres.forEach((n, cle) => { const [fam, t] = cle.split('|'), B = obturateurDe(norme, fam, t);
      piece('obturateur', 'Obturateur de cavité, contact ' + t, B ? B.obturateur : '', n, B ? statutDePiece(B) : 'manque',
        B ? [B.equivalent ? '≈ ' + B.equivalent : '', B.couleur].filter(Boolean).join(', ') : 'la table Obturateurs n’a pas l’' + nomDeFamille(norme, fam) + ' en taille ' + t); }); }
  return P; }

/* L'HABILLAGE d'un connecteur : le toron, la taille, le filetage et la classe, le choix du tutoriel, la ligne Raccords
   et la désignation construite, le code d'entrée, la chambre, la masse, la bande, la gaine, le manchon — ce qui
   manque, et la nomenclature d'habillage (`pieces`). `pn` : le part number du connecteur ; `reference` : l'arrangement
   retenu (EN3646-002-12-08), qui porte la taille à défaut ; `hyp` : les hypothèses (`toron`, `chambre` ; sans elles,
   celles de l'outil) ; `opts` (facultatif) : `modules`, le nombre de modules câblés (les cheminées d'un EN 4165, une par
   module) ; `plan`, le plan de contacts du connecteur (`remplirContacts`) — chaque cavité libre y demande un obturateur. */
function habillage(norme, fils, choix, pn, reference, hyp, opts) { const c = { ...CHOIX_RACCORD, ...(choix || {}) }, H = { ...HYPOTHESES, ...(hyp || {}) }, avecPieces = h => ({ ...h, pieces: piecesDHabillage(norme, h, opts, fils) });
  const f0 = faisceauDe(norme, fils), foisonnement = toronDe(norme, f0, H.toron), f = { ...f0, diametre: foisonnement.diametre, foisonnement };
  const famille = familleDeReference(norme, pn, 'connecteur') || familleDeReference(norme, reference, 'connecteur');
  // la taille : dans le part number du fichier, sinon dans la référence retenue (l'arrangement choisi, EN3646-002-12-08) ; la classe, dans le part number
  const taille = tailleDuPn(norme, famille, pn) || tailleDuPn(norme, famille, reference), filetage = taille ? filetageDe(norme, famille, taille) : null, classe = classeDeRaccord(norme, famille, pn, reference);
  // la chambre : celle choisie pour ce connecteur, sinon l'hypothèse (A par défaut)
  const chambreCode = CODES_CHAMBRE.includes(c.chambre) ? c.chambre : CODES_CHAMBRE.includes(H.chambre) ? H.chambre : LONGUEUR_CHAMBRE, chambreSource = CODES_CHAMBRE.includes(c.chambre) ? 'choix' : chambreCode === LONGUEUR_CHAMBRE ? 'défaut' : 'hypothèse';
  const vide = { choix: c, toron: f.diametre, deq: f.deq, faisceau: f, foisonnement, famille, taille, filetage, classe, reference: null, designation: '', longueur: '', chambre: null, chambreConseil: '', entree: null, cote: null, bandit: false, manchon: false, manchonRef: null, formeManchon: '', colle: '', collier: null, serre: null, tyrap: null, gaine: null, roleGaine: '', sortie: null, statut: '', masse: null, couple: null, cheminee: false, bourrage: '' };
  // une famille sans raccord : le toron et le boîtier se disent, rien d'autre ne se calcule
  if (sansRaccord(famille)) return avecPieces({ ...vide, raccord: 'aucun', sansRaccord: famille, regle: 'sans raccord', pourquoi: SANS_RACCORD[famille], aConfirmer: famille === 'EN3645', manquants: [] });
  const roleGaine = c.gaine ? roleDeGaine(norme, c.gaine) : '', r = regleRaccord({ ...c, surblindage: c.gaine ? roleGaine === 'surblindage' : false }), mm = mmTexte;
  const gaine = c.gaine ? gainePour(norme, c.gaine, f.diametre) : null;
  // ce qui sort du raccord : la gaine (son extérieur), sinon le toron
  const sortie = gaine ? (gaine.dext != null ? gaine.dext : gaine.dmax != null ? Math.min(gaine.dmax, (f.diametre || 0) * 1.3) : f.diametre) : f.diametre;
  /* UNE CHEMINÉE (EN 4165) : une par module câblé — la ronde EN 4165-015 (une double ovale -016 pour deux modules voisins,
     un obturateur -017 sur une cavité vide) ; le toron tenu par un tyrap, ou par un manchon s'il faut l'étanchéité (un
     manchon coudé quand on veut l'angle : la cheminée est droite). Son Ø intérieur n'est pas public (EN 4165-014/-015/-016,
     payantes) : le passage du toron est à confirmer ; la reprise de blindage n'y est pas décrite (l'EN 4165-026 ne la
     donne que pour les monomodules). Sa classe (W, F ou B selon l'accessoire, EN 4165-002 tableau 5) ne se lit pas dans le
     part number : pas de classe EN 3660. */
  if (aCheminee(norme, famille)) { const ref = raccordDeTable(norme, famille, taille, 'cheminée', 'droit'), manquants = [], formeManchon = formeDuManchon(c.orientation, ref);
    const manchon = r.manchon ? manchonPour(norme, sortie, null, formeManchon) : null, tyrap = r.manchon ? null : tyrapPour(norme, f.diametre);
    manquants.push('le Ø intérieur de la cheminée ' + (ref ? ref.norme : 'EN 4165-015') + ' n’est pas public' + (f.diametre != null ? ' : le passage du toron (Ø ' + mm(f.diametre) + ' mm) est à confirmer' : ''));
    if (r.bandit) manquants.push('la reprise de blindage sur une cheminée EN 4165 : non décrite (l’EN 4165-026 ne la donne que pour les monomodules)');
    if (r.manchon && !manchon) manquants.push('aucun manchon ' + formeManchon + ' de la table ne va à Ø ' + (sortie != null ? mm(sortie) + ' mm' : '?'));
    if (r.manchon && manchon) manquants.push('la cote de la cheminée : le manchon est choisi par le toron seulement');
    if (c.gaine && !gaine) manquants.push('aucune gaine ' + c.gaine + ' ne va à ce toron');
    const colle = manchon ? (manchon.precolle ? 'précollé' : 'à coller : VG 95343 T15 (V9500), ou sa version T18 précollée') : '';
    return avecPieces({ ...vide, classe: null, raccord: 'cheminée', cheminee: true, sansRaccord: '', reference: ref, statut: ref ? ref.confiance : '', manchon: r.manchon, manchonRef: manchon, formeManchon: r.manchon ? formeManchon : '', colle, tyrap, gaine, roleGaine, sortie,
             regle: 'cheminée', pourquoi: 'un EN 4165 prend une cheminée par module câblé (EN 4165-015 ronde ; -016 double ovale pour deux modules voisins ; -017 obturateur sur une cavité vide), le toron tenu par ' + (r.manchon ? 'un manchon (étanchéité)' : 'un tyrap') + (r.bandit ? ' — la reprise de blindage n’y est pas décrite' : ''),
             aConfirmer: true, manquants }); }
  const raccord = r.raccord, ref = raccordDeTable(norme, famille, taille, raccord, c.orientation), modele = ref ? ref.reference : '', attendE = /<E>/.test(modele), attendL = /<L>/.test(modele);
  // le code d'entrée : lettré EN 3660 quand la désignation l'attend ; Glenair pour un serre-câble dont la ligne n'a pas de cotes ; rien sinon
  const entree = f.diametre == null ? null : attendE ? entreePour(norme, f.diametre, taille, 'EN 3660') : raccord === 'serre-câble' && !(ref && ref.amax != null) ? entreePour(norme, f.diametre, taille, 'Glenair') : null;
  const designation = designationRaccord(modele, classe.raccord, chambreCode, entree && attendE ? entree.code : '');
  const chambre = attendL ? { ...(chambreDe(norme, ref.norme, chambreCode) || { code: chambreCode, hmax: null, derriere: null }), source: chambreSource } : null;
  const chambreConseil = attendL && chambreCode === LONGUEUR_CHAMBRE && (c.blindage === 'GND' || r.regle === 'surblindage') && blindesUnAUn(f) > 0 ? 'chambre B ou plus conseillée : ' + blindesUnAUn(f) + ' câble' + (blindesUnAUn(f) > 1 ? 's' : '') + ' blindé' + (blindesUnAUn(f) > 1 ? 's' : '') + ' un à un (' + PRATIQUE_CHAMBRE + ')' : '';
  const masse = designation && ref ? masseDeRaccord(norme, ref.norme, taille, attendL ? chambreCode : '', entree && attendE ? entree.code : '', classe.raccord) : null;
  // la bande serre la tresse sur la plateforme ØBB du code retenu (sinon le toron) ; l'E0805 d'atelier se choisit par le toron
  const serre = r.bandit ? (entree && entree.bb != null ? entree.bb : f.diametre) : null, collier = r.bandit ? collierPour(norme, serre, f.diametre) : null, tyrap = raccord === 'tyrap' ? tyrapPour(norme, f.diametre) : null;
  // la cote C : le ØCC du code retenu, sinon celle de la ligne ; le manchon est droit sur un raccord coudé (il fait l'angle)
  const cote = entree && entree.cc != null ? entree.cc : ref && ref.c != null ? ref.c : null, formeManchon = formeDuManchon(c.orientation, ref), manchon = r.manchon ? manchonPour(norme, sortie, cote, formeManchon) : null;
  const colle = manchon ? (manchon.precolle ? 'précollé' : 'à coller : VG 95343 T15 (V9500), ou sa version T18 précollée') : '';
  /* Ce qui manque. Un raccord à collier (« tyrap ») de la table se juge comme les autres : sa désignation (l'EN 3660-013 de
     l'EN 2997 n'a pas de modèle : la norme ne nomme pas sa famille) et son PASSAGE — le toron doit passer dans son alésage
     (cote F de l'EN 3660-025, E du -026) ; une famille sans ligne n'a que son tyrap, sans manque. */
  const manquants = [];
  if (raccord !== 'tyrap' || ref) {
    if (!ref) manquants.push('la référence du raccord (table à compléter' + (famille ? ' pour ' + nomDeFamille(norme, famille) : '') + ')');
    else if (!modele) manquants.push('la désignation complète du raccord (' + ref.norme + ', ' + ref.confiance + ')');
    else if (ref.tailleInconnue) manquants.push('la taille du boîtier ne se lit pas dans le part number' + (pn ? ' ' + pn : '') + ' : la désignation ' + ref.norme + ' reste incomplète');
    else if (attendE && !entree) { const max = entreeMaximale(norme, taille, 'EN 3660');
      manquants.push(f.diametre == null ? 'le code d’entrée du raccord : toron inconnu' : 'toron Ø ' + mm(f.diametre) + ' mm trop gros pour ce boîtier' + (taille ? ' ' + taille : '') + (max ? ' (code ' + max.code + ' au plus : ' + mm(max.dmax) + ' mm)' : '')); }
    // les cotes M d'un serre-câble sont les limites de son collier (EN 3660-005, note b), pas une plage de toron
    else if (f.diametre != null && ref.amax != null && f.diametre > ref.amax) manquants.push(raccord === 'serre-câble' ? 'toron Ø ' + mm(f.diametre) + ' mm : le collier du serre-câble ne s’ouvre pas au-delà de ' + mm(ref.amax) + ' mm (cotes M ' + mm(ref.amin) + '–' + mm(ref.amax) + ' : les limites du collier, pas une plage de toron)'
      : raccord === 'tyrap' ? 'toron Ø ' + mm(f.diametre) + ' mm : il ne passe pas dans le raccord à collier ' + ref.norme + ' (passage ' + mm(ref.amax) + ' mm)' : 'toron Ø ' + mm(f.diametre) + ' mm trop gros pour ce raccord (' + mm(ref.amax) + ' mm au plus)');
    else if (f.diametre != null && ref.amin != null && raccord === 'serre-câble' && f.diametre < ref.amin) manquants.push('toron Ø ' + mm(f.diametre) + ' mm : le collier du serre-câble ne se ferme pas sous ' + mm(ref.amin) + ' mm (cotes M ' + mm(ref.amin) + '–' + mm(ref.amax) + ' : les limites du collier, pas une plage de toron) : bourrage de ruban silicone');
    if (entree && entree.bourrage && attendE) manquants.push('toron Ø ' + mm(f.diametre) + ' mm sous la plage du code ' + entree.code + ' (' + mm(entree.dmin) + '–' + mm(entree.dmax) + ' mm) : bourrage de ruban silicone'); }
  // une ligne dont la clause de désignation n'est pas lue (les -005, -017/-018, -025 à -027 : R3) : la référence construite est un modèle
  // la classe que le connecteur demande doit exister pour la partie (colonne Classes : l'EN 3660-025 n'a que A, N, W ; un connecteur inox demande K)
  if (designation && ref && ref.classes && ref.classes.length && !ref.classes.includes(classe.raccord)) manquants.push('classe ' + classe.raccord + (classe.lettre ? ' (le connecteur est ' + classe.lettre + ', ' + [classe.materiau, classe.fini].filter(Boolean).join(' ') + ')' : '') + ' : l’' + ref.norme.replace(/^EN ?3660/, 'EN 3660') + ' n’existe qu’en classes ' + ref.classes.join(', ') + ' — le fini du raccord est à choisir');
  if (designation && ref && MODELE_SEUL.test((ref.statut || '') + ' ' + (ref.note || ''))) manquants.push('la clause de désignation de l’' + ref.norme.replace(/^EN ?3660/, 'EN 3660') + ' n’est pas lue : ' + designation + ' est un modèle (suffixes à confirmer)');
  if (r.manchon && !manchon) manquants.push('aucun manchon ' + formeManchon + ' de la table ne va à Ø ' + (sortie != null ? mm(sortie) + ' mm' : '?') + (cote != null ? ' sur un épaulement Ø ' + mm(cote) + ' mm' : ''));
  if (r.manchon && manchon && cote == null) manquants.push('la cote C du raccord : le manchon est choisi par le toron seulement');
  if (c.gaine && !gaine) manquants.push('aucune gaine ' + c.gaine + ' ne va à ce toron');
  if (r.bandit && !collier) manquants.push('aucun collier ne va à ce toron');
  return avecPieces({ ...vide, raccord, sansRaccord: '', reference: ref, designation, longueur: attendL ? chambreCode : '', chambre, chambreConseil, entree, cote, bandit: r.bandit, manchon: r.manchon, manchonRef: manchon, formeManchon: r.manchon ? formeManchon : '', colle, collier, serre, tyrap, gaine, roleGaine, sortie,
           statut: ref ? ref.confiance : '', masse, couple: ref && ref.couple != null ? ref.couple : null, regle: r.regle, pourquoi: r.pourquoi, aConfirmer: false, bourrage: manquants.find(m => /bourrage/.test(m)) || '', manquants }); }
