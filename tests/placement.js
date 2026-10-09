/* ===========================================================================
   PLACEMENT AU LOIN — un gros folio jamais vu se place dans un Worker, le
   dessin ne change pas, le résultat se garde.
   ---------------------------------------------------------------------------
       node tests/placement.js [--fichier=chemin]

   Sous pilote automatique, le placement reste dans la page (les bancs lisent
   le dessin dès `redessiner()`) : on le réveille (`placementAilleurs(true)`)
   et on vérifie
     · que sans réveil tout est synchrone : `allerAuPlan` rend le dessin ;
     · qu'un gros folio jamais vu rend la main tout de suite (pas de dessin
       encore, l'attente « Le moteur place le folio 3… » au milieu de la table,
       la puce du folio qui respire), que l'écran répond pendant le calcul (on
       change de folio, on revient), et que le dessin qui arrive du Worker est
       IDENTIQUE, point par point, à celui que la page calcule elle-même ;
     · qu'un petit folio reste synchrone, même réveillé ;
     · que le concours SE GARDE : après rechargement, le folio revient sans
       recalcul, identique ;
     · qu'une cible choisie pendant l'attente (la recherche d'un repère d'un
       autre folio) ouvre sa fiche tout de suite, sans faux message, et qu'elle
       est choisie et cadrée quand le dessin arrive.
   Rend 1 au premier échec.
   =========================================================================== */
const { chromium } = require('playwright');
const P = require('./pilote');
const FICHIER = P.fichierDemande();

// le dessin, point par point : blocs, fils, barrettes à poser, feuille
const empreinteDansLaPage = () => { const d = app.dessin; if (!d) return null;
  return JSON.stringify({ c: d.comps.map(c => [c.name, c.kind, c.x, c.y, c.w, c.h, c.col]), f: d.fils.map(w => [w.i, w.cable, (w.pts || []).map(p => [p.x, p.y])]),
    b: (d.barrettes || []).map(b => [b.nomVT, b.x, (b.bornes || []).map(p => [p.n, p.y])]), bb: d.bbox }); };
// l'attente telle qu'on la voit : l'élément, son texte, la puce du folio qui respire
const attenteDansLaPage = () => { const el = $('attente'), chip = document.querySelector(`#fo-strip .chip[data-plan="${app.plan}"]`);
  return { visible: !!el && !el.hidden && el.getBoundingClientRect().height > 0, texte: el ? el.textContent : '', puce: !!chip && chip.classList.contains('attend'), dessin: !!app.dessin, etat: etatPlacement() }; };
