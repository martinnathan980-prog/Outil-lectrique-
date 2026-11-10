/* ===========================================================================
   08 — LA VUE D'ENSEMBLE D'UNE INSTALLATION (v93) : ses plans, et ce qu'ils partagent.

   Le lecteur : « Vue d'ensemble, génial. » Dans la bibliothèque, sur une installation de deux plans ou plus, « Vue
   d'ensemble » lit tous ses plans (ceux que ce navigateur garde) et montre : les chiffres de l'installation (plans,
   liaisons, équipements, ceux qui paraissent sur plusieurs plans) ; une CARTE — chaque plan, relié à ceux avec qui il
   partage des équipements, le compte sur le trait ; la liste de ces équipements communs, chacun avec ses plans.
   Un clic sur un plan de la carte l'ouvre. Rien n'est écrit : c'est une lecture.

   VOLTA ne dit que ce que les fichiers portent : un même repère sur deux plans. Il n'en déduit pas un câblage.
   =========================================================================== */
const ENSEMBLE = { id: '', etat: '', D: null, max: 60 };
function ensembleOuverte(id) { return ENSEMBLE.id === id; }

async function calculerEnsemble(installId) { const P = plansDeInstall(installId), lus = [];
  for (const p of P) { let L = null;
    try { if (p.id === app.planId && planSurLaTable()) L = verite();
      else { const o = await lireBiblio('contrats', p.id); L = (o && (o.source || o.liaisons)) || null; if (!L && p.source === 'base' && p.contrat && typeof liaisonsDuContrat === 'function') L = await liaisonsDuContrat(p.contrat, p.fwdBase); } } catch (_) { L = null; }
    if (!L || !L.length) { lus.push({ p, lu: false }); continue; }
    const reps = new Set(reperesDe(L.filter(l => l.de && l.vers)).filter(r => !estMasse(r) && !VT_A_POSER.test(r)));
    lus.push({ p, lu: true, n: L.length, reps }); }
  const ou = new Map(); lus.forEach((x, k) => { if (x.lu) x.reps.forEach(r => (ou.get(r) || ou.set(r, []).get(r)).push(k)); });
  const communs = [...ou].filter(([, ks]) => ks.length > 1).sort(([a, x], [b, y]) => y.length - x.length || triNaturel(a, b));
  const liens = new Map(); communs.forEach(([, ks]) => { for (let a = 0; a < ks.length; a++) for (let b = a + 1; b < ks.length; b++) { const k = ks[a] + '-' + ks[b]; liens.set(k, (liens.get(k) || 0) + 1); } });
  return { lus, communs, liens: [...liens].map(([k, n]) => { const [a, b] = k.split('-').map(Number); return { a, b, n }; }), liaisons: lus.reduce((s, x) => s + (x.n || 0), 0), equipements: ou.size }; }

/* La carte : les plans sur un ovale, un trait entre deux plans qui partagent des équipements (son épaisseur suit le
   compte, écrit dessus). Un seul sens de lecture : le premier plan en haut, les autres dans l'ordre de la liste. */
function carteEnsembleSvg(D) { const n = D.lus.length; if (n < 2 || n > 14) return '';
  const W = 960, H = n <= 2 ? 150 : n <= 4 ? 300 : 400, bw = 184, bh = 54, Rx = W / 2 - bw / 2 - 24, Ry = H / 2 - bh / 2 - 16;
  const pos = D.lus.map((_, k) => { const a = -Math.PI / 2 + (n === 2 ? Math.PI / 2 : 0) + k * 2 * Math.PI / n; return { x: W / 2 + Rx * Math.cos(a), y: H / 2 + Ry * Math.sin(a) }; });
  const max = Math.max(1, ...D.liens.map(l => l.n)), court = t => t.length > 24 ? t.slice(0, 23) + '…' : t;
  const traits = D.liens.map(l => { const A = pos[l.a], B = pos[l.b], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, ep = (1.2 + 3.3 * l.n / max).toFixed(1), w = 14 + String(l.n).length * 7;
    return `<line class="en-trait" x1="${A.x.toFixed(1)}" y1="${A.y.toFixed(1)}" x2="${B.x.toFixed(1)}" y2="${B.y.toFixed(1)}" stroke-width="${ep}"/><g class="en-compte"><rect x="${(mx - w / 2).toFixed(1)}" y="${(my - 10).toFixed(1)}" width="${w}" height="20" rx="10"/><text x="${mx.toFixed(1)}" y="${(my + 4).toFixed(1)}" text-anchor="middle">${l.n}</text></g>`; }).join('');
  const noeuds = D.lus.map((x, k) => { const c = pos[k], nom = nomAffiche(x.p.nom), seul = x.lu && !D.liens.some(l => l.a === k || l.b === k);
    return `<g class="en-noeud${x.lu ? '' : ' non-lu'}${seul ? ' seul' : ''}" data-bi="plan" data-id="${escA(x.p.id)}" tabindex="0" role="button" aria-label="${escA('Ouvrir ' + nom)}"><title>${esc(nom)}</title><rect x="${(c.x - bw / 2).toFixed(1)}" y="${(c.y - bh / 2).toFixed(1)}" width="${bw}" height="${bh}" rx="12"/>`
      + `<text class="en-nom" x="${c.x.toFixed(1)}" y="${(c.y - 3).toFixed(1)}" text-anchor="middle">${esc(court(nom))}</text><text class="en-sous" x="${c.x.toFixed(1)}" y="${(c.y + 15).toFixed(1)}" text-anchor="middle">${x.lu ? esc(pluriel(x.n, 'liaison') + ' · ' + pluriel(x.reps.size, 'équipement')) : 'à rouvrir pour le lire'}</text></g>`; }).join('');
  return `<svg class="en-carte" viewBox="0 0 ${W} ${H}" role="img" aria-label="Les plans de l’installation et les équipements qu’ils partagent">${traits}${noeuds}</svg>`; }
