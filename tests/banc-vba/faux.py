# Génère les modules du faux SEE (LibreOffice Basic, mode VBA) pour le banc.
# EcrireTrace écrit la trace dans chemins.TRACE (le dossier de travail, hors du dépôt).
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chemins import TRACE
CL = "Option VBASupport 1\nOption ClassModule\nOption Explicit\n"
MOD = {}
MOD['FauxSEE'] = '''Option VBASupport 1
Option Explicit
Public gMockV4 As Boolean
Public gTrace As Collection
Public gFolios As Collection
Public gConnecteurs As Collection
Public gProjet As Object
Public gEnv As Object
Public gGroupe As Object
Public gCartouche As Object
Public gDecalX As Double
Public gDecalY As Double
Public gExigerAddPin As Boolean
Public gNbFilsSEE As Long
Public gGarderSimulation As Boolean
Public gJournalNormal As Boolean

Public Sub InitFaux(ByVal v4 As Boolean)
    gMockV4 = v4
    Set gTrace = New Collection
    Set gFolios = New Collection
    Set gConnecteurs = New Collection
    Set gProjet = New FauxProjet
    Set gEnv = New FauxEnv
    Set gGroupe = New FauxGroupe
    Set gCartouche = New FauxCartouche
    gDecalX = 2.5
    gDecalY = -1
    gExigerAddPin = True
    gNbFilsSEE = 0
End Sub

Public Sub Trace(ByVal s As String)
    gTrace.Add s
End Sub

' Le style d'appel : V4 = paramètre de sortie, V5 = valeur rendue.
Public Sub Style(ByVal nom As String, ByVal aSortie As Boolean)
    If gMockV4 And Not aSortie Then Err.Raise 1001, , nom & " : V4 attend un paramètre de sortie"
    If (Not gMockV4) And aSortie Then Err.Raise 1002, , nom & " : V5 rend l'objet (pas de paramètre de sortie)"
End Sub

Public Function Pt(ByVal x As Double, ByVal y As Double) As Object
    Dim p As Object
    Set p = New FauxPoint
    p.X = x
    p.Y = y
    Set Pt = p
End Function

Public Function TxtPt(ByVal p As Object) As String
    TxtPt = Format(p.X, "0.000") & ";" & Format(p.Y, "0.000")
End Function

Public Function NouveauFaux(ByVal t As Long) As Object
    Dim g As Object
    Select Case t
        Case 0
            Set NouveauFaux = New FauxSymbole
        Case 1
            Set NouveauFaux = New FauxColl
        Case 4
            Set NouveauFaux = New FauxTag
        Case 7, 11, 17
            Set g = New FauxGraph
            g.Genre = t
            Set NouveauFaux = g
        Case 9
            Set NouveauFaux = New FauxFolio
        Case 12
            Set NouveauFaux = New FauxPoint
        Case 14
            Set NouveauFaux = New FauxNom
        Case 15, 16
            Set NouveauFaux = New FauxBroche
        Case 28, 29
            Set NouveauFaux = New FauxConnecteur
        Case 31
            Set NouveauFaux = New FauxCable
        Case Else
            Err.Raise 1003, , "type d'objet inconnu " & t
    End Select
End Function
'''
MOD['FauxApp'] = CL + '''Public Property Get ApplicationName() As String
    ApplicationName = "SEE Electrical Expert (faux)"
End Property
Public Property Get ApplicationVersion() As String
    If gMockV4 Then ApplicationVersion = "4.8" Else ApplicationVersion = "5.20"
End Property
Public Function GetProject(Optional ByRef p As Variant) As Object
    Style "GetProject", Not IsMissing(p)
    If IsMissing(p) Then Set GetProject = gProjet Else Set p = gProjet
End Function
Public Function GetEnvironment(Optional ByRef p As Variant) As Object
    Style "GetEnvironment", Not IsMissing(p)
    If IsMissing(p) Then Set GetEnvironment = gEnv Else Set p = gEnv
End Function
Public Function CreateObject(ByVal t As Long, Optional ByRef p As Variant) As Object
    Style "CreateObject", Not IsMissing(p)
    If IsMissing(p) Then Set CreateObject = NouveauFaux(t) Else Set p = NouveauFaux(t)
End Function
Public Property Get Workspace() As Object
    Set Workspace = New FauxWorkspace
End Property
'''
MOD['FauxProjet'] = CL + '''Public Property Get Name() As String
    Name = "PROJET_FAUX"
End Property
Public Function GetMainGroup(Optional ByRef p As Variant) As Object
    Style "GetMainGroup", Not IsMissing(p)
    If IsMissing(p) Then Set GetMainGroup = gGroupe Else Set p = gGroupe
End Function
Private Function ParRepere(ByVal tg As String) As Object
    Dim c As Object, o As Variant
    Set c = New FauxColl
    For Each o In gConnecteurs
        If o.Repere = tg Then c.Add o
    Next o
    Set ParRepere = c
End Function
Public Function GetConnectorsByTag(ByVal tg As String, Optional ByRef p As Variant) As Object
    Style "GetConnectorsByTag", Not IsMissing(p)
    If IsMissing(p) Then Set GetConnectorsByTag = ParRepere(tg) Else Set p = ParRepere(tg)
End Function
Public Function GetTerminalStripsByTag(ByVal tg As String, Optional ByRef p As Variant) As Object
    Style "GetTerminalStripsByTag", Not IsMissing(p)
    If IsMissing(p) Then Set GetTerminalStripsByTag = ParRepere(tg) Else Set p = ParRepere(tg)
End Function
Public Sub AddConnector(ByVal c As Object, ByVal tg As Object, Optional ByVal n As Long = -1)
    If tg Is Nothing Then Err.Raise 1010, , "AddConnector sans repère"
    c.Repere = tg.Label
    gConnecteurs.Add c
    Trace "AddConnector|" & tg.Label & "|" & n
End Sub
Public Sub AddTerminalStrip(ByVal c As Object, ByVal tg As Object)
    If tg Is Nothing Then Err.Raise 1011, , "AddTerminalStrip sans repère"
    c.Repere = tg.Label
    gConnecteurs.Add c
    Trace "AddTerminalStrip|" & tg.Label
End Sub
Public Function GetShape(ByVal f As String, ByVal n As String, Optional ByRef p As Variant) As Object
    Style "Project.GetShape", Not IsMissing(p)
    Err.Raise 1012, , "forme absente du projet : " & f & "/" & n
End Function
Public Function GetTitleBlockByName(ByVal n As String, Optional ByRef p As Variant) As Object
    Style "Project.GetTitleBlockByName", Not IsMissing(p)
    If n <> "A3" Then Err.Raise 1013, , "cartouche absent " & n
    If IsMissing(p) Then Set GetTitleBlockByName = gCartouche Else Set p = gCartouche
End Function
Public Sub Save()
    Trace "Save"
End Sub
Public Function GetAllSheets(Optional ByRef p As Variant) As Object
    Dim c As Object, o As Variant
    Style "GetAllSheets", Not IsMissing(p)
    Set c = New FauxColl
    For Each o In gFolios
        c.Add o
    Next o
    If IsMissing(p) Then Set GetAllSheets = c Else Set p = c
End Function
'''
MOD['FauxEnv'] = CL + '''Public Property Get Name() As String
    Name = "ENV_FAUX"
End Property
Public Property Get Unit() As Long
    Unit = 0
End Property
Public Function GetShape(ByVal f As String, ByVal n As String, Optional ByRef p As Variant) As Object
    Dim s As Object
    Style "Environment.GetShape", Not IsMissing(p)
    If f <> "FAM" Or (n <> "BOITE" And n <> "BROCHE" And n <> "BORNE" And n <> "MASSE") Then Err.Raise 1020, , "forme absente : " & f & "/" & n
    Set s = New FauxForme
    s.Name = n
    If IsMissing(p) Then Set GetShape = s Else Set p = s
End Function
Public Function GetShapeFamilyCollection(ByVal t As Long, Optional ByRef p As Variant) As Object
    Dim c As Object, f As Object
    Style "GetShapeFamilyCollection", Not IsMissing(p)
    Set c = New FauxColl
    If t = 1 Then
        Set f = New FauxFamille
        c.Add f
    End If
    If IsMissing(p) Then Set GetShapeFamilyCollection = c Else Set p = c
End Function
Public Function GetMethodsXML(ByVal t As Long, Optional ByRef p As Variant) As Variant
    Style "GetMethodsXML", Not IsMissing(p)
    If IsMissing(p) Then GetMethodsXML = "<methode type=""" & t & """/>" Else p = "<methode type=""" & t & """/>"
End Function
Public Function GetTitleBlockCollection(Optional ByRef p As Variant) As Object
    Dim c As Object
    Style "GetTitleBlockCollection", Not IsMissing(p)
    Set c = New FauxColl
    c.Add gCartouche
    If IsMissing(p) Then Set GetTitleBlockCollection = c Else Set p = c
End Function
Public Function GetTitleBlockByName(ByVal n As String, Optional ByRef p As Variant) As Object
    Style "Environment.GetTitleBlockByName", Not IsMissing(p)
    If IsMissing(p) Then Set GetTitleBlockByName = gCartouche Else Set p = gCartouche
End Function
'''
MOD['FauxGroupe'] = CL + '''Public Property Get Name() As String
    Name = "PRINCIPAL"
End Property
Public Function GetSheetByName(ByVal n As String, Optional ByRef p As Variant) As Object
    Dim o As Variant, r As Object
    Style "GetSheetByName", Not IsMissing(p)
    Set r = Nothing
    For Each o In gFolios
        If o.Name = n Then Set r = o
    Next o
    If IsMissing(p) Then Set GetSheetByName = r Else Set p = r
End Function
Public Sub AddSheet(ByRef sh As Object)
    gFolios.Add sh
    Trace "AddSheet"
End Sub
Public Sub DeleteSheet(ByVal sh As Object)
    Dim i As Long
    For i = gFolios.Count To 1 Step -1
        If gFolios(i) Is sh Then gFolios.Remove i
    Next i
    Trace "DeleteSheet|" & sh.Name
End Sub
Public Function CreateSubGroup(ByVal n As String, Optional ByRef p As Variant) As Object
    Style "CreateSubGroup", Not IsMissing(p)
    Trace "CreateSubGroup|" & n
    If IsMissing(p) Then Set CreateSubGroup = Me Else Set p = Me
End Function
Public Function GetSubGroupByName(ByVal n As String, Optional ByRef p As Variant) As Object
    Style "GetSubGroupByName", Not IsMissing(p)
    If IsMissing(p) Then Set GetSubGroupByName = Nothing Else Set p = Nothing
End Function
'''
MOD['FauxFolio'] = CL + '''Private mNom As String
Private mType As Long
Private mNbSym As Long
Private mNbGraph As Long
Private mSyms As Collection
Private mGraphs As Collection
Private Sub Class_Initialize()
    Set mSyms = New Collection
    Set mGraphs = New Collection
End Sub
Public Function GetSymbolCollection(Optional ByRef p As Variant) As Object
    Dim c As Object, o As Variant
    Style "GetSymbolCollection", Not IsMissing(p)
    Set c = New FauxColl
    For Each o In mSyms
        c.Add o
    Next o
    If IsMissing(p) Then Set GetSymbolCollection = c Else Set p = c
End Function
Public Function GetGraphicObjectCollection(ByVal t As Long, Optional ByRef p As Variant) As Object
    Dim c As Object, o As Variant, g As Long
    Style "GetGraphicObjectCollection", Not IsMissing(p)
    If t = 1 Then g = 7
    If t = 2 Then g = 11
    If t = 4 Then g = 17
    Set c = New FauxColl
    For Each o In mGraphs
        If o.Genre = g Then c.Add o
    Next o
    If IsMissing(p) Then Set GetGraphicObjectCollection = c Else Set p = c
End Function
Public Property Get Name() As String
    Name = mNom
End Property
Public Sub Rename(ByVal n As String)
    mNom = n
    Trace "Rename|" & n
End Sub
' (LibreOffice ne permet pas une propriété nommée Type : les appels .Type échouent dans le banc, c'est attendu)
Public Property Let DrawnBy(ByVal s As String)
    Trace "DrawnBy|" & s
End Property
Public Sub SetTitleBlock(ByVal tb As Object)
    Trace "SetTitleBlock|" & tb.Name
End Sub
Public Function GetTitleBlock(Optional ByRef p As Variant) As Object
    Style "GetTitleBlock", Not IsMissing(p)
    If IsMissing(p) Then Set GetTitleBlock = gCartouche Else Set p = gCartouche
End Function
Public Sub AddSymbol(ByVal sym As Object, ByRef tg As Object)
    If gMockV4 Then
        Set tg = New FauxTag
    ElseIf tg Is Nothing Then
        Err.Raise 1030, , "V5 : AddSymbol attend un repère"
    End If
    mNbSym = mNbSym + 1
    mSyms.Add sym
    Trace "AddSymbol|" & mNom & "|" & sym.Forme & "|" & sym.Pos
End Sub
Public Sub AddPinSymbol(ByVal sym As Object, ByVal con As Object, ByVal nm As Object)
    If con Is Nothing Then Err.Raise 1031, , "AddPinSymbol sans connecteur"
    If Len(nm.Name) = 0 Then Err.Raise 1032, , "AddPinSymbol sans nom de broche"
    If gExigerAddPin And Not con.APin(nm.Name) Then Err.Raise 1033, , "broche " & nm.Name & " absente du connecteur " & con.Repere
    sym.Lier con.Repere & ":" & nm.Name
    mSyms.Add sym
    Trace "AddPinSymbol|" & mNom & "|" & con.Repere & "|" & nm.Name & "|" & sym.Pos
End Sub
Public Sub AddTerminalSymbol(ByVal sym As Object, ByVal con As Object, ByVal nm As Object)
    If con Is Nothing Then Err.Raise 1034, , "AddTerminalSymbol sans bornier"
    sym.Lier con.Repere & ":" & nm.Name
    Trace "AddTerminalSymbol|" & mNom & "|" & con.Repere & "|" & nm.Name & "|" & sym.Pos
End Sub
Public Sub AddGraphicObject(ByVal o As Object)
    mNbGraph = mNbGraph + 1
    mGraphs.Add o
    Trace "AddGraphicObject|" & mNom & "|" & o.Genre
End Sub
Public Sub AddWireConnection(ByVal pts As Object, ByVal typ As String, ByRef tg As Object, ByRef cab As Object, Optional ByRef fil As Variant)
    Dim i As Long, s As String
    If gMockV4 And IsMissing(fil) Then Err.Raise 1040, , "V4 : AddWireConnection a cinq paramètres"
    If (Not gMockV4) And Not IsMissing(fil) Then Err.Raise 1041, , "V5 : AddWireConnection a quatre paramètres"
    If pts.Count < 2 Then Err.Raise 1042, , "moins de deux points"
    For i = 1 To pts.Count
        s = s & TxtPt(pts.Item(i)) & " "
    Next i
    If gMockV4 Then
        Set tg = New FauxTag
        Set cab = New FauxCable
        Set fil = New FauxCable
    End If
    gNbFilsSEE = gNbFilsSEE + 1
    If tg Is Nothing Then
        Trace "AddWireConnection|" & mNom & "|" & typ & "||" & Trim(s)
    Else
        Trace "AddWireConnection|" & mNom & "|" & typ & "|" & tg.Label & "|" & Trim(s)
    End If
End Sub
Public Sub Update()
    Trace "Update|" & mNom
End Sub
Public Function GetConnectionSegmentCollection(Optional ByRef p As Variant) As Object
    Dim c As Object, i As Long, q As Object
    Style "GetConnectionSegmentCollection", Not IsMissing(p)
    Set c = New FauxColl
    For i = 1 To gNbFilsSEE
        Set q = New FauxPoint
        c.Add q
    Next i
    If IsMissing(p) Then Set GetConnectionSegmentCollection = c Else Set p = c
End Function
'''
MOD['FauxSymbole'] = CL + '''Private mForme As String
Private mX1 As Double
Private mY1 As Double
Private mX2 As Double
Private mY2 As Double
Private mDeux As Boolean
Private mPose As Boolean
Private mLien As String
Private mAngle As Double
Public Property Get Forme() As String
    Forme = mForme
End Property
Public Property Get Pos() As String
    Pos = Format(mX1, "0.000") & ";" & Format(mY1, "0.000")
    If mDeux Then Pos = Pos & "-" & Format(mX2, "0.000") & ";" & Format(mY2, "0.000")
End Property
Public Property Get X1() As Double
    X1 = mX1
End Property
Public Property Get Y1() As Double
    Y1 = mY1
End Property
Public Sub SetShape(ByVal f As Object)
    mForme = f.Name
End Sub
Public Sub SetPosition(ByVal p1 As Object, Optional ByVal p2 As Variant)
    mX1 = p1.X
    mY1 = p1.Y
    mDeux = Not IsMissing(p2)
    If mDeux Then
        mX2 = p2.X
        mY2 = p2.Y
    End If
    If Len(mLien) > 0 Then Trace "SetPosition|" & mLien & "|" & Pos
End Sub
Public Function GetPosition(Optional ByRef p1 As Variant, Optional ByRef p2 As Variant) As Object
    Dim r As Object
    Style "Symbol.GetPosition", Not IsMissing(p1)
    If IsMissing(p1) Then
        Set r = New FauxRect
        If mDeux Then
            r.Init Pt(mX1, mY1), Pt(mX2, mY2)
        Else
            r.Init Pt(mX1, mY1), Nothing
        End If
        Set GetPosition = r
    Else
        Set p1 = Pt(mX1, mY1)
        If mDeux Then Set p2 = Pt(mX2, mY2) Else Set p2 = Nothing
    End If
End Function
Public Property Get Angle() As Double
    Angle = mAngle
End Property
Public Property Let Angle(ByVal a As Double)
    mAngle = a
End Property
Public Sub ChangeTag(ByVal tg As Object)
    Trace "ChangeTag|" & tg.Label
End Sub
Public Sub Lier(ByVal s As String)
    mLien = s
End Sub
Public Function GetTag(Optional ByRef p As Variant) As Object
    Dim t As Object
    Style "Symbol.GetTag", Not IsMissing(p)
    Set t = New FauxTag
    t.SetManual Me, mLien, "", 0
    If IsMissing(p) Then Set GetTag = t Else Set p = t
End Function
Public Function GetShape(Optional ByRef p As Variant) As Object
    Dim f As Object
    Style "Symbol.GetShape", Not IsMissing(p)
    Set f = New FauxForme
    f.Name = mForme
    If IsMissing(p) Then Set GetShape = f Else Set p = f
End Function
Public Property Get SymbolType() As Long
    SymbolType = 1
End Property
Public Function GetConnectionPointCollection(Optional ByRef p As Variant) As Object
    Dim c As Object, cp As Object
    Style "GetConnectionPointCollection", Not IsMissing(p)
    Set c = New FauxColl
    If mForme = "BROCHE" Or mForme = "BORNE" Or mForme = "MASSE" Then
        Set cp = New FauxCp
        cp.Init Me
        c.Add cp
    End If
    If IsMissing(p) Then Set GetConnectionPointCollection = c Else Set p = c
End Function
'''
MOD['FauxCp'] = CL + '''Private mSym As Object
Public Sub Init(ByVal s As Object)
    Set mSym = s
End Sub
Public Property Get Name() As String
    Name = "1"
End Property
Public Function GetPosition(Optional ByRef p As Variant) As Object
    Style "ConnectionPoint.GetPosition", Not IsMissing(p)
    If IsMissing(p) Then
        Set GetPosition = Pt(mSym.X1 + gDecalX, mSym.Y1 + gDecalY)
    Else
        Set p = Pt(mSym.X1 + gDecalX, mSym.Y1 + gDecalY)
    End If
End Function
'''
MOD['FauxPoint'] = CL + '''Private mX As Double
Private mY As Double
Public Property Get X() As Double
    X = mX
End Property
Public Property Let X(ByVal v As Double)
    mX = v
End Property
Public Property Get Y() As Double
    Y = mY
End Property
Public Property Let Y(ByVal v As Double)
    mY = v
End Property
'''
MOD['FauxRect'] = CL + '''Private m1 As Object
Private m2 As Object
Public Sub Init(ByVal a As Object, ByVal b As Object)
    Set m1 = a
    Set m2 = b
End Sub
Public Property Get Point1() As Object
    Set Point1 = m1
End Property
Public Property Get Point2() As Object
    Set Point2 = m2
End Property
'''
MOD['FauxColl'] = CL + '''Private mC As Collection
Private Sub Class_Initialize()
    Set mC = New Collection
End Sub
Public Property Get Count() As Long
    Count = mC.Count
End Property
Public Function Item(ByVal i As Long) As Object
    If i < 1 Or i > mC.Count Then Err.Raise 9, , "indice hors limites"
    Set Item = mC.Item(i)
End Function
Public Sub Add(ByVal o As Object)
    mC.Add o
End Sub
'''
MOD['FauxTag'] = CL + '''Private mLabel As String
Public Sub SetManual(ByVal e As Object, ByVal l As String, ByVal r As String, ByVal o As Long)
    If e Is Nothing Then Err.Raise 1050, , "SetManual sans entité"
    mLabel = l
End Sub
Public Property Get Label() As String
    Label = mLabel
End Property
Public Property Get Tag() As String
    Tag = mLabel
End Property
'''
MOD['FauxNom'] = CL + '''Private mN As String
Public Property Get Quoi() As String
    Quoi = "nom"
End Property
Public Property Get Name() As String
    Name = mN
End Property
Public Property Let Name(ByVal s As String)
    mN = s
End Property
'''
MOD['FauxBroche'] = CL + '''Public Property Get Quoi() As String
    Quoi = "broche"
End Property
'''
MOD['FauxConnecteur'] = CL + '''Private mRep As String
Private mBroches As String
Public Property Get Repere() As String
    Repere = mRep
End Property
Public Property Let Repere(ByVal s As String)
    mRep = s
End Property
Public Function APin(ByVal n As String) As Boolean
    APin = (InStr(1, "|" & mBroches & "|", "|" & n & "|") > 0)
End Function
Public Sub AddPin(ByVal a As Object, ByVal b As Object)
    If gMockV4 Then
        If b.Quoi <> "nom" Then Err.Raise 1060, , "V4 : AddPin(objet, nom)"
        mBroches = mBroches & "|" & b.Name
    Else
        If a.Quoi <> "nom" Then Err.Raise 1061, , "V5 : AddPin(nom, objet)"
        mBroches = mBroches & "|" & a.Name
    End If
    Trace "AddPin|" & mRep
End Sub
Public Sub AddTerminal(ByVal a As Object, ByVal b As Object)
    Trace "AddTerminal|" & mRep
End Sub
'''
MOD['FauxCable'] = CL + '''Private mG As String
Public Property Let Gauge(ByVal g As String)
    mG = g
    Trace "Gauge|" & g
End Property
Public Property Get Gauge() As String
    Gauge = mG
End Property
Public Sub ChangeTag(ByVal tg As Object)
    Trace "Cable.ChangeTag|" & tg.Label
End Sub
'''
MOD['FauxGraph'] = CL + '''Private mGenre As Long
Private mP1 As Object
Public Property Get Genre() As Long
    Genre = mGenre
End Property
Public Property Let Genre(ByVal g As Long)
    mGenre = g
End Property
Public Sub SetFirstPoint(ByVal p As Object)
    Set mP1 = p
End Sub
Public Sub SetSecondPoint(ByVal p As Object)
End Sub
Public Sub SetStartPoint(ByVal p As Object)
    Set mP1 = p
End Sub
Public Sub SetEndPoint(ByVal p As Object)
End Sub
Public Sub SetPosition(Optional ByVal p1 As Variant, Optional ByVal p2 As Variant)
    If Not IsMissing(p1) Then Set mP1 = p1
End Sub
Public Function GetFirstPoint(Optional ByRef p As Variant) As Object
    Style "GetFirstPoint", Not IsMissing(p)
    If IsMissing(p) Then Set GetFirstPoint = mP1 Else Set p = mP1
End Function
Public Property Let Value(ByVal s As String)
End Property
Public Property Let Size(ByVal s As Double)
End Property
Public Property Let Justify(ByVal s As Long)
End Property
Public Property Let Angle(ByVal s As Double)
End Property
'''
MOD['FauxForme'] = CL + '''Private mN As String
Public Function GetFamily(Optional ByRef p As Variant) As Object
    Style "Shape.GetFamily", Not IsMissing(p)
    If IsMissing(p) Then Set GetFamily = New FauxFamille Else Set p = New FauxFamille
End Function
Public Function GetRect(Optional ByRef p1 As Variant, Optional ByRef p2 As Variant) As Object
    Dim r As Object
    Style "Shape.GetRect", Not IsMissing(p1)
    If IsMissing(p1) Then
        Set r = New FauxRect
        r.Init Pt(-5, -5), Pt(5, 5)
        Set GetRect = r
    Else
        Set p1 = Pt(-5, -5)
        Set p2 = Pt(5, 5)
    End If
End Function
Public Property Get Description() As String
    Description = "forme " & mN
End Property
Public Property Get Name() As String
    Name = mN
End Property
Public Property Let Name(ByVal s As String)
    mN = s
End Property
'''
MOD['FauxCartouche'] = CL + '''Public Property Get Name() As String
    Name = "A3"
End Property
Public Property Get WorkingWidth() As Double
    WorkingWidth = 390
End Property
Public Property Get WorkingHeight() As Double
    WorkingHeight = 250
End Property
Public Property Get Width() As Double
    Width = 420
End Property
Public Property Get Height() As Double
    Height = 297
End Property
Public Function GetPrimaryCoordinates(Optional ByRef p As Variant) As Object
    Style "GetPrimaryCoordinates", Not IsMissing(p)
    If IsMissing(p) Then Set GetPrimaryCoordinates = Pt(15, 20) Else Set p = Pt(15, 20)
End Function
'''
MOD['BancFaux'] = '''Option VBASupport 1
Option Explicit
Public Function BancFaux(ByVal chemin As String, ByVal v4 As Boolean, ByVal folios As String) As String
    Dim ws As Object, i As Long
    On Error GoTo E
    gSansDialogue = True
    InitialiserClasseur
    FixerReglage "Folios", folios
    FixerReglage "PasAPas", "N"
    If Not gGarderSimulation Then FixerReglage "Simulation", "N"
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
    FixerReglage "TypeConnexion", "Fil"
    FixerReglage "Cable", "O"
    FixerReglage "Jauge", "O"
    FixerReglage "SauverTous", "2"
    If gJournalNormal Then FixerReglage "Journal", "NORMAL"
    InitFaux v4
    Set gApp = New FauxApp
    gVersionAPI = 0
    DeterminerVersion
    DessinerPaquetFichier chemin, True
    EcrireTrace
    BancFaux = "fini ; V" & gVersionAPI & " ; erreurs " & gNbErreurs & " ; traces " & gTrace.Count
    Exit Function
E:
    BancFaux = "ERREUR VBA " & Err.Number & " " & Err.Description & " (étape " & gEtape & " / " & gObjet & ")"
End Function
Public Sub EcrireTrace()
    Dim i As Long, f As Integer
    f = FreeFile
    Open "@TRACE@" For Output As #f
    For i = 1 To gTrace.Count
        Print #f, gTrace.Item(i)
    Next i
    Close #f
End Sub
Public Function BancSondes(ByVal chemin As String, ByVal v4 As Boolean) As String
    Dim r As String
    On Error GoTo E
    r = BancFaux(chemin, v4, "1-2")
    gSansDialogue = True
    FixerReglage "SondeFolio", "1"
    SondeApplication
    r = r & " | appli " & gNbErreurs
    SondeSymboles
    r = r & " | symboles " & gNbErreurs
    SondeFolio
    r = r & " | folio " & gNbErreurs
    SondeSelection
    r = r & " | sélection " & gNbErreurs
    SondeMethodes
    r = r & " | méthodes " & gNbErreurs
    FixerReglage "SondeFolio", ""
    SondeFolio
    r = r & " | folio de la vue " & gNbErreurs
    BancSondes = r
    Exit Function
E:
    BancSondes = r & " ERREUR VBA " & Err.Number & " " & Err.Description & " (étape " & gEtape & " / " & gObjet & ")"
End Function
Public Function BancReprise(ByVal chemin As String) As String
    Dim r As String, n0 As Long
    On Error GoTo E
    r = BancFaux(chemin, False, "1-3")
    n0 = gTrace.Count
    gSansDialogue = True
    DessinerPaquetFichier chemin, True
    r = r & " | relance : " & (gTrace.Count - n0) & " trace(s) de plus, " & gFolios.Count & " folio(s)"
    FixerReglage "Remplacer", "O"
    n0 = gTrace.Count
    DessinerPaquetFichier chemin, True
    r = r & " | Remplacer = O : " & (gTrace.Count - n0) & " trace(s) de plus, " & gFolios.Count & " folio(s)"
    EcrireTrace
    BancReprise = r
    Exit Function
E:
    BancReprise = r & " ERREUR VBA " & Err.Number & " " & Err.Description
End Function
Public Function BancSimuleAvecSEE(ByVal chemin As String, ByVal v4 As Boolean) As String
    Dim r As String
    On Error GoTo E
    gSansDialogue = True
    InitialiserClasseur
    FixerReglage "Simulation", "O"
    gGarderSimulation = True
    r = BancFaux(chemin, v4, "*")
    BancSimuleAvecSEE = r
    Exit Function
E:
    BancSimuleAvecSEE = r & " ERREUR VBA " & Err.Number & " " & Err.Description
End Function
Public Function BancNormal(ByVal chemin As String) As String
    gJournalNormal = True
    gExigerAddPin = False
    BancNormal = BancFaux(chemin, False, "*")
End Function
Public Function BancModes(ByVal chemin As String, ByVal v4 As Boolean) As String
    Dim r As String
    On Error GoTo E
    gSansDialogue = True
    InitialiserClasseur
    FixerReglage "Groupe", "SOUS_GROUPE"
    FixerReglage "EQUIPEMENT.Mode", "BOITE"
    FixerReglage "BARRETTE.Mode", "SYMBOLE"
    FixerReglage "BARRETTE.Famille", "FAM"
    FixerReglage "BARRETTE.Symbole", "MASSE"
    FixerReglage "MASSE.Mode", "DESSIN"
    FixerReglage "PRISE.Mode", "IGNORER"
    FixerReglage "Recaler", "N"
    FixerReglage "Grille", "0.5"
    FixerReglage "Mode", "ECHELLE"
    FixerReglage "Echelle", "0.5"
    FixerReglage "SensY", "-1"
    FixerReglage "OrigineY", "200"
    gGarderSimulation = False
    r = BancFauxSansInit(chemin, v4)
    BancModes = r
    Exit Function
E:
    BancModes = r & " ERREUR VBA " & Err.Number & " " & Err.Description & " (étape " & gEtape & " / " & gObjet & ")"
End Function
Public Function BancFauxSansInit(ByVal chemin As String, ByVal v4 As Boolean) As String
    On Error GoTo E
    FixerReglage "Folios", "*"
    FixerReglage "PasAPas", "N"
    FixerReglage "Simulation", "N"
    FixerReglage "TypeConnexion", "Fil"
    FixerReglage "EQUIPEMENT.Famille", "FAM"
    FixerReglage "EQUIPEMENT.Symbole", "BOITE"
    InitFaux v4
    Set gApp = New FauxApp
    gVersionAPI = 0
    DeterminerVersion
    DessinerPaquetFichier chemin, True
    EcrireTrace
    BancFauxSansInit = "fini ; V" & gVersionAPI & " ; erreurs " & gNbErreurs & " ; traces " & gTrace.Count
    Exit Function
E:
    BancFauxSansInit = "ERREUR VBA " & Err.Number & " " & Err.Description & " (étape " & gEtape & " / " & gObjet & ")"
End Function
Public Function BancEssais(ByVal v4 As Boolean) As String
    Dim ws As Object, i As Long
    On Error GoTo E
    gSansDialogue = True
    InitialiserClasseur
    FixerReglage "PasAPas", "N"
    FixerReglage "Simulation", "N"
    FixerReglage "EQUIPEMENT.Famille", "FAM"
    FixerReglage "EQUIPEMENT.Symbole", "BOITE"
    FixerReglage "EQUIPEMENT.BrocheFamille", "FAM"
    FixerReglage "EQUIPEMENT.BrocheSymbole", "BROCHE"
    FixerReglage "TypeConnexion", "Fil"
    InitFaux v4
    Set gApp = New FauxApp
    gVersionAPI = 0
    DeterminerVersion
    EssaiDessin
    EssaiSymboles
    EcrireTrace
    BancEssais = "fini ; V" & gVersionAPI & " ; erreurs " & gNbErreurs & " ; traces " & gTrace.Count
    Exit Function
E:
    BancEssais = "ERREUR VBA " & Err.Number & " " & Err.Description & " (étape " & gEtape & " / " & gObjet & ")"
End Function
'''
MOD.update({'FauxFamille': 'Option VBASupport 1\nOption ClassModule\nOption Explicit\nPublic Property Get Name() As String\n    Name = "FAM"\nEnd Property\nPublic Property Get Description() As String\n    Description = "famille de faux symboles"\nEnd Property\nPublic Function GetShapesCollection(Optional ByRef p As Variant) As Object\n    Dim c As Object, f As Object, n As Variant\n    Style "GetShapesCollection", Not IsMissing(p)\n    Set c = New FauxColl\n    For Each n In Array("BOITE", "BROCHE", "BORNE", "MASSE")\n        Set f = New FauxForme\n        f.Name = n\n        c.Add f\n    Next n\n    If IsMissing(p) Then Set GetShapesCollection = c Else Set p = c\nEnd Function\n', 'FauxWorkspace': 'Option VBASupport 1\nOption ClassModule\nOption Explicit\nPublic Function GetActiveView(Optional ByRef p As Variant) As Object\n    Style "GetActiveView", Not IsMissing(p)\n    If IsMissing(p) Then Set GetActiveView = New FauxVue Else Set p = New FauxVue\nEnd Function\n', 'FauxVue': 'Option VBASupport 1\nOption ClassModule\nOption Explicit\nPublic Function GetContent(Optional ByRef p As Variant) As Object\n    Style "View.GetContent", Not IsMissing(p)\n    If IsMissing(p) Then Set GetContent = gFolios.Item(1) Else Set p = gFolios.Item(1)\nEnd Function\nPublic Function GetObjectsFromSelection(Optional ByRef p As Variant) As Object\n    Dim c As Object, f As Object\n    Style "GetObjectsFromSelection", Not IsMissing(p)\n    Set f = gFolios.Item(1)\n    If gMockV4 Then\n        f.GetSymbolCollection c\n    Else\n        Set c = f.GetSymbolCollection()\n    End If\n    If IsMissing(p) Then Set GetObjectsFromSelection = c Else Set p = c\nEnd Function\n'})
MOD['BancFaux'] = MOD['BancFaux'].replace('@TRACE@', TRACE.replace('"', '""'))
def modules():
    return list(MOD.items())
