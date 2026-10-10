/* ===========================================================================
   08 octies — L'ACCUEIL, LE BANDEAU DE L'EXEMPLE, LES BULLES DU MENU
   Le premier lancement montre l'accueil (`#vide`), plus l'exemple : une
   feuille de folio posée sur la table noire, qui dit ce que l'outil attend,
   en peu de mots (le lecteur : « il y a tellement de choses, je n'ai pas
   envie de lire ») —
     1. VOTRE RETEST (indispensable) : une ligne par fil, les quatre colonnes
        obligatoires, un aperçu de trois lignes, la zone de dépôt, « Ouvrir mon
        retest… », le modèle ;
     2. VOS CONTRATS DÉJÀ FAITS, à côté, de même taille (le lecteur : « mon gros
        retest de tous les contrats, je ne sais pas où le mettre ») : un seul
        Excel, une ligne par liaison, Harness = la machine, FWD = le dessin,
        Appareil = le contrat ; sa zone de dépôt, son état ;
     3. BIBLE ET NORMES : embarquées, en une ligne.
   En bas, pour qui n'a pas de fichier : l'exemple, le collage. La page est
   écrite dans page.html ; ici, ce qui change : l'état de la base et de ce qui
   est embarqué, l'erreur du dernier dépôt (elle reste écrite dans l'étape),
   les comptes. `rendreAccueil()` est appelée par l'interface à chaque
   synchronisation (`synchroniserContexte`) : elle lie une fois, et ne relit
   l'état que si l'accueil est à l'écran.
   Quand l'exemple est ouvert, un BANDEAU discret collé sous la barre du haut
   le dit — « Vous regardez l'exemple · Ouvrir mon retest » — pour qu'on ne
   le prenne pas pour son contrat.
   Les BULLES du menu ⋮ sont écrites dans page.html (`data-aide`) ; ici, la
   typographie française qu'un attribut n'a pas d'office, la description pour
   un lecteur d'écran, et la bulle posée à gauche du menu (le clavier du menu
   et ses sous-menus : 08-interface, `lierMenu`).
   =========================================================================== */
'use strict';

const ACCUEIL = { lie: false, exemple: '' };
// « 201 liaisons, 6 folios » : l'exemple compté une fois
function compteExemple() { if (!ACCUEIL.exemple) { const E = contratExemple(); ACCUEIL.exemple = pluriel(E.length, 'liaison') + ', ' + pluriel(plansDe(E).length, 'folio'); } return ACCUEIL.exemple; }
function rendreAccueil() { lierAccueil();
  // le bandeau de l'exemple : seulement quand c'est lui qui est sur la table
  const exemple = app.contrat.liaisons.length > 0 && app.nom === NOM_EXEMPLE, b = $('bandeau-exemple');
  if (b && b.hidden === exemple) { b.hidden = !exemple; document.body.classList.toggle('exemple-vu', exemple); }
  const v = $('vide'); if (!v || v.hidden) return;
  const E = etatsDesFichiers(), poser = (id, niveau, html) => { const el = $(id); if (!el) return; el.className = 'vd-etat e-' + niveau; el.querySelector('span').innerHTML = html; };
  poser('vd-etat-base', E.base.niveau, esc(E.base.niveau === 'vide' ? 'aucune base pour l’instant' : E.base.dit));
  // la bible et les normes : embarquées (ou les vôtres), comptées
  const mod = TABLES_NORME.filter(tableModifiee).length, nb = pluriel((app.bible || []).length, 'référence'), nt = pluriel(TABLES_NORME.length, 'table');
  poser('vd-etat-embarque', E.bible.niveau === 'ko' || E.normes.niveau === 'ko' ? 'ko' : 'ok',
    app.bibleNom || mod ? esc(lies([app.bibleNom ? 'bible : ' + app.bibleNom + ' (' + nb + ')' : 'bible embarquée (' + nb + ')', mod ? pluriel(mod, 'table') + ' de normes modifiée' + (mod > 1 ? 's' : '') : 'normes embarquées (' + nt + ')']))
      : `embarquées : <span id="vd-n-bible">${nb}</span>, <span id="vd-n-tables">${nt}</span> — rien à faire pour commencer`);
  const ne = $('vd-ex-n'); if (ne) ne.textContent = '(' + compteExemple() + ')';
  // l'erreur du dernier dépôt reste écrite dans son étape (en une phrase), avec de quoi la lire en entier
  const dit = (id, entree, html) => { const el = $(id); if (!el) return; el.hidden = !html; if (html) el.innerHTML = `<p>${html}</p><button class="btn lien" data-voir="${entree}">Voir ce qu’il faut</button>`; };
  const er = FICHIERS.erreurs.retest, at = FICHIERS.attente, eb = FICHIERS.erreurs.base, court = e => esc(e.court || texteBrut(e.texte));
  dit('vd-erreur', 'retest', er ? court(er) : at ? esc(at.nom) + ' n’a pas les en-têtes du retest : j’ai deviné ses colonnes, rien n’est chargé avant « Charger ».' : '');
  const el = $('vd-erreur'); if (el) el.classList.toggle('att', !er && !!at);
  dit('vd-erreur-base', 'base', eb ? court(eb) : ''); }

