/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   LA BASE SEE (08 nonies) — l'Excel des vues et des tables de SEE Electrical Equipment Definition, lu sur place
   Le lecteur (octobre 2026) a tiré la base SEE dans Excel (Données → SQL Server → EED_View…, EED_OBJ_…, EED_LNK_…) :
   « il y a trop de colonnes, 200 ; les photos, c'est beaucoup trop ; le fichier est sur le bureau, je ne peux pas
   l'envoyer ». Volta lit donc ce classeur SUR LE POSTE, et montre, sur des écrans qui tiennent chacun en une photo :
     · IMPORT — ce que Volta en prend (contacts, câbles, faces, équipements : 08-see-import) et ce qui change dans ses
       tables ; « Garder dans Volta » le garde sur ce PC (IndexedDB, rien ne sort), sinon fermer la page l'oublie ;
     · COHÉRENCE (le lecteur, 20 octobre 2026 : « Tu as pu vérifier si toute notre base est correcte et cohérente ? ») —
       la base vérifiée ligne par ligne pendant l'import (08-see-import) : pour chaque contrôle, le compte, la gravité,
       les dix premiers exemples, ce que Volta en fait ; ce que la base apporte à côté des photos ; un rapport en texte
       fait seulement de références de catalogue et de comptes (« Copier le rapport de cohérence ») ;
     · LIENS — les identifiants (GUID) d'une feuille retrouvés dans une autre : ce qui se relie à quoi, et ce qui ne se
       relie à rien (une table qui manque) ;
     · CODES — les valeurs des colonnes de codes (WireType, Gender, ContactFamily, les listes à virgules…), et le plan
       ouvert face à SEE : ses types de câble, ses familles, ses références retrouvés (des références, seulement le
       compte : le retest ne sort pas) ;
     · une feuille par onglet — toutes ses lignes, ses colonnes remplies (taux, deux exemples masquables), les vides.
   Les colonnes qui disent qui a fait quoi (utilisateurs, postes, rôles) ne sont ni montrées comme codes ni gardées.
   Le résumé se copie aussi en texte, ou s'enregistre (.txt), pour qui peut le faire passer autrement qu'en photo.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const SEE = { lu: null, vue: 'import', exemples: true, import: null };
// la base SEE prend la page (elle se lit, se photographie) : `ouvrirFiche` la règle (LARGEURS_DOC, 08-interface : « page »)
const estExcel = f => /\.xls[xmb]?$/i.test((f && f.name) || '') || /sheet|excel/i.test((f && f.type) || '');
// une feuille de la base SEE : nommée d'après sa vue ou sa table (EED_ViewCablesAndWires, EED_OBJ_Wires…) ou une fonction d'export
const estFeuilleSEE = n => /^(EED_|Export_)/i.test(String(n || ''));
const nomCourtSEE = n => String(n).replace(/^EED_(e?Cat_)?View_?/i, '').replace(/^EED_/i, '').replace(/^(OBJ|LNK|SET)_/i, '') || String(n);
const GUID_SEE = /^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}?$/i, OUI_NON_SEE = /^(true|false|vrai|faux|yes|no|oui|non)$/i;
const cleGuidSEE = s => String(s).replace(/[{}]/g, '').toUpperCase();
const cleTexteSEE = s => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
// qui a fait quoi : jamais montré comme code, jamais gardé
const PERSONNEL_SEE = /user|workstation|role|lockedby|modifiedby|releasedby|creator/i;
// des textes libres, des dates, des références : pas des codes
const PAS_CODE_SEE = /date|comment|description|url|3d$|^id|partno|uniqueness|^version$|caption|^name$/i;
// les colonnes où chercher les valeurs du plan ouvert (types de câble, familles, références)
const TEXTE_SEE = /partno|^type$|wire_?type|family|caption|notation|standard|cabletypelist|plugmap/i;
// les codes qui comptent pour la suite, montrés d'abord ; les autres se déplient
const CODES_D_ABORD_SEE = /^(wiretype|type|wire_type|contacttype|contactfamily|contactgauge|wiregauge|gender|classname|family|cabletypelist|connectivitytype|accessoriestype|accessoriessubcategory|backshelltype|shield|cablefamily|typeofcontactlayout|equipmenttype|equipment|modulartype|epflist|lcstatusname|unit1|form_type|notation|typeofrelay|suppliedwithcontact|view|prefered)$/i;
const MAX_CODES_SEE = 300;
/* Le bruit des flottants : SEE écrit 0.32574322630000002 (en texte), 0.0140000004 ou 0.0099999998 (un réel simple) là
   où il pense 0.3257432263, 0.014, 0.01 ; deux écritures d'une même valeur faisaient deux codes. Un nombre s'écrit au
   plus court à 2·10⁻⁷ près ; un texte qui a sept décimales ou plus est un nombre ; « 09 » ou « 1.5 » restent tels quels. */
const NOMBRE_LONG_SEE = /^-?\d+\.\d{7,}$/;
function nombreSEE(x) { if (!isFinite(x) || Number.isInteger(x)) return String(x);
  for (let p = 1; p < 16; p++) { const y = Number(x.toPrecision(p)); if (Math.abs(y - x) <= Math.abs(x) * 2e-7) return String(y); } return String(x); }
const valeurSEE = v => typeof v === 'number' ? nombreSEE(v) : (s => NOMBRE_LONG_SEE.test(s) ? nombreSEE(+s) : s)(String(v).trim());
/* SEE écrit la gauge en mm² (0.517952 = 20) : la gauge AWG d'une section, quand elle tombe juste (0000 à 40). */
function awgSEE(mm2) { const a = +mm2; if (!(a > 0)) return '';
  const n = 36 - 39 * Math.log(Math.sqrt(4 * a / Math.PI) / 0.127) / Math.log(92), r = Math.round(n);
  return Math.abs(n - r) > 0.05 || r > 40 || r < -3 ? '' : r > 0 ? String(r) : '0'.repeat(1 - r); }
const estGaugeSEE = c => /gauge/i.test(c.nom);
// à nombre de lignes égal, les nombres par valeur (0.3257 avant 0.5179), le reste dans l'ordre naturel
const triCodeSEE = (a, b) => { const x = +a, y = +b; return a.trim() && b.trim() && !isNaN(x) && !isNaN(y) ? x - y : triNaturel(a, b); };

/* Un Excel déposé ou ouvert n'importe où (la fenêtre, « Vos fichiers », la page des normes) : si ses feuilles portent
   les noms de la base SEE, il se lit ici, et rend vrai ; sinon rien n'est fait. */
async function routerBaseSEE(fichier) { if (!estExcel(fichier) || typeof XLSX === 'undefined') return false;
  let buf; try { buf = await fichier.arrayBuffer(); const wb = XLSX.read(buf, { type: 'array', bookSheets: true }); if (!(wb.SheetNames || []).some(estFeuilleSEE)) return false; }
  catch (_) { return false; }
  await lireBaseSEE(fichier, buf); return true; }

/* Lire le classeur EN ENTIER, une feuille à la fois (la mémoire d'un poste de bureau suffit même pour 36 000 lignes),
   puis relier les feuilles entre elles et confronter le plan ouvert. */
