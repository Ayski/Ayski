"""Clients Twitch / TikTok testés contre de faux serveurs (formes des requêtes, découpage, quotas)."""
import hashlib
import json
import time
from urllib.parse import parse_qs, urlparse

import httpx
import pytest

from clipbot import db, settings, tiktok, twitch


@pytest.fixture()
def keys(fresh_db):
    settings.set_secrets({"TWITCH_CLIENT_ID": "cid", "TWITCH_CLIENT_SECRET": "sec", "TIKTOK_CLIENT_KEY": "ck", "TIKTOK_CLIENT_SECRET": "cs"})
    assert settings.secrets_status()["TWITCH_CLIENT_ID"]["set"]


def test_twitch_flow(keys, monkeypatch):
    seen = []

    def handler(req: httpx.Request) -> httpx.Response:
        seen.append(req.url.path)
        if req.url.host == "id.twitch.tv":
            return httpx.Response(200, json={"access_token": "tok", "expires_in": 5000})
        assert req.headers["Client-Id"] == "cid" and req.headers["Authorization"] == "Bearer tok"
        if req.url.path.endswith("/games"):
            return httpx.Response(200, json={"data": [{"id": "32982", "name": "Grand Theft Auto V"}]})
        if req.url.path.endswith("/streams"):
            if req.url.params.get("after"):
                return httpx.Response(200, json={"data": [], "pagination": {}})
            return httpx.Response(200, json={"data": [{"user_login": "a", "user_id": "1", "viewer_count": 900, "language": "fr"}],
                                             "pagination": {"cursor": "next"}})
        if req.url.path.endswith("/users"):
            return httpx.Response(200, json={"data": [{"id": "1", "login": "a", "display_name": "A", "profile_image_url": "http://x/a.png"}]})
        if req.url.path.endswith("/channels/followers"):
            return httpx.Response(200, json={"total": 1234, "data": []})
        if req.url.path.endswith("/clips"):
            return httpx.Response(200, json={"data": [{"id": "c1", "created_at": "2026-11-15T19:00:00Z", "title": "t"}]})
        return httpx.Response(404)
    monkeypatch.setattr(twitch, "_client", httpx.Client(transport=httpx.MockTransport(handler)))
    twitch._token.update(value="", exp=0)
    twitch._game_cache.clear()
    gid = twitch.game_id("Grand Theft Auto V")
    assert gid == "32982" and len(twitch.streams_for_game(gid, "fr")) == 1
    info = twitch.lookup_streamer("https://www.twitch.tv/Abc")
    assert info["followers"] == 1234 and info["is_live"] and info["lang"] == "fr"
    assert twitch.clips("1", time.time() - 600)[0]["created_ts"] > 1_700_000_000


def test_tiktok_oauth_and_upload(keys, monkeypatch, tmp_path):
    calls = []

    def handler(req: httpx.Request) -> httpx.Response:
        p = req.url.path
        calls.append((req.method, p, dict(req.headers), req.content))
        if p == "/v2/oauth/token/":
            body = parse_qs(req.content.decode())
            assert body["client_key"] == ["ck"] and body["grant_type"] == ["authorization_code"] and body["code_verifier"][0]
            return httpx.Response(200, json={"open_id": "oid", "access_token": "at", "refresh_token": "rt", "expires_in": 86400,
                                             "refresh_expires_in": 9999999, "scope": tiktok.SCOPES})
        if p == "/v2/user/info/":
            return httpx.Response(200, json={"data": {"user": {"display_name": "MonCompte", "follower_count": 42, "likes_count": 7, "video_count": 3}},
                                             "error": {"code": "ok"}})
        if p == "/v2/post/publish/creator_info/query/":
            return httpx.Response(200, json={"data": {"privacy_level_options": ["SELF_ONLY"]}, "error": {"code": "ok"}})
        if p == "/v2/post/publish/video/init/":
            b = json.loads(req.content)
            assert b["post_info"]["privacy_level"] == "SELF_ONLY" and b["source_info"]["source"] == "FILE_UPLOAD"
            assert b["source_info"]["video_size"] == 3000 and b["source_info"]["total_chunk_count"] == 1
            return httpx.Response(200, json={"data": {"publish_id": "p1", "upload_url": "https://upload.example/u"}, "error": {"code": "ok"}})
        if req.url.host == "upload.example":
            assert req.headers["Content-Range"] == "bytes 0-2999/3000" and len(req.content) == 3000
            return httpx.Response(201)
        if p == "/v2/post/publish/status/fetch/":
            return httpx.Response(200, json={"data": {"status": "PUBLISH_COMPLETE"}, "error": {"code": "ok"}})
        if p == "/v2/video/list/":
            return httpx.Response(429, json={"error": {"code": "rate_limit_exceeded", "message": "slow down"}})
        return httpx.Response(404)
    monkeypatch.setattr(tiktok, "_client", httpx.Client(transport=httpx.MockTransport(handler)))
    url = tiktok.auth_url("http://localhost:8080/api/tiktok/callback")
    qs = parse_qs(urlparse(url).query)
    state = qs["state"][0]
    assert qs["code_challenge"][0] == hashlib.sha256(tiktok._pending[state]["verifier"].encode()).hexdigest()
    assert "video.publish" in qs["scope"][0] and "user.info.stats" in qs["scope"][0]
    acc = tiktok.finish_auth("thecode", state)
    assert acc["name"] == "MonCompte" and acc["followers"] == 42 and acc["connected"] == 1
    with pytest.raises(tiktok.AuthError):
        tiktok.finish_auth("thecode", state)                 # un state ne sert qu'une fois
    f = tmp_path / "v.mp4"
    f.write_bytes(b"x" * 3000)
    # même si le compte demande du public, une app non auditée n'offre que SELF_ONLY : on reste en privé
    assert tiktok.upload(acc["id"], str(f), "Titre\n🎥 twitch.tv/a\n#gta", "PUBLIC_TO_EVERYONE") == "p1"
    assert tiktok.publish_status(acc["id"], "p1")["status"] == "PUBLISH_COMPLETE"
    with pytest.raises(tiktok.QuotaError):
        tiktok.list_videos(acc["id"])
    tiktok.disconnect(acc["id"])
    assert db.one("SELECT connected, access_token FROM accounts WHERE id=?", [acc["id"]]) == {"connected": 0, "access_token": ""}
