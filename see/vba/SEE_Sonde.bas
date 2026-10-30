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
'    TesterSEE         LE BOUTON DU PREMIER ESSAI : un clic, sans rien régler.
'                      Il crée les feuilles Reglages et Journal si elles
'                      manquent, enchaîne les sondes ci-dessous sans aucune
'                      boîte, écrit la feuille Resultat_Test en tête du
'                      classeur (en haut, le bloc « À PHOTOGRAPHIER » : le
'                      technicien ne renvoie que des photos), puis UNE boîte
'                      courte qui dit quoi faire D'APRÈS CE QUI A ÉTÉ LU :
'                      la photo, puis relancer (pas de projet ouvert...), le
'                      bouton 3 (SEE fermé) si sa fenêtre SEE n'est pas
'                      trouvée, ou, « BRAVO », passer au bouton 2.
'    SondeRegistre     comment SEE est inscrit dans le registre de Windows
'                      (CLSID, ProgID, serveur, .seeprj), par WMI ; ses
'                      ProgID servent à rejoindre SEE (TesterSEE la lance
'                      avant de joindre SEE)
'    SondeApplication  versions, chemins, environnement (Unit !), projet,
'                      cartouches (zone de travail), stratégie de connexion
'    SondeSymboles     familles et symboles de l'environnement
'    SondeFolio        un folio dessiné à la main : symboles (repères,
'                      position, points de connexion, MATÉRIEL associé au
'                      symbole et à son connecteur : Class, Code, Quantity),
'                      segments de connexion (SignalType = la chaîne de type
'                      de connexion ?), textes
'    SondeSelection    la même chose pour les objets sélectionnés dans SEE
'    SondeMethodes     les XML des méthodes (points de connexion, câblage,
'                      types de câbles, connecteurs, symboles par défaut),
'                      dans des fichiers à côté du classeur ET dans la feuille
'                      Sonde_XML (le classeur garde tout)
'    RelireFolio       (appelée par les boutons 2 et 3) relit le folio que le
'                      pilote vient de dessiner, dans Sonde_Folio, sans boîte,
'                      sans vider le journal, avec la connexion déjà là
'
'  But : connaître l'unité, l'origine et le sens de y, les formes que le
'  bureau utilise, la chaîne de type de connexion, la sémantique des repères,
'  la classe du matériel (réglages <NATURE>.ClasseMateriel / ClasseConnecteur).
'  Conseil : dessine à la main un petit folio (un symbole en haut à gauche,
'  un autre en bas à droite, un fil entre eux, un texte, un équipement avec
'  sa référence du catalogue), puis TesterSEE.
' ============================================================================
Option Explicit

Private mFeuille As Object
Private mLigne As Long

' --- ce que les sondes ont lu (la feuille Resultat_Test de TesterSEE)
Private mEnchaine As Boolean          ' Vrai : sondes enchaînées par TesterSEE (un seul journal, aucune boîte)
Private mConnecte As Boolean          ' la dernière sonde a joint SEE
Private mConnexionEssayee As Boolean  ' TesterSEE : la connexion a été essayée (par SondeApplication)
Private mJoint As Boolean             ' TesterSEE : SondeApplication a joint SEE (les sondes suivantes ne se reconnectent pas)
Private mPerdu As String              ' TesterSEE : la sonde avant laquelle SEE ne répondait plus ("" : il a répondu jusqu'au bout)
Private mProjetOuvert As Boolean      ' SondeApplication a lu un projet ouvert
Private mSondesFaites As String       ' TesterSEE : les sondes lancées, « |SondeApplication|SondeFolio| » (et « |SondeSelection:sautée| »)
Private mVersion As String            ' ApplicationName ApplicationVersion
Private mUnite As String              ' Environment.Unit, avec son sens
Private mProjetLu As String           ' le nom du projet ouvert, ou ce qui l'a empêché
Private mNbFamilles As Long
Private mNbFormes As Long
Private mFolioLu As String            ' le folio lu par SondeFolio ("" : aucun)
Private mFolioRaison As String        ' pourquoi aucun folio n'a été lu
Private mNbSymboles As Long           ' symboles du folio lus
Private mNbSegments As Long           ' segments de connexion du folio lus
Private mNbGraphiques As Long         ' objets graphiques du folio lus
Private mNbSelection As Long          ' objets de la sélection lus
Private mNbMaterielsSelection As Long ' matériels lus sur la sélection
Private mNbXML As Long                ' XML de méthodes lus
Private mNbMateriels As Long          ' matériels lus sur le folio (un connecteur compté une fois)
Private mClasses As Object            ' Class -> nombre de matériels du folio lus de cette classe
Private mLignesMateriel As Collection ' les lignes de la section « Matériel associé » de la sonde en cours
Private mPorteursVus As Object        ' les connecteurs déjà dans cette section
Private mEtapesTest As String         ' les étapes de TesterSEE, une par ligne
Private mRegistreResume As String     ' ce que SondeRegistre a lu, en quelques lignes (le bloc « À PHOTOGRAPHIER »)
Private mRegistreLu As Boolean        ' SondeRegistre a pu lire le registre
Private mNbClsidInscrits As Long      ' CLSID des réglages trouvés au registre (une vue au moins)
Private mNbClsidLus As Long           ' CLSID des réglages cherchés
Private mProgIDsTrouves As Collection ' « ProgID = CLSID » trouvés par SondeRegistre
Private mProgIDsConnus As Collection  ' ProgID d'un CLSID des réglages (essayés d'abord)
Private mProgIDsAutres As Collection  ' les autres ProgID de SEE (SEE..., IGE..., ...XAO...)
Private mProgIDsVus As Object         ' les ProgID déjà notés
Private mEnMarche As String           ' TesterSEE : les programmes SEE en marche, d'après Windows (SEEEnMarche)
Private mEtatMarche As Integer        ' 1 SEE en marche, 0 aucun, -1 Windows ne répond pas
Private mBlocEnCours As Boolean       ' TesterSEE en cours : un bloc PROVISOIRE précède ce qui demande à Windows

Private Const FEUILLE_XML As String = "Sonde_XML"
Private Const TAILLE_MORCEAU As Long = 30000   ' caractères de XML par cellule (Excel en tient 32 767)
Private Const FEUILLE_REGISTRE As String = "Sonde_Registre"
Private Const PROGID_MAXI As Long = 8          ' ProgID du registre essayés au plus par ConnecterSEE

' ----------------------------------------------------------------------------
'  Début et fin communs
' ----------------------------------------------------------------------------
' Enchaînée par TesterSEE (mEnchaine), une sonde garde le journal ouvert par
' lui (elle ne le vide pas) et ne montre aucune boîte.
Private Function DebutSonde(ByVal titre As String, ByVal nomFeuille As String) As Boolean
    If mEnchaine Then
        Journal "Début", titre, "", "sonde enchaînée par TesterSEE (lecture seule)"
    Else
        OuvrirJournal titre
    End If
    Set mFeuille = FeuilleCreee(nomFeuille, True)
    mLigne = 0
    Set mLignesMateriel = New Collection
    Set mPorteursVus = NouveauDicoExact()
    If mClasses Is Nothing Then Set mClasses = NouveauDicoExact()
    Application.ScreenUpdating = False
    Dim connecte As Boolean
    If mEnchaine And mJoint Then
        ' SEE a déjà été joint (par SondeApplication, ou par la macro qui relit son folio) : on vérifie
        ' qu'il répond, sans jamais se reconnecter au milieu d'un test en lecture seule
        connecte = SEERepond()
        If Not connecte Then
            Journal "TesterSEE", titre, "ApplicationName", "SEE ne répond plus : sonde sautée", -1, "SEE ne répond plus"
            Ecrire Array("Connexion", "ÉCHEC", "SEE ne répond plus (il a répondu plus tôt) : voir la feuille Journal")
        End If
    Else
        If mEnchaine Then mConnexionEssayee = True
        ' (la feuille de la sonde vient d'être créée : le bloc provisoire repasse devant)
        If mBlocEnCours Then EcrireBlocEnCours "SondeApplication : Excel cherche ta fenêtre SEE (en dernier par GetActiveObject, " & _
            "une fonction de Windows)"
        ' une sonde ne crée jamais de SEE : elle REJOINT la fenêtre ouverte, ou rien
        connecte = ConnecterSEE(False)
        If Not connecte Then
            Ecrire Array("Connexion", "ÉCHEC", "Excel n'a pas trouvé ta fenêtre SEE : voir " & FEUILLE_RESULTAT & " (À PHOTOGRAPHIER) " & _
                "et Sonde_Registre ; le bouton 3 travaille SEE fermé")
        End If
    End If
    mConnecte = connecte
    DebutSonde = connecte
