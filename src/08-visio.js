/* ===========================================================================
   08 — UN SCHÉMA VISIO : l'ouvrir, le relire, enregistrer les folios en Visio
   ---------------------------------------------------------------------------
   Le lecteur : « Il faut gérer les PDF mais aussi tout ce qui n'est pas PDF
   mais que de la visio, c'est très très important. » Ses schémas sont des
   .vsdx ; il veut les deux sens :
     · LIRE un Visio pour en faire le retest Excel ou un plan de Volta. Un
       .vsdx déposé n'importe où (08-fichiers, `ouvrirFichier`, ou le dépôt
       pris ici avant les autres) ou ouvert par « Plus › Lire un schéma
       Visio… » s'ouvre dans la même pièce que le lecteur de PDF (08-pdf : ses
       classes, sa mise en page) — les vignettes des pages, la page rendue sur
       papier blanc (09-visio la dessine en SVG : net à tout zoom), la
       recherche, et la RELECTURE : chaque liaison lue (collée, ou suivie à la
       géométrie), sa confiance et ses raisons, surlignée d'un clic ; une case
       se corrige d'un double-clic ; puis « Ouvrir comme plan » ou
       « Enregistrer en retest Excel » ;
     · ÉCRIRE les folios de Volta en Visio (« Exporter › Les folios en Visio
       (.vsdx) ») pour les retoucher dans Visio : une page par folio, chaque
       bloc un groupe et ses bornes en points de connexion, chaque câble un
       connecteur collé aux deux bornes, le cartouche en tableau (09-visio).
   Rien ne sort du poste : le zip (fflate) est embarqué, le rendu est fait
   ici.
   =========================================================================== */
'use strict';

const VISIO = { ouvert: false, nom: '', lu: null, L: [], choisie: -1, filtre: 'tout', page: 1, n: 0, vue: { s: 1, tx: 0, ty: 0, cadre: true },
  q: '', hits: [], hit: -1, vu: null, erreur: '', svgs: [], lecture: null, replie: false };
const estVisio = f => !!f && (/\.vs[dt][xm]$/i.test(f.name || '') || /ms-visio\.drawing/i.test(f.type || ''));
const estVisioAncien = f => !!f && /\.(vsd|vdx|vss|vst)$/i.test(f.name || '');

/* ---- le paquet : le zip ouvert (fflate), ses parties XML en texte ------------------------------------------------- */
function paquetVisio(octets) { if (typeof fflate === 'undefined') throw new Error('le lecteur de fichiers Visio n’est pas embarqué dans ce fichier');
  let z; try { z = fflate.unzipSync(octets, { filter: f => /\.(xml|rels)$/i.test(f.name) }); } catch (e) { throw new Error('ce fichier n’est pas un zip lisible (' + (e && e.message || e) + ')'); }
  return z; }
async function ouvrirVisio(fichier) { if (!fichier) return; const nom = fichier.name || 'schéma.vsdx';
  if (estVisioAncien(fichier)) { dire(guillemets(nom) + ' est un Visio d’avant 2013 (.vsd, .vdx) : ouvrez-le dans Visio et enregistrez-le en .vsdx, puis déposez-le ici.', true); return; }
  dire('Lecture de ' + guillemets(nom) + '…');
  let lu; const t0 = performance.now();
  try { const z = paquetVisio(new Uint8Array(await fichier.arrayBuffer())); lu = lireSchemaVisio(z); }
  catch (e) { dire(nom + ' ne s’ouvre pas comme un dessin Visio : ' + String(e && e.message || e) + '.', true); return; }
  lu.ms = Math.round(performance.now() - t0);
  Object.assign(VISIO, { nom, lu, lecture: lu, n: lu.pages.length, page: 1, L: lu.liaisons.map((l, i) => ({ ...l, id: 'v' + i, main: new Set() })), choisie: -1, filtre: 'tout', q: '', hits: [], hit: -1, vu: null, erreur: '', svgs: [] });
  construireVisio(); montrerVisio(); VISIO.vue.cadre = true; rendreVignettesVisio(); poserPageVisio(); cadrerVisio(); rendreRelectureVisio(); peindreCalqueVisio(); synchroniserPageVisio();
  const n = VISIO.L.length, c = VISIO.L.filter(l => l.colle).length;
  dire(n ? pluriel(n, 'liaison') + ' lue' + (n > 1 ? 's' : '') + ' dans ' + guillemets(nom) + (c ? ' · ' + (c === n ? 'tous les câbles collés' : c + ' collée' + (c > 1 ? 's' : '') + ' à leurs bornes') : '') + (VISIO.n > 1 ? ' · ' + pluriel(VISIO.n, 'page') : '') + '.'
    : 'Aucune liaison lue dans ' + guillemets(nom) + ' : ni connecteur collé, ni trait qui relie deux bornes.'); }
// (le clavier, comme la pièce du PDF : pris à l'ouverture, rendu à l'ouvreur — 08-pdf, `ouvreurDePiece`)
function montrerVisio() { const el = $('visio'); if (el.hidden) VISIO.ouvreur = ouvreurDePiece(el); if (typeof fermerFiche === 'function') fermerFiche(); if (typeof fermerMenu === 'function') fermerMenu();
  if (typeof fermerPdf === 'function') fermerPdf();
  el.hidden = false; el.classList.remove('entre'); void el.offsetWidth; el.classList.add('entre'); document.body.classList.add('visio-ouvert'); VISIO.ouvert = true; $('visio-q').value = VISIO.q;
  el.tabIndex = -1; if (!el.contains(document.activeElement)) el.focus({ preventScroll: true }); }
function fermerVisio() { const el = $('visio'); if (!el || el.hidden) return; const garde = el.contains(document.activeElement) || document.activeElement === document.body;
  el.hidden = true; document.body.classList.remove('visio-ouvert'); VISIO.ouvert = false; if (garde) rendreClavierDePiece(el, VISIO.ouvreur); }
const choisirVisio = () => { construireVisio(); $('fichier-visio').click(); };

