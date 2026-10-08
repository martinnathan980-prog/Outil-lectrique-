/* ===========================================================================
   08 sexies — LES CONTRATS DÉJÀ FAITS, à l'écran
   ---------------------------------------------------------------------------
   On dépose la grande base (un retest de plusieurs harness) ; elle se garde
   dans ce navigateur (IndexedDB). Sur la fiche de chaque équipement, « Déjà
   fait » donne les trois machines les plus proches ; un clic ouvre la
   COMPARAISON — en vert ce que la machine a et que nous n'avons pas, en
   orange ce qui diffère, en gris ce qui est pareil, en bleu ce que nous avons
   en plus — avec la correspondance de ses repères vers les nôtres ; on coche
   ce qu'on reprend, « Reprendre » l'ajoute au contrat (Ctrl+Z le défait), et
   ce qui est repris passe les mêmes contrôles que le reste.
   =========================================================================== */
'use strict';

const IDB_REFERENCES = 'references';
const REF = { coches: new Set() };
/* Garder, relire, oublier la base. */
function adopterReferences(liaisons, nom) { app.references = liaisons && liaisons.length ? { nom: nom || '', liaisons, index: indexerReferences(liaisons), t: Date.now() } : null;
  ouvrirIDB().then(db => { const st = db.transaction(IDB_REFERENCES, 'readwrite').objectStore(IDB_REFERENCES); if (app.references) st.put({ nom: app.references.nom, liaisons, t: app.references.t }, 'base'); else st.delete('base'); }).catch(() => { });
  CONTROLE.cle = null; if (app.cible) rendreFiche(); if (app.fiche && app.fiche.mode === 'bible') ficheBible(app.fiche.ref); }
function relireReferences() { ouvrirIDB().then(db => { const req = db.transaction(IDB_REFERENCES).objectStore(IDB_REFERENCES).get('base');
  req.onsuccess = () => { const o = req.result; if (!o || !o.liaisons || !o.liaisons.length) return; app.references = { nom: o.nom || '', liaisons: o.liaisons.map(liaison), t: o.t || 0 }; app.references.index = indexerReferences(app.references.liaisons);
    if (app.cible) rendreFiche(); if (app.fiche && app.fiche.mode === 'bible') ficheBible(app.fiche.ref); }; }).catch(() => { }); }
async function importerReferences(fichier) { if (!fichier) return;
  try { dire('Lecture de « ' + fichier.name + ' »…'); const r = lireTexte(await texteDuFichier(fichier));
    if (!r.liaisons.length) { dire('« ' + fichier.name + ' » est lu, mais aucune liaison n’est reconnue — il faut les seize colonnes du retest.', true); return; }
    adopterReferences(r.liaisons, fichier.name);
    const H = app.references.index.harnais.size; dire(pluriel(r.liaisons.length, 'liaison') + ' de ' + pluriel(H, 'harness') + ' gardée' + (r.liaisons.length > 1 ? 's' : '') + ' : les fiches disent ce qui a déjà été fait.');
  } catch (e) { dire('Erreur : ' + (e && e.message || e), true); } }
const indexReferences = () => app.references && app.references.index || null;
/* La base dans la bible : ce qu'elle contient, par harness. */
function ficheReferences() { const R = app.references, I = indexReferences();
  const etat = !R ? '<div class="bible-etat"><span><b>Aucun contrat déjà fait</b> : dépose un retest de plusieurs harness (les seize colonnes), il se garde dans ce navigateur, rien ne part sur le réseau.</span></div>'
    : `<div class="bible-etat"><span><b>${esc(R.nom || 'Contrats déjà faits')}</b> · ${pluriel(I.harnais.size, 'harness')} · ${pluriel(R.liaisons.length, 'liaison')} · gardés dans ce navigateur</span></div>`;
  const lignes = I ? [...I.harnais.values()].sort((a, b) => triNaturel(a.harness, b.harness)).map(h => `<tr><td class="ref">${esc(h.harness)}</td><td class="sans">${esc(h.appareil || '—')}</td><td class="d">${esc(h.retest || '—')}</td><td class="d">${h.equipements.size}</td><td class="d">${h.liaisons.length}</td></tr>`).join('') : '';
  return `<h3 class="sous-titre">Les contrats déjà faits</h3>${etat}` + (lignes ? `<table class="norme"><thead><tr><th>Harness</th><th>Appareil</th><th>Retest</th><th>Équipements</th><th>Liaisons</th></tr></thead><tbody>${lignes}</tbody></table>` : '')
    + '<p class="note">Pour un équipement du contrat, sa fiche dit les trois machines les plus proches (même part number, sinon même code) et le taux de lignes communes ; la comparaison montre ce qu’elles ont en plus, ce qui diffère, et reprend ce qu’on coche. « La solution du PH n’est pas forcément la bonne » : ce qui est repris passe les mêmes contrôles que le reste.</p>'; }
