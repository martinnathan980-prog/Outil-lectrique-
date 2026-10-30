@echo off
rem Atelier Schema - SONDE PDF : le releve ANONYMISE de schemas en PDF.
rem On GLISSE un ou plusieurs PDF (ou un dossier) sur ce fichier.
rem Il trouve Python (py -3, puis python, puis python3), lance sonde_pdf.py
rem (pose a cote de ce fichier), puis ouvre le dossier "rapports".
rem Rien n'est envoye nulle part, rien n'est modifie dans les PDF.
rem Pas de bloc entre parentheses : un chemin comme "Program Files (x86)" les casserait.
setlocal
set "ICI=%~dp0"
set "PY="
py -3 --version >nul 2>&1
if not errorlevel 1 set "PY=py -3"
if defined PY goto trouve
python --version >nul 2>&1
if not errorlevel 1 set "PY=python"
if defined PY goto trouve
python3 --version >nul 2>&1
if not errorlevel 1 set "PY=python3"
if defined PY goto trouve
goto sanspython

:trouve
if not exist "%ICI%sonde_pdf.py" goto sanssonde
if "%~1"=="" goto aide
echo Sonde PDF : lecture des PDF (rien n'est modifie, rien n'est envoye)...
echo.
%PY% "%ICI%sonde_pdf.py" %*
set "CODE=%ERRORLEVEL%"
echo.
if not exist "%ICI%rapports\" goto ailleurs
echo Les rapports sont dans : "%ICI%rapports"
echo Le dossier va s'ouvrir. Envoyer les fichiers .rapport.txt et .elements.tsv :
echo ils ne contiennent aucun texte reel des plans, ni le nom des fichiers.
start "" explorer "%ICI%rapports"
goto fin

:ailleurs
echo Voir plus haut le dossier ou les rapports ont ete ecrits.

:fin
if not "%CODE%"=="0" echo La sonde a rendu le code %CODE% : voir les messages plus haut.
echo.
pause
exit /b %CODE%

:aide
echo Sonde PDF : il faut GLISSER un ou plusieurs PDF (ou un dossier de PDF)
echo sur ce fichier sonde-pdf.bat, puis lacher.
echo.
echo Les rapports seront ecrits dans le dossier "rapports", a cote de ce fichier.
echo.
pause
exit /b 1

:sanssonde
echo Le fichier sonde_pdf.py doit etre dans le meme dossier que sonde-pdf.bat :
echo "%ICI%"
echo.
pause
exit /b 1

:sanspython
echo Python est introuvable sur ce poste (ni "py -3", ni "python", ni "python3").
echo.
echo La sonde a besoin de Python 3.8 ou plus recent. Si Python est installe
echo mais pas dans le PATH, ouvrir une invite de commandes et taper :
echo     chemin\vers\python.exe "%ICI%sonde_pdf.py" "chemin\vers\le\plan.pdf"
echo Sinon, demander au service informatique d'installer Python 3.
echo.
pause
exit /b 1
