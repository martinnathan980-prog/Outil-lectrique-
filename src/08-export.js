/* ===========================================================================
   08 — LE RETEST CORRIGÉ, EN EXCEL : le livrable que le lecteur renvoie
   ---------------------------------------------------------------------------
   L'audit v72 (le parcours joué de bout en bout) : « rien ne rend le livrable » — le lecteur corrige dans Volta (un
   calibre, trois câbles grossis, un numéro), puis recopie tout à la main dans son retest. Volta garde déjà, sur chaque
   liaison, ce que portait le fichier là où on l'a changé (`l.avant` : changerLiaison, poserChamp) : il rend donc le
   retest tel qu'il est maintenant, dans SES seize colonnes et sa mise en page (titre, mémo, en-têtes en ligne 4 — Volta
   le relit tel quel), chaque case changée portant en commentaire ce qu'elle disait avant, et une feuille
   « Modifications » qui les liste (le câble, ses deux bouts, la colonne, avant → après). Rien ne part du poste : le
   fichier est fabriqué dans la page (SheetJS) et téléchargé.
   ========================================================================= */
// les seize colonnes du retest (tests/format-retest.js), dans son ordre, et le champ de la liaison que chacune porte
const COLONNES_RETEST = [['Harness', 'harness'], ['Device1', 'de'], ['Pin1', 'borneDe'], ['PN1', 'pnDe'], ['Description1', 'descriptionDe'],
  ['Cable T/G', 'type'], ['Cable Tag', 'cable'], ['Route', 'route'], ['Device2', 'vers'], ['Pin2', 'borneVers'], ['PN2', 'pnVers'],
  ['Description2', 'descriptionVers'], ['FWD', 'fwd'], ['Cable length (mm)', 'longueur'], ['Appareil', 'appareil'], ['Date retest', 'retest']];
// une valeur telle que la case l'écrit : la longueur en mm (Volta la garde en mètres), le FWD d'origine sinon le folio
const valeurRetest = (l, ch) => ch === 'longueur' ? (l.longueur > 0 ? Math.round(l.longueur * 1000) : '') : ch === 'fwd' ? (l.fwd || l.plan || '') : l[ch] == null ? '' : l[ch];
const motAvant = (ch, v) => v == null || v === '' ? 'vide' : ch === 'longueur' ? Math.round(v * 1000) + ' mm' : String(v);
/* Les modifications d'une liaison : [colonne, champ, avant, après] pour chaque champ que `l.avant` garde et qui a changé. */
function modificationsDe(l) { if (!l.avant) return [];
  return COLONNES_RETEST.filter(([, ch]) => ch in l.avant && (l.avant[ch] == null ? null : l.avant[ch]) !== (l[ch] == null ? null : l[ch]))
    .map(([col, ch]) => [col, ch, l.avant[ch], l[ch]]); }
/* Le classeur : la feuille « Retest » (titre, mémo, en-têtes en ligne 4, une ligne par liaison, les cases changées
   commentées, une 17e colonne « Modifié par Volta » qui les nomme) et la feuille « Modifications ». */
function classeurRetestCorrige(V, nom) { V = (V || []).filter(liaisonComplete); const mods = V.map(modificationsDe), n = mods.filter(m => m.length).length;
  const quand = new Date().toLocaleDateString('fr-FR'), entetes = [...COLONNES_RETEST.map(c => c[0]), 'Modifié par Volta'];
  const lignes = [[`Retest corrigé par Volta — ${nom || 'plan'}`], [`Le ${quand} · ${plurielLie(V.length, 'liaison')} · ${plurielLie(n, 'liaison')} modifiée${n > 1 ? 's' : ''} : chaque case changée porte en commentaire ce qu'elle disait avant`], [], entetes,
    ...V.map((l, i) => [...COLONNES_RETEST.map(([, ch]) => valeurRetest(l, ch)), mods[i].map(m => m[0]).join(', ')])];
  const ws = XLSX.utils.aoa_to_sheet(lignes);
  // le commentaire de chaque case changée : ce que portait le fichier
  V.forEach((l, i) => mods[i].forEach(([col, ch, av]) => { const c = COLONNES_RETEST.findIndex(x => x[1] === ch), ref = XLSX.utils.encode_cell({ r: 4 + i, c });
    if (!ws[ref]) ws[ref] = { t: 's', v: '' }; ws[ref].c = [{ a: 'Volta', t: 'Avant : ' + motAvant(ch, av) }]; ws[ref].c.hidden = true; }));
  ws['!cols'] = entetes.map(h => ({ wch: Math.max(10, Math.min(28, h.length + 3)) })); ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: 3 + V.length, c: entetes.length - 1 } }) };
  const M = [['Harness', 'Cable Tag', 'Device1', 'Pin1', 'Device2', 'Pin2', 'Colonne', 'Avant', 'Après']];
  V.forEach((l, i) => mods[i].forEach(([col, ch, av, ap]) => M.push([l.harness || '', l.cable || '', l.de, l.borneDe || '', l.vers, l.borneVers || '', col, motAvant(ch, av), motAvant(ch, ap)])));
  const wm = XLSX.utils.aoa_to_sheet(M.length > 1 ? M : [...M, ['', '', '', '', '', '', 'aucune modification', '', '']]); wm['!cols'] = M[0].map((h, j) => ({ wch: j < 6 ? 12 : 22 }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Retest'); XLSX.utils.book_append_sheet(wb, wm, 'Modifications');
  return { wb, liaisons: V.length, modifiees: n, cases: mods.reduce((s, m) => s + m.length, 0) }; }
/* Le geste : ⋮ → Exporter → « Le retest corrigé (Excel) ». */
function exporterRetestCorrige() { const V = verite(); if (!V.length) { dire('Aucun plan ouvert : rien à exporter.', true); return null; }
  const R = classeurRetestCorrige(V, app.nom), nom = (app.nom || 'plan') + '-retest-corrige.xlsx';
  telecharger(new Blob([XLSX.write(R.wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nom);
  dire(`Le retest corrigé est enregistré : ${plurielLie(R.liaisons, 'liaison')}, ${R.modifiees ? plurielLie(R.modifiees, 'liaison') + ' modifiée' + (R.modifiees > 1 ? 's' : '') + ' (' + plurielLie(R.cases, 'case') + ' commentée' + (R.cases > 1 ? 's' : '') + ', la feuille Modifications les liste)' : 'aucune modification'}.`);
  return R; }
