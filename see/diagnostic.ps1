<#
  diagnostic.ps1 - Atelier Schéma, pilote SEE : diagnostic du poste (LECTURE SEULE)

  À lancer au bureau AVANT tout essai du pilote : double-clic sur diagnostic.cmd,
  posé dans le même dossier que ce fichier.

  Ce que fait ce script :
    - il LIT la version de Windows, de PowerShell, d'Office / Excel et les réglages
      de sécurité des macros d'Excel, les programmes installés, les dossiers
      d'installation de SEE Electrical Expert (IGE+XAO, aujourd'hui ETAP), les
      inscriptions COM de SEE dans le registre, les processus SEE en cours,
      Python / Node / Java, SEE Project Manager et SQL Server ;
    - il ÉCRIT un seul fichier, diagnostic-see.txt, à côté de lui (ou dans %TEMP%
      si ce dossier est en lecture seule), puis l'ouvre dans le Bloc-notes.

  Ce qu'il ne fait jamais : lancer SEE ou Java, créer un objet COM, modifier le
  registre ou un fichier, demander des droits d'administrateur, lire un projet
  ou un environnement SEE, un titre de fenêtre ou une ligne de commande. Les
  seuls programmes lancés le sont pour leur version (python --version,
  py -0p, node --version), pour lire le registre (reg.exe query), et à la fin
  le Bloc-notes, pour montrer le rapport.

  Le rapport est ANONYMISÉ : le nom d'utilisateur (et tout dossier de profil
  C:\Users\<nom>, nom court 8.3 compris), le nom du poste et le domaine sont
  remplacés par <UTILISATEUR>, <POSTE>, <DOMAINE>, les serveurs réseau par
  <SERVEUR>, le nom d'entreprise d'un dossier OneDrive par <ORGANISATION>, les
  adresses électroniques par <COURRIEL>. Hors de Program Files, seuls les noms
  de dossiers techniques connus sont écrits : un dossier racine au nom libre
  (D:\SEE_xxx) devient <DOSSIER SEE n°k>, le contenu des dossiers de données
  (environnements, projets) n'est jamais listé. Les emplacements approuvés
  d'Excel ne sont décrits que par leur nature, sauf les dossiers d'Office.

  Compatible Windows PowerShell 5.1 et mode ConstrainedLanguage (AppLocker / WDAC) :
  pas d'Add-Type, pas d'objet COM, pas de méthode .NET hors des types de base ;
  ce qui peut échouer est dans un try/catch et le rapport dit « non disponible ici ».

  Options (facultatives) :
    -Rapport <chemin>   écrire le rapport à cet endroit
    -SansBlocNotes      ne pas ouvrir le Bloc-notes à la fin
#>
param(
    [string]$Rapport = '',
    [switch]$SansBlocNotes
)

# Pas de texte rouge pour le technicien : chaque erreur attendue est traitée là
# où elle peut arriver (-ErrorAction Stop dans un try/catch).
$ErrorActionPreference = 'SilentlyContinue'

