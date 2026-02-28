import difflib
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# ── Diacritiques arabes (Unicode) ─────────────────────────────────────────────
FATHA    = '\u064E'  # َ
DAMMA    = '\u064F'  # ُ
KASRA    = '\u0650'  # ِ
SUKOON   = '\u0652'  # ْ
SHADDA   = '\u0651'  # ّ
FATHATAN = '\u064B'  # ً  tanween fath
DAMMATAN = '\u064C'  # ٌ  tanween damm
KASRATAN = '\u064D'  # ٍ  tanween kasr
MADDAH   = '\u0653'  # ٓ
SUP_ALEF = '\u0670'  # ٰ  alef superscript

TANWEEN = {FATHATAN, DAMMATAN, KASRATAN}

ALL_DIACRITICS = {
    FATHA, DAMMA, KASRA, SUKOON, SHADDA,
    FATHATAN, DAMMATAN, KASRATAN, MADDAH, SUP_ALEF,
    '\u0654', '\u0655', '\u0656', '\u065F',
}

# ── Groupes de lettres pour le Tajwid ─────────────────────────────────────────
QALQALAH_LETTERS  = set('قطبجد')
THROAT_LETTERS    = set('ءهعحغخ')   # حروف الحلق → Izhar Halqi
IDGHAM_GHUNNAH    = set('ينمو')     # Idgham avec Ghunnah
IDGHAM_NO_GHUNNAH = set('لر')       # Idgham sans Ghunnah
IQLAB_LETTER      = {'ب'}           # Iqlab (noon → meem avant ba)
IKHFA_LETTERS     = set('تثجدذزسشصضطظفقك')

HAMZA_LETTERS = {'ء', 'أ', 'إ', 'ئ', 'ؤ', 'آ'}

NOON = 'ن'
MEEM = 'م'


# ── Fonctions utilitaires ──────────────────────────────────────────────────────

def _is_diacritic(char: str) -> bool:
    return char in ALL_DIACRITICS


def _first_letter(word: str) -> str:
    """Retourne la première lettre (non-diacritique) du mot."""
    for char in word:
        if not _is_diacritic(char):
            return char
    return ''


# ── Détecteurs de règles ───────────────────────────────────────────────────────

def _detect_qalqalah(word: str) -> List[dict]:
    """
    Détecte les positions de Qalqalah (القلقلة).

    Conditions :
    - La lettre (قطبجد) porte un Sukoon explicite (Sughra)
    - La lettre est en fin de mot (Kubra — sukoon implicite au waqf)
    """
    rules = []
    chars = list(word)

    for i, char in enumerate(chars):
        if char not in QALQALAH_LETTERS:
            continue

        # Parcourir les diacritiques immédiatement après la lettre
        has_sukoon = False
        j = i + 1
        while j < len(chars) and _is_diacritic(chars[j]):
            if chars[j] == SUKOON:
                has_sukoon = True
            j += 1
        is_last_letter = (j >= len(chars))   # plus aucune lettre après

        if has_sukoon or is_last_letter:
            # Sukoon explicite → Sughra (lecture en wasl)
            # Dernière lettre sans sukoon → Kubra (sukoon implicite au waqf)
            subtype = "Sughra" if has_sukoon else "Kubra"
            rules.append({
                "rule": "Qalqalah",
                "subtype": subtype,
                "letter": char,
                "feedback_correct": f"Qalqalah {subtype} bien appliquée sur '{char}'.",
                "feedback_missing": f"Appliquez le rebond (Qalqalah {subtype}) sur '{char}'.",
            })

    return rules


def _classify_noon_rule(next_word: Optional[str]) -> str:
    """Classifie la règle Noon Sakinah / Tanween selon la lettre initiale du mot suivant."""
    if not next_word:
        return "Izhar"
    first = _first_letter(next_word)
    if not first:
        return "Izhar"
    if first in THROAT_LETTERS:
        return "Izhar"
    if first in IQLAB_LETTER:
        return "Iqlab"
    if first in IDGHAM_GHUNNAH:
        return "Idgham avec Ghunnah"
    if first in IDGHAM_NO_GHUNNAH:
        return "Idgham sans Ghunnah"
    return "Ikhfa"


