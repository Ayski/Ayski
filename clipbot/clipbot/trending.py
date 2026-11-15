"""« Streamers qui percent » : suggestions recalculées à partir des relevés Twitch et de nos détections."""
import time

from . import ai, db, settings, twitch
from .chat import hub
from .logbus import log


def recompute(engine=None) -> int:
    cfg = settings.all()
    now = time.time()
    known = {r["login"]: r["status"] for r in db.q("SELECT login,status FROM streamers")}
    old = {r["login"]: r for r in db.q("SELECT * FROM suggestions")}
    rows = db.q("SELECT login, lang, COUNT(*) n, AVG(viewers) avg_v, MAX(viewers) max_v, MIN(ts) first_ts, MAX(ts) last_ts, "
                "COUNT(DISTINCT strftime('%Y-%m-%d', ts, 'unixepoch')) days FROM snapshots WHERE ts>? GROUP BY login", [now - 7 * 86400])
    cands = []
    for r in rows:
        if known.get(r["login"]) in ("target", "priority", "excluded") or r["n"] < 2:
            continue
        if old.get(r["login"], {}).get("status") == "ignored":
            continue
        recent = db.val("SELECT AVG(viewers) FROM snapshots WHERE login=? AND ts>?", [r["login"], now - 3600], 0) or 0
        before = db.val("SELECT AVG(viewers) FROM snapshots WHERE login=? AND ts<=? AND ts>?", [r["login"], now - 3600, now - 7 * 86400], 0) or 0
        if recent <= 0:
            continue                      # pas en direct en ce moment
        growth = (recent - before) / before if before > 20 else 0.0
        clips_n = db.val("SELECT COUNT(*) FROM viewer_clips WHERE streamer=? AND created_at>?", [r["login"], now - 86400], 0)
        m = db.one("SELECT AVG(score) s, COUNT(*) n, AVG(rating) r FROM clips WHERE streamer=? AND created_at>?", [r["login"], now - 7 * 86400])
        chat_rate = hub.rate(r["login"], 300) if engine and r["login"] in engine.workers else 0
        chat_per_1k = chat_rate / max(recent, 1) * 1000
        score = (40 * max(-0.5, min(growth, 2.0)) / 2 + 15 * min(r["days"], 7) / 7 + 15 * min(chat_per_1k, 60) / 60
                 + 15 * min(clips_n, 10) / 10 + 15 * (m["s"] or 0) + 5 * min(recent / max(cfg["viewer_thresholds"].get(r["lang"], 1000), 1), 2) / 2)
        details = {"viewers": int(recent), "growth_pct": round(growth * 100), "days_live_7d": r["days"], "max_viewers": r["max_v"],
                   "chat_per_min": round(chat_rate, 1), "viewer_clips_24h": clips_n, "avg_moment_score": round(m["s"] or 0, 2),
                   "moments_7d": m["n"], "avg_rating": round(m["r"], 1) if m["r"] else None}
        cands.append({"login": r["login"], "lang": r["lang"], "score": round(score, 1), "details": details, "viewers": int(recent)})
    cands.sort(key=lambda c: -c["score"])
    top = [c for lang in cfg["languages"] for c in [x for x in cands if x["lang"] == lang][:15]]
    # nombre de clips viewers pour les meilleurs candidats non surveillés (peu d'appels API)
    users = {u["login"]: u for u in twitch.users([c["login"] for c in top])} if top else {}
    for c in top[:16]:
        u = users.get(c["login"])
        if u and not c["details"]["viewer_clips_24h"]:
            try:
                n = len(twitch.clips(u["id"], now - 86400, 50))
                c["details"]["viewer_clips_24h"] = n
                c["score"] = round(c["score"] + 15 * min(n, 10) / 10, 1)
            except twitch.TwitchError:
                pass
    need = [c for c in top if not old.get(c["login"], {}).get("ai_reason") or now - old[c["login"]].get("updated_at", 0) > 6 * 3600]
    reasons = ai.explain_trending(need[:12]) if need else {}
    keep = set()
    for c in top:
        u = users.get(c["login"], {})
        o = old.get(c["login"], {})
        d = c["details"]
        default = (f"{d['viewers']} viewers ({d['growth_pct']:+d} % vs sa moyenne), en live {d['days_live_7d']} j/7, "
                   f"{d['viewer_clips_24h']} clips viewers en 24 h.")
        db.insert("suggestions", {"login": c["login"], "display_name": u.get("display_name", c["login"]),
                                  "avatar": u.get("profile_image_url", o.get("avatar", "")), "lang": c["lang"], "score": c["score"],
                                  "details": d, "ai_reason": reasons.get(c["login"]) or o.get("ai_reason") or default,
                                  "status": "new", "viewers": c["viewers"], "updated_at": now}, replace=True)
        keep.add(c["login"])
    for login, o in old.items():
        if login not in keep and o["status"] == "new":
            db.ex("DELETE FROM suggestions WHERE login=?", [login])
    log("tendances", f"Suggestions recalculées : {len(top)} streamers")
    return len(top)
