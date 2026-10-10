Attribute VB_Name = "SEE_Sonde"
' ============================================================================
'  SEE_Sonde - APPRENDRE au bureau ce que l'API de SEE fait vraiment.
' ----------------------------------------------------------------------------
'  LECTURE SEULE : aucune de ces macros n'appelle Save, n'ajoute ni ne
'  supprime quoi que ce soit dans SEE. Chacune écrit dans sa propre feuille
'  (créée ou vidée), une ligne par objet, et ne s'arrête jamais sur une
'  erreur : l'erreur est notée dans la cellule (« #ERR n : ... ») et la sonde
'  continue.
'
'    SondeApplication  versions, chemins, environnement (Unit !), projet,
'                      cartouches (zone de travail), stratégie de connexion
'    SondeSymboles     familles et symboles de l'environnement
'    SondeFolio        un folio dessiné à la main : symboles (repères,
'                      position, points de connexion), segments de connexion
'                      (SignalType = la chaîne de type de connexion ?), textes
'    SondeSelection    la même chose pour les objets sélectionnés dans SEE
'    SondeMethodes     les XML des méthodes (points de connexion, câblage,
'                      types de câbles, connecteurs, symboles par défaut)
'
'  But : connaître l'unité, l'origine et le sens de y, les formes que le
'  bureau utilise, la chaîne de type de connexion, la sémantique des repères.
'  Conseil : dessine à la main un petit folio (un symbole en haut à gauche,
'  un autre en bas à droite, un fil entre eux, un texte), puis SondeFolio.
' ============================================================================
Option Explicit

Private mFeuille As Object
Private mLigne As Long

' ----------------------------------------------------------------------------
'  Début et fin communs
' ----------------------------------------------------------------------------
Private Function DebutSonde(ByVal titre As String, ByVal nomFeuille As String) As Boolean
    OuvrirJournal titre
    Set mFeuille = FeuilleCreee(nomFeuille, True)
    mLigne = 0
    Application.ScreenUpdating = False
    Dim connecte As Boolean
    connecte = ConnecterSEE()
    DebutSonde = connecte
    If Not connecte Then
        Ecrire Array("Connexion", "ÉCHEC", "aucune stratégie n'a marché : voir la feuille Journal et diagnostic.ps1")
    End If
End Function

Private Sub FinSonde(ByVal titre As String)
    Application.ScreenUpdating = True
    mFeuille.Columns.AutoFit
    Journal "Fin", titre, "", "terminé ; " & gNbErreurs & " erreur(s) d'appel (normales en sonde : elles disent ce qui n'existe pas)"
    mFeuille.Activate
    Dialogue titre & " terminée." & vbCrLf & gNbErreurs & " appel(s) en erreur, notés dans la feuille Journal.", _
        vbInformation, "Sonde SEE"
End Sub

Private Sub Ecrire(ByVal valeurs As Variant)
    mLigne = mLigne + 1
    EcrireLigne mFeuille, mLigne, valeurs
End Sub

Private Sub TitreSection(ByVal texte As String)
    mLigne = mLigne + 1
    mFeuille.Cells(mLigne, 1).Value = "'" & texte
    mFeuille.Cells(mLigne, 1).Font.Bold = True
End Sub

Private Sub Entetes(ByVal valeurs As Variant)
    Ecrire valeurs
    mFeuille.Rows(mLigne).Font.Bold = True
End Sub

' Une propriété, et si elle échoue en lecture de propriété, comme méthode.
Private Function LirePropOuMethode(ByVal obj As Object, ByVal nom As String) As String
    Dim s As String, v As Variant
    s = LireProp(obj, nom)
    If Left$(s, 4) <> "#ERR" Then
        LirePropOuMethode = s
        Exit Function
    End If
    On Error GoTo Echec
    v = CallByName(obj, nom, VbMethod)
    LirePropOuMethode = EnTexte(v)
    Exit Function
Echec:
    LirePropOuMethode = s
End Function

' ============================================================================
'  SondeApplication
' ============================================================================
Public Sub SondeApplication()
    Dim prj As Object, env As Object, info As Object, grp As Object, c As Collection
    Dim o As Variant, nom As Variant, u As String, x As Double, uv As Variant
    Const TITRE_SONDE As String = "SondeApplication"
    If Not DebutSonde(TITRE_SONDE, "Sonde_Application") Then GoTo Fin
    Entetes Array("Rubrique", "Cle", "Valeur")
    Ecrire Array("Connexion", "Strategie", gStrategie)
    Ecrire Array("Connexion", "TypeName", TypeName(gApp))
    Ecrire Array("Connexion", "VersionAPI retenue", "V" & gVersionAPI & " (réglage VersionAPI = " & Reglage("VersionAPI", "auto") & ")")
    Contexte "SondeApplication", "Application"
    For Each nom In Array("ApplicationName", "ApplicationVersion", "ApplicationVersionRevision", "ProductVersion", _
            "ApplicationLanguage", "ProjectRootPath", "EnvironmentRootPath", "ApplicationMode", "VBAVersion", "IsEProjectMode")
        Ecrire Array("Application", CStr(nom), LireProp(gApp, CStr(nom)))
    Next nom
    ' --- environnement
    Contexte "SondeApplication", "Environnement"
    Set env = SEE_Environnement()
    If env Is Nothing Then
        Ecrire Array("Environnement", "GetEnvironment", "#ERR " & gDerniereErreur)
    Else
        For Each nom In Array("Name", "Path", "Version", "Unit", "Standard", "CreationDate", "BlockPath", _
                "TitleBlockPath", "ParameterSheetPath")
            Ecrire Array("Environnement", CStr(nom), LireProp(env, CStr(nom)))
        Next nom
        ' le sens de Unit (SEEUnitType : 0 mm, 1 pouce, 2 cartouche) n'est
        ' donné que si SEE rend un NOMBRE entier ; un texte (« Inch »...) se lit
        ' tel quel sur la ligne Unit : l'unité fixe l'Echelle (facteur 25,4)
        If LirePropValeur(env, "Unit", uv) Then
            u = EnTexte(uv)
            If LireNombre(uv, x) Then
                If x <> Int(x) Then
                    u = u & " = valeur inconnue (pas un entier)"
                Else
                    Select Case EnLong(x, -1)
                        Case 0: u = "0 = millimètres"
                        Case 1: u = "1 = pouces"
                        Case 2: u = "2 = unité du cartouche (TitleBlock)"
                        Case Else: u = u & " = valeur inconnue"
                    End Select
                End If
            Else
                u = "« " & u & " » (" & TypeName(uv) & ") : non numérique, à lire tel quel (ligne Unit)"
            End If
            Ecrire Array("Environnement", "Unit (sens)", u)
        End If
    End If
    ' --- projet
    Contexte "SondeApplication", "Projet"
    Set prj = SEE_Projet(True)
    If prj Is Nothing Then
        Ecrire Array("Projet", "GetProject", "aucun projet ouvert (ou erreur : " & gDerniereErreur & ")")
    Else
        For Each nom In Array("Name", "EnvironmentName", "IsReadOnly", "IsProjectReadOnly", "IsModified", "Level", "Step")
            Ecrire Array("Projet", CStr(nom), LirePropOuMethode(prj, CStr(nom)))
        Next nom
        Set info = ObjetProp(prj, "Info")
        If info Is Nothing Then
            Ecrire Array("Projet.Info", "Info", "#ERR illisible")
        Else
            For Each nom In Array("Location", "Locked", "ProjectStep", "StructuralLevel", "NewLineCharacter", _
                    "PropagateFreeSymbolAttributes", "CalculatedSymbolSizeDuringInsertion", "DisplayOnlyMainSourceAndDestination", _
                    "TaggingUniqueness", "MasterSlaveUniqueness", "SignalNumberUniqueness", "LocationUniqueness", _
                    "SemiAutomaticTagging", "RealTimeSignalNumbering", "ContactCoherenceControl", _
                    "ProcessMasterSlaveCrossReferences", "ProcessOffPageReferences", "ImperialUnits", "HierarchicalLocationsDepth")
                Ecrire Array("Projet.Info", CStr(nom), LireProp(info, CStr(nom)))
            Next nom
        End If
        Set grp = SEE_GroupePrincipal(prj)
        If Not grp Is Nothing Then
            Ecrire Array("Groupe principal", "Name", LireProp(grp, "Name"))
            Ecrire Array("Groupe principal", "Branch", LireProp(grp, "Branch"))
            Set c = ElementsDe(SEE_FoliosDuGroupe(grp))
            Ecrire Array("Groupe principal", "Folios", CStr(c.Count))
            For Each o In ElementsDe(SEE_SousGroupes(grp))
                Ecrire Array("Sous-groupe", LireProp(o, "Name"), "Branch " & LireProp(o, "Branch") & " ; " & _
                    ElementsDe(SEE_FoliosDuGroupe(o)).Count & " folio(s)")
            Next o
        End If
        Set c = ElementsDe(SEE_TousLesFolios(prj))
        Ecrire Array("Projet", "Folios (tous)", CStr(c.Count))
    End If
    ' --- vue active
    Contexte "SondeApplication", "Vue active"
    SondeVueActive
    ' --- cartouches
    Contexte "SondeApplication", "Cartouches"
    TitreSection ""
    TitreSection "Cartouches (Width / Height : la feuille ; WorkingWidth / WorkingHeight : la zone de travail, pour le mode AJUSTER)"
    Entetes Array("Source", "Name", "FileName", "Title", "Width", "Height", "WorkingWidth", "WorkingHeight", _
        "PrintOrientation", "PointPrimaire X", "PointPrimaire Y")
    If Not env Is Nothing Then
        For Each o In ElementsDe(SEE_Cartouches(env, False))
            EcrireCartouche "Environnement", o
        Next o
    End If
    If Not prj Is Nothing Then
        For Each o In ElementsDe(SEE_Cartouches(prj, True))
            EcrireCartouche "Projet", o
        Next o
    End If
Fin:
    FinSonde TITRE_SONDE
End Sub

Private Sub SondeVueActive()
    Dim vue As Object, contenu As Object
    Set vue = SEE_VueActive()
    If vue Is Nothing Then
        Ecrire Array("Vue active", "GetActiveView", "aucune (ou erreur : " & gDerniereErreur & ")")
        Exit Sub
    End If
    Ecrire Array("Vue active", "Type", LireProp(vue, "Type"))
    Set contenu = SEE_ContenuVue(vue)
    If contenu Is Nothing Then
        Ecrire Array("Vue active", "GetContent", "Nothing")
    Else
        Ecrire Array("Vue active", "Contenu", TypeName(contenu) & " « " & LireProp(contenu, "Name") & " »")
    End If
End Sub

Private Sub EcrireCartouche(ByVal source As String, ByVal tb As Object)
    Dim x As Double, y As Double, sx As String, sy As String
    On Error GoTo Echec
    If SEE_PointPar(tb, "GetPrimaryCoordinates", x, y) Then
        sx = NombreTexte(x)
        sy = NombreTexte(y)
    Else
        sx = "#ERR"
        sy = "#ERR"
    End If
    Ecrire Array(source, LireProp(tb, "Name"), LireProp(tb, "FileName"), LireProp(tb, "Title"), _
        LireProp(tb, "Width"), LireProp(tb, "Height"), LireProp(tb, "WorkingWidth"), LireProp(tb, "WorkingHeight"), _
        LireProp(tb, "PrintOrientation"), sx, sy)
    Exit Sub
Echec:
    Ecrire Array(source, "#ERR " & Err.Number & " : " & Err.Description)
End Sub

' ============================================================================
'  SondeSymboles : familles SEE (eSEEFamily = 1) puis utilisateur (2)
' ============================================================================
Public Sub SondeSymboles()
    Dim env As Object, t As Variant, fam As Variant, forme As Variant, nbFam As Long, nbSym As Long
    Const TITRE_SONDE As String = "SondeSymboles"
    If Not DebutSonde(TITRE_SONDE, "Sonde_Symboles") Then GoTo Fin
    Contexte "SondeSymboles", "Environnement"
    Set env = SEE_Environnement()
    If env Is Nothing Then
        Ecrire Array("#ERR environnement illisible : " & gDerniereErreur)
        GoTo Fin
    End If
    Entetes Array("TypeFamille", "Famille", "DescriptionFamille", "Nom", "Description", "Description2", "Behavior", _
        "Function", "Root", "Class", "Code", "Neutral", "DwgBlockName", "Rect X1", "Rect Y1", "Rect X2", "Rect Y2", "Erreur")
    For Each t In Array(FAMILLE_SEE, FAMILLE_UTILISATEUR)
        For Each fam In ElementsDe(SEE_Familles(env, CLng(t)))
            nbFam = nbFam + 1
            Contexte "SondeSymboles", LireProp(fam, "Name")
            For Each forme In ElementsDe(SEE_FormesDeFamille(fam))
                nbSym = nbSym + 1
                EcrireForme CLng(t), fam, forme
                If nbSym Mod 200 = 0 Then Application.StatusBar = "Sonde des symboles : " & nbSym
            Next forme
        Next fam
    Next t
    Journal "SondeSymboles", "", "", nbFam & " famille(s), " & nbSym & " symbole(s)"
Fin:
    Application.StatusBar = False
    FinSonde TITRE_SONDE
End Sub

Private Sub EcrireForme(ByVal typeFamille As Long, ByVal fam As Object, ByVal forme As Object)
    Dim x1 As Double, y1 As Double, x2 As Double, y2 As Double, r As Variant
    On Error GoTo Echec
    If SEE_RectForme(forme, x1, y1, x2, y2) Then
        r = Array(NombreTexte(x1), NombreTexte(y1), NombreTexte(x2), NombreTexte(y2), "")
    Else
        r = Array("", "", "", "", "GetRect : " & gDerniereErreur)
    End If
    Ecrire Array(IIf(typeFamille = FAMILLE_SEE, "SEE", "Utilisateur"), LireProp(fam, "Name"), LireProp(fam, "Description"), _
        LireProp(forme, "Name"), LireProp(forme, "Description"), LireProp(forme, "Description2"), _
        LireProp(forme, "Behavior"), LireProp(forme, "Function"), LireProp(forme, "Root"), LireProp(forme, "Class"), _
        LireProp(forme, "Code"), LireProp(forme, "Neutral"), LireProp(forme, "DwgBlockName"), r(0), r(1), r(2), r(3), r(4))
    Exit Sub
Echec:
    Ecrire Array("#ERR " & Err.Number & " : " & Err.Description)
End Sub

' ============================================================================
'  SondeFolio : le folio nommé dans le réglage SondeFolio, sinon celui de la
'  vue active.
' ============================================================================
Public Sub SondeFolio()
    Dim prj As Object, sh As Object, nom As String
    Const TITRE_SONDE As String = "SondeFolio"
    If Not DebutSonde(TITRE_SONDE, "Sonde_Folio") Then GoTo Fin
    nom = Reglage("SondeFolio", "")
    Contexte "SondeFolio", nom
    Set prj = SEE_Projet(True)
    If Len(nom) > 0 Then
        If Not prj Is Nothing Then Set sh = FolioDuProjet(prj, nom)
    Else
        Set sh = FolioDeLaVueActive()
    End If
    If sh Is Nothing Then
        Ecrire Array("Folio", "introuvable", IIf(Len(nom) > 0, "« " & nom & " » n'est pas dans le projet", _
            "pas de vue active montrant un folio") & " ; " & gDerniereErreur)
        GoTo Fin
    End If
    DecrireFolio sh
Fin:
    FinSonde TITRE_SONDE
End Sub

' Le folio de la vue active (Nothing s'il n'y en a pas).
Public Function FolioDeLaVueActive() As Object
    Dim vue As Object
    Set FolioDeLaVueActive = Nothing
    Set vue = SEE_VueActive()
    If vue Is Nothing Then Exit Function
    Set FolioDeLaVueActive = SEE_ContenuVue(vue)
End Function

' Un folio du projet par son nom (parcourt tous les folios).
Public Function FolioDuProjet(ByVal prj As Object, ByVal nom As String) As Object
    Dim o As Variant
    Set FolioDuProjet = Nothing
    For Each o In ElementsDe(SEE_TousLesFolios(prj))
        If StrComp(LireProp(o, "Name"), nom, vbTextCompare) = 0 Then
            Set FolioDuProjet = o
            Exit Function
        End If
    Next o
End Function

Private Sub DecrireFolio(ByVal sh As Object)
    Dim o As Variant, n As Long, t As Variant, tb As Object, nomFolio As String
    nomFolio = LireProp(sh, "Name")
    Contexte "SondeFolio", nomFolio
    TitreSection "Folio « " & nomFolio & " »"
    Entetes Array("Cle", "Valeur")
    Dim nomProp As Variant
    For Each nomProp In Array("Name", "Type", "SheetOrder", "CreationMethod", "ProcessName", "DrawnBy", "DesignedBy", _
            "VerifiedBy", "CreationDate", "ScaleForTitleBlock", "RotationForTitleBlock", "Step", "Modified")
        Ecrire Array(CStr(nomProp), LireProp(sh, CStr(nomProp)))
    Next nomProp
    Set tb = SEE_CartoucheDuFolio(sh)
    If tb Is Nothing Then
        Ecrire Array("Cartouche", "aucun (ou erreur : " & gDerniereErreur & ")")
    Else
        Ecrire Array("Cartouche", LireProp(tb, "Name") & " ; Width " & LireProp(tb, "Width") & " ; Height " & _
            LireProp(tb, "Height") & " ; WorkingWidth " & LireProp(tb, "WorkingWidth") & " ; WorkingHeight " & _
            LireProp(tb, "WorkingHeight"))
    End If
    ' --- symboles
    TitreSection ""
    TitreSection "Symboles (dx, dy = position du premier point de connexion moins position du symbole : ce que le recalage corrige)"
    EntetesSymboles
    n = 0
    For Each o In ElementsDe(SEE_SymbolesDuFolio(sh))
        n = n + 1
        DecrireSymbole n, o
    Next o
    ' --- points de connexion, un par ligne
    TitreSection ""
    TitreSection "Points de connexion des symboles"
    Entetes Array("Symbole", "Repere", "Name", "Number", "Type", "ConnectionType", "External", "Connectable", "X", "Y", "Erreur")
    n = 0
    For Each o In ElementsDe(SEE_SymbolesDuFolio(sh))
        n = n + 1
        DecrirePointsDeConnexion n, o
    Next o
    ' --- segments de connexion
    TitreSection ""
    TitreSection "Segments de connexion (SignalType : candidat pour le réglage TypeConnexion)"
    EntetesSegments
    n = 0
    For Each o In ElementsDe(SEE_SegmentsDuFolio(sh))
        n = n + 1
        DecrireSegment n, o
    Next o
    ' --- objets graphiques
    TitreSection ""
    TitreSection "Objets graphiques (textes, lignes, rectangles)"
    EntetesGraphiques
    n = 0
    For Each t In Array(GRAPH_TEXTE, GRAPH_LIGNE, GRAPH_RECTANGLE)
        For Each o In ElementsDe(SEE_GraphiquesDuFolio(sh, CLng(t)))
            n = n + 1
            DecrireGraphique n, CLng(t), o
        Next o
    Next t
End Sub

' ============================================================================
'  SondeSelection : les objets sélectionnés dans la vue active de SEE
' ============================================================================
Public Sub SondeSelection()
    Dim vue As Object, sel As Object, o As Variant, n As Long, tn As String
    Const TITRE_SONDE As String = "SondeSelection"
    If Not DebutSonde(TITRE_SONDE, "Sonde_Selection") Then GoTo Fin
    Contexte "SondeSelection", ""
    Set vue = SEE_VueActive()
    If vue Is Nothing Then
        Ecrire Array("Vue active", "aucune : " & gDerniereErreur)
        GoTo Fin
    End If
    Set sel = SEE_SelectionVue(vue)
    If sel Is Nothing Then
        Ecrire Array("Sélection", "vide ou illisible : " & gDerniereErreur)
        GoTo Fin
    End If
    For Each o In ElementsDe(sel)
        n = n + 1
        tn = TypeName(o)
        TitreSection ""
        TitreSection "Objet " & n & " : " & tn
        If InStr(1, tn, "Symbol", vbTextCompare) > 0 And InStr(1, tn, "ConnectionPoint", vbTextCompare) = 0 Then
            EntetesSymboles
            DecrireSymbole n, o
            Entetes Array("Symbole", "Repere", "Name", "Number", "Type", "ConnectionType", "External", "Connectable", "X", "Y", "Erreur")
            DecrirePointsDeConnexion n, o
        ElseIf InStr(1, tn, "Segment", vbTextCompare) > 0 Then
            EntetesSegments
            DecrireSegment n, o
        ElseIf InStr(1, tn, "Text", vbTextCompare) > 0 Then
            EntetesGraphiques
            DecrireGraphique n, GRAPH_TEXTE, o
        ElseIf InStr(1, tn, "Rectangle", vbTextCompare) > 0 Then
            EntetesGraphiques
            DecrireGraphique n, GRAPH_RECTANGLE, o
        ElseIf InStr(1, tn, "Line", vbTextCompare) > 0 Then
            EntetesGraphiques
            DecrireGraphique n, GRAPH_LIGNE, o
        Else
            ' type non reconnu par son nom : on essaie comme un symbole
            EntetesSymboles
            DecrireSymbole n, o
        End If
    Next o
    If n = 0 Then Ecrire Array("Sélection", "aucun objet sélectionné dans la vue active")
Fin:
    FinSonde TITRE_SONDE
End Sub

' ============================================================================
'  Les descriptions, une ligne par objet ; jamais d'arrêt sur erreur
' ============================================================================
Private Sub EntetesSymboles()
    Entetes Array("N", "Tag", "Label", "Root", "Order", "Manual", "DisplayTag", "Famille", "Forme", "SymbolType", _
        "SymbolBehavior", "Angle", "SymbolScale", "X1", "Y1", "X2", "Y2", "NbPointsConnexion", "dx 1er point", "dy 1er point", _
        "Connecteur", "Broche", "Borne", "Erreurs")
End Sub

Private Sub DecrireSymbole(ByVal n As Long, ByVal sym As Object)
    Dim tg As Object, forme As Object, fam As Object, x1 As Double, y1 As Double, x2 As Double, y2 As Double
    Dim aSecond As Boolean, pos As Variant, cps As Collection, cx As Double, cy As Double, dx As String, dy As String
    Dim lien As Object, connecteur As String, broche As String, borne As String, erreurs As String
    Dim t(0 To 5) As String, i As Long, nomFam As String, nomForme As String
    On Error GoTo Echec
    Set tg = SEE_RepereDe(sym)
    If tg Is Nothing Then
        erreurs = erreurs & "GetTag ; "
        For i = 0 To 5
            t(i) = ""
        Next i
    Else
        t(0) = LireProp(tg, "Tag")
        t(1) = LireProp(tg, "Label")
        t(2) = LireProp(tg, "Root")
        t(3) = LireProp(tg, "Order")
        t(4) = LireProp(tg, "Manual")
        t(5) = LireProp(tg, "DisplayTag")
    End If
    Set forme = SEE_FormeDuSymbole(sym)
    If Not forme Is Nothing Then
        nomForme = LireProp(forme, "Name")
        Set fam = SEE_FamilleDeForme(forme)
        If Not fam Is Nothing Then nomFam = LireProp(fam, "Name")
    End If
    If SEE_PositionDe(sym, x1, y1, x2, y2, aSecond) Then
        If aSecond Then
            pos = Array(NombreTexte(x1), NombreTexte(y1), NombreTexte(x2), NombreTexte(y2))
        Else
            pos = Array(NombreTexte(x1), NombreTexte(y1), "", "")
        End If
    Else
        pos = Array("#ERR", "#ERR", "", "")
        erreurs = erreurs & "GetPosition ; "
    End If
    Set cps = ElementsDe(SEE_ConnexionsDuSymbole(sym))
    If cps.Count > 0 Then
        If SEE_PointPar(cps(1), "GetPosition", cx, cy) And pos(0) <> "#ERR" Then
            dx = NombreTexte(cx - x1)
            dy = NombreTexte(cy - y1)
        End If
    End If
    Set lien = SEE_LienDuSymbole(sym, "C")
    If Not lien Is Nothing Then connecteur = RepereTexte(lien)
    Set lien = SEE_LienDuSymbole(sym, "P")
    If Not lien Is Nothing Then broche = SEE_NomDe(lien)
    Set lien = SEE_LienDuSymbole(sym, "T")
    If Not lien Is Nothing Then borne = SEE_NomDe(lien)
    Ecrire Array(n, t(0), t(1), t(2), t(3), t(4), t(5), nomFam, nomForme, LireProp(sym, "SymbolType"), _
        LireProp(sym, "SymbolBehavior"), LireProp(sym, "Angle"), LireProp(sym, "SymbolScale"), pos(0), pos(1), pos(2), pos(3), _
        cps.Count, dx, dy, connecteur, broche, borne, erreurs)
    Exit Sub
Echec:
    Ecrire Array(n, "#ERR " & Err.Number & " : " & Err.Description)
End Sub

' Le texte du repère d'un objet (connecteur, câble...) : Tag, sinon DisplayTag.
Private Function RepereTexte(ByVal obj As Object) As String
    Dim tg As Object, s As String
    Set tg = SEE_RepereDe(obj)
    If tg Is Nothing Then
        RepereTexte = "#ERR GetTag"
        Exit Function
    End If
    s = LireProp(tg, "Tag")
    If Left$(s, 4) = "#ERR" Or Len(s) = 0 Then s = LireProp(tg, "DisplayTag")
    RepereTexte = s
End Function

Private Sub DecrirePointsDeConnexion(ByVal n As Long, ByVal sym As Object)
    Dim cp As Variant, rep As String, x As Double, y As Double, sx As String, sy As String, tg As Object
    On Error GoTo Echec
    Set tg = SEE_RepereDe(sym)
    If Not tg Is Nothing Then rep = LireProp(tg, "Tag")
    For Each cp In ElementsDe(SEE_ConnexionsDuSymbole(sym))
        If SEE_PointPar(cp, "GetPosition", x, y) Then
            sx = NombreTexte(x)
            sy = NombreTexte(y)
        Else
            sx = "#ERR"
            sy = "#ERR"
        End If
        Ecrire Array(n, rep, LireProp(cp, "Name"), LireProp(cp, "Number"), LireProp(cp, "Type"), _
            LireProp(cp, "ConnectionType"), LireProp(cp, "External"), LireProp(cp, "Connectable"), sx, sy, "")
    Next cp
    Exit Sub
Echec:
    Ecrire Array(n, rep, "#ERR " & Err.Number & " : " & Err.Description)
End Sub

Private Sub EntetesSegments()
    Entetes Array("N", "Id", "SignalType", "LineStyle", "PotentialPosition", "X1", "Y1", "X2", "Y2", "Fils (nom / jauge / câble)", "Erreurs")
End Sub

Private Sub DecrireSegment(ByVal n As Long, ByVal seg As Object)
    Dim p As Object, x1 As String, y1 As String, x2 As String, y2 As String, x As Double, y As Double
    Dim f As Variant, fils As String, cab As Object
    On Error GoTo Echec
    x1 = "#ERR": y1 = "#ERR": x2 = "#ERR": y2 = "#ERR"
    Set p = SEE_PointDuSegment(seg, True)
    If SEE_PointPar(p, "GetPosition", x, y) Then
        x1 = NombreTexte(x)
        y1 = NombreTexte(y)
    End If
    Set p = SEE_PointDuSegment(seg, False)
    If SEE_PointPar(p, "GetPosition", x, y) Then
        x2 = NombreTexte(x)
        y2 = NombreTexte(y)
    End If
    For Each f In ElementsDe(SEE_FilsDe(seg))
        fils = fils & SEE_NomDe(f) & " / " & LireProp(f, "Gauge")
        Set cab = SEE_CableDuFil(f)
        If Not cab Is Nothing Then fils = fils & " / " & RepereTexte(cab)
        fils = fils & " | "
    Next f
    Ecrire Array(n, LireProp(seg, "Id"), LireProp(seg, "SignalType"), LireProp(seg, "LineStyle"), _
        LireProp(seg, "PotentialPosition"), x1, y1, x2, y2, fils, "")
    Exit Sub
Echec:
    Ecrire Array(n, "#ERR " & Err.Number & " : " & Err.Description)
End Sub

Private Sub EntetesGraphiques()
    Entetes Array("N", "Type", "Valeur", "X1", "Y1", "X2", "Y2", "Size", "Angle", "Justify", "Layer", "Erreurs")
End Sub

Private Sub DecrireGraphique(ByVal n As Long, ByVal typeGraphique As Long, ByVal go As Object)
    Dim x1 As Double, y1 As Double, x2 As Double, y2 As Double, a As Boolean, ok As Boolean
    Dim pos As Variant, valeur As String, nomType As String
    On Error GoTo Echec
    Select Case typeGraphique
        Case GRAPH_TEXTE
            nomType = "Texte"
            valeur = ValeurDuTexte(go)
            ok = SEE_PositionDe(go, x1, y1, x2, y2, a)
        Case GRAPH_LIGNE
            nomType = "Ligne"
            ok = SEE_PointPar(go, "GetStartPoint", x1, y1)
            If ok Then a = SEE_PointPar(go, "GetEndPoint", x2, y2)
        Case Else
            nomType = "Rectangle"
            ok = SEE_PointPar(go, "GetFirstPoint", x1, y1)
            If ok Then a = SEE_PointPar(go, "GetSecondPoint", x2, y2)
    End Select
    If ok Then
        If a Then
            pos = Array(NombreTexte(x1), NombreTexte(y1), NombreTexte(x2), NombreTexte(y2))
        Else
            pos = Array(NombreTexte(x1), NombreTexte(y1), "", "")
        End If
    Else
        pos = Array("#ERR", "#ERR", "", "")
    End If
    If typeGraphique = GRAPH_TEXTE Then
        Ecrire Array(n, nomType, valeur, pos(0), pos(1), pos(2), pos(3), LireProp(go, "Size"), LireProp(go, "Angle"), _
            LireProp(go, "Justify"), LireProp(go, "Layer"), "")
    Else
        Ecrire Array(n, nomType, "", pos(0), pos(1), pos(2), pos(3), "", "", "", LireProp(go, "Layer"), "")
    End If
    Exit Sub
Echec:
    Ecrire Array(n, "#ERR " & Err.Number & " : " & Err.Description)
End Sub

' La valeur d'un texte graphique : la propriété Values (un texte, un tableau
' ou une collection de valeurs par langue, selon ce que SEE rend).
Private Function ValeurDuTexte(ByVal go As Object) As String
    Dim v As Variant, o As Variant, s As String, i As Long, ok As Boolean
    ok = LirePropValeur(go, "Values", v)
    If Not ok Then
        ' Values rend peut-être un objet (collection)
        Set v = ObjetProp(go, "Values")
        If v Is Nothing Then
            ValeurDuTexte = "#ERR Values"
            Exit Function
        End If
    End If
    If IsObject(v) Then
        For Each o In ElementsDe(v)
            s = s & LireProp(o, "Value") & " | "
        Next o
        ValeurDuTexte = s
    ElseIf IsArray(v) Then
        For i = LBound(v) To UBound(v)
            s = s & EnTexte(v(i)) & " | "
        Next i
        ValeurDuTexte = s
    Else
        ValeurDuTexte = EnTexte(v)
    End If
End Function

' ============================================================================
'  SondeMethodes : GetMethodsXML pour 22 ConnectionPoints, 29 Cabling,
'  30 CablesTypeDefinition, 36 Connector, 37 ConnectorSymbols, 21 DefaultSymbols.
'  Chaque XML est écrit dans un fichier à côté du classeur.
' ============================================================================
Public Sub SondeMethodes()
    Dim env As Object, types As Variant, noms As Variant, i As Long, v As Variant, texte As String
    Dim fichier As String, ok As Boolean, dossier As String
    Const TITRE_SONDE As String = "SondeMethodes"
    If Not DebutSonde(TITRE_SONDE, "Sonde_Methodes") Then GoTo Fin
    Contexte "SondeMethodes", "Environnement"
    Set env = SEE_Environnement()
    If env Is Nothing Then
        Ecrire Array("#ERR environnement illisible : " & gDerniereErreur)
        GoTo Fin
    End If
    types = Array(22, 29, 30, 36, 37, 21)
    noms = Array("ConnectionPoints", "Cabling", "CablesTypeDefinition", "Connector", "ConnectorSymbols", "DefaultSymbols")
    dossier = DossierDesFichiers()
    Ecrire Array("Dossier", "", "", dossier)
    Entetes Array("Type", "Nom", "Rendu", "Fichier", "Taille (caractères)", "Début du XML")
    For i = LBound(types) To UBound(types)
        Contexte "SondeMethodes", CStr(noms(i))
        texte = ""
        fichier = ""
        If SEE_MethodesXML(env, CLng(types(i)), v) Then
            texte = TexteXML(v)
            If Len(texte) > 0 Then
                fichier = dossier & "\SEE_Methodes_" & types(i) & "_" & noms(i) & ".xml"
                ok = EcrireFichierTexte(fichier, texte)
                If Not ok Then fichier = "#ERR écriture : " & fichier
            End If
            Ecrire Array(types(i), noms(i), TypeName(v), fichier, Len(texte), Left$(Replace(Replace(texte, vbCr, " "), vbLf, " "), 300))
        Else
            Ecrire Array(types(i), noms(i), "#ERR " & gDerniereErreur)
        End If
    Next i
Fin:
    FinSonde TITRE_SONDE
End Sub

' Le texte d'un XML rendu par SEE : une chaîne, ou un objet DOM (propriété xml).
Private Function TexteXML(ByVal v As Variant) As String
    Dim s As String
    TexteXML = ""
    If IsObject(v) Then
        If v Is Nothing Then Exit Function
        s = LireProp(v, "xml")
        If Left$(s, 4) = "#ERR" Then s = LireProp(v, "XML")
        If Left$(s, 4) = "#ERR" Then s = ""
        TexteXML = s
    ElseIf VarType(v) = vbString Then
        TexteXML = CStr(v)
    End If
End Function

' Le dossier où écrire les fichiers de la sonde : celui du classeur s'il est
' sur le disque ; sinon (classeur jamais enregistré, ou ouvert depuis
' OneDrive / SharePoint, dont Path est une adresse « https://... » où l'on ne
' peut pas écrire de fichier) le dossier TEMP de Windows. Le journal le dit.
Public Function DossierDesFichiers() As String
    Dim p As String, raison As String
    p = ThisWorkbook.Path
    If Len(p) = 0 Then
        raison = "le classeur n'a jamais été enregistré"
    ElseIf InStr(1, p, "://", vbBinaryCompare) > 0 Then
        raison = "le classeur est ouvert depuis une adresse web (OneDrive, SharePoint : « " & p & " »)"
    Else
        DossierDesFichiers = p
        Journal gEtape, "fichiers", "", "écrits dans le dossier du classeur : " & p
        Exit Function
    End If
    p = Environ$("TEMP")
    If Len(p) = 0 Then p = CurDir$
    DossierDesFichiers = p
    Journal gEtape, "fichiers", "", raison & " : les fichiers sont écrits dans " & p, -1, "dossier TEMP"
End Function

' Écrit un texte en UTF-8 (ADODB.Stream), sinon en ANSI ; rend Vrai si c'est fait.
Public Function EcrireFichierTexte(ByVal chemin As String, ByVal texte As String) As Boolean
    Dim st As Object, f As Integer
    On Error GoTo SansADO
    Set st = CreateObject("ADODB.Stream")
    st.Type = 2
    st.Charset = "utf-8"
    st.Open
    st.WriteText texte
    st.SaveToFile chemin, 2
    st.Close
    EcrireFichierTexte = True
    Exit Function
SansADO:
    Resume EssaiAnsi
EssaiAnsi:
    On Error GoTo Echec
    f = FreeFile
    Open chemin For Output As #f
    Print #f, texte;
    Close #f
    EcrireFichierTexte = True
    Exit Function
Echec:
    Journal "Fichier", chemin, "Open / Print", "ÉCHEC", Err.Number, Err.Description
    EcrireFichierTexte = False
End Function
