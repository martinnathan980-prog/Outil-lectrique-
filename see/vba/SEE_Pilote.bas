Attribute VB_Name = "SEE_Pilote"
' ============================================================================
'  SEE_Pilote - DESSINER dans SEE Electrical Expert à partir du paquet SEE.
' ----------------------------------------------------------------------------
'  Tout passe par le réglage Simulation : à « O » (le défaut), AUCUN appel
'  qui écrit dans SEE n'est fait ; le journal dit ce qui serait fait (avec les
'  coordonnées SEE calculées). Les lectures (le folio existe-t-il ? le
'  symbole existe-t-il ?) sont faites si SEE est joignable.
'
'    EssaiDessin     un folio d'essai (FolioEssai) : un rectangle aux coins de
'                    la zone, une ligne, des textes, en objets graphiques, pour
'                    valider l'origine, le sens de y et l'échelle
'    EssaiSymboles   sur ce folio : une boîte, deux broches recalées, un fil
'    DessinerPaquet  demande le paquet, dessine les folios choisis (réglage
'                    Folios), avec reprise : un folio est créé sous un nom
'                    PROVISOIRE (PrefixeProvisoire + nom) et ne prend son nom
'                    final qu'une fois dessiné en entier. À la relance, un
'                    folio au nom final est complet (sauté si Remplacer = N),
'                    un folio au nom provisoire est un dessin interrompu
'                    (supprimé et redessiné). La reprise ne dépend donc ni du
'                    bilan ni du classeur. Une ligne de bilan par folio
'                    (feuille Bilan).
'
'  Ce qui n'est PAS établi sur SEE (et se règle, se journalise) : l'ordre des
'  appels pour créer un folio et un symbole, la sémantique de SetManual, la
'  chaîne de AddWireConnection, l'ancre de position d'un texte.
' ============================================================================
Option Explicit

Private Const FEUILLE_BILAN As String = "Bilan"

' --- l'état d'une exécution
Private mPrj As Object          ' le projet SEE
Private mEnv As Object          ' l'environnement SEE
Private mGrp As Object          ' le groupe où créer les folios
Private mSh As Object           ' le folio en cours (Nothing en simulation)
Private mArret As Boolean       ' l'utilisateur a demandé l'arrêt
Private mZonePrete As Boolean   ' la conversion a la zone du cartouche
Private mPointsX As Object      ' ligne de Bornes -> x du point de connexion réel (coordonnées SEE)
Private mPointsY As Object      ' ligne de Bornes -> y
Private mLignesParCle As Object ' "bloc|borne|cote" -> Collection des lignes de Bornes du folio en cours : une
                                ' borne de barrette qui reçoit deux fils a deux pastilles, donc deux lignes
Private mConnecteurs As Object  ' repère -> connecteur SEE (cache de l'exécution)
Private mBorniers As Object     ' repère -> bornier SEE
Private mFormes As Object       ' "famille|symbole" -> forme SEE (ou Nothing)
Private mBornesDuBloc As Object ' bloc -> Collection de lignes de Bornes (folio en cours)
Private mPiecesDuBloc As Object ' bloc -> Collection de lignes de Connecteurs (folio en cours)
Private mPremierFil As Boolean  ' le premier fil SEE de l'exécution (contrôle des segments)
Private mListeFolios As Object  ' nom -> folio SEE du groupe cible : lue une fois si GetSheetByName lève
                                ' une erreur, puis tenue à jour (création, renommage, suppression)
Private mNoms As Object         ' rang du folio dans le paquet -> son nom dans SEE (uniques)
Private mDitTitre As Boolean    ' « titre du cartouche non écrit » est au journal
Private mCoordProvisoires As Boolean ' les coordonnées SEE ne viennent pas du cartouche du folio
Private mMessageFin As String   ' ce que la boîte de fin doit dire en plus
Private mEchecsDeSuite As Long  ' folios de suite qui n'ont pas pu être créés

' trois folios de suite non créés : l'échec est systématique, le lot s'arrête
Private Const ECHECS_MAX As Long = 3
Private Const FOLIO_ESSAI_DEFAUT As String = "ESSAI_PILOTE"

' --- les comptes du folio en cours
Private mNbBlocs As Long
Private mNbBornes As Long
Private mNbFilsSEE As Long
Private mNbFilsDessin As Long
Private mNbFilsSautes As Long
Private mNbGraphiques As Long

' ============================================================================
'  LES MACROS
' ============================================================================

' Un folio d'essai en objets graphiques seulement.
Public Sub EssaiDessin()
    Dim fl As Double, fh As Double
    On Error GoTo Plantage
    If Not Preparer("EssaiDessin") Then GoTo Fin
    If Not OuvrirFolioEssai() Then GoTo Fin
    fl = 420
    fh = 297
    Contexte "EssaiDessin", Reglage("FolioEssai", FOLIO_ESSAI_DEFAUT)
    Journal gEtape, gObjet, "", "attendu : le cadre de la feuille de l'Atelier (0,0)-(420,297) sur la zone ; une diagonale " & _
        "partant du coin HAUT GAUCHE ; un rectangle de 100 x 50 mm à (100, 50) ; des textes qui disent où ils sont"
    DessinerRectangle 0, 0, fl, fh, "cadre de la feuille (420 x 297)"
    If Not Pause("Le cadre (0,0)-(420,297) est posé. Il doit couvrir la zone de travail du cartouche.") Then GoTo Fin
    DessinerLigne 0, 0, 100, 50, "diagonale depuis le coin haut gauche"
    If Not Pause("La diagonale part du coin HAUT GAUCHE vers le bas à droite. Si elle part d'en bas : SensY = -1 (ou OrigineY).") Then GoTo Fin
    DessinerTexte "HAUT GAUCHE (10 ; 10)", 10, 10, 0, "texte en haut à gauche"
    DessinerTexte "BAS DROITE (380 ; 287)", 380, 287, 0, "texte en bas à droite"
    If Not Pause("Deux textes : HAUT GAUCHE et BAS DROITE. Sont-ils à leur place ?") Then GoTo Fin
    DessinerRectangle 100, 50, 200, 100, "rectangle 100 x 50 mm"
    DessinerTexte "x=100 y=50 : rectangle 100 x 50", 150, 45, 0, "légende du rectangle"
    DessinerTexte "vertical (angle 90)", 60, 150, 90, "texte vertical"
    MettreAJourFolio
    Pause "Le rectangle de 100 x 50 mm est posé : mesure-le dans SEE pour vérifier l'échelle."
Fin:
    Terminer "EssaiDessin"
    Exit Sub
Plantage:
    Journal gEtape, gObjet, "(macro)", "ARRÊT IMPRÉVU", Err.Number, Err.Description
    Resume Fin
End Sub

' Sur le folio d'essai : une boîte, deux broches recalées, un fil entre elles,
' selon les réglages EQUIPEMENT.* et TypeConnexion.
Public Sub EssaiSymboles()
    Dim con1 As Object, con2 As Object, x1 As Double, y1 As Double, x2 As Double, y2 As Double
    Dim ok1 As Boolean, ok2 As Boolean, px(0 To 1) As Double, py(0 To 1) As Double
    On Error GoTo Plantage
    If Not Preparer("EssaiSymboles") Then GoTo Fin
    If Not OuvrirFolioEssai() Then GoTo Fin
    Contexte "EssaiSymboles", "boîte ESSAI"
    If Not PoserCorpsSymbole("EQUIPEMENT", 110, 90, 30, 40, "ESSAI", "", "EQ") Then
        Journal gEtape, gObjet, "", "boîte non posée en symbole (EQUIPEMENT.Famille / Symbole) : dessinée"
        DessinerRectangle 110, 90, 140, 130, "boîte ESSAI (dessin)"
        DessinerTexte "ESSAI", 125, 88, 0, "repère de la boîte"
    End If
    If Not Pause("La boîte ESSAI (110,90)-(140,130) est posée.") Then GoTo Fin
    Contexte "EssaiSymboles", "broche ESSAI-A 1"
    Set con1 = ConnecteurPour("EQUIPEMENT", "ESSAI", "A", "EQ")
    ok1 = PoserBroche("EQUIPEMENT", con1, False, RepereDeConnecteur("EQUIPEMENT", "ESSAI", "A"), "1", 150, 110, "D", x1, y1)
    If Not Pause("La broche ESSAI-A 1 est posée et recalée : son point de connexion doit tomber en (150 ; 110).") Then GoTo Fin
    Contexte "EssaiSymboles", "broche ESSAI2-A 1"
    Set con2 = ConnecteurPour("EQUIPEMENT", "ESSAI2", "A", "EQ")
    ok2 = PoserBroche("EQUIPEMENT", con2, False, RepereDeConnecteur("EQUIPEMENT", "ESSAI2", "A"), "1", 250, 110, "G", x2, y2)
    If Not Pause("La broche ESSAI2-A 1 est posée : son point de connexion doit tomber en (250 ; 110).") Then GoTo Fin
    Contexte "EssaiSymboles", "fil ESSAI-W1"
    px(0) = 150
    py(0) = 110
    px(1) = 250
    py(1) = 110
    TracerFilPaquet px, py, 2, "ESSAI-W1", "", ok1, x1, y1, ok2, x2, y2, 200, 107, 0
    MettreAJourFolio
    Pause "Le fil ESSAI-W1 est tracé entre les deux broches (voir le journal : AddWireConnection ou DESSIN)."
Fin:
    Terminer "EssaiSymboles"
    Exit Sub
Plantage:
    Journal gEtape, gObjet, "(macro)", "ARRÊT IMPRÉVU", Err.Number, Err.Description
    Resume Fin
End Sub

' Demande le paquet et dessine les folios choisis.
Public Sub DessinerPaquet()
    Dim chemin As String
    chemin = DemanderFichierPaquet()
    If Len(chemin) = 0 Then Exit Sub
    DessinerPaquetFichier chemin, False
End Sub

' Dessine les folios choisis d'un paquet donné. sansDialogue = Vrai : aucune
' boîte de dialogue (ni confirmation, ni pas à pas) - pour l'appeler depuis
' une autre macro. Elle a des arguments : Excel ne la montre pas dans la
' liste des macros.
Public Sub DessinerPaquetFichier(ByVal chemin As String, Optional ByVal sansDialogue As Boolean = False)
    Dim sel As Collection, f As Variant, ligne As Long, n As Long, faits As Long, lb As Long
    Dim sauverTous As Long, depuisSauvegarde As Long, enAttente As Collection, etat As String, msg As String
    Dim lignesFolios As Object, i As Long, num As Long, nbMax As Long, t0 As Double, nbRenommes As Long
    On Error GoTo Plantage
    gSansDialogue = sansDialogue
    mMessageFin = ""
    mCoordProvisoires = False
    OuvrirJournal "DessinerPaquet"
    Contexte "DessinerPaquet", chemin
    If Not ChargerPaquet(chemin) Then
        Dialogue "Le paquet n'a pas pu être lu (voir la feuille Journal).", vbExclamation, "Pilote SEE"
        GoTo Fin
    End If
    ' les folios du paquet, par rang
    Set lignesFolios = NouveauDico()
    For i = 2 To PaquetNbLignes("Folios")
        num = EnLong(PaquetValeur("Folios", i, "Folio"), 0)
        If num >= 1 Then
            lignesFolios.Item(CStr(num)) = i
            If num > nbMax Then nbMax = num
        End If
    Next i
    ' le nom SEE de chaque folio, calculé sur tout le paquet : uniques, et les
    ' mêmes quel que soit le réglage Folios (un lot dessiné en plusieurs fois)
    Set mNoms = NomsDesFolios(lignesFolios, nbMax, nbRenommes)
    Set sel = SelectionFolios(Reglage("Folios", "1"), nbMax)
    If sel.Count = 0 Then
        Dialogue "Aucun folio choisi (réglage Folios = « " & Reglage("Folios", "1") & " », " & nbMax & " folio(s) dans le paquet).", _
            vbExclamation, "Pilote SEE"
        GoTo Fin
    End If
    msg = "Paquet : " & chemin & vbCrLf & nbMax & " folio(s) dans le paquet, " & sel.Count & " choisi(s) (réglage Folios = « " & _
        Reglage("Folios", "1") & " »)." & vbCrLf & vbCrLf
    If nbRenommes > 0 Then
        msg = msg & nbRenommes & " folio(s) auraient eu le nom d'un autre : ils prennent le suffixe -F<folio> (voir le journal)." & _
            vbCrLf & vbCrLf
    End If
    If gSimulation Then
        msg = msg & "SIMULATION : rien ne sera écrit dans SEE ; le journal dira ce qui serait fait."
    Else
        msg = msg & "ATTENTION : les folios vont être ÉCRITS dans le projet SEE ouvert." & vbCrLf & _
            "Remplacer = " & Reglage("Remplacer", "N") & " ; sauvegarde tous les " & Reglage("SauverTous", "10") & " folio(s)."
    End If
    If sel.Count > 100 And UCase$(Reglage("Journal", "DETAIL")) <> "NORMAL" Then
        msg = msg & vbCrLf & vbCrLf & "Journal = DETAIL : environ 1 500 lignes par folio ; au-delà de 600 folios la feuille " & _
            "Journal sera pleine. Pour un grand lot, passe le réglage Journal à NORMAL."
    End If
    If Dialogue(msg, vbOKCancel + vbQuestion, "Pilote SEE") <> vbOK Then GoTo Fin
    If Not PreparerSEE() Then GoTo Fin
    Application.ScreenUpdating = False
    sauverTous = ReglageEntier("SauverTous", 10)
    Set enAttente = New Collection
    t0 = Timer
    For Each f In sel
        If mArret Then Exit For
        n = n + 1
        Application.StatusBar = "Pilote SEE : folio " & f & " (" & n & " / " & sel.Count & ")"
        If lignesFolios.Exists(CStr(f)) Then
            ligne = lignesFolios.Item(CStr(f))
            etat = DessinerFolio(CLng(f), ligne, CStr(mNoms.Item(CStr(f))), lb)
            If etat = "SIMULE" Then faits = faits + 1
            If etat = "DESSINE" Then
                faits = faits + 1
                depuisSauvegarde = depuisSauvegarde + 1
                ' la LIGNE du bilan (et non le rang du folio, que deux paquets peuvent partager)
                enAttente.Add lb
                If sauverTous > 0 And depuisSauvegarde >= sauverTous Then
                    ' un folio reste « en attente » tant qu'une sauvegarde n'a pas réussi
                    If SauverProjet() Then
                        MarquerSauves enAttente
                        Set enAttente = New Collection
                        SauverClasseur
                    End If
                    depuisSauvegarde = 0
                End If
            End If
        Else
            Journal "DessinerPaquet", "folio " & f, "", "absent de la feuille Folios du paquet", -1, "folio inconnu"
        End If
        DoEvents
    Next f
    If enAttente.Count > 0 Then
        If SauverProjet() Then
            MarquerSauves enAttente
            SauverClasseur
        End If
    End If
    Journal "DessinerPaquet", "", "", n & " folio(s) traité(s), " & faits & IIf(gSimulation, " simulé(s), ", " dessiné(s), ") & gNbErreurs & " erreur(s), " & _
        Format$(Duree(t0), "0") & " s" & IIf(mArret, " ; lot ARRÊTÉ avant la fin", "")
Fin:
    Terminer "DessinerPaquet"
    gSansDialogue = False
    Exit Sub
Plantage:
    Journal gEtape, gObjet, "(macro)", "ARRÊT IMPRÉVU", Err.Number, Err.Description
    Resume Fin
