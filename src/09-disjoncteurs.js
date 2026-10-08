/* ===========================================================================
   09 bis — LES DISJONCTEURS : la courbe de disjonction, et le profil de charge
   qui doit rester à sa gauche
   ---------------------------------------------------------------------------
   Un disjoncteur thermique déclenche d'autant plus vite que le courant dépasse
   son calibre In : sa COURBE DE DISJONCTION donne le temps de déclenchement
   selon le multiple de In, à chaque température (normes/disjoncteurs.csv,
   l'Excel du lecteur : 125 °C, 23 °C la plus rapide et la plus lente, −55 °C).
   Le PROFIL DE CHARGE de ce qu'il protège — le démarrage (un courant pendant
   quelques secondes), la transition, le permanent — doit rester À GAUCHE de
   la courbe : à chaque phase, le disjoncteur tient plus longtemps que la phase
   ne dure. On juge sur la courbe la plus rapide (la plus chaude) ; les autres
   disent la marge. Le profil se lit en points cumulés : le courant dépasse
   celui d'une phase pendant toutes les phases au moins aussi fortes ; le
   permanent dure toujours et doit rester sous le premier multiple de la
   courbe, là où le disjoncteur ne déclenche jamais.
   Rien ici ne touche à la page : le moteur, comme 09.
   =========================================================================== */
'use strict';

// la gamme des calibres qu'on pose, en ampères
const CALIBRES = [1, 2, 2.5, 3, 4, 5, 7.5, 10, 15, 20, 25, 30, 35, 50];
// un disjoncteur : le code CB (102CB1)
const estDisjoncteur = r => { const q = lireRepere(r); return !!(q && q.num && q.code === 'CB'); };
/* Le calibre qu'un part number porte en queue : NSA935401-10 → 10 A ; rien si la queue n'est pas un nombre seul. */
const calibreDuPn = pn => { const m = /[-\s](\d{1,3}(?:[.,]\d)?)\s*A?$/i.exec(String(pn || '').trim()); return m ? parseFloat(m[1].replace(',', '.')) : null; };

/* Les courbes d'une famille, de la plus rapide (le premier multiple le plus bas) à la plus lente. Chaque courbe : ses
   points tels que lus (`brut`, pour le dessin) et son ENVELOPPE (`points`) : par multiple croissant, le temps ne remonte
   jamais — les points lus sur une figure tremblent un peu, et l'outil ne doit jamais croire le disjoncteur plus lent
   qu'il n'est. */
function courbesDeDisjonction(norme, famille) { const src = norme && norme.disjoncteurs && norme.disjoncteurs.length ? norme : normeDesModules(norme);
  const rows = (src.disjoncteurs || []).filter(d => !famille || d.famille === famille), m = new Map();
  rows.forEach(d => (m.get(d.courbe) || m.set(d.courbe, { nom: d.courbe, famille: d.famille, temperature: d.temperature, brut: [] }).get(d.courbe)).brut.push({ m: d.multiple, t: d.temps }));
  return [...m.values()].map(c => { const brut = c.brut.slice().sort((a, b) => a.m - b.m || b.t - a.t); let mn = Infinity;
    const points = brut.map(p => { mn = Math.min(mn, p.t); return { m: p.m, t: mn }; }); return { ...c, brut, points }; })
    .filter(c => c.points.length).sort((a, b) => a.points[0].m - b.points[0].m || a.nom.localeCompare(b.nom)); }
/* Le temps que le disjoncteur tient à ce multiple : sous le premier point, toujours (Infinity) ; entre deux points, une
   interpolation en log-log ; au-delà du dernier, la pente du dernier segment. */
function tempsDeDeclenchement(courbe, multiple) { const P = courbe.points; if (!P.length || !(multiple > 0)) return Infinity;
  if (multiple < P[0].m) return Infinity; if (P.length === 1) return P[0].t;
  let i = 1; while (i < P.length - 1 && P[i].m < multiple) i++;
  const a = P[i - 1], b = P[i]; if (b.m === a.m) return Math.min(a.t, b.t);
  const k = (Math.log(multiple) - Math.log(a.m)) / (Math.log(b.m) - Math.log(a.m));
  return Math.exp(Math.log(a.t) + k * (Math.log(b.t) - Math.log(a.t))); }
/* L'inverse : le multiple qu'une durée admet encore (« 5 s admettent jusqu'à 1,43 In ») ; une durée infinie, le premier
   multiple — en dessous, le disjoncteur ne déclenche jamais. */
function multipleAdmis(courbe, duree) { const P = courbe.points; if (!P.length) return Infinity; if (!isFinite(duree) || duree >= P[0].t) return P[0].m;
  if (duree <= P[P.length - 1].t) return P[P.length - 1].m; let i = 1; while (i < P.length - 1 && P[i].t > duree) i++;
  const a = P[i - 1], b = P[i]; if (a.t === b.t) return b.m; const k = (Math.log(duree) - Math.log(a.t)) / (Math.log(b.t) - Math.log(a.t));
  return Math.exp(Math.log(a.m) + k * (Math.log(b.m) - Math.log(a.m))); }

