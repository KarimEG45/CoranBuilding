from fastapi import APIRouter, HTTPException
from backend.app.services import updater

router = APIRouter()


@router.get("/status")
def get_update_status():
    """Return the current state of the auto-updater."""
    return updater.get_status()


@router.post("/apply-exe")
def apply_exe_update():
    """Apply the downloaded exe update and restart the application."""
    if not updater.get_status().get("exe_ready"):
        raise HTTPException(status_code=400, detail="No exe update ready to apply.")
    try:
        updater.apply_exe_and_shutdown()
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
