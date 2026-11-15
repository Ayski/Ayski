"""Application de contrôle : API JSON + interface web (PWA), protégée par mot de passe."""
import hashlib
import hmac
import json
import re
import secrets as pysecrets
import time
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from fastapi import Body, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

from .. import ai, calibrate, db, paths, series, settings, stats, subtitles, sysinfo, tiktok, trending, twitch
from ..logbus import log
from ..pipeline import engine

COOKIE = "clipbot_session"
SESSION_DAYS = 30
OPEN_PATHS = {"/api/auth/state", "/api/auth/setup", "/api/auth/login", "/api/tiktok/callback", "/callback/", "/callback"}
_fails: dict[str, list[float]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    await run_in_threadpool(engine.start)
    yield
    await run_in_threadpool(engine.shutdown)


app = FastAPI(title="ClipBot", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)


# ------------------------------------------------------------------ authentification
def _hash(pw: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), 200_000).hex()


def _has_password() -> bool:
    return bool(settings.raw_get("auth"))


def _session_ok(request: Request) -> bool:
    tok = request.cookies.get(COOKIE)
    if not tok:
        return False
    return bool(db.one("SELECT token FROM sessions WHERE token=? AND expires_at>?", [hashlib.sha256(tok.encode()).hexdigest(), time.time()]))


def _new_session(resp: Response) -> None:
    tok = pysecrets.token_urlsafe(32)
    db.insert("sessions", {"token": hashlib.sha256(tok.encode()).hexdigest(), "created_at": time.time(),
                           "expires_at": time.time() + SESSION_DAYS * 86400})
    resp.set_cookie(COOKIE, tok, max_age=SESSION_DAYS * 86400, httponly=True, samesite="lax")


@app.middleware("http")
async def guard(request: Request, call_next):
    p = request.url.path
    if request.method not in ("GET", "HEAD", "OPTIONS"):
        origin = request.headers.get("origin")
        if origin and urlparse(origin).netloc != request.headers.get("host"):
            return JSONResponse({"detail": "Origine refusée"}, 403)
    if (p.startswith("/api/") or p.startswith("/media/")) and p not in OPEN_PATHS and not _session_ok(request):
        return JSONResponse({"detail": "Connexion requise"}, 401)
    resp = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "same-origin"
    if p.startswith("/api/"):
        resp.headers["Cache-Control"] = "no-store"
    return resp


@app.get("/api/auth/state")
def auth_state(request: Request):
    return {"setup_needed": not _has_password(), "logged_in": _session_ok(request)}


@app.post("/api/auth/setup")
def auth_setup(body: dict = Body(...)):
    if _has_password():
        raise HTTPException(403, "Un mot de passe existe déjà")
    pw = str(body.get("password", ""))
    if len(pw) < 6:
        raise HTTPException(400, "Mot de passe trop court (6 caractères minimum)")
    salt = pysecrets.token_hex(16)
    settings.raw_put("auth", {"salt": salt, "hash": _hash(pw, salt)})
    resp = JSONResponse({"ok": True})
    _new_session(resp)
    log("système", "Mot de passe de l'application créé")
    return resp


@app.post("/api/auth/login")
def auth_login(request: Request, body: dict = Body(...)):
    ip = request.client.host if request.client else "?"
    recent = [t for t in _fails.get(ip, []) if time.time() - t < 600]
    if len(recent) >= 8:
        raise HTTPException(429, "Trop d'essais : réessaie dans 10 minutes")
    a = settings.raw_get("auth")
    if not a or not hmac.compare_digest(_hash(str(body.get("password", "")), a["salt"]), a["hash"]):
        _fails[ip] = recent + [time.time()]
        raise HTTPException(401, "Mot de passe incorrect")
    _fails.pop(ip, None)
    resp = JSONResponse({"ok": True})
    _new_session(resp)
    return resp


