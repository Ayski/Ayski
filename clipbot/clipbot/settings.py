"""Réglages : tout est modifiable depuis l'application. Secrets dans .env."""
import copy
import os
import threading
import time

from dotenv import dotenv_values

from . import db, paths

SECRET_KEYS = ["TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET", "ANTHROPIC_API_KEY", "TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"]

REACTION_TOKENS = ["KEKW", "OMEGALUL", "LUL", "LULW", "Pog", "PogChamp", "POGGERS", "PogU", "monkaS", "monkaW",
                   "CLIP", "clip", "???", "WTF", "OMG", "LMAO", "LOL", "MDR", "PTDR", "xD", "Jebaited", "D:",
                   "NOWAY", "HOLY", "W", "ICANT", "Sadge", "EZ", "GG"]

DEFAULTS: dict = {
    "game": "Grand Theft Auto V",
    "test_mode": True,                 # mode test : pas d'upload par défaut
    "test_upload": False,              # en mode test : upload seulement vers les comptes marqués « test »
    "running": False,
    "languages": ["fr", "en"],
    "viewer_thresholds": {"fr": 500, "en": 2000},
    "poll_minutes": 3,
    "max_streams": 0,                  # 0 = automatique selon le PC
    "buffer_seconds": 180,
    "stream_quality": "720p,720p60,480p,best",
    "clips_per_day_goal": 40,
    "min_duration": 10, "max_duration": 30, "ideal_min": 12, "ideal_max": 25,
    "context_before": 4.0,
    "weights": {"audio": 0.30, "chat": 0.25, "emotes": 0.20, "keywords": 0.15, "motion": 0.10, "viewer_clip": 0.50},
    "detect_threshold": 0.45,
    "chat_lag": 5.0,
    "reaction_tokens": REACTION_TOKENS,
    "keywords": {
        "fr": ["c'est pas possible", "mais non", "non non non", "oh putain", "attends", "quoi", "c'est quoi ça",
               "j'y crois pas", "oh là là", "incroyable", "c'est une blague", "wesh", "t'es sérieux", "je suis mort",
               "énorme", "oh merde", "cours", "il est fou", "regarde ça", "impossible"],
        "en": ["no way", "bro", "let's go", "what the", "oh my god", "holy", "are you kidding", "dude", "wait what",
               "i'm dead", "that's crazy", "insane", "run", "oh no", "what is that", "clip that", "no shot",
               "you're joking", "look at this", "oh my gosh"],
    },
    "ai_enabled": True,
    "ai_model": "claude-opus-5-5",
    "ai_threshold": 6,
    "ai_budget_day": 5.0, "ai_budget_month": 60.0,
    "ai_price_in": 4.0, "ai_price_out": 20.0,   # $ par million de tokens (modèle par défaut)
    "whisper_model": "auto",
    "export_quality": "high",          # draft | standard | high
    "encoder": "auto",
    "jump_cuts": True, "zooms": True, "opening_mode": "auto",   # auto | hook_text | cold_open | none
    "series_enabled": True, "series_min": 2, "series_max": 6, "series_gap_minutes": 45,
    "series_only": False,              # option : ne garder que les clips qui font partie d'une histoire en plusieurs épisodes
    "solo_min_rating": 9,              # … sauf moment exceptionnel isolé noté au moins ceci (11 = jamais)
    "series_follow_minutes": 4,        # histoire en cours : toutes les N minutes sans clip, l'IA regarde le meilleur passage (0 = désactivé)
    "series_upload_complete": True,    # une série n'est envoyée qu'une fois terminée, épisodes à la suite
    "series_boost": True,              # histoire en cours : détection plus sensible pour capter les épisodes suivants
    "cross_lang_min_rating": 8,
    "auto_adjust": False,
    "calibration_lr": 0.08,
    "keep_raw_hours": 24, "keep_rejected_hours": 2, "disk_min_gb": 5,
    "suggest_minutes": 30,
    "best_hours": {"fr": [12, 13, 18, 19, 20, 21, 22], "en": [15, 16, 17, 20, 21, 22, 23]},
    "feedback_notes": {"liked_titles": [], "disliked_titles": []},
    "trending_ai": True,
}

