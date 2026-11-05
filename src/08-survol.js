/* ===========================================================================
   08 — LE SURVOL D'UNE BORNE (v86, l'audit M4)
   Sur le plan, chaque borne porte son nom, lisible sans zoomer. Au survol, la bulle du plan (08-interface, `objetDeBulle`
   et `texteDeBulle` : une seule bulle, la même pour un câble, un bloc, une borne) en dit le reste : le nom, le même que sur
   la pièce (« 667VT2:51B », « 411VC3A:A », « VT2:51H ») ; une minuscule dite telle (« 51e · minuscule ») ; la lettre de la
   face quand le fichier numérote ses bornes (« contact A ») ; chaque câble par son type et l'autre bout (une prise : par
   quelle partie) ; le contact à sertir ; puis le geste qu'elle permet. Elle n'apparaît qu'au survol, ne grossit rien, ne
   décale rien (charte v86 : sur le plan, rien ne bouge) et ne va jamais à l'export : c'est une bulle de la page, pas un
   trait du dessin. Ce module trouve la borne par la géométrie du dessin — là où elle se prend à la souris (06,
   `bornesPrenables`), la lettre d'un contact de prise dans sa partie mobile, la pastille d'une barrette à poser ou d'un
   morceau de barrette — et compose ce que la bulle en dit.
   =========================================================================== */
'use strict';

/* LA BORNE SOUS UN POINT du dessin (x, y, en unités du dessin) : { nom, borne, zone } — ou null. */
function borneSous(x, y) { const D = app.dessin; if (!D) return null;
  // une barrette à poser (VT1…) : ses pastilles, sur sa ligne
  for (const b of D.barrettes || []) { if (!b.nomVT) continue;
    for (const p of bornesDePiquage(b)) { const r = R_PASTILLE(String(p.n)) + 1.5;
      if (Math.abs(x - b.x) <= r && Math.abs(y - p.y) <= PAST_H / 2 + 1.5) return { nom: b.nomVT, borne: String(p.n), zone: { x0: b.x - r, x1: b.x + r, y0: p.y - PAST_H / 2, y1: p.y + PAST_H / 2 } }; } }
  for (const c of D.comps) { if (estMasse(c.name) || estDrapeau(c)) continue;
    if (x < c.x - 6 || x > c.x + c.w + 6 || y < c.y - 10 || y > c.y + c.h + 10) continue;
    const zs = bornesPrenables(c).slice();
    // une prise : la lettre du contact, écrite dans la partie mobile, entre ses deux amenées
    if (c.kind === 'strip' && estCoupure(c.name)) { const mid = c.x + c.lw + (c.w - c.lw - c.rw) / 2, xm0 = mid - (PRISE.WE + PRISE.WM) / 2, xe1 = mid + (PRISE.WE + PRISE.WM) / 2;
      (c.rangs.S || []).forEach(p => zs.push({ y: p.y, etiq: p.etiq, x0: xm0, x1: xe1, y0: p.y - PRH / 2 + 1, y1: p.y + PRH / 2 - 1 })); }
    // un morceau de barrette collé à sa borne : sa pastille
    if (c.kind === 'tag' && estBarrette(c.name)) { const M = symboleDePastille(c); if (M) { const r = R_PASTILLE(String(M.etiq || '')) + 1.5;
      zs.push({ y: M.y, etiq: M.etiq, x0: M.xs - r, x1: M.xs + r, y0: M.y - PAST_H / 2 - 1, y1: M.y + PAST_H / 2 + 1 }); } }
    const z = zs.find(q => q.etiq != null && String(q.etiq) !== '' && x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1);
    if (z) return { nom: c.name, borne: String(z.etiq), zone: z }; }
  return null; }

/* CE QUE LA BULLE DIT d'une borne `t` (`borneSous`), en lignes de la bulle du plan (ses classes : pl-b-t, pl-b-l, pl-b-id).
   `w` : le point du dessin, pour dire le geste que la souris y ferait (`priseSous`). Les liaisons du folio : une barrette à
   poser n'existe que là. */
