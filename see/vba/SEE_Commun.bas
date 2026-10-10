Attribute VB_Name = "SEE_Commun"
' ============================================================================
'  SEE_Commun - le socle du pilote SEE Electrical Expert (Atelier Schéma)
' ----------------------------------------------------------------------------
'  Ce module ne fait rien tout seul : aucune macro automatique. Il donne aux
'  modules SEE_Sonde et SEE_Pilote :
'    - les feuilles Reglages et Journal du classeur (InitialiserClasseur) ;
'    - la lecture des réglages ;
'    - le journal (une ligne par appel COM : étape, objet, appel, résultat,
'      Err.Number, Err.Description) ;
'    - la connexion à SEE (ConnecterSEE : les stratégies dans l'ordre) ;
'    - la version de l'API (V5 : les méthodes Get* RENDENT l'objet ; V4 : elles
'      le donnent par un paramètre de sortie) et la COUCHE D'ADAPTATION : une
'      petite fonction par appel COM qui rend un objet, pour que le reste du
'      code ignore la version ;
'    - la conversion des coordonnées du paquet (mm, haut gauche, y vers le bas)
'      vers celles de SEE, selon les réglages ;
'    - la lecture du paquet SEE (.xlsx, format paquet-see/1, colonnes lues par
'      leur NOM) et la sélection des folios (« 1 », « 1-5 », « 3;7 »).
'
'  Liaison tardive uniquement (Object / Variant, aucune référence à cocher).
'  Rien n'est établi sur le comportement de l'API de SEE : tout ce qui n'est
'  pas sûr se règle dans la feuille Reglages et se lit dans le Journal.
' ============================================================================
Option Explicit

' --- Types d'objets de SEEDynamicObjectTypes (identiques en V5R2 et V4R3 pour
'     ceux-ci : les deux versions ne diffèrent qu'à partir de 45)
Public Const OBJ_SYMBOLE As Long = 0
Public Const OBJ_COLLECTION As Long = 1
Public Const OBJ_REPERE As Long = 4
Public Const OBJ_TEXTE As Long = 7
Public Const OBJ_FOLIO As Long = 9
Public Const OBJ_LIGNE As Long = 11
Public Const OBJ_POINT As Long = 12
Public Const OBJ_NOM As Long = 14
Public Const OBJ_BORNE As Long = 15
Public Const OBJ_BROCHE As Long = 16
Public Const OBJ_RECTANGLE As Long = 17
Public Const OBJ_BORNIER As Long = 28
Public Const OBJ_CONNECTEUR As Long = 29
Public Const OBJ_CABLE As Long = 31
Public Const OBJ_GROUPE As Long = 42

' --- SEEFamilyType
Public Const FAMILLE_SEE As Long = 1
Public Const FAMILLE_UTILISATEUR As Long = 2

' --- SEEGraphicObjectType
Public Const GRAPH_TEXTE As Long = 1
Public Const GRAPH_LIGNE As Long = 2
Public Const GRAPH_RECTANGLE As Long = 4

' --- Noms des feuilles du classeur pilote
Public Const FEUILLE_REGLAGES As String = "Reglages"
Public Const FEUILLE_JOURNAL As String = "Journal"

' --- Les natures de blocs du paquet (FORMAT-PAQUET.md, feuille Blocs)
Public Const NATURES As String = "EQUIPEMENT;BARRETTE;BARRETTE_A_POSER;PRISE;MASSE;RAIL;COLLECTEUR;RENVOI"

' --- Format du paquet attendu
Public Const FORMAT_PAQUET As String = "paquet-see/1"

' --- Etat de la connexion
Public gApp As Object                 ' l'objet Application (ou SeeAutomation) de SEE
Public gStrategie As String           ' la stratégie de connexion qui a marché
Public gEstAutomation As Boolean      ' Vrai : connecté à la coclasse SeeAutomation (ni GetProject, ni le CreateObject d'Application)
Public gVersionAPI As Integer         ' 4 ou 5 (0 = pas encore déterminée)
Public gVersionLue As String          ' ApplicationVersion telle que lue
Public gSimulation As Boolean         ' Simulation = O : rien n'est écrit dans SEE
Public gSansDialogue As Boolean       ' Vrai : aucune boîte de dialogue (lancement par une autre macro)

' --- Contexte du journal
Public gEtape As String
Public gObjet As String
Public gNbErreurs As Long
Public gDerniereErreur As String

' --- Paquet chargé
Public gPaquet As Object              ' nom de feuille -> nombre de lignes lues
Public gIndexFolios As Object         ' "feuille|folio" -> Collection de lignes
Public gEntete As Object              ' feuille Paquet : Cle -> Valeur
Public gCheminPaquet As String

' --- Interne
Private mReglages As Object           ' Cle -> Valeur (cache)
Private mReglagesSignales As Object   ' les réglages non numériques déjà signalés au journal
Private mFeuilleJournal As Object
Private mLigneJournal As Long
Private mJournalDetail As Boolean
Private mModeCollection As Integer    ' 0 inconnu, 1 Item(1..n), 2 For Each, 3 Item(0..n-1)
' --- ce qui se note une fois PAR MACRO (remis à zéro par OuvrirJournal, qui vide le journal)
Private mModeCollectionDit As Boolean ' la manière de lire une collection est au journal
Private mFormesDites As Object        ' appel -> forme rendue par la V5, déjà au journal

' --- La conversion des coordonnées (PreparerConversion)
Private mEchelle As Double
Private mOrigineX As Double
Private mOrigineY As Double
Private mSensY As Double
Private mDecalX As Double
Private mDecalY As Double
Private mGrille As Double
Private mConversionPrete As Boolean

' --- Le paquet lu (ChargerPaquet) : une feuille = un tableau 1..n x 1..m
Private mV1 As Variant   ' Paquet
Private mV2 As Variant   ' Folios
Private mV3 As Variant   ' Blocs
Private mV4 As Variant   ' Connecteurs
Private mV5 As Variant   ' Bornes
Private mV6 As Variant   ' Fils
Private mV7 As Variant   ' Jonctions
Private mV8 As Variant   ' Legende
Private mColonnes(1 To 8) As Object
Private mNbLignes(1 To 8) As Long

Private Const FEUILLES_PAQUET As String = "Paquet;Folios;Blocs;Connecteurs;Bornes;Fils;Jonctions;Legende"

' ============================================================================
'  LE CLASSEUR : feuilles Reglages et Journal
' ============================================================================

' Crée (ou complète) les feuilles Reglages et Journal. Une clé déjà présente
' garde sa valeur : on peut relancer InitialiserClasseur sans rien perdre.
Public Sub InitialiserClasseur()
    Dim ws As Object, defs As Variant, i As Long, n As Long
    Dim existantes As Object, cle As String, ligne As Long, ajoutees As Long
    Set ws = FeuilleCreee(FEUILLE_REGLAGES, False)
    If CStr(ws.Cells(1, 1).Value) <> "Cle" Then
        ws.Cells(1, 1).Value = "Cle"
        ws.Cells(1, 2).Value = "Valeur"
        ws.Cells(1, 3).Value = "Aide"
        ws.Rows(1).Font.Bold = True
    End If
    ' la colonne Valeur au format Texte : « 1-5 » ou « 3;7 » saisis à la main ne
    ' deviennent pas des dates. Les valeurs y sont donc écrites SANS apostrophe :
    ' dans une cellule au format Texte, Excel garderait l'apostrophe dans la valeur.
    ws.Columns(2).NumberFormat = "@"
    Set existantes = NouveauDico()
    n = DerniereLigne(ws, 1)
    For i = 2 To n
        cle = Trim$(CStr(ws.Cells(i, 1).Value))
        If Len(cle) > 0 Then existantes.Item(cle) = i
    Next i
    defs = ReglagesParDefaut()
    ligne = n
    For i = LBound(defs) To UBound(defs)
        cle = CStr(defs(i)(0))
        If Not existantes.Exists(cle) Then
            ligne = ligne + 1
            ws.Cells(ligne, 1).Value = cle
            ws.Cells(ligne, 2).Value = CStr(defs(i)(1))
            ws.Cells(ligne, 3).Value = CStr(defs(i)(2))
            ajoutees = ajoutees + 1
        End If
    Next i
    ws.Columns(1).ColumnWidth = 30
    ws.Columns(2).ColumnWidth = 40
    ws.Columns(3).ColumnWidth = 110
    Set ws = FeuilleCreee(FEUILLE_JOURNAL, False)
    If CStr(ws.Cells(1, 1).Value) <> "Horodatage" Then EnteteJournal ws
    Set mReglages = Nothing
    Dialogue "Classeur prêt : " & ajoutees & " réglage(s) ajouté(s) dans la feuille " & _
        FEUILLE_REGLAGES & "." & vbCrLf & _
        "Commence par SondeApplication (lecture seule), puis remplis les réglages.", _
        vbInformation, "Pilote SEE"
End Sub

