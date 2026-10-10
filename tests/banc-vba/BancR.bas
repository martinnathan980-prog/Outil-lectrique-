Option VBASupport 1
Option Explicit
' Les scénarios de la reprise des constats de relecture (banc LibreOffice).

Public Sub ReglerFaux(ByVal folios As String, ByVal v4 As Boolean)
    gSansDialogue = True
    InitialiserClasseur
    FixerReglage "Folios", folios
    FixerReglage "PasAPas", "N"
    FixerReglage "Simulation", "N"
    FixerReglage "Cartouche", "A3"
    FixerReglage "EQUIPEMENT.Mode", "BROCHE"
    FixerReglage "EQUIPEMENT.Famille", "FAM"
    FixerReglage "EQUIPEMENT.Symbole", "BOITE"
    FixerReglage "EQUIPEMENT.BrocheFamille", "FAM"
    FixerReglage "EQUIPEMENT.BrocheSymbole", "BROCHE"
    FixerReglage "PRISE.Mode", "BROCHE"
    FixerReglage "PRISE.BrocheFamille", "FAM"
    FixerReglage "PRISE.BrocheSymbole", "BROCHE"
    FixerReglage "BARRETTE.Mode", "BORNIER"
    FixerReglage "BARRETTE.BrocheFamille", "FAM"
    FixerReglage "BARRETTE.BrocheSymbole", "BORNE"
    FixerReglage "BARRETTE_A_POSER.Mode", "BORNIER"
    FixerReglage "BARRETTE_A_POSER.BrocheFamille", "FAM"
    FixerReglage "BARRETTE_A_POSER.BrocheSymbole", "BORNE"
    FixerReglage "MASSE.Mode", "SYMBOLE"
    FixerReglage "MASSE.Famille", "FAM"
    FixerReglage "MASSE.Symbole", "MASSE"
    FixerReglage "MASSE.AngleG", "0"
    FixerReglage "MASSE.AngleD", "180"
    FixerReglage "TypeConnexion", "Fil"
    FixerReglage "Cable", "O"
    FixerReglage "Jauge", "O"
    FixerReglage "SauverTous", "2"
    FixerReglage "Remplacer", "N"
    InitFaux v4
    Set gApp = New FauxApp
    gEstAutomation = False
    gVersionAPI = 0
    DeterminerVersion
    gNbKeys = 0
    gPlanterKeys = 0
End Sub

Public Function NomsDesFoliosSEE() As String
    Dim o As Variant, s As String
    For Each o In gFolios
        s = s & o.Name & ","
    Next o
    NomsDesFoliosSEE = "[" & s & "]"
End Function

Public Function EtatsBilan() As String
    Dim ws As Object, i As Long, s As String
    Set ws = ThisWorkbook.Worksheets("Bilan")
    For i = 2 To 40
        If Len(CStr(ws.Cells(i, 2).Value)) > 0 Then s = s & CStr(ws.Cells(i, 2).Value) & "=" & CStr(ws.Cells(i, 3).Value) & " ; "
    Next i
    EtatsBilan = s
End Function

Public Function Compter(ByVal prefixe As String) As Long
    Dim i As Long, n As Long
    For i = 1 To gTrace.Count
        If Left(gTrace.Item(i), Len(prefixe)) = prefixe Then n = n + 1
    Next i
    Compter = n
End Function

Public Function JournalContient(ByVal texte As String) As Long
    Dim ws As Object, i As Long, n As Long, j As Long
    Set ws = ThisWorkbook.Worksheets("Journal")
    For i = 2 To 30000
        If Len(CStr(ws.Cells(i, 1).Value)) = 0 Then Exit For
        For j = 2 To 7
            If InStr(1, CStr(ws.Cells(i, j).Value), texte) > 0 Then
                n = n + 1
                Exit For
            End If
        Next j
    Next i
    JournalContient = n
End Function

' C1, C5, C12, VBA-9 : un passage complet (le verifier lit trace.txt)
Public Function BancComplet(ByVal chemin As String, ByVal v4 As Boolean, ByVal relectureRatee As Boolean) As String
    On Error GoTo E
    ReglerFaux "*", v4
    FixerReglage "Fil.Ordre", "{Num}"
    FixerReglage "Repere.Ordre", "{Num}"
    gRelectureRatee = relectureRatee
    DessinerPaquetFichier chemin, True
    EcrireTrace
    BancComplet = "V" & gVersionAPI & " ; erreurs " & gNbErreurs & " ; folios SEE " & NomsDesFoliosSEE() & " ; bilan " & EtatsBilan() & _
        " ; relecture impossible " & JournalContient("relecture impossible") & " ; ordre hors limite " & JournalContient("ordre hors limite") & _
        " ; nom en double " & JournalContient("nom en double") & " ; bornes doubles " & JournalContient("lignes de Bornes")
    Exit Function
