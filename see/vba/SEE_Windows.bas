Attribute VB_Name = "SEE_Windows"
' ============================================================================
'  SEE_Windows - ce que le pilote demande à Windows et à Excel, hors des
'  feuilles du classeur
' ----------------------------------------------------------------------------
'  Rien ici ne s'arrête sur une erreur : elle est rendue à l'appelant (son
'  code et son texte).
'    REJOINDRE un programme déjà ouvert (rien ne démarre : GetObject(, nom)
'    et GetActiveObject ne font que chercher dans la table des objets actifs) :
'        ObjetActifParNom      GetObject(, nom) : un ProgID, ou « {CLSID} » ;
'        ObjetActifParCLSID    GetActiveObject (oleaut32) par le CLSID, sans
'                              passer par aucun ProgID. Aucun pointeur brut,
'                              aucun appel par vtable : Windows remplit une
'                              variable IUnknown, et c'est l'affectation
'                              Set o = punk qui demande IDispatch.
'    CRÉER un objet SEE (le bouton 3, après ses vérifications ; et l'essai
'    volontaire LancerSEE = O des macros lancées par Alt+F8) :
'        ObjetNouveauParCLSID  GetObject("new:{CLSID}") ;
'        ObjetCreeParNom       CreateObject(ProgID).
'    LIRE, jamais écrire, par WMI :
'        RegistreTexte, RegistreSousCles   le registre (StdRegProv) ;
'        ProcessusEnCours                   les programmes en marche (Win32_Process).
'    ATTENDRE (Patienter), et les FENÊTRES du bouton 3 : ChoisirFichier (la
'    fenêtre « Ouvrir » d'Excel), ConfirmerOK (OK / Annuler, Annuler par défaut).
'  Jamais GetObject d'un fichier : il pourrait démarrer SEE.
'  Declare PtrSafe et LongPtr : Office 2010 et plus, 32 comme 64 bits.
'  Le banc LibreOffice (tests/banc-vba) remplace tout ce module par un faux
'  (FauxWindows.bas, mêmes fonctions publiques) : LibreOffice ne connaît ni
'  PtrSafe, ni StrPtr, ni WMI, et ses fenêtres bloqueraient le banc.
' ============================================================================
Option Explicit

' Le CLSID est passé par le premier octet d'un tableau de 16 octets (un GUID).
Private Declare PtrSafe Function CLSIDFromString Lib "ole32" (ByVal lpsz As LongPtr, ByRef pclsid As Byte) As Long
Private Declare PtrSafe Function GetActiveObject Lib "oleaut32" (ByRef rclsid As Byte, ByVal pvReserved As LongPtr, ByRef ppunk As IUnknown) As Long

Private mRegistre As Object           ' StdRegProv (WMI), obtenu une fois par session
Private mRegistreErreur As String     ' pourquoi il n'a pas pu l'être ("" : pas encore essayé, ou obtenu)

' ============================================================================
'  REJOINDRE UN PROGRAMME OUVERT
' ============================================================================

' GetObject(, nom) : le programme ouvert inscrit sous ce nom (ProgID, ou
' « {CLSID} ») dans la table des objets actifs. Vrai et l'objet ; sinon Faux,
' le numéro d'erreur de VBA (429...) ou le HRESULT, et sa description.
Public Function ObjetActifParNom(ByVal nom As String, ByRef o As Object, ByRef code As Long, ByRef texte As String) As Boolean
    On Error GoTo Echec
    Set o = Nothing
    code = 0
    texte = ""
    Set o = GetObject(, nom)
    ObjetActifParNom = Not (o Is Nothing)
    If o Is Nothing Then texte = "rien rendu (Nothing)"
    Exit Function
Echec:
    code = Err.Number
    texte = Err.Description
    Set o = Nothing
    ObjetActifParNom = False
End Function

' GetActiveObject(CLSID) : le programme ouvert inscrit sous ce CLSID dans la
' table des objets actifs. Vrai et l'objet ; sinon Faux et le code : le
' HRESULT de Windows (800401E3 : rien sous ce CLSID dans la table), ou
' l'erreur de VBA (13, 430 : l'objet trouvé n'est pas un objet Automation).
Public Function ObjetActifParCLSID(ByVal clsid As String, ByRef o As Object, ByRef code As Long, ByRef texte As String) As Boolean
    Dim g(0 To 15) As Byte, punk As IUnknown, hr As Long
    On Error GoTo Echec
    Set o = Nothing
    code = 0
    texte = ""
    hr = CLSIDFromString(StrPtr(clsid), g(0))
    If hr <> 0 Then
        code = hr
        texte = "CLSID mal écrit (CLSIDFromString)"
        Exit Function
    End If
    hr = GetActiveObject(g(0), 0, punk)
    If hr <> 0 Then
        code = hr
        texte = "GetActiveObject"
        Exit Function
    End If
    If punk Is Nothing Then
        code = -1
        texte = "rien rendu (Nothing)"
        Exit Function
    End If
    ' l'affectation demande IDispatch (QueryInterface) : une erreur si l'objet ne se pilote pas
    Set o = punk
    ObjetActifParCLSID = Not (o Is Nothing)
    Exit Function
