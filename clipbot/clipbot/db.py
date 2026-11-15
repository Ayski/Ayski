"""Base SQLite : un seul fichier, accès thread-safe, lignes renvoyées en dict."""
import json
import sqlite3
import threading
import time
from typing import Any, Iterable

from . import paths

_local = threading.local()
_write_lock = threading.RLock()

JSON_COLS = {"signals", "transcript", "ai", "hashtags", "memory", "settings", "details", "facecam", "value", "peaks"}

SCHEMA = """
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS streamers(
  login TEXT PRIMARY KEY, user_id TEXT, display_name TEXT, avatar TEXT, lang TEXT DEFAULT 'fr',
  followers INTEGER DEFAULT 0, status TEXT DEFAULT 'target', account_id INTEGER,
  interest_threshold REAL, max_clips_day INTEGER DEFAULT 10, series_enabled INTEGER DEFAULT 1,
  memory TEXT DEFAULT '{}', facecam TEXT, is_live INTEGER DEFAULT 0, game TEXT, viewers INTEGER DEFAULT 0,
  title TEXT, audio_mean REAL, audio_std REAL, added_at REAL, updated_at REAL);
CREATE TABLE IF NOT EXISTS snapshots(ts REAL, login TEXT, lang TEXT, viewers INTEGER, game TEXT);
CREATE INDEX IF NOT EXISTS ix_snap ON snapshots(login, ts);
CREATE TABLE IF NOT EXISTS suggestions(
  login TEXT PRIMARY KEY, display_name TEXT, avatar TEXT, lang TEXT, score REAL, details TEXT,
  ai_reason TEXT, status TEXT DEFAULT 'new', viewers INTEGER, updated_at REAL);
CREATE TABLE IF NOT EXISTS series(
  id INTEGER PRIMARY KEY AUTOINCREMENT, streamer TEXT, title TEXT, hashtag TEXT, lang TEXT,
  status TEXT DEFAULT 'open', summary TEXT, created_at REAL, updated_at REAL);
CREATE TABLE IF NOT EXISTS clips(
  id INTEGER PRIMARY KEY AUTOINCREMENT, streamer TEXT, lang TEXT, created_at REAL,
  t_start REAL, t_end REAL, duration REAL, status TEXT, score REAL, signals TEXT, peaks TEXT,
  raw_path TEXT, raw_in REAL, raw_out REAL, final_path TEXT, thumb_path TEXT,
  transcript TEXT, chat_summary TEXT, ai TEXT, rating REAL, category TEXT,
  title TEXT, hook TEXT, description TEXT, hashtags TEXT,
  series_id INTEGER, episode INTEGER, account_id INTEGER, target_lang TEXT, parent_id INTEGER,
  publish_id TEXT, video_id TEXT, feedback INTEGER, feedback_reason TEXT,
  error TEXT, retries INTEGER DEFAULT 0, next_try_at REAL DEFAULT 0, force_upload INTEGER DEFAULT 0,
  uploaded_at REAL, updated_at REAL);
CREATE INDEX IF NOT EXISTS ix_clips_status ON clips(status);
CREATE INDEX IF NOT EXISTS ix_clips_streamer ON clips(streamer, created_at);
CREATE TABLE IF NOT EXISTS accounts(
  id INTEGER PRIMARY KEY AUTOINCREMENT, open_id TEXT UNIQUE, name TEXT, avatar TEXT, lang TEXT DEFAULT 'fr',
  access_token TEXT, refresh_token TEXT, expires_at REAL, refresh_expires_at REAL, scopes TEXT,
  settings TEXT DEFAULT '{}', connected INTEGER DEFAULT 1, is_test INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0, likes INTEGER DEFAULT 0, videos INTEGER DEFAULT 0, created_at REAL);
CREATE TABLE IF NOT EXISTS account_stats(day TEXT, account_id INTEGER, followers INTEGER, likes INTEGER,
  videos INTEGER, views INTEGER, PRIMARY KEY(day, account_id));
CREATE TABLE IF NOT EXISTS tiktok_videos(
  video_id TEXT PRIMARY KEY, account_id INTEGER, clip_id INTEGER, title TEXT, cover TEXT, share_url TEXT,
  create_time REAL, duration REAL, views INTEGER DEFAULT 0, likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0, shares INTEGER DEFAULT 0, updated_at REAL);
CREATE TABLE IF NOT EXISTS video_stats(day TEXT, video_id TEXT, views INTEGER, likes INTEGER, comments INTEGER,
  shares INTEGER, PRIMARY KEY(day, video_id));
CREATE TABLE IF NOT EXISTS ai_costs(ts REAL, model TEXT, purpose TEXT, in_tok INTEGER, out_tok INTEGER, cost REAL);
CREATE TABLE IF NOT EXISTS logs(id INTEGER PRIMARY KEY AUTOINCREMENT, ts REAL, level TEXT, module TEXT, msg TEXT);
CREATE INDEX IF NOT EXISTS ix_logs_ts ON logs(ts);
CREATE TABLE IF NOT EXISTS alerts(id INTEGER PRIMARY KEY AUTOINCREMENT, ts REAL, kind TEXT, msg TEXT, read INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS viewer_clips(id TEXT PRIMARY KEY, streamer TEXT, created_at REAL, duration REAL,
  views INTEGER, url TEXT, title TEXT);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, created_at REAL, expires_at REAL);
CREATE TABLE IF NOT EXISTS calibration(id INTEGER PRIMARY KEY AUTOINCREMENT, ts REAL, clip_id INTEGER,
  feedback INTEGER, reason TEXT, details TEXT);
"""