/* « Déjà fait » sur la fiche d'un équipement : les trois plus proches. */
function dejaFaitHtml(nom) { const I = indexReferences(); if (!I) return '';
  const cs = candidatsDeReference(I, verite(), nom, 3); if (!cs.length) return '';
  return `<section class="fi-cadre fi-deja"><div class="fi-ref-ligne"><b class="fi-ref">Déjà fait</b><span class="fi-norme">${pluriel(I.harnais.size, 'machine')}</span></div><ul class="fi-liste">`
    + cs.map(c => `<li class="fi-fil fi-cand" data-ref="${escA(c.harness)}" data-rep="${escA(c.repere)}" tabindex="0" role="button" title="${escA('Comparer avec ' + c.repere + ' de ' + c.harness)}"><span class="fi-ct"><b>${Math.round(c.taux * 100)} %</b></span><span class="fi-puce" style="background:${c.taux >= 0.8 ? '#2e8b57' : c.taux >= 0.4 ? '#d4870f' : '#9aa5b1'}"></span><b class="fi-w">${esc(c.repere)}</b><span class="fi-t">${esc(c.harness)}${c.appareil ? ' · ' + esc(c.appareil) : ''}${c.retest ? ' · ' + esc(c.retest) : ''}</span><span class="fi-dest"><span>${c.par === 'pn' ? 'même part number' : 'même code'}</span></span></li>`).join('') + '</ul></section>'; }
/* LA COMPARAISON : la fiche de l'équipement contre l'équipement d'une machine. */
function ficheComparaison(c) { const I = indexReferences(), h = I && I.harnais.get(c.harness); if (!h) return fiTete({ nom: c.nom, sous: 'référence introuvable' }) + '<p class="fi-note">La base des contrats faits n’est plus là.</p>';
  const D = differentiel(verite(), c.nom, h.liaisons, c.repere), cle = c.harness + '|' + c.repere, mots = { identique: 'pareil', differe: 'diffère', manque: 'manque chez nous', enplus: 'en plus chez nous' };
  const vers = r => { const m = D.correspondance.get(r); return !m || m.vers === r ? esc(r) : `${esc(m.vers)}<i class="fi-corr" title="${escA(r + ' chez ' + c.harness + ' : ' + (m.sur === 'pn' ? 'même part number' : m.sur === 'code' ? 'même code, numéro le plus proche — à confirmer' : m.sur))}">← ${esc(r)}${m.sur === 'code' ? ' ?' : ''}</i>`; };
  const ligne = x => { const b = x.ref || x.notre, k = x.ref ? cleLigne(x.ref) : '', coche = x.etat === 'manque' || x.etat === 'differe';
    return `<li class="fi-fil cp-${x.etat}">${coche ? `<input type="checkbox" class="cp-coche" data-k="${escA(k)}"${REF.coches.has(cle + '|' + k) ? ' checked' : ''} aria-label="Reprendre cette ligne">` : '<span></span>'}<span class="fi-ct"><b>${esc(b.borne)}</b></span><span class="fi-w">${esc(b.typeBrut || '—')}</span><span class="fi-dest${b.amont ? ' amont' : ''}">${ico('fleche')}<span>${x.ref ? vers(x.ref.autre) : esc(x.notre.autre)}:${esc(b.borneAutre)}</span></span>`
      + (x.etat === 'differe' ? `<span class="fi-ko">chez nous : ${esc(x.notre.typeBrut || '—')} → ${esc(x.notre.autre)}:${esc(x.notre.borneAutre)}</span>` : '') + '</li>'; };
  const groupes = ['manque', 'differe', 'identique', 'enplus'].map(e => { const xs = D.lignes.filter(x => x.etat === e); return xs.length ? `<li class="fi-groupe cp-${e}">${mots[e]} · ${xs.length}</li>` + xs.map(ligne).join('') : ''; }).join('');
  const corr = [...D.correspondance].filter(([r, m]) => m.sur !== 'cible' && m.sur !== 'repère').map(([r, m]) => `<span class="fi-chip" aria-pressed="false" title="${escA(m.sur === 'pn' ? 'même part number' : m.sur === 'code' ? 'même code, numéro le plus proche — à confirmer' : 'nouveau chez nous')}">${esc(r)} → ${esc(m.vers)}${m.sur === 'code' ? ' ?' : m.sur === 'nouveau' ? ' (nouveau)' : ''}</span>`).join('');
  const nb = D.lignes.filter(x => (x.etat === 'manque' || x.etat === 'differe') && REF.coches.has(cle + '|' + cleLigne(x.ref))).length;
  return `<header class="fi-tete"><button class="fi-x" id="cp-retour" aria-label="Retour à la fiche">${ico('retour')}</button><div class="min0"><div class="fi-nom">${esc(c.nom)}</div></div><button class="fi-x" id="in-fermer" aria-label="Fermer (Échap)">${ico('fermer')}</button></header>`
    + `<div class="fi-ligne"><span class="fi-etat ${D.taux >= 0.8 ? 'ok' : D.taux >= 0.4 ? 'att' : 'ko'}"><i aria-hidden="true">${Math.round(D.taux * 100)}</i>% de lignes communes</span><span class="fi-sous">contre <b>${esc(c.repere)}</b> · ${esc(c.harness)}${h.appareil ? ' · ' + esc(h.appareil) : ''}${h.retest ? ' · ' + esc(h.retest) : ''}</span></div>`
    + `<section class="fi-cadre"><ul class="fi-liste cp-liste">${groupes}</ul>${corr ? `<p class="fi-note fi-rac-t">ses repères, chez nous</p><div class="fi-puces">${corr}</div>` : ''}</section>`
    + `<p class="fi-note">Ce que cette machine a fait — pas forcément ce qu’il faut faire : ce qui est repris passe les mêmes contrôles que le reste. Les fils repris n’ont pas encore de numéro.</p>`
    + `<footer class="fi-pied"><button class="fi-bouton" id="cp-tout">${ico('tableau')}<span>Tout cocher</span></button><span class="espace"></span><button class="fi-bouton cuivre" id="cp-reprendre"${nb ? '' : ' disabled'}>${ico('fleche')}<span>Reprendre${nb ? ' ' + nb : ''}</span></button></footer>`; }
