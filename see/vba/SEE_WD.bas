Attribute VB_Name = "SEE_WD"
' ============================================================================
'  SEE_WD - la LISTE DE FILS XML que SEE importe (File > Import > Wire List)
' ----------------------------------------------------------------------------
'  Établi au bureau le 5 novembre 2026 : SEE refuse de créer des objets par
'  son API et sa licence refuse les imports DXF et Excel, mais File > Import >
'  Wire List importe une liste de fils XML (racine IGE-XAO_WIRE_HARNESS), que
'  SEE valide contre son schéma « IGE-XAO Wiring Diagram <version>.xsd » (le
'  dossier ...\SEE_Soft\PARAM\XSD de SEE Electrical Expert). Ensuite, Insert >
'  From Wiring list pose les composants importés (see/FORMAT-WD.md).
'  Rien ici ne touche SEE : on lit le disque et le paquet, on écrit des
'  fichiers et des feuilles du classeur ; Windows (MSXML 6, ValiderXmlParXsd
'  de SEE_Windows) vérifie chaque XML contre le schéma de SEE.
'
'    ExporterWD    LA LISTE DE FILS DU PAQUET (Alt+F8) : le paquet de
'                  l'Atelier choisi dans la fenêtre « Ouvrir », un fichier
'                  « WD-<nom du folio>.xml » par folio et « WD-TOUT.xml » (un
'                  WireHarness par folio), dans le dossier « WD-<nom du
'                  paquet> », à côté du paquet ; chacun vérifié par Windows ;
'                  la feuille Export_WD, puis une boîte courte
'    EssaiWD       une petite liste de fils (deux connecteurs, deux fils)
'                  pour chaque schéma « Wiring Diagram » trouvé, puis les
'                  essais « plus » (équipements, paire, bornier, masse,
'                  épissure ; avec et sans WireDiagram) (Essai_WD)
'    LireFormatWD  les schémas et les XML trouvés sous IGE+XAO, décrits
'                  élément par élément (Format_WD)
'  Les outils du schéma : ParcourirIGE (les XSD sous IGE+XAO), SchemasWD (les
'  schémas du Wiring Diagram, du plus haut au plus bas), AnalyserXSD (un
'  schéma lu balise par balise), AttributDuSchema (un attribut permis, et son
'  type), EchapperXml (une valeur d'attribut XML).
' ============================================================================
Option Explicit

