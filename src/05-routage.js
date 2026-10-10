/* ===========================================================================
   05 — LE ROUTAGE
   Les blocs sont posés ; il reste à tracer les fils. Un fil dont les deux
   bornes sont à la même ordonnée et dont le couloir est libre part tout
   droit. Les autres passent par les GOULOTTES verticales entre colonnes :
   chaque fil y reçoit une VERTICALE (un « travail »), reliée aux parois par
   ses horizontales. Dans une goulotte, seul l'ORDRE des verticales décide
   des croisements entre elles : c'est un problème d'ordre linéaire, résolu
   exactement (petites goulottes) ou par recherche locale.
   Plusieurs fils sur une même borne, du même côté, partagent une verticale
   courte au ras de la borne — le PIQUAGE — d'où chaque fil repart droit.
   Le piquage est une verticale comme les autres pour l'ordre des pistes.

   Contrat de sortie, lu par le dessin :
     fils[].pts          le tracé complet, de borne à borne
     fils[].retouche     sur un dessin retouché, ce que la main a demandé à ce fil : 'tenue' ou 'refusee'
     barrettes[]         les barrettes à poser { x, y1, y2, py, bornes:[{y, li}], propre, etiquette }
     barrettes.raccords  le trait de la borne au piquage { x0, x1, y }
     piquages[]          les points de départ sur les piquages
     points[]            les jonctions : un fil qui quitte le fil d'un autre
   =========================================================================== */
'use strict';

const PISTE = 9;            // entre deux verticales voisines d'une goulotte
const RETRAIT = 14;         // de la paroi à la première verticale : la longueur d'un raccord
const ECART_VERT = 10;      // deux verticales sur la même piste se lisent séparées
const NMAX_EXACT = 12;      // au-delà, l'ordre des pistes se cherche par déplacements
const INTERDIT = 1e6;       // le coût d'un ordre impossible
/* Deux fils de nets différents sur un même trait, c'est une connexion qui
   n'existe pas : pire qu'un ordre impossible (qui ne fait que passer un fil
   devant le porteur de sa borne — même potentiel). Deux attaches à la même
   hauteur vers des parois opposées se séparent TOUJOURS par l'ordre des
   pistes : la verticale attachée à gauche à gauche de l'autre ; ça ne coûte
   que les croisements que l'entrelacement des bouts impose de toute façon —
   un pont est un élément normal, une marche ne l'est pas. */
const SUPERPOSE = 3e6;
/* Une MARCHE : un segment de quelques unités entre deux angles — un fil est
   droit, fait UN Z propre (une verticale, deux vrais angles droits), ou un U
   par un couloir ; jamais un escalier. Un couloir se pose à Z_MIN au moins
   des bornes qu'il relie (plus qu'un pas de borne : il ne tombe pas sur la
   ligne de la borne voisine), une verticale de détour fait Z_MIN. Le juge
   et le banc comptent les marches (`compterMarches`) : un segment de moins
   de MARCHE entre deux angles, deux verticales d'un fil à moins de 2·MARCHE. */
const MARCHE = 12, Z_MIN = 16;
/* Le DÉGAGEMENT : un fil qui longe un équipement étranger à moins de seize unités de son bord (un pas de borne, et ce
   qu'il faut pour que l'œil les sépare) le FRÔLE — il se lit comme s'il y entrait (le lecteur : « il frôle quand même
   300XC1 », à dix unités ; « il colle vraiment à 431PR1 », à six). C'est le juge qui les compte (`compterFrolements`) et
   le placement qui les écarte : le routeur qui posait ses corridors plus loin pour les éviter réservait d'autres places
   et croisait davantage (un cas à trois calculateurs : 2 croisements → 8). Une verticale de goulotte, posée à RETRAIT
   de la paroi, ne frôle qu'en deçà de DEGAGEMENT_V. */
const DEGAGEMENT = 16, DEGAGEMENT_V = 10;

/* Les NETS : deux bornes reliées par un fil ou un shunt sont un même
   potentiel ; deux fils d'un même net peuvent se toucher (les départs d'un
   piquage), deux fils de nets différents jamais. Rend li -> net. */
function netsDe(links) {
  const chef = new Map(); const trouver = k => { while (chef.has(k) && chef.get(k) !== k) k = chef.get(k); return k; };
  const bornes = l => [String(l.de) + ':' + String(l.borneDe), String(l.vers) + ':' + String(l.borneVers)];
  links.forEach(l => { const [a, b] = bornes(l); const ra = trouver(a), rb = trouver(b);
    if (!chef.has(ra)) chef.set(ra, ra); if (!chef.has(rb)) chef.set(rb, rb); if (ra !== rb) chef.set(rb, ra); });
  return li => trouver(bornes(links[li])[0]);
}

/* Un tracé ne repasse pas sur ses pas : les points doublés et les
   allers-retours sur une même ligne (a → b → c avec b au-delà de a et c)
   disparaissent, le segment reste. Un point aligné entre deux autres reste :
   il marque une jonction. */
function simplifier(pts) {
  const out = [];
  pts.forEach(q => { const a = out[out.length - 2], b = out[out.length - 1];
    if (b && Math.abs(b.x - q.x) < 0.3 && Math.abs(b.y - q.y) < 0.3) return;
    if (a && b) { const horiz = Math.abs(a.y - b.y) < 0.3 && Math.abs(b.y - q.y) < 0.3, vert = Math.abs(a.x - b.x) < 0.3 && Math.abs(b.x - q.x) < 0.3;
      if (horiz && (b.x - a.x) * (q.x - b.x) < 0) { out.pop(); if (Math.abs(a.x - q.x) < 0.3) return; }
      else if (vert && (b.y - a.y) * (q.y - b.y) < 0) { out.pop(); if (Math.abs(a.y - q.y) < 0.3) return; } }
    out.push(q); });
  return out;
}

/* ---- la géométrie des goulottes ---------------------------------------- */
function goulottes(layout) {
  const g = layout.geom, blocs = layout.comps;
  const x0 = ch => ch === 0 ? (g.colX.length ? g.colX[0] - g.chW[0] : 70) : g.colX[ch - 1] + g.colW[ch - 1];
  const x1 = ch => x0(ch) + g.chW[ch];
  /* un segment horizontal passe s'il ne traverse aucun bloc étranger ; sur un dessin RETOUCHÉ (`geom.libre`, voir
     `preparerPose`), aucun bloc du tout : un bloc posé à la main peut tourner le dos à son partenaire, et l'horizontale
     qui partirait de l'autre flanc le traverserait — le fil le contourne par un couloir. Une horizontale qui part d'une
     borne vers le dehors ne touche jamais son propre bloc (les marges de deux unités). */
  const tous = !!g.libre;
  const couloirLibre = (xa, xb, y, exclus) => { if (xa > xb) { const t = xa; xa = xb; xb = t; }
    return !blocs.some(c => (tous || !exclus.has(c.name)) && xb > c.x + 1 && xa < c.x + c.w - 1 && y > c.y - 3 && y < c.y + c.h + 3); };
  // un segment vertical passe s'il ne traverse aucun bloc étranger
  const verticaleLibre = (x, ya, yb, exclus) => { if (ya > yb) { const t = ya; ya = yb; yb = t; }
    return !blocs.some(c => !exclus.has(c.name) && x > c.x - 3 && x < c.x + c.w + 3 && yb > c.y + 1 && ya < c.y + c.h - 1); };
  // les blocs qui vivent DANS une goulotte (pastilles collées à un flanc)
  const dedans = ch => blocs.filter(c => c.x + c.w > x0(ch) + 2 && c.x < x1(ch) - 2);
  /* les BANDES d'ordonnées qu'aucun corridor ne traverse entre deux abscisses (les mêmes marges que couloirLibre, sans
     exclusion) : triées, fondues quand elles se recouvrent, calculées une fois par paire d'abscisses — un balayage de
     corridors saute d'une bande à l'autre au lieu d'interroger chaque bloc à chaque pas */
  const cache = new Map();
  const bandes = (xa, xb) => { const k = xa + '|' + xb; let B = cache.get(k); if (B) return B;
    const iv = blocs.filter(c => xb > c.x + 1 && xa < c.x + c.w - 1).map(c => [c.y - 3, c.y + c.h + 3]).sort((u, v) => u[0] - v[0]); B = [];
    iv.forEach(([a, b]) => { const d = B[B.length - 1]; if (d && a < d[1]) d[1] = Math.max(d[1], b); else B.push([a, b]); });
    cache.set(k, B); return B; };
  // la bande qui contient y (ouverte aux deux bouts), ou rien
  const bande = (B, y) => { let a = 0, b = B.length; while (a < b) { const m = (a + b) >> 1; if (B[m][0] < y) a = m + 1; else b = m; }
    return a > 0 && y < B[a - 1][1] ? B[a - 1] : null; };
  // la goulotte qui contient l'abscisse x (entre ses parois), ou -1 : une consigne de la main y vise une verticale
  const chDe = x => { for (let ch = 0; ch <= g.nCols; ch++) if (x > x0(ch) + 0.5 && x < x1(ch) - 0.5) return ch; return -1; };
  return { n: g.nCols + 1, x0, x1, couloirLibre, verticaleLibre, dedans, bandes, bande, chDe, yMin: g.yMin, yMax: g.yMax, libre: tous };
}
/* ---- LES CONSIGNES : ce que la main impose au routage d'un dessin retouché ----
   `geom.consignes` — absent d'un dessin automatique, où rien de ce qui suit ne joue :
     fils        [{ li, y?, xs? }]   le fil n° li : son COULOIR à la hauteur y (à la hauteur d'une de ses bornes, il y part
                                     droit) ; ses VERTICALES aux abscisses xs, une par goulotte — dans une goulotte où il
                                     ne passait pas, il y passe (le détour par une goulotte voisine, `formeParGoulotte`)
     barrettes   [{ cle, d }]        la barrette à poser de la borne `cle` (repère␁borne) : sa ligne à d de sa borne, dans
                                     sa goulotte — elle suit la borne quand le bloc bouge
   Le routeur les tient quand il le peut, sans jamais rien céder de ses règles (pas d'oblique, pas de fil dans un bloc, pas
   de fil partagé) ; sinon il route comme d'habitude. Le fil sorti le dit : `retouche` 'tenue' ou 'refusee'. Une
   verticale imposée se range par son abscisse parmi celles qu'elle chevauche (`ordreImpose`). */
function lireConsignes(geom) { const C = geom && geom.consignes; if (!C) return null;
  const fils = new Map((C.fils || []).map(k => [k.li, k])), barrettes = new Map((C.barrettes || []).map(k => [k.cle, k.d]));
  return fils.size || barrettes.size ? { fils, barrettes } : null; }
const cleDeBarrette = b => b.propre + '\u0001' + b.etiquette;
/* Le premier point de la grille y0 + k·pas qui vaut au moins v. */
const surLaGrille = (y0, pas, v) => y0 + Math.ceil((v - y0) / pas - 1e-9) * pas;

/* ---- la forme de chaque fil ---------------------------------------------
   Un fil est repéré par ses deux bouts A et B ; `ch` est la goulotte où le
   bout regarde, `mur` la paroi de cette goulotte où il est ('L' : paroi
   gauche, la borne est sur le flanc droit d'un bloc). Chaque forme se
   décrit par des TRAVAUX : une verticale par goulotte traversée, avec ses
   deux attaches { y, mur } aux parois — `paire` les garde pour le tracé,
   `att` sont celles qui comptent pour les croisements. */
const murDe = ep => ep.stub === 'L' ? 'L' : 'R';
const cle = (li, tag) => li + ':' + tag;
const travail = (ch, a0, a1, blocs) => ({ ch, att: [a0, a1], paire: [a0, a1], blocs, contraintes: [] });

