@echo off
rem Atelier Schema - pilote SEE : diagnostic du poste, en LECTURE SEULE.
rem Double-clic : lance diagnostic.ps1 (pose a cote de ce fichier) avec Windows
rem PowerShell 64 bits si possible, puis ouvre le rapport diagnostic-see.txt.
rem Ne demande aucun droit d'administrateur, ne lance pas SEE, ne modifie rien.
setlocal
set "PS=powershell.exe"
if exist "%SystemRoot%\Sysnative\WindowsPowerShell\v1.0\powershell.exe" set "PS=%SystemRoot%\Sysnative\WindowsPowerShell\v1.0\powershell.exe"
echo Diagnostic du poste pour le pilote SEE (lecture seule ; en general une a deux minutes, six au plus)...
echo.
"%PS%" -NoProfile -ExecutionPolicy Bypass -File "%~dp0diagnostic.ps1"
set "CODE=%ERRORLEVEL%"
if not "%CODE%"=="0" (
  echo.
  echo PowerShell n'a pas pu aller au bout ^(code %CODE%^).
  echo Si le fichier vient d'Internet ou d'un courriel : clic droit sur diagnostic.ps1,
  echo Proprietes, cocher Debloquer, puis relancer.
  echo Si l'entreprise interdit les scripts PowerShell, ne force pas : montre ce
  echo message au service informatique.
)
echo.
pause
