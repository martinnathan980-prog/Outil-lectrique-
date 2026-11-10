/* ===========================================================================
   LES PARCOURS DU LECTEUR — de bout en bout, à la vraie souris.
       NODE_PATH=/opt/node22/lib/node_modules node tests/parcours.js [--fichier=chemin] [--captures=dossier] [--sans-gros]

   Le lecteur : « À partir des contrats passés, comment ça se passe : une
   batterie de tests en fonction des flux que j'ai choisis. Je scanne le plan,
   j'ouvre le plan, je vois les repères. Est-ce qu'on part de zéro ? Est-ce
   qu'on copie ? » On rejoue donc les gestes d'un technicien, dans l'ordre où il
   les fait, et on chronomètre chaque pas (performance.now() dans la page,
   Date.now() autour du geste) :
     A. UN CONTRAT NEUF : la bibliothèque (l'ouverture), une installation neuve, un
        retest Excel ajouté comme plan (au vrai format : seize colonnes,
        en-têtes ligne 4), le plan qui se dessine d'un clic, les folios
        au clavier et à la barre du bas, la recherche (/), une correction dans
        le tableau que le plan suit, Ctrl+Z, fermer et rouvrir (la mémoire),
        les exports (SVG, PNG, CSV), la nomenclature ;
     B. JE PARS D'UN CONTRAT DÉJÀ FAIT : une base de trois machines, un retest
        proche, « Déjà fait » sur chaque fiche, le dessin FWD et ses trois
        échelles, cocher et reprendre (recâblé, sans numéro), le contrôle qui
        revérifie, Ctrl+Z, les repères proposés en « ? », renommer un repris —
        et la question du lecteur : repart-on de zéro ? copie-t-on à l'aveugle ?
     C. LE CONTRÔLE D'UN CONTRAT : l'en-tête, l'index « à reprendre » qui mène
        à chaque point (folio, fiche, bloc cadré), trois corrections qui font
        disparaître leur point, une hypothèse de simulation, un choix de fiche
        (sexe des contacts, raccord) qui change la nomenclature ;
     D. LE TÉLÉPHONE (390 × 844) : A et C — tout reste-t-il atteignable ?
     E. LES CAS LIMITES : un retest vide, une seule ligne, sans part numbers,
        des codes de repère inconnus, un Excel à plusieurs feuilles, un fichier
        à deux harness, un gros retest (1 500 lignes, 20 folios) et ses temps.

   Deux sortes de contrôles :
     · ok(...)          ce qui marche aujourd'hui — un échec rend 1 ;
     · frottement(...)  un FROTTEMENT CONNU (un pas qui manque, qui ouvre au
                        mauvais endroit, qui prend trop de temps) : noté « ~~ »,
                        il ne fait pas échouer la batterie, et passe « ok · réglé »
                        quand une correction le résout. Les seuils : une fiche
                        au-delà de 200 ms, un folio au-delà de 3 s.
   Avec --captures=dossier, une capture par pas qui compte et un
   parcours-mesures.json (les mesures, les frottements). Les jeux d'essai
   (Excel et CSV au vrai format) se génèrent dans un dossier temporaire.
   =========================================================================== */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm');
const P = require('./pilote');
const XLSX = require('../lib/xlsx.min.js');
const FICHIER = P.fichierDemande();
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const CAPTURES = arg('captures', ''), SANS_GROS = process.argv.includes('--sans-gros'), SEULS = arg('parcours', '').toUpperCase();   // --parcours=C,E : ne rejouer que ceux-là
const SEUIL_FICHE = 200, SEUIL_FOLIO = 3000, SEUIL_GESTE = 1000;   // ms : une fiche, un folio, un geste d'interface (index, tableau, nomenclature)
// les dépassements de temps d'un folio ont une seule cause : ils se rangent sous un même frottement
const GROUPE_FOLIO = 'un folio jamais vu se calcule dans le fil principal : l’écran est figé, sans un mot', PROPOSITION_FOLIO = '08-interface.js `calculer` / `placementDe` : le placement d’un folio jamais vu dans un Worker (comme le FWD, `placerAilleurs`) avec une attente visible (« le moteur place le folio… ») ; au minimum, un toast avant le calcul';
const CHROMIUM = '/opt/pw-browsers/chromium';
if (CAPTURES) fs.mkdirSync(CAPTURES, { recursive: true });

/* ---- le journal : ce qui tient, ce qui frotte, ce qu'on mesure ----------------------------------------------- */
const J = { ok: 0, ko: 0, frottements: [], regles: [], mesures: [], notes: [] };
let parcoursCourant = '';
const ok = (c, nom, detail) => { if (c) J.ok++; else J.ko++; console.log('  ' + (c ? 'ok ' : 'KO ') + ' ' + nom + (detail ? '   ' + detail : '')); return !!c; };
/* un frottement connu : `gravite` bloquant / gênant / détail, `proposition` ce qu'il faudrait (fichier, fonction) */
const frottement = (c, nom, detail, gravite, proposition) => { if (c) { J.ok++; J.regles.push(nom); console.log('  ok  ' + nom + ' · réglé' + (detail ? '   ' + detail : '')); return true; }
  J.frottements.push({ parcours: parcoursCourant, nom, detail: detail || '', gravite: gravite || 'gênant', proposition: proposition || '' });
  console.log('  ~~  frottement connu [' + (gravite || 'gênant') + '] ' + nom + (detail ? '   ' + detail : '')); return false; };
/* une mesure : au-delà du seuil, c'est un frottement (de temps) — `groupe` : le frottement sous lequel il se range */
const mesure = (nom, ms, seuil, proposition, groupe) => { ms = Math.round(ms); J.mesures.push({ parcours: parcoursCourant, nom, ms, seuil: seuil || null });
  if (seuil && ms > seuil) return frottement(false, 'temps · ' + (groupe || nom), nom + ' : ' + ms + ' ms > ' + seuil + ' ms', 'gênant', proposition || '');
  console.log('  ·   ' + nom + ' : ' + ms + ' ms' + (seuil ? ' (seuil ' + seuil + ')' : '')); return true; };
const note = t => { J.notes.push({ parcours: parcoursCourant, texte: t }); console.log('  …   ' + t); };
async function parcours(titre, fn) { if (SEULS && !SEULS.includes(titre[0])) return; parcoursCourant = titre; console.log('\n' + titre); try { await fn(); } catch (e) { ok(false, 'le parcours s’est interrompu', String(e && e.message || e).split('\n')[0].slice(0, 200)); } }

/* ---- les jeux d'essai : des retests au vrai format, en Excel et en CSV --------------------------------------- */
/* Le modèle (01) se charge dans un bac à sable : `contratExemple` et `lireRepere` servent à fabriquer les fichiers. */
function modele() { const code = fs.readFileSync(path.join(__dirname, '..', 'src', '01-modele.js'), 'utf8'), bac = {}; vm.createContext(bac);
  vm.runInContext(code + '\nthis.X = { contratExemple, liaison, CODES, lireRepere, estMasse };', bac); return bac.X; }
const ENTETE = ['Harness', 'Device1', 'Pin1', 'PN1', 'Description1', 'Cable T/G', 'Cable Tag', 'Route', 'Device2', 'Pin2', 'PN2', 'Description2', 'FWD', 'Cable length (mm)', 'Appareil', 'Date retest'];
const FWD = (p, v) => 'MEE256A78150' + String(p).padStart(2, '0') + (v || 'A');
const HARNESS = '332A601150-023-D', APPAREIL = 'H160', DATE = '09/10/2026';
const hache = s => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
function fixtures(M) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parcours-')), E = M.contratExemple();
  const desc = r => { if (M.estMasse(r)) return 'MASSE'; const q = M.lireRepere(r); return q && M.CODES[q.code] ? M.CODES[q.code].nom.toUpperCase() : ''; };
  const ligne = (l, o) => [o.harness || HARNESS, l.de, l.borneDe, l.pnDe, desc(l.de), l.type, l.cable, l.route, l.vers, l.borneVers, l.pnVers, desc(l.vers), o.fwd ? o.fwd(l) : FWD(l.plan),
    o.longueur === null ? '' : 800 + (hache(l.cable + (o.k || 0)) % 52) * 100, o.appareil || APPAREIL, DATE];
  const feuille = lignes => [['Retest du ' + DATE], ['Mémo : jeu d’essai des parcours — rien de réel'], [], ENTETE, ...lignes];
  const csv = (nom, lignes) => { const f = path.join(dir, nom); fs.writeFileSync(f, feuille(lignes).map(r => r.join(';')).join('\n') + '\n'); return f; };
  const xlsx = (nom, feuilles) => { const wb = XLSX.utils.book_new(); feuilles.forEach(([titre, lignes]) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(feuille(lignes)), titre));
    const f = path.join(dir, nom); fs.writeFileSync(f, XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })); return f; };
  const folio = p => E.filter(l => l.plan === p), reperes = L => [...new Set(L.flatMap(l => [l.de, l.vers]))];
  // A : trois folios de l'exemple (le facile, le moyen, le double calculateur), tels quels
  const neufL = ['1', '2', '6'].flatMap(folio);
  const neuf = xlsx('neuf.xlsx', [['Retest', neufL.map(l => ligne(l, {}))]]);
  // E : les cas limites
  const vide = csv('vide.csv', []);
  const uneLigne = csv('une-ligne.csv', [ligne(E[1], {})]);
  const sansPN = csv('sans-pn.csv', folio('1').map(l => ligne({ ...l, pnDe: '', pnVers: '' }, {})));
  const inconnusL = [{ de: '305XX9', borneDe: '1', pnDe: 'ZZZ-1', vers: '410ZQ2B', borneVers: 'A', pnVers: '', cable: 'W-901', type: 'DR22', route: 'SIGNAL', plan: '7' },
    { de: '410ZQ2B', borneDe: 'B', pnDe: '', vers: 'K7', borneVers: '2', pnVers: '', cable: 'W-902', type: 'DR22', route: 'SIGNAL', plan: '7' },
    { de: 'K7', borneDe: '3', pnDe: '', vers: 'RELAIS-1', borneVers: 'X1', pnVers: '', cable: 'W-903', type: 'DR24', route: 'SIGNAL', plan: '7' },
    { de: '102CB1', borneDe: '2', pnDe: 'MS3320-10', vers: '305XX9', borneVers: '2', pnVers: 'ZZZ-1', cable: 'W-904', type: 'DR20', route: 'PUISSANCE', plan: '7' },
    { de: 'RELAIS-1', borneDe: 'X2', pnDe: '', vers: '904G', borneVers: '', pnVers: '', cable: 'W-905', type: 'DR24', route: 'SIGNAL', plan: '7' }];
  const inconnus = csv('inconnus.csv', inconnusL.map(l => ligne(l, {})));
  const feuilles = xlsx('deux-feuilles.xlsx', [['H-A', folio('1').map(l => ligne(l, { harness: 'H-A' }))], ['H-B', folio('2').map(l => ligne(l, { harness: 'H-B' }))]]);
  const deuxHarness = csv('deux-harness.csv', [...folio('1').map(l => ligne(l, { harness: 'H-A' })), ...folio('2').map(l => ligne(l, { harness: 'H-B' }))]);
  // le GROS retest : vingt folios de 75 lignes (le folio chargé de l'exemple + le facile, les zones décalées d'un millier
  // par folio, les numéros de fil décalés d'autant) — 1 500 lignes, un calculateur à trois connecteurs par folio
  const grosL = [], unDePlus = { de: '397TB1', borneDe: '4', pnDe: 'NSA936501-08', vers: '906G', borneVers: '', pnVers: '', cable: 'W-382', type: 'DR16', route: 'PUISSANCE', plan: '3' };
  for (let k = 0; k < 20; k++) { const z = r => r.replace(/^(\d+)/, d => String(+d + 1000 * (k + 1))), w = c => c.replace(/^W-(\d+)$/, (m, n) => 'W-' + (+n + 1000 * (k + 1)));
    [...folio('3'), unDePlus, ...folio('1')].forEach(l => grosL.push({ ...l, de: z(l.de), vers: z(l.vers), cable: w(l.cable), plan: String(k + 1) })); }
  const gros = xlsx('gros.xlsx', [['Retest', grosL.map(l => ligne(l, { k: 7 }))]]);
  return { dir, neuf, neufL, neufReperes: reperes(neufL), neufFolio1: reperes(folio('1')).filter(r => !M.estMasse(r)), vide, uneLigne, sansPN, inconnus, feuilles, deuxHarness, gros, grosN: grosL.length, grosFolios: 20 };
}

/* ---- parler à la page ---------------------------------------------------------------------------------------- */
/* `exemple` : l'outil s'ouvre sur la bibliothèque (plus sur l'exemple) ; un parcours qui part de l'exemple le demande, comme
   le technicien d'un clic sur l'installation « Exemple ». */
async function ouvrirPage(ctx, exemple) { const page = await ctx.newPage(); page.setDefaultTimeout(120000); page.erreurs = []; page.on('pageerror', e => page.erreurs.push(e.message));
  await page.addInitScript(ETAT_DU_CONTROLE);
  await page.goto(FICHIER); await page.waitForFunction(() => typeof atelier !== 'undefined' && BIB.pret);
  // (v74 : le parcours se juge sur l'exemple tel que la v73 l'ouvrait — le 10 A proposé, pas écrit ; la règle a son bloc dans disjoncteur.js)
  await page.evaluate(() => { HYPOTHESES.calibreAuto = false; if (app.simu) app.simu.calibreAuto = false; }); if (exemple) await page.evaluate(() => atelier.exempleSansCalibreAuto()); await instrumenter(page); return page; }
