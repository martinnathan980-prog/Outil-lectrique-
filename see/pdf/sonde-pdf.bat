@echo off
rem Atelier Schema - SONDE PDF : le releve ANONYMISE de schemas en PDF.
rem On GLISSE un ou plusieurs PDF (ou un dossier) sur ce fichier, ou on le lance
rem d'un double-clic : la sonde lit alors le dossier "PDF-A-LIRE" (a cote d'elle),
rem ou demande les PDF dans une fenetre.
rem Il trouve Python (py -3, puis python, puis python3) et lance sonde_pdf.py
rem (pose a cote de ce fichier). La sonde dit elle-meme ce qu'elle a ecrit et
rem ouvre le dossier "rapports" ; ce fichier attend une touche a la fin (lancee
rem d'ici, la sonde voit cmd.exe et n'attend pas : pas de double pause).
rem HORS DU KIT-PDF : une messagerie refuse les .bat, meme zippes. Le kit
rem (node see/kit.js --pdf) n'a que sonde_pdf.py, qui se lance d'un double-clic ;
rem ce fichier sert quand la sonde arrive autrement (cle USB, partage reseau).
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
echo Sonde PDF : lecture des PDF (rien n'est modifie, rien n'est envoye)...
echo.
%PY% "%ICI%sonde_pdf.py" %*
set "CODE=%ERRORLEVEL%"
echo.
if not "%CODE%"=="0" echo La sonde a rendu le code %CODE% : voir les messages plus haut.
echo.
pause
exit /b %CODE%

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
