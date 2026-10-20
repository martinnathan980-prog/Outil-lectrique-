/* ===========================================================================
   FICHE — ce qu'on voit quand on clique un bloc ou un câble (08 bis, 08-sections, 08 ter), la fiche v4.
       NODE_PATH=/opt/node22/lib/node_modules node tests/fiche.js [--fichier=chemin]

   Sur l'exemple embarqué, chaque fiche a le MÊME squelette, et l'ingénieur
   ne s'y perd pas :
     · LA BARRE en tête (‹ ›, × ; le repère s'y écrit quand l'en-tête passe
       dessous), puis l'EN-TÊTE (le symbole, le repère et son crayon ; dessous
       la ligne d'IDENTITÉ — « Connecteur · EN4165-2M · 3 connecteurs ·
       folio 3 » — et la désignation qu'on tape), puis LES PROBLÈMES, repliés
       juste dessous (« Problèmes · 1 problème — B · aucun arrangement… »),
       qui se déplient EN PLACE (une ligne par point, la section qui le
       démontre ; un clic l'ouvre et l'allume), puis PEU DE SECTIONS dans
       l'ordre fixe, en fiche technique (Calibre, Connecteur, De → vers,
       Câbles ; « Déjà fait » seulement quand une base est chargée) ;
     · un équipement : les connecteurs en bulles (le fautif marqué), la
       référence, l'arrangement en puce (un clic montre la face ; son « ? »),
       les contacts (Borne · Contact · Gauge ✓/✗ · Câble), chaque valeur des
       tables avec son repère d'origine (vérifié par deux sources · vos
       tables · à confirmer) ; un connecteur qu'aucun arrangement ne loge
       nomme sa borne fautive, le câble coupable, et le geste qui répare ; le
       Raccord dans la même section ; une barrette : le module, la GALERIE
       des assemblages, la face vivante ; une prise : UNE face, l'autre d'un
       clic, les paires ; une masse : ses câbles ; un câble : ses tuiles (le
       type et la longueur s'y écrivent), son chemin, l'intensité et la chute
       — la même chute que dans la fiche de son disjoncteur ;
     · le disjoncteur : la CARTE DE DÉCISION quand le retest ne passe pas
       (« Passer en 15 A et grossir les 3 câbles » : un geste ; « Garder le
       10 A… » : ce qu'il faudrait) ; la section « Calibre » — le calibre
       retenu en grand, « Automatique » · « À la main » ; le profil où chaque
       état se supprime et revient ;
     · LES CÂBLES d'une fiche : un tableau dense — le type, la longueur
       s'écrivent DANS la ligne ; au-delà de douze câbles, la bande des
       marges ;
     · supprimer ne demande plus rien : c'est fait, « Rétablir » (Ctrl+Z) ;
     · LE « ? » : une bulle, une seule à la fois, au clavier aussi ;
     · TOUT se change sur place, « main » et « ↺ » ; Ctrl+Z défait chaque
       geste et la fiche reste ouverte ; écrire dans le profil d'un
       disjoncteur refait la fiche en place, la main dans le champ ;
     · ouvrir une fiche depuis une fiche EMPILE : ‹ (Alt+←) revient à la même
       place, › repart ; un bout de câble ouvre l'équipement sur son
       connecteur, le contact allumé ; le plan ne bouge pas si l'objet est en
       vue ; les hypothèses de la simulation depuis la pastille « supposée » ;
       l'index.
   Rend 1 au premier échec.
   =========================================================================== */
