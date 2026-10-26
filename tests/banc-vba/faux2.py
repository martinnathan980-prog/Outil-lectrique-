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

# --- LE MATÉRIEL (le « device ») : ISEEEquipment (Class, Code, Quantity), créé par CreateObject(2)
#     (eSEEObjectEquipment) ; SetEquipmentCollection d'un symbole ou d'un connecteur (même signature en V5
#     et en V4 : la collection en entrée) tracé, avec ce que la collection contient ; GetEquipmentCollection
#     (V5 : rendue ; V4 : paramètre de sortie) rend ce qui a été associé. Le faux catalogue refuse les codes
#     qui commencent par gMaterielRefuse (« code absent du catalogue »).
rep('FauxSEE', 'Public gUniteTexte As Boolean\n', '''Public gUniteTexte As Boolean
Public gMaterielRefuse As String

' Le contenu d'une collection de matériels pour la trace (« Class;Code;Quantity », séparés par « , ») ;
' lève l'erreur du faux catalogue pour un code refusé.
Public Function MaterielsTrace(ByVal c As Object) As String
    Dim i As Long, s As String, e As Object
    If c Is Nothing Then Err.Raise 1100, , "SetEquipmentCollection sans collection"
    If c.Count = 0 Then Err.Raise 1102, , "SetEquipmentCollection : collection vide"
    For i = 1 To c.Count
        Set e = c.Item(i)
        If Len(gMaterielRefuse) > 0 Then
            If Left(e.Code, Len(gMaterielRefuse)) = gMaterielRefuse Then Err.Raise 1101, , "code absent du catalogue : " & e.Code
        End If
        If Len(e.Class) = 0 Then Err.Raise 1103, , "matériel sans classe"
        If i > 1 Then s = s & ","
        s = s & e.Texte
    Next i
    MaterielsTrace = s
End Function
''')
rep('FauxSEE', '''    gRelectureRatee = False
End Sub''', '''    gRelectureRatee = False
    gMaterielRefuse = ""
End Sub''')
rep('FauxSEE', '''        Case 4
            Set NouveauFaux = New FauxTag''', '''        Case 2
            Set NouveauFaux = New FauxMateriel
        Case 4
            Set NouveauFaux = New FauxTag''')
MOD['FauxMateriel'] = faux.CL + '''Private mC As String
Private mK As String
Private mQ As Variant
Public Property Let Class(ByVal s As String)
    mC = s
End Property
Public Property Get Class() As String
    Class = mC
End Property
Public Property Let Code(ByVal s As String)
    mK = s
End Property
Public Property Get Code() As String
    Code = mK
End Property
Public Property Let Quantity(ByVal q As Variant)
    mQ = q
End Property
Public Property Get Quantity() As Variant
    Quantity = mQ
End Property
Public Property Get Texte() As String
    Texte = mC & ";" & mK & ";" & mQ
End Property
'''
# le symbole : son folio (pour la trace), son matériel, son connecteur (une broche le connaît)
rep('FauxSymbole', 'Private mNbLectures As Long\n', '''Private mNbLectures As Long
Private mMats As Object
Private mCon As Object
Private mNomFolio As String
''')
rep('FauxSymbole', '''Public Sub Lier(ByVal s As String)
    mLien = s
End Sub''', '''Public Sub Lier(ByVal s As String)
    mLien = s
End Sub
Public Property Let NomFolio(ByVal s As String)
    mNomFolio = s
End Property
Public Sub LierConnecteur(ByVal c As Object)
    Set mCon = c
End Sub
Public Function GetConnector(Optional ByRef p As Variant) As Object
    Style "Symbol.GetConnector", Not IsMissing(p)
    If IsMissing(p) Then Set GetConnector = mCon Else Set p = mCon
End Function
Public Sub SetEquipmentCollection(ByVal c As Object)
    Dim s As String
    s = MaterielsTrace(c)
    Set mMats = c
    Trace "SetEquipmentCollection|Symbol|" & mNomFolio & "|" & mForme & "|" & Pos & "|" & s
End Sub
Public Function GetEquipmentCollection(Optional ByRef p As Variant) As Object
    Dim c As Object
    Style "Symbol.GetEquipmentCollection", Not IsMissing(p)
    If mMats Is Nothing Then Set c = New FauxColl Else Set c = mMats
    If IsMissing(p) Then Set GetEquipmentCollection = c Else Set p = c
End Function''')
rep('FauxFolio', '''    mNbSym = mNbSym + 1
    mSyms.Add sym''', '''    mNbSym = mNbSym + 1
    sym.NomFolio = mNom
    mSyms.Add sym''')
rep('FauxFolio', '''    sym.Lier con.Repere & ":" & nm.Name
    mSyms.Add sym''', '''    sym.Lier con.Repere & ":" & nm.Name
    sym.LierConnecteur con
    sym.NomFolio = mNom
    mSyms.Add sym''')
# le connecteur (et le bornier) : son matériel, son repère
rep('FauxConnecteur', 'Private mBroches As String\n', 'Private mBroches As String\nPrivate mMats As Object\n')
rep('FauxConnecteur', '''Public Sub AddTerminal(ByVal a As Object, ByVal b As Object)''', '''Public Sub SetEquipmentCollection(ByVal c As Object)
    Dim s As String
    s = MaterielsTrace(c)
    Set mMats = c
    Trace "SetEquipmentCollection|Connector|" & mRep & "|" & s
End Sub
Public Function GetEquipmentCollection(Optional ByRef p As Variant) As Object
    Dim c As Object
    Style "Connector.GetEquipmentCollection", Not IsMissing(p)
    If mMats Is Nothing Then Set c = New FauxColl Else Set c = mMats
    If IsMissing(p) Then Set GetEquipmentCollection = c Else Set p = c
End Function
Public Function GetTag(Optional ByRef p As Variant) As Object
    Dim t As Object
    Style "Connector.GetTag", Not IsMissing(p)
    Set t = New FauxTag
    t.SetManual Me, mRep, "", 0
    If IsMissing(p) Then Set GetTag = t Else Set p = t
End Function
Public Sub AddTerminal(ByVal a As Object, ByVal b As Object)''')
