Option VBASupport 1
Option Explicit
' Le faux SEE_Windows du banc LibreOffice : les MÊMES fonctions publiques que see/vba/SEE_Windows.bas (noms,
' paramètres : tests/vba.js le vérifie), qui ne demandent rien à Windows. LibreOffice ne connaît ni PtrSafe, ni
' StrPtr, ni WMI, et ses fenêtres bloqueraient le banc. Ce que Windows « répond » se règle par les variables gWin*
' (remises à zéro par InitWindows, que InitFaux appelle) ; chaque appel est noté dans gWinTrace (« Windows|... »),
' À PART de la trace du faux SEE (gTrace) : demander à Windows n'est pas écrire dans SEE.

Public gWinTrace As Collection        ' les appels, dans l'ordre : « Windows|new:|{CLSID} », « Windows|Processus|SEE.exe »...
Public gWinActifs As Collection       ' les noms (ProgID, ou « {CLSID} ») sous lesquels GetObject(, nom) trouve le SEE ouvert
Public gWinActifsCLSID As Collection  ' les CLSID sous lesquels GetActiveObject le trouve
Public gWinObjetActif As Object       ' le SEE ouvert (un FauxApp) ; Nothing : aucun
Public gWinCreables As Collection     ' les CLSID (new:) et ProgID (CreateObject) qui créent un objet SEE
Public gWinObjetCree As Object        ' l'objet rendu à la création (un FauxAuto) ; Nothing : un FauxAuto neuf
Public gWinValeurs As Collection      ' « CHEMIN|VALEUR » -> texte (le registre ; clés insensibles à la casse)
Public gWinCles As Collection         ' « CHEMIN » -> Collection des noms de ses sous-clés
Public gWinRegistreIllisible As Boolean
Public gWinNomExe As String           ' le nom du programme SEE que compte Win32_Process
Public gWinProcessus As Long          ' combien en tournent
Public gWinProcessusApresQuit As Long ' combien en tournent encore après Quit (FauxAuto.Quit)
Public gWinWMIMuet As Boolean         ' Win32_Process ne répond pas
Public gWinFichier As String          ' ce que rend ChoisirFichier : « = » le départ (le réglage Projet), "" Annuler, sinon ce chemin
Public gWinConfirme As Boolean        ' la réponse aux questions OK / Annuler (ConfirmerOK)

Public Sub InitWindows()
    Set gWinTrace = New Collection
    Set gWinActifs = New Collection
    Set gWinActifsCLSID = New Collection
    Set gWinObjetActif = Nothing
    Set gWinCreables = New Collection
    Set gWinObjetCree = Nothing
    Set gWinValeurs = New Collection
    Set gWinCles = New Collection
    gWinRegistreIllisible = False
    gWinNomExe = "SEE.exe"
    gWinProcessus = 0
    gWinProcessusApresQuit = 0
    gWinWMIMuet = False
    gWinFichier = "="
    gWinConfirme = True
End Sub

Private Sub Prete()
    If gWinTrace Is Nothing Then InitWindows
End Sub

Private Sub TraceWin(ByVal s As String)
    Prete
    gWinTrace.Add "Windows|" & s
End Sub

Public Function CompterWin(ByVal prefixe As String) As Long
    Dim i As Long, n As Long
    Prete
    For i = 1 To gWinTrace.Count
        If Left(gWinTrace.Item(i), Len(prefixe)) = prefixe Then n = n + 1
    Next i
    CompterWin = n
End Function

Private Function Dans(ByVal c As Collection, ByVal nom As String) As Boolean
    Dim v As Variant
    If c Is Nothing Then Exit Function
    For Each v In c
        If UCase(CStr(v)) = UCase(nom) Then Dans = True
    Next v
End Function

' --- ce que le banc règle
Public Sub ActifFaux(ByVal nom As String)
    Prete
    gWinActifs.Add nom
End Sub
Public Sub ActifCLSIDFaux(ByVal clsid As String)
    Prete
    gWinActifsCLSID.Add clsid
End Sub
Public Sub CreableFaux(ByVal nom As String)
    Prete
    gWinCreables.Add nom
End Sub
' Une valeur du registre (valeur = "" : la valeur par défaut) ; la clé et ses parents existent.
Public Sub RegistreFaux(ByVal chemin As String, ByVal valeur As String, ByVal texte As String)
    Prete
    AjouterCle chemin
    On Error Resume Next
    gWinValeurs.Remove UCase(chemin & "|" & valeur)
    On Error GoTo 0
    gWinValeurs.Add texte, UCase(chemin & "|" & valeur)
End Sub

Private Function CleExiste(ByVal cle As String) As Boolean
    Dim c As Object
    On Error GoTo Non
    Set c = gWinCles.Item(UCase(cle))
    CleExiste = True
    Exit Function
Non:
    CleExiste = False
End Function

