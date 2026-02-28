import PyInstaller.__main__
import os
import shutil
import sys
import whisper

# Configuration encodage
if sys.platform.startswith('win'):
    os.environ['PYTHONIOENCODING'] = 'utf-8'

# Récupération du chemin des assets Whisper
try:
    whisper_path = os.path.dirname(whisper.__file__)
    assets_path = os.path.join(whisper_path, 'assets')
except:
    assets_path = ""

curr_dir = os.getcwd()
frontend_out = os.path.join(curr_dir, 'frontend', 'out')
static_dir = os.path.join(curr_dir, 'backend', 'static')
release_dir = os.path.join(curr_dir, 'QuranBuilding_Release_PRO')

print(f"Building PRO version from: {curr_dir}")

# 1. Mise à jour des fichiers statiques (Frontend)
if os.path.exists(frontend_out):
    print("Updating static files from frontend/out...")
    if os.path.exists(static_dir):
        shutil.rmtree(static_dir)
    shutil.copytree(frontend_out, static_dir)
    # On s'assure que index.html est à la racine de static pour serve_spa
    if not os.path.exists(os.path.join(static_dir, "index.html")):
        print("WARNING: index.html not found in frontend/out")
else:
    print("ERROR: frontend/out not found. Please run 'npm run build' in frontend folder first.")
    # On ne s'arrête pas, on essaie avec l'existant

# 2. Commande PyInstaller
# Notes: server_pro.py est le point d'entrée qui gère le sys.path
PyInstaller.__main__.run([
    'server_pro.py',
    '--name=QuranBuildingPro',
    '--onefile',
    '--noconsole',
    f'--add-data={static_dir};static',
    '--add-data=version.json;.',
    f'--add-data={assets_path};whisper/assets' if assets_path else '',
    '--hidden-import=passlib.handlers.argon2',
    '--hidden-import=passlib.handlers.bcrypt',
    '--hidden-import=argon2',
    '--hidden-import=uvicorn.logging',
    '--hidden-import=uvicorn.loops.auto',
    '--hidden-import=uvicorn.protocols.http.auto',
    '--hidden-import=uvicorn.protocols.websockets.auto',
    '--hidden-import=uvicorn.lifespan.on',
    '--hidden-import=googleapiclient.discovery',
    '--hidden-import=google_auth_oauthlib.flow',
    '--hidden-import=sqlalchemy.dialects.postgresql',
    '--hidden-import=fasthtml',
    # ── Analyse audio (nouveau moteur Tajwid) ──────────────────────────────
    '--hidden-import=backend.app.services.audio_analysis',
    '--hidden-import=librosa',
    '--hidden-import=librosa.core',
    '--hidden-import=librosa.core.audio',
    '--hidden-import=librosa.feature',
    '--hidden-import=librosa.effects',
    '--hidden-import=librosa.util',
    '--hidden-import=soundfile',
    '--hidden-import=audioread',
    '--hidden-import=soxr',
    '--hidden-import=scipy',
    '--hidden-import=scipy.signal',
    '--hidden-import=scipy.fft',
    '--hidden-import=sklearn',
    '--hidden-import=numba',
    '--hidden-import=numba.core',
    '--hidden-import=llvmlite',
    '--collect-all=librosa',
    '--collect-all=numba',
    '--collect-all=uvicorn',
    '--clean',
    '--noconfirm',
])

print("Build finished. Organizing release folder...")

# Dossier de sortie final
if not os.path.exists(release_dir):
    os.makedirs(release_dir)

# Copie de l'EXE
exe_path = os.path.join(curr_dir, 'dist', 'QuranBuildingPro.exe')
if os.path.exists(exe_path):
    shutil.copy2(exe_path, os.path.join(release_dir, 'QuranBuildingPro.exe'))
    print(f"EXE copied to {release_dir}")

# Copie des pages du Coran (indispensable)
assets_to_copy = ['quran_pages']
for asset in assets_to_copy:
    src = os.path.join(curr_dir, asset)
    dst = os.path.join(release_dir, asset)
    if os.path.exists(src):
        if os.path.exists(dst):
            shutil.rmtree(dst)
        shutil.copytree(src, dst)
        print(f"Asset {asset} copied.")

# Création du dossier recordings vide
recs_dir = os.path.join(release_dir, 'recordings')
if not os.path.exists(recs_dir):
    os.makedirs(recs_dir)

# Copie du .env (Optionnel mais recommandé pour les réglages de base)
env_src = os.path.join(curr_dir, '.env')
if os.path.exists(env_src):
    shutil.copy2(env_src, os.path.join(release_dir, '.env'))
    print(".env copied to release.")

print(f"\nSUCCESS: Release PRO ready in: {release_dir}")
print("Check backend_debug.log if the app does not open.")
