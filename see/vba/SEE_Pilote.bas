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
'    EssaiDessinReel LE BOUTON 2 DU CLASSEUR (« 2. SEE DESSINE ») : le même
'                    essai POUR DE VRAI, quel que soit le réglage Simulation,
'                    après UNE question qui nomme le projet ouvert dans SEE ;
'                    puis le folio dessiné est relu (RelireFolio, Sonde_Folio).
'                    Il REJOINT la fenêtre SEE ouverte et n'en démarre jamais
'    EssaiSansFenetre LE BOUTON 3 DU CLASSEUR (« 3. SEE FERMÉ ») : quand la
'                    fenêtre SEE ne se laisse pas rejoindre, SEE FERMÉ, Excel
'                    ouvre lui-même le projet d'essai (coclasse SeeAutomation),
'                    y dessine le même folio d'essai, l'enregistre, relève les
'                    formes de l'album (Sonde_Symboles, en lecture) et le
'                    referme (voir son en-tête). Le seul endroit qui ferme un
'                    SEE : le sien
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
'  LE MATERIEL (le « device » associé) : le corps d'un bloc posé en symbole
'  reçoit le PN de la feuille Blocs (classe <NATURE>.ClasseMateriel), chaque
'  connecteur d'un bloc en mode BROCHE le PN de la feuille Connecteurs (classe
'  <NATURE>.ClasseConnecteur). D'abord, ce que le porteur porte DÉJÀ est lu
'  (GetEquipmentCollection) et journalisé, en simulation aussi : déjà ce
'  matériel, rien n'est écrit ; d'autres matériels, le réglage
'  MaterielExistant décide (GARDER par défaut : rien n'est écrit). Puis
'  CreateObject(matériel), Class, Code, Quantity, une collection,
'  SetEquipmentCollection (même signature en V5 et en V4), puis relecture :
'  compté seulement s'il est relu (même Class, même Code). Classe vide :
'  rien. PN vide : rien, et le journal le dit. Refus de SEE : journalisé, le
'  folio continue.
'
'  Ce qui n'est PAS établi sur SEE (et se règle, se journalise) : l'ordre des
'  appels pour créer un folio et un symbole, la sémantique de SetManual, la
'  chaîne de AddWireConnection, l'ancre de position d'un texte, les classes
'  de matériel du catalogue et le moment où SEE accepte l'association (le
'  pilote l'essaie une fois le symbole ou le connecteur posé).
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
Private mMaterielsCon As Object ' repère du connecteur -> PN déjà associé dans cette exécution (une fois par connecteur)
Private mConnecteursRepris As Object ' repère -> Vrai : connecteur trouvé dans le projet (pas créé par cette exécution)
Private mPolitiqueMateriel As String ' le réglage MaterielExistant lu (GARDER, AJOUTER, REMPLACER) ; "" : pas encore lu
Private mBouton2 As Boolean     ' EssaiDessinReel en cours : la boîte de fin dit quoi faire
Private mBouton3 As Boolean     ' EssaiSansFenetre en cours : pas de pas à pas (SEE est caché)
Private mNbPoses As Long        ' objets graphiques que SEE a acceptés (AddGraphicObject sans erreur)
Private mFolioCree As Boolean   ' un folio a été créé dans SEE (AddSheet sans erreur)
Private mEtapes3(1 To 9) As String ' le bouton 3 : ce que chaque étape a donné (le bloc « À PHOTOGRAPHIER »)
Private mConsigne3 As String    ' le bouton 3 : ce que le technicien doit faire ensuite
Private mNotreSEE As Boolean    ' le bouton 3 a créé gApp, SEE fermé : lui seul le ferme (FermerNotreSEE)
Private mFermeDit As Integer    ' le bouton 3, étape 1 : 0 Windows a dit SEE fermé ; 2 le technicien l'a dit (Windows muet) ; -1 non
Private mFolioRelu As Boolean   ' le bouton 3 a relu son folio dans Sonde_Folio (la photo à demander)
Private mNomEnv3 As String      ' le bouton 3 : l'environnement du projet ouvert (Project.EnvironmentName), tel que lu
Private mFormesRelevees As Boolean ' le bouton 3 a relevé les formes de l'album dans Sonde_Symboles (la photo à demander)
Private mConnecte3 As Boolean   ' le bouton 3 a connecté SEE (SeeAutomation.Login) : Logout à la fermeture
Private mEnvProjet3 As Object   ' le bouton 3 : l'environnement attaché au projet (OpenEnvironmentForProject), refermé avant CloseProject
Private mDiagWs As Object       ' le diagnostic complet du bouton 3 : la feuille Diagnostic
Private mDiagLigne As Long
Private mDiagOK As Long
Private mDiagKO As Long
' la batterie d'essais du bouton 3 (BatterieSEE)
Private Const BAT_TETE As Long = 11 ' la ligne d'en-tête du tableau de la feuille Batterie (le résumé est au-dessus)
Private Const BAT_VERSION As String = "6c" ' dite en haut de la feuille Batterie : les photos disent quelle batterie a tourné
Private Const BAT_SAUTE As String = "Batterie-essais-a-sauter.txt"
Private Const BAT_ENCOURS As String = "Batterie-essai-en-cours.txt"
Private mBatWs As Object        ' la feuille Batterie
Private mBatLigne As Long
Private mBatOK As Long
Private mBatKO As Long
Private mBatEcrits As String    ' les essais d'écriture que SEE a acceptés
Private mBatVus As String       ' les essais d'écriture dont l'effet est relu (l'état a changé)
Private mBatMort As Boolean     ' SEE ne répond plus : la batterie s'arrête
Private mBatTombe As String     ' l'essai où SEE est tombé
Private mBatPendant As Boolean  ' SEE est tombé PENDANT l'essai mBatTombe (Faux : il était déjà parti avant l'appel)
Private mBatAjoute As String    ' ce que cette batterie ajoute aux essais à sauter
Private mBatSautes As String    ' les essais sautés par cette batterie
Private mBatCourant As String   ' le dernier essai risqué commencé (BatPermis)
Private mBatAvant As String     ' celui d'avant (SEE peut tomber juste après un essai, et l'erreur ne paraître qu'au suivant)
Private mBatSaute As String     ' les essais à sauter (SEE y était tombé ou bloqué)
Private mBatRacine As String    ' le dossier du projet d'essai (avec sa barre finale)
Private mBatDossier As String   ' le dossier des fichiers de la batterie, à côté du projet
Private mBatFaite As Boolean    ' la batterie a tourné (le bloc de fin en parle)
Private mBatSauve As Boolean    ' Project.Save a marché
Private mBatSansGraine As Boolean ' aucun folio du projet n'a de symbole
Private mBatTypeFil As String   ' SignalType du premier segment de la graine
Private mBatTypeCable As String ' Type du premier câble du projet
Private mBatFamCable As String  ' Family du premier câble du projet
Private mBatFromTo As String    ' la liste « de - vers » lue (GetFromToXML)
Private mBatNoms As String      ' les noms lus dans les méthodes XML de l'environnement (types de câbles), séparés par |
Private mBatPrj As Object
Private mBatEnv As Object
Private mBatGraine As Object    ' le folio dessiné à la main (le plus de symboles)
Private mBatCible As Object     ' un autre folio (le plus vide), sinon la graine
Private mBatSym1 As Object
Private mBatSym2 As Object
Private mBatTexte As Object
Private mBatSeg As Object
Private mBatP1 As Object
Private mBatP2 As Object
Private mBatP3 As Object
Private mBatColl As Object      ' une collection de SEE qui tient P1 et P2
Private mBatBloc As Object      ' un bloc de l'environnement

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
Private mNbMateriels As Long    ' matériels associés et relus, ou déjà là (en simulation : qui le seraient)

' ============================================================================
'  LES MACROS
' ============================================================================

' Un folio d'essai en objets graphiques seulement.
Public Sub EssaiDessin()
    On Error GoTo Plantage
    If Not Preparer("EssaiDessin") Then GoTo Fin
    If Not OuvrirFolioEssai() Then GoTo Fin
    DessinerMotifEssai
Fin:
    Terminer "EssaiDessin"
    Exit Sub
Plantage:
    Journal gEtape, gObjet, "(macro)", "ARRÊT IMPRÉVU", Err.Number, Err.Description
    Resume Fin
End Sub

' LE BOUTON 2 DU CLASSEUR (« 2. SEE DESSINE ») : l'essai de dessin POUR DE
' VRAI, quel que soit le réglage Simulation (pour cet essai seulement : la
' feuille Reglages n'est pas changée), après UNE question qui nomme le projet
' ouvert dans SEE et le folio qui sera créé (OK : dessiner ; Annuler, le
' bouton par défaut : rien n'est écrit). Puis le folio dessiné est relu
' (RelireFolio, feuille Sonde_Folio) : les positions que SEE a gardées disent
' l'origine, le sens de y et l'échelle, sans rien mesurer à la main.
' Il ne démarre JAMAIS SEE (quel que soit le réglage LancerSEE) : une
' connexion qu'Excel avait CRÉÉE est lâchée au début (LacherConnexionCreee) ;
' sans fenêtre SEE rejointe, la boîte de fin dit quoi faire (le bouton 3).
' Il n'ouvre JAMAIS de projet (le réglage Projet, que le bouton 3 remplit,
' n'est pas utilisé) : il prend celui qui est ouvert dans SEE, que la question
' nomme ; le sous-groupe du réglage Groupe n'est cherché (et créé) qu'après OK.
' Le technicien ne renvoie que des photos : la fin dit lesquelles.
Public Sub EssaiDessinReel()
    Dim nomProjet As String, nomFolio As String
    On Error GoTo Plantage
    mMessageFin = ""
    mCoordProvisoires = False
    ' les feuilles Reglages et Journal, si le bouton 1 n'a pas encore tourné (sans sa boîte : elle va au journal ;
    ' gSansDialogue reprend sa valeur même sur une erreur)
    InitialiserSansBoite
    OuvrirJournal "EssaiDessinReel"
    gSimulation = False
    Journal "EssaiDessinReel", "", "", "bouton 2 : dessin POUR DE VRAI (Simulation = N pour cet essai seulement ; " & _
        "la feuille Reglages n'est pas changée)"
    ' le bouton 2 ne garde que la fenêtre SEE rejointe : un objet SEE créé par Excel est lâché
    LacherConnexionCreee
    Set gPaquet = Nothing
    Set gEntete = Nothing
    mBouton2 = True
    If Not PreparerSEE(False) Then
        If gApp Is Nothing Then
            AjouterMessageFin "Rien n'a été dessiné : Excel n'a pas trouvé ta fenêtre SEE (ce bouton n'en démarre jamais)." & vbCrLf & _
                CONSIGNE_BOUTON3
        ElseIf gEstAutomation Then
            AjouterMessageFin "Rien n'a été dessiné : SEE répond par sa partie « SeeAutomation », qui ne lit pas le projet ouvert." & _
                vbCrLf & CONSIGNE_BOUTON3
            ' le bouton 3 veut SEE fermé : tant qu'Excel tient cet objet, File > Exit ne ferait que cacher SEE
            LacherConnexion "le bouton 2 envoie au bouton 3 (SEE fermé)"
        ElseIf Len(mMessageFin) = 0 Then
            AjouterMessageFin "Rien n'a été dessiné : en bas d'Excel, clique sur l'onglet « Journal », prends une photo de son haut " & _
                "et envoie-la-moi."
        End If
        GoTo Fin
    End If
    nomProjet = LireProp(mPrj, "Name")
    nomFolio = Reglage("FolioEssai", FOLIO_ESSAI_DEFAUT)
    Contexte "EssaiDessinReel", nomProjet
    If Dialogue("Excel va DESSINER dans le projet ouvert dans SEE : « " & nomProjet & " »." & vbCrLf & _
            "Il va créer le folio « " & nomFolio & " » et y tracer un cadre, un trait en biais, un rectangle et des textes." & _
            vbCrLf & vbCrLf & "Est-ce bien ton projet d'essai, et pas un vrai projet ?" & vbCrLf & _
            "OK : dessiner ; Annuler : ne rien faire.", vbOKCancel + vbQuestion + vbDefaultButton2, "Pilote SEE") <> vbOK Then
        Journal gEtape, gObjet, "", "arrêté avant tout dessin (réponse Annuler) : rien n'est écrit dans SEE"
        AjouterMessageFin "Rien n'a été dessiné. Ouvre ton projet d'essai dans SEE, puis reclique sur le bouton bleu 2 (" & OU_BOUTONS & ")."
        GoTo Fin
    End If
    ' le groupe APRÈS la réponse OK : le sous-groupe du réglage Groupe peut être créé
    Set mGrp = GroupeCible()
    If mGrp Is Nothing Then
        AjouterMessageFin "Rien n'a été dessiné : le groupe du projet est introuvable (réglage Groupe). En bas d'Excel, clique sur " & _
            "l'onglet « Journal », prends une photo de son haut et envoie-la-moi."
        GoTo Fin
    End If
    If Not OuvrirFolioEssai() Then
        If mArret Then
            AjouterMessageFin "Rien n'a été dessiné : tu as répondu Annuler à la question sur le folio « " & nomFolio & " »." & vbCrLf & _
                "Reclique sur le bouton bleu 2 (" & OU_BOUTONS & ") et réponds Oui : le folio est refait à neuf."
        Else
            AjouterMessageFin "Le folio « " & nomFolio & " » n'a pas pu être ouvert ni créé : en bas d'Excel, clique sur l'onglet " & _
                "« Journal », prends une photo de son haut et envoie-la-moi."
        End If
        GoTo Fin
    End If
    If Not DessinerMotifEssai() Then GoTo Fin
    If Not mSh Is Nothing Then RelireFolio mSh
    AjouterMessageFin "Regarde dans SEE le folio « " & nomFolio & " » (double-clic sur son nom dans l'arbre du projet) : " & _
        "un grand cadre, un trait en biais parti du coin en haut à gauche, un rectangle et des textes." & vbCrLf & _
        "1. Prends une photo de l'écran de SEE, même si le dessin n'est pas à sa place." & vbCrLf & _
        "2. Dans Excel, en bas, clique sur l'onglet « Sonde_Folio » et prends une photo de son haut." & vbCrLf & _
        "3. Envoie-moi les photos."
Fin:
    mBouton2 = False
    Terminer "L'essai de dessin"
    ' le réglage Simulation reprend sa valeur pour les macros suivantes
    ChargerReglages
    Exit Sub
Plantage:
    Journal gEtape, gObjet, "(macro)", "ARRÊT IMPRÉVU", Err.Number, Err.Description
    Resume Fin
End Sub

' Le motif de l'essai, sur le folio ouvert par OuvrirFolioEssai, en objets
' graphiques seulement : le cadre de la feuille aux coins de la zone, une
' diagonale, des textes, un rectangle de 100 x 50 mm. Faux si le pas à pas a
' été arrêté.
Private Function DessinerMotifEssai() As Boolean
    Dim fl As Double, fh As Double
    DessinerMotifEssai = False
    fl = 420
    fh = 297
    Contexte "EssaiDessin", Reglage("FolioEssai", FOLIO_ESSAI_DEFAUT)
    Journal gEtape, gObjet, "", "attendu : le cadre de la feuille de l'Atelier (0,0)-(420,297) sur la zone ; une diagonale " & _
        "partant du coin HAUT GAUCHE ; un rectangle de 100 x 50 mm à (100, 50) ; des textes qui disent où ils sont"
    DessinerRectangle 0, 0, fl, fh, "cadre de la feuille (420 x 297)"
    If Not Pause("Le cadre (0,0)-(420,297) est posé. Il doit couvrir la zone de travail du cartouche.") Then Exit Function
    DessinerLigne 0, 0, 100, 50, "diagonale depuis le coin haut gauche"
    If Not Pause("La diagonale part du coin HAUT GAUCHE vers le bas à droite. Si elle part d'en bas : SensY = -1 (ou OrigineY).") Then Exit Function
    DessinerTexte "HAUT GAUCHE (10 ; 10)", 10, 10, 0, "texte en haut à gauche"
    DessinerTexte "BAS DROITE (380 ; 287)", 380, 287, 0, "texte en bas à droite"
    If Not Pause("Deux textes : HAUT GAUCHE et BAS DROITE. Sont-ils à leur place ?") Then Exit Function
    DessinerRectangle 100, 50, 200, 100, "rectangle 100 x 50 mm"
    DessinerTexte "x=100 y=50 : rectangle 100 x 50", 150, 45, 0, "légende du rectangle"
    DessinerTexte "vertical (angle 90)", 60, 150, 90, "texte vertical"
    MettreAJourFolio
    Pause "Le rectangle de 100 x 50 mm est posé : mesure-le dans SEE pour vérifier l'échelle."
    DessinerMotifEssai = True
End Function

' ============================================================================
'  LE BOUTON 3 DU CLASSEUR (« 3. SEE FERMÉ ») : EssaiSansFenetre.
'  Quand la fenêtre SEE ne se laisse pas rejoindre (bouton 1), SEE FERMÉ,
'  Excel ouvre LUI-MÊME le projet d'essai par la coclasse SeeAutomation, y
'  dessine le folio d'essai du bouton 2, l'enregistre et le referme. C'est
'  aussi la voie des 800 plans. Dans l'ordre, chaque étape au journal :
'    1. SEE DOIT ÊTRE FERMÉ : aucun programme SEE en marche, d'après Windows
'       (SEEEnMarche : WMI ; le nom du programme vient du registre,
'       LocalServer32, sinon SEE.exe). Un serveur COM « multi-use » donnerait
'       sinon un objet DANS le SEE du technicien, et on y ouvrirait un autre
'       projet. SEE en marche : on s'arrête. Windows muet : une question
'       (Annuler par défaut ; sans boîte, on s'arrête).
'    2. LE PROJET D'ESSAI : la fenêtre « Ouvrir » (ChoisirFichier, partie du
'       réglage Projet), puis une question qui le nomme (Annuler par défaut) ;
'       il est noté dans le réglage Projet. Sous gSansDialogue : le réglage
'       Projet suffit.
'    3. UNE COPIE DE SÉCURITÉ : <nom>.avant-pilote-<aaaammjj-hhmmss>.seeprj,
'       dans le même dossier. Ratée : on s'arrête, rien n'est ouvert.
'    4. L'OBJET SEE CRÉÉ : GetObject("new:{CLSID}") des CLSID de
'       CLSID_Automation ; Visible = True essayé (une fenêtre visible
'       montrerait un dialogue de SEE au lieu de bloquer Excel) ; la version.
'       JAMAIS Login.
'    5. LE PROJET OUVERT : OpenProject (V4 : paramètre de sortie), son nom et
'       celui de son environnement (EnvironmentName) lus.
'    6. LE DESSIN : OuvrirFolioEssai et DessinerMotifEssai du bouton 2, sans
'       pas à pas ; les formes du CreateObject de SeeAutomation sont essayées
'       (NouvelObjet : d'abord type, projet, objet en sortie), la première qui
'       rend un objet est retenue ; le folio est relu (Sonde_Folio).
'    7. L'ENREGISTREMENT : Project.Save, seulement si quelque chose a été dessiné.
'    8. LE RELEVÉ DES FORMES (ReleverFormes), en LECTURE SEULE : l'environnement
'       du projet ouvert par OpenEnvironment, ses familles et ses formes dans
'       Sonde_Symboles, puis CloseEnvironment. Il n'empêche jamais l'étape 9.
'    9. LA FERMETURE (FermerNotreSEE) : CloseProject(le projet), sinon Close
'       du projet, puis Quit, chacun essayé et dit ; les objets lâchés ;
'       Windows revu quelques secondes : un SEE qui reste est dit, avec la
'       manière de l'arrêter. L'instance fermée est la NÔTRE : SEE était fermé
'       à l'étape 1.
'  Avant tout, il LÂCHE toute connexion gardée (rejointe aussi : tant qu'Excel
'  tient un objet de SEE, SEE.exe ne s'arrête pas) ; et Windows est revu juste
'  avant la création (étape 4) : SEE a pu être rouvert pendant le choix du
'  projet. Pendant le travail, un bloc « EN COURS » est devant le technicien.
'  Puis le bloc « À PHOTOGRAPHIER » en tête de Resultat_Test : chaque étape et
'  son résultat (la forme de CreateObject retenue, en clair ; les familles et
'  les formes relevées), la copie de sécurité, et la consigne. Il n'écrit que dans le
'  fichier choisi et confirmé, et ne tourne jamais si SEE est ouvert.
'  Si SEE caché ouvre une fenêtre, Excel attend (« Microsoft Excel attend
'  qu'une autre application termine une action OLE ») : le mode d'emploi dit
'  quoi faire (Ctrl+Maj+Échap, SEE, Fin de tâche) ; l'appel en cours échoue
'  alors, et le journal le dit.
' ============================================================================
Public Sub EssaiSansFenetre()
    Dim chemin As String, copie As String, prj As Object, imprevu As String
    Dim nomFolio As String, i As Long
    On Error GoTo Plantage
    mNotreSEE = False
    mFermeDit = -1
    mFolioRelu = False
    mNomEnv3 = ""
    mFormesRelevees = False
    mConnecte3 = False
    Set mEnvProjet3 = Nothing
    mBatFaite = False
    mMessageFin = ""
    mConsigne3 = ""
    For i = 1 To 9
        mEtapes3(i) = "pas fait"
    Next i
    ' les feuilles Reglages et Journal, si le bouton 1 n'a pas encore tourné (sans sa boîte : elle va au journal ;
    ' gSansDialogue reprend sa valeur même sur une erreur)
    InitialiserSansBoite
    OuvrirJournal "EssaiSansFenetre"
    gSimulation = False
    Journal "EssaiSansFenetre", "", "", "bouton 3 : SEE fermé, Excel ouvre lui-même le projet d'essai et y dessine POUR DE VRAI " & _
        "(Simulation = N pour cet essai seulement ; la feuille Reglages n'est pas changée)"
    BlocEnCours3
    ' TOUTE connexion gardée est lâchée, créée OU rejointe (par les boutons 1 et 2) : tant qu'Excel tient un objet de
    ' SEE, SEE.exe ne s'arrête pas (File > Exit ne fait que cacher sa fenêtre), et l'étape 1 le verrait en marche
    LacherConnexion "le bouton 3 veut SEE fermé"
    Set gPaquet = Nothing
    Set gEntete = Nothing
    RemettreEtat
    mBouton3 = True
    nomFolio = Reglage("FolioEssai", FOLIO_ESSAI_DEFAUT)
    ' 1. SEE doit être fermé
    If Not SEEFerme() Then GoTo Fin
    ' 2. le projet d'essai
    chemin = ProjetDEssaiChoisi(nomFolio)
    If Len(chemin) = 0 Then GoTo Fin
    ' 3. la copie de sécurité
    copie = CopieDeSecurite(chemin)
    If Len(copie) = 0 Then GoTo Fin
    ' 4. l'objet SEE, créé
    If Not CreerNotreSEE() Then GoTo Fin
    ' 4 bis. la connexion à SEE ACCESS CONTROL (le nom donné par le technicien ; le mot de passe n'est jamais gardé)
    ConnecterASEE
    ' 5. le projet, ouvert
    Set prj = OuvrirProjetDEssai(chemin)
    If prj Is Nothing Then GoTo Fermer
    ' 5 bis. le projet protégé ? l'environnement attaché au projet (OpenEnvironmentForProject), avant de créer
    PreparerProjet3 prj, chemin
    ' 5 ter. l'ancien diagnostic complet (feuille Diagnostic), seulement si le réglage le demande
    If ReglageOui("DiagnosticComplet", "N") Then DiagnosticComplet prj, chemin
    ' 6 à 8. la batterie d'essais (feuille Batterie) : écrire et dessiner sans CreateObject, puis Project.Save ;
    ' elle remplace l'ancien essai de dessin (réglage Batterie = N pour le refaire)
    If ReglageOui("Batterie", "O") Then
        BatterieSEE prj, chemin
        GoTo Fermer
    End If
    ' 6. le dessin
    DessinerSansFenetre prj, nomFolio
    ' 7. l'enregistrement
    EnregistrerSansFenetre
    ' 8. le relevé des formes de l'album, en lecture seule (aucune erreur n'en sort : l'étape 9 suit toujours)
    ReleverFormes
Fermer:
    ' 9. la fermeture : l'instance créée à l'étape 4, et elle seule
    If mNotreSEE Then FermerNotreSEE prj
    Set prj = Nothing
Fin:
    On Error Resume Next
    mBouton3 = False
    FinirBouton3 copie, nomFolio, imprevu
    ' le réglage Simulation reprend sa valeur pour les macros suivantes
    ChargerReglages
    Exit Sub
Plantage:
    If Len(imprevu) > 0 Then Resume Fin
    imprevu = Err.Number & " " & Err.Description
    Journal gEtape, gObjet, "(macro)", "ARRÊT IMPRÉVU", Err.Number, Err.Description
    Resume Fermer
End Sub

' Le titre de chaque étape du bouton 3, pour le bloc à photographier.
Private Function TitreEtape3(ByVal i As Long) As String
    TitreEtape3 = Choose(i, "1. SEE fermé ?", "2. Projet d'essai", "3. Copie", "4. SEE créé", "5. Projet ouvert", "6. Dessin", _
        "7. Enregistré", "8. Formes", "9. SEE refermé")
End Function

' L'étape en cours, dans la barre d'état d'Excel et dans le bloc « EN COURS »
' (SEE est caché : le technicien attend).
Private Sub EnCours3(ByVal i As Long)
    Dim ws As Object
    On Error Resume Next
    Application.StatusBar = "Pilote SEE, bouton 3 : " & TitreEtape3(i) & " (attends, ne touche à rien)"
    Set ws = FeuilleExistante(FEUILLE_RESULTAT)
    If Not ws Is Nothing Then
        If CStr(ws.Cells(2, 1).Value) = "En cours" Then ws.Cells(2, 2).Value = "'" & TitreEtape3(i) & " (attends, ne touche à rien)"
    End If
End Sub

' Le bloc PROVISOIRE de Resultat_Test, au début du bouton 3 : il dit que le
' bouton travaille (EnCours3 y met l'étape) et, si la macro est arrêtée avant
' la fin (par Windows, ou Excel fermé de force), quoi photographier. Le bloc
' final (FinirBouton3) le remplace.
Private Sub BlocEnCours3()
    Dim ws As Object, l As Long
    On Error Resume Next
    Set ws = FeuilleEnTete(FEUILLE_RESULTAT)
    l = 0
    LigneResultat ws, l, "À PHOTOGRAPHIER", "Bouton 3 du " & Format$(Now, "yyyy-mm-dd hh:mm") & ", EN COURS : attends le message de fin."
    LigneResultat ws, l, "En cours", "début (attends, ne touche à rien)"
    LigneResultat ws, l, "Et maintenant", "Si tu lis encore ceci alors qu'Excel ne travaille plus, le bouton 3 a été arrêté avant la fin. " & _
        "Prends en photo cette partie jaune ET le message de Windows s'il y en a un (par exemple « Sécurité Windows »), et envoie-les-moi."
    SurlignerPhoto ws, l
    MontrerFeuille ws
