/* ===========================================================================
   08 — LIRE UN PDF DE SCHÉMA : la visionneuse, puis la relecture du retest
   ---------------------------------------------------------------------------
   Le lecteur : « J'aimerais que tu ajoutes un visualisateur de PDF. […] grâce
   à un PDF, tu arrives à créer le retest toi-même. » Ses PDF sont exportés de
   son logiciel de schéma (le texte se sélectionne) ou scannés ; ils n'ont pas
   de numéro de fil.

   Un PDF déposé n'importe où (08-fichiers, `ouvrirFichier`) ou ouvert par
   « Lire un PDF de schéma » s'ouvre ICI, posé sur la table comme un plan :
     · à gauche, le palet des VIGNETTES (rendues à la demande : un PDF de
       cinquante pages s'ouvre aussitôt) ;
     · au milieu, la PAGE sur papier blanc, qui se zoome à la molette ou au
       pincement et se déplace à la main ; dessous, le palet des outils (les
       pages, la RECHERCHE qui surligne, le zoom, « Relier à la main ») ;
     · à droite, la feuille de RELECTURE : les liaisons que le moteur a lues
       (09-pdf, `lireSchemaPdf`), une ligne chacune — De, Borne, Vers, Borne,
       Référence (le type de câble), Folio — avec sa CONFIANCE et ses raisons ;
       un clic SURLIGNE la liaison sur la page (le trajet suivi, ses deux bornes),
       un double-clic corrige une case ; les bouts ORPHELINS à part ; puis
       « Ouvrir comme plan » (le chemin de tout retest : `chargerContrat`) et
       « Enregistrer en retest Excel » (les seize colonnes, SheetJS).
   Un PDF SCANNÉ n'a pas de texte : on relie à la main — un clic sur une borne,
   un clic sur l'autre ; Volta propose le repère et la borne (ce qui est déjà
   saisi revient, la borne suivante aussi), on valide au clavier.

   Rien ne sort du poste : pdf.js est embarqué (vendor/, construire.js), son
   worker part d'une Blob URL ; aucune police, aucune table n'est demandée au
   réseau.
   =========================================================================== */
'use strict';

const PDF = { ouvert: false, doc: null, nom: '', n: 0, page: 1, tailles: [], vue: { s: 1, tx: 0, ty: 0, cadre: true }, rendu: { tache: null, s: 0, t: 0, page: 0 },
  textes: new Map(), lecture: null, analyse: null, L: [], choisie: -1, filtre: 'tout', q: '', hits: [], hit: -1, assiste: false, saisie: null, vignettes: new Map(),
  faits: [], vu: null, erreur: '', replie: false };
const estPdf = f => !!f && (/\.pdf$/i.test(f.name || '') || f.type === 'application/pdf');

/* ---- pdf.js : son worker, une fois, d'une Blob URL (le texte embarqué par construire.js) ------------------------ */
function pdfjsPret() { if (typeof pdfjsLib === 'undefined') throw new Error('le lecteur de PDF n’est pas embarqué dans ce fichier');
  if (!pdfjsLib.GlobalWorkerOptions.workerPort) { const t = document.getElementById('pdfjs-worker');
    if (t && t.textContent.length > 1000) pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(URL.createObjectURL(new Blob([t.textContent], { type: 'text/javascript' }))); }
  return pdfjsLib; }
/* Ce que le moteur lit d'une page : sa taille, sa vue, ses textes, ses opérateurs de dessin (09-pdf). */
async function pagePourLeMoteur(doc, n) { const pg = await doc.getPage(n), vp = pg.getViewport({ scale: 1 }); const [tc, ol] = await Promise.all([pg.getTextContent(), pg.getOperatorList()]);
  if (doc === PDF.doc) PDF.tailles[n - 1] = [vp.width, vp.height];
  return { largeur: vp.width, hauteur: vp.height, vt: vp.transform, items: tc.items, fn: ol.fnArray, args: ol.argsArray, OPS: pdfjsLib.OPS }; }

/* ---- ouvrir, fermer ---------------------------------------------------------------------------------------------- */
async function ouvrirPdf(fichier) { if (!fichier) return;
  let lib; try { lib = pdfjsPret(); } catch (e) { dire(String(e.message || e), true); return; }
  dire('Lecture de ' + guillemets(fichier.name || 'le PDF') + '…');
  let doc; try { doc = await lib.getDocument({ data: new Uint8Array(await fichier.arrayBuffer()), isEvalSupported: false, useSystemFonts: true }).promise; }
  catch (e) { dire((fichier.name || 'Ce fichier') + ' ne s’ouvre pas comme un PDF : ' + String(e && e.message || e) + '.', true); return; }
  if (PDF.doc && PDF.doc !== doc) try { PDF.doc.destroy(); } catch (_) { }
  Object.assign(PDF, { doc, nom: fichier.name || 'schéma.pdf', n: doc.numPages, page: 1, tailles: [], textes: new Map(), lecture: null, L: [], choisie: -1, filtre: 'tout', q: '', hits: [], hit: -1, assiste: false, saisie: null, vignettes: new Map(), faits: [], erreur: '' });
  // la taille de la première page tout de suite (les autres arrivent avec la lecture) ; la page paraît, puis le moteur lit
  const vp1 = (await doc.getPage(1)).getViewport({ scale: 1 }); PDF.tailles[0] = [vp1.width, vp1.height];
  construirePdf(); montrerPdf(); PDF.vue.cadre = true; PDF.rendu = { tache: null, s: 0, t: 0, page: 0 }; cadrerPdf(); rendreVignettes(false); rendreRelecture();
  await rendrePagePdf(); vignettesEnVue(); analyserPdf(); }
/* La pièce prend le clavier en s'ouvrant (Tab commence dans elle), et le rend en se fermant à ce qui l'avait ouverte — le ⋮
   pour une ligne du menu — sans en faire paraître la bulle (v73 : « les documents prennent le clavier, Échap rend au ⋮ »). */
const ouvreurDePiece = el => { const a = document.activeElement; return a && a !== document.body && !el.contains(a) ? (a.closest('#menu') ? $('btnMenu') : a) : $('btnMenu'); };
function rendreClavierDePiece(el, o) { const a = document.activeElement; if (!(a === document.body || !a || el.contains(a))) return; const c = o && o.isConnected && o.getClientRects().length ? o : $('btnMenu'); if (!c) return;
  if (typeof rendreLeClavier === 'function') rendreLeClavier(c); else c.focus(); }
function montrerPdf() { const el = $('pdf'); if (el.hidden) PDF.ouvreur = ouvreurDePiece(el); if (typeof fermerFiche === 'function') fermerFiche(); if (typeof fermerMenu === 'function') fermerMenu();
  el.hidden = false; el.classList.remove('entre'); void el.offsetWidth; el.classList.add('entre'); document.body.classList.add('pdf-ouvert'); PDF.ouvert = true; $('pdf-q').value = PDF.q;
  el.tabIndex = -1; if (!el.contains(document.activeElement)) el.focus({ preventScroll: true }); }
