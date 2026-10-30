# Le banc des macros VBA du pilote SEE

Les macros de `see/vba/` (`SEE_Commun.bas`, `SEE_Sonde.bas`, `SEE_Pilote.bas`, `SEE_Windows.bas`) pilotent
SEE Electrical Expert par COM depuis Excel. Ni Excel ni SEE ne tournent ici. Ce banc fait donc tourner **le
vrai code VBA du dépôt** dans LibreOffice Calc (Basic en mode `VBASupport`), face à un **faux SEE** : des
classes Basic, générées par `faux.py` et `faux2.py`, qui imitent l'API COM de SEE et tracent chacun de leurs
appels (`AddSheet|…`, `AddWireConnection|…`, `SetPosition|…`). `SEE_Windows` ne se charge pas dans
LibreOffice (`PtrSafe`, `StrPtr`, WMI) : **son faux**, `FauxWindows.bas`, aux mêmes fonctions publiques
(`tests/vba.js` le vérifie), dit ce que Windows « répond » (la table des objets actifs, les objets créés,
le registre, les programmes en marche, les fenêtres du bouton 3) et note ses appels à part
(`gWinTrace` : `Windows|new:|{CLSID}`, `Windows|Processus|SEE.exe`…). Chaque scénario lance une macro du pilote,
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
  recalée tombe sur une accroche, et les masses sont tournées selon leur `Sens`. Chaque **matériel**
  (le « device », la référence du catalogue) attendu est associé, avec sa classe et son code, et
  aucun autre : `verifier.py --materiel` calcule depuis le paquet ce que le pilote doit associer (corps
  posés en symbole, connecteurs servis, une fois chacun), refuser, taire et dire ;
- **avec lui-même, pour TesterSEE** (le bouton du bureau) : sur un classeur neuf, sans SEE puis avec le
  faux SEE, il crée ses feuilles, enchaîne les sondes sans rien écrire dans SEE, et finit par la feuille
  `Resultat_Test` en tête du classeur ;
- **avec lui-même, pour la connexion et le bouton 3** : les boutons 1 et 2 rejoignent le SEE ouvert (par
  un ProgID lu au registre, par son CLSID) et n'en créent jamais, même à `LancerSEE = O` ; une connexion
  créée par une macro d'avant est lâchée sans `Quit` ; le bouton 3 ne fait rien si SEE tourne, si
  Windows ne répond pas, si la copie de sécurité rate ou si le technicien annule, et sinon copie, crée,
  ouvre, dessine, enregistre, referme et le dit dans le bloc à photographier ;
- **avec les signatures de l'API telles que le faux SEE les imite** : les noms des méthodes, le nombre
  d'arguments et les codes des objets créés (`CreateObject`). Le faux vérifie aussi le style d'appel :
  en V4, un paramètre de sortie (le faux lève une erreur si l'objet est rendu) ; en V5, une valeur rendue
  (le faux lève une erreur s'il reçoit un paramètre de sortie). Une méthode que le faux n'a pas lève
  « Property or method not found ».

Il **ne prouve pas** :

- **le comportement réel de SEE**. Le faux SEE dit ce qu'on croit de l'API (`see/RECHERCHE.md`), pas ce
  que fait SEE : ni l'unité, ni le sens de l'axe Y, ni le vrai décalage d'un point de connexion (celui
  du faux, 2,5 / −1 mm, est choisi pour le banc), ni le rendu d'un cartouche, ni la façon dont SEE
  compare les noms, ni ce qui se passe vraiment quand SEE refuse quelque chose. Ni le catalogue du
  matériel : ses classes (`CL_EQUIPEMENT`… sont celles du banc), le moment où SEE accepte une
  association, ni son refus d'un code (le faux refuse les codes qui commencent par « * », pour éprouver
  le journal), ni ce que fait `SetEquipmentCollection` d'une liste déjà portée (le faux la REMPLACE par
  celle qu'il reçoit), ni ce que `GetEquipmentCollection` rend pour un objet sans matériel (le faux rend une
  collection vide, ou Nothing dans un passage de « tester »). Seul un essai dans SEE (`TesterSEE`,
  `EssaiDessin`, `EssaiSymboles`) le dit ;