async function lireBaseSEE(fichier, buf) { if (!fichier) return; const nom = fichier.name || 'la base SEE';
  if (typeof XLSX === 'undefined') { dire('La bibliothèque Excel manque : la base SEE ne peut pas se lire.', true); return; }
  dire('Lecture de ' + guillemets(nom) + '…'); await new Promise(r => setTimeout(r, 40));   // le mot s'affiche avant le calcul
  try { buf = buf || await fichier.arrayBuffer();
    const noms = XLSX.read(buf, { type: 'array', bookSheets: true }).SheetNames || [], feuilles = [];
    const lignes = {};   // les feuilles que l'import lit (08-see-import), en lignes, le temps de les prendre
    for (let i = 0; i < noms.length; i++) {
      dire(`Lecture de ${guillemets(nom)} : feuille ${i + 1} / ${noms.length}, ${noms[i]}…`); await new Promise(r => setTimeout(r, 0));
      const wb = XLSX.read(buf, { type: 'array', sheets: noms[i], cellHTML: false, cellStyles: false, cellText: false }), ws = wb.Sheets[noms[i]];
      const rows = lignesFeuilleSEE(ws), k = cleFeuilleImportSEE(noms[i]);
      if (k && !lignes[k]) { lignes[k] = rows; Object.defineProperty(rows, 'nom', { value: noms[i] }); }
      const F = resumerFeuilleSEE(noms[i], ws, rows); if (F.colonnes.length || F.vides.length) feuilles.push(F); }
    if (!feuilles.length) { echecImport('normes', { texte: `${esc(nom)} : aucune feuille avec une ligne d’en-têtes.` }); return; }
    dire(`${guillemets(nom)} : Volta prend et vérifie les contacts, les câbles, les faces et les équipements…`); await new Promise(r => setTimeout(r, 0));
    SEE.import = importerSEE(lignes, nom);
    SEE.lu = { nom, feuilles, quand: new Date(), liens: liensSEE(feuilles), plan: planFaceASEE(feuilles) }; SEE.vue = 'import';
    coherenceDuClasseurSEE(SEE.import, SEE.lu); ficheBaseSEE();
    const K = SEE.import.coherence, nk = K ? controlesSEE(SEE.import).filter(x => x.n && x.gravite !== 'info').length : 0;
    dire(guillemets(nom) + ' : ' + pluriel(feuilles.length, 'feuille') + ' lue' + (feuilles.length > 1 ? 's' : '') + ' et vérifiée' + (feuilles.length > 1 ? 's' : '') + ' ligne par ligne' + (nk ? ' — ' + plurielLie(nk, 'contrôle') + ' à reprendre, l’onglet Cohérence les montre.' : '.')); }
  catch (e) { echecImport('normes', { texte: `${esc(nom)} n’a pas pu être lu : ${esc(String(e && e.message || e))}.` }); } }

/* Les lignes d'une feuille, chacune avec son numéro de ligne dans Excel (`l`, non énumérable : l'exemple d'un contrôle
   de cohérence dit où le retrouver) ; les lignes vides tombent. */
function lignesFeuilleSEE(ws) { if (!ws) return []; let d = 0; try { d = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']).s.r : 0; } catch (_) { }
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: true })
    .map((r, i) => { if (Array.isArray(r)) Object.defineProperty(r, 'l', { value: d + i + 1 }); return r; }).filter(r => Array.isArray(r) && r.some(c => c !== '' && c != null)); }
/* Une feuille, sur TOUTES ses lignes : sa ligne d'en-têtes (la première qui a plusieurs cellules), et pour chaque
   colonne : combien de lignes la remplissent, deux valeurs différentes, son genre (nombre, oui/non, identifiant) ; les
   identifiants (pour relier les feuilles ; un renvoi garde, pour chaque valeur, sa première ligne et la référence qu'elle
   porte : la cohérence dit où il ne mène nulle part), les textes où chercher le plan, et les codes (2 à 300 valeurs
   courtes ; une liste à virgules compte valeur par valeur). */
function resumerFeuilleSEE(nom, ws, rows) { const vide = { nom, lignes: 0, colonnes: [], vides: [] }; if (!ws && !rows) return vide;
  rows = rows || lignesFeuilleSEE(ws);
  const k = rows.findIndex(r => Array.isArray(r) && r.filter(c => String(c).trim()).length > 1); if (k < 0) return vide;
  const entete = rows[k].map(c => String(c == null ? '' : c).trim()), corps = rows.slice(k + 1), N = corps.length;
  const iRef = (i => i >= 0 ? i : entete.findIndex(t => /^name$/i.test(t)))(entete.findIndex(t => /^partno$/i.test(t)));
  const cols = entete.map((t, i) => { const c = { nom: t || 'colonne ' + (i + 1), n: 0, exemples: [], genre: '' }; let nombres = 0, guids = 0, bools = 0, virgules = 0, longueur = 0, trop = false;
    const vus = new Set(), comptes = new Map();
    for (const r of corps) { const v = r[i]; if (v === '' || v == null) continue; const s = valeurSEE(v); if (!s) continue; c.n++;   // 0.32574322630000002 se lit 0.3257432
      if (typeof v === 'number') nombres++; else if (typeof v === 'boolean' || OUI_NON_SEE.test(s)) bools++; else if (GUID_SEE.test(s)) guids++;
      if (s.includes(',')) virgules++; longueur += s.length;
      if (c.exemples.length < 2 && !vus.has(s)) { vus.add(s); c.exemples.push(s); }
      if (!trop) { comptes.set(s, (comptes.get(s) || 0) + 1); if (comptes.size > MAX_CODES_SEE) trop = true; } }
    c.taux = N ? c.n / N : 0; c.genre = !c.n ? '' : guids === c.n ? 'id' : bools === c.n ? 'oui/non' : nombres === c.n ? 'nombre' : '';
    if (!c.n) return c;
    if (c.genre === 'id') { c.ids = new Set(); const renvoi = !estCleSEE({ nom }, c); if (renvoi) c.premiere = new Map();
      for (const r of corps) { const v = r[i]; if (v === '' || v == null) continue; const g = cleGuidSEE(v); c.ids.add(g);
        if (renvoi && !c.premiere.has(g)) c.premiere.set(g, { l: r.l || null, r: iRef >= 0 ? String(r[iRef] == null ? '' : r[iRef]).trim() : '' }); }
      return c; }
    if (PERSONNEL_SEE.test(c.nom)) return c;
    const liste = c.genre === '' && virgules >= c.n * 0.3;
    if (TEXTE_SEE.test(c.nom)) { c.textes = new Set(); for (const r of corps) { const v = r[i]; if (v === '' || v == null) continue; c.textes.add(cleTexteSEE(v)); if (liste) String(v).split(',').forEach(x => { if (x.trim()) c.textes.add(cleTexteSEE(x)); }); } }
    if (liste) { const jetons = new Map(); for (const r of corps) { const v = r[i]; if (v === '' || v == null) continue; String(v).split(',').forEach(x => { x = x.trim(); if (x) jetons.set(x, (jetons.get(x) || 0) + 1); }); }
      if (jetons.size >= 2 && jetons.size <= MAX_CODES_SEE) { c.codes = [...jetons].sort((a, b) => b[1] - a[1] || triCodeSEE(a[0], b[0])); c.liste = true; } }
    else if (!trop && comptes.size >= 2 && longueur / c.n <= 28 && !PAS_CODE_SEE.test(c.nom) && (c.genre !== 'nombre' || comptes.size <= 30)) c.codes = [...comptes].sort((a, b) => b[1] - a[1] || triCodeSEE(a[0], b[0]));
    return c; });
  return { nom, lignes: N, colonnes: cols.filter(c => c.n), vides: cols.filter(c => !c.n).map(c => c.nom) }; }

/* LES LIENS : les CLÉS — l'« ID » de chaque feuille, et l'« IDEquipment » d'une vue (la pièce elle-même) — et les
   RENVOIS — toute autre colonne d'identifiants (IDPlugMap, IDCable, l'IDEquipment d'une table de règles…). Chaque
   renvoi cherche ses valeurs dans les clés de toutes les feuilles, la sienne comprise (IDParentCategory désigne une
   autre ligne d'OBJ_Categories) : la part retrouvée dit le lien (« IDPlugMap → ContactLayouts, 229 sur 229 ») ; un
   renvoi qui ne retrouve rien dit qu'une table manque. Une cible par feuille (l'ID et l'IDEquipment d'une vue sont la
   même pièce), quatre au plus : un renvoi partagé entre connecteurs, équipements et règles les montre tous. Un index
   valeur → clés : chaque valeur n'est vue qu'une fois. Les valeurs d'un renvoi qui ne se retrouvent dans AUCUNE clé (un
   renvoi relié ailleurs) sont des renvois qui ne mènent nulle part : leur compte, et les dix premières (leur ligne, la
   référence qu'elle porte) pour la cohérence. */