End Sub

' ============================================================================
'  PREPARATION ET FIN
' ============================================================================

' Le début commun des essais : journal, connexion, projet, groupe.
Private Function Preparer(ByVal titre As String) As Boolean
    Preparer = False
    mMessageFin = ""
    mCoordProvisoires = False
    OuvrirJournal titre
    Set gPaquet = Nothing
    Set gEntete = Nothing
    Preparer = PreparerSEE()
End Function

' Connexion, projet, environnement, groupe cible ; remet l'état à zéro. En
' simulation, on continue même sans SEE (les lectures sont alors sautées).
Private Function PreparerSEE() As Boolean
    PreparerSEE = False
    mArret = False
    mZonePrete = False
    mPremierFil = True
    Set mPrj = Nothing
    Set mEnv = Nothing
    Set mGrp = Nothing
    Set mSh = Nothing
    Set mPointsX = NouveauDicoExact()
    Set mPointsY = NouveauDicoExact()
    Set mConnecteurs = NouveauDicoExact()
    Set mBorniers = NouveauDicoExact()
    Set mFormes = NouveauDicoExact()
    Set mListeFolios = Nothing
    mDitTitre = False
    mCoordProvisoires = False
    mEchecsDeSuite = 0
    OublierConversion
    Contexte "Préparation", ""
    If Not ConnecterSEE() Then
        If gSimulation Then
            Journal gEtape, gObjet, "", "SEE injoignable : simulation SANS SEE (ni lecture ni écriture ; zone du cartouche inconnue)"
            Set gApp = Nothing
            PreparerSEE = True
        Else
            Dialogue "Impossible de se connecter à SEE (voir la feuille Journal).", vbExclamation, "Pilote SEE"
        End If
        Exit Function
    End If
    If gEstAutomation Then
        ' la coclasse SeeAutomation n'a ni GetProject ni GetEnvironment, et son
        ' CreateObject n'a pas la signature de celui d'Application : rien ne
        ' pourrait être créé, chaque folio finirait en ERREUR
        If gSimulation Then
            Journal gEtape, gObjet, "", "connecté par la coclasse SeeAutomation : la simulation continue SANS lecture dans SEE", -1, "SeeAutomation"
            Set gApp = Nothing
            PreparerSEE = True
        Else
            Journal gEtape, gObjet, "", "connecté par la coclasse SeeAutomation : le pilote ne sait pas dessiner par elle ; arrêt avant tout folio", -1, "SeeAutomation"
            gNbErreurs = gNbErreurs + 1
            Dialogue "SEE répond par la coclasse SeeAutomation, avec laquelle le pilote ne sait pas créer d'objets." & vbCrLf & _
                "Mets en tête des réglages ProgID / CLSID_Application ceux de la coclasse Application (voir diagnostic.ps1), " & _
                "puis relance. Rien n'a été écrit.", vbExclamation, "Pilote SEE"
        End If
        Exit Function
    End If
    ' en simulation, un projet à ouvrir l'est en lecture seule
    Set mPrj = SEE_Projet(gSimulation)
    If mPrj Is Nothing Then
        Journal gEtape, gObjet, "", "aucun projet : ouvre-le dans SEE ou remplis le réglage Projet", -1, "pas de projet"
        If Not gSimulation Then
            Dialogue "Aucun projet SEE ouvert (voir la feuille Journal).", vbExclamation, "Pilote SEE"
            Exit Function
        End If
    Else
        Journal gEtape, "projet", "", "« " & LireProp(mPrj, "Name") & " »"
    End If
    Set mEnv = SEE_Environnement()
    If Not mPrj Is Nothing Then Set mGrp = GroupeCible()
    If mGrp Is Nothing And Not gSimulation Then
        Dialogue "Groupe cible introuvable (voir la feuille Journal).", vbExclamation, "Pilote SEE"
        Exit Function
    End If
    PreparerSEE = True
End Function

' Le groupe du réglage Groupe (sous-groupe du groupe principal, créé s'il
' manque), ou le groupe principal.
Private Function GroupeCible() As Object
    Dim principal As Object, sg As Object, nom As String
    Set GroupeCible = Nothing
    Set principal = SEE_GroupePrincipal(mPrj)
    If principal Is Nothing Then Exit Function
    nom = Reglage("Groupe", "")
    If Len(nom) = 0 Then
        Set GroupeCible = principal
        Exit Function
    End If
    Set sg = SEE_SousGroupe(principal, nom)
    If sg Is Nothing Then
        If gSimulation Then
            JournalSimulation "Group.CreateSubGroup(""" & nom & """)", "le sous-groupe serait créé"
            Set GroupeCible = principal
            Exit Function
        End If
        On Error GoTo Echec
        If EstV4() Then
            principal.CreateSubGroup nom, sg
        Else
            Set sg = principal.CreateSubGroup(nom)
        End If
        On Error GoTo 0
        If sg Is Nothing Then Set sg = SEE_SousGroupe(principal, nom)
        Journal gEtape, nom, "Group.CreateSubGroup(""" & nom & """)", IIf(sg Is Nothing, "Nothing", "créé")
    End If
    Set GroupeCible = sg
    Exit Function
Echec:
    JournalErreur "Group.CreateSubGroup(""" & nom & """)", Err.Number, Err.Description
    Set GroupeCible = Nothing
End Function

Private Sub Terminer(ByVal titre As String)
    On Error Resume Next
    Application.StatusBar = False
    Application.ScreenUpdating = True
    If mCoordProvisoires Then
        If gSimulation Then
            AjouterMessageFin "Coordonnées SEE du journal PROVISOIRES : la zone du cartouche n'a pas été lue sur le folio " & _
                "qui sera créé (voir les lignes « Conversion » du journal ; remplis le réglage Cartouche, ou simule avec SEE ouvert)."
        Else
            AjouterMessageFin "La zone du cartouche n'a pas pu être lue : les folios ont été dessinés en mode ECHELLE " & _
                "(réglages Echelle, OrigineX, OrigineY) au lieu d'AJUSTER (voir les lignes « Conversion » du journal)."
        End If
    End If
    Journal "Fin", titre, "", "terminé ; " & gNbErreurs & " erreur(s)" & IIf(gSimulation, " ; SIMULATION : rien n'a été écrit dans SEE", "") & _
        IIf(Len(mMessageFin) > 0, " ; " & Replace(mMessageFin, vbCrLf, " ; "), "")
    FeuilleCreee(FEUILLE_JOURNAL, False).Activate
    Dialogue titre & " terminé." & vbCrLf & gNbErreurs & " erreur(s) : voir la feuille Journal" & _
        IIf(gSimulation, vbCrLf & "SIMULATION : rien n'a été écrit dans SEE.", "") & _
        IIf(Len(mMessageFin) > 0, vbCrLf & vbCrLf & mMessageFin, ""), vbInformation, "Pilote SEE"
    mMessageFin = ""
End Sub

' Une phrase de plus pour la boîte de fin (et la dernière ligne du journal).
Private Sub AjouterMessageFin(ByVal texte As String)
    If InStr(1, mMessageFin, texte, vbBinaryCompare) > 0 Then Exit Sub
    If Len(mMessageFin) > 0 Then mMessageFin = mMessageFin & vbCrLf
    mMessageFin = mMessageFin & texte
End Sub

' Pas à pas : une boîte de dialogue ; Faux (et arrêt) si l'utilisateur annule.
Private Function Pause(ByVal message As String) As Boolean
    Pause = True
    If mArret Then
        Pause = False
        Exit Function
    End If
    If Not ReglageOui("PasAPas", "N") Then Exit Function
    Application.ScreenUpdating = True
    If gSansDialogue Then Exit Function
    If Dialogue(message & vbCrLf & vbCrLf & "OK : continuer ; Annuler : arrêter ici.", vbOKCancel + vbInformation, _
            "Pilote SEE - pas à pas") <> vbOK Then
        mArret = True
        Pause = False
        Journal gEtape, gObjet, "", "arrêt demandé (pas à pas)"
    End If
End Function

Private Function Duree(ByVal t0 As Double) As Double
    Dim t As Double
    t = Timer
    If t < t0 Then t = t + 86400
    Duree = t - t0
End Function

' Ouvre (ou crée) le folio d'essai et prépare la conversion sur sa zone. Un
' folio existant n'est proposé à la suppression que s'il porte le nom par
' défaut (ESSAI_PILOTE) ou si Remplacer = O, et le bouton par défaut ne
' supprime rien : FolioEssai peut nommer un vrai folio.
Private Function OuvrirFolioEssai() As Boolean
    Dim nom As String, existant As Object, rep As Long
    OuvrirFolioEssai = False
    nom = Reglage("FolioEssai", FOLIO_ESSAI_DEFAUT)
    Contexte "Folio d'essai", nom
    If Not ChercherFolio(nom, existant) Then
        If Not gSimulation Then Exit Function
    End If
    If Not existant Is Nothing Then
        If nom = FOLIO_ESSAI_DEFAUT Or ReglageOui("Remplacer", "N") Then
            rep = Dialogue("Le folio « " & nom & " » existe déjà dans SEE." & vbCrLf & vbCrLf & _
                "Oui : le supprimer et le recréer" & vbCrLf & "Non : dessiner dedans" & vbCrLf & "Annuler : arrêter", _
                vbYesNoCancel + vbQuestion + vbDefaultButton2, "Pilote SEE")
        Else
            rep = Dialogue("Le folio « " & nom & " » existe déjà dans SEE : l'essai dessinera DEDANS." & vbCrLf & _
                "(Il n'est proposé à la suppression que s'il s'appelle " & FOLIO_ESSAI_DEFAUT & ", ou si Remplacer = O.)" & _
                vbCrLf & vbCrLf & "OK : dessiner dedans ; Annuler : arrêter", _
                vbOKCancel + vbQuestion + vbDefaultButton2, "Pilote SEE")
            If rep = vbOK Then rep = vbNo
        End If
        If rep = vbCancel Then Exit Function
        If rep = vbYes Then
            If Not SupprimerFolio(existant, nom, "folio d'essai supprimé pour être recréé") Then Exit Function
            Set existant = Nothing
        Else
            Set mSh = existant
            Journal gEtape, gObjet, "", "on dessine dans le folio existant"
        End If
    End If
    If existant Is Nothing Then
        Set mSh = CreerFolio(nom, "", "")
        If mSh Is Nothing And Not gSimulation Then Exit Function
    End If
    PreparerZone
    OuvrirFolioEssai = True
End Function

' ============================================================================
'  UN FOLIO DU PAQUET
'  Rend l'état : "DESSINE", "SAUTE", "ERREUR", "ARRETE" (ou "SIMULE" en
'  simulation) ; lb reçoit la ligne du bilan.
'  La règle de la reprise : un folio est créé sous son nom PROVISOIRE et ne
'  prend son nom final qu'une fois dessiné en entier. Donc, à la relance :
'    - un folio au nom final est complet : sauté (Remplacer = N), ou redessiné
'      sous le nom provisoire, l'ancien n'étant supprimé qu'à la fin (O) ;
'    - un folio au nom provisoire est un dessin interrompu (erreur, arrêt,
'      Excel fermé) : supprimé, puis redessiné, quel que soit Remplacer.
' ============================================================================
Private Function DessinerFolio(ByVal folio As Long, ByVal ligne As Long, ByVal nom As String, ByRef lb As Long) As String
    Dim nomProv As String, t0 As Double, existant As Object, provisoire As Object, erreurs0 As Long
    Dim l As Variant, etat As String, remarque As String, numErr As Long, descErr As String, etatAvant As String
    On Error GoTo Plantage
    t0 = Timer
    lb = 0
    erreurs0 = gNbErreurs
    mNbBlocs = 0
    mNbBornes = 0
    mNbFilsSEE = 0
    mNbFilsDessin = 0
    mNbFilsSautes = 0
    mNbGraphiques = 0
    Set mPointsX = NouveauDicoExact()
    Set mPointsY = NouveauDicoExact()
    Set mSh = Nothing
    nomProv = NomProvisoire(nom)
    Contexte "Folio " & folio, nom
    lb = LigneBilan(nom)
    etatAvant = CStr(FeuilleBilan().Cells(lb, 3).Value)
    remarque = PaquetTexte("Folios", ligne, "Remarque")
    ' --- reprise : le folio est-il déjà dans SEE, complet (nom final) ou interrompu (nom provisoire) ?
    If Not ChercherFolio(nom, existant) Or Not ChercherFolio(nomProv, provisoire) Then
        If Not gSimulation Then
            ' sans cette réponse, un folio pourrait être créé en double à chaque relance
            mArret = True
            AjouterMessageFin "Lot ARRÊTÉ : impossible de savoir si un folio existe déjà dans SEE (voir le journal)."
            EcrireBilan lb, folio, nom, "ERREUR", t0, "existence du folio dans SEE inconnue : lot arrêté"
            DessinerFolio = "ERREUR"
            Exit Function
        End If
    End If
    If Not existant Is Nothing And Not ReglageOui("Remplacer", "N") Then
        If Not provisoire Is Nothing Then
            ' le reste d'un dessin interrompu, alors que le folio complet existe
            SupprimerFolio provisoire, nomProv, "reste d'un dessin interrompu (le folio complet existe)"
        End If
        Journal gEtape, gObjet, "", "existe déjà dans SEE sous son nom final, donc complet : sauté (Remplacer = N)" & _
            IIf(EtatIncomplet(etatAvant), " ; le bilan disait « " & etatAvant & " » (d'une version du pilote sans nom provisoire, " & _
            "ou d'un folio fait à la main) : s'il est incomplet, relance ce folio avec Remplacer = O", ""), _
            IIf(EtatIncomplet(etatAvant), -1, 0), IIf(EtatIncomplet(etatAvant), "folio peut-être incomplet", "")
        NoterSaut lb, folio, nom, etatAvant, t0
        DessinerFolio = "SAUTE"
        Exit Function
    End If
    If Not provisoire Is Nothing Then
        Journal gEtape, gObjet, "", "« " & nomProv & " » : un dessin interrompu de ce folio (bilan : « " & etatAvant & _
            " ») ; il est supprimé, puis le folio est redessiné"
        If Not SupprimerFolio(provisoire, nomProv, "dessin interrompu supprimé") Then
            EcrireBilan lb, folio, nom, "ERREUR", t0, "le dessin interrompu « " & nomProv & " » n'a pas pu être supprimé : " & gDerniereErreur
            DessinerFolio = "ERREUR"
            Exit Function
        End If
    End If
    EcrireBilan lb, folio, nom, "EN COURS", t0, remarque
    ' --- le folio, sous son nom provisoire, et son cartouche
    Set mSh = CreerFolio(nomProv, PaquetTexte("Folios", ligne, "Dessine"), PaquetTexte("Folios", ligne, "Titre"))
    If mSh Is Nothing And Not gSimulation Then
        EcrireBilan lb, folio, nom, "ERREUR", t0, "folio non créé : " & gDerniereErreur
        mEchecsDeSuite = mEchecsDeSuite + 1
        If mEchecsDeSuite >= ECHECS_MAX And Not mArret Then
            mArret = True
            AjouterMessageFin "Lot ARRÊTÉ : " & ECHECS_MAX & " folios de suite n'ont pas pu être créés (si c'est le renommage, " & _
                "SEE refuse peut-être le nom provisoire : change le réglage PrefixeProvisoire)."
        End If
        DessinerFolio = "ERREUR"
        Exit Function
    End If
    mEchecsDeSuite = 0
    If Not mZonePrete Then PreparerZone
    If Not Pause("Folio « " & nom & " » créé (sous le nom provisoire « " & nomProv & " »), cartouche posé.") Then GoTo Arret
    ' --- les blocs
    IndexerFolio folio
    For Each l In PaquetLignesDuFolio("Blocs", folio)
        If mArret Then GoTo Arret
        PoserBloc CLng(l)
    Next l
    If Not Pause("Folio « " & nom & " » : " & mNbBlocs & " bloc(s) posé(s), " & mNbBornes & " broche(s) / borne(s).") Then GoTo Arret
    ' --- les fils
    For Each l In PaquetLignesDuFolio("Fils", folio)
        If mArret Then GoTo Arret
        PoserFil CLng(l)
    Next l
    If PaquetLignesDuFolio("Jonctions", folio).Count > 0 Then
        Journal gEtape, gObjet, "", PaquetLignesDuFolio("Jonctions", folio).Count & _
            " point(s) de jonction du paquet non dessinés (SEE les fait lui-même sur des fils connectés ; en DESSIN, ils manquent)"
    End If
    MettreAJourFolio
    If Not Pause("Folio « " & nom & " » : " & mNbFilsSEE & " fil(s) SEE, " & mNbFilsDessin & " en dessin, " & _
        mNbFilsSautes & " non dessiné(s).") Then GoTo Arret
    ' --- complet : l'ancien folio (Remplacer = O) est supprimé, le nouveau prend le nom final
    If Not existant Is Nothing Then
        If Not SupprimerFolio(existant, nom, "ancien folio remplacé (Remplacer = O)") Then
            EcrireBilan lb, folio, nom, "ERREUR", t0, "l'ancien folio n'a pas pu être supprimé : le nouveau reste sous « " & _
                nomProv & " » (il sera redessiné à la relance)", gNbErreurs - erreurs0
            DessinerFolio = "ERREUR"
            Exit Function
        End If
    End If
    If Not RenommerFolio(mSh, nomProv, nom) Then
        EcrireBilan lb, folio, nom, "ERREUR", t0, "renommage final impossible : le folio reste sous « " & nomProv & _
            " » (il sera redessiné à la relance) ; " & gDerniereErreur, gNbErreurs - erreurs0
        DessinerFolio = "ERREUR"
        Exit Function
    End If
    If gSimulation Then etat = "SIMULE" Else etat = "DESSINE"
    EcrireBilan lb, folio, nom, etat, t0, remarque, gNbErreurs - erreurs0
    DessinerFolio = etat
    Exit Function
Arret:
    EcrireBilan lb, folio, nom, "ARRETE", t0, "arrêté avant la fin : le folio reste sous « " & nomProv & _
        " » (il sera redessiné à la relance)", gNbErreurs - erreurs0
    DessinerFolio = "ARRETE"
    Exit Function
Plantage:
    ' une erreur imprévue n'arrête pas le lot : le folio est marqué ERREUR, il
    ' garde son nom provisoire (il sera redessiné à la relance), on passe au suivant
    numErr = Err.Number
    descErr = Err.Description
    gNbErreurs = gNbErreurs + 1
    Journal gEtape, gObjet, "(folio)", "ARRÊT IMPRÉVU du folio : on passe au suivant", numErr, descErr
    EcrireBilan lb, folio, nom, "ERREUR", t0, "arrêt imprévu : " & numErr & " " & descErr & " ; le folio reste sous « " & _
        nomProv & " » (il sera redessiné à la relance)", gNbErreurs - erreurs0
    DessinerFolio = "ERREUR"
End Function

' Un état du bilan qui dit qu'un folio n'a pas été fini.
Private Function EtatIncomplet(ByVal etat As String) As Boolean
    EtatIncomplet = (etat = "EN COURS" Or etat = "ERREUR" Or etat = "ARRETE")
End Function

' Le nom provisoire d'un folio : PrefixeProvisoire + nom (jamais vide).
Private Function NomProvisoire(ByVal nom As String) As String
    Dim p As String
    p = NomPropre(Reglage("PrefixeProvisoire", "~"))
    If Len(p) = 0 Then p = "~"
    NomProvisoire = p & nom
End Function

' Le nom d'un folio du paquet selon le modèle NomFolio, sans caractère interdit.
Private Function NomDuFolio(ByVal folio As Long, ByVal ligne As Long) As String
    Dim nom As String
    nom = Modele(Reglage("NomFolio", "{Nom}"), "Nom", PaquetTexte("Folios", ligne, "Nom"), _
        "Plan", PaquetTexte("Folios", ligne, "Plan"), "Folio", CStr(folio), "Harness", PaquetTexte("Folios", ligne, "Harness"))
    nom = NomPropre(nom)
    If Len(nom) = 0 Then nom = "F" & folio
    NomDuFolio = nom
End Function

' Le nom SEE de chaque folio du paquet (rang -> nom), calculé sur TOUT le
' paquet, dans l'ordre des rangs, pour qu'un lot dessiné en plusieurs fois
' donne toujours les mêmes noms. Deux folios ne peuvent pas porter le même
' nom (« 12/A » et « 12-A » deviennent tous deux « 12-A » ; un modèle
' NomFolio sans {Nom} ni {Folio}) : le second serait sauté, ou supprimerait
' le premier. Il prend donc « -F<rang> », et le journal le dit. La casse
' n'est pas une différence (la comparaison des noms par SEE n'est pas
' établie), et un nom final ne doit pas être le nom provisoire d'un autre.
Private Function NomsDesFolios(ByVal lignesFolios As Object, ByVal nbMax As Long, ByRef nbRenommes As Long) As Object
    Dim noms As Object, pris As Object, i As Long, nomDeBase As String, nom As String
    Set noms = NouveauDicoExact()
    Set pris = NouveauDico()
    nbRenommes = 0
    For i = 1 To nbMax
        If lignesFolios.Exists(CStr(i)) Then
            nomDeBase = NomDuFolio(i, lignesFolios.Item(CStr(i)))
            nom = nomDeBase
            Do While pris.Exists(nom) Or pris.Exists(NomProvisoire(nom))
                nom = nom & "-F" & i
            Loop
            If nom <> nomDeBase Then
                nbRenommes = nbRenommes + 1
                Journal "Noms", "folio " & i, "", "« " & nomDeBase & " » est déjà le nom d'un autre folio du paquet : ce folio s'appellera « " & _
                    nom & " »", -1, "nom en double"
            End If
            pris.Add nom, i
            If Not pris.Exists(NomProvisoire(nom)) Then pris.Add NomProvisoire(nom), i
            noms.Add CStr(i), nom
        End If
    Next i
    Set NomsDesFolios = noms
End Function

' Le folio du groupe cible qui porte ce nom (o = Nothing s'il n'y en a pas).
' Une ERREUR de GetSheetByName ne vaut pas « absent » : la réponse est alors
' prise dans la liste des folios du groupe (lue une fois, puis tenue à jour).
' Faux si on ne peut pas savoir (l'appel et la liste échouent tous deux).
Private Function ChercherFolio(ByVal nom As String, ByRef o As Object) As Boolean
    Dim numErr As Long, descErr As String
    Set o = Nothing
    ChercherFolio = True
    If mGrp Is Nothing Or gApp Is Nothing Then Exit Function
    If SEE_FolioParNom(mGrp, nom, o, numErr, descErr) Then Exit Function
    If Not ListeDesFolios() Then
        gNbErreurs = gNbErreurs + 1
        gDerniereErreur = "Group.GetSheetByName : " & numErr & " " & descErr
        Journal gEtape, gObjet, "Group.GetSheetByName(""" & nom & """)", "ERREUR, et la liste des folios du groupe est " & _
            "illisible : on ne sait pas si « " & nom & " » existe", numErr, descErr
        ChercherFolio = False
        Exit Function
    End If
    If mListeFolios.Exists(nom) Then Set o = mListeFolios.Item(nom)
    Journal gEtape, gObjet, "Group.GetSheetByName(""" & nom & """)", "erreur (sans doute : folio absent) ; d'après la liste " & _
        "des folios du groupe, « " & nom & " » est " & IIf(o Is Nothing, "absent", "présent"), numErr, descErr
End Function

' La liste des folios du groupe cible (nom -> folio), lue une fois. Faux si
' elle est illisible ou incomplète (Count et éléments ne concordent pas).
Private Function ListeDesFolios() As Boolean
    Dim c As Object, elements As Collection, o As Variant, nom As String, n As Long
    ListeDesFolios = Not (mListeFolios Is Nothing)
    If ListeDesFolios Then Exit Function
    Set c = SEE_FoliosDuGroupe(mGrp)
    If c Is Nothing Then Exit Function
    n = NombreDe(c)
    If n < 0 Then Exit Function
    Set elements = ElementsDe(c)
    If elements.Count <> n Then Exit Function
    Set mListeFolios = NouveauDicoExact()
    For Each o In elements
        nom = LireProp(o, "Name")
        If Left$(nom, 4) = "#ERR" Then
            Set mListeFolios = Nothing
            Exit Function
        End If
        If Not mListeFolios.Exists(nom) Then mListeFolios.Add nom, o
    Next o
    Journal gEtape, "groupe", "Group.GetSheetCollection()", "liste des folios du groupe lue : " & n & " folio(s) ; elle répond " & _
        "désormais quand GetSheetByName lève une erreur"
    ListeDesFolios = True
End Function

' La liste des folios tenue à jour (si elle a été lue) : un folio créé ou
' renommé (ancien = son nom d'avant, ou ""), un folio supprimé (nouveau = "").
Private Sub ListeChange(ByVal ancien As String, ByVal nouveau As String, ByVal sh As Object)
    If mListeFolios Is Nothing Then Exit Sub
    If Len(ancien) > 0 Then
        If mListeFolios.Exists(ancien) Then mListeFolios.Remove ancien
    End If
    If Len(nouveau) > 0 And Not sh Is Nothing Then
        If mListeFolios.Exists(nouveau) Then mListeFolios.Remove nouveau
        mListeFolios.Add nouveau, sh
    End If
End Sub

' Un nom de folio sans \ / : * ? " < > |
Private Function NomPropre(ByVal s As String) As String
    Dim c As Variant
    For Each c In Array("\", "/", ":", "*", "?", """", "<", ">", "|")
        s = Replace(s, CStr(c), "_")
    Next c
    NomPropre = Trim$(s)
