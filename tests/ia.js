/* ===========================================================================
   L'IA INTERNE (08-ia) — le réglage, « Tester la connexion », le moteur d'appel ; contre l'IA factice (tests/ia-factice.js),
   à la vraie souris dans Chromium, la page ouverte en file:// comme chez le lecteur.
       NODE_PATH=$(npm root -g) node tests/ia.js
     0. LES SOURCES : un seul appel réseau dans src/, le fetch de `appelIA` — aucun autre fetch, XMLHttpRequest, sendBeacon,
        WebSocket ni EventSource, hors des URL blob: et data: ;
     1. LE RÉGLAGE : ⋮ › Plus › « IA interne » (après les lectures PDF et Visio, son état dessous) et la palette l'ouvrent ;
        trois champs, la clé masquée et son œil ; gardés dans localStorage, jamais dans le HTML ; l'interrupteur coupe tout ;
     2. TESTER LA CONNEXION, chaque diagnostic : prête (le temps, le modèle, les images, ce qu'elle lit d'un coup), pas
        d'adresse, injoignable, connexion coupée, refusée par le navigateur (le CORS, et la demande à copier), clé refusée,
        modèle inconnu (choisir un modèle annoncé reteste), modèle à choisir, aveugle (deux façons), contexte par un essai
        prudent, sa limite dite, panne, occupée, /v1 oublié ;
     3. LE MOTEUR : le JSON validé (mal formé : redemandé une fois, en le disant), le 429 respecté, les nouvelles tentatives à
        attente croissante, une ou deux demandes à la fois, l'arrêt et la reprise, une lecture coupée (la page rechargée)
        qui reprend où elle en était, le temps restant estimé ;
     4. LA CLÉ NULLE PART : ni dans un export (Excel corrigé, suivi, LPA, SVG, PNG, dossier PDF, Visio, bilan) — ni l'adresse,
        ni le modèle —, ni dans une autre case de localStorage, ni dans IndexedDB, ni dans le HTML de la page ;
     5. L'ŒIL du réglage, clair et sombre, 1440 et 1920 : rien de coupé, rien qui chevauche, rien qui sort.
   ========================================================================= */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), net = require('net');
const { fichierDemande } = require('./pilote');
const { demarrer, CLE_FACTICE } = require('./ia-factice');
const FICHIER = fichierDemande();
const R = [], ok = (n, c, d) => R.push((c ? '  ok   ' : '  KO   ') + n + (c || !d ? '' : '   ← ' + String(d).slice(0, 500)));
const attendre = ms => new Promise(r => setTimeout(r, ms));
const portLibre = () => new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const ORDRE = ['adresse', 'navigateur', 'cle', 'modele', 'repond', 'images', 'contexte'];

