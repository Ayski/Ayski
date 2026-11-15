"""Analyse du PC (OS, CPU, GPU, disque) et réglages conseillés. Démarrage automatique avec le PC."""
import functools
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

import psutil

from . import paths


def _run(cmd: list[str], timeout: float = 8) -> str:
    try:
        return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout,
                              creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0).stdout.strip()
    except Exception:
        return ""


@functools.lru_cache(maxsize=1)
def ffmpeg_bin() -> str:
    found = os.environ.get("FFMPEG_BIN") or shutil.which("ffmpeg")
    if not found and platform.system() == "Windows":      # installé par winget mais PATH pas encore rafraîchi
        base = Path(os.environ.get("LOCALAPPDATA", "")) / "Microsoft/WinGet"
        cands = [base / "Links/ffmpeg.exe", *base.glob("Packages/Gyan.FFmpeg*/**/bin/ffmpeg.exe")]
        found = next((str(c) for c in cands if c.exists()), None)
    return found or "ffmpeg"


def cpu_name() -> str:
    s = platform.system()
    if s == "Windows":
        out = _run(["powershell", "-NoProfile", "-Command", "(Get-CimInstance Win32_Processor).Name"])
        return out.splitlines()[0] if out else platform.processor()
    if s == "Darwin":
        return _run(["sysctl", "-n", "machdep.cpu.brand_string"]) or platform.processor()
    try:
        for line in Path("/proc/cpuinfo").read_text().splitlines():
            if line.startswith("model name"):
                return line.split(":", 1)[1].strip()
    except OSError:
        pass
    return platform.processor() or "CPU inconnu"


def gpus() -> list[dict]:
    out = _run(["nvidia-smi", "--query-gpu=name,memory.total,utilization.gpu,memory.used", "--format=csv,noheader,nounits"])
    res = []
    for line in out.splitlines():
        p = [x.strip() for x in line.split(",")]
        if len(p) >= 4 and p[1].isdigit():
            res.append({"name": p[0], "vendor": "nvidia", "vram_mb": int(p[1]), "util": float(p[2] or 0), "vram_used_mb": int(p[3] or 0)})
    if res:
        return res
    if platform.system() == "Windows":
        out = _run(["powershell", "-NoProfile", "-Command", "(Get-CimInstance Win32_VideoController).Name"])
        for n in out.splitlines():
            if n.strip():
                v = "amd" if ("AMD" in n or "Radeon" in n) else "intel" if "Intel" in n else "autre"
                res.append({"name": n.strip(), "vendor": v, "vram_mb": 0})
    elif platform.system() == "Darwin":
        res.append({"name": "Apple GPU", "vendor": "apple", "vram_mb": 0})
    return res


@functools.lru_cache(maxsize=1)
def best_encoder() -> str:
    """Teste les encodeurs matériels disponibles ; retombe sur libx264 (CPU)."""
    for enc in ("h264_nvenc", "h264_qsv", "h264_amf", "h264_videotoolbox"):
        try:
            r = subprocess.run([ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i",
                                "testsrc=size=1280x720:rate=30:duration=0.5", "-c:v", enc, "-f", "null", "-"],
                               capture_output=True, timeout=20)
            if r.returncode == 0:
                return enc
        except Exception:
            pass
    return "libx264"


@functools.lru_cache(maxsize=1)
def static_info() -> dict:
    g = gpus()
    return {
        "os": f"{platform.system()} {platform.release()}",
        "python": platform.python_version(),
        "cpu": cpu_name(),
        "cores": psutil.cpu_count(logical=False) or psutil.cpu_count() or 2,
        "threads": psutil.cpu_count() or 2,
        "ram_gb": round(psutil.virtual_memory().total / 2**30, 1),
        "gpus": [{"name": x["name"], "vendor": x["vendor"], "vram_mb": x.get("vram_mb", 0)} for x in g],
        "ffmpeg": (_run([ffmpeg_bin(), "-version"]).splitlines() or ["introuvable"])[0],
        "encoder": best_encoder(),
    }


