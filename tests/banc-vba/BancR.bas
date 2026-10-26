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

' ---------------------------------------------------------------------------- le matériel (le « device »)
' La somme d'une colonne du bilan (14 : Materiels).
Public Function SommeBilan(ByVal col As Long) As Long
    Dim ws As Object, i As Long, s As Long
    Set ws = ThisWorkbook.Worksheets("Bilan")
    For i = 2 To 40
        If Len(CStr(ws.Cells(i, 2).Value)) > 0 Then s = s + Val(CStr(ws.Cells(i, col).Value))
    Next i
    SommeBilan = s
End Function

' Les lignes de la section « Matériel associé » d'une feuille de sonde : « n (corps a, connecteurs b) ».
Public Function LignesMateriel(ByVal feuille As String) As String
    Dim ws As Object, i As Long, debut As Long, nSym As Long, nCon As Long
    Set ws = ThisWorkbook.Worksheets(feuille)
    For i = 1 To 5000
        If Left(CStr(ws.Cells(i, 1).Value), 16) = "Matériel associé" Then
            debut = i + 2
            Exit For
        End If
    Next i
    If debut = 0 Then
        LignesMateriel = "section absente"
        Exit Function
    End If
    For i = debut To debut + 5000
        If CStr(ws.Cells(i, 2).Value) = "symbole" Then
            nSym = nSym + 1
        ElseIf CStr(ws.Cells(i, 2).Value) = "connecteur" Then
            nCon = nCon + 1
        Else
            Exit For
        End If
    Next i
    LignesMateriel = (nSym + nCon) & " (corps " & nSym & ", connecteurs " & nCon & ")"
End Function

' Le matériel : le corps des équipements (BROCHE, boîte FAM/BOITE) et des masses (sans PN), les barrettes
' (BORNIER, corps dessiné : PN non associé), les connecteurs des équipements et des prises. Le faux
' catalogue refuse les codes qui commencent par « * ». Puis la sonde du folio 1 relit le matériel, puis
' une simulation (Remplacer = O) : aucune écriture dans SEE, chaque association dite au journal.
' verifier.py --materiel calcule ce qui est attendu, depuis le paquet.
Public Function BancMateriel(ByVal chemin As String, ByVal v4 As Boolean) As String
    Dim r As String, n0 As Long
    On Error GoTo E
    ReglerFaux "*", v4
    FixerReglage "EQUIPEMENT.ClasseMateriel", "CL_EQUIPEMENT"
    FixerReglage "EQUIPEMENT.ClasseConnecteur", "CL_CONNECTEUR"
    FixerReglage "PRISE.ClasseConnecteur", "CL_CONNECTEUR"
    FixerReglage "MASSE.ClasseMateriel", "CL_MASSE"
    FixerReglage "BARRETTE.ClasseMateriel", "CL_BARRETTE"
    FixerReglage "MaterielQuantite", "1"
    gMaterielRefuse = "*"
    DessinerPaquetFichier chemin, True
    EcrireTrace
    r = "V" & gVersionAPI & " ; erreurs " & gNbErreurs & " ; folios SEE " & NomsDesFoliosSEE() & " ; bilan " & EtatsBilan() & _
        " ; associations " & Compter("SetEquipmentCollection|") & " (corps " & Compter("SetEquipmentCollection|Symbol|") & _
        ", connecteurs " & Compter("SetEquipmentCollection|Connector|") & ")" & _
        " ; refus dits " & JournalContient("code absent du catalogue") & _
        " ; corps sans PN dits " & JournalContient("pas de PN dans la feuille Blocs") & _
        " ; connecteurs sans PN dits " & JournalContient("pas de PN dans la feuille Connecteurs") & _
        " ; corps dessinés dits " & JournalContient("matériel sans symbole") & _
        " ; PN différents dits " & JournalContient("PN différent pour un même connecteur") & _
        " ; non relus " & JournalContient("matériel non relu") & _
        " ; relectures différentes " & JournalContient("relecture différente") & _
        " ; matériels au bilan " & SommeBilan(14)
    ' la sonde du folio 1 relit le matériel des corps et des connecteurs (lecture seule)
    FixerReglage "SondeFolio", "1"
    n0 = gTrace.Count
    SondeFolio
    r = r & " | sonde : matériels relus " & LignesMateriel("Sonde_Folio") & " ; écritures pendant la sonde " & (gTrace.Count - n0)
    ' simulation : aucune écriture, chaque association dite
    FixerReglage "Simulation", "O"
    FixerReglage "Remplacer", "O"
    n0 = gTrace.Count
    DessinerPaquetFichier chemin, True
    r = r & " | simulation : écritures " & (gTrace.Count - n0) & " ; associations simulées " & JournalContient(".SetEquipmentCollection") & _
        " ; déjà associés " & JournalContient("déjà associé") & " ; bilan " & EtatsBilan()
    BancMateriel = r
    Exit Function
