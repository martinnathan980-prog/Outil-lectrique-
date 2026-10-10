# Le banc des macros VBA du pilote SEE

Les macros de `see/vba/` (`SEE_Commun.bas`, `SEE_Sonde.bas`, `SEE_Pilote.bas`) pilotent SEE Electrical
Expert par COM depuis Excel. Ni Excel ni SEE ne tournent ici. Ce banc fait donc tourner **le vrai code VBA
du dépôt** dans LibreOffice Calc (Basic en mode `VBASupport`), face à un **faux SEE** : des classes Basic,
générées par `faux.py` et `faux2.py`, qui imitent l'API COM de SEE et tracent chacun de leurs appels
(`AddSheet|…`, `AddWireConnection|…`, `SetPosition|…`). Chaque scénario lance une macro du pilote,
puis relit ce qu'elle a fait : le texte rendu, les feuilles `Journal` et `Bilan` du classeur, la trace
du faux SEE, confrontée au paquet par `verifier.py`.

Il sert à **revérifier les macros après une modification** : il faut relancer `lancer.sh` et comparer les
verdicts.

## Ce qu'il prouve, et ce qu'il ne prouve pas

Il prouve **la cohérence du code VBA** :

- **avec lui-même** : les modules se chargent et s'exécutent jusqu'au bout. Les chemins rarement pris
  sont parcourus : panne au milieu d'un folio, relance, `Remplacer = O`, nom refusé, sauvegarde ratée,
  liste des folios illisible, simulation, coclasse `SeeAutomation`, réglages lus d'une macro à l'autre.
  Les erreurs y sont rattrapées et dites au journal, et le bilan donne le bon état pour chaque folio ;
- **avec le paquet** (`see/exporter.js`) : chaque fil du paquet est tracé, ses deux bouts tombent au
  centième de millimètre sur le point de pose de sa borne, et ses segments sont droits. Chaque broche
  recalée tombe sur une accroche, et les masses sont tournées selon leur `Sens` ;
- **avec les signatures de l'API telles que le faux SEE les imite** : les noms des méthodes, le nombre
  d'arguments et les codes des objets créés (`CreateObject`). Le faux vérifie aussi le style d'appel :
  en V4, un paramètre de sortie (le faux lève une erreur si l'objet est rendu) ; en V5, une valeur rendue
  (le faux lève une erreur s'il reçoit un paramètre de sortie). Une méthode que le faux n'a pas lève
  « Property or method not found ».

Il **ne prouve pas** :

- **le comportement réel de SEE**. Le faux SEE dit ce qu'on croit de l'API (`see/RECHERCHE.md`), pas ce
  que fait SEE : ni l'unité, ni le sens de l'axe Y, ni le vrai décalage d'un point de connexion (celui
  du faux, 2,5 / −1 mm, est choisi pour le banc), ni le rendu d'un cartouche, ni la façon dont SEE
  compare les noms, ni ce qui se passe vraiment quand SEE refuse quelque chose. Seul un essai dans SEE
  (`EssaiDessin`, `EssaiSymboles`, les sondes) le dit ;
- **Excel**. L'émulation VBA de LibreOffice n'est pas Excel. Elle ne fournit ni `Scripting.Dictionary`
  (remplacé), ni `ThisWorkbook.ReadOnly`, ni `ADODB.Stream`, ni les boîtes de dialogue (`gSansDialogue`).
  Le code de connexion (`GetObject` / `CreateObject` de SEE) n'est pas joué : le banc pose `gApp` sur
  le faux. L'interface du classeur pilote (boutons, mise en forme) n'est pas jouée non plus ;
- la compilation par Excel : c'est le rôle de `node tests/vba.js` (le contrôle statique : encodage,
  blocs, déclarations, appels).

## Le lancer

Il faut `soffice` (LibreOffice avec Calc, essayé avec la 24.2), `python3` avec le module `uno`
(`apt install python3-uno`) et `node`. `lancer.sh` vérifie ces trois outils et dit ce qui manque.

```
tests/banc-vba/lancer.sh                          tous les scénarios (sept minutes environ)
tests/banc-vba/lancer.sh "complet V5" liste       seulement ceux-là
python3 tests/banc-vba/attendus.py --liste        les noms des scénarios
```

`lancer.sh` :