Echec:
    code = Err.Number
    texte = Err.Description
    Set o = Nothing
    ObjetActifParCLSID = False
End Function

' ============================================================================
'  CRÉER UN OBJET SEE - seulement le bouton 3 (SEE fermé, vérifié par
'  Windows) et l'essai volontaire LancerSEE = O des macros lancées par Alt+F8.
'  Un serveur « multi-use » rendrait un objet DANS un SEE déjà ouvert.
' ============================================================================

' GetObject("new:{CLSID}") : un objet neuf de cette coclasse. Vrai et l'objet ;
' sinon Faux, le code et sa description.
Public Function ObjetNouveauParCLSID(ByVal clsid As String, ByRef o As Object, ByRef code As Long, ByRef texte As String) As Boolean
    On Error GoTo Echec
    Set o = Nothing
    code = 0
    texte = ""
    Set o = GetObject("new:" & clsid)
    ObjetNouveauParCLSID = Not (o Is Nothing)
    If o Is Nothing Then texte = "rien rendu (Nothing)"
    Exit Function
Echec:
    code = Err.Number
    texte = Err.Description
    Set o = Nothing
    ObjetNouveauParCLSID = False
End Function

' CreateObject(ProgID) : un objet neuf de ce nom. Vrai et l'objet ; sinon
' Faux, le code et sa description.
Public Function ObjetCreeParNom(ByVal nom As String, ByRef o As Object, ByRef code As Long, ByRef texte As String) As Boolean
    On Error GoTo Echec
    Set o = Nothing
    code = 0
    texte = ""
    Set o = CreateObject(nom)
    ObjetCreeParNom = Not (o Is Nothing)
    If o Is Nothing Then texte = "rien rendu (Nothing)"
    Exit Function
Echec:
    code = Err.Number
    texte = Err.Description
    Set o = Nothing
    ObjetCreeParNom = False
End Function

' ============================================================================
'  LIRE LE REGISTRE (WMI, StdRegProv) - jamais d'écriture
'  Un chemin commence par sa racine : « HKCR\CLSID\{...}\LocalServer32 »,
'  « HKLM\SOFTWARE\Classes », « HKCU\SOFTWARE\Classes ».
' ============================================================================

' La valeur texte d'une clé (valeur = "" : la valeur par défaut). Vrai et le
' texte ; sinon Faux et pourquoi (« absente », « WMI refusé : ... »).
Public Function RegistreTexte(ByVal chemin As String, ByVal valeur As String, ByRef texte As String, ByRef erreur As String) As Boolean
    Dim racine As Long, cle As String, v As Variant, rc As Long
    texte = ""
    erreur = ""
    If Not OuvrirRegistre(erreur) Then Exit Function
    If Not CouperChemin(chemin, racine, cle) Then
        erreur = "racine inconnue : " & chemin
        Exit Function
    End If
    On Error GoTo Echec
    v = Null
    rc = mRegistre.GetStringValue(racine, cle, valeur, v)
    If rc <> 0 Or IsNull(v) Then
        ' une valeur REG_EXPAND_SZ (« %ProgramFiles%\... ») ne se lit pas comme un texte simple
        v = Null
        If mRegistre.GetExpandedStringValue(racine, cle, valeur, v) <> 0 Then v = Null
    End If
    If IsNull(v) Or IsEmpty(v) Then
        erreur = IIf(rc = 2, "absente", "absente ou illisible (code " & rc & ")")
        Exit Function
    End If
    texte = CStr(v)
    RegistreTexte = True
    Exit Function
Echec:
    erreur = "lecture refusée : " & Err.Number & " " & Err.Description
    RegistreTexte = False
End Function

' Les noms des sous-clés d'une clé (EnumKey). Vrai et les noms (une
' Collection, vide si la clé n'en a pas) ; sinon Faux et pourquoi.
Public Function RegistreSousCles(ByVal chemin As String, ByRef noms As Collection, ByRef erreur As String) As Boolean
    Dim racine As Long, cle As String, v As Variant, rc As Long, i As Long
    Set noms = New Collection
    erreur = ""
    If Not OuvrirRegistre(erreur) Then Exit Function
    If Not CouperChemin(chemin, racine, cle) Then
        erreur = "racine inconnue : " & chemin
        Exit Function
    End If
    On Error GoTo Echec
    v = Null
    rc = mRegistre.EnumKey(racine, cle, v)
    If rc <> 0 Then
        erreur = IIf(rc = 2, "absente", "illisible (code " & rc & ")")
        Exit Function
    End If
    If IsArray(v) Then
        For i = LBound(v) To UBound(v)
            noms.Add CStr(v(i))
        Next i
    End If
    RegistreSousCles = True
    Exit Function
Echec:
    erreur = "lecture refusée : " & Err.Number & " " & Err.Description
    RegistreSousCles = False
End Function

