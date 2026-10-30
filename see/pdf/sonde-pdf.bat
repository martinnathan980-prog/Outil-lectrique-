@echo off
rem Atelier Schema - SONDE PDF : le releve ANONYMISE de schemas en PDF.
rem On GLISSE un ou plusieurs PDF (ou un dossier) sur ce fichier.
rem Il trouve Python (py -3, puis python, puis python3), lance sonde_pdf.py
rem (pose a cote de ce fichier), puis ouvre le dossier "rapports".
rem Rien n'est envoye nulle part, rien n'est modifie dans les PDF.
rem Pas de bloc entre parentheses : un chemin comme "Program Files (x86)" les casserait.
rem Un nom de fichier ou de dossier avec & ou ^ (R&D) casse la ligne AVANT ce fichier :
rem le renommer, ou passer par l'invite de commandes (voir LISEZMOI.md).
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
if exist "%ICI%rapports-EN-CLAIR\" echo ATTENTION : le dossier "rapports-EN-CLAIR" contient des releves EN CLAIR (vrais textes) : ne pas les envoyer sans accord.
if not exist "%ICI%rapports\" goto ailleurs
dir /b "%ICI%rapports\*EN-CLAIR*" >nul 2>&1
if not errorlevel 1 goto clair
echo Les rapports sont dans le dossier "rapports", a cote de ce fichier.
echo Ils ne contiennent aucun texte reel des plans, ni le nom des fichiers, ni de nom propre.
echo Le .elements.tsv contient la GEOMETRIE du dessin (les traits, sans les textes) :
echo a toi de voir si tu peux l'envoyer ; le .rapport.txt seul suffit pour commencer.
start "" explorer "%ICI%rapports"
goto fin

:clair
echo ATTENTION : le dossier "rapports" contient des fichiers EN-CLAIR (vrais textes des plans).
echo Ne les envoyer que pour un plan que l'on a le droit de montrer.
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
echo sur ce fichier sonde-pdf.bat, puis lacher. Pour des centaines de PDF,
echo glisser le DOSSIER plutot que les fichiers un par un.
echo.
echo Les rapports seront ecrits dans le dossier "rapports", a cote de ce fichier.
echo.
pause
exit /b 1

:sanssonde
echo Le fichier sonde_pdf.py doit etre dans le meme dossier que sonde-pdf.bat.
echo.
pause
exit /b 1

:sanspython
echo Python est introuvable sur ce poste (ni "py -3", ni "python", ni "python3").
echo.
echo La sonde a besoin de Python 3.8 ou plus recent. Si Python est installe
echo mais pas dans le PATH, ouvrir une invite de commandes dans le dossier de la
echo sonde et taper :
echo     chemin\vers\python.exe sonde_pdf.py "chemin\vers\le\plan.pdf"
echo Sinon, demander au service informatique d'installer Python 3.
echo.
pause
exit /b 1