End Function

' Vrai si l'objet SEE gardé répond encore (le test que fait ConnecterSEE).
Private Function SEERepond() As Boolean
    SEERepond = (Left$(LireProp(gApp, "ApplicationName"), 4) <> "#ERR")
End Function

Private Sub FinSonde(ByVal titre As String)
    Application.ScreenUpdating = True
    mFeuille.Columns.AutoFit
    Journal "Fin", titre, "", "terminé ; " & gNbErreurs & " erreur(s) d'appel" & IIf(mEnchaine, " depuis le début du test", "") & _
        " (normales en sonde : elles disent ce qui n'existe pas)"
    If mEnchaine Then Exit Sub
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
'  TesterSEE : LE bouton du premier essai au bureau. Un clic, rien à régler,
'  rien à savoir. Il crée les feuilles Reglages et Journal si elles manquent
'  (sans boîte), lâche une connexion qu'Excel aurait CRÉÉE (LacherConnexionCreee :
'  il ne garde que la fenêtre SEE rejointe), puis enchaîne, sans aucune boîte
'  et dans un seul journal : SondeRegistre (ses ProgID servent à rejoindre
'  SEE), ce que Windows dit des programmes SEE en marche (SEEEnMarche),
'  SondeApplication (elle REJOINT la fenêtre SEE ouverte : ConnecterSEE ; le
'  bouton 1 n'en démarre jamais, quel que soit le réglage LancerSEE) ; si SEE
'  est joint : SondeSymboles, SondeFolio (le folio
'  de la vue active), SondeSelection (s'il y a une sélection), SondeMethodes
'  (ses XML vont aussi dans la feuille Sonde_XML). SEE n'est joint qu'une
'  fois, par SondeApplication : s'il cesse de répondre ensuite, les sondes
'  suivantes sont sautées (aucun autre SEE n'est démarré en cours de test).
'  Il finit par la feuille Resultat_Test, en tête du classeur, qui dit en
'  clair ce qui a été lu (en haut, le bloc « À PHOTOGRAPHIER »), puis UNE
'  boîte courte, choisie d'après ce qui a été lu : la photo, puis relancer
'  (pas de projet ouvert...), le bouton 3 (SEE fermé : Excel ouvre lui-même
'  le projet d'essai) si aucune fenêtre SEE n'a été rejointe, ou, « BRAVO »
'  (SEE joint, un projet ouvert, même vide), le bouton 2 (EssaiDessinReel).
'  La même consigne finit le bloc (« Et maintenant »). Avant ce qui demande
'  quelque chose à Windows (le registre, puis la recherche de SEE), un bloc
'  PROVISOIRE « EN COURS » est mis devant le technicien (EcrireBlocEnCours) :
'  si Windows arrête la macro (règle de Defender sur les appels d'API Win32
'  depuis une macro), il reste, et dit quoi photographier.
'  Il n'ouvre JAMAIS de projet dans SEE (le réglage Projet n'est pas utilisé) :
'  il lit celui qui y est ouvert. S'il envoie au bouton 3 après avoir rejoint
'  SEE par sa coclasse SeeAutomation, il lâche cette connexion (sinon File >
'  Exit ne ferait que cacher SEE).
'  LECTURE SEULE : il n'appelle que les sondes ; rien n'est écrit dans SEE.
' ============================================================================
Public Sub TesterSEE()
    Dim ancien As Boolean, imprevu As String, nom As Variant
    On Error GoTo Plantage
    ancien = gSansDialogue
    gSansDialogue = True
    mEnchaine = True
    mBlocEnCours = True
    RemettreLesLectures
    OuvrirJournal "TesterSEE"
    Journal "TesterSEE", "", "", "le test enchaîne les sondes, en LECTURE SEULE : rien n'est écrit dans SEE"
    ' les feuilles Reglages et Journal, si elles manquent (sa boîte va au journal)
    InitialiserClasseur
    ChargerReglages
    ' le bouton 1 ne garde que la fenêtre SEE rejointe : un objet SEE créé par Excel est lâché
    LacherConnexionCreee
    ' le registre d'abord (lecture seule) : les ProgID qu'il donne servent à rejoindre SEE
    EcrireBlocEnCours "SondeRegistre : Excel lit le registre de Windows"
    EtapeDuTest "SondeRegistre"
    ' les programmes SEE en marche, d'après Windows (lecture seule)
    Contexte "TesterSEE", "programmes en marche"
    mEtatMarche = SEEEnMarche(0, mEnMarche)
    Journal "TesterSEE", "programmes en marche", "WMI Win32_Process", mEnMarche
    EtapeDuTest "SondeApplication"
    mJoint = mConnecte
    If mJoint Then
        For Each nom In Array("SondeSymboles", "SondeFolio", "SondeSelection", "SondeMethodes")
            If Not SEERepond() Then
                PerduAvant CStr(nom)
                Exit For
            End If
            If CStr(nom) <> "SondeSelection" Then
                EtapeDuTest CStr(nom)
            ElseIf NbObjetsSelectionnes() > 0 Then
                EtapeDuTest CStr(nom)
            ElseIf SEERepond() Then
                mSondesFaites = mSondesFaites & "|SondeSelection:sautée|"
                NoterEtape "SondeSelection : sautée (aucun objet sélectionné dans SEE)"
            Else
                PerduAvant CStr(nom)
                Exit For
            End If
        Next nom
    ElseIf mConnexionEssayee Then
        NoterEtape "les autres sondes : sautées (SEE n'est pas joint)"
    End If
Fin:
    FinirTest ancien, imprevu
    Exit Sub
Plantage:
    imprevu = Err.Number & " " & Err.Description
    Journal "TesterSEE", "", "(macro)", "ARRÊT IMPRÉVU du test", Err.Number, Err.Description
    Resume Fin
End Sub

' SEE ne répond plus avant cette sonde : elle et les suivantes sont sautées.
Private Sub PerduAvant(ByVal nom As String)
    mPerdu = nom
    Journal "TesterSEE", nom, "ApplicationName", "SEE ne répond plus : " & nom & " et les sondes suivantes sont sautées " & _
        "(aucune nouvelle connexion en cours de test)", -1, "SEE ne répond plus"
    NoterEtape "SEE ne répondait plus avant " & nom & " : " & nom & " et les sondes suivantes sautées"
End Sub

' La fin du test, quoi qu'il arrive : la feuille Resultat_Test, puis UNE boîte,
' qui dit la même chose que sa dernière ligne (« Et maintenant »).
Private Sub FinirTest(ByVal ancienSansDialogue As Boolean, ByVal imprevu As String)
    Dim consigne As String
    On Error Resume Next
    mEnchaine = False
    mBlocEnCours = False
    Application.ScreenUpdating = True
    Application.StatusBar = False
    consigne = ConsigneFinale(imprevu)
    EcrireResultatTest imprevu, consigne
    Journal "Fin", "TesterSEE", "", "terminé ; " & gNbLignesErreur & " réponse(s) en erreur au journal ; voir la feuille " & FEUILLE_RESULTAT
    ' rejoint par la coclasse SeeAutomation, le test envoie au bouton 3, qui veut SEE fermé : tant qu'Excel tient cet
    ' objet, File > Exit ne ferait que cacher SEE
    If gEstAutomation Then LacherConnexion "le bouton 1 envoie au bouton 3 (SEE fermé)"
    gSansDialogue = ancienSansDialogue
    Dialogue consigne, vbInformation, "Test de SEE"
End Sub

' Le bloc PROVISOIRE de Resultat_Test, écrit avant ce qui demande quelque
' chose à Windows (le registre par WMI ; la recherche de SEE, dont
' GetActiveObject, une fonction de Windows déclarée) : sur un poste où Windows
' bloque ces appels depuis une macro (règle de Defender « Bloquer les appels
' d'API Win32 à partir de macros Office »), la macro s'arrête là sans rien
' pouvoir écrire, et ce bloc reste devant le technicien. Le bloc final
' (EcrireResultatTest) le remplace.
Private Sub EcrireBlocEnCours(ByVal etape As String)
    Dim ws As Object, l As Long, e As Variant, rubrique As String
    On Error Resume Next
    Set ws = FeuilleEnTete(FEUILLE_RESULTAT)
    l = 0
    LigneResultat ws, l, "À PHOTOGRAPHIER", "Test du " & Format$(Now, "yyyy-mm-dd hh:mm") & ", EN COURS : " & etape & "."
    If Len(mEnMarche) > 0 Then LigneResultat ws, l, "SEE en marche ?", mEnMarche & " (d'après Windows)"
    rubrique = "Registre"
    For Each e In Split(mRegistreResume, vbLf)
        If Len(CStr(e)) > 0 Then
            LigneResultat ws, l, rubrique, CStr(e)
            rubrique = ""
        End If
    Next e
    LigneResultat ws, l, "Et maintenant", "Si tu lis encore ceci alors qu'Excel ne travaille plus, le test a été arrêté pendant « " & _
        etape & " ». Prends en photo cette partie jaune ET le message de Windows s'il y en a un (par exemple « Sécurité Windows »), " & _
        "et envoie-les-moi."
    SurlignerPhoto ws, l
    MontrerFeuille ws
