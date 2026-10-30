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
// une feuille : { lignes, col, nom } ; `val(r, 'PartNo')` la cellule, quelle que soit la casse de l'en-tête ; chaque ligne
// garde son numéro de ligne Excel (`r.l`, 08-see) et la feuille son nom (la cohérence dit où retrouver un exemple)
function tableImportSEE(rows) { if (!rows || !rows.length) return null; const k = rows.findIndex(r => Array.isArray(r) && r.filter(c => String(c).trim()).length > 1); if (k < 0) return null;
  const col = new Map(); rows[k].forEach((c, i) => { const n = String(c == null ? '' : c).trim().toLowerCase(); if (n && !col.has(n)) col.set(n, i); });
  return { col, nom: rows.nom ? nomCourtSEE(rows.nom) : '', lignes: rows.slice(k + 1).filter(r => Array.isArray(r) && r.some(c => c !== '' && c != null)) }; }
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
  const B = { feuilles: Object.keys(FEUILLES_IMPORT_SEE).filter(k => !T[k]) }, K = coherenceVideSEE();
  const contacts = contactsDeSEE(T, B, K), cables = cablesDeSEE(T, B, K), modules = modulesDeSEE(T, B, K), eq = equipementsDeSEE(T, B, K);
  return { v: 1, nom: nom || 'la base SEE', quand: Date.now(), contacts, cables, modules, equipements: eq.liste, programmes: eq.programmes, bilan: B, coherence: finirCoherenceSEE(K) }; }

/* LES CONTACTS : une ligne par clé (famille, sexe, taille, type, gauge) — la meilleure des règles qui la disent. Chaque
   ligne d'une règle qui n'est pas obsolète passe les contrôles de la cohérence (verifContactsSEE) : une ligne qui se
   contredit (un contact femelle sur une ligne mâle, une taille 16 pour une cavité 20, un câble trop gros pour le fût)
   est écartée — Volta garde la sienne, s'il en a une. */
function contactsDeSEE(T, B, K) { const R = T.regles, C = T.contacts, b = B.contacts = { regles: 0, validees: 0, enCours: 0, obsoletes: 0, autres: {}, lignes: 0, ignorees: 0, sansRegle: 0, sansFil: 0, jaugeIllisible: 0, tailleIllisible: 0, sansContact: 0, conflits: 0, incoherentes: 0, familles: {} };
  if (!R || !C) return [];
  const regles = new Map(), V = verifContactsSEE(K, T);
  R.lignes.forEach(r => { const st = statutSEE(valSEE(R, r, 'LCStatusName')), classe = String(valSEE(R, r, 'ClassName') || 'Contact'), pn = String(valSEE(R, r, 'PartNo'));
    const g = { pn, familles: famillesDeRegleSEE(pn), statut: st, version: numSEE(valSEE(R, r, 'Version')) || 0, classe, r, n: 0 }; b.regles++;
    if (st === 'obsolète') b.obsoletes++; else if (!/^contact/i.test(classe)) b.autres[classe] = (b.autres[classe] || 0) + 1; else if (st === 'en cours') b.enCours++; else b.validees++;
    [idSEE(R, r, 'ID'), idSEE(R, r, 'IDEquipment')].filter(Boolean).forEach(id => regles.set(id, g)); });
  const best = new Map(), rang = (g, n) => [g.statut === 'en cours' ? 0 : 1, g.version, -(n || 0)];
  const mieux = (a, b2) => { for (let i = 0; i < a.length; i++) if (a[i] !== b2[i]) return a[i] > b2[i]; return false; };
  C.lignes.forEach(r => { b.lignes++; const g = regles.get(idSEE(C, r, 'IDEquipment'));
    if (!g) { b.sansRegle++; return; } g.n++; if (g.statut === 'obsolète' || !/^contact/i.test(g.classe)) { b.ignorees++; return; }
    // le sexe : Male / Female, et aussi Pin (une broche : mâle) / Socket (une douille : femelle)
    const ct = String(valSEE(C, r, 'ContactType') || ''), sexe = /^(m|pin|broche)/i.test(ct) ? 'M' : /^(f|socket|douille)/i.test(ct) ? 'F' : '';
    // la cavité : sa section en mm², lue en AWG ; −1 : toute taille (comme la gauge −1 : toute gauge)
    const cg = valSEE(C, r, 'ContactGauge'), cgn = numSEE(cg), taille = cgn === -1 ? '*' : awgSEE(cgn);
    const wg = numSEE(valSEE(C, r, 'WireGauge')), contact = String(valSEE(C, r, 'PartNo1') || '').trim();
    const ecartee = V.ligne(g, r, { ct, sexe, taille, wg, contact });   // la cohérence de la ligne (sa référence, son sexe, sa taille, son fût)
    if (taille === '*') { b.touteTaille = (b.touteTaille || 0) + 1; moinsUnSEE(b, g, C, r); }
    if (!taille || !sexe) { const t = (sexe ? '' : 'sexe « ' + (ct || 'vide') + ' » · ') + (taille ? 'taille ' + taille : 'cavité ' + (cg === '' ? 'vide' : numSEE(cg) != null ? nombre(numSEE(cg)) + ' mm²' : '« ' + cg + ' »'));
      b.tailleIllisible++; illisibleSEE(b, t); V.illisible(g, r, contact, t); return; }
    let jauge;
    if (wg === -2) { b.sansFil++; return; } if (wg == null || wg === -1) jauge = '*'; else { jauge = awgSEE(wg); if (!jauge) { b.jaugeIllisible++; V.illisible(g, r, contact, 'gauge ' + nombre(wg) + ' mm², qui n’est pas une AWG'); return; } }
    if (!contact) { b.sansContact++; return; }
    if (ecartee) { b.incoherentes++; return; }
    const avec = [2, 3, 4, 5, 6].map(k => { const p = String(valSEE(C, r, 'PartNo' + k) || '').trim(), q = numSEE(valSEE(C, r, 'Quantity' + k)); return p ? (q > 1 ? q + ' × ' : '') + p : ''; }).filter(Boolean).join(' + ');
    const q1 = numSEE(valSEE(C, r, 'Quantity1')), n = numSEE(valSEE(C, r, 'RuleNum'));
    g.familles.forEach((famille, i) => { const brut = { famille, sexe, taille, typeFil: String(valSEE(C, r, 'WireType') || '*'), jauge, reference: contact, accessoire: avec,
        note: 'SEE · règle ' + g.pn + (g.version ? ' v' + g.version : '') + (n != null ? ' n° ' + n : '') + (q1 > 1 ? ' · ' + q1 + ' contacts' : '') + (g.statut === 'en cours' ? ' · règle en cours (In Work)' : ''),
        statut: g.statut === 'en cours' ? 'à confirmer' : '' };
      const x = contactNorme(brut); if (!x) { b.tailleIllisible++; illisibleSEE(b, famille + ' · taille ' + taille); return; } const k = cleDeLigne('contacts', x), e = best.get(k), rg = rang(g, n);
      V.cle(g, k, x, n, r, i === 0);   // la paire broche ↔ douille, deux contacts pour une même clé
      if (!e) best.set(k, { brut, rg }); else { if (e.brut.reference !== contact) b.conflits++; if (mieux(rg, e.rg)) best.set(k, { brut, rg }); } }); });
  V.fin(regles, best);
  const out = [...best.values()].map(x => x.brut); out.forEach(x => { b.familles[x.famille] = (b.familles[x.famille] || 0) + 1; }); b.retenues = out.length;
  b.illisibles = Object.fromEntries(Object.entries(b.illisibles || {}).sort((u, v) => v[1] - u[1]).slice(0, 6));
  if (b.moinsUn) Object.keys(b.moinsUn).forEach(k => { b.moinsUn[k] = Object.entries(b.moinsUn[k]).sort((u, v) => v[1] - u[1] || triNaturel(u[0], v[0])).slice(0, 10); }); return out; }
/* LA CAVITÉ −1 (le lecteur ne sait pas ce qu'elle veut dire — 431 lignes dans sa base, octobre 2026) : ce que portent ces
   lignes — leurs règles, leurs contacts, leurs types et gauges de câble — compté, pour que la base dise elle-même si −1 est
   « toute taille » (une règle qui vaut pour toutes les cavités) ou « pas de cavité » (une cosse, un manchon, une reprise
   de blindage). Des références de catalogue seulement : rien du plan ouvert. */
function moinsUnSEE(b, g, C, r) { const m = b.moinsUn || (b.moinsUn = { regles: {}, contacts: {}, types: {}, jauges: {} }), inc = (o, k) => { o[k] = (o[k] || 0) + 1; };
  const wg = numSEE(valSEE(C, r, 'WireGauge'));
  inc(m.regles, g.pn || 'règle sans nom'); inc(m.contacts, String(valSEE(C, r, 'PartNo1') || '').trim() || 'aucun contact');
  inc(m.types, String(valSEE(C, r, 'WireType') || '').trim() || '*'); inc(m.jauges, wg == null || wg === -1 ? 'toute gauge (−1)' : wg === -2 ? 'sans câble (−2)' : awgSEE(wg) ? awgSEE(wg) + ' AWG' : nombre(wg) + ' mm²'); }
// ce qui n'a pas pu se lire, compté par valeur brute : les six plus fréquentes se montrent (l'onglet Import, « Ce qui n'est pas pris »)
function illisibleSEE(b, k) { const m = b.illisibles || (b.illisibles = {}); m[k] = (m[k] || 0) + 1; }

/* LES CÂBLES : la vue, ses conducteurs (le lien câble ↔ conducteur, sinon l'IDCable du conducteur), la plus récente des
   versions validées d'une même référence. Chaque ligne qui n'est pas obsolète passe les contrôles de la cohérence
   (verifCableSEE : la physique, le Ø contre la gauge, les cases vides), puis les retenues se comparent à leurs sœurs. */
function cablesDeSEE(T, B, K) { const V = T.cables, b = B.cables = { lus: 0, retenus: 0, sansConducteur: 0, obsoletes: 0 }; if (!V) return [];
  const N = normePhysiqueSEE(), lignes = new WeakMap();
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
    if (K && st !== 'obsolète') verifCableSEE(K, N, V, r, brut); lignes.set(brut, r);
    const rg = [st === 'validée' ? 2 : st === 'en cours' ? 1 : 0, numSEE(valSEE(V, r, 'Version')) || 0], e = best.get(cle);
    if (!e || rg[0] > e.rg[0] || (rg[0] === e.rg[0] && rg[1] > e.rg[1])) best.set(cle, { brut, rg }); });
  const out = [...best.values()].map(x => x.brut); b.retenus = out.length; if (K) soeursSEE(K, V, out, lignes); return out; }

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
   une face ronde autour de son centre (SEE place l'origine au centre de l'insert), une rectangulaire dans son cadre.
   Chaque face passe les contrôles de la cohérence (verifFacesSEE : son compte, ses noms, leur casse, ses tailles, ses
   contacts qui se chevauchent) ; son compte de broches se garde pour les connecteurs qui la désignent. */
