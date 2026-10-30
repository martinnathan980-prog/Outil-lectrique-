/* ===========================================================================
   08 — LE DOSSIER EN PDF : le plan devient un PDF (l'autre sens de 08-pdf)
   ---------------------------------------------------------------------------
   Le lecteur : « Il faut transformer facilement un PDF en Excel et
   inversement. » 08-pdf lit un PDF de schéma et en fait le retest ; ici le
   retest — le plan ouvert, ou des liaisons données — devient un PDF :
     · une PAGE DE GARDE : le plan, la date, ce qu'il compte (liaisons,
       folios, repères), les folios et leur page, ce qui reste à reprendre
       (le contrôle de 08-controle) ;
     · un A3 PAYSAGE PAR FOLIO, son cartouche compris : le dessin même de
       l'écran (06, `svgAutonome`) réécrit en opérateurs PDF — des traits,
       des courbes, et le texte en VRAI TEXTE dans les polices standard du
       PDF (Courier pour le dessin, Helvetica pour les pages écrites), accents
       compris (WinAnsi) : il se cherche, se copie, et 08-pdf le RELIT —
       l'aller-retour redonne toutes les liaisons (tests/pdf.js) ;
     · la NOMENCLATURE (08-nomenclature) et les MODIFICATIONS du retest
       (08-export) en fin de dossier, quand le plan en a.
   Volta l'écrit lui-même, sans bibliothèque : un écrivain de PDF de quelques
   dizaines de lignes et les chasses d'Helvetica (les métriques standard
   d'Adobe, 2 Ko) ; rien ne sort du poste. Le quadrillage fin du papier ne
   part pas (l'audit : « du bruit sur papier »).

   UN FOLIO PAS ENCORE DESSINÉ : son placement vient du cache s'il y est
   (retouché, affiné, déjà vu dans la session, ou gardé d'une session passée
   — IndexedDB, magasin des concours) ; sinon il se calcule AU LOIN, dans
   deux ou trois Workers refaits du moteur, et une barre dit honnêtement où
   l'on en est : les folios prêts sur le total, pesés par leurs liaisons (un
   gros folio est long). Ce qui se calcule ici se garde pour la suite.

   L'API — pour l'agent du grand retest, la conversion en lot :

     pdfDuPlan(liaisons, nom, options) → Promise<Uint8Array>
       liaisons   les liaisons du modèle (01, `liaison()`) : de, borneDe, vers,
                  borneVers, cable, type, pnDe, pnVers, route, plan… Le `plan`
                  (le folio : la colonne FWD du retest) range chaque liaison
                  sur sa page ; sans plan, tout tient sur un seul folio. Les
                  liaisons incomplètes (un bout vide) ne se dessinent pas.
       nom        le nom du plan : la page de garde, le titre du cartouche
                  et du document.
       options    toutes facultatives :
         cartouche   { titre, auteur, indice, date, echelle } (06) ;
         garde       false : pas de page de garde ;
         avancement  (etat) => … appelée à chaque pas : { part (0 à 1), mot,
                     prets, total } — `prets` folios placés sur `total` ;
         signal      un AbortSignal : le dossier s'arrête, la promesse est
                     rejetée (erreur de nom « AbortError ») ;
         ouvert      true : ce sont les liaisons du PLAN OUVERT — ses
                     désignations, ses barrettes à poser numérotées comme à
                     l'écran, ses retouches, son contrôle, sa nomenclature,
                     ses modifications (le menu le passe).
     Rend les octets du PDF. Pour l'enregistrer :
       telecharger(new Blob([await pdfDuPlan(L, 'H-1')], { type: 'application/pdf' }), 'H-1.pdf')
   Le geste : ⋮ → Exporter → « Le dossier en PDF (tous les folios) ».
   =========================================================================== */
'use strict';

/* ---- L'API : des liaisons → les octets du PDF (voir l'en-tête) ----------------------------------------------------- */
async function pdfDuPlan(liaisons, nom, options) { const o = options || {}, ouvert = !!o.ouvert, signal = o.signal || null;
  const verifier = () => { if (signal && signal.aborted) throw abandonPdf(); };
  const L0 = (liaisons || []).map(l => ouvert || typeof liaison !== 'function' ? l : liaison(l)).filter(liaisonComplete);
  if (!L0.length) throw new Error('aucune liaison complète : rien à dessiner');
  nom = String(nom || (ouvert && app.nom) || 'Plan');
  const folios = foliosDuDossier(L0, ouvert), total = folios.length;
  const annoncer = (part, mot, prets) => { if (o.avancement) try { o.avancement({ part: Math.max(0, Math.min(1, part)), mot, prets, total }); } catch (_) { } };
  // 1. les placements : ceux qu'on a déjà, puis les autres au loin — la part de chaque folio pesée par ses liaisons
  annoncer(0, 'Les folios déjà dessinés…', 0);
  for (const f of folios) { f.cle = clePlacement(f.L); f.P = await placementGardePdf(f.cle); verifier(); }
  const manquent = folios.filter(f => !f.P), poids = f => 4 + f.L.length, aFaire = manquent.reduce((s, f) => s + poids(f), 0), PLACER = manquent.length ? 0.85 : 0;
  let prets = total - manquent.length, fait = 0;
  if (manquent.length) { const enCours = [];
    const dire_ = () => annoncer(PLACER * fait / aFaire, `Placement des folios : ${prets} sur ${total} prêts` + (enCours.length ? ' — ' + enCours.slice(0, 3).map(f => 'folio ' + f.plan).join(', ') + ' en calcul' : ''), prets);
    dire_();
    await placerEnParallelePdf(manquent, signal, { debut: f => { enCours.push(f); dire_(); },
      fin: (f, P) => { enCours.splice(enCours.indexOf(f), 1); f.P = P; fait += poids(f); if (P) { prets++; try { garderPlacement(f.cle, P); garderConcours(f.cle, P); } catch (_) { } } dire_(); } });
    verifier(); }
  const rates = folios.filter(f => !f.P); if (rates.length) throw new Error((rates.length > 1 ? 'les folios ' : 'le folio ') + rates.map(f => f.plan).join(', ') + (rates.length > 1 ? ' ne se dessinent pas' : ' ne se dessine pas'));
  // 2. le dessin de chaque folio, en opérateurs PDF (l'écran respire entre deux folios)
  const today = new Date().toISOString().slice(0, 10), pns = new Map(), des = new Map();
  if (!ouvert) L0.forEach(l => { [[l.de, l.pnDe, l.descriptionDe], [l.vers, l.pnVers, l.descriptionVers]].forEach(([r, pn, d]) => { if (pn && !pns.has(r)) pns.set(r, pn); if (d && !des.has(r)) des.set(r, d); }); });
  const routesDe = () => { const m = new Map(); [...new Set(L0.map(l => l.route).filter(Boolean))].sort(triNaturel).forEach((r, i) => m.set(r, PALETTE_ROUTES[i % PALETTE_ROUTES.length])); return m; };
  // le calibre d'un disjoncteur au folio : le retenu, et celui du retest quand il diffère (08-export, `calibresAuFolio`)
  const ctx = ouvert ? { cartouche: app.contrat.cartouche, routes: couleursDesRoutes(), designation: designationDe, disjoncteur: n => typeof calibresAuFolio === 'function' ? calibresAuFolio(n) : { calibre: calibreAuFolio(n) } }
    : { cartouche: { titre: nom, auteur: '', indice: 'A', date: today, echelle: '—', ...(o.cartouche || {}) }, routes: routesDe(), designation: n => des.get(n) || '',
        disjoncteur: n => { const f = pns.has(n) && typeof familleDuPn === 'function' ? familleDuPn(pns.get(n), app.norme) : null; return { calibre: f && f.calibre ? f.calibre : null }; } };
  ctx.folio = f => f.plan === '*' || total < 2 ? '1 / 1' : f.plan + ' / ' + total;
  const pagesFolios = [];
  for (let i = 0; i < total; i++) { verifier(); const f = folios[i], nomF = f.plan === '*' ? '1' : f.plan;
    annoncer(PLACER + (1 - PLACER) * 0.9 * i / total, `Écriture du folio ${nomF} (${i + 1} sur ${total})…`, prets);
    const S = svgDuFolioPdf(f, ctx); pagesFolios.push({ ops: svgEnOpsPdf(S.svg, S.bb), signet: 'Folio ' + nomF }); await pausePdf(); }
  // 3. les pages écrites : la garde (elle connaît la page de chacun), les hypothèses et sources juste après elle (v73,
  // l'ingénieur, n° 9 : « le dossier ne dit pas sur quelles hypothèses il repose »), la nomenclature et les modifications à la fin
  verifier(); annoncer(PLACER + (1 - PLACER) * 0.92, 'La page de garde, la nomenclature…', prets);
  const garde = o.garde !== false, hypo = ouvert ? pagesHypothesesPdf(nom) : [], debut = (garde ? 2 : 1) + hypo.length, annexes = [];
  let suite = debut + total; const ajouter = (pages, titre, mot) => { if (!pages.length) return []; annexes.push({ titre, mot, page: suite, pages }); suite += pages.length; return pages; };
  if (ouvert) { ajouter(pagesNomenclaturePdf(nom), 'la nomenclature', 'la nomenclature'); ajouter(pagesModificationsPdf(nom), 'les modifications de l’installation', 'les modifications de l’installation'); }
  const nPages = suite - 1, ecrites = [];
  if (garde) { let problemes = null; if (ouvert && typeof controleDuContrat === 'function') { try { problemes = (typeof controleAJour === 'function' ? controleAJour() : (rendreControle(), CONTROLE.items) || []).slice(); } catch (_) { problemes = null; } }
    const modifiees = ouvert && typeof nombreDeChangements === 'function' ? nombreDeChangements() : null;
    // un seul compte de repères : celui du menu et du récapitulatif (08-nomenclature, `nombreDeReperes`)
    const nR = (f) => typeof nombreDeReperes !== 'function' ? reperesDe(f ? f.orig : L0).filter(r => !estRenvoi(r)).length : ouvert ? nombreDeReperes(f ? (f.plan === '*' ? null : f.plan) : null) : nombreDeReperes(null, f ? f.orig : L0);
    const un = k => [...new Set(L0.map(l => l[k]).filter(Boolean))], ap = un('appareil'), hs = un('harness'), rt = un('retest');
    const p = pageDeGardePdf({ nom, cart: ctx.cartouche, quand: dateLonguePdf(new Date()), pages: nPages, n: L0.length, reperes: nR(null),
      origine: [ap.length ? (ap.length > 1 ? ap.length + ' appareils' : 'Appareil ' + ap[0]) : '', hs.length ? (hs.length > 1 ? hs.length + ' harness' : 'Harness ' + hs[0]) : '', rt.length === 1 ? 'Installation du ' + rt[0] : ''].filter(Boolean).join(' · '),
      folios: folios.map((f, i) => ({ plan: f.plan === '*' ? '1' : f.plan, n: f.orig.length, reperes: nR(f), page: debut + i })),
      problemes, modifiees, hypotheses: hypo.length ? 2 : 0, annexes: annexes.map(a => ({ titre: a.titre, mot: a.mot, page: a.page })) });
    p.pied(nom, 1, nPages); ecrites.push({ ops: p.ops(), signet: 'Page de garde' }); }
  hypo.forEach((p, k) => { p.pied(nom, (garde ? 2 : 1) + k, nPages); ecrites.push({ ops: p.ops(), signet: 'Hypothèses et sources' + (hypo.length > 1 ? ' (' + (k + 1) + ')' : '') }); });
  const pages = [...ecrites, ...pagesFolios];
  annexes.forEach(a => a.pages.forEach((p, k) => { p.pied(nom, a.page + k, nPages); pages.push({ ops: p.ops(), signet: (a.titre.charAt(0).toUpperCase() + a.titre.slice(1)) + (a.pages.length > 1 ? ' (' + (k + 1) + ')' : '') }); }));
  // 4. le fichier
  annoncer(PLACER + (1 - PLACER) * 0.96, 'Assemblage du PDF…', prets);
  const octets = await ecrirePdf(pages, { titre: nom, sujet: 'Dossier de câblage : ' + motPdf(total, 'folio', 'folios') + ', ' + motPdf(L0.length, 'liaison', 'liaisons') });
  annoncer(1, 'Le dossier est prêt.', prets); DOSSIER.dernier = { folios: total, pages: nPages, liaisons: L0.length, annexes: annexes.map(a => a.titre) };
  return octets; }