function fermerPdf() { const el = $('pdf'); if (!el || el.hidden) return; const garde = el.contains(document.activeElement) || document.activeElement === document.body;
  el.hidden = true; document.body.classList.remove('pdf-ouvert'); PDF.ouvert = false; fermerSaisie(); if (PDF.rendu.tache) try { PDF.rendu.tache.cancel(); } catch (_) { }
  if (garde) rendreClavierDePiece(el, PDF.ouvreur); }
const choisirPdf = () => { construirePdf(); $('fichier-pdf').click(); };

/* ---- le moteur, page par page, sans figer l'écran ------------------------------------------------------------------ */
async function analyserPdf() { const doc = PDF.doc, jeton = PDF.analyse = {}; PDF.lecture = null; rendreRelecture();
  // une page à la fois : ses opérateurs lus, puis oubliés ; la main rendue à l'écran entre deux pages
  try { const lues = [], t0 = performance.now();
    for (let i = 1; i <= doc.numPages; i++) { if (PDF.analyse !== jeton) return; lues.push(SCHEMA_PDF.lirePage(await pagePourLeMoteur(doc, i))); jeton.fait = i; majProgression(); await new Promise(r => setTimeout(r, 0)); }
    const L = SCHEMA_PDF.assembler(lues); if (PDF.analyse !== jeton) return;
    L.ms = Math.round(performance.now() - t0); PDF.lecture = L;
    PDF.L = L.liaisons.map((l, i) => ({ ...l, id: 'l' + i, main: new Set() }));
    PDF.analyse = null; rendreRelecture(); peindreCalque();
    const n = PDF.L.length, sc = L.scannees;
    dire(n ? pluriel(n, 'liaison') + ' lue' + (n > 1 ? 's' : '') + ' dans ' + guillemets(PDF.nom) + (sc ? ' · ' + pluriel(sc, 'page') + ' scannée' + (sc > 1 ? 's' : '') : '') + '.'
      : sc === doc.numPages ? guillemets(PDF.nom) + ' est scanné : reliez les bornes à la main.' : 'Aucune liaison lue dans ' + guillemets(PDF.nom) + '.'); }
  catch (e) { PDF.analyse = null; PDF.erreur = String(e && e.message || e); rendreRelecture(); } }
function majProgression() { const el = $('pdf-etat'); if (el && PDF.analyse) el.innerHTML = `<i class="pdf-respire" aria-hidden="true"></i>Lecture des traits : page ${PDF.analyse.fait || 0} sur ${PDF.n}…`; }

/* ---- la page : sa place sur la table, son rendu ----------------------------------------------------------------- */
const taillePage = n => PDF.tailles[(n || PDF.page) - 1] || PDF.tailles[0] || [595, 842];
function zonePdf() { const sc = $('pdf-scene'); return sc ? sc.getBoundingClientRect() : { width: 800, height: 600, left: 0, top: 0 }; }
/* La table visible : entre le palet des vignettes et la feuille de relecture, au-dessus des outils (en px de la scène) ;
   au téléphone, au-dessus du tiroir de la relecture et de la barre des outils, toute la largeur. */
function visiblePdf() { const r = zonePdf(), g = $('pdf-vignettes'), d = $('pdf-relecture'), o = $('pdf-outils');
  const G = g && g.offsetParent ? g.getBoundingClientRect() : null, D = d ? d.getBoundingClientRect() : null;
  if (D && D.width && D.left - r.left < r.width / 3) { const haut = Math.min(D.top, o ? o.getBoundingClientRect().top : D.top) - r.top; return { x0: 0, x1: r.width, y0: 0, y1: Math.max(120, haut) }; }
  const x0 = G ? G.right - r.left : 0, x1 = D ? D.left - r.left : r.width;
  return { x0, x1: Math.max(x0 + 100, x1), y0: 0, y1: r.height - 50 }; }
function cadrerPdf() { const v = visiblePdf(), [w, h] = taillePage(), m = 24, s = Math.max(0.05, Math.min((v.x1 - v.x0 - 2 * m) / w, (v.y1 - v.y0 - 2 * m) / h));
  PDF.vue = { s, tx: (v.x0 + v.x1 - w * s) / 2, ty: Math.max(m, (v.y1 - h * s) / 2), cadre: true }; poserFeuille(); }
function poserFeuille() { const f = $('pdf-feuille'); if (!f) return; const [w, h] = taillePage(), { s, tx, ty } = PDF.vue;
  f.style.width = Math.round(w * s) + 'px'; f.style.height = Math.round(h * s) + 'px'; f.style.transform = `translate(${Math.round(tx)}px,${Math.round(ty)}px)`;
  const z = $('pdf-zoom'); if (z) z.textContent = Math.round(s * 100 / (96 / 72)) + ' %';
  clearTimeout(PDF.rendu.t); PDF.rendu.t = setTimeout(rendrePagePdf, 140); }
function zoomerPdf(k, cx, cy) { if (cx == null) { const v = visiblePdf(); cx = (v.x0 + v.x1) / 2; cy = (v.y0 + v.y1) / 2; } const v = PDF.vue, s = Math.max(0.08, Math.min(12, v.s * k)), q = s / v.s;
  PDF.vue = { s, tx: cx - (cx - v.tx) * q, ty: cy - (cy - v.ty) * q, cadre: false }; poserFeuille(); }
/* Le rendu, à la résolution de l'écran (au plus 16 millions de points : un A0 zoomé ne fait pas tomber l'onglet) ; un
   rendu en cours cède au suivant. */
async function rendrePagePdf() { if (!PDF.doc || !PDF.ouvert) return; const n = PDF.page, dpr = window.devicePixelRatio || 1, [w, h] = taillePage();
  let k = PDF.vue.s * dpr; if (w * h * k * k > 16e6) k = Math.sqrt(16e6 / (w * h)); if (PDF.rendu.page === n && Math.abs(PDF.rendu.s - k) < 1e-3) return;
  // le même rendu déjà en route : on l'attend, on ne le recommence pas
  const cible = n + '@' + k.toFixed(4); if (PDF.rendu.cible === cible && PDF.rendu.promesse) return PDF.rendu.promesse;
  if (PDF.rendu.tache) try { PDF.rendu.tache.cancel(); } catch (_) { }
  PDF.rendu.cible = cible; return (PDF.rendu.promesse = (async () => {
    try { const pg = await PDF.doc.getPage(n); if (n !== PDF.page || PDF.rendu.cible !== cible) return; const vp = pg.getViewport({ scale: k }), cv = document.createElement('canvas'); cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
      const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
      const t = PDF.rendu.tache = pg.render({ canvasContext: g, viewport: vp }); await t.promise; if (PDF.rendu.tache !== t || n !== PDF.page) return;
      const vieux = $('pdf-canvas'); cv.id = 'pdf-canvas'; cv.className = 'pdf-canvas'; cv.setAttribute('aria-hidden', 'true'); vieux.replaceWith(cv); PDF.rendu = { tache: null, s: k, t: PDF.rendu.t, page: n, cible: '', promesse: null }; }
    catch (e) { if (!/cancel/i.test(String(e && e.name || e))) PDF.erreur = String(e && e.message || e); } })()); }
function allerPagePdf(n, garder) { n = Math.max(1, Math.min(PDF.n, n)); if (n === PDF.page && garder) return; PDF.page = n; PDF.rendu.page = 0;
  fermerSaisie(); if (!garder || PDF.vue.cadre) cadrerPdf(); else poserFeuille(); rendrePagePdf(); peindreCalque(); synchroniserPagePdf(); }