function modulesDeSEE(T, B, K) { const A = T.arrangements, P = T.broches, b = B.faces = { lus: 0, retenus: 0, sansBroche: 0, illisibles: 0, familles: {} }; if (!A || !P) return [];
  const broches = new Map(); P.lignes.forEach(r => { const id = idSEE(P, r, 'IDPlugMap'); if (id) (broches.get(id) || broches.set(id, []).get(id)).push(r); });
  const out = [], V = K ? verifFacesSEE(K, A) : null;
  A.lignes.forEach(r => { b.lus++; const ids = [idSEE(A, r, 'ID'), idSEE(A, r, 'IDEquipment')], ps = ids.map(id => broches.get(id)).find(Boolean);
    if (K) ids.filter(Boolean).forEach(id => K.t.faces.set(id, { pn: String(valSEE(A, r, 'PartNo') || ''), n: ps ? ps.length : 0, st: statutSEE(valSEE(A, r, 'LCStatusName')) }));
    if (!ps || !ps.length) { b.sansBroche++; return; }
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
    if (V) V.face(r, pn, av, pins, out[out.length - 1]);
    b.familles[av.famille] = (b.familles[av.famille] || 0) + 1; });
  b.retenus = out.length; return out; }

/* LES ÉQUIPEMENTS : une entrée par référence (connecteurs et équipements), la paire fiche ↔ embase, les programmes. La
   cohérence (verifEquipementsSEE) : le compte de contacts d'un connecteur contre son arrangement, chaque paire dans les
   deux sens (une fiche avec une embase, des broches avec des douilles, autant de contacts), l'obsolète encore employé,
   les programmes. */
function equipementsDeSEE(T, B, K) { const b = B.equipements = { connecteurs: 0, equipements: 0, accouplements: 0, obsoletes: 0 }, liste = [], parId = new Map(), prog = new Map(), lignes = new Map();
  const court = s => { const t = String(s || '').split(/\s*\\\s*/).filter(Boolean); return t.slice(-2).join(' \\ '); };
  [['connecteurs', 'connecteur'], ['equipements', 'équipement']].forEach(([k, genre]) => { const V = T[k]; if (!V) return;
    V.lignes.forEach(r => { const pn = String(valSEE(V, r, 'PartNo') || '').trim(); if (!pn) return; const st = statutSEE(valSEE(V, r, 'LCStatusName'));
      const epf = String(valSEE(V, r, 'EPFList') || '').split(',').map(x => x.trim()).filter(Boolean); epf.forEach(p => prog.set(p, (prog.get(p) || 0) + 1));
      const e = { p: pn, k: genre, d: String(valSEE(V, r, 'Description') || '').slice(0, 120), cat: court(valSEE(V, r, 'CategoryFullPath')), ty: String(valSEE(V, r, 'Type') || valSEE(V, r, 'EquipmentType') || valSEE(V, r, 'ClassName') || ''),
        cx: String(valSEE(V, r, 'ConnectivityType') || ''), g: String(valSEE(V, r, 'Gender') || ''), n: numSEE(valSEE(V, r, 'DesiredPinsCount')) || numSEE(valSEE(V, r, 'TotalNumberOfPins')) || null,
        std: String(valSEE(V, r, 'PartNoStandard1') || ''), epf, st, cap: String(valSEE(V, r, 'Capacity') || ''), tmin: numSEE(valSEE(V, r, 'TemperatureMini')), tmax: numSEE(valSEE(V, r, 'TemperatureMaxi')), m: [] };
      b[k]++; if (st === 'obsolète') b.obsoletes++; liste.push(e); lignes.set(e, { T: V, r, pm: idSEE(V, r, 'IDPlugMap'), epfCol: aColSEE(V, 'EPFList') });
      [idSEE(V, r, 'ID'), idSEE(V, r, 'IDEquipment')].filter(Boolean).forEach(id => parId.set(id, e)); }); });
  const M = T.accouplements, W = K ? verifEquipementsSEE(K, lignes, M) : null;
  if (M) M.lignes.forEach(r => { const a = parId.get(idSEE(M, r, 'IDSemiEqu')), c = parId.get(idSEE(M, r, 'IDConnectedSemiEqu')); if (!a || !c) return; b.accouplements++;
    const pref = numSEE(valSEE(M, r, 'Prefered')) === 1; if (W) W.paire(a, c, pref, r);
    [[a, c], [c, a]].forEach(([x, y]) => { if (x.m.length < 8 && !x.m.some(z => z.p === y.p)) x.m[pref ? 'unshift' : 'push']({ p: y.p, pref }); }); });
  if (W) W.fin(liste, prog);
  return { liste, programmes: [...prog].sort((x, y) => y[1] - x[1]) }; }

/* ---- LA COHÉRENCE : la base vérifiée ligne par ligne, pendant l'import ------------------------------------------
   Le lecteur (20 octobre 2026) : « Tu as pu vérifier si toute notre base de SEE est correcte et cohérente ? Elle apporte
   quoi de plus que les photos que je t'ai données ? Tout est correct ? Les contacts, tyrap… ? Tout ? » Sa base ne sort
   jamais de son PC : Volta la vérifie chez lui, ligne par ligne, pendant l'import. Chaque contrôle compte ses lignes,
   garde ses dix premiers exemples — une référence de catalogue, ce qui cloche, la ligne de la feuille Excel — et dit ce
   que Volta en fait. Une ligne qui se contredit elle-même (une référence femelle sur une ligne mâle, une taille 16 pour
   une cavité 20, un câble trop gros pour le fût, un Ø sous celui du conducteur) ne passe jamais devant Volta, comme un
   chiffre impossible pour sa jauge : elle est écartée. Ce qui se garde avec la base (`I.coherence`) : des comptes et des
   références de catalogue, jamais le plan. L'onglet « Cohérence » (08-see) les montre, le rapport en texte les copie. */
// [groupe, clé, gravité, titre, ce que Volta en fait] — la gravité : « ko » une erreur (la ligne se contredit : Volta
// l'écarte), « att » à voir (Volta la prend, à vérifier dans SEE), « info » pour information
const CONTROLES_SEE = [
  ['contacts', 'c-sexe', 'ko', 'Sexe contre la référence', 'Écartée : la référence dit l’autre sexe. Volta garde sa ligne, s’il en a une.'],
  ['contacts', 'c-taille', 'ko', 'Taille de la référence contre la cavité', 'Écartée : le contact n’entre pas dans la cavité. Volta garde sa ligne, s’il en a une.'],
  ['contacts', 'c-fut-gros', 'ko', 'Câble trop gros pour le fût', 'Écartée : le câble n’entre pas dans le fût. Volta garde sa ligne, s’il en a une.'],
  ['contacts', 'c-fut-fin', 'att', 'Câble plus fin que le fût', 'Prise : le sertissage serait lâche — il manque peut-être un fourreau E0718, ou un autre fût.'],
  ['contacts', 'c-forme', 'att', 'Référence d’une famille inconnue', 'Prise telle quelle : Volta n’en lit ni la taille ni le fût.'],
  ['contacts', 'c-partie', 'att', 'Partie EN 3155 inconnue, ou d’une taille qu’elle n’a pas', 'Prise : à vérifier dans SEE.'],
  ['contacts', 'c-paire', 'att', 'Broche et douille d’une même clé qui ne vont pas ensemble', 'Prises toutes les deux : à vérifier dans SEE.'],
  ['contacts', 'c-conflit', 'att', 'Deux contacts validés pour une même clé', 'Volta retient la règle validée la plus récente, au plus petit numéro.'],
  ['contacts', 'c-encours', 'att', 'Règles en cours (In Work) employées', 'Leurs lignes sont prises « à confirmer ».'],
  ['contacts', 'c-obsolete', 'att', 'Règles obsolètes sans version validée', 'Ignorées : la famille n’a pas de contact de SEE, Volta garde les siens.'],
  ['contacts', 'c-illisible', 'att', 'Cavité, sexe ou gauge illisibles', 'Écartées : Volta ne sait pas où les ranger.'],
  ['contacts', 'c-seul', 'info', 'Un sexe sans l’autre, dans une règle qui a les deux', 'Rien : la ligne de l’autre sexe manque peut-être.'],
  ['cables', 'k-physique', 'ko', 'Masse ou résistance impossible pour la gauge et le métal', 'Écartée : Volta garde sa valeur ; sans ligne Volta, la case reste vide.'],
  ['cables', 'k-diametre', 'ko', 'Ø plus petit que le conducteur', 'Écarté : Volta garde son Ø ; sans ligne Volta, la case reste vide.'],
  ['cables', 'k-diametre-gros', 'att', 'Ø trop grand pour la gauge', 'Pris : une unité (m, mm) à vérifier ?'],
  ['cables', 'k-soeurs', 'att', 'Plus gros, plus lourd ou moins résistant qu’une sœur de gauge plus grosse', 'Pris : à vérifier dans SEE.'],
  ['cables', 'k-vides', 'info', 'Cases vides', 'Volta garde la sienne (la note le dit) ; sans ligne Volta, la case reste vide.'],
  ['faces', 'f-doublons', 'ko', 'Deux contacts du même nom', 'Volta garde sa face s’il la connaît ; une face nouvelle est prise telle quelle.'],
  ['faces', 'f-chevauche', 'ko', 'Contacts qui se chevauchent', 'Dessinée telle quelle — la sienne si la norme vérifiée la garde.'],
  ['faces', 'f-compte', 'att', 'Nombre de contacts contre la désignation', 'Prise : la norme vérifiée garde la sienne, sinon SEE gagne.'],
  ['faces', 'f-tailles', 'att', 'Tailles contre la norme', 'La norme vérifiée garde sa face ; sinon SEE gagne.'],
  ['faces', 'f-casse', 'info', 'Casse des noms (c pour C)', 'Volta reprend les noms de la norme, aux places de SEE.'],
  ['equipements', 'e-nature', 'ko', 'Paire de deux fiches ou de deux embases', 'Montrée telle quelle sur la fiche : à corriger dans SEE.'],
  ['equipements', 'e-sexe', 'ko', 'Paire de deux mêmes sexes (broches avec broches)', 'Montrée telle quelle sur la fiche : à corriger dans SEE.'],
  ['equipements', 'e-contacts', 'att', 'Paire dont les nombres de contacts diffèrent', 'Montrée telle quelle : à vérifier dans SEE.'],
  ['equipements', 'e-compte', 'att', 'Connecteur : nombre de contacts contre son arrangement', 'Volta dit celui du connecteur : à vérifier dans SEE.'],
  ['equipements', 'e-obsolete', 'att', 'Obsolètes encore employés', 'La fiche le dit (« obsolète dans SEE »).'],
  ['equipements', 'e-programmes', 'att', 'Un même programme écrit de deux façons', 'Le choix du programme les montre toutes les deux.'],
  ['equipements', 'e-sens', 'info', 'Paire déclarée d’un seul côté', 'Volta la lit dans les deux sens.'],
  ['equipements', 'e-sans-programme', 'info', 'Références déclarées pour aucun programme', 'Rien : « pas déclarée pour » ne se dit pas.'],
  ['liens', 'l-orphelins', 'att', 'Renvois qui ne mènent nulle part', 'Ignorés : la pièce désignée n’est dans aucune feuille.'],
  ['liens', 'l-sans-table', 'info', 'Renvois vers une table absente du classeur', 'Ignorés : exportez la table pour les relier.'],
  ['liens', 'l-references', 'info', 'Pièces citées par les règles, définies dans aucune feuille', 'Prises par leur référence seule.'],
  ['sources', 's-verifiees', 'att', 'SEE contredit une ligne que deux sources ont vérifiée', 'Volta garde la sienne : à corriger dans SEE.'],
  ['sources', 's-ecarts', 'att', 'Écarts d’un facteur 2 ou plus avec Volta', 'SEE gagne : à vérifier dans SEE.'],
  ['sources', 's-remplace', 'info', 'Lignes « à confirmer » de Volta que SEE remplace', 'SEE gagne.']];