@app.post("/api/auth/logout")
def auth_logout(request: Request):
    tok = request.cookies.get(COOKIE, "")
    db.ex("DELETE FROM sessions WHERE token=?", [hashlib.sha256(tok.encode()).hexdigest()])
    resp = JSONResponse({"ok": True})
    resp.delete_cookie(COOKIE)
    return resp


@app.post("/api/auth/password")
def auth_password(body: dict = Body(...)):
    a = settings.raw_get("auth")
    if not hmac.compare_digest(_hash(str(body.get("old", "")), a["salt"]), a["hash"]):
        raise HTTPException(401, "Ancien mot de passe incorrect")
    if len(str(body.get("new", ""))) < 6:
        raise HTTPException(400, "Mot de passe trop court (6 caractères minimum)")
    salt = pysecrets.token_hex(16)
    settings.raw_put("auth", {"salt": salt, "hash": _hash(str(body["new"]), salt)})
    db.ex("DELETE FROM sessions")
    return {"ok": True}


# ------------------------------------------------------------------ production
@app.get("/api/status")
def status():
    return engine.status()


@app.get("/api/live")
def live():
    return {"streams": engine.live(), "status": engine.status()}


@app.post("/api/run")
def run(body: dict = Body(...)):
    engine.set_running(bool(body.get("running")))
    return engine.status()


@app.get("/api/test")
def test_list():
    return {"tests": list(engine.test_state.values())}


@app.post("/api/test")
def test_add(body: dict = Body(...)):
    src = str(body.get("source", "")).strip()
    if not src:
        raise HTTPException(400, "Indique un lien de VOD/clip Twitch ou le chemin d'un fichier vidéo")
    lang = body.get("lang") if body.get("lang") in ("fr", "en") else "fr"
    return {"login": engine.add_test(src, lang, int(body.get("minutes", 15)))}


@app.delete("/api/test/{login}")
def test_remove(login: str):
    engine.remove_test(login)
    return {"ok": True}


@app.get("/api/settings")
def get_settings():
    return {"settings": settings.all(), "defaults": settings.DEFAULTS, "recommend": sysinfo.recommend(),
            "models": ai.MODELS, "categories": settings.CATEGORIES, "fonts": subtitles.FONTS,
            "account_defaults": settings.ACCOUNT_DEFAULTS, "reasons": calibrate.REASONS}


@app.put("/api/settings")
def put_settings(body: dict = Body(...)):
    bad = [k for k in body if k not in settings.DEFAULTS]
    if bad:
        raise HTTPException(400, f"Réglage inconnu : {bad[0]}")
    for k, v in body.items():
        d = settings.DEFAULTS[k]
        if isinstance(d, bool) != isinstance(v, bool) or (isinstance(d, (int, float)) and not isinstance(d, bool) and not isinstance(v, (int, float))) \
                or (isinstance(d, (dict, list, str)) and not isinstance(v, type(d))):
            raise HTTPException(400, f"Valeur invalide pour {k}")
    if "min_duration" in body or "max_duration" in body:
        cur = settings.all()
        lo, hi = body.get("min_duration", cur["min_duration"]), body.get("max_duration", cur["max_duration"])
        if not (3 <= lo < hi <= 120):
            raise HTTPException(400, "Durées invalides : il faut 3 ≤ min < max ≤ 120 s")
    settings.put(body)
    if {"game", "languages", "viewer_thresholds", "max_streams", "running"} & set(body):
        engine.refresh()
    return {"settings": settings.all()}


# ------------------------------------------------------------------ streamers
def _streamer_public(r: dict) -> dict:
    r = dict(r)
    r.pop("facecam", None)
    return r


@app.get("/api/streamers")
def streamers():
    rows = db.q("SELECT s.*, (SELECT COUNT(*) FROM clips c WHERE c.streamer=s.login AND c.status IN ('ready','queued','uploading','uploaded_private','published')) clips, "
                "(SELECT ROUND(AVG(rating),1) FROM clips c WHERE c.streamer=s.login AND rating IS NOT NULL) avg_rating "
                "FROM streamers s ORDER BY CASE status WHEN 'priority' THEN 0 WHEN 'target' THEN 1 WHEN 'auto' THEN 2 ELSE 3 END, is_live DESC, viewers DESC")
    mon = set(engine.workers)
    return [{**_streamer_public(r), "monitored": r["login"] in mon} for r in rows]


