"""
package_zip.py — Crée un ZIP de distribution prêt-à-l'emploi pour les élèves.

Structure du ZIP :
  The Coran Building/
    QuranBuildingPro.exe    (serveur + frontend bundlés, Python inclus)
    ffmpeg.exe              (requis pour l'analyse audio Whisper)
    SETUP.bat               (installation Ollama + modèle IA, à lancer 1 fois)
    quran_pages/            (604 images du Coran)
    recordings/             (vide — les enregistrements y seront stockés)
    LISEZ-MOI.txt           (instructions simples)

Usage :
    python package_zip.py
"""

import os
import zipfile
import sys
import io

# Fix Windows console encoding for special characters
if sys.stdout and hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ─── Chemins ──────────────────────────────────────────────────────────────────

CURR_DIR       = os.path.dirname(os.path.abspath(__file__))
RELEASE_DIR    = os.path.join(CURR_DIR, "QuranBuilding_Release_PRO")
FFMPEG_SRC     = r"C:\Users\kelgh\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin\ffmpeg.exe"
ZIP_NAME       = os.path.join(CURR_DIR, "The_Coran_Building_Distribution.zip")
FOLDER_IN_ZIP  = "The Coran Building"

# ─── Vérifications préalables ─────────────────────────────────────────────────

def check(path, label):
    if not os.path.exists(path):
        print(f"ERREUR : {label} introuvable : {path}")
        sys.exit(1)

check(os.path.join(RELEASE_DIR, "Lancer.exe"),           "Lancer.exe")
check(os.path.join(RELEASE_DIR, "QuranBuildingPro.exe"), "QuranBuildingPro.exe")
check(FFMPEG_SRC,                                         "ffmpeg.exe")
check(os.path.join(RELEASE_DIR, "quran_pages"),           "quran_pages/")

# ─── Contenu du LISEZ-MOI ─────────────────────────────────────────────────────

README = """\
╔══════════════════════════════════════════════════════════════╗
║          THE CORAN BUILDING — Guide de démarrage             ║
╚══════════════════════════════════════════════════════════════╝

DÉMARRAGE
─────────
Double-cliquez sur  ►  Lancer.exe  ◄  à chaque fois.

C'est tout. L'application s'occupe de tout automatiquement.

PREMIÈRE UTILISATION
────────────────────
La première fois, Lancer.exe va :
  1. Installer le moteur IA (connexion internet requise, ~10 MB)
  2. Télécharger le modèle IA (~4.9 GB, 10-40 min selon la connexion)
  3. Ouvrir l'application dans votre navigateur

→ Une fenêtre de progression s'affiche. Ne la fermez pas.
→ Le téléchargement reprend là où il s'était arrêté si interrompu.

UTILISATIONS SUIVANTES
───────────────────────
Double-cliquez sur Lancer.exe → l'application s'ouvre en 5-10 sec.

PARE-FEU WINDOWS
─────────────────
Au premier lancement, Windows peut afficher une alerte de sécurité.
→ Cliquez sur « Autoriser l'accès »

FERMETURE DE L'APPLICATION
───────────────────────────
Fermez l'onglet du navigateur, puis faites un clic droit sur l'icône
The Coran Building dans la barre des tâches → Quitter.

CONTENU DU DOSSIER (ne rien supprimer)
───────────────────────────────────────
  Lancer.exe            — À double-cliquer pour démarrer
  QuranBuildingPro.exe  — Application (lancée automatiquement)
  ffmpeg.exe            — Moteur audio
  quran_pages/          — Pages du Coran
  recordings/           — Vos enregistrements

─────────────────────────────────────────────────────────────────
Pour toute question, contactez votre professeur.
"""

# ─── Assemblage du ZIP ────────────────────────────────────────────────────────

print(f"\nCreation du ZIP : {ZIP_NAME}")
print("Cela peut prendre quelques minutes (fichiers volumineux)...\n")

if os.path.exists(ZIP_NAME):
    os.remove(ZIP_NAME)
    print("Ancien ZIP supprime.")

quran_pages_src = os.path.join(RELEASE_DIR, "quran_pages")
exe_path        = os.path.join(RELEASE_DIR, "QuranBuildingPro.exe")

with zipfile.ZipFile(ZIP_NAME, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as zf:

    # 1. Lancer.exe (lanceur graphique — seul fichier que l'étudiant clique)
    lancer_path = os.path.join(RELEASE_DIR, "Lancer.exe")
    print("  Ajout de Lancer.exe...")
    zf.write(lancer_path, os.path.join(FOLDER_IN_ZIP, "Lancer.exe"))

    # 2. EXE principal
    print("  Ajout de QuranBuildingPro.exe...")
    zf.write(exe_path, os.path.join(FOLDER_IN_ZIP, "QuranBuildingPro.exe"))

    # 3. ffmpeg.exe
    print("  Ajout de ffmpeg.exe...")
    zf.write(FFMPEG_SRC, os.path.join(FOLDER_IN_ZIP, "ffmpeg.exe"))

    # 4. quran_pages/ (604 images)
    print("  Ajout de quran_pages/ (604 images)...")
    page_files = sorted(os.listdir(quran_pages_src))
    for i, fname in enumerate(page_files):
        fpath = os.path.join(quran_pages_src, fname)
        if os.path.isfile(fpath):
            zf.write(fpath, os.path.join(FOLDER_IN_ZIP, "quran_pages", fname))
        if (i + 1) % 100 == 0:
            print(f"    {i + 1}/{len(page_files)} images...")

    # 5. Dossier recordings/ vide
    zf.writestr(os.path.join(FOLDER_IN_ZIP, "recordings", ".gitkeep"), "")

    # 6. LISEZ-MOI.txt
    print("  Ajout de LISEZ-MOI.txt...")
    zf.writestr(os.path.join(FOLDER_IN_ZIP, "LISEZ-MOI.txt"), README.encode('utf-8').decode('utf-8'))

# ─── Résumé ───────────────────────────────────────────────────────────────────

zip_size_mb = os.path.getsize(ZIP_NAME) / (1024 * 1024)
print(f"\nZIP cree avec succes : {ZIP_NAME}")
print(f"Taille finale        : {zip_size_mb:.1f} MB")
print("\nContenu du ZIP :")
with zipfile.ZipFile(ZIP_NAME, 'r') as zf:
    for info in zf.infolist():
        if info.filename.endswith(".gitkeep"):
            print(f"  {os.path.dirname(info.filename)}/  (dossier vide)")
        elif "quran_pages" in info.filename and not info.filename.endswith("/"):
            pass  # skip individual page listing
        else:
            size_kb = info.compress_size // 1024
            print(f"  {info.filename}  ({size_kb} KB)")
    page_count = sum(1 for i in zf.infolist() if "quran_pages" in i.filename and i.filename.endswith(".jpg"))
    if page_count:
        print(f"  The Coran Building/quran_pages/  ({page_count} images)")
