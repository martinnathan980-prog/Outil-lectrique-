/* ===========================================================================
   08 sexies — LES EXPLICATIONS : le « ? » à côté de chaque valeur choisie
   ---------------------------------------------------------------------------
   Le lecteur : « Explique aussi, avec un petit point d'interrogation, comment
   tu choisis tout : le disjoncteur, la barrette, la prise de coupure, le
   raccord, le band-it, tout — que n'importe qui puisse comprendre. »
   Les fiches mettent un « ? » à côté de chaque valeur que l'outil a choisie ;
   derrière, `explication(cle, contexte)` → { titre, texte } : deux ou trois
   phrases pour n'importe qui — comment l'outil choisit, d'où vient la donnée
   (la table, la norme, la recherche). Un seul endroit pour ces phrases : la
   fiche les montre, ce fichier ne touche pas à la page.
   Chaque phrase dit ce que le moteur fait AUJOURD'HUI (09 : les modules, les
   contacts, la simulation ; 09 bis : les disjoncteurs ; 09 ter : les
   raccords ; 09 quater : la chute) — qui change une règle du moteur change
   sa phrase ici. Les valeurs par défaut se lisent dans les hypothèses
   (`HYPOTHESES`, celles du navigateur, `app.simu`, quand il y en a), pas
   dans le texte.
   `contexte` (facultatif) dit la valeur concrète quand c'est simple ; sans
   lui, ou s'il lui manque ce qu'il faut, le texte général seul. Ce qu'il
   peut porter, par clé :
     calibre      { calibre, origine ('main' | 'pn' | 'ideal'), meilleur (A), permanent, marge, temperature, garanti, famille }
                  — ou `verdict` (`disjonctionDe(…)`, `verdictDisjonction(…)`), ou `meilleur`, l'objet du moteur
     courbe       { famille, tableauMin, tableauMax }
     profil       { permanent, pointe: { i, t }, somme } (somme : la part du temps de déclenchement)
     module       { plan } — `remplirModules` (la référence, les potentiels, les contacts libres)
     arrangement  { plan } — `remplirContacts` (la référence ; nommé par le part number, choisi à la main)
     prise        { plan } — le plan d'une prise (`coupureEnModule(…).plan`)
     contact      { reference, taille, sexe ('M' | 'F'), type, statut, accessoire } — ou `sertir` du moteur
     gauge        { type, jauge, taille, ok }
     raccord, bande, manchon, tyrap, cheminee, toron
                  { habillage } — l'objet du moteur (`habillage(…)`), ou ses champs à plat
     intensite    { type, admis, base, facteur } — ou `fil`, un fil jugé (`protectionDesFils(…)[i]`)
     chute        { dU, admis, regle } — ou `chemin`, une chute en ligne (`chutesDepuis(…)[i]`)
     masse        { cables } (combien de câbles y vont)
     tous         { hyp } — les hypothèses, quand l'appelant les a
   =========================================================================== */
'use strict';

const CLES_EXPLICATIONS = ['calibre', 'courbe', 'profil', 'module', 'arrangement', 'contact', 'gauge', 'raccord', 'bande', 'manchon', 'tyrap', 'cheminee', 'intensite', 'chute', 'toron', 'prise', 'masse'];

/* ---- des mots ------------------------------------------------------------------------------------------------------ */
const exN = x => nombreFr(x), exA = x => nombreFr(x) + ' A', exV = x => nombreFr(x) + ' V', exMm = x => nombreFr(Math.round(x * 10) / 10) + ' mm';
const exS = t => !isFinite(t) ? 'toujours' : t < 60 ? nombreFr(Math.round(t * 10) / 10) + ' s' : nombreFr(Math.round(t / 6) / 10) + ' min';
const exPct = x => nombreFr(Math.round(x * 100)) + ' %';
const exPositif = x => typeof x === 'number' && isFinite(x) && x > 0;
// les hypothèses qui valent : celles de l'outil, celles du navigateur, celles que l'appelant donne
const exHypotheses = c => ({ ...HYPOTHESES, ...((typeof app !== 'undefined' && app && app.simu) || {}), ...((c && c.hyp) || {}) });
// la gamme du lecteur, en mots : « 1 · 3 · 5 · 7,5 · 10 · 15 · 20 · 25 A » (une virgule séparerait mal 7,5 et 10)
const exGamme = H => { const g = (H.calibresPreferes || []).map(Number).filter(x => x > 0); return g.length ? g.map(exN).join(' · ') + ' A' : ''; };
// deux phrases en une explication : la valeur concrète d'abord, puis la règle
const exDeuxTemps = (concret, general) => [concret, general].filter(Boolean).join(' ');
// l'habillage d'un connecteur, qu'on le donne entier (`habillage`) ou à plat
const exHabillage = c => (c && c.habillage) || c || {};

