/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   LA BASE SEE (08 nonies) — l'Excel des vues et des tables de SEE Electrical Equipment Definition, lu sur place
   Le lecteur (octobre 2026) a tiré la base SEE dans Excel (Données → SQL Server → EED_View…, EED_OBJ_…, EED_LNK_…) :
   « il y a trop de colonnes, 200 ; les photos, c'est beaucoup trop ; le fichier est sur le bureau, je ne peux pas
   l'envoyer ». Volta lit donc ce classeur SUR LE POSTE, et montre, sur des écrans qui tiennent chacun en une photo :
     · IMPORT — ce que Volta en prend (contacts, câbles, faces, équipements : 08-see-import) et ce qui change dans ses
       tables ; « Garder dans Volta » le garde sur ce PC (IndexedDB, rien ne sort), sinon fermer la page l'oublie ;
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
const LARGEUR_SEE = 'min(1480px, calc(100vw - var(--rail) - 320px))';   // large (la page se photographie) ; le plan garde 320 px à côté, comme pour les normes
const estExcel = f => /\.xls[xmb]?$/i.test((f && f.name) || '') || /sheet|excel/i.test((f && f.type) || '');
// une feuille de la base SEE : nommée d'après sa vue ou sa table (EED_ViewCablesAndWires, EED_OBJ_Wires…) ou une fonction d'export
const estFeuilleSEE = n => /^(EED_|Export_)/i.test(String(n || ''));
const nomCourtSEE = n => String(n).replace(/^EED_(e?Cat_)?View_?/i, '').replace(/^EED_/i, '') || String(n);
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
      const rows = ws ? XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: false }) : [], k = cleFeuilleImportSEE(noms[i]);
      if (k && !lignes[k]) lignes[k] = rows;
      const F = resumerFeuilleSEE(noms[i], ws, rows); if (F.colonnes.length || F.vides.length) feuilles.push(F); }
    if (!feuilles.length) { echecImport('normes', { texte: `${esc(nom)} : aucune feuille avec une ligne d’en-têtes.` }); return; }
    dire(`${guillemets(nom)} : Volta prend les contacts, les câbles, les faces et les équipements…`); await new Promise(r => setTimeout(r, 0));
    SEE.import = importerSEE(lignes, nom);
    SEE.lu = { nom, feuilles, quand: new Date(), liens: liensSEE(feuilles), plan: planFaceASEE(feuilles) }; SEE.vue = 'import'; ficheBaseSEE();
    dire(guillemets(nom) + ' : ' + pluriel(feuilles.length, 'feuille') + ' lue' + (feuilles.length > 1 ? 's' : '') + ' en entier. L’onglet Import dit ce que Volta en prend ; « Garder dans Volta » le garde sur ce PC.'); }
  catch (e) { echecImport('normes', { texte: `${esc(nom)} n’a pas pu être lu : ${esc(String(e && e.message || e))}.` }); } }

/* Une feuille, sur TOUTES ses lignes : sa ligne d'en-têtes (la première qui a plusieurs cellules), et pour chaque
   colonne : combien de lignes la remplissent, deux valeurs différentes, son genre (nombre, oui/non, identifiant) ; les
   identifiants (pour relier les feuilles), les textes où chercher le plan, et les codes (2 à 300 valeurs courtes ; une
   liste à virgules compte valeur par valeur). */
