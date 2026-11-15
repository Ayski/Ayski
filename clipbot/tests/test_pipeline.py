"""Chaîne complète avec IA et TikTok simulés : séries, publication croisée, file d'upload, quotas."""
import shutil
import time
from pathlib import Path

import pytest

from clipbot import ai, db, paths, series, settings, tiktok, transcribe
from clipbot.pipeline import Engine


def fake_tr(path, lang=None):
    segs = [{"s": 9.0, "e": 11.0, "text": "mais non c'est pas possible"}, {"s": 12.0, "e": 14.0, "text": "regarde ça il est fou"}]
    words = []
    for s in segs:
        ws = s["text"].split()
        for i, w in enumerate(ws):
            words.append({"w": w, "s": s["s"] + i * 0.4, "e": s["s"] + i * 0.4 + 0.3})
    return {"language": "fr", "text": " ".join(s["text"] for s in segs), "words": words, "segments": segs}


class FakeAI:
    def __init__(self):
        self.calls = []
        self.rating = 9
        self.series = True
        self.story = ""

    def __call__(self, **kw):
        self.calls.append(kw)
        sid = kw["open_series"][0]["id"] if kw["open_series"] else None
        need_tr = kw["target_lang"] != "fr"
        return ai.ClipAnalysis(
            description="Poursuite en voiture qui finit dans l'eau.", rating=self.rating, category="action",
            title="No way he did that" if need_tr else "Il finit dans l'eau", hook="Wait…" if need_tr else "Attends la fin",
            caption="He never saw it coming" if need_tr else "Il ne l'a pas vu venir", hashtags=["poursuite", "police"],
            memory=ai.MemoryUpdate(character="Braqueur", goals="Semer la police", new_events=["Chute dans l'eau"], summary="Il fuit la police."),
            series=ai.SeriesDecision(part_of_series=self.series, existing_series_id=sid, story_title=self.story,
                                     story_phase="suite" if sid else "debut", recap="la police le traquait" if sid else ""),
            translated_lines=[ai.SubLine(i=0, text="no way that's impossible"), ai.SubLine(i=1, text="look at that he's crazy")] if need_tr else [])


@pytest.fixture()
def eng(fresh_db, raw_video, monkeypatch):
    fake = FakeAI()
    monkeypatch.setattr(transcribe, "transcribe", fake_tr)
    monkeypatch.setattr(ai, "available", lambda: (True, ""))
    monkeypatch.setattr(ai, "analyze_clip", fake)
    monkeypatch.setattr(tiktok, "configured", lambda: True)
    settings.put({"export_quality": "draft"})
    e = Engine()
    e.fake = fake
    db.insert("streamers", {"login": "kameto", "display_name": "Kameto", "lang": "fr", "status": "target", "added_at": time.time()})
    return e


def new_clip(raw_video, n=1, streamer="kameto"):
    raw = paths.RAW / f"t{n}_{time.time_ns()}.mp4"
    shutil.copy(raw_video, raw)
    return db.insert("clips", {"streamer": streamer, "lang": "fr", "created_at": time.time(), "t_start": 0, "t_end": 16,
                               "duration": 16, "status": "detected", "score": 0.6, "raw_path": str(raw), "raw_in": 6.0, "raw_out": 22.0,
                               "peaks": [10.0], "signals": {"audio": 1.0, "chat": 0.8, "emotes": 0.5, "motion": 0.4, "viewer_clip": 0},
                               "chat_summary": "40 messages\nuser: KEKW"})


def drain(e, clip_id):
    """Exécute les étapes à la main (sans threads) jusqu'à stabilisation."""
    for _ in range(12):
        moved = False
        for q, fn in ((e.q_tr, e._do_transcribe), (e.q_ai, e._do_ai), (e.q_edit, e._do_edit)):
            while not q.empty():
                cid = q.get()
                e._queued.clear()
                fn(cid)
                moved = True
        if not moved:
            break
    return db.one("SELECT * FROM clips WHERE id=?", [clip_id])


def test_full_flow_without_account_stays_local(eng, raw_video):
    cid = new_clip(raw_video)
    eng.enqueue("tr", cid)
    c = drain(eng, cid)
    assert c["status"] == "ready" and c["signals"]["keywords"] > 0.5
    assert Path(c["final_path"]).exists() and Path(c["final_path"]).with_suffix(".txt").exists()
    assert Path(c["final_path"]).parent.name == "kameto"
    assert "🎥 twitch.tv/kameto" in c["description"] and len(c["hashtags"]) <= 6
    assert c["series_id"] and c["episode"] == 1 and c["hashtags"][0].startswith("aventurekameto")
    assert db.one("SELECT memory FROM streamers WHERE login='kameto'")["memory"]["character"] == "Braqueur"
    assert Path(c["thumb_path"]).exists()