const estCleSEE = (f, c) => /^id$/i.test(c.nom) || (/^idequipment$/i.test(c.nom) && /^EED_(e?Cat_)?View/i.test(f.nom));
function liensSEE(F) { const cles = [], renvois = [];
  F.forEach((f, fi) => f.colonnes.forEach(c => { if (c.ids) (estCleSEE(f, c) ? cles : renvois).push({ fi, c }); }));
  const index = new Map(); cles.forEach((x, k) => x.c.ids.forEach(v => { const a = index.get(v); if (a) a.push(k); else index.set(v, [k]); }));
  return renvois.map(x => { const n = new Map(), perdus = []; let trouves = 0;
    x.c.ids.forEach(v => { const ks = index.get(v); if (!ks) { if (perdus.length < 10) perdus.push(Object.assign({ v }, x.c.premiere && x.c.premiere.get(v))); return; } trouves++; ks.forEach(k => n.set(k, (n.get(k) || 0) + 1)); });
    const parFeuille = new Map(); n.forEach((m, k) => { const fi = cles[k].fi, d = parFeuille.get(fi);
      if (!d || m > d.n || (m === d.n && /^id$/i.test(cles[k].c.nom))) parFeuille.set(fi, { fi, col: cles[k].c.nom, n: m, part: m / x.c.ids.size }); });
    const cibles = [...parFeuille.values()].sort((u, v) => v.part - u.part || v.n - u.n).slice(0, 4);
    return { fi: x.fi, col: x.c.nom, distinct: x.c.ids.size, lignes: x.c.n, taux: x.c.taux, cibles, trouves, perdus }; }); }
// les petites tables qui relient (EED_LNK_…, EED_SET_…) : montrées colonne par colonne sous les liens, pour qu'une photo
// des Liens dise aussi ce qu'elles portent à côté de leurs identifiants (un nom de famille, une quantité…)
const estLiaisonSEE = f => /^(EED_)?(LNK|SET)_/i.test(f.nom);

/* LE PLAN OUVERT FACE À SEE : ses types de câble (DR24…), leurs familles (DR…) et ses références (part numbers des
   équipements), cherchés dans les colonnes de texte de toutes les feuilles. Des références, seulement le compte et les
   colonnes où elles se trouvent : le retest du lecteur ne s'affiche pas. */
function planFaceASEE(F) { const V = typeof verite === 'function' ? verite() : []; if (!V || !V.length) return null;
  const types = [...new Set(V.map(l => l.type).filter(Boolean))], familles = [...new Set(types.map(t => (String(t).match(/^[A-Za-z]+/) || [''])[0].toUpperCase()).filter(Boolean))];
  const pns = [...new Set(V.flatMap(l => [l.pnDe, l.pnVers]).filter(Boolean))];
  const textes = []; F.forEach(f => f.colonnes.forEach(c => { if (c.textes) textes.push({ cle: nomCourtSEE(f.nom) + '.' + c.nom, s: c.textes }); }));
  const chercher = xs => { const ou = new Map(), manque = []; let trouves = 0;
    xs.forEach(x => { const k = cleTexteSEE(x), ts = textes.filter(t => t.s.has(k)); if (!ts.length) { manque.push(x); return; } trouves++; ts.forEach(t => ou.set(t.cle, (ou.get(t.cle) || 0) + 1)); });
    return { total: xs.length, trouves, ou: [...ou].sort((a, b) => b[1] - a[1]), manque: manque.sort(triNaturel) }; };
  return { nom: app.nom || 'le plan ouvert', types: chercher(types), familles: chercher(familles), pns: chercher(pns) }; }

/* ---- la page ------------------------------------------------------------------------------------------------- */
// les onglets : l'import d'abord (ce que Volta prend), la cohérence (la base vérifiée ligne par ligne), puis les liens, les
// codes, les feuilles — l'import et la cohérence seuls quand aucun classeur n'est lu dans cette séance mais qu'une base
// est gardée sur ce PC
const ORDRE_SEE = () => SEE.lu ? ['import', 'coherence', 'liens', 'codes', ...SEE.lu.feuilles.map((_, i) => i)] : ['import', ...(BASE_SEE.base && BASE_SEE.base.coherence ? ['coherence'] : [])];
const vueSansClasseurSEE = () => { if (!SEE.lu && !ORDRE_SEE().includes(SEE.vue)) SEE.vue = 'import'; };
function ficheBaseSEE() { if (!SEE.lu && !BASE_SEE.base) return; vueSansClasseurSEE(); const deja = app.fiche && app.fiche.mode === 'see';
  ouvrirFiche({ mode: 'see', large: true }, baseSEEHtml(), baseSEEPiedHtml());
  if (!deja) ajuster(true); lierBaseSEE(); }
function rendreBaseSEE() { if (!(app.fiche && app.fiche.mode === 'see')) return; if (!SEE.lu && !BASE_SEE.base) { fermerFiche(true); return; } vueSansClasseurSEE();
  const c = $('fiche-corps'), p = $('fiche-pied'), y = c.scrollTop;
  c.innerHTML = baseSEEHtml(); p.innerHTML = baseSEEPiedHtml(); p.hidden = !p.innerHTML; c.scrollTop = SEE.garderDefilement ? y : 0; SEE.garderDefilement = false; lierBaseSEE(); }
const tauxSEE = t => t >= 0.995 ? '100\u00a0%' : t < 0.01 ? '<\u00a01\u00a0%' : Math.round(t * 100) + '\u00a0%';   // « (100 %) » ne se coupe pas
const exempleSEE = s => s.length > 34 ? s.slice(0, 33) + '…' : s;
const partSEE = (n, sur) => `${milliers(n)} / ${milliers(sur)} (${tauxSEE(sur ? n / sur : 0)})`;
// les contrôles à reprendre (en erreur ou à voir, avec des cas) : le compte de l'onglet Cohérence
const aReprendreSEE = I => controlesSEE(I).filter(x => x.n && x.gravite !== 'info').length;
function baseSEEHtml() { const L = SEE.lu, v = SEE.vue, I = baseMontreeSEE();
  // dans la bulle de l'outil (data-bulle) : le sens d'un onglet, ou le nom entier d'une feuille (l'onglet porte le court)
  const onglet = (cle, b, s, sens, entier) => `<button type="button" role="tab" data-see-vue="${cle}" aria-selected="${String(v) === String(cle)}" data-bulle="${escA(entier || sens || b)}"><b>${esc(b)}</b>${s != null ? `<span>${esc(s)}</span>` : ''}</button>`;
  const imp = onglet('import', 'Import', null, 'Ce que Volta prend de la base, et ce qui change dans ses tables');
  const coh = I && I.coherence ? onglet('coherence', 'Cohérence', String(aReprendreSEE(I)), 'La base vérifiée ligne par ligne : ce qui cloche, et ce que Volta en fait') : '';
  const corpsBase = v === 'coherence' && coh ? coherenceSEEHtml() : importSEEHtml();
  /* LE VERDICT D'ABORD (le technicien v73 : « beaucoup de paragraphes avant le premier chiffre ») : « 1 contrôle en erreur,
     2 à voir » sous le titre, quel que soit l'onglet ; la façon de lire la page, repliée. */
  const verdict = lienCoherenceSEEHtml(I, v === 'coherence'), lire = t => `<details class="see-lire"><summary>Comment lire cette page</summary><p class="see-mode">${t}</p></details>`;
  if (!L) return `<div class="see">${nmTitre('Base SEE · gardée sur ce PC, rien n’en sort', I.nom)}${verdict}`
    + lire('Volta se sert de cette base à la place de ses tables. Pour la mettre à jour, déposez le nouvel Excel de SEE (Données → Actualiser tout, puis enregistrer).')
    + `<div class="see-barre"><div class="see-onglets" role="tablist" aria-label="La base">${imp}${coh}</div></div>${corpsBase}</div>`;
  const nl = L.liens.filter(x => x.cibles.length).length;
  // les feuilles du classeur, après un filet et leur nom de groupe ; chacune sous un nom court (sans EED_, OBJ_, LNK_), le nom entier dans sa bulle
  const onglets = `<div class="see-onglets" role="tablist" aria-label="Le classeur">${imp}${coh}${onglet('liens', 'Liens', String(nl), 'Ce qui se relie à quoi, d’une feuille à l’autre')}${onglet('codes', 'Codes', null, 'Les valeurs des colonnes de codes, et le plan ouvert face à SEE')}<span class="see-sep" aria-hidden="true"></span><span class="see-groupe-t" aria-hidden="true">Feuilles du classeur</span>`
    + L.feuilles.map((f, i) => onglet(i, nomCourtSEE(f.nom), milliers(f.lignes), '', f.nom)).join('') + '</div>';
  const corps = v === 'import' || v === 'coherence' ? corpsBase : v === 'liens' ? liensSEEHtml() : v === 'codes' ? codesSEEHtml() : feuilleSEEHtml(L.feuilles[v] || L.feuilles[0]);
  return `<div class="see">${nmTitre('Base SEE · lue sur ce poste, rien n’en sort', L.nom)}${verdict}`
    + lire('Volta a lu votre Excel ici, en entier, et l’a vérifié ligne par ligne. <b>Import</b> dit ce qu’il en prend et ce qui change dans ses tables : « Garder dans Volta » le garde sur ce PC, et rien ne sort. <b>Cohérence</b> dit ce qui cloche dans la base. Les autres onglets montrent le classeur tel quel.')
    + `<div class="see-barre">${onglets}${v === 'import' || v === 'coherence' ? '' : `<label class="see-ex"><input type="checkbox" id="see-ex"${SEE.exemples ? ' checked' : ''}> Exemples de valeurs</label>`}</div>${corps}</div>`; }
