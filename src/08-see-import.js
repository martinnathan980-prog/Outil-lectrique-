/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   LA BASE SEE PRISE PAR VOLTA (08 nonies, l'import) — ce que le classeur de SEE apporte aux tables du moteur
   Le lecteur (octobre 2026) : « on peut garder ces données sur notre PC, pas de souci ; SEE gagnera toujours, mais il
   faut bien mettre en évidence la différence ; les règles obsolètes, on s'en fout ; moi je travaille sur l'EC225, mais
   à terme c'est pour tout le monde ». Du classeur déposé (08-see lit ses feuilles), Volta tire :
     · CONTACTS — une ligne par contact des règles d'end fitting (EED_OBJ_END_Fitting_Rules_Contact) : la famille du
       connecteur (le nom de la règle : « EN2997 », « E0710 - Plug/Square Receptacle »), le sexe, la taille de la
       cavité, le type et la gauge du câble (SEE écrit les gauges en mm² : 0,5179 = 20 ; « * » tout type, −1 toute
       gauge), le contact (PartNo1) et ce qui va avec (PartNo2 à 6). Les règles obsolètes sont ignorées, celles « In
       Work » prises « à confirmer » ; deux règles qui disent la même clé : la validée, la plus récente, le plus petit
       numéro de règle ;
     · CÂBLES — EED_ViewCablesAndWires, et ses conducteurs par EED_LNK_Wires_Equi (la résistance, en Ω/m) : le
       diamètre, la masse, les brins, le blindage, la résistance, la section hors-tout ;
     · FACES — les arrangements (EED_ViewContactLayouts, « EN3645_23N55 ») et leurs broches (EED_OBJ_PlugMapPin : le
       nom, X et Y en mètres, la taille de cavité, Standard/Coax/Triax) : une ligne Modules, la face à l'échelle ;
     · ÉQUIPEMENTS — chaque référence de connecteur et d'équipement (désignation, catégorie, fiche ou embase, broches ou
       douilles, nombre de contacts, programmes, statut) et la paire fiche ↔ embase (EED_LNK_Equi_Mating) : ce que la
       fiche d'un équipement dit de sa référence.
   Ce qui est pris se GARDE sur ce PC (IndexedDB, jamais ailleurs ; « Oublier la base SEE » l'efface) et passe DEVANT
   les tables de Volta (normes/*.csv et ce qui a été importé), sauf ce que l'utilisateur a corrigé à la main sur la page
   des normes. Chaque différence avec ce que disait Volta se voit (onglet « Import », et sur la fiche). Jamais pris :
   qui a fait quoi (utilisateurs, postes, rôles), les dates.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const IDB_SEE = 'volta-see', CLE_PROGRAMME_SEE = 'atelier.see.programme';
// la base gardée : { v, nom, quand, contacts, cables, modules (lignes brutes des tables), equipements, bilan, programmes } ;
// `norme` : ses lignes lues par le moteur (calculées une fois) ; `index` : référence → équipement
const BASE_SEE = { base: null, norme: null, index: null, charge: false };
// les feuilles que l'import lit, par le nom court de 08-see (EED_View… et EED_ ôtés ; Excel tronque à 31 caractères)
const FEUILLES_IMPORT_SEE = { regles: /^EndFittingRules$/i, contacts: /^OBJ_END_Fitting_Rules_Cont/i, cables: /^CablesAndWires$/i, fils: /^OBJ_Wires$/i,
  filsCables: /^LNK_Wires_Equi$/i, arrangements: /^ContactLayouts$/i, broches: /^OBJ_PlugMapPin$/i, connecteurs: /^ConnectiveEquipments$/i,
  equipements: /^Equipments$/i, accouplements: /^LNK_Equi_Mating$/i };
const cleFeuilleImportSEE = nom => { const c = nomCourtSEE(nom); return Object.keys(FEUILLES_IMPORT_SEE).find(k => FEUILLES_IMPORT_SEE[k].test(c)) || ''; };

/* ---- lire une feuille par le nom de ses colonnes -------------------------------------------------------------- */
// une feuille : { lignes, col } ; `val(r, 'PartNo')` la cellule, quelle que soit la casse de l'en-tête
function tableImportSEE(rows) { if (!rows || !rows.length) return null; const k = rows.findIndex(r => Array.isArray(r) && r.filter(c => String(c).trim()).length > 1); if (k < 0) return null;
  const col = new Map(); rows[k].forEach((c, i) => { const n = String(c == null ? '' : c).trim().toLowerCase(); if (n && !col.has(n)) col.set(n, i); });
  return { col, lignes: rows.slice(k + 1).filter(r => Array.isArray(r) && r.some(c => c !== '' && c != null)) }; }
const aColSEE = (T, nom) => !!T && T.col.has(nom.toLowerCase());
const valSEE = (T, r, nom) => { const i = T.col.get(nom.toLowerCase()); if (i == null) return ''; const v = r[i]; return v == null ? '' : typeof v === 'string' ? v.trim() : v; };
const numSEE = v => { if (typeof v === 'number') return isFinite(v) ? v : null; const s = String(v == null ? '' : v).trim().replace(',', '.'); if (!s) return null; const x = +s; return isFinite(x) ? x : null; };
const idSEE = (T, r, nom) => { const v = valSEE(T, r, nom); return v === '' ? '' : cleGuidSEE(v); };
// le statut d'une pièce : validée (Release), en cours (In Work), obsolète
const statutSEE = s => { const t = String(s || '').toLowerCase(); return /obsol/.test(t) ? 'obsolète' : /work|cours/.test(t) ? 'en cours' : /releas|valid/.test(t) ? 'validée' : ''; };
// un nombre de SEE tel que Volta l'écrit (0.0140000004 → 0,014 ; en mm : × 1000)
const arrondiSEE = (x, n) => x == null ? '' : String(Number(x.toFixed(n == null ? 4 : n)));
const mmSEE = x => x == null ? null : x < 0.1 ? x * 1000 : x;   // SEE écrit les longueurs en m ; une valeur ≥ 0,1 est déjà en mm

/* LA FAMILLE qu'une règle nomme : « EN2997 », « EN 3645 EN 4165 », « E0710 - Plug/Square Receptacle » → EN2997 ;
   EN3645, EN4165 ; E0710. Le « pr » d'un projet de norme ne compte pas (prEN3645 = EN3645). */
function famillesDeRegleSEE(pn) { const tete = String(pn || '').split(/\s[-–]\s/)[0].toUpperCase();
  const fs = [...tete.matchAll(/(?:^|[^A-Z])(?:PR)?([A-Z]{1,5})\s?-?(\d{3,6})/g)].map(m => m[1] + m[2]);
  return fs.length ? [...new Set(fs)] : [cleNorme(tete)].filter(Boolean); }
/* La famille et la variante d'un arrangement : « EN3645_23N55 » → EN3645, 23N55 ; « prEN3646-18-11 » → EN3646, 18-11. */
function arrangementSEE(pn, chemin) { const s = String(pn || '').trim().replace(/\s+version\s+\d+$/i, '');
  const m = /^(?:pr)?\s*([A-Z]{1,5})\s?-?(\d{3,6})\s*[_\s-]+\s*(.+)$/i.exec(s);
  if (m) return { famille: (m[1] + m[2]).toUpperCase(), variante: m[3].trim().toUpperCase().replace(/\s+/g, '') };
  const c = /(?:pr)?([A-Z]{1,5})\s?(\d{3,6})/i.exec(String(chemin || '')); return c ? { famille: (c[1] + c[2]).toUpperCase(), variante: cleNorme(s) } : null; }

/* ---- IMPORTER : les feuilles lues → les lignes des tables, et le bilan ------------------------------------------ */
function importerSEE(L, nom) { const T = {}; Object.keys(FEUILLES_IMPORT_SEE).forEach(k => { T[k] = L && L[k] ? tableImportSEE(L[k]) : null; });
  const B = { feuilles: Object.keys(FEUILLES_IMPORT_SEE).filter(k => !T[k]) };
  const contacts = contactsDeSEE(T, B), cables = cablesDeSEE(T, B), modules = modulesDeSEE(T, B), eq = equipementsDeSEE(T, B);
  return { v: 1, nom: nom || 'la base SEE', quand: Date.now(), contacts, cables, modules, equipements: eq.liste, programmes: eq.programmes, bilan: B }; }

/* LES CONTACTS : une ligne par clé (famille, sexe, taille, type, gauge) — la meilleure des règles qui la disent. */
function contactsDeSEE(T, B) { const R = T.regles, C = T.contacts, b = B.contacts = { regles: 0, validees: 0, enCours: 0, obsoletes: 0, autres: {}, lignes: 0, ignorees: 0, sansRegle: 0, sansFil: 0, jaugeIllisible: 0, tailleIllisible: 0, sansContact: 0, conflits: 0, familles: {} };
  if (!R || !C) return [];
  const regles = new Map();
  R.lignes.forEach(r => { const st = statutSEE(valSEE(R, r, 'LCStatusName')), classe = String(valSEE(R, r, 'ClassName') || 'Contact'), pn = String(valSEE(R, r, 'PartNo'));
    const g = { pn, familles: famillesDeRegleSEE(pn), statut: st, version: numSEE(valSEE(R, r, 'Version')) || 0, classe }; b.regles++;
    if (st === 'obsolète') b.obsoletes++; else if (!/^contact/i.test(classe)) b.autres[classe] = (b.autres[classe] || 0) + 1; else if (st === 'en cours') b.enCours++; else b.validees++;
    [idSEE(R, r, 'ID'), idSEE(R, r, 'IDEquipment')].filter(Boolean).forEach(id => regles.set(id, g)); });
  const best = new Map(), rang = (g, n) => [g.statut === 'en cours' ? 0 : 1, g.version, -(n || 0)];
  const mieux = (a, b2) => { for (let i = 0; i < a.length; i++) if (a[i] !== b2[i]) return a[i] > b2[i]; return false; };
  C.lignes.forEach(r => { b.lignes++; const g = regles.get(idSEE(C, r, 'IDEquipment'));
    if (!g) { b.sansRegle++; return; } if (g.statut === 'obsolète' || !/^contact/i.test(g.classe)) { b.ignorees++; return; }
    // le sexe : Male / Female, et aussi Pin (une broche : mâle) / Socket (une douille : femelle)
    const ct = String(valSEE(C, r, 'ContactType') || ''), sexe = /^(m|pin|broche)/i.test(ct) ? 'M' : /^(f|socket|douille)/i.test(ct) ? 'F' : '';
    // la cavité : sa section en mm², lue en AWG ; −1 : toute taille (comme la gauge −1 : toute gauge)
    const cg = valSEE(C, r, 'ContactGauge'), cgn = numSEE(cg), taille = cgn === -1 ? '*' : awgSEE(cgn); if (taille === '*') b.touteTaille = (b.touteTaille || 0) + 1; if (!taille || !sexe) { b.tailleIllisible++; illisibleSEE(b, (sexe ? '' : 'sexe « ' + (ct || 'vide') + ' » · ') + (taille ? 'taille ' + taille : 'cavité ' + (cg === '' ? 'vide' : numSEE(cg) != null ? nombre(numSEE(cg)) + ' mm²' : '« ' + cg + ' »'))); return; }
    const wg = numSEE(valSEE(C, r, 'WireGauge')); let jauge;
    if (wg === -2) { b.sansFil++; return; } if (wg == null || wg === -1) jauge = '*'; else { jauge = awgSEE(wg); if (!jauge) { b.jaugeIllisible++; return; } }
    const contact = String(valSEE(C, r, 'PartNo1') || '').trim(); if (!contact) { b.sansContact++; return; }
    const avec = [2, 3, 4, 5, 6].map(k => { const p = String(valSEE(C, r, 'PartNo' + k) || '').trim(), q = numSEE(valSEE(C, r, 'Quantity' + k)); return p ? (q > 1 ? q + ' × ' : '') + p : ''; }).filter(Boolean).join(' + ');
    const q1 = numSEE(valSEE(C, r, 'Quantity1')), n = numSEE(valSEE(C, r, 'RuleNum'));
    g.familles.forEach(famille => { const brut = { famille, sexe, taille, typeFil: String(valSEE(C, r, 'WireType') || '*'), jauge, reference: contact, accessoire: avec,
        note: 'SEE · règle ' + g.pn + (g.version ? ' v' + g.version : '') + (n != null ? ' n° ' + n : '') + (q1 > 1 ? ' · ' + q1 + ' contacts' : '') + (g.statut === 'en cours' ? ' · règle en cours (In Work)' : ''),
        statut: g.statut === 'en cours' ? 'à confirmer' : '' };
      const x = contactNorme(brut); if (!x) { b.tailleIllisible++; illisibleSEE(b, famille + ' · taille ' + taille); return; } const k = cleDeLigne('contacts', x), e = best.get(k), rg = rang(g, n);
      if (!e) best.set(k, { brut, rg }); else { if (e.brut.reference !== contact) b.conflits++; if (mieux(rg, e.rg)) best.set(k, { brut, rg }); } }); });
  const out = [...best.values()].map(x => x.brut); out.forEach(x => { b.familles[x.famille] = (b.familles[x.famille] || 0) + 1; }); b.retenues = out.length;
  b.illisibles = Object.fromEntries(Object.entries(b.illisibles || {}).sort((u, v) => v[1] - u[1]).slice(0, 6)); return out; }
// ce qui n'a pas pu se lire, compté par valeur brute : les six plus fréquentes se montrent (l'onglet Import, « Ce qui n'est pas pris »)
function illisibleSEE(b, k) { const m = b.illisibles || (b.illisibles = {}); m[k] = (m[k] || 0) + 1; }

/* LES CÂBLES : la vue, ses conducteurs (le lien câble ↔ conducteur, sinon l'IDCable du conducteur), la plus récente des
   versions validées d'une même référence. */
function cablesDeSEE(T, B) { const V = T.cables, b = B.cables = { lus: 0, retenus: 0, sansConducteur: 0, obsoletes: 0 }; if (!V) return [];
  const W = T.fils, Lk = T.filsCables, fils = new Map(), parCable = new Map();
  if (W) W.lignes.forEach(r => { const id = idSEE(W, r, 'ID'); if (!id) return; const f = { r: numSEE(valSEE(W, r, 'Resistivity')), s: numSEE(valSEE(W, r, 'SectionInMM')), g: numSEE(valSEE(W, r, 'Gauge')) }; fils.set(id, f);
    const c = idSEE(W, r, 'IDCable'); if (c) (parCable.get(c) || parCable.set(c, []).get(c)).push(f); });
  if (Lk) Lk.lignes.forEach(r => { const c = idSEE(Lk, r, 'IDEquipment'), f = fils.get(idSEE(Lk, r, 'IDWire')); if (!c || !f) return; const xs = parCable.get(c) || parCable.set(c, []).get(c); if (!xs.includes(f)) xs.push(f); });
  const masseCol = ['LineicWeight', 'Weight'].find(c => aColSEE(V, c)), best = new Map();
  V.lignes.forEach(r => { b.lus++; const pn = String(valSEE(V, r, 'PartNo') || '').trim(); if (!pn) return; const st = statutSEE(valSEE(V, r, 'LCStatusName')); if (st === 'obsolète') b.obsoletes++;
    const conds = [idSEE(V, r, 'ID'), idSEE(V, r, 'IDEquipment')].map(id => parCable.get(id)).find(Boolean) || [];
    if (!conds.length) b.sansConducteur++;
    const type = String(valSEE(V, r, 'Type') || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), cle = cleNorme(pn), famille = type && cle.startsWith(type) ? type : (cle.match(/^[A-Z]+/) || [''])[0];
    const jauge = awgSEE(numSEE(valSEE(V, r, 'Gauge'))) || (cle.match(/(\d+)$/) || ['', ''])[1];
    const d = mmSEE(numSEE(valSEE(V, r, 'ExternalMaxDiameter'))), m = masseCol ? numSEE(valSEE(V, r, masseCol)) : null, rs = conds.map(f => f.r).filter(x => x != null && x > 0);
    // le blindage : SHIELDED / UNSHIELDED ; une case vide ne dit rien (Volta garde le sien : cablesCompletesSEE)
    const sh = String(valSEE(V, r, 'Shield') || '').trim(), blinde = sh ? !/^unshield|^non|^no$/i.test(sh) : null, nf = String(valSEE(V, r, 'CableFamily') || '').toLowerCase();
    // les brins : les conducteurs reliés, sinon TotalNumberOfWires ; rien des deux : SEE ne le dit pas (Volta garde le sien)
    const nw = numSEE(valSEE(V, r, 'TotalNumberOfWires')), brins = conds.length || (nw > 0 ? Math.round(nw) : null);
    const nature = /coax/.test(nf) ? 'coaxial' : /twinax/.test(nf) ? 'twinax' : /quadrax/.test(nf) ? 'quadrax' : /optic|fib/.test(nf + ' ' + String(valSEE(V, r, 'CategoryFullPath')).toLowerCase()) ? 'fibre optique' : '';
    const brut = { cable: pn, famille, jauge, brins: brins == null ? '' : String(brins), blindage: blinde == null ? '' : blinde ? '1' : '0', nature, masse: m != null && m > 0 ? arrondiSEE(m < 1 ? m * 1000 : m, 2) : '',
      liaisons: String((brins || 1) + (blinde ? 1 : 0)), resistance: rs.length ? arrondiSEE(Math.max(...rs) * 1000, 2) : '', diametre: d != null && d > 0 ? arrondiSEE(d, 2) : '',
      section: d != null && d > 0 ? arrondiSEE(Math.PI * d * d / 4, 2) : '', note: 'SEE' + (st === 'obsolète' ? ' · obsolète dans SEE' : st === 'en cours' ? ' · en cours (In Work)' : '') };
    const rg = [st === 'validée' ? 2 : st === 'en cours' ? 1 : 0, numSEE(valSEE(V, r, 'Version')) || 0], e = best.get(cle);
    if (!e || rg[0] > e.rg[0] || (rg[0] === e.rg[0] && rg[1] > e.rg[1])) best.set(cle, { brut, rg }); });
  const out = [...best.values()].map(x => x.brut); b.retenus = out.length; return out; }

/* CE QUE SEE NE DIT PAS, VOLTA LE GARDE. SEE gagne sur ce qu'il dit ; une case vide de SEE n'efface rien : la nature
   d'un câble (torsadé, blindé : SEE ne la nomme que pour un coaxial, un twinax, une fibre), son Ø, sa masse, sa
   résistance, ses brins quand aucun conducteur n'est relié, son blindage quand la colonne est vide — Volta remplit la
   case, la note le dit. */
const CHAMPS_COMPLETES_SEE = ['brins', 'nature', 'masse', 'resistance', 'diametre', 'section', 'blindage'];
function cablesCompletesSEE(bruts, voltas) { const V = new Map((voltas || []).map(c => [cleDeLigne('cables', c), c]));
  return (bruts || []).map(b => { const v = V.get(cleNorme(b.cable)); if (!v) return b; const x = { ...b }, pris = [];
    CHAMPS_COMPLETES_SEE.forEach(k => { if (String(x[k] == null ? '' : x[k]).trim() !== '') return; const w = v[k];
      if (k === 'blindage') { x.blindage = w ? '1' : '0'; return; } if (w == null || w === '') return; x[k] = String(w); pris.push(k); });
    if (b.blindage === '' || b.brins === '') x.liaisons = String((+x.brins || 1) + (x.blindage === '1' ? 1 : 0));
    if (pris.length) x.note = (x.note || 'SEE') + ' · de Volta : ' + pris.join(', ');
    return x; }); }

/* LES NOMS DES CONTACTS D'UNE FACE, À LA CASSE DE LA NORME. SEE écrit un nom de contact sans sa casse, la même pour
   toute la base (c, e, f, k, m, w, z en minuscules, le reste en majuscules — lu sur la vraie base, octobre 2026) : sur
   une 38999 de 55 contacts, C et c y portent le même nom. Pour une face que Volta connaît, chaque broche de SEE reprend
   le nom de la norme de même lettre (la casse seule diffère) ; deux candidats (C et c), c'est la place qui tranche — la
   plus proche, la face ramenée à son rayon (C au bord, c au milieu). Un nom que la norme n'a pas reste celui de SEE.
   Si deux broches gardent un même nom, la face de SEE ne se lit pas sans ambiguïté : Volta garde la sienne. */
function nomsDeLaNormeSEE(pins, vs) { const norm = ps => { const xs = ps.map(p => p.x), ys = ps.map(p => p.y), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const R = Math.max(1e-9, ...ps.map(p => Math.hypot(p.x - cx, p.y - cy))); return ps.map(p => ({ nom: p.nom, u: (p.x - cx) / R, v: (p.y - cy) / R })); };
  const P = norm(pins), W = norm(vs), noms = pins.map(p => p.nom), parCle = new Map(), groupes = new Map();
  W.forEach(w => { const k = w.nom.toLowerCase(); (parCle.get(k) || parCle.set(k, []).get(k)).push(w); });
  P.forEach((p, i) => { const k = p.nom.toLowerCase(); (groupes.get(k) || groupes.set(k, []).get(k)).push(i); });
  groupes.forEach((is, k) => { const ws = parCle.get(k) || []; if (!ws.length) return; const paires = [];
    is.forEach(i => ws.forEach((w, j) => paires.push([Math.hypot(P[i].u - w.u, P[i].v - w.v), i, j]))); paires.sort((a, b) => a[0] - b[0]);
    const pi = new Set(), pj = new Set(); paires.forEach(([, i, j]) => { if (pi.has(i) || pj.has(j)) return; pi.add(i); pj.add(j); noms[i] = ws[j].nom; }); });
  return noms; }
/* Les faces de SEE prêtes à prendre : leurs noms à la casse de la norme, celles qui restent ambiguës écartées (Volta garde
   la sienne) ; le compte de ce qui a été fait, pour l'onglet Import. */
function facesSEE(bruts, voltas) { const V = new Map((voltas || []).map(m => [cleDeLigne('modules', m), m])), R = { bruts: [], casse: 0, gardees: [], doublons: 0 };
  (bruts || []).forEach(b => { const x = moduleNorme(b), v = x && V.get(cleDeLigne('modules', x)), toks = String(b.disposition || '').split(/\s+/).filter(Boolean);
    const pins = toks.filter(t => !/^centre@/i.test(t)).map(t => { const m = /^(.+?)@(-?[\d.]+):(-?[\d.]+)$/.exec(t); return m ? { nom: m[1], x: +m[2], y: +m[3] } : null; }), gs = String(b.groupes || '').split('|').map(g => g.trim());
    let noms = pins.every(Boolean) ? pins.map(p => p.nom) : null;
    if (v && noms && gs.length === pins.length && v.contacts.length) { const n2 = nomsDeLaNormeSEE(pins, v.contacts.map(c => ({ nom: c.lettre, x: c.c + 0.5, y: c.r + 0.5 })));
      if (n2.some((n, i) => n !== noms[i])) { R.casse++; let k = 0;
        b = { ...b, disposition: toks.map(t => /^centre@/i.test(t) ? t : n2[k++] + t.slice(t.indexOf('@'))).join(' '), groupes: gs.map((g, i) => n2[i] + (g.includes('#') ? g.slice(g.indexOf('#')) : '')).join(' | '),
          note: b.note + ' · noms à la casse de la norme' }; noms = n2; } }
    if (noms && new Set(noms).size < noms.length) { if (v) { R.gardees.push((nomDeFamille(app.norme, x.famille) || x.famille) + ' · ' + x.variante); return; } R.doublons++; }
    R.bruts.push(b); });
  return R; }

/* LES FACES : chaque arrangement et ses broches, à l'échelle du plus petit écart entre deux broches (le « pas » de Volta) ;
   une face ronde autour de son centre (SEE place l'origine au centre de l'insert), une rectangulaire dans son cadre. */
function modulesDeSEE(T, B) { const A = T.arrangements, P = T.broches, b = B.faces = { lus: 0, retenus: 0, sansBroche: 0, illisibles: 0, familles: {} }; if (!A || !P) return [];
  const broches = new Map(); P.lignes.forEach(r => { const id = idSEE(P, r, 'IDPlugMap'); if (id) (broches.get(id) || broches.set(id, []).get(id)).push(r); });
  const out = [];
  A.lignes.forEach(r => { b.lus++; const ps = [idSEE(A, r, 'ID'), idSEE(A, r, 'IDEquipment')].map(id => broches.get(id)).find(Boolean); if (!ps || !ps.length) { b.sansBroche++; return; }
    const pn = String(valSEE(A, r, 'PartNo') || ''), av = arrangementSEE(pn, valSEE(A, r, 'CategoryFullPath')); if (!av) { b.illisibles++; return; }
    const pins = ps.map(p => { const fam = String(valSEE(P, p, 'ContactFamily') || 'Standard'), a = awgSEE(numSEE(valSEE(P, p, 'ContactGauge')));
      return { nom: String(valSEE(P, p, 'Name')).replace(/[\s@#|]/g, ''), x: numSEE(valSEE(P, p, 'X')) || 0, y: numSEE(valSEE(P, p, 'Y')) || 0, taille: a ? (a === '8' && !/standard/i.test(fam) ? '8T' : a) : '?', ordre: numSEE(valSEE(P, p, 'CablingOrder')) }; })
      .filter(p => p.nom).sort((u, v) => (u.ordre == null ? 1e9 : u.ordre) - (v.ordre == null ? 1e9 : v.ordre) || triNaturel(u.nom, v.nom));
    if (!pins.length) { b.sansBroche++; return; }
    let pas = Infinity; for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) { const d = Math.hypot(pins[i].x - pins[j].x, pins[i].y - pins[j].y); if (d > 1e-6 && d < pas) pas = d; }
    if (!isFinite(pas)) pas = 0.001;
    const rond = !/rect/i.test(String(valSEE(A, r, 'Type') || '')), arriere = /rear/i.test(String(valSEE(A, r, 'View') || '')), sx = arriere ? -1 : 1;
    const u = pins.map(p => ({ ...p, u: sx * p.x / pas, v: p.y / pas })), f2 = x => String(Math.round(x * 100) / 100);
    let disposition;
    if (rond) { const R = Math.max(1, ...u.map(p => Math.hypot(p.u, p.v))) + 1; disposition = `centre@${f2(R)}:${f2(R)} ` + u.map(p => `${p.nom}@${f2(p.u + R)}:${f2(R - p.v)}`).join(' '); }
    else { const u0 = Math.min(...u.map(p => p.u)), v1 = Math.max(...u.map(p => p.v)); disposition = u.map(p => `${p.nom}@${f2(p.u - u0 + 1)}:${f2(v1 - p.v + 1)}`).join(' '); }
    const n = new Map(); u.forEach(p => n.set(p.taille, (n.get(p.taille) || 0) + 1)); const dom = [...n].sort((a, c) => c[1] - a[1])[0][0];
    const st = statutSEE(valSEE(A, r, 'LCStatusName'));
    out.push({ famille: av.famille, variante: av.variante, reference: '', type: n.size > 1 ? 'mixte' : dom, taille: dom, disposition, groupes: u.map(p => p.nom + (p.taille !== dom ? '#' + p.taille : '')).join(' | '),
      usage: st === 'en cours' ? 'à confirmer' : st === 'obsolète' ? 'ancien' : 'normal', corps: rond ? 'circulaire' : 'rectangle', emploi: 'connecteur',
      note: `face SEE ${pn} (${pins.length} contacts${arriere ? ', vue arrière retournée' : ''})` });
    b.familles[av.famille] = (b.familles[av.famille] || 0) + 1; });
  b.retenus = out.length; return out; }

/* LES ÉQUIPEMENTS : une entrée par référence (connecteurs et équipements), la paire fiche ↔ embase, les programmes. */
function equipementsDeSEE(T, B) { const b = B.equipements = { connecteurs: 0, equipements: 0, accouplements: 0, obsoletes: 0 }, liste = [], parId = new Map(), prog = new Map();
  const court = s => { const t = String(s || '').split(/\s*\\\s*/).filter(Boolean); return t.slice(-2).join(' \\ '); };
  [['connecteurs', 'connecteur'], ['equipements', 'équipement']].forEach(([k, genre]) => { const V = T[k]; if (!V) return;
    V.lignes.forEach(r => { const pn = String(valSEE(V, r, 'PartNo') || '').trim(); if (!pn) return; const st = statutSEE(valSEE(V, r, 'LCStatusName'));
      const epf = String(valSEE(V, r, 'EPFList') || '').split(',').map(x => x.trim()).filter(Boolean); epf.forEach(p => prog.set(p, (prog.get(p) || 0) + 1));
      const e = { p: pn, k: genre, d: String(valSEE(V, r, 'Description') || '').slice(0, 120), cat: court(valSEE(V, r, 'CategoryFullPath')), ty: String(valSEE(V, r, 'Type') || valSEE(V, r, 'EquipmentType') || valSEE(V, r, 'ClassName') || ''),
        cx: String(valSEE(V, r, 'ConnectivityType') || ''), g: String(valSEE(V, r, 'Gender') || ''), n: numSEE(valSEE(V, r, 'DesiredPinsCount')) || numSEE(valSEE(V, r, 'TotalNumberOfPins')) || null,
        std: String(valSEE(V, r, 'PartNoStandard1') || ''), epf, st, cap: String(valSEE(V, r, 'Capacity') || ''), tmin: numSEE(valSEE(V, r, 'TemperatureMini')), tmax: numSEE(valSEE(V, r, 'TemperatureMaxi')), m: [] };
      b[k]++; if (st === 'obsolète') b.obsoletes++; liste.push(e); [idSEE(V, r, 'ID'), idSEE(V, r, 'IDEquipment')].filter(Boolean).forEach(id => parId.set(id, e)); }); });
  const M = T.accouplements; if (M) M.lignes.forEach(r => { const a = parId.get(idSEE(M, r, 'IDSemiEqu')), c = parId.get(idSEE(M, r, 'IDConnectedSemiEqu')); if (!a || !c) return; b.accouplements++;
    const pref = numSEE(valSEE(M, r, 'Prefered')) === 1; [[a, c], [c, a]].forEach(([x, y]) => { if (x.m.length < 8 && !x.m.some(z => z.p === y.p)) x.m[pref ? 'unshift' : 'push']({ p: y.p, pref }); }); });
  return { liste, programmes: [...prog].sort((x, y) => y[1] - x[1]) }; }

/* ---- garder la base sur ce PC (IndexedDB) ----------------------------------------------------------------------- */
function idbSEE() { return new Promise((ok, ko) => { try { const r = indexedDB.open(IDB_SEE, 1); r.onupgradeneeded = () => r.result.createObjectStore('base'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); } catch (e) { ko(e); } }); }
async function idbSEEFaire(mode, f) { const db = await idbSEE(); return new Promise((ok, ko) => { const t = db.transaction('base', mode), s = t.objectStore('base'), q = f(s); t.oncomplete = () => { ok(q && q.result); db.close(); }; t.onerror = () => { ko(t.error); db.close(); }; }); }
async function garderBaseSEE(base) { await idbSEEFaire('readwrite', s => s.put(base, 'base')); }
async function oublierBaseSEEStockee() { await idbSEEFaire('readwrite', s => s.delete('base')); }
/* Au démarrage : la base gardée revient, et passe devant les tables de Volta. */
async function relireBaseSEE() { if (typeof indexedDB === 'undefined') return false; let base = null;
  try { base = await idbSEEFaire('readonly', s => s.get('base')); } catch (_) { }
  BASE_SEE.charge = true; if (!base || !base.v) return false; poserBaseSEE(base); return true; }
/* La base SEE devient (ou cesse d'être) celle de Volta : la norme active se recompose, tout ce qui la lit se refait. */
function poserBaseSEE(base) { BASE_SEE.base = base || null; BASE_SEE.norme = null; BASE_SEE.index = null;
  if (typeof NORMES !== 'undefined' && NORMES.embarquee) { app.norme = normeComposee(NORMES.embarquee, NORMES.apports); if (typeof rafraichirApresNorme === 'function') rafraichirApresNorme(); } }
async function adopterBaseSEE() { const I = SEE.import; if (!I) return;
  try { await garderBaseSEE(I); } catch (e) { dire('Le navigateur refuse de garder la base SEE (navigation privée ?) : elle tient tant que l’onglet est ouvert.', true); }
  poserBaseSEE(I); dire(`La base SEE est gardée sur ce PC : ${milliers(I.contacts.length)} contacts, ${milliers(I.cables.length)} câbles, ${milliers(I.modules.length)} faces passent devant les tables de Volta.`); rendreBaseSEE(); }
async function oublierBaseSEE() { try { await oublierBaseSEEStockee(); } catch (_) { } poserBaseSEE(null); dire('La base SEE est oubliée : Volta revient à ses tables.'); rendreBaseSEE(); }

/* ---- la norme : les lignes de la base, par-dessus celles de Volta ------------------------------------------------ */
// ce que disait Volta à la place d'une ligne de SEE (pour la différence, sur la fiche et l'onglet Import)
const AVANT_SEE = new WeakMap();
const avantSEE = x => (x && AVANT_SEE.get(x)) || null;
function lignesSEE(table, bruts) { return (bruts || []).map(b => { const x = ENTREE_NORME[table](b); if (!x) return null; x.brut = b; x.source = 'SEE'; return x; }).filter(Boolean); }
/* Les lignes de la base lues par le moteur : contacts et câbles une fois ; les faces à chaque fois (elles gardent la
   désignation, l'usage et la note de l'arrangement de Volta qu'elles remplacent). */
function normeSEE(N0) { const S = BASE_SEE.base; if (!S) return null;
  if (!BASE_SEE.norme) BASE_SEE.norme = { contacts: lignesSEE('contacts', S.contacts) };
  // les câbles se complètent par ceux de Volta : refaits avec la norme qu'ils complètent
  if (BASE_SEE.norme.n0 !== N0.cables) { BASE_SEE.norme.cables = lignesSEE('cables', cablesCompletesSEE(S.cables, N0.cables)); BASE_SEE.norme.n0 = N0.cables; }
  const parCle = new Map((N0.modules || []).map(m => [cleDeLigne('modules', m), m]));
  const modules = lignesSEE('modules', facesSEE(S.modules, N0.modules).bruts.map(b => { const x = moduleNorme(b), e = x && parCle.get(cleDeLigne('modules', x));
    return e ? { ...b, reference: e.reference, usage: b.usage === 'normal' && e.usage !== 'normal' ? e.usage : b.usage, note: b.note + ' · Volta : ' + (e.note || e.variante) } : b; }));
  return { contacts: BASE_SEE.norme.contacts, cables: BASE_SEE.norme.cables, modules }; }
/* LA NORME COMPOSÉE : celle de Volta (l'embarquée et ce qui a été importé), la base SEE par-dessus — SEE gagne —, puis
   ce que l'utilisateur a corrigé à la main sur la page des normes (son geste passe devant tout). */
function avecBaseSEE(N0, A) { const S = normeSEE(N0); if (!S) return N0;
  const N = normeVide(); TABLES_NORME.forEach(t => { N[t] = S[t] || []; }); N.tables = 1;
  // ce que disait Volta, là où SEE dit autre chose (une note ou une source qui change seule ne compte pas)
  ['contacts', 'cables', 'modules'].forEach(t => { const par = new Map((N0[t] || []).map(x => [cleDeLigne(t, x), x])); N[t].forEach(x => { const e = par.get(cleDeLigne(t, x)); if (e && ecartsSEE(t, e, x).length) AVANT_SEE.set(x, e); else AVANT_SEE.delete(x); }); });
  let R = fusionnerNormes(N0, N);
  const M = { tables: {} }; TABLES_NORME.forEach(t => { const T = apportsDeTable(A, t), ls = (T.lignes || []).filter(l => (l.source || 'main') === 'main'); if (ls.length) M.tables[t] = { lignes: ls, supprimees: [] }; });
  if (Object.keys(M.tables).length) R = fusionnerNormes(R, normeDesApports(M));
  return R; }

/* ---- les équipements : ce que SEE dit d'une référence ------------------------------------------------------------ */
function indexSEE() { const S = BASE_SEE.base; if (!S) return null; if (BASE_SEE.index) return BASE_SEE.index;
  const I = new Map(); (S.equipements || []).forEach(e => { const k = cleNorme(e.p); if (k && !I.has(k)) I.set(k, e); }); (S.equipements || []).forEach(e => { const k = cleNorme(e.std); if (k && !I.has(k)) I.set(k, e); });
  return (BASE_SEE.index = I); }
const equipementSEE = pn => { const I = indexSEE(), k = cleNorme(pn); return I && k ? I.get(k) || null : null; };
const programmeSEE = () => { try { return localStorage.getItem(CLE_PROGRAMME_SEE) || ''; } catch (_) { return ''; } };
function choisirProgrammeSEE(p) { try { if (p) localStorage.setItem(CLE_PROGRAMME_SEE, p); else localStorage.removeItem(CLE_PROGRAMME_SEE); } catch (_) { }
  if (typeof rafraichirApresNorme === 'function') rafraichirApresNorme(); rendreBaseSEE(); }
/* Ce qu'il faut dire d'une référence face à SEE : absente, obsolète, pas déclarée pour le programme choisi. */
function alertesSEE(e, pn) { if (!BASE_SEE.base || !pn) return [];
  if (!e) return [{ niveau: 'att', texte: 'absente de la base SEE' }]; const xs = [], p = programmeSEE();
  if (e.st === 'obsolète') xs.push({ niveau: 'att', texte: 'obsolète dans SEE' });
  if (p && e.epf.length && !e.epf.includes(p)) xs.push({ niveau: 'att', texte: 'pas déclarée pour ' + p + ' dans SEE' });
  return xs; }
const motsGenreSEE = e => [e.cx === 'Plug' ? 'fiche (prise mobile)' : e.cx === 'Receptacle' ? 'embase' : e.cx, e.g === 'Pin' ? 'broches' : e.g === 'Socket' ? 'douilles' : e.g === 'Mixed' ? 'broches et douilles' : e.g].filter(Boolean);
/* La ligne « Dans SEE » d'un connecteur ou d'un équipement, sur sa fiche. */
function ligneSEEHtml(pn) { if (!BASE_SEE.base || !pn) return ''; const e = equipementSEE(pn), al = alertesSEE(e, pn);
  if (!e) return `<p class="fi-see att"><span class="fi-see-k">SEE</span><span>Cette référence n’est pas dans la base SEE.</span></p>`;
  const mots = [e.d || e.ty, ...motsGenreSEE(e), e.n ? plurielLie(e.n, 'contact') : '', e.cat].filter(Boolean), mate = e.m.slice(0, 2).map(x => x.p);
  const bulle = [e.p, e.std && e.std !== e.p ? 'standard ' + e.std : '', e.epf.length ? 'programmes : ' + e.epf.join(', ') : '', e.tmin != null || e.tmax != null ? 'de ' + (e.tmin != null ? e.tmin : '?') + ' à ' + (e.tmax != null ? e.tmax : '?') + ' °C' : '', e.cap ? 'capacité ' + e.cap : '', e.st ? 'statut SEE : ' + e.st : ''].filter(Boolean).join('\n');
  return `<p class="fi-see${al.length ? ' att' : ''}" data-bulle="${escA(bulle)}"><span class="fi-see-k">SEE</span><span>${esc(mots.join(' · '))}${mate.length ? ` · se monte avec <b class="id">${mate.map(esc).join('</b>, <b class="id">')}</b>` : ''}</span>${al.map(a => `<span class="fi-see-al">${esc(a.texte)}</span>`).join('')}</p>`; }

/* ---- l'onglet « Import » : ce que Volta prend, la différence avec ses tables, ce qui reste dehors ---------------- */
// la base montrée : celle qu'on vient de lire, sinon celle qui est gardée
const baseMontreeSEE = () => SEE.import || BASE_SEE.base;
const COMPARAISONS_SEE = new WeakMap(), INDEX_SEE = new WeakMap();
/* La différence avec Volta (l'embarquée et ce qui a été importé, sans la base SEE) : par table, ce qui est nouveau, ce
   qui remplace une ligne de Volta (avant → après), ce qui est identique. */
function comparaisonSEE(I) { if (COMPARAISONS_SEE.has(I)) return COMPARAISONS_SEE.get(I);
  const N0 = normeAvecApports(normeEmbarqueeLue(), NORMES.apports), R = {};
  R.contacts = comparerTable('contacts', N0.contacts, lignesSEE('contacts', I.contacts));
  R.cables = comparerTable('cables', N0.cables, lignesSEE('cables', cablesCompletesSEE(I.cables, N0.cables)));
  const F = facesSEE(I.modules, N0.modules); R.modules = comparerTable('modules', N0.modules, lignesSEE('modules', F.bruts)); Object.assign(R.modules, { casse: F.casse, gardees: F.gardees, doublons: F.doublons });
  // une ligne qui ne change que sa note ou sa source (« SEE · règle EN2997 v7 ») dit la même chose : identique
  ['contacts', 'cables'].forEach(t => { const C = R[t], pareilles = C.remplacees.filter(r => !ecartsSEE(t, r.avant, r.apres).length); C.remplacees = C.remplacees.filter(r => !pareilles.includes(r)); C.identiques.push(...pareilles.map(r => r.apres)); });
  // une face de SEE est toujours à l'échelle (celles de Volta étaient relevées sur les figures) : mêmes contacts, mêmes
  // noms, mêmes tailles, elle n'est que redessinée
  { const C = R.modules; C.redessinees = C.remplacees.filter(r => !ecartsSEE('modules', r.avant, r.apres).length); C.remplacees = C.remplacees.filter(r => !C.redessinees.includes(r)); }
  // ce qui est à vérifier d'abord, ce qui ne fait qu'écrire un nom en entier à la fin
  ['contacts', 'cables', 'modules'].forEach(t => { const poids = r => { const e = ecartsSEE(t, r.avant, r.apres); return e.some(x => x[3] && x[3].suspect) ? 0 : e.every(x => x[3] && x[3].complet) ? 2 : 1; };
    R[t].remplacees = R[t].remplacees.map((r, i) => [poids(r), i, r]).sort((u, v) => u[0] - v[0] || u[1] - v[1]).map(x => x[2]); });
  COMPARAISONS_SEE.set(I, R); return R; }
const indexDeBaseSEE = I => { if (I === BASE_SEE.base) return indexSEE(); if (INDEX_SEE.has(I)) return INDEX_SEE.get(I); const M = new Map();
  (I.equipements || []).forEach(e => { const k = cleNorme(e.p); if (k && !M.has(k)) M.set(k, e); }); (I.equipements || []).forEach(e => { const k = cleNorme(e.std); if (k && !M.has(k)) M.set(k, e); }); INDEX_SEE.set(I, M); return M; };
// une ligne en mots
const motsContactSEE = x => `${nomDeFamille(app.norme, x.famille) || x.famille} · ${x.sexe === 'M' ? 'mâle' : 'femelle'} · ${x.taille === '*' ? 'toute taille' : 'taille ' + x.taille} · ${x.typeFil === '*' ? 'tout câble' : x.typeFil} · ${x.jauge == null ? 'toute gauge' : x.jauge + ' AWG'}`;
const CHAMPS_CABLE_SEE = [['diametre', 'Ø', ' mm'], ['masse', 'masse', ' g/m'], ['resistance', 'R', ' mΩ/m'], ['brins', 'brins', ''], ['blindage', 'blindage', ''], ['jauge', 'gauge', ''], ['nature', 'nature', '']];
const valeurMontree = v => v === true ? 'oui' : v === false ? 'non' : v == null || v === '' ? '—' : typeof v === 'number' ? nombre(v) : String(v);
/* Un écart de SEE sur un chiffre d'un facteur 2 ou plus (une masse 65 fois plus faible) : à vérifier dans SEE avant de
   s'y fier — SEE gagne quand même, l'écart se voit en tête. Le nom d'un contact que SEE écrit en entier (KB0800 →
   E0613KB0800) n'est pas un autre contact : il se range à la fin. Une face : le compte, les tailles, et les noms que
   l'une a et pas l'autre (les premiers), jamais le dessin — toute face de SEE est à l'échelle. */
const ECART_SUSPECT_SEE = 2;
const facteurSEE = (a, b) => { if (typeof a !== 'number' || typeof b !== 'number' || !(a > 0) || !(b > 0)) return ''; const r = Math.max(a / b, b / a);
  return r >= ECART_SUSPECT_SEE ? nombre(Math.round(r * (r < 10 ? 10 : 1)) / (r < 10 ? 10 : 1)) + ' fois ' + (b > a ? 'plus' : 'moins') : ''; };
const nomsSeulsSEE = (xs, ys) => { const Y = new Set(ys), d = [...new Set(xs)].filter(x => !Y.has(x)).sort(triNaturel); return d.length ? d.slice(0, 8).join(' ') + (d.length > 8 ? ` … (${d.length})` : '') : ''; };
function ecartsSEE(table, a, b) {
  if (table === 'contacts') { const ra = String(a.reference || ''), rb = String(b.reference || ''), complet = !!ra && !!rb && ra !== rb && (rb.endsWith(ra) || ra.endsWith(rb));
    return [ra !== rb ? [ra, rb, complet ? 'nom complet' : 'contact', complet ? { complet: true } : null] : null, (a.accessoire || '') !== (b.accessoire || '') ? [a.accessoire || 'rien', b.accessoire || 'rien', 'avec'] : null].filter(Boolean); }
  if (table === 'cables') return CHAMPS_CABLE_SEE.filter(([k]) => valeurMontree(a[k]) !== valeurMontree(b[k])).map(([k, t, u]) => { const f = ['diametre', 'masse', 'resistance'].includes(k) ? facteurSEE(a[k], b[k]) : '';
    return [valeurMontree(a[k]) + (typeof a[k] === 'number' ? u : ''), valeurMontree(b[k]) + (typeof b[k] === 'number' ? u : ''), t, f ? { suspect: f } : null]; });
  const ta = m => [...new Set(m.contacts.map(c => '#' + c.taille))].join(' '), la = a.contacts.map(c => c.lettre), lb = b.contacts.map(c => c.lettre), moins = nomsSeulsSEE(la, lb), plus = nomsSeulsSEE(lb, la);
  return [a.contacts.length !== b.contacts.length ? [a.contacts.length + ' contacts', b.contacts.length + ' contacts', 'contacts'] : null, ta(a) !== ta(b) ? [ta(a), ta(b), 'tailles'] : null,
    moins || plus ? [moins || 'aucun', plus || 'aucun', 'noms', { noms: true }] : null].filter(Boolean); }
const titreLigneSEE = (table, x) => table === 'contacts' ? motsContactSEE(x) : table === 'cables' ? x.cable : (nomDeFamille(app.norme, x.famille) || x.famille) + ' · ' + x.variante;
function differenceSEEHtml(table, titre, C) { const n = C.remplacees.length, MAX = 30, E = new Map(C.remplacees.map(r => [r, ecartsSEE(table, r.avant, r.apres)]));
  const suspects = C.remplacees.filter(r => E.get(r).some(e => e[3] && e[3].suspect)).length, complets = C.remplacees.filter(r => E.get(r).every(e => e[3] && e[3].complet)).length, redessinees = (C.redessinees || []).length;
  const ecart = ([a, b, k, o]) => `<span class="see-diff-e${o && o.suspect ? ' suspect' : ''}${o && o.complet ? ' complet' : ''}"${o && o.noms ? ' title="à gauche, les noms que seul Volta avait ; à droite, ceux que seul SEE a"' : ''}><i>${esc(k)}</i><s>${esc(a)}</s><span class="see-fl">→</span><b>${esc(b)}</b>`
    + (o && o.suspect ? `<em class="see-suspect" title="SEE dit ${escA(b)} là où Volta disait ${escA(a)} : ${escA(o.suspect)}, c'est rare pour une même référence — une erreur de saisie ou d'unité dans SEE ? SEE gagne quand même.">${esc(o.suspect)} · à vérifier dans SEE</em>` : '') + '</span>';
  const ligne = r => `<li class="see-diff${E.get(r).some(e => e[3] && e[3].suspect) ? ' suspect' : ''}"><span class="see-diff-t">${esc(titreLigneSEE(table, r.apres))}</span>${E.get(r).map(ecart).join('')}</li>`;
  const compte = [n ? esc(plurielLie(n, 'ligne') + ' remplace' + (n > 1 ? 'nt' : '') + ' Volta') : 'rien ne remplace Volta', suspects ? `<b class="see-t-att">${esc(plurielLie(suspects, 'écart'))} à vérifier</b>` : '',
    complets ? esc('dont ' + plurielLie(complets, 'nom') + ' écrit' + (complets > 1 ? 's' : '') + ' en entier') : '', C.casse ? esc(plurielLie(C.casse, 'face') + ' aux noms remis à la casse de la norme') : '', redessinees ? esc(plurielLie(redessinees, 'face') + ' redessinée' + (redessinees > 1 ? 's' : '') + ' à l’échelle, mêmes contacts') : '',
    esc(plurielLie(C.nouvelles.length, 'nouvelle')), esc(plurielLie(C.identiques.length, 'identique'))].filter(Boolean).join(' · ');
  const notes = [C.casse ? `SEE écrit les noms de contacts sans leur casse (c, e, f, k, m, w, z en minuscules, le reste en majuscules) : C et c y portent le même nom. Volta reprend les noms de la norme, aux places de SEE ; deux candidats (C et c), la place tranche.` : '',
    (C.gardees || []).length ? `${plurielLie(C.gardees.length, 'face')} reste${C.gardees.length > 1 ? 'nt' : ''} celle${C.gardees.length > 1 ? 's' : ''} de Volta : SEE y laisse deux contacts du même nom (${C.gardees.slice(0, 6).join(', ')}${C.gardees.length > 6 ? '…' : ''}).` : '',
    C.doublons ? `${C.doublons} face${C.doublons > 1 ? 's' : ''} nouvelle${C.doublons > 1 ? 's' : ''} où SEE donne le même nom à deux contacts : prise${C.doublons > 1 ? 's' : ''} telle${C.doublons > 1 ? 's' : ''} quelle${C.doublons > 1 ? 's' : ''}, à vérifier.` : ''].filter(Boolean);
  return `<div class="see-diffs"><h4>${esc(titre)} <span class="see-t">${compte}</span></h4>${notes.map(t => `<p class="see-note">${esc(t)}</p>`).join('')}`
    + (n ? `<ul>${C.remplacees.slice(0, MAX).map(ligne).join('')}</ul>` + (n > MAX ? `<details class="see-vides"><summary>${n - MAX} autre${n - MAX > 1 ? 's' : ''}</summary><ul>${C.remplacees.slice(MAX).map(ligne).join('')}</ul></details>` : '') : '') + '</div>'; }
/* Le plan ouvert face à la base : ses références (par famille, en nombre seulement : le retest ne s'affiche pas) et ses
   types de câble. */
function planFaceABaseSEE(I) { const V = typeof verite === 'function' ? verite() : []; if (!V || !V.length) return null; const M = indexDeBaseSEE(I), p = programmeSEE();
  const pns = [...new Set(V.flatMap(l => [l.pnDe, l.pnVers]).filter(Boolean))], fam = new Map();
  // la famille d'une référence : ses lettres et quatre chiffres (EN2997, MS3470, E0644), six pour une NSA (NSA937802)
  const familleDe = pn => { const m = /^([A-Z]+)(\d+)/.exec(cleNorme(pn)); return m ? m[1] + m[2].slice(0, m[1] === 'NSA' ? 6 : 4) : 'autres'; };
  pns.forEach(pn => { const f = familleDe(pn), e = M.get(cleNorme(pn)), x = fam.get(f) || fam.set(f, { n: 0, dans: 0, obsoletes: 0, hors: 0 }).get(f);
    x.n++; if (e) { x.dans++; if (e.st === 'obsolète') x.obsoletes++; if (p && e.epf.length && !e.epf.includes(p)) x.hors++; } });
  const cables = new Set((I.cables || []).map(c => cleNorme(c.cable))), types = [...new Set(V.map(l => l.type).filter(Boolean))];
  return { nom: app.nom || 'le plan ouvert', familles: [...fam].sort((a, b) => b[1].n - a[1].n), pns: pns.length, types: types.length, typesDans: types.filter(t => cables.has(cleNorme(t))).length, programme: p }; }
function importSEEHtml() { const I = baseMontreeSEE(); if (!I) return '<p class="see-rien">Aucune base SEE lue ni gardée.</p>';
  const B = I.bilan || {}, bc = B.contacts || {}, gardee = BASE_SEE.base, cetteBase = gardee === I, date = t => new Date(t).toLocaleDateString('fr-FR') + ' à ' + new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const etat = cetteBase ? `<span class="see-etat ok">Gardée sur ce PC depuis le ${esc(date(gardee.quand))} : elle passe devant les tables de Volta.</span><button class="btn papier" id="see-oublier">Oublier la base SEE</button>`
    : `<span class="see-etat">${gardee ? `Une base est déjà gardée (${esc(gardee.nom)}, du ${esc(date(gardee.quand))}).` : 'Pas encore gardée : Volta ne s’en sert pas encore.'}</span><button class="btn cuivre" id="see-garder">${gardee ? 'Remplacer la base gardée' : 'Garder dans Volta'}</button>${gardee ? '<button class="btn papier" id="see-oublier">Oublier la base gardée</button>' : ''}`;
  const progs = I.programmes || [], p = programmeSEE();
  const prog = `<label class="see-prog"><span>Mon programme</span><select id="see-prog"><option value="">Tous les programmes</option>${progs.map(([x, n]) => `<option value="${escA(x)}"${x === p ? ' selected' : ''}>${esc(x)} (${esc(milliers(n))})</option>`).join('')}${p && !progs.some(([x]) => x === p) ? `<option value="${escA(p)}" selected>${esc(p)}</option>` : ''}</select></label>`;
  const nf = Object.keys(bc.familles || {}).length, be = B.equipements || {}, bf = B.faces || {}, bk = B.cables || {};
  const tuile = (n, t, s) => `<div class="see-tuile"><b>${esc(milliers(n))}</b><span>${esc(t)}</span>${s ? `<i>${esc(s)}</i>` : ''}</div>`;
  const tuiles = `<div class="see-tuiles">${tuile(I.contacts.length, 'contacts à sertir', plurielLie(nf, 'famille') + ' · ' + plurielLie(bc.validees || 0, 'règle') + ' validée' + ((bc.validees || 0) > 1 ? 's' : '') + (bc.enCours ? ' · ' + bc.enCours + ' en cours' : '') + (bc.touteTaille ? ' · ' + milliers(bc.touteTaille) + ' toute taille' : ''))}`
    + `${tuile(I.cables.length, 'câbles', (bk.sansConducteur ? bk.sansConducteur + ' sans conducteur relié' : 'avec leurs conducteurs'))}${tuile(I.modules.length, 'faces d’arrangement', plurielLie(Object.keys(bf.familles || {}).length, 'famille'))}`
    + `${tuile((I.equipements || []).length, 'références', plurielLie(be.connecteurs || 0, 'connecteur') + ' · ' + plurielLie(be.equipements || 0, 'équipement') + ' · ' + plurielLie(be.accouplements || 0, 'paire') + ' fiche ↔ embase')}</div>`;
  const C = comparaisonSEE(I);
  const diffs = `<div class="see-bloc"><h3>Ce qui change dans Volta <span>SEE gagne : ce que disait Volta est barré, ce que dit SEE en gras ; ce que SEE laisse vide, Volta le garde</span></h3>${differenceSEEHtml('contacts', 'Contacts à sertir', C.contacts)}${differenceSEEHtml('cables', 'Câbles', C.cables)}${differenceSEEHtml('modules', 'Faces des connecteurs', C.modules)}</div>`;
  const autres = Object.entries(bc.autres || {}).map(([k, n]) => n + ' ' + k).join(', ');
  const dehors = [bc.obsoletes ? plurielLie(bc.obsoletes, 'règle') + ' obsolète' + (bc.obsoletes > 1 ? 's' : '') + ' ignorée' + (bc.obsoletes > 1 ? 's' : '') : '', autres ? 'règles d’autres classes pas encore lues : ' + autres : '',
    bc.sansFil ? plurielLie(bc.sansFil, 'ligne') + ' de contact sans fil (gauge −2)' : '', bc.jaugeIllisible ? plurielLie(bc.jaugeIllisible, 'ligne') + ' à gauge qui n’est pas une AWG' : '', bc.tailleIllisible ? plurielLie(bc.tailleIllisible, 'ligne') + ' à taille de cavité ou sexe illisible' + (Object.keys(bc.illisibles || {}).length ? ' — le plus souvent : ' + Object.entries(bc.illisibles).map(([k, n]) => k + ' (' + milliers(n) + ')').join(' ; ') : '') : '',
    bc.sansRegle ? plurielLie(bc.sansRegle, 'ligne') + ' de contact sans règle' : '', bc.conflits ? plurielLie(bc.conflits, 'cas') + ' où deux règles donnent deux contacts : la validée, la plus récente, le plus petit numéro retenu' : '',
    bf.sansBroche ? plurielLie(bf.sansBroche, 'arrangement') + ' sans broche' : '', bf.illisibles ? plurielLie(bf.illisibles, 'nom') + ' d’arrangement illisible' : '', (B.feuilles || []).length ? 'feuilles absentes du classeur : ' + B.feuilles.join(', ') : ''].filter(Boolean);
  const P = planFaceABaseSEE(I);
  const plan = P ? `<div class="see-bloc"><h3>Le plan ouvert face à la base <span>${esc(P.nom)} · des références, seulement le nombre</span></h3><table class="see-table"><thead><tr><th>Famille</th><th>Références</th><th>Dans SEE</th><th>Obsolètes</th>${P.programme ? `<th>Hors ${esc(P.programme)}</th>` : ''}</tr></thead><tbody>`
    + P.familles.map(([f, x]) => `<tr><td class="mono">${esc(f)}</td><td>${x.n}</td><td class="${x.dans < x.n ? 'att' : ''}">${x.dans}</td><td class="${x.obsoletes ? 'att' : ''}">${x.obsoletes}</td>${P.programme ? `<td class="${x.hors ? 'att' : ''}">${x.hors}</td>` : ''}</tr>`).join('')
    + `</tbody></table><p class="see-note">${esc(plurielLie(P.typesDans, 'type'))} de câble sur ${P.types} retrouvé${P.typesDans > 1 ? 's' : ''} dans les câbles de SEE.</p></div>` : '<p class="see-note">Ouvre un retest pour le voir face à la base.</p>';
  return `<section class="see-feuille see-import" aria-label="Import"><div class="see-tete"><b class="see-nom">Ce que Volta prend de ${esc(I.nom)}</b><span class="see-compte">qui a fait quoi et les dates ne sont jamais pris</span></div>`
    + `<div class="see-gestes">${etat}${prog}</div>${tuiles}${diffs}`
    + (dehors.length ? `<div class="see-bloc"><h3>Ce qui n’est pas pris</h3><ul class="see-dehors">${dehors.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '') + plan + '</section>'; }
/* Le bilan en texte, pour le résumé. */
function resumeImportSEE() { const I = baseMontreeSEE(); if (!I) return ''; const C = comparaisonSEE(I), B = I.bilan || {}, bc = B.contacts || {};
  const t = (k, x, tb) => `${k} : ${x.remplacees.length} remplacent Volta${tb ? ` (dont ${x.remplacees.filter(r => ecartsSEE(tb, r.avant, r.apres).some(e => e[3] && e[3].suspect)).length} à vérifier)` : ''}${x.redessinees ? ` · ${x.redessinees.length} redessinées` : ''} · ${x.nouvelles.length} nouvelles · ${x.identiques.length} identiques`;
  return ['\n== Import ==', `${I.contacts.length} contacts (${Object.keys(bc.familles || {}).length} familles : ${Object.entries(bc.familles || {}).map(([f, n]) => f + ' ' + n).join(', ')}), ${I.cables.length} câbles, ${I.modules.length} faces, ${(I.equipements || []).length} références`,
    t('Contacts', C.contacts), t('Câbles', C.cables, 'cables'), t('Faces', C.modules), `Règles : ${bc.validees || 0} validées, ${bc.enCours || 0} en cours, ${bc.obsoletes || 0} obsolètes ignorées${Object.keys(bc.autres || {}).length ? ', autres classes ' + JSON.stringify(bc.autres) : ''}`,
    `Lignes de contact écartées : sans fil ${bc.sansFil || 0}, gauge illisible ${bc.jaugeIllisible || 0}, taille illisible ${bc.tailleIllisible || 0}${Object.keys(bc.illisibles || {}).length ? ' (' + Object.entries(bc.illisibles).map(([k, n]) => k + ' ' + n).join(' ; ') + ')' : ''}, sans règle ${bc.sansRegle || 0}, conflits ${bc.conflits || 0}`,
    `Faces des familles : ${Object.entries((B.faces || {}).familles || {}).map(([f, n]) => f + ' ' + n).join(', ')}`, (B.feuilles || []).length ? 'Feuilles absentes : ' + B.feuilles.join(', ') : ''].filter(Boolean).join('\n'); }
/* Sur une fiche : ce que disait Volta là où SEE l'a remplacé (« Volta disait : Ø 1,52 mm → 1,60 mm »), sinon rien. */
function differenceSEEMots(table, x) { const a = avantSEE(x); if (!a) return ''; const e = ecartsSEE(table, a, x).filter(([, , k]) => k !== 'face');
  return e.length ? 'SEE a remplacé ce que disait Volta : ' + e.map(([u, v, k, o]) => k + ' ' + u + ' → ' + v + (o && o.suspect ? ' (' + o.suspect + ' : à vérifier dans SEE)' : '')).join(' ; ') : ''; }