def test_low_rating_rejected(eng, raw_video):
    eng.fake.rating = 3
    cid = new_clip(raw_video)
    eng.enqueue("tr", cid)
    c = drain(eng, cid)
    assert c["status"] == "rejected" and "note IA" in c["error"]


def test_low_score_rejected_before_ai(eng, raw_video):
    cid = new_clip(raw_video)
    db.clip_update(cid, signals={"audio": 0.3, "chat": 0.1, "emotes": 0, "motion": 0, "viewer_clip": 0})
    import clipbot.transcribe as t
    eng.enqueue("tr", cid)
    t.transcribe = lambda p, l=None: {"language": "fr", "text": "", "words": [], "segments": []}
    c = drain(eng, cid)
    assert c["status"] == "rejected" and not eng.fake.calls


def test_series_order_cross_lang_and_upload_queue(eng, raw_video, monkeypatch):
    fr = db.insert("accounts", {"open_id": "fr1", "name": "FR", "lang": "fr", "connected": 1, "is_test": 0, "settings": {"min_gap_minutes": 0},
                                "access_token": "x", "expires_at": time.time() + 9999})
    en = db.insert("accounts", {"open_id": "en1", "name": "EN", "lang": "en", "connected": 1, "is_test": 1,
                                "settings": {"cross_lang": True, "min_gap_minutes": 0}, "access_token": "x", "expires_at": time.time() + 9999})
    uploads, fail = [], {"quota": True}

    def fake_upload(acc_id, path, caption, privacy="SELF_ONLY"):
        if acc_id == en and fail["quota"]:
            fail["quota"] = False
            raise tiktok.QuotaError("trop de posts", "spam_risk_too_many_posts", 3600)
        uploads.append((acc_id, caption.split("\n")[0], privacy))
        return f"pub{len(uploads)}"
    monkeypatch.setattr(tiktok, "upload", fake_upload)
    monkeypatch.setattr(tiktok, "publish_status", lambda a, p: {"status": "PUBLISH_COMPLETE"})

    c1 = new_clip(raw_video, 1)
    eng.enqueue("tr", c1)
    drain(eng, c1)
    c2 = new_clip(raw_video, 2)
    eng.enqueue("tr", c2)
    drain(eng, c2)
    a, b = db.one("SELECT * FROM clips WHERE id=?", [c1]), db.one("SELECT * FROM clips WHERE id=?", [c2])
    assert a["series_id"] == b["series_id"] and (a["episode"], b["episode"]) == (1, 2)
    assert a["status"] == b["status"] == "ready"                       # mode test : rien n'est envoyé
    assert series.texts_for(a)["teaser"] == "La suite → Ép. 2" and a["ai"]["edit"]       # ép. 1 re-monté avec teaser
    assert series.texts_for(b)["recap"].startswith("Précédemment")
    assert "L'aventure de Kameto — Ép. 2" in b["description"]
    kids = db.q("SELECT * FROM clips WHERE parent_id IS NOT NULL ORDER BY id")
    assert len(kids) == 2 and all(k["account_id"] == en and k["target_lang"] == "en" for k in kids)
    assert kids[0]["title"] == "No way he did that" and "Kameto's adventure — Ep. 1" in kids[0]["description"]
    assert "fyp" in kids[0]["hashtags"] and "pourtoi" in a["hashtags"]

    cfg = settings.all()
    assert eng._pick(db.one("SELECT * FROM accounts WHERE id=?", [fr]), cfg) is None        # mode test, pas d'upload

    # upload de test activé : seul le compte marqué « test » (EN) reçoit des clips
    settings.put({"test_upload": True})
    cfg = settings.all()
    db.ex("UPDATE clips SET status='queued' WHERE parent_id IS NOT NULL")
    acc_en = db.one("SELECT * FROM accounts WHERE id=?", [en])
    first = eng._pick(acc_en, cfg)
    assert first["episode"] == 1                                       # séries dans l'ordre
    eng._upload(acc_en, first)                                         # 1er essai : quota → retour en file, rien de perdu
    again = db.one("SELECT * FROM clips WHERE id=?", [first["id"]])
    assert again["status"] == "queued" and again["next_try_at"] > time.time()
    assert db.val("SELECT COUNT(*) FROM alerts WHERE kind='tiktok_quota'") == 1
    assert eng._pick(acc_en, cfg) is None                              # compte en pause le temps du quota
    eng._acc_cooldown.clear()
    db.ex("UPDATE clips SET next_try_at=0")
    eng._upload(acc_en, eng._pick(acc_en, cfg))
    assert eng._pick(acc_en, cfg) is None                              # l'ép. 2 attend la fin de l'upload de l'ép. 1
    for c in db.q("SELECT * FROM clips WHERE status='uploading'"):
        eng._check_publish(c)
    assert db.one("SELECT status FROM clips WHERE id=?", [first["id"]])["status"] == "uploaded_private"
    nxt = eng._pick(acc_en, cfg)
    assert nxt["episode"] == 2
    assert uploads[0][0] == en and uploads[0][2] == "SELF_ONLY"

    # sortie du mode test : les clips FR prêts rejoignent la file et partent dans l'ordre
    settings.put({"test_mode": False})
    cfg = settings.all()
    db.ex("UPDATE clips SET status='queued' WHERE parent_id IS NULL")
    acc_fr = db.one("SELECT * FROM accounts WHERE id=?", [fr])
    assert eng._pick(acc_fr, cfg)["id"] == c1


