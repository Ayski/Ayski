import time

import numpy as np

from clipbot import ai, calibrate, db, detect, editor, settings, subtitles, twitch
from clipbot.chat import ChatHub


def cfg():
    return dict(settings.DEFAULTS)


def run_detector(chat=None, loud=(100, 115), n=200):
    msgs = chat or []

    def chat_fn(a, b):
        sel = [m for m in msgs if a <= m[0] < b]
        return len(sel), sum(m[1] for m in sel)
    det = detect.Detector(chat_fn)
    t0 = 1_000_000.0
    out = []
    for i in range(n // 4):
        ws = t0 + i * 4
        db_ = np.array([-30.0 + np.random.randn() if not (loud[0] <= (i * 4 + k * 0.5) < loud[1]) else -8.0 for k in range(8)])
        det.add_segment(ws, db_, db_ - 20, 30.0 if loud[0] <= i * 4 < loud[1] else 2.0 + np.random.rand())
        out += det.step(ws + 4, cfg())
    out += det.step(t0 + n + 30, cfg())
    return t0, out


def test_detector_finds_loud_moment_with_chat():
    t0 = 1_000_000.0
    chat = [(t0 + s + 0.1 * k, 0) for s in range(0, 200, 4) for k in range(1)]            # chat calme
    chat += [(t0 + 105 + s + 0.05 * k, 1) for s in range(15) for k in range(6)]          # explosion + emotes
    _, moments = run_detector(chat)
    assert len(moments) == 1
    m = moments[0]
    assert 92 <= m.start - t0 <= 102 and 108 <= m.end - t0 <= 126
    assert 10 <= m.end - m.start <= 30
    assert m.signals["audio"] > 0.8 and m.signals["chat"] > 0.5 and m.signals["emotes"] > 0.5


def test_detector_quiet_stream_no_moment():
    _, moments = run_detector(loud=(999, 999))
    assert moments == []


def test_detector_no_duplicates_and_max_duration():
    _, moments = run_detector(loud=(60, 150))        # 90 s d'action continue
    assert moments and all(m.end - m.start <= 30.01 for m in moments)
    for a, b in zip(moments, moments[1:]):
        assert b.start >= a.end - 0.01


def test_viewer_clip_forces_moment():
    det = detect.Detector(lambda a, b: (0, 0))
    t0 = 2_000_000.0
    for i in range(30):
        q = np.full(8, -30.0) + np.random.randn(8)
        det.add_segment(t0 + i * 4, q, q - 20, 2.0)
    assert det.step(t0 + 130, cfg()) == []
    m = det.force_from_clip(t0 + 100, cfg())
    assert m and m.forced and m.signals["viewer_clip"] == 1.0 and 10 <= m.end - m.start <= 30
    assert detect.combine(m.signals, cfg()["weights"]) >= 0.45


def test_keywords():
    s, hits = detect.keyword_score("Mais non c'est pas possible !!", settings.DEFAULTS["keywords"]["fr"])
    assert s >= 0.8 and "mais non" in hits
    assert detect.keyword_score("on roule tranquillement", settings.DEFAULTS["keywords"]["fr"])[0] == 0


def test_chat_reactions(fresh_db):
    h = ChatHub()
    now = time.time()
    for t in ["KEKW", "salut ça va", "CLIP", "???", "AHAHAHAH", "bonjour le chat", "OMEGALUL OMEGALUL"]:
        h.feed("x", t, "u", now)
    assert h.window("x", now - 1, now + 1) == (7, 5)


def test_parse_login():
    assert twitch.parse_login("https://www.twitch.tv/Some_Name?x=1") == "some_name"
    assert twitch.parse_login("twitch.tv/abc") == "abc"
    assert twitch.parse_login("@abc") == "abc"
    try:
        twitch.parse_login("pas un lien !")
        assert False
    except twitch.TwitchError:
        pass


def test_description_credit_and_hashtags(fresh_db):
    d, tags = ai.build_description("Il saute de l'hélico", "zerator", "fr", ["helico", "cascade", "fou", "wtf"], ["clipsgta"], "aventurezerator", "L'aventure de ZeratoR — Ép. 2 :")
    assert "🎥 twitch.tv/zerator" in d and len(tags) == 6 and d.count("#") == 6
    assert tags[0] == "aventurezerator" and "pourtoi" in tags and "gta5" in tags
    settings.put({"game": "Grand Theft Auto VI"})
    _, tags = ai.build_description("x", "a", "en", [], [])
    assert "gta6" in tags and "fyp" in tags


def test_subtitles_ass():
    words = [{"w": w, "s": 1 + i * 0.4, "e": 1.3 + i * 0.4} for i, w in enumerate("mais non c'est pas possible {hack}".split())]
    ass = subtitles.build_ass(words, 12, sub_style=settings.ACCOUNT_DEFAULTS["sub_style"], title_style=settings.ACCOUNT_DEFAULTS["title_style"],
                              title="Titre", hook="Attends", credit="twitch.tv/x", teaser="La suite → Ép. 2")
    assert ass.count("Dialogue:") == len(words) + 4
    assert "{hack}" not in ass and "HACK" in ass and "twitch.tv/x" in ass
    assert subtitles.spread_words([{"s": 0, "e": 2, "text": "one two three"}])[-1]["e"] == 2.0


def test_remap_and_jump_cuts(raw_video):
    segs = [(2.0, 5.0), (8.0, 12.0)]
    assert editor.remap(3.0, segs) == 1.0 and editor.remap(9.0, segs) == 4.0 and editor.remap(6.0, segs) is None
    job = editor.EditJob(raw=raw_video, out="x.mp4", t_in=0, t_out=30, min_duration=5)
    ks = editor.keep_segments(job)
    assert sum(b - a for a, b in ks) <= 30


def test_calibration_updates_weights(fresh_db):
    cid = db.insert("clips", {"streamer": "a", "status": "ready", "score": 0.6, "title": "Top", "created_at": time.time(),
                              "signals": {"audio": 1.0, "chat": 0.0, "emotes": 0.0, "keywords": 0.0, "motion": 0.9}})
    w0 = settings.get("weights")
    calibrate.feedback(cid, -1, "pas_interessant")
    w1 = settings.get("weights")
    assert w1["audio"] < w0["audio"] and w1["chat"] > w0["chat"]
    assert settings.get("detect_threshold") > settings.DEFAULTS["detect_threshold"]
    calibrate.feedback(cid, -1, "titre_nul")
    assert "Top" in settings.get("feedback_notes")["disliked_titles"]
    assert settings.get("weights") == w1                       # un titre nul ne change pas la détection
    r = calibrate.report()
    assert r["total"] == 2 and r["dislikes"] == 2


def test_ai_budget_pause(fresh_db, monkeypatch):
    monkeypatch.setattr(ai, "configured", lambda: True)
    assert ai.available()[0]
    db.insert("ai_costs", {"ts": time.time(), "model": "m", "purpose": "clip", "in_tok": 1, "out_tok": 1, "cost": 99.0})
    ok, why = ai.available()
    assert not ok and "budget" in why
    assert db.val("SELECT COUNT(*) FROM alerts WHERE kind='ai_budget'") == 1


def test_facecam_frame_found_despite_static_lines_inside():
    """Le cadre de la webcam (bords fixes) est retrouvé même si un objet fixe (lampe, étagère) traverse l'image de la cam."""
    import numpy as np
    from clipbot import facecam
    rng = np.random.default_rng(0)
    frames = []
    for _ in range(10):
        blocks = rng.integers(0, 255, (9, 13), dtype=np.uint8)    # « jeu » : formes qui changent et bougent à chaque image
        ox, oy = rng.integers(0, 50, 2)
        f = np.kron(blocks, np.ones((50, 60), np.uint8))[oy:oy + 360, ox:ox + 640].copy()
        f[40:160, 30:230] = 90                                      # webcam : fond fixe
        f[40:160, 30:33] = 255; f[40:160, 228:231] = 255            # bordure
        f[40:43, 30:231] = 255; f[158:161, 30:231] = 255
        f[40:160, 60:63] = 230                                      # lampe verticale fixe à l'intérieur
        frames.append(f)
    r = facecam.refine_rect(np.array(frames), mx=140, my=95, fw=40, fh=40)
    assert r and abs(r[0] - 30) <= 4 and abs(r[2] - 230) <= 4 and abs(r[1] - 40) <= 4 and abs(r[3] - 160) <= 4