/* Les chronomètres dans la page : le placement d'un folio et le rendu d'une fiche (les fonctions globales du module 08 se
   remplacent par une version qui les mesure — rien d'autre ne change). */
const instrumenter = page => page.evaluate(() => { if (window.__mes) return; window.__mes = { placement: [], fiche: [] };
  const p0 = placementDe; window.placementDe = L => { const t = performance.now(); const r = p0(L); __mes.placement.push(performance.now() - t); return r; };
  const f0 = rendreFiche; window.rendreFiche = () => { const t = performance.now(); f0(); __mes.fiche.push(performance.now() - t); }; });
const derniere = (page, k) => page.evaluate(k => { const xs = __mes[k]; return xs.length ? xs[xs.length - 1] : 0; }, k);
const capture = async (page, nom) => { if (!CAPTURES) return; try { await page.screenshot({ path: path.join(CAPTURES, nom + '.png') }); } catch (_) { } };
// le centre d'un bloc (ou d'une barrette à poser) à l'écran
const ecranDe = (page, nom) => page.evaluate(nom => { const r = $('planche').getBoundingClientRect(), E = (x, y) => ({ x: r.left + app.vue.tx + x * app.vue.s, y: r.top + app.vue.ty + y * app.vue.s });
  const c = app.dessin.comps.find(k => k.name === nom && k.kind !== 'tag'); if (c) return E(c.x + c.w / 2, c.y + Math.min(c.h / 2, 12));
  const b = (app.dessin.barrettes || []).find(b => b.nomVT === nom); if (!b) return null; const bs = bornesDePiquage(b); return E(b.x, (bs[0].y + bs[1].y) / 2); }, nom);
/* Un clic de souris sur un bloc du plan. Si le clic n'a pas choisi ce bloc (un fil voisin…), on le dit et on le choisit par l'API pour que le parcours continue. */
const cliquerBloc = async (page, nom) => { await page.waitForTimeout(320);   // un recadrage en cours (animerVue, 260 ms) déplacerait la cible sous le clic
  const e = await ecranDe(page, nom); if (!e) throw new Error(nom + ' absent du dessin'); await page.mouse.click(e.x, e.y); await page.waitForTimeout(450);
  const touche = await page.evaluate(nom => ({ bon: !!(app.cible && app.cible.nom === nom && !$('inspecteur').hidden), quoi: app.cible ? app.cible.type + ':' + (app.cible.nom || (app.cible.l && app.cible.l.cable) || '') : 'rien' }), nom);
  if (touche.bon) return;
  note('le clic sur ' + nom + ' (' + Math.round(e.x) + ', ' + Math.round(e.y) + ') a touché ' + touche.quoi + ' : on le choisit par l’API');
  await page.evaluate(nom => { const c = app.dessin.comps.find(k => k.name === nom && k.kind !== 'tag'); if (c) choisirBloc(c); else choisirBarretteAPoser(barretteAPoser(nom)); }, nom); await page.waitForTimeout(300); };
/* Le bloc est-il CADRÉ : entier dans la place libre du plan (hors volet épinglé ou tiroir, tableau, rail, barre du bas) ?
   La CARTE flottante (v72, 08-carte) ne prend pas de place au plan : elle ne doit seulement pas cacher le bloc. */
const cadrage = (page, nom) => page.evaluate(nom => { const d = app.dessin; if (!d) return { dedans: false, detail: 'pas de dessin' };
  const c = d.comps.find(k => k.name === nom && k.kind !== 'tag'); let x0, y0, x1, y1;
  if (c) { x0 = c.x; y0 = c.y; x1 = c.x + c.w; y1 = c.y + c.h; } else { const b = (d.barrettes || []).find(b => b.nomVT === nom); if (!b) return { dedans: false, detail: nom + ' absent du dessin' }; const bs = bornesDePiquage(b); x0 = b.x - 12; x1 = b.x + 12; y0 = bs[0].y - 10; y1 = bs[bs.length - 1].y + 10; }
  const r = $('planche').getBoundingClientRect(), s = app.vue.s, X0 = r.left + app.vue.tx + x0 * s, Y0 = r.top + app.vue.ty + y0 * s, X1 = r.left + app.vue.tx + x1 * s, Y1 = r.top + app.vue.ty + y1 * s;
  let L = r.left, T = r.top, R = r.right, B = r.bottom; const vu = id => { const e = $(id); if (!e || e.hidden) return null; const q = e.getBoundingClientRect(); return q.width && q.height ? q : null; }, tel = telephone();
  const carte = !tel && !$('inspecteur').hidden && document.body.classList.contains('insp-flotte') ? vu('inspecteur') : null;
  const insp = (carte ? null : vu('inspecteur')) || vu('fiche'), base = vu('base'), fol = vu('folios'), rail = vu('rail');
  if (insp) { if (tel) B = Math.min(B, insp.top); else R = Math.min(R, insp.left); } if (base) B = Math.min(B, base.top); if (fol) B = Math.min(B, fol.top); if (rail) { if (tel) B = Math.min(B, rail.top); else L = Math.max(L, rail.right); }
  const sousLaCarte = !!carte && Math.min(X1, carte.right) - Math.max(X0, carte.left) > 1 && Math.min(Y1, carte.bottom) - Math.max(Y0, carte.top) > 1;
  const dedans = X0 >= L - 1 && X1 <= R + 1 && Y0 >= T - 1 && Y1 <= B + 1 && !sousLaCarte, visible = X1 > L && X0 < R && Y1 > T && Y0 < B && !sousLaCarte;

  // un bloc plus haut que la place (un calculateur au téléphone) : cadré sur sa largeur, son haut (le repère) dans la place
  const parLeHaut = !dedans && X0 >= L - 1 && X1 <= R + 1 && Y0 >= T - 1 && Y0 < B - 24 && (Y1 - Y0) > (B - T);
  return { dedans, parLeHaut, visible, w: Math.round(X1 - X0), h: Math.round(Y1 - Y0), detail: `bloc ${Math.round(X0)}–${Math.round(X1)} × ${Math.round(Y0)}–${Math.round(Y1)}, place libre ${Math.round(L)}–${Math.round(R)} × ${Math.round(T)}–${Math.round(B)}` }; }, nom);
/* La barre des folios : combien de puces, combien entières dans la bande, combien se recouvrent, la bande défile-t-elle ? */
const barreFolios = page => page.evaluate(() => { const s = $('fo-strip'), puces = [...s.querySelectorAll('.chip')], cs = puces.map(c => c.getBoundingClientRect()), r = s.getBoundingClientRect();
  const visibles = cs.filter(c => c.left >= r.left - 1 && c.right <= r.right + 1).length, large = Math.round(cs.reduce((n, c) => n + c.width, 0));
  // des puces rétrécies par le flex : leur texte déborde de leur boîte et s'écrit sur la voisine (les boîtes, elles, ne se recouvrent pas)
  const debordent = puces.filter(c => c.scrollWidth > c.clientWidth + 1).length;
  let chevauchent = 0; for (let i = 1; i < cs.length; i++) if (cs[i].left < cs[i - 1].right - 1) chevauchent++;
  return { n: cs.length, visibles, chevauchent, debordent, largeStrip: Math.round(r.width), largePuces: large, defile: getComputedStyle(s).overflowX, lbl: $('fo-lbl').textContent }; });
const PROPOSITION_BARRE = 'style.css `.fo-strip` / 08-interface.js `synchroniserFolios` : des puces à largeur bornée (le dessin abrégé « …01A », le nom entier en bulle), une bande qui défile pour de vrai (overflow-x:auto, la molette), la puce courante centrée — ou une liste déroulante au-delà de huit folios';
/* Ouvrir un fichier comme le technicien : un bouton qui ouvre le choix de fichier, puis le fichier. Rend le temps jusqu'au plan. */
/* Une ligne du menu ⋮ : le menu, puis le sous-menu qui la porte s'il y a lieu (Exporter, Plus : ils s'ouvrent en place),
   puis elle. « Ouvrir un retest… » est en tête du menu (la barre du haut n'a plus de bouton « Ouvrir ») */
const ligneDuMenu = async (page, act) => { await page.click('#btnMenu');
  const sous = await page.evaluate(a => { const p = document.querySelector(`#menu [data-act="${a}"]`).closest('.menu-panneau'); return p.id === 'mp-principal' ? '' : p.id.slice(3); }, act);
  if (sous) await page.click(`#menu [data-sous="${sous}"]`); await page.click(`#menu [data-act="${act}"]`); };
const parLeMenu = page => ligneDuMenu(page, 'ouvrir');
async function ouvrirParBouton(page, bouton, chemin) { const nom = path.basename(chemin), t0 = Date.now();
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), bouton === 'menu' ? parLeMenu(page) : page.click(bouton)]); await fc.setFiles(chemin);
  await page.waitForFunction(n => app.nom === n && !!app.dessin, nom); return Date.now() - t0; }
/* Depuis la BIBLIOTHÈQUE, comme le technicien : une installation neuve (au clavier), « Ajouter un plan » d'un vrai clic de
   souris, le fichier, puis un clic sur la ligne du plan, qui s'ouvre sur la table. Rend le temps du choix du fichier au
   plan dessiné, et le mot qui a dit l'ajout. */
async function ouvrirDepuisBibliotheque(page, chemin, install) { const nom = path.basename(chemin);
  if (!(await page.evaluate(() => BIB.vue === 'install' && !estDemo(BIB.install)))) { if (await page.evaluate(() => BIB.vue === 'plan')) await page.click('#en-biblio');
    await page.click('#bibliotheque [data-bi="nouvelle"]'); await page.keyboard.type(install || 'Antenne VHF'); await page.keyboard.press('Enter'); await page.waitForTimeout(250); }
  const t0 = Date.now(); const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#bi-ajouter')]); await fc.setFiles(chemin);
  await page.waitForFunction(n => [...BIB.plans.values()].some(p => p.nom === n), nom); const ajout = (await toast(page)).texte;
  const id = await page.evaluate(n => [...BIB.plans.values()].find(p => p.nom === n).id, nom);
  await page.click(`#bibliotheque .bi-plan[data-plan="${id}"] .bi-plan-ouvrir`);
  await page.waitForFunction(n => app.nom === n && !!app.dessin, nom); return { t: Date.now() - t0, ajout }; }
// la même chose en choisissant par l'entrée cachée (pour les fichiers qui ne dessinent rien : on attend le message)
async function deposerParEntree(page, chemin) { await page.setInputFiles('#fichier', chemin); await page.waitForTimeout(900); }
/* Déposer un fichier sur la fenêtre, comme on le glisse depuis l'explorateur : un vrai événement drop avec le fichier. */
async function deposer(page, chemin) { const b64 = fs.readFileSync(chemin).toString('base64'), nom = path.basename(chemin);
  await page.evaluate(([b64, nom]) => { const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const dt = new DataTransfer(); dt.items.add(new File([u8], nom, { type: nom.endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv' }));
    window.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true, cancelable: true })); window.__depotVu = document.body.classList.contains('depot-actif');
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); }, [b64, nom]); }
const toast = page => page.evaluate(() => ({ texte: $('toast').textContent, erreur: $('toast').classList.contains('erreur'), on: $('toast').classList.contains('on') }));
const telecharger = async (page, action) => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }), action()]); return { nom: d.suggestedFilename(), chemin: await d.path() }; };
/* l'état du contrat en mots (« 4 problèmes · 9 à voir »), tel que le contrôle le compte — la barre du haut ne le porte
   plus : le bouton des repères porte le compte, l'index la liste */
// (v87) l'état du contrôle, comme partout : « N à régler · M à voir » (08-recap, `compteARegler` : « à régler », c'est ce qui a un geste)
const ETAT_DU_CONTROLE = `window.etatDuControle = function () { const m = compteARegler().mot; return m === 'Rien à reprendre' ? 'rien à reprendre' : m; };`;
const etat = page => page.evaluate(() => ({ nom: app.nom, plan: app.plan, n: verite().length, folios: plans().length, cible: app.cible && (app.cible.nom || (app.cible.l && app.cible.l.cable) || app.cible.type), insp: !$('inspecteur').hidden, base: app.base.ouvert, enNom: $('ctx-nom').textContent, enSous: $('ctx-txt').textContent, enEtat: etatDuControle(), lbl: $('fo-lbl').textContent }));
/* La base d'essai des contrats faits (comme tests/fwd.js) : H-1 l'exemple décalé de deux centaines (un dessin par folio, une
   ligne en plus vers 305XX9, une en moins, un type changé, des longueurs), H-2 soixante lignes de l'exemple, H-3 le folio 2 avec
   une barrette écrite « module 51, contact B » ; et H-4, le folio 1 décalé dont le relais et la lampe n'ont ni le même
   repère ni de part number — ce que l'outil ne peut relier que par les voisins (« ? »). */
