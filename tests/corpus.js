/* ===========================================================================
   CORPUS — des câblages d'aéronef qu'aucun réglage n'a jamais vus.
   ---------------------------------------------------------------------------
   Les six folios de l'exemple ne suffisent pas : tout ce qu'on corrige doit
   valoir pour n'importe quel fichier. Ce générateur fabrique, d'une graine et
   d'un profil, un folio réaliste : calculateurs à connecteurs A, B, C ;
   barrettes de distribution à paquets pontés ; prises de coupure en paires
   (A / B) ; relais et lampes, pompes, vannes, interrupteurs, capteurs ;
   sondes blindées et leur barrette de reprise ; masses. Les mêmes graine et
   profil donnent toujours le même folio.

     simple    un calculateur, deux ou trois sous-ensembles
     moyen     un calculateur, quatre à six sous-ensembles
     charge    un calculateur, huit à dix sous-ensembles
     deux      deux calculateurs reliés directement et par des barrettes
     sans      sans calculateur : batterie, disjoncteur, barrette, chaînes
     prises    un calculateur, une chaîne de deux prises, des charges
     minimal   deux équipements, un à trois fils
     serie     batterie, disjoncteur, interrupteurs, relais, charges en chaîne
     etoile    un boîtier de six bornes vers ses charges
     connecteurs  un calculateur à quatre connecteurs
     piquages  une borne qui alimente deux ou trois charges
     rails     des charges sur 28V, L1, N, PE, GND
     barretteLongue  un bus de six à huit bornes pontées
     trois     trois calculateurs reliés deux à deux
     geant     un calculateur, douze à quatorze sous-ensembles
     geant2    deux calculateurs, six ou sept sous-ensembles chacun
     prisesChaine  deux paires de prises en chaîne
     mixte     un peu de tout

   `genererDansLaPage` s'évalue DANS la page (il appelle `liaison`) et rend
   les liaisons du folio.
   =========================================================================== */