// le bloc est-il dans la place libre du plan (hors inspecteur, rail, barre du bas) ?
const cadreDansLaPage = nom => { const d = app.dessin, c = d && d.comps.find(k => k.name === nom && k.kind !== 'tag'); if (!c) return { dedans: false, detail: nom + ' absent' };
  const r = $('planche').getBoundingClientRect(), s = app.vue.s, X0 = r.left + app.vue.tx + c.x * s, Y0 = r.top + app.vue.ty + c.y * s, X1 = X0 + c.w * s, Y1 = Y0 + c.h * s;
  const vu = id => { const e = $(id); if (!e || e.hidden) return null; const q = e.getBoundingClientRect(); return q.width && q.height ? q : null; };
  let L = r.left, T = r.top, R = r.right, B = r.bottom; const insp = vu('inspecteur'), fol = vu('folios'), rail = vu('rail');
  if (insp) R = Math.min(R, insp.left); if (fol) B = Math.min(B, fol.top); if (rail) L = Math.max(L, rail.right);
  return { dedans: X0 >= L - 1 && X1 <= R + 1 && Y0 >= T - 1 && Y1 <= B + 1, detail: `bloc ${Math.round(X0)}–${Math.round(X1)} × ${Math.round(Y0)}–${Math.round(Y1)}, place libre ${Math.round(L)}–${Math.round(R)} × ${Math.round(T)}–${Math.round(B)}` }; };

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await nav.newContext({ viewport: { width: 1400, height: 900 } });
  // les trois aides vivent dans la page, à chaque chargement
  await ctx.addInitScript({ content: `window.empreinteDansLaPage = ${empreinteDansLaPage}; window.attenteDansLaPage = ${attenteDansLaPage}; window.cadreDansLaPage = ${cadreDansLaPage};` });
  const page = await ctx.newPage(); page.setDefaultTimeout(180000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  let ko = 0; const ok = (c, nom, detail) => { if (!c) ko++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (detail ? '   ' + detail : '')); };
  /* (Re)charger la page sur un petit folio : le contrat gardé rouvre sur son dernier folio enregistré, et sous pilote un
     gros folio s'y recalculerait dans la page avant tout réveil ; on enregistre donc d'abord le plus petit folio. */
  const ouvrir = async petit => { if (petit) { await page.evaluate(p => { allerAuPlan(p); sauver(); }, petit); await page.waitForTimeout(600); }
    await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined'); };
  await ouvrir();
  // — sous pilote, sans réveil : synchrone, comme toutes les autres batteries l'attendent
  const dort = await page.evaluate(() => etatPlacement().ailleurs === false);
  ok(dort, 'endormi sous pilote automatique : le placement reste dans la page');
  const gros = await page.evaluate(() => { const P = plans().map(p => ({ p, n: liaisonsDe(p).length })).sort((a, b) => b.n - a.n); return { folio: P[0].p, n: P[0].n, petit: P[P.length - 1].p, nPetit: P[P.length - 1].n, seuil: SEUIL_ICI }; });
  const sync = await page.evaluate(p => { const t0 = performance.now(); allerAuPlan(p); return { ms: Math.round(performance.now() - t0), dessin: !!app.dessin, empreinte: empreinteDansLaPage() }; }, gros.folio);
  ok(sync.dessin && sync.ms > 300, `sans réveil, le folio ${gros.folio} (${gros.n} liaisons) se place dans la page, synchrone`, sync.ms + ' ms, la main rendue après le dessin');
  const reference = sync.empreinte;

  // — réveillé : le gros folio part au loin, la main revient tout de suite, l'attente se voit
  await ouvrir(gros.petit);   // la page se recharge : le cache en mémoire est vide, rien n'est encore gardé (sous pilote rien ne l'était)
  const e0 = await page.evaluate(() => placementAilleurs(true));
  ok(e0.ailleurs && e0.worker === 'pas encore', 'réveillé', JSON.stringify(e0));
  const loin = await page.evaluate(p => { const t0 = performance.now(); allerAuPlan(p); return { ms: Math.round(performance.now() - t0), ...attenteDansLaPage() }; }, gros.folio);
  ok(loin.ms < 300 && !loin.dessin, `réveillé, allerAuPlan('${gros.folio}') rend la main tout de suite`, loin.ms + ' ms (contre ' + sync.ms + ' ms dans la page)');
  ok(loin.visible && new RegExp('place le folio ' + gros.folio).test(loin.texte) && /\d+ fils/.test(loin.texte), 'l’attente se voit au milieu de la table : « Le moteur place le folio… », le nombre de fils', loin.texte);
  ok(loin.puce, 'la puce du folio respire dans la barre du bas');
  ok(loin.etat.worker === 'oui' && loin.etat.attentes.includes(gros.folio), 'le moteur tourne en Worker, le folio est en attente', JSON.stringify(loin.etat));
  if (process.env.CAPTURES) await page.screenshot({ path: process.env.CAPTURES + '/placement-attente.png' }).catch(() => { });
  // l'écran répond : un petit folio s'ouvre pendant le calcul (dans la page, il est petit), et l'on revient attendre
  const libre = await page.evaluate(([petit, gros]) => { allerAuPlan(petit); const a = attenteDansLaPage(); allerAuPlan(gros); const b = attenteDansLaPage(); return { petitDessine: a.dessin, petitSansAttente: !a.visible, retourAttend: b.visible && !b.dessin }; }, [gros.petit, gros.folio]);
  ok(libre.petitDessine && libre.petitSansAttente, `pendant le calcul, le folio ${gros.petit} (${gros.nPetit} liaisons ≤ ${gros.seuil}) s’ouvre aussitôt, sans attente`);
  ok(libre.retourAttend, 'revenu sur le gros folio, l’attente est toujours là');
  // le dessin arrive, identique à celui de la page
  const t0 = Date.now(); await page.waitForFunction(p => app.plan === p && !!app.dessin, gros.folio); const tArrive = Date.now() - t0;
  const venu = await page.evaluate(() => ({ ...attenteDansLaPage(), empreinte: empreinteDansLaPage() }));
  ok(!venu.visible && !venu.puce, 'le dessin arrivé, l’attente et le point de la puce disparaissent');
  ok(venu.etat.faits >= 1 && !venu.etat.erreur, 'le Worker a rendu le folio, sans erreur', JSON.stringify({ faits: venu.etat.faits, relus: venu.etat.relus, erreur: venu.etat.erreur, ms: tArrive }));
  ok(venu.empreinte === reference, 'LE DESSIN NE CHANGE PAS : venu du Worker, il est identique point par point à celui de la page', venu.empreinte === reference ? reference.length + ' caractères d’empreinte' : 'différent');
  const m = await page.evaluate(P.mesurerDansLaPage);
  ok(!m.filsDansBloc && !m.chevauches && !m.rompus, 'et le dessin affiché est sain', JSON.stringify({ droits: m.taux, crois: m.croisements }));

  // — la garde : rechargé, réveillé, le folio revient de l'IndexedDB sans recalcul, identique
  await page.waitForTimeout(400);
  await ouvrir(gros.petit); await page.evaluate(() => placementAilleurs(true));
  const avantGarde = await page.evaluate(p => app.plan !== p && !!app.dessin, gros.folio);
  const t1 = Date.now(); await page.evaluate(p => allerAuPlan(p), gros.folio);
  const garde = await page.waitForFunction(p => app.plan === p && !!app.dessin, gros.folio, { timeout: Math.max(3000, sync.ms / 2) }).then(() => true, () => false);
  const tRelu = Date.now() - t1, relu = await page.evaluate(() => ({ etat: etatPlacement(), empreinte: empreinteDansLaPage() }));
  ok(avantGarde && garde && relu.etat.relus >= 1, 'le concours se garde : rechargé, le folio revient de ce navigateur sans recalcul', tRelu + ' ms (contre ' + sync.ms + ' ms à recalculer), relus : ' + relu.etat.relus);
  ok(relu.empreinte === reference, 'et il est identique');

  // — une cible pendant l'attente : la recherche d'un repère d'un folio pas encore vu
  await ouvrir(gros.petit); await page.evaluate(() => placementAilleurs(true));
  const cible = await page.evaluate(p => { const petit = plans().find(q => q !== p); allerAuPlan(petit);
    const autre = plans().filter(q => q !== petit).map(q => ({ q, L: liaisonsDe(q) })).find(x => x.L.length > SEUIL_ICI);
    const l = autre.L.find(x => !estMasse(x.de) && !estRenvoi(x.de) && !VT_A_POSER.test(x.de)); const nom = l.de;
    $('toast').textContent = ''; aller({ type: 'repere', nom });
    return { nom, plan: autre.q, dessin: !!app.dessin, inspecteur: !$('inspecteur').hidden, cible: app.cible && app.cible.nom, toast: $('toast').textContent, attente: attenteDansLaPage().visible }; }, gros.folio);
  ok(cible.cible === cible.nom && cible.inspecteur && !cible.toast, `la recherche de ${cible.nom} (folio ${cible.plan}) ouvre sa fiche tout de suite, sans faux message`, JSON.stringify({ dessin: cible.dessin, attente: cible.attente, toast: cible.toast }));
  await page.waitForFunction(p => app.plan === p && !!app.dessin, cible.plan); await page.waitForTimeout(450);
  const fin = await page.evaluate(nom => ({ choisi: app.choisi, cible: app.cible && app.cible.nom, cadre: cadreDansLaPage(nom), allume: !!document.querySelector('#scene .comp.hl') }), cible.nom);
  ok(fin.choisi === cible.nom && fin.cible === cible.nom && fin.allume, 'le dessin arrivé, le repère est choisi et allumé', JSON.stringify({ choisi: fin.choisi, cible: fin.cible }));
  ok(fin.cadre.dedans, 'et cadré dans la place libre, à côté de sa fiche', fin.cadre.detail);
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  console.log('\n  ' + (ko ? ko + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
