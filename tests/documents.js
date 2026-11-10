/* ===========================================================================
   LES DOCUMENTS ET LE RÉCAPITULATIF — à la vraie souris et au clavier.
       node tests/documents.js
   (réécrite le 10 novembre 2026 pour l'écran d'aujourd'hui : l'ancienne jugeait le menu « Tableau en CSV », le calibre
   modifiable dans le tableau et le menu « Plus », qui n'existent plus.)
     1. LE RÉCAPITULATIF : sa tête (le nom du plan, la croix) ; ni menu CSV ni bouton d'ajout (les exports sont dans ⋮ ›
        Exporter, la source est votre fichier) ; la portée « Ce folio · Tout le plan » ; en moitié, le dessin vient dans la
        place libre ; le rail à gauche, en groupes, ↑ ↓ ; l'onglet Problèmes compte comme partout ;
     2. LES LIAISONS, pour l'œil : le câble porté par la flèche entre ses deux bouts (toutes les flèches pareilles), aucun
        numéro de câble, « supposée » dit une fois ; « Filtrer » et « Colonnes » ; ce qui vient de votre fichier ne s'écrit
        pas ici ; une ligne choisie ouvre sa fiche, la feuille se serre ; une fenêtre étroite remet le rail en bande ;
     3. LES DISJONCTEURS : le calibre de votre fichier, le verdict en mots (« ne disjoncte pas ») ; le seul geste qui écrit
        un calibre, la proposition de VOLTA (« Retenir le 7,5 A »), avec « Défaire » ;
     4. LES PROBLÈMES : « À régler » puis « À voir », les mêmes comptes que partout ; ce qui est à régler a son geste ;
     5. LES DOCUMENTS : ouverts par le menu, ils prennent le clavier ; Échap les ferme et rend le clavier au ⋮ ; Normes et
        Bible : deux onglets égaux, ← → de l'un à l'autre, « / » cherche dans la bible ; Vos fichiers : une seule zone de
        dépôt ; les Hypothèses : écrites dans chaque export, plus aucun courant supposé ; la LPA déplie « +N » en place ;
     6. LE SCHÉMA VISIO prend le clavier et, fermé, le rend au ⋮.
   ========================================================================= */
