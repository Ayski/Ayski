"""Lancement : python -m clipbot [--port 8080] [--no-browser]"""
import argparse
import threading
import webbrowser

import uvicorn

from . import db, paths, sysinfo


def main() -> None:
    ap = argparse.ArgumentParser(description="ClipBot — clips Twitch → TikTok")
    ap.add_argument("--port", type=int, default=8080)
    ap.add_argument("--host", default="0.0.0.0")
    ap.add_argument("--no-browser", action="store_true")
    ap.add_argument("--sysinfo", action="store_true", help="affiche l'analyse du PC et quitte")
    args = ap.parse_args()
    paths.ensure_dirs()
    db.init()
    if args.sysinfo:
        import json
        print(json.dumps({"systeme": sysinfo.static_info(), "conseils": sysinfo.recommend()}, indent=2, ensure_ascii=False))
        return
    print(f"\n  ClipBot démarre…\n  Sur ce PC      : http://localhost:{args.port}\n"
          f"  Sur téléphone  : http://{sysinfo.lan_ip()}:{args.port}  (même Wi-Fi)\n  Arrêt : Ctrl+C\n")
    if not args.no_browser:
        threading.Timer(2.0, lambda: webbrowser.open(f"http://localhost:{args.port}")).start()
    uvicorn.run("clipbot.web.app:app", host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