@app.post("/api/streamers")
def add_streamer(body: dict = Body(...)):
    try:
        info = twitch.lookup_streamer(str(body.get("url", "")))
    except twitch.TwitchError as e:
        raise HTTPException(400, str(e))
    status_ = body.get("status") if body.get("status") in ("target", "priority", "excluded") else "target"
    now = time.time()
    if db.one("SELECT login FROM streamers WHERE login=?", [info["login"]]):
        db.update("streamers", "login", info["login"], {**info, "status": status_, "updated_at": now})
    else:
        db.insert("streamers", {**info, "status": status_, "added_at": now, "updated_at": now})
    db.ex("UPDATE suggestions SET status='targeted' WHERE login=?", [info["login"]])
    engine.refresh()
    log("streamers", f"{info['display_name']} ajouté ({status_})")
    return _streamer_public(db.one("SELECT * FROM streamers WHERE login=?", [info["login"]]))


@app.put("/api/streamers/{login}")
def edit_streamer(login: str, body: dict = Body(...)):
    if not db.one("SELECT login FROM streamers WHERE login=?", [login]):
        raise HTTPException(404, "Streamer inconnu")
    allowed = {"status", "lang", "account_id", "interest_threshold", "max_clips_day", "series_enabled"}
    upd = {k: v for k, v in body.items() if k in allowed}
    if "status" in upd and upd["status"] not in ("target", "priority", "excluded", "auto"):
        raise HTTPException(400, "Statut invalide")
    db.update("streamers", "login", login, {**upd, "updated_at": time.time()})
    engine.refresh()
    return _streamer_public(db.one("SELECT * FROM streamers WHERE login=?", [login]))


@app.delete("/api/streamers/{login}")
def del_streamer(login: str):
    db.ex("DELETE FROM streamers WHERE login=?", [login])
    engine.refresh()
    return {"ok": True}


@app.post("/api/streamers/{login}/refresh")
def refresh_streamer(login: str):
    try:
        info = twitch.lookup_streamer(login)
    except twitch.TwitchError as e:
        raise HTTPException(400, str(e))
    info.pop("lang", None)
    db.update("streamers", "login", login, {**info, "updated_at": time.time()})
    return _streamer_public(db.one("SELECT * FROM streamers WHERE login=?", [login]))


@app.get("/api/streamers/{login}")
def streamer_detail(login: str):
    s = db.one("SELECT * FROM streamers WHERE login=?", [login])
    if not s:
        raise HTTPException(404, "Streamer inconnu")
    clips = db.q("SELECT id,title,status,rating,category,duration,created_at,series_id,episode,account_id,score FROM clips "
                 "WHERE streamer=? AND status!='deleted' ORDER BY id DESC LIMIT 100", [login])
    ser = [x for x in series.overview() if x["streamer"] == login]
    perf = db.one("SELECT COUNT(*) videos, SUM(v.views) views, SUM(v.likes) likes, SUM(v.comments) comments, SUM(v.shares) shares "
                  "FROM tiktok_videos v JOIN clips c ON c.id=v.clip_id WHERE c.streamer=?", [login])
    top = db.q("SELECT v.video_id,v.title,v.views,v.likes,v.share_url,c.id clip_id FROM tiktok_videos v JOIN clips c ON c.id=v.clip_id "
               "WHERE c.streamer=? ORDER BY v.views DESC LIMIT 5", [login])
    return {"streamer": _streamer_public(s), "monitored": login in engine.workers, "clips": clips, "series": ser,
            "performance": {**perf, "top": top}, "memory": s.get("memory") or {},
            "facecam": (s.get("facecam") or {}).get("rect") if isinstance(s.get("facecam"), dict) else None,
            "viewer_clips_24h": db.val("SELECT COUNT(*) FROM viewer_clips WHERE streamer=? AND created_at>?", [login, time.time() - 86400], 0)}