function genererDansLaPage([graine, profil]) {
  let s = graine >>> 0;
  const r = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1)), pick = a => a[Math.floor(r() * a.length)];
  const L = []; let w = 100 + ri(0, 800); const zone = ri(1, 9) * 100;
  const fil = (de, bd, vers, bv, type) => L.push(liaison({ de, borneDe: String(bd), vers, borneVers: String(bv), cable: 'W-' + (w++), type: type || pick(['DR22', 'DR24', 'DR20']), plan: '1' }));
  let n = 0; const rep = code => (zone + (++n)) + code + ri(1, 9);
  const masse = () => (900 + ri(1, 30)) + 'G';
  const calcs = [];
  const calc = () => { const c = { nom: (zone + 50 + calcs.length) + 'XC' + (calcs.length + 1), p: { A: 0, B: 0, C: 0, D: 0 } }; calcs.push(c); return c; };
  const borne = (c, con) => con + (++c.p[con]);
  let nvt = 0; const vt = () => (zone + 60 + nvt) + 'VT' + ri(1, 9) + (++nvt);
  const sous = {
    // un départ du calculateur vers une barrette à paquet ponté, qui distribue à des charges
    barrette(c) { const v = vt(), k = ri(2, 4), m = masse(); fil(c.nom, borne(c, 'B'), v, 1, 'DR20');
      for (let i = 1; i < k; i++) fil(v, i, v, i + 1, 'DR20');
      for (let i = 1; i <= k; i++) { const ch = rep(pick(['PM', 'VL', 'LP', 'HT'])); fil(v, i, ch, 1);
        if (r() < 0.7) fil(ch, 2, m, '', 'DR22'); if (r() < 0.6) fil(ch, 3, c.nom, borne(c, 'A'), 'DR24'); } },
    // un relais commandé par le calculateur, sa lampe, parfois l'interrupteur de la lampe
    relaisLampe(c) { const rl = rep('RL'), lp = rep('LP'), m = masse(); fil(c.nom, borne(c, 'A'), rl, 'A1'); fil(rl, 'A2', m, '', 'DR24');
      fil(c.nom, borne(c, 'A'), rl, 'X1'); fil(rl, 'X2', lp, 1); fil(lp, 2, m, '', 'DR22'); if (r() < 0.5) { const sw = rep('SW'); fil(lp, 3, sw, 1); fil(sw, 2, c.nom, borne(c, 'A')); } },
    // un capteur blindé derrière une paire de prises de coupure
    capteurPrise(c) { const va = rep('VC') + 'A', vb = va.replace(/A$/, 'B'), cp = rep(pick(['CP', 'ST'])), k = ri(2, 3);
      for (let i = 1; i <= k; i++) { fil(c.nom, borne(c, 'C'), va, i, 'MLB24'); fil(va, i, vb, i, 'MLB24'); fil(vb, i, cp, i, 'MLB24'); }
      if (r() < 0.6) fil(cp, k + 1, masse(), '', 'DR22'); },
    // des sondes alimentées par une barrette, leurs blindages repris sur une seconde
    sondes(c) { const k = ri(2, 3), v = vt(), sh = vt(), m = masse(); fil(c.nom, borne(c, 'B'), v, 1, 'DR20');
      for (let i = 1; i < k + 1; i++) fil(v, i, v, i + 1, 'DR20');
      for (let i = 1; i <= k; i++) { const st = rep('ST'); fil(v, i + 1, st, 1); fil(st, 2, c.nom, borne(c, 'A'), 'MLB24'); fil(st, 3, sh, i, 'MLB24'); fil(st, 4, m, '', 'DR22'); }
      for (let i = 1; i < k + 1; i++) fil(sh, i, sh, i + 1, 'DR24'); fil(sh, k + 1, c.nom, borne(c, 'A'), 'DR24'); },
    pompe(c) { const pm = rep('PM'); fil(c.nom, borne(c, 'B'), pm, 1, 'DR20'); fil(pm, 2, masse(), '', 'DR20'); fil(pm, 3, c.nom, borne(c, 'A'), 'DR24'); },
    interrupteur(c) { const sw = rep('SW'); fil(sw, 1, c.nom, borne(c, 'A')); fil(sw, ri(2, 3), c.nom, borne(c, 'A')); },
    // un interrupteur qui commande un relais, qui alimente une pompe
    chaine(c) { const sw = rep('SW'), rl = rep('RL'), pm = rep('PM'), m = masse(); fil(c.nom, borne(c, 'B'), sw, 1); fil(sw, 2, rl, 'A1'); fil(rl, 'A2', m, '', 'DR24');
      fil(c.nom, borne(c, 'B'), rl, 'X1', 'DR20'); fil(rl, 'X2', pm, 1, 'DR20'); fil(pm, 2, m, '', 'DR20'); }
  };
  const types = Object.keys(sous);
  if (profil === 'simple') { const c = calc(); for (let i = 0, k = ri(2, 3); i < k; i++) sous[pick(['relaisLampe', 'pompe', 'interrupteur', 'barrette'])](c); }
  else if (profil === 'moyen') { const c = calc(); for (let i = 0, k = ri(4, 6); i < k; i++) sous[pick(types)](c); }
  else if (profil === 'charge') { const c = calc(); for (let i = 0, k = ri(8, 10); i < k; i++) sous[pick(types)](c); }
  else if (profil === 'deux') { const c1 = calc(), c2 = calc();
    for (let i = 0, k = ri(3, 4); i < k; i++) sous[pick(types)](c1); for (let i = 0, k = ri(3, 4); i < k; i++) sous[pick(types)](c2);
    for (let i = 0, k = ri(3, 6); i < k; i++) { if (r() < 0.5) { const v = vt(); fil(c1.nom, borne(c1, 'C'), v, 1); fil(v, 1, c2.nom, borne(c2, 'C')); } else fil(c1.nom, borne(c1, 'C'), c2.nom, borne(c2, 'C')); } }
  else if (profil === 'sans') { const bt = rep('BT'), cb = rep('CB'), v = vt(), m = masse(); fil(bt, 1, cb, 1, 'DR16'); fil(bt, 2, m, '', 'DR16'); fil(cb, 2, v, 1, 'DR16');
    const k = ri(3, 5); for (let i = 1; i < k; i++) fil(v, i, v, i + 1, 'DR16');
    for (let i = 1; i <= k; i++) { const sw = rep('SW'), rl = rep('RL'), ch = rep(pick(['LP', 'PM', 'VL'])); fil(v, i, sw, 1); fil(sw, 2, rl, 'A1'); fil(rl, 'A2', m, '', 'DR24');
      if (r() < 0.7) fil(v, i, rl, 'X1'); fil(rl, 'X2', ch, 1); fil(ch, 2, m, '', 'DR22'); } }
  else if (profil === 'prises') { const c = calc(), va = rep('VC') + 'A', vb = va.replace(/A$/, 'B'); let k = 0;
    for (let i = 0, nb = ri(4, 6); i < nb; i++) { const ch = rep(pick(['PM', 'VL', 'SW', 'HT', 'LP'])), npins = ri(1, 2);
      for (let j = 1; j <= npins; j++) { k++; fil(c.nom, borne(c, pick(['A', 'B'])), va, k); fil(va, k, vb, k); fil(vb, k, ch, j); }
      if (r() < 0.6) fil(ch, npins + 1, masse(), ''); } }
  // ---- du plus simple au plus complexe ----
  // deux équipements, un à trois fils, parfois une masse
  else if (profil === 'minimal') { const a = rep(pick(['SW', 'CB', 'RL'])), b = rep(pick(['LP', 'PM', 'VL'])), k = ri(1, 3);
    for (let i = 1; i <= k; i++) fil(a, i, b, i); if (r() < 0.6) fil(b, k + 1, masse(), ''); }
  // une chaîne : batterie, disjoncteur, interrupteur, relais (bobine et contact), charge
  else if (profil === 'serie') { const bt = rep('BT'), cb = rep('CB'), m = masse(); fil(bt, 1, cb, 1, 'DR16'); fil(bt, 2, m, '', 'DR16');
    let prec = [cb, 2]; for (let i = 0, k = ri(1, 3); i < k; i++) { const sw = rep('SW'), rl = rep('RL'), ch = rep(pick(['LP', 'PM', 'VL', 'HT']));
      fil(prec[0], prec[1], sw, 1); fil(sw, 2, rl, 'A1'); fil(rl, 'A2', m, '', 'DR24'); fil(cb, 2, rl, 'X1', 'DR20'); fil(rl, 'X2', ch, 1, 'DR20'); fil(ch, 2, m, '', 'DR20');
      prec = [ch, 3]; } }
  // un boîtier de six bornes (pas un calculateur) vers quatre à six charges
  else if (profil === 'etoile') { const bx = rep(pick(['RC', 'CD', 'GH'])); let j = 0;
    for (let i = 0, k = ri(4, 6); i < k; i++) { const ch = rep(pick(['LP', 'PM', 'VL', 'HT', 'SW'])); fil(bx, ++j, ch, 1); if (r() < 0.5) fil(ch, 2, masse(), ''); } }
  // un calculateur à quatre connecteurs ; une charge parle parfois à deux connecteurs
  else if (profil === 'connecteurs') { const c = calc(), cons = ['A', 'B', 'C', 'D'];
    for (let i = 0, k = ri(5, 8); i < k; i++) { const ch = rep(pick(['LP', 'PM', 'VL', 'HT', 'SW', 'RL', 'ST'])), n = ri(1, 3);
      for (let j = 1; j <= n; j++) fil(c.nom, borne(c, pick(cons)), ch, j); if (r() < 0.5) fil(ch, n + 1, masse(), ''); } }
  // des piquages : une borne alimente deux ou trois charges
  else if (profil === 'piquages') { const cb = rep('CB'), bt = rep('BT'), m = masse(); fil(bt, 1, cb, 1, 'DR16'); fil(bt, 2, m, '', 'DR16');
    for (let i = 0, k = ri(2, 4); i < k; i++) { const ch = rep(pick(['LP', 'PM', 'VL', 'HT'])); fil(cb, 2, ch, 1, 'DR20'); fil(ch, 2, m, '', 'DR20'); }
    if (r() < 0.6) { const rl = rep('RL'), sw = rep('SW'); fil(cb, 2, sw, 1); fil(sw, 2, rl, 'A1'); fil(rl, 'A2', m, ''); fil(cb, 2, rl, 'X1'); fil(rl, 'X2', rep('LP'), 1); } }
  // des rails : charges sur 28V, L1, N, PE, GND
  else if (profil === 'rails') { const rails = ['28V', 'L1', 'N', 'PE', 'GND'];
    for (let i = 0, k = ri(3, 6); i < k; i++) { const ch = rep(pick(['LP', 'PM', 'VL', 'HT', 'RL'])); fil(pick(rails.slice(0, 2)), '', ch, 1); fil(ch, 2, pick(rails.slice(2)), '');
      if (r() < 0.4) fil(ch, 3, rep('SW'), 1); } }
  // une barrette longue : un bus de six à huit bornes pontées, une charge par borne, certaines commandées par un calculateur
  else if (profil === 'barretteLongue') { const c = calc(), cb = rep('CB'), v = vt(), k = ri(6, 8), m = masse(); fil(cb, 2, v, 1, 'DR20'); fil(c.nom, borne(c, 'A'), cb, 1);
    for (let i = 1; i < k; i++) fil(v, i, v, i + 1, 'DR20');
    for (let i = 1; i <= k; i++) { const ch = rep(pick(['LP', 'PM', 'VL', 'HT'])); fil(v, i, ch, 1); fil(ch, 2, m, '', 'DR22'); if (r() < 0.5) fil(ch, 3, c.nom, borne(c, 'B'), 'DR24'); } }
  // trois calculateurs, chacun ses sous-ensembles, reliés deux à deux (directement ou par une barrette)
  else if (profil === 'trois') { const cs = [calc(), calc(), calc()];
    cs.forEach(c => { for (let i = 0, k = ri(2, 3); i < k; i++) sous[pick(['relaisLampe', 'pompe', 'interrupteur', 'barrette', 'capteurPrise'])](c); });
    [[0, 1], [1, 2], [0, 2]].forEach(([a, b]) => { for (let i = 0, k = ri(1, 3); i < k; i++) { if (r() < 0.4) { const v = vt(); fil(cs[a].nom, borne(cs[a], 'C'), v, 1); fil(v, 1, cs[b].nom, borne(cs[b], 'C')); }
      else fil(cs[a].nom, borne(cs[a], 'C'), cs[b].nom, borne(cs[b], 'C')); } }); }
  // un calculateur et douze à quatorze sous-ensembles
  else if (profil === 'geant') { const c = calc(); for (let i = 0, k = ri(12, 14); i < k; i++) sous[pick(types)](c); }
  // deux calculateurs, six ou sept sous-ensembles chacun, reliés
  else if (profil === 'geant2') { const c1 = calc(), c2 = calc();
    for (let i = 0, k = ri(6, 7); i < k; i++) sous[pick(types)](c1); for (let i = 0, k = ri(6, 7); i < k; i++) sous[pick(types)](c2);
    for (let i = 0, k = ri(4, 6); i < k; i++) fil(c1.nom, borne(c1, 'C'), c2.nom, borne(c2, 'C')); }
  // deux paires de prises en chaîne : certains fils s'arrêtent après la première, d'autres traversent les deux
  else if (profil === 'prisesChaine') { const c = calc(), a1 = rep('VC') + 'A', b1 = a1.replace(/A$/, 'B'), a2 = rep('VC') + 'A', b2 = a2.replace(/A$/, 'B'); let k1 = 0, k2 = 0;
    for (let i = 0, nb = ri(4, 6); i < nb; i++) { const ch = rep(pick(['PM', 'VL', 'SW', 'HT', 'LP'])), loin = r() < 0.5;
      k1++; fil(c.nom, borne(c, pick(['A', 'B'])), a1, k1); fil(a1, k1, b1, k1);
      if (loin) { k2++; fil(b1, k1, a2, k2); fil(a2, k2, b2, k2); fil(b2, k2, ch, 1); } else fil(b1, k1, ch, 1);
      if (r() < 0.6) fil(ch, 2, masse(), ''); } }
  // un peu de tout : un calculateur, ses sous-ensembles, une paire de prises, des rails
  else if (profil === 'mixte') { const c = calc(); for (let i = 0, k = ri(4, 6); i < k; i++) sous[pick(types)](c);
    const va = rep('VC') + 'A', vb = va.replace(/A$/, 'B'); for (let j = 1, k = ri(2, 3); j <= k; j++) { fil(c.nom, borne(c, 'A'), va, j); fil(va, j, vb, j); fil(vb, j, rep('LP'), 1); }
    for (let i = 0, k = ri(1, 3); i < k; i++) { const ch = rep(pick(['HT', 'PM'])); fil('28V', '', ch, 1); fil(ch, 2, 'GND', ''); fil(ch, 3, c.nom, borne(c, 'B')); } }
  return L;
}
// les six premiers gardent leurs graines (le banc reste comparable d'une passe à l'autre) ; les suivants, du plus simple au plus complexe
const PROFILS = ['simple', 'moyen', 'charge', 'deux', 'sans', 'prises',
  'minimal', 'serie', 'etoile', 'connecteurs', 'piquages', 'rails', 'barretteLongue', 'trois', 'geant', 'geant2', 'prisesChaine', 'mixte'];

module.exports = { genererDansLaPage, PROFILS };
