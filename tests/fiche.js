/* ===========================================================================
   FICHE — ce qu'on voit quand on clique un bloc ou un câble (08 bis, 08-sections, 08 ter), la fiche v4.
       NODE_PATH=/opt/node22/lib/node_modules node tests/fiche.js [--fichier=chemin]

   Sur l'exemple embarqué, chaque fiche a le MÊME squelette, et l'ingénieur
   ne s'y perd pas :
     · LA BARRE en tête (‹ ›, × ; le repère s'y écrit quand l'en-tête passe
       dessous), puis l'EN-TÊTE (le symbole, le type — une liste qui le
       change —, la désignation, le repère et son crayon ; plus de tuiles,
       sauf pour un câble), puis LES PROBLÈMES, repliés juste dessous, qui se
       déplient EN PLACE (une ligne par point, la section qui le démontre ; un
       clic l'ouvre et l'allume), puis PEU DE SECTIONS dans l'ordre fixe
       (Calibre, Connecteur, Raccord, De → vers, Câbles, Déjà fait) — plus
       d'Identité ;
     · un équipement : les connecteurs en segments (le fautif marqué), la
       NORME d'abord (en puce, un clic montre la face ; son « ? »), le part
       number en petit, les contacts (Borne · Contact · Gauge ✓/✗ · Câble) ;
       le Raccord dans sa carte ; une barrette : le module, sa norme qui ouvre
       la GALERIE des assemblages, la face vivante, les contacts par
       potentiel ; une prise : UNE face, l'autre d'un clic, les paires ; une
       masse : ses câbles, leur nombre dans le titre ; un câble : ses tuiles
       (le type et la longueur s'y écrivent), de → vers, l'intensité et la
       chute ;
     · le disjoncteur : la section « Calibre » — le calibre retenu en grand et
       son verdict, « Automatique (15 A) », « Autre calibre » qui ouvre la
       gamme ; le profil où chaque état se supprime et revient ;
     · LES CÂBLES d'une fiche : le type, la longueur, le contact au bout
       s'écrivent DANS la ligne, « ↺ » les rend ;
     · LE « ? » : une bulle, une seule à la fois, au clavier aussi ;
     · TOUT se change sur place, « main » et « ↺ » ; Ctrl+Z défait chaque
       geste et la fiche reste ouverte ; écrire dans le profil d'un
       disjoncteur refait la fiche en place, la main dans le champ ;
     · ouvrir une fiche depuis une fiche EMPILE : ‹ (Alt+←) revient à la même
       place, › repart ; un bout de câble ouvre l'équipement sur son
       connecteur, le contact allumé ; le plan ne bouge pas si l'objet est en
       vue ; les hypothèses de la simulation depuis la pastille « hyp. » ;
       l'index.
   Rend 1 au premier échec.
   =========================================================================== */