function formerLesFils(layout, G, permis, C) {
  const fils = new Map();                     // li -> { forme, A, B, travaux, chez }
  const consigne = li => (C && C.fils.get(li)) || null;
  const candidats = [];                       // fils qu'un détour par une goulotte voisine pourrait soulager
  const barrieres = Array.from({ length: G.n }, () => []);   // horizontales de paroi à paroi, par goulotte
  const couloirsPris = [];                    // corridors à travers une colonne : { y, xa, xb }
  const pris = (xa, xb, y) => couloirsPris.some(m => Math.abs(m.y - y) < 8 && xb > m.xa - 7 && xa < m.xb + 7);
  const prendre = (xa, xb, y) => couloirsPris.push({ y, xa, xb });
  /* les hauteurs des bornes sur les parois de chaque goulotte : un couloir ne s'y pose pas — à la hauteur d'une borne d'en
     face, son horizontale et celle de la borne sont sur la même ligne, et se lisent comme un seul fil */
  const parois = Array.from({ length: G.n }, () => new Set());
  layout.links.forEach(l => { if (l.boucle || l.shunt) return; [l.epA, l.epB].forEach(ep => parois[ep.ch].add(Math.round(ep.y * 2))); });
  const surUneBorne = (ch, y) => parois[ch].has(Math.round(y * 2));
  const exclusDe = l => new Set([String(l.de), String(l.vers)]);
  const bouts = li => { const l = layout.links[li]; let A = { ...l.epA, tag: 'A' }, B = { ...l.epB, tag: 'B' };
    if (A.ch > B.ch || (A.ch === B.ch && murDe(A) === 'R' && murDe(B) === 'L')) { const t = A; A = B; B = t; }
    return [A, B]; };
  // 1) les fils droits, d'abord : ce sont les barrières de tout le reste — dans les goulottes qu'ils traversent de part
  //    en part (le fil d'une pastille reste dans la zone de sa colonne : il ne barre rien)
  layout.links.forEach((l, li) => { if (l.boucle || l.shunt) return;
    const [A, B] = bouts(li); if (Math.abs(A.y - B.y) > 0.75) return;
    // la main l'a plié : un couloir à une autre hauteur, une verticale quelque part
    const k = consigne(li); if (k && (k.y != null ? Math.abs(k.y - A.y) > 0.5 : !!(k.xs && k.xs.length))) return;
    const dr = murDe(A) === 'L' && murDe(B) === 'R';                       // A regarde à droite, B à gauche
    if (!dr || !G.couloirLibre(A.x + 2, B.x - 2, A.y, exclusDe(l))) return;
    fils.set(li, { forme: 'droit', A, B, travaux: [], chez: {} });
    for (let ch = A.ch; ch <= B.ch; ch++) if (A.x <= G.x0(ch) + 1 && B.x >= G.x1(ch) - 1) barrieres[ch].push(A.y);
    if (A.ch < B.ch) prendre(G.x1(A.ch), G.x0(B.ch), A.y); });
  // combien de barrières une verticale de la goulotte `ch` enjambe entre deux ordonnées (barrières triées, dichotomie)
  barrieres.forEach(B => B.sort((u, v) => u - v));
  const avant = (B, v) => { let a = 0, b = B.length; while (a < b) { const m = (a + b) >> 1; if (B[m] < v) a = m + 1; else b = m; } return a; };
  const coupe = (ch, ya, yb) => { const B = barrieres[ch], lo = Math.min(ya, yb), hi = Math.max(ya, yb); return Math.max(0, avant(B, hi - 0.5) - avant(B, lo + 0.5 + 1e-9)); };
  /* 2) les autres, par la forme qui croise le moins de barrières — ceux que la main a réglés d'abord : ils prennent leur
        couloir avant que les autres ne cherchent le leur */
  const ordre = [...layout.links.keys()]; if (C) ordre.sort((a, b) => !!consigne(b) - !!consigne(a));
  ordre.forEach(li => { const l = layout.links[li]; if (l.boucle || l.shunt || fils.has(li)) return;
    const [A, B] = bouts(li), K = { G, coupe, pris, surUneBorne, ex: exclusDe(l), li, A, B, mA: murDe(A), mB: murDe(B) }, k = consigne(li);
    const choix = formesDirectes(K);
    /* un passage par une goulotte voisine ne se cherche que si le direct
       coûte ; il n'est pris que s'il est PERMIS — le routeur l'essaie pour de
       vrai, car l'estimation ne voit que les fils droits */
    if (!choix.length || choix[0].cout >= 4) { const detours = formesParDetour(K).sort((u, v) => u.cout - v.cout);
      if (detours.length && (!choix.length || detours[0].cout <= choix[0].cout - 2)) {
        if (permis.has(li)) choix.push(detours[0]); else candidats.push({ li, gain: (choix.length ? choix[0].cout : 20) - detours[0].cout }); } }
    choix.sort((u, v) => u.cout - v.cout);
    const auto = choix[0] || { forme: 'detour', travaux: [travail(A.ch, K.attache(A, K.mA), K.libre(null, 'R'), K.ex), travail(B.ch, K.libre(null, 'L'), K.attache(B, K.mB), K.ex)] };
    const impose = k ? formeImposee(K, k, choix, auto) : null, f = impose || auto;
    (f.corridors || []).forEach(([xa, xb, y]) => prendre(xa, xb, y));
    fils.set(li, { forme: f.forme, A, B, chez: {}, travaux: f.travaux, y: f.y, ...(k ? { consigne: k, tenue: !!impose } : {}) }); });
  fils.candidats = candidats.sort((u, v) => v.gain - u.gain).map(c => c.li);
  return fils;
}
/* La forme que la MAIN impose à un fil (sa consigne `k`), ou rien si elle ne tient pas — le fil prend alors la sienne.
   · un couloir à la hauteur k.y : à la hauteur de sa borne gauche (qui regarde à droite), le fil en part droit et plonge
     dans la goulotte d'arrivée ; à celle de sa borne droite, l'inverse ; ailleurs, un Z dans chaque goulotte — à Z_MIN au
     moins des bornes, hors des bandes des blocs, ni à la hauteur d'une borne des parois, ni sur le couloir d'un autre ;
   · des verticales aux abscisses k.xs : dans une goulotte où ni l'une ni l'autre de ses bornes ne regarde, le fil y passe
     (`formeParGoulotte`) ; sinon, sa forme (`auto`) si elle passe par toutes ces goulottes, ou la moins chère des formes
     (`choix`) qui y passe. Les abscisses elles-mêmes, ce sont les pistes qui les tiennent (`ordreImpose`). */
function formeImposee(K, k, choix, auto) {
  const { G, pris, surUneBorne, ex, li, A, B, mA, mB } = K, att = K.attache, libre = K.libre;
  if (k.y != null) { const y = k.y, pres = v => Math.abs(y - v) < 0.5;
    if (A.ch === B.ch) return null;
    if (pres(A.y) && mA === 'L' && G.couloirLibre(A.x + 2, G.x0(B.ch) + 2, A.y, ex) && !pris(G.x1(A.ch), G.x0(B.ch), A.y))
      return { forme: 'arrivee', corridors: [[G.x1(A.ch), G.x0(B.ch), A.y]], travaux: [travail(B.ch, { y: A.y, mur: 'L', bout: cle(li, A.tag) }, att(B, mB), ex)] };
    if (pres(B.y) && mB === 'R' && G.couloirLibre(G.x1(A.ch) - 2, B.x - 2, B.y, ex) && !pris(G.x1(A.ch), G.x0(B.ch), B.y))
      return { forme: 'depart', corridors: [[G.x1(A.ch), G.x0(B.ch), B.y]], travaux: [travail(A.ch, att(A, mA), { y: B.y, mur: 'R', bout: cle(li, B.tag) }, ex)] };
    if (!vraiZ(y, A.y) || !vraiZ(y, B.y) || surUneBorne(A.ch, y) || surUneBorne(B.ch, y)) return null;
    if (G.bande(G.bandes(G.x0(A.ch) + 2, G.x1(B.ch) - 2), y) || pris(G.x1(A.ch), G.x0(B.ch), y)) return null;
    return { forme: 'couloir', y, corridors: [[G.x1(A.ch), G.x0(B.ch), y]], travaux: [travail(A.ch, att(A, mA), libre(y, 'R'), ex), travail(B.ch, libre(y, 'L'), att(B, mB), ex)] }; }
  const chs = (k.xs || []).map(G.chDe).filter(ch => ch >= 0); if (!chs.length) return null;
  const ailleurs = chs.find(ch => ch !== A.ch && ch !== B.ch);
  if (ailleurs != null) return formeParGoulotte(K, ailleurs, true);
  const couvre = f => chs.every(ch => f.travaux.some(t => t.ch === ch));
  return couvre(auto) ? auto : choix.find(couvre) || null;
}
/* Un couloir à hauteur y fait-il un vrai Z depuis une borne à hauteur yb ?
   Oui s'il est à Z_MIN au moins — jamais une marche de quelques unités. */
const vraiZ = (y, yb) => Math.abs(y - yb) >= Z_MIN - 1e-9;
/* Les formes DIRECTES d'un fil plié : dans sa goulotte (même goulotte),
   droit puis verticale à l'arrivée, verticale au départ puis droit, ou un
   corridor entre les deux avec un Z dans chaque goulotte. Le coût d'une forme
   est le nombre de fils droits que ses verticales enjambent. */
function formesDirectes(K) {
  const { G, coupe, pris, surUneBorne, ex, li, A, B, mA, mB } = K;
  K.attache = (ep, mur) => ({ y: ep.y, mur, bout: cle(li, ep.tag) });
  K.libre = (y, mur) => ({ y, mur, bout: null });
  const att = K.attache, libre = K.libre, choix = [];
  if (A.ch === B.ch) return [{ forme: 'meme', cout: coupe(A.ch, A.y, B.y), travaux: [travail(A.ch, att(A, mA), att(B, mB), ex)] }];
  if (mA === 'L' && G.couloirLibre(A.x + 2, G.x0(B.ch) + 2, A.y, ex) && !pris(G.x1(A.ch), G.x0(B.ch), A.y))
    choix.push({ forme: 'arrivee', cout: coupe(B.ch, A.y, B.y), corridors: [[G.x1(A.ch), G.x0(B.ch), A.y]], travaux: [travail(B.ch, { y: A.y, mur: 'L', bout: cle(li, A.tag) }, att(B, mB), ex)] });
  if (mB === 'R' && G.couloirLibre(G.x1(A.ch) - 2, B.x - 2, B.y, ex) && !pris(G.x1(A.ch), G.x0(B.ch), B.y))
    choix.push({ forme: 'depart', cout: coupe(A.ch, A.y, B.y), corridors: [[G.x1(A.ch), G.x0(B.ch), B.y]], travaux: [travail(A.ch, att(A, mA), { y: B.y, mur: 'R', bout: cle(li, B.tag) }, ex)] });
  // le corridor traverse des colonnes entières, celles des deux blocs comprises : rien n'en est exclu — le balayage saute les bandes de blocs ;
  // il passe à Z_MIN au moins des deux bornes : à leur hauteur, c'est une arrivée ou un départ, plus près c'est une marche
  const lo = Math.min(A.y, B.y), hi = Math.max(A.y, B.y), bandes = G.bandes(G.x0(A.ch) + 2, G.x1(B.ch) - 2); let meilleur = null;
  const y0 = Math.max(G.yMin - 12, lo - 240), yFin = Math.min(G.yMax + 12, hi + 240);
  for (let y = y0; y <= yFin; y += 4) {
    const b = G.bande(bandes, y); if (b) { y = surLaGrille(y0, 4, b[1]) - 4; continue; }
    if (!vraiZ(y, A.y) || !vraiZ(y, B.y) || surUneBorne(A.ch, y) || surUneBorne(B.ch, y)) continue;
    const c = coupe(A.ch, A.y, y) + coupe(B.ch, y, B.y) + 0.5 + 0.0005 * Math.abs(y - (lo + hi) / 2) + (y < lo || y > hi ? 0.4 : 0);
    if (meilleur && c >= meilleur.cout) continue;
    if (pris(G.x1(A.ch), G.x0(B.ch), y)) continue;
    meilleur = { forme: 'couloir', cout: c, y }; }
  if (meilleur) choix.push({ ...meilleur, corridors: [[G.x1(A.ch), G.x0(B.ch), meilleur.y]], travaux: [travail(A.ch, att(A, mA), libre(meilleur.y, 'R'), ex), travail(B.ch, libre(meilleur.y, 'L'), att(B, mB), ex)] });
  return choix.sort((u, v) => u.cout - v.cout);
}
/* Les formes PAR DÉTOUR : le fil sort de sa goulotte par un corridor, descend
   une goulotte voisine (à gauche ou à droite, une ou deux colonnes plus
   loin) et revient par un second corridor. Ça vaut quand la goulotte du fil
   est barrée de fils droits que la voisine n'a pas. */
function formesParDetour(K) { const { A, B, G } = K, choix = [];
  [-1, -2, 1, 2].forEach(d => { const v = d < 0 ? A.ch + d : B.ch + d; if (v < 0 || v >= G.n) return; const f = formeParGoulotte(K, v); if (f) choix.push(f); });
  return choix;
}
/* Le passage du fil par la goulotte v, ni la sienne ni celle de son partenaire : un corridor de sa goulotte à v, la
   verticale dans v, un corridor de v à celle de son partenaire. À gauche de ses deux goulottes, ou à droite : le détour
   par une voisine ; entre les deux (la main seule l'y met), un corridor de plus qu'un couloir. Ou rien. `main` : c'est
   la main qui l'y met — le fil évite alors de se croiser lui-même (ses deux corridors pris dans la hauteur d'une de ses
   verticales), ce que le moteur, qui ne compte que les fils droits enjambés, ne regarde pas. */