@app.get("/api/suggestions")
def suggestions(lang: str = ""):
    rows = db.q("SELECT * FROM suggestions WHERE status='new'" + (" AND lang=?" if lang else "") + " ORDER BY score DESC", [lang] if lang else [])
    return {"suggestions": rows, "updated_at": engine.last_suggest, "twitch_ready": twitch.configured()}


@app.post("/api/suggestions/refresh")
def suggestions_refresh():
    try:
        n = trending.recompute(engine)
    except twitch.TwitchError as e:
        raise HTTPException(400, str(e))
    engine.last_suggest = time.time()
    return {"count": n}


@app.post("/api/suggestions/{login}")
def suggestion_action(login: str, body: dict = Body(...)):
    if body.get("action") == "target":
        return add_streamer({"url": login, "status": "target"})
    db.ex("UPDATE suggestions SET status='ignored' WHERE login=?", [login])
    return {"ok": True}


# ------------------------------------------------------------------ comptes TikTok
def _account_public(a: dict) -> dict:
    a = dict(a)
    for k in ("access_token", "refresh_token", "open_id"):
        a.pop(k, None)
    a["settings"] = settings.account_settings(a)
    a["uploaded_today"] = db.val("SELECT COUNT(*) FROM clips WHERE account_id=? AND uploaded_at>=?", [a["id"], time.time() - 86400], 0)
    a["queued"] = db.val("SELECT COUNT(*) FROM clips WHERE account_id=? AND status='queued'", [a["id"]], 0)
    return a


@app.get("/api/accounts")
def accounts():
    return {"accounts": [_account_public(a) for a in db.q("SELECT * FROM accounts ORDER BY id")],
            "tiktok_ready": tiktok.configured()}


@app.put("/api/accounts/{acc_id}")
def edit_account(acc_id: int, body: dict = Body(...)):
    a = db.one("SELECT * FROM accounts WHERE id=?", [acc_id])
    if not a:
        raise HTTPException(404, "Compte inconnu")
    upd = {k: body[k] for k in ("lang", "is_test", "name") if k in body}
    if "settings" in body:
        s = settings._merge(a["settings"] or {}, {k: v for k, v in body["settings"].items() if k in settings.ACCOUNT_DEFAULTS})
        if s.get("privacy") not in (None, "SELF_ONLY", "INBOX", "PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR"):
            raise HTTPException(400, "Visibilité invalide")
        upd["settings"] = s
    db.update("accounts", "id", acc_id, upd)
    return _account_public(db.one("SELECT * FROM accounts WHERE id=?", [acc_id]))


@app.delete("/api/accounts/{acc_id}")
def del_account(acc_id: int, forget: int = 0):
    tiktok.disconnect(acc_id)
    if forget:
        db.ex("DELETE FROM accounts WHERE id=?", [acc_id])
        db.ex("UPDATE clips SET account_id=NULL WHERE account_id=?", [acc_id])
        db.ex("UPDATE streamers SET account_id=NULL WHERE account_id=?", [acc_id])
    return {"ok": True}


def _redirect_uri(request: Request) -> str:
    port = request.url.port or 8080
    return f"http://localhost:{port}/callback/"       # format recommandé par TikTok pour les apps « Desktop »


@app.get("/api/tiktok/connect")
def tiktok_connect(request: Request):
    try:
        return {"url": tiktok.auth_url(_redirect_uri(request)), "redirect_uri": _redirect_uri(request)}
    except tiktok.TikTokError as e:
        raise HTTPException(400, str(e))