def test_single_episode_series_dissolves(eng, raw_video):
    cid = new_clip(raw_video)
    eng.enqueue("tr", cid)
    c = drain(eng, cid)
    assert c["series_id"]
    assert not series.can_upload(c)                                    # une série attend son 2e épisode
    settings.put({"series_gap_minutes": 0})
    db.ex("UPDATE clips SET created_at=created_at-10")
    redo = series.maintain()
    assert redo == [cid]
    c = db.one("SELECT * FROM clips WHERE id=?", [cid])
    assert c["series_id"] is None and series.can_upload(c)


def test_resume_after_crash(eng, raw_video):
    ids = [new_clip(raw_video, i) for i in range(3)]
    db.clip_update(ids[1], status="analyzing")
    db.clip_update(ids[2], status="editing")
    eng._resume()
    assert eng.q_tr.qsize() == 1 and eng.q_ai.qsize() == 1 and eng.q_edit.qsize() == 1


def test_series_only_drops_isolated_and_names_story(eng, raw_video):
    eng.fake.series, eng.fake.rating = False, 7                         # clip isolé correct mais pas exceptionnel
    cid = new_clip(raw_video)
    eng.enqueue("tr", cid)
    assert drain(eng, cid)["status"] == "ready"                         # par défaut : les clips isolés sont gardés
    settings.put({"series_only": True})
    cid = new_clip(raw_video, 2)
    eng.enqueue("tr", cid)
    c = drain(eng, cid)
    assert c["status"] == "rejected" and "isolé" in c["error"]
    eng.fake.series, eng.fake.story = True, "Le braquage de la banque"  # début d'une histoire : gardé, série nommée
    cid = new_clip(raw_video, 1)
    eng.enqueue("tr", cid)
    c = drain(eng, cid)
    s = db.one("SELECT * FROM series WHERE id=?", [c["series_id"]])
    assert c["episode"] == 1 and s["title"] == "Le braquage de la banque"
    assert series.texts_for(c)["video_title"].startswith("Le braquage de la banque — Ép. 1")
    settings.put({"series_gap_minutes": 0})                             # aucune suite : l'histoire avortée est écartée
    db.ex("UPDATE clips SET created_at=created_at-10")
    assert series.maintain() == []
    assert db.val("SELECT status FROM clips WHERE id=?", [cid]) == "rejected"


def test_story_follow_makes_next_episode_or_drops(eng, raw_video):
    cid = new_clip(raw_video)                                           # épisode 1 : ouvre l'histoire
    eng.enqueue("tr", cid)
    first = drain(eng, cid)
    follow = {"audio": 0.1, "chat": 0.0, "emotes": 0, "motion": 0, "viewer_clip": 0, "follow": 1.0}
    cid = new_clip(raw_video, 1)                                        # passage calme prélevé pour suivre l'histoire
    db.clip_update(cid, signals=follow)
    eng.enqueue("tr", cid)
    c = drain(eng, cid)
    assert c["series_id"] == first["series_id"] and c["episode"] == 2   # l'IA y voit la suite : épisode 2
    eng.fake.series = False
    cid = new_clip(raw_video, 2)
    db.clip_update(cid, signals=follow)
    eng.enqueue("tr", cid)
    c = drain(eng, cid)
    assert c["status"] == "rejected" and "histoire" in c["error"]      # pas de suite : écarté