def _detect_noon_sakinah(word: str, next_word: Optional[str] = None) -> List[dict]:
    """
    Détecte Noon Sakinah (نْ) et Tanween (ً ٌ ٍ).
    Classifie la règle applicable selon le mot suivant.
    """
    rules = []
    chars = list(word)

    # Noon Sakinah : ن suivi de ْ
    for i, char in enumerate(chars):
        if char == NOON and i + 1 < len(chars) and chars[i + 1] == SUKOON:
            rule_type = _classify_noon_rule(next_word)
            rules.append({
                "rule": "Noon Sakinah",
                "subtype": rule_type,
                "letter": NOON,
                "feedback_correct": f"Noon Sakinah ({rule_type}) bien appliquée.",
                "feedback_missing": f"Appliquez la règle {rule_type} sur le Noon Sakinah.",
            })

    # Tanween : présence d'un des marqueurs ً ٌ ٍ dans le mot
    if any(c in TANWEEN for c in chars):
        rule_type = _classify_noon_rule(next_word)
        rules.append({
            "rule": "Tanween",
            "subtype": rule_type,
            "letter": "",
            "feedback_correct": f"Tanween ({rule_type}) bien appliqué.",
            "feedback_missing": f"Appliquez la règle {rule_type} sur le Tanween.",
        })

    return rules


def _classify_meem_rule(next_word: Optional[str]) -> str:
    """Classifie la règle Meem Sakinah selon la lettre initiale du mot suivant."""
    if not next_word:
        return "Izhar Shafawi"
    first = _first_letter(next_word)
    if first == MEEM:
        return "Idgham Shafawi"
    if first in IQLAB_LETTER:
        return "Ikhfa Shafawi"
    return "Izhar Shafawi"


def _detect_meem_sakinah(word: str, next_word: Optional[str] = None) -> List[dict]:
    """Détecte Meem Sakinah (مْ) et classifie la règle applicable."""
    rules = []
    chars = list(word)

    for i, char in enumerate(chars):
        if char == MEEM and i + 1 < len(chars) and chars[i + 1] == SUKOON:
            rule_type = _classify_meem_rule(next_word)
            rules.append({
                "rule": "Meem Sakinah",
                "subtype": rule_type,
                "letter": MEEM,
                "feedback_correct": f"Meem Sakinah ({rule_type}) bien appliquée.",
                "feedback_missing": f"Appliquez la règle {rule_type} sur le Meem Sakinah.",
            })

    return rules


def _detect_ghunnah_mushaddada(word: str) -> List[dict]:
    """
    Détecte Noon ou Meem avec Shadda (Ghunnah Mushaddada — 2 temps).
    C'est le degré de Ghunnah le plus fort.
    """
    rules = []
    chars = list(word)

    for i, char in enumerate(chars):
        if char not in (NOON, MEEM):
            continue
        # Chercher SHADDA parmi les diacritiques qui suivent la lettre
        # (en Uthmani, l'ordre peut être FATHA+SHADDA ou SHADDA+FATHA)
        has_shadda = False
        j = i + 1
        while j < len(chars) and _is_diacritic(chars[j]):
            if chars[j] == SHADDA:
                has_shadda = True
            j += 1
        if has_shadda:
            letter_name = "Noon" if char == NOON else "Meem"
            rules.append({
                "rule": "Ghunnah Mushaddada",
                "subtype": letter_name,
                "letter": char,
                "feedback_correct": f"Ghunnah bien nasalisée sur le {letter_name} Mushaddad (2 temps).",
                "feedback_missing": f"Nasalisez le {letter_name} avec Shadda (Ghunnah 2 temps).",
            })

    return rules