1. fabrique le paquet d'exemple (`node see/exporter.js --exemple`, une demi-minute) et ses quatre
   variantes (`variante.js` : les trois modifications ensemble ; `v_casse.js`, `v_noms.js` et `v_long.js`
   n'en appliquent qu'une chacun) ;
2. pour **chaque** scénario, démarre un soffice neuf, lance le scénario (par `relecture.py` ou
   `regression.py`), puis arrête soffice. Si LibreOffice est tombé pendant le passage, il refait ce
   scénario une fois et le note au bilan ;
3. juge chaque sortie avec `attendus.py`, écrit le bilan et finit par la ligne
   **« N / M scénarios conformes »**. Le code de sortie vaut 0 si tout est conforme, 1 si un scénario ne
   l'est pas, et 2 si le banc n'a pas pu tourner.

Tout ce qui s'écrit va dans le **dossier de travail**, jamais dans le dépôt. Les variables
d'environnement le règlent :

| Variable | Rôle | Par défaut |
|---|---|---|
| `BANC_VBA_TRAVAIL` | le dossier de travail (refusé s'il est dans le dépôt) | `<temp>/banc-vba` |
| `BANC_VBA_PORT` | le port du soffice du banc | `2002` |
| `VBA_DIR` | les modules à éprouver | `see/vba` |
| `BANCR` | un autre `BancR.bas` | `tests/banc-vba/BancR.bas` |

Le dossier de travail contient :

- `bilan.txt` : le bilan complet ;
- `sorties/NN-<scénario>.txt` : la sortie brute de chaque passage, avec à côté son `.verdict` ;
- les paquets `paquet-*.xlsx` ;
- `trace.txt` : la trace du faux SEE, réécrite à chaque scénario ;
- `profil-lo/` : un profil LibreOffice à part ;
- `soffice.log` et `fabrication.txt`.

À la main (pour creuser un scénario) :

```
export BANC_VBA_TRAVAIL=/tmp/banc-vba ; P=$BANC_VBA_TRAVAIL/paquet-exemple.xlsx
soffice --headless --invisible --norestore --nologo --accept="socket,host=localhost,port=2002;urp;" &
python3 tests/banc-vba/relecture.py $P $BANC_VBA_TRAVAIL/paquet-variante.xlsx "complet V5" interrompu
python3 tests/banc-vba/regression.py $P "modes V5"        # sans nom : tous ceux de regression.py
python3 tests/banc-vba/journal.py BancR.BancComplet "('$P', False, False)" "relecture~hors limite"
                                  # une macro, puis les erreurs de son journal et les lignes qui contiennent ces mots
python3 tests/banc-vba/verifier.py $P $BANC_VBA_TRAVAIL/trace.txt   # relit la trace d'un passage complet
pkill -x soffice.bin              # surtout pas pkill -f : il tue aussi le shell qui le lance
```

Passer plusieurs scénarios dans un même soffice marche souvent, mais le pont finit parfois par tomber :
voir les pièges.

## Les scénarios, et ce que « conforme » veut dire

Les critères sont écrits dans `attendus.py`. Tous les scénarios ont le critère **« va au bout »** : la macro
du banc rend son texte, sans « ERREUR VBA » (une erreur sortie du pilote jusqu'au banc) ni
« EXCEPTION » (le pont UNO ou LibreOffice tombé). Les valeurs marquées **relevé** ont été relevées le
10 octobre 2026 sur le code du dépôt et données comme attendues. Celles marquées **intention** disent ce
que le scénario est fait pour montrer.

Le nombre d'« erreurs » rendu par les macros (par exemple `erreurs 270` pour un passage complet) **n'est
pas un critère**. Ces erreurs viennent du faux SEE et de l'émulation : « broche N absente du connecteur »
(le faux exige `AddPin` avant `AddPinSymbol`), « .Type = 9 », « ReadOnly ». Le pilote les rattrape et les
journalise, ce qui fait partie de ce qu'on éprouve. `journal.py` montre ce qu'elles sont.

Les scénarios ci-dessous viennent de `relecture.py` (les macros `BancR.*` de `BancR.bas`). Les codes C1 à
C12 et VBA-1 à VBA-9 renvoient aux constats de relecture que cite `BancR.bas`.

| Scénario | Ce qu'il joue | Conforme si |
|---|---|---|
| complet V5 | le paquet d'exemple entier (6 folios), API V5 (C1, C5, C12, VBA-9) | **relevé** : V5 ; 6 folios, tous SAUVE ; 210 fils tracés sur 210 ; bouts faux 0 ; segments obliques 0 ; broches recalées sur leur point de pose 309, hors 0 ; masses Sens D 25 / G 17, posées à 180° : 25, à 0° : 17 ; « relecture impossible » 0 |
| complet V4 | le même, API V4 (paramètres de sortie) | **relevé** : comme complet V5, sauf « relecture impossible ». « Numéros différents 201 » est normal en V4, parce que les numéros y sont posés après coup par `ChangeTag` |
| relecture ratée V5 | le même ; la relecture des points de connexion après recalage échoue | **relevé** : comme complet V5 (sans les masses), mais « relecture impossible » 732 |
| variante V5 (tout, casse, noms, long) | `BancComplet` sur une variante : bornes « A » et « a » d'un même bloc, folio 2 nommé comme le folio 1, numéro de fil `W12345678901` | **intention** : V5 ; 6 folios, tous SAUVE ; tous les fils du paquet tracés ; bouts faux 0 ; segments obliques 0 ; aucune broche hors de son point ; « nom en double » dit (tout, noms) ; « ordre hors limite » dit (tout, long) |
| interrompu | une panne au milieu du folio 2, puis une relance (VBA-3, C2) | **relevé** : passage 1 : SEE [1,~2,3], bilan 1=SAUVE 2=ERREUR 3=SAUVE ; relance : SEE [1,3,2], bilan 1=SAUTE (existe) 2=SAUVE 3=SAUTE (existe), DeleteSheet 1 |
| remplacer | `Remplacer = O` redessine sous un nom provisoire, supprime l'ancien folio, puis renomme (C2) | **relevé** : SEE [1,2,3] ; bilan tous SAUVE ; AddSheet 6 ; DeleteSheet 3 |
| liste | `GetSheetByName` lève une erreur pour un folio absent ; ensuite, la liste des folios est illisible (C3a) | **relevé** : passage 1 : SEE [1,2,3] ; relance : tous SAUTE (existe) ; liste illisible : AddSheet 0, arrêt dit au journal |
| renommage | SEE refuse le nom provisoire (C3b) | **relevé** : AddSheet 3 ; DeleteSheet 3 ; bilan 3 ERREUR ; arrêt du lot dit |
| sauvegardes | deux lots aux mêmes rangs ; la sauvegarde du premier échoue (C9) | **relevé** : A1=DESSINE A2=DESSINE B1=SAUVE B2=SAUVE |
| automation | connecté par la coclasse `SeeAutomation` (C8) | **relevé** : réel : traces 0 ; simulation : traces 0, bilan SIMULE |
| version | le réglage `VersionAPI` relu par une macro suivante (VBA-2) | **intention** : auto : V5 ; après `VersionAPI = V4` : V4 |
| formes | les notes « une fois » redites par chaque macro (VBA-8) | va au bout (le texte rendu est à lire) |
| simulation zone | une simulation avec SEE joignable, sans réglage `Cartouche`, avec un projet à ouvrir (C6, C7) | **relevé** : écritures pendant la simulation 0 ; projet ouvert en lecture seule |
| essai existant | `FolioEssai` nomme un vrai folio (C10) | **relevé** : DeleteSheet 0 |
| apostrophe | une valeur de réglage précédée d'une apostrophe (VBA-1) | **intention** : écrit par `InitialiserClasseur` sans apostrophe ([O]) ; une cellule « 'N » est lue N |
| unite | une unité rendue en texte (VBA-7) | va au bout (le texte rendu est à lire) |

Les scénarios ci-dessous viennent de `regression.py`, les scénarios d'origine du banc. Ce sont les macros
`BancFaux.*`, écrites dans `faux.py`.

| Scénario | Ce qu'il joue | Conforme si |
|---|---|---|
| simulation sans SEE | `Simulation = O`, sans SEE | **intention** : bilan tout SIMULE |
| essais V5, essais V4 | `EssaiDessin` puis `EssaiSymboles` | **intention** : va au bout, dans la bonne version |
| sondes V5, sondes V4 | un lot de 2 folios, puis les cinq sondes et la sonde du folio de la vue | **relevé** : vont au bout (jusqu'à « folio de la vue ») |
| modes V5, modes V4 | les modes autres que ceux par défaut : sous-groupe, `BOITE`, `SYMBOLE`, `DESSIN`, `IGNORER`, `ECHELLE`, sans recalage, `SensY = -1` | **relevé** : bilan tout SAUVE |
| journal NORMAL | `Journal = NORMAL`, et `AddPin` non exigé | **relevé** : bilan tout SAUVE |
| simulation avec SEE V5, simulation avec SEE V4 | `Simulation = O`, avec le faux SEE joignable | **relevé** : traces {} (aucune écriture dans SEE), bilan tout SIMULE |

Une valeur qui change **après une modification du VBA** n'est pas forcément une régression. Il faut
lire la sortie brute, comprendre la différence, et ne changer `attendus.py` que si le nouveau
comportement est le bon (en le disant).

## Ajouter un scénario

1. **La macro.** Ajouter une fonction à `BancR.bas`, sur le modèle des autres :
   - commencer par `On Error GoTo E` et `ReglerFaux "<folios>", <v4>` ;
   - régler le classeur avec `FixerReglage "<clé>", "<valeur>"` ;
   - appeler le pilote (`DessinerPaquetFichier chemin, True`, `EssaiDessin`, une sonde…) ;
   - rendre un texte court qui contient les nombres à juger. Les outils sont là :
     `Compter("AddSheet")` (des traces du faux), `JournalContient("mot")`, `EtatsBilan()` et
     `NomsDesFoliosSEE()` ;
   - finir par `E:` et un texte « ERREUR VBA … ».

   Pour la relire avec `verifier.py`, appeler `EcrireTrace` après le passage.
2. **Une panne du faux SEE**, s'il en faut une. L'ajouter dans `faux2.py` avec `rep(module, ancien, nouveau)` :
   - une variable `gXxx` dans `FauxSEE` ;
   - sa remise à zéro dans `InitFaux` ;
   - le `Err.Raise` voulu dans la méthode imitée.

   `rep` vérifie que le texte remplacé est unique.
3. **Le scénario.** Ajouter une ligne à la liste `SCEN` de `relecture.py` :
   `('mon scénario', lambda d: lancer(d, 'BancR.MaMacro', (PAQUET,)), None)`. Le troisième élément est une
   relecture après coup, ou `None`. Pour un scénario « à l'ancienne », il faut plutôt une macro dans
   `MOD['BancFaux']` de `faux.py` et une ligne dans la liste `SCEN` de `regression.py`.
   `attendus.py --liste` lit ces deux listes : le scénario est lancé dès qu'il y est.
4. **L'attendu.** Ajouter `ATTENDUS['mon scénario'] = [...]` dans `attendus.py`, avec `egal`, `au_moins`
   et `tous`, et les extracteurs `nombres`, `bilan`, `folios_see`, `texte`, `bilan_regression` et
   `traces_regression`. Marquer si la valeur est relevée ou tient à l'intention. Sans attendu, le
   scénario n'a que « va au bout ».
5. `tests/banc-vba/lancer.sh "mon scénario"`.

## Les pièges de LibreOffice

- **Pas de `Scripting.Dictionary`.** Il n'existe pas hors de Windows. `banc.py` remplace la ligne exacte
  `Set d = CreateObject("Scripting.Dictionary")` (dans `SEE_Commun.bas`) par `Set d = New DicoTest`.
  `DicoTest.bas` imite `Exists`, `Add`, `Remove`, `Item`, `Keys`, `Count` et `CompareMode`. En mode
  binaire, les clés sont sensibles à la casse, grâce au codage des majuscules, puisque les clés d'une
  `Collection` ne le sont pas. Si le pilote crée un dictionnaire autrement, le remplacement ne se fait
  pas, et il faut adapter `banc.py`. `DicoTest.Keys` porte aussi la panne volontaire du scénario
  « interrompu » (`gPlanterKeys`).
- **`obj.Item(k) = v` est réécrit.** LibreOffice ne sait pas affecter par un `Property Let` à argument d'une
  classe Basic. `banc.py` réécrit donc ces lignes en `obj.Assigner k, v`, avec une expression régulière.
  Elle accepte un objet `nom` ou `nom(i)` et une clé avec deux niveaux de parenthèses. Une ligne d'une
  autre forme (`Set x.Item(k) = o`, une parenthèse dans une chaîne) ne serait pas réécrite et
  échouerait dans le banc seulement.
- **`.Type` ne peut pas être déclaré.** Une classe Basic ne peut pas avoir de propriété nommée `Type`
  (mot réservé). Le faux folio n'en a donc pas, et les `.Type = 9` du pilote échouent dans le banc. Ils
  sont rattrapés et journalisés (« .Type = 9 », 6 fois dans « modes » et « journal NORMAL »). C'est
  attendu ici, et ce n'est pas un défaut du pilote.
- **`ThisWorkbook.ReadOnly` est absent.** L'émulation VBA ne l'a pas : la sauvegarde du classeur pilote
  journalise « Property or method not found: ReadOnly ». C'est attendu.
- **`Is` ne reconnaît pas un objet du faux revenu par le pilote.** `faux2.py` donne donc à chaque faux
  folio un `NumeroFaux`, et `DeleteSheet` compare ces numéros.
- **Les modules du dépôt sont en Windows-1252 et CRLF.** `banc.py` les décode, retire les lignes
  `Attribute VB_Name`, et ajoute `Option VBASupport 1`. Les fichiers du banc (`*.bas`, `*.py`) sont en
  UTF-8.
- **Les chemins Windows.** `SondeMethodes` écrit `dossier & "\SEE_Methodes_….xml"`. Sous Linux, la barre
  inverse fait partie du nom de fichier. `lancer.sh` démarre donc soffice avec `TEMP=<travail>/sonde`,
  et ces fichiers tombent dans le dossier de travail (`sonde\SEE_Methodes_….xml`). Lancé à la main avec
  un autre `TEMP`, soffice les écrit à côté de ce dossier-là.
- **Le pont UNO tombe parfois.** Il arrive que LibreOffice tombe au milieu d'un lot de scénarios passés
  dans un même soffice : « Binary URP bridge disposed during call », puis « illegal object given! » à la
  fermeture. Un soffice neuf par scénario l'évite, et c'est ce que fait `lancer.sh`. S'il tombe quand
  même, `lancer.sh` refait le scénario une fois et le dit au bilan.
- **Arrêter soffice.** `lancer.sh` arrête *son* soffice : il demande `Desktop.terminate` par le pont, puis
  tue le processus qu'il a lancé et ses enfants s'il le faut. À la main, utiliser `pkill -x soffice.bin`,
  **jamais `pkill -f soffice`**, qui tue aussi le shell dont la ligne de commande contient « soffice ».

## Les fichiers

| Fichier | Rôle |
|---|---|
| `lancer.sh` | le lancement complet (outils, paquets, un soffice par scénario, bilan) |
| `attendus.py` | la liste des passages et ce que « conforme » veut dire pour chacun |
| `chemins.py` | les chemins (dépôt, dossier de travail, trace, port), calculés depuis l'emplacement des fichiers |
| `lo_run.py` | la connexion à soffice ; `attendre` et `arreter` pour `lancer.sh` |
| `banc.py` | il charge les modules du dépôt (avec les réécritures ci-dessus), lance une macro et lit une feuille ; seul, il joue `Banc.BancSimulation` |
| `faux.py`, `faux2.py` | le faux SEE (modules Basic générés) et les macros `BancFaux.*` ; `faux2.py` y ajoute les pannes |
| `DicoTest.bas` | le substitut de `Scripting.Dictionary` |
| `Banc.bas`, `BancR.bas` | les macros des scénarios (`FixerReglage`, `BancSimulation` ; les scénarios de la relecture) |
| `relecture.py`, `regression.py` | ils lancent les scénarios (`SCEN`), un nom de scénario en argument |
| `verifier.py` | il relit la trace d'un passage complet contre le paquet (bouts de fil, segments, numéros, broches) |
| `journal.py` | il lance une macro et montre les erreurs de son journal, son bilan, et les lignes filtrées |
| `variante.js`, `v_casse.js`, `v_noms.js`, `v_long.js` | ils fabriquent les paquets variantes |
