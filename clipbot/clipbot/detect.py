"""Détection des moments forts : score combiné seconde par seconde, normalisé par streamer."""
import math
import time
from dataclasses import dataclass, field

BASE = ("audio", "chat", "emotes", "motion")


def squash(z: float, lo: float, hi: float) -> float:
    return max(0.0, min(1.0, (z - lo) / (hi - lo)))


class Running:
    """Moyenne / écart-type glissants (constante de temps en nombre d'échantillons)."""

    def __init__(self, tau: float, mean: float | None = None, std: float | None = None, floor: float = 1e-3) -> None:
        self.tau, self.floor = tau, floor
        self.mean = mean if mean is not None else 0.0
        self.var = (std or 0.0) ** 2
        self.n = 30 if mean is not None else 0

    def z(self, x: float) -> float:
        if self.n < 8:
            return 0.0
        return (x - self.mean) / max(self.floor, math.sqrt(self.var))

    def add(self, x: float) -> None:
        self.n += 1
        a = max(1.0 / self.tau, 1.0 / self.n)
        d = x - self.mean
        self.mean += a * d
        self.var = (1 - a) * (self.var + a * d * d)

    @property
    def std(self) -> float:
        return math.sqrt(self.var)


@dataclass
class Moment:
    start: float
    end: float
    peak_t: float
    score: float
    signals: dict
    peaks: list = field(default_factory=list)
    forced: bool = False


def combine(sig: dict, w: dict) -> float:
    # sans chat (VOD de test, chat muet) : on ne pénalise pas le score, les poids restants sont renormalisés
    keys = [k for k in BASE + ("keywords",) if not (sig.get("nochat") and k in ("chat", "emotes"))]
    den = sum(w.get(k, 0) for k in keys)
    base = sum(w.get(k, 0) * sig.get(k, 0) for k in keys) / max(den, 1e-6)
    return max(0.0, min(1.0, base + w.get("viewer_clip", 0) * sig.get("viewer_clip", 0)))


