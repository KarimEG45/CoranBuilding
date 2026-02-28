"""
build_launcher.py — Compile launcher.py en Lancer.exe (léger, ~20 MB).
Lance uniquement ce script, pas build_pro.py.
"""
import PyInstaller.__main__
import os
import shutil
import sys

curr_dir    = os.path.dirname(os.path.abspath(__file__))
release_dir = os.path.join(curr_dir, "QuranBuilding_Release_PRO")

if sys.platform.startswith("win"):
    os.environ["PYTHONIOENCODING"] = "utf-8"

print("Building Lancer.exe...")

PyInstaller.__main__.run([
    "launcher.py",
    "--name=Lancer",
    "--onefile",
    "--windowed",
    "--hidden-import=tkinter",
    "--hidden-import=tkinter.ttk",
    "--hidden-import=requests",
    "--hidden-import=urllib3",
    "--clean",
    "--noconfirm",
])

# Copie dans le dossier release
exe_src = os.path.join(curr_dir, "dist", "Lancer.exe")
exe_dst = os.path.join(release_dir, "Lancer.exe")

if os.path.exists(exe_src):
    os.makedirs(release_dir, exist_ok=True)
    shutil.copy2(exe_src, exe_dst)
    size_mb = os.path.getsize(exe_dst) / 1024 / 1024
    print(f"\nSUCCES : Lancer.exe ({size_mb:.1f} MB) copie dans {release_dir}")
else:
    print("ERREUR : Lancer.exe non trouve dans dist/")