End Sub

' Où est le bouton 3, pour une consigne (après un bouton, la feuille devant le
' technicien n'a pas de bouton).
Private Function Bouton3Ici() As String
    Bouton3Ici = "le bouton orange « 3. SEE FERMÉ » (" & OU_BOUTONS & ")"
End Function

' Comment arrêter un SEE caché (sans fenêtre). Le Gestionnaire des tâches de
' Windows 10 s'ouvre souvent en petit (« Moins de détails ») : il ne montre
' alors que les programmes qui ont une fenêtre. Un SEE caché est plus bas,
' sous « Processus en arrière-plan », ou dans l'onglet « Détails » sous le nom
' de son programme (le registre le dit : ProgrammesSEE).
Private Function ConsigneFinDeTache() As String
    Dim noms As String, p As Variant
    For Each p In ProgrammesSEE()
        noms = noms & IIf(Len(noms) > 0, " ou ", "") & CStr(p)
    Next p
    ConsigneFinDeTache = "Pour arrêter SEE caché : 1. Appuie ensemble sur Ctrl + Maj + Échap (le Gestionnaire des tâches). " & _
        "2. Si la fenêtre est petite, clique en bas sur « Plus de détails ». 3. Descends jusqu'à « Processus en arrière-plan » et " & _
        "clique sur SEE (ou, dans l'onglet « Détails » : " & noms & "). 4. Clique sur « Fin de tâche ». Ne termine PAS Excel. " & _
        "Si tu ne trouves pas SEE : enregistre et ferme Excel, puis redémarre l'ordinateur."
End Function

' Ce qu'une étape a donné : au journal, et pour le bloc à photographier.
Private Sub NoterEtape3(ByVal i As Long, ByVal texte As String)
    mEtapes3(i) = texte
    Journal "Bouton 3", TitreEtape3(i), "", Replace(texte, vbLf, " / ")
End Sub

' 1. Vrai si aucun programme SEE ne tourne (ou si le technicien le dit, quand
' Windows ne répond pas). Un SEE qu'on vient de fermer (File > Exit), ou que
' tenait la connexion lâchée au début, met quelques secondes à s'arrêter :
' Windows est revu cinq fois, à deux secondes d'écart, avant de refuser.
Private Function SEEFerme() As Boolean
    Dim nb As Long, detail As String, etat As Integer, i As Long
    Contexte "Bouton 3", "SEE fermé ?"
    EnCours3 1
    etat = SEEEnMarche(nb, detail)
    For i = 1 To 5
        If etat <> 1 Then Exit For
        Patienter 2
        etat = SEEEnMarche(nb, detail)
    Next i
    If etat = 0 Then
        NoterEtape3 1, "oui : " & detail & " (d'après Windows)"
        mFermeDit = 0
        SEEFerme = True
    ElseIf etat = 1 Then
        NoterEtape3 1, "NON : " & detail & ", encore après 10 secondes ; rien n'a été fait"
        mConsigne3 = "SEE tourne encore : rien n'a été fait." & vbLf & _
            "1. Si tu vois SEE : enregistre et ferme-le (File > Exit), attends 10 secondes, puis reclique sur " & Bouton3Ici() & "." & vbLf & _
            "2. Si tu ne vois pas SEE : enregistre et ferme Excel, rouvre Pilote-SEE.xlsm, puis reclique sur le bouton 3." & vbLf & _
            "3. Si Excel dit encore NON : " & ConsigneFinDeTache() & " Puis reclique sur le bouton 3."
    ElseIf gSansDialogue Then
        NoterEtape3 1, "on ne sait pas : " & detail & " ; sans boîte, personne ne peut dire que SEE est fermé : rien n'a été fait"
        mConsigne3 = "Enregistre et ferme SEE (File > Exit), puis reclique sur " & Bouton3Ici() & "."
    ElseIf ConfirmerOK("Excel ne peut pas voir si SEE est ouvert (" & detail & ")." & vbCrLf & vbCrLf & _
            "SEE est-il bien fermé ?" & vbCrLf & "OK : oui, il est fermé ; Annuler : je vérifie d'abord.", "Pilote SEE - bouton 3") Then
        NoterEtape3 1, "on ne sait pas (" & detail & ") ; tu as répondu qu'il est fermé"
        mFermeDit = 2
        SEEFerme = True
    Else
        NoterEtape3 1, "on ne sait pas (" & detail & ") ; tu as répondu Annuler : rien n'a été fait"
        mConsigne3 = "Enregistre et ferme SEE (File > Exit), puis reclique sur " & Bouton3Ici() & "."
    End If
End Function

' 4, avant la création : SEE est-il TOUJOURS fermé ? Le technicien a pu le
' rouvrir pendant le choix du projet (la fenêtre « Ouvrir », la question, sans
' limite de temps) ; un serveur « multi-use » donnerait alors un objet DANS ce
' SEE, que l'étape 8 fermerait. Windows est donc revu juste avant le premier
' « new: ». Windows muet : la réponse du technicien à l'étape 1 tient ; sinon,
' la même règle qu'à l'étape 1 (sans boîte, rien n'est fait).
Private Function SEEToujoursFerme() As Boolean
    Dim nb As Long, detail As String, etat As Integer
    etat = SEEEnMarche(nb, detail)
    If etat = 0 Then
        Journal gEtape, gObjet, "WMI Win32_Process", "SEE toujours fermé, revu juste avant la création : " & detail
        SEEToujoursFerme = True
    ElseIf etat = 1 Then
        NoterEtape3 4, "NON : SEE a été ouvert pendant le choix du projet (" & detail & ") ; rien n'a été créé ni ouvert"
        mConsigne3 = "SEE a été ouvert pendant le bouton 3 : rien n'a été fait. Enregistre et ferme SEE (File > Exit), attends 10 " & _
            "secondes, puis reclique sur " & Bouton3Ici() & ". Ne rouvre pas SEE pendant le bouton 3 : Excel s'en charge."
    ElseIf mFermeDit = 2 Then
        Journal gEtape, gObjet, "WMI Win32_Process", "Windows ne répond toujours pas (" & detail & ") : ta réponse de l'étape 1 tient (SEE fermé)"
        SEEToujoursFerme = True
    ElseIf Not gSansDialogue Then
        If ConfirmerOK("Excel ne peut plus voir si SEE est ouvert (" & detail & ")." & vbCrLf & vbCrLf & _
                "SEE est-il toujours fermé ?" & vbCrLf & "OK : oui, il est fermé ; Annuler : ne rien faire.", "Pilote SEE - bouton 3") Then
            Journal gEtape, gObjet, "WMI Win32_Process", "Windows ne répond plus (" & detail & ") ; tu as répondu que SEE est fermé"
            SEEToujoursFerme = True
        Else
            NoterEtape3 4, "NON : Windows ne répond plus (" & detail & ") ; tu as répondu Annuler : rien n'a été créé"
            mConsigne3 = "Vérifie que SEE est fermé, puis reclique sur " & Bouton3Ici() & "."
        End If
    Else
        NoterEtape3 4, "NON : Windows ne répond plus (" & detail & ") ; sans boîte, personne ne peut dire que SEE est encore fermé : " & _
            "rien n'a été créé"
        mConsigne3 = "Vérifie que SEE est fermé, puis reclique sur " & Bouton3Ici() & "."
    End If
End Function

' 2. Le projet d'essai, choisi puis confirmé ; "" s'il n'y en a pas (rien
' n'est fait). Il est noté dans le réglage Projet.
Private Function ProjetDEssaiChoisi(ByVal nomFolio As String) As String
    Dim chemin As String, quoi As String
    Contexte "Bouton 3", "projet d'essai"
    EnCours3 2
    chemin = ChoisirFichier("Projet SEE (*.seeprj),*.seeprj", "Choisis ton projet d'ESSAI", Reglage("Projet", ""))
    If Len(chemin) = 0 Then
        NoterEtape3 2, IIf(gSansDialogue And Len(Reglage("Projet", "")) = 0, "aucun : le réglage Projet est vide", "aucun choisi (Annuler)") & _
            " ; rien n'a été fait"
        mConsigne3 = "Reclique sur " & Bouton3Ici() & " et choisis ton projet d'ESSAI (son fichier .seeprj)."
        Exit Function
    End If
    If LCase$(Right$(chemin, 7)) <> ".seeprj" Then
        NoterEtape3 2, NomDeFichier(chemin) & " : ce n'est pas un projet SEE (.seeprj) ; rien n'a été fait"
        mConsigne3 = "Reclique sur " & Bouton3Ici() & " et choisis ton projet d'ESSAI (son fichier .seeprj)."
        Exit Function
    End If
    ' une copie de sécurité d'un passage précédent est rangée à côté du projet : ce n'est pas lui
    If InStr(1, NomDeFichier(chemin), ".avant-pilote-", vbTextCompare) > 0 Then
        NoterEtape3 2, NomDeFichier(chemin) & " : c'est une copie de sécurité, pas ton projet ; rien n'a été fait"
        mConsigne3 = "Reclique sur " & Bouton3Ici() & " et choisis ton projet d'ESSAI : son nom ne contient pas « avant-pilote »."
        Exit Function
    End If
    If ReglageOui("Batterie", "O") Then
        quoi = "Excel va ouvrir ce projet, MODIFIER le folio que tu y as dessiné à la main (un texte, un symbole, un repère), y ajouter " & _
            "des objets et des folios, y importer une liste de fils d'essai, l'enregistrer et le refermer :"
    Else
        quoi = "Excel va ouvrir ce projet, y dessiner le folio « " & nomFolio & " », l'enregistrer et le refermer :"
    End If
    If Not ConfirmerOK(quoi & _
            vbCrLf & vbCrLf & NomDeFichier(chemin) & vbCrLf & "(dans le dossier « " & DossierDuFichier(chemin) & " »)" & vbCrLf & vbCrLf & _
            "C'est bien ton projet d'essai, pas un vrai projet ?" & vbCrLf & vbCrLf & _
            "Ensuite, SEE peut s'ouvrir tout seul pendant une minute : c'est Excel qui travaille. Ne le ferme pas et ne clique pas " & _
            "dedans : Excel le refermera. S'il te pose une question : prends-la en photo, puis clique sur Annuler (ou Non)." & vbCrLf & vbCrLf & _
            "OK : oui ; Annuler : ne rien faire.", "Pilote SEE - bouton 3") Then
        NoterEtape3 2, NomDeFichier(chemin) & " : tu as répondu Annuler ; rien n'a été fait"
        mConsigne3 = "Rien n'a été fait. Reclique sur " & Bouton3Ici() & " et choisis ton projet d'ESSAI."
        Exit Function
    End If
    If Not EcrireReglage("Projet", chemin) Then Journal gEtape, gObjet, "", "le réglage Projet n'a pas pu être noté"
    NoterEtape3 2, NomDeFichier(chemin) & " (dossier « " & DossierDuFichier(chemin) & " ») : confirmé"
    ProjetDEssaiChoisi = chemin
End Function

' 3. La copie de sécurité du projet, dans son dossier ; "" si elle a raté.
Private Function CopieDeSecurite(ByVal chemin As String) As String
    Dim copie As String, numErr As Long, descErr As String
    Contexte "Bouton 3", "copie de sécurité"
    EnCours3 3
    copie = Left$(chemin, Len(chemin) - Len(".seeprj")) & ".avant-pilote-" & Format$(Now, "yyyymmdd-hhmmss") & ".seeprj"
    On Error GoTo Echec
    FileCopy chemin, copie
    On Error GoTo 0
    Journal gEtape, gObjet, "FileCopy", "copie de sécurité : " & copie
    NoterEtape3 3, NomDeFichier(copie) & " (même dossier)"
    CopieDeSecurite = copie
    Exit Function
Echec:
    numErr = Err.Number
    descErr = Err.Description
    Journal gEtape, gObjet, "FileCopy", "copie de sécurité RATÉE : " & copie, numErr, descErr
    gNbErreurs = gNbErreurs + 1
    NoterEtape3 3, "RATÉE : " & ReponseDeWindows(numErr, descErr) & " ; rien n'a été ouvert"
    mConsigne3 = "Rien n'a été ouvert. Vérifie que SEE est fermé et que ton projet est bien là, puis reclique sur " & Bouton3Ici() & "."
    CopieDeSecurite = ""
End Function

