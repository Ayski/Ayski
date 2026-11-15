"""Capture d'un stream en segments de 4 s (buffer glissant), avec reconnexion automatique.

Source « live » : streamlink → ffmpeg (copie sans réencodage, très léger).
Source « fichier » (tests) : ffmpeg -re lit un fichier à vitesse réelle.
"""
import shutil
import subprocess
import sys
import threading
import time
from dataclasses import dataclass
from pathlib import Path

from . import paths, settings
from .logbus import alert, log, warn
from .sysinfo import ffmpeg_bin

SEG = 4


@dataclass
class Segment:
    path: Path
    session: int
    start: float      # temps flux (s) dans la session
    end: float
    seen: float       # horloge murale à l'apparition

    wall_start: float = 0.0
    wall_end: float = 0.0


class StreamCapture:
    def __init__(self, login: str, source: str | None = None) -> None:
        self.login = login
        self.source = source or f"https://www.twitch.tv/{login}"
        self.dir = paths.BUFFERS / login
        self.segments: list[Segment] = []
        self.lock = threading.Lock()
        self._stop = threading.Event()
        self._procs: list[subprocess.Popen] = []
        self._thread: threading.Thread | None = None
        self.session = 0
        self.offset: float | None = None      # horloge murale = temps flux + offset
        self.state = "arrêt"
        self.last_segment_at = 0.0
        self.restarts = 0
        self.ended = False                     # fichier de test terminé / stream hors ligne

    def start(self) -> None:
        shutil.rmtree(self.dir, ignore_errors=True)
        self.dir.mkdir(parents=True, exist_ok=True)
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name=f"cap-{self.login}", daemon=True)
        self._thread.start()

    def stop(self, cleanup: bool = True) -> None:
        self._stop.set()
        self._kill()
        if self._thread and self._thread is not threading.current_thread():
            self._thread.join(timeout=8)
        if cleanup:
            shutil.rmtree(self.dir, ignore_errors=True)
        self.state = "arrêt"

    def _kill(self) -> None:
        for p in self._procs:
            try:
                p.kill()
            except Exception:
                pass
        for p in self._procs:
            try:
                p.wait(timeout=5)
            except Exception:
                pass
        self._procs = []

    def _spawn(self) -> None:
        self.session += 1
        self.offset = None
        pat = str(self.dir / f"s{self.session:03d}_%06d.ts")
        lst = str(self.dir / f"s{self.session:03d}.csv")
        seg_args = ["-map", "0:v:0", "-map", "0:a:0?", "-c", "copy", "-f", "segment", "-segment_time", str(SEG),
                    "-segment_list", lst, "-segment_list_type", "csv", "-reset_timestamps", "1", pat]
        ff = [ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-nostdin"]
        flags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        if self.source.startswith("http"):
            sl = subprocess.Popen([sys.executable, "-m", "streamlink", "--stdout", "--loglevel", "error",
                                   "--retry-streams", "5", "--retry-max", "3", "--stream-segment-attempts", "5",
                                   self.source, settings.get("stream_quality")],
                                  stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, creationflags=flags)
            fp = subprocess.Popen(ff + ["-i", "pipe:0"] + seg_args, stdin=sl.stdout, stdout=subprocess.DEVNULL,
                                  stderr=subprocess.DEVNULL, creationflags=flags)
            sl.stdout.close()
            self._procs = [sl, fp]
        else:
            fp = subprocess.Popen(ff + ["-re", "-i", self.source] + seg_args, stdout=subprocess.DEVNULL,
                                  stderr=subprocess.DEVNULL, creationflags=flags)
            self._procs = [fp]

    def _read_list(self, pos: int) -> int:
        lst = self.dir / f"s{self.session:03d}.csv"
        if not lst.exists():
            return pos
        with open(lst, "rb") as f:          # binaire : la position reste exacte même avec des fins de ligne Windows
            f.seek(pos)
            raw = f.read()
        raw = raw[: raw.rfind(b"\n") + 1]
        data = raw.decode("utf-8", errors="ignore")
        now = time.time()
        for line in data.splitlines():
            p = line.strip().split(",")
            if len(p) < 3:
                continue
            try:
                s, e = float(p[1]), float(p[2])
            except ValueError:
                continue
            path = self.dir / p[0]
            if not path.exists() or e - s < 0.2:
                continue
            off = now - e
            if self.offset is None or off < self.offset:
                self.offset = off
            with self.lock:
                self.segments.append(Segment(path, self.session, s, e, now))
            self.last_segment_at = now
        return pos + len(raw)

    def _prune(self) -> None:
        keep = settings.get("buffer_seconds") + 60
        now = time.time()
        with self.lock:
            old = [s for s in self.segments if now - s.seen > keep]
            self.segments = [s for s in self.segments if now - s.seen <= keep]
        for s in old:
            try:
                s.path.unlink(missing_ok=True)
            except OSError:                 # Windows : fichier encore ouvert par ffmpeg, supprimé au prochain nettoyage
                pass

    def _run(self) -> None:
        backoff = 3
        while not self._stop.is_set():
            self.state = "connexion"
            try:
                self._spawn()
            except Exception as e:
                warn("capture", f"{self.login}: lancement impossible ({e})")
                self._stop.wait(backoff)
                continue
            pos, started = 0, time.time()
            self.last_segment_at = 0
            while not self._stop.is_set():
                time.sleep(0.5)
                pos = self._read_list(pos)
                self._prune()
                if self.last_segment_at:
                    self.state = "ok"
                    backoff = 3
                dead = any(p.poll() is not None for p in self._procs)
                stalled = time.time() - (self.last_segment_at or started) > 45
                if dead or stalled:
                    time.sleep(0.6)
                    self._read_list(pos)
                    break
            self._kill()
            if self._stop.is_set():
                break
            if not self.source.startswith("http"):
                self.ended = True
                self.state = "terminé"
                return
            self.restarts += 1
            self.state = "reconnexion"
            if self.restarts >= 4 and time.time() - self.last_segment_at > 120:
                self.ended = True       # le superviseur vérifiera si le stream est encore en ligne
                alert("stream_lost", f"Stream perdu : {self.login}")
                return
            warn("capture", f"{self.login}: flux interrompu, reconnexion dans {backoff}s")
            self._stop.wait(backoff)
            backoff = min(60, backoff * 2)

    # --- accès aux segments ---
    def snapshot(self) -> list[Segment]:
        with self.lock:
            segs = list(self.segments)
        for s in segs:
            off = self.offset if s.session == self.session and self.offset is not None else s.seen - s.end
            s.wall_start, s.wall_end = s.start + off, s.end + off
        return segs

    def covering(self, t0: float, t1: float) -> list[Segment]:
        """Segments (d'une même session) couvrant l'intervalle mural [t0, t1]."""
        segs = [s for s in self.snapshot() if s.wall_end > t0 and s.wall_start < t1 and s.path.exists()]
        if not segs:
            return []
        sess = max({s.session for s in segs}, key=lambda k: sum(1 for s in segs if s.session == k))
        return sorted((s for s in segs if s.session == sess), key=lambda s: s.start)


def extract(segs: list[Segment], out: Path) -> bool:
    """Assemble des segments en un MP4 brut (copie, sans réencodage)."""
    if not segs:
        return False
    out.parent.mkdir(parents=True, exist_ok=True)
    lst = out.with_suffix(".txt")
    lst.write_text("".join(f"file '{s.path.as_posix()}'\n" for s in segs), encoding="utf-8")
    try:
        r = subprocess.run([ffmpeg_bin(), "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
                            "-i", str(lst), "-c", "copy", "-movflags", "+faststart", str(out)],
                           capture_output=True, timeout=120)
        return r.returncode == 0 and out.exists() and out.stat().st_size > 10000
    finally:
        lst.unlink(missing_ok=True)
