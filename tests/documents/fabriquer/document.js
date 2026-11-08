/* ===========================================================================
   UN DOCUMENT DE SCHÉMAS — des folios, des renvois qui se répondent, la vérité
   ---------------------------------------------------------------------------
   Un document se décrit par son cartouche (n° de plan, indice, faisceau), son
   CATALOGUE (chaque repère : sa nature, sa désignation, sa référence), ses
   folios (les équipements de chacun, en colonnes) et ses FILS :
       [de, vers, type, folio, folioVers, signal]
   — un fil dont les deux bouts sont sur deux folios se dessine en deux moitiés,
   chacune finie par un RENVOI qui nomme le folio et la zone de l'autre (le texte
   d'un renvoi s'écrit à la façon du logiciel : `texteRenvoi`). La vérité recoud
   les deux moitiés : une seule liaison, au format du retest.
   =========================================================================== */
'use strict';
const { composer } = require('./schema');

const boutDe = s => { if (s.startsWith('masse:')) return { masse: s.slice(6) }; const i = s.indexOf(':'); return { pin: [s.slice(0, i), s.slice(i + 1)] }; };

/* Le bout tel que le retest l'écrit : une barrette « 667VT2 51 » + « B », une masse sans borne */
function deviceDe(cat, rep, borne) { const e = cat[rep] || {};
  if (e.genre === 'barrette') { const m = /^(\d+)([A-Za-z]+)$/.exec(borne); const M = (e.modules || []).find(x => x.num === (m && m[1])) || {}; return { device: rep + ' ' + (m ? m[1] : ''), pin: m ? m[2] : borne, pn: M.pn || e.pn || '', desc: 'BARRETTE MODULE ' + (m ? m[1] : '') }; }
  if (/G$/.test(rep) && !cat[rep]) return { device: rep, pin: '', pn: '', desc: 'MASSE' };
  return { device: rep, pin: borne, pn: e.pn || '', desc: e.desig || (e.genre === 'disjoncteur' ? 'DISJONCTEUR ' + (e.calibre || '') : '') }; }

/* Les étiquettes « Dessin » d'un bout : sa nature, ce qui le rend particulier */
function etiquettesDe(cat, rep, borne) { const e = cat[rep]; if (!e) return /G$/.test(rep) ? ['masse'] : [];
  const t = { disjoncteur: 'disjoncteur', relais: 'relais', barrette: 'barrette', prise: 'prise de coupure', lampe: 'voyant', inter: 'interrupteur', diode: 'diode' }[e.genre];
  return [...(t ? [t] : []), ...(e.connecteurs ? ['connecteur lettré'] : [])]; }

/* Les folios prêts à composer : leurs fils, chaque fil croisé coupé en deux moitiés finies par un renvoi */
function preparer(D) {
  const folios = D.folios.map(f => ({ ...f, fils: [] })), parN = new Map(folios.map(f => [String(f.n), f]));
  const croises = [];
  D.fils.forEach((x, k) => { const [de, vers, type, fa, fb, signal] = x, id = x.id || (D.prefixe || 'w') + (k + 1), f = parN.get(String(fa));
    if (!f) throw new Error('folio inconnu ' + fa + ' pour ' + de);
    if (fb == null || String(fb) === String(fa)) { f.fils.push({ id, a: boutDe(de), b: boutDe(vers), type }); return; }
    const cle = id, g = parN.get(String(fb)); if (!g) throw new Error('folio inconnu ' + fb + ' pour ' + vers);
    croises.push({ id, de, vers, type, fa, fb, cle, signal });
    f.fils.push({ id: id + 'a', a: boutDe(de), b: { renvoi: { cle, folio: g.folioCartouche != null && g.numero === f.numero ? g.folioCartouche : fb, signal, n: fb } }, type });
    g.fils.push({ id: id + 'b', a: boutDe(vers), b: { renvoi: { cle, folio: f.folioCartouche != null && g.numero === f.numero ? f.folioCartouche : fa, signal, n: fa } }, type }); });
  return { folios, croises }; }