E:
    BancComplet = "ERREUR VBA " & Err.Number & " " & Err.Description & " (étape " & gEtape & " / " & gObjet & ")"
End Function

' VBA-3, C2 : une panne au milieu du folio 2, puis la relance
Public Function BancInterrompu(ByVal chemin As String) As String
    Dim r As String
    On Error GoTo E
    ReglerFaux "1-3", False
    gPlanterKeys = 2
    DessinerPaquetFichier chemin, True
    r = "passage 1 : SEE " & NomsDesFoliosSEE() & " bilan " & EtatsBilan()
    gPlanterKeys = 0
    DessinerPaquetFichier chemin, True
    r = r & " | relance : SEE " & NomsDesFoliosSEE() & " bilan " & EtatsBilan() & " ; DeleteSheet " & Compter("DeleteSheet|") & _
        " (" & Compter("DeleteSheet|~2") & " de ~2)"
    BancInterrompu = r
    Exit Function
E:
    BancInterrompu = r & " ERREUR VBA " & Err.Number & " " & Err.Description & " (étape " & gEtape & " / " & gObjet & ")"
End Function

' C2 : Remplacer = O redessine sous le nom provisoire, puis supprime l'ancien, puis renomme
Public Function BancRemplacer(ByVal chemin As String) As String
    Dim r As String, n0 As Long
    On Error GoTo E
    ReglerFaux "1-3", False
    DessinerPaquetFichier chemin, True
    FixerReglage "Remplacer", "O"
    n0 = gTrace.Count
    DessinerPaquetFichier chemin, True
    r = "SEE " & NomsDesFoliosSEE() & " ; bilan " & EtatsBilan() & " ; AddSheet " & Compter("AddSheet") & " ; DeleteSheet " & Compter("DeleteSheet|") & _
        " ; Rename ~ " & Compter("Rename|~") & " ; erreurs " & gNbErreurs
    BancRemplacer = r
    Exit Function
E:
    BancRemplacer = r & " ERREUR VBA " & Err.Number & " " & Err.Description
End Function

' C3a : GetSheetByName lève une erreur pour un folio absent ; puis la liste des folios est illisible aussi
Public Function BancListe(ByVal chemin As String) As String
    Dim r As String
    On Error GoTo E
    ReglerFaux "1-3", False
    gSheetErreurSiAbsent = True
    DessinerPaquetFichier chemin, True
    r = "passage 1 : SEE " & NomsDesFoliosSEE()
    DessinerPaquetFichier chemin, True
    r = r & " | relance : SEE " & NomsDesFoliosSEE() & " bilan " & EtatsBilan()
    ReglerFaux "1-3", False
    gSheetErreurSiAbsent = True
    gListeIllisible = True
    DessinerPaquetFichier chemin, True
    r = r & " | liste illisible : SEE " & NomsDesFoliosSEE() & " ; AddSheet " & Compter("AddSheet") & " ; bilan " & EtatsBilan() & _
        " ; arrêt dit " & JournalContient("existe déjà dans SEE (voir le journal)")
    BancListe = r
    Exit Function
E:
    BancListe = r & " ERREUR VBA " & Err.Number & " " & Err.Description
End Function

' C3b : SEE refuse le nom provisoire
Public Function BancRenommage(ByVal chemin As String) As String
    On Error GoTo E
    ReglerFaux "*", False
    gRenommageRefuse = "~"
    DessinerPaquetFichier chemin, True
    BancRenommage = "SEE " & NomsDesFoliosSEE() & " ; AddSheet " & Compter("AddSheet") & " ; DeleteSheet " & Compter("DeleteSheet|") & _
        " ; bilan " & EtatsBilan() & " ; arrêt dit " & JournalContient("lot ARRÊTÉ")
    Exit Function
E:
    BancRenommage = "ERREUR VBA " & Err.Number & " " & Err.Description
End Function