function synchroniserPagePdf() { const l = $('pdf-num'); if (l) l.textContent = PDF.page + ' / ' + PDF.n;
  $('pdf-prec').disabled = PDF.page <= 1; $('pdf-suiv').disabled = PDF.page >= PDF.n;
  document.querySelectorAll('#pdf-vignettes .pdf-vig').forEach(v => { const on = +v.dataset.page === PDF.page; v.classList.toggle('on', on); v.setAttribute('aria-current', on ? 'page' : 'false'); if (on) v.scrollIntoView({ block: 'nearest' }); }); }
// amener un point de la page (en points PDF) au milieu de la vue, sans changer le zoom (ou à un zoom lisible)
function centrerPdf(p, lisible) { const v = visiblePdf(); if (lisible && PDF.vue.s < 1.6) PDF.vue.s = 1.6;
  PDF.vue.tx = (v.x0 + v.x1) / 2 - p[0] * PDF.vue.s; PDF.vue.ty = (v.y0 + v.y1) / 2 - p[1] * PDF.vue.s; PDF.vue.cadre = false; poserFeuille(); }

/* Une liaison choisie se cadre lisible : son trajet et ses bouts tiennent dans la table visible, à un zoom ni plus petit
   que celui où on lisait (sauf s'il ne tient pas), ni plus grand que 250 %. */
function cadrerSurLiaison(l) { const ici = l.page === PDF.page - 1, pts = [...(ici ? l.bouts : l.boutsVers) || [], ...((ici ? l.trajet : l.trajetVers) || []).flat()]; if (!pts.length) return;
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), B = { x0: Math.min(...xs) - 30, y0: Math.min(...ys) - 30, x1: Math.max(...xs) + 30, y1: Math.max(...ys) + 30 }, v = visiblePdf();
  const tient = Math.min((v.x1 - v.x0) * 0.8 / (B.x1 - B.x0), (v.y1 - v.y0) * 0.8 / (B.y1 - B.y0)), s = Math.min(2.5 * 96 / 72, tient, Math.max(PDF.vue.s, Math.min(tient, 1.4)));
  PDF.vue.s = s; centrerPdf([(B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2]); }
/* ---- les vignettes : rendues quand elles paraissent, une à la fois ---------------------------------------------- */
function rendreVignettes() { const box = $('pdf-vignettes'); box.innerHTML = '';
  for (let i = 1; i <= PDF.n; i++) { const [w, h] = taillePage(i), b = document.createElement('button'); b.type = 'button'; b.className = 'pdf-vig'; b.dataset.page = i; b.setAttribute('aria-label', 'Page ' + i);
    b.innerHTML = `<span class="pdf-vig-p" style="aspect-ratio:${w}/${h}"></span><span class="pdf-vig-n">${i}</span>`; box.appendChild(b); }
  const file = [], vues = new Set(); let encours = false;
  const pomper = async () => { if (encours || !file.length) return; encours = true; const n = file.shift(), doc = PDF.doc;
    try { const pg = await doc.getPage(n), vp0 = pg.getViewport({ scale: 1 }), k = 220 / vp0.width, vp = pg.getViewport({ scale: k }), cv = document.createElement('canvas'); cv.width = Math.ceil(vp.width); cv.height = Math.ceil(vp.height);
      const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); await pg.render({ canvasContext: g, viewport: vp }).promise;
      if (doc === PDF.doc) { const v = box.querySelector(`.pdf-vig[data-page="${n}"] .pdf-vig-p`); if (v) { v.style.aspectRatio = vp0.width + '/' + vp0.height; v.innerHTML = ''; v.appendChild(cv); PDF.vignettes.set(n, true); } } } catch (_) { }
    encours = false; pomper(); };
  // elles se rendent quand elles paraissent dans leur palet, après la page (`vignettesEnVue`)
  PDF.vigObs = () => { const io = new IntersectionObserver(es => es.forEach(e => { const n = +e.target.dataset.page; if (e.isIntersecting && !vues.has(n)) { vues.add(n); file.push(n); pomper(); } }), { root: box, rootMargin: '200px 0px' });
    box.querySelectorAll('.pdf-vig').forEach(v => io.observe(v)); };
  synchroniserPagePdf(); }
const vignettesEnVue = () => { if (PDF.vigObs) { PDF.vigObs(); PDF.vigObs = null; } };

/* ---- le calque : ce qu'on surligne sur la page (en points PDF, le trait d'épaisseur fixe à l'écran) -------------- */
const etatConf = c => c >= 0.9 ? 'ok' : c >= 0.6 ? 'att' : 'ko';
function peindreCalque() { const sv = $('pdf-calque'); if (!sv) return; const [w, h] = taillePage(), n = PDF.page - 1; sv.setAttribute('viewBox', `0 0 ${w} ${h}`); let s = '';
  const rect = (B, cls) => `<rect class="${cls}" x="${B.x0.toFixed(2)}" y="${B.y0.toFixed(2)}" width="${(B.x1 - B.x0).toFixed(2)}" height="${(B.y1 - B.y0).toFixed(2)}"/>`;
  // la recherche
  PDF.hits.forEach((x, i) => { if (x.page === n) s += rect({ x0: x.B.x0 - 1, y0: x.B.y0 - 1, x1: x.B.x1 + 1, y1: x.B.y1 + 1 }, 'pdf-hit' + (i === PDF.hit ? ' on' : '')); });
  // les bouts orphelins de la page
  if (PDF.vu && PDF.vu.page === n) { const o = PDF.vu.p; s += `<g class="pdf-orph"><circle cx="${o[0]}" cy="${o[1]}" r="6"/><path d="M${o[0] - 4} ${o[1] - 4}l8 8m0 -8l-8 8"/></g>`; }
  // la liaison choisie : son trajet, ses deux bouts, les textes lus
  const l = PDF.L[PDF.choisie];
  if (l && (l.page === n || l.pageVers === n)) { const ici = l.page === n, tr = ici ? l.trajet : l.trajetVers, bs = ici ? l.bouts : l.boutsVers, et = etatConf(l.main.size ? 1 : l.conf);
    s += `<g class="pdf-sel e-${et}">` + (tr || []).map(([a, b]) => `<line class="pdf-halo" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`).join('')
      + (tr || []).map(([a, b]) => `<line class="pdf-trait${l.assiste ? ' tirets' : ''}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`).join('')
      + (ici ? (l.mots || []).map(B => rect({ x0: B.x0 - 0.8, y0: B.y0 - 0.8, x1: B.x1 + 0.8, y1: B.y1 + 0.8 }, 'pdf-mot')).join('') : '')
      + (bs || []).map(p => `<circle class="pdf-bout" cx="${p[0]}" cy="${p[1]}" r="3.2"/>`).join('') + '</g>'; }
  // la saisie à la main : le premier bout posé
  if (PDF.saisie && PDF.saisie.a && PDF.saisie.a.page === n) { const a = PDF.saisie.a.p; s += `<circle class="pdf-bout attente" cx="${a[0]}" cy="${a[1]}" r="4"/>`; }
  sv.innerHTML = s; }