/* ---- 0. LES SOURCES : où VOLTA touche le réseau ---- */
function appelsReseau() { const SRC = path.join(__dirname, '..', 'src'), out = [];
  const motifs = [/\bfetch\s*\(/g, /\bnew\s+XMLHttpRequest\b/g, /\bXMLHttpRequest\s*\(/g, /\bXMLHttpRequest\.prototype\b/g, /=\s*(?:window\.|self\.|globalThis\.)?fetch\b(?!\s*\()/g,
    /\bsendBeacon\s*\(/g, /\bnew\s+WebSocket\s*\(/g, /\bnew\s+EventSource\s*\(/g, /\bimportScripts\s*\(/g];
  for (const f of fs.readdirSync(SRC).filter(x => /\.(js|html|css)$/.test(x))) { const t = fs.readFileSync(path.join(SRC, f), 'utf8');
    for (const re of motifs) { re.lastIndex = 0; let m; while ((m = re.exec(t))) { const avant = t.slice(0, m.index), suite = t.slice(m.index + m[0].length, m.index + m[0].length + 80);
      const fns = [...avant.matchAll(/function\s+([\w$À-ÿ]+)\s*\(/g)], fn = fns.length ? fns[fns.length - 1][1] : '';
      out.push({ f, ligne: avant.split('\n').length, motif: m[0].trim(), fn, versBlob: /^\s*(['"`](?:blob|data):|URL\.createObjectURL\()/.test(suite) }); } } }
  return out; }

/* ---- L'œil, la règle de tests/ecran/oeil.js, sur une boîte : texte coupé (en largeur, en hauteur), chevauchements, ce qui sort ---- */
function examinerDansLaPage(sel) { const racine = document.querySelector(sel), out = []; if (!racine) return ['introuvable : ' + sel];
  document.getAnimations().forEach(a => { try { const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null; if (t && isFinite(t.endTime)) a.finish(); } catch (_) { } });
  // la tête d'un document reste collée en haut : ce qui défile passe dessous, caché — on ne juge que ce qui se voit
  const tete = racine.querySelector('.fiche-tete'), basTete = tete && getComputedStyle(tete).position === 'sticky' ? tete.getBoundingClientRect().bottom : null;
  const boite = e => { let r = e.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0) return null; let x0 = r.left, y0 = r.top, x1 = r.right, y1 = r.bottom;
    if (basTete != null && !e.closest('.fiche-tete') && e.closest('#fiche-corps')) y0 = Math.max(y0, basTete);
    if (y1 - y0 < 2) return null;
    if (e.closest('details:not([open])') && !e.closest('summary')) return null;
    for (let a = e; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return null;
      if (a !== e && (s.overflow !== 'visible' || s.overflowX !== 'visible' || s.overflowY !== 'visible')) { const q = a.getBoundingClientRect(); x0 = Math.max(x0, q.left); y0 = Math.max(y0, q.top); x1 = Math.min(x1, q.right); y1 = Math.min(y1, q.bottom); }
      if (x1 - x0 < 2 || y1 - y0 < 2) return null; }
    return { left: x0, top: y0, right: x1, bottom: y1 }; };
  const vu = e => !!boite(e), dire = q => { if (out.length < 60) out.push(q); };
  racine.querySelectorAll('*').forEach(e => { if (!vu(e) || !e.childNodes.length || e.closest('svg') || e.tagName === 'INPUT') return; const s = getComputedStyle(e);
    const texte = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!texte) return;
    if ((s.textOverflow === 'ellipsis' || s.overflow === 'hidden' || s.overflowX === 'hidden') && e.scrollWidth > e.clientWidth + 1) dire('texte coupé : « ' + e.textContent.trim().slice(0, 50) + ' »');
    const coupeY = s.overflowY === 'hidden' || s.overflowY === 'clip'; if (coupeY && e.clientHeight >= 6 && e.scrollHeight > e.clientHeight + 2) dire('texte coupé en hauteur : « ' + e.textContent.trim().slice(0, 50) + ' »'); });
  const feuilles = [...racine.querySelectorAll('span, b, small, strong, em, i, h1, h2, h3, h4, p, label, button, td, th, li, kbd')].filter(e => vu(e) && !e.closest('svg') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && ![...e.children].length);
  const B = feuilles.filter(e => e.getClientRects().length <= 1).map(e => ({ e, r: boite(e) })).filter(x => x.r);
  for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) { const a = B[i].r, c = B[j].r, x = Math.min(a.right, c.right) - Math.max(a.left, c.left), y = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
    if (x > 3 && y > 3 && !B[i].e.contains(B[j].e) && !B[j].e.contains(B[i].e)) dire('chevauchement : « ' + B[i].e.textContent.trim().slice(0, 30) + ' » / « ' + B[j].e.textContent.trim().slice(0, 30) + ' »'); }
  const cadre = racine.getBoundingClientRect();
  racine.querySelectorAll('h2, h3, button, input, .ia-e-v, .ia-puce').forEach(e => { if (!vu(e)) return; const r = e.getBoundingClientRect(); if (r.right > cadre.right + 2 || r.left < cadre.left - 2) dire('sort du document : « ' + (e.textContent || e.id).trim().slice(0, 40) + ' »'); });
  return out; }

(async () => {
  /* ---- 0. les sources ---- */
  const appels = appelsReseau(), reseau = appels.filter(a => !a.versBlob);
  ok('un seul appel réseau dans src/ : le fetch de `appelIA` (08-ia.js) — aucun autre fetch, XMLHttpRequest, sendBeacon, WebSocket, EventSource ni importScripts, hors blob: et data:',
    reseau.length === 1 && reseau[0].f === '08-ia.js' && reseau[0].fn === 'appelIA' && /^fetch/.test(reseau[0].motif), JSON.stringify(reseau));

  const F = await demarrer(0), FERME = await portLibre();
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const erreurs = [];
  const nouvellePage = async (o = {}) => { const ctx = await nav.newContext({ viewport: { width: o.l || 1440, height: o.h || 900 }, colorScheme: o.sombre ? 'dark' : 'light' });
    const page = await ctx.newPage(); page.setDefaultTimeout(90000); page.on('pageerror', e => erreurs.push(e.message));
    await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined' && typeof BIB !== 'undefined' && BIB.pret && typeof IA !== 'undefined', null, { timeout: 120000 });
    if (o.sombre != null) await page.evaluate(t => { document.documentElement.dataset.theme = t; }, o.sombre ? 'dark' : 'light');
    return { ctx, page }; };
  const { ctx, page } = await nouvellePage();
  const ev = (f, a) => page.evaluate(f, a);
  // ce que l'IA factice « voit » : les dessins mêmes de VOLTA, un par chiffre (le même navigateur les refait à l'identique)
  F.chiffres(await ev(async () => { const o = {}; for (let d = 0; d < 10; d++) o[await imageChiffreIA(d)] = d; return o; }));
  await ev(() => atelier.exemple()); await attendre(1500); await ev(() => { IA.attenteBase = 60; });

  /* ---- 1. le réglage ---- */
  await page.click('#btnMenu'); await attendre(200); await page.click('#menu [data-sous="plus"]'); await attendre(300);
  const M = await ev(() => { const b = document.querySelector('#mp-plus [data-act="ia"]'), p = b && b.previousElementSibling, l = b && b.querySelector('.menu-l');
    return b ? { mot: l.childNodes[0].textContent.trim(), sous: l.querySelector('small').textContent, apres: p && p.dataset.act, visible: !!b.offsetParent, aide: b.dataset.aide } : null; });
  ok('⋮ › Plus porte « IA interne », juste après les lectures PDF et Visio ; dessous, son état (« à régler ») ; sa bulle dit à quoi elle sert',
    M && M.mot === 'IA interne' && M.apres === 'visio' && M.sous === 'à régler' && M.visible && /ne comprend pas seul/.test(M.aide), JSON.stringify(M));
  await page.click('#mp-plus [data-act="ia"]'); await attendre(450);
  const D = await ev(() => ({ mode: $('fiche').dataset.mode, sur: document.querySelector('#fiche .fiche-tete .sur').textContent, titre: document.querySelector('#fiche .fiche-tete .titre').textContent,
    champs: ['ia-adresse', 'ia-modele', 'ia-cle'].map(id => !!$(id) && $(id).value === ''), type: $('ia-cle').type, inter: $('ia-actif').checked, chapeau: document.querySelector('.ia-chapeau').textContent,
    carte: !!document.querySelector('#fiche-corps > .hy-groupe#ia-connexion'), clavier: document.activeElement === document.querySelector('#fiche .fiche-tete .titre'), pied: $('ia-etat').textContent }));
  ok('le réglage s’ouvre comme les Hypothèses : « Réglages · IA interne », une carte titrée, trois champs vides, la clé masquée, l’interrupteur allumé, le clavier sur son titre',
    D.mode === 'ia' && /Réglages/i.test(D.sur) && D.titre === 'IA interne' && D.carte && D.champs.every(Boolean) && D.type === 'password' && D.inter && D.clavier, JSON.stringify(D));
  ok('une phrase dit à quoi sert l’IA et ce qui lui est envoyé : des morceaux des documents à lire, quand VOLTA ne comprend pas seul — et rien d’autre',
    /ne comprend pas seul/.test(D.chapeau) && /morceaux/.test(D.chapeau) && /rien d.autre/.test(D.chapeau) && /À régler/.test(D.pied), D.chapeau + ' | ' + D.pied);
  await page.keyboard.press('Escape'); await attendre(300);
  await page.keyboard.press('Control+k'); await attendre(300); await page.keyboard.type('ia'); await attendre(300);
  const P = await ev(() => { const l = document.querySelector('#pa-liste .pa-l.on') || document.querySelector('#pa-liste .pa-l'); return l ? l.textContent : ''; });
  ok('la palette trouve « IA interne » au mot « ia », en première ligne ; Entrée l’ouvre', /IA interne/.test(P), P);
  await page.keyboard.press('Enter'); await attendre(450);
  ok('… et le réglage est ouvert', await ev(() => app.fiche && app.fiche.mode === 'ia'));
  // « / » ouvre aussi la palette (la recherche des actions)
  await page.keyboard.press('Escape'); await attendre(250); await page.keyboard.press('/'); await attendre(300); await page.keyboard.type('connexion'); await attendre(300);
  const P2 = await ev(() => { const l = document.querySelector('#pa-liste .pa-l'); return l ? l.textContent : ''; });
  ok('« / » puis « connexion » trouve aussi « IA interne »', /IA interne/.test(P2), P2);
  await page.keyboard.press('Enter'); await attendre(450);
  // les champs : une adresse collée avec /chat/completions garde sa base
  await page.fill('#ia-adresse', F.adresse('ok') + '/chat/completions'); await page.press('#ia-adresse', 'Tab'); await attendre(200);
  await page.fill('#ia-modele', 'modele-factice'); await page.fill('#ia-cle', CLE_FACTICE); await page.press('#ia-cle', 'Tab'); await attendre(450);
  const S = await ev(() => ({ adr: $('ia-adresse').value, aide: $('ia-adresse-aide').textContent, ls: localStorage.getItem('volta.ia.reglage'), html: document.documentElement.outerHTML, menu: $('mn-ia').textContent, pied: $('ia-etat').textContent }));
  const Sl = JSON.parse(S.ls || '{}');
  ok('une adresse collée avec /chat/completions garde sa base, et VOLTA le dit sous le champ', S.adr === F.adresse('ok') && /adresse de base/.test(S.aide), S.adr + ' | ' + S.aide);
  ok('l’adresse, le modèle et la clé sont gardés dans ce navigateur (localStorage) ; le pied dit « À tester »', Sl.adresse === F.adresse('ok') && Sl.modele === 'modele-factice' && Sl.cle === CLE_FACTICE && /À tester/.test(S.pied) && S.menu === 'à tester', S.ls + ' | ' + S.pied + ' | ' + S.menu);
  ok('ni la clé ni l’adresse dans le HTML de la page (les champs reçoivent leur valeur par propriété)', !S.html.includes(CLE_FACTICE) && !S.html.includes(F.adresse('ok')));
  await page.click('#ia-oeil'); await attendre(100);
  const O1 = await ev(() => ({ type: $('ia-cle').type, presse: $('ia-oeil').getAttribute('aria-pressed'), html: document.documentElement.outerHTML.includes($('ia-cle').value) }));
  await page.click('#ia-oeil'); await attendre(100);
  const O2 = await ev(() => ({ type: $('ia-cle').type, presse: $('ia-oeil').getAttribute('aria-pressed') }));
  ok('l’œil montre la clé (toujours hors du HTML), puis la masque', O1.type === 'text' && O1.presse === 'true' && !O1.html && O2.type === 'password' && O2.presse === 'false', JSON.stringify([O1, O2]));
  // l'interrupteur coupe tout
  const total = sc => { const E = F.etat(sc); return E.questions + E.listes + E.sondes + E.prevols; }, avant = total('ok');
  await page.click('label.ia-inter'); await attendre(250);
  const C = await ev(async () => { const g = async f => { try { await f(); return 'parti'; } catch (e) { return e.genre; } };
    return { appel: await g(() => appelIA([{ role: 'user', content: 'Bonjour' }])), demande: await g(() => demanderIA([{ role: 'user', content: 'Bonjour' }])), eteint: $('ia-tester').disabled,
      pied: $('ia-etat').textContent, menu: $('mn-ia').textContent, garde: JSON.parse(localStorage.getItem('volta.ia.reglage')).actif }; });
  await attendre(300);
  ok('l’interrupteur coupé : rien ne part (appelIA et demanderIA refusent aussitôt, l’IA factice ne reçoit rien), « Tester » s’éteint, le pied dit « Coupée »',
    C.appel === 'coupee' && C.demande === 'coupee' && total('ok') === avant && C.eteint && /Coupée/.test(C.pied) && C.menu === 'coupée' && C.garde === false, JSON.stringify(C));
  await page.click('label.ia-inter'); await attendre(250);

  /* ---- 2. tester la connexion : chaque diagnostic ---- */
  const diag = r => ev(async r => { Object.assign(IA.reglage, r); garderReglageIA(); IA.diag = null; IA.capacites = null; IA.bloque = null; garderMesureIA(); if (ficheIAOuverte()) { remplirChampsIA(); rendreEtatIA(); }
    await testerIA(); const D = IA.diag || { lignes: [] };
    return { ok: D.ok, cap: IA.capacites, lignes: D.lignes.map(x => ({ k: x.k, etat: x.etat, titre: x.titre, valeur: x.valeur || '', faire: x.faire || '', geste: x.geste || '', choix: x.choix || [], bulle: x.bulle || '' })),
      pied: ($('ia-etat') || {}).textContent || '', menu: ($('mn-ia') || {}).textContent || '', dom: [...document.querySelectorAll('#ia-diag .ia-e')].map(e => e.className.replace(/\s+/g, ' ') + ' | ' + e.textContent.replace(/\s+/g, ' ').trim()),
      adresse: IA.reglage.adresse }; }, r);
  const L = (d, k) => d.lignes.find(x => x.k === k) || {};
  const voir = d => JSON.stringify(d.lignes.map(x => [x.k, x.etat, x.titre, x.valeur])) + ' | ' + d.pied;
  const bon = { modele: 'modele-factice', cle: CLE_FACTICE };
  let d = await diag({ adresse: F.adresse('ok'), ...bon });
  ok('PRÊTE : les sept étapes passent — l’adresse, le navigateur, la clé, le modèle, la réponse, les images, ce qu’elle lit d’un coup — et se lisent dans le document',
    d.ok && ORDRE.every((k, i) => d.lignes[i] && d.lignes[i].k === k && ['ok', 'info'].includes(d.lignes[i].etat)) && d.dom.length === 7, voir(d));
  ok('… la réponse dit son temps et le nom du modèle (celui que l’IA rend)', /^en \d+([,]\d)? (ms|s)$/.test(L(d, 'repond').valeur) && L(d, 'modele').valeur === 'modele-factice' && d.cap.latence >= 0 && d.cap.modele === 'modele-factice', voir(d));
  const vues = F.etat('ok').journal.filter(q => JSON.stringify(q.messages).includes('image_url')), urls = new Set(vues.map(q => JSON.stringify(q.messages).match(/data:image\/png;base64,[^"]+/)[0]));
  ok('… elle voit les images : un chiffre dessiné (une image_url en data URL), lu, puis un second, différent, lu aussi — « oui »', d.cap.vision === true && L(d, 'images').etat === 'ok' && vues.length === 2 && urls.size === 2, vues.length + ' images, ' + urls.size + ' différentes');
  ok('… ce qu’elle lit d’un coup, annoncé par /v1/models : 32 768 jetons, « ≈ 47 pages de texte » (la bulle dit les jetons)', d.cap.contexte === 32768 && d.cap.contexteSur === 'annonce' && /47 pages/.test(L(d, 'contexte').valeur) && /32\s768 jetons/.test(L(d, 'contexte').bulle), voir(d));
  ok('… le pied dit « Prête · voit les images », le menu « prête »', /Prête · voit les images/.test(d.pied) && d.menu === 'prête', d.pied + ' | ' + d.menu);
  ok('… aucune question n’a de rôle « system » (des modèles de sa famille le refusent)', F.etat('ok').journal.every(q => q.messages.every(m => m.role !== 'system')));
  d = await diag({ adresse: '', ...bon });
  ok('PAS D’ADRESSE : dit tout de suite, sans un appel, avec le geste « Corriger l’adresse »', !d.ok && L(d, 'adresse').etat === 'ko' && L(d, 'adresse').geste === 'adresse' && d.lignes.length === 1, voir(d));
  d = await diag({ adresse: 'http://127.0.0.1:' + FERME + '/v1', ...bon });
  ok('INJOIGNABLE (rien n’écoute) : « Adresse injoignable », ce qu’il faut vérifier, et comment trancher (/models dans Chrome)', !d.ok && L(d, 'adresse').etat === 'ko' && /injoignable/.test(L(d, 'adresse').titre) && /\/models/.test(L(d, 'adresse').faire) && d.lignes.length === 1, voir(d));
  d = await diag({ adresse: F.adresse('coupe'), ...bon });
  ok('INJOIGNABLE (la connexion coupée net) : de même', !d.ok && L(d, 'adresse').etat === 'ko' && /injoignable/.test(L(d, 'adresse').titre), voir(d));
  d = await diag({ adresse: F.adresse('cors'), ...bon });
  ok('REFUSÉE PAR LE NAVIGATEUR (le CORS) : l’adresse répond (la sonde le prouve), Chrome bloque — l’origine « null », Access-Control-Allow-Origin: *',
    !d.ok && L(d, 'adresse').etat === 'ok' && L(d, 'navigateur').etat === 'ko' && /null/.test(L(d, 'navigateur').faire) && /Access-Control-Allow-Origin: \*/.test(L(d, 'navigateur').faire) && L(d, 'navigateur').geste === 'cors' && F.etat('cors').sondes >= 1, voir(d));
  const copie = await ev(() => { let t = ''; const av = copierIA; copierIA = (x, f) => { t = x; f(true); }; try { document.querySelector('#ia-diag [data-ia-geste="cors"]').click(); } finally { copierIA = av; } return t; });
  ok('… « Copier la demande pour l’équipe de l’IA » : ce qu’il faut autoriser, exactement (origine null ou *, Authorization, Content-Type, OPTIONS), l’adresse, jamais la clé',
    /Access-Control-Allow-Origin: \*/.test(copie) && /null/.test(copie) && /Authorization, Content-Type/.test(copie) && /OPTIONS/.test(copie) && copie.includes(F.adresse('cors')) && !copie.includes(CLE_FACTICE), copie.slice(0, 300));
  d = await diag({ adresse: F.adresse('ok'), modele: 'modele-factice', cle: 'une-mauvaise-cle' });
  ok('CLÉ REFUSÉE (401) : « Clé refusée », l’erreur, ce qu’il faut faire, le geste « Corriger la clé »', !d.ok && L(d, 'cle').etat === 'ko' && /401/.test(L(d, 'cle').faire) && L(d, 'cle').geste === 'cle', voir(d));
  ok('… et le message d’erreur ne cite jamais la clé', !JSON.stringify(d.lignes).includes('une-mauvaise-cle'));
  d = await diag({ adresse: F.adresse('ok'), modele: 'modele-qui-n-existe-pas', cle: CLE_FACTICE });
  ok('MODÈLE INCONNU : dit, et les modèles que l’IA annonce, à choisir', !d.ok && L(d, 'modele').etat === 'ko' && L(d, 'modele').choix.join() === 'modele-factice,modele-factice-leger', voir(d));
  await page.click('#ia-diag [data-ia-modele="modele-factice"]'); await page.waitForFunction(() => !IA.test && IA.diag && IA.diag.lignes.length > 4, null, { timeout: 30000 });
  const choisi = await ev(() => ({ ok: IA.diag.ok, modele: IA.reglage.modele, champ: $('ia-modele').value }));
  ok('… un clic sur l’un d’eux l’écrit et reteste aussitôt : prête', choisi.ok && choisi.modele === 'modele-factice' && choisi.champ === 'modele-factice', JSON.stringify(choisi));
  d = await diag({ adresse: F.adresse('ok'), modele: '', cle: CLE_FACTICE });
  ok('MODÈLE À CHOISIR (aucun écrit, deux annoncés) : l’état « à voir », les deux à choisir ; le pied « À régler : son modèle »', !d.ok && L(d, 'modele').etat === 'att' && L(d, 'modele').choix.length === 2 && /son modèle/.test(d.pied), voir(d));
  d = await diag({ adresse: F.adresse('aveugle'), ...bon });
  ok('AVEUGLE (il refuse les images) : « Elle ne voit pas les images », calme (une information), « refusée » ; VOLTA ne lui enverra que du texte', d.ok && L(d, 'images').etat === 'info' && L(d, 'images').valeur === 'refusée' && /que du texte/.test(L(d, 'images').faire) && d.cap.vision === false && /texte seul/.test(d.pied), voir(d));
  d = await diag({ adresse: F.adresse('aveugle-muet'), ...bon });
  ok('AVEUGLE (il prend l’image, mais ne lit rien) : non, et ce qu’il a répondu', d.ok && L(d, 'images').etat === 'info' && /Je ne vois aucune image/.test(L(d, 'images').valeur) && d.cap.vision === false, voir(d));
  d = await diag({ adresse: F.adresse('sans-liste'), ...bon });
  ok('SANS /v1/models : ce qu’elle lit d’un coup se mesure par un essai prudent — « au moins ≈ 9 pages » (les jetons que l’IA a comptés)', d.ok && d.cap.contexteSur === 'essai' && d.cap.contexte > 5000 && /au moins ≈ 9 pages/.test(L(d, 'contexte').valeur), voir(d));
  d = await diag({ adresse: F.adresse('sans-liste+petit-contexte'), ...bon });
  ok('… et quand elle refuse l’essai en disant sa limite : 4 096 jetons, « ≈ 6 pages de texte »', d.ok && d.cap.contexteSur === 'limite' && d.cap.contexte === 4096 && /≈ 6 pages/.test(L(d, 'contexte').valeur), voir(d));
  d = await diag({ adresse: F.adresse('panne'), ...bon });
  ok('PANNE (503) : « En panne de son côté », réessayer plus tard, prévenir l’équipe si cela dure', !d.ok && L(d, 'repond').etat === 'ko' && /503/.test(L(d, 'repond').faire) && /panne/i.test(L(d, 'repond').titre), voir(d));
  d = await diag({ adresse: F.adresse('occupe'), ...bon });
  ok('OCCUPÉE (429) : dit, avec ce qu’il faut faire', !d.ok && L(d, 'repond').etat === 'ko' && /429/.test(L(d, 'repond').faire) && /Occupée/.test(L(d, 'repond').titre), voir(d));
  d = await diag({ adresse: F.adresse('ok').replace(/\/v1$/, ''), ...bon });
  ok('/v1 OUBLIÉ : VOLTA le trouve, l’ajoute à l’adresse et le dit (la bulle de l’étape)', d.ok && /\/ok\/v1$/.test(d.adresse) && /\/v1/.test(L(d, 'adresse').bulle), d.adresse + ' | ' + voir(d));

  /* ---- 3. le moteur ---- */
  const regle = sc => ev(a => { Object.assign(IA.reglage, { adresse: a, modele: 'modele-factice', cle: IA.reglage.cle || '' }); reglageChangeIA('adresse'); }, F.adresse(sc));
  await ev(k => { IA.reglage.cle = k; }, CLE_FACTICE);
  await regle('json-casse');
  const J = await ev(() => demanderIA([{ role: 'user', content: 'Donne le JSON de la demande n°5.' }], { json: true, schema: { type: 'objet', requis: ['ok', 'n'] } }));
  const EJ = F.etat('json-casse'), q2 = EJ.journal[1] || { messages: [] }, dernier = q2.messages[q2.messages.length - 1] || {}, rep1 = q2.messages.find(m => m.role === 'assistant') || {};
  ok('JSON MAL FORMÉ : VOLTA redemande une fois, en le disant (sa réponse, puis « n’est pas un JSON valide »), et rend la bonne (validée, sans les balises de code)',
    J.json && J.json.n === 5 && J.redemande === true && EJ.questions === 2 && /n.est pas un JSON valide/.test(dernier.content) && /"liaisons"/.test(rep1.content || ''), JSON.stringify({ J, n: EJ.questions, dernier }));
  ok('… la consigne JSON va dans le message de l’utilisateur, jamais dans un rôle « system »', EJ.journal.every(q => q.messages.every(m => m.role !== 'system')) && /JSON valide/.test(EJ.journal[0].messages[0].content));
  await regle('json-casse-toujours');
  const J2 = await ev(async () => { try { await demanderIA([{ role: 'user', content: 'Donne le JSON de la demande n°6.' }], { json: true }); return 'rendu'; } catch (e) { return e.genre; } });
  ok('… mal formé deux fois : la demande échoue (« json »), sans troisième essai', J2 === 'json' && F.etat('json-casse-toujours').questions === 2, J2 + ' / ' + F.etat('json-casse-toujours').questions);
  await regle('occupe-2');
  const T4 = await ev(async () => { const r = await demanderIA([{ role: 'user', content: 'Bonjour' }]); return r.texte; });
  const E4 = F.etat('occupe-2'), g4 = E4.instants.slice(1).map((t, i) => t - E4.instants[i]);
  ok('429 RESPECTÉ : VOLTA attend ce que dit Retry-After (1 s) avant chaque nouvel essai, puis passe', E4.questions === 3 && g4.every(x => x >= 1000) && !!T4, JSON.stringify(g4));
  await regle('panne-3');
  const T5 = await ev(async () => (await demanderIA([{ role: 'user', content: 'Bonjour' }])).essais);
  const E5 = F.etat('panne-3'), g5 = E5.instants.slice(1).map((t, i) => t - E5.instants[i]);
  ok('PANNE PASSAGÈRE (503 trois fois) : nouvelles tentatives à attente croissante, puis la réponse (4 essais)', E5.questions === 4 && g5[1] > g5[0] && g5[2] > g5[1] && T5 === 4, JSON.stringify(g5) + ' / ' + T5);
  const enParallele = (n, sc) => ev(async ({ n, a }) => { IA.reglage.parallele = n; IA.reglage.adresse = a; reglageChangeIA('parallele');
    const rs = await Promise.all(Array.from({ length: 6 }, (_, k) => demanderIA([{ role: 'user', content: 'Donne le JSON de la demande n°' + k + '.' }], { json: true }))); return rs.map(r => r.json.n).join(); }, { n, a: F.adresse(sc) });
  const P6 = await enParallele(2, 'lent-250');
  ok('DEUX À LA FOIS : jamais plus de deux en vol, et chacune rend la sienne', F.etat('lent-250').maxEnVol === 2 && P6 === '0,1,2,3,4,5', F.etat('lent-250').maxEnVol + ' / ' + P6);
  const P1 = await enParallele(1, 'lent-251');
  ok('UNE À LA FOIS : une seule en vol', F.etat('lent-251').maxEnVol === 1 && P1 === '0,1,2,3,4,5', F.etat('lent-251').maxEnVol + ' / ' + P1);
  // l'arrêt et la reprise d'une lecture
  const lot = (id, sc, n, titre) => ev(async ({ id, a, n, titre }) => { IA.reglage.parallele = 2; IA.reglage.adresse = a; reglageChangeIA('adresse');
    return lireEnFondIA({ lot: id, titre, genre: 'essai', demandes: Array.from({ length: n }, (_, k) => ({ rang: k, messages: [{ role: 'user', content: 'Donne le JSON de la page n°' + k + '.' }], options: { json: true } })) }); }, { id, a: F.adresse(sc), n, titre });
  await lot('essai-arret', 'lent-300', 8, 'Essai d’arrêt');
  await page.waitForFunction(() => avancementIA('essai-arret').faites >= 2, null, { timeout: 30000 });
  await ev(() => arreterIA()); await attendre(150); const n1 = F.etat('lent-300').questions; await attendre(900); const n2 = F.etat('lent-300').questions;
  const A1 = await ev(() => ({ ...avancementIA('essai-arret'), lot: IA.lots.get('essai-arret').etat }));
  ok('« ARRÊTER » : les demandes en vol sont rendues à la file, plus rien ne part', n1 === n2 && A1.etat === 'arretee' && A1.enCours === 0 && A1.lot === 'arrete' && F.etat('lent-300').enVol === 0, JSON.stringify(A1) + ' / ' + n1 + ' → ' + n2);
  await ev(() => reprendreIA());
  await page.waitForFunction(() => { const a = avancementIA('essai-arret'); return a.total === 8 && a.faites + a.echecs === 8; }, null, { timeout: 30000 });
  const RA = await ev(() => resultatsIA('essai-arret'));
  ok('« REPRENDRE » : la lecture finit, chaque page a sa réponse, dans l’ordre (gardées dans IndexedDB)', RA.length === 8 && RA.every((x, k) => x.rang === k && x.etat === 'faite' && x.reponse && x.reponse.json && x.reponse.json.n === k), JSON.stringify(RA.map(x => [x.rang, x.etat, x.reponse && x.reponse.json && x.reponse.json.n])));
  await ev(() => oublierLotIA('essai-arret'));
  // une lecture coupée (la page rechargée) reprend où elle en était
  await lot('essai-coupure', 'lent-200', 12, 'Lecture de « essai-300-pages.pdf »');
  await page.waitForFunction(() => avancementIA('essai-coupure').faites >= 5, null, { timeout: 30000 });
  const estime = await ev(() => avancementIA('essai-coupure'));
  const finies = await ev(async () => (await resultatsIA('essai-coupure')).filter(x => x.etat === 'faite').map(x => x.rang));
  const qAvant = F.etat('lent-200').questions;
  ok('L’AVANCEMENT : fait, à faire, en cours, et un temps restant mesuré sur les dernières réponses', estime.total === 12 && estime.faites >= 5 && estime.aFaire === 12 - estime.faites - estime.echecs && estime.restant > 0, JSON.stringify(estime));
  await page.reload(); await page.waitForFunction(() => typeof IA !== 'undefined' && typeof BIB !== 'undefined' && BIB.pret, null, { timeout: 120000 });
  await ev(() => { IA.attenteBase = 60; });
  const toast = await page.waitForFunction(() => /reprend la lecture/.test((document.getElementById('toast') || {}).textContent || '') && document.getElementById('toast').textContent, null, { timeout: 15000 }).then(h => h.jsonValue()).catch(() => '');
  await page.waitForFunction(() => { const a = avancementIA('essai-coupure'); return a.total === 12 && a.faites + a.echecs === 12; }, null, { timeout: 30000 });
  const RC = await ev(() => resultatsIA('essai-coupure'));
  const EC = F.etat('lent-200'), redemandees = EC.journal.filter(q => q.k > qAvant).map(q => +((/n°(\d+)/.exec(JSON.stringify(q.messages)) || [])[1]));
  ok('UNE LECTURE COUPÉE (la page rechargée) reprend seule où elle en était : rien de fini n’est redemandé, tout est rendu, dans l’ordre',
    RC.length === 12 && RC.every((x, k) => x.rang === k && x.etat === 'faite' && x.reponse.json.n === k) && redemandees.length >= 12 - finies.length && redemandees.length <= 12 - finies.length + 2 && redemandees.every(n => !finies.includes(n)),
    JSON.stringify({ finies, redemandees, n: RC.length }));
  ok('… et VOLTA le dit en rouvrant (« VOLTA reprend la lecture de … où elle en était »)', /VOLTA reprend la lecture de « Lecture de « essai-300-pages\.pdf » »|VOLTA reprend la lecture/.test(toast), toast);
  await ev(() => oublierLotIA('essai-coupure'));
  // deux onglets de VOLTA : un seul tient la file — une lecture lancée dans l'autre lui arrive, et ne se lit qu'une fois
  { const c3 = await nav.newContext({ viewport: { width: 1280, height: 800 } }), A = await c3.newPage(), B = await c3.newPage();
    for (const p of [A, B]) { p.on('pageerror', e => erreurs.push(e.message)); await p.goto(FICHIER); await p.waitForFunction(() => typeof IA !== 'undefined' && typeof BIB !== 'undefined' && BIB.pret, null, { timeout: 120000 }); await attendre(300); }
    const regler2 = p => p.evaluate(({ a, k }) => { Object.assign(IA.reglage, { adresse: a, modele: 'modele-factice', cle: k, parallele: 2 }); garderReglageIA(); reglageChangeIA('adresse'); }, { a: F.adresse('lent-150'), k: CLE_FACTICE });
    await regler2(A); await regler2(B);
    const tenues = [await A.evaluate(() => IA.tenue), await B.evaluate(() => IA.tenue)];
    await B.evaluate(() => lireEnFondIA({ lot: 'deux-onglets', titre: 'Deux onglets', genre: 'essai', demandes: Array.from({ length: 6 }, (_, k) => ({ rang: k, messages: [{ role: 'user', content: 'Donne le JSON de la page n°' + k + '.' }], options: { json: true } })) }));
    await A.waitForFunction(() => { const a = avancementIA('deux-onglets'); return a.total === 6 && a.faites === 6; }, null, { timeout: 30000 }).catch(() => { });
    const vuA = await A.evaluate(() => avancementIA('deux-onglets')), vuB = await B.evaluate(() => ({ ailleurs: !!(IA.lots.get('deux-onglets') || {}).ailleurs, texte: travailHtmlIA() }));
    ok('DEUX ONGLETS : un seul tient la file ; une lecture lancée dans l’autre lui arrive, se lit une seule fois, et l’autre dit où elle avance',
      tenues[0] === true && tenues[1] === false && vuA.faites === 6 && F.etat('lent-150').questions === 6 && vuB.ailleurs && /autre onglet de VOLTA/.test(vuB.texte), JSON.stringify({ tenues, vuA, q: F.etat('lent-150').questions, ailleurs: vuB.ailleurs }));
    await A.close(); await B.waitForFunction(() => IA.tenue === true, null, { timeout: 5000 }).catch(() => { });
    ok('… l’onglet qui tenait la file se ferme : l’autre la prend', await B.evaluate(() => IA.tenue === true));
    await B.evaluate(() => oublierLotIA('deux-onglets')); await c3.close(); }

  /* ---- 4. la clé nulle part ---- */
  await ev(() => atelier.exemple()); await attendre(2500);
  const ADR = await ev(() => IA.reglage.adresse);
  const fuites = await ev(async ({ cle, adr, mod }) => {
    const blobs = [], tl = window.telecharger; window.telecharger = (b, n) => { blobs.push({ b, n }); }; try { telecharger = window.telecharger; } catch (_) { }
    for (const a of ['retestcorrige', 'suivi', 'nomenclaturecsv', 'svg', 'png', 'dossierpdf', 'vsdx']) { if (!MENU.actions[a]) continue; const av = blobs.length;
      try { await MENU.actions[a](); } catch (_) { } await new Promise(r => setTimeout(r, 300)); if (blobs.length === av && document.getElementById('rv-enregistrer')) document.getElementById('rv-enregistrer').click();
      const t0 = Date.now(); while (blobs.length === av && Date.now() - t0 < 45000) await new Promise(r => setTimeout(r, 100)); try { fermerFiche(true); } catch (_) { } }
    blobs.push({ b: new Blob([texteDuBilan()]), n: 'bilan-anonyme.txt' });
    window.telecharger = tl; try { telecharger = tl; } catch (_) { }
    const enc = new TextEncoder(), formes = s => { const u = enc.encode(s), be = new Uint8Array(u.length * 2), le = new Uint8Array(u.length * 2); u.forEach((c, i) => { be[2 * i + 1] = c; le[2 * i] = c; }); return [u, be, le]; };
    const contient = (h, n) => { outer: for (let i = 0; i + n.length <= h.length; i++) { for (let j = 0; j < n.length; j++) if (h[i + j] !== n[j]) continue outer; return true; } return false; };
    const deplier = async u8 => { const out = [u8];
      if (u8[0] === 0x50 && u8[1] === 0x4b) { try { Object.values(fflate.unzipSync(u8)).forEach(x => out.push(x)); } catch (_) { } }
      const t = new TextDecoder('latin1').decode(u8);
      if (t.startsWith('%PDF')) { const re = /stream\r?\n/g; let m; while ((m = re.exec(t))) { const debut = m.index + m[0].length, fin = t.indexOf('endstream', debut); if (fin < 0) break;
        let brut = u8.slice(debut, fin); while (brut.length && (brut[brut.length - 1] === 10 || brut[brut.length - 1] === 13)) brut = brut.slice(0, -1);
        try { out.push(new Uint8Array(await new Response(new Blob([brut]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer())); } catch (_) { } } }
      return out; };
    const res = [];
    for (const { b, n } of blobs) { const u8 = new Uint8Array(await b.arrayBuffer()), parts = await deplier(u8);
      res.push({ n, taille: u8.length, parts: parts.length, trouves: [['la clé', cle], ['l’adresse', adr], ['le modèle', mod]].filter(([, s]) => formes(s).some(f => parts.some(p => contient(p, f)))).map(([m]) => m) }); }
    return res; }, { cle: CLE_FACTICE, adr: ADR, mod: 'modele-factice' });
  const genres = fuites.map(x => x.n.replace(/^.*\./, '.')), attendus = ['.xlsx', '.csv', '.svg', '.png', '.pdf', '.vsdx', '.txt'];
  ok('LES EXPORTS : Excel corrigé, suivi, LPA, SVG, PNG, dossier PDF, Visio, bilan anonyme — fabriqués et fouillés (dézippés, flux du PDF dépliés)', attendus.every(g => genres.includes(g)), JSON.stringify(fuites.map(x => [x.n, x.taille, x.parts])));
  ok('… ni la clé, ni l’adresse, ni le modèle dans aucun d’eux', fuites.every(x => !x.trouves.length), JSON.stringify(fuites.filter(x => x.trouves.length)));
  const stock = await ev(async cle => { const ls = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k !== 'volta.ia.reglage' && (localStorage.getItem(k) || '').includes(cle)) ls.push(k); }
    const dbs = (await indexedDB.databases()).map(x => x.name), idb = [], vus = [];
    for (const nom of dbs) { const db = await new Promise((ok, ko) => { const r = indexedDB.open(nom); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
      for (const s of db.objectStoreNames) { const tout = await new Promise((ok, ko) => { const q = db.transaction(s).objectStore(s).getAll(); q.onsuccess = () => ok(q.result); q.onerror = () => ko(q.error); });
        vus.push(nom + '/' + s); const txt = JSON.stringify(tout, (k, v) => v instanceof Map ? [...v] : v instanceof Set ? [...v] : ArrayBuffer.isView(v) ? '' : v); if (txt && txt.includes(cle)) idb.push(nom + '/' + s); }
      db.close(); }
    return { ls, idb, vus, html: document.documentElement.outerHTML.includes(cle), contrat: (localStorage.getItem('atelier.contrat.v2') || '').includes(cle) }; }, CLE_FACTICE);
  ok('LES SAUVEGARDES : la clé n’est dans aucune autre case de localStorage, ni dans le contrat gardé, ni dans IndexedDB (la file de l’IA comprise), ni dans le HTML',
    !stock.ls.length && !stock.idb.length && !stock.html && !stock.contrat && stock.vus.some(v => /^volta-ia\//.test(v)), JSON.stringify(stock));
  await ctx.close();

  /* ---- 5. l'œil : clair et sombre, 1440 et 1920 ---- */
  const oeil = [];
  for (const [sombre, l] of [[false, 1440], [true, 1920], [true, 1440], [false, 1920]]) { const h = Math.round(l * 0.625), { ctx: c2, page: p2 } = await nouvellePage({ sombre, l, h }), ou = (sombre ? 'sombre ' : 'clair ') + l;
    await p2.evaluate(() => atelier.exemple()); await attendre(1200);
    await p2.evaluate(a => { Object.assign(IA.reglage, a); garderReglageIA(); IA.attenteBase = 60; MENU.actions.ia(); }, { adresse: F.adresse('ok'), modele: 'modele-factice', cle: CLE_FACTICE });
    await attendre(400); oeil.push(...(await p2.evaluate(examinerDansLaPage, '#fiche')).map(x => ou + ' vide — ' + x));
    for (const [sc, nom] of [['ok', 'prête'], ['cors', 'cors'], ['aveugle-muet', 'aveugle']]) {
      await p2.evaluate(a => { IA.reglage.adresse = a; reglageChangeIA('adresse'); remplirChampsIA(); return testerIA(); }, F.adresse(sc)); await attendre(500);
      for (const y of [0, 9999]) { await p2.evaluate(y => { $('fiche-corps').scrollTop = y; }, y); await attendre(150); oeil.push(...(await p2.evaluate(examinerDansLaPage, '#fiche')).map(x => ou + ' ' + nom + ' — ' + x)); } }
    await p2.evaluate(a => { IA.reglage.adresse = a; reglageChangeIA('adresse'); return lireEnFondIA({ lot: 'oeil', titre: 'Lecture de « un-document-assez-long-pour-voir.pdf »', genre: 'essai', demandes: Array.from({ length: 30 }, (_, k) => ({ rang: k, messages: [{ role: 'user', content: 'Donne le JSON de la page n°' + k + '.' }], options: { json: true } })) }); }, F.adresse('lent-500'));
    await attendre(2600); await p2.evaluate(() => { $('fiche-corps').scrollTop = 9999; }); await attendre(200);
    oeil.push(...(await p2.evaluate(examinerDansLaPage, '#fiche')).map(x => ou + ' lecture — ' + x));
    await p2.evaluate(() => arreterIA()); await attendre(300); oeil.push(...(await p2.evaluate(examinerDansLaPage, '#fiche')).map(x => ou + ' lecture arrêtée — ' + x));
    await p2.evaluate(() => { fermerFiche(); document.getElementById('btnMenu').click(); }); await attendre(250); await p2.evaluate(() => montrerPanneau('plus')); await attendre(300);
    oeil.push(...(await p2.evaluate(examinerDansLaPage, '#mp-plus')).map(x => ou + ' menu Plus — ' + x));
    await c2.close(); }
  ok('L’ŒIL du réglage (vide, prête, refusée, aveugle, une lecture, arrêtée) et du menu, clair et sombre, 1440 et 1920 : rien de coupé, rien qui chevauche, rien qui sort', !oeil.length, oeil.slice(0, 12).join(' ; '));

  await nav.close(); await F.fermer();
  R.forEach(x => console.log(x));
  const ko = R.filter(x => x.startsWith('  KO')).length;
  console.log('\n  erreurs de page :', erreurs.length ? [...new Set(erreurs)].slice(0, 3).join(' | ') : 'aucune');
  console.log('  ' + (R.length - ko) + ' / ' + R.length + ' contrôles passés' + (ko ? ' — ' + ko + ' échec(s)' : ' — tout tient'));
  process.exit(ko || erreurs.length ? 1 : 0);
})().catch(e => { console.error('ÉCHEC — ' + (e && e.stack || e)); process.exit(1); });