End Function

' Les bornes et les pièces de connecteur du folio, rangées par bloc ; les
' lignes de Bornes rangées par Bloc|Borne|Côté (la clé que citent les fils).
' Clés SENSIBLES à la casse : « a » et « A » sont deux contacts d'un
' connecteur circulaire.
Private Sub IndexerFolio(ByVal folio As Long)
    Dim l As Variant, b As String, cle As String, c As Collection
    Set mBornesDuBloc = NouveauDicoExact()
    Set mPiecesDuBloc = NouveauDicoExact()
    Set mLignesParCle = NouveauDicoExact()
    For Each l In PaquetLignesDuFolio("Bornes", folio)
        b = PaquetTexte("Bornes", CLng(l), "Bloc")
        If Not mBornesDuBloc.Exists(b) Then mBornesDuBloc.Add b, New Collection
        mBornesDuBloc.Item(b).Add CLng(l)
        cle = CleBorne(CLng(l))
        If Not mLignesParCle.Exists(cle) Then mLignesParCle.Add cle, New Collection
        mLignesParCle.Item(cle).Add CLng(l)
    Next l
    ' une borne citée par plusieurs lignes : une borne de barrette qui reçoit
    ' deux fils (deux pastilles) ; chaque fil est accroché à SA pastille
    For Each l In mLignesParCle.Keys
        Set c = mLignesParCle.Item(l)
        If c.Count > 1 Then
            Journal "Folio " & folio, CStr(l), "", "borne citée par " & c.Count & " lignes de Bornes (une pastille par fil) : " & _
                "chaque fil est accroché à la ligne que désigne son tracé ; en BORNIER, " & c.Count & _
                " symboles de borne de ce nom sont posés sur le bornier (ce que SEE en fait n'est pas établi)"
        End If
    Next l
    For Each l In PaquetLignesDuFolio("Connecteurs", folio)
        b = PaquetTexte("Connecteurs", CLng(l), "Bloc")
        If Not mPiecesDuBloc.Exists(b) Then mPiecesDuBloc.Add b, New Collection
        mPiecesDuBloc.Item(b).Add CLng(l)
    Next l
End Sub

Private Function LignesDe(ByVal d As Object, ByVal bloc As String) As Collection
    If d Is Nothing Then
        Set LignesDe = New Collection
    ElseIf d.Exists(bloc) Then
        Set LignesDe = d.Item(bloc)
    Else
        Set LignesDe = New Collection
    End If
End Function

' ============================================================================
'  CREER, SUPPRIMER, METTRE A JOUR, SAUVER
' ============================================================================

