"""Compréhension des clips par l'API Claude : description, note, titre, hook, description TikTok,
mémoire par streamer et décision de série. Suivi des coûts avec plafond de budget."""
import base64
import re
import time
from typing import Literal, Optional

from pydantic import BaseModel

from . import db, settings
from .logbus import alert, log, warn

PRICES = {  # $ par million de tokens (entrée, sortie)
    "claude-opus-5-5": (4.0, 20.0), "claude-sonnet-5-5": (2.0, 10.0), "claude-haiku-5-5": (0.1, 0.5),
    "claude-fable-5-2": (8.0, 40.0), "claude-opus-5": (5.0, 25.0), "claude-sonnet-5": (2.0, 10.0),
}
MODELS = list(PRICES)
LANG_NAME = {"fr": "français", "en": "anglais"}


class MemoryUpdate(BaseModel):
    character: str          # personnage / rôle joué par le streamer
    goals: str              # objectifs en cours
    new_events: list[str]   # événements marquants de CE clip (0 à 2, phrases courtes)
    summary: str            # résumé de l'aventure à jour (3 phrases max)


class SeriesDecision(BaseModel):
    part_of_series: bool
    existing_series_id: Optional[int]   # id d'une série ouverte à continuer, sinon null
    story_title: str                    # nom court de l'histoire (≤ 5 mots, ex. « Le braquage de la banque »), "" si clip isolé
    story_phase: Literal["debut", "suite", "fin", "aucune"]   # où en est l'histoire dans ce clip
    recap: str                          # « Précédemment : … » ultra-court (≤ 8 mots) si suite, sinon ""


class SubLine(BaseModel):
    i: int
    text: str


class ClipAnalysis(BaseModel):
    description: str
    rating: int
    category: Literal["action", "drole", "rp", "fail", "reaction"]
    title: str
    hook: str
    caption: str                        # accroche de la description TikTok (1 phrase, sans hashtags ni crédit)
    hashtags: list[str]                 # hashtags précis selon la scène (sans #)
    memory: MemoryUpdate
    series: SeriesDecision
    translated_lines: list[SubLine]     # traduction des répliques numérotées si demandée, sinon []


class Reasons(BaseModel):
    class Item(BaseModel):
        login: str
        reason: str
    items: list[Item]


def configured() -> bool:
    return bool(settings.secret("ANTHROPIC_API_KEY"))


def _client():
    import anthropic
    return anthropic.Anthropic(api_key=settings.secret("ANTHROPIC_API_KEY"), max_retries=3, timeout=120)


# ---------- coûts ----------
def costs() -> dict:
    now = time.time()
    lt = time.localtime(now)
    day0 = time.mktime((lt.tm_year, lt.tm_mon, lt.tm_mday, 0, 0, 0, 0, 0, -1))
    month0 = time.mktime((lt.tm_year, lt.tm_mon, 1, 0, 0, 0, 0, 0, -1))
    cfg = settings.all()
    day = db.val("SELECT SUM(cost) FROM ai_costs WHERE ts>=?", [day0], 0.0)
    month = db.val("SELECT SUM(cost) FROM ai_costs WHERE ts>=?", [month0], 0.0)
    calls = db.val("SELECT COUNT(*) FROM ai_costs WHERE ts>=?", [day0], 0)
    hist = db.q("SELECT strftime('%Y-%m-%d', ts, 'unixepoch', 'localtime') d, SUM(cost) c, COUNT(*) n FROM ai_costs "
                "WHERE ts>=? GROUP BY d ORDER BY d", [now - 30 * 86400])
    return {"day": round(day, 4), "month": round(month, 4), "calls_today": calls, "history": hist,
            "budget_day": cfg["ai_budget_day"], "budget_month": cfg["ai_budget_month"],
            "paused": day >= cfg["ai_budget_day"] or month >= cfg["ai_budget_month"]}


def available() -> tuple[bool, str]:
    if not settings.get("ai_enabled"):
        return False, "IA désactivée dans les réglages"
    if not configured():
        return False, "clé ANTHROPIC_API_KEY manquante"
    c = costs()
    if c["paused"]:
        alert("ai_budget", f"Plafond de budget IA atteint ({c['day']:.2f}$ aujourd'hui, {c['month']:.2f}$ ce mois) : IA en pause", 3600)
        return False, "plafond de budget atteint"
    return True, ""


def _record(resp, purpose: str, model: str) -> None:
    u = resp.usage
    cfg = settings.all()
    pin, pout = PRICES.get(model, (cfg["ai_price_in"], cfg["ai_price_out"]))
    cr, cw = getattr(u, "cache_read_input_tokens", 0) or 0, getattr(u, "cache_creation_input_tokens", 0) or 0
    cost = (u.input_tokens * pin + cr * pin * 0.1 + cw * pin * 1.25 + u.output_tokens * pout) / 1e6
    db.insert("ai_costs", {"ts": time.time(), "model": model, "purpose": purpose,
                           "in_tok": u.input_tokens + cr + cw, "out_tok": u.output_tokens, "cost": cost})


