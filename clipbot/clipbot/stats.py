"""Statistiques TikTok (Display API) et recommandations automatiques."""
import time

from . import db, settings, tiktok
from .logbus import log, warn


def refresh_all() -> None:
    day = time.strftime("%Y-%m-%d")
    for acc in db.q("SELECT * FROM accounts WHERE connected=1"):
        try:
            prof = tiktok.refresh_profile(acc["id"])
            vids = tiktok.list_videos(acc["id"])
        except tiktok.TikTokError as e:
            warn("stats", f"Statistiques de {acc['name']} indisponibles : {e}")
            continue
        clips = db.q("SELECT id,description,title,video_id FROM clips WHERE account_id=? AND status IN ('uploaded_private','published')", [acc["id"]])
        total_views = 0
        for v in vids:
            vid = str(v["id"])
            text = (v.get("video_description") or v.get("title") or "").strip()
            clip_id = next((c["id"] for c in clips if c["video_id"] == vid), None)
            if clip_id is None and text:
                first = text.split("\n")[0][:60]
                clip_id = next((c["id"] for c in clips if (c["description"] or "").startswith(first) and len(first) > 8), None)
            prev = db.one("SELECT clip_id FROM tiktok_videos WHERE video_id=?", [vid])
            clip_id = clip_id or (prev or {}).get("clip_id")
            db.insert("tiktok_videos", {"video_id": vid, "account_id": acc["id"], "clip_id": clip_id, "title": text[:200],
                                        "cover": v.get("cover_image_url", ""), "share_url": v.get("share_url", ""),
                                        "create_time": v.get("create_time", 0), "duration": v.get("duration", 0),
                                        "views": v.get("view_count", 0), "likes": v.get("like_count", 0),
                                        "comments": v.get("comment_count", 0), "shares": v.get("share_count", 0),
                                        "updated_at": time.time()}, replace=True)
            db.insert("video_stats", {"day": day, "video_id": vid, "views": v.get("view_count", 0), "likes": v.get("like_count", 0),
                                      "comments": v.get("comment_count", 0), "shares": v.get("share_count", 0)}, replace=True)
            total_views += v.get("view_count", 0)
            if clip_id:
                db.ex("UPDATE clips SET video_id=?, status='published' WHERE id=? AND status='uploaded_private'", [vid, clip_id])
        db.insert("account_stats", {"day": day, "account_id": acc["id"], "followers": prof["followers"], "likes": prof["likes"],
                                    "videos": prof["videos"], "views": total_views}, replace=True)
    log("stats", "Statistiques TikTok mises à jour")


def _bucket(d: float) -> str:
    return "10-15 s" if d < 15 else "15-20 s" if d < 20 else "20-25 s" if d < 25 else "25 s et +"


def _group(rows: list[dict], key) -> list[dict]:
    g: dict = {}
    for r in rows:
        k = key(r)
        if k is None:
            continue
        d = g.setdefault(k, {"key": k, "videos": 0, "views": 0, "likes": 0, "comments": 0, "shares": 0})
        d["videos"] += 1
        for f in ("views", "likes", "comments", "shares"):
            d[f] += r[f] or 0
    out = list(g.values())
    for d in out:
        d["avg_views"] = round(d["views"] / d["videos"])
        d["engagement"] = round(100 * (d["likes"] + d["comments"] + d["shares"]) / d["views"], 2) if d["views"] else 0
    return sorted(out, key=lambda d: -d["avg_views"])


def account_stats(acc_id: int | None = None, days: int = 30) -> dict:
    where, args = ("WHERE v.account_id=?", [acc_id]) if acc_id else ("", [])
    rows = db.q("SELECT v.*, c.streamer, c.category, c.series_id, c.rating, c.duration AS clip_duration, c.title AS clip_title "
                f"FROM tiktok_videos v LEFT JOIN clips c ON c.id=v.clip_id {where}", args)
    for r in rows:
        r["hour"] = time.localtime(r["create_time"]).tm_hour if r["create_time"] else None
    since = time.strftime("%Y-%m-%d", time.localtime(time.time() - days * 86400))
    aw, aa = ("AND account_id=?", [acc_id]) if acc_id else ("", [])
    daily = db.q(f"SELECT day, SUM(followers) followers, SUM(likes) likes, SUM(videos) videos, SUM(views) views FROM account_stats "
                 f"WHERE day>=? {aw} GROUP BY day ORDER BY day", [since, *aa])
    for i in range(len(daily) - 1, 0, -1):
        daily[i]["new_views"] = max(0, (daily[i]["views"] or 0) - (daily[i - 1]["views"] or 0))
        daily[i]["new_followers"] = (daily[i]["followers"] or 0) - (daily[i - 1]["followers"] or 0)
    if daily:
        daily[0]["new_views"], daily[0]["new_followers"] = 0, 0
    weekly: dict = {}
    for d in daily:
        wk = time.strftime("%G-S%V", time.strptime(d["day"], "%Y-%m-%d"))
        w = weekly.setdefault(wk, {"week": wk, "new_views": 0, "new_followers": 0})
        w["new_views"] += d["new_views"]
        w["new_followers"] += d["new_followers"]
    totals = {f: sum(r[f] or 0 for r in rows) for f in ("views", "likes", "comments", "shares")}
    return {"totals": {**totals, "videos": len(rows)}, "daily": daily, "weekly": list(weekly.values()),
            "top": sorted(rows, key=lambda r: -(r["views"] or 0))[:10],
            "by_streamer": _group(rows, lambda r: r["streamer"]), "by_category": _group(rows, lambda r: r["category"]),
            "by_duration": _group(rows, lambda r: _bucket(r["clip_duration"] or r["duration"] or 0) if (r["clip_duration"] or r["duration"]) else None),
            "by_hour": _group(rows, lambda r: r["hour"]),
            "by_series": _group(rows, lambda r: ("Série" if r["series_id"] else "Clip isolé") if r["streamer"] else None)}


