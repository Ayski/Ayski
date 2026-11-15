"""Chef d'orchestre : surveillance des streams, détection, puis files séparées
(transcription → IA → montage → upload). Tout l'état est en base : reprise automatique après plantage."""
import queue
import re
import shutil
import threading
import time
from pathlib import Path

from . import ai, analyze, capture, db, detect, editor, facecam, paths, series, settings, subtitles, sysinfo, tiktok, transcribe, twitch
from .chat import hub
from .logbus import alert, error, log, prune, warn

FINAL = ("ready", "queued", "uploading", "uploaded_private", "published")


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (s or "clip").lower().encode("ascii", "ignore").decode())[:40].strip("-") or "clip"


def _rm(p) -> None:
    """Suppression tolérante : sous Windows un fichier ouvert (lecteur vidéo, ffmpeg) ne peut pas être supprimé."""
    try:
        Path(p).unlink(missing_ok=True)
    except OSError:
        pass


def story_cfg(cfg: dict, login: str) -> dict:
    """Histoire en cours chez ce streamer : seuil de détection abaissé pour ne pas rater les épisodes suivants."""
    if cfg.get("series_boost") and cfg.get("series_enabled") and db.val(
            "SELECT COUNT(*) FROM series WHERE streamer=? AND status='open'", [login], 0):
        return {**cfg, "detect_threshold": round(cfg["detect_threshold"] * 0.75, 3)}
    return cfg


def day_start() -> float:
    lt = time.localtime()
    return time.mktime((lt.tm_year, lt.tm_mon, lt.tm_mday, 0, 0, 0, 0, 0, -1))


def account_for(streamer: dict | None, lang: str) -> dict | None:
    accs = db.q("SELECT * FROM accounts WHERE connected=1 ORDER BY id")
    if streamer and streamer.get("account_id"):
        a = next((a for a in accs if a["id"] == streamer["account_id"]), None)
        if a:
            return a
    cfg = settings.all()
    same = [a for a in accs if a["lang"] == lang]
    if cfg["test_mode"]:
        same.sort(key=lambda a: not a["is_test"])
    else:
        same.sort(key=lambda a: bool(a["is_test"]))
    return same[0] if same else None


def upload_allowed(acc: dict, cfg: dict) -> bool:
    if cfg["test_mode"]:
        return bool(cfg["test_upload"] and acc["is_test"])
    return True


class StreamWorker:
    def __init__(self, engine: "Engine", login: str, lang: str, user_id: str = "", source: str | None = None,
                 viewers: int = 0) -> None:
        self.engine, self.login, self.lang, self.user_id, self.viewers = engine, login, lang, user_id, viewers
        self.cap = capture.StreamCapture(login, source)
        row = db.one("SELECT audio_mean,audio_std FROM streamers WHERE login=?", [login]) or {}
        self.det = detect.Detector(lambda a, b: hub.window(login, a, b), row.get("audio_mean"), row.get("audio_std"))
        self._stop = threading.Event()
        self._done: set = set()
        self._prev = None
        self._seen_clips: set[str] = set()
        self._last_clip_poll = time.time()
        self._last_save = time.time()
        self._last_follow = time.time()
        self.started = time.time()
        self.moments = 0
        self.thread = threading.Thread(target=self._run, name=f"det-{login}", daemon=True)

    def start(self) -> None:
        self.cap.start()
        self.thread.start()

    def stop(self) -> None:
        self._stop.set()
        self.cap.stop()
        self._save_stats()

    def _save_stats(self) -> None:
        if self.det.loud.n > 60:
            db.update("streamers", "login", self.login, {"audio_mean": round(self.det.loud.mean, 2),
                                                         "audio_std": round(self.det.loud.std, 2)})

    def _run(self) -> None:
        while not self._stop.is_set():
            try:
                self._tick()
            except Exception as e:
                error("détection", f"{self.login}: {e!r}")
            self._stop.wait(1.0)

    def _tick(self) -> None:
        cfg = settings.all()
        for s in self.cap.snapshot():
            if s.path in self._done:
                continue
            self._done.add(s.path)
            if not s.path.exists():
                continue
            db_, hf, mv, self._prev = analyze.segment_features(str(s.path), self._prev)
            self.det.add_segment(s.wall_start, db_, hf, mv)
        if len(self._done) > 400:
            live = {s.path for s in self.cap.snapshot()}
            self._done &= live
        if self.user_id and time.time() - self._last_clip_poll > 75 and twitch.configured():
            self._last_clip_poll = time.time()
            self._poll_viewer_clips(cfg)
        for m in self.det.step(time.time(), story_cfg(cfg, self.login)):
            self.engine.on_moment(self, m, cfg)
        every = cfg["series_follow_minutes"] * 60
        if cfg["series_enabled"] and every > 0 and time.time() - self._last_follow > every:
            self._last_follow = time.time()
            self._follow_story(cfg, every)
        if time.time() - self._last_save > 300:
            self._last_save = time.time()
            self._save_stats()

    def _follow_story(self, cfg: dict, every: float) -> None:
        """Une histoire est ouverte et rien n'a été clippé récemment : on soumet le meilleur passage à l'IA."""
        if not db.val("SELECT COUNT(*) FROM series WHERE streamer=? AND status='open'", [self.login], 0):
            return
        if db.val("SELECT COUNT(*) FROM clips WHERE streamer=? AND created_at>?", [self.login, time.time() - every], 0):
            return
        m = self.det.force_follow(cfg)
        if m:
            self.engine.on_moment(self, m, cfg)

    def _poll_viewer_clips(self, cfg: dict) -> None:
        try:
            clips = twitch.clips(self.user_id, time.time() - 900)
        except twitch.TwitchError as e:
            warn("twitch", f"Clips de {self.login} indisponibles : {e}")
            return
        for c in clips:
            if c["id"] in self._seen_clips:
                continue
            self._seen_clips.add(c["id"])
            if db.one("SELECT id FROM viewer_clips WHERE id=?", [c["id"]]):
                continue
            db.insert("viewer_clips", {"id": c["id"], "streamer": self.login, "created_at": c["created_ts"],
                                       "duration": c.get("duration", 0), "views": c.get("view_count", 0),
                                       "url": c.get("url", ""), "title": c.get("title", "")}, replace=True)
            if c["created_ts"] < self.started:
                continue
            log("détection", f"{self.login}: clip créé par un viewer (« {c.get('title', '')[:40]} »)")
            self.det.add_viewer_clip(c["created_ts"])
            if self.det.cursor and c["created_ts"] - 3 < self.det.cursor:      # passage déjà analysé
                m = self.det.force_from_clip(c["created_ts"], cfg)
                if m:
                    self.engine.on_moment(self, m, cfg)

    def info(self) -> dict:
        return {"login": self.login, "lang": self.lang, "viewers": self.viewers, "state": self.cap.state,
                "score": round(self.det.current, 3), "curve": self.det.recent(60), "moments": self.moments,
                "chat_per_min": round(hub.rate(self.login), 1), "since": self.started,
                "active": self.det.active is not None, "restarts": self.cap.restarts}