/* ---- les polices : les quatre standard du PDF, en WinAnsi ------------------------------------------------------- */
// F1 Helvetica, F2 Helvetica-Bold (les pages écrites), F3 Courier, F4 Courier-Bold (le dessin : sa chasse fixe de 0,6 corps
// est celle que 06 suppose pour poser ses textes) ; la chasse d'Helvetica, codes 32 à 255, en millièmes du corps
const POLICES_PDF = ['Helvetica', 'Helvetica-Bold', 'Courier', 'Courier-Bold'];
const CHASSE_HELV = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,0,556,0,222,556,333,1000,556,556,333,1000,667,333,1000,0,611,0,0,222,222,333,333,350,556,1000,333,1000,500,333,944,0,500,500,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500];
const CHASSE_HELV_GRAS = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,0,556,0,278,556,500,1000,556,556,333,1000,667,333,1000,0,611,0,0,278,278,500,500,350,556,1000,333,1000,556,333,944,0,500,556,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556];
// WinAnsi au-delà du Latin-1 (0x80 à 0x9F) ; ce qu'il n'a pas s'écrit au plus près (le renvoi « ▷F3 » devient « ›F3 », que 09-pdf relit)
const WIN_ANSI = new Map([[0x20AC, 0x80], [0x201A, 0x82], [0x0192, 0x83], [0x201E, 0x84], [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02C6, 0x88], [0x2030, 0x89], [0x0160, 0x8A], [0x2039, 0x8B], [0x0152, 0x8C], [0x017D, 0x8E],
  [0x2018, 0x91], [0x2019, 0x92], [0x201C, 0x93], [0x201D, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97], [0x02DC, 0x98], [0x2122, 0x99], [0x0161, 0x9A], [0x203A, 0x9B], [0x0153, 0x9C], [0x017E, 0x9E], [0x0178, 0x9F]]);
const SUBSTITUTS_PDF = { '▷': '›', '▶': '›', '►': '›', '◁': '‹', '→': '->', '←': '<-', '⇒': '=>', '≥': '>=', '≤': '<=', '≈': '~', '−': '-', '‑': '-', '‐': '-', ' ': ' ', ' ': ' ', ' ': ' ', '​': '', 'Ω': 'Ohm', '✓': 'v', '·': '·' };
function enWinAnsi(s) { let o = ''; for (const ch of String(s == null ? '' : s).normalize('NFC')) { const c = ch.codePointAt(0);
    if ((c >= 0x20 && c < 0x7F) || (c >= 0xA0 && c <= 0xFF)) o += String.fromCharCode(c); else if (WIN_ANSI.has(c)) o += String.fromCharCode(WIN_ANSI.get(c));
    else if (SUBSTITUTS_PDF[ch] != null && SUBSTITUTS_PDF[ch] !== ch) o += enWinAnsi(SUBSTITUTS_PDF[ch]); else if (c === 9 || c === 10) o += ' '; else if (c > 0x20) o += '?'; }
  return o; }
const chaineLitPdf = b => '(' + b.replace(/[\\()]/g, '\\$&') + ')';
// la largeur d'un texte déjà en WinAnsi, en unités de la page : la chasse × le corps, plus l'interlettrage après chaque lettre
function largeurPdf(b, police, corps, ls) { let w = 0; if (police >= 3) w = b.length * 600; else { const t = police === 2 ? CHASSE_HELV_GRAS : CHASSE_HELV; for (let i = 0; i < b.length; i++) { const c = b.charCodeAt(i); if (c >= 32) w += t[c - 32] || 556; } }
  return w / 1000 * corps + (ls || 0) * b.length; }
// un texte trop long pour sa place : coupé, « … » au bout
function couperPdf(b, police, corps, ls, max) { if (largeurPdf(b, police, corps, ls) <= max) return b; let k = b.length;
  while (k > 1 && largeurPdf(b.slice(0, k) + '\x85', police, corps, ls) > max) k--; return b.slice(0, k).replace(/\s+$/, '') + '\x85'; }
/* v73 — UN TEXTE SUR PLUSIEURS LIGNES plutôt que coupé (l'ingénieur, n° 6 : « des textes coupés par … dans un document
   imprimé ») : les mots se rangent dans la largeur, jusqu'à `n` lignes ; un mot plus long que la place se casse ; la
   dernière ligne ne se coupe qu'au-delà (une liste de deux cents repères). Rend les lignes, en texte (pas encore WinAnsi). */
function lignesPdf(s, police, corps, ls, max, n) { const w = t => largeurPdf(enWinAnsi(t), police, corps, ls), mots = String(s == null ? '' : s).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean), L = []; let cur = '';
  const pousser = m => { while (w(m) > max && m.length > 1) { let k = m.length; while (k > 1 && w(m.slice(0, k)) > max) k--; L.push(m.slice(0, k)); m = m.slice(k); } return m; };
  mots.forEach(m => { const essai = cur ? cur + ' ' + m : m; if (w(essai) <= max) { cur = essai; return; } if (cur) L.push(cur); cur = pousser(m); });
  if (cur) L.push(cur); if (!L.length) return [''];
  if (n && L.length > n) { const reste = L.slice(n - 1).join(' '); L.length = n - 1; L.push(reste); }
  return L; }
// un nombre comme le PDF l'écrit : sans exposant, au centième (ou à la précision demandée)
const nbPdf = (v, d = 2) => { const k = Math.pow(10, d), r = Math.round((+v || 0) * k) / k; return Math.abs(r) < 1 / k ? '0' : String(r); };
const octetsPdf = s => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 255; return b; };
// un texte Unicode du document (titre, signets) : UTF-16BE, en hexadécimal
const texteUnicodePdf = s => { let h = '<FEFF'; for (const ch of String(s || '')) { const c = ch.codePointAt(0);
  const u = c > 0xFFFF ? [0xD800 + ((c - 0x10000) >> 10), 0xDC00 + ((c - 0x10000) & 0x3FF)] : [c]; u.forEach(x => { h += x.toString(16).toUpperCase().padStart(4, '0'); }); } return h + '>'; };

/* ---- l'écrivain : des pages (leurs opérateurs) → les octets du fichier --------------------------------------------- */
// A3 paysage, en points ; les flux se compriment (Flate) si le navigateur sait le faire, sinon partent tels quels
const A3_PDF = { w: 1190.55, h: 841.89 };
async function flatePdf(s) { const brut = octetsPdf(s); if (typeof CompressionStream === 'undefined') return { o: brut, f: '' };
  try { const flux = new Blob([brut]).stream().pipeThrough(new CompressionStream('deflate')); return { o: new Uint8Array(await new Response(flux).arrayBuffer()), f: ' /Filter /FlateDecode' }; }
  catch (_) { return { o: brut, f: '' }; } }
/* pages : [{ ops, signet }] ; meta : { titre, sujet }. Les objets : 1 le catalogue, 2 les pages, 3 l'info, 4 à 7 les polices,
   8 les signets, puis par page sa page, son flux, son signet. */