/* ---- la page : sa place sur la table ; le dessin est un SVG (09-visio), net à tout zoom --------------------------- */
const taillePageVisio = n => { const P = VISIO.lu && VISIO.lu.pages[(n || VISIO.page) - 1]; return P ? [P.page.w, P.page.h] : [1191, 842]; };
function zoneVisio() { const sc = $('visio-scene'); return sc ? sc.getBoundingClientRect() : { width: 800, height: 600, left: 0, top: 0 }; }
// la table visible : entre les vignettes et la relecture ; au téléphone (la relecture en tiroir, comme le PDF), au-dessus
function visibleVisio() { const r = zoneVisio(), g = $('visio-vignettes'), d = $('visio-relecture'), o = $('visio-outils');
  const G = g && g.offsetParent ? g.getBoundingClientRect() : null, D = d ? d.getBoundingClientRect() : null;
  if (D && D.width && D.left - r.left < r.width / 3) { const haut = Math.min(D.top, o ? o.getBoundingClientRect().top : D.top) - r.top; return { x0: 0, x1: r.width, y0: 0, y1: Math.max(120, haut) }; }
  const x0 = G ? G.right - r.left : 0, x1 = D ? D.left - r.left : r.width;
  return { x0, x1: Math.max(x0 + 100, x1), y0: 0, y1: r.height - 50 }; }
function cadrerVisio() { const v = visibleVisio(), [w, h] = taillePageVisio(), m = 24, s = Math.max(0.05, Math.min((v.x1 - v.x0 - 2 * m) / w, (v.y1 - v.y0 - 2 * m) / h));
  VISIO.vue = { s, tx: (v.x0 + v.x1 - w * s) / 2, ty: Math.max(m, (v.y1 - h * s) / 2), cadre: true }; poserFeuilleVisio(); }
function poserFeuilleVisio() { const f = $('visio-feuille'); if (!f) return; const [w, h] = taillePageVisio(), { s, tx, ty } = VISIO.vue;
  f.style.width = Math.round(w * s) + 'px'; f.style.height = Math.round(h * s) + 'px'; f.style.transform = `translate(${Math.round(tx)}px,${Math.round(ty)}px)`;
  const z = $('visio-zoom'); if (z) z.textContent = Math.round(s * 100 / (96 / 72)) + ' %'; }
function zoomerVisio(k, cx, cy) { if (cx == null) { const v = visibleVisio(); cx = (v.x0 + v.x1) / 2; cy = (v.y0 + v.y1) / 2; } const v = VISIO.vue, s = Math.max(0.08, Math.min(16, v.s * k)), q = s / v.s;
  VISIO.vue = { s, tx: cx - (cx - v.tx) * q, ty: cy - (cy - v.ty) * q, cadre: false }; poserFeuilleVisio(); }
function centrerVisio(p, lisible) { const v = visibleVisio(); if (lisible && VISIO.vue.s < 1.6) VISIO.vue.s = 1.6;
  VISIO.vue.tx = (v.x0 + v.x1) / 2 - p[0] * VISIO.vue.s; VISIO.vue.ty = (v.y0 + v.y1) / 2 - p[1] * VISIO.vue.s; VISIO.vue.cadre = false; poserFeuilleVisio(); }
// le dessin d'une page, une fois : SVG (09-visio) ; le papier est blanc dans les deux thèmes
function svgVisio(n) { if (!VISIO.svgs[n - 1]) VISIO.svgs[n - 1] = SCHEMA_VISIO.svgDePage(VISIO.lu.pages[n - 1]); return VISIO.svgs[n - 1]; }
function poserPageVisio() { const d = $('visio-dessin'); if (!d || !VISIO.lu) return; d.innerHTML = svgVisio(VISIO.page); }
function allerPageVisio(n, garder) { n = Math.max(1, Math.min(VISIO.n, n)); if (n === VISIO.page && garder) return; VISIO.page = n; poserPageVisio();
  if (!garder || VISIO.vue.cadre) cadrerVisio(); else poserFeuilleVisio(); peindreCalqueVisio(); synchroniserPageVisio(); rendreRelectureVisio(); }
function synchroniserPageVisio() { const l = $('visio-num'); if (l) l.textContent = VISIO.page + ' / ' + VISIO.n;
  $('visio-prec').disabled = VISIO.page <= 1; $('visio-suiv').disabled = VISIO.page >= VISIO.n;
  document.querySelectorAll('#visio-vignettes .pdf-vig').forEach(v => { const on = +v.dataset.page === VISIO.page; v.classList.toggle('on', on); v.setAttribute('aria-current', on ? 'page' : 'false'); if (on) v.scrollIntoView({ block: 'nearest' }); }); }
function cadrerSurLiaisonVisio(l) { const ici = l.page === VISIO.page - 1, pts = [...(ici ? l.bouts : l.boutsVers) || [], ...((ici ? l.trajet : l.trajetVers) || []).flat()]; if (!pts.length) return;
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), B = { x0: Math.min(...xs) - 30, y0: Math.min(...ys) - 30, x1: Math.max(...xs) + 30, y1: Math.max(...ys) + 30 }, v = visibleVisio();
  const tient = Math.min((v.x1 - v.x0) * 0.8 / (B.x1 - B.x0), (v.y1 - v.y0) * 0.8 / (B.y1 - B.y0)), s = Math.min(2.5 * 96 / 72, tient, Math.max(VISIO.vue.s, Math.min(tient, 1.4)));
  VISIO.vue.s = s; centrerVisio([(B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2]); }
// les vignettes : le même dessin, en image (une Data URL : rien ne part)
function rendreVignettesVisio() { const box = $('visio-vignettes'); box.innerHTML = '';
  for (let i = 1; i <= VISIO.n; i++) { const [w, h] = taillePageVisio(i), b = document.createElement('button'); b.type = 'button'; b.className = 'pdf-vig'; b.dataset.page = i;
    const P = VISIO.lu.pages[i - 1]; b.setAttribute('aria-label', 'Page ' + i + (P.nom ? ' : ' + P.nom : ''));
    b.innerHTML = `<span class="pdf-vig-p" style="aspect-ratio:${w}/${h}"><img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgVisio(i))}"></span><span class="pdf-vig-n">${esc(P.nom || String(i))}</span>`; box.appendChild(b); } }