const GROUPES_SEE = [['contacts', 'Contacts à sertir'], ['cables', 'Câbles'], ['faces', 'Faces des connecteurs'], ['equipements', 'Connecteurs et équipements'], ['liens', 'Liens entre feuilles'], ['sources', 'Face aux sources vérifiées de Volta']];
const MAX_EXEMPLES_SEE = 10;
const coherenceVideSEE = () => ({ v: 1, c: {}, sur: { regles: 0, lignes: 0, cables: 0, faces: 0, broches: 0, connecteurs: 0, equipements: 0, paires: 0 }, formes: {}, versions: {}, t: { faces: new Map(), formes: new Map(), cites: new Set() } });
/* Noter un cas : le compte (n, 1 d'office), et les dix premiers exemples — { r : la référence, d : ce qui cloche, l : la
   ligne Excel, f : la feuille }. */
function noterSEE(K, cle, ref, detail, T, r, n) { const c = K.c[cle] || (K.c[cle] = { n: 0, ex: [] }); c.n += n || 1;
  if (T && T.nom && !c.f) c.f = T.nom; if (c.ex.length < MAX_EXEMPLES_SEE) c.ex.push({ r: String(ref == null ? '' : ref), d: String(detail || ''), l: (r && r.l) || null, f: T && T.nom && T.nom !== c.f ? T.nom : undefined }); }
const plusSEE = (K, cle, k) => { const c = K.c[cle] || (K.c[cle] = { n: 0, ex: [] }); (c.plus || (c.plus = {}))[k] = (c.plus[k] || 0) + 1; };
// ce qui ne se garde pas (les index du temps de l'import) : la cohérence gardée n'a que des comptes et des références
function finirCoherenceSEE(K) { K.formes = Object.fromEntries([...K.t.formes].map(([f, s]) => [f, s.size])); K.cites = [...K.t.cites]; delete K.t; return K; }

/* LES CONTACTS. La forme de la référence (une famille connue : EN 3155, M39029, ASNE, NSA…) ; une EN 3155 écrit tout
   dans sa référence — EN3155-<partie><M|F><taille><fût> (EN3155-008M2020 : partie 008, mâle, taille 20, fût 20) —, sa
   partie se lit dans la table Parties de l'EN 3155 (un contact ? de cette taille ? de ce sexe ?), sa lettre contre la
   colonne ContactType, sa taille contre la cavité (ContactGauge), son fût contre la gauge du câble (WireGauge) d'après la
   table Courant des contacts (un fût 20 reçoit du 20 au 24 AWG). Puis, règle par règle : la paire broche ↔ douille d'une
   même clé, un sexe sans l'autre, deux contacts validés pour une même clé, les règles en cours et les obsolètes qui
   portent encore des lignes. */
const FORMES_CONTACT_SEE = [['EN 3155', /^EN\s?3155-?\d{3}[MF]\d{2}(\d{2})?[A-Z]{0,3}$/i], ['M39029', /^(M|AS)39029\/\d+-\d+[A-Z]?$/i], ['ASNE', /^ASNE\s?\d{4}/i], ['NSA', /^NSA\s?\d{6}/i],
  ['E (Airbus Helicopters)', /^E\d{4}/i], ['ECS', /^ECS\d{3,}/i], ['ABS', /^ABS\d{4}/i], ['MS, NAS', /^(MS|NAS)\d{3,}/i], ['EN (autres)', /^(PR)?EN\s?(?!3155)\d{4}/i]];
const formeContactSEE = ref => (FORMES_CONTACT_SEE.find(([, re]) => re.test(ref)) || [''])[0];
const EN3155_SEE = /^EN\s?3155-?(\d{3})([MF])(\d{2})(\d{2})?([A-Z]{0,3})$/i, TAILLES_EN3155_SEE = [26, 23, 22, 20, 16, 12, 10, 8, 5, 4, 1, 0];
// la table Parties de l'EN 3155 : numéro → { sexe, tailles, contact } (« M / F » sur deux numéros : le premier mâle, le second
// femelle) ; une plage « 22 à 10 » comprend la taille 23 (le contact « 23/22 » de l'EN 4165, sur un fût 22 : le projet
// prEN 3155-002:2026 l'ajoute aux -003 et -008, normes/contacts.csv)
function partiesEN3155SEE(N) { const m = new Map();
  (normeDesModules(N).partiesEN3155 || []).forEach(p => { const s = String(p.sexe || '').toUpperCase().replace(/\s/g, ''), t = String(p.taille || ''), a = /(\d+)\s*à\s*(\d+)/.exec(t);
    const tailles = a ? TAILLES_EN3155_SEE.filter(x => (x <= +a[1] || (x === 23 && +a[1] === 22)) && x >= +a[2]) : (t.match(/\d+/g) || []).map(Number);
    p.numeros.forEach((n, i) => m.set(n, { sexe: s === 'M/F' ? (p.numeros.length === 2 ? ['M', 'F'][i] : '') : /^[MF]$/.test(s) ? s : '', tailles: tailles.length ? new Set(tailles) : null, contact: !!p.type, titre: p.titre })); });
  return m; }
// les jauges que chaque fût reçoit (table Courant des contacts : fût 20 → 20, 22, 24)
function futsSEE(N) { const m = new Map(); (normeDesModules(N).courantsContacts || []).forEach(c => { if (c.fut == null || c.jauge == null) return; (m.get(c.fut) || m.set(c.fut, new Set()).get(c.fut)).add(c.jauge); }); return m; }
const sexeMotSEE = s => s === 'M' ? 'mâle' : s === 'F' ? 'femelle' : '?';
// les deux tables, lues une fois par norme
const PARTIES_SEE = new WeakMap(), FUTS_SEE = new WeakMap();
const partiesDeSEE = N => { const k = normeDesModules(N).partiesEN3155 || []; if (!PARTIES_SEE.has(k)) PARTIES_SEE.set(k, partiesEN3155SEE(N)); return PARTIES_SEE.get(k); };
const futsDeSEE = N => { const k = normeDesModules(N).courantsContacts || []; if (!FUTS_SEE.has(k)) FUTS_SEE.set(k, futsSEE(N)); return FUTS_SEE.get(k); };
const plageAwgSEE = js => { const a = [...js].sort((x, y) => x - y); return a[0] + (a.length > 1 ? ' à ' + a[a.length - 1] : '') + ' AWG'; };
/* LE DIAGNOSTIC D'UNE RÉFÉRENCE EN 3155 pour une clé (sexe, taille de cavité, gauge du câble) : ce qui ne va pas, chaque
   point avec son contrôle (c-partie, c-sexe, c-taille, c-fut-gros, c-fut-fin) et s'il écarte la ligne. Vide : la
   référence convient — ou elle n'est pas une EN 3155 (rien ne s'y lit). `ct` : le sexe tel que SEE l'écrit (Male, Pin). */
function diagnosticContactSEE(N, ref, sexe, taille, jauge, ct) { const m = EN3155_SEE.exec(String(ref || '').trim()); if (!m) return [];
  const P = partiesDeSEE(N), FU = futsDeSEE(N), out = [], partie = m[1], lettre = m[2].toUpperCase(), tr = +m[3], fu = m[4] ? +m[4] : null, p = P.get(partie), d = (cle, ecarte, texte) => out.push({ cle, ecarte, texte });
  if (P.size && !p) d('c-partie', false, 'partie -' + partie + ' que l’EN 3155 n’a pas');
  else if (p && !p.contact) d('c-partie', false, 'la partie -' + partie + ' n’est pas un contact (' + p.titre + ')');
  else if (p && p.tailles && !p.tailles.has(tr)) d('c-partie', false, 'la partie -' + partie + ' n’existe qu’en taille' + (p.tailles.size > 1 ? 's ' : ' ') + [...p.tailles].join(', '));
  if (sexe && lettre !== sexe) d('c-sexe', true, sexeMotSEE(lettre) + ' (' + lettre + ') sur une ligne ' + (ct || sexeMotSEE(sexe)));
  else if (p && p.contact && p.sexe && p.sexe !== lettre) d('c-sexe', true, 'la partie -' + partie + ' est ' + sexeMotSEE(p.sexe) + ', la lettre ' + lettre + ' dit ' + sexeMotSEE(lettre));
  if (taille && taille !== '*' && parseFloat(tailleCaviteSEE(taille)) !== tr) d('c-taille', true, 'taille ' + tr + ' pour une cavité ' + taille);
  if (fu != null && jauge != null && !isNaN(jauge)) { const js = FU.get(fu), lo = js ? Math.min(...js) : fu, hi = js ? Math.max(...js) : fu + 4, pl = js ? plageAwgSEE(js) : lo + ' à ' + hi + ' AWG';
    if (jauge < lo) d('c-fut-gros', true, 'fût ' + fu + ' (' + pl + ') pour un câble de ' + jauge + ' AWG');
    else if (jauge > hi) d('c-fut-fin', false, 'fût ' + fu + ' (' + pl + ') pour un câble de ' + jauge + ' AWG'); }
  return out; }
/* LE CONTACT DE SEE EST-IL FAUX POUR SA CLÉ ? (la deuxième passe de corroboration, 20 octobre 2026 : les catalogues
   vérifient qu'un contact CONVIENT, pas qu'il est le seul choix — le choix d'un contact valable reste celui du programme,
   donc de SEE). Faux : un sexe contraire, une taille ou un fût qui ne logent pas la cavité ou la gauge, une partie que
   l'EN 3155 n'a pas ou qui n'est pas un contact ; une autre référence qu'une EN 3155, quand Volta ne la connaît pour
   aucun contact de la famille, de ce sexe et de cette taille (un nom écrit en entier, KB0800 → E0613KB0800, la connaît).
   Rend la raison, ou '' : le contact convient. */
const REFS_FAMILLE_SEE = new WeakMap();
function contactFauxSEE(x) { const N = normePhysiqueSEE(), ref = String(x.reference || '').trim(); if (!ref) return '';
  const D = diagnosticContactSEE(N, ref, x.sexe, x.taille, x.jauge); if (D.length) return D[0].texte; if (EN3155_SEE.test(ref)) return '';
  const C = normeEmbarqueeLue().contacts || []; let m = REFS_FAMILLE_SEE.get(C);
  if (!m) { m = new Map(); C.forEach(c => { const k = c.famille + '|' + c.sexe + '|' + tailleCaviteSEE(c.taille); (m.get(k) || m.set(k, []).get(k)).push(cleNorme(c.reference)); }); REFS_FAMILLE_SEE.set(C, m); }
  const connues = m.get(x.famille + '|' + x.sexe + '|' + tailleCaviteSEE(x.taille)) || [], r = cleNorme(ref);
  return !connues.length || connues.some(c => c === r || r.endsWith(c) || c.endsWith(r)) ? '' : 'référence que Volta ne connaît pour aucun contact ' + sexeMotSEE(x.sexe) + ' taille ' + x.taille + ' de la famille'; }