- **Excel**. L'émulation VBA de LibreOffice n'est pas Excel. Elle ne fournit ni `Scripting.Dictionary`
  (remplacé), ni `ThisWorkbook.ReadOnly`, ni `ADODB.Stream`, ni les boîtes de dialogue (`gSansDialogue`).
  La logique de connexion (`ConnecterSEE`) et le bouton 3 sont joués contre le faux `SEE_Windows` ; le
  vrai (`GetObject(, nom)`, `GetActiveObject`, `GetObject("new:…")`, WMI, `GetOpenFilename`,
  `Application.Wait`) ne l'est **pas** : il ne tourne que sous Windows. Ni ce que fait le vrai SEE caché
  (une fenêtre qui bloquerait Excel, un `Quit` qu'il ignore), ni la vraie signature du `CreateObject` de
  `SeeAutomation` (le faux en joue trois), ni le vrai type de ses paramètres de sortie (le faux joue
  `VARIANT*` seul et `IDispatch**` seul), ni le vrai blocage d'un appel `Declare` par Defender (le faux
  fait `End`), ni ce que garde un SEE.exe tenu par Excel (le faux le compte en marche tant que `gApp`
  le tient). L'interface du classeur pilote (boutons, mise en forme) n'est pas jouée non plus ;
- la compilation par Excel : c'est le rôle de `node tests/vba.js` (le contrôle statique : encodage,
  blocs, déclarations, appels).

## Le lancer

Il faut `soffice` (LibreOffice avec Calc, essayé avec la 24.2), `python3` avec le module `uno`
(`apt install python3-uno`) et `node`. `lancer.sh` vérifie ces trois outils et dit ce qui manque.

```
tests/banc-vba/lancer.sh                          tous les scénarios (dix minutes environ)
tests/banc-vba/lancer.sh "complet V5" liste       seulement ceux-là
python3 tests/banc-vba/attendus.py --liste        les noms des scénarios
```

`lancer.sh` :