/* Une colonne d'une feuille, sur une ligne : son nom, son taux, deux exemples (la gauge AWG d'une section en mm²) ; un
   identifiant dit où il mène. */
function versSEE(fi, c) { const L = SEE.lu, F = L.feuilles; if (estCleSEE(F[fi], c)) return '<i>identifiant</i>';
  const x = L.liens.find(y => y.fi === fi && y.col === c.nom);
  return '<i>identifiant</i> ' + (x && x.cibles.length ? '→ ' + esc(x.cibles.map(k => nomCourtSEE(F[k.fi].nom)).join(', ')) : '<i>— ne se relie à rien</i>'); }
const exemplesSEE = c => c.exemples.map(v => exempleSEE(v) + (estGaugeSEE(c) && awgSEE(v) ? ' = AWG ' + awgSEE(v) : '')).join(' · ');
const colonneSEEHtml = (fi, c) => `<li class="see-col${c.taux < 0.05 ? ' rare' : ''}${c.genre === 'id' ? ' id' : ''}"><span class="see-c">${esc(c.nom)}</span><span class="see-t">${esc(tauxSEE(c.taux))}</span>`
  + `<span class="see-e">${c.genre === 'id' ? versSEE(fi, c) : SEE.exemples && !PERSONNEL_SEE.test(c.nom) ? esc(exemplesSEE(c)) : c.genre ? '<i>' + esc(c.genre) + '</i>' : ''}</span></li>`;
/* Une feuille : ses colonnes remplies, les vides à part. */
function feuilleSEEHtml(F) { const L = SEE.lu, i = L.feuilles.indexOf(F), ligne = c => colonneSEEHtml(i, c);
  const vides = F.vides.length ? `<details class="see-vides"><summary>${esc(pluriel(F.vides.length, 'colonne'))} vide${F.vides.length > 1 ? 's' : ''} sur toutes les lignes</summary><p>${F.vides.map(esc).join(' · ')}</p></details>` : '';
  return `<section class="see-feuille" aria-label="${escA(F.nom)}"><div class="see-tete"><b class="see-nom">${esc(F.nom)}</b>`
    + `<span class="see-compte">${esc(milliers(F.lignes))} ligne${F.lignes > 1 ? 's' : ''} · ${esc(pluriel(F.colonnes.length + F.vides.length, 'colonne'))} : <b>${esc(String(F.colonnes.length))} remplie${F.colonnes.length > 1 ? 's' : ''}</b>${F.vides.length ? ', ' + esc(String(F.vides.length)) + ' vide' + (F.vides.length > 1 ? 's' : '') : ''}</span>`
    + `<span class="see-pos">feuille ${i + 1} / ${L.feuilles.length}</span></div>`
    + (F.colonnes.length ? `<ol class="see-cols">${F.colonnes.map(ligne).join('')}</ol>` : '<p class="see-rien">Aucune colonne remplie.</p>') + vides + '</section>'; }
/* Les liens : par feuille, chaque renvoi et la clé où ses valeurs se retrouvent ; ceux qui ne se relient à rien (une
   table qui manque). */
function liensSEEHtml() { const L = SEE.lu, F = L.feuilles, Ls = L.liens, nl = Ls.filter(x => x.cibles.length).length;
  // le renvoi, et son taux s'il n'est pas rempli partout (IDPlugMap des connecteurs : < 1 %, presque jamais rempli)
  const renvoi = x => `<span class="see-c">${esc(x.col)}${x.taux < 0.995 ? ` <span class="see-t" data-bulle="${escA('rempli sur ' + milliers(x.lignes) + ' des ' + milliers(F[x.fi].lignes) + ' lignes')}">${esc(tauxSEE(x.taux))}</span>` : ''}</span>`;
  const cible = (x, c) => `<b>${esc(nomCourtSEE(F[c.fi].nom))}.${esc(c.col)}</b> <span class="see-t">${esc(partSEE(c.n, x.distinct))}${c.fi === x.fi ? ' · sa propre feuille' : ''}</span>`;
  const groupes = F.map((f, fi) => { const xs = Ls.filter(x => x.fi === fi); if (!xs.length) return '';
    return `<div class="see-groupe"><h4>${esc(nomCourtSEE(f.nom))}</h4><ul>${xs.map(x => x.cibles.length
      ? `<li class="see-lien">${renvoi(x)}<span class="see-fl">→</span><span class="see-cible">${x.cibles.map(c => cible(x, c)).join('<br>')}</span></li>`
      : `<li class="see-lien rien">${renvoi(x)}<span class="see-fl">→</span><span class="see-cible"><i>ne se relie à aucune feuille</i> <span class="see-t">${esc(milliers(x.distinct))} valeur${x.distinct > 1 ? 's' : ''}</span></span></li>`).join('')}</ul></div>`; }).join('');
  return `<section class="see-feuille see-liens" aria-label="Liens entre feuilles"><div class="see-tete"><b class="see-nom">Liens entre feuilles</b><span class="see-compte">${esc(pluriel(Ls.length, 'renvoi'))} d’une feuille à l’autre · <b>${nl} relié${nl > 1 ? 's' : ''}</b>${Ls.length - nl ? ', ' + (Ls.length - nl) + ' sans cible' : ''}</span></div>`
    + (groupes ? `<div class="see-groupes">${groupes}</div>` : '<p class="see-rien">Aucune colonne d’identifiants.</p>')
    + '<p class="see-note">Un renvoi, c’est une colonne d’identifiants qui désigne une pièce d’une autre feuille (ou une autre ligne de la sienne) ; la part dit combien de ses valeurs s’y retrouvent. « Ne se relie à aucune feuille » : la table qui porte ces identifiants n’est pas dans le classeur.</p>'
    + petitesSEEHtml() + '</section>'; }
/* Sous les liens, les petites tables qui relient (LNK_, SET_), colonne par colonne : ce qu'elles portent à côté de leurs
   identifiants (une famille de produits, une quantité, un ordre de préférence). */