function verifContactsSEE(K, T) { const N = normePhysiqueSEE(), C = T.contacts, R = T.regles, parRegle = new Map(), conf = new Map();
  const de = g => 'règle ' + g.pn + (g.version ? ' v' + g.version : '');
  const fut = r => { const m = EN3155_SEE.exec(r); return m ? m[3] + (m[4] || '') : null; };
  return {
    // une ligne : rend vrai quand elle se contredit (Volta l'écarte)
    ligne(g, r, o) { K.sur.lignes++; for (let k = 1; k <= 6; k++) { const p = String(valSEE(C, r, 'PartNo' + k) || '').trim(); if (p) K.t.cites.add(p); }
      const ref = o.contact; if (!ref) return false; let ecartee = false; const f = formeContactSEE(ref);
      (K.t.formes.get(f || 'forme inconnue') || K.t.formes.set(f || 'forme inconnue', new Set()).get(f || 'forme inconnue')).add(ref);
      if (!f) { noterSEE(K, 'c-forme', ref, (/^EN\s?3155/i.test(ref) ? 'commence comme une EN 3155 sans en avoir la forme (EN3155-<partie><M|F><taille><fût>)' : 'aucune famille connue n’a cette forme') + ' — ' + de(g), C, r); return false; }
      const j = o.wg == null || o.wg < 0 ? null : parseInt(awgSEE(o.wg), 10);
      diagnosticContactSEE(N, ref, o.sexe, o.taille, isNaN(j) ? null : j, o.ct).forEach(x => { if (x.ecarte) ecartee = true; noterSEE(K, x.cle, ref, x.texte + ' — ' + de(g), C, r); });
      return ecartee; },
    illisible(g, r, ref, t) { noterSEE(K, 'c-illisible', ref || '—', t + ' — ' + de(g), C, r); },
    // une clé retenue : la paire de sa règle (un sexe par clé de règle), et ses contacts validés
    cle(g, k, x, n, r, premiere) { if (premiere) { const q = parRegle.get(g) || parRegle.set(g, { sexes: new Set(), cles: new Map() }).get(g), k2 = [x.taille, x.typeFil, x.jauge].join('/'), e = q.cles.get(k2) || q.cles.set(k2, { x, M: new Map(), F: new Map() }).get(k2);
        q.sexes.add(x.sexe); if (!e[x.sexe].has(x.reference)) e[x.sexe].set(x.reference, r); }
      if (g.statut === 'validée') { const e = conf.get(k) || conf.set(k, { x, refs: new Map() }).get(k); if (!e.refs.has(x.reference)) e.refs.set(x.reference, { g, n, r }); } },
    fin(regles, best) { const vues = new Set([...regles.values()]);
      parRegle.forEach((q, g) => q.cles.forEach(e => { const mots = motsContactSEE(e.x).replace(/ · (mâle|femelle) · /, ' · ');
        if (e.M.size && e.F.size) { const M = [...e.M.keys()], F = [...e.F.keys()], mal = M.flatMap(a => F.map(b => [a, b])).find(([a, b]) => fut(a) && fut(b) && fut(a) !== fut(b));
          if (mal) noterSEE(K, 'c-paire', mal.join(' / '), 'tailles et fûts ' + fut(mal[0]) + ' et ' + fut(mal[1]) + ' — ' + mots + ' — ' + de(g), C, e.M.get(mal[0])); }
        else if (q.sexes.size > 1) { const s = e.M.size ? 'M' : 'F', [ref, r] = [...e[s]][0]; noterSEE(K, 'c-seul', ref, sexeMotSEE(s) + ' seulement — ' + mots + ' — ' + de(g), C, r); } }));
      // deux contacts validés pour une même clé (un nom écrit en entier, KB0800 → E0613KB0800, est le même contact)
      conf.forEach((e, k) => { const refs = [...e.refs.keys()].filter((a, i, xs) => !xs.some((b, j) => j !== i && b !== a && b.endsWith(a))); if (refs.length < 2) return;
        const garde = best.get(k) && best.get(k).brut.reference, txt = refs.map(a => { const o = e.refs.get(a); return a + ' (' + de(o.g) + (o.n != null ? ' n° ' + o.n : '') + ')'; }).join(', ');
        noterSEE(K, 'c-conflit', refs.join(' / '), motsContactSEE(e.x) + ' — ' + txt + (garde ? ' ; Volta retient ' + garde : ''), C, e.refs.get(refs.find(a => a !== garde) || refs[0]).r); });   // la ligne : celle que Volta ne retient pas
      // les règles en cours employées, les obsolètes qui portent des lignes sans version validée de leur famille
      const validees = new Set(); vues.forEach(g => { if (g.statut === 'validée' && /^contact/i.test(g.classe)) g.familles.forEach(f => { validees.add(f); K.versions[f] = Math.max(K.versions[f] || 0, g.version || 0); }); });
      vues.forEach(g => { if (!/^contact/i.test(g.classe)) return; if (g.statut !== 'obsolète') K.sur.regles++;
        if (g.statut === 'en cours' && g.n) noterSEE(K, 'c-encours', g.pn, (g.version ? 'v' + g.version + ' · ' : '') + plurielLie(g.n, 'ligne') + ' de contact prise' + (g.n > 1 ? 's' : '') + ' « à confirmer »', R, g.r);
        if (g.statut === 'obsolète' && g.n) { const sans = g.familles.filter(f => !validees.has(f));
          if (sans.length) noterSEE(K, 'c-obsolete', g.pn, (g.version ? 'v' + g.version + ' · ' : '') + plurielLie(g.n, 'ligne') + ' ; aucune règle validée pour ' + sans.join(', '), R, g.r); else plusSEE(K, 'c-obsolete', 'remplacées'); } }); } }; }

/* LES CÂBLES. La physique (physiqueDuCable : une masse sous le métal seul de ses conducteurs, une résistance sous un
   cuivre pur), le Ø contre la gauge — jamais sous le conducteur nu (0,127 × 92^((36 − n)/39) mm : 0,81 mm en 20 AWG), au
   plus cinq fois le faisceau de ses conducteurs plus 2 mm (un Ø en mètres lu en millimètres, une virgule de travers) —, les
   cases vides ; puis chaque famille contre ses sœurs (mêmes brins, même blindage, même nature) : une gauge plus fine
   n'est ni plus grosse, ni plus lourde, ni moins résistante (un DR22 plus gros qu'un DR20). Un coaxial, un twinax, une
   fibre n'ont pas de gauge qui juge leur Ø. */
const diametreConducteurSEE = j => 0.127 * Math.pow(92, (36 - j) / 39);
function diametreSEE(x, brinsSus) { if (!x || x.diametre == null || !(x.diametre > 0) || x.jauge == null || /coax|twinax|quadrax|triax|fibre/i.test(x.nature || '')) return null;
  const d = diametreConducteurSEE(x.jauge), haut = 5 * d * Math.sqrt(brinsSus || x.brins || 1) + 2, j = nombreFr(x.jauge) + ' AWG';
  if (x.diametre < 1.05 * d) return { cle: 'k-diametre', champ: 'diametre', valeur: x.diametre, borne: d, texte: 'Ø ' + nombreFr(x.diametre) + ' mm : moins que son conducteur nu de ' + j + ' (' + nombreFr(Math.round(d * 100) / 100) + ' mm)' };
  if (x.diametre > haut) return { cle: 'k-diametre-gros', champ: 'diametre', valeur: x.diametre, borne: haut, texte: 'Ø ' + nombreFr(x.diametre) + ' mm pour ' + (x.brins > 1 ? x.brins + ' conducteurs' : 'un conducteur') + ' de ' + j + ' (' + nombreFr(Math.round(haut * 10) / 10) + ' mm au plus)' };
  return null; }
/* Ce que la physique interdit à un câble de SEE : celle du moteur (masse, résistance), et le Ø sous le conducteur nu —
   écartés tous les trois (avecBaseSEE, ecartsSEE). */
const physiqueSEE = (N, c) => { const P = physiqueDuCable(N, c), d = diametreSEE(c); return d && d.cle === 'k-diametre' ? P.concat([d]) : P; };
function verifCableSEE(K, N, T, r, brut) { K.sur.cables++; const x = cableNorme(brut); if (!x) return; const ref = brut.cable;
  const P = physiqueDuCable(N, x); if (P.length) noterSEE(K, 'k-physique', ref, P.map(p => p.texte).join(' ; '), T, r);
  const d = diametreSEE(x, brut.brins === '' ? 4 : null); if (d) noterSEE(K, d.cle, ref, d.texte, T, r);
  const vides = [['diametre', 'Ø'], ['masse', 'masse'], ['jauge', 'gauge'], ['resistance', 'résistance'], ['blindage', 'blindage']].filter(([k]) => String(brut[k] == null ? '' : brut[k]).trim() === '').map(v => v[1]);
  if (vides.length) { noterSEE(K, 'k-vides', ref, (vides.length > 1 ? 'vides : ' : 'vide : ') + vides.join(', '), T, r); vides.forEach(v => plusSEE(K, 'k-vides', v)); } }
function soeursSEE(K, T, cables, lignes) { const g = new Map();
  cables.forEach(b => { const x = cableNorme(b); if (!x || x.jauge == null) return; x.r = lignes.get(b); const k = [x.famille, x.brins, x.blindage, x.nature].join('/'); (g.get(k) || g.set(k, []).get(k)).push(x); });
  g.forEach(xs => { xs.sort((a, c) => c.jauge - a.jauge); const pb = new Map();   // du plus fin au plus gros
    [['diametre', 'Ø', ' mm', 1], ['masse', 'masse', ' g/m', 1], ['resistance', 'R', ' mΩ/m', -1]].forEach(([k, t, u, s]) => { const ys = xs.filter(x => x[k] > 0);
      for (let i = 0; i + 1 < ys.length; i++) { const a = ys[i], c = ys.slice(i + 1).find(y => y.jauge < a.jauge); if (!c) continue;
        if (s > 0 ? a[k] > c[k] * 1.02 : a[k] < c[k] / 1.02) (pb.get(a) || pb.set(a, []).get(a)).push(t + ' ' + nombreFr(a[k]) + u + ', ' + (s > 0 ? 'plus' : 'moins') + ' que ' + c.cable + ' (' + nombreFr(c[k]) + u + ')'); } });
    pb.forEach((ts, a) => noterSEE(K, 'k-soeurs', a.cable, ts.join(' ; '), T, a.r)); }); }

/* LES FACES. Le compte de broches contre ce qui le dit : la face de la norme quand Volta la connaît, sinon la désignation
   (EN 2997, EN 3646, ASNE 0059 : <boîtier>-<nombre de contacts>, sauf les arrangements spéciaux 33 et 9x ; EN 4165 :
   <nombre><lettre><taille>), et le DesiredPinsCount de l'arrangement ; deux broches du même nom ; la casse (SEE écrit c
   pour C : Volta reprend les noms de la norme) ; les tailles contre la face de la norme, contre celles que la norme
   connaît à la famille, contre la taille que la désignation EN 4165 écrit ; deux contacts qui se chevauchent (leurs
   centres plus proches que leurs Ø de broche, en mm : SEE écrit X et Y en mètres), ou une face sans dessin. */
const DIAMETRE_BROCHE_SEE = { 26: 0.4, 23: 0.6, 22: 0.76, '22D': 0.76, 20: 1.02, 16: 1.6, 12: 2.4, 10: 3, 8: 3.6, '8T': 3.6, 5: 4.5, 4: 5, 1: 6, 0: 8 };
function compteDeDesignationSEE(av) { const f = av.famille, v = av.variante; let m;
  if (/^(EN2997|EN3646|ASNE0059)$/.test(f) && (m = /^(\d{1,2})-(\d{1,3})$/.exec(v)) && !/^(33|9\d)$/.test(m[2])) return +m[2];
  if (f === 'EN4165' && (m = /^(\d{2})[-A-Z](\d{2})$/.exec(v)) && m[1] !== '99') return +m[1];
  return null; }
