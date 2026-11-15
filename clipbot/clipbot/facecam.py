"""Détection de la facecam : un visage stable au même endroit sur plusieurs images."""
import subprocess
import sys

import numpy as np

from .sysinfo import ffmpeg_bin

_cascade = None


def _frames(path: str, n: int = 8, w: int = 640, h: int = 360) -> np.ndarray:
    cmd = [ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-nostdin", "-i", str(path), "-an",
           "-vf", f"fps=1/2,scale={w}:{h}", "-frames:v", str(n), "-pix_fmt", "gray", "-f", "rawvideo", "-"]
    r = subprocess.run(cmd, capture_output=True, timeout=60,
                       creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0)
    k = len(r.stdout) // (w * h)
    return np.frombuffer(r.stdout[: k * w * h], dtype=np.uint8).reshape(k, h, w)


def detect(path: str) -> dict | None:
    """Renvoie {x,y,w,h} en fractions de l'image (zone facecam), ou None."""
    global _cascade
    try:
        import cv2
        if _cascade is None:
            _cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        frames = _frames(path)
    except Exception:
        return None
    if len(frames) < 3:
        return None
    H, W = frames.shape[1:]
    found = []
    for f in frames:
        faces = _cascade.detectMultiScale(f, scaleFactor=1.1, minNeighbors=6, minSize=(int(H * 0.06), int(H * 0.06)))
        faces = [b for b in faces if b[3] < H * 0.45]
        if len(faces):
            found.append(max(faces, key=lambda b: b[2] * b[3]))
    if len(found) < max(3, len(frames) * 0.5):
        return None
    a = np.array(found, dtype=np.float32)
    cx, cy = a[:, 0] + a[:, 2] / 2, a[:, 1] + a[:, 3] / 2
    if cx.std() > W * 0.05 or cy.std() > H * 0.06:      # un visage qui bouge = pas une facecam
        return None
    fw, fh = float(np.median(a[:, 2])), float(np.median(a[:, 3]))
    mx, my = float(np.median(cx)), float(np.median(cy))
    # zone autour du visage au format du panneau du haut (1080x640)
    ch = min(H * 0.6, fh * 2.6)
    cw = ch * 1080 / 640
    if cw > W * 0.6:
        cw = W * 0.6
        ch = cw * 640 / 1080
    x = min(max(0.0, mx - cw / 2), W - cw)
    y = min(max(0.0, my - ch * 0.45), H - ch)
    return {"x": round(x / W, 4), "y": round(y / H, 4), "w": round(cw / W, 4), "h": round(ch / H, 4)}