/* ---- le calque : la liaison choisie, la recherche, un bout orphelin (en points de la page) -------------------------- */
function peindreCalqueVisio() { const sv = $('visio-calque'); if (!sv || !VISIO.lu) return; const [w, h] = taillePageVisio(), n = VISIO.page - 1; sv.setAttribute('viewBox', `0 0 ${w} ${h}`); let s = '';
  const rect = (B, cls) => `<rect class="${cls}" x="${B.x0.toFixed(2)}" y="${B.y0.toFixed(2)}" width="${(B.x1 - B.x0).toFixed(2)}" height="${(B.y1 - B.y0).toFixed(2)}"/>`;
  VISIO.hits.forEach((x, i) => { if (x.page === n) s += rect({ x0: x.B.x0 - 1, y0: x.B.y0 - 1, x1: x.B.x1 + 1, y1: x.B.y1 + 1 }, 'pdf-hit' + (i === VISIO.hit ? ' on' : '')); });
  if (VISIO.vu && VISIO.vu.page === n) { const o = VISIO.vu.p; s += `<g class="pdf-orph"><circle cx="${o[0]}" cy="${o[1]}" r="6"/><path d="M${o[0] - 4} ${o[1] - 4}l8 8m0 -8l-8 8"/></g>`; }
  const l = VISIO.L[VISIO.choisie];
  if (l && (l.page === n || l.pageVers === n)) { const ici = l.page === n, tr = ici ? l.trajet : l.trajetVers, bs = ici ? l.bouts : l.boutsVers, et = etatConf(l.main.size ? 1 : l.conf);
    s += `<g class="pdf-sel e-${et}">` + (tr || []).map(([a, b]) => `<line class="pdf-halo" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`).join('')
      + (tr || []).map(([a, b]) => `<line class="pdf-trait" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`).join('')
      + (ici ? (l.mots || []).filter(Boolean).map(B => rect({ x0: B.x0 - 0.8, y0: B.y0 - 0.8, x1: B.x1 + 0.8, y1: B.y1 + 0.8 }, 'pdf-mot')).join('') : '')
      + (bs || []).map(p => `<circle class="pdf-bout" cx="${p[0]}" cy="${p[1]}" r="3.2"/>`).join('') + '</g>'; }
  sv.innerHTML = s; }

/* ---- la recherche : les textes de toutes les pages (déjà lus) -------------------------------------------------------- */
function chercherVisio(q) { VISIO.q = q = String(q || '').trim(); VISIO.hits = []; VISIO.hit = -1;
  if (q && VISIO.lu) { const Q = q.toLowerCase(); VISIO.lu.pages.forEach((P, n) => (P.mots || []).forEach(m => { if (!m.partie && m.s.toLowerCase().includes(Q)) VISIO.hits.push({ page: n, B: m.B, s: m.s }); }));
    VISIO.hits.sort((a, b) => a.page - b.page || a.B.y0 - b.B.y0 || a.B.x0 - b.B.x0); const ici = VISIO.hits.findIndex(x => x.page === VISIO.page - 1); VISIO.hit = ici >= 0 ? ici : VISIO.hits.length ? 0 : -1; }
  majCompteVisio(); if (VISIO.hit >= 0) viserHitVisio(); else peindreCalqueVisio(); }
function majCompteVisio() { const c = $('visio-q-n'); if (!c) return; const q = VISIO.q; c.textContent = !q ? '' : VISIO.hits.length ? (VISIO.hit + 1) + ' / ' + VISIO.hits.length : 'rien'; c.classList.toggle('rien', !!q && !VISIO.hits.length); }
function viserHitVisio() { const x = VISIO.hits[VISIO.hit]; if (!x) return; if (x.page !== VISIO.page - 1) allerPageVisio(x.page + 1, true); centrerVisio([(x.B.x0 + x.B.x1) / 2, (x.B.y0 + x.B.y1) / 2], true); peindreCalqueVisio(); majCompteVisio(); }
function hitSuivantVisio(pas) { if (!VISIO.hits.length) return; VISIO.hit = (VISIO.hit + pas + VISIO.hits.length) % VISIO.hits.length; viserHitVisio(); }