' Crée un folio dans le groupe cible : objet folio, Type, AddSheet, Rename,
' cartouche, dessinateur. Nothing en simulation ou en cas d'échec. Si le
' renommage échoue, le folio créé est SUPPRIMÉ : sous le nom que SEE lui a
' donné, rien ne le retrouverait, et chaque relance en ferait un de plus. Si
' même la suppression échoue, le lot s'arrête.
Private Function CreerFolio(ByVal nom As String, ByVal dessine As String, ByVal titreFolio As String) As Object
    Dim sh As Object, typeFolio As Long, tb As Object, nomTb As String, v As Variant
    Dim numErr As Long, descErr As String, nomSEE As String
    Set CreerFolio = Nothing
    typeFolio = ReglageEntier("TypeFolio", 9)
    nomTb = Reglage("Cartouche", "")
    If gSimulation Then
        JournalSimulation "CreateObject(" & OBJ_FOLIO & ") ; .Type = " & typeFolio & " ; Group.AddSheet ; Sheet.Rename(""" & nom & """)", _
            IIf(Len(nomTb) > 0, "; SetTitleBlock(« " & nomTb & " »)", "; cartouche par défaut")
        Exit Function
    End If
    Set sh = NouvelObjet(OBJ_FOLIO)
    If sh Is Nothing Then Exit Function
    EcrireProp sh, "Type", typeFolio
    On Error GoTo EchecAjout
    mGrp.AddSheet sh
    On Error GoTo 0
    JournalCOM "Group.AddSheet(folio)", "ok"
    ' le type est relu : s'il n'a pas tenu avant AddSheet, on le remet
    If LirePropValeur(sh, "Type", v) Then
        If EnLong(v, typeFolio) <> typeFolio Then EcrireProp sh, "Type", typeFolio
    End If
    On Error Resume Next
    Err.Clear
    sh.Rename nom
    numErr = Err.Number
    descErr = Err.Description
    Err.Clear
    On Error GoTo 0
    If numErr <> 0 Then
        nomSEE = LireProp(sh, "Name")
        JournalErreur "Sheet.Rename(""" & nom & """)", numErr, descErr & " (le folio créé s'appelle « " & nomSEE & " »)"
        If SupprimerFolio(sh, nomSEE, "folio créé mais non renommé : supprimé") Then
            Journal gEtape, gObjet, "", "folio non créé : SEE refuse le nom « " & nom & " »", -1, "nom refusé"
        Else
            mArret = True
            AjouterMessageFin "Lot ARRÊTÉ : un folio créé n'a pu être ni renommé ni supprimé ; il reste dans SEE sous le nom « " & _
                nomSEE & " » : supprime-le à la main."
        End If
        gDerniereErreur = "Sheet.Rename(""" & nom & """) : " & numErr & " " & descErr
        Exit Function
    End If
    JournalCOM "Sheet.Rename(""" & nom & """)", "ok"
    ListeChange "", nom, sh
    If Len(nomTb) > 0 Then
        Set tb = SEE_CartoucheParNom(mPrj, nomTb)
        If tb Is Nothing And Not mEnv Is Nothing Then Set tb = SEE_CartoucheParNom(mEnv, nomTb)
        If tb Is Nothing Then
            Journal gEtape, gObjet, "GetTitleBlockByName(""" & nomTb & """)", "cartouche introuvable : celui par défaut reste", -1, "cartouche absent"
        Else
            AppelEcriture1 sh, "SetTitleBlock", tb, "Sheet.SetTitleBlock(« " & nomTb & " »)"
        End If
    End If
    If Len(dessine) > 0 Then EcrireProp sh, "DrawnBy", dessine
    If Len(titreFolio) > 0 And Not mDitTitre Then
        mDitTitre = True
        Journal gEtape, gObjet, "", "le titre / l'indice du cartouche ne sont pas écrits (attributs du cartouche non établis)"
    End If
    Set CreerFolio = sh
    Exit Function
EchecAjout:
    JournalErreur "Group.AddSheet(folio)", Err.Number, Err.Description
    Set CreerFolio = Nothing
End Function

' Renomme un folio (le nom final, une fois le folio dessiné en entier).
Private Function RenommerFolio(ByVal sh As Object, ByVal ancien As String, ByVal nouveau As String) As Boolean
    RenommerFolio = False
    If gSimulation Then
        JournalSimulation "Sheet.Rename(""" & nouveau & """)", "le folio « " & ancien & " », complet, prendrait son nom final"
        RenommerFolio = True
        Exit Function
    End If
    If sh Is Nothing Then Exit Function
    On Error GoTo Echec
    sh.Rename nouveau
    On Error GoTo 0
    JournalCOM "Sheet.Rename(""" & nouveau & """)", "ok : « " & ancien & " » complet prend son nom final"
    ListeChange ancien, nouveau, sh
    RenommerFolio = True
    Exit Function
Echec:
    JournalErreur "Sheet.Rename(""" & nouveau & """) (nom final de « " & ancien & " »)", Err.Number, Err.Description
End Function

' Supprime un folio du groupe cible ; pourquoi : ce que dit le journal.
Private Function SupprimerFolio(ByVal sh As Object, ByVal nom As String, ByVal pourquoi As String) As Boolean
    SupprimerFolio = False
    If gSimulation Then
        JournalSimulation "Group.DeleteSheet(« " & nom & " »)", pourquoi
        SupprimerFolio = True
        Exit Function
    End If
    On Error GoTo Echec
    mGrp.DeleteSheet sh
    On Error GoTo 0
    Journal gEtape, gObjet, "Group.DeleteSheet(« " & nom & " »)", pourquoi
    ListeChange nom, "", Nothing
    SupprimerFolio = True
    Exit Function
Echec:
    JournalErreur "Group.DeleteSheet(« " & nom & " »)", Err.Number, Err.Description
End Function

Private Sub MettreAJourFolio()
    If gSimulation Then
        JournalSimulation "Sheet.Update", ""
        Exit Sub
    End If
    If mSh Is Nothing Then Exit Sub
    On Error GoTo Echec
    mSh.Update
    JournalCOM "Sheet.Update", "ok"
    Exit Sub
Echec:
    JournalErreur "Sheet.Update", Err.Number, Err.Description
End Sub

Private Function SauverProjet() As Boolean
    SauverProjet = False
    Contexte "Sauvegarde", ""
    If gSimulation Then
        JournalSimulation "Project.Save", ""
        Exit Function
    End If
    If mPrj Is Nothing Then Exit Function
    On Error GoTo Echec
    mPrj.Save
    Journal gEtape, gObjet, "Project.Save", "projet sauvé"
    SauverProjet = True
    Exit Function
Echec:
    JournalErreur "Project.Save", Err.Number, Err.Description
End Function

' Après une sauvegarde réussie du projet : le classeur pilote aussi, pour que
' son bilan dise ce qui est dans SEE (s'il a déjà un fichier et n'est pas en
' lecture seule). La reprise n'en dépend pas (noms provisoires).
Private Sub SauverClasseur()
    ' rien ici ne doit arrêter le lot : toute erreur est journalisée
    On Error GoTo Echec
    If gSimulation Then Exit Sub
    If Len(ThisWorkbook.Path) = 0 Or ThisWorkbook.ReadOnly Then
        AjouterMessageFin "Le classeur pilote n'a pas été enregistré par la macro (jamais enregistré, ou en lecture seule) : " & _
            "enregistre-le pour garder la feuille Bilan."
        Exit Sub
    End If
    ThisWorkbook.Save
    JournalCOM "ThisWorkbook.Save", "classeur pilote enregistré (feuille Bilan)"
    Exit Sub
Echec:
    JournalErreur "ThisWorkbook.Save (classeur pilote)", Err.Number, Err.Description
End Sub

' La zone de travail, et la conversion vers SEE. Le cartouche, dans l'ordre :
'   1. celui du folio en cours (le vrai passage) ;
'   2. celui nommé par le réglage Cartouche (dans le projet, puis dans
'      l'environnement) ;
'   3. en simulation : celui d'un folio qui existe déjà dans le groupe cible
'      (ou le projet), à défaut de mieux : PROVISOIRE, le folio créé pourra en
'      avoir un autre.
' Sans cartouche, les coordonnées du journal sont PROVISOIRES (repli ECHELLE
' en mode AJUSTER), et la boîte de fin le dit.
Private Sub PreparerZone()
    Dim tb As Object, l As Double, h As Double, nomTb As String, source As String, ajuster As Boolean
    ajuster = (UCase$(Reglage("Mode", "AJUSTER")) = "AJUSTER")
    If Not mSh Is Nothing Then
        Set tb = SEE_CartoucheDuFolio(mSh)
        source = "le cartouche du folio"
    End If
    nomTb = Reglage("Cartouche", "")
    If tb Is Nothing And Len(nomTb) > 0 And Not gApp Is Nothing Then
        If Not mPrj Is Nothing Then Set tb = SEE_CartoucheParNom(mPrj, nomTb)
        If tb Is Nothing And Not mEnv Is Nothing Then Set tb = SEE_CartoucheParNom(mEnv, nomTb)
        source = "le cartouche du réglage Cartouche"
    End If
    If tb Is Nothing And gSimulation And ajuster And Not gApp Is Nothing Then
        Set tb = CartoucheDUnFolioExistant(source)
        If Not tb Is Nothing Then mCoordProvisoires = True
    End If
    If Not tb Is Nothing Then
        If PropNombre(tb, "WorkingWidth", l) And PropNombre(tb, "WorkingHeight", h) Then
            Journal "Conversion", LireProp(tb, "Name"), "TitleBlock.WorkingWidth / WorkingHeight", NombreTexte(l) & " x " & _
                NombreTexte(h) & " (" & source & ")", IIf(mCoordProvisoires, -1, 0), IIf(mCoordProvisoires, "coordonnées provisoires", "")
        End If
    End If
    If Not (l > 0 And h > 0) And ajuster Then mCoordProvisoires = True
    PreparerConversion l, h
    ' une seule conversion pour toute l'exécution : tous les folios au même repère
    mZonePrete = True
End Sub

' Le cartouche d'un folio qui existe déjà (le groupe cible, sinon le projet) ;
' source dit lequel.
Private Function CartoucheDUnFolioExistant(ByRef source As String) As Object
    Dim c As Collection, o As Variant, tb As Object
    Set CartoucheDUnFolioExistant = Nothing
    If Not mGrp Is Nothing Then Set c = ElementsDe(SEE_FoliosDuGroupe(mGrp))
    If c Is Nothing Then
        If Not mPrj Is Nothing Then Set c = ElementsDe(SEE_TousLesFolios(mPrj))
    ElseIf c.Count = 0 And Not mPrj Is Nothing Then
        Set c = ElementsDe(SEE_TousLesFolios(mPrj))
    End If
    If c Is Nothing Then Exit Function
    For Each o In c
        Set tb = SEE_CartoucheDuFolio(o)
        If Not tb Is Nothing Then
            source = "PROVISOIRE : le cartouche du folio existant « " & LireProp(o, "Name") & " » ; le folio créé en aura peut-être un autre"
            Set CartoucheDUnFolioExistant = tb
            Exit Function
        End If
    Next o
End Function

Private Function PropNombre(ByVal obj As Object, ByVal nom As String, ByRef x As Double) As Boolean
    Dim v As Variant
    PropNombre = False
    If LirePropValeur(obj, nom, v) Then PropNombre = LireNombre(v, x)
End Function

' Un appel qui écrit, à un argument objet, journalisé. Vrai si fait.
Private Function AppelEcriture1(ByVal obj As Object, ByVal methode As String, ByVal arg As Object, ByVal libelle As String) As Boolean
    AppelEcriture1 = False
    If gSimulation Then
        JournalSimulation libelle, ""
        Exit Function
    End If
    On Error GoTo Echec
    CallByName obj, methode, VbMethod, arg
    JournalCOM libelle, "ok"
    AppelEcriture1 = True
    Exit Function
Echec:
    JournalErreur libelle, Err.Number, Err.Description
End Function

' ============================================================================
'  LE BILAN (feuille Bilan : une ligne par folio, gardée d'une exécution à
'  l'autre pour la reprise)
' ============================================================================
Private Function FeuilleBilan() As Object
    Dim ws As Object
    Set ws = FeuilleCreee(FEUILLE_BILAN, False)
    If CStr(ws.Cells(1, 1).Value) <> "Folio" Then
        EcrireLigne ws, 1, Array("Folio", "Nom", "Etat", "Blocs", "Broches/bornes", "Fils SEE", "Fils en dessin", _
            "Fils non dessinés", "Graphiques", "Erreurs", "Duree (s)", "Fin", "Remarque")
        ws.Rows(1).Font.Bold = True
    End If
    Set FeuilleBilan = ws
End Function

' La ligne du bilan de ce folio (par son nom exact : les noms sont uniques
' dans un paquet), ou une nouvelle ligne.
Private Function LigneBilan(ByVal nom As String) As Long
    Dim ws As Object, i As Long, n As Long
    Set ws = FeuilleBilan()
    n = DerniereLigne(ws, 1)
    For i = 2 To n
        If StrComp(CStr(ws.Cells(i, 2).Value), nom, vbBinaryCompare) = 0 Then
            LigneBilan = i
            Exit Function
        End If
    Next i
    LigneBilan = n + 1
End Function

Private Sub EcrireBilan(ByVal lb As Long, ByVal folio As Long, ByVal nom As String, ByVal etat As String, _
        ByVal t0 As Double, ByVal remarque As String, Optional ByVal erreurs As Long = 0)
    Dim ws As Object
    On Error GoTo Fin
    Set ws = FeuilleBilan()
    EcrireLigne ws, lb, Array(folio, nom, etat, mNbBlocs, mNbBornes, mNbFilsSEE, mNbFilsDessin, mNbFilsSautes, _
        mNbGraphiques, erreurs, Round(Duree(t0), 1), Format$(Now, "yyyy-mm-dd hh:mm:ss"), remarque)
    If etat = "EN COURS" Then Exit Sub
    Journal gEtape, gObjet, "", "bilan : " & etat & " ; " & mNbBlocs & " bloc(s), " & mNbBornes & " broche(s)/borne(s), " & _
        mNbFilsSEE & " fil(s) SEE, " & mNbFilsDessin & " en dessin, " & mNbFilsSautes & " non dessiné(s), " & erreurs & _
        " erreur(s), " & Format$(Duree(t0), "0.0") & " s"
Fin:
End Sub

' Un folio sauté (complet dans SEE) : sa ligne garde les comptes du passage
' qui l'a dessiné ; l'état, l'heure et la remarque disent le saut, et l'état
' d'avant reste dans la remarque.
Private Sub NoterSaut(ByVal lb As Long, ByVal folio As Long, ByVal nom As String, ByVal etatAvant As String, ByVal t0 As Double)
    Dim ws As Object
    On Error GoTo Fin
    Set ws = FeuilleBilan()
    If lb > DerniereLigne(ws, 1) Then
        EcrireBilan lb, folio, nom, "SAUTE (existe)", t0, "existait déjà dans SEE"
        Exit Sub
    End If
    EcrireLigne ws, lb, Array(folio, nom, "SAUTE (existe)")
    ws.Cells(lb, 12).Value = "'" & Format$(Now, "yyyy-mm-dd hh:mm:ss")
    ws.Cells(lb, 13).Value = "'" & Left$("existait déjà dans SEE sous son nom final" & _
        IIf(Len(etatAvant) > 0, " (état précédent au bilan : " & etatAvant & ")", ""), 32000)
Fin:
End Sub

' Après une sauvegarde réussie : les lignes du bilan des folios dessinés
' depuis la précédente passent à l'état SAUVE (par LIGNE : deux paquets
' peuvent avoir chacun un folio de rang 3).
Private Sub MarquerSauves(ByVal lignes As Collection)
    Dim ws As Object, lb As Variant
    Set ws = FeuilleBilan()
    For Each lb In lignes
        If CLng(lb) >= 2 Then
            If CStr(ws.Cells(CLng(lb), 3).Value) = "DESSINE" Then ws.Cells(CLng(lb), 3).Value = "SAUVE"
        End If
    Next lb
End Sub

' ============================================================================
'  LES BLOCS
' ============================================================================
Private Sub PoserBloc(ByVal l As Long)
    Dim bloc As String, rep As String, nature As String, code As String, mode As String
    Dim x As Double, y As Double, w As Double, h As Double, rx As Double, ry As Double
    Dim bornes As Collection
    bloc = PaquetTexte("Blocs", l, "Bloc")
    rep = PaquetTexte("Blocs", l, "Repere")
    nature = UCase$(PaquetTexte("Blocs", l, "Nature"))
    code = PaquetTexte("Blocs", l, "Code")
    x = PaquetNombreOu("Blocs", l, "X", 0)
    y = PaquetNombreOu("Blocs", l, "Y", 0)
    w = PaquetNombreOu("Blocs", l, "L", 0)
    h = PaquetNombreOu("Blocs", l, "H", 0)
    rx = PaquetNombreOu("Blocs", l, "RepereX", x + w / 2)
    ry = PaquetNombreOu("Blocs", l, "RepereY", y + h / 2)
    If Len(nature) = 0 Then nature = "EQUIPEMENT"
    mode = UCase$(Reglage(nature & ".Mode", "DESSIN"))
    Contexte "Bloc " & bloc, rep & " (" & nature & ", " & mode & ")"
    Set bornes = LignesDe(mBornesDuBloc, bloc)
    Select Case mode
        Case "IGNORER"
            Journal gEtape, gObjet, "", "ignoré (" & nature & ".Mode = IGNORER) ; ses fils seront en DESSIN"
            Exit Sub
        Case "BOITE"
            If Not PoserCorpsSymbole(nature, x, y, w, h, rep, "", code) Then
                Journal gEtape, gObjet, "", "boîte non posée : repli en DESSIN"
                DessinerCorps x, y, w, h, rep, rx, ry
            End If
            DessinerPieces bloc
            DessinerNumeros bornes
        Case "BROCHE"
            PoserCorpsOuDessin nature, x, y, w, h, rep, code, rx, ry
            PoserBrochesDuBloc nature, bloc, rep, code, bornes, False
        Case "BORNIER"
            PoserCorpsOuDessin nature, x, y, w, h, rep, code, rx, ry
            PoserBrochesDuBloc nature, bloc, rep, code, bornes, True
        Case "SYMBOLE"
            PoserSymboleSimple nature, bloc, rep, code, x, y, w, h, rx, ry, bornes, UCase$(PaquetTexte("Blocs", l, "Sens"))
        Case Else
            If mode <> "DESSIN" Then Journal gEtape, gObjet, "", "mode « " & mode & " » inconnu : DESSIN", -1, "réglage " & nature & ".Mode"
            DessinerCorps x, y, w, h, rep, rx, ry
            DessinerPieces bloc
            DessinerNumeros bornes
    End Select
    mNbBlocs = mNbBlocs + 1
End Sub

' Le corps en symbole si Famille / Symbole sont réglés, sinon dessiné.
Private Sub PoserCorpsOuDessin(ByVal nature As String, ByVal x As Double, ByVal y As Double, ByVal w As Double, _
        ByVal h As Double, ByVal rep As String, ByVal code As String, ByVal rx As Double, ByVal ry As Double)
    If Len(Reglage(nature & ".Famille", "")) > 0 And Len(Reglage(nature & ".Symbole", "")) > 0 Then
        If PoserCorpsSymbole(nature, x, y, w, h, rep, "", code) Then Exit Sub
        Journal gEtape, gObjet, "", "corps non posé en symbole : repli en DESSIN"
    End If
    DessinerCorps x, y, w, h, rep, rx, ry
End Sub

' Le corps d'un bloc en symbole à deux points (la boîte = le rectangle du corps).
Private Function PoserCorpsSymbole(ByVal nature As String, ByVal x As Double, ByVal y As Double, ByVal w As Double, _
        ByVal h As Double, ByVal rep As String, ByVal lettre As String, ByVal code As String) As Boolean
    Dim label As String, racine As String, ordre As Long, sym As Object
    ArgumentsRepere rep, lettre, code, label, racine, ordre
    PoserCorpsSymbole = PoserSymbole(Reglage(nature & ".Famille", ""), Reglage(nature & ".Symbole", ""), True, _
        VersSEEX(x), VersSEEY(y), VersSEEX(x + w), VersSEEY(y + h), 0, label, racine, ordre, sym)
End Function

' Un symbole simple (une masse, un rail...) : posé sur le point de pose de sa
' borne s'il n'en a qu'une (PointDePose, et recalé), sinon au centre du corps ; chaque
' borne prend le point de connexion le plus proche. Son angle suit le côté
' d'où arrive son fil (colonne Sens du paquet : G, D, H, B) : réglages
' <NATURE>.AngleG / AngleD / AngleH / AngleB.
Private Sub PoserSymboleSimple(ByVal nature As String, ByVal bloc As String, ByVal rep As String, ByVal code As String, _
        ByVal x As Double, ByVal y As Double, ByVal w As Double, ByVal h As Double, ByVal rx As Double, ByVal ry As Double, _
        ByVal bornes As Collection, ByVal sens As String)
    Dim px As Double, py As Double, label As String, racine As String, ordre As Long, sym As Object
    Dim l As Variant, xr As Double, yr As Double, xb As Double, yb As Double, unique As Boolean, angle As Double
    unique = (bornes.Count = 1)
    angle = AngleDuSens(nature, sens)
    px = x + w / 2
    py = y + h / 2
    If unique Then
        If PointDePose(CLng(bornes(1)), xb, yb) Then
            px = xb
            py = yb
        End If
    End If
    ArgumentsRepere rep, "", code, label, racine, ordre
    If Not PoserSymbole(Reglage(nature & ".Famille", ""), Reglage(nature & ".Symbole", ""), False, VersSEEX(px), VersSEEY(py), _
            0, 0, angle, label, racine, ordre, sym) Then
        Journal gEtape, gObjet, "", "symbole non posé : repli en DESSIN"
        DessinerCorps x, y, w, h, rep, rx, ry
        DessinerNumeros bornes
        Exit Sub
    End If
    For Each l In bornes
        If Not PointDePose(CLng(l), xb, yb) Then
            xb = px
            yb = py
        End If
        xb = VersSEEX(xb)
        yb = VersSEEY(yb)
        If sym Is Nothing Then
            ' simulation : le point d'accroche calculé tient lieu de point de connexion
            NoterPoint CLng(l), xb, yb
        ElseIf unique Then
            If Recaler(sym, xb, yb, xr, yr) Then NoterPoint CLng(l), xr, yr
        ElseIf PointLePlusProche(sym, xb, yb, xr, yr) Then
            NoterPoint CLng(l), xr, yr
        End If
    Next l
End Sub

' L'angle d'un symbole simple selon le côté d'où arrive son fil (Sens). Un
' Sens vide ou inconnu pour une masse ou un rail : AngleG, et le journal le dit.
Private Function AngleDuSens(ByVal nature As String, ByVal sens As String) As Double
    Select Case sens
        Case "D"
            AngleDuSens = ReglageNombre(nature & ".AngleD", 0)
        Case "H"
            AngleDuSens = ReglageNombre(nature & ".AngleH", 0)
        Case "B"
            AngleDuSens = ReglageNombre(nature & ".AngleB", 0)
        Case Else
            If sens <> "G" And (nature = "MASSE" Or nature = "RAIL") Then
                Journal gEtape, gObjet, "", "colonne Sens " & IIf(Len(sens) = 0, "vide", "« " & sens & " » inconnue") & _
                    " : le symbole prend l'angle " & nature & ".AngleG"
            End If
            AngleDuSens = ReglageNombre(nature & ".AngleG", 0)
    End Select
End Function

' Les broches (BROCHE) ou les bornes (BORNIER) d'un bloc, chacune recalée sur
' son point de pose (PointDePose : le contact, sinon l'accroche) et notée pour
' les fils.
Private Sub PoserBrochesDuBloc(ByVal nature As String, ByVal bloc As String, ByVal rep As String, ByVal code As String, _
        ByVal bornes As Collection, ByVal bornier As Boolean)
    Dim l As Variant, borne As String, cn As String, num As String, cote As String, x As Double, y As Double
    Dim con As Object, tagCon As String, xr As Double, yr As Double
    For Each l In bornes
        borne = PaquetTexte("Bornes", CLng(l), "Borne")
        cn = PaquetTexte("Bornes", CLng(l), "Connecteur")
        num = PaquetTexte("Bornes", CLng(l), "Numero")
        If Len(num) = 0 Then num = borne
        cote = UCase$(PaquetTexte("Bornes", CLng(l), "Cote"))
        Contexte gEtape, rep & " " & borne
        If PointDePose(CLng(l), x, y) Then
            tagCon = RepereDeConnecteur(nature, rep, cn)
            If bornier Then
                Set con = BornierPour(nature, rep, cn, code)
            Else
                Set con = ConnecteurPour(nature, rep, cn, code)
            End If
            If PoserBroche(nature, con, bornier, tagCon, num, x, y, cote, xr, yr) Then NoterPoint CLng(l), xr, yr
        Else
            Journal gEtape, gObjet, "", "borne sans point d'accroche (X, Y) dans le paquet", -1, "borne incomplète"
        End If
    Next l
End Sub

' Le corps dessiné : rectangle et repère.
Private Sub DessinerCorps(ByVal x As Double, ByVal y As Double, ByVal w As Double, ByVal h As Double, _
        ByVal rep As String, ByVal rx As Double, ByVal ry As Double)
    If w > 0 Or h > 0 Then DessinerRectangle x, y, x + w, y + h, "corps " & rep
    If Len(rep) > 0 Then DessinerTexte rep, rx, ry, 0, "repère " & rep
End Sub

' Les pièces de connecteur d'un bloc dessinées : rectangle et lettre.
Private Sub DessinerPieces(ByVal bloc As String)
    Dim l As Variant, x0 As Double, x1 As Double, t As Double, b As Double, lx As Double, ly As Double, lettre As String
    For Each l In LignesDe(mPiecesDuBloc, bloc)
        lettre = PaquetTexte("Connecteurs", CLng(l), "Lettre")
        If PaquetNombre("Connecteurs", CLng(l), "X0", x0) And PaquetNombre("Connecteurs", CLng(l), "X1", x1) And _
                PaquetNombre("Connecteurs", CLng(l), "Haut", t) And PaquetNombre("Connecteurs", CLng(l), "Bas", b) Then
            DessinerRectangle x0, t, x1, b, "pièce " & lettre
        End If
        If PaquetNombre("Connecteurs", CLng(l), "LettreX", lx) And PaquetNombre("Connecteurs", CLng(l), "LettreY", ly) Then
            DessinerTexte lettre, lx, ly, 0, "lettre " & lettre
        End If
    Next l
End Sub

' Les numéros des bornes dessinés à leur place (PX, PY).
Private Sub DessinerNumeros(ByVal bornes As Collection)
    Dim l As Variant, num As String, px As Double, py As Double
    For Each l In bornes
        num = PaquetTexte("Bornes", CLng(l), "Numero")
        If Len(num) = 0 Then num = PaquetTexte("Bornes", CLng(l), "Borne")
        If Len(num) = 0 Then
            ' une masse : pas de numéro à écrire
        ElseIf PaquetNombre("Bornes", CLng(l), "PX", px) And PaquetNombre("Bornes", CLng(l), "PY", py) Then
            DessinerTexte num, px, py, 0, "borne " & num
        End If
    Next l
End Sub

' ============================================================================
'  LES REPERES
' ============================================================================

' Les arguments de ISEETag.SetManual selon les réglages Repere.*.
Private Sub ArgumentsRepere(ByVal rep As String, ByVal lettre As String, ByVal code As String, _
        ByRef label As String, ByRef racine As String, ByRef ordre As Long)
    Dim num As String
    num = PremierNombre(rep)
    label = Modele(Reglage("Repere.Label", "{Repere}"), "Repere", rep, "Lettre", lettre, "Code", code, "Num", num)
    racine = Modele(Reglage("Repere.Racine", ""), "Repere", rep, "Lettre", lettre, "Code", code, "Num", num)
    ordre = OrdreDe(Modele(Reglage("Repere.Ordre", "0"), "Repere", rep, "Lettre", lettre, "Code", code, "Num", num), "Repere.Ordre")
End Sub

' L'entier A_Order de SetManual, lu dans le texte d'un modèle (« {Num} » :
' le premier nombre d'un repère ou d'un numéro de fil, qui peut être long).
' 0 si le texte est vide ; 0, et le journal le dit, s'il n'est pas un entier
' qui tient dans un Long (au-delà de 2 147 483 647, CLng lèverait l'erreur 6
' et le folio s'arrêterait).
Private Function OrdreDe(ByVal texte As String, ByVal reglageModele As String) As Long
    Dim x As Double
    OrdreDe = 0
    If Len(Trim$(texte)) = 0 Then Exit Function
    If LireNombre(texte, x) Then
        If x < 2147483647.5 And x >= -2147483648.5 Then
            OrdreDe = CLng(x)
            Exit Function
        End If
    End If
    Journal gEtape, gObjet, "", "réglage " & reglageModele & " : « " & texte & " » n'est pas un entier de 32 bits : ordre 0", _
        -1, "ordre hors limite"
End Function

' Un repère manuel (SEETag) : CreateObject(eSEEObjectTag) puis SetManual.
' Nothing si l'objet ne se crée pas ; le repère non rempli si SetManual échoue.
Private Function RepereManuel(ByVal entite As Object, ByVal label As String, ByVal racine As String, ByVal ordre As Long) As Object
    Dim tg As Object
    Set RepereManuel = Nothing
    If gSimulation Or gApp Is Nothing Then Exit Function
    Set tg = NouvelObjet(OBJ_REPERE)
    Set RepereManuel = tg
    If tg Is Nothing Then Exit Function
    On Error GoTo Echec
    tg.SetManual entite, label, racine, ordre
    JournalCOM "Tag.SetManual(entité, """ & label & """, """ & racine & """, " & ordre & ")", "ok"
    Exit Function
Echec:
    JournalErreur "Tag.SetManual(entité, """ & label & """, """ & racine & """, " & ordre & ")", Err.Number, Err.Description
End Function

Private Function RepereDeConnecteur(ByVal nature As String, ByVal rep As String, ByVal lettre As String) As String
    Dim s As String
    s = Modele(Reglage(nature & ".ModeleRepere", "{Repere}-{Lettre}"), "Repere", rep, "Lettre", lettre)
    s = Trim$(s)
    Do While Len(s) > 0 And (Right$(s, 1) = "-" Or Right$(s, 1) = "_" Or Right$(s, 1) = ".")
        s = Left$(s, Len(s) - 1)
    Loop
    If Len(s) = 0 Then s = rep
    RepereDeConnecteur = s
End Function

' Le connecteur SEE d'un repère et d'une lettre : celui de l'exécution, sinon
' celui du projet qui porte ce repère (un autre folio, une exécution
' précédente), sinon un nouveau (Project.AddConnector).
Private Function ConnecteurPour(ByVal nature As String, ByVal rep As String, ByVal lettre As String, ByVal code As String) As Object
    Set ConnecteurPour = ObjetDuProjet(nature, rep, lettre, code, False)
End Function

Private Function BornierPour(ByVal nature As String, ByVal rep As String, ByVal lettre As String, ByVal code As String) As Object
    Set BornierPour = ObjetDuProjet(nature, rep, lettre, code, True)
End Function

Private Function ObjetDuProjet(ByVal nature As String, ByVal rep As String, ByVal lettre As String, ByVal code As String, _
        ByVal bornier As Boolean) As Object
    Dim tagObj As String, cache As Object, trouves As Collection, o As Object, tg As Object
    Dim label As String, racine As String, ordre As Long, quoi As String
    Set ObjetDuProjet = Nothing
    tagObj = RepereDeConnecteur(nature, rep, lettre)
    If bornier Then
        Set cache = mBorniers
        quoi = "bornier"
    Else
        Set cache = mConnecteurs
        quoi = "connecteur"
    End If
    If cache.Exists(tagObj) Then
        Set ObjetDuProjet = cache.Item(tagObj)
        Exit Function
    End If
    If gApp Is Nothing Or mPrj Is Nothing Then Exit Function
    Set trouves = ElementsDe(SEE_ParRepere(mPrj, IIf(bornier, "T", "C"), tagObj))
    If trouves.Count > 0 Then
        Set o = trouves(1)
        Journal gEtape, gObjet, "", quoi & " « " & tagObj & " » déjà dans le projet : repris" & _
            IIf(trouves.Count > 1, " (" & trouves.Count & " portent ce repère : le premier)", "")
    ElseIf gSimulation Then
        JournalSimulation IIf(bornier, "Project.AddTerminalStrip", "Project.AddConnector"), quoi & " « " & tagObj & " » serait créé"
        cache.Add tagObj, Nothing
        Exit Function
    Else
        Set o = NouvelObjet(IIf(bornier, OBJ_BORNIER, OBJ_CONNECTEUR))
        If o Is Nothing Then Exit Function
        ArgumentsRepere tagObj, lettre, code, label, racine, ordre
        Set tg = RepereManuel(o, label, racine, ordre)
        On Error Resume Next
        Err.Clear
        If bornier Then
            mPrj.AddTerminalStrip o, tg
        Else
            mPrj.AddConnector o, tg, 0
        End If
        If AppelRate(IIf(bornier, "Project.AddTerminalStrip(« ", "Project.AddConnector(« ") & tagObj & " »)") Then Exit Function
        On Error GoTo 0
    End If
    cache.Add tagObj, o
    Set ObjetDuProjet = o
End Function

' ============================================================================
'  LES SYMBOLES
' ============================================================================

' La forme (définition) d'un symbole, gardée en cache ; Nothing si introuvable.
Private Function FormePour(ByVal famille As String, ByVal nomSymbole As String) As Object
    Dim cle As String, f As Object
    Set FormePour = Nothing
    If gApp Is Nothing Then Exit Function
    cle = famille & "|" & nomSymbole
    If mFormes.Exists(cle) Then
        Set FormePour = mFormes.Item(cle)
        Exit Function
    End If
    Set f = SEE_Forme(mEnv, mPrj, famille, nomSymbole)
    If f Is Nothing Then
        Journal gEtape, gObjet, "GetShape(""" & famille & """, """ & nomSymbole & """)", "symbole introuvable (ni dans l'environnement ni dans le projet)", -1, "symbole absent"
    End If
    mFormes.Add cle, f
    Set FormePour = f
End Function

' Si une erreur est en cours (sous On Error Resume Next) : la journalise,
' l'efface et rend Vrai. Sinon journalise l'appel réussi (DETAIL) et rend Faux.
Private Function AppelRate(ByVal appel As String) As Boolean
    Dim n As Long, d As String
    n = Err.Number
    d = Err.Description
    If n <> 0 Then
        Err.Clear
        JournalErreur appel, n, d
        AppelRate = True
    Else
        JournalCOM appel, "ok"
        AppelRate = False
    End If
End Function

' Pose un symbole (coordonnées SEE) : CreateObject(symbole), SetShape,
' SetPosition (un ou deux points), Angle, repère manuel, Sheet.AddSymbol. Si
' SetPosition ou Angle échouent AVANT AddSymbol, ils sont refaits après.
' Vrai si posé (ou s'il le serait, en simulation : sym reste alors Nothing).
Private Function PoserSymbole(ByVal famille As String, ByVal nomSymbole As String, ByVal deuxPoints As Boolean, _
        ByVal x1 As Double, ByVal y1 As Double, ByVal x2 As Double, ByVal y2 As Double, ByVal angle As Double, _
        ByVal label As String, ByVal racine As String, ByVal ordre As Long, ByRef sym As Object) As Boolean
    Dim forme As Object, s As Object, p1 As Object, p2 As Object, tg As Object, tgSortie As Object
    Dim posOk As Boolean, angleOk As Boolean, detail As String
    PoserSymbole = False
    Set sym = Nothing
    detail = "« " & famille & " / " & nomSymbole & " » en (" & NombreTexte(x1) & " ; " & NombreTexte(y1) & ")" & _
        IIf(deuxPoints, "-(" & NombreTexte(x2) & " ; " & NombreTexte(y2) & ")", "") & _
        IIf(angle <> 0, " angle " & NombreTexte(angle), "") & IIf(Len(label) > 0, " repère """ & label & """", "")
    If Len(famille) = 0 Or Len(nomSymbole) = 0 Then
        Journal gEtape, gObjet, "", "aucun symbole réglé (Famille / Symbole vides)"
        Exit Function
    End If
    If gApp Is Nothing Then
        JournalSimulation "Sheet.AddSymbol", detail & " (sans SEE : existence du symbole non vérifiée)"
        PoserSymbole = True
        Exit Function
    End If
    Set forme = FormePour(famille, nomSymbole)
    If forme Is Nothing Then Exit Function
    If gSimulation Then
        JournalSimulation "CreateObject(symbole) ; SetShape ; SetPosition ; Sheet.AddSymbol", detail
        PoserSymbole = True
        Exit Function
    End If
    If mSh Is Nothing Then Exit Function
    Set s = NouvelObjet(OBJ_SYMBOLE)
    Set p1 = NouveauPoint(x1, y1)
    If deuxPoints Then Set p2 = NouveauPoint(x2, y2)
    If s Is Nothing Or p1 Is Nothing Then Exit Function
    On Error Resume Next
    Err.Clear
    s.SetShape forme
    If AppelRate("Symbol.SetShape(« " & famille & " / " & nomSymbole & " »)") Then Exit Function
    Err.Clear
    If deuxPoints Then
        s.SetPosition p1, p2
    Else
        s.SetPosition p1
    End If
    posOk = Not AppelRate("Symbol.SetPosition (avant AddSymbol) " & detail)
    angleOk = True
    If angle <> 0 Then
        Err.Clear
        s.Angle = angle
        angleOk = Not AppelRate("Symbol.Angle = " & NombreTexte(angle) & " (avant AddSymbol)")
    End If
    If Len(label) > 0 Then Set tg = RepereManuel(s, label, racine, ordre)
    If EstV4() Then
        Err.Clear
        mSh.AddSymbol s, tgSortie
        If AppelRate("Sheet.AddSymbol(symbole, repère en sortie) " & detail) Then Exit Function
        If Not tg Is Nothing Then
            Err.Clear
            s.ChangeTag tg
            AppelRate "Symbol.ChangeTag(""" & label & """)"
        End If
    Else
        If tg Is Nothing Then Set tg = NouvelObjet(OBJ_REPERE)
        Err.Clear
        mSh.AddSymbol s, tg
        If AppelRate("Sheet.AddSymbol(symbole, repère) " & detail) Then Exit Function
    End If
    If Not posOk Then
        Err.Clear
        If deuxPoints Then
            s.SetPosition p1, p2
        Else
            s.SetPosition p1
        End If
        AppelRate "Symbol.SetPosition (après AddSymbol)"
    End If
    If Not angleOk Then
        Err.Clear
        s.Angle = angle
        AppelRate "Symbol.Angle (après AddSymbol)"
    End If
    On Error GoTo 0
    Set sym = s
    PoserSymbole = True
End Function

' Pose une broche (BROCHE, sur un connecteur) ou une borne (BORNIER, sur un
' bornier) en (xPaquet, yPaquet), son point de pose dans le paquet, puis la recale. xr, yr : la position
' réelle de son point de connexion (coordonnées SEE).
Private Function PoserBroche(ByVal nature As String, ByVal con As Object, ByVal bornier As Boolean, ByVal tagCon As String, _
        ByVal nomBroche As String, ByVal xPaquet As Double, ByVal yPaquet As Double, ByVal cote As String, _
        ByRef xr As Double, ByRef yr As Double) As Boolean
    Dim famille As String, nomSymbole As String, xc As Double, yc As Double, angle As Double
    Dim forme As Object, s As Object, nm As Object, p As Object, posOk As Boolean, detail As String, appel As String
    PoserBroche = False
    famille = Reglage(nature & ".BrocheFamille", "")
    nomSymbole = Reglage(nature & ".BrocheSymbole", "")
    xc = VersSEEX(xPaquet)
    yc = VersSEEY(yPaquet)
    If cote = "D" Then angle = ReglageNombre(nature & ".AngleD", 0) Else angle = ReglageNombre(nature & ".AngleG", 0)
    appel = IIf(bornier, "Sheet.AddTerminalSymbol", "Sheet.AddPinSymbol")
    detail = tagCon & " : " & nomBroche & " « " & famille & " / " & nomSymbole & " » en (" & NombreTexte(xc) & " ; " & _
        NombreTexte(yc) & ")" & IIf(angle <> 0, " angle " & NombreTexte(angle), "")
    If Len(famille) = 0 Or Len(nomSymbole) = 0 Then
        Journal gEtape, gObjet, "", "aucun symbole de " & IIf(bornier, "borne", "broche") & " réglé (" & nature & _
            ".BrocheFamille / BrocheSymbole) : les fils de cette borne seront en DESSIN"
        Exit Function
    End If
    If gApp Is Nothing Then
        JournalSimulation appel, detail & " (sans SEE)"
        xr = xc
        yr = yc
        mNbBornes = mNbBornes + 1
        PoserBroche = True
        Exit Function
    End If
    Set forme = FormePour(famille, nomSymbole)
    If forme Is Nothing Then Exit Function
    If gSimulation Then
        JournalSimulation "CreateObject(symbole) ; SetShape ; SetPosition ; " & appel & " ; recalage", detail
        xr = xc
        yr = yc
        mNbBornes = mNbBornes + 1
        PoserBroche = True
        Exit Function
    End If
    If mSh Is Nothing Then Exit Function
    If con Is Nothing Then
        Journal gEtape, gObjet, appel, IIf(bornier, "bornier", "connecteur") & " « " & tagCon & " » absent : non posé", -1, "pas de " & IIf(bornier, "bornier", "connecteur")
        Exit Function
    End If
    Set s = NouvelObjet(OBJ_SYMBOLE)
    Set nm = NouvelObjet(OBJ_NOM)
    Set p = NouveauPoint(xc, yc)
    If s Is Nothing Or nm Is Nothing Or p Is Nothing Then Exit Function
    On Error Resume Next
    Err.Clear
    nm.Name = nomBroche
    If AppelRate("SEEName.Name = """ & nomBroche & """") Then Exit Function
    Err.Clear
    s.SetShape forme
    If AppelRate("Symbol.SetShape(« " & famille & " / " & nomSymbole & " »)") Then Exit Function
    Err.Clear
    s.SetPosition p
    posOk = Not AppelRate("Symbol.SetPosition (avant " & appel & ")")
    If angle <> 0 Then
        Err.Clear
        s.Angle = angle
        AppelRate "Symbol.Angle = " & NombreTexte(angle)
    End If
    Err.Clear
    If bornier Then
        mSh.AddTerminalSymbol s, con, nm
    Else
        mSh.AddPinSymbol s, con, nm
    End If
    If AppelRate(appel & " " & detail) Then
        ' la broche / borne n'existe peut-être pas encore : on l'ajoute, puis on réessaie
        AjouterBroche con, nm, bornier
        On Error Resume Next
        Err.Clear
        If bornier Then
            mSh.AddTerminalSymbol s, con, nm
        Else
            mSh.AddPinSymbol s, con, nm
        End If
        If AppelRate(appel & " (2e essai, après AddPin / AddTerminal) " & detail) Then Exit Function
    End If
    If Not posOk Then
        Err.Clear
        s.SetPosition p
        AppelRate "Symbol.SetPosition (après " & appel & ")"
    End If
    On Error GoTo 0
    mNbBornes = mNbBornes + 1
    PoserBroche = Recaler(s, xc, yc, xr, yr)
End Function

' Ajoute une broche (pin) à un connecteur ou une borne (terminal) à un bornier.
' V5 : AddPin(nom, objet) ; V4 : AddPin(objet, nom) - l'ordre est inversé.
Private Sub AjouterBroche(ByVal con As Object, ByVal nm As Object, ByVal bornier As Boolean)
    Dim o As Object
    If gSimulation Then
        JournalSimulation IIf(bornier, "TerminalStrip.AddTerminal", "Connector.AddPin"), ""
        Exit Sub
    End If
    Set o = NouvelObjet(IIf(bornier, OBJ_BORNE, OBJ_BROCHE))
    If o Is Nothing Then Exit Sub
    On Error Resume Next
    If bornier Then
        Err.Clear
        If EstV4() Then
            con.AddTerminal o, nm
        Else
            con.AddTerminal nm, o
        End If
        AppelRate "TerminalStrip.AddTerminal"
    Else
        Err.Clear
        If EstV4() Then
            con.AddPin o, nm
        Else
            con.AddPin nm, o
        End If
        AppelRate "Connector.AddPin"
    End If
End Sub

' RECALAGE : lit la position du (premier) point de connexion du symbole posé
' et déplace le symbole pour que ce point tombe sur la cible (xc, yc). xr, yr
' reçoivent la position relue après le déplacement. Faux si le symbole n'a
' pas de point de connexion lisible.
Private Function Recaler(ByVal sym As Object, ByVal xc As Double, ByVal yc As Double, ByRef xr As Double, ByRef yr As Double) As Boolean
    Dim cps As Collection, cx As Double, cy As Double, sx As Double, sy As Double, sx2 As Double, sy2 As Double
    Dim a2 As Boolean, dx As Double, dy As Double, p1 As Object, p2 As Object, tol As Double, relu As Boolean
    Recaler = False
    If gSimulation Then
        ' rien n'est posé : le point d'accroche calculé tient lieu de point de connexion
        xr = xc
        yr = yc
        Recaler = True
        Exit Function
    End If
    tol = ReglageNombre("Tolerance", 0.05)
    Set cps = ElementsDe(SEE_ConnexionsDuSymbole(sym))
    If cps.Count = 0 Then
        Journal gEtape, gObjet, "Symbol.GetConnectionPointCollection", "aucun point de connexion : le fil de cette borne sera en DESSIN", -1, "pas de point de connexion"
        Exit Function
    End If
    If cps.Count > 1 Then JournalCOM "Symbol.GetConnectionPointCollection", cps.Count & " points de connexion : le premier est recalé"
    If Not SEE_PointPar(cps(1), "GetPosition", cx, cy) Then Exit Function
    xr = cx
    yr = cy
    Recaler = True
    dx = xc - cx
    dy = yc - cy
    If Abs(dx) < 0.000001 And Abs(dy) < 0.000001 Then Exit Function
    If Not ReglageOui("Recaler", "O") Then
        If Abs(dx) > tol Or Abs(dy) > tol Then Journal gEtape, gObjet, "", "point de connexion à (" & NombreTexte(dx) & " ; " & _
            NombreTexte(dy) & ") de l'accroche ; Recaler = N : laissé"
        Exit Function
    End If
    If Not SEE_PositionDe(sym, sx, sy, sx2, sy2, a2) Then Exit Function
    Set p1 = NouveauPoint(sx + dx, sy + dy)
    If a2 Then Set p2 = NouveauPoint(sx2 + dx, sy2 + dy)
    If p1 Is Nothing Then Exit Function
    On Error Resume Next
    Err.Clear
    If a2 Then
        sym.SetPosition p1, p2
    Else
        sym.SetPosition p1
    End If
    If AppelRate("Symbol.SetPosition (recalage de " & NombreTexte(dx) & " ; " & NombreTexte(dy) & ")") Then Exit Function
    On Error GoTo 0
    ' le symbole a bougé de (dx, dy) : son point de connexion est, en principe,
    ' sur la cible ; la relecture le confirme (ou dit où il est vraiment)
    xr = cx + dx
    yr = cy + dy
    relu = False
    Set cps = ElementsDe(SEE_ConnexionsDuSymbole(sym))
    If cps.Count > 0 Then
        If SEE_PointPar(cps(1), "GetPosition", cx, cy) Then
            xr = cx
            yr = cy
            relu = True
        End If
    End If
    If Not relu Then
        gNbErreurs = gNbErreurs + 1
        Journal gEtape, gObjet, "recalage", "déplacé de (" & NombreTexte(dx) & " ; " & NombreTexte(dy) & "), mais le point de " & _
            "connexion n'a pas pu être relu : le fil prend le point attendu (" & NombreTexte(xr) & " ; " & NombreTexte(yr) & ")", _
            -1, "relecture impossible"
    ElseIf Abs(xr - xc) > tol Or Abs(yr - yc) > tol Then
        Journal gEtape, gObjet, "recalage", "après déplacement, le point de connexion reste à (" & NombreTexte(xr - xc) & " ; " & _
            NombreTexte(yr - yc) & ") de l'accroche", -1, "recalage imparfait"
    Else
        JournalCOM "recalage", "déplacé de (" & NombreTexte(dx) & " ; " & NombreTexte(dy) & ") : point de connexion sur l'accroche"
    End If
End Function

' Le point de connexion du symbole le plus proche de (x, y).
Private Function PointLePlusProche(ByVal sym As Object, ByVal x As Double, ByVal y As Double, ByRef xr As Double, ByRef yr As Double) As Boolean
    Dim cp As Variant, cx As Double, cy As Double, d As Double, meilleur As Double
    meilleur = -1
    For Each cp In ElementsDe(SEE_ConnexionsDuSymbole(sym))
        If SEE_PointPar(cp, "GetPosition", cx, cy) Then
            d = (cx - x) * (cx - x) + (cy - y) * (cy - y)
            If meilleur < 0 Or d < meilleur Then
                meilleur = d
                xr = cx
                yr = cy
            End If
        End If
    Next cp
    PointLePlusProche = (meilleur >= 0)
    If meilleur >= 0 Then JournalCOM "point de connexion le plus proche", "à " & NombreTexte(Sqr(meilleur)) & " de l'accroche"
End Function

' ============================================================================
'  LES POINTS D'ACCROCHE REELS (pour les bouts de fils)
'  Ils sont notés PAR LIGNE de la feuille Bornes, pas par Bloc|Borne|Côté :
'  une borne de barrette qui reçoit deux fils a deux pastilles, donc deux
'  lignes de même clé, à deux accroches différentes. Un bout de fil prend la
'  ligne que désigne son tracé (le premier ou le dernier point de Points est
'  l'accroche X, Y de SA ligne, à 0,01 mm : invariant du contrat).
' ============================================================================
' Le point où se pose la broche, la borne ou le symbole d'une ligne de Bornes
' (mm du paquet) : son contact (CX, CY) si PoseBroche = CONTACT et que le
' paquet le donne, sinon son point d'accroche (X, Y). Faux si aucun des deux.
Private Function PointDePose(ByVal ligneBorne As Long, ByRef x As Double, ByRef y As Double) As Boolean
    PointDePose = False
    If PoseAuContact() Then
        If PaquetNombre("Bornes", ligneBorne, "CX", x) And PaquetNombre("Bornes", ligneBorne, "CY", y) Then
            PointDePose = True
            Exit Function
        End If
    End If
    If PaquetNombre("Bornes", ligneBorne, "X", x) And PaquetNombre("Bornes", ligneBorne, "Y", y) Then PointDePose = True
End Function

Private Function PoseAuContact() As Boolean
    PoseAuContact = (UCase$(Trim$(Reglage("PoseBroche", "CONTACT"))) <> "ACCROCHE")
End Function

' Mène un bout de tracé (debut = Vrai : le premier point ; sinon le dernier)
' jusqu'au contact de sa ligne de Bornes, quand les broches se posent au
' contact : l'amorce que l'Atelier dessine de l'accroche au contact devient du
' fil. Le contact est sur l'horizontale de l'accroche (FORMAT-PAQUET) : si le
' segment du bout est couché sur cette horizontale, le bout y glisse (plus
' loin pour une pièce, en deçà pour une barrette à poser) ; sinon le contact
' s'ajoute au bout du tracé. Rien si le paquet ne donne pas de contact.
Private Sub MenerAuContact(ByRef xs() As Double, ByRef ys() As Double, ByRef n As Long, ByVal ligneBorne As Long, _
        ByVal debut As Boolean)
    Dim cx As Double, cy As Double, i As Long, b As Long, v As Long
    If n < 2 Or ligneBorne < 1 Then Exit Sub
    If Not PoseAuContact() Then Exit Sub
    If Not PaquetNombre("Bornes", ligneBorne, "CX", cx) Then Exit Sub
    If Not PaquetNombre("Bornes", ligneBorne, "CY", cy) Then Exit Sub
    If debut Then
        b = 0
        v = 1
    Else
        b = n - 1
        v = n - 2
    End If
    If Abs(xs(b) - cx) < 0.001 And Abs(ys(b) - cy) < 0.001 Then Exit Sub
    If Abs(ys(b) - ys(v)) < 0.0001 And Abs(ys(b) - cy) < 0.001 Then
        xs(b) = cx
        ys(b) = cy
        Exit Sub
    End If
    ReDim Preserve xs(0 To n)
    ReDim Preserve ys(0 To n)
    If debut Then
        For i = n To 1 Step -1
            xs(i) = xs(i - 1)
            ys(i) = ys(i - 1)
        Next i
        xs(0) = cx
        ys(0) = cy
    Else
        xs(n) = cx
        ys(n) = cy
    End If
    n = n + 1
End Sub

Private Sub NoterPoint(ByVal ligneBorne As Long, ByVal x As Double, ByVal y As Double)
    mPointsX.Item(CStr(ligneBorne)) = x
    mPointsY.Item(CStr(ligneBorne)) = y
End Sub

Private Function PointNote(ByVal ligneBorne As Long, ByRef x As Double, ByRef y As Double) As Boolean
    PointNote = False
    If ligneBorne < 1 Or mPointsX Is Nothing Then Exit Function
    If Not mPointsX.Exists(CStr(ligneBorne)) Then Exit Function
    x = mPointsX.Item(CStr(ligneBorne))
    y = mPointsY.Item(CStr(ligneBorne))
    PointNote = True
End Function

Private Function CleDe(ByVal bloc As String, ByVal borne As String, ByVal cote As String) As String
    cote = UCase$(Trim$(cote))
    If cote <> "FICHE" And cote <> "EMBASE" Then cote = ""
    CleDe = bloc & "|" & borne & "|" & cote
End Function

Private Function CleBorne(ByVal l As Long) As String
    CleBorne = CleDe(PaquetTexte("Bornes", l, "Bloc"), PaquetTexte("Bornes", l, "Borne"), PaquetTexte("Bornes", l, "Connecteur"))
End Function

' Les lignes de Bornes d'un bout de fil (même Bloc|Borne|Côté, casse comprise).
Private Function LignesDuBout(ByVal cle As String) As Collection
    If mLignesParCle Is Nothing Then
        Set LignesDuBout = New Collection
    ElseIf mLignesParCle.Exists(cle) Then
        Set LignesDuBout = mLignesParCle.Item(cle)
    Else
        Set LignesDuBout = New Collection
    End If
End Function

' La ligne de Bornes d'un bout de fil : parmi les lignes de sa clé, celle dont
' l'accroche (X, Y) est la plus proche du point (x, y) du tracé ; ecart :
' leur distance (mm). 0 si la clé n'a aucune ligne.
Private Function LigneDuBout(ByVal cle As String, ByVal x As Double, ByVal y As Double, ByRef ecart As Double) As Long
    Dim l As Variant, bx As Double, by As Double, d As Double
    LigneDuBout = 0
    ecart = -1
    For Each l In LignesDuBout(cle)
        If PaquetNombre("Bornes", CLng(l), "X", bx) And PaquetNombre("Bornes", CLng(l), "Y", by) Then
            d = Sqr((bx - x) * (bx - x) + (by - y) * (by - y))
            If ecart < 0 Or d < ecart Then
                ecart = d
                LigneDuBout = CLng(l)
            End If
        End If
    Next l
End Function

' Les deux lignes d'un pontage (sans tracé) : la paire la plus proche, une
' ligne de chaque clé ; Faux si une clé n'a aucune ligne avec une accroche.
Private Function PaireDuPontage(ByVal clefDe As String, ByVal clefVers As String, ByRef lDe As Long, ByRef lVers As Long) As Boolean
    Dim a As Variant, b As Variant, xa As Double, ya As Double, xb As Double, yb As Double, d As Double, meilleur As Double
    PaireDuPontage = False
    meilleur = -1
    For Each a In LignesDuBout(clefDe)
        If PaquetNombre("Bornes", CLng(a), "X", xa) And PaquetNombre("Bornes", CLng(a), "Y", ya) Then
            For Each b In LignesDuBout(clefVers)
                If CLng(b) <> CLng(a) And PaquetNombre("Bornes", CLng(b), "X", xb) And PaquetNombre("Bornes", CLng(b), "Y", yb) Then
                    d = (xa - xb) * (xa - xb) + (ya - yb) * (ya - yb)
                    If meilleur < 0 Or d < meilleur Then
                        meilleur = d
                        lDe = CLng(a)
                        lVers = CLng(b)
                        PaireDuPontage = True
                    End If
                End If
            Next b
        End If
    Next a
End Function

' Contrôle d'un bout de fil (départ ou arrivée) : sa borne existe-t-elle, son
' tracé finit-il bien sur l'accroche de sa ligne ? Écrit au journal sinon.
Private Sub ControlerBout(ByVal quel As String, ByVal cle As String, ByVal ligneBorne As Long, ByVal ecart As Double)
    If ligneBorne = 0 Then
        Journal gEtape, gObjet, "", "bout " & quel & " : la borne « " & cle & " » n'est pas dans la feuille Bornes du folio", _
            -1, "borne absente"
    ElseIf ecart > 0.01 Then
        Journal gEtape, gObjet, "", "bout " & quel & " : le tracé finit à " & NombreTexte(ecart) & " mm de l'accroche de la borne « " & _
            cle & " » (le contrat dit 0,01 mm) : la plus proche est prise", -1, "tracé hors accroche"
    End If
End Sub

' ============================================================================
'  LES FILS
' ============================================================================
Private Sub PoserFil(ByVal l As Long)
    Dim num As String, shunt As Boolean, n As Long, xs() As Double, ys() As Double
    Dim aDe As Boolean, aVers As Boolean, xDe As Double, yDe As Double, xVers As Double, yVers As Double
    Dim numX As Double, numY As Double, numAngle As Double, jauge As String
    Dim clefDe As String, clefVers As String, lDe As Long, lVers As Long, ecart As Double
    num = PaquetTexte("Fils", l, "Fil")
    Contexte "Fil " & PaquetTexte("Fils", l, "Ordre"), IIf(Len(num) > 0, num, "(sans numéro)") & " : " & _
        PaquetTexte("Fils", l, "DeRepere") & " " & PaquetTexte("Fils", l, "DeBorne") & " -> " & _
        PaquetTexte("Fils", l, "VersRepere") & " " & PaquetTexte("Fils", l, "VersBorne")
    shunt = (UCase$(PaquetTexte("Fils", l, "Shunt")) = "O")
    clefDe = CleDe(PaquetTexte("Fils", l, "DeBloc"), PaquetTexte("Fils", l, "DeBorne"), PaquetTexte("Fils", l, "DeCote"))
    clefVers = CleDe(PaquetTexte("Fils", l, "VersBloc"), PaquetTexte("Fils", l, "VersBorne"), PaquetTexte("Fils", l, "VersCote"))
    n = LirePoints(PaquetTexte("Fils", l, "Points"), xs, ys)
    If n >= 2 Then
        ' chaque bout prend la ligne de Bornes que désigne son tracé
        lDe = LigneDuBout(clefDe, xs(0), ys(0), ecart)
        ControlerBout "de départ", clefDe, lDe, ecart
        lVers = LigneDuBout(clefVers, xs(n - 1), ys(n - 1), ecart)
        ControlerBout "d'arrivée", clefVers, lVers, ecart
    ElseIf shunt And UCase$(Reglage("Pontages", "TRACER")) <> "IGNORER" Then
        ' un pontage de barrette n'a pas de tracé dans le paquet : une ligne
        ' d'une borne à l'autre, entre les deux pastilles les plus proches
        If PaireDuPontage(clefDe, clefVers, lDe, lVers) Then
            ReDim xs(0 To 1)
            ReDim ys(0 To 1)
            If PointDePose(lDe, xs(0), ys(0)) And PointDePose(lVers, xs(1), ys(1)) Then
                n = 2
                Journal gEtape, gObjet, "", "pontage (shunt) sans tracé : tracé d'une borne à l'autre, de point de pose à point de pose (réglage Pontages = TRACER)"
            End If
        End If
    End If
    If n < 2 Then
        Journal gEtape, gObjet, "", IIf(shunt, "pontage (shunt) non dessiné (Pontages = IGNORER, ou bornes introuvables) : à poser à la main", _
            "tracé vide ou illisible : non dessiné")
        mNbFilsSautes = mNbFilsSautes + 1
        Exit Sub
    End If
    ' l'amorce de l'Atelier (de l'accroche au contact) devient du fil
    MenerAuContact xs, ys, n, lDe, True
    MenerAuContact xs, ys, n, lVers, False
    aDe = PointNote(lDe, xDe, yDe)
    aVers = PointNote(lVers, xVers, yVers)
    numX = PaquetNombreOu("Fils", l, "NumeroX", -1)
    numY = PaquetNombreOu("Fils", l, "NumeroY", -1)
    numAngle = PaquetNombreOu("Fils", l, "NumeroAngle", 0)
    jauge = PaquetTexte("Fils", l, "Jauge")
    TracerFilPaquet xs, ys, n, num, jauge, aDe, xDe, yDe, aVers, xVers, yVers, numX, numY, numAngle
End Sub

' Trace un fil dont le tracé est en mm du paquet (xs, ys : n points). Le
' premier et le dernier point sont REMPLACES par la position réelle du point
' de connexion des broches posées (aDe / aVers), le point voisin suit pour
' garder le segment horizontal ou vertical. Si une extrémité manque, ou si
' TypeConnexion est vide, le fil est tracé en DESSIN (des traits) et le
' journal le dit.
Private Sub TracerFilPaquet(ByRef xs() As Double, ByRef ys() As Double, ByVal n As Long, ByVal num As String, _
        ByVal jauge As String, ByVal aDe As Boolean, ByVal xDe As Double, ByVal yDe As Double, ByVal aVers As Boolean, _
        ByVal xVers As Double, ByVal yVers As Double, ByVal numX As Double, ByVal numY As Double, ByVal numAngle As Double)
    Dim px() As Double, py() As Double, m As Long, i As Long, k As Long, horiz As Boolean, raison As String
    Dim typ As String, tol As Double, xm As Double, ym As Double, recale As Boolean
    tol = ReglageNombre("Tolerance", 0.05)
    ReDim px(0 To n + 1)
    ReDim py(0 To n + 1)
    For i = 0 To n - 1
        px(i) = VersSEEX(xs(i))
        py(i) = VersSEEY(ys(i))
    Next i
    m = n
    ' --- les bouts réels (un écart au-delà de Tolerance alors que les broches
    '     sont recalées est une anomalie : écrite même en Journal = NORMAL)
    recale = ReglageOui("Recaler", "O")
    If aDe Then
        If Abs(px(0) - xDe) > tol Or Abs(py(0) - yDe) > tol Then
            NoterBoutDeplace "de départ", px(0), py(0), xDe, yDe, recale
        End If
        horiz = (Abs(ys(0) - ys(1)) < 0.0001)
        px(0) = xDe
        py(0) = yDe
        If m > 2 Then
            If horiz Then
                py(1) = yDe
            Else
                px(1) = xDe
            End If
        End If
    End If
    If aVers Then
        If Abs(px(m - 1) - xVers) > tol Or Abs(py(m - 1) - yVers) > tol Then
            NoterBoutDeplace "d'arrivée", px(m - 1), py(m - 1), xVers, yVers, recale
        End If
        horiz = (Abs(ys(n - 1) - ys(n - 2)) < 0.0001)
        px(m - 1) = xVers
        py(m - 1) = yVers
        If m > 2 Then
            If horiz Then
                py(m - 2) = yVers
            Else
                px(m - 2) = xVers
            End If
        End If
    End If
    ' --- un fil de deux points dont les bouts ne sont plus alignés : un coude
    If m = 2 And Abs(px(0) - px(1)) > 0.000001 And Abs(py(0) - py(1)) > 0.000001 Then
        horiz = (Abs(ys(0) - ys(1)) < 0.0001)
        px(3) = px(1)
        py(3) = py(1)
        If horiz Then
            xm = (px(0) + px(3)) / 2
            px(1) = xm
            py(1) = py(0)
            px(2) = xm
            py(2) = py(3)
        Else
            ym = (py(0) + py(3)) / 2
            px(1) = px(0)
            py(1) = ym
            px(2) = px(3)
            py(2) = ym
        End If
        m = 4
    End If
    ' --- les points doubles retirés
    k = 0
    For i = 1 To m - 1
        If Abs(px(i) - px(k)) > 0.000001 Or Abs(py(i) - py(k)) > 0.000001 Then
            k = k + 1
            px(k) = px(i)
            py(k) = py(i)
        End If
    Next i
    m = k + 1
    If m < 2 Then
        Journal gEtape, gObjet, "", "fil de longueur nulle après remplacement des bouts : non dessiné"
        mNbFilsSautes = mNbFilsSautes + 1
        Exit Sub
    End If
    For i = 0 To m - 2
        If Abs(px(i) - px(i + 1)) > tol And Abs(py(i) - py(i + 1)) > tol Then
            Journal gEtape, gObjet, "", "segment " & (i + 1) & " oblique après remplacement des bouts (" & PointsTexte(px, py, m) & ")"
            Exit For
        End If
    Next i
    ' --- en SEE ou en DESSIN
    typ = Reglage("TypeConnexion", "")
    If Len(typ) = 0 Then
        raison = "TypeConnexion vide"
    ElseIf Not aDe And Not aVers Then
        raison = "aucune des deux extrémités n'a de broche posée"
    ElseIf Not aDe Then
        raison = "l'extrémité de départ n'a pas de broche posée"
    ElseIf Not aVers Then
        raison = "l'extrémité d'arrivée n'a pas de broche posée"
    End If
    If Len(raison) = 0 Then
        If AjouterFilSEE(px, py, m, typ, num, jauge) Then
            mNbFilsSEE = mNbFilsSEE + 1
            Exit Sub
        End If
        raison = "AddWireConnection a échoué"
    End If
    Journal gEtape, gObjet, "", "fil en DESSIN : " & raison
    For i = 0 To m - 2
        GraphLigne px(i), py(i), px(i + 1), py(i + 1), "fil " & num & " segment " & (i + 1)
    Next i
    If Len(num) > 0 And numX >= 0 And numY >= 0 Then DessinerTexte num, numX, numY, numAngle, "numéro du fil " & num
    mNbFilsDessin = mNbFilsDessin + 1
End Sub

' Un bout de fil remplacé par le point de connexion réel de sa broche, à plus
' de Tolerance du point du paquet : au journal (en NORMAL si Recaler = O, où
' l'écart devrait être nul ; en DETAIL sinon, le recalage l'ayant déjà dit).
Private Sub NoterBoutDeplace(ByVal quel As String, ByVal x0 As Double, ByVal y0 As Double, ByVal x1 As Double, _
        ByVal y1 As Double, ByVal recale As Boolean)
    Dim texte As String
    texte = "remplacé par le point de connexion : (" & NombreTexte(x0) & " ; " & NombreTexte(y0) & ") -> (" & _
        NombreTexte(x1) & " ; " & NombreTexte(y1) & ")"
    If recale Then
        Journal gEtape, gObjet, "bout " & quel, texte, -1, "bout de fil déplacé"
    Else
        JournalCOM "bout " & quel, texte
    End If
End Sub

Private Function PointsTexte(ByRef px() As Double, ByRef py() As Double, ByVal m As Long) As String
    Dim i As Long, s As String
    For i = 0 To m - 1
        If i > 0 Then s = s & " | "
        s = s & NombreTexte(px(i)) & " ; " & NombreTexte(py(i))
    Next i
    PointsTexte = s
End Function

' Sheet.AddWireConnection : collection de points (coordonnées SEE), type de
' connexion, repère manuel (numéro du fil), câble selon les réglages.
' V5 : AddWireConnection(points, type, repère, câble) ;
' V4 : AddWireConnection(points, type, repère en sortie, câble en sortie, fil en sortie),
'      puis le repère est changé sur le câble rendu.
Private Function AjouterFilSEE(ByRef px() As Double, ByRef py() As Double, ByVal m As Long, ByVal typ As String, _
        ByVal num As String, ByVal jauge As String) As Boolean
    Dim pts As Object, p As Object, i As Long, cab As Object, entite As Object, tg As Object
    Dim tgS As Object, cabS As Object, filS As Object, label As String, racine As String, ordre As Long
    Dim nbAvant As Long, appel As String, avecCable As Boolean, avecJauge As Boolean
    AjouterFilSEE = False
    label = Modele(Reglage("Fil.Label", "{Fil}"), "Fil", num, "Num", PremierNombre(num))
    racine = Modele(Reglage("Fil.Racine", ""), "Fil", num, "Num", PremierNombre(num))
    ordre = OrdreDe(Modele(Reglage("Fil.Ordre", "0"), "Fil", num, "Num", PremierNombre(num)), "Fil.Ordre")
    avecCable = ReglageOui("Cable", "N")
    avecJauge = ReglageOui("Jauge", "N") And Len(jauge) > 0
    appel = "Sheet.AddWireConnection(" & m & " points, """ & typ & """, repère """ & IIf(Len(num) > 0, label, "") & """" & _
        IIf(avecCable, ", câble" & IIf(avecJauge, " jauge " & jauge, ""), ", sans câble") & ")"
    If gSimulation Or gApp Is Nothing Then
        JournalSimulation appel, PointsTexte(px, py, m)
        AjouterFilSEE = True
        Exit Function
    End If
    If mSh Is Nothing Then Exit Function
    Set pts = NouvelObjet(OBJ_COLLECTION)
    If pts Is Nothing Then Exit Function
    On Error Resume Next
    For i = 0 To m - 1
        Set p = NouveauPoint(px(i), py(i))
        If p Is Nothing Then Exit Function
        Err.Clear
        pts.Add p
        If AppelRate("Collection.Add(point " & (i + 1) & ")") Then Exit Function
    Next i
    If avecCable Then
        Set cab = NouvelObjet(OBJ_CABLE)
        If avecJauge And Not cab Is Nothing Then EcrireProp cab, "Gauge", jauge
    End If
    If mPremierFil Then nbAvant = NombreDe(SEE_SegmentsDuFolio(mSh))
    If EstV4() Then
        Err.Clear
        mSh.AddWireConnection pts, typ, tgS, cabS, filS
        If AppelRate(appel & " " & PointsTexte(px, py, m)) Then Exit Function
        If Len(num) > 0 Then
            If cabS Is Nothing Then
                Journal gEtape, gObjet, "AddWireConnection", "aucun câble rendu : le numéro """ & label & """ n'est pas posé", -1, "numéro non posé"
            Else
                Set tg = RepereManuel(cabS, label, racine, ordre)
                If Not tg Is Nothing Then
                    Err.Clear
                    cabS.ChangeTag tg
                    AppelRate "Cable.ChangeTag(""" & label & """)"
                End If
            End If
        End If
        If avecJauge Then
            If Not filS Is Nothing Then
                EcrireProp filS, "Gauge", jauge
            ElseIf Not cabS Is Nothing Then
                EcrireProp cabS, "Gauge", jauge
            End If
        End If
    Else
        If Len(num) > 0 Then
            If cab Is Nothing Then Set entite = NouvelObjet(OBJ_CABLE) Else Set entite = cab
            If Not entite Is Nothing Then Set tg = RepereManuel(entite, label, racine, ordre)
        End If
        Err.Clear
        mSh.AddWireConnection pts, typ, tg, cab
        If AppelRate(appel & " " & PointsTexte(px, py, m)) Then Exit Function
    End If
    On Error GoTo 0
    If mPremierFil Then
        mPremierFil = False
        Journal gEtape, gObjet, "contrôle du premier fil", "segments de connexion du folio : " & nbAvant & " avant, " & _
            NombreDe(SEE_SegmentsDuFolio(mSh)) & " après"
    End If
    AjouterFilSEE = True
End Function

' ============================================================================
'  LES OBJETS GRAPHIQUES (mode DESSIN, repli)
'  Dessiner* : coordonnées du paquet (mm) ; Graph* : coordonnées SEE.
' ============================================================================
Private Sub DessinerRectangle(ByVal xa As Double, ByVal ya As Double, ByVal xb As Double, ByVal yb As Double, ByVal libelle As String)
    GraphRectangle VersSEEX(xa), VersSEEY(ya), VersSEEX(xb), VersSEEY(yb), libelle
End Sub

Private Sub DessinerLigne(ByVal xa As Double, ByVal ya As Double, ByVal xb As Double, ByVal yb As Double, ByVal libelle As String)
    GraphLigne VersSEEX(xa), VersSEEY(ya), VersSEEX(xb), VersSEEY(yb), libelle
End Sub

Private Sub DessinerTexte(ByVal texte As String, ByVal x As Double, ByVal y As Double, ByVal angle As Double, ByVal libelle As String)
    GraphTexte texte, VersSEEX(x), VersSEEY(y), angle, libelle
End Sub

Private Function Coord(ByVal x As Double, ByVal y As Double) As String
    Coord = "(" & NombreTexte(x) & " ; " & NombreTexte(y) & ")"
End Function

Private Sub GraphRectangle(ByVal x1 As Double, ByVal y1 As Double, ByVal x2 As Double, ByVal y2 As Double, ByVal libelle As String)
    Dim r As Object, p1 As Object, p2 As Object, ok1 As Boolean, ok2 As Boolean, rx As Double, ry As Double
    Dim detail As String
    detail = libelle & " " & Coord(x1, y1) & "-" & Coord(x2, y2)
    mNbGraphiques = mNbGraphiques + 1
    If gSimulation Or gApp Is Nothing Then
        JournalSimulation "AddGraphicObject(rectangle)", detail
        Exit Sub
    End If
    If mSh Is Nothing Then Exit Sub
    Set r = NouvelObjet(OBJ_RECTANGLE)
    Set p1 = NouveauPoint(x1, y1)
    Set p2 = NouveauPoint(x2, y2)
    If r Is Nothing Or p1 Is Nothing Or p2 Is Nothing Then Exit Sub
    On Error Resume Next
    Err.Clear
    r.SetFirstPoint p1
    ok1 = Not AppelRate("Rectangle.SetFirstPoint " & Coord(x1, y1))
    Err.Clear
    r.SetSecondPoint p2
    ok2 = Not AppelRate("Rectangle.SetSecondPoint " & Coord(x2, y2))
    Err.Clear
    mSh.AddGraphicObject r
    If AppelRate("Sheet.AddGraphicObject(rectangle) " & detail) Then Exit Sub
    If Not ok1 Then
        Err.Clear
        r.SetFirstPoint p1
        AppelRate "Rectangle.SetFirstPoint (après AddGraphicObject)"
    End If
    If Not ok2 Then
        Err.Clear
        r.SetSecondPoint p2
        AppelRate "Rectangle.SetSecondPoint (après AddGraphicObject)"
    End If
    On Error GoTo 0
    If SEE_PointPar(r, "GetFirstPoint", rx, ry) Then JournalCOM "relu Rectangle.GetFirstPoint", Coord(rx, ry) & " (demandé " & Coord(x1, y1) & ")"
End Sub

Private Sub GraphLigne(ByVal x1 As Double, ByVal y1 As Double, ByVal x2 As Double, ByVal y2 As Double, ByVal libelle As String)
    Dim g As Object, p1 As Object, p2 As Object, ok1 As Boolean, ok2 As Boolean, detail As String
    detail = libelle & " " & Coord(x1, y1) & "-" & Coord(x2, y2)
    mNbGraphiques = mNbGraphiques + 1
    If gSimulation Or gApp Is Nothing Then
        JournalSimulation "AddGraphicObject(ligne)", detail
        Exit Sub
    End If
    If mSh Is Nothing Then Exit Sub
    Set g = NouvelObjet(OBJ_LIGNE)
    Set p1 = NouveauPoint(x1, y1)
    Set p2 = NouveauPoint(x2, y2)
    If g Is Nothing Or p1 Is Nothing Or p2 Is Nothing Then Exit Sub
    On Error Resume Next
    Err.Clear
    g.SetStartPoint p1
    ok1 = Not AppelRate("Line.SetStartPoint " & Coord(x1, y1))
    Err.Clear
    g.SetEndPoint p2
    ok2 = Not AppelRate("Line.SetEndPoint " & Coord(x2, y2))
    Err.Clear
    mSh.AddGraphicObject g
    If AppelRate("Sheet.AddGraphicObject(ligne) " & detail) Then Exit Sub
    If Not ok1 Then
        Err.Clear
        g.SetStartPoint p1
        AppelRate "Line.SetStartPoint (après AddGraphicObject)"
    End If
    If Not ok2 Then
        Err.Clear
        g.SetEndPoint p2
        AppelRate "Line.SetEndPoint (après AddGraphicObject)"
    End If
    On Error GoTo 0
End Sub

' Un texte : Value, Size (TailleTexte à l'échelle), Justify = 0 (centré), Angle,
' SetPosition(point) - le point donné est l'ancre du paquet (centre du texte) ;
' ce que SEE en fait (coin haut gauche ? centre ?) se voit avec EssaiDessin.
Private Sub GraphTexte(ByVal texte As String, ByVal x As Double, ByVal y As Double, ByVal angle As Double, ByVal libelle As String)
    Dim t As Object, p As Object, okPos As Boolean, detail As String, taille As Double
    taille = LongueurSEE(ReglageNombre("TailleTexte", 2.5))
    detail = libelle & " """ & texte & """ en " & Coord(x, y) & IIf(angle <> 0, " angle " & NombreTexte(angle), "")
    mNbGraphiques = mNbGraphiques + 1
    If gSimulation Or gApp Is Nothing Then
        JournalSimulation "AddGraphicObject(texte)", detail & " taille " & NombreTexte(taille)
        Exit Sub
    End If
    If mSh Is Nothing Then Exit Sub
    Set t = NouvelObjet(OBJ_TEXTE)
    Set p = NouveauPoint(x, y)
    If t Is Nothing Or p Is Nothing Then Exit Sub
    On Error Resume Next
    Err.Clear
    t.Value = texte
    AppelRate "Text.Value = """ & texte & """"
    Err.Clear
    t.Size = taille
    AppelRate "Text.Size = " & NombreTexte(taille)
    Err.Clear
    t.Justify = 0
    AppelRate "Text.Justify = 0 (centré)"
    If angle <> 0 Then
        Err.Clear
        t.Angle = angle
        AppelRate "Text.Angle = " & NombreTexte(angle)
    End If
    Err.Clear
    t.SetPosition p
    okPos = Not AppelRate("Text.SetPosition " & Coord(x, y))
    Err.Clear
    mSh.AddGraphicObject t
    If AppelRate("Sheet.AddGraphicObject(texte) " & detail) Then Exit Sub
    If Not okPos Then
        Err.Clear
        t.SetPosition p
        AppelRate "Text.SetPosition (après AddGraphicObject)"
    End If
    On Error GoTo 0
End Sub