function ensembleHtml(i) { if (!i || ENSEMBLE.id !== i.id) return '';
  if (ENSEMBLE.etat !== 'pret' || !ENSEMBLE.D) return '<div class="bi-feuille bi-ensemble"><p class="en-attente">VOLTA lit les plans de l’installation…</p></div>';
  const D = ENSEMBLE.D, lus = D.lus.filter(x => x.lu), nomDe = k => nomAffiche(D.lus[k].p.nom), vus = D.communs.slice(0, ENSEMBLE.max), reste = D.communs.length - vus.length;
  const chiffre = (n, mot) => `<span class="en-chiffre"><b>${n}</b>${esc(mot)}</span>`;
  const chiffres = chiffre(D.lus.length, D.lus.length > 1 ? 'plans' : 'plan') + chiffre(D.liaisons, D.liaisons > 1 ? 'liaisons' : 'liaison') + chiffre(D.equipements, D.equipements > 1 ? 'équipements' : 'équipement') + (D.communs.length ? chiffre(D.communs.length, D.communs.length > 1 ? 'sur plusieurs plans' : 'sur plusieurs plans') : '');
  const nonLus = D.lus.length - lus.length;
  const communs = D.communs.length ? `<div class="en-communs"><h3>Les équipements que les plans partagent</h3><ul>${vus.map(([r, ks]) => `<li><b>${esc(r)}</b><small>${esc(majuscule(natureDe(r)))}</small><span>${ks.map(k => `<button type="button" class="en-plan" data-bi="plan" data-id="${escA(D.lus[k].p.id)}">${esc(nomDe(k))}</button>`).join('')}</span></li>`).join('')}</ul>${reste > 0 ? `<p class="en-suite">… et ${esc(pluriel(reste, 'autre'))}.</p>` : ''}</div>`
    : (lus.length > 1 ? '<p class="en-dit">Ces plans ne partagent aucun équipement : aucun repère ne paraît sur deux d’entre eux.</p>' : '');
  return `<div class="bi-feuille bi-ensemble"><div class="en-tete"><h2>Vue d’ensemble</h2><p class="en-chiffres">${chiffres}</p><button type="button" class="bi-oublier en-fermer" data-bi="ensemble" aria-label="Fermer la vue d’ensemble">${icoBi('fermer')}</button></div>`
    + (nonLus ? `<p class="en-dit">${esc(pluriel(nonLus, 'plan'))} ${nonLus > 1 ? 'n’ont' : 'n’a'} pas ses liaisons dans ce navigateur : ${nonLus > 1 ? 'ils ne sont pas comptés' : 'il n’est pas compté'}.</p>` : '')
    + carteEnsembleSvg(D) + communs + '</div>'; }
async function basculerEnsemble(id) { if (!id) return; if (ENSEMBLE.id === id) { ENSEMBLE.id = ''; ENSEMBLE.D = null; ENSEMBLE.etat = ''; rendreBibliotheque(); return; }
  ENSEMBLE.id = id; ENSEMBLE.etat = 'lecture'; ENSEMBLE.D = null; rendreBibliotheque();
  let D = null; try { D = await calculerEnsemble(id); } catch (_) { D = null; }
  if (ENSEMBLE.id !== id) return; if (!D) { ENSEMBLE.id = ''; ENSEMBLE.etat = ''; dire('VOLTA n’a pas pu lire les plans de cette installation.', true); rendreBibliotheque(); return; }
  ENSEMBLE.D = D; ENSEMBLE.etat = 'pret'; rendreBibliotheque(); }