function petitesSEEHtml() { const F = SEE.lu.feuilles, ts = F.map((f, fi) => ({ f, fi })).filter(x => estLiaisonSEE(x.f)); if (!ts.length) return '';
  return `<div class="see-petites"><h4 class="see-petites-t">Les tables qui relient, colonne par colonne</h4><div class="see-groupes">`
    + ts.map(({ f, fi }) => `<div class="see-petite"><h4>${esc(nomCourtSEE(f.nom))} <span class="see-t">${esc(milliers(f.lignes))} ligne${f.lignes > 1 ? 's' : ''}</span></h4><ul class="see-petite-l">`
      + f.colonnes.map(c => colonneSEEHtml(fi, c)).join('') + f.vides.map(v => `<li class="see-col rare"><span class="see-c">${esc(v)}</span><span class="see-t">vide</span></li>`).join('') + '</ul></div>').join('')
    + '</div></div>'; }
/* Les codes : d'abord le plan ouvert face à SEE, puis les colonnes de codes qui comptent, les autres repliées. */
function codesSEEHtml() { const L = SEE.lu, P = L.plan, codes = [];
  L.feuilles.forEach(f => f.colonnes.forEach(c => { if (c.codes) codes.push({ f, c }); }));
  const d_abord = codes.filter(x => CODES_D_ABORD_SEE.test(x.c.nom)), autres = codes.filter(x => !CODES_D_ABORD_SEE.test(x.c.nom));
  const code = x => `<div class="see-code"><div class="see-code-t"><b>${esc(nomCourtSEE(x.f.nom))} · ${esc(x.c.nom)}</b><span>${esc(pluriel(x.c.codes.length, 'valeur'))}${x.c.liste ? ' (liste)' : ''}</span></div>`
    + `<p>${x.c.codes.map(([v, n]) => { const a = estGaugeSEE(x.c) && awgSEE(v);   // la valeur, sa gauge et son compte ne se séparent pas
      return a ? `<span class="see-nw">${esc(v)} <span class="see-awg">AWG ${a}</span><i>(${esc(milliers(n))})</i></span>` : `${esc(v)}<i>(${esc(milliers(n))})</i>`; }).join(' · ')}</p></div>`;
  const cherche = (t, R, montrer) => !R.total ? '' : `<li><b>${esc(t)}</b> <span class="see-t">${esc(partSEE(R.trouves, R.total))} retrouvé${R.trouves > 1 ? 's' : ''}</span>`
    + (R.ou.length ? ` — dans ${R.ou.slice(0, 4).map(([k, n]) => `<span class="mono">${esc(k)}</span> (${n})`).join(', ')}` : '')
    + (montrer && R.manque.length ? `<br><span class="see-manque">pas trouvés : ${R.manque.slice(0, 24).map(esc).join(' · ')}${R.manque.length > 24 ? ' …' : ''}</span>` : '') + '</li>';
  const plan = P ? `<div class="see-plan"><h4>Le plan ouvert face à SEE · ${esc(P.nom)}</h4><ul>${cherche('Types de câble', P.types, true)}${cherche('Familles de câble', P.familles, true)}${cherche('Références des équipements', P.pns, false)}</ul>`
    + '<p class="see-note">Des références, seulement le compte et les colonnes où elles se retrouvent : le retest ne s’affiche pas.</p></div>' : '<p class="see-note">Aucun plan ouvert : ouvrez un retest avant de déposer la base SEE pour le confronter à SEE.</p>';
  return `<section class="see-feuille see-codes" aria-label="Codes"><div class="see-tete"><b class="see-nom">Codes</b><span class="see-compte">${esc(pluriel(codes.length, 'colonne'))} de codes · les valeurs et leur nombre de lignes</span></div>${plan}`
    + (d_abord.length ? `<div class="see-codes-l">${d_abord.map(code).join('')}</div>` : '')
    + (autres.length ? `<details class="see-vides"><summary>${autres.length} autre${autres.length > 1 ? 's' : ''} colonne${autres.length > 1 ? 's' : ''} de codes</summary><div class="see-codes-l">${autres.map(code).join('')}</div></details>` : '') + '</section>'; }
/* Le pied : d'un onglet à l'autre (au filet : l'action pleine de la page est « Garder dans Volta », dans l'onglet Import),
   l'onglet en cours sur combien ; à droite, le résumé à copier ou à enregistrer — sur l'onglet Cohérence, le rapport de
   cohérence (son action pleine : le copier). */
function baseSEEPiedHtml() { const o = ORDRE_SEE(), k = o.findIndex(x => String(x) === String(SEE.vue)), coh = SEE.vue === 'coherence';
  if (!SEE.lu && !coh && o.length < 2) return '';
  const fleche = d => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  return (o.length > 1 ? `<button class="btn papier" id="see-prec"${k > 0 ? '' : ' disabled'}>${fleche('m14.5 6-6 6 6 6')}Précédent</button><button class="btn papier" id="see-suiv"${k < o.length - 1 ? '' : ' disabled'}>Suivant${fleche('m9.5 6 6 6-6 6')}</button><span class="see-rang">${k + 1} / ${o.length}</span>` : '')
    + '<span class="espace"></span>'
    + (coh ? `<button class="btn lien" id="see-enregistrer-coh" data-bulle="Le même rapport, dans un fichier texte">Enregistrer le rapport</button><button class="btn cuivre" id="see-copier-coh" data-bulle="Des références de catalogue et des comptes, en texte : ni le plan, ni le nom des programmes">Copier le rapport de cohérence</button>`
      : SEE.lu ? `<button class="btn lien" id="see-copier" data-bulle="Tout le résumé, en texte : à coller dans un message">Copier le résumé</button><button class="btn papier" id="see-enregistrer" data-bulle="Tout le résumé, dans un fichier texte">Enregistrer le résumé</button>` : ''); }
function changerVueSEE(cle) { if (!ORDRE_SEE().some(x => String(x) === String(cle))) return; SEE.vue = cle; rendreBaseSEE();
  const b = $('fiche-corps').querySelector(`[data-see-vue="${cle}"]`); if (b && b.scrollIntoView) { try { b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) { } } }
function pasSEE(d) { const o = ORDRE_SEE(), k = o.findIndex(x => String(x) === String(SEE.vue)); changerVueSEE(o[Math.max(0, Math.min(o.length - 1, k + d))]); }
function lierBaseSEE() { const c = $('fiche-corps'); if (!c) return;
  c.querySelectorAll('[data-see-vue]').forEach(b => b.onclick = () => changerVueSEE(/^\d+$/.test(b.dataset.seeVue) ? +b.dataset.seeVue : b.dataset.seeVue));
  const ex = $('see-ex'); if (ex) ex.onchange = () => { SEE.exemples = ex.checked; rendreBaseSEE(); };
  if ($('see-prec')) $('see-prec').onclick = () => pasSEE(-1);
  if ($('see-suiv')) $('see-suiv').onclick = () => pasSEE(1);
  if ($('see-copier')) $('see-copier').onclick = copierResumeSEE;
  if ($('see-garder')) $('see-garder').onclick = adopterBaseSEE;
  if ($('see-oublier')) $('see-oublier').onclick = oublierBaseSEE;
  if ($('see-prog')) $('see-prog').onchange = e => { SEE.garderDefilement = true; choisirProgrammeSEE(e.target.value); };
  if ($('see-enregistrer')) $('see-enregistrer').onclick = () => { telecharger(new Blob(['﻿' + resumeSEE()], { type: 'text/plain;charset=utf-8' }), 'resume-base-SEE.txt'); dire('Le résumé de la base SEE est enregistré.'); };
  // la cohérence : copier ou enregistrer le rapport ; déplier ou replier tous les exemples
  if ($('see-copier-coh')) $('see-copier-coh').onclick = () => copierTexteSEE(rapportCoherenceSEE(baseMontreeSEE(), true), 'Rapport de cohérence copié : des références de catalogue et des comptes, rien de votre plan.', 'Enregistrer le rapport');
  if ($('see-enregistrer-coh')) $('see-enregistrer-coh').onclick = () => { telecharger(new Blob(['﻿' + rapportCoherenceSEE(baseMontreeSEE(), true)], { type: 'text/plain;charset=utf-8' }), 'coherence-base-SEE.txt'); dire('Le rapport de cohérence est enregistré.'); };
  if ($('see-voir-coh')) $('see-voir-coh').onclick = () => changerVueSEE('coherence');
  const dp = $('see-deplier'); if (dp) dp.onclick = () => { const ds = [...c.querySelectorAll('.see-ctl details')], ouvrir = !ds.every(d => d.open); ds.forEach(d => { d.open = ouvrir; }); SEE.deplie = ouvrir; dp.textContent = ouvrir ? 'Replier les exemples' : 'Déplier les exemples'; };
  if (typeof lierBullesDoc === 'function') lierBullesDoc(); }   // la bulle de l'outil (data-bulle) sur la page et son pied