function formeParGoulotte(K, v, main) {
  const { G, coupe, pris, surUneBorne, ex, A, B, mA, mB } = K, att = K.attache, libre = K.libre;
  const PORTEE = 160, PAS = 8;      // un corridor traverse des colonnes entières, celle du bloc du fil comprise : rien n'en est exclu
  const corridorsPres = (ch0, ch1, yc) => { const out = [], xa = Math.min(G.x0(ch0), G.x0(ch1)) + 2, xb = Math.max(G.x1(ch0), G.x1(ch1)) - 2;
    const xc = Math.min(G.x1(ch0), G.x1(ch1)), xd = Math.max(G.x0(ch0), G.x0(ch1)), bandes = G.bandes(xa, xb);
    const y0 = Math.max(G.yMin - 12, yc - PORTEE), yFin = Math.min(G.yMax + 12, yc + PORTEE);
    for (let y = y0; y <= yFin; y += PAS) { const b = G.bande(bandes, y); if (b) { y = surLaGrille(y0, PAS, b[1]) - PAS; continue; }
      if (!pris(xc, xd, y) && !((surUneBorne(ch0, y) || surUneBorne(ch1, y)) && Math.abs(y - yc) > 0.5)) out.push(y); }
    return out; };
  // un corridor à la hauteur de sa borne (le fil y entre droit), ou à Z_MIN au moins ; entre les deux, une marche
  const gauche = v < A.ch, droite = v > B.ch, loin = gauche ? A.ch - v : droite ? v - B.ch : 1;
  const c1s = corridorsPres(A.ch, v, A.y).filter(y => Math.abs(y - A.y) < 0.5 || vraiZ(y, A.y)), c2s = corridorsPres(v, B.ch, B.y).filter(y => Math.abs(y - B.y) < 0.5 || vraiZ(y, B.y));
  if (!c1s.length || !c2s.length) return null;
  const dans = (y, a, b) => y > Math.min(a, b) + 0.5 && y < Math.max(a, b) - 0.5;
  const soi = (c1, c2) => A.ch === B.ch ? Math.max(Math.min(A.y, c1), Math.min(c2, B.y)) < Math.min(Math.max(A.y, c1), Math.max(c2, B.y)) - 0.5
    : gauche ? dans(c2, A.y, c1) : droite ? dans(c1, c2, B.y) : false;
  let meilleur = null;
  c1s.forEach(c1 => c2s.forEach(c2 => { if (!vraiZ(c1, c2)) return;
    const c = coupe(A.ch, A.y, c1) + coupe(v, c1, c2) + coupe(B.ch, c2, B.y) + 1.5 + 0.5 * (loin - 1) + 0.0005 * (Math.abs(c1 - A.y) + Math.abs(c2 - B.y)) + (main && soi(c1, c2) ? 10 : 0);
    if (!meilleur || c < meilleur.cout) meilleur = { cout: c, c1, c2 }; }));
  if (!meilleur) return null; const { c1, c2 } = meilleur;
  // par où le fil quitte sa goulotte, où il s'accroche dans v (en entrant, en sortant), par où il entre dans celle de son partenaire
  const sortie = gauche ? 'L' : 'R', p1 = gauche ? 'R' : 'L', p2 = droite ? 'L' : 'R', entree = droite ? 'R' : 'L';
  const xc1 = [Math.min(G.x1(A.ch), G.x1(v)), Math.max(G.x0(A.ch), G.x0(v)), c1], xc2 = [Math.min(G.x1(v), G.x1(B.ch)), Math.max(G.x0(v), G.x0(B.ch)), c2];
  return { forme: 'voisine', cout: meilleur.cout, corridors: [xc1, xc2],
    travaux: [travail(A.ch, att(A, mA), libre(c1, sortie), ex), travail(v, libre(c1, p1), libre(c2, p2), ex), travail(B.ch, libre(c2, entree), att(B, mB), ex)] };
}

/* Les DÉTOURS : un fil qui ne trouve aucun corridor passe au-dessus (ou
   au-dessous) de tout le dessin, sur un niveau à lui ; les portées courtes
   passent au plus près, les longues par-dessus, pour ne pas se croiser. */
function poserLesDetours(fils, G) {
  const dets = [...fils.values()].filter(f => f.forme === 'detour');
  const parLeHaut = f => (f.A.y - G.yMin) + (f.B.y - G.yMin) <= (G.yMax - f.A.y) + (G.yMax - f.B.y);
  const niveaux = { haut: [], bas: [] };
  dets.map(f => ({ f, xa: G.x0(f.A.ch), xb: G.x1(f.B.ch) })).sort((u, v) => (u.xb - u.xa) - (v.xb - v.xa)).forEach(({ f, xa, xb }) => {
    const cote = parLeHaut(f) ? 'haut' : 'bas', N = niveaux[cote]; let t = 0;
    while (N[t] && N[t].some(([a, b]) => !(xb < a - 7 || xa > b + 7))) t++;
    (N[t] || (N[t] = [])).push([xa, xb]);
    f.y = cote === 'haut' ? G.yMin - 30 - t * PISTE : G.yMax + 30 + t * PISTE;
    f.travaux.forEach(t2 => t2.paire.forEach(a => { if (a.y == null) a.y = f.y; })); });
}

/* ---- les piquages : les barrettes à poser ------------------------------------
   Plusieurs fils sur une même borne, du même côté : c'est une BARRETTE À POSER (01), que le routage pose au ras de la
   borne, à RETRAIT de la paroi — une verticale, UNE BORNE PAR FIL, chacune à sa hauteur (le lecteur : « tu ne peux pas
   mettre 2 et 3 au même niveau, il faut que ce soit décalé »). Le RACCORD, de la borne à la barrette, est la borne 1.
   Un fil qui peut repartir droit de la barrette vers sa destination en PART : sa verticale se confond avec celle de la
   barrette, sa borne est à la hauteur de sa destination. Un fil qui ne le peut pas — un fil droit, dont la destination
   est à la hauteur de la borne même ; un fil dont la hauteur est déjà prise ; un fil que la goulotte barre — reçoit une
   borne à lui, à un pas de la borne, et REJOINT sa hauteur par une verticale à lui, au-delà de la barrette : un Z. Le
   juge ne le compte pas droit ; le placement peut alors décaler sa destination d'un pas pour le redresser.
   La barrette est une verticale comme les autres pour l'ordre des pistes ; les verticales de ses fils décalés restent
   au-delà d'elle, jamais entre elle et la paroi. */
const PAS_VT = 14, ECART_VT = 10;   // le pas des bornes d'une barrette à poser ; deux bornes se lisent séparées à dix
function formerLesPiquages(layout, fils, G) {
  const groupes = new Map();
  fils.forEach((f, li) => [f.A, f.B].forEach(ep => { const k = Math.round(ep.x) + ',' + Math.round(ep.y) + ',' + ep.stub;
    (groupes.get(k) || groupes.set(k, []).get(k)).push({ li, tag: ep.tag, ep }); }));
  /* sur un dessin retouché (G.libre), les hauteurs des bornes de chaque paroi : une borne de barrette ne s'y pose pas — le
     fil de la borne voisine passe là, et les deux traits n'en feraient qu'un (le placement automatique n'y tombe jamais) */
  const parois = new Map();
  if (G.libre) fils.forEach((f, li) => [f.A, f.B].forEach(ep => { const k = ep.ch + murDe(ep); (parois.get(k) || parois.set(k, []).get(k)).push({ y: ep.y, li }); }));
  const piquages = [];
  groupes.forEach((entrees, k) => { if (entrees.length < 2) return;
    const ep = entrees[0].ep, mur = murDe(ep), loin = mur === 'L' ? 'R' : 'L', ch = ep.ch, bx = mur === 'L' ? G.x0(ch) + RETRAIT : G.x1(ch) - RETRAIT;
    const l0 = layout.links[entrees[0].li], propre = String(entrees[0].tag === 'A' ? l0.de : l0.vers), etiquette = String(entrees[0].tag === 'A' ? l0.borneDe : l0.borneVers);
    const b = { borne: k, ch, mur, x: bx, px: ep.x, py: ep.y, dir: mur === 'L' ? 1 : -1, departs: [], decales: [], gardes: [], n: entrees.length, propre, etiquette, li: entrees[0].li };
    // les bornes voisines : ni celle de la barrette, ni l'autre bout de ses propres fils (un fil y part droit)
    const siens = new Set(entrees.map(e => e.li)), voisines = (parois.get(ch + mur) || []).filter(v => !siens.has(v.li) && Math.abs(v.y - ep.y) > 0.5).map(v => v.y);
    const pris = [ep.y], libre = y => pris.every(v => Math.abs(v - y) >= ECART_VT) && voisines.every(v => Math.abs(v - y) >= ECART_VT);
    // la première hauteur libre à un pas de la borne : en dessous, au-dessus, puis plus loin
    const hauteurLibre = () => { for (let n = 1; ; n++) for (const sg of [1, -1]) { const y = ep.y + sg * n * PAS_VT; if (libre(y)) return y; } };
    const W = entrees.map(e => { const f = fils.get(e.li), bout = cle(e.li, e.tag), tv = f.travaux.find(t => t.ch === ch && t.paire.some(a => a.bout === bout));
      return { e, f, bout, tv, ici: tv && tv.paire.find(a => a.bout === bout), autre: tv && tv.paire.find(a => a.bout !== bout) }; });
    // ceux qui peuvent partir droit d'abord (leur hauteur est celle de leur destination, elle ne se choisit pas), les autres après
    W.sort((u, v) => (u.tv && !u.tv.piquage ? 0 : 1) - (v.tv && !v.tv.piquage ? 0 : 1));
    W.forEach(({ e, f, bout, tv, ici, autre }) => { const l = layout.links[e.li], ex = new Set([String(l.de), String(l.vers)]);
      f.chez[e.tag] = b;
      if (tv && !tv.piquage && libre(autre.y) && G.verticaleLibre(bx, ep.y, autre.y, ex) && G.couloirLibre(bx, autre.mur === 'L' ? G.x0(ch) + 2 : G.x1(ch) - 2, autre.y, ex)) {
        ici.borne = k; tv.piquage = b; tv.att = [autre]; autre.li = e.li; b.departs.push(autre); pris.push(autre.y); return; }   // part de la barrette
      if (tv && tv.piquage) return;   // sa verticale est déjà celle d'une autre barrette de la goulotte : il y passe (rare)
      // une borne à lui, à un pas, et sa propre verticale au-delà de la barrette jusqu'à sa hauteur
      const y = hauteurLibre(); pris.push(y);
      if (!tv) {   // un fil droit dans cette goulotte : il lui faut une verticale ici
        /* le fil se trace de f.A à f.B (rangés de gauche à droite) : sa verticale va de sa borne décalée à sa hauteur s'il
           part d'ici (ce bout est f.A), de sa hauteur à sa borne s'il arrive ici — l'étiquette du bout (A : « de ») n'en dit
           rien quand le fil est rangé à l'envers ; elle traçait alors deux obliques (vu sur un bloc posé à la main) */
        const estA = f.A.tag === e.tag, B2 = estA ? f.B : f.A, sortie = { y: ep.y, mur: loin, bout: B2.ch === ch && murDe(B2) === loin ? cle(e.li, B2.tag) : null };
        ici = { y, mur, bout, borne: k }; tv = estA ? travail(ch, ici, sortie, ex) : travail(ch, sortie, ici, ex);
        f.travaux.push(tv); f.travaux.sort((u, v) => u.ch - v.ch); f.forme = 'decale'; }
      else { ici.y = y; ici.borne = k; }
      tv.aupres = b; tv.contraintes.push({ porteur: b, mur: loin, borne: k }); b.decales.push({ y, li: e.li }); });
    piquages.push(b); });
  return piquages;
}

/* ---- l'ordre des verticales d'une goulotte ----------------------------------
   Deux verticales i et j se croisent selon leur ordre seulement : une attache
   de j vers la paroi gauche traverse i si i est à gauche de j et si l'attache
   passe dans la hauteur de i. Le coût d'un ordre est la somme de ces paires.
   Une attache qui arrive sur son propre piquage n'est pas un croisement :
   c'est la jonction. Une verticale qui doit rester entre sa borne et le
   porteur de la borne le paie très cher si elle passe de l'autre côté.
   Deux attaches à la MÊME hauteur vers des parois opposées, de nets
   différents : si la verticale attachée à droite est à gauche de l'autre,
   leurs deux horizontales se superposent entre les deux coins — cet ordre
   est SUPERPOSE, l'autre les sépare. */
function coutsParPaires(travaux) {
  const n = travaux.length, c = Array.from({ length: n }, () => new Float64Array(n));
  const idx = new Map(travaux.map((t, i) => [t, i]));
  const dans = (y, t) => y > t.lo + 0.5 && y < t.hi - 0.5;
  const jonction = (t, a) => !!t.piquage && a.borne != null && t.piquage.borne === a.borne;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (i === j) continue;
    let v = 0; const I = travaux[i], J = travaux[j];
    J.att.forEach(a => { if (a.mur === 'L' && dans(a.y, I) && !jonction(I, a)) v++; });
    I.att.forEach(a => { if (a.mur === 'R' && dans(a.y, J) && !jonction(J, a)) v++; });
    if (I.net != null && J.net != null && I.net !== J.net) I.att.forEach(a => { if (a.mur !== 'R') return;
      J.att.forEach(b => { if (b.mur === 'L' && Math.abs(a.y - b.y) <= 0.5) v += SUPERPOSE; }); });
    c[i][j] = v + (i > j ? 1e-4 : 0); }           // à égalité, l'ordre naturel (par ordonnée) reste
  travaux.forEach((t, i) => t.contraintes.forEach(ct => { const P = ct.porteur.travail || ct.porteur, p = idx.get(P); if (p == null || p === i) return;
    if (ct.mur === 'L') c[p][i] = INTERDIT; else c[i][p] = INTERDIT; }));
  return c;
}
function coutDeLOrdre(ordre, c) { let s = 0; for (let a = 0; a < ordre.length; a++) for (let b = a + 1; b < ordre.length; b++) s += c[ordre[a]][ordre[b]]; return s; }
/* Exact : programmation dynamique sur les sous-ensembles — le dernier posé
   ne coûte que contre ceux déjà posés. Ce coût (la somme des c[i][j] pour i
   dans le sous-ensemble) se calcule une fois par sous-ensemble et par j,
   depuis le sous-ensemble sans son plus petit élément : tout se fait en
   n × 2ⁿ, pas en n² × 2ⁿ. */
