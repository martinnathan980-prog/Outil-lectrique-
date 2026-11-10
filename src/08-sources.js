/* ===========================================================================
   08 — LE BILAN ÉLECTRIQUE (v91) : ce que porte chaque disjoncteur, source par source.

   Le lecteur : « Bilan électrique, pareil, génial. » Un document (⋮ › Bilan électrique) qui range les disjoncteurs du plan
   sous la source qui les nourrit (une batterie, une génératrice, un TR — 09-chute, `estSource`) et dit, pour chacun : son
   calibre retenu, ce qu'il tire (en permanence, au démarrage), ce qu'il alimente — chaque équipement avec sa consommation
   écrite, ou « à écrire ».

   VOLTA DIT LA VÉRITÉ : un courant ne vient que d'une consommation écrite (sur l'équipement) ou d'un profil écrit (sur le
   disjoncteur). Une consommation qui manque n'est pas comptée pour zéro : le disjoncteur dit ce qui est connu (« 5 A
   connus ») et nomme ce qui reste à écrire ; le total d'une source aussi. Un clic sur un repère y mène.
   =========================================================================== */
const ficheBilanElecOuverte = () => !!(app.fiche && app.fiche.mode === 'bilanelec' && $('fiche') && !$('fiche').hidden);
const BILAN_ELEC = { lie: false };

function bilanElectrique() { const V = verite(), val = (c, k) => c && c[k] && nombreLu(c[k].i) > 0 ? nombreLu(c[k].i) : 0, r3 = x => Math.round(x * 1000) / 1000;
  const lignes = reperesDe(V).filter(estDisjoncteur).sort(triNaturel).map(cb => { let chs = []; try { chs = cheminsDepuis(V, cb); } catch (_) { chs = []; }
    const source = [...new Set(chs.filter(ch => ch.amont).map(ch => ch.bout[0]).filter(r => r && estSource(r)))].sort(triNaturel)[0] || '';
    const charges = consommateursDe(cb).map(r => { const c = consoDe(r), dem = val(c, 'dem'); return { repere: r, ecrite: !!c, perm: c ? val(c, 'perm') : null, pointe: c ? (dem || val(c, 'perm')) : null }; });
    const ecrit = chargeEcrite(cb), surLui = phaseEcrite(ecrit), manque = charges.filter(x => !x.ecrite).map(x => x.repere);
    let perm = null, pointe = null, connu = false;
    if (surLui) { const pts = pointsDuProfil(ecrit), p = pts.find(x => x.t === Infinity); perm = p ? p.i : 0; pointe = pts.length ? Math.max(...pts.map(x => x.i)) : perm; connu = true; }
    else if (charges.some(x => x.ecrite)) { perm = r3(charges.reduce((s, x) => s + (x.perm || 0), 0)); pointe = r3(charges.reduce((s, x) => s + (x.pointe || 0), 0)); connu = !manque.length; }
    let cal = null; try { const d = disjonctionDe(cb); cal = d && d.calibre > 0 ? d.calibre : null; } catch (_) { cal = null; }
    return { cb, source, calibre: cal, surLui, charges, manque, perm, pointe, connu }; });
  const groupes = new Map(); lignes.forEach(x => (groupes.get(x.source) || groupes.set(x.source, []).get(x.source)).push(x));
  const sources = [...groupes].sort(([a], [b]) => !a ? 1 : !b ? -1 : triNaturel(a, b)).map(([source, xs]) => ({ source, lignes: xs,
    perm: r3(xs.reduce((s, x) => s + (x.perm || 0), 0)), connu: xs.every(x => x.connu), aucun: xs.every(x => x.perm == null), manque: [...new Set(xs.flatMap(x => x.manque))], sansRien: xs.filter(x => x.perm == null && !x.manque.length).length }));
  return { sources, n: lignes.length, perm: r3(lignes.reduce((s, x) => s + (x.perm || 0), 0)), manque: [...new Set(lignes.flatMap(x => x.manque))], connu: lignes.length > 0 && lignes.every(x => x.connu) }; }

const repBilanHtml = (r, classe) => `<button type="button" class="be-rep${classe ? ' ' + classe : ''}" data-be="${escA(r)}">${esc(r)}</button>`;
function tireBilanHtml(x) { if (x.perm == null) return '<span class="be-inconnu">inconnu</span>';
  const dem = x.pointe > x.perm + 1e-9 ? `<small>${esc(amperes(x.pointe))} au démarrage</small>` : '';
  return `<b>${esc(amperes(x.perm))}</b><small>${x.connu ? 'en permanence' : 'connus, en permanence'}</small>${dem}`; }
function alimenteBilanHtml(x) { const tete = x.surLui ? '<small class="be-note">Profil écrit sur le disjoncteur</small>' : '';
  return tete + x.charges.map(c => `<span class="be-ch${c.ecrite ? '' : ' manque'}">${repBilanHtml(c.repere)}<i>${c.ecrite ? esc(amperes(c.perm)) + (c.pointe > c.perm + 1e-9 ? ' · ' + esc(amperes(c.pointe)) : '') : 'à écrire'}</i></span>`).join(''); }