class Detector:
    def __init__(self, chat_fn, audio_mean: float | None = None, audio_std: float | None = None) -> None:
        self.chat_fn = chat_fn                      # (t0, t1) -> (messages, réactions)
        self.loud = Running(1200, audio_mean, audio_std, floor=1.5)   # échantillons de 0,5 s → ~10 min
        self.hf = Running(1200, floor=1.5)
        self.mot = Running(150, floor=1.0)          # un échantillon par segment de 4 s
        self.chat_rate = Running(240, floor=0.3)    # par seconde → ~4 min
        self.react_rate = Running(240, floor=0.15)
        self.raw: dict[int, dict] = {}              # seconde -> mesures brutes audio/motion (scores 0-1)
        self.timeline: dict[int, dict] = {}         # seconde -> signaux + score combiné
        self.clip_marks: list[float] = []
        self.cursor: int | None = None
        self.active: dict | None = None
        self.last_end = 0.0
        self.current = 0.0

    # --- alimentation ---
    def add_segment(self, wall_start: float, db, hf, motion_val: float) -> None:
        mz = squash(self.mot.z(motion_val), 1.0, 4.0)
        self.mot.add(motion_val)
        for i in range(len(db)):
            sec = int(wall_start + i * 0.5)
            zl, zh = self.loud.z(float(db[i])), self.hf.z(float(hf[i]))
            a = squash(max(zl, 0.6 * zh + 0.4 * zl), 1.0, 3.5) if db[i] > -50 else 0.0
            r = self.raw.setdefault(sec, {"audio": 0.0, "motion": 0.0})
            r["audio"] = max(r["audio"], a)
            r["motion"] = max(r["motion"], mz)
            if db[i] > -55:                # on n'apprend pas le « normal » sur du silence total
                self.loud.add(float(db[i]))
                self.hf.add(float(hf[i]))

    def add_viewer_clip(self, created_ts: float) -> None:
        self.clip_marks.append(created_ts)
        self.clip_marks = self.clip_marks[-50:]

    # --- calcul ---
    def _signals(self, sec: int, lag: float) -> dict:
        r = self.raw.get(sec, {"audio": 0.0, "motion": 0.0})
        n, re_ = self.chat_fn(sec + lag, sec + lag + 5)
        rate, rrate = n / 5.0, re_ / 5.0
        chat = squash(self.chat_rate.z(rate), 1.5, 5.0) if n >= 4 else 0.0
        if self.chat_rate.n >= 8 and self.chat_rate.mean > 0.05:
            chat = max(chat, squash(rate / self.chat_rate.mean, 1.8, 5.0) if n >= 5 else 0.0)
        emo = squash(self.react_rate.z(rrate), 1.5, 5.0) if re_ >= 3 else 0.0
        emo = max(emo, squash(re_ / max(1.0, n), 0.45, 0.9) if re_ >= 4 else 0.0)
        n1, r1 = self.chat_fn(sec + lag, sec + lag + 1)
        self.chat_rate.add(float(n1))
        self.react_rate.add(float(r1))
        clip = 1.0 if any(c - 30 <= sec <= c - 3 for c in self.clip_marks) else 0.0
        nochat = 1 if self.chat_rate.n >= 30 and self.chat_rate.mean < 0.002 else 0
        return {"audio": r["audio"], "motion": r["motion"], "chat": chat, "emotes": emo, "viewer_clip": clip, "nochat": nochat}

    def step(self, now: float, cfg: dict) -> list[Moment]:
        """Avance jusqu'à (now - latence) et renvoie les moments terminés."""
        w, thr = cfg["weights"], cfg["detect_threshold"]
        lag = cfg.get("chat_lag", 5.0)
        horizon = int(now - lag - 7)
        if not self.raw:
            return []
        if self.cursor is None:
            self.cursor = min(self.raw)
        den = sum(w.get(k, 0) for k in BASE) + w.get("keywords", 0)
        kw_share = w.get("keywords", 0) / max(den, 1e-6)
        t_on = thr * (1 - 0.8 * kw_share)          # les mots-clés ne sont connus qu'après transcription
        t_off = t_on * 0.5
        out: list[Moment] = []
        while self.cursor <= horizon and self.cursor <= max(self.raw):
            sec = self.cursor
            self.cursor += 1
            sig = self._signals(sec, lag)
            sig["score"] = combine(sig, w)
            self.timeline[sec] = sig
            sm = sum(self.timeline.get(sec - i, sig)["score"] for i in range(3)) / 3
            sm = max(sm, sig["score"] * 0.8)
            sig["smooth"] = sm
            self.current = sm
            a = self.active
            if a is None:
                if sm >= t_on and sec >= self.last_end:
                    self.active = {"start": sec, "last_above": sec, "peak": sm, "peak_t": sec, "peaks": [sec], "vals": [sm]}
                continue
            a["vals"].append(sm)
            if sm > a["peak"]:
                a["peak"], a["peak_t"] = sm, sec
            if sm >= t_on:
                a["last_above"] = sec
                if sec - a["peaks"][-1] >= 3:
                    a["peaks"].append(sec)
            clip_start = max(a["start"] - cfg["context_before"], self.last_end)
            too_long = sec + 1.5 - clip_start >= cfg["max_duration"]
            if too_long or (sm < t_off and sec - a["last_above"] >= 3) or sec - a["last_above"] >= 6:
                end = min(a["last_above"] + 2.5, clip_start + cfg["max_duration"])
                # pic bref : on vise la durée idéale en gardant la réaction qui suit (déjà dans le buffer) puis plus de contexte avant
                target = min(cfg["max_duration"], max(cfg["min_duration"], cfg.get("ideal_min", 0)))
                if end - clip_start < target:
                    end = min(clip_start + target, max(end, sec + 6.0))
                    clip_start = max(self.last_end, end - target)
                if end - clip_start < cfg["min_duration"]:
                    end = clip_start + cfg["min_duration"]
                secs = range(int(a["start"]), int(a["last_above"]) + 1)
                sigs = {k: round(max((self.timeline.get(s, {}).get(k, 0) for s in secs), default=0.0), 3)
                        for k in BASE + ("viewer_clip", "nochat")}
                top = sorted(a["vals"], reverse=True)[:3]
                out.append(Moment(clip_start, end, a["peak_t"], round(sum(top) / len(top), 3), sigs,
                                  [p for p in a["peaks"] if clip_start <= p <= end]))
                self.last_end = end
                self.active = None
        self._gc(horizon)
        return out

    def force_from_clip(self, created_ts: float, cfg: dict) -> Moment | None:
        """Un viewer a créé un clip sur un passage non détecté : on force un moment autour du meilleur instant."""
        lo, hi = int(created_ts - 30), int(created_ts - 2)
        if lo < self.last_end - 2:
            return None
        secs = [s for s in range(lo, hi) if s in self.timeline]
        if len(secs) < 8:
            return None
        peak = max(secs, key=lambda s: self.timeline[s]["score"])
        dur = min(cfg["max_duration"], max(cfg["min_duration"], 20))
        start = max(lo, peak - dur * 0.6, self.last_end)
        end = start + dur
        sigs = {k: round(max(self.timeline[s].get(k, 0) for s in secs), 3) for k in BASE}
        sigs["viewer_clip"] = 1.0
        self.last_end = end
        return Moment(float(start), float(end), float(peak), round(combine(sigs, cfg["weights"]), 3), sigs, [peak], forced=True)

    def _gc(self, horizon: int) -> None:
        if len(self.timeline) > 900:
            for s in [s for s in self.timeline if s < horizon - 600]:
                del self.timeline[s]
        if len(self.raw) > 900:
            for s in [s for s in self.raw if s < horizon - 600]:
                del self.raw[s]

    def recent(self, n: int = 60) -> list[float]:
        if not self.timeline:
            return []
        last = max(self.timeline)
        return [round(self.timeline.get(s, {}).get("smooth", 0.0), 3) for s in range(last - n + 1, last + 1)]


def keyword_score(text: str, keywords: list[str]) -> tuple[float, list[str]]:
    t = " " + " ".join(text.lower().replace("’", "'").split()) + " "
    hits = [k for k in keywords if f" {k.lower()}" in t or k.lower() in t and len(k) > 5]
    excl = t.count("!") + t.count("?")
    return min(1.0, 0.4 * len(hits) + 0.05 * min(excl, 4)), hits