' La liste des réglages : Array(Cle, Valeur par défaut, Aide). Les valeurs par
' défaut sont prudentes : Simulation = O, tout en DESSIN, fils en DESSIN tant
' que TypeConnexion est vide.
Private Function ReglagesParDefaut() As Variant
    Dim r As Collection, nat As Variant, nom As String, modeleRepere As String
    Set r = New Collection
    ' --- Connexion
    r.Add Array("ProgID", "SEEExpert.Application;SEEExpert.SeeAutomation", _
        "Candidats séparés par ; - DÉDUITS du nom de la bibliothèque de types, NON vérifiés : mets ceux que diagnostic.ps1 a trouvés dans le registre.")
    r.Add Array("CLSID_Application", "{829E4B3B-B128-4999-A66A-6E76F0B4B22F};{A55015A3-0E82-4694-87D9-DB82B6620532}", _
        "CLSID de la coclasse Application : V5R2 puis V4R3 (lus dans les bibliothèques de types).")
    r.Add Array("CLSID_Automation", "{29E25405-2755-42DA-A17D-C07EC1A16CCB};{B0B9DD73-EE81-473F-9C3C-D8910C7E2D59}", _
        "CLSID de la coclasse SeeAutomation : V5R2 puis V4R3.")
    r.Add Array("LancerSEE", "O", _
        "O : si aucune instance ouverte n'est trouvée, essayer aussi GetObject(""new:{CLSID}"") puis CreateObject(ProgID), qui lancent SEE. N : seulement s'attacher à un SEE ouvert.")
    r.Add Array("VersionAPI", "auto", _
        "auto (ApplicationVersion 4.x = V4, sinon V5), V5 ou V4 : comment l'API rend les objets (valeur de retour en V5, paramètre de sortie en V4).")
    r.Add Array("Projet", "", _
        "Chemin du projet SEE à ouvrir. Vide = le projet ouvert dans SEE.")
    r.Add Array("MotDePasse", "", "Mot de passe du projet, s'il en a un.")
    ' --- Où écrire
    r.Add Array("Groupe", "", _
        "Nom du sous-groupe du groupe principal où créer les folios (créé s'il manque). Vide = le groupe principal.")
    r.Add Array("TypeFolio", "9", "Type de folio (SEESheetType) : 9 = schéma.")
    r.Add Array("Cartouche", "", _
        "Nom du cartouche SEE à poser sur chaque folio (voir la feuille Sonde_Application). Vide = celui que SEE met par défaut.")
    r.Add Array("NomFolio", "{Nom}", _
        "Modèle du nom du folio dans SEE : {Nom}, {Plan}, {Folio}, {Harness} du paquet.")
    r.Add Array("Remplacer", "N", _
        "N : un folio qui existe déjà dans SEE sous son nom final est sauté (il est complet : reprise après coupure). O : il est redessiné, et l'ancien n'est supprimé qu'une fois le nouveau fini.")
    r.Add Array("PrefixeProvisoire", "~", _
        "Un folio est créé sous le nom PrefixeProvisoire + nom, et ne prend son nom final qu'une fois dessiné en entier. Un folio resté sous le nom provisoire (arrêt, erreur, Excel fermé) est supprimé et redessiné à la relance. Si SEE refuse ce caractère, mets par exemple ZZ_.")
    r.Add Array("SauverTous", "10", "Sauver le projet tous les n folios (et toujours à la fin). 0 = seulement à la fin.")
    ' --- Coordonnées
    r.Add Array("Mode", "AJUSTER", _
        "AJUSTER : la feuille de l'Atelier (420 x 297 mm) est mise à l'échelle sur la zone de travail du cartouche, centrée. ECHELLE : x' = OrigineX + Echelle.x ; y' = OrigineY + SensY.Echelle.y.")
    r.Add Array("Echelle", "1", "Unités SEE par mm de l'Atelier (mode ECHELLE). Si l'unité de SEE est le pouce : 0,03937.")
    r.Add Array("OrigineX", "0", "Coordonnée X dans SEE du coin HAUT GAUCHE de la zone (à mesurer avec EssaiDessin).")
    r.Add Array("OrigineY", "0", "Coordonnée Y dans SEE du coin HAUT GAUCHE de la zone (à mesurer avec EssaiDessin).")
    r.Add Array("SensY", "1", "1 si l'axe Y de SEE descend (comme l'écran), -1 s'il monte (à mesurer avec EssaiDessin).")
    r.Add Array("Grille", "0", "Pas de la grille de SEE, dans l'unité de SEE (0 = aucun recalage sur la grille).")
    r.Add Array("TailleTexte", "2.5", "Hauteur des textes dessinés, en mm de l'Atelier (multipliée par l'échelle).")
    ' --- Repères (sémantique de ISEETag.SetManual non établie : à régler après la sonde)
    r.Add Array("Repere.Label", "{Repere}", _
        "Ce qui est passé en A_Label de SetManual pour un symbole, un connecteur, un bornier. Jetons : {Repere} {Lettre} {Code} {Num}.")
    r.Add Array("Repere.Racine", "", "Ce qui est passé en A_Root de SetManual (vide par défaut). Mêmes jetons ; regarde Tag/Label/Root/Order dans Sonde_Folio.")
    r.Add Array("Repere.Ordre", "0", "Ce qui est passé en A_Order de SetManual (un entier). Mêmes jetons ({Num} = le premier nombre du repère).")
    r.Add Array("Fil.Label", "{Fil}", "A_Label du repère manuel d'un fil (numéro du fil). Jetons : {Fil} {Num}.")
    r.Add Array("Fil.Racine", "", "A_Root du repère manuel d'un fil.")
    r.Add Array("Fil.Ordre", "0", "A_Order du repère manuel d'un fil.")
    ' --- Symboles, une série par nature
    For Each nat In Split(NATURES, ";")
        nom = CStr(nat)
        If nom = "EQUIPEMENT" Or nom = "PRISE" Then modeleRepere = "{Repere}-{Lettre}" Else modeleRepere = "{Repere}"
        r.Add Array(nom & ".Mode", "DESSIN", _
            "BOITE, BROCHE, BORNIER, SYMBOLE, DESSIN ou IGNORER : comment poser un bloc " & nom & ". DESSIN = rectangle + textes, sans symbole.")
        r.Add Array(nom & ".Famille", "", "Famille SEE du symbole du corps (BOITE, SYMBOLE ; en BROCHE / BORNIER : vide = corps dessiné).")
        r.Add Array(nom & ".Symbole", "", "Nom SEE du symbole du corps (voir Sonde_Symboles).")
        r.Add Array(nom & ".BrocheFamille", "", "Famille SEE du symbole de broche (BROCHE) ou de borne (BORNIER).")
        r.Add Array(nom & ".BrocheSymbole", "", "Nom SEE du symbole de broche (BROCHE) ou de borne (BORNIER).")
        r.Add Array(nom & ".AngleG", "0", "Angle (degrés) d'un symbole de broche / borne d'un flanc gauche (G) ou centré (C) ; en mode SYMBOLE, d'un symbole dont le fil arrive par la gauche (colonne Sens = G, ou Sens vide).")
        r.Add Array(nom & ".AngleD", "0", "Angle (degrés) d'un symbole de broche / borne d'un flanc droit (D) ; en mode SYMBOLE, d'un symbole dont le fil arrive par la droite (Sens = D).")
        r.Add Array(nom & ".AngleH", "0", "Mode SYMBOLE : angle (degrés) d'un symbole dont le fil arrive par le haut (Sens = H).")
        r.Add Array(nom & ".AngleB", "0", "Mode SYMBOLE : angle (degrés) d'un symbole dont le fil arrive par le bas (Sens = B).")
        r.Add Array(nom & ".ModeleRepere", modeleRepere, _
            "Repère du connecteur (BROCHE) ou du bornier (BORNIER) : {Repere}, {Lettre}.")
    Next nat
    ' --- Fils
    r.Add Array("TypeConnexion", "", _
        "La chaîne passée à AddWireConnection (inconnue : voir SignalType dans Sonde_Folio). VIDE = les fils sont tracés en DESSIN (traits).")
    r.Add Array("Cable", "N", "O : un objet câble est créé et passé à AddWireConnection ; N : rien (Nothing).")
    r.Add Array("Jauge", "N", "O : la jauge du paquet est écrite dans le câble (Gauge) ; N : non.")
    r.Add Array("Pontages", "TRACER", _
        "Un pontage de barrette (Shunt = O) n'a pas de tracé dans le paquet. TRACER : une ligne d'une borne à l'autre (le fil et son numéro existent dans SEE) ; IGNORER : non dessiné (journalisé).")
    r.Add Array("Recaler", "O", _
        "O : après la pose, chaque broche / borne est déplacée pour que son point de connexion tombe sur son point de pose (voir PoseBroche).")
    r.Add Array("PoseBroche", "CONTACT", _
        "CONTACT : une broche, une borne ou un symbole simple se pose sur le contact de sa borne (colonnes CX, CY du paquet : le bord de la pièce, de la fiche, de l'embase, de la pastille, le trait de la masse) et le fil est prolongé jusque-là (l'amorce de l'Atelier). ACCROCHE : sur le point d'accroche (X, Y), au bord du bloc de l'Atelier.")
    r.Add Array("Tolerance", "0.05", "Écart (unités SEE) au-delà duquel un recalage ou un bout de fil est signalé dans le journal.")
    ' --- Essai
    r.Add Array("Folios", "1", "Folios du paquet à dessiner : 1, 1-5, 3;7 ou * pour tous.")
    r.Add Array("PasAPas", "O", "O : une boîte de dialogue après chaque étape d'un folio (pour un essai).")
    r.Add Array("Simulation", "O", "O : RIEN n'est écrit dans SEE, le journal dit ce qui serait fait. Passe à N seulement après un essai relu.")
    r.Add Array("FolioEssai", "ESSAI_PILOTE", "Nom du folio créé par EssaiDessin et EssaiSymboles.")
    r.Add Array("SondeFolio", "", "Nom du folio lu par SondeFolio. Vide = le folio de la vue active.")
    r.Add Array("Journal", "DETAIL", "DETAIL : chaque appel COM est journalisé ; NORMAL : étapes, erreurs et bilans seulement (pour les 800 folios).")
    ReglagesParDefaut = CollectionEnTableau(r)
End Function

Private Function CollectionEnTableau(ByVal c As Collection) As Variant
    Dim t() As Variant, i As Long
    If c.Count = 0 Then
        CollectionEnTableau = Array()
        Exit Function
    End If
    ReDim t(0 To c.Count - 1)
    For i = 1 To c.Count
        t(i - 1) = c(i)
    Next i
    CollectionEnTableau = t
End Function

' Relit la feuille Reglages (à appeler au début de chaque macro).
Public Sub ChargerReglages()
    Dim ws As Object, i As Long, n As Long, cle As String, v As String
    Set mReglages = NouveauDico()
    Set mReglagesSignales = Nothing
    Set ws = FeuilleExistante(FEUILLE_REGLAGES)
    If ws Is Nothing Then Exit Sub
    n = DerniereLigne(ws, 1)
    For i = 2 To n
        cle = Trim$(CStr(ws.Cells(i, 1).Value))
        If Len(cle) > 0 Then
            v = Trim$(CStr(ws.Cells(i, 2).Value))
            ' une apostrophe de tête n'est jamais une valeur : c'est le préfixe
            ' « texte » d'Excel, resté dans une cellule au format Texte
            If Left$(v, 1) = "'" Then v = Trim$(Mid$(v, 2))
            mReglages.Item(cle) = v
        End If
    Next i
    gSimulation = (UCase$(Reglage("Simulation", "O")) <> "N")
    mJournalDetail = (UCase$(Reglage("Journal", "DETAIL")) <> "NORMAL")
End Sub

' La valeur d'un réglage (texte), ou la valeur par défaut s'il est absent ou vide.
Public Function Reglage(ByVal cle As String, Optional ByVal defaut As String = "") As String
    If mReglages Is Nothing Then ChargerReglages
    Reglage = defaut
    If mReglages.Exists(cle) Then
        If Len(mReglages.Item(cle)) > 0 Then Reglage = mReglages.Item(cle)
    End If
End Function

' Un réglage numérique, virgule ou point (insensible à la langue du poste). Vide :
' la valeur par défaut ; pas un nombre : la valeur par défaut, et le journal le dit.
Public Function ReglageNombre(ByVal cle As String, ByVal defaut As Double) As Double
    Dim s As String, x As Double
    s = Reglage(cle, "")
    ReglageNombre = defaut
    If Len(s) = 0 Then Exit Function
    If LireNombre(s, x) Then
        ReglageNombre = x
    Else
        If mReglagesSignales Is Nothing Then Set mReglagesSignales = NouveauDico()
        If Not mReglagesSignales.Exists(cle) Then
            mReglagesSignales.Add cle, True
            Journal "Réglages", cle, "", "« " & s & " » n'est pas un nombre : valeur par défaut " & NombreTexte(defaut), -1, "réglage non numérique"
        End If
    End If
End Function

' Un entier (Long) lu dans un réglage : la valeur par défaut s'il est vide,
' s'il n'est pas un nombre, ou s'il ne tient pas dans un Long.
Public Function ReglageEntier(ByVal cle As String, ByVal defaut As Long) As Long
    ReglageEntier = EnLong(ReglageNombre(cle, defaut), defaut)
End Function

Public Function ReglageOui(ByVal cle As String, Optional ByVal defaut As String = "N") As Boolean
    ReglageOui = (UCase$(Left$(Reglage(cle, defaut), 1)) = "O")
End Function

' ============================================================================
'  LE JOURNAL
' ============================================================================

Private Sub EnteteJournal(ByVal ws As Object)
    ws.Cells(1, 1).Value = "Horodatage"
    ws.Cells(1, 2).Value = "Etape"
    ws.Cells(1, 3).Value = "Objet"
    ws.Cells(1, 4).Value = "Appel COM"
    ws.Cells(1, 5).Value = "Resultat"
    ws.Cells(1, 6).Value = "Err.Number"
    ws.Cells(1, 7).Value = "Err.Description"
    ws.Rows(1).Font.Bold = True
    ws.Columns(1).ColumnWidth = 20
    ws.Columns(2).ColumnWidth = 18
    ws.Columns(3).ColumnWidth = 28
    ws.Columns(4).ColumnWidth = 50
    ws.Columns(5).ColumnWidth = 60
    ws.Columns(7).ColumnWidth = 60
End Sub

' Vide le journal (au début d'une macro) et remet les compteurs à zéro.
Public Sub OuvrirJournal(ByVal titre As String)
    Dim ws As Object
    Set ws = FeuilleCreee(FEUILLE_JOURNAL, True)
    EnteteJournal ws
    Set mFeuilleJournal = ws
    mLigneJournal = 1
    gNbErreurs = 0
    gDerniereErreur = ""
    ' le journal est vidé : ce qui se note « une fois » se notera à nouveau
    mModeCollectionDit = False
    Set mFormesDites = Nothing
    ChargerReglages
    Journal "Début", titre, "", "Simulation = " & IIf(gSimulation, "O", "N") & _
        " ; classeur " & ThisWorkbook.Name
End Sub

' Fixe l'étape et l'objet courants (repris par chaque ligne du journal).
Public Sub Contexte(ByVal etape As String, Optional ByVal objet As String = "")
    gEtape = etape
    gObjet = objet
End Sub

