/* ===========================================================================
   08 — L'AUTOTEST DU PLAN (v77). Le lecteur : « quand je vais faire le gigatest, prépare de ton côté tout ce qui va pas…
   voir toutes les erreurs… je pourrai jamais tout envoyer, c'est confidentiel ». VOLTA se parcourt LUI-MÊME sur le vrai
   fichier ouvert, comme le ferait quelqu'un de très patient : chaque folio (dessiné, chronométré), chaque fiche (chaque
   équipement, disjoncteur, barrette, prise, chaque câble), chacune de ses sections dépliée, chaque liste « Changer » et
   « D'où elle vient » ouverte, chaque onglet du récapitulatif, chaque document, chaque export (fabriqué, jamais
   enregistré), le contrôle. Ce qui casse se note : l'écran où c'était (« fiche d'un disjoncteur · folio 3 », jamais le
   repère), le message (les noms du plan masqués), la pile (le nom des fonctions de VOLTA et leur ligne, rien d'autre) ;
   une fiche qui ne se rend pas sans rien dire aussi (vide, ou la fiche d’avant restée là) ; et ce qui est lent. Le résultat part avec le bilan anonyme
   (`sectionAutotest`, 08-bilan). Échap, ou « Arrêter », l'arrête ; le plan revient où il était.
   =========================================================================== */
'use strict';

const AUTOTEST = { enCours: false, stop: false, resultat: null, budget: 20 * 60 * 1000, etape: '', erreurs: [], captures: [] };

