"""
launcher.py — Lanceur graphique pour The Coran Building.

Rôle :
  1. Vérifie/installe Ollama (moteur IA)
  2. Démarre le service Ollama
  3. Télécharge le modèle llama3.1:8b si besoin (avec barre de progression)
  4. Lance QuranBuildingPro.exe
  5. Se ferme automatiquement

Les étudiants cliquent uniquement sur Lancer.exe, à chaque démarrage.
"""

import tkinter as tk
from tkinter import ttk
import threading
import subprocess
import requests
import os
import sys
import shutil
import json
import time

# ─── Constantes ───────────────────────────────────────────────────────────────

if getattr(sys, 'frozen', False):
    EXE_DIR = os.path.dirname(sys.executable)
else:
    EXE_DIR = os.path.dirname(os.path.abspath(__file__))

MAIN_EXE     = os.path.join(EXE_DIR, "QuranBuildingPro.exe")
OLLAMA_MODEL = "llama3.1:8b"
OLLAMA_API   = "http://localhost:11434"
OLLAMA_LOCAL = os.path.join(
    os.environ.get("LOCALAPPDATA", ""),
    "Programs", "Ollama", "ollama.exe"
)

# ─── Application Tkinter ──────────────────────────────────────────────────────

class LauncherApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self._build_window()
        self._build_ui()
        threading.Thread(target=self._run_setup, daemon=True).start()

    # ── Fenêtre ───────────────────────────────────────────────────────────────

    def _build_window(self):
        self.root.title("The Coran Building")
        self.root.geometry("540x300")
        self.root.resizable(False, False)
        self.root.configure(bg="#0f172a")
        self.root.update_idletasks()
        sw = self.root.winfo_screenwidth()
        sh = self.root.winfo_screenheight()
        self.root.geometry(f"540x300+{(sw-540)//2}+{(sh-300)//2}")
        # Empêche la fermeture accidentelle pendant le téléchargement
        self.allow_close = False
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    def _on_close(self):
        if self.allow_close:
            self.root.destroy()
        # Pendant le setup, on ignore la fermeture pour ne pas corrompre l'install

    # ── Interface ─────────────────────────────────────────────────────────────

    def _build_ui(self):
        tk.Label(
            self.root, text="The Coran Building",
            font=("Segoe UI", 22, "bold"),
            fg="#38bdf8", bg="#0f172a"
        ).pack(pady=(28, 2))

        tk.Label(
            self.root, text="Chargement de l'application…",
            font=("Segoe UI", 9),
            fg="#64748b", bg="#0f172a"
        ).pack(pady=(0, 18))

        self.status_var = tk.StringVar(value="Démarrage…")
        tk.Label(
            self.root, textvariable=self.status_var,
            font=("Segoe UI", 11, "bold"),
            fg="#e2e8f0", bg="#0f172a", wraplength=500
        ).pack(pady=(0, 8))

        # Barre de progression
        style = ttk.Style()
        style.theme_use("clam")
        style.configure(
            "Blue.Horizontal.TProgressbar",
            background="#38bdf8",
            troughcolor="#1e293b",
            bordercolor="#0f172a",
            lightcolor="#38bdf8",
            darkcolor="#0ea5e9",
        )
        self.progress_var = tk.DoubleVar(value=0)
        self.progressbar = ttk.Progressbar(
            self.root, variable=self.progress_var,
            mode="indeterminate", length=480,
            style="Blue.Horizontal.TProgressbar"
        )
        self.progressbar.pack(pady=(0, 8))
        self.progressbar.start(12)

        self.detail_var = tk.StringVar(value="")
        tk.Label(
            self.root, textvariable=self.detail_var,
            font=("Segoe UI", 9),
            fg="#64748b", bg="#0f172a", wraplength=500
        ).pack()

    # ── Mises à jour thread-safe ───────────────────────────────────────────────

    def _set_status(self, status: str, detail: str = "", pct: float | None = None):
        def _update():
            self.status_var.set(status)
            self.detail_var.set(detail)
            if pct is not None:
                if self.progressbar.cget("mode") != "determinate":
                    self.progressbar.stop()
                    self.progressbar.configure(mode="determinate")
                self.progress_var.set(pct)
            else:
                if self.progressbar.cget("mode") != "indeterminate":
                    self.progressbar.configure(mode="indeterminate")
                    self.progressbar.start(12)
        self.root.after(0, _update)

    def _set_error(self, msg: str):
        self.allow_close = True
        def _update():
            self.progressbar.stop()
            self.progressbar.configure(mode="determinate")
            self.progress_var.set(0)
            self.status_var.set("Une erreur s'est produite")
            self.detail_var.set(msg)
            tk.Button(
                self.root, text="Fermer",
                command=self.root.destroy,
                bg="#ef4444", fg="white",
                font=("Segoe UI", 10, "bold"),
                relief="flat", padx=24, pady=8, cursor="hand2"
            ).pack(pady=14)
        self.root.after(0, _update)

    def _set_done(self):
        self.allow_close = True
        def _update():
            self.progressbar.stop()
            self.progressbar.configure(mode="determinate")
            self.progress_var.set(100)
            self.status_var.set("L'application est prête !")
            self.detail_var.set("Votre navigateur va s'ouvrir… cette fenêtre se ferme dans 4 secondes.")
            self.root.after(4000, self.root.destroy)
        self.root.after(0, _update)

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _ollama_running(self) -> bool:
        try:
            return requests.get(OLLAMA_API, timeout=2).status_code == 200
        except Exception:
            return False

    def _model_ready(self) -> bool:
        try:
            data = requests.get(f"{OLLAMA_API}/api/tags", timeout=5).json()
            return any(OLLAMA_MODEL in m.get("name", "") for m in data.get("models", []))
        except Exception:
            return False

    def _find_ollama(self) -> str | None:
        cmd = shutil.which("ollama")
        if cmd:
            return cmd
        if os.path.exists(OLLAMA_LOCAL):
            return OLLAMA_LOCAL
        return None

    # ── Setup principal ───────────────────────────────────────────────────────

    def _run_setup(self):
        try:
            # ── 0. Vérification fichiers ──────────────────────────────────────
            if not os.path.exists(MAIN_EXE):
                self._set_error(
                    "QuranBuildingPro.exe est introuvable.\n"
                    "Assurez-vous que tous les fichiers sont dans le même dossier."
                )
                return

            # ── 1. Installation Ollama si nécessaire ──────────────────────────
            ollama_cmd = self._find_ollama()

            if not ollama_cmd:
                self._set_status(
                    "Installation du moteur IA (Ollama)…",
                    "Téléchargement ~10 MB — connexion internet requise"
                )
                setup_path = os.path.join(
                    os.environ.get("TEMP", os.environ.get("TMP", ".")),
                    "OllamaSetup.exe"
                )
                try:
                    resp = requests.get(
                        "https://ollama.com/download/OllamaSetup.exe",
                        stream=True, timeout=60
                    )
                    total = int(resp.headers.get("content-length", 0))
                    done  = 0
                    with open(setup_path, "wb") as f:
                        for chunk in resp.iter_content(65536):
                            if chunk:
                                f.write(chunk)
                                done += len(chunk)
                                if total:
                                    self._set_status(
                                        "Installation du moteur IA (Ollama)…",
                                        f"Téléchargement : {done//1048576} MB / {total//1048576} MB",
                                        done / total * 100
                                    )
                except Exception as e:
                    self._set_error(
                        f"Impossible de télécharger Ollama.\n"
                        f"Vérifiez votre connexion internet et relancez.\n\nDétail : {e}"
                    )
                    return

                self._set_status("Installation d'Ollama…", "Quelques secondes…")
                result = subprocess.run(
                    [setup_path, "/VERYSILENT", "/NORESTART"],
                    capture_output=True
                )
                if result.returncode != 0:
                    subprocess.run([setup_path], capture_output=True)
                time.sleep(10)

                ollama_cmd = self._find_ollama()
                if not ollama_cmd:
                    self._set_error(
                        "L'installation d'Ollama a échoué.\n"
                        "Relancez Lancer.exe en tant qu'administrateur\n"
                        "(clic droit → Exécuter en tant qu'administrateur)."
                    )
                    return

            # ── 2. Démarrage du service Ollama ────────────────────────────────
            if not self._ollama_running():
                self._set_status("Démarrage du moteur IA…", "Quelques secondes…")
                subprocess.Popen(
                    [ollama_cmd, "serve"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    creationflags=subprocess.CREATE_NO_WINDOW
                )
                for i in range(20):
                    time.sleep(2)
                    if self._ollama_running():
                        break
                    self._set_status("Démarrage du moteur IA…", f"Attente… ({(i+1)*2}s)")
                else:
                    self._set_error(
                        "Le moteur IA ne répond pas.\n"
                        "Redémarrez votre ordinateur puis relancez Lancer.exe."
                    )
                    return

            # ── 3. Téléchargement du modèle IA ────────────────────────────────
            if not self._model_ready():
                self._set_status(
                    "Téléchargement du modèle IA…",
                    "Première installation uniquement • ~4.9 GB\n"
                    "Ne fermez pas cette fenêtre — le téléchargement est repris si interrompu"
                )
                start = time.time()
                try:
                    with requests.post(
                        f"{OLLAMA_API}/api/pull",
                        json={"name": OLLAMA_MODEL},
                        stream=True,
                        timeout=14400  # 4h max
                    ) as r:
                        for raw_line in r.iter_lines():
                            if not raw_line:
                                continue
                            try:
                                data = json.loads(raw_line)
                            except Exception:
                                continue

                            completed = data.get("completed", 0)
                            total     = data.get("total", 0)
                            status    = data.get("status", "")

                            if "success" in status.lower():
                                break

                            if total > 0 and completed > 0:
                                pct     = completed / total * 100
                                elapsed = time.time() - start
                                speed   = completed / elapsed if elapsed > 0 else 1
                                remain  = (total - completed) / speed

                                comp_gb  = completed / 1_073_741_824
                                total_gb = total / 1_073_741_824

                                if remain > 3600:
                                    t_str = f"~{int(remain/3600)}h{int((remain%3600)/60)}min restantes"
                                elif remain > 60:
                                    t_str = f"~{int(remain/60)} min restantes"
                                else:
                                    t_str = f"~{int(remain)} sec restantes"

                                self._set_status(
                                    "Téléchargement du modèle IA…",
                                    f"{comp_gb:.2f} GB / {total_gb:.2f} GB  •  {t_str}",
                                    pct
                                )
                            elif status:
                                self._set_status("Téléchargement du modèle IA…", status)

                except Exception as e:
                    self._set_error(
                        f"Erreur pendant le téléchargement du modèle.\n"
                        f"Relancez Lancer.exe — le téléchargement reprendra où il s'est arrêté.\n\n"
                        f"Détail : {e}"
                    )
                    return

            # ── 4. Lancement de l'application ─────────────────────────────────
            self._set_status("Lancement de l'application…", "Ouverture du navigateur…")
            subprocess.Popen(
                [MAIN_EXE],
                cwd=EXE_DIR,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            self._set_done()

        except Exception as e:
            self._set_error(f"Erreur inattendue :\n{e}")


# ─── Point d'entrée ───────────────────────────────────────────────────────────

def main():
    root = tk.Tk()
    LauncherApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()