function lierComparaison(c) { const box = $('ba-equip'), I = indexReferences(), h = I && I.harnais.get(c.harness); if (!h) { $('in-fermer').onclick = () => deselectionner(); return; }
  const cle = c.harness + '|' + c.repere;
  $('in-fermer').onclick = () => deselectionner();
  $('cp-retour').onclick = () => { app.cible = { type: 'bloc', nom: c.nom }; rendreFiche(); };
  box.querySelectorAll('.cp-coche').forEach(el => el.addEventListener('change', () => { const k = cle + '|' + el.dataset.k; if (el.checked) REF.coches.add(k); else REF.coches.delete(k); rendreFiche(); }));
  const D = differentiel(verite(), c.nom, h.liaisons, c.repere), aReprendre = () => D.lignes.filter(x => (x.etat === 'manque' || x.etat === 'differe') && REF.coches.has(cle + '|' + cleLigne(x.ref)));
  $('cp-tout').onclick = () => { const xs = D.lignes.filter(x => x.etat === 'manque' || x.etat === 'differe'), tous = xs.every(x => REF.coches.has(cle + '|' + cleLigne(x.ref))); xs.forEach(x => { const k = cle + '|' + cleLigne(x.ref); if (tous) REF.coches.delete(k); else REF.coches.add(k); }); rendreFiche(); };
  $('cp-reprendre').onclick = () => { const xs = aReprendre(); if (!xs.length) return;
    const plan = plansDuRepere(c.nom)[0] || (app.plan !== '*' ? app.plan : ''), neuves = liaisonsAReprendre(D, c.nom, xs, plan);
    histPush('reprise de ' + xs.length + ' ligne(s) de ' + c.harness); const cible = verite(); neuves.forEach(l => cible.push(l));
    xs.forEach(x => REF.coches.delete(cle + '|' + cleLigne(x.ref))); app.cible = { type: 'bloc', nom: c.nom }; apresEdition(); dire(pluriel(neuves.length, 'liaison') + ' reprise' + (neuves.length > 1 ? 's' : '') + ' de ' + c.harness + ' : à numéroter, puis à vérifier.'); }; }