@app.get("/callback")
@app.get("/callback/")
@app.get("/api/tiktok/callback")
def tiktok_callback(code: str = "", state: str = "", error: str = "", error_description: str = ""):
    if error or not code:
        return RedirectResponse(f"/#/comptes?erreur={error_description or error or 'connexion annulée'}")
    try:
        tiktok.finish_auth(code, state)
    except tiktok.TikTokError as e:
        return RedirectResponse(f"/#/comptes?erreur={e}")
    return RedirectResponse("/#/comptes?ok=1")


@app.post("/api/tiktok/manual")
def tiktok_manual(body: dict = Body(...)):
    """Secours : coller l'adresse de la page sur laquelle TikTok a renvoyé après l'autorisation."""
    qs = parse_qs(urlparse(str(body.get("url", ""))).query)
    if "code" not in qs or "state" not in qs:
        raise HTTPException(400, "Adresse invalide : elle doit contenir « code= » et « state= »")
    try:
        return _account_public(tiktok.finish_auth(qs["code"][0], qs["state"][0]))
    except tiktok.TikTokError as e:
        raise HTTPException(400, str(e))


@app.get("/api/stats")
def all_stats(account: int = 0, days: int = 30):
    return {"stats": stats.account_stats(account or None, days), "compare": stats.compare(), "updated_at": engine.last_stats}


@app.post("/api/stats/refresh")
def stats_refresh():
    stats.refresh_all()
    engine.last_stats = time.time()
    return {"ok": True}


@app.get("/api/accounts/{acc_id}/recommendations")
def recs(acc_id: int):
    return {"recommendations": stats.recommendations(acc_id), "auto_adjust": settings.get("auto_adjust")}


@app.post("/api/accounts/{acc_id}/recommendations/apply")
def recs_apply(acc_id: int):
    return {"applied": stats.apply_recommendations(acc_id)}


# ------------------------------------------------------------------ clips
CLIP_LIST = ("id,streamer,lang,created_at,duration,status,score,rating,category,title,hook,description,hashtags,series_id,episode,"
             "account_id,target_lang,parent_id,feedback,feedback_reason,error,uploaded_at,updated_at,video_id,signals,force_upload,"
             "(raw_path IS NOT NULL) AS can_reedit")


@app.get("/api/clips")
def clips(streamer: str = "", account: int = 0, status: str = "", category: str = "", min_rating: float = 0,
          q: str = "", limit: int = 60, offset: int = 0, rejected: int = 0):
    where, args = ["status!='deleted'"], []
    if streamer:
        where.append("streamer=?"); args.append(streamer)
    if account:
        where.append("account_id=?"); args.append(account)
    if status == "en_montage":
        where.append("status IN ('detected','transcribing','analyzing','editing')")
    elif status:
        where.append("status=?"); args.append(status)
    elif not rejected:
        where.append("status NOT IN ('rejected','failed')")
    if category:
        where.append("category=?"); args.append(category)
    if min_rating:
        where.append("rating>=?"); args.append(min_rating)
    if q:
        where.append("(title LIKE ? OR description LIKE ? OR streamer LIKE ?)"); args += [f"%{q}%"] * 3
    w = " AND ".join(where)
    rows = db.q(f"SELECT {CLIP_LIST} FROM clips WHERE {w} ORDER BY id DESC LIMIT ? OFFSET ?", [*args, min(limit, 200), offset])
    counts = {r["status"]: r["n"] for r in db.q("SELECT status, COUNT(*) n FROM clips WHERE status!='deleted' GROUP BY status")}
    return {"clips": rows, "total": db.val(f"SELECT COUNT(*) FROM clips WHERE {w}", args, 0), "counts": counts,
            "streamers": [r["streamer"] for r in db.q("SELECT DISTINCT streamer FROM clips WHERE status!='deleted' ORDER BY streamer")]}


def _clip(clip_id: int) -> dict:
    c = db.one("SELECT * FROM clips WHERE id=?", [clip_id])
    if not c or c["status"] == "deleted":
        raise HTTPException(404, "Clip introuvable")
    return c