/* ---- la relecture : la feuille de droite (celle du PDF : ses colonnes, ses filtres, ses raisons) ------------------- */
const COLS_VISIO = [['de', 'De'], ['borneDe', 'Borne'], ['vers', 'Vers'], ['borneVers', 'Borne'], ['type', 'Référence'], ['folio', 'Folio']];
function lignesVuesVisio() { return VISIO.L.map((l, i) => [l, i]).filter(([l]) => VISIO.filtre === 'tout' || (VISIO.filtre === 'revoir' ? !l.main.size && l.conf < 0.9 : VISIO.filtre === 'page' ? (l.page === VISIO.page - 1 || l.pageVers === VISIO.page - 1) : true)); }
function rendreRelectureVisio() { const box = $('visio-relecture'); if (!box || !VISIO.lu) return; const L = VISIO.lu, n = VISIO.L.length, revoir = VISIO.L.filter(l => !l.main.size && l.conf < 0.9).length, colles = VISIO.L.filter(l => l.colle).length;
  const etat = lies([pluriel(VISIO.n, 'page'), pluriel(n, 'liaison'), colles ? (colles === n ? 'toutes collées' : colles + ' collée' + (colles > 1 ? 's' : '')) : '', revoir ? revoir + ' à revoir' : '']);
  const tete = `<div class="fiche-tete"><div class="min0"><div class="sur">Schéma Visio</div><h2 class="titre">${esc(VISIO.nom)}</h2></div><button class="rond fermer" id="visio-fermer" aria-label="Fermer le schéma (Échap)"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg><span class="bulle" aria-hidden="true">Fermer<kbd>Échap</kbd></span></button></div>`;
  const P = L.pages[VISIO.page - 1] || {}, ch = P.champs || {}, cart = [ch.numero || L.numero, ch.folio ? 'folio ' + ch.folio : '', ch.indice || L.indice ? 'indice ' + (ch.indice || L.indice) : ''].filter(Boolean);
  let haut = `<p class="pdf-etat" id="visio-etat" role="status">${etat}</p>` + (cart.length ? `<p class="pdf-cart">Cartouche : <span class="id">${cart.map(esc).join('</span>' + POINT + '<span class="id">')}</span></p>` : '') + (P.nom ? `<p class="pdf-cart">Page : <span class="id">${esc(P.nom)}</span>${P.plan && P.plan !== P.nom ? POINT + 'plan <span class="id">' + esc(P.plan) + '</span>' : ''}</p>` : ''), corps = '';
  haut += `<div class="pdf-filtres segment" role="group" aria-label="Lignes montrées">${[['tout', 'Toutes', n], ['revoir', 'À revoir', revoir], ['page', 'Cette page', VISIO.L.filter(l => l.page === VISIO.page - 1 || l.pageVers === VISIO.page - 1).length]].map(([k, t, c]) => `<button data-filtre="${k}" aria-pressed="${VISIO.filtre === k}">${t}<i>${c}</i></button>`).join('')}</div>`;
  const V = lignesVuesVisio();
  corps += `<table class="pdf-tab" id="visio-tab"><thead><tr>${COLS_VISIO.map(([k, t]) => `<th data-k="${k}">${t}</th>`).join('')}<th class="pdf-th-c">Confiance</th></tr></thead><tbody>`
    + V.map(([l, i]) => { const c = l.main.size ? 1 : l.conf, e = etatConf(c), sel = i === VISIO.choisie;
      return `<tr data-i="${i}" class="${sel ? 'choisie' : ''}"${sel ? ' aria-selected="true"' : ''}>${COLS_VISIO.map(([k]) => `<td class="pdf-c${l.main.has(k) ? ' main' : ''}${/^borne/.test(k) ? ' b' : ''}" data-k="${k}">${esc(l[k] || '')}${k === 'de' && l.pnDe ? `<small>${esc(l.pnDe)}</small>` : k === 'vers' && l.pnVers ? `<small>${esc(l.pnVers)}</small>` : k === 'type' && l.cable ? `<small>${esc(l.cable)}</small>` : ''}</td>`).join('')}`
        + `<td class="pdf-conf e-${e}"><i aria-hidden="true"></i>${l.main.size ? 'main' : l.colle ? 'collée' : pourcentPdf(c)}</td></tr>`
        + (sel ? `<tr class="pdf-raisons"><td colspan="${COLS_VISIO.length + 1}"><p class="pdf-detail">${esc(lies([l.type ? 'type ' + l.type : 'sans type', l.cable ? 'câble ' + l.cable : '', 'folio ' + (l.folio || '—')]))}</p><ul>${(l.raisons || []).map(r => `<li>${esc(r)}</li>`).join('')}</ul><div class="pdf-geste"><span class="pdf-astuce">Double-clic sur une case pour la corriger.</span><button class="btn lien" data-visio="suppr" data-i="${i}">Supprimer cette liaison</button></div></td></tr>` : ''); }).join('')
    + `</tbody></table>` + (V.length ? '' : `<p class="pdf-vide">${VISIO.filtre === 'revoir' ? 'Rien à revoir : chaque liaison est lue avec assurance.' : VISIO.filtre === 'page' ? 'Aucune liaison lue sur cette page.' : 'Aucune liaison lue : ni connecteur collé, ni trait qui relie deux bornes.'}</p>`);
  const O = L.pages.flatMap((Q, k) => Q.orphelins.map(o => ({ ...o, page: k })));
  if (O.length) corps += `<details class="pdf-orphelins"${O.length < 8 ? ' open' : ''}><summary>Bouts orphelins<i>${O.length}</i></summary><ul>` + O.map((o, k) => `<li><button data-orph="${k}"><span class="pdf-o-p">p. ${o.page + 1}</span>${esc(o.raison)}</button></li>`).join('') + '</ul></details>';
  const pied = `<button class="btn cuivre" data-visio="plan"${n ? '' : ' disabled'}>Ouvrir comme plan</button><button class="btn papier" data-visio="excel"${n ? '' : ' disabled'}>Enregistrer en Excel d’installation</button>`;
  const y = $('visio-corps') ? $('visio-corps').scrollTop : 0;
  // au téléphone, la relecture est le tiroir du bas : sa poignée le replie, le déplie (le CSS du PDF ne la montre que là)
  const poignee = `<button class="pdf-poignee" data-visio="replier" type="button" aria-expanded="${!VISIO.replie}" aria-label="${VISIO.replie ? 'Déplier' : 'Replier'} la relecture"><i aria-hidden="true"></i></button>`;
  box.innerHTML = `<div class="pdf-haut">${poignee}${tete}${haut}</div><div class="pdf-liste" id="visio-corps">${corps}</div><div class="fiche-pied">${pied}</div>`;
  $('visio-corps').scrollTop = y; if (typeof typographier === 'function') typographier(box); }
function choisirLiaisonVisio(i, centrer) { if (i === VISIO.choisie && centrer !== true) return; VISIO.choisie = i; const l = VISIO.L[i];
  if (l && l.page !== VISIO.page - 1 && l.pageVers !== VISIO.page - 1) allerPageVisio(l.page + 1, true); else rendreRelectureVisio();
  if (l) { peindreCalqueVisio(); if (centrer !== false && l.bouts) cadrerSurLiaisonVisio(l); }
  const tr = $('visio-tab') && $('visio-tab').querySelector(`tr[data-i="${i}"]`); if (tr) { const r = tr.nextElementSibling; if (r && r.classList.contains('pdf-raisons')) r.scrollIntoView({ block: 'nearest' }); tr.scrollIntoView({ block: 'nearest' }); } }