function ordreExact(n, c) {
  const N = 1 << n, dp = new Float64Array(N).fill(Infinity), dernier = new Int8Array(N).fill(-1);
  const somme = new Float64Array(n * N);                       // somme[j·N + S] : un seul tableau, une seule allocation
  for (let j = 0; j < n; j++) { const o = j * N, cj = c.map(l => l[j]);
    for (let S = 1; S < N; S++) { const b = S & -S; somme[o + S] = somme[o + (S ^ b)] + cj[31 - Math.clz32(b)]; } }
  dp[0] = 0;
  for (let S = 1; S < N; S++) for (let j = 0, bit = 1; j < n; j++, bit <<= 1) { if (!(S & bit)) continue;
    const T = S ^ bit, v = dp[T] + somme[j * N + T];
    if (v < dp[S]) { dp[S] = v; dernier[S] = j; } }
  const ordre = []; for (let S = N - 1; S; ) { const j = dernier[S]; ordre.push(j); S ^= 1 << j; }
  return ordre.reverse();
}
/* Au-delà : ordre naturel, puis chaque verticale essaie toutes les autres
   places tant qu'un déplacement gagne. */
function ordreParDeplacements(n, c) {
  const ordre = Array.from({ length: n }, (_, i) => i);
  for (let passe = 0; passe < 30; passe++) { let gagne = false;
    for (let p = 0; p < n; p++) { const e = ordre[p]; let bestQ = p, bestD = -1e-9, d = 0;
      for (let q = p + 1; q < n; q++) { d += c[ordre[q]][e] - c[e][ordre[q]]; if (d < bestD) { bestD = d; bestQ = q; } }
      d = 0; for (let q = p - 1; q >= 0; q--) { d += c[e][ordre[q]] - c[ordre[q]][e]; if (d < bestD) { bestD = d; bestQ = q; } }
      if (bestQ !== p) { ordre.splice(p, 1); ordre.splice(bestQ, 0, e); gagne = true; } }
    if (!gagne) break; }
  return ordre;
}
/* `exact` : jusqu'où l'ordre se cherche exactement — NMAX_EXACT pour le moteur ; seize sur un dessin retouché, où un
   gros bloc déplacé plie d'un coup tous ses fils dans la même goulotte (quelques millisecondes, une goulotte rare).
   `avant` : des paires [i, j] que la main impose (i à gauche de j, `ordreImpose`) — interdit autrement. */
function ordonner(travaux, exact, avant) {
  const n = travaux.length; if (n <= 1) return travaux.map((_, i) => i);
  const c = coutsParPaires(travaux);
  (avant || []).forEach(([i, j]) => { c[j][i] += INTERDIT; });
  return n <= (exact || NMAX_EXACT) ? ordreExact(n, c) : ordreParDeplacements(n, c);
}
/* L'ordre d'une goulotte où la main a posé des verticales (`force` : l'abscisse voulue). Les places d'abord, comme le
   moteur les pose sans la main ; puis chaque verticale imposée se range par son abscisse parmi celles qu'elle
   chevauche — à sa gauche celles qui étaient à gauche de la place visée ; sur la piste même d'une autre, elle la pousse
   du côté d'où elle vient (elle prend sa place) ; deux imposées, par leurs abscisses. Les pistes posent ensuite chacune
   au plus près de son vœu, l'imposée à son abscisse si la goulotte le permet. */
function ordreImpose(T, exact, ch, G) {
  const chevauche = (u, v) => u.hi + ECART_VERT > v.lo && v.hi + ECART_VERT > u.lo;
  poserLesPistes(T, ordonner(T, exact), ch, G, true); const avant = T.map(t => t.x), paires = [];
  T.forEach((F, i) => { if (F.force == null) return;
    T.forEach((O, j) => { if (i === j || !chevauche(F, O)) return;
      if (O.force != null) { if (i < j) paires.push(O.force < F.force || (O.force === F.force && avant[j] < avant[i]) ? [j, i] : [i, j]); return; }
      const xo = avant[j], gauche = xo < F.force - 0.01 || (Math.abs(xo - F.force) <= 0.01 && F.force > avant[i]);
      paires.push(gauche ? [j, i] : [i, j]); }); });
  return ordonner(T, exact, paires);
}

/* ---- les pistes : une abscisse par verticale --------------------------------
   L'ordre est acquis ; deux verticales qui se chevauchent en hauteur gardent
   PISTE entre elles, dans cet ordre. Chacune tire vers la paroi qu'elle
   dessert (un piquage au ras de sa borne, un Z contre la paroi gauche), sans
   jamais passer sous une pastille posée dans la goulotte. Une verticale que la
   main a posée (`force`) veut son abscisse, et rien à sa droite ne la pousse
   au-delà ; les fils décalés de sa barrette la suivent (`sansMain` : comme si
   la main n'y était pas). */
function poserLesPistes(travaux, ordre, ch, G, sansMain) {
  const xL = G.x0(ch), xR = G.x1(ch), tags = G.dedans(ch), main = t => !sansMain && t.force != null;
  const chevauche = (u, v) => u.hi + ECART_VERT > v.lo && v.hi + ECART_VERT > u.lo;
  const bornesDe = t => { let lb = xL + RETRAIT, ub = xR - RETRAIT;
    tags.forEach(c => { if (t.blocs.has(c.name) || c.y - 2 > t.hi || c.y + c.h + 2 < t.lo) return;
      if (c.x - xL < xR - (c.x + c.w)) lb = Math.max(lb, c.x + c.w + 4); else ub = Math.min(ub, c.x - 4); });
    return { lb, ub }; };
  const L = ordre.map(i => travaux[i]); L.forEach(t => { const b = bornesDe(t); t.lb = b.lb; t.ub = main(t) ? Math.min(b.ub, Math.max(b.lb, t.force)) : b.ub; });
  // la profondeur : le plus long enchaînement de verticales qui se chevauchent ;
  // une goulotte trop étroite pour lui resserre son pas plutôt que de déborder
  const rang = new Array(L.length).fill(0); let profondeur = 1;
  L.forEach((t, a) => { for (let b = 0; b < a; b++) if (chevauche(t, L[b])) rang[a] = Math.max(rang[a], rang[b] + 1); profondeur = Math.max(profondeur, rang[a] + 1); });
  const pas = Math.max(4, Math.min(PISTE, (xR - xL - 2 * RETRAIT) / Math.max(1, profondeur - 1)));
  // de droite à gauche : chacune laisse la place à celles qui la suivent
  for (let a = L.length - 1; a >= 0; a--) for (let b = a + 1; b < L.length; b++) if (chevauche(L[a], L[b])) L[a].ub = Math.min(L[a].ub, L[b].ub - pas);
  // de gauche à droite : chacune se pose après celles qui la précèdent, au plus près de son vœu
  L.forEach((t, a) => { let lb = t.lb;
    for (let b = 0; b < a; b++) if (chevauche(L[a], L[b])) lb = Math.max(lb, L[b].x + pas);
    const veut = main(t) ? t.force
      : t.piquage ? (t.piquage.mur === 'L' ? xL + RETRAIT : xR - RETRAIT)
      : t.aupres && t.aupres.travail && main(t.aupres.travail) ? t.aupres.travail.force + (t.aupres.mur === 'L' ? pas : -pas)
      : t.aupres ? (t.aupres.mur === 'L' ? xL + RETRAIT + pas : xR - RETRAIT - pas)        // un fil décalé : juste au-delà de sa barrette
      : (t.att.length && t.att.every(a2 => a2.mur === 'R') ? xR - RETRAIT : lb);
    t.x = Math.max(lb, Math.min(t.ub, veut)); if (t.piquage) t.piquage.x = t.x; });
  return profondeur;
}

/* ---- le tracé ------------------------------------------------------------
   De A à B : la borne, puis pour chaque goulotte la verticale (celle du fil
   ou celle du piquage) entre ses deux attaches, puis l'autre borne. Le
   piquage trace lui-même son raccord et sa verticale, une seule fois : un
   fil qui en part commence à son point de départ, un fil qui passe devant
   commence à la jonction, et un fil qui quitte l'horizontale d'un autre fil
   de sa borne commence là où il la quitte. Un fil qui part d'une borne de la
   barrette à la hauteur de sa destination est DROIT : la barrette est une pièce, le fil commence à sa borne (le juge ne
   lui compte plus le raccord). Un fil DÉCALÉ part de sa borne, à un pas de la borne de l'équipement, et rejoint sa
   hauteur par sa verticale : il n'est pas droit, il est marqué `parPiquage`. */
function tracerLesFils(layout, fils, piquages) {
  const out = new Array(layout.links.length);
  const garde = (b, y, li) => { if (!b.gardes.some(g => Math.abs(g.y - y) < 0.6)) b.gardes.push({ y, li }); };
  const cleDe = ep => Math.round(ep.x) + ',' + Math.round(ep.y) + ',' + ep.stub;
  // combien de points ôter à un bout, et si le fil passe par la verticale du piquage
  const bout = (f, ep, tv, tag) => { const b = f.chez[tag], k = cleDe(ep);
    if (tv && tv.piquage && tv.piquage.borne === k) return { ote: 2 };   // part de la barrette, de sa borne, à la hauteur de sa destination : droit s'il y va droit
    const ici = tv && tv.paire.find(a => a.bout === cle(f.li, tag));
    if (b && ici && ici.borne === k && Math.abs(ici.y - ep.y) > 0.6) { garde(b, ici.y, f.li); return { ote: 1, jonction: { x: b.x, y: ici.y }, plie: true }; }   // décalé : part de sa borne, à un pas
    const saVerticale = tv && !tv.piquage && tv.ch === ep.ch && !!ici;
    if (b && !saVerticale) { garde(b, ep.y, f.li); return { ote: 1, jonction: { x: b.x, y: ep.y } }; }           // passe par la jonction
    if (b || (tv && tv.contraintes.some(c => c.borne === k))) return { ote: 1 };                                 // naît sur l'horizontale du porteur
    return { ote: 0 }; };
  layout.links.forEach((l, li) => { if (l.boucle) return;
    if (l.shunt) { out[li] = { ...l, pts: [] }; return; }
    const f = fils.get(li); f.li = li; let pts = [{ x: f.A.x, y: f.A.y }];
    f.travaux.forEach(t => { const x = t.piquage ? t.piquage.x : t.x; pts.push({ x, y: t.paire[0].y }, { x, y: t.paire[1].y }); });
    pts.push({ x: f.B.x, y: f.B.y });
    // chaque bout sous SON étiquette (de : A, vers : B) — le fil est rangé de gauche à droite, f.A n'est pas toujours le « de »
    const dA = bout(f, f.A, f.travaux[0], f.A.tag), dB = bout(f, f.B, f.travaux[f.travaux.length - 1], f.B.tag);
    pts = pts.slice(dA.ote, pts.length - dB.ote);
    if (dA.jonction) pts.unshift(dA.jonction); if (dB.jonction) pts.push(dB.jonction);
    const trace = simplifier(pts); if (f.A.tag === 'B') trace.reverse();
    out[li] = { ...l, pts: trace, parPiquage: !!(dA.plie || dB.plie) };
    if (f.consigne) out[li].retouche = f.tenue ? 'tenue' : 'refusee'; });   // ce que la main a demandé à ce fil, tenu ou non
  return out;
}
/* Un fil ROMPU : un de ses bouts n'arrive pas à sa borne — ni au bout de
   son tracé, ni par le piquage de cette borne (le tracé finit alors sur la
   verticale du piquage, qui trace lui-même le raccord jusqu'à la borne). Le
   dessin ment : le juge le refuse, le banc le compte. */
function filsRompus(fils, barrettes) {
  const pres = (p, q) => Math.abs(p.x - q.x) < 0.5 && Math.abs(p.y - q.y) < 0.5;
  return fils.filter(w => { if (w.shunt || w.boucle || !w.pts || w.pts.length < 2) return false; const bouts = [w.pts[0], w.pts[w.pts.length - 1]];
    return [w.epA, w.epB].some(ep => !bouts.some(p => pres(p, ep)) && !(barrettes || []).some(b => b.raccord && Math.abs(b.raccord.x0 - ep.x) < 0.5 && Math.abs(b.raccord.y - ep.y) < 0.5
      && bouts.some(p => Math.abs(p.x - b.x) < 0.5 && p.y > b.y1 - 0.5 && p.y < b.y2 + 0.5))); }).length;
}
/* Les JONCTIONS : un bout de fil qui n'est ni une borne ni sur un piquage
   est posé sur le fil d'un autre — un point le dit. */
function jonctions(layout, traces, barrettes) {
  const points = new Map();
  traces.forEach(w => { if (!w || !w.pts.length) return;
    [w.pts[0], w.pts[w.pts.length - 1]].forEach(p => {
      if ([w.epA, w.epB].some(ep => Math.abs(ep.x - p.x) < 0.5 && Math.abs(ep.y - p.y) < 0.5)) return;
      if (barrettes.some(b => Math.abs(b.x - p.x) < 0.5 && p.y > b.y1 - 0.5 && p.y < b.y2 + 0.5)) return;
      points.set(Math.round(p.x) + ',' + Math.round(p.y), { x: p.x, y: p.y }); }); });
  return [...points.values()];
}

/* Le routage entier, puis chaque fil candidat à un détour par une goulotte
   voisine est essayé pour de vrai : le détour, plus long à lire, ne reste
   que s'il ôte au moins deux croisements au dessin entier. */