@app.get("/api/clips/{clip_id}")
def clip_detail(clip_id: int):
    c = _clip(clip_id)
    c["can_reedit"] = bool(c["raw_path"] and Path(c["raw_path"]).exists())
    c["transcript_text"] = (c.get("transcript") or {}).get("text", "")
    c.pop("transcript", None)
    c["series"] = db.one("SELECT * FROM series WHERE id=?", [c["series_id"]]) if c["series_id"] else None
    c["tiktok"] = db.one("SELECT * FROM tiktok_videos WHERE clip_id=?", [clip_id])
    return c


@app.put("/api/clips/{clip_id}")
def clip_edit(clip_id: int, body: dict = Body(...)):
    c = _clip(clip_id)
    upd, needs = {}, False
    for k in ("title", "hook"):
        if k in body and str(body[k]).strip() != (c[k] or ""):
            upd[k] = str(body[k]).strip()[:120]
            needs = True
    if "account_id" in body:
        upd["account_id"] = body["account_id"] or None
    desc = str(body["description"]).strip() if "description" in body else c["description"] or ""
    if "hashtags" in body:
        tags = [ai.slug(str(t)) for t in body["hashtags"] if ai.slug(str(t))][:6]
        lines = [l for l in desc.split("\n") if not l.strip().startswith("#")]
        desc = "\n".join(lines + [" ".join("#" + t for t in tags)])
    if "description" in body or "hashtags" in body:
        credit = f"twitch.tv/{c['streamer']}"
        if credit not in desc:                       # le crédit du streamer est obligatoire
            lines = desc.split("\n")
            desc = "\n".join(lines[:1] + [f"🎥 {credit}"] + lines[1:])
        found = re.findall(r"#([\w]+)", desc)
        for extra in found[6:]:
            desc = desc.replace(f"#{extra}", "", 1)
        upd["description"] = desc.strip()[:2200]
        upd["hashtags"] = found[:6]
    db.clip_update(clip_id, **upd)
    c = _clip(clip_id)
    if c["final_path"] and "description" in upd:
        try:
            Path(c["final_path"]).with_suffix(".txt").write_text(c["description"], encoding="utf-8")
        except OSError:
            pass
    return {"clip": clip_detail(clip_id), "needs_reedit": needs and bool(c["raw_path"])}


def _need_raw(c: dict) -> None:
    if not c["raw_path"] or not Path(c["raw_path"]).exists():
        raise HTTPException(400, "L'extrait brut a été nettoyé : ce clip ne peut plus être re-monté.")
    if c["status"] in ("uploading",):
        raise HTTPException(400, "Clip en cours d'upload")


@app.post("/api/clips/{clip_id}/regenerate")
def clip_regen(clip_id: int):
    c = _clip(clip_id)
    _need_raw(c)
    ok, why = ai.available()
    if not ok:
        raise HTTPException(400, f"IA indisponible : {why}")
    engine.reanalyze(clip_id)
    return {"ok": True}


@app.post("/api/clips/{clip_id}/reedit")
def clip_reedit(clip_id: int):
    _need_raw(_clip(clip_id))
    engine.reedit(clip_id)
    return {"ok": True}


@app.post("/api/clips/{clip_id}/upload")
def clip_upload(clip_id: int, body: dict = Body(default={})):
    c = _clip(clip_id)
    if c["status"] not in ("ready", "queued", "failed") or not c["final_path"]:
        raise HTTPException(400, "Ce clip n'est pas prêt à être envoyé")
    acc_id = body.get("account_id") or c["account_id"]
    acc = db.one("SELECT * FROM accounts WHERE id=? AND connected=1", [acc_id]) if acc_id else None
    if not acc:
        raise HTTPException(400, "Choisis d'abord un compte TikTok connecté pour ce clip")
    db.clip_update(clip_id, account_id=acc["id"], status="queued", force_upload=1, next_try_at=0, retries=0, error=None)
    return {"ok": True}


