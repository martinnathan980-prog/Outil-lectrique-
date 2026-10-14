/* ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
   LA BASE SEE (08 nonies) — l'Excel des vues de SEE Electrical Equipment Definition, lu sur place
   Le lecteur (octobre 2026) a tiré les vues de la base SEE dans Excel (Données → SQL Server → EED_View…) : « il y a
   trop de colonnes, 200 ; les photos, c'est beaucoup trop ; le fichier est sur le bureau, je ne peux pas l'envoyer ».
   Volta lit donc ce classeur SUR LE POSTE, sans rien en garder (ni dans le navigateur, ni ailleurs : fermer la page
   l'oublie), et montre, feuille par feuille, sur un écran qui tient en une photo : son nombre de lignes, ses colonnes
   REMPLIES (le taux de remplissage, deux valeurs d'exemple qu'on peut masquer), les colonnes vides à part. C'est tout
   ce qu'il faut pour apprendre à Volta à prendre les contacts, les câbles, les connecteurs et les accessoires de SEE.
   Le résumé se copie aussi en texte, ou s'enregistre (.txt), pour qui peut le faire passer autrement qu'en photo.
   ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const SEE = { lu: null, feuille: 0, exemples: true };
const LIGNES_SONDEES = 2000;                 // les colonnes se jugent sur les 2 000 premières lignes de chaque feuille
const LARGEUR_SEE = 'min(1480px, calc(100vw - var(--rail) - 320px))';   // large (la page se photographie) ; le plan garde 320 px à côté, comme pour les normes
const estExcel = f => /\.xls[xmb]?$/i.test((f && f.name) || '') || /sheet|excel/i.test((f && f.type) || '');
// une feuille de la base SEE : nommée d'après sa vue (EED_ViewCablesAndWires…) ou une fonction d'export de SEE
const estFeuilleSEE = n => /^(EED_|Export_)/i.test(String(n || ''));
const nomCourtSEE = n => String(n).replace(/^EED_(e?Cat_)?View_?/i, '').replace(/^EED_/i, '') || String(n);

/* Un Excel déposé ou ouvert n'importe où (la fenêtre, « Vos fichiers », la page des normes) : si ses feuilles portent
   les noms des vues de SEE, c'est la base SEE — elle se lit ici, et rend vrai ; sinon rien n'est fait. */
async function routerBaseSEE(fichier) { if (!estExcel(fichier) || typeof XLSX === 'undefined') return false;
  let buf; try { buf = await fichier.arrayBuffer(); const wb = XLSX.read(buf, { type: 'array', bookSheets: true }); if (!(wb.SheetNames || []).some(estFeuilleSEE)) return false; }
  catch (_) { return false; }
  await lireBaseSEE(fichier, buf); return true; }

/* Lire le classeur : chaque feuille résumée. Une grosse base (7 000 lignes de 200 colonnes) prend quelques secondes. */
async function lireBaseSEE(fichier, buf) { if (!fichier) return; const nom = fichier.name || 'la base SEE';
  if (typeof XLSX === 'undefined') { dire('La bibliothèque Excel manque : la base SEE ne peut pas se lire.', true); return; }
  dire('Lecture de ' + guillemets(nom) + '… (une grosse base prend quelques secondes)');
  await new Promise(r => setTimeout(r, 40));   // le mot s'affiche avant le calcul
  try { buf = buf || await fichier.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', sheetRows: LIGNES_SONDEES + 1, cellHTML: false, cellStyles: false });
    const feuilles = wb.SheetNames.map(n => resumerFeuilleSEE(n, wb.Sheets[n])).filter(f => f.colonnes.length || f.vides.length);
    if (!feuilles.length) { echecImport('normes', { texte: `${esc(nom)} : aucune feuille avec une ligne d’en-têtes.` }); return; }
    SEE.lu = { nom, feuilles, quand: new Date() }; SEE.feuille = 0; ficheBaseSEE();
    dire(guillemets(nom) + ' : ' + pluriel(feuilles.length, 'feuille') + ' lue' + (feuilles.length > 1 ? 's' : '') + ', rien n’est gardé. Une photo par feuille suffit.'); }
  catch (e) { echecImport('normes', { texte: `${esc(nom)} n’a pas pu être lu : ${esc(String(e && e.message || e))}.` }); } }

/* Une feuille : sa ligne d'en-têtes (la première qui a plusieurs cellules), son nombre de lignes (toute la feuille, pas
   seulement les lignes sondées), et pour chaque colonne : combien de lignes la remplissent, deux valeurs différentes,
   si ce sont des nombres, des identifiants internes (GUID) ou des oui/non. */