/* ---- la recherche : les textes de toutes les pages, lus une fois -------------------------------------------------- */
async function textesDePage(n) { if (PDF.textes.has(n)) return PDF.textes.get(n);
  const pg = await PDF.doc.getPage(n), tc = await pg.getTextContent(), M = SCHEMA_PDF.motsDesTextes(tc.items, pg.getViewport({ scale: 1 }).transform).filter(m => !m.partie); PDF.textes.set(n, M); return M; }
async function chercherPdf(q) { PDF.q = q = String(q || '').trim(); const jeton = PDF.cherche = {}; PDF.hits = []; PDF.hit = -1;
  if (q) { const Q = q.toLowerCase();
    for (let n = 1; n <= PDF.n; n++) { const M = await textesDePage(n); if (PDF.cherche !== jeton) return; M.forEach(m => { if (m.s.toLowerCase().includes(Q)) PDF.hits.push({ page: n - 1, B: m.B, s: m.s }); }); }
    PDF.hits.sort((a, b) => a.page - b.page || a.B.y0 - b.B.y0 || a.B.x0 - b.B.x0); const ici = PDF.hits.findIndex(x => x.page === PDF.page - 1); PDF.hit = ici >= 0 ? ici : PDF.hits.length ? 0 : -1; }
  majCompteRecherche(); if (PDF.hit >= 0) viserHit(); else peindreCalque(); }
function majCompteRecherche() { const c = $('pdf-q-n'); if (!c) return; const q = PDF.q; c.textContent = !q ? '' : PDF.hits.length ? (PDF.hit + 1) + ' / ' + PDF.hits.length : 'rien';
  c.classList.toggle('rien', !!q && !PDF.hits.length); }
function viserHit() { const x = PDF.hits[PDF.hit]; if (!x) return; if (x.page !== PDF.page - 1) allerPagePdf(x.page + 1, true); centrerPdf([(x.B.x0 + x.B.x1) / 2, (x.B.y0 + x.B.y1) / 2], true); peindreCalque(); majCompteRecherche(); }
function hitSuivant(pas) { if (!PDF.hits.length) return; PDF.hit = (PDF.hit + pas + PDF.hits.length) % PDF.hits.length; viserHit(); }

/* ---- la relecture : la feuille de droite --------------------------------------------------------------------------- */
const COLS_PDF = [['de', 'De'], ['borneDe', 'Borne'], ['vers', 'Vers'], ['borneVers', 'Borne'], ['type', 'Référence'], ['folio', 'Folio']];
const pourcentPdf = c => Math.round(c * 100) + '\u00a0%';
function lignesVues() { return PDF.L.map((l, i) => [l, i]).filter(([l]) => PDF.filtre === 'tout' || (PDF.filtre === 'revoir' ? !l.main.size && l.conf < 0.9 : PDF.filtre === 'page' ? (l.page === PDF.page - 1 || l.pageVers === PDF.page - 1) : true)); }
function rendreRelecture() { const box = $('pdf-relecture'); if (!box) return; const L = PDF.lecture, n = PDF.L.length, revoir = PDF.L.filter(l => !l.main.size && l.conf < 0.9).length;
  const scan = L && L.scannees, tout = L && L.scannees === PDF.n;
  const etat = PDF.erreur ? `<span class="pdf-e ko"><i></i>${esc(PDF.erreur)}</span>`
    : PDF.analyse ? `<i class="pdf-respire" aria-hidden="true"></i>Lecture des traits : page ${PDF.analyse.fait || 0} sur ${PDF.n}…`
    : !L ? '' : lies([pluriel(PDF.n, 'page'), tout ? 'scanné' : scan ? pluriel(scan, 'page') + ' scannée' + (scan > 1 ? 's' : '') : 'vectoriel', pluriel(n, 'liaison'), revoir ? revoir + ' à revoir' : '']);
  const tete = `<div class="fiche-tete"><div class="min0"><div class="sur">PDF de schéma</div><h2 class="titre">${esc(PDF.nom)}</h2></div><button class="rond fermer" id="pdf-fermer" aria-label="Fermer le PDF (Échap)"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg><span class="bulle" aria-hidden="true">Fermer<kbd>Échap</kbd></span></button></div>`;
  const champs = L && L.pages[PDF.page - 1] && L.pages[PDF.page - 1].champs || {}, cart = [champs.numero || (L && L.numero), champs.folio ? 'folio ' + champs.folio : '', champs.indice || (L && L.indice) ? 'indice ' + (champs.indice || L.indice) : ''].filter(Boolean);
  let haut = `<p class="pdf-etat" id="pdf-etat" role="status">${etat}</p>` + (cart.length ? `<p class="pdf-cart">Cartouche : <span class="id">${cart.map(esc).join('</span>' + POINT + '<span class="id">')}</span></p>` : ''), corps = '';
  const lisible = tout && L.pages.every(r => r.texte), vectorise = tout && L.pages.every(r => r.vectorise);
  if (tout) haut += `<div class="pdf-scan"><p><b>${vectorise ? 'Texte dessiné en traits' : 'Page scannée'}</b>${lisible ? ', son texte se lit (le scanner l’a reconnu) : Volta propose le repère et la borne écrits là où vous cliquez' : vectorise ? ' : ce PDF n’a pas de texte à lire, ses lettres sont des dessins' : ' : aucun texte à lire'}. Reliez les bornes à la main — un clic sur une borne, un clic sur l’autre ; Entrée valide.</p>${PDF.assiste ? '' : '<button class="btn papier" data-pdf="assiste">Relier à la main</button>'}</div>`;
  if (n || (L && !tout)) {
    haut += `<div class="pdf-filtres segment" role="group" aria-label="Lignes montrées">${[['tout', 'Toutes', n], ['revoir', 'À revoir', revoir], ['page', 'Cette page', PDF.L.filter(l => l.page === PDF.page - 1 || l.pageVers === PDF.page - 1).length]].map(([k, t, c]) => `<button data-filtre="${k}" aria-pressed="${PDF.filtre === k}">${t}<i>${c}</i></button>`).join('')}</div>`;
    const V = lignesVues();
    corps += `<table class="pdf-tab" id="pdf-tab"><thead><tr>${COLS_PDF.map(([k, t]) => `<th data-k="${k}">${t}</th>`).join('')}<th class="pdf-th-c">Confiance</th></tr></thead><tbody>`
      + V.map(([l, i]) => { const c = l.main.size ? 1 : l.conf, e = etatConf(c), sel = i === PDF.choisie;
        // la case tronquée garde son texte entier au survol (le folio : le dessin, FWD) ; « double-clic pour corriger » se dit dans la ligne dépliée
        return `<tr data-i="${i}" class="${sel ? 'choisie' : ''}"${sel ? ' aria-selected="true"' : ''}>${COLS_PDF.map(([k]) => { const plein = [k === 'folio' ? l.plan || l[k] : l[k], k === 'de' ? l.pnDe : k === 'vers' ? l.pnVers : ''].filter(Boolean).join(' · ');
            return `<td class="pdf-c${l.main.has(k) ? ' main' : ''}${/^borne/.test(k) ? ' b' : ''}" data-k="${k}"${plein ? ` title="${escA(plein)}"` : ''}>${esc(l[k] || '')}${k === 'de' && l.pnDe ? `<small>${esc(l.pnDe)}</small>` : k === 'vers' && l.pnVers ? `<small>${esc(l.pnVers)}</small>` : ''}</td>`; }).join('')}`
          + `<td class="pdf-conf e-${e}"><i aria-hidden="true"></i>${l.main.size ? "main" : pourcentPdf(c)}</td></tr>`
          + (sel ? `<tr class="pdf-raisons"><td colspan="${COLS_PDF.length + 1}"><p class="pdf-detail">${esc(lies([l.type ? 'référence ' + l.type : 'sans référence', 'folio ' + (l.folio || '—')]))}</p><ul>${(l.raisons || []).map(r => `<li>${esc(r)}</li>`).join('')}</ul><div class="pdf-geste"><span class="pdf-astuce">Double-clic sur une case pour la corriger.</span><button class="btn lien" data-pdf="suppr" data-i="${i}">Supprimer cette liaison</button></div></td></tr>` : ''); }).join('')
      + `</tbody></table>` + (V.length ? '' : `<p class="pdf-vide">${PDF.filtre === 'revoir' ? 'Rien à revoir : chaque liaison est lue avec assurance.' : PDF.filtre === 'page' ? 'Aucune liaison lue sur cette page.' : 'Aucune liaison lue.'}</p>`);
    // les bouts orphelins, les bornes sans trait : à part
    const O = L ? L.pages.flatMap((P, k) => P.orphelins.map(o => ({ ...o, page: k }))) : [], S = L ? L.pages.flatMap((P, k) => P.bornesSeules.map(o => ({ ...o, page: k }))) : [];
    if (O.length || S.length) corps += `<details class="pdf-orphelins"${O.length && O.length < 8 ? ' open' : ''}><summary>Bouts orphelins<i>${O.length + S.length}</i></summary><ul>`
      + O.map((o, k) => `<li><button data-orph="o${k}"><span class="pdf-o-p">p. ${o.page + 1}</span>${esc(o.raison)}</button></li>`).join('')
      + S.map((o, k) => `<li><button data-orph="s${k}"><span class="pdf-o-p">p. ${o.page + 1}</span>borne sans trait : <span class="id">${esc((o.repere ? o.repere + ' : ' : '') + o.texte)}</span></button></li>`).join('') + '</ul></details>';
  }
  const pied = `<button class="btn cuivre" data-pdf="plan"${n ? '' : ' disabled'}>Ouvrir comme plan</button><button class="btn papier" data-pdf="excel"${n ? '' : ' disabled'}>Enregistrer en retest Excel</button>`;
  const y = $('pdf-corps') ? $('pdf-corps').scrollTop : 0;
  // au téléphone, la relecture est le tiroir du bas : sa poignée le replie, le déplie (le CSS ne la montre que là)
  const poignee = `<button class="pdf-poignee" data-pdf="replier" type="button" aria-expanded="${!PDF.replie}" aria-label="${PDF.replie ? 'Déplier' : 'Replier'} la relecture"><i aria-hidden="true"></i></button>`;
  box.innerHTML = `<div class="pdf-haut">${poignee}${tete}${haut}</div><div class="pdf-liste" id="pdf-corps">${corps}</div><div class="fiche-pied">${pied}</div>`;
  $('pdf-corps').scrollTop = y; if (typeof typographier === 'function') typographier(box); }