' Une ligne de journal, toujours écrite.
Public Sub Journal(ByVal etape As String, ByVal objet As String, ByVal appel As String, _
        ByVal resultat As String, Optional ByVal numErr As Long = 0, Optional ByVal descErr As String = "")
    Dim ws As Object
    On Error GoTo Fin
    If mFeuilleJournal Is Nothing Then
        Set mFeuilleJournal = FeuilleCreee(FEUILLE_JOURNAL, False)
        If CStr(mFeuilleJournal.Cells(1, 1).Value) <> "Horodatage" Then EnteteJournal mFeuilleJournal
        mLigneJournal = DerniereLigne(mFeuilleJournal, 1)
    End If
    Set ws = mFeuilleJournal
    mLigneJournal = mLigneJournal + 1
    If mLigneJournal > 1048000 Then Exit Sub
    If mLigneJournal = 1048000 Then
        ' la feuille est presque pleine : on le dit une fois, puis on se tait
        etape = "JOURNAL PLEIN"
        resultat = "plus rien n'est noté : relance avec le réglage Journal = NORMAL"
        numErr = -1
        descErr = "journal plein"
    End If
    ws.Cells(mLigneJournal, 1).Value = "'" & Format$(Now, "yyyy-mm-dd hh:mm:ss")
    ws.Cells(mLigneJournal, 2).Value = "'" & Left$(etape, 250)
    ws.Cells(mLigneJournal, 3).Value = "'" & Left$(objet, 250)
    ws.Cells(mLigneJournal, 4).Value = "'" & Left$(appel, 1000)
    ws.Cells(mLigneJournal, 5).Value = "'" & Left$(resultat, 1000)
    If numErr <> 0 Then
        ws.Cells(mLigneJournal, 6).Value = numErr
        ws.Cells(mLigneJournal, 7).Value = "'" & Left$(descErr, 1000)
    End If
Fin:
End Sub

' Une boîte de dialogue (MsgBox). Si gSansDialogue : rien ne s'affiche, le
' message va au journal et la réponse est celle qui ne détruit rien (OK, ou
' Non pour une question Oui / Non / Annuler).
Public Function Dialogue(ByVal message As String, ByVal boutons As Long, ByVal titre As String) As Long
    If gSansDialogue Then
        Journal "Dialogue", titre, "", Replace(message, vbCrLf, " / ")
        If (boutons And 7) = vbYesNoCancel Or (boutons And 7) = vbYesNo Then
            Dialogue = vbNo
        Else
            Dialogue = vbOK
        End If
    Else
        Dialogue = MsgBox(message, boutons, titre)
    End If
End Function

' Une ligne de détail (appel COM réussi), écrite seulement si Journal = DETAIL.
Public Sub JournalCOM(ByVal appel As String, ByVal resultat As String)
    If mJournalDetail Then Journal gEtape, gObjet, appel, resultat
End Sub

' Une erreur d'appel COM : toujours écrite, comptée, et gardée dans
' gDerniereErreur. À appeler dans le gestionnaire d'erreur, AVANT tout autre
' appel qui remettrait Err à zéro (on passe donc Err.Number et Err.Description).
Public Sub JournalErreur(ByVal appel As String, ByVal numErr As Long, ByVal descErr As String)
    gNbErreurs = gNbErreurs + 1
    gDerniereErreur = appel & " : " & numErr & " " & descErr
    Journal gEtape, gObjet, appel, "ERREUR", numErr, descErr
End Sub

' Ce que ferait un appel qui écrit, en Simulation.
Public Sub JournalSimulation(ByVal appel As String, ByVal detail As String)
    Journal gEtape, gObjet, appel, "SIMULATION (non appelé) " & detail
End Sub

' ============================================================================
'  OUTILS DE CLASSEUR
' ============================================================================

' Un dictionnaire aux clés INSENSIBLES à la casse : pour les noms que l'on
' tape ou que l'on cherche (réglages, en-têtes de colonnes, clés du paquet).
Public Function NouveauDico() As Object
    Set NouveauDico = DicoAvecComparaison(1)    ' vbTextCompare
End Function

' Un dictionnaire aux clés SENSIBLES à la casse : pour les données (une borne
' « a » n'est pas la borne « A » d'un connecteur circulaire, un repère, un
' bloc, un nom de folio, un symbole).
Public Function NouveauDicoExact() As Object
    Set NouveauDicoExact = DicoAvecComparaison(0)   ' vbBinaryCompare
End Function

Private Function DicoAvecComparaison(ByVal mode As Long) As Object
    Dim d As Object
    Set d = CreateObject("Scripting.Dictionary")
    d.CompareMode = mode   ' avant toute clé
    Set DicoAvecComparaison = d
End Function

Public Function FeuilleExistante(ByVal nom As String) As Object
    Dim ws As Object
    Set FeuilleExistante = Nothing
    For Each ws In ThisWorkbook.Worksheets
        If StrComp(ws.Name, nom, vbTextCompare) = 0 Then
            Set FeuilleExistante = ws
            Exit Function
        End If
    Next ws
End Function

' La feuille nommée, créée si besoin (à la fin du classeur) ; vidée si demandé.
Public Function FeuilleCreee(ByVal nom As String, ByVal vider As Boolean) As Object
    Dim ws As Object
    Set ws = FeuilleExistante(nom)
    If ws Is Nothing Then
        Set ws = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        ws.Name = nom
    ElseIf vider Then
        ws.Cells.Clear
    End If
    Set FeuilleCreee = ws
End Function

' Le numéro de la dernière ligne non vide d'une colonne (1 si la feuille est vide).
Public Function DerniereLigne(ByVal ws As Object, ByVal colonne As Long) As Long
    Dim n As Long
    n = ws.Cells(ws.Rows.Count, colonne).End(-4162).Row   ' -4162 = xlUp
    If n < 1 Then n = 1
    DerniereLigne = n
End Function

' Écrit une ligne de valeurs (un tableau Array(...)) à partir de la colonne 1.
Public Sub EcrireLigne(ByVal ws As Object, ByVal ligne As Long, ByVal valeurs As Variant)
    Dim i As Long, v As Variant
    For i = LBound(valeurs) To UBound(valeurs)
        v = valeurs(i)
        If VarType(v) = vbString Then
            ws.Cells(ligne, i - LBound(valeurs) + 1).Value = "'" & Left$(CStr(v), 32000)
        Else
            ws.Cells(ligne, i - LBound(valeurs) + 1).Value = v
        End If
    Next i
End Sub

' Un nombre écrit avec un point décimal, quelle que soit la langue du poste.
Public Function NombreTexte(ByVal x As Double) As String
    Dim s As String
    s = Trim$(Str$(Round(x, 4)))
    If Left$(s, 1) = "." Then s = "0" & s
    If Left$(s, 2) = "-." Then s = "-0" & Mid$(s, 2)
    NombreTexte = s
End Function

' Un Variant rendu par Excel ou par SEE, converti en Double si c'est un
' nombre, ou un texte qui EST un nombre (« 12 », « -0,5 », « 1e-3 »). Faux
' si vide, si le texte n'est pas un nombre (« Inch », « 12 mm ») ou s'il
' déborde.
Public Function LireNombre(ByVal v As Variant, ByRef x As Double) As Boolean
    Dim s As String
    On Error GoTo Echec
    LireNombre = False
    x = 0
    If IsObject(v) Then Exit Function
    If IsEmpty(v) Or IsNull(v) Or IsError(v) Then Exit Function
    Select Case VarType(v)
        Case vbDouble, vbSingle, vbInteger, vbLong, vbCurrency, vbDecimal, vbByte, 20   ' 20 = vbLongLong (Excel 64 bits)
            x = CDbl(v)
            LireNombre = True
        Case vbBoolean
            x = IIf(v, 1, 0)
            LireNombre = True
        Case vbString
            s = Replace(Trim$(v), ",", ".")
            If EstNombreTexte(s) Then
                x = Val(s)
                LireNombre = True
            End If
    End Select
    Exit Function
Echec:
    x = 0
    LireNombre = False
End Function

' Vrai si s est un nombre écrit simplement, avec un point décimal : un signe,
' des chiffres, un point, un exposant (« -12 », « 0.05 », « 1e-3 »).
Private Function EstNombreTexte(ByVal s As String) As Boolean
    Dim i As Long, c As String, chiffres As Long, point As Boolean, expo As Boolean, debut As Long
    EstNombreTexte = False
    If Len(s) = 0 Then Exit Function
    debut = 1
    For i = 1 To Len(s)
        c = Mid$(s, i, 1)
        If c >= "0" And c <= "9" Then
            chiffres = chiffres + 1
        ElseIf c = "+" Or c = "-" Then
            If i <> debut Then Exit Function
        ElseIf c = "." Then
            If point Or expo Then Exit Function
            point = True
        ElseIf c = "e" Or c = "E" Then
            If expo Or chiffres = 0 Then Exit Function
            expo = True
            chiffres = 0
            debut = i + 1
        Else
            Exit Function
        End If
    Next i
    EstNombreTexte = (chiffres > 0)
End Function

' Un nombre (ou un texte qui est un nombre) en Long, arrondi : la valeur par
' défaut s'il n'est pas un nombre ou s'il ne tient pas dans un Long
' (au-delà de 2 147 483 647, CLng lèverait l'erreur 6).
Public Function EnLong(ByVal v As Variant, ByVal defaut As Long) As Long
    Dim x As Double
    EnLong = defaut
    If Not LireNombre(v, x) Then Exit Function
    If x >= 2147483647.5 Or x < -2147483648.5 Then Exit Function
    EnLong = CLng(x)
End Function

' Un Variant quelconque en texte lisible (pour la sonde et le journal).
Public Function EnTexte(ByVal v As Variant) As String
    Dim x As Double
    If IsObject(v) Then
        If v Is Nothing Then
            EnTexte = "Nothing"
        Else
            EnTexte = "[objet " & TypeName(v) & "]"
        End If
    ElseIf IsArray(v) Then
        EnTexte = "[tableau]"
    ElseIf IsEmpty(v) Then
        EnTexte = ""
    ElseIf IsNull(v) Then
        EnTexte = "Null"
    ElseIf IsError(v) Then
        EnTexte = "#Erreur"
    ElseIf VarType(v) = vbString Then
        EnTexte = CStr(v)
    ElseIf LireNombre(v, x) Then
        If VarType(v) = vbBoolean Then
            EnTexte = IIf(v, "Vrai", "Faux")
        Else
            EnTexte = NombreTexte(x)
        End If
    Else
        EnTexte = CStr(v)
    End If
End Function

' Lit une propriété simple (sans argument) d'un objet COM par son nom, sans
' jamais s'arrêter : rend la valeur en texte, ou « #ERR n : description ».
Public Function LireProp(ByVal obj As Object, ByVal nom As String) As String
    Dim v As Variant
    On Error GoTo Echec
    If obj Is Nothing Then
        LireProp = "#ERR objet absent"
        Exit Function
    End If
    v = CallByName(obj, nom, VbGet)
    LireProp = EnTexte(v)
    Exit Function
Echec:
    LireProp = "#ERR " & Err.Number & " : " & Err.Description
End Function

' Même chose, mais rend la valeur brute (Variant) et dit si la lecture a marché.
Public Function LirePropValeur(ByVal obj As Object, ByVal nom As String, ByRef v As Variant) As Boolean
    On Error GoTo Echec
    v = Empty
    If obj Is Nothing Then Exit Function
    v = CallByName(obj, nom, VbGet)
    LirePropValeur = True
    Exit Function
Echec:
    v = "#ERR " & Err.Number & " : " & Err.Description
    LirePropValeur = False
End Function

' Ecrit une propriété (Let) d'un objet COM ; journalise. Rend Vrai si c'est fait.
Public Function EcrireProp(ByVal obj As Object, ByVal nom As String, ByVal valeur As Variant) As Boolean
    On Error GoTo Echec
    CallByName obj, nom, VbLet, valeur
    JournalCOM "." & nom & " = " & EnTexte(valeur), "ok"
    EcrireProp = True
    Exit Function
Echec:
    JournalErreur "." & nom & " = " & EnTexte(valeur), Err.Number, Err.Description
    EcrireProp = False
End Function

' ============================================================================
'  LA CONNEXION A SEE
' ============================================================================