def conn() -> sqlite3.Connection:
    c = getattr(_local, "c", None)
    if c is None or getattr(_local, "path", None) != str(paths.DB_FILE):
        paths.ensure_dirs()
        c = sqlite3.connect(paths.DB_FILE, timeout=30, check_same_thread=False)
        c.row_factory = sqlite3.Row
        c.execute("PRAGMA journal_mode=WAL")
        c.execute("PRAGMA synchronous=NORMAL")
        c.execute("PRAGMA busy_timeout=30000")
        _local.c, _local.path = c, str(paths.DB_FILE)
    return c


def init() -> None:
    with _write_lock:
        conn().executescript(SCHEMA)
        conn().commit()


def _dec(row: sqlite3.Row | None) -> dict | None:
    if row is None:
        return None
    d = dict(row)
    for k in d:
        if k in JSON_COLS and isinstance(d[k], str):
            try:
                d[k] = json.loads(d[k])
            except ValueError:
                pass
    return d


def _enc(v: Any) -> Any:
    if isinstance(v, (dict, list)):
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, bool):
        return int(v)
    return v


def q(sql: str, args: Iterable = ()) -> list[dict]:
    return [_dec(r) for r in conn().execute(sql, tuple(args)).fetchall()]


def one(sql: str, args: Iterable = ()) -> dict | None:
    return _dec(conn().execute(sql, tuple(args)).fetchone())


def val(sql: str, args: Iterable = (), default=None):
    r = conn().execute(sql, tuple(args)).fetchone()
    return default if r is None or r[0] is None else r[0]


def ex(sql: str, args: Iterable = ()) -> int:
    with _write_lock:
        cur = conn().execute(sql, tuple(_enc(a) for a in args))
        conn().commit()
        return cur.lastrowid or cur.rowcount


def insert(table: str, data: dict, replace: bool = False) -> int:
    keys = list(data)
    sql = f"INSERT {'OR REPLACE ' if replace else ''}INTO {table}({','.join(keys)}) VALUES({','.join('?' * len(keys))})"
    return ex(sql, [data[k] for k in keys])


def update(table: str, key_col: str, key, data: dict) -> None:
    if not data:
        return
    sets = ",".join(f"{k}=?" for k in data)
    ex(f"UPDATE {table} SET {sets} WHERE {key_col}=?", [*data.values(), key])


def clip_update(clip_id: int, **data) -> None:
    data["updated_at"] = time.time()
    update("clips", "id", clip_id, data)