/* ---- le résumé en texte : les liens, les codes, le plan face à SEE, puis chaque feuille ------------------------- */
function resumeSEE() { const L = SEE.lu; if (!L) return ''; const F = L.feuilles, P = L.plan, out = [`Base SEE — ${L.nom} — résumé par Volta le ${L.quand.toLocaleDateString('fr-FR')}${SEE.exemples ? '' : ' (sans exemples)'}`];
  const imp = resumeImportSEE(); if (imp) out.push(imp);
  const coh = rapportCoherenceSEE(baseMontreeSEE(), false); if (coh) out.push('\n== Cohérence ==\n' + coh.trim());
  out.push('\n== Liens entre feuilles ==', ...L.liens.map(x => nomCourtSEE(F[x.fi].nom) + '.' + x.col + ' → '
    + (x.cibles.length ? x.cibles.map(c => nomCourtSEE(F[c.fi].nom) + '.' + c.col + ' ' + c.n + '/' + x.distinct + (c.fi === x.fi ? ' (sa propre feuille)' : '')).join(' ; ') : 'aucune feuille (' + x.distinct + ' valeurs)')
    + (x.taux < 0.995 ? ' — rempli sur ' + x.lignes + ' des ' + F[x.fi].lignes + ' lignes' : '')));
  if (P) { const r = (t, R, montrer) => R.total ? `${t} : ${R.trouves}/${R.total} retrouvés${R.ou.length ? ' — ' + R.ou.slice(0, 4).map(([k, n]) => k + ' (' + n + ')').join(', ') : ''}${montrer && R.manque.length ? ' — pas trouvés : ' + R.manque.join(', ') : ''}` : '';
    out.push(`\n== Le plan ouvert face à SEE : ${P.nom} ==`, r('Types de câble', P.types, true), r('Familles de câble', P.familles, true), r('Références des équipements', P.pns, false)); }
  out.push('\n== Codes ==', ...F.flatMap(f => f.colonnes.filter(c => c.codes).map(c => nomCourtSEE(f.nom) + '.' + c.nom + (c.liste ? ' (liste)' : '') + ' : ' + c.codes.map(([v, n]) => v + (estGaugeSEE(c) && awgSEE(v) ? ' (AWG ' + awgSEE(v) + ')' : '') + ' ' + n).join(' · '))));
  F.forEach(f => out.push(`\n== ${f.nom} — ${f.lignes} lignes — ${f.colonnes.length + f.vides.length} colonnes, ${f.colonnes.length} remplies ==`,
    f.colonnes.map(c => c.nom + ' | ' + tauxSEE(c.taux) + (c.genre === 'id' ? ' | identifiant' : SEE.exemples && c.exemples.length && !PERSONNEL_SEE.test(c.nom) ? ' | ' + c.exemples.join(' ; ') : c.genre ? ' | ' + c.genre : '')).join('\n')
    + (f.vides.length ? '\nColonnes vides : ' + f.vides.join(', ') : '')));
  return out.filter(x => x !== '').join('\n') + '\n'; }
const copierResumeSEE = () => copierTexteSEE(resumeSEE(), 'Résumé copié : collez-le dans un message.', 'Enregistrer le résumé');
function copierTexteSEE(t, mot, repliMot) { const ok = () => { SEE.copie = t; dire(mot); };
  const repli = () => { const a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select();
    let r = false; try { r = document.execCommand('copy'); } catch (_) { } a.remove(); if (r) ok(); else dire('La copie est refusée ici : « ' + repliMot + ' » le met dans un fichier.', true); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, repli); else repli(); }

/* ---- l'onglet « Cohérence » : la base vérifiée ligne par ligne ---------------------------------------------------
   D'un coup d'œil, le verdict (combien de contrôles en erreur, à voir, pour information, sans défaut) ; puis chaque
   contrôle, par domaine : son point d'état, son titre, ce que Volta en fait, son compte — un clic déplie ses dix premiers
   exemples (la référence de catalogue, ce qui cloche, la ligne de la feuille Excel) ; enfin ce que la base apporte à
   côté de ce que Volta tenait de vos photos. Les contrôles qui ont des cas d'abord (les erreurs, puis à voir, puis pour
   information), ceux qui n'en ont pas ensuite, dans l'ordre du catalogue. */
const GRAVITES_SEE = { ko: ['erreur', 'erreurs', 'en erreur'], att: ['à voir', 'à voir', 'à voir'], info: ['info', 'pour information', 'pour information'], ok: ['rien à redire', 'sans défaut', 'sans défaut'] };
const etatCtlSEE = x => x.na ? 'na' : x.n ? x.gravite : 'ok';
// les comptes de plus d'un contrôle, en mots : les obsolètes remplacées, les cases vides par champ
const plusMotsSEE = p => Object.entries(p).map(([k, n]) => k === 'remplacées' ? plurielLie(n, 'autre') + ' obsolète' + (n > 1 ? 's ont' : ' a') + ' une version validée' : k + ' ' + milliers(n)).join(' · ');
// où retrouver un exemple : sa ligne Excel (la feuille du contrôle se dit une fois au-dessus ; une autre feuille, devant la ligne)
const lieuSEE = (x, e, entier) => e.l ? (e.f || (entier && x.f) ? (e.f || x.f) + ' ' : '') + 'l.\u00a0' + milliers(e.l) : '';
function surSEE(I, g) { const s = (I.coherence || {}).sur || {}, C = comparaisonSEE(I), m = milliers;
  return g === 'contacts' ? `${m(s.lignes || 0)} ligne${s.lignes > 1 ? 's' : ''} de contact de ${plurielLie(s.regles || 0, 'règle')} validée${s.regles > 1 ? 's' : ''} ou en cours`
    : g === 'cables' ? `${m(s.cables || 0)} câble${s.cables > 1 ? 's' : ''}, les obsolètes à part`
    : g === 'faces' ? `${plurielLie(s.faces || 0, 'face')}, ${m(s.broches || 0)} broche${s.broches > 1 ? 's' : ''}`
    : g === 'equipements' ? `${plurielLie(s.connecteurs || 0, 'connecteur')}, ${plurielLie(s.equipements || 0, 'équipement')}, ${plurielLie(s.paires || 0, 'paire')} fiche ↔ embase`
    : g === 'liens' ? (s.renvois != null ? `${plurielLie(s.renvois, 'renvoi')} entre ${plurielLie(s.feuilles || 0, 'feuille')}` : 'à la lecture du classeur')
    : `${m(['contacts', 'cables', 'modules'].reduce((n, t) => n + C[t].remplacees.length + (C[t].verifiees || []).length + C[t].identiques.length + (C[t].redessinees || []).length, 0))} lignes que Volta avait aussi`; }