// une liaison choisie : sa ligne, son trajet sur sa page, centré
function choisirLiaisonPdf(i, centrer) { if (i === PDF.choisie && centrer !== true) return; PDF.choisie = i; const l = PDF.L[i]; rendreRelecture();
  if (l) { if (l.page !== PDF.page - 1 && l.pageVers !== PDF.page - 1) allerPagePdf(l.page + 1, true); peindreCalque();
    if (centrer !== false && l.bouts) cadrerSurLiaison(l); }
  ligneEnVue(i); }
// la ligne et ses raisons en vue (la ligne d'abord si les deux ne tiennent pas)
function ligneEnVue(i) { const tr = $('pdf-tab') && $('pdf-tab').querySelector(`tr[data-i="${i}"]`); if (!tr) return;
  const r = tr.nextElementSibling; if (r && r.classList.contains('pdf-raisons')) r.scrollIntoView({ block: 'nearest' }); tr.scrollIntoView({ block: 'nearest' }); }
/* Corriger une case : le champ se pose sur elle ; Entrée ou Tab écrit (Tab passe à la suivante), Échap rend. La liaison
   devient « main » : sa confiance n'a plus lieu d'être. */
function corrigerCasePdf(td) { const tr = td.closest('tr'), i = +tr.dataset.i, k = td.dataset.k, l = PDF.L[i]; if (!l) return;
  const inp = document.createElement('input'); inp.className = 'pdf-in'; inp.value = l[k] || ''; inp.spellcheck = false; inp.setAttribute('aria-label', COLS_PDF.find(c => c[0] === k)[1]);
  inp.setAttribute('list', /^(de|vers)$/.test(k) ? 'pdf-reperes' : ''); td.textContent = ''; td.appendChild(inp); inp.focus(); inp.select(); let fini = false;
  const ecrire = suivant => { if (fini) return; fini = true; const v = inp.value.trim(); if (v !== (l[k] || '')) { l[k] = v; l.main.add(k); }
    // le folio écrit à la main refait le dessin (FWD) de la liaison : le numéro du document et ce folio
    if (k === 'folio' && l.main.has('folio')) { const num = PDF.lecture && PDF.lecture.numero; l.plan = l.fwd = num ? num + ' F' + v : v; }
    rendreRelecture(); peindreCalque(); if (suivant) { const ks = COLS_PDF.map(c => c[0]), j = ks.indexOf(k) + suivant, cible = $('pdf-tab').querySelector(`tr[data-i="${i}"] td[data-k="${ks[j]}"]`); if (cible) corrigerCasePdf(cible); } };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ecrire(0); } else if (e.key === 'Tab') { e.preventDefault(); ecrire(e.shiftKey ? -1 : 1); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fini = true; rendreRelecture(); } });
  inp.addEventListener('blur', () => ecrire(0)); }

/* ---- relier à la main : un clic sur une borne, un clic sur l'autre ------------------------------------------------
   Volta propose : sur un PDF vectoriel, le repère et la borne écrits là (les textes les plus proches du clic) ; sur un
   scan, le dernier repère saisi près de là et la borne suivante. Ce qui est déjà saisi revient dans la liste. */
