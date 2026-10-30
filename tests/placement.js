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
       encore, l'attente « Dessin du folio 3 / 6 · 66 câbles · environ 8 s » au
       milieu de la table, une barre, « Pendant ce temps : les problèmes, le
       récapitulatif », la puce du folio qui respire), que l'écran répond
       pendant le calcul (on change de folio, on revient), que l'ESQUISSE
       arrive d'abord (un dessin complet, sain, la petite bande le dit), puis
       que le dessin du concours la remplace EN SE RANGEANT (v73 : les blocs
       glissent, jamais deux dessins à la fois), la feuille exactement à
       sa place à l'écran, IDENTIQUE, point par point, à celui que la page
       calcule elle-même — le Worker partage son concours avec ses aides ;
     · que retenir un autre calibre ne change pas la clé du placement (le part
       number n'en est pas), et qu'un numéro de câble changé garde le folio
       dessiné (le dessin d'avant, son étiquette à jour) jusqu'au nouveau ;
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
// une machine chargée (d'autres programmes) étire tout : le seuil de « tout de suite » avec elle
const MARGE = () => Math.max(1, require('os').loadavg()[0] / Math.max(1, require('os').cpus().length) * 1.5);

// le dessin, point par point : blocs, fils, barrettes à poser, feuille
const empreinteDansLaPage = () => { const d = app.dessin; if (!d) return null;
  return JSON.stringify({ c: d.comps.map(c => [c.name, c.kind, c.x, c.y, c.w, c.h, c.col]), f: d.fils.map(w => [w.i, w.cable, (w.pts || []).map(p => [p.x, p.y])]),
    b: (d.barrettes || []).map(b => [b.nomVT, b.x, (b.bornes || []).map(p => [p.n, p.y])]), bb: d.bbox }); };
// l'attente telle qu'on la voit : l'élément, son texte, la puce du folio qui respire
const attenteDansLaPage = () => { const el = $('attente'), chip = document.querySelector(`#fo-strip .chip[data-plan="${app.plan}"]`);
  return { visible: !!el && !el.hidden && el.getBoundingClientRect().height > 0, texte: el ? el.textContent : '', puce: !!chip && chip.classList.contains('attend'), dessin: !!app.dessin, provisoire: app.dessin && app.dessin.provisoire,
    barre: !!el && !!el.querySelector('.at-barre'), gestes: el && el.querySelector('.at-gestes') ? el.querySelector('.at-gestes').textContent : '', bande: !$('affinage').hidden ? $('af-txt').textContent : '', etat: etatPlacement() }; };
// la feuille à l'écran : son coin et sa taille (le dessin définitif doit la laisser où l'esquisse l'avait posée)
const feuilleDansLaPage = () => { const d = app.dessin; if (!d) return null; const s = app.vue.s, bb = d.bbox; return [app.vue.tx + bb.x * s, app.vue.ty + bb.y * s, bb.w * s, bb.h * s].map(v => Math.round(v * 10) / 10); };
/* le bloc est-il dans la place libre du plan (hors rail, barre du bas, volet épinglé) ? La CARTE flottante (v72, 08-carte)
   ne prend pas de place au plan : elle ne doit seulement pas cacher le bloc */
const cadreDansLaPage = nom => { const d = app.dessin, c = d && d.comps.find(k => k.name === nom && k.kind !== 'tag'); if (!c) return { dedans: false, detail: nom + ' absent' };
  const r = $('planche').getBoundingClientRect(), s = app.vue.s, X0 = r.left + app.vue.tx + c.x * s, Y0 = r.top + app.vue.ty + c.y * s, X1 = X0 + c.w * s, Y1 = Y0 + c.h * s;
  const vu = id => { const e = $(id); if (!e || e.hidden) return null; const q = e.getBoundingClientRect(); return q.width && q.height ? q : null; };
  let L = r.left, T = r.top, R = r.right, B = r.bottom; const insp = vu('inspecteur'), fol = vu('folios'), rail = vu('rail'), carte = insp && document.body.classList.contains('insp-flotte');
  if (insp && !carte) R = Math.min(R, insp.left); if (fol) B = Math.min(B, fol.top); if (rail) L = Math.max(L, rail.right);
  const sousLaCarte = carte && Math.min(X1, insp.right) - Math.max(X0, insp.left) > 1 && Math.min(Y1, insp.bottom) - Math.max(Y0, insp.top) > 1;
  return { dedans: X0 >= L - 1 && X1 <= R + 1 && Y0 >= T - 1 && Y1 <= B + 1 && !sousLaCarte, detail: `bloc ${Math.round(X0)}–${Math.round(X1)} × ${Math.round(Y0)}–${Math.round(Y1)}, place libre ${Math.round(L)}–${Math.round(R)} × ${Math.round(T)}–${Math.round(B)}${sousLaCarte ? ', sous la carte' : ''}` }; };


(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await nav.newContext({ viewport: { width: 1400, height: 900 } });
  // les trois aides vivent dans la page, à chaque chargement
  await ctx.addInitScript({ content: `window.empreinteDansLaPage = ${empreinteDansLaPage}; window.attenteDansLaPage = ${attenteDansLaPage}; window.cadreDansLaPage = ${cadreDansLaPage}; window.feuilleDansLaPage = ${feuilleDansLaPage};` });
  const page = await ctx.newPage(); page.setDefaultTimeout(180000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  let ko = 0; const ok = (c, nom, detail) => { if (!c) ko++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (detail ? '   ' + detail : '')); };
  /* (Re)charger la page sur un petit folio : le contrat gardé rouvre sur son dernier folio enregistré, et sous pilote un
     gros folio s'y recalculerait dans la page avant tout réveil ; on enregistre donc d'abord le plus petit folio. */
  const ouvrir = async petit => { if (petit) { await page.evaluate(p => { allerAuPlan(p); sauver(); }, petit); await page.waitForTimeout(600); }
    await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined');
    // l’outil s’ouvre sur la bibliothèque : la première fois, l’exemple se demande ; ensuite le plan gardé se reprend (il est dessous)
    await page.evaluate(() => app.contrat.liaisons.length ? atelier.reprendre() : atelier.exemple()); };
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
  ok(loin.ms < 300 * MARGE() && !loin.dessin, `réveillé, allerAuPlan('${gros.folio}') rend la main tout de suite`, loin.ms + ' ms (contre ' + sync.ms + ' ms dans la page)');
  ok(loin.visible && new RegExp('Dessin du folio ' + gros.folio).test(loin.texte) && new RegExp(gros.n + ' câbles').test(loin.texte) && /environ \d+ (s|min)/.test(loin.texte) && !/\bfils?\b|moteur|quelques secondes|écran reste libre/.test(loin.texte), 'l’attente se voit au milieu de la table : « Dessin du folio… », ses câbles, une durée — ni « fils », ni « moteur », ni « quelques secondes »', loin.texte);
  ok(loin.barre && /problème|points à voir|repères/.test(loin.gestes) && /récapitulatif/.test(loin.gestes), 'une barre, et ce qu’on peut faire pendant : les problèmes, le récapitulatif', loin.gestes);
  ok(loin.puce, 'la puce du folio respire dans la barre du bas');
  ok(loin.etat.worker === 'oui' && loin.etat.attentes.includes(gros.folio), 'le moteur tourne en Worker, le folio est en attente', JSON.stringify(loin.etat));
  if (process.env.CAPTURES) await page.screenshot({ path: process.env.CAPTURES + '/placement-attente.png' }).catch(() => { });
  // l'écran répond : un petit folio s'ouvre pendant le calcul (dans la page, il est petit), et l'on revient attendre
  const libre = await page.evaluate(([petit, gros]) => { allerAuPlan(petit); const a = attenteDansLaPage(); allerAuPlan(gros); const b = attenteDansLaPage(); return { petitDessine: a.dessin, petitSansAttente: !a.visible, retourAttend: (b.visible && !b.dessin) || b.provisoire === 'esquisse' }; }, [gros.petit, gros.folio]);
  ok(libre.petitDessine && libre.petitSansAttente, `pendant le calcul, le folio ${gros.petit} (${gros.nPetit} liaisons ≤ ${gros.seuil}) s’ouvre aussitôt, sans attente`);
  ok(libre.retourAttend, 'revenu sur le gros folio, l’attente est toujours là');
  // l'esquisse d'abord : un dessin complet, sain, que la petite bande annonce ; l'attente s'efface
  const t0 = Date.now(); await page.waitForFunction(p => app.plan === p && !!app.dessin, gros.folio); const tEsquisse = Date.now() - t0;
  const esq = await page.evaluate(() => ({ ...attenteDansLaPage(), feuille: feuilleDansLaPage(), empreinte: empreinteDansLaPage() }));
  ok(esq.provisoire === 'esquisse' && !esq.visible && /Esquisse/.test(esq.bande), 'l’ESQUISSE arrive d’abord : le folio se lit, l’attente s’efface, la bande dit « Esquisse · le dessin définitif dans… »', tEsquisse + ' ms · ' + esq.bande);
  const me = await page.evaluate(P.mesurerDansLaPage);
  ok(!me.filsDansBloc && !me.chevauches && !me.rompus, 'l’esquisse est un dessin sain', JSON.stringify({ droits: me.taux, crois: me.croisements }));
  if (process.env.CAPTURES) await page.screenshot({ path: process.env.CAPTURES + '/placement-esquisse.png' }).catch(() => { });
  // puis le dessin du concours la remplace : il SE RANGE (v73, le moment signature n° 3 — le fondu enchaîné superposait deux
  // dessins), la feuille à sa place, identique à celui de la page (MIS À JOUR : le fondu n'est plus)
  await page.waitForFunction(p => app.plan === p && !!app.dessin && !app.dessin.provisoire, gros.folio); const tArrive = Date.now() - t0;
  const venu = await page.evaluate(() => ({ ...attenteDansLaPage(), feuille: feuilleDansLaPage(), empreinte: empreinteDansLaPage(),
    range: { glissent: [...document.querySelectorAll('#scene .comp')].filter(g => g.getAnimations().some(a => a.playState === 'running')).length, copieDuDessin: !!document.querySelector('#planche .dessin-fondu'),
      blocsCopies: document.querySelectorAll('#svg > .range-part .comp').length, cablesQuiPartent: !!document.querySelector('#svg > .range-part .cab'), cablesQuiAttendent: !!document.querySelector('#scene > .range-cables .cab'), scenes: document.querySelectorAll('[id="scene"]').length } }));
  ok(JSON.stringify(venu.feuille) === JSON.stringify(esq.feuille) && venu.empreinte !== esq.empreinte, 'le dessin définitif remplace l’esquisse SANS QUE LA VUE SAUTE : la feuille au même coin, à la même taille', JSON.stringify(esq.feuille) + ' → ' + JSON.stringify(venu.feuille));
  ok(venu.range.glissent > 0 && !venu.range.copieDuDessin && !venu.range.blocsCopies && venu.range.scenes === 1 && venu.range.cablesQuiAttendent,
    'le dessin SE RANGE : les blocs glissent de l’esquisse au définitif, sans double image (aucune copie du dessin ni d’un bloc) ; les câbles du définitif attendent', JSON.stringify(venu.range));
  await page.waitForTimeout(900);
  ok(await page.evaluate(() => !document.querySelector('#svg > .range-part') && !document.querySelector('#scene .range-cables') && document.querySelectorAll('#scene > .comp').length > 0 && !document.querySelector('#scene .comp').getAnimations().length),
    'le rangement fini, la copie des câbles de l’esquisse s’en va, tout est à sa place dans la scène');
  ok(!venu.visible && !venu.puce, 'le dessin arrivé, l’attente et le point de la puce disparaissent');
  ok(venu.etat.faits >= 1 && !venu.etat.erreur, 'le Worker a rendu le folio, sans erreur', JSON.stringify({ faits: venu.etat.faits, relus: venu.etat.relus, aides: venu.etat.aides, erreur: venu.etat.erreur, ms: tArrive }));
  ok(venu.empreinte === reference, 'LE DESSIN NE CHANGE PAS : venu du Worker, il est identique point par point à celui de la page', venu.empreinte === reference ? reference.length + ' caractères d’empreinte' : 'différent');
  const m = await page.evaluate(P.mesurerDansLaPage);
  ok(!m.filsDansBloc && !m.chevauches && !m.rompus, 'et le dessin affiché est sain', JSON.stringify({ droits: m.taux, crois: m.croisements }));

  // — le part number n'est pas dans la clé : retenir un autre calibre ne refait pas le placement (l'audit : 42 s sans dessin)
  const cal = await page.evaluate(() => { allerAuPlan('1'); const k0 = cleCourante(), avant = app.dessin; retenirCalibre('102CB1', 20); redessiner(); const k1 = cleCourante();
    return { meme: k0 === k1, dessinGarde: !!app.dessin && app.dessin.comps === avant.comps, pn: pnDuRepere('102CB1') }; });
  ok(cal.meme && cal.dessinGarde, 'retenir un autre calibre (le part number change) ne change pas la clé du placement : le folio reste, le même', JSON.stringify(cal));
  await page.evaluate(() => { annuler(); });
  // — un numéro de câble changé sur le gros folio : la clé change, mais le folio reste dessiné (le dessin d'avant) jusqu'au nouveau
  const avant = await page.evaluate(p => { allerAuPlan(p); const l = app.contrat.liaisons.find(x => x.plan === p && x.cable); const ancien = l.cable; l.cable = ancien + 'X'; redessiner();
    return { ancien, nouveau: l.cable, provisoire: app.dessin && app.dessin.provisoire, etiquette: !!(app.dessin && app.dessin.fils.some(w => w.cable === l.cable)), attente: attenteDansLaPage().visible }; }, gros.folio);
  ok(avant.provisoire === 'avant' && avant.etiquette && !avant.attente, 'un numéro de câble changé : le folio ne s’efface pas — son dessin d’avant reste, l’étiquette à jour, le nouveau se calcule', JSON.stringify(avant));
  await page.waitForFunction(p => app.plan === p && !!app.dessin && !app.dessin.provisoire, gros.folio);
  const apres = await page.evaluate(n => ({ etiquette: app.dessin.fils.some(w => w.cable === n) }), avant.nouveau);
  ok(apres.etiquette, 'puis le nouveau dessin arrive, avec le nouveau numéro');
  await page.evaluate(([p, ancien, nouveau]) => { const l = app.contrat.liaisons.find(x => x.plan === p && x.cable === nouveau); l.cable = ancien; redessiner(); }, [gros.folio, avant.ancien, avant.nouveau]);

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
  await page.waitForFunction(p => app.plan === p && !!app.dessin && !app.dessin.provisoire, cible.plan); await page.waitForTimeout(700);
  const fin = await page.evaluate(nom => ({ choisi: app.choisi, cible: app.cible && app.cible.nom, cadre: cadreDansLaPage(nom), allume: !!document.querySelector('#scene .comp.hl') }), cible.nom);
  ok(fin.choisi === cible.nom && fin.cible === cible.nom && fin.allume, 'le dessin arrivé, le repère est choisi et allumé', JSON.stringify({ choisi: fin.choisi, cible: fin.cible }));
  ok(fin.cadre.dedans, 'et cadré dans la place libre, à côté de sa fiche', fin.cadre.detail);
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  console.log('\n  ' + (ko ? ko + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