# ---------------------------------------------------------------------------
# État global du relevé
# ---------------------------------------------------------------------------
$script:VERSION = '1.0 (2026-10-10)'
$script:Debut = Get-Date
$script:Corps = @()
$script:NumeroSection = 0
$script:Section = $null
$script:Incidents = @()
$script:Programmes = $null
$script:Racines = @()
$script:Masques = @()
$script:Disques = $null
$script:DisquesSurs = $false
$script:LignesArbre = 0
$script:ArbreCoupe = $false
$script:EstWindows = ($env:OS -eq 'Windows_NT')
$script:Sep = '/'
if ($script:EstWindows) { $script:Sep = '\' }
$script:Proc64 = ("$env:PROCESSOR_ARCHITECTURE" -match '64')
$script:Os64 = $script:Proc64 -or ("$env:PROCESSOR_ARCHITEW6432" -match '64')
$script:RegistreDispo = $false
try { if (Get-PSProvider -PSProvider Registry -ErrorAction Stop) { $script:RegistreDispo = $true } } catch { }
$script:RegExe = ''
if ($script:EstWindows -and $env:SystemRoot) {
    $c = $env:SystemRoot + '\System32\reg.exe'
    if (Test-Path -LiteralPath $c) { $script:RegExe = $c }
}

# Les coclasses de SEE connues par la recherche (bibliothèques de types de SEE.exe
# V5R2 5.20 et V4R3 4.8, et du plugin SEEXmlSheetGenerator).
$script:ClsidConnus = @(
    @{ Guid = '{829E4B3B-B128-4999-A66A-6E76F0B4B22F}'; Nom = 'V5R2 Application'; Court = 'V5R2 Application'; Role = 'Application' },
    @{ Guid = '{29E25405-2755-42DA-A17D-C07EC1A16CCB}'; Nom = 'V5R2 SeeAutomation'; Court = 'V5R2 SeeAutomation'; Role = 'Automation' },
    @{ Guid = '{A55015A3-0E82-4694-87D9-DB82B6620532}'; Nom = 'V4R3 Application'; Court = 'V4R3 Application'; Role = 'Application' },
    @{ Guid = '{B0B9DD73-EE81-473F-9C3C-D8910C7E2D59}'; Nom = 'V4R3 SeeAutomation'; Court = 'V4R3 SeeAutomation'; Role = 'Automation' },
    @{ Guid = '{3F068A71-6B82-4271-B830-DC790F3BB892}'; Nom = 'ADG ExcelEntry (plugin SEEXmlSheetGenerator)'; Court = 'ADG ExcelEntry'; Role = 'ADG' }
)
$script:TypeLibSee = '{9956A56F-B14C-4007-B6CF-B89B4A7CD08D}'

# Ce que le résumé reprendra.
$script:Constat = @{
    Windows = 'non relevé'; Ps = 'non relevé'; Mode = ''
    Excel = 'non relevé'; ExcelBits = ''; Macros = 'non relevé'; MacrosAlerte = ''
    RegistreLu = $false
    SeeProgrammes = @(); SeeExe = @()
    Clsid = @{}; ServeursSee = @(); ProgIDs = @(); ProgIDsAutres = @(); ProgIDsVoisins = @(); TypeLibs = @(); RechercheIncomplete = $false
    Processus = 'non relevé'; Python = 'non relevé'; Node = 'non relevé'; Java = 'non relevé'
    Spm = 'non relevé'; Sql = 'non relevé'
}

# ---------------------------------------------------------------------------
# Outils : sections du rapport
# ---------------------------------------------------------------------------
function Ouvrir-Section([string]$titre) {
    $script:NumeroSection++
    $script:Section = @{ Titre = $titre; Etat = ''; Lignes = @() }
    Write-Host ('[{0}] {1}' -f $script:NumeroSection, $titre)
}

function Ligne([string]$texte) {
    $script:Section.Lignes += $texte
}

function Etat([string]$etat) {
    $script:Section.Etat = $etat
}

function Fermer-Section {
    $s = $script:Section
    $etat = $s.Etat
    if (-not $etat) { $etat = 'voir le détail' }
    $script:Corps += ''
    $script:Corps += ('=' * 78)
    $script:Corps += ('{0}. {1}' -f $script:NumeroSection, $s.Titre)
    $script:Corps += ('   État : ' + $etat)
    $script:Corps += ('-' * 78)
    $script:Corps += $s.Lignes
}

# Exécute une section : une erreur imprévue n'arrête jamais le relevé.
function Executer-Section([string]$titre, [scriptblock]$corps) {
    Ouvrir-Section $titre
    try {
        $null = & $corps
    } catch {
        Ligne ('!! Erreur inattendue, la section est incomplète : ' + $_.Exception.Message)
        if (-not $script:Section.Etat) { Etat 'NON LISIBLE (erreur inattendue, voir le détail)' }
        $script:Incidents += ($titre + ' : ' + $_.Exception.Message)
    }
    Fermer-Section
}

# ---------------------------------------------------------------------------
# Outils : fichiers, commandes
# ---------------------------------------------------------------------------
function Commande-Existe([string]$nom) {
    return [bool](Get-Command $nom -ErrorAction SilentlyContinue)
}

# Assemble un chemin sans Join-Path (qui échoue en 5.1 si le lecteur n'existe pas).
# Les morceaux s'écrivent avec « \ » ; ils sont convertis au séparateur du système.
function Chemin([string]$base, [string]$rel) {
    $r = $rel -replace '\\', $script:Sep
    if ($base.EndsWith('\') -or $base.EndsWith('/')) { return $base + $r }
    return $base + $script:Sep + $r
}

# Pour comparer des chemins quel que soit le système : séparateur « \ ».
function Normaliser([string]$p) {
    return ($p -replace '/', '\')
}

function Nom-Fichier([string]$p) {
    return ($p -replace '^.*[\\/]', '')
}

function Parent([string]$p) {
    $n = $p -replace '[\\/]+$', ''
    if ($n -match '^(.*)[\\/][^\\/]*$') { return $matches[1] }
    return ''
}

# Échappe un texte pour l'insérer tel quel dans une expression régulière.
function Echapper([string]$s) {
    return ($s -replace '([\\\.\[\]\(\)\{\}\*\+\?\^\$\|#])', '\$1')
}

function Est-Absolu([string]$p) {
    return ($p -match '^[A-Za-z]:\\' -or $p -match '^\\\\' -or $p -match '^/')
}

# Tire le chemin d'un exécutable d'une ligne de commande inscrite dans le
# registre : "C:\...\SEE.exe" /Automation, C:\PROGRA~1\...\EXCEL.EXE /automation,
# C:\...\SEE.exe\2 (bibliothèque de types), file:///C:/.../x.dll (CodeBase .NET).
function Extraire-Exe([string]$commande) {
    if (-not $commande) { return '' }
    $c = $commande.Trim()
    if ($c -match '^(?i)file:///(.+)$') { $c = ($matches[1] -replace '/', '\') }
    if ($c.StartsWith('"')) {
        $i = $c.IndexOf('"', 1)
        if ($i -gt 1) { return $c.Substring(1, $i - 1) }
    }
    if ($c -match '^(?i)(.+?\.(exe|dll|tlb|olb|ocx|chm))(\\\d+)?(\s|$)') { return $matches[1] }
    return ''
}

# Lance un programme en lecture (--version, reg query...) : sortie et erreurs.
function Lancer([string]$exe, [string[]]$arguments) {
    $ErrorActionPreference = 'Continue'
    $r = @{ Ok = $false; Lignes = @(); Code = $null; Message = '' }
    try {
        $sortie = & $exe @arguments 2>&1
        $r.Code = $LASTEXITCODE
        foreach ($o in @($sortie)) { $r.Lignes += ("$o" -replace "`r", '') }
        $r.Ok = $true
    } catch {
        $r.Message = $_.Exception.Message
    }
    return $r
}

# Les octets 0 à $n - 1 d'un fichier (lecture seule, sans .NET).
function Lire-Octets([string]$fichier, [int]$n) {
    $p = @{ LiteralPath = $fichier; TotalCount = $n; ErrorAction = 'Stop' }
    if ($PSVersionTable.PSVersion.Major -ge 6) { $p['AsByteStream'] = $true } else { $p['Encoding'] = 'Byte' }
    return @(Get-Content @p)
}

# Entier non signé de 2 ou 4 octets (petit-boutiste) ; en double, sans débordement.
function Lire-U([object[]]$o, [int]$i, [int]$taille) {
    $v = 0
    for ($k = $taille - 1; $k -ge 0; $k--) { $v = $v * 256 + [int]$o[$i + $k] }
    return $v
}

# 64 ou 32 bits d'un .exe / .dll, lu dans son en-tête PE (sans .NET). Un fichier
# marqué x86 (Machine = 0x14C) peut être une assembly .NET « AnyCPU », qui se
# charge aussi dans un processus 64 bits : l'en-tête CLI le dit (voir Architecture-Net).
function Architecture-Exe([string]$fichier) {
    try {
        $o = Lire-Octets $fichier 64
        if ($o.Count -lt 64 -or [int]$o[0] -ne 0x4D -or [int]$o[1] -ne 0x5A) { return 'pas un exécutable Windows' }
        $e = [int]$o[60] + 256 * [int]$o[61] + 65536 * [int]$o[62]
        if ($e -lt 64 -or $e -gt 65536) { return 'en-tête PE illisible' }
        $o = Lire-Octets $fichier ($e + 24)
        if ($o.Count -lt ($e + 24) -or [int]$o[$e] -ne 0x50 -or [int]$o[$e + 1] -ne 0x45) { return 'en-tête PE illisible' }
        $m = Lire-U $o ($e + 4) 2
        if ($m -eq 0x8664) { return '64 bits (x64)' }
        if ($m -eq 0xAA64) { return '64 bits (ARM64)' }
        if ($m -eq 0x14C) { return (Architecture-Net $fichier $o $e) }
        return ('machine inconnue 0x{0:X4}' -f [int]$m)
    } catch {
        return 'non lisible'
    }
}

# Fichier PE32 marqué x86 : natif, ou .NET ? Répertoire de données n°14 (en-tête
# CLI) de l'en-tête optionnel, puis ses drapeaux (ECMA-335, II.25.3.3.1) :
# ILONLY = 0x1, 32BITREQUIRED = 0x2, 32BITPREFERRED = 0x20000. ILONLY seul =
# AnyCPU ; avec 32BITREQUIRED = x86 ; avec les deux derniers = AnyCPU 32 bits préféré.
function Architecture-Net([string]$fichier, [object[]]$o, [int]$e) {
    $natif = '32 bits (x86)'
    $nbSec = Lire-U $o ($e + 6) 2
    $tOpt = Lire-U $o ($e + 20) 2
    $opt = $e + 24
    $fin = $opt + $tOpt + 40 * $nbSec
    if ($tOpt -lt 216 -or $nbSec -lt 1 -or $nbSec -gt 96 -or $fin -gt 65536) { return $natif }
    $o = Lire-Octets $fichier $fin
    if ($o.Count -lt $fin) { return $natif }
    if ((Lire-U $o $opt 2) -ne 0x10B) { return $natif }
    if ((Lire-U $o ($opt + 92) 4) -lt 15) { return $natif }
    $rva = Lire-U $o ($opt + 208) 4
    if ($rva -eq 0) { return $natif }
    $nonLu = '32 bits ou AnyCPU (.NET, drapeaux non lus)'
    $pos = -1
    for ($i = 0; $i -lt $nbSec; $i++) {
        $s = $opt + $tOpt + 40 * $i
        $tv = Lire-U $o ($s + 8) 4
        $va = Lire-U $o ($s + 12) 4
        $tb = Lire-U $o ($s + 16) 4
        $pb = Lire-U $o ($s + 20) 4
        if ($tb -gt $tv) { $tv = $tb }
        if ($rva -ge $va -and $rva -lt ($va + $tv)) { $pos = $rva - $va + $pb }
    }
    # 64 Ko au plus : Get-Content lit octet par octet en 5.1.
    if ($pos -lt 0 -or ($pos + 20) -gt 65536) { return $nonLu }
    $o = Lire-Octets $fichier ([int]$pos + 20)
    if ($o.Count -lt ($pos + 20)) { return $nonLu }
    $d0 = [int]$o[$pos + 16]
    $d2 = [int]$o[$pos + 18]
    $ilOnly = (($d0 -band 1) -ne 0)
    $req32 = (($d0 -band 2) -ne 0)
    $pref32 = (($d2 -band 2) -ne 0)
    if ($req32 -and $pref32) { return 'AnyCPU 32 bits préféré (.NET : une DLL se charge en 32 ou 64 bits, un .exe tourne en 32 bits)' }
    if ($req32) { return '32 bits (x86, .NET)' }
    if ($ilOnly) { return 'AnyCPU (.NET : se charge en 32 ou 64 bits)' }
    return '32 bits (x86, .NET mixte)'
}

# '64', '32' ou '' (AnyCPU, inconnu) : seuls les textes « NN bits ( » sont nets.
function Bits-De([string]$arch) {
    if ($arch -match '^64 bits \(') { return '64' }
    if ($arch -match '^32 bits \(') { return '32' }
    return ''
}

function Infos-Fichier([string]$f) {
    $i = @{ Version = '?'; Produit = '?'; Description = ''; Editeur = ''; Arch = '?'; Bits = ''; Date = '?' }
    try {
        $it = Get-Item -LiteralPath $f -Force -ErrorAction Stop
        $i.Date = $it.LastWriteTime.ToString('yyyy-MM-dd')
        $vi = $it.VersionInfo
        if ($vi) {
            if ($vi.FileVersion) { $i.Version = ("$($vi.FileVersion)").Trim() }
            if ($vi.ProductVersion) { $i.Produit = ("$($vi.ProductVersion)").Trim() }
            if ($vi.FileDescription) { $i.Description = ("$($vi.FileDescription)").Trim() }
            if ($vi.CompanyName) { $i.Editeur = ("$($vi.CompanyName)").Trim() }
        }
    } catch {
        $i.Version = 'non lisible'
    }
    $i.Arch = Architecture-Exe $f
    $i.Bits = Bits-De $i.Arch
    return $i
}

function Texte-Infos($i) {
    $t = 'FileVersion ' + $i.Version + ' ; ProductVersion ' + $i.Produit + ' ; ' + $i.Arch + ' ; modifié le ' + $i.Date
    if ($i.Description) { $t += ' ; « ' + $i.Description + ' »' }
    return $t
}

function Lister-Noms([string]$dossier, [int]$max) {
    $noms = @(Get-ChildItem -LiteralPath $dossier -Force -ErrorAction SilentlyContinue | Sort-Object Name | ForEach-Object {
            if ($_.PSIsContainer) { $_.Name + '\' } else { $_.Name }
        })
    return @{ Noms = $noms; Max = $max }
}

function Ligne-Liste([string]$dossier, [string]$retrait, [int]$max) {
    $l = Lister-Noms $dossier $max
    $n = $l.Noms.Count
    if ($n -eq 0) { Ligne ($retrait + '(dossier vide ou illisible)'); return }
    Ligne ($retrait + ('{0} élément(s) :' -f $n))
    $k = 0
    foreach ($x in $l.Noms) {
        $k++
        if ($k -gt $max) { Ligne ($retrait + ('  … {0} autre(s) non affiché(s)' -f ($n - $max))); break }
        Ligne ($retrait + '  ' + $x)
    }
}

# ---------------------------------------------------------------------------
# Outils : registre (fournisseur PowerShell, lecture seule)
# ---------------------------------------------------------------------------
# Rend @{ Etat = trouve | absent | illisible | indisponible ; Noms ; Valeurs ; Erreur }.
function Lire-Cle([string]$chemin) {
    $r = @{ Etat = 'absent'; Noms = @(); Valeurs = @{}; Erreur = '' }
    if (-not $script:RegistreDispo) { $r.Etat = 'indisponible'; return $r }
    $cle = $null
    try {
        $cle = Get-Item -LiteralPath $chemin -ErrorAction Stop
    } catch {
        if ("$($_.CategoryInfo.Category)" -eq 'ObjectNotFound') { return $r }
        $r.Etat = 'illisible'
        $r.Erreur = $_.Exception.Message
        return $r
    }
    if ($null -eq $cle) { return $r }
    $r.Etat = 'trouve'
    # Les noms des valeurs : la propriété Property de la clé (« (default) » pour
    # la valeur par défaut), sinon les propriétés rendues par Get-ItemProperty.
    $noms = @()
    try { $noms = @($cle.Property | Where-Object { $_ }) } catch { $noms = @() }
    $props = $null
    try {
        $props = Get-ItemProperty -LiteralPath $chemin -ErrorAction Stop
    } catch {
        $r.Erreur = $_.Exception.Message
        return $r
    }
    if ($noms.Count -eq 0 -and $null -ne $props) {
        try {
            $noms = @($props.PSObject.Properties | ForEach-Object { $_.Name } | Where-Object { $_ -notmatch '^PS(Path|ParentPath|ChildName|Drive|Provider)$' })
        } catch { $noms = @() }
    }
    foreach ($nom in $noms) {
        if ($null -eq $nom -or $nom -eq '') { continue }
        $r.Noms += $nom
        try { $r.Valeurs[$nom] = $props.$nom } catch { $r.Valeurs[$nom] = $null }
    }
    return $r
}

function Sous-Cles([string]$chemin) {
    if (-not $script:RegistreDispo) { return @() }
    return @(Get-ChildItem -LiteralPath $chemin -Name -ErrorAction SilentlyContinue)
}

function Valeur([string]$chemin, [string]$nom) {
    $r = Lire-Cle $chemin
    if ($r.Etat -ne 'trouve') { return $null }
    if ($r.Valeurs.ContainsKey($nom)) { return $r.Valeurs[$nom] }
    return $null
}

function Valeur-Defaut([string]$chemin) {
    $v = Valeur $chemin '(default)'
    if ($null -eq $v) { return '' }
    return "$v"
}

function Texte-Valeur($v) {
    if ($null -eq $v) { return '(vide)' }
    if ($v -is [array]) {
        if ($v.Count -gt 0 -and $v[0] -is [byte]) { return ('(binaire, {0} octets)' -f $v.Count) }
        return ((@($v) | ForEach-Object { "$_" }) -join ' | ')
    }
    $t = ("$v" -replace "[`r`n]+", ' ')
    if ($t.Length -gt 300) { $t = $t.Substring(0, 300) + '…' }
    return $t
}

function Nom-Valeur([string]$nom) {
    if ($nom -eq '(default)') { return '(par défaut)' }
    return $nom
}

function Texte-Etat($r) {
    if ($r.Etat -eq 'trouve') { return 'TROUVÉ' }
    if ($r.Etat -eq 'absent') { return 'absent' }
    if ($r.Etat -eq 'illisible') { return ('NON LISIBLE (' + $r.Erreur + ')') }
    if ($r.Etat -eq 'indisponible') { return 'NON DISPONIBLE ICI' }
    return $r.Etat
}

function Note-Fichier($v) {
    if ($null -eq $v -or $v -is [array]) { return '' }
    $f = Extraire-Exe "$v"
    if (-not $f -or -not (Est-Absolu $f)) { return '' }
    if (Test-Path -LiteralPath $f) { return '   [fichier présent]' }
    return '   [fichier ABSENT]'
}

# Écrit dans le rapport les valeurs d'une clé, et de ses sous-clés jusqu'à
# $profondeur niveaux. Rend l'état de la clé.
function Afficher-Cle([string]$chemin, [string]$retrait, [int]$profondeur) {
    $r = Lire-Cle $chemin
    if ($r.Etat -ne 'trouve') { return $r.Etat }
    foreach ($nom in $r.Noms) {
        $v = $r.Valeurs[$nom]
        Ligne ($retrait + (Nom-Valeur $nom) + ' = ' + (Texte-Valeur $v) + (Note-Fichier $v))
    }
    if ($r.Erreur) { Ligne ($retrait + '(valeurs non lisibles : ' + $r.Erreur + ')') }
    if ($profondeur -gt 0) {
        $sous = @(Sous-Cles $chemin)
        $k = 0
        foreach ($s in $sous) {
            $k++
            if ($k -gt 25) { Ligne ($retrait + ('… {0} autre(s) sous-clé(s) non affichée(s)' -f ($sous.Count - 25))); break }
            Ligne ($retrait + '[' + $s + ']')
            $null = Afficher-Cle ($chemin + '\' + $s) ($retrait + '    ') ($profondeur - 1)
        }
    }
    return 'trouve'
}

# Les deux vues de HKCR\CLSID lisibles par le fournisseur PowerShell.
function Vues-Hkcr {
    if (-not $script:Os64) {
        return @(@{ Nom = 'HKCR\CLSID (Windows 32 bits)'; Base = 'Registry::HKEY_CLASSES_ROOT'; Bits = '32' })
    }
    if ($script:Proc64) {
        return @(
            @{ Nom = 'HKCR\CLSID (vue 64 bits)'; Base = 'Registry::HKEY_CLASSES_ROOT'; Bits = '64' },
            @{ Nom = 'HKCR\WOW6432Node\CLSID (vue 32 bits)'; Base = 'Registry::HKEY_CLASSES_ROOT\WOW6432Node'; Bits = '32' }
        )
    }
    return @(@{ Nom = 'HKCR\CLSID (vue 32 bits : ce PowerShell est 32 bits, la vue 64 bits n''est pas lisible ici)'; Base = 'Registry::HKEY_CLASSES_ROOT'; Bits = '32' })
}

# Valeur par défaut d'une clé de HKCR dans une vue (64 ou 32 bits) ; passe par
# reg.exe quand ce PowerShell 32 bits ne voit pas la vue 64 bits.
function Defaut-Hkcr([string]$rel, [string]$bits) {
    if ($script:Proc64 -or -not $script:Os64) {
        $base = 'Registry::HKEY_CLASSES_ROOT\'
        if ($bits -eq '32' -and $script:Os64) { $base = 'Registry::HKEY_CLASSES_ROOT\WOW6432Node\' }
        return (Valeur-Defaut ($base + $rel))
    }
    if ($bits -eq '32') { return (Valeur-Defaut ('Registry::HKEY_CLASSES_ROOT\' + $rel)) }
    if (-not $script:RegExe) { return '' }
    $res = Lancer $script:RegExe @('query', ('HKCR\' + $rel), '/ve', '/reg:64')
    foreach ($l in $res.Lignes) {
        if ($l -match '^\s{2,}(.+?)\s{4}(REG_[A-Z_]+)(\s{4}(.*))?$') { return "$($matches[4])" }
    }
    return ''
}

# reg.exe query <clé> /s /f <motif> /d : cherche les valeurs qui contiennent le
# motif. Rend @{ Etat ; Cles ; Valeurs (clé -> liste de @{Nom;Type;Donnee}) ;
# Secondes ; Incomplet ; Message }. Une ligne « ERROR: » / « ERREUR : » (accès
# refusé à une sous-clé...) rend la recherche NON LISIBLE, ou INCOMPLÈTE si des
# clés ont quand même été lues : « rien » ne se dit que d'une recherche sans erreur.
function Chercher-Reg([string]$cle, [string]$motif, [string]$vue) {
    $r = @{ Etat = 'indisponible'; Cles = @(); Valeurs = @{}; Secondes = 0; Message = ''; Incomplet = $false }
    if (-not $script:RegExe) { return $r }
    $arguments = @('query', $cle, '/s', '/f', $motif, '/d')
    if ($vue) { $arguments += ('/reg:' + $vue) }
    $t0 = Get-Date
    $res = Lancer $script:RegExe $arguments
    $r.Secondes = ((Get-Date) - $t0).TotalSeconds
    if (-not $res.Ok) { $r.Etat = 'illisible'; $r.Message = $res.Message; return $r }
    $courante = ''
    $erreurs = @()
    foreach ($l in $res.Lignes) {
        if ($l -match '^HKEY_') {
            $courante = $l.Trim()
            if (-not $r.Valeurs.ContainsKey($courante)) { $r.Cles += $courante; $r.Valeurs[$courante] = @() }
            continue
        }
        if ($courante -and $l -match '^\s{2,}(.+?)\s{4}(REG_[A-Z_]+)(\s{4}(.*))?$') {
            $r.Valeurs[$courante] += @{ Nom = $matches[1]; Type = $matches[2]; Donnee = "$($matches[4])" }
            continue
        }
        # Clé de départ introuvable : c'est « absent », pas une erreur de lecture.
        if ($l -match '^(?i)\s*(ERROR|ERREUR)\s*:' -and -not ($l -match '(?i)unable to find|n.a pas trouv|introuvable')) { $erreurs += $l.Trim() }
    }
    $tout = ($res.Lignes -join ' ')
    if ($r.Cles.Count -eq 0 -and $tout -match '(?i)administra') { $r.Etat = 'illisible'; $r.Message = 'reg.exe bloqué par une stratégie : ' + $tout.Trim(); return $r }
    if ($r.Cles.Count -gt 0) {
        $r.Etat = 'trouve'
        if ($erreurs.Count -gt 0) { $r.Incomplet = $true; $r.Message = $erreurs[0] }
        return $r
    }
    if ($erreurs.Count -gt 0) { $r.Etat = 'illisible'; $r.Message = $erreurs[0]; return $r }
    $r.Etat = 'absent'
    return $r
}

# Une ligne du rapport pour une recherche reg.exe.
function Texte-Recherche($res) {
    if ($res.Etat -eq 'trouve') {
        $t = '' + $res.Cles.Count + ' clé(s)'
        if ($res.Incomplet) { $t += ', INCOMPLET (' + $res.Message + ')' }
        return $t
    }
    if ($res.Etat -eq 'absent') { return 'rien' }
    if ($res.Etat -eq 'indisponible') { return 'NON DISPONIBLE ICI' }
    return ('NON LISIBLE (' + $res.Message + ')')
}

# Les programmes installés (clés Uninstall), lus une fois.
function Charger-Programmes {
    if ($null -ne $script:Programmes) { return }
    $script:Programmes = @()
    if (-not $script:RegistreDispo) { return }
    $lieux = @(
        @{ Chemin = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall'; Vue = 'machine, 64 bits' },
        @{ Chemin = 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'; Vue = 'machine, 32 bits' },
        @{ Chemin = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall'; Vue = 'utilisateur' }
    )
    foreach ($l in $lieux) {
        foreach ($s in @(Sous-Cles $l.Chemin)) {
            $r = Lire-Cle ($l.Chemin + '\' + $s)
            if ($r.Etat -ne 'trouve') { continue }
            $nom = "$($r.Valeurs['DisplayName'])"
            if (-not $nom) { continue }
            $script:Programmes += @{
                Nom = $nom
                Version = "$($r.Valeurs['DisplayVersion'])"
                Editeur = "$($r.Valeurs['Publisher'])"
                Dossier = "$($r.Valeurs['InstallLocation'])"
                Icone = "$($r.Valeurs['DisplayIcon'])"
                Vue = $l.Vue
            }
        }
    }
}

function Est-See([string]$t) {
    return ($t -match '(?i)(^|[^a-z])SEE([^a-z]|$)' -or $t -match '(?i)IGE\s*[\+\-]\s*XAO' -or $t -match '(?i)(^|[^a-z])ETAP([^a-z]|$)')
}

# Program Files, Program Files (x86), Common Files (64 et 32 bits).
function Bases-Programmes {
    $l = @()
    $vus = @{}
    $pf = $env:ProgramW6432
    if (-not $pf) { $pf = $env:ProgramFiles }
    $cf = $env:CommonProgramW6432
    if (-not $cf) { $cf = $env:CommonProgramFiles }
    $candidats = @(
        @{ Nom = 'Program Files'; Chemin = $pf },
        @{ Nom = 'Program Files (x86)'; Chemin = ${env:ProgramFiles(x86)} },
        @{ Nom = 'Common Files'; Chemin = $cf },
        @{ Nom = 'Common Files (x86)'; Chemin = ${env:CommonProgramFiles(x86)} }
    )
    foreach ($c in $candidats) {
        if (-not $c.Chemin) { continue }
        $k = ("$($c.Chemin)").ToLower()
        if ($vus.ContainsKey($k)) { continue }
        $vus[$k] = $true
        $l += $c
    }
    return $l
}

# Les disques locaux (lus une fois). DisquesSurs dit si la liste vient de
# Windows (Win32_LogicalDisk) ou d'un repli (C: seul).
function Disques-Locaux {
    if ($null -ne $script:Disques) { return $script:Disques }
    $d = @()
    if (Commande-Existe 'Get-CimInstance') {
        try {
            $d = @(Get-CimInstance -ClassName Win32_LogicalDisk -Filter 'DriveType=3' -ErrorAction Stop | ForEach-Object { "$($_.DeviceID)" })
            if ($d.Count -gt 0) { $script:DisquesSurs = $true }
        } catch { $d = @() }
    }
    if ($d.Count -eq 0 -and $script:EstWindows) { $d = @('C:') }
    $script:Disques = $d
    return $d
}

# Le chemin est-il sous Program Files ou Common Files (64 ou 32 bits) ?
function Est-SousProgrammes([string]$chemin) {
    $n = (Normaliser $chemin).TrimEnd('\').ToLower() + '\'
    foreach ($b in @(Bases-Programmes)) {
        $p = (Normaliser $b.Chemin).TrimEnd('\').ToLower() + '\'
        if ($n.StartsWith($p)) { return $true }
    }
    if ($n -match '^[a-z]:\\progra~\d\\') { return $true }
    return $false
}

# Noms de dossiers. Sous Program Files, l'éditeur choisit les noms : ils sont
# tous écrits. Ailleurs (D:\SEE, ProgramData...), un nom peut être celui d'un
# projet ou d'un programme : seuls les noms techniques connus sont écrits.
# Les dossiers de données (environnements, projets) ne sont jamais ouverts.
$script:MotifDonnees = '^(?i)(SEE_?Envs?|SEE_?Users?|Envs?|Environments?|Environnements?|Projects?|Projets?|SEE_?Projects?|SEE_?Projets?|Workspaces?|Backups?|Sauvegardes?|Archives?)$'
$script:MotifTechnique = '^(?i)(' + (@(
        'IGE\+XAO', 'SEE', 'SEE_Soft', 'Exe', 'Param', 'XSD', 'SeeExtractor', 'Docs?', 'VBAHelp', 'Help', 'Aide', 'Plugins?',
        'Common( Files)?', 'Tools', 'Outils', 'Bin', 'Lib', 'Lang', 'Languages?', 'Resources?', 'Templates?', 'standard',
        'Apps?', 'Applications?', 'Programs?', 'Programmes?', 'Logiciels?', 'Software',
        'SEE Electrical Expert( V\d+R\d+)?( \(x(86|64)\))?', 'SEE Project Manager( V\d+R\d+)?', 'SEE Report Viewer( V\d+R\d+)?', 'SPM',
        'SEE[ _\-]?(Electrical|Expert|Soft|Install|Setup|Common|Plugins?|Docs?)', 'SEE[ _\-]?V?\d+([._R]\d+)*',
        'SEEDEF', 'SEEELECTRICALAPI', 'SEEEXTRACTOR', 'SEEMACROSMANAGER(MIG\.V[\d.]+)?', 'SEEROUTING', 'SEESPMEXCHANGE',
        'SEETRANSLATION', 'SEEWDEXCHANGE', 'SEECOMBLOCKBASIS', 'SEEKEYUPDATE', 'SEESUPPORT', 'SeeBase', 'SeeHTMLBrowser',
        'SeePLC', 'SeeProtection', 'SeeUserAccess', 'SeeWebCatalog', 'See3DPanel', 'SeeStencil', 'SEEXmlSheetGenerator\w*',
        'IronPython[\w.]*', 'HASP (Driver|Server)', 'swiftshader',
        # numéros de version (5.2, 5.20, 4.80, 52, V5R2) ; pas de nombre de 3 chiffres ou plus (numéro de projet ?)
        'V?\d{1,2}([._]\d{1,3})*[A-Za-z]?', 'V\d+R\d+([ _\-]?SP\d+)?', 'x64', 'x86', 'win32', 'win64', '[a-z]{2}(-[A-Za-z]{2,4})?'
    ) -join '|') + ')$'

function Genre-Dossier([string]$nom) {
    if ($nom -match $script:MotifDonnees) { return 'donnees' }
    if ($nom -match $script:MotifTechnique) { return 'technique' }
    return 'autre'
}

# Racine de parcours hors Program Files : si un de ses noms n'est pas technique,
# le rapport l'écrira <DOSSIER SEE n°k> (voir Anonymiser).
function Proteger-Racine([string]$chemin) {
    if (-not $chemin -or (Est-SousProgrammes $chemin)) { return }
    $n = (Normaliser $chemin).TrimEnd('\')
    $tete = ''
    $reste = $n
    $tetes = @(Disques-Locaux)
    if ($env:ProgramData) { $tetes = @($env:ProgramData) + $tetes }
    foreach ($t in $tetes) {
        $tn = (Normaliser $t).TrimEnd('\')
        if ($n.ToLower().StartsWith($tn.ToLower() + '\')) { $tete = $tn; $reste = $n.Substring($tn.Length + 1); break }
    }
    if (-not $tete -and $n -match '^([A-Za-z]:)\\(.*)$') { $tete = $matches[1]; $reste = $matches[2] }
    $morceaux = @($reste -split '\\' | Where-Object { $_ })
    $libre = $false
    foreach ($m in $morceaux) { if ((Genre-Dossier $m) -ne 'technique') { $libre = $true } }
    if (-not $libre) { return }
    foreach ($x in $script:Masques) { if ($x.Chemin -eq $n.ToLower()) { return } }
    $motif = '(?i)'
    if ($tete.StartsWith('\')) { $motif += '[\\/]+' }
    if ($tete) { $motif += (@($tete -split '\\' | Where-Object { $_ } | ForEach-Object { Echapper $_ }) -join '[\\/]+') + '[\\/]+' }
    $motif += (@($morceaux | ForEach-Object { Echapper $_ }) -join '[\\/]+') + '(?=[\\/"''\s;,)]|$)'
    $remplacement = '<DOSSIER SEE n°' + ($script:Masques.Count + 1) + '>'
    if ($tete) { $remplacement = ($tete -replace '\\', $script:Sep) + $script:Sep + $remplacement }
    $script:Masques += @{ Chemin = $n.ToLower(); Motif = $motif; R = $remplacement; Longueur = $n.Length }
}

# Nature d'un emplacement approuvé d'Excel. Le chemin n'est écrit que pour les
# dossiers d'Office (modèles, démarrage, compléments) ; un emplacement ajouté par
# l'utilisateur ou par la stratégie pointe souvent vers un dossier de travail
# dont le nom citerait un programme ou un projet.
function Nature-Emplacement([string]$chemin) {
    $r = @{ Texte = ''; Office = $false; Reseau = $false }
    $c = "$chemin".Trim()
    if (-not $c) { $r.Texte = 'chemin vide'; return $r }
    $n = Normaliser $c
    $bases = @(@{ P = '%APPDATA%\Microsoft\'; R = '%APPDATA%\Microsoft\' })
    if ($env:APPDATA) { $bases += @{ P = (Normaliser $env:APPDATA).TrimEnd('\') + '\Microsoft\'; R = '%APPDATA%\Microsoft\' } }
    foreach ($pf in @($env:ProgramW6432, $env:ProgramFiles, ${env:ProgramFiles(x86)}, '%ProgramFiles%', '%ProgramFiles(x86)%')) {
        if ($pf) { $bases += @{ P = (Normaliser $pf).TrimEnd('\') + '\Microsoft Office\'; R = (Normaliser $pf).TrimEnd('\') + '\Microsoft Office\' } }
    }
    foreach ($b in $bases) {
        if ($n.ToLower().StartsWith($b.P.ToLower())) {
            $r.Office = $true
            $r.Texte = 'dossier d''Office ' + $b.R + $n.Substring($b.P.Length)
            return $r
        }
    }
    if ($n -match '^(?i)https?:') { $r.Reseau = $true; $r.Texte = 'adresse web (SharePoint, OneDrive en ligne...)'; return $r }
    if ($n.StartsWith('\\')) { $r.Reseau = $true; $r.Texte = 'réseau (partage \\serveur\...)'; return $r }
    if ($n -match '^(?i)%(USERPROFILE|APPDATA|LOCALAPPDATA|HOMEPATH|OneDrive\w*)%') { $r.Texte = 'sous le profil de l''utilisateur (' + $matches[0] + ')'; return $r }
    $profil = ''
    if ($env:USERPROFILE) { $profil = (Normaliser $env:USERPROFILE).TrimEnd('\').ToLower() + '\' }
    if (($profil -and $n.ToLower().StartsWith($profil)) -or $n -match '^(?i)[A-Za-z]:\\Users\\') {
        $r.Texte = 'sous un profil d''utilisateur'
        if ($n -match '(?i)\\OneDrive') { $r.Texte += ' (dossier OneDrive synchronisé)' }
        return $r
    }
    if (Est-SousProgrammes $n) { $r.Texte = 'sous Program Files'; return $r }
    if ($n -match '^([A-Za-z]:)') {
        $l = $matches[1].ToUpper()
        $locaux = @(Disques-Locaux | ForEach-Object { "$_".ToUpper() })
        if ($locaux -contains $l) { $r.Texte = 'disque local ' + $l; return $r }
        if ($script:DisquesSurs) { $r.Texte = 'lecteur ' + $l + ' (pas un disque local : lecteur réseau ou amovible)'; return $r }
        $r.Texte = 'lecteur ' + $l + ' (local ou réseau : non déterminé ici)'
        return $r
    }
    $r.Texte = 'autre forme de chemin'
    return $r
}

# Emplacements approuvés d'Excel pour une version d'Office : ceux de la
# stratégie et ceux de l'utilisateur, et les trois réglages qui décident lesquels
# comptent (noms de valeurs de l'ADMX Office, de mémoire, non vérifiés ici) :
#   Excel\Security\Trusted Locations\AllLocationsDisabled = 1 : tous désactivés ;
#   Excel\Security\Trusted Locations\AllowNetworkLocations = 1 : réseau accepté ;
#   Common\Security\Trusted Locations\Allow User Locations = 0 (stratégie) :
#     seuls les emplacements posés par la stratégie comptent.
# Jamais Description ni Date ; le chemin seulement pour un dossier d'Office.
function Lire-Emplacements([string]$v) {
    $res = @{ Lignes = @(); NbCles = 0; Utilisables = 0; UtilisablesStrategie = 0; Desactives = $false; UtilisateurIgnore = $false; Synthese = '' }
    $origines = @(
        @{ Nom = 'stratégie utilisateur (GPO)'; Strategie = $true; Chemin = 'HKCU:\Software\Policies\Microsoft\Office\' + $v + '\Excel\Security\Trusted Locations' },
        @{ Nom = 'stratégie machine (GPO)'; Strategie = $true; Chemin = 'HKLM:\SOFTWARE\Policies\Microsoft\Office\' + $v + '\Excel\Security\Trusted Locations' },
        @{ Nom = 'réglage de l''utilisateur'; Strategie = $false; Chemin = 'HKCU:\Software\Microsoft\Office\' + $v + '\Excel\Security\Trusted Locations' }
    )
    $desact = $null
    $desactOu = ''
    $reseau = $null
    $reseauOu = ''
    $liste = @()
    foreach ($o in $origines) {
        $r = Lire-Cle $o.Chemin
        if ($r.Etat -eq 'illisible') { $res.Lignes += ('    ' + $o.Nom + ' : ' + (Texte-Etat $r)); continue }
        if ($r.Etat -ne 'trouve') { continue }
        $res.NbCles++
        if ($null -eq $desact -and $r.Valeurs.ContainsKey('AllLocationsDisabled')) { $desact = "$($r.Valeurs['AllLocationsDisabled'])"; $desactOu = $o.Nom }
        if ($null -eq $reseau -and $r.Valeurs.ContainsKey('AllowNetworkLocations')) { $reseau = "$($r.Valeurs['AllowNetworkLocations'])"; $reseauOu = $o.Nom }
        foreach ($s in @(Sous-Cles $o.Chemin)) {
            $e = Lire-Cle ($o.Chemin + '\' + $s)
            if ($e.Etat -ne 'trouve') { continue }
            $liste += @{ Cle = $s; Origine = $o.Nom; Strategie = $o.Strategie; Nature = (Nature-Emplacement "$($e.Valeurs['Path'])"); SousDossiers = ("$($e.Valeurs['AllowSubfolders'])" -eq '1') }
        }
    }
    $mix = $null
    $mixOu = ''
    foreach ($c in @(@{ Nom = 'stratégie utilisateur (GPO)'; Chemin = 'HKCU:\Software\Policies\Microsoft\Office\' + $v + '\Common\Security\Trusted Locations' },
            @{ Nom = 'stratégie machine (GPO)'; Chemin = 'HKLM:\SOFTWARE\Policies\Microsoft\Office\' + $v + '\Common\Security\Trusted Locations' })) {
        $x = Valeur $c.Chemin 'Allow User Locations'
        if ($null -eq $mix -and $null -ne $x) { $mix = "$x"; $mixOu = $c.Nom; $res.NbCles++ }
    }
    if ($res.NbCles -eq 0) { return $res }
    $res.Desactives = ($desact -eq '1')
    $res.UtilisateurIgnore = ($mix -eq '0')
    $res.Lignes += '    Emplacements approuvés d''Excel (chemin écrit pour les seuls dossiers d''Office ; liste complète dans Excel :'
    $res.Lignes += '    Fichier > Options > Centre de gestion de la confidentialité > Paramètres > Emplacements approuvés) :'
    if ($liste.Count -eq 0) { $res.Lignes += '        aucun' }
    $k = 0
    foreach ($e in $liste) {
        $t = '        [' + $e.Cle + '] ' + $e.Origine + ' : '
        if ($e.Nature.Office) { $t += $e.Nature.Texte }
        else { $k++; $t += 'emplacement personnalisé n°' + $k + ', ' + $e.Nature.Texte }
        if ($e.SousDossiers) { $t += ' ; sous-dossiers compris' } else { $t += ' ; sans les sous-dossiers' }
        $raison = ''
        if ($res.Desactives) { $raison = 'tous les emplacements sont désactivés' }
        elseif ($res.UtilisateurIgnore -and -not $e.Strategie) { $raison = 'la stratégie ignore les emplacements de l''utilisateur' }
        elseif ($e.Nature.Reseau -and $reseau -ne '1') { $raison = 'emplacement réseau non autorisé' }
        if ($raison) { $t += ' ; IGNORÉ en principe (' + $raison + ')' }
        else {
            $res.Utilisables++
            if ($e.Strategie) { $res.UtilisablesStrategie++ }
        }
        $res.Lignes += $t
    }
    if ($null -ne $desact) { $res.Lignes += ('    AllLocationsDisabled = ' + $desact + ' (' + $desactOu + ') : 1 = tous les emplacements approuvés sont désactivés') }
    if ($null -ne $reseau) { $res.Lignes += ('    AllowNetworkLocations = ' + $reseau + ' (' + $reseauOu + ') : 1 = emplacements réseau acceptés') }
    else { $res.Lignes += '    AllowNetworkLocations non défini : en principe, les emplacements réseau sont ignorés' }
    if ($null -ne $mix) { $res.Lignes += ('    Allow User Locations = ' + $mix + ' (' + $mixOu + ', Common\Security\Trusted Locations) : 0 = seuls les emplacements posés par la stratégie comptent') }
    if ($res.Desactives) { $res.Synthese = 'tous désactivés (AllLocationsDisabled = 1)' }
    elseif ($res.UtilisateurIgnore) { $res.Synthese = 'seuls ceux de la stratégie comptent : ' + $res.UtilisablesStrategie + ' utilisable(s)' }
    else { $res.Synthese = '' + $res.Utilisables + ' utilisable(s)' }
    $res.Lignes += ('    => emplacements approuvés, en principe : ' + $res.Synthese)
    return $res
}

# Parcours en largeur, borné en profondeur et en temps : ne retient que des noms
# de fichiers techniques (SEE.exe, bibliothèques de types, plugins...). N'ouvre
# jamais un dossier de données ; sous une racine filtrée (hors Program Files),
# n'ouvre que les dossiers aux noms techniques.
# $racines : liste de @{ Chemin ; Filtre }.
function Parcourir($racines, [int]$profMax, [int]$secondes) {
    $p = @{ SeeExe = @(); Tlb = @(); Macros = @(); IronPython = @(); Adg = @(); Api = @(); Dossiers = @()
        NbDossiers = 0; NbFichiers = 0; NbRefus = 0; NbEcartes = 0; Interrompu = $false; Secondes = 0 }
    $t0 = Get-Date
    $limite = $t0.AddSeconds($secondes)
    $qc = @{}
    $qp = @{}
    $qf = @{}
    $vus = @{}
    $tete = 0
    $queue = 0
    foreach ($r in $racines) { $qc[$queue] = $r.Chemin; $qp[$queue] = 0; $qf[$queue] = [bool]$r.Filtre; $queue++ }
    while ($tete -lt $queue) {
        if ((Get-Date) -gt $limite) { $p.Interrompu = $true; break }
        $dir = $qc[$tete]
        $prof = $qp[$tete]
        $filtre = $qf[$tete]
        $qc.Remove($tete)
        $qp.Remove($tete)
        $qf.Remove($tete)
        $tete++
        $cle = (Normaliser $dir).TrimEnd('\').ToLower()
        if ($vus.ContainsKey($cle)) { continue }
        $vus[$cle] = $true
        $err = $null
        $items = @(Get-ChildItem -LiteralPath $dir -Force -ErrorAction SilentlyContinue -ErrorVariable err)
        $p.NbDossiers++
        if ($err) { $p.NbRefus++ }
        foreach ($it in $items) {
            $nom = $it.Name
            if ($it.PSIsContainer) {
                if ("$($it.Attributes)" -match 'ReparsePoint') { continue }
                $genre = Genre-Dossier $nom
                if ($genre -eq 'donnees' -or ($filtre -and $genre -ne 'technique')) { $p.NbEcartes++; continue }
                $n = Normaliser $it.FullName
                if ($n -match '(?i)\\SEE_Soft\\Param\\(XSD|SeeExtractor)$' -or $n -match '(?i)\\VBAHelp$' -or
                    $n -match '(?i)\\Plugins\\SEE\\[^\\]+$' -or $nom -match '(?i)SEEXmlSheetGenerator') {
                    $p.Dossiers += $it.FullName
                }
                if ($prof + 1 -lt $profMax) { $qc[$queue] = $it.FullName; $qp[$queue] = $prof + 1; $qf[$queue] = $filtre; $queue++ }
            } else {
                $p.NbFichiers++
                if ($nom -match '(?i)^SEE\.exe$') { $p.SeeExe += $it.FullName }
                elseif ($nom -match '(?i)\.(tlb|olb)$') {
                    $p.Tlb += $it.FullName
                    if ($nom -match '(?i)SEEXmlSheetGenerator') { $p.Adg += $it.FullName }
                }
                elseif ($nom -match '(?i)^SeeMacrosManager\.exe$') { $p.Macros += $it.FullName }
                elseif ($nom -match '(?i)^IronPython.*\.dll$') { $p.IronPython += $it.FullName }
                elseif ($nom -match '(?i)SEEXmlSheetGenerator') { $p.Adg += $it.FullName }
                elseif ($nom -match '(?i)^(SeePluginSDK.*|SEEPrjInterface.*|SeeSdk)\.dll$') { $p.Api += $it.FullName }
            }
        }
    }
    $p.Secondes = ((Get-Date) - $t0).TotalSeconds
    return $p
}

# Arborescence des dossiers (noms seulement), bornée. Un dossier de données est
# nommé, jamais ouvert. Avec $filtre (hors Program Files), seuls les noms
# techniques sont écrits ; les autres sont comptés.
function Arbre([string]$dossier, [int]$niveau, [int]$max, [string]$retrait, [bool]$filtre) {
    $sous = @(Get-ChildItem -LiteralPath $dossier -Force -ErrorAction SilentlyContinue | Where-Object { $_.PSIsContainer } | Sort-Object Name)
    $caches = 0
    foreach ($s in $sous) {
        if ($script:LignesArbre -ge 400) {
            if (-not $script:ArbreCoupe) { Ligne ($retrait + '… (liste coupée à 400 lignes)'); $script:ArbreCoupe = $true }
            return
        }
        $genre = Genre-Dossier $s.Name
        if ($filtre -and $genre -eq 'autre') { $caches++; continue }
        $script:LignesArbre++
        if ($genre -eq 'donnees') { Ligne ($retrait + $s.Name + '\   (données : contenu non listé)'); continue }
        Ligne ($retrait + $s.Name + '\')
        if ($niveau -lt $max) { Arbre $s.FullName ($niveau + 1) $max ($retrait + '    ') $filtre }
    }
    if ($caches -gt 0) { Ligne ($retrait + ('({0} autre(s) dossier(s), nom non technique : non nommé(s))' -f $caches)) }
}

function Secondes([double]$s) {
    return ('{0:N1} s' -f $s)
}

# ===========================================================================
# 1. Windows
# ===========================================================================
Executer-Section 'Windows' {
    if (-not $script:EstWindows) {
        Etat 'NON DISPONIBLE ICI (ce n''est pas Windows)'
        Ligne ('Système : ' + "$($PSVersionTable.OS)")
        $script:Constat.Windows = 'non vérifiable ici (pas Windows : ' + "$($PSVersionTable.OS)" + ')'
        return
    }
    $cv = Lire-Cle 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
    $produit = ''
    $build = ''
    if ($cv.Etat -eq 'trouve') {
        foreach ($n in @('ProductName', 'EditionID', 'DisplayVersion', 'ReleaseId', 'CurrentBuild', 'UBR', 'InstallationType')) {
            if ($cv.Valeurs.ContainsKey($n)) { Ligne ($n + ' = ' + (Texte-Valeur $cv.Valeurs[$n])) }
        }
        $produit = "$($cv.Valeurs['ProductName'])"
        $build = "$($cv.Valeurs['CurrentBuild'])"
        $ubr = "$($cv.Valeurs['UBR'])"
        $dv = "$($cv.Valeurs['DisplayVersion'])"
        if (-not $dv) { $dv = "$($cv.Valeurs['ReleaseId'])" }
        $num = 0
        if ($build -match '^\d+$') { $num = [int]$build }
        if ($num -ge 22000 -and $produit -match 'Windows 10') {
            $produit = $produit -replace 'Windows 10', 'Windows 11'
            Ligne 'Build 22000 ou plus : c''est Windows 11 (le registre écrit encore « Windows 10 » dans ProductName).'
        }
        $script:Constat.Windows = ($produit + ' ' + $dv + ' (build ' + $build + '.' + $ubr + ')').Trim()
        Etat 'TROUVÉ'
    } else {
        Ligne ('Version de Windows : ' + (Texte-Etat $cv))
        $script:Constat.Windows = 'version non lisible'
        Etat (Texte-Etat $cv)
    }
    $bitsOs = '32 bits'
    if ($script:Os64) { $bitsOs = '64 bits' }
    $bitsPs = '32 bits'
    if ($script:Proc64) { $bitsPs = '64 bits' }
    Ligne ('Windows : ' + $bitsOs + ' (PROCESSOR_ARCHITECTURE = ' + $env:PROCESSOR_ARCHITECTURE + ', PROCESSOR_ARCHITEW6432 = ' + $env:PROCESSOR_ARCHITEW6432 + ')')
    Ligne ('Ce PowerShell tourne en ' + $bitsPs)
    $script:Constat.Windows += ', ' + $bitsOs
    try { Ligne ('Langue : culture ' + (Get-Culture).Name + ', interface ' + (Get-UICulture).Name) } catch { Ligne 'Langue : non lisible' }
    $net = Lire-Cle 'HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full'
    if ($net.Etat -eq 'trouve') {
        $rel = 0
        if ("$($net.Valeurs['Release'])" -match '^\d+$') { $rel = [int]"$($net.Valeurs['Release'])" }
        $lib = 'antérieur à 4.7.2'
        if ($rel -ge 461808) { $lib = '4.7.2' }
        if ($rel -ge 528040) { $lib = '4.8' }
        if ($rel -ge 533320) { $lib = '4.8.1' }
        Ligne ('.NET Framework 4 : Version = ' + "$($net.Valeurs['Version'])" + ', Release = ' + $rel + ' (' + $lib + ')')
    } else {
        Ligne ('.NET Framework 4 : ' + (Texte-Etat $net))
    }
}

# ===========================================================================
# 2. PowerShell
# ===========================================================================
Executer-Section 'PowerShell (version, mode du langage, stratégies d''exécution)' {
    $v = "$($PSVersionTable.PSVersion)"
    Ligne ('Version : ' + $v + ' ; édition : ' + "$($PSVersionTable.PSEdition)")
    if ($PSVersionTable.CLRVersion) { Ligne ('CLR : ' + "$($PSVersionTable.CLRVersion)") }
    Ligne ('Hôte : ' + "$($Host.Name)")
    $bits = '32 bits'
    if ($script:Proc64) { $bits = '64 bits' }
    if (-not $script:EstWindows) { $bits = 'sans objet hors Windows' }
    Ligne ('Processus : ' + $bits)
    $mode = "$($ExecutionContext.SessionState.LanguageMode)"
    $script:Constat.Mode = $mode
    Ligne ('LanguageMode : ' + $mode)
    if ($mode -eq 'FullLanguage') {
        Ligne '    = langage complet : rien n''est verrouillé pour ce script.'
    } elseif ($mode -eq 'ConstrainedLanguage') {
        Ligne '    = langage restreint : le poste applique AppLocker ou WDAC (ou une stratégie équivalente).'
        Ligne '      Le diagnostic marche quand même ; certaines vérifications disent « non disponible ici ».'
    } else {
        Ligne '    = mode inhabituel : certaines vérifications peuvent manquer.'
    }
    if ($env:__PSLockdownPolicy) { Ligne ('__PSLockdownPolicy (variable d''environnement) = ' + $env:__PSLockdownPolicy) }
    $script:Constat.Ps = $v + ', mode ' + $mode + ', processus ' + $bits
    Etat 'TROUVÉ'

    Ligne ''
    Ligne 'Stratégies d''exécution (par portée) :'
    try {
        foreach ($e in @(Get-ExecutionPolicy -List -ErrorAction Stop)) {
            Ligne ('    ' + "$($e.Scope)" + ' = ' + "$($e.ExecutionPolicy)")
        }
    } catch {
        Ligne ('    non disponible ici : ' + $_.Exception.Message)
    }
    Ligne '    (MachinePolicy / UserPolicy viennent d''une GPO de l''entreprise : elles priment sur -ExecutionPolicy Bypass.)'

    Ligne ''
    Ligne 'Verrouillage du poste :'
    if (-not $script:RegistreDispo) {
        Ligne '    AppLocker, SRP : non disponible ici (pas de registre Windows)'
    } else {
        $al = 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\SrpV2'
        $sous = @(Sous-Cles $al)
        if ($sous.Count -eq 0) {
            Ligne ('    AppLocker (' + ($al -replace '^HKLM:', 'HKLM') + ') : ' + (Texte-Etat (Lire-Cle $al)))
        } else {
            foreach ($s in $sous) {
                $m = Valeur ($al + '\' + $s) 'EnforcementMode'
                $txt = 'non configuré'
                if ("$m" -eq '1') { $txt = 'appliqué' } elseif ("$m" -eq '0') { $txt = 'audit seulement' }
                $nb = @(Sous-Cles ($al + '\' + $s)).Count
                Ligne ('    AppLocker ' + $s + ' : ' + $txt + ' (' + $nb + ' règle(s))')
            }
        }
        $srp = Valeur 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\Safer\CodeIdentifiers' 'DefaultLevel'
        if ($null -eq $srp) { Ligne '    Stratégies de restriction logicielle (SRP) : absentes' }
        else { Ligne ('    Stratégies de restriction logicielle (SRP) : DefaultLevel = ' + "$srp" + ' (262144 = non restreint, 0 = interdit)') }
    }
    if (Commande-Existe 'Get-CimInstance') {
        try {
            $dg = Get-CimInstance -Namespace 'root\Microsoft\Windows\DeviceGuard' -ClassName 'Win32_DeviceGuard' -ErrorAction Stop
            Ligne ('    WDAC (Device Guard) : CodeIntegrityPolicyEnforcementStatus = ' + "$($dg.CodeIntegrityPolicyEnforcementStatus)" +
                ', UsermodeCodeIntegrityPolicyEnforcementStatus = ' + "$($dg.UsermodeCodeIntegrityPolicyEnforcementStatus)" + ' (0 = arrêté, 1 = audit, 2 = appliqué)')
        } catch {
            Ligne ('    WDAC (Device Guard) : non lisible (' + $_.Exception.Message + ')')
        }
    } else {
        Ligne '    WDAC (Device Guard) : non disponible ici (Get-CimInstance absent)'
    }
    $pwsh = @(Get-Command 'pwsh' -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($pwsh.Count -gt 0) { Ligne ('PowerShell 7 (pwsh) : TROUVÉ : ' + "$($pwsh[0].Path)") }
    else { Ligne 'PowerShell 7 (pwsh) : absent' }
}

# ===========================================================================
# 3. Office et Excel
# ===========================================================================
Executer-Section 'Office et Excel (version, 32 ou 64 bits, sécurité des macros)' {
    if (-not $script:RegistreDispo) {
        Etat 'NON DISPONIBLE ICI (pas de registre Windows)'
        Ligne 'Office et Excel ne se cherchent que dans le registre Windows.'
        $script:Constat.Excel = 'non vérifiable ici'
        $script:Constat.Macros = 'non vérifiable ici'
        return
    }
    $bits = ''
    $source = ''
    $version = ''

    # Click-to-Run (Microsoft 365, Office 2019 et suivants)
    $c2r = Lire-Cle 'HKLM:\SOFTWARE\Microsoft\Office\ClickToRun\Configuration'
    if ($c2r.Etat -eq 'trouve') {
        Ligne 'Office Click-to-Run (« Démarrer en un clic ») : TROUVÉ'
        foreach ($n in @('Platform', 'VersionToReport', 'ProductReleaseIds', 'ClientCulture')) {
            if ($c2r.Valeurs.ContainsKey($n)) { Ligne ('    ' + $n + ' = ' + (Texte-Valeur $c2r.Valeurs[$n])) }
        }
        $pl = "$($c2r.Valeurs['Platform'])"
        if ($pl -eq 'x64') { $bits = '64'; $source = 'Platform de Click-to-Run' }
        elseif ($pl -eq 'x86') { $bits = '32'; $source = 'Platform de Click-to-Run' }
        $version = "$($c2r.Valeurs['VersionToReport'])"
    } else {
        Ligne ('Office Click-to-Run : ' + (Texte-Etat $c2r))
    }

    $cur = Defaut-Hkcr 'Excel.Application\CurVer' '64'
    if (-not $cur) { $cur = Valeur-Defaut 'Registry::HKEY_CLASSES_ROOT\Excel.Application\CurVer' }
    if ($cur) { Ligne ('Excel.Application\CurVer = ' + $cur) } else { Ligne 'Excel.Application (ProgID) : absent' }

    # Où est EXCEL.EXE
    $candidats = @()
    $lieux = @(
        'Registry::HKEY_CLASSES_ROOT\CLSID\{00024500-0000-0000-C000-000000000046}\LocalServer32',
        'Registry::HKEY_CLASSES_ROOT\WOW6432Node\CLSID\{00024500-0000-0000-C000-000000000046}\LocalServer32',
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\excel.exe',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\excel.exe'
    )
    foreach ($k in $lieux) {
        $f = Extraire-Exe (Valeur-Defaut $k)
        if ($f) { $candidats += $f }
    }
    foreach ($ver in @('16.0', '15.0', '14.0')) {
        foreach ($base in @('HKLM:\SOFTWARE\Microsoft\Office\', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Office\')) {
            $p = Valeur ($base + $ver + '\Excel\InstallRoot') 'Path'
            if ($p) {
                Ligne ('Office ' + $ver + ' (installation MSI) : ' + $base + $ver + '\Excel\InstallRoot = ' + "$p")
                $candidats += (Chemin "$p" 'EXCEL.EXE')
            }
            $bt = Valeur ($base + $ver + '\Outlook') 'Bitness'
            if ($bt) { Ligne ('    ' + $base + $ver + '\Outlook\Bitness = ' + "$bt") }
        }
    }
    $vus = @{}
    $exes = @()
    foreach ($f in $candidats) {
        if (-not (Test-Path -LiteralPath $f)) { continue }
        $k = $f.ToLower()
        if ($vus.ContainsKey($k)) { continue }
        $vus[$k] = $true
        $exes += $f
    }
    if ($exes.Count -eq 0) {
        Ligne 'EXCEL.EXE : absent (aucun chemin inscrit ne mène à un fichier)'
    }
    foreach ($f in $exes) {
        $i = Infos-Fichier $f
        Ligne ('EXCEL.EXE : ' + $f)
        Ligne ('    ' + (Texte-Infos $i))
        if ($i.Bits -and -not $source.StartsWith('en-tête')) { $bits = $i.Bits; $source = 'en-tête de EXCEL.EXE' }
        if (-not $version) { $version = $i.Version }
    }
    if (-not $bits -and $exes.Count -gt 0) {
        if ($exes[0] -match '(?i)Program Files \(x86\)|PROGRA~2') { $bits = '32'; $source = 'chemin Program Files (x86)' }
        elseif ($script:Os64) { $bits = '64'; $source = 'chemin Program Files' }
    }
    $nomOffice = ''
    if ($version -match '^16\.') { $nomOffice = ' (Microsoft 365 / Office 2016 et suivants)' }
    elseif ($version -match '^15\.') { $nomOffice = ' (Office 2013)' }
    elseif ($version -match '^14\.') { $nomOffice = ' (Office 2010)' }
    if ($exes.Count -gt 0 -or $c2r.Etat -eq 'trouve') {
        $t = 'Excel ' + $version + $nomOffice
        if ($bits) { $t += ', ' + $bits + ' bits (' + $source + ')' } else { $t += ', nombre de bits inconnu' }
        $script:Constat.Excel = $t
        $script:Constat.ExcelBits = $bits
        Ligne ('=> ' + $t)
        Etat 'TROUVÉ'
    } else {
        $script:Constat.Excel = 'absent'
        Etat 'ABSENT (Excel introuvable)'
    }

    # Sécurité des macros, par version d'Office
    Ligne ''
    Ligne 'Sécurité des macros d''Excel (la stratégie de l''entreprise prime sur le réglage de l''utilisateur) :'
    $versions = @()
    foreach ($base in @('HKCU:\Software\Microsoft\Office', 'HKCU:\Software\Policies\Microsoft\Office', 'HKLM:\SOFTWARE\Policies\Microsoft\Office')) {
        foreach ($s in @(Sous-Cles $base)) { if ($s -match '^\d+\.\d+$') { $versions += $s } }
    }
    $versions = @($versions | Sort-Object -Unique -Descending)
    if ($versions.Count -eq 0) { Ligne '    aucune clé de version d''Office (HKCU\Software\Microsoft\Office\<v>) : absent' }
    $verExcel = ''
    if ($version -match '^(\d+)\.') { $verExcel = $matches[1] + '.0' }
    $resumes = @{}
    $alertes = @{}
    foreach ($v in $versions) {
        Ligne ('  Office ' + $v + ' :')
        $lieuxSec = @(
            @{ Nom = 'stratégie utilisateur (GPO)'; Chemin = 'HKCU:\Software\Policies\Microsoft\Office\' + $v + '\Excel\Security' },
            @{ Nom = 'stratégie machine (GPO)'; Chemin = 'HKLM:\SOFTWARE\Policies\Microsoft\Office\' + $v + '\Excel\Security' },
            @{ Nom = 'réglage de l''utilisateur'; Chemin = 'HKCU:\Software\Microsoft\Office\' + $v + '\Excel\Security' }
        )
        $vbaw = $null
        $vbawOu = ''
        $vbom = $null
        $vbomOu = ''
        $internet = $null
        $nbCles = 0
        foreach ($l in $lieuxSec) {
            $r = Lire-Cle $l.Chemin
            Ligne ('    ' + $l.Nom + ' (' + ($l.Chemin -replace '^HKCU:', 'HKCU' -replace '^HKLM:', 'HKLM') + ') : ' + (Texte-Etat $r))
            if ($r.Etat -ne 'trouve') { continue }
            $nbCles++
            $null = Afficher-Cle $l.Chemin '        ' 0
            if ($null -eq $vbaw -and $r.Valeurs.ContainsKey('VBAWarnings')) { $vbaw = "$($r.Valeurs['VBAWarnings'])"; $vbawOu = $l.Nom }
            if ($null -eq $vbom -and $r.Valeurs.ContainsKey('AccessVBOM')) { $vbom = "$($r.Valeurs['AccessVBOM'])"; $vbomOu = $l.Nom }
            if ($null -eq $internet -and $r.Valeurs.ContainsKey('blockcontentexecutionfrominternet')) { $internet = "$($r.Valeurs['blockcontentexecutionfrominternet'])" }
        }
        # Les emplacements approuvés, par leur nature seulement ; jamais les
        # « documents approuvés » (Trusted Documents), qui citent des noms de classeurs.
        $em = Lire-Emplacements $v
        $nbCles += $em.NbCles
        foreach ($x in $em.Lignes) { Ligne $x }
        foreach ($c in @('HKCU:\Software\Policies\Microsoft\Office\' + $v + '\Common', 'HKLM:\SOFTWARE\Policies\Microsoft\Office\' + $v + '\Common')) {
            $off = Valeur $c 'VBAOff'
            if ($null -ne $off) {
                $nbCles++
                Ligne ('    VBAOff (' + ($c -replace '^HKCU:', 'HKCU' -replace '^HKLM:', 'HKLM') + ') = ' + "$off" + ' (1 = VBA désactivé dans tout Office)')
                if ("$off" -eq '1') { $alertes[$v] = 'VBA est désactivé par stratégie (VBAOff = 1) : le classeur pilote ne pourra pas tourner.' }
            }
        }
        if ($nbCles -eq 0) {
            Ligne '    => aucun réglage pour cette version : Excel garde son défaut (macros désactivées avec notification)'
            $resumes[$v] = 'Office ' + $v + ' : aucun réglage, défaut d''Excel (macros désactivées avec notification)'
            continue
        }
        $sens = 'macros désactivées avec notification : Excel proposera « Activer le contenu » (réglage par défaut)'
        $vb = $vbaw
        if ($null -eq $vb) { $vb = '2 (non défini, défaut)' }
        if ($vbaw -eq '1') { $sens = 'toutes les macros sont activées' }
        elseif ($vbaw -eq '3') { $sens = 'seules les macros signées par un éditeur approuvé tournent : en principe, le classeur pilote (non signé) devra être posé dans un emplacement approuvé (voir ci-dessus)' }
        elseif ($vbaw -eq '4') { $sens = 'toutes les macros sont désactivées sans notification : en principe, le classeur pilote devra être posé dans un emplacement approuvé (voir ci-dessus)' }
        $ligneVb = '    => VBAWarnings = ' + $vb
        if ($vbawOu) { $ligneVb += ' (' + $vbawOu + ')' }
        Ligne ($ligneVb + ' : ' + $sens)
        $ligneOm = '    => AccessVBOM = '
        if ($null -eq $vbom) { $ligneOm += 'non défini (0)' } else { $ligneOm += $vbom + ' (' + $vbomOu + ')' }
        Ligne ($ligneOm + ' : 1 = accès approuvé au modèle objet VBA ; le pilote n''en a pas besoin (les modules .bas s''importent à la main)')
        if ($null -ne $internet) {
            Ligne ('    => blockcontentexecutionfrominternet = ' + $internet + ' : 1 = macros bloquées dans les fichiers venus d''Internet ou d''un courriel')
        }
        $res = 'Office ' + $v + ' : VBAWarnings = ' + $vb
        if ($vbawOu) { $res += ' (' + $vbawOu + ')' }
        if ($null -ne $vbom) { $res += ', AccessVBOM = ' + $vbom }
        if ($em.Synthese) { $res += ' ; emplacements approuvés : ' + $em.Synthese }
        $resumes[$v] = $res
        if (($vbaw -eq '3' -or $vbaw -eq '4') -and -not $alertes.ContainsKey($v)) {
            $debut = 'Les macros non signées sont bloquées (VBAWarnings = ' + $vbaw + ')'
            if ($em.Desactives) {
                $alertes[$v] = $debut + ' et tous les emplacements approuvés sont désactivés (AllLocationsDisabled = 1) : en principe, le classeur pilote ne pourra pas tourner sur ce poste. Montre ce rapport au service informatique.'
            } elseif ($em.UtilisateurIgnore) {
                $alertes[$v] = $debut + ' et la stratégie ignore les emplacements ajoutés par l''utilisateur (Allow User Locations = 0) : en principe, seul un emplacement posé par la stratégie convient (' + $em.UtilisablesStrategie + ' trouvé(s), voir section Office). Sinon, demande au service informatique.'
            } else {
                $alertes[$v] = $debut + ' : en principe, pose le classeur pilote dans un emplacement approuvé (' + $em.Utilisables + ' trouvé(s), voir section Office) ou ajoutes-en un sur un disque local (Excel > Options > Centre de gestion de la confidentialité).'
            }
        }
    }
    # Le résumé retient la version d'Office d'EXCEL.EXE, sinon la plus récente.
    $choix = ''
    if ($verExcel -and $resumes.ContainsKey($verExcel)) { $choix = $verExcel }
    elseif ($versions.Count -gt 0) { $choix = $versions[0] }
    if ($choix) {
        $script:Constat.Macros = $resumes[$choix]
        if ($alertes.ContainsKey($choix)) { $script:Constat.MacrosAlerte = $alertes[$choix] }
    } else {
        $script:Constat.Macros = 'aucun réglage lu (défaut probable : macros désactivées avec notification)'
    }
    Ligne '    (Un classeur venu d''Internet ou d''un courriel porte une marque « Internet » : clic droit > Propriétés > Débloquer, avant de l''ouvrir.)'
}

# ===========================================================================
# 4. SEE : programmes installés
# ===========================================================================
Executer-Section 'SEE Electrical Expert : programmes installés (SEE, IGE+XAO, ETAP)' {
    if (-not $script:RegistreDispo) {
        Etat 'NON DISPONIBLE ICI (pas de registre Windows)'
        Ligne 'La liste des programmes installés se lit dans le registre Windows (clés Uninstall).'
        return
    }
    Charger-Programmes
    Ligne ('Programmes installés lus : ' + $script:Programmes.Count + ' (HKLM 64 bits, HKLM 32 bits, HKCU)')
    $see = @($script:Programmes | Where-Object { (Est-See $_.Nom) -or (Est-See $_.Editeur) } | Sort-Object { $_.Nom })
    if ($see.Count -eq 0) {
        Etat 'ABSENT (aucun programme dont le nom ou l''éditeur cite SEE, IGE+XAO ou ETAP)'
        return
    }
    Etat ('TROUVÉ (' + $see.Count + ' programme(s))')
    foreach ($p in $see) {
        Ligne ('- ' + $p.Nom)
        Ligne ('    version ' + $p.Version + ' ; éditeur ' + $p.Editeur + ' ; inscrit pour : ' + $p.Vue)
        if ($p.Dossier) { Ligne ('    dossier : ' + $p.Dossier) }
        elseif ($p.Icone) { Ligne ('    icône : ' + $p.Icone) }
        $script:Constat.SeeProgrammes += ($p.Nom + ' ' + $p.Version).Trim()
    }
}

# ===========================================================================
# 5. Dossiers IGE+XAO et SEE (3 niveaux)
# ===========================================================================
Executer-Section 'Dossiers IGE+XAO et SEE (jusqu''à 3 niveaux, noms seulement)' {
    $bases = @(Bases-Programmes)
    if ($bases.Count -eq 0) {
        Etat 'NON DISPONIBLE ICI (variables ProgramFiles absentes : ce n''est pas Windows)'
        Ligne 'Les dossiers Program Files et Common Files ne se cherchent que sous Windows.'
        return
    }
    Ligne 'Sous Program Files : tous les noms de dossiers. Ailleurs : les noms techniques connus seulement, les autres'
    Ligne 'sont comptés. Un dossier de données (environnements, projets) est nommé, jamais ouvert.'
    $trouve = 0
    $script:Racines = @()
    foreach ($b in $bases) {
        $d = Chemin $b.Chemin 'IGE+XAO'
        if (Test-Path -LiteralPath $d) {
            $trouve++
            $script:Racines += @{ Chemin = $d; Filtre = $false }
            Ligne ($d + ' : TROUVÉ')
            $script:LignesArbre = 0
            $script:ArbreCoupe = $false
            Arbre $d 1 3 '    ' $false
        } else {
            Ligne ($d + ' : absent')
        }
    }
    # À la racine des disques locaux : IGE+XAO, et les dossiers « SEE » suivi
    # d'un séparateur ou d'un chiffre (SEE, SEE_V5R2, SEE 5.2 ; pas Seeds).
    foreach ($disque in @(Disques-Locaux)) {
        $racine = Chemin $disque ''
        $cands = @(Get-ChildItem -LiteralPath $racine -Force -ErrorAction SilentlyContinue |
                Where-Object { $_.PSIsContainer -and ($_.Name -match '^(?i)IGE\+XAO$' -or $_.Name -match '^(?i)SEE([^a-z]|$)') } | Sort-Object Name)
        foreach ($s in $cands) {
            $trouve++
            if ((Genre-Dossier $s.Name) -eq 'donnees') {
                Ligne ($s.FullName + ' : TROUVÉ (données : contenu non listé, non parcouru)')
                continue
            }
            Proteger-Racine $s.FullName
            $script:Racines += @{ Chemin = $s.FullName; Filtre = $true }
            Ligne ($s.FullName + ' : TROUVÉ (hors Program Files)')
            $script:LignesArbre = 0
            $script:ArbreCoupe = $false
            Arbre $s.FullName 1 3 '    ' $true
        }
    }
    if ($env:ProgramData) {
        $pd = Chemin $env:ProgramData 'IGE+XAO'
        if (Test-Path -LiteralPath $pd) {
            Ligne ($pd + ' : TROUVÉ (premier niveau seulement)')
            $script:LignesArbre = 0
            $script:ArbreCoupe = $false
            Arbre $pd 1 1 '    ' $true
        } else {
            Ligne ($pd + ' : absent')
        }
    }
    if ($script:Masques.Count -gt 0) { Ligne ('' + $script:Masques.Count + ' dossier(s) racine au nom non technique : écrit(s) <DOSSIER SEE n°k> dans tout le rapport.') }
    if ($trouve -gt 0) { Etat ('TROUVÉ (' + $trouve + ' dossier(s) racine)') } else { Etat 'ABSENT (aucun dossier IGE+XAO)' }
}

# ===========================================================================
# 6. SEE : fichiers techniques
# ===========================================================================
Executer-Section 'SEE : fichiers techniques (SEE.exe, XSD, aide VBA, plugins, bibliothèques de types)' {
    $racines = @()
    $vus = @{}
    $candidates = @($script:Racines)
    Charger-Programmes
    foreach ($p in @($script:Programmes)) {
        if (-not ((Est-See $p.Nom) -or (Est-See $p.Editeur))) { continue }
        if ($p.Dossier -and (Est-Absolu $p.Dossier) -and ($p.Dossier -match '(?i)IGE\+XAO|SEE')) {
            $candidates += @{ Chemin = $p.Dossier; Filtre = -not (Est-SousProgrammes $p.Dossier) }
        }
    }
    if ($env:ProgramData) { $candidates += @{ Chemin = (Chemin $env:ProgramData 'IGE+XAO'); Filtre = $true } }
    foreach ($c in $candidates) {
        if (-not $c.Chemin) { continue }
        $n = (Normaliser $c.Chemin).TrimEnd('\').ToLower()
        if ($n -match '^[a-z]:$' -or $n -match '\\program files( \(x86\))?$') { continue }
        if (-not (Test-Path -LiteralPath $c.Chemin)) { continue }
        # Inutile de reprendre un dossier déjà couvert par une racine non filtrée.
        $dedans = $false
        foreach ($k in $vus.Keys) { if ($n -eq $k -or ($n.StartsWith($k + '\') -and -not $vus[$k])) { $dedans = $true } }
        if ($dedans) { continue }
        $vus[$n] = [bool]$c.Filtre
        if ($c.Filtre) { Proteger-Racine $c.Chemin }
        $racines += $c
    }
    if ($racines.Count -eq 0) {
        if (-not $script:EstWindows) { Etat 'NON DISPONIBLE ICI (ce n''est pas Windows : aucun dossier SEE à parcourir)' }
        else { Etat 'ABSENT (aucun dossier IGE+XAO ou SEE à parcourir)' }
        Ligne 'Aucun SEE.exe, aucune bibliothèque de types, aucun plugin SEE cherchables.'
        return
    }
    Ligne 'Dossiers parcourus (8 niveaux au plus, 90 s au plus ; hors Program Files, dossiers aux noms techniques seulement) :'
    foreach ($r in $racines) { Ligne ('    ' + $r.Chemin) }
    Write-Host '    parcours des dossiers SEE (jusqu''à 90 s)...'
    $p = Parcourir $racines 8 90
    $deja = @{}

    Ligne ''
    Ligne ('SEE.exe : ' + $p.SeeExe.Count + ' trouvé(s)')
    foreach ($f in $p.SeeExe) {
        $i = Infos-Fichier $f
        Ligne ('  - ' + $f)
        Ligne ('      ' + (Texte-Infos $i))
        $script:Constat.SeeExe += @{ Chemin = $f; Version = $i.Version; Arch = $i.Arch; Bits = $i.Bits }
        $soft = Parent (Parent $f)
        if ((Nom-Fichier $soft) -match '(?i)^SEE_Soft$') {
            $inst = Parent $soft
            Ligne ('      dossier d''installation : ' + $inst)
            foreach ($rel in @('SEE_Soft\Param\XSD', 'SEE_Soft\Param\SeeExtractor', 'Doc\VBAHelp')) {
                $d = Chemin $inst $rel
                if (Test-Path -LiteralPath $d) {
                    Ligne ('      ' + $rel + ' : TROUVÉ')
                    Ligne-Liste $d '          ' 200
                    $deja[(Normaliser $d).ToLower()] = $true
                } else {
                    Ligne ('      ' + $rel + ' : absent')
                }
            }
        } else {
            Ligne '      (SEE.exe n''est pas dans un dossier SEE_Soft\Exe : dossiers XSD / VBAHelp non déduits)'
        }
    }

    $plugins = @($p.Dossiers | Where-Object { (Normaliser $_) -match '(?i)\\Plugins\\SEE\\[^\\]+$' })
    Ligne ''
    Ligne ('Common\Plugins\SEE\<version> : ' + $plugins.Count + ' trouvé(s)')
    foreach ($d in $plugins) {
        Ligne ('  - ' + $d)
        Ligne-Liste $d '      ' 200
        $deja[(Normaliser $d).ToLower()] = $true
    }

    $autres = @($p.Dossiers | Where-Object { -not $deja.ContainsKey((Normaliser $_).ToLower()) -and -not ((Nom-Fichier $_) -match '(?i)SEEXmlSheetGenerator') })
    if ($autres.Count -gt 0) {
        Ligne ''
        Ligne 'Autres dossiers XSD / SeeExtractor / VBAHelp repérés :'
        foreach ($d in $autres) {
            Ligne ('  - ' + $d)
            Ligne-Liste $d '      ' 200
        }
    }

    Ligne ''
    Ligne ('Bibliothèques de types (.tlb, .olb) : ' + $p.Tlb.Count + ' trouvée(s)')
    $k = 0
    foreach ($f in @($p.Tlb | Sort-Object)) {
        $k++
        if ($k -gt 150) { Ligne ('  … ' + ($p.Tlb.Count - 150) + ' autre(s)'); break }
        Ligne ('  - ' + (Nom-Fichier $f) + '   (' + (Parent $f) + ')')
    }

    Ligne ''
    Ligne ('SeeMacrosManager.exe : ' + $p.Macros.Count + ' trouvé(s)')
    foreach ($f in $p.Macros) {
        Ligne ('  - ' + $f)
        Ligne ('      ' + (Texte-Infos (Infos-Fichier $f)))
    }

    Ligne ''
    Ligne ('IronPython*.dll : ' + $p.IronPython.Count + ' trouvé(s)')
    foreach ($f in @($p.IronPython | Sort-Object)) {
        $i = Infos-Fichier $f
        Ligne ('  - ' + (Nom-Fichier $f) + ' ' + $i.Version + '   (' + (Parent $f) + ')')
    }

    $adgDossiers = @($p.Dossiers | Where-Object { (Nom-Fichier $_) -match '(?i)SEEXmlSheetGenerator' })
    Ligne ''
    Ligne ('Plugin SEEXmlSheetGenerator (ADG) : ' + $adgDossiers.Count + ' dossier(s), ' + $p.Adg.Count + ' fichier(s)')
    foreach ($d in $adgDossiers) {
        Ligne ('  - dossier ' + $d)
        Ligne-Liste $d '      ' 100
    }
    foreach ($f in $p.Adg) {
        if ($adgDossiers -contains (Parent $f)) { continue }
        Ligne ('  - ' + $f)
    }

    if ($p.Api.Count -gt 0) {
        Ligne ''
        Ligne ('Autres briques d''API (SeePluginSDK, SEEPrjInterface, SeeSdk) : ' + $p.Api.Count)
        foreach ($f in @($p.Api | Sort-Object)) {
            $i = Infos-Fichier $f
            Ligne ('  - ' + (Nom-Fichier $f) + ' ' + $i.Version + ' ; ' + $i.Arch + '   (' + (Parent $f) + ')')
        }
    }

    Ligne ''
    $fin = 'complet'
    if ($p.Interrompu) { $fin = 'INTERROMPU au bout de 90 s : la liste peut être incomplète' }
    Ligne ('Parcours : ' + $p.NbDossiers + ' dossier(s), ' + $p.NbFichiers + ' fichier(s), ' + $p.NbRefus + ' dossier(s) refusé(s), ' + $p.NbEcartes + ' dossier(s) de données ou au nom non technique laissé(s) fermé(s), ' + (Secondes $p.Secondes) + ', ' + $fin)
    if ($p.SeeExe.Count -gt 0) { Etat ('TROUVÉ (' + $p.SeeExe.Count + ' SEE.exe)') }
    else { Etat 'ABSENT (aucun SEE.exe dans les dossiers parcourus)' }
}

# ===========================================================================
# 7. COM : les CLSID connus
# ===========================================================================
Executer-Section 'COM : les CLSID connus de SEE et sa bibliothèque de types' {
    if (-not $script:RegistreDispo) {
        Etat 'NON DISPONIBLE ICI (pas de registre Windows)'
        foreach ($k in $script:ClsidConnus) { Ligne ($k.Guid + ' - ' + $k.Nom + ' : non vérifiable ici') }
        Ligne ('TypeLib ' + $script:TypeLibSee + ' : non vérifiable ici')
        return
    }
    $script:Constat.RegistreLu = $true
    if ($script:Os64 -and -not $script:Proc64) {
        Ligne '!! Ce PowerShell est 32 bits sur un Windows 64 bits : la vue 64 bits ne se lit ici que par la recherche reg.exe (section suivante).'
        Ligne '   Relance plutôt par diagnostic.cmd, qui choisit le PowerShell 64 bits.'
    }
    $nbInscrits = 0
    foreach ($k in $script:ClsidConnus) {
        Ligne ''
        Ligne ($k.Guid + ' - ' + $k.Nom)
        $info = @{ Vues = @(); Serveur = ''; ServeurPresent = $null; Inproc = ''; ProgIDs = @() }
        foreach ($vue in @(Vues-Hkcr)) {
            $ch = $vue.Base + '\CLSID\' + $k.Guid
            $r = Lire-Cle $ch
            if ($r.Etat -ne 'trouve') { Ligne ('  ' + $vue.Nom + ' : ' + (Texte-Etat $r)); continue }
            Ligne ('  ' + $vue.Nom + ' : TROUVÉ')
            $info.Vues += $vue.Bits
            $null = Afficher-Cle $ch '      ' 2
            $ls = Valeur-Defaut ($ch + '\LocalServer32')
            if ($ls -and -not $info.Serveur) {
                $info.Serveur = $ls
                $f = Extraire-Exe $ls
                if ($f -and (Est-Absolu $f)) { $info.ServeurPresent = [bool](Test-Path -LiteralPath $f) }
            }
            $ip = Valeur-Defaut ($ch + '\InprocServer32')
            if ($ip -and -not $info.Inproc) { $info.Inproc = $ip }
            foreach ($s in @('ProgID', 'VersionIndependentProgID')) {
                $pid0 = Valeur-Defaut ($ch + '\' + $s)
                if ($pid0) { $info.ProgIDs += $pid0 }
            }
        }
        $origines = @(
            @{ Nom = 'HKLM\SOFTWARE\Classes\CLSID'; Chemin = 'HKLM:\SOFTWARE\Classes\CLSID\' + $k.Guid },
            @{ Nom = 'HKLM\SOFTWARE\WOW6432Node\Classes\CLSID'; Chemin = 'HKLM:\SOFTWARE\WOW6432Node\Classes\CLSID\' + $k.Guid },
            @{ Nom = 'HKCU\Software\Classes\CLSID'; Chemin = 'HKCU:\Software\Classes\CLSID\' + $k.Guid },
            @{ Nom = 'HKCU\Software\Classes\WOW6432Node\CLSID'; Chemin = 'HKCU:\Software\Classes\WOW6432Node\CLSID\' + $k.Guid }
        )
        $o = @()
        foreach ($x in $origines) { $o += ($x.Nom + ' = ' + (Texte-Etat (Lire-Cle $x.Chemin))) }
        Ligne ('  origine : ' + ($o -join ' ; '))
        $info.ProgIDs = @($info.ProgIDs | Sort-Object -Unique)
        if ($info.Vues.Count -gt 0) { $nbInscrits++ }
        $script:Constat.Clsid[$k.Guid] = $info
    }

    Ligne ''
    Ligne ('Bibliothèque de types SEEExpert ' + $script:TypeLibSee + ' :')
    $tl = 'trouve'
    $tlVu = $false
    foreach ($base in @('Registry::HKEY_CLASSES_ROOT\TypeLib\', 'Registry::HKEY_CLASSES_ROOT\WOW6432Node\TypeLib\')) {
        $ch = $base + $script:TypeLibSee
        $r = Lire-Cle $ch
        $nomBase = ($base -replace '^Registry::HKEY_CLASSES_ROOT', 'HKCR') + $script:TypeLibSee
        if ($r.Etat -ne 'trouve') { Ligne ('  ' + $nomBase + ' : ' + (Texte-Etat $r)); continue }
        $tlVu = $true
        Ligne ('  ' + $nomBase + ' : TROUVÉ')
        $null = Afficher-Cle $ch '      ' 4
        foreach ($ver in @(Sous-Cles $ch)) {
            $script:Constat.TypeLibs += ($script:TypeLibSee + ' ' + $ver + ' « ' + (Valeur-Defaut ($ch + '\' + $ver)) + ' »')
        }
    }

    Ligne ''
    foreach ($base in @('Registry::HKEY_CLASSES_ROOT\AppID\SEE.exe', 'Registry::HKEY_CLASSES_ROOT\WOW6432Node\AppID\SEE.exe')) {
        $nomBase = ($base -replace '^Registry::HKEY_CLASSES_ROOT', 'HKCR')
        $r = Lire-Cle $base
        Ligne ($nomBase + ' : ' + (Texte-Etat $r))
        if ($r.Etat -eq 'trouve') { $null = Afficher-Cle $base '      ' 0 }
    }

    $etat = 'ABSENT (aucun des CLSID connus n''est inscrit)'
    if ($nbInscrits -gt 0) { $etat = 'TROUVÉ (' + $nbInscrits + ' CLSID connu(s) inscrit(s) sur ' + $script:ClsidConnus.Count + ')' }
    if ($tlVu) { $etat += ' ; TypeLib SEEExpert inscrite' } else { $etat += ' ; TypeLib SEEExpert absente' }
    Etat $etat
}

# ===========================================================================
# 8. COM : recherche des ProgID et des serveurs de SEE
# ===========================================================================
Executer-Section 'COM : recherche des ProgID et des serveurs qui mènent à SEE' {
    if (-not $script:RegistreDispo) {
        Etat 'NON DISPONIBLE ICI (pas de registre Windows)'
        Ligne 'La recherche des ProgID et des serveurs COM se fait dans le registre Windows.'
        return
    }
    $guidsConnus = @{}
    foreach ($k in $script:ClsidConnus) { $guidsConnus[$k.Guid.ToUpper()] = $k.Nom }

    # A. Valeurs du registre qui citent l'installation de SEE (reg.exe, lecture seule).
    # Un serveur COM peut s'inscrire avec un chemin court 8.3, où « IGE+XAO »
    # devient « IGE_XA~1 » (« + » est interdit en 8.3) : on cherche donc toujours
    # aussi « IGE_XA », et « SEE_Soft » (nom 8.3 valide, gardé tel quel), qui
    # couvre en plus un SEE installé hors d'un dossier IGE+XAO.
    $motifs = @('IGE+XAO', 'IGE_XA', 'SEE_Soft')
    $vues = @('32')
    if ($script:Os64) { $vues = @('64', '32') }
    $entrees = @{}
    $ordre = @()
    $typelibs = @{}
    $ordreTl = @()
    $passes = @()
    foreach ($vue in $vues) { foreach ($motif in $motifs) { $passes += @{ Cle = 'HKCR\CLSID'; Motif = $motif; Vue = $vue } } }
    $vueTl = ''
    if ($script:Os64) { $vueTl = '64' }
    foreach ($motif in $motifs) { $passes += @{ Cle = 'HKCR\TypeLib'; Motif = $motif; Vue = $vueTl } }
    $budget = 180
    $passe0 = Get-Date
    $incomplet = $false
    Ligne ('A. Valeurs du registre qui citent « ' + ($motifs -join ' », « ') + ' » (reg.exe query /s /f, lecture seule, ' + $budget + ' s au plus) :')
    if (-not $script:RegExe) {
        Ligne '   non disponible ici (reg.exe introuvable)'
    } else {
        Write-Host ('    recherche dans le registre (reg.exe, ' + $passes.Count + ' passes de quelques secondes)...')
        foreach ($ps in $passes) {
            $t = '   ' + $ps.Cle
            if ($ps.Cle -eq 'HKCR\CLSID') { $t += ', vue ' + $ps.Vue + ' bits' }
            $t += ', « ' + $ps.Motif + ' » : '
            if (((Get-Date) - $passe0).TotalSeconds -gt $budget) {
                Ligne ($t + 'NON CHERCHÉ (plus de ' + $budget + ' s de recherche déjà passées)')
                $incomplet = $true
                continue
            }
            $res = Chercher-Reg $ps.Cle $ps.Motif $ps.Vue
            if ($res.Etat -ne 'trouve' -and $res.Etat -ne 'absent') { $incomplet = $true }
            if ($res.Incomplet) { $incomplet = $true }
            Ligne ($t + (Texte-Recherche $res) + ' en ' + (Secondes $res.Secondes))
            if ($ps.Cle -eq 'HKCR\CLSID') {
                $vue = $ps.Vue
                foreach ($cle in $res.Cles) {
                    if ($cle -notmatch '(?i)\\CLSID\\(\{[0-9A-F\-]{36}\})\\(LocalServer32|LocalServer|InprocServer32)(\\.*)?$') { continue }
                    $g = $matches[1].ToUpper()
                    $sous = $matches[2]
                    $id = $g + '|' + $vue
                    if (-not $entrees.ContainsKey($id)) {
                        $entrees[$id] = @{ Guid = $g; Vue = $vue; Exe = ''; Dll = ''; Valeur = '' }
                        $ordre += $id
                    }
                    foreach ($val in $res.Valeurs[$cle]) {
                        $f = Extraire-Exe $val.Donnee
                        if (-not $f) { continue }
                        if ($sous -match '(?i)^LocalServer' -and -not $entrees[$id].Exe) { $entrees[$id].Exe = $f; $entrees[$id].Valeur = $val.Donnee }
                        elseif ($sous -match '(?i)^InprocServer32' -and -not $entrees[$id].Dll) { $entrees[$id].Dll = $f }
                    }
                }
            } else {
                foreach ($cle in $res.Cles) {
                    if ($cle -notmatch '(?i)\\TypeLib\\(\{[0-9A-F\-]{36}\})\\([^\\]+)\\([^\\]+)\\(win32|win64)$') { continue }
                    $id = $matches[1].ToUpper() + ' ' + $matches[2]
                    $plat = $matches[4]
                    $don = ''
                    foreach ($val in $res.Valeurs[$cle]) { $don = $val.Donnee }
                    if (-not $typelibs.ContainsKey($id)) { $typelibs[$id] = @(); $ordreTl += $id }
                    $typelibs[$id] += ($plat + ' = ' + $don + (Note-Fichier $don))
                }
            }
        }
        if ($incomplet) { Ligne '   !! Recherche incomplète : un serveur de SEE peut manquer ci-dessous.' }
    }

    Ligne ''
    Ligne 'Serveurs COM hors processus (LocalServer32) qui mènent à SEE :'
    $nbExe = 0
    foreach ($id in $ordre) {
        $e = $entrees[$id]
        if (-not $e.Exe) { continue }
        $nbExe++
        $rel = 'CLSID\' + $e.Guid
        $progid = Defaut-Hkcr ($rel + '\ProgID') $e.Vue
        $vipid = Defaut-Hkcr ($rel + '\VersionIndependentProgID') $e.Vue
        $nomC = Defaut-Hkcr $rel $e.Vue
        $connu = ''
        if ($guidsConnus.ContainsKey($e.Guid)) { $connu = ' = ' + $guidsConnus[$e.Guid] }
        Ligne ('  ' + $e.Guid + $connu + ' (vue ' + $e.Vue + ' bits) : ' + (Nom-Fichier $e.Exe))
        Ligne ('      LocalServer32 = ' + $e.Valeur + (Note-Fichier $e.Valeur))
        Ligne ('      nom = ' + $nomC + ' ; ProgID = ' + $progid + ' ; VersionIndependentProgID = ' + $vipid)
        $script:Constat.ServeursSee += @{ Guid = $e.Guid; Vue = $e.Vue; Fichier = (Nom-Fichier $e.Exe); ProgID = $progid; VIProgID = $vipid; Connu = $guidsConnus.ContainsKey($e.Guid) }
    }
    if ($nbExe -eq 0) { Ligne '  aucun' }

    Ligne ''
    Ligne 'Serveurs COM en processus (InprocServer32, DLL), regroupés par fichier :'
    $parDll = @{}
    $ordreDll = @()
    foreach ($id in $ordre) {
        $e = $entrees[$id]
        if ($e.Exe -or -not $e.Dll) { continue }
        $cle = (Nom-Fichier $e.Dll).ToLower() + ' (vue ' + $e.Vue + ' bits)'
        if (-not $parDll.ContainsKey($cle)) { $parDll[$cle] = @(); $ordreDll += $cle }
        $parDll[$cle] += $e
    }
    if ($ordreDll.Count -eq 0) { Ligne '  aucun' }
    foreach ($cle in $ordreDll) {
        $liste = @($parDll[$cle])
        Ligne ('  ' + $cle + ' : ' + $liste.Count + ' classe(s)')
        $k = 0
        foreach ($e in $liste) {
            $k++
            if ($k -gt 8) { Ligne ('      … ' + ($liste.Count - 8) + ' autre(s)'); break }
            $progid = Defaut-Hkcr ('CLSID\' + $e.Guid + '\ProgID') $e.Vue
            $connu = ''
            if ($guidsConnus.ContainsKey($e.Guid)) { $connu = ' = ' + $guidsConnus[$e.Guid] }
            Ligne ('      ' + $e.Guid + $connu + ' ; ProgID = ' + $progid)
        }
    }

    Ligne ''
    Ligne 'Bibliothèques de types inscrites qui mènent à SEE :'
    if ($ordreTl.Count -eq 0) { Ligne '  aucune' }
    foreach ($id in $ordreTl) {
        $parts = $id -split ' '
        $desc = Valeur-Defaut ('Registry::HKEY_CLASSES_ROOT\TypeLib\' + $parts[0] + '\' + $parts[1])
        Ligne ('  ' + $id + ' « ' + $desc + ' »')
        foreach ($x in @($typelibs[$id] | Sort-Object -Unique)) { Ligne ('      ' + $x) }
        $script:Constat.TypeLibs += ($id + ' « ' + $desc + ' »')
    }

    # B. Noms de HKCR qui ressemblent à un ProgID de SEE (parcours borné à 30 s)
    Ligne ''
    Ligne 'B. ProgID dont le nom commence par SEE, Seee, IGE ou contient « Expert » (HKCR, parcours borné à 30 s) :'
    Write-Host '    parcours des noms de HKCR (jusqu''à 30 s)...'
    $t0 = Get-Date
    $limite = $t0.AddSeconds(30)
    $noms = @()
    $vus = 0
    $interrompu = $false
    do {
        Get-ChildItem -LiteralPath 'Registry::HKEY_CLASSES_ROOT' -Name -ErrorAction SilentlyContinue | ForEach-Object {
            $vus++
            if (($vus % 500) -eq 0 -and (Get-Date) -gt $limite) { $interrompu = $true; break }
            if ($_ -match '^(?i)(SEE|Seee|IGE)' -or $_ -match '(?i)Expert') { $noms += $_ }
        }
    } while ($false)
    $fin = 'complet'
    if ($interrompu) { $fin = 'INTERROMPU au bout de 30 s : la liste peut être incomplète' }
    Ligne ('   ' + $vus + ' nom(s) parcouru(s) en ' + (Secondes ((Get-Date) - $t0).TotalSeconds) + ', ' + $fin + ' ; ' + $noms.Count + ' retenu(s)')
    # Trois familles : les ProgID qui mènent à SEE.exe (ceux du réglage ProgID du
    # pilote), ceux des autres composants de SEE (ADG, gestionnaire de macros,
    # plugins), et les noms seulement ressemblants.
    $guidsPilote = @{}
    foreach ($k in $script:ClsidConnus) { if ($k.Role -ne 'ADG') { $guidsPilote[$k.Guid.ToUpper()] = $true } }
    foreach ($s in $script:Constat.ServeursSee) { if ($s.Fichier -match '(?i)^SEE\.exe$') { $guidsPilote[$s.Guid] = $true } }
    $guidsSee = @{}
    foreach ($g in $guidsConnus.Keys) { $guidsSee[$g] = $true }
    foreach ($id in $ordre) { $guidsSee[$entrees[$id].Guid] = $true }
    $pilote = @()
    $autresSee = @()
    foreach ($k in $script:ClsidConnus) {
        $i = $script:Constat.Clsid[$k.Guid]
        if (-not $i -or $i.Vues.Count -eq 0) { continue }
        if ($k.Role -eq 'ADG') { $autresSee += $i.ProgIDs } else { $pilote += $i.ProgIDs }
    }
    foreach ($s in $script:Constat.ServeursSee) {
        $l = @($s.ProgID, $s.VIProgID) | Where-Object { $_ }
        if ($guidsPilote.ContainsKey($s.Guid)) { $pilote += $l } else { $autresSee += $l }
    }
    $voisins = @()
    $k = 0
    foreach ($n in $noms) {
        $k++
        if ($k -gt 300) { Ligne ('   … ' + ($noms.Count - 300) + ' autre(s) non examiné(s)'); break }
        $base = 'Registry::HKEY_CLASSES_ROOT\' + $n
        $clsid = (Valeur-Defaut ($base + '\CLSID')).ToUpper()
        $curver = Valeur-Defaut ($base + '\CurVer')
        $desc = Valeur-Defaut $base
        $t = '   ' + $n
        if ($clsid) { $t += ' -> CLSID ' + $clsid } else { $t += ' -> (pas de CLSID)' }
        if ($guidsConnus.ContainsKey($clsid)) { $t += ' = ' + $guidsConnus[$clsid] }
        if ($curver) { $t += ' ; CurVer = ' + $curver }
        if ($desc) { $t += ' ; « ' + $desc + ' »' }
        Ligne $t
        if (-not $clsid) { continue }
        if ($guidsPilote.ContainsKey($clsid)) { $pilote += $n }
        elseif ($guidsSee.ContainsKey($clsid)) { $autresSee += $n }
        else { $voisins += $n }
    }
    $script:Constat.ProgIDs = @($pilote | Where-Object { $_ } | Sort-Object -Unique)
    $script:Constat.ProgIDsAutres = @($autresSee | Where-Object { $_ } | Sort-Object -Unique)
    $script:Constat.ProgIDsVoisins = @($voisins | Sort-Object -Unique)

    Ligne ''
    Ligne 'C. Synthèse :'
    if ($script:Constat.ProgIDs.Count -gt 0) { Ligne ('   ProgID qui mènent à SEE.exe (pour le pilote) : ' + ($script:Constat.ProgIDs -join ' ; ')) }
    else { Ligne '   ProgID qui mènent à SEE.exe (pour le pilote) : aucun' }
    if ($script:Constat.ProgIDsAutres.Count -gt 0) { Ligne ('   ProgID d''autres composants de SEE (ADG, macros, plugins) : ' + ($script:Constat.ProgIDsAutres -join ' ; ')) }
    if ($script:Constat.ProgIDsVoisins.Count -gt 0) { Ligne ('   Autres ProgID au nom proche (CLSID sans lien trouvé avec SEE) : ' + ($script:Constat.ProgIDsVoisins -join ' ; ')) }
    $script:Constat.RechercheIncomplete = $incomplet
    $suite = ''
    if ($incomplet) { $suite = ' ; recherche reg.exe INCOMPLÈTE' }
    if ($script:Constat.ProgIDs.Count -gt 0 -or $nbExe -gt 0) { Etat ('TROUVÉ (' + $script:Constat.ProgIDs.Count + ' ProgID pour le pilote, ' + $nbExe + ' serveur(s) hors processus)' + $suite) }
    elseif ($script:Constat.ProgIDsAutres.Count -gt 0 -or $ordre.Count -gt 0) { Etat ('TROUVÉ EN PARTIE (des composants de SEE sont inscrits, mais rien qui mène à SEE.exe)' + $suite) }
    elseif ($incomplet) { Etat 'NON LISIBLE EN PARTIE (rien trouvé, mais la recherche reg.exe est incomplète)' }
    else { Etat 'ABSENT (aucun ProgID ni serveur COM relié à SEE)' }
}

# ===========================================================================
# 9. Processus SEE en cours
# ===========================================================================
Executer-Section 'Processus SEE en cours' {
    # On ne lit ni le titre des fenêtres ni la ligne de commande : ils peuvent
    # contenir le nom d'un projet.
    $tous = @(Get-Process -ErrorAction SilentlyContinue)
    $see = @()
    $excel = 0
    foreach ($p in $tous) {
        $chemin = ''
        try { $chemin = "$($p.Path)" } catch { $chemin = '' }
        if ($p.ProcessName -match '(?i)^excel$') { $excel++ }
        if ($p.ProcessName -match '(?i)^(see|spm)' -or $chemin -match '(?i)IGE\+XAO|SEE_Soft') {
            $see += @{ Nom = $p.ProcessName; Id = $p.Id; Chemin = $chemin }
        }
    }
    Ligne ('Processus lus : ' + $tous.Count)
    if ($see.Count -eq 0) {
        Ligne 'Aucun processus SEE en cours.'
        Etat 'ABSENT (SEE n''est pas ouvert)'
        $script:Constat.Processus = 'aucun (SEE n''est pas ouvert)'
    } else {
        foreach ($s in $see) {
            $t = '- ' + $s.Nom + ' (PID ' + $s.Id + ')'
            if ($s.Chemin) {
                $i = Infos-Fichier $s.Chemin
                $t += ' : ' + $s.Chemin + ' ; ' + $i.Version + ' ; ' + $i.Arch
            } else {
                $t += ' : chemin non lisible'
            }
            Ligne $t
        }
        Etat ('TROUVÉ (' + $see.Count + ' processus)')
        $script:Constat.Processus = (@($see | ForEach-Object { $_.Nom }) | Sort-Object -Unique) -join ', '
    }
    Ligne ('Excel ouvert : ' + $excel + ' processus EXCEL')
}

# ===========================================================================
# 10. Python, Node, Java
# ===========================================================================
Executer-Section 'Python, Node, Java' {
    $trouves = @()
    $dossiersPy = @()

    # Chaque commande est lancée avec --version, alias de WindowsApps compris :
    # c'est la version rendue qui dit si Python est là, pas le dossier. Un alias
    # de WindowsApps peut être le faux python.exe de Windows (qui, lancé avec un
    # argument, écrit « Python was not found... » et sort avec le code 9009, sans
    # ouvrir le Store), ou un vrai Python (Microsoft Store, gestionnaire
    # d'installation Python). Ce comportement est connu, pas vérifié ici.
    Ligne 'Python - commandes (lancées avec --version) :'
    $vuPy = $false
    $pyOk = ''
    foreach ($cmd in @('py', 'python', 'python3')) {
        $cs = @(Get-Command $cmd -CommandType Application -All -ErrorAction SilentlyContinue)
        if ($cs.Count -eq 0) { Ligne ('    ' + $cmd + ' : absent'); continue }
        foreach ($c in $cs) {
            $ch = "$($c.Path)"
            $alias = ((Normaliser $ch) -match '(?i)\\WindowsApps\\')
            $res = Lancer $ch @('--version')
            $ver = ''
            foreach ($l in $res.Lignes) { if (-not $ver -and $l -match '^\s*(Python\s+\d+\.\d+\S*)') { $ver = $matches[1] } }
            $t = '    ' + $cmd + ' : ' + $ch + ' : '
            if ($ver) {
                $t += $ver
                if ($alias) { $t += ' (alias de WindowsApps : Python du Microsoft Store ou du gestionnaire d''installation Python)' }
                $vuPy = $true
                $trouves += $ver
                if ($cmd -eq 'py' -and -not $pyOk) { $pyOk = $ch }
                if ($cmd -ne 'py' -and -not $alias) { $dossiersPy += (Parent $ch) }
            } else {
                $premiere = ''
                foreach ($l in $res.Lignes) { if (-not $premiere -and $l.Trim()) { $premiere = $l.Trim() } }
                if ($premiere.Length -gt 120) { $premiere = $premiere.Substring(0, 120) + '…' }
                if ($alias) { $t += 'alias de WindowsApps sans Python derrière (code ' + $res.Code + ')' }
                elseif (-not $res.Ok) { $t += 'non lancé (' + $res.Message + ')' }
                else { $t += 'pas de version lue (code ' + $res.Code + ')' }
                if ($premiere) { $t += ' : « ' + $premiere + ' »' }
            }
            Ligne $t
        }
    }
    if ($pyOk) {
        $res = Lancer $pyOk @('-0p')
        if ($res.Ok -and $res.Lignes.Count -gt 0) {
            Ligne '    py -0p (versions connues du lanceur) :'
            foreach ($l in $res.Lignes) { if ($l.Trim()) { Ligne ('        ' + $l.Trim()) } }
        }
    } elseif (Commande-Existe 'py') {
        Ligne '    py -0p : non lancé (py n''a pas donné de version)'
    }

    Ligne 'Python - registre (PEP 514) :'
    if (-not $script:RegistreDispo) {
        Ligne '    non disponible ici (pas de registre Windows)'
    } else {
        $nb = 0
        foreach ($base in @('HKCU:\Software\Python', 'HKLM:\SOFTWARE\Python', 'HKLM:\SOFTWARE\WOW6432Node\Python')) {
            foreach ($soc in @(Sous-Cles $base)) {
                if ($soc -eq 'PyLauncher') { continue }
                foreach ($tag in @(Sous-Cles ($base + '\' + $soc))) {
                    $ch = $base + '\' + $soc + '\' + $tag
                    $dir = Valeur-Defaut ($ch + '\InstallPath')
                    $ver = "$(Valeur $ch 'Version')"
                    $arch = "$(Valeur $ch 'SysArchitecture')"
                    Ligne ('    ' + $soc + ' ' + $tag + ' : ' + $dir + ' ; Version ' + $ver + ' ; ' + $arch)
                    if ($dir) { $dossiersPy += $dir; $vuPy = $true; $trouves += ('Python ' + $tag + ' (registre)') }
                    $nb++
                }
            }
        }
        if ($nb -eq 0) { Ligne '    aucun Python inscrit : absent' }
    }

    Ligne 'Python - modules COM (présence des dossiers, sans lancer Python) :'
    $sites = @()
    foreach ($d in @($dossiersPy | Where-Object { $_ } | Sort-Object -Unique)) { $sites += (Chemin $d 'Lib\site-packages') }
    if ($env:APPDATA) {
        foreach ($s in @(Get-ChildItem -Path (Chemin $env:APPDATA 'Python\*\site-packages') -ErrorAction SilentlyContinue)) { $sites += $s.FullName }
    }
    $sites = @($sites | Sort-Object -Unique)
    $pywin = @()
    $comtypes = @()
    foreach ($s in $sites) {
        if (-not (Test-Path -LiteralPath $s)) { continue }
        if (Test-Path -LiteralPath (Chemin $s 'win32com')) { $pywin += $s }
        if (Test-Path -LiteralPath (Chemin $s 'comtypes')) { $comtypes += $s }
    }
    if ($pywin.Count -gt 0) { Ligne ('    pywin32 (win32com) : TROUVÉ dans ' + ($pywin -join ' ; ')) } else { Ligne '    pywin32 (win32com) : non vu' }
    if ($comtypes.Count -gt 0) { Ligne ('    comtypes : TROUVÉ dans ' + ($comtypes -join ' ; ')) } else { Ligne '    comtypes : non vu' }
    if ($vuPy) {
        $t = 'TROUVÉ'
        $vers = @($trouves | Where-Object { $_ -match '^Python' } | Sort-Object -Unique)
        if ($vers.Count -gt 0) { $t += ' : ' + ($vers -join ', ') }
        if ($pywin.Count -gt 0) { $t += ', pywin32' }
        if ($comtypes.Count -gt 0) { $t += ', comtypes' }
        $script:Constat.Python = $t
    } else { $script:Constat.Python = 'absent' }

    $node = @(Get-Command 'node' -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($node.Count -gt 0) {
        $res = Lancer "$($node[0].Path)" @('--version')
        $ver = ''
        if ($res.Ok -and $res.Lignes.Count -gt 0) { $ver = $res.Lignes[0] }
        Ligne ('Node : TROUVÉ : ' + "$($node[0].Path)" + ' : ' + $ver)
        $trouves += ('Node ' + $ver)
        $script:Constat.Node = 'TROUVÉ ' + $ver
    } else {
        Ligne 'Node : absent'
        $script:Constat.Node = 'absent'
    }

    # Java n'est PAS lancé : une JVM écrit sur le poste (dossier
    # hsperfdata_<utilisateur> dans %TEMP%) et charge ce que JAVA_TOOL_OPTIONS ou
    # _JAVA_OPTIONS lui demandent (agents, journaux). La version se lit dans
    # l'en-tête du fichier java.exe.
    $java = @(Get-Command 'java' -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($java.Count -gt 0) {
        $ch = "$($java[0].Path)"
        $i = Infos-Fichier $ch
        $ver = ''
        if ($i.Produit -and $i.Produit -ne '?' -and $i.Produit -ne 'non lisible') { $ver = 'version ' + $i.Produit }
        elseif ($i.Version -and $i.Version -ne '?' -and $i.Version -ne 'non lisible') { $ver = 'version ' + $i.Version }
        $t = 'Java : TROUVÉ : ' + $ch + ' : '
        if ($ver) { $t += $ver + ' ; ' + $i.Arch } else { $t += 'version non lue (' + $i.Arch + ')' }
        Ligne ($t + ' ; java non lancé : version lue dans l''en-tête du fichier')
        $trouves += 'Java'
        $script:Constat.Java = ('TROUVÉ ' + $ver).Trim()
    } else {
        Ligne 'Java : absent'
        $script:Constat.Java = 'absent'
    }
    if ($env:JAVA_HOME) { Ligne ('JAVA_HOME = ' + $env:JAVA_HOME) }

    if ($trouves.Count -gt 0) { Etat ('TROUVÉ : ' + (($trouves | Sort-Object -Unique) -join ', ')) } else { Etat 'ABSENT (ni Python, ni Node, ni Java)' }
}

# ===========================================================================
# 11. SEE Project Manager et SQL Server
# ===========================================================================
Executer-Section 'SEE Project Manager (SPM) et SQL Server local' {
    $etats = @()
    if (-not $script:RegistreDispo) {
        Ligne 'Programmes SPM : non disponible ici (pas de registre Windows)'
        $script:Constat.Spm = 'non vérifiable ici'
    } else {
        Charger-Programmes
        $spm = @($script:Programmes | Where-Object { $_.Nom -match '(?i)Project Manager|(^|[^a-z])SPM([^a-z]|$)' })
        if ($spm.Count -eq 0) {
            Ligne 'Programmes « SEE Project Manager » / SPM : absent'
            $script:Constat.Spm = 'absent'
        } else {
            foreach ($p in $spm) { Ligne ('- ' + $p.Nom + ' ' + $p.Version + ' ; ' + $p.Editeur + ' ; ' + $p.Vue) }
            $script:Constat.Spm = 'TROUVÉ : ' + ((@($spm | ForEach-Object { $_.Nom })) -join ', ')
            $etats += 'SPM trouvé'
        }
    }

    Ligne ''
    if (-not (Commande-Existe 'Get-Service')) {
        Ligne 'Services : non disponible ici (Get-Service absent)'
        $script:Constat.Sql = 'non vérifiable ici'
    } else {
        $svcs = @(Get-Service -ErrorAction SilentlyContinue | Where-Object {
                $_.Name -match '(?i)^(MSSQL|SQLAgent|SQLBrowser|SQLWriter|SQLTELEMETRY|MSSQLFDLauncher)' -or
                $_.DisplayName -match '(?i)SQL Server' -or (Est-See $_.DisplayName) -or $_.DisplayName -match '(?i)Project Manager|(^|[^a-z])SPM([^a-z]|$)'
            } | Sort-Object Name)
        if ($svcs.Count -eq 0) {
            Ligne 'Services SQL Server / SEE / SPM : absent'
        } else {
            Ligne 'Services :'
            foreach ($s in $svcs) {
                $demarrage = ''
                try { $demarrage = "$($s.StartType)" } catch { $demarrage = '' }
                Ligne ('    ' + $s.Name + ' « ' + $s.DisplayName + ' » : ' + "$($s.Status)" + ' ; démarrage ' + $demarrage)
            }
        }
        $sql = @($svcs | Where-Object { $_.Name -match '(?i)^MSSQL' })
        if ($sql.Count -gt 0) {
            $script:Constat.Sql = 'TROUVÉ : ' + ((@($sql | ForEach-Object { $_.Name + ' (' + "$($_.Status)" + ')' })) -join ', ')
            $etats += 'SQL Server trouvé'
        } else {
            $script:Constat.Sql = 'absent'
        }
    }
    if ($script:RegistreDispo) {
        foreach ($base in @('HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Microsoft SQL Server\Instance Names\SQL')) {
            $r = Lire-Cle $base
            Ligne ('Instances SQL (' + ($base -replace '^HKLM:', 'HKLM') + ') : ' + (Texte-Etat $r))
            if ($r.Etat -eq 'trouve') { $null = Afficher-Cle $base '    ' 0 }
        }
        $ldb = @(Sous-Cles 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server Local DB\Installed Versions')
        if ($ldb.Count -gt 0) { Ligne ('SQL Server LocalDB : TROUVÉ, version(s) ' + ($ldb -join ', ')) } else { Ligne 'SQL Server LocalDB : absent' }
    }
    if ($etats.Count -gt 0) { Etat ('TROUVÉ (' + ($etats -join ', ') + ')') }
    elseif (-not $script:RegistreDispo -and -not (Commande-Existe 'Get-Service')) { Etat 'NON DISPONIBLE ICI (ni registre ni services Windows)' }
    else { Etat 'ABSENT (ni SPM ni SQL Server)' }
}

# ===========================================================================
# Résumé, anonymisation, écriture
# ===========================================================================
function Construire-Resume {
    $c = $script:Constat
    $l = @()
    $l += 'RÉSUMÉ'
    $l += ('  Windows ............ : ' + $c.Windows)
    $l += ('  PowerShell ......... : ' + $c.Ps)
    $l += ('  Excel .............. : ' + $c.Excel)
    $l += ('  Macros d''Excel ..... : ' + $c.Macros)
    if ($c.SeeProgrammes.Count -gt 0) { $l += ('  SEE installé ....... : ' + ($c.SeeProgrammes -join ' ; ')) }
    elseif ($script:RegistreDispo) { $l += '  SEE installé ....... : aucun programme SEE / IGE+XAO / ETAP dans la liste des programmes' }
    else { $l += '  SEE installé ....... : non vérifiable ici' }
    if ($c.SeeExe.Count -gt 0) {
        foreach ($s in $c.SeeExe) { $l += ('  SEE.exe ............ : ' + $s.Chemin + ' ; ' + $s.Version + ' ; ' + $s.Arch) }
    } else { $l += '  SEE.exe ............ : non trouvé' }
    if (-not $c.RegistreLu) {
        $l += '  COM (CLSID connus) . : non vérifiable ici'
    } else {
        foreach ($k in $script:ClsidConnus) {
            $i = $c.Clsid[$k.Guid]
            $t = 'absent'
            if ($i -and $i.Vues.Count -gt 0) {
                $t = 'inscrit (vue ' + ($i.Vues -join ' et ') + ' bits)'
                if ($i.Serveur) {
                    $t += ', LocalServer32 = ' + (Nom-Fichier (Extraire-Exe $i.Serveur))
                    if ($i.ServeurPresent -eq $true) { $t += ' [présent]' } elseif ($i.ServeurPresent -eq $false) { $t += ' [fichier ABSENT]' }
                } elseif ($i.Inproc) {
                    $t += ', InprocServer32 = ' + (Nom-Fichier (Extraire-Exe $i.Inproc))
                } else {
                    $t += ', sans serveur inscrit'
                }
            }
            $l += ('  ' + ($k.Court + ' ').PadRight(21, '.') + ' : ' + $t)
        }
    }
    if ($c.RegistreLu) {
        if ($c.ProgIDs.Count -gt 0) { $l += ('  ProgID vers SEE.exe  : ' + ($c.ProgIDs -join ' ; ')) }
        else { $l += '  ProgID vers SEE.exe  : aucun' }
        if ($c.ProgIDsAutres.Count -gt 0) { $l += ('  Autres ProgID SEE .. : ' + ($c.ProgIDsAutres -join ' ; ')) }
        $autres = @($c.ServeursSee | Where-Object { -not $_.Connu })
        foreach ($s in $autres) {
            $pidS = $s.ProgID
            if (-not $pidS) { $pidS = '(aucun)' }
            $l += ('  Autre serveur SEE .. : ' + $s.Guid + ' (vue ' + $s.Vue + ' bits) ' + $s.Fichier + ' ; ProgID ' + $pidS)
        }
    }
    $l += ('  SEE ouvert ......... : ' + $c.Processus)
    $l += ('  Python ............. : ' + $c.Python)
    $l += ('  Node / Java ........ : ' + $c.Node + ' / ' + $c.Java)
    $l += ('  SPM / SQL Server ... : ' + $c.Spm + ' / ' + $c.Sql)
    $l += ''

    $l += 'À REPORTER DANS LA FEUILLE « Reglages » DU CLASSEUR PILOTE'
    if (-not $c.RegistreLu) {
        $l += '  Rien à reporter : le registre de Windows n''a pas pu être lu ici.'
    } else {
        if ($c.ProgIDs.Count -gt 0) { $l += ('  ProgID ............. : ' + ($c.ProgIDs -join ';')) }
        else { $l += '  ProgID ............. : aucun ProgID trouvé ; garde la valeur par défaut, la connexion passera par les CLSID' }
        foreach ($role in @('Application', 'Automation')) {
            $ok = @()
            foreach ($k in $script:ClsidConnus) {
                if ($k.Role -ne $role) { continue }
                $i = $c.Clsid[$k.Guid]
                if ($i -and $i.Vues.Count -gt 0) { $ok += $k.Guid }
            }
            $nomR = ('CLSID_' + $role + ' ').PadRight(21, '.')
            if ($ok.Count -gt 0) { $l += ('  ' + $nomR + ' : ' + ($ok -join ';')) }
            else { $l += ('  ' + $nomR + ' : aucun des CLSID connus n''est inscrit ; garde la valeur par défaut') }
        }
        $autres = @($c.ServeursSee | Where-Object { -not $_.Connu -and $_.Fichier -match '(?i)^SEE\.exe$' })
        if ($autres.Count -gt 0) {
            $l += ('  À essayer aussi .... : CLSID servis par SEE.exe mais inconnus de la recherche : ' + ((@($autres | ForEach-Object { $_.Guid }) | Sort-Object -Unique) -join ';'))
        }
    }
    $l += ''

    $rem = @()
    if (-not $script:EstWindows) { $rem += 'Ce rapport a été produit hors Windows : il ne montre que la forme du relevé.' }
    $bitsSee = @($c.SeeExe | ForEach-Object { $_.Bits } | Where-Object { $_ } | Sort-Object -Unique)
    if ($c.ExcelBits -and $bitsSee.Count -gt 0 -and -not ($bitsSee -contains $c.ExcelBits)) {
        $rem += ('Excel est en ' + $c.ExcelBits + ' bits, SEE.exe en ' + ($bitsSee -join '/') + ' bits : sans gêne pour un serveur COM hors processus (SEE.exe, LocalServer32) ; ce serait bloquant pour un composant en processus (DLL, InprocServer32).')
    }
    $adg = $c.Clsid['{3F068A71-6B82-4271-B830-DC790F3BB892}']
    if ($adg -and $adg.Vues.Count -gt 0 -and $adg.Inproc -and -not $adg.Serveur -and $c.ExcelBits -and -not ($adg.Vues -contains $c.ExcelBits)) {
        $rem += ('ADG ExcelEntry n''est inscrit que pour les programmes ' + ($adg.Vues -join '/') + ' bits (en processus) : Excel ' + $c.ExcelBits + ' bits ne pourra pas le créer directement.')
    }
    if ($c.Mode -eq 'ConstrainedLanguage') { $rem += 'PowerShell est en mode restreint : le poste applique AppLocker ou WDAC. Vérifie aussi que l''entreprise autorise les macros Excel.' }
    if ($c.MacrosAlerte) { $rem += $c.MacrosAlerte }
    if ($c.RegistreLu -and ($c.SeeProgrammes.Count -gt 0 -or $c.SeeExe.Count -gt 0)) {
        $nb = 0
        foreach ($k in $script:ClsidConnus) { $i = $c.Clsid[$k.Guid]; if ($i -and $i.Vues.Count -gt 0 -and $k.Role -ne 'ADG') { $nb++ } }
        if ($nb -eq 0 -and $c.ServeursSee.Count -eq 0) {
            $rem += 'SEE est installé mais aucun serveur COM de SEE n''est inscrit : la connexion par COM risque d''échouer. Lance quand même SondeApplication avec SEE ouvert, et garde ce rapport.'
        }
    }
    if ($c.SeeExe.Count -gt 1) { $rem += 'Plusieurs SEE.exe : le pilote se connectera à celui qui est ouvert, ou à celui que le registre désigne.' }
    if ($c.RechercheIncomplete) { $rem += 'La recherche des serveurs COM de SEE dans le registre est incomplète (accès refusé ou temps dépassé, voir section 8) : la liste des ProgID ci-dessus peut l''être aussi.' }
    $l += 'REMARQUES'
    if ($rem.Count -eq 0) { $l += '  aucune' } else { foreach ($r in $rem) { $l += ('  - ' + $r) } }
    return $l
}

# Remplace l'utilisateur, le poste et le domaine, en mots entiers, sans casse.
function Anonymiser([string[]]$lignes) {
    $jetons = @()
    $profil = $env:USERPROFILE
    if (-not $profil) { $profil = $HOME }
    foreach ($u in @($env:USERNAME, $env:USER, $env:LOGNAME)) { if ($u) { $jetons += @{ T = $u; R = '<UTILISATEUR>' } } }
    if ($profil) {
        $feuille = Nom-Fichier ($profil -replace '[\\/]+$', '')
        if ($feuille) { $jetons += @{ T = $feuille; R = '<UTILISATEUR>' } }
    }
    $machines = @($env:COMPUTERNAME, $env:HOSTNAME)
    if (-not $script:EstWindows -and (Commande-Existe 'hostname')) {
        $h = Lancer 'hostname' @()
        if ($h.Ok -and $h.Lignes.Count -gt 0) { $machines += $h.Lignes[0].Trim() }
    }
    foreach ($m in $machines) { if ($m) { $jetons += @{ T = $m; R = '<POSTE>' } } }
    $dns = $env:USERDNSDOMAIN
    foreach ($d in @($dns, $env:USERDOMAIN, $env:USERDOMAIN_ROAMINGPROFILE)) { if ($d) { $jetons += @{ T = $d; R = '<DOMAINE>' } } }
    if ($dns) {
        foreach ($part in ($dns -split '\.')) {
            if ($part.Length -ge 4 -and -not ($part -match '^(?i)(corp|local|intra|intranet|group|groupe|home|lan)$')) { $jetons += @{ T = $part; R = '<DOMAINE>' } }
        }
    }
    $jetons = @($jetons | Where-Object { $_.T.Length -ge 2 } | Sort-Object { $_.T.Length } -Descending)
    $masques = @($script:Masques | Sort-Object { $_.Longueur } -Descending)
    # Tout dossier de profil X:\Users\<nom> (sauf Public, Default...), quel que
    # soit le compte et même en nom court 8.3 (JEAN~1.DUP), avec \ ou / ; un nom
    # en plusieurs mots n'est pris en entier que s'il est suivi d'un séparateur.
    $mot = '[^\\/:*?"<>|\s;,()=]+'
    $motifProfil = '(?i)(?<![A-Za-z0-9])([A-Za-z]:[\\/]+Users[\\/]+)(?!(?:Public|Default|Default User|All Users)(?:[\\/"''\s;,)]|$))' +
        $mot + '(?:(?: ' + $mot + ')+(?=[\\/]|$))?'
    $sortie = @()
    foreach ($ligne in $lignes) {
        $t = "$ligne"
        foreach ($m in $masques) { $t = $t -replace $m.Motif, $m.R }
        $t = $t -replace '[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}', '<COURRIEL>'
        $t = $t -replace '\\\\(?![?.]\\)[^\\/\s"''<>|]+', '\\<SERVEUR>'
        $t = $t -replace '(?i)(OneDrive - )[^\\/\r\n"]+', '$1<ORGANISATION>'
        $t = $t -replace $motifProfil, '$1<UTILISATEUR>'
        foreach ($j in $jetons) {
            $t = $t -replace ('(?i)(?<![A-Za-z0-9])' + (Echapper $j.T) + '(?![A-Za-z0-9])'), $j.R
        }
        $sortie += $t
    }
    return $sortie
}

# $ou dit où est le rapport, sans chemin : le nom du dossier où l'outil est posé
# (ou celui de %TEMP%, souvent en nom court 8.3) n'a rien à faire dans le rapport.
function Composer([string]$ou) {
    $duree = ((Get-Date) - $script:Debut).TotalSeconds
    $l = @()
    $l += 'DIAGNOSTIC DU POSTE POUR LE PILOTE SEE - Atelier Schéma'
    $l += ('diagnostic.ps1 version ' + $script:VERSION + ' - lecture seule')
    $l += ('Relevé du ' + $script:Debut.ToString('yyyy-MM-dd HH:mm') + ', durée ' + (Secondes $duree))
    $l += ('Rapport : ' + $ou)
    $l += 'Rapport anonymisé : <UTILISATEUR>, <POSTE>, <DOMAINE>, <SERVEUR>, <ORGANISATION>, <COURRIEL>, <DOSSIER SEE n°k>.'
    $l += 'Aucune donnée de projet : seulement des logiciels, des clés de registre et des noms de fichiers techniques ;'
    $l += 'hors de Program Files, seuls les noms de dossiers techniques sont écrits ; emplacements approuvés décrits par leur nature.'
    $l += 'Vocabulaire : TROUVÉ = présent ; ABSENT / absent = cherché, pas là ; NON LISIBLE = présent mais refusé ou en erreur ;'
    $l += '              NON DISPONIBLE ICI = impossible à vérifier sur ce poste (pas Windows, PowerShell verrouillé...).'
    $l += ''
    $l += Construire-Resume
    $l += $script:Corps
    $l += ''
    $l += ('=' * 78)
    $l += 'CE QUE CE DIAGNOSTIC NE VÉRIFIE PAS'
    $l += ('-' * 78)
    $l += '- Il ne lance pas SEE et ne crée aucun objet COM : savoir si GetObject / CreateObject marchent vraiment,'
    $l += '  c''est le rôle de la macro SondeApplication du classeur pilote, avec SEE ouvert.'
    $l += '- Il ne lit pas la table des objets en cours d''exécution (ROT) : impossible sans COM.'
    $l += '- Il ne lit aucun projet, aucun environnement SEE, aucun titre de fenêtre, aucune ligne de commande.'
    $l += ''
    if ($script:Incidents.Count -eq 0) { $l += 'Incidents pendant le relevé : aucun.' }
    else {
        $l += 'Incidents pendant le relevé :'
        foreach ($i in $script:Incidents) { $l += ('  - ' + $i) }
    }
    $l += 'Fin du rapport.'
    $l = Anonymiser $l
    return (($l -join "`r`n") + "`r`n")
}

function Ecrire-Rapport([string]$cible, [string]$texte) {
    $enc = 'UTF8'
    if ($PSVersionTable.PSVersion.Major -ge 6) { $enc = 'utf8BOM' }
    Set-Content -LiteralPath $cible -Value $texte -NoNewline -Encoding $enc -ErrorAction Stop
}

$dossier = $PSScriptRoot
if (-not $dossier) { $dossier = (Get-Location).Path }
$cible = $Rapport
$ou = (Nom-Fichier $cible) + ' (chemin donné par l''option -Rapport)'
if (-not $cible) {
    $cible = Chemin $dossier 'diagnostic-see.txt'
    $ou = 'diagnostic-see.txt, à côté du script'
}
$ecrit = $false
try {
    Ecrire-Rapport $cible (Composer $ou)
    $ecrit = $true
} catch {
    Write-Host ('Impossible d''écrire à côté du script (' + $_.Exception.Message + ') : essai dans le dossier temporaire.')
    $tmp = $env:TEMP
    if (-not $tmp) { $tmp = $env:TMPDIR }
    if (-not $tmp) { $tmp = '/tmp' }
    $cible = Chemin $tmp 'diagnostic-see.txt'
    try {
        Ecrire-Rapport $cible (Composer 'diagnostic-see.txt, dans le dossier temporaire (%TEMP%)')
        $ecrit = $true
    } catch {
        Write-Host ('ÉCHEC : le rapport n''a pas pu être écrit (' + $_.Exception.Message + ').')
    }
}

Write-Host ''
foreach ($l in (Anonymiser (Construire-Resume))) { Write-Host $l }
if (-not $ecrit) { exit 1 }
Write-Host ('Rapport écrit : ' + $cible)
Write-Host 'Renvoie ce fichier tel quel : il est anonymisé et ne contient aucune donnée de projet.'
if (-not $SansBlocNotes) {
    try {
        Start-Process -FilePath 'notepad.exe' -ArgumentList ('"' + $cible + '"') -ErrorAction Stop
    } catch {
        Write-Host 'Bloc-notes non disponible ici : ouvre le fichier à la main.'
    }
}
exit 0