' Les dossiers où SEE Electrical Expert est installé (le banc y met le sien : tests/banc-vba/banc.py).
Private Const RACINES_IGE As String = "C:\Program Files (x86)\IGE+XAO|C:\Program Files\IGE+XAO"
Private Const TITRE_WD As String = "Pilote SEE - ExporterWD"
Private Const FEUILLE_EXPORT As String = "Export_WD"
Private Const VERSION_DEFAUT As String = "3.10"     ' sans schéma trouvé : la version importée au bureau
Private Const ERREURS_MONTREES As Long = 5          ' erreurs de Windows montrées sous un fichier refusé
Private Const LIGNE_TABLEAU As Long = 8             ' Export_WD : l'en-tête du tableau des fichiers (au-dessus : la photo)
Private Const DECLARATION_XML As String = "<?xml version=""1.0"" encoding=""UTF-8""?>"
Private Const FIN_XML As String = "</IGE-XAO_WIRE_HARNESS>"
' Les attributs de la liste de fils d'essai que SEE a importée au bureau (EssaiWD, schéma 3.10 ; valide aussi en 3.07
' à 3.09) : toujours écrits. Les autres ne le sont que si le schéma lu les permet.
Private Const ATTRIBUTS_SURS As String = "|IGE-XAO_WIRE_HARNESS.EDB_InstanceID|IGE-XAO_WIRE_HARNESS.XSDversion|IGE-XAO_WIRE_HARNESS.LengthUnit|WireHarness.Tag|ConnectiveDevice.Tag|ConnectiveDevice.Type|ConnectiveDevice.ConnectivityType|Pin.Tag|Wire.Tag|Wire.Wire_Type|Wire.Gauge|Wire.Length|Wire.Length_Status|Wire.Type|Wire.Segregation|WireExtremity.ID|WireExtremity.WireTag|WireExtremity.Pin|WireExtremity.PinParent|"

' --- le schéma retenu par ExporterWD (LireSchemaWD)
Private mSchemaLu As Boolean          ' Vrai : un schéma 3.xx est lu ; Faux : 3.10 par défaut, sans vérification
Private mAttrs As Object              ' contexte -> ses attributs (AnalyserXSD)
Private mEnfants As Object            ' contexte -> ses enfants
Private mContextes As Object          ' nom d'élément -> son contexte (« complexType cWire », « élément ConnectiveDevice »)
Private mRegles As Object             ' « élément.attribut » -> -1 (pas écrit) ou sa longueur maximale (0 : pas de limite dite)

' --- l'export en cours
Private mEcarts As Collection         ' ce qui ne s'écrit pas tel quel : Array(folio, quoi, détail)

' --- le folio en cours (ConstruireFolioWD) ; un appareil a une clé : « B|repère » (son corps), « C|repère|lettre »
'     (un connecteur d'équipement), « P|repère|FICHE » ou « P|repère|EMBASE » (une moitié de prise)
Private mDev As Collection            ' les clés des appareils, dans l'ordre
Private mDevTag As Object             ' clé -> son Tag (coupé, unique dans le folio)
Private mTagPris As Object            ' Tag -> Vrai
Private mDevType As Object            ' clé -> Type : Equipment, Connector, TB, GB
Private mDevPN As Object              ' clé -> PartNumber
Private mDevLibelle As Object         ' clé -> Description
Private mDevParent As Object          ' clé -> clé de son équipement (ParentTag d'un connecteur)
Private mDevPrise As Object           ' clé -> ConnectivityType (Plug, Receptacle)
Private mDevAccouple As Object        ' clé -> clé de l'autre moitié de la prise (MatingTag)
Private mDevBroches As Object         ' clé -> Collection des Tag de ses broches, dans l'ordre
Private mBroche As Object             ' clé & "|" & Borne -> Tag de sa broche
Private mBrochePrise As Object        ' clé & "|" & Tag d'une broche -> Vrai (unique dans l'appareil)
Private mNatureDe As Object           ' Bloc -> Nature
Private mRepereDe As Object           ' Bloc -> Repere
Private mAppareilDuBout As Object     ' Bloc|Borne|Côté (la clé que citent les fils) -> clé de l'appareil ("" : aucun)
Private mBlocsSignales As Object      ' les blocs absents de la feuille Blocs, déjà dits
Private mFilPris As Object            ' Tag de fil -> Vrai
Private mNbEquipements As Long        ' les comptes du folio (ou de WD-TOUT)
Private mNbConnecteurs As Long
Private mNbBarrettes As Long
Private mNbMasses As Long
Private mNbBroches As Long
Private mNbFils As Long
Private mNbBouts As Long

' ============================================================================
'  LireFormatWD (Alt+F8) : le format de la liste de fils XML (WD) que SEE
'  importe par Fichier > Import > Wire List. SEE la valide avec un schéma XSD
'  livré dans ..\See_Soft\Param\XSD\. Lecture du disque seulement, sans SEE.
'  Feuille Format_WD : les schémas et les XML trouvés sous IGE+XAO, puis, pour
'  chaque schéma retenu (WD, Wire, Harness, Cabl dans le nom), une ligne par
'  élément ou type : ses attributs (* = obligatoire) et ses enfants.
' ============================================================================
Public Sub LireFormatWD()
    Dim ws As Object, l As Long, r As Variant, dossiers As Collection, d As String, f As String, i As Long, a As Long
    Dim xsd As Collection, xmls As Collection, p As Variant, nb As Long, retenus As Collection, n As String
    On Error Resume Next
    Set ws = FeuilleCreee("Format_WD", True)
    l = 1
    EcrireLigne ws, l, Array("Quoi", "Fichier ou contexte", "Détail", "Suite")
    ws.Rows(1).Font.Bold = True
    i = ParcourirIGE(xsd, xmls)
    l = l + 1
    EcrireLigne ws, l, Array("dossiers parcourus", CStr(i), xsd.Count & " schéma(s) XSD, " & xmls.Count & " XML (WD, wire, harness, cabl)", "")
    ' retenus : d'abord les schémas de SEE Electrical Expert (son dossier Param\XSD), puis les noms qui parlent de fils ;
    ' décrits en premier (le haut de la feuille), puis les XML, puis la liste de tous les schémas
    Set retenus = New Collection
    For Each p In xsd
        If InStr(1, CStr(p), "Electrical Expert", vbTextCompare) > 0 And retenus.Count < 8 Then retenus.Add CStr(p)
    Next p
    For Each p In xsd
        n = LCase$(Mid$(CStr(p), InStrRev(CStr(p), "\") + 1))
        If InStr(1, CStr(p), "Electrical Expert", vbTextCompare) = 0 And (InStr(n, "wd") > 0 Or InStr(n, "wir") > 0 Or InStr(n, "cabl") > 0) Then
            If retenus.Count < 8 Then retenus.Add CStr(p)
        End If
    Next p
    For Each p In retenus
        l = l + 1
        EcrireLigne ws, l, Array("SCHÉMA", Mid$(CStr(p), InStrRev(CStr(p), "\") + 1), "une ligne par élément ou type : attributs (* obligatoire) ; enfants", _
            Left$(CStr(p), InStrRev(CStr(p), "\") - 1))
        ws.Rows(l).Font.Bold = True
        DecrireXSD TexteDeFichier(CStr(p)), ws, l
        If l > 1500 Then Exit For
    Next p
    For Each p In xmls
        l = l + 1
        EcrireLigne ws, l, Array("XML", Mid$(CStr(p), InStrRev(CStr(p), "\") + 1), FileLen(CStr(p)) & " o", DebutDeFichier(CStr(p), 300))
    Next p
    For Each p In xsd
        l = l + 1
        EcrireLigne ws, l, Array("XSD", Mid$(CStr(p), InStrRev(CStr(p), "\") + 1), FileLen(CStr(p)) & " o", Left$(CStr(p), InStrRev(CStr(p), "\") - 1))
    Next p
    ws.Columns("A:B").AutoFit
    ws.Columns("C").ColumnWidth = 90
    ws.Columns("C").WrapText = True
    ws.Columns("D").ColumnWidth = 60
    ws.Columns("D").WrapText = True
    MontrerFeuille ws
    Dialogue "Format_WD : " & xsd.Count & " schéma(s), " & retenus.Count & " décrit(s), " & xmls.Count & " XML." & vbCrLf & vbCrLf & _
        "Clique sur OK, puis prends en photo TOUTE la feuille Format_WD, en descendant.", vbOKOnly + vbInformation, "Pilote SEE"
End Sub

' Les schémas XSD et les XML de fils (WD, wire, harness, schemat, cabl dans le
' nom, sous SEE Electrical Expert) des dossiers IGE+XAO (RACINES_IGE). Rend le
' nombre de dossiers parcourus (au plus 6000).
Private Function ParcourirIGE(ByRef xsd As Collection, ByRef xmls As Collection) As Long
    Dim r As Variant, dossiers As Collection, d As String, f As String, i As Long, a As Long, n As String
    On Error Resume Next
    Set dossiers = New Collection
    Set xsd = New Collection
    Set xmls = New Collection
    For Each r In Split(RACINES_IGE, "|")
        If Len(Dir$(CStr(r), vbDirectory)) > 0 Then dossiers.Add CStr(r)
    Next r
    i = 1
    Do While i <= dossiers.Count And i <= 6000
        d = dossiers.Item(i)
        f = Dir$(d & "\*", vbDirectory Or vbHidden Or vbSystem)
        Do While Len(f) > 0
            If f <> "." And f <> ".." Then
                a = 0
                a = GetAttr(d & "\" & f)
                If (a And vbDirectory) = vbDirectory Then
                    dossiers.Add d & "\" & f
                ElseIf LCase$(Right$(f, 4)) = ".xsd" Then
                    xsd.Add d & "\" & f
                ElseIf LCase$(Right$(f, 4)) = ".xml" And InStr(1, d, "Electrical Expert", vbTextCompare) > 0 Then
                    n = LCase$(f)
                    If InStr(n, "wd") > 0 Or InStr(n, "wir") > 0 Or InStr(n, "harness") > 0 Or InStr(n, "schemat") > 0 Or InStr(n, "cabl") > 0 Then xmls.Add d & "\" & f
                End If
            End If
            f = Dir$()
        Loop
        i = i + 1
    Loop
    ParcourirIGE = i - 1
End Function

' ============================================================================
'  EssaiWD (Alt+F8) : une petite liste de fils XML (2 connecteurs, 4 broches,
'  2 fils), pour CHAQUE schéma « IGE-XAO Wiring Diagram *.xsd » de SEE
'  Electrical Expert (2.18, 3.10...) : Essai-WD-<version>.xml, écrit dans le
'  dossier du projet d'essai (réglage Projet : celui que la fenêtre « Wire
'  List » de SEE ouvre), sinon à côté du classeur, puis VÉRIFIÉ par Windows
'  (MSXML 6) contre son schéma. Un attribut n'est écrit que si le schéma le
'  permet (WiresNumber, Class : la 2.18 les exige, la 3.10 les refuse).
'  Puis, pour le schéma qu'ExporterWD retient (le plus haut des 3.xx), les
'  essais « plus » : Essai-WD-plus-<version>.xml (équipements avec et sans
'  classe, leurs connecteurs, une paire en ligne, un bornier, une masse, une
'  épissure) et Essai-WD-plus-diagramme-<version>.xml (le même, avec un
'  WireDiagram), vérifiés de même (bureau, 5 novembre : la 3.10 refuse TB et
'  GB, elle dit TerminalBlock et GroundBlock).
'  Feuille Essai_WD : un verdict par fichier, chaque erreur, les règles des
'  types de la plus haute version, les attributs que le schéma permet. Sans SEE.
' ============================================================================
Public Sub EssaiWD()
    Dim ws As Object, l As Long, xsd As Collection, xmls As Collection, schemas As Collection, p As Variant, t As String, n As String
    Dim attrs As Object, enfants As Object, ordre As Collection, entete As String, espace As String, cheminXml As String, version As String
    Dim erreurs As Collection, e As Variant, ok As Boolean, k As Variant, ecrit As Boolean, dossier As String, nomDossier As String
    Dim bilan As String, premier As Boolean, nbFils As Boolean, classe As Boolean, nomXml As String, trouves As Collection
    Dim permis As String, requis As String, typeBornier As String, typeMasse As String, j As Long
    On Error Resume Next
    Set ws = FeuilleCreee("Essai_WD", True)
    l = 1
    EcrireLigne ws, l, Array("Quoi", "Nom", "Détail")
    ws.Rows(1).Font.Bold = True
    ParcourirIGE xsd, xmls
    ' les schémas du Wiring Diagram de SEE Electrical Expert, de la plus haute version à la plus basse (au plus 4)
    Set trouves = SchemasWD(xsd)
    Set schemas = New Collection
    For Each p In trouves
        If schemas.Count < 4 Then schemas.Add CStr(p)
    Next p
    If schemas.Count = 0 Then
        l = l + 1
        EcrireLigne ws, l, Array("VERDICT", "schéma", "INTROUVABLE : aucun « Wiring Diagram *.xsd » sous SEE Electrical Expert (" & xsd.Count & " XSD en tout)")
        MontrerFeuille ws
        Dialogue "EssaiWD : le schéma de SEE est introuvable. Prends en photo la feuille Essai_WD.", vbOKOnly + vbExclamation, "Pilote SEE"
        Exit Sub
    End If
    ' le dossier : celui du projet d'essai (la fenêtre « Wire List » de SEE s'y ouvre), sinon celui du classeur
    dossier = Reglage("Projet", "")
    If InStrRev(dossier, "\") > 0 Then dossier = Left$(dossier, InStrRev(dossier, "\") - 1) Else dossier = ""
    If Len(dossier) = 0 Or Len(Dir$(dossier, vbDirectory)) = 0 Then dossier = ThisWorkbook.Path
    nomDossier = Mid$(dossier, InStrRev(dossier, "\") + 1)
    premier = True
    For Each p In schemas
        n = Mid$(CStr(p), InStrRev(CStr(p), "\") + 1)
        version = VersionDuSchema(CStr(p))
        t = TexteDeFichier(CStr(p))
        Set attrs = NouveauDico()
        Set enfants = NouveauDico()
        Set ordre = New Collection
        AnalyserXSD t, attrs, enfants, ordre, entete
        espace = AttrXml(entete, "targetNamespace")
        nbFils = AttributPermis(attrs, enfants, "complexType cWireHarness", "WiresNumber")
        classe = AttributPermis(attrs, enfants, "complexType cWire", "Class")
        nomXml = "Essai-WD-" & version & ".xml"
        cheminXml = dossier & "\" & nomXml
        ecrit = EcrireFichierTexte(cheminXml, XmlEssaiWD(version, espace, nbFils, classe))
        Set erreurs = New Collection
        ok = False
        If ecrit Then ok = ValiderXmlParXsd(cheminXml, CStr(p), espace, erreurs)
        l = l + 1
        EcrireLigne ws, l, Array("VERDICT", nomXml, IIf(Not ecrit, "PAS ÉCRIT (dossier « " & nomDossier & " » en lecture seule ?)", _
            IIf(ok, "VALIDE (schéma " & n & ")", "REFUSÉ : " & erreurs.Count & " erreur(s), ci-dessous")) & _
            " ; WiresNumber " & IIf(nbFils, "écrit", "absent du schéma") & ", Class " & IIf(classe, "écrit", "absent du schéma"))
        ws.Rows(l).Font.Bold = True
        For Each e In erreurs
            l = l + 1
            EcrireLigne ws, l, Array("erreur", version, MasquerChemins(CStr(e)))
        Next e
        bilan = bilan & IIf(Len(bilan) > 0, ", ", "") & version & IIf(ok, " VALIDE", " REFUSÉ")
        If premier Then
            ' les règles des types de la plus haute version
            For Each k In Array("tEDB_InstanceID", "tXSDVersion", "tLengthUnit", "tTag", "tExtendedTag", "tWireType", "tGauge", "tSegregation", "tColor")
                If attrs.Exists("simpleType " & CStr(k)) Or enfants.Exists("simpleType " & CStr(k)) Then
                    l = l + 1
                    EcrireLigne ws, l, Array("type " & version, CStr(k), Left$(ListeDe(enfants, "simpleType " & CStr(k)) & " ; " & ListeDe(attrs, "simpleType " & CStr(k)), 1500))
                End If
            Next k
            premier = False
        End If
    Next p
    ' les essais « plus », pour le schéma qu'ExporterWD retient (le plus haut des 3.xx ; aucun : le plus haut) : des
    ' équipements (avec et sans classe), leurs connecteurs, une paire en ligne, un connecteur seul, un bornier, une masse,
    ' une épissure ; puis la même liste avec un WireDiagram
    p = SchemaRetenuWD(trouves)
    If Len(CStr(p)) = 0 Then p = schemas.Item(1)
    n = Mid$(CStr(p), InStrRev(CStr(p), "\") + 1)
    version = VersionDuSchema(CStr(p))
    Set attrs = NouveauDico()
    Set enfants = NouveauDico()
    Set ordre = New Collection
    AnalyserXSD TexteDeFichier(CStr(p)), attrs, enfants, ordre, entete
    espace = AttrXml(entete, "targetNamespace")
    permis = PermisWD(attrs, enfants)
    ' le bornier et la masse : TerminalBlock et GroundBlock (3.10), TB et GB si le schéma ne connaît qu'eux (2.18)
    typeBornier = TypeDuSchemaWD(attrs, "TerminalBlock", "TB")
    typeMasse = TypeDuSchemaWD(attrs, "GroundBlock", "GB")
    requis = AttributsRequis(attrs, enfants, "complexType cWireDiagram")
    l = l + 1
    EcrireLigne ws, l, Array("permis " & version, "attributs écrits", Replace(Mid$(permis, 2), "|", ", ") & " ; WireDiagram exige : " & _
        Replace(Mid$(requis, 2), "|", ", ") & " ; bornier " & typeBornier & ", masse " & typeMasse)
    For j = 0 To 1
        nomXml = IIf(j = 0, "Essai-WD-plus-", "Essai-WD-plus-diagramme-") & version & ".xml"
        If j = 1 And (InStr(1, permis, "|WireDiagram|") = 0 Or Not DiagrammePossible(requis)) Then
            l = l + 1
            EcrireLigne ws, l, Array("VERDICT", nomXml, "PAS ÉCRIT : le schéma n'a pas de WireDiagram, ou il exige " & Replace(Mid$(requis, 2), "|", ", "))
        Else
            cheminXml = dossier & "\" & nomXml
            ecrit = EcrireFichierTexte(cheminXml, XmlEssaiWDPlus(version, espace, permis, j = 1, typeBornier, typeMasse))
            Set erreurs = New Collection
            ok = False
            If ecrit Then ok = ValiderXmlParXsd(cheminXml, CStr(p), espace, erreurs)
            l = l + 1
            EcrireLigne ws, l, Array("VERDICT", nomXml, IIf(Not ecrit, "PAS ÉCRIT (dossier « " & nomDossier & " » en lecture seule ?)", _
                IIf(ok, "VALIDE (schéma " & n & ")", "REFUSÉ : " & erreurs.Count & " erreur(s), ci-dessous")))
            ws.Rows(l).Font.Bold = True
            For Each e In erreurs
                l = l + 1
                EcrireLigne ws, l, Array("erreur", nomXml, MasquerChemins(CStr(e)))
            Next e
            bilan = bilan & ", " & IIf(j = 0, "plus ", "plus-diagramme ") & IIf(ok, "VALIDE", "REFUSÉ")
        End If
    Next j
    l = l + 1
    EcrireLigne ws, l, Array("dossier", nomDossier, "les fichiers Essai-WD-*.xml y sont (" & schemas.Count & " schéma(s) Wiring Diagram trouvé(s))")
    ws.Columns("A:B").AutoFit
    ws.Columns("C").ColumnWidth = 110
    ws.Columns("C").WrapText = True
    MontrerFeuille ws
    Dialogue "EssaiWD : " & bilan & "." & vbCrLf & vbCrLf & "Les fichiers sont dans le dossier « " & nomDossier & " »." & vbCrLf & vbCrLf & _
        "Clique sur OK, puis prends en photo la feuille Essai_WD (le haut).", vbOKOnly + vbInformation, "Pilote SEE"
End Sub

' Vrai si le schéma permet l'attribut nom dans le contexte ctx (AttributDuSchema).
Private Function AttributPermis(ByVal attrs As Object, ByVal enfants As Object, ByVal ctx As String, ByVal nom As String) As Boolean
    Dim typ As String
    AttributPermis = AttributDuSchema(attrs, enfants, ctx, nom, typ)
End Function

' L'attribut nom dans le contexte ctx du schéma : ses attributs, ceux des
' groupes d'attributs qu'il cite et ceux du type qu'il étend (une liste de
' contextes à voir, au plus 20 : pas de récursion). Vrai s'il y est, et typ :
' son type (« tTag », « xs:double » ; "" s'il est déclaré sur place).
Private Function AttributDuSchema(ByVal attrs As Object, ByVal enfants As Object, ByVal ctx As String, ByVal nom As String, _
        ByRef typ As String) As Boolean
    Dim aVoir As Collection, c As String, a As Variant, s As String, tours As Long, p As Long
    typ = ""
    Set aVoir = New Collection
    aVoir.Add ctx
    Do While aVoir.Count > 0 And tours < 20
        tours = tours + 1
        c = aVoir.Item(1)
        aVoir.Remove 1
        For Each a In Split(ListeDe(attrs, c), ", ")
            s = CStr(a)
            If s = nom Or s = nom & "*" Or Left$(s, Len(nom) + 1) = nom & "(" Or Left$(s, Len(nom) + 2) = nom & "*(" Or Left$(s, Len(nom) + 1) = nom & " " Then
                p = InStr(1, s, "(")
                If p > 0 Then typ = Mid$(s, p + 1, InStr(p, s & ")", ")") - p - 1)
                AttributDuSchema = True
                Exit Function
            End If
        Next a
        For Each a In Split(ListeDe(enfants, c), ", ")
            s = CStr(a)
            If Left$(s, 15) = "attributeGroup " Then
                aVoir.Add s
            ElseIf Left$(s, 13) = "extension de " Then
                aVoir.Add "complexType " & Mid$(s, 14)
            End If
        Next a
    Loop
End Function

' La petite liste de fils de l'essai : un faisceau ESSAI_PILOTE, deux
' connecteurs (P1 : broches 1 et 2 ; J1 : broches A et B), deux fils (W1 :
' P1-1 vers J1-A ; W2 : P1-2 vers J1-B). WiresNumber et Class seulement si le
' schéma les permet.
Private Function XmlEssaiWD(ByVal version As String, ByVal espace As String, ByVal avecNbFils As Boolean, ByVal avecClasse As Boolean) As String
    Dim s As String
    s = "<?xml version='1.0' encoding='UTF-8'?>" & vbCrLf
    s = s & "<IGE-XAO_WIRE_HARNESS{NS} EDB_InstanceID='1' XSDversion='{V}' LengthUnit='millimeter'>" & vbCrLf
    s = s & "  <WireHarness Tag='ESSAI_PILOTE' WiresNumber='2'>" & vbCrLf
    s = s & "    <ConnectiveDevicesList>" & vbCrLf
    s = s & "      <ConnectiveDevice Tag='P1' Type='Connector' ConnectivityType='Plug'>" & vbCrLf
    s = s & "        <Pin Tag='1'/>" & vbCrLf & "        <Pin Tag='2'/>" & vbCrLf
    s = s & "      </ConnectiveDevice>" & vbCrLf
    s = s & "      <ConnectiveDevice Tag='J1' Type='Connector' ConnectivityType='Receptacle'>" & vbCrLf
    s = s & "        <Pin Tag='A'/>" & vbCrLf & "        <Pin Tag='B'/>" & vbCrLf
    s = s & "      </ConnectiveDevice>" & vbCrLf
    s = s & "    </ConnectiveDevicesList>" & vbCrLf
    s = s & "    <WiresList>" & vbCrLf
    s = s & "      <Wire Tag='W1' Wire_Type='WIRE' Gauge='22' Length='1000' Length_Status='Manual' Type='Normal' Class='A' Segregation='1'/>" & vbCrLf
    s = s & "      <Wire Tag='W2' Wire_Type='WIRE' Gauge='22' Length='1000' Length_Status='Manual' Type='Normal' Class='A' Segregation='1'/>" & vbCrLf
    s = s & "    </WiresList>" & vbCrLf
    s = s & "    <WiresExtremitiesList>" & vbCrLf
    s = s & "      <WireExtremity ID='W1-1' WireTag='W1' Pin='1' PinParent='P1'/>" & vbCrLf
    s = s & "      <WireExtremity ID='W1-2' WireTag='W1' Pin='A' PinParent='J1'/>" & vbCrLf
    s = s & "      <WireExtremity ID='W2-1' WireTag='W2' Pin='2' PinParent='P1'/>" & vbCrLf
    s = s & "      <WireExtremity ID='W2-2' WireTag='W2' Pin='B' PinParent='J1'/>" & vbCrLf
    s = s & "    </WiresExtremitiesList>" & vbCrLf
    s = s & "  </WireHarness>" & vbCrLf
    s = s & "</IGE-XAO_WIRE_HARNESS>" & vbCrLf
    If Not avecNbFils Then s = Replace(s, " WiresNumber='2'", "")
    If Not avecClasse Then s = Replace(s, " Class='A'", "")
    s = Replace(s, "'", """")
    s = Replace(s, "{V}", version)
    XmlEssaiWD = Replace(s, "{NS}", IIf(Len(espace) > 0, " xmlns=""" & espace & """", ""))
End Function

' Les attributs que le schéma permet pour l'essai « plus », en une chaîne
' « |Class|ParentTag|... | » : ceux d'un ConnectiveDevice (élément local, ou
' type cConnectiveDevice), ParentTag d'une extrémité (ExtParentTag), Class
' d'un fil (WireClass), WiresNumber du faisceau, le WireDiagram (sous la
' racine) et ses Tag, Solution et Version.
Private Function PermisWD(ByVal attrs As Object, ByVal enfants As Object) As String
    Dim s As String, a As Variant, ctx As String
    s = "|"
    ctx = "élément ConnectiveDevice"
    If Len(ListeDe(attrs, ctx)) = 0 And Len(ListeDe(enfants, ctx)) = 0 Then ctx = "complexType cConnectiveDevice"
    For Each a In Array("Class", "ParentTag", "MatingTag", "SymbolFamily", "SymbolName", "Description")
        If AttributPermis(attrs, enfants, ctx, CStr(a)) Then s = s & CStr(a) & "|"
    Next a
    If AttributPermis(attrs, enfants, "complexType cWireExtremity", "ParentTag") Then s = s & "ExtParentTag|"
    If AttributPermis(attrs, enfants, "complexType cWire", "Class") Then s = s & "WireClass|"
    If AttributPermis(attrs, enfants, "complexType cWireHarness", "WiresNumber") Then s = s & "WiresNumber|"
    If InStr(1, ListeDe(enfants, "élément IGE-XAO_WIRE_HARNESS"), "WireDiagram") > 0 Then s = s & "WireDiagram|"
    For Each a In Array("Tag", "Solution", "Version")
        If AttributPermis(attrs, enfants, "complexType cWireDiagram", CStr(a)) Then s = s & "WD" & CStr(a) & "|"
    Next a
    PermisWD = s
End Function

' Les attributs obligatoires (« * ») d'un contexte, ses groupes d'attributs et
' le type qu'il étend compris : « |Tag|Solution| ».
Private Function AttributsRequis(ByVal attrs As Object, ByVal enfants As Object, ByVal ctx As String) As String
    Dim aVoir As Collection, c As String, a As Variant, s As String, r As String, tours As Long, i As Long
    Set aVoir = New Collection
    aVoir.Add ctx
    Do While aVoir.Count > 0 And tours < 20
        tours = tours + 1
        c = aVoir.Item(1)
        aVoir.Remove 1
        For Each a In Split(ListeDe(attrs, c), ", ")
            s = CStr(a)
            i = InStr(s, "*")
            If i > 1 And Left$(s, 1) <> "=" Then
                If InStr(Left$(s, i - 1), " ") = 0 And InStr(Left$(s, i - 1), "(") = 0 Then r = r & "|" & Left$(s, i - 1)
            End If
        Next a
        For Each a In Split(ListeDe(enfants, c), ", ")
            s = CStr(a)
            If Left$(s, 15) = "attributeGroup " Then
                aVoir.Add s
            ElseIf Left$(s, 13) = "extension de " Then
                aVoir.Add "complexType " & Mid$(s, 14)
            End If
        Next a
    Loop
    AttributsRequis = r & "|"
End Function

' Vrai si l'essai sait remplir chaque attribut obligatoire du WireDiagram
' (Tag, Solution, Version).
Private Function DiagrammePossible(ByVal requis As String) As Boolean
    Dim a As Variant
    DiagrammePossible = True
    For Each a In Split(requis, "|")
        If Len(CStr(a)) > 0 Then
            If CStr(a) <> "Tag" And CStr(a) <> "Solution" And CStr(a) <> "Version" Then DiagrammePossible = False
        End If
    Next a
End Function

' Le nom d'un type d'appareil dans un schéma lu : nouveau (3.10 : TerminalBlock,
' GroundBlock), sauf si ses énumérations n'ont que l'ancien (2.18 : TB, GB).
Private Function TypeDuSchemaWD(ByVal attrs As Object, ByVal nouveau As String, ByVal ancien As String) As String
    TypeDuSchemaWD = nouveau
    If ValeurDuSchema(attrs, ancien) And Not ValeurDuSchema(attrs, nouveau) Then TypeDuSchemaWD = ancien
End Function

' Vrai si une énumération du schéma lu a la valeur v (« =v » dans la liste
' d'un contexte : AnalyserXSD).
Private Function ValeurDuSchema(ByVal attrs As Object, ByVal v As String) As Boolean
    Dim k As Variant
    For Each k In attrs.Keys
        If InStr(1, ", " & CStr(attrs.Item(k)) & ", ", ", =" & v & ", ", vbBinaryCompare) > 0 Then
            ValeurDuSchema = True
            Exit Function
        End If
    Next k
End Function

' Un attribut de l'essai « plus », écrit seulement si le schéma le permet (cle dans permis).
Private Function AttrPermis(ByVal permis As String, ByVal cle As String, ByVal nom As String, ByVal valeur As String) As String
    If InStr(1, permis, "|" & cle & "|") > 0 Then AttrPermis = AttributXml(nom, valeur)
End Function

' Un ConnectiveDevice de l'essai « plus » ; broches : « 1;2 » (vide : aucune).
Private Function DevWD(ByVal tag As String, ByVal typ As String, ByVal classe As String, ByVal parent As String, ByVal connectivite As String, _
        ByVal mating As String, ByVal desc As String, ByVal famille As String, ByVal symbole As String, ByVal broches As String, ByVal permis As String) As String
    Dim s As String, b As Variant
    s = "      <ConnectiveDevice" & AttributXml("Tag", tag) & AttributXml("Type", typ)
    If Len(connectivite) > 0 Then s = s & AttributXml("ConnectivityType", connectivite)
    If Len(mating) > 0 Then s = s & AttrPermis(permis, "MatingTag", "MatingTag", mating)
    If Len(parent) > 0 Then s = s & AttrPermis(permis, "ParentTag", "ParentTag", parent)
    If Len(classe) > 0 Then s = s & AttrPermis(permis, "Class", "Class", classe)
    If Len(famille) > 0 Then s = s & AttrPermis(permis, "SymbolFamily", "SymbolFamily", famille)
    If Len(symbole) > 0 Then s = s & AttrPermis(permis, "SymbolName", "SymbolName", symbole)
    If Len(desc) > 0 Then s = s & AttrPermis(permis, "Description", "Description", desc)
    If Len(broches) = 0 Then
        DevWD = s & "/>" & vbCrLf
        Exit Function
    End If
    s = s & ">" & vbCrLf
    For Each b In Split(broches, ";")
        s = s & "        <Pin" & AttributXml("Tag", CStr(b)) & "/>" & vbCrLf
    Next b
    DevWD = s & "      </ConnectiveDevice>" & vbCrLf
End Function

' Une extrémité de fil de l'essai « plus » ; appareil : l'équipement du
' connecteur (ParentTag), s'il en a un et si le schéma le permet.
Private Function BoutEssaiWD(ByVal fil As String, ByVal rang As String, ByVal broche As String, ByVal connecteur As String, ByVal appareil As String, _
        ByVal permis As String) As String
    Dim s As String
    s = "      <WireExtremity" & AttributXml("ID", fil & "-" & rang) & AttributXml("WireTag", fil) & AttributXml("Pin", broche) & _
        AttributXml("PinParent", connecteur)
    If Len(appareil) > 0 Then s = s & AttrPermis(permis, "ExtParentTag", "ParentTag", appareil)
    BoutEssaiWD = s & "/>" & vbCrLf
End Function

' L'essai « plus » : le faisceau ESSAI_PLUS. EQ1 (équipement, classe AC,
' symbole 000 / 0001 : la boîte noire vue dans SEE) et son connecteur EQ1-A ;
' EQ2 et EQ2-A, sans classe ; la paire en ligne P2 / J2 (MatingTag) ; P3, seul
' ; le bornier TB1, la masse GB1 (types TerminalBlock et GroundBlock en 3.x,
' TB et GB en 2.18), l'épissure SP1 ; six fils entre eux.
' diagramme : un WireDiagram WD_ESSAI avant le faisceau.
Private Function XmlEssaiWDPlus(ByVal version As String, ByVal espace As String, ByVal permis As String, ByVal diagramme As Boolean, _
        ByVal typeBornier As String, ByVal typeMasse As String) As String
    Dim s As String, w As Variant
    s = DECLARATION_XML & vbCrLf & "<IGE-XAO_WIRE_HARNESS"
    If Len(espace) > 0 Then s = s & AttributXml("xmlns", espace)
    s = s & AttributXml("EDB_InstanceID", "1") & AttributXml("XSDversion", version) & AttributXml("LengthUnit", "millimeter") & ">" & vbCrLf
    If diagramme Then
        s = s & "  <WireDiagram" & AttrPermis(permis, "WDTag", "Tag", "WD_ESSAI") & AttrPermis(permis, "WDSolution", "Solution", "1") & _
            AttrPermis(permis, "WDVersion", "Version", "1") & "/>" & vbCrLf
    End If
    s = s & "  <WireHarness" & AttributXml("Tag", "ESSAI_PLUS") & AttrPermis(permis, "WiresNumber", "WiresNumber", "6") & ">" & vbCrLf
    s = s & "    <ConnectiveDevicesList>" & vbCrLf
    s = s & DevWD("EQ1", "Equipment", "AC", "", "", "", "EQUIPEMENT 1 AVEC CLASSE", "000", "0001", "", permis)
    s = s & DevWD("EQ1-A", "Connector", "AC", "EQ1", "Receptacle", "", "", "", "", "1;2", permis)
    s = s & DevWD("EQ2", "Equipment", "", "", "", "", "EQUIPEMENT 2 SANS CLASSE", "", "", "", permis)
    s = s & DevWD("EQ2-A", "Connector", "", "EQ2", "Receptacle", "", "", "", "", "1;2", permis)
    s = s & DevWD("P2", "Connector", "AC", "", "Plug", "J2", "", "", "", "1;2", permis)
    s = s & DevWD("J2", "Connector", "AC", "", "Receptacle", "P2", "", "", "", "1;2", permis)
    s = s & DevWD("P3", "Connector", "AC", "", "Plug", "", "", "", "", "1;2", permis)
    s = s & DevWD("TB1", typeBornier, "AC", "", "", "", "", "", "", "1;2", permis)
    s = s & DevWD("GB1", typeMasse, "AC", "", "", "", "", "", "", "1", permis)
    s = s & DevWD("SP1", "Splice", "AC", "", "", "", "", "", "", "1", permis)
    s = s & "    </ConnectiveDevicesList>" & vbCrLf
    s = s & "    <WiresList>" & vbCrLf
    For Each w In Array("W11", "W12", "W13", "W14", "W15", "W16")
        s = s & "      <Wire" & AttributXml("Tag", CStr(w)) & AttributXml("Wire_Type", "WIRE") & AttributXml("Gauge", "22") & AttributXml("Length", "1000") & _
            AttributXml("Length_Status", "Manual") & AttributXml("Type", "Normal") & AttributXml("Segregation", "1") & _
            AttrPermis(permis, "WireClass", "Class", "A") & "/>" & vbCrLf
    Next w
    s = s & "    </WiresList>" & vbCrLf
    s = s & "    <WiresExtremitiesList>" & vbCrLf
    s = s & BoutEssaiWD("W11", "1", "1", "EQ1-A", "EQ1", permis) & BoutEssaiWD("W11", "2", "1", "P2", "", permis)
    s = s & BoutEssaiWD("W12", "1", "2", "EQ1-A", "EQ1", permis) & BoutEssaiWD("W12", "2", "1", "TB1", "", permis)
    s = s & BoutEssaiWD("W13", "1", "1", "J2", "", permis) & BoutEssaiWD("W13", "2", "1", "EQ2-A", "EQ2", permis)
    s = s & BoutEssaiWD("W14", "1", "2", "J2", "", permis) & BoutEssaiWD("W14", "2", "1", "GB1", "", permis)
    s = s & BoutEssaiWD("W15", "1", "1", "P3", "", permis) & BoutEssaiWD("W15", "2", "1", "SP1", "", permis)
    s = s & BoutEssaiWD("W16", "1", "2", "TB1", "", permis) & BoutEssaiWD("W16", "2", "2", "EQ2-A", "EQ2", permis)
    s = s & "    </WiresExtremitiesList>" & vbCrLf
    s = s & "  </WireHarness>" & vbCrLf
    s = s & FIN_XML & vbCrLf
    XmlEssaiWDPlus = s
End Function

' Un fichier texte entier (les octets tels quels : les noms de XML sont en ASCII).
Private Function TexteDeFichier(ByVal f As String) As String
    Dim h As Integer, b As String
    On Error Resume Next
    h = FreeFile
    Open f For Binary Access Read As #h
    b = String$(LOF(h), " ")
    Get #h, 1, b
    Close #h
    TexteDeFichier = b
End Function

' Le début d'un fichier, sur une ligne.
Private Function DebutDeFichier(ByVal f As String, ByVal n As Long) As String
    Dim t As String
    t = Left$(TexteDeFichier(f), n)
    DebutDeFichier = Replace(Replace(Replace(Replace(t, vbCr, " "), vbLf, " "), vbTab, " "), Chr$(0), "")
End Function

' Un schéma XSD lu balise par balise : pour chaque élément ou type nommé, ses
' attributs (« * » : use="required") et ses enfants (éléments, références,
' type étendu, groupes d'attributs). Une ligne par contexte dans ws.
Private Sub DecrireXSD(ByVal t As String, ByVal ws As Object, ByRef l As Long)
    Dim attrs As Object, enfants As Object, ordre As Collection, k As Variant, entete As String
    Set attrs = NouveauDico()
    Set enfants = NouveauDico()
    Set ordre = New Collection
    AnalyserXSD t, attrs, enfants, ordre, entete
    For Each k In ordre
        If Len(ListeDe(attrs, CStr(k))) > 0 Or Len(ListeDe(enfants, CStr(k))) > 0 Then
            l = l + 1
            EcrireLigne ws, l, Array("", CStr(k), Left$("attributs : " & ListeDe(attrs, CStr(k)), 2000), Left$("enfants : " & ListeDe(enfants, CStr(k)), 2000))
            If l > 1500 Then Exit For
        End If
    Next k
End Sub

' L'analyse d'un schéma XSD : attrs et enfants (contexte -> liste), ordre (les
' contextes dans l'ordre du fichier ; dictionnaires et collection créés par
' l'appelant) ; les attributs (« * » obligatoire, fixe,
' défaut), les règles des types (motif, longueurs, bornes, valeurs permises) ;
' entete : la balise schema et ses include / import.
Private Sub AnalyserXSD(ByVal t As String, ByVal attrs As Object, ByVal enfants As Object, ByVal ordre As Collection, ByRef entete As String)
    Dim pos As Long, fin As Long, tag As String, loc As String, pile As Collection, ctx As String, nomA As String, ferme As Boolean
    Dim j As Long, typ As String
    On Error Resume Next
    Set pile = New Collection
    entete = ""
    pos = InStr(1, t, "<")
    Do While pos > 0
        fin = InStr(pos, t, ">")
        If fin = 0 Then Exit Do
        tag = Mid$(t, pos, fin - pos + 1)
        If Left$(tag, 2) = "</" Then
            If pile.Count > 0 Then pile.Remove pile.Count
        ElseIf Left$(tag, 2) <> "<?" And Left$(tag, 2) <> "<!" Then
            ferme = (Right$(tag, 2) = "/>")
            loc = NomBalise(tag)
            ' le contexte courant : le plus proche nommé dans la pile
            ctx = ""
            For j = pile.Count To 1 Step -1
                If Len(pile.Item(j)) > 0 Then
                    ctx = pile.Item(j)
                    Exit For
                End If
            Next j
            nomA = ""
            Select Case loc
                Case "element"
                    nomA = AttrXml(tag, "name")
                    typ = AttrXml(tag, "type")
                    If Len(nomA) > 0 Then
                        AjouterA enfants, ordre, IIf(Len(ctx) > 0, ctx, "(racine)"), nomA & IIf(Len(typ) > 0, ":" & typ, "") & Occurrences(tag)
                        nomA = "élément " & nomA
                        If Not enfants.Exists(nomA) Then
                            enfants.Add nomA, ""
                            ordre.Add nomA
                        End If
                    ElseIf Len(AttrXml(tag, "ref")) > 0 Then
                        AjouterA enfants, ordre, ctx, "ref " & AttrXml(tag, "ref") & Occurrences(tag)
                    End If
                Case "complexType", "simpleType", "group", "attributeGroup"
                    If Len(AttrXml(tag, "name")) > 0 Then
                        nomA = loc & " " & AttrXml(tag, "name")
                        If Not enfants.Exists(nomA) Then
                            enfants.Add nomA, ""
                            ordre.Add nomA
                        End If
                    ElseIf Len(AttrXml(tag, "ref")) > 0 Then
                        AjouterA enfants, ordre, ctx, loc & " " & AttrXml(tag, "ref")
                    End If
                Case "attribute"
                    If Len(AttrXml(tag, "name")) > 0 Then
                        AjouterA attrs, ordre, ctx, AttrXml(tag, "name") & IIf(AttrXml(tag, "use") = "required", "*", "") & _
                            IIf(Len(AttrXml(tag, "type")) > 0, "(" & AttrXml(tag, "type") & ")", "") & _
                            IIf(Len(AttrXml(tag, "fixed")) > 0, " fixe " & AttrXml(tag, "fixed"), "") & _
                            IIf(Len(AttrXml(tag, "default")) > 0, " défaut " & AttrXml(tag, "default"), "")
                    ElseIf Len(AttrXml(tag, "ref")) > 0 Then
                        AjouterA attrs, ordre, ctx, "ref " & AttrXml(tag, "ref")
                    End If
                Case "extension", "restriction"
                    If Len(AttrXml(tag, "base")) > 0 Then AjouterA enfants, ordre, ctx, loc & " de " & AttrXml(tag, "base")
                Case "enumeration"
                    AjouterA attrs, ordre, ctx, "=" & AttrXml(tag, "value")
                Case "pattern", "minLength", "maxLength", "length", "minInclusive", "maxInclusive", "minExclusive", "maxExclusive", _
                        "totalDigits", "fractionDigits"
                    AjouterA attrs, ordre, ctx, loc & " " & AttrXml(tag, "value")
                Case "schema"
                    entete = entete & Left$(tag, 400)
                Case "include", "import", "redefine"
                    entete = entete & " | " & Left$(tag, 300)
            End Select
            If Not ferme Then pile.Add nomA
        End If
        pos = InStr(fin, t, "<")
    Loop
End Sub

' Ajoute un texte à la liste d'un contexte (un dictionnaire de listes), le contexte noté dans l'ordre.
Private Sub AjouterA(ByVal dico As Object, ByVal ordre As Collection, ByVal ctx As String, ByVal texte As String)
    Dim deja As Boolean, k As Variant
    If Len(ctx) = 0 Then ctx = "(racine)"
    If Not dico.Exists(ctx) Then
        dico.Add ctx, texte
    ElseIf Len(dico.Item(ctx)) = 0 Then
        dico.Item(ctx) = texte
    Else
        dico.Item(ctx) = dico.Item(ctx) & ", " & texte
    End If
    deja = False
    For Each k In ordre
        If CStr(k) = ctx Then
            deja = True
            Exit For
        End If
    Next k
    If Not deja Then ordre.Add ctx
End Sub

' La liste d'un contexte dans un dictionnaire de listes ("" s'il n'y en a pas).
Private Function ListeDe(ByVal dico As Object, ByVal k As String) As String
    If dico.Exists(k) Then ListeDe = CStr(dico.Item(k))
End Function

' Le nom local d'une balise : « <xs:element name=... » -> « element ».
Private Function NomBalise(ByVal tag As String) As String
    Dim s As String, i As Long
    s = Mid$(tag, 2)
    For i = 1 To Len(s)
        If InStr(" />" & vbTab & vbCr & vbLf, Mid$(s, i, 1)) > 0 Then Exit For
    Next i
    s = Left$(s, i - 1)
    If InStr(s, ":") > 0 Then s = Mid$(s, InStr(s, ":") + 1)
    NomBalise = s
End Function

' La valeur d'un attribut d'une balise XML (guillemets doubles ou simples).
Private Function AttrXml(ByVal tag As String, ByVal nom As String) As String
    Dim p As Long, q As String, f As Long
    p = InStr(1, tag, " " & nom & "=")
    If p = 0 Then p = InStr(1, tag, vbTab & nom & "=")
    If p = 0 Then p = InStr(1, tag, vbLf & nom & "=")
    If p = 0 Then Exit Function
    p = p + Len(nom) + 2
    q = Mid$(tag, p, 1)
    If q <> """" And q <> "'" Then Exit Function
    f = InStr(p + 1, tag, q)
    If f > p Then AttrXml = Mid$(tag, p + 1, f - p - 1)
End Function

' minOccurs / maxOccurs d'un élément, en clair : « [0..n] ».
Private Function Occurrences(ByVal tag As String) As String
    Dim mi As String, ma As String
    mi = AttrXml(tag, "minOccurs")
    ma = AttrXml(tag, "maxOccurs")
    If Len(mi) = 0 And Len(ma) = 0 Then Exit Function
    If Len(mi) = 0 Then mi = "1"
    If Len(ma) = 0 Then ma = "1"
    If ma = "unbounded" Then ma = "n"
    Occurrences = "[" & mi & ".." & ma & "]"
End Function

' ============================================================================
'  ExporterWD (Alt+F8) : le paquet de l'Atelier en LISTES DE FILS XML, que SEE
'  importe par File > Import > Wire List (correspondance : see/FORMAT-WD.md).
'  1. le paquet, choisi dans la fenêtre « Ouvrir », lu comme DessinerPaquet le
'     lit (ChargerPaquet) ;
'  2. le schéma « IGE-XAO Wiring Diagram 3.xx » le plus haut trouvé sous
'     IGE+XAO ; aucun : la version 3.10, sans vérification ;
'  3. un fichier par folio, « WD-<nom du folio>.xml », et « WD-TOUT.xml » (un
'     WireHarness par folio), dans le dossier « WD-<nom du paquet> », à côté
'     du paquet ; un attribut n'est écrit que si le schéma le permet (ceux de
'     l'essai importé au bureau le sont toujours), sa valeur coupée à la
'     longueur maximale de son type, puis échappée (EchapperXml) ;
'  4. chaque fichier vérifié par Windows contre ce schéma (MSXML 6) ;
'  5. la feuille Export_WD : en haut, la photo (combien de fichiers valides,
'     le dossier par son nom, quoi faire ensuite) ; une ligne par fichier (ses
'     comptes, son verdict, ses premières erreurs) ; à la fin, ce qui n'a pas
'     pu s'écrire tel quel (bout de fil sans borne connue, renvoi, Tag coupé
'     ou rendu unique...). Puis une boîte courte.
'  Ni SEE ni connexion : rien n'est lu ni écrit dans SEE.
' ============================================================================
Public Sub ExporterWD()
    Dim chemin As String, numErr As Long, descErr As String
    On Error GoTo Plantage
    OuvrirJournal "ExporterWD"
    chemin = ChoisirFichier("Paquet SEE (*.xlsx),*.xlsx", "Choisis le paquet SEE de l'Atelier", ThisWorkbook.Path & "\")
    If Len(chemin) = 0 Then
        Journal "ExporterWD", "", "", "aucun paquet choisi : rien n'est écrit"
        Exit Sub
    End If
    If Not ChargerPaquet(chemin) Then
        Dialogue "Le paquet n'a pas pu être lu (voir la feuille Journal).", vbOKOnly + vbExclamation, TITRE_WD
        Exit Sub
    End If
    ExporterPaquetWD chemin
    Exit Sub
Plantage:
    numErr = Err.Number
    descErr = Err.Description
    Journal "ExporterWD", gObjet, "(macro)", "ARRÊT IMPRÉVU", numErr, descErr
    Application.StatusBar = False
    Application.ScreenUpdating = True
    Dialogue "ExporterWD s'est arrêté (erreur " & numErr & " : " & descErr & ")." & vbCrLf & vbCrLf & _
        "Clique sur OK, puis prends en photo la feuille Journal.", vbOKOnly + vbExclamation, TITRE_WD
End Sub

' L'export d'un paquet déjà lu (ChargerPaquet) : le schéma, le dossier, un
' fichier par folio puis WD-TOUT, chacun vérifié ; la feuille Export_WD ; la
' boîte de fin.
Private Sub ExporterPaquetWD(ByVal chemin As String)
    Dim cheminXsd As String, version As String, espace As String, nomXsd As String, nomPaquet As String, nomDossier As String
    Dim dossierWD As String, lignesFolios As Object, i As Long, num As Long, nbMax As Long, f As Long, ws As Object, l As Long
    Dim noms As Object, tagsTout As Object, harnais As Collection, entete As String, interieur As String, tagH As String
    Dim tagT As String, libelleH As String, nomF As String, verdict As String, detail As String, renomme As Boolean
    Dim v As Variant, x As String, nbFichiers As Long, nbValides As Long, nbRefuses As Long, nbNonVerifies As Long
    Dim nbPasEcrits As Long, nbAnciens As Long, premier As String, essai As String, suite1 As String, suite2 As String
    Dim msg As String, totaux(1 To 7) As Long
    Set mEcarts = New Collection
    Application.ScreenUpdating = False
    ' 1. le schéma
    LireSchemaWD cheminXsd, version, espace
    If Len(cheminXsd) > 0 Then
        nomXsd = Mid$(cheminXsd, InStrRev(cheminXsd, "\") + 1)
        Journal "ExporterWD", nomXsd, "", "schéma retenu : version " & version & " (le plus haut des « Wiring Diagram 3.xx » sous IGE+XAO)"
    Else
        Journal "ExporterWD", "schéma", "", "aucun « IGE-XAO Wiring Diagram 3.xx.xsd » sous IGE+XAO : version " & version & _
            ", les attributs de l'essai du bureau seulement, fichiers non vérifiés"
    End If
    ' 2. le dossier « WD-<nom du paquet> », à côté du paquet
    nomPaquet = Mid$(chemin, InStrRev(chemin, "\") + 1)
    If InStrRev(nomPaquet, ".") > 1 Then nomPaquet = Left$(nomPaquet, InStrRev(nomPaquet, ".") - 1)
    nomDossier = "WD-" & NomFichierWD(nomPaquet, "paquet")
    dossierWD = DossierDuPaquetWD(chemin) & "\" & nomDossier
    If Not DossierPretWD(dossierWD) Then
        Application.ScreenUpdating = True
        Dialogue "Le dossier « " & nomDossier & " » n'a pas pu être créé à côté du paquet (voir la feuille Journal)." & vbCrLf & vbCrLf & _
            "Copie le paquet sur ton Bureau, puis relance ExporterWD.", vbOKOnly + vbExclamation, TITRE_WD
        Exit Sub
    End If
    ' 3. les folios du paquet, par rang
    Set lignesFolios = NouveauDico()
    For i = 2 To PaquetNbLignes("Folios")
        num = EnLong(PaquetValeur("Folios", i, "Folio"), 0)
        If num >= 1 Then
            If Not lignesFolios.Exists(CStr(num)) Then lignesFolios.Add CStr(num), i
            If num > nbMax Then nbMax = num
        End If
    Next i
    If lignesFolios.Count = 0 Then
        Application.ScreenUpdating = True
        Dialogue "Le paquet n'a aucun folio : rien n'est écrit.", vbOKOnly + vbExclamation, TITRE_WD
        Exit Sub
    End If
    Set ws = FeuilleCreee(FEUILLE_EXPORT, True)
    l = LIGNE_TABLEAU
    EcrireLigne ws, l, Array("Fichier", "Folio", "Harness", "Équipements", "Connecteurs", "Barrettes", "Masses", "Broches", "Fils", _
        "Bouts de fil", "Verdict")
    ws.Rows(l).Font.Bold = True
    entete = EnteteXmlWD(version, espace)
    Set noms = NouveauDico()
    noms.Add "TOUT", True
    Set tagsTout = NouveauDico()
    Set harnais = New Collection
    For f = 1 To nbMax
        If lignesFolios.Exists(CStr(f)) Then
            i = lignesFolios.Item(CStr(f))
            Application.StatusBar = "ExporterWD : folio " & f & " / " & nbMax
            interieur = ConstruireFolioWD(f)
            ' le harness : celui du folio s'il est connu, sinon le nom du folio
            tagH = PaquetTexte("Folios", i, "Harness")
            If Len(tagH) = 0 Then tagH = PaquetTexte("Folios", i, "Nom")
            If Len(tagH) = 0 Then tagH = "F" & f
            tagH = Couper(tagH, LongueurMaxi("WireHarness", "Tag", 128))
            libelleH = PaquetTexte("Folios", i, "Titre")
            nomF = "WD-" & NomUniqueWD(f, NomFichierWD(PaquetTexte("Folios", i, "Nom"), "F" & f), noms) & ".xml"
            verdict = EcrireEtVerifierWD(dossierWD & "\" & nomF, entete & HarnaisWD(tagH, libelleH, interieur) & FIN_XML & vbCrLf, _
                cheminXsd, espace, detail)
            CompterVerdictWD verdict, nbFichiers, nbValides, nbRefuses, nbNonVerifies, nbPasEcrits
            If Len(premier) = 0 And (verdict = "VALIDE" Or verdict = "NON VÉRIFIÉ") Then premier = nomF
            l = LigneFichierWD(ws, l, nomF, CStr(f), tagH, verdict, detail)
            totaux(1) = totaux(1) + mNbEquipements
            totaux(2) = totaux(2) + mNbConnecteurs
            totaux(3) = totaux(3) + mNbBarrettes
            totaux(4) = totaux(4) + mNbMasses
            totaux(5) = totaux(5) + mNbBroches
            totaux(6) = totaux(6) + mNbFils
            totaux(7) = totaux(7) + mNbBouts
            ' WD-TOUT : un WireHarness par folio, chacun son Tag
            tagT = TagUnique(tagH, LongueurMaxi("WireHarness", "Tag", 128), tagsTout, "", renomme)
            If renomme Then EcartWD f, "WD-TOUT.xml", "le harness « " & CourtWD(tagH) & " » y est déjà : celui de ce folio s'y appelle « " & CourtWD(tagT) & " »"
            harnais.Add HarnaisWD(tagT, libelleH, interieur)
            DoEvents
        End If
    Next f
    Application.StatusBar = "ExporterWD : WD-TOUT.xml"
    mNbEquipements = totaux(1)
    mNbConnecteurs = totaux(2)
    mNbBarrettes = totaux(3)
    mNbMasses = totaux(4)
    mNbBroches = totaux(5)
    mNbFils = totaux(6)
    mNbBouts = totaux(7)
    verdict = EcrireEtVerifierWD(dossierWD & "\WD-TOUT.xml", entete & Joindre(harnais) & FIN_XML & vbCrLf, cheminXsd, espace, detail)
    CompterVerdictWD verdict, nbFichiers, nbValides, nbRefuses, nbNonVerifies, nbPasEcrits
    l = LigneFichierWD(ws, l, "WD-TOUT.xml", "tous", "(un par folio)", verdict, detail)
    ' ce qui ne s'est pas écrit tel quel
    l = l + 2
    EcrireLigne ws, l, Array("PAS ÉCRIT TEL QUEL", "Folio", "Quoi", "Détail")
    ws.Rows(l).Font.Bold = True
    If mEcarts.Count = 0 Then
        l = l + 1
        EcrireLigne ws, l, Array("rien", "", "tout le paquet est écrit")
    End If
    For Each v In mEcarts
        l = l + 1
        EcrireLigne ws, l, Array("", v(0), MasquerChemins(CStr(v(1))), MasquerChemins(CStr(v(2))))
    Next v
    ' d'autres fichiers WD-*.xml dans le dossier, d'un export d'avant : à ne pas importer
    x = Dir$(dossierWD & "\WD-*.xml")
    Do While Len(x) > 0
        If Len(x) > 7 Then
            If Not noms.Exists(Mid$(x, 4, Len(x) - 7)) Then nbAnciens = nbAnciens + 1
        End If
        x = Dir$()
    Loop
    ' le haut de la feuille : la photo
    essai = NomProjetEssaiWD()
    If Len(premier) > 0 Then
        suite1 = "Dans SEE, ouvre ton projet d'essai " & essai & ", puis File > Import > Wire List : choisis " & premier & ", puis Open."
        suite2 = "Puis Insert > From Wiring list, pour poser ses composants. Prends en photo chaque message de SEE."
    Else
        suite1 = "N'importe rien dans SEE : aucun fichier n'est valide."
        suite2 = "Prends en photo le haut de cette feuille, puis les lignes « erreur » du tableau."
    End If
    LigneHautWD ws, 1, "Liste de fils", nbFichiers & " fichier(s) : " & nbValides & " VALIDE(S), " & nbRefuses & " REFUSÉ(S)" & _
        IIf(nbNonVerifies > 0, ", " & nbNonVerifies & " NON VÉRIFIÉ(S)", "") & IIf(nbPasEcrits > 0, ", " & nbPasEcrits & " PAS ÉCRIT(S)", "")
    LigneHautWD ws, 2, "Dossier", "« " & nomDossier & " », à côté du paquet « " & Mid$(chemin, InStrRev(chemin, "\") + 1) & " »" & _
        IIf(nbAnciens > 0, " ; " & nbAnciens & " autre(s) fichier(s) WD-*.xml y restent d'avant : ne les importe pas", "")
    If Len(cheminXsd) > 0 Then
        LigneHautWD ws, 3, "Schéma", nomXsd & " : version " & version & ", chaque fichier vérifié par Windows"
    Else
        LigneHautWD ws, 3, "Schéma", "introuvable : version " & version & ", seulement les attributs de l'essai du bureau, fichiers NON VÉRIFIÉS"
    End If
    If mEcarts.Count = 0 Then
        LigneHautWD ws, 4, "Pas écrit tel quel", "rien"
    Else
        LigneHautWD ws, 4, "Pas écrit tel quel", mEcarts.Count & " élément(s) : la liste est à la fin de la feuille"
    End If
    LigneHautWD ws, 5, "Et maintenant", suite1
    LigneHautWD ws, 6, "", suite2
    MettreEnFormeWD ws
    Application.StatusBar = False
    Application.ScreenUpdating = True
    MontrerFeuille ws
    Journal "ExporterWD", nomDossier, "", nbFichiers & " fichier(s) : " & nbValides & " valide(s), " & nbRefuses & " refusé(s), " & _
        nbNonVerifies & " non vérifié(s), " & nbPasEcrits & " pas écrit(s) ; " & mEcarts.Count & " élément(s) pas écrit(s) tel quel"
    ' la boîte de fin, courte
    msg = "ExporterWD : " & nbFichiers & " fichier(s), " & nbValides & " VALIDE(S)" & IIf(nbRefuses > 0, ", " & nbRefuses & " REFUSÉ(S)", "") & _
        IIf(nbNonVerifies > 0, ", " & nbNonVerifies & " NON VÉRIFIÉ(S)", "") & IIf(nbPasEcrits > 0, ", " & nbPasEcrits & " PAS ÉCRIT(S)", "") & "." & _
        vbCrLf & vbCrLf & "Dossier « " & nomDossier & " », à côté du paquet." & vbCrLf & vbCrLf
    If Len(premier) > 0 Then
        msg = msg & "Importe d'abord " & premier & " dans ton projet d'essai " & essai & " : dans SEE, File > Import > Wire List, choisis ce fichier, puis Open." & vbCrLf & vbCrLf
    Else
        msg = msg & "Aucun fichier valide : n'importe rien dans SEE." & vbCrLf & vbCrLf
    End If
    If nbRefuses > 0 Then msg = msg & "N'importe jamais un fichier REFUSÉ." & vbCrLf & vbCrLf
    If nbNonVerifies > 0 Then msg = msg & "Windows n'a pas pu vérifier les fichiers NON VÉRIFIÉS : si SEE en refuse un, prends son message en photo." & vbCrLf & vbCrLf
    msg = msg & "Clique sur OK, puis prends en photo le haut de la feuille Export_WD."
    If nbRefuses + nbPasEcrits > 0 Or Len(premier) = 0 Then
        Dialogue msg, vbOKOnly + vbExclamation, TITRE_WD
    Else
        Dialogue msg, vbOKOnly + vbInformation, TITRE_WD
    End If
End Sub

' Le schéma « IGE-XAO Wiring Diagram 3.xx » le plus haut trouvé sous IGE+XAO :
' son chemin, sa version (« 3.10 »), son espace de noms ; ses attributs et ses
' enfants (mAttrs, mEnfants, mSchemaLu). Aucun : "" et la version 3.10.
Private Sub LireSchemaWD(ByRef cheminXsd As String, ByRef version As String, ByRef espace As String)
    Dim xsd As Collection, xmls As Collection, entete As String, ordre As Collection
    cheminXsd = ""
    version = VERSION_DEFAUT
    espace = ""
    mSchemaLu = False
    Set mAttrs = NouveauDico()
    Set mEnfants = NouveauDico()
    Set mContextes = NouveauDico()
    Set mRegles = NouveauDico()
    ParcourirIGE xsd, xmls
    cheminXsd = SchemaRetenuWD(SchemasWD(xsd))
    If Len(cheminXsd) = 0 Then Exit Sub
    version = VersionDuSchema(cheminXsd)
    Set ordre = New Collection
    AnalyserXSD TexteDeFichier(cheminXsd), mAttrs, mEnfants, ordre, entete
    espace = AttrXml(entete, "targetNamespace")
    mSchemaLu = True
End Sub

' Les schémas du Wiring Diagram de SEE Electrical Expert parmi les XSD trouvés
' (« IGE-XAO Wiring Diagram <version>.xsd »), du plus haut au plus bas (la
' version est un nombre décimal : 3.10 vient après 3.09).
Private Function SchemasWD(ByVal xsd As Collection) As Collection
    Dim trouves As Collection, res As Collection, p As Variant, n As String, i As Long, j As Long
    Set trouves = New Collection
    For Each p In xsd
        n = Mid$(CStr(p), InStrRev(CStr(p), "\") + 1)
        If InStr(1, n, "Wiring Diagram", vbTextCompare) > 0 And InStr(1, CStr(p), "Electrical Expert", vbTextCompare) > 0 Then trouves.Add CStr(p)
    Next p
    Set res = New Collection
    Do While trouves.Count > 0
        j = 1
        For i = 2 To trouves.Count
            If Val(VersionDuSchema(CStr(trouves.Item(i)))) > Val(VersionDuSchema(CStr(trouves.Item(j)))) Then j = i
        Next i
        res.Add CStr(trouves.Item(j))
        trouves.Remove j
    Loop
    Set SchemasWD = res
End Function

' Le schéma retenu parmi ceux de SchemasWD (du plus haut au plus bas) : le
' premier dont la version commence par « 3. » ; "" s'il n'y en a pas.
' ExporterWD l'écrit, EssaiWD y fait ses essais « plus ».
Private Function SchemaRetenuWD(ByVal schemas As Collection) As String
    Dim p As Variant
    For Each p In schemas
        If Left$(VersionDuSchema(CStr(p)), 2) = "3." Then
            SchemaRetenuWD = CStr(p)
            Exit Function
        End If
    Next p
End Function

' La version d'un schéma, d'après son nom : « ...\IGE-XAO Wiring Diagram 3.10.xsd » -> « 3.10 ».
Private Function VersionDuSchema(ByVal chemin As String) As String
    Dim n As String, v As String
    n = Mid$(chemin, InStrRev(chemin, "\") + 1)
    v = Mid$(n, InStr(1, n, "Diagram", vbTextCompare) + 7)
    If InStrRev(LCase$(v), ".xsd") > 0 Then v = Left$(v, InStrRev(LCase$(v), ".xsd") - 1)
    VersionDuSchema = Trim$(v)
End Function

' Le contenu du WireHarness d'un folio, sans sa balise : les appareils et
' leurs broches, les fils, leurs bouts. Chaque liste n'est écrite que si elle
' a ce que le schéma demande (un appareil, un fil, deux bouts). Remplit les
' comptes du folio (mNb...) ; ce qui ne s'écrit pas tel quel va dans mEcarts.
Private Function ConstruireFolioWD(ByVal folio As Long) As String
    Dim l As Variant, k As Variant, b As String, nat As String, rep As String, pn As String, libelle As String, lettre As String
    Dim pieces As Object, c As Collection, cleDev As String, borne As String, con As String, cle As String
    Dim lignesDev As Collection, fils As Collection, bouts As Collection, s As String
    Set mDev = New Collection
    Set mDevTag = NouveauDicoExact()
    Set mTagPris = NouveauDicoExact()
    Set mDevType = NouveauDicoExact()
    Set mDevPN = NouveauDicoExact()
    Set mDevLibelle = NouveauDicoExact()
    Set mDevParent = NouveauDicoExact()
    Set mDevPrise = NouveauDicoExact()
    Set mDevAccouple = NouveauDicoExact()
    Set mDevBroches = NouveauDicoExact()
    Set mBroche = NouveauDicoExact()
    Set mBrochePrise = NouveauDicoExact()
    Set mNatureDe = NouveauDicoExact()
    Set mRepereDe = NouveauDicoExact()
    Set mAppareilDuBout = NouveauDicoExact()
    Set mBlocsSignales = NouveauDicoExact()
    Set mFilPris = NouveauDicoExact()
    mNbEquipements = 0
    mNbConnecteurs = 0
    mNbBarrettes = 0
    mNbMasses = 0
    mNbBroches = 0
    mNbFils = 0
    mNbBouts = 0
    ' les pièces de connecteur de chaque bloc (feuille Connecteurs)
    Set pieces = NouveauDicoExact()
    For Each l In PaquetLignesDuFolio("Connecteurs", folio)
        b = PaquetTexte("Connecteurs", CLng(l), "Bloc")
        If Not pieces.Exists(b) Then pieces.Add b, New Collection
        Set c = pieces.Item(b)
        c.Add CLng(l)
    Next l
    ' 1. les blocs : un appareil par repère (posé en plusieurs morceaux, il n'en fait qu'un) ; les deux moitiés d'une
    '    prise ; les connecteurs d'un équipement, juste après lui
    For Each l In PaquetLignesDuFolio("Blocs", folio)
        b = PaquetTexte("Blocs", CLng(l), "Bloc")
        nat = UCase$(PaquetTexte("Blocs", CLng(l), "Nature"))
        rep = PaquetTexte("Blocs", CLng(l), "Repere")
        pn = PaquetTexte("Blocs", CLng(l), "PN")
        libelle = PaquetTexte("Blocs", CLng(l), "Description")
        If Len(rep) = 0 Then
            rep = b
            If nat <> "RENVOI" Then EcartWD folio, "bloc " & b, "sans repère : son appareil s'appelle « " & b & " »"
        End If
        If Not mNatureDe.Exists(b) Then
            mNatureDe.Add b, nat
            mRepereDe.Add b, rep
        End If
        Select Case nat
            Case "EQUIPEMENT"
                AppareilWD folio, "B|" & rep, rep, "Equipment", pn, libelle, "", "", ""
                If pieces.Exists(b) Then
                    Set c = pieces.Item(b)
                    For Each k In c
                        lettre = PaquetTexte("Connecteurs", CLng(k), "Lettre")
                        If Len(lettre) > 0 Then
                            AppareilWD folio, "C|" & rep & "|" & lettre, rep & "-" & lettre, "Connector", PaquetTexte("Connecteurs", CLng(k), "PN"), _
                                "", "B|" & rep, "", ""
                        End If
                    Next k
                End If
            Case "PRISE"
                AppareilWD folio, "P|" & rep & "|FICHE", rep & "-FICHE", "Connector", "", libelle, "", "Plug", "P|" & rep & "|EMBASE"
                AppareilWD folio, "P|" & rep & "|EMBASE", rep & "-EMBASE", "Connector", "", libelle, "", "Receptacle", "P|" & rep & "|FICHE"
                ' le PN de chaque moitié : celui de sa pièce (feuille Connecteurs), sinon celui du bloc
                If pieces.Exists(b) Then
                    Set c = pieces.Item(b)
                    For Each k In c
                        lettre = UCase$(PaquetTexte("Connecteurs", CLng(k), "Lettre"))
                        If lettre = "FICHE" Or lettre = "EMBASE" Then PNSiVide "P|" & rep & "|" & lettre, PaquetTexte("Connecteurs", CLng(k), "PN")
                    Next k
                End If
                PNSiVide "P|" & rep & "|FICHE", pn
                PNSiVide "P|" & rep & "|EMBASE", pn
            Case "BARRETTE", "BARRETTE_A_POSER", "RAIL"
                AppareilWD folio, "B|" & rep, rep, "TB", pn, libelle, "", "", ""
            Case "MASSE", "COLLECTEUR"
                AppareilWD folio, "B|" & rep, rep, "GB", pn, libelle, "", "", ""
            Case "RENVOI"
                EcartWD folio, "bloc " & b & " (renvoi « " & rep & " »)", "pas écrit : un renvoi n'est pas un appareil ; les bouts de fil qui y arrivent sont sautés"
            Case Else
                EcartWD folio, "bloc " & b & " (« " & rep & " », nature « " & nat & " »)", "pas écrit : nature inconnue ; ses bornes et les bouts de fil qui y arrivent sont sautés"
        End Select
    Next l
    ' 2. les broches : chaque borne sous son appareil (son connecteur, sinon son bloc), une seule fois (les ronds d'une
    '    borne de barrette, les morceaux d'une masse ne font qu'une broche)
    For Each l In PaquetLignesDuFolio("Bornes", folio)
        b = PaquetTexte("Bornes", CLng(l), "Bloc")
        borne = PaquetTexte("Bornes", CLng(l), "Borne")
        con = PaquetTexte("Bornes", CLng(l), "Connecteur")
        cle = CleBoutWD(b, borne, con)
        If Not mAppareilDuBout.Exists(cle) Then
            cleDev = AppareilDeLaBorne(folio, b, borne, con)
            mAppareilDuBout.Add cle, cleDev
            If Len(cleDev) > 0 Then BrocheWD folio, cleDev, borne, PaquetTexte("Bornes", CLng(l), "Numero")
        End If
    Next l
    ' 3. les fils et leurs bouts
    Set fils = New Collection
    Set bouts = New Collection
    For Each l In PaquetLignesDuFolio("Fils", folio)
        FilWD folio, CLng(l), fils, bouts
    Next l
    If bouts.Count = 1 Then
        EcartWD folio, "le seul bout de fil écrit du folio", "sauté : la liste des bouts de fil (WiresExtremitiesList) en demande au moins deux"
        Set bouts = New Collection
    End If
    ' le contenu
    Set lignesDev = New Collection
    For Each k In mDev
        lignesDev.Add AppareilXml(CStr(k))
        Select Case CStr(mDevType.Item(CStr(k)))
            Case "Equipment": mNbEquipements = mNbEquipements + 1
            Case "Connector": mNbConnecteurs = mNbConnecteurs + 1
            Case "TB": mNbBarrettes = mNbBarrettes + 1
            Case "GB": mNbMasses = mNbMasses + 1
        End Select
    Next k
    mNbFils = fils.Count
    mNbBouts = bouts.Count
    s = ""
    If lignesDev.Count > 0 Then s = s & "    <ConnectiveDevicesList>" & vbCrLf & Joindre(lignesDev) & "    </ConnectiveDevicesList>" & vbCrLf
    If fils.Count > 0 Then s = s & "    <WiresList>" & vbCrLf & Joindre(fils) & "    </WiresList>" & vbCrLf
    If bouts.Count > 0 Then s = s & "    <WiresExtremitiesList>" & vbCrLf & Joindre(bouts) & "    </WiresExtremitiesList>" & vbCrLf
    ConstruireFolioWD = s
End Function

' Un appareil du folio, créé une fois (cle : voir mDev) : un repère posé en
' plusieurs morceaux reste un seul appareil, qui garde le premier PN et la
' première description non vides. Son Tag est coupé à la longueur maximale de
' son type, et rendu unique dans le folio (« ~2 »...).
Private Sub AppareilWD(ByVal folio As Long, ByVal cle As String, ByVal brut As String, ByVal genre As String, ByVal pn As String, _
        ByVal libelle As String, ByVal cleParent As String, ByVal prise As String, ByVal cleAccouple As String)
    Dim t As String, renomme As Boolean
    If mDevTag.Exists(cle) Then
        PNSiVide cle, pn
        If Len(CStr(mDevLibelle.Item(cle))) = 0 And Len(libelle) > 0 Then
            mDevLibelle.Item(cle) = libelle
        End If
        Exit Sub
    End If
    t = TagUnique(brut, LongueurMaxi("ConnectiveDevice", "Tag", 255), mTagPris, "", renomme)
    If renomme Then EcartWD folio, "appareil « " & CourtWD(brut) & " »", "Tag écrit « " & CourtWD(t) & " » (coupé à la longueur de son type, ou déjà pris dans le folio)"
    mDev.Add cle
    mDevTag.Add cle, t
    mDevType.Add cle, genre
    mDevPN.Add cle, pn
    mDevLibelle.Add cle, libelle
    mDevParent.Add cle, cleParent
    mDevPrise.Add cle, prise
    mDevAccouple.Add cle, cleAccouple
    mDevBroches.Add cle, New Collection
End Sub

' Le PartNumber d'un appareil, s'il n'en a pas encore.
Private Sub PNSiVide(ByVal cle As String, ByVal pn As String)
    If Not mDevPN.Exists(cle) Or Len(pn) = 0 Then Exit Sub
    If Len(CStr(mDevPN.Item(cle))) = 0 Then
        mDevPN.Item(cle) = pn
    End If
End Sub

' L'appareil d'une borne : le connecteur de son équipement (créé s'il manque à
' la feuille Connecteurs), la moitié FICHE ou EMBASE de sa prise, sinon son
' bloc ; "" s'il n'en a pas (un renvoi, une nature inconnue, un bloc absent
' de la feuille Blocs, une borne de prise sans côté), et mEcarts le dit.
Private Function AppareilDeLaBorne(ByVal folio As Long, ByVal b As String, ByVal borne As String, ByVal con As String) As String
    Dim nat As String, rep As String
    If Not mNatureDe.Exists(b) Then
        If Not mBlocsSignales.Exists(b) Then
            mBlocsSignales.Add b, True
            EcartWD folio, "bloc " & b, "absent de la feuille Blocs : ses bornes et les bouts de fil qui y arrivent sont sautés"
        End If
        Exit Function
    End If
    nat = CStr(mNatureDe.Item(b))
    rep = CStr(mRepereDe.Item(b))
    Select Case nat
        Case "EQUIPEMENT"
            If Len(con) = 0 Then
                AppareilDeLaBorne = "B|" & rep
            Else
                If Not mDevTag.Exists("C|" & rep & "|" & con) Then
                    AppareilWD folio, "C|" & rep & "|" & con, rep & "-" & con, "Connector", "", "", "B|" & rep, "", ""
                End If
                AppareilDeLaBorne = "C|" & rep & "|" & con
            End If
        Case "PRISE"
            If UCase$(con) = "FICHE" Or UCase$(con) = "EMBASE" Then
                AppareilDeLaBorne = "P|" & rep & "|" & UCase$(con)
            Else
                EcartWD folio, "borne « " & borne & " » de la prise « " & rep & " »", "sautée : son connecteur n'est ni FICHE ni EMBASE"
            End If
        Case Else
            ' une barrette, une masse, un rail, un collecteur : le bloc ; un renvoi, une nature inconnue : aucun
            If mDevTag.Exists("B|" & rep) Then AppareilDeLaBorne = "B|" & rep
    End Select
End Function

' La broche d'une borne sous son appareil, une seule fois. Son Tag : le Numero
' de la borne (ce qui s'écrit dans la pièce : « 12 » pour « A12 »), sinon son
' étiquette, sinon « 1 » (une masse) ; coupé à la longueur maximale de son
' type, et unique dans l'appareil (un numéro déjà pris : l'étiquette, puis
' « ~2 »...).
Private Sub BrocheWD(ByVal folio As Long, ByVal cleDev As String, ByVal borne As String, ByVal numero As String)
    Dim brut As String, t As String, maxi As Long, renomme As Boolean, c As Collection
    If mBroche.Exists(cleDev & "|" & borne) Then Exit Sub
    maxi = LongueurMaxi("Pin", "Tag", 128)
    brut = numero
    If Len(brut) = 0 Then brut = borne
    If Len(brut) = 0 Then brut = "1"
    If mBrochePrise.Exists(cleDev & "|" & Couper(brut, maxi)) And Len(borne) > 0 Then brut = borne
    t = TagUnique(brut, maxi, mBrochePrise, cleDev & "|", renomme)
    If t <> numero And Len(numero) > 0 Then
        EcartWD folio, "borne « " & CourtWD(borne) & " » de « " & CourtWD(CStr(mDevTag.Item(cleDev))) & " »", "broche écrite « " & CourtWD(t) & _
            " » (le numéro « " & CourtWD(numero) & " » est déjà celui d'une autre borne de l'appareil, ou trop long)"
    End If
    mBroche.Add cleDev & "|" & borne, t
    Set c = mDevBroches.Item(cleDev)
    c.Add t
    mNbBroches = mNbBroches + 1
End Sub

' Un fil du folio : sa ligne Wire et ses bouts (WireExtremity). Un bout sans
' borne connue est sauté ; un fil sans aucun bout n'est pas écrit. Un fil sans
' numéro (à créer) reçoit un Tag stable, « F<folio>-<rang> ».
Private Sub FilWD(ByVal folio As Long, ByVal l As Long, ByVal fils As Collection, ByVal bouts As Collection)
    Dim numero As String, ordre As Long, tag As String, devDe As String, pinDe As String, devVers As String, pinVers As String
    Dim okDe As Boolean, okVers As Boolean, x As Double, longueur As String, statut As String, genre As String, route As String
    Dim renomme As Boolean
    numero = PaquetTexte("Fils", l, "Fil")
    ordre = EnLong(PaquetValeur("Fils", l, "Ordre"), 0)
    okDe = BoutWD(folio, l, "De", devDe, pinDe)
    okVers = BoutWD(folio, l, "Vers", devVers, pinVers)
    If Not okDe And Not okVers Then
        EcartWD folio, "fil " & NomDuFilWD(numero, ordre), "pas écrit : aucun de ses deux bouts n'a de borne connue"
        Exit Sub
    End If
    tag = numero
    If Len(tag) = 0 Then tag = "F" & folio & "-" & ordre
    tag = TagUnique(tag, LongueurMaxi("Wire", "Tag", 128), mFilPris, "", renomme)
    If renomme Then EcartWD folio, "fil " & CourtWD(NomDuFilWD(numero, ordre)), "Tag écrit « " & CourtWD(tag) & " » (numéro déjà pris dans le folio, ou trop long)"
    ' la longueur : en mm (le paquet la donne en m) ; inconnue : 0, estimée
    longueur = "0"
    statut = "Estimation"
    If PaquetNombre("Fils", l, "Longueur", x) Then
        If x > 0 Then
            longueur = NombreTexte(x * 1000)
            statut = "Manual"
        End If
    End If
    genre = "Normal"
    If UCase$(PaquetTexte("Fils", l, "Blinde")) = "O" Then genre = "Shield"
    If UCase$(PaquetTexte("Fils", l, "Shunt")) = "O" Then genre = "Shunt"
    route = PaquetTexte("Fils", l, "Route")
    If Len(route) = 0 Then route = "1"
    fils.Add "      <Wire" & AttrWD("Wire", "Tag", tag, 128, True) & AttrWD("Wire", "Wire_Type", PaquetTexte("Fils", l, "Type"), 50, True) & _
        AttrWD("Wire", "Gauge", PaquetTexte("Fils", l, "Jauge"), 10, True) & AttrWD("Wire", "Length", longueur, 0, True) & _
        AttrWD("Wire", "Length_Status", statut, 0, True) & AttrWD("Wire", "Type", genre, 0, True) & _
        AttrWD("Wire", "Segregation", route, 255, True) & "/>" & vbCrLf
    If okDe Then bouts.Add BoutXml(tag, 1, pinDe, devDe)
    If okVers Then bouts.Add BoutXml(tag, 2, pinVers, devVers)
End Sub

' Le bout De ou Vers d'un fil : le Tag de l'appareil et celui de la broche de
' sa borne (la ligne de Bornes que citent Bloc, Borne et Côté). Faux, et
' mEcarts le dit, si la borne n'est pas dans la feuille Bornes ou n'a pas
' d'appareil (un renvoi).
Private Function BoutWD(ByVal folio As Long, ByVal l As Long, ByVal quel As String, ByRef dev As String, ByRef pin As String) As Boolean
    Dim b As String, borne As String, cote As String, cle As String, cleDev As String, ou As String
    dev = ""
    pin = ""
    b = PaquetTexte("Fils", l, quel & "Bloc")
    borne = PaquetTexte("Fils", l, quel & "Borne")
    cote = PaquetTexte("Fils", l, quel & "Cote")
    cle = CleBoutWD(b, borne, cote)
    ou = "bout " & IIf(quel = "De", "de départ", "d'arrivée") & " du fil " & NomDuFilWD(PaquetTexte("Fils", l, "Fil"), EnLong(PaquetValeur("Fils", l, "Ordre"), 0))
    If Not mAppareilDuBout.Exists(cle) Then
        EcartWD folio, ou, "sauté : la borne « " & Trim$(b & " " & borne & " " & cote) & " » n'est pas dans la feuille Bornes"
        Exit Function
    End If
    cleDev = CStr(mAppareilDuBout.Item(cle))
    If Len(cleDev) = 0 Then
        If mNatureDe.Exists(b) Then
            If CStr(mNatureDe.Item(b)) = "RENVOI" Then
                EcartWD folio, ou, "sauté : il arrive sur le renvoi « " & CStr(mRepereDe.Item(b)) & " » (la suite du fil est sur un autre folio)"
                Exit Function
            End If
        End If
        EcartWD folio, ou, "sauté : la borne « " & Trim$(b & " " & borne & " " & cote) & " » n'a pas d'appareil"
        Exit Function
    End If
    dev = CStr(mDevTag.Item(cleDev))
    pin = CStr(mBroche.Item(cleDev & "|" & borne))
    BoutWD = True
End Function

' La clé d'une borne que citent les fils : Bloc|Borne|Côté, le côté seulement pour une prise (FICHE, EMBASE).
Private Function CleBoutWD(ByVal b As String, ByVal borne As String, ByVal cote As String) As String
    cote = UCase$(Trim$(cote))
    If cote <> "FICHE" And cote <> "EMBASE" Then cote = ""
    CleBoutWD = b & "|" & borne & "|" & cote
End Function

' Un fil nommé pour la feuille : son numéro, sinon son rang.
Private Function NomDuFilWD(ByVal numero As String, ByVal ordre As Long) As String
    If Len(numero) > 0 Then
        NomDuFilWD = numero
    Else
        NomDuFilWD = "sans numéro (rang " & ordre & ")"
    End If
End Function

' Une ligne ConnectiveDevice, et ses broches.
Private Function AppareilXml(ByVal cle As String) As String
    Dim s As String, autre As String, c As Collection, t As Variant
    s = "      <ConnectiveDevice" & AttrWD("ConnectiveDevice", "Tag", CStr(mDevTag.Item(cle)), 255, True) & _
        AttrWD("ConnectiveDevice", "Type", CStr(mDevType.Item(cle)), 0, True) & _
        AttrWD("ConnectiveDevice", "ConnectivityType", CStr(mDevPrise.Item(cle)), 0, False)
    autre = CStr(mDevAccouple.Item(cle))
    If mDevTag.Exists(autre) Then s = s & AttrWD("ConnectiveDevice", "MatingTag", CStr(mDevTag.Item(autre)), 255, False)
    autre = CStr(mDevParent.Item(cle))
    If mDevTag.Exists(autre) Then s = s & AttrWD("ConnectiveDevice", "ParentTag", CStr(mDevTag.Item(autre)), 255, False)
    s = s & AttrWD("ConnectiveDevice", "PartNumber", CStr(mDevPN.Item(cle)), 0, False) & _
        AttrWD("ConnectiveDevice", "Description", CStr(mDevLibelle.Item(cle)), 0, False)
    Set c = mDevBroches.Item(cle)
    If c.Count = 0 Then
        AppareilXml = s & "/>" & vbCrLf
        Exit Function
    End If
    s = s & ">" & vbCrLf
    For Each t In c
        s = s & "        <Pin" & AttrWD("Pin", "Tag", CStr(t), 128, True) & "/>" & vbCrLf
    Next t
    AppareilXml = s & "      </ConnectiveDevice>" & vbCrLf
End Function

' Une ligne WireExtremity : n = 1 (le départ) ou 2 (l'arrivée).
Private Function BoutXml(ByVal tag As String, ByVal n As Long, ByVal pin As String, ByVal dev As String) As String
    BoutXml = "      <WireExtremity" & AttrWD("WireExtremity", "ID", Couper(tag, LongueurMaxi("WireExtremity", "ID", 128) - 2) & "-" & n, 128, True) & _
        AttrWD("WireExtremity", "WireTag", tag, 128, True) & AttrWD("WireExtremity", "Pin", pin, 128, True) & _
        AttrWD("WireExtremity", "PinParent", dev, 255, True) & "/>" & vbCrLf
End Function

' Le WireHarness d'un folio autour de son contenu.
Private Function HarnaisWD(ByVal tag As String, ByVal libelle As String, ByVal interieur As String) As String
    Dim s As String
    s = "  <WireHarness" & AttrWD("WireHarness", "Tag", tag, 128, True) & AttrWD("WireHarness", "Description", libelle, 0, False)
    If Len(interieur) = 0 Then
        HarnaisWD = s & "/>" & vbCrLf
    Else
        HarnaisWD = s & ">" & vbCrLf & interieur & "  </WireHarness>" & vbCrLf
    End If
End Function

' Le début d'un fichier : la déclaration XML et la racine (son espace de noms s'il y en a un).
Private Function EnteteXmlWD(ByVal version As String, ByVal espace As String) As String
    Dim s As String
    s = DECLARATION_XML & vbCrLf & "<IGE-XAO_WIRE_HARNESS"
    If Len(espace) > 0 Then s = s & AttributXml("xmlns", espace)
    EnteteXmlWD = s & AttrWD("IGE-XAO_WIRE_HARNESS", "EDB_InstanceID", "1", 255, True) & _
        AttrWD("IGE-XAO_WIRE_HARNESS", "XSDversion", version, 0, True) & _
        AttrWD("IGE-XAO_WIRE_HARNESS", "LengthUnit", "millimeter", 0, True) & ">" & vbCrLf
End Function

' Un attribut à écrire (« Tag="P1" », précédé d'une espace) : seulement s'il
' s'écrit (RegleWD), sa valeur coupée à la longueur maximale de son type ; ""
' pour une valeur vide qui n'est pas obligatoire.
Private Function AttrWD(ByVal element As String, ByVal attribut As String, ByVal valeur As String, ByVal defautMax As Long, _
        ByVal obligatoire As Boolean) As String
    Dim n As Long
    If Len(valeur) = 0 And Not obligatoire Then Exit Function
    n = RegleWD(element, attribut, defautMax)
    If n < 0 Then Exit Function
    AttrWD = AttributXml(attribut, Couper(valeur, n))
End Function

' LE SEUL ENDROIT qui écrit un attribut XML : nom="valeur", la valeur échappée.
Private Function AttributXml(ByVal nom As String, ByVal valeur As String) As String
    AttributXml = " " & nom & "=""" & EchapperXml(valeur) & """"
End Function

' La règle d'un attribut, lue une fois : -1 s'il ne s'écrit pas ; sinon sa
' longueur maximale (celle de son type dans le schéma lu ; sinon defautMax ;
' 0 : pas de limite). Il s'écrit s'il est de l'essai du bureau
' (ATTRIBUTS_SURS) ou si le schéma lu le permet.
Private Function RegleWD(ByVal element As String, ByVal attribut As String, ByVal defautMax As Long) As Long
    Dim k As String, typ As String, permis As Boolean, n As Long, m As Long
    k = element & "." & attribut
    If mRegles.Exists(k) Then
        RegleWD = mRegles.Item(k)
        Exit Function
    End If
    permis = (InStr(1, ATTRIBUTS_SURS, "|" & k & "|", vbBinaryCompare) > 0)
    n = defautMax
    If mSchemaLu Then
        If AttributDuSchema(mAttrs, mEnfants, ContexteWD(element), attribut, typ) Then
            permis = True
            m = MaxDuType(typ)
            If m > 0 Then n = m
        End If
    End If
    If Not permis Then n = -1
    mRegles.Add k, n
    RegleWD = n
End Function

' La longueur maximale d'un attribut (RegleWD), defautMax s'il ne s'écrit pas.
Private Function LongueurMaxi(ByVal element As String, ByVal attribut As String, ByVal defautMax As Long) As Long
    Dim n As Long
    n = RegleWD(element, attribut, defautMax)
    If n < 0 Then n = defautMax
    LongueurMaxi = n
End Function

' Le chemin d'un élément depuis la racine du fichier (ContexteWD le suit dans le schéma).
Private Function CheminWD(ByVal element As String) As String
    Select Case element
        Case "WireHarness"
            CheminWD = "WireHarness"
        Case "ConnectiveDevice"
            CheminWD = "WireHarness/ConnectiveDevicesList/ConnectiveDevice"
        Case "Pin"
            CheminWD = "WireHarness/ConnectiveDevicesList/ConnectiveDevice/Pin"
        Case "Wire"
            CheminWD = "WireHarness/WiresList/Wire"
        Case "WireExtremity"
            CheminWD = "WireHarness/WiresExtremitiesList/WireExtremity"
    End Select
End Function

' Le contexte d'un élément dans le schéma lu, en suivant son chemin depuis la
' racine : à chaque pas, le type nommé de l'enfant (« Wire:cWire[0..n] » ->
' « complexType cWire »), sinon son type déclaré sur place (« élément
' ConnectiveDevice ») ; un pas introuvable : le premier élément de ce nom dans
' tout le schéma (ElementDuSchema).
Private Function ContexteWD(ByVal element As String) As String
    Dim ctx As String, pas As Variant, s As String
    If mContextes.Exists(element) Then
        ContexteWD = CStr(mContextes.Item(element))
        Exit Function
    End If
    ctx = ElementDuSchema("IGE-XAO_WIRE_HARNESS")
    If element <> "IGE-XAO_WIRE_HARNESS" Then
        For Each pas In Split(CheminWD(element), "/")
            s = EnfantDuSchema(ctx, CStr(pas))
            If Len(s) = 0 Then s = ElementDuSchema(CStr(pas))
            ctx = s
        Next pas
    End If
    mContextes.Add element, ctx
    ContexteWD = ctx
End Function

' Le contexte de l'enfant nom dans un contexte du schéma lu : ses éléments,
' ceux du type qu'il étend, ceux des groupes qu'il cite (au plus 10 contextes
' vus) ; "" s'il n'y est pas.
Private Function EnfantDuSchema(ByVal ctx As String, ByVal nom As String) As String
    Dim aVoir As Collection, c As String, a As Variant, s As String, tours As Long
    Set aVoir = New Collection
    aVoir.Add ctx
    Do While aVoir.Count > 0 And tours < 10
        tours = tours + 1
        c = aVoir.Item(1)
        aVoir.Remove 1
        For Each a In Split(ListeDe(mEnfants, c), ", ")
            s = CStr(a)
            If InStr(1, s, "[") > 0 Then s = Left$(s, InStr(1, s, "[") - 1)
            If s = nom Then
                EnfantDuSchema = "élément " & nom
                Exit Function
            ElseIf Left$(s, Len(nom) + 1) = nom & ":" Then
                EnfantDuSchema = "complexType " & TypeSansPrefixe(Mid$(s, Len(nom) + 2))
                Exit Function
            ElseIf Left$(s, 13) = "extension de " Then
                aVoir.Add "complexType " & TypeSansPrefixe(Mid$(s, 14))
            ElseIf Left$(s, 6) = "group " Then
                aVoir.Add s
            End If
        Next a
    Loop
End Function

' Le contexte du premier élément de ce nom dans tout le schéma lu : celui de son
' type nommé, sinon le sien (« élément <nom> »).
Private Function ElementDuSchema(ByVal nom As String) As String
    Dim k As Variant, a As Variant, s As String
    ElementDuSchema = "élément " & nom
    For Each k In mEnfants.Keys
        For Each a In Split(CStr(mEnfants.Item(k)), ", ")
            s = CStr(a)
            If InStr(1, s, "[") > 0 Then s = Left$(s, InStr(1, s, "[") - 1)
            If Left$(s, Len(nom) + 1) = nom & ":" Then
                ElementDuSchema = "complexType " & TypeSansPrefixe(Mid$(s, Len(nom) + 2))
                Exit Function
            End If
        Next a
    Next k
End Function

' Un nom de type sans son préfixe d'espace de noms (« tns:cWire » -> « cWire »).
Private Function TypeSansPrefixe(ByVal typ As String) As String
    TypeSansPrefixe = typ
    If InStrRev(typ, ":") > 0 Then TypeSansPrefixe = Mid$(typ, InStrRev(typ, ":") + 1)
End Function

' La longueur maximale d'un type simple du schéma lu (maxLength, ou length),
' en suivant au plus 5 restrictions de types nommés ; 0 si elle n'est pas dite.
Private Function MaxDuType(ByVal typ As String) As Long
    Dim tours As Long, a As Variant, s As String, suivant As String
    Do While Len(typ) > 0 And tours < 5
        tours = tours + 1
        If InStr(1, typ, ":") > 0 Then Exit Function
        For Each a In Split(ListeDe(mAttrs, "simpleType " & typ), ", ")
            s = CStr(a)
            If Left$(s, 10) = "maxLength " Then
                MaxDuType = EnLong(Mid$(s, 11), 0)
                Exit Function
            End If
            If Left$(s, 7) = "length " Then
                MaxDuType = EnLong(Mid$(s, 8), 0)
                Exit Function
            End If
        Next a
        suivant = ""
        For Each a In Split(ListeDe(mEnfants, "simpleType " & typ), ", ")
            s = CStr(a)
            If Left$(s, 15) = "restriction de " Then suivant = Mid$(s, 16)
        Next a
        typ = suivant
    Loop
End Function

' Un texte coupé à maxi caractères (maxi <= 0 : tel quel).
Private Function Couper(ByVal s As String, ByVal maxi As Long) As String
    Couper = s
    If maxi > 0 Then
        If Len(s) > maxi Then Couper = Left$(s, maxi)
    End If
End Function

' Un Tag coupé à maxi caractères et pas encore pris (pris : un dictionnaire
' des Tag déjà donnés, chacun précédé de prefixe) ; sinon « <début>~2 »,
' « ~3 »... Il est noté pris. renomme : Vrai s'il diffère de brut.
Private Function TagUnique(ByVal brut As String, ByVal maxi As Long, ByVal pris As Object, ByVal prefixe As String, ByRef renomme As Boolean) As String
    Dim t As String, n As Long, suffixe As String
    t = Couper(brut, maxi)
    n = 1
    Do While pris.Exists(prefixe & t)
        n = n + 1
        suffixe = "~" & n
        If maxi > Len(suffixe) Then
            t = Couper(brut, maxi - Len(suffixe)) & suffixe
        Else
            t = brut & suffixe
        End If
    Loop
    pris.Add prefixe & t, True
    renomme = (t <> brut)
    TagUnique = t
End Function

' Une valeur d'attribut XML : & < > " ' échappés ; un caractère hors ASCII en
' référence numérique (« é » : « &#233; ») : le fichier reste en ASCII, quelle
' que soit la façon dont il est écrit ; un caractère de contrôle (tabulation,
' retour à la ligne...) devient une espace ; ce que XML ne peut pas porter
' (une moitié de paire de substitution, U+FFFE, U+FFFF) devient « ? ».
Public Function EchapperXml(ByVal s As String) As String
    Dim i As Long, n As Long, k As Long, bas As Long, c As String, r As String
    n = Len(s)
    i = 1
    Do While i <= n
        c = Mid$(s, i, 1)
        k = AscW(c)
        If k < 0 Then k = k + 65536
        Select Case k
            Case 38
                r = r & "&amp;"
            Case 60
                r = r & "&lt;"
            Case 62
                r = r & "&gt;"
            Case 34
                r = r & "&quot;"
            Case 39
                r = r & "&apos;"
            Case 0 To 31
                r = r & " "
            Case 32 To 126
                r = r & c
            Case 55296 To 56319
                ' une paire de substitution (un caractère hors du plan de base) : une seule référence
                bas = 0
                If i < n Then bas = AscW(Mid$(s, i + 1, 1))
                If bas < 0 Then bas = bas + 65536
                If bas >= 56320 And bas <= 57343 Then
                    r = r & "&#" & CStr((k - 55296) * 1024 + (bas - 56320) + 65536) & ";"
                    i = i + 1
                Else
                    r = r & "?"
                End If
            Case 56320 To 57343, 65534, 65535
                r = r & "?"
            Case Else
                r = r & "&#" & CStr(k) & ";"
        End Select
        i = i + 1
    Loop
    EchapperXml = r
End Function

' Écrit un fichier de la liste de fils, puis le fait vérifier par Windows
' contre le schéma (s'il a été trouvé). Rend le verdict : VALIDE, REFUSÉ
' (avec le nombre d'erreurs), NON VÉRIFIÉ ou PAS ÉCRIT ; detail : les
' premières erreurs, une par ligne, sans chemin entier.
Private Function EcrireEtVerifierWD(ByVal chemin As String, ByVal texte As String, ByVal cheminXsd As String, ByVal espace As String, _
        ByRef detail As String) As String
    Dim erreurs As Collection, e As Variant, n As Long, nomF As String, premiere As String
    detail = ""
    nomF = Mid$(chemin, InStrRev(chemin, "\") + 1)
    If Not EcrireFichierTexte(chemin, texte) Then
        EcrireEtVerifierWD = "PAS ÉCRIT"
        detail = "le fichier n'a pas pu être écrit (dossier en lecture seule ?) : voir la feuille Journal"
    ElseIf Len(cheminXsd) = 0 Then
        EcrireEtVerifierWD = "NON VÉRIFIÉ"
    ElseIf ValiderXmlParXsd(chemin, cheminXsd, espace, erreurs) Then
        EcrireEtVerifierWD = "VALIDE"
    Else
        If erreurs.Count > 0 Then premiere = CStr(erreurs.Item(1))
        If erreurs.Count = 1 And (Left$(premiere, 8) = "MSXML : " Or Left$(premiere, 23) = "le schéma ne se lit pas") Then
            ' Windows n'a pas pu faire la vérification : ce n'est pas un refus du fichier
            EcrireEtVerifierWD = "NON VÉRIFIÉ"
            detail = MasquerChemins(premiere)
        Else
            EcrireEtVerifierWD = "REFUSÉ : " & erreurs.Count & " erreur(s)"
            For Each e In erreurs
                n = n + 1
                If n <= ERREURS_MONTREES Then detail = detail & IIf(Len(detail) > 0, vbLf, "") & MasquerChemins(CStr(e))
            Next e
        End If
    End If
    Journal "ExporterWD", nomF, "", EcrireEtVerifierWD & IIf(Len(detail) > 0, " ; " & Replace(detail, vbLf, " / "), "")
End Function

' Compte un verdict de fichier.
Private Sub CompterVerdictWD(ByVal verdict As String, ByRef nbFichiers As Long, ByRef nbValides As Long, ByRef nbRefuses As Long, _
        ByRef nbNonVerifies As Long, ByRef nbPasEcrits As Long)
    nbFichiers = nbFichiers + 1
    If verdict = "VALIDE" Then nbValides = nbValides + 1
    If Left$(verdict, 6) = "REFUSÉ" Then nbRefuses = nbRefuses + 1
    If verdict = "NON VÉRIFIÉ" Then nbNonVerifies = nbNonVerifies + 1
    If verdict = "PAS ÉCRIT" Then nbPasEcrits = nbPasEcrits + 1
End Sub

' Une ligne de fichier dans Export_WD (les comptes du folio, ou de WD-TOUT :
' mNb...), et dessous ses premières erreurs ; rend la dernière ligne écrite.
Private Function LigneFichierWD(ByVal ws As Object, ByVal l As Long, ByVal nomF As String, ByVal folio As String, ByVal tag As String, _
        ByVal verdict As String, ByVal detail As String) As Long
    Dim e As Variant
    l = l + 1
    EcrireLigne ws, l, Array(nomF, folio, tag, mNbEquipements, mNbConnecteurs, mNbBarrettes, mNbMasses, mNbBroches, mNbFils, mNbBouts, verdict)
    If verdict <> "VALIDE" Then ws.Cells(l, 11).Font.Bold = True
    If Len(detail) > 0 Then
        For Each e In Split(detail, vbLf)
            l = l + 1
            EcrireLigne ws, l, Array("   erreur", CStr(e))
        Next e
    End If
    LigneFichierWD = l
End Function

' Une ligne du haut de Export_WD (la photo) : la rubrique en gras, le texte.
Private Sub LigneHautWD(ByVal ws As Object, ByVal l As Long, ByVal rubrique As String, ByVal texte As String)
    EcrireLigne ws, l, Array(rubrique, MasquerChemins(texte))
    ws.Cells(l, 1).Font.Bold = True
End Sub

' La mise en page de Export_WD : le haut sur fond jaune, des colonnes lisibles sur une photo.
Private Sub MettreEnFormeWD(ByVal ws As Object)
    Dim j As Long
    On Error Resume Next
    ws.Range(ws.Cells(1, 1), ws.Cells(6, 11)).Interior.Color = RGB(255, 242, 204)
    ws.Columns(1).ColumnWidth = 22
    ws.Columns(2).ColumnWidth = 8
    ws.Columns(3).ColumnWidth = 18
    For j = 4 To 10
        ws.Columns(j).ColumnWidth = 12
    Next j
    ws.Columns(11).ColumnWidth = 30
End Sub

' Le dossier du paquet ; un paquet qui n'est pas sur le disque (une adresse web) : le dossier des fichiers du classeur.
Private Function DossierDuPaquetWD(ByVal chemin As String) As String
    If InStr(1, chemin, "://", vbBinaryCompare) > 0 Or InStrRev(chemin, "\") < 3 Then
        DossierDuPaquetWD = DossierDesFichiers()
    Else
        DossierDuPaquetWD = Left$(chemin, InStrRev(chemin, "\") - 1)
    End If
End Function

' Le dossier de l'export, créé s'il le faut ; Faux s'il ne peut pas l'être.
Private Function DossierPretWD(ByVal dossier As String) As Boolean
    On Error GoTo Echec
    If Len(Dir$(dossier, vbDirectory)) = 0 Then MkDir dossier
    DossierPretWD = (Len(Dir$(dossier, vbDirectory)) > 0)
    Exit Function
Echec:
    Journal "ExporterWD", dossier, "MkDir", "le dossier n'a pas pu être créé", Err.Number, Err.Description
    DossierPretWD = False
End Function

' Un nom de fichier : sans \ / : * ? " < > | ni caractère de contrôle, au plus
' 80 caractères, sans espace ni point au bout ; defaut s'il reste vide.
Private Function NomFichierWD(ByVal nom As String, ByVal defaut As String) As String
    Dim i As Long, k As Long, c As String, r As String
    For i = 1 To Len(nom)
        c = Mid$(nom, i, 1)
        k = AscW(c)
        If k >= 0 And k < 32 Then
            r = r & "_"
        ElseIf InStr(1, "\/:*?""<>|", c, vbBinaryCompare) > 0 Then
            r = r & "_"
        Else
            r = r & c
        End If
    Next i
    r = Trim$(Left$(r, 80))
    Do While Len(r) > 0 And (Right$(r, 1) = "." Or Right$(r, 1) = " ")
        r = Left$(r, Len(r) - 1)
    Loop
    If Len(r) = 0 Then r = defaut
    NomFichierWD = r
End Function

' Un nom de fichier pas encore pris dans l'export (sans regarder la casse,
' comme Windows ; « TOUT » est celui de WD-TOUT.xml) : sinon « <nom>-F<folio> ».
Private Function NomUniqueWD(ByVal folio As Long, ByVal nom As String, ByVal noms As Object) As String
    Dim t As String
    t = nom
    Do While noms.Exists(t)
        t = t & "-F" & folio
    Loop
    If t <> nom Then EcartWD folio, "fichier « WD-" & nom & ".xml »", "le nom est déjà pris dans cet export : ce folio s'écrit dans « WD-" & t & ".xml »"
    noms.Add t, True
    NomUniqueWD = t
End Function

' Le nom du projet d'essai (le réglage Projet, s'il commence par TEST_), sinon « TEST_... ».
Private Function NomProjetEssaiWD() As String
    Dim p As String
    p = Reglage("Projet", "")
    p = Mid$(p, InStrRev(p, "\") + 1)
    If InStrRev(p, ".") > 1 Then p = Left$(p, InStrRev(p, ".") - 1)
    If UCase$(Left$(p, 5)) = "TEST_" Then
        NomProjetEssaiWD = p
    Else
        NomProjetEssaiWD = "TEST_..."
    End If
End Function

' Ce qui ne s'écrit pas tel quel : une ligne de la fin de Export_WD, et du journal.
Private Sub EcartWD(ByVal folio As Long, ByVal quoi As String, ByVal detail As String)
    mEcarts.Add Array(folio, quoi, detail)
    Journal "ExporterWD", "folio " & folio, quoi, detail
End Sub

' Un texte pour la feuille, au plus 60 caractères (un Tag de 255 caractères ne se lit pas sur une photo).
Private Function CourtWD(ByVal s As String) As String
    CourtWD = s
    If Len(s) > 60 Then CourtWD = Left$(s, 57) & "..."
End Function

' Les textes d'une collection, bout à bout (Join : sans recopier le texte à chaque ajout).
Private Function Joindre(ByVal c As Collection) As String
    Dim t() As String, i As Long
    If c.Count = 0 Then Exit Function
    ReDim t(0 To c.Count - 1)
    For i = 1 To c.Count
        t(i - 1) = c.Item(i)
    Next i
    Joindre = Join(t, "")
End Function
