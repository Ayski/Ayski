"""Mesures brutes sur un fichier vidéo : volume/cris (audio) et changement visuel (images clés)."""
import subprocess
import sys

import numpy as np

from .sysinfo import ffmpeg_bin

SR = 16000
WIN = 0.5
FW, FH = 96, 54
_FLAGS = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0


def pcm(path: str, start: float | None = None, dur: float | None = None, timeout: float = 120) -> np.ndarray:
    cmd = [ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-nostdin"]
    if start is not None:
        cmd += ["-ss", f"{start:.3f}"]
    cmd += ["-i", str(path)]
    if dur is not None:
        cmd += ["-t", f"{dur:.3f}"]
    cmd += ["-vn", "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"]
    r = subprocess.run(cmd, capture_output=True, timeout=timeout, creationflags=_FLAGS)
    return np.frombuffer(r.stdout, dtype=np.int16).astype(np.float32) / 32768.0


def audio_levels(samples: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Par fenêtre de 0,5 s : (volume en dB, énergie dB dans la bande des cris 1-4 kHz)."""
    n = int(SR * WIN)
    k = len(samples) // n
    if k == 0:
        return np.zeros(0), np.zeros(0)
    x = samples[: k * n].reshape(k, n)
    db = 20 * np.log10(np.sqrt((x ** 2).mean(axis=1)) + 1e-6)
    spec = np.abs(np.fft.rfft(x * np.hanning(n), axis=1)) ** 2
    freqs = np.fft.rfftfreq(n, 1 / SR)
    band = spec[:, (freqs >= 1000) & (freqs <= 4000)].mean(axis=1)
    hf = 10 * np.log10(band / n + 1e-9)
    return db, hf


def keyframes(path: str, timeout: float = 60) -> np.ndarray:
    """Images clés en niveaux de gris 96x54 (très peu coûteux : on ne décode que les images clés)."""
    cmd = [ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-nostdin", "-skip_frame", "nokey", "-i", str(path),
           "-an", "-vf", f"scale={FW}:{FH}", "-vsync", "0", "-pix_fmt", "gray", "-f", "rawvideo", "-"]
    r = subprocess.run(cmd, capture_output=True, timeout=timeout, creationflags=_FLAGS)
    k = len(r.stdout) // (FW * FH)
    return np.frombuffer(r.stdout[: k * FW * FH], dtype=np.uint8).reshape(k, FH, FW).astype(np.float32)


def motion(frames: np.ndarray, prev: np.ndarray | None) -> tuple[float, np.ndarray | None]:
    """Changement visuel moyen (0-255) entre images clés successives."""
    if len(frames) == 0:
        return 0.0, prev
    seq = frames if prev is None else np.concatenate([prev[None], frames])
    if len(seq) < 2:
        return 0.0, frames[-1]
    d = np.abs(np.diff(seq, axis=0)).mean(axis=(1, 2))
    return float(d.max()), frames[-1]


def segment_features(path: str, prev_frame: np.ndarray | None):
    db, hf = audio_levels(pcm(path, timeout=30))
    mv, last = motion(keyframes(path, timeout=30), prev_frame)
    return db, hf, mv, last