function baseEssaiDansLaPage() {
  const d = r => /G$/.test(r) ? r : r.replace(/^(\d)(\d\d)([A-Z]+)(\d*)/, (m, a, b, c, e) => String(+a + 2) + b + c + e), E = contratExemple(), F = (p, v) => 'MEE256A78150' + String(p).padStart(2, '0') + v;
  const H1 = E.map(l => liaison({ ...l, de: d(l.de), vers: d(l.vers), fwd: F(l.plan, 'A'), harness: 'H-1', appareil: 'H160', retest: '08/07/2024', longueur: 2500 })).filter(l => l.cable !== 'W-014').map(l => l.cable === 'W-012' ? liaison({ ...l, type: 'DR16' }) : l);
  H1.push(liaison({ de: '302CB1', borneDe: '3', pnDe: 'MS3320-10', vers: '305XX9', borneVers: '1', pnVers: 'ZZZ', cable: 'W-099', type: 'DR20', plan: '1', fwd: F(1, 'A'), harness: 'H-1', appareil: 'H160', longueur: 2500 }));
  H1.push(liaison({ de: '305XX9', borneDe: '2', pnDe: 'ZZZ', vers: '901G', borneVers: '', cable: 'W-098', type: 'DR20', plan: '1', fwd: F(1, 'A'), harness: 'H-1', appareil: 'H160', longueur: 2500 }));
  const H2 = E.slice(0, 60).map(l => liaison({ ...l, fwd: F(l.plan, 'B'), harness: 'H-2', appareil: 'H175', retest: '27/10/2025' }));
  const H3 = E.filter(l => l.plan === '2').map(l => { const m = r => r === '667VT2' ? '677VT2' : r, b = (r, bo) => r === '667VT2' ? String(bo).replace(/^51/, '52') : bo;   // (v83 : la barrette de l'exemple est 667VT2 ; ici sous un autre repère, sur son module voisin)
    return liaison({ ...l, de: m(l.de), borneDe: b(l.de, l.borneDe), vers: m(l.vers), borneVers: b(l.vers, l.borneVers), fwd: F(2, 'C'), harness: 'H-3', appareil: 'H160', retest: '12/03/2025', descriptionDe: l.de === '210SP1' ? 'CALCULATEUR' : '' }); });
  const m4 = r => ({ '303RL1': '303RL7', '304LP1': '304LP5' })[r] || r, sansPn = r => r === '303RL7' || r === '304LP5';
  const H4 = E.filter(l => l.plan === '1').map(l => { const de = m4(d(l.de)), vers = m4(d(l.vers)); return liaison({ ...l, de, vers, pnDe: sansPn(de) ? '' : l.pnDe, pnVers: sansPn(vers) ? '' : l.pnVers, fwd: F(1, 'D'), harness: 'H-4', appareil: 'H160', retest: '02/02/2023' }); });
  adopterReferences([...H1, ...H2, ...H3, ...H4], 'essai'); }