@app.post("/api/clips/{clip_id}/feedback")
def clip_feedback(clip_id: int, body: dict = Body(...)):
    _clip(clip_id)
    v = int(body.get("value", 0))
    if v not in (-1, 0, 1):
        raise HTTPException(400, "Avis invalide")
    reason = str(body.get("reason", ""))
    if reason and reason not in calibrate.REASONS:
        raise HTTPException(400, "Raison inconnue")
    res = calibrate.feedback(clip_id, v, reason)
    if v < 0:
        db.ex("UPDATE clips SET status='ready' WHERE id=? AND status='queued' AND force_upload=0", [clip_id])
    return res


@app.delete("/api/clips/{clip_id}")
def clip_delete(clip_id: int):
    c = _clip(clip_id)
    if c["status"] == "uploading":
        raise HTTPException(400, "Clip en cours d'upload")
    try:
        for p in (c["final_path"], c["thumb_path"]):
            if p:
                Path(p).unlink(missing_ok=True)
        if c["final_path"]:
            Path(c["final_path"]).with_suffix(".txt").unlink(missing_ok=True)
    except OSError:
        raise HTTPException(409, "Le fichier est ouvert ailleurs (lecteur vidéo ?). Ferme-le puis réessaie.")
    db.clip_update(clip_id, status="deleted", final_path=None, thumb_path=None)
    return {"ok": True}


@app.get("/api/series")
def series_list():
    return {"series": series.overview(), "best_hours": settings.get("best_hours")}


@app.get("/api/calibration")
def calibration():
    return calibrate.report()


@app.post("/api/calibration/reset")
def calibration_reset():
    calibrate.reset()
    return calibrate.report()


@app.get("/media/clip/{clip_id}")
def media_clip(clip_id: int, download: int = 0):
    c = _clip(clip_id)
    if not c["final_path"] or not Path(c["final_path"]).exists():
        raise HTTPException(404, "Vidéo indisponible")
    return FileResponse(c["final_path"], media_type="video/mp4",
                        filename=Path(c["final_path"]).name if download else None)


