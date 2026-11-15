"""Client de l'API Twitch Helix (jeton d'application, sans connexion utilisateur)."""
import re
import threading
import time
from datetime import datetime, timezone

import httpx

from . import settings
from .logbus import log, warn

API = "https://api.twitch.tv/helix"
_token = {"value": "", "exp": 0.0, "cid": ""}
_lock = threading.Lock()
_game_cache: dict[str, str] = {}
_client = httpx.Client(timeout=20)


class TwitchError(Exception):
    pass


def configured() -> bool:
    s = settings.secrets()
    return bool(s["TWITCH_CLIENT_ID"] and s["TWITCH_CLIENT_SECRET"])


def _get_token(force: bool = False) -> tuple[str, str]:
    s = settings.secrets()
    cid, sec = s["TWITCH_CLIENT_ID"], s["TWITCH_CLIENT_SECRET"]
    if not cid or not sec:
        raise TwitchError("Clés Twitch manquantes : ajoute-les dans Système → Clés API.")
    with _lock:
        if force or _token["cid"] != cid or time.time() > _token["exp"] - 120:
            r = _client.post("https://id.twitch.tv/oauth2/token",
                             data={"client_id": cid, "client_secret": sec, "grant_type": "client_credentials"})
            if r.status_code != 200:
                raise TwitchError(f"Twitch refuse les clés ({r.status_code}). Vérifie le Client ID et le Secret.")
            j = r.json()
            _token.update(value=j["access_token"], exp=time.time() + j.get("expires_in", 3600), cid=cid)
        return cid, _token["value"]


def _get(path: str, params) -> dict:
    for attempt in range(4):
        cid, tok = _get_token(force=attempt == 1)
        try:
            r = _client.get(f"{API}/{path}", params=params, headers={"Client-Id": cid, "Authorization": f"Bearer {tok}"})
        except httpx.HTTPError as e:
            if attempt == 3:
                raise TwitchError(f"Twitch injoignable : {e}") from e
            time.sleep(2 * (attempt + 1))
            continue
        if r.status_code == 401:
            continue
        if r.status_code == 429:
            reset = float(r.headers.get("Ratelimit-Reset", time.time() + 5))
            time.sleep(max(1.0, min(30.0, reset - time.time())))
            continue
        if r.status_code >= 500:
            time.sleep(2 * (attempt + 1))
            continue
        if r.status_code != 200:
            raise TwitchError(f"Twitch {path} → {r.status_code} {r.text[:200]}")
        return r.json()
    raise TwitchError(f"Twitch {path} : échec après plusieurs essais")


def parse_login(text: str) -> str:
    """Accepte « twitch.tv/nom », une URL complète ou juste le nom."""
    t = text.strip().lower()
    m = re.search(r"twitch\.tv/([a-z0-9_]{2,25})", t)
    if m:
        return m.group(1)
    t = t.lstrip("@").strip("/")
    if re.fullmatch(r"[a-z0-9_]{2,25}", t):
        return t
    raise TwitchError("Lien invalide. Exemple attendu : twitch.tv/nom_du_streamer")


def game_id(name: str) -> str:
    if name not in _game_cache:
        d = _get("games", {"name": name}).get("data", [])
        if not d:
            raise TwitchError(f"Jeu introuvable sur Twitch : « {name} ». Vérifie l'orthographe exacte.")
        _game_cache[name] = d[0]["id"]
    return _game_cache[name]


def streams_for_game(gid: str, lang: str, pages: int = 2) -> list[dict]:
    out, cursor = [], None
    for _ in range(pages):
        p = [("game_id", gid), ("language", lang), ("first", "100"), ("type", "live")]
        if cursor:
            p.append(("after", cursor))
        j = _get("streams", p)
        out += j.get("data", [])
        cursor = j.get("pagination", {}).get("cursor")
        if not cursor:
            break
    return out


def streams_for_logins(logins: list[str]) -> list[dict]:
    out = []
    for i in range(0, len(logins), 100):
        out += _get("streams", [("user_login", x) for x in logins[i:i + 100]] + [("first", "100")]).get("data", [])
    return out


def users(logins: list[str]) -> list[dict]:
    out = []
    for i in range(0, len(logins), 100):
        out += _get("users", [("login", x) for x in logins[i:i + 100]]).get("data", [])
    return out


def followers(user_id: str) -> int:
    try:
        return int(_get("channels/followers", {"broadcaster_id": user_id, "first": 1}).get("total", 0))
    except TwitchError:
        return 0


def clips(user_id: str, since_ts: float, first: int = 20) -> list[dict]:
    started = datetime.fromtimestamp(since_ts, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    ended = datetime.fromtimestamp(time.time() + 60, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    d = _get("clips", {"broadcaster_id": user_id, "started_at": started, "ended_at": ended, "first": first}).get("data", [])
    for c in d:
        try:
            c["created_ts"] = datetime.strptime(c["created_at"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc).timestamp()
        except (ValueError, KeyError):
            c["created_ts"] = time.time()
    return d


def lookup_streamer(text: str) -> dict:
    """Fiche complète d'un streamer à partir de son lien."""
    login = parse_login(text)
    u = users([login])
    if not u:
        raise TwitchError(f"Chaîne introuvable : {login}")
    u = u[0]
    live = streams_for_logins([login])
    s = live[0] if live else None
    lang = (s or {}).get("language") or ""
    if not lang:
        try:
            ch = _get("channels", {"broadcaster_id": u["id"]}).get("data", [{}])[0]
            lang = ch.get("broadcaster_language", "")
        except TwitchError:
            pass
    return {"login": login, "user_id": u["id"], "display_name": u["display_name"], "avatar": u.get("profile_image_url", ""),
            "lang": lang if lang in ("fr", "en") else (lang or "fr"), "followers": followers(u["id"]),
            "is_live": bool(s), "game": (s or {}).get("game_name", ""), "viewers": (s or {}).get("viewer_count", 0),
            "title": (s or {}).get("title", "")}


def test_keys() -> str:
    _get_token(force=True)
    game_id(settings.get("game"))
    log("twitch", "Clés Twitch valides")
    return "ok"
