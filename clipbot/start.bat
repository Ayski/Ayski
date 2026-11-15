@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PYTHONUTF8=1"
rem --- Dossier des clips et des telechargements : E:\GTA 6 clip (si le disque E existe) ---
if not defined CLIPBOT_DATA if exist E:\ (
  if not exist "E:\GTA 6 clip" mkdir "E:\GTA 6 clip"
  set "CLIPBOT_DATA=E:\GTA 6 clip"
  set "PIP_CACHE_DIR=E:\GTA 6 clip\telechargements"
)
if not exist ".venv\Scripts\python.exe" (
  echo Premier lancement : installation...
  call install.bat
)
if not exist ".venv\Scripts\python.exe" (
  echo [!] L'installation n'a pas abouti. Corrige le probleme indique ci-dessus puis relance start.bat.
  pause & exit /b 1
)
title ClipBot
:loop
".venv\Scripts\python.exe" -m clipbot %*
if errorlevel 1 (
  echo.
  echo Le bot s'est arrete de facon inattendue. Redemarrage dans 10 secondes... ^(Ctrl+C pour annuler^)
  timeout /t 10 >nul
  goto loop
)
