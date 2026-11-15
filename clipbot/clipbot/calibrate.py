"""Calibrage : les 👍 / 👎 ajustent les poids de détection et les seuils."""
import math
import time

from . import db, settings

REASONS = {"pas_interessant": "Pas intéressant", "trop_long": "Trop long", "trop_court": "Trop court",
           "mauvais_cadrage": "Mauvais cadrage", "titre_nul": "Titre nul", "sous_titres": "Sous-titres ratés",
           "doublon": "Doublon", "autre": "Autre"}
SIGNALS = ("audio", "chat", "emotes", "keywords", "motion", "viewer_clip")


def feedback(clip_id: int, value: int, reason: str = "") -> dict:
    c = db.one("SELECT * FROM clips WHERE id=?", [clip_id])
    if not c:
        raise KeyError(clip_id)
    cfg = settings.all()
    w = dict(cfg["weights"])
    before = dict(w)
    sig = c["signals"] or {}
    changes: dict = {}
    if value != 0 and reason not in ("mauvais_cadrage", "titre_nul", "sous_titres", "trop_long", "trop_court", "doublon"):
        # pas de gradient si la raison ne concerne pas le choix du moment
        y = 1.0 if value > 0 else 0.0
        p = 1 / (1 + math.exp(-8 * ((c["score"] or 0) - cfg["detect_threshold"])))
        lr = cfg["calibration_lr"]
        for k in SIGNALS:
            w[k] = round(min(1.0, max(0.02, w.get(k, 0.1) + lr * (y - p) * (sig.get(k, 0) - 0.3))), 3)
        changes["weights"] = w
    if value < 0:
        if reason == "pas_interessant":
            changes["detect_threshold"] = round(min(0.85, cfg["detect_threshold"] + 0.01), 3)
            if (c["rating"] or 0) >= cfg["ai_threshold"] and cfg["ai_threshold"] < 9:
                n = db.val("SELECT COUNT(*) FROM calibration WHERE reason='pas_interessant' AND ts>?", [time.time() - 7 * 86400], 0)
                if n and n % 5 == 4:
                    changes["ai_threshold"] = cfg["ai_threshold"] + 1
        elif reason == "trop_long":
            changes["ideal_max"] = max(cfg["ideal_min"] + 3, cfg["ideal_max"] - 1)
            changes["max_duration"] = max(cfg["min_duration"] + 5, cfg["max_duration"] - 1)
        elif reason == "trop_court":
            changes["min_duration"] = min(cfg["max_duration"] - 5, cfg["min_duration"] + 1)
            changes["context_before"] = min(8.0, cfg["context_before"] + 0.5)
    notes = cfg["feedback_notes"]
    if c["title"]:
        if value > 0:
            notes["liked_titles"] = (notes.get("liked_titles", []) + [c["title"]])[-12:]
        elif reason == "titre_nul":
            notes["disliked_titles"] = (notes.get("disliked_titles", []) + [c["title"]])[-12:]
        changes["feedback_notes"] = notes
    settings.put(changes)
    db.clip_update(clip_id, feedback=value, feedback_reason=reason)
    db.insert("calibration", {"ts": time.time(), "clip_id": clip_id, "feedback": value, "reason": reason,
                              "details": {"before": before, "after": w, "signals": sig, "score": c["score"], "rating": c["rating"],
                                          "category": c["category"], "duration": c["duration"]}})
    return {"weights": w, "changes": {k: v for k, v in changes.items() if k != "feedback_notes"}}


def report() -> dict:
    rows = db.q("SELECT * FROM calibration ORDER BY ts")
    cfg = settings.all()
    likes = [r for r in rows if r["feedback"] > 0]
    dislikes = [r for r in rows if r["feedback"] < 0]
    reasons: dict = {}
    for r in dislikes:
        reasons[r["reason"] or "autre"] = reasons.get(r["reason"] or "autre", 0) + 1

    def avg(rs, k):
        v = [(r["details"] or {}).get("signals", {}).get(k, 0) for r in rs]
        return round(sum(v) / len(v), 3) if v else 0
    by_cat: dict = {}
    for r in rows:
        cat = (r["details"] or {}).get("category") or "?"
        d = by_cat.setdefault(cat, {"likes": 0, "dislikes": 0})
        d["likes" if r["feedback"] > 0 else "dislikes"] += 1
    first = (rows[0]["details"] or {}).get("before") if rows else None
    advice = []
    if len(rows) < 20:
        advice.append(f"Encore {20 - len(rows)} avis pour un calibrage fiable : note un maximum de clips.")
    if reasons.get("mauvais_cadrage", 0) >= 3:
        advice.append("Plusieurs cadrages jugés mauvais : vérifie la détection de facecam sur la fiche des streamers concernés.")
    if reasons.get("titre_nul", 0) >= 3:
        advice.append("Les titres refusés sont transmis à l'IA comme exemples à éviter.")
    if likes and dislikes:
        best = max(SIGNALS, key=lambda k: avg(likes, k) - avg(dislikes, k))
        advice.append(f"Le signal qui distingue le mieux tes clips aimés : « {best} ».")
    return {"total": len(rows), "likes": len(likes), "dislikes": len(dislikes),
            "approval": round(100 * len(likes) / len(rows)) if rows else None,
            "reasons": [{"reason": k, "label": REASONS.get(k, k), "n": v} for k, v in sorted(reasons.items(), key=lambda x: -x[1])],
            "signals": [{"signal": k, "liked": avg(likes, k), "disliked": avg(dislikes, k), "weight": cfg["weights"].get(k),
                         "initial": (first or settings.DEFAULTS["weights"]).get(k)} for k in SIGNALS],
            "by_category": by_cat, "weights": cfg["weights"], "detect_threshold": cfg["detect_threshold"],
            "ai_threshold": cfg["ai_threshold"], "advice": advice,
            "history": [{"ts": r["ts"], "feedback": r["feedback"], "reason": r["reason"], "clip_id": r["clip_id"]} for r in rows[-50:]]}


def reset() -> None:
    settings.put({k: settings.DEFAULTS[k] for k in ("weights", "detect_threshold", "ai_threshold", "min_duration", "max_duration",
                                                    "ideal_min", "ideal_max", "context_before")})
