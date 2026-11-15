"""Montage automatique vertical 1080x1920 avec ffmpeg.

facecam détectée → facecam en haut + gameplay en bas ; sinon gameplay recadré sur fond flou.
Jump cuts (silences supprimés), zooms sur les pics, ouverture percutante, sous-titres mot par mot,
titre, crédit permanent, audio normalisé, export H.264 optimisé TikTok.
"""
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from . import analyze, paths, subtitles, sysinfo
from .logbus import warn

QUALITY = {"draft": (27, "veryfast"), "standard": (23, "fast"), "high": (20, "fast")}


@dataclass
class EditJob:
    raw: str
    out: str
    t_in: float
    t_out: float
    words: list = field(default_factory=list)       # temps relatifs au fichier brut
    peaks: list = field(default_factory=list)       # idem
    facecam: dict | None = None
    title: str = ""
    hook: str = ""
    credit: str = ""
    recap: str = ""
    teaser: str = ""
    sub_style: dict = field(default_factory=dict)
    title_style: dict = field(default_factory=dict)
    quality: str = "high"
    encoder: str = "auto"
    jump_cuts: bool = True
    zooms: bool = True
    opening: str = "auto"
    min_duration: float = 10
    thumb: str = ""


def probe(path: str) -> dict:
    ffprobe = shutil.which("ffprobe") or sysinfo.ffmpeg_bin().replace("ffmpeg", "ffprobe")
    r = subprocess.run([ffprobe, "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height:format=duration", "-of", "csv=p=0", str(path)],
                       capture_output=True, text=True, timeout=30)
    vals = [x for x in r.stdout.replace("\n", ",").split(",") if x.strip()]
    try:
        return {"w": int(vals[0]), "h": int(vals[1]), "duration": float(vals[2])}
    except (IndexError, ValueError):
        return {"w": 1280, "h": 720, "duration": 0.0}


def keep_segments(job: EditJob) -> list[tuple[float, float]]:
    """Jump cuts : on retire les passages silencieux de plus d'une seconde."""
    full = [(job.t_in, job.t_out)]
    if not job.jump_cuts or job.t_out - job.t_in <= job.min_duration + 1:
        return full
    db, _ = analyze.audio_levels(analyze.pcm(job.raw, job.t_in, job.t_out - job.t_in))
    if len(db) < 6:
        return full
    quiet_thr = max(-48.0, float(np.median(db)) - 14.0)
    active = db > quiet_thr
    for w in job.words:
        a, b = int((w["s"] - 0.3 - job.t_in) / 0.5), int((w["e"] + 0.3 - job.t_in) / 0.5)
        active[max(0, a): max(0, b) + 1] = True
    for p in job.peaks:
        a = int((p - job.t_in) / 0.5)
        active[max(0, a - 2): a + 4] = True
    segs, i, n = [], 0, len(active)
    cur = job.t_in
    while i < n:
        if not active[i]:
            j = i
            while j < n and not active[j]:
                j += 1
            if (j - i) * 0.5 >= 1.0 and i > 0 and j < n:        # silence interne ≥ 1 s
                cut_a, cut_b = job.t_in + i * 0.5 + 0.2, job.t_in + j * 0.5 - 0.2
                if cut_a - cur > 0.3:
                    segs.append((cur, cut_a))
                cur = cut_b
            i = j
        else:
            i += 1
    segs.append((cur, job.t_out))
    if sum(b - a for a, b in segs) < job.min_duration or len(segs) > 12:
        return full
    return segs


def remap(t: float, segs: list[tuple[float, float]], lead: float = 0.0) -> float | None:
    acc = lead
    for a, b in segs:
        if a <= t <= b:
            return acc + (t - a)
        acc += b - a
    return None


