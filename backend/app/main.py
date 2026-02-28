from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.api import api_router
from backend.app.core.config import settings
from backend.app.core.database import Base, engine
from backend.app.services.feedback import ensure_ollama_ready
import threading
import os
import sys
import logging
from fastapi.responses import FileResponse, JSONResponse

# ---------------------------------------------------------------------------
# Static directory resolution — prefer EXE_DIR/static/ (updated by updater)
# over the bundled _MEIPASS/static/ (original build).
#
# _resolve_static() is called on every request so frontend hot-swap works
# without restarting the backend process.
# ---------------------------------------------------------------------------
_FROZEN = getattr(sys, 'frozen', False)
_EXE_DIR = os.path.dirname(sys.executable) if _FROZEN else os.getcwd()
_EXT_STATIC = os.path.join(_EXE_DIR, 'static')
_MEIPASS_STATIC = os.path.join(getattr(sys, '_MEIPASS', ''), 'static')


def _resolve_static() -> str:
    """Return the active static directory (re-evaluated on each call)."""
    if os.path.exists(_EXT_STATIC):
        return _EXT_STATIC
    return _MEIPASS_STATIC if _FROZEN else settings.STATIC_DIR


# Evaluate once at startup for mount and logging (remount not needed — see serve_spa)
RESOLVED_STATIC = _resolve_static()

# Configure Logging
logging.basicConfig(
    filename='backend_debug.log', 
    level=logging.DEBUG, 
    format='%(asctime)s %(levelname)s %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

# Create Tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware: Update Heartbeat on every request
from backend.app.api.v1 import system
import time

@app.middleware("http")
async def update_heartbeat_middleware(request: Request, call_next):
    system.last_heartbeat = time.time()
    response = await call_next(request)
    return response

os.makedirs(settings.RECORDINGS_DIR, exist_ok=True)
app.mount("/recordings", StaticFiles(directory=settings.RECORDINGS_DIR), name="recordings")

app.include_router(api_router, prefix="/api/v1")

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Global Exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "detail": str(exc)},
    )

from backend.app.api.v1.system import start_shutdown_monitor
import webbrowser

@app.on_event("startup")
async def startup_event():
    logger.info("Starting Backend...")
    # Start Ollama check in background
    threading.Thread(target=ensure_ollama_ready, daemon=True).start()

    # Start Shutdown Monitor
    start_shutdown_monitor()

    # Open Browser (Delayed slightly to ensure server is up)
    def open_browser():
        import time
        time.sleep(1.5)
        webbrowser.open("http://localhost:8001")

    threading.Thread(target=open_browser, daemon=True).start()

    # Check for updates 10 s after startup (daemon — won't block shutdown)
    from backend.app.services import updater as _updater

    def _delayed_update_check():
        import time
        time.sleep(10)
        _updater.check_for_updates()

    threading.Thread(target=_delayed_update_check, daemon=True).start()

# --- Verify Static Files ---
# Note: we intentionally do NOT mount /_next as a StaticFiles route here.
# All static asset requests are handled by serve_spa() which calls _resolve_static()
# on every request, enabling seamless frontend hot-swap without process restart.
if not os.path.exists(RESOLVED_STATIC):
    logger.warning(f"Static files directory '{RESOLVED_STATIC}' not found. Frontend will not be served.")
else:
    logger.info(f"Serving frontend from: {RESOLVED_STATIC}")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # API requests are handled by api_router
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="API route not found")

    # Re-evaluate active static dir on every request (enables frontend hot-swap)
    static_dir = _resolve_static()

    # Serve specific static files if they exist
    potential_path = os.path.join(static_dir, full_path)
    if os.path.exists(potential_path) and os.path.isfile(potential_path):
        return FileResponse(potential_path)

    # Serve index.html for SPA routing
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)

    return JSONResponse({"status": "error", "message": "Frontend not found"}, status_code=404)
