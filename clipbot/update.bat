@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo.
echo  ===== Mise a jour de ClipBot =====
echo.
echo  Ferme d'abord la fenetre noire "ClipBot" si elle est ouverte, puis appuie sur une touche.
pause >nul

set "ZIP=%TEMP%\clipbot-update.zip"
set "DIR=%TEMP%\clipbot-update"
if exist "%DIR%" rmdir /s /q "%DIR%"

echo [1/3] Telechargement de la derniere version...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol='Tls12'; Invoke-WebRequest -UseBasicParsing 'https://github.com/Ayski/Ayski/archive/refs/heads/claude/twitch-tiktok-clip-bot-ta70xv.zip' -OutFile $env:ZIP; Expand-Archive -Force $env:ZIP $env:DIR"
if errorlevel 1 goto fail

set "SRC="
for /d %%D in ("%DIR%\*") do set "SRC=%%D\clipbot"
if not exist "%SRC%\start.bat" goto fail

echo [2/3] Copie des fichiers ^(tes cles, reglages et clips ne sont pas touches^)...
robocopy "%SRC%" "%~dp0." /E /XD .venv data __pycache__ /XF .env update.bat /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto fail

echo [3/3] Mise a jour des composants...
if exist ".venv\Scripts\python.exe" ".venv\Scripts\python.exe" -m pip install -q -r requirements.txt

rmdir /s /q "%DIR%" 2>nul
del "%ZIP%" 2>nul
echo.
echo  Mise a jour terminee. Version installee :
type VERSION
echo.
echo  Lance start.bat, puis appuie sur Ctrl+F5 dans le navigateur.
echo.
pause
exit /b 0

:fail
echo.
echo  [!] La mise a jour a echoue. Verifie ta connexion internet et que ClipBot est bien ferme, puis relance update.bat.
echo      Si ca continue, fais une capture de cette fenetre.
echo.
pause
exit /b 1