// corriger une case : Entrée ou Tab écrit, Échap rend ; la liaison passe « main »
function corrigerCaseVisio(td) { const tr = td.closest('tr'), i = +tr.dataset.i, k = td.dataset.k, l = VISIO.L[i]; if (!l) return;
  const inp = document.createElement('input'); inp.className = 'pdf-in'; inp.value = l[k] || ''; inp.spellcheck = false; inp.setAttribute('aria-label', COLS_VISIO.find(c => c[0] === k)[1]);
  td.textContent = ''; td.appendChild(inp); inp.focus(); inp.select(); let fini = false;
  const ecrire = suivant => { if (fini) return; fini = true; const v = inp.value.trim(); if (v !== (l[k] || '')) { l[k] = v; l.main.add(k); if (k === 'folio') l.plan = l.fwd = v; }
    rendreRelectureVisio(); peindreCalqueVisio(); if (suivant) { const ks = COLS_VISIO.map(c => c[0]), j = ks.indexOf(k) + suivant, c = $('visio-tab').querySelector(`tr[data-i="${i}"] td[data-k="${ks[j]}"]`); if (c) corrigerCaseVisio(c); } };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ecrire(0); } else if (e.key === 'Tab') { e.preventDefault(); ecrire(e.shiftKey ? -1 : 1); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fini = true; rendreRelectureVisio(); } });
  inp.addEventListener('blur', () => ecrire(0)); }
// un clic sur un câble de la page choisit sa liaison
const versPageVisio = (cx, cy) => { const r = $('visio-feuille').getBoundingClientRect(), s = VISIO.vue.s; return [(cx - r.left) / s, (cy - r.top) / s]; };
function liaisonSousLeClicVisio(e) { const p = versPageVisio(e.clientX, e.clientY), n = VISIO.page - 1, tol = 6 / VISIO.vue.s; let best = -1, bd = tol;
  VISIO.L.forEach((l, i) => { const tr = l.page === n ? l.trajet : l.pageVers === n ? l.trajetVers : null; (tr || []).forEach(([a, b]) => { const vx = b[0] - a[0], vy = b[1] - a[1], L2 = vx * vx + vy * vy;
    const t = L2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / L2)) : 0, d = Math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy); if (d < bd) { bd = d; best = i; } }); });
  if (best >= 0) { if (VISIO.filtre !== 'tout' && !lignesVuesVisio().some(([, i]) => i === best)) VISIO.filtre = 'tout'; VISIO.vu = null; choisirLiaisonVisio(best, false); } }

/* ---- sortir : un plan de Volta, un retest Excel ------------------------------------------------------------------- */
const liaisonsDuVisio = () => VISIO.L.filter(l => l.de && l.vers).map(l => ({ de: l.de, borneDe: l.borneDe, pnDe: l.pnDe, vers: l.vers, borneVers: l.borneVers, pnVers: l.pnVers, type: l.type, cable: l.cable, route: l.route || '', plan: l.plan || l.folio, fwd: l.plan || l.folio, harness: l.harness || '' }));
const nomSansVisio = () => VISIO.nom.replace(/\.vs[dt][xm]$/i, '');
function ouvrirVisioCommePlan() { const L = liaisonsDuVisio(); if (!L.length) return; const nom = nomSansVisio();
  fermerVisio(); chargerContrat(L, 'lecture de ' + VISIO.nom, nom, { nouveau: true }); if (typeof contratRecu === 'function') contratRecu(nom, 'schéma Visio');
  dire(pluriel(L.length, 'liaison') + ' lue' + (L.length > 1 ? 's' : '') + ' dans ' + guillemets(VISIO.nom) + (plans().length > 1 ? ' · ' + plans().length + ' folios' : '') + ' : un plan neuf, Ctrl+Z revient.'); }
function classeurDuVisio() { const L = liaisonsDuVisio(), ent = COLONNES_RETEST.map(c => c[0]), lignes = [ent, ...L.map(l => COLONNES_RETEST.map(([, ch]) => ch === 'fwd' ? l.fwd : l[ch] == null ? '' : l[ch]))];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lignes), 'Installation'); return { wb, n: L.length }; }
function enregistrerVisioEnExcel() { const { wb, n } = classeurDuVisio(); if (!n) return; const nom = nomSansVisio() + '-retest.xlsx';
  telecharger(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nom);
  dire(pluriel(n, 'liaison') + ' enregistrée' + (n > 1 ? 's' : '') + ' en Excel d’installation (' + nomAscii(nom) + ').'); }

/* ---- ÉCRIRE : les folios du plan ouvert, en Visio ----------------------------------------------------------------
   Le dessin de chaque folio, sans toucher à la vue : la retouche s'il y en a une, le dessin affiné, gardé ; sinon le
   moteur le place — au loin (le Worker du placement, comme pour l'écran : on attend sa réponse, l'écran reste libre),
   ou ici, un folio après l'autre, en rendant la main entre deux. Chaque bloc porte son dessin (le SVG du folio). */
const placementConnu = cle => (app.retouches && app.retouches.get(cle)) || (typeof affinage !== 'undefined' && affinage.profonds.get(cle)) || placements.get(cle) || null;
async function placementPourVisio(plan, k, n) { const L = liaisonsDe(plan); if (!L.length) return null; const cle = clePlacement(L);
  if (typeof reprendreRetouche === 'function') reprendreRetouche(cle, L); let P = placementConnu(cle); if (P) return P;
  dire('Le dessin du folio ' + plan + ' se prépare pour Visio (' + k + ' sur ' + n + ')…');
  if (placement.ailleurs && placement.worker !== false && L.length > SEUIL_ICI && (placement.attentes.has(cle) || demanderPlacement(cle, L, plan))) {
    for (let t = 0; t < 3000 && !(P = placementConnu(cle)) && placement.attentes.has(cle); t++) await new Promise(r => setTimeout(r, 200));
    if (P) return P; }
  await new Promise(r => setTimeout(r, 20)); P = meilleurPlacement(L); if (P) garderPlacement(cle, P); return P; }
