"""Journal et alertes, stockés en base pour l'application."""
import sys
import time

from . import db

_last_alert: dict[str, float] = {}


def log(module: str, msg: str, level: str = "info") -> None:
    try:
        db.insert("logs", {"ts": time.time(), "level": level, "module": module, "msg": str(msg)[:2000]})
    except Exception:
        pass
    try:
        print(f"[{time.strftime('%H:%M:%S')}] {level.upper():5} {module}: {msg}", file=sys.stderr, flush=True)
    except (UnicodeError, OSError):
        pass


def warn(module: str, msg: str) -> None:
    log(module, msg, "warn")


def error(module: str, msg: str) -> None:
    log(module, msg, "error")


def alert(kind: str, msg: str, cooldown: float = 600) -> None:
    """kind : stream_lost | upload_failed | tiktok_quota | disk_full | ai_budget | error"""
    key = f"{kind}:{msg[:60]}"
    if time.time() - _last_alert.get(key, 0) < cooldown:
        return
    _last_alert[key] = time.time()
    db.insert("alerts", {"ts": time.time(), "kind": kind, "msg": msg[:500]})
    log("alerte", f"{kind}: {msg}", "warn")


def prune(days: float = 7) -> None:
    db.ex("DELETE FROM logs WHERE ts<?", [time.time() - days * 86400])
    db.ex("DELETE FROM alerts WHERE ts<?", [time.time() - 30 * 86400])