function texteDeBorneHtml(t, w) { const L = liaisonsDuPlan(), b = t.borne, nom = t.nom;
  const T = s => `<b class="pl-b-t">${esc(s)}</b>`, l_ = s => `<span class="pl-b-l">${s}</span>`, id = s => `<span class="pl-b-id">${esc(s)}</span>`;
  const ici = l => (l.de === nom && String(l.borneDe) === b) || (l.vers === nom && String(l.borneVers) === b), xs = L.filter(ici);
  const prise = estCoupure(nom), aPoser = VT_A_POSER.test(nom), sertir = [], ponts = []; let face = '', Q = null;
  if (aPoser) { try { Q = planDeBarrette(nom).plan; } catch (_) { Q = null; } }
  const cables = xs.filter(l => l.de !== l.vers).map(l => { const deCe = l.de === nom && String(l.borneDe) === b, cote = deCe ? 'de' : 'vers';
    const autre = deCe ? l.vers : l.de, bAutre = deCe ? l.borneVers : l.borneDe;
    // le contact à sertir à ce bout ; la lettre de la face quand elle n'est pas le nom de la borne (« 1 » d'une prise lettrée : A ;
    // « A12 » est le contact 12 de son connecteur, « 51B » dit déjà la sienne)
    let ct = null; try { ct = aPoser ? (Q && Q.fils.find(y => y.f.l === l && String(y.borne) === b)) || null : (sertirDuFil(l) || {})[cote] || null; } catch (_) { ct = null; }
    const ref = ct && ct.sertir && ct.sertir.reference ? ct.sertir.reference : '';
    if (ct && ct.contact && ct.contact.lettre && !face && String(ct.contact.lettre).toUpperCase() !== String(numeroDeBorne(b)).toUpperCase() && !/^\d+[A-Za-z]{1,2}$/.test(b)) face = String(ct.contact.lettre);
    const quoi = estRaccordAPoser(l) ? 'câble à créer' : id(l.type || 'câble');
    // une prise : le câble qui arrive est dans la partie mobile, celui qui repart dans la partie fixe (06, le dessin) — chacun son contact
    if (prise) return (deCe ? 'partie fixe · ' : 'partie mobile · ') + quoi + ' vers ' + id(bornePlusRepere(autre, bAutre)) + (ref ? ' · ' + id(ref) : '');
    if (ref && !sertir.includes(ref)) sertir.push(ref);
    return quoi + ' vers ' + id(bornePlusRepere(autre, bAutre)); });
  xs.filter(l => l.de === l.vers).forEach(l => ponts.push(String(l.borneDe) === b ? l.borneVers : l.borneDe));
  // une borne dédoublée par une barrette à poser : où vont ses câbles, par elle
  const vt = !aPoser && xs.length === 1 && estRaccordAPoser(xs[0]) ? xs[0].vers : '';
  const parVT = vt ? L.filter(l => l.aPoser === vt && l.de !== l.vers && !estRaccordAPoser(l)).map(l => { const v = l.de === vt; return id(l.type || 'câble') + ' vers ' + id(bornePlusRepere(v ? l.vers : l.de, v ? l.borneVers : l.borneDe)); }) : [];
  const raccord = aPoser ? L.find(l => l.vers === nom && estRaccordAPoser(l)) : null;
  /* COURTE (le titre, puis trois lignes au plus) : ce qu'elle a de particulier (une minuscule, la lettre de sa face, une
     barrette ajoutée par VOLTA), ses câbles (deux au plus, puis « et 3 autres » ; une prise : sa partie mobile, sa partie
     fixe), le contact à sertir, le geste — le geste cède sa place d'abord, puis le contact, puis le particulier */
  const nb = (n, mot) => n + ' ' + mot + (n > 1 ? 's' : '');
  const particulier = [/[a-z]/.test(b) ? 'minuscule (la face a aussi ' + esc(b.replace(/[a-z]+$/, s => s.toUpperCase())) + ')' : '', face ? 'contact ' + id(face) + ' de sa face' : '',
    raccord ? 'ajoutée par VOLTA sur ' + id(bornePlusRepere(raccord.de, raccord.borneDe)) : ''].filter(Boolean).join(' · ');
  const deux = cables.slice(0, prise ? 2 : 2), reste = cables.length - deux.length;
  const lesCables = prise ? deux : [deux.join(' · ') + (reste ? ' · et ' + nb(reste, 'autre') : '') + (ponts.length && cables.length < 2 ? (deux.length ? ' · ' : '') + 'ponté à ' + ponts.map(id).join(', ') : '')].filter(Boolean);
  if (prise && reste) lesCables[lesCables.length - 1] += ' · et ' + nb(reste, 'autre');
  if (parVT.length) lesCables.push('par ' + id(vt) + ' : ' + parVT.slice(0, 2).join(' · ') + (parVT.length > 2 ? ' · et ' + nb(parVT.length - 2, 'autre') : ''));
  const p = typeof priseSous === 'function' && w ? priseSous(w) : null;
  const geste = !p || p.genre === 'vt' ? '' : p.genre === 'borne' ? 'Glisser : la déplacer le long du bloc · Maj + glisser : tout son connecteur' : 'Clic : sa fiche · glisser : le déplacer';
  const lignes = [particulier, ...lesCables, sertir.length ? 'contact à sertir · ' + sertir.map(id).join(', ') : '', geste].filter(Boolean);
  for (const qui of [geste, sertir.length ? 'contact à sertir · ' + sertir.map(id).join(', ') : '', particulier]) { if (lignes.length <= 3) break; const k = lignes.indexOf(qui); if (qui && k >= 0) lignes.splice(k, 1); }
  return T(bornePlusRepere(nom, b)) + lignes.slice(0, 3).map(l_).join(''); }
