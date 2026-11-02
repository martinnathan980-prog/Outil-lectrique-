/* L'ŒIL — ce que le lecteur ne devrait jamais avoir à signaler, mesuré sur chaque fiche (carte, grand, chaque onglet) et
   sur le récapitulatif :
     · les onglets d'une même barre ont tous la même largeur ;
     · aucun texte coupé (« … » ou débordement caché) dans un titre, une étiquette, un onglet, une cellule ;
     · aucun texte qui en chevauche un autre ;
     · aucun élément visible qui sort de la fiche.
       node tests/ecran/oeil.js [clair|sombre] [largeur]
   Le code de sortie est le nombre de défauts. */
const { ouvrir, exemple } = require('./commun');
const [, , THEME = 'clair', L = '1440'] = process.argv;
(async () => { const { b, p, erreurs } = await ouvrir({ theme: THEME, l: +L, h: Math.round(+L * 0.625) }); await exemple(p);
  const defauts = await p.evaluate(async () => { const pause = ms => new Promise(f => setTimeout(f, ms)), out = [];
    // vraiment vu : ni lui ni un parent transparent, caché ou replié ; sa boîte rognée par les parents qui coupent
    const boite = e => { let r = e.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return null; let x0 = r.left, y0 = r.top, x1 = r.right, y1 = r.bottom;
      if (e.closest('details:not([open])') && !e.closest('summary')) return null;
      for (let a = e; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return null;
        if (a !== e && (s.overflow !== 'visible' || s.overflowX !== 'visible' || s.overflowY !== 'visible')) { const q = a.getBoundingClientRect(); x0 = Math.max(x0, q.left); y0 = Math.max(y0, q.top); x1 = Math.min(x1, q.right); y1 = Math.min(y1, q.bottom); }
        if (x1 - x0 < 2 || y1 - y0 < 2) return null; }
      return { left: x0, top: y0, right: x1, bottom: y1, width: x1 - x0, height: y1 - y0 }; };
    const vu = e => !!boite(e);
    const dire = (ou, quoi) => { if (out.length < 400) out.push(ou + ' — ' + quoi); };
    function examiner(ou, racine) { if (!racine) return;
      // 1. des onglets de même largeur
      racine.querySelectorAll('.nv-onglets, [role="tablist"]').forEach(bar => { const os = [...bar.querySelectorAll(':scope > .nv-onglet, :scope > [role="tab"]')].filter(vu);
        if (os.length > 1) { const ls = os.map(o => Math.round(o.getBoundingClientRect().width)); if (Math.max(...ls) - Math.min(...ls) > 2) dire(ou, 'onglets de largeurs inégales : ' + ls.join(' / ')); } });
      // 2. du texte coupé
      racine.querySelectorAll('*').forEach(e => { if (!vu(e) || !e.childNodes.length) return; const s = getComputedStyle(e);
        const texte = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!texte) return;
        const coupe = (s.textOverflow === 'ellipsis' || s.overflow === 'hidden' || s.overflowX === 'hidden') && e.scrollWidth > e.clientWidth + 1;
        if (coupe && !e.closest('svg') && e.tagName !== 'INPUT') dire(ou, `texte coupé : « ${e.textContent.trim().slice(0, 50)} » (${e.className || e.tagName})`); });
      // 3. des textes qui se chevauchent (feuilles de texte seulement, hors svg)
      const feuilles = [...racine.querySelectorAll('span, b, small, strong, em, i, h1, h2, h3, h4, p, label, button, td, th, li')].filter(e => vu(e) && !e.closest('svg') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && ![...e.children].length);
      const R = feuilles.map(e => ({ e, r: boite(e) })).filter(x => x.r);
      for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) { const a = R[i].r, c = R[j].r;
        const x = Math.min(a.right, c.right) - Math.max(a.left, c.left), y = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
        if (x > 3 && y > 3 && !R[i].e.contains(R[j].e) && !R[j].e.contains(R[i].e)) dire(ou, `chevauchement : « ${R[i].e.textContent.trim().slice(0, 30)} » / « ${R[j].e.textContent.trim().slice(0, 30)} »`); }
      // 4. ce qui sort de la fiche (hors défilement)
      const cadre = racine.getBoundingClientRect();
      racine.querySelectorAll('h1, h2, h3, h4, .nv-onglet, button').forEach(e => { if (!vu(e)) return; const r = e.getBoundingClientRect();
        if (r.right > cadre.right + 2 || r.left < cadre.left - 2) dire(ou, `sort de la fiche : « ${e.textContent.trim().slice(0, 40)} »`); }); }
    const fiche = () => document.getElementById('inspecteur');
    for (const pl of plans()) { allerAuPlan(pl); await pause(120);
      const noms = [...new Set(app.dessin.comps.filter(k => k.kind !== 'tag' && !estMasse(k.name)).map(k => k.name))].slice(0, 8);
      for (const n of noms) { if (NIVEAU.grand) reduireFiche(); montrerBloc(n); await pause(80); examiner(`f${pl} ${n} carte`, fiche());
        ouvrirGrand(''); await pause(80);
        for (const k of [...document.querySelectorAll('#ba-equip .nv-onglet')].map(x => x.dataset.onglet)) { activerOnglet(k); await pause(60); examiner(`f${pl} ${n} › ${k}`, fiche()); }
        reduireFiche(); } }
    if (NIVEAU.grand) reduireFiche(); basculerBase(); await pause(400);
    for (const x of [...document.querySelectorAll('#base .rc-onglet')]) { x.click(); await pause(250); examiner('récap ' + x.dataset.onglet, document.getElementById('base')); }
    return out; });
  await b.close();
  const uniques = [...new Set(defauts.map(d => d.replace(/^f\d+ \S+ /, '')))];
  console.log(uniques.slice(0, 120).join('\n'));
  if (erreurs.length) console.log('ERREURS DE LA PAGE\n' + erreurs.join('\n'));
  const n = uniques.length + erreurs.length; console.log(n ? `${n} défaut(s)` : 'tout est vert — l’œil ne trouve rien'); process.exit(Math.min(n, 99)); })();