async function ecrirePdf(pages, meta) { const n = pages.length, pid = i => 9 + 3 * i, fid = i => 10 + 3 * i, sid = i => 11 + 3 * i, obj = [];
  const d = new Date(), z = x => String(x).padStart(2, '0'), quand = `D:${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`;
  obj[1] = '<< /Type /Catalog /Pages 2 0 R /Outlines 8 0 R /PageMode /UseOutlines /ViewerPreferences << /DisplayDocTitle true >> >>';
  obj[2] = `<< /Type /Pages /Kids [${pages.map((_, i) => pid(i) + ' 0 R').join(' ')}] /Count ${n} >>`;
  obj[3] = `<< /Title ${texteUnicodePdf(meta.titre)} /Subject ${texteUnicodePdf(meta.sujet || '')} /Creator ${texteUnicodePdf('Volta')} /Producer ${texteUnicodePdf('Volta')} /CreationDate (${quand}) >>`;
  POLICES_PDF.forEach((p, k) => { obj[4 + k] = `<< /Type /Font /Subtype /Type1 /BaseFont /${p} /Encoding /WinAnsiEncoding >>`; });
  obj[8] = `<< /Type /Outlines /First ${sid(0)} 0 R /Last ${sid(n - 1)} 0 R /Count ${n} >>`;
  const flux = await Promise.all(pages.map(p => flatePdf(p.ops)));
  pages.forEach((p, i) => { obj[pid(i)] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A3_PDF.w} ${A3_PDF.h}] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R /F4 7 0 R >> /ProcSet [/PDF /Text] >> /Contents ${fid(i)} 0 R >>`;
    obj[fid(i)] = flux[i]; obj[sid(i)] = `<< /Title ${texteUnicodePdf(p.signet)} /Parent 8 0 R${i ? ` /Prev ${sid(i - 1)} 0 R` : ''}${i < n - 1 ? ` /Next ${sid(i + 1)} 0 R` : ''} /Dest [${pid(i)} 0 R /Fit] >>`; });
  const parts = [], offs = []; let t = 0; const ecrire = x => { const b = typeof x === 'string' ? octetsPdf(x) : x; parts.push(b); t += b.length; };
  ecrire('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  for (let k = 1; k < obj.length; k++) { offs[k] = t; const o = obj[k];
    if (typeof o === 'string') ecrire(`${k} 0 obj\n${o}\nendobj\n`); else { ecrire(`${k} 0 obj\n<< /Length ${o.o.length}${o.f} >>\nstream\n`); ecrire(o.o); ecrire('\nendstream\nendobj\n'); } }
  const xref = t; ecrire(`xref\n0 ${obj.length}\n0000000000 65535 f \n` + offs.slice(1).map(o => String(o).padStart(10, '0') + ' 00000 n \n').join(''));
  ecrire(`trailer\n<< /Size ${obj.length} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(t); let p = 0; parts.forEach(b => { out.set(b, p); p += b.length; }); return out; }

/* ---- le dessin d'un folio : son SVG (06) → des opérateurs PDF -------------------------------------------------------
   Le SVG est relu (DOMParser) et parcouru : chaque élément prend son style — les attributs, puis les règles de la feuille
   de style du dessin (les sélecteurs simples : `text`, `.cab`, `.a.b` ; ceux qui ne valent qu'à l'écran, `.focus .cab`,
   ne s'appliquent pas), puis son `style` — et devient un chemin (rect, cercle, ligne, chemin avec ses arcs, en courbes de
   Bézier) ou un texte (une chaîne, sa police, son corps, son interlettrage, son ancre). Les transformations des groupes
   passent en `cm`. Un motif (le quadrillage fin) ne se peint pas. */
const ATTRS_SVG = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'font-size', 'font-weight', 'font-family', 'text-anchor', 'letter-spacing', 'opacity', 'fill-opacity', 'stroke-opacity', 'display', 'visibility'];
const HERITE_SVG = ['fill', 'stroke', 'sw', 'cap', 'join', 'dash', 'fs', 'fw', 'mono', 'anchor', 'ls', 'fo', 'so', 'vis'];
const STYLE_SVG = { fill: [0, 0, 0], stroke: null, sw: 1, cap: 0, join: 0, dash: null, fs: 16, fw: 400, mono: false, anchor: 'start', ls: 0, fo: 1, so: 1, vis: true, op: 1 };
function couleurSvg(v) { v = String(v).trim().toLowerCase(); if (!v || v === 'none' || v === 'transparent' || v.startsWith('url(')) return null; if (v === 'currentcolor') return [0, 0, 0];
  const nom = { black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff', gray: '#808080', grey: '#808080' }[v]; if (nom) v = nom;
  let m = /^#([0-9a-f]{3})$/.exec(v); if (m) return [...m[1]].map(h => parseInt(h + h, 16) / 255);
  m = /^#([0-9a-f]{6})/.exec(v); if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255);
  m = /^rgba?\(([^)]+)\)/.exec(v); if (m) return m[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3).map(x => /%$/.test(x) ? parseFloat(x) / 100 : parseFloat(x) / 255);
  return [0, 0, 0]; }
function poserStyleSvg(st, p, v) { v = String(v).replace(/\s*!important\s*$/, '').trim();
  switch (p) {
    case 'fill': st.fill = couleurSvg(v); break; case 'stroke': st.stroke = couleurSvg(v); break; case 'stroke-width': st.sw = parseFloat(v) || 0; break;
    case 'stroke-linecap': st.cap = { butt: 0, round: 1, square: 2 }[v] || 0; break; case 'stroke-linejoin': st.join = { miter: 0, round: 1, bevel: 2 }[v] || 0; break;
    case 'stroke-dasharray': { const d = v === 'none' ? [] : v.split(/[\s,]+/).map(parseFloat).filter(x => x >= 0); st.dash = d.some(x => x > 0) ? d : null; break; }
    case 'font-size': st.fs = parseFloat(v) || st.fs; break; case 'font-weight': st.fw = v === 'bold' ? 700 : v === 'normal' ? 400 : parseFloat(v) || 400; break;
    case 'font-family': st.mono = /mono|courier|consolas|menlo/i.test(v); break; case 'text-anchor': st.anchor = v; break; case 'letter-spacing': st.ls = parseFloat(v) || 0; break;
    case 'fill-opacity': st.fo = parseFloat(v); break; case 'stroke-opacity': st.so = parseFloat(v); break; case 'opacity': st.op *= parseFloat(v); break;
    case 'display': if (v === 'none') st.cache = true; break; case 'visibility': st.vis = v !== 'hidden' && v !== 'collapse'; break; } }
const declarationsCss = t => String(t || '').split(';').map(d => { const k = d.indexOf(':'); return k < 0 ? null : [d.slice(0, k).trim().toLowerCase(), d.slice(k + 1).trim()]; }).filter(x => x && x[0]);
// les règles de la feuille de style, rangées par spécificité puis par ordre ; un sélecteur composé (descendant, :hover…) ne vaut pas sur le papier
function reglesCss(css) { const R = []; let ordre = 0;
  String(css).replace(/\/\*[\s\S]*?\*\//g, '').replace(/([^{}]+)\{([^{}]*)\}/g, (_, sel, corps) => { const decl = declarationsCss(corps);
    sel.split(',').map(x => x.trim()).forEach(x => { const m = /^([a-zA-Z]*)((?:\.[\w-]+)*)$/.exec(x); if (!m || !x) return; const classes = m[2] ? m[2].slice(1).split('.') : [];
      R.push({ tag: m[1], classes, spec: classes.length * 10 + (m[1] ? 1 : 0), ordre: ordre++, decl }); }); return ''; });
  return R.sort((a, b) => a.spec - b.spec || a.ordre - b.ordre); }
function styleSvg(el, parent, regles) { const st = { op: parent.op, cache: false }; HERITE_SVG.forEach(k => { st[k] = parent[k]; });
  ATTRS_SVG.forEach(a => { if (el.hasAttribute(a)) poserStyleSvg(st, a, el.getAttribute(a)); });
  const cls = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean), tag = el.localName;
  regles.forEach(r => { if ((!r.tag || r.tag === tag) && r.classes.every(c => cls.includes(c))) r.decl.forEach(([p, v]) => poserStyleSvg(st, p, v)); });
  declarationsCss(el.getAttribute('style')).forEach(([p, v]) => poserStyleSvg(st, p, v)); return st; }
const produitMat = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
function matriceSvg(t) { let M = [1, 0, 0, 1, 0, 0]; const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g; let m;
  while ((m = re.exec(t || ''))) { const a = m[2].split(/[\s,]+/).filter(Boolean).map(parseFloat); let N = null;
    if (m[1] === 'matrix' && a.length >= 6) N = a.slice(0, 6); else if (m[1] === 'translate') N = [1, 0, 0, 1, a[0] || 0, a[1] || 0];
    else if (m[1] === 'scale') N = [a[0], 0, 0, a.length > 1 ? a[1] : a[0], 0, 0];
    else if (m[1] === 'rotate') { const r = (a[0] || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r), cx = a[1] || 0, cy = a[2] || 0; N = [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy]; }
    else if (m[1] === 'skewX') N = [1, 0, Math.tan(a[0] * Math.PI / 180), 1, 0, 0]; else if (m[1] === 'skewY') N = [1, Math.tan(a[0] * Math.PI / 180), 0, 1, 0, 0];
    if (N && N.every(isFinite)) M = produitMat(M, N); }
  return M; }