' Le fournisseur StdRegProv de WMI, obtenu une fois ; Faux et pourquoi s'il est refusé.
Private Function OuvrirRegistre(ByRef erreur As String) As Boolean
    If Not mRegistre Is Nothing Then
        OuvrirRegistre = True
        Exit Function
    End If
    If Len(mRegistreErreur) > 0 Then
        erreur = mRegistreErreur
        Exit Function
    End If
    On Error GoTo Echec
    Set mRegistre = GetObject("winmgmts:{impersonationLevel=impersonate}!\\.\root\default:StdRegProv")
    OuvrirRegistre = Not (mRegistre Is Nothing)
    If mRegistre Is Nothing Then
        mRegistreErreur = "WMI n'a rien rendu"
        erreur = mRegistreErreur
    End If
    Exit Function
Echec:
    mRegistreErreur = "WMI refusé : " & Err.Number & " " & Err.Description
    erreur = mRegistreErreur
    Set mRegistre = Nothing
    OuvrirRegistre = False
End Function

' « HKCR\CLSID\{...} » -> racine (HKEY_CLASSES_ROOT &H80000000...) et le reste du chemin.
Private Function CouperChemin(ByVal chemin As String, ByRef racine As Long, ByRef cle As String) As Boolean
    Dim p As Long, tete As String
    p = InStr(1, chemin, "\")
    If p = 0 Then
        tete = UCase$(chemin)
        cle = ""
    Else
        tete = UCase$(Left$(chemin, p - 1))
        cle = Mid$(chemin, p + 1)
    End If
    CouperChemin = True
    Select Case tete
        Case "HKCR"
            racine = &H80000000
        Case "HKCU"
            racine = &H80000001
        Case "HKLM"
            racine = &H80000002
        Case Else
            CouperChemin = False
    End Select
End Function

' ============================================================================
'  LES PROGRAMMES EN MARCHE (WMI, Win32_Process) - lecture seule
' ============================================================================

' Combien de programmes de ce nom (« SEE.exe ») tournent sur le poste. Vrai
' et nb si Windows a répondu ; sinon Faux et pourquoi.
Public Function ProcessusEnCours(ByVal nomExe As String, ByRef nb As Long, ByRef erreur As String) As Boolean
    Dim wmi As Object, liste As Object
    nb = 0
    erreur = ""
    On Error GoTo Echec
    Set wmi = GetObject("winmgmts:{impersonationLevel=impersonate}!\\.\root\cimv2")
    Set liste = wmi.ExecQuery("SELECT ProcessId FROM Win32_Process WHERE Name = '" & Replace(nomExe, "'", "\'") & "'")
    nb = liste.Count
    ProcessusEnCours = True
    Exit Function
Echec:
    erreur = "WMI refusé : " & Err.Number & " " & Err.Description
    nb = 0
    ProcessusEnCours = False
End Function

' ============================================================================
'  ATTENDRE, ET LES FENÊTRES DU BOUTON 3
' ============================================================================

' Attendre quelques secondes (Excel ne fait rien pendant ce temps).
Public Sub Patienter(ByVal secondes As Long)
    On Error Resume Next
    Application.Wait Now + TimeSerial(0, 0, secondes)
End Sub

' La fenêtre « Ouvrir » d'Excel (GetOpenFilename) : le chemin choisi, ou ""
' si le technicien annule. Elle s'ouvre dans le dossier de depart, s'il
' existe. Sous gSansDialogue (aucune fenêtre) : depart lui-même.
Public Function ChoisirFichier(ByVal filtre As String, ByVal titre As String, ByVal depart As String) As String
    Dim v As Variant, dossier As String, p As Long
    ChoisirFichier = ""
    If gSansDialogue Then
        ChoisirFichier = depart
        Exit Function
    End If
    ' le dossier courant d'Excel est celui où la fenêtre s'ouvre
    On Error Resume Next
    p = InStrRev(depart, "\")
    If p > 3 Then
        dossier = Left$(depart, p - 1)
        If Len(Dir$(dossier, vbDirectory)) > 0 Then
            If Mid$(dossier, 2, 1) = ":" Then ChDrive Left$(dossier, 1)
            ChDir dossier
        End If
    End If
    Err.Clear
    On Error GoTo Echec
    v = Application.GetOpenFilename(filtre, 1, titre)
    If VarType(v) = vbString Then ChoisirFichier = CStr(v)
    Exit Function
Echec:
    Journal "Fenêtre", titre, "Application.GetOpenFilename", "la fenêtre « Ouvrir » ne s'est pas ouverte", Err.Number, Err.Description
    ChoisirFichier = ""
End Function

' Une question OK / Annuler, ANNULER par défaut : Vrai seulement sur OK.
' Sous gSansDialogue, la boîte est dite au journal et la réponse est OK
' (Dialogue, SEE_Commun).
Public Function ConfirmerOK(ByVal message As String, ByVal titre As String) As Boolean
    ConfirmerOK = (Dialogue(message, vbOKCancel + vbQuestion + vbDefaultButton2, titre) = vbOK)
End Function
