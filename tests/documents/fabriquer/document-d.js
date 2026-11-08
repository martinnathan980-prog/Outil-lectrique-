/* ===========================================================================
   DOCUMENT D — un gros document de 300 pages, surtout fait de schémas dessinés
   ---------------------------------------------------------------------------
   Ce qu'un dossier de câblage épais contient, inventé de bout en bout :
     · une page de garde, un sommaire, la liste des révisions ;
     · des notes générales — trois liaisons y sont écrites EN CLAIR, dans une
       phrase (« la broche 2 de 861HT1 est reliée à la masse 961G… ») ;
     · une page de symboles (des dessins qui ne sont pas du câblage) ;
     · TROIS CHAPITRES de schémas, trois « logiciels » (schema.js : A, B, C),
       chacun son numéro de plan et ses folios numérotés à partir de 1 (le
       lecteur : « le folio recommence à 1 à chaque plan »), tous dans la forme
       de ses vrais schémas — boîtes pleines, symboles dans les boîtes,
       barrettes en pastilles sur un pointillé, masses à trois barres,
       cartouches en français ; des renvois d'un folio à l'autre qui disent le
       folio et la zone (« F12/B4 ») et, vers un autre chapitre, son numéro de
       plan devant (« SC-4520-320 F12/B4 ») ; des numéros de fil sur une partie
       des folios (la moitié du chapitre 1, tout le chapitre 2, aucun au 3) ;
     · des TABLEAUX de liaisons (un faisceau décrit seulement en tableau) ;
     · un index des équipements, une dernière page.
   Les folios sont générés au hasard (une graine : tout se rejoue), puis
   composés ; un fil que la place refuse est retiré, et la vérité ne garde que
   ce qui est dessiné (ou écrit, pour les tableaux et les notes).
   =========================================================================== */
'use strict';
const { hasard, choisir, entier, melanger, toile, esc } = require('./commun');
const { preparer, composerFolio, construireDocument, deviceDe } = require('./document');

const DOC = { numero: 'MC-4520-000', titre: 'DOSSIER DE CÂBLAGE — SYSTÈMES CARBURANT, COMMANDES ET CAPTEURS', indice: 'D', auteur: 'BE CÂBLAGE', date: '02/10/2026' };
const CHAPITRES = [
  { style: 'A', numero: 'SC-4520-310', titre: 'DISTRIBUTION PRIMAIRE ET PROTECTIONS', titreCourt: 'DISTRIBUTION PRIMAIRE', folios: 100, plage: [100, 399], masses: [910, 939], faisceau: 'FX-4520-31', indice: 'C', graine: 310 },
  { style: 'B', numero: 'SC-4520-320', titre: 'COMMANDES ET SIGNALISATION', titreCourt: 'COMMANDES', folios: 92, plage: [400, 699], masses: [940, 969], faisceau: 'FX-4520-32', indice: 'B', graine: 320 },
  { style: 'C', numero: 'SC-4520-330', titre: 'POMPES, VANNES ET CAPTEURS', titreCourt: 'POMPES ET CAPTEURS', folios: 88, plage: [700, 839], masses: [970, 999], faisceau: 'FX-4520-33', indice: 'B', graine: 330 }];

/* ---- le vocabulaire --------------------------------------------------------------------------------------------- */
const SYSTEMES = ['CARBURANT', 'HYDRAULIQUE', 'DÉGIVRAGE', 'ÉCLAIRAGE', 'VENTILATION', 'CONDITIONNEMENT', 'FREINAGE', 'ESSUIE-GLACE', 'NAVIGATION', 'PORTES', 'CABINE', 'TRAIN', 'INCENDIE', 'DÉMARRAGE', 'LUBRIFICATION'];
const DESIG = { CB: 'DISJ.', RL: 'RELAIS', CT: 'CONTACTEUR', SW: 'INTER', PB: 'BOUTON', LP: 'VOYANT', PM: 'POMPE', VL: 'VANNE', CP: 'CALCULATEUR', SP: 'CAPTEUR', ST: 'SONDE', HT: 'RÉCHAUFFEUR', MT: 'MOTEUR', PR: 'PRESSOSTAT', XC: 'CONNECTEUR', TB: 'BORNIER', DI: 'DIODE', FU: 'FUSIBLE', RS: 'RÉSISTANCE' };
const PNS = { boite: ['EN2997Y1A08P', 'EN2997Y1A12S', 'EN2997Y1A04P', 'EN3646A1410PN', 'EN3645W1214AN', 'D38999/26WB35PN', 'MS27467T15B35P'], CP: ['EN4165-2M', 'EN4165-3M', 'D38999/26WD35SN'], RL: ['M83536/1-021M', 'M83536/1-024M'], SW: ['MS24523-22', 'MS24524-23'], LP: ['MS25041-2', 'MS25041-4'], TB: ['MS27212-1-8', 'MS27212-1-12'], DI: ['D2-1A'] };
const CALIBRES = ['1 A', '2 A', '3 A', '5 A', '7,5 A', '10 A', '15 A', '20 A'];
const SIGNAUX = ['ALIM', 'CDE', 'ÉTAT', '+28 V', 'RETOUR', 'ALARME', 'MESURE', 'VALIDATION'];