const { chromium } = require('playwright');
const { fichierDemande } = require('./pilote');
const { zipSync, strToU8 } = require('../vendor/fflate.min.js');
const { schemasVisio } = require('./visio/fabrique');
const FICHIER = fichierDemande();
const R = [], ok = (n, c, d) => R.push((c ? '  ok   ' : '  KO   ') + n + (c || !d ? '' : '   ← ' + String(d).slice(0, 700)));
const attendre = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const erreurs = [];
  const page = await nav.newPage({ viewport: { width: 1440, height: 900 } }); page.setDefaultTimeout(120000); page.on('pageerror', e => erreurs.push(e.message));
  await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined' && typeof BIB !== 'undefined' && BIB.pret, null, { timeout: 120000 });
  await page.evaluate(() => atelier.exemple()); await attendre(800); await page.evaluate(() => { allerAuPlan('1'); ajuster(); }); await attendre(500);
  const ev = (f, a) => page.evaluate(f, a);

  /* ---- 1. le récapitulatif ---- */
  await page.keyboard.press('b'); await attendre(800);
  const T = await ev(() => { const vu = id => { const e = $(id); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0; }, n = s => String(s || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
    return { ouvert: !$('base').hidden && $('base').classList.contains('recap'), titre: n(document.querySelector('#base .rc-titre').textContent), plan: n($('ba-contexte').textContent), nom: app.nom, bulle: n($('ba-contexte').dataset.bulle), croix: vu('ba-x'), csv: vu('ba-csv-menu'), taille: vu('ba-taille'), ajouter: vu('ba-ajouter'),
      folio: n($('ba-portee').querySelector('[data-portee="folio"]').textContent), tout: n($('ba-portee').querySelector('[data-portee="tout"]').textContent), liaisons: verite().length }; });
  ok('« b » ouvre le récapitulatif : son titre, le nom du plan (ses comptes au survol : liaisons, repères, folios), la croix', T.ouvert && T.titre === 'Récapitulatif' && T.plan === T.nom && /^\d+ liaisons · \d+ repères · \d+ folios$/.test(T.bulle) && T.croix, JSON.stringify(T));
  ok('ni menu « Tableau en CSV », ni bouton d’ajout, ni réglage de taille dans la tête : les exports sont dans ⋮ › Exporter, la source est votre fichier', !T.csv && !T.ajouter && !T.taille, JSON.stringify([T.csv, T.ajouter, T.taille]));
  ok('la portée : « Ce folio » (ses lignes) · « Tout le plan » (toutes)', /^Ce folio ?\d+$/.test(T.folio) && T.tout.replace(/ (\d+)$/, '$1') === 'Tout le plan' + T.liaisons, T.folio + ' · ' + T.tout);
  const V = await ev(() => { const d = app.dessin, b = boiteDuDessin(d), s = app.vue.s, haut = app.vue.ty + b.y * s, bas = app.vue.ty + (b.y + b.h) * s, base = $('base').getBoundingClientRect().top - $('planche').getBoundingClientRect().top; return { haut: Math.round(haut), bas: Math.round(bas), base: Math.round(base), m: marges().haut }; });
  ok('en moitié, le dessin est dans la place libre, au-dessus du récapitulatif (pas le haut blanc du folio)', V.haut >= V.m - 8 && V.bas <= V.base + 4, JSON.stringify(V));
  // le filet d'un champ : une couleur écrite (rgb, pas un `color(srgb …)` que le juge ne lit pas), à 3:1 sur la feuille, le jour et le soir
  const filet = async theme => ev(t => { document.documentElement.dataset.theme = t; const lum = c => { const v = c.match(/[\d.]+/g).slice(0, 3).map(x => +x / 255).map(x => x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const f = document.querySelector('#base .rc-filtre'), c = getComputedStyle(f).borderBottomColor, b = getComputedStyle(f).backgroundColor, r = /^rgba?\(/.test(c) ? (Math.max(lum(c), lum(b)) + 0.05) / (Math.min(lum(c), lum(b)) + 0.05) : 0;
    delete document.documentElement.dataset.theme; return { c, r: Math.round(r * 100) / 100 }; }, theme);
  const FC = [await filet('light'), await filet('dark')];
  ok('le filet de la recherche se lit comme un champ : une couleur écrite, à 3:1 au moins, le jour et le soir', FC.every(x => x.r >= 3), JSON.stringify(FC));
  const RL = await ev(() => { const o = $('ba-onglets'), ro = o.getBoundingClientRect(), rc = $('ba-corps').getBoundingClientRect(), c = compteARegler(), pb = o.querySelector('[data-onglet="problemes"]');
    return { groupes: [...o.querySelectorAll('.rc-onglets-g')].map(g => ((g.querySelector('.rc-onglets-t') || {}).textContent || '') + ':' + [...g.querySelectorAll('[data-onglet]')].map(b => b.dataset.onglet).join(',')).join(' | '),
      noms: [...o.querySelectorAll('[data-onglet] > span:not(.rc-ns)')].map(s => s.textContent.trim()).join(' · '), gauche: ro.right <= rc.left + 1 && ro.bottom > rc.top, sens: o.getAttribute('aria-orientation'),
      pb: [...pb.querySelectorAll('.rc-n')].map(b => b.className.replace('rc-n', '').trim() + ':' + b.textContent.trim()).join(), bulle: (pb.dataset.bulle || '').replace(/[  ]/g, ' '), compte: c.regler + ',' + c.voir, mot: c.mot.replace(/[  ]/g, ' ') }; });
  ok('le rail, à gauche de la table : les problèmes en tête et seuls, puis Câblage (liaisons, types de câble), Matériel (équipements, disjoncteurs, barrettes, prises, raccords), Référence (normes)',
    RL.groupes === ':problemes | Câblage:liaisons,cables | Matériel:equipements,disjoncteurs,barrettes,prises,raccords | Référence:normes' && RL.noms === 'Problèmes · Liaisons · Types de câble · Équipements · Disjoncteurs · Barrettes · Prises · Raccords · Normes' && RL.gauche && RL.sens === 'vertical', JSON.stringify(RL));
  ok('l’onglet Problèmes compte comme partout (la fiche, le panneau Repères, le dossier PDF) : « N à régler · M à voir »', RL.pb === 'ko:' + RL.compte.split(',')[0] + ',att:' + RL.compte.split(',')[1] && RL.bulle === RL.mot, RL.pb + ' | ' + RL.bulle + ' | ' + RL.mot);
  await page.focus('#ba-onglets [aria-selected="true"]'); await page.keyboard.press('ArrowDown'); await attendre(300);
  const RD = await ev(() => ({ onglet: app.base.onglet, focus: document.activeElement && document.activeElement.dataset.onglet })); await page.keyboard.press('ArrowUp'); await attendre(300);
  ok('↓ dans le rail passe à l’onglet suivant (les types de câble), ↑ revient', RD.onglet === 'cables' && RD.focus === 'cables' && await ev(() => app.base.onglet === 'liaisons'), JSON.stringify(RD));

  /* ---- 2. les liaisons, pour l'œil ---- */
  const LT = await ev(() => { const trs = [...document.querySelectorAll('#ba-tbody tr[data-i]')], n = s => String(s || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim(), ths = [...$('ba-thead').querySelectorAll('th')].filter(t => t.dataset.k);
    const fl = [...document.querySelectorAll('#ba-tbody .rc-fleche')].map(f => { const r = f.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); });
    return { n: trs.length, th: ths.map(t => n(t.textContent)).join(' · '), aligne: ths.map(t => { const i = [...t.parentElement.children].indexOf(t); return t.dataset.k + ':' + getComputedStyle(t).textAlign + '/' + getComputedStyle(trs[0].children[i]).textAlign; }).join(' '),
      fleches: [...new Set(fl)], nFleches: fl.length, types: trs.every(t => { const c = t.querySelector('.rc-c-cable .rc-cable'); return c && c.querySelector('.rc-fleche') && /^DR\d+/.test(n(c.querySelector('.rc-cable-type').textContent)); }),
      numeros: /W-\d+/.test($('ba-tbody').innerText), note: ($('ba-thead').querySelector('th[data-k="longueur"]') || { dataset: {} }).dataset.note || '', motSuppose: /supposée/i.test($('ba-tbody').innerText),
      supposees: [...document.querySelectorAll('#ba-tbody .rc-suppose [data-bulle]')].map(x => n(x.dataset.bulle))[0] || '',
      anneaux: trs.every(t => { const c = t.querySelector('.rc-c-int'); return !c || !c.querySelector('.rc-chiffre') || !!c.querySelector('.rc-anneau'); }), tirets: trs.filter(t => [...t.children].some(td => /^[—–-]$/.test(td.textContent.trim()))).length }; });
  ok('les liaisons : De · Câble · Vers, le câble PORTÉ PAR LA FLÈCHE entre ses deux bouts (son type dessus), le bout de gauche aligné à droite, celui de droite à gauche ; toutes les flèches ont la même longueur et la même épaisseur',
    /^De · Câble · Vers · Longueur/.test(LT.th) && /de:right\/right cable:center\/center vers:left\/left longueur:center\/center/.test(LT.aligne) && LT.types && LT.fleches.length === 1 && LT.nFleches === LT.n, JSON.stringify(LT));
  ok('les câbles n’ont pas de numéro ; « supposée » se dit une fois, dans l’en-tête (le détail au survol : « Votre fichier ne donne pas sa longueur : VOLTA suppose… ») ; une mesure qui a une valeur a son anneau ; aucune case faite d’un tiret',
    !LT.numeros && LT.note === 'supposée' && !LT.motSuppose && /^Votre fichier ne donne pas sa longueur : VOLTA suppose [\d,]+ m \(Hypothèses\) — à écrire dans votre fichier$/.test(LT.supposees) && LT.anneaux && !LT.tirets, JSON.stringify({ numeros: LT.numeros, note: LT.note, mot: LT.motSuppose, bulle: LT.supposees, anneaux: LT.anneaux, tirets: LT.tirets }));
  const PF = await ev(() => ({ barre: [...document.querySelectorAll('#ba-puces [data-puce]')].map(x => x.dataset.puce).join(), visible: getComputedStyle($('ba-filtrer')).display !== 'none' }));
  await page.click('#ba-filtrer-b'); await attendre(300);
  const PM = await ev(() => ({ open: $('ba-filtrer').open, lignes: [...document.querySelectorAll('#ba-filtrer-l [data-puce]')].map(x => x.dataset.puce), actives: [...document.querySelectorAll('#ba-filtrer-l [data-puce]:not(.zero)')].map(x => x.dataset.puce), rubriques: [...document.querySelectorAll('#ba-filtrer-l .rc-f-t')].map(x => x.textContent).join(' · '), focus: document.activeElement && document.activeElement.dataset.puce }));
  const route = PM.actives.find(k => /^route:/.test(k));
  if (route) { await page.click(`#ba-filtrer-l [data-puce="${route}"]`); await attendre(400); }
  const PC = await ev(r => ({ open: $('ba-filtrer').open, coche: $('ba-filtrer-l').querySelector(`[data-puce="${r}"]`).getAttribute('aria-checked'), barre: !!document.querySelector(`#ba-puces [data-puce="${r}"][aria-pressed="true"]`), n: $('ba-filtrer-n').textContent, lignes: lignesDe(LIAISONS).length > 0 && lignesDe(LIAISONS).every(x => x.l.route === r.slice(6)) }), route);
  await page.keyboard.press('Escape'); await attendre(250);
  const PE = await ev(() => ({ ferme: !$('ba-filtrer').open, focus: document.activeElement === $('ba-filtrer-b'), recap: !$('base').hidden }));
  if (route) { await page.click(`#ba-puces [data-puce="${route}"]`); await attendre(400); }
  ok('« Filtrer » : la barre garde « À reprendre » ; les routes et ce qui manque attendent dans le menu, rangés par rubrique ; cocher une route filtre, sa puce paraît pressée dans la barre, le menu reste ouvert ; Échap le ferme (pas le récapitulatif) et rend le clavier ; un clic sur la puce l’ôte',
    PF.barre === 'probleme' && PF.visible && PM.open && /^route:/.test(PM.lignes[0] || '') && PM.lignes.includes('hyp') && PM.lignes.includes('sanscontact') && PM.rubriques === 'Route · Ce qui manque' && PM.focus === PM.lignes[0]
      && PC.open && PC.coche === 'true' && PC.barre && PC.n === '1' && PC.lignes && PE.ferme && PE.focus && PE.recap && await ev(() => !(app.base.puces.liaisons || []).length), JSON.stringify({ PF, PM, PC, PE }));
  await page.click('#ba-colonnes'); await attendre(300);
  const CM = await ev(() => { const m = $('ba-colonnes-menu'), r = m.getBoundingClientRect(); return { ouvert: !m.hidden, large: m.classList.contains('large'), rubriques: [...m.querySelectorAll('.rc-menu-t')].map(x => x.textContent).join(' · '), dedans: r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1, deux: getComputedStyle(m.querySelector('.rc-menu-g')).gridTemplateColumns.split(' ').length, numero: /numéro|W-/i.test(m.textContent) }; });
  await page.keyboard.press('Escape'); await attendre(200);
  ok('« Colonnes » : celles d’office, puis les colonnes en plus rangées par rubrique (le câble, les deux bouts, le dossier), sur deux colonnes ; aucune colonne « numéro de câble » ; le menu tient dans la fenêtre', CM.ouvert && CM.large && /^D’office.* · Le câble · Les deux bouts · Le dossier$/.test(CM.rubriques) && CM.dedans && CM.deux === 2 && !CM.numero && await ev(() => $('ba-colonnes-menu').hidden && !$('base').hidden), JSON.stringify(CM));
  // CE QUI VIENT DE VOTRE FICHIER NE S'ÉCRIT PAS ICI (la charte : une seule source) : ni un double-clic ni une touche n'ouvre un champ
  await page.dblclick('#ba-tbody tr[data-i] td.rc-c-cable .rc-cable-type'); await attendre(400); await page.keyboard.type('D'); await attendre(300);
  const EC = await ev(() => ({ champ: !!document.querySelector('#ba-tbody input, #ba-tbody textarea, #ba-tbody [contenteditable="true"]'), recap: !$('base').hidden, type: verite()[+document.querySelector('#ba-tbody tr[data-i]').dataset.i].type }));
  ok('ce qui vient de votre fichier ne s’écrit pas dans le récapitulatif : un double-clic puis une touche sur le type d’un câble n’ouvrent aucun champ', !EC.champ && EC.recap && /^DR\d+/.test(EC.type), JSON.stringify(EC));
  await ev(() => { if (typeof fermerInspecteur === 'function') fermerInspecteur(); }); await attendre(300);
  // une ligne choisie : sa fiche s'ouvre à droite, la feuille se serre — la barre tient sur sa ligne
  await page.click('#ba-tbody tr[data-i] td.rc-c-de'); await attendre(900);
  const SR = await ev(() => { const o = document.querySelector('.rc-outils'); return { serre: $('base').classList.contains('serre'), etroit: $('base').classList.contains('etroit'), fiche: !$('inspecteur').hidden, cle: ($('ba-equip') || { dataset: {} }).dataset.cle || '', deborde: o.scrollWidth > o.clientWidth + 1, sens: $('ba-onglets').getAttribute('aria-orientation') }; });
  ok('une ligne choisie ouvre la fiche de son câble à droite ; la feuille se serre, le rail garde sa forme, toute la barre tient sur sa ligne', SR.fiche && /^fil#/.test(SR.cle) && SR.serre && !SR.etroit && !SR.deborde && SR.sens === 'vertical', JSON.stringify(SR));
  await ev(() => fermerInspecteur()); await attendre(300);
  await page.setViewportSize({ width: 860, height: 900 }); await attendre(600);
  const ET = await ev(() => { const o = $('ba-onglets').getBoundingClientRect(), u = document.querySelector('.rc-outils').getBoundingClientRect(); return { etroit: $('base').classList.contains('etroit'), sens: $('ba-onglets').getAttribute('aria-orientation'), dessus: o.bottom <= u.top + 1 }; });
  await page.setViewportSize({ width: 1440, height: 900 }); await attendre(600);
  ok('une fenêtre étroite (860 px) : le rail redevient une bande d’onglets au-dessus de la barre ; la fenêtre rendue, il revient à gauche', ET.etroit && ET.sens === 'horizontal' && ET.dessus && await ev(() => !$('base').classList.contains('etroit') && $('ba-onglets').getAttribute('aria-orientation') === 'vertical'), JSON.stringify(ET));

  /* ---- 3. les disjoncteurs ---- */
  await page.click('.rc-onglet[data-onglet="disjoncteurs"]'); await attendre(600);
  const DJ = () => ev(() => { const n = s => String(s || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim(), t = document.querySelector('#ba-tbody tr[data-k="102CB1"]'), b = t && t.querySelector('.rc-decider'), toast = $('toast');
    return { th: [...$('ba-thead').querySelectorAll('th')].map(x => n(x.textContent)).filter(Boolean).join(' · '), cal: t ? n(t.querySelector('.rc-c-mesure .rc-chiffre').textContent).replace(/(\d)A$/, '$1 A') : '', bulle: t ? n((t.querySelector('.rc-c-mesure [data-bulle]') || { dataset: {} }).dataset.bulle) : '', fichier: t && t.querySelector('.rc-retest') ? n(t.querySelector('.rc-retest').dataset.bulle) : '', verdict: t ? n(t.querySelector('.rc-etat').textContent) : '', vert: !!(t && t.querySelector('.rc-etat.ok')),
      geste: b ? n(b.textContent) : '', pourquoi: b ? n(b.dataset.bulle) : '', champ: !!document.querySelector('#ba-tbody input'), moteur: calibreDe('102CB1'), pn: pnDuRepere('102CB1'), message: toast ? n(toast.innerText) : '', defaire: !!(toast && [...toast.querySelectorAll('button')].some(x => /Défaire/.test(x.textContent))) }; });
  const D1 = await DJ();
  ok('Disjoncteurs : Repère · Calibre · Verdict · Permanent · Câbles protégés · État ; 102CB1 porte le 10 A de votre fichier (« Celui de votre fichier : il ne disjoncte pas, VOLTA le garde — à changer dans votre fichier »), le verdict en mots : « ne disjoncte pas » ; aucun geste quand il n’y a rien à proposer',
    D1.th === 'Repère · Calibre · Verdict · Permanent · Câbles protégés · État' && D1.cal === '10 A' && /^Celui de votre fichier : il ne disjoncte pas, VOLTA le garde — à changer dans votre fichier/.test(D1.bulle) && D1.verdict === 'ne disjoncte pas' && D1.vert && !D1.geste && !/\bmarge|touche|tient\b|\bpasse\b/.test(D1.bulle) && /Démarrage et transition : 9,31 A pendant 2,1 min — ne disjoncte pas Permanent : 5 A — ne disjoncte pas$/.test(D1.bulle), JSON.stringify(D1));
  await page.click('#ba-tbody tr[data-k="102CB1"] [data-f="calibre"]'); await attendre(400); await page.keyboard.press('Enter'); await attendre(300);
  ok('le calibre écrit vient de votre fichier : un clic puis Entrée sur sa case n’ouvrent ni champ ni liste de calibres', await ev(() => !document.querySelector('#ba-tbody input, #rc-gamme, .rc-gamme') && calibreDe('102CB1') === 10));
  await ev(() => { if (typeof fermerInspecteur === 'function') fermerInspecteur(); const c = app.contrat.charges.get('102CB1'); histPush('profil de charge de 102CB1'); app.contrat.charges.set('102CB1', { ...c, dem: { i: 5, t: 5 }, trans: { i: 5, t: 120 } }); apresEdition(); }); await attendre(600);
  const D2 = await DJ();
  ok('un profil plus léger (5 A partout) : la ligne propose le seul geste qui écrit un calibre — « Retenir le 7,5 A… », justifié en ampères au survol (« il tire 5 A ; un 7,5 A ne disjoncte qu’au-delà de 6 A »), « il ira dans l’Excel corrigé »',
    D2.cal === '10 A' && /^Retenir le 7,5 A/.test(D2.geste) && /Le plus petit qui ne disjoncte pas — il ira dans l’Excel corrigé/.test(D2.pourquoi) && /il tire 5 A ; un 7,5 A ne disjoncte qu’au-delà de 6 A/.test(D2.pourquoi) && /Défaire/.test(D2.pourquoi), JSON.stringify(D2));
  await page.click('#ba-tbody tr[data-k="102CB1"] .rc-decider'); await attendre(900);
  const D3 = await DJ();
  ok('le geste retient le 7,5 A (MS3320-7-1/2) ; le message dit « il ira dans l’Excel corrigé » et propose « Défaire » ; la ligne n’a plus rien à proposer', D3.moteur === 7.5 && D3.pn === 'MS3320-7-1/2' && D3.cal === '7,5 A' && !D3.geste && /il ira dans l’Excel corrigé/.test(D3.message) && D3.defaire, JSON.stringify(D3));
  // (deux défauts corrigés le 10 novembre 2026 : la bulle disait encore « Celui de votre fichier… VOLTA le garde » sur le calibre que
  // VOLTA venait d'écrire, et la colonne « Votre fichier » nommait le part number de VOLTA à la place de celui du fichier)
  ok('tout de suite après le geste, la case dit vrai : « Le plus petit qui ne disjoncte pas, écrit par VOLTA : il ira dans l’Excel corrigé » ; la colonne « Votre fichier » paraît et nomme le part number du fichier (« Votre fichier porte MS3320-10, un 10 A : VOLTA retient le 7,5 A »)',
    /^Le plus petit qui ne disjoncte pas, écrit par VOLTA : il ira dans l’Excel corrigé/.test(D3.bulle) && /· Votre fichier ·/.test(D3.th) && /^Votre fichier porte MS3320-10, un 10 A : VOLTA retient le 7,5 A/.test(D3.fichier), JSON.stringify({ bulle: D3.bulle.slice(0, 120), th: D3.th, fichier: D3.fichier }));
  await ev(() => { const b = [...document.querySelectorAll('#toast button')].find(x => /Défaire/.test(x.textContent)); if (b) b.click(); }); await attendre(700);
  await ev(() => defaire()); await attendre(700);
  ok('« Défaire » rend le 10 A de votre fichier ; un second rend le profil de l’exemple', await ev(() => calibreDe('102CB1') === 10 && pnDuRepere('102CB1') === 'MS3320-10' && app.contrat.charges.get('102CB1').dem.i === 9.31));

  /* ---- 4. les problèmes ---- */
  await page.click('.rc-onglet[data-onglet="problemes"]'); await attendre(600);
  await ev(() => { const t = document.querySelector('#ba-portee [data-portee="tout"]'); if (t && t.getAttribute('aria-pressed') !== 'true') t.click(); }); await attendre(500);
  const PR = await ev(() => { const n = s => String(s || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim(), trs = [...document.querySelectorAll('#ba-tbody tr')], c = compteARegler(); let niveau = '';
    const lignes = []; trs.forEach(t => { if (t.classList.contains('rc-niveau')) { niveau = t.classList.contains('ko') ? 'regler' : 'voir'; return; } if (t.classList.contains('rc-groupe')) return; lignes.push({ niveau, geste: !!t.querySelector('button.btn'), texte: n(t.innerText).slice(0, 110) }); });
    return { th: [...$('ba-thead').querySelectorAll('th')].map(x => n(x.textContent)).filter(Boolean).join(' · '), niveaux: trs.filter(t => t.classList.contains('rc-niveau')).map(t => n(t.innerText)).join(' | '), compte: c.regler + ',' + c.voir,
      regler: lignes.filter(l => l.niveau === 'regler').length, voir: lignes.filter(l => l.niveau === 'voir').length, gestes: [...new Set([...document.querySelectorAll('#ba-tbody button.btn')].map(b => n(b.textContent)))],
      voirAvecGeste: lignes.filter(l => l.niveau === 'voir' && l.geste).map(l => l.texte), reglerSansGeste: lignes.filter(l => l.niveau === 'regler' && !l.geste).map(l => l.texte),
      h: Math.min(...[...document.querySelectorAll('#ba-tbody button, #ba-tbody a')].map(b => b.getBoundingClientRect().height).filter(x => x > 0)), mots: /\btient\b|trop juste|10 % de marge/.test($('ba-tbody').innerText) }; });
  ok('Problèmes : Objet · Ce qui ne va pas · Ce qu’il faut faire ; « À régler » d’abord, puis « À voir » — les mêmes comptes que partout', PR.th === 'Objet · Ce qui ne va pas · Ce qu’il faut faire' && new RegExp('^À RÉGLER ' + PR.compte.split(',')[0] + ' \\| À VOIR ' + PR.compte.split(',')[1] + '$', 'i').test(PR.niveaux) && PR.regler + ',' + PR.voir === PR.compte, JSON.stringify({ th: PR.th, niveaux: PR.niveaux, compte: PR.compte, regler: PR.regler, voir: PR.voir }));
  ok('ce qui est à régler a l’air d’une action : son geste en bouton (« Écrire la consommation de… », « Passer en DR16 », « Lui donner son repère ») ; ce qui est à voir reste calme, sans bouton',
    ['Écrire la consommation de 103RL1', 'Passer en DR16', 'Lui donner son repère'].every(g => PR.gestes.includes(g)) && !PR.voirAvecGeste.length && PR.reglerSansGeste.length <= 1, JSON.stringify({ gestes: PR.gestes, voirAvecGeste: PR.voirAvecGeste, reglerSansGeste: PR.reglerSansGeste }));
  ok('les boutons et les liens de la table font 28 px de haut au moins ; ni « tient », ni « trop juste », ni marge', PR.h >= 27.5 && !PR.mots, 'h ' + PR.h);
  await page.keyboard.press('b'); await attendre(400);
  ok('« b » referme le récapitulatif', await ev(() => $('base').hidden || !document.body.classList.contains('base-ouverte')));

  /* ---- 5. les documents ---- */
  const parLeMenu = async (...sels) => { await page.click('#btnMenu'); await attendre(250); for (const s of sels) { await page.click('#menu ' + s); await attendre(350); } await attendre(300); };
  const REG = '[data-sous="reglages"]', AIDE = '[data-sous="aide"]';
  for (const [nom, titre, sels] of [['Vos fichiers', 'Vos fichiers', ['[data-act="fichiers"]']], ['la LPA', 'LPA', ['[data-act="nomenclature"]']], ['l’Historique', 'Historique', ['[data-act="historique"]']], ['les Normes', 'Normes et bible', [REG, '[data-act="normes"]']], ['les Hypothèses', 'Hypothèses', [REG, '[data-act="hypotheses"]']],
    ['le Cartouche', 'Cartouche', [REG, '[data-act="cartouche"]']], ['l’IA interne', 'IA interne', [REG, '[data-act="ia"]']], ['la Sauvegarde', 'Sauvegarde', [REG, '[data-act="sauvegarde"]']], ['« Comment VOLTA réfléchit »', 'Comment VOLTA réfléchit', [AIDE, '[data-act="comprendre"]']], ['le Bilan anonyme', 'Bilan anonyme', [AIDE, '[data-act="bilan"]']]]) {
    // (le clavier part de la page, comme après un clic sur la table — Échap doit quand même le rendre au ⋮)
    await ev(() => document.activeElement && document.activeElement.blur && document.activeElement.blur()); await page.mouse.move(3, 3);
    await parLeMenu(...sels);
    const d = await ev(() => ({ dans: $('fiche').contains(document.activeElement), titre: (document.querySelector('#fiche .fiche-tete h2') || {}).textContent, croix: ($('fi-fermer').querySelector('.bulle') || {}).textContent }));
    await page.keyboard.press('Escape'); await attendre(350);
    const apres = await ev(() => ({ ferme: $('fiche').hidden, ici: document.activeElement === $('btnMenu'), bulle: $('btnMenu').classList.contains('bulle-on') }));
    ok(`${nom} : ouvert par le menu, le document prend le clavier, sa croix dit « Fermer · Échap » ; Échap le ferme et rend le clavier au ⋮ (sans sa bulle)`, d.dans && d.titre === titre && /Fermer\s*Échap/.test(d.croix) && apres.ferme && apres.ici && !apres.bulle, JSON.stringify({ ...d, ...apres })); }
  // les deux feuilles volantes de l'Aide (les raccourcis, le carnet) : le même contrat — un défaut corrigé le 10 novembre 2026
  for (const [nom, id, act] of [['les raccourcis', 'raccourcis', 'raccourcis'], ['« Noter une hésitation »', 'carnet', 'carnet']]) {
    await ev(() => document.activeElement && document.activeElement.blur && document.activeElement.blur()); await page.mouse.move(3, 3);
    await parLeMenu(AIDE, `[data-act="${act}"]`);
    const d = await ev(i => ({ ouvert: !!$(i) && !$(i).hidden, dans: !!$(i) && $(i).contains(document.activeElement) }), id);
    await page.keyboard.press('Escape'); await attendre(350);
    const apres = await ev(i => ({ ferme: $(i).hidden, ici: document.activeElement === $('btnMenu') }), id);
    ok(`${nom} : ouverts par le menu, ils prennent le clavier ; Échap les ferme et rend le clavier au ⋮`, d.ouvert && d.dans && apres.ferme && apres.ici, JSON.stringify({ ...d, ...apres })); }
  await parLeMenu(REG, '[data-act="normes"]');
  const N = await ev(() => { const os = [...document.querySelectorAll('#fiche .onglet[data-nm-vue]')]; return { titre: document.querySelector('#fiche .fiche-tete h2').classList.contains('sans'), focus: document.activeElement.dataset.nmVue, onglets: os.map(o => o.dataset.nmVue).join(), l: os.map(o => Math.round(o.getBoundingClientRect().width)),
    source: [...document.querySelectorAll('#fiche .nm-t-source')].filter(s => s.scrollWidth > s.clientWidth + 1).every(s => s.dataset.bulle), sens: [...document.querySelectorAll('#fiche .nm-dom-sens')].every(s => s.dataset.bulle) }; });
  ok('Normes : deux onglets font le titre (Normes, la bible), de la même largeur ; le clavier sur « Normes » ; chaque source coupée et chaque domaine ont leur bulle', N.titre && N.focus === 'normes' && N.onglets === 'normes,bible' && Math.abs(N.l[0] - N.l[1]) <= 1 && N.source && N.sens, JSON.stringify(N));
  await page.keyboard.press('ArrowRight'); await attendre(500);
  ok('→ passe à la bible des barrettes, connecteurs et prises, le clavier sur son onglet', await ev(() => app.fiche && app.fiche.mode === 'bible' && document.activeElement.dataset.nmVue === 'bible'));
  await page.keyboard.press('/'); await attendre(200);
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
  const H = await ev(() => ({ chapeau: document.querySelector('#fiche .fiche-tete + .note').textContent, lignes: document.querySelectorAll('#fiche .hy-ligne').length, q: [...document.querySelectorAll('#fiche .hy-ligne')].every(l => { const q = l.querySelector('.hy-q'); return q && q.dataset.bulle && q.dataset.bulle.length > 20; }),
    courtes: [...document.querySelectorAll('#fiche .hy-sert')].every(p => p.textContent.length <= 120), courant: /courant supposé|courant par défaut|\bmarge\b/i.test($('fiche').innerText) }));
  ok('les Hypothèses disent que leurs réglages sont écrits dans chaque export ; chaque réglage, une phrase courte et son « ? » ; plus aucun courant supposé ni marge (VOLTA n’invente rien)', /Ces réglages sont écrits dans chaque export/.test(H.chapeau) && H.lignes > 10 && H.q && H.courtes && !H.courant, JSON.stringify({ ...H, chapeau: H.chapeau.slice(0, 80) }));
  // la LPA : « +N » déplie ses repères en place, « moins » les replie ; deux onglets, Pièces et Suivi ; le CSV au trait, l'Excel plein
  await ev(() => ficheNomenclature()); await attendre(500);
  const NO0 = await ev(() => { const b = document.querySelector('#fiche .no-plus'); return b ? { n: b.textContent, cache: b.parentElement.querySelector('.no-reste').hidden, onglets: [...document.querySelectorAll('#fiche [data-no-vue]')].map(x => x.textContent).join('|'), papier: $('no-csv').classList.contains('papier') && $('no-xlsx').classList.contains('cuivre') } : null; });
  if (NO0) { await page.click('#fiche .no-plus'); await attendre(250); }
  const NO1 = NO0 ? await ev(() => { const b = document.querySelector('#fiche .no-plus'); return { n: b.textContent, vu: !b.parentElement.querySelector('.no-reste').hidden, ouvert: b.getAttribute('aria-expanded') }; }) : null;
  if (NO0) { await page.click('#fiche .no-plus'); await attendre(250); }
  const NO2 = NO0 ? await ev(() => { const b = document.querySelector('#fiche .no-plus'); return { n: b.textContent, cache: b.parentElement.querySelector('.no-reste').hidden }; }) : null;
  ok('la LPA : « +N » déplie ses repères en place (« moins » les replie) ; deux onglets, Pièces et Suivi ; le CSV au trait, l’Excel plein', !!NO0 && NO0.cache && /^\+\d+$/.test(NO0.n) && NO0.onglets === 'Pièces|Suivi' && NO0.papier && NO1.vu && NO1.n === 'moins' && NO1.ouvert === 'true' && NO2.cache && NO2.n === NO0.n, JSON.stringify({ NO0, NO1, NO2 }));
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