E:
    BancMateriel = r & " ERREUR VBA " & Err.Number & " " & Err.Description & " (étape " & gEtape & " / " & gObjet & ")"
End Function

' ---------------------------------------------------------------------------- le matériel DÉJÀ porté (MaterielExistant)
' Les traces du faux SEE depuis la n0-ième qui commencent par prefixe.
Public Function CompterDepuis(ByVal prefixe As String, ByVal n0 As Long) As Long
    Dim i As Long, n As Long
    For i = n0 + 1 To gTrace.Count
        If Left(gTrace.Item(i), Len(prefixe)) = prefixe Then n = n + 1
    Next i
    CompterDepuis = n
End Function

' Le matériel d'un faux connecteur : « Class;Code;Quantity » séparés par « , » (lu comme SEE le rend, en V5).
Public Function Mats(ByVal c As Object) As String
    Dim m As Object, i As Long, s As String
    Set m = c.GetEquipmentCollection()
    If m Is Nothing Then
        Mats = "Nothing"
        Exit Function
    End If
    For i = 1 To m.Count
        If i > 1 Then s = s & ","
        s = s & m.Item(i).Texte
    Next i
    Mats = s
End Function

Public Function PremierCode(ByVal c As Object) As String
    Dim m As Object, e As Object
    Set m = c.GetEquipmentCollection()
    Set e = m.Item(1)
    PremierCode = e.Code
End Function

Public Function NbMats(ByVal c As Object) As Long
    Dim m As Object
    Set m = c.GetEquipmentCollection()
    If Not m Is Nothing Then NbMats = m.Count
End Function

' Pose « à la main » des matériels sur un faux connecteur : paires = Array(classe, code, classe, code…).
Public Sub PoserMateriels(ByVal c As Object, ByVal paires As Variant)
    Dim coll As Object, e As Object, i As Long
    Set coll = NouveauFaux(1)
    For i = LBound(paires) To UBound(paires) Step 2
        Set e = NouveauFaux(2)
        e.Class = paires(i)
        e.Code = paires(i + 1)
        e.Quantity = 1
        coll.Add e
    Next i
    c.SetEquipmentCollection coll
End Sub