@app.get("/media/thumb/{clip_id}")
def media_thumb(clip_id: int):
    p = paths.THUMBS / f"{clip_id}.jpg"
    if not p.exists():
        raise HTTPException(404, "Miniature indisponible")
    return FileResponse(p, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=60"})


# ------------------------------------------------------------------ système
@app.get("/api/system")
def system(request: Request):
    port = request.url.port or 8080
    return {"info": sysinfo.static_info(), "live": sysinfo.live_info(), "recommend": sysinfo.recommend(),
            "costs": ai.costs(), "autostart": sysinfo.autostart_enabled(),
            "urls": {"local": f"http://localhost:{port}", "phone": f"http://{sysinfo.lan_ip()}:{port}"},
            "secrets": settings.secrets_status(), "data_dir": str(paths.DATA), "clips_dir": str(paths.CLIPS)}


@app.post("/api/system/autostart")
def autostart(body: dict = Body(...)):
    try:
        return {"autostart": sysinfo.set_autostart(bool(body.get("enabled")))}
    except OSError as e:
        raise HTTPException(500, f"Impossible de modifier le démarrage automatique : {e}")


@app.get("/api/logs")
def logs(level: str = "", module: str = "", q: str = "", limit: int = 200, before: int = 0):
    where, args = ["1=1"], []
    if level:
        where.append("level=?"); args.append(level)
    if module:
        where.append("module=?"); args.append(module)
    if q:
        where.append("msg LIKE ?"); args.append(f"%{q}%")
    if before:
        where.append("id<?"); args.append(before)
    rows = db.q(f"SELECT * FROM logs WHERE {' AND '.join(where)} ORDER BY id DESC LIMIT ?", [*args, min(limit, 1000)])
    return {"logs": rows, "modules": [r["module"] for r in db.q("SELECT DISTINCT module FROM logs ORDER BY module")]}


@app.get("/api/alerts")
def alerts():
    return {"alerts": db.q("SELECT * FROM alerts ORDER BY id DESC LIMIT 100")}


@app.post("/api/alerts/read")
def alerts_read():
    db.ex("UPDATE alerts SET read=1")
    return {"ok": True}


@app.get("/api/secrets")
def get_secrets():
    return settings.secrets_status()


@app.put("/api/secrets")
def put_secrets(body: dict = Body(...)):
    settings.set_secrets({k: v for k, v in body.items() if k in settings.SECRET_KEYS and isinstance(v, str)})
    engine.refresh()
    return settings.secrets_status()


@app.post("/api/secrets/test/{service}")
def test_secret(service: str):
    try:
        if service == "twitch":
            twitch.test_keys()
        elif service == "anthropic":
            ai.test_key()
        elif service == "tiktok":
            if not tiktok.configured():
                raise RuntimeError("Clés TikTok manquantes")
        else:
            raise HTTPException(404, "Service inconnu")
    except (twitch.TwitchError, RuntimeError) as e:
        raise HTTPException(400, str(e))
    return {"ok": True}


@app.get("/api/config/export")
def config_export():
    data = {"version": 1, "exported_at": time.time(), "settings": {k: v for k, v in settings.all().items() if k != "running"},
            "streamers": db.q("SELECT login,user_id,display_name,avatar,lang,followers,status,interest_threshold,max_clips_day,series_enabled,memory FROM streamers WHERE status!='auto'"),
            "accounts": [{"name": a["name"], "lang": a["lang"], "is_test": a["is_test"], "settings": a["settings"]}
                         for a in db.q("SELECT name,lang,is_test,settings FROM accounts")],
            "ignored_suggestions": [r["login"] for r in db.q("SELECT login FROM suggestions WHERE status='ignored'")]}
    return Response(json.dumps(data, ensure_ascii=False, indent=2), media_type="application/json",
                    headers={"Content-Disposition": f"attachment; filename=clipbot-config-{time.strftime('%Y%m%d')}.json"})


@app.post("/api/config/import")
def config_import(body: dict = Body(...)):
    if body.get("version") != 1 or not isinstance(body.get("settings"), dict):
        raise HTTPException(400, "Fichier de configuration invalide")
    settings.put({k: v for k, v in body["settings"].items() if k in settings.DEFAULTS and k != "running"})
    n = 0
    for s in body.get("streamers", []):
        if isinstance(s, dict) and re.fullmatch(r"[a-z0-9_]{2,25}", str(s.get("login", ""))):
            cols = {k: s.get(k) for k in ("login", "user_id", "display_name", "avatar", "lang", "followers", "status",
                                          "interest_threshold", "max_clips_day", "series_enabled", "memory")}
            if db.one("SELECT login FROM streamers WHERE login=?", [s["login"]]):
                db.update("streamers", "login", s["login"], cols)
            else:
                db.insert("streamers", {**cols, "added_at": time.time()})
            n += 1
    by_name = {a["name"]: a for a in db.q("SELECT id,name FROM accounts")}
    for a in body.get("accounts", []):
        if isinstance(a, dict) and a.get("name") in by_name:
            db.update("accounts", "id", by_name[a["name"]]["id"], {"lang": a.get("lang", "fr"), "is_test": a.get("is_test", 0),
                                                                    "settings": a.get("settings") or {}})
    for login in body.get("ignored_suggestions", []):
        db.insert("suggestions", {"login": str(login), "status": "ignored", "updated_at": time.time()}, replace=True)
    engine.refresh()
    return {"ok": True, "streamers": n}


# ------------------------------------------------------------------ interface
@app.get("/")
def index():
    return FileResponse(paths.STATIC / "index.html", headers={"Cache-Control": "no-cache"})


@app.get("/manifest.webmanifest")
def manifest():
    return FileResponse(paths.STATIC / "manifest.webmanifest", media_type="application/manifest+json")


@app.get("/sw.js")
def sw():
    return FileResponse(paths.STATIC / "sw.js", media_type="application/javascript", headers={"Cache-Control": "no-cache"})


app.mount("/static", StaticFiles(directory=paths.STATIC), name="static")
