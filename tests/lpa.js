/* ===========================================================================
   LA LPA EST LA SOMME DES ONGLETS PIÈCES (passe 87) — l'exemple, ligne à ligne.
       NODE_PATH=$(npm root -g) node tests/lpa.js
   Le lecteur lit, sur chaque fiche, « Ce qu'il faut pour le monter » ; la LPA
   (touche N, ses exports) annonce « tout ce qu'il faut commander pour monter
   le plan entier ». Les deux comptes n'en font qu'un : ce contrôle ouvre
   l'onglet Pièces de TOUS les objets de l'exemple — chaque équipement,
   barrette, prise de chaque folio, les barrettes que VOLTA ajoute (repère
   provisoire), chaque câble —, additionne ce qu'ils demandent et le compare,
   référence par référence, à `nomenclatureDuContrat` : les contacts à
   sertir (un par alvéole prise : 340AB1, trois et pas quatre), les
   obturateurs (une alvéole vide, un obturateur ; « selon la zone » tant que
   l'étanchéité n'est pas dite), les modules et leurs rails, les connecteurs
   d'accouplement (côté harness, à nous : la « référence retenue » du Suivi
   de fabrication ; inconnue, la LPA le dit), les prises de coupure, ce qui
   habille les connecteurs (raccords, cheminées, tyraps, bourrages), les
   câbles (nombre et longueur). Le connecteur que la fiche dit « fourni avec
   l'équipement » ne se commande pas : la LPA le cite en face de son
   accouplement, pour mémoire — CSV, Excel et dossier PDF compris. Le Suivi de
   fabrication est un onglet de la LPA (et une feuille de son classeur) : une
   ligne par pièce posée, avec les références mêmes de la LPA.
   Il tourne avec la batterie moteur (les onglets Pièces sont des objets de la
   page : Chromium, par Playwright, sans fenêtre).
   ========================================================================= */
const path = require('path');
const { chromium } = require('playwright');
const PAGE = 'file://' + path.join(__dirname, '..', 'index.html');
let total = 0, echecs = 0;
const ok = (nom, cond, mesure) => { total++; if (!cond) echecs++; console.log('  ' + (cond ? 'OK    ' : 'ÉCHEC ') + nom + (mesure ? '   — ' + mesure : '')); };
const titre = t => console.log('\n' + t);
const ACC = 'connecteur d’accouplement', FOURNI = 'fourni avec l’équipement';

