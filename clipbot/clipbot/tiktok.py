"""TikTok : connexion OAuth (PKCE), publication (Content Posting API, privé par défaut), statistiques (Display API)."""
import hashlib
import math
import os
import secrets
import time
from pathlib import Path
from urllib.parse import urlencode

import httpx

from . import db, settings
from .logbus import log, warn

AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/"
API = "https://open.tiktokapis.com"
SCOPES = "user.info.basic,user.info.profile,user.info.stats,video.list,video.publish,video.upload"
_client = httpx.Client(timeout=60)
_pending: dict[str, dict] = {}     # state -> {verifier, redirect, ts}


class TikTokError(Exception):
    def __init__(self, msg: str, code: str = "", retry_after: float = 0) -> None:
        super().__init__(msg)
        self.code, self.retry_after = code, retry_after


class QuotaError(TikTokError):
    pass


class AuthError(TikTokError):
    pass


def configured() -> bool:
    s = settings.secrets()
    return bool(s["TIKTOK_CLIENT_KEY"] and s["TIKTOK_CLIENT_SECRET"])


# ---------- OAuth ----------
def auth_url(redirect_uri: str) -> str:
    if not configured():
        raise TikTokError("Clés TikTok manquantes : ajoute-les dans Système → Clés API.")
    state, verifier = secrets.token_urlsafe(16), secrets.token_urlsafe(48)
    for k in [k for k, v in _pending.items() if time.time() - v["ts"] > 1800]:
        _pending.pop(k, None)
    _pending[state] = {"verifier": verifier, "redirect": redirect_uri, "ts": time.time()}
    # TikTok (applications « desktop ») attend le SHA-256 du code_verifier en hexadécimal
    challenge = hashlib.sha256(verifier.encode()).hexdigest()
    return AUTH_URL + "?" + urlencode({"client_key": settings.secret("TIKTOK_CLIENT_KEY"), "scope": SCOPES,
                                       "response_type": "code", "redirect_uri": redirect_uri, "state": state,
                                       "code_challenge": challenge, "code_challenge_method": "S256"})


def _token_call(data: dict) -> dict:
    s = settings.secrets()
    r = _client.post(f"{API}/v2/oauth/token/", data={"client_key": s["TIKTOK_CLIENT_KEY"],
                                                    "client_secret": s["TIKTOK_CLIENT_SECRET"], **data},
                     headers={"Content-Type": "application/x-www-form-urlencoded"})
    j = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    if r.status_code != 200 or "access_token" not in j:
        raise AuthError(f"TikTok a refusé la connexion : {j.get('error_description') or j.get('error') or r.text[:200]}")
    return j


def finish_auth(code: str, state: str) -> dict:
    p = _pending.pop(state, None)
    if not p:
        raise AuthError("Demande de connexion expirée : relance « Connecter un compte ».")
    j = _token_call({"code": code, "grant_type": "authorization_code", "redirect_uri": p["redirect"],
                     "code_verifier": p["verifier"]})
    now = time.time()
    tok = {"open_id": j["open_id"], "access_token": j["access_token"], "refresh_token": j.get("refresh_token", ""),
           "expires_at": now + j.get("expires_in", 86400), "refresh_expires_at": now + j.get("refresh_expires_in", 31536000),
           "scopes": j.get("scope", "")}
    existing = db.one("SELECT id FROM accounts WHERE open_id=?", [tok["open_id"]])
    if existing:
        db.update("accounts", "id", existing["id"], {**tok, "connected": 1})
        acc_id = existing["id"]
    else:
        acc_id = db.insert("accounts", {**tok, "name": "Compte TikTok", "lang": "fr", "settings": {}, "connected": 1,
                                        "created_at": now})
    try:
        refresh_profile(acc_id)
    except TikTokError as e:
        warn("tiktok", f"Profil non récupéré : {e}")
    log("tiktok", f"Compte TikTok connecté (id {acc_id})")
    return db.one("SELECT * FROM accounts WHERE id=?", [acc_id])


def _token(acc_id: int) -> str:
    a = db.one("SELECT * FROM accounts WHERE id=?", [acc_id])
    if not a or not a["connected"]:
        raise AuthError("Compte TikTok déconnecté")
    if time.time() > (a["expires_at"] or 0) - 300:
        if not a["refresh_token"]:
            raise AuthError("Session TikTok expirée : reconnecte le compte.")
        try:
            j = _token_call({"grant_type": "refresh_token", "refresh_token": a["refresh_token"]})
        except AuthError:
            db.update("accounts", "id", acc_id, {"connected": 0})
            raise
        now = time.time()
        db.update("accounts", "id", acc_id, {"access_token": j["access_token"], "refresh_token": j.get("refresh_token", a["refresh_token"]),
                                             "expires_at": now + j.get("expires_in", 86400),
                                             "refresh_expires_at": now + j.get("refresh_expires_in", 31536000)})
        return j["access_token"]
    return a["access_token"]


def disconnect(acc_id: int) -> None:
    a = db.one("SELECT * FROM accounts WHERE id=?", [acc_id])
    if a and a["access_token"]:
        try:
            s = settings.secrets()
            _client.post(f"{API}/v2/oauth/revoke/", data={"client_key": s["TIKTOK_CLIENT_KEY"],
                                                         "client_secret": s["TIKTOK_CLIENT_SECRET"], "token": a["access_token"]})
        except httpx.HTTPError:
            pass
    db.update("accounts", "id", acc_id, {"connected": 0, "access_token": "", "refresh_token": ""})