End Sub

' Ce que le technicien doit faire maintenant, d'après ce que le test a lu (la
' boîte de fin, courte, et la ligne « Et maintenant » du bloc à photographier).
' Il ne renvoie que des PHOTOS : chaque consigne commence par celle de la
' feuille Resultat_Test. Le bouton 3 (SEE fermé) est proposé quand aucune
' fenêtre SEE n'a été rejointe par la coclasse Application.
Private Function ConsigneFinale(ByVal imprevu As String) As String
    Dim photo As String, bouton3 As String
    ' la boîte cache le milieu du bloc : d'abord OK, puis la photo
    photo = "Clique sur OK, puis prends une photo de la partie jaune de la feuille " & FEUILLE_RESULTAT & " et envoie-la-moi."
    bouton3 = CONSIGNE_BOUTON3
    If Len(imprevu) > 0 Then
        ConsigneFinale = "Le test s'est arrêté sur une erreur imprévue (" & imprevu & ")." & vbCrLf & _
            "1. " & photo & vbCrLf & "2. Puis, en bas d'Excel, clique sur l'onglet « Journal » et prends une photo de son haut."
    ElseIf Not mJoint Then
        ConsigneFinale = "Excel n'a pas trouvé ta fenêtre SEE." & vbCrLf & "1. " & photo & vbCrLf & "2. " & bouton3
    ElseIf Len(mPerdu) > 0 Then
        ConsigneFinale = "SEE a cessé de répondre pendant le test (avant " & mPerdu & ")." & vbCrLf & "1. " & photo & vbCrLf & _
            "2. Si tu as fermé SEE : rouvre-le sur ton projet d'essai, puis reclique sur le bouton vert 1 (" & OU_BOUTONS & ")."
    ElseIf gEstAutomation And Not mProjetOuvert Then
        ConsigneFinale = "Excel a rejoint SEE, mais par sa partie « SeeAutomation », qui ne sait pas lire le projet ouvert." & vbCrLf & _
            "1. " & photo & vbCrLf & "2. " & bouton3
    ElseIf Not mProjetOuvert Then
        ConsigneFinale = "Presque : Excel parle à ta fenêtre SEE, mais aucun projet n'y est ouvert." & vbCrLf & _
            "1. " & photo & vbCrLf & "2. Dans SEE, ouvre ton projet d'essai (même vide), puis reclique sur le bouton vert 1 (" & OU_BOUTONS & ")."
    Else
        ' l'étape 1 est faite : SEE est joint et un projet est ouvert (un projet vide suffit)
        ConsigneFinale = "BRAVO : l'étape 1 est réussie, Excel parle à ta fenêtre SEE (projet " & mProjetLu & ")." & vbCrLf & _
            "1. " & photo & vbCrLf & _
            "2. Si c'est bien ton projet d'essai : clique sur le bouton bleu « 2. SEE DESSINE » (" & OU_BOUTONS & ")."
    End If
End Function

' Une sonde du test : une erreur imprévue l'arrête, pas le test. L'étape dit
' ce que la sonde a lu, puis les réponses en erreur notées au journal pendant
' elle (les mêmes lignes que « Ce qui a échoué »).
Private Sub EtapeDuTest(ByVal nom As String)
    Dim e0 As Long, numErr As Long, descErr As String
    e0 = gNbLignesErreur
    mSondesFaites = mSondesFaites & "|" & nom & "|"
    On Error GoTo Echec
    Application.StatusBar = "Test de SEE (lecture seule) : " & nom
    If nom = "SondeRegistre" Then
        SondeRegistre
    ElseIf nom = "SondeApplication" Then
        SondeApplication
    ElseIf nom = "SondeSymboles" Then
        SondeSymboles
    ElseIf nom = "SondeFolio" Then
        SondeFolioDe True
    ElseIf nom = "SondeSelection" Then
        SondeSelection
    Else
        SondeMethodes
    End If
    NoterEtape nom & " : " & CeQuiAEteLu(nom) & ErreursDeLEtape(e0)
    Exit Sub
Echec:
    numErr = Err.Number
    descErr = Err.Description
    gNbErreurs = gNbErreurs + 1
    Application.ScreenUpdating = True
    Journal "TesterSEE", nom, "(sonde)", "ARRÊT IMPRÉVU de la sonde : le test passe à la suite", numErr, descErr
    NoterEtape nom & " : ARRÊTÉE par une erreur imprévue (" & numErr & " " & descErr & ") ; le test a continué" & ErreursDeLEtape(e0)
End Sub

' Ce qu'une sonde a lu : « faite : ... » si elle a lu quelque chose, sinon « rien lu : ... ».
Private Function CeQuiAEteLu(ByVal nom As String) As String
    Select Case nom
        Case "SondeRegistre"
            If mRegistreLu Then
                CeQuiAEteLu = "faite : " & mProgIDsTrouves.Count & " ProgID de SEE, " & mNbClsidInscrits & " CLSID sur " & _
                    mNbClsidLus & " inscrits (feuille " & FEUILLE_REGISTRE & ")"
            Else
                CeQuiAEteLu = "rien lu : registre illisible (feuille " & FEUILLE_REGISTRE & ")"
            End If
        Case "SondeApplication"
            If Not mConnecte Then
                CeQuiAEteLu = "rien lu : SEE n'est pas joint"
            ElseIf mProjetOuvert Then
                CeQuiAEteLu = "faite : SEE joint (" & mVersion & "), projet " & mProjetLu
            Else
                CeQuiAEteLu = "faite : SEE joint (" & mVersion & "), mais aucun projet ouvert"
            End If
        Case "SondeSymboles"
            If mNbFormes > 0 Then
                CeQuiAEteLu = "faite : " & mNbFamilles & " famille(s), " & mNbFormes & " symbole(s) lus"
            Else
                CeQuiAEteLu = "rien lu : aucun symbole (" & mNbFamilles & " famille(s))"
            End If
        Case "SondeFolio"
            If Len(mFolioLu) > 0 Then
                CeQuiAEteLu = "faite : « " & mFolioLu & " », " & mNbSymboles & " symbole(s), " & mNbMateriels & " matériel(s) lus"
            Else
                CeQuiAEteLu = "rien lu : " & mFolioRaison
            End If
        Case "SondeSelection"
            If mNbSelection > 0 Then
                CeQuiAEteLu = "faite : " & mNbSelection & " objet(s) sélectionné(s), " & mNbMaterielsSelection & " matériel(s) lus"
            Else
                CeQuiAEteLu = "rien lu : aucun objet sélectionné lisible"
            End If
        Case Else
            If mNbXML > 0 Then
                CeQuiAEteLu = "faite : " & mNbXML & " XML sur 6 lus"
            Else
                CeQuiAEteLu = "rien lu : aucun XML rendu"
            End If
    End Select
End Function

' Vrai si TesterSEE a lancé cette sonde (elle peut être sautée : pas de sélection, SEE perdu).
Private Function SondeLancee(ByVal nom As String) As Boolean
    SondeLancee = (InStr(1, mSondesFaites, "|" & nom & "|", vbBinaryCompare) > 0)
End Function

' « (n réponse(s) en erreur au journal) » depuis e0, ou rien.
Private Function ErreursDeLEtape(ByVal e0 As Long) As String
    If gNbLignesErreur > e0 Then
        ErreursDeLEtape = " (" & (gNbLignesErreur - e0) & " réponse(s) en erreur au journal)"
    Else
        ErreursDeLEtape = ""
    End If
End Function

Private Sub NoterEtape(ByVal texte As String)
    mEtapesTest = mEtapesTest & texte & vbLf
End Sub

' Le nombre d'objets sélectionnés dans la vue active de SEE (0 s'il n'y a ni
' vue ni sélection, ou si elle est illisible).
Private Function NbObjetsSelectionnes() As Long
    Dim vue As Object, sel As Object
    NbObjetsSelectionnes = 0
    Contexte "TesterSEE", "sélection"
    Set vue = SEE_VueActive()
    If vue Is Nothing Then Exit Function
    Set sel = SEE_SelectionVue(vue)
    If sel Is Nothing Then Exit Function
    NbObjetsSelectionnes = ElementsDe(sel).Count
End Function

' Avant un test : rien n'a encore été lu.
Private Sub RemettreLesLectures()
    mConnecte = False
    mConnexionEssayee = False
    mJoint = False
    mPerdu = ""
    mProjetOuvert = False
    mSondesFaites = ""
    mVersion = ""
    mUnite = ""
    mProjetLu = ""
    mNbFamilles = 0
    mNbFormes = 0
    mFolioLu = ""
    mFolioRaison = "non lu"
    mNbSymboles = 0
    mNbSegments = 0
    mNbGraphiques = 0
    mNbSelection = 0
    mNbMaterielsSelection = 0
    mNbXML = 0
    mNbMateriels = 0
    mEtapesTest = ""
    mRegistreResume = ""
    mRegistreLu = False
    mNbClsidInscrits = 0
    mNbClsidLus = 0
    Set mProgIDsTrouves = New Collection
    Set gEssais = Nothing
    mEnMarche = ""
    mEtatMarche = -1
    Set mClasses = NouveauDicoExact()
End Sub

' La feuille Resultat_Test, en tête du classeur. En haut, sur fond jaune, le
' bloc court « À PHOTOGRAPHIER » (le technicien ne renvoie que des photos) :
' SEE rejoint ou non, et comment ; chaque essai de connexion avec la réponse
' de Windows (code et phrase) ; ce que le registre dit de SEE ; le projet lu ;
' la consigne (« Et maintenant », celle de la boîte de fin). Dessous, le détail.
Private Sub EcrireResultatTest(ByVal imprevu As String, ByVal consigne As String)
    Dim ws As Object, l As Long, s As String, k As Variant, e As Variant, etapes As Variant, erreurs As Collection, nb As Long
    Dim rubrique As String
    Set ws = FeuilleEnTete(FEUILLE_RESULTAT)
    l = 0
    LigneResultat ws, l, "À PHOTOGRAPHIER", "Prends en photo cette partie jaune, jusqu'à « Et maintenant », et envoie-la-moi. " & _
        "Test du " & Format$(Now, "yyyy-mm-dd hh:mm") & ", en lecture seule : rien n'a été écrit dans SEE."
    LigneResultat ws, l, "SEE rejoint ?", TexteSEERejoint()
    LigneResultat ws, l, "SEE en marche ?", IIf(Len(mEnMarche) > 0, mEnMarche, "non vu") & " (d'après Windows)"
    If Len(mPerdu) > 0 Then
        LigneResultat ws, l, "SEE perdu", "SEE ne répondait plus avant " & mPerdu & " : " & mPerdu & " et les sondes suivantes sont " & _
            "sautées (aucune nouvelle connexion en cours de test) ; ce qui a été lu avant est gardé"
    End If
    rubrique = "Essais"
    If Not gEssais Is Nothing Then
        For Each e In gEssais
            nb = nb + 1
            LigneResultat ws, l, rubrique, nb & ". " & CStr(e)
            rubrique = ""
        Next e
    End If
    If nb = 0 Then LigneResultat ws, l, rubrique, IIf(mConnexionEssayee, "aucun", "pas essayé : le test s'est arrêté avant")
    rubrique = "Registre"
    For Each e In Split(mRegistreResume, vbLf)
        If Len(CStr(e)) > 0 Then
            LigneResultat ws, l, rubrique, CStr(e)
            rubrique = ""
        End If
    Next e
    If rubrique = "Registre" Then LigneResultat ws, l, rubrique, "non lu"
    If mJoint Then
        LigneResultat ws, l, "Projet lu", mProjetLu
    Else
        LigneResultat ws, l, "Projet lu", "non lu : SEE n'est pas rejoint"
    End If
    LigneResultat ws, l, "Et maintenant", Replace(consigne, vbCrLf, vbLf)
    SurlignerPhoto ws, l
    l = l + 1
    LigneResultat ws, l, "Détail", "ce qui suit n'est à photographier que si je te le demande"
    If mJoint Then
        LigneResultat ws, l, "Version", mVersion & " ; l'API est lue en V" & gVersionAPI & " (réglage VersionAPI = " & _
            Reglage("VersionAPI", "auto") & ")"
        LigneResultat ws, l, "Unité", mUnite
        LigneResultat ws, l, "Projet ouvert", mProjetLu
        If SondeLancee("SondeSymboles") Then
            s = mNbFamilles & " famille(s), " & mNbFormes & " symbole(s) lus (feuille Sonde_Symboles)"
        Else
            s = "non lus (SEE ne répondait plus)"
        End If
        LigneResultat ws, l, "Symboles de SEE", s
        If Not SondeLancee("SondeFolio") Then
            s = "non lu (SEE ne répondait plus)"
        ElseIf Len(mFolioLu) > 0 Then
            s = "« " & mFolioLu & " » : " & mNbSymboles & " symbole(s), " & mNbSegments & " segment(s) de connexion, " & _
                mNbGraphiques & " objet(s) graphique(s) lus (feuille Sonde_Folio)"
        Else
            s = "aucun : " & mFolioRaison & " (pas grave : un projet ouvert suffit à l'étape 1 ; le bouton 2 dessine un folio)"
        End If
        LigneResultat ws, l, "Folio lu", s
        If mNbMateriels > 0 Then
            s = mNbMateriels & " matériel(s) lu(s) sur le folio (symboles et connecteurs) ; classes vues :"
            For Each k In mClasses.Keys
                s = s & " « " & CStr(k) & " » (" & EnLong(mClasses.Item(k), 0) & ")"
            Next k
        ElseIf Len(mFolioLu) > 0 Then
            s = "aucun matériel (référence du catalogue) associé aux objets du folio (pas grave pour les étapes 1 et 2)"
        Else
            s = "non lu (aucun folio lu)"
        End If
        LigneResultat ws, l, "Matériel", s
        If mNbSelection > 0 Then
            s = mNbSelection & " objet(s) sélectionné(s) lus, " & mNbMaterielsSelection & " matériel(s) (feuille Sonde_Selection)"
        ElseIf SondeLancee("SondeSelection") Then
            s = "aucun objet sélectionné lisible dans SEE (feuille Sonde_Selection)"
        ElseIf SondeLancee("SondeSelection:sautée") Then
            s = "aucun objet sélectionné dans SEE : sautée"
        Else
            s = "non lue (SEE ne répondait plus)"
        End If
        LigneResultat ws, l, "Sélection", s
        If SondeLancee("SondeMethodes") Then
            s = mNbXML & " sur 6 lus (feuille Sonde_XML)"
        Else
            s = "non lues (SEE ne répondait plus)"
        End If
        LigneResultat ws, l, "Méthodes (XML)", s
    End If
    etapes = Split(mEtapesTest, vbLf)
    s = "Étapes"
    For Each e In etapes
        If Len(CStr(e)) > 0 Then
            LigneResultat ws, l, s, CStr(e)
            s = ""
        End If
    Next e
    If Len(imprevu) > 0 Then LigneResultat ws, l, "Arrêt imprévu", imprevu
    Set erreurs = ErreursDuJournal(8, nb)
    If nb = 0 Then
        LigneResultat ws, l, "Ce qui a échoué", "rien : le journal ne note aucune réponse en erreur"
    Else
        LigneResultat ws, l, "Ce qui a échoué", "le journal note " & nb & " réponse(s) en erreur. C'est normal pour un test : " & _
            "chacune dit ce que SEE (ou Windows) n'a pas ou refuse. Les plus fréquentes :"
        For Each e In erreurs
            LigneResultat ws, l, "", CStr(e)
        Next e
    End If
    MontrerFeuille ws
End Sub

' La ligne « SEE rejoint ? » : OUI et comment, ou NON.
Private Function TexteSEERejoint() As String
    Dim s As String
    If mJoint Then
        If Len(gStrategie) > 0 Then
            s = "OUI, ta fenêtre SEE ouverte, rejointe par " & gStrategie
        Else
            s = "OUI, par la connexion gardée d'une macro précédente"
        End If
        If gEstAutomation Then s = s & " ; mais par la coclasse SeeAutomation, qui ne sait pas lire le projet ouvert"
    ElseIf mConnexionEssayee Then
        s = "NON : Excel n'a pas trouvé ta fenêtre SEE (chaque essai ci-dessous, avec la réponse de Windows)"
    Else
        s = "pas essayé : le test s'est arrêté avant (voir « Arrêt imprévu »)"
    End If
    TexteSEERejoint = s
End Function

' Les erreurs du journal (les lignes qui ont un Err.Number), regroupées par
' appel et message : « 3 x appel : message », les plus fréquentes d'abord (à
' égalité, la première apparue) ; au plus maxi lignes, puis une ligne pour le
' reste. total reçoit le nombre de lignes en erreur.
Private Function ErreursDuJournal(ByVal maxi As Long, ByRef total As Long) As Collection
    Dim ws As Object, n As Long, v As Variant, i As Long, cle As String, d As Object, res As Collection
    Dim k As Variant, nb As Long, reste As Long, pris As Object, meilleure As String, plus As Long
    total = 0
    Set res = New Collection
    Set ErreursDuJournal = res
    Set ws = FeuilleExistante(FEUILLE_JOURNAL)
    If ws Is Nothing Then Exit Function
    n = DerniereLigne(ws, 1)
    If n < 2 Then Exit Function
    v = ws.Range(ws.Cells(2, 1), ws.Cells(n, 7)).Value
    Set d = NouveauDicoExact()
    For i = 1 To n - 1
        If Len(EnTexte(v(i, 6))) > 0 Then
            cle = Left$(EnTexte(v(i, 4)), 100)
            If Len(cle) = 0 Then cle = Left$(EnTexte(v(i, 3)), 100)
            cle = cle & " : " & Left$(EnTexte(v(i, 7)), 160)
            nb = 0
            If d.Exists(cle) Then nb = EnLong(d.Item(cle), 0)
            d.Item(cle) = nb + 1
        End If
    Next i
    ' les maxi plus fréquentes (une sélection simple : maxi passes sur les groupes)
    Set pris = NouveauDicoExact()
    Do While res.Count < maxi
        meilleure = ""
        plus = 0
        For Each k In d.Keys
            If Not pris.Exists(CStr(k)) Then
                nb = EnLong(d.Item(k), 0)
                If nb > plus Then
                    plus = nb
                    meilleure = CStr(k)
                End If
            End If
        Next k
        If plus = 0 Then Exit Do
        pris.Add meilleure, plus
        res.Add plus & " x " & meilleure
    Loop
    For Each k In d.Keys
        total = total + EnLong(d.Item(k), 0)
        If Not pris.Exists(CStr(k)) Then reste = reste + EnLong(d.Item(k), 0)
    Next k
    If reste > 0 Then res.Add "et " & reste & " autre(s) : voir la feuille Journal (colonnes Err.Number et Err.Description)"
End Function

' ============================================================================
'  SondeRegistre : comment SEE est inscrit dans le registre de Windows, en
'  LECTURE SEULE (WMI, module SEE_Windows), dans la feuille Sonde_Registre :
'    - chaque CLSID des réglages CLSID_Application et CLSID_Automation, dans
'      les deux vues (HKCR\CLSID et HKCR\WOW6432Node\CLSID) : (défaut),
'      ProgID, VersionIndependentProgID, LocalServer32, InprocServer32,
'      TypeLib, AppID ;
'    - les ProgID inscrits dont le nom parle de SEE (SEE, IGE, XAO), avec
'      leur CLSID : HKLM\SOFTWARE\Classes, sa vue WOW6432Node, et
'      HKCU\SOFTWARE\Classes ;
'    - l'association de l'extension .seeprj.
'  Les ProgID trouvés vont dans gProgIDsRegistre (ceux d'un CLSID des
'  réglages d'abord, PROGID_MAXI au plus) : ConnecterSEE les essaie. Toute
'  erreur (WMI refusé, clé absente) est dite, jamais fatale. Un chemin de
'  serveur s'affiche ; un chemin dans un profil utilisateur est masqué.
'  Elle ne joint pas SEE : TesterSEE la lance AVANT de le joindre.
' ============================================================================
Public Sub SondeRegistre()
    Const TITRE_SONDE As String = "SondeRegistre"
    If mEnchaine Then
        Journal "Début", TITRE_SONDE, "", "sonde enchaînée par TesterSEE (lecture seule)"
    Else
        OuvrirJournal TITRE_SONDE
    End If
    Set mFeuille = FeuilleCreee(FEUILLE_REGISTRE, True)
    mLigne = 0
    Application.ScreenUpdating = False
    Contexte "SondeRegistre", "registre"
    LireRegistreSEE
    FinSonde TITRE_SONDE
End Sub

Private Sub LireRegistreSEE()
    Dim p As Variant, clsid As String, vue As Variant, dit As String, racine As Variant, noms As Collection
    Dim nom As Variant, pourquoi As String, t As String, nbLignes As Long, nbAutres As Long, nbNoms As Long, s As String
    Set mProgIDsTrouves = New Collection
    Set mProgIDsConnus = New Collection
    Set mProgIDsAutres = New Collection
    Set mProgIDsVus = NouveauDico()
    mRegistreResume = ""
    mNbClsidInscrits = 0
    mNbClsidLus = 0
    mRegistreLu = False
    ' --- le registre se lit-il ? (WMI peut être refusé par l'informatique ; une clé quelconque, souvent absente)
    If Not RegistreSousCles("HKCR\CLSID\{00000000-0000-0000-0000-000000000000}", noms, pourquoi) Then
        If Left$(pourquoi, 3) = "WMI" Or Left$(pourquoi, 7) = "lecture" Then
            Ecrire Array("Registre", "ILLISIBLE", pourquoi)
            Journal gEtape, gObjet, "WMI StdRegProv", "registre illisible : " & pourquoi, -1, pourquoi
            mRegistreResume = "illisible : " & pourquoi
            Set gProgIDsRegistre = New Collection
            Exit Sub
        End If
    End If
    mRegistreLu = True
    ' --- 1. les CLSID des réglages, dans les deux vues
    TitreSection "Les CLSID des réglages, dans HKCR\CLSID et dans sa vue 32 bits HKCR\WOW6432Node\CLSID"
    Entetes Array("CLSID", "Nom", "Vue", "Inscrit ?", "(défaut)", "ProgID", "VersionIndependentProgID", "LocalServer32", _
        "InprocServer32", "TypeLib", "AppID")
    For Each p In Split(Reglage("CLSID_Application", "") & ";" & Reglage("CLSID_Automation", ""), ";")
        clsid = Trim$(CStr(p))
        If Len(clsid) > 0 Then
            mNbClsidLus = mNbClsidLus + 1
            dit = ""
            For Each vue In Array("CLSID", "WOW6432Node\CLSID")
                DecrireCLSID clsid, CStr(vue), dit
            Next vue
            If InStr(1, dit, "inscrit", vbBinaryCompare) > 0 Then mNbClsidInscrits = mNbClsidInscrits + 1
            AjouterResume Trim$(NomDuCLSID(clsid) & " " & CLSIDCourt(clsid)) & " : " & dit
        End If
    Next p
    ' --- 2. les ProgID qui parlent de SEE
    TitreSection ""
    TitreSection "Les ProgID inscrits dont le nom contient SEE, IGE ou XAO (avec leur CLSID)"
    Entetes Array("Racine", "ProgID", "CLSID", "Nom du CLSID")
    For Each racine In Array("HKLM\SOFTWARE\Classes", "HKLM\SOFTWARE\WOW6432Node\Classes", "HKCU\SOFTWARE\Classes")
        If RegistreSousCles(CStr(racine), noms, pourquoi) Then
            nbNoms = nbNoms + noms.Count
            For Each nom In noms
                If NomQuiParleDeSEE(CStr(nom)) Then
                    t = TexteDuRegistre(CStr(racine) & "\" & CStr(nom) & "\CLSID", "")
                    If Len(t) > 0 Then
                        nbLignes = nbLignes + 1
                        If nbLignes <= 60 Then Ecrire Array(CStr(racine), CStr(nom), t, NomDuCLSID(t))
                        NoterProgID CStr(nom), t
                    Else
                        nbAutres = nbAutres + 1
                    End If
                End If
            Next nom
        Else
            Ecrire Array(CStr(racine), "(illisible : " & pourquoi & ")")
        End If
    Next racine
    If nbLignes > 60 Then Ecrire Array("", "(et " & (nbLignes - 60) & " autre(s))")
    Ecrire Array("", "(" & nbNoms & " clés lues ; " & nbAutres & " clé(s) qui parlent de SEE sans CLSID : pas des ProgID)")
    If mProgIDsTrouves.Count = 0 Then
        AjouterResume "ProgID : aucun dont le nom contient SEE, IGE ou XAO (" & nbNoms & " clés lues)"
    Else
        s = ""
        nbLignes = 0
        For Each p In mProgIDsTrouves
            nbLignes = nbLignes + 1
            If nbLignes <= 6 Then s = s & IIf(Len(s) > 0, " ; ", "") & CStr(p)
        Next p
        If nbLignes > 6 Then s = s & " ; et " & (nbLignes - 6) & " autre(s) (feuille " & FEUILLE_REGISTRE & ")"
        AjouterResume "ProgID trouvés : " & s
    End If
    ' les ProgID que ConnecterSEE essaiera : ceux d'un CLSID des réglages d'abord
    Set gProgIDsRegistre = New Collection
    For Each p In mProgIDsConnus
        If gProgIDsRegistre.Count < PROGID_MAXI Then gProgIDsRegistre.Add CStr(p)
    Next p
    For Each p In mProgIDsAutres
        If gProgIDsRegistre.Count < PROGID_MAXI Then gProgIDsRegistre.Add CStr(p)
    Next p
    ' --- 3. l'extension des projets
    TitreSection ""
    TitreSection "L'extension .seeprj (les projets SEE)"
    t = TexteDuRegistre("HKCR\.seeprj", "")
    If Len(t) = 0 Then
        Ecrire Array("HKCR\.seeprj", "(absente)")
        AjouterResume ".seeprj : aucune association"
    Else
        s = CheminAffichable(TexteDuRegistre("HKCR\" & t & "\shell\open\command", ""))
        Ecrire Array("HKCR\.seeprj", t, "shell\open\command", IIf(Len(s) > 0, s, "(absente)"))
        AjouterResume ".seeprj : " & t & IIf(Len(s) > 0, ", ouvert par " & s, "")
    End If
    Journal gEtape, gObjet, "", Replace(mRegistreResume, vbLf, " / ")
End Sub

' Une vue d'un CLSID : une ligne de la feuille, et ce qu'elle dit, ajouté à dit.
Private Sub DecrireCLSID(ByVal clsid As String, ByVal vue As String, ByRef dit As String)
    Dim cleCLSID As String, sous As Collection, pourquoi As String, v(1 To 7) As String, serveur As String, quoi As String
    cleCLSID = "HKCR\" & vue & "\" & clsid
    quoi = IIf(vue = "CLSID", "CLSID", "WOW6432Node")
    If Len(dit) > 0 Then dit = dit & " ; "
    If Not RegistreSousCles(cleCLSID, sous, pourquoi) Then
        Ecrire Array(clsid, NomDuCLSID(clsid), vue, "NON (" & pourquoi & ")")
        dit = dit & quoi & " : " & IIf(pourquoi = "absente", "absent", pourquoi)
        Exit Sub
    End If
    v(1) = LuDuRegistre(cleCLSID, "")
    v(2) = LuDuRegistre(cleCLSID & "\ProgID", "")
    v(3) = LuDuRegistre(cleCLSID & "\VersionIndependentProgID", "")
    v(4) = LuDuRegistre(cleCLSID & "\LocalServer32", "")
    v(5) = LuDuRegistre(cleCLSID & "\InprocServer32", "")
    v(6) = LuDuRegistre(cleCLSID & "\TypeLib", "")
    v(7) = LuDuRegistre(cleCLSID, "AppID")
    Ecrire Array(clsid, NomDuCLSID(clsid), vue, "OUI", v(1), v(2), v(3), v(4), v(5), v(6), v(7))
    If Left$(v(2), 1) <> "(" Then NoterProgID v(2), clsid
    If Left$(v(3), 1) <> "(" Then NoterProgID v(3), clsid
    serveur = v(4)
    If Left$(serveur, 1) = "(" Then serveur = v(5)
    dit = dit & quoi & " : inscrit" & IIf(Left$(v(2), 1) <> "(", ", ProgID " & v(2), ", sans ProgID") & _
        IIf(Left$(serveur, 1) <> "(", ", serveur " & serveur, ", sans serveur")
End Sub

' Une valeur du registre pour la feuille : son texte (chemin de profil masqué), ou « (absente) ».
Private Function LuDuRegistre(ByVal chemin As String, ByVal valeur As String) As String
    Dim t As String, pourquoi As String
    If RegistreTexte(chemin, valeur, t, pourquoi) Then
        LuDuRegistre = CheminAffichable(t)
    Else
        LuDuRegistre = "(" & pourquoi & ")"
    End If
End Function

' Une valeur du registre, ou "" si elle n'a pas pu être lue.
Private Function TexteDuRegistre(ByVal chemin As String, ByVal valeur As String) As String
    Dim t As String, pourquoi As String
    If RegistreTexte(chemin, valeur, t, pourquoi) Then TexteDuRegistre = t
End Function

' Un ProgID trouvé (nom = CLSID), une fois : pour la photo, et pour ConnecterSEE.
Private Sub NoterProgID(ByVal nom As String, ByVal clsid As String)
    Dim u As String
    nom = Trim$(nom)
    If Len(nom) = 0 Then Exit Sub
    If mProgIDsVus.Exists(nom) Then Exit Sub
    mProgIDsVus.Add nom, True
    mProgIDsTrouves.Add nom & " = " & Trim$(NomDuCLSID(clsid) & " " & CLSIDCourt(clsid))
    If Len(NomDuCLSID(clsid)) > 0 And Left$(NomDuCLSID(clsid), 1) <> "(" Then
        mProgIDsConnus.Add nom
    Else
        ' un autre ProgID n'est essayé que s'il commence comme ceux de SEE ou d'IGE+XAO
        u = UCase$(nom)
        If Left$(u, 3) = "SEE" Or Left$(u, 3) = "IGE" Or InStr(1, u, "XAO", vbBinaryCompare) > 0 Then mProgIDsAutres.Add nom
    End If
End Sub

' Vrai pour un nom de clé qui parle de SEE ou d'IGE+XAO : il contient SEE ou
' XAO, ou IGE en début de mot (pas « Privilege »). Ni une extension, ni un CLSID.
Private Function NomQuiParleDeSEE(ByVal nom As String) As Boolean
    Dim u As String, p As Long
    u = UCase$(nom)
    If Left$(u, 1) = "." Or Left$(u, 1) = "{" Then Exit Function
    If InStr(1, u, "SEE", vbBinaryCompare) > 0 Or InStr(1, u, "XAO", vbBinaryCompare) > 0 Then
        NomQuiParleDeSEE = True
        Exit Function
    End If
    p = InStr(1, u, "IGE", vbBinaryCompare)
    Do While p > 0
        If p = 1 Then
            NomQuiParleDeSEE = True
            Exit Function
        End If
        If Not (Mid$(u, p - 1, 1) Like "[A-Z]") Then
            NomQuiParleDeSEE = True
            Exit Function
        End If
        p = InStr(p + 1, u, "IGE", vbBinaryCompare)
    Loop
End Function

' Un chemin lu au registre, s'il peut s'afficher : celui d'un programme oui ;
' celui d'un profil utilisateur (C:\Users\<nom>\..., %USERPROFILE%...) non.
Private Function CheminAffichable(ByVal s As String) As String
    Dim u As String, nomUtil As String
    u = LCase$(s)
    On Error Resume Next
    nomUtil = LCase$(Environ$("USERNAME"))
    On Error GoTo 0
    If (InStr(1, u, "\users\", vbBinaryCompare) > 0 And InStr(1, u, "\users\public", vbBinaryCompare) = 0) Or _
            InStr(1, u, "documents and settings", vbBinaryCompare) > 0 Or InStr(1, u, "%userprofile%", vbBinaryCompare) > 0 Or _
            InStr(1, u, "%appdata%", vbBinaryCompare) > 0 Or InStr(1, u, "%localappdata%", vbBinaryCompare) > 0 Or _
            InStr(1, u, "%homepath%", vbBinaryCompare) > 0 Or (Len(nomUtil) >= 4 And InStr(1, u, nomUtil, vbBinaryCompare) > 0) Then
        CheminAffichable = "(chemin dans un profil utilisateur : masqué)"
    Else
        CheminAffichable = s
    End If
End Function

Private Sub AjouterResume(ByVal texte As String)
    mRegistreResume = mRegistreResume & texte & vbLf
End Sub

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
    mVersion = LireProp(gApp, "ApplicationName") & " " & LireProp(gApp, "ApplicationVersion")
    ' --- environnement
    Contexte "SondeApplication", "Environnement"
    Set env = SEE_Environnement()
    If env Is Nothing Then
        Ecrire Array("Environnement", "GetEnvironment", "#ERR " & gDerniereErreur)
        mUnite = "illisible (environnement non lu : " & gDerniereErreur & ")"
    Else
        mUnite = "illisible : " & LireProp(env, "Unit")
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
            mUnite = u
        End If
    End If
    ' --- projet (enchaînée par TesterSEE, le bouton 1 : jamais de projet ouvert dans SEE, celui qui y est est lu)
    Contexte "SondeApplication", "Projet"
    Set prj = SEE_Projet(True, Not mEnchaine)
    If prj Is Nothing Then
        Ecrire Array("Projet", "GetProject", "aucun projet ouvert (ou erreur : " & gDerniereErreur & ")")
        mProjetLu = "aucun projet ouvert dans le SEE joint" & IIf(Len(gDerniereErreur) > 0, " (dernière erreur : " & gDerniereErreur & ")", "")
    Else
        mProjetOuvert = True
        mProjetLu = "« " & LireProp(prj, "Name") & " »"
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
    mNbFamilles = nbFam
    mNbFormes = nbSym
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
    SondeFolioDe False
End Sub

' parLaVue : le folio de la vue active, quel que soit le réglage SondeFolio
' (TesterSEE) ; sinon le folio du réglage, ou celui de la vue s'il est vide.
Private Sub SondeFolioDe(ByVal parLaVue As Boolean)
    Dim prj As Object, sh As Object, nom As String
    Const TITRE_SONDE As String = "SondeFolio"
    mFolioLu = ""
    mFolioRaison = "SEE non joint"
    If Not DebutSonde(TITRE_SONDE, "Sonde_Folio") Then GoTo Fin
    If Not parLaVue Then nom = Reglage("SondeFolio", "")
    Contexte "SondeFolio", nom
    Set prj = SEE_Projet(True, Not mEnchaine)
    If Len(nom) > 0 Then
        If Not prj Is Nothing Then Set sh = FolioDuProjet(prj, nom)
    Else
        Set sh = FolioDeLaVueActive()
    End If
    If sh Is Nothing Then
        mFolioRaison = IIf(Len(nom) > 0, "« " & nom & " » n'est pas dans le projet", "pas de vue active montrant un folio")
        Ecrire Array("Folio", "introuvable", mFolioRaison & " ; " & gDerniereErreur)
        GoTo Fin
    End If
    DecrireFolio sh
Fin:
    FinSonde TITRE_SONDE
End Sub

' ============================================================================
'  RelireFolio : relit UN folio donné dans la feuille Sonde_Folio, sans boîte
'  et sans vider le journal (comme une sonde enchaînée). Les boutons 2 et 3
'  (EssaiDessinReel, EssaiSansFenetre, SEE_Pilote) l'appellent sur le folio
'  qu'ils viennent de dessiner : les positions que SEE a gardées disent
'  l'origine, le sens de y et l'échelle. LECTURE SEULE.
' ============================================================================
Public Sub RelireFolio(ByVal sh As Object)
    Dim ancien As Boolean
    Const TITRE_RELECTURE As String = "Relecture du folio"
    ancien = mEnchaine
    On Error GoTo Echec
    mEnchaine = True
    ' la macro qui a dessiné le folio tient déjà SEE : la relecture s'en sert (elle vérifie qu'il répond),
    ' sans reconnexion (le bouton 3 tient un SEE qu'il a créé : une reconnexion le lâcherait)
    mJoint = Not (gApp Is Nothing)
    mFolioLu = ""
    mFolioRaison = "non lu"
    If DebutSonde(TITRE_RELECTURE, "Sonde_Folio") Then
        If sh Is Nothing Then
            Ecrire Array("Folio", "introuvable", "aucun folio à relire")
        Else
            DecrireFolio sh
        End If
    End If
    FinSonde TITRE_RELECTURE
    mEnchaine = ancien
    Exit Sub
Echec:
    Journal "Relecture", "", "(sonde)", "ARRÊT IMPRÉVU de la relecture (rien n'est écrit dans SEE)", Err.Number, Err.Description
    Application.ScreenUpdating = True
    mEnchaine = ancien
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
    mFolioLu = nomFolio
    mNbSymboles = 0
    mNbSegments = 0
    mNbGraphiques = 0
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
    mNbSymboles = n
    ' --- le matériel associé (symboles et connecteurs), un élément par ligne
    EcrireSectionMateriel
    CompterMaterielsDuFolio
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
    mNbSegments = n
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
    mNbGraphiques = n
End Sub

' La section « Matériel associé » : les éléments notés par DecrireSymbole
' (un par ligne ; un connecteur une seule fois, même s'il a plusieurs broches).
Private Sub EcrireSectionMateriel()
    Dim r As Variant
    TitreSection ""
    TitreSection "Matériel associé (GetEquipmentCollection) : la colonne Class est la valeur à mettre dans " & _
        "<NATURE>.ClasseMateriel (porteur symbole) ou <NATURE>.ClasseConnecteur (porteur connecteur)"
    Entetes Array("Symbole", "Porteur", "Repere", "Class", "Code", "Quantity")
    If mLignesMateriel.Count = 0 Then
        Ecrire Array("", "aucun matériel associé aux objets lus")
        Exit Sub
    End If
    For Each r In mLignesMateriel
        Ecrire r
    Next r
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
    mNbSelection = n
    If n = 0 Then
        Ecrire Array("Sélection", "aucun objet sélectionné dans la vue active")
    Else
        EcrireSectionMateriel
        mNbMaterielsSelection = mLignesMateriel.Count
    End If
Fin:
    FinSonde TITRE_SONDE
End Sub

' ============================================================================
'  Les descriptions, une ligne par objet ; jamais d'arrêt sur erreur
' ============================================================================
Private Sub EntetesSymboles()
    Entetes Array("N", "Tag", "Label", "Root", "Order", "Manual", "DisplayTag", "Famille", "Forme", "SymbolType", _
        "SymbolBehavior", "Angle", "SymbolScale", "X1", "Y1", "X2", "Y2", "NbPointsConnexion", "dx 1er point", "dy 1er point", _
        "Connecteur", "Broche", "Borne", "Materiel (Class / Code / Quantity)", "Materiel du connecteur", "Erreurs")
End Sub

Private Sub DecrireSymbole(ByVal n As Long, ByVal sym As Object)
    Dim tg As Object, forme As Object, fam As Object, x1 As Double, y1 As Double, x2 As Double, y2 As Double
    Dim aSecond As Boolean, pos As Variant, cps As Collection, cx As Double, cy As Double, dx As String, dy As String
    Dim lien As Object, connecteur As String, broche As String, borne As String, erreurs As String
    Dim t(0 To 5) As String, i As Long, nomFam As String, nomForme As String, matSym As String, matCon As String
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
    ' le matériel du symbole, puis celui de son connecteur s'il en a un (lecture seule)
    matSym = MaterielsDuPorteur(n, "symbole", t(0), sym)
    Set lien = SEE_LienDuSymbole(sym, "C")
    If Not lien Is Nothing Then
        connecteur = RepereTexte(lien)
        matCon = MaterielsDuPorteur(n, "connecteur", connecteur, lien)
    End If
    Set lien = SEE_LienDuSymbole(sym, "P")
    If Not lien Is Nothing Then broche = SEE_NomDe(lien)
    Set lien = SEE_LienDuSymbole(sym, "T")
    If Not lien Is Nothing Then borne = SEE_NomDe(lien)
    Ecrire Array(n, t(0), t(1), t(2), t(3), t(4), t(5), nomFam, nomForme, LireProp(sym, "SymbolType"), _
        LireProp(sym, "SymbolBehavior"), LireProp(sym, "Angle"), LireProp(sym, "SymbolScale"), pos(0), pos(1), pos(2), pos(3), _
        cps.Count, dx, dy, connecteur, broche, borne, matSym, matCon, erreurs)
    Exit Sub
Echec:
    Ecrire Array(n, "#ERR " & Err.Number & " : " & Err.Description)
End Sub

' Le matériel d'un porteur (un symbole, un connecteur) en texte, « Class /
' Code / Quantity » de chaque élément ; chaque élément est aussi noté pour la
' section « Matériel associé » (un connecteur une seule fois, même s'il a
' plusieurs broches). LECTURE SEULE.
Private Function MaterielsDuPorteur(ByVal n As Long, ByVal porteur As String, ByVal repere As String, ByVal obj As Object) As String
    Dim coll As Object, e As Variant, s As String, classe As String, code As String, qte As String
    Dim nouveau As Boolean, cle As String
    MaterielsDuPorteur = ""
    If Not SEE_LireMateriels(obj, coll) Then
        ' l'erreur de CET appel (SEE_LireMateriels vient de la noter dans gDerniereErreur)
        MaterielsDuPorteur = "#ERR " & gDerniereErreur
        Exit Function
    End If
    If coll Is Nothing Then
        ' l'appel a marché mais SEE n'a rien rendu (rien d'associé ?) : ce n'est pas une erreur
        MaterielsDuPorteur = "(aucun : Nothing)"
        Exit Function
    End If
    nouveau = True
    If porteur = "connecteur" Then
        ' un repère illisible ne réunit pas deux connecteurs : chacun garde sa ligne
        cle = repere
        If Left$(repere, 4) = "#ERR" Or Len(repere) = 0 Then cle = repere & "|" & n
        nouveau = Not mPorteursVus.Exists(cle)
        If nouveau Then mPorteursVus.Add cle, n
    End If
    For Each e In ElementsDe(coll)
        classe = LireProp(e, "Class")
        code = LireProp(e, "Code")
        qte = LireProp(e, "Quantity")
        If Len(s) > 0 Then s = s & " ; "
        s = s & classe & " / " & code & " / " & qte
        If nouveau Then mLignesMateriel.Add Array(n, porteur, repere, classe, code, qte)
    Next e
    MaterielsDuPorteur = s
End Function

' Pour TesterSEE : le matériel lu sur le folio (la section qui vient d'être
' écrite), compté par classe.
Private Sub CompterMaterielsDuFolio()
    Dim r As Variant, classe As String, k As Long
    Set mClasses = NouveauDicoExact()
    mNbMateriels = mLignesMateriel.Count
    For Each r In mLignesMateriel
        classe = CStr(r(3))
        k = 0
        If mClasses.Exists(classe) Then k = EnLong(mClasses.Item(classe), 0)
        mClasses.Item(classe) = k + 1
    Next r
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
'  Chaque XML est écrit dans un fichier à côté du classeur, et AUSSI dans la
'  feuille Sonde_XML, en morceaux de 30 000 caractères (une cellule chacun,
'  dans l'ordre) : le classeur garde tout.
' ============================================================================
Public Sub SondeMethodes()
    Dim env As Object, types As Variant, noms As Variant, i As Long, v As Variant, texte As String
    Dim fichier As String, ok As Boolean, dossier As String, wsX As Object, ligneX As Long, avant As Long, ouX As String
    Const TITRE_SONDE As String = "SondeMethodes"
    mNbXML = 0
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
    Set wsX = FeuilleCreee(FEUILLE_XML, True)
    EcrireLigne wsX, 1, Array("Type", "Nom", "Morceau", "Morceaux", "XML (" & TAILLE_MORCEAU & " caractères au plus par cellule : " & _
        "recoller les morceaux dans l'ordre)")
    wsX.Rows(1).Font.Bold = True
    ligneX = 1
    Ecrire Array("Dossier", "", "", dossier)
    Entetes Array("Type", "Nom", "Rendu", "Fichier", "Taille (caractères)", "Feuille Sonde_XML", "Début du XML")
    For i = LBound(types) To UBound(types)
        Contexte "SondeMethodes", CStr(noms(i))
        texte = ""
        fichier = ""
        ouX = ""
        If SEE_MethodesXML(env, CLng(types(i)), v) Then
            texte = TexteXML(v)
            If Len(texte) > 0 Then
                fichier = dossier & "\SEE_Methodes_" & types(i) & "_" & noms(i) & ".xml"
                ok = EcrireFichierTexte(fichier, texte)
                If Not ok Then fichier = "#ERR écriture : " & fichier
                avant = ligneX
                ligneX = EcrireMorceaux(wsX, ligneX, CLng(types(i)), CStr(noms(i)), texte)
                ouX = "lignes " & (avant + 1) & " à " & ligneX
                mNbXML = mNbXML + 1
            End If
            Ecrire Array(types(i), noms(i), TypeName(v), fichier, Len(texte), ouX, _
                Left$(Replace(Replace(texte, vbCr, " "), vbLf, " "), 300))
        Else
            Ecrire Array(types(i), noms(i), "#ERR " & gDerniereErreur)
        End If
    Next i
    wsX.Columns(5).ColumnWidth = 100
Fin:
    FinSonde TITRE_SONDE
End Sub

' Un texte en morceaux de TAILLE_MORCEAU caractères, une ligne par morceau,
' à partir de la ligne qui suit « ligne » ; rend la dernière ligne écrite.
Private Function EcrireMorceaux(ByVal ws As Object, ByVal ligne As Long, ByVal typeMethode As Long, ByVal nom As String, _
        ByVal texte As String) As Long
    Dim nb As Long, k As Long
    nb = (Len(texte) + TAILLE_MORCEAU - 1) \ TAILLE_MORCEAU
    For k = 1 To nb
        ligne = ligne + 1
        EcrireLigne ws, ligne, Array(typeMethode, nom, k, nb, Mid$(texte, (k - 1) * TAILLE_MORCEAU + 1, TAILLE_MORCEAU))
    Next k
    EcrireMorceaux = ligne
End Function

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
    ' pas une panne (pas d'Err.Number : « Ce qui a échoué » ne le compte pas) : les XML sont aussi dans la feuille Sonde_XML
    Journal gEtape, "fichiers", "", raison & " : les fichiers sont écrits dans " & p & " (et les XML dans la feuille Sonde_XML)"
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