def _detect_madd(word: str, next_word: Optional[str] = None) -> List[dict]:
    """
    Détecte les positions de Madd (prolongation) — niveau 3.

    Patterns reconnus :
    - Fatha  + Alef (ا)              → vérifier suite pour classifier
    - Damma  + Waw  (و) + Sukoon    → idem
    - Kasra  + Ya   (ي) + Sukoon    → idem

    Types :
    - Madd Tabii (2 temps)           : pas de hamza après
    - Madd Wajib Muttasil (4-5 t.)  : hamza dans le même mot
    - Madd Jaiz Munfasil (2-4 t.)   : hamza en début du mot suivant
    """
    rules = []
    chars = list(word)

    for i, char in enumerate(chars):
        if i == 0:
            continue
        prev = chars[i - 1]
        is_madd = False

        if char == 'ا' and prev == FATHA:
            is_madd = True
        elif char == 'و' and prev == DAMMA:
            # En texte Uthmani, le sukoon sur و de Madd est souvent implicite
            is_madd = True
        elif char == 'ي' and prev == KASRA:
            # Idem pour ي de Madd
            is_madd = True

        if not is_madd:
            continue

        # Classifier le type de Madd
        remaining_letters = [c for c in chars[i + 1:] if not _is_diacritic(c)]
        has_internal_hamza = any(c in HAMZA_LETTERS for c in remaining_letters)

        if has_internal_hamza:
            madd_type = "Madd Wajib Muttasil (4-5 temps)"
        elif next_word and _first_letter(next_word) in HAMZA_LETTERS:
            madd_type = "Madd Jaiz Munfasil (2-4 temps)"
        else:
            madd_type = "Madd Tabii (2 temps)"

        rules.append({
            "rule": "Madd",
            "subtype": madd_type,
            "letter": char,
            "feedback_correct": f"{madd_type} bien respecté.",
            "feedback_missing": f"Allongez correctement : {madd_type}.",
        })

    return rules


# ── Moteur principal ───────────────────────────────────────────────────────────