' C9 : deux lots aux mêmes rangs ; la sauvegarde du 1er échoue
Public Function BancSauvegardes(ByVal chemin As String) As String
    On Error GoTo E
    ReglerFaux "1-2", False
    FixerReglage "NomFolio", "A{Nom}"
    gSauverRate = True
    DessinerPaquetFichier chemin, True
    gSauverRate = False
    FixerReglage "NomFolio", "B{Nom}"
    DessinerPaquetFichier chemin, True
    BancSauvegardes = "bilan " & EtatsBilan()
    Exit Function
E:
    BancSauvegardes = "ERREUR VBA " & Err.Number & " " & Err.Description
End Function

' C8 : connecté par SeeAutomation
Public Function BancAutomation(ByVal chemin As String) As String
    Dim r As String
    On Error GoTo E
    ReglerFaux "1-2", False
    gEstAutomation = True
    DessinerPaquetFichier chemin, True
    r = "réel : traces " & gTrace.Count & " ; SEE " & NomsDesFoliosSEE() & " ; dit " & JournalContient("SeeAutomation")
    Set gApp = New FauxApp
    gEstAutomation = True
    FixerReglage "Simulation", "O"
    DessinerPaquetFichier chemin, True
    r = r & " | simulation : traces " & gTrace.Count & " ; bilan " & EtatsBilan()
    BancAutomation = r
    Exit Function
E:
    BancAutomation = r & " ERREUR VBA " & Err.Number & " " & Err.Description & " (étape " & gEtape & " / " & gObjet & ")"
End Function

' VBA-2 : le réglage VersionAPI relu par une macro suivante (connexion gardée)
Public Function BancVersion() As String
    Dim r As String, ws As Object, i As Long
    On Error GoTo E
    ReglerFaux "1", False
    FixerReglage "VersionAPI", "auto"
    SondeApplication
    r = "auto : V" & gVersionAPI
    FixerReglage "VersionAPI", "V4"
    SondeApplication
    Set ws = ThisWorkbook.Worksheets("Sonde_Application")
    For i = 1 To 10
        If CStr(ws.Cells(i, 2).Value) = "VersionAPI retenue" Then r = r & " | après VersionAPI = V4 : " & CStr(ws.Cells(i, 3).Value)
    Next i
    BancVersion = r
    Exit Function
E:
    BancVersion = r & " ERREUR VBA " & Err.Number & " " & Err.Description
End Function

' VBA-8 : les notes « une fois » redites par chaque macro
Public Function BancFormes(ByVal chemin As String) As String
    Dim r As String
    On Error GoTo E
    ReglerFaux "1", False
    DessinerPaquetFichier chemin, True
    FixerReglage "SondeFolio", "1"
    SondeFolio
    r = "SondeFolio : Formes " & JournalContient("V5 rend") & ", Collections " & JournalContient("manière qui marche")
    EssaiSymboles
    r = r & " | EssaiSymboles ensuite : Formes " & JournalContient("V5 rend") & ", Collections " & JournalContient("manière qui marche")
    BancFormes = r
    Exit Function
E:
    BancFormes = r & " ERREUR VBA " & Err.Number & " " & Err.Description
End Function

' C6, C7 : simulation avec SEE joignable, sans réglage Cartouche, et un projet à ouvrir
Public Function BancSimulationZone(ByVal chemin As String) As String
    Dim r As String, n0 As Long
    On Error GoTo E
    ReglerFaux "1-2", False
    DessinerPaquetFichier chemin, True
    FixerReglage "Simulation", "O"
    FixerReglage "Cartouche", ""
    FixerReglage "Folios", "3-4"
    FixerReglage "Projet", "C:\Projets\AUTRE.prj"
    n0 = gTrace.Count
    DessinerPaquetFichier chemin, True
    r = "zone provisoire dite " & JournalContient("PROVISOIRE") & " ; 390 x 250 " & JournalContient("390 x 250") & _
        " ; ouvertures " & Compter("OpenProject|") & " (lecture seule : " & Compter("OpenProject|C:\Projets\AUTRE.prj|True") & ")" & _
        " ; écritures pendant la simulation " & (gTrace.Count - n0 - Compter("OpenProject|"))
    FixerReglage "Projet", ""
    Set gApp = Nothing
    DessinerPaquetFichier chemin, True
    r = r & " | sans SEE : coordonnées provisoires dites " & JournalContient("PROVISOIRES")
    BancSimulationZone = r
    Exit Function
E:
    BancSimulationZone = r & " ERREUR VBA " & Err.Number & " " & Err.Description & " (étape " & gEtape & " / " & gObjet & ")"
End Function

