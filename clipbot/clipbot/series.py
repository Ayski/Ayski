"""Séries « L'aventure de [streamer] » : épisodes chronologiques, rappel, teaser, hashtag fixe."""
import time

from . import db, settings
from .ai import slug

DONE = ("uploaded_private", "published")


def open_series(streamer: str) -> list[dict]:
    rows = db.q("SELECT s.*, (SELECT COUNT(*) FROM clips c WHERE c.series_id=s.id AND c.status NOT IN ('rejected','deleted','failed')"
                " AND c.parent_id IS NULL) episodes FROM series s WHERE s.streamer=? AND s.status='open'", [streamer])
    return rows


def series_title(streamer: str, lang: str) -> str:
    return f"L'aventure de {streamer}" if lang == "fr" else f"{streamer}'s adventure"


def episode_label(lang: str, n: int) -> str:
    return f"Ép. {n}" if lang == "fr" else f"Ep. {n}"


def assign(clip: dict, streamer_row: dict, decision: dict | None, summary: str = "") -> tuple[int | None, int | None]:
    """Rattache le clip à une série (existante ou nouvelle) si l'IA l'a décidé. Renvoie (series_id, épisode)."""
    cfg = settings.all()
    if not decision or not decision.get("part_of_series") or not cfg["series_enabled"] or not streamer_row.get("series_enabled", 1):
        return None, None
    opened = {s["id"]: s for s in open_series(clip["streamer"])}
    sid = decision.get("existing_series_id")
    if sid in opened and opened[sid]["episodes"] < cfg["series_max"]:
        ep = opened[sid]["episodes"] + 1
        db.update("series", "id", sid, {"updated_at": time.time(), "summary": summary or opened[sid].get("summary")})
        if ep >= cfg["series_max"]:
            db.update("series", "id", sid, {"status": "closed"})
        return sid, ep
    n = db.val("SELECT COUNT(*) FROM series WHERE streamer=?", [clip["streamer"]], 0) + 1
    sid = db.insert("series", {"streamer": clip["streamer"], "title": series_title(streamer_row.get("display_name") or clip["streamer"], clip["lang"]),
                               "hashtag": f"aventure{slug(clip['streamer'])}{n if n > 1 else ''}", "lang": clip["lang"],
                               "status": "open", "summary": summary, "created_at": time.time(), "updated_at": time.time()})
    return sid, 1


def texts_for(clip: dict) -> dict:
    """Textes de série pour le montage et la description d'un clip."""
    if not clip.get("series_id"):
        return {}
    s = db.one("SELECT * FROM series WHERE id=?", [clip["series_id"]])
    if not s:
        return {}
    lang = clip.get("target_lang") or clip["lang"]
    total = db.val("SELECT MAX(episode) FROM clips WHERE series_id=? AND status NOT IN ('rejected','deleted','failed')", [s["id"]], 1)
    disp = s["title"].replace("L'aventure de ", "").replace("'s adventure", "")
    title = series_title(disp, lang)
    label = episode_label(lang, clip["episode"] or 1)
    has_next = (clip["episode"] or 1) < total
    teaser = ""
    if has_next:
        teaser = (f"La suite → {episode_label(lang, clip['episode'] + 1)}" if lang == "fr"
                  else f"Next → {episode_label(lang, clip['episode'] + 1)}")
    recap = (clip.get("ai") or {}).get("recap", "") if (clip["episode"] or 1) > 1 else ""
    if recap and not recap.lower().startswith(("précédemment", "previously")):
        recap = ("Précédemment : " if lang == "fr" else "Previously: ") + recap
    return {"video_title": f"{title} — {label}\n{clip.get('title') or ''}", "prefix": f"{title} — {label} :",
            "hashtag": s["hashtag"], "teaser": teaser, "recap": recap, "has_next": has_next, "total": total}


def maintain() -> list[int]:
    """Ferme les séries inactives ; une série restée à 1 épisode redevient un clip isolé.
    Renvoie les ids des clips à re-monter."""
    cfg = settings.all()
    redo: list[int] = []
    for s in db.q("SELECT * FROM series WHERE status='open'"):
        last = db.val("SELECT MAX(created_at) FROM clips WHERE series_id=?", [s["id"]], s["created_at"])
        live = db.val("SELECT is_live FROM streamers WHERE login=?", [s["streamer"]], 0)
        idle = time.time() - last
        if idle > cfg["series_gap_minutes"] * 60 and (not live or idle > 3 * 3600):
            db.update("series", "id", s["id"], {"status": "closed"})
            eps = db.q("SELECT id,status FROM clips WHERE series_id=? AND status NOT IN ('rejected','deleted','failed')", [s["id"]])
            if len({e["id"] for e in eps}) < max(2, cfg["series_min"]) and all(e["status"] not in DONE for e in eps):
                for e in eps:           # pas assez d'épisodes : clips isolés
                    db.clip_update(e["id"], series_id=None, episode=None)
                    redo.append(e["id"])
                db.update("series", "id", s["id"], {"status": "dissolved"})
    return redo


def can_upload(clip: dict) -> bool:
    """Ordre des uploads : l'épisode N attend que N-1 soit uploadé, et la série doit avoir au moins 2 épisodes."""
    if not clip.get("series_id"):
        return True
    s = db.one("SELECT status FROM series WHERE id=?", [clip["series_id"]])
    acc_clause = "AND account_id IS ?" if clip.get("account_id") is None else "AND account_id=?"
    total = db.val("SELECT COUNT(*) FROM clips WHERE series_id=? AND status NOT IN ('rejected','deleted','failed') "
                   f"{acc_clause}", [clip["series_id"], clip.get("account_id")], 0)
    if total < 2 and s and s["status"] == "open":
        return False
    prev = db.q("SELECT status FROM clips WHERE series_id=? AND episode<? AND status NOT IN ('rejected','deleted','failed') "
                f"{acc_clause}", [clip["series_id"], clip["episode"] or 1, clip.get("account_id")])
    return all(p["status"] in DONE for p in prev)


def overview() -> list[dict]:
    out = []
    best = settings.get("best_hours")
    for s in db.q("SELECT * FROM series WHERE status IN ('open','closed') ORDER BY updated_at DESC LIMIT 100"):
        eps = db.q("SELECT id,title,episode,status,rating,duration,thumb_path,account_id,created_at,target_lang,parent_id FROM clips "
                   "WHERE series_id=? AND status NOT IN ('rejected','deleted') ORDER BY episode, id", [s["id"]])
        if eps:
            out.append({**s, "episodes": eps, "best_hours": best.get(s["lang"], []),
                        "advice": "Publie les épisodes dans l'ordre, un par créneau conseillé, en laissant au moins 2 h entre deux épisodes."})
    return out