function resumerFeuilleSEE(nom, ws, rows) { const vide = { nom, lignes: 0, colonnes: [], vides: [] }; if (!ws && !rows) return vide;
  rows = rows || XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: false });
  const k = rows.findIndex(r => Array.isArray(r) && r.filter(c => String(c).trim()).length > 1); if (k < 0) return vide;
  const entete = rows[k].map(c => String(c == null ? '' : c).trim()), corps = rows.slice(k + 1), N = corps.length;
  const cols = entete.map((t, i) => { const c = { nom: t || 'colonne ' + (i + 1), n: 0, exemples: [], genre: '' }; let nombres = 0, guids = 0, bools = 0, virgules = 0, longueur = 0, trop = false;
    const vus = new Set(), comptes = new Map();
    for (const r of corps) { const v = r[i]; if (v === '' || v == null) continue; const s = valeurSEE(v); if (!s) continue; c.n++;   // 0.32574322630000002 se lit 0.3257432
      if (typeof v === 'number') nombres++; else if (typeof v === 'boolean' || OUI_NON_SEE.test(s)) bools++; else if (GUID_SEE.test(s)) guids++;
      if (s.includes(',')) virgules++; longueur += s.length;
      if (c.exemples.length < 2 && !vus.has(s)) { vus.add(s); c.exemples.push(s); }
      if (!trop) { comptes.set(s, (comptes.get(s) || 0) + 1); if (comptes.size > MAX_CODES_SEE) trop = true; } }
    c.taux = N ? c.n / N : 0; c.genre = !c.n ? '' : guids === c.n ? 'id' : bools === c.n ? 'oui/non' : nombres === c.n ? 'nombre' : '';
    if (!c.n) return c;
    if (c.genre === 'id') { c.ids = new Set(); for (const r of corps) { const v = r[i]; if (v !== '' && v != null) c.ids.add(cleGuidSEE(v)); } return c; }
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
   valeur → clés : chaque valeur n'est vue qu'une fois. */
const estCleSEE = (f, c) => /^id$/i.test(c.nom) || (/^idequipment$/i.test(c.nom) && /^EED_(e?Cat_)?View/i.test(f.nom));
function liensSEE(F) { const cles = [], renvois = [];
  F.forEach((f, fi) => f.colonnes.forEach(c => { if (c.ids) (estCleSEE(f, c) ? cles : renvois).push({ fi, c }); }));
  const index = new Map(); cles.forEach((x, k) => x.c.ids.forEach(v => { const a = index.get(v); if (a) a.push(k); else index.set(v, [k]); }));
  return renvois.map(x => { const n = new Map(); x.c.ids.forEach(v => (index.get(v) || []).forEach(k => n.set(k, (n.get(k) || 0) + 1)));
    const parFeuille = new Map(); n.forEach((m, k) => { const fi = cles[k].fi, d = parFeuille.get(fi);
      if (!d || m > d.n || (m === d.n && /^id$/i.test(cles[k].c.nom))) parFeuille.set(fi, { fi, col: cles[k].c.nom, n: m, part: m / x.c.ids.size }); });
    const cibles = [...parFeuille.values()].sort((u, v) => v.part - u.part || v.n - u.n).slice(0, 4);
    return { fi: x.fi, col: x.c.nom, distinct: x.c.ids.size, lignes: x.c.n, taux: x.c.taux, cibles }; }); }
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
// les onglets : l'import d'abord (ce que Volta prend), puis les liens, les codes, les feuilles — l'import seul quand
// aucun classeur n'est lu dans cette séance mais qu'une base est gardée sur ce PC
const ORDRE_SEE = () => SEE.lu ? ['import', 'liens', 'codes', ...SEE.lu.feuilles.map((_, i) => i)] : ['import'];
function ficheBaseSEE() { if (!SEE.lu && !BASE_SEE.base) return; if (!SEE.lu) SEE.vue = 'import'; const deja = app.fiche && app.fiche.mode === 'see';
  ouvrirFiche({ mode: 'see', large: true }, baseSEEHtml(), baseSEEPiedHtml()); document.documentElement.style.setProperty('--fiche-l', LARGEUR_SEE);
  if (!deja) ajuster(true); lierBaseSEE(); }
function rendreBaseSEE() { if (!(app.fiche && app.fiche.mode === 'see')) return; if (!SEE.lu && !BASE_SEE.base) { fermerFiche(true); return; } if (!SEE.lu) SEE.vue = 'import';
  const c = $('fiche-corps'), p = $('fiche-pied'), y = c.scrollTop;
  c.innerHTML = baseSEEHtml(); p.innerHTML = baseSEEPiedHtml(); p.hidden = !p.innerHTML; c.scrollTop = SEE.garderDefilement ? y : 0; SEE.garderDefilement = false; lierBaseSEE(); }
const tauxSEE = t => t >= 0.995 ? '100\u00a0%' : t < 0.01 ? '<\u00a01\u00a0%' : Math.round(t * 100) + '\u00a0%';   // « (100 %) » ne se coupe pas
const exempleSEE = s => s.length > 34 ? s.slice(0, 33) + '…' : s;
const partSEE = (n, sur) => `${milliers(n)} / ${milliers(sur)} (${tauxSEE(sur ? n / sur : 0)})`;
function baseSEEHtml() { const L = SEE.lu, v = SEE.vue, I = baseMontreeSEE();
  const onglet = (cle, b, s, titre) => `<button type="button" role="tab" data-see-vue="${cle}" aria-selected="${String(v) === String(cle)}" title="${escA(titre || b)}"><b>${esc(b)}</b>${s != null ? `<span>${esc(s)}</span>` : ''}</button>`;
  const imp = onglet('import', 'Import', null, 'Ce que Volta prend de la base, et ce qui change dans ses tables');
  if (!L) return `<div class="see">${nmTitre('Base SEE · gardée sur ce PC, rien n’en sort', I.nom)}`
    + `<p class="see-mode">Volta se sert de cette base à la place de ses tables. Pour la mettre à jour, dépose le nouvel Excel de SEE (Données → Actualiser tout, puis enregistrer).</p>`
    + `<div class="see-barre"><div class="see-onglets" role="tablist" aria-label="La base">${imp}</div></div>${importSEEHtml()}</div>`;
  const nl = L.liens.filter(x => x.cibles.length).length;
  const onglets = `<div class="see-onglets" role="tablist" aria-label="Le classeur">${imp}${onglet('liens', 'Liens', String(nl), 'Ce qui se relie à quoi, d’une feuille à l’autre')}${onglet('codes', 'Codes', null, 'Les valeurs des colonnes de codes, et le plan ouvert face à SEE')}<span class="see-sep" aria-hidden="true"></span>`
    + L.feuilles.map((f, i) => onglet(i, nomCourtSEE(f.nom), milliers(f.lignes), f.nom)).join('') + '</div>';
  const corps = v === 'import' ? importSEEHtml() : v === 'liens' ? liensSEEHtml() : v === 'codes' ? codesSEEHtml() : feuilleSEEHtml(L.feuilles[v] || L.feuilles[0]);
  return `<div class="see">${nmTitre('Base SEE · lue sur ce poste, rien n’en sort', L.nom)}`
    + `<p class="see-mode">Volta a lu ton Excel ici, en entier. <b>Import</b> dit ce qu’il en prend et ce qui change dans ses tables : « Garder dans Volta » le garde sur ce PC, et rien ne sort. Les autres onglets montrent le classeur tel quel.</p>`
    + `<div class="see-barre">${onglets}${v === 'import' ? '' : `<label class="see-ex"><input type="checkbox" id="see-ex"${SEE.exemples ? ' checked' : ''}> Exemples de valeurs</label>`}</div>${corps}</div>`; }
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
  const renvoi = x => `<span class="see-c">${esc(x.col)}${x.taux < 0.995 ? ` <span class="see-t" title="${escA('rempli sur ' + milliers(x.lignes) + ' des ' + milliers(F[x.fi].lignes) + ' lignes')}">${esc(tauxSEE(x.taux))}</span>` : ''}</span>`;
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
    + '<p class="see-note">Des références, seulement le compte et les colonnes où elles se retrouvent : le retest ne s’affiche pas.</p></div>' : '<p class="see-note">Aucun plan ouvert : ouvre un retest avant de déposer la base SEE pour le confronter à SEE.</p>';
  return `<section class="see-feuille see-codes" aria-label="Codes"><div class="see-tete"><b class="see-nom">Codes</b><span class="see-compte">${esc(pluriel(codes.length, 'colonne'))} de codes · les valeurs et leur nombre de lignes</span></div>${plan}`
    + (d_abord.length ? `<div class="see-codes-l">${d_abord.map(code).join('')}</div>` : '')
    + (autres.length ? `<details class="see-vides"><summary>${autres.length} autre${autres.length > 1 ? 's' : ''} colonne${autres.length > 1 ? 's' : ''} de codes</summary><div class="see-codes-l">${autres.map(code).join('')}</div></details>` : '') + '</section>'; }
function baseSEEPiedHtml() { if (!SEE.lu) return ''; const o = ORDRE_SEE(), k = o.findIndex(x => String(x) === String(SEE.vue));
  return (o.length > 1 ? `<button class="btn papier" id="see-prec"${k > 0 ? '' : ' disabled'}>‹ Précédent</button><button class="btn cuivre" id="see-suiv"${k < o.length - 1 ? '' : ' disabled'}>Suivant ›</button>` : '')
    + `<span class="espace"></span><button class="btn lien" id="see-copier" title="Tout le résumé, en texte : à coller dans un message">Copier le résumé</button><button class="btn papier" id="see-enregistrer" title="Tout le résumé, dans un fichier texte">Enregistrer le résumé</button>`; }
function changerVueSEE(cle) { if (!SEE.lu && cle !== 'import') return; SEE.vue = cle; rendreBaseSEE();
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
  if ($('see-enregistrer')) $('see-enregistrer').onclick = () => { telecharger(new Blob(['﻿' + resumeSEE()], { type: 'text/plain;charset=utf-8' }), 'resume-base-SEE.txt'); dire('Le résumé de la base SEE est enregistré.'); }; }

/* ---- le résumé en texte : les liens, les codes, le plan face à SEE, puis chaque feuille ------------------------- */
function resumeSEE() { const L = SEE.lu; if (!L) return ''; const F = L.feuilles, P = L.plan, out = [`Base SEE — ${L.nom} — résumé par Volta le ${L.quand.toLocaleDateString('fr-FR')}${SEE.exemples ? '' : ' (sans exemples)'}`];
  const imp = resumeImportSEE(); if (imp) out.push(imp);
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
function copierResumeSEE() { const t = resumeSEE(), ok = () => dire('Résumé copié : colle-le dans un message.');
  const repli = () => { const a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select();
    let r = false; try { r = document.execCommand('copy'); } catch (_) { } a.remove(); if (r) ok(); else dire('La copie est refusée ici : « Enregistrer le résumé » le met dans un fichier.', true); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, repli); else repli(); }