function router(layout) {
  if (!layout.links.length) return { fils: [], points: [], barrettes: [], piquages: [] };
  const permis = new Set();
  let meilleur = routerUneFois(layout, permis);
  for (const li of meilleur.candidats.slice(0, 4)) { permis.add(li);
    const essai = routerUneFois(layout, permis);
    if (essai.croisements <= meilleur.croisements - 2) meilleur = essai; else permis.delete(li); }
  return meilleur.resultat;
}
function routerUneFois(layout, permis) {
  const G = goulottes(layout), netDe = netsDe(layout.links), C = lireConsignes(layout.geom);
  const fils = formerLesFils(layout, G, permis, C);
  poserLesDetours(fils, G);
  const piquages = formerLesPiquages(layout, fils, G);
  // les verticales de chaque goulotte : celles des fils, celles des piquages — chacune sait de quel net elle est
  const parGoulotte = Array.from({ length: G.n }, () => []);
  const etendue = t => { const ys = t.paire.map(a => a.y); t.lo = Math.min(...ys); t.hi = Math.max(...ys); return t; };
  fils.forEach((f, li) => f.travaux.forEach(t => { t.net = netDe(li); if (!t.piquage) parGoulotte[t.ch].push(etendue(t)); }));
  piquages.forEach(b => { const raccord = { y: b.py, mur: b.mur, borne: b.borne, bout: null }; b.net = netDe(b.li);
    // la barrette s'étend jusqu'aux bornes de ses fils décalés (leurs horizontales comptent sur leur propre verticale)
    const t = { ch: b.ch, piquage: b, net: b.net, att: [raccord, ...b.departs], paire: [raccord, ...b.departs, ...b.decales.map(d => ({ y: d.y, mur: b.mur, bout: null, borne: b.borne }))], blocs: new Set([b.propre]), contraintes: [] };
    b.travail = etendue(t); parGoulotte[b.ch].push(t); });
  /* les abscisses que la main a posées : la verticale d'un fil dans la goulotte qui contient sa consigne, la ligne d'une
     barrette à poser à sa distance de la borne */
  if (C) { fils.forEach((f, li) => { const k = C.fils.get(li); if (!k || !k.xs) return;
      f.travaux.forEach(t => { if (t.piquage) return; const x = k.xs.find(v => G.chDe(v) === t.ch); if (x != null) t.force = x; }); });
    piquages.forEach(b => { const d = C.barrettes.get(cleDeBarrette(b)); if (d == null) return; const x = b.px + b.dir * d; if (G.chDe(x) === b.ch) b.travail.force = x; }); }
  /* la largeur que les pistes de chaque goulotte demandent à leur pas plein (deux retraits, PISTE entre deux verticales
     voisines) : la retouche élargit une goulotte trop étroite pour ce qu'on y a mis (`preparerPose`) */
  const besoins = new Array(G.n).fill(0), exact = G.libre ? 16 : NMAX_EXACT;
  parGoulotte.forEach((T, ch) => { if (!T.length) return;
    T.sort((u, v) => (u.lo - v.lo) || (u.hi - v.hi));
    const ordre = C && T.some(t => t.force != null) ? ordreImpose(T, exact, ch, G) : ordonner(T, exact);
    besoins[ch] = 2 * RETRAIT + (poserLesPistes(T, ordre, ch, G) - 1) * PISTE; });
  const traces = tracerLesFils(layout, fils, piquages);
  // chaque barrette : ses bornes — le raccord (borne 1), puis une par fil, celui qui part de là (`li`) —, de haut en bas
  const barrettes = piquages.map(b => { const bornes = [{ y: b.py, li: null }, ...b.departs.map(d => ({ y: d.y, li: d.li })), ...b.gardes]
      .filter((p, i, a) => a.findIndex(q => Math.abs(q.y - p.y) < 0.6) === i).sort((u, v) => u.y - v.y), lo = bornes[0].y, hi = bornes[bornes.length - 1].y;
    return { x: b.x, y1: lo - 3, y2: hi + 3, py: b.py, bornes, gardes: bornes.slice(1), bus: b.n >= 4, dir: b.dir, px: b.px, net: b.net, propre: b.propre, etiquette: b.etiquette,
             pts: b.departs.filter(d => Math.abs(d.y - b.py) > 1.2).map(d => ({ x: b.x, y: d.y })), raccord: { x0: b.px, x1: b.x, y: b.py } }; });
  barrettes.raccords = barrettes.map(b => b.raccord);
  const resultat = { fils: traces.filter(Boolean), points: jonctions(layout, traces, barrettes), barrettes, piquages: barrettes.flatMap(b => b.pts), besoins };
  return { resultat, candidats: fils.candidats, croisements: compterCroisements(resultat.fils.filter(w => !w.shunt), barrettes) };
}

/* ---- mesures partagées par le concours de placement et les contrôles ----
   Un fil est DROIT s'il est un seul segment horizontal, de borne à borne —
   la borne d'une barrette à poser en est une ; un fil décalé, qui rejoint
   sa hauteur par un Z, ne l'est pas (le routeur le marque `parPiquage`).
   Un shunt n'est ni droit ni plié : il
   ne compte pas ; le PONT d'une barrette coupée (un fil d'une barrette vers
   elle-même) non plus : couper rapportait un « fil droit » par pont, et le
   juge coupait un bus de six bornes en quatre morceaux reliés par cinq ponts
   là où un seul morceau se lisait d'un coup d'œil. */
const estPont = w => String(w.de) === String(w.vers);
const compterDroits = fils => fils.filter(w => !estPont(w) && w.pts.length >= 2 && !w.parPiquage && w.pts.every(p => Math.abs(p.y - w.pts[0].y) < 0.01)).length;
/* Les MARCHES d'un fil : un segment de moins de MARCHE entre deux angles
   (une horizontale entre deux verticales, une verticale entre deux
   horizontales), ou deux verticales à moins de 2·MARCHE l'une de l'autre.
   Un fil est droit, fait un Z, ou un U par un couloir : jamais un escalier.
   Rend le nombre de fils qui en ont ; `detail` reçoit lesquels. */
function marchesDe(pts) {
  const segs = []; for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1];
    segs.push(Math.abs(a.y - b.y) < 0.3 ? { h: true, L: Math.abs(b.x - a.x) } : { h: false, L: Math.abs(b.y - a.y), x: a.x }); }
  const out = [];
  for (let i = 1; i + 1 < segs.length; i++) if (segs[i].h !== segs[i - 1].h && segs[i].h !== segs[i + 1].h && segs[i].L < MARCHE - 1e-6)
    out.push((segs[i].h ? 'horizontale' : 'verticale') + ' de ' + segs[i].L.toFixed(1) + ' entre deux angles');
  const V = segs.filter(s => !s.h);
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) if (Math.abs(V[i].x - V[j].x) < 2 * MARCHE - 1e-6) out.push('deux verticales à ' + Math.abs(V[i].x - V[j].x).toFixed(1));
  return out;
}
/* Les ESCALIERS : un fil est droit, ou fait UN Z (trois segments). Chaque
   paire d'angles au-delà — cinq segments, sept… — est une marche de plus
   que le lecteur suit, même à longs segments ; ça se compte comme un
   croisement chacune. Un fil qui traverse une colonne par un couloir en
   fait une : le placement l'évite en mettant sa borne à la hauteur du
   couloir, ou en compactant ce qui barre. */
function compterEscaliers(fils) { let n = 0;
  fils.forEach(w => { if (w.shunt || !w.pts) return; const segs = simplifier(w.pts).length - 1; if (segs > 3) n += Math.floor((segs - 3) / 2); });
  return n;
}
function compterMarches(fils, detail) { let n = 0;
  fils.forEach(w => { if (w.shunt || !w.pts || w.pts.length < 4) return; const m = marchesDe(w.pts); if (!m.length) return; n++;
    if (detail) detail.push(String(w.cable || (w.de + ':' + w.borneDe + '→' + w.vers + ':' + w.borneVers)) + ' : ' + m.join(', ')); });
  return n;
}
/* Les segments du dessin, fusionnés : deux fils qui se superposent (les
   fils d'une même borne) font UN trait, et un croisement se compte une fois
   par trait. Les piquages y sont, verticales et raccords. */
function segmentsFusionnes(fils, barrettes) {
  const H = new Map(), V = new Map();
  const poser = (M, k, a, b) => (M.get(k) || M.set(k, []).get(k)).push([Math.min(a, b), Math.max(a, b)]);
  fils.forEach(w => { for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1];
    if (Math.abs(a.y - b.y) < .01) poser(H, Math.round(a.y * 10), a.x, b.x); else if (Math.abs(a.x - b.x) < .01) poser(V, Math.round(a.x * 10), a.y, b.y); } });
  (barrettes || []).forEach(b => poser(V, Math.round(b.x * 10), b.y1 + 3, b.y2 - 3));
  ((barrettes && barrettes.raccords) || []).forEach(r => poser(H, Math.round(r.y * 10), r.x0, r.x1));
  const fondre = M => { const out = []; M.forEach((segs, k) => { segs.sort((u, v) => u[0] - v[0]); let cur = null;
    segs.forEach(s => { if (cur && s[0] <= cur[1] + 0.01) cur[1] = Math.max(cur[1], s[1]); else out.push(cur = [s[0], s[1], k / 10]); }); }); return out; };
  return { H: fondre(H).map(([x0, x1, y]) => ({ x0, x1, y })), V: fondre(V).map(([y0, y1, x]) => ({ y0, y1, x })) };
}
/* Seuls un horizontal et un vertical peuvent se croiser ; toucher en bout
   n'est pas croiser. */
function compterCroisements(fils, barrettes) {
  const { H, V } = segmentsFusionnes(fils, barrettes); let c = 0;
  for (const h of H) for (const v of V) if (v.x > h.x0 + 0.5 && v.x < h.x1 - 0.5 && h.y > v.y0 + 0.5 && h.y < v.y1 - 0.5) c++;
  return c;
}
/* Un segment de fil qui passe dans un bloc : le premier invariant sacré. */
function filsDansBlocs(fils, comps) {
  let n = 0;
  fils.forEach(w => { for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1];
    const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
    for (const c of comps) { if (x1 > c.x + 2 && x0 < c.x + c.w - 2 && y1 > c.y + 2 && y0 < c.y + c.h - 2) { n++; break; } } } });
  return n;
}
/* Les deux invariants sacrés : aucun fil à travers un bloc étranger, aucun
   chevauchement. Un dessin qui les viole est FAUX, quel que soit son score. */
function auditer(dessin) {
  const blocs = dessin.comps.filter(c => c.kind !== 'tag'), fils = dessin.fils.filter(w => !w.shunt);
  let filsDansBloc = 0; const coupables = [];
  fils.forEach(w => { const siens = new Set([String(w.de), String(w.vers)]);
    for (let i = 0; i < w.pts.length - 1; i++) { const a = w.pts[i], b = w.pts[i + 1];
      const xa = Math.min(a.x, b.x), xb = Math.max(a.x, b.x), ya = Math.min(a.y, b.y), yb = Math.max(a.y, b.y);
      const horizontal = Math.abs(a.y - b.y) < 0.01;
      blocs.forEach(c => { if (siens.has(String(c.name))) return;
        const dedans = horizontal ? (a.y > c.y + 1 && a.y < c.y + c.h - 1 && xa < c.x + c.w - 2 && xb > c.x + 2)
                                  : (a.x > c.x + 1 && a.x < c.x + c.w - 1 && ya < c.y + c.h - 2 && yb > c.y + 2);
        if (dedans) { filsDansBloc++; if (coupables.length < 5) coupables.push(w.de + ':' + w.borneDe + '→' + w.vers + ':' + w.borneVers + ' traverse ' + c.name); } }); } });
  let blocsChevauches = 0;
  for (let i = 0; i < blocs.length; i++) for (let j = i + 1; j < blocs.length; j++) { const a = blocs[i], b = blocs[j];
    if (a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1) blocsChevauches++; }
  const droits = compterDroits(fils), nFils = fils.filter(w => !estPont(w)).length;
  return { ok: filsDansBloc === 0 && blocsChevauches === 0, fils: nFils, droits,
           tauxDroits: nFils ? +(droits / nFils).toFixed(3) : 1,
           croisements: compterCroisements(fils, dessin.barrettes), filsDansBloc, blocsChevauches, blocs: blocs.length, details: coupables,
           evitables: croisementsEvitables(dessin, { fils, barrettes: dessin.barrettes }) };
}

/* ---- les croisements ÉVITABLES ---------------------------------------------
   À placement fixé et formes fixées, un croisement est évitable si un autre
   ordre des verticales de sa goulotte le supprime sans en créer. On relit
   les verticales dans les TRACÉS (pas dans le routeur), avec leurs attaches
   aux parois, et on compare le coût de l'ordre dessiné au meilleur ordre.
   Les attaches superposées d'une même borne comptent une fois, par la
   verticale la plus loin de la paroi ; les autres restent entre les deux. */
