"""Emplacements des fichiers du bot (tout reste dans le dossier du projet)."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PKG = Path(__file__).resolve().parent
DATA = Path(os.environ.get("CLIPBOT_DATA", ROOT / "data"))
ENV_FILE = Path(os.environ.get("CLIPBOT_ENV", ROOT / ".env"))
DB_FILE = DATA / "clipbot.db"
BUFFERS = DATA / "buffers"      # segments glissants des streams (temporaire)
WORK = DATA / "work"            # fichiers de montage (temporaire)
RAW = DATA / "raw"              # extraits bruts avant montage
CLIPS = DATA / "clips"          # clips finis : un dossier par streamer
THUMBS = DATA / "thumbs"
MODELS = DATA / "models"        # modèles faster-whisper
FONTS = PKG / "fonts"
STATIC = PKG / "static"


def ensure_dirs() -> None:
    for d in (DATA, BUFFERS, WORK, RAW, CLIPS, THUMBS, MODELS):
        d.mkdir(parents=True, exist_ok=True)
