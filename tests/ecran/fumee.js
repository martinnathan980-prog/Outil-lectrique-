/* La fumée : chaque bloc de chaque folio, sa carte, son grand, chaque onglet ; douze fils par folio. Aucune erreur, aucune
   fiche vide.  node tests/ecran/fumee.js */
const { ouvrir, exemple } = require('./commun');
(async () => { const { b, p, erreurs } = await ouvrir({ l: 1600, h: 960 }); await exemple(p);
  const r = await p.evaluate(async () => { const pause = ms => new Promise(f => setTimeout(f, ms)), bilan = { blocs: 0, fils: 0, onglets: 0, ko: [] };
    const verif = q => { const box = document.getElementById('ba-equip'), e = typeof FI !== 'undefined' && FI.erreur; if (e) { bilan.ko.push(q + ' : ' + String(e.stack || e).slice(0, 200)); FI.erreur = null; } if (!box || !box.innerHTML.trim()) bilan.ko.push(q + ' : fiche vide'); };
    for (const pl of plans()) { allerAuPlan(pl); await pause(150);
      for (const n of [...new Set(app.dessin.comps.filter(k => k.kind !== 'tag').map(k => k.name))]) { if (NIVEAU.grand) reduireFiche(); montrerBloc(n); await pause(30); verif('carte ' + n);
        ouvrirGrand(''); await pause(30); verif('grand ' + n);
        for (const t of [...document.querySelectorAll('#ba-equip .nv-onglet')].map(x => x.dataset.onglet)) { activerOnglet(t); bilan.onglets++; verif(n + ' › ' + t); }
        reduireFiche(); bilan.blocs++; }
      for (const l of liaisonsDuPlan().slice(0, 12)) { const s = sourceDe(l) || l; if (NIVEAU.grand) reduireFiche(); montrerFil(s); await pause(20); verif('carte fil'); ouvrirGrand(''); await pause(20); verif('grand fil'); reduireFiche(); bilan.fils++; } }
    return bilan; });
  await b.close(); const n = r.ko.length + erreurs.length;
  console.log(JSON.stringify({ ...r, ko: r.ko.slice(0, 15), erreurs: erreurs.slice(0, 8) }));
  console.log(n ? `ÉCHEC — ${n} problème(s)` : `tout tient — ${r.blocs} blocs, ${r.fils} fils, ${r.onglets} onglets`); process.exit(n ? 1 : 0); })();
