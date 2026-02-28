"""
Service d'analyse audio pour la vérification des règles de Tajwid.

Utilise whisper.load_audio() pour décoder le WebM (via ffmpeg),
puis numpy/librosa pour analyser les segments mot par mot.

Vérifications implémentées :
  - Qalqalah       : rebond d'énergie en fin de segment (numpy RMS)
  - Madd            : durée du segment vs beats attendus (numpy)
  - Ghunnah         : énergie nasale 500–3000 Hz (librosa STFT)
"""

import logging
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

SR = 16000  # Fréquence d'échantillonnage de Whisper (Hz)

# Librosa optionnel — les vérifications Ghunnah se dégradent gracieusement sans lui
try:
    import librosa
    LIBROSA_AVAILABLE = True
except ImportError:
    LIBROSA_AVAILABLE = False
    logger.warning("librosa non installé — vérification Ghunnah désactivée (fallback neutre).")


# ── Chargement audio ───────────────────────────────────────────────────────────

def load_audio_for_analysis(file_path: str) -> Optional[np.ndarray]:
    """
    Charge un fichier audio (WebM, MP3, WAV…) en float32 à 16 000 Hz.

    Utilise whisper.load_audio() qui s'appuie sur ffmpeg — déjà présent
    si Whisper fonctionne sur cette machine.

    Returns:
        numpy array float32 à SR Hz, ou None en cas d'erreur.
    """
    try:
        import whisper
        audio = whisper.load_audio(str(file_path))
        logger.debug(f"Audio chargé : {len(audio) / SR:.2f}s ({len(audio)} samples)")
        return audio
    except Exception as e:
        logger.error(f"Impossible de charger l'audio '{file_path}': {e}")
        return None


def extract_segment(
    audio: np.ndarray,
    start: float,
    end: float,
    sr: int = SR,
) -> Optional[np.ndarray]:
    """
    Extrait un segment temporel depuis le tableau audio.

    Args:
        audio : tableau float32 complet
        start : timestamp de début en secondes
        end   : timestamp de fin en secondes
        sr    : fréquence d'échantillonnage

    Returns:
        Sous-tableau numpy, ou None si le segment est invalide/vide.
    """
    if audio is None or start >= end or end <= 0:
        return None

    start_sample = max(0, int(start * sr))
    end_sample   = min(len(audio), int(end * sr))

    if end_sample <= start_sample:
        return None

    segment = audio[start_sample:end_sample]
    return segment if len(segment) > 0 else None


# ── Estimation du tempo de récitation ─────────────────────────────────────────

def estimate_beat_duration(aligned_words: list, sr: int = SR) -> float:
    """
    Estime la durée d'un temps (haraka) à partir des timestamps Whisper.

    Méthode : durée moyenne des mots prononcés ÷ 2.5 beats par mot (approx.).
    Borne le résultat entre 0.15 s et 0.60 s.

    Returns:
        Durée d'un beat en secondes (défaut 0.30 s si données insuffisantes).
    """
    durations = [
        e["end"] - e["start"]
        for e in aligned_words
        if e.get("end", 0) > e.get("start", 0)
    ]

    if len(durations) < 3:
        return 0.30  # fallback raisonnable

    avg_word_duration = sum(durations) / len(durations)
    beat = avg_word_duration / 2.5  # moyenne : un mot coranique ≈ 2.5 harakats

    return max(0.15, min(0.60, beat))


# ── Vérifications des règles ───────────────────────────────────────────────────