' Se rattache à SEE. Stratégies, dans l'ordre, chacune journalisée :
'   1. GetObject(, ProgID)           pour chaque ProgID candidat (instance ouverte)
'   2. GetObject(, "{CLSID}")        Application puis SeeAutomation (V5R2 puis V4R3)
'   3. GetObject("new:{CLSID}")      nouvelle instance (si LancerSEE = O)
'   4. CreateObject(ProgID)          nouvelle instance (si LancerSEE = O)
' Garde l'objet dans gApp et la stratégie dans gStrategie ; fixe la version.
Public Function ConnecterSEE() As Boolean
    Dim progids As Variant, clsids As Collection, p As Variant, nom As String
    Dim o As Object, i As Long, nbApp As Long
    ConnecterSEE = False
    Contexte "Connexion", "SEE"
    If Not gApp Is Nothing Then
        If Left$(LireProp(gApp, "ApplicationName"), 4) <> "#ERR" Then
            ' la connexion est gardée, mais le réglage VersionAPI est relu :
            ' il a pu changer depuis la macro précédente
            If InStr(1, TypeName(gApp), "Automation", vbTextCompare) > 0 Then gEstAutomation = True
            Journal gEtape, gObjet, gStrategie, "connexion gardée de la macro précédente" & _
                IIf(gEstAutomation, " (coclasse SeeAutomation)", "")
            DeterminerVersion
            ConnecterSEE = True
            Exit Function
        End If
        Journal gEtape, gObjet, "ApplicationName", "l'objet gardé ne répond plus : nouvelle connexion"
        Set gApp = Nothing
    End If
    gEstAutomation = False
    progids = Split(Reglage("ProgID", ""), ";")
    ' les CLSID, Application d'abord ; nbApp : combien sont ceux d'Application
    Set clsids = New Collection
    For Each p In Split(Reglage("CLSID_Application", ""), ";")
        If Len(Trim$(p)) > 0 Then clsids.Add Trim$(p)
    Next p
    nbApp = clsids.Count
    For Each p In Split(Reglage("CLSID_Automation", ""), ";")
        If Len(Trim$(p)) > 0 Then clsids.Add Trim$(p)
    Next p
    ' 1. instance ouverte, par ProgID
    For Each p In progids
        nom = Trim$(CStr(p))
        If Len(nom) > 0 Then
            If EssayerGetObjectActif(nom, o) Then
                Set gApp = o
                gStrategie = "GetObject(, """ & nom & """)"
                gEstAutomation = (InStr(1, nom, "Automation", vbTextCompare) > 0)
                GoTo Connecte
            End If
        End If
    Next p
    ' 2. instance ouverte, par CLSID
    i = 0
    For Each p In clsids
        i = i + 1
        If EssayerGetObjectActif(CStr(p), o) Then
            Set gApp = o
            gStrategie = "GetObject(, """ & CStr(p) & """)"
            gEstAutomation = (i > nbApp)
            GoTo Connecte
        End If
    Next p
    If Not ReglageOui("LancerSEE", "O") Then
        Journal gEtape, gObjet, "", "aucune instance ouverte trouvée ; LancerSEE = N : on n'en lance pas"
        GoTo Rate
    End If
    ' 3. moniker new:{CLSID}
    i = 0
    For Each p In clsids
        i = i + 1
        If EssayerGetObjectNouveau(CStr(p), o) Then
            Set gApp = o
            gStrategie = "GetObject(""new:" & CStr(p) & """)"
            gEstAutomation = (i > nbApp)
            GoTo Connecte
        End If
    Next p
    ' 4. CreateObject(ProgID)
    For Each p In progids
        nom = Trim$(CStr(p))
        If Len(nom) > 0 Then
            If EssayerCreateObject(nom, o) Then
                Set gApp = o
                gStrategie = "CreateObject(""" & nom & """)"
                gEstAutomation = (InStr(1, nom, "Automation", vbTextCompare) > 0)
                GoTo Connecte
            End If
        End If
    Next p
Rate:
    Journal gEtape, gObjet, "", "ÉCHEC : aucune stratégie n'a marché (lance diagnostic.ps1 et corrige ProgID / CLSID)", -1, "connexion impossible"
    gNbErreurs = gNbErreurs + 1
    Exit Function
Connecte:
    ' la coclasse SeeAutomation : reconnue au candidat qui a marché (ProgID qui
    ' la nomme, CLSID de la liste CLSID_Automation) ou au TypeName de l'objet
    If InStr(1, TypeName(gApp), "Automation", vbTextCompare) > 0 Then gEstAutomation = True
    Journal gEtape, gObjet, gStrategie, "connecté : " & LireProp(gApp, "ApplicationName") & " " & _
        LireProp(gApp, "ApplicationVersion") & " (TypeName " & TypeName(gApp) & ")" & _
        IIf(gEstAutomation, " ; coclasse SeeAutomation : ni GetProject ni GetEnvironment, et son CreateObject " & _
        "n'a pas la signature de celui d'Application : le pilote ne peut pas dessiner par elle (la sonde peut lire)", "")
    DeterminerVersion
    ConnecterSEE = True
End Function

Private Function EssayerGetObjectActif(ByVal classe As String, ByRef o As Object) As Boolean
    On Error GoTo Echec
    Dim trouve As Boolean
    Set o = Nothing
    Set o = GetObject(, classe)
    trouve = Not (o Is Nothing)
    EssayerGetObjectActif = trouve
    Journal gEtape, gObjet, "GetObject(, """ & classe & """)", IIf(trouve, "ok", "Nothing")
    Exit Function
Echec:
    Journal gEtape, gObjet, "GetObject(, """ & classe & """)", "échec", Err.Number, Err.Description
    EssayerGetObjectActif = False
End Function

Private Function EssayerGetObjectNouveau(ByVal clsid As String, ByRef o As Object) As Boolean
    On Error GoTo Echec
    Dim trouve As Boolean
    Set o = Nothing
    Set o = GetObject("new:" & clsid)
    trouve = Not (o Is Nothing)
    EssayerGetObjectNouveau = trouve
    Journal gEtape, gObjet, "GetObject(""new:" & clsid & """)", IIf(trouve, "ok", "Nothing")
    Exit Function
