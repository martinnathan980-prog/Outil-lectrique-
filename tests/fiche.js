/* ===========================================================================
   FICHE — ce qu'on voit quand on clique un bloc ou un câble : la CARTE (la synthèse), puis la fiche EN GRAND (« Tout voir »).
       NODE_PATH=$(npm root -g) node tests/fiche.js [--fichier=chemin]
   (réécrite le 10 novembre 2026 d'après la charte : l'ancienne jugeait la fiche v4 — sections repliées, « nom en clair »,
   carte de décision, « À la main » —, qui n'existe plus.)

   Sur le plan d'exemple, pour chaque genre (disjoncteur, connecteur, relais, barrette du fichier, barrette ajoutée par
   VOLTA, prise de coupure, masse, câble au courant connu, câble au courant inconnu) :
     · LA CARTE : le genre se reconnaît (la silhouette, le mot), le repère, deux ou trois chiffres clés, les points à régler
       en une seule section compacte, « Tout voir » ; elle tient sans défiler et se tire par ses huit bords ; aucune
       saisie qui doublerait votre fichier ;
     · EN GRAND : des onglets de même largeur dont le nom dit ce qu'on y trouve (« Pièces », pas « Fabrication »),
       L'essentiel d'abord — aussi quand la fiche s'ouvre sur un autre objet ; des sections titrées, jamais une colonne
       pleine de tirets ; la fenêtre agrandie garde ses huit bords ;
     · MODIFIER, trois sortes bien séparées : ce qui vient de votre fichier se lit sans saisie ; les choix de VOLTA en
       Automatique / Manuel ; l'information se lit ;
     · LES MOTS : VOLTA en capitales, gauge, folio, « partie mobile / partie fixe », « disjoncte / ne disjoncte pas » ;
       aucun numéro de câble ;
     · LA VÉRITÉ : un courant connu s'explique, un courant inconnu se dit inconnu et demande la consommation ; la
       proposition de VOLTA (« Passer en DR16 ») ne propose jamais une gauge plus fine, se chiffre (« +39 g ») et se défait ;
     · le « ? » : une bulle, une seule à la fois ; Échap la ferme, pas la fiche.
   Rend 1 au premier échec.
   =========================================================================== */