function resumerFeuilleSEE(nom, ws) { const vide = { nom, lignes: 0, sondees: 0, colonnes: [], vides: [] }; if (!ws) return vide;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: false });
  const k = rows.findIndex(r => Array.isArray(r) && r.filter(c => String(c).trim()).length > 1); if (k < 0) return vide;
  const entete = rows[k].map(c => String(c == null ? '' : c).trim()), corps = rows.slice(k + 1);
  const ref = ws['!fullref'] || ws['!ref']; let total = corps.length;
  if (ref) { try { const d = XLSX.utils.decode_range(ref); total = Math.max(corps.length, d.e.r - d.s.r - k); } catch (_) { } }
  const cols = entete.map((t, i) => { let n = 0, nombres = 0, guids = 0, bools = 0; const ex = [], vus = new Set();
    corps.forEach(r => { const v = r[i]; if (v === '' || v == null) return; n++; const s = String(v).trim();
      if (typeof v === 'number') nombres++; else if (typeof v === 'boolean' || /^(true|false|vrai|faux|yes|no|oui|non)$/i.test(s)) bools++; else if (/^\{?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i.test(s)) guids++;
      if (ex.length < 2 && s && !vus.has(s)) { vus.add(s); ex.push(s); } });
    const genre = !n ? '' : guids === n ? 'id' : bools === n ? 'oui/non' : nombres === n ? 'nombre' : '';
    return { nom: t || 'colonne ' + (i + 1), n, taux: corps.length ? n / corps.length : 0, exemples: ex, genre }; });
  return { nom, lignes: total, sondees: corps.length, colonnes: cols.filter(c => c.n), vides: cols.filter(c => !c.n).map(c => c.nom) }; }

/* ---- la page ------------------------------------------------------------------------------------------------- */
function ficheBaseSEE() { if (!SEE.lu) return; const deja = app.fiche && app.fiche.mode === 'see';
  ouvrirFiche({ mode: 'see', large: true }, baseSEEHtml(), baseSEEPiedHtml()); document.documentElement.style.setProperty('--fiche-l', LARGEUR_SEE);
  if (!deja) ajuster(true); lierBaseSEE(); }
function rendreBaseSEE() { if (!(app.fiche && app.fiche.mode === 'see') || !SEE.lu) return; const c = $('fiche-corps'), p = $('fiche-pied');
  c.innerHTML = baseSEEHtml(); p.innerHTML = baseSEEPiedHtml(); p.hidden = !p.innerHTML; c.scrollTop = 0; lierBaseSEE(); }
const tauxSEE = t => t >= 0.995 ? '100 %' : t < 0.01 ? '< 1 %' : Math.round(t * 100) + ' %';
const exempleSEE = s => s.length > 34 ? s.slice(0, 33) + '…' : s;
function baseSEEHtml() { const L = SEE.lu, F = L.feuilles[SEE.feuille] || L.feuilles[0], n = L.feuilles.length;
  const onglets = n > 1 ? `<div class="see-onglets" role="tablist" aria-label="Feuilles du classeur">${L.feuilles.map((f, i) => `<button type="button" role="tab" data-see-feuille="${i}" aria-selected="${i === SEE.feuille}" title="${escA(f.nom)}"><b>${esc(nomCourtSEE(f.nom))}</b><span>${esc(milliers(f.lignes))}</span></button>`).join('')}</div>` : '';
  const ligne = c => `<li class="see-col${c.taux < 0.05 ? ' rare' : ''}"><span class="see-c">${esc(c.nom)}</span><span class="see-t">${esc(tauxSEE(c.taux))}</span>`
    + `<span class="see-e">${c.genre === 'id' ? '<i>identifiant</i>' : SEE.exemples ? esc(c.exemples.map(exempleSEE).join(' · ')) : c.genre ? '<i>' + esc(c.genre) + '</i>' : ''}</span></li>`;
  const vides = F.vides.length ? `<details class="see-vides"><summary>${esc(pluriel(F.vides.length, 'colonne'))} vide${F.vides.length > 1 ? 's' : ''} dans les ${esc(milliers(F.sondees))} premières lignes</summary><p>${F.vides.map(esc).join(' · ')}</p></details>` : '';
  return `<div class="see">${nmTitre('Base SEE · lue sur ce poste, rien n’en sort', L.nom)}`
    + `<p class="see-mode">Volta a lu ton Excel ici, sans le garder. <b>Fais une photo de cet écran pour chaque feuille</b> et envoie-la-moi : avec les noms des colonnes, j’apprends à Volta à prendre tes contacts, tes câbles, tes connecteurs et tes accessoires.</p>`
    + `<div class="see-barre">${onglets}<label class="see-ex"><input type="checkbox" id="see-ex"${SEE.exemples ? ' checked' : ''}> Exemples de valeurs</label></div>`
    + `<section class="see-feuille" aria-label="${escA(F.nom)}"><div class="see-tete"><b class="see-nom">${esc(F.nom)}</b>`
    + `<span class="see-compte">${esc(milliers(F.lignes))} ligne${F.lignes > 1 ? 's' : ''} · ${esc(pluriel(F.colonnes.length + F.vides.length, 'colonne'))} : <b>${esc(String(F.colonnes.length))} remplie${F.colonnes.length > 1 ? 's' : ''}</b>${F.vides.length ? ', ' + esc(String(F.vides.length)) + ' vide' + (F.vides.length > 1 ? 's' : '') : ''}</span>`
    + `${n > 1 ? `<span class="see-pos">feuille ${SEE.feuille + 1} / ${n}</span>` : ''}</div>`
    + (F.colonnes.length ? `<ol class="see-cols">${F.colonnes.map(ligne).join('')}</ol>` : '<p class="see-rien">Aucune colonne remplie.</p>') + vides + '</section></div>'; }
