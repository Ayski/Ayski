"""Sous-titres animés mot par mot (format ASS), titre, hook, crédit, rappels de série."""
import re

W, H = 1080, 1920
SUB_Y = {"top": 560, "middle": 1180, "bottom": 1480}
FONTS = ["Anton", "Poppins ExtraBold", "Bangers", "Bebas Neue"]


def _col(hex_: str, alpha: int = 0) -> str:
    h = (hex_ or "#FFFFFF").lstrip("#")
    if len(h) != 6:
        h = "FFFFFF"
    return f"&H{alpha:02X}{h[4:6]}{h[2:4]}{h[0:2]}".upper()


def _t(sec: float) -> str:
    sec = max(0.0, sec)
    cs = int(round(sec * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def _esc(s: str) -> str:
    return re.sub(r"[{}\\]", "", s).replace("\n", " ").strip()


def wrap(text: str, width: int) -> str:
    words, lines, cur = _esc(text).split(), [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > width:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    return r"\N".join(lines[:3])


def group_words(words: list[dict], max_words: int = 3, max_chars: int = 16) -> list[list[dict]]:
    groups, cur = [], []
    for w in words:
        if cur:
            chars = sum(len(x["w"]) for x in cur) + len(cur) + len(w["w"])
            gap = w["s"] - cur[-1]["e"]
            if len(cur) >= max_words or chars > max_chars or gap > 0.6 or cur[-1]["w"][-1:] in ".?!…":
                groups.append(cur)
                cur = []
        cur.append(w)
    if cur:
        groups.append(cur)
    return groups


def spread_words(segments: list[dict]) -> list[dict]:
    """Répartit les mots d'une phrase (traduite) sur sa durée, proportionnellement à leur longueur."""
    out = []
    for seg in segments:
        ws = seg["text"].split()
        if not ws:
            continue
        total = sum(len(w) + 1 for w in ws)
        t, dur = seg["s"], max(0.2, seg["e"] - seg["s"])
        for w in ws:
            d = dur * (len(w) + 1) / total
            out.append({"w": w, "s": round(t, 2), "e": round(t + d, 2)})
            t += d
    return out


def build_ass(words: list[dict], duration: float, *, sub_style: dict, title_style: dict, title: str = "",
              hook: str = "", credit: str = "", recap: str = "", teaser: str = "", words_from: float = 0.0) -> str:
    ss, ts = sub_style, title_style
    size = int(ss.get("size", 92))
    prim, hi, outl = _col(ss.get("color")), _col(ss.get("highlight", "#FFE600")), _col(ss.get("outline", "#000000"))
    tsize = int(ts.get("size", 70))
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,{ss.get('font', 'Anton')},{size},{prim},{prim},{outl},&H96000000,0,0,0,0,100,100,1,0,1,7,3,5,60,60,0,1
Style: Title,{ts.get('font', 'Poppins ExtraBold')},{tsize},{_col(ts.get('color'))},{_col(ts.get('color'))},{_col(ts.get('box', '#E11D48'))},{_col(ts.get('box', '#E11D48'))},0,0,0,0,100,100,0,0,3,14,0,5,70,70,0,1
Style: Hook,{ss.get('font', 'Anton')},{int(size * 1.15)},{hi},{hi},{outl},&H96000000,0,0,0,0,100,100,1,0,1,8,4,5,70,70,0,1
Style: Credit,Poppins ExtraBold,40,&H30FFFFFF,&H30FFFFFF,&H50000000,&H50000000,0,0,0,0,100,100,0,0,1,3,0,5,40,40,0,1
Style: Info,Poppins ExtraBold,46,&H00FFFFFF,&H00FFFFFF,&H30000000,&H30000000,0,0,0,0,100,100,0,0,3,12,0,5,70,70,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev = []

    def add(layer, s, e, style, text):
        if e > s:
            ev.append(f"Dialogue: {layer},{_t(s)},{_t(e)},{style},,0,0,0,,{text}")

    title_y = {"top": 330, "middle": 760, "bottom": 1380}.get(ts.get("position", "top"), 330)
    if credit:
        add(0, 0, duration, "Credit", rf"{{\an5\pos({W // 2},{190})}}{_esc(credit)}")
    if title:
        add(2, 0, min(duration, 3.6), "Title", rf"{{\an5\pos({W // 2},{title_y})\fad(120,250)}}{wrap(title, 22)}")
    if recap:
        add(2, 0, min(duration, 2.8), "Info", rf"{{\an5\pos({W // 2},{title_y + 190})\fad(100,250)}}{wrap(recap, 34)}")
    elif hook:
        add(3, 0, min(duration, max(1.6, words_from)), "Hook",
            rf"{{\an5\pos({W // 2},{860})\fscx60\fscy60\t(0,140,\fscx100\fscy100)\fad(0,180)}}{wrap(hook.upper(), 16)}")
    if teaser:
        add(3, max(0, duration - 2.4), duration, "Info", rf"{{\an5\pos({W // 2},{1640})\fad(200,0)}}{_esc(teaser)}")

    y = SUB_Y.get(ss.get("position", "middle"), 1180)
    upper = ss.get("uppercase", True)
    words = [w for w in words if w["e"] > words_from and w["s"] < duration]
    groups = group_words(words)
    for gi, g in enumerate(groups):
        g_end = min(g[-1]["e"] + 0.5, groups[gi + 1][0]["s"] if gi + 1 < len(groups) else duration, duration)
        for i, w in enumerate(g):
            s = max(w["s"], words_from)
            e = g[i + 1]["s"] if i + 1 < len(g) else g_end
            parts = []
            for j, x in enumerate(g):
                txt = _esc(x["w"].upper() if upper else x["w"])
                if j == i:
                    parts.append(rf"{{\c{hi}\fscx116\fscy116\t(0,90,\fscx104\fscy104)}}{txt}{{\c{prim}\fscx100\fscy100}}")
                else:
                    parts.append(txt)
            add(1, s, e, "Sub", rf"{{\an5\pos({W // 2},{y})}}" + " ".join(parts))
    return head + "\n".join(ev) + "\n"