const normeVoltaSEE = () => normeAvecApports(normeEmbarqueeLue(), typeof NORMES !== 'undefined' ? NORMES.apports : null);
// une taille de cavité, comme SEE la lit (sa section) : 22D est une 22 (le D dit le contact, pas la cavité)
const tailleCaviteSEE = t => String(t == null ? '' : t).toUpperCase().replace(/D$/, '');
function verifFacesSEE(K, A) { const N0 = normeVoltaSEE(), parCle = new Map((N0.modules || []).map(m => [cleDeLigne('modules', m), m])), TA = new Map();
  const ajoute = (f, t) => { if (f && t) (TA.get(f) || TA.set(f, new Set()).get(f)).add(tailleCaviteSEE(t)); };
  (N0.tailles || []).forEach(t => ajoute(t.famille, t.taille)); (N0.modules || []).forEach(m => m.contacts.forEach(c => ajoute(m.famille, c.taille)));
  const parTaille = xs => { const g = new Map(); xs.forEach(([n, t]) => (g.get(t) || g.set(t, []).get(t)).push(n)); return [...g].map(([t, ns]) => (ns.length > 8 ? ns.slice(0, 8).join(' ') + ' …' : ns.join(' ')) + ' #' + t).join(' · '); };
  return { face(r, pn, av, pins, brut) { K.sur.faces++; K.sur.broches += pins.length; const ref = pn, famille = nomDeFamille(N0, av.famille) || av.famille;
    const doublons = ns => { const m = new Map(); ns.forEach(n => m.set(n, (m.get(n) || 0) + 1)); return [...m].filter(([, n]) => n > 1); };
    const x = moduleNorme(brut), v = x && parCle.get(cleDeLigne('modules', x)), dit = numSEE(valSEE(A, r, 'DesiredPinsCount')), nd = compteDeDesignationSEE(av);
    const comptes = [v ? [v.contacts.length, 'la face de la norme'] : nd ? [nd, 'la désignation'] : null, dit > 0 ? [dit, 'DesiredPinsCount'] : null].filter(c => c && c[0] !== pins.length);
    if (comptes.length) noterSEE(K, 'f-compte', ref, plurielLie(pins.length, 'contact') + ' ; ' + comptes.map(([n, t]) => t + ' en dit ' + n).join(', '), A, r);
    // la casse et les tailles, contre la face de la norme (les places de SEE, ramenées à celles de Volta : 08 nonies, nomsDeLaNormeSEE) ;
    // deux broches du même nom une fois la casse rendue (SEE écrit A et a de même : ce n'est un doublon que si la norme ne les sépare pas)
    let noms = pins.map(p => p.nom); const tailles = [];
    if (v && v.contacts.length) { const pts = String(brut.disposition || '').split(/\s+/).filter(t => t && !/^centre@/i.test(t)).map(t => { const m = /^(.+?)@(-?[\d.]+):(-?[\d.]+)$/.exec(t); return m ? { nom: m[1], x: +m[2], y: +m[3] } : null; });
      if (pts.length === pins.length && pts.every(Boolean)) { const n2 = nomsDeLaNormeSEE(pts, v.contacts.map(c => ({ nom: c.lettre, x: c.c + 0.5, y: c.r + 0.5 })));
        const casse = n2.map((n, i) => n !== pins[i].nom ? pins[i].nom + ' → ' + n : '').filter(Boolean);
        if (casse.length) noterSEE(K, 'f-casse', ref, plurielLie(casse.length, 'nom') + ' remis à la casse de la norme (' + casse.slice(0, 4).join(', ') + (casse.length > 4 ? ', …' : '') + ')', A, r);
        noms = n2; const TV = new Map(v.contacts.map(c => [c.lettre, c.taille])), d = doublons(n2).length ? [] : n2.map((n, i) => TV.has(n) && pins[i].taille !== '?' && tailleCaviteSEE(TV.get(n)) !== tailleCaviteSEE(pins[i].taille) ? [n, pins[i].taille, TV.get(n)] : null).filter(Boolean);
        if (d.length) tailles.push(parTaille(d.map(([n, t]) => [n, t])) + ' — la norme : ' + parTaille(d.map(([n, , t]) => [n, t]))); } }
    const dbl = doublons(noms);
    if (dbl.length) noterSEE(K, 'f-doublons', ref, dbl.slice(0, 4).map(([k, n]) => '« ' + k + ' » ' + n + ' fois').join(', ') + (dbl.length > 4 ? ', …' : '') + (v ? ', même avec la casse de la norme' : ''), A, r);
    else if (!v) { const S = TA.get(av.famille), hors = S ? [...new Set(pins.map(p => p.taille).filter(t => t !== '?' && !S.has(tailleCaviteSEE(t))))] : [];
      if (hors.length) tailles.push('taille' + (hors.length > 1 ? 's ' : ' ') + hors.join(', ') + ' que l’' + famille + ' n’a pas (' + [...S].sort((a, b) => parseFloat(b) - parseFloat(a)).join(', ') + ')');
      const m = av.famille === 'EN4165' && /^(\d{2})[-A-Z](\d{2})$/.exec(av.variante), autres = m && m[1] !== '99' ? pins.filter(p => p.taille !== '?' && parseFloat(p.taille) !== +m[2]) : [];
      if (autres.length) tailles.push(plurielLie(autres.length, 'contact') + ' d’une autre taille que ' + m[2] + ', que la désignation écrit'); }
    if (tailles.length) noterSEE(K, 'f-tailles', ref, tailles.join(' ; '), A, r);
    // deux contacts qui se chevauchent, ou une face sans dessin (toutes les broches au même point)
    if (pins.length > 1) { const k = Math.max(...pins.map(p => Math.max(Math.abs(p.x), Math.abs(p.y)))) > 0.5 ? 1 : 1000, touche = [];
      if (pins.every(p => p.x === pins[0].x && p.y === pins[0].y)) noterSEE(K, 'f-chevauche', ref, 'toutes les broches au même point : la face n’a pas de dessin', A, r);
      else { for (let i = 0; i < pins.length && touche.length < 4; i++) for (let j = i + 1; j < pins.length && touche.length < 4; j++) { const d = Math.hypot(pins[i].x - pins[j].x, pins[i].y - pins[j].y) * k, lim = ((DIAMETRE_BROCHE_SEE[pins[i].taille] || 0.76) + (DIAMETRE_BROCHE_SEE[pins[j].taille] || 0.76)) / 2;
          if (d < lim) touche.push(pins[i].nom + '–' + pins[j].nom + ' à ' + nombreFr(Math.round(d * 100) / 100) + ' mm'); }
        if (touche.length) noterSEE(K, 'f-chevauche', ref, 'centres plus proches que leurs broches : ' + touche.slice(0, 3).join(', ') + (touche.length > 3 ? ', …' : ''), A, r); } } } }; }

/* LES CONNECTEURS ET LES ÉQUIPEMENTS. Le compte de contacts d'un connecteur contre son arrangement (IDPlugMap) ; chaque
   paire fiche ↔ embase dans les deux sens : une fiche avec une embase, des broches avec des douilles, autant de contacts
   (déclarée d'un seul côté : seulement si la base en déclare d'autres des deux) ; l'obsolète encore employé (déclaré pour un
   programme, accouplé de préférence à une référence validée, l'arrangement obsolète d'un connecteur validé) ; un même
   programme écrit de deux façons, les références sans programme. */
function verifEquipementsSEE(K, lignes, M) { const paires = new Set(), jugees = new Set();
  const mot = (v, a, b) => /^plug/i.test(v) ? a : b;
  // une paire se juge une fois, qu'elle soit déclarée d'un côté ou des deux
  return { paire(a, c, pref, r) { paires.add(a.p + '\u0001' + c.p); const ref = a.p + ' ↔ ' + c.p, u = [a.p, c.p].sort().join('\u0001'); if (jugees.has(u)) return; jugees.add(u);
      if (a.cx && /^(plug|receptacle)$/i.test(a.cx) && a.cx.toLowerCase() === String(c.cx).toLowerCase()) noterSEE(K, 'e-nature', ref, 'deux ' + mot(a.cx, 'fiches (Plug)', 'embases (Receptacle)'), M, r);
      if (a.g && /^(pin|socket)$/i.test(a.g) && a.g.toLowerCase() === String(c.g).toLowerCase()) noterSEE(K, 'e-sexe', ref, 'deux ' + (/^pin/i.test(a.g) ? 'à broches (Pin)' : 'à douilles (Socket)'), M, r);
      const fa = K.t.faces.get((lignes.get(a) || {}).pm), fc = K.t.faces.get((lignes.get(c) || {}).pm), na = a.n || (fa && fa.n) || null, nc = c.n || (fc && fc.n) || null;
      if (na && nc && na !== nc) noterSEE(K, 'e-contacts', ref, na + ' et ' + nc + ' contacts', M, r);
      if (pref && (a.st === 'obsolète') !== (c.st === 'obsolète')) { const [ok, obs] = a.st === 'obsolète' ? [c, a] : [a, c]; noterSEE(K, 'e-obsolete', ok.p, 'se monte de préférence avec ' + obs.p + ', obsolète', M, r); } },
    fin(liste, prog) { K.sur.connecteurs = liste.filter(e => e.k === 'connecteur').length; K.sur.equipements = liste.length - K.sur.connecteurs; K.sur.paires = jugees.size;
      // une paire déclarée d'un seul côté : seulement quand la base en déclare d'autres dans les deux sens (sinon c'est son usage)
      const deuxSens = [...paires].some(p => { const [a, c] = p.split('\u0001'); return a !== c && paires.has(c + '\u0001' + a); });
      if (deuxSens) [...paires].forEach(p => { const [a, c] = p.split('\u0001'); if (!paires.has(c + '\u0001' + a)) noterSEE(K, 'e-sens', a + ' ↔ ' + c, 'déclarée depuis ' + a + ' seulement', M, null); });
      const avecProg = prog.size > 0;
      liste.forEach(e => { const L = lignes.get(e) || {}, f = L.pm ? K.t.faces.get(L.pm) : null;
        if (e.n && f && f.n && e.n !== f.n) noterSEE(K, 'e-compte', e.p, plurielLie(e.n, 'contact') + ' ; son arrangement ' + f.pn + ' en a ' + f.n, L.T, L.r);
        if (e.st === 'obsolète' && e.epf.length) noterSEE(K, 'e-obsolete', e.p, 'obsolète, déclarée pour ' + plurielLie(e.epf.length, 'programme'), L.T, L.r);
        if (e.st !== 'obsolète' && f && f.st === 'obsolète') noterSEE(K, 'e-obsolete', e.p, 'son arrangement ' + f.pn + ' est obsolète', L.T, L.r);
        if (avecProg && L.epfCol && e.st !== 'obsolète' && !e.epf.length) noterSEE(K, 'e-sans-programme', e.p, 'déclarée pour aucun programme', L.T, L.r); });
      // un même programme écrit de deux façons (« EC225 », « EC 225 ») : le nom tel que SEE l'écrit, et son compte
      const g = new Map(); prog.forEach((n, p) => { const k = cleNorme(p); (g.get(k) || g.set(k, []).get(k)).push([p, n]); });
      g.forEach(xs => { if (xs.length > 1) noterSEE(K, 'e-programmes', xs.map(x => x[0]).join(' · '), xs.map(([p, n]) => '« ' + p + ' » ' + plurielLie(n, 'référence')).join(', '), null, null); }); } }; }

/* LES LIENS, une fois toutes les feuilles lues (08-see, lireBaseSEE) : les renvois qui ne mènent nulle part (une valeur
   qu'aucune clé ne porte, quand le renvoi se relie ailleurs), ceux dont la table manque, les pièces que les règles
   citent (PartNo1 à 6) et qu'aucune feuille ne définit — quand le classeur a une feuille de pièces (accessoires,
   contacts) ; et ce que le classeur dit des accessoires (les tyraps, contre la table Colliers de Volta). */