' Un connecteur repris du projet qui porte DÉJÀ un matériel (un folio fait à la main, une exécution d'avant) :
' rien n'est écrasé ni doublé. Le folio 1 est dessiné une fois (ses connecteurs reçoivent leur PN), puis trois de
' ses connecteurs reçoivent « à la main » : c1 un autre matériel, c2 le sien et un accessoire, c3 un accessoire.
' Puis : une simulation (GARDER) ; GARDER (rien n'est écrit sur eux) ; AJOUTER (c1 et c3 reçoivent leur PN EN
' PLUS, c2 ne bouge pas) ; une relance en AJOUTER (aucun doublon) ; REMPLACER sur c1 remis à la main ; une
' lecture du matériel qui échoue (GARDER : rien n'est écrit à l'aveugle). Remplacer = O : le folio est redessiné
' à chaque passage, ses connecteurs sont repris du projet.
Public Function BancMaterielExistant(ByVal chemin As String) As String
    Dim r As String, n0 As Long, o As Variant, c1 As Object, c2 As Object, c3 As Object, n As Long
    Dim pn1 As String, pn2 As String, pn3 As String, avant As String, a2 As String
    On Error GoTo E
    ReglerFaux "1", False
    FixerReglage "EQUIPEMENT.ClasseConnecteur", "CL_CONNECTEUR"
    FixerReglage "PRISE.ClasseConnecteur", "CL_CONNECTEUR"
    DessinerPaquetFichier chemin, True
    For Each o In gConnecteurs
        If NbMats(o) > 0 Then
            n = n + 1
            If n = 1 Then Set c1 = o
            If n = 2 Then Set c2 = o
            If n = 3 Then Set c3 = o
        End If
    Next o
    r = "connecteurs avec matériel " & n & " ; " & c1.Repere & ", " & c2.Repere & ", " & c3.Repere
    pn1 = PremierCode(c1)
    pn2 = PremierCode(c2)
    pn3 = PremierCode(c3)
    PoserMateriels c1, Array("CL_AUTRE", "MAIN-1")
    PoserMateriels c2, Array("CL_CONNECTEUR", pn2, "CL_ACCESSOIRE", "ACC-2")
    PoserMateriels c3, Array("CL_ACCESSOIRE", "ACC-3")
    avant = Mats(c1) & " / " & Mats(c2) & " / " & Mats(c3)
    a2 = Mats(c2)
    FixerReglage "Remplacer", "O"
    ' 1. simulation (GARDER, le défaut) : rien n'est écrit ; ce qu'ils portent est lu et dit
    FixerReglage "Simulation", "O"
    n0 = gTrace.Count
    DessinerPaquetFichier chemin, True
    r = r & " | simulation GARDER : écritures " & (gTrace.Count - n0) & " ; gardés " & JournalContient("matériel existant gardé") & _
        " ; déjà associés " & JournalContient("déjà associé") & " ; associations simulées " & JournalContient("Connector.SetEquipmentCollection")
    ' 2. GARDER : rien n'est écrit sur les connecteurs qui portent déjà un matériel
    FixerReglage "Simulation", "N"
    n0 = gTrace.Count
    DessinerPaquetFichier chemin, True
    r = r & " | GARDER : associations " & CompterDepuis("SetEquipmentCollection|Connector|", n0) & " ; gardés " & _
        JournalContient("matériel existant gardé") & " ; déjà associés " & JournalContient("déjà associé") & _
        " ; inchangés " & IIf(Mats(c1) & " / " & Mats(c2) & " / " & Mats(c3) = avant, "oui", "non : " & Mats(c1) & " / " & Mats(c3))
    ' 3. AJOUTER : c1 et c3 reçoivent leur PN en plus de ce qu'ils portent ; c2 l'a déjà
    FixerReglage "MaterielExistant", "AJOUTER"
    n0 = gTrace.Count
    DessinerPaquetFichier chemin, True
    r = r & " | AJOUTER : associations " & CompterDepuis("SetEquipmentCollection|Connector|", n0) & _
        " ; c1 ajouté " & IIf(Mats(c1) = "CL_AUTRE;MAIN-1;1,CL_CONNECTEUR;" & pn1 & ";1", "oui", "non : " & Mats(c1)) & _
        " ; c2 inchangé " & IIf(Mats(c2) = a2, "oui", "non : " & Mats(c2)) & _
        " ; c3 ajouté " & IIf(Mats(c3) = "CL_ACCESSOIRE;ACC-3;1,CL_CONNECTEUR;" & pn3 & ";1", "oui", "non : " & Mats(c3)) & _
        " ; perdus " & JournalContient("matériel existant perdu") & " ; relectures différentes " & JournalContient("relecture différente") & _
        " ; non relus " & JournalContient("matériel non relu")
    ' 4. une relance en AJOUTER : tout y est déjà, rien n'est écrit, aucun doublon
    n0 = gTrace.Count
    DessinerPaquetFichier chemin, True
    r = r & " | relance AJOUTER : associations " & CompterDepuis("SetEquipmentCollection|Connector|", n0) & _
        " ; matériels " & NbMats(c1) & " " & NbMats(c2) & " " & NbMats(c3)
    ' 5. REMPLACER : c1, remis à la main, ne garde que le PN du paquet
    PoserMateriels c1, Array("CL_AUTRE", "MAIN-1")
    FixerReglage "MaterielExistant", "REMPLACER"
    n0 = gTrace.Count
    DessinerPaquetFichier chemin, True
    r = r & " | REMPLACER : associations " & CompterDepuis("SetEquipmentCollection|Connector|", n0) & _
        " ; c1 seul PN " & IIf(Mats(c1) = "CL_CONNECTEUR;" & pn1 & ";1", "oui", "non : " & Mats(c1)) & _
        " ; retirés dits " & JournalContient("ils sont retirés")
    ' 6. la lecture de ce qu'ils portent échoue : GARDER n'écrit pas à l'aveugle
    PoserMateriels c1, Array("CL_AUTRE", "MAIN-1")
    FixerReglage "MaterielExistant", "GARDER"
    gMaterielsIllisibles = True
    n0 = gTrace.Count
    DessinerPaquetFichier chemin, True
    gMaterielsIllisibles = False
    r = r & " | illisible : associations " & CompterDepuis("SetEquipmentCollection|Connector|", n0) & _
        " ; illisibles dits " & JournalContient("matériel existant illisible") & _
        " ; c1 inchangé " & IIf(Mats(c1) = "CL_AUTRE;MAIN-1;1", "oui", "non : " & Mats(c1)) & " ; bilan " & EtatsBilan()
    BancMaterielExistant = r
    Exit Function
E:
    BancMaterielExistant = r & " ERREUR VBA " & Err.Number & " " & Err.Description & " (étape " & gEtape & " / " & gObjet & ")"
End Function

' ---------------------------------------------------------------------------- TesterSEE, le bouton du bureau
Public Function FeuilleExiste(ByVal nom As String) As Boolean
    Dim ws As Object
    For Each ws In ThisWorkbook.Worksheets
        If ws.Name = nom Then FeuilleExiste = True
    Next ws
End Function

Public Function NbReglages() As Long
    Dim ws As Object, i As Long, n As Long
    If Not FeuilleExiste("Reglages") Then Exit Function
    Set ws = ThisWorkbook.Worksheets("Reglages")
    For i = 2 To 1000
        If Len(CStr(ws.Cells(i, 1).Value)) > 0 Then n = n + 1
    Next i
    NbReglages = n
End Function

' Ce que dit la feuille Resultat_Test : « feuille 1 = … ; <rubrique> = <texte> ; <texte d'une ligne sans
' rubrique> ; … ; boîte de fin dite n ».
Public Function ResultatTest() As String
    Dim ws As Object, i As Long, s As String, rub As String, txt As String
    s = "feuille 1 = " & ThisWorkbook.Worksheets(1).Name
    If Not FeuilleExiste("Resultat_Test") Then
        ResultatTest = s & " ; Resultat_Test absente"
        Exit Function
    End If
    Set ws = ThisWorkbook.Worksheets("Resultat_Test")
    For i = 1 To 80
        rub = CStr(ws.Cells(i, 1).Value)
        txt = Replace(Replace(CStr(ws.Cells(i, 2).Value), " | ", " / "), " ; ", ", ")
        If Len(rub) > 0 Then
            s = s & " ; " & rub & " = " & txt
        ElseIf Len(txt) > 0 Then
            s = s & " ; " & txt
        End If
    Next i
    ResultatTest = s & " ; boîte de fin dite " & BoitesDeFin() & " ; boîte = " & DerniereBoite() & " ; Sonde_XML " & _
        IIf(FeuilleExiste("Sonde_XML"), "présente", "absente")
End Function

' Les boîtes du test (Dialogue « Test de SEE », dites au journal sous gSansDialogue).
Public Function BoitesDeFin() As Long
    Dim ws As Object, i As Long, n As Long
    Set ws = ThisWorkbook.Worksheets("Journal")
    For i = 2 To 30000
        If Len(CStr(ws.Cells(i, 1).Value)) = 0 Then Exit For
        If CStr(ws.Cells(i, 2).Value) = "Dialogue" And CStr(ws.Cells(i, 3).Value) = "Test de SEE" Then n = n + 1
    Next i
    BoitesDeFin = n
End Function

' Le texte de la dernière boîte du test (sans « ; » ni « | », qui séparent les morceaux du résultat).
Public Function DerniereBoite() As String
    Dim ws As Object, i As Long, s As String
    Set ws = ThisWorkbook.Worksheets("Journal")
    For i = 2 To 30000
        If Len(CStr(ws.Cells(i, 1).Value)) = 0 Then Exit For
        If CStr(ws.Cells(i, 2).Value) = "Dialogue" And CStr(ws.Cells(i, 3).Value) = "Test de SEE" Then s = CStr(ws.Cells(i, 5).Value)
    Next i
    DerniereBoite = Replace(Replace(Replace(s, " | ", " / "), " ; ", ", "), ";", ",")
End Function

' Les cellules des colonnes « Materiel (Class / Code / Quantity) » et « Materiel du connecteur » des symboles de
' Sonde_Folio : « #ERR n, Nothing m ».
Public Function ColonneMateriel() As String
    Dim ws As Object, i As Long, j As Long, c1 As Long, c2 As Long, nErr As Long, nRien As Long, v As String, k As Long
    Set ws = ThisWorkbook.Worksheets("Sonde_Folio")
    For i = 1 To 400
        If Left(CStr(ws.Cells(i, 1).Value), 19) = "Points de connexion" Then Exit For
        For j = 1 To 30
            If CStr(ws.Cells(i, j).Value) = "Materiel (Class / Code / Quantity)" Then c1 = j
            If CStr(ws.Cells(i, j).Value) = "Materiel du connecteur" Then c2 = j
        Next j
        For k = 1 To 2
            j = IIf(k = 1, c1, c2)
            If j > 0 Then
                v = CStr(ws.Cells(i, j).Value)
                If Left(v, 4) = "#ERR" Then nErr = nErr + 1
                If v = "(aucun : Nothing)" Then nRien = nRien + 1
            End If
        Next k
    Next i
    ColonneMateriel = "#ERR " & nErr & ", Nothing " & nRien
End Function

Private Function TesterAvecFaux(ByVal chemin As String, ByVal v4 As Boolean) As String
    Dim n0 As Long
    ReglerFaux "1-2", v4
    FixerReglage "EQUIPEMENT.ClasseMateriel", "CL_EQUIPEMENT"
    FixerReglage "EQUIPEMENT.ClasseConnecteur", "CL_CONNECTEUR"
    DessinerPaquetFichier chemin, True
    gSansDialogue = True
    n0 = gTrace.Count
    TesterSEE
    TesterAvecFaux = "écritures pendant le test " & (gTrace.Count - n0) & " ; " & ResultatTest()
End Function

' TesterSEE : d'abord sans SEE, sur le classeur neuf (il crée Reglages et Journal), puis avec le faux SEE,
' en V5 et en V4, après un lot de deux folios dessinés avec leur matériel : il n'écrit rien dans SEE, il
' produit Resultat_Test en tête du classeur, et sa seule boîte (celle de la fin) est dite au journal.
Public Function BancTester(ByVal chemin As String) As String
    Dim r As String
    On Error GoTo E
    r = "sans SEE : Reglages avant " & IIf(FeuilleExiste("Reglages"), "oui", "non")
    InitFaux False
    Set gApp = Nothing
    gEstAutomation = False
    gVersionAPI = 0
    gSansDialogue = True
    TesterSEE
    r = r & " ; réglages créés " & NbReglages() & " ; traces " & gTrace.Count & " ; " & ResultatTest()
    r = r & " | V5 : " & TesterAvecFaux(chemin, False)
    r = r & " | V4 : " & TesterAvecFaux(chemin, True)
    ' SEE joint, mais aucun folio affiché (aucun folio dans le faux projet) : la boîte dit de relancer
    ReglerFaux "1-2", False
    gSansDialogue = True
    TesterSEE
    r = r & " | sans folio : " & ResultatTest()
    ' SEE cesse de répondre quand la sélection est lue : les sondes suivantes sont sautées, aucune reconnexion
    ReglerFaux "1-2", False
    FixerReglage "EQUIPEMENT.ClasseMateriel", "CL_EQUIPEMENT"
    DessinerPaquetFichier chemin, True
    gSansDialogue = True
    gMuetALaSelection = True
    TesterSEE
    r = r & " | muet : reconnexions " & (JournalContient("GetObject(") + JournalContient("ne répond plus : nouvelle connexion")) & " ; " & ResultatTest()
    ' GetEquipmentCollection rend Nothing pour un objet sans matériel : ni « #ERR » ni vieille erreur dans la colonne
    ReglerFaux "1-2", False
    FixerReglage "EQUIPEMENT.ClasseMateriel", "CL_EQUIPEMENT"
    DessinerPaquetFichier chemin, True
    gSansDialogue = True
    gMaterielsNothing = True
    TesterSEE
    r = r & " | Nothing : colonne Materiel " & ColonneMateriel() & " ; " & ResultatTest()
    BancTester = r
    Exit Function
E:
    BancTester = r & " ERREUR VBA " & Err.Number & " " & Err.Description & " (étape " & gEtape & " / " & gObjet & ")"
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