ACCOUNT_DEFAULTS: dict = {
    "clips_per_day": 10, "min_duration": 3, "max_duration": 120,   # par défaut, ce sont les durées de Production qui décident
    "categories": ["action", "drole", "rp", "fail", "reaction"],
    "fixed_hashtags": [],
    "sub_style": {"font": "Anton", "color": "#FFFFFF", "highlight": "#FFE600", "outline": "#000000",
                  "position": "middle", "size": 92, "uppercase": True},
    "title_style": {"font": "Poppins ExtraBold", "color": "#FFFFFF", "box": "#E11D48", "position": "top", "size": 70},
    "series": True, "cross_lang": False, "privacy": "SELF_ONLY",
    "min_gap_minutes": 20, "use_best_hours": False,
}

CATEGORIES = ["action", "drole", "rp", "fail", "reaction"]

_cache: dict | None = None
_cache_ts = 0.0
_lock = threading.Lock()


def _merge(base: dict, over: dict) -> dict:
    out = copy.deepcopy(base)
    for k, v in over.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict) and k not in ("keywords",):
            out[k] = _merge(out[k], v)
        else:
            out[k] = v
    return out


def all() -> dict:
    global _cache, _cache_ts
    with _lock:
        if _cache is None or time.time() - _cache_ts > 2:
            stored = {r["key"]: r["value"] for r in db.q("SELECT key,value FROM settings")}
            _cache = _merge(DEFAULTS, {k: v for k, v in stored.items() if k in DEFAULTS})
            _cache_ts = time.time()
        return copy.deepcopy(_cache)


def get(key: str, default=None):
    return all().get(key, default)


def put(values: dict) -> None:
    global _cache
    for k, v in values.items():
        if k in DEFAULTS:
            db.insert("settings", {"key": k, "value": db._enc(v) if isinstance(v, (dict, list)) else __import__("json").dumps(v)}, replace=True)
    with _lock:
        _cache = None


def raw_get(key: str, default=None):
    """Valeurs internes (mot de passe, état) hors réglages utilisateur."""
    r = db.one("SELECT value FROM settings WHERE key=?", [key])
    return default if r is None else r["value"]


def raw_put(key: str, value) -> None:
    db.insert("settings", {"key": key, "value": __import__("json").dumps(value)}, replace=True)


def account_settings(acc: dict) -> dict:
    return _merge(ACCOUNT_DEFAULTS, acc.get("settings") or {})


# ---------- secrets (.env) ----------
def secrets() -> dict:
    vals = dotenv_values(paths.ENV_FILE) if paths.ENV_FILE.exists() else {}
    return {k: (vals.get(k) or os.environ.get(k) or "") for k in SECRET_KEYS}


def secret(key: str) -> str:
    return secrets().get(key, "")


def set_secrets(values: dict) -> None:
    cur = dict(dotenv_values(paths.ENV_FILE)) if paths.ENV_FILE.exists() else {}
    for k, v in values.items():
        if k in SECRET_KEYS and v is not None:
            cur[k] = str(v).strip()
    lines = ["# Clés secrètes du bot — ne partage jamais ce fichier.\n"]
    lines += [f"{k}={v}\n" for k, v in cur.items() if v not in (None, "")]
    paths.ENV_FILE.write_text("".join(lines), encoding="utf-8")
    try:
        os.chmod(paths.ENV_FILE, 0o600)
    except OSError:
        pass


def secrets_status() -> dict:
    s = secrets()
    return {k: {"set": bool(v), "hint": (v[:4] + "…" + v[-2:]) if len(v) > 8 else ("•••" if v else "")} for k, v in s.items()}
