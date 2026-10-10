# Le faux SEE du banc, étendu pour éprouver les constats de la relecture.
import faux
MOD = faux.MOD
def rep(mod, old, new):
    s = MOD[mod]
    assert s.count(old) == 1, (mod, old[:70])
    MOD[mod] = s.replace(old, new)
# --- les pannes que l'on peut demander
rep('FauxSEE', 'Public gJournalNormal As Boolean\n', '''Public gJournalNormal As Boolean
Public gSheetErreurSiAbsent As Boolean
Public gListeIllisible As Boolean
Public gRenommageRefuse As String
Public gSauverRate As Boolean
Public gRelectureRatee As Boolean
''')
rep('FauxSEE', '''    gNbFilsSEE = 0
End Sub''', '''    gNbFilsSEE = 0
    gSheetErreurSiAbsent = False
    gListeIllisible = False
    gRenommageRefuse = ""
    gSauverRate = False
    gRelectureRatee = False
End Sub''')
# GetSheetByName : peut lever une erreur pour un folio absent ; la liste des folios du groupe
rep('FauxGroupe', '''    For Each o In gFolios
        If o.Name = n Then Set r = o
    Next o
    If IsMissing(p) Then Set GetSheetByName = r Else Set p = r''', '''    For Each o In gFolios
        If o.Name = n Then Set r = o
    Next o
    If r Is Nothing And gSheetErreurSiAbsent Then Err.Raise 1070, , "folio introuvable : " & n
    If IsMissing(p) Then Set GetSheetByName = r Else Set p = r''')
rep('FauxGroupe', '''Public Sub AddSheet(ByRef sh As Object)''', '''Public Function GetSheetCollection(Optional ByRef p As Variant) As Object
    Dim c As Object, o As Variant
    Style "GetSheetCollection", Not IsMissing(p)
    If gListeIllisible Then Err.Raise 1071, , "liste des folios illisible"
    Set c = New FauxColl
    For Each o In gFolios
        c.Add o
    Next o
    If IsMissing(p) Then Set GetSheetCollection = c Else Set p = c
End Function
Public Sub AddSheet(ByRef sh As Object)''')
rep('FauxFolio', '''Public Sub Rename(ByVal n As String)
    mNom = n''', '''Public Sub Rename(ByVal n As String)
    If Len(gRenommageRefuse) > 0 Then
        If Left(n, Len(gRenommageRefuse)) = gRenommageRefuse Then Err.Raise 1080, , "nom refusé : " & n
    End If
    mNom = n''')
rep('FauxFolio', '''    Trace "AddSymbol|" & mNom & "|" & sym.Forme & "|" & sym.Pos''', '''    Trace "AddSymbol|" & mNom & "|" & sym.Forme & "|" & sym.Pos & "|" & sym.Angle''')
rep('FauxProjet', '''Public Sub Save()
    Trace "Save"''', '''Public Sub Save()
    If gSauverRate Then Err.Raise 1090, , "sauvegarde refusée"
    Trace "Save"''')
# la relecture du point de connexion après le recalage peut échouer
rep('FauxSymbole', 'Private mAngle As Double\n', 'Private mAngle As Double\nPrivate mNbLectures As Long\n')
rep('FauxSymbole', '''    Style "GetConnectionPointCollection", Not IsMissing(p)
    Set c = New FauxColl''', '''    Style "GetConnectionPointCollection", Not IsMissing(p)
    mNbLectures = mNbLectures + 1
    If gRelectureRatee And mNbLectures >= 2 Then Err.Raise 1095, , "relecture impossible (panne simulée)"
    Set c = New FauxColl''')
# OpenProject (lecture seule tracée)
rep('FauxApp', '''Public Property Get Workspace() As Object''', '''Public Function OpenProject(ByVal chemin As String, ByVal mdp As String, Optional ByRef a As Variant, Optional ByRef b As Variant) As Object
    If gMockV4 Then
        Trace "OpenProject|" & chemin & "|" & b
        Set a = gProjet
    Else
        Trace "OpenProject|" & chemin & "|" & a
        Set OpenProject = gProjet
    End If
End Function
Public Property Get Workspace() As Object''')
def modules():
    return list(MOD.items())
# un identifiant par folio : « Is » ne reconnaît pas l'objet rendu par le pilote dans LibreOffice
rep('FauxSEE', 'Public gRelectureRatee As Boolean\n', 'Public gRelectureRatee As Boolean\nPublic gIdFolio As Long\n')
rep('FauxFolio', '''Private Sub Class_Initialize()
    Set mSyms = New Collection''', '''Private mId As Long
Public Property Get NumeroFaux() As Long
    NumeroFaux = mId
End Property
Private Sub Class_Initialize()
    gIdFolio = gIdFolio + 1
    mId = gIdFolio
    Set mSyms = New Collection''')
rep('FauxGroupe', '''        If gFolios(i) Is sh Then gFolios.Remove i''', '''        If gFolios.Item(i).NumeroFaux = sh.NumeroFaux Then gFolios.Remove i''')
rep('FauxSEE', 'Public gIdFolio As Long\n', 'Public gIdFolio As Long\nPublic gUniteTexte As Boolean\n')
rep('FauxEnv', '''Public Property Get Unit() As Long
    Unit = 0
End Property''', '''Public Property Get Unit() As Variant
    If gUniteTexte Then Unit = "Inch" Else Unit = 0
End Property''')