/* ---- un chapitre : ses folios, leurs équipements, leurs fils ---------------------------------------------------- */
function genererChapitre(ch, cat, pris, debutN) {
  const rnd = hasard(ch.graine), folios = [], fils = [], st = ch.style;
  let num = ch.plage[0]; const repere = code => { for (;;) { const r = num + code + entier(rnd, 1, 4); num += entier(rnd, 1, 2); if (num > ch.plage[1]) num = ch.plage[0] + entier(rnd, 0, 40); if (!pris.has(r)) { pris.add(r); return r; } } };
  const sys = () => choisir(rnd, SYSTEMES);
  for (let k = 1; k <= ch.folios; k++) { const nCol = entier(rnd, 3, 4), sujet = sys(), eqs = [], slots = new Map(), nF = debutN + k - 1;
    const masses = [ch.masses[0] + entier(rnd, 0, ch.masses[1] - ch.masses[0]) + 'G', ch.masses[0] + entier(rnd, 0, ch.masses[1] - ch.masses[0]) + 'G'];
    const ajouter = (code, genre, col, plus = {}) => { const rep = repere(code), e = { genre, desig: (DESIG[code] || 'ÉQUIPEMENT') + ' ' + sujet + (genre === 'disjoncteur' ? '' : ' ' + entier(rnd, 1, 4)), pn: choisir(rnd, PNS[code] || PNS[genre === 'boite' ? 'boite' : 'boite']), ...plus };
      if (genre === 'disjoncteur') { e.calibre = choisir(rnd, CALIBRES); e.pn = 'MS3320-' + e.calibre.replace(' A', '').replace(',', '.'); delete e.desig; }
      if (genre === 'prise' || genre === 'barrette') delete e.desig;
      cat[rep] = e; eqs.push([rep, col]); slots.set(rep, { e, col, libres: [], n: 0 }); return rep; };
    // les colonnes : des sources et des protections, des relais et des barrettes, des charges
    const plan = [];
    plan.push(choisir(rnd, [['cb', 'cb', 'cb'], ['cb', 'cb'], ['calc'], ['inter', 'inter'], ['capteur', 'capteur'], ['calc', 'cb']]));
    for (let c = 1; c < nCol - 1; c++) plan.push(choisir(rnd, [['relais', 'relais'], ['relais'], ['barrette'], ['prise'], ['relais', 'prise'], ['barrette', 'relais'], ['tb']]));
    plan.push(choisir(rnd, [['charge', 'charge', 'charge'], ['charge', 'lampe'], ['lampe', 'lampe', 'charge'], ['calc'], ['charge', 'charge']]));
    plan.forEach((liste, c) => liste.forEach(sorte => {
      if (sorte === 'cb') { const r = ajouter('CB', 'disjoncteur', c); slots.get(r).libres.push(['1', 'G'], ['2', 'D']); }
      else if (sorte === 'relais') { const r = ajouter(rnd() < 0.85 ? 'RL' : 'CT', 'relais', c); slots.get(r).libres.push(['X1', 'G'], ['A1', 'D'], ['A2', 'D'], ['A3', 'D']); slots.get(r).masse = 'X2'; }
      else if (sorte === 'calc') { const r = ajouter('CP', 'boite', c, { connecteurs: true, largeur: 40 }); const s = slots.get(r); for (const L of ['A', 'B']) for (let i = 1; i <= entier(rnd, 3, 6); i++) s.libres.push([L + entier(rnd, i * 3 - 2, i * 3), '*']); }
      else if (sorte === 'inter') { const r = ajouter(rnd() < 0.7 ? 'SW' : 'PB', 'inter', c, { bornes: ['1', '2', '3'] }); slots.get(r).libres.push(['1', '*'], ['2', '*'], ['3', '*']); }
      else if (sorte === 'capteur') { const code = choisir(rnd, ['SP', 'ST', 'PR']), r = ajouter(code, 'boite', c, { largeur: 30 }); slots.get(r).libres.push(['1', '*'], ['2', '*'], ['3', '*'], ['4', '*']); slots.get(r).blinde = true; }
      else if (sorte === 'tb') { const r = ajouter('TB', 'boite', c, { largeur: 25 }); for (let i = 1; i <= 6; i++) slots.get(r).libres.push([String(i), '*']); }
      else if (sorte === 'barrette') { const n = entier(rnd, 2, 4), lettres = 'ABCDEFGH'.slice(0, n + entier(rnd, 1, 3)), r = ajouter('VT', 'barrette', c, { modules: [{ num: '51', lettres, bus: [lettres.slice(0, n)], typeBus: 'DR22', pn: 'M81714/60-22-1' }], pn: 'M81714/60-22-1' });
        const s = slots.get(r); s.libres.push(['51A', 'G']); for (let i = 1; i < n; i++) s.libres.push(['51' + lettres[i], 'D']); }
      else if (sorte === 'prise') { const lettres = 'ABCDEF'.slice(0, entier(rnd, 2, 4)), r = ajouter('VC', 'prise', c, { lettres, pn: 'EN3646A10' + String(lettres.length).padStart(2, '0') + 'PN' }); const s = slots.get(r); [...lettres].forEach(l => s.libres.push([l, 'G'], [l, 'D'])); }
      else if (sorte === 'lampe') { const r = ajouter('LP', 'lampe', c); slots.get(r).libres.push(['1', '*']); slots.get(r).masse = '2'; }
      else { const code = choisir(rnd, ['PM', 'VL', 'MT', 'HT']), r = ajouter(code, 'boite', c, { largeur: 30 }); slots.get(r).libres.push(['1', '*'], ['3', '*']); slots.get(r).masse = '2'; } }));
    // les fils entre colonnes voisines : un bout libre côté droit à gauche, un bout libre côté gauche à droite
    const prendre = (rep, cote) => { const s = slots.get(rep), i = s.libres.findIndex(([, c]) => c === cote || c === '*'); if (i < 0) return null; return s.libres.splice(i, 1)[0][0]; };
    const typeDe = (a, b) => { const sa = slots.get(a), sb = slots.get(b); if ((sa && sa.blinde) || (sb && sb.blinde)) return rnd() < 0.7 ? 'MLB24' : 'MLB22';
      const g = [sa && sa.e.genre, sb && sb.e.genre]; if (g.includes('disjoncteur') || g.includes('prise')) return choisir(rnd, ['DR16', 'DR18', 'DR20']); return choisir(rnd, ['DR20', 'DR22', 'DR22', 'DR24']); };
    for (let c = 0; c + 1 < nCol; c++) { const G = eqs.filter(e => e[1] === c).map(e => e[0]), D = eqs.filter(e => e[1] === c + 1).map(e => e[0]);
      for (let essai = 0; essai < 14; essai++) { const a = choisir(rnd, G), b = choisir(rnd, D); const pa = prendre(a, 'D'); if (!pa) continue; const pb = prendre(b, 'G'); if (!pb) { slots.get(a).libres.push([pa, 'D']); continue; }
        fils.push([a + ':' + pa, b + ':' + pb, typeDe(a, b), nF]); } }
    // les masses : la broche de masse des charges et des relais
    slots.forEach((s, rep) => { if (s.masse) fils.push([rep + ':' + s.masse, 'masse:' + choisir(rnd, masses), choisir(rnd, ['DR20', 'DR22']), nF]); });
    // un second fil sur une broche déjà prise (un T près d'elle), parfois
    if (rnd() < 0.3) { const boites = eqs.filter(e => cat[e[0]].genre === 'boite' && e[1] < nCol - 1); const loc = fils.filter(w => w[3] === nF && w[4] == null && boites.some(b => w[0].startsWith(b[0] + ':')));
      if (loc.length) { const w = choisir(rnd, loc), [rep] = w[0].split(':'), c = cat[rep] && slots.get(rep).col; const cible = eqs.filter(e => e[1] === c + 1).map(e => e[0]); const b = cible.length && choisir(rnd, cible), pb = b && prendre(b, 'G'); if (pb) fils.push([w[0], b + ':' + pb, w[2], nF]); } }
    // les numéros de fil : la moitié des folios du chapitre 1, tout le chapitre 2, aucun au chapitre 3
    const numeros = st === 'B' || (st === 'A' && rnd() < 0.5);
    folios.push({ n: nF, folioCartouche: k, numero: ch.numero, folios: ch.folios, style: st, titre: sujet + ' ' + k, titreCourt: ch.titreCourt, indice: ch.indice, faisceau: ch.faisceau, eqs, slots, numeros });
  }
  // les renvois : des bouts restés libres, d'un folio à un folio un peu plus loin dans le chapitre
  folios.forEach((f, i) => { const n = entier(rnd, 1, 3);
    for (let r = 0; r < n; r++) { const g = folios[i + entier(rnd, 1, 3)]; if (!g) break;
      const libre = (F, cote) => { const cands = [...F.slots.entries()].filter(([, s]) => s.libres.some(([, c]) => c === cote || c === '*')); if (!cands.length) return null; const [rep, s] = choisir(rnd, cands); const j = s.libres.findIndex(([, c]) => c === cote || c === '*'); return rep + ':' + s.libres.splice(j, 1)[0][0]; };
      const a = libre(f, 'D') || libre(f, 'G'), b = a && (libre(g, 'G') || libre(g, 'D')); if (!a || !b) continue;
      fils.push([a, b, choisir(rnd, ['DR20', 'DR22', 'DR24']), f.n, g.n, choisir(rnd, SIGNAUX) + ' ' + choisir(rnd, SYSTEMES)]); } });
  folios.forEach(f => { delete f.slots; });
  return { folios, fils }; }