function coherenceDuClasseurSEE(I, L) { const K = I && I.coherence; if (!K || !L) return; const F = L.feuilles, nf = fi => nomCourtSEE(F[fi].nom);
  K.sur.renvois = L.liens.length; K.sur.feuilles = F.length;
  L.liens.forEach(x => { const col = nf(x.fi) + '.' + x.col;
    if (!x.cibles.length) { noterSEE(K, 'l-sans-table', col, plurielLie(x.distinct, 'valeur') + ' ; la table qu’elles désignent n’est pas dans le classeur', null, null); return; }
    const perdus = x.distinct - (x.trouves == null ? x.distinct : x.trouves); if (perdus <= 0) return;
    const c = K.c['l-orphelins'] || (K.c['l-orphelins'] = { n: 0, ex: [] }); c.n += perdus;
    // l'exemple : la référence que porte la ligne, sinon l'identifiant qui ne mène nulle part (à chercher dans SEE)
    (x.perdus || []).forEach(p => { if (c.ex.length < MAX_EXEMPLES_SEE) c.ex.push({ r: p.r || '{' + p.v + '}', d: col + ' : ne mène à aucune ligne de ' + x.cibles.map(k => nf(k.fi)).join(', '), l: p.l || null, f: nf(x.fi) }); }); });
  // les pièces citées par les règles : seulement quand une feuille de pièces existe (sinon le contrôle est sans objet)
  const pieces = F.filter(f => !cleFeuilleImportSEE(f.nom) && /accessor|contact(?!layout)|terminal|part/i.test(nomCourtSEE(f.nom))).flatMap(f => f.colonnes.filter(c => /^partno$/i.test(c.nom) && c.textes));
  if (pieces.length) { (K.cites || []).forEach(p => { const k = cleTexteSEE(p); if (!pieces.some(c => c.textes.has(k))) noterSEE(K, 'l-references', p, 'citée par une règle de contact, définie dans aucune feuille', null, null); }); }
  else (K.c['l-references'] = { n: 0, ex: [], na: 'le classeur n’a pas de feuille de pièces (accessoires, contacts) où les chercher' });
  delete K.cites;
  // les accessoires : leurs types, les tyraps — et ceux que Volta connaît (table Colliers), retrouvés dans SEE
  const acc = F.find(f => /accessor/i.test(nomCourtSEE(f.nom)));
  if (acc) { const cols = acc.colonnes.filter(c => /^(accessoriestype|accessoriessubcategory|type|classname)$/i.test(c.nom) && c.codes), ty = cols[0];
    const tyrap = /tie|tyrap|collier|strap|serre/i, nTy = Math.max(0, ...cols.map(c => c.codes.filter(([v]) => tyrap.test(v)).reduce((s, [, n]) => s + n, 0)));
    const textes = acc.colonnes.filter(c => /^partno$/i.test(c.nom) && c.textes), volta = (normeVoltaSEE().colliers || []).filter(c => c.type === 'tyrap').map(c => c.reference);
    K.accessoires = { lignes: acc.lignes, types: ty ? ty.codes.slice(0, 8) : [], tyraps: nTy, tyrapsVolta: volta.length, tyrapsDansSEE: volta.filter(p => textes.some(c => c.textes.has(cleTexteSEE(p)))).length }; } }

/* Les contrôles d'une base, dans l'ordre du catalogue : ceux de l'import (gardés avec la base) et ceux qui se refont face
   à Volta (les sources vérifiées : comparaisonSEE) — { cle, groupe, gravite, titre, fait, n, ex, f, plus, na }. */
function controlesSEE(I) { const K = I && I.coherence; if (!K) return []; const S = sourcesSEE(I);
  return CONTROLES_SEE.map(([groupe, cle, gravite, titre, fait]) => { const c = (groupe === 'sources' ? S[cle] : K.c[cle]) || { n: 0, ex: [] }; return { cle, groupe, gravite, titre, fait, n: c.n || 0, ex: c.ex || [], f: c.f || '', plus: c.plus || null, na: c.na || '' }; }); }
/* Face aux sources vérifiées de Volta (la comparaison de l'import, comptée) : les lignes où la source vérifiée garde
   Volta, les écarts d'un facteur 2, les lignes « à confirmer » que SEE remplace. */
function sourcesSEE(I) { const C = comparaisonSEE(I), S = { 's-verifiees': { n: 0, ex: [] }, 's-ecarts': { n: 0, ex: [] }, 's-remplace': { n: 0, ex: [] } };
  const ex = (cle, r, d) => { const s = S[cle]; s.n++; if (s.ex.length < MAX_EXEMPLES_SEE) s.ex.push({ r, d }); }, mots = es => es.map(([a, b, k]) => k + ' ' + b + ' (Volta : ' + a + ')').join(' ; ');
  ['contacts', 'cables', 'modules'].forEach(t => { const X = C[t];
    (X.verifiees || []).forEach(r => ex('s-verifiees', titreLigneSEE(t, r.avant), mots(ecartsSEE(t, r.avant, r.apres))));
    X.remplacees.forEach(r => { const es = ecartsSEE(t, r.avant, r.apres); if (es.some(e => e[3] && e[3].suspect)) ex('s-ecarts', titreLigneSEE(t, r.apres), mots(es.filter(e => e[3] && e[3].suspect)) + ' — ' + es.filter(e => e[3] && e[3].suspect).map(e => e[3].suspect).join(', '));
      if (!es.every(e => e[3] && e[3].complet)) ex('s-remplace', titreLigneSEE(t, r.apres), mots(es)); }); });
  S.sur = ['contacts', 'cables', 'modules'].reduce((n, t) => n + C[t].remplacees.length + (C[t].verifiees || []).length + C[t].identiques.length + (C[t].redessinees || []).length, 0);
  return S; }

/* CE QUE LA BASE APPORTE, à côté de ce que Volta tenait (ses tables, et les quatre tables de contacts transcrites des
   photos des tables de SEE : EN 2997 v6, EN 3645 v2, EN 3646 v13, EN 4165 v49 — normes/contacts.csv) : par famille, les
   lignes pareilles, celles qui diffèrent, celles que seul SEE a, celles que seul Volta a ; les familles, câbles, faces et
   références que Volta n'avait pas. */
const PHOTOS_SEE = [['EN2997', 6], ['EN3645', 2], ['EN3646', 13], ['EN4165', 49]];
function apporteSEE(I) { const C = comparaisonSEE(I), N0 = normeVoltaSEE(), K = I.coherence || {}, cle = x => cleDeLigne('contacts', x), S = lignesSEE('contacts', I.contacts);
  const pareil = (a, b) => ecartsSEE('contacts', a, b).every(e => e[3] && e[3].complet);
  const photos = PHOTOS_SEE.map(([f, v]) => { const VF = new Map(N0.contacts.filter(x => x.famille === f).map(x => [cle(x), x])), SF = S.filter(x => x.famille === f), vus = new Set(); let pareilles = 0, autres = 0, seulSEE = 0;
    SF.forEach(x => { const k = cle(x), y = VF.get(k); vus.add(k); if (!y) seulSEE++; else if (pareil(y, x)) pareilles++; else autres++; });
    return { famille: f, nom: nomDeFamille(N0, f) || f, photo: v, version: (K.versions || {})[f] || null, volta: VF.size, see: SF.length, pareilles, autres, seulSEE, seulVolta: [...VF.keys()].filter(k => !vus.has(k)).length }; });
  const famV = new Set(N0.contacts.map(x => x.famille)), famS = [...new Set(S.map(x => x.famille))], kV = new Set(N0.cables.map(x => x.famille)), mV = new Set(N0.modules.map(x => x.famille));
  const nouvellesFaces = new Map(); C.modules.nouvelles.forEach(m => nouvellesFaces.set(m.famille, (nouvellesFaces.get(m.famille) || 0) + 1));
  return { photos, contacts: { n: I.contacts.length, nouvelles: C.contacts.nouvelles.length, familles: famS.length, famillesNouvelles: famS.filter(f => !famV.has(f)).sort(triNaturel) },
    cables: { n: I.cables.length, nouveaux: C.cables.nouvelles.length, famillesNouvelles: [...new Set(I.cables.map(c => c.famille).filter(f => f && !kV.has(f)))].sort(triNaturel) },
    faces: { n: I.modules.length, nouvelles: C.modules.nouvelles.length, famillesNouvelles: [...new Set(I.modules.map(m => m.famille).filter(f => !mV.has(f)))].sort(triNaturel), parFamille: [...nouvellesFaces].sort((a, b) => b[1] - a[1]) },
    equipements: { n: (I.equipements || []).length, connecteurs: ((I.bilan || {}).equipements || {}).connecteurs || 0, equipements: ((I.bilan || {}).equipements || {}).equipements || 0, paires: (K.sur && K.sur.paires != null) ? K.sur.paires : ((I.bilan || {}).equipements || {}).accouplements || 0, programmes: (I.programmes || []).length },
    formes: K.formes || {}, accessoires: K.accessoires || null }; }

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
// oublier se fait d'abord, et se rattrape dans le mot qui passe : « Rétablir » la garde de nouveau (jamais de confirm())
async function oublierBaseSEE() { const avant = BASE_SEE.base; try { await oublierBaseSEEStockee(); } catch (_) { } poserBaseSEE(null); rendreBaseSEE();
  dire('La base SEE est oubliée : Volta revient à ses tables.', false, avant ? { geste: 'Rétablir', faire: async () => { try { await garderBaseSEE(avant); } catch (_) { } poserBaseSEE(avant); dire('La base SEE est rétablie : elle passe de nouveau devant les tables de Volta.'); rendreBaseSEE(); } } : null); }

/* ---- la norme : les lignes de la base, par-dessus celles de Volta ------------------------------------------------ */
// ce que disait Volta à la place d'une ligne de SEE (pour la différence, sur la fiche et l'onglet Import)
const AVANT_SEE = new WeakMap();
const avantSEE = x => (x && AVANT_SEE.get(x)) || null;
/* LA SOURCE VÉRIFIÉE GAGNE (le lecteur, 20 octobre 2026 : « quand SEE contredit une ligne que les sources ont vérifiée,
   on prend les sources ») : une ligne de Volta « vérifié » — deux sources indépendantes, la norme et les catalogues, sa
   colonne Statut le dit — reste quand SEE dit autre chose ; ce que SEE disait se garde (CONTRE_SEE) pour le montrer, à
   corriger dans SEE. Un nom écrit en entier (KB0800 → E0613KB0800) n'est pas un désaccord ; un chiffre de SEE impossible
   pour sa jauge ne passe jamais devant Volta. */