/* LE PROFIL en points (courant, durée cumulée) : chaque phase dure, pour la courbe, autant que toutes les phases au
   moins aussi fortes qu'elle — le démarrage seul s'il est le plus fort, puis la transition avec le démarrage, puis le
   permanent, pour toujours. Deux phases au même courant ne font qu'un point. Une phase sans courant ne compte pas. */
const NOMS_PHASES = { dem: 'démarrage', trans: 'transition', perm: 'permanent' };
function pointsDuProfil(profil) { profil = profil || {}; const n = v => { if (v == null || v === '') return null; const x = parseFloat(String(v).replace(',', '.')); return isNaN(x) ? null : x; };
  const phases = ['dem', 'trans', 'perm'].map(k => ({ k, nom: NOMS_PHASES[k], i: n(profil[k] && profil[k].i), t: k === 'perm' ? Infinity : n(profil[k] && profil[k].t) })).filter(p => p.i > 0 && p.t > 0);
  const pts = []; phases.forEach(p => { if (pts.some(q => q.i === p.i)) return;
    const t = phases.reduce((s, q) => q.i >= p.i ? s + q.t : s, 0); pts.push({ nom: phases.filter(q => q.i === p.i).map(q => q.nom).join(' et '), i: p.i, t }); });
  return pts.sort((a, b) => b.i - a.i); }
/* LE VERDICT : chaque point du profil contre chaque courbe — ce que le disjoncteur tient à ce multiple, et s'il tient
   plus que la phase ne dure (un permanent tient s'il ne déclenche jamais). Valide : tous les points tiennent sur la
   courbe la plus rapide. `calibreMini` : le plus petit calibre de la gamme qui tient. `pire` : le point le plus près de
   déclencher. */
function verdictDisjonction(norme, famille, calibre, profil) { const courbes = courbesDeDisjonction(norme, famille), pts = pointsDuProfil(profil);
  const juger = cal => pts.map(p => { const multiple = p.i / cal;
    const marges = courbes.map(c => { const temps = tempsDeDeclenchement(c, multiple), ok = p.t === Infinity ? temps === Infinity : temps > p.t;
      return { courbe: c.nom, temps, ok, rapport: p.t === Infinity ? (ok ? Infinity : 0) : temps / p.t, admis: multipleAdmis(c, p.t) * cal }; });
    return { ...p, multiple, marges, ok: marges.length ? marges[0].ok : null }; });
  const points = calibre > 0 ? juger(calibre) : pts.map(p => ({ ...p, multiple: null, marges: [], ok: null }));
  const valide = !!(calibre > 0 && courbes.length && pts.length) && points.every(p => p.ok);
  const calibreMini = courbes.length && pts.length ? CALIBRES.find(c => juger(c).every(p => p.ok)) || null : null;
  const pire = points.filter(p => p.marges.length).sort((a, b) => a.marges[0].rapport - b.marges[0].rapport)[0] || null;
  return { courbes, points, valide, calibreMini, pire, calibre: calibre > 0 ? calibre : null, sansProfil: !pts.length, sansCourbe: !courbes.length }; }

/* LA PROTECTION DES FILS. Chaque fil du disjoncteur — des deux côtés : le courant les traverse tous, et un dédoublement
   se partage on ne sait comment, chacun doit donc tenir tout — contre le profil et le calibre. Un fil tient si, à
   chaque phase, le courant reste sous ce que la norme des fils (EN 2853) admet pour cette durée (2 s, 10 s, 1 min,
   continu), déclassé comme la simulation (faisceau, ambiante) ; et le calibre ne devrait pas dépasser ce que le fil
   admet en continu — sinon une surcharge que le disjoncteur laisse passer cuit le fil. `fils` : [{ cable, type, … }]. */
function protectionDesFils(norme, calibre, profil, fils, hyp) { const H = { ...HYPOTHESES, ...(hyp || {}) }, pts = pointsDuProfil(profil), k = facteurDeclassement(norme, H.conditions);
  return (fils || []).map(f => { const jauge = jaugeDuType(f.type), fil = filDeNorme(norme, f.type, jauge);
    if (!fil || fil.intensite == null) return { ...f, fil: fil || null, jauge, continu: null, facteur: 1, phases: [], pire: null, verdict: 'inconnu' };
    const facteur = k * facteurAmbiante(fil, H.ambiante), continu = fil.intensite * facteur;
    const phases = pts.map(p => { const admise = intensiteAdmise(fil, p.t) * facteur; return { ...p, admise, palier: palierDe(p.t), ok: p.i <= admise + 1e-9 }; });
    const pire = phases.filter(p => !p.ok).sort((a, b) => b.i / b.admise - a.i / a.admise)[0] || null;
    return { ...f, fil, jauge, continu, facteur, phases, pire, approx: !!fil.approx, verdict: pire ? 'fil' : (calibre > 0 && calibre > continu + 1e-9) ? 'calibre' : 'ok' }; }); }
