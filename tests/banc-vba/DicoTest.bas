Option VBASupport 1
Option ClassModule
Option Explicit
' Substitut de Scripting.Dictionary pour le banc LibreOffice (Linux n'en a pas).
' CompareMode : 1 (texte) clés insensibles à la casse, 0 (binaire) sensibles.
' Les clés d'une Collection étant insensibles à la casse, le mode binaire
' code chaque majuscule (Chr(1) + minuscule).
Private mCles As Collection
Private mValeurs As Collection
Private mMode As Long
Private Sub Class_Initialize()
    Set mCles = New Collection
    Set mValeurs = New Collection
    mMode = 0
End Sub
Public Property Let CompareMode(ByVal m As Long)
    mMode = m
End Property
Public Property Get CompareMode() As Long
    CompareMode = mMode
End Property
Private Function Norm(ByVal k As Variant) As String
    Dim s As String, i As Long, c As String, r As String
    s = CStr(k)
    If mMode <> 0 Then
        Norm = "k" & LCase(s)
        Exit Function
    End If
    r = "k"
    For i = 1 To Len(s)
        c = Mid(s, i, 1)
        If Asc(c) <> Asc(LCase(c)) Then
            r = r & Chr(1) & LCase(c)
        Else
            r = r & c
        End If
    Next i
    Norm = r
End Function
Public Function Exists(ByVal k As Variant) As Boolean
    Dim v As Variant
    On Error GoTo Non
    v = mCles.Item(Norm(k))
    Exists = True
    Exit Function
Non:
    Exists = False
End Function
Public Sub Add(ByVal k As Variant, ByVal v As Variant)
    If Exists(k) Then Err.Raise 457
    mCles.Add k, Norm(k)
    mValeurs.Add v, Norm(k)
End Sub
Public Sub Remove(ByVal k As Variant)
    mCles.Remove Norm(k)
    mValeurs.Remove Norm(k)
End Sub
Public Sub Assigner(ByVal k As Variant, ByVal v As Variant)
    If Exists(k) Then Remove k
    mCles.Add k, Norm(k)
    mValeurs.Add v, Norm(k)
End Sub
Public Property Get Count() As Long
    Count = mCles.Count
End Property
Public Function Keys() As Variant
    Dim t() As Variant, i As Long
    gNbKeys = gNbKeys + 1
    If gPlanterKeys > 0 And gNbKeys = gPlanterKeys Then Err.Raise 1234, , "panne simulée au milieu d'un folio"
    If mCles.Count = 0 Then
        Keys = Array()
        Exit Function
    End If
    ReDim t(0 To mCles.Count - 1)
    For i = 1 To mCles.Count
        t(i - 1) = mCles.Item(i)
    Next i
    Keys = t
End Function
Public Property Get Item(ByVal k As Variant) As Variant
    If Not Exists(k) Then Exit Property
    If IsObject(mValeurs.Item(Norm(k))) Then
        Set Item = mValeurs.Item(Norm(k))
    Else
        Item = mValeurs.Item(Norm(k))
    End If
End Property
Public Property Let Item(ByVal k As Variant, ByVal v As Variant)
    If Exists(k) Then Remove k
    mCles.Add k, Norm(k)
    mValeurs.Add v, Norm(k)
End Property
Public Property Set Item(ByVal k As Variant, ByVal v As Variant)
    If Exists(k) Then Remove k
    mCles.Add k, Norm(k)
    mValeurs.Add v, Norm(k)
End Property