const versPage = (cx, cy) => { const r = $('pdf-feuille').getBoundingClientRect(), s = PDF.vue.s; return [(cx - r.left) / s, (cy - r.top) / s]; };
function propositionPdf(p) { const n = PDF.page - 1, M = (PDF.textes.get(PDF.page) || []), u = (PDF.lecture && PDF.lecture.pages[n] && PDF.lecture.pages[n].u) || 8;
  const pres = (f, r) => M.filter(m => f(m.s)).map(m => ({ m, d: Math.hypot(m.c[0] - p[0], m.c[1] - p[1]) })).filter(o => o.d < r).sort((a, b) => a.d - b.d)[0];
  const rep = pres(SCHEMA_PDF.estRepere, 14 * u), bor = pres(SCHEMA_PDF.estBorne, 3 * u);
  if (rep || bor) return { repere: rep ? rep.m.s : '', borne: bor ? bor.m.s : '' };
  // un scan : le repère du bout saisi le plus près (à moins d'une vingtaine de millimètres), la borne qui suit la sienne
  const proche = PDF.faits.filter(x => x.page === n).map(x => ({ x, d: Math.hypot(x.p[0] - p[0], x.p[1] - p[1]) })).sort((a, b) => a.d - b.d)[0];
  if (proche && proche.d < 60) { const b = proche.x.borne, m = /^(.*?)(\d+)$/.exec(b || ''); return { repere: proche.x.repere, borne: m ? m[1] + (+m[2] + 1) : '' }; }
  return { repere: '', borne: '' }; }
function basculerAssiste(on) { PDF.assiste = on == null ? !PDF.assiste : !!on; fermerSaisie(); const b = $('pdf-assiste'); if (b) b.setAttribute('aria-pressed', String(PDF.assiste));
  $('pdf').classList.toggle('assiste', PDF.assiste); if (PDF.assiste) { textesDePage(PDF.page); dire('Relier à la main : cliquez une borne, puis l’autre. Échap pour finir.'); } rendreRelecture(); }
async function clicAssiste(e) { const p = versPage(e.clientX, e.clientY), [w, h] = taillePage(); if (p[0] < 0 || p[1] < 0 || p[0] > w || p[1] > h) return; await textesDePage(PDF.page);
  const etape = PDF.saisie && PDF.saisie.a ? 'b' : 'a'; if (etape === 'a') PDF.saisie = {}; ouvrirSaisie(etape, p, e.clientX, e.clientY, propositionPdf(p)); }
function ouvrirSaisie(etape, p, cx, cy, prop) { let el = $('pdf-saisie'); if (!el) { el = document.createElement('form'); el.id = 'pdf-saisie'; el.className = 'pdf-saisie'; $('pdf').appendChild(el); }
  el.innerHTML = `<div class="pdf-s-t">${etape === 'a' ? 'De' : 'Vers'}<small>${etape === 'a' ? 'puis cliquez l’autre borne' : 'Entrée crée la liaison'}</small></div>`
    + `<label><span>Repère</span><input name="r" list="pdf-reperes" value="${escA(prop.repere)}" spellcheck="false" autocomplete="off"></label><label><span>Borne</span><input name="b" value="${escA(prop.borne)}" spellcheck="false" autocomplete="off"></label>`
    + `<button class="btn cuivre" type="submit">${etape === 'a' ? 'Suivant' : 'Relier'}</button>`;
  const r = $('pdf').getBoundingClientRect(); el.style.left = Math.min(r.width - 240, Math.max(8, cx - r.left + 14)) + 'px'; el.style.top = Math.min(r.height - 170, Math.max(8, cy - r.top + 14)) + 'px'; el.hidden = false;
  PDF.saisie.etape = etape; PDF.saisie.p = p; peindreCalque(); listeReperes();
  const ir = el.querySelector('[name=r]'), ib = el.querySelector('[name=b]'); (prop.repere ? ib : ir).focus(); (prop.repere ? ib : ir).select();
  el.onsubmit = ev => { ev.preventDefault(); const bout = { page: PDF.page - 1, p, repere: ir.value.trim(), borne: ib.value.trim() }; if (!bout.repere) { ir.focus(); return; }
    PDF.faits.push(bout);
    if (etape === 'a') { PDF.saisie.a = bout; el.hidden = true; peindreCalque(); return; }
    const a = PDF.saisie.a, [g, d] = a.p[0] <= bout.p[0] ? [a, bout] : [bout, a];
    const pl = PDF.lecture && PDF.lecture.pages[a.page];
    PDF.L.push({ de: g.repere, borneDe: g.borne, pnDe: '', vers: d.repere, borneVers: d.borne, pnVers: '', type: '', cable: '', folio: (pl && pl.folio) || String(a.page + 1), plan: (pl && pl.plan) || String(a.page + 1),
      page: a.page, pageVers: bout.page !== a.page ? bout.page : undefined, conf: 1, raisons: ['reliée à la main'], trajet: [[a.p, bout.p]], bouts: [g.p, d.p], mots: [], assiste: true, id: 'm' + PDF.L.length, main: new Set(['de', 'vers']) });
    PDF.choisie = PDF.L.length - 1; fermerSaisie(); rendreRelecture(); peindreCalque(); dire('Liaison ' + g.repere + (g.borne ? ':' + g.borne : '') + ' → ' + d.repere + (d.borne ? ':' + d.borne : '') + ' ajoutée.'); };
  el.onkeydown = ev => { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); fermerSaisie(); peindreCalque(); } }; }
function fermerSaisie() { const el = $('pdf-saisie'); if (el) el.hidden = true; PDF.saisie = null; }
function listeReperes() { let dl = $('pdf-reperes'); if (!dl) { dl = document.createElement('datalist'); dl.id = 'pdf-reperes'; document.body.appendChild(dl); }
  const R = new Set([...PDF.faits.map(x => x.repere), ...PDF.L.flatMap(l => [l.de, l.vers]), ...(PDF.textes.get(PDF.page) || []).filter(m => SCHEMA_PDF.estRepere(m.s)).map(m => m.s)].filter(Boolean));
  dl.innerHTML = [...R].sort(triNaturel).map(r => `<option value="${escA(r)}">`).join(''); }

/* Un clic sur un trait de la page choisit la liaison qui le suit (à six pixels près) : sa ligne s'allume dans la relecture. */
function liaisonSousLeClic(e) { const p = versPage(e.clientX, e.clientY), n = PDF.page - 1, tol = 6 / PDF.vue.s; let best = -1, bd = tol;
  PDF.L.forEach((l, i) => { const tr = l.page === n ? l.trajet : l.pageVers === n ? l.trajetVers : null; (tr || []).forEach(([a, b]) => { const vx = b[0] - a[0], vy = b[1] - a[1], L2 = vx * vx + vy * vy;
    const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L2)) : 0, d = Math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy); if (d < bd) { bd = d; best = i; } }); });
  if (best >= 0) { if (PDF.filtre !== 'tout' && !lignesVues().some(([, i]) => i === best)) PDF.filtre = 'tout'; PDF.vu = null; choisirLiaisonPdf(best, false); } }
/* ---- sortir : un plan de Volta, un retest Excel ------------------------------------------------------------------ */
const liaisonsDuPdf = () => PDF.L.filter(l => l.de && l.vers).map(l => ({ de: l.de, borneDe: l.borneDe, pnDe: l.pnDe, vers: l.vers, borneVers: l.borneVers, pnVers: l.pnVers, type: l.type, cable: l.cable, plan: l.plan || l.folio, fwd: l.plan || l.folio, harness: l.harness || '' }));
function ouvrirPdfCommePlan() { const L = liaisonsDuPdf(); if (!L.length) return; const nom = PDF.nom.replace(/\.pdf$/i, '');
  fermerPdf(); chargerContrat(L, 'lecture de ' + PDF.nom, nom, { nouveau: true }); if (typeof contratRecu === 'function') contratRecu(nom, 'PDF de schéma');
  dire(pluriel(L.length, 'liaison') + ' lue' + (L.length > 1 ? 's' : '') + ' dans ' + guillemets(PDF.nom) + (plans().length > 1 ? ' · ' + plans().length + ' folios' : '') + ' : un plan neuf, Ctrl+Z revient.'); }