function baseSEEPiedHtml() { const n = SEE.lu ? SEE.lu.feuilles.length : 0;
  return (n > 1 ? `<button class="btn papier" id="see-prec"${SEE.feuille ? '' : ' disabled'}>‹ Feuille précédente</button><button class="btn cuivre" id="see-suiv"${SEE.feuille < n - 1 ? '' : ' disabled'}>Feuille suivante ›</button>` : '')
    + `<span class="espace"></span><button class="btn lien" id="see-copier" title="Le résumé de toutes les feuilles, en texte : à coller dans un message">Copier le résumé</button><button class="btn papier" id="see-enregistrer" title="Le résumé de toutes les feuilles, dans un fichier texte">Enregistrer le résumé</button>`; }
function changerFeuilleSEE(i) { if (!SEE.lu) return; SEE.feuille = Math.max(0, Math.min(SEE.lu.feuilles.length - 1, i)); rendreBaseSEE();
  const b = $('fiche-corps').querySelector(`[data-see-feuille="${SEE.feuille}"]`); if (b && b.scrollIntoView) { try { b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) { } } }
function lierBaseSEE() { const c = $('fiche-corps'); if (!c) return;
  c.querySelectorAll('[data-see-feuille]').forEach(b => b.onclick = () => changerFeuilleSEE(+b.dataset.seeFeuille));
  const ex = $('see-ex'); if (ex) ex.onchange = () => { SEE.exemples = ex.checked; rendreBaseSEE(); };
  if ($('see-prec')) $('see-prec').onclick = () => changerFeuilleSEE(SEE.feuille - 1);
  if ($('see-suiv')) $('see-suiv').onclick = () => changerFeuilleSEE(SEE.feuille + 1);
  if ($('see-copier')) $('see-copier').onclick = copierResumeSEE;
  if ($('see-enregistrer')) $('see-enregistrer').onclick = () => { telecharger(new Blob(['﻿' + resumeSEE()], { type: 'text/plain;charset=utf-8' }), 'resume-base-SEE.txt'); dire('Le résumé de la base SEE est enregistré.'); }; }

/* ---- le résumé en texte : les noms des colonnes (et, si on les montre, les exemples), feuille par feuille ---------- */
function resumeSEE() { const L = SEE.lu; if (!L) return '';
  return [`Base SEE — ${L.nom} — résumé par Volta le ${L.quand.toLocaleDateString('fr-FR')}${SEE.exemples ? '' : ' (sans exemples)'}`, ...L.feuilles.map(F =>
    `\n== ${F.nom} — ${F.lignes} lignes — ${F.colonnes.length + F.vides.length} colonnes, ${F.colonnes.length} remplies ==\n`
    + F.colonnes.map(c => c.nom + ' | ' + tauxSEE(c.taux) + (c.genre === 'id' ? ' | identifiant' : SEE.exemples && c.exemples.length ? ' | ' + c.exemples.join(' ; ') : c.genre ? ' | ' + c.genre : '')).join('\n')
    + (F.vides.length ? '\nColonnes vides : ' + F.vides.join(', ') : ''))].join('\n') + '\n'; }
function copierResumeSEE() { const t = resumeSEE(), ok = () => dire('Résumé copié : colle-le dans un message.');
  const repli = () => { const a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select();
    let r = false; try { r = document.execCommand('copy'); } catch (_) { } a.remove(); if (r) ok(); else dire('La copie est refusée ici : « Enregistrer le résumé » le met dans un fichier.', true); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, repli); else repli(); }