def recommend() -> dict:
    """Réglages conseillés pour ce PC."""
    info = static_info()
    cores, ram = info["cores"], info["ram_gb"]
    free_gb = shutil.disk_usage(paths.DATA).free / 2**30
    max_streams = int(max(2, min(cores * 1.5, ram / 0.8, free_gb / 0.5, 20)))
    nv = next((g for g in info["gpus"] if g["vendor"] == "nvidia"), None)
    if nv and nv["vram_mb"] >= 5000:
        whisper, device = "large-v3-turbo", "cuda"
    elif nv:
        whisper, device = "small", "cuda"
    elif cores >= 8:
        whisper, device = "small", "cpu"
    else:
        whisper, device = "base", "cpu"
    edit_workers = max(1, min(4, cores // 3 if info["encoder"] == "libx264" else cores // 2))
    return {"max_streams": max_streams, "whisper_model": whisper, "whisper_device": device,
            "edit_workers": edit_workers, "encoder": info["encoder"]}


def live_info() -> dict:
    du = shutil.disk_usage(paths.DATA)
    vm = psutil.virtual_memory()

    def folder(p: Path) -> float:
        try:
            return round(sum(f.stat().st_size for f in p.rglob("*") if f.is_file()) / 2**30, 2)
        except OSError:
            return 0.0
    return {
        "cpu": psutil.cpu_percent(interval=None),
        "ram_used_gb": round(vm.used / 2**30, 1), "ram_pct": vm.percent,
        "disk_free_gb": round(du.free / 2**30, 1), "disk_total_gb": round(du.total / 2**30, 1),
        "disk_pct": round(100 * du.used / du.total, 1),
        "gpus": [g for g in gpus() if g["vendor"] == "nvidia"],
        "folders": {"clips": folder(paths.CLIPS), "buffers": folder(paths.BUFFERS), "raw": folder(paths.RAW)},
    }


def lan_ip() -> str:
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return "127.0.0.1"


# ---------- démarrage automatique avec le PC ----------
def _autostart_file() -> Path:
    s = platform.system()
    if s == "Windows":
        return Path(os.environ.get("APPDATA", "")) / "Microsoft/Windows/Start Menu/Programs/Startup/ClipBot.bat"
    if s == "Darwin":
        return Path.home() / "Library/LaunchAgents/com.clipbot.plist"
    return Path.home() / ".config/autostart/clipbot.desktop"


def autostart_enabled() -> bool:
    return _autostart_file().exists()


def set_autostart(enabled: bool) -> bool:
    f = _autostart_file()
    if not enabled:
        f.unlink(missing_ok=True)
        return False
    f.parent.mkdir(parents=True, exist_ok=True)
    s = platform.system()
    if s == "Windows":
        f.write_text(f'@echo off\r\ncd /d "{paths.ROOT}"\r\nstart "ClipBot" /min cmd /c start.bat --no-browser\r\n', encoding="utf-8")
    elif s == "Darwin":
        f.write_text(f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>Label</key><string>com.clipbot</string>
<key>ProgramArguments</key><array><string>/bin/bash</string><string>{paths.ROOT}/start.sh</string><string>--no-browser</string></array>
<key>RunAtLoad</key><true/><key>WorkingDirectory</key><string>{paths.ROOT}</string></dict></plist>""", encoding="utf-8")
    else:
        f.write_text(f"[Desktop Entry]\nType=Application\nName=ClipBot\nExec=/bin/bash {paths.ROOT}/start.sh --no-browser\nX-GNOME-Autostart-enabled=true\n", encoding="utf-8")
    return True


if __name__ == "__main__":
    import json
    print(json.dumps({"systeme": static_info(), "conseils": recommend()}, indent=2, ensure_ascii=False))
    sys.exit(0)