const EN16_PDF = ['Harness', 'Device1', 'Pin1', 'PN1', 'Description1', 'Cable T/G', 'Cable Tag', 'Route', 'Device2', 'Pin2', 'PN2', 'Description2', 'FWD', 'Cable length (mm)', 'Appareil', 'Date retest'];
function classeurDuPdf() { const L = liaisonsDuPdf(), lignes = [EN16_PDF, ...L.map(l => [l.harness, l.de, l.borneDe, l.pnDe, '', l.type, l.cable, '', l.vers, l.borneVers, l.pnVers, '', l.plan, '', '', ''])];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lignes), 'Retest'); return { wb, n: L.length }; }
function enregistrerPdfEnExcel() { const { wb, n } = classeurDuPdf(); if (!n) return; const nom = PDF.nom.replace(/\.pdf$/i, '') + '-retest.xlsx';
  telecharger(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nom);
  dire(pluriel(n, 'liaison') + ' enregistrée' + (n > 1 ? 's' : '') + ' en retest Excel (' + nom + ').'); }

/* ---- la pièce : construite une fois, ses gestes ------------------------------------------------------------------ */
const ICO_PDF = { prec: '<path d="m15 5-7 7 7 7"/>', suiv: '<path d="m9 5 7 7-7 7"/>', moins: '<path d="M6 12h12"/>', plus: '<path d="M12 6v12M6 12h12"/>', cadre: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  loupe: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', relier: '<circle cx="5.5" cy="17" r="2"/><circle cx="18.5" cy="7" r="2"/><path d="M7.3 15.8 16.7 8.2" stroke-dasharray="2.4 2"/>' };
const icoPdf = k => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICO_PDF[k]}</svg>`;
const rdPdf = (id, k, mot, kbd, plus) => `<button class="rd" id="${id}" type="button" aria-label="${escA(mot + (kbd ? ' (' + kbd + ')' : ''))}"${plus || ''}>${icoPdf(k)}<span class="bulle" aria-hidden="true">${esc(mot)}${kbd ? `<kbd>${esc(kbd)}</kbd>` : ''}</span></button>`;
function construirePdf() { if ($('pdf')) return;
  const el = document.createElement('section'); el.id = 'pdf'; el.className = 'pdf'; el.hidden = true; el.setAttribute('aria-label', 'Lire un PDF de schéma');
  el.innerHTML = `<nav class="pdf-vignettes ilot-sombre" id="pdf-vignettes" aria-label="Les pages"></nav>`
    + `<div class="pdf-scene" id="pdf-scene"><div class="pdf-feuille" id="pdf-feuille"><canvas id="pdf-canvas" class="pdf-canvas" aria-hidden="true"></canvas><svg class="pdf-calque" id="pdf-calque" preserveAspectRatio="none" aria-hidden="true"></svg></div></div>`
    + `<div class="pdf-outils ilot-sombre" id="pdf-outils" role="toolbar" aria-label="Pages, recherche et zoom">`
    + `<span class="pdf-palet">${rdPdf('pdf-prec', 'prec', 'Page précédente', 'PgPréc')}<span class="pdf-num" id="pdf-num">1 / 1</span>${rdPdf('pdf-suiv', 'suiv', 'Page suivante', 'PgSuiv')}</span>`
    + `<span class="pdf-palet pdf-cherche">${icoPdf('loupe')}<input id="pdf-q" type="search" placeholder="Chercher dans le PDF" aria-label="Chercher un texte dans le PDF" autocomplete="off" spellcheck="false"><span class="pdf-q-n" id="pdf-q-n" aria-live="polite"></span></span>`
    + `<span class="pdf-palet">${rdPdf('pdf-assiste', 'relier', 'Relier à la main', 'L', ' aria-pressed="false"')}</span>`
    + `<span class="pdf-palet">${rdPdf('pdf-moins', 'moins', 'Dézoomer', '−')}<button class="rd zl" id="pdf-zoom" type="button" aria-label="Ajuster la page à l’écran">100 %</button>${rdPdf('pdf-plus', 'plus', 'Zoomer', '+')}${rdPdf('pdf-cadre', 'cadre', 'Ajuster', '0')}</span></div>`
    + `<aside class="pdf-relecture" id="pdf-relecture" aria-label="Les liaisons lues"></aside>`;
  document.body.appendChild(el);
  const inp = document.createElement('input'); inp.type = 'file'; inp.id = 'fichier-pdf'; inp.accept = '.pdf,application/pdf'; inp.hidden = true; document.body.appendChild(inp);
  inp.addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) ouvrirPdf(f); e.target.value = ''; });
  lierPdf(); }
function lierPdf() { const sc = $('pdf-scene'), o = (id, fn) => { $(id).onclick = fn; };
  o('pdf-prec', () => allerPagePdf(PDF.page - 1, false)); o('pdf-suiv', () => allerPagePdf(PDF.page + 1, false));
  o('pdf-moins', () => zoomerPdf(1 / 1.25)); o('pdf-plus', () => zoomerPdf(1.25)); o('pdf-cadre', cadrerPdf); o('pdf-zoom', cadrerPdf); o('pdf-assiste', () => basculerAssiste());
  $('pdf-vignettes').addEventListener('click', e => { const v = e.target.closest('.pdf-vig'); if (v) allerPagePdf(+v.dataset.page, false); });
  // la recherche : à la frappe ; Entrée va au suivant, Maj+Entrée au précédent
  let tq = 0; $('pdf-q').addEventListener('input', e => { clearTimeout(tq); tq = setTimeout(() => chercherPdf(e.target.value), 160); });
  $('pdf-q').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (PDF.q !== e.target.value.trim()) chercherPdf(e.target.value); else hitSuivant(e.shiftKey ? -1 : 1); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); e.target.blur(); } });
  // la molette zoome autour du pointeur (le pincement d'un pavé tactile arrive en molette + Ctrl) ; la main déplace ; deux doigts pincent
  sc.addEventListener('wheel', e => { e.preventDefault(); const r = zonePdf(), k = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)); zoomerPdf(k, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  const doigts = new Map(); let glisse = null, pince = null;
  sc.addEventListener('pointerdown', e => { if (e.button !== 0 && e.pointerType === 'mouse') return; doigts.set(e.pointerId, [e.clientX, e.clientY]); sc.setPointerCapture(e.pointerId);
    if (doigts.size === 2) { const [a, b] = [...doigts.values()]; pince = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: PDF.vue.s }; glisse = null; return; }
    glisse = { x: e.clientX, y: e.clientY, tx: PDF.vue.tx, ty: PDF.vue.ty, bouge: false }; sc.classList.add('tient'); });
  sc.addEventListener('pointermove', e => { if (!doigts.has(e.pointerId)) return; doigts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pince && doigts.size === 2) { const [a, b] = [...doigts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), r = zonePdf(); zoomerPdf(pince.s * d / pince.d / PDF.vue.s, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); return; }
    if (!glisse) return; const dx = e.clientX - glisse.x, dy = e.clientY - glisse.y; if (!glisse.bouge && Math.hypot(dx, dy) < 4) return; glisse.bouge = true;
    PDF.vue.tx = glisse.tx + dx; PDF.vue.ty = glisse.ty + dy; PDF.vue.cadre = false; poserFeuille(); });
  const lacher = e => { const g = glisse; doigts.delete(e.pointerId); if (doigts.size < 2) pince = null; sc.classList.remove('tient'); glisse = null;
    if (g && !g.bouge && e.type === 'pointerup') { const f = $('pdf-feuille').getBoundingClientRect(); if (e.clientX < f.left || e.clientX > f.right || e.clientY < f.top || e.clientY > f.bottom) return;
      if (PDF.assiste) clicAssiste(e); else liaisonSousLeClic(e); } };
  sc.addEventListener('pointerup', lacher); sc.addEventListener('pointercancel', lacher);
  // la relecture
  const rel = $('pdf-relecture');
  rel.addEventListener('click', e => { const t = e.target;
    if (t.closest('#pdf-fermer')) { fermerPdf(); return; }
    // un autre filtre : une autre liste, lue d'en haut — ou là où est la liaison choisie, si elle y est
    const f = t.closest('[data-filtre]'); if (f) { PDF.filtre = f.dataset.filtre; rendreRelecture(); $('pdf-corps').scrollTop = 0; ligneEnVue(PDF.choisie); return; }
    const g = t.closest('[data-pdf]'); if (g) { const k = g.dataset.pdf; if (k === 'plan') ouvrirPdfCommePlan(); else if (k === 'excel') enregistrerPdfEnExcel(); else if (k === 'assiste') basculerAssiste(true);
      else if (k === 'replier') { PDF.replie = !PDF.replie; $('pdf').classList.toggle('replie', PDF.replie); rendreRelecture(); setTimeout(() => { if (PDF.vue.cadre) cadrerPdf(); }, 260); }
      else if (k === 'suppr') { PDF.L.splice(+g.dataset.i, 1); PDF.choisie = -1; rendreRelecture(); peindreCalque(); } return; }
    const ob = t.closest('[data-orph]'); if (ob) { const L = PDF.lecture, k = ob.dataset.orph, liste = k[0] === 'o' ? L.pages.flatMap((P, j) => P.orphelins.map(o => ({ ...o, page: j }))) : L.pages.flatMap((P, j) => P.bornesSeules.map(o => ({ ...o, page: j }))), o = liste[+k.slice(1)];
      if (o) { PDF.vu = { page: o.page, p: o.p }; PDF.choisie = -1; if (o.page !== PDF.page - 1) allerPagePdf(o.page + 1, true); centrerPdf(o.p, true); peindreCalque(); rendreRelecture(); } return; }
    const tr = t.closest('tr[data-i]'); if (tr && !t.closest('input')) { PDF.vu = null; choisirLiaisonPdf(+tr.dataset.i); } });
  rel.addEventListener('dblclick', e => { const td = e.target.closest('td.pdf-c'); if (td && !td.querySelector('input')) corrigerCasePdf(td); });
  // le clavier, tant que la pièce est ouverte : Échap la ferme (ou la saisie, ou la recherche), les pages, le zoom, la recherche
  window.addEventListener('keydown', e => { if (!PDF.ouvert || !$('menu').hidden) return; const dans = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || ''), k = e.key;
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'f') { e.preventDefault(); e.stopPropagation(); $('pdf-q').focus(); $('pdf-q').select(); return; }
    if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); if (PDF.saisie && (PDF.saisie.a || !$('pdf-saisie').hidden)) { fermerSaisie(); peindreCalque(); } else if (PDF.assiste) basculerAssiste(false); else if (dans) e.target.blur(); else fermerPdf(); return; }
    if ((e.ctrlKey || e.metaKey) && /^[po]$/i.test(k)) { e.preventDefault(); e.stopPropagation(); if (k.toLowerCase() === 'o') choisirPdf(); return; }
    if (dans || e.ctrlKey || e.metaKey || e.altKey) { if ((e.ctrlKey || e.metaKey) && /^z$/i.test(k)) e.stopPropagation(); return; }
    const fait = { PageDown: () => allerPagePdf(PDF.page + 1, false), PageUp: () => allerPagePdf(PDF.page - 1, false), ArrowRight: () => allerPagePdf(PDF.page + 1, false), ArrowLeft: () => allerPagePdf(PDF.page - 1, false),
      '+': () => zoomerPdf(1.25), '=': () => zoomerPdf(1.25), '-': () => zoomerPdf(1 / 1.25), '0': cadrerPdf, '/': () => { $('pdf-q').focus(); }, l: () => basculerAssiste(), L: () => basculerAssiste(),
      ArrowDown: () => { const V = lignesVues(); if (!V.length) return; const j = V.findIndex(([, i]) => i === PDF.choisie); choisirLiaisonPdf(V[Math.min(V.length - 1, j + 1)][1]); },
      ArrowUp: () => { const V = lignesVues(); if (!V.length) return; const j = V.findIndex(([, i]) => i === PDF.choisie); choisirLiaisonPdf(V[Math.max(0, j - 1)][1]); } }[k];
    e.stopPropagation(); if (fait) { e.preventDefault(); fait(); } }, true);
  // ce qui part ailleurs (la bibliothèque, un document du menu) referme la pièce ; « Lire un PDF » non
  document.addEventListener('click', e => { if (!PDF.ouvert) return; const b = e.target.closest && e.target.closest('#menu [data-act], #en-biblio, #en-install'); if (b && b.dataset.act !== 'pdf') fermerPdf(); }, true);
  let tr = 0; window.addEventListener('resize', () => { clearTimeout(tr); tr = setTimeout(() => { if (PDF.ouvert && PDF.vue.cadre) cadrerPdf(); }, 140); }); }

/* ---- les entrées : le menu (Plus › « Lire un PDF de schéma »), un PDF glissé n'importe où ----------------------------
   La ligne du menu porte data-act="pdf" ; son geste est posé ici, sur elle (le menu ne connaît pas cette action : le clic
   ne lui parvient pas). Un PDF déposé, même sur la bibliothèque ou une carte de « Vos fichiers », vient ici : on le prend
   avant eux, puis on rend le calme au dépôt (un « drop » vide qu'ils savent ignorer). */
function lierEntreesPdf() { const m = document.querySelector('#menu [data-act="pdf"]');
  if (m && !m.dataset.lie) { m.dataset.lie = '1'; m.addEventListener('click', e => { e.stopPropagation(); if (typeof fermerMenu === 'function') fermerMenu(); choisirPdf(); }); }
  window.addEventListener('drop', e => { const fs = e.dataTransfer && e.dataTransfer.files ? [...e.dataTransfer.files] : [], f = fs.find(estPdf); if (!f) return;
    e.preventDefault(); e.stopImmediatePropagation(); window.dispatchEvent(new Event('drop')); ouvrirPdf(f); }, true); }
if (typeof document !== 'undefined') lierEntreesPdf();