' 4. L'objet SEE, créé par la coclasse SeeAutomation : Vrai s'il l'est (gApp).
' Windows est revu d'abord (SEEToujoursFerme) : rien n'est créé si SEE a été
' rouvert depuis l'étape 1.
Private Function CreerNotreSEE() As Boolean
    Dim p As Variant, clsid As String, o As Object, visible As String
    Contexte "Bouton 3", "SEE créé"
    EnCours3 4
    If Not SEEToujoursFerme() Then Exit Function
    Set gApp = Nothing
    gStrategie = ""
    gEstAutomation = False
    gVersionAPI = 0
    OublierEssais
    OublierCreation
    For Each p In Split(Reglage("CLSID_Automation", ""), ";")
        clsid = Trim$(CStr(p))
        If Len(clsid) > 0 Then
            If CreerParCLSID(clsid, o) Then
                Set gApp = o
                ' SEE était fermé (étape 1) : cet objet est le nôtre, l'étape 8 le fermera
                mNotreSEE = True
                gStrategie = "GetObject(""new:" & clsid & """)"
                gEstAutomation = True
                Exit For
            End If
        End If
    Next p
    If gApp Is Nothing Then
        NoterEtape3 4, "NON :" & vbLf & EssaisEnTexte()
        mConsigne3 = "Excel n'a pas pu créer SEE : envoie-moi la photo."
        Exit Function
    End If
    ' une fenêtre visible montrerait un dialogue de SEE au lieu de bloquer Excel
    visible = "ok"
    On Error Resume Next
    Err.Clear
    gApp.Visible = True
    If Err.Number <> 0 Then visible = ReponseDeWindows(Err.Number, Err.Description)
    Err.Clear
    On Error GoTo 0
    Journal gEtape, gObjet, "SeeAutomation.Visible = True", visible
    DeterminerVersion
    NoterEtape3 4, "oui, version " & gVersionLue & " (API V" & gVersionAPI & ") ; Visible : " & visible & vbLf & EssaisEnTexte()
    CreerNotreSEE = True
End Function

' 5. Le projet ouvert dans notre SEE (Nothing s'il ne l'est pas), et le nom
' de son environnement (EnvironmentName : le relevé des formes l'ouvre).
Private Function OuvrirProjetDEssai(ByVal chemin As String) As Object
    Dim prj As Object, numErr As Long, descErr As String, sortie As String
    Contexte "Bouton 3", "projet"
    EnCours3 5
    Set prj = SEE_OuvrirProjetAutomation(chemin, Reglage("MotDePasse", ""), numErr, descErr, sortie)
    If prj Is Nothing Then
        gNbErreurs = gNbErreurs + 1
        NoterEtape3 5, "NON : " & ReponseDeWindows(numErr, descErr) & IIf(Len(sortie) > 0, " (variable de sortie : " & sortie & ")", "")
        mConsigne3 = "SEE n'a pas ouvert ton projet : envoie-moi la photo."
        Exit Function
    End If
    mNomEnv3 = LirePropOuMethode(prj, "EnvironmentName")
    Journal gEtape, "projet", "Project.EnvironmentName", mNomEnv3
    NoterEtape3 5, "oui : « " & LireProp(prj, "Name") & " »" & IIf(Len(sortie) > 0, " (variable de sortie : " & sortie & ")", "") & _
        " ; environnement : " & IIf(Left$(mNomEnv3, 4) = "#ERR", "illisible (" & mNomEnv3 & ")", "« " & mNomEnv3 & " »")
    Set OuvrirProjetDEssai = prj
End Function

' 6. Le folio d'essai du bouton 2, dans le projet ouvert.
Private Sub DessinerSansFenetre(ByVal prj As Object, ByVal nomFolio As String)
    Set mPrj = prj
    ' SeeAutomation n'a pas de GetEnvironment (438 au bureau) : le cartouche vient du folio
    Set mEnv = Nothing
    Contexte "Bouton 3", "dessin"
    EnCours3 6
    Set mGrp = GroupeCible()
    If mGrp Is Nothing Then
        NoterEtape3 6, "rien dessiné : le groupe du projet est illisible (" & gDerniereErreur & ")"
        mConsigne3 = "Rien n'a été dessiné : envoie-moi la photo."
        Exit Sub
    End If
    If OuvrirFolioEssai() Then
        If DessinerMotifEssai() Then
            If Not mSh Is Nothing Then
                RelireFolio mSh
                mFolioRelu = True
            End If
        End If
    End If
    If mNbPoses > 0 Then
        NoterEtape3 6, "folio « " & nomFolio & " » : " & mNbPoses & " objet(s) dessiné(s) sur " & mNbGraphiques & " ; création d'objets : " & _
            CreationDObjets()
    ElseIf mFolioCree Then
        NoterEtape3 6, "folio « " & nomFolio & " » créé, mais vide ; création d'objets : " & CreationDObjets()
        mConsigne3 = "Le folio est vide : envoie-moi la photo."
    ElseIf mArret Then
        NoterEtape3 6, "rien dessiné : tu as répondu Annuler (le folio « " & nomFolio & " » existait déjà)"
        mConsigne3 = "Reclique sur " & Bouton3Ici() & " et réponds Oui à la question sur le folio « " & nomFolio & " » : il est refait à neuf."
    Else
        NoterEtape3 6, "rien dessiné : projet ouvert : oui ; création d'objets : " & CreationDObjets() & ExplicationRefus() & _
            SondeSiPermise(prj)
        mConsigne3 = "Rien n'a été dessiné : envoie-moi la photo, c'est ce que je dois savoir."
    End If
End Sub

' ============================================================================
'  LE DIAGNOSTIC COMPLET (bouton 3) : une ligne par essai dans la feuille
'  Diagnostic (niveau, essai, OK ou le code, détail), pour savoir d'un coup ce
'  que SEE caché sait faire : 1 SEE, 2 lire le projet, 3 lire l'environnement,
'  4 écrire par les méthodes du projet, 5 créer des objets, 6 ce qui est
'  installé (outils d'import, générateur). Rien n'est enregistré ; les
'  sous-groupes d'essai sont supprimés si SEE le permet. Aucune erreur n'en
'  sort.
' ============================================================================
Private Sub DiagnosticComplet(ByVal prj As Object, ByVal chemin As String)
    Dim g As Object, c As Object, sg As Object, x As Object, env As Object, envOuvert As Boolean, fam As Object, tb As Object, pt As Object
    Dim sh As Object, s As String, numErr As Long, descErr As String, forme As String, refus As String, v As Variant, nb As Long
    Dim nomDiag As String, rien As Object, nouveau As Object, sh01 As Object, i As Long
    If gSimulation Then Exit Sub
    On Error Resume Next
    Contexte "Bouton 3", "diagnostic"
    Set mDiagWs = FeuilleCreee("Diagnostic", True)
    mDiagLigne = 1
    mDiagOK = 0
    mDiagKO = 0
    EcrireLigne mDiagWs, 1, Array("Niveau", "Essai", "Résultat", "Détail")
    mDiagWs.Rows(1).Font.Bold = True
    ' --- 1. SEE
    DiagLire "1 SEE", gApp, "ApplicationName"
    DiagLire "1 SEE", gApp, "ApplicationVersion"
    DiagLire "1 SEE", gApp, "ProductVersion"
    DiagLire "1 SEE", gApp, "IsEProjectMode"
    ' --- 2. lire le projet
    DiagLire "2 Projet", prj, "Name"
    DiagLire "2 Projet", prj, "EnvironmentName"
    Err.Clear
    prj.GetMainGroup g
    DiagNote "2 Projet", "GetMainGroup", Err.Number, Err.Description, IIf(g Is Nothing, "rien rendu", "« " & LireProp(g, "Name") & " »")
    If Not g Is Nothing Then
        Set c = Nothing
        Err.Clear
        g.GetSheetCollection c
        DiagNote "2 Projet", "Groupe.GetSheetCollection (folios du groupe)", Err.Number, Err.Description, DiagColl(c)
        Set c = Nothing
        Err.Clear
        g.GetSubGroupCollection c
        DiagNote "2 Projet", "Groupe.GetSubGroupCollection (sous-groupes)", Err.Number, Err.Description, DiagColl(c)
        s = ""
        Err.Clear
        g.GetNextSheetNumber s
        DiagNote "2 Projet", "Groupe.GetNextSheetNumber", Err.Number, Err.Description, "« " & s & " »"
    End If
    Set c = Nothing
    Err.Clear
    prj.GetAllSheets c
    DiagNote "2 Projet", "GetAllSheets (tous les folios)", Err.Number, Err.Description, DiagColl(c)
    If Not c Is Nothing Then
        If NombreDe(c) > 0 Then
            Set sh = ElementsDe(c).Item(1)
            Set x = Nothing
            Err.Clear
            sh.GetSymbolCollection x
            DiagNote "2 Projet", "1er folio « " & LireProp(sh, "Name") & " ».GetSymbolCollection", Err.Number, Err.Description, DiagColl(x)
        End If
    End If
    Set c = Nothing
    Err.Clear
    prj.GetAllGroups c
    DiagNote "2 Projet", "GetAllGroups", Err.Number, Err.Description, DiagColl(c)
    Set c = Nothing
    Err.Clear
    prj.GetFamilyCollection c
    DiagNote "2 Projet", "GetFamilyCollection (familles du projet)", Err.Number, Err.Description, DiagColl(c)
    If Not c Is Nothing Then
        If NombreDe(c) > 0 Then
            Set fam = ElementsDe(c).Item(1)
            Set x = Nothing
            Err.Clear
            fam.GetShapesCollection x
            DiagNote "2 Projet", "famille du projet « " & LireProp(fam, "Name") & " ».GetShapesCollection", Err.Number, Err.Description, DiagColl(x)
        End If
    End If
    Set c = Nothing
    Err.Clear
    prj.GetParameterSheetCollection c
    DiagNote "2 Projet", "GetParameterSheetCollection", Err.Number, Err.Description, DiagColl(c)
    ' --- 3. lire l'environnement
    If Not mEnvProjet3 Is Nothing Then
        Set env = mEnvProjet3
    ElseIf Len(mNomEnv3) > 0 And Left$(mNomEnv3, 4) <> "#ERR" Then
        Set env = SEE_OuvrirEnvironnementAutomation(mNomEnv3, forme, refus)
        envOuvert = Not env Is Nothing
        DiagNote "3 Environnement", "OpenEnvironment(« " & mNomEnv3 & " »)", IIf(env Is Nothing, -1, 0), refus, forme
    End If
    If Not env Is Nothing Then
        Set c = Nothing
        Err.Clear
        env.GetShapeFamilyCollection 2, c
        DiagNote "3 Environnement", "GetShapeFamilyCollection(2 : utilisateur)", Err.Number, Err.Description, DiagColl(c)
        If Not c Is Nothing Then
            If NombreDe(c) > 0 Then
                Set fam = ElementsDe(c).Item(1)
                Set x = Nothing
                Err.Clear
                fam.GetShapesCollection x
                DiagNote "3 Environnement", "famille « " & LireProp(fam, "Name") & " ».GetShapesCollection", Err.Number, Err.Description, _
                    DiagColl(x) & " ; TypeName : " & TypeName(x) & " ; Count : " & LireProp(x, "Count")
            End If
        End If
        Set c = Nothing
        Err.Clear
        env.GetTitleBlockCollection c
        DiagNote "3 Environnement", "GetTitleBlockCollection (cartouches)", Err.Number, Err.Description, DiagColl(c)
        If Not c Is Nothing Then
            If NombreDe(c) > 0 Then Set tb = ElementsDe(c).Item(1)
        End If
        Set c = Nothing
        Err.Clear
        env.GetParameterSheetCollection c
        DiagNote "3 Environnement", "GetParameterSheetCollection", Err.Number, Err.Description, DiagColl(c)
        Set c = Nothing
        Err.Clear
        env.GetBlockCollection 0, c
        DiagNote "3 Environnement", "GetBlockCollection(0)", Err.Number, Err.Description, DiagColl(c)
    End If
    ' --- 4. écrire par les méthodes du projet (rien n'est enregistré)
    If Not g Is Nothing Then
        Set sg = Nothing
        Err.Clear
        nomDiag = "DIAG_" & Format$(Now, "hhnnss")
        g.CreateSubGroup nomDiag, sg
        DiagNote "4 Écriture", "Groupe.CreateSubGroup(« " & nomDiag & " »)", Err.Number, Err.Description, IIf(sg Is Nothing, "rien rendu", TypeName(sg) & " « " & LireProp(sg, "Name") & " »")
        Set x = Nothing
        Err.Clear
        g.GetSubGroupByName nomDiag, x
        DiagNote "4 Écriture", "Groupe.GetSubGroupByName après création", Err.Number, Err.Description, IIf(x Is Nothing, "PAS trouvé", "trouvé")
        If Not sg Is Nothing And x Is Nothing Then
            Err.Clear
            g.AddSubGroup sg
            DiagNote "4 Écriture", "Groupe.AddSubGroup(le sous-groupe créé)", Err.Number, Err.Description, ""
            Set x = Nothing
            Err.Clear
            g.GetSubGroupByName nomDiag, x
            DiagNote "4 Écriture", "GetSubGroupByName après AddSubGroup", Err.Number, Err.Description, IIf(x Is Nothing, "PAS trouvé", "trouvé")
        End If
        If Not x Is Nothing Then
            Err.Clear
            g.DeleteSubGroup x
            DiagNote "4 Écriture", "Groupe.DeleteSubGroup(le sous-groupe trouvé)", Err.Number, Err.Description, ""
        End If
    End If
    ' --- 5. créer des objets
    Set x = Nothing
    Set c = prj
    Err.Clear
    gApp.CreateObject OBJ_FOLIO, c, x
    DiagNote "5 Création", "SeeAutomation.CreateObject(9 folio, projet)", Err.Number, Err.Description, IIf(x Is Nothing, "rien rendu", TypeName(x))
    Set c = Nothing
    If Not tb Is Nothing Then
        Set pt = Nothing
        Err.Clear
        tb.GetPrimaryCoordinates pt
        DiagNote "5 Création", "un point SANS CreateObject : cartouche « " & LireProp(tb, "Name") & " ».GetPrimaryCoordinates", Err.Number, _
            Err.Description, IIf(pt Is Nothing, "rien rendu", TypeName(pt) & " X=" & LireProp(pt, "X") & " Y=" & LireProp(pt, "Y"))
    End If
    ' une forme de l'album par son nom (celui de l'écran de SEE), par l'environnement puis par le projet
    If Not env Is Nothing Then
        For Each v In Array("USEREQP|Connector Receptacle for Equipment", "Equipment Family|Connector Receptacle for Equipment")
            Set x = Nothing
            Err.Clear
            env.GetShape Split(CStr(v), "|")(0), Split(CStr(v), "|")(1), x
            DiagNote "3 Environnement", "GetShape(« " & Replace(CStr(v), "|", " », « ") & " »)", Err.Number, Err.Description, _
                IIf(x Is Nothing, "rien rendu", "FORME : " & TypeName(x))
        Next v
    End If
    ' (les essais suivants pourraient faire tomber SEE : ils viennent en dernier)
    ' CreateObject : le paramètre du milieu serait-il un MODÈLE (un objet du même type) ou rien du tout ?
    If Not g Is Nothing Then
        Set c = Nothing
        Err.Clear
        g.GetSheetCollection c
        If Not c Is Nothing Then
            If NombreDe(c) > 0 Then Set sh01 = ElementsDe(c).Item(1)
        End If
    End If
    For i = 1 To 6
        Set x = Nothing
        Set c = Nothing
        Set rien = Nothing
        Err.Clear
        Select Case i
            Case 1
                gApp.CreateObject OBJ_POINT, rien, x
                s = "CreateObject(12 point, Nothing)"
            Case 2
                If pt Is Nothing Then GoTo Suivant
                Set c = pt
                gApp.CreateObject OBJ_POINT, c, x
                s = "CreateObject(12 point, le point du cartouche)"
            Case 3
                If sh01 Is Nothing Then GoTo Suivant
                Set c = sh01
                gApp.CreateObject OBJ_FOLIO, c, x
                s = "CreateObject(9 folio, le folio 01)"
            Case 4
                gApp.CreateObject OBJ_FOLIO, rien, x
                s = "CreateObject(9 folio, Nothing)"
            Case 5
                gApp.CreateObject OBJ_LIGNE, rien, x
                s = "CreateObject(11 trait, Nothing)"
            Case Else
                If sh01 Is Nothing Then GoTo Suivant
                Set c = sh01
                gApp.CreateObject OBJ_LIGNE, c, x
                s = "CreateObject(11 trait, le folio 01)"
        End Select
        DiagNote "5 Création", s, Err.Number, Err.Description, IIf(x Is Nothing, "rien rendu", "OBJET : " & TypeName(x))
        If Not x Is Nothing And nouveau Is Nothing Then Set nouveau = x
Suivant:
    Next i
    ' un folio créé PAR SEE : AddSheet prend le folio par référence (entrée ET sortie) : avec rien, SEE en crée-t-il un ?
    If Not g Is Nothing Then
        Set sh = Nothing
        Err.Clear
        g.AddSheet sh
        DiagNote "5 Création", "Groupe.AddSheet(rien) : SEE crée-t-il le folio ?", Err.Number, Err.Description, _
            IIf(sh Is Nothing, "rien rendu", "FOLIO : " & TypeName(sh) & " « " & LireProp(sh, "Name") & " »")
        Set c = Nothing
        Err.Clear
        g.GetSheetCollection c
        DiagNote "5 Création", "folios du groupe après AddSheet", Err.Number, Err.Description, DiagColl(c)
    End If
    ' --- 6. ce qui est installé (lecture du disque)
    DiagInstalle
    DiagChercher
    ' --- 7. les voies par FICHIER (méthodes du projet qui prennent un chemin, sans CreateObject)
    DiagVoiesFichier prj, chemin
    ' l'environnement ouvert ici est refermé ici
    If envOuvert Then
        Err.Clear
        gApp.CloseEnvironment env
    End If
    Set env = Nothing
    mDiagWs.Columns("A:C").AutoFit
    mDiagWs.Columns("D").ColumnWidth = 90
    mDiagWs.Columns("D").WrapText = True
    On Error GoTo 0
    NoterEtape3 5, mEtapes3(5) & vbLf & "DIAGNOSTIC : " & (mDiagOK + mDiagKO) & " essais, " & mDiagOK & " OK, " & mDiagKO & _
        " refusés : prends en photo TOUTE la feuille « Diagnostic » (2 ou 3 photos en descendant)"
End Sub

' Une propriété lue, pour le diagnostic.
Private Sub DiagLire(ByVal niveau As String, ByVal obj As Object, ByVal prop As String)
    Dim t As String
    t = LirePropOuMethode(obj, prop)
    If Left$(t, 4) = "#ERR" Then
        DiagLigne niveau, prop, "refusé", t
        mDiagKO = mDiagKO + 1
    Else
        DiagLigne niveau, prop, "OK", t
        mDiagOK = mDiagOK + 1
    End If
End Sub

' Un essai du diagnostic : OK si numErr = 0, sinon le code et la description.
Private Sub DiagNote(ByVal niveau As String, ByVal essai As String, ByVal numErr As Long, ByVal descErr As String, ByVal detail As String)
    If numErr = 0 Then
        DiagLigne niveau, essai, "OK", detail
        mDiagOK = mDiagOK + 1
    Else
        DiagLigne niveau, essai, CodeDeWindows(numErr), Left$(Trim$(descErr), 100) & IIf(Len(detail) > 0, " ; " & detail, "")
        mDiagKO = mDiagKO + 1
    End If
    Journal "Diagnostic", niveau, essai, IIf(numErr = 0, "OK", "refusé") & " ; " & detail, numErr, descErr
End Sub

Private Sub DiagLigne(ByVal niveau As String, ByVal essai As String, ByVal resultat As String, ByVal detail As String)
    On Error Resume Next
    mDiagLigne = mDiagLigne + 1
    EcrireLigne mDiagWs, mDiagLigne, Array(niveau, essai, resultat, MasquerChemins(detail))
End Sub

' Une collection, en clair : son nombre d'éléments et les noms des premiers.
Private Function DiagColl(ByVal c As Object) As String
    Dim e As Variant, n As Long, s As String
    On Error Resume Next
    If c Is Nothing Then
        DiagColl = "rien rendu"
        Exit Function
    End If
    For Each e In ElementsDe(c)
        n = n + 1
        If n <= 8 Then s = s & IIf(n > 1, ", ", "") & LireProp(e, "Name")
    Next e
    DiagColl = n & " élément(s)" & IIf(n > 0, " : " & s & IIf(n > 8, ", ...", ""), "")
End Function

' 6. Ce qui est installé autour de SEE (lecture du disque) : le dossier du
' programme (LocalServer32 de la coclasse SeeAutomation), ses sous-dossiers et
' ses programmes, et les outils connus de génération et d'import.
Private Sub DiagInstalle()
    Dim cmd As String, erreur As String, exe As String, dossier As String, racine As String, p As Variant, s As String, n As Long, f As String
    On Error Resume Next
    For Each p In Array("CLSID", "WOW6432Node\CLSID")
        If Len(cmd) = 0 Then
            If RegistreTexte("HKCR\" & CStr(p) & "\" & IIf(Len(Reglage("CLSID_Automation", "")) > 0, Reglage("CLSID_Automation", ""), _
                    "{B0B9DD73-EE81-473F-9C3C-D8910C7E2D59}") & "\LocalServer32", "", cmd, erreur) Then
            End If
        End If
    Next p
    exe = Trim$(Replace(cmd, """", ""))
    If InStr(1, LCase$(exe), ".exe") > 0 Then exe = Left$(exe, InStr(1, LCase$(exe), ".exe") + 3)
    If Len(exe) = 0 Then
        DiagLigne "6 Installé", "programme de SEE (registre)", "inconnu", erreur
        Exit Sub
    End If
    dossier = Left$(exe, InStrRev(exe, "\") - 1)
    racine = Left$(dossier, InStrRev(dossier, "\") - 1)
    racine = Left$(racine, InStrRev(racine, "\") - 1)
    DiagLigne "6 Installé", "programme de SEE", "OK", exe
    s = ""
    n = 0
    f = Dir$(dossier & "\*.exe")
    Do While Len(f) > 0 And n < 60
        n = n + 1
        s = s & IIf(n > 1, ", ", "") & f
        f = Dir$()
    Loop
    DiagLigne "6 Installé", "programmes du dossier EXE (" & n & ")", "OK", s
    s = ""
    n = 0
    f = Dir$(racine & "\*", vbDirectory)
    Do While Len(f) > 0 And n < 60
        If f <> "." And f <> ".." Then
            n = n + 1
            s = s & IIf(n > 1, ", ", "") & f
        End If
        f = Dir$()
    Loop
    DiagLigne "6 Installé", "dossiers de " & racine, "OK", s
    For Each p In Array(racine & "\Tools\Xml Batch Mode Generator\SEEBatchModeGenerator.exe", dossier & "\SEEBatchModeGenerator.exe", _
            "C:\Program Files\IGE+XAO\Common\Plugins\SEE", "C:\Program Files (x86)\IGE+XAO\Common\Plugins\SEE", racine & "\Plugins", _
            dossier & "\Plugins", racine & "\Doc\VBAHelp\SEEapp.chm")
        f = Dir$(CStr(p), vbDirectory)
        DiagLigne "6 Installé", CStr(p), IIf(Len(f) > 0, "PRÉSENT", "absent"), ""
        If Len(f) > 0 And InStr(1, CStr(p), "Plugins", vbTextCompare) > 0 Then
            s = ""
            n = 0
            f = Dir$(CStr(p) & "\*", vbDirectory)
            Do While Len(f) > 0 And n < 60
                If f <> "." And f <> ".." Then
                    n = n + 1
                    s = s & IIf(n > 1, ", ", "") & f
                End If
                f = Dir$()
            Loop
            DiagLigne "6 Installé", "contenu de " & CStr(p), "OK", s
        End If
    Next p
End Sub

' 6 bis. Les fichiers utiles autour de SEE (lecture du disque) : schémas
' XSD, fichiers SLF, macros, générateurs (ADG, mode batch, Generative View),
' sous les dossiers IGE+XAO. Au plus 4000 dossiers, 6 chemins par motif.
Private Sub DiagChercher()
    Dim dossiers As Collection, d As String, f As String, i As Long, m As Variant, motifs As Variant, cle As String
    Dim nb As Object, ex As Object, r As Variant, a As Long
    On Error Resume Next
    motifs = Array(".xsd", ".slf", "slf.mdb", "auto_mac", ".mvb", ".bas", "batchmode", "xmlsheetgenerator", "generativeview", "adg", "macro")
    Set nb = NouveauDico()
    Set ex = NouveauDico()
    Set dossiers = New Collection
    For Each r In Array("C:\Program Files (x86)\IGE+XAO", "C:\Program Files\IGE+XAO", "C:\IGE+XAO", "C:\ProgramData\IGE+XAO")
        If Len(Dir$(CStr(r), vbDirectory)) > 0 Then dossiers.Add CStr(r)
    Next r
    If dossiers.Count = 0 Then
        DiagLigne "6 Installé", "dossiers IGE+XAO", "absents", "ni Program Files, ni C:\IGE+XAO, ni ProgramData"
        Exit Sub
    End If
    i = 1
    Do While i <= dossiers.Count And i <= 4000
        d = dossiers.Item(i)
        f = Dir$(d & "\*", vbDirectory Or vbHidden Or vbSystem)
        Do While Len(f) > 0
            If f <> "." And f <> ".." Then
                a = 0
                a = GetAttr(d & "\" & f)
                If (a And vbDirectory) = vbDirectory Then
                    dossiers.Add d & "\" & f
                Else
                    For Each m In motifs
                        If InStr(1, LCase$(f), CStr(m)) > 0 Then
                            cle = CStr(m)
                            nb(cle) = nb(cle) + 1
                            If nb(cle) <= 6 Then ex(cle) = ex(cle) & IIf(Len(ex(cle)) > 0, " | ", "") & d & "\" & f
                        End If
                    Next m
                End If
            End If
            f = Dir$()
        Loop
        i = i + 1
    Loop
    DiagLigne "6 Installé", "dossiers IGE+XAO parcourus", "OK", (i - 1) & " dossier(s) à partir de " & dossiers.Item(1)
    For Each m In motifs
        cle = CStr(m)
        DiagLigne "6 Installé", "fichiers « " & cle & " »", IIf(nb(cle) > 0, nb(cle) & " trouvé(s)", "aucun"), ex(cle)
    Next m
End Sub

' 7. Les voies par FICHIER : ce que SEE sait écrire (ExtractData, dans un
' dossier Extractions_... à côté du projet d'essai) et ce qu'il accepte en
' entrée, éprouvé avec un fichier ABSENT (le message dit le type géré, le
' fichier ou la licence) : ImportData, ImportWireList,
' ExecuteADGGenerationFile, ExecuteSLFFile. Rien n'est importé.
Private Sub DiagVoiesFichier(ByVal prj As Object, ByVal chemin As String)
    Dim dossier As String, sortie As String, t As Long, f As String, v As Variant, lg As String, vx As Variant, absent As String, s As String, n As Long
    On Error Resume Next
    dossier = Left$(chemin, InStrRev(chemin, "\"))
    sortie = dossier & "Extractions_" & Format$(Now, "yyyymmdd_hhnnss")
    MkDir sortie
    DiagLigne "7 Fichiers", "dossier des extractions", IIf(Len(Dir$(sortie, vbDirectory)) > 0, "OK", "PAS créé"), Mid$(sortie, Len(dossier) + 1) & " (à côté du projet)"
    For t = 1 To 12
        f = sortie & "\type" & t & ".xml"
        v = Empty
        Err.Clear
        v = prj.ExtractData(t, f)
        DiagNote "7 Fichiers", "ExtractData(" & t & ") : SEE écrit-il un fichier ?", Err.Number, Err.Description, "rendu : " & DiagValeur(v) & " ; " & DiagFichier(f)
    Next t
    s = ""
    n = 0
    f = Dir$(sortie & "\*")
    Do While Len(f) > 0 And n < 30
        n = n + 1
        s = s & IIf(n > 1, ", ", "") & f & " (" & FileLen(sortie & "\" & f) & " o)"
        f = Dir$()
    Loop
    DiagLigne "7 Fichiers", "fichiers écrits dans le dossier des extractions", n & " fichier(s)", s
    absent = sortie & "\absent.xml"
    For t = 1 To 12
        v = Empty
        Err.Clear
        v = prj.ImportData(t, absent)
        DiagNote "7 Fichiers", "ImportData(" & t & ", fichier absent)", Err.Number, Err.Description, "rendu : " & DiagValeur(v)
    Next t
    vx = absent
    Err.Clear
    prj.ImportWireList vx, False, False
    DiagNote "7 Fichiers", "ImportWireList(fichier absent)", Err.Number, Err.Description, ""
    lg = ""
    Err.Clear
    prj.ExecuteADGGenerationFile absent, lg
    DiagNote "7 Fichiers", "ExecuteADGGenerationFile(fichier absent)", Err.Number, Err.Description, "journal : " & Left$(lg, 200)
    v = Empty
    Err.Clear
    v = prj.ExecuteSLFFile(sortie & "\absent.ini")
    DiagNote "7 Fichiers", "ExecuteSLFFile(fichier absent)", Err.Number, Err.Description, "rendu : " & DiagValeur(v)
    v = Empty
    Err.Clear
    v = prj.GetWDXMLFullPath()
    DiagNote "7 Fichiers", "GetWDXMLFullPath (la liste de câblage XML du projet)", Err.Number, Err.Description, DiagValeur(v)
End Sub

' Une valeur rendue par SEE, en clair et courte.
Private Function DiagValeur(ByVal v As Variant) As String
    On Error Resume Next
    If IsObject(v) Then
        DiagValeur = "objet " & TypeName(v)
    ElseIf IsEmpty(v) Then
        DiagValeur = "rien"
    Else
        DiagValeur = Left$(CStr(v), 120)
    End If
End Function

' Un fichier écrit par SEE : sa taille et son début (les balises disent le format).
Private Function DiagFichier(ByVal f As String) As String
    Dim h As Integer, b As String, n As Long
    On Error Resume Next
    If Len(Dir$(f)) = 0 Then
        DiagFichier = "pas de fichier"
        Exit Function
    End If
    n = FileLen(f)
    h = FreeFile
    Open f For Binary Access Read As #h
    b = String$(IIf(n < 240, n, 240), " ")
    Get #h, 1, b
    Close #h
    b = Replace(Replace(Replace(b, vbCr, " "), vbLf, " "), Chr$(0), "")
    DiagFichier = "FICHIER " & n & " o : " & b
End Function

' 5 bis. Avant de créer : le projet est-il protégé (IsProjectProtected, en
' lecture) ? Puis l'environnement ATTACHÉ au projet, OpenEnvironmentForProject
' (projet, nom de l'environnement) : SEE caché refuse toute création
' (80100000, le 3 novembre, même connecté) ; il lui manque peut-être
' l'environnement du projet. Formes : la sortie en dernier (V4), sans
' sortie, puis la valeur rendue ; arrêt dès que SEE a fait tourner la
' méthode. L'environnement obtenu est refermé avant CloseProject.
Private Sub PreparerProjet3(ByVal prj As Object, ByVal chemin As String)
    Dim pc As Object, env As Object, numErr As Long, descErr As String, txt As String, prot As String, b As Boolean, v As Variant, f As Long
    On Error Resume Next
    ' le projet protégé ?
    Err.Clear
    v = Empty
    v = gApp.IsProjectProtected(chemin)
    numErr = Err.Number
    If numErr = 0 Then
        prot = CStr(v)
    Else
        Err.Clear
        b = False
        gApp.IsProjectProtected chemin, b
        numErr = Err.Number
        prot = IIf(numErr = 0, CStr(b), CodeDeWindows(numErr))
    End If
    ' l'environnement attaché au projet
    If Len(mNomEnv3) = 0 Or Left$(mNomEnv3, 4) = "#ERR" Then
        txt = "pas essayé (nom illisible)"
    Else
        For f = 1 To 3
            Set pc = prj
            Set env = Nothing
            Err.Clear
            Select Case f
                Case 1
                    gApp.OpenEnvironmentForProject pc, mNomEnv3, env
                Case 2
                    gApp.OpenEnvironmentForProject pc, mNomEnv3
                Case Else
                    Set env = gApp.OpenEnvironmentForProject(pc, mNomEnv3)
            End Select
            numErr = Err.Number
            descErr = Err.Description
            Set pc = Nothing
            If numErr = 0 Then
                txt = "OUI (forme " & f & IIf(env Is Nothing, ", rien rendu", ", " & TypeName(env)) & ")"
                Set mEnvProjet3 = env
                Exit For
            End If
            txt = CodeDeWindows(numErr) & " « " & Left$(Trim$(descErr), 80) & " »"
            If Not (TypeRefuse(numErr) Or numErr = 449 Or numErr = 450) Then Exit For
        Next f
    End If
    Set env = Nothing
    On Error GoTo 0
    Journal gEtape, gObjet, "SeeAutomation.OpenEnvironmentForProject", txt
    NoterEtape3 5, mEtapes3(5) & vbLf & "projet protégé : " & prot & " ; environnement attaché au projet : " & txt
End Sub

' 4 bis. La connexion à SEE ACCESS CONTROL, la fenêtre bleue que SEE montre à
' l'ouverture (Username, Password, LOGIN). SEE caché, lancé par Excel, n'est
' connecté à personne : il ouvre et lit, mais refuse peut-être d'écrire (au
' bureau, le 3 novembre : CreateObject a répondu 80100000). Le nom vient du
' réglage UtilisateurSEE, sinon d'une InputBox ; le mot de passe d'une
' InputBox, à chaque fois : il n'est écrit NULLE PART (ni réglage, ni journal,
' ni bloc) et la variable est vidée aussitôt après l'appel. Le nom n'est
' jamais écrit non plus (seulement sa longueur). Sans nom : pas de connexion.
Private Sub ConnecterASEE()
    Dim nom As String, mdp As String, numErr As Long, descErr As String, r As Variant, txt As String
    Contexte "Bouton 3", "connexion"
    mConnecte3 = False
    nom = Trim$(Reglage("UtilisateurSEE", ""))
    If Len(nom) = 0 And Not gSansDialogue Then
        nom = Trim$(InputBox("SEE demande de se connecter (la fenêtre bleue « SEE ACCESS CONTROL »)." & vbCrLf & vbCrLf & _
            "Tape ici ton Username SEE, exactement comme dans cette fenêtre, puis OK." & vbCrLf & vbCrLf & _
            "(Pour essayer sans connexion : laisse vide et clique OK.)", "Pilote SEE - connexion (1 sur 2)"))
    End If
    If Len(nom) = 0 Then
        txt = "pas essayée (aucun nom donné)"
    Else
        If Not gSansDialogue Then
            mdp = InputBox("Tape ton mot de passe SEE (celui de la fenêtre « SEE ACCESS CONTROL »), puis OK." & vbCrLf & vbCrLf & _
                "Il s'affiche en clair dans cette petite fenêtre, mais Excel ne le garde nulle part : ni dans le fichier, " & _
                "ni dans le journal, ni sur les photos.", "Pilote SEE - connexion (2 sur 2)")
        End If
        On Error Resume Next
        Err.Clear
        gApp.Login nom, mdp
        numErr = Err.Number
        descErr = Err.Description
        If numErr = 450 Or numErr = 449 Then
            Err.Clear
            r = Empty
            gApp.Login nom, mdp, r
            numErr = Err.Number
            descErr = Err.Description
        End If
        On Error GoTo 0
        mdp = ""
        If numErr = 0 Then
            mConnecte3 = True
            txt = "OUI (nom donné : " & Len(nom) & " caractères)"
            If Not IsEmpty(r) And Not IsObject(r) Then txt = txt & " ; réponse de SEE : " & CStr(r)
        Else
            txt = "REFUSÉE : " & CodeDeWindows(numErr) & " « " & Left$(Trim$(descErr), 100) & " »"
        End If
    End If
    nom = ""
    Journal gEtape, gObjet, "SeeAutomation.Login", txt
    NoterEtape3 4, mEtapes3(4) & vbLf & "Connexion à SEE : " & txt
End Sub

' Le dernier refus de création que SEE a fait tourner : sa description, et la
' phrase que SEE lui-même en donne (TraductionSEE). Vide s'il n'y en a pas.
Private Function ExplicationRefus() As String
    Dim code As Long, texte As String, trad As String, raison As String
    code = RefusCreation(texte)
    If code = 0 Then Exit Function
    ExplicationRefus = vbLf & "explication : « " & IIf(Len(Trim$(texte)) > 0, Left$(Trim$(texte), 120), "(aucune)") & " »"
    trad = TraductionSEE(code, raison)
    If Len(trad) > 0 Then
        ExplicationRefus = ExplicationRefus & vbLf & "SEE dit pour " & CodeDeWindows(code) & " : « " & trad & " »"
    Else
        ExplicationRefus = ExplicationRefus & vbLf & "phrase de SEE pour ce code : pas obtenue (" & raison & ")"
    End If
End Function

' La phrase de SEE pour un de ses codes : Protection.GetErrorDescription
' (ISEEProtection), en LECTURE SEULE, avec la langue 1036, 1033, "FRA", "ENU"
' ou "" : la valeur rendue, puis le texte en sortie (V4). Au plus 11 appels.
' Vide si SEE ne la donne pas ; raison : sa dernière réponse.
Private Function TraductionSEE(ByVal code As Long, ByRef raison As String) As String
    Dim prot As Object, l As Variant, ts As String, lg As Long, numErr As Long
    On Error Resume Next
    Err.Clear
    Set prot = gApp.Protection
    numErr = Err.Number
    If numErr <> 0 Or prot Is Nothing Then
        raison = "Protection : " & IIf(numErr = 0, "rien rendu", CodeDeWindows(numErr))
        Exit Function
    End If
    For Each l In Array(1036, 1033, 12, 9, 0)
        lg = CLng(l)
        Err.Clear
        ts = ""
        ts = prot.GetErrorDescription(code, lg)
        numErr = Err.Number
        If numErr <> 0 Then
            Err.Clear
            ts = ""
            prot.GetErrorDescription code, lg, ts
            numErr = Err.Number
        End If
        If numErr = 0 And Len(Trim$(ts)) > 0 Then
            TraductionSEE = Left$(Trim$(ts), 160)
            Exit Function
        End If
        raison = "GetErrorDescription : " & IIf(numErr = 0, "texte vide", CodeDeWindows(numErr))
        If numErr <> 0 And Not (TypeRefuse(numErr) Or numErr = 449 Or numErr = 450) Then Exit For
    Next l
End Function

' La petite sonde de création, si SondeCreation = O et que SEE a refusé (en la
' faisant tourner) de créer le folio.
Private Function SondeSiPermise(ByVal prj As Object) As String
    Dim texte As String
    If RefusCreation(texte) = 0 Then Exit Function
    If Not ReglageOui("SondeCreation", "O") Then Exit Function
    SondeSiPermise = vbLf & "autres essais : " & SondeCreationRapide(prj) & vbLf & "écriture par un autre chemin : " & EssaiEcriture(prj)
End Function

' SEE écrit-il dans le projet par un autre chemin que CreateObject ? Un
' sous-groupe ESSAI_PILOTE_GROUPE créé dans le groupe principal
' (Group.CreateSubGroup, qui rend le groupe), puis supprimé aussitôt
' (DeleteSubGroup). Rien n'est enregistré : le bouton 3 n'enregistre que si
' le folio a été dessiné.
Private Function EssaiEcriture(ByVal prj As Object) As String
    Dim g As Object, sg As Object, numErr As Long, descErr As String, r As String
    If gSimulation Then
        EssaiEcriture = "pas essayé (Simulation)"
        Exit Function
    End If
    On Error Resume Next
    Err.Clear
    prj.GetMainGroup g
    If g Is Nothing Then
        Err.Clear
        Set g = prj.GetMainGroup()
    End If
    If g Is Nothing Then
        EssaiEcriture = "groupe principal illisible"
        Exit Function
    End If
    Err.Clear
    g.CreateSubGroup "ESSAI_PILOTE_GROUPE", sg
    numErr = Err.Number
    descErr = Err.Description
    If numErr <> 0 Then
        r = "CreateSubGroup : " & CodeDeWindows(numErr) & " « " & Left$(Trim$(descErr), 60) & " »"
    ElseIf sg Is Nothing Then
        r = "CreateSubGroup : ok, rien rendu"
    Else
        r = "CreateSubGroup : OUI (" & TypeName(sg) & ")"
        Err.Clear
        g.DeleteSubGroup sg
        r = r & " ; supprimé : " & IIf(Err.Number = 0, "oui", CodeDeWindows(Err.Number))
    End If
    Journal gEtape, "essai d'écriture", "Group.CreateSubGroup", r
    Set sg = Nothing
    Set g = Nothing
    EssaiEcriture = r
End Function

' Quelques autres objets, EN MÉMOIRE SEULEMENT : rien n'est ajouté au projet,
' chaque objet est lâché aussitôt. Par la forme qui a tourné au bureau (type,
' contexte, objet en sortie) : point, trait, texte et symbole avec une COPIE
' du projet au milieu, puis le folio avec le groupe principal au milieu. Au
' plus 12 appels (le folio et le point aussi avec l'environnement au milieu :
' celui attaché au projet, sinon un ouvert ici en lecture et refermé ; puis
' des objets de travail : collection, attribut, capture, impression, mise à
' jour, avec le projet) ; arrêt si SEE ne répond plus (800706BA, 800706BE,
' 462).
Private Function SondeCreationRapide(ByVal prj As Object) As String
    Dim types As Variant, noms As Variant, i As Long, ctx As Object, x As Object, g As Object, s As String
    Dim numErr As Long, descErr As String, env As Object, envOuvert As Boolean, forme As String, refus As String
    types = Array(OBJ_POINT, OBJ_LIGNE, OBJ_TEXTE, OBJ_SYMBOLE, OBJ_FOLIO, OBJ_FOLIO, OBJ_POINT, _
        OBJ_COLLECTION, 3, 33, 46, 59)
    noms = Array("point", "trait", "texte", "symbole", "folio par le groupe", "folio par l'environnement", "point par l'environnement", _
        "collection", "attribut", "capture", "impression", "mise à jour")
    On Error Resume Next
    For i = 0 To 11
        Set x = Nothing
        Set ctx = Nothing
        If i >= 5 And i <= 6 Then
            If env Is Nothing Then
                If Not mEnvProjet3 Is Nothing Then
                    Set env = mEnvProjet3
                Else
                    Set env = SEE_OuvrirEnvironnementAutomation(mNomEnv3, forme, refus)
                    envOuvert = Not env Is Nothing
                End If
            End If
            If env Is Nothing Then
                s = s & " ; environnement : pas ouvert"
                Exit For
            End If
            Set ctx = env
        ElseIf i < 4 Or i >= 7 Then
            Set ctx = prj
        Else
            Err.Clear
            If EstV4() Then
                prj.GetMainGroup g
            Else
                Set g = prj.GetMainGroup()
            End If
            numErr = Err.Number
            If numErr <> 0 Or g Is Nothing Then
                s = s & " ; " & noms(i) & " : groupe illisible (" & IIf(numErr = 0, "rien rendu", CodeDeWindows(numErr)) & ")"
                Exit For
            End If
            Set ctx = g
        End If
        Err.Clear
        gApp.CreateObject CLng(types(i)), ctx, x
        numErr = Err.Number
        descErr = Err.Description
        If numErr <> 0 Then
            s = s & " ; " & noms(i) & " : " & CodeDeWindows(numErr)
        ElseIf x Is Nothing Then
            s = s & " ; " & noms(i) & " : rien rendu"
        Else
            s = s & " ; " & noms(i) & " : OUI (" & TypeName(x) & ")"
        End If
        Journal gEtape, "sonde de création", "CreateObject(" & types(i) & ")", IIf(numErr = 0, "ok", "refus"), numErr, descErr
        Set x = Nothing
        Set ctx = Nothing
        If numErr = &H800706BA Or numErr = &H800706BE Or numErr = 462 Then
            s = s & " (SEE ne répond plus : arrêt)"
            Exit For
        End If
    Next i
    Set g = Nothing
    If envOuvert Then
        Err.Clear
        gApp.CloseEnvironment env
    End If
    Set env = Nothing
    On Error GoTo 0
    SondeCreationRapide = Mid$(s, 4)
End Function

' 7. Project.Save, seulement si quelque chose a été dessiné.
Private Sub EnregistrerSansFenetre()
    EnCours3 7
    If mNbPoses = 0 And Not mFolioCree Then
        NoterEtape3 7, "non : rien n'a été dessiné"
        Exit Sub
    End If
    If SauverProjet() Then
        NoterEtape3 7, "oui (Project.Save)"
    Else
        NoterEtape3 7, "NON : " & gDerniereErreur
        mConsigne3 = "SEE n'a pas enregistré : envoie-moi la photo."
    End If
End Sub

' 8. LE RELEVÉ DES FORMES de l'album, en LECTURE SEULE, après l'enregistrement
' et avant la fermeture : l'environnement du projet (EnvironmentName, lu à
' l'étape 5), ouvert par SeeAutomation.OpenEnvironment (V4 : une variable de
' sortie ; sinon l'objet rendu), ses familles et ses formes dans la feuille
' Sonde_Symboles (RelireFormes, la sonde des symboles), puis CloseEnvironment.
' Rien n'est écrit dans l'environnement. Un refus est dit, avec son code, et
' rien d'autre n'est tenté. Les erreurs de lecture du relevé (les familles,
' leurs formes) sont comptées, et la dernière est dite avec son code ;
' un relevé arrêté par une erreur imprévue est dit INTERROMPU, avec ce qui a
' été lu. Aucune erreur n'en sort : la fermeture suit.
Private Sub ReleverFormes()
    Dim env As Object, numErr As Long, descErr As String, forme As String, nbFam As Long, nbSym As Long, ferme As String
    Dim refus As String, e0 As Long, auBout As Boolean, lu As String
    On Error GoTo Imprevu
    Contexte "Bouton 3", "formes"
    EnCours3 8
    If Len(mNomEnv3) = 0 Or Left$(mNomEnv3, 4) = "#ERR" Then
        NoterEtape3 8, "non relevées : le nom de l'environnement du projet est illisible (EnvironmentName : " & _
            IIf(Len(mNomEnv3) > 0, mNomEnv3, "vide") & ")"
        Exit Sub
    End If
    Set env = SEE_OuvrirEnvironnementAutomation(mNomEnv3, forme, refus)
    If env Is Nothing Then
        NoterEtape3 8, "non relevées : OpenEnvironment(« " & mNomEnv3 & " ») refusé, rien d'autre n'est tenté" & vbLf & refus
        Exit Sub
    End If
    ' les erreurs du relevé : comptées depuis ici, la dernière dite (JournalErreur la note avec l'appel et le code)
    e0 = gNbErreurs
    gDerniereErreur = ""
    auBout = RelireFormes(env, nbFam, nbSym)
    mFormesRelevees = (nbFam > 0)
    If auBout Then
        lu = nbFam & " familles, " & nbSym & " formes (feuille Sonde_Symboles)"
    Else
        lu = "relevé INTERROMPU après " & nbFam & " familles, " & nbSym & " formes (feuille Sonde_Symboles ; le détail est au journal)"
    End If
    If gNbErreurs > e0 Then lu = lu & vbLf & (gNbErreurs - e0) & " erreur(s) de lecture ; la dernière : " & _
        IIf(Len(gDerniereErreur) > 0, gDerniereErreur, "(non dite)")
    ' l'environnement ouvert ici est refermé ici, sans rien y écrire
    On Error Resume Next
    Err.Clear
    gApp.CloseEnvironment env
    numErr = Err.Number
    descErr = Err.Description
    On Error GoTo Imprevu
    If numErr = 0 Then
        ferme = "ok"
        Journal gEtape, gObjet, "SeeAutomation.CloseEnvironment(environnement)", "ok"
    Else
        ferme = ReponseDeWindows(numErr, descErr)
        Journal gEtape, gObjet, "SeeAutomation.CloseEnvironment(environnement)", "échec (sans gravité : on continue)", numErr, descErr
    End If
    Set env = Nothing
    NoterEtape3 8, lu & vbLf & "environnement « " & mNomEnv3 & " », ouvert par OpenEnvironment" & forme & ", en lecture ; CloseEnvironment : " & _
        ferme
    Exit Sub
Imprevu:
    numErr = Err.Number
    descErr = Err.Description
    Resume ApresImprevu
ApresImprevu:
    On Error Resume Next
    Journal gEtape, gObjet, "(relevé des formes)", "ARRÊT IMPRÉVU du relevé (lecture seule) : la fermeture suit", numErr, descErr
    NoterEtape3 8, "relevé arrêté par une erreur imprévue (" & ReponseDeWindows(numErr, descErr) & ") ; la fermeture suit"
    If Not env Is Nothing Then gApp.CloseEnvironment env
    Set env = Nothing
End Sub

' 9. LA FERMETURE de l'instance créée à l'étape 4 (SEE était fermé à l'étape
' 1 : c'est la nôtre). Le seul endroit du pilote qui ferme quelque chose dans
' SEE : CloseProject(le projet) (ISeeAutomation le veut en argument : sans lui,
' 450 au bureau), sinon Close du projet, puis Quit, chacun essayé et dit (un
' membre absent n'est pas une faute) ; puis tous les objets SEE lâchés, le
' projet gardé pour CreateObject compris (OublierCreation) ; puis Windows revu
' quelques secondes (Patienter). Appelé seulement si mNotreSEE (l'objet créé
' par CreerNotreSEE).
Private Sub FermerNotreSEE(ByRef prj As Object)
    Dim s As String, r As String, nb As Long, detail As String, etat As Integer, i As Long, numErr As Long, descErr As String
    Contexte "Bouton 3", "fermeture"
    EnCours3 9
    If Not mEnvProjet3 Is Nothing Then
        On Error Resume Next
        Err.Clear
        gApp.CloseEnvironment mEnvProjet3
        Journal gEtape, gObjet, "SeeAutomation.CloseEnvironment(environnement du projet)", IIf(Err.Number = 0, "ok", "échec (sans gravité)"), _
            Err.Number, Err.Description
        Set mEnvProjet3 = Nothing
        On Error GoTo 0
    End If
    If prj Is Nothing Then
        r = "pas de projet ouvert"
    Else
        On Error Resume Next
        Err.Clear
        gApp.CloseProject prj
        numErr = Err.Number
        descErr = Err.Description
        On Error GoTo 0
        If numErr = 0 Then
            r = "ok"
            Journal gEtape, gObjet, "SeeAutomation.CloseProject(projet)", "ok"
        Else
            r = ReponseDeWindows(numErr, descErr)
            Journal gEtape, gObjet, "SeeAutomation.CloseProject(projet)", "échec (sans gravité : on continue)", numErr, descErr
        End If
    End If
    s = "CloseProject(projet) : " & r
    If r <> "ok" And Not prj Is Nothing Then s = s & " ; Close : " & AppelFermeture(prj, "Close")
    If mConnecte3 Then
        On Error Resume Next
        Err.Clear
        gApp.Logout
        s = s & " ; Logout : " & IIf(Err.Number = 0, "ok", CodeDeWindows(Err.Number))
        On Error GoTo 0
    End If
    mConnecte3 = False
    s = s & " ; Quit : " & AppelFermeture(gApp, "Quit")
    ' tous les objets SEE lâchés AVANT d'attendre : le programme ne s'arrête pas tant qu'Excel en tient un
    Set prj = Nothing
    LacherObjetsSEE
    OublierCreation
    Set gApp = Nothing
    gStrategie = ""
    gEstAutomation = False
    mNotreSEE = False
    ' le programme met quelques secondes à s'arrêter
    For i = 1 To 5
        Patienter 2
        etat = SEEEnMarche(nb, detail)
        If etat <> 1 Then Exit For
    Next i
    If etat = 0 Then
        NoterEtape3 9, "oui : " & detail & vbLf & s
    ElseIf etat = 1 Then
        NoterEtape3 9, "NON : " & detail & " après 10 secondes" & vbLf & s
        mConsigne3 = "SEE tourne encore, caché (" & detail & "). " & ConsigneFinDeTache() & vbLf & mConsigne3
    Else
        NoterEtape3 9, "on ne sait pas : " & detail & vbLf & s
        mConsigne3 = "SEE tourne peut-être encore, caché. " & ConsigneFinDeTache() & vbLf & mConsigne3
    End If
End Sub

' Un appel de fermeture (sans argument), essayé : « ok », ou la réponse de Windows.
Private Function AppelFermeture(ByVal obj As Object, ByVal methode As String) As String
    On Error GoTo Echec
    CallByName obj, methode, VbMethod
    Journal gEtape, gObjet, methode, "ok"
    AppelFermeture = "ok"
    Exit Function
Echec:
    AppelFermeture = ReponseDeWindows(Err.Number, Err.Description)
    Journal gEtape, gObjet, methode, "échec (sans gravité : on continue)", Err.Number, Err.Description
End Function

' La fin du bouton 3 : le bloc « À PHOTOGRAPHIER » en tête de Resultat_Test,
' puis UNE boîte courte, qui dit la même chose que sa ligne « Et maintenant ».
Private Sub FinirBouton3(ByVal copie As String, ByVal nomFolio As String, ByVal imprevu As String)
    Dim ws As Object, l As Long, i As Long, resultat As String, consigne As String, photo As String, e As Variant, rubrique As String
    Dim boite As String
    On Error Resume Next
    Application.StatusBar = False
    Application.ScreenUpdating = True
    ' la boîte cache le milieu du bloc : d'abord OK, puis la photo
    photo = "Clique sur OK, puis prends une photo de la partie jaune de la feuille " & FEUILLE_RESULTAT & " et envoie-la-moi."
    consigne = photo
    ' les formes de l'album relevées : leurs familles et leurs noms se lisent en haut de Sonde_Symboles
    If mFormesRelevees Then consigne = consigne & vbLf & "Puis, en bas d'Excel, clique sur l'onglet « Sonde_Symboles » et prends une photo de son haut."
    ' le folio relu : l'origine, le sens de y et l'échelle se lisent sur Sonde_Folio
    If mBatFaite Then consigne = consigne & vbLf & "Puis, en bas d'Excel, clique sur l'onglet « Batterie » et prends-le en photo EN ENTIER " & _
        "(plusieurs photos, en descendant jusqu'à la dernière ligne)."
    If mFolioRelu Then consigne = consigne & vbLf & "Puis, en bas d'Excel, clique sur l'onglet « Sonde_Folio » et prends" & _
        IIf(mBatFaite, "-le en photo EN ENTIER (en descendant).", " une photo de son haut.")
    If Len(imprevu) > 0 Then consigne = consigne & vbLf & "Puis, en bas d'Excel, clique sur l'onglet « Journal » et prends une photo de son haut."
    ' d'abord ce qui ne va pas (un SEE caché qui tourne encore s'arrête AVANT de rouvrir SEE)
    If Len(mConsigne3) > 0 Then consigne = consigne & vbLf & mConsigne3
    If Len(imprevu) > 0 Then
        resultat = "ARRÊT IMPRÉVU (" & imprevu & ")"
    ElseIf mBatFaite Then
        If mBatMort Then
            resultat = "BATTERIE INTERROMPUE : SEE est tombé à l'essai " & mBatTombe
        ElseIf mBatSansGraine Then
            resultat = "BATTERIE SANS GRAINE"
        Else
            resultat = "BATTERIE FAITE"
        End If
        resultat = resultat & " (" & (mBatOK + mBatKO) & " essais) ; " & _
            IIf(Len(mBatEcrits) > 0, "SEE a ACCEPTÉ d'écrire : " & mBatEcrits, "SEE n'a accepté AUCUNE écriture")
        If Not mBatMort And Not mBatSansGraine Then
            consigne = consigne & vbLf & "Puis fais la suite du LIS-MOI : la partie 4 (regarder dans SEE ce qu'Excel a fait)."
        End If
    ElseIf Left$(mEtapes3(7), 3) = "oui" Then
        resultat = "DESSINÉ ET ENREGISTRÉ dans ton projet d'essai"
        consigne = consigne & vbLf & "Ouvre SEE, ouvre ton projet d'essai, double-clic sur le folio " & nomFolio & ", et prends une photo."
    Else
        resultat = "pas de dessin enregistré (voir les étapes)"
    End If
    If Len(copie) > 0 Then
        consigne = consigne & vbLf & "Une copie de sécurité de ton projet est dans le même dossier : " & NomDeFichier(copie) & _
            ". N'y touche pas : je te dirai si on s'en sert."
    End If
    Journal "Fin", "EssaiSansFenetre", "", "terminé ; " & resultat & " ; " & gNbErreurs & " erreur(s)"
    Set ws = FeuilleEnTete(FEUILLE_RESULTAT)
    l = 0
    LigneResultat ws, l, "À PHOTOGRAPHIER", "Prends en photo cette partie jaune, jusqu'à « Et maintenant », et envoie-la-moi. " & _
        "Bouton 3 du " & Format$(Now, "yyyy-mm-dd hh:mm") & "."
    LigneResultat ws, l, "Résultat", resultat
    For i = 1 To 9
        rubrique = TitreEtape3(i)
        For Each e In Split(mEtapes3(i), vbLf)
            LigneResultat ws, l, rubrique, CStr(e)
            rubrique = ""
        Next e
    Next i
    If Len(imprevu) > 0 Then LigneResultat ws, l, "Arrêt imprévu", imprevu
    LigneResultat ws, l, "Et maintenant", consigne
    SurlignerPhoto ws, l
    l = l + 1
    LigneResultat ws, l, "Détail", "la feuille Journal dit chaque appel ; Sonde_Folio relit le folio dessiné ; Sonde_Symboles " & _
        "liste les familles et les formes de l'album"
    MontrerFeuille ws
    ' une boîte de Windows ne montre qu'environ 1 000 caractères : la suite est dans le bloc
    boite = "Bouton 3 : " & resultat & "." & vbCrLf & vbCrLf & Replace(consigne, vbLf, vbCrLf)
    If Len(boite) > 950 Then boite = Left$(boite, 850) & "..." & vbCrLf & vbCrLf & "(La suite est dans la partie jaune, ligne « Et maintenant ».)"
    Dialogue boite, vbInformation, "Pilote SEE - bouton 3"
End Sub

' « C:\...\Robot\TEST.seeprj » -> « TEST.seeprj » (une photo ne montre pas le chemin entier).
Private Function NomDeFichier(ByVal chemin As String) As String
    NomDeFichier = Mid$(chemin, InStrRev(Replace(chemin, "/", "\"), "\") + 1)
End Function

' « C:\...\Robot\TEST.seeprj » -> « Robot ».
Private Function DossierDuFichier(ByVal chemin As String) As String
    Dim s As String, p As Long
    s = Replace(chemin, "/", "\")
    p = InStrRev(s, "\")
    If p = 0 Then Exit Function
    s = Left$(s, p - 1)
    DossierDuFichier = Mid$(s, InStrRev(s, "\") + 1)
End Function

' Sur le folio d'essai : une boîte, deux broches recalées, un fil entre elles,
' selon les réglages EQUIPEMENT.* et TypeConnexion.
Public Sub EssaiSymboles()
    Dim con1 As Object, con2 As Object, x1 As Double, y1 As Double, x2 As Double, y2 As Double
    Dim ok1 As Boolean, ok2 As Boolean, px(0 To 1) As Double, py(0 To 1) As Double, corps As Object
    On Error GoTo Plantage
    If Not Preparer("EssaiSymboles") Then GoTo Fin
    If Not OuvrirFolioEssai() Then GoTo Fin
    Contexte "EssaiSymboles", "boîte ESSAI"
    If Not PoserCorpsSymbole("EQUIPEMENT", 110, 90, 30, 40, "ESSAI", "", "EQ", corps) Then
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
    If Not PreparerSEE(True) Then GoTo Fin
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
    Preparer = PreparerSEE(True)
End Function

' Connexion, projet, environnement, groupe cible ; remet l'état à zéro. En
' simulation, on continue même sans SEE (les lectures sont alors sautées).
' lancerPermis : une macro lancée par Alt+F8 (Vrai) peut créer un objet SEE si
' le réglage LancerSEE = O ; le bouton 2 (Faux) jamais.
Private Function PreparerSEE(ByVal lancerPermis As Boolean) As Boolean
    PreparerSEE = False
    RemettreEtat
    Contexte "Préparation", ""
    If Not ConnecterSEE(lancerPermis) Then
        If gSimulation Then
            Journal gEtape, gObjet, "", "SEE injoignable : simulation SANS SEE (ni lecture ni écriture ; zone du cartouche inconnue)"
            Set gApp = Nothing
            PreparerSEE = True
        ElseIf Not mBouton2 Then
            ' (le bouton 2 le dit dans sa boîte de fin)
            Dialogue "Excel n'a pas trouvé ta fenêtre SEE (voir la feuille Journal) : clique d'abord sur le bouton 1 (" & OU_BOUTONS & _
                ") ; s'il ne la trouve pas, essaie le bouton 3 (SEE fermé).", vbExclamation, "Pilote SEE"
        End If
        Exit Function
    End If
    If gEstAutomation Then
        ' la coclasse SeeAutomation n'a ni GetProject ni GetEnvironment : elle ne
        ' lit pas le projet ouvert, et son CreateObject veut le projet qu'elle a
        ' ouvert. C'est le bouton 3 (EssaiSansFenetre) qui s'en sert : il ouvre
        ' lui-même le projet d'essai, SEE fermé, et essaie les formes de CreateObject
        If gSimulation Then
            Journal gEtape, gObjet, "", "connecté par la coclasse SeeAutomation : la simulation continue SANS lecture dans SEE", -1, "SeeAutomation"
            Set gApp = Nothing
            PreparerSEE = True
        Else
            Journal gEtape, gObjet, "", "connecté par la coclasse SeeAutomation : le pilote ne sait pas dessiner par elle ; arrêt avant tout folio", -1, "SeeAutomation"
            gNbErreurs = gNbErreurs + 1
            If Not mBouton2 Then
                Dialogue "SEE répond par la coclasse SeeAutomation, qui ne lit pas le projet ouvert. Rien n'a été écrit." & vbCrLf & _
                    CONSIGNE_BOUTON3, vbExclamation, "Pilote SEE"
            End If
        End If
        Exit Function
    End If
    ' en simulation, un projet à ouvrir l'est en lecture seule ; le bouton 2 n'en ouvre JAMAIS (le réglage Projet,
    ' que le bouton 3 remplit, n'est pas utilisé) : il prend celui qui est ouvert dans SEE, que sa question nomme
    Set mPrj = SEE_Projet(gSimulation, Not mBouton2)
    If mPrj Is Nothing Then
        Journal gEtape, gObjet, "", IIf(mBouton2, "aucun projet ouvert dans SEE (le bouton 2 n'en ouvre jamais)", _
            "aucun projet : ouvre-le dans SEE ou remplis le réglage Projet"), -1, "pas de projet"
        If Not gSimulation Then
            If mBouton2 Then
                AjouterMessageFin "Rien n'a été dessiné : aucun projet n'est ouvert dans SEE. Dans SEE, ouvre ton projet d'essai, puis " & _
                    "reclique sur le bouton bleu 2 (" & OU_BOUTONS & ")."
            Else
                Dialogue "Aucun projet SEE ouvert (voir la feuille Journal).", vbExclamation, "Pilote SEE"
            End If
            Exit Function
        End If
    Else
        Journal gEtape, "projet", "", "« " & LireProp(mPrj, "Name") & " »"
    End If
    Set mEnv = SEE_Environnement()
    ' le bouton 2 cherche (et crée, si le réglage Groupe le dit) son groupe APRÈS sa question
    If mBouton2 Then
        PreparerSEE = True
        Exit Function
    End If
    If Not mPrj Is Nothing Then Set mGrp = GroupeCible()
    If mGrp Is Nothing And Not gSimulation Then
        Dialogue "Groupe cible introuvable (voir la feuille Journal).", vbExclamation, "Pilote SEE"
        Exit Function
    End If
    PreparerSEE = True
End Function

' L'état d'une exécution remis à zéro (les objets SEE gardés sont lâchés).
Private Sub RemettreEtat()
    mArret = False
    mZonePrete = False
    mPremierFil = True
    LacherObjetsSEE
    Set mPointsX = NouveauDicoExact()
    Set mPointsY = NouveauDicoExact()
    mPolitiqueMateriel = ""
    mDitTitre = False
    mCoordProvisoires = False
    mEchecsDeSuite = 0
    mNbPoses = 0
    mNbGraphiques = 0
    mFolioCree = False
    OublierConversion
End Sub

' Les objets SEE que le pilote garde (projet, environnement, groupe, folio, et
' ceux de ses listes), lâchés : rien n'est fermé ni enregistré dans SEE.
Private Sub LacherObjetsSEE()
    Set mPrj = Nothing
    Set mEnv = Nothing
    Set mGrp = Nothing
    Set mSh = Nothing
    Set mConnecteurs = NouveauDicoExact()
    Set mBorniers = NouveauDicoExact()
    Set mFormes = NouveauDicoExact()
    Set mMaterielsCon = NouveauDicoExact()
    Set mConnecteursRepris = NouveauDicoExact()
    Set mListeFolios = Nothing
    BatLacher
End Sub

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
    ' le bouton 3 travaille dans un SEE caché : rien à regarder entre deux étapes
    If mBouton3 Then Exit Function
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
        If rep = vbCancel Then
            ' (dit au journal, et pour les boutons 2 et 3 : ce n'est pas un échec de SEE)
            mArret = True
            Journal gEtape, gObjet, "", "arrêté : réponse Annuler (le folio existe déjà) ; rien n'est écrit dans SEE"
            Exit Function
        End If
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
    mNbMateriels = 0
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
    mFolioCree = True
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
            "Fils non dessinés", "Graphiques", "Erreurs", "Duree (s)", "Fin", "Remarque", "Materiels")
        ws.Rows(1).Font.Bold = True
    End If
    ' la colonne Materiels, ajoutée à la fin : un bilan d'une version précédente la reçoit aussi
    If Len(CStr(ws.Cells(1, 14).Value)) = 0 Then
        ws.Cells(1, 14).Value = "Materiels"
        ws.Cells(1, 14).Font.Bold = True
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
        mNbGraphiques, erreurs, Round(Duree(t0), 1), Format$(Now, "yyyy-mm-dd hh:mm:ss"), remarque, mNbMateriels)
    If etat = "EN COURS" Then Exit Sub
    Journal gEtape, gObjet, "", "bilan : " & etat & " ; " & mNbBlocs & " bloc(s), " & mNbBornes & " broche(s)/borne(s), " & _
        mNbFilsSEE & " fil(s) SEE, " & mNbFilsDessin & " en dessin, " & mNbFilsSautes & " non dessiné(s), " & _
        mNbMateriels & " matériel(s) associé(s)" & IIf(gSimulation, " (simulés)", "") & ", " & erreurs & _
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
    Dim bornes As Collection, corps As Object, enSymbole As Boolean
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
            enSymbole = PoserCorpsSymbole(nature, x, y, w, h, rep, "", code, corps)
            If Not enSymbole Then
                Journal gEtape, gObjet, "", "boîte non posée : repli en DESSIN"
                DessinerCorps x, y, w, h, rep, rx, ry
            End If
            DessinerPieces bloc
            DessinerNumeros bornes
        Case "BROCHE"
            enSymbole = PoserCorpsOuDessin(nature, x, y, w, h, rep, code, rx, ry, corps)
            PoserBrochesDuBloc nature, bloc, rep, code, bornes, False
        Case "BORNIER"
            enSymbole = PoserCorpsOuDessin(nature, x, y, w, h, rep, code, rx, ry, corps)
            PoserBrochesDuBloc nature, bloc, rep, code, bornes, True
        Case "SYMBOLE"
            enSymbole = PoserSymboleSimple(nature, bloc, rep, code, x, y, w, h, rx, ry, bornes, _
                UCase$(PaquetTexte("Blocs", l, "Sens")), corps)
        Case Else
            If mode <> "DESSIN" Then Journal gEtape, gObjet, "", "mode « " & mode & " » inconnu : DESSIN", -1, "réglage " & nature & ".Mode"
            DessinerCorps x, y, w, h, rep, rx, ry
            DessinerPieces bloc
            DessinerNumeros bornes
    End Select
    ' le journal du matériel parle du bloc (les broches ont changé l'objet courant)
    Contexte "Bloc " & bloc, rep & " (" & nature & ", " & mode & ")"
    MaterielDuCorps nature, l, enSymbole, corps
    mNbBlocs = mNbBlocs + 1
End Sub

' Le corps en symbole si Famille / Symbole sont réglés, sinon dessiné. Vrai si
' le corps est un symbole SEE (sym : le symbole posé ; Nothing en simulation).
Private Function PoserCorpsOuDessin(ByVal nature As String, ByVal x As Double, ByVal y As Double, ByVal w As Double, _
        ByVal h As Double, ByVal rep As String, ByVal code As String, ByVal rx As Double, ByVal ry As Double, _
        ByRef sym As Object) As Boolean
    PoserCorpsOuDessin = False
    Set sym = Nothing
    If Len(Reglage(nature & ".Famille", "")) > 0 And Len(Reglage(nature & ".Symbole", "")) > 0 Then
        If PoserCorpsSymbole(nature, x, y, w, h, rep, "", code, sym) Then
            PoserCorpsOuDessin = True
            Exit Function
        End If
        Journal gEtape, gObjet, "", "corps non posé en symbole : repli en DESSIN"
    End If
    DessinerCorps x, y, w, h, rep, rx, ry
End Function

' Le corps d'un bloc en symbole à deux points (la boîte = le rectangle du
' corps) ; sym : le symbole posé (Nothing en simulation).
Private Function PoserCorpsSymbole(ByVal nature As String, ByVal x As Double, ByVal y As Double, ByVal w As Double, _
        ByVal h As Double, ByVal rep As String, ByVal lettre As String, ByVal code As String, ByRef sym As Object) As Boolean
    Dim label As String, racine As String, ordre As Long
    ArgumentsRepere rep, lettre, code, label, racine, ordre
    PoserCorpsSymbole = PoserSymbole(Reglage(nature & ".Famille", ""), Reglage(nature & ".Symbole", ""), True, _
        VersSEEX(x), VersSEEY(y), VersSEEX(x + w), VersSEEY(y + h), 0, label, racine, ordre, sym)
End Function

' Un symbole simple (une masse, un rail...) : posé sur le point de pose de sa
' borne s'il n'en a qu'une (PointDePose, et recalé), sinon au centre du corps ; chaque
' borne prend le point de connexion le plus proche. Son angle suit le côté
' d'où arrive son fil (colonne Sens du paquet : G, D, H, B) : réglages
' <NATURE>.AngleG / AngleD / AngleH / AngleB. Vrai si le symbole est posé
' (sym : le symbole ; Nothing en simulation), Faux s'il est dessiné.
Private Function PoserSymboleSimple(ByVal nature As String, ByVal bloc As String, ByVal rep As String, ByVal code As String, _
        ByVal x As Double, ByVal y As Double, ByVal w As Double, ByVal h As Double, ByVal rx As Double, ByVal ry As Double, _
        ByVal bornes As Collection, ByVal sens As String, ByRef sym As Object) As Boolean
    Dim px As Double, py As Double, label As String, racine As String, ordre As Long
    Dim l As Variant, xr As Double, yr As Double, xb As Double, yb As Double, unique As Boolean, angle As Double
    PoserSymboleSimple = False
    Set sym = Nothing
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
        Exit Function
    End If
    PoserSymboleSimple = True
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
End Function

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
' les fils ; puis, en BROCHE, le matériel de chaque connecteur servi.
Private Sub PoserBrochesDuBloc(ByVal nature As String, ByVal bloc As String, ByVal rep As String, ByVal code As String, _
        ByVal bornes As Collection, ByVal bornier As Boolean)
    Dim l As Variant, borne As String, cn As String, num As String, cote As String, x As Double, y As Double
    Dim con As Object, tagCon As String, xr As Double, yr As Double, lettres As Object
    Set lettres = NouveauDicoExact()
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
                If Not lettres.Exists(cn) Then lettres.Add cn, tagCon
            End If
            If PoserBroche(nature, con, bornier, tagCon, num, x, y, cote, xr, yr) Then NoterPoint CLng(l), xr, yr
        Else
            Journal gEtape, gObjet, "", "borne sans point d'accroche (X, Y) dans le paquet", -1, "borne incomplète"
        End If
    Next l
    If Not bornier Then MaterielsDesConnecteurs nature, bloc, rep, lettres
End Sub

' ============================================================================
'  LE MATERIEL (le « device » : la référence du catalogue de SEE)
' ============================================================================

' Le matériel du corps d'un bloc : le PN de la feuille Blocs, de la classe
' <NATURE>.ClasseMateriel. Rien si la classe est vide. Si le PN est vide, ou
' si le corps n'est pas un symbole SEE (dessiné), le journal le dit, une fois
' pour ce bloc. enSymbole : le corps est posé en symbole (sym : ce symbole,
' Nothing en simulation).
Private Sub MaterielDuCorps(ByVal nature As String, ByVal l As Long, ByVal enSymbole As Boolean, ByVal sym As Object)
    Dim classe As String, pn As String
    classe = Reglage(nature & ".ClasseMateriel", "")
    If Len(classe) = 0 Then Exit Sub
    pn = PaquetTexte("Blocs", l, "PN")
    If Len(pn) = 0 Then
        Journal gEtape, gObjet, "", "pas de PN dans la feuille Blocs : aucun matériel associé au corps"
        Exit Sub
    End If
    If Not enSymbole Then
        Journal gEtape, gObjet, "", "PN « " & pn & " » non associé : le corps n'est pas un symbole SEE (dessiné ; voir " & _
            nature & ".Mode, .Famille, .Symbole)", -1, "matériel sans symbole"
        Exit Sub
    End If
    If AssocierMateriel(sym, "Symbol", classe, pn, "corps", True) Then mNbMateriels = mNbMateriels + 1
End Sub

' Le matériel des connecteurs servis d'un bloc en mode BROCHE (lettres : lettre
' -> repère du connecteur) : le PN de sa pièce dans la feuille Connecteurs, de
' la classe <NATURE>.ClasseConnecteur. Un connecteur SEE sert à tous les
' folios où son repère paraît : il reçoit son matériel une fois par exécution.
' Les connecteurs sans PN sont dits au journal en une ligne pour le bloc.
Private Sub MaterielsDesConnecteurs(ByVal nature As String, ByVal bloc As String, ByVal rep As String, ByVal lettres As Object)
    Dim classe As String, k As Variant, pn As String, tagCon As String, sansPN As String, deja As String, con As Object
    classe = Reglage(nature & ".ClasseConnecteur", "")
    If Len(classe) = 0 Then Exit Sub
    For Each k In lettres.Keys
        tagCon = CStr(lettres.Item(k))
        pn = PNDuConnecteur(bloc, CStr(k))
        Contexte gEtape, "connecteur " & tagCon
        If Len(pn) = 0 Then
            If Len(sansPN) > 0 Then sansPN = sansPN & ", "
            sansPN = sansPN & tagCon
        ElseIf mMaterielsCon.Exists(tagCon) Then
            deja = CStr(mMaterielsCon.Item(tagCon))
            If StrComp(deja, pn, vbBinaryCompare) <> 0 Then
                Journal gEtape, gObjet, "", "a déjà reçu le PN « " & deja & " » plus tôt dans cette exécution : « " & pn & _
                    " » n'est pas associé", -1, "PN différent pour un même connecteur"
            End If
        Else
            mMaterielsCon.Add tagCon, pn
            ' le connecteur que les broches ont reçu (le cache de l'exécution) : rien n'est créé ici ;
            ' absent ou Nothing (création refusée par SEE ; simulation) : AssocierMateriel le dit
            Set con = Nothing
            If mConnecteurs.Exists(tagCon) Then Set con = mConnecteurs.Item(tagCon)
            If AssocierMateriel(con, "Connector", classe, pn, "connecteur « " & tagCon & " »", _
                    Not mConnecteursRepris.Exists(tagCon)) Then mNbMateriels = mNbMateriels + 1
        End If
    Next k
    If Len(sansPN) > 0 Then
        Contexte gEtape, rep
        Journal gEtape, gObjet, "", "pas de PN dans la feuille Connecteurs pour " & sansPN & " : aucun matériel associé"
    End If
End Sub

' Le PN d'un connecteur d'un bloc du folio en cours : celui de la première de
' ses pièces (feuille Connecteurs, même Bloc, même Lettre) qui en a un.
Private Function PNDuConnecteur(ByVal bloc As String, ByVal lettre As String) As String
    Dim l As Variant, pn As String
    PNDuConnecteur = ""
    For Each l In LignesDe(mPiecesDuBloc, bloc)
        If StrComp(PaquetTexte("Connecteurs", CLng(l), "Lettre"), lettre, vbBinaryCompare) = 0 Then
            pn = PaquetTexte("Connecteurs", CLng(l), "PN")
            If Len(pn) > 0 Then
                PNDuConnecteur = pn
                Exit Function
            End If
        End If
    Next l
End Function

' Associe un matériel à un porteur (un symbole, un connecteur). neuf : le
' porteur vient d'être posé ou créé par cette exécution (un connecteur repris
' du projet ne l'est pas).
'   1. Ce qu'il porte DÉJÀ est lu (GetEquipmentCollection) et journalisé, en
'      simulation aussi quand SEE est joint. Déjà ce matériel (même Class,
'      même Code) : rien n'est écrit. D'autres matériels : le réglage
'      MaterielExistant décide (GARDER : rien n'est écrit ; AJOUTER : le
'      matériel s'ajoute à eux ; REMPLACER : il ne garde que celui-ci). Une
'      lecture qui échoue sur un porteur repris : rien n'est écrit à
'      l'aveugle (sauf REMPLACER).
'   2. En simulation : le journal dit ce qui serait écrit, rien de plus.
'   3. CreateObject (matériel) ; Class, Code, Quantity (MaterielQuantite) ;
'      une collection ; porteur.SetEquipmentCollection (même signature en V5
'      et en V4).
'   4. Relecture : il faut y retrouver un élément de même Class et de même
'      Code (et, en AJOUTER, ceux d'avant).
' Vrai si le matériel est associé et relu, ou déjà là (en simulation : s'il le
' serait). Un refus de SEE est journalisé et compté : le folio continue.
Private Function AssocierMateriel(ByVal porteur As Object, ByVal quoi As String, ByVal classe As String, _
        ByVal pn As String, ByVal libelle As String, ByVal neuf As Boolean) As Boolean
    Dim eq As Object, coll As Object, avant As Object, apres As Object, e As Variant, paires As Collection
    Dim qte As Double, detail As String, appel As String, lecture As String, politique As String, nom As String
    Dim texteAvant As String, texteApres As String, nAvant As Long, nApres As Long, nEcrits As Long, perdus As String
    AssocierMateriel = False
    qte = ReglageNombre("MaterielQuantite", 1)
    detail = libelle & " : Class « " & classe & " », Code « " & pn & " », Quantity " & NombreTexte(qte)
    appel = quoi & ".SetEquipmentCollection"
    lecture = quoi & ".GetEquipmentCollection"
    nom = IIf(quoi = "Connector", "connecteur", "symbole")
    If porteur Is Nothing Or gApp Is Nothing Then
        If gSimulation Or gApp Is Nothing Then
            ' rien à lire : un symbole non posé, un connecteur qui serait créé, ou pas de SEE
            JournalSimulation appel, detail
            AssocierMateriel = True
        Else
            Journal gEtape, gObjet, appel, "pas de " & nom & " SEE : matériel non associé (" & detail & ")", -1, "matériel non associé"
            gNbErreurs = gNbErreurs + 1
        End If
        Exit Function
    End If
    politique = PolitiqueMateriel()
    ' 1. ce que le porteur porte déjà
    If SEE_LireMateriels(porteur, avant) Then
        texteAvant = MaterielsTexte(avant, nAvant)
        If MaterielDans(avant, classe, pn) Then
            Journal gEtape, gObjet, lecture, "déjà associé (" & detail & ") : rien n'est écrit ; il porte " & nAvant & _
                " matériel(s) : " & texteAvant
            AssocierMateriel = True
            Exit Function
        End If
        If nAvant > 0 Then
            If politique = "GARDER" Then
                Journal gEtape, gObjet, lecture, "porte déjà " & nAvant & " matériel(s) : " & texteAvant & " ; " & detail & _
                    " n'est PAS associé (MaterielExistant = GARDER)", -1, "matériel existant gardé"
                Exit Function
            End If
            Journal gEtape, gObjet, lecture, "porte déjà " & nAvant & " matériel(s) : " & texteAvant & " ; MaterielExistant = " & _
                politique & IIf(politique = "AJOUTER", " : le PN du paquet s'y ajoute", " : ils sont retirés, il ne garde que le PN du paquet")
        Else
            JournalCOM lecture & " (avant)", "aucun matériel"
        End If
    ElseIf Not neuf And politique <> "REMPLACER" Then
        Journal gEtape, gObjet, lecture, "ce que porte ce " & nom & " repris du projet n'a pas pu être lu : " & detail & _
            " n'est PAS associé (rien n'est écrit à l'aveugle ; MaterielExistant = REMPLACER l'écrirait)", -1, "matériel existant illisible"
        Exit Function
    End If
    ' 2. simulation : ce qui serait écrit
    If gSimulation Then
        If nAvant > 0 Then
            JournalSimulation appel, detail & IIf(politique = "AJOUTER", " ajouté à : ", " à la place de : ") & texteAvant
        Else
            JournalSimulation appel, detail
        End If
        AssocierMateriel = True
        Exit Function
    End If
    ' 3. écrire : le matériel, avec ceux d'avant en AJOUTER
    Set paires = PairesDeMateriels(avant)
    Set eq = NouvelObjet(OBJ_MATERIEL)
    If eq Is Nothing Then Exit Function
    Set coll = NouvelObjet(OBJ_COLLECTION)
    If coll Is Nothing Then Exit Function
    If Not EcrireProp(eq, "Class", classe) Then Exit Function
    If Not EcrireProp(eq, "Code", pn) Then Exit Function
    If qte = Int(qte) And Abs(qte) < 2147483647 Then
        EcrireProp eq, "Quantity", CLng(qte)
    Else
        EcrireProp eq, "Quantity", qte
    End If
    On Error Resume Next
    If politique = "AJOUTER" And nAvant > 0 Then
        For Each e In ElementsDe(avant)
            Err.Clear
            coll.Add e
            If AppelRate("Collection.Add(matériel déjà porté)") Then Exit Function
            nEcrits = nEcrits + 1
        Next e
    End If
    Err.Clear
    coll.Add eq
    If AppelRate("Collection.Add(matériel)") Then Exit Function
    nEcrits = nEcrits + 1
    Err.Clear
    porteur.SetEquipmentCollection coll
    If AppelRate(appel & " " & detail) Then Exit Function
    On Error GoTo 0
    ' 4. relecture : ce que SEE garde vraiment
    If Not SEE_LireMateriels(porteur, apres) Then
        Journal gEtape, gObjet, lecture & " (relecture)", "relecture impossible (" & gDerniereErreur & ") : " & detail & _
            " n'est pas compté", -1, "matériel non relu"
        Exit Function
    End If
    texteApres = MaterielsTexte(apres, nApres)
    If Not MaterielDans(apres, classe, pn) Then
        gNbErreurs = gNbErreurs + 1
        Journal gEtape, gObjet, lecture & " (relecture)", "aucun élément de Class « " & classe & " » et de Code « " & pn & _
            " » n'est relu (" & nApres & " matériel(s) : " & texteApres & ") : non compté", -1, "matériel non relu"
        Exit Function
    End If
    If politique = "AJOUTER" Then
        For Each e In paires
            If Not MaterielDans(apres, CStr(e(0)), CStr(e(1))) Then perdus = perdus & " « " & e(0) & " / " & e(1) & " »"
        Next e
        If Len(perdus) > 0 Then
            gNbErreurs = gNbErreurs + 1
            Journal gEtape, gObjet, lecture & " (relecture)", "matériel(s) déjà porté(s) non relu(s) après l'ajout :" & perdus, _
                -1, "matériel existant perdu"
        End If
    End If
    If nApres <> nEcrits Then
        ' ce que SEE fait d'une collection (remplace ? ajoute ?) n'est pas établi : on le dit
        Journal gEtape, gObjet, lecture & " (relecture)", "SEE rend " & nApres & " matériel(s) après en avoir reçu " & nEcrits & _
            " : " & texteApres, -1, "relecture différente"
    Else
        JournalCOM lecture & " (relecture)", nApres & " matériel(s) : " & texteApres
    End If
    AssocierMateriel = True
End Function

' Le réglage MaterielExistant (GARDER, AJOUTER, REMPLACER), lu une fois par
' exécution ; une valeur inconnue vaut GARDER, et le journal le dit.
Private Function PolitiqueMateriel() As String
    Dim s As String
    If Len(mPolitiqueMateriel) = 0 Then
        s = UCase$(Trim$(Reglage("MaterielExistant", "GARDER")))
        If s <> "GARDER" And s <> "AJOUTER" And s <> "REMPLACER" Then
            Journal gEtape, gObjet, "", "réglage MaterielExistant « " & s & " » inconnu : GARDER (rien n'est écrit sur un porteur " & _
                "qui a déjà un matériel)", -1, "réglage MaterielExistant"
            s = "GARDER"
        End If
        mPolitiqueMateriel = s
    End If
    PolitiqueMateriel = mPolitiqueMateriel
End Function

' Vrai si la collection de matériels contient un élément de cette Class et de
' ce Code (comparaison exacte, espaces de bord retirés).
Private Function MaterielDans(ByVal coll As Object, ByVal classe As String, ByVal code As String) As Boolean
    Dim e As Variant
    MaterielDans = False
    If coll Is Nothing Then Exit Function
    For Each e In ElementsDe(coll)
        If StrComp(Trim$(LireProp(e, "Class")), Trim$(classe), vbBinaryCompare) = 0 And _
                StrComp(Trim$(LireProp(e, "Code")), Trim$(code), vbBinaryCompare) = 0 Then
            MaterielDans = True
            Exit Function
        End If
    Next e
End Function

' Les (Class, Code) d'une collection de matériels, notés AVANT d'écrire (une
' collection rendue par SEE pourrait suivre le porteur).
Private Function PairesDeMateriels(ByVal coll As Object) As Collection
    Dim e As Variant, res As Collection
    Set res = New Collection
    If Not coll Is Nothing Then
        For Each e In ElementsDe(coll)
            res.Add Array(LireProp(e, "Class"), LireProp(e, "Code"))
        Next e
    End If
    Set PairesDeMateriels = res
End Function

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
        ' un connecteur repris peut porter déjà son matériel (folio fait à la main...) : AssocierMateriel le lit avant d'écrire
        If Not bornier And Not mConnecteursRepris.Exists(tagObj) Then mConnecteursRepris.Add tagObj, True
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
    mNbPoses = mNbPoses + 1
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
    mNbPoses = mNbPoses + 1
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
    mNbPoses = mNbPoses + 1
    If Not okPos Then
        Err.Clear
        t.SetPosition p
        AppelRate "Text.SetPosition (après AddGraphicObject)"
    End If
    On Error GoTo 0
End Sub

' ============================================================================
'  LA BATTERIE D'ESSAIS (bouton 3, v6). SEE caché refuse CreateObject
'  (80100000, au bureau, pour tous les types) : la batterie essaie donc
'  d'écrire et de dessiner SANS CreateObject, avec les objets que SEE rend
'  lui-même : un point par GetPrimaryCoordinates, une collection vide par
'  GetSymbolsByTag, et les symboles, les textes et les segments d'un folio
'  dessiné à la main (la GRAINE). Une ligne par essai dans la feuille
'  Batterie (numéro, essai, OK ou le code de SEE, détail), le résumé en haut.
'  Séries : A lire ; B fabriquer des points et des collections ; D écrire et
'  dessiner (l'état du folio est relu avant et après chaque essai) ; puis
'  Project.Save ; C les voies par fichier, en dernier.
'  Avant chaque essai risqué, son numéro est noté dans un petit fichier à
'  côté du projet : si SEE tombe ou bloque Excel, la batterie suivante saute
'  l'essai fautif (celui d'avant si SEE était déjà parti ; l'essai en cours,
'  d'abord « suspect », s'il fait retomber SEE) et fait les autres.
'  Tout se passe dans le projet d'ESSAI (TEST_...). Aucune erreur n'en sort.
' ============================================================================
Private Sub BatterieSEE(ByVal prj As Object, ByVal chemin As String)
    Dim forme As String, refus As String, envOuvert As Boolean, s As String, p As Long, pendant As Boolean, suspect As Boolean
    If gSimulation Then Exit Sub
    On Error Resume Next
    Contexte "Bouton 3", "batterie"
    EnCours3 6
    mBatFaite = True
    mBatOK = 0
    mBatKO = 0
    mBatEcrits = ""
    mBatVus = ""
    mBatMort = False
    mBatTombe = ""
    mBatPendant = False
    mBatAjoute = ""
    mBatSautes = ""
    mBatCourant = ""
    mBatAvant = ""
    mBatTypeFil = ""
    mBatTypeCable = ""
    mBatFamCable = ""
    mBatFromTo = ""
    mBatNoms = ""
    mBatSauve = False
    mBatSansGraine = False
    Set mBatWs = FeuilleCreee("Batterie", True)
    mBatLigne = BAT_TETE
    EcrireLigne mBatWs, BAT_TETE, Array("N°", "Essai", "Résultat", "Détail")
    mBatWs.Rows(BAT_TETE).Font.Bold = True
    Set mBatPrj = prj
    ' le dossier du projet, et celui des fichiers de la batterie (à côté du projet)
    mBatRacine = ""
    mBatDossier = ""
    p = InStrRev(chemin, "\")
    If p > 0 Then
        mBatRacine = Left$(chemin, p)
        mBatDossier = mBatRacine & "Batterie_" & Format$(Now, "yyyymmdd_hhnnss")
        MkDir mBatDossier
    End If
    ' un essai resté « en cours » a fait tomber ou bloqué SEE la dernière fois : il est sauté cette fois
    mBatSaute = BatLireMarque(BAT_SAUTE)
    s = BatLireMarque(BAT_ENCOURS)
    If Len(s) > 0 Then
        mBatSaute = mBatSaute & IIf(Len(mBatSaute) > 0, ",", "") & s
        BatEcrireMarque BAT_SAUTE, mBatSaute
        BatEcrireMarque BAT_ENCOURS, ""
    End If
    ' l'environnement du projet (celui du relevé des formes)
    If Not mEnvProjet3 Is Nothing Then
        Set mBatEnv = mEnvProjet3
    ElseIf Len(mNomEnv3) > 0 And Left$(mNomEnv3, 4) <> "#ERR" Then
        Set mBatEnv = SEE_OuvrirEnvironnementAutomation(mNomEnv3, forme, refus)
        envOuvert = Not mBatEnv Is Nothing
    End If
    BatSerieA
    If Not mBatMort Then BatSerieB
    If Not mBatMort Then BatSerieD
    ' (enregistré une première fois avant les essais de fils et de blocs, les plus risqués)
    If Not mBatMort Then BatSauver "S01"
    If Not mBatMort Then BatSerieD2
    If Not mBatMort Then BatSauver "S02"
    If Not mBatMort Then BatSerieC
    ' SEE est tombé : quoi sauter au prochain clic ? SEE est sondé après chaque essai (BatNote) : le plus souvent la
    ' chute est donc vue PENDANT l'essai qui l'a causée, et c'est lui qui est sauté. Sinon (SEE était déjà parti avant
    ' l'appel : tombé entre deux essais) : l'essai d'AVANT est sauté (son résultat est déjà dans la feuille ; jamais un
    ' enregistrement : BatASauter), et l'essai en cours devient « suspect » (noté avec « ? » : il sera refait une
    ' fois ; s'il voit encore SEE tomber, il est sauté pour de bon).
    If mBatMort And Len(mBatCourant) > 0 Then
        pendant = mBatPendant
        suspect = (InStr(1, "," & Replace(mBatSaute, " ", "") & ",", "," & mBatCourant & "?,", vbTextCompare) > 0)
        If pendant Or suspect Then
            mBatAjoute = BatASauter(mBatAjoute, mBatCourant, True)
        Else
            mBatAjoute = BatASauter(mBatAjoute, mBatAvant, False)
            mBatAjoute = BatASauter(mBatAjoute, mBatCourant & "?", True)
        End If
        If Len(mBatAjoute) > 0 Then
            mBatSaute = mBatSaute & IIf(Len(mBatSaute) > 0, ",", "") & mBatAjoute
            BatEcrireMarque BAT_SAUTE, mBatSaute
        End If
    End If
    BatEcrireMarque BAT_ENCOURS, ""
    If envOuvert And Not mBatMort Then
        Err.Clear
        gApp.CloseEnvironment mBatEnv
    End If
    BatLacher
    BatBilan
    On Error GoTo 0
End Sub

' Les objets de SEE gardés par la batterie, lâchés (SEE ne s'arrête pas tant qu'Excel en tient un).
Private Sub BatLacher()
    Set mBatPrj = Nothing
    Set mBatEnv = Nothing
    Set mBatGraine = Nothing
    Set mBatCible = Nothing
    Set mBatSym1 = Nothing
    Set mBatSym2 = Nothing
    Set mBatTexte = Nothing
    Set mBatSeg = Nothing
    Set mBatP1 = Nothing
    Set mBatP2 = Nothing
    Set mBatP3 = Nothing
    Set mBatColl = Nothing
    Set mBatBloc = Nothing
End Sub

' Ajoute un numéro d'essai à une liste « a, b, c », une seule fois.
Private Function BatListe(ByVal liste As String, ByVal code As String) As String
    If InStr(1, ", " & liste & ",", ", " & code & ",", vbTextCompare) > 0 Then
        BatListe = liste
    ElseIf Len(liste) > 0 Then
        BatListe = liste & ", " & code
    Else
        BatListe = code
    End If
End Function

' Vrai si SEE n'est plus là : un code de Windows qui le dit, sinon (appel réussi, ou autre erreur) la version de SEE
' devenue illisible (une lecture qui a toujours marché au bureau).
Private Function BatSEEParti(ByVal numErr As Long) As Boolean
    On Error Resume Next
    BatSEEParti = False
    If numErr = 462 Or numErr = &H800706BA Or numErr = &H800706BE Or numErr = &H80010108 Or numErr = &H80010007 Then
        BatSEEParti = True
    Else
        BatSEEParti = (Left$(LireProp(gApp, "ApplicationVersion"), 4) = "#ERR")
    End If
End Function

' Vrai si l'état d'un folio (BatEtat) a été lu en entier : aucun compte illisible (-1).
Private Function BatLisible(ByVal etat As String) As Boolean
    BatLisible = (Left$(etat, 1) = "S") And (InStr(1, etat, "-", vbBinaryCompare) = 0)
End Function

' Update d'un objet, noté À PART de l'écriture qui le précède : une écriture que SEE a acceptée reste acceptée si
' l'objet n'a PAS de méthode Update (438). Tout autre refus d'Update est le résultat de l'essai : ne et de prennent
' son code. Rend le texte à ajouter au détail de la ligne.
Private Function BatMaj(ByVal o As Object, ByRef ne As Long, ByRef de As String) As String
    Dim n As Long, d As String
    BatMaj = ""
    If gSimulation Then Exit Function
    On Error Resume Next
    Err.Clear
    o.Update
    n = Err.Number
    d = Err.Description
    If n = 0 Then
        BatMaj = " ; Update : OK"
    Else
        ' 438 (423 dans LibreOffice) : l'objet n'a pas de méthode Update ; tout autre code est un refus de SEE
        If n = 438 Or n = 423 Then
            BatMaj = " ; pas de méthode Update (" & n & ")"
        Else
            BatMaj = " ; Update REFUSÉ"
            ne = n
            de = "Update : " & d
        End If
    End If
End Function

' Un chemin réduit à ses deux derniers dossiers (une photo ne montre ni serveur, ni nom d'utilisateur).
Private Function BatCheminCourt(ByVal s As String) As String
    Dim t As String, p As Long, q As Long
    On Error Resume Next
    t = Replace(s, "/", "\")
    If Right$(t, 1) = "\" Then t = Left$(t, Len(t) - 1)
    p = InStrRev(t, "\")
    If p > 1 Then q = InStrRev(t, "\", p - 1)
    If q > 0 Then
        BatCheminCourt = "..." & Mid$(t, q)
    Else
        BatCheminCourt = t
    End If
End Function

' Un essai à sauter la prochaine fois, ajouté à la liste « a,b,c » (une seule fois). Jamais un enregistrement (S01,
' S02, S03) si SEE n'est pas tombé PENDANT lui : sans Project.Save, plus rien de ce que la batterie écrit ne resterait.
Private Function BatASauter(ByVal liste As String, ByVal code As String, ByVal pendant As Boolean) As String
    BatASauter = liste
    If Len(code) = 0 Then Exit Function
    If Left$(code, 1) = "S" And Not pendant Then Exit Function
    If InStr(1, "," & liste & ",", "," & code & ",", vbTextCompare) > 0 Then Exit Function
    If Len(liste) > 0 Then
        BatASauter = liste & "," & code
    Else
        BatASauter = code
    End If
End Function
' Une ligne de la feuille Batterie (et du journal).
Private Sub BatLigne(ByVal code As String, ByVal essai As String, ByVal resultat As String, ByVal detail As String)
    On Error Resume Next
    mBatLigne = mBatLigne + 1
    EcrireLigne mBatWs, mBatLigne, Array(code, essai, resultat, MasquerChemins(detail))
    Journal "Batterie", code, essai, resultat & " ; " & detail
End Sub

' Un essai : OK si numErr = 0, sinon le code et la phrase de SEE. Un essai
' d'ÉCRITURE que SEE accepte est retenu (mBatEcrits) ; si SEE n'est plus là
' (BatSEEParti, sondé après chaque essai), la batterie s'arrête : mBatMort,
' l'essai (mBatTombe), et si SEE est tombé pendant lui (mBatPendant).
Private Sub BatNote(ByVal code As String, ByVal essai As String, ByVal numErr As Long, ByVal descErr As String, ByVal detail As String, _
        Optional ByVal ecriture As Boolean = False)
    On Error Resume Next
    If numErr = 0 Then
        BatLigne code, essai, "OK", detail
        mBatOK = mBatOK + 1
        If ecriture Then mBatEcrits = BatListe(mBatEcrits, code)
    Else
        BatLigne code, essai, CodeDeWindows(numErr), Left$(Trim$(descErr), 100) & IIf(Len(detail) > 0, " ; " & detail, "")
        mBatKO = mBatKO + 1
    End If
    ' SEE est-il encore là ? Il est sondé après CHAQUE essai, réussi ou non : une chute est ainsi mise sur l'essai qui
    ' l'a causée. Seule la PREMIÈRE chute est retenue : les essais qui suivent ne la renomment pas.
    If Not mBatMort Then
        If BatSEEParti(numErr) Then
            mBatMort = True
            mBatTombe = code
            ' « déjà parti avant l'appel » (462, 800706BA, 80010108, 80010007), ou tombé PENDANT cet essai (tout le reste)
            mBatPendant = Not (numErr = 462 Or numErr = &H800706BA Or numErr = &H80010108 Or numErr = &H80010007)
            If numErr = 0 Then BatLigne code, "SEE ne répond plus après cet essai", "SEE TOMBÉ", "l'appel a rendu la main, mais la version de SEE ne se lit plus"
        End If
    End If
End Sub

' Un essai d'écriture dont l'effet est VU à la relecture (l'état du folio a changé, ou la valeur relue est la nouvelle).
Private Sub BatVu(ByVal code As String)
    mBatVus = BatListe(mBatVus, code)
End Sub

' Avant un essai risqué. Rend Faux si l'essai est à sauter (SEE est tombé, ou
' l'essai est dans la liste des essais à sauter ; un essai « suspect », noté
' avec un point d'interrogation, n'est pas sauté) ; sinon note son numéro dans
' le fichier « en cours », à côté du projet (il y reste si SEE tombe ou si
' Excel est arrêté de force).
Private Function BatPermis(ByVal code As String) As Boolean
    On Error Resume Next
    BatPermis = False
    If mBatMort Then Exit Function
    If InStr(1, "," & Replace(mBatSaute, " ", "") & ",", "," & code & ",", vbTextCompare) > 0 Then
        BatLigne code, "(essai sauté)", "SAUTÉ", "SEE était tombé ou bloqué à cet essai, ou juste après, la dernière fois ; les autres essais sont faits"
        mBatSautes = BatListe(mBatSautes, code)
        Exit Function
    End If
    mBatAvant = mBatCourant
    mBatCourant = code
    BatEcrireMarque BAT_ENCOURS, code
    Application.StatusBar = "Pilote SEE, bouton 3 : batterie, essai " & code & " (attends, ne touche à rien)"
    BatPermis = True
End Function

' Un petit fichier d'une ligne, à côté du projet (les essais à sauter, l'essai en cours).
Private Sub BatEcrireMarque(ByVal nom As String, ByVal texte As String)
    Dim h As Integer
    On Error Resume Next
    If Len(mBatRacine) = 0 Then Exit Sub
    h = FreeFile
    Open mBatRacine & nom For Output As #h
    Print #h, texte
    Close #h
End Sub

Private Function BatLireMarque(ByVal nom As String) As String
    Dim h As Integer, s As String
    On Error Resume Next
    BatLireMarque = ""
    If Len(mBatRacine) = 0 Then Exit Function
    If Len(Dir$(mBatRacine & nom)) = 0 Then Exit Function
    h = FreeFile
    Open mBatRacine & nom For Input As #h
    Line Input #h, s
    Close #h
    BatLireMarque = Trim$(s)
End Function

' Plusieurs propriétés d'un objet, lues, en une ligne.
Private Sub BatLue(ByVal code As String, ByVal quoi As String, ByVal obj As Object, ByVal props As Variant)
    Dim p As Variant, s As String, t As String, nbErr As Long
    On Error Resume Next
    If obj Is Nothing Then
        BatLigne code, quoi, "pas d'objet", ""
        mBatKO = mBatKO + 1
        Exit Sub
    End If
    For Each p In props
        t = LirePropOuMethode(obj, CStr(p))
        If Left$(t, 4) = "#ERR" Then nbErr = nbErr + 1
        s = s & IIf(Len(s) > 0, " ; ", "") & CStr(p) & " = " & Left$(t, 70)
    Next p
    If nbErr = 0 Then
        BatLigne code, quoi & " (" & TypeName(obj) & ")", "OK", s
        mBatOK = mBatOK + 1
    Else
        BatLigne code, quoi & " (" & TypeName(obj) & ")", nbErr & " illisible(s)", s
        mBatKO = mBatKO + 1
    End If
End Sub

' Un objet rendu par SEE, en clair : son type, et son nom s'il en a un.
Private Function BatObj(ByVal o As Object) As String
    Dim s As String
    On Error Resume Next
    If o Is Nothing Then
        BatObj = "rien rendu"
        Exit Function
    End If
    s = LireProp(o, "Name")
    If Left$(s, 4) = "#ERR" Then
        BatObj = TypeName(o)
    Else
        BatObj = TypeName(o) & " « " & s & " »"
    End If
End Function

' Le nombre d'éléments d'une collection rendue par SEE (-2 : rien rendu ; -1 : illisible).
Private Function BatNb(ByVal c As Object) As Long
    On Error Resume Next
    If c Is Nothing Then
        BatNb = -2
    Else
        BatNb = NombreDe(c)
    End If
End Function

' Un point de SEE, en clair.
Private Function BatPt(ByVal p As Object) As String
    Dim x As Double, y As Double
    On Error Resume Next
    If p Is Nothing Then
        BatPt = "(pas de point)"
    ElseIf LirePointXY(p, x, y) Then
        BatPt = "(" & NombreTexte(x) & " ; " & NombreTexte(y) & ")"
    Else
        BatPt = "(point illisible)"
    End If
End Function

' L'état d'un folio : S symboles, G textes + traits + rectangles, C segments de connexion (-1 : la lecture a échoué).
Private Function BatEtat(ByVal sh As Object) As String
    Dim e0 As Long, c As Object, s As String
    On Error Resume Next
    If sh Is Nothing Then
        BatEtat = "pas de folio"
        Exit Function
    End If
    ' (les objets graphiques par les trois types que la sonde lit déjà : 1 les textes, 2 les traits, 4 les rectangles ;
    ' une lecture qui ne rend rien SANS erreur compte pour zéro : seule une erreur rend le compte illisible, BatCompte)
    e0 = gNbErreurs
    Set c = SEE_SymbolesDuFolio(sh)
    s = "S" & BatCompte(c, e0)
    e0 = gNbErreurs
    Set c = SEE_GraphiquesDuFolio(sh, 1)
    s = s & " G" & BatCompte(c, e0)
    e0 = gNbErreurs
    Set c = SEE_GraphiquesDuFolio(sh, 2)
    s = s & "+" & BatCompte(c, e0)
    e0 = gNbErreurs
    Set c = SEE_GraphiquesDuFolio(sh, 4)
    s = s & "+" & BatCompte(c, e0)
    e0 = gNbErreurs
    Set c = SEE_SegmentsDuFolio(sh)
    BatEtat = s & " C" & BatCompte(c, e0)
End Function

' Le nombre d'éléments qu'une lecture de SEE a rendus : rien de rendu SANS erreur compte pour 0 (un folio vide) ; -1 si
' la lecture a levé une erreur depuis erreursAvant (elle est au journal), ou si le compte ne se lit pas.
Private Function BatCompte(ByVal c As Object, ByVal erreursAvant As Long) As Long
    On Error Resume Next
    If gNbErreurs > erreursAvant Then
        BatCompte = -1
    ElseIf c Is Nothing Then
        BatCompte = 0
    Else
        BatCompte = NombreDe(c)
    End If
End Function

' Ce qu'un essai d'écriture a changé : « avant -> après » ; VU seulement si les deux états ont été lus et diffèrent.
Private Function BatEffet(ByVal code As String, ByVal avant As String, ByVal apres As String) As String
    Dim t As String, douteux As Boolean
    On Error Resume Next
    ' une lecture ratée (avant ou après) n'est ni un changement, ni son absence
    t = avant & "|" & apres
    douteux = (InStr(1, t, "illisible", vbTextCompare) > 0) Or (InStr(1, t, "pas d", vbTextCompare) > 0)
    If Left$(avant, 1) = "S" Or Left$(apres, 1) = "S" Then
        If Not BatLisible(avant) Then douteux = True
        If Not BatLisible(apres) Then douteux = True
    End If
    If douteux Then
        BatEffet = "ON NE SAIT PAS (lecture impossible) : " & avant & " -> " & apres
    ElseIf avant <> apres Then
        BatVu code
        BatEffet = "CHANGÉ : " & avant & " -> " & apres
    Else
        BatEffet = "rien de changé (" & avant & ")"
    End If
End Function

' Un symbole en clair : son repère, sa forme (famille et nom), sa position.
Private Function BatSymbole(ByVal sym As Object) As String
    Dim tg As Object, fo As Object, fa As Object, x1 As Double, y1 As Double, x2 As Double, y2 As Double, a As Boolean, s As String
    On Error Resume Next
    If sym Is Nothing Then
        BatSymbole = "(pas de symbole)"
        Exit Function
    End If
    Set tg = SEE_RepereDe(sym)
    Set fo = SEE_FormeDuSymbole(sym)
    Set fa = SEE_FamilleDeForme(fo)
    s = "repère « " & LireProp(tg, "DisplayTag") & " », forme « " & LireProp(fo, "Name") & " », famille « " & LireProp(fa, "Name") & " »"
    If SEE_PositionDe(sym, x1, y1, x2, y2, a) Then s = s & ", en (" & NombreTexte(x1) & " ; " & NombreTexte(y1) & ")"
    BatSymbole = s
End Function

' La valeur d'un texte de SEE (Values : un texte, un tableau ou une collection, selon la version).
Private Function BatValeurTexte(ByVal txt As Object) As String
    Dim v As Variant, o As Variant, s As String, i As Long
    On Error Resume Next
    BatValeurTexte = ""
    If txt Is Nothing Then Exit Function
    If Not LirePropValeur(txt, "Values", v) Then
        Set v = ObjetProp(txt, "Values")
    End If
    If IsObject(v) Then
        For Each o In ElementsDe(v)
            s = s & IIf(Len(s) > 0, " | ", "") & LireProp(o, "Value")
        Next o
    ElseIf IsArray(v) Then
        For i = LBound(v) To UBound(v)
            s = s & IIf(Len(s) > 0, " | ", "") & EnTexte(v(i))
        Next i
    Else
        s = EnTexte(v)
    End If
    BatValeurTexte = s
End Function

' Les fichiers d'un dossier, en clair : leur nombre, et les noms et tailles des premiers.
Private Function BatFichiers(ByVal dossier As String, ByVal maxi As Long) As String
    Dim f As String, n As Long, s As String
    On Error Resume Next
    If Len(dossier) = 0 Then
        BatFichiers = "pas de dossier"
        Exit Function
    End If
    If Right$(dossier, 1) = "\" Then dossier = Left$(dossier, Len(dossier) - 1)
    If Len(Dir$(dossier, vbDirectory)) = 0 Then
        BatFichiers = "dossier introuvable"
        Exit Function
    End If
    f = Dir$(dossier & "\*")
    Do While Len(f) > 0 And n < 5000
        n = n + 1
        If n <= maxi Then s = s & IIf(n > 1, ", ", "") & f & " (" & FileLen(dossier & "\" & f) & " o)"
        ' (vidé d'abord : si Dir échouait, la boucle ne doit pas tourner sans fin sur le même nom)
        f = ""
        f = Dir$()
    Loop
    BatFichiers = IIf(n >= 5000, "5000 fichiers ou plus", n & " fichier(s)") & IIf(n > 0, " : " & s & IIf(n > maxi, ", ...", ""), "")
End Function

' Le début d'un texte rendu par SEE, sur une ligne.
Private Function BatDebut(ByVal s As String, ByVal n As Long) As String
    On Error Resume Next
    BatDebut = Len(s) & " caractère(s)" & IIf(Len(s) > 0, " : " & Left$(Replace(Replace(s, vbCr, " "), vbLf, " "), n), "")
End Function

' La position d'un objet de SEE, en clair : GetPosition (deux points), sinon les deux bouts d'un trait, sinon un point.
Private Function BatPosition(ByVal obj As Object) As String
    Dim x1 As Double, y1 As Double, x2 As Double, y2 As Double, sec As Boolean
    On Error Resume Next
    If obj Is Nothing Then
        BatPosition = "(pas d'objet)"
    ElseIf SEE_PositionDe(obj, x1, y1, x2, y2, sec) Then
        BatPosition = "(" & NombreTexte(x1) & " ; " & NombreTexte(y1) & ")" & IIf(sec, " (" & NombreTexte(x2) & " ; " & NombreTexte(y2) & ")", "")
    ElseIf SEE_PointPar(obj, "GetStartPoint", x1, y1) Then
        ' (un trait se lit aussi par ses deux bouts, comme le fait la sonde des folios)
        sec = SEE_PointPar(obj, "GetEndPoint", x2, y2)
        BatPosition = "(" & NombreTexte(x1) & " ; " & NombreTexte(y1) & ")" & IIf(sec, " (" & NombreTexte(x2) & " ; " & NombreTexte(y2) & ")", "")
    ElseIf SEE_PointPar(obj, "GetPosition", x1, y1) Then
        BatPosition = "(" & NombreTexte(x1) & " ; " & NombreTexte(y1) & ")"
    Else
        BatPosition = "(position illisible)"
    End If
End Function

' Le dernier élément d'une collection de SEE (Nothing si elle est vide ou illisible).
Private Function BatDernier(ByVal c As Object) As Object
    Dim elts As Collection
    On Error Resume Next
    Set BatDernier = Nothing
    Set elts = ElementsDe(c)
    If elts.Count > 0 Then Set BatDernier = elts.Item(elts.Count)
End Function

' --- Série A : LIRE (rien n'est changé dans SEE). Elle choisit la GRAINE (le
' folio qui a le plus de symboles : celui que le technicien a dessiné à la
' main) et la CIBLE (un autre folio, le plus vide ; à défaut la graine), et
' garde deux symboles, un texte et un segment de la graine pour la suite.
Private Sub BatSerieA()
    Dim c As Object, folios As Collection, sh As Object, i As Long, n As Long, nMax As Long, nMin As Long, iGraine As Long, iCible As Long
    Dim s As String, ne As Long, de As String, x As Object, y As Object, tb As Object, elts As Collection, t As Variant, lang As Object
    Dim v As Variant, lus As Boolean
    On Error Resume Next
    BatLue "A01", "le projet", mBatPrj, Array("Name", "EnvironmentName", "IsReadOnly", "IsModified")
    ' les folios : la graine est celui qui a le plus de symboles
    Set c = Nothing
    Err.Clear
    mBatPrj.GetAllSheets c
    ne = Err.Number
    de = Err.Description
    lus = (ne = 0)
    Set folios = ElementsDe(c)
    If NombreDe(c) <> folios.Count Then lus = False
    ' (-2 : un folio dont les symboles sont illisibles, -1, reste préférable à aucun folio)
    nMax = -2
    For i = 1 To folios.Count
        Set sh = folios.Item(i)
        n = NombreDe(SEE_SymbolesDuFolio(sh))
        If n < 0 Then lus = False
        s = s & IIf(i > 1, ", ", "") & "« " & LireProp(sh, "Name") & " » : " & n & " symbole(s)"
        If n > nMax Then
            nMax = n
            iGraine = i
        End If
    Next i
    BatNote "A02", "les folios du projet (GetAllSheets)", ne, de, folios.Count & " folio(s) ; " & Left$(s, 600)
    If mBatMort Then Exit Sub
    If iGraine > 0 Then Set mBatGraine = folios.Item(iGraine)
    ' la cible : un AUTRE folio dont les symboles se lisent, celui qui en a le moins (le dernier à égalité)
    nMin = 1000000
    For i = 1 To folios.Count
        If i <> iGraine Then
            Set sh = folios.Item(i)
            n = NombreDe(SEE_SymbolesDuFolio(sh))
            If n >= 0 And n <= nMin Then
                nMin = n
                iCible = i
            End If
        End If
    Next i
    If iCible > 0 Then
        Set mBatCible = folios.Item(iCible)
    Else
        Set mBatCible = mBatGraine
    End If
    ' « pas de graine » : les folios ont été LUS, et aucun n'a de symbole (des folios illisibles ne sont pas « pas de graine »)
    mBatSansGraine = lus And (folios.Count = 0 Or nMax = 0)
    If mBatSansGraine Then
        s = "PAS DE GRAINE"
    ElseIf nMax > 0 Then
        s = "OK"
    Else
        s = "ILLISIBLE"
    End If
    BatLigne "A03", "la GRAINE (le folio dessiné à la main)", s, _
        IIf(mBatGraine Is Nothing, "aucun folio", "« " & LireProp(mBatGraine, "Name") & " » : " & BatEtat(mBatGraine)) & _
        IIf(mBatSansGraine, " ; AUCUN symbole dans le projet : dessine la graine (partie 2 du LIS-MOI), puis reclique sur le bouton 3", "") & _
        IIf(s = "ILLISIBLE", " ; les folios ou leurs symboles ne se lisent pas : envoie les photos", "")
    BatLigne "A04", "la CIBLE (le folio où Excel essaie de dessiner)", IIf(iCible > 0, "OK", "la graine"), _
        IIf(mBatCible Is Nothing, "aucun folio", "« " & LireProp(mBatCible, "Name") & " » : " & BatEtat(mBatCible)) & _
        IIf(iCible > 0, "", " ; pas d'autre folio : crée un 2e folio vide pour la prochaine fois")
    If mBatGraine Is Nothing Then Exit Sub
    ' (ni « dessiné par », ni « conçu par » : ils peuvent porter un nom de personne, et la feuille est photographiée)
    BatLue "A05", "la graine", mBatGraine, Array("Name", "Type", "SheetOrder", "CreationMethod", "Step")
    Set tb = SEE_CartoucheDuFolio(mBatGraine)
    BatLue "A06", "le cartouche de la graine", tb, Array("Name", "Width", "Height", "WorkingWidth", "WorkingHeight")
    ' les symboles de la graine : les deux premiers sont gardés
    Set elts = ElementsDe(SEE_SymbolesDuFolio(mBatGraine))
    If elts.Count >= 1 Then Set mBatSym1 = elts.Item(1)
    If elts.Count >= 2 Then Set mBatSym2 = elts.Item(2)
    s = ""
    For i = 1 To elts.Count
        If i <= 12 Then s = s & IIf(i > 1, " | ", "") & BatSymbole(elts.Item(i))
    Next i
    BatLigne "A07", "les symboles de la graine", elts.Count & " symbole(s)", s
    ' ses textes, ses traits, ses rectangles
    Set elts = ElementsDe(SEE_GraphiquesDuFolio(mBatGraine, 1))
    If elts.Count >= 1 Then Set mBatTexte = elts.Item(1)
    BatLigne "A08", "les textes libres de la graine", elts.Count & " texte(s)", _
        IIf(mBatTexte Is Nothing, "aucun : écris un texte libre sur la graine pour la prochaine fois", "le premier : « " & Left$(BatValeurTexte(mBatTexte), 80) & " »")
    BatLigne "A09", "les traits et les rectangles libres de la graine", NombreDe(SEE_GraphiquesDuFolio(mBatGraine, 2)) & " trait(s)", _
        NombreDe(SEE_GraphiquesDuFolio(mBatGraine, 4)) & " rectangle(s) ; avec le type -1 (tous ?) : " & NombreDe(SEE_GraphiquesDuFolio(mBatGraine, -1))
    ' ses segments de connexion (les fils dessinés)
    Set elts = ElementsDe(SEE_SegmentsDuFolio(mBatGraine))
    If elts.Count >= 1 Then Set mBatSeg = elts.Item(1)
    s = ""
    If Not mBatSeg Is Nothing Then
        mBatTypeFil = LireProp(mBatSeg, "SignalType")
        s = "le premier : SignalType « " & mBatTypeFil & " », LineStyle « " & LireProp(mBatSeg, "LineStyle") & " »"
        If Left$(mBatTypeFil, 4) = "#ERR" Then mBatTypeFil = ""
        Set x = Nothing
        mBatSeg.GetStrandCollection x
        s = s & ", fils du segment : " & BatNb(x)
    End If
    BatLigne "A10", "les segments de connexion de la graine (les fils dessinés)", elts.Count & " segment(s)", s
    ' les câbles, les connecteurs et les textes du projet ; un symbole retrouvé par son repère
    If BatPermis("A11") Then
        Set c = Nothing
        Err.Clear
        mBatPrj.GetCableCollection c
        ne = Err.Number
        de = Err.Description
        BatNote "A11", "les câbles et les fils du projet (GetCableCollection)", ne, de, BatNb(c) & " élément(s)"
        If BatNb(c) > 0 Then
            Set x = ElementsDe(c).Item(1)
            BatLue "A12", "le premier câble", x, Array("Type", "Family", "Gauge", "Length", "SegregationCode")
            mBatTypeCable = LireProp(x, "Type")
            If Left$(mBatTypeCable, 4) = "#ERR" Then mBatTypeCable = ""
            mBatFamCable = LireProp(x, "Family")
            If Left$(mBatFamCable, 4) = "#ERR" Then mBatFamCable = ""
        End If
        Set c = Nothing
        Err.Clear
        mBatPrj.GetConnectorCollection c
        ne = Err.Number
        de = Err.Description
        BatNote "A13", "les connecteurs du projet (GetConnectorCollection)", ne, de, DiagColl(c)
        Set c = Nothing
        Err.Clear
        mBatPrj.GetTextsCollection c
        ne = Err.Number
        de = Err.Description
        BatNote "A14", "les textes du projet (GetTextsCollection)", ne, de, BatNb(c) & " élément(s)"
        If Not mBatSym1 Is Nothing Then
            s = LireProp(SEE_RepereDe(mBatSym1), "Tag")
            Set c = Nothing
            Err.Clear
            mBatPrj.GetSymbolsByTag s, c
            ne = Err.Number
            de = Err.Description
            BatNote "A15", "retrouver un symbole par son repère « " & s & " » (GetSymbolsByTag)", ne, de, BatNb(c) & " élément(s)"
        End If
    End If
    If mBatMort Then Exit Sub
    ' les traitements du projet
    Set x = ObjetProp(mBatPrj, "Process")
    Set y = ObjetProp(x, "WireNumbering")
    BatLigne "A16", "les traitements du projet (Project.Process)", IIf(x Is Nothing, "illisible", "OK"), "Process : " & BatObj(x) & _
        " ; WireNumbering : " & BatObj(y) & " ; Cabling : " & BatObj(ObjetProp(x, "Cabling")) & " ; Tools : " & _
        BatObj(ObjetProp(mBatPrj, "Tools")) & " ; Control : " & BatObj(ObjetProp(mBatPrj, "Control"))
    If Not y Is Nothing Then
        If BatPermis("A17") Then
            s = ""
            Err.Clear
            y.GetFromToXML s
            ne = Err.Number
            de = Err.Description
            mBatFromTo = s
            BatNote "A17", "la liste « de - vers » des fils en XML (WireNumbering.GetFromToXML)", ne, de, BatDebut(s, 300)
            If Len(s) > 0 And Len(mBatDossier) > 0 Then EcrireFichierTexte mBatDossier & "\FromTo.xml", s
        End If
    End If
    If mBatMort Then Exit Sub
    If Len(mBatDossier) > 0 Then
        If BatPermis("A18") Then
            Err.Clear
            mBatPrj.ExportJSON mBatDossier, "export", 0, 0
            ne = Err.Number
            de = Err.Description
            BatNote "A18", "le projet en fichiers JSON (Project.ExportJSON)", ne, de, BatFichiers(mBatDossier, 8)
        End If
    End If
    If mBatMort Then Exit Sub
    ' l'environnement : ses blocs (des fichiers, et par l'API), ses méthodes
    BatLue "A19", "l'environnement", mBatEnv, Array("Name", "Version", "Standard", "Unit")
    If Not mBatEnv Is Nothing Then
        s = LireProp(mBatEnv, "BlockPath")
        BatLigne "A20", "le dossier des blocs de l'environnement (BlockPath)", IIf(Left$(s, 4) = "#ERR", "illisible", "OK"), _
            BatCheminCourt(s) & " ; " & BatFichiers(s, 12)
        If BatPermis("A21") Then
            For Each t In Array(1, 2, 27, 28)
                Set c = Nothing
                Err.Clear
                mBatEnv.GetBlockCollection CLng(t), c
                ne = Err.Number
                de = Err.Description
                BatNote "A21", "les blocs de l'environnement, type " & CStr(t) & " (GetBlockCollection)", ne, de, DiagColl(c)
                If mBatBloc Is Nothing And BatNb(c) > 0 Then Set mBatBloc = ElementsDe(c).Item(1)
                If mBatMort Then Exit For
            Next t
        End If
        ' les méthodes de l'environnement (30 : les types de câbles ; 29 : le câblage) : leurs noms servent aux essais de fils
        If BatPermis("A25") Then
            For Each t In Array(30, 29)
                v = Empty
                s = ""
                If SEE_MethodesXML(mBatEnv, CLng(t), v) Then s = BatTexteXml(v)
                BatNomsXml s
                BatLigne "A25", "les méthodes de l'environnement, type " & CStr(t) & " (GetMethodsXML)", IIf(Len(s) > 0, "OK", "rien"), BatDebut(s, 250)
                If Len(s) > 0 And Len(mBatDossier) > 0 Then EcrireFichierTexte mBatDossier & "\methodes" & CStr(t) & ".xml", s
            Next t
            BatLigne "A25", "les noms lus dans ces méthodes (essayés comme types de fil)", IIf(Len(mBatNoms) > 0, "OK", "aucun"), _
                Left$(Replace(mBatNoms, "|", ", "), 600)
        End If
    End If
    If mBatMort Then Exit Sub
    ' la vue de la graine
    If BatPermis("A22") Then
        Set x = Nothing
        Err.Clear
        mBatGraine.GetView x
        ne = Err.Number
        de = Err.Description
        BatNote "A22", "la vue de la graine (Sheet.GetView)", ne, de, BatObj(x) & IIf(x Is Nothing, "", " ; IsActive = " & LireProp(x, "IsActive") & " ; Type = " & LireProp(x, "Type"))
    End If
    If mBatMort Then Exit Sub
    ' ce que SEE dit lui-même de ses codes de refus
    If BatPermis("A23") Then
        Set x = ObjetProp(gApp, "Protection")
        Set lang = Nothing
        mBatPrj.GetActiveLanguage lang
        If x Is Nothing Then
            BatLigne "A23", "SeeAutomation.Protection", "illisible", ""
        Else
            For Each t In Array(&H80100000, &H80100004, 1)
                s = ""
                Err.Clear
                x.GetErrorDescription CLng(t), lang, s
                ne = Err.Number
                de = Err.Description
                BatNote "A23", "ce que SEE dit du code " & CodeDeWindows(CLng(t)) & " (Protection.GetErrorDescription)", ne, de, _
                    "« " & Left$(s, 200) & " » ; langue : " & BatObj(lang)
                If mBatMort Then Exit For
            Next t
        End If
    End If
    If mBatMort Then Exit Sub
    ' la graine relue en entier dans la feuille Sonde_Folio : ses symboles (forme, famille, repère, position), ses fils, ses textes
    If Not mBatSansGraine Then
        If BatPermis("A24") Then
            RelireFolio mBatGraine
            mFolioRelu = True
            Contexte "Bouton 3", "batterie"
            BatLigne "A24", "la graine relue en entier", "fait", "feuille Sonde_Folio : prends-la en photo en entier"
        End If
    End If
End Sub

' --- Série B : FABRIQUER, sans CreateObject, les trois points et la
' collection dont les essais de dessin ont besoin.
Private Sub BatSerieB()
    Dim tb As Object, c As Object, ne As Long, de As String, x1 As Double, y1 As Double, x2 As Double, y2 As Double, sec As Boolean
    Dim q As Object, xa As Double, ya As Double, xb As Double, yb As Double, ok As Boolean, s As String, i As Long
    If gSimulation Then Exit Sub
    On Error Resume Next
    Set mBatP1 = Nothing
    Set mBatP2 = Nothing
    Set mBatP3 = Nothing
    Set mBatColl = Nothing
    If Not BatPermis("B01") Then Exit Sub
    ' B01 : trois points par la position d'un symbole de la graine (chaque appel rend ses points)
    If Not mBatSym1 Is Nothing Then
        Err.Clear
        mBatSym1.GetPosition mBatP1, q
        ne = Err.Number
        de = Err.Description
        Set q = Nothing
        mBatSym1.GetPosition mBatP2, q
        Set q = Nothing
        mBatSym1.GetPosition mBatP3, q
        BatNote "B01", "trois points SANS CreateObject, par la position d'un symbole (Symbol.GetPosition)", ne, de, _
            BatPt(mBatP1) & " " & BatPt(mBatP2) & " " & BatPt(mBatP3)
        If mBatMort Then Exit Sub
    End If
    ' à défaut : par le cartouche (au bureau, le 5 novembre : GetPrimaryCoordinates rend un point)
    If mBatP1 Is Nothing Or mBatP2 Is Nothing Or mBatP3 Is Nothing Then
        Set tb = SEE_CartoucheDuFolio(mBatGraine)
        If tb Is Nothing Then Set tb = SEE_CartoucheDuFolio(mBatCible)
        If tb Is Nothing And Not mBatEnv Is Nothing Then
            Set c = SEE_Cartouches(mBatEnv, False)
            If BatNb(c) > 0 Then Set tb = ElementsDe(c).Item(1)
        End If
        If tb Is Nothing Then
            BatLigne "B01", "des points par le cartouche", "pas fait", "aucun cartouche lisible"
        Else
            Set mBatP1 = Nothing
            Set mBatP2 = Nothing
            Set mBatP3 = Nothing
            Err.Clear
            tb.GetPrimaryCoordinates mBatP1
            ne = Err.Number
            de = Err.Description
            tb.GetPrimaryCoordinates mBatP2
            tb.GetPrimaryCoordinates mBatP3
            BatNote "B01", "trois points SANS CreateObject, par le cartouche « " & LireProp(tb, "Name") & " » (GetPrimaryCoordinates)", ne, de, _
                BatPt(mBatP1) & " " & BatPt(mBatP2) & " " & BatPt(mBatP3)
            If mBatMort Then Exit Sub
        End If
    End If
    If mBatP1 Is Nothing Or mBatP2 Is Nothing Then Exit Sub
    ' où dessiner : aux positions des deux premiers symboles de la graine (des endroits sûrs de la feuille) ; à défaut, près du premier point
    ok = False
    If Not mBatSym1 Is Nothing And Not mBatSym2 Is Nothing Then
        If SEE_PositionDe(mBatSym1, xa, ya, x2, y2, sec) Then ok = SEE_PositionDe(mBatSym2, xb, yb, x2, y2, sec)
    End If
    If Not ok Then
        If LirePointXY(mBatP1, x1, y1) Then
            xa = x1 + 40
            ya = y1 + 25
            xb = x1 + 140
            yb = y1 + 25
            ok = True
        End If
    End If
    If Not ok Then
        BatLigne "B02", "écrire X et Y des points", "pas fait", "aucune position lisible"
        Exit Sub
    End If
    If Abs(xa - xb) < 1 And Abs(ya - yb) < 1 Then xb = xa + 50
    ' B02 : écrire X et Y, et voir si les points sont indépendants et distincts
    If Not BatPermis("B02") Then Exit Sub
    Err.Clear
    mBatP1.X = xa
    ne = Err.Number
    de = Err.Description
    mBatP1.Y = ya
    mBatP2.X = xb
    mBatP2.Y = yb
    If Not mBatP3 Is Nothing Then
        mBatP3.X = (xa + xb) / 2
        mBatP3.Y = (ya + yb) / 2 + 20
    End If
    s = "P1 " & BatPt(mBatP1) & " ; P2 " & BatPt(mBatP2) & " ; P3 " & BatPt(mBatP3)
    If LirePointXY(mBatP1, x1, y1) Then
        If Abs(x1 - xa) < 0.01 And Abs(y1 - ya) < 0.01 Then
            s = s & " ; P1 a gardé sa valeur"
        Else
            s = s & " ; points LIÉS (P1 a bougé avec les autres : SEE ne rend qu'un seul point)"
        End If
    End If
    If LirePointXY(mBatP2, x2, y2) Then
        If Abs(x2 - xb) < 0.01 And Abs(y2 - yb) < 0.01 Then
            s = s & " ; P2 a pris la sienne : deux points DISTINCTS"
        Else
            s = s & " ; P2 N'A PAS PRIS SA VALEUR : les essais de fil n'auront pas deux points distincts"
        End If
    End If
    BatNote "B02", "écrire X et Y des points (Point.X, Point.Y)", ne, de, s
    If mBatMort Then Exit Sub
    ' B03 : une collection vide SANS CreateObject : celle d'une recherche qui ne trouve rien, sinon celle d'un folio vide
    If Not BatPermis("B03") Then Exit Sub
    For i = 1 To 7
        Set c = Nothing
        Err.Clear
        Select Case i
            Case 1
                mBatPrj.GetSymbolsByTag "ZZ_PILOTE_AUCUN", c
                s = "Project.GetSymbolsByTag(un repère qui n'existe pas)"
            Case 2
                mBatPrj.GetCablesByTag "ZZ_PILOTE_AUCUN", c
                s = "Project.GetCablesByTag(un repère qui n'existe pas)"
            Case 3
                mBatPrj.GetConnectorsByTag "ZZ_PILOTE_AUCUN", c
                s = "Project.GetConnectorsByTag(un repère qui n'existe pas)"
            Case 4
                mBatPrj.GetTerminalStripsByTag "ZZ_PILOTE_AUCUN", c
                s = "Project.GetTerminalStripsByTag(un repère qui n'existe pas)"
            Case 5
                mBatCible.GetSymbolCollection c
                s = "les symboles de la cible (Sheet.GetSymbolCollection)"
            Case 6
                mBatCible.GetConnectionSegmentCollection c
                s = "les segments de la cible (Sheet.GetConnectionSegmentCollection)"
            Case Else
                mBatCible.GetGraphicObjectCollection 4, c
                s = "les rectangles de la cible (Sheet.GetGraphicObjectCollection)"
        End Select
        ne = Err.Number
        de = Err.Description
        BatNote "B03", "une collection vide SANS CreateObject : " & s, ne, de, BatObj(c) & " ; Count = " & BatNb(c)
        If mBatMort Then Exit Sub
        If BatNb(c) = 0 Then
            Set mBatColl = c
            Exit For
        End If
    Next i
    If mBatColl Is Nothing Then Exit Sub
    ' B04 : les deux points dans la collection
    If Not BatPermis("B04") Then
        Set mBatColl = Nothing
        Exit Sub
    End If
    Err.Clear
    mBatColl.Add mBatP1
    ne = Err.Number
    de = Err.Description
    If ne = 0 Then
        Err.Clear
        mBatColl.Add mBatP2
        ne = Err.Number
        de = Err.Description
        If ne <> 0 Then de = "2e Add : " & de
    End If
    BatNote "B04", "mettre les deux points dans la collection (Collection.Add)", ne, de, _
        "Count = " & BatNb(mBatColl) & IIf(BatNb(mBatColl) = 2, " : la collection de points est PRÊTE", "")
    If BatNb(mBatColl) <> 2 Then Set mBatColl = Nothing
End Sub

' Un point de plus, SANS CreateObject (par la position d'un symbole de la graine, sinon par le cartouche), mis en (x ; y).
Private Function BatNouveauPoint(ByVal x As Double, ByVal y As Double) As Object
    Dim p As Object, q As Object, tb As Object
    On Error Resume Next
    Set BatNouveauPoint = Nothing
    If Not mBatSym1 Is Nothing Then mBatSym1.GetPosition p, q
    If p Is Nothing Then
        Set tb = SEE_CartoucheDuFolio(mBatGraine)
        If Not tb Is Nothing Then tb.GetPrimaryCoordinates p
    End If
    If p Is Nothing Then Exit Function
    p.X = x
    p.Y = y
    Set BatNouveauPoint = p
End Function

' Les types de connexion à essayer, chacun une fois : rien, ceux lus sur la graine (SignalType du segment, Type et
' Family du câble), les quatre premiers noms lus dans les méthodes de l'environnement, puis des noms courants.
Private Function BatTypes() As Collection
    Dim r As Collection, v As Variant, n As Long
    On Error Resume Next
    Set r = New Collection
    For Each v In Array("", mBatTypeFil, mBatTypeCable, mBatFamCable)
        BatAjouterType r, CStr(v)
    Next v
    For Each v In Split(mBatNoms, "|")
        If n < 4 And Len(CStr(v)) > 0 Then
            n = n + 1
            BatAjouterType r, CStr(v)
        End If
    Next v
    For Each v In Array("Wires", "Wire", "Fils")
        BatAjouterType r, CStr(v)
    Next v
    Set BatTypes = r
End Function

Private Sub BatAjouterType(ByVal r As Collection, ByVal nom As String)
    Dim e As Variant
    On Error Resume Next
    For Each e In r
        If CStr(e) = nom Then Exit Sub
    Next e
    r.Add nom
End Sub

' Le texte d'un XML rendu par SEE (un texte, ou un objet qui a une propriété xml).
Private Function BatTexteXml(ByVal v As Variant) As String
    Dim s As String
    On Error Resume Next
    BatTexteXml = ""
    If IsObject(v) Then
        If v Is Nothing Then Exit Function
        s = LireProp(v, "xml")
        If Left$(s, 4) = "#ERR" Then s = ""
        BatTexteXml = s
    ElseIf VarType(v) = vbString Then
        BatTexteXml = CStr(v)
    End If
End Function

' Les valeurs des attributs Name="..." d'un XML, ajoutées une fois chacune à mBatNoms (40 caractères au plus chacune).
Private Sub BatNomsXml(ByVal xml As String)
    Dim p As Long, q As Long, s As String, n As Long
    On Error Resume Next
    p = InStr(1, xml, "Name=" & Chr$(34), vbTextCompare)
    Do While p > 0 And n < 300
        n = n + 1
        q = InStr(p + 6, xml, Chr$(34), vbBinaryCompare)
        If q = 0 Then Exit Do
        s = Mid$(xml, p + 6, q - p - 6)
        If Len(s) > 0 And Len(s) <= 40 And InStr(1, s, "|", vbBinaryCompare) = 0 Then
            If InStr(1, "|" & mBatNoms & "|", "|" & s & "|", vbTextCompare) = 0 Then mBatNoms = mBatNoms & IIf(Len(mBatNoms) > 0, "|", "") & s
        End If
        p = 0
        p = InStr(q + 1, xml, "Name=" & Chr$(34), vbTextCompare)
    Loop
End Sub

' Poser un bloc sur la cible, en P1 : d'abord sans paramètres (rien), puis avec ceux que le bloc rend lui-même.
Private Sub BatPoserBloc(ByVal code As String, ByVal blk As Object, ByVal quoi As String)
    Dim rien As Object, x As Object, avant As String, ne As Long, de As String, vpl As Variant
    If gSimulation Then Exit Sub
    On Error Resume Next
    Set rien = Nothing
    Set x = Nothing
    avant = BatEtat(mBatCible)
    Err.Clear
    mBatCible.InsertBlock blk, rien, x, mBatP1
    ne = Err.Number
    de = Err.Description
    BatNote code, "poser " & quoi & " sur la cible, sans paramètres (Sheet.InsertBlock)", ne, de, _
        "cible : " & BatEffet(code, avant, BatEtat(mBatCible)), True
    If ne = 0 Or mBatMort Then Exit Sub
    vpl = Empty
    Err.Clear
    blk.GetParameterList vpl
    ne = Err.Number
    de = Err.Description
    BatNote code, "les paramètres de ce bloc (Block.GetParameterList)", ne, de, "rendu : " & DiagValeur(vpl)
    If ne <> 0 Or IsEmpty(vpl) Or mBatMort Then Exit Sub
    Set x = Nothing
    avant = BatEtat(mBatCible)
    Err.Clear
    mBatCible.InsertBlock blk, vpl, x, mBatP1
    ne = Err.Number
    de = Err.Description
    BatNote code, "poser " & quoi & " sur la cible, avec ses paramètres (Sheet.InsertBlock)", ne, de, _
        "cible : " & BatEffet(code, avant, BatEtat(mBatCible)), True
End Sub

' Le nombre de folios du projet (-2 : rien rendu ; -1 : illisible).
Private Function BatNbFolios() As Long
    Dim c As Object
    On Error Resume Next
    mBatPrj.GetAllSheets c
    BatNbFolios = BatNb(c)
End Function

' --- Série D : ÉCRIRE et DESSINER dans le projet d'essai, sans CreateObject :
' changer ce qui existe (une propriété du folio, un texte, la position et le
' repère d'un symbole), puis poser sur la cible des objets de la graine.
' Chaque essai relit l'état avant et après.
Private Sub BatSerieD()
    Dim ne As Long, de As String, s As String, avant As String, apres As String, avantG As String, tg As Object, maj As String
    Dim x As Object, q1 As Object, q2 As Object, x1 As Double, y1 As Double, x2 As Double, y2 As Double, c As Object, refuse As Boolean
    Dim a As Object, b As Object
    If gSimulation Then Exit Sub
    On Error Resume Next
    If mBatGraine Is Nothing Then Exit Sub
    ' D01 : une propriété du folio
    If BatPermis("D01") Then
        avant = LireProp(mBatGraine, "DrawnBy")
        s = "PILOTE " & Format$(Now, "hhnnss")
        Err.Clear
        mBatGraine.DrawnBy = s
        ne = Err.Number
        de = Err.Description
        maj = ""
        If ne = 0 Then maj = BatMaj(mBatGraine, ne, de)
        apres = LireProp(mBatGraine, "DrawnBy")
        If apres = s Then BatVu "D01"
        ' (l'ancienne valeur peut être un nom de personne : seule sa longueur est écrite)
        BatNote "D01", "écrire « dessiné par » sur la graine (Sheet.DrawnBy, Update)", ne, de, _
            "avant : " & Len(avant) & " caractère(s) ; écrit « " & s & " » ; relu : " & _
            IIf(apres = s, "la nouvelle valeur", "PAS la nouvelle valeur") & maj, True
    End If
    If mBatMort Then Exit Sub
    ' D02, D03 : un texte de la graine
    If mBatTexte Is Nothing Then
        BatLigne "D02", "changer un texte de la graine", "pas fait", "pas de texte libre sur la graine"
    Else
        If BatPermis("D02") Then
            avant = BatValeurTexte(mBatTexte)
            s = "PILOTE " & Format$(Now, "hh:nn:ss")
            Err.Clear
            mBatTexte.Value = s
            ne = Err.Number
            de = Err.Description
            maj = ""
            If ne = 0 Then maj = BatMaj(mBatTexte, ne, de)
            apres = BatValeurTexte(mBatTexte)
            If InStr(1, apres, s, vbBinaryCompare) > 0 Then BatVu "D02"
            BatNote "D02", "changer la valeur d'un texte de la graine (Text.Value, Update)", ne, de, _
                "avant « " & Left$(avant, 60) & " », écrit « " & s & " », relu « " & Left$(apres, 60) & " »" & maj, True
        End If
        If BatPermis("D03") Then
            avant = BatPosition(mBatTexte)
            Err.Clear
            mBatTexte.Move 5, 5
            ne = Err.Number
            de = Err.Description
            maj = ""
            If ne = 0 Then maj = BatMaj(mBatTexte, ne, de)
            BatNote "D03", "déplacer ce texte de 5 ; 5 (Text.Move, Update)", ne, de, BatEffet("D03", avant, BatPosition(mBatTexte)) & maj, True
        End If
    End If
    If mBatMort Then Exit Sub
    ' D04, D05 : le 2e symbole de la graine (le 1er sert aux points et à la pose)
    If mBatSym2 Is Nothing Then
        BatLigne "D04", "déplacer un symbole de la graine", "pas fait", "la graine a moins de deux symboles"
    Else
        If BatPermis("D04") Then
            avant = BatPosition(mBatSym2)
            Set q1 = Nothing
            Set q2 = Nothing
            Err.Clear
            mBatSym2.GetPosition q1, q2
            ne = Err.Number
            de = Err.Description
            maj = ""
            If ne = 0 And q1 Is Nothing Then
                ' (le code d'une lecture ne doit pas passer pour le succès d'une écriture)
                ne = -1
                de = "GetPosition n'a rendu aucun point : rien n'a été écrit"
            ElseIf ne = 0 Then
                If LirePointXY(q1, x1, y1) Then q1.X = x1 + 10
                If Not q2 Is Nothing Then
                    If LirePointXY(q2, x2, y2) Then q2.X = x2 + 10
                End If
                Err.Clear
                mBatSym2.SetPosition q1, q2
                ne = Err.Number
                de = Err.Description
                If ne = 0 Then maj = BatMaj(mBatSym2, ne, de)
            End If
            BatNote "D04", "déplacer un symbole de la graine de 10 vers la droite (Symbol.SetPosition, Update)", ne, de, _
                BatEffet("D04", avant, BatPosition(mBatSym2)) & maj, True
        End If
        If BatPermis("D05") Then
            Set tg = SEE_RepereDe(mBatSym2)
            avant = LireProp(tg, "DisplayTag")
            s = "ZZ" & Format$(Now, "nnss")
            If tg Is Nothing Then
                BatLigne "D05", "changer le repère d'un symbole", "pas fait", "repère illisible"
            Else
                Err.Clear
                tg.SetManual mBatSym2, s, "", 0
                ne = Err.Number
                de = Err.Description
                If ne <> 0 Then de = "SetManual : " & de
                If ne = 0 Then
                    Err.Clear
                    mBatSym2.ChangeTag tg
                    ne = Err.Number
                    de = Err.Description
                    If ne <> 0 Then de = "ChangeTag : " & de
                End If
                maj = ""
                If ne = 0 Then maj = BatMaj(mBatSym2, ne, de)
                apres = LireProp(SEE_RepereDe(mBatSym2), "DisplayTag")
                If apres <> avant And Left$(apres, 4) <> "#ERR" And Left$(avant, 4) <> "#ERR" Then BatVu "D05"
                BatNote "D05", "changer le repère d'un symbole de la graine (Tag.SetManual, Symbol.ChangeTag, Update)", ne, de, _
                    "avant « " & avant & " », demandé « " & s & " », relu « " & apres & " »" & maj, True
            End If
        End If
    End If
    If mBatCible Is Nothing Or mBatMort Then Exit Sub
    ' D06, D07 : poser sur la cible un symbole de la graine (D07, avec son repère, si D06 n'a rien posé)
    If mBatSym1 Is Nothing Then
        BatLigne "D06", "poser un symbole sur la cible", "pas fait", "pas de symbole sur la graine"
    Else
        refuse = True
        If BatPermis("D06") Then
            avant = BatEtat(mBatCible)
            avantG = BatEtat(mBatGraine)
            Set tg = Nothing
            Err.Clear
            mBatCible.AddSymbol mBatSym1, tg
            ne = Err.Number
            de = Err.Description
            apres = BatEtat(mBatCible)
            refuse = (ne <> 0) Or (apres = avant)
            BatNote "D06", "poser sur la cible un symbole de la graine, repère laissé à SEE (Sheet.AddSymbol)", ne, de, _
                "cible : " & BatEffet("D06", avant, apres) & " ; graine : " & avantG & " -> " & BatEtat(mBatGraine), True
        End If
        If refuse And Not mBatMort Then
            If BatPermis("D07") Then
                avant = BatEtat(mBatCible)
                avantG = BatEtat(mBatGraine)
                Set tg = SEE_RepereDe(mBatSym1)
                Err.Clear
                mBatCible.AddSymbol mBatSym1, tg
                ne = Err.Number
                de = Err.Description
                BatNote "D07", "le même, avec le repère du symbole (Sheet.AddSymbol)", ne, de, _
                    "cible : " & BatEffet("D07", avant, BatEtat(mBatCible)) & " ; graine : " & avantG & " -> " & BatEtat(mBatGraine), True
            End If
        End If
    End If
    If mBatMort Then Exit Sub
    ' D08 : poser sur la cible un texte de la graine
    If Not mBatTexte Is Nothing Then
        If BatPermis("D08") Then
            avant = BatEtat(mBatCible)
            avantG = BatEtat(mBatGraine)
            Err.Clear
            mBatCible.AddGraphicObject mBatTexte
            ne = Err.Number
            de = Err.Description
            BatNote "D08", "poser sur la cible un texte de la graine (Sheet.AddGraphicObject)", ne, de, _
                "cible : " & BatEffet("D08", avant, BatEtat(mBatCible)) & " ; graine : " & avantG & " -> " & BatEtat(mBatGraine), True
        End If
    End If
    If mBatMort Then Exit Sub
    ' D09 : un trait de la graine, déplacé sur place ; D10 : posé sur la cible ; D11 : le trait posé, mis entre P1 et P2
    Set x = Nothing
    Set c = SEE_GraphiquesDuFolio(mBatGraine, 2)
    If BatNb(c) > 0 Then Set x = ElementsDe(c).Item(1)
    If x Is Nothing Then
        BatLigne "D09", "poser un trait sur la cible", "pas fait", "pas de trait libre sur la graine : trace un trait libre sur la graine pour la prochaine fois"
    Else
        If BatPermis("D09") Then
            avant = BatPosition(x)
            Err.Clear
            x.Move 5, 5
            ne = Err.Number
            de = Err.Description
            maj = ""
            If ne = 0 Then maj = BatMaj(x, ne, de)
            BatNote "D09", "déplacer un trait de la graine de 5 ; 5 (Line.Move, Update)", ne, de, BatEffet("D09", avant, BatPosition(x)) & maj, True
        End If
        If BatPermis("D10") Then
            avant = BatEtat(mBatCible)
            Err.Clear
            mBatCible.AddGraphicObject x
            ne = Err.Number
            de = Err.Description
            apres = BatEtat(mBatCible)
            BatNote "D10", "poser sur la cible un trait de la graine (Sheet.AddGraphicObject)", ne, de, "cible : " & BatEffet("D10", avant, apres), True
            ' le trait posé (le dernier trait de la cible), mis entre P1 et P2 (des copies : SEE ne doit pas changer P1 ni P2)
            If ne = 0 And avant <> apres And BatLisible(apres) And Not mBatP1 Is Nothing And Not mBatP2 Is Nothing And Not mBatMort Then
                Set q1 = BatDernier(SEE_GraphiquesDuFolio(mBatCible, 2))
                If Not q1 Is Nothing Then
                    Set a = mBatP1
                    Set b = mBatP2
                    avant = BatPosition(q1)
                    Err.Clear
                    q1.SetStartPoint a
                    ne = Err.Number
                    de = Err.Description
                    If ne <> 0 Then de = "SetStartPoint : " & de
                    If ne = 0 Then
                        Err.Clear
                        q1.SetEndPoint b
                        ne = Err.Number
                        de = Err.Description
                        If ne <> 0 Then de = "SetEndPoint : " & de
                    End If
                    maj = ""
                    If ne = 0 Then maj = BatMaj(q1, ne, de)
                    BatNote "D11", "mettre ce trait entre P1 et P2 (Line.SetStartPoint, SetEndPoint, Update)", ne, de, _
                        BatEffet("D11", avant, BatPosition(q1)) & maj, True
                End If
            End If
        End If
    End If
    If mBatMort Then Exit Sub
    ' D12 : poser sur la cible un rectangle de la graine
    Set x = Nothing
    Set c = SEE_GraphiquesDuFolio(mBatGraine, 4)
    If BatNb(c) > 0 Then Set x = ElementsDe(c).Item(1)
    If Not x Is Nothing Then
        If BatPermis("D12") Then
            avant = BatEtat(mBatCible)
            Err.Clear
            mBatCible.AddGraphicObject x
            ne = Err.Number
            de = Err.Description
            BatNote "D12", "poser sur la cible un rectangle de la graine (Sheet.AddGraphicObject)", ne, de, _
                "cible : " & BatEffet("D12", avant, BatEtat(mBatCible)), True
        End If
    End If
End Sub

' --- Série D, suite : les FILS (segment de connexion, fil par une collection
' de points, câble), les BLOCS (pris sur la graine, ou de l'environnement,
' posés sur la cible) et la recopie d'un FOLIO.
Private Sub BatSerieD2()
    Dim ne As Long, de As String, avant As String, apres As String, tg As Object, cb As Object, st As Object, t As Variant, maj As String
    Dim x As Object, q1 As Object, q2 As Object, x1 As Double, y1 As Double, x2 As Double, y2 As Double
    Dim rien As Object, g As Object, sg As Object, c As Object, blk As Object, n As Long, nb As Long, n2 As Long, n3 As Long
    Dim a As Object, b As Object
    If gSimulation Then Exit Sub
    On Error Resume Next
    If mBatCible Is Nothing Then Exit Sub
    If mBatP1 Is Nothing Or mBatP2 Is Nothing Then
        BatLigne "D20", "les fils et les blocs", "pas fait", "pas de points (série B)"
    Else
        ' D20 : un segment de connexion entre P1 et P2 (le segment : rien, SEE le crée ?), type après type, jusqu'à ce
        ' que l'état de la cible change (des copies de P1 et P2 : ces paramètres sont « par référence », et SEE ne
        ' doit pas pouvoir changer les points gardés)
        If BatPermis("D20") Then
            For Each t In BatTypes()
                Set x = Nothing
                Set a = mBatP1
                Set b = mBatP2
                avant = BatEtat(mBatCible)
                Err.Clear
                mBatCible.AddConnectionSegment x, a, b, CStr(t)
                ne = Err.Number
                de = Err.Description
                apres = BatEtat(mBatCible)
                BatNote "D20", "un fil entre P1 et P2 : AddConnectionSegment(rien, P1, P2, « " & CStr(t) & " »)", ne, de, _
                    "rendu : " & BatObj(x) & " ; cible : " & BatEffet("D20", avant, apres), True
                If mBatMort Then Exit For
                If ne = 0 And avant <> apres And BatLisible(apres) Then Exit For
            Next t
        End If
        If mBatMort Then Exit Sub
        ' D21 : le même, avec le segment de la graine
        If Not mBatSeg Is Nothing Then
            If BatPermis("D21") Then
                Set x = mBatSeg
                Set a = mBatP1
                Set b = mBatP2
                avant = BatEtat(mBatCible)
                Err.Clear
                mBatCible.AddConnectionSegment x, a, b, mBatTypeFil
                ne = Err.Number
                de = Err.Description
                BatNote "D21", "le même, avec un segment de la graine : AddConnectionSegment(segment, P1, P2, « " & mBatTypeFil & " »)", ne, de, _
                    "cible : " & BatEffet("D21", avant, BatEtat(mBatCible)), True
            End If
        End If
        If mBatMort Then Exit Sub
        If mBatColl Is Nothing Then
            BatLigne "D22", "un fil par une collection de points", "pas fait", "pas de collection de points (série B)"
        Else
            ' D22 : un fil par la collection de points, type après type, jusqu'à ce que l'état de la cible change
            If BatPermis("D22") Then
                For Each t In BatTypes()
                    If BatNb(mBatColl) <> 2 Then
                        BatLigne "D22", "un fil par la collection de points", "arrêté", "la collection n'a plus ses deux points (Count = " & BatNb(mBatColl) & ")"
                        Exit For
                    End If
                    Set tg = Nothing
                    Set cb = Nothing
                    Set st = Nothing
                    avant = BatEtat(mBatCible)
                    Err.Clear
                    mBatCible.AddWireConnection mBatColl, CStr(t), tg, cb, st
                    ne = Err.Number
                    de = Err.Description
                    apres = BatEtat(mBatCible)
                    BatNote "D22", "un fil par la collection de points : AddWireConnection(points, « " & CStr(t) & " »)", ne, de, _
                        "câble : " & BatObj(cb) & " ; fil : " & BatObj(st) & " ; cible : " & BatEffet("D22", avant, apres), True
                    If mBatMort Then Exit For
                    If ne = 0 And avant <> apres And BatLisible(apres) Then Exit For
                Next t
            End If
            If mBatMort Then Exit Sub
            ' D23 : un câble fil à fil
            If BatPermis("D23") Then
                Set tg = Nothing
                Set cb = Nothing
                avant = BatEtat(mBatCible)
                Err.Clear
                mBatCible.AddCableWireByWire mBatColl, 0, mBatFamCable, mBatTypeCable, tg, cb
                ne = Err.Number
                de = Err.Description
                BatNote "D23", "un câble fil à fil : AddCableWireByWire(points, 0, « " & mBatFamCable & " », « " & mBatTypeCable & " »)", ne, de, _
                    "câble : " & BatObj(cb) & " ; cible : " & BatEffet("D23", avant, BatEtat(mBatCible)), True
            End If
        End If
        If mBatMort Then Exit Sub
        ' D24 : un câble sur un chemin
        If BatPermis("D24") Then
            Set tg = Nothing
            Set cb = Nothing
            avant = BatEtat(mBatCible)
            Err.Clear
            mBatCible.AddCableOnPath mBatP1, mBatP2, tg, cb
            ne = Err.Number
            de = Err.Description
            BatNote "D24", "un câble de P1 à P2 : AddCableOnPath(P1, P2, rien)", ne, de, _
                "câble : " & BatObj(cb) & " ; cible : " & BatEffet("D24", avant, BatEtat(mBatCible)), True
        End If
        If mBatMort Then Exit Sub
        ' D25, D27 : un bloc pris sur la graine (le rectangle autour de P1 et P2), gardé en mémoire, puis posé sur la
        ' cible (il n'est PAS écrit dans un fichier : les blocs de l'environnement sont communs aux vrais projets)
        If Not mBatGraine Is Nothing Then
            Set blk = Nothing
            If BatPermis("D25") Then
                Set q1 = Nothing
                Set q2 = Nothing
                If LirePointXY(mBatP1, x1, y1) Then
                    If LirePointXY(mBatP2, x2, y2) Then
                        Set q1 = BatNouveauPoint(IIf(x1 < x2, x1, x2) - 30, IIf(y1 < y2, y1, y2) - 30)
                        Set q2 = BatNouveauPoint(IIf(x1 > x2, x1, x2) + 30, IIf(y1 > y2, y1, y2) + 30)
                    End If
                End If
                Set rien = Nothing
                Err.Clear
                mBatGraine.CreateBlock q1, q2, mBatP1, rien, blk
                ne = Err.Number
                de = Err.Description
                BatNote "D25", "prendre un bloc sur la graine, de " & BatPt(q1) & " à " & BatPt(q2) & " (Sheet.CreateBlock)", ne, de, _
                    "rendu : " & BatObj(blk), True
            End If
            If mBatMort Then Exit Sub
            If Not blk Is Nothing Then
                If BatPermis("D27") Then BatPoserBloc "D27", blk, "ce bloc"
            End If
        End If
        ' D28 : un bloc de l'environnement, posé sur la cible
        If mBatMort Then Exit Sub
        If mBatBloc Is Nothing Then
            BatLigne "D28", "poser un bloc de l'environnement", "pas fait", "aucun bloc rendu par l'environnement (ligne A21)"
        Else
            If BatPermis("D28") Then BatPoserBloc "D28", mBatBloc, "le bloc « " & LireProp(mBatBloc, "Name") & " » de l'environnement"
        End If
    End If
    If mBatMort Then Exit Sub
    ' D30, D31 : recopier un folio (la cible) : dans son groupe, puis dans un sous-groupe « BATTERIE »
    Set g = Nothing
    mBatCible.GetGroup g
    If g Is Nothing Then mBatPrj.GetMainGroup g
    If g Is Nothing Then
        BatLigne "D30", "recopier un folio", "pas fait", "groupe illisible"
        Exit Sub
    End If
    If BatPermis("D30") Then
        n = BatNbFolios()
        Set x = mBatCible
        Err.Clear
        g.AddSheet x
        ne = Err.Number
        de = Err.Description
        nb = BatNbFolios()
        If n >= 0 And nb >= 0 And nb <> n Then BatVu "D30"
        BatNote "D30", "recopier le folio cible dans son groupe (Group.AddSheet)", ne, de, "folios du projet : " & n & " -> " & nb, True
    End If
    If mBatMort Then Exit Sub
    If BatPermis("D31") Then
        Set sg = Nothing
        g.GetSubGroupByName "BATTERIE", sg
        If sg Is Nothing Then g.CreateSubGroup "BATTERIE", sg
        If sg Is Nothing Then
            BatLigne "D31", "mettre le folio cible dans un sous-groupe", "pas fait", "sous-groupe « BATTERIE » ni trouvé ni créé"
        Else
            Set c = Nothing
            sg.GetSheetCollection c
            n2 = BatNb(c)
            n = BatNbFolios()
            Set x = mBatCible
            Err.Clear
            sg.AddSheet x
            ne = Err.Number
            de = Err.Description
            nb = BatNbFolios()
            Set c = Nothing
            sg.GetSheetCollection c
            n3 = BatNb(c)
            If n >= 0 And nb >= 0 And nb <> n Then BatVu "D31"
            If n2 >= 0 And n3 >= 0 And n3 <> n2 Then BatVu "D31"
            BatNote "D31", "mettre le folio cible dans le sous-groupe « BATTERIE » (Group.AddSheet)", ne, de, _
                "folios du projet : " & n & " -> " & nb & " ; folios du sous-groupe : " & n2 & " -> " & n3, True
        End If
    End If
    If mBatMort Then Exit Sub
    ' D32, en dernier (le format du folio peut changer) : mettre sur la cible un cartouche de l'environnement
    If Not mBatEnv Is Nothing Then
        Set x = BatDernier(SEE_Cartouches(mBatEnv, False))
        If Not x Is Nothing Then
            If BatPermis("D32") Then
                avant = LireProp(SEE_CartoucheDuFolio(mBatCible), "Name")
                Err.Clear
                mBatCible.SetTitleBlock x
                ne = Err.Number
                de = Err.Description
                maj = ""
                If ne = 0 Then maj = BatMaj(mBatCible, ne, de)
                apres = LireProp(SEE_CartoucheDuFolio(mBatCible), "Name")
                If apres <> avant And Left$(apres, 4) <> "#ERR" And Left$(avant, 4) <> "#ERR" Then BatVu "D32"
                BatNote "D32", "mettre sur la cible le cartouche « " & LireProp(x, "Name") & " » de l'environnement (Sheet.SetTitleBlock, Update)", ne, de, _
                    "avant « " & avant & " », relu « " & apres & " »" & maj, True
            End If
        End If
    End If
End Sub

' Project.Save, toujours essayé (au bureau, rien n'avait jamais été dessiné : Save n'a jamais été appelé) : après les
' essais qui changent l'existant (S01), après les fils et les blocs (S02), et après une liste de fils entrée (S03).
Private Sub BatSauver(ByVal code As String)
    Dim ne As Long, de As String
    If gSimulation Then Exit Sub
    On Error Resume Next
    mBatSauve = False
    If Not BatPermis(code) Then Exit Sub
    Err.Clear
    mBatPrj.Save
    ne = Err.Number
    de = Err.Description
    mBatSauve = (ne = 0)
    BatNote code, "enregistrer le projet d'essai (Project.Save)", ne, de, "IsModified après : " & LirePropOuMethode(mBatPrj, "IsModified")
End Sub

' Le fichier d'essai simple d'EssaiWD (celui que SEE importe par ses menus), à côté du projet, sinon à côté du classeur.
Private Function BatFichierWD() As String
    Dim d As Variant, f As String, m As Variant
    On Error Resume Next
    BatFichierWD = ""
    For Each m In Array("Essai-WD-3.10.xml", "Essai-WD-3*.xml")
        For Each d In Array(mBatRacine, ThisWorkbook.Path & "\")
            If Len(CStr(d)) > 1 Then
                f = Dir$(CStr(d) & CStr(m))
                If Len(f) > 0 Then
                    BatFichierWD = CStr(d) & f
                    Exit Function
                End If
            End If
        Next d
    Next m
End Function

' Le texte d'un fichier (sans accent : la marque de tête UTF-8 est retirée).
Private Function BatTexteFichier(ByVal f As String) As String
    Dim h As Integer, b As String, n As Long
    On Error Resume Next
    BatTexteFichier = ""
    If Len(Dir$(f)) = 0 Then Exit Function
    n = FileLen(f)
    If n <= 0 Or n > 2000000 Then Exit Function
    h = FreeFile
    Open f For Binary Access Read As #h
    b = String$(n, " ")
    Get #h, 1, b
    Close #h
    If Left$(b, 3) = Chr$(239) & Chr$(187) & Chr$(191) Then b = Mid$(b, 4)
    BatTexteFichier = b
End Function

' --- Série C : les voies par FICHIER, en dernier (après Save : ce qui a été
' dessiné ne peut plus être perdu). CreateObject pour mémoire ; l'aller-retour
' ExtractData -> ImportData du même fichier ; la liste de fils XML d'EssaiWD
' (celle que SEE importe par File > Import > Wire List), sans fenêtre.
Private Sub BatSerieC()
    Dim ne As Long, de As String, v As Variant, f As String, t As Long, x As Object, c As Object, wn As Object, cab As Object, lg As String
    Dim xml As String, vx As Variant, importe As Boolean, sans As String, ecrit As Boolean
    If gSimulation Then Exit Sub
    On Error Resume Next
    If BatPermis("C01") Then
        Set x = Nothing
        Set c = mBatPrj
        Err.Clear
        gApp.CreateObject OBJ_POINT, c, x
        ne = Err.Number
        de = Err.Description
        Set c = Nothing
        BatNote "C01", "pour mémoire : SeeAutomation.CreateObject(12 point, projet)", ne, de, "rendu : " & BatObj(x)
    End If
    If Len(mBatDossier) > 0 Then
        If BatPermis("C02") Then
            For t = 1 To 12
                f = mBatDossier & "\donnees" & t & ".mdb"
                v = Empty
                Err.Clear
                v = mBatPrj.ExtractData(t, f)
                ne = Err.Number
                de = Err.Description
                ' (calculé d'abord : sous On Error Resume Next, une condition qui lève une erreur ferait entrer dans le bloc)
                ecrit = False
                ecrit = (Len(Dir$(f)) > 0)
                If ecrit Then
                    BatNote "C02", "ExtractData(" & t & ") : SEE écrit ses données dans un fichier", ne, de, DiagFichier(f)
                    v = Empty
                    Err.Clear
                    v = mBatPrj.ImportData(t, f)
                    ne = Err.Number
                    de = Err.Description
                    BatNote "C03", "ImportData(" & t & ") : SEE relit ce fichier, non modifié", ne, de, "rendu : " & DiagValeur(v), True
                Else
                    sans = sans & IIf(Len(sans) > 0, ", ", "") & t & " (" & CodeDeWindows(ne) & ")"
                    ' (sans fichier, pas de ligne : une chute de SEE doit quand même être vue)
                    If BatSEEParti(ne) Then BatNote "C02", "ExtractData(" & t & ")", ne, de, "SEE ne répond plus"
                End If
                If mBatMort Then Exit For
            Next t
            If Len(sans) > 0 Then BatLigne "C02", "ExtractData : les types qui n'écrivent pas de fichier", "pas de fichier", sans
        End If
    End If
    If mBatMort Then Exit Sub
    ' la liste de fils XML, sans fenêtre
    Set wn = ObjetProp(ObjetProp(mBatPrj, "Process"), "WireNumbering")
    f = BatFichierWD()
    If Len(f) = 0 Then
        BatLigne "C04", "importer une liste de fils sans fenêtre", "pas fait", _
            "aucun fichier Essai-WD-3*.xml à côté du projet ni du classeur : fais d'abord EssaiWD (partie 1, point 3 du LIS-MOI), puis reclique sur le bouton 3"
    Else
        If BatPermis("C04") Then
            vx = f
            Err.Clear
            mBatPrj.ImportWireList vx, False, False
            ne = Err.Number
            de = Err.Description
            If ne = 0 Then importe = True
            BatNote "C04", "importer « " & NomDeFichier(f) & " » sans fenêtre (Project.ImportWireList)", ne, de, "", True
        End If
        If Not wn Is Nothing Then
            xml = BatTexteFichier(f)
            If BatPermis("C05") Then
                lg = ""
                Err.Clear
                wn.UpdateWireList xml, lg
                ne = Err.Number
                de = Err.Description
                If ne = 0 Then importe = True
                BatNote "C05", "la même liste par son TEXTE (WireNumbering.UpdateWireList)", ne, de, "journal de SEE : " & BatDebut(lg, 200), True
            End If
            If BatPermis("C06") Then
                lg = ""
                Err.Clear
                wn.UpdateWireList f, lg
                ne = Err.Number
                de = Err.Description
                If ne = 0 Then importe = True
                BatNote "C06", "la même liste par son CHEMIN (WireNumbering.UpdateWireList)", ne, de, "journal de SEE : " & BatDebut(lg, 200), True
            End If
        End If
    End If
    ' la liste « de - vers » lue à la série A, renvoyée telle quelle
    If Not wn Is Nothing And Len(mBatFromTo) > 0 Then
        If BatPermis("C07") Then
            lg = ""
            Err.Clear
            wn.Update mBatFromTo, lg
            ne = Err.Number
            de = Err.Description
            BatNote "C07", "renvoyer à SEE sa liste « de - vers », non modifiée (WireNumbering.Update)", ne, de, "journal de SEE : " & BatDebut(lg, 200), True
        End If
    End If
    ' le câblage, seulement si une liste de fils est entrée
    If importe Then
        Set cab = ObjetProp(ObjetProp(mBatPrj, "Process"), "Cabling")
        If Not cab Is Nothing Then
            If BatPermis("C08") Then
                Err.Clear
                cab.Update
                ne = Err.Number
                de = Err.Description
                BatNote "C08", "le câblage du projet, la liste de fils étant entrée (Process.Cabling.Update)", ne, de, "", True
            End If
        End If
        BatSauver "S03"
    End If
End Sub

' Le résumé : en haut de la feuille Batterie (la partie jaune), et dans le bloc du bouton 3 (étapes 6 à 8).
Private Sub BatBilan()
    Dim l As Long, s As String, suite As String
    On Error Resume Next
    l = 0
    LigneResultat mBatWs, l, "BATTERIE", "Version " & BAT_VERSION & ". Bouton 3 du " & Format$(Now, "yyyy-mm-dd hh:mm") & _
        ". Prends en photo TOUTE cette feuille, du haut jusqu'à la dernière ligne (plusieurs photos en descendant)."
    LigneResultat mBatWs, l, "Essais", (mBatOK + mBatKO) & " essais : " & mBatOK & " OK, " & mBatKO & " refusés ou illisibles"
    LigneResultat mBatWs, l, "Écritures", IIf(Len(mBatEcrits) > 0, "SEE a ACCEPTÉ : " & mBatEcrits, "SEE n'a accepté AUCUNE écriture")
    LigneResultat mBatWs, l, "Effet relu", IIf(Len(mBatVus) > 0, "CHANGEMENT relu pour : " & mBatVus, "aucun changement relu")
    LigneResultat mBatWs, l, "Enregistré", IIf(mBatSauve, "oui (Project.Save)", "NON (lignes S01, S02)")
    If mBatSansGraine Then
        LigneResultat mBatWs, l, "ATTENTION", "PAS DE GRAINE : aucun folio du projet n'a de symbole. Fais la partie 2 du LIS-MOI (dessiner la graine), puis reclique sur le bouton 3."
        mConsigne3 = "PAS DE GRAINE : aucun folio du projet d'essai n'a de symbole. Fais la partie 2 du LIS-MOI (dessiner la graine à la main), puis reclique sur " & _
            Bouton3Ici() & "." & IIf(Len(mConsigne3) > 0, vbLf & mConsigne3, "")
    End If
    If mBatMort Then
        If Len(mBatAjoute) > 0 Then
            suite = "Prends les photos, puis reclique sur le bouton 3 : la batterie sautera ce qui a fait tomber SEE et fera les autres essais. " & _
                "Si SEE retombe au même essai, reclique encore une fois : il sera sauté."
        Else
            suite = "Cet essai ne peut pas être sauté : ne reclique pas. Prends les photos et passe à la partie 5 du LIS-MOI."
        End If
        LigneResultat mBatWs, l, "SEE EST TOMBÉ", "à l'essai " & mBatTombe & ". " & suite
        mConsigne3 = "SEE est tombé (ou a été arrêté) à l'essai " & mBatTombe & ". " & Replace(suite, "le bouton 3", Bouton3Ici()) & _
            IIf(Len(mConsigne3) > 0, vbLf & mConsigne3, "")
    End If
    If Len(mBatSautes) > 0 Then LigneResultat mBatWs, l, "Essais sautés", mBatSautes & " (SEE y était tombé ou bloqué, ou juste après)"
    If Len(mBatAjoute) > 0 Then
        LigneResultat mBatWs, l, "À sauter ensuite", Replace(mBatAjoute, ",", ", ") & _
            IIf(InStr(1, mBatAjoute, "?", vbBinaryCompare) > 0, " (avec « ? » : refait une fois, sauté s'il fait retomber SEE)", "")
    End If
    mBatWs.Range(mBatWs.Cells(1, 1), mBatWs.Cells(l, 4)).Interior.Color = RGB(255, 242, 204)
    mBatWs.Columns(1).ColumnWidth = 11
    mBatWs.Columns(2).ColumnWidth = 62
    mBatWs.Columns(3).ColumnWidth = 13
    mBatWs.Columns(4).ColumnWidth = 95
    mBatWs.Columns(2).WrapText = True
    mBatWs.Columns(4).WrapText = True
    mBatWs.Rows.VerticalAlignment = -4160
    s = "BATTERIE : " & (mBatOK + mBatKO) & " essais, " & mBatOK & " OK (feuille Batterie)" & vbLf & _
        IIf(Len(mBatEcrits) > 0, "écritures ACCEPTÉES par SEE : " & mBatEcrits, "SEE n'a accepté AUCUNE écriture") & vbLf & _
        IIf(Len(mBatVus) > 0, "CHANGEMENT relu pour : " & mBatVus, "aucun changement relu")
    If mBatMort Then s = s & vbLf & "SEE EST TOMBÉ à l'essai " & mBatTombe
    If mBatSansGraine Then s = s & vbLf & "PAS DE GRAINE (aucun symbole dans le projet)"
    NoterEtape3 6, s
    NoterEtape3 7, IIf(mBatSauve, "oui (Project.Save)", "NON (lignes S01, S02 de la feuille Batterie)")
    NoterEtape3 8, "pas refait (déjà relevé le 3 novembre : 117 familles)"
End Sub