const CONTRE_SEE = new WeakMap();
const contreSEE = x => (x && CONTRE_SEE.get(x)) || null;
// un contact (deuxième passe de corroboration, 20 octobre 2026) : la source vérifiée ne gagne que contre un contact de SEE
// FAUX pour sa clé (contactFauxSEE) ; un autre contact qui convient aussi, un accessoire (le manchon E0718) qui diffère
// seul : SEE gagne, la différence se montre (« SEE remplace »). Un câble, une face : vérifié, ou impossible, Volta garde.
const voltaGagneSEE = (t, a, b) => { if (!a || !b) return false; const e = ecartsSEE(t, a, b).filter(x => !(x[3] && (x[3].complet || x[3].accessoire || x[3].valable)));
  return e.length > 0 && (t === 'contacts' ? e.some(x => x[3] && x[3].verifie) : a.confiance === 'vérifié' || e.some(x => x[3] && x[3].physique)); };
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
  ['contacts', 'cables', 'modules'].forEach(t => { const par = new Map((N0[t] || []).map(x => [cleDeLigne(t, x), x]));
    N[t] = N[t].filter(x => { const e = par.get(cleDeLigne(t, x));
      // la source vérifiée gagne : la ligne de Volta reste (fusionnerNormes garde une clé que SEE ne donne plus)
      if (voltaGagneSEE(t, e, x)) { CONTRE_SEE.set(e, x); AVANT_SEE.delete(x); return false; }
      if (e) CONTRE_SEE.delete(e);
      if (e && ecartsSEE(t, e, x).length) AVANT_SEE.set(x, e); else AVANT_SEE.delete(x); return true; });
    // un câble que SEE est seul à connaître : un chiffre impossible pour sa jauge est écarté (vide), la note le dit
    if (t === 'cables') N[t] = N[t].map(x => { if (par.get(cleDeLigne(t, x))) return x; const P = physiqueSEE(N0, x); if (!P.length) return x;
      const y = { ...x, note: [x.note, 'SEE : ' + P.map(q => q.texte).join(' · ') + ' — écarté'].filter(Boolean).join(' · ') }; P.forEach(q => { y[q.champ] = null; }); return y; }); });
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
  // la source vérifiée gagne : ces lignes ne remplacent pas Volta, elles se montrent à part (à corriger dans SEE)
  ['contacts', 'cables', 'modules'].forEach(t => { const C = R[t]; C.verifiees = C.remplacees.filter(r => voltaGagneSEE(t, r.avant, r.apres)); C.remplacees = C.remplacees.filter(r => !C.verifiees.includes(r)); });
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
/* Deux contrôles de plus depuis la passe de corroboration (octobre 2026) : une ligne que Volta a VÉRIFIÉE (sa ligne dit
   ses deux sources publiques) et que SEE contredit — la source gagne (voltaGagneSEE), l'écart se montre à corriger dans
   SEE, sa source en bulle ; une masse ou une résistance de SEE IMPOSSIBLE pour sa jauge (physiqueDuCable : sous le métal
   seul, sous un cuivre pur) ne passe jamais, et se signale même quand Volta n'a rien à lui opposer. */
const normePhysiqueSEE = () => (typeof app !== 'undefined' && app.norme) || normeEmbarqueeLue();
function ecartsSEE(table, a, b) {
  // un contact : le nom écrit en entier n'en est pas un autre ; contre une ligne vérifiée, le contact de SEE faux pour sa clé
  // (la raison et la source de Volta dans la bulle) ou qui convient aussi (« valable ») ; l'accessoire seul ne l'oppose pas
  if (table === 'contacts') { const ra = String(a.reference || ''), rb = String(b.reference || ''), complet = !!ra && !!rb && ra !== rb && (rb.endsWith(ra) || ra.endsWith(rb)), autre = !complet && ra !== rb && a.confiance === 'vérifié', faux = autre ? contactFauxSEE(b) : '';
    return [ra !== rb ? [ra, rb, complet ? 'nom complet' : 'contact', complet ? { complet: true } : faux ? { verifie: ['SEE : ' + faux, a.note, a.origine && 'source : ' + a.origine].filter(Boolean).join(' — '), faux } : autre ? { valable: true } : null] : null,
      (a.accessoire || '') !== (b.accessoire || '') ? [a.accessoire || 'rien', b.accessoire || 'rien', 'avec', { accessoire: true }] : null].filter(Boolean); }
  if (table === 'cables') { const P = physiqueSEE(normePhysiqueSEE(), b);
    return CHAMPS_CABLE_SEE.filter(([k]) => valeurMontree(a[k]) !== valeurMontree(b[k])).map(([k, t, u]) => { const f = ['diametre', 'masse', 'resistance'].includes(k) ? facteurSEE(a[k], b[k]) : '', x = P.find(p => p.champ === k);
      return [valeurMontree(a[k]) + (typeof a[k] === 'number' ? u : ''), valeurMontree(b[k]) + (typeof b[k] === 'number' ? u : ''), t, x ? { suspect: f || 'impossible', physique: x.texte } : f ? { suspect: f } : null]; }); }
  // les tailles : le compte par taille (« 3 #16 + 9 #20 ») ; à compte égal, les contacts de même nom qui changent de taille
  // (EN 2997 14-12 : MIL-STD-1554 met les #16 en 4, 7, 10 — « 1 2 3 #16 · 4 7 10 #20 → 1 2 3 #20 · 4 7 10 #16 »)
  const ta = m => { const n = {}; m.contacts.forEach(c => { n[c.taille] = (n[c.taille] || 0) + 1; }); return Object.keys(n).sort((x, y) => parseFloat(y) - parseFloat(x) || x.localeCompare(y)).map(t => n[t] + ' #' + t).join(' + '); };
  const TA = new Map(a.contacts.map(c => [c.lettre, c.taille])), TB = new Map(b.contacts.map(c => [c.lettre, c.taille])), change = [...TA.keys()].filter(l => TB.has(l) && TB.get(l) !== TA.get(l)).sort(triNaturel);
  const parTaille = T => { const g = new Map(); change.forEach(l => (g.get(T.get(l)) || g.set(T.get(l), []).get(T.get(l))).push(l)); return [...g].map(([t, ls]) => (ls.length > 8 ? ls.slice(0, 8).join(' ') + ' …' : ls.join(' ')) + ' #' + t).join(' · '); };
  const la = a.contacts.map(c => c.lettre), lb = b.contacts.map(c => c.lettre), moins = nomsSeulsSEE(la, lb), plus = nomsSeulsSEE(lb, la);
  return [a.contacts.length !== b.contacts.length ? [a.contacts.length + ' contacts', b.contacts.length + ' contacts', 'contacts'] : null, ta(a) !== ta(b) ? [ta(a), ta(b), 'tailles'] : change.length ? [parTaille(TA), parTaille(TB), 'tailles'] : null,
    moins || plus ? [moins || 'aucun', plus || 'aucun', 'noms', { noms: true }] : null].filter(Boolean); }