function croisementsEvitables(layout, R) {
  const G = goulottes(layout), netDe = netsDe(layout.links); let total = 0;
  const barrettes = R.barrettes || [];
  for (let ch = 0; ch < G.n; ch++) { const xL = G.x0(ch), xR = G.x1(ch), T = [];
    // la verticale en x qui couvre [lo, hi] ; deux verticales sur une même piste, l'une au-dessus de l'autre, restent deux
    const travailEn = (x, lo, hi, net) => { let t = T.find(u => Math.abs(u.x - x) < 0.5 && hi >= u.lo - 0.5 && lo <= u.hi + 0.5);
      if (!t) { t = { x, lo, hi, att: [], contraintes: [], piquage: null, net }; T.push(t); }
      t.lo = Math.min(t.lo, lo); t.hi = Math.max(t.hi, hi); return t; };
    // une horizontale qui part du point s vers q : une attache de la verticale en s
    const attacher = (t, q, s) => { if (!q || Math.abs(q.y - s.y) > 0.01 || Math.abs(q.x - s.x) < 0.5) return;
      const mur = q.x < s.x ? 'L' : 'R', auMur = mur === 'L' ? q.x <= xL + 1 : q.x >= xR - 1;
      if (!t.att.some(o => o.mur === mur && Math.abs(o.y - s.y) < 0.3)) t.att.push({ y: s.y, mur, jonctionX: auMur ? null : q.x }); };
    const dedans = x => x > xL + 1 && x < xR - 1;
    barrettes.forEach(b => { if (!dedans(b.x)) return; const t = travailEn(b.x, b.y1 + 3, b.y2 - 3, b.net); t.piquage = b;
      attacher(t, { x: b.raccord.x0, y: b.py }, { x: b.x, y: b.py }); });
    R.fils.forEach(w => { const p = w.pts, net = netDe(w.i); if (!p.length) return;
      for (let i = 0; i + 1 < p.length; i++) { const a = p[i], b = p[i + 1];
        if (Math.abs(a.x - b.x) > 0.01 || Math.abs(a.y - b.y) < 0.5 || !dedans(a.x)) continue;
        const t = travailEn(a.x, Math.min(a.y, b.y), Math.max(a.y, b.y), net);
        attacher(t, p[i - 1], a); attacher(t, p[i + 2], b); }
      // un fil qui part d'un piquage : son horizontale est une attache du piquage
      [[p[0], p[1]], [p[p.length - 1], p[p.length - 2]]].forEach(([s, q]) => { const b = barrettes.find(b => Math.abs(b.x - s.x) < 0.5 && s.y > b.y1 - 0.5 && s.y < b.y2 + 0.5);
        if (b && dedans(b.x)) attacher(travailEn(b.x, s.y, s.y, b.net), q, s); }); });
    // une verticale qui naît sur le raccord d'un piquage reste entre la borne et lui
    T.forEach(t => { if (t.piquage) return; barrettes.forEach(b => { if (!dedans(b.x)) return; const r = b.raccord;
      if (Math.abs(t.lo - b.py) > 0.3 && Math.abs(t.hi - b.py) > 0.3) return;
      if (t.x > Math.min(r.x0, r.x1) - 0.5 && t.x < Math.max(r.x0, r.x1) + 0.5) t.contraintes.push({ porteur: travailEn(b.x, b.py, b.py), mur: r.x0 < r.x1 ? 'L' : 'R' }); }); });
    T.sort((u, v) => u.x - v.x); if (T.length < 2) continue;
    // par paroi et ordonnée, une seule attache compte : celle de la verticale la plus loin de la paroi
    const parBorne = new Map();
    T.forEach(t => t.att.forEach(a => { if (a.jonctionX != null) return; const k = a.mur + ':' + Math.round(a.y * 2);
      (parBorne.get(k) || parBorne.set(k, []).get(k)).push({ t, a }); }));
    parBorne.forEach(L => { if (L.length < 2) return; const loin = L.reduce((m, e) => (e.a.mur === 'L' ? e.t.x > m.t.x : e.t.x < m.t.x) ? e : m);
      L.forEach(e => { if (e === loin) return; e.t.att = e.t.att.filter(a => a !== e.a); e.t.contraintes.push({ porteur: loin.t, mur: e.a.mur }); }); });
    const c = coutsParPaires(T);
    // une attache qui s'arrête sur une autre verticale (jonction) ne la croise pas
    T.forEach((t, j) => t.att.forEach(a => { if (a.jonctionX == null) return; const i = T.findIndex(u => Math.abs(u.x - a.jonctionX) < 0.5); if (i < 0) return;
      if (a.y > T[i].lo + 0.5 && a.y < T[i].hi - 0.5) { if (a.mur === 'L') c[i][j] -= 1; else c[j][i] -= 1; } }));
    const actuel = coutDeLOrdre(T.map((_, i) => i), c);
    const meilleur = coutDeLOrdre(T.length <= 14 ? ordreExact(T.length, c) : ordreParDeplacements(T.length, c), c);
    total += Math.max(0, Math.round(actuel - meilleur)); }
  return total;
}

/* ---- LA RETOUCHE : tout se prend à la main — les blocs, les pastilles, les bornes, les fils ----------------
   Le dessin automatique est le point de départ ; tout s'y prend et va où l'on veut, et le routeur, lui, reste le même :
   il reçoit une géométrie juste, et des CONSIGNES (plus haut, `lireConsignes`).
   LES BLOCS — un équipement, un disjoncteur, un bornier, une barrette, une prise, un renvoi, et aussi une PASTILLE (une
   masse, un morceau de barrette, un rail) — se posent n'importe où, en x comme en y. Le placement les range en
   COLONNES ; entre deux colonnes, une goulotte, où passent les verticales des fils. Ce sont les colonnes qui se
   RELISENT sur les blocs posés :
   · Un bloc qui ne bouge pas tient la colonne où il est, toute sa largeur ; une pastille collée à sa borne le suit.
   · Le bloc déplacé (et les pastilles collées à ses flancs) tient la colonne qui le contient tout entier ; sinon sa
     propre largeur. Sa colonne est celle où il entre de plus d'une goulotte (GOULOTTE_MIN, la moitié de sa largeur pour
     un bloc étroit) : il la rejoint, et l'élargit s'il en déborde. Une colonne qu'il ne fait que mordre s'écarte
     (ci-dessous). Sans colonne — posé dans une goulotte, ou au-delà du dessin —, il en devient une à lui, qui partage la
     goulotte en deux. Dans deux colonnes à la fois, la pose est refusée : les fondre ferait traverser à des fils toute
     la largeur de l'autre.
   · Une PASTILLE prise à la main quitte sa borne : c'est un bloc comme un autre, que son fil rejoint par le flanc qui
     regarde son partenaire. Reposée à sa place collée (un aimant l'y mène), elle se recolle.
   · Une colonne n'est juste que si ses blocs S'EMPILENT : les fils d'un bloc sortent de ses flancs jusqu'aux
     goulottes, rien ne doit être à côté de lui à la même hauteur. Le bloc déplacé garde ECART_RETOUCHE de ses voisins
     de colonne. Sinon la pose est refusée, et l'on dit pourquoi : 'chevauche' (il est sur un bloc), 'pile' (il serait à
     côté d'un bloc de sa colonne, à la même hauteur, ou dans deux colonnes).
   · Une goulotte ne descend jamais sous GOULOTTE_MIN : quand le bloc mord sur celle d'à côté, les colonnes au-delà
     S'ÉCARTENT de ce qui manque (la POUSSÉE), en s'éloignant de lui ; une goulotte plus large absorbe ce qu'elle peut.
     C'est ce qui permet le petit pas de côté dans un dessin serré. Le bloc posé, lui, ne bouge jamais.
   · Une colonne qu'aucun bloc ne tient plus disparaît : ses deux goulottes n'en font qu'une.
   LES BORNES glissent le long de leur bloc (`preparerBorne`) : sur une autre borne, elles échangent leurs places ; au-delà
   du corps, le bloc grandit — s'il ne vient pas sur un voisin.
   LES FILS : un tronçon pris à la main devient une consigne (`poserConsignes`) — une verticale à son abscisse, un couloir
   à sa hauteur ; la ligne d'une barrette à poser, à sa distance de la borne.
   Routé, le dessin se lit : une goulotte que ses pistes débordent s'élargit à leur pas plein, un fil dont le numéro ne
   s'écrit plus élargit celles que traverse sa plus longue horizontale (`routerEtElargir`). Les bouts des fils prennent
   la goulotte de leur nouvelle colonne (même flanc, même côté). La géométrie rendue porte `libre` : le routeur y refuse
   aussi qu'une horizontale traverse le bloc de son propre fil (`goulottes`), une borne de barrette à poser ne se pose pas
   à la hauteur d'une borne voisine, et l'ordre des pistes se cherche exactement plus loin. Ce que la main a déplacé le
   sait : un bloc porte `main`, une borne `ya` (la hauteur que le moteur lui donnait) — de quoi le rendre au moteur. Sans
   retouche rien de cela ne joue (les dessins automatiques sont les mêmes au point près) ; sans déplacement (0, 0) la
   géométrie relue est celle d'avant. */
const ECART_RETOUCHE = 8;
/* La borne d'en face d'une pastille : le nom du bloc où va son fil (une pastille n'a qu'une borne, qu'un fil) ; null si
   aucun fil ne part d'elle. Plusieurs masses portent le même nom : par la position. */
function partenaireDePastille(t, links) {
  const sur = e => e && e.x >= t.x - 1.5 && e.x <= t.x + t.w + 1.5 && e.y >= t.y - 1.5 && e.y <= t.y + t.h + 1.5;
  for (const l of links) { if (l.shunt || l.boucle) continue;
    if (String(l.de) === String(t.name) && sur(l.epA)) return { nom: l.vers, ep: l.epB };
    if (String(l.vers) === String(t.name) && sur(l.epB)) return { nom: l.de, ep: l.epA }; }
  return null; }
/* Les pastilles collées au flanc d'un bloc, à sa hauteur, et dont le fil va à ce bloc : elles le suivent. `links` absents
   (le dessin seul) : la position suffit. */
const pastillesDuBloc = (comps, c, links) => comps.filter(t => t.kind === 'tag' && t.y + t.h / 2 > c.y - 1 && t.y + t.h / 2 < c.y + c.h + 1
  && (Math.abs(t.x + t.w + FIL_PASTILLE - c.x) < 2 || Math.abs(t.x - (c.x + c.w + FIL_PASTILLE)) < 2)
  && (!links || (p => !p || String(p.nom) === String(c.name))(partenaireDePastille(t, links))));
/* Le bloc d'un bout de fil : celui de ce nom dont le bord porte le bout (les morceaux d'une barrette, les masses, partagent
   un nom) ; à défaut, le seul de ce nom. */
function blocDuBout(parNom, nom, e) { const L = parNom.get(String(nom)) || [];
  return L.find(c => e.x >= c.x - 1.5 && e.x <= c.x + c.w + 1.5 && e.y >= c.y - 1.5 && e.y <= c.y + c.h + 1.5) || (L.length === 1 ? L[0] : null); }
const parNomDe = comps => { const m = new Map(); comps.forEach(c => { const n = String(c.name); (m.get(n) || m.set(n, []).get(n)).push(c); }); return m; };
// un bloc décalé, ses bornes avec lui (et la hauteur que le moteur leur donnait), dans sa nouvelle colonne
function decalerBloc(k, dx, dy, col) { if (!dx && !dy && col === k.col) return k;
  const rangs = {}; Object.keys(k.rangs || {}).forEach(lid => { rangs[lid] = k.rangs[lid].map(p => ({ ...p, y: p.y + dy, ...(p.x != null ? { x: p.x + dx } : {}), ...(p.ya != null ? { ya: p.ya + dy } : {}) })); });
  const parCle = new Map(); (k.parCle || new Map()).forEach((v, cl) => parCle.set(cl, { ...v, y: v.y + dy, ...(v.x != null ? { x: v.x + dx } : {}) }));
  return { ...k, x: k.x + dx, y: k.y + dy, col, rangs, parCle }; }
/* Le bout de fil d'une pastille posée à la main : sur le flanc qui regarde la goulotte d'où vient son fil (celle de la
   borne d'en face, ou de son côté), dans la goulotte de ce côté de sa colonne ; sa borne dit par où le fil arrive (dir
   -1 : par la gauche). Reposée à sa place collée — à un fil court de sa borne, à sa hauteur —, elle la regarde, comme le
   placement la pose (05 n'y voit qu'un fil droit). Rend [la pastille, le bout]. */
function boutDePastille(t, autre) { const S = (t.rangs.S || [])[0], y = S ? S.y : t.y + t.h / 2;
  const colle = Math.abs(autre.y - y) < 0.5 && (Math.abs(t.x - FIL_PASTILLE - autre.x) < 2 || Math.abs(t.x + t.w + FIL_PASTILLE - autre.x) < 2);
  const gauche = colle ? autre.x < t.x : Number.isInteger(autre.ch) ? autre.ch <= t.col : autre.x <= t.x + t.w / 2;
  const t2 = S && (S.dir || 0) !== (gauche ? -1 : 1) ? { ...t, rangs: { ...t.rangs, S: [{ ...S, dir: gauche ? -1 : 1 }, ...t.rangs.S.slice(1)] } } : t;
  // collée, son bout est dans la goulotte de sa borne (le fil la traverse droit) ; libre, dans celle de son flanc
  const ch = colle ? (gauche ? t.col + 1 : t.col) : (gauche ? t.col : t.col + 1);
  return [t2, { x: gauche ? t.x : t.x + t.w, y, ch, stub: gauche ? 'R' : 'L' }]; }

/* Préparer la pose d'un bloc (ou d'une pastille) du dessin `layout` ({ comps, links, geom, routage }) ; rend
     examiner(dx, dy)   la pose est-elle juste ? { grappes, s, poussee } ou { refus, avec } — sans rien construire (la
                        recherche de la place libre l'appelle des centaines de fois par geste)
     poser(dx, dy)      le dessin avec le bloc décalé, routé : { comps, links, geom, routage, bloc, poussee } (la poussée :
                        de combien la colonne la plus écartée a bougé) ou { refus, avec }
     etendue            [gauche, droite] du bloc et de ses pastilles ; tags : ses pastilles ; partenaire : le bout d'en face
                        d'une pastille (sa place collée) */
