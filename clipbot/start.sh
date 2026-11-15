#!/usr/bin/env bash
cd "$(dirname "$0")"
[ -x .venv/bin/python ] || ./install.sh
# bibliothèques NVIDIA installées par pip (accélération GPU de la transcription)
for d in .venv/lib/python*/site-packages/nvidia/*/lib; do [ -d "$d" ] && export LD_LIBRARY_PATH="$PWD/$d:$LD_LIBRARY_PATH"; done
while true; do
  .venv/bin/python -m clipbot "$@" && break
  echo "Le bot s'est arrêté de façon inattendue. Redémarrage dans 10 s… (Ctrl+C pour annuler)"
  sleep 10
done
