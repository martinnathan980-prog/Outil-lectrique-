/* ===========================================================================
   LES DOCUMENTS ET LE RÉCAPITULATIF (v73, le domaine E) — à la vraie souris et au clavier.
       node tests/documents.js
     1. LE RÉCAPITULATIF : « Tableau en CSV » est un menu qui dit ce qu'il sort (ce qui est montré, tout l'onglet) et met le
        retest corrigé au bas ; la portée dit « Ce folio · Tout le plan » ; « À reprendre » compte le plan, le folio en second ;
        en moitié, le dessin vient dans la place libre au-dessus du tiroir ; les liens de la table ont 28 px ;
     1 bis. L'ŒIL (v74) : le rail des onglets à gauche, en trois groupes, ↑ ↓ ; « ok » se tait, « supposée » se dit une fois,
        la gauge que le type dit ne se répète pas ; « Filtrer » range les puces de plus (la barre garde « À reprendre ») ;
        « Colonnes » par rubriques, sur deux colonnes ; la fiche épinglée serre la feuille sans faire sauter le rail ; une
        feuille étroite remet le rail en bande ;
     2. LE CHOIX DU CALIBRE : l'onglet Disjoncteurs dit le retest et le verdict en trois mots ; la case Calibre ouvre TOUTE
        la gamme, le composant de la fiche (`choixDuCalibre`) — les mêmes calibres, les mêmes mots ; ↑ ↓ et Entrée retiennent
        un calibre qui déclenche (rouge, « déclenche ») ; Ctrl+Z le rend ; « Tout le catalogue » ; Échap rend la case ;
     3. ÉCRIRE : sur la ligne choisie, un clic sur une valeur l'écrit ; une touche sur une valeur qui a le clavier ouvre son
        champ ; Ctrl+Maj+Z dans un champ refait, ne défait pas ;
     4. CE QU'IL FAUT FAIRE : l'onglet Problèmes porte les gestes du contrôle (« Tout régler… ») ; « ou un calibre plus
        petit » a disparu ;
     5. LES DOCUMENTS : ouverts par le menu, ils prennent le clavier ; Échap les ferme et rend le clavier au ⋮ ; la croix a sa
        bulle ; Normes et Bible : les onglets font le titre, ← → passent de l'un à l'autre, « / » met le clavier dans la
        recherche de la bible, qui trouve « 12-8 » ; Vos fichiers : une seule zone de dépôt ; les Hypothèses disent que leurs
        réglages sont écrits dans chaque export, une phrase et son « ? » par réglage ; la nomenclature déplie « +11 » en
        place, « Le suivi » au trait à côté du CSV (v74) ; dans l'onglet Problèmes rangé par genre, le niveau est un point et
        un geste répété s'écrit une fois, puis « ″ » (v74) ;
     6. LE SCHÉMA VISIO prend le clavier et, fermé, le rend au ⋮.
   ========================================================================= */