function coherenceSEEHtml() { const I = baseMontreeSEE(), K = I && I.coherence;
  if (!K) return `<section class="see-feuille see-coherence" aria-label="Cohérence"><p class="see-rien">Cette base a été gardée avant que Volta sache la vérifier : déposez de nouveau le classeur de SEE pour la vérifier ligne par ligne.</p></section>`;
  const X = controlesSEE(I), par = e => X.filter(x => etatCtlSEE(x) === e), rang = { ko: 0, att: 1, info: 2, ok: 3, na: 4 };
  const lignesDe = xs => xs.reduce((n, x) => n + x.n, 0);
  const tuile = (e, n, t, s) => `<div class="see-v ${e}${n ? '' : ' zero'}"><b>${esc(milliers(n))}</b><span><i class="see-pt" aria-hidden="true"></i>${esc(t)}</span><small>${esc(s)}</small></div>`;
  const ko = par('ko'), att = par('att'), info = par('info'), ok = par('ok');
  const verdict = `<div class="see-verdict">${tuile('ko', ko.length, ko.length > 1 ? 'contrôles en erreur' : 'contrôle en erreur', ko.length ? plurielLie(lignesDe(ko), 'cas') + ' — Volta les écarte' : 'aucune ligne ne se contredit')}`
    + `${tuile('att', att.length, att.length > 1 ? 'contrôles à voir' : 'contrôle à voir', att.length ? plurielLie(lignesDe(att), 'cas') + ' — pris, à vérifier dans SEE' : 'rien à vérifier')}`
    + `${tuile('info', info.length, 'pour information', info.length ? plurielLie(lignesDe(info), 'cas') : 'rien à signaler')}${tuile('ok', ok.length, 'sans défaut', 'sur ' + plurielLie(X.length, 'contrôle'))}</div>`;
  const ctl = x => { const e = etatCtlSEE(x), G = GRAVITES_SEE[e] || ['sans objet'], plus = x.plus ? plusMotsSEE(x.plus) : '';
    const tete = `<i class="see-pt" aria-hidden="true"></i><span class="see-ctl-t"><b>${esc(x.titre)}</b>${x.na || x.n || plus ? `<small>${esc(x.na ? 'Sans objet : ' + x.na + '.' : x.n ? x.fait : '')}${plus ? ' <span class="see-plus">' + esc(plus) + '</span>' : ''}</small>` : ''}</span>`
      + `<span class="see-ctl-n">${x.na ? '—' : esc(milliers(x.n))}</span><span class="see-ctl-g">${esc(x.na ? 'sans objet' : G[0])}</span>`;
    if (!x.n || !x.ex.length) return `<li class="see-ctl ${e}" data-ctl="${x.cle}"><div class="see-ctl-l">${tete}</div></li>`;
    const ex = (x.f && x.ex.some(y => y.l && !y.f) ? `<p class="see-ex-f">Les lignes de la feuille <span class="mono">${esc(x.f)}</span></p>` : '')
      + `<ol class="see-exs">${x.ex.map(y => `<li><b class="see-ex-r">${esc(y.r)}</b><span class="see-ex-d">${esc(y.d)}</span><i class="see-ex-l">${esc(lieuSEE(x, y))}</i></li>`).join('')}</ol>`
      + (x.n > x.ex.length ? `<p class="see-ex-plus">… et ${esc(milliers(x.n - x.ex.length))} autre${x.n - x.ex.length > 1 ? 's' : ''} : les dix premiers seulement.</p>` : '');
    return `<li class="see-ctl ${e}" data-ctl="${x.cle}"><details${SEE.deplie ? ' open' : ''}><summary class="see-ctl-l">${tete}</summary>${ex}</details></li>`; };
  const groupe = ([g, t]) => { const xs = X.filter(x => x.groupe === g).map((x, i) => [x, i]).sort((a, b) => rang[etatCtlSEE(a[0])] - rang[etatCtlSEE(b[0])] || a[1] - b[1]).map(a => a[0]);
    const n = xs.filter(x => x.n && x.gravite !== 'info').length;
    return `<div class="see-bloc see-groupe-c" data-groupe="${g}"><h3>${esc(t)} <span>${esc(surSEE(I, g))}${n ? '' : ' · rien à reprendre'}</span></h3><ul class="see-ctls">${xs.map(ctl).join('')}</ul></div>`; };
  const G = new Map(GROUPES_SEE), col = gs => `<div class="see-col-c">${gs.map(g => groupe([g, G.get(g)])).join('')}</div>`;
  const tete = `<div class="see-tete"><b class="see-nom">La base vérifiée, ligne par ligne</b><span class="see-compte">${esc(plurielLie(X.length, 'contrôle'))} sur chaque ligne · des références de catalogue et des comptes, jamais votre plan</span>`
    + `<button type="button" class="btn lien see-deplier" id="see-deplier">${SEE.deplie ? 'Replier les exemples' : 'Déplier les exemples'}</button></div>`;
  return `<section class="see-feuille see-coherence" aria-label="Cohérence">${tete}${verdict}<div class="see-cols-c">${col(['contacts', 'cables'])}${col(['faces', 'equipements', 'liens', 'sources'])}</div>${apporteSEEHtml(I)}</section>`; }
/* « Ce que la base apporte » : à gauche, les quatre tables des photos face à la base (par famille : les lignes pareilles,
   celles qui diffèrent, celles que seul SEE ou seul Volta a, la version de la règle) ; à droite, ce que Volta n'avait pas. */
function apporteSEEHtml(I) { const A = apporteSEE(I), m = milliers;
  const ligne = p => `<tr><td class="mono">${esc(p.nom)}</td><td>v${p.photo}</td><td class="${p.version && p.version !== p.photo ? 'mono' : ''}">${p.version ? 'v' + p.version : '—'}</td><td>${m(p.volta)}</td><td>${m(p.see)}</td><td>${m(p.pareilles)}</td><td class="${p.autres ? 'att' : ''}">${m(p.autres)}</td><td>${m(p.seulSEE)}</td><td>${m(p.seulVolta)}</td></tr>`;
  const photos = `<div class="see-ap-t"><h4>Les quatre tables de vos photos, face à la base</h4><table class="see-table"><thead><tr><th>Famille</th><th>Règle photo</th><th>Règle SEE</th><th>Lignes Volta</th><th>Lignes SEE</th><th>Pareilles</th><th>Autres</th><th>Seul SEE</th><th>Seul Volta</th></tr></thead><tbody>${A.photos.map(ligne).join('')}</tbody></table>`
    + `<p class="see-note">« Pareilles » : même contact, même accessoire pour la même clé (famille, sexe, taille, type et gauge du câble) — un nom écrit en entier compte pareil. « Seul Volta » : des lignes des photos que la base n’a plus, ou que Volta a ajoutées de ses sources.</p></div>`;
  const fam = xs => xs.length ? ' : ' + xs.slice(0, 12).join(', ') + (xs.length > 12 ? '…' : '') : '';
  const item = (n, t, s) => `<li><b>${esc(n)}</b><span>${esc(t)}${s ? ` <i>${esc(s)}</i>` : ''}</span></li>`;
  const formes = Object.entries(A.formes).sort((a, b) => b[1] - a[1]).map(([f, n]) => f + ' ' + m(n)).join(' · ');
  const ac = A.accessoires;
  const plus = `<div class="see-ap-l"><h4>Ce que Volta n’avait pas</h4><ul>`
    + item('+' + m(A.contacts.nouvelles), 'lignes de contact', 'sur ' + m(A.contacts.n) + ' retenues, ' + plurielLie(A.contacts.familles, 'famille') + (A.contacts.famillesNouvelles.length ? ' — ' + plurielLie(A.contacts.famillesNouvelles.length, 'nouvelle') + fam(A.contacts.famillesNouvelles) : ''))
    + item('+' + m(A.cables.nouveaux), 'câbles', 'sur ' + m(A.cables.n) + (A.cables.famillesNouvelles.length ? ' — familles nouvelles' + fam(A.cables.famillesNouvelles) : ''))
    + item('+' + m(A.faces.nouvelles), 'faces de connecteur', 'sur ' + m(A.faces.n) + (A.faces.parFamille.length ? ' — ' + A.faces.parFamille.slice(0, 6).map(([f, n]) => f + ' ' + n).join(', ') : ''))
    + item(m(A.equipements.n), 'références de connecteurs et d’équipements', plurielLie(A.equipements.paires, 'paire') + ' fiche ↔ embase, ' + plurielLie(A.equipements.programmes, 'programme') + ' — Volta n’en avait aucune')
    + (ac ? item(m(ac.lignes), 'accessoires', (ac.types.length ? ac.types.slice(0, 4).map(([v, n]) => v + ' ' + m(n)).join(', ') + ' · ' : '') + (ac.tyraps ? m(ac.tyraps) + ' tyraps' : 'aucun tyrap nommé') + (ac.tyrapsVolta ? ' ; des ' + ac.tyrapsVolta + ' tyraps de Volta, ' + ac.tyrapsDansSEE + ' y sont' : '')) : '')
    + `</ul>${formes ? `<p class="see-note">Les références de contact, par famille : ${esc(formes)}.</p>` : ''}</div>`;
  return `<div class="see-bloc see-apporte"><h3>Ce que la base apporte <span>à côté de ce que Volta tenait de vos photos des tables de SEE (EN 2997 v6, EN 3645 v2, EN 3646 v13, EN 4165 v49)</span></h3><div class="see-ap">${photos}${plus}</div></div>`; }