// un arc elliptique (SVG) en courbes de Bézier, un quart de tour au plus chacune (la paramétrisation par le centre, SVG F.6.5)
function arcEnBeziers(x1, y1, rx, ry, phi, fa, fs, x2, y2) { if (!rx || !ry) return [['l', x2, y2]];
  const sp = Math.sin(phi), cp = Math.cos(phi), dx = (x1 - x2) / 2, dy = (y1 - y2) / 2, xp = cp * dx + sp * dy, yp = -sp * dx + cp * dy;
  rx = Math.abs(rx); ry = Math.abs(ry); const lam = xp * xp / (rx * rx) + yp * yp / (ry * ry); if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp, den = rx * rx * yp * yp + ry * ry * xp * xp;
  let co = den ? Math.sqrt(Math.max(0, num / den)) : 0; if (fa === fs) co = -co;
  const cxp = co * rx * yp / ry, cyp = -co * ry * xp / rx, cx = cp * cxp - sp * cyp + (x1 + x2) / 2, cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  const t1 = ang(1, 0, (xp - cxp) / rx, (yp - cyp) / ry); let dt = ang((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(1, Math.ceil(Math.abs(dt) / (Math.PI / 2) - 1e-9)), d = dt / n, k = 4 / 3 * Math.tan(d / 4), out = [];
  const P = (u, v) => [cx + rx * cp * u - ry * sp * v, cy + rx * sp * u + ry * cp * v];
  for (let j = 0; j < n; j++) { const a1 = t1 + j * d, a2 = a1 + d, c1 = Math.cos(a1), s1 = Math.sin(a1), c2 = Math.cos(a2), s2 = Math.sin(a2);
    out.push(['c', ...P(c1 - k * s1, s1 + k * c1), ...P(c2 + k * s2, s2 - k * c2), ...(j === n - 1 ? [x2, y2] : P(c2, s2))]); }
  return out; }
// l'attribut `d` d'un chemin → [['m', x, y], ['l', x, y], ['c', x1, y1, x2, y2, x, y], ['h']] en coordonnées absolues
function cheminSvgEnOps(d) { const T = String(d || '').match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [], out = [];
  let i = 0, cmd = '', x = 0, y = 0, x0 = 0, y0 = 0, c2 = null, q1 = null, prec = '';
  const nb = () => { const v = parseFloat(T[i++]); if (!isFinite(v)) throw new Error('chemin'); return v; };
  try { while (i < T.length) { if (/^[A-Za-z]$/.test(T[i])) cmd = T[i++]; else if (!cmd) { i++; continue; }
      const rel = cmd !== cmd.toUpperCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
      if (C === 'Z') { out.push(['h']); x = x0; y = y0; c2 = q1 = null; prec = 'Z'; if (i < T.length && !/^[A-Za-z]$/.test(T[i])) cmd = ''; continue; }
      if (C === 'M') { x = x0 = nb() + ox; y = y0 = nb() + oy; out.push(['m', x, y]); cmd = rel ? 'l' : 'L'; c2 = q1 = null; prec = 'M'; continue; }
      if (C === 'L') { x = nb() + ox; y = nb() + oy; out.push(['l', x, y]); }
      else if (C === 'H') { x = nb() + ox; out.push(['l', x, y]); }
      else if (C === 'V') { y = nb() + (rel ? y : 0); out.push(['l', x, y]); }
      else if (C === 'C' || C === 'S') { const a = C === 'C' ? [nb() + ox, nb() + oy] : (c2 && /[CS]/.test(prec) ? [2 * x - c2[0], 2 * y - c2[1]] : [x, y]);
        const b = [nb() + ox, nb() + oy], e = [nb() + ox, nb() + oy]; out.push(['c', ...a, ...b, ...e]); c2 = b; x = e[0]; y = e[1]; prec = C; q1 = null; continue; }
      else if (C === 'Q' || C === 'T') { const q = C === 'Q' ? [nb() + ox, nb() + oy] : (q1 && /[QT]/.test(prec) ? [2 * x - q1[0], 2 * y - q1[1]] : [x, y]), e = [nb() + ox, nb() + oy];
        out.push(['c', x + 2 / 3 * (q[0] - x), y + 2 / 3 * (q[1] - y), e[0] + 2 / 3 * (q[0] - e[0]), e[1] + 2 / 3 * (q[1] - e[1]), e[0], e[1]]); q1 = q; x = e[0]; y = e[1]; prec = C; c2 = null; continue; }
      else if (C === 'A') { const rx = nb(), ry = nb(), rot = nb() * Math.PI / 180, fa = nb() ? 1 : 0, fs = nb() ? 1 : 0, ex = nb() + ox, ey = nb() + oy;
        out.push(...arcEnBeziers(x, y, rx, ry, rot, fa, fs, ex, ey)); x = ex; y = ey; }
      c2 = q1 = null; prec = C; } } catch (_) { }
  return out; }
// un cercle, une ellipse en quatre Bézier ; un rectangle aux coins arrondis
const KAPPA = 0.5522847498;
const ellipseOps = (cx, cy, rx, ry) => [['m', cx + rx, cy], ['c', cx + rx, cy + KAPPA * ry, cx + KAPPA * rx, cy + ry, cx, cy + ry], ['c', cx - KAPPA * rx, cy + ry, cx - rx, cy + KAPPA * ry, cx - rx, cy],
  ['c', cx - rx, cy - KAPPA * ry, cx - KAPPA * rx, cy - ry, cx, cy - ry], ['c', cx + KAPPA * rx, cy - ry, cx + rx, cy - KAPPA * ry, cx + rx, cy], ['h']];
function rectOps(x, y, w, h, rx, ry) { if (!(rx > 0 || ry > 0)) return [['re', x, y, w, h]]; rx = Math.min(w / 2, rx || ry); ry = Math.min(h / 2, ry || rx); const kx = KAPPA * rx, ky = KAPPA * ry;
  return [['m', x + rx, y], ['l', x + w - rx, y], ['c', x + w - rx + kx, y, x + w, y + ry - ky, x + w, y + ry], ['l', x + w, y + h - ry], ['c', x + w, y + h - ry + ky, x + w - rx + kx, y + h, x + w - rx, y + h],
    ['l', x + rx, y + h], ['c', x + rx - kx, y + h, x, y + h - ry + ky, x, y + h - ry], ['l', x, y + ry], ['c', x, y + ry - ky, x + rx - kx, y, x + rx, y], ['h']]; }
const opsEnTexte = ops => ops.map(o => o[0] === 'h' ? 'h' : o[0] === 're' ? `${nbPdf(o[1])} ${nbPdf(o[2])} ${nbPdf(o[3])} ${nbPdf(o[4])} re` : o.slice(1).map(v => nbPdf(v)).join(' ') + ' ' + o[0]).join('\n');
/* Un SVG de folio (svgAutonome) → les opérateurs de sa page A3 : la feuille (bb, en unités du dessin) posée sur la page à
   5 mm du bord (une imprimante ne va pas jusqu'au bord), le y retourné une fois pour toutes (les textes se redressent
   par leur matrice). L'état graphique ne s'écrit que quand il change. */
function svgEnOpsPdf(svgTexte, bb) { const doc = new DOMParser().parseFromString(svgTexte, 'image/svg+xml'), racine = doc.documentElement;
  if (!racine || racine.localName !== 'svg' || doc.getElementsByTagName('parsererror').length) throw new Error('le dessin du folio ne se relit pas');
  const regles = reglesCss([...doc.getElementsByTagName('style')].map(s => s.textContent).join('\n'));
  const m = 14, s = Math.min((A3_PDF.w - 2 * m) / bb.w, (A3_PDF.h - 2 * m) / bb.h), ox = (A3_PDF.w - s * bb.w) / 2, oy = (A3_PDF.h - s * bb.h) / 2;
  const out = ['q', `${nbPdf(s, 6)} 0 0 ${nbPdf(-s, 6)} ${nbPdf(ox - s * bb.x, 4)} ${nbPdf(A3_PDF.h - oy + s * bb.y, 4)} cm`];
  // l'état écrit (la pile suit q/Q) : on n'écrit une couleur, une épaisseur, des tirets que s'ils changent
  let E = {}; const pile = [], poser = (k, v, op) => { if (E[k] !== v) { E[k] = v; out.push(op); } };
  const coul = c => c.map(v => nbPdf(v, 3)).join(' ');
  const peindre = (ops, st, ferme) => { const plein = ferme && st.fill && st.fo > 0.02 && st.op > 0.02, trait = st.stroke && st.so > 0.02 && st.op > 0.02 && st.sw > 0; if (!(plein || trait) || !ops.length) return;
    if (plein) poser('rg', coul(st.fill), coul(st.fill) + ' rg');
    if (trait) { poser('RG', coul(st.stroke), coul(st.stroke) + ' RG'); poser('w', nbPdf(st.sw, 3), nbPdf(st.sw, 3) + ' w'); poser('J', st.cap, st.cap + ' J'); poser('j', st.join, st.join + ' j');
      const d = st.dash ? `[${st.dash.map(v => nbPdf(v)).join(' ')}] 0 d` : '[] 0 d'; poser('d', d, d); }
    out.push(opsEnTexte(ops), plein && trait ? 'B' : plein ? 'f' : 'S'); };
  const num = (el, a) => { const v = parseFloat(String(el.getAttribute(a) || '0').split(/[\s,]+/)[0]); return isFinite(v) ? v : 0; };
  const parcourir = (el, parent) => { const tag = el.localName; if (['defs', 'style', 'pattern', 'title', 'desc', 'metadata', 'clipPath', 'mask', 'symbol'].includes(tag)) return;
    const st = styleSvg(el, parent, regles); if (st.cache || st.op <= 0.02) return;
    const tr = el.getAttribute('transform'); if (tr) { out.push('q', matriceSvg(tr).map(v => nbPdf(v, 4)).join(' ') + ' cm'); pile.push(E); E = { ...E }; }
    if (st.vis) {
      if (tag === 'rect') { const w = num(el, 'width'), h = num(el, 'height'); if (w > 0 && h > 0) peindre(rectOps(num(el, 'x'), num(el, 'y'), w, h, num(el, 'rx'), num(el, 'ry')), st, true); }
      else if (tag === 'circle') { const r = num(el, 'r'); if (r > 0) peindre(ellipseOps(num(el, 'cx'), num(el, 'cy'), r, r), st, true); }
      else if (tag === 'ellipse') { const rx = num(el, 'rx'), ry = num(el, 'ry'); if (rx > 0 && ry > 0) peindre(ellipseOps(num(el, 'cx'), num(el, 'cy'), rx, ry), st, true); }
      else if (tag === 'line') peindre([['m', num(el, 'x1'), num(el, 'y1')], ['l', num(el, 'x2'), num(el, 'y2')]], st, false);
      else if (tag === 'polyline' || tag === 'polygon') { const v = String(el.getAttribute('points') || '').trim().split(/[\s,]+/).map(parseFloat).filter(isFinite), ops = [];
        for (let k = 0; k + 1 < v.length; k += 2) ops.push([k ? 'l' : 'm', v[k], v[k + 1]]); if (tag === 'polygon' && ops.length) ops.push(['h']); peindre(ops, st, true); }
      else if (tag === 'path') peindre(cheminSvgEnOps(el.getAttribute('d')), st, true);
      // un texte, sans son interlettrage : espacées, les lettres se liraient « 3 0 0 X C 1 » (la recherche d'un lecteur de
      // PDF ne trouverait plus le repère) ; serré d'autant, il garde son ancre — le milieu, le début ou la fin
      else if (tag === 'text') { const b = enWinAnsi(el.textContent.replace(/\s+/g, ' ').trim()); if (b && st.fill && st.fo > 0.02) {
        const police = (st.mono ? 3 : 1) + (st.fw >= 600 ? 1 : 0), w = largeurPdf(b, police, st.fs, 0), x = num(el, 'x') - (st.anchor === 'middle' ? w / 2 : st.anchor === 'end' ? w : 0);
        poser('rg', coul(st.fill), coul(st.fill) + ' rg');
        out.push(`BT /F${police} ${nbPdf(st.fs, 3)} Tf 1 0 0 -1 ${nbPdf(x)} ${nbPdf(num(el, 'y'))} Tm ${chaineLitPdf(b)} Tj ET`); } } }
    if (tag === 'svg' || tag === 'g' || tag === 'a') for (const k of el.children) parcourir(k, st);
    if (tr) { out.push('Q'); E = pile.pop(); } };
  for (const k of racine.children) parcourir(k, { ...STYLE_SVG, op: 1 });
  out.push('Q'); return out.join('\n'); }

/* ---- les pages écrites : la garde, la nomenclature, les modifications (Helvetica, sur le même A3) ------------------
   Des textes et des aplats clairs, aucun trait : une page écrite ne se lit pas comme un schéma (09-pdf ignore les
   aplats clairs, et sans trait il n'y a ni liaison ni bout orphelin). Les mots de l'atelier : « câble », « repère ». */
const ENCRE_PDF = [0.043, 0.067, 0.094], GRIS_PDF = [0.49, 0.533, 0.576], GRIS2_PDF = [0.227, 0.275, 0.325], BANDE_PDF = [0.945, 0.953, 0.961], ZEBRE_PDF = [0.973, 0.976, 0.98],
  KO_PDF = [0.765, 0.153, 0.122], ATT_PDF = [0.66, 0.4, 0.0];
const MARGE_PDF = 56, BAS_PDF = A3_PDF.h - 60;
function pageEcrite() { const ops = [], H = A3_PDF.h; let rg = '', tc = '';
  const couleur = c => { const k = c.map(v => nbPdf(v, 3)).join(' '); if (k !== rg) { rg = k; ops.push(k + ' rg'); } };
  const P = {
    // un texte, sa ligne de base à `y` depuis le haut de la page ; rend sa largeur
    texte(x, y, s, o = {}) { const police = (o.mono ? 3 : 1) + (o.gras ? 1 : 0), t = o.corps || 10, ls = o.ls || 0; let b = enWinAnsi(s); if (o.max) b = couperPdf(b, police, t, ls, o.max); if (!b) return 0;
      const w = largeurPdf(b, police, t, ls), X = o.ancre === 'end' ? x - w : o.ancre === 'middle' ? x - w / 2 : x; couleur(o.couleur || ENCRE_PDF);
      const k = nbPdf(ls, 3); if (k !== tc) { tc = k; ops.push(k + ' Tc'); }
      ops.push(`BT /F${police} ${nbPdf(t)} Tf 1 0 0 1 ${nbPdf(X)} ${nbPdf(H - y)} Tm ${chaineLitPdf(b)} Tj ET`); return w; },
    largeur: (s, o = {}) => largeurPdf(enWinAnsi(s), (o.mono ? 3 : 1) + (o.gras ? 1 : 0), o.corps || 10, o.ls || 0),
    // un texte sur plusieurs lignes (jamais coupé avant `o.lignes`) : rend le nombre de lignes posées
    bloc(x, y, s, o = {}) { const L = lignesPdf(s, (o.mono ? 3 : 1) + (o.gras ? 1 : 0), o.corps || 10, o.ls || 0, o.max || 1e9, o.lignes || 0), h = o.interligne || (o.corps || 10) * 1.3;
      L.forEach((t, k) => P.texte(x, y + k * h, t, { ...o, max: k === L.length - 1 ? o.max : undefined })); return L.length; },
    // un aplat clair, son coin haut-gauche à (x, y)
    bande(x, y, w, h, c) { couleur(c || BANDE_PDF); ops.push(`${nbPdf(x)} ${nbPdf(H - y - h)} ${nbPdf(w)} ${nbPdf(h)} re f`); },
    // le pied : le plan à gauche, la page à droite
    pied(nom, i, n) { P.texte(MARGE_PDF, H - 28, 'Volta · ' + nom, { corps: 8, couleur: GRIS_PDF, max: 600 }); P.texte(A3_PDF.w - MARGE_PDF, H - 28, `page ${i} / ${n}`, { corps: 8, couleur: GRIS_PDF, ancre: 'end' }); },
    ops: () => ops.join('\n') };
  return P; }
const dateLonguePdf = d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const motPdf = (n, un, des) => n + ' ' + (n > 1 ? des : un);
/* LA PAGE DE GARDE : le plan, ce qu'il compte, ses folios et leur page ; ce qui reste à reprendre (le contrôle : les
   problèmes, puis les points à voir, rangés par genre, leurs repères dessous) ; sans contrôle (l'API sur des liaisons
   qui ne sont pas le plan ouvert), les folios prennent toute la largeur. */
function pageDeGardePdf(D) { const p = pageEcrite(), X = MARGE_PDF, W = A3_PDF.w - 2 * X;
  p.texte(X, 66, 'VOLTA · DOSSIER DE CÂBLAGE', { corps: 9, gras: true, ls: 0.6, couleur: GRIS_PDF });
  p.texte(X, 112, D.nom, { corps: 34, gras: true, max: W });
  // dessous : le cartouche, puis d'où vient le plan (l'appareil, le harness, la date du retest — l'ingénieur, § 3.7) ; une
  // ligne de trop passe à la suivante, tout ce qui est dessous descend d'autant (rien ne se coupe)
  const c = D.cart || {}, sous = [c.titre, c.indice ? 'indice ' + c.indice : '', c.auteur ? 'dessiné par ' + c.auteur : '', D.origine || ''].filter(Boolean).join(' · ');
  let yt = 140; if (sous) yt += 18 * p.bloc(X, yt, sous, { corps: 14, couleur: GRIS2_PDF, max: W, lignes: 2, interligne: 18 }) - 18;
  yt += 24; yt += 15 * p.bloc(X, yt, `Exporté le ${D.quand} · ${motPdf(D.pages, 'page', 'pages')} : cette garde${D.hypotheses ? ', les hypothèses et sources (p. ' + D.hypotheses + ')' : ''}, ${D.folios.length > 1 ? 'les ' + D.folios.length + ' folios' : 'le folio'} en A3 paysage` + (D.annexes.length ? ', ' + D.annexes.map(a => a.mot).join(', ') : ''), { corps: 11, couleur: GRIS_PDF, max: W, lignes: 2, interligne: 15 }) - 15;
  // les chiffres, des tuiles sur un aplat clair (les problèmes et ce qui est à voir : le compte unique du contrôle)
  const nko = D.problemes ? D.problemes.filter(x => x.niveau === 'ko').length : 0, natt = D.problemes ? D.problemes.length - nko : 0, yT = Math.max(192, yt + 28);
  const tuiles = [[D.n, 'liaison', 'liaisons'], [D.folios.length, 'folio', 'folios'], [D.reperes, 'repère', 'repères']];
  if (D.problemes) tuiles.push([nko, 'problème', 'problèmes', nko ? KO_PDF : null], [natt, 'point à voir', 'points à voir', natt ? ATT_PDF : null]);
  if (D.modifiees != null) tuiles.push([D.modifiees, 'liaison modifiée', 'liaisons modifiées']);
  const tw = W / tuiles.length; tuiles.forEach(([n, un, des, coul], i) => { const x = X + i * tw; p.bande(x, yT, tw - 12, 76);
    p.texte(x + 18, yT + 46, String(n), { corps: 30, gras: true, couleur: coul || ENCRE_PDF }); p.texte(x + 18, yT + 65, n > 1 ? des : un, { corps: 10, couleur: GRIS2_PDF, max: tw - 40 }); });
  // les folios : leur page dans le dossier (une, deux… colonnes)
  const y0 = yT + 124, haut = BAS_PDF - 30 - y0, larg = D.problemes ? 520 : W, ligne = 17, parCol = Math.floor(haut / ligne);
  p.texte(X, y0, 'Les folios', { corps: 14, gras: true });
  const ncol = Math.min(D.problemes ? 2 : 4, Math.max(1, Math.ceil(D.folios.length / parCol))), cw = larg / ncol, tient = ncol * parCol;
  D.folios.slice(0, D.folios.length > tient ? tient - 1 : tient).forEach((f, i) => { const x = X + Math.floor(i / parCol) * cw, y = y0 + 26 + (i % parCol) * ligne;
    if (i % 2 === 0) p.bande(x - 6, y - 12, cw - 10, ligne, ZEBRE_PDF);
    p.texte(x, y, 'Folio ' + f.plan, { corps: 10, gras: true, max: cw * 0.42 }); p.texte(x + cw * 0.44, y, motPdf(f.n, 'liaison', 'liaisons') + ' · ' + motPdf(f.reperes, 'repère', 'repères'), { corps: 9, couleur: GRIS2_PDF, max: cw * 0.4 });
    p.texte(x + cw - 18, y, 'p. ' + f.page, { corps: 9, couleur: GRIS_PDF, ancre: 'end' }); });
  if (D.folios.length > tient) { const reste = D.folios.slice(tient - 1); p.texte(X + (ncol - 1) * cw, y0 + 26 + (parCol - 1) * ligne, `… et ${reste.length} autres folios, pages ${reste[0].page} à ${reste[reste.length - 1].page}`, { corps: 9, couleur: GRIS_PDF, max: cw - 20 }); }
  if (D.annexes.length) p.texte(X, BAS_PDF - 6, 'En fin de dossier : ' + D.annexes.map(a => a.titre + ' (p. ' + a.page + ')').join(', ') + '.', { corps: 9, couleur: GRIS_PDF, max: larg });
  // ce qui reste à reprendre
  if (D.problemes) { const xr = X + 600, wr = W - 600; let y = y0; p.texte(xr, y, 'Ce qui reste à reprendre', { corps: 14, gras: true }); y += 26;
    if (!D.problemes.length) p.texte(xr, y, 'Rien : aucun problème, aucun point à voir.', { corps: 11, couleur: GRIS2_PDF });
    const libelle = new Map(GENRES_CONTROLE); let coupe = false;
    [['ko', 'Problèmes', KO_PDF], ['att', 'À voir', ATT_PDF]].forEach(([niv, titre, coul]) => { const xs = D.problemes.filter(x => x.niveau === niv); if (!xs.length || coupe) return;
      if (y + 40 > BAS_PDF) { coupe = true; return; }
      p.texte(xr, y, titre + ' · ' + xs.length, { corps: 11, gras: true, couleur: coul }); y += 18;
      GENRES_CONTROLE.map(g => g[0]).forEach(g => { const ys = xs.filter(x => x.genre === g); if (!ys.length || coupe) return; if (y + 30 > BAS_PDF) { coupe = true; return; }
        const t = libelle.get(g) || 'autres points'; p.texte(xr, y, '•', { corps: 11, gras: true, couleur: coul }); p.texte(xr + 12, y, t.charAt(0).toUpperCase() + t.slice(1), { corps: 10, gras: true, max: wr - 60 });
        p.texte(xr + wr, y, String(ys.length), { corps: 10, gras: true, ancre: 'end' }); y += 13;
        // un ou deux points : chacun dit ce qu'il est (son repère, sa phrase) ; davantage : leurs repères à la suite
        const noms = [...new Set(ys.map(x => x.nom).filter(Boolean))];
        const dits = ys.length <= 2 ? ys.map(x => (x.nom ? x.nom + ' — ' : '') + x.texte) : [noms.length ? noms.slice(0, 14).join(', ') + (noms.length > 14 ? ` (+${noms.length - 14})` : '') : ys[0].texte];
        // chaque point sur deux lignes au plus (plus de « … » au milieu d'une phrase)
        dits.forEach(dit => { if (y + 12 > BAS_PDF) return; y += 12 * p.bloc(xr + 12, y, dit, { corps: 9, couleur: GRIS2_PDF, max: wr - 12, lignes: 2, interligne: 12 }); }); y += 6; });
      y += 8; });
    if (coupe) p.texte(xr, BAS_PDF - 6, '… la suite dans l’index des repères de Volta (R).', { corps: 9, couleur: GRIS_PDF }); }
  return p; }
/* DES TABLES sur des pages A3 : un titre, une ligne qui résume, puis chaque section — son titre, ses en-têtes sur un
   aplat, ses lignes (une sur deux légèrement teintée) ; une section qui ne tient pas continue page suivante, ses
   en-têtes répétés. `colonnes` : [titre, part de la largeur, { droite, mono, gris }]. v73 (l'ingénieur, n° 6) : une case
   trop longue passe sur deux ou trois lignes (la ligne grandit), jamais « … » au milieu ; une colonne que les lignes de
   sa section ne remplissent pas ne s'écrit pas (sa largeur va aux autres). `o.deux` : deux colonnes de sections par page
   (la page des hypothèses tient sur une page). */
function pagesDeTablesPdf(titre, resume, sections, o) { o = o || {}; const pages = [], X0 = MARGE_PDF, W0 = A3_PDF.w - 2 * X0, G = 40, nCol = o.deux ? 2 : 1, WC = (W0 - (nCol - 1) * G) / nCol;
  let p = null, y = 0, col = 0, haut = 0, X = X0, W = WC;
  const nouvelle = suite => { p = pageEcrite(); pages.push(p); p.texte(X0, 70, titre + (suite ? ' (suite)' : ''), { corps: 22, gras: true, max: W0 });
    haut = suite ? 100 : 124; if (!suite && resume) haut = 94 + 13 * p.bloc(X0, 94, resume, { corps: 10, couleur: GRIS2_PDF, max: W0, lignes: 3, interligne: 13 }) + 17; col = 0; X = X0; y = haut; };
  // la place manque : la colonne suivante de la même page, sinon une page neuve
  const plusDePlace = () => { if (col + 1 < nCol) { col++; X = X0 + col * (WC + G); y = haut; } else nouvelle(true); };
  const MAXL = 8, LH = 11;
  nouvelle(false);
  sections.filter(S => S.lignes.length).forEach(S => {
    // les colonnes qui ont quelque chose à dire, leur largeur rendue aux autres
    const garde = S.colonnes.map((c, k) => S.lignes.some(L => L[k] != null && String(L[k]).trim() !== '' && String(L[k]).trim() !== '—')), parts = S.colonnes.filter((_, k) => garde[k]), tot = parts.reduce((s, c) => s + c[1], 0);
    const cols = S.colonnes.map((c, k) => garde[k] ? [c[0], c[1] / tot, c[2] || {}, k] : null).filter(Boolean);
    const entetes = () => { p.bande(X, y, W, 19); let x = X; cols.forEach(([t, part, oc]) => { const cw = part * W; p.texte(oc.droite ? x + cw - 8 : x + 8, y + 13, t, { corps: 8.5, gras: true, couleur: GRIS2_PDF, ancre: oc.droite ? 'end' : undefined, max: cw - 16 }); x += cw; }); y += 19; };
    const cases = L => cols.map(([, part, oc, k]) => { const v = L[k] == null ? '' : String(L[k]); return oc.droite ? [v] : lignesPdf(v, (oc.mono ? 3 : 1), 9, 0, part * W - 16, MAXL); });
    const hauteur = cs => 15 + LH * (Math.max(1, ...cs.map(c => c.length)) - 1);
    const premieres = S.lignes.slice(0, 3).reduce((s, L) => s + hauteur(cases(L)), 0);
    if (y + 26 + 19 + premieres > BAS_PDF) plusDePlace();
    p.texte(X, y + 16, S.titre, { corps: 13, gras: true }); if (S.compte) p.texte(X + p.largeur(S.titre, { corps: 13, gras: true }) + 10, y + 16, S.compte, { corps: 10, couleur: GRIS_PDF, max: W - p.largeur(S.titre, { corps: 13, gras: true }) - 10 }); y += 26; entetes();
    S.lignes.forEach((L, i) => { const cs = cases(L), h = hauteur(cs);
      if (y + h > BAS_PDF) { plusDePlace(); p.texte(X, y + 16, S.titre + ' (suite)', { corps: 13, gras: true }); y += 26; entetes(); }
      if (i % 2) p.bande(X, y, W, h, ZEBRE_PDF); let x = X;
      cols.forEach(([, part, oc], j) => { const cw = part * W; cs[j].forEach((t, k) => p.texte(oc.droite ? x + cw - 8 : x + 8, y + 11 + k * LH, t, { corps: 9, mono: !!oc.mono, ancre: oc.droite ? 'end' : undefined, max: cw - 16, couleur: oc.gris ? GRIS2_PDF : oc.couleur || ENCRE_PDF })); x += cw; });
      y += h; });
    y += 22; });
  return pages; }
// la nomenclature du plan ouvert (08-nomenclature), en tables ; rien s'il n'y a rien à commander
function pagesNomenclaturePdf(nom) { let N; try { N = nomenclatureDuContrat(); } catch (_) { return []; }
  const somme = xs => xs.reduce((s, x) => s + x.n, 0), ou = xs => xs.join(', ');
  const sections = [
    { titre: 'Contacts à sertir', compte: motPdf(somme(N.contacts), 'pièce', 'pièces'), colonnes: [['Contact', 0.2, { mono: true }], ['Fourreau', 0.16, { mono: true }], ['Qté', 0.07, { droite: true }], ['Où', 0.57, { gris: true }]],
      lignes: N.contacts.map(x => [x.reference + (x.confiance === 'à confirmer' ? ' (à confirmer)' : ''), x.accessoire || '—', x.n, ou(x.ou)]) },
    { titre: 'Modules de jonction', compte: motPdf(somme(N.modules), 'pièce', 'pièces'), colonnes: [['Module', 0.2, { mono: true }], ['Norme', 0.16], ['Qté', 0.07, { droite: true }], ['Barrettes', 0.57, { gris: true }]],
      lignes: N.modules.map(x => [x.reference, x.famille || '', x.n, ou(x.ou)]) },
    { titre: 'Connecteurs et prises', compte: motPdf(somme(N.connecteurs), 'pièce', 'pièces'), colonnes: [['Part number', 0.2, { mono: true }], ['Nature', 0.3], ['Qté', 0.07, { droite: true }], ['Repères', 0.43, { gris: true }]],
      lignes: N.connecteurs.map(x => [x.reference, x.nature || '', x.n, ou(x.ou)]) },
    { titre: 'Disjoncteurs', compte: motPdf((N.disjoncteurs || []).length, 'pièce', 'pièces'), colonnes: [['Repère', 0.12, { mono: true }], ['Part number à commander', 0.22, { mono: true }], ['Calibre', 0.1, { droite: true }], ['Installation', 0.2, { mono: true, gris: true }], ['État', 0.36]],
      lignes: (N.disjoncteurs || []).map(x => [x.repere, x.reference + (x.construit ? ' (construit, à vérifier au catalogue)' : ''), x.calibre ? nombre(x.calibre) + ' A' : '—', x.retest ? x.pnRetest + ' (' + nombre(x.retest) + ' A)' : '', x.etat]) },
    { titre: 'Autour des connecteurs', compte: motPdf(somme(N.habits), 'article', 'articles'), colonnes: [['Quoi', 0.2], ['Référence', 0.3, { mono: true }], ['Qté', 0.07, { droite: true }], ['Où', 0.43, { gris: true }]],
      lignes: N.habits.map(x => [x.quoi, x.reference + (x.note ? ' · ' + x.note : ''), x.n, ou(x.ou)]) },
    { titre: 'Câbles', compte: motPdf(N.cables.length, 'type', 'types') + ' · ' + nombre(Math.round(N.longueur)) + ' m', colonnes: [['Type', 0.2, { mono: true }], ['Câbles', 0.1, { droite: true }], ['Longueur', 0.12, { droite: true }], ['Masse', 0.12, { droite: true }], ['Base', 0.46, { gris: true }]],
      lignes: N.cables.map(x => [x.reference, x.n, (x.reelles < x.n ? '≈ ' : '') + nombre(Math.round(x.longueur * 10) / 10) + ' m', x.masse != null ? nombre(Math.round(x.masse)) + ' g' : '—',
        x.cable ? [x.cable.nature, x.cable.diametre != null ? 'Ø ' + nombre(x.cable.diametre) : '', x.cable.section != null ? nombre(x.cable.section) + ' mm²' : ''].filter(Boolean).join(' · ') : 'inconnu de la base']) }];
  if (!sections.some(S => S.lignes.length)) return [];
  const resume = [motPdf(somme(N.contacts), 'contact à sertir', 'contacts à sertir'), motPdf(somme(N.modules), 'module de jonction', 'modules de jonction'), motPdf(somme(N.connecteurs), 'connecteur ou prise', 'connecteurs et prises'),
    motPdf(N.fils, 'câble', 'câbles'), nombre(Math.round(N.longueur)) + ' m de câble'].join(' · ') + ` — relu depuis le plan, les normes et les choix des fiches ; sans longueur dans l’installation, l’hypothèse de ${nombre(N.hypothese)} m par câble.`;
  return pagesDeTablesPdf('Nomenclature — ' + nom, resume, sections); }
// les modifications du retest (08-export : ce que portait le fichier là où on l'a changé), en une table
function pagesModificationsPdf(nom) { if (typeof modificationsDe !== 'function') return [];
  const lignes = []; let n = 0; verite().filter(liaisonComplete).forEach(l => { const m = modificationsDe(l); if (!m.length) return; n++;
    m.forEach(([col, ch, av, ap]) => lignes.push([l.cable || '—', l.de + (l.borneDe ? ':' + l.borneDe : ''), l.vers + (l.borneVers ? ':' + l.borneVers : ''), col, motAvant(ch, av), motAvant(ch, ap), typeof origineDeCase === 'function' ? ORIGINES_MOTS[origineDeCase(l, ch, true)] : ''])); });
  if (!lignes.length) return [];
  return pagesDeTablesPdf('Modifications de l’installation — ' + nom, `${motPdf(n, 'liaison modifiée', 'liaisons modifiées')} · ${motPdf(lignes.length, 'case', 'cases')} : ce que portait le fichier, ce que Volta y a mis, et d’où vient le changement (à la main, ou une proposition de Volta acceptée).`,
    [{ titre: 'Les cases changées', colonnes: [['Câble', 0.1, { mono: true }], ['De', 0.13, { mono: true }], ['Vers', 0.13, { mono: true }], ['Colonne', 0.12], ['Avant', 0.15, { gris: true, mono: true }], ['Après', 0.15, { mono: true }], ['Origine', 0.22]], lignes }]); }
/* LES HYPOTHÈSES ET LES SOURCES (v73, l'ingénieur, n° 9 : « si j'envoie le dossier à un vérificateur, il ne peut pas refaire
   le calcul ») : juste après la garde, en deux colonnes — les RÉGLAGES (ceux de la page des hypothèses, `hypothesesDe` :
   leur valeur, celle de l'outil quand elle diffère, d'où elle vient), les PROFILS DE CHARGE (un par disjoncteur : ses
   états, le calibre retenu et celui du retest), le STATUT DES TABLES (combien de lignes vérifiées par deux sources,
   déduites, à confirmer, venues du lecteur). */
const SOURCE_DE = t => { const m = String(t || '').match(/\(([^()]*(?:AC 43|EN \d|MIL|NASA|R2|CEI|AS\d|figure|fig\.|table|§)[^()]*)\)/); return m ? m[1] : ''; };
function pagesHypothesesPdf(nom) { if (typeof hypothesesDe !== 'function') return [];
  const N = app.norme || (typeof normeVide === 'function' ? normeVide() : {}), H = { ...HYPOTHESES, ...(app.simu || {}) }; let cs = [];
  try { cs = hypothesesDe(N, H, { fiche: true }); } catch (_) { cs = []; }
  const valeur = (c, h) => { const v = h[c.k];
    if (Array.isArray(v)) return v.length ? v.map(x => typeof x === 'number' ? nombre(x) : String(x)).join(' · ') + (c.unite ? ' ' + c.unite : '') : '—';
    if (c.genre === 'nombre') return v == null || v === '' ? (c.vide || '—') : nombre(v) + (c.unite ? ' ' + c.unite : '');
    if (c.genre === 'choix') { const o = (c.options || []).find(x => String(x[0]) === String(v)); return o ? o[1] : v == null ? '—' : String(v); }
    if (c.genre === 'case') return v === false ? 'non' : 'oui';
    if (c.genre === 'condition') return (h.conditions || []).includes(c.c) ? 'oui · × ' + nombre(Math.round(c.facteur * 100) / 100) : 'non';
    return v == null ? '—' : String(v); };
  const reglages = cs.filter(c => c.genre !== 'condition' || c.lib).map(c => { const v = valeur(c, H), d = valeur(c, HYPOTHESES);
    return [majuscule(c.lib || c.c || c.k || ''), v, d !== v ? d : '', SOURCE_DE(c.sert)]; });
  if (Array.isArray(H.calibresPreferes) && !cs.some(c => c.k === 'calibresPreferes')) reglages.push(['Calibres préférés', H.calibresPreferes.map(nombre).join(' · ') + ' A', JSON.stringify(H.calibresPreferes) !== JSON.stringify(HYPOTHESES.calibresPreferes) ? HYPOTHESES.calibresPreferes.map(nombre).join(' · ') + ' A' : '', 'le lecteur']);
  // les profils de charge : un par disjoncteur du plan
  const etat = (e, k) => e && e[k] && e[k].i != null ? nombre(e[k].i) + ' A' + (k !== 'perm' && e[k].t != null ? ' · ' + nombre(e[k].t) + ' s' : '') : '—';
  const profils = reperesDe(verite()).filter(estDisjoncteur).sort(triNaturel).map(r => { const c = chargeDe(r); let d = null; try { d = disjonctionDe(r); } catch (_) { }
    const F = d && d.famille, retest = F && F.calibre > 0 && d.calibre > 0 && Math.abs(F.calibre - d.calibre) > 1e-9 ? nombre(F.calibre) + ' A' : '';
    return [r, d && d.calibre > 0 ? nombre(d.calibre) + ' A' : '—', retest, etat(c, 'dem'), etat(c, 'trans'), etat(c, 'perm'), c && c.plus && c.plus.length ? c.plus.map(x => (x.nom || 'état') + ' ' + nombre(x.i) + ' A' + (x.t != null ? ' · ' + nombre(x.t) + ' s' : '')).join(' ; ') : c ? '' : 'profil à écrire']; });
  // le statut des tables : leurs lignes, par confiance
  const statuts = (typeof TABLES_NORME !== 'undefined' ? TABLES_NORME : []).map(t => { const xs = (N[t] || []); if (!xs.length) return null; const k = { v: 0, d: 0, c: 0, l: 0 };
    xs.forEach(x => { const f = String(x.confiance || ''); if (f === 'vérifié') k.v++; else if (f === 'déduit' || f === 'structure') k.d++; else if (f) k.c++; else k.l++; });
    return [(typeof TITRES_NORME !== 'undefined' && TITRES_NORME[t]) || t, xs.length, k.v || '', k.d || '', k.c || '', k.l || '']; }).filter(Boolean);
  const reglees = reglages.filter(r => r[2]).length;
  return pagesDeTablesPdf('Hypothèses et sources — ' + nom, `Ce que l’installation ne porte pas, Volta le suppose : voici les réglages avec lesquels ce dossier a été jugé${reglees ? ' (' + motPdf(reglees, 'réglage changé', 'réglages changés') + ' dans ce navigateur : la valeur de l’outil est à côté)' : ', les valeurs de l’outil'}, les profils de charge des disjoncteurs et d’où viennent les tables. L’installation corrigée les garde dans sa feuille « Volta ».`, [
    { titre: 'Les réglages', compte: motPdf(reglages.length, 'réglage', 'réglages'), colonnes: [['Réglage', 0.3], ['Valeur', 0.24], ['Valeur de l’outil', 0.18, { gris: true }], ['Source', 0.28, { gris: true }]], lignes: reglages },
    { titre: 'Les profils de charge', compte: motPdf(profils.length, 'disjoncteur', 'disjoncteurs'), colonnes: [['Repère', 0.14, { mono: true }], ['Calibre', 0.11, { droite: true }], ['Retest', 0.11, { droite: true, gris: true }], ['Démarrage', 0.15], ['Transition', 0.15], ['Permanent', 0.12], ['Autres états', 0.22]], lignes: profils },
    { titre: 'Le statut des tables', compte: motPdf(statuts.length, 'table', 'tables'), colonnes: [['Table', 0.3], ['Lignes', 0.12, { droite: true }], ['Vérifiées', 0.14, { droite: true }], ['Déduites', 0.14, { droite: true }], ['À confirmer', 0.15, { droite: true }], ['Vos tables', 0.15, { droite: true }]], lignes: statuts }], { deux: true }); }

/* ---- les folios : leurs liaisons, leur placement (le cache, sinon au loin), leur dessin --------------------------- */
const DOSSIER = { url: null, encours: null, historique: [] };
const pausePdf = () => new Promise(r => setTimeout(r, 0));
const abandonPdf = () => { const e = new Error('le dossier en PDF est annulé'); e.name = 'AbortError'; return e; };
/* Les folios du dossier : pour le plan ouvert, ceux de l'écran (`liaisonsDe` : les barrettes à poser numérotées comme
   l'écran les numérote) ; pour des liaisons données, folio par folio (`plan`), les barrettes à poser numérotées dans
   l'ordre des folios. `orig` : les liaisons de l’installation qu'il porte. */
function foliosDuDossier(L0, ouvert) {
  if (ouvert) { const P = plans(); return (P.length ? P : ['*']).map(p => ({ plan: p, L: liaisonsDe(p), orig: p === '*' ? L0 : L0.filter(l => l.plan === p) })).filter(f => f.L.length); }
  const P = plansDe(L0), memo = new Map(); let depart = 0;
  if (!P.length) return [{ plan: '*', L: avecBarrettesAPoser(L0, 0, memo), orig: L0 }];
  return P.map(p => { const Lp = L0.filter(l => l.plan === p), L = avecBarrettesAPoser(Lp, depart, memo); depart += dedoublements(Lp).length; return { plan: p, L, orig: Lp }; }); }
// le placement déjà là : retouché, affiné, vu dans la session, ou gardé d'une session passée (IndexedDB)
async function placementGardePdf(cle) { if (app.retouches && app.retouches.has(cle)) return app.retouches.get(cle);
  if (typeof affinage !== 'undefined' && affinage.profonds.has(cle)) return affinage.profonds.get(cle);
  if (typeof placements !== 'undefined' && placements.has(cle)) return placements.get(cle);
  if (typeof lireConcours === 'function') { const P = await lireConcours(cle).catch(() => null); if (P) { garderPlacement(cle, P); return P; } }
  return null; }
// le moteur en Worker, sa glu à lui : { cle, liaisons } → { cle, P } (celle de l'interface mène un concours partagé et
// rapporte en chemin l'esquisse et l'avancement ; ici chaque Worker place un folio entier, plusieurs folios à la fois)
function urlMoteurPdf() { if (DOSSIER.url) return DOSSIER.url;
  const src = document.getElementById('moteur'); if (!src || typeof Worker === 'undefined') return null;
  const glue = `\nself.onmessage = e => { const { cle, liaisons } = e.data; try { postMessage({ cle, P: meilleurPlacement(liaisons) }); } catch (err) { postMessage({ cle, erreur: String(err && err.message || err) }); } };`;
  return (DOSSIER.url = URL.createObjectURL(new Blob([src.textContent + glue], { type: 'text/javascript' }))); }
/* Placer des folios AU LOIN, deux ou trois Workers à la fois ; un Worker refusé ou en erreur : le folio se place dans la
   page (le dernier recours, le même résultat). `ecoute.debut(f)`, `ecoute.fin(f, P)` disent l'avancement. */
function placerEnParallelePdf(folios, signal, ecoute) { return new Promise((ok, ko) => { const file = folios.slice(), ws = []; let actifs = 0, fini = false;
  const finir = e => { if (fini) return; fini = true; ws.forEach(w => { try { w.terminate(); } catch (_) { } }); if (e) ko(e); else ok(); };
  if (signal) { if (signal.aborted) { finir(abandonPdf()); return; } signal.addEventListener('abort', () => finir(abandonPdf()), { once: true }); }
  const ici = f => { try { return meilleurPlacement(f.L); } catch (_) { return null; } };
  const suivant = w => { if (fini) return; const f = file.shift(); if (!f) { if (!actifs) finir(); return; } actifs++; w.f = f; ecoute.debut(f); w.postMessage({ cle: f.cle, liaisons: f.L.map(({ origine, ...l }) => l) }); };
  const recu = (w, d) => { if (fini || !w.f || (d && !d.P && !d.erreur)) return; const f = w.f; w.f = null; actifs--; ecoute.fin(f, (d && d.P) || ici(f)); suivant(w); };
  const url = urlMoteurPdf(), n = Math.max(1, Math.min(3, ((typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2) - 1, file.length));
  if (url) for (let k = 0; k < n; k++) { try { const w = new Worker(url); w.onmessage = e => recu(w, e.data); w.onerror = e => { if (e && e.preventDefault) e.preventDefault(); recu(w, null); }; ws.push(w); } catch (_) { break; } }
  if (!ws.length) { (async () => { for (const f of file.splice(0)) { if (fini) return; ecoute.debut(f); await pausePdf(); if (fini) return; ecoute.fin(f, ici(f)); await pausePdf(); } finir(); })(); return; }
  ws.forEach(suivant); }); }
// le dessin d'un folio, composé comme `calculer` (08-interface) le compose — ses routes en couleur, sa légende, ses barrettes à poser nommées — puis son SVG (06)
function svgDuFolioPdf(f, ctx) { const P = f.P, L = f.L;
  const d = { comps: P.comps, links: P.links, bbox: pageDe(P.comps, P.routage.fils), geom: P.geom, compDe: P.compDe, fils: P.routage.fils, points: P.routage.points, barrettes: P.routage.barrettes, piquages: P.routage.piquages };
  const routeDe = w => (L[w.i] && L[w.i].route) || ''; d.couleurDe = w => ctx.routes.get(routeDe(w)) || null;
  d.legende = legendeDesRoutes(d.fils.filter(w => !w.shunt && String(w.de) !== String(w.vers)), routeDe, ctx.routes); nommerBarrettesAPoser(d.barrettes, L);
  return { svg: svgAutonome(d, ctx.cartouche, ctx.folio(f), ctx.designation, '#ffffff', ctx.disjoncteur).txt, bb: d.bbox }; }

/* ---- le geste : ⋮ → Exporter → « Le dossier en PDF », et la barre qui dit où l'on en est -------------------------
   Tout est en mémoire : le PDF part en quelques dixièmes de seconde, sans barre. Un folio à placer : la barre paraît
   (après un quart de seconde), dit les folios prêts sur le total et lesquels se calculent ; « Annuler » arrête tout. */
async function exporterDossierPdf() { const n = app.contrat.liaisons.filter(liaisonComplete).length;
  if (!n) { dire('Aucun plan ouvert : rien à mettre en PDF.', true); return null; }
  if (DOSSIER.encours) { montrerBarreDossier(true); return null; }
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null; DOSSIER.encours = { ctl, etat: null, t0: performance.now() }; DOSSIER.historique = [];
  const tempo = setTimeout(() => montrerBarreDossier(true), 250);
  try { const octets = await pdfDuPlan(app.contrat.liaisons, app.nom || 'Plan', { ouvert: true, signal: ctl ? ctl.signal : null,
      avancement: e => { DOSSIER.encours.etat = e; DOSSIER.historique.push({ part: e.part, prets: e.prets, total: e.total }); majBarreDossier(e); } });
    const nom = nomContrat() + '-dossier.pdf', D = DOSSIER.dernier || { folios: 1, pages: 1, annexes: [] };
    telecharger(new Blob([octets], { type: 'application/pdf' }), nom);
    dire(`Le dossier est enregistré en PDF : ${pluriel(D.pages, 'page')} — la garde, ${pluriel(D.folios, 'folio')}${D.annexes.length ? ', ' + D.annexes.join(', ') : ''} (${nomAscii(nom)}).`); return octets; }
  catch (e) { if (e && e.name === 'AbortError') dire('Le dossier en PDF est annulé.'); else dire('Le dossier en PDF n’a pas pu s’écrire : ' + String(e && e.message || e) + '.', true); return null; }
  finally { clearTimeout(tempo); DOSSIER.encours = null; montrerBarreDossier(false); } }
function montrerBarreDossier(on) { let el = $('pdf-dossier');
  if (!el && on) { el = document.createElement('div'); el.id = 'pdf-dossier'; el.className = 'pdf-dossier ilot-sombre'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="pdf-dossier-t"><b>Le dossier en PDF</b><button class="btn lien" type="button" id="pdf-dossier-stop">Annuler</button></div>'
      + '<div class="pdf-barre" id="pdf-dossier-barre" role="progressbar" aria-label="Avancement du dossier en PDF" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><small id="pdf-dossier-mot">Les folios déjà dessinés…</small>';
    document.body.appendChild(el); $('pdf-dossier-stop').onclick = () => { const x = DOSSIER.encours; if (x && x.ctl) x.ctl.abort(); }; }
  if (!el) return; el.hidden = !on; if (on && DOSSIER.encours && DOSSIER.encours.etat) majBarreDossier(DOSSIER.encours.etat); }
/* v73 (l'ingénieur, § 3.7 : « ajouter le temps restant estimé ») : passé deux secondes et un dixième du chemin, la barre dit
   « environ 8 s » — le temps déjà pris, au prorata de ce qui reste ; arrondi, jamais au dixième. */
function majBarreDossier(e) { const b = $('pdf-dossier-barre'); if (!b) return; const v = Math.round(e.part * 100); b.setAttribute('aria-valuenow', v); b.firstElementChild.style.width = v + '%';
  const E = DOSSIER.encours, t = E && E.t0 ? (performance.now() - E.t0) / 1000 : 0, reste = e.part > 0.1 && e.part < 0.98 && t > 2 ? t * (1 - e.part) / e.part : null;
  const mot = reste == null ? '' : reste < 4 ? 'quelques secondes' : 'environ ' + (reste < 60 ? Math.round(reste / (reste < 20 ? 1 : 5)) * (reste < 20 ? 1 : 5) + ' s' : Math.round(reste / 60) + ' min');
  $('pdf-dossier-mot').textContent = e.mot + (mot ? ' · ' + mot : ''); }