const { chromium } = require('playwright');
const P = require('./pilote');
const FICHIER = P.fichierDemande();

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await nav.newPage({ viewport: { width: 1600, height: 950 } }); page.setDefaultTimeout(300000);
  const erreurs = []; page.on('pageerror', e => erreurs.push(e.message));
  let ko = 0, total = 0; const ok = (c, nom, detail) => { total++; if (!c) ko++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (detail && !c ? '   ← ' + String(detail).slice(0, 900) : '')); };
  await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined'); await page.evaluate(() => atelier.exemple()); await page.waitForTimeout(700);
  const ev = (f, a) => page.evaluate(f, a), pause = ms => page.waitForTimeout(ms);
  // choisir un objet : un bloc du plan, une barrette ajoutée (« vt:VT1 »), un câble (« fil:W-011 », l'identifiant interne de l'exemple — jamais montré)
  const choisir = async (plan, nom) => { await ev(([plan, nom]) => { if (typeof fermerInspecteur === 'function') fermerInspecteur(); allerAuPlan(plan);
    if (/^fil:/.test(nom)) choisirFil(app.dessin.fils.find(w => w.cable === nom.slice(4))); else if (/^vt:/.test(nom)) choisirBarretteAPoser(barretteAPoser(nom.slice(3))); else choisirBloc(app.dessin.comps.find(k => k.name === nom)); }, [plan, nom]); await pause(600); };
  const grand = async () => { if (!await ev(() => document.body.classList.contains('insp-grand'))) { await page.click('#fi-tout-voir'); await pause(650); } };
  const onglet = async o => { await page.click('#nv-o-' + o); await pause(450); };
  const lireCarte = () => ev(() => { const f = document.getElementById('ba-equip'), n = s => String(s || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim(), t = s => { const e = f.querySelector(s); return e ? n(e.textContent) : ''; }, I = $('inspecteur').getBoundingClientRect();
    return { genre: t('.nc-genre-mot'), rep: t('.nc-rep-t'), meta: [...f.querySelectorAll('.nc-meta-v')].map(x => n(x.textContent)).join(' · '), silhouette: ((f.querySelector('.nc-sceau svg') || { getAttribute: () => '' }).getAttribute('class') || '').replace('silhouette', '').trim(),
      chiffres: [...f.querySelectorAll('.nc-chiffre')].map(x => n(x.querySelector('.nc-k').textContent) + ' : ' + n(x.querySelector('.nc-v').textContent)), taches: f.querySelectorAll('.nc-tache').length, sectionsTaches: f.querySelectorAll('.nc-taches').length, tete: t('.nc-pbs-g'),
      gestes: [...f.querySelectorAll('.nc-tache button')].map(b => n(b.textContent)).filter(Boolean), autres: t('.nc-autres'), champs: [...f.querySelectorAll('input, textarea, select')].map(i => i.id), defile: f.scrollHeight - f.clientHeight, dedans: I.bottom <= innerHeight + 1 && I.top >= 0,
      bords: document.querySelectorAll('.carte-bords [data-bord]').length, toutVoir: t('#fi-tout-voir'), texte: n(f.innerText) }; });
  const lireGrand = () => ev(() => { const n = s => String(s || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim(), os = [...document.querySelectorAll('#ba-equip .nv-onglet')].filter(o => o.getBoundingClientRect().width > 0);
    return { grand: document.body.classList.contains('insp-grand'), onglets: os.map(o => o.id.replace('nv-o-', '')), noms: os.map(o => n((o.querySelector('b, .nv-o-t') || o.firstChild || o).textContent)), l: os.map(o => Math.round(o.getBoundingClientRect().width)), choisi: ((os.find(o => o.getAttribute('aria-selected') === 'true') || {}).id || '').replace('nv-o-', ''), bords: document.querySelectorAll('.carte-bords [data-bord]').length }; });
  const lirePanneau = o => ev(o => { const Pn = document.getElementById('nv-p-' + o), n = s => String(s || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim(); if (!Pn) return null;
    const colonnesDeTirets = [...Pn.querySelectorAll('table')].flatMap(T => { const rs = [...T.querySelectorAll('tbody tr')].filter(r => r.children.length > 1), nc = rs.length ? rs[0].children.length : 0, out = []; for (let k = 0; k < nc; k++) if (rs.length > 1 && rs.every(r => r.children[k] && /^[—–-]$/.test(r.children[k].textContent.trim()))) out.push(n((T.querySelectorAll('thead th')[k] || {}).textContent || 'colonne ' + k)); return out; });
    return { titres: [...Pn.querySelectorAll('.vu-titre, .nv-somm-t, h3, h4')].map(x => n(x.textContent)), sectionsSansTitre: [...Pn.querySelectorAll('section.vu-bloc')].filter(s => !s.querySelector('.vu-titre')).length, texte: n(Pn.innerText), dessins: Pn.querySelectorAll('svg:not(.ico)').length, tables: Pn.querySelectorAll('table').length, colonnesDeTirets }; }, o);

  const OBJETS = [
    { plan: '1', nom: '102CB1', genre: 'Disjoncteur', sil: 'sl-disjoncteur', onglets: ['essentiel', 'calibre', 'cables'] },
    { plan: '3', nom: '300XC1', genre: 'Connecteur', sil: 'sl-equipement', onglets: ['essentiel', 'cables', 'fabrication', 'reglages'] },
    { plan: '1', nom: '103RL1', genre: 'Relais', sil: 'sl-equipement', onglets: ['essentiel', 'cables', 'fabrication', 'reglages'] },
    { plan: '2', nom: '667VT2', genre: 'Barrette de jonction', sil: 'sl-barrette', onglets: ['essentiel', 'cables', 'fabrication', 'reglages', 'modifs'] },
    { plan: '1', nom: 'vt:VT1', rep: 'VT1', genre: 'Barrette de jonction', sil: 'sl-barrette', onglets: ['essentiel', 'cables', 'fabrication', 'reglages', 'modifs'], champs: ['vt-repere'] },
    { plan: '2', nom: '408VC1A', genre: 'Prise de coupure', sil: 'sl-prise', onglets: ['essentiel', 'cables', 'fabrication', 'reglages'] },
    { plan: '1', nom: '901G', genre: 'Masse', sil: 'sl-masse', onglets: ['essentiel', 'cables'] },
    { plan: '1', nom: 'fil:W-011', rep: 'DR16', genre: 'Câble', sil: 'sl-fil', onglets: ['essentiel', 'fabrication', 'reglages'] },
    { plan: '1', nom: 'fil:W-012', rep: 'DR20', genre: 'Câble', sil: 'sl-fil', onglets: ['essentiel', 'fabrication', 'reglages'] }];
  const NOMS = { essentiel: 'L’essentiel', calibre: 'Calibre', cables: 'Câbles', fabrication: 'Pièces', reglages: 'Modifier', modifs: 'Historique' };
  // les mots que la charte bannit de l'écran (l'outil, jauge, planche, tient, Volta en minuscules, fiche / embase, un numéro de câble, le contrat, le harness)
  const BANNIS = /\bl[’']outil\b|\bjauges?\b|\bplanches?\b|\btient\b|\bVolta\b|\bembase\b|\bfiche \/|W-\d{3}|\bcontrat\b|\bharness\b|\bretest\b|trop juste|\bnom en clair\b/;
  const R = {}, fautes = (f) => OBJETS.filter(o => !f(R[o.nom], o)).map(o => o.rep || o.nom);
  console.log('\nLA CARTE ET LA FICHE EN GRAND, GENRE PAR GENRE');
  for (const o of OBJETS) { await choisir(o.plan, o.nom); const carte = await lireCarte(); await grand(); const G = await lireGrand(), panneaux = {};
    for (const k of G.onglets) { await onglet(k); panneaux[k] = await lirePanneau(k); }
    R[o.nom] = { carte, G, panneaux }; await ev(() => fermerInspecteur()); await pause(250); }
  const det = f => JSON.stringify(OBJETS.map(o => [o.rep || o.nom, f(R[o.nom])]));
  ok(!fautes((r, o) => r.carte.genre === o.genre && r.carte.rep === (o.rep || o.nom) && r.carte.silhouette === o.sil).length, 'chaque genre se reconnaît d’un coup d’œil : la silhouette de l’objet, sa nature en un mot (Disjoncteur, Connecteur, Relais, Barrette de jonction, Prise de coupure, Masse, Câble), son repère — un câble se dit par son type', det(r => [r.carte.genre, r.carte.rep, r.carte.silhouette]));
  ok(!fautes(r => r.carte.defile <= 1 && r.carte.dedans && r.carte.bords === 8 && r.carte.toutVoir === 'Tout voir').length, 'la carte tient sans défiler, dans la fenêtre ; elle se tire par ses huit bords ; « Tout voir » ouvre la fiche entière', det(r => [r.carte.defile, r.carte.dedans, r.carte.bords, r.carte.toutVoir]));
  ok(!fautes((r, o) => r.carte.champs.join() === (o.champs || []).join()).length, 'aucune saisie sur la carte qui doublerait votre fichier (pas de « nom en clair ») — seule la barrette ajoutée par VOLTA attend son vrai repère', det(r => r.carte.champs));
  ok(!fautes(r => r.carte.chiffres.length >= 1 && r.carte.chiffres.length <= 3 && r.carte.chiffres.every(c => !/: [—–-]?$/.test(c))).length, 'un à trois chiffres clés, chacun avec sa valeur (jamais un tiret)', det(r => r.carte.chiffres));
  ok(!fautes(r => r.carte.sectionsTaches <= 1 && r.carte.taches <= 2 && (!r.carte.taches || /^À (régler|voir) ?\d+$/.test(r.carte.tete))).length, 'les points d’un objet ne s’empilent pas : une seule section compacte (« À régler N »), deux lignes au plus, le reste derrière « et N autres »', det(r => [r.carte.sectionsTaches, r.carte.taches, r.carte.tete, r.carte.autres]));
  ok(!fautes((r, o) => r.G.grand && r.G.onglets.join() === o.onglets.join() && r.G.choisi === 'essentiel' && Math.max(...r.G.l) - Math.min(...r.G.l) <= 1 && r.G.bords === 8).length, 'en grand : L’essentiel d’abord ; tous les onglets d’une barre ont la même largeur ; la fenêtre agrandie garde ses huit bords', det(r => [r.G.onglets.join(), r.G.choisi, r.G.l.join(), r.G.bords]));
  ok(!fautes(r => r.G.onglets.every((k, i) => r.G.noms[i].startsWith(NOMS[k]))).length && !Object.values(R).some(r => r.G.noms.some(x => /Fabrication/.test(x))), 'le nom des onglets dit ce qu’on y trouve : L’essentiel, Calibre, Câbles, Pièces (pas « Fabrication »), Modifier, Historique', det(r => r.G.noms));
  ok(!fautes(r => Object.entries(r.panneaux).every(([k, p]) => p && p.texte.length > 20 && !p.sectionsSansTitre && (p.titres.length || p.tables || k === 'modifs'))).length, 'les sections se voient toujours : chaque onglet a du contenu, chaque section son titre', det(r => Object.entries(r.panneaux).map(([k, p]) => k + ':' + (p ? p.titres.length + '/' + p.sectionsSansTitre + '/' + p.tables : 'absent'))));
  ok(!fautes(r => Object.values(r.panneaux).every(p => !p.colonnesDeTirets.length)).length, 'jamais une colonne pleine de tirets dans un tableau', det(r => Object.entries(r.panneaux).filter(([, p]) => p.colonnesDeTirets.length).map(([k, p]) => k + ':' + p.colonnesDeTirets.join())));
  const motsBannis = OBJETS.flatMap(o => [['carte', R[o.nom].carte.texte], ...Object.entries(R[o.nom].panneaux).map(([k, p]) => [k, p.texte])].map(([k, t]) => { const m = t.match(new RegExp('.{0,40}(' + BANNIS.source + ').{0,40}')); return m ? (o.rep || o.nom) + ' › ' + k + ' : « ' + m[0] + ' »' : ''; }).filter(Boolean));
  ok(!motsBannis.length, 'les mots : VOLTA en capitales, gauge, folio, « votre fichier », « partie mobile / partie fixe » — ni « l’outil », ni « jauge », ni « planche », ni « tient », ni « contrat », ni « harness », ni « fiche / embase », ni numéro de câble', motsBannis.slice(0, 6).join(' | '));

  console.log('\nMODIFIER : TROIS SORTES BIEN SÉPARÉES');
  const lireModifier = () => ev(() => { const Pn = document.getElementById('nv-p-reglages'), n = s => String(s || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim(), S = k => Pn.querySelector('section.nv-mod.' + k);
    const sorte = k => { const s = S(k); if (!s) return null; return { titre: n((s.querySelector('.nv-somm-t') || s.querySelector('h4') || {}).textContent), chapeau: n(s.innerText).slice(0, 110), lignes: s.querySelectorAll('.nv-somm-i').length, saisies: s.querySelectorAll('input, select, textarea').length, boutons: [...s.querySelectorAll('button.btn')].map(b => n(b.textContent)), am: [...s.querySelectorAll('.nv-am-b')].map(b => b.dataset.am + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')).join(' '), sources: [...s.querySelectorAll('.vu-src')].map(x => n(x.textContent)), texte: n(s.innerText) }; };
    return { ordre: [...Pn.querySelectorAll('section.nv-mod')].map(s => ['fichier', 'choix', 'info'].find(k => s.classList.contains(k))).join(), fichier: sorte('fichier'), choix: sorte('choix'), info: sorte('info') }; });
  const M = {};
  for (const nom of ['300XC1', '667VT2', 'vt:VT1', '408VC1A', 'fil:W-011', 'fil:W-012']) { const o = OBJETS.find(x => x.nom === nom); await choisir(o.plan, o.nom); await grand(); await onglet('reglages'); M[nom] = await lireModifier(); await ev(() => fermerInspecteur()); await pause(200); }
  const detM = f => JSON.stringify(Object.entries(M).map(([k, m]) => [k, f(m)]));
  ok(Object.values(M).every(m => ['fichier,choix,info', 'choix,info', 'fichier,info'].includes(m.ordre)), 'l’ordre ne change jamais : « Dans votre fichier », puis « Choix de VOLTA », puis « Information » (une sorte absente ne laisse pas de bloc vide)', detM(m => m.ordre));
  ok(Object.values(M).filter(m => m.fichier).every(m => m.fichier.titre === 'Dans votre fichier' && /VOLTA le lit tel quel ; pour le changer, changez votre fichier\./.test(m.fichier.chapeau) && !m.fichier.saisies && m.fichier.lignes >= 1 && m.fichier.boutons.every(b => /^Passer en DR\d+$/.test(b))),
    'ce qui vient de votre fichier se lit sans saisie (« VOLTA le lit tel quel ; pour le changer, changez votre fichier ») : aucun champ ; le seul bouton possible est la proposition justifiée de VOLTA (« Passer en DR16 »)', detM(m => m.fichier && [m.fichier.titre, m.fichier.saisies, m.fichier.boutons]));
  ok(Object.values(M).filter(m => m.choix).every(m => m.choix.titre === 'Choix de VOLTA' && /VOLTA choisit et dit pourquoi ; en Manuel, vous prenez le vôtre\./.test(m.choix.chapeau) && /auto\*? manuel\*?/.test(m.choix.am) && (m.choix.am.match(/\*/g) || []).length === m.choix.am.split(' ').length / 2),
    'les choix de VOLTA se règlent en Automatique / Manuel, bien visibles : chaque réglage a ses deux boutons, un seul pressé', detM(m => m.choix && [m.choix.titre, m.choix.am]));
  ok(Object.values(M).every(m => m.info && m.info.titre === 'Information' && /Calculé par VOLTA : cela se lit, cela ne se règle pas\./.test(m.info.chapeau) && !m.info.saisies && !m.info.boutons.length && !m.info.am), 'l’information se lit, sans geste (« Calculé par VOLTA : cela se lit, cela ne se règle pas »)', detM(m => m.info && [m.info.titre, m.info.saisies, m.info.boutons, m.info.am]));
  ok(/Ses deux bouts Qui va où : VOLTA ne le change jamais\. 101BT1:1 → 102CB1:1 votre fichier/.test(M['fil:W-011'].fichier.texte) && !M['fil:W-011'].choix, 'un câble : son type, sa longueur, ses deux bouts (« Qui va où : VOLTA ne le change jamais »), sa route viennent de votre fichier ; rien à régler dessus', M['fil:W-011'].fichier.texte.slice(0, 400));
  ok(!M['vt:VT1'].fichier && /Le module Le plus petit qui loge tous les groupes\./.test(M['vt:VT1'].choix.texte) && /calcul de VOLTA/.test(M['vt:VT1'].choix.texte), 'une barrette ajoutée par VOLTA n’a rien « dans votre fichier » : son module est un choix de VOLTA (« le plus petit qui loge tous les groupes », calcul de VOLTA)', JSON.stringify(M['vt:VT1']).slice(0, 400));

  console.log('\nGENRE PAR GENRE : L’ESSENTIEL');
  const E = n => R[n].panneaux.essentiel, C = n => R[n].carte;
  ok(/^Ce qu’il relie 23 câbles · 3 connecteurs/.test(E('300XC1').titres[0]) && E('300XC1').dessins >= 1 && !E('300XC1').tables && C('300XC1').chiffres.join(' | ') === 'Connecteurs : A · B · C | Contacts : 17/ 24 | Câbles : 23· 1 à régler',
    'un équipement montre son brochage DESSINÉ (« Ce qu’il relie 23 câbles · 3 connecteurs »), jamais un tableau ; sa carte : ses connecteurs, ses contacts pris, ses câbles', JSON.stringify([E('300XC1').titres, E('300XC1').dessins, E('300XC1').tables, C('300XC1').chiffres]));
  ok(/^La barrette 2 modules sur un rail/.test(E('667VT2').titres[0]) && /51 E0599-1B201Z 52 E0599-1B202Z/.test(E('667VT2').texte) && /^Ce qu’elle relie 7 câbles · 4 groupes/.test(E('667VT2').titres[1]) && /51A DR24/.test(E('667VT2').texte) && /52A DR22/.test(E('667VT2').texte) && E('667VT2').dessins >= 2,
    'une barrette, c’est plusieurs modules : dessinée entière (« 2 modules sur un rail », 51 et 52, chacun sa référence) ; une borne se dit module + lettre (51A, 52A) ; ses groupes', JSON.stringify(E('667VT2').titres) + ' ' + E('667VT2').texte.slice(0, 200));
  ok(/ajoutée par VOLTA sur 102CB1:2/.test(C('vt:VT1').meta) && /51H DR20 102CB1 2 51J DR20 103RL1 A1 51K DR24 395SW1 1/.test(E('vt:VT1').texte) && /VOLTA l’a ajoutée sur 102CB1:2 : plusieurs câbles y partent de la même borne/.test(E('vt:VT1').texte) && /par VOLTA/.test(R['vt:VT1'].panneaux.modifs.texte),
    'la barrette que VOLTA ajoute est marquée comme ajoutée (« ajoutée par VOLTA sur 102CB1:2 »), ses bornes ont le nom de sa face (51H, 51J, 51K), elle dit pourquoi, et l’Historique la retrouve', C('vt:VT1').meta + ' | ' + E('vt:VT1').texte.slice(0, 260));
  const prise = Object.values(R['408VC1A'].panneaux).map(p => p.texte).join(' ') + ' ' + C('408VC1A').texte;
  ok(/Partie mobile : mâle/.test(C('408VC1A').chiffres.join(' | ')) && /^Ce qui la traverse 1 contact/.test(E('408VC1A').titres[0]) && /^La face EN3646-002-08-3A/.test(E('408VC1A').titres[1]) && /Partie mobile EN3646-002-08-3A ce qui arrive/.test(R['408VC1A'].panneaux.fabrication.texte) && /Partie fixe ce qui repart/.test(R['408VC1A'].panneaux.fabrication.texte) && !/embase|\bfiche\b(?! ›)/i.test(prise.replace(/sa fiche|la fiche/gi, '')),
    'la prise de coupure : « ce qui la traverse », sa face, « partie mobile » et « partie fixe » dans tous les textes — jamais « fiche / embase »', C('408VC1A').chiffres.join(' | ') + ' | ' + JSON.stringify(E('408VC1A').titres));
  ok(/^Ce qui y revient 3 câbles/.test(E('901G').titres[0]) && /DR16 101BT1 borne 2 80 ?% 9,31 A sur 11,7 A/.test(R['901G'].panneaux.cables.texte) && /DR24 103RL1 borne X2 inconnu sur 3,9 A inconnue/.test(R['901G'].panneaux.cables.texte),
    'la masse : « ce qui y revient » ; un câble de masse porte le courant de sa charge (9,31 A sur 11,7 A, côté batterie) — et quand la consommation n’est pas écrite, courant et chute se disent inconnus', R['901G'].panneaux.cables.texte.slice(0, 420));

  console.log('\nLA VÉRITÉ : COURANT CONNU, COURANT INCONNU');
  ok(C('fil:W-011').chiffres.join(' | ') === 'Courant : 9,31A | Chute : 0,94V | Longueur : ≈5m' && /9,31 A sur 11,7 A admis Le plus fort : démarrage et transition pendant 2,1 min\. En continu : 5 A sur 11,7 A\./.test(E('fil:W-011').texte) && /Côté source de 102CB1 · 10 A : il l’alimente, il n’est pas sous sa protection\./.test(E('fil:W-011').texte) && /Longueur supposée : 5 m — votre fichier ne la donne pas/.test(E('fil:W-011').texte),
    'un courant connu s’explique : 9,31 A sur 11,7 A admis, le plus fort (démarrage et transition, 2,1 min), le continu (5 A) ; côté source, le câble n’est pas sous la protection du disjoncteur qu’il nourrit ; la longueur supposée se dit supposée', C('fil:W-011').chiffres.join(' | ') + ' ‖ ' + E('fil:W-011').texte.slice(0, 500));
  ok(/^Courant : inconnu/.test(C('fil:W-012').chiffres[0]) && !C('fil:W-012').chiffres.some(c => /^Chute/.test(c)) && C('fil:W-012').gestes.includes('Passer en DR16') && C('fil:W-012').gestes.includes('Écrire la consommation de 104LP1') && /Courant inconnu/.test(E('fil:W-012').texte) && !/\b2 A\b/.test(E('fil:W-012').texte),
    'un courant inconnu se dit inconnu — aucun courant inventé, aucune chute — et la carte demande la consommation (« Écrire la consommation de 104LP1 ») ; la protection, elle, se juge toujours (« Passer en DR16 »)', C('fil:W-012').chiffres.join(' | ') + ' ‖ ' + C('fil:W-012').gestes.join(' · ') + ' ‖ ' + E('fil:W-012').texte.slice(0, 300));
  const prop = M['fil:W-012'].fichier.texte, mp = /PROPOSITION DE VOLTA DR(\d+) \((\d+) AWG\) : le plus fin que protège le 10 A de 102CB1\. \+(\d+) g sur 5 m supposés Elle ira dans l’Excel corrigé, votre nouveau fichier\. Passer en DR\1/i.exec(prop);
  ok(!!mp && +mp[1] < 20 && +mp[3] > 0, 'la proposition de VOLTA montre sa plus-value : « DR16 (16 AWG) : le plus fin que protège le 10 A de 102CB1 », ce qu’elle coûte (« +39 g sur 5 m supposés »), où elle va (« l’Excel corrigé, votre nouveau fichier ») ; jamais une gauge plus fine que celle du fichier', prop.slice(0, 420));
  // le geste, puis Défaire : la fiche reste ouverte
  await choisir('1', 'fil:W-012'); await grand(); await onglet('reglages');
  await page.click('#nv-p-reglages section.nv-mod.fichier button.btn'); await pause(900);
  const G1 = await ev(() => { const l = verite().find(x => x.cable === 'W-012'), t = $('toast'); return { type: l.type, fiche: !$('inspecteur').hidden, cle: ($('ba-equip') || { dataset: {} }).dataset.cle, message: t ? t.innerText.replace(/\s+/g, ' ') : '', defaire: !!(t && [...t.querySelectorAll('button')].some(b => /Défaire/.test(b.textContent))), volta: !!(l.avant && l.avant['volta:type'] === 'DR16') }; });
  ok(G1.type === 'DR16' && G1.fiche && /^fil#/.test(G1.cle) && G1.defaire && G1.volta, '« Passer en DR16 » : le câble passe en DR16 (marqué « proposition de VOLTA acceptée »), sa fiche reste ouverte, le message propose « Défaire »', JSON.stringify(G1));
  await ev(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }); await page.keyboard.press('Control+z'); await pause(800);
  const G2 = await ev(() => ({ type: verite().find(x => x.cable === 'W-012').type, fiche: !$('inspecteur').hidden, cle: ($('ba-equip') || { dataset: {} }).dataset.cle }));
  ok(G2.type === 'DR20' && G2.fiche && /^fil#/.test(G2.cle), 'Ctrl+Z rend le DR20 de votre fichier, et la fiche reste ouverte', JSON.stringify(G2));

  console.log('\nD’UNE FICHE À L’AUTRE ; LE « ? »');
  await choisir('3', '300XC1'); await grand(); await onglet('cables');
  await ev(() => { allerAuPlan('1'); choisirBloc(app.dessin.comps.find(k => k.name === '103RL1')); }); await pause(700);
  const A1 = await lireGrand(), A1c = await ev(() => ($('ba-equip') || { dataset: {} }).dataset.cle);
  ok(A1c === 'bloc|103RL1' && A1.grand && A1.choisi === 'essentiel', 'une fiche qui s’ouvre sur un autre objet commence à L’essentiel (pas sur l’onglet de l’objet d’avant)', JSON.stringify([A1c, A1.choisi]));
  await choisir('1', 'fil:W-011'); await grand();
  await page.click('#nv-p-essentiel [data-choisir-bloc="102CB1"]'); await pause(800);
  const A2 = await lireGrand(), A2c = await ev(() => ($('ba-equip') || { dataset: {} }).dataset.cle);
  ok(A2c === 'bloc|102CB1' && A2.choisi === 'calibre', 'depuis la fiche d’un câble, « 102CB1 · 10 A » mène à son disjoncteur, droit sur son profil de charge et sa courbe (l’onglet Calibre : le lien le dit au survol)', JSON.stringify([A2c, A2.choisi]));
  await choisir('1', 'fil:W-011'); await grand();
  const bulle = () => ev(() => { const vus = [...document.querySelectorAll('.fi-q-bulle')].filter(x => !x.hidden && x.getBoundingClientRect().width > 0), b = vus[0]; return { n: vus.length, tete: b ? b.querySelector('.q-tete b').textContent.replace(/[  ]/g, ' ') : '', comprendre: !!(b && b.querySelector('[data-comprendre]')), dedans: !b || (r => r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0 && r.bottom <= innerHeight + 1)(b.getBoundingClientRect()) }; });
  await page.click('#ba-equip .fi-q[data-q="intensite"]'); await pause(300); const Q1 = await bulle();
  await page.click('#ba-equip .fi-q[data-q="chute"]'); await pause(300); const Q2 = await bulle();
  await page.keyboard.press('Escape'); await pause(300); const Q3 = await bulle(), Q3f = await ev(() => !$('inspecteur').hidden && document.body.classList.contains('insp-grand'));
  ok(Q1.n === 1 && Q1.tete === 'L’intensité admise' && Q1.comprendre && Q1.dedans && Q2.n === 1 && Q2.tete === 'La chute de tension' && Q2.dedans && Q3.n === 0 && Q3f,
    'le « ? » : une bulle, une seule à la fois (« L’intensité admise », puis « La chute de tension »), dans la fenêtre, avec « Comprendre → » ; Échap ferme la bulle, pas la fiche', JSON.stringify([Q1, Q2, Q3, Q3f]));
  await page.keyboard.press('Escape'); await pause(400);
  ok(await ev(() => !document.body.classList.contains('insp-grand')), 'Échap, ensuite, quitte la fiche en grand');
  ok(!erreurs.length, 'aucune erreur console', erreurs.slice(0, 3).join(' | '));
  await nav.close();
  console.log('\n' + (ko ? ko + ' échec(s) sur ' + total : total + ' / ' + total + ' contrôles passés — tout est vert'));
  process.exit(ko ? 1 : 0); })();