def check_qalqalah(segment: np.ndarray, sr: int = SR) -> tuple[bool, float]:
    """
    Détecte la Qalqalah (القلقلة) — rebond d'énergie en fin de consonne.

    Méthode :
      - Divise le segment en corps (70 %) et queue (30 %).
      - Si la queue a plus de 30 % de l'énergie RMS du corps → rebond détecté.

    Heuristique raisonnée : le relâchement de la consonne occlusive crée
    un pic d'énergie bref mais mesurable en fin de segment.

    Returns:
        (detected: bool, confidence: float)
    """
    min_samples = int(0.05 * sr)  # 50 ms minimum
    if segment is None or len(segment) < min_samples:
        return False, 0.35

    split    = int(len(segment) * 0.70)
    body_rms = float(np.sqrt(np.mean(segment[:split] ** 2)))
    tail_rms = float(np.sqrt(np.mean(segment[split:] ** 2)))

    if body_rms < 1e-6:
        return False, 0.30

    ratio    = tail_rms / body_rms
    detected = ratio > 0.30

    if detected:
        confidence = round(min(0.90, 0.50 + ratio), 3)
    else:
        confidence = round(max(0.10, ratio * 0.60), 3)

    return detected, confidence


def check_madd_duration(
    segment: np.ndarray,
    sr: int,
    madd_subtype: str,
    beat_duration: float,
) -> tuple[bool, float]:
    """
    Vérifie que la durée d'un segment respecte le Madd requis.

    Règle :
      - Madd Tabii (2 temps)          : ≥ 2 × beat_duration × 0.80
      - Madd Wajib Muttasil (4-5 t.) : ≥ 4 × beat_duration × 0.80
      - Madd Jaiz Munfasil (2-4 t.)  : ≥ 2 × beat_duration × 0.80
      - Madd Lazim (6 t.)             : ≥ 6 × beat_duration × 0.80

    La tolérance de 20 % compense les variations de tempo.

    Returns:
        (valid: bool, confidence: float)
    """
    if segment is None or len(segment) == 0 or beat_duration <= 0:
        return False, 0.20

    if "4-5" in madd_subtype or "Muttasil" in madd_subtype:
        min_beats = 4
    elif "6" in madd_subtype or "Lazim" in madd_subtype:
        min_beats = 6
    else:
        min_beats = 2  # Tabii ou Munfasil (minimum)

    actual_duration = len(segment) / sr
    required        = min_beats * beat_duration * 0.80  # 20 % de tolérance

    ratio = actual_duration / required if required > 0 else 1.0
    valid = ratio >= 1.0

    if valid:
        confidence = round(min(0.90, ratio * 0.75), 3)
    else:
        confidence = round(max(0.10, ratio * 0.50), 3)

    return valid, confidence


def check_ghunnah(segment: np.ndarray, sr: int = SR) -> tuple[bool, float]:
    """
    Vérification spectrale de la Ghunnah (nasalisation).

    Méthode STFT (librosa) :
      - Calcule l'énergie dans la bande nasale (500–3000 Hz)
      - Compare à l'énergie totale du signal de parole (200–8000 Hz)
      - Si le ratio dépasse 40 %, la nasalisation est détectée

    Fallback :
      - Si librosa n'est pas installé → True, 0.50 (neutre)
      - Si le segment est trop court  → True, 0.50 (bénéfice du doute)

    Returns:
        (detected: bool, confidence: float)
    """
    min_samples = int(0.08 * sr)  # 80 ms minimum
    if segment is None or len(segment) < min_samples:
        return True, 0.50

    if not LIBROSA_AVAILABLE:
        return True, 0.50

    try:
        S     = np.abs(librosa.stft(segment, n_fft=512))
        freqs = librosa.fft_frequencies(sr=sr, n_fft=512)

        nasal_mask  = (freqs >= 500)  & (freqs <= 3000)
        speech_mask = (freqs >= 200)  & (freqs <= 8000)

        nasal_energy  = float(np.mean(S[nasal_mask]))
        speech_energy = float(np.mean(S[speech_mask]))

        if speech_energy < 1e-8:
            return True, 0.50

        ratio    = nasal_energy / speech_energy
        detected = ratio > 0.40

        if detected:
            confidence = round(min(0.85, ratio * 1.10), 3)
        else:
            confidence = round(max(0.10, ratio * 0.80), 3)

        return detected, confidence

    except Exception as e:
        logger.warning(f"Vérification Ghunnah échouée : {e}")
        return True, 0.50