def _call(acc_id: int, method: str, path: str, *, params=None, body=None) -> dict:
    tok = _token(acc_id)
    try:
        r = _client.request(method, f"{API}{path}", params=params, json=body,
                            headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json; charset=UTF-8"})
    except httpx.HTTPError as e:
        raise TikTokError(f"TikTok injoignable : {e}", "network") from e
    try:
        j = r.json()
    except ValueError:
        j = {}
    err = j.get("error") or {}
    code = err.get("code", "ok" if r.status_code == 200 else f"http_{r.status_code}")
    if code == "ok":
        return j.get("data") or {}
    msg = f"TikTok : {code} — {err.get('message', r.text[:200])}"
    if r.status_code == 429 or code in ("rate_limit_exceeded", "spam_risk_too_many_posts", "spam_risk_too_many_pending_share",
                                         "reached_active_user_cap"):
        raise QuotaError(msg, code, 3600 if code.startswith("spam_risk") else 120)
    if code == "unaudited_client_can_only_post_to_private_accounts":
        raise AuthError("TikTok refuse : tant que ton app n'est pas auditée, le compte TikTok doit être en « compte privé » "
                        "(appli TikTok → Paramètres → Confidentialité → Compte privé).", code)
    if code == "spam_risk_user_banned_from_posting":
        raise QuotaError("TikTok a temporairement bloqué les publications de ce compte.", code, 6 * 3600)
    if r.status_code == 401 or code in ("access_token_invalid", "scope_not_authorized", "token_not_authorized_for_specified_publish_id"):
        raise AuthError(f"connexion TikTok à refaire ({code})", code)
    raise TikTokError(msg, code)


# ---------- profil et statistiques ----------
def refresh_profile(acc_id: int) -> dict:
    d = _call(acc_id, "GET", "/v2/user/info/", params={
        "fields": "open_id,display_name,avatar_url,follower_count,likes_count,video_count"}).get("user", {})
    upd = {"name": d.get("display_name") or "Compte TikTok", "avatar": d.get("avatar_url", ""),
           "followers": d.get("follower_count", 0), "likes": d.get("likes_count", 0), "videos": d.get("video_count", 0)}
    db.update("accounts", "id", acc_id, upd)
    return upd


def list_videos(acc_id: int, max_pages: int = 5) -> list[dict]:
    out, cursor = [], None
    fields = "id,title,video_description,create_time,duration,cover_image_url,share_url,view_count,like_count,comment_count,share_count"
    for _ in range(max_pages):
        body = {"max_count": 20}
        if cursor:
            body["cursor"] = cursor
        d = _call(acc_id, "POST", "/v2/video/list/", params={"fields": fields}, body=body)
        out += d.get("videos", [])
        if not d.get("has_more"):
            break
        cursor = d.get("cursor")
    return out


# ---------- publication ----------
def creator_info(acc_id: int) -> dict:
    return _call(acc_id, "POST", "/v2/post/publish/creator_info/query/", body={})


def upload(acc_id: int, path: str, caption: str, privacy: str = "SELF_ONLY") -> str:
    """Envoie la vidéo (Direct Post). Renvoie le publish_id."""
    size = os.path.getsize(path)
    info = creator_info(acc_id)
    options = info.get("privacy_level_options") or ["SELF_ONLY"]
    if privacy not in options:
        privacy = "SELF_ONLY" if "SELF_ONLY" in options else options[0]
    chunk = size if size <= 64 * 1024 * 1024 else 10 * 1024 * 1024
    count = 1 if chunk == size else max(1, math.floor(size / chunk))
    d = _call(acc_id, "POST", "/v2/post/publish/video/init/", body={
        "post_info": {"title": caption[:2200], "privacy_level": privacy, "disable_duet": False, "disable_comment": False,
                      "disable_stitch": False, "video_cover_timestamp_ms": 1000},
        "source_info": {"source": "FILE_UPLOAD", "video_size": size, "chunk_size": chunk, "total_chunk_count": count}})
    url, pid = d["upload_url"], d["publish_id"]
    with open(path, "rb") as f:
        for i in range(count):
            start = i * chunk
            end = size - 1 if i == count - 1 else start + chunk - 1
            f.seek(start)
            data = f.read(end - start + 1)
            for attempt in range(3):
                try:
                    r = _client.put(url, content=data, timeout=600, headers={
                        "Content-Type": "video/mp4", "Content-Length": str(len(data)),
                        "Content-Range": f"bytes {start}-{end}/{size}"})
                    if r.status_code in (200, 201, 206):
                        break
                    if attempt == 2:
                        raise TikTokError(f"Envoi du fichier refusé ({r.status_code})", "upload")
                except httpx.HTTPError as e:
                    if attempt == 2:
                        raise TikTokError(f"Envoi interrompu : {e}", "network") from e
                time.sleep(3 * (attempt + 1))
    return pid


def publish_status(acc_id: int, publish_id: str) -> dict:
    """status : PROCESSING_UPLOAD | PROCESSING_DOWNLOAD | SEND_TO_USER_INBOX | PUBLISH_COMPLETE | FAILED"""
    return _call(acc_id, "POST", "/v2/post/publish/status/fetch/", body={"publish_id": publish_id})
