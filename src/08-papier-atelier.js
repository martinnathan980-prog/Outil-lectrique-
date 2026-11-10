/* ===========================================================================
   08 — LA FICHE D'ATELIER (v91) : une feuille à imprimer pour qui monte la pièce.

   Le lecteur : « La fiche atelier, c'est brillant. » Dans l'onglet Pièces d'un objet (équipement, barrette, prise), le
   bouton « Fiche d'atelier » imprime CE QUE LA FICHE MONTRE DÉJÀ — L'essentiel (le brochage dessiné, la face, ce qui
   reste à régler) puis Pièces (ce qu'il faut pour le monter, connecteur par connecteur) — sur une feuille A4, en clair
   quel que soit le thème, avec en tête le plan, son indice et la date. Rien n'est recalculé ni réécrit : la feuille dit
   exactement ce que dit l'écran (une seule source).
   =========================================================================== */
function preparerFicheAtelier() { const I = $('inspecteur'); if (!I || I.hidden) return null;
  const R = document.documentElement, theme = R.dataset.theme, c = app.contrat.cartouche || {};
  const tete = document.createElement('div'); tete.className = 'at-tete';
  tete.innerHTML = `<b>Fiche d’atelier</b><span>${esc(nomAffichePlan())}</span>${c.indice ? `<span>indice ${esc(c.indice)}</span>` : ''}<span>${esc(new Date().toLocaleDateString('fr-FR'))}</span><i>VOLTA</i>`;
  I.prepend(tete); const page = document.createElement('style'); page.textContent = '@page{size:A4 portrait;margin:12mm}'; document.head.appendChild(page);
  document.body.classList.add('atelier'); R.dataset.theme = 'light';
  return () => { document.body.classList.remove('atelier'); tete.remove(); page.remove(); if (theme) R.dataset.theme = theme; else delete R.dataset.theme; }; }
function imprimerFicheAtelier() { const fin = preparerFicheAtelier(); if (!fin) return;
  const apres = () => { window.removeEventListener('afterprint', apres); fin(); }; window.addEventListener('afterprint', apres); window.print(); }
document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-atelier]'); if (!b) return; e.stopPropagation(); imprimerFicheAtelier(); }, true);
