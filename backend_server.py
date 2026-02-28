import os
import sys

# Patch pour PyInstaller --noconsole sur Windows : rediriger stdout/stderr vers devnull
# pour éviter AttributeError: 'NoneType' object has no attribute 'isatty' dans Uvicorn
if sys.stdout is None:
    sys.stdout = open(os.devnull, 'w')
if sys.stderr is None:
    sys.stderr = open(os.devnull, 'w')
if sys.stdin is None:
    sys.stdin = open(os.devnull, 'r')

# --- Global Configurations ---
if getattr(sys, 'frozen', False):
    # If running as executable
    BASE_DIR = os.path.dirname(sys.executable)
else:
    # If running as script
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Chemins importants
RECORDINGS_DIR = os.path.join(BASE_DIR, "recordings")
if not os.path.exists(RECORDINGS_DIR):
    os.makedirs(RECORDINGS_DIR)

QURAN_PAGES_DIR = os.path.join(BASE_DIR, "quran_pages")
if not os.path.exists(QURAN_PAGES_DIR):
    os.makedirs(QURAN_PAGES_DIR)

import asyncio
import time
import tempfile
import json
import requests
import uvicorn
import whisper
import shutil
import subprocess
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Union, Any, Dict
import io

# Configuration des logs
logging.basicConfig(
    filename=os.path.join(BASE_DIR, 'server.log'), 
    level=logging.DEBUG, 
    format='%(asctime)s %(levelname)s %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)

# --- Google Drive API Imports ---
try:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
    GDRIVE_AVAILABLE = True
except ImportError:
    GDRIVE_AVAILABLE = False
    logger.warning("Google Drive libraries not found. Sync will be disabled. (Install google-auth-oauthlib and google-api-python-client)")

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from sqlalchemy.orm import Session
from passlib.context import CryptContext
from pydantic import BaseModel
from jose import JWTError, jwt
import passlib.handlers.argon2
import passlib.handlers.bcrypt

# Import Database Models
import database
from database import User, Progress, Recording, SessionLocal, engine

# Create Tables
database.Base.metadata.create_all(bind=engine)

# --- Migration ---
from sqlalchemy import text

def run_migrations():
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN mushaf_type VARCHAR DEFAULT 'madani'"))
            print("Migration: Added mushaf_type column.")
        except Exception as e:
            pass
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN difficulty_level INTEGER DEFAULT 1"))
            print("Migration: Added difficulty_level column.")
        except Exception: pass
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN daily_streak INTEGER DEFAULT 0"))
            print("Migration: Added daily_streak column.")
        except Exception: pass
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_active_date DATETIME"))
            print("Migration: Added last_active_date column.")
        except Exception: pass
        try:
            conn.execute(text("ALTER TABLE recordings ADD COLUMN details TEXT"))
            print("Migration: Added details column to recordings.")
        except Exception: pass

run_migrations()

app = FastAPI()

# --- Security Config ---
SECRET_KEY = "super_secret_key_for_local_app_only" # In prod, use env var
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 1 week expiration for convenience

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")

# --- Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Endpoint dédié pour servir les enregistrements audio avec les bons headers
@app.get("/recordings/{filename}")
async def serve_recording(filename: str):
    file_path = os.path.join(RECORDINGS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Recording not found: {filename}")
    # Déterminer le bon content type
    if filename.endswith(".webm"):
        media_type = "audio/webm"
    elif filename.endswith(".wav"):
        media_type = "audio/wav"
    elif filename.endswith(".mp3"):
        media_type = "audio/mpeg"
    else:
        media_type = "application/octet-stream"
    response = FileResponse(file_path, media_type=media_type, filename=filename)
    # Headers pour permettre le streaming audio (Accept-Ranges, pas de cache)
    response.headers["Accept-Ranges"] = "bytes"
    response.headers["Cache-Control"] = "no-cache"
    return response

logger.info(f"Serving recordings from: {RECORDINGS_DIR} via /recordings/ endpoint")
logger.info(f"Quran pages dir: {QURAN_PAGES_DIR}")

# --- Pydantic Models ---
class UserCreate(BaseModel):
    username: str
    password: str
    mushaf_type: str = "madani"
    difficulty_level: int = 1

class Token(BaseModel):
    access_token: str
    token_type: str

class ProgressItem(BaseModel):
    page: int
    status: Union[str, int]

class SyncRequest(BaseModel):
    progress: List[ProgressItem]

class UserSettings(BaseModel):
    mushaf_type: Optional[str] = None
    difficulty_level: Optional[int] = None

class GoalCreate(BaseModel):
    title: str
    target_date: Optional[datetime] = None
    description: Optional[str] = None

class GoalUpdate(BaseModel):
    completed: bool

class GDriveSyncRequest(BaseModel):
    action: str # "upload" or "download"

# --- Helper Functions (Moved up to avoid NameError) ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# --- Google Drive Service (Placeholder) ---
# Note: Integration requires google-api-python-client & oauthlib
# For now, we will add the endpoints to be ready for the library integration.

# --- Google Drive Service Implementation ---
SCOPES = ['https://www.googleapis.com/auth/drive.file']

class GDriveService:
    def __init__(self):
        self.creds = None
        self.service = None
        self.token_path = os.path.join(BASE_DIR, 'token.json')
        self.creds_path = os.path.join(BASE_DIR, 'credentials.json')

    def authenticate(self):
        if not GDRIVE_AVAILABLE:
            return False, "Bibliothèques Google Drive manquantes sur le serveur."
            
        if os.path.exists(self.token_path):
            self.creds = Credentials.from_authorized_user_file(self.token_path, SCOPES)
            
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                try:
                    self.creds.refresh(Request())
                except Exception:
                    os.remove(self.token_path)
                    return self.authenticate()
            else:
                if not os.path.exists(self.creds_path):
                    return False, "Fichier 'credentials.json' introuvable. Veuillez le placer à la racine de l'application."
                
                flow = InstalledAppFlow.from_client_secrets_file(self.creds_path, SCOPES)
                # Utiliser un port fixe pour faciliter la redirection si besoin
                self.creds = flow.run_local_server(port=0, success_message="Authentification réussie ! Vous pouvez fermer cette fenêtre.")
                
            with open(self.token_path, 'w') as token:
                token.write(self.creds.to_json())
        
        self.service = build('drive', 'v3', credentials=self.creds)
        return True, "Authentifié"

    def find_file(self, filename):
        results = self.service.files().list(
            q=f"name='{filename}' and trashed=false",
            spaces='drive',
            fields='files(id, name)'
        ).execute()
        files = results.get('files', [])
        return files[0]['id'] if files else None

    def upload_db(self, db_path):
        success, msg = self.authenticate()
        if not success: return success, msg
        
        file_id = self.find_file('quran_app.db')
        media = MediaFileUpload(db_path, mimetype='application/x-sqlite3', resumable=True)
        
        try:
            if file_id:
                self.service.files().update(fileId=file_id, media_body=media).execute()
                return True, "Base de données mise à jour sur Google Drive."
            else:
                file_metadata = {'name': 'quran_app.db'}
                self.service.files().create(body=file_metadata, media_body=media, fields='id').execute()
                return True, "Base de données sauvegardée sur Google Drive."
        except Exception as e:
            return False, f"Erreur d'upload : {str(e)}"

    def download_db(self, target_path):
        success, msg = self.authenticate()
        if not success: return success, msg
        
        file_id = self.find_file('quran_app.db')
        if not file_id:
            return False, "Aucune sauvegarde 'quran_app.db' trouvée sur Google Drive."
            
        try:
            # Backup current DB
            if os.path.exists(target_path):
                shutil.copy2(target_path, target_path + ".bak")
                
            request = self.service.files().get_media(fileId=file_id)
            fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            while done is False:
                status, done = downloader.next_chunk()
            
            with open(target_path, 'wb') as f:
                f.write(fh.getbuffer())
                
            return True, "Base de données synchronisée depuis Google Drive. Redémarrez l'app pour voir les changements."
        except Exception as e:
            return False, f"Erreur de téléchargement : {str(e)}"

gdrive_service = GDriveService()

@app.post("/gdrive/sync")
async def gdrive_sync(request: GDriveSyncRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_path = os.path.join(BASE_DIR, "quran_app.db")
    
    if request.action == "upload":
        success, message = gdrive_service.upload_db(db_path)
    elif request.action == "download":
        success, message = gdrive_service.download_db(db_path)
    else:
        return {"status": "error", "message": "Action inconnue"}
        
    return {"status": "success" if success else "error", "message": message}

# --- Goals Endpoints ---
@app.get("/goals")
async def get_goals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Simulating goals for now - could be added to database.py later
    # For now, we use a simple list or just return empty
    return {"goals": []}

@app.post("/goals")
async def create_goal(goal: GoalCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"status": "success", "goal": goal}

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Fix MIME Types for Windows
import mimetypes
mimetypes.init()
mimetypes.add_type("audio/webm", ".webm")

# Whisper & Ollama Setup
print("Loading Whisper model...")
try:
    model = whisper.load_model("base")
    print("Whisper model loaded.")
except Exception as e:
    print(f"Error loading Whisper: {e}")
    model = None

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
RUNNING_IN_DOCKER = os.getenv("RUNNING_IN_DOCKER", "false").lower() == "true"

def ensure_ffmpeg_ready():
    if RUNNING_IN_DOCKER:
        return
    ffmpeg_cmd = shutil.which("ffmpeg")
    if not ffmpeg_cmd:
        print("FFmpeg n'est pas installé. Installation automatique via Winget...")
        try:
            # On utilise winget pour installer FFmpeg silencieusement
            subprocess.run(["winget", "install", "Gyan.FFmpeg", "--accept-source-agreements", "--accept-package-agreements", "--silent"], check=True)
            print("FFmpeg installé avec succès.")
        except Exception as e:
            print(f"Erreur lors de l'installation de FFmpeg : {e}")

def ensure_ollama_ready():
    if RUNNING_IN_DOCKER:
        print("Exécution dans Docker : l'installation automatique d'Ollama est désactivée.")
        return

    # 1. Vérifier si le serveur répond déjà
    try:
        requests.get("http://localhost:11434", timeout=2)
        print("Serveur Ollama détecté.")
        ensure_model_pulled(OLLAMA_MODEL)
        return
    except:
        pass

    print("Serveur Ollama non détecté. Vérification de l'installation...")
    
    # 2. Vérifier si la commande existe
    ollama_cmd = shutil.which("ollama")
    if not ollama_cmd:
        print("Ollama n'est pas installé. Téléchargement de l'installeur (Windows)...")
        setup_url = "https://ollama.com/download/OllamaSetup.exe"
        setup_path = os.path.join(tempfile.gettempdir(), "OllamaSetup.exe")
        
        try:
            response = requests.get(setup_url, stream=True)
            with open(setup_path, 'wb') as f:
                shutil.copyfileobj(response.raw, f)
            
            print("Installation d'Ollama en cours (mode silencieux)...")
            # /VERYSILENT installe Ollama pour l'utilisateur actuel sans demander d'admin en général
            subprocess.run([setup_path, "/VERYSILENT"], check=True)
            print("Ollama installé avec succès.")
            time.sleep(5) 
        except Exception as e:
            print(f"Erreur lors de l'installation automatique : {e}")
            return

    # 3. Démarrer le serveur
    print("Démarrage du serveur Ollama...")
    try:
        # Lancer 'ollama serve' en arrière-plan
        subprocess.Popen(["ollama", "serve"], creationflags=subprocess.CREATE_NEW_CONSOLE if os.name == 'nt' else 0)
    except Exception as e:
        print(f"Impossible de lancer le serveur Ollama : {e}")

    # 4. Attendre que le serveur réponde
    for i in range(30):
        try:
            requests.get("http://localhost:11434", timeout=2)
            print("Le serveur Ollama a démarré avec succès.")
            ensure_model_pulled(OLLAMA_MODEL)
            return
        except:
            if i % 5 == 0:
                print(f"Attente du serveur Ollama ({i}s)...")
            time.sleep(2)
    print("Erreur : Le serveur Ollama ne répond pas après 60 secondes.")

def ensure_model_pulled(model_name):
    print(f"Vérification de la présence du modèle {model_name}...")
    try:
        res = subprocess.run(["ollama", "list"], capture_output=True, text=True, check=True)
        if model_name not in res.stdout:
            print(f"Téléchargement du modèle {model_name} (peut prendre quelques minutes)...")
            # subprocess.run bloquera jusqu'à la fin du téléchargement
            subprocess.run(["ollama", "pull", model_name], check=True)
            print(f"Modèle {model_name} prêt.")
        else:
            print(f"Modèle {model_name} déjà disponible.")
    except Exception as e:
        print(f"Erreur lors de la vérification/téléchargement du modèle : {e}")

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    from fastapi.responses import Response
    return Response(status_code=204)

@app.get("/quran_pages/{page_request}")
@app.get("/api/v1/quran_pages/{page_request}")
async def get_quran_page(page_request: str):
    # The frontend requests /api/v1/quran_pages/{page}.jpg
    # Files on disk: Quran_Page_003.jpg = Page 1, so page N -> Quran_Page_{N+2}.jpg
    try:
        clean_name = page_request.split('.')[0]
        page_num = int(clean_name)
        
        # Mapping: page 1 -> file 003, page 2 -> 004, etc.
        target_num = page_num + 2
        filename = f"Quran_Page_{str(target_num).zfill(3)}.jpg"
        
        file_path = os.path.join(QURAN_PAGES_DIR, filename)
        logger.info(f"Looking for quran page: {file_path} (exists: {os.path.exists(file_path)})")
        if os.path.exists(file_path):
            return FileResponse(file_path, media_type="image/jpeg")
            
    except Exception as e:
        logger.error(f"Error serving local page {page_request}: {e}")
        
    raise HTTPException(status_code=404, detail=f"Page image not found: {page_request}")

# --- Auth Endpoints ---

@app.post("/api/v1/auth/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = User(
        username=user.username, 
        hashed_password=hashed_password, 
        mushaf_type=user.mushaf_type,
        difficulty_level=user.difficulty_level
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(data={"sub": new_user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/v1/auth/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/v1/users/me")
async def read_users_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Logique de Streak
    now = datetime.now(timezone.utc).replace(tzinfo=None) # Simplification pour SQLite
    today = now.date()
    
    if current_user.last_active_date:
        last_active = current_user.last_active_date.date()
        diff = (today - last_active).days
        
        if diff == 1:
            current_user.daily_streak += 1
            current_user.last_active_date = now
        elif diff > 1:
            current_user.daily_streak = 1
            current_user.last_active_date = now
        # Si diff == 0, on ne change rien au streak aujourd'hui
    else:
        current_user.daily_streak = 1
        current_user.last_active_date = now
    
    db.commit()

    return {
        "username": current_user.username, 
        "id": current_user.id,
        "mushaf_type": current_user.mushaf_type or "madani",
        "difficulty_level": current_user.difficulty_level or 1,
        "daily_streak": current_user.daily_streak,
        "last_active_date": current_user.last_active_date
    }

class SettingsUpdate(BaseModel):
    mushaf_type: str
    difficulty_level: int

@app.put("/api/v1/users/me/settings")
async def update_settings(settings: SettingsUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.mushaf_type = settings.mushaf_type
    current_user.difficulty_level = settings.difficulty_level
    db.commit()
    return {
        "status": "updated", 
        "mushaf_type": current_user.mushaf_type,
        "difficulty_level": current_user.difficulty_level
    }

@app.delete("/api/v1/users/me")
async def delete_user(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Supprimer d'abord la progression associée
    db.query(Progress).filter(Progress.user_id == current_user.id).delete()
    # Supprimer l'utilisateur
    db.delete(current_user)
    db.commit()
    return {"status": "user deleted"}

@app.get("/api/v1/users/all")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": u.id, "username": u.username} for u in users]

@app.delete("/admin/users/{user_id}")
def admin_delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    # Supprimer la progression
    db.query(Progress).filter(Progress.user_id == user_id).delete()
    # Supprimer l'utilisateur
    db.delete(user)
    db.commit()
    return {"status": "utilisateurs supprimé"}


# --- Sync Endpoints ---

@app.get("/api/v1/users/me/progress")
def get_user_progress(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    progress_items = db.query(Progress).filter(Progress.user_id == current_user.id).all()
    # return {str(item.page_number): item.status for item in progress_items}
    # Wait, the frontend might expect integer keys or string keys. page.tsx uses parseInt(page).
    # { "1": "mastered" } is fine.
    return {str(item.page_number): item.status for item in progress_items}

@app.post("/api/v1/users/me/progress")
def update_user_progress(item: ProgressItem, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(Progress).filter(
        Progress.user_id == current_user.id,
        Progress.page_number == item.page
    ).first()
    
    if existing:
        existing.status = str(item.status)
        existing.last_updated = datetime.now(timezone.utc)
    else:
        new_prog = Progress(
            user_id=current_user.id,
            page_number=item.page,
            status=str(item.status)
        )
        db.add(new_prog)
    
    db.commit()
    return {"status": "updated", "page": item.page, "new_status": item.status}

@app.get("/sync_progress")
def get_sync_progress(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    progress_items = db.query(Progress).filter(Progress.user_id == current_user.id).all()
    return {
        "progress": [
            {"page": item.page_number, "status": item.status} for item in progress_items
        ]
    }

@app.post("/sync_progress")
def sync_progress(data: SyncRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Simple strategy: Overwrite or Merge. Let's Merge/Update.
    for item in data.progress:
        existing = db.query(Progress).filter(
            Progress.user_id == current_user.id,
            Progress.page_number == item.page
        ).first()
        
        if existing:
            existing.status = str(item.status)
            existing.last_updated = datetime.now(timezone.utc)
        else:
            new_prog = Progress(
                user_id=current_user.id,
                page_number=item.page,
                status=str(item.status)
            )
            db.add(new_prog)
    
    db.commit()
    return {"status": "synced"}

@app.get("/api/v1/recitation/history/{page}")
def get_recording_history(page: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        recordings = db.query(Recording).filter(
            Recording.user_id == current_user.id,
            Recording.page_number == page
        ).order_by(Recording.timestamp.desc()).limit(10).all()
        
        history = []
        for r in recordings:
            # Reconstruire l'URL manuellement car r.file_path peut contenir un chemin relatif ou absolu
            filename = os.path.basename(r.file_path)
            # URL relative pour pointer vers le point de montage /recordings/
            url = f"/recordings/{filename}"
            
            # Parsing sécurisé des détails
            details = []
            if r.details:
                try:
                    details = json.loads(r.details)
                except Exception:
                    logger.warning(f"Malformed details for recording {r.id}")
                    details = []
            
            history.append({
                "id": r.id,
                "url": url,
                "timestamp": r.timestamp.isoformat() if r.timestamp else datetime.now().isoformat(),
                "score": r.score,
                "feedback": r.feedback,
                "details": details
            })
            
        return history
    except Exception as e:
        logger.exception("History Error")
        return JSONResponse(status_code=500, content={"error": str(e)})

# --- Existing Logic ---

def get_quran_page_text(page_number):
    try:
        url = f"http://api.alquran.cloud/v1/page/{page_number}/quran-uthmani"
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            ayahs = data['data']['ayahs']
            return " ".join([ayah['text'] for ayah in ayahs])
        return None
    except Exception as e:
        print(f"Error fetching Quran text: {e}")
        return None

@app.post("/api/v1/recitation/validate")
async def validate_recitation(
    page: int = Form(...), 
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    print(f"Received request for Page {page}")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"page_{page}_{timestamp}.webm"
    file_path = os.path.join(RECORDINGS_DIR, filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        logger.info(f"File saved: {file_path}")
        
        # 2. Transcription Whisper
        if model is None:
            return {"valid": False, "feedback": "Le modèle Whisper n'est pas chargé.", "score": 0, "details": []}
            
        result = model.transcribe(str(file_path), language="ar")
        transcribed_text = result["text"].strip()
        logger.info(f"Whisper Transcription: {transcribed_text}")

        # Sécurité : vérifier si la transcription est vide ou trop courte
        if len(transcribed_text) < 5:
            return {
                "valid": False, 
                "feedback": "Je n'ai pas pu entendre votre récitation. Assurez-vous que votre micro fonctionne et parlez bien en face.", 
                "audio_url": f"/recordings/{filename}",
                "details": []
            }

        expected_text = get_quran_page_text(page)
        if not expected_text:
            return {"valid": True, "feedback": "Texte Coranique introuvable, validation simulée.", "audio_url": f"/recordings/{filename}", "details": []}

        # Nettoyage et Normalisation Arabe pour comparaison Quran Uthmani vs Whisper
        def normalize_arabic(text):
            import re
            # 1. Supprimer les diacritiques (Tashkeel complet)
            text = re.sub(r'[\u064B-\u065F\u0670]', '', text)
            # 2. Alif Wasla (ٱ) -> Alif simple (ا)
            text = text.replace('\u0671', '\u0627')
            # 3. Normaliser tous les types d'Alif (أ إ آ ٱ -> ا)
            text = re.sub(r'[أإآٱ]', 'ا', text)
            # 4. Taa Marbuta (ة) -> Ha (ه) (Whisper confond souvent)
            text = text.replace('ة', 'ه')
            # 5. Alif Maqsura (ى) -> Ya (ي)  
            text = text.replace('ى', 'ي')
            # 6. Supprimer le Tatweel/Kashida (ـ)
            text = re.sub(r'ـ', '', text)
            # 7. Supprimer les petites lettres Uthmani (Small Alif, Small Waw, Small Ya, etc.)
            text = re.sub(r'[\u06D6-\u06ED]', '', text)  # Quranic annotation chars
            text = re.sub(r'[\u0615-\u061A]', '', text)  # Small high signs
            text = re.sub(r'[\u06E5\u06E6]', '', text)  # Small Waw, Small Ya
            # 8. Supprimer les marques de sajda, rub el hizb, etc.
            text = re.sub(r'[\u06D4\u06DD\u06DE\u06DF\u06E0\u06E9]', '', text)
            # 9. Supprimer la Hamza seule (ء) et les Hamza sur support
            text = text.replace('ء', '')
            # 10. Supprimer les symboles de versets ﴿﴾ et numéros de versets
            text = re.sub(r'[\uFD3E\uFD3F]', '', text)
            text = re.sub(r'[\u0660-\u0669]+', '', text)  # chiffres arabes
            text = re.sub(r'\d+', '', text)  # chiffres latins
            # 11. Supprimer la ponctuation et caractères spéciaux
            text = re.sub(r'[^\u0620-\u064A\s]', '', text)
            # 12. Normaliser les espaces multiples
            text = re.sub(r'\s+', ' ', text)
            return text.strip()
            
        clean_expected = normalize_arabic(expected_text)
        clean_student = normalize_arabic(transcribed_text)
        
        logger.info(f"Expected (Norm): {clean_expected[:80]}...")
        logger.info(f"Student (Norm): {clean_student[:80]}...")

        # Custom instructions based on difficulty level
        difficulty = current_user.difficulty_level or 1
        level_instructions = ""
        if difficulty == 1:
            level_instructions = "Niveau débutant : sois très indulgent. Seuls les passages clairement manquants comptent."
        elif difficulty == 2:
            level_instructions = "Niveau moyen : un peu plus de rigueur, mais reste bienveillant."
        else:
            level_instructions = "Niveau expert : rigueur sur les passages manquants."

        # ============================================================
        # MATCHING FLOU mot par mot — amélioré pour :
        #  - Mots répétés (ex : "الناس" 3x dans An-Nas)
        #  - Récitation en continu sans pause entre versets
        #  - Fenêtre de recherche large pour décalages Whisper
        # ============================================================
        import difflib
        
        expected_words = clean_expected.split()
        student_words = clean_student.split()
        n_student = len(student_words)
        
        # Seuil de similarité pour valider un match
        FUZZY_THRESHOLD = 0.40  # Réajusté (0.40) : compromis entre rigueur et tolérance aux erreurs Whisper
        
        def word_similarity(a, b):
            """Similarité entre deux mots arabes normalisés.
            Combine ratio de séquence + heuristique trigrammes."""
            if a == b:
                return 1.0
            if not a or not b:
                return 0.0
            # Bonus si l'un contient l'autre (ex: "وسوس" dans "يوسوس")
            if a in b or b in a:
                return 0.80
            # Heuristique trigrammes
            min_len = min(len(a), len(b))
            if min_len >= 3:
                trigrams_a = {a[i:i+3] for i in range(len(a)-2)}
                trigrams_b = {b[i:i+3] for i in range(len(b)-2)}
                shared = trigrams_a & trigrams_b
                if shared:
                    trigram_score = len(shared) / max(len(trigrams_a), len(trigrams_b), 1)
                    return max(difflib.SequenceMatcher(None, a, b).ratio(), trigram_score * 0.8)
            return difflib.SequenceMatcher(None, a, b).ratio()
        
        def find_best_match_in_window(expected_w, student_list, cursor, window_forward=40, window_back=5):
            """
            Cherche le meilleur match dans une fenêtre, autorisant un léger recul
            pour les bégaiements ou erreurs de segmentation Whisper.
            """
            best_score = 0.0
            best_idx = -1
            # Ajustement : mots courts (particules) restent un peu plus strictes
            min_score = FUZZY_THRESHOLD if len(expected_w) > 2 else 0.50
            
            search_start = max(0, cursor - window_back)
            search_end = min(n_student, cursor + window_forward)
            
            for i in range(search_start, search_end):
                s = word_similarity(expected_w, student_list[i])
                if s > best_score:
                    best_score = s
                    best_idx = i
            
            if best_score >= min_score:
                return best_idx, best_score
            return -1, best_score
        
        # Alignement flou séquentiel avec curseur souple
        matched_count = 0
        student_cursor = 0
        word_matches = []  # (expected_word, matched, score)
        
        for i, exp_word in enumerate(expected_words):
            # Fenêtre large (40) pour les décalages, recul court (5)
            idx, score = find_best_match_in_window(exp_word, student_words, student_cursor, window_forward=40, window_back=5)
            
            if idx >= 0:
                matched_count += 1
                word_matches.append((exp_word, True, score))
                # On avance le curseur, mais on reste souple sur la position exacte
                student_cursor = max(student_cursor, idx + 1)
            else:
                word_matches.append((exp_word, False, score))
        
        # Score basé sur la couverture + pénalité de longueur proportionnelle
        # Si moins de 70% des mots sont prononcés, on pénalise le score final
        length_penalty = 1.0
        if n_student < len(expected_words) * 0.8:
             length_penalty = n_student / (len(expected_words) * 0.8)
             
        similarity_ratio = (matched_count / len(expected_words)) * length_penalty if expected_words else 0
        logger.info(f"Fuzzy Word Coverage: {matched_count}/{len(expected_words)} = {similarity_ratio:.2f}")
        
        # Identifier les PASSAGES manquants (blocs de 3+ mots consécutifs non matchés)
        # Seuil de 3 mots pour éviter les faux positifs sur mots isolés
        missing_passages = []
        current_passage = []
        for exp_word, matched, score in word_matches:
            if not matched:
                current_passage.append(exp_word)
            else:
                if len(current_passage) >= 3:  # 3+ mots consécutifs = vrai passage manquant
                    missing_passages.append(" ".join(current_passage))
                current_passage = []
        if len(current_passage) >= 3:
            missing_passages.append(" ".join(current_passage))
        
        logger.info(f"Missing passages ({len(missing_passages)}): {missing_passages}")

        is_valid = False
        feedback_text = ""
        details_list = []
        
        # Seuils de décision réajustés pour plus de souplesse (Whisper est difficile sur l'Arabe)
        THRESHOLD_EXCELLENT = 0.75  # 75%+ des mots couverts = Excellent
        THRESHOLD_VALID = 0.45      # 45%+ = Validé avec coaching IA
        
        if similarity_ratio >= THRESHOLD_EXCELLENT and len(missing_passages) == 0:
            is_valid = True
            feedback_text = "MachaAllah ! Récitation excellente et fidèle au texte. Continuez ainsi !"
            logger.info("Fast Track: EXCELLENT")
        elif similarity_ratio >= THRESHOLD_EXCELLENT:
            is_valid = True
            feedback_text = f"Bonne récitation ! {matched_count} mots sur {len(expected_words)} ont été reconnus. Quelques petits passages à revoir."
            # Créer les détails des passages manquants
            for passage in missing_passages[:3]:
                details_list.append({
                    "type": "passage_manquant",
                    "word": passage,
                    "context": "Ce passage n'a pas été détecté dans votre récitation."
                })
            logger.info("Fast Track: VALID with minor gaps")
        
        # Cas intermédiaire : appel IA pour coaching bienveillant
        elif similarity_ratio >= THRESHOLD_VALID:
            is_valid = True
            logger.info("Appel IA pour coaching bienveillant...")
            
            # On envoie à l'IA un RÉSUMÉ pré-analysé, pas les textes bruts
            passages_summary = "\n".join([f"  - « {p} »" for p in missing_passages[:5]]) if missing_passages else "  Aucun passage clairement manquant."
            
            prompt = f"""Tu es un professeur de Coran bienveillant et encourageant.

Un élève vient de réciter une page du Coran. Notre système de reconnaissance vocale (Whisper) a détecté {matched_count} mots sur {len(expected_words)} attendus, soit {int(similarity_ratio*100)}% de couverture.

{level_instructions}

PASSAGES QUI SEMBLENT MANQUANTS (selon notre analyse) :
{passages_summary}

IMPORTANT :
- La reconnaissance vocale fait de grosses erreurs sur l'Arabe ! Un mot "non détecté" ne signifie PAS forcément que l'élève l'a mal prononcé.
- Si la couverture est supérieure à 45%, c'est un excellent signe de mémorisation globale.
- Sois TRÈS ENCOURAGEANT et BIENVEILLANT. L'élève fait un effort pour apprendre le Coran.
- Donne un conseil PRATIQUE et MOTIVANT pour la prochaine récitation.
- Si la couverture est correcte (>45%), félicite l'élève chaleureusement.
- Ne liste PAS les erreurs de transcription du logiciel comme des erreurs de l'élève.

Réponse STRICTEMENT en JSON :
{{
    "feedback": "Message encourageant et conseil pratique en 2-3 phrases maximum.",
    "errors": [
        {{ "type": "conseil", "word": "passage ou concept", "context": "suggestion pratique" }}
    ]
}}"""
            
            ollama_payload = { "model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "format": "json" }
            try:
                ai_resp = requests.post(OLLAMA_URL, json=ollama_payload, timeout=120)
                if ai_resp.status_code == 200:
                    try:
                        ai_json = json.loads(ai_resp.json().get("response", "{}"))
                        feedback_text = ai_json.get("feedback", "Bonne récitation, continuez vos efforts !")
                        details_list = ai_json.get("errors", [])
                    except:
                        feedback_text = f"Bonne récitation ! {matched_count} mots sur {len(expected_words)} reconnus. Continuez à vous entraîner."
                else:
                    logger.error(f"Ollama error {ai_resp.status_code}")
                    feedback_text = f"Récitation enregistrée. {matched_count} mots sur {len(expected_words)} détectés par le système."
            except requests.exceptions.Timeout:
                logger.error("IA Timeout")
                feedback_text = f"Récitation enregistrée. {matched_count} mots sur {len(expected_words)} détectés. L'analyse détaillée n'a pas pu aboutir."
            except Exception as e:
                logger.error(f"IA Error: {e}")
                feedback_text = f"Récitation enregistrée. {matched_count} mots sur {len(expected_words)} détectés."
        
        # Cas score bas (< 60%) : encouragement + conseils
        else:
            is_valid = False
            logger.info("Score bas, coaching encourageant...")
            
            passages_summary = "\n".join([f"  - « {p} »" for p in missing_passages[:5]]) if missing_passages else "  Aucun passage clairement identifié."
            
            prompt = f"""Tu es un professeur de Coran bienveillant et patient.

Un élève débutant vient de réciter une page du Coran. Le système de reconnaissance vocale n'a détecté que {matched_count} mots sur {len(expected_words)}, soit {int(similarity_ratio*100)}%.

IMPORTANT : Ce score bas peut être dû à :
1. Le système de reconnaissance vocale qui ne comprend pas bien l'arabe coranique
2. L'élève qui est encore en phase d'apprentissage
3. Un problème de micro ou d'environnement sonore

Sois TRÈS ENCOURAGEANT. L'élève fait l'effort d'apprendre le Coran, c'est admirable.
Donne-lui 1-2 conseils pratiques pour s'améliorer.
NE LISTE PAS d'erreurs individuelles. Encourage simplement.

Réponse STRICTEMENT en JSON :
{{
    "feedback": "Message très encourageant en 2-3 phrases. Félicite l'effort et donne un conseil pratique.",
    "errors": []
}}"""
            
            ollama_payload = { "model": OLLAMA_MODEL, "prompt": prompt, "stream": False, "format": "json" }
            try:
                ai_resp = requests.post(OLLAMA_URL, json=ollama_payload, timeout=120)
                if ai_resp.status_code == 200:
                    try:
                        ai_json = json.loads(ai_resp.json().get("response", "{}"))
                        feedback_text = ai_json.get("feedback", "Bon effort ! Continuez à vous entraîner, la persévérance est la clé.")
                    except:
                        feedback_text = "Bel effort ! Continuez à réciter régulièrement, chaque tentative vous rapproche de la maîtrise."
                else:
                    feedback_text = "Bel effort ! Le système n'a pas pu analyser en détail, mais continuez à vous entraîner."
            except:
                feedback_text = "Bel effort ! Continuez à réciter régulièrement pour vous améliorer."

        # Sauvegarde en Base de Données (CRUCIAL pour l'historique)
        try:
            # Correction des chemins pour la DB (slash vs backslash)
            # IMPORTANT: Toujours stocker avec des slashes pour compatibilité URL
            db_file_path = f"recordings/{filename}"
            
            new_recording = Recording(
                user_id=current_user.id,
                page_number=page,
                file_path=db_file_path,
                score=int(similarity_ratio * 100),
                feedback=feedback_text,
                details=json.dumps(details_list) if 'details_list' in locals() else None
            )
            db.add(new_recording)
            
            # Mise à jour progression si validé
            if is_valid:
                prog = db.query(Progress).filter(Progress.user_id==current_user.id, Progress.page_number==page).first()
                if not prog:
                    prog = Progress(user_id=current_user.id, page_number=page, status="mastered")
                    db.add(prog)
                else:
                    prog.status = "mastered"
                    prog.last_updated = datetime.now()
            
            db.commit()
            logger.info("Recording saved to DB.")
        except Exception as e:
            logger.exception("DB Save Error")
            db.rollback()

        return {
            "valid": is_valid,
            "feedback": feedback_text,
            "details": details_list if 'details_list' in locals() else [],
            "audio_url": f"/recordings/{filename}",
            "debug": {
                "whisper_raw": transcribed_text,
                "fuzzy_coverage": f"{matched_count}/{len(expected_words)}",
                "score_pct": int(similarity_ratio * 100)
            }
        }
             
        # Fallback
        return {"valid": False, "feedback": "Erreur inconnue", "details": [], "audio_url": f"/recordings/{filename}"}

    except Exception as e:
        logger.exception("CRITICAL ERROR in validate_recitation")
        return JSONResponse(status_code=500, content={"error": str(e), "detail": "Check server.log"})

# --- Frontend Serving ---
from fastapi.responses import FileResponse
import sys

def get_resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    # PyInstaller creates a temp folder and stores path in _MEIPASS
    base_path = getattr(sys, '_MEIPASS', BASE_DIR)
    return os.path.join(base_path, relative_path)

@app.get("/")
async def read_index():
    path = get_resource_path("index.html")
    if not os.path.exists(path):
        # Fallback to dev mode if run locally without packaging
        dev_path = os.path.join(os.getcwd(), "frontend", "out", "index.html")
        if os.path.exists(dev_path):
            return FileResponse(dev_path)
        return FileResponse(get_resource_path("dashboard_v3.html")) # Fallback
    response = FileResponse(path)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response

# Mount Next.js static assets
# In dev (python backend_server.py), assets are in frontend/out/_next
# In packaged exe, assets will be at root/_next
def get_static_dir(folder):
    base_path = getattr(sys, '_MEIPASS', BASE_DIR)
    path_in_meipass = os.path.join(base_path, folder)
    if os.path.exists(path_in_meipass):
        return path_in_meipass
    # Fallback dev path
    path_dev = os.path.join(BASE_DIR, "frontend", "out", folder)
    if os.path.exists(path_dev):
        return path_dev
    return None

static_next = get_static_dir("_next")
if static_next:
    app.mount("/_next", StaticFiles(directory=static_next), name="next")


# --- Browser Launch & Startup ---
import webbrowser
import threading
import time

def open_browser():
    """Wait for the server to be ready, then open the browser."""
    import requests as _req
    max_wait = 30  # secondes max d'attente
    for i in range(max_wait * 2):  # check every 0.5s
        try:
            r = _req.get("http://localhost:8001/favicon.ico", timeout=1)
            if r.status_code in (200, 204):
                break
        except Exception:
            pass
        time.sleep(0.5)
    # Cache-busting: add a unique version parameter
    version = int(time.time())
    webbrowser.open(f"http://localhost:8001/?v={version}")
    print(f"Browser opened: http://localhost:8001/?v={version}")


# --- Auto-Shutdown (Heartbeat) ---
first_heartbeat_received = False
last_heartbeat = time.time()

@app.post("/api/v1/system/heartbeat")
@app.post("/heartbeat")
async def heartbeat_endpoint():
    global last_heartbeat, first_heartbeat_received
    first_heartbeat_received = True
    last_heartbeat = time.time()
    return {"status": "ok"}

async def check_heartbeat():
    while True:
        await asyncio.sleep(2)
        # Timeout dynamique : 300s au premier lancement (le temps que le navigateur s'ouvre et charge), 30s ensuite pour laisser une marge
        timeout = 30 if first_heartbeat_received else 300
        if time.time() - last_heartbeat > timeout:
            print("Aucun signal détecté (heartbeat). Arrêt automatique du serveur...")
            # On utilise _exit pour fermer brutalement le processus uvicorn
            import os as os_native
            
            # Kill the process tree just in case
            import subprocess
            try:
                subprocess.run(['taskkill', '/F', '/T', '/PID', str(os_native.getpid())], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except:
                pass
            os_native._exit(0)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(check_heartbeat())
    # Exécuter l'auto-installation dans un thread séparé pour ne pas bloquer le démarrage du serveur web
    threading.Thread(target=ensure_ffmpeg_ready, daemon=True).start()
    threading.Thread(target=ensure_ollama_ready, daemon=True).start()
    # Lancer le navigateur automatiquement (fonctionne en mode dev ET en mode exe)
    if not RUNNING_IN_DOCKER:
        threading.Thread(target=open_browser, daemon=True).start()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