(async () => {
  const nav = await chromium.launch(), page = await nav.newPage({ viewport: { width: 1440, height: 900 } });
  const erreurs = []; page.on('pageerror', e => erreurs.push(String(e && e.message || e).slice(0, 300)));
  await page.goto(PAGE); await page.waitForTimeout(900);
  await page.evaluate(() => atelier.exemple()); await page.waitForTimeout(2600);

  /* DANS LA PAGE : l'onglet Pièces de chaque objet, tel que le lecteur le lit (le DOM de la fiche en grand), puis la LPA. */
  const R = await page.evaluate(async () => { const pause = ms => new Promise(f => setTimeout(f, ms));
    const surLeFolio = async pl => { allerAuPlan(pl); for (let i = 0; i < 100 && !(app.dessin && app.plan === pl); i++) await pause(50); };
    // les groupes de l'onglet Pièces de la fiche ouverte : leur tête (titre, référence, ce qu'ils sont) et leurs lignes
    const lire = () => [...document.querySelectorAll('#inspecteur .vu-fab-g')].map(g => ({ titre: (g.querySelector('h4 > span:not(.id)') || {}).textContent || '', ref: (g.querySelector('h4 .id') || {}).textContent || '', sous: (g.querySelector('h4 small') || {}).textContent || '',
      lignes: [...g.querySelectorAll('.vu-fab-l')].map(l => { const r = l.querySelector('.vu-r b').textContent; return { q: +l.querySelector('.vu-q').firstChild.textContent, ref: r === '—' ? '' : r, role: (l.querySelector('.vu-r small') || {}).textContent || '', statut: (l.querySelector('.vu-st') || {}).textContent || '' }; }) }));
    const pieces = () => { ouvrirGrand(''); const ong = [...document.querySelectorAll('#ba-equip .nv-onglet')].map(x => x.dataset.onglet); if (!ong.includes('fabrication')) return null; activerOnglet('fabrication'); return lire(); };
    const bloc = nom => { if (NIVEAU.grand) reduireFiche(); montrerBloc(nom); return pieces(); };
    const fiches = [], vus = new Set();
    for (const pl of plans()) { await surLeFolio(pl);
      for (const c of app.dessin.comps) { const nom = c.name; if (c.kind === 'tag' || vus.has(nom)) continue; vus.add(nom);
        // un connecteur d'équipement : ses alvéoles prises (un contact chacune)
        const alveoles = {}; try { if (!estBornier(nom)) cavitesDe(nom).forEach(k => { alveoles[k.nom] = k.plan.utilises || 0; }); } catch (_) { }
        fiches.push({ nom, plan: pl, prise: estCoupure(nom), groupes: bloc(nom), alveoles }); } }
    // les barrettes que VOLTA ajoute : leur fiche s'ouvre sur leur folio
    for (const x of barrettesAjoutees()) { await surLeFolio(x.plan);
      fiches.push({ nom: x.nom, plan: x.plan, ajoutee: true, sur: x.sur, groupes: bloc(x.nom), cables: liaisonsDe(x.plan).filter(l => (l.de === x.nom || l.vers === x.nom) && l.de !== l.vers).length }); }
    // les câbles : la ligne « Le câble » de chaque fiche de câble de votre fichier
    const cables = [], parFolio = new Map(); verite().filter(l => liaisonComplete(l) && l.de !== l.vers && l.type).forEach(l => (parFolio.get(l.plan) || parFolio.set(l.plan, []).get(l.plan)).push(l));
    for (const [pl, ls] of parFolio) { await surLeFolio(pl);
      for (const l of ls) { if (NIVEAU.grand) reduireFiche(); montrerFil(l); const gs = pieces() || [], g = gs.find(x => x.titre === 'Le câble'); cables.push(g ? g.lignes[0] : null); } }
    if (NIVEAU.grand) reduireFiche();
    const N = nomenclatureDuContrat(), lignes = lignesNomenclature(N);
    // le Suivi de fabrication : la « référence retenue » de chaque connecteur d'équipement (un disjoncteur s'y range encore en
    // connecteur : une cosse, sans accouplement — la LPA le compte à part, avec les disjoncteurs)
    const suivi = {}; suiviDuContrat(verite(), app.bible, app.nom || 'contrat', n => app.contrat.designations.get(n) || '').filter(x => x.nature === 'connecteur' && !estDisjoncteur(x.repere.split(' ')[0])).forEach(x => { suivi[x.repere] = x.reference || ''; });
    // le dossier PDF : le texte de ses pages LPA (les chaînes des opérateurs Tj)
    let pdf = ''; try { pdf = pagesNomenclaturePdf('Plan d’exemple').map(p => p.ops()).join('\n'); } catch (e) { pdf = 'ERREUR ' + e.message; }
    // l'étanchéité dite (340AB1 A étanche) : ses obturateurs sont dus — la fiche et la LPA le disent ensemble ; puis on rend
    await surLeFolio('2'); const avant = app.contrat.raccords.get('340AB1|A'); app.contrat.raccords.set('340AB1|A', { ...(avant || {}), etanche: true });
    const gE = (bloc('340AB1') || []).find(g => g.titre === 'Connecteur A'), NE = nomenclatureDuContrat();
    const etanche = { fiche: gE ? gE.lignes.filter(l => /^obturateur/.test(l.role)).map(l => l.statut) : null, lpa: NE.obturateurs.filter(x => x.ou.includes('340AB1 A')).map(x => x.note) };
    if (avant) app.contrat.raccords.set('340AB1|A', avant); else app.contrat.raccords.delete('340AB1|A'); if (NIVEAU.grand) reduireFiche();
    etanche.rendu = JSON.stringify(nomenclatureDuContrat().obturateurs) === JSON.stringify(N.obturateurs);
    // (le lecteur) LE SUIVI ENTRE DANS LA LPA : son onglet, la feuille du classeur (l'entrée du menu Exporter la fabrique), son CSV
    ficheNomenclature('suivi'); await pause(200);
    const tabs = [...document.querySelectorAll('#fiche [data-no-vue]')].map(b => ({ t: b.textContent, on: b.getAttribute('aria-selected') === 'true', w: Math.round(b.getBoundingClientRect().width) }));
    const ong = { tabs, sections: [...document.querySelectorAll('#fiche .no-st')].map(h => h.firstChild.textContent), lignes: document.querySelectorAll('#fiche .no-table tbody tr').length, csv: ($('no-csv') || {}).textContent };
    fermerFiche(true);
    const pris = [], tl = window.telecharger; window.telecharger = (b, n) => { pris.push({ b, n }); }; try { telecharger = window.telecharger; } catch (_) { }
    try { await MENU.actions.suivi(); exporterSuivi(); } catch (e) { pris.push({ erreur: e.message }); }
    window.telecharger = tl; try { telecharger = tl; } catch (_) { }
    const xl = pris.find(x => x.n && /\.xlsx$/.test(x.n)), cs = pris.find(x => x.n && /suivi\.csv$/.test(x.n));
    let classeur = null; if (xl) { const wb = XLSX.read(new Uint8Array(await xl.b.arrayBuffer()), { type: 'array' }); classeur = { feuilles: wb.SheetNames, suivi: wb.Sheets.Suivi ? XLSX.utils.sheet_to_json(wb.Sheets.Suivi, { header: 1 }) : [] }; }
    const csvSuivi = cs ? { nom: cs.n, lignes: (await cs.b.text()).replace(/^﻿/, '').trim().split('\n') } : null;
    const net = v => JSON.parse(JSON.stringify(v, (k, x) => k === 'cable' && x && typeof x === 'object' ? { masse: x.masse } : k === 'outillage' || k === 'verdict' ? undefined : x));
    return { fiches, cables, N: net(N), lignes, pdf, suivi, etanche, ong, classeur, csvSuivi, pris: pris.map(x => x.n || x.erreur) }; });

  const F = R.fiches, N = R.N;
  titre('1. CHAQUE OBJET DE L’EXEMPLE A SON ONGLET PIÈCES');
  const sans = F.filter(f => !f.groupes).map(f => f.nom);
  ok('les ' + F.length + ' fiches de l’exemple (équipements, barrettes, prises, les ' + F.filter(f => f.ajoutee).length + ' barrettes ajoutées par VOLTA) : chacune a son onglet Pièces — sauf le disjoncteur (une cosse : ni contact, ni raccord)',
    F.length > 60 && sans.every(n => /CB\d/.test(n)) && F.filter(f => f.ajoutee).length === 3, 'sans onglet : ' + (sans.join(', ') || 'aucune'));
  ok('chaque câble de votre fichier a sa ligne « Le câble »', R.cables.length === N.fils && R.cables.every(Boolean), R.cables.length + ' fiches de câble · ' + N.fils + ' câbles dans la LPA');

  /* LA SOMME DES FICHES, rangée comme la LPA : une clé par section et par référence, avec les repères où elle va */
  const S = new Map(), L = new Map(), mettre = (M, sec, cle, q, ou) => { const k = sec + '¦' + cle, e = M.get(k) || M.set(k, { q: 0, ou: new Set() }).get(k); e.q += q; (ou || []).forEach(o => e.ou.add(o)); };
  const section = l => l.role === 'prise de coupure' ? 'connecteurs' : l.role === 'contact à sertir' ? 'contacts' : l.role === ACC ? 'accouplements' : /^obturateur/.test(l.role) ? 'obturateurs' : l.role === 'module de jonction' ? 'modules' : /^rail\b/.test(l.role) ? 'rails' : 'habits';
  F.forEach(f => (f.groupes || []).forEach((g, i) => {
    g.lignes.forEach(l => { const s = section(l); mettre(S, s, s === 'habits' ? l.role + '|' + l.ref : s === 'accouplements' ? l.ref || 'inconnu|' + g.ref : l.ref, l.q, s === 'rails' ? [] : [f.nom]); }); }));
  const poser = (sec, cle, x) => mettre(L, sec, cle, x.n, sec === 'rails' ? [] : x.ou.map(o => o.split(' ')[0]));
  N.contacts.forEach(x => poser('contacts', x.reference + (x.accessoire ? ' + ' + x.accessoire : ''), x));
  N.obturateurs.forEach(x => poser('obturateurs', x.reference, x)); N.modules.forEach(x => poser('modules', x.reference, x)); N.rails.forEach(x => poser('rails', x.reference, x));
  N.accouplements.forEach(x => poser('accouplements', x.reference || 'inconnu|' + x.face, x)); N.habits.forEach(x => poser('habits', x.quoi + '|' + x.reference, x)); N.connecteurs.forEach(x => poser('connecteurs', x.reference, x));
  const ecarts = [...new Set([...S.keys(), ...L.keys()])].filter(k => { const a = S.get(k), b = L.get(k); return !a || !b || a.q !== b.q || [...a.ou].sort().join() !== [...b.ou].sort().join(); })
    .map(k => k + ' : fiches ' + (S.get(k) ? S.get(k).q : 0) + ', LPA ' + (L.get(k) ? L.get(k).q : 0));
  const somme = (M, sec) => [...M].filter(([k]) => k.startsWith(sec + '¦')).reduce((s, [, e]) => s + e.q, 0), tot = sec => somme(S, sec) + ' / ' + somme(L, sec);
  titre('2. LA LPA, LIGNE À LIGNE : LA SOMME DES ONGLETS PIÈCES');
  ok('chaque référence que demandent les fiches est dans la LPA, en même quantité, pour les mêmes repères — et la LPA n’en a pas d’autre', !ecarts.length && L.size > 30, ecarts.length ? ecarts.slice(0, 6).join(' · ') : L.size + ' lignes, toutes égales');
  ok('les contacts à sertir : la même somme (fiches / LPA)', somme(S, 'contacts') === somme(L, 'contacts') && somme(L, 'contacts') > 200, tot('contacts'));
  ok('les obturateurs que demandent les fiches entrent dans la LPA (avant : aucun) — barrettes, connecteurs, prises, barrettes ajoutées', somme(L, 'obturateurs') === somme(S, 'obturateurs') && somme(L, 'obturateurs') >= 196, tot('obturateurs'));
  ok('les bourrages de ruban silicone des EN 2997 entrent dans la LPA (avant : aucun)', (L.get('habits¦bourrage|ruban silicone') || {}).q === 10 && (S.get('habits¦bourrage|ruban silicone') || {}).q === 10, 'LPA ' + ((L.get('habits¦bourrage|ruban silicone') || {}).q || 0));
  ok('un même nom pour une pièce sur la fiche et dans la LPA : « tyrap » (vos mots), l’obturateur avec sa taille de contact', !!L.get('habits¦tyrap|NSA935401-03') && N.obturateurs.every(x => /^contact libre taille \S+$/.test(x.pour)), [...new Set(N.obturateurs.map(x => x.pour))].join(', '));

  titre('3. UN CONTACT PAR ALVÉOLE PRISE');
  const ab1 = F.find(f => f.nom === '340AB1'), gA = ab1 && (ab1.groupes || []).find(g => g.titre === 'Connecteur A'), nAB1 = gA ? gA.lignes.filter(l => l.role === 'contact à sertir').reduce((s, l) => s + l.q, 0) : -1;
  ok('340AB1 : deux câbles sur la borne 4, la barrette que VOLTA ajoute (VT2) les reprend — trois contacts pour trois alvéoles (avant : quatre)', nAB1 === 3 && ab1.alveoles.A === 3, nAB1 + ' contacts · ' + (ab1 ? ab1.alveoles.A : '?') + ' alvéoles prises');
  const faux = []; F.filter(f => !f.prise && !f.ajoutee).forEach(f => (f.groupes || []).filter(g => /^Connecteur /.test(g.titre)).forEach(g => { const c = g.titre.replace(/^Connecteur /, ''), n = g.lignes.filter(l => l.role === 'contact à sertir').reduce((s, l) => s + l.q, 0);
    if (f.alveoles[c] != null && n !== f.alveoles[c]) faux.push(f.nom + ' ' + c + ' : ' + n + ' pour ' + f.alveoles[c]); }));
  ok('chaque connecteur d’équipement : autant de contacts que d’alvéoles prises (600XC4 A : treize, la borne A11 en reçoit deux)', !faux.length, faux.join(' · ') || 'tous');
  const vt2 = F.find(f => f.ajoutee && f.sur === '340AB1:4'), nVT2 = vt2 && vt2.groupes ? vt2.groupes.flatMap(g => g.lignes).filter(l => l.role === 'contact à sertir').reduce((s, l) => s + l.q, 0) : -1;
  ok('la barrette ajoutée sur 340AB1:4 compte les siens, un par câble (le câble à créer et les deux qu’elle reprend) — et la LPA aussi', !!vt2 && nVT2 === vt2.cables && nVT2 === 3 && N.contacts.some(x => x.ou.includes(vt2.nom + ' (ajoutée par VOLTA)')), (vt2 ? vt2.nom : '?') + ' : ' + nVT2 + ' contacts pour ' + (vt2 ? vt2.cables : '?') + ' câbles');

  titre('4. LE CONNECTEUR D’ACCOUPLEMENT SE COMMANDE ; CELUI DE L’ÉQUIPEMENT, FOURNI, SE CITE POUR MÉMOIRE');
  const gF = F.flatMap(f => (f.groupes || []).filter(g => g.sous === FOURNI).map(g => ({ f, g, c: g.titre.replace(/^Connecteur /, ''), acc: g.lignes.filter(l => l.role === ACC) })));
  const pasUn = gF.filter(x => x.acc.length !== 1 || x.acc[0].q !== 1).map(x => x.f.nom + ' ' + x.c), autre = gF.filter(x => x.acc.length === 1 && x.acc[0].ref !== (R.suivi[x.f.nom + ' ' + x.c] || '')).map(x => x.f.nom + ' ' + x.c + ' : ' + (x.acc[0].ref || '—') + ' / Suivi ' + (R.suivi[x.f.nom + ' ' + x.c] || '—'));
  ok('chaque connecteur fourni avec l’équipement : une ligne « connecteur d’accouplement » dans ses Pièces, la « référence retenue » du Suivi de fabrication', gF.length >= 58 && !pasUn.length && !autre.length, (pasUn.concat(autre).slice(0, 4).join(' · ')) || gF.length + ' connecteurs, chacun son accouplement');
  const lpaSuivi = N.accouplements.flatMap(x => x.ou.filter(o => (R.suivi[o] || '') !== x.reference).map(o => o + ' : LPA ' + (x.reference || '—') + ' / Suivi ' + (R.suivi[o] || '—')));
  ok('la LPA et le Suivi disent la même référence pour chaque connecteur', !lpaSuivi.length && N.accouplements.reduce((s, x) => s + x.n, 0) === Object.keys(R.suivi).length, lpaSuivi.slice(0, 4).join(' · ') || Object.keys(R.suivi).length + ' connecteurs');
  const connus = N.accouplements.filter(x => x.reference).map(x => x.n + ' × ' + x.reference + ' face à ' + x.face).join(' · ');
  ok('l’exemple : 3 × EN2997Y2A08S face à EN2997Y1A08P (340AB1, 340AB2, 431PR1), 2 × ABS0865-12 face à ABS0864-12 (115CD, 118CD) — la bible les donne', /^3 × EN2997Y2A08S face à EN2997Y1A08P · 2 × ABS0865-12 face à ABS0864-12$/.test(connus), connus);
  const pnF = new Set(gF.map(x => x.g.ref)), commandes = [...N.contacts, ...N.obturateurs, ...N.modules, ...N.rails, ...N.accouplements, ...N.connecteurs, ...N.habits].map(x => x.reference).filter(Boolean);
  const inc = N.accouplements.filter(x => !x.reference), csvInc = R.lignes.filter(l => l[0] === 'Accouplements' && !l[1]);
  ok('la bible ne donne pas l’accouplement : la LPA le dit (« accouplement de … inconnu : manque dans la bible »), sans commander le connecteur de l’équipement à sa place',
    inc.length > 0 && inc.every(x => x.note === 'manque dans la bible' && pnF.has(x.face)) && csvInc.length === inc.length && csvInc.every(l => /^accouplement de \S+ inconnu : manque dans la bible$/.test(l[2])) && !commandes.some(r => pnF.has(r)),
    inc.reduce((s, x) => s + x.n, 0) + ' connecteurs, ' + inc.length + ' références d’équipement sans accouplement · ' + (csvInc[0] ? csvInc[0][2] : ''));
  ok('le connecteur fourni reste cité, pour mémoire, en face de son accouplement — sans quantité à lui', N.accouplements.every(x => x.face && x.face.split(', ').every(p => pnF.has(p))) && N.accouplements.reduce((s, x) => s + x.n, 0) === gF.length && N.connecteurs.every(x => x.nature === 'prise de coupure') && N.connecteurs.reduce((s, x) => s + x.n, 0) === 5,
    gF.length + ' connecteurs fournis · ' + pnF.size + ' part numbers · 5 prises de coupure à commander');
  const sec = s => R.lignes.filter(l => l[0] === s).reduce((t, l) => t + l[3], 0);
  ok('le CSV et l’Excel suivent la LPA, section par section, chaque ligne avec sa quantité', R.lignes.every(l => typeof l[3] === 'number') && sec('Contacts') === somme(L, 'contacts') && sec('Obturateurs') === somme(L, 'obturateurs') && sec('Accouplements') === gF.length && sec('Modules') === somme(L, 'modules') && sec('Prises') === 5 && sec('Habillage') === somme(L, 'habits'),
    ['Contacts', 'Obturateurs', 'Accouplements', 'Modules', 'Prises', 'Habillage'].map(s => s + ' ' + sec(s)).join(' · '));
  ok('le dossier PDF : sa page LPA dit les obturateurs, les accouplements et les prises de coupure', /Obturateurs des contacts libres/.test(R.pdf) && /accouplement/.test(R.pdf) && /Prises de coupure/.test(R.pdf) && !/Connecteurs et prises/.test(R.pdf), R.pdf.startsWith('ERREUR') ? R.pdf : 'trois sections trouvées');

  titre('5. LES OBTURATEURS : UNE ALVÉOLE VIDE, UN OBTURATEUR — « SELON LA ZONE » TANT QUE L’ÉTANCHÉITÉ N’EST PAS DITE');
  const libres = F.filter(f => !f.prise && !f.ajoutee).reduce((s, f) => s + (f.groupes || []).filter(g => /^Connecteur /.test(g.titre)).reduce((t, g) => t + g.lignes.filter(l => /^obturateur/.test(l.role)).reduce((u, l) => u + l.q, 0), 0), 0);
  ok('chaque obturateur de l’exemple dit « selon la zone » (aucun connecteur n’y est dit étanche ; une barrette, toujours)', N.obturateurs.every(x => /selon la zone/.test(x.note)) && F.every(f => (f.groupes || []).every(g => g.lignes.filter(l => /^obturateur/.test(l.role)).every(l => /selon la zone/.test(l.statut)))), libres + ' obturateurs de connecteurs d’équipement · ' + somme(L, 'obturateurs') + ' en tout');
  const E = R.etanche;
  ok('dit étanche (340AB1 A), ses obturateurs sont dus : plus de « selon la zone », sur la fiche comme dans la LPA — puis tout revient', !!E.fiche && E.fiche.length > 0 && E.fiche.every(s => !/selon la zone/.test(s)) && E.lpa.length > 0 && E.lpa.every(s => !/selon la zone/.test(s)) && E.rendu, JSON.stringify({ fiche: E.fiche, lpa: E.lpa }));

  titre('6. LE SUIVI DE FABRICATION ENTRE DANS LA LPA : UN ONGLET, UNE FEUILLE, LES MÊMES RÉFÉRENCES');
  const O = R.ong;
  ok('la LPA a deux onglets de même largeur, « Pièces » et « Suivi » ; le Suivi se range par pièce (connecteurs d’accouplement, barrettes, prises de coupure)', O.tabs.map(t => t.t).join('|') === 'Pièces|Suivi' && O.tabs[1].on && Math.abs(O.tabs[0].w - O.tabs[1].w) <= 1 && O.sections.join('|') === 'Connecteurs d’accouplement|Barrettes|Prises de coupure' && O.lignes === N.suivi.length && O.csv === 'Suivi en CSV',
    O.tabs.map(t => t.t + ' ' + t.w + ' px').join(' · ') + ' · ' + O.lignes + ' lignes');
  const refDe = (liste, rep) => (liste.find(x => x.ou.includes(rep)) || {}).reference;
  const suiviFaux = N.suivi.filter(x => { if (x.nature === ACC) return (refDe(N.accouplements, x.repere) || '') !== x.reference;
    if (/^barrette/.test(x.nature)) return !x.reference || !x.reference.split(' + ').every(m => N.modules.some(y => y.reference === m && y.ou.includes(x.repere)));
    if (x.nature === 'prise de coupure') return refDe(N.connecteurs, x.repere) !== x.reference; return true; }).map(x => x.repere + ' : ' + x.reference);
  const nG = n => N.suivi.filter(x => n.test(x.nature)).length;
  ok('chaque ligne du Suivi dit la référence que commande l’onglet Pièces (l’accouplement, les modules, la prise) — barrettes ajoutées par VOLTA comprises', !suiviFaux.length && nG(/^connecteur/) === 58 && nG(/^barrette$/) === 4 && nG(/^barrette ajoutée/) === 3 && nG(/^prise/) === 5,
    suiviFaux.slice(0, 4).join(' · ') || N.suivi.length + ' lignes : ' + nG(/^connecteur/) + ' connecteurs, ' + nG(/^barrette$/) + ' barrettes, ' + nG(/^barrette ajoutée/) + ' ajoutées, ' + nG(/^prise/) + ' prises');
  const C6 = R.classeur;
  ok('l’entrée du menu Exporter fabrique le classeur de la LPA : deux feuilles, « LPA » et « Suivi », une ligne par pièce posée, sans numéro de câble', !!C6 && C6.feuilles.join('|') === 'LPA|Suivi' && C6.suivi.length === N.suivi.length + 1 && C6.suivi[0].join('|') === 'Plan|Repère|Nature|Référence posée|Votre fichier|Bornes utilisées|Bornes|Shunts|Câbles|Routes|Folios',
    C6 ? C6.feuilles.join(' · ') + ' · ' + (C6.suivi.length - 1) + ' lignes de Suivi' : 'aucun classeur : ' + R.pris.join(', '));
  ok('le Suivi en CSV sort encore (son onglet, l’ancien nom de fichier), avec les mêmes lignes', !!R.csvSuivi && /suivi\.csv$/.test(R.csvSuivi.nom) && R.csvSuivi.lignes.length === N.suivi.length + 1 && /^Plan;Repère;Nature;Référence posée/.test(R.csvSuivi.lignes[0]),
    R.csvSuivi ? R.csvSuivi.nom + ' · ' + (R.csvSuivi.lignes.length - 1) + ' lignes' : 'aucun CSV');

  titre('7. LES CÂBLES : LA LIGNE « LE CÂBLE » DE CHAQUE FICHE');
  const C = new Map(); R.cables.filter(Boolean).forEach(l => { const m = /^([\d\s,.]+) m/.exec(l.role), e = C.get(l.ref) || C.set(l.ref, { n: 0, m: 0 }).get(l.ref); e.n += l.q; e.m += m ? +m[1].replace(/\s/g, '').replace(',', '.') : NaN; });
  const ecC = N.cables.filter(x => { const e = C.get(x.reference); return !e || e.n !== x.n || Math.abs(e.m - x.longueur) > 0.05 * x.n; }).map(x => x.reference + ' : fiches ' + (C.get(x.reference) ? C.get(x.reference).n + ' · ' + C.get(x.reference).m.toFixed(1) + ' m' : '0') + ', LPA ' + x.n + ' · ' + x.longueur.toFixed(1) + ' m');
  ok('chaque type : autant de câbles et la même longueur dans les fiches et dans la LPA', !ecC.length && C.size === N.cables.length, ecC.join(' · ') || N.cables.map(x => x.n + ' ' + x.reference).join(' · '));

  titre('BILAN');
  ok('aucune erreur dans la page', erreurs.length === 0, erreurs.slice(0, 3).join(' | ') || 'aucune');
  console.log('\n  ' + (total - echecs) + ' / ' + total + ' contrôles passés' + (echecs ? '  —  ' + echecs + ' ÉCHEC(S)' : '  —  tout est vert'));
  await nav.close(); process.exit(echecs ? 1 : 0);
})().catch(e => { console.log('ÉCHEC : ' + (e && e.stack || e)); process.exit(1); });