function dessinPourVisio(plan) { const L = liaisonsDe(plan); if (!L.length) return null; const cle = clePlacement(L);
  let P = placementConnu(cle); if (!P) { P = meilleurPlacement(L); if (P) garderPlacement(cle, P); } if (!P) return null;
  const d = { comps: P.comps, links: P.links, bbox: pageDe(P.comps, P.routage.fils), geom: P.geom, compDe: P.compDe, fils: P.routage.fils, points: P.routage.points, barrettes: P.routage.barrettes, piquages: P.routage.piquages };
  const routes = couleursDesRoutes(), routeDe = w => (L[w.i] && L[w.i].route) || ''; d.couleurDe = w => routes.get(routeDe(w)) || null;
  d.legende = legendeDesRoutes(d.fils.filter(w => !w.shunt && String(w.de) !== String(w.vers)), routeDe, routes); nommerBarrettesAPoser(d.barrettes, L);
  // le folio se compose comme à l'écran (les connecteurs de chaque équipement, la place des repères), puis chaque bloc seul
  // le calibre que le folio écrit, et celui de l'installation quand Volta en retient un autre (« 15 A (installation 10 A) »)
  const disj = n => typeof calibresAuFolio === 'function' ? calibresAuFolio(n) : { calibre: calibreAuFolio(n) }, P2 = plans(), folio = P2.length > 1 ? plan + ' / ' + P2.length : '1 / 1';
  const scene = sceneSvg(d, app.contrat.cartouche, folio, designationDe, null, disj);
  // la place que le folio a trouvée pour le numéro de chaque câble (06, `reperesDeFil`) : le texte du connecteur s'y pose
  const places = new Map(); scene.replace(/<text class="filnum"(?: data-i="[^"]*")?(?: transform="rotate\(-90 [^)]*\)")? x="(-?[\d.]+)" y="(-?[\d.]+)"[^>]*>([^<]*)<\/text>/g, (m, x, y, nom) => {
    const debout = /rotate\(-90/.test(m), A = 0.365 * FS_FIL, n = nom.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    (places.get(n) || places.set(n, []).get(n)).push(debout ? { x: +x - A, y: +y, debout } : { x: +x, y: +y - A, debout }); return m; });
  const couleurBout = couleursDesBouts(d.fils.filter(w => !w.shunt), d.couleurDe);
  const pn = new Map(); L.forEach(l => { if (l.pnDe && !pn.has(l.de)) pn.set(l.de, l.pnDe); if (l.pnVers && !pn.has(l.vers)) pn.set(l.vers, l.pnVers); });
  const comps = d.comps.map(c => ({ ...c, svg: blocSvg(c, designationDe(c.name), null, couleurBout, c.kind === 'equip' && estDisjoncteur(c.name) ? disj(c.name) : null), pn: pn.get(c.name) || '', designation: designationDe(c.name) || '' }));
  const fils = d.fils.map(w => { const q = places.get(String(w.cable || '').trim()); return { ...w, route: routeDe(w), couleur: d.couleurDe(w), etiquette: (q && q.shift()) || null }; });
  const fwd = (L.find(l => l.fwd) || {}).fwd || '';
  return { plan, folio, fwd: fwd || plan, nom: /^\d+$/.test(plan) ? 'Folio ' + plan : plan, dessin: { comps, fils, bbox: d.bbox } }; }
async function docVisio() { const P = plans(), liste = P.length ? P : ['*'], c = app.contrat.cartouche || {}, V = verite();
  for (let k = 0; k < liste.length; k++) await placementPourVisio(liste[k], k + 1, liste.length);
  return { titre: c.titre || app.nom || 'Contrat de câblage', auteur: c.auteur || '', date: c.date || '', indice: c.indice || '', echelle: c.echelle || '', harness: (V.find(l => l.harness) || {}).harness || '',
    folios: liste.map(dessinPourVisio).filter(Boolean) }; }
function octetsVisio(doc) { const F = ecrireSchemaVisio(doc), z = {}; Object.keys(F).forEach(k => { z[k] = fflate.strToU8(F[k]); }); return fflate.zipSync(z, { level: 6 }); }
let exportVisioEnCours = false;
async function exporterVisio() { const V = verite(); if (!V.length) { dire('Aucun plan ouvert : rien à enregistrer en Visio.', true); return null; }
  if (typeof fflate === 'undefined') { dire('L’écriture des fichiers Visio n’est pas embarquée dans ce fichier.', true); return null; }
  if (exportVisioEnCours) { dire('Les folios s’enregistrent déjà en Visio…'); return null; }
  exportVisioEnCours = true; let doc; try { doc = await docVisio(); } finally { exportVisioEnCours = false; }
  if (!doc.folios.length) { dire('Le dessin des folios n’est pas prêt : réessayez dans un instant.', true); return null; }
  const octets = octetsVisio(doc), nom = (app.nom || 'volta').replace(/\.[^.]+$/, '') + '.vsdx', n = doc.folios.reduce((k, F) => k + F.dessin.fils.filter(w => !w.boucle).length, 0);
  telecharger(new Blob([octets], { type: 'application/vnd.ms-visio.drawing.main+xml' }), nom);
  dire(pluriel(doc.folios.length, 'folio') + ' enregistré' + (doc.folios.length > 1 ? 's' : '') + ' en Visio (' + nomAscii(nom) + ') : ' + pluriel(n, 'câble') + ' collé' + (n > 1 ? 's' : '') + ' à leurs bornes.');
  return { doc, octets, nom }; }