def compare() -> list[dict]:
    out = []
    for a in db.q("SELECT id,name,avatar,lang,followers,likes,videos,is_test,connected FROM accounts"):
        s = account_stats(a["id"])
        out.append({**a, "views": s["totals"]["views"], "tracked_videos": s["totals"]["videos"],
                    "avg_views": round(s["totals"]["views"] / s["totals"]["videos"]) if s["totals"]["videos"] else 0,
                    "engagement": round(100 * (s["totals"]["likes"] + s["totals"]["comments"] + s["totals"]["shares"]) / s["totals"]["views"], 2) if s["totals"]["views"] else 0})
    return out


def recommendations(acc_id: int) -> list[dict]:
    """Recommandations tirées des stats. Chaque entrée : {text, apply:{...}|None}."""
    s = account_stats(acc_id, 60)
    acc = db.one("SELECT * FROM accounts WHERE id=?", [acc_id])
    if not acc:
        return []
    aset = settings.account_settings(acc)
    recs = []
    n = s["totals"]["videos"]
    if n < 8:
        return [{"text": f"Pas encore assez de vidéos suivies ({n}/8) pour des recommandations fiables.", "apply": None}]
    overall = s["totals"]["views"] / n

    def solid(groups):
        return [g for g in groups if g["videos"] >= 3]
    dur = solid(s["by_duration"])
    if dur and dur[0]["avg_views"] > overall * 1.2:
        lo, hi = {"10-15 s": (10, 16), "15-20 s": (13, 21), "20-25 s": (18, 26), "25 s et +": (22, 32)}[dur[0]["key"]]
        recs.append({"text": f"Les clips de {dur[0]['key']} font {dur[0]['avg_views']} vues en moyenne (+{round(100 * (dur[0]['avg_views'] / overall - 1))} %) : viser {lo}-{hi} s.",
                     "apply": {"account": {"min_duration": lo, "max_duration": hi}}})
    cat = solid(s["by_category"])
    if len(cat) >= 2 and cat[-1]["avg_views"] < overall * 0.5 and len(aset["categories"]) > 2 and cat[-1]["key"] in aset["categories"]:
        recs.append({"text": f"La catégorie « {cat[-1]['key']} » sous-performe ({cat[-1]['avg_views']} vues en moyenne) : la retirer de ce compte.",
                     "apply": {"account": {"categories": [c for c in aset["categories"] if c != cat[-1]["key"]]}}})
    if cat and cat[0]["avg_views"] > overall * 1.3:
        recs.append({"text": f"La catégorie « {cat[0]['key']} » est la plus performante ({cat[0]['avg_views']} vues en moyenne).", "apply": None})
    hours = solid(s["by_hour"])
    if len(hours) >= 2:
        best = sorted(h["key"] for h in hours[: max(2, len(hours) // 2)])
        recs.append({"text": f"Meilleurs horaires de publication constatés : {', '.join(f'{h} h' for h in best)}.",
                     "apply": {"best_hours": {acc["lang"]: best}, "account": {"use_best_hours": True}}})
    ser = {g["key"]: g for g in s["by_series"]}
    if "Série" in ser and "Clip isolé" in ser and ser["Série"]["videos"] >= 3:
        better = ser["Série"]["avg_views"] > ser["Clip isolé"]["avg_views"]
        recs.append({"text": f"Les séries font {ser['Série']['avg_views']} vues en moyenne contre {ser['Clip isolé']['avg_views']} pour les clips isolés : "
                             + ("continuer les séries." if better else "privilégier les clips isolés."),
                     "apply": {"account": {"series": better}}})
    st = solid(s["by_streamer"])
    if st:
        recs.append({"text": f"Streamer le plus performant : {st[0]['key']} ({st[0]['avg_views']} vues en moyenne sur {st[0]['videos']} vidéos).", "apply": None})
    return recs or [{"text": "Aucune tendance nette pour l'instant : les réglages actuels sont cohérents avec les stats.", "apply": None}]


def apply_recommendations(acc_id: int | None = None) -> int:
    n = 0
    for acc in db.q("SELECT * FROM accounts WHERE connected=1" + (" AND id=?" if acc_id else ""), [acc_id] if acc_id else []):
        for r in recommendations(acc["id"]):
            ap = r.get("apply")
            if not ap:
                continue
            if "account" in ap:
                cur = db.one("SELECT settings FROM accounts WHERE id=?", [acc["id"]])["settings"] or {}
                if any(cur.get(k) != v for k, v in ap["account"].items()):
                    cur.update(ap["account"])
                    db.update("accounts", "id", acc["id"], {"settings": cur})
                    n += 1
            if "best_hours" in ap:
                bh = settings.get("best_hours")
                bh.update(ap["best_hours"])
                settings.put({"best_hours": bh})
    if n:
        log("stats", f"Ajustement automatique : {n} réglage(s) mis à jour d'après les statistiques")
    return n
