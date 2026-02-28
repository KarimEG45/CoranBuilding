
import logging
import requests
import subprocess
import shutil
import time
import os
import tempfile
import json
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

def ensure_model_pulled(model_name):
    logger.info(f"Check for model {model_name}...")
    try:
        # Check if Ollama is running first
        try:
            requests.get("http://localhost:11434", timeout=2)
        except requests.ConnectionError:
            logger.warning("Ollama server must be running to list models.")
            return

        # Attempt to run list command
        # On Windows, need shell=True sometimes or just subprocess calls
        # We rely on 'ollama' being in PATH
        res = subprocess.run(["ollama", "list"], capture_output=True, text=True, check=True)
        if model_name not in res.stdout:
            logger.info(f"Downloading model {model_name}...")
            subprocess.run(["ollama", "pull", model_name], check=True)
            logger.info(f"Model {model_name} ready.")
        else:
            logger.info(f"Model {model_name} already available.")
    except Exception as e:
        logger.error(f"Error checking/pulling model: {e}")

def ensure_ollama_ready():
    if settings.RUNNING_IN_DOCKER:
        logger.info("Running in Docker: Auto-install of Ollama disabled.")
        return

    # 1. Check if server already responds
    try:
        requests.get("http://localhost:11434", timeout=2)
        logger.info("Ollama server detected.")
        ensure_model_pulled(settings.OLLAMA_MODEL)
        return
    except:
        pass

    logger.info("Ollama server not detected. Checking installation...")
    
    # 2. Check if command exists
    ollama_cmd = shutil.which("ollama")
    if not ollama_cmd:
        logger.info("Ollama not installed. Downloading installer (Windows)...")
        setup_url = "https://ollama.com/download/OllamaSetup.exe"
        setup_path = os.path.join(tempfile.gettempdir(), "OllamaSetup.exe")
        
        try:
            response = requests.get(setup_url, stream=True)
            with open(setup_path, 'wb') as f:
                shutil.copyfileobj(response.raw, f)
            
            logger.info("Installing Ollama (silent mode)...")
            subprocess.run([setup_path, "/VERYSILENT"], check=True)
            logger.info("Ollama installed successfully.")
            time.sleep(5) 
        except Exception as e:
            logger.error(f"Error during auto-installation: {e}")
            return

    # 3. Start server
    logger.info("Starting Ollama server...")
    try:
        if os.name == 'nt':
            subprocess.Popen(["ollama", "serve"], creationflags=subprocess.CREATE_NEW_CONSOLE)
        else:
            subprocess.Popen(["ollama", "serve"])
    except Exception as e:
        logger.error(f"Failed to start Ollama server: {e}")

    # 4. Wait for server
    for i in range(30):
        try:
            requests.get("http://localhost:11434", timeout=2)
            logger.info("Ollama server started successfully.")
            ensure_model_pulled(settings.OLLAMA_MODEL)
            return
        except:
            if i % 5 == 0:
                logger.info(f"Waiting for Ollama server ({i}s)...")
            time.sleep(2)
    logger.error("Error: Ollama server did not respond after 60 seconds.")

def get_ai_feedback(expected_text: str, student_text: str, similarity_ratio: float):
    prompt = f"""
    Tu es un expert Tajwid. Analyse ces deux textes normalisés (sans voyelles).
    
    Attendu : {expected_text}
    Entendu : {student_text}
    
    Les textes se ressemblent à {int(similarity_ratio*100)}%.
    Explique brièvement les différences majeures (Mots oubliés ? Mots ajoutés ?).
    Ne sois PAS scolaire. Donne un conseil concis en français.
    
    Réponse (JSON) :
    {{ "feedback": "Ton conseil ici..." }}
    """
    
    ollama_payload = { "model": settings.OLLAMA_MODEL, "prompt": prompt, "stream": False, "format": "json" }
    
    try:
        ai_resp = requests.post(settings.OLLAMA_URL, json=ollama_payload, timeout=45)
        if ai_resp.status_code == 200:
            try:
                ai_json = json.loads(ai_resp.json().get("response", "{}"))
                return ai_json.get("feedback", "Attention à la précision de certains mots.")
            except:
                return "Quelques erreurs de prononciation détectées, soyez plus précis."
        else:
            logger.error(f"Ollama error {ai_resp.status_code}")
            return "L'IA n'a pas pu analyser en détail (Erreur serveur), mais la récitation semble correcte sur la forme."
    except requests.exceptions.Timeout:
        logger.error("IA Timeout")
        return "L'analyse IA a pris trop de temps. La récitation est validée techniquement, mais je n'ai pas pu générer de conseils détaillés."
    except Exception as e:
        logger.error(f"IA Error: {e}")
        return "Erreur technique lors de l'analyse, mais la récitation est enregistrée."