class Engine:
    def __init__(self) -> None:
        self.workers: dict[str, StreamWorker] = {}
        self.q_tr: queue.Queue = queue.Queue()
        self.q_ai: queue.Queue = queue.Queue()
        self.q_edit: queue.Queue = queue.Queue()
        self._queued: set[tuple[str, int]] = set()
        self._lock = threading.RLock()
        self._started = False
        self._stop = threading.Event()
        self.modules = {k: {"state": "attente", "detail": "démarrage…"} for k in ("surveillance", "détection", "ia", "montage", "upload")}
        self.busy = {"transcription": 0, "ia": 0, "montage": 0, "upload": 0}
        self._last_poll = 0.0
        self._poll_now = threading.Event()
        self._acc_cooldown: dict[int, float] = {}
        self.test_sources: dict[str, dict] = {}       # login -> {source, lang} (flux de test depuis un fichier)
        self.test_state: dict[str, dict] = {}
        self.last_stats = 0.0
        self.last_suggest = 0.0

    # ------------------------------------------------------------------ cycle de vie
    def start(self) -> None:
        if self._started:
            return
        self._started = True
        paths.ensure_dirs()
        db.init()
        self._cleanup_boot()
        hub.start()
        rec = sysinfo.recommend()
        specs = [("superviseur", self._supervisor, 1), ("transcription", lambda: self._worker(self.q_tr, self._do_transcribe, "transcription"), 1),
                 ("ia", lambda: self._worker(self.q_ai, self._do_ai, "ia"), 2),
                 ("montage", lambda: self._worker(self.q_edit, self._do_edit, "montage"), rec["edit_workers"]),
                 ("upload", self._uploader, 1), ("maintenance", self._maintenance, 1), ("stats", self._periodic, 1)]
        for name, fn, n in specs:
            for i in range(n):
                threading.Thread(target=fn, name=f"{name}-{i}", daemon=True).start()
        self._resume()
        log("système", f"Bot prêt — {rec['edit_workers']} montage(s) en parallèle, encodeur {rec['encoder']}")

    def shutdown(self) -> None:
        self._stop.set()
        for w in list(self.workers.values()):
            w.stop()
        hub.stop()

    def set_running(self, on: bool) -> None:
        settings.put({"running": bool(on)})
        log("système", "Démarrage de la surveillance" if on else "Mise en pause")
        self._poll_now.set()

    def refresh(self) -> None:
        self._poll_now.set()

    def _cleanup_boot(self) -> None:
        shutil.rmtree(paths.BUFFERS, ignore_errors=True)
        shutil.rmtree(paths.WORK, ignore_errors=True)
        paths.ensure_dirs()
        for f in paths.CLIPS.rglob("*.tmp.mp4"):
            _rm(f)
        db.ex("UPDATE streamers SET is_live=0")

    def _resume(self) -> None:
        """Reprise après plantage : on remet en file tout ce qui était en cours."""
        n = 0
        for c in db.q("SELECT id,status,publish_id FROM clips WHERE status IN ('detected','transcribing','analyzing','editing','uploading')"):
            if c["status"] in ("detected", "transcribing"):
                self.enqueue("tr", c["id"])
            elif c["status"] == "analyzing":
                self.enqueue("ai", c["id"])
            elif c["status"] == "editing":
                self.enqueue("edit", c["id"])
            elif c["status"] == "uploading" and not c["publish_id"]:
                db.clip_update(c["id"], status="queued")
            n += 1
        if n:
            log("système", f"Reprise : {n} clip(s) en cours remis en file")

    def enqueue(self, kind: str, clip_id: int) -> None:
        with self._lock:
            if (kind, clip_id) in self._queued:
                return
            self._queued.add((kind, clip_id))
        {"tr": self.q_tr, "ai": self.q_ai, "edit": self.q_edit}[kind].put(clip_id)

    def _worker(self, q: queue.Queue, fn, name: str) -> None:
        kind = {"transcription": "tr", "ia": "ai", "montage": "edit"}[name]
        while not self._stop.is_set():
            try:
                clip_id = q.get(timeout=1)
            except queue.Empty:
                continue
            with self._lock:
                self._queued.discard((kind, clip_id))
                self.busy[name] += 1
            try:
                fn(clip_id)
            except Exception as e:
                error(name, f"clip {clip_id}: {e!r}")
                c = db.one("SELECT retries FROM clips WHERE id=?", [clip_id])
                if c and c["retries"] < 3:
                    db.clip_update(clip_id, retries=c["retries"] + 1, error=str(e)[:300])
                    threading.Timer(30 * (c["retries"] + 1), self.enqueue, [kind, clip_id]).start()
                elif c:
                    db.clip_update(clip_id, status="failed", error=str(e)[:300])
                    alert("error", f"Clip {clip_id} en échec ({name}) : {str(e)[:120]}")
            finally:
                with self._lock:
                    self.busy[name] -= 1

    # ------------------------------------------------------------------ surveillance
    def max_streams(self, cfg: dict) -> int:
        return cfg["max_streams"] or sysinfo.recommend()["max_streams"]

    def _supervisor(self) -> None:
        while not self._stop.is_set():
            cfg = settings.all()
            due = time.time() - self._last_poll >= cfg["poll_minutes"] * 60
            if self._poll_now.is_set() or due or not cfg["running"]:
                self._poll_now.clear()
                try:
                    self._poll(cfg)
                except twitch.TwitchError as e:
                    self.modules["surveillance"] = {"state": "erreur", "detail": str(e)}
                    warn("surveillance", str(e))
                except Exception as e:
                    self.modules["surveillance"] = {"state": "erreur", "detail": repr(e)}
                    error("surveillance", repr(e))
                self._last_poll = time.time()
            for login, w in list(self.workers.items()):       # stream terminé / perdu
                if w.cap.ended:
                    if login in self.test_sources:
                        threading.Timer(25, self._finish_test, [login]).start()
                        w.cap.ended = False
                        continue
                    self._stop_worker(login)
                    self._poll_now.set() if cfg["running"] and login not in self.test_sources else None
            self._poll_now.wait(5)

    def _stop_worker(self, login: str) -> None:
        w = self.workers.pop(login, None)
        if w:
            w.stop()
            log("surveillance", f"Arrêt de la surveillance de {login}")
        hub.set_channels({l for l in self.workers if l not in self.test_sources})

    def _start_worker(self, login: str, lang: str, user_id: str, viewers: int, source: str | None = None) -> None:
        w = StreamWorker(self, login, lang, user_id, source, viewers)
        self.workers[login] = w
        w.start()
        log("surveillance", f"Surveillance de {login} ({lang}, {viewers} viewers)")

    def _poll(self, cfg: dict) -> None:
        if not cfg["running"]:
            for login in list(self.workers):
                self._stop_worker(login)
            self.modules["surveillance"] = {"state": "pause", "detail": ""}
            self.modules["détection"] = {"state": "pause", "detail": ""}
            return
        wanted: dict[str, dict] = {}
        for login, t in self.test_sources.items():
            wanted[login] = {"lang": t["lang"], "user_id": "", "viewers": 0, "source": t["source"], "rank": (-1, 0, 0)}
        if twitch.configured():
            gid = twitch.game_id(cfg["game"])
            rows = {r["login"]: r for r in db.q("SELECT * FROM streamers")}
            now = time.time()
            live_all: dict[str, dict] = {}
            for lang in cfg["languages"]:
                for s in twitch.streams_for_game(gid, lang):
                    live_all[s["user_login"]] = s
                    db.insert("snapshots", {"ts": now, "login": s["user_login"], "lang": lang, "viewers": s["viewer_count"],
                                            "game": s.get("game_name", "")})
            targets = [l for l, r in rows.items() if r["status"] in ("target", "priority")]
            missing = [l for l in targets if l not in live_all]
            tlive = {s["user_login"]: s for s in twitch.streams_for_logins(missing)} if missing else {}
            db.ex("UPDATE streamers SET is_live=0, viewers=0")
            for login, s in {**tlive, **live_all}.items():
                if login in rows:
                    db.update("streamers", "login", login, {"is_live": 1, "viewers": s["viewer_count"], "game": s.get("game_name", ""),
                                                            "title": s.get("title", ""), "updated_at": now})
            for login, s in live_all.items():
                r = rows.get(login)
                st = r["status"] if r else "auto"
                if st == "excluded":
                    continue
                lang = (r or {}).get("lang") or s["language"]
                # stabilité : un stream déjà surveillé est gardé tant qu'il reste au-dessus de la moitié du seuil,
                # et il passe avant les nouveaux venus (sinon le bot change de cible à chaque variation de viewers)
                thr = cfg["viewer_thresholds"].get(s["language"], 10**9)
                watched = login in self.workers
                if st in ("target", "priority") or s["viewer_count"] >= (thr * 0.5 if watched else thr):
                    wanted[login] = {"lang": lang, "user_id": s["user_id"], "viewers": s["viewer_count"], "source": None,
                                     "rank": ({"priority": 0, "target": 1}.get(st, 2), 0 if watched else 1, -s["viewer_count"]),
                                     "name": s.get("user_name", login)}
            self.modules["surveillance"] = {"state": "ok", "detail": f"{len(live_all)} streams « {cfg['game']} » en direct"}
        elif not self.test_sources:
            self.modules["surveillance"] = {"state": "attente", "detail": "Clés Twitch manquantes (Système → Clés API)"}
            self.modules["détection"] = {"state": "attente", "detail": ""}
            return
        else:
            self.modules["surveillance"] = {"state": "ok", "detail": "flux de test uniquement (clés Twitch manquantes)"}
        keep = dict(sorted(wanted.items(), key=lambda kv: kv[1]["rank"])[: self.max_streams(cfg)])
        for login in [l for l in self.workers if l not in keep]:
            self._stop_worker(login)
        for login, info in keep.items():
            if login in self.workers:
                self.workers[login].viewers = info["viewers"]
                continue
            if not db.one("SELECT login FROM streamers WHERE login=?", [login]):
                db.insert("streamers", {"login": login, "user_id": info["user_id"], "display_name": info.get("name", login),
                                        "lang": info["lang"], "status": "auto", "added_at": time.time(), "is_live": 1,
                                        "viewers": info["viewers"]})
            self._start_worker(login, info["lang"], info["user_id"], info["viewers"], info["source"])
        hub.set_channels({l for l in self.workers if l not in self.test_sources})
        self.modules["détection"] = {"state": "ok" if self.workers else "attente",
                                     "detail": f"{len(self.workers)}/{self.max_streams(cfg)} streams analysés"}

    # ------------------------------------------------------------------ moment détecté
    def on_moment(self, w: StreamWorker, m: detect.Moment, cfg: dict) -> None:
        srow = db.one("SELECT * FROM streamers WHERE login=?", [w.login]) or {}
        today = db.val("SELECT COUNT(*) FROM clips WHERE streamer=? AND created_at>=? AND status NOT IN ('rejected','deleted')",
                       [w.login, day_start()], 0)
        if today >= (srow.get("max_clips_day") or 10):
            return
        segs = w.cap.covering(m.start - 0.5, m.end + 0.5)
        if not segs:
            warn("détection", f"{w.login}: moment hors du buffer, ignoré")
            return
        clip_id = db.insert("clips", {"streamer": w.login, "lang": w.lang, "created_at": time.time(), "t_start": m.start,
                                      "t_end": m.end, "duration": round(m.end - m.start, 1), "status": "detected",
                                      "score": m.score, "signals": m.signals})
        raw = paths.RAW / f"{clip_id}.mp4"
        if not capture.extract(segs, raw):
            db.clip_update(clip_id, status="failed", error="extraction du buffer impossible")
            return
        base = segs[0].wall_start
        lag = cfg["chat_lag"]
        n, r = hub.window(w.login, m.start + lag, m.end + lag + 5)
        lines = hub.texts(w.login, m.start + lag, m.end + lag + 5, 50)
        summary = f"{n} messages dont {r} réactions en {m.end - m.start:.0f} s (habituel : {hub.rate(w.login, 600):.0f}/min)\n" + "\n".join(lines)
        peaks = [round(m.peak_t - base, 2)] + [round(p - base, 2) for p in m.peaks if abs(p - m.peak_t) > 2]
        db.clip_update(clip_id, raw_path=str(raw), raw_in=round(max(0, m.start - base), 2),
                       raw_out=round(m.end - base, 2), peaks=peaks, chat_summary=summary[:6000])
        w.moments += 1
        log("détection", f"{w.login}: moment fort détecté (score {m.score}, {m.end - m.start:.0f} s)"
            + (" — suivi d'histoire" if m.signals.get("follow") else " — clip viewer" if m.forced else ""))
        self.enqueue("tr", clip_id)

    # ------------------------------------------------------------------ transcription
    def _do_transcribe(self, clip_id: int) -> None:
        c = db.one("SELECT * FROM clips WHERE id=?", [clip_id])
        if not c or c["status"] not in ("detected", "transcribing"):
            return
        db.clip_update(clip_id, status="transcribing")
        cfg = story_cfg(settings.all(), c["streamer"])
        tr = transcribe.transcribe(c["raw_path"], c["lang"])
        inside = " ".join(w["w"] for w in tr["words"] if c["raw_in"] - 1 <= w["s"] <= c["raw_out"] + 1)
        kws = cfg["keywords"].get(tr.get("language") or c["lang"], cfg["keywords"].get(c["lang"], []))
        ks, hits = detect.keyword_score(inside, kws)
        sig = dict(c["signals"] or {})
        sig["keywords"] = round(ks, 3)
        score = round(detect.combine(sig, cfg["weights"]), 3)
        upd = {"transcript": tr, "signals": sig, "score": score}
        if score < cfg["detect_threshold"] and not sig.get("viewer_clip") and not sig.get("follow"):
            db.clip_update(clip_id, status="rejected", error=f"score final {score} sous le seuil {cfg['detect_threshold']}", **upd)
            return
        db.clip_update(clip_id, status="analyzing", **upd)
        self.enqueue("ai", clip_id)

    # ------------------------------------------------------------------ IA
    def _do_ai(self, clip_id: int) -> None:
        c = db.one("SELECT * FROM clips WHERE id=?", [clip_id])
        if not c or c["status"] != "analyzing":
            return
        cfg = settings.all()
        srow = db.one("SELECT * FROM streamers WHERE login=?", [c["streamer"]]) or {"login": c["streamer"]}
        is_child = bool(c["parent_id"])
        acc = db.one("SELECT * FROM accounts WHERE id=?", [c["account_id"]]) if c["account_id"] else account_for(srow, c["lang"])
        target = c["target_lang"] or (acc["lang"] if acc else c["lang"])
        aset = settings.account_settings(acc) if acc else settings.ACCOUNT_DEFAULTS
        tr = c["transcript"] or {}
        ok, why = ai.available()
        self.modules["ia"] = {"state": "ok" if ok else "pause", "detail": why}
        if not ok and ai.configured() and cfg["ai_enabled"]:
            # budget atteint : le clip attend (aucun clip perdu), nouvel essai plus tard
            threading.Timer(600, self.enqueue, ["ai", clip_id]).start()
            return
        res = None
        if ok:
            frames = editor.keyframes_jpeg(c["raw_path"], c["raw_in"], c["raw_out"], 5)
            res = ai.analyze_clip(streamer=srow.get("display_name") or c["streamer"], lang=c["lang"], target_lang=target,
                                  frames=frames, transcript=tr, chat_lines=(c["chat_summary"] or "").split("\n"),
                                  memory=srow.get("memory") or {}, open_series=[] if is_child else series.open_series(c["streamer"]),
                                  duration=c["raw_out"] - c["raw_in"], follow=bool((c["signals"] or {}).get("follow")))
            if res is None and ai.available()[0]:
                raise RuntimeError("analyse IA indisponible")
        if res is not None:
            a = res.model_dump()
            a["recap"] = a["series"]["recap"]
        else:
            a = ai.fallback_analysis(srow.get("display_name") or c["streamer"], tr, c["score"] or 0, target)
        threshold = srow.get("interest_threshold") or cfg["ai_threshold"]
        opened_ids = {s["id"] for s in series.open_series(c["streamer"])}
        if res is not None and cfg["series_boost"] and a["series"]["part_of_series"] and a["series"]["existing_series_id"] in opened_ids:
            threshold = max(1, threshold - 2)       # suite d'une histoire en cours : on est moins exigeant sur la note
        elif res is not None and (c["signals"] or {}).get("follow") and not is_child:
            db.clip_update(clip_id, status="rejected", error="suivi d'histoire : ce passage ne fait pas avancer l'histoire",
                           ai=a, rating=a["rating"], category=a["category"], title=a["title"])
            return
        upd = {"ai": a, "rating": a["rating"], "category": a["category"], "title": a["title"], "hook": a["hook"],
               "account_id": acc["id"] if acc else None, "target_lang": target}
        if not a.get("no_ai") and a["rating"] < threshold and not is_child:
            db.clip_update(clip_id, status="rejected", error=f"note IA {a['rating']}/10 sous le seuil {threshold}", **upd)
            log("ia", f"{c['streamer']}: clip rejeté ({a['rating']}/10) — {a['description'][:80]}")
            return
        if a["category"] not in aset["categories"] and not is_child:
            db.clip_update(clip_id, status="rejected", error=f"catégorie « {a['category']} » non autorisée sur ce compte", **upd)
            return
        sid, ep = c["series_id"], c["episode"]
        if res is not None and not is_child:
            mem = dict(srow.get("memory") or {})
            mu = a["memory"]
            mem.update(character=mu["character"], goals=mu["goals"], summary=mu["summary"],
                       events=(mem.get("events", []) + [e for e in mu["new_events"] if e])[-15:])
            db.update("streamers", "login", c["streamer"], {"memory": mem})
            if not sid and aset["series"]:
                sid, ep = series.assign(c, srow, a["series"], mu["summary"])
            if (not sid and cfg["series_only"] and cfg["series_enabled"] and aset["series"] and srow.get("series_enabled", 1)
                    and a["rating"] < cfg["solo_min_rating"]):
                db.clip_update(clip_id, status="rejected", error="clip isolé, hors histoire (mode séries uniquement)", **upd)
                log("ia", f"{c['streamer']}: clip isolé écarté ({a['rating']}/10) — {a['description'][:80]}")
                return
        upd.update(series_id=sid, episode=ep)
        db.clip_update(clip_id, **upd)
        c = db.one("SELECT * FROM clips WHERE id=?", [clip_id])
        self._write_description(c, aset)
        log("ia", f"{c['streamer']}: « {a['title']} » — {a['rating']}/10, {a['category']}" + (f", série ép. {ep}" if sid else ""))
        db.clip_update(clip_id, status="editing")
        self.enqueue("edit", clip_id)
        if sid and ep and ep > 1 and not is_child:       # l'épisode précédent gagne un teaser « La suite → »
            for p in db.q("SELECT id FROM clips WHERE series_id=? AND episode=? AND status IN ('ready','queued')", [sid, ep - 1]):
                self.reedit(p["id"])
        # meilleurs clips publiés aussi sur le compte de l'autre langue, sous-titres traduits
        if not is_child and res is not None and a["rating"] >= cfg["cross_lang_min_rating"]:
            for other in db.q("SELECT * FROM accounts WHERE connected=1 AND lang!=?", [target]):
                if settings.account_settings(other)["cross_lang"] and not db.one(
                        "SELECT id FROM clips WHERE parent_id=? AND account_id=?", [clip_id, other["id"]]):
                    child = {k: c[k] for k in ("streamer", "lang", "t_start", "t_end", "duration", "score", "signals", "peaks",
                                               "raw_path", "raw_in", "raw_out", "transcript", "chat_summary", "series_id", "episode")}
                    cid = db.insert("clips", {**child, "created_at": time.time(), "status": "analyzing", "parent_id": clip_id,
                                              "account_id": other["id"], "target_lang": other["lang"]})
                    self.enqueue("ai", cid)

    def _write_description(self, c: dict, aset: dict) -> None:
        a = c["ai"] or {}
        st = series.texts_for(c)
        desc, tags = ai.build_description(a.get("caption") or c["title"] or "", c["streamer"], c["target_lang"] or c["lang"],
                                          a.get("hashtags", []), aset["fixed_hashtags"], st.get("hashtag", ""), st.get("prefix", ""))
        db.clip_update(c["id"], description=desc, hashtags=tags)

    # ------------------------------------------------------------------ montage
    def reedit(self, clip_id: int) -> None:
        db.clip_update(clip_id, status="editing", error=None)
        self.enqueue("edit", clip_id)

    def reanalyze(self, clip_id: int) -> None:
        db.clip_update(clip_id, status="analyzing", error=None)
        self.enqueue("ai", clip_id)

    def _facecam(self, login: str, raw: str) -> dict | None:
        row = db.one("SELECT facecam FROM streamers WHERE login=?", [login]) or {}
        fc = row.get("facecam") or {}
        if isinstance(fc, dict) and fc.get("v") == 2 and time.time() - fc.get("ts", 0) < 6 * 3600:
            return fc.get("rect")
        rect = facecam.detect(raw)
        db.update("streamers", "login", login, {"facecam": {"ts": time.time(), "rect": rect, "v": 2}})
        return rect

    def _do_edit(self, clip_id: int) -> None:
        c = db.one("SELECT * FROM clips WHERE id=?", [clip_id])
        if not c or c["status"] != "editing":
            return
        if not c["raw_path"] or not Path(c["raw_path"]).exists():
            db.clip_update(clip_id, status="failed", error="extrait brut supprimé : re-montage impossible")
            return
        cfg = settings.all()
        acc = db.one("SELECT * FROM accounts WHERE id=?", [c["account_id"]]) if c["account_id"] else None
        aset = settings.account_settings(acc) if acc else settings.ACCOUNT_DEFAULTS
        a = c["ai"] or {}
        tr = c["transcript"] or {}
        target = c["target_lang"] or c["lang"]
        words = tr.get("words", [])
        tl = {x["i"]: x["text"] for x in a.get("translated_lines", [])}
        if tl and tr.get("segments"):
            words = subtitles.spread_words([{**s, "text": tl.get(i, s["text"])} for i, s in enumerate(tr["segments"])])
        st = series.texts_for(c)
        max_d = min(cfg["max_duration"], aset["max_duration"])
        t_out = min(c["raw_out"], c["raw_in"] + max_d)
        folder = paths.CLIPS / c["streamer"]
        name = f"{time.strftime('%Y-%m-%d', time.localtime(c['created_at']))}_{clip_id:05d}_{_slug(c['title'])}"
        out = folder / f"{name}.mp4"
        thumb = paths.THUMBS / f"{clip_id}.jpg"
        job = editor.EditJob(
            raw=c["raw_path"], out=str(out), t_in=c["raw_in"], t_out=t_out, words=words, peaks=c["peaks"] or [],
            facecam=self._facecam(c["streamer"], c["raw_path"]), title=st.get("video_title") or c["title"] or "",
            hook=c["hook"] or "", credit=f"twitch.tv/{c['streamer']}", recap=st.get("recap", ""), teaser=st.get("teaser", ""),
            sub_style=aset["sub_style"], title_style=aset["title_style"], quality=cfg["export_quality"], encoder=cfg["encoder"],
            jump_cuts=cfg["jump_cuts"], zooms=cfg["zooms"], opening=cfg["opening_mode"],
            min_duration=min(max_d, max(cfg["min_duration"], aset["min_duration"], cfg["ideal_min"])), thumb=str(thumb))
        t0 = time.time()
        res = editor.render(job)
        if c["final_path"] and c["final_path"] != str(out):
            _rm(c["final_path"])
            _rm(Path(c["final_path"]).with_suffix(".txt"))
        self._write_description(c, aset)
        c = db.one("SELECT * FROM clips WHERE id=?", [clip_id])
        out.with_suffix(".txt").write_text(c["description"] or "", encoding="utf-8")
        status = "queued" if acc and upload_allowed(acc, cfg) and c["feedback"] != -1 else "ready"
        if db.val("SELECT status FROM clips WHERE id=?", [clip_id]) != "editing":      # supprimé / modifié entre-temps
            return
        db.clip_update(clip_id, status=status, final_path=str(out), thumb_path=str(thumb), duration=res["duration"],
                       error=None, retries=0)
        a["edit"] = res
        db.clip_update(clip_id, ai=a)
        log("montage", f"{c['streamer']}: clip prêt « {c['title']} » ({res['duration']} s, {res['layout']}, {time.time() - t0:.0f} s de rendu)")

    # ------------------------------------------------------------------ upload
    def _pick(self, acc: dict, cfg: dict) -> dict | None:
        aset = settings.account_settings(acc)
        now = time.time()
        forced = db.q("SELECT * FROM clips WHERE account_id=? AND force_upload=1 AND status IN ('ready','queued') AND next_try_at<=? ORDER BY id",
                      [acc["id"], now])
        if forced:
            return forced[0]
        if not upload_allowed(acc, cfg) or now < self._acc_cooldown.get(acc["id"], 0):
            return None
        done_today = db.val("SELECT COUNT(*) FROM clips WHERE account_id=? AND uploaded_at>=?", [acc["id"], day_start()], 0)
        last = db.val("SELECT MAX(uploaded_at) FROM clips WHERE account_id=?", [acc["id"]], 0)
        gap_ok = now - last >= aset["min_gap_minutes"] * 60
        if done_today >= aset["clips_per_day"] or now - last < min(aset["min_gap_minutes"], aset["series_episode_gap_minutes"]) * 60:
            return None
        if aset["use_best_hours"] and time.localtime().tm_hour not in cfg["best_hours"].get(acc["lang"], list(range(24))):
            return None
        cands = [c for c in db.q("SELECT * FROM clips WHERE account_id=? AND status='queued' AND next_try_at<=?", [acc["id"], now])
                 if series.can_upload(c)]
        if not cands:
            return None
        # série entamée sur ce compte : on la termine, épisode par épisode, avant tout autre clip
        for r in db.q("SELECT DISTINCT series_id FROM clips WHERE account_id=? AND series_id IS NOT NULL "
                      "AND status IN ('uploading','uploaded_private','published')", [acc["id"]]):
            nxt = [c for c in cands if c["series_id"] == r["series_id"]]         # épisodes suivants : écart court propre aux séries
            if nxt:
                ok = now - last >= aset["series_episode_gap_minutes"] * 60
                return min(nxt, key=lambda c: (c["episode"] or 0, c["id"])) if ok else None
            # épisode suivant en cours de montage ou d'envoi : on patiente ; sinon rien ne bloque les autres clips
            if db.val("SELECT COUNT(*) FROM clips WHERE account_id=? AND series_id=? AND status IN "
                      "('detected','transcribing','analyzing','editing','uploading')", [acc["id"], r["series_id"]], 0):
                return None
        if not gap_ok:
            return None
        ready_series = [c for c in cands if c["series_id"]]
        if ready_series:                # une série complète attend : elle passe avant les clips isolés
            return min(ready_series, key=lambda c: (c["series_id"], c["episode"] or 0, c["id"]))
        recent = {r["streamer"]: r["n"] for r in db.q(
            "SELECT streamer, COUNT(*) n FROM clips WHERE account_id=? AND uploaded_at>=? GROUP BY streamer", [acc["id"], now - 86400])}
        # mélange des streamers : d'abord ceux qu'on a le moins publiés, puis la meilleure note ; séries dans l'ordre
        cands.sort(key=lambda c: (recent.get(c["streamer"], 0), -(c["rating"] or 0), c["episode"] or 0, c["id"]))
        return cands[0]

    def _uploader(self) -> None:
        while not self._stop.is_set():
            self._stop.wait(15)
            try:
                cfg = settings.all()
                accs = db.q("SELECT * FROM accounts WHERE connected=1")
                waiting = db.val("SELECT COUNT(*) FROM clips WHERE status='queued'", [], 0)
                if not tiktok.configured() or not accs:
                    self.modules["upload"] = {"state": "attente", "detail": "aucun compte TikTok connecté"}
                elif cfg["test_mode"] and not cfg["test_upload"]:
                    self.modules["upload"] = {"state": "pause", "detail": "mode test : les clips restent en local"}
                else:
                    self.modules["upload"] = {"state": "ok", "detail": f"{waiting} clip(s) en file d'attente"}
                for c in db.q("SELECT * FROM clips WHERE status='uploading' AND publish_id IS NOT NULL"):
                    self._check_publish(c)
                for acc in accs:
                    c = self._pick(acc, cfg)
                    if c:
                        self._upload(acc, c)
            except Exception as e:
                error("upload", repr(e))

    def _upload(self, acc: dict, c: dict) -> None:
        if not c["final_path"] or not Path(c["final_path"]).exists():
            db.clip_update(c["id"], status="failed", error="fichier final introuvable")
            return
        self.busy["upload"] += 1
        back = "queued"
        try:
            db.clip_update(c["id"], status="uploading", publish_id=None)
            pid = tiktok.upload(acc["id"], c["final_path"], c["description"] or c["title"] or "",
                                settings.account_settings(acc)["privacy"])
            db.clip_update(c["id"], publish_id=pid, error=None)
            log("upload", f"Clip {c['id']} envoyé à TikTok ({acc['name']}), traitement en cours")
        except tiktok.QuotaError as e:
            self._acc_cooldown[acc["id"]] = time.time() + e.retry_after
            db.clip_update(c["id"], status=back, next_try_at=time.time() + e.retry_after, error=str(e)[:300])
            alert("tiktok_quota", f"Quota TikTok atteint sur {acc['name']} : les clips attendent en file ({e.code})", 3600)
        except tiktok.AuthError as e:
            db.clip_update(c["id"], status=back, next_try_at=time.time() + 1800, error=str(e)[:300])
            alert("upload_failed", f"Compte {acc['name']} : {e}", 3600)
            self._acc_cooldown[acc["id"]] = time.time() + 1800
        except Exception as e:
            n = (c["retries"] or 0) + 1
            if n >= 6:
                db.clip_update(c["id"], status="failed", retries=n, error=str(e)[:300], force_upload=0)
                alert("upload_failed", f"Upload du clip {c['id']} abandonné après 6 essais : {str(e)[:120]}")
            else:
                db.clip_update(c["id"], status=back, retries=n, next_try_at=time.time() + min(3600, 60 * 2 ** n), error=str(e)[:300])
                alert("upload_failed", f"Upload du clip {c['id']} échoué (essai {n}/6), nouvel essai automatique")
        finally:
            self.busy["upload"] -= 1

    def _check_publish(self, c: dict) -> None:
        try:
            st = tiktok.publish_status(c["account_id"], c["publish_id"])
        except tiktok.TikTokError as e:
            if time.time() - (c["updated_at"] or 0) > 3600:
                db.clip_update(c["id"], status="queued", publish_id=None, next_try_at=time.time() + 600, error=str(e)[:300])
            return
        s = st.get("status", "")
        if s in ("PUBLISH_COMPLETE", "SEND_TO_USER_INBOX"):
            acc = db.one("SELECT * FROM accounts WHERE id=?", [c["account_id"]]) or {}
            private = settings.account_settings(acc)["privacy"] in ("SELF_ONLY", "INBOX") if acc else True
            ids = st.get("publicaly_available_post_id") or st.get("publicly_available_post_id") or []
            db.clip_update(c["id"], status="uploaded_private" if private else "published", uploaded_at=time.time(),
                           video_id=str(ids[0]) if ids else None, force_upload=0, error=None, retries=0)
            log("upload", f"Clip {c['id']} : " + ("brouillon déposé dans la boîte de réception TikTok, à publier depuis l'appli"
                                                   if s == "SEND_TO_USER_INBOX" else f"publié sur TikTok ({'privé' if private else 'public'})"))
        elif s == "FAILED":
            reason = st.get("fail_reason", "inconnu")
            n = (c["retries"] or 0) + 1
            quota = "spam" in reason or "limit" in reason
            db.clip_update(c["id"], status="failed" if n >= 6 else "queued", publish_id=None, retries=n,
                           next_try_at=time.time() + (3600 if quota else 300), error=f"TikTok : {reason}")
            alert("tiktok_quota" if quota else "upload_failed", f"TikTok a refusé le clip {c['id']} : {reason}")

    # ------------------------------------------------------------------ tâches de fond
    def _maintenance(self) -> None:
        while not self._stop.is_set():
            self._stop.wait(60)
            try:
                cfg = settings.all()
                free = shutil.disk_usage(paths.DATA).free / 2**30
                if free < cfg["disk_min_gb"]:
                    alert("disk_full", f"Disque presque plein : {free:.1f} Go libres. Surveillance mise en pause.", 1800)
                    if cfg["running"]:
                        self.set_running(False)
                now = time.time()
                active = ("detected", "transcribing", "analyzing", "editing")
                for r in db.q("SELECT DISTINCT raw_path FROM clips WHERE raw_path IS NOT NULL"):
                    cl = db.q("SELECT status,updated_at FROM clips WHERE raw_path=?", [r["raw_path"]])
                    if any(c["status"] in active for c in cl):
                        continue
                    age_h = (now - max(c["updated_at"] or now for c in cl)) / 3600
                    dead = all(c["status"] in ("rejected", "deleted", "failed") for c in cl)
                    if age_h > (cfg["keep_rejected_hours"] if dead else cfg["keep_raw_hours"]):
                        _rm(r["raw_path"])
                        db.ex("UPDATE clips SET raw_path=NULL WHERE raw_path=?", [r["raw_path"]])
                for d in paths.WORK.iterdir() if paths.WORK.exists() else []:
                    if now - d.stat().st_mtime > 3600:
                        shutil.rmtree(d, ignore_errors=True)
                for d in paths.BUFFERS.iterdir() if paths.BUFFERS.exists() else []:
                    if d.name not in self.workers:
                        shutil.rmtree(d, ignore_errors=True)
                for cid in series.maintain():
                    if db.val("SELECT status FROM clips WHERE id=?", [cid]) in ("ready", "queued"):
                        self.reedit(cid)
                # upload activé après coup : les clips prêts récents rejoignent la file
                for acc in db.q("SELECT * FROM accounts WHERE connected=1"):
                    if upload_allowed(acc, cfg):
                        db.ex("UPDATE clips SET status='queued' WHERE status='ready' AND account_id=? AND created_at>? "
                              "AND (feedback IS NULL OR feedback>=0)", [acc["id"], now - 86400])
                db.ex("DELETE FROM snapshots WHERE ts<?", [now - 15 * 86400])
                db.ex("DELETE FROM sessions WHERE expires_at<?", [now])
                prune()
            except Exception as e:
                error("maintenance", repr(e))

    def _periodic(self) -> None:
        from . import stats, trending
        while not self._stop.is_set():
            self._stop.wait(30)
            try:
                cfg = settings.all()
                if time.time() - self.last_stats > 1800 and tiktok.configured():
                    self.last_stats = time.time()
                    stats.refresh_all()
                    if cfg["auto_adjust"]:
                        stats.apply_recommendations()
                if time.time() - self.last_suggest > cfg["suggest_minutes"] * 60 and twitch.configured():
                    self.last_suggest = time.time()
                    trending.recompute(self)
            except Exception as e:
                error("stats", repr(e))

    # ------------------------------------------------------------------ flux de test (fichier local ou VOD/clip Twitch)
    def add_test(self, source: str, lang: str = "fr", minutes: int = 15) -> str:
        """Rejoue une vidéo comme un faux direct pour calibrer la détection sans attendre un live."""
        source = source.strip().strip('"')
        login = "test_" + re.sub(r"[^a-z0-9]+", "", source.lower())[-14:]
        self.test_state[login] = {"login": login, "source": source, "state": "préparation", "detail": ""}

        def prepare() -> None:
            path = source
            try:
                if source.startswith("http"):
                    self.test_state[login].update(state="téléchargement", detail="récupération de la vidéo avec yt-dlp…")
                    out = paths.DATA / "tests" / f"{login}.mp4"
                    out.parent.mkdir(parents=True, exist_ok=True)
                    import subprocess, sys
                    r = subprocess.run([sys.executable, "-m", "yt_dlp", "-f", "best[height<=720]/best", "--download-sections",
                                        f"*0-{minutes * 60}", "--force-overwrites",
                                        "--ffmpeg-location", sysinfo.ffmpeg_bin(), "-o", str(out), source],
                                       capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=3600,
                                       creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0)
                    if r.returncode != 0 or not out.exists():
                        raise RuntimeError((r.stderr or "téléchargement impossible").strip()[-300:])
                    path = str(out)
                elif not Path(path).is_file():
                    raise RuntimeError("fichier introuvable : vérifie le chemin")
                if not db.one("SELECT login FROM streamers WHERE login=?", [login]):
                    db.insert("streamers", {"login": login, "display_name": login, "lang": lang, "status": "auto", "added_at": time.time()})
                self.test_sources[login] = {"source": path, "lang": lang}
                self.test_state[login].update(state="lecture", detail="analyse en temps réel")
                if not settings.get("running"):
                    self.set_running(True)
                self._poll_now.set()
            except Exception as e:
                self.test_state[login].update(state="erreur", detail=str(e)[:300])
                warn("test", f"Flux de test impossible : {e}")
        threading.Thread(target=prepare, name="test-prep", daemon=True).start()
        return login

    def _finish_test(self, login: str) -> None:
        if login in self.test_sources:
            self.test_sources.pop(login, None)
            self.test_state.get(login, {}).update(state="terminé", detail="lecture terminée")
            self._stop_worker(login)

    def remove_test(self, login: str) -> None:
        self.test_sources.pop(login, None)
        self.test_state.pop(login, None)
        self._stop_worker(login)

    # ------------------------------------------------------------------ état pour l'application
    def status(self) -> dict:
        cfg = settings.all()
        counts = {r["status"]: r["n"] for r in db.q("SELECT status, COUNT(*) n FROM clips GROUP BY status")}
        mods = {k: dict(v) for k, v in self.modules.items()}
        ok, why = ai.available()
        mods["ia"] = {"state": "ok" if ok else ("attente" if not ai.configured() else "pause"),
                      "detail": why or f"{self.q_ai.qsize()} en file"}
        mods["montage"] = {"state": "ok", "detail": f"{self.busy['montage']} en cours, {self.q_edit.qsize()} en file"}
        mods["détection"]["detail"] = (mods["détection"]["detail"] + f" · transcription : {self.q_tr.qsize() + self.busy['transcription']} en file").strip(" ·")
        today = db.val("SELECT COUNT(*) FROM clips WHERE created_at>=? AND status IN ('ready','queued','uploading','uploaded_private','published')",
                       [day_start()], 0)
        return {"running": cfg["running"], "test_mode": cfg["test_mode"], "game": cfg["game"], "modules": mods,
                "counts": counts, "clips_today": today, "goal": cfg["clips_per_day_goal"],
                "streams": len(self.workers), "max_streams": self.max_streams(cfg),
                "whisper": transcribe.state, "chat_connected": hub.connected,
                "alerts_unread": db.val("SELECT COUNT(*) FROM alerts WHERE read=0", [], 0)}

    def live(self) -> list[dict]:
        rows = {r["login"]: r for r in db.q("SELECT login,display_name,avatar,status FROM streamers")}
        out = []
        for login, w in list(self.workers.items()):
            i = w.info()
            r = rows.get(login, {})
            i.update(display_name=r.get("display_name") or login, avatar=r.get("avatar") or "", status=r.get("status", "auto"),
                     clips_today=db.val("SELECT COUNT(*) FROM clips WHERE streamer=? AND created_at>=?", [login, day_start()], 0))
            out.append(i)
        return sorted(out, key=lambda x: -x["score"])


engine = Engine()