/* Le lien de l'onglet Import vers la cohérence : une ligne, le compte de ce qui est à reprendre. */
function lienCoherenceSEEHtml(I, ici) { if (!I || !I.coherence) return ''; const X = controlesSEE(I), ko = X.filter(x => x.n && x.gravite === 'ko'), att = X.filter(x => x.n && x.gravite === 'att');
  const mots = [ko.length ? `<b class="see-t-ko">${esc(plurielLie(ko.length, 'contrôle'))} en erreur</b>` : '', att.length ? `<b class="see-t-att">${esc(plurielLie(att.length, 'contrôle'))} à voir</b>` : ''].filter(Boolean).join(', ');
  return `<p class="see-coh-l"><span>Volta a vérifié la base ligne par ligne : ${mots || 'aucun contrôle n’a rien à redire'}.</span>${ici ? '' : '<button type="button" class="btn lien" id="see-voir-coh">Voir la cohérence</button>'}</p>`; }

/* ---- le rapport de cohérence, en texte : à montrer à qui le demande. Des références de catalogue et des comptes —
   jamais le plan ouvert, ni le nom du classeur, ni le nom des programmes (« programme A ») quand il se copie. */
function rapportCoherenceSEE(I, copie) { const K = I && I.coherence; if (!K) return ''; const X = controlesSEE(I), s = K.sur || {}, m = milliers, A = apporteSEE(I);
  const nb = e => X.filter(x => etatCtlSEE(x) === e), cas = xs => xs.reduce((n, x) => n + x.n, 0);
  const out = [`Rapport de cohérence de la base SEE — vérifiée par Volta le ${new Date(I.quand || Date.now()).toLocaleDateString('fr-FR')}, sur le poste qui la détient`,
    'Des références de catalogue et des comptes seulement : ni le plan, ni le nom du classeur' + (copie ? ', ni le nom des programmes.' : '.'),
    `Lu : ${m(s.lignes || 0)} lignes de contact (${m(s.regles || 0)} règles validées ou en cours), ${m(s.cables || 0)} câbles, ${m(s.faces || 0)} faces (${m(s.broches || 0)} broches), ${m(s.connecteurs || 0)} connecteurs, ${m(s.equipements || 0)} équipements, ${m(s.paires || 0)} paires fiche ↔ embase${s.renvois != null ? `, ${m(s.renvois)} renvois entre ${m(s.feuilles || 0)} feuilles` : ''}.`,
    `Verdict : ${X.length} contrôles — ${nb('ko').length} en erreur (${m(cas(nb('ko')))} cas, écartés), ${nb('att').length} à voir (${m(cas(nb('att')))} cas), ${nb('info').length} pour information (${m(cas(nb('info')))} cas), ${nb('ok').length} sans défaut${nb('na').length ? ', ' + nb('na').length + ' sans objet' : ''}.`];
  const progs = new Map(); let np = 0; const prog = p => progs.get(p) || (progs.set(p, 'programme ' + String.fromCharCode(65 + (np++ % 26))), progs.get(p));
  GROUPES_SEE.forEach(([g, t]) => { out.push('', `== ${t} (${surSEE(I, g).replace(/ /g, ' ')}) ==`);
    X.filter(x => x.groupe === g).forEach(x => { const e = etatCtlSEE(x);
      out.push(`[${x.na ? 'sans objet' : (GRAVITES_SEE[e] || [''])[0]}] ${x.titre} : ${x.na ? x.na : m(x.n)}${x.n ? ' — ' + x.fait : ''}${x.plus ? ' (' + plusMotsSEE(x.plus) + ')' : ''}`);
      x.ex.forEach(y => { let r = y.r, d = y.d;
        if (copie && x.cle === 'e-programmes') { const ps = r.split(' · '); r = prog(cleNorme(ps[0])) + ' (' + ps.length + ' écritures)'; d = d.replace(/« [^»]*» /g, ''); }
        out.push(`    ${r} — ${d}${y.l ? ' — ' + lieuSEE(x, y, true).replace(/ /g, ' ') : ''}`); });
      if (x.n > x.ex.length) out.push(`    … et ${m(x.n - x.ex.length)} autres`); }); });
  out.push('', '== Ce que la base apporte ==',
    `Contacts : ${m(A.contacts.n)} lignes retenues, ${A.contacts.familles} familles — ${m(A.contacts.nouvelles)} que Volta n’avait pas${A.contacts.famillesNouvelles.length ? ' ; familles nouvelles : ' + A.contacts.famillesNouvelles.join(', ') : ''}`,
    'Les quatre tables des photos, face à la base :', ...A.photos.map(p => `    ${p.nom} : photo v${p.photo}, SEE ${p.version ? 'v' + p.version : 'sans règle validée'} — Volta ${p.volta} lignes, SEE ${p.see} : ${p.pareilles} pareilles, ${p.autres} autres, ${p.seulSEE} seulement dans SEE, ${p.seulVolta} seulement dans Volta`),
    `Câbles : ${m(A.cables.n)}, dont ${m(A.cables.nouveaux)} que Volta n’avait pas${A.cables.famillesNouvelles.length ? ' ; familles nouvelles : ' + A.cables.famillesNouvelles.join(', ') : ''}`,
    `Faces : ${m(A.faces.n)}, dont ${m(A.faces.nouvelles)} que Volta n’avait pas${A.faces.parFamille.length ? ' (' + A.faces.parFamille.map(([f, n]) => f + ' ' + n).join(', ') + ')' : ''}`,
    `Connecteurs et équipements : ${m(A.equipements.n)} références, ${m(A.equipements.paires)} paires fiche ↔ embase, ${A.equipements.programmes} programmes — Volta n’en avait aucune`,
    Object.keys(A.formes).length ? 'Références de contact par famille : ' + Object.entries(A.formes).sort((a, b) => b[1] - a[1]).map(([f, n]) => f + ' ' + n).join(', ') : '',
    A.accessoires ? `Accessoires : ${m(A.accessoires.lignes)}${A.accessoires.types.length ? ' (' + A.accessoires.types.map(([v, n]) => v + ' ' + n).join(', ') + ')' : ''} ; tyraps : ${A.accessoires.tyraps}${A.accessoires.tyrapsVolta ? ` ; des ${A.accessoires.tyrapsVolta} tyraps de Volta, ${A.accessoires.tyrapsDansSEE} y sont` : ''}` : '');
  return out.filter(x => x !== '').join('\n').replace(/\n(== )/g, '\n\n$1') + '\n'; }
