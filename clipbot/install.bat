@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "PYTHONUTF8=1"
rem --- Dossier des clips et des telechargements : E:\GTA 6 clip (si le disque E existe) ---
if not defined CLIPBOT_DATA if exist E:\ (
  if not exist "E:\GTA 6 clip" mkdir "E:\GTA 6 clip"
  set "CLIPBOT_DATA=E:\GTA 6 clip"
  set "PIP_CACHE_DIR=E:\GTA 6 clip\telechargements"
)
echo.
echo  ===== Installation de ClipBot =====
echo.

where winget >nul 2>nul
if errorlevel 1 (
  echo [!] "winget" est introuvable. Mets Windows a jour ^(Microsoft Store ^> "Programme d'installation d'application"^) puis relance install.bat.
  pause & exit /b 1
)

set "PY="
py -3.12 -c "print(1)" >nul 2>nul && set "PY=py -3.12"
if not defined PY py -3.11 -c "print(1)" >nul 2>nul && set "PY=py -3.11"
if not defined PY py -3.13 -c "print(1)" >nul 2>nul && set "PY=py -3.13"
if not defined PY (
  echo [1/4] Installation de Python 3.12...
  winget install -e --id Python.Python.3.12 --accept-source-agreements --accept-package-agreements
  set PY="%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
) else (
  echo [1/4] Python deja installe.
)

where ffmpeg >nul 2>nul
if errorlevel 1 (
  echo [2/4] Installation de ffmpeg...
  winget install -e --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements
) else (
  echo [2/4] ffmpeg deja installe.
)

echo [3/4] Installation des composants du bot ^(quelques minutes^)...
if not exist ".venv\Scripts\python.exe" %PY% -m venv .venv
if not exist ".venv\Scripts\python.exe" (
  echo [!] Impossible de creer l'environnement Python. Ferme cette fenetre, rouvre-la et relance install.bat.
  pause & exit /b 1
)
".venv\Scripts\python.exe" -m pip install --upgrade pip >nul
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
  echo [!] L'installation des composants a echoue. Verifie ta connexion internet puis relance install.bat.
  pause & exit /b 1
)
where nvidia-smi >nul 2>nul
if not errorlevel 1 (
  echo     Carte NVIDIA detectee : installation de l'acceleration GPU pour la transcription...
  ".venv\Scripts\python.exe" -m pip install nvidia-cublas-cu12 "nvidia-cudnn-cu12>=9,<10"
)

echo [4/4] Analyse de ton PC :
".venv\Scripts\python.exe" -m clipbot --sysinfo

echo.
echo  Installation terminee. Double-clique sur start.bat pour lancer le bot.
if defined CLIPBOT_DATA echo  Tes clips et tous les telechargements du bot iront dans : %CLIPBOT_DATA%
echo.
pause