/* ---- la pièce : construite une fois (celle du PDF : ses classes), ses gestes ------------------------------------- */
function construireVisio() { if ($('visio')) return;
  const el = document.createElement('section'); el.id = 'visio'; el.className = 'pdf visio'; el.hidden = true; el.setAttribute('aria-label', 'Lire un schéma Visio');
  el.innerHTML = `<nav class="pdf-vignettes ilot-sombre" id="visio-vignettes" aria-label="Les pages"></nav>`
    + `<div class="pdf-scene" id="visio-scene"><div class="pdf-feuille" id="visio-feuille"><div class="visio-dessin" id="visio-dessin" aria-hidden="true"></div><svg class="pdf-calque" id="visio-calque" preserveAspectRatio="none" aria-hidden="true"></svg></div></div>`
    + `<div class="pdf-outils ilot-sombre" id="visio-outils" role="toolbar" aria-label="Pages, recherche et zoom">`
    + `<span class="pdf-palet">${rdPdf('visio-prec', 'prec', 'Page précédente', 'PgPréc')}<span class="pdf-num" id="visio-num">1 / 1</span>${rdPdf('visio-suiv', 'suiv', 'Page suivante', 'PgSuiv')}</span>`
    + `<span class="pdf-palet pdf-cherche">${icoPdf('loupe')}<input id="visio-q" type="search" placeholder="Chercher dans le schéma" aria-label="Chercher un texte dans le schéma" autocomplete="off" spellcheck="false"><span class="pdf-q-n" id="visio-q-n" aria-live="polite"></span></span>`
    + `<span class="pdf-palet">${rdPdf('visio-moins', 'moins', 'Dézoomer', '−')}<button class="rd zl" id="visio-zoom" type="button" aria-label="Ajuster la page à l’écran">100 %</button>${rdPdf('visio-plus', 'plus', 'Zoomer', '+')}${rdPdf('visio-cadre', 'cadre', 'Ajuster', '0')}</span></div>`
    + `<aside class="pdf-relecture" id="visio-relecture" aria-label="Les liaisons lues"></aside>`;
  document.body.appendChild(el);
  const inp = document.createElement('input'); inp.type = 'file'; inp.id = 'fichier-visio'; inp.accept = '.vsdx,.vsdm,application/vnd.ms-visio.drawing.main+xml'; inp.hidden = true; document.body.appendChild(inp);
  inp.addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) ouvrirVisio(f); e.target.value = ''; });
  lierVisio(); }
function lierVisio() { const sc = $('visio-scene'), o = (id, fn) => { $(id).onclick = fn; };
  o('visio-prec', () => allerPageVisio(VISIO.page - 1, false)); o('visio-suiv', () => allerPageVisio(VISIO.page + 1, false));
  o('visio-moins', () => zoomerVisio(1 / 1.25)); o('visio-plus', () => zoomerVisio(1.25)); o('visio-cadre', cadrerVisio); o('visio-zoom', cadrerVisio);
  $('visio-vignettes').addEventListener('click', e => { const v = e.target.closest('.pdf-vig'); if (v) allerPageVisio(+v.dataset.page, false); });
  let tq = 0; $('visio-q').addEventListener('input', e => { clearTimeout(tq); tq = setTimeout(() => chercherVisio(e.target.value), 160); });
  $('visio-q').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (VISIO.q !== e.target.value.trim()) chercherVisio(e.target.value); else hitSuivantVisio(e.shiftKey ? -1 : 1); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); e.target.blur(); } });
  sc.addEventListener('wheel', e => { e.preventDefault(); const r = zoneVisio(), k = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)); zoomerVisio(k, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  const doigts = new Map(); let glisse = null, pince = null;
  sc.addEventListener('pointerdown', e => { if (e.button !== 0 && e.pointerType === 'mouse') return; doigts.set(e.pointerId, [e.clientX, e.clientY]); sc.setPointerCapture(e.pointerId);
    if (doigts.size === 2) { const [a, b] = [...doigts.values()]; pince = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: VISIO.vue.s }; glisse = null; return; }
    glisse = { x: e.clientX, y: e.clientY, tx: VISIO.vue.tx, ty: VISIO.vue.ty, bouge: false }; sc.classList.add('tient'); });
  sc.addEventListener('pointermove', e => { if (!doigts.has(e.pointerId)) return; doigts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pince && doigts.size === 2) { const [a, b] = [...doigts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), r = zoneVisio(); zoomerVisio(pince.s * d / pince.d / VISIO.vue.s, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); return; }
    if (!glisse) return; const dx = e.clientX - glisse.x, dy = e.clientY - glisse.y; if (!glisse.bouge && Math.hypot(dx, dy) < 4) return; glisse.bouge = true;
    VISIO.vue.tx = glisse.tx + dx; VISIO.vue.ty = glisse.ty + dy; VISIO.vue.cadre = false; poserFeuilleVisio(); });
  const lacher = e => { const g = glisse; doigts.delete(e.pointerId); if (doigts.size < 2) pince = null; sc.classList.remove('tient'); glisse = null;
    if (g && !g.bouge && e.type === 'pointerup') { const f = $('visio-feuille').getBoundingClientRect(); if (e.clientX < f.left || e.clientX > f.right || e.clientY < f.top || e.clientY > f.bottom) return; liaisonSousLeClicVisio(e); } };
  sc.addEventListener('pointerup', lacher); sc.addEventListener('pointercancel', lacher);
  const rel = $('visio-relecture');
  rel.addEventListener('click', e => { const t = e.target;
    if (t.closest('#visio-fermer')) { fermerVisio(); return; }
    const f = t.closest('[data-filtre]'); if (f) { VISIO.filtre = f.dataset.filtre; rendreRelectureVisio(); $('visio-corps').scrollTop = 0; return; }
    const g = t.closest('[data-visio]'); if (g) { const k = g.dataset.visio; if (k === 'plan') ouvrirVisioCommePlan(); else if (k === 'excel') enregistrerVisioEnExcel();
      else if (k === 'replier') { VISIO.replie = !VISIO.replie; $('visio').classList.toggle('replie', VISIO.replie); rendreRelectureVisio(); setTimeout(() => { if (VISIO.vue.cadre) cadrerVisio(); }, 260); }
      else if (k === 'suppr') { const i = +g.dataset.i, l = VISIO.L.splice(i, 1)[0]; VISIO.choisie = -1; rendreRelectureVisio(); peindreCalqueVisio(); if (!l) return;
        // faire, puis « Rétablir » dans le mot qui passe
        const dit = 'Liaison ' + l.de + (l.borneDe ? ':' + l.borneDe : '') + ' → ' + l.vers + (l.borneVers ? ':' + l.borneVers : '') + ' retirée de la relecture.';
        const rendre = () => { VISIO.L.splice(i, 0, l); VISIO.choisie = i; rendreRelectureVisio(); peindreCalqueVisio(); };
        dire(dit, false, { geste: 'Rétablir', faire: rendre }); } return; }
    const ob = t.closest('[data-orph]'); if (ob) { const O = VISIO.lu.pages.flatMap((Q, j) => Q.orphelins.map(o => ({ ...o, page: j }))), o = O[+ob.dataset.orph];
      if (o) { VISIO.vu = { page: o.page, p: o.p }; VISIO.choisie = -1; if (o.page !== VISIO.page - 1) allerPageVisio(o.page + 1, true); centrerVisio(o.p, true); peindreCalqueVisio(); rendreRelectureVisio(); } return; }
    const tr = t.closest('tr[data-i]'); if (tr && !t.closest('input')) { VISIO.vu = null; choisirLiaisonVisio(+tr.dataset.i); } });
  rel.addEventListener('dblclick', e => { const td = e.target.closest('td.pdf-c'); if (td && !td.querySelector('input')) corrigerCaseVisio(td); });
  window.addEventListener('keydown', e => { if (!VISIO.ouvert || !$('menu').hidden) return; const dans = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || ''), k = e.key;
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'f') { e.preventDefault(); e.stopPropagation(); $('visio-q').focus(); $('visio-q').select(); return; }
    if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); if (dans) e.target.blur(); else fermerVisio(); return; }
    if ((e.ctrlKey || e.metaKey) && /^[po]$/i.test(k)) { e.preventDefault(); e.stopPropagation(); if (k.toLowerCase() === 'o') choisirVisio(); return; }
    if (dans || e.ctrlKey || e.metaKey || e.altKey) { if ((e.ctrlKey || e.metaKey) && /^z$/i.test(k)) e.stopPropagation(); return; }
    const fait = { PageDown: () => allerPageVisio(VISIO.page + 1, false), PageUp: () => allerPageVisio(VISIO.page - 1, false), ArrowRight: () => allerPageVisio(VISIO.page + 1, false), ArrowLeft: () => allerPageVisio(VISIO.page - 1, false),
      '+': () => zoomerVisio(1.25), '=': () => zoomerVisio(1.25), '-': () => zoomerVisio(1 / 1.25), '0': cadrerVisio, '/': () => { $('visio-q').focus(); },
      ArrowDown: () => { const V = lignesVuesVisio(); if (!V.length) return; const j = V.findIndex(([, i]) => i === VISIO.choisie); choisirLiaisonVisio(V[Math.min(V.length - 1, j + 1)][1]); },
      ArrowUp: () => { const V = lignesVuesVisio(); if (!V.length) return; const j = V.findIndex(([, i]) => i === VISIO.choisie); choisirLiaisonVisio(V[Math.max(0, j - 1)][1]); } }[k];
    e.stopPropagation(); if (fait) { e.preventDefault(); fait(); } }, true);
  document.addEventListener('click', e => { if (!VISIO.ouvert) return; const b = e.target.closest && e.target.closest('#menu [data-act], #en-biblio, #en-install'); if (b && b.dataset.act !== 'visio') fermerVisio(); }, true);
  let tr = 0; window.addEventListener('resize', () => { clearTimeout(tr); tr = setTimeout(() => { if (VISIO.ouvert && VISIO.vue.cadre) cadrerVisio(); }, 140); }); }