def _encoder_args(job: EditJob) -> list[str]:
    crf, preset = QUALITY.get(job.quality, QUALITY["high"])
    enc = sysinfo.best_encoder() if job.encoder in ("auto", "", None) else job.encoder
    common = ["-pix_fmt", "yuv420p", "-r", "30", "-g", "60", "-maxrate", "12M", "-bufsize", "24M"]
    if enc == "h264_nvenc":
        return ["-c:v", enc, "-preset", "p5", "-rc", "vbr", "-cq", str(crf + 2), "-b:v", "0", "-profile:v", "high"] + common
    if enc in ("h264_qsv", "h264_amf", "h264_videotoolbox"):
        return ["-c:v", enc, "-b:v", {"draft": "4M", "standard": "6M", "high": "9M"}.get(job.quality, "9M")] + common
    return ["-c:v", "libx264", "-preset", preset, "-crf", str(crf), "-profile:v", "high", "-level", "4.2"] + common


def render(job: EditJob) -> dict:
    """Rend le clip final. Renvoie {duration, layout, cuts} ou lève RuntimeError."""
    info = probe(job.raw)
    job.t_in = max(0.0, job.t_in)
    job.t_out = min(job.t_out, info["duration"] or job.t_out)
    if job.t_out - job.t_in < 2:
        raise RuntimeError("extrait brut trop court")
    segs = keep_segments(job)
    main_dur = sum(b - a for a, b in segs)

    # ouverture : passage le plus fort d'abord si le pic arrive tard, sinon texte teaser (hook)
    lead_seg, lead = None, 0.0
    peak = job.peaks[0] if job.peaks else None      # le premier pic transmis est le plus fort
    peak_out = remap(peak, segs) if peak is not None else None
    mode = job.opening
    if mode == "auto":
        mode = "cold_open" if (peak_out is not None and peak_out > max(8.0, main_dur * 0.55) and not job.recap) else "hook_text"
    if mode == "cold_open" and peak is not None:
        a, b = max(job.t_in, peak - 0.4), min(job.t_out, peak + 1.3)
        if b - a > 0.8:
            lead_seg, lead = (a, b), b - a
    parts = ([lead_seg] if lead_seg else []) + segs
    duration = lead + main_dur

    # filtres : découpe + concaténation
    f = []
    for i, (a, b) in enumerate(parts):
        f.append(f"[0:v]trim=start={a:.3f}:end={b:.3f},setpts=PTS-STARTPTS[v{i}]")
        f.append(f"[0:a]atrim=start={a:.3f}:end={b:.3f},asetpts=PTS-STARTPTS[a{i}]")
    f.append("".join(f"[v{i}][a{i}]" for i in range(len(parts))) + f"concat=n={len(parts)}:v=1:a=1[vc][ac]")

    # zooms « punchy » sur les pics
    zoom = ""
    zt = sorted({round(t, 2) for t in (remap(p, segs, lead) for p in job.peaks) if t is not None})[:4]
    if job.zooms and zt:
        expr = "+".join(f"0.14*exp(-pow((it-{t:.2f})/0.45\\,2))" for t in zt)
        zoom = (f"zoompan=z='1+{expr}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:"
                f"s={info['w']}x{info['h']}:fps=30,")

    fc = job.facecam
    if fc:
        cw, ch = int(info["w"] * fc["w"]) // 2 * 2, int(info["h"] * fc["h"]) // 2 * 2
        cx, cy = int(info["w"] * fc["x"]), int(info["h"] * fc["y"])
        f.append("[vc]fps=30,split=2[g0][c0]")
        f.append(f"[g0]{zoom}crop=trunc(ih*1080/1280/2)*2:ih,scale=1080:1280:flags=bicubic,setsar=1[game]")
        f.append(f"[c0]crop={cw}:{ch}:{cx}:{cy},scale=1080:640:flags=bicubic,setsar=1[cam]")
        f.append("[cam][game]vstack=inputs=2[lay]")
        layout = "facecam"
    else:
        f.append("[vc]fps=30,split=2[g0][b0]")
        f.append("[b0]scale=540:960:force_original_aspect_ratio=increase,crop=540:960,boxblur=12:2,"
                 "scale=1080:1920,eq=brightness=-0.12:saturation=1.15,setsar=1[bg]")
        f.append(f"[g0]{zoom}crop=trunc(ih*1.05/2)*2:ih,scale=1080:-2:flags=bicubic,setsar=1[fg]")
        f.append("[bg][fg]overlay=0:(H-h)/2-60[lay]")
        layout = "flou"

    # sous-titres et textes
    work = paths.WORK / Path(job.out).stem
    work.mkdir(parents=True, exist_ok=True)
    words = []
    for w in job.words:
        s, e = remap(w["s"], segs, lead), remap(w["e"], segs, lead)
        if s is not None:
            words.append({"w": w["w"], "s": s, "e": e if e is not None and e > s else s + 0.3})
    ass = subtitles.build_ass(words, duration, sub_style=job.sub_style, title_style=job.title_style,
                              title=job.title, hook=job.hook, credit=job.credit, recap=job.recap, teaser=job.teaser,
                              words_from=lead)
    (work / "subs.ass").write_text(ass, encoding="utf-8")
    fonts = work / "fonts"
    if not fonts.exists():
        shutil.copytree(paths.FONTS, fonts)
    f.append("[lay]ass=subs.ass:fontsdir=fonts[v]")
    f.append("[ac]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000,"
             f"afade=t=out:st={max(0, duration - 0.12):.2f}:d=0.12[a]")
    (work / "graph.txt").write_text(";\n".join(f), encoding="utf-8")

    out = Path(job.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".tmp.mp4")
    def cmd() -> list[str]:
        return [sysinfo.ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-i", str(Path(job.raw).resolve()),
                "-filter_complex_script", "graph.txt", "-map", "[v]", "-map", "[a]", *_encoder_args(job),
                "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", "-t", f"{duration:.3f}",
                str(tmp.resolve())]
    flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
    try:
        r = subprocess.run(cmd(), cwd=work, capture_output=True, text=True, timeout=900, creationflags=flags)
        if r.returncode != 0 and job.encoder in ("auto", "", None) and sysinfo.best_encoder() != "libx264":
            warn("montage", "Encodeur matériel en échec, bascule sur le CPU (libx264)")
            job.encoder = "libx264"
            r = subprocess.run(cmd(), cwd=work, capture_output=True, text=True, timeout=900, creationflags=flags)
        if r.returncode != 0 or not tmp.exists():
            raise RuntimeError(f"ffmpeg : {r.stderr.strip()[-600:]}")
        tmp.replace(out)
        if job.thumb:
            Path(job.thumb).parent.mkdir(parents=True, exist_ok=True)
            subprocess.run([sysinfo.ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-y", "-ss",
                            f"{min(1.5, duration / 2):.2f}", "-i", str(out), "-frames:v", "1", "-vf", "scale=360:640",
                            "-q:v", "4", str(job.thumb)], capture_output=True, timeout=60, creationflags=flags)
    finally:
        tmp.unlink(missing_ok=True)
        shutil.rmtree(work, ignore_errors=True)
    return {"duration": round(duration, 2), "layout": layout, "cuts": len(segs) - 1, "cold_open": bool(lead_seg)}


def keyframes_jpeg(raw: str, t_in: float, t_out: float, n: int = 5, width: int = 768) -> list[bytes]:
    """Images clés JPEG pour l'IA."""
    out = []
    flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
    for i in range(n):
        t = t_in + (t_out - t_in) * (i + 0.5) / n
        r = subprocess.run([sysinfo.ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-nostdin", "-ss", f"{t:.2f}",
                            "-i", str(raw), "-frames:v", "1", "-vf", f"scale={width}:-2", "-q:v", "5", "-f", "mjpeg", "-"],
                           capture_output=True, timeout=60, creationflags=flags)
        if r.stdout:
            out.append(r.stdout)
    return out
