import whisper
import os
from backend.app.core.config import settings
import logging

logger = logging.getLogger(__name__)

model = None

def load_model():
    global model
    if model is None:
        try:
            logger.info("Loading Whisper model...")
            # We enforce CPU if no CUDA, but Whisper handles it.
            model = whisper.load_model("base")
            logger.info("Whisper model loaded.")
        except Exception as e:
            logger.error(f"Error loading Whisper: {e}")
            model = None

def transcribe(file_path: str, language: str = "ar"):
    global model
    if model is None:
        load_model()

    if model is None:
        raise Exception("Whisper model could not be initialized")

    result = model.transcribe(str(file_path), language=language)
    return result["text"].strip()


def transcribe_with_timestamps(file_path: str, language: str = "ar") -> dict:
    """
    Transcrit l'audio et retourne le texte + les timestamps mot par mot.

    Returns:
        {
            "text": str,
            "words": [{"word": str, "start": float, "end": float}, ...]
        }
    """
    global model
    if model is None:
        load_model()

    if model is None:
        raise Exception("Whisper model could not be initialized")

    result = model.transcribe(str(file_path), language=language, word_timestamps=True)

    words = []
    for segment in result.get("segments", []):
        for w in segment.get("words", []):
            word_text = w.get("word", "").strip()
            if word_text:
                words.append({
                    "word": word_text,
                    "start": round(w.get("start", 0.0), 3),
                    "end": round(w.get("end", 0.0), 3),
                })

    return {
        "text": result["text"].strip(),
        "words": words,
    }
