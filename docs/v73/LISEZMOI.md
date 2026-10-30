# Volta v73 — sublimer « Nuit bleue » (en pause)

Le 29 octobre 2026, le lecteur a demandé de repasser toute l'expérience au détail près, la beauté d'abord. Il a choisi
de garder l'identité « Nuit bleue » et de la sublimer.

**Le panel.** Quatre personas ont joué tout l'outil : un technicien pressé, un ingénieur exigeant, un designer, un
ergonome. Leurs rapports sont dans `panel/`. Les maquettes du designer sont dans `maquettes/` : l'accueil et le fond
vivant, codés et mesurés dans `accueil-vivant.html` ; les moments signature dans `moments.html`. La batterie
`tests/ux.js` est le juge chiffré.

**Le cahier des charges** est `BRIEF-CORRECTIONS.md`, en six domaines. Les règles communes sont dans
`BRIEF-COMMUN-v72.md`.

**Fusionnés dans la v73 livrée :**
- le socle (courbes, durées, encres de la table, anneau de focus, chiffres tabulaires) ;
- C, la vérité et les exports ;
- A2, le chrome et les gestes communs ;
- B, les fiches et le cadran.

Leurs rapports sont dans `corrections/`.

**En pause, faute de crédits.** Ce travail est non fini et non vérifié. Chaque domaine a sa branche sur le dépôt :

| branche | domaine | rapport |
|---|---|---|
| `v73-pause-accueil` | A1 : la table vivante et l'accueil | `corrections/table-accueil.md`, s'il existe |
| `v73-pause-folio` | D : le folio lisible, la recherche, Ctrl+K | `corrections/folio.md`, s'il existe |
| `v73-pause-documents` | E : les documents et le récapitulatif | `corrections/documents.md`, s'il existe |
| `v73-pause-verite-calibre-ecrit` | reprise de C : juger les câbles sous le calibre ÉCRIT dans le retest, pas sous la proposition de Volta | `corrections/verite.md`, § Reprise |

**Pour reprendre un domaine :**
1. Partir de sa branche.
2. Y fusionner la branche principale.
3. Relire son rapport et le brief.
4. Finir.
5. Lancer `node tests/toutes.js` et vérifier qu'aucune `pageerror` ne paraît au chargement.
6. Fusionner.

Ensuite, faire rejuger par le panel.
