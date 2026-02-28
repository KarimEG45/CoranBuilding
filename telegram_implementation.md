# Telegram Bot — Implémentation CoranBuilding

> Fonctionnalité différée. Référence pour implémentation future.
> Créé le 2026-02-24.

---

## Concept

L'utilisateur envoie un message vocal + le numéro de page via Telegram.
Le logiciel CoranBuilding (PC) analyse la récitation et renvoie un retour détaillé sur Telegram.

```
[User - Téléphone]
    → message vocal + "/recite 42"
    → Telegram Cloud (Bot API)
        ↓ polling
    [PC - python-telegram-bot]
        → FastAPI local (port 8001)
            → Whisper transcription
            → alignement difflib
            → moteur Tajwid
        ← résultats JSON
    → réponse formatée Telegram
[User - Téléphone]
```

---

## Prérequis

### 1. Créer le bot Telegram
1. Ouvrir Telegram, chercher `@BotFather`
2. Envoyer `/newbot`
3. Choisir un nom : `CoranBuilding Bot`
4. Choisir un username : `coran_building_bot` (ou similaire)
5. Récupérer le **token API** (format `123456:ABC-DEF...`)
6. Stocker dans `.env` :
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
   ```

### 2. Dépendance Python
```bash
C:\Python314\python.exe -m pip install python-telegram-bot==21.*
```
Ajouter dans `requirements.txt` :
```
python-telegram-bot==21.0.1
```

---

## Structure des fichiers à créer/modifier

```
backend/
├── app/
│   ├── services/
│   │   └── telegram_bot.py        ← nouveau (logique bot)
│   └── api/
│       └── v1/
│           └── telegram.py        ← nouveau (endpoint start/stop bot)
├── .env                           ← ajouter TELEGRAM_BOT_TOKEN
└── main.py                        ← démarrer le bot au lancement
```

---

## Code — `backend/app/services/telegram_bot.py`

```python
import os
import tempfile
import asyncio
import httpx
from telegram import Update, Bot
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    ContextTypes, filters
)

FASTAPI_URL = "http://localhost:8001"
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

# --- Commandes ---

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Assalamu alaikum ! 🕌\n\n"
        "Commandes disponibles :\n"
        "  /recite <page> — analyser une récitation\n"
        "  /help — aide\n\n"
        "Envoie un message vocal après /recite <page>."
    )

async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Comment utiliser CoranBuilding Bot :\n\n"
        "1. Tape /recite 42  (numéro de page)\n"
        "2. Envoie ton message vocal\n"
        "3. Attends l'analyse (10–30 secondes)\n\n"
        "Niveaux d'analyse :\n"
        "  /level1 — présence des mots (débutant)\n"
        "  /level2 — règles de base Tajwid\n"
        "  /level3 — Ijaza/Hafs (avancé)\n"
    )