1. fabrique le paquet d'exemple (`node see/exporter.js --exemple`, une demi-minute) et ses cinq
   variantes (`variante.js` : les trois modifications ensemble ; `v_casse.js`, `v_noms.js` et `v_long.js`
   n'en appliquent qu'une chacun ; `v_pn.js`, pour le matériel : des PN vides et un connecteur à deux PN,
   la géométrie inchangée) ;
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
| materiel V5, materiel V4 | le paquet variante `pn` entier avec du matériel : `EQUIPEMENT.ClasseMateriel` et `.ClasseConnecteur`, `PRISE.ClasseConnecteur`, `MASSE.ClasseMateriel` (les masses n'ont pas de PN), `BARRETTE.ClasseMateriel` (en `BORNIER`, corps dessiné) ; le faux catalogue refuse les codes qui commencent par « * » ; puis la sonde du folio 1, puis une simulation (`Remplacer = O`) | **intention**, nombres **calculés** par `verifier.py --materiel` depuis le paquet : 6 folios SAUVE ; la géométrie de « complet » (210 fils, 0 bout faux, 0 segment oblique, 309 broches) ; associations lues = attendues (118), classe ou code faux 0, manquantes 0, en trop 0 ; refus (2), corps sans PN (44), corps dessinés (20), connecteur sans PN (1), connecteur à deux PN (1) dits au journal comme attendu ; « matériel non relu » 0, « relecture différente » 0 ; colonne `Materiels` du bilan = associés ; la sonde relit le matériel du folio 1 comme attendu (9) sans rien écrire ; la simulation n'écrit rien : elle lit les connecteurs que le passage réel a associés (« déjà associé », 66 = connecteurs associés) et dit chaque autre tentative, 54 + 66 = 120 tentatives |
| materiel existant | un connecteur repris du projet qui porte DÉJÀ un matériel (constats C1, R2) : le folio 1 dessiné une fois, puis trois de ses connecteurs reçoivent « à la main » c1 un autre matériel, c2 le sien et un accessoire, c3 un accessoire ; puis une simulation, `MaterielExistant` = `GARDER`, `AJOUTER`, une relance en `AJOUTER`, `REMPLACER` sur c1 remis à la main, et une lecture du matériel qui échoue | **intention** : simulation : 0 écriture, c1 et c3 « gardés » dits ; `GARDER` : 0 association, les trois inchangés ; `AJOUTER` : 2 associations, c1 et c3 = ce qu'ils portaient + leur PN, c2 inchangé, rien de perdu ni de non relu ; relance : 0 association, aucun doublon (2, 2, 2) ; `REMPLACER` : c1 ne garde que son PN, le retrait est dit ; lecture ratée : 0 association, « matériel existant illisible » dit, le folio va au bout |
| tester | `TesterSEE` : sur le classeur neuf sans SEE, puis avec le faux SEE en V5 et en V4 après un lot de deux folios avec matériel ; puis SEE joint sans aucun folio affiché ; SEE qui cesse de répondre quand la sélection est lue ; `GetEquipmentCollection` qui rend Nothing pour un objet sans matériel | **intention** : sans SEE : `Reglages` créée (138 clés), « SEE rejoint ? = NON », aucune trace, la boîte dit « Excel n'a pas trouvé ta fenêtre SEE », la photo, et « Essaie le bouton 3 » ; avec le faux : aucune écriture pendant le test, « OUI », version, unité, symboles et matériel du folio lus (classes `CL_EQUIPEMENT` et `CL_CONNECTEUR`), autant de matériel par la sélection que par le folio, 6 XML dans `Sonde_XML`, les cinq sondes faites, la boîte dit « BRAVO », la photo de `Resultat_Test`, et nomme le bouton 2 (aucun fichier à renvoyer) ; les erreurs des étapes = celles de « Ce qui a échoué » ; sans folio : « Folio lu = aucun », l'étape dit « rien lu », mais un projet ouvert suffit : la boîte dit « BRAVO » et le bouton 2, sans demander de relancer ; SEE muet : aucune reconnexion, « OUI » et ce qui a été lu avant restent dits, ligne « SEE perdu » (SondeSelection), XML « non lues », la boîte le dit ; Nothing : aucune cellule « #ERR » dans les colonnes du matériel de `Sonde_Folio`, « (aucun : Nothing) » à la place ; dans chaque passage, `Resultat_Test` est la première feuille, le bloc provisoire « EN COURS » a été remplacé, la seule boîte est celle de la fin (d'abord *OK*, puis la photo ; le bouton 2 ou 3 et son onglet « Accueil ») et « Et maintenant » en reprend la consigne |
| bouton 2 V5, bouton 2 V4 | `EssaiDessinReel` (le bouton 2 du classeur) avec le faux SEE, le réglage `Simulation` à O ; puis sans SEE (aucun ouvert, `LancerSEE = N`) ; puis avec un sous-groupe à créer (réglage `Groupe`) | **intention** : dessiné pour de vrai malgré `Simulation = O` : un folio créé (`AddSheet` 1), le motif (au moins 5 objets graphiques) ; une seule question, qui nomme le projet ouvert ; le journal du dessin n'est pas vidé par la relecture ; `Sonde_Folio` décrit `ESSAI_PILOTE` ; la fin dit de regarder le folio dans SEE ; `Simulation` reprend sa valeur (O) après ; sans SEE : aucune écriture, aucune question, « Rien n'a été dessiné » dit ; le sous-groupe n'est créé qu'APRÈS la question |
| connexion V5, connexion V4 | les boutons 1 et 2 face au faux `SEE_Windows` : a. rien d'ouvert, classeur neuf ; b. `LancerSEE = O` ; c. SEE inscrit au registre (`SEEExpert.Application.48`) et ouvert sous ce ProgID ; d. ouvert sous son CLSID seulement (`EssaiCLSID = O`) ; e. une connexion CRÉÉE par `EssaiDessin` (`Alt+F8`, `LancerSEE = O`), puis les boutons 1 et 2 ; f. ouvert sous le CLSID de `SeeAutomation` V4R3 seulement (`EssaiCLSID = O`) | **intention** : `LancerSEE` vaut N dans un classeur neuf ; aucun objet SEE créé par les boutons 1 et 2 (a, b, c, d) ; a : `GetActiveObject` n'est pas essayé (`EssaiCLSID = N` par défaut), le bloc à photographier liste les 6 essais, chacun avec son code (`429 (800A01AD)`) et sa phrase, et dit « Essaie le bouton 3 » et où il est (onglet « Accueil ») ; c : rejoint par `GetObject(, "SEEExpert.Application.48")`, ProgID nommé dans `Sonde_Registre` et dans le bloc ; d : rejoint par `GetActiveObject({A55015A3-…})` ; e : la connexion créée est lâchée au début du bouton 1 puis du bouton 2, sans `Quit`, la fenêtre ouverte rejointe, le folio du bouton 2 dessiné dedans ; f : `GetActiveObject` essayé après tous les `GetObject`, rejoint par `SeeAutomation`, la boîte envoie au bouton 3 et la connexion est lâchée (`gApp` vide, le journal le dit) |
| bouton 3 V4, bouton 3 V5 | `EssaiSansFenetre` (le bouton 3), un SEE V4R3 inscrit (programme `SEE_Faux.exe`), un faux projet `.seeprj` dans le dossier de travail ; le `CreateObject` du faux `SeeAutomation` : V4, un paramètre de plus ; V5, la forme d'Application | **intention** : SEE ouvert (Windows revu cinq fois, puis : le voir et le fermer, fermer Excel, sinon le Gestionnaire des tâches), Windows muet (sans boîte), copie ratée, Annuler (la fenêtre « Ouvrir », puis la question) : ni objet SEE créé, ni copie, ni projet ouvert, et le bloc dit pourquoi ; le nom du programme compté vient du registre ; SEE rouvert pendant la fenêtre « Ouvrir » : copie faite, mais rien de créé ni d'ouvert ; `OpenProject` et `CreateObject` qui n'acceptent qu'une variable `Object` (puis qu'un `Variant`) : dessiné et enregistré, la variable qui a servi dite ; la connexion du bouton 1 (rejointe, gardée) lâchée au début : SEE fermé, parcours complet ; ensuite, le réglage `Projet` noté et un SEE ouvert sur un autre projet : aucun `OpenProject` par les boutons 1 et 2, la question nomme `PROJET_FAUX` ; aucun passage ne montre le chemin entier du projet ; parcours complet : `new:` V5R2 refusé puis V4R3 créé, une copie `TEST_SEE.avant-pilote-<date>.seeprj`, `OpenProject` 1, `AddSheet` 1, chaque objet posé compté, `Save` 1, `Quit` 1, la forme retenue dite, le projet noté dans `Projet`, `gApp` lâché, la consigne « Ouvre SEE… ESSAI_PILOTE » ; `CreateObject` refusé : projet ouvert, rien dessiné, pas de `Save`, `Quit` 1, « projet ouvert : oui ; création d'objets : REFUSÉE (codes : forme 1 … ; forme 2, Variant : 13 ; forme 2, Object : 13) » ; un SEE qui reste après `Quit` : Windows revu cinq fois, « SEE refermé = NON », et d'abord Ctrl + Maj + Échap, « Plus de détails », « Processus en arrière-plan », *Fin de tâche*, puis rouvrir SEE |
| arret Windows | `TesterSEE` arrêté par Windows au premier appel d'une fonction déclarée (`GetActiveObject` : le faux fait `End`, comme la règle de Defender) ; puis ce qui reste devant le technicien | **intention** : `Resultat_Test` devant lui, avec le bloc « EN COURS : SondeApplication … GetActiveObject », le registre lu, et « Et maintenant » : la photo du bloc ET du message de Windows ; les `GetObject` essayés avant l'arrêt, aucun `GetActiveObject` au journal ; aucune boîte de fin |
| panne classeur | `InitialiserClasseur` qui lève 1004 (sous Excel : une feuille `Reglages` protégée ; `banc.py` pose la panne, `gPanneClasseur`) | **intention** : `InitialiserSansBoite` remet `gSansDialogue` (Faux) et relève l'erreur ; le bouton 3 la dit « ARRÊT IMPRÉVU » et ne crée rien |

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
- **`Base` est un mot de la langue.** LibreOffice refuse une variable nommée `base` (`Option Base`) : tout
  le module ne compile plus, et chaque macro du banc rend `None` en 0,1 s. Excel l'accepte : le contrôle
  statique ne le voit pas. Pour trouver la procédure fautive : charger le module seul, sans telle ou telle
  procédure, et appeler une fonction triviale.
- **`.Type` ne peut pas être déclaré.** Une classe Basic ne peut pas avoir de propriété nommée `Type`
  (mot réservé). Le faux folio n'en a donc pas, et les `.Type = 9` du pilote échouent dans le banc. Ils
  sont rattrapés et journalisés (« .Type = 9 », 6 fois dans « modes » et « journal NORMAL »). C'est
  attendu ici, et ce n'est pas un défaut du pilote.
- **`ThisWorkbook.ReadOnly` est absent.** L'émulation VBA ne l'a pas : la sauvegarde du classeur pilote
  journalise « Property or method not found: ReadOnly ». C'est attendu.
- **`Replace` sans `start` ni `count`, mais avec `compare`.** LibreOffice rend alors une chaîne tronquée
  (600 caractères en rendent 153) ; Excel, lui, les prend pour 1 et -1. Le pilote les écrit donc
  toujours : `Replace(s, a, b, 1, -1, vbTextCompare)`.
- **`End` arrête tout, sans `On Error`.** Le faux `SEE_Windows` s'en sert pour jouer Windows qui arrête la
  macro (`gWinBloqueDeclare`) ; la fonction du banc rend ce qu'elle avait déjà affecté, et une seconde
  macro relit ensuite le classeur (`ApresArret`).
- **Une variable `Object` et un `Variant` passés par référence se distinguent.** Dans le faux, `IsObject`
  du paramètre est Vrai pour une variable `Object` (même `Nothing`), Faux pour un `Variant` vide : c'est
  ce qui lui fait jouer un paramètre de sortie `IDispatch**` ou `VARIANT*` (`gAutoSortie`).
- **Une panne posée dans le pilote.** `banc.py` ajoute au début d'`InitialiserClasseur` un `Err.Raise
  1004` qui ne joue que si `gPanneClasseur` (sous Excel, une feuille protégée le lève ; LibreOffice, non).
  Si `InitialiserClasseur` change de ligne d'en-tête, `banc.py` le dit et s'arrête.
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
| `faux.py`, `faux2.py` | le faux SEE (modules Basic générés) et les macros `BancFaux.*` ; `faux2.py` y ajoute les pannes, et le faux `SeeAutomation` du bouton 3 (`FauxAuto`) |
| `FauxWindows.bas` | le faux `SEE_Windows`, aux mêmes fonctions publiques que le vrai : ce que Windows répond se règle par ses variables `gWin*`, remises à zéro par `InitFaux` |
| `DicoTest.bas` | le substitut de `Scripting.Dictionary` |
| `Banc.bas`, `BancR.bas` | les macros des scénarios (`FixerReglage`, `BancSimulation` ; les scénarios de la relecture) |
| `relecture.py`, `regression.py` | ils lancent les scénarios (`SCEN`), un nom de scénario en argument |
| `verifier.py` | il relit la trace d'un passage complet contre le paquet (bouts de fil, segments, numéros, broches) ; avec `--materiel=…`, le matériel associé (voir son en-tête) |
| `journal.py` | il lance une macro et montre les erreurs de son journal, son bilan, et les lignes filtrées |
| `variante.js`, `v_casse.js`, `v_noms.js`, `v_long.js`, `v_pn.js` | ils fabriquent les paquets variantes (`v_pn.js` : celle du matériel) |
