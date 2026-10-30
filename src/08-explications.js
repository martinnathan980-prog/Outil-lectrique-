/* ===========================================================================
   08 sexies — LES EXPLICATIONS : le « ? » à côté de chaque valeur choisie
   ---------------------------------------------------------------------------
   Le lecteur : « Explique aussi, avec un petit point d'interrogation,
   comment tu choisis tout » — puis (version 61) : « tu mets une grosse
   pâte de texte, c'est illisible : écris moins, avec des couleurs, des
   variations, plus interactif, plus facile à l'œil ».
   `explication(cle, contexte)` rend donc, pour chaque valeur :
     · `phrase`   — UNE phrase : ce que l'outil a pris, ici, et pourquoi ;
     · `chiffres` — quelques valeurs en pastilles [nom, valeur, ton], le ton
                    disant l'état (ok, att, ko, ou rien) ;
     · `etapes`   — la règle en deux à quatre étapes courtes, qu'on déplie ;
     · `sources`  — d'où vient la donnée, en une ligne, qu'on déplie aussi ;
     · `titre`, et `texte` (le tout à plat : ce que lit un lecteur d'écran).
   Un seul endroit pour ces mots : la fiche les montre (08-sections), ce
   fichier ne touche pas à la page. Chaque étape dit ce que le moteur fait
   AUJOURD'HUI (09 : les modules, les contacts, la simulation ; 09 bis : les
   disjoncteurs ; 09 ter : les raccords ; 09 quater : la chute) — qui change
   une règle du moteur change son étape ici. Les valeurs par défaut se lisent
   dans les hypothèses (`HYPOTHESES`, `app.simu`), pas dans le texte.
   `contexte` (facultatif) dit la valeur concrète ; sans lui, la phrase
   générale. Ce qu'il peut porter, par clé :
     calibre      { calibre, origine ('main' | 'pn' | 'ideal'), meilleur (A), permanent, marge, temperature, garanti, famille }
                  — ou `verdict` (`disjonctionDe(…)`), ou `meilleur`, l'objet du moteur
     courbe       { famille, tableauMin, tableauMax }
     profil       { permanent, pointe: { i, t }, somme } (somme : la part du temps de déclenchement)
     module       { plan } — `remplirModules`
     arrangement  { plan } — `remplirContacts`
     prise        { plan } — le plan d'une prise (`coupureEnModule(…).plan`)
     contact      { reference, taille, sexe ('M' | 'F'), type, statut, accessoire } — ou `sertir` du moteur
     gauge        { type, jauge, taille, ok }
     raccord, bande, manchon, tyrap, cheminee, toron
                  { habillage } — l'objet du moteur (`habillage(…)`), ou ses champs à plat
     intensite    { type, admis, base, facteur } — ou `fil`, un fil jugé (`protectionDesFils(…)[i]`)
     chute        { dU, admis, regle } — ou `chemin`, une chute en ligne (`chutesDepuis(…)[i]`)
     masse        { cables }
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
// l'habillage d'un connecteur, qu'on le donne entier (`habillage`) ou à plat
const exHabillage = c => (c && c.habillage) || c || {};
// une explication : la phrase, les pastilles (sans celles qui n'ont pas de valeur), les étapes, les sources, et le tout à plat
const exE = (titre, phrase, chiffres, etapes, sources) => { const cs = (chiffres || []).filter(c => c && c[1] != null && c[1] !== '');
  return { titre, phrase, chiffres: cs, etapes, sources, texte: [phrase, ...etapes, sources].filter(Boolean).join(' ') }; };

/* ---- les explications, une par clé -------------------------------------------------------------------------------- */
const EXPLICATIONS = {
  calibre: c => { const H = exHypotheses(c), d = c && c.verdict && typeof c.verdict === 'object' ? c.verdict : null;
    const m = (c && c.meilleur && typeof c.meilleur === 'object' ? c.meilleur : null) || (d && d.meilleur) || null, mg = m && m.marge ? m.marge : {};
    const cal = c && exPositif(c.calibre) ? c.calibre : d && exPositif(d.calibre) ? d.calibre : m && exPositif(m.calibre) ? m.calibre : null;
    const best = c && exPositif(c.meilleur) ? c.meilleur : m && exPositif(m.calibre) ? m.calibre : null, origine = (c && c.origine) || (d && d.origine) || (c && c.main ? 'main' : '');
    const perm = c && exPositif(c.permanent) ? c.permanent : exPositif(mg.permanent) ? mg.permanent : null, garanti = c && exPositif(c.garanti) ? c.garanti : exPositif(mg.garanti) ? mg.garanti : null;
    const marge = c && c.marge != null && isFinite(+c.marge) ? +c.marge : mg.courant != null ? mg.courant : +H.marge, T = c && c.temperature != null && isFinite(+c.temperature) ? +c.temperature : isFinite(mg.temperature) ? mg.temperature : +H.tableauMax;
    // la gamme ESSAYÉE (v73, l'ingénieur : « il cite 25 A dans la gamme MS3320 ») : celle de la famille du part number, filtrée
    // par vos calibres préférés — le cadran la montre ; le catalogue entier de la famille, quand il en a plus
    const F = d && d.famille && typeof d.famille === 'object' ? d.famille : null, essayes = d && Array.isArray(d.catalogue) && d.catalogue.length ? d.catalogue : null;
    const tout = F && typeof catalogueDeLaFamille === 'function' ? catalogueDeLaFamille(F) : null;
    const gamme = essayes ? essayes.map(exN).join(' · ') + ' A' : exGamme(H), filtre = essayes && tout && tout.length > essayes.length ? ` (${essayes.length} sur ${tout.length} : vos préférés)` : '';
    const essaie = essayes ? `Essaie la gamme${F && F.famille ? ' ' + F.famille : ''}, du plus petit au plus grand : ${gamme}${filtre}` : `Essaie chaque calibre de votre gamme${gamme ? ' (' + gamme + ')' : ''}, du plus petit au plus grand`;
    const fam = (c && typeof c.famille === 'string' ? c.famille : '') || (m && m.famille) || '', autre = best && cal && Math.abs(best - cal) > 1e-9;
    const phrase = !cal ? `Le plus petit calibre de votre gamme qui passe votre profil, avec ${exN(marge)} % de marge.`
      : origine === 'main' ? `${exA(cal)}, choisi à la main${autre ? ` — « Automatique » prend ${exA(best)}` : ''}.`
      : autre ? `Le meilleur est ${exA(best)} : le plus petit de votre gamme${fam ? ' ' + fam : ''} qui passe ; le ${exA(cal)} ${cal < best ? 'ne passe pas' : 'est plus gros que nécessaire'}.`
      : best ? `${exA(cal)} : le plus petit de votre gamme${fam ? ' ' + fam : ''} qui passe votre profil.` : origine === 'pn' ? `${exA(cal)} : lu dans la référence du disjoncteur.` : `${exA(cal)}.`;
    return exE('Le calibre', phrase, [['Permanent', perm ? exA(perm) : null, ''], ['Marge', exN(marge) + ' %', ''], ['Juge à', exN(T) + ' °C', ''], ['Garanti', garanti ? exA(garanti) : null, 'ok']],
      [essaie, `Garde le premier qui ne déclenche pas à ${exN(+H.tableauMax)} °C, avec ${exN(+H.marge)} % de marge : il passe ; sans la marge, il est juste`, 'Un câble trop fin, il le grossit — il ne monte jamais le calibre pour lui', 'Il reste à 2:1 de ses voisins'],
      'Les courbes de votre Excel (un E-T-A 483 / 4120) et des constructeurs, la garantie MS3320N, la méthode NASA TM-102179, la FAA AC 43.13-1B.'); },

  courbe: c => { const H = exHypotheses(c), tmin = c && c.tableauMin != null ? +c.tableauMin : +H.tableauMin, tmax = c && c.tableauMax != null ? +c.tableauMax : +H.tableauMax;
    const f = c && c.famille, fam = typeof f === 'string' ? f : f && typeof f === 'object' ? String(f.courbe || f.famille || '') : '';
    return exE('La courbe de déclenchement', 'Pour chaque multiple du calibre (In), le temps avant que le disjoncteur s’ouvre.', [['Courbes', fam || null, ''], ['Juge', exN(tmax) + ' °C', 'ko'], ['Câble', String(exN(tmin)).replace('-', '−') + ' °C', '']],
      ['À gauche des courbes, il ne déclenche pas (vert) ; à droite, il déclenche (rouge)', 'Entre les deux, ça dépend de la température', `La plus rapide (${exN(tmax)} °C) juge votre profil`, `La plus lente (${String(exN(tmin)).replace('-', '−')} °C) dit ce qui passe dans le câble`],
      'Les quatre courbes de votre Excel « Calibre disjoncteur » (E-T-A 483 / 4120), lissées pour le dessin ; le jugement se fait sur les points lus.'); },

  profil: c => { const H = exHypotheses(c), perm = c && exPositif(c.permanent) ? c.permanent : null, p = c && c.pointe && exPositif(c.pointe.i) ? c.pointe : null, so = c && c.somme != null && isFinite(c.somme) ? c.somme : null;
    const phrase = perm || p ? `Votre profil : ${[perm ? exA(perm) + ' permanents' : '', p ? 'une pointe de ' + exA(p.i) + (exPositif(p.t) && isFinite(p.t) ? ' pendant ' + exS(p.t) : '') : ''].filter(Boolean).join(' et ')}.` : 'Ce que tire l’équipement protégé, état par état.';
    return exE('Le profil de charge', phrase, [['Permanent', perm ? exA(perm) : null, ''], ['Pointe', p ? exA(p.i) + (exPositif(p.t) && isFinite(p.t) ? ' · ' + exS(p.t) : '') : null, ''], ['Temps consommé', so != null ? exPct(so) : null, so == null ? '' : so > 1 ? 'ko' : so > +H.margeTemps / 100 ? 'att' : 'ok']],
      ['Chaque état : un courant (A) pendant une durée (s) — le permanent dure toujours', 'Chaque état devient un point de la courbe : glissez-le pour l’ajuster', `Leurs parts du temps de déclenchement s’additionnent : ${exN(+H.margeTemps)} % au plus`, 'L’installation ne le porte pas : vous l’écrivez, Volta n’invente rien'],
      `La méthode NASA TM-102179 ; un état après le permanent trouve le disjoncteur chaud (son temps ÷ ${exN(+H.prechauffage)}, feuille MS3320N).`); },

  module: c => { const P = c && c.plan ? c.plan : null, libres = P && P.contacts != null && P.utilises != null ? P.contacts - P.utilises : null;
    const phrase = P && P.reference ? `${P.reference} : ${P.main ? 'retenu à la main' : 'le plus petit module qui loge tous vos câbles'}.` : 'Le plus petit module de jonction qui loge tous les câbles de la barrette.';
    return exE('Le module de barrette', phrase, [['Contacts pris', P && P.utilises != null ? exN(P.utilises) : null, ''], ['Libres', libres != null ? exN(libres) : null, 'ok'], ['Modules', P && P.modules && P.modules.length > 1 ? exN(P.modules.length) : null, 'att']],
      ['Les bornes reliées prennent des contacts reliés du module', 'Chaque câble prend un contact dont la taille admet sa gauge', 'Entre ceux qui logent tout : le moins de contacts perdus, puis le plus léger', 'Un clic sur le module montre tous les assemblages de la norme'],
      'ASNE 0599 et NSA937901 (les faces et les groupes) ; les gauges par taille : catalogue Air LB (recherche R1).'); },

  arrangement: c => { const P = c && c.plan ? c.plan : null, F = (c && c.fautifs) || [], aucun = !!P && !P.reference;
    // aucun arrangement ne loge : la borne fautive et ce qui cloche, plus de « Contacts 0 · Pris 0 » (l'audit v72)
    const phrase = P && P.reference ? `${P.reference} : ${P.main ? 'retenu à la main' : P.nomme ? 'celui que la référence nomme' : 'le plus petit de la norme qui loge vos bornes et leurs gauges'}.`
      : aucun && F.length ? `Aucun arrangement ${c.famille ? 'de l’' + c.famille + ' ' : ''}ne loge ${F[0].borne} : ${F[0].l && F[0].l.cable ? F[0].l.cable : 'son câble'}${F[0].f && F[0].f.type ? ' (' + F[0].f.type + ')' : ''}, ${F[0].mot}${F[0].module && /^trop|^refus/.test(F[0].mot) ? ' pour le plus proche, le ' + F[0].module.variante : ''}.`
      : aucun ? 'Aucun arrangement de la norme ne loge ces bornes avec ces gauges.' : 'L’insert : la place et la taille de chaque contact du connecteur.';
    return exE('L’arrangement', phrase, aucun ? [['Borne', F[0] ? F[0].borne : null, 'ko'], ['Gauge', F[0] && F[0].f && F[0].f.type ? String(jaugeDuType(F[0].f.type)) + ' AWG' : null, 'ko'], ['Proposé', F[0] && F[0].propose ? F[0].propose.type : null, 'ok']]
      : [['Contacts', P && P.contacts != null ? exN(P.contacts) : null, ''], ['Pris', P && P.utilises != null ? exN(P.utilises) : null, '']],
      ['La référence nomme l’arrangement : Volta le prend', 'Sinon, chaque borne cherche le contact de même rang, d’une taille qui admet sa gauge', 'Entre ceux qui logent tout : le moins d’accommodements, puis le moins de contacts'],
      'Les faces des normes EN 2997-002, EN 3645-002, EN 3646, EN 4165-002, ASNE 0059.'); },

  prise: c => { const P = c && c.plan ? c.plan : null;
    const phrase = P && P.reference ? `${P.reference}${P.main ? ', retenue à la main' : ''} : ${exN(P.utilises)} contact${P.utilises > 1 ? 's' : ''} pris sur ${exN(P.contacts)}.` : 'Deux moitiés : la fiche (mobile) et l’embase (fixe).';
    return exE('La prise de coupure', phrase, [['Pris', P && P.utilises != null ? exN(P.utilises) : null, ''], ['Libres', P && P.contacts != null && P.utilises != null ? exN(P.contacts - P.utilises) : null, 'ok']],
      ['La fiche reçoit ce qui arrive, l’embase ce qui repart', 'Un câble par contact, de chaque côté', 'L’arrangement se choisit comme pour un connecteur', 'Fiche femelle par défaut : le bouton l’inverse'],
      'Les normes EN 4165, EN 2997, EN 3646 ; votre codification (A/B, P/S) pour le sexe.'); },

  contact: c => { const s = c && c.sertir ? c.sertir : c || {}, ref = s.reference || '', sexe = (c && c.sexe) || s.sexe || '', taille = (c && c.taille) || '', type = (c && c.type) || '', statut = (c && c.statut) || s.statut || '';
    const mot = sexe === 'F' ? 'la douille (femelle)' : sexe === 'M' ? 'la broche (mâle)' : 'le contact';
    const phrase = ref ? `${ref} : ${mot}${taille ? ' taille ' + taille : ''}${type ? ' pour un ' + type : ''}.` : 'Le contact à sertir au bout de chaque câble.';
    return exE('Le contact à sertir', phrase, [['Sexe', sexe === 'F' ? 'femelle' : sexe === 'M' ? 'mâle' : null, ''], ['Taille', taille || null, ''], ['Avec', s.accessoire || null, ''], ['Statut', /confirm/i.test(statut) ? 'à confirmer' : null, 'att']],
      ['La table Contacts : la norme, la taille, le sexe, le type et la gauge du câble', 'La ligne la plus précise gagne', 'Le sexe se lit dans la référence (A mâle, B femelle ; P, S pour l’E0053)', 'Un câble plus fin que le joint arrière prend un manchon E0718'],
      'Vos tables SEE, relues par la recherche R1 ; 59 références non publiques restent « à confirmer ».'); },

  gauge: c => { const j = c && c.jauge != null ? c.jauge : c && c.type ? jaugeDuType(c.type) : null, taille = c && c.taille ? c.taille : '';
    const phrase = j != null ? `${c.type ? c.type + ' : ' : ''}gauge ${exN(j)}${taille ? `, ${c.ok === false ? 'refusée' : 'admise'} par un contact taille ${taille}` : ''}.` : 'La gauge (AWG) du câble, contre la taille du contact.';
    return exE('La gauge acceptée', phrase, [['Gauge', j != null ? exN(j) + ' AWG' : null, ''], ['Contact', taille ? 'taille ' + taille : null, ''], ['Verdict', c && c.ok === false ? 'refusée' : c && c.ok ? 'admise' : null, c && c.ok === false ? 'ko' : 'ok']],
      ['La gauge se lit en queue du type : DR20 → 20', 'Admise quand la table Contacts a une ligne pour cette taille et ce câble', 'Le diamètre doit aussi entrer dans le joint arrière'],
      'La table Contacts (SEE) ; les plages des contacts EN 3155 ; Souriau, Amphenol, TE (recherche R1).'); },

  raccord: c => { const h = exHabillage(c), types = { durci: 'un raccord blindé (durci)', 'pour manchon': 'un raccord pour manchon', 'serre-câble': 'un raccord à serre-câble', tyrap: 'un raccord à collier (tyrap)' };
    const e = h.entree, mt = h.classe && h.classe.matiere;
    const phrase = h.sansRaccord ? 'Aucun raccord : ' + (h.pourquoi || 'cette famille s’utilise sans raccord') + '.'
      : h.cheminee ? 'Une cheminée, pas un raccord : c’est le « raccord » d’un EN 4165.'
      : h.designation ? `${h.designation} : ${types[h.raccord] || 'le raccord'}${h.atelier ? ', de votre table CHOIX' : ''}.`
      : types[h.raccord] ? `${majusculeEx(types[h.raccord])}.` : 'Ce qui tient le toron à l’arrière du connecteur.';
    return exE('Le raccord', phrase, [['Toron', exPositif(h.toron) ? exMm(h.toron) : null, ''], ['Code d’entrée', e && e.code && h.designation ? e.code + (e.dmin != null && e.dmax != null ? ' (' + nombreFr(e.dmin) + '–' + nombreFr(e.dmax) + ' mm)' : '') : null, ''], ['Matière', mt && mt.matiere ? mt.matiere : null, mt && mt.repli ? 'att' : ''], ['Manque', h.manquants && h.manquants[0] ? h.manquants[0] : null, 'ko']],
      ['Tresse reprise sur le corps ou surblindage : raccord durci + band-it', 'Étanche : raccord pour manchon (droit) ou durci (coudé) + manchon', 'Sinon : raccord à collier (tyrap) ; dans une boîte : un raccord simple', 'La pièce vient de votre table CHOIX ; le code d’entrée, du Ø du toron'],
      'Votre tutoriel et votre guide des raccords ; EN 3660-062 à -065:2022 ; votre table de compatibilité des matériaux.'); },

  bande: c => { const h = exHabillage(c), B = h.collier || null;
    const phrase = B && B.reference ? (/^E0805/.test(B.reference) ? `${B.reference} : votre toron${exPositif(h.toron) ? ' de ' + exMm(h.toron) : ''} est ${/-01$/.test(B.reference) ? 'sous' : 'au-dessus de'} 15 mm.` : `${B.reference} : elle serre ${exPositif(h.serre) ? 'la plateforme de ' + exMm(h.serre) : 'votre toron'}.`)
      : h.raccord && !h.bandit ? 'Pas de band-it ici : ni tresse reprise sur le corps, ni surblindage.' : 'Le band-it serre la tresse de blindage sur le raccord.';
    return exE('Le band-it', phrase, [['Toron', exPositif(h.toron) ? exMm(h.toron) : null, ''], ['Équivalent', B && B.equivalent && B.equivalent.reference ? B.equivalent.reference : null, '']],
      ['Seulement si la tresse est reprise sur le corps, ou en surblindage', 'Toron de moins de 15 mm : E0805-01 ; au-delà : E0805-02', 'La bande normalisée EN3660-033 est donnée en équivalent'],
      'Votre guide des raccords ; EN 3660-033 (outil EN 3660-038).'); },

  manchon: c => { const h = exHabillage(c), M = h.manchonRef || null;
    const phrase = M && M.designation ? `${M.designation}, ${M.precolle ? 'précollé' : 'à coller'}${h.formeManchon === 'coudé' ? ', coudé' : ''} : il passe l’épaulement et serre derrière la lèvre.` : 'Le manchon thermorétractable coiffe l’arrière du raccord et le câble qui en sort.';
    return exE('Le manchon', phrase, [['Épaulement', exPositif(h.cote) ? exMm(h.cote) : null, ''], ['Sortie', exPositif(h.sortie) ? exMm(h.sortie) : null, '']],
      ['Gros bout : plus grand que l’épaulement, avant rétreint', 'Rétreint, il serre derrière la lèvre : D(AP) < D(C) − 2 × D(D)', 'Petit bout : il serre le toron, ou la gaine', 'Votre gamme T18 d’abord, droit d’abord, précollé d’abord'],
      'La table VG 95343 (guide HellermannTyton 2024) ; votre guide des raccords.'); },

  tyrap: c => { const h = exHabillage(c), T = h.tyrap || null;
    const phrase = T && T.reference ? `${T.reference} : le plus serré qui passe ${exPositif(h.toron) ? 'votre toron de ' + exMm(h.toron) : 'votre toron'}.` : 'Le tyrap tient le toron sur le bras du raccord.';
    return exE('Le tyrap', phrase, [['Toron', exPositif(h.toron) ? exMm(h.toron) : null, ''], ['Jusqu’à', T && T.dmax != null ? exMm(T.dmax) : null, ''], ['Cotes', T && /confirm/i.test(T.confiance || T.statut || '') ? 'à confirmer' : null, 'att']],
      ['Sur le bras d’un raccord à collier, ou sur une cheminée EN 4165', 'Le NSA935401 dont le Ø max passe le toron au plus juste, puis le plus court'],
      'La table Colliers ; seuls le -06 et le -13 sont vérifiés, les autres cotes restent à confirmer.'); },

  cheminee: c => { const h = exHabillage(c), n = c && exPositif(c.modules) ? c.modules : null;
    return exE('La cheminée', `${n ? exN(n) + ' cheminée' + (n > 1 ? 's' : '') + ' EN 4165-015' : 'Une cheminée EN 4165-015'} : une par module câblé.`, [['Toron', exPositif(h.toron) ? exMm(h.toron) : null, ''], ['Passage', exPositif(h.toron) ? 'à confirmer' : null, 'att']],
      ['Un EN 4165 n’a pas de raccord EN 3660 : une cheminée par module', 'Le toron y est tenu par un tyrap, ou par un manchon s’il faut l’étanchéité', 'Son Ø intérieur n’est pas public : le passage du toron reste à confirmer'],
      'EN 4165-015, -016 (double ovale), -017 (obturateur) — recherche R3.'); },

  intensite: c => { const H = exHypotheses(c), f = c && c.fil && typeof c.fil === 'object' ? c.fil : null;
    const type = (c && c.type) || (f && f.type) || '', admis = c && exPositif(c.admis) ? c.admis : f && exPositif(f.continu) ? f.continu : null, base = c && exPositif(c.base) ? c.base : f && f.fil && exPositif(f.fil.intensite) ? f.fil.intensite : null;
    const fac = c && exPositif(c.facteur) ? c.facteur : f && exPositif(f.facteur) ? f.facteur : null;
    const phrase = admis ? `${type ? type + ' : ' : ''}${exA(Math.round(admis * 10) / 10)} admis en continu.` : 'Ce que le câble admet, en continu et pour quelques secondes.';
    return exE('L’intensité admise', phrase, [['EN 2853', base ? exA(base) : null, ''], ['Facteur', fac ? '× ' + exN(Math.round(fac * 100) / 100) : null, fac && fac < 1 ? 'att' : ''], ['Faisceau', `${exN(+H.fils)} câbles à ${exN(+H.charge)} %`, ''], ['Ambiante', exN(+H.ambiante) + ' °C', '']],
      ['L’EN 2853 : un câble seul à l’air libre — en continu, 2 s, 10 s, 1 min', 'Réduit pour le faisceau, l’altitude, l’ambiante (et l’aluminium : −20 %)', 'Chaque état du profil se compare au palier de sa durée'],
      'EN 2853 ; FAA AC 43.13-1B, figures 11-5 et 11-6.'); },

  chute: c => { const H = exHypotheses(c), x = c && c.chemin && typeof c.chemin === 'object' ? c.chemin : c || {}, mono = exPositif(+H.chuteMono) ? +H.chuteMono : null, tri = exPositif(+H.chuteTri) ? +H.chuteTri : null;
    const ok = x.dU != null && isFinite(x.dU), trop = ok && exPositif(x.admis) && x.dU > x.admis;
    const phrase = ok ? `${exV(Math.round(x.dU * 100) / 100)}${exPositif(x.admis) ? ` pour ${exV(x.admis)} admis` : ''}${x.reel === false ? ', sur des longueurs supposées' : ''}.` : 'La tension perdue du disjoncteur jusqu’à l’équipement.';
    const regle = mono || tri ? `${mono ? exV(mono) : 'la table Réseau'} au plus en continu et en monophasé, ${tri ? exV(tri) : 'la table Réseau'} en triphasé (votre règle)` : 'Sous la table Réseau (AC 43.13-1B : 1 V sous 28 V, le double en intermittent)';
    return exE('La chute de tension', phrase, [['Chute', ok ? exV(Math.round(x.dU * 100) / 100) : null, trop ? 'ko' : ok ? 'ok' : ''], ['Admis', exPositif(x.admis) ? exV(x.admis) : null, ''], ['Longueurs', x.reel === false ? 'supposées' : null, 'att']],
      ['Chaque câble : sa résistance × sa longueur × le courant', 'Chaque prise traversée : une paire de contacts ; chaque barrette : deux', 'Plus la chute du disjoncteur (votre table « Du max »)', regle],
      `Votre règle et votre table des contacts par gauge ; la longueur de l’installation, sinon ${exN(+H.longueur)} m supposés ; la génération est négligée (28 V en sortie des panneaux).`); },

  toron: c => { const h = exHabillage(c), F = h.foisonnement || null, n = F && F.n != null ? F.n : h.faisceau && h.faisceau.n != null ? h.faisceau.n : null, deq = h.deq != null ? h.deq : h.faisceau ? h.faisceau.deq : null;
    const phrase = exPositif(h.toron) && n ? `${exN(n)} câble${n > 1 ? 's' : ''} : un toron de ${exMm(h.toron)}${F && F.methode === 'Excel' ? ' (+ 10 %, comme votre tutoriel)' : F && F.methode === 'Guide' ? ' (+ 20 %, comme votre guide)' : ''}.` : 'Le paquet de câbles qui sort du connecteur.';
    return exE('Le toron', phrase, [['Câbles', n ? exN(n) : null, ''], ['√Σ Ø²', exPositif(deq) ? exMm(deq) : null, ''], ['Facteur', F && exPositif(F.facteur) ? '× ' + exN(F.facteur) : null, '']],
      ['Le Ø de chaque câble vient de la base des câbles', 'Ø du toron = un facteur × √(somme des Ø²)', 'Le facteur TE : 1,415 pour deux câbles… 1,15 dès sept', 'Les hypothèses : + 10 % (votre tutoriel) ou + 20 % (votre guide)'],
      'Le catalogue TE/Polamco « Circular Backshells » (vérifié).'); },

  masse: c => { const n = c && c.cables != null && isFinite(+c.cables) ? +c.cables : null;
    return exE('La masse', n != null ? `${exN(n)} câble${n > 1 ? 's' : ''} y ${n > 1 ? 'vont' : 'va'}.` : 'Le retour du courant par la structure.', [['Câbles', n != null ? exN(n) : null, '']],
      ['Une masse (901G) : le retour du courant par la structure', 'Ni connecteur ni contact', 'La chute se compte du bus à la masse : l’aller seul'],
      'FAA AC 43.13-1B ; l’hypothèse « retour » le change.'); }
};
const majusculeEx = t => t ? t[0].toUpperCase() + t.slice(1) : t;

/* L'EXPLICATION d'une valeur choisie : { titre, phrase, chiffres, etapes, sources, texte }, ou null pour une clé inconnue. */
function explication(cle, contexte) { const f = EXPLICATIONS[cle]; if (!f) return null;
  try { return f(contexte || null); } catch (_) { return f(null); } }