// composer un folio (le cartouche : celui du document, le folio, son titre)
function composerFolio(D, f) { const cat = D.catalogue;
  try { return composer({ style: f.style || D.style, notes: f.notes, fils: f.fils, n: f.n, ecartMax: f.ecartMax,
      cart: { titre: f.titre ? (f.titreCourt || D.titreCourt || D.titre) + ' — ' + f.titre : D.titre, numero: f.numero || D.numero, folio: f.folioCartouche || f.n, folios: f.folios || D.folios.length, indice: f.indice || D.indice, faisceau: f.faisceau || D.faisceau, auteur: D.auteur, date: D.date },
      equipements: f.eqs.map(([rep, col, extra]) => { if (!cat[rep]) throw new Error('repère absent du catalogue : ' + rep); return { rep, col, ...cat[rep], ...(extra || {}) }; }) }); }
  catch (e) { e.message = (f.numero || D.numero || '') + ' : ' + e.message; e.folio = f; throw e; } }

function construireDocument(D) {
  const cat = D.catalogue, { folios, croises } = preparer(D);
  const composes = folios.map(f => composerFolio(D, f));
  // les renvois : chaque moitié nomme le folio et la zone de l'autre
  const moities = new Map(); composes.forEach((c, i) => c.renvois.forEach(r => { (moities.get(r.cle) || moities.set(r.cle, []).get(r.cle)).push({ r, i }); }));
  const svgs = composes.map((c, i) => c.rendre(r => { const autre = moities.get(r.cle).find(o => o.i !== i); return D.texteRenvoi({ folio: folios[autre.i].folioCartouche || folios[autre.i].n, zone: autre.r.zone, numero: folios[autre.i].numero || D.numero, page: folios[autre.i].page, ici: folios[i] }); }));
  // la vérité, au format du retest
  const fwdDe = f => (f.numero || D.numero) + ' F' + (f.folioCartouche || f.n);
  const ligne = (a, b, type, f, dessin) => { const A = deviceDe(cat, a.rep, a.borne), B = deviceDe(cat, b.rep, b.borne);
    return { harness: D.faisceau, de: A.device, borneDe: A.pin, pnDe: A.pn, descDe: A.desc, vers: B.device, borneVers: B.pin, pnVers: B.pn, descVers: B.desc, type, fwd: fwdDe(f),
      dessin: [...new Set([...etiquettesDe(cat, a.rep, a.borne), ...etiquettesDe(cat, b.rep, b.borne), ...(/^ML/.test(type || '') ? ['blindé'] : []), ...dessin])],
      page: f.page, style: f.style || D.style }; };
  const verite = [], parCle = new Map();
  composes.forEach((c, i) => { const f = folios[i], T = new Map(c.scene.traits.filter(t => t.id).map(t => [t.id, t]));
    c.verite.forEach(v => { const t = v.w ? T.get(v.w.id) : null, plus = [...(v.dessin || []), ...(t && (t.tA || t.tB) ? ['jonction'] : []), 'style ' + (f.style || D.style)];
      if (v.a && v.b) { verite.push(ligne(v.a, v.b, v.type, f, plus)); return; }
      const cle = v.w.b.renvoi ? v.w.b.renvoi.cle : v.w.a.renvoi.cle; (parCle.get(cle) || parCle.set(cle, []).get(cle)).push({ bout: v.a || v.b, f, plus }); }); });
  croises.forEach(x => { const m = parCle.get(x.cle) || []; const A = m.find(o => String(o.f.n) === String(x.fa)), B = m.find(o => String(o.f.n) === String(x.fb));
    if (!A || !B) throw new Error('renvoi orphelin ' + x.cle);
    const l = ligne(A.bout, B.bout, x.type, A.f, [...new Set([...A.plus, ...B.plus, 'renvoi'])]); l.fwdVers = fwdDe(B.f); l.pageVers = B.f.page; verite.push(l); });
  return { svgs, verite, composes, folios }; }

module.exports = { construireDocument, preparer, composerFolio, deviceDe, boutDe };