SYSTEM = """Tu es le directeur éditorial d'une chaîne TikTok de clips de streams Twitch du jeu {game}.
On te donne des images clés d'un extrait (ordre chronologique), la transcription, un résumé du chat et la mémoire du streamer.

Ta mission, en restant strictement fidèle à ce qui se passe réellement :
- description : décris la scène en 1-2 phrases.
- rating : note l'intérêt pour TikTok de 1 à 10 (10 = moment exceptionnel, 5 = banal, 1 = rien ne se passe). Sois exigeant : un clip moyen vaut 4-5.
- category : action, drole, rp (roleplay/histoire), fail ou reaction.
- title : titre court et accrocheur, 6 mots maximum, en {lang}, fidèle au contenu, sans emoji ni hashtag, jamais mensonger.
- hook : texte de 2 à 5 mots affiché la première seconde pour retenir le spectateur, en {lang}.
- caption : une phrase d'accroche pour la description TikTok, en {lang} (sans hashtag, sans crédit).
- hashtags : 1 à 3 hashtags précis liés à la scène (sans le #, minuscules, sans espaces). Les hashtags larges sont ajoutés automatiquement.
- memory : mets à jour la mémoire du streamer (personnage joué, objectifs, événements marquants, résumé de son aventure).
- series : décide si ce clip est isolé ou fait partie d'une SÉRIE narrative, c'est-à-dire une histoire qui se déroule sur
  plusieurs minutes et donnera plusieurs épisodes : braquage (préparation, entrée, fuite), poursuite, mission, prise d'otage,
  procès, intrigue RP… part_of_series = true seulement si le clip continue une série ouverte, ou s'il montre le DÉBUT évident
  d'une telle histoire (le plan se met en place, l'action démarre : « on y va », arrivée sur les lieux, première alerte).
  Un gag, un fail ou une réaction sans suite prévisible est un clip isolé (false).
  Pour continuer une série ouverte, donne son id (même histoire uniquement, pas juste le même streamer).
  « story_title » = nom court de l'histoire en {lang}, 5 mots maximum, sans le nom du streamer (ex. « Le braquage de la banque ») ;
  garde le même nom d'un épisode à l'autre ; "" si clip isolé.
  « story_phase » = debut, suite, ou fin (l'histoire se conclut dans ce clip : fuite réussie, arrestation, mort…) ; aucune si isolé.
  « recap » = rappel ultra-court de l'épisode précédent (≤ 8 mots, en {lang}) seulement si le clip est une suite.{series_only}
- translated_lines : {translate}

Réponds uniquement avec l'objet structuré demandé."""


def analyze_clip(*, streamer: str, lang: str, target_lang: str, frames: list[bytes], transcript: dict,
                 chat_lines: list[str], memory: dict, open_series: list[dict], duration: float) -> ClipAnalysis | None:
    """Renvoie l'analyse, ou None si l'IA est indisponible (clé absente, budget, erreur)."""
    ok, why = available()
    if not ok:
        return None
    import anthropic
    cfg = settings.all()
    model = cfg["ai_model"]
    need_tr = bool(transcript.get("segments")) and (transcript.get("language") or lang) != target_lang
    lines = "\n".join(f"[{i}] {s['text']}" for i, s in enumerate(transcript.get("segments", [])))
    notes = cfg.get("feedback_notes", {})
    content: list = []
    for fr in frames[:6]:
        content.append({"type": "image", "source": {"type": "base64", "media_type": "image/jpeg",
                                                    "data": base64.standard_b64encode(fr).decode()}})
    series_txt = "\n".join(f"- id {s['id']} : « {s['title']} » ({s['episodes']} ép.) — {s.get('summary') or ''}"
                           for s in open_series) or "aucune"
    content.append({"type": "text", "text": f"""Streamer : {streamer} (langue du stream : {LANG_NAME.get(lang, lang)})
Durée de l'extrait : {duration:.0f} s

Transcription (répliques numérotées) :
{lines or '(aucune parole détectée)'}

Chat pendant l'extrait ({len(chat_lines)} messages échantillonnés) :
{chr(10).join(chat_lines[:50]) or '(chat indisponible)'}

Mémoire du streamer :
{memory or '(vide : premier clip)'}

Séries ouvertes de ce streamer :
{series_txt}

Titres que le propriétaire a aimés : {notes.get('liked_titles', [])[-5:]}
Titres qu'il a trouvés nuls (à éviter) : {notes.get('disliked_titles', [])[-5:]}"""})
    system = SYSTEM.format(game=cfg["game"], lang=LANG_NAME.get(target_lang, target_lang),
                           series_only=("\n  IMPORTANT : la chaîne ne publie QUE des séries. Les clips isolés sont jetés : cherche "
                                        "activement si une histoire commence ou continue, sans jamais en inventer une."
                                        if cfg.get("series_only") and cfg.get("series_enabled") else ""),
                           translate=(f"traduis chaque réplique numérotée en {LANG_NAME.get(target_lang, target_lang)} "
                                      "(naturel, oral, court), une entrée par réplique avec son numéro." if need_tr
                                      else "renvoie une liste vide."))
    try:
        resp = _client().messages.parse(model=model, max_tokens=6000, system=system,
                                        messages=[{"role": "user", "content": content}],
                                        output_config={"effort": "low"}, output_format=ClipAnalysis)
        _record(resp, "clip", model)
        if resp.stop_reason == "refusal" or resp.parsed_output is None:
            warn("ia", f"Réponse inutilisable pour {streamer} ({resp.stop_reason})")
            return None
        a = resp.parsed_output
        a.rating = max(1, min(10, a.rating))
        a.title = " ".join(a.title.replace("#", "").split()[:7])
        return a
    except anthropic.AuthenticationError:
        alert("error", "Clé ANTHROPIC_API_KEY refusée : vérifie-la dans Système → Clés API")
    except anthropic.RateLimitError:
        warn("ia", "Limite de débit de l'API Claude atteinte, nouvel essai plus tard")
        raise
    except anthropic.APIStatusError as e:
        warn("ia", f"Erreur API Claude {e.status_code} : {str(e)[:200]}")
    except anthropic.APIConnectionError as e:
        warn("ia", f"API Claude injoignable : {e}")
        raise
    return None