class TajweedEngine:
    """
    Moteur de validation du Tajwid — 3 niveaux de difficulté.

    Niveau 1 — Mémorisation :
        Vérifie la présence des mots. Les règles Tajwid ne sont pas enforced.

    Niveau 2 — Tajwid Fondamental :
        Qalqalah, Noon Sakinah / Tanween, Meem Sakinah, Ghunnah Mushaddada.
        Détection depuis le texte de référence (diacritiques).
        Vérification de présence (l'analyse audio viendra compléter).

    Niveau 3 — Excellence (Ijaza / Hafs) :
        Tous les niveaux 2 + règles de Madd (Tabii, Muttasil, Munfasil).
        Une règle non appliquée invalide le mot.
    """

    LEVEL_CONFIGS: Dict[int, Dict[str, Any]] = {
        1: {"threshold_per_word": 0.15, "enforce_tajweed": False, "normalize_type": "heavy"},
        2: {"threshold_per_word": 0.50, "enforce_tajweed": True,  "normalize_type": "medium"},
        3: {"threshold_per_word": 0.80, "enforce_tajweed": True,  "normalize_type": "strict"},
    }

    @staticmethod
    def analyze_word(
        word_expected: str,
        word_student: str,
        level: int = 1,
        next_word: Optional[str] = None,
        audio_segment=None,
        beat_duration: float = 0.30,
    ) -> Dict[str, Any]:
        """
        Analyse un mot selon le niveau de difficulté.

        Args:
            word_expected : mot de référence avec diacritiques (Uthmani)
            word_student  : mot prononcé par l'élève (transcrit par Whisper)
            level         : 1, 2 ou 3
            next_word     : mot suivant dans le texte (règles inter-mots)
            audio_segment : numpy array float32 du segment audio du mot (optionnel)
            beat_duration : durée estimée d'un temps (haraka) en secondes

        Returns:
            {"valid": bool, "confidence": float, "rules": [...]}
        """
        from backend.app.services.quran import normalize_arabic

        config = TajweedEngine.LEVEL_CONFIGS.get(level, TajweedEngine.LEVEL_CONFIGS[1])

        # ── 1. Correspondance textuelle ────────────────────────────────────────
        norm_expected = normalize_arabic(word_expected)
        norm_student  = normalize_arabic(word_student) if word_student else ""

        text_similarity = (
            difflib.SequenceMatcher(None, norm_expected, norm_student).ratio()
            if norm_student else 0.0
        )
        is_valid = text_similarity >= config["threshold_per_word"]

        # ── 2. Détection et vérification des règles Tajwid ────────────────────
        rules_results = []

        if config["enforce_tajweed"]:
            raw_rules = TajweedEngine._get_rules_for_word(word_expected, next_word, level)

            for rule_info in raw_rules:
                success, confidence = TajweedEngine._check_rule(
                    rule_info, word_student, audio_segment, beat_duration
                )

                # Niveau 3 : toute règle absente invalide le mot
                if not success and level == 3:
                    is_valid = False

                rules_results.append({
                    "rule": rule_info["rule"],
                    "subtype": rule_info.get("subtype", ""),
                    "status": "correct" if success else "absent",
                    "confidence": confidence,
                    "feedback": (
                        rule_info["feedback_correct"] if success
                        else rule_info["feedback_missing"]
                    ),
                })

        return {
            "valid": is_valid,
            "confidence": round(text_similarity, 3),
            "rules": rules_results,
        }

    @staticmethod
    def _get_rules_for_word(
        word: str,
        next_word: Optional[str] = None,
        level: int = 2,
    ) -> List[dict]:
        """Collecte toutes les règles Tajwid applicables à ce mot depuis le texte de référence."""
        rules: List[dict] = []
        rules.extend(_detect_qalqalah(word))
        rules.extend(_detect_noon_sakinah(word, next_word))
        rules.extend(_detect_meem_sakinah(word, next_word))
        rules.extend(_detect_ghunnah_mushaddada(word))
        if level >= 3:
            rules.extend(_detect_madd(word, next_word))
        return rules

    @staticmethod
    def _check_rule(
        rule_info: dict,
        word_student: str,
        audio_segment,
        beat_duration: float,
    ) -> tuple:
        """
        Vérifie la conformité d'une règle en 3 étapes de priorité :

        1. Mot absent (non prononcé)         → False, 0.0
        2. Segment audio disponible          → vérification acoustique
        3. Pas de segment (timestamps nuls)  → présence textuelle confirmée → True, 0.60
        """
        if not word_student:
            return False, 0.0

        has_audio = audio_segment is not None and len(audio_segment) > 0
        if has_audio:
            return TajweedEngine._check_rule_audio(rule_info, audio_segment, beat_duration)

        # Fallback : mot prononcé mais pas de segment isolable
        return True, 0.60

    @staticmethod
    def _check_rule_audio(
        rule_info: dict,
        segment,
        beat_duration: float,
    ) -> tuple:
        """
        Dispatche vers la fonction audio adaptée à chaque règle.

        Règles → fonctions :
          Qalqalah                       → check_qalqalah  (énergie tail)
          Madd                           → check_madd_duration (durée vs beats)
          Noon Sakinah / Tanween
          Meem Sakinah / Ghunnah Mushaddada → check_ghunnah (spectre nasal)
        """
        from backend.app.services.audio_analysis import (
            check_qalqalah,
            check_madd_duration,
            check_ghunnah,
            SR,
        )

        rule    = rule_info["rule"]
        subtype = rule_info.get("subtype", "")

        if rule == "Qalqalah":
            return check_qalqalah(segment, SR)

        if rule == "Madd":
            return check_madd_duration(segment, SR, subtype, beat_duration)

        if rule in ("Noon Sakinah", "Tanween", "Meem Sakinah", "Ghunnah Mushaddada"):
            return check_ghunnah(segment, SR)

        # Règle non encore couverte → neutre
        return True, 0.60
