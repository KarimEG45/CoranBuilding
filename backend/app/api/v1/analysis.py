from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from datetime import datetime
import os
import shutil
import difflib
import logging
import json
from typing import Optional

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user_optional, get_password_hash # Import the new optional auth
from backend.app.models.models import User, Progress, Recording
from backend.app.core.config import settings
from backend.app.services.transcription import transcribe, transcribe_with_timestamps
from backend.app.services.audio_analysis import (
    load_audio_for_analysis,
    extract_segment,
    estimate_beat_duration,
)
from backend.app.services.feedback import get_ai_feedback
from backend.app.services.quran import get_quran_page_text, normalize_arabic
from backend.app.services.tajweed_engine import TajweedEngine

logger = logging.getLogger(__name__)
router = APIRouter()

os.makedirs(settings.RECORDINGS_DIR, exist_ok=True)


def _align_words(words_expected: list[str], transcribed_words: list[dict]) -> list[dict]:
    """
    Aligne les mots attendus avec les mots transcrits (+ leurs timestamps).

    Utilise difflib.SequenceMatcher sur des listes normalisées pour gérer les
    mots manquants, ajoutés ou mal prononcés — au lieu d'un simple index.

    Args:
        words_expected: liste des mots du texte de référence (avec diacritiques)
        transcribed_words: liste de {"word": str, "start": float, "end": float}

    Returns:
        Liste de {
            "expected": str,      # mot de référence
            "transcribed": str,   # mot dit par l'élève (vide si absent)
            "start": float,       # timestamp début (0.0 si absent)
            "end": float,         # timestamp fin (0.0 si absent)
        }
    """
    transcribed_texts = [w["word"] for w in transcribed_words]

    norm_expected = [normalize_arabic(w) for w in words_expected]
    norm_transcribed = [normalize_arabic(w) for w in transcribed_texts]

    matcher = difflib.SequenceMatcher(None, norm_expected, norm_transcribed, autojunk=False)

    alignment = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            for i, j in zip(range(i1, i2), range(j1, j2)):
                tw = transcribed_words[j]
                alignment.append({
                    "expected": words_expected[i],
                    "transcribed": tw["word"],
                    "start": tw["start"],
                    "end": tw["end"],
                })
        elif tag == "replace":
            # Appaire autant de mots que possible entre les deux blocs
            pairs = min(i2 - i1, j2 - j1)
            for k in range(pairs):
                tw = transcribed_words[j1 + k]
                alignment.append({
                    "expected": words_expected[i1 + k],
                    "transcribed": tw["word"],
                    "start": tw["start"],
                    "end": tw["end"],
                })
            # Mots attendus en surplus (non prononcés)
            for i in range(i1 + pairs, i2):
                alignment.append({
                    "expected": words_expected[i],
                    "transcribed": "",
                    "start": 0.0,
                    "end": 0.0,
                })
        elif tag == "delete":
            # Mots attendus absents de la transcription
            for i in range(i1, i2):
                alignment.append({
                    "expected": words_expected[i],
                    "transcribed": "",
                    "start": 0.0,
                    "end": 0.0,
                })
        # tag == "insert" : mots en trop dans la transcription, ignorés côté attendu

    return alignment