/* ---- composer, réparer : un fil que la place refuse est retiré ----------------------------------------------------- */
function reparer(D, journal) {
  const bons = new Set();   // les folios déjà composés sans faute (un fil retiré rouvre son folio et celui d'en face)
  for (let tour = 0; tour < 600; tour++) {
    const { folios } = preparer(D); let ko = null;
    for (const f of folios) { if (bons.has(f.n)) continue; try { composerFolio(D, f); bons.add(f.n); } catch (e) { ko = e; break; } }
    if (!ko) return;
    const m = ko.message, f = ko.folio, idFil = (/le fil (\S+)/.exec(m) || [])[1];
    const retirer = id => { const base = id.replace(/[ab]$/, ''); const i = D.fils.findIndex(w => w.id === base); if (i >= 0) { journal.push(base + ' retiré : ' + m.slice(0, 90)); const w = D.fils[i]; bons.delete(w[3]); if (w[4] != null) bons.delete(w[4]); D.fils.splice(i, 1); return true; } return false; };
    if (idFil && retirer(idFil)) continue;
    if (/déborde/.test(m)) { const col = +(/colonne (\d+)/.exec(m) || [])[1], F = D.folios.find(x => x.n === f.n), cands = F.eqs.filter(e => e[1] === col), e = cands[cands.length - 1];
      F.eqs = F.eqs.filter(x => x !== e); D.fils.filter(w => [w[0], w[1]].some(b => b.startsWith(e[0] + ':'))).forEach(w => { bons.delete(w[3]); if (w[4] != null) bons.delete(w[4]); });
      D.fils = D.fils.filter(w => ![w[0], w[1]].some(b => b.startsWith(e[0] + ':'))); journal.push(e[0] + ' retiré (colonne pleine)'); continue; }
    // un T impossible, un dessin qui ne dit pas la vérité : le dernier fil de ce folio qui partage une broche s'en va
    const ici = D.fils.filter(w => w[3] === f.n || w[4] === f.n), compte = new Map(); ici.forEach(w => [w[0], w[1]].forEach(b => compte.set(b, (compte.get(b) || 0) + 1)));
    const t = [...ici].reverse().find(w => [w[0], w[1]].some(b => compte.get(b) > 1 && !b.startsWith('masse:'))) || ici[ici.length - 1];
    if (!t) throw ko; retirer(t.id); }
  throw new Error('le document D ne se répare pas'); }

