import os
import subprocess
import tempfile
from pathlib import Path

_tmp = tempfile.mkdtemp(prefix="clipbot_test_")
os.environ["CLIPBOT_DATA"] = _tmp
os.environ["CLIPBOT_ENV"] = str(Path(_tmp) / ".env")

import pytest  # noqa: E402

from clipbot import db, paths  # noqa: E402


@pytest.fixture(scope="session")
def raw_video() -> str:
    """Vidéo brute de 30 s : calme puis bruit fort + mouvement entre 8 et 20 s."""
    out = Path(_tmp) / "raw_src.mp4"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i",
                    "testsrc2=size=1280x720:rate=30:duration=30", "-f", "lavfi", "-i", "anoisesrc=color=pink:amplitude=0.02:duration=30",
                    "-f", "lavfi", "-i", "sine=frequency=1500:duration=30", "-filter_complex",
                    "[2:a]volume='if(between(t,8,20),0.5,0)':eval=frame[s];[1:a][s]amix=inputs=2:normalize=0[a]",
                    "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-preset", "ultrafast", "-g", "60", "-c:a", "aac", str(out)], check=True)
    return str(out)


@pytest.fixture()
def fresh_db():
    paths.ensure_dirs()
    c = db.conn()
    for t in ("settings", "streamers", "clips", "series", "accounts", "tiktok_videos", "account_stats", "ai_costs", "logs",
              "alerts", "calibration", "snapshots", "suggestions", "viewer_clips", "video_stats", "sessions"):
        c.execute(f"DROP TABLE IF EXISTS {t}")
    c.commit()
    db.init()
    from clipbot import settings
    settings._cache = None
    yield