const titreLigneSEE = (table, x) => table === 'contacts' ? motsContactSEE(x) : table === 'cables' ? x.cable : (nomDeFamille(app.norme, x.famille) || x.famille) + ' · ' + x.variante;
function differenceSEEHtml(table, titre, C) { const n = C.remplacees.length, MAX = 30, E = new Map(C.remplacees.map(r => [r, ecartsSEE(table, r.avant, r.apres)]));
  const suspects = C.remplacees.filter(r => E.get(r).some(e => e[3] && e[3].suspect)).length, complets = C.remplacees.filter(r => E.get(r).every(e => e[3] && e[3].complet)).length, redessinees = (C.redessinees || []).length;
  const impossibles = table === 'cables' ? C.nouvelles.map(c => [c, physiqueSEE(normePhysiqueSEE(), c)]).filter(x => x[1].length) : [];
  const ecart = ([a, b, k, o]) => `<span class="see-diff-e${o && o.suspect ? ' suspect' : ''}${o && o.complet ? ' complet' : ''}"${o && o.noms ? ' title="à gauche, les noms que seul Volta avait ; à droite, ceux que seul SEE a"' : ''}><i>${esc(k)}</i><s>${esc(a)}</s><span class="see-fl">→</span><b>${esc(b)}</b>`
    + (o && o.physique ? `<em class="see-suspect" title="${escA(o.physique)} — une erreur de saisie ou de ligne dans SEE ? SEE gagne quand même.">${o.suspect !== 'impossible' ? esc(o.suspect) + ' — ' : ''}impossible pour sa jauge · à corriger dans SEE</em>`
      : o && o.suspect ? `<em class="see-suspect" title="SEE dit ${escA(b)} là où Volta disait ${escA(a)} : ${escA(o.suspect)}, c'est rare pour une même référence — une erreur de saisie ou d'unité dans SEE ? SEE gagne quand même.">${esc(o.suspect)} · à vérifier dans SEE</em>` : '') + '</span>';
  const G = C.verifiees || [], EG = new Map(G.map(r => [r, ecartsSEE(table, r.avant, r.apres)]));
  // une ligne que la source garde : ses écarts (SEE barré, Volta en gras), puis UNE pastille — l'impossible d'abord
  const ecartGarde = ([a, b, k]) => `<span class="see-diff-e garde"><i>${esc(k)}</i><s>${esc(b)}</s><span class="see-fl">→</span><b>${esc(a)}</b></span>`;
  const pastilleGarde = (r, es) => { const ph = es.find(e => e[3] && e[3].physique), o = ph && ph[3], v = es.find(e => e[3] && e[3].verifie);
    const bulle = [o ? o.physique : '', r.avant.confiance === 'vérifié' ? 'Volta : vérifié par deux sources indépendantes' + (v ? ' — ' + v[3].verifie : r.avant.note ? ' — ' + r.avant.note : '') : ''].filter(Boolean).join('\n');
    return `<em class="see-garde" title="${escA(bulle)}">${o ? (o.suspect && o.suspect !== 'impossible' ? esc(o.suspect) + ' dans SEE — impossible' : 'SEE impossible') + ' pour sa jauge' : 'la source vérifiée garde Volta'} · à corriger dans SEE</em>`; };
  const ligneGardee = r => `<li class="see-diff garde"><span class="see-diff-t">${esc(titreLigneSEE(table, r.avant))}</span>${EG.get(r).map(ecartGarde).join('')}${pastilleGarde(r, EG.get(r))}</li>`;
  const ligne = r => `<li class="see-diff${E.get(r).some(e => e[3] && e[3].suspect) ? ' suspect' : ''}"><span class="see-diff-t">${esc(titreLigneSEE(table, r.apres))}</span>${E.get(r).map(ecart).join('')}</li>`;
  const compte = [n ? esc(plurielLie(n, 'ligne') + ' remplace' + (n > 1 ? 'nt' : '') + ' Volta') : 'rien ne remplace Volta', G.length ? `<b class="see-t-garde">${esc(plurielLie(G.length, 'ligne') + ' où la source vérifiée garde Volta')}</b>` : '', suspects ? `<b class="see-t-att">${esc(plurielLie(suspects, 'écart'))} à vérifier</b>` : '', impossibles.length ? `<b class="see-t-att">${esc(plurielLie(impossibles.length, 'nouveau'))} impossible${impossibles.length > 1 ? 's' : ''} pour sa jauge</b>` : '',
    complets ? esc('dont ' + plurielLie(complets, 'nom') + ' écrit' + (complets > 1 ? 's' : '') + ' en entier') : '', C.casse ? esc(plurielLie(C.casse, 'face') + ' aux noms remis à la casse de la norme') : '', redessinees ? esc(plurielLie(redessinees, 'face') + ' redessinée' + (redessinees > 1 ? 's' : '') + ' à l’échelle, mêmes contacts') : '',
    esc(plurielLie(C.nouvelles.length, 'nouvelle')), esc(plurielLie(C.identiques.length, 'identique'))].filter(Boolean).join(' · ');
  const notes = [C.casse ? `SEE écrit les noms de contacts sans leur casse (c, e, f, k, m, w, z en minuscules, le reste en majuscules) : C et c y portent le même nom. Volta reprend les noms de la norme, aux places de SEE ; deux candidats (C et c), la place tranche.` : '',
    (C.gardees || []).length ? `${plurielLie(C.gardees.length, 'face')} reste${C.gardees.length > 1 ? 'nt' : ''} celle${C.gardees.length > 1 ? 's' : ''} de Volta : SEE y laisse deux contacts du même nom (${C.gardees.slice(0, 6).join(', ')}${C.gardees.length > 6 ? '…' : ''}).` : '',
    C.doublons ? `${C.doublons} face${C.doublons > 1 ? 's' : ''} nouvelle${C.doublons > 1 ? 's' : ''} où SEE donne le même nom à deux contacts : prise${C.doublons > 1 ? 's' : ''} telle${C.doublons > 1 ? 's' : ''} quelle${C.doublons > 1 ? 's' : ''}, à vérifier.` : '',
    impossibles.length ? `Câbles nouveaux de SEE impossibles pour leur jauge (sous le métal seul, ou sous un cuivre pur) : ${impossibles.slice(0, 6).map(([c, P]) => c.cable + ' (' + P.map(p => p.texte).join(' ; ') + ')').join(', ')}${impossibles.length > 6 ? '…' : ''}.` : ''].filter(Boolean);
  return `<div class="see-diffs"><h4>${esc(titre)} <span class="see-t">${compte}</span></h4>${notes.map(t => `<p class="see-note">${esc(t)}</p>`).join('')}`
    + (G.length ? `<ul class="see-gardees">${G.slice(0, MAX).map(ligneGardee).join('')}</ul>` + (G.length > MAX ? `<details class="see-vides"><summary>${G.length - MAX} autre${G.length - MAX > 1 ? 's' : ''} que la source garde</summary><ul>${G.slice(MAX).map(ligneGardee).join('')}</ul></details>` : '') : '')
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
    + `${tuile((I.equipements || []).length, 'références', plurielLie(be.connecteurs || 0, 'connecteur') + ' · ' + plurielLie(be.equipements || 0, 'équipement') + ' · ' + plurielLie(I.coherence && I.coherence.sur && I.coherence.sur.paires != null ? I.coherence.sur.paires : be.accouplements || 0, 'paire') + ' fiche ↔ embase')}</div>`;
  const C = comparaisonSEE(I);
  const nG = ['contacts', 'cables', 'modules'].reduce((n, t) => n + (C[t].verifiees || []).length, 0);
  const diffs = `<div class="see-bloc"><h3>Ce qui change dans Volta <span>SEE gagne, sauf contre une ligne que deux sources ont vérifiée : la valeur écartée est barrée, celle qu’on garde en gras ; ce que SEE laisse vide, Volta le garde</span></h3>`
    + (nG ? `<p class="see-note">${esc(plurielLie(nG, 'ligne'))} où SEE contredit ce que deux sources indépendantes ont vérifié (la norme, les catalogues) ou donne un chiffre impossible pour sa jauge : Volta garde la sienne, la valeur de SEE est barrée, la bulle de la pastille verte dit d’où vient celle de Volta — à corriger dans SEE.</p>` : '')
    + `${differenceSEEHtml('contacts', 'Contacts à sertir', C.contacts)}${differenceSEEHtml('cables', 'Câbles', C.cables)}${differenceSEEHtml('modules', 'Faces des connecteurs', C.modules)}</div>`;
  const autres = Object.entries(bc.autres || {}).map(([k, n]) => n + ' ' + k).join(', ');
  const dehors = [bc.obsoletes ? plurielLie(bc.obsoletes, 'règle') + ' obsolète' + (bc.obsoletes > 1 ? 's' : '') + ' ignorée' + (bc.obsoletes > 1 ? 's' : '') : '', autres ? 'règles d’autres classes pas encore lues : ' + autres : '',
    bc.sansFil ? plurielLie(bc.sansFil, 'ligne') + ' de contact sans câble (gauge −2)' : '', bc.incoherentes ? plurielLie(bc.incoherentes, 'ligne') + ' qui se contredi' + (bc.incoherentes > 1 ? 'sent' : 't') + ' (sexe, taille ou fût contre la référence) : l’onglet Cohérence les montre' : '', bc.jaugeIllisible ? plurielLie(bc.jaugeIllisible, 'ligne') + ' à gauge qui n’est pas une AWG' : '', bc.tailleIllisible ? plurielLie(bc.tailleIllisible, 'ligne') + ' à taille de cavité ou sexe illisible' + (Object.keys(bc.illisibles || {}).length ? ' — le plus souvent : ' + Object.entries(bc.illisibles).map(([k, n]) => k + ' (' + milliers(n) + ')').join(' ; ') : '') : '',
    bc.sansRegle ? plurielLie(bc.sansRegle, 'ligne') + ' de contact sans règle' : '', bc.conflits ? plurielLie(bc.conflits, 'cas') + ' où deux règles donnent deux contacts : la validée, la plus récente, le plus petit numéro retenu' : '',
    bf.sansBroche ? plurielLie(bf.sansBroche, 'arrangement') + ' sans broche' : '', bf.illisibles ? plurielLie(bf.illisibles, 'nom') + ' d’arrangement illisible' : '', (B.feuilles || []).length ? 'feuilles absentes du classeur : ' + B.feuilles.join(', ') : ''].filter(Boolean);
  const M1 = bc.moinsUn, colM1 = (t, xs) => xs && xs.length ? `<div class="see-m1-c"><h4>${esc(t)}</h4><ol>${xs.map(([k, n]) => `<li><span class="mono">${esc(k)}</span><b>${esc(milliers(n))}</b></li>`).join('')}</ol></div>` : '';
  const moinsUn = M1 && bc.touteTaille ? `<div class="see-bloc see-m1"><h3>La cavité « −1 » <span>${esc(plurielLie(bc.touteTaille, 'ligne'))} de contact sans taille de cavité : Volta les lit « toute taille »</span></h3>`
    + `<p class="see-note">SEE écrit −1 là où la taille ne compte pas : une règle qui vaut pour toutes les cavités, ou une pièce sans cavité (une cosse, un manchon, une reprise de blindage) — ce que portent ces lignes le dit.</p>`
    + `<div class="see-m1-l">${colM1('Leurs règles', M1.regles)}${colM1('Leurs contacts', M1.contacts)}${colM1('Leurs types de câble', M1.types)}${colM1('Leurs gauges de câble', M1.jauges)}</div></div>` : '';
  const P = planFaceABaseSEE(I);
  const plan = P ? `<div class="see-bloc"><h3>Le plan ouvert face à la base <span>${esc(P.nom)} · des références, seulement le nombre</span></h3><table class="see-table"><thead><tr><th>Famille</th><th>Références</th><th>Dans SEE</th><th>Obsolètes</th>${P.programme ? `<th>Hors ${esc(P.programme)}</th>` : ''}</tr></thead><tbody>`
    + P.familles.map(([f, x]) => `<tr><td class="mono">${esc(f)}</td><td>${x.n}</td><td class="${x.dans < x.n ? 'att' : ''}">${x.dans}</td><td class="${x.obsoletes ? 'att' : ''}">${x.obsoletes}</td>${P.programme ? `<td class="${x.hors ? 'att' : ''}">${x.hors}</td>` : ''}</tr>`).join('')
    + `</tbody></table><p class="see-note">${esc(plurielLie(P.typesDans, 'type'))} de câble sur ${P.types} retrouvé${P.typesDans > 1 ? 's' : ''} dans les câbles de SEE.</p></div>` : '<p class="see-note">Ouvrez une installation pour le voir face à la base.</p>';
  return `<section class="see-feuille see-import" aria-label="Import"><div class="see-tete"><b class="see-nom">Ce que Volta prend de ${esc(I.nom)}</b><span class="see-compte">qui a fait quoi et les dates ne sont jamais pris</span></div>`
    + `<div class="see-gestes">${etat}${prog}</div>${tuiles}${diffs}`
    + (dehors.length ? `<div class="see-bloc"><h3>Ce qui n’est pas pris</h3><ul class="see-dehors">${dehors.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '') + moinsUn + plan + '</section>'; }
/* Le bilan en texte, pour le résumé. */
function resumeImportSEE() { const I = baseMontreeSEE(); if (!I) return ''; const C = comparaisonSEE(I), B = I.bilan || {}, bc = B.contacts || {};
  const t = (k, x, tb) => `${k} : ${x.remplacees.length} remplacent Volta${tb ? ` (dont ${x.remplacees.filter(r => ecartsSEE(tb, r.avant, r.apres).some(e => e[3] && e[3].suspect)).length} à vérifier)` : ''}${x.verifiees && x.verifiees.length ? ` · ${x.verifiees.length} où la source vérifiée garde Volta` : ''}${x.redessinees ? ` · ${x.redessinees.length} redessinées` : ''} · ${x.nouvelles.length} nouvelles · ${x.identiques.length} identiques`;
  return ['\n== Import ==', `${I.contacts.length} contacts (${Object.keys(bc.familles || {}).length} familles : ${Object.entries(bc.familles || {}).map(([f, n]) => f + ' ' + n).join(', ')}), ${I.cables.length} câbles, ${I.modules.length} faces, ${(I.equipements || []).length} références`,
    t('Contacts', C.contacts), t('Câbles', C.cables, 'cables'), t('Faces', C.modules), `Règles : ${bc.validees || 0} validées, ${bc.enCours || 0} en cours, ${bc.obsoletes || 0} obsolètes ignorées${Object.keys(bc.autres || {}).length ? ', autres classes ' + JSON.stringify(bc.autres) : ''}`,
    `Lignes de contact écartées : sans câble ${bc.sansFil || 0}, qui se contredisent ${bc.incoherentes || 0}, gauge illisible ${bc.jaugeIllisible || 0}, taille illisible ${bc.tailleIllisible || 0}${Object.keys(bc.illisibles || {}).length ? ' (' + Object.entries(bc.illisibles).map(([k, n]) => k + ' ' + n).join(' ; ') + ')' : ''}, sans règle ${bc.sansRegle || 0}, conflits ${bc.conflits || 0}`,
    `Faces des familles : ${Object.entries((B.faces || {}).familles || {}).map(([f, n]) => f + ' ' + n).join(', ')}`,
    bc.moinsUn && bc.touteTaille ? `Cavité −1 (${bc.touteTaille} lignes) : règles ${bc.moinsUn.regles.map(([k, n]) => k + ' ' + n).join(', ')} · contacts ${bc.moinsUn.contacts.map(([k, n]) => k + ' ' + n).join(', ')} · types ${bc.moinsUn.types.map(([k, n]) => k + ' ' + n).join(', ')} · gauges ${bc.moinsUn.jauges.map(([k, n]) => k + ' ' + n).join(', ')}` : '', (B.feuilles || []).length ? 'Feuilles absentes : ' + B.feuilles.join(', ') : ''].filter(Boolean).join('\n'); }
/* Sur une fiche : ce que disait Volta là où SEE l'a remplacé (« Volta disait : Ø 1,52 mm → 1,60 mm »), sinon rien. */
function differenceSEEMots(table, x) { const c = contreSEE(x);
  if (c) { const e = ecartsSEE(table, x, c).filter(([, , k]) => k !== 'face'); if (e.length) return 'SEE dit autre chose : ' + e.map(([u, v, k]) => k + ' ' + v + ' (Volta : ' + u + ')').join(' ; ')
    + (table === 'contacts' && e.some(([, , , o]) => o && o.faux) ? ' — ' + e.find(([, , , o]) => o && o.faux)[3].faux + ' : Volta garde ce que deux sources ont vérifié'
      : x.confiance === 'vérifié' ? ' — Volta garde ce que deux sources ont vérifié' : ' — Volta garde sa ligne : ' + e.filter(([, , , o]) => o && o.physique).map(([, , , o]) => o.physique).join(' ; ')) + ' : à corriger dans SEE'; }
  const a = avantSEE(x); if (!a) return ''; const e = ecartsSEE(table, a, x).filter(([, , k]) => k !== 'face');
  return e.length ? 'SEE a remplacé ce que disait Volta : ' + e.map(([u, v, k, o]) => k + ' ' + u + ' → ' + v + (o && o.physique ? ' (' + o.physique + ' : à corriger dans SEE)' : o && o.suspect ? ' (' + o.suspect + ' : à vérifier dans SEE)' : '')).join(' ; ') : ''; }