Private Sub AjouterCle(ByVal chemin As String)
    Dim parts As Variant, i As Long, cle As String, parent As String, c As Collection
    parts = Split(chemin, "\")
    cle = parts(0)
    If Not CleExiste(cle) Then
        Set c = New Collection
        gWinCles.Add c, UCase(cle)
    End If
    For i = 1 To UBound(parts)
        parent = cle
        cle = cle & "\" & parts(i)
        If Not CleExiste(cle) Then
            Set c = New Collection
            gWinCles.Add c, UCase(cle)
            gWinCles.Item(UCase(parent)).Add parts(i)
        End If
    Next i
End Sub

' ============================================================================ les fonctions de SEE_Windows
Public Function ObjetActifParNom(ByVal nom As String, ByRef o As Object, ByRef code As Long, ByRef texte As String) As Boolean
    TraceWin "GetObject(,|" & nom
    Set o = Nothing
    code = 0
    texte = ""
    If Dans(gWinActifs, nom) And Not gWinObjetActif Is Nothing Then
        Set o = gWinObjetActif
        ObjetActifParNom = True
    Else
        code = 429
        texte = "ActiveX component can't create object (faux Windows)"
    End If
End Function

Public Function ObjetActifParCLSID(ByVal clsid As String, ByRef o As Object, ByRef code As Long, ByRef texte As String) As Boolean
    TraceWin "GetActiveObject|" & clsid
    Set o = Nothing
    code = 0
    texte = ""
    If Dans(gWinActifsCLSID, clsid) And Not gWinObjetActif Is Nothing Then
        Set o = gWinObjetActif
        ObjetActifParCLSID = True
    Else
        code = &H800401E3
        texte = "GetActiveObject"
    End If
End Function

Public Function ObjetNouveauParCLSID(ByVal clsid As String, ByRef o As Object, ByRef code As Long, ByRef texte As String) As Boolean
    TraceWin "new:|" & clsid
    ObjetNouveauParCLSID = Creer(clsid, o, code, texte)
End Function

Public Function ObjetCreeParNom(ByVal nom As String, ByRef o As Object, ByRef code As Long, ByRef texte As String) As Boolean
    TraceWin "CreateObject|" & nom
    ObjetCreeParNom = Creer(nom, o, code, texte)
End Function

' Un objet SEE créé : un SEE de plus tourne (le faux SeeAutomation) ; sinon « classe non inscrite ».
Private Function Creer(ByVal nom As String, ByRef o As Object, ByRef code As Long, ByRef texte As String) As Boolean
    Set o = Nothing
    code = 0
    texte = ""
    If Not Dans(gWinCreables, nom) Then
        code = &H80040154
        texte = "Classe non enregistrée (faux Windows)"
        Exit Function
    End If
    If gWinObjetCree Is Nothing Then Set gWinObjetCree = New FauxAuto
    Set o = gWinObjetCree
    gWinProcessus = gWinProcessus + 1
    Creer = True
End Function

Public Function RegistreTexte(ByVal chemin As String, ByVal valeur As String, ByRef texte As String, ByRef erreur As String) As Boolean
    texte = ""
    erreur = ""
    Prete
    If gWinRegistreIllisible Then
        erreur = "WMI refusé : -2147217405 Accès refusé (panne simulée)"
        Exit Function
    End If
    On Error GoTo Absente
    texte = gWinValeurs.Item(UCase(chemin & "|" & valeur))
    RegistreTexte = True
    Exit Function
Absente:
    texte = ""
    erreur = "absente"
End Function

Public Function RegistreSousCles(ByVal chemin As String, ByRef noms As Collection, ByRef erreur As String) As Boolean
    Dim v As Variant
    Set noms = New Collection
    erreur = ""
    Prete
    If gWinRegistreIllisible Then
        erreur = "WMI refusé : -2147217405 Accès refusé (panne simulée)"
        Exit Function
    End If
    If Not CleExiste(chemin) Then
        erreur = "absente"
        Exit Function
    End If
    For Each v In gWinCles.Item(UCase(chemin))
        noms.Add CStr(v)
    Next v
    RegistreSousCles = True
End Function

Public Function ProcessusEnCours(ByVal nomExe As String, ByRef nb As Long, ByRef erreur As String) As Boolean
    TraceWin "Processus|" & nomExe
    nb = 0
    erreur = ""
    If gWinWMIMuet Then
        erreur = "WMI refusé : -2147217405 Accès refusé (panne simulée)"
        Exit Function
    End If
    If UCase(nomExe) = UCase(gWinNomExe) Then nb = gWinProcessus
    ProcessusEnCours = True
End Function

Public Sub Patienter(ByVal secondes As Long)
    TraceWin "Patienter|" & secondes
End Sub

Public Function ChoisirFichier(ByVal filtre As String, ByVal titre As String, ByVal depart As String) As String
    TraceWin "ChoisirFichier|" & titre
    If gWinFichier = "=" Then ChoisirFichier = depart Else ChoisirFichier = gWinFichier
End Function

Public Function ConfirmerOK(ByVal message As String, ByVal titre As String) As Boolean
    TraceWin "Question|" & titre
    Journal "Dialogue", titre, "", Replace(message, vbCrLf, " / ") & " -> " & IIf(gWinConfirme, "OK", "Annuler")
    ConfirmerOK = gWinConfirme
End Function
