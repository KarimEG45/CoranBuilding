"""
Auto-updater service — checks GitHub Releases for frontend and exe updates.

Frontend updates (~3 MB) are applied silently in-place.
Exe updates (~276 MB) are downloaded in the background and applied on next restart.
"""
import sys
import os
import json
import threading
import zipfile
import shutil
import logging
import urllib.request

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Path resolution
# ---------------------------------------------------------------------------

FROZEN = getattr(sys, 'frozen', False)
EXE_DIR = os.path.dirname(sys.executable) if FROZEN else os.getcwd()
MEIPASS_DIR = getattr(sys, '_MEIPASS', os.getcwd())

# ---------------------------------------------------------------------------
# Shared state (read by API endpoint)
# ---------------------------------------------------------------------------

_state: dict = {
    "frontend_updated": False,
    "exe_downloading": False,
    "exe_progress": 0,       # 0–100
    "exe_ready": False,
    "last_check": None,
    "error": None,
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_local_versions() -> tuple[str, str]:
    """Return (exe_version, frontend_version) from local files."""
    exe_version = "1.0.0"
    frontend_version = "1.0.0"

    # Base versions come from the bundled version.json (MEIPASS in frozen mode)
    meipass_vf = os.path.join(MEIPASS_DIR, "version.json")
    if os.path.exists(meipass_vf):
        try:
            with open(meipass_vf, encoding="utf-8") as f:
                data = json.load(f)
            exe_version = data.get("exe_version", exe_version)
            frontend_version = data.get("frontend_version", frontend_version)
        except Exception as e:
            logger.warning(f"Updater: could not read bundled version.json: {e}")

    # frontend_version may be overridden by a file written after an update
    fv_file = os.path.join(EXE_DIR, "static", "frontend_version.txt")
    if os.path.exists(fv_file):
        try:
            with open(fv_file, encoding="utf-8") as f:
                frontend_version = f.read().strip()
        except Exception as e:
            logger.warning(f"Updater: could not read frontend_version.txt: {e}")

    return exe_version, frontend_version


def _version_gt(v1: str, v2: str) -> bool:
    """Return True if semver v1 > v2."""
    def parse(v: str) -> tuple:
        return tuple(int(x) for x in v.strip().lstrip("v").split(".")[:3])
    try:
        return parse(v1) > parse(v2)
    except Exception:
        return False


def _get_github_repo() -> str:
    try:
        from backend.app.core.config import settings
        return getattr(settings, "GITHUB_REPO", "")
    except Exception:
        return ""


def _make_request(url: str, timeout: int = 15):
    req = urllib.request.Request(url, headers={"User-Agent": "QuranBuildingPro-Updater/1.0"})
    return urllib.request.urlopen(req, timeout=timeout)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def check_for_updates() -> None:
    """Check GitHub Releases for available updates. Called from a daemon thread."""
    import time
    _state["last_check"] = time.time()

    repo = _get_github_repo()
    if not repo:
        logger.info("Updater: GITHUB_REPO not configured — skipping update check.")
        return

    try:
        api_url = f"https://api.github.com/repos/{repo}/releases/latest"
        with _make_request(api_url) as resp:
            release_data = json.loads(resp.read())

        assets: dict[str, str] = {
            a["name"]: a["browser_download_url"]
            for a in release_data.get("assets", [])
        }

        if "version.json" not in assets:
            logger.warning("Updater: version.json not found in latest release assets.")
            return

        # Download remote version manifest
        with _make_request(assets["version.json"], timeout=10) as resp2:
            remote = json.loads(resp2.read())

        remote_fe = remote.get("frontend_version", "0.0.0")
        remote_exe = remote.get("exe_version", "0.0.0")

        local_exe, local_fe = _get_local_versions()
        logger.info(
            f"Updater: local exe={local_exe} fe={local_fe} | "
            f"remote exe={remote_exe} fe={remote_fe}"
        )

        # Frontend update (fast, blocking — only a few MB)
        if _version_gt(remote_fe, local_fe) and "frontend.zip" in assets:
            logger.info("Updater: frontend update available — downloading…")
            download_frontend_update(assets["frontend.zip"], remote_fe)

        # Exe update (heavy — run in background thread)
        if _version_gt(remote_exe, local_exe) and "QuranBuildingPro.exe" in assets:
            logger.info("Updater: exe update available — starting background download…")
            threading.Thread(
                target=download_exe_update,
                args=(assets["QuranBuildingPro.exe"],),
                daemon=True,
            ).start()

    except Exception as e:
        _state["error"] = str(e)
        logger.error(f"Updater: check_for_updates error: {e}")


def download_frontend_update(url: str, new_version: str) -> None:
    """Download frontend.zip and extract it to EXE_DIR/static/."""
    zip_path = os.path.join(EXE_DIR, "frontend_update.zip")
    static_path = os.path.join(EXE_DIR, "static")

    try:
        # Download
        with _make_request(url, timeout=120) as resp:
            with open(zip_path, "wb") as f:
                f.write(resp.read())

        # Replace static dir
        if os.path.exists(static_path):
            shutil.rmtree(static_path)

        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(static_path)

        # Record the installed frontend version
        with open(os.path.join(static_path, "frontend_version.txt"), "w", encoding="utf-8") as f:
            f.write(new_version)

        os.remove(zip_path)
        _state["frontend_updated"] = True
        logger.info(f"Updater: frontend updated to {new_version}")

    except Exception as e:
        _state["error"] = str(e)
        logger.error(f"Updater: download_frontend_update error: {e}")
        # Clean up partial download
        if os.path.exists(zip_path):
            try:
                os.remove(zip_path)
            except Exception:
                pass


def download_exe_update(url: str) -> None:
    """Download the new exe in the background and prepare the apply_update.bat."""
    _state["exe_downloading"] = True
    _state["exe_progress"] = 0
    _state["exe_ready"] = False

    new_exe_path = os.path.join(EXE_DIR, "QuranBuildingPro_new.exe")
    bat_path = os.path.join(EXE_DIR, "apply_update.bat")
    exe_path = os.path.join(EXE_DIR, "QuranBuildingPro.exe")

    try:
        with _make_request(url, timeout=600) as resp:
            total = int(resp.headers.get("Content-Length", 0))
            downloaded = 0
            chunk_size = 65536  # 64 KB

            with open(new_exe_path, "wb") as f:
                while True:
                    chunk = resp.read(chunk_size)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total > 0:
                        _state["exe_progress"] = int(downloaded * 100 / total)

        # Write the bat script that swaps the exe after this process exits
        with open(bat_path, "w", encoding="utf-8") as f:
            f.write("@echo off\n")
            f.write("timeout /t 3 /nobreak > nul\n")
            f.write(f'move /Y "{new_exe_path}" "{exe_path}"\n')
            f.write(f'start "" "{exe_path}"\n')
            f.write("del \"%~f0\"\n")

        _state["exe_progress"] = 100
        _state["exe_downloading"] = False
        _state["exe_ready"] = True
        logger.info("Updater: exe download complete — ready to apply on restart.")

    except Exception as e:
        _state["exe_downloading"] = False
        _state["error"] = str(e)
        logger.error(f"Updater: download_exe_update error: {e}")
        # Clean up partial download
        if os.path.exists(new_exe_path):
            try:
                os.remove(new_exe_path)
            except Exception:
                pass


def get_status() -> dict:
    """Return a copy of the current updater state."""
    return dict(_state)


def apply_exe_and_shutdown() -> None:
    """Launch apply_update.bat and exit the current process immediately."""
    bat_path = os.path.join(EXE_DIR, "apply_update.bat")
    if not os.path.exists(bat_path):
        raise FileNotFoundError(f"apply_update.bat not found in {EXE_DIR}")
    import subprocess
    subprocess.Popen(["cmd", "/c", bat_path])
    os._exit(0)