async def cmd_recite(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Enregistre la page cible, attend le prochain vocal."""
    if not context.args:
        await update.message.reply_text("Usage : /recite <numéro de page>\nExemple : /recite 42")
        return
    try:
        page = int(context.args[0])
    except ValueError:
        await update.message.reply_text("Numéro de page invalide.")
        return

    context.user_data["pending_page"] = page
    context.user_data["pending_level"] = context.user_data.get("level", 2)
    await update.message.reply_text(
        f"Page {page} enregistrée. Envoie maintenant ton message vocal."
    )

async def cmd_set_level(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args or context.args[0] not in ("1", "2", "3"):
        await update.message.reply_text("Usage : /level <1|2|3>")
        return
    level = int(context.args[0])
    context.user_data["level"] = level
    labels = {1: "Débutant", 2: "Intermédiaire", 3: "Ijaza/Hafs"}
    await update.message.reply_text(f"Niveau fixé : {level} — {labels[level]}")

async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Reçoit un vocal, envoie à FastAPI, retourne le résultat."""
    page = context.user_data.get("pending_page")
    if not page:
        await update.message.reply_text(
            "Indique d'abord la page avec /recite <page>."
        )
        return

    level = context.user_data.get("level", 2)
    await update.message.reply_text("Analyse en cours... (10–30 secondes)")

    # Télécharger le fichier vocal
    voice_file = await update.message.voice.get_file()
    with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as tmp:
        tmp_path = tmp.name
    await voice_file.download_to_drive(tmp_path)

    # Appel FastAPI
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            with open(tmp_path, "rb") as f:
                response = await client.post(
                    f"{FASTAPI_URL}/api/v1/recitation/analyze",
                    files={"audio": ("recitation.ogg", f, "audio/ogg")},
                    data={
                        "page": str(page),
                        "tajweed_level": str(level)
                    }
                )
        result = response.json()
        reply = _format_result(result, page, level)
    except Exception as e:
        reply = f"Erreur lors de l'analyse : {str(e)}"
    finally:
        os.unlink(tmp_path)
        context.user_data.pop("pending_page", None)

    await update.message.reply_text(reply, parse_mode="Markdown")

# --- Formatage du résultat ---

def _format_result(result: dict, page: int, level: int) -> str:
    score = result.get("score", 0)
    passed = result.get("passed", False)
    words = result.get("word_results", [])

    status = "✅ Validé" if passed else "❌ À retravailler"
    lines = [
        f"*Page {page} — Niveau {level}*",
        f"Score : *{score:.0f}%* — {status}",
        ""
    ]

    errors = [w for w in words if not w.get("correct", True)]
    if errors:
        lines.append("*Mots à corriger :*")
        for w in errors[:10]:  # max 10 pour ne pas surcharger
            word = w.get("word", "")
            issues = ", ".join(w.get("tajweed_issues", []))
            lines.append(f"  • {word} — {issues if issues else 'non reconnu'}")
    else:
        lines.append("Tous les mots sont corrects.")

    tajweed = result.get("tajweed_summary", {})
    if tajweed:
        lines.append("")
        lines.append("*Règles Tajwid :*")
        for rule, ok in tajweed.items():
            icon = "✅" if ok else "❌"
            lines.append(f"  {icon} {rule}")

    return "\n".join(lines)

# --- Démarrage du bot ---

def create_application() -> Application:
    app = Application.builder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("recite", cmd_recite))
    app.add_handler(CommandHandler("level", cmd_set_level))
    app.add_handler(MessageHandler(filters.VOICE, handle_voice))
    return app

def run_bot():
    """Lancement en mode polling (bloquant). À appeler dans un thread séparé."""
    application = create_application()
    application.run_polling(allowed_updates=["message"])
```

---

## Intégration dans `main.py`

```python
import threading
from app.services.telegram_bot import run_bot

# Au démarrage de FastAPI :
@app.on_event("startup")
async def startup_event():
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    if token:
        bot_thread = threading.Thread(target=run_bot, daemon=True)
        bot_thread.start()
        print("[Telegram] Bot démarré en mode polling")
    else:
        print("[Telegram] TELEGRAM_BOT_TOKEN absent, bot désactivé")
```

---

## Ajout dans `.env`

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```

---

## Mise à jour `build_pro.py`

Ajouter dans les `hiddenimports` PyInstaller :
```python
"telegram",
"telegram.ext",
"httpx",
```

---

## Commandes disponibles pour l'utilisateur

| Commande | Description |
|---|---|
| `/start` | Message de bienvenue |
| `/help` | Aide complète |
| `/recite <page>` | Déclare la page à réciter, attend un vocal |
| `/level <1\|2\|3>` | Fixe le niveau d'analyse (défaut : 2) |
| (message vocal) | Déclenche l'analyse après /recite |

---

## Considérations futures

- **Authentification** : le bot répond à tous par défaut. Ajouter une whitelist d'`user_id` Telegram si on veut restreindre l'accès.
- **Multi-utilisateurs** : `context.user_data` est isolé par user, donc déjà géré nativement.
- **Notifications de rappel** : `python-telegram-bot` permet d'envoyer des messages proactifs (ex: rappel quotidien si pas de récitation).
- **Résultats audio** : possibilité d'envoyer un fichier audio annoté en retour (markers sur les erreurs).
- **Statistiques** : commande `/stats` pour voir sa progression sur les dernières pages.
- **Calibration seuils** : les seuils audio (RMS, durée Madd) devront être calibrés sur des récitations réelles de téléphone (qualité micro variable).

---

## Dépendances à ajouter dans `requirements.txt`

```
python-telegram-bot==21.0.1
httpx==0.27.0
```

---

## Estimation effort

| Tâche | Effort |
|---|---|
| Créer le bot (BotFather) | 5 min |
| Écrire `telegram_bot.py` | 2–3h |
| Intégrer dans `main.py` | 30 min |
| Tests manuels | 1–2h |
| Calibration seuils mobile | variable |
| **Total** | **~1 journée** |