function preparerPose(layout, bloc) {
  const g = layout.geom, comps = layout.comps, nC = g.colX.length;
  // les pastilles collées suivent leur bloc ; une pastille posée ailleurs à la main, ou celle qu'on prend, est un bloc
  const collees = new Map(), suiveuses = new Set();
  comps.forEach(b => { if (b.kind === 'tag') return; const ts = pastillesDuBloc(comps, b, layout.links).filter(t => t !== bloc); collees.set(b, ts); ts.forEach(t => suiveuses.add(t)); });
  const blocs = comps.filter(c => !suiveuses.has(c)), sesTags = b => collees.get(b) || [];
  const etendue = b => { let lo = b.x, hi = b.x + b.w; sesTags(b).forEach(t => { lo = Math.min(lo, t.x); hi = Math.max(hi, t.x + t.w); }); return [lo, hi]; };
  const rang = k => [g.colX[k], g.colX[k] + g.colW[k]];
  const dans = (k, lo, hi) => lo >= g.colX[k] - 0.5 && hi <= g.colX[k] + g.colW[k] + 0.5;
  const contenant = (lo, hi) => { for (let k = 0; k < nC; k++) if (dans(k, lo, hi)) return k; return -1; };
  // les colonnes que tiennent les blocs qui restent (toute leur largeur), de gauche à droite
  const tenues = new Map();
  blocs.forEach((b, i) => { if (b === bloc) return; const [lo, hi] = etendue(b);
    const k = Number.isInteger(b.col) && b.col >= 0 && b.col < nC && dans(b.col, lo, hi) ? b.col : contenant(lo, hi), [a, z] = k >= 0 ? rang(k) : [lo, hi];
    const cle = k >= 0 ? 'c' + k : 'b' + i; let t = tenues.get(cle);
    if (!t) tenues.set(cle, t = { lo: a, hi: z, membres: [], k }); t.membres.push(b); });
  const fixes = [...tenues.values()].sort((u, v) => u.lo - v.lo);
  const [flo, fhi] = etendue(bloc), seuil = Math.min(GOULOTTE_MIN, (fhi - flo) / 2);
  // une pastille : sa borne d'en face, et sa place collée (à un fil court de la borne, à sa hauteur) — là, son bloc ne la gêne pas
  const p = bloc.kind === 'tag' ? partenaireDePastille(bloc, layout.links) : null, porteur = p ? blocDuBout(parNomDe(comps), p.nom, p.ep) : null;
  const colle = porteur ? { x: p.ep.x < porteur.x + porteur.w / 2 ? p.ep.x - FIL_PASTILLE - bloc.w : p.ep.x + FIL_PASTILLE, y: p.ep.y - bloc.h / 2 } : null;
  const examiner = (dx, dy) => {
    const lo = flo + dx, hi = fhi + dx, y0 = bloc.y + dy, y1 = y0 + bloc.h, bx0 = bloc.x + dx, bx1 = bx0 + bloc.w;
    const k = contenant(lo, hi), [a, z] = k >= 0 ? rang(k) : [lo, hi], moi = { lo: a, hi: z, moi: true, membres: [bloc] };
    /* sa colonne : celle où il entre de plus d'une goulotte (de la moitié de sa largeur, s'il est étroit) ; une colonne
       qu'il ne fait que mordre s'écartera, et sans colonne à lui il en devient une. Dans deux colonnes à la fois, la pose
       est refusée — les fondre ferait passer les fils d'un flanc à travers toute la largeur de l'autre, et la goulotte qui
       les séparait disparaîtrait */
    const recouvre = f => Math.min(f.hi, z) - Math.max(f.lo, a), dedans = fixes.filter(f => recouvre(f) > seuil);
    const loin = b => Math.abs(b.x + b.w / 2 - (bx0 + bx1) / 2) + Math.max(0, b.y - y1, y0 - b.y - b.h);
    if (dedans.length > 1) { const autre = dedans.reduce((m, f) => recouvre(f) < recouvre(m) ? f : m); return { refus: 'pile', avec: autre.membres.reduce((m, b) => loin(b) < loin(m) ? b : m) }; }
    const sienne = dedans[0] || null, recollee = colle && Math.abs(bx0 - colle.x) < 0.5 && Math.abs(y0 - colle.y) < 0.5;
    // la pile : le bloc et chaque bloc de sa colonne, l'un au-dessus de l'autre (une pastille recollée est à côté de sa borne)
    if (sienne) for (const b of sienne.membres) if (y0 < b.y + b.h + ECART_RETOUCHE && b.y < y1 + ECART_RETOUCHE && !(recollee && b === porteur))
      return { refus: bx0 < b.x + b.w && b.x < bx1 ? 'chevauche' : 'pile', avec: b };
    // les colonnes, de gauche à droite : la sienne (avec lui), les autres de part et d'autre
    const G = sienne ? { lo: Math.min(sienne.lo, a), hi: Math.max(sienne.hi, z), items: [sienne, moi], moi: true } : { lo: a, hi: z, items: [moi], moi: true };
    const milieu = (G.lo + G.hi) / 2, cote = f => (f.lo + f.hi) / 2 < milieu;
    const grappes = [...fixes.filter(f => f !== sienne && cote(f)), G, ...fixes.filter(f => f !== sienne && !cote(f))]
      .map(f => f === G ? G : { lo: f.lo, hi: f.hi, items: [f] });
    const i = grappes.indexOf(G);
    // la poussée : chaque goulotte garde GOULOTTE_MIN, les colonnes s'écartent du bloc
    const s = grappes.map(() => 0);
    for (let j = i - 1; j >= 0; j--) s[j] = Math.min(0, grappes[j + 1].lo + s[j + 1] - GOULOTTE_MIN - grappes[j].hi);
    for (let j = i + 1; j < grappes.length; j++) s[j] = Math.max(0, grappes[j - 1].hi + s[j - 1] + GOULOTTE_MIN - grappes[j].lo);
    return { grappes, i, s, poussee: Math.max(0, ...s.map(Math.abs)) };
  };
  const poser = (dx, dy) => { const r = examiner(dx, dy); if (r.refus) return r;
    const colDe = new Map(), dec = new Map();
    const suivre = (b, k, ddx, ddy) => [b, ...sesTags(b)].forEach(c => { colDe.set(c, k); dec.set(c, [ddx, ddy]); });
    r.grappes.forEach((gr, k) => gr.items.forEach(it => it.membres.forEach(b => b === bloc ? suivre(b, k, dx, dy) : suivre(b, k, r.s[k], 0))));
    // une pastille qu'aucun bloc ne tient (il ne devrait pas y en avoir) : la colonne où elle est
    comps.forEach(c => { if (colDe.has(c)) return; const m = c.x + c.w / 2; let k = r.grappes.findIndex(gr => m >= gr.lo - 1 && m <= gr.hi + 1);
      if (k < 0) k = r.grappes.reduce((b, gr, j) => Math.abs((gr.lo + gr.hi) / 2 - m) < Math.abs((r.grappes[b].lo + r.grappes[b].hi) / 2 - m) ? j : b, 0);
      colDe.set(c, k); dec.set(c, [r.s[k], 0]); });
    const neuf = new Map(comps.map(c => [c, decalerBloc(c, dec.get(c)[0], dec.get(c)[1], colDe.get(c))]));
    neuf.set(bloc, { ...neuf.get(bloc), main: true });   // la main l'a posé là : on saura le rendre au moteur
    // chaque bout de fil suit son bloc, et prend la goulotte de sa nouvelle colonne ; une pastille libre, par son flanc
    const parNom = parNomDe(comps), libres = new Set(blocs.filter(c => c.kind === 'tag'));
    const bout = (nom, e) => { if (!e) return e; const c = blocDuBout(parNom, nom, e); if (!c) return e; const [ddx, ddy] = dec.get(c), col = colDe.get(c);
      if (!ddx && !ddy && col === c.col) return e;
      return { ...e, x: e.x + ddx, y: e.y + ddy, ch: Number.isInteger(c.col) && Number.isInteger(e.ch) ? e.ch - c.col + col : e.ch }; };
    const touche = new Set([bloc, ...sesTags(bloc)]), oublis = new Set();
    const links = layout.links.map((l, li) => { let A = bout(l.de, l.epA), B = bout(l.vers, l.epB);
      if (!l.shunt && !l.boucle && l.epA && l.epB) { const cA = blocDuBout(parNom, l.de, l.epA), cB = blocDuBout(parNom, l.vers, l.epB);
        if (touche.has(cA) || touche.has(cB)) oublis.add(li);   // ses fils ont changé de forme : ce que la main leur avait dit s'oublie
        if (libres.has(cA)) { const [t2, e] = boutDePastille(neuf.get(cA), B); neuf.set(cA, t2); A = e; }
        if (libres.has(cB)) { const [t2, e] = boutDePastille(neuf.get(cB), A); neuf.set(cB, t2); B = e; } }
      return A === l.epA && B === l.epB ? l : { ...l, epA: A, epB: B }; });
    const nouveaux = comps.map(c => neuf.get(c));
    const colX = r.grappes.map((gr, k) => gr.lo + r.s[k]), colW = r.grappes.map(gr => gr.hi - gr.lo);
    const chW = [g.chW[0], ...colX.slice(1).map((x, k) => x - colX[k] - colW[k]), g.chW[g.chW.length - 1]];
    let yMin = Infinity, yMax = -Infinity; const colonnes = colX.map(() => []), colonneDe = new Map();
    nouveaux.forEach(c => { colonneDe.set(c.id, c.col); if (c.kind === 'tag') return; colonnes[c.col].push(c.id); yMin = Math.min(yMin, c.y); yMax = Math.max(yMax, c.y + c.h); });
    const geom = { ...g, colX, colW, chW, nCols: colX.length, yMin, yMax, colonnes, colonneDe, libre: true };
    // les verticales imposées gardent leur place dans leur goulotte, décalées comme la colonne qui la borde
    const decCol = new Map(); fixes.forEach(f => { if (f.k >= 0 && f.membres.length) decCol.set(f.k, dec.get(f.membres[0])[0]); });
    geom.consignes = consignesSuivies(g.consignes, g, geom, ch => { for (const k of [ch - 1, ch]) if (decCol.has(k)) return decCol.get(k); return 0; }, oublis);
    if (muetsAvant == null) muetsAvant = layout.routage ? filsMuets(layout.routage, comps).length : 0;
    const R = routerEtElargir({ comps: nouveaux, links, geom }, r.i, muetsAvant);
    return { ...R.D, routage: R.routage, bloc: R.D.comps[comps.indexOf(bloc)], poussee: Math.max(0, ...r.s.map((v, k) => Math.abs(v + R.sx[k]))), muets: R.muets, muetsAvant };
  };
  let muetsAvant = null;
  return { examiner, poser, bloc, tags: sesTags(bloc), etendue: [flo, fhi], partenaire: p, colle };
}
/* Routé, le dessin se lit : une goulotte que ses pistes débordent (un bloc déplacé plie tous ses fils droits, une
   verticale posée à la main y ajoute une piste) s'élargit à leur pas plein ; un fil dont le dessin ne peut plus écrire le
   numéro (une verticale coupe un fil droit court) fait élargir les goulottes que traverse sa plus longue horizontale, de
   la largeur du numéro — gardé si ça en rend. Toujours en écartant les colonnes de la colonne `i` (celle du bloc posé ;
   -1 : tout s'écarte vers la droite), et l'on reroute. `avant` : les besoins du dessin d'avant le geste — seule une
   goulotte qui demande plus qu'avant s'élargit (une borne, un fil retouchés n'écartent rien d'autre). Rend { D, routage,
   sx (le décalage de chaque colonne), muets }. */
function routerEtElargir(D, i, muetsAvant, avant) {
  let routage = router(D); const sx = new Array(D.geom.colX.length).fill(0);
  const besoins = R => avant ? R.besoins.map((b, ch) => b > (avant[ch] || 0) + 0.5 ? b : 0) : R.besoins;
  for (let tour = 0; tour < 3; tour++) { const E = elargirGoulottes(D, besoins(routage), i); if (!E) break;
    D = E.dessin; E.sx.forEach((v, k) => { sx[k] += v; }); routage = router(D); }
  let muets = filsMuets(routage, D.comps);
  for (let tour = 0; tour < 2 && muets.length > muetsAvant; tour++) { const g2 = D.geom, n2 = g2.colX.length, besoins = g2.chW.slice();
    const x0 = ch => ch === 0 ? g2.colX[0] - g2.chW[0] : g2.colX[ch - 1] + g2.colW[ch - 1];
    muets.forEach(w => { let h = null; for (let j = 0; j + 1 < w.pts.length; j++) { const a = w.pts[j], b = w.pts[j + 1];
        if (Math.abs(a.y - b.y) < 0.6 && (!h || Math.abs(b.x - a.x) > h[1] - h[0])) h = [Math.min(a.x, b.x), Math.max(a.x, b.x)]; }
      if (!h) return; const larg = largeurTexte(String(w.cable).trim().length, FS_FIL, 0.1) + 14;
      for (let ch = 0; ch <= n2; ch++) if (h[1] > x0(ch) + 0.5 && h[0] < x0(ch) + g2.chW[ch] - 0.5) besoins[ch] = Math.max(besoins[ch], g2.chW[ch] + larg); });
    const E = elargirGoulottes(D, besoins, i); if (!E) break;
    const R2 = router(E.dessin), m2 = filsMuets(R2, E.dessin.comps); if (m2.length >= muets.length) break;
    D = E.dessin; routage = R2; muets = m2; E.sx.forEach((v, k) => { sx[k] += v; }); }
  return { D, routage, sx, muets: muets.length };
}
/* Les fils dont le dessin ne peut pas écrire le numéro : le dessin le dit (06, `reperesDeFil`), comme au juge
   (`compterMuets`), mais fil par fil. */