// ce qu'on garde d'une pile : « fonction:ligne », trois au plus — ni chemin de fichier, ni dossier (ils diraient un nom)
const pileCourte = e => String((e && e.stack) || '').split('\n').slice(1).map(l => { l = l.trim(); const m = /^at\s+(?:async\s+)?([^\s(]+)\s+\(.*:(\d+):\d+\)$/.exec(l) || /^at\s+(?:async\s+)?().*:(\d+):\d+$/.exec(l) || /^([\w$.<>]*)@.*:(\d+):\d+$/.exec(l);
  return m ? (m[1] || 'anonyme') + ':' + m[2] : ''; })
  .filter(Boolean).slice(0, 3).join(' ← ');
const pauseAT = (ms) => new Promise(r => setTimeout(r, ms || 0));
const msLisible = ms => ms >= 60000 ? Math.floor(ms / 60000) + ' min ' + String(Math.round((ms % 60000) / 1000)).padStart(2, '0') + ' s' : ms >= 1000 ? (Math.round(ms / 100) / 10).toString().replace('.', ',') + ' s' : Math.round(ms) + ' ms';

/* UNE ERREUR, d'où qu'elle vienne (une étape qui lève, la page qui lève pendant l'étape, une console qui crie) : regroupée
   par message et par écran, comptée. */
function noterErreurAT(genre, msg, pile) { if (!AUTOTEST.enCours) return; msg = String(msg || '').replace(/\s+/g, ' ').trim().slice(0, 220); if (!msg) return;
  const ou = AUTOTEST.etape || 'hors étape', x = AUTOTEST.erreurs.find(y => y.msg === msg && y.ou === ou);
  if (x) x.n++; else if (AUTOTEST.erreurs.length < 60) AUTOTEST.erreurs.push({ genre, ou, msg, pile: pile || '', n: 1 }); }
window.addEventListener('error', e => noterErreurAT('page', e.message || (e.error && e.error.message), pileCourte(e.error)));
window.addEventListener('unhandledrejection', e => noterErreurAT('promesse', (e.reason && e.reason.message) || e.reason, pileCourte(e.reason)));

// le panneau de l'autotest : où il en est, ce qu'il a trouvé, « Arrêter »
function panneauAT() { let el = $('autotest'); if (el) return el;
  el = document.createElement('div'); el.id = 'autotest'; el.className = 'carnet at'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
  el.innerHTML = `<div class="cn-tete"><b>Autotest du plan</b><span class="cn-ou" id="at-ou"></span></div><div class="at-barre"><i id="at-barre"></i></div>`
    + `<div class="cn-pied"><span class="cn-aide" id="at-mots"></span><button type="button" class="btn papier dense" id="at-stop">Arrêter <kbd>Échap</kbd></button></div>`;
  document.body.appendChild(el); $('at-stop').onclick = () => { AUTOTEST.stop = true; }; return el; }
function montrerAT(ou, fait, total, mots) { const el = panneauAT(); el.hidden = false; $('at-ou').textContent = ou; $('at-barre').style.width = Math.round(100 * Math.min(1, fait / Math.max(1, total))) + '%'; $('at-mots').textContent = mots; }

/* LE PARCOURS. o : { listes (ouvrir chaque « Changer » : le plus long), budget (ms, 20 min d'office), sauter (des exports),
   bilan (false : ne pas rouvrir le bilan à la fin — les bancs) } */
async function lancerAutotest(o) { if (AUTOTEST.enCours) return; o = Object.assign({ listes: true, budget: AUTOTEST.budget }, o || {});
  if (!verite().length) { dire('Aucun plan ouvert : ouvrez votre installation, puis relancez l’autotest.', true); return; }
  const T0 = performance.now(), P = plans(), depart = app.plan, R = { quand: Date.now(), genres: {}, vides: 0, coupe: '', exports: [], listes: 0, sections: 0, folios: P.length };
  Object.assign(AUTOTEST, { enCours: true, stop: false, erreurs: [], etape: '', captures: [] });
  const echap = e => { if (e.key === 'Escape' && AUTOTEST.enCours) { AUTOTEST.stop = true; e.preventDefault(); e.stopPropagation(); } }; window.addEventListener('keydown', echap, true);
  // la console qui crie pendant le parcours, et les téléchargements (fabriqués, jamais enregistrés)
  const ce = console.error, tl = window.telecharger; console.error = function () { try { noterErreurAT('console', [...arguments].map(a => (a && a.message) || String(a)).join(' '), pileCourte(arguments[0])); } catch (_) { } return ce.apply(console, arguments); };
  window.telecharger = (blob, nom) => { AUTOTEST.captures.push({ ext: (/\.(\w+)$/.exec(String(nom || '')) || [, '?'])[1].toLowerCase(), taille: blob && blob.size || 0 }); };
  try { telecharger = window.telecharger; } catch (_) { }
  const fini = () => AUTOTEST.stop || performance.now() - T0 > o.budget;
  const compter = (genre, ms, ou) => { const g = R.genres[genre] || (R.genres[genre] = { n: 0, ms: 0, max: 0, ouMax: '' }); g.n++; g.ms += ms; if (ms > g.max) { g.max = ms; g.ouMax = ou; } };
  const etape = async (genre, ou, f) => { AUTOTEST.etape = ou; const t = performance.now(); try { await f(); } catch (e) { noterErreurAT(genre, (e && e.message) || e, pileCourte(e)); } compter(genre, performance.now() - t, ou); await pauseAT(0); };
  const folioDe = p => P.length > 1 ? 'folio ' + (P.indexOf(p) + 1) + ' / ' + P.length : '';
  // une fiche : rendue (non rendue = un échec muet : on relance son rendu pour lire l'erreur), ses sections dépliées, ses listes ouvertes
  // (rendue, c'est-à-dire LA SIENNE : un rendu qui échoue en silence laisse la fiche d'avant — sa barre dit un autre nom)
  const exercerFiche = async (ou) => { const box = $('ba-equip'), nav = box && box.querySelector('.fi-nav-nom'), attendu = app.cible ? nomDeCible(app.cible) : '';
    const casse = box && box.querySelector('.fi-erreur');
    if (casse) { R.vides++; const e = FI.erreur; noterErreurAT('fiche', 'fiche non rendue : ' + casse.textContent, pileCourte(e)); return; }
    if (!box || !box.querySelector('.fi-entete, .fi-nom, details.fs, .nc, .nv-grand') || (nav && attendu && nav.textContent !== attendu)) { R.vides++; try { ficheDe(app.cible); noterErreurAT('fiche', 'fiche non rendue, sans erreur levée', ''); } catch (e) { noterErreurAT('fiche', 'fiche non rendue : ' + ((e && e.message) || e), pileCourte(e)); } return; }
    box.querySelectorAll('details.fs').forEach(d => { if (!d.open) { d.open = true; R.sections++; } });
    /* (v78) LE GRAND : la fiche entière, chaque onglet montré une fois ; les listes « Changer » s'ouvrent depuis lui (elles
       vivent dans ses onglets), puis il redevient la carte */
    const enGrand = typeof ouvrirGrand === 'function' && !telephone() && !!box.querySelector('.nc');
    if (enGrand) { AUTOTEST.etape = ou + ' · en grand';
      try { ouvrirGrand(''); const g = box.querySelector('.nv-grand');
        if (!g) { R.vides++; noterErreurAT('fiche', 'fiche entière non rendue', pileCourte(FI.erreur)); }
        else box.querySelectorAll('.nv-onglet').forEach(t => { activerOnglet(t.dataset.onglet, false); R.sections++; }); }
      catch (e) { noterErreurAT('fiche', 'fiche entière : ' + ((e && e.message) || e), pileCourte(e)); }
      await pauseAT(0); }
    const rendre = () => { if (enGrand) try { reduireFiche(); } catch (_) { } };
    if (!o.listes) { rendre(); return; }
    const cles = [...new Set([...box.querySelectorAll('[data-changer]')].map(b => b.dataset.changer))].slice(0, 12);
    for (const k of cles) { if (fini()) { rendre(); return; } AUTOTEST.etape = ou + ' · une liste « Changer »';
      try { FI.liste = k; rendreFiche(); R.listes++; } catch (e) { noterErreurAT('liste', (e && e.message) || e, pileCourte(e)); }
      await pauseAT(0); }
    try { FI.liste = ''; rendreFiche(); } catch (_) { } rendre(); };
  try {
    // 1. CE QUI VAUT POUR TOUT LE PLAN D'ABORD (arrêté tôt, l'essentiel est vu) : le contrôle, en entier
    if (!fini()) { montrerAT('le contrôle', 0, 1, ''); await etape('contrôle', 'le contrôle du contrat', () => { controleDuContrat(); }); }
    // 2. LE RÉCAPITULATIF : chaque onglet, en page, sur tout le plan
    if (!fini() && typeof ouvrirBase === 'function') { const ks = (typeof ONGLETS !== 'undefined' ? ONGLETS.map(([k]) => k) : []);
      await etape('récapitulatif', 'récapitulatif · ouverture', () => { ouvrirBase('page'); app.base.portee = 'tout'; });
      for (let k = 0; k < ks.length && !fini(); k++) { montrerAT('le récapitulatif', k, ks.length, 'onglet ' + ks[k]);
        await etape('onglet', 'récapitulatif · onglet ' + ks[k], () => { changerOnglet(ks[k]); }); }
      try { fermerBase(); } catch (_) { } }
    // 3. LES DOCUMENTS
    const docs = ['nomenclature', 'bible', 'normes', 'hypotheses', 'cartouche', 'comprendre', 'dejafait', 'fichiers'].filter(a => MENU.actions[a]);
    for (let k = 0; k < docs.length && !fini(); k++) { montrerAT('les documents', k, docs.length, 'document ' + docs[k]);
      await etape('document', 'document « ' + (MOTS_DOCS[docs[k]] || docs[k]) + ' »', async () => { MENU.actions[docs[k]](); await pauseAT(120);
        if ($('fiche').hidden && !(typeof bibliothequeOuverte === 'function' && bibliothequeOuverte())) throw new Error('le document ne s’est pas ouvert'); });
      try { fermerFiche(true); if (typeof fermerBibliotheque === 'function' && typeof bibliothequeOuverte === 'function' && bibliothequeOuverte()) fermerBibliotheque(); } catch (_) { } }
    // 4. LES FOLIOS, puis sur chacun ses blocs et ses câbles
    for (let i = 0; i < P.length && !fini(); i++) { const p = P[i], fo = folioDe(p) || 'le plan';
      montrerAT(fo, i, P.length, 'le dessin du folio');
      await etape('folio', 'dessin du ' + fo, async () => { fermerInspecteur(); allerAuPlan(p); const t = performance.now();
        while (!app.dessin && performance.now() - t < 120000 && !AUTOTEST.stop) await pauseAT(60);
        if (!app.dessin && !AUTOTEST.stop) throw new Error('le folio ne s’est pas dessiné en 2 minutes'); });
      if (!app.dessin) continue;
      const blocs = (app.dessin.comps || []).filter(c => c && c.name && c.kind !== 'tag' && !(typeof estRenvoi === 'function' && estRenvoi(c.name)));
      for (let k = 0; k < blocs.length && !fini(); k++) { const c = blocs[k], ou = 'fiche ' + natureAnonyme(c.name) + (fo ? ' · ' + fo : '');
        montrerAT(fo, i + k / Math.max(1, blocs.length) * .6, P.length, `fiche ${k + 1} / ${blocs.length} · ${pl(AUTOTEST.erreurs.length, 'erreur')}`);
        await etape(genreDeFiche(c.name), ou, async () => { choisirBloc(c); await exercerFiche(ou); }); }
      const fils = (app.dessin.fils || []).filter(f => f && f.i != null);
      for (let k = 0; k < fils.length && !fini(); k++) { const f = fils[k], ou = 'fiche d’un câble' + (fo ? ' · ' + fo : '');
        montrerAT(fo, i + .6 + k / Math.max(1, fils.length) * .4, P.length, `câble ${k + 1} / ${fils.length} · ${pl(AUTOTEST.erreurs.length, 'erreur')}`);
        await etape('câble', ou, async () => { choisirFil(f); await exercerFiche(ou); }); }
      try { deselectionner(); fermerInspecteur(); } catch (_) { } }
    // 5. LES EXPORTS (fabriqués, jamais enregistrés ; le dossier PDF de tous les folios, le plus long, en dernier)
    const exps = ['retestcorrige', 'suivi', 'nomenclaturecsv', 'svg', 'png', 'dossierpdf'].filter(a => MENU.actions[a] && !(o.sauter || []).includes(a));
    for (let k = 0; k < exps.length && !fini(); k++) { montrerAT('les exports', k, exps.length, 'export ' + exps[k]); const avant = AUTOTEST.captures.length;
      await etape('export', 'export ' + exps[k], async () => { await MENU.actions[exps[k]](); await pauseAT(200);
        // l'installation corrigée passe par son relevé (ce qui change, puis « Enregistrer ») : on l'enregistre
        if (AUTOTEST.captures.length === avant && $('rv-enregistrer')) $('rv-enregistrer').click(); const t = performance.now();
        while (AUTOTEST.captures.length === avant && performance.now() - t < 30000 && !AUTOTEST.stop) await pauseAT(100);
        if (AUTOTEST.captures.length === avant && !AUTOTEST.stop) throw new Error('l’export n’a rien fabriqué en 30 s');
        const c = AUTOTEST.captures[AUTOTEST.captures.length - 1]; if (c) R.exports.push(exps[k] + ' .' + c.ext + ' ' + Math.max(1, Math.round(c.taille / 1024)) + ' Ko'); });
      try { fermerFiche(true); } catch (_) { } }
  } finally {
    R.coupe = AUTOTEST.stop ? 'arrêté à la main' : performance.now() - T0 > o.budget ? 'temps limite atteint (' + msLisible(o.budget) + ')' : '';
    R.duree = performance.now() - T0; R.erreurs = AUTOTEST.erreurs.slice(); AUTOTEST.resultat = R;
    console.error = ce; window.telecharger = tl; try { telecharger = tl; } catch (_) { }
    window.removeEventListener('keydown', echap, true); AUTOTEST.enCours = false; AUTOTEST.etape = '';
    const el = $('autotest'); if (el) el.hidden = true;
    try { FI.liste = ''; fermerBase(); fermerFiche(true); deselectionner(); fermerInspecteur(); if (depart && plans().includes(depart)) allerAuPlan(depart); } catch (_) { }
    dire(`Autotest ${R.coupe ? 'arrêté' : 'fini'} en ${msLisible(R.duree)} : ${pl(R.erreurs.length, 'erreur')}${R.vides ? ', ' + pl(R.vides, 'fiche non rendue', 'fiches non rendues') : ''}. Le résultat est dans le bilan anonyme.`, !!R.erreurs.length);
    if (o.bilan !== false && typeof ficheBilan === 'function') ficheBilan(); } }
const genreDeFiche = r => VT_A_POSER.test(r || '') ? 'barrette ajoutée' : estMasse(r) ? 'masse' : estDisjoncteur(r) ? 'disjoncteur' : estBarrette(r) ? 'barrette' : estCoupure(r) ? 'prise' : 'équipement';

/* CE QUE L'AUTOTEST DIT DANS LE BILAN : la durée, chaque genre (combien, la moyenne, le plus long et où), les erreurs
   (l’écran, le message masqué, la pile), les fiches non rendues, les exports fabriqués. */
function sectionAutotest(masque) { const R = AUTOTEST.resultat; if (!R) return ['pas encore lancé (⋮ › Plus › Autotest du plan, ou le bouton du bilan)'];
  const G = Object.entries(R.genres).map(([g, x]) => `${g} : ${x.n} en ${msLisible(x.ms)} (moyenne ${msLisible(x.ms / x.n)}, le plus long ${msLisible(x.max)} — ${x.ouMax})`);
  return [`lancé le ${new Date(R.quand).toLocaleString('fr-FR')} · ${msLisible(R.duree)}${R.coupe ? ' · ' + R.coupe : ' · parcours complet'}`,
    `${pl(R.folios, 'folio')} · ${pl(R.sections, 'section dépliée', 'sections dépliées')} · ${pl(R.listes, 'liste « Changer » ouverte', 'listes « Changer » ouvertes')}`, ...G,
    R.exports.length ? 'exports fabriqués (rien d’enregistré) : ' + R.exports.join(' · ') : '',
    R.vides ? `${pl(R.vides, 'fiche non rendue', 'fiches non rendues')} (le rendu a échoué sans le dire)` : 'fiches non rendues : aucune',
    R.erreurs.length ? `${pl(R.erreurs.length, 'erreur')} :` : 'erreurs : aucune',
    ...R.erreurs.map(e => `  ${e.ou} — ${masque(e.msg)}${e.n > 1 ? ' (×' + e.n + ')' : ''}${e.pile ? ' — ' + masque(e.pile) : ''}`)].filter(Boolean); }

MENU = (typeof MENU !== 'undefined' && MENU) || { actions: {} };
MENU.actions.autotest = () => lancerAutotest();