/* ---- les explications, une par clé -------------------------------------------------------------------------------- */
const EXPLICATIONS = {
  calibre: c => { const H = exHypotheses(c), d = c && c.verdict && typeof c.verdict === 'object' ? c.verdict : null;
    const m = (c && c.meilleur && typeof c.meilleur === 'object' ? c.meilleur : null) || (d && d.meilleur) || null, mg = m && m.marge ? m.marge : {};
    const cal = c && exPositif(c.calibre) ? c.calibre : d && exPositif(d.calibre) ? d.calibre : m && exPositif(m.calibre) ? m.calibre : null;
    const best = c && exPositif(c.meilleur) ? c.meilleur : m && exPositif(m.calibre) ? m.calibre : null, origine = (c && c.origine) || (d && d.origine) || (c && c.main ? 'main' : '');
    const perm = c && exPositif(c.permanent) ? c.permanent : exPositif(mg.permanent) ? mg.permanent : null, garanti = c && exPositif(c.garanti) ? c.garanti : exPositif(mg.garanti) ? mg.garanti : null;
    const marge = c && c.marge != null && isFinite(+c.marge) ? +c.marge : mg.courant != null ? mg.courant : +H.marge, T = c && c.temperature != null && isFinite(+c.temperature) ? +c.temperature : isFinite(mg.temperature) ? mg.temperature : +H.tableauMax;
    const fam = (c && typeof c.famille === 'string' ? c.famille : '') || (m && m.famille) || '', gamme = exGamme(H);
    // le meilleur, en mots : ce qu'il tient, avec quelle marge, à quelle température — seulement s'il est bien le calibre dont on parle
    const leMeilleur = `le plus petit calibre de la gamme${fam ? ' ' + fam : ''} qui tient ${perm ? `tes ${exA(perm)} permanents et ` : ''}tes pointes avec ${exN(marge)} % de marge à ${exN(T)} °C${garanti ? ` (il en garantit ${exA(garanti)} au permanent)` : ''}${m && m.serre ? ' — sans la marge : aucun ne l’a' : ''}`;
    const concret = !cal ? '' : origine === 'main' ? `${exA(cal)} : tu l’as choisi à la main${best && Math.abs(best - cal) > 1e-9 ? ` — « Automatique » rend le meilleur, ${exA(best)}` : ''}.`
      : best && Math.abs(best - cal) > 1e-9 ? `${exA(cal)} : ${origine === 'pn' ? 'celui de ton part number' : 'le calibre retenu'} ; le meilleur serait ${exA(best)}, ${leMeilleur}.`
      : best ? `${exA(cal)} : ${leMeilleur}.` : origine === 'pn' ? `${exA(cal)} : lu dans ton part number.` : '';
    return { titre: 'Le calibre', texte: exDeuxTemps(concret, `L’outil prend le plus petit calibre de ta gamme (la famille du part number${gamme ? ', réduite à ' + gamme : ''}) qui tient ton profil avec ${exN(+H.marge)} % de marge sur la courbe la plus rapide (${exN(+H.tableauMax)} °C, le max du tableau), sous ce que la famille garantit à chaud, et à 2:1 de ses voisins. Il ne monte jamais le calibre pour sauver un câble : il grossit le câble. Sources : les courbes de ton Excel (un E-T-A 483) et des constructeurs, la garantie MS3320N et Sensata, la méthode NASA TM-102179 et FAA AC 43.13-1B.`) }; },

  courbe: c => { const H = exHypotheses(c), tmin = c && c.tableauMin != null ? +c.tableauMin : +H.tableauMin, tmax = c && c.tableauMax != null ? +c.tableauMax : +H.tableauMax;
    // la famille de courbes : un nom (« ETA483 »), ou la famille de disjoncteurs du moteur, qui dit sa courbe
    const f = c && c.famille, fam = typeof f === 'string' ? f : f && typeof f === 'object' ? String(f.courbe || f.famille || '') : '';
    return { titre: 'La courbe de déclenchement', texte: exDeuxTemps(fam ? `Ici, les courbes ${fam} : celle de ${exN(tmax)} °C juge le déclenchement, celle de ${exN(tmin)} °C dit ce qui passe dans le câble.` : '',
      `La courbe dit, pour chaque multiple du calibre, au bout de combien de temps le disjoncteur s’ouvre ; l’outil prend celles de la famille du part number, sinon les quatre de ton Excel (un E-T-A 483, à 1-4 % près). La plus rapide, à la température max du tableau (${exN(tmax)} °C), juge si ton profil fait déclencher ; la plus lente, au min (${exN(tmin)} °C), dit ce qu’il laisse passer pour protéger le câble ; entre deux températures, elle est interpolée. Entre deux points lus, l’outil interpole en log-log, et la courbe ne remonte jamais.`) }; },

  profil: c => { const H = exHypotheses(c), perm = c && exPositif(c.permanent) ? c.permanent : null, p = c && c.pointe && exPositif(c.pointe.i) ? c.pointe : null;
    const concret = perm || p ? `Ton profil : ${[perm ? exA(perm) + ' permanents' : '', p ? 'une pointe de ' + exA(p.i) + (exPositif(p.t) && isFinite(p.t) ? ' pendant ' + exS(p.t) : '') : ''].filter(Boolean).join(' et ')}${c && c.somme != null && isFinite(c.somme) ? ` ; le calibre retenu y consomme ${exPct(c.somme)} de son temps de déclenchement` : ''}.` : '';
    return { titre: 'Le profil de charge', texte: exDeuxTemps(concret, `Le profil, c’est ce que tire l’équipement protégé : un démarrage, une transition, les états que tu ajoutes (un courant en A pendant une durée en s), puis le permanent, pour toujours. Le retest ne le porte pas : tu l’écris, l’outil ne l’invente pas. Chaque état devient un point de la courbe, et leurs parts du temps de déclenchement s’additionnent : au plus ${exN(+H.margeTemps)} % avec la marge — un état ajouté après le permanent trouve le disjoncteur déjà chaud (son temps ÷ ${exN(+H.prechauffage)}, feuille MS3320N).`) }; },

  module: c => { const P = c && c.plan ? c.plan : null, libres = P && P.contacts != null && P.utilises != null ? P.contacts - P.utilises : null;
    const concret = P && P.reference ? `${P.reference} : ${P.main ? 'retenu à la main' : `il loge ${P.places === P.potentiels ? 'tes' : P.places + ' de tes'} ${exN(P.potentiels)} potentiel${P.potentiels > 1 ? 's' : ''}`}${libres != null ? `, ${exN(libres)} contact${libres > 1 ? 's' : ''} libre${libres > 1 ? 's' : ''}` : ''}.` : '';
    return { titre: 'Le module de barrette', texte: exDeuxTemps(concret, 'Une barrette se pose en modules de jonction ASNE 0599 ou NSA937901 : la norme de son part number, sinon les deux en concurrence. Chaque potentiel (une borne, ou les bornes reliées par des shunts) prend un groupe de contacts reliés, chaque câble un contact dont la taille admet sa gauge ; l’outil retient le module qui loge le plus de potentiels — d’usage normal d’abord, en perdant le moins de contacts, puis le plus léger — et en ajoute un second s’il le faut. Les faces et les groupes viennent des pages des deux normes, les gauges par taille du catalogue Air LB (recherche R1).') }; },

  arrangement: c => { const P = c && c.plan ? c.plan : null;
    const concret = P && P.reference ? `${P.reference} : ${P.main ? 'retenu à la main' : P.nomme ? 'celui que ton part number nomme' : 'le mieux taillé de la norme pour tes bornes et leurs gauges'}.` : '';
    return { titre: 'L’arrangement', texte: exDeuxTemps(concret, 'L’arrangement, c’est l’insert : la place et la taille de chaque contact. L’outil prend celui que le part number nomme ; sinon, dans la norme du part number (EN 2997, EN 3645, EN 3646, EN 4165, ASNE 0059), celui où chaque borne trouve son contact — une borne numérotée prend la lettre de même rang — d’une taille qui admet la gauge de son câble : d’usage normal d’abord, puis le moins d’accommodements (un manchon, un contact par défaut), puis le moins de contacts. Les faces sont transcrites des figures des normes (EN 2997-002:2023, EN 3645-002:2024, EN 4165-002:2023…).') }; },

  prise: c => { const P = c && c.plan ? c.plan : null;
    const concret = P && P.reference ? `${P.reference}${P.main ? ', retenue à la main' : ''} : ${exN(P.utilises)} contact${P.utilises > 1 ? 's' : ''} utilisé${P.utilises > 1 ? 's' : ''} sur ${exN(P.contacts)}.` : '';
    return { titre: 'La prise de coupure', texte: exDeuxTemps(concret, 'Une prise de coupure a deux moitiés : la fiche (mobile) reçoit les câbles qui arrivent, l’embase (fixe) ceux qui repartent, un câble par contact de chaque côté. L’arrangement se choisit comme pour un connecteur — la norme du part number, sinon les normes de connecteurs en concurrence (EN 4165, EN 2997, EN 3646…) ; les contacts sont femelles côté fiche et mâles côté embase (une hypothèse à confirmer : « Changer » l’inverse), et chaque moitié a son raccord.') }; },

  contact: c => { const s = c && c.sertir ? c.sertir : c || {}, ref = s.reference || '', sexe = (c && c.sexe) || s.sexe || '', taille = (c && c.taille) || '', type = (c && c.type) || '', statut = (c && c.statut) || s.statut || '';
    const mot = sexe === 'F' ? 'la douille (femelle)' : sexe === 'M' ? 'la broche (mâle)' : 'le contact';
    const concret = ref ? `${ref} : ${mot}${taille ? ' taille ' + taille : ''} de la table${type ? ' pour un ' + type : ''}${s.accessoire ? ', avec ' + s.accessoire : ''}${/confirm/i.test(statut) ? ' — une référence à confirmer' : ''}.` : '';
    return { titre: 'Le contact à sertir', texte: exDeuxTemps(concret, 'Il sort de la table Contacts (tes tables SEE, relues par la recherche R1) : pour la norme, la taille de la cavité, le sexe, le type et la gauge du câble, la ligne la plus précise gagne, avec son accessoire (un manchon E0718 si le câble est plus fin que le joint arrière). Le sexe est une hypothèse à confirmer : femelle face à un équipement, femelle côté fiche et mâle côté embase d’une prise, des broches sur une barrette. 59 références (Airbus, fournisseurs) ne sont pas publiques : elles restent « à confirmer ».') }; },

  gauge: c => { const j = c && c.jauge != null ? c.jauge : c && c.type ? jaugeDuType(c.type) : null, taille = c && c.taille ? c.taille : '';
    const concret = j != null ? `${c.type ? c.type + ' : ' : ''}gauge ${exN(j)}${taille ? `, ${c.ok === false ? 'refusée' : 'admise'} par un contact taille ${taille}` : ''}.` : '';
    return { titre: 'La gauge acceptée', texte: exDeuxTemps(concret, 'La gauge (AWG) se lit en queue du type de câble : DR20 → 20. Elle est acceptée quand la table Contacts a une ligne pour cette taille de contact, ce sexe et ce câble ; pour une taille que la table ignore, la plage de la table Tailles (les plages usuelles des contacts EN 3155, à confirmer). Le diamètre du câble doit aussi entrer dans le joint arrière : plus fin, un manchon E0718 ; plus gros, il n’entre pas (Souriau, Amphenol, TE : recherche R1).') }; },

  raccord: c => { const h = exHabillage(c), types = { durci: 'un raccord blindé (durci)', 'pour manchon': 'un raccord pour manchon', 'serre-câble': 'un raccord à serre-câble', tyrap: 'un raccord à collier (tyrap)' };
    const e = h.entree, code = e && e.code && h.designation ? ` ; code ${e.code} parce que ton toron${exPositif(h.toron) ? ' de ' + exMm(h.toron) : ''} tombe dans sa plage${e.dmin != null && e.dmax != null ? ' ' + nombreFr(e.dmin) + '–' + nombreFr(e.dmax) + ' mm' : ''}` : '';
    const mt = h.classe && h.classe.matiere, matiere = mt && mt.matiere ? ` ; ${mt.matiere}${mt.repli ? ' parce que ta table ne l’a pas en ' + mt.voulu + ' et que ta table de compatibilité l’admet' : ' comme le connecteur'}` : '';
    const concret = h.sansRaccord ? 'Aucun raccord : ' + (h.pourquoi || 'cette famille s’utilise sans raccord') + '.'
      : h.cheminee ? 'Une cheminée, pas un raccord : c’est le « raccord » d’un EN 4165 (voir son « ? »).'
      : h.designation ? `${h.designation} : ${types[h.raccord] || 'le raccord'}${h.atelier ? ', celui de ta table CHOIX' : ''}${h.repli ? ' (' + h.repli + ')' : ''}${code}${matiere}.`
      : types[h.raccord] ? `${types[h.raccord].replace(/^un/, 'Un')}${h.manquants && h.manquants[0] ? ' — ce qui manque : ' + h.manquants[0] : ''}.` : '';
    return { titre: 'Le raccord', texte: exDeuxTemps(concret, 'Le type suit la table de ton tutoriel, corrigée par la recherche : tresse reprise sur le corps ou surblindage → raccord blindé (durci) + band-it ; étanche → raccord pour manchon (droit) ou durci (coudé) + manchon ; sinon raccord à collier (tyrap), ou serre-câble pour une reprise par cosse. La pièce est celle de ta table CHOIX pour la famille (EN 3645, EN 2997, EN 3646) ; un type qu’elle n’a pas prend le serre-câble (au lieu du collier) ou le durci (au lieu du raccord pour manchon). Le matériau suit le connecteur, sinon ta table de compatibilité ; la lettre est celle de ta table (F pour le nickelé des EN 3660-062 à -065). La référence EN 3660 se construit : la partie, la lettre, la taille du boîtier, la chambre (A par défaut) et le code d’entrée — le plus petit dont la plage de toron (EN 3660-062 à -065:2022) contient ton toron ; l’IC1320 prend sa taille arrière de la même façon. Un EN 4165 prend une cheminée.') }; },

  bande: c => { const h = exHabillage(c), B = h.collier || null;
    const concret = B && B.reference ? `${B.reference} : ${B.parDefaut ? 'la bande par défaut, ' : ''}elle serre ${exPositif(h.serre) ? 'la plateforme de ' + exMm(h.serre) : 'ton toron'}${B.dmax != null ? ' (jusqu’à ' + exMm(B.dmax) + ')' : ''}${B.equivalent && B.equivalent.reference ? ' ; en équivalent, ' + B.equivalent.reference : ''}.`
      : h.raccord && !h.bandit ? 'Pas de band-it ici : ni tresse reprise sur le corps, ni surblindage.' : '';
    return { titre: 'Le band-it', texte: exDeuxTemps(concret, 'Le band-it serre la tresse sur la plateforme du raccord, en double tour ; l’outil n’en met que si le raccord le demande (une tresse reprise sur le corps, ou un surblindage). Il prend la bande par défaut de la table Colliers — l’EN3660-033AF, 6,22 mm, jusqu’à Ø 47,8 mm, outil EN 3660-038 — tant qu’elle serre la plateforme du code d’entrée retenu ; au-delà, la BF (jusqu’à 63,5 mm), avec l’E0805 d’atelier en équivalent (EN 3660-033:2019, fiches Glenair : recherche R3, vérification D).') }; },

  manchon: c => { const h = exHabillage(c), M = h.manchonRef || null;
    const concret = M && M.designation ? `${M.designation}${M.reference ? ' (' + M.reference + ')' : ''}, ${M.precolle ? 'précollé' : 'à coller'}${h.formeManchon === 'coudé' ? ', coudé' : ''} : son gros bout passe ${exPositif(h.cote) ? 'l’épaulement de ' + exMm(h.cote) : 'le raccord'}, son petit bout ${exPositif(h.sortie) ? 'ce qui sort du raccord (' + exMm(h.sortie) + ')' : 'ton toron'}.` : '';
    return { titre: 'Le manchon', texte: exDeuxTemps(concret, 'Le manchon thermorétractable coiffe l’arrière du raccord et le câble qui en sort. L’outil prend, dans la table VG 95343 (guide HellermannTyton 2024), le plus petit dont le gros bout passe l’épaulement du raccord avant rétreint et le serre après (Ha > C > Hb), et le petit bout de même sur ce qui sort, toron ou gaine (Ja > D > Jb) — dans ta gamme T18 d’abord (l’onglet Raccord : B001A à C002A droits, D001A à D006A coudés), sinon dans tout le guide ; droit d’abord — un raccord coudé fait déjà l’angle —, coudé seulement pour donner l’angle à un raccord droit ou à une cheminée ; le précollé (T18, T19) d’abord, l’étanchéité le demande.') }; },

  tyrap: c => { const h = exHabillage(c), T = h.tyrap || null;
    const concret = T && T.reference ? `${T.reference} : le plus serré qui passe ${exPositif(h.toron) ? 'ton toron de ' + exMm(h.toron) : 'ton toron'}${T.dmax != null ? ' (jusqu’à ' + exMm(T.dmax) + ')' : ''}${/confirm/i.test(T.confiance || T.statut || '') ? ' — cotes à confirmer' : ''}.` : '';
    return { titre: 'Le tyrap', texte: exDeuxTemps(concret, 'Le tyrap tient le toron sur le bras d’un raccord à collier — quand rien ne demande de raccord blindé ni de manchon — ou sur une cheminée EN 4165 sans manchon. L’outil prend, dans la table Colliers, le NSA935401 dont le Ø maximal passe le toron au plus juste, puis le plus court. La plupart de leurs cotes ne sont pas publiques (seuls le -06 et le -13 sont vérifiés) : elles restent à confirmer.') }; },

  cheminee: c => { const h = exHabillage(c), n = c && exPositif(c.modules) ? c.modules : null;
    const concret = h.cheminee || n ? `${n ? exN(n) + ' cheminée' + (n > 1 ? 's' : '') + ' EN 4165-015, une par module câblé' : 'Une cheminée EN 4165-015 par module câblé'}${exPositif(h.toron) ? ' ; ton toron de ' + exMm(h.toron) + ' y passe-t-il ? à confirmer' : ''}.` : '';
    return { titre: 'La cheminée', texte: exDeuxTemps(concret, 'Un connecteur EN 4165 n’a pas de raccord EN 3660 : l’outil y met une cheminée ronde EN 4165-015 par module câblé (la norme a aussi la double ovale -016 pour deux modules voisins, et l’obturateur -017), le toron tenu par un tyrap, ou par un manchon s’il faut l’étanchéité. Son Ø intérieur n’est pas public (EN 4165-014 à -016, payantes) : le passage du toron reste à confirmer (recherche R3).') }; },

  intensite: c => { const H = exHypotheses(c), f = c && c.fil && typeof c.fil === 'object' ? c.fil : null;
    const type = (c && c.type) || (f && f.type) || '', admis = c && exPositif(c.admis) ? c.admis : f && exPositif(f.continu) ? f.continu : null, base = c && exPositif(c.base) ? c.base : f && f.fil && exPositif(f.fil.intensite) ? f.fil.intensite : null;
    const fac = c && exPositif(c.facteur) ? c.facteur : f && exPositif(f.facteur) ? f.facteur : null;
    const concret = admis ? `${type ? type + ' : ' : ''}${base && fac ? `${exA(base)} (EN 2853, câble seul) × ${exN(Math.round(fac * 100) / 100)} = ` : ''}${exA(Math.round(admis * 10) / 10)} en continu.` : '';
    return { titre: 'L’intensité admise', texte: exDeuxTemps(concret, `Ce qu’un câble admet vient de l’EN 2853 : un câble cuivre seul à l’air libre, en continu et pour 2 s, 10 s, 1 min. L’outil le réduit pour le faisceau (AC 43.13-1B fig. 11-5 : ${exN(+H.fils)} câbles chargés à ${exN(+H.charge)} %), l’altitude, l’ambiante (${exN(+H.ambiante)} °C, en continu seulement) et un conducteur qui n’est pas du cuivre (aluminium : −20 %) ; chaque état du profil se compare au palier de sa durée.`) }; },

  chute: c => { const H = exHypotheses(c), x = c && c.chemin && typeof c.chemin === 'object' ? c.chemin : c || {}, mono = exPositif(+H.chuteMono) ? +H.chuteMono : null, tri = exPositif(+H.chuteTri) ? +H.chuteTri : null;
    const regle = x.regle === 'table' ? 'la table Réseau' : x.regle === 'lecteur' ? 'ta règle' : '';
    const concret = x.dU != null && isFinite(x.dU) ? `${exV(Math.round(x.dU * 100) / 100)}${exPositif(x.admis) ? ` pour ${exV(x.admis)} admis${regle ? ' (' + regle + ')' : ''}` : ''}${x.reel === false ? ', sur des longueurs d’hypothèse' : ''}.` : '';
    const admise = mono || tri ? `Elle doit rester sous ta règle (octobre 2026) : ${mono ? exV(mono) + ' au plus en continu et en monophasé' : 'en continu et en monophasé, la table Réseau'}, ${tri ? exV(tri) + ' en triphasé' : 'en triphasé, la table Réseau'} — des hypothèses ; vidées, la table Réseau de l’AC 43.13-1B reprend.`
      : 'Elle doit rester sous la table Réseau de la norme (AC 43.13-1B table 11-6 : 1 V sous 28 V, le double en intermittent) : ta règle est vidée dans les hypothèses.';
    return { titre: 'La chute de tension', texte: exDeuxTemps(concret, `La chute se compte du disjoncteur à l’équipement : chaque câble (sa résistance à la température que son courant lui donne, × sa longueur × le courant), chaque prise traversée (une paire de contacts), chaque barrette (deux), plus la chute propre du disjoncteur ; la longueur est celle du retest, sinon l’hypothèse (${exN(+H.longueur)} m). ${admise}`) }; },

  toron: c => { const h = exHabillage(c), F = h.foisonnement || null, n = F && F.n != null ? F.n : h.faisceau && h.faisceau.n != null ? h.faisceau.n : null, deq = h.deq != null ? h.deq : h.faisceau ? h.faisceau.deq : null;
    const concret = exPositif(h.toron) && n ? `${exN(n)} câble${n > 1 ? 's' : ''} : ${exPositif(deq) && F && exPositif(F.facteur) ? `√(Σ Ø²) = ${exMm(deq)} × ${exN(F.facteur)} = ` : ''}${exMm(h.toron)}${F && F.methode === 'Excel' ? ' (comme l’Excel : + 10 %)' : ''}.` : '';
    return { titre: 'Le toron', texte: exDeuxTemps(concret, 'Le toron, c’est le paquet de câbles qui sort du connecteur. Son diamètre = un facteur × √(la somme des Ø² des câbles) : les Ø viennent de la base des câbles, le facteur de TE/Polamco selon leur nombre (1,415 pour deux… 1,15 dès sept : catalogue « Circular Backshells », vérifié) ; un câble à plusieurs brins compte une fois. L’hypothèse « comme l’Excel » prend + 10 % à la place.') }; },

  masse: c => { const n = c && c.cables != null && isFinite(+c.cables) ? +c.cables : null;
    return { titre: 'La masse', texte: exDeuxTemps(n != null ? `${exN(n)} câble${n > 1 ? 's' : ''} y ${n > 1 ? 'vont' : 'va'}.` : '', 'Une masse (un repère en G : 901G) n’est pas un équipement : c’est le retour du courant par la structure. L’outil y liste les câbles qui y vont et n’y pose ni connecteur ni contact ; la chute se compte du bus à la masse de l’équipement (AC 43.13-1B), l’aller seul — sauf si l’hypothèse « retour » dit « par un câble identique » : elle double.') }; }
};

/* L'EXPLICATION d'une valeur choisie : { titre, texte }, ou null pour une clé inconnue. */
function explication(cle, contexte) { const f = EXPLICATIONS[cle]; if (!f) return null;
  try { return f(contexte || null); } catch (_) { return f(null); } }
