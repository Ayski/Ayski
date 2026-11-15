"""Transcription mot à mot avec faster-whisper (modèle choisi selon le PC, téléchargé au premier usage)."""
import threading

from pathlib import Path

from . import paths, settings, sysinfo
from .logbus import log, warn

_model = None
_model_key = None
_lock = threading.Lock()
_failed_until = 0.0
state = {"model": "", "device": "", "ready": False, "error": ""}


def _cuda_dlls() -> None:
    """Rend visibles les bibliothèques NVIDIA installées par pip (cuBLAS / cuDNN)."""
    import os
    import site
    import sys
    for sp in site.getsitepackages():
        root = Path(sp) / "nvidia"
        if not root.is_dir():
            continue
        for d in list(root.glob("*/bin")) + list(root.glob("*/lib")):
            if sys.platform == "win32":
                try:
                    os.add_dll_directory(str(d))
                except OSError:
                    pass
                os.environ["PATH"] = str(d) + os.pathsep + os.environ.get("PATH", "")


def _load():
    global _model, _model_key, _failed_until
    import time
    rec = sysinfo.recommend()
    name = settings.get("whisper_model")
    if name in ("auto", "", None):
        name = rec["whisper_model"]
    key = (name, rec["whisper_device"])
    if _model is not None and _model_key == key:
        return _model
    if time.time() < _failed_until:
        return None
    _cuda_dlls()
    import os
    os.environ.setdefault("HF_HUB_DISABLE_XET", "1")       # téléchargement HTTP classique, plus robuste
    os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
    from faster_whisper import WhisperModel
    attempts = [(rec["whisper_device"], "float16")] if rec["whisper_device"] == "cuda" else []
    attempts.append(("cpu", "int8"))
    for device, ctype in attempts:
        try:
            log("whisper", f"Chargement du modèle {name} ({device})… le premier lancement télécharge le modèle")
            m = WhisperModel(name, device=device, compute_type=ctype, download_root=str(paths.MODELS),
                             cpu_threads=max(2, sysinfo.static_info()["cores"] // 2))
            _model, _model_key = m, key
            state.update(model=name, device=device, ready=True, error="")
            return m
        except Exception as e:
            warn("whisper", f"Modèle {name} sur {device} indisponible : {e}")
            state.update(ready=False, error=str(e)[:200])
    _failed_until = time.time() + 300
    return None


def transcribe(path: str, lang_hint: str | None = None) -> dict:
    """Renvoie {language, text, words:[{w,s,e}], segments:[{s,e,text}]} ; vide si le modèle est indisponible."""
    empty = {"language": lang_hint or "", "text": "", "words": [], "segments": []}
    with _lock:
        m = _load()
        if m is None:
            return empty
        try:
            from . import analyze
            audio = analyze.pcm(str(path), timeout=180)      # décodage par ffmpeg (16 kHz mono), indépendant de PyAV
            if len(audio) < 1600:
                return empty
            segs, info = m.transcribe(audio, language=None, word_timestamps=True, vad_filter=True,
                                      beam_size=2, condition_on_previous_text=False)
            lang = info.language if info.language_probability > 0.6 or not lang_hint else lang_hint
            words, segments = [], []
            for s in segs:
                if s.no_speech_prob > 0.8:
                    continue
                segments.append({"s": round(float(s.start), 2), "e": round(float(s.end), 2), "text": s.text.strip()})
                for w in s.words or []:
                    t = w.word.strip()
                    if t:
                        words.append({"w": t, "s": round(float(w.start), 2), "e": round(float(w.end), 2)})
            return {"language": lang, "text": " ".join(x["text"] for x in segments), "words": words, "segments": segments}
        except Exception as e:
            warn("whisper", f"Transcription échouée : {e}")
            return empty
