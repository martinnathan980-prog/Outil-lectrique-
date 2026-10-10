Option VBASupport 1
Option Explicit
' une panne au milieu d'un folio : DicoTest.Keys (une fois par folio, dans IndexerFolio) lève une erreur au n-ième appel
Public gPlanterKeys As Long
Public gNbKeys As Long
Public Sub FixerReglage(ByVal cle As String, ByVal valeur As String)
    Dim ws As Object, i As Long
    Set ws = ThisWorkbook.Worksheets("Reglages")
    For i = 2 To 400
        If CStr(ws.Cells(i, 1).Value) = cle Then
            ws.Cells(i, 2).Value = "'" & valeur
            Exit Sub
        End If
    Next i
End Sub
Public Function BancSimulation(ByVal chemin As String) As String
    On Error GoTo E
    gSansDialogue = True
    InitialiserClasseur
    FixerReglage "Folios", "*"
    FixerReglage "PasAPas", "N"
    FixerReglage "Simulation", "O"
    DessinerPaquetFichier chemin, True
    BancSimulation = "fini ; erreurs " & gNbErreurs
    Exit Function
E:
    BancSimulation = "ERREUR VBA " & Err.Number & " " & Err.Description & " (étape " & gEtape & " / " & gObjet & ")"
End Function