function sourceBilanHtml(S, k) { const titre = S.source ? `${repBilanHtml(S.source, 'titre')}<span class="be-nat">${esc(majuscule(natureDe(S.source)))}</span>` : '<span class="be-sans">Source non lue dans votre fichier</span>';
  const total = S.aucun ? '' : `<span class="be-total"><b>${esc(amperes(S.perm))}</b>${S.connu ? 'en permanence' : 'connus, en permanence'}</span>`;
  return `<section class="hy-groupe be-bloc" aria-labelledby="be-t-${k}"><h3 class="hy-titre be-titre" id="be-t-${k}">${titre}${total}</h3>`
    + '<table class="be-table"><thead><tr><th scope="col">Disjoncteur</th><th scope="col">Calibre</th><th scope="col">Ce qu’il tire</th><th scope="col" class="be-g">Ce qu’il alimente</th></tr></thead><tbody>'
    + S.lignes.map(x => `<tr><th scope="row">${repBilanHtml(x.cb)}</th><td class="be-cal">${x.calibre ? esc(amperes(x.calibre)) : ''}</td><td class="be-tire">${tireBilanHtml(x)}</td><td class="be-g be-al">${alimenteBilanHtml(x)}</td></tr>`).join('')
    + '</tbody></table></section>'; }
function corpsBilanElec() { const B = bilanElectrique();
  const chapeau = '<p class="note sv-chapeau">Ce que porte chaque disjoncteur, d’après les consommations écrites. Ce qui n’est pas écrit reste inconnu : VOLTA ne suppose aucun courant.</p>';
  if (!B.n) return tete('Ce plan', 'Bilan électrique') + '<p class="note sv-chapeau">Ce plan ne porte pas de disjoncteur : il n’y a pas de bilan à faire.</p>';
  const manque = B.manque.length ? `<div class="sv-recu be-manque"><p class="sv-recu-t"><b>${esc(pluriel(B.manque.length, 'consommation'))} à écrire</b></p><p class="be-liste">${B.manque.map(r => repBilanHtml(r, 'puce')).join('')}</p><p class="sv-recu-a">Un clic ouvre l’équipement : « Ce qu’il consomme » s’écrit dans Modifier. Le bilan se complète de lui-même.</p></div>` : '';
  return tete('Ce plan', 'Bilan électrique') + chapeau + manque + B.sources.map(sourceBilanHtml).join(''); }
const piedBilanElec = () => { const B = bilanElectrique(); if (!B.n) return '';
  return '<button type="button" class="btn papier dense" id="be-excel">Enregistrer en Excel</button>' + `<span class="hy-etat ${B.connu ? 'ok' : 'regle att'}">${esc(pluriel(B.n, 'disjoncteur'))} · ${esc(amperes(B.perm))} ${B.connu ? 'en permanence' : 'connus, en permanence'}${B.manque.length ? ' · ' + esc(pluriel(B.manque.length, 'consommation')) + ' à écrire' : ''}</span>`; };
function ficheBilanElec() { const deja = ficheBilanElecOuverte(), y = deja ? $('fiche-corps').scrollTop : 0;
  ouvrirFiche({ mode: 'bilanelec', large: true }, corpsBilanElec(), piedBilanElec()); lierBilanElec(); if (deja) $('fiche-corps').scrollTop = y; }
function lierBilanElec() { if (BILAN_ELEC.lie) return; BILAN_ELEC.lie = true;
  $('fiche-corps').addEventListener('click', e => { if (!ficheBilanElecOuverte()) return; const b = e.target.closest('button[data-be]'); if (!b) return; aller({ nom: b.dataset.be }); }); }

/* Le bilan en Excel : une ligne par équipement alimenté, son disjoncteur et sa source répétés — un tableau qui se filtre. */
function exporterBilanElec() { const B = bilanElectrique(); if (!B.n || typeof XLSX === 'undefined') return; const A = x => x == null ? '' : Math.round(x * 100) / 100;
  const L = [['Source', 'Disjoncteur', 'Calibre (A)', 'En permanence (A)', 'Au démarrage (A)', 'Courant connu', 'Profil écrit sur le disjoncteur', 'Équipement alimenté', 'Sa consommation en permanence (A)', 'Sa consommation au démarrage (A)']];
  B.sources.forEach(S => S.lignes.forEach(x => { const tete = [S.source, x.cb, A(x.calibre), A(x.perm), x.perm == null ? '' : A(x.pointe), x.perm == null ? 'inconnu' : x.connu ? 'oui' : 'en partie', x.surLui ? 'oui' : ''];
    if (!x.charges.length) L.push([...tete, '', '', '']); x.charges.forEach(c => L.push([...tete, c.repere, c.ecrite ? A(c.perm) : 'à écrire', c.ecrite ? A(c.pointe) : ''])); }));
  const ws = XLSX.utils.aoa_to_sheet(L); ws['!cols'] = [12, 14, 11, 17, 17, 14, 28, 20, 30, 30].map(wch => ({ wch })); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Bilan électrique');
  const nom = nomAffichePlan() + '-bilan-electrique.xlsx';
  telecharger(new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nom); dire('Bilan électrique enregistré : ' + nom + '.'); }
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#be-excel') && ficheBilanElecOuverte()) exporterBilanElec(); });

MENU = (typeof MENU !== 'undefined' && MENU) || { actions: {} }; MENU.actions.bilanelec = surLePlan(() => ficheBilanElec());
