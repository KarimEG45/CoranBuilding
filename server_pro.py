import sys
import os
import multiprocessing

# 1. Ajustement du sys.path pour les imports "backend.app..."
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Support pour le multiprocessing dans PyInstaller
multiprocessing.freeze_support()

# Correction pour l'erreur 'isatty' dans le mode --noconsole de PyInstaller
if sys.stdout is None:
    sys.stdout = open(os.devnull, 'w')
if sys.stderr is None:
    sys.stderr = open(os.devnull, 'w')

# Ajout du dossier de l'exe au PATH pour que Whisper trouve ffmpeg.exe (distribution)
if getattr(sys, 'frozen', False):
    exe_dir = os.path.dirname(sys.executable)
    os.environ['PATH'] = exe_dir + os.pathsep + os.environ.get('PATH', '')

import uvicorn
from backend.app.main import app

if __name__ == "__main__":
    # Lancement du serveur avec désactivation explicite des couleurs pour éviter le crash logging
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info", use_colors=False)
