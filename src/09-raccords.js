/* ===========================================================================
   09 ter — LES RACCORDS : ce qui englobe un connecteur
   ---------------------------------------------------------------------------
   Le tutoriel du lecteur, en sept pas : le matériau, le diamètre du toron
   (avec une marge de 10 %), le connecteur, le RACCORD, la GAINE, le MANCHON,
   le COLLIER band-it. Ce que l'outil fait de chaque connecteur :
     · le TORON : les câbles du connecteur (la base des câbles), la section
       cumulée, le diamètre équivalent, plus 10 % ;
     · le CHOIX, par la table du tutoriel : reprise de blindage (GND sur le
       corps, BLI par cosse, NO, CONTACT) × étanchéité × gaine — un raccord
       durci par défaut, un tyrap sans reprise ni étanchéité, un serre-câble
       pour une cosse à l'étroit, « pour manchon » droit en zone étanche sans
       reprise ; un band-it tient la tresse reprise sur le corps ; un manchon
       quand il faut l'étanchéité. L'EN 3645 s'utilise sans raccord ;
     · le collier par le diamètre (E0805-01 sous 15 mm), la gaine par son
       intérieur (normes/raccords.csv). Les références des raccords et des
       manchons VG95343T18 attendent leurs tables.
   Rien ici ne touche à la page : le moteur, comme 09.
   =========================================================================== */
'use strict';

const BLINDAGES = { NO: 'aucune reprise de blindage', GND: 'reprise sur le corps du connecteur', BLI: 'reprise par cosse', CONTACT: 'reprise sur un contact' };
const MATERIAUX = ['nickelage alu', 'cadmiage vert olive', 'passivation acier inox', 'anodisation alu noir'];
const CHOIX_RACCORD = { blindage: 'NO', etanche: false, orientation: 'droit', gaine: '', surblindage: false, materiau: '' };
const SANS_RACCORD = ['EN3645'];   // le tutoriel : l'EN 3645 s'utilise sans raccord
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
/* Le collier et la gaine qui vont au toron. */
function collierPour(norme, d) { const C = (normeDesModules(norme).colliers || []); if (d == null) return null;
  return C.find(c => (c.dmin == null || d > c.dmin) && (c.dmax == null || d <= c.dmax)) || null; }
function gainePour(norme, famille, d) { const G = (normeDesModules(norme).gaines || []).filter(g => !famille || g.famille === cleNorme(famille)); if (d == null) return null;
  return G.filter(g => g.dint != null && g.dint > d).sort((a, b) => a.dint - b.dint)[0] || null; }
/* L'HABILLAGE d'un connecteur : le toron, le choix du tutoriel, le collier, la gaine, le manchon. `pn` : le part
   number du connecteur, dont la norme compte (EN 3645 : sans raccord). */
function habillage(norme, fils, choix, pn) { const c = { ...CHOIX_RACCORD, ...(choix || {}) }, f = faisceauDe(norme, fils), famille = familleDeReference(norme, pn, 'connecteur');
  const r = regleRaccord(c), sans = SANS_RACCORD.includes(famille);
  const collier = r.bandit ? collierPour(norme, f.diametre) : null, gaine = c.gaine ? gainePour(norme, c.gaine, f.diametre) : null;
  return { choix: c, toron: f.diametre, deq: f.deq, faisceau: f, famille, raccord: sans ? 'aucun' : r.raccord, bandit: r.bandit, manchon: r.manchon, collier, gaine,
           pourquoi: sans ? 'un connecteur EN 3645 s’utilise sans raccord' : r.pourquoi, manquants: [...(!sans && r.raccord !== 'tyrap' ? ['la référence du raccord (table à venir)'] : []), ...(r.manchon ? ['la référence du manchon VG95343T18 (table à venir)'] : []), ...(c.gaine && !gaine ? ['aucune gaine ' + c.gaine + ' ne passe ce toron'] : [])] }; }
