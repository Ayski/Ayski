"""Détection de la facecam : un visage stable au même endroit sur plusieurs images."""
import subprocess
import sys

import numpy as np

from .sysinfo import ffmpeg_bin

_cascade = None


def _frames(path: str, n: int = 12, w: int = 640, h: int = 360) -> np.ndarray:
    cmd = [ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-nostdin", "-i", str(path), "-an",
           "-vf", f"fps=1/2,scale={w}:{h}", "-frames:v", str(n), "-pix_fmt", "gray", "-f", "rawvideo", "-"]
    r = subprocess.run(cmd, capture_output=True, timeout=60,
                       creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0)
    k = len(r.stdout) // (w * h)
    return np.frombuffer(r.stdout[: k * w * h], dtype=np.uint8).reshape(k, h, w)


def _runs(mask: np.ndarray) -> list[int]:
    """Centres des groupes de positions consécutives vraies."""
    out, start = [], None
    for i, v in enumerate(list(mask) + [False]):
        if v and start is None:
            start = i
        elif not v and start is not None:
            out.append((start + i - 1) // 2)
            start = None
    return out


def refine_rect(frames: np.ndarray, mx: float, my: float, fw: float, fh: float) -> tuple[int, int, int, int] | None:
    """Cherche le vrai cadre de la webcam autour du visage : ses bords sont des lignes fixes d'une image à l'autre,
    alors que le jeu bouge derrière. Renvoie (x0, y0, x1, y1) en pixels, ou None si aucun cadre net."""
    import cv2
    H, W = frames.shape[1:]
    k = np.ones((3, 3), np.uint8)
    edges = np.mean([cv2.dilate(cv2.Canny(f, 50, 150), k) > 0 for f in frames], axis=0)
    fixed = edges >= 0.75                                        # contour présent sur presque toutes les images
    r0, r1 = int(max(0, my - fh * 0.8)), int(min(H, my + fh * 0.8))
    c0, c1 = int(max(0, mx - fw * 0.5)), int(min(W, mx + fw * 0.5))
    col = fixed[r0:r1].mean(axis=0) >= 0.7                       # lignes verticales qui traversent la zone du visage
    row = fixed[:, c0:c1].mean(axis=1) >= 0.7                    # lignes horizontales au-dessus / en dessous du visage
    lo_x, hi_x = mx - fw * 6, mx + fw * 6
    # le bord de l'image ne sert de côté que s'il n'y a aucune ligne fixe de ce côté (webcam collée au bord)
    lefts = [x for x in _runs(col) if lo_x <= x < mx - fw * 0.6][-4:] or ([0] if lo_x <= 0 else [])
    rights = [x for x in _runs(col) if mx + fw * 0.6 < x <= hi_x][:4] or ([W - 1] if hi_x >= W - 1 else [])
    tops = [y for y in _runs(row) if my - fh * 4 <= y < my - fh * 0.6][-4:] or ([0] if my - fh * 4 <= 0 else [])
    bots = [y for y in _runs(row) if my + fh * 0.6 < y <= my + fh * 7][:4] or ([H - 1] if my + fh * 7 >= H - 1 else [])

    def side(a: np.ndarray, at_border: bool) -> float:
        return 0.75 if at_border else float(a.mean()) if a.size else 0.0

    best, best_area = None, 0
    for x0 in lefts:
        for x1 in rights:
            for y0 in tops:
                for y1 in bots:
                    w, h = x1 - x0, y1 - y0
                    if h < fh * 1.3 or w < fw * 1.3 or h > H * 0.62 or w > W * 0.62 or not 0.9 <= w / h <= 2.2:
                        continue
                    score = min(side(fixed[y0:y1, max(0, x0 - 1):x0 + 2].any(axis=1), x0 == 0),
                                side(fixed[y0:y1, max(0, x1 - 1):x1 + 2].any(axis=1), x1 == W - 1),
                                side(fixed[max(0, y0 - 1):y0 + 2, x0:x1].any(axis=0), y0 == 0),
                                side(fixed[max(0, y1 - 1):y1 + 2, x0:x1].any(axis=0), y1 == H - 1))
                    if score >= 0.6 and w * h > best_area:       # à qualité suffisante, le plus grand cadre (bord extérieur)
                        best, best_area = (x0, y0, x1, y1), w * h
    return best


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
    if len(found) < max(4, len(frames) * 0.6):
        return None
    a = np.array(found, dtype=np.float32)
    cx, cy = a[:, 0] + a[:, 2] / 2, a[:, 1] + a[:, 3] / 2
    if cx.std() > W * 0.05 or cy.std() > H * 0.06:      # un visage qui bouge = pas une facecam
        return None
    fw, fh = float(np.median(a[:, 2])), float(np.median(a[:, 3]))
    mx, my = float(np.median(cx)), float(np.median(cy))
    try:
        rect = refine_rect(frames, mx, my, fw, fh)
    except Exception:
        rect = None
    if rect:                                              # vrai cadre de la webcam trouvé
        x0, y0, x1, y1 = rect
        return {"x": round(x0 / W, 4), "y": round(y0 / H, 4), "w": round((x1 - x0) / W, 4), "h": round((y1 - y0) / H, 4),
                "framed": True}
    # webcam sans cadre net (détourée) : zone autour du visage au format du panneau du haut (1080x640)
    ch = min(H * 0.6, fh * 2.6)
    cw = ch * 1080 / 640
    if cw > W * 0.6:
        cw = W * 0.6
        ch = cw * 640 / 1080
    x = min(max(0.0, mx - cw / 2), W - cw)
    y = min(max(0.0, my - ch * 0.45), H - ch)
    return {"x": round(x / W, 4), "y": round(y / H, 4), "w": round(cw / W, 4), "h": round(ch / H, 4)}
