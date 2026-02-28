import os
import sys

class Settings:
    PROJECT_NAME: str = "The Coran Building"
    # Basic auth config
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super_secret_key_for_local_app_only")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./quran_app.db")

    # AI Config
    OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
    RUNNING_IN_DOCKER: bool = os.getenv("RUNNING_IN_DOCKER", "false").lower() == "true"

    # Paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    RECORDINGS_DIR: str = os.path.join(os.getcwd(), "recordings")
    
    # Handle PyInstaller paths
    if getattr(sys, 'frozen', False):
        BUNDLE_DIR = sys._MEIPASS
        STATIC_DIR: str = os.path.join(BUNDLE_DIR, "static")
        QURAN_PAGES_DIR: str = os.path.join(os.path.dirname(sys.executable), "quran_pages")
    else:
        STATIC_DIR: str = os.path.join(BASE_DIR, "backend", "static")
        QURAN_PAGES_DIR: str = os.path.join(BASE_DIR, "quran_pages")

    # Override with ENV if provided
    QURAN_PAGES_DIR = os.getenv("QURAN_PAGES_DIR", QURAN_PAGES_DIR)

    # GitHub repository for auto-updates (format: "username/repo-name")
    GITHUB_REPO: str = os.getenv("GITHUB_REPO", "")

settings = Settings()