' C10 : FolioEssai nomme un vrai folio
Public Function BancEssaiExistant(ByVal chemin As String) As String
    Dim n0 As Long
    On Error GoTo E
    ReglerFaux "1", False
    DessinerPaquetFichier chemin, True
    FixerReglage "FolioEssai", "1"
    n0 = gTrace.Count
    EssaiDessin
    BancEssaiExistant = "DeleteSheet " & Compter("DeleteSheet|") & " ; dessine dedans " & JournalContient("on dessine dans le folio existant") & _
        " ; folios " & NomsDesFoliosSEE()
    Exit Function
E:
    BancEssaiExistant = "ERREUR VBA " & Err.Number & " " & Err.Description
End Function

' VBA-1 : une valeur de réglage gardée avec son apostrophe
Public Function BancApostrophe() As String
    Dim ws As Object, i As Long, r As String
    On Error GoTo E
    gSansDialogue = True
    InitialiserClasseur
    Set ws = ThisWorkbook.Worksheets("Reglages")
    For i = 2 To 400
        If CStr(ws.Cells(i, 1).Value) = "Simulation" Then
            r = "écrit par InitialiserClasseur : [" & CStr(ws.Cells(i, 2).Value) & "]"
            ws.Cells(i, 2).Value = "''N"
            r = r & " ; cellule forcée : [" & CStr(ws.Cells(i, 2).Value) & "]"
        End If
    Next i
    ChargerReglages
    r = r & " ; Simulation lue : " & IIf(gSimulation, "O", "N") & " ; Mode lu : [" & Reglage("Mode", "") & "]"
    BancApostrophe = r
    Exit Function
E:
    BancApostrophe = r & " ERREUR VBA " & Err.Number & " " & Err.Description
End Function

Public Function BancBilan(ByVal chemin As String) As String
    Dim r As String, ws As Object
    On Error GoTo E
    ReglerFaux "1", False
    DessinerPaquetFichier chemin, True
    Set ws = ThisWorkbook.Worksheets("Bilan")
    r = "après 1 : " & EtatsBilan() & " DerniereLigne=" & DerniereLigne(ws, 1) & " A2=[" & CStr(ws.Cells(2, 1).Value) & "] B2=[" & CStr(ws.Cells(2, 2).Value) & "]"
    FixerReglage "Folios", "2"
    DessinerPaquetFichier chemin, True
    r = r & " | après 2 : " & EtatsBilan() & " DerniereLigne=" & DerniereLigne(ws, 1)
    BancBilan = r
    Exit Function
E:
    BancBilan = r & " ERREUR VBA " & Err.Number & " " & Err.Description
End Function

Public Function BancBilan2(ByVal chemin As String, ByVal sauverTous As String) As String
    Dim ws As Object
    On Error GoTo E
    ReglerFaux "1-2", False
    FixerReglage "SauverTous", sauverTous
    DessinerPaquetFichier chemin, True
    Set ws = ThisWorkbook.Worksheets("Bilan")
    BancBilan2 = EtatsBilan() & " DerniereLigne=" & DerniereLigne(ws, 1)
    Exit Function
E:
    BancBilan2 = " ERREUR VBA " & Err.Number & " " & Err.Description
End Function

Public Function BancBilan3(ByVal chemin As String, ByVal folios As String, ByVal ordres As Boolean) As String
    Dim ws As Object
    On Error GoTo E
    ReglerFaux folios, False
    If ordres Then
        FixerReglage "Fil.Ordre", "{Num}"
        FixerReglage "Repere.Ordre", "{Num}"
    End If
    DessinerPaquetFichier chemin, True
    Set ws = ThisWorkbook.Worksheets("Bilan")
    BancBilan3 = EtatsBilan() & " DerniereLigne=" & DerniereLigne(ws, 1)
    Exit Function
E:
    BancBilan3 = " ERREUR VBA " & Err.Number & " " & Err.Description
End Function

' VBA-7 : une unité rendue en texte
Public Function BancUnite() As String
    Dim ws As Object, i As Long, r As String
    On Error GoTo E
    ReglerFaux "1", False
    gUniteTexte = True
    SondeApplication
    Set ws = ThisWorkbook.Worksheets("Sonde_Application")
    For i = 1 To 40
        If Left(CStr(ws.Cells(i, 2).Value), 4) = "Unit" Then r = r & CStr(ws.Cells(i, 2).Value) & " = " & CStr(ws.Cells(i, 3).Value) & " ; "
    Next i
    BancUnite = r
    Exit Function
E:
    BancUnite = r & " ERREUR VBA " & Err.Number & " " & Err.Description
End Function
