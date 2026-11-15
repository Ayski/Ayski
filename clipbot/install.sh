#!/usr/bin/env bash
# Installation de ClipBot (Linux / macOS)
set -e
cd "$(dirname "$0")"
echo "===== Installation de ClipBot ====="
if ! command -v ffmpeg >/dev/null; then
  echo "[1/3] Installation de ffmpeg…"
  if command -v brew >/dev/null; then brew install ffmpeg
  elif command -v apt-get >/dev/null; then sudo apt-get update && sudo apt-get install -y ffmpeg python3-venv
  elif command -v dnf >/dev/null; then sudo dnf install -y ffmpeg
  elif command -v pacman >/dev/null; then sudo pacman -S --noconfirm ffmpeg
  else echo "Installe ffmpeg à la main puis relance ce script."; exit 1; fi
else echo "[1/3] ffmpeg déjà installé."; fi
PY=$(command -v python3.12 || command -v python3.11 || command -v python3.13 || command -v python3)
[ -z "$PY" ] && { echo "Python 3.11+ introuvable : installe-le (python.org) puis relance."; exit 1; }
echo "[2/3] Installation des composants du bot (quelques minutes)…"
[ -x .venv/bin/python ] || "$PY" -m venv .venv
.venv/bin/python -m pip install --upgrade pip >/dev/null
.venv/bin/python -m pip install -r requirements.txt
if command -v nvidia-smi >/dev/null; then
  echo "    Carte NVIDIA détectée : accélération GPU pour la transcription…"
  .venv/bin/python -m pip install nvidia-cublas-cu12 "nvidia-cudnn-cu12>=9,<10" || true
fi
echo "[3/3] Analyse de ton PC :"
.venv/bin/python -m clipbot --sysinfo
echo; echo "Installation terminée. Lance le bot avec : ./start.sh"
