from fastapi import APIRouter
from backend.app.api.v1 import auth, users, analysis, pages, system
from backend.app.api.v1 import update as update_api

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(analysis.router, prefix="/recitation", tags=["recitation"])
api_router.include_router(pages.router, prefix="/quran_pages", tags=["pages"])
api_router.include_router(system.router, prefix="/system", tags=["system"])
api_router.include_router(update_api.router, prefix="/update", tags=["update"])