/* ---- les pages qui ne sont pas des schémas : du HTML en A4 ------------------------------------------------------------ */
const A4 = (corps, o = {}) => `<div style="box-sizing:border-box;width:210mm;height:297mm;padding:${o.marge || '18mm 16mm'};font-family:'Liberation Serif',serif;font-size:10.5pt;color:#111;line-height:1.45;position:relative">${corps}
  <div style="position:absolute;left:16mm;right:16mm;bottom:9mm;border-top:0.3mm solid #111;padding-top:1.5mm;font-family:'Liberation Sans',sans-serif;font-size:7.5pt;display:flex;justify-content:space-between"><span>${DOC.numero} — INDICE ${DOC.indice}</span><span>${esc(o.titre || '')}</span><span>PAGE ${o.page} / 300</span></div></div>`;
const tableau = (entetes, lignes, o = {}) => `<table style="border-collapse:collapse;width:100%;font-family:'Liberation Sans',sans-serif;font-size:${o.taille || '8.4pt'}"><thead><tr>${entetes.map(t => `<th style="border:0.25mm solid #111;padding:1.1mm 1.4mm;background:#e8e8e8;text-align:left">${esc(t)}</th>`).join('')}</tr></thead><tbody>${lignes.map(l => `<tr>${l.map(c => `<td style="border:0.2mm solid #111;padding:0.9mm 1.4mm">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

function pagesDeTexte(ctx) {
  const { pages, verite, cat } = ctx, P = (html, titre) => { pages.push({ html: A4(html, { titre, page: pages.length + 1 }), taille: 'A4', sorte: titre }); };
  // 1. la garde
  pages.push({ taille: 'A4', sorte: 'garde', html: A4(`<div style="font-family:'Liberation Sans',sans-serif;text-align:center;padding-top:40mm"><div style="font-size:11pt;letter-spacing:0.3em">BUREAU D’ÉTUDES CÂBLAGE</div>
    <div style="font-size:24pt;font-weight:700;margin:22mm 0 6mm">DOSSIER DE CÂBLAGE</div><div style="font-size:14pt">${esc(DOC.titre.replace('DOSSIER DE CÂBLAGE — ', ''))}</div>
    <div style="margin:26mm auto 0;width:120mm;text-align:left;font-size:11pt;line-height:2"><div>N° DE DOCUMENT : <b>${DOC.numero}</b></div><div>INDICE : <b>${DOC.indice}</b></div><div>DATE : <b>${DOC.date}</b></div><div>NOMBRE DE PAGES : <b>300</b></div></div>
    <div style="margin:22mm auto 0;width:150mm">${tableau(['', 'Fonction', 'Visa', 'Date'], [['Rédigé', 'BE câblage', '', DOC.date], ['Vérifié', 'Contrôle technique', '', ''], ['Approuvé', 'Responsable de lot', '', '']], { taille: '10pt' })}</div>
    <div style="position:absolute;bottom:22mm;left:0;right:0;font-size:8pt;color:#555">Document d’essai inventé pour mesurer la lecture de VOLTA — aucune donnée réelle.</div></div>`, { titre: 'PAGE DE GARDE', page: 1 }) });
  // 2-3. le sommaire
  const sommaire = [['1', 'Page de garde', 1], ['2', 'Sommaire', 2], ['3', 'Liste des révisions', 4], ['4', 'Notes générales', 5], ['5', 'Symboles et conventions', 7],
    ...CHAPITRES.map((c, i) => [String(6 + i), `Chapitre ${i + 1} — ${c.titre} (${c.numero})`, ctx.debuts[i] - 1]), ['9', 'Liste des liaisons complémentaires — faisceau FX-4520-34', 291], ['10', 'Index des équipements principaux', 297]];
  const ligneS = ([n, t, p]) => `<div style="display:flex;gap:2mm;margin:2.2mm 0"><span style="width:10mm">${n}.</span><span>${esc(t)}</span><span style="flex:1;border-bottom:0.3mm dotted #111;transform:translateY(-1.2mm)"></span><span>${p}</span></div>`;
  P(`<h1 style="font-family:'Liberation Sans',sans-serif;font-size:16pt">SOMMAIRE</h1>${sommaire.map(ligneS).join('')}<h2 style="font-family:'Liberation Sans',sans-serif;font-size:12pt;margin-top:10mm">Folios par chapitre</h2>${CHAPITRES.map((c, i) => ligneS(['', `${c.numero} — folios 1 à ${c.folios}`, ctx.debuts[i] + ' à ' + (ctx.debuts[i] + c.folios - 1)])).join('')}`, 'SOMMAIRE');
  P(`<h1 style="font-family:'Liberation Sans',sans-serif;font-size:16pt">SOMMAIRE (SUITE)</h1><p>Les folios de chaque chapitre portent le numéro de plan de leur chapitre et sont numérotés à partir de 1. Un renvoi désigne le folio de destination et la zone (rangée et colonne du cadre) : « F12/B4 ». Vers un autre chapitre, le numéro de plan précède : « SC-4520-320 F12/B4 ».</p><p>Les numéros de fil, quand ils sont portés, sont les mêmes des deux côtés d’un renvoi.</p><p>Les liaisons du faisceau complémentaire FX-4520-34 ne sont pas dessinées : elles sont données en tableau, pages 291 à 296.</p>`, 'SOMMAIRE');
  // 4. les révisions
  P(`<h1 style="font-family:'Liberation Sans',sans-serif;font-size:16pt">LISTE DES RÉVISIONS</h1>${tableau(['Indice', 'Date', 'Objet', 'Pages'], [['A', '12/01/2026', 'Création', 'Toutes'], ['B', '30/03/2026', 'Ajout des capteurs de pression, chapitre 3', '203 à 290'], ['C', '22/06/2026', 'Modification des protections, chapitre 1', '9 à 108'], ['D', DOC.date, 'Faisceau complémentaire FX-4520-34 ; index', '291 à 299']], { taille: '10pt' })}`, 'RÉVISIONS');
  // 5-6. les notes générales (trois liaisons écrites en clair)
  const L = ctx.liaisonsTexte;
  P(`<h1 style="font-family:'Liberation Sans',sans-serif;font-size:16pt">NOTES GÉNÉRALES</h1><p><b>NOTE 1 —</b> Les câbles sont désignés par leur type et leur jauge (DR20, MLB24…). Les longueurs figurent au plan de faisceau.</p><p><b>NOTE 2 —</b> Les repères d’équipement suivent la forme numéro, code, suffixe (exemple : 152RL3). Une barrette se désigne par son repère, son module et la lettre du contact.</p>
    <p><b>NOTE 3 —</b> Les blindages sont repris au calculateur, sauf indication contraire.</p><p><b>NOTE 4 —</b> ${esc(L[0].phrase)}</p><p><b>NOTE 5 —</b> ${esc(L[1].phrase)}</p><p><b>NOTE 6 —</b> ${esc(L[2].phrase)}</p>
    <p><b>NOTE 7 —</b> Les masses sont regroupées sur des plaques de masse ; le repère de la masse est porté à côté du symbole.</p>`, 'NOTES GÉNÉRALES');
  L.forEach(l => verite.push({ ...l.ligne, page: 5, dessin: ['texte', 'note'], style: 'texte', fwd: DOC.numero + ' p.5' }));
  P(`<h1 style="font-family:'Liberation Sans',sans-serif;font-size:16pt">NOTES GÉNÉRALES (SUITE)</h1><p><b>NOTE 8 —</b> Les relais sont représentés au repos. Les contacts A1 sont communs, A2 repos, A3 travail ; la bobine est entre X1 et X2.</p><p><b>NOTE 9 —</b> Les disjoncteurs sont alimentés par leur borne 1.</p><p><b>NOTE 10 —</b> Abréviations : ALIM alimentation, CDE commande, DISJ. disjoncteur, INTER interrupteur.</p>`, 'NOTES GÉNÉRALES');
  // 7. les symboles (des dessins qui ne sont pas du câblage)
  const T = toile({ largeur: 210, hauteur: 297, police: 'Liberation Sans' }); T.texte(16, 26, 'SYMBOLES ET CONVENTIONS', { taille: 5.6, gras: true });
  const rangs = [['DISJONCTEUR : SON SYMBOLE DANS LA BOÎTE (BORNE 1 : ALIMENTATION)', y => { T.rect(26, y - 5, 16, 9, 0.35); T.cercle(30.5, y, 1.1); T.cercle(37.5, y, 1.1); T.chemin(`M30.5 ${y - 1.1} Q34 ${y - 4.4} 37.5 ${y - 1.1}`); T.ligne(26, y, 29.4, y); T.ligne(38.6, y, 42, y); T.ligne(20, y, 26, y); T.ligne(42, y, 48, y); T.texte(26, y - 6.6, 'XXXCB1', { taille: 2.6, gras: true }); T.texte(24.5, y - 1, '1', { ancre: 'end' }); T.texte(43.5, y - 1, '2'); }],
    ['RELAIS : BOBINE X1-X2, CONTACT A1 COMMUN, A2 REPOS, A3 TRAVAIL', y => { const x0 = 24, w = 20; T.rect(x0, y - 9, w, 18, 0.35); T.rect(x0 + 5, y - 3, 2.6, 6, 0.3); T.poly([[x0, y - 5], [x0 + 6.3, y - 5], [x0 + 6.3, y - 3]]); T.poly([[x0, y + 5], [x0 + 6.3, y + 5], [x0 + 6.3, y + 3]]); T.poly([[x0 + w, y - 5], [x0 + w - 5, y - 5]]); T.poly([[x0 + w, y], [x0 + w - 8, y]]); T.poly([[x0 + w, y + 5], [x0 + w - 8, y + 5]]); T.ligne(x0 + w - 5, y - 5, x0 + w - 8, y); ['X1', 'X2'].forEach((t, i) => T.texte(x0 + 1, y - 5.8 + 10 * i, t, { taille: 1.8 })); ['A1', 'A2', 'A3'].forEach((t, i) => T.texte(x0 + w - 1, y - 5.8 + 5 * i, t, { taille: 1.8, ancre: 'end' })); }],
    ['MASSE (REPÈRE À CÔTÉ DU SYMBOLE)', y => { T.ligne(34, y - 8, 34, y); T.ligne(32, y, 36, y); T.ligne(32.7, y + 1, 35.3, y + 1); T.ligne(33.4, y + 2, 34.6, y + 2); T.texte(37, y + 2, '9XXG', { taille: 2.2 }); }],
    ['RENVOI : FOLIO ET ZONE DE DESTINATION', y => { T.ligne(20, y, 30, y); T.polygone([[30, y - 2.5], [41, y - 2.5], [44, y], [41, y + 2.5], [30, y + 2.5]]); T.texte(31.4, y + 0.8, 'F12/B4'); }],
    ['JONCTION (POINT) ET CROISEMENT (SANS POINT)', y => { T.ligne(20, y, 48, y); T.ligne(28, y, 28, y + 8); T.point(28, y); T.ligne(40, y - 5, 40, y + 5); }],
    ['CÂBLE BLINDÉ', y => { T.ligne(20, y, 48, y); T.ellipse(34, y, 1.4, 2.6); T.texte(26, y - 1, 'MLB24', { taille: 1.9 }); }],
    ['BARRETTE : PASTILLES SUR UN POINTILLÉ (UN MÊME GROUPE), MODULE ET LETTRE : 51A', y => { T.texte(34, y - 9, 'XXXVT1', { taille: 2.6, gras: true, ancre: 'middle' }); T.texte(34, y - 4.4, '51', { ancre: 'middle', taille: 2, gras: true }); T.ligne(34, y - 1, 34, y + 9, 0.4, ' stroke-dasharray="1 0.8"'); ['A', 'B', 'C'].forEach((l, i) => { T.point(34, y - 1 + i * 5, 1.5); T.texte(34, y - 0.28 + i * 5, l, { ancre: 'middle', taille: 2, couleur: '#fff', gras: true }); }); T.ligne(20, y - 1, 32.5, y - 1); T.ligne(35.5, y + 4, 48, y + 4); }],
    ['PRISE DE COUPURE (PARTIE MOBILE, PARTIE FIXE)', y => { T.rect(28, y - 5, 7.5, 12.5, 0.35); T.rect(35.5, y - 5, 5, 12.5, 0.35); T.texte(31.75, y + 0.8, 'A', { ancre: 'middle' }); T.texte(38, y + 0.8, 'A', { ancre: 'middle' }); T.texte(34.25, y - 7, 'XXXVC1A', { taille: 2.6, gras: true, ancre: 'middle' }); }]];
  rangs.forEach(([t, dessin], i) => { const y = 50 + i * 28.5; dessin(y); T.texte(56, y + 1, t, { taille: 2.6 }); T.ligne(16, y + 13.5, 194, y + 13.5, 0.15); });
  T.rect(10, 10, 190, 277, 0.4); T.texte(105, 282, `${DOC.numero} — INDICE ${DOC.indice} — PAGE 7 / 300`, { taille: 2.4, ancre: 'middle' });
  pages.push({ svg: T.svg(), taille: 'A4', sorte: 'symboles' }); }

/* les trois liaisons écrites dans les notes */
function liaisonsEnTexte(cat) {
  cat['861HT1'] = { genre: 'boite', desig: 'RÉCHAUFFEUR PRISE STATIQUE', pn: 'EN2997Y1A02P' }; cat['862SP1'] = { genre: 'boite', desig: 'CAPTEUR TEMPÉRATURE HUILE', pn: 'EN2997Y1A04P' };
  cat['870CP1'] = { genre: 'boite', desig: 'CALCULATEUR MOTEUR', pn: 'EN4165-3M', connecteurs: true }; cat['875TB1'] = { genre: 'boite', desig: 'BORNIER', pn: 'MS27212-1-8' };
  const l = (a, b, type) => { const A = deviceDe(cat, a[0], a[1]), B = deviceDe(cat, b[0], b[1]); return { harness: 'FX-4520-34', de: A.device, borneDe: A.pin, pnDe: A.pn, descDe: A.desc, vers: B.device, borneVers: B.pin, pnVers: B.pn, descVers: B.desc, type }; };
  return [{ phrase: 'Le retour de masse du réchauffeur 861HT1 (broche 2) est relié à la masse 961G par un câble DR20.', ligne: l(['861HT1', '2'], ['961G', ''], 'DR20') },
    { phrase: 'Le blindage du câble MLB24 issu du capteur 862SP1 (broche 4) est repris sur la broche 12 du connecteur B du calculateur 870CP1.', ligne: l(['862SP1', '4'], ['870CP1', 'B12'], 'MLB24') },
    { phrase: 'Un pontage DR22 relie les broches 3 et 4 du bornier 875TB1.', ligne: l(['875TB1', '3'], ['875TB1', '4'], 'DR22') }]; }

/* les liaisons du faisceau complémentaire, données en tableau (six pages de 35 lignes) */
function liaisonsEnTableau(cat, pris) {
  const rnd = hasard(34), L = []; let num = 840; const eqs = [];
  for (let i = 0; i < 46; i++) { const code = choisir(rnd, ['XC', 'CP', 'SP', 'RL', 'LP', 'PM', 'VL', 'TB']); let r; do { r = (num++) + code + entier(rnd, 1, 3); } while (pris.has(r)); pris.add(r); cat[r] = { genre: code === 'RL' ? 'relais' : 'boite', desig: (DESIG[code] || 'ÉQUIPEMENT') + ' ' + choisir(rnd, SYSTEMES), pn: choisir(rnd, PNS[code] || PNS.boite) }; eqs.push(r); if (num > 899) num = 840; }
  const libres = new Map(eqs.map(r => [r, cat[r].genre === 'relais' ? ['X1', 'X2', 'A1', 'A2', 'A3'] : Array.from({ length: 12 }, (_, k) => (cat[r].desig.startsWith('CALC') ? 'A' : '') + (k + 1))]));
  while (L.length < 210) { const a = choisir(rnd, eqs), b = rnd() < 0.12 ? null : choisir(rnd, eqs); if (a === b) continue; const pa = libres.get(a).shift(); if (!pa) continue;
    if (!b) { L.push({ a: [a, pa], b: [(960 + entier(rnd, 0, 9)) + 'G', ''], type: 'DR22' }); continue; }
    const pb = libres.get(b).shift(); if (!pb) { libres.get(a).unshift(pa); continue; } L.push({ a: [a, pa], b: [b, pb], type: choisir(rnd, ['DR20', 'DR22', 'DR24', 'MLB24']) }); }
  return L.map(x => { const A = deviceDe(cat, x.a[0], x.a[1]), B = deviceDe(cat, x.b[0], x.b[1]); return { harness: 'FX-4520-34', de: A.device, borneDe: A.pin, pnDe: A.pn, descDe: A.desc, vers: B.device, borneVers: B.pin, pnVers: B.pn, descVers: B.desc, type: x.type, longueur: 400 + Math.floor(rnd() * 3200) }; }); }

/* ---- le document entier ---------------------------------------------------------------------------------------------- */
function documentD(o = {}) {
  const cat = {}, pris = new Set(), journal = [], t0 = Date.now();
  // les pages : 7 de tête, puis chaque chapitre (sa garde, ses folios), puis les tableaux, l'index, la fin
  const debuts = []; let p = 8; CHAPITRES.forEach(c => { debuts.push(p + 1); p += 1 + c.folios; });
  const chap = CHAPITRES.map((c, i) => genererChapitre(c, cat, pris, debuts[i]));
  // quelques renvois d'un chapitre à l'autre (le folio d'arrivée porte le numéro de plan de l'autre chapitre)
  const rnd = hasard(4520), tous = { folios: chap.flatMap(c => c.folios), fils: chap.flatMap(c => c.fils) };
  tous.folios.forEach(f => { f.page = f.n; });
  const libresDe = f => { const u = new Set(tous.fils.flatMap(w => [w[0], w[1]])); return f.eqs.filter(([r]) => cat[r].genre === 'boite' && !cat[r].connecteurs).map(([r]) => r + ':' + (9 + entier(rnd, 0, 5))).filter(b => !u.has(b)); };
  for (let k = 0; k < 6; k++) { const a = choisir(rnd, chap[k % 2].folios), b = choisir(rnd, chap[k % 2 + 1].folios), la = libresDe(a), lb = libresDe(b); if (!la.length || !lb.length) continue;
    const x = [la[0], lb[0], 'DR22', a.n, b.n, 'LIAISON INTER-CHAPITRES']; tous.fils.push(x); }
  tous.fils.forEach((w, k) => { w.id = 'd' + (k + 1); });
  // un numéro de fil par fil, à la façon du logiciel de son chapitre (le même des deux côtés d'un renvoi)
  const styleDuFolio = new Map(tous.folios.map(f => [f.n, f.style]));
  const D = { ...DOC, faisceau: 'FX-4520-31', style: 'A', catalogue: cat, folios: tous.folios, fils: tous.fils, prefixe: 'd',
    numeroFil: (k, x) => { const st = styleDuFolio.get(x[3]); return st === 'B' ? 'W-' + (5001 + k) : 'W' + (2001 + k); },
    // un renvoi dit le folio et la zone de l'autre bout ; vers un autre chapitre, son numéro de plan devant
    texteRenvoi: ({ folio, zone, numero, ici }) => (numero !== ici.numero ? numero + ' ' : '') + 'F' + folio + '/' + zone };
  reparer(D, journal);
  const r = construireDocument(D);
  // les pages, dans l'ordre
  const pages = [], verite = [...r.verite], liaisonsTexte = liaisonsEnTexte(cat);
  const ctx = { pages, verite, cat, debuts, liaisonsTexte }; pagesDeTexte(ctx);
  const garde = (c, i) => A4(`<div style="font-family:'Liberation Sans',sans-serif;text-align:center;padding-top:90mm"><div style="font-size:13pt;letter-spacing:0.25em">CHAPITRE ${i + 1}</div><div style="font-size:20pt;font-weight:700;margin:8mm 0">${esc(c.titre)}</div><div style="font-size:12pt">PLAN ${c.numero} — INDICE ${c.indice} — ${c.folios} FOLIOS</div><div style="font-size:10pt;margin-top:6mm">FAISCEAU ${c.faisceau}</div></div>`, { titre: 'CHAPITRE ' + (i + 1), page: debuts[i] - 1 });
  CHAPITRES.forEach((c, i) => { pages.push({ html: garde(c, i), taille: 'A4', sorte: 'chapitre' }); r.folios.filter(f => f.numero === c.numero).forEach(f => { pages.push({ svg: r.svgs[r.folios.indexOf(f)], taille: 'A3', sorte: 'schéma', style: c.style, numero: c.numero, folio: f.folioCartouche, indice: c.indice, faisceau: c.faisceau }); }); });
  // les tableaux
  const T = liaisonsEnTableau(cat, pris);
  for (let k = 0; k < 6; k++) { const part = T.slice(k * 35, k * 35 + 35), page = pages.length + 1;
    pages.push({ taille: 'A4', sorte: 'tableau', html: A4(`<h1 style="font-family:'Liberation Sans',sans-serif;font-size:13pt;margin:0 0 4mm">LISTE DES LIAISONS COMPLÉMENTAIRES — FAISCEAU FX-4520-34${k ? ' (SUITE)' : ''}</h1>${tableau(['N°', 'De', 'Broche', 'Vers', 'Broche', 'Type', 'Long. (mm)'], part.map((l, i) => [String(k * 35 + i + 1), l.de, l.borneDe, l.vers, l.borneVers, l.type, String(l.longueur)]), { taille: '8.6pt' })}`, { titre: 'LIAISONS COMPLÉMENTAIRES', page }) });
    part.forEach(l => verite.push({ ...l, page, dessin: ['tableau'], style: 'tableau', fwd: DOC.numero + ' p.' + page })); }
  // l'index des équipements principaux (un extrait)
  const index = Object.keys(cat).filter(rep => cat[rep].desig && /^(CALC|POMPE|VANNE|RELAIS|CAPTEUR)/.test(cat[rep].desig)).slice(0, 108);
  for (let k = 0; k < 3; k++) pages.push({ taille: 'A4', sorte: 'index', html: A4(`<h1 style="font-family:'Liberation Sans',sans-serif;font-size:13pt;margin:0 0 4mm">INDEX DES ÉQUIPEMENTS PRINCIPAUX${k ? ' (SUITE)' : ''}</h1>${tableau(['Repère', 'Désignation', 'Référence'], index.slice(k * 36, k * 36 + 36).map(rep => [rep, cat[rep].desig, cat[rep].pn || '']), { taille: '8pt' })}`, { titre: 'INDEX', page: pages.length + 1 }) });
  pages.push({ taille: 'A4', sorte: 'fin', html: A4(`<div style="text-align:center;padding-top:120mm;font-family:'Liberation Sans',sans-serif;font-size:12pt">FIN DU DOCUMENT</div>`, { titre: 'FIN', page: 300 }) });
  if (pages.length !== 300) throw new Error('le document D a ' + pages.length + ' pages');
  return { pages, verite, journal, ms: Date.now() - t0, debuts, folios: r.folios, scenes: r.composes.map(c => c.scene) }; }

module.exports = { documentD, CHAPITRES, DOC };