Echec:
    Journal gEtape, gObjet, "GetObject(""new:" & clsid & """)", "échec", Err.Number, Err.Description
    EssayerGetObjectNouveau = False
End Function

Private Function EssayerCreateObject(ByVal progid As String, ByRef o As Object) As Boolean
    On Error GoTo Echec
    Dim trouve As Boolean
    Set o = Nothing
    Set o = CreateObject(progid)
    trouve = Not (o Is Nothing)
    EssayerCreateObject = trouve
    Journal gEtape, gObjet, "CreateObject(""" & progid & """)", IIf(trouve, "ok", "Nothing")
    Exit Function
Echec:
    Journal gEtape, gObjet, "CreateObject(""" & progid & """)", "échec", Err.Number, Err.Description
    EssayerCreateObject = False
End Function

' La version de l'API : forcée par le réglage VersionAPI (V4 / V5), sinon
' déduite de ApplicationVersion (« 4.x » = V4, tout le reste = V5).
Public Sub DeterminerVersion()
    Dim s As String, t As String
    s = UCase$(Trim$(Reglage("VersionAPI", "auto")))
    gVersionLue = LireProp(gApp, "ApplicationVersion")
    If s = "V4" Or s = "4" Then
        gVersionAPI = 4
    ElseIf s = "V5" Or s = "5" Then
        gVersionAPI = 5
    Else
        t = UCase$(Trim$(gVersionLue))
        If Left$(t, 1) = "V" Then t = Mid$(t, 2)
        If Left$(t, 1) = "4" Then gVersionAPI = 4 Else gVersionAPI = 5
    End If
    Journal "Connexion", "SEE", "ApplicationVersion", "« " & gVersionLue & " » ; réglage VersionAPI = " & s & _
        " ; API retenue : V" & gVersionAPI
End Sub

Public Function EstV4() As Boolean
    If gVersionAPI = 0 Then gVersionAPI = 5
    EstV4 = (gVersionAPI = 4)
End Function

' ============================================================================
'  LES COLLECTIONS DE SEE (ISEEObjectCollection)
' ============================================================================

' Les éléments d'une collection SEE dans une Collection VBA. Essaie For Each
' (_NewEnum), puis Item(i) de 1 à Count, puis de 0 à Count-1 ; la première
' manière qui marche est journalisée une fois.
Public Function ElementsDe(ByVal coll As Object) As Collection
    Dim res As Collection, n As Long, i As Long, v As Variant, ok As Boolean
    Set res = New Collection
    If coll Is Nothing Then
        Set ElementsDe = res
        Exit Function
    End If
    n = NombreDe(coll)
    ' 1. For Each (sauf si une autre manière a déjà marché)
    If mModeCollection = 0 Or mModeCollection = 2 Then
        If ParcourirParEnum(coll, res) Then
            If res.Count > 0 Or n <= 0 Then
                NoterModeCollection 2
                Set ElementsDe = res
                Exit Function
            End If
        End If
        Set res = New Collection
    End If
    If n <= 0 Then
        Set ElementsDe = res
        Exit Function
    End If
    ' 2. Item(1) à Item(Count)
    ok = True
    For i = 1 To n
        If Not EssayerItem(coll, i, v) Then
            ok = False
            Exit For
        End If
        res.Add v
    Next i
    If ok Then
        NoterModeCollection 1
        Set ElementsDe = res
        Exit Function
    End If
    ' 3. Item(0) à Item(Count - 1)
    Set res = New Collection
    ok = True
    For i = 0 To n - 1
        If Not EssayerItem(coll, i, v) Then
            ok = False
            Exit For
        End If
        res.Add v
    Next i
    If ok Then
        NoterModeCollection 3
    Else
        Journal gEtape, gObjet, "Collection.Item", "ni For Each ni Item(1..n) ni Item(0..n-1) n'ont marché (Count = " & n & ")", -1, "collection illisible"
    End If
    Set ElementsDe = res
End Function

' Note au journal, une fois par macro, la manière qui lit les collections.
Private Sub NoterModeCollection(ByVal m As Integer)
    If Not mModeCollectionDit Then
        mModeCollectionDit = True
        Journal "Collections", "", Choose(m, "Item(1..Count)", "For Each", "Item(0..Count-1)"), _
            "manière qui marche pour lire une collection SEE"
    End If
    mModeCollection = m
End Sub

Private Function ParcourirParEnum(ByVal coll As Object, ByVal res As Collection) As Boolean
    Dim v As Variant
    On Error GoTo Echec
    For Each v In coll
        res.Add v
    Next v
    ParcourirParEnum = True
    Exit Function
Echec:
    ParcourirParEnum = False
End Function

Private Function EssayerItem(ByVal coll As Object, ByVal i As Long, ByRef v As Variant) As Boolean
    Dim o As Object
    On Error GoTo Echec
    Set o = coll.Item(i)
    Set v = o
    EssayerItem = Not (o Is Nothing)
    Exit Function
Echec:
    EssayerItem = False
End Function

' Count d'une collection SEE (-1 si illisible).
Public Function NombreDe(ByVal coll As Object) As Long
    On Error GoTo Echec
    NombreDe = -1
    If coll Is Nothing Then Exit Function
    NombreDe = CLng(coll.Count)
    Exit Function
Echec:
    NombreDe = -1
End Function

' ============================================================================
'  LA COUCHE D'ADAPTATION V5 / V4
'  Chaque fonction fait UN appel COM qui rend un objet. V5 : Set x = obj.M(...)
'  V4 : obj.M ..., x (x variable Object passée par référence : jamais entre
'  parenthèses, qui la passeraient par valeur). En cas d'erreur : Nothing, et
'  une ligne ERREUR au journal. Aucune n'écrit dans SEE.
' ============================================================================

Private Sub NoterAppel(ByVal appel As String, ByVal o As Object)
    If o Is Nothing Then
        JournalCOM appel, "Nothing"
    Else
        JournalCOM appel, "ok (" & TypeName(o) & ")"
    End If
End Sub

' Application.CreateObject(type) : un objet SEE vierge (point, symbole, repère...).
' Ne touche pas au projet : l'objet n'existe qu'en mémoire tant qu'on ne l'ajoute pas.
Public Function NouvelObjet(ByVal typeObjet As Long) As Object
    Dim o As Object
    Set NouvelObjet = Nothing
    If gEstAutomation Then
        ' SeeAutomation.CreateObject a un paramètre de sortie de plus (V5 :
        ' type, objet ; V4 : type, ?, objet) dont le rôle n'est pas établi
        JournalErreur "CreateObject(" & typeObjet & ")", -1, "coclasse SeeAutomation : signature de CreateObject non établie, rien n'est créé"
        Exit Function
    End If
    On Error GoTo Echec
    If EstV4() Then
        gApp.CreateObject typeObjet, o
    Else
        Set o = gApp.CreateObject(typeObjet)
    End If
    Set NouvelObjet = o
    NoterAppel "CreateObject(" & typeObjet & ")", o
    Exit Function
Echec:
    JournalErreur "CreateObject(" & typeObjet & ")", Err.Number, Err.Description
    Set NouvelObjet = Nothing
End Function

' Un SEEPoint aux coordonnées SEE données.
Public Function NouveauPoint(ByVal x As Double, ByVal y As Double) As Object
    Dim p As Object
    Set p = NouvelObjet(OBJ_POINT)
    If p Is Nothing Then
        Set NouveauPoint = Nothing
        Exit Function
    End If
    On Error GoTo Echec
    p.X = x
    p.Y = y
    Set NouveauPoint = p
    Exit Function
Echec:
    JournalErreur "SEEPoint.X/Y = " & NombreTexte(x) & " ; " & NombreTexte(y), Err.Number, Err.Description
    Set NouveauPoint = Nothing
End Function

' Le projet : celui ouvert dans SEE, ou celui du réglage Projet, ouvert en
' lecture seule si lectureSeule (la sonde, la simulation). Un projet ouvert
' par la macro reste ouvert dans SEE, et le journal le dit.
' Coclasse SeeAutomation : elle n'a pas de GetProject, et son OpenProject n'a
' pas de paramètre « lecture seule » (V5 : chemin, mot de passe ; V4 : chemin,
' mot de passe, projet en sortie) : en lecture seule, elle n'ouvre rien.
Public Function SEE_Projet(Optional ByVal lectureSeule As Boolean = False) As Object
    Dim prj As Object, chemin As String, mdp As String
    chemin = Reglage("Projet", "")
    mdp = Reglage("MotDePasse", "")
    If gEstAutomation Then
        Set SEE_Projet = Nothing
        If Len(chemin) = 0 Then
            Journal gEtape, "projet", "", "coclasse SeeAutomation : pas de GetProject ; il faudrait le réglage Projet", -1, "pas de projet"
            Exit Function
        End If
        If lectureSeule Then
            Journal gEtape, "projet", "", "coclasse SeeAutomation : son OpenProject n'ouvre pas en lecture seule, le projet n'est donc " & _
                "PAS ouvert ici (connecte-toi à la coclasse Application : réglages ProgID / CLSID_Application)", -1, "pas de projet"
            Exit Function
        End If
        On Error GoTo EchecOpen
        If EstV4() Then
            gApp.OpenProject chemin, mdp, prj
        Else
            Set prj = gApp.OpenProject(chemin, mdp)
        End If
        On Error GoTo 0
        Journal gEtape, "projet", "SeeAutomation.OpenProject(""" & chemin & """)", IIf(prj Is Nothing, "Nothing", _
            "ouvert par la macro, en écriture ; il reste ouvert dans SEE")
        Set SEE_Projet = prj
        Exit Function
    End If
    On Error GoTo EchecGet
    If EstV4() Then
        gApp.GetProject prj
    Else
        Set prj = gApp.GetProject()
    End If
    NoterAppel "GetProject()", prj
SuiteGet:
    On Error GoTo EchecOpen
    If Len(chemin) > 0 Then
        If Not prj Is Nothing Then
            If StrComp(LireProp(prj, "Name"), DernierNom(chemin), vbTextCompare) = 0 Then
                Set SEE_Projet = prj
                Exit Function
            End If
        End If
        Set prj = Nothing
        If EstV4() Then
            gApp.OpenProject chemin, mdp, prj, lectureSeule
        Else
            Set prj = gApp.OpenProject(chemin, mdp, lectureSeule)
        End If
        On Error GoTo 0
        Journal gEtape, "projet", "OpenProject(""" & chemin & """, lecture seule = " & IIf(lectureSeule, "O", "N") & ")", _
            IIf(prj Is Nothing, "Nothing", "ouvert par la macro" & IIf(lectureSeule, " en lecture seule", " EN ÉCRITURE") & _
            " ; il reste ouvert dans SEE")
    End If
    Set SEE_Projet = prj
    Exit Function
EchecGet:
    JournalErreur "GetProject()", Err.Number, Err.Description
    Set prj = Nothing
    Resume SuiteGet
EchecOpen:
    JournalErreur "OpenProject(""" & chemin & """)", Err.Number, Err.Description
    Set SEE_Projet = Nothing
End Function

Private Function DernierNom(ByVal chemin As String) As String
    Dim t As Variant, s As String
    s = Replace(chemin, "/", "\")
    If Right$(s, 1) = "\" Then s = Left$(s, Len(s) - 1)
    t = Split(s, "\")
    s = CStr(t(UBound(t)))
    If InStrRev(s, ".") > 0 Then s = Left$(s, InStrRev(s, ".") - 1)
    DernierNom = s
End Function

Public Function SEE_Environnement() As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        gApp.GetEnvironment o
    Else
        Set o = gApp.GetEnvironment()
    End If
    Set SEE_Environnement = o
    NoterAppel "GetEnvironment()", o
    Exit Function
Echec:
    JournalErreur "GetEnvironment()", Err.Number, Err.Description
    Set SEE_Environnement = Nothing
End Function

Public Function SEE_Workspace() As Object
    Dim o As Object
    On Error GoTo Echec
    Set o = gApp.Workspace
    Set SEE_Workspace = o
    NoterAppel "Workspace", o
    Exit Function
Echec:
    JournalErreur "Workspace", Err.Number, Err.Description
    Set SEE_Workspace = Nothing
End Function

Public Function SEE_VueActive() As Object
    Dim w As Object, o As Object
    Set SEE_VueActive = Nothing
    Set w = SEE_Workspace()
    If w Is Nothing Then Exit Function
    On Error GoTo Echec
    If EstV4() Then
        w.GetActiveView o
    Else
        Set o = w.GetActiveView()
    End If
    Set SEE_VueActive = o
    NoterAppel "Workspace.GetActiveView()", o
    Exit Function
Echec:
    JournalErreur "Workspace.GetActiveView()", Err.Number, Err.Description
End Function

' Ce que montre une vue (normalement le folio). En V4, le paramètre de sortie
' est déclaré « out object » (un VARIANT) : on passe donc un Variant.
Public Function SEE_ContenuVue(ByVal vue As Object) As Object
    Dim o As Object, v As Variant
    On Error GoTo Echec
    If EstV4() Then
        vue.GetContent v
        If IsObject(v) Then Set o = v
    Else
        Set o = vue.GetContent()
    End If
    Set SEE_ContenuVue = o
    NoterAppel "View.GetContent()", o
    Exit Function
Echec:
    JournalErreur "View.GetContent()", Err.Number, Err.Description
    Set SEE_ContenuVue = Nothing
End Function

Public Function SEE_SelectionVue(ByVal vue As Object) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        vue.GetObjectsFromSelection o
    Else
        Set o = vue.GetObjectsFromSelection()
    End If
    Set SEE_SelectionVue = o
    NoterAppel "View.GetObjectsFromSelection()", o
    Exit Function
Echec:
    JournalErreur "View.GetObjectsFromSelection()", Err.Number, Err.Description
    Set SEE_SelectionVue = Nothing
End Function

Public Function SEE_GroupePrincipal(ByVal prj As Object) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        prj.GetMainGroup o
    Else
        Set o = prj.GetMainGroup()
    End If
    Set SEE_GroupePrincipal = o
    NoterAppel "Project.GetMainGroup()", o
    Exit Function
Echec:
    JournalErreur "Project.GetMainGroup()", Err.Number, Err.Description
    Set SEE_GroupePrincipal = Nothing
End Function

Public Function SEE_SousGroupes(ByVal grp As Object) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        grp.GetSubGroupCollection o
    Else
        Set o = grp.GetSubGroupCollection()
    End If
    Set SEE_SousGroupes = o
    NoterAppel "Group.GetSubGroupCollection()", o
    Exit Function
Echec:
    JournalErreur "Group.GetSubGroupCollection()", Err.Number, Err.Description
    Set SEE_SousGroupes = Nothing
End Function

Public Function SEE_SousGroupe(ByVal grp As Object, ByVal nom As String) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        grp.GetSubGroupByName nom, o
    Else
        Set o = grp.GetSubGroupByName(nom)
    End If
    Set SEE_SousGroupe = o
    NoterAppel "Group.GetSubGroupByName(""" & nom & """)", o
    Exit Function
Echec:
    JournalErreur "Group.GetSubGroupByName(""" & nom & """)", Err.Number, Err.Description
    Set SEE_SousGroupe = Nothing
End Function

' Le folio d'un groupe par son nom. Vrai si GetSheetByName a répondu : o est
' le folio, ou Nothing s'il n'existe pas. Faux s'il a levé une erreur
' (numErr, descErr) : cela ne dit PAS que le folio est absent (SEE lève
' peut-être une erreur pour un folio absent, peut-être pour autre chose) ;
' à l'appelant de trancher autrement (la liste des folios du groupe).
Public Function SEE_FolioParNom(ByVal grp As Object, ByVal nom As String, ByRef o As Object, _
        ByRef numErr As Long, ByRef descErr As String) As Boolean
    Dim r As Object
    SEE_FolioParNom = False
    Set o = Nothing
    numErr = 0
    descErr = ""
    On Error GoTo Echec
    If EstV4() Then
        grp.GetSheetByName nom, r
    Else
        Set r = grp.GetSheetByName(nom)
    End If
    Set o = r
    SEE_FolioParNom = True
    NoterAppel "Group.GetSheetByName(""" & nom & """)", o
    Exit Function
Echec:
    numErr = Err.Number
    descErr = Err.Description
    Set o = Nothing
    SEE_FolioParNom = False
End Function

Public Function SEE_FoliosDuGroupe(ByVal grp As Object) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        grp.GetSheetCollection o
    Else
        Set o = grp.GetSheetCollection()
    End If
    Set SEE_FoliosDuGroupe = o
    NoterAppel "Group.GetSheetCollection()", o
    Exit Function
Echec:
    JournalErreur "Group.GetSheetCollection()", Err.Number, Err.Description
    Set SEE_FoliosDuGroupe = Nothing
End Function

Public Function SEE_TousLesFolios(ByVal prj As Object) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        prj.GetAllSheets o
    Else
        Set o = prj.GetAllSheets()
    End If
    Set SEE_TousLesFolios = o
    NoterAppel "Project.GetAllSheets()", o
    Exit Function
Echec:
    JournalErreur "Project.GetAllSheets()", Err.Number, Err.Description
    Set SEE_TousLesFolios = Nothing
End Function

' Les cartouches de l'environnement (deDuProjet = Faux) ou du projet (Vrai).
Public Function SEE_Cartouches(ByVal source As Object, ByVal deDuProjet As Boolean) As Object
    Dim o As Object, appel As String
    appel = IIf(deDuProjet, "Project", "Environment") & ".GetTitleBlockCollection()"
    On Error GoTo Echec
    If EstV4() Then
        source.GetTitleBlockCollection o
    Else
        Set o = source.GetTitleBlockCollection()
    End If
    Set SEE_Cartouches = o
    NoterAppel appel, o
    Exit Function
Echec:
    JournalErreur appel, Err.Number, Err.Description
    Set SEE_Cartouches = Nothing
End Function

Public Function SEE_CartoucheParNom(ByVal source As Object, ByVal nom As String) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        source.GetTitleBlockByName nom, o
    Else
        Set o = source.GetTitleBlockByName(nom)
    End If
    Set SEE_CartoucheParNom = o
    NoterAppel "GetTitleBlockByName(""" & nom & """)", o
    Exit Function
Echec:
    JournalErreur "GetTitleBlockByName(""" & nom & """)", Err.Number, Err.Description
    Set SEE_CartoucheParNom = Nothing
End Function

Public Function SEE_CartoucheDuFolio(ByVal sh As Object) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        sh.GetTitleBlock o
    Else
        Set o = sh.GetTitleBlock()
    End If
    Set SEE_CartoucheDuFolio = o
    NoterAppel "Sheet.GetTitleBlock()", o
    Exit Function
Echec:
    JournalErreur "Sheet.GetTitleBlock()", Err.Number, Err.Description
    Set SEE_CartoucheDuFolio = Nothing
End Function

Public Function SEE_PointPrimaire(ByVal tb As Object) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        tb.GetPrimaryCoordinates o
    Else
        Set o = tb.GetPrimaryCoordinates()
    End If
    Set SEE_PointPrimaire = o
    NoterAppel "TitleBlock.GetPrimaryCoordinates()", o
    Exit Function
Echec:
    JournalErreur "TitleBlock.GetPrimaryCoordinates()", Err.Number, Err.Description
    Set SEE_PointPrimaire = Nothing
End Function

Public Function SEE_Familles(ByVal env As Object, ByVal typeFamille As Long) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        env.GetShapeFamilyCollection typeFamille, o
    Else
        Set o = env.GetShapeFamilyCollection(typeFamille)
    End If
    Set SEE_Familles = o
    NoterAppel "Environment.GetShapeFamilyCollection(" & typeFamille & ")", o
    Exit Function
Echec:
    JournalErreur "Environment.GetShapeFamilyCollection(" & typeFamille & ")", Err.Number, Err.Description
    Set SEE_Familles = Nothing
End Function

Public Function SEE_FormesDeFamille(ByVal fam As Object) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        fam.GetShapesCollection o
    Else
        Set o = fam.GetShapesCollection()
    End If
    Set SEE_FormesDeFamille = o
    NoterAppel "ShapeFamily.GetShapesCollection()", o
    Exit Function
Echec:
    JournalErreur "ShapeFamily.GetShapesCollection()", Err.Number, Err.Description
    Set SEE_FormesDeFamille = Nothing
End Function

' Une forme (définition de symbole) par famille et nom : dans l'environnement,
' sinon dans le projet. Nothing si elle n'existe pas.
Public Function SEE_Forme(ByVal env As Object, ByVal prj As Object, ByVal famille As String, ByVal nom As String) As Object
    Dim o As Object
    Set SEE_Forme = Nothing
    If Len(famille) = 0 Or Len(nom) = 0 Then Exit Function
    If Not env Is Nothing Then
        Set o = FormeDe(env, "Environment", famille, nom)
        If Not o Is Nothing Then
            Set SEE_Forme = o
            Exit Function
        End If
    End If
    If Not prj Is Nothing Then Set SEE_Forme = FormeDe(prj, "Project", famille, nom)
End Function

Private Function FormeDe(ByVal source As Object, ByVal quoi As String, ByVal famille As String, ByVal nom As String) As Object
    Dim o As Object, appel As String
    appel = quoi & ".GetShape(""" & famille & """, """ & nom & """)"
    On Error GoTo Echec
    If EstV4() Then
        source.GetShape famille, nom, o
    Else
        Set o = source.GetShape(famille, nom)
    End If
    Set FormeDe = o
    NoterAppel appel, o
    Exit Function
Echec:
    JournalErreur appel, Err.Number, Err.Description
    Set FormeDe = Nothing
End Function

Public Function SEE_FamilleDeForme(ByVal forme As Object) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        forme.GetFamily o
    Else
        Set o = forme.GetFamily()
    End If
    Set SEE_FamilleDeForme = o
    Exit Function
Echec:
    JournalErreur "Shape.GetFamily()", Err.Number, Err.Description
    Set SEE_FamilleDeForme = Nothing
End Function

' GetMethodsXML : l'objet XML (ou le texte) d'une méthode de l'environnement,
' en lecture. Le type rendu n'est pas établi (V4 : « out object », un VARIANT) :
' v reçoit un objet ou une valeur.
Public Function SEE_MethodesXML(ByVal env As Object, ByVal typeMethode As Long, ByRef v As Variant) As Boolean
    Dim o As Object
    SEE_MethodesXML = False
    v = Empty
    On Error GoTo PasUnObjet
    If EstV4() Then
        env.GetMethodsXML typeMethode, v
    Else
        Set o = env.GetMethodsXML(typeMethode)
        Set v = o
    End If
    SEE_MethodesXML = True
    JournalCOM "Environment.GetMethodsXML(" & typeMethode & ")", "ok (" & TypeName(v) & ")"
    Exit Function
PasUnObjet:
    If EstV4() Then GoTo Echec
    Resume EssaiValeur
EssaiValeur:
    On Error GoTo Echec
    v = env.GetMethodsXML(typeMethode)
    SEE_MethodesXML = True
    JournalCOM "Environment.GetMethodsXML(" & typeMethode & ")", "ok (" & TypeName(v) & ")"
    Exit Function
Echec:
    JournalErreur "Environment.GetMethodsXML(" & typeMethode & ")", Err.Number, Err.Description
    SEE_MethodesXML = False
End Function

Public Function SEE_SymbolesDuFolio(ByVal sh As Object) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        sh.GetSymbolCollection o
    Else
        Set o = sh.GetSymbolCollection()
    End If
    Set SEE_SymbolesDuFolio = o
    NoterAppel "Sheet.GetSymbolCollection()", o
    Exit Function
Echec:
    JournalErreur "Sheet.GetSymbolCollection()", Err.Number, Err.Description
    Set SEE_SymbolesDuFolio = Nothing
End Function

Public Function SEE_GraphiquesDuFolio(ByVal sh As Object, ByVal typeGraphique As Long) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        sh.GetGraphicObjectCollection typeGraphique, o
    Else
        Set o = sh.GetGraphicObjectCollection(typeGraphique)
    End If
    Set SEE_GraphiquesDuFolio = o
    NoterAppel "Sheet.GetGraphicObjectCollection(" & typeGraphique & ")", o
    Exit Function
Echec:
    JournalErreur "Sheet.GetGraphicObjectCollection(" & typeGraphique & ")", Err.Number, Err.Description
    Set SEE_GraphiquesDuFolio = Nothing
End Function

Public Function SEE_SegmentsDuFolio(ByVal sh As Object) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        sh.GetConnectionSegmentCollection o
    Else
        Set o = sh.GetConnectionSegmentCollection()
    End If
    Set SEE_SegmentsDuFolio = o
    NoterAppel "Sheet.GetConnectionSegmentCollection()", o
    Exit Function
Echec:
    JournalErreur "Sheet.GetConnectionSegmentCollection()", Err.Number, Err.Description
    Set SEE_SegmentsDuFolio = Nothing
End Function

' Le repère (SEETag) d'un symbole, d'un connecteur, d'un bornier ou d'un câble.
Public Function SEE_RepereDe(ByVal obj As Object) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        obj.GetTag o
    Else
        Set o = obj.GetTag()
    End If
    Set SEE_RepereDe = o
    NoterAppel "GetTag()", o
    Exit Function
Echec:
    JournalErreur "GetTag()", Err.Number, Err.Description
    Set SEE_RepereDe = Nothing
End Function

Public Function SEE_FormeDuSymbole(ByVal sym As Object) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        sym.GetShape o
    Else
        Set o = sym.GetShape()
    End If
    Set SEE_FormeDuSymbole = o
    NoterAppel "Symbol.GetShape()", o
    Exit Function
Echec:
    JournalErreur "Symbol.GetShape()", Err.Number, Err.Description
    Set SEE_FormeDuSymbole = Nothing
End Function

Public Function SEE_ConnexionsDuSymbole(ByVal sym As Object) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        sym.GetConnectionPointCollection o
    Else
        Set o = sym.GetConnectionPointCollection()
    End If
    Set SEE_ConnexionsDuSymbole = o
    NoterAppel "Symbol.GetConnectionPointCollection()", o
    Exit Function
Echec:
    JournalErreur "Symbol.GetConnectionPointCollection()", Err.Number, Err.Description
    Set SEE_ConnexionsDuSymbole = Nothing
End Function

' Le connecteur ("C"), la broche ("P") ou la borne ("T") d'un symbole.
' Silencieux en cas d'erreur (un symbole ordinaire n'en a pas).
Public Function SEE_LienDuSymbole(ByVal sym As Object, ByVal quoi As String) As Object
    Dim o As Object
    On Error GoTo Echec
    Select Case quoi
        Case "C"
            If EstV4() Then
                sym.GetConnector o
            Else
                Set o = sym.GetConnector()
            End If
        Case "P"
            If EstV4() Then
                sym.GetPin o
            Else
                Set o = sym.GetPin()
            End If
        Case Else
            If EstV4() Then
                sym.GetTerminal o
            Else
                Set o = sym.GetTerminal()
            End If
    End Select
    Set SEE_LienDuSymbole = o
    Exit Function
Echec:
    Set SEE_LienDuSymbole = Nothing
End Function

' Le nom (SEEName.Name) d'une broche, d'une borne ou d'un fil (strand).
Public Function SEE_NomDe(ByVal obj As Object) As String
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        obj.GetName o
    Else
        Set o = obj.GetName()
    End If
    If o Is Nothing Then
        SEE_NomDe = ""
    Else
        SEE_NomDe = CStr(o.Name)
    End If
    Exit Function
Echec:
    SEE_NomDe = "#ERR " & Err.Number & " : " & Err.Description
End Function

Public Function SEE_FilsDe(ByVal obj As Object) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        obj.GetStrandCollection o
    Else
        Set o = obj.GetStrandCollection()
    End If
    Set SEE_FilsDe = o
    Exit Function
Echec:
    JournalErreur "GetStrandCollection()", Err.Number, Err.Description
    Set SEE_FilsDe = Nothing
End Function

Public Function SEE_CableDuFil(ByVal strand As Object) As Object
    Dim o As Object
    On Error GoTo Echec
    If EstV4() Then
        strand.GetCable o
    Else
        Set o = strand.GetCable()
    End If
    Set SEE_CableDuFil = o
    Exit Function
Echec:
    JournalErreur "Strand.GetCable()", Err.Number, Err.Description
    Set SEE_CableDuFil = Nothing
End Function

' Premier (premier = Vrai) ou second point d'un segment de connexion.
Public Function SEE_PointDuSegment(ByVal seg As Object, ByVal premier As Boolean) As Object
    Dim o As Object, appel As String
    appel = IIf(premier, "Segment.GetFirstPoint()", "Segment.GetSecondPoint()")
    On Error GoTo Echec
    If premier Then
        If EstV4() Then
            seg.GetFirstPoint o
        Else
            Set o = seg.GetFirstPoint()
        End If
    Else
        If EstV4() Then
            seg.GetSecondPoint o
        Else
            Set o = seg.GetSecondPoint()
        End If
    End If
    Set SEE_PointDuSegment = o
    Exit Function
Echec:
    JournalErreur appel, Err.Number, Err.Description
    Set SEE_PointDuSegment = Nothing
End Function

' Les connecteurs (quoi = "C") ou les borniers (quoi = "T") du projet qui
' portent ce repère.
Public Function SEE_ParRepere(ByVal prj As Object, ByVal quoi As String, ByVal repere As String) As Object
    Dim o As Object, appel As String
    appel = IIf(quoi = "C", "Project.GetConnectorsByTag", "Project.GetTerminalStripsByTag") & "(""" & repere & """)"
    On Error GoTo Echec
    If quoi = "C" Then
        If EstV4() Then
            prj.GetConnectorsByTag repere, o
        Else
            Set o = prj.GetConnectorsByTag(repere)
        End If
    Else
        If EstV4() Then
            prj.GetTerminalStripsByTag repere, o
        Else
            Set o = prj.GetTerminalStripsByTag(repere)
        End If
    End If
    Set SEE_ParRepere = o
    NoterAppel appel, o
    Exit Function
Echec:
    JournalErreur appel, Err.Number, Err.Description
    Set SEE_ParRepere = Nothing
End Function

' ============================================================================
'  LES POSITIONS RENDUES PAR SEE
'  En V4, GetPosition / GetRect donnent des SEEPoint par paramètres de sortie.
'  En V5 ils RENDENT quelque chose dont le type n'est pas établi (un SEEPoint ?
'  un SEERect, qui n'existe qu'en V5 ? une collection ?) : on accepte tout, et
'  la forme rencontrée est journalisée une fois par méthode.
' ============================================================================

' X et Y d'un SEEPoint.
Public Function LirePointXY(ByVal p As Object, ByRef x As Double, ByRef y As Double) As Boolean
    Dim vx As Variant, vy As Variant
    On Error GoTo Echec
    LirePointXY = False
    If p Is Nothing Then Exit Function
    vx = p.X
    vy = p.Y
    If LireNombre(vx, x) Then LirePointXY = LireNombre(vy, y)
    Exit Function
Echec:
    LirePointXY = False
End Function

' Une propriété qui rend un objet (Nothing en cas d'erreur).
Public Function ObjetProp(ByVal obj As Object, ByVal nom As String) As Object
    On Error GoTo Echec
    Set ObjetProp = Nothing
    If obj Is Nothing Then Exit Function
    Set ObjetProp = CallByName(obj, nom, VbGet)
    Exit Function
Echec:
    Set ObjetProp = Nothing
End Function

' Ce que rend un GetPosition / GetRect : un ou deux points.
Public Function DecomposerPosition(ByVal v As Variant, ByRef x1 As Double, ByRef y1 As Double, _
        ByRef x2 As Double, ByRef y2 As Double, ByRef aSecond As Boolean, ByRef forme As String) As Boolean
    Dim p1 As Object, p2 As Object, c As Collection, i As Long, n As Long
    DecomposerPosition = False
    aSecond = False
    forme = "inconnue"
    If IsObject(v) Then
        If v Is Nothing Then
            forme = "Nothing"
            Exit Function
        End If
        If LirePointXY(v, x1, y1) Then
            forme = "point (X, Y)"
            DecomposerPosition = True
            Exit Function
        End If
        Set p1 = ObjetProp(v, "Point1")
        If Not p1 Is Nothing Then
            If LirePointXY(p1, x1, y1) Then
                Set p2 = ObjetProp(v, "Point2")
                aSecond = LirePointXY(p2, x2, y2)
                forme = "rectangle (Point1, Point2)"
                DecomposerPosition = True
                Exit Function
            End If
        End If
        If NombreDe(v) > 0 Then
            Set c = ElementsDe(v)
            If c.Count >= 1 Then
                If IsObject(c(1)) Then
                    If LirePointXY(c(1), x1, y1) Then
                        If c.Count >= 2 Then aSecond = LirePointXY(c(2), x2, y2)
                        forme = "collection de " & c.Count & " point(s)"
                        DecomposerPosition = True
                    End If
                End If
            End If
        End If
    ElseIf IsArray(v) Then
        n = UBound(v) - LBound(v) + 1
        i = LBound(v)
        If n >= 2 Then
            If IsObject(v(i)) Then
                If LirePointXY(v(i), x1, y1) Then
                    aSecond = LirePointXY(v(i + 1), x2, y2)
                    forme = "tableau de points"
                    DecomposerPosition = True
                End If
            ElseIf LireNombre(v(i), x1) And LireNombre(v(i + 1), y1) Then
                If n >= 4 Then aSecond = LireNombre(v(i + 2), x2) And LireNombre(v(i + 3), y2)
                forme = "tableau de " & n & " nombres"
                DecomposerPosition = True
            End If
        ElseIf n = 1 Then
            If IsObject(v(i)) Then
                DecomposerPosition = LirePointXY(v(i), x1, y1)
                forme = "tableau d'un point"
            End If
        End If
    Else
        forme = "valeur " & TypeName(v)
    End If
End Function

' Note une fois par macro, et par méthode, la forme de ce que SEE rend (pour
' apprendre) : chaque macro vide le journal, chacune la redit donc.
Private Sub NoterForme(ByVal appel As String, ByVal forme As String)
    If mFormesDites Is Nothing Then Set mFormesDites = NouveauDico()
    If Not mFormesDites.Exists(appel) Then
        mFormesDites.Add appel, forme
        Journal "Formes", "", appel, "V5 rend : " & forme
    End If
End Sub

' Appelle une méthode SANS argument dont le type de retour n'est pas établi.
' Réservé aux LECTURES : si le Set échoue, la méthode est rappelée une seconde
' fois pour lire une valeur simple.
Private Function AppelLecture(ByVal obj As Object, ByVal nom As String, ByRef v As Variant) As Boolean
    AppelLecture = False
    v = Empty
    On Error GoTo PasUnObjet
    Set v = CallByName(obj, nom, VbMethod)
    AppelLecture = True
    Exit Function
PasUnObjet:
    Resume EssaiValeur
EssaiValeur:
    On Error GoTo Echec
    v = CallByName(obj, nom, VbMethod)
    AppelLecture = True
    Exit Function
Echec:
    JournalErreur nom & "()", Err.Number, Err.Description
    AppelLecture = False
End Function

' Position d'un symbole (ou d'un texte, d'un objet graphique) : son premier
' point, et le second s'il en a un (symbole à deux points, boîte).
Public Function SEE_PositionDe(ByVal obj As Object, ByRef x1 As Double, ByRef y1 As Double, _
        ByRef x2 As Double, ByRef y2 As Double, ByRef aSecond As Boolean) As Boolean
    Dim p1 As Object, p2 As Object, v As Variant, forme As String
    SEE_PositionDe = False
    aSecond = False
    If obj Is Nothing Then Exit Function
    If EstV4() Then
        On Error GoTo Echec
        obj.GetPosition p1, p2
        On Error GoTo 0
        SEE_PositionDe = LirePointXY(p1, x1, y1)
        If Not p2 Is Nothing Then aSecond = LirePointXY(p2, x2, y2)
    Else
        If AppelLecture(obj, "GetPosition", v) Then
            SEE_PositionDe = DecomposerPosition(v, x1, y1, x2, y2, aSecond, forme)
            NoterForme TypeName(obj) & ".GetPosition()", forme
        End If
    End If
    Exit Function
Echec:
    JournalErreur "GetPosition(p1, p2)", Err.Number, Err.Description
    SEE_PositionDe = False
End Function

' Un point par une méthode à UN point : GetPosition d'un point de connexion,
' d'un point de segment ; GetFirstPoint / GetSecondPoint d'un rectangle ;
' GetStartPoint / GetEndPoint d'une ligne ; GetPrimaryCoordinates d'un cartouche.
Public Function SEE_PointPar(ByVal obj As Object, ByVal methode As String, ByRef x As Double, ByRef y As Double) As Boolean
    Dim p As Object, v As Variant, forme As String, x2 As Double, y2 As Double, a As Boolean
    SEE_PointPar = False
    If obj Is Nothing Then Exit Function
    If EstV4() Then
        On Error GoTo Echec
        Select Case methode
            Case "GetFirstPoint"
                obj.GetFirstPoint p
            Case "GetSecondPoint"
                obj.GetSecondPoint p
            Case "GetStartPoint"
                obj.GetStartPoint p
            Case "GetEndPoint"
                obj.GetEndPoint p
            Case "GetPrimaryCoordinates"
                obj.GetPrimaryCoordinates p
            Case Else
                obj.GetPosition p
        End Select
        On Error GoTo 0
        SEE_PointPar = LirePointXY(p, x, y)
    Else
        If AppelLecture(obj, methode, v) Then
            SEE_PointPar = DecomposerPosition(v, x, y, x2, y2, a, forme)
            NoterForme TypeName(obj) & "." & methode & "()", forme
        End If
    End If
    Exit Function
Echec:
    JournalErreur methode & "(p)", Err.Number, Err.Description
    SEE_PointPar = False
End Function

' Le rectangle d'une forme (GetRect : coin haut gauche, coin bas droit).
Public Function SEE_RectForme(ByVal forme As Object, ByRef x1 As Double, ByRef y1 As Double, _
        ByRef x2 As Double, ByRef y2 As Double) As Boolean
    Dim p1 As Object, p2 As Object, v As Variant, f As String, a As Boolean
    SEE_RectForme = False
    If forme Is Nothing Then Exit Function
    If EstV4() Then
        On Error GoTo Echec
        forme.GetRect p1, p2
        On Error GoTo 0
        If LirePointXY(p1, x1, y1) Then SEE_RectForme = LirePointXY(p2, x2, y2)
    Else
        If AppelLecture(forme, "GetRect", v) Then
            SEE_RectForme = DecomposerPosition(v, x1, y1, x2, y2, a, f)
            NoterForme "Shape.GetRect()", f
            If Not a Then SEE_RectForme = False
        End If
    End If
    Exit Function
Echec:
    JournalErreur "Shape.GetRect(p1, p2)", Err.Number, Err.Description
    SEE_RectForme = False
End Function

' ============================================================================
'  LA CONVERSION DES COORDONNEES : paquet (mm, haut gauche, y vers le bas)
'  vers SEE.
'    ECHELLE : x' = OrigineX + Echelle.x            y' = OrigineY + SensY.Echelle.y
'    AJUSTER : Echelle = min(zoneL / feuilleL, zoneH / feuilleH), la feuille
'              centrée dans la zone de travail du cartouche :
'              x' = OrigineX + dx + E.x              y' = OrigineY + SensY.(dy + E.y)
'  puis, si Grille > 0, chaque coordonnée est arrondie au pas de la grille.
'  OrigineX / OrigineY = le point de SEE qui correspond au coin HAUT GAUCHE
'  de la zone ; SensY = 1 si y descend dans SEE, -1 s'il monte.
' ============================================================================

Public Sub PreparerConversion(ByVal zoneL As Double, ByVal zoneH As Double)
    Dim fl As Double, fh As Double, mode As String, e1 As Double, e2 As Double
    fl = 420
    fh = 297
    If Not gEntete Is Nothing Then
        If gEntete.Exists("feuille_l") Then
            If LireNombre(gEntete.Item("feuille_l"), e1) Then
                If e1 > 0 Then fl = e1
            End If
        End If
        If gEntete.Exists("feuille_h") Then
            If LireNombre(gEntete.Item("feuille_h"), e2) Then
                If e2 > 0 Then fh = e2
            End If
        End If
    End If
    mode = UCase$(Reglage("Mode", "AJUSTER"))
    mOrigineX = ReglageNombre("OrigineX", 0)
    mOrigineY = ReglageNombre("OrigineY", 0)
    If ReglageNombre("SensY", 1) < 0 Then mSensY = -1 Else mSensY = 1
    mGrille = ReglageNombre("Grille", 0)
    mDecalX = 0
    mDecalY = 0
    If mode = "AJUSTER" And zoneL > 0 And zoneH > 0 Then
        e1 = zoneL / fl
        e2 = zoneH / fh
        If e1 < e2 Then mEchelle = e1 Else mEchelle = e2
        mDecalX = (zoneL - mEchelle * fl) / 2
        mDecalY = (zoneH - mEchelle * fh) / 2
    Else
        If mode = "AJUSTER" Then
            Journal "Conversion", "", "", "mode AJUSTER mais zone de travail inconnue (" & NombreTexte(zoneL) & " x " & _
                NombreTexte(zoneH) & ") : on applique le mode ECHELLE", -1, "zone du cartouche illisible"
            gNbErreurs = gNbErreurs + 1
        End If
        mEchelle = ReglageNombre("Echelle", 1)
        If mEchelle = 0 Then mEchelle = 1
    End If
    mConversionPrete = True
    If mode = "AJUSTER" And Not (zoneL > 0 And zoneH > 0) Then mode = "ECHELLE (repli)"
    Journal "Conversion", "", "", "feuille " & NombreTexte(fl) & " x " & NombreTexte(fh) & " mm ; mode " & mode & _
        " ; x' = " & NombreTexte(mOrigineX + mDecalX) & " + " & NombreTexte(mEchelle) & ".x ; y' = " & _
        NombreTexte(mOrigineY + mSensY * mDecalY) & " + " & NombreTexte(mSensY * mEchelle) & ".y ; grille " & NombreTexte(mGrille)
End Sub

Private Function SurGrille(ByVal v As Double) As Double
    If mGrille > 0 Then
        SurGrille = Round(v / mGrille, 0) * mGrille
    Else
        SurGrille = v
    End If
End Function

Public Function VersSEEX(ByVal x As Double) As Double
    If Not mConversionPrete Then PreparerConversion 0, 0
    VersSEEX = SurGrille(mOrigineX + mDecalX + mEchelle * x)
End Function

Public Function VersSEEY(ByVal y As Double) As Double
    If Not mConversionPrete Then PreparerConversion 0, 0
    VersSEEY = SurGrille(mOrigineY + mSensY * (mDecalY + mEchelle * y))
End Function

' Une longueur (une taille de texte) du paquet en unités SEE (sans grille).
Public Function LongueurSEE(ByVal l As Double) As Double
    If Not mConversionPrete Then PreparerConversion 0, 0
    LongueurSEE = mEchelle * l
End Function

Public Sub OublierConversion()
    mConversionPrete = False
End Sub

' ============================================================================
'  LE PAQUET SEE (.xlsx) : lu une fois en tableaux, colonnes par leur NOM
' ============================================================================

Private Function IdFeuille(ByVal feuille As String) As Integer
    Select Case LCase$(feuille)
        Case "paquet": IdFeuille = 1
        Case "folios": IdFeuille = 2
        Case "blocs": IdFeuille = 3
        Case "connecteurs": IdFeuille = 4
        Case "bornes": IdFeuille = 5
        Case "fils": IdFeuille = 6
        Case "jonctions": IdFeuille = 7
        Case "legende": IdFeuille = 8
        Case Else: IdFeuille = 0
    End Select
End Function

' Ouvre le paquet en lecture seule, lit ses feuilles, le referme. Contrôle le
' format « paquet-see/1 ». Rend Faux (et le journal dit pourquoi) si le
' paquet n'est pas lisible.
Public Function ChargerPaquet(ByVal chemin As String) As Boolean
    Dim wb As Object, w As Object, ws As Object, nom As Variant, dejaOuvert As Boolean
    Dim k As Integer, i As Long, cle As String, fmt As String
    ChargerPaquet = False
    Contexte "Paquet", chemin
    Set gPaquet = NouveauDico()
    Set gIndexFolios = NouveauDico()
    Set gEntete = NouveauDico()
    For k = 1 To 8
        Set mColonnes(k) = NouveauDico()
        mNbLignes(k) = 0
    Next k
    mV1 = Empty
    mV2 = Empty
    mV3 = Empty
    mV4 = Empty
    mV5 = Empty
    mV6 = Empty
    mV7 = Empty
    mV8 = Empty
    gCheminPaquet = chemin
    On Error GoTo Echec
    For Each w In Application.Workbooks
        If StrComp(w.FullName, chemin, vbTextCompare) = 0 Then
            Set wb = w
            dejaOuvert = True
        End If
    Next w
    If wb Is Nothing Then Set wb = Application.Workbooks.Open(Filename:=chemin, UpdateLinks:=0, ReadOnly:=True)
    For Each nom In Split(FEUILLES_PAQUET, ";")
        Set ws = Nothing
        For Each w In wb.Worksheets
            If StrComp(w.Name, CStr(nom), vbTextCompare) = 0 Then Set ws = w
        Next w
        If ws Is Nothing Then
            Journal "Paquet", CStr(nom), "", "feuille absente du paquet"
        Else
            LireFeuillePaquet ws, IdFeuille(CStr(nom))
            gPaquet.Item(CStr(nom)) = mNbLignes(IdFeuille(CStr(nom)))
        End If
    Next nom
    If Not dejaOuvert Then wb.Close SaveChanges:=False
    Set wb = Nothing
    On Error GoTo 0
    ' l'en-tête Cle / Valeur
    For i = 2 To mNbLignes(1)
        cle = Trim$(PaquetTexte("Paquet", i, "Cle"))
        If Len(cle) > 0 Then gEntete.Item(cle) = PaquetValeur("Paquet", i, "Valeur")
    Next i
    If gEntete.Exists("format") Then fmt = Trim$(EnTexte(gEntete.Item("format")))
    If fmt <> FORMAT_PAQUET Then
        Journal "Paquet", chemin, "", "format « " & fmt & " » : attendu « " & FORMAT_PAQUET & " »", -1, "paquet refusé"
        gNbErreurs = gNbErreurs + 1
        Exit Function
    End If
    For Each nom In Array("Folios", "Blocs", "Bornes", "Fils")
        If mNbLignes(IdFeuille(CStr(nom))) < 1 Then
            Journal "Paquet", CStr(nom), "", "feuille obligatoire absente ou vide", -1, "paquet incomplet"
            gNbErreurs = gNbErreurs + 1
            Exit Function
        End If
    Next nom
    Journal "Paquet", chemin, "", "lu : " & (mNbLignes(2) - 1) & " folio(s), " & (mNbLignes(3) - 1) & " bloc(s), " & _
        (mNbLignes(5) - 1) & " borne(s), " & (mNbLignes(6) - 1) & " fil(s) ; outil « " & EnteteTexte("outil") & _
        " », moteur " & EnteteTexte("version_moteur") & ", export du " & EnteteTexte("date")
    ChargerPaquet = True
    Exit Function
Echec:
    Journal "Paquet", chemin, "Workbooks.Open / lecture", "ÉCHEC", Err.Number, Err.Description
    gNbErreurs = gNbErreurs + 1
    If Not wb Is Nothing And Not dejaOuvert Then CloreSansSauver wb
End Function

Private Sub CloreSansSauver(ByVal wb As Object)
    On Error Resume Next
    wb.Close SaveChanges:=False
End Sub

Public Function EnteteTexte(ByVal cle As String) As String
    EnteteTexte = ""
    If gEntete Is Nothing Then Exit Function
    If gEntete.Exists(cle) Then EnteteTexte = EnTexte(gEntete.Item(cle))
End Function

' Lit une feuille du paquet en un tableau (1..n, 1..m) et note ses colonnes.
Private Sub LireFeuillePaquet(ByVal ws As Object, ByVal k As Integer)
    Dim nl As Long, nc As Long, v As Variant, j As Long, i As Long, h As String
    Dim f As Double, cle As String
    nl = ws.UsedRange.Row + ws.UsedRange.Rows.Count - 1
    nc = ws.UsedRange.Column + ws.UsedRange.Columns.Count - 1
    If nl < 1 Or nc < 1 Then Exit Sub
    If nl = 1 And nc = 1 Then
        ReDim v(1 To 1, 1 To 1)
        v(1, 1) = ws.Cells(1, 1).Value
    Else
        v = ws.Range(ws.Cells(1, 1), ws.Cells(nl, nc)).Value
    End If
    For j = 1 To nc
        h = Trim$(EnTexte(v(1, j)))
        If Len(h) > 0 Then
            If Not mColonnes(k).Exists(h) Then mColonnes(k).Add h, j
        End If
    Next j
    mNbLignes(k) = nl
    Select Case k
        Case 1: mV1 = v
        Case 2: mV2 = v
        Case 3: mV3 = v
        Case 4: mV4 = v
        Case 5: mV5 = v
        Case 6: mV6 = v
        Case 7: mV7 = v
        Case 8: mV8 = v
    End Select
    ' index des lignes par folio
    If mColonnes(k).Exists("Folio") Then
        j = mColonnes(k).Item("Folio")
        For i = 2 To nl
            If LireNombre(v(i, j), f) Then
                cle = CStr(k) & "|" & CStr(EnLong(f, 0))
                If Not gIndexFolios.Exists(cle) Then gIndexFolios.Add cle, New Collection
                gIndexFolios.Item(cle).Add i
            End If
        Next i
    End If
End Sub

' La valeur d'une cellule du paquet (Empty si la colonne n'existe pas).
Public Function PaquetValeur(ByVal feuille As String, ByVal ligne As Long, ByVal colonne As String) As Variant
    Dim k As Integer, j As Long
    PaquetValeur = Empty
    k = IdFeuille(feuille)
    If k = 0 Then Exit Function
    If mColonnes(k) Is Nothing Then Exit Function
    If Not mColonnes(k).Exists(colonne) Then Exit Function
    If ligne < 1 Or ligne > mNbLignes(k) Then Exit Function
    j = mColonnes(k).Item(colonne)
    Select Case k
        Case 1: PaquetValeur = mV1(ligne, j)
        Case 2: PaquetValeur = mV2(ligne, j)
        Case 3: PaquetValeur = mV3(ligne, j)
        Case 4: PaquetValeur = mV4(ligne, j)
        Case 5: PaquetValeur = mV5(ligne, j)
        Case 6: PaquetValeur = mV6(ligne, j)
        Case 7: PaquetValeur = mV7(ligne, j)
        Case 8: PaquetValeur = mV8(ligne, j)
    End Select
End Function

Public Function PaquetTexte(ByVal feuille As String, ByVal ligne As Long, ByVal colonne As String) As String
    PaquetTexte = Trim$(EnTexte(PaquetValeur(feuille, ligne, colonne)))
End Function

' Un nombre du paquet (cellule numérique lue comme Double). Faux si vide.
Public Function PaquetNombre(ByVal feuille As String, ByVal ligne As Long, ByVal colonne As String, ByRef x As Double) As Boolean
    PaquetNombre = LireNombre(PaquetValeur(feuille, ligne, colonne), x)
End Function

' Un nombre du paquet, ou la valeur par défaut s'il est vide.
Public Function PaquetNombreOu(ByVal feuille As String, ByVal ligne As Long, ByVal colonne As String, ByVal defaut As Double) As Double
    Dim x As Double
    If PaquetNombre(feuille, ligne, colonne, x) Then PaquetNombreOu = x Else PaquetNombreOu = defaut
End Function

Public Function PaquetAColonne(ByVal feuille As String, ByVal colonne As String) As Boolean
    Dim k As Integer
    k = IdFeuille(feuille)
    PaquetAColonne = False
    If k = 0 Then Exit Function
    If mColonnes(k) Is Nothing Then Exit Function
    PaquetAColonne = mColonnes(k).Exists(colonne)
End Function

' Nombre de lignes d'une feuille, en-tête compris (0 si absente).
Public Function PaquetNbLignes(ByVal feuille As String) As Long
    Dim k As Integer
    k = IdFeuille(feuille)
    If k = 0 Then PaquetNbLignes = 0 Else PaquetNbLignes = mNbLignes(k)
End Function

' Les numéros de ligne d'une feuille qui appartiennent à un folio.
Public Function PaquetLignesDuFolio(ByVal feuille As String, ByVal folio As Long) As Collection
    Dim cle As String
    cle = CStr(IdFeuille(feuille)) & "|" & CStr(folio)
    If gIndexFolios Is Nothing Then
        Set PaquetLignesDuFolio = New Collection
    ElseIf gIndexFolios.Exists(cle) Then
        Set PaquetLignesDuFolio = gIndexFolios.Item(cle)
    Else
        Set PaquetLignesDuFolio = New Collection
    End If
End Function

' Le tracé d'un fil : « x y|x y|... » (point décimal), lu avec Split et Val.
' Rend le nombre de points ; xs et ys de 0 à n-1.
Public Function LirePoints(ByVal texte As String, ByRef xs() As Double, ByRef ys() As Double) As Long
    Dim morceaux As Variant, mots As Variant, i As Long, n As Long, m As Variant
    Dim a As String, b As String
    LirePoints = 0
    texte = Trim$(Replace(texte, vbTab, " "))
    If Len(texte) = 0 Then Exit Function
    morceaux = Split(texte, "|")
    ReDim xs(0 To UBound(morceaux))
    ReDim ys(0 To UBound(morceaux))
    n = 0
    For i = 0 To UBound(morceaux)
        a = ""
        b = ""
        mots = Split(Trim$(CStr(morceaux(i))), " ")
        For Each m In mots
            If Len(m) > 0 Then
                If Len(a) = 0 Then
                    a = CStr(m)
                ElseIf Len(b) = 0 Then
                    b = CStr(m)
                End If
            End If
        Next m
        If Len(a) > 0 And Len(b) > 0 Then
            xs(n) = Val(a)
            ys(n) = Val(b)
            n = n + 1
        End If
    Next i
    LirePoints = n
End Function

' ============================================================================
'  LA SELECTION DES FOLIOS : « 1 », « 1-5 », « 3;7 », « 1-3;8 », « * »
'  Rend les rangs, croissants, entre 1 et nbMax.
' ============================================================================
Public Function SelectionFolios(ByVal texte As String, ByVal nbMax As Long) As Collection
    Dim d As Object, t As Variant, s As String, pos As Long, a As Long, b As Long, i As Long
    Dim res As Collection
    Set d = NouveauDico()
    Set res = New Collection
    texte = Replace(Replace(Replace(Trim$(texte), ",", ";"), " ", ""), "'", "")
    If Len(texte) = 0 Or texte = "*" Or UCase$(texte) = "TOUS" Then
        For i = 1 To nbMax
            d.Item(CStr(i)) = True
        Next i
    Else
        For Each t In Split(texte, ";")
            s = CStr(t)
            If Len(s) > 0 Then
                pos = InStr(2, s, "-")
                If pos > 0 Then
                    a = EnLong(Left$(s, pos - 1), 0)
                    b = EnLong(Mid$(s, pos + 1), 0)
                    If b < a Then
                        i = a
                        a = b
                        b = i
                    End If
                Else
                    a = EnLong(s, 0)
                    b = a
                End If
                ' bornée au paquet : « 1-99999999 » ne fait pas tourner la boucle pour rien
                If a < 1 Then a = 1
                If b > nbMax Then b = nbMax
                For i = a To b
                    d.Item(CStr(i)) = True
                Next i
            End If
        Next t
    End If
    For i = 1 To nbMax
        If d.Exists(CStr(i)) Then res.Add i
    Next i
    Set SelectionFolios = res
End Function

' ============================================================================
'  LES MODELES DE TEXTE : « {Repere}-{Lettre} », « {Nom} »...
'  Modele("{Repere}-{Lettre}", "Repere", "601RC", "Lettre", "A") = "601RC-A"
' ============================================================================
Public Function Modele(ByVal m As String, ParamArray paires() As Variant) As String
    Dim i As Long
    For i = LBound(paires) To UBound(paires) - 1 Step 2
        m = Replace(m, "{" & CStr(paires(i)) & "}", CStr(paires(i + 1)), 1, -1, vbTextCompare)
    Next i
    Modele = m
End Function

' Le premier groupe de chiffres d'un texte (« 601 » pour « 601RC »), sinon "".
Public Function PremierNombre(ByVal s As String) As String
    Dim i As Long, c As String, r As String
    r = ""
    For i = 1 To Len(s)
        c = Mid$(s, i, 1)
        If c >= "0" And c <= "9" Then
            r = r & c
        ElseIf Len(r) > 0 Then
            Exit For
        End If
    Next i
    PremierNombre = r
End Function

' Demande un fichier .xlsx (rend "" si l'utilisateur annule).
Public Function DemanderFichierPaquet() As String
    Dim f As Variant
    f = Application.GetOpenFilename("Paquet SEE (*.xlsx),*.xlsx", , "Choisir le paquet SEE exporté par l'Atelier")
    If VarType(f) = vbBoolean Then
        DemanderFichierPaquet = ""
    Else
        DemanderFichierPaquet = CStr(f)
    End If
End Function
