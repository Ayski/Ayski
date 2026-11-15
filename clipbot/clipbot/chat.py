"""Lecture anonyme du chat Twitch (IRC via WebSocket), une seule connexion pour tous les streams."""
import random
import re
import threading
import time
from collections import deque

from . import settings
from .logbus import log, warn

URL = "wss://irc-ws.chat.twitch.tv:443"
_PRIV = re.compile(r"^(?:@\S+ )?:(\w+)!\S+ PRIVMSG #(\w+) :(.*)$")


class ChatHub:
    def __init__(self) -> None:
        self.channels: set[str] = set()
        self.msgs: dict[str, deque] = {}        # canal -> deque[(ts, auteur, texte, est_reaction)]
        self._ws = None
        self._stop = threading.Event()
        self._lock = threading.Lock()
        self._thread: threading.Thread | None = None
        self._react: tuple[set, list] = (set(), [])
        self._react_ts = 0.0
        self.connected = False

    # --- classification des messages ---
    def _is_reaction(self, text: str) -> bool:
        if time.time() - self._react_ts > 30:
            toks = settings.get("reaction_tokens") or []
            self._react = ({t for t in toks if t.isalnum()}, [t for t in toks if not t.isalnum()])
            self._react_ts = time.time()
        words, subs = self._react
        t = text.strip()
        if any(s in t for s in subs):
            return True
        parts = t.split()
        if any(p in words or p.upper() in words for p in parts[:8]):
            return True
        # rires / exclamations en majuscules : "AHAHAH", "NOOOO", "LETS GOOO"
        return bool(re.search(r"(ha){3,}|(ah){3,}|(lo+l){1}|x+d+|o{4,}|!{3,}|\?{3,}", t.lower())) or (len(t) >= 4 and t.isupper())

    def feed(self, channel: str, text: str, author: str = "", ts: float | None = None) -> None:
        dq = self.msgs.setdefault(channel, deque(maxlen=20000))
        dq.append((ts or time.time(), author, text, self._is_reaction(text)))

    # --- lecture ---
    def window(self, channel: str, t0: float, t1: float) -> tuple[int, int]:
        """(nb messages, nb réactions) entre t0 et t1."""
        dq = self.msgs.get(channel)
        if not dq:
            return 0, 0
        n = r = 0
        for ts, _, _, react in reversed(dq):
            if ts < t0:
                break
            if ts < t1:
                n += 1
                r += react
        return n, r

    def texts(self, channel: str, t0: float, t1: float, limit: int = 60) -> list[str]:
        dq = self.msgs.get(channel) or ()
        out = [f"{a}: {x}" for ts, a, x, _ in list(dq) if t0 <= ts < t1]
        if len(out) > limit:
            step = len(out) / limit
            out = [out[int(i * step)] for i in range(limit)]
        return out

    def rate(self, channel: str, seconds: float = 60) -> float:
        n, _ = self.window(channel, time.time() - seconds, time.time() + 1)
        return n / seconds * 60

    # --- connexion ---
    def set_channels(self, channels: set[str]) -> None:
        with self._lock:
            add, rem = channels - self.channels, self.channels - channels
            self.channels = set(channels)
            ws = self._ws
        for c in rem:
            self.msgs.pop(c, None)
        if ws is not None:
            try:
                for c in rem:
                    ws.send(f"PART #{c}")
                for i, c in enumerate(sorted(add)):
                    ws.send(f"JOIN #{c}")
                    if i % 15 == 14:
                        time.sleep(11)
            except Exception:
                pass

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="chat", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        try:
            if self._ws:
                self._ws.close()
        except Exception:
            pass

    def _run(self) -> None:
        from websockets.sync.client import connect
        backoff = 2
        while not self._stop.is_set():
            if not self.channels:
                time.sleep(2)
                continue
            try:
                with connect(URL, open_timeout=15, close_timeout=3) as ws:
                    ws.send("CAP REQ :twitch.tv/tags")
                    ws.send(f"NICK justinfan{random.randint(10000, 99999)}")
                    with self._lock:
                        self._ws = ws
                        chans = sorted(self.channels)
                    for i, c in enumerate(chans):
                        ws.send(f"JOIN #{c}")
                        if i % 15 == 14:
                            time.sleep(11)
                    self.connected = True
                    backoff = 2
                    log("chat", f"Chat connecté ({len(chans)} canaux)")
                    last = time.time()
                    while not self._stop.is_set():
                        try:
                            data = ws.recv(timeout=30)
                        except TimeoutError:
                            if time.time() - last > 360:
                                raise ConnectionError("chat silencieux")
                            continue
                        last = time.time()
                        for line in str(data).split("\r\n"):
                            if line.startswith("PING"):
                                ws.send("PONG :tmi.twitch.tv")
                                continue
                            m = _PRIV.match(line)
                            if m:
                                self.feed(m.group(2), m.group(3), m.group(1))
            except Exception as e:
                if not self._stop.is_set():
                    warn("chat", f"Chat déconnecté ({e}); reconnexion dans {backoff}s")
            finally:
                self.connected = False
                self._ws = None
            self._stop.wait(backoff)
            backoff = min(60, backoff * 2)


hub = ChatHub()