def explain_trending(cands: list[dict]) -> dict[str, str]:
    """Courte explication (1 phrase) par streamer suggéré."""
    ok, _ = available()
    if not ok or not cands or not settings.get("trending_ai"):
        return {}
    model = settings.get("ai_model")
    txt = "\n".join(f"- {c['login']} ({c['lang']}) : {c['details']}" for c in cands[:12])
    try:
        resp = _client().messages.parse(
            model=model, max_tokens=2000, output_config={"effort": "low"}, output_format=Reasons,
            messages=[{"role": "user", "content": "Voici des streamers Twitch qui percent sur " + settings.get("game") +
                       " avec leurs chiffres. Pour chacun, explique en UNE phrase courte en français pourquoi il mérite "
                       "(ou non) d'être ciblé pour des clips TikTok, en t'appuyant uniquement sur ces chiffres.\n" + txt}])
        _record(resp, "tendances", model)
        return {i.login: i.reason for i in (resp.parsed_output.items if resp.parsed_output else [])}
    except Exception as e:
        warn("ia", f"Explication des tendances indisponible : {e}")
        return {}


def test_key() -> str:
    import anthropic
    try:
        r = _client().messages.create(model=settings.get("ai_model"), max_tokens=16,
                                      messages=[{"role": "user", "content": "Réponds juste : ok"}])
        _record(r, "test", settings.get("ai_model"))
        return "ok"
    except anthropic.AuthenticationError:
        raise RuntimeError("Clé refusée par Anthropic. Vérifie que tu l'as copiée en entier.")
    except anthropic.APIStatusError as e:
        raise RuntimeError(f"Erreur {e.status_code} : {str(e)[:160]}")
    except anthropic.APIConnectionError:
        raise RuntimeError("Impossible de joindre l'API Claude (connexion internet ?)")


# ---------- description TikTok finale ----------
def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9àâäéèêëîïôöùûüç]", "", s.lower())


def build_description(caption: str, streamer: str, target_lang: str, scene_tags: list[str], fixed_tags: list[str],
                      series_tag: str = "", prefix: str = "") -> tuple[str, list[str]]:
    """Accroche + crédit obligatoire + 6 hashtags max."""
    game = slug(settings.get("game"))
    short = "gta6" if "vi" in settings.get("game").lower().split() else "gta5" if game.endswith("v") else game
    broad = ["gta", "gaming", "pourtoi" if target_lang == "fr" else "fyp", short]
    tags: list[str] = []
    for t in ([series_tag] if series_tag else []) + [slug(x) for x in fixed_tags] + broad + [slug(x) for x in scene_tags]:
        if t and t not in tags:
            tags.append(t)
    tags = tags[:6]
    head = f"{prefix} {caption}".strip()
    return f"{head}\n🎥 twitch.tv/{streamer}\n{' '.join('#' + t for t in tags)}", tags


def fallback_analysis(streamer: str, transcript: dict, score: float, target_lang: str) -> dict:
    """Sans IA (clé absente / budget atteint) : titre simple tiré de la transcription."""
    words = (transcript.get("text") or "").split()
    title = " ".join(words[:5]).strip(" ,.;:") or (f"Moment fou de {streamer}" if target_lang == "fr" else f"{streamer} goes wild")
    return {"description": "(analyse IA indisponible)", "rating": round(min(10, 4 + score * 6), 1), "category": "action",
            "title": title[:48], "hook": "Attends la fin…" if target_lang == "fr" else "Wait for it…",
            "caption": title, "hashtags": [], "no_ai": True}