function filsMuets(R, comps) {
  if (typeof reperesDeFil !== 'function' || !R || !R.fils) return [];
  const fils = R.fils.filter(w => !w.shunt && String(w.cable || '').trim()); if (!fils.length) return [];
  const verticaux = verticauxDe([...fils.map(w => w.pts), ...tracesDePiquage(R.barrettes || [])]);
  const cs = comps.map(c => ({ ...c })), occ = occupationDe(fils, R.barrettes || [], cs); poserReperes(cs, occ);
  const ecrits = new Map(); (reperesDeFil(fils, verticaux, R.barrettes || [], occ).match(/>[^<]*<\/text>/g) || []).forEach(t => { const n = t.slice(1, -7); ecrits.set(n, (ecrits.get(n) || 0) + 1); });
  return fils.filter(w => { const n = esc(String(w.cable).trim()), k = ecrits.get(n) || 0; if (k) { ecrits.set(n, k - 1); return false; } return true; });
}
/* Élargir les goulottes d'un dessin retouché que leurs pistes débordent (`besoins`, la largeur qu'elles demandent au pas
   plein) : une goulotte à gauche de la colonne `i` (celle du bloc posé) écarte vers la gauche tout ce qui est à sa
   gauche, une goulotte à droite écarte vers la droite ; celles du bord s'élargissent vers le dehors. Rien à élargir :
   nul. Le bloc posé ne bouge jamais ; les verticales imposées suivent la colonne qui borde leur goulotte à gauche. */
function elargirGoulottes(D, besoins, i) { const g = D.geom, n = g.colX.length; if (!besoins) return null;
  const sx = new Array(n).fill(0), chW = g.chW.slice(); let rien = true;
  const manque = ch => (besoins[ch] || 0) - g.chW[ch];
  for (let ch = 0; ch <= n; ch++) { const d = manque(ch); if (d <= 0.5) continue; rien = false; chW[ch] += d;
    if (ch === 0 || ch === n) continue;
    if (ch <= i) for (let k = 0; k < ch; k++) sx[k] -= d; else for (let k = ch; k < n; k++) sx[k] += d; }
  if (rien) return null;
  const parNom = parNomDe(D.comps);
  const decale = c => sx[c.col] || 0;
  const bout = (nom, e) => { if (!e) return e; const c = blocDuBout(parNom, nom, e), d = c ? decale(c) : 0; return d ? { ...e, x: e.x + d } : e; };
  const links = D.links.map(l => { const A = bout(l.de, l.epA), B = bout(l.vers, l.epB); return A === l.epA && B === l.epB ? l : { ...l, epA: A, epB: B }; });
  const comps = D.comps.map(c => decalerBloc(c, decale(c), 0, c.col));
  const geom = { ...g, colX: g.colX.map((x, k) => x + sx[k]), chW };
  if (g.consignes) geom.consignes = consignesSuivies(g.consignes, g, geom, ch => sx[Math.max(0, ch - 1)] || 0, new Set());
  return { sx, dessin: { comps, links, geom } };
}
/* Les consignes d'un dessin dont les colonnes ont bougé (de `g` à `g2`) : une verticale imposée se décale comme la colonne
   qui borde sa goulotte (`decalage(ch)`) ; elle s'oublie si elle n'est plus dans une goulotte, ou si son fil est dans
   `oublis`. Les couloirs gardent leur hauteur ; une barrette à poser suit sa borne d'elle-même. */
function consignesSuivies(C, g, g2, decalage, oublis) { if (!C) return C;
  const x0 = (G, ch) => ch === 0 ? G.colX[0] - G.chW[0] : G.colX[ch - 1] + G.colW[ch - 1];
  const chDe = (G, x) => { for (let ch = 0; ch <= G.colX.length; ch++) { const a = x0(G, ch); if (x > a + 0.5 && x < a + G.chW[ch] - 0.5) return ch; } return -1; };
  const fils = (C.fils || []).filter(k => !oublis.has(k.li)).map(k => { if (!k.xs) return k;
    const xs = k.xs.map(x => { const ch = chDe(g, x); if (ch < 0) return null; const x2 = x + decalage(ch); return chDe(g2, x2) >= 0 ? x2 : null; }).filter(x => x != null);
    return xs.length || k.y != null ? { ...k, xs } : null; }).filter(Boolean);
  return { ...C, fils };
}

/* ---- LES BORNES : une borne glisse le long de son bloc ---------------------------------------------------
   `preparerBorne(layout, bloc, y0)` : la borne du bloc à la hauteur y0 — sur chaque flanc où elle sort (une borne
   d'équipement peut sortir des deux), avec sa pastille collée, et le bout de chacun de ses fils. Rend
     examiner(y)   où elle irait : { y, echange (la borne dont elle prend la place, qui prend la sienne), haut, bas (le
                   corps, grandi au besoin) } ou { refus: 'serre' | 'bloc', avec } — 'serre' : à moins d'un pas d'une autre
                   borne de son flanc, de deux d'une borne d'un autre connecteur (`deux`) ; 'bloc' : le corps grandirait sur un voisin
     poser(y)      le dessin routé, ou le refus.
   Deux bornes d'un même flanc gardent un pas (PRH) ; une borne garde sa marge au bord du corps — au-delà, le corps grandit
   (une barrette se resserre sur ses bornes, comme le placement la dessine). La hauteur que le moteur donnait à la borne
   reste écrite (`ya`) : la rendre au moteur, c'est la reposer là. */
const MARGE_BORNE = 9;
function preparerBorne(layout, bloc, y0) {
  const g = layout.geom, comps = layout.comps, lids = Object.keys(bloc.rangs || {}).filter(lid => bloc.rangs[lid].some(p => Math.abs(p.y - y0) < 0.5));
  if (bloc.kind === 'tag' || !lids.length) return null;
  const serre = bloc.kind === 'strip' && estBarrette(bloc.name);
  const voisins = comps.filter(o => o !== bloc && o.kind !== 'tag' && o.x < bloc.x + bloc.w && bloc.x < o.x + o.w);
  const examiner = y => {
    if (Math.abs(y - y0) < 0.5) return { y: y0, rien: true };
    const q = lids.flatMap(lid => bloc.rangs[lid]).filter(p => Math.abs(p.y - y0) >= 0.5).sort((u, v) => Math.abs(u.y - y) - Math.abs(v.y - y))[0];
    const echange = q && Math.abs(q.y - y) < PRH / 2 ? q.y : null, y1 = echange != null ? echange : y;
    const vers = v => Math.abs(v - y0) < 0.5 ? y1 : echange != null && Math.abs(v - echange) < 0.5 ? y0 : v;
    /* un pas entre deux bornes d'un flanc ; deux entre deux connecteurs (la lettre du second se lit au-dessus de sa pièce,
       comme le placement les sépare) — seulement autour de ce qui bouge */
    const bougent = [y1, ...(echange != null ? [y0] : [])];
    for (const lid of Object.keys(bloc.rangs)) { const ps = bloc.rangs[lid].map(p => ({ p, y: vers(p.y) })).sort((u, v) => u.y - v.y);
      for (let i = 1; i < ps.length; i++) { const u = ps[i - 1], v = ps[i]; if (!bougent.some(b => Math.abs(b - u.y) < 0.5 || Math.abs(b - v.y) < 0.5)) continue;
        const deux = u.p.cn && v.p.cn && u.p.cn !== v.p.cn;
        if (v.y - u.y < (deux ? 2 : 1) * PRH - 0.5) return { refus: 'serre', deux, avec: (Math.abs(u.y - y1) < 0.5 ? v : u).p }; } }
    const toutes = Object.values(bloc.rangs).flat().map(p => vers(p.y)), lo = Math.min(...toutes) - MARGE_BORNE, hi = Math.max(...toutes) + MARGE_BORNE;
    const haut = serre ? lo : Math.min(bloc.y, lo), bas = serre ? hi : Math.max(bloc.y + bloc.h, hi);
    if (haut < bloc.y - 0.5 || bas > bloc.y + bloc.h + 0.5) for (const o of voisins)
      if (haut < o.y + o.h + ECART_RETOUCHE && o.y < bas + ECART_RETOUCHE && !(bloc.y < o.y + o.h + ECART_RETOUCHE && o.y < bloc.y + bloc.h + ECART_RETOUCHE)) return { refus: 'bloc', avec: o };
    return { y: y1, echange, haut, bas, vers };
  };
  let muetsAvant = null;
  const poser = y => { const r = examiner(y); if (r.refus || r.rien) return r;
    // la borne, et celle dont elle prend la place ; chacune garde la hauteur que le moteur lui donnait
    const bouge = p => { const v = r.vers(p.y); if (Math.abs(v - p.y) < 0.01) return p; const ya = p.ya != null ? p.ya : p.y, q = { ...p, y: v };
      if (Math.abs(v - ya) < 0.5) delete q.ya; else q.ya = ya; return q; };
    const rangs = {}; Object.keys(bloc.rangs).forEach(lid => { rangs[lid] = bloc.rangs[lid].map(bouge).sort((u, v) => u.y - v.y); });
    const parCle = new Map(); (bloc.parCle || new Map()).forEach((v, k) => parCle.set(k, { ...v, y: r.vers(v.y) }));
    const c2 = { ...bloc, rangs, parCle, y: r.haut, h: r.bas - r.haut };
    // ses pastilles collées suivent leur borne
    const tags = new Map(pastillesDuBloc(comps, bloc, layout.links).map(t => { const S = (t.rangs.S || [])[0], dy = S ? r.vers(S.y) - S.y : 0; return [t, dy]; }).filter(([, dy]) => Math.abs(dy) > 0.01));
    const nouveaux = comps.map(c => c === bloc ? c2 : tags.has(c) ? decalerBloc(c, 0, tags.get(c), c.col) : c);
    const parNom = parNomDe(comps);
    const bout = (nom, e) => { if (!e) return e; const c = blocDuBout(parNom, nom, e);
      if (c === bloc) { const v = r.vers(e.y); return Math.abs(v - e.y) < 0.01 ? e : { ...e, y: v }; }
      return tags.has(c) ? { ...e, y: e.y + tags.get(c) } : e; };
    const links = layout.links.map(l => { const A = bout(l.de, l.epA), B = bout(l.vers, l.epB); return A === l.epA && B === l.epB ? l : { ...l, epA: A, epB: B }; });
    let yMin = Infinity, yMax = -Infinity; nouveaux.forEach(c => { if (c.kind === 'tag') return; yMin = Math.min(yMin, c.y); yMax = Math.max(yMax, c.y + c.h); });
    if (muetsAvant == null) muetsAvant = layout.routage ? filsMuets(layout.routage, comps).length : 0;
    const R = routerEtElargir({ comps: nouveaux, links, geom: { ...g, yMin, yMax, libre: true } }, bloc.col, muetsAvant, layout.routage && layout.routage.besoins);
    return { ...R.D, routage: R.routage, bloc: R.D.comps[comps.indexOf(bloc)], echange: r.echange, poussee: Math.max(0, ...R.sx.map(Math.abs)), muets: R.muets, muetsAvant };
  };
  return { examiner, poser, bloc, y0, lids };
}

/* ---- LES FILS : un tronçon pris à la main ------------------------------------------------------------
   `poserConsignes(layout, consignes)` : le dessin routé avec ces consignes (plus haut, `lireConsignes`), ses goulottes
   élargies au besoin (vers la droite) ; `muets` et `muetsAvant` disent si un numéro ne s'écrit plus. Sans aucune
   consigne, le dessin retombe sur ce que le routeur fait seul. */
function poserConsignes(layout, consignes) {
  const vide = !consignes || (!(consignes.fils || []).length && !(consignes.barrettes || []).length);
  const geom = { ...layout.geom }; if (vide) delete geom.consignes; else geom.consignes = consignes;
  const muetsAvant = layout.routage ? filsMuets(layout.routage, layout.comps).length : 0;
  const R = routerEtElargir({ comps: layout.comps, links: layout.links, geom }, -1, muetsAvant, layout.routage && layout.routage.besoins);
  return { ...R.D, routage: R.routage, poussee: Math.max(0, ...R.sx.map(Math.abs)), muets: R.muets, muetsAvant };
}
/* Un dessin retouché est-il SAIN ? Aucune oblique, aucun fil dans un bloc — le sien compris, hors de sa borne —, aucun
   segment partagé, aucun fil rompu. La retouche ne pose pas un dessin qui ne l'est pas. */
function routageSain(comps, R) { const fils = R.fils.filter(w => !w.shunt);
  if (fils.some(w => w.pts.some((p, i) => i && Math.abs(p.x - w.pts[i - 1].x) > 0.01 && Math.abs(p.y - w.pts[i - 1].y) > 0.01))) return false;
  if (filsDansBlocs(fils, comps.filter(c => c.kind !== 'tag'))) return false;
  if (typeof compterPartages === 'function' && compterPartages(fils)) return false;
  return !filsRompus(R.fils, R.barrettes);
}