const { chromium } = require('playwright');
const { fichierDemande } = require('./pilote');
const { zipSync, strToU8 } = require('../vendor/fflate.min.js');
const { schemasVisio } = require('./visio/fabrique');
const FICHIER = fichierDemande();
const R = [], ok = (n, c, d) => R.push((c ? '  ok   ' : '  KO   ') + n + (c || !d ? '' : '   ← ' + String(d).slice(0, 400)));
const attendre = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const erreurs = [];
  const page = await nav.newPage({ viewport: { width: 1440, height: 900 } }); page.setDefaultTimeout(120000); page.on('pageerror', e => erreurs.push(e.message));
  await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined' && typeof BIB !== 'undefined' && BIB.pret, null, { timeout: 120000 });
  await page.evaluate(() => atelier.exemple()); await attendre(800); await page.evaluate(() => { allerAuPlan('1'); ajuster(); }); await attendre(500);
  const ev = (f, a) => page.evaluate(f, a);

  /* ---- 1. le récapitulatif ---- */
  await page.keyboard.press('b'); await attendre(700);
  const T = await ev(() => ({ csv: $('ba-csv').textContent.trim(), folio: $('ba-portee').querySelector('[data-portee="folio"]').textContent.replace(/\d+/g, '').trim(), tout: $('ba-portee').querySelector('[data-portee="tout"]').textContent.replace(/\d+/g, '').trim() }));
  ok('la tête dit « Tableau en CSV » ; la portée « Ce folio · Tout le plan »', T.csv === 'Tableau en CSV' && T.folio === 'Ce folio' && T.tout === 'Tout le plan', JSON.stringify(T));
  await page.click('#ba-csv'); await attendre(250);
  const M = await ev(() => ({ open: $('ba-csv-menu').open, lignes: [...document.querySelectorAll('#ba-csv-l button')].map(b => b.id), focus: document.activeElement && document.activeElement.id }));
  ok('« Tableau en CSV » ouvre un menu : ce qui est montré, tout l’onglet, puis le retest corrigé ; le clavier sur la première ligne', M.open && M.lignes.join() === 'ba-csv-vu,ba-csv-tout,ba-csv-retest' && M.focus === 'ba-csv-vu', JSON.stringify(M));
  await page.keyboard.press('Escape'); await attendre(200);
  ok('Échap ferme le menu, le clavier revient au bouton, le récapitulatif reste', await ev(() => !$('ba-csv-menu').open && document.activeElement === $('ba-csv') && !$('base').hidden));
  const P = await ev(() => { const x = document.querySelector('#ba-puces [data-puce="probleme"]'), s = [...x.querySelectorAll('small')].map(e => e.textContent);
    const plan = verite().map((l, i) => ligneLiaison(l, i)).filter(r => /ko|att/.test(r.F().etat.niveau)).length, ici = lignesDe(LIAISONS, true).filter(r => /ko|att/.test(r.F().etat.niveau)).length; return { s, plan, ici }; });
  ok('« À reprendre » compte tout le plan, le folio en second (« 4 · 3 sur ce folio »)', +P.s[0] === P.plan && (P.plan === P.ici ? P.s.length === 1 : P.s[1] === '· ' + P.ici + ' sur ce folio'), JSON.stringify(P));
  const V = await ev(() => { const d = app.dessin, b = boiteDuDessin(d), s = app.vue.s, haut = app.vue.ty + b.y * s, bas = app.vue.ty + (b.y + b.h) * s, base = $('base').getBoundingClientRect().top - $('planche').getBoundingClientRect().top; return { haut: Math.round(haut), bas: Math.round(bas), base: Math.round(base), m: marges().haut }; });
  ok('en moitié, le dessin est dans la place libre, au-dessus du tiroir (pas le haut blanc de la feuille)', V.haut >= V.m - 8 && V.bas <= V.base + 4, JSON.stringify(V));
  // le filet d'un champ : une couleur écrite (rgb, pas un `color(srgb …)` que le juge ne lit pas), à 3:1 sur la feuille, le jour et le soir
  const filet = async theme => ev(t => { document.documentElement.dataset.theme = t; const lum = c => { const v = c.match(/[\d.]+/g).slice(0, 3).map(x => +x / 255).map(x => x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const f = document.querySelector('#base .rc-filtre'), c = getComputedStyle(f).borderBottomColor, b = getComputedStyle(f).backgroundColor, r = /^rgba?\(/.test(c) ? (Math.max(lum(c), lum(b)) + 0.05) / (Math.min(lum(c), lum(b)) + 0.05) : 0;
    delete document.documentElement.dataset.theme; return { c, r: Math.round(r * 100) / 100 }; }, theme);
  const FC = [await filet('light'), await filet('dark')];
  ok('le filet de la recherche se lit comme un champ : une couleur écrite, à 3:1 au moins, le jour et le soir', FC.every(x => x.r >= 3), JSON.stringify(FC));

  /* ---- 1 bis. le récapitulatif pour l'œil (v74 : « trop de données, l'œil se perd ; le rail de gauche, c'est bien ») ---- */
  const RL = await ev(() => { const o = $('ba-onglets'), ro = o.getBoundingClientRect(), rc = $('ba-corps').getBoundingClientRect();
    return { groupes: [...o.querySelectorAll('.rc-onglets-g')].map(g => g.querySelector('.rc-onglets-t').textContent + ':' + [...g.querySelectorAll('[data-onglet]')].map(b => b.dataset.onglet).join(',')).join(' | '),
      gauche: ro.right <= rc.left + 1 && ro.bottom > rc.top, sens: o.getAttribute('aria-orientation'), ambre: o.querySelectorAll('.rc-carre.att').length,
      tete: $('ba-contexte').textContent === app.nom, plan: getComputedStyle($('ba-fermer')).display, croix: $('ba-x').getBoundingClientRect().width > 0 }; });
  ok('le rail : à gauche de la table, trois groupes (Câblage : liaisons, câbles · Matériel : équipements, disjoncteurs, barrettes, prises, raccords · Contrôle : problèmes, normes), un point rouge seulement ; la tête dit le nom du plan, la croix ferme (« Plan » ne double plus)',
    RL.groupes === 'Câblage:liaisons,cables | Matériel:equipements,disjoncteurs,barrettes,prises,raccords | Contrôle:problemes,normes' && RL.gauche && RL.sens === 'vertical' && !RL.ambre && RL.tete && RL.plan === 'none' && RL.croix, JSON.stringify(RL));
  await page.focus('#ba-onglets [aria-selected="true"]'); await page.keyboard.press('ArrowDown'); await attendre(300);
  const RD = await ev(() => ({ onglet: app.base.onglet, focus: document.activeElement && document.activeElement.dataset.onglet })); await page.keyboard.press('ArrowUp'); await attendre(300);
  ok('↓ dans le rail passe à l’onglet suivant (les Câbles), ↑ revient', RD.onglet === 'cables' && RD.focus === 'cables' && await ev(() => app.base.onglet === 'liaisons'), JSON.stringify(RD));
  const LT = await ev(() => { const trs = [...document.querySelectorAll('#ba-tbody tr[data-i]')];
    return { ok: [...document.querySelectorAll('#ba-tbody .rc-etat.ok')].every(e => e.textContent === 'ok' && e.getBoundingClientRect().width < 16), nOk: document.querySelectorAll('#ba-tbody .rc-etat.ok').length,
      note: ($('ba-thead').querySelector('th[data-k="longueur"]') || {}).dataset.note || '', supposees: document.querySelectorAll('#ba-tbody .rc-hyp').length,
      jauges: trs.filter(t => { const l = verite()[+t.dataset.i], g = jaugeDuType(l.type); return g != null && String(l.type).endsWith(String(g)) && t.querySelector('.rc-cable .rc-jauge'); }).length, n: trs.length }; });
  ok('ce qui va bien se tait : « ok » n’est plus écrit (son point, le mot pour le lecteur d’écran) ; « supposée » une fois, dans l’en-tête ; la gauge que le type dit déjà (DR12) ne se répète pas',
    LT.nOk > 0 && LT.ok && LT.note === 'supposée' && !LT.supposees && !LT.jauges, JSON.stringify(LT));
  const PF = await ev(() => ({ barre: [...document.querySelectorAll('#ba-puces [data-puce]')].map(x => x.dataset.puce).join(), visible: !$('ba-filtrer').hidden }));
  await page.click('#ba-filtrer-b'); await attendre(300);
  const PM = await ev(() => ({ open: $('ba-filtrer').open, lignes: [...document.querySelectorAll('#ba-filtrer-l [data-puce]')].map(x => x.dataset.puce), rubriques: [...document.querySelectorAll('#ba-filtrer-l .rc-f-t')].map(x => x.textContent).join(' · '), focus: document.activeElement && document.activeElement.dataset.puce }));
  const route = PM.lignes.find(k => /^route:/.test(k));
  if (route) { await page.click(`#ba-filtrer-l [data-puce="${route}"]`); await attendre(400); }
  const PC = await ev(r => ({ open: $('ba-filtrer').open, coche: ($('ba-filtrer-l').querySelector(`[data-puce="${r}"]`) || {}).getAttribute ? $('ba-filtrer-l').querySelector(`[data-puce="${r}"]`).getAttribute('aria-checked') : '', barre: !!document.querySelector(`#ba-puces [data-puce="${r}"][aria-pressed="true"]`), n: $('ba-filtrer-n').textContent, lignes: lignesDe(LIAISONS).every(x => x.l.route === r.slice(6)) }), route);
  await page.keyboard.press('Escape'); await attendre(250);
  const PE = await ev(() => ({ ferme: !$('ba-filtrer').open, focus: document.activeElement === $('ba-filtrer-b') }));
  if (route) { await page.click(`#ba-puces [data-puce="${route}"]`); await attendre(400); }
  ok('« Filtrer » : la barre garde « À reprendre » ; les routes et ce qui manque attendent dans le menu, rangés par rubrique ; cocher une route filtre, sa puce paraît pressée dans la barre, le menu reste ouvert ; Échap le ferme et rend le clavier ; un clic sur la puce l’ôte',
    PF.barre === 'probleme' && PF.visible && PM.open && /^route:/.test(PM.lignes[0] || '') && PM.lignes.includes('hyp') && PM.lignes.includes('sanscontact') && PM.rubriques === 'Route · Ce qui manque' && PM.focus === PM.lignes[0]
      && PC.open && PC.coche === 'true' && PC.barre && PC.n === '1' && PC.lignes && PE.ferme && PE.focus && await ev(() => !(app.base.puces.liaisons || []).length), JSON.stringify({ PF, PM, PC, PE }));
  await page.click('#ba-colonnes'); await attendre(300);
  const CM = await ev(() => { const m = $('ba-colonnes-menu'), r = m.getBoundingClientRect(); return { large: m.classList.contains('large'), rubriques: [...m.querySelectorAll('.rc-menu-t')].map(x => x.textContent).join(' · '), dedans: r.bottom <= $('base').getBoundingClientRect().bottom + 1, deux: getComputedStyle(m.querySelector('.rc-menu-g')).gridTemplateColumns.split(' ').length }; });
  await page.keyboard.press('Escape'); await attendre(200);
  ok('« Colonnes » : d’office, puis les colonnes en plus rangées par rubrique (le câble, les deux bouts, le dossier), sur deux colonnes ; le menu se tient dans la feuille', CM.large && CM.rubriques === 'D’office · Le câble · Les deux bouts · Le dossier' && CM.dedans && CM.deux === 2, JSON.stringify(CM));
  // une ligne choisie : la fiche s'épingle à droite, la feuille se serre — le rail s'amincit sans changer de forme, la barre tient sur une ligne
  await page.click('#ba-tbody tr[data-i] td.rc-c-bout'); await attendre(900);
  const SR = await ev(() => { const o = $('ba-outils') || document.querySelector('.rc-outils'), aj = $('ba-ajouter').getBoundingClientRect(), ro = o.getBoundingClientRect();
    return { serre: $('base').classList.contains('serre'), etroit: $('base').classList.contains('etroit'), fiche: !$('inspecteur').hidden, deborde: o.scrollWidth > o.clientWidth + 1, ajout: aj.right <= ro.right + 1 && aj.width > 0, puces: $('ba-puces').scrollWidth <= $('ba-puces').clientWidth + 1 }; });
  ok('une ligne choisie (la fiche épinglée) : le rail s’amincit sans sauter, toute la barre tient sur sa ligne', SR.fiche && SR.serre && !SR.etroit && !SR.deborde && SR.ajout && SR.puces, JSON.stringify(SR));
  await ev(() => fermerInspecteur()); await attendre(300);
  await page.setViewportSize({ width: 860, height: 900 }); await attendre(600);
  const ET = await ev(() => { const o = $('ba-onglets'); return { etroit: $('base').classList.contains('etroit'), sens: o.getAttribute('aria-orientation'), dessus: o.getBoundingClientRect().bottom <= document.querySelector('.rc-outils').getBoundingClientRect().top + 1 }; });
  await page.setViewportSize({ width: 1440, height: 900 }); await attendre(600);
  ok('une feuille étroite (860 px) : le rail redevient une bande d’onglets au-dessus de la barre ; la fenêtre rendue, il revient', ET.etroit && ET.sens === 'horizontal' && ET.dessus && await ev(() => !$('base').classList.contains('etroit') && $('ba-onglets').getAttribute('aria-orientation') === 'vertical'), JSON.stringify(ET));

  /* ---- 2. le choix du calibre ---- */
  await ev(() => { app.base.portee = 'tout'; changerOnglet('disjoncteurs'); }); await attendre(400);
  const D = await ev(() => { const tr = document.querySelector('#ba-tbody tr[data-k="102CB1"]'), d = disjonctionDe('102CB1');
    return { th: [...document.querySelectorAll('#ba-thead th')].map(t => t.textContent).filter(Boolean).join(' · '), retest: tr.querySelector('.rc-retest') ? tr.querySelector('.rc-retest').textContent.replace(/\s+/g, '') : '', barre: !!tr.querySelector('.rc-retest s .rc-u'), verdict: tr.querySelector('td.rc-c-etat .rc-etat').textContent, mot: verdictDeCalibre(d).mot, cal: d.calibre }; });
  // (v74 : la colonne se dit « Installation » — MIS À JOUR)
  ok('Disjoncteurs : Repère · Calibre · Installation · Verdict · Problèmes ; le 10 A de l’installation barré (son unité aussi) à côté du 15 A retenu ; le verdict en trois mots', D.th === 'Repère · Calibre · Installation · Verdict · Problèmes' && D.retest === '10A' && D.barre && D.verdict === D.mot && ['passe', 'juste', 'déclenche'].includes(D.verdict), JSON.stringify(D));
  await page.click('#ba-tbody tr[data-k="102CB1"] td.rc-c-rep'); await attendre(500);
  await page.click('#ba-tbody tr[data-k="102CB1"] [data-f="calibre"]'); await page.waitForSelector('#rc-gamme', { timeout: 5000 }).catch(() => {});
  // la case du calibre est un choix : l'anneau prend le nombre ET son unité (pas « [15] A »)
  const anneau = await ev(() => { const v = document.querySelector('#ba-tbody tr[data-k="102CB1"] [data-f="calibre"]'), c = v.parentElement, u = c.querySelector('.rc-u'), rc = c.getBoundingClientRect(), ru = u.getBoundingClientRect();
    return { cadre: getComputedStyle(c).boxShadow, case: getComputedStyle(v).boxShadow, unite: ru.right <= rc.right + 0.5 }; });
  ok('ouverte, la case du calibre porte l’anneau autour du nombre et de son unité', /\d+px/.test(anneau.cadre) && anneau.cadre !== 'none' && anneau.case === 'none' && anneau.unite, JSON.stringify(anneau));
  const G = await ev(() => { const xs = choixDuCalibre('102CB1'), ls = [...document.querySelectorAll('#rc-gamme .rc-g-l')];
    return { n: ls.length, attendu: xs.length, cals: ls.map(l => +l.dataset.cal).join(), cx: xs.map(x => x.calibre).join(), mots: ls.map(l => l.querySelector('em').textContent).join(), mx: xs.map(x => x.mot).join(), retenu: (document.querySelector('#rc-gamme [aria-selected="true"]') || {}).dataset, focus: document.activeElement && document.activeElement.classList.contains('rc-g-l') }; });
  ok('sur la ligne choisie, un clic sur le calibre ouvre TOUTE la gamme, celle du cadran de la fiche (les mêmes calibres, les mêmes mots)', G.n >= 7 && G.cals === G.cx && G.mots === G.mx && G.focus && G.retenu && G.retenu.cal === '15', JSON.stringify(G));
  // au clavier : remonter jusqu'au 5 A (il déclenche : 15 → 10 → 7,5 → 5) et le retenir
  for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowUp'); await attendre(60); }
  const vise = await ev(() => document.activeElement.dataset.cal); await page.keyboard.press('Enter'); await attendre(800);
  const K = await ev(() => { const d = disjonctionDe('102CB1'), tr = document.querySelector('#ba-tbody tr[data-k="102CB1"]'); return { cal: d.calibre, ferme: !document.getElementById('rc-gamme'), verdict: tr.querySelector('td.rc-c-etat .rc-etat').textContent, ko: tr.querySelector('td.rc-c-etat .rc-etat').classList.contains('ko'), focus: document.activeElement && document.activeElement.dataset.f }; });
  ok('↑ ↑ ↑ puis Entrée retient un calibre qui ne passe pas (5 A) : la liste se ferme, la ligne dit « déclenche » en rouge, le clavier revient à la case', vise === '5' && K.cal === 5 && K.ferme && K.verdict === 'déclenche' && K.ko && K.focus === 'calibre', JSON.stringify({ vise, ...K }));
  await page.keyboard.press('Control+z'); await attendre(600);
  ok('Ctrl+Z rend le calibre d’avant', await ev(() => disjonctionDe('102CB1').calibre === 15));
  // (Ctrl+Z rouvre la fiche, qui prend le clavier : on revient à la case d'un clic)
  await page.click('#ba-tbody tr[data-k="102CB1"] [data-f="calibre"]'); await page.waitForSelector('#rc-gamme', { timeout: 5000 }).catch(() => {});
  const cat = await ev(() => { const b = document.querySelector('#rc-gamme [data-g-tout="1"]'); return b ? b.textContent : ''; });
  if (cat) { await page.click('#rc-gamme [data-g-tout="1"]'); await attendre(300); }
  const C = await ev(() => ({ n: document.querySelectorAll('#rc-gamme .rc-g-l').length, hors: document.querySelectorAll('#rc-gamme .rc-g-l.hors').length, tout: choixDuCalibre('102CB1', true).length }));
  ok('un clic rouvre la gamme ; « Tout le catalogue MS3320 (13) » montre les 13, ceux hors des calibres préférés marqués', /Tout le catalogue MS3320 \(13\)/.test(cat) && C.n === 13 && C.n === C.tout && C.hors === 6, JSON.stringify({ cat, ...C }));
  await page.keyboard.press('Escape'); await attendre(200);
  ok('Échap ferme la gamme et rend le clavier à la case', await ev(() => !document.getElementById('rc-gamme') && document.activeElement && document.activeElement.dataset.f === 'calibre' && !$('base').hidden));

  /* ---- 3. écrire ---- */
  await ev(() => { if (typeof fermerInspecteur === 'function') fermerInspecteur(); app.cible = null; app.choisi = null; allerAuPlan('1'); app.base.filtre = ''; app.base.filtreAuto = false; $('ba-filtre').value = ''; changerOnglet('liaisons'); app.base.portee = 'folio'; rendreBase(true); }); await attendre(500);
  const k13 = await ev(() => [...document.querySelectorAll('#ba-tbody tr[data-i]')].find(t => verite()[+t.dataset.i].cable === 'W-013').dataset.k), sel = `#ba-tbody tr[data-k="${k13}"]`;
  await page.click(`${sel} [data-f="type"]`); await attendre(400);
  const E1 = await ev(s => ({ edite: !!document.querySelector(s + ' input[data-f="type"]'), focus: document.activeElement && document.activeElement.dataset.f, choisie: document.querySelector(s).classList.contains('on') }), sel);
  ok('un premier clic sur une valeur choisit la ligne et lui donne le clavier (sans l’écrire encore)', !E1.edite && E1.focus === 'type' && E1.choisie, JSON.stringify(E1));
  await page.keyboard.press('D'); await attendre(200);
  const E2 = await ev(s => { const i = document.querySelector(s + ' input[data-f="type"]'); return { v: i && i.value, focus: document.activeElement === i }; }, sel);
  ok('une touche sur la valeur qui a le clavier ouvre son champ et la reçoit (« D »)', E2.v === 'D' && E2.focus, JSON.stringify(E2));
  await page.keyboard.press('Escape'); await attendre(200);
  await page.click(`${sel} [data-f="type"]`); await attendre(300);
  ok('sur la ligne choisie, un clic sur une valeur l’écrit (comme dans la fiche)', await ev(s => !!document.querySelector(s + ' input[data-f="type"]'), sel));
  await page.keyboard.press('Escape'); await attendre(200);
  await ev(() => { const l = verite().find(x => x.cable === 'W-013'); changerLiaison(l, 'type', 'DR20', 'type de W-013'); }); await attendre(200);
  await page.keyboard.press('Control+z'); await attendre(300); const avant = await ev(() => verite().find(x => x.cable === 'W-013').type);
  await page.click(`${sel} [data-f="type"]`); await attendre(300); await page.keyboard.press('Control+Shift+z'); await attendre(400);
  const Z = await ev(() => ({ t: verite().find(x => x.cable === 'W-013').type, toast: $('toast').textContent }));
  ok('Ctrl+Maj+Z dans un champ du récapitulatif REFAIT (il ne défait pas)', avant === 'DR22' && Z.t === 'DR20' && /^Refait/.test(Z.toast), JSON.stringify({ avant, ...Z }));
  await page.keyboard.press('Control+z'); await attendre(300);
  // (v74) une touche de l'outil ne s'écrit pas dans la case qui a le clavier : « b » ferme le récapitulatif
  await ev(s => { const v = document.querySelector(s + ' [data-f="type"]'); v.focus(); }, sel); await page.keyboard.press('b'); await attendre(400);
  const TB = await ev(() => ({ ferme: $('base').hidden, type: verite().find(x => x.cable === 'W-013').type, champ: !!document.querySelector('#ba-tbody input') }));
  await page.keyboard.press('b'); await attendre(500);
  ok('« b » sur une case qui a le clavier ferme le récapitulatif (il ne s’écrit pas dans la case) ; « b » le rouvre', TB.ferme && TB.type === 'DR22' && !TB.champ && await ev(() => !$('base').hidden), JSON.stringify(TB));

  /* ---- 4. ce qu'il faut faire ---- */
  // (v74 : la règle du calibre écrit déjà le 15 A dans l'exemple — le geste « Tout régler » se juge sur l'exemple de la v73,
  // le 10 A proposé, pas écrit — MIS À JOUR)
  await ev(() => { atelier.exempleSansCalibreAuto(); }); await attendre(1200);
  await ev(() => { allerAuPlan('1'); ouvrirBase('moitie'); app.base.portee = 'tout'; changerOnglet('problemes'); }); await attendre(600);
  const Q = await ev(() => ({ gestes: [...document.querySelectorAll('#ba-tbody [data-geste-pb]')].map(b => b.textContent), texte: $('ba-tbody').textContent, liens: [...document.querySelectorAll('#ba-tbody .rc-lien')].map(b => b.getBoundingClientRect().height) }));
  ok('« Ce qu’il faut faire » : le geste concret en bouton (« Tout régler : 102CB1 en 15 A… ») ; « ou un calibre plus petit » a disparu', Q.gestes.some(g => /^Tout régler\s:\s102CB1 en 15\sA/.test(g)) && !/ou un calibre plus petit/.test(Q.texte), JSON.stringify(Q.gestes.slice(0, 4)));
  ok('les liens de la table (Voir, Voir le premier…) font 28 px de haut', Q.liens.length > 0 && Q.liens.every(h => h >= 27.5), JSON.stringify(Q.liens));
  // (v74) rangé par genre : le niveau, un point ; le même geste d'une ligne à la suivante, « ″ »
  const PR = await ev(() => { const p = document.querySelector('#ba-tbody .rc-pareil'); return { pareils: document.querySelectorAll('#ba-tbody .rc-pareil').length, premiers: [...document.querySelectorAll('#ba-tbody tr[data-k]')].filter(t => t.querySelector('[data-geste-pb]')).length,
    points: [...document.querySelectorAll('#ba-tbody tr[data-k] td.rc-c-etat .rc-etat')].every(e => e.classList.contains('seul') && /^(problème|à voir)$/.test(e.textContent)), bulle: p ? p.dataset.bulle : '' }; });
  ok('rangé par genre, chaque ligne ne garde du niveau que son point (le mot pour le lecteur d’écran) ; un geste qui se répète d’une ligne à la suivante s’écrit une fois, puis « ″ » (sa bulle le redit)', PR.pareils > 0 && PR.premiers > 0 && PR.points && /^Le même geste/.test(PR.bulle), JSON.stringify(PR));
  await page.keyboard.press('b'); await attendre(400);

  /* ---- 5. les documents ---- */
  const parLeMenu = async (...sels) => { await page.click('#btnMenu'); await attendre(250); for (const s of sels) { await page.click('#menu ' + s); await attendre(300); } await attendre(300); };
  for (const [nom, sels] of [['Vos fichiers', ['[data-act="fichiers"]']], ['les Normes', ['[data-sous="plus"]', '[data-act="normes"]']], ['la Bible', ['[data-sous="plus"]', '[data-act="bible"]']], ['les Hypothèses', ['[data-sous="plus"]', '[data-act="hypotheses"]']]]) {
    // (le clavier part de la page, comme après un clic sur la table : le titre caché garde le focus jusqu'à l'image
    // suivante — Échap doit quand même le rendre au ⋮)
    await ev(() => document.activeElement && document.activeElement.blur && document.activeElement.blur()); await page.mouse.move(3, 3);
    await parLeMenu(...sels);
    const dans = await ev(() => $('fiche').contains(document.activeElement));
    await page.keyboard.press('Escape'); await attendre(300);
    const apres = await ev(() => ({ ferme: $('fiche').hidden, ici: document.activeElement === $('btnMenu'), bulle: $('btnMenu').classList.contains('bulle-on') }));
    ok(`${nom} : ouvert par le menu, le document prend le clavier ; Échap le ferme et rend le clavier au ⋮ (sans sa bulle)`, dans && apres.ferme && apres.ici && !apres.bulle, JSON.stringify({ dans, ...apres })); }
  await parLeMenu('[data-sous="plus"]', '[data-act="normes"]');
  const N = await ev(() => ({ croix: ($('fi-fermer').querySelector('.bulle') || {}).textContent, titre: document.querySelector('#fiche .fiche-tete h2').classList.contains('sr'), focus: document.activeElement.dataset.nmVue, source: [...document.querySelectorAll('#fiche .nm-t-source')].filter(s => s.scrollWidth > s.clientWidth + 1).every(s => s.dataset.bulle), sens: [...document.querySelectorAll('#fiche .nm-dom-sens')].every(s => s.dataset.bulle) }));
  ok('Normes : la croix dit « Fermer · Échap » ; les onglets font le titre (le titre reste pour les lecteurs d’écran), le clavier sur « Normes » ; chaque source coupée et chaque domaine ont leur bulle', /Fermer\s*Échap/.test(N.croix) && N.titre && N.focus === 'normes' && N.source && N.sens, JSON.stringify(N));
  await page.keyboard.press('ArrowRight'); await attendre(500);
  ok('→ passe à la Bible des barrettes, le clavier sur son onglet', await ev(() => app.fiche && app.fiche.mode === 'bible' && document.activeElement.dataset.nmVue === 'bible'));
  await page.keyboard.press('/'); await attendre(150);
  ok('« / » met le clavier dans la recherche de la bible (pas dans celle du plan)', await ev(() => document.activeElement && document.activeElement.id === 'bi-q' && !rechercheOuverte()));
  await page.keyboard.type('12-8', { delay: 20 }); await attendre(600);
  const B = await ev(() => { const refs = [...document.querySelectorAll('#fiche .ref-btn')].map(b => b.textContent), h = [...document.querySelectorAll('#fiche .ref-btn')].map(b => b.getBoundingClientRect().height); return { refs, h, focus: document.activeElement.id }; });
  ok('la bible trouve « 12-8 » (le clavier reste dans la recherche) ; chaque référence a sa cible de 28 px', B.refs.length > 0 && B.refs.every(r => /12-?0?8/.test(r)) && B.focus === 'bi-q' && B.h.every(x => x >= 27.5), JSON.stringify({ n: B.refs.length, r: B.refs.slice(0, 4), focus: B.focus }));
  await page.keyboard.press('Escape'); await attendre(250); await page.keyboard.press('Escape'); await attendre(250); await page.keyboard.press('Escape'); await attendre(300);
  ok('Échap vide la recherche, puis la quitte, puis ferme la bible', await ev(() => $('fiche').hidden && !(app.base.bibleQ || '')));
  await ev(() => ficheFichiers()); await attendre(400);
  const F = await ev(() => ({ zones: [...document.querySelectorAll('#fiche .vf-zone')].map(z => z.closest('.vf-carte').dataset.entree), boutons: [...document.querySelectorAll('#vf-retest .vf-action')].length }));
  ok('Vos fichiers : une seule zone de dépôt (l’entrée qu’on vient chercher), qui est son geste — pas un bouton en double', F.zones.length === 1 && F.zones[0] === 'retest' && F.boutons === 0, JSON.stringify(F));
  await ev(() => ficheHypotheses()); await attendre(400);
  const H = await ev(() => ({ chapeau: document.querySelector('#fiche .fiche-tete + .note').textContent, lignes: document.querySelectorAll('#fiche .hy-ligne').length, q: [...document.querySelectorAll('#fiche .hy-ligne')].every(l => { const q = l.querySelector('.hy-q'); return q && q.dataset.bulle && q.dataset.bulle.length > 20; }), courtes: [...document.querySelectorAll('#fiche .hy-sert')].every(p => p.textContent.length < 90) }));
  ok('les Hypothèses disent que leurs réglages sont écrits dans chaque export ; chaque réglage, une phrase et son « ? » (le paragraphe entier)', /Ces réglages sont écrits dans chaque export/.test(H.chapeau) && H.lignes > 10 && H.q && H.courtes, JSON.stringify({ ...H, chapeau: H.chapeau.slice(0, 80) }));
  // la nomenclature (v74) : « +11 » déplie ses repères en place, « moins » les replie ; le suivi au trait, à côté du CSV
  await ev(() => ficheNomenclature()); await attendre(500);
  const NO0 = await ev(() => { const b = document.querySelector('#fiche .no-plus'); return b ? { n: b.textContent, cache: b.parentElement.querySelector('.no-reste').hidden, suivi: $('no-suivi').previousElementSibling && $('no-suivi').previousElementSibling.id, papier: $('no-suivi').classList.contains('papier') } : null; });
  if (NO0) { await page.click('#fiche .no-plus'); await attendre(250); }
  const NO1 = NO0 ? await ev(() => { const b = document.querySelector('#fiche .no-plus'); return { n: b.textContent, vu: !b.parentElement.querySelector('.no-reste').hidden, ouvert: b.getAttribute('aria-expanded') }; }) : null;
  if (NO0) { await page.click('#fiche .no-plus'); await attendre(250); }
  const NO2 = NO0 ? await ev(() => { const b = document.querySelector('#fiche .no-plus'); return { n: b.textContent, cache: b.parentElement.querySelector('.no-reste').hidden }; }) : null;
  ok('la nomenclature : « +N » déplie ses repères en place (« moins » les replie) ; « Le suivi » au trait, à côté d’« Exporter CSV »', !!NO0 && NO0.cache && /^\+\d+$/.test(NO0.n) && NO0.suivi === 'no-csv' && NO0.papier && NO1.vu && NO1.n === 'moins' && NO1.ouvert === 'true' && NO2.cache && NO2.n === NO0.n, JSON.stringify({ NO0, NO1, NO2 }));
  await ev(() => fermerFiche(true)); await attendre(300);

  /* ---- 6. le schéma Visio ---- */
  const S = schemasVisio(), b64 = Buffer.from(zipSync(Object.fromEntries(Object.entries(S[0].fichiers).map(([k, v]) => [k, strToU8(v)])))).toString('base64');
  await page.click('#btnMenu'); await attendre(200); await page.keyboard.press('Escape'); await attendre(200);
  await ev(async b => { await ouvrirFichier(new File([Uint8Array.from(atob(b), c => c.charCodeAt(0))], 'essai.vsdx')); }, b64); await attendre(1500);
  const vis = await ev(() => ({ ouvert: !$('visio').hidden, dans: $('visio').contains(document.activeElement), croix: ($('visio-fermer').querySelector('.bulle') || {}).textContent }));
  await page.keyboard.press('Escape'); await attendre(300);
  const vis2 = await ev(() => ({ ferme: $('visio').hidden, ici: document.activeElement === $('btnMenu') }));
  ok('le schéma Visio prend le clavier ; sa croix dit « Fermer · Échap » ; Échap le ferme et rend le clavier au ⋮', vis.ouvert && vis.dans && /Fermer\s*Échap/.test(vis.croix) && vis2.ferme && vis2.ici, JSON.stringify({ ...vis, ...vis2 }));
  await page.close();

  R.forEach(x => console.log(x));
  const ko = R.filter(x => x.startsWith('  KO')).length;
  console.log('\n  erreurs de page :', erreurs.length ? [...new Set(erreurs)].slice(0, 3).join(' | ') : 'aucune');
  console.log('  ' + (R.length - ko) + ' / ' + R.length + ' contrôles passés' + (ko ? ' — ' + ko + ' échec(s)' : ' — tout tient'));
  await nav.close(); process.exit(ko || erreurs.length ? 1 : 0);
})();