(async () => {
  const M = modele(), X = fixtures(M); console.log('jeux d’essai dans ' + X.dir + ' : ' + ['neuf.xlsx (' + X.neufL.length + ' lignes, 3 folios)', 'gros.xlsx (' + X.grosN + ' lignes, ' + X.grosFolios + ' folios)', 'vide, une ligne, sans PN, inconnus, deux feuilles, deux harness'].join(', '));
  const nav = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
  const grand = { viewport: { width: 1600, height: 950 } }, tel = { viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 2 };

  /* ================================================================ A. UN CONTRAT NEUF ======================= */
  await parcours('A. Un contrat neuf — la bibliothèque, une installation, l’installation ajouté et ouvert, les folios, la recherche, une correction, la mémoire, les exports', async () => {
    const ctx = await nav.newContext(grand); let page = await ouvrirPage(ctx);
    let e = await etat(page);
    // le premier lancement montre la BIBLIOTHÈQUE, plus l'exemple ni une page qui explique : vide, deux
    // façons de commencer (une installation neuve, la base des plans déjà faits) ; l'Exemple, discret, en dernier
    const A0 = await page.evaluate(() => ({ biblio: BIB.vue === 'racine' && !$('bibliotheque').hidden, vide: !!document.querySelector('#bibliotheque .bi-vide'), demo: !!document.querySelector('#bibliotheque .bi-carte.bi-demo'),
      gestes: ['nouvelle', 'base'].filter(k => !document.querySelector(`#bibliotheque .bi-vide [data-bi="${k}"]`)), titre: document.title }));
    ok(e.n === 0 && !e.insp && A0.biblio && A0.vide && A0.demo && !A0.gestes.length && A0.titre === 'VOLTA', 'le premier lancement montre la bibliothèque, pas l’exemple : vide, ses gestes pour commencer (« Ouvrir un fichier… », « Nouvelle installation », la base des plans), l’Exemple discret en dernier', JSON.stringify(A0));
    frottement(A0.biblio && !e.n, 'à la première ouverture, c’est l’exemple qui s’affiche, pas l’accueil', 'le technicien qui ouvre l’outil pour un contrat neuf arrive sur un contrat qui n’est pas le sien ; il doit « Tout effacer » pour voir la page d’entrée',
      'détail', '10-demarrage.js `demarrer` : sans contrat gardé, montrer l’accueil (#vide) avec « Voir l’exemple » plutôt que charger l’exemple d’office — ou garder l’exemple mais dire dans l’en-tête qu’il s’agit de l’exemple');
    await capture(page, 'A-0-premier-lancement');
    // l'exemple, à la demande : d'un seul clic sur sa carte (audit v72, P2-2) ; le fil de la barre du haut le dit ; la marque ramène à la bibliothèque
    await page.click('#bibliotheque .bi-carte.bi-demo .bi-carte-corps');
    await page.waitForFunction(() => app.nom === 'Plan d’exemple' && !!app.dessin); await page.waitForTimeout(300);
    ok(await page.evaluate(() => $('vide').hidden && $('bibliotheque').hidden && $('en-install').textContent === 'Exemple' && $('en-plan').textContent === 'Plan d’exemple'), 'l’exemple ouvert de sa carte : le fil de la barre du haut dit « Exemple / Plan d’exemple »');
    await page.click('#en-biblio'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => BIB.vue === 'racine' && !!$('bi-reprendre') && /Plan d’exemple/.test($('bi-reprendre').textContent)), 'la marque ramène à la bibliothèque : « Reprendre » l’exemple, resté sur la table');
    await capture(page, 'A-1-bibliotheque');
    // le retest : une installation neuve, « Ajouter un plan », le fichier, un clic sur sa ligne
    const O = await ouvrirDepuisBibliotheque(page, X.neuf, 'Antenne VHF'), tOuvrir = O.t; const tPlacement = await derniere(page, 'placement');
    e = await etat(page); mesure('ajouter neuf.xlsx (64 lignes) à une installation, l’ouvrir, jusqu’au plan dessiné', tOuvrir, SEUIL_FOLIO); mesure('dont le placement du premier folio', tPlacement);
    ok(e.folios === 3 && e.plan === FWD(1) && e.n === X.neufL.length, 'trois folios, le premier affiché, les ' + X.neufL.length + ' liaisons du fichier', e.plan + ' · ' + e.lbl);
    const herite = await page.evaluate(() => ({ charges: [...app.contrat.charges.keys()], designations: app.contrat.designations.size, sexes: app.contrat.sexes.size, raccords: app.contrat.raccords.size }));
    frottement(!herite.charges.length && !herite.designations && !herite.sexes && !herite.raccords, 'les choix du contrat d’avant survivent à l’ouverture d’un nouveau fichier', 'le profil de charge de l’exemple (102CB1 : 9,31 A pendant 2 min) s’applique au 102CB1 du nouveau installation, qui n’en a pas : l’en-tête lui compte des problèmes qui ne sont pas les siens ; désignations, sexes des contacts et raccords survivraient de même (ici : charges ' + herite.charges.join(',') + ')',
      'bloquant', '08-interface.js `chargerContrat` (et l’action « vider ») : repartir de `nouveauContrat()` en gardant le cartouche — designations, sexes, charges, raccords vides ; `relire()` les rend quand on rouvre SON contrat');
    ok(/«\s?neuf\s?» ajouté à «\s?Antenne VHF\s?»/.test(O.ajout) && new RegExp('\\b' + X.neufL.length + '\\sliaisons').test(O.ajout) && /3\sfolios/.test(O.ajout), 'le message de l’ajout dit le plan, son installation, ses liaisons (celles du fichier) et ses folios', O.ajout);
    ok(await page.evaluate(() => $('en-install').textContent === 'Antenne VHF' && $('en-plan').textContent === 'neuf'), 'le fil de la barre du haut : « Antenne VHF / neuf »');
    // le menu compte les repères comme l'index (sans renvois, masses ni rails ; avec les barrettes à poser) : un seul nombre pour un même mot
    const enTete = await page.evaluate(() => ({ sous: $('ctx-txt').textContent, reperes: reperesDuContrat().length }));
    ok(new RegExp('^' + X.neufL.length + '\\sliaisons · ' + enTete.reperes + '\\srepères · 3\\sfolios$').test(enTete.sous) && enTete.reperes > 0 && enTete.reperes <= X.neufReperes.length, 'le menu compte juste : liaisons, repères (ceux de l’index), folios', enTete.sous + ' (l’index : ' + enTete.reperes + ' repères)');
    ok(/neuf/.test(e.enNom), 'le menu dit quel fichier est ouvert', e.enNom);
    const blocs = await page.evaluate(() => app.dessin.comps.filter(c => c.kind !== 'tag').map(c => c.name).sort());
    ok(X.neufFolio1.every(r => blocs.includes(r)) && blocs.every(b => X.neufFolio1.includes(b)), 'les repères du plan sont ceux du fichier (folio 1)', blocs.join(' '));
    ok(await page.evaluate(() => [...document.querySelectorAll('#fo-strip .chip')].map(c => c.textContent).join(' ')) === [FWD(1), FWD(2), FWD(6)].join(' '), 'la barre du bas porte les trois dessins (FWD) du fichier');
    await capture(page, 'A-2-plan-folio1');
    // parcourir les folios : clavier, puis la barre du bas
    let t0 = Date.now(); await page.keyboard.press('ArrowRight'); await page.waitForFunction(p => app.plan === p, FWD(2)); mesure('→ folio 2 (20 fils) au clavier', Date.now() - t0, SEUIL_FOLIO, PROPOSITION_FOLIO, GROUPE_FOLIO);
    e = await etat(page); ok(e.plan === FWD(2) && e.lbl === '2 / 3', 'flèche droite : folio 2', e.lbl);
    t0 = Date.now(); await page.keyboard.press('ArrowRight'); await page.waitForFunction(p => app.plan === p, FWD(6)); mesure('→ folio 3 (36 fils) au clavier', Date.now() - t0, SEUIL_FOLIO, PROPOSITION_FOLIO, GROUPE_FOLIO);
    e = await etat(page); ok(e.plan === FWD(6) && e.lbl === '3 / 3', 'flèche droite : folio 3', e.lbl);
    ok(await page.evaluate(() => $('fo-next').disabled && !$('fo-prev').disabled), 'au dernier folio, « suivant » est grisé');
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(200); await page.click('#fo-strip .chip:first-child'); await page.waitForTimeout(300);
    e = await etat(page); ok(e.plan === FWD(1) && e.lbl === '1 / 3', 'flèche gauche, puis un clic sur la première puce : folio 1', e.lbl);
    t0 = Date.now(); await page.click('#fo-next'); await page.waitForFunction(p => app.plan === p, FWD(2)); mesure('folio déjà vu, par le bouton « suivant »', Date.now() - t0, 500);
    await capture(page, 'A-3-plan-folio2');
    // la recherche : « / », un repère d'un autre folio, Entrée → le bon folio, la fiche, le bloc cadré
    await page.keyboard.press('/'); await page.waitForTimeout(150);
    ok(await page.evaluate(() => document.activeElement === $('pa-q') && paletteOuverte()), '« / » ouvre la recherche (la palette : repères, câbles, actions), le curseur dans son champ');
    await page.keyboard.type('610LP'); await page.waitForTimeout(250);
    const cands = await page.evaluate(() => [...document.querySelectorAll('#palette .pa-l')].map(x => x.textContent));
    ok(cands.length >= 1 && /^610LP3/.test(cands[0]) && await page.evaluate(() => /^610LP3/.test((document.querySelector('#palette .pa-l.on') || {}).textContent || '')), 'la liste propose 610LP3 en premier, déjà choisi', cands.slice(0, 3).join(' | '));
    t0 = Date.now(); await page.keyboard.press('Enter'); await page.waitForFunction(() => app.cible && app.cible.nom === '610LP3'); await page.waitForTimeout(450); mesure('recherche → folio 3 et fiche de 610LP3', Date.now() - t0, SEUIL_FOLIO);
    e = await etat(page); const cad = await cadrage(page, '610LP3');
    ok(e.plan === FWD(6) && e.cible === '610LP3' && e.insp, 'Entrée ouvre la fiche de 610LP3 sur son folio', e.plan + ' · ' + e.cible);
    ok(cad.dedans, 'le bloc est cadré, entier dans la place libre à côté de la fiche', cad.detail);
    ok(await page.evaluate(() => !paletteOuverte()), 'la recherche s’est refermée');
    await capture(page, 'A-4-recherche-610LP3');
    await page.keyboard.press('Escape'); await page.keyboard.press('/'); await page.keyboard.type('W-104'); await page.waitForTimeout(200); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
    e = await etat(page); ok(e.plan === FWD(2) && e.cible === 'W-104' && e.insp, 'chercher un numéro de fil (W-104) ouvre sa fiche sur le folio 2', e.plan + ' · ' + e.cible);
    // corriger un fil dans le tableau (B) : l'autre bout de W-013 change → un bloc nouveau sur le plan ; Ctrl+Z
    await page.keyboard.press('Escape'); await page.click('#fo-strip .chip:first-child'); await page.waitForTimeout(300); await page.keyboard.press('b'); await page.waitForTimeout(500);
    ok(await page.evaluate(() => app.base.ouvert && $('ba-portee').querySelector('[aria-pressed="true"]').dataset.portee === 'folio' && $('ba-tbody').querySelectorAll('tr[data-i]').length === 8), 'B ouvre le tableau sur « ce folio » : les huit lignes du folio 1');
    // (v85 : votre fichier est la source dure) le tableau se lit, il ne se corrige pas : un double-clic sur une ligne n'ouvre aucun champ ;
    // pour changer un bout, on change son fichier — tout au même endroit
    const i13 = await page.evaluate(() => verite().findIndex(l => l.cable === 'W-013'));
    await page.dblclick(`#ba-tbody tr[data-i="${i13}"] td:nth-child(3)`); await page.waitForTimeout(300);
    ok(await page.evaluate(i => !document.querySelector('#ba-tbody input, #ba-tbody select, #ba-tbody [contenteditable="true"]') && verite()[i].vers === '104LP1', i13), 'le tableau se lit, il ne se corrige pas : un double-clic sur une ligne n’ouvre aucun champ (votre fichier est la source)');
    await capture(page, 'A-5-tableau');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    const planAvant = (await etat(page)).plan; await page.waitForTimeout(800);   // l'enregistrement attend 400 ms après le dernier geste
    // fermer et rouvrir : la bibliothèque, et le plan resté sur la table se reprend tel quel
    await page.close(); page = await ouvrirPage(ctx); await page.waitForTimeout(500);
    ok(await page.evaluate(() => BIB.vue === 'racine' && installsVraies().some(i => i.nom === 'Antenne VHF') && /neuf/.test(($('bi-reprendre') || {}).textContent || '')), 'rouvert : la bibliothèque (l’installation Antenne VHF y est), « Reprendre » neuf');
    await page.click('#bi-reprendre'); await page.waitForTimeout(300);
    e = await etat(page); const sauve = await page.evaluate(() => $('ctx-sauve').textContent);
    ok(e.nom === 'neuf.xlsx' && e.n === X.neufL.length && e.plan === planAvant && e.folios === 3, 'rouvert : le même plan, le même folio, ses ' + X.neufL.length + ' liaisons', e.nom + ' · ' + e.plan + ' · ' + sauve);
    frottement(!e.base, 'rouvert, le tableau revient ouvert, devant le plan', 'le tiroir ouvert avant la fermeture s’ouvre d’office à la réouverture (`relireBase`) : le plan n’a plus toute la place quand on « scanne »', 'détail', '10-demarrage.js / 08-interface.js `relireBase` : rouvrir sur le plan seul, le tableau à la demande (B), ou ne garder que sa hauteur');
    // les exports : SVG, PNG, la nomenclature et son CSV
    let d = await telecharger(page, async () => { await ligneDuMenu(page, 'svg'); });
    ok(/^neuf-folio-MEE256A78150\d\dA\.svg$/.test(d.nom) && fs.statSync(d.chemin).size > 5000 && /<svg/.test(fs.readFileSync(d.chemin, 'utf8').slice(0, 300)), 'le folio s’enregistre en SVG, nommé par le contrat et le dessin', d.nom + ' · ' + fs.statSync(d.chemin).size + ' o');
    d = await telecharger(page, async () => { await ligneDuMenu(page, 'png'); });
    ok(/\.png$/.test(d.nom) && fs.statSync(d.chemin).size > 5000, 'et en PNG', d.nom + ' · ' + fs.statSync(d.chemin).size + ' o');
    t0 = Date.now(); await page.keyboard.press('n'); await page.waitForFunction(() => app.fiche && app.fiche.mode === 'nomenclature'); mesure('N → la nomenclature', Date.now() - t0, SEUIL_GESTE);
    const nomen = await page.evaluate(() => ({ tuiles: [...document.querySelectorAll('.no-resume .no-tuile')].map(t => t.textContent.replace(/\s+/g, ' ').trim()), tables: document.querySelectorAll('.no-table').length }));
    ok(nomen.tuiles.length >= 5 && nomen.tables >= 3, 'la nomenclature : des tuiles de résumé et ses tables', nomen.tuiles.join(' | '));
    await capture(page, 'A-6-nomenclature');
    d = await telecharger(page, () => page.click('#no-csv'));
    // (le nom « neuf — nomenclature.csv » porte un tiret cadratin : Chromium sous pilote le rapporte « download », on juge le contenu)
    const csv = fs.readFileSync(d.chemin, 'utf8'); ok(/^﻿?Section;Référence;Détail;Quantité;Unité;Où/.test(csv) && csv.split('\n').length > 5, 'la nomenclature s’enregistre en CSV (Section ; Référence ; …)', d.nom + ' · ' + csv.split('\n').length + ' lignes');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    ok(!page.erreurs.length, 'aucune erreur console', page.erreurs.slice(0, 3).join(' | '));
    await ctx.close(); });

  /* ================================================================ B. JE PARS D'UN CONTRAT DÉJÀ FAIT ====== */
  await parcours('B. Je pars d’un plan déjà fait — la base, « Déjà fait », le FWD à trois échelles, reprendre, revérifier, Ctrl+Z, les « ? »', async () => {
    const ctx = await nav.newContext(grand), page = await ouvrirPage(ctx);
    await page.evaluate(baseEssaiDansLaPage); await page.waitForTimeout(300);
    const tOuvrir = await ouvrirParBouton(page, 'menu', X.neuf); mesure('ouvrir l’installation proche (neuf.xlsx) avec une base de 4 machines', tOuvrir, SEUIL_FOLIO);
    // sur chaque fiche du folio 1 : « Déjà fait » propose la machine la plus proche, en premier
    const deja = [];
    // (v79) « Déjà fait » est un onglet de la fiche en grand (« Tout voir ») : il paraît dès qu'une base de plans déjà faits est chargée
    const versDejaFait = async () => { if (!(await page.evaluate(() => document.body.classList.contains('insp-grand')))) { await page.click('#fi-tout-voir'); await page.waitForTimeout(600); } await page.click('#nv-o-dejafait'); await page.waitForTimeout(400); };
    for (const nom of X.neufFolio1) { await cliquerBloc(page, nom); await versDejaFait();
      deja.push(await page.evaluate(nom => { const d = document.querySelector('#ba-equip .fi-deja'), cs = d ? [...d.querySelectorAll('.fi-cand')] : []; const taux = cs.map(c => parseInt(c.querySelector('.cd-taux').textContent, 10)), max = Math.max(...taux);
        return { nom, n: cs.length, premier: cs[0] ? cs[0].dataset.ref + '/' + cs[0].dataset.rep + ' ' + taux[0] + ' %' : '', meilleur: cs.length ? taux[0] === max : false, dessin: cs[0] ? !!cs[0].dataset.fwd : false, refs: cs.map(c => c.dataset.ref),
          memeRepereAuMax: cs.some((c, i) => c.dataset.rep === nom && taux[i] === max), premierMemeRepere: !!cs[0] && cs[0].dataset.rep === nom, fiche: __mes.fiche[__mes.fiche.length - 1] }; }, nom)); }
    ok(deja.every(x => x.n > 0 && x.n <= 3), '« Déjà fait » sur les cinq équipements du folio 1 : une à trois machines chacun', deja.map(x => x.nom + ' → ' + x.premier).join(' · '));
    ok(deja.every(x => x.meilleur && x.dessin), 'la première proposée est la plus ressemblante, avec son dessin (FWD)');
    ok(deja.every(x => x.refs.includes('H-2')), 'la machine identique (H-2) est proposée sur chacune des cinq fiches');
    frottement(deja.every(x => !x.memeRepereAuMax || x.premierMemeRepere), 'à égalité de ressemblance, la machine qui porte le même repère ne passe pas devant', deja.filter(x => x.memeRepereAuMax && !x.premierMemeRepere).map(x => x.nom + ' → ' + x.premier + ' alors que H-2/' + x.nom + ' fait autant').join(' · '),
      'détail', '09-references.js `candidatsDeReference`, le tri : après le part number et le taux, le même repère puis le même appareil (une autre machine du même programme ressemble plus qu’une zone décalée)');
    mesure('la fiche la plus lente avec « Déjà fait »', Math.max(...deja.map(x => x.fiche)), SEUIL_FICHE);
    await capture(page, 'B-1-deja-fait-102CB1');
    // 102CB1 contre H-1/302CB1 : la comparaison à trois échelles, puis le dessin
    await cliquerBloc(page, '102CB1'); await versDejaFait(); await page.click('#ba-equip .fi-cand[data-ref="H-1"]'); await page.waitForTimeout(500);
    const C1 = await page.evaluate(() => ({ type: app.cible && app.cible.type, portees: document.querySelectorAll('#ba-equip .cp-portee [data-portee]').length, pressee: (document.querySelector('#ba-equip .cp-portee [aria-pressed="true"]') || {}).dataset, bilan: (document.querySelector('#ba-equip .cp-bilan') || {}).textContent || '', manque: document.querySelectorAll('#ba-equip .cp-liste .fi-fil.cp-manque').length, differe: document.querySelectorAll('#ba-equip .cp-liste .fi-fil.cp-differe').length, dessin: !!$('cp-dessin'), reprendre: $('cp-reprendre').disabled }));
    ok(C1.type === 'ref' && C1.portees === 3 && C1.pressee && C1.pressee.portee === 'equipement' && /Dessin MEE256A7815001A/.test(C1.bilan) && C1.manque === 1 && C1.differe === 1 && C1.dessin && C1.reprendre, 'la comparaison s’ouvre à l’échelle de l’équipement : trois échelles, le bilan du dessin, une ligne manque, une diffère, rien à reprendre tant que rien n’est coché', C1.bilan.slice(0, 120));
    await page.click('#ba-equip .cp-portee [data-portee="voisinage"]'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => document.querySelectorAll('#ba-equip .cp-liste .fi-groupe.cp-eq').length === 5 && document.querySelectorAll('#ba-equip .cp-liste .fi-groupe.cp-eq-manque').length === 1 && /Voisinage à 1\spas/.test(document.querySelector('#ba-equip .cp-bilan').textContent)), 'le voisinage à un pas : cinq équipements, 305XX9 manque chez nous');
    await page.click('#ba-equip .cp-portee [data-portee="dessin"]'); await page.waitForTimeout(400);
    const VD = await page.evaluate(() => ({ eq: document.querySelectorAll('#ba-equip .cp-liste .fi-groupe.cp-eq').length, bilan: document.querySelector('#ba-equip .cp-bilan').textContent, nouveau: [...document.querySelectorAll('#ba-equip .fi-chip.cp-corr-nouveau')].map(x => x.textContent) }));
    ok(VD.eq === 6 && /^Dessin/.test(VD.bilan) && /5\schez\snous/.test(VD.bilan) && VD.nouveau.some(t => /305XX9/.test(t)), 'le dessin entier : six équipements, cinq chez nous, 305XX9 nouveau', VD.bilan.slice(0, 140));
    await capture(page, 'B-2-comparaison-dessin');
    let t0 = Date.now(); await page.click('#cp-dessin'); await page.waitForFunction(() => document.querySelector('#fw-vue .comp[data-name]')); mesure('ouvrir le dessin FWD MEE256A7815001A (10 fils)', Date.now() - t0, SEUIL_FOLIO); await page.waitForTimeout(400);
    const FW = await page.evaluate(() => ({ titre: $('fw-titre').textContent, cible: !!document.querySelector('#fw-vue .comp[data-name="302CB1"].fw-cible'), manque: !!document.querySelector('#fw-vue .comp[data-name="305XX9"].fw-manque'), items: document.querySelectorAll('#fw-liste .fw-eq').length, premier: (document.querySelector('#fw-liste .fw-eq') || {}).dataset }));
    ok(FW.titre === 'MEE256A7815001A' && FW.cible && FW.manque && FW.items === 6 && FW.premier && FW.premier.nom === '302CB1', 'le calque dessine le FWD : le comparé encadré, 305XX9 en manque, la colonne explique, le comparé d’abord');
    await capture(page, 'B-3-fwd'); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    // cocher, reprendre : les liaisons entrent au contrat, recâblées, sans numéro ; le contrôle revérifie ; Ctrl+Z
    const avant = await page.evaluate(() => ({ n: verite().length, cle: CONTROLE.cle, etat: etatDuControle() }));
    await page.click('#cp-tout'); await page.waitForTimeout(300); ok(await page.evaluate(() => /Reprendre 3/.test($('cp-reprendre').textContent)), 'tout cocher : trois lignes à reprendre (deux manquent, une diffère)');
    t0 = Date.now(); await page.click('#cp-reprendre'); await page.waitForFunction(n => verite().length === n + 3, avant.n); mesure('reprendre trois lignes → le plan et le contrôle refaits', Date.now() - t0, SEUIL_FOLIO); await page.waitForTimeout(400);
    const R = await page.evaluate(n => { const V = verite(), neuves = V.slice(n), etranger = r => /^3\d\d/.test(r) && r !== '305XX9'; return { n: V.length, recablees: neuves.every(l => !etranger(l.de) && !etranger(l.vers)), sansNumero: neuves.every(l => !l.cable), pnNotre: neuves.some(l => l.de === '102CB1' && l.pnDe === 'MS3320-10'), dessine: app.dessin.comps.some(c => c.name === '305XX9'), plan: neuves.map(l => l.plan).join(','), longueurs: neuves.map(l => l.longueur), routes: neuves.map(l => l.route), cle: CONTROLE.cle, etat: etatDuControle(), cible: app.cible && app.cible.type + ':' + app.cible.nom }; }, avant.n);
    ok(R.n === avant.n + 3 && R.recablees && R.sansNumero && R.pnNotre && R.dessine, 'reprise : les trois liaisons entrent au contrat, recâblées sur nos repères, avec notre part number, sans numéro de fil ; 305XX9 se dessine', 'folios ' + R.plan + ' · ' + R.cible);
    ok(R.cle !== avant.cle, 'le contrôle a été refait sur le contrat repris', avant.etat + ' → ' + R.etat);
    frottement(!R.longueurs.some(x => x === 2.5), 'la longueur de fil de l’autre machine est copiée telle quelle', 'les lignes reprises portent 2,5 m, la longueur mesurée sur H-1 : une autre machine, une autre longueur — la chute se calcule sur un chiffre qui n’est pas le nôtre, sans le dire',
      'gênant', '09-references.js `liaisonsAReprendre` / `liaisonsDEnsembleAReprendre` : ne pas copier `longueur` (laisser l’hypothèse, qui est dite), ou la marquer « longueur de H-1 » sur la fiche du fil');
    note('ce qui n’est PAS repris (on repart de zéro) : le numéro de fil (voulu : la plage maison n’est pas connue), le raccord, le sexe des contacts, le calibre et le profil du disjoncteur de l’autre machine — la base ne garde que les liaisons de l’installation ; routes reprises : ' + R.routes.join(', '));
    await capture(page, 'B-4-reprise');
    await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(800);
    ok(await page.evaluate(n => verite().length === n && !app.dessin.comps.some(c => c.name === '305XX9'), avant.n), 'Ctrl+Z défait la reprise, 305XX9 quitte le plan');
    // les repères proposés en « ? » : H-4 relie 303RL7 (sans part number) à notre 103RL1 par les voisins — peut-on le confirmer, le changer ?
    await cliquerBloc(page, '102CB1'); await versDejaFait(); await page.click('#ba-equip .fi-cand[data-ref="H-4"]'); await page.waitForTimeout(500);
    const Q = await page.evaluate(() => { const xs = [...document.querySelectorAll('#ba-equip .fi-chip.cp-corr-voisins, #ba-equip .fi-chip.cp-corr-code')]; return { n: xs.length, textes: xs.map(x => x.textContent), cliquables: xs.filter(x => x.tagName === 'BUTTON' || x.onclick || x.getAttribute('role') === 'button' || x.tabIndex >= 0).length, lignes: [...document.querySelectorAll('#ba-equip .cp-liste .fi-corr')].map(x => x.textContent) }; });
    ok(Q.n >= 1 && Q.textes.some(t => /303RL7 → 103RL1\s\?/.test(t)), 'contre H-4, l’outil propose 303RL7 → 103RL1 avec un « ? » (même code, mêmes voisins, à confirmer)', Q.textes.join(' · '));
    frottement(Q.cliquables === Q.n && Q.n > 0, 'un repère proposé en « ? » ne se confirme ni ne se corrige', 'les puces « 303RL7 → 103RL1 ? » sont inertes : on ne peut ni valider la correspondance ni la changer avant de reprendre (la feuille de route dit « l’outil propose, vous validez »)',
      'gênant', '08-references.js `ficheComparaison`/`lierComparaison` : rendre les puces `.cp-corr-voisins/.cp-corr-code` actives — un clic ouvre la liste de nos repères de même code, le choix se garde dans REF (une Map repèreRef → nôtre) et passe à `correspondre` par `fixes`');
    await capture(page, 'B-5-proposes');
    // reprendre, puis ouvrir le repris : sa fiche se lit — son repère ne se retape pas ici (le fichier est la source : pas de champ « nom »)
    await cliquerBloc(page, '102CB1'); await versDejaFait(); await page.click('#ba-equip .fi-cand[data-ref="H-1"]'); await page.waitForTimeout(400); await page.click('#cp-tout'); await page.waitForTimeout(200); await page.click('#cp-reprendre'); await page.waitForFunction(n => verite().length === n + 3, avant.n); await page.waitForTimeout(500);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    await cliquerBloc(page, '305XX9'); ok(await page.evaluate(() => app.cible && app.cible.nom === '305XX9' && /305XX9/.test(($('inspecteur').querySelector('.nc-rep-t') || {}).textContent || '') && !$('inspecteur').querySelector('input, textarea, [contenteditable="true"]')), 'la fiche du repris 305XX9 s’ouvre d’un clic sur le plan ; son repère se lit, aucun champ pour le retaper');
    await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
    ok(await page.evaluate(n => verite().length === n, avant.n), 'Ctrl+Z : le plan d’avant');
    // la bible : la base par harness et par dessin, un dessin qui s'ouvre
    await page.evaluate(() => ficheBible('')); await page.waitForTimeout(400); await page.fill('#rf-q', '677VT'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => document.querySelectorAll('#rf-base .rf-voir').length === 1 && /4\sharness/.test(document.querySelector('#fiche-corps').textContent)), 'la bible : quatre harness ; « 677VT » ne laisse que le dessin de H-3');
    t0 = Date.now(); await page.click('#rf-base .rf-voir'); await page.waitForFunction(() => document.querySelector('#fw-vue .comp[data-name]')); mesure('ouvrir le dessin de H-3 (20 fils) depuis la bible', Date.now() - t0, SEUIL_FOLIO, 'le FWD se place en Worker, avec « Le moteur place et route le dessin… » affiché : l’attente est dite, c’est le concours qui est long — rien à changer ici sans accélérer le moteur', 'le dessin FWD d’un folio moyen dépasse trois secondes (en Worker, l’attente est affichée)');
    ok(await page.evaluate(() => $('fw-titre').textContent === 'MEE256A7815002C' && !!document.querySelector('#fw-vue .comp[data-name="677VT2"].fw-on')), 'le dessin de H-3 s’ouvre sur 677VT2');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    ok(!page.erreurs.length, 'aucune erreur console', page.erreurs.slice(0, 3).join(' | '));
    await ctx.close(); });

  /* ================================================================ C. LE CONTRÔLE D'UN PLAN =================
     (repris à la v89 sur les gestes d'aujourd'hui) Ce qui vient du fichier se lit, il ne se retape pas ; ce qui est « à
     régler » a un geste : une barrette ajoutée par VOLTA reçoit son repère, un câble mal protégé passe à la gauge proposée
     (l'Excel corrigé le gardera) ; les choix de VOLTA se prennent dans Modifier, en Automatique / Manuel. */
  await parcours('C. Le contrôle d’un plan — l’état, le panneau Repères (« à régler »), deux gestes, les hypothèses, des choix dans Modifier', async () => {
    const ctx = await nav.newContext(grand), page = await ouvrirPage(ctx, true); await page.waitForTimeout(300);
    let e = await etat(page); const enEtat0 = e.enEtat;
    ok(e.nom === 'Plan d’exemple' && /^\d+\sà régler · \d+\sà voir$/.test(e.enEtat), 'l’exemple : « N à régler · M à voir » — « à régler », c’est ce qui a un geste (le compte de partout)', e.enEtat);
    let t0 = Date.now(); await page.click('#btnIndex'); await page.waitForFunction(() => app.insp.index && document.querySelector('#ba-equip .ix-controle')); mesure('le bouton des repères → le panneau Repères', Date.now() - t0, SEUIL_GESTE);
    const IX = await page.evaluate(() => { const d = document.querySelector('#ba-equip .ix-controle'), c = compteARegler(); return { plie: !d.open, mot: d.querySelector('summary').textContent.replace(/\s+/g, ' ').trim(), regler: c.regler, voir: c.voir, revue: (($('ix-revue') || {}).textContent || '').replace(/\s+/g, ' ').trim(), reperes: +document.querySelector('#ba-equip .ix-n').textContent, n: reperesDuContrat().length }; });
    ok(IX.plie && new RegExp('^' + IX.regler + '\\sà régler').test(IX.mot.replace(/^✕\s*/, '')) && new RegExp('·\\s' + IX.voir + '\\sà voir').test(IX.mot) && /^Commencer la revue\s?V$/.test(IX.revue) && IX.reperes === IX.n,
      'le panneau Repères : tous les repères du plan, en tête « N à régler · M à voir » (replié : on clique si on veut) et « Commencer la revue »', IX.mot + ' · ' + IX.revue + ' · ' + IX.reperes + ' repères');
    await page.click('#ba-equip .ix-controle > summary'); await page.waitForTimeout(250);
    const items = await page.evaluate(() => [...document.querySelectorAll('#ba-equip .co-item')].map(b => { const x = CONTROLE.items[+b.dataset.k]; return { k: +b.dataset.k, nom: x.nom, plan: x.plan, tableau: x.tableau != null, texte: x.texte }; }));
    // (v72, l'audit du parcours P1-5 : les points se rangent par genre — une ligne par niveau, genre et repère)
    ok(await page.evaluate(() => document.querySelector('#ba-equip .ix-controle').open) && items.length >= 6 && items[0].nom === '300XC1' && ['102CB1', 'VT1', 'VT2', 'VT3'].every(n => items.some(x => x.nom === n)),
      'un clic le déplie : les points par genre — l’arrangement de 300XC1 d’abord (le seul problème rouge), puis 102CB1 dans chacun de ses genres, VT1, VT2, VT3', items.map(x => x.nom).join(' '));
    await capture(page, 'C-1-reperes-a-regler');
    // chaque ligne mène à son folio, sa fiche, son bloc cadré ; Alt+← ramène au panneau
    const sauts = []; let retours = 0;
    for (const x of items) { if (x.tableau) continue;
      t0 = Date.now(); await page.locator(`#ba-equip .co-item[data-k="${x.k}"]`).click(); await page.waitForFunction(n => app.cible && app.cible.nom === n, x.nom); const ms = Date.now() - t0; await page.waitForTimeout(450);
      sauts.push({ nom: x.nom + ' f.' + x.plan, ms }); e = await etat(page); const cad = await cadrage(page, x.nom);
      ok(e.plan === x.plan && e.cible === x.nom && e.insp && cad.dedans, `« ${x.nom} » → folio ${x.plan}, sa fiche, le bloc cadré`, ms + ' ms · ' + cad.detail);
      await page.keyboard.press('Alt+ArrowLeft'); const revenu = await page.waitForFunction(() => app.insp.index && !!document.querySelector('#ba-equip .co-item'), null, { timeout: 4000 }).then(() => true, () => false); if (revenu) retours++;
      if (!revenu) { await page.keyboard.press('Escape'); await page.waitForTimeout(200); await page.click('#btnIndex'); await page.waitForFunction(() => app.insp.index && document.querySelector('#ba-equip .ix-controle')); }
      if (!(await page.evaluate(() => document.querySelector('#ba-equip .ix-controle').open))) { await page.click('#ba-equip .ix-controle > summary'); await page.waitForTimeout(200); } }
    ok(retours === sauts.length && sauts.length >= 6, 'Alt+← ramène de la fiche au panneau Repères, à chaque fois', retours + ' retours sur ' + sauts.length);
    mesure('depuis le panneau, le saut de folio le plus lent (' + sauts.sort((a, b) => b.ms - a.ms)[0].nom + ')', sauts[0].ms, SEUIL_FOLIO, PROPOSITION_FOLIO, GROUPE_FOLIO);
    // premier geste : la barrette que VOLTA a ajoutée sur 102CB1:2 (deux câbles sur une borne) reçoit son repère
    await page.keyboard.press('Escape'); await page.waitForTimeout(200); await page.evaluate(() => { allerAuPlan('1'); deselectionner(); }); await cliquerBloc(page, 'VT1');
    const V0 = await page.evaluate(() => ({ propose: ($('vt-repere') || {}).value || '', bouton: (($('vt-poser') || {}).textContent || '').trim(), dit: ((document.querySelector('#ba-equip .nc-meta') || {}).textContent || '').trim(), prot: CONTROLE.items.filter(x => x.nom === '102CB1' && x.genre === 'protection').length }));
    ok(/^\d{3}VT\d+$/.test(V0.propose) && V0.bouton === 'Lui donner son repère' && /ajoutée par VOLTA sur 102CB1:2/.test(V0.dit), 'la carte de VT1 dit d’où elle vient (« ajoutée par VOLTA sur 102CB1:2 ») et propose un repère : « Lui donner son repère »', JSON.stringify(V0));
    await page.fill('#vt-repere', '102VT9'); await page.click('#vt-poser'); await page.waitForTimeout(900);
    e = await etat(page); const pose = await page.evaluate(() => ({ vt1: CONTROLE.items.filter(x => x.genre === 'aposer').map(x => x.texte), dessinee: app.dessin.comps.some(c => c.name === '102VT9') || (app.dessin.barrettes || []).some(b => b.nom === '102VT9' || b.nomVT === '102VT9'), auFichier: verite().some(l => l.de === '102VT9' || l.vers === '102VT9'), prot: CONTROLE.items.filter(x => x.nom === '102CB1' && x.genre === 'protection').length, hist: (app.hist[app.hist.length - 1] || {}).quoi || '' }));
    ok(!pose.vt1.some(t => /102CB1:2/.test(t)) && pose.vt1.length === 2 && pose.dessinee && e.enEtat !== enEtat0, 'VT1 reçoit 102VT9 : elle quitte « à régler », la barrette est sur le plan sous son repère', e.enEtat + ' · ' + pose.hist);
    ok(pose.prot >= V0.prot, 'les câbles qu’elle dessert restent jugés sous 102CB1 (la protection se juge toujours, à travers la barrette — aucun ne sort du contrôle)', V0.prot + ' → ' + pose.prot);
    await capture(page, 'C-3-VT1-posee');
    await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(700);
    e = await etat(page); ok(e.enEtat === enEtat0, 'Ctrl+Z : VT1 redevient « ajoutée par VOLTA », l’état du départ', e.enEtat);
    // second geste : le DR20 vers 103RL1, mal protégé par le 10 A — « Passer en DR16 » sur sa carte ; l'Excel corrigé le gardera
    await page.evaluate(() => { deselectionner(); allerAuPlan('1'); choisirFil(app.dessin.fils.find(w => w.cable === 'W-012')); }); await page.waitForTimeout(600);
    const G0 = await page.evaluate(() => { const b = document.querySelector('#ba-equip [data-reparer][data-type]'); return { geste: b ? b.textContent.trim() : '', type: b ? b.dataset.type : '', courant: [...document.querySelectorAll('#ba-equip .nc-chiffre')].map(c => c.textContent.replace(/\s+/g, ' ').trim()).join(' | '), pilule: !$('btnRetest').hidden, champs: document.querySelectorAll('#ba-equip input, #ba-equip select').length }; });
    ok(G0.geste === 'Passer en DR16' && /Courant\s*inconnu/.test(G0.courant) && !G0.pilule && !G0.champs, 'la carte du câble DR20 → 103RL1 : « Courant inconnu » (VOLTA n’invente rien), aucun champ à retaper, un geste — « Passer en DR16 » (une gauge plus forte : la protection, elle, se juge)', JSON.stringify(G0));
    await page.click('#ba-equip [data-reparer][data-type="DR16"]'); await page.waitForTimeout(800);
    e = await etat(page); const G1 = await page.evaluate(() => ({ type: verite().find(l => l.cable === 'W-012').type, pilule: !$('btnRetest').hidden && $('btnRetest').innerText.replace(/\s+/g, ' ').trim(), mot: $('toast').textContent }));
    ok(G1.type === 'DR16' && /Excel corrigé/.test(G1.pilule || '') && e.enEtat !== enEtat0 && /Défaire/.test(G1.mot), 'un clic : le câble passe en DR16, « à régler » descend, la pilule « Exporter l’Excel corrigé » paraît, le message offre « Défaire »', e.enEtat + ' · ' + G1.pilule + ' · ' + G1.mot.slice(0, 80));
    await page.keyboard.press('Escape'); await page.keyboard.press('Control+z'); await page.waitForTimeout(600);
    e = await etat(page); ok(e.enEtat === enEtat0 && await page.evaluate(() => verite().find(l => l.cable === 'W-012').type === 'DR20' && $('btnRetest').hidden), 'Ctrl+Z : le DR20 revient, la pilule s’en va, l’état du départ', e.enEtat);
    // les hypothèses : ⋮ › Réglages les porte ; la fiche y mène d'un mot (« hypothèses »)
    await page.evaluate(() => { deselectionner(); allerAuPlan('1'); choisirBloc(app.dessin.comps.find(k => k.name === '103RL1' && k.kind !== 'tag')); }); await page.waitForTimeout(500);
    await page.click('#fi-tout-voir'); await page.waitForTimeout(600); await page.click('#nv-o-cables'); await page.waitForTimeout(400);
    const H0 = await page.evaluate(() => ({ note: ((document.querySelector('#nv-p-cables .fi-note') || {}).textContent || '').replace(/\s+/g, ' ').trim(), lien: !!document.querySelector('#nv-p-cables .fi-hyp[data-hyp]'), menu: !!document.querySelector('#mp-reglages [data-act="hypotheses"]') }));
    await page.click('#nv-p-cables .fi-hyp[data-hyp]'); await page.waitForFunction(() => app.fiche && app.fiche.mode === 'hypotheses', null, { timeout: 5000 }).catch(() => {});
    const H1 = await page.evaluate(() => ({ mode: app.fiche && app.fiche.mode, texte: $('fiche-corps').textContent.replace(/\s+/g, ' '), champs: [...$('fiche-corps').querySelectorAll('input, select')].length }));
    ok(/^Longueur supposée\s: 5\sm/.test(H0.note) && H0.lien && H0.menu && H1.mode === 'hypotheses' && H1.champs >= 5 && /longueur/i.test(H1.texte) && !/courant supposé|hypothèse de courant/i.test(H1.texte) && !('courant' in (await page.evaluate(() => ({ ...HYPOTHESES })))),
      'ce qui est supposé se dit supposé (« Longueur supposée : 5 m ») et mène aux Hypothèses (aussi dans ⋮ › Réglages) : elles se règlent là — sans aucun courant supposé', H0.note.slice(0, 70) + ' · ' + H1.champs + ' réglages · ' + JSON.stringify({ note: /^Longueur supposée\s: 5\sm/.test(H0.note), lien: H0.lien, menu: H0.menu, mode: H1.mode, longueur: /longueur/i.test(H1.texte), mots: (H1.texte.match(/.{20}(courant supposé|hypothèse de courant).{20}/i) || [''])[0] }));
    await page.evaluate(() => fermerFiche(true)); await page.waitForTimeout(300);
    // des choix dans Modifier (les choix de VOLTA : Automatique / Manuel) changent la LPA : le sexe des contacts du connecteur A de 300XC1, puis une reprise de blindage
    const versModifier = async (nom, folio, conn, ligne) => { await page.evaluate(([n, f]) => { deselectionner(); allerAuPlan(f); choisirBloc(app.dessin.comps.find(k => k.name === n && k.kind !== 'tag')); }, [nom, folio]); await page.waitForTimeout(500);
      await page.click('#fi-tout-voir'); await page.waitForTimeout(600); await page.click('#nv-o-reglages'); await page.waitForTimeout(400);
      if (conn) { await page.click(`#nv-p-reglages .ct-bulle[data-connecteur="${conn}"]`); await page.waitForTimeout(400); }
      await page.evaluate(re => { const li = [...document.querySelectorAll('#nv-p-reglages .nv-somm-i')].find(x => new RegExp(re).test(x.querySelector('.nv-somm-k').textContent)), m = li && li.querySelector('.nv-am-b[data-am="manuel"]'); if (m && m.getAttribute('aria-expanded') !== 'true') m.click(); }, ligne); await page.waitForTimeout(450); };
    const N0 = await page.evaluate(() => JSON.stringify(nomenclatureDuContrat().contacts));
    await versModifier('300XC1', '3', 'A', '^L’arrangement');
    const M0 = await page.evaluate(() => ({ sortes: [...document.querySelectorAll('#nv-p-reglages .nv-mod-t h4')].map(h => h.textContent).join(' | '), fichier: [...document.querySelectorAll('#nv-p-reglages .nv-somm-i.fichier')].every(li => !li.querySelector('input, select, button.nv-am-b')), cands: document.querySelectorAll('#nv-p-reglages .cand[data-cle="300XC1|A"]').length,
      am: [...document.querySelectorAll('#nv-p-reglages .nv-somm-i.choix .nv-am')].every(g => g.querySelectorAll('.nv-am-b').length === 2 && /^Automatique/.test(g.textContent)) }));
    ok(/^Dans votre fichier \| Choix de VOLTA/.test(M0.sortes) && M0.fichier && M0.am && M0.cands >= 2, 'Modifier, trois sortes bien séparées : ce qui vient de votre fichier se lit sans saisie ; chaque choix de VOLTA a « Automatique / Manuel » ; « Manuel » sur l’arrangement de A ouvre les possibles', JSON.stringify(M0));
    await versModifier('300XC1', '3', 'A', '^Ses contacts');
    ok(await page.evaluate(() => document.querySelectorAll('#nv-p-reglages [data-sexe="300XC1|A"]').length === 2), '« Manuel » sur ses contacts à sertir : mâles ou femelles, et chaque borne avec son contact');
    await page.click('#nv-p-reglages [data-sexe="300XC1|A"][data-v="M"]'); await page.waitForTimeout(700);
    const N1 = await page.evaluate(() => JSON.stringify(nomenclatureDuContrat().contacts));
    ok(N1 !== N0 && await page.evaluate(() => app.contrat.sexes.get('300XC1|A') === 'M'), 'des contacts mâles sur A : la LPA des contacts change');
    // un EN 4165 (300XC1) n'a pas de raccord : la reprise de blindage se choisit sur un EN 2997 (351PM1, folio 3)
    await versModifier('300XC1', '3', 'A', '^Le raccord');
    await page.click('#nv-p-reglages [data-raccord="300XC1|A"][data-champ="blindage"][data-v="GND"]'); await page.waitForTimeout(700);
    // (passe 87) la LPA nomme la pièce comme l'onglet Pièces : « collier de blindage (band-it) »
    ok(await page.evaluate(() => !nomenclatureDuContrat().habits.some(h => /band-it/.test(h.quoi) && /300XC1 A/.test(h.ou.join(' '))) && app.contrat.raccords.get('300XC1|A').blindage === 'GND'), 'une reprise de blindage sur le corps d’un EN 4165 : le choix se garde, mais aucun band-it n’entre à la LPA (un EN 4165 n’a pas de raccord)');
    await versModifier('351PM1', '3', '', '^Le raccord');
    await page.click('#nv-p-reglages [data-raccord][data-champ="blindage"][data-v="GND"]'); await page.waitForTimeout(700);
    ok(await page.evaluate(() => nomenclatureDuContrat().habits.some(h => /band-it/.test(h.quoi) && /351PM1/.test(h.ou.join(' ')))), 'une reprise de blindage sur le corps d’un EN 2997 (351PM1) : un band-it entre à la LPA');
    await capture(page, 'C-4-modifier-choix');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200); await page.keyboard.press('Escape'); for (let k = 0; k < 3; k++) { await page.keyboard.press('Control+z'); await page.waitForTimeout(400); } await page.waitForTimeout(300);
    ok(await page.evaluate(n => JSON.stringify(nomenclatureDuContrat().contacts) === n && !app.contrat.raccords.get('300XC1|A') && !app.contrat.raccords.get('351PM1|A'), N0), 'trois Ctrl+Z : la LPA d’avant');
    ok(!page.erreurs.length, 'aucune erreur console', page.erreurs.slice(0, 3).join(' | '));
    await ctx.close(); });

  /* ================================================================ D. LE TÉLÉPHONE ========================== */
  await parcours('D. Le téléphone (390 × 844) — VOLTA se juge sur ordinateur ; ici, rien ne casse et l’essentiel reste sous le doigt', async () => {
    const ctx = await nav.newContext(tel), page = await ouvrirPage(ctx, true); await page.waitForTimeout(400);
    /* un élément est ATTEIGNABLE : visible, dans l'écran, et rien ne le recouvre (ce qu'on touche en son centre, c'est lui) */
    const atteignable = sel => page.evaluate(sel => { const el = document.querySelector(sel); if (!el) return { ok: false, detail: sel + ' absent' }; if (el.hidden || getComputedStyle(el).display === 'none') return { ok: false, detail: sel + ' caché' };
      if (el.scrollIntoView) { try { el.scrollIntoView({ block: 'nearest' }); } catch (_) { } } const r = el.getBoundingClientRect(); if (!r.width || !r.height) return { ok: false, detail: sel + ' sans taille' };
      const dedans = r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, sous = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), lui = sous && (sous === el || el.contains(sous));
      return { ok: dedans && lui, detail: sel + ' ' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + '×' + Math.round(r.height) + (dedans ? '' : ' HORS ÉCRAN') + (lui ? '' : ' recouvert par ' + (sous ? sous.tagName + (sous.id ? '#' + sous.id : '.' + sous.className) : 'rien')) }; }, sel);
    const tous = async (sels, nom) => { const rs = []; for (const s of sels) rs.push(await atteignable(s)); const mal = rs.filter(r => !r.ok); ok(!mal.length, nom, mal.map(r => r.detail).join(' | ') || rs.length + ' éléments'); };
    await tous(['#btnBase', '#btnIndex', '#btnCherche', '#btnUndo', '#btnBible', '#btnMenu', '#zfit', '#fo-strip .chip.on'], 'au téléphone, le rail (en bas), la barre du haut et les folios sont atteignables');
    ok(await page.evaluate(() => !$('en-etat') && !$('btnIndex').querySelector('.rd-point').hidden), 'l’état du contrat est sur le bouton des repères (la barre du haut ne le porte plus)');
    await capture(page, 'D-1-exemple');
    // A : la bibliothèque, le retest, le plan, les folios
    await ligneDuMenu(page, 'bibliotheque'); await page.waitForTimeout(400);
    await tous(['#en-biblio', '#bibliotheque .bi-vide [data-bi="nouvelle"]', '#bibliotheque .bi-vide [data-bi="base"]', '#bi-reprendre'], 'la bibliothèque : la marque, « Nouvelle installation », « Déposer la base », « Reprendre »'); await capture(page, 'D-2-bibliotheque');
    const tOuvrir = (await ouvrirDepuisBibliotheque(page, X.neuf, 'Antenne VHF')).t; mesure('ajouter neuf.xlsx à une installation et l’ouvrir, au téléphone', tOuvrir, SEUIL_FOLIO);
    let e = await etat(page); ok(e.folios === 3 && e.n === X.neufL.length, 'le plan se dessine, trois folios', e.enSous);
    // v73 (le technicien : « à l'ouverture, le folio n'est qu'une poussière de traits ») : le folio s'ouvre cadré sur son
    // DESSIN — c'est lui qui tient entier entre les barres, la marge de papier autour peut en sortir (MIS À JOUR)
    const vue = await page.evaluate(() => { const bb = VUE.cadrage === 'dessin' ? boiteDuDessin(app.dessin) : app.dessin.bbox, r = $('planche').getBoundingClientRect(), s = app.vue.s; return { cadrage: VUE.cadrage, x0: r.left + app.vue.tx + bb.x * s, y0: r.top + app.vue.ty + bb.y * s, x1: r.left + app.vue.tx + (bb.x + bb.w) * s, y1: r.top + app.vue.ty + (bb.y + bb.h) * s, haut: $('entete').getBoundingClientRect().bottom, bas: $('folios').getBoundingClientRect().top }; });
    ok(vue.x0 >= 0 && vue.x1 <= 390 && vue.y0 >= vue.haut - 1 && vue.y1 <= vue.bas + 1, 'le dessin entier (la feuille, cadrée sur elle) tient entre la barre du haut et celle du bas', JSON.stringify(vue));
    await capture(page, 'D-3-plan');
    let t0 = Date.now(); await page.click('#fo-strip .chip:nth-child(2)'); await page.waitForFunction(p => app.plan === p, FWD(2)); mesure('toucher la puce du folio 2', Date.now() - t0, SEUIL_FOLIO);
    ok(await page.evaluate(() => $('fo-lbl').textContent === '2 / 3' && getComputedStyle($('fo-next')).display === 'none'), 'folio 2 ; les flèches sont rangées (on touche les puces)');
    const bd = await barreFolios(page); if (CAPTURES) { try { await page.screenshot({ path: path.join(CAPTURES, 'D-3b-barre-folios.png'), clip: { x: 0, y: 740, width: 390, height: 60 } }); } catch (_) { } }
    frottement(bd.chevauchent === 0 && bd.debordent === 0 && bd.visibles === bd.n, 'la barre des folios, avec des noms de dessin (FWD) de quinze caractères, n’est plus lisible', `téléphone, ${bd.n} dessins : ${bd.visibles} puces entières dans la bande de ${bd.largeStrip} px (les puces font ${bd.largePuces} px), ${bd.debordent} dont le texte déborde de sa puce rétrécie — les noms se superposent`, 'gênant', PROPOSITION_BARRE);
    // la recherche par le rail
    await page.click('#btnCherche'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => paletteOuverte() && document.activeElement === $('pa-q')), 'le bouton loupe ouvre la recherche (la palette), le curseur dedans');
    await page.keyboard.type('610LP3'); await page.waitForTimeout(300); await page.keyboard.press('Enter'); await page.waitForFunction(() => app.cible && app.cible.nom === '610LP3'); await page.waitForTimeout(500);
    e = await etat(page); const cad = await cadrage(page, '610LP3');
    ok(e.plan === FWD(6) && e.cible === '610LP3' && e.insp, 'toucher le résultat ouvre la fiche de 610LP3 sur son folio', e.plan);
    ok(cad.dedans, 'le bloc est cadré au-dessus de la fiche', cad.detail);
    const insp = await page.evaluate(() => { const r = $('inspecteur').getBoundingClientRect(), rail = $('rail').getBoundingClientRect(); return { h: r.height, bas: r.bottom, rail: rail.top, folios: getComputedStyle($('folios')).display }; });
    ok(insp.h <= 844 * 0.62 + 1 && insp.bas <= insp.rail + 1, 'la fiche monte en tiroir (≤ 62 % de l’écran), le rail reste au-dessous', Math.round(insp.h) + ' px, bas ' + Math.round(insp.bas) + ', rail ' + Math.round(insp.rail));
    frottement(insp.folios !== 'none', 'fiche ouverte, la barre des folios disparaît', 'pour changer de folio il faut d’abord fermer la fiche : un geste de plus à chaque va-et-vient', 'détail', 'style.css `body.insp-ouvert #folios{display:none}` : garder la bande des puces au-dessus du tiroir (elle ne fait que 40 px), ou un geste de balayage sur le plan');
    await page.waitForFunction(() => !$('toast').classList.contains('on'), null, { timeout: 9000 }).catch(() => {});   // le message qui passe couvre un instant le pied de la carte
    await tous(['#in-fermer', '#fi-tout-voir'], 'dans la fiche : fermer et « Tout voir » sont atteignables');
    await capture(page, 'D-4-fiche-610LP3');
    await page.click('#in-fermer'); await page.waitForTimeout(300);
    // un bloc au doigt, le tableau, l'export, la nomenclature
    await cliquerBloc(page, '600XC4'); ok(await page.evaluate(() => app.cible && app.cible.nom === '600XC4'), 'toucher 600XC4 ouvre sa fiche');
    await page.click('#in-fermer'); await page.click('#btnBase'); await page.waitForTimeout(500);
    ok(await page.evaluate(() => app.base.ouvert && $('ba-tbody').querySelectorAll('tr[data-i]').length > 0), 'le bouton du tableau ouvre le tiroir des liaisons');
    ok(await page.evaluate(() => !document.querySelector('#ba-tbody input, #ba-tbody select') && document.documentElement.scrollWidth <= innerWidth + 1), 'le récapitulatif se lit (aucun champ à retaper) et ne déborde pas de côté');
    await capture(page, 'D-5-tableau'); await page.click('#btnBase'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => !app.base.ouvert), 'le même bouton le referme');
    const d = await telecharger(page, async () => { await ligneDuMenu(page, 'svg'); }); ok(/\.svg$/.test(d.nom), 'le menu enregistre le folio en SVG', d.nom);
    await ligneDuMenu(page, 'nomenclature'); await page.waitForTimeout(600);
    // un document est une page au téléphone : de la barre du haut au rail (qui reste en bas, sous le pouce)
    ok(await page.evaluate(() => { const f = $('fiche').getBoundingClientRect(), h = $('entete').getBoundingClientRect(), r = $('rail').getBoundingClientRect();
      return app.fiche && app.fiche.mode === 'nomenclature' && Math.abs(f.top - h.bottom) <= 2 && Math.abs(f.bottom - r.top) <= 2; }), 'la nomenclature s’ouvre en page, entre la barre du haut et le rail');
    await tous(['#no-csv', '#fi-fermer'], 'dans la nomenclature : Enregistrer en CSV et fermer'); await capture(page, 'D-6-nomenclature'); await page.click('#fi-fermer'); await page.waitForTimeout(300);
    // C au téléphone : l'exemple, l'index, une ligne → folio et fiche, le 15 A d'un doigt
    await ligneDuMenu(page, 'exemple'); await page.waitForFunction(() => app.nom === 'Plan d’exemple'); await page.waitForTimeout(400);
    await page.click('#btnIndex'); await page.waitForFunction(() => app.insp.index && document.querySelector('#ba-equip .co-item'));
    ok(await page.evaluate(() => document.querySelectorAll('#ba-equip .co-item').length >= 6 && document.activeElement !== $('ix-q')), 'le bouton des repères ouvre le panneau Repères : ce qui est à régler, par genre, sans voler le clavier');
    await page.click('#ba-equip .ix-controle > summary'); await page.waitForTimeout(200);   // « à régler » se déplie d'un toucher
    await tous(['#ba-equip .co-item', '#ix-q'], 'dans le panneau : une ligne, le filtre'); await capture(page, 'D-7-index');
    await page.locator('#ba-equip .co-item', { hasText: '300XC1' }).first().click(); await page.waitForFunction(() => app.cible && app.cible.nom === '300XC1'); await page.waitForTimeout(500);
    e = await etat(page);
    ok(e.plan === '3' && e.cible === '300XC1' && e.insp, '« 300XC1 » → folio 3, sa fiche (en tiroir)', e.plan + ' · ' + e.cible);
    await capture(page, 'D-8-300XC1');
    await page.click('#in-fermer'); await page.waitForTimeout(300);
    ok(!page.erreurs.length, 'aucune erreur console', page.erreurs.slice(0, 3).join(' | '));
    await ctx.close(); });

  /* ================================================================ E. LES CAS LIMITES ====================== */
  await parcours('E. Les cas limites — vide, une ligne, sans part numbers, codes inconnus, plusieurs feuilles, deux harness, le gros installation', async () => {
    const ctx = await nav.newContext(grand), page = await ouvrirPage(ctx, true); await page.waitForTimeout(300);
    const n0 = (await etat(page)).n;
    // un retest vide (les en-têtes, aucune ligne)
    await deposerParEntree(page, X.vide); let T = await toast(page), e = await etat(page);
    ok(T.erreur && /aucune liaison/.test(T.texte) && e.n === n0 && e.nom === 'Plan d’exemple', 'une installation vide : le message le dit, le contrat ouvert reste', T.texte);
    // une seule ligne
    await deposerParEntree(page, X.uneLigne); await page.waitForFunction(() => app.nom === 'une-ligne.csv'); e = await etat(page);
    ok(e.n === 1 && e.folios <= 1 && await page.evaluate(() => !!app.dessin && app.dessin.fils.length === 1 && $('fo-part').hidden && /^1\sliaison · 2\srepères$/.test($('ctx-txt').textContent)), 'une seule ligne : un fil dessiné, pas de barre de folios, « 1 liaison · 2 repères »', e.enSous);
    await capture(page, 'E-1-une-ligne');
    // sans part numbers
    await deposerParEntree(page, X.sansPN); await page.waitForFunction(() => app.nom === 'sans-pn.csv'); await cliquerBloc(page, '102CB1');
    const SP = await page.evaluate(() => ({ sous: [((document.querySelector('#ba-equip .nc-rep-t') || {}).textContent || ''), ((document.querySelector('#ba-equip .nc-genre-mot') || {}).textContent || ''), ...[...document.querySelectorAll('#ba-equip .nc-chiffre')].map(t => t.textContent.replace(/\s+/g, ' ').trim())].join(' · '), ref: [...document.querySelectorAll('#ba-equip .nc-meta-v')].map(x => x.textContent.trim()).join(' | '), etat: etatDuControle(), items: CONTROLE.items.map(x => (x.nom || 'tableau') + ' : ' + x.texte), charges: [...app.contrat.charges.keys()], dj: /Disjoncteur/.test((document.querySelector('#ba-equip .nc-genre-mot') || {}).textContent || '') }));
    ok(/102CB1/.test(SP.sous) && SP.dj && !/MS3320/.test(SP.ref), 'sans part numbers : la carte de 102CB1 s’ouvre (un disjoncteur, reconnu à son code), sans référence inventée, rien ne casse', SP.sous + ' · ' + SP.ref + ' · ' + SP.etat);
    frottement(!SP.charges.length && !/\d+ A/.test(SP.sous), 'un disjoncteur sans part number ni profil se voit prêter le profil de l’exemple', 'la ligne de nature dit « ' + SP.sous + ' » et le contrôle juge ses fils sur 9,31 A pendant 2 min : le profil de charge du contrat d’avant (102CB1 de l’exemple) n’a pas été effacé à l’ouverture du fichier', 'bloquant', 'le même point que « les choix du contrat d’avant survivent » (chargerContrat)');
    note('sans part number, le contrôle dit : ' + SP.items.join(' ; '));
    await page.keyboard.press('Escape');
    // des codes de repère inconnus (305XX9, 410ZQ2B, K7, RELAIS-1)
    await deposerParEntree(page, X.inconnus); await page.waitForFunction(() => app.nom === 'inconnus.csv'); e = await etat(page);
    const IN = await page.evaluate(() => ({ blocs: app.dessin.comps.filter(c => c.kind !== 'tag').map(c => c.name).sort(), mots: ['305XX9', '410ZQ2B', 'K7', 'RELAIS-1'].map(direRepere) }));
    ok(['305XX9', '410ZQ2B', 'K7', 'RELAIS-1', '102CB1'].every(r => IN.blocs.includes(r)) && e.n === 5, 'des codes inconnus se dessinent en équipements, sans nature inventée', IN.blocs.join(' ') + ' · ' + IN.mots.join(' · '));
    await page.keyboard.press('r'); await page.waitForTimeout(400);
    ok(await page.evaluate(() => [...document.querySelectorAll('#ba-equip .ix-item[data-nom]')].map(b => b.dataset.nom).filter(n => /XX9|ZQ2B|^K7$|RELAIS/.test(n)).length === 4), 'l’index les range parmi les équipements');
    await cliquerBloc(page, '410ZQ2B'); ok(await page.evaluate(() => app.cible && app.cible.nom === '410ZQ2B' && /410ZQ2B/.test((document.querySelector('#ba-equip .nc-rep-t') || {}).textContent || '') && !!document.querySelector('#ba-equip .nc-vignette') && !document.querySelector('#ba-equip input')), 'la carte de 410ZQ2B s’ouvre (un équipement : son brochage dessiné), sans champ pour retaper son nom'); await capture(page, 'E-2-inconnus'); await page.keyboard.press('Escape');
    // un Excel à plusieurs feuilles : une feuille par harness
    await deposerParEntree(page, X.feuilles); await page.waitForTimeout(600); e = await etat(page); T = await toast(page);
    const F2 = await page.evaluate(() => ({ harnais: [...new Set(verite().map(l => l.harness))], refs: app.references ? app.references.index.harnais.size : 0 }));
    frottement(F2.harnais.length === 2 || F2.refs === 2 || /feuille/.test(T.texte), 'un Excel à deux feuilles (un harness par feuille) : seule la première est lue, sans le dire', 'le contrat ouvert porte ' + e.n + ' liaisons du harness ' + F2.harnais.join(',') + ' ; la feuille H-B est ignorée en silence (`texteDuFichier` lit `wb.SheetNames[0]`)',
      'gênant', '02-lecture.js `texteDuFichier` : lire chaque feuille qui porte les en-têtes de l’installation et les enchaîner (le harness distingue déjà les machines), ou dire « 2 feuilles, seule « H-A » est lue »');
    // un fichier à deux harness (une feuille) : la base, et pas de contrat
    const nAvant = (await etat(page)).n; await deposerParEntree(page, X.deuxHarness); await page.waitForTimeout(600); e = await etat(page); T = await toast(page);
    ok(await page.evaluate(() => app.references && app.references.index.harnais.size === 2) && e.n === nAvant && /plans déjà faits/.test(T.texte), 'deux harness dans une feuille : gardés comme plans déjà faits, le contrat ouvert ne change pas, le message le dit', T.texte);
    frottement(!/harnesss/.test(T.texte), 'le message écrit « 2 harnesss »', 'un mot qui finit déjà par un s en reçoit un autre au pluriel', 'détail', '08-interface.js `pluriel` : pas de s après un mot en s ou x (harness, cheminées déjà au pluriel…)');
    frottement(await page.evaluate(() => !!document.querySelector('[data-harness], #choix-harness, .ch-harness')), 'un fichier à plusieurs harness ne propose pas d’en ouvrir un comme contrat', 'le technicien qui ouvre son extrait de base pour « scanner le plan » d’une machine n’a pas le choix : tout part dans la base, rien ne s’ouvre',
      'gênant', '08-interface.js `ouvrirFichier` : quand r.harnais.length > 1, proposer (une petite fiche) « n harness : lequel ouvrir ? » avec « garder tous comme plans déjà faits » — et toujours garder la base');
    await page.evaluate(() => adopterReferences([], ''));
    // un dépôt par glisser-déposer, comme depuis l'explorateur
    await deposer(page, X.uneLigne); await page.waitForFunction(() => app.nom === 'une-ligne.csv'); ok(await page.evaluate(() => window.__depotVu === true && app.nom === 'une-ligne.csv'), 'glisser un fichier sur la fenêtre : la cible de dépôt s’allume, le fichier s’ouvre');
    ok(!page.erreurs.length, 'aucune erreur console sur les cas limites', page.erreurs.slice(0, 3).join(' | '));
    await ctx.close();
    if (SANS_GROS) { note('le gros installation n’a pas été joué (--sans-gros)'); return; }
    /* ---- LE GROS RETEST : 1 500 lignes, 20 folios ---- */
    console.log('\n  — le gros installation : ' + X.grosN + ' lignes, ' + X.grosFolios + ' folios —');
    const ctx2 = await nav.newContext(grand), p2 = await ouvrirPage(ctx2); await p2.waitForTimeout(300);
    const tGros = await ouvrirParBouton(p2, 'menu', X.gros); const pl1 = await derniere(p2, 'placement'); e = await etat(p2);
    ok(e.n === X.grosN && e.folios === X.grosFolios && e.plan === FWD(1), X.grosN + ' liaisons lues, 20 folios (les dessins du fichier), le premier affiché', e.enSous);
    mesure('ouvrir gros.xlsx jusqu’au premier folio dessiné (75 fils)', tGros, SEUIL_FOLIO, PROPOSITION_FOLIO, GROUPE_FOLIO);
    mesure('dont la lecture du fichier et le reste', tGros - pl1); mesure('dont le placement du folio 1', pl1);
    await capture(p2, 'E-3-gros-folio1');
    // la barre des folios avec vingt dessins aux noms longs : lisible ? (les puces défilent-elles, se recouvrent-elles ?)
    const barre = await barreFolios(p2);
    if (CAPTURES) { try { await p2.screenshot({ path: path.join(CAPTURES, 'E-3b-gros-barre-folios.png'), clip: { x: 0, y: 900, width: 1000, height: 50 } }); } catch (_) { } }
    frottement(barre.chevauchent === 0 && barre.debordent === 0 && barre.visibles >= 3, 'la barre des folios, avec des noms de dessin (FWD) de quinze caractères, n’est plus lisible', `grand écran, ${barre.n} dessins : ${barre.visibles} puces entières dans la bande de ${barre.largeStrip} px (les puces font ${barre.largePuces} px), ${barre.debordent} dont le texte déborde de sa puce rétrécie et s’écrit sur la voisine, défilement : ${barre.defile} ; le compteur dit « ${barre.lbl} »`,
      'gênant', PROPOSITION_BARRE);
    for (const k of [2, 3, 4]) { const t0 = Date.now(); await p2.keyboard.press('ArrowRight'); await p2.waitForFunction(p => app.plan === p, FWD(k)); mesure(`→ folio ${k} au clavier (75 fils, jamais vu)`, Date.now() - t0, SEUIL_FOLIO, PROPOSITION_FOLIO, GROUPE_FOLIO); }
    const t1 = Date.now(); await p2.keyboard.press('ArrowLeft'); await p2.waitForFunction(p => app.plan === p, FWD(3)); mesure('← folio 3, déjà vu', Date.now() - t1, 500);
    // les fiches : le calculateur, une barrette, une prise du folio 3 ; puis sur le dernier folio
    for (const nom of ['3300XC1', '3668VT3', '3409VC2A', '3102CB1']) { await cliquerBloc(p2, nom); const ms = await derniere(p2, 'fiche'); mesure('fiche de ' + nom + ' (folio 3)', ms, SEUIL_FICHE, 'la fiche relit tout le contrat à chaque rendu (verite(), liaisonsDuPlan() par ligne : `liaisonsDe` recalcule la signature et les dédoublements des folios d’avant) : indexer une fois par contrat'); }
    await capture(p2, 'E-4-gros-fiche-3300XC1'); await p2.keyboard.press('Escape');
    let t0 = Date.now(); await p2.click('#fo-strip .chip:last-child'); await p2.waitForFunction(p => app.plan === p, FWD(20)); mesure('→ folio 20 par sa puce (jamais vu)', Date.now() - t0, SEUIL_FOLIO, PROPOSITION_FOLIO, GROUPE_FOLIO);
    await cliquerBloc(p2, '20300XC1'); mesure('fiche de 20300XC1 (dernier folio)', await derniere(p2, 'fiche'), SEUIL_FICHE);
    const w = await p2.evaluate(() => { const w = app.dessin.fils.find(w => w.cable === 'W-20312'); if (!w) return null; const t = performance.now(); app.cible = { type: 'fil', l: verite()[w.i] }; ouvrirInspecteur(); return performance.now() - t; });
    if (w != null) mesure('fiche du fil W-20312 (dernier folio)', w, SEUIL_FICHE); else ok(false, 'le fil W-20312 est sur le folio 20');
    await p2.keyboard.press('Escape');
    // les gestes du contrat entier : le contrôle, l'index, le tableau, la nomenclature, la recherche, une correction
    const G = await p2.evaluate(() => { const T = {}; let t = performance.now(); CONTROLE.cle = null; rendreControle(); T.controle = performance.now() - t; T.items = CONTROLE.items.length; T.etat = etatDuControle();
      t = performance.now(); const N = nomenclatureDuContrat(); T.nomenclature = performance.now() - t; T.contacts = N.contacts.reduce((s, x) => s + x.n, 0);
      t = performance.now(); basculerIndex(); T.index = performance.now() - t; T.reperes = document.querySelectorAll('#ba-equip .ix-item[data-nom]').length; fermerInspecteur();
      t = performance.now(); ouvrirBase(); T.tableau = performance.now() - t; T.lignes = $('ba-tbody').querySelectorAll('tr[data-i]').length; app.base.portee = 'tout'; t = performance.now(); rendreBase(); T.tableauTout = performance.now() - t; fermerBase(); app.base.portee = 'folio';
      t = performance.now(); candidats('15300'); T.recherche = performance.now() - t; return T; });
    mesure('le contrôle du contrat entier (' + G.items + ' points, « ' + G.etat + ' »)', G.controle, SEUIL_GESTE, 'le contrôle relit chaque repère (modules, cavités, disjonction) à chaque changement de signature : le faire par folio changé, ou en arrière-plan');
    mesure('la nomenclature (' + G.contacts + ' contacts à sertir)', G.nomenclature, SEUIL_GESTE); mesure('l’index des repères (' + G.reperes + ' repères)', G.index, SEUIL_GESTE);
    mesure('le tableau sur « ce folio » (' + G.lignes + ' lignes)', G.tableau, SEUIL_GESTE); mesure('le tableau sur « tout » (1 500 lignes, 400 montrées)', G.tableauTout, SEUIL_GESTE); mesure('la recherche d’un repère', G.recherche, 200);
    await p2.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); }); await p2.click('#btnBase'); await p2.waitForFunction(() => app.base.ouvert && !!$('ba-tbody').querySelector('tr[data-i]'));
    const iw = await p2.evaluate(() => verite().findIndex(l => l.cable === 'W-20313'));
    // (v85 : le tableau ne se corrige plus — votre fichier est la source) le geste d'aujourd'hui : un câble passe à une autre gauge (une proposition de VOLTA, pour l'Excel corrigé)
    t0 = Date.now(); await p2.evaluate(i => { const l = verite()[i]; changerLiaison(l, 'type', 'DR20', 'gauge proposée'); }, iw); await p2.waitForFunction(i => verite()[i].type === 'DR20', iw); await p2.waitForTimeout(100); mesure('un câble changé de gauge sur le gros plan (le plan, le contrôle, l’enregistrement)', Date.now() - t0, SEUIL_GESTE);
    await p2.keyboard.press('Escape'); t0 = Date.now(); await p2.keyboard.press('Control+z'); await p2.waitForFunction(i => verite()[i].type === 'DR22', iw); mesure('Ctrl+Z sur le gros contrat', Date.now() - t0, SEUIL_GESTE);
    await p2.keyboard.press('b'); await p2.waitForTimeout(300);
    // la mémoire d'un gros contrat : rouvrir
    await p2.waitForTimeout(800); t0 = Date.now(); await p2.reload(); await p2.waitForFunction(() => typeof atelier !== 'undefined' && app.dessin); mesure('rouvrir l’outil sur le gros contrat gardé (le placement du folio n’est pas gardé entre deux sessions, seul l’affinage l’est)', Date.now() - t0, SEUIL_FOLIO, PROPOSITION_FOLIO, GROUPE_FOLIO);
    await p2.waitForFunction(() => BIB.pret); await p2.click('#bi-reprendre'); await p2.waitForTimeout(200);   // l'outil rouvre sur la bibliothèque : « Reprendre »
    e = await etat(p2); ok(e.nom === 'gros.xlsx' && e.n === X.grosN && e.plan === FWD(20) && await p2.evaluate(() => $('bibliotheque').hidden), 'le gros contrat est repris tel quel (« Reprendre »), sur son dernier folio', e.nom + ' · ' + e.plan);
    // l'affinage en arrière-plan : l'écran répond pendant que le Worker travaille
    await p2.evaluate(() => atelier.affinage(true)); await p2.waitForTimeout(3000);
    const A = await p2.evaluate(() => ({ ...atelier.etatAffinage(), visible: !$('affinage').hidden, texte: $('af-txt').textContent }));
    // (passe 87, le lecteur : « ce travail interne ne me concerne pas ») l'affinage tourne en silence : la bande se tait
    ok(A.worker === 'oui' && !A.visible, 'l’affinage tourne en Worker, en silence : la bande se tait (le lecteur : ce travail interne ne le concerne pas)', A.texte);
    t0 = Date.now(); await p2.click('#zin'); await p2.waitForTimeout(50); const tz = Date.now() - t0; mesure('un zoom pendant l’affinage (l’écran répond ?)', tz, 300);
    await capture(p2, 'E-5-gros-affinage');
    ok(!p2.erreurs.length, 'aucune erreur console sur le gros installation', p2.erreurs.slice(0, 3).join(' | '));
    await ctx2.close(); });

  /* ================================================================ LE BILAN ================================ */
  await nav.close();
  console.log('\n' + '─'.repeat(100));
  // un même frottement vu dans plusieurs parcours compte une fois, avec les lettres des parcours
  const uniques = []; J.frottements.forEach(f => { const u = uniques.find(x => x.nom === f.nom); if (u) { u.parcours.push(f.parcours[0]); if (f.detail && f.detail !== u.detail) u.detail += ' | ' + f.detail; } else uniques.push({ ...f, parcours: [f.parcours[0]] }); });
  console.log('FROTTEMENTS CONNUS : ' + uniques.length + (uniques.length ? ' (ne font pas échouer la batterie)' : ''));
  const ordre = { bloquant: 0, 'gênant': 1, 'détail': 2 };
  uniques.sort((a, b) => ordre[a.gravite] - ordre[b.gravite]).forEach(f => console.log(`  [${f.gravite}] ${f.nom}   (${f.parcours.join(', ')})\n      ${f.detail}` + (f.proposition ? `\n      → ${f.proposition}` : '')));
  if (J.regles.length) console.log('FROTTEMENTS RÉGLÉS : ' + J.regles.length + '\n  ' + J.regles.join('\n  '));
  console.log('MESURES : ' + J.mesures.length); J.mesures.forEach(m => console.log('  ' + String(m.ms).padStart(6) + ' ms  ' + (m.seuil && m.ms > m.seuil ? '! ' : '  ') + m.nom + '   (' + m.parcours.split('.')[0] + ')'));
  if (CAPTURES) { fs.writeFileSync(path.join(CAPTURES, 'parcours-mesures.json'), JSON.stringify({ date: new Date().toISOString(), fichier: FICHIER, ok: J.ok, ko: J.ko, frottements: J.frottements, regles: J.regles, mesures: J.mesures, notes: J.notes }, null, 1)); console.log('captures et mesures dans ' + CAPTURES); }
  console.log('\n  ' + J.ok + ' contrôles tiennent · ' + J.ko + ' échec(s) · ' + J.frottements.length + ' frottement(s) connu(s)' + (J.ko ? '' : ' — la batterie passe'));
  process.exit(J.ko ? 1 : 0);
})();