@router.post("/analyze")
def analyze_recitation(
    page_id: int = Form(...), 
    audio: UploadFile = File(...),
    difficulty_level: int = Form(1),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Endpoint EXPERT : Fournit une analyse détaillée mot-à-mot avec règles de Tajweed.
    """
    # Keep server alive
    from backend.app.api.v1 import system
    import time
    system.last_heartbeat = time.time()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"analysis_p{page_id}_{timestamp}.webm"
    file_path = os.path.join(settings.RECORDINGS_DIR, filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)
            
        # 1. Transcription Whisper avec timestamps mot par mot
        logger.info(f"Analyzing audio for Page {page_id}")
        transcription_result = transcribe_with_timestamps(file_path)
        raw_text = transcription_result["text"]
        transcribed_words = transcription_result["words"]
        logger.info(f"Whisper: {len(transcribed_words)} mots avec timestamps")

        # Chargement audio pour l'analyse acoustique (même fichier, via ffmpeg)
        audio_data = load_audio_for_analysis(file_path)

        expected_text = get_quran_page_text(page_id)
        if not expected_text:
            raise HTTPException(status_code=404, detail="Texte Coranique introuvable")

        words_expected = expected_text.split()

        # 2. Alignement réel via difflib (remplace le faux i * 0.8)
        aligned = _align_words(words_expected, transcribed_words)

        beat_duration = estimate_beat_duration(aligned)
        logger.info(f"Beat duration estimé : {beat_duration:.3f}s")

        analysis_words = []
        matched_count: int = 0

        for idx, entry in enumerate(aligned):
            next_entry = aligned[idx + 1] if idx + 1 < len(aligned) else None
            next_word  = next_entry["expected"] if next_entry else None

            # Extraire le segment audio du mot (None si timestamps absents)
            segment = extract_segment(audio_data, entry["start"], entry["end"]) \
                      if audio_data is not None else None

            word_analysis = TajweedEngine.analyze_word(
                word_expected=entry["expected"],
                word_student=entry["transcribed"],
                level=difficulty_level,
                next_word=next_word,
                audio_segment=segment,
                beat_duration=beat_duration,
            )

            if word_analysis["valid"]:
                matched_count += 1

            analysis_words.append({
                "text": entry["expected"],
                "start": entry["start"],
                "end": entry["end"],
                "valid": word_analysis["valid"],
                "confidence": word_analysis["confidence"],
                "tajweed_rules": word_analysis["rules"],
                "feedback": "" if word_analysis["valid"] else "Améliorez la précision pour ce niveau."
            })

        similarity_ratio = matched_count / len(words_expected) if words_expected else 0
        
        # 3. Coaching IA
        feedback_text = get_ai_feedback(expected_text, raw_text, similarity_ratio)
        
        # Sauvegarde Historique
        try:
            user_to_save = current_user
            if not user_to_save:
                 user_to_save = db.query(User).filter(User.username == "guest").first()
            
            if user_to_save:
                new_recording = Recording(
                    user_id=user_to_save.id,
                    page_number=page_id,
                    file_path=f"recordings/{filename}",
                    score=int(similarity_ratio * 100),
                    feedback=feedback_text
                )
                db.add(new_recording)
                db.commit()
        except Exception as e:
            logger.error(f"Failed to save recording: {e}")
            db.rollback()

        return {
            "status": "success",
            "overall_score": similarity_ratio,
            "transcription": raw_text,
            "analysis": {
                "words": analysis_words
            },
            "audio_url": f"/recordings/{filename}",
            "feedback": feedback_text,
            "disclaimer": "Outil d'apprentissage assisté par IA. Ne remplace pas un enseignant certifié."
        }

    except Exception as e:
        logger.exception("CRITICAL ERROR in analyze_recitation")
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/validate")
def validate_recitation(
    page: int = Form(...), 
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_current_user_optional), # Optional Auth
    db: Session = Depends(get_db)
):
    # Keep server alive during analysis
    from backend.app.api.v1 import system
    import time
    system.last_heartbeat = time.time()

    logger.info(f"Received request for Page {page}")
    
    # Handle Guest User
    if not current_user:
        logger.info("Unauthenticated user. Using 'guest' account.")
        guest_user = db.query(User).filter(User.username == "guest").first()
        if not guest_user:
            logger.info("Creating 'guest' user.")
            guest_user = User(
                username="guest", 
                hashed_password=get_password_hash("guest"), 
                mushaf_type="madani", 
                difficulty_level=1
            )
            db.add(guest_user)
            db.commit()
            db.refresh(guest_user)
        current_user = guest_user

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"page_{page}_{timestamp}.webm"
    file_path = os.path.join(settings.RECORDINGS_DIR, filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        logger.info(f"File saved: {file_path}")
        
        # 2. Transcription Whisper
        logger.info("Starting Whisper transcription...")
        try:
            transcribed_text = transcribe(file_path)
            logger.info(f"Whisper Transcription: {transcribed_text}")
        except Exception as e:
            logger.error(f"Whisper Transcription Error: {e}")
            # Do NOT return 500 immediately for transcription error, maybe fallback?
            # But without text we can't do anything.
            # Return a clear JSON structure that frontend treats as error but not Connection Error
            return JSONResponse(status_code=400, content={"message": "Transcription échouée", "detail": str(e)})

        if len(transcribed_text) < 3:
            return {
                "valid": False, 
                "feedback": "Je n'ai pas pu entendre votre récitation. Parlez plus fort.", 
                "audio_url": f"/recordings/{filename}"
            }

        expected_text = get_quran_page_text(page)
        if not expected_text:
            return {"valid": True, "feedback": "Texte Coranique introuvable, validation simulée.", "audio_url": f"/recordings/{filename}"}

        clean_expected = normalize_arabic(expected_text)
        clean_student = normalize_arabic(transcribed_text)
        
        matcher = difflib.SequenceMatcher(None, clean_expected, clean_student)
        similarity_ratio = matcher.ratio()
        logger.info(f"Similarity Ratio: {similarity_ratio:.2f}")

        is_valid = False
        feedback_text = ""
        
        THRESHOLD_PERFECT = 0.85
        THRESHOLD_REJECT = 0.50

        if similarity_ratio >= THRESHOLD_PERFECT:
            is_valid = True
            feedback_text = "MachaAllah ! Récitation excellente."
        elif similarity_ratio < THRESHOLD_REJECT:
            is_valid = False
            feedback_text = "Trop d'écarts. Révisez bien."
        else:
            is_valid = (similarity_ratio >= 0.70)
            feedback_text = get_ai_feedback(clean_expected, clean_student, similarity_ratio)

        # Save to DB
        try:
            db_file_path = f"recordings/{filename}"
            new_recording = Recording(
                user_id=current_user.id,
                page_number=page,
                file_path=db_file_path,
                score=int(similarity_ratio * 100),
                feedback=feedback_text
            )
            db.add(new_recording)
            
            if is_valid:
                prog = db.query(Progress).filter(Progress.user_id==current_user.id, Progress.page_number==page).first()
                if not prog:
                    prog = Progress(user_id=current_user.id, page_number=page, status="mastered")
                    db.add(prog)
                else:
                    prog.status = "mastered"
                    prog.last_updated = datetime.now()
            
            db.commit()
        except Exception as e:
            logger.exception("DB Save Error")
            db.rollback()

        return {
            "valid": is_valid,
            "feedback": feedback_text,
            "audio_url": f"/recordings/{filename}",
            "transcription": transcribed_text
        }

    except Exception as e:
        logger.exception("CRITICAL ERROR in validate_recitation")
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.get("/history/{page}")
def get_recording_history(page: int, current_user: Optional[User] = Depends(get_current_user_optional), db: Session = Depends(get_db)):
    if not current_user: 
        return [] # Empty history for guest
        
    try:
        recordings = db.query(Recording).filter(
            Recording.user_id == current_user.id,
            Recording.page_number == page
        ).order_by(Recording.timestamp.desc()).limit(5).all()
        
        history = []
        for r in recordings:
            filename = os.path.basename(r.file_path)
            url = f"/recordings/{filename}"
            
            history.append({
                "id": r.id,
                "url": url,
                "timestamp": r.timestamp.isoformat() if r.timestamp else datetime.now().isoformat(),
                "score": r.score,
                "feedback": r.feedback
            })
            
        return history
    except Exception as e:
        logger.exception("History Error")
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.delete("/recording/{recording_id}")
def delete_recording(
    recording_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    try:
        recording = db.query(Recording).filter(Recording.id == recording_id).first()
        if not recording:
            raise HTTPException(status_code=404, detail="Enregistrement introuvable")
        
        # Check ownership
        if current_user and recording.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Non autorisé")

        # Delete file
        file_path = os.path.join(settings.RECORDINGS_DIR, os.path.basename(recording.file_path))
        if os.path.exists(file_path):
            os.remove(file_path)
        
        db.delete(recording)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        logger.exception("Delete Error")
        return JSONResponse(status_code=500, content={"error": str(e)})
