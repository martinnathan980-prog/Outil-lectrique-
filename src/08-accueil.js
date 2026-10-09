/* ===========================================================================
   08 octies — L'ACCUEIL, LE BANDEAU DE L'EXEMPLE, LES BULLES DU MENU
   Le premier lancement montre l'accueil (`#vide`), plus l'exemple : une
   feuille de folio qui dit ce que l'outil attend, dans l'ordre —
     1. VOTRE RETEST (indispensable) : une ligne par fil, les quatre colonnes
        obligatoires, un aperçu de trois lignes, la zone de dépôt, « Ouvrir mon
        retest… », « Télécharger un modèle (CSV) » ;
     2. VOS CONTRATS DÉJÀ FAITS (une fois) : ce que c'est, ce que ça fait
        ensuite, l'état, « Déposer la base… » (un fichier glissé sur cette
        étape y entre aussi) ;
     3. BIBLE ET NORMES : embarquées, on peut commencer sans.
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
   un lecteur d'écran, et les flèches du clavier dans le menu.
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
  const mod = TABLES_NORME.filter(tableModifiee).length;
  poser('vd-etat-embarque', E.bible.niveau === 'ko' || E.normes.niveau === 'ko' ? 'ko' : 'ok', esc(lies([app.bibleNom ? 'bible : ' + app.bibleNom : 'bible embarquée', mod ? pluriel(mod, 'table') + ' de normes modifiée' + (mod > 1 ? 's' : '') : 'normes embarquées'])));
  const nb = $('vd-n-bible'); if (nb) nb.textContent = pluriel((app.bible || []).length, 'référence');
  const nt = $('vd-n-tables'); if (nt) nt.textContent = pluriel(TABLES_NORME.length, 'table');
  const ne = $('vd-ex-n'); if (ne) ne.textContent = '(' + compteExemple() + ')';
  // l'erreur du dernier dépôt reste écrite dans son étape (en une phrase), avec de quoi la lire en entier
  const dit = (id, entree, html) => { const el = $(id); if (!el) return; el.hidden = !html; if (html) el.innerHTML = `<p>${html}</p><button class="btn lien" data-voir="${entree}">Voir ce qu’il faut</button>`; };
  const er = FICHIERS.erreurs.retest, at = FICHIERS.attente, eb = FICHIERS.erreurs.base, court = e => esc(e.court || texteBrut(e.texte));
  dit('vd-erreur', 'retest', er ? court(er) : at ? esc(at.nom) + ' n’a pas les en-têtes du retest : j’ai deviné ses colonnes, rien n’est chargé avant «\u00a0Charger\u00a0».' : '');
  const el = $('vd-erreur'); if (el) el.classList.toggle('att', !er && !!at);
  dit('vd-erreur-base', 'base', eb ? court(eb) : ''); }

function lierAccueil() { if (ACCUEIL.lie) return; ACCUEIL.lie = true;
  const o = (id, fn) => { const e = $(id); if (e) e.addEventListener('click', fn); }, choisir = () => $('fichier').click();
  // la zone de dépôt : un clic, ou Entrée au clavier, ouvre le choix de fichier (le dépôt lui-même est pris par `lierDepot`)
  const zone = $('vd-zone'); if (zone) { zone.addEventListener('click', choisir); zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choisir(); } }); }
  o('vd-modele', () => telechargerModele('retest')); o('vd-base', choisirBase); o('vd-base-aide', () => ficheFichiers('base'));
  o('vd-embarque', () => ficheFichiers('bible')); o('vd-fichiers', () => ficheFichiers()); o('be-ouvrir', choisir);
  const v = $('vide'); if (v) v.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-voir]'); if (b) ficheFichiers(b.dataset.voir); });
  lierEntreesFichiers(); lierBullesDuMenu(); }

/* Les bulles du menu : la typographie française (une espace insécable avant « : ; ? ! » — un attribut n'est pas du texte,
   `typographieVivante` ne le voit pas), et la même phrase pour un lecteur d'écran (`aria-describedby`). La bulle est UNE
   (`#menu-bulle`, posée sur la page, pas dans le menu) : le menu peut défiler quand il ne tient pas dans l'écran (un
   portable de 768 px, un téléphone) sans la rogner. Elle se pose à gauche du menu, à la hauteur de la ligne, après
   300 ms de survol (on traverse le menu sans qu'elle clignote ; d'une ligne à l'autre, elle suit aussitôt), tout de suite
   au clavier ; les flèches vont d'une ligne à l'autre. */
function lierBullesDuMenu() { const m = $('menu'); if (!m) return; const boite = document.createElement('div'); boite.hidden = true; boite.id = 'menu-aides'; m.after(boite);
  m.querySelectorAll('button[data-aide]').forEach(b => { b.dataset.aide = typo(b.dataset.aide); const s = document.createElement('span'), id = 'aide-' + b.dataset.act;
    s.id = id; s.textContent = b.dataset.aide; boite.appendChild(s); b.setAttribute('aria-describedby', id); });
  const bulle = document.createElement('div'); bulle.id = 'menu-bulle'; bulle.className = 'menu-bulle'; bulle.setAttribute('aria-hidden', 'true'); document.body.appendChild(bulle);
  let tempo = 0;
  const cacher = () => { clearTimeout(tempo); bulle.classList.remove('on'); };
  const montrer = (b, vite) => { clearTimeout(tempo); tempo = setTimeout(() => { if (m.hidden || !b.isConnected) return;
    bulle.textContent = b.dataset.aide; bulle.classList.add('on'); const r = b.getBoundingClientRect(), g = m.getBoundingClientRect(), h = bulle.offsetHeight;
    bulle.style.right = Math.round(innerWidth - g.left + 12) + 'px'; bulle.style.top = Math.round(Math.max(8, Math.min(r.top - 4, innerHeight - h - 8))) + 'px'; }, vite ? 0 : 300); };
  m.addEventListener('pointerover', e => { const b = e.target.closest && e.target.closest('button[data-aide]'); if (!b || e.pointerType === 'touch') return; montrer(b, bulle.classList.contains('on')); });
  m.addEventListener('pointerleave', cacher); m.addEventListener('scroll', cacher, { passive: true });
  m.addEventListener('focusin', e => { const b = e.target.closest && e.target.closest('button[data-aide]'); if (b && b.matches(':focus-visible')) montrer(b, true); });
  m.addEventListener('focusout', e => { if (!m.contains(e.relatedTarget)) cacher(); });
  new MutationObserver(() => { if (m.hidden) cacher(); }).observe(m, { attributes: true, attributeFilter: ['hidden'] });
  m.addEventListener('keydown', e => { const xs = [...m.querySelectorAll('button[role="menuitem"]')], i = xs.indexOf(document.activeElement); if (!xs.length) return;
    const aller = k => { e.preventDefault(); xs[(k + xs.length) % xs.length].focus(); };
    if (e.key === 'ArrowDown') aller(i + 1); else if (e.key === 'ArrowUp') aller(i < 0 ? xs.length - 1 : i - 1); else if (e.key === 'Home') aller(0); else if (e.key === 'End') aller(xs.length - 1); }); }
