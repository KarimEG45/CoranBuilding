from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
import os
from backend.app.core.config import settings

router = APIRouter()

@router.get("/{page_request}")
async def get_quran_page(page_request: str):
    # The frontend might request "057.svg" or "57"
    # User provided files: Quran_Page_003.jpg = Page 1
    # Logic from backend_server.py: target_num = page_num + 2
    try:
        clean_name = page_request.split('.')[0]
        page_num = int(clean_name)
        
        target_num = page_num + 2
        filename = f"Quran_Page_{str(target_num).zfill(3)}.jpg"
        
        file_path = os.path.join(settings.QURAN_PAGES_DIR, filename)
        if os.path.exists(file_path):
            return FileResponse(file_path)
            
    except Exception as e:
        print(f"Error serving local page {page_request}: {e}")
        
    raise HTTPException(status_code=404, detail="Page not found locally")
