/* ===========================================================================
   LE ROUTEUR DES DOCUMENTS INVENTÉS — des fils orthogonaux, comme un logiciel de schéma
   ---------------------------------------------------------------------------
   Une grille au pas de 2,5 mm sur la page. Chaque nœud sait s'il est BLOQUÉ (un
   équipement et sa marge, un texte), quel réseau le traverse à l'HORIZONTALE,
   lequel à la VERTICALE, et quel réseau y a un COIN (un coude, un bout, un T) :
   un coin n'appartient qu'à un réseau. Deux fils de réseaux différents peuvent
   se CROISER (l'un horizontal, l'autre vertical, aucun coude là) — jamais se
   superposer ni se toucher. C'est la garantie que la vérité du générateur est
   celle du dessin : rien ne relie deux réseaux que le dessin ne relie pas.
   Le chemin : un A* sur (nœud, sens), un pas coûte 1, un coude 4, un croisement 5.
   =========================================================================== */
'use strict';

const PAS = 2.5;
function routeur(largeur = 420, hauteur = 297) {
  const nx = Math.round(largeur / PAS) + 1, ny = Math.round(hauteur / PAS) + 1, N = nx * ny;
  const bloque = new Uint8Array(N), occH = new Int32Array(N).fill(-1), occV = new Int32Array(N).fill(-1), coin = new Int32Array(N).fill(-1);
  const id = (i, j) => j * nx + i, ij = n => [n % nx, Math.floor(n / nx)], dedans = (i, j) => i >= 0 && j >= 0 && i < nx && j < ny;
  const versNoeud = (x, y) => [Math.round(x / PAS), Math.round(y / PAS)], mm = n => { const [i, j] = ij(n); return [i * PAS, j * PAS]; };
  const R = { nx, ny, id, ij, mm, versNoeud, bloque, occH, occV, coin,
    // bloquer un rectangle (en mm), avec une marge en nœuds
    bloquer(x0, y0, x1, y1, marge = 0) { const i0 = Math.floor(x0 / PAS) - marge, i1 = Math.ceil(x1 / PAS) + marge, j0 = Math.floor(y0 / PAS) - marge, j1 = Math.ceil(y1 / PAS) + marge;
      for (let j = Math.max(0, j0); j <= Math.min(ny - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(nx - 1, i1); i++) bloque[id(i, j)] = 1; },
    // tout ce qui n'est pas dans la zone de dessin
    horsZone(Z) { for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x = i * PAS, y = j * PAS; if (x < Z.x0 || x > Z.x1 || y < Z.y0 || y > Z.y1) bloque[id(i, j)] = 1; } },
    libre(n) { return !bloque[n] && coin[n] < 0 && occH[n] < 0 && occV[n] < 0; },
    // réserver un nœud pour un réseau : un coin (exclusif)
    reserver(n, net) { bloque[n] = 0; coin[n] = net; },
    // la traversée d'un nœud par un réseau, dans un sens (0 horizontal, 1 vertical)
    marquer(n, net, sens) { if (sens === 0) occH[n] = net; else occV[n] = net; },
    /* Le chemin d'un réseau : `departs` [{ n, sens }] (le sens du dernier pas déjà fait), `buts` Map(nœud → { sens: [0|1…]
       admis pour le dernier pas, t: true pour un T sur un autre réseau }). Rend la liste des nœuds, ou null. */
    chemin(net, departs, buts, o = {}) { const COUDE = o.coude || 4, CROISE = o.croise || 5;
      const g = new Float64Array(N * 2).fill(Infinity), prec = new Int32Array(N * 2).fill(-1), ferme = new Uint8Array(N * 2);
      const tas = [], pousser = (s, f) => { tas.push([f, s]); let k = tas.length - 1; while (k) { const p = (k - 1) >> 1; if (tas[p][0] <= tas[k][0]) break; [tas[p], tas[k]] = [tas[k], tas[p]]; k = p; } };
      const tirer = () => { const r = tas[0], d = tas.pop(); if (tas.length) { tas[0] = d; let k = 0; for (;;) { const a = 2 * k + 1, b = a + 1; let m = k; if (a < tas.length && tas[a][0] < tas[m][0]) m = a; if (b < tas.length && tas[b][0] < tas[m][0]) m = b; if (m === k) break; [tas[m], tas[k]] = [tas[k], tas[m]]; k = m; } } return r; };
      const cibles = [...buts.keys()].map(ij), h = n => { const [i, j] = ij(n); let m = Infinity; for (const [a, b] of cibles) { const d = Math.abs(a - i) + Math.abs(b - j); if (d < m) m = d; } return m; };
      const libreCoude = n => !bloque[n] && (coin[n] < 0 || coin[n] === net) && (occH[n] < 0 || occH[n] === net) && (occV[n] < 0 || occV[n] === net);
      departs.forEach(d => { const s = d.n * 2 + d.sens, c = d.g0 || 0; if (c < g[s]) { g[s] = c; pousser(s, c + h(d.n)); } });
      const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 1], [0, -1, 1]];
      // un but peut avoir un coût d'arrivée (un T loin de sa broche coûte plus) : on garde le meilleur, on s'arrête quand plus rien ne peut faire mieux
      let meilleur = null, coutMeilleur = Infinity;
      const rendre = s => { const out = []; let k = s; while (k >= 0) { out.push(k >> 1); k = prec[k]; } return out.reverse(); };
      while (tas.length) { if (tas[0][0] >= coutMeilleur) break; const [, s] = tirer(); if (ferme[s]) continue; ferme[s] = 1; const n = s >> 1, sens = s & 1;
        const b = buts.get(n); if (b && b.sens.includes(sens) && prec[s] >= 0) { const c = g[s] + (b.cout || 0); if (c < coutMeilleur) { coutMeilleur = c; meilleur = s; } continue; }
        if (b && b.t) continue;   // un T sur un autre réseau : on ne le traverse pas
        const [i, j] = ij(n);
        for (const [di, dj, s2] of DIRS) { const i2 = i + di, j2 = j + dj; if (!dedans(i2, j2)) continue; const m = id(i2, j2);
          if (s2 !== sens && !libreCoude(n)) continue;
          const but = buts.get(m);
          if (!(but && but.sens.includes(s2))) {
            if (bloque[m] || (coin[m] >= 0 && coin[m] !== net)) continue;
            if (s2 === 0 ? (occH[m] >= 0 && occH[m] !== net) : (occV[m] >= 0 && occV[m] !== net)) continue; }
          else if (!but.t && (bloque[m] && coin[m] !== net)) continue;
          const croise = !(but && but.t) && (s2 === 0 ? occV[m] >= 0 && occV[m] !== net : occH[m] >= 0 && occH[m] !== net);
          const c = g[s] + 1 + (s2 !== sens ? COUDE : 0) + (croise ? CROISE : 0), s3 = m * 2 + s2;
          if (c < g[s3]) { g[s3] = c; prec[s3] = s; pousser(s3, c + h(m)); } } }
      return meilleur == null ? null : rendre(meilleur); },
    /* Poser un chemin : chaque nœud traversé est marqué dans son sens ; les coudes et les deux bouts deviennent des coins.
       `tSur` : le réseau sur lequel le dernier nœud fait un T (son nœud devient un coin de ce réseau-là). */
    poser(net, noeuds, tSur) { for (let k = 0; k < noeuds.length; k++) { const n = noeuds[k], a = noeuds[k - 1], b = noeuds[k + 1];
        const sa = a == null ? null : (Math.abs(a - n) === 1 ? 0 : 1), sb = b == null ? null : (Math.abs(b - n) === 1 ? 0 : 1);
        if (sa != null) R.marquer(n, net, sa); if (sb != null) R.marquer(n, net, sb);
        if (k === noeuds.length - 1 && tSur != null) { coin[n] = tSur; continue; }
        if (sa == null || sb == null || sa !== sb) { if (coin[n] < 0) coin[n] = net; } } },
    // un chemin de nœuds → une polyligne en mm (les points alignés fusionnés)
    polyligne(noeuds) { const pts = noeuds.map(mm), out = [pts[0]];
      for (let k = 1; k < pts.length; k++) { const p = pts[k], q = out[out.length - 1], r = out[out.length - 2];
        if (r && ((Math.abs(r[0] - q[0]) < 1e-6 && Math.abs(q[0] - p[0]) < 1e-6) || (Math.abs(r[1] - q[1]) < 1e-6 && Math.abs(q[1] - p[1]) < 1e-6))) out[out.length - 1] = p; else out.push(p); }
      return out; } };
  return R; }

module.exports = { routeur, PAS };