function lierAccueil() { if (ACCUEIL.lie) return; ACCUEIL.lie = true;
  const o = (id, fn) => { const e = $(id); if (e) e.addEventListener('click', fn); }, choisir = () => $('fichier').click();
  // les deux zones de dépôt : un clic, ou Entrée au clavier, ouvre le choix de fichier (le dépôt lui-même est pris par
  // `lierDepot`, qui lit le data-depot de l'étape survolée)
  const zone = (id, fn) => { const z = $(id); if (!z) return; z.addEventListener('click', fn); z.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } }); };
  zone('vd-zone', choisir); zone('vd-zone-base', choisirBase);
  o('vd-modele', () => telechargerModele('retest')); o('vd-base', choisirBase); o('vd-base-aide', () => ficheFichiers('base'));
  o('vd-embarque', () => ficheFichiers('bible')); o('vd-fichiers', () => ficheFichiers()); o('be-ouvrir', choisir);
  const v = $('vide'); if (v) v.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-voir]'); if (b) ficheFichiers(b.dataset.voir); });
  lierEntreesFichiers(); lierBullesDuMenu(); }

/* Les bulles du menu : la typographie française (une espace insécable avant « : ; ? ! » — un attribut n'est pas du texte,
   `typographieVivante` ne le voit pas), et la même phrase pour un lecteur d'écran (`aria-describedby`). La bulle est UNE
   (`#menu-bulle`, posée sur la page, pas dans le menu) : le menu peut défiler quand il ne tient pas dans l'écran sans la
   rogner. Elle se pose à gauche du menu, à la hauteur de la ligne — dans un sous-menu comme dans le menu —, après 300 ms
   de survol (on traverse le menu sans qu'elle clignote ; d'une ligne à l'autre, elle suit aussitôt), tout de suite au
   clavier. */
function lierBullesDuMenu() { const m = $('menu'); if (!m) return; const boite = document.createElement('div'); boite.hidden = true; boite.id = 'menu-aides'; m.after(boite);
  m.querySelectorAll('button[data-aide]').forEach(b => { b.dataset.aide = typo(b.dataset.aide); const s = document.createElement('span'), id = 'aide-' + (b.dataset.act || b.dataset.sous);
    s.id = id; s.textContent = b.dataset.aide; boite.appendChild(s); b.setAttribute('aria-describedby', id); });
  const bulle = document.createElement('div'); bulle.id = 'menu-bulle'; bulle.className = 'menu-bulle'; bulle.setAttribute('aria-hidden', 'true'); document.body.appendChild(bulle);
  let tempo = 0;
  const cacher = () => { clearTimeout(tempo); bulle.classList.remove('on'); };
  const montrer = (b, vite) => { clearTimeout(tempo); tempo = setTimeout(() => { if (m.hidden || !b.isConnected || !b.offsetParent) return;
    bulle.textContent = b.dataset.aide; bulle.classList.add('on'); const r = b.getBoundingClientRect(), g = m.getBoundingClientRect(), h = bulle.offsetHeight;
    bulle.style.right = Math.round(innerWidth - g.left + 12) + 'px'; bulle.style.top = Math.round(Math.max(8, Math.min(r.top + r.height / 2 - 16, innerHeight - h - 8))) + 'px'; }, vite ? 0 : 300); };
  m.addEventListener('pointerover', e => { const b = e.target.closest && e.target.closest('button'); if (e.pointerType === 'touch') return;
    if (!b || !b.dataset.aide) { cacher(); return; } montrer(b, bulle.classList.contains('on')); });
  m.addEventListener('pointerleave', cacher); m.addEventListener('scroll', cacher, { passive: true });
  m.addEventListener('focusin', e => { const b = e.target.closest && e.target.closest('button[data-aide]'); if (b && b.matches(':focus-visible')) montrer(b, true); else if (!b) cacher(); });
  m.addEventListener('focusout', e => { if (!m.contains(e.relatedTarget)) cacher(); });
  new MutationObserver(() => { if (m.hidden) cacher(); }).observe(m, { attributes: true, attributeFilter: ['hidden'] }); }