const { chromium } = require('playwright');
const P = require('./pilote');
const FICHIER = P.fichierDemande();

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await nav.newPage({ viewport: { width: 1600, height: 950 } }); page.setDefaultTimeout(300000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  let ko = 0; const ok = (c, nom, detail) => { if (!c) ko++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (detail ? '   ' + detail : '')); };
  await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined'); await page.evaluate(() => atelier.exemple());   // l’outil s’ouvre sur la bibliothèque (plus sur l’exemple) : la batterie, qui lit l’exemple, le demande
  const bloc = (plan, nom) => page.evaluate(([plan, nom]) => { allerAuPlan(plan); const c = app.dessin.comps.find(k => k.name === nom && (k.kind !== 'tag' || estMasse(nom))); if (c) choisirBloc(c); else choisirBarretteAPoser(barretteAPoser(nom)); }, [plan, nom]);
  const q = (sel, fn) => page.evaluate(([sel, fn]) => { const xs = [...document.querySelectorAll('#ba-equip ' + sel)]; return new Function('xs', 'return (' + fn + ')(xs)')(xs); }, [sel, fn || 'xs => xs.length']);
  const texte = sel => page.evaluate(sel => { const e = document.querySelector('#ba-equip ' + sel); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
  const sections = () => q('details.fs', 'xs => xs.map(d => d.dataset.section + (d.open ? "+" : "")).join(" ")');
  // le mot de contexte sous le repère (« À poser · sur 102CB1:2 », « Masse », « Câble ») — sans son « ? » ; rien pour un équipement
  const genre = () => page.evaluate(() => { const g = document.querySelector('#ba-equip .fi-genre-mot'); if (!g) return ''; const c = g.cloneNode(true); c.querySelectorAll('.fi-q, input').forEach(x => x.remove()); return c.textContent.replace(/\s+/g, ' ').trim(); });
  // les tuiles d'un câble : l'étiquette, la valeur (celle du champ, sinon ce qu'il propose), l'état
  const tuiles = () => q('.fi-tuile', 'xs => xs.map(t => { const v = t.querySelector(".fi-tuile-v"), i = v.querySelector("input"); return t.querySelector(".fi-tuile-k").textContent + "=" + (i ? (i.value || i.placeholder) + [...v.childNodes].filter(n => n !== i && !(n.matches && n.matches(".fs-auto, .orig-main"))).map(n => n.textContent).join("") : v.textContent).replace(/\\s+/g, " ").trim() + (t.classList.contains("ko") ? "!" : t.classList.contains("att") ? "?" : ""); }).join(" | ")');
  const sec = s => `details.fs[data-section="${s}"]`;
  // la face est à plat : rien de ce qui faisait le relief, et toujours un corps
  const faceAPlat = async ou => { const n = await q(ou + ' .mj .mj-flanc, ' + ou + ' .mj .mj-ombre, ' + ou + ' .mj .mj-fut'), c = await q(ou + ' .mj .mj-corps'); return n === 0 && c > 0; };
  const vue = () => page.evaluate(() => JSON.stringify(app.vue));

  console.log('\nun équipement à trois connecteurs (300XC1, folio 3) : le squelette');
  await bloc('3', '300XC1'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const xs = [...document.querySelector('#ba-equip').children].slice(0, 4).map(e => e.className.split(' ')[0]); return xs.join() === 'fi-nav,fi-entete,fi-alerte,fs'; }), 'la barre, l’en-tête, les problèmes, puis les sections');
  ok(await q('.fi-ariane, .fi-maillon') === 0 && await q('#fi-prec:disabled, #fi-suiv:disabled') === 2 && await q('.fi-nav #in-fermer') === 1, 'plus de fil d’Ariane : ‹ › (éteints : rien avant, rien après) et ×');
  ok(await page.evaluate(() => { const id = document.querySelector('#ba-equip .fi-ident'); return $('eq-rep').value === '300XC1' && !!$('fi-crayon') && !!document.querySelector('#ba-equip .fi-symbole svg') && !$('eq-nature') && !document.querySelector('#ba-equip .fi-entete select, #ba-equip .fi-genre-mot') && !!$('eq-des') && $('eq-des').placeholder === 'Nom — à taper'
    && id.firstElementChild.classList.contains('fi-nom-ligne') && id.lastElementChild.classList.contains('fi-genre'); }), 'l’en-tête (le lecteur : « pas de liste déroulante, personne ne s’en servira ; le repère élec en priorité ») : le symbole, le REPÈRE d’abord et son crayon, dessous le nom — un texte qu’on tape — ; ni type ni liste');
  ok(await q('.fi-tuile, .fi-tuiles') === 0, 'plus de tuiles sous l’en-tête (le lecteur : « dégage »)');
  ok(await sections() === 'connecteur+ fils+ dejafait' && await q(sec('identite') + ', ' + sec('raccord')) === 0, 'Connecteur (le raccord dedans : « c’est le même ») et Câbles ouverts d’office, Déjà fait', await sections());
  ok(await texte(sec('fils') + ' .fs-titre') === 'Câbles' && /^23 câbles/.test(await texte(sec('fils') + ' .fs-resume')), '« Câbles », plus « Fils » (le lecteur : « dis câble, c’est plus propre »)', await texte(sec('fils') + ' .fs-resume'));
  ok(await page.evaluate(() => { const b = document.querySelector('#ba-equip details.fi-alerte'); return !!b && !b.open && b.classList.contains('ko'); }) && /^1 problème$/.test(await texte('.fi-pb')) && await q(sec('connecteur') + ' .fs-badge.ko') === 1, 'les problèmes, repliés sous l’en-tête : « 1 problème » ; il est compté dans la pastille de « Connecteur »');
  const yAvant = await page.evaluate(() => $('ba-equip').scrollTop);
  await page.click('#fi-pb'); await page.waitForTimeout(300);
  ok(await page.evaluate(y => { const b = document.querySelector('#ba-equip details.fi-alerte'), l = b.querySelectorAll('.fi-pb-l'); return b.open && l.length === 1 && /aucun arrangement/.test(l[0].textContent) && /Connecteur B/.test(l[0].querySelector('.fi-pb-s').textContent) && $('ba-equip').scrollTop === y; }, yAvant), 'un clic les déplie EN PLACE (la fiche ne descend pas) : une ligne, la section qui le démontre en petit (« Connecteur B »)');
  await page.click('#ba-equip .fi-pb-l'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const d = document.querySelector('#ba-equip details[data-section="connecteur"]'); return d.open && d.classList.contains('fs-allume'); }), 'un clic sur la ligne ouvre la section qui le démontre, et l’allume');
  await page.click('#fi-pb'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !document.querySelector('#ba-equip details.fi-alerte').open), 'et la barre se replie');
  ok(await q(sec('connecteur') + ' summary .ct-bulles .ct-bulle') === 3 && await q('.ct-bulle[aria-pressed="true"]', 'xs => xs[0].dataset.connecteur') === 'B' && await q('.ct-bulle.ko', 'xs => xs.map(x => x.dataset.connecteur).join()') === 'B' && await texte(sec('connecteur') + ' .fs-titre') === 'Connecteur', 'sous le titre « Connecteur », une BULLE par connecteur — A · B · C (le lecteur : « comme une bulle ; on appuie, ça passe de l’un à l’autre ») ; la fiche s’ouvre sur B, le fautif, en rouge');
  ok(/Aucun ne loge ces bornes/.test(await texte(sec('connecteur') + ' [data-panneau="B"]')) && await q(sec('connecteur') + ' [data-sexe="300XC1|B"]') === 2 && await q(sec('connecteur') + ' [data-panneau="B"] [data-hab="300XC1|B"]') === 1, 'B, qu’aucun arrangement ne loge, le dit et laisse changer le sexe des contacts ; son raccord est DANS la section, sous ses contacts');
  await page.click('#ba-equip .ct-bulles [data-connecteur="A"]'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.querySelector('#ba-equip details[data-section="connecteur"]').open && document.querySelector('#ba-equip .ct-bulle[aria-pressed="true"]').dataset.connecteur === 'A'), 'un clic sur la bulle A montre A — la section reste ouverte');
  ok(await q('[data-panneau="A"] .fc-k', 'xs => xs.map(x => x.textContent).join()') === 'Référence,Arrangement' && !/part number|compléter les normes|Norme/.test(await texte(sec('connecteur') + ' [data-panneau="A"]')), 'le connecteur A : sa RÉFÉRENCE, puis l’arrangement — plus de « part number », plus de « Norme » ni de « compléter les normes »');
  ok(await page.evaluate(() => { const r = [...document.querySelectorAll('#ba-equip [data-panneau="A"] .fc')].find(x => x.querySelector('.fc-k').textContent === 'Arrangement'), b = r && r.querySelector('.fi-norme-puce[data-face]'), ref = [...document.querySelectorAll('#ba-equip [data-panneau="A"] .fc')].find(x => x.querySelector('.fc-k').textContent === 'Référence');
    return !!b && /EN4165-002-12-20/.test(b.textContent) && !r.querySelector('.orig') && !!r.querySelector('[data-changer="arr|300XC1|A"]') && !r.querySelector('.fs-auto') && !!r.querySelector('.fi-q[data-q="arrangement"]')
      && !r.querySelector('.fi-fam') && ref.querySelector('.fi-pn [data-pn="A"]').value === 'EN4165-2M'; }) && await q('[data-panneau="A"] .fi-face') === 0,
    'la référence de A (EN4165-2M, modifiable) ; l’arrangement en puce (EN4165-002-12-20), son « ? », « Changer » à sa droite, aucune pastille tant qu’il est automatique ; la face attend un clic');
  await page.click('#ba-equip [data-panneau="A"] .fi-norme-puce[data-face]'); await page.waitForTimeout(400);
  ok(await faceAPlat('[data-panneau="A"]') && await q('[data-panneau="A"] .mj-module.corps-module .mj-cle') === 1, 'un clic sur la puce montre la face du module EN 4165, à plat, un module carré et son détrompeur');
  ok(await q('[data-panneau="A"] .mj-contact.plein') === 11 && await q('[data-panneau="A"] .mj-contact') === 12 && await q('[data-panneau="A"] .fi-contacts .fi-fil[data-i]') === 11, 'onze contacts pleins sur douze ; onze lignes de contact');
  ok(await q('[data-panneau="A"] .fi-contacts .ct-legende > span', 'xs => xs.map(x => x.firstChild ? x.firstChild.textContent : "").join()') === ',Contact à sertir,Gauge,Câble' && await q('[data-panneau="A"] .fi-contacts .ct-legende .fi-q', 'xs => xs.map(x => x.dataset.q).join()') === 'contact,gauge'
    && await page.evaluate(() => { const li = document.querySelector('#ba-equip [data-panneau="A"] .fi-contacts .fi-fil[data-i]'), l2 = li.nextElementSibling;
      return li.querySelector('.ct-pin b').textContent === 'A1' && li.querySelector('.fi-sertir').textContent === 'EN3155-003F2020' && l2.querySelector('.fi-sertir').textContent === 'EN3155-003F2020' && l2.querySelector('.fi-sertir').classList.contains('meme') && !/″/.test(document.querySelector('#ba-equip [data-panneau="A"] .fi-contacts').textContent)
        && /^24AWG$/.test(li.querySelector('.fi-jg').textContent) && !!li.querySelector('.fi-jg.ok svg') && li.querySelector('.fi-cab-n').textContent === 'W-320' && !/381RL1/.test(li.textContent); }),
    'les contacts, une BROCHE par câble : la borne dans un rond, le contact de la table en clair (le même qu’au-dessus plus pâle — plus de « ″ »), la gauge en pastille verte ✓, le câble ; plus « vers »');

  console.log('\ntout se change sur place : l’arrangement, le part number, le contact');
  await page.click('#ba-equip [data-changer="arr|300XC1|A"]'); await page.waitForTimeout(300);
  ok(await q('[data-volet="arr|300XC1|A"] .cand') >= 2 && await q('[data-volet="arr|300XC1|A"] .cand[aria-pressed="true"]') === 1 && await page.evaluate(() => { const v = document.querySelector('#ba-equip [data-volet="arr|300XC1|A"]'), r = v.closest('.fc'); return !!r && r.querySelector('.fc-k').textContent === 'Arrangement'; }), '« Changer » ouvre la liste SOUS la valeur : les arrangements qui logent ces bornes, le retenu pressé');
  await page.click('#ba-equip [data-volet="arr|300XC1|A"] .cand:not([aria-pressed="true"])'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => { const d = app.contrat.designations.get('300XC1|A'), r = [...document.querySelectorAll('#ba-equip [data-panneau="A"] .fc')].find(x => x.querySelector('.fc-k').textContent === 'Arrangement'); return !!d && r.textContent.includes(d) && !!r.querySelector('.orig-main') && !!r.querySelector('.fs-auto[data-auto="arr:300XC1|A"]') && /EN4165-002-12-20/.test(r.querySelector('.fs-auto').textContent) && !document.querySelector('#ba-equip [data-volet]') && app.cible.type === 'bloc'; }), 'un autre arrangement retenu : la pastille « main », « ↺ EN4165-002-12-20 », la liste refermée');
  await page.click('#ba-equip .fs-auto[data-auto="arr:300XC1|A"]'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => !app.contrat.designations.get('300XC1|A') && /EN4165-002-12-20/.test(document.querySelector('#ba-equip [data-panneau="A"] .fi-norme-puce').textContent)), '« ↺ » rend le calcul');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => !!app.contrat.designations.get('300XC1|A') && app.cible && app.cible.nom === '300XC1' && !$('inspecteur').hidden && !!document.querySelector('#ba-equip details[data-section="connecteur"]')), 'Ctrl+Z défait le retour à l’automatique — et la fiche reste ouverte sur 300XC1');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => !app.contrat.designations.get('300XC1|A') && app.cible && app.cible.nom === '300XC1'), 'Ctrl+Z encore : l’arrangement automatique, la fiche toujours là');
  const pnAvant = await page.evaluate(() => verite().filter(l => (l.de === '300XC1' && /^A/.test(l.borneDe)) || (l.vers === '300XC1' && /^A/.test(l.borneVers))).length);
  await page.fill('#ba-equip [data-panneau="A"] [data-pn="A"]', 'EN4165-3M'); await page.press('#ba-equip [data-panneau="A"] [data-pn="A"]', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(n => { const L = verite().flatMap(l => [l.de === '300XC1' && /^A/.test(l.borneDe) ? l.pnDe : null, l.vers === '300XC1' && /^A/.test(l.borneVers) ? l.pnVers : null]).filter(x => x !== null);
    const r = document.querySelector('#ba-equip [data-panneau="A"] .fi-pn'); return L.length === n && L.every(p => p === 'EN4165-3M') && !!r.querySelector('.orig-main') && /EN4165-2M/.test(r.querySelector('.fs-auto').textContent); }, pnAvant),
    'la référence de A, écrite une fois : les ' + pnAvant + ' liaisons du connecteur suivent, la pastille « main », « ↺ EN4165-2M »');
  ok(await page.evaluate(() => app.hist[app.hist.length - 1].quoi === 'référence de 300XC1 A'), 'un seul geste dans l’historique');
  await page.click('#ba-equip [data-panneau="A"] .fs-auto[data-auto="pn:A"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => verite().filter(l => l.de === '300XC1' && /^A/.test(l.borneDe)).every(l => l.pnDe === 'EN4165-2M' && !(l.avant && 'pnDe' in l.avant))), '« ↺ » rend le part number du fichier à toutes les liaisons');
  // le contact à sertir : une liste sous la ligne, les contacts de la table qui acceptent ce câble
  await page.click('#ba-equip [data-panneau="A"] .fi-contacts .fi-fil[data-i] .fi-sertir'); await page.waitForTimeout(400);
  const ct = await page.evaluate(() => { const v = document.querySelector('#ba-equip .fi-choix-ligne [data-volet^="sertir:"]'); return v ? [...v.querySelectorAll('[data-sertir-ref]')].map(b => b.dataset.v + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')) : null; });
  ok(!!ct && ct.length >= 1 && ct.some(x => /\*$/.test(x)), 'le contact d’une ligne : un clic ouvre, sous elle, les contacts de la table qui acceptent ce câble, le retenu pressé', (ct || []).join(' '));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => !document.querySelector('#ba-equip .fi-choix') && !$('inspecteur').hidden && app.cible && app.cible.nom === '300XC1'), 'Échap ferme la liste, pas la fiche');

  console.log('\nles câbles d’une fiche : le type, la longueur, le contact s’écrivent DANS la carte (300XC1)');
  const ligneCab = c => `#ba-equip ${sec('fils')} .fi-ia[data-i="${c}"]`;
  const k320 = await page.evaluate(() => String(verite().findIndex(l => l.cable === 'W-320')));
  ok(await page.evaluate(k => { const li = document.querySelector(`#ba-equip details[data-section="fils"] .fi-ia[data-i="${k}"]`); if (!li) return false;
    const t = li.querySelector('[data-cable][data-champ="type"]'), L = li.querySelector('[data-cable][data-champ="longueur"]');
    return t.value === 'DR24' && t.getAttribute('list') === 'fi-cables' && !!t.closest('.cb-tete') && L.value === '' && L.placeholder === '5' && /Longueur/.test(li.querySelector('.fi-cab-ed').textContent) && /supposée/.test(li.querySelector('.fi-cab-ed').textContent) && /vers\s*381RL1/.test(li.querySelector('.cb-vers').textContent) && !!li.querySelector('.fi-num-b[data-ouvrir-cable]') && !!document.getElementById('fi-cables'); }, k320),
    'la carte de W-320 : en tête son numéro (qui ouvre sa fiche), son type (DR24, la liste de la base des câbles) et où il va (« vers 381RL1 ») ; en bas sa longueur, nommée, « supposée » tant que le retest ne la porte pas');
  ok(await q(sec('fils') + ' .cb-j-k .fi-q', 'xs => xs.map(x => x.dataset.q).join()') === 'intensite,chute' && await q(sec('fils') + ' .cb-carte', 'xs => xs.every(x => x.querySelectorAll(".cb-j .cb-anneau svg").length === 2)') && /sur\s[\d,]+\sV admis/.test(await texte(sec('fils') + ' .cb-carte .cb-j:nth-child(2)')), 'deux jauges rondes par câble — l’intensité et la chute, chacune avec ce qui est admis ; leurs « ? » une fois, sur la première carte');
  await page.fill(ligneCab(k320) + ' [data-champ="type"]', 'dr20'); await page.press(ligneCab(k320) + ' [data-champ="type"]', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(k => { const l = verite()[+k], li = document.querySelector(`#ba-equip details[data-section="fils"] .fi-ia[data-i="${k}"]`);
    return l.type === 'DR20' && l.avant && l.avant.type === 'DR24' && !!li && !!li.querySelector('.fi-ed.main [data-champ="type"]') && /DR24/.test(li.querySelector('.fs-auto[data-auto="cable:type"]').textContent) && app.cible.nom === '300XC1'; }, k320),
    'le type écrit dans la ligne (« dr20 » → DR20) : la liaison change, la valeur passe « main », « ↺ DR24 » à côté — la fiche reste sur 300XC1');
  await page.click(ligneCab(k320) + ' .fs-auto[data-auto="cable:type"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(k => verite()[+k].type === 'DR24' && !(verite()[+k].avant && 'type' in verite()[+k].avant), k320), '« ↺ » rend le type du fichier');
  await page.fill(ligneCab(k320) + ' [data-champ="longueur"]', '7,5'); await page.press(ligneCab(k320) + ' [data-champ="longueur"]', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(k => verite()[+k].longueur === 7.5 && !!document.querySelector(`#ba-equip details[data-section="fils"] .fi-ia[data-i="${k}"] .fs-auto[data-auto="cable:longueur"]`), k320), 'la longueur écrite dans la ligne (7,5 m) : « ↺ » pour rendre l’hypothèse');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(k => verite()[+k].longueur == null && app.cible && app.cible.nom === '300XC1', k320), 'Ctrl+Z rend l’hypothèse, la fiche reste ouverte');
  const kBout = await page.evaluate(() => { const li = [...document.querySelectorAll('#ba-equip details[data-section="fils"] .fi-ia[data-i]')].find(x => x.querySelector('.fi-ct-puce')); return li ? li.dataset.i : null; });
  ok(!!kBout, 'un câble qui arrive sur un connecteur connu porte le contact de ce bout, en puce');
  if (kBout) { await page.click(ligneCab(kBout) + ' .fi-ct-puce'); await page.waitForTimeout(400);
    ok(await page.evaluate(k => { const li = document.querySelector(`#ba-equip details[data-section="fils"] .fi-ia[data-i="${k}"]`), n = li.nextElementSibling; return !!n && n.classList.contains('fi-choix-ligne') && n.querySelectorAll('[data-sertir-ref]').length >= 1; }, kBout), 'un clic sur la puce ouvre, sous la ligne, les contacts que la table accepte pour ce câble');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300); }

  console.log('\nle raccord, à la vraie souris (351PM1, EN 2997)');
  await bloc('3', '351PM1'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const s = document.querySelector('#ba-equip details[data-section="connecteur"]'), g = s && s.querySelector('.fi-groupe-raccord'), h = g && g.querySelector('[data-hab="351PM1|A"]'); return !!h && s.open && /^Raccord/.test(g.querySelector('.fs-st').textContent) && [...h.querySelectorAll('.fi-piece')].length >= 1 && !!h.querySelector('.fi-piece-r .fi-q') && /toron Ø/.test(h.querySelector('.fi-hab-mots').textContent) && !document.querySelector('#ba-equip details[data-section="raccord"]'); }),
    'le Raccord de 351PM1, DANS la section du connecteur (le lecteur : « le raccord, je l’aurais mis avec le connecteur ») : une ligne par pièce (son rôle et son « ? », sa référence), le toron en petit');
  await page.click('#ba-equip [data-changer="rac|351PM1|A"]'); await page.waitForTimeout(300);
  await page.click('#ba-equip [data-raccord][data-champ="blindage"][data-v="GND"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => { const r = app.contrat.raccords.get('351PM1|A'), b = document.querySelector('#ba-equip [data-raccord][data-champ="blindage"][aria-pressed="true"]'), h = document.querySelector('#ba-equip [data-hab="351PM1|A"]'), rac = h.querySelector('[data-role="raccord"]');
    return !!r && r.blindage === 'GND' && b && b.dataset.v === 'GND' && !!rac && /durci/i.test(rac.textContent + ' ' + (rac.dataset.bulle || '')) && !!h.querySelector('[data-role="bande"] .fi-q[data-q="bande"]') && document.activeElement === b; }), '« sur le corps » (dans « Options ») : écrit au contrat, la fiche refaite (un raccord durci, une ligne band-it et son « ? »), la puce pressée garde le focus, la liste reste ouverte');
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => !app.contrat.raccords.get('351PM1|A') && app.cible && app.cible.nom === '351PM1' && document.querySelector('#ba-equip details[data-section="connecteur"]').open && !document.querySelector('#ba-equip [data-role="bande"]')), 'Ctrl+Z défait le choix ; la fiche reste ouverte, plus de band-it');

  console.log('\nne jamais perdre l’ingénieur : la pile, la barre, le plan qui ne bouge pas');
  await bloc('3', '300XC1'); await page.waitForTimeout(400); await page.click('#ba-equip .ct-bulles [data-connecteur="A"]'); await page.waitForTimeout(300);
  await page.evaluate(() => { $('ba-equip').scrollTop = 320; $('ba-equip').dispatchEvent(new Event('scroll')); }); await page.waitForTimeout(250); const v0 = await vue();
  ok(await page.evaluate(() => $('ba-equip').classList.contains('defile') && getComputedStyle(document.querySelector('#ba-equip .fi-nav-nom')).opacity === '1' && document.querySelector('#ba-equip .fi-nav-nom').textContent === '300XC1'), 'l’en-tête passé sous la barre : le repère s’y écrit en petit');
  await page.evaluate(() => { const li = document.querySelector('#ba-equip [data-panneau="A"] .fi-contacts .fi-fil[data-i]'); li.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(100);
  const haut0 = await page.evaluate(() => $('ba-equip').scrollTop);
  await page.click('#ba-equip [data-panneau="A"] .fi-contacts .fi-fil[data-i] .fi-ct'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => app.cible.type === 'fil' && app.cible.l.cable === 'W-320' && app.insp.pile.length === 2 && app.insp.pos === 1), 'un clic sur une ligne de contact ouvre la fiche de son câble, et l’empile');
  ok(await q('#fi-prec:not(:disabled)') === 1 && /300XC1/.test(await page.evaluate(() => $('fi-prec').title)), '‹ s’allume : « Revenir à 300XC1 »', await page.evaluate(() => $('fi-prec').title));
  ok(await vue() === v0, 'W-320 était en vue : le plan n’a pas bougé');
  await page.keyboard.press('Alt+ArrowLeft'); await page.waitForTimeout(600);
  ok(await page.evaluate(h => app.cible.type === 'bloc' && app.cible.nom === '300XC1' && Math.abs($('ba-equip').scrollTop - h) < 2 && document.querySelector('#ba-equip .ct-bulles [aria-pressed="true"]').dataset.connecteur === 'A' && app.insp.pos === 0, haut0), 'Alt+← revient à 300XC1, au même défilement, sur le même connecteur');
  await page.keyboard.press('Alt+ArrowRight'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => app.cible.type === 'fil' && app.cible.l.cable === 'W-320'), 'Alt+→ repart vers W-320');
  ok(await sections() === 'trajet+ fils+', 'la fiche d’un câble : de → vers, l’intensité et la chute (plus d’Identité : les tuiles la portent)', await sections());
  await page.click('#ba-equip [data-bout="vers"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.cible.nom === '381RL1' && document.querySelector('#ba-equip details[data-section="connecteur"]').open && !!document.querySelector('#ba-equip details[data-section="connecteur"] .fi-fil.vise') && /W-320/.test(document.querySelector('#ba-equip .fi-fil.vise').dataset.bulle) && app.insp.pile.length === 3),
    'la carte « Vers » ouvre 381RL1, son connecteur ouvert, la ligne de W-320 allumée — empilé');
  await page.click('#fi-prec'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => app.cible.type === 'fil' && app.cible.l.cable === 'W-320'), '‹ ramène à W-320');
  await page.click('#ba-equip [data-bout="de"]'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => app.cible.nom === '300XC1' && app.insp.pile.length === 3 && app.insp.pos === 2), 'la carte « De » ouvre 300XC1 (et empile)');
  // le plan : un clic dessus REMPLACE le haut de la pile
  await page.evaluate(() => choisirBloc(app.dessin.comps.find(k => k.name === '351PM1' && k.kind !== 'tag'))); await page.waitForTimeout(400);
  ok(await page.evaluate(() => app.insp.pile.length === 3 && app.insp.pile[2].nom === '351PM1'), 'un clic sur le plan remplace le haut de la pile');
  // survoler une ligne allume son câble sur le plan
  await page.locator('#ba-equip ' + sec('fils') + ' .fi-ia[data-i] .cb-jauges').first().hover(); await page.waitForTimeout(400);
  ok(await page.evaluate(() => !!document.querySelector('#scene.focus .cab.hl') && !!document.querySelector('#ba-equip .fi-ia.vise')), 'survoler une ligne allume son câble sur le plan');
  ok(await page.evaluate(() => { const b = document.querySelector('.fi-bulle'); return !!b && !b.hidden && /admis/.test(b.textContent); }), 'et sa bulle dit d’où viennent ses chiffres (ce qu’il admet)', await page.evaluate(() => (document.querySelector('.fi-bulle') || {}).textContent));
  await page.mouse.move(5, 5);

  console.log('\nune barrette (668VT31, folio 3) : la face vivante, la galerie de la norme');
  await bloc('3', '668VT31'); await page.waitForTimeout(400);
  ok(await q('.fi-tuile') === 0 && await q('.fi-alerte') === 0 && !(await genre()), 'plus de tuiles ni de type sous le repère ; rien à reprendre, pas de barre des problèmes', await genre());
  ok(await sections() === 'connecteur+ fils+ dejafait' && /^Module/.test(await texte(sec('connecteur') + ' .fs-titre')), 'le module ouvert, ses contacts dedans ; pas de raccord (sans objet)', await sections());
  ok(await page.evaluate(() => { const r = [...document.querySelectorAll('#ba-equip details[data-section="connecteur"] .fc')], m = r.find(x => x.querySelector('.fc-k').textContent === 'Module');
    return r.length === 1 && !!m && /E0599-1B207Z/.test(m.querySelector('[data-changer="bar|668VT31"]').textContent) && !!m.querySelector('.fi-q[data-q="module"]') && !/potentiel|Norme/i.test(document.querySelector('#ba-equip details[data-section="connecteur"]').textContent); }),
    'le module seul (E0599-1B207Z en puce, son « ? ») — plus de ligne Norme (« elle est dans le module »), plus de « potentiel » nulle part (« on le voit sur le dessin »)');
  ok(await faceAPlat('') && await q('.mj-module.corps-rectangle') === 1 && await q('.mj-contact.plein') === 12 && await q('.mj-contact') === 18 && await q('.mj-plaque.prise') === 4, 'la face ASNE 0599 : à plat, rectangulaire, douze contacts pleins sur dix-huit, quatre plaques teintées');
  ok(/le retest dit E0599-1A101Z/.test(await texte(sec('connecteur'))) && await q('[data-garder="E0599-1A101Z"]') === 1, 'l’écart avec le retest se dit, en petit, et l’on peut garder le retest');
  ok(await q(sec('connecteur') + ' .fi-groupe, ' + sec('connecteur') + ' .ct-groupe') === 0 && await q(sec('connecteur') + ' .fi-contacts .fi-fil[data-i]') === 12 && await q(sec('connecteur') + ' .fi-contacts .ct-pin', 'xs => xs.every(x => /^[A-Z]$/.test(x.querySelector("b").textContent) && /^borne \\d+$/.test(x.querySelector("small").textContent))'), 'les contacts, douze lignes, toutes montrées : la lettre du module dans le rond, la borne en petit dessous — plus de « H1 J2 K3 » ni de groupes par potentiel');
  await page.evaluate(() => document.querySelector('#ba-equip .fi-face').scrollIntoView({ block: 'center' })); await page.waitForTimeout(150);   // la face, sous les yeux d'abord
  const contactA = await page.locator('#ba-equip .fi-face .mj-contact.plein[data-lettre="A"] .mj-bague').boundingBox();
  await page.mouse.move(contactA.x + contactA.width / 2, contactA.y + contactA.height / 2); await page.waitForTimeout(350);
  ok(await page.evaluate(() => { const g = document.querySelector('#ba-equip .fi-face .mj-contact[data-lettre="A"]'), k = g.dataset.i, li = document.querySelector(`#ba-equip .fi-contacts .fi-fil[data-i="${k}"]`); return g.classList.contains('vise') && li && li.classList.contains('vise') && !!document.querySelector('#scene.focus .cab.hl'); }), 'survoler le contact A de la face allume sa ligne dans la fiche et son câble sur le plan');
  await page.mouse.click(contactA.x + contactA.width / 2, contactA.y + contactA.height / 2); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const g = document.querySelector('#ba-equip .fi-face .mj-contact[data-lettre="A"]'), li = document.querySelector(`#ba-equip .fi-contacts .fi-fil[data-i="${g.dataset.i}"]`); return g.classList.contains('choisi') && li.classList.contains('choisi') && FI.choisi === g.dataset.i && app.cible.nom === '668VT31'; }), 'un clic le CHOISIT : le contact et sa ligne restent marqués (la fiche reste sur la barrette)');
  await page.mouse.move(5, 5);
  await page.click('#ba-equip [data-changer="bar|668VT31"]'); await page.waitForTimeout(400);
  const gal = await page.evaluate(() => { const v = document.querySelector('#ba-equip [data-volet="bar|668VT31"]'); if (!v) return null; const cs = [...v.querySelectorAll('.fi-galerie .cand-g')];
    return { n: cs.length, dessins: cs.filter(c => c.querySelector('svg.mj .mj-contact.plein')).length, retenue: cs.filter(c => c.getAttribute('aria-pressed') === 'true').map(c => c.dataset.ref).join(), etoile: cs.findIndex(c => c.querySelector('.cand-etoile')), libres: cs.every(c => /\d+\slibres?/.test(c.textContent)), onglets: v.querySelectorAll('[data-gal-famille]').length, sous: !!v.closest('.fc') && v.closest('.fc').querySelector('.fc-k').textContent === 'Module' }; });
  ok(!!gal && gal.n >= 2 && gal.dessins === gal.n && gal.retenue === 'E0599-1B207Z' && gal.etoile === 0 && gal.libres && gal.onglets === 2 && gal.sous, 'un clic sur le module ouvre, SOUS lui, la galerie des assemblages : chaque variante dessinée avec ses contacts pris, ce qu’elle laisse de libre, la retenue marquée, la mieux taillée étoilée ; un onglet par norme', JSON.stringify(gal));
  const autre = await page.evaluate(() => { const c = [...document.querySelectorAll('#ba-equip .fi-galerie .cand-g')].find(x => x.getAttribute('aria-pressed') !== 'true'); return c ? c.dataset.ref : null; });
  await page.click(`#ba-equip .fi-galerie .cand-g[data-ref="${autre}"]`); await page.waitForTimeout(700);
  ok(await page.evaluate(r => app.contrat.designations.get('668VT31') === r && !!document.querySelector('#ba-equip details[data-section="connecteur"] .orig-main') && !document.querySelector('#ba-equip [data-volet="bar|668VT31"]'), autre), 'un clic sur une autre variante la retient à la main (' + autre + ') : la pastille « main », la galerie se referme');
  await page.click('#ba-equip [data-changer="bar|668VT31"]'); await page.waitForTimeout(300);
  await page.click('#ba-equip .fi-gal-auto'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => !app.contrat.designations.get('668VT31') && /E0599-1B207Z/.test(document.querySelector('#ba-equip details[data-section="connecteur"] .fc').textContent)), '« Automatique », dans la galerie, rend le choix de l’outil');
  await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => !app.contrat.designations.get('668VT31') && app.cible && app.cible.nom === '668VT31'), 'deux Ctrl+Z : rien n’a bougé, la fiche toujours là');

  console.log('\nun disjoncteur (102CB1, folio 1) : la section « Calibre »');
  await bloc('1', '102CB1'); await page.waitForTimeout(400);
  ok(/^4 problèmes · \d+ à voir$/.test(await texte('.fi-pb')) && await q('.fi-pbs .fi-pb-l') === await page.evaluate(() => { const n = document.querySelector('#ba-equip .fi-pb').textContent.match(/\d+/g).map(Number); return n[0] + n[1]; }), 'la barre dit les problèmes (quatre : W-012 et W-015 dépassés par la charge, le contact 23 du DR24 sous son permanent, le 10 A qui ne passe pas) et les points à voir ; dépliée, elle les liste tous', await texte('.fi-pb'));
  ok(await sections() === 'disjoncteur+ fils+ dejafait' && await texte(sec('disjoncteur') + ' .fs-titre') === 'Calibre' && await q(sec('disjoncteur') + ' .fi-dj[data-disj="102CB1"]') === 3 && await q('.dj-fils .fi-ia[data-i]') === 3 && await q('.fi-tuile') === 0, '« Calibre » (plus « Disjoncteur » : on le sait) — ses trois groupes : le calibre, la courbe, le profil · Câbles · Déjà fait ; plus de tuiles', await sections());
  ok(await page.evaluate(() => { const h = document.querySelector('#ba-equip .dj-heros'), p = h.querySelector('.dj-verdict-pastille');
    return h.querySelector('.dj-h-cal').textContent === '10A' && p.classList.contains('ko') && /^Ne passe pas$/.test(p.textContent.trim()) && !/retest|meilleur/.test(h.textContent) && !!h.querySelector('.fi-q[data-q="calibre"]')
      && /^Automatique \(15\sA\)$/.test($('dj-retenir').textContent.trim()) && !document.querySelector('#ba-equip .dj-chip') && !document.querySelector('#ba-equip [data-pn="*"], #ba-equip .dj-bascule'); }),
    'le calibre RETENU en grand (10 A), son verdict en deux mots (rouge : « Ne passe pas ») et « Automatique (15 A) » ; ni la rangée des calibres, ni le part number, ni les bascules de la courbe');
  await page.click('#ba-equip [data-changer="dj|102CB1"]'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const d = disjonctionDe('102CB1'), cs = [...document.querySelectorAll('#ba-equip [data-volet="dj|102CB1"] .dj-chip')]; return cs.length === d.gamme.length && cs.filter(c => c.getAttribute('aria-pressed') === 'true').map(c => c.dataset.cal).join() === '10' && cs.filter(c => c.classList.contains('ideal')).map(c => c.dataset.cal).join() === '15'; }),
    '« Autre calibre » ouvre la gamme, discrète (celle que le moteur propose) : le retenu pressé, le meilleur étoilé');
  await page.click('#ba-equip .dj-chip[data-cal="20"]'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => { const h = document.querySelector('#ba-equip .dj-heros'); return pnDuRepere('102CB1') === 'MS3320-20' && h.querySelector('.dj-h-cal').textContent === '20A' && /^Passe$/.test(h.querySelector('.dj-verdict-pastille').textContent.trim()) && /Automatique \(15\sA\)/.test($('dj-retenir').textContent) && $('dj-retenir').getAttribute('aria-pressed') !== 'true' && !document.querySelector('#ba-equip [data-volet="dj|102CB1"]'); }),
    'le 20 A retenu à la main (le part number suit : MS3320-20) : il passe ; « Automatique (15 A) » pour revenir au meilleur');
  await page.click('#dj-retenir'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => { const h = document.querySelector('#ba-equip .dj-heros'); return calibreDe('102CB1') === 15 && h.querySelector('.dj-h-cal').textContent === '15A' && document.getElementById('dj-retenir').getAttribute('aria-pressed') === 'true' && h.querySelector('.dj-verdict-pastille').classList.contains('ok'); }),
    '« Automatique » : le 15 A, le meilleur — « Passe », en vert ; le bouton, étoilé, dit qu’il est retenu');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(500); await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => pnDuRepere('102CB1') === 'MS3320-10' && app.cible && app.cible.nom === '102CB1'), 'deux Ctrl+Z : le MS3320-10 du retest, la fiche toujours là');
  // écrire dans le profil refait la fiche EN PLACE : la main reste dans le champ suivant, le calibre suit
  ok(await q(sec('disjoncteur') + ' .dj-etat', 'xs => xs.map(x => x.dataset.k).join()') === 'dem,trans,perm' && await q(sec('disjoncteur') + ' .dj-x', 'xs => xs.map(x => x.dataset.x).join()') === 'dem,trans,perm'
    && /Courant\s*A/.test(await texte('.dj-entete')) && /Durée\s*s/.test(await texte('.dj-entete')) && await q('.dj-champ i') === 0, 'le profil dans l’ordre : démarrage, transition, permanent — chacun son ×, les unités dans l’en-tête (A, s), pas dans les cases');
  await page.click('#ba-equip [data-dj="dem"][data-q="i"]'); await page.fill('#ba-equip [data-dj="dem"][data-q="i"]', '60'); await page.keyboard.press('Tab'); await page.waitForTimeout(900);
  ok(await page.evaluate(() => { const a = document.activeElement; return app.contrat.charges.get('102CB1').dem.i === 60 && !!a && a.dataset.dj === 'dem' && a.dataset.q === 't' && a.closest('#ba-equip') && document.querySelector('#ba-equip .dj-verdict-pastille').classList.contains('ko') && !!document.querySelector('#ba-equip .dj-etat[data-k="dem"] .dj-verdict.ko'); }),
    '60 A au démarrage, puis Tab : écrit au contrat, la main reste dans le champ suivant (sa durée), et la fiche suit en place — le verdict reste rouge (« Ne passe pas » : il déclenche), la pastille du démarrage aussi');
  await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.contrat.charges.get('102CB1').dem.i === 9.31 && app.cible && app.cible.nom === '102CB1'), 'Ctrl+Z rend le profil de l’exemple, la fiche toujours là');
  await page.click('#ba-equip .dj-x[data-x="trans"]'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => app.contrat.charges.get('102CB1').trans === null && document.querySelectorAll('#ba-equip .dj-etat').length === 2 && !document.querySelector('#ba-equip .dj-etat[data-k="trans"]') && !!$('dj-plus').dataset.changer), '× sur la transition : elle s’en va (supprimée, pas vidée) ; « + État » saura la rendre');
  await page.click('#dj-plus'); await page.waitForTimeout(400);
  ok(await q('[data-volet="djplus|102CB1"] [data-dj-ajout]', 'xs => xs.map(x => x.dataset.djAjout).join()') === 'trans,plus', '« + État » propose de rendre la transition, ou un autre état');
  await page.click('#ba-equip [data-dj-ajout="trans"]'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => { const c = app.contrat.charges.get('102CB1'); return c.trans && c.trans.i == null && !!document.querySelector('#ba-equip .dj-etat[data-k="trans"]'); }), 'la transition revient, à remplir');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(500); await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.contrat.charges.get('102CB1').trans.i === 9.31), 'deux Ctrl+Z : la transition de l’exemple');

  console.log('\nle « ? » : comment l’outil choisit');
  await page.click('#ba-equip .fi-q[data-q="calibre"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const b = document.querySelector('#ba-equip .fi-q[data-q="calibre"]'), u = $('fi-q-bulle'); return !!u && !u.hidden && b.getAttribute('aria-expanded') === 'true' && b.getAttribute('aria-describedby') === 'fi-q-bulle' && u.querySelector('b').textContent.length > 3 && u.querySelector('.q-phrase').textContent.length > 20 && u.querySelectorAll('.q-c').length >= 2 && u.querySelector('[data-q-corps="comment"]').hidden && u.querySelector('[data-q-corps="sources"]').hidden; }), 'un clic sur le « ? » du calibre ouvre sa bulle, courte : un titre, UNE phrase, des pastilles de couleur (le permanent, la marge, la température) ; « Comment » et « D’où ça vient » repliés');
  await page.click('#fi-q-bulle [data-q-volet="comment"]'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => { const u = $('fi-q-bulle'), c = u.querySelector('[data-q-corps="comment"]'); return !c.hidden && c.querySelectorAll('.q-etapes li').length >= 3 && u.querySelector('[data-q-volet="comment"]').getAttribute('aria-expanded') === 'true' && !u.hidden; }), 'un clic sur « Comment » déplie la règle en étapes numérotées — la bulle reste ouverte');
  await page.click('#ba-equip .fi-q[data-q="profil"]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.querySelector('#ba-equip .fi-q[data-q="calibre"]').getAttribute('aria-expanded') === 'false' && document.querySelector('#ba-equip .fi-q[data-q="profil"]').getAttribute('aria-expanded') === 'true' && document.querySelectorAll('.fi-q-bulle:not([hidden])').length === 1), 'un autre « ? » : une seule bulle à la fois');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => $('fi-q-bulle').hidden && document.activeElement && document.activeElement.dataset.q === 'profil' && !$('inspecteur').hidden), 'Échap ferme la bulle et rend le clavier au « ? » — la fiche reste ouverte');
  await page.keyboard.press('Enter'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !$('fi-q-bulle').hidden), 'au clavier : Entrée la rouvre');
  await page.mouse.click(700, 500); await page.waitForTimeout(200);
  ok(await page.evaluate(() => $('fi-q-bulle').hidden), 'un clic ailleurs la ferme');
  await bloc('1', '102CB1'); await page.waitForTimeout(300);

  console.log('\nune barrette à poser (VT1, folio 1)');
  await bloc('1', 'VT1'); await page.waitForTimeout(400);
  ok(await genre() === 'À poser · sur 102CB1:2' && /^2 problèmes · 1 point à voir$/.test(await texte('.fi-pb')) && await q(sec('fils') + ' .fs-badge.ko') === 1 && await page.evaluate(() => { const p = document.querySelector('#ba-equip .fi-poser'); return !!p && p.previousElementSibling.id === 'fi-pbs' && $('vt-repere').value === '102VT1' && !!$('vt-poser'); }),
    'à poser sur 102CB1:2 (dans l’en-tête) ; un point à voir (le repère provisoire) et deux problèmes (W-012 et W-015, trop fins sous 102CB1, comptés dans « Câbles ») ; sous les problèmes, « poser au contrat sous 102VT1 »', await genre() + ' · ' + await texte('.fi-pb'));
  ok(await faceAPlat('') && await q('.mj-module.corps-ovale') === 1 && await q('.mj-shunt-cadre') === 3 && await q('.mj-shunt-cadre.prise') === 1 && await q(sec('connecteur') + ' .fi-contacts .fi-fil') === 3 && await q(sec('connecteur') + ' .fi-contacts .fi-fil.neuf') === 1, 'la face NSA937901, trois lignes de contact dont le câble à créer');

  console.log('\nune prise de coupure (412VC3B, folio 5) : une seule face');
  await bloc('5', '412VC3B'); await page.waitForTimeout(400);
  ok(!(await genre()) && await q('.fi-tuile') === 0 && await q('[data-pn]') === 0 && /^Connecteur/.test(await texte(sec('connecteur') + ' .fs-titre')) && await sections() === 'connecteur+ fils+ dejafait', 'ni type, ni tuiles, ni part number ; Connecteur (le raccord dedans), Câbles, Déjà fait', await sections());
  ok(await page.evaluate(() => { const r = document.querySelector('#ba-equip details[data-section="connecteur"] .fc'); return r.querySelector('.fc-k').textContent === 'Référence' && /EN3646-002-12-08/.test(r.textContent) && !!r.querySelector('.fi-q[data-q="prise"]') && /7 contacts · fiche/.test(r.textContent); }), 'sa référence : l’arrangement EN3646-002-12-08, son « ? », ses contacts et le sexe de la fiche');
  ok(await q('.fi-faces .fi-face') === 1 && await q('.fi-faces[data-face-montree="fiche"]') === 1 && await q('.mj-module.corps-circulaire') === 1 && await q('.fi-face .mj-contact.plein') === 7 && /Fiche · ce qui arrive/.test(await texte('.fi-face-tete')), 'UNE face (le lecteur : « les deux font doublon ») : la fiche, ce qui arrive, sept contacts pleins');
  await page.click('#ba-equip [data-voir-face="embase"]'); await page.waitForTimeout(400);
  ok(await q('.fi-faces .fi-face') === 1 && await q('.fi-faces[data-face-montree="embase"]') === 1 && /Embase · ce qui repart/.test(await texte('.fi-face-tete')) && await q('[data-voir-face="fiche"]') === 1, '« voir l’embase » : l’autre face, d’un clic ; « voir la fiche » pour revenir');
  ok(await q('.fi-paire') === 7 && await q('.fi-cote[data-i]') === 14 && await q(sec('connecteur') + ' .fi-groupe-raccord [data-hab]') === 2 && await q('.fi-paire .fi-jg.ok') === 14 && await q('.fi-paire .ct-pin b') === 7, 'sept paires, chacune sa broche (la lettre dans un rond), le contact de la table et la gauge ✓ de chaque côté ; le raccord, un bloc par moitié, dans la même section');

  console.log('\nune masse (901G, folio 1)');
  await bloc('1', '901G'); await page.waitForTimeout(400);
  ok(await genre() === 'Masse' && await q('.fi-tuile') === 0 && await sections() === 'fils+' && await texte(sec('fils') + ' .fs-titre') === '3 câbles' && await q(sec('connecteur')) === 0, 'une masse : ni tuiles, ni identité, ni connecteur — une seule carte, « 3 câbles »', await sections() + ' · ' + await texte(sec('fils') + ' .fs-titre'));
  ok(await q('.fi-masse .fi-fil[data-i]', 'xs => xs.map(x => x.querySelector(".fi-num").textContent + " " + x.querySelector(".fi-dest").textContent.trim() + " " + x.querySelector(".fi-jg").textContent).join(" | ")') === 'W-016 104LP1:2 22 AWG | W-017 103RL1:X2 24 AWG | W-018 101BT1:2 16 AWG', 'ses câbles : le numéro, d’où il vient, la gauge', await q('.fi-masse .fi-fil[data-i]', 'xs => xs.map(x => x.textContent).join(" | ")'));
  await page.click('#ba-equip .fi-masse .fi-fil[data-i] .fi-num'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => app.cible.type === 'fil' && app.cible.l.cable === 'W-016' && app.insp.pile[app.insp.pos - 1].nom === '901G'), 'un clic ouvre la fiche du câble (en empilant)');

  console.log('\nun câble (W-012, folio 1) : ses tuiles s’écrivent');
  await page.evaluate(() => { allerAuPlan('1'); choisirFil(app.dessin.fils.find(w => w.cable === 'W-012')); }); await page.waitForTimeout(400);
  ok(await genre() === 'Câble' && /^Type=DR20 \| Gauge=20 AWG \| Longueur=5m ?hyp\. \| Intensité=9,31 A!$/.test(await tuiles()) && await q('#fil-num') === 1 && await q('.fi-tuile [data-edit]', 'xs => xs.map(x => x.dataset.edit).join()') === 'type,longueur' && await q(sec('trajet') + ' [data-edit="route"]') === 1,
    'l’en-tête « Câble W-012 » (plus « Fil · PUISSANCE ») et ses tuiles — le type et la longueur s’y écrivent, la gauge, l’intensité en rouge (la pointe de 9,31 A) ; la route sous les cartes', await genre() + ' · ' + await tuiles());
  ok(await q('.fi-tuile .orig-hyp') === 1 && await q(sec('fils') + ' .fi-mes .fi-barre') === 2 && await q(sec('fils') + ' .fi-mes .fi-q', 'xs => xs.map(x => x.dataset.q).join()') === 'intensite,chute', 'la longueur d’hypothèse le dit (« hyp. ») ; l’intensité et la chute, une barre et un « ? » chacune');
  ok(!/hors normes|Sans part number/i.test(await texte(sec('trajet'))), 'les cartes de bout ne disent rien de ce qu’on ne sait pas (plus de « contact hors normes »)', await texte(sec('trajet')));
  const du0 = await texte(sec('fils') + ' .fs-resume');
  await page.fill('#ba-equip [data-edit="longueur"]', '7,5'); await page.press('#ba-equip [data-edit="longueur"]', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => app.cible.l.longueur === 7.5 && !!document.querySelector('#ba-equip .fi-tuile .orig-main') && /hypothèse 5 m/.test(document.querySelector('#ba-equip .fs-auto[data-auto="champ:longueur"]').title)) && (await texte(sec('fils') + ' .fs-resume')) !== du0,
    'la longueur écrite dans sa tuile (7,5 m) : « ↺ » (qui rend l’hypothèse de 5 m), la chute se refait', await texte(sec('fils') + ' .fs-resume'));
  await page.click('#ba-equip .fs-auto[data-auto="champ:longueur"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.cible.l.longueur == null && !!document.querySelector('#ba-equip .fi-tuile .orig-hyp')), '« ↺ » rend l’hypothèse');
  await page.fill('#fil-num', 'W-012B'); await page.press('#fil-num', 'Enter'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => verite().some(l => l.cable === 'W-012B') && $('fil-num').value === 'W-012B'), 'le numéro se change dans l’en-tête');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => verite().some(l => l.cable === 'W-012') && app.cible && app.cible.type === 'fil' && app.cible.l.cable === 'W-012' && !$('inspecteur').hidden), 'Ctrl+Z rend W-012, et la fiche reste ouverte sur lui');

  // les hypothèses de la simulation : la pastille « hyp. » de la fiche mène à leur fiche ; une tension changée rejuge la chute admise
  console.log('\nles hypothèses de la simulation, depuis la fiche du câble');
  const chute = () => page.evaluate(() => [...document.querySelectorAll('#ba-equip .fi-mes')].find(m => /Chute/.test(m.textContent)).querySelector('.fi-mes-v').textContent.replace(/\s+/g, ' '));
  // la chute admise : la règle du lecteur (octobre 2026), 2 V en continu et en monophasé, 4 V en triphasé — avant, la table Réseau (1 V sous 28 V)
  ok(await q('.fi-hyp[data-hyp]') >= 1 && /\/ 2 V$/.test(await chute()), 'la fiche de W-012 a la pastille « hyp. » en lien, et 2 V admis (la règle du lecteur)', await chute());
  await page.click('#ba-equip .fi-tuile .fi-hyp'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => app.fiche && app.fiche.mode === 'hypotheses' && !!document.querySelector('#fiche-corps #si-U') && document.querySelectorAll('#fiche-corps .hy-groupe').length >= 4
    && $('si-Cm').value === '2' && $('si-Ct').value === '4' && $('si-Cm').placeholder === 'table Réseau'), 'la pastille (dans la tuile de la longueur) ouvre la fiche des hypothèses ; la chute admise y est : 2 V (continu et monophasé), 4 V (triphasé), la table Réseau si on la vide');
  await page.fill('#fiche-corps #si-U', '115'); await page.press('#fiche-corps #si-U', 'Enter'); await page.waitForTimeout(500);
  await page.click('#fi-fermer'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => !$('inspecteur').hidden && app.cible && app.cible.type === 'fil') && /\/ 2 V$/.test(await chute()) && (await chute()).endsWith(await page.evaluate(() => volts(chuteAdmiseDeLaSimu(app.simu)))), 'fermer la fiche des hypothèses rend celle de W-012, rejugée : sous 115 V, la règle du lecteur admet toujours 2 V (elle ne dépend pas de la tension) — la fiche lit le seuil que le moteur rend', await chute());
  // vider la chute admise : la table Réseau reprend (la règle d’un câble se lit au contrôle, qui passe les hypothèses)
  await page.evaluate(() => ficheHypotheses()); await page.waitForTimeout(300); await page.fill('#fiche-corps #si-Cm', ''); await page.dispatchEvent('#fiche-corps #si-Cm', 'change'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => app.simu.chuteMono === null && chuteAdmise(app.norme, 28, 'continu', app.simu).regle === 'table' && chuteAdmise(app.norme, 28, 'continu', app.simu).chuteMax === 1 && $('si-Cm').value === ''), 'vidée, la chute admise rend la parole à la table Réseau (1 V sous 28 V) ; « Revenir aux valeurs de l’outil » la rend');
  await page.evaluate(() => ficheHypotheses()); await page.waitForTimeout(300); await page.click('#hy-defaut'); await page.waitForTimeout(400); await page.click('#fi-fermer'); await page.waitForTimeout(400);

  console.log('\nl’en-tête d’un repère : le repère, le nom qu’on tape (103RL1)');
  await bloc('1', '103RL1'); await page.waitForTimeout(400);
  ok(!(await genre()) && await q('#eq-nature, #eq-emp, [data-zone], ' + sec('identite')) === 0, 'ni type ni liste sous le repère (le type se lit toujours dans le code : natureDe dit « relais »), ni zone ni emplacement', await page.evaluate(() => natureDe('103RL1')));
  await page.fill('#eq-des', 'relais de puissance'); await page.press('#eq-des', 'Enter'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => app.contrat.designations.get('103RL1') === 'relais de puissance' && $('eq-des').value === 'relais de puissance'), 'le nom s’écrit sous le repère, en texte libre');
  await page.fill('#eq-rep', '105RL1'); await page.press('#eq-rep', 'Enter'); await page.waitForTimeout(900);
  ok(await page.evaluate(() => app.cible.nom === '105RL1' && verite().some(l => l.de === '105RL1' || l.vers === '105RL1') && app.contrat.designations.get('105RL1') === 'relais de puissance' && $('eq-rep').value === '105RL1'), 'le repère renommé dans l’en-tête : 105RL1, chaque câble suit, le nom aussi');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => app.cible && app.cible.nom === '103RL1' && verite().some(l => l.vers === '103RL1') && !$('inspecteur').hidden), 'Ctrl+Z rend 103RL1, la fiche reprend son nom');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => !app.contrat.designations.get('103RL1')), 'Ctrl+Z encore : plus de nom');
  // la mesure : une fiche se rend vite
  const t = await page.evaluate(() => { const t0 = performance.now(); for (let k = 0; k < 5; k++) { $('ba-equip').dataset.cle = ''; rendreFiche(); } return (performance.now() - t0) / 5; });
  ok(t < 200, 'la fiche de 103RL1 se refait en moins de 200 ms', Math.round(t) + ' ms');

  console.log('\nl’index');
  await page.keyboard.press('Escape'); await page.keyboard.press('r'); await page.waitForTimeout(400);
  ok(await q('.ix-controle .fi-etat.ko') === 1 && await q('.ix-groupe') >= 5 && await q('.ix-item[data-nom]') > 50, 'l’index : « à reprendre » en tête, les groupes, les repères');
  ok(/^Repères\d+$/.test(await texte('.ix-tete h2')) && await q('.ix-tete .fi-sous') === 0, 'le titre porte le compte une fois (« Repères 67 »)', await texte('.ix-tete h2'));
  ok(await q('.ix-tete #fi-prec') === 1, 'l’index a ‹ : la fiche qu’on y a laissée');
  await page.click('#ba-equip .ix-tete #fi-prec'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => app.cible && app.cible.nom === '103RL1'), '‹ depuis l’index rouvre 103RL1');
  ok(await page.evaluate(() => { app.hist = []; app.contrat.liaisons = []; app.source = null; app.nFolios = 0; app.plan = '*'; app.cible = null; fermerInspecteur(); redessiner(); return $('folios').hidden && !$('vide').hidden; }), 'le plan vide : plus de barre de zoom ni de folios');
  await page.evaluate(() => { chargerContrat(contratExemple(), 'contrat d’exemple', 'Contrat d’exemple'); app.contrat.charges = chargesExemple(); synchroniser(); });
  ok(await page.evaluate(() => !$('folios').hidden), 'l’exemple rechargé : la barre du bas revient');
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  console.log('\n  ' + (ko ? ko + ' échec(s)' : 'tout tient'));
  await nav.close(); process.exit(ko ? 1 : 0);
})();