const { chromium } = require('playwright');
const P = require('./pilote');
const FICHIER = P.fichierDemande();

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await nav.newPage({ viewport: { width: 1600, height: 950 } }); page.setDefaultTimeout(300000);   // (un geste refait tout le calcul : sous une machine chargée, plus de deux minutes — mesuré aussi avant v72)
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
  const tuiles = () => q('.fi-tuile', 'xs => xs.map(t => { const v = t.querySelector(".fi-tuile-v"), i = v.querySelector("input, select"); return t.querySelector(".fi-tuile-k").textContent + "=" + (i ? (i.value || i.placeholder) + [...v.childNodes].filter(n => n !== i && !(n.contains && n.contains(i))).map(n => n.textContent).join("") : v.textContent).replace(/\\s+/g, " ").trim() + (t.classList.contains("ko") ? "!" : t.classList.contains("att") ? "?" : ""); }).join(" | ")');
  const sec = s => `details.fs[data-section="${s}"]`;
  // la face est à plat : rien de ce qui faisait le relief, et toujours un corps
  const faceAPlat = async ou => { const n = await q(ou + ' .mj .mj-flanc, ' + ou + ' .mj .mj-ombre, ' + ou + ' .mj .mj-fut'), c = await q(ou + ' .mj .mj-corps'); return n === 0 && c > 0; };
  const vue = () => page.evaluate(() => JSON.stringify(app.vue));

  console.log('\nun équipement à trois connecteurs (300XC1, folio 3) : le squelette');
  await bloc('3', '300XC1'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const xs = [...document.querySelector('#ba-equip').children].slice(0, 4).map(e => e.className.split(' ')[0]); return xs.join() === 'fi-nav,fi-entete,fi-alerte,fs'; }), 'la barre, l’en-tête, les problèmes, puis les sections');
  ok(await q('.fi-ariane, .fi-maillon') === 0 && await q('#fi-prec:disabled, #fi-suiv:disabled') === 2 && await q('.fi-nav #in-fermer') === 1, 'plus de fil d’Ariane : ‹ › (éteints : rien avant, rien après) et ×');
  ok(await page.evaluate(() => { const id = document.querySelector('#ba-equip .fi-ident'); return $('eq-rep').value === '300XC1' && !!$('fi-crayon') && !!document.querySelector('#ba-equip .fi-symbole svg') && !$('eq-nature') && !document.querySelector('#ba-equip .fi-entete select, #ba-equip .fi-genre-mot') && !!$('eq-des') && $('eq-des').placeholder === 'Désignation'
    && id.firstElementChild.classList.contains('fi-nom-ligne') && id.lastElementChild.classList.contains('fi-genre'); }), 'l’en-tête (le lecteur : « pas de liste déroulante, personne ne s’en servira ; le repère élec en priorité ») : le symbole, le REPÈRE d’abord et son crayon, dessous la désignation — un texte qu’on tape — ; ni type ni liste');
  ok(await texte('.fi-identite') === 'Connecteur · EN4165-2M · 3 connecteurs · folio 3', 'sous le repère, la ligne d’IDENTITÉ (l’audit : « on ne sait pas ce qu’on regarde ») : ce que c’est, sa référence, combien de connecteurs, son folio', await texte('.fi-identite'));
  ok(await q('.fi-tuile, .fi-tuiles') === 0, 'plus de tuiles sous l’en-tête (le lecteur : « dégage »)');
  ok(await sections() === 'connecteur fils' && await q(sec('identite') + ', ' + sec('raccord') + ', ' + sec('dejafait')) === 0, 'Connecteur (le raccord dedans : « c’est le même »), Câbles — tous PLIÉS d’office (le lecteur : « toutes les sections doivent être pliées : c’est beaucoup plus propre ») ; « Déjà fait » se tait sans base chargée', await sections());
  ok(await page.evaluate(() => { const s = document.querySelector('#ba-equip details.fs[data-section="connecteur"] > summary'); return !!s.querySelector('.fs-titre') && !!s.querySelector('.fs-resume') && !s.querySelector('.fs-ico') && getComputedStyle(s.querySelector('.fs-titre')).fontSize === '13px'; }), 'chaque section, une ligne de FICHE TECHNIQUE : son titre (13 px), ce qu’elle dit en une ligne, sans icône');
  // la suite lit le contenu des sections : on les ouvre, comme l'ingénieur (ce qu'il ouvre se retient, par type d'objet)
  await page.evaluate(() => { ['equipement', 'disjoncteur', 'barrette', 'prise', 'masse', 'fil'].forEach(t => ['disjoncteur', 'connecteur', 'raccord', 'trajet', 'fils', 'dejafait'].forEach(k => retenirSection(t, k, k !== 'dejafait'))); document.querySelectorAll('#ba-equip details.fs').forEach(d => { d.open = d.dataset.section !== 'dejafait'; }); rendreFiche(); }); await page.waitForTimeout(300);
  ok(await sections() === 'connecteur+ fils+', 'ouvertes, elles le restent (la mémoire des sections) : Connecteur et Câbles', await sections());
  ok(await texte(sec('fils') + ' .fs-titre') === 'Câbles' && /^23 câbles/.test(await texte(sec('fils') + ' .fs-resume')), '« Câbles », plus « Fils » (le lecteur : « dis câble, c’est plus propre »)', await texte(sec('fils') + ' .fs-resume'));
  ok(await page.evaluate(() => { const b = document.querySelector('#ba-equip details.fi-alerte'); return !!b && !b.open && b.classList.contains('ko'); }) && /^1 problème$/.test(await texte('.fi-pb-n')) && /^— B · aucun arrangement/.test(await texte('.fi-pb-1')) && await texte('.fi-pb-k') === 'Problèmes' && await q(sec('connecteur') + ' .fs-badge.ko') === 1,
    'les problèmes, repliés sous l’en-tête, la première ligne de la fiche technique (l’audit : « la barre rose ne dit pas lequel ») : « Problèmes · 1 problème — B · aucun arrangement… » ; il est compté dans la pastille de « Connecteur »', await texte('.fi-pb'));
  const yAvant = await page.evaluate(() => $('ba-equip').scrollTop);
  await page.click('#fi-pb'); await page.waitForTimeout(300);
  ok(await page.evaluate(y => { const b = document.querySelector('#ba-equip details.fi-alerte'), l = b.querySelectorAll('.fi-pb-l'); return b.open && l.length === 1 && /aucun arrangement/.test(l[0].textContent) && /Connecteur B/.test(l[0].querySelector('.fi-pb-s').textContent) && $('ba-equip').scrollTop === y; }, yAvant), 'un clic les déplie EN PLACE (la fiche ne descend pas) : une ligne, la section qui le démontre en petit (« Connecteur B »)');
  await page.click('#ba-equip .fi-pb-l'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const d = document.querySelector('#ba-equip details[data-section="connecteur"]'); return d.open && d.classList.contains('fs-allume'); }), 'un clic sur la ligne ouvre la section qui le démontre, et l’allume');
  await page.click('#fi-pb'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => !document.querySelector('#ba-equip details.fi-alerte').open), 'et la barre se replie');
  ok(await q(sec('connecteur') + ' summary .ct-bulles .ct-bulle') === 3 && await q('.ct-bulle[aria-pressed="true"]', 'xs => xs[0].dataset.connecteur') === 'B' && await q('.ct-bulle.ko', 'xs => xs.map(x => x.dataset.connecteur).join()') === 'B' && await texte(sec('connecteur') + ' .fs-titre') === 'Connecteur', 'sous le titre « Connecteur », une BULLE par connecteur — A · B · C (le lecteur : « comme une bulle ; on appuie, ça passe de l’un à l’autre ») ; la fiche s’ouvre sur B, le fautif, en rouge');
  ok(/Aucun ne loge B5/.test(await texte(sec('connecteur') + ' [data-panneau="B"]')) && await q(sec('connecteur') + ' [data-sexe="300XC1|B"]') === 2 && await q(sec('connecteur') + ' [data-panneau="B"] [data-hab="300XC1|B"]') === 1, 'B, qu’aucun arrangement ne loge, NOMME sa borne fautive (« Aucun ne loge B5 », plus « ces bornes ») et laisse changer le sexe des contacts ; son raccord est DANS la section, sous ses contacts');
  // le coupable, dit par le moteur (09-barrettes, `remplirContacts` : bornes, coupables, le plus proche) ; le geste qui répare
  ok(await page.evaluate(() => { const p = document.querySelector('#ba-equip [data-panneau="B"]'), f = p.querySelector('.fi-fautifs'), r = p.querySelector('.fi-reparer[data-reparer]'), t = p.querySelector('.fi-contacts'), c = t && t.querySelector('.ct-ligne.coupable');
    return !!f && /B5\s?: W-370 \(DR12\), trop gros pour le contact 5 du 12-20, le plus proche/.test(f.textContent.replace(/\s+/g, ' ')) && !!r && r.textContent.trim() === 'W-370 en DR18' && r.dataset.type === 'DR18'
      && t.classList.contains('ct-sans') && !!c && /B5/.test(c.textContent) && /trop gros/.test(c.textContent) && /Les contacts à sertir viendront avec l’arrangement/.test(p.textContent); }),
    'sous « Arrangement », le COUPABLE (l’audit : « on ne sait pas quel câble ») : « B5 : W-370 (DR12), trop gros pour le contact 5 du 12-20, le plus proche » et le geste « W-370 en DR18 » ; dans la table, la ligne de B5 marquée ; sans arrangement, pas de colonne « contact » (ils viendront avec lui)');
  const nRep = await page.evaluate(() => app.hist.length);
  await page.click('#ba-equip [data-panneau="B"] .fi-reparer'); await page.waitForTimeout(800);
  ok(await page.evaluate(n => verite().find(l => l.cable === 'W-370').type === 'DR18' && app.hist.length === n + 1 && app.cible && app.cible.nom === '300XC1' && !CONTROLE.items.some(x => x.nom === '300XC1' && /aucun arrangement/.test(x.texte)), nRep),
    '« W-370 en DR18 » : un clic, une entrée d’historique — B se loge, le problème s’en va, la fiche reste sur 300XC1');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => verite().find(l => l.cable === 'W-370').type === 'DR12' && !!document.querySelector('#ba-equip [data-panneau="B"] .fi-reparer')), 'Ctrl+Z rend le DR12 du retest, et le geste revient');
  await page.click('#ba-equip .ct-bulles [data-connecteur="A"]'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.querySelector('#ba-equip details[data-section="connecteur"]').open && document.querySelector('#ba-equip .ct-bulle[aria-pressed="true"]').dataset.connecteur === 'A'), 'un clic sur la bulle A montre A — la section reste ouverte');
  ok(await q('[data-panneau="A"] .fc-k', 'xs => xs.map(x => x.textContent).join()') === 'Référence,Arrangement' && !/part number|compléter les normes|Norme/.test(await texte(sec('connecteur') + ' [data-panneau="A"]')), 'le connecteur A : sa RÉFÉRENCE, puis l’arrangement — plus de « part number », plus de « Norme » ni de « compléter les normes »');
  ok(await page.evaluate(() => { const r = [...document.querySelectorAll('#ba-equip [data-panneau="A"] .fc')].find(x => x.querySelector('.fc-k').textContent === 'Arrangement'), b = r && r.querySelector('.fi-norme-puce[data-face]'), ref = [...document.querySelectorAll('#ba-equip [data-panneau="A"] .fc')].find(x => x.querySelector('.fc-k').textContent === 'Référence');
    return !!b && /EN4165-002-12-20/.test(b.textContent) && !r.querySelector('.orig') && !!r.querySelector('[data-changer="arr|300XC1|A"]') && !r.querySelector('.fs-auto') && !!r.querySelector('.fi-q[data-q="arrangement"]')
      && !r.querySelector('.fi-fam') && ref.querySelector('.fi-pn [data-pn="A"]').value === 'EN4165-2M'; }) && await q('[data-panneau="A"] .fi-face') === 1
      && /EN 4165-002/.test(await texte('[data-panneau="A"] .fi-norme-ligne')) && /11\spris/.test(await texte('[data-panneau="A"] .fi-norme-ligne')) && /1\slibre/.test(await texte('[data-panneau="A"] .fi-norme-ligne')) && await q('[data-panneau="A"] .fi-norme-ligne [data-bible]') === 1,
    'la référence de A (EN4165-2M, modifiable) ; l’arrangement en puce (EN4165-002-12-20), son « ? », « Changer » à sa droite, aucune pastille ; la FACE montrée d’office et, dessous, ce que dit la norme : EN 4165-002, 11 pris, 1 libre, la bible');
  await page.click('#ba-equip [data-panneau="A"] .fi-norme-puce[data-face]'); await page.waitForTimeout(400);
  ok(await q('[data-panneau="A"] .fi-face') === 0, 'un clic sur la puce replie la face');
  await page.click('#ba-equip [data-panneau="A"] .fi-norme-puce[data-face]'); await page.waitForTimeout(400);
  ok(await faceAPlat('[data-panneau="A"]') && await q('[data-panneau="A"] .mj-module.corps-module .mj-cle') === 1, 'un autre la rend : la face du module EN 4165, à plat, un module carré et son détrompeur');
  ok(await q('[data-panneau="A"] .mj-contact.plein') === 11 && await q('[data-panneau="A"] .mj-contact') === 12 && await q('[data-panneau="A"] .fi-contacts .fi-fil[data-i]') === 11, 'onze contacts pleins sur douze ; onze lignes de contact');
  ok(await q('[data-panneau="A"] .fi-contacts .ct-legende > span', 'xs => xs.map(x => x.firstChild ? x.firstChild.textContent : "").join()') === 'Borne,Contact à sertir,Gauge,Câble' &&await q('[data-panneau="A"] .fi-contacts .ct-legende .fi-q', 'xs => xs.map(x => x.dataset.q).join()') === 'contact,gauge'
    && await page.evaluate(() => { const li = document.querySelector('#ba-equip [data-panneau="A"] .fi-contacts .fi-fil[data-i]'), l2 = li.nextElementSibling;
      return li.querySelector('.ct-pin b').textContent === 'A1' && li.querySelector('.fi-sertir').textContent === 'EN3155-003F2020' && l2.querySelector('.fi-sertir').textContent === 'EN3155-003F2020' && l2.querySelector('.fi-sertir').classList.contains('meme') && !/″/.test(document.querySelector('#ba-equip [data-panneau="A"] .fi-contacts').textContent)
        && /^24AWG$/.test(li.querySelector('.fi-jg').textContent) && !!li.querySelector('.fi-jg.ok svg') && li.querySelector('.fi-cab-n').textContent === 'W-320' && !/381RL1/.test(li.textContent); }),
    'les contacts, une table au cordeau (Borne · Contact à sertir · Gauge · Câble) : la borne, le contact de la table en clair (le même qu’au-dessus plus pâle — plus de « ″ »), la gauge et son ✓ vert, le câble ; plus « vers »');
  // d'où vient chaque valeur des tables : un repère discret, sa bulle nomme les sources (ou pourquoi c'est à confirmer) ; la légende une fois
  ok(await page.evaluate(() => { const p = document.querySelector('#ba-equip [data-panneau="A"]'), m = p.querySelector('.fi-contacts .ct-sertir .fi-conf'), L = p.querySelector('.fi-conf-legende'), n = m && [...m.classList].find(c => c.length === 1);
    const tous = [...document.querySelectorAll('#ba-equip details[data-section="connecteur"] .fi-conf:not(.fi-conf-legende .fi-conf)')];
    return !!m && /^[vlc]$/.test(n) && m.dataset.bulle.length > 12 && (n !== 'v' || /^Vérifié par deux sources : \S/.test(m.dataset.bulle)) && (n !== 'c' || /^À confirmer/.test(m.dataset.bulle)) && m.getAttribute('role') === 'img' && !!m.getAttribute('aria-label')
      && !!L && ['vérifié par deux sources', 'vos tables', 'à confirmer'].every(w => L.textContent.includes(w)) && tous.length >= 3 && tous.every(x => x.dataset.bulle); }),
    'chaque valeur des tables dit d’où elle vient (le lecteur : « tout est correct ? les contacts, tyrap… ? tout ? ») : un repère de 7 px — vérifié par deux sources (la bulle les nomme), vos tables, à confirmer (et pourquoi) — la légende sous la table');

  console.log('\ntout se change sur place : l’arrangement, le part number, le contact');
  await page.click('#ba-equip [data-changer="arr|300XC1|A"]'); await page.waitForTimeout(300);
  ok(await q('[data-volet="arr|300XC1|A"] .cand') >= 2 && await q('[data-volet="arr|300XC1|A"] .cand[aria-pressed="true"]') === 1 && await page.evaluate(() => { const v = document.querySelector('#ba-equip [data-volet="arr|300XC1|A"]'), r = v.closest('.fc'); return !!r && r.querySelector('.fc-k').textContent === 'Arrangement'; }), '« Changer » ouvre la liste SOUS la valeur : « Automatique » en tête, pressé, puis les arrangements qui logent ces bornes');
  await page.click('#ba-equip [data-volet="arr|300XC1|A"] .cand:not([aria-pressed="true"])'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => { const d = app.contrat.designations.get('300XC1|A'), r = [...document.querySelectorAll('#ba-equip [data-panneau="A"] .fc')].find(x => x.querySelector('.fc-k').textContent === 'Arrangement'); return !!d && r.textContent.includes(d) && !r.querySelector('.orig-main, .fs-auto') && !document.querySelector('#ba-equip [data-volet]') && app.cible.type === 'bloc'; }), 'un autre arrangement retenu : ni pastille « main » ni ↺ (« le bouton revenir en arrière, ça sert à rien »), la liste refermée');
  await page.click('#ba-equip [data-changer="arr|300XC1|A"]'); await page.waitForTimeout(300);
  ok(await q('[data-volet="arr|300XC1|A"] .cand-auto[aria-pressed="false"]') === 1, 'rouverte, la liste a « Automatique » en tête, qui n’est plus pressé');
  await page.click('#ba-equip [data-volet="arr|300XC1|A"] .cand-auto'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => !app.contrat.designations.get('300XC1|A') && /EN4165-002-12-20/.test(document.querySelector('#ba-equip [data-panneau="A"] .fi-norme-puce').textContent)), '« Automatique » rend le calcul');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => !!app.contrat.designations.get('300XC1|A') && app.cible && app.cible.nom === '300XC1' && !$('inspecteur').hidden && !!document.querySelector('#ba-equip details[data-section="connecteur"]')), 'Ctrl+Z défait le retour à l’automatique — et la fiche reste ouverte sur 300XC1');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => !app.contrat.designations.get('300XC1|A') && app.cible && app.cible.nom === '300XC1'), 'Ctrl+Z encore : l’arrangement automatique, la fiche toujours là');
  const pnAvant = await page.evaluate(() => verite().filter(l => (l.de === '300XC1' && /^A/.test(l.borneDe)) || (l.vers === '300XC1' && /^A/.test(l.borneVers))).length);
  await page.fill('#ba-equip [data-panneau="A"] [data-pn="A"]', 'EN4165-3M'); await page.press('#ba-equip [data-panneau="A"] [data-pn="A"]', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(n => { const L = verite().flatMap(l => [l.de === '300XC1' && /^A/.test(l.borneDe) ? l.pnDe : null, l.vers === '300XC1' && /^A/.test(l.borneVers) ? l.pnVers : null]).filter(x => x !== null);
    const r = document.querySelector('#ba-equip [data-panneau="A"] .fi-pn'); return L.length === n && L.every(p => p === 'EN4165-3M') && !r.querySelector('.orig-main, .fs-auto'); }, pnAvant),
    'la référence de A, écrite une fois : les ' + pnAvant + ' liaisons du connecteur suivent — ni pastille ni ↺');
  ok(await page.evaluate(() => app.hist[app.hist.length - 1].quoi === 'référence de 300XC1 A'), 'un seul geste dans l’historique');
  await page.fill('#ba-equip [data-panneau="A"] [data-pn="A"]', 'EN4165-2M'); await page.press('#ba-equip [data-panneau="A"] [data-pn="A"]', 'Enter'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => verite().filter(l => l.de === '300XC1' && /^A/.test(l.borneDe)).every(l => l.pnDe === 'EN4165-2M' && origineChamp(l, 'pnDe') !== 'main')), 'retapée (« si on veut, on retapera »), la référence du fichier revient à toutes les liaisons');
  // le contact à sertir : une liste sous la ligne, les contacts de la table qui acceptent ce câble
  await page.click('#ba-equip [data-panneau="A"] .fi-contacts .fi-fil[data-i] .fi-sertir'); await page.waitForTimeout(400);
  const ct = await page.evaluate(() => { const v = document.querySelector('#ba-equip .fi-choix-ligne [data-volet^="sertir:"]'); return v ? [...v.querySelectorAll('[data-sertir-ref], .fi-chip-auto')].map(b => (b.dataset.v || 'Automatique') + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')) : null; });
  ok(!!ct && ct.length >= 2 && ct[0] === 'Automatique*', 'le contact d’une ligne : un clic ouvre, sous elle, « Automatique » (celui de la table, pressé) puis les contacts de la table qui acceptent ce câble', (ct || []).join(' '));
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => !document.querySelector('#ba-equip .fi-choix') && !$('inspecteur').hidden && app.cible && app.cible.nom === '300XC1'), 'Échap ferme la liste, pas la fiche');

  console.log('\nles câbles d’une fiche : le type, la longueur, le contact s’écrivent DANS la carte (300XC1)');
  const ligneCab = c => `#ba-equip ${sec('fils')} .fi-ia[data-i="${c}"]`;
  const k320 = await page.evaluate(() => String(verite().findIndex(l => l.cable === 'W-320')));
  ok(await page.evaluate(k => { const li = document.querySelector(`#ba-equip details[data-section="fils"] .fi-ia[data-i="${k}"]`); if (!li) return false;
    const n = li.querySelector('[data-cable][data-champ="cable"]'), f = li.querySelector('[data-cable][data-champ="famille"]'), j = li.querySelector('select[data-cable][data-champ="jauge"]'), L = li.querySelector('[data-cable][data-champ="longueur"]');
    return n.value === 'W-320' && f.value === 'DR' && f.getAttribute('list') === 'fi-familles' && j.value === '24' && [...j.options].some(o => o.value === '20') && !!f.closest('.cb-type-ed') && !!j.closest('.cb-type-ed') && L.value === '' && L.placeholder === '5' && !!L.closest('.cb-lg.supp') && /supposée/.test(L.getAttribute('aria-label'))
      && !li.querySelector('.cb-vers, .fs-auto, .cb-tete, .cb-anneau') && !!li.querySelector('.cb-ouvrir[data-ouvrir-cable]') && !!document.getElementById('fi-familles') && li.getBoundingClientRect().height < 44; }, k320),
    'la LIGNE de W-320, un tableau dense (l’audit : « 23 cartes de 90 px ») : son NUMÉRO, son TYPE (DR, la liste des familles de la base) et sa GAUGE (24, la liste des gauges du DR), chacun à part (le lecteur : « la gauge et le type de câble, ça c’est important ») ; « › » ouvre sa fiche ; sa longueur en italique, « supposée » tant que le retest ne la porte pas ; une ligne de moins de 44 px');
  ok(await q(sec('fils') + ' .cb-entete .fi-q', 'xs => xs.map(x => x.dataset.q).join()') === 'intensite,chute' && await q(sec('fils') + ' .cb-carte', 'xs => xs.every(x => x.querySelector(".cb-i .fi-barre") && /^[\\d,]+ \\/ [\\d,]+ A$/.test(x.querySelector(".cb-i-v").textContent) && /^[\\d,]+\\sV$/.test(x.querySelector(".fi-u").textContent))')
    && await q(sec('fils') + ' .cb-entete > span', 'xs => xs.map(x => { const c = x.cloneNode(true); c.querySelectorAll(".fi-q").forEach(b => b.remove()); return c.textContent.trim(); }).join("|")') === '|Câble|Type|Intensité|Chute|m|',
    'en tête des colonnes, une fois : Câble · Type · Intensité (son « ? ») · Chute (son « ? ») · m ; chaque ligne, une barre fine et « 2 / 3,9 A », la chute en volts',
    await q(sec('fils') + ' .cb-entete > span', 'xs => xs.map(x => x.textContent.trim()).join("|")') + ' · ' + await q(sec('fils') + ' .cb-carte', 'xs => xs.filter(x => !(x.querySelector(".cb-i .fi-barre") && /^[\\d,]+ \\/ [\\d,]+ A$/.test(x.querySelector(".cb-i-v").textContent) && /^[\\d,]+\\sV$/.test(x.querySelector(".fi-u").textContent))).map(x => x.querySelector(".cb-i-v").textContent + "|" + x.querySelector(".fi-u").textContent).join(" ; ")'));
  ok(await q(sec('fils') + ' .cb-bande .cb-bande-l') >= 1 && /^Intensité/.test(await texte(sec('fils') + ' .cb-bande .cb-bande-l')) && await q(sec('fils') + ' .cb-bande .cb-piste i') === 23 && await page.evaluate(() => { const b = document.querySelector('#ba-equip details[data-section="fils"] .cb-bande'); return b.nextElementSibling.classList.contains('cb-liste'); }),
    'au-delà de douze câbles, la BANDE DES MARGES au-dessus du tableau : chaque câble un trait à sa part de l’admis, le plus chargé nommé', await texte(sec('fils') + ' .cb-bande'));
  await page.selectOption(ligneCab(k320) + ' select[data-champ="jauge"]', '20'); await page.waitForTimeout(800);
  ok(await page.evaluate(k => { const l = verite()[+k], li = document.querySelector(`#ba-equip details[data-section="fils"] .fi-ia[data-i="${k}"]`);
    return l.type === 'DR20' && l.avant && l.avant.type === 'DR24' && !!li && li.querySelector('select[data-champ="jauge"]').value === '20' && li.querySelector('[data-champ="famille"]').value === 'DR' && !li.querySelector('.fs-auto, .orig-main') && app.cible.nom === '300XC1'; }, k320),
    'la gauge choisie dans la carte (20) : le câble devient un DR20 — sans pastille ni ↺ — la fiche reste sur 300XC1');
  await page.fill(ligneCab(k320) + ' [data-champ="famille"]', 'drb'); await page.press(ligneCab(k320) + ' [data-champ="famille"]', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(k => verite()[+k].type === 'DRB20', k320), 'le type écrit à part (« drb ») garde la gauge : DRB20');
  await page.selectOption(ligneCab(k320) + ' select[data-champ="jauge"]', '24'); await page.waitForTimeout(500); await page.fill(ligneCab(k320) + ' [data-champ="famille"]', 'DR'); await page.press(ligneCab(k320) + ' [data-champ="famille"]', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(k => verite()[+k].type === 'DR24' && origineChamp(verite()[+k], 'type') !== 'main', k320), 'retapés, le type et la gauge du fichier reviennent (DR24)');
  await page.fill(ligneCab(k320) + ' [data-champ="cable"]', ''); await page.press(ligneCab(k320) + ' [data-champ="cable"]', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(k => !verite()[+k].cable && !!document.querySelector(`#ba-equip details[data-section="fils"] .fi-ia[data-i="${k}"] .cb-num-ed.manque`), k320), 'un câble sans numéro : son champ le signale, en ambre (« il manque une information »)');
  await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(k => verite()[+k].cable === 'W-320', k320), 'Ctrl+Z rend son numéro');
  await page.fill(ligneCab(k320) + ' [data-champ="longueur"]', '7,5'); await page.press(ligneCab(k320) + ' [data-champ="longueur"]', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(k => verite()[+k].longueur === 7.5 && !document.querySelector(`#ba-equip details[data-section="fils"] .fi-ia[data-i="${k}"] .fs-auto`), k320), 'la longueur écrite dans la carte (7,5 m)');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(k => verite()[+k].longueur == null && app.cible && app.cible.nom === '300XC1', k320), 'Ctrl+Z rend l’hypothèse, la fiche reste ouverte');
  ok(await q(sec('fils') + ' .fi-ct-puce') === 0, 'le contact au bout ne charge plus la ligne : il se change dans la fiche du câble (un clic sur « › »)');

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
  await page.evaluate(() => { $('ba-equip').scrollTop = 320; $('ba-equip').dispatchEvent(new Event('scroll')); }); await page.waitForTimeout(250);
  // (le repère y entre en fondu : on attend la fin du fondu plutôt qu'un temps fixe — avant v72 aussi, 250 ms ne suffisaient pas toujours)
  await page.waitForFunction(() => { const n = document.querySelector('#ba-equip .fi-nav-nom'); return !!n && getComputedStyle(n).opacity === '1'; }, null, { timeout: 3000 }).catch(() => {}); const v0 = await vue();
  ok(await page.evaluate(() => $('ba-equip').classList.contains('defile') && getComputedStyle(document.querySelector('#ba-equip .fi-nav-nom')).opacity === '1' && document.querySelector('#ba-equip .fi-nav-nom').textContent === '300XC1'), 'l’en-tête passé sous la barre : le repère s’y écrit en petit');
  await page.evaluate(() => { const li = document.querySelector('#ba-equip [data-panneau="A"] .fi-contacts .fi-fil[data-i]'); li.scrollIntoView({ block: 'center' }); }); await page.waitForTimeout(100);
  const haut0 = await page.evaluate(() => $('ba-equip').scrollTop);
  await page.click('#ba-equip [data-panneau="A"] .fi-contacts .fi-fil[data-i] .fi-ct'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => app.cible.type === 'fil' && app.cible.l.cable === 'W-320' && app.insp.pile.length === 2 && app.insp.pos === 1), 'un clic sur une ligne de contact ouvre la fiche de son câble, et l’empile');
  ok(await q('#fi-prec:not(:disabled)') === 1 && /300XC1/.test(await page.evaluate(() => $('fi-prec').getAttribute('aria-label'))) && /300XC1/.test(await page.evaluate(() => $('fi-prec').dataset.bulle)) && !(await page.evaluate(() => $('fi-prec').title)), '‹ s’allume : « Revenir à 300XC1 » (dans sa bulle, plus dans un title)', await page.evaluate(() => $('fi-prec').dataset.bulle));
  // le chemin du câble : chaque bout, son contact en puce ; un clic l'ouvre
  ok(await page.evaluate(() => { const o = document.querySelector('#ba-equip ol.fi-chemin'); return !!o && o.querySelectorAll('li.fi-etape.fi-bout').length === 2 && !!o.querySelector('[data-bout="de"]') && !!o.querySelector('[data-bout="vers"]') && !!o.querySelector('.fi-bout-puce'); }), 'la fiche de W-320 : son CHEMIN, un bout par ligne sur le trait de sa route, le contact de chaque bout en puce');
  await page.click('#ba-equip .fi-bout-puce'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.querySelectorAll('#ba-equip .fi-choix [data-sertir-ref], #ba-equip .fi-choix .fi-chip-auto').length >= 1 && app.cible.type === 'fil'), 'un clic sur la puce ouvre les contacts que la table accepte pour ce câble');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  ok(await vue() === v0, 'W-320 était en vue : le plan n’a pas bougé');
  await page.keyboard.press('Alt+ArrowLeft'); await page.waitForTimeout(600);
  ok(await page.evaluate(h => app.cible.type === 'bloc' && app.cible.nom === '300XC1' && Math.abs($('ba-equip').scrollTop - h) < 2 && document.querySelector('#ba-equip .ct-bulles [aria-pressed="true"]').dataset.connecteur === 'A' && app.insp.pos === 0, haut0), 'Alt+← revient à 300XC1, au même défilement, sur le même connecteur');
  await page.keyboard.press('Alt+ArrowRight'); await page.waitForTimeout(600);
  ok(await page.evaluate(() => app.cible.type === 'fil' && app.cible.l.cable === 'W-320'), 'Alt+→ repart vers W-320');
  ok(await sections() === 'trajet+ fils+', 'la fiche d’un câble : de → vers, l’intensité et la chute (plus d’Identité : les tuiles la portent)', await sections());
  await page.click('#ba-equip [data-bout="vers"]'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.cible.nom === '381RL1' && document.querySelector('#ba-equip details[data-section="connecteur"]').open && !!document.querySelector('#ba-equip details[data-section="connecteur"] .fi-fil.vise') && /W-320/.test(document.querySelector('#ba-equip .fi-fil.vise.arrivee').dataset.bulle) && app.insp.pile.length === 3),
    'la carte « Vers » ouvre 381RL1, son connecteur ouvert, la ligne de W-320 allumée — empilé');
  await page.click('#fi-prec'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => app.cible.type === 'fil' && app.cible.l.cable === 'W-320'), '‹ ramène à W-320');
  await page.click('#ba-equip [data-bout="de"]'); await page.waitForTimeout(500);
  ok(await page.evaluate(() => app.cible.nom === '300XC1' && app.insp.pile.length === 3 && app.insp.pos === 2), 'la carte « De » ouvre 300XC1 (et empile)');
  // le plan : un clic dessus REMPLACE le haut de la pile
  await page.evaluate(() => choisirBloc(app.dessin.comps.find(k => k.name === '351PM1' && k.kind !== 'tag'))); await page.waitForTimeout(400);
  ok(await page.evaluate(() => app.insp.pile.length === 3 && app.insp.pile[2].nom === '351PM1'), 'un clic sur le plan remplace le haut de la pile');
  // survoler une ligne allume son câble sur le plan
  await page.locator('#ba-equip ' + sec('fils') + ' .fi-ia[data-i] .cb-i').first().hover(); await page.waitForTimeout(400);
  ok(await page.evaluate(() => !!document.querySelector('#scene.focus .cab.hl') && !!document.querySelector('#ba-equip .fi-ia.vise')), 'survoler une ligne allume son câble sur le plan');
  ok(await page.evaluate(() => { const b = document.querySelector('.fi-bulle'); return !!b && !b.hidden && /admis/.test(b.textContent); }), 'et sa bulle dit d’où viennent ses chiffres (ce qu’il admet)', await page.evaluate(() => (document.querySelector('.fi-bulle') || {}).textContent));
  await page.mouse.move(5, 5);

  console.log('\nune barrette (668VT31, folio 3) : la face vivante, la galerie de la norme');
  await bloc('3', '668VT31'); await page.waitForTimeout(400);
  ok(await q('.fi-tuile') === 0 && await q('.fi-alerte') === 0 && !(await genre()), 'plus de tuiles ni de type sous le repère ; rien à reprendre, pas de barre des problèmes', await genre());
  ok(await sections() === 'connecteur+ fils+' && /^Module/.test(await texte(sec('connecteur') + ' .fs-titre')), 'le module ouvert, ses contacts dedans ; pas de raccord (sans objet)', await sections());
  ok(/^Barrette de jonction · E0599-1B207Z · 12 câbles · folio 3$/.test(await texte('.fi-identite')) && /1 proposition de Volta/.test(await texte('#fi-ecarts summary')) && await page.evaluate(() => !document.querySelector('#ba-equip #fi-ecarts').open),
    'son identité (« Barrette de jonction · E0599-1B207Z · 12 câbles · folio 3 ») ; CE QUI CHANGE PAR RAPPORT AU RETEST, replié sous l’en-tête : « 1 proposition de Volta » (le module)', await texte('.fi-identite') + ' · ' + await texte('#fi-ecarts summary'));
  await page.click('#ba-equip #fi-ecarts summary'); await page.waitForTimeout(250);
  ok(await page.evaluate(() => { const e = document.querySelector('#ba-equip #fi-ecarts'), l = e.querySelector('.fi-ec-l.volta'); return e.open && !!l && /E0599-1A101Z/.test(l.querySelector('s').textContent) && /E0599-1B207Z/.test(l.querySelector('.fi-ec-v b').textContent) && /à reporter au bureau d’études/.test(e.textContent); }),
    'déplié : une ligne par changement — ce que portait le retest barré, ce que Volta retient ; « à reporter au bureau d’études »');
  await page.click('#ba-equip #fi-ecarts summary'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => { const r = [...document.querySelectorAll('#ba-equip details[data-section="connecteur"] .fc')], m = r.find(x => x.querySelector('.fc-k').textContent === 'Module');
    const rail = r.find(x => x.querySelector('.fc-k').textContent === 'Rail');
    return r.length === 2 && !!m && /E0599-1B207Z/.test(m.querySelector('[data-changer="bar|668VT31"]').textContent) && !!m.querySelector('.fi-q[data-q="module"]') && !!rail && /^001751 101 00$/.test(rail.querySelector('.fi-rail').textContent) && /1\smodule · 18\smm/.test(rail.textContent) && !!rail.querySelector('.fi-q[data-q="rail"]') && !/potentiel|Norme/i.test(document.querySelector('#ba-equip details[data-section="connecteur"]').textContent); }),
    'le module (E0599-1B207Z en puce, son « ? ») et le RAIL qui le porte (001751 101 00 : un module, 18 mm ; son « ? ») — plus de ligne Norme, plus de « potentiel » nulle part');
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
  ok(await page.evaluate(r => app.contrat.designations.get('668VT31') === r && !document.querySelector('#ba-equip details[data-section="connecteur"] .orig-main, #ba-equip details[data-section="connecteur"] .fs-auto') && !document.querySelector('#ba-equip [data-volet="bar|668VT31"]'), autre), 'un clic sur une autre variante la retient à la main (' + autre + ') : ni pastille ni ↺, la galerie se referme');
  await page.click('#ba-equip [data-changer="bar|668VT31"]'); await page.waitForTimeout(300);
  await page.click('#ba-equip .fi-gal-auto'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => !app.contrat.designations.get('668VT31') && /E0599-1B207Z/.test(document.querySelector('#ba-equip details[data-section="connecteur"] .fc').textContent)), '« Automatique », dans la galerie, rend le choix de l’outil');
  await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => !app.contrat.designations.get('668VT31') && app.cible && app.cible.nom === '668VT31'), 'deux Ctrl+Z : rien n’a bougé, la fiche toujours là');

  console.log('\nun disjoncteur (102CB1, folio 1) : la section « Calibre »');
  await bloc('1', '102CB1'); await page.waitForTimeout(400);
  ok(/^4 problèmes · \d+ à voir$/.test(await texte('.fi-pb-n')) && await q('.fi-pbs .fi-pb-l') === await page.evaluate(() => { const n = document.querySelector('#ba-equip .fi-pb-n').textContent.match(/\d+/g).map(Number); return n[0] + n[1]; }), 'la barre dit les problèmes (quatre : W-012 et W-015 dépassés par la charge, le contact 23 du DR24 sous son permanent, le 10 A du retest qui ne passe pas) et les points à voir ; dépliée, elle les liste tous', await texte('.fi-pb-n'));
  ok(await texte('.fi-identite') === 'Disjoncteur · MS3320-10 · folio 1', 'son identité : « Disjoncteur · MS3320-10 · folio 1 »', await texte('.fi-identite'));
  // LA CARTE DE DÉCISION (le parcours : « le 10 A du retest déclenche — et maintenant ? ») : ce qui cloche, le geste qui répare tout, ce qu'il faudrait pour garder le retest
  ok(await page.evaluate(() => { const c = document.querySelector('#ba-equip .fi-decision'), t = c && c.textContent.replace(/\s+/g, ' ');
    return !!c && c.classList.contains('ko') && c.nextElementSibling.id === 'fi-pbs' && c.querySelector('.fi-decision-t').textContent.trim() === 'Le 10 A du retest touche la courbe' && /9,31 A pendant 2,1 min, touche la courbe du MS3320-10/.test(t) && /Le plus petit qui passe est le 15 A \(MS3320-15\) — il demande 3 câbles plus gros/.test(t)
      && [...c.querySelectorAll('.fi-decision-cables li[data-i]')].map(li => li.textContent.replace(/\s+/g, '')).join() === 'W-011DR16DR12,W-012DR20DR12,W-015DR24DR12' && $('dj-decider').textContent.trim() === 'Passer en 15 A et grossir les 3 câbles'
      && c.querySelector('[data-changer="garder|102CB1"]').textContent.trim() === 'Garder le 10 A…' && /^et \d+ autres points$/.test(c.querySelector('[data-ouvrir-pbs]').textContent.trim()); }),
    'la CARTE DE DÉCISION en tête : « Le 10 A du retest touche la courbe », pourquoi (9,31 A pendant 2,1 min), le plus petit qui passe (15 A, MS3320-15) et les trois câbles qu’il demande ; « Passer en 15 A et grossir les 3 câbles », « Garder le 10 A… », « et N autres points »');
  ok(/^— W-012/.test(await texte('.fi-pb-1')), 'la ligne des problèmes ne répète pas la carte : son premier point est W-012', await texte('.fi-pb-1'));
  await page.click('#ba-equip [data-changer="garder|102CB1"]'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const v = document.querySelector('#ba-equip [data-volet="garder|102CB1"]'); return !!v && /Pour que le 10 A passe, il faudrait des pointes plus courtes/.test(v.textContent.replace(/\s+/g, ' ')) && !!v.querySelector('[data-dj-geste="retenir"][data-cal="10"]'); }),
    '« Garder le 10 A… » dit ce qu’il faudrait pour qu’il passe (des pointes plus courtes) et laisse le retenir quand même');
  await page.click('#ba-equip [data-changer="garder|102CB1"]'); await page.waitForTimeout(300);
  const nD = await page.evaluate(() => app.hist.length);
  await page.click('#dj-decider'); await page.waitForTimeout(900);
  ok(await page.evaluate(n => { const t = c => verite().find(l => l.cable === c).type, e = document.querySelector('#ba-equip #fi-ecarts');
    return app.hist.length === n + 1 && pnDuRepere('102CB1') === 'MS3320-15' && ['W-011', 'W-012', 'W-015'].every(c => t(c) === 'DR12') && calibreDe('102CB1') === 15 && $('dj-retenir').getAttribute('aria-pressed') === 'true' && !document.querySelector('#ba-equip .fi-decision')
      && !!e && /4 changements écrits ici/.test(e.querySelector('summary').textContent) && app.cible.nom === '102CB1'; }, nD),
    '« Passer en 15 A et grossir les 3 câbles » : UN geste, une entrée d’historique — MS3320-15 au retest, W-011, W-012 et W-015 en DR12 ; « Automatique » reste pressé, la carte s’en va ; « Retest · 4 changements écrits ici » le dit, pour le bureau d’études', await texte('#fi-ecarts summary'));
  await page.keyboard.press('Control+z'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => pnDuRepere('102CB1') === 'MS3320-10' && verite().find(l => l.cable === 'W-015').type === 'DR24' && !!document.querySelector('#ba-equip .fi-decision') && app.cible.nom === '102CB1'), 'Ctrl+Z rend le retest — et la carte');
  // « contact taille 23 (3 A, par la gauge) » (le lecteur : pourquoi ?) : le problème dit « supposé », sa glose dit pourquoi
  ok(await page.evaluate(() => { const l = [...document.querySelectorAll('#ba-equip .fi-pbs .fi-pb-l')].find(x => /W-015/.test(x.textContent) && /contact taille 23/.test(x.textContent)); return !!l && /contact taille 23 supposé \(3 A\)/.test(l.querySelector('.fi-pb-t').textContent.replace(/\s+/g, ' ')) && !/par la gauge/.test(l.textContent)
      && /Le plan ne dit pas quel contact est serti au bout de W-015 : Volta prend le plus petit qui admet un 24 AWG — la taille 23, 3 A —, par prudence\./.test(l.querySelector('.fi-pb-g').textContent.replace(/\s+/g, ' ')); }),
    '« contact taille 23 supposé (3 A) », et pourquoi, dessous : le plan ne dit pas quel contact est serti au bout de W-015 ; Volta prend le plus petit qui admet un 24 AWG, par prudence');
  ok(await sections() === 'disjoncteur+ fils+' && await texte(sec('disjoncteur') + ' .fs-titre') === 'Calibre' && await q(sec('disjoncteur') + ' .fi-dj[data-disj="102CB1"]') === 3 && await q('.dj-fils .fi-ia[data-i]') === 3 && await q('.fi-tuile') === 0, '« Calibre » (plus « Disjoncteur » : on le sait) — ses trois groupes : le calibre, la courbe, le profil · Câbles ; plus de tuiles', await sections());
  ok(await page.evaluate(() => { const h = document.querySelector('#ba-equip .dj-heros');
    return h.querySelector('.dj-h-cal').textContent === '15A' && h.classList.contains('ok') && !h.querySelector('.dj-verdict-pastille') && !/retest|meilleur|passe/i.test(h.textContent) && !!h.querySelector('.fi-q[data-q="calibre"]')
      && $('dj-retenir').textContent.trim() === 'Automatique' && $('dj-retenir').getAttribute('aria-pressed') === 'true' && !document.querySelector('#ba-equip .dj-chip') && !document.querySelector('#ba-equip [data-pn="*"], #ba-equip .dj-bascule'); }),
    'l’AUTOMATIQUE d’abord : le 15 A en grand, en vert, sans pastille ; « Automatique » pressé ; ni la rangée des calibres, ni le part number, ni les bascules de la courbe');
  await page.click('#ba-equip [data-changer="dj|102CB1"]'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => { const d = disjonctionDe('102CB1'), cs = [...document.querySelectorAll('#ba-equip [data-volet="dj|102CB1"] .dj-chip')]; return cs.length === d.gamme.filter(g => g.valide === true && g.marge).length && cs.every(c => c.classList.contains('ok')) && cs.filter(c => c.getAttribute('aria-pressed') === 'true').map(c => c.dataset.cal).join() === '15' && cs.filter(c => c.classList.contains('ideal')).map(c => c.dataset.cal).join() === '15'; }),
    '« Autre calibre » ouvre les calibres qui PASSENT : le retenu pressé et étoilé');
  await page.click('#ba-equip .dj-chip[data-cal="20"]'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => { const h = document.querySelector('#ba-equip .dj-heros'); return pnDuRepere('102CB1') === 'MS3320-20' && h.querySelector('.dj-h-cal').textContent === '20A' && h.classList.contains('ok') && /Automatique \(15\sA\)/.test($('dj-retenir').textContent) && $('dj-retenir').getAttribute('aria-pressed') !== 'true' && !document.querySelector('#ba-equip [data-volet="dj|102CB1"]'); }),
    'le 20 A retenu à la main (le part number suit : MS3320-20) : il passe ; « Automatique (15 A) » pour revenir au meilleur');
  await page.click('#dj-retenir'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => { const h = document.querySelector('#ba-equip .dj-heros'); return calibreDe('102CB1') === 15 && pnDuRepere('102CB1') === 'MS3320-10' && h.querySelector('.dj-h-cal').textContent === '15A' && document.getElementById('dj-retenir').getAttribute('aria-pressed') === 'true' && h.classList.contains('ok'); }),
    '« Automatique » : le 15 A, le choix de l’outil, en vert (le part number du retest revient) ; le bouton, étoilé, dit qu’il est retenu');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(500); await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => pnDuRepere('102CB1') === 'MS3320-10' && app.cible && app.cible.nom === '102CB1'), 'deux Ctrl+Z : le MS3320-10 du retest, la fiche toujours là');
  // écrire dans le profil refait la fiche EN PLACE : la main reste dans le champ suivant, le calibre suit
  ok(await q(sec('disjoncteur') + ' .dj-etat', 'xs => xs.map(x => x.dataset.k).join()') === 'dem,trans,perm' && await q(sec('disjoncteur') + ' .dj-x', 'xs => xs.map(x => x.dataset.x).join()') === 'dem,trans,perm'
    && /Courant\s*A/.test(await texte('.dj-entete')) && /Durée\s*s/.test(await texte('.dj-entete')) && await q('.dj-champ i') === 0, 'le profil dans l’ordre : démarrage, transition, permanent — chacun son ×, les unités dans l’en-tête (A, s), pas dans les cases');
  await page.click('#ba-equip [data-dj="dem"][data-q="i"]'); await page.fill('#ba-equip [data-dj="dem"][data-q="i"]', '60'); await page.keyboard.press('Tab'); await page.waitForTimeout(900);
  ok(await page.evaluate(() => { const a = document.activeElement; return app.contrat.charges.get('102CB1').dem.i === 60 && !!a && a.dataset.dj === 'dem' && a.dataset.q === 't' && a.closest('#ba-equip') && document.querySelector('#ba-equip .dj-heros').classList.contains('ko') && !!document.querySelector('#ba-equip .dj-etat[data-k="dem"] .dj-verdict.ko'); }),
    '60 A au démarrage, puis Tab : écrit au contrat, la main reste dans le champ suivant (sa durée), et la fiche suit en place — plus aucun calibre ne passe : rouge, la pastille du démarrage aussi');
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
  ok(await genre() === 'À poser · sur 102CB1:2' && /^2 problèmes · 1 point à voir$/.test(await texte('.fi-pb-n')) &&await q(sec('fils') + ' .fs-badge.ko') === 1 && await page.evaluate(() => { const p = document.querySelector('#ba-equip .fi-poser'); return !!p && p.previousElementSibling.id === 'fi-pbs' && $('vt-repere').value === '102VT1' && !!$('vt-poser'); }),
    'à poser sur 102CB1:2 (dans l’en-tête) ; un point à voir (le repère provisoire) et deux problèmes (W-012 et W-015, trop fins sous 102CB1, comptés dans « Câbles ») ; sous les problèmes, « poser au contrat sous 102VT1 »', await genre() + ' · ' + await texte('.fi-pb-n'));
  ok(await faceAPlat('') && await q('.mj-module.corps-ovale') === 1 && await q('.mj-shunt-cadre') === 3 && await q('.mj-shunt-cadre.prise') === 1 && await q(sec('connecteur') + ' .fi-contacts .fi-fil') === 3 && await q(sec('connecteur') + ' .fi-contacts .fi-fil.neuf') === 1, 'la face NSA937901, trois lignes de contact dont le câble à créer');

  console.log('\nune prise de coupure (412VC3B, folio 5) : une seule face');
  await bloc('5', '412VC3B'); await page.waitForTimeout(400);
  ok(!(await genre()) && await q('.fi-tuile') === 0 && await q('[data-pn]') === 0 && /^Connecteur/.test(await texte(sec('connecteur') + ' .fs-titre')) && await sections() === 'connecteur+ fils+', 'ni type, ni tuiles, ni part number ; Connecteur (le raccord dedans), Câbles', await sections());
  ok(await page.evaluate(() => { const r = document.querySelector('#ba-equip details[data-section="connecteur"] .fc'); return r.querySelector('.fc-k').textContent === 'Référence' && /EN3646-002-12-08/.test(r.textContent) && !!r.querySelector('.fi-q[data-q="prise"]') && !/contacts ·/.test(r.textContent); }), 'sa référence : l’arrangement EN3646-002-12-08 et son « ? » — plus de « 7 contacts · fiche femelle » dessous (le lecteur : « on s’en fiche »)');
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
  ok(await genre() === 'Câble' && /^Type=DR \| Gauge=20 \| Longueur=5m \| Intensité=9,31A!$/.test(await tuiles()) && await q('#fil-num') === 1 && await q('.fi-tuile [data-edit]', 'xs => xs.map(x => x.dataset.edit).join()') === 'famille,jauge,longueur' && await q(sec('trajet') + ' [data-edit="route"]') === 1
    && await q('.fi-tuile', 'xs => { const w = xs.map(x => Math.round(x.getBoundingClientRect().width)); return Math.max(...w) - Math.min(...w) <= 1; }') && await q('.fi-tuile-s', 'xs => xs.map(x => x.textContent.replace(/\\s+/g, " ").trim()).join("|")') === 'vérifié|AWG · 0,6 mm²|supposée|sur 6,9 A'
    && await q('.fi-tuile-s', 'xs => xs.every(x => x.scrollWidth <= x.clientWidth + 1)'),
    'l’en-tête « Câble W-012 » et ses quatre tuiles, TOUTES de même largeur (le lecteur : « le type est bien plus grand que la gauge ») — le type (DR, « vérifié » dans la base) et la gauge (20) s’y écrivent chacun à part, la longueur aussi (« supposée » dessous), l’intensité en rouge (la pointe de 9,31 A, sur 6,9 A) ; rien n’y est coupé', await genre() + ' · ' + await tuiles() + ' · ' + await q('.fi-tuile-s', 'xs => xs.map(x => x.textContent.trim()).join("|")'));
  ok(await texte('.fi-identite') === 'DR20 · PUISSANCE · folio 1', 'son identité : « Câble · DR20 · PUISSANCE · folio 1 »', await texte('.fi-identite'));
  ok(await q('.fi-tuile .fi-hyp') === 1 && /^supposée$/.test(await texte('.fi-tuile .fi-hyp')) && await q(sec('fils') + ' .fi-mes .fi-barre') === 2 && await q(sec('fils') + ' .fi-mes .fi-q', 'xs => xs.map(x => x.dataset.q).join()') === 'intensite,chute', 'la longueur d’hypothèse le dit SUR la valeur (« supposée », plus « hyp. ») ; l’intensité et la chute, une barre et un « ? » chacune');
  ok(!/hors normes|Sans part number/i.test(await texte(sec('trajet'))), 'les bouts ne disent rien de ce qu’on ne sait pas (plus de « contact hors normes »)', await texte(sec('trajet')));
  // la chute de la fiche : la valeur seule (la pointe, en petit à côté, se lit à part)
  const chute = () => page.evaluate(() => { const v = [...document.querySelectorAll('#ba-equip .fi-mes')].find(m => /Chute/.test(m.textContent)).querySelector('.fi-mes-v').cloneNode(true); v.querySelectorAll('em').forEach(e => e.remove()); return v.textContent.replace(/\s+/g, ' ').trim(); });
  // UNE vérité (l'audit : « 1,29 V ambre dans la fiche de 102CB1, 1,34 V vert dans celle de W-012 ») : la fiche du câble lit la même chute en ligne que la liste de son disjoncteur
  const dj012 = await page.evaluate(() => { allerAuPlan('1'); choisirBloc(app.dessin.comps.find(k => k.name === '102CB1' && k.kind !== 'tag')); const li = [...document.querySelectorAll('#ba-equip .dj-fils .fi-ia')].find(x => (x.querySelector('.cb-num-ed input') || {}).value === 'W-012'); return li ? li.querySelector('.fi-u').textContent + '|' + li.querySelector('.fi-u').className : ''; });
  await page.evaluate(() => { allerAuPlan('1'); choisirFil(app.dessin.fils.find(w => w.cable === 'W-012')); }); await page.waitForTimeout(400);
  ok(dj012.split('|')[0] === (await chute()).replace(/ \/ .*$/, '') && /^1,29\sV$/.test(dj012.split('|')[0]) && await page.evaluate(() => { const m = [...document.querySelectorAll('#ba-equip .fi-mes')].find(m => /Chute/.test(m.textContent)); return m.classList.contains('ok') && /2,28 V en pointe/.test(m.querySelector('em').textContent.replace(/\s+/g, ' ')) && m.querySelector('em').classList.contains('fi-ko-t') && m.querySelector('em').classList.contains('supp') && getComputedStyle(m.querySelector('.fi-mes-v b')).fontStyle === 'italic'; }),
    'la même chute, partout : 1,29 V dans la fiche de 102CB1 et dans celle de W-012 (le 15 A retenu, sa chute propre) ; la pointe de 2,28 V à côté, de la couleur de sa mesure (au-delà des 2 V : rouge) ; l’une et l’autre en italique — des longueurs supposées (l’audit, P2-3 et P2-4)', dj012 + ' · ' + await chute());
  // le plus fin qui tient (le parcours : « le plus fin qui tient : 16 AWG, en un clic »)
  ok(await page.evaluate(() => { const r = document.querySelector('#ba-equip details[data-section="fils"] .fi-reparer-l'), b = r && r.querySelector('.fi-reparer[data-reparer]'); return !!b && /Le plus fin qui suit le 15 A de 102CB1 : DR12 \(12 AWG\)/.test(r.textContent.replace(/\s+/g, ' ')) && b.textContent.trim() === 'Passer en DR12' && b.dataset.type === 'DR12'; }),
    'sous l’intensité et la chute, « Le plus fin qui suit le 15 A de 102CB1 : DR12 (12 AWG) » et « Passer en DR12 »');
  const nF = await page.evaluate(() => app.hist.length); await page.click('#ba-equip .fi-reparer[data-reparer]'); await page.waitForTimeout(800);
  ok(await page.evaluate(n => app.cible.type === 'fil' && app.cible.l.type === 'DR12' && app.hist.length === n + 1, nF), 'un clic : W-012 passe en DR12 (une entrée d’historique), la fiche reste sur lui');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => verite().find(l => l.cable === 'W-012').type === 'DR20' && app.cible && app.cible.type === 'fil'), 'Ctrl+Z rend le DR20');
  const du0 = await chute();
  await page.fill('#ba-equip [data-edit="longueur"]', '7,5'); await page.press('#ba-equip [data-edit="longueur"]', 'Enter'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => app.cible.l.longueur === 7.5 && !document.querySelector('#ba-equip .fi-tuile .orig-main, #ba-equip .fs-auto') && !document.querySelector('#ba-equip .fi-tuile .fi-hyp')) && (await chute()) !== du0,
    'la longueur écrite dans sa tuile (7,5 m) : plus « supposée », la chute se refait — ni pastille ni ↺', du0 + ' → ' + await chute());
  await page.fill('#ba-equip [data-edit="longueur"]', ''); await page.press('#ba-equip [data-edit="longueur"]', 'Enter'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => app.cible.l.longueur == null && !!document.querySelector('#ba-equip .fi-tuile .fi-hyp')), 'vidée, la longueur redevient l’hypothèse (« supposée »)');
  await page.fill('#fil-num', 'W-012B'); await page.press('#fil-num', 'Enter'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => verite().some(l => l.cable === 'W-012B') && $('fil-num').value === 'W-012B'), 'le numéro se change dans l’en-tête');
  await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
  ok(await page.evaluate(() => verite().some(l => l.cable === 'W-012') && app.cible && app.cible.type === 'fil' && app.cible.l.cable === 'W-012' && !$('inspecteur').hidden), 'Ctrl+Z rend W-012, et la fiche reste ouverte sur lui');

  // les hypothèses de la simulation : la pastille « supposée » de la fiche mène à leur fiche ; une tension changée rejuge la chute admise
  console.log('\nles hypothèses de la simulation, depuis la fiche du câble');
  // la chute admise : la règle du lecteur (octobre 2026), 2 V en continu et en monophasé, 4 V en triphasé — avant, la table Réseau (1 V sous 28 V)
  ok(await q('.fi-hyp[data-hyp]') >= 1 && /\/ 2 V$/.test(await chute()), 'la fiche de W-012 a la pastille « supposée » en lien, et 2 V admis (la règle du lecteur)', await chute());
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
  // supprimer ne demande plus rien (plus de confirm()) : c'est fait, « Rétablir » dans le message, Ctrl+Z aussi
  let dialogue = 0; page.on('dialog', d => { dialogue++; d.dismiss().catch(() => {}); });
  await page.click('#fi-menu'); await page.waitForTimeout(250); await page.click('#eq-del'); await page.waitForTimeout(800);
  ok(!dialogue && await page.evaluate(() => { const t = $('toast'), b = t.querySelector('.toast-voir'); return !verite().some(l => l.de === '103RL1' || l.vers === '103RL1') && t.classList.contains('on') && /103RL1 supprimé/.test(t.textContent) && !!b && b.textContent === 'Rétablir'; }),
    'supprimer 103RL1 (le « ⋯ ») : aucune boîte du navigateur — c’est fait, et le message offre « Rétablir »', await page.evaluate(() => $('toast').textContent));
  await page.click('#toast .toast-voir'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => verite().some(l => l.vers === '103RL1') && app.cible && app.cible.nom === '103RL1' && !$('inspecteur').hidden), '« Rétablir » : 103RL1 revient, sa fiche rouverte');
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
