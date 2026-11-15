"""Démo phase 1 : faux stream → capture → détection → extraction → montage."""
import sys, time, threading
from pathlib import Path
from clipbot import db, paths, settings, capture, analyze, detect, editor, facecam
from clipbot.chat import hub

src = sys.argv[1]
db.init()
cfg = settings.all()
cap = capture.StreamCapture("fakestreamer", src)
cap.start()
t0 = time.time()
det = detect.Detector(lambda a, b: hub.window("fakestreamer", a, b))
done, prev, moments = set(), None, []

def chat_sim():
    import random
    while time.time() - t0 < 85:
        el = time.time() - t0
        hot = 46 <= el <= 62           # le chat réagit ~5 s après l'action
        for _ in range(random.randint(4, 8) if hot else (1 if random.random() < 0.3 else 0)):
            hub.feed("fakestreamer", random.choice(["KEKW", "OMEGALUL", "CLIP IT", "???", "NO WAY"]) if hot else "salut")
        time.sleep(0.5)
threading.Thread(target=chat_sim, daemon=True).start()

while time.time() - t0 < 95 and not (cap.ended and time.time() - t0 > 92):
    for s in cap.snapshot():
        if s.path not in done:
            done.add(s.path)
            dbv, hf, mv, prev = analyze.segment_features(str(s.path), prev)
            det.add_segment(s.wall_start, dbv, hf, mv)
    for m in det.step(time.time(), cfg):
        print(f"MOMENT {m.start - t0:.1f}s → {m.end - t0:.1f}s score={m.score} {m.signals}")
        moments.append(m)
    time.sleep(1)
print("segments:", len(done), "offset:", round(cap.offset - t0, 2), "courbe:", det.recent(30)[-12:])
assert moments, "aucun moment détecté"
m = moments[0]
segs = cap.covering(m.start, m.end)
raw = paths.RAW / "demo.mp4"
assert capture.extract(segs, raw)
base = segs[0].wall_start
cap.stop()
fc = facecam.detect(str(raw))
print("facecam:", fc)
words = [{"w": w, "s": m.start - base + 2 + i * 0.45, "e": m.start - base + 2.4 + i * 0.45} for i, w in enumerate("no way bro what is that let's go that is insane".split())]
for name, fcam in (("demo_flou", None), ("demo_facecam", {"x": 0.0, "y": 0.0, "w": 0.3, "h": 0.316})):
    t = time.time()
    job = editor.EditJob(raw=str(raw), out=str(paths.CLIPS / f"{name}.mp4"), t_in=m.start - base, t_out=m.end - base,
        words=words, peaks=[m.peak_t - base], facecam=fcam, title="Il n'en revient pas", hook="Attends la fin…",
        credit="twitch.tv/fakestreamer", teaser="La suite → Ép. 2", sub_style=settings.ACCOUNT_DEFAULTS["sub_style"],
        title_style=settings.ACCOUNT_DEFAULTS["title_style"], thumb=str(paths.THUMBS / f"{name}.jpg"))
    print(name, editor.render(job), f"{time.time() - t:.1f}s", editor.probe(job.out))