/* ---- les entrées : deux lignes du menu ⋮ (posées par `entreeDuMenu`, 08-interface), un .vsdx glissé n'importe où (même
   sur la bibliothèque ou une carte) qui vient ici, avant les autres ---------------------------------------------------- */
const ICONE_VISIO = '<rect x="3" y="4.5" width="7" height="6" rx="1.2"/><rect x="14" y="13.5" width="7" height="6" rx="1.2"/><path d="M10 7.5h3.5v9H14"/>';
function lierEntreesVisio() {
  if (typeof entreeDuMenu === 'function') {
    // Plus › « Lire un schéma Visio… », juste après le PDF de schéma
    const lire = entreeDuMenu({ act: 'visio', panneau: 'plus', libelle: 'Lire un schéma Visio…', icone: ICONE_VISIO + '<circle cx="13.5" cy="7.5" r="1.1" fill="currentColor"/>',
      aide: 'Un schéma Visio (.vsdx) : Volta lit ce qui est collé à quoi — bornes, repères, cartouche — et en fait une installation à relire.', faire: () => choisirVisio() });
    const pdf = document.querySelector('#mp-plus [data-act="pdf"]'), vide = lire && lire.parentElement;
    if (lire && pdf && pdf.parentElement !== vide) { pdf.after(lire); if (vide && !vide.querySelector('[role="menuitem"]')) vide.remove(); }
    // Exporter › le plan entier : « Les folios en Visio (.vsdx) », en tête
    entreeDuMenu({ act: 'vsdx', panneau: 'exporter', groupe: 'contrat', avant: 'suivi', libelle: 'Les folios en Visio (.vsdx)', icone: ICONE_VISIO, surLePlan: true, faire: exporterVisio,
      aide: 'Tous les folios du plan, à retoucher dans Visio : une page par folio, chaque bloc avec ses bornes, chaque câble collé aux deux bouts, le cartouche.' }); }
  window.addEventListener('drop', e => { const fs = e.dataTransfer && e.dataTransfer.files ? [...e.dataTransfer.files] : [], f = fs.find(x => estVisio(x) || estVisioAncien(x)); if (!f) return;
    e.preventDefault(); e.stopImmediatePropagation(); window.dispatchEvent(new Event('drop')); ouvrirVisio(f); }, true); }
if (typeof document !== 'undefined') lierEntreesVisio();
