@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Premier lancement : installation...
  call install.bat
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
