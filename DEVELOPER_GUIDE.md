# Guide Développeur - L'Immeuble du Coran (Quran Building)

Ce document explique l'architecture technique, les outils utilisés et les étapes pour faire fonctionner le projet en mode développement ou production.

## 🏗 Architecture Globale

Le projet est une application web moderne découpée en deux parties principales :

1.  **Backend (Python/FastAPI)** :
    *   Gestion de la base de données (SQLite/SQLAlchemy).
    *   Moteur d'analyse IA (Whisper pour la transcription).
    *   Moteur de Tajweed personnalisé (Logique de comparaison et niveaux de difficulté).
    *   API REST pour la mémorisation et l'historique.

2.  **Frontend (React/Next.js)** :
    *   Interface utilisateur immersive (Framework TailwindCSS/Lucide React).
    *   Gestion de l'enregistrement audio (Web MediaRecorder API).
    *   Visualisation dynamique (L'Immeuble du Coran).

---

## 🚀 Installation (Mode Développeur)

### 1. Prérequis
*   **Python 3.10+**
*   **Node.js 18+**
*   **FFmpeg** (Indispensable pour le traitement audio de Whisper).

### 2. Configuration du Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Ou .\venv\Scripts\activate sur Windows
pip install -r ../requirements.txt
```

**Fichier .env** :
Copiez le fichier `.env` à la racine. Il contient les ports et les chemins des dossiers (recordings, database).

### 3. Configuration du Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🛠 Moteur de Tajweed & IA

Le cœur de l'application se trouve dans `backend/app/services/` :
*   `transcription.py` : Utilise OpenAI Whisper pour transformer l'audio en texte arabe.
*   `tajweed_engine.py` : Compare le texte attendu (via API AlQuran) avec la transcription. 
    *   **Niveaux de difficulté** : Les seuils de tolérance (0.15 pour le niveau 1) sont définis ici.
    *   **Normalisation** : `quran.py` gère la suppression des accents et la standardisation des lettres arabes pour une comparaison équitable.

---

## 📦 Build & Release (Production)

Le projet est conçu pour être distribué sous forme d'un seul exécutable Windows (`.exe`) via **PyInstaller**.

**Processus de build** :
1.  **Frontend** : `npm run build` dans le dossier frontend pour générer les fichiers statiques dans `frontend/out`.
2.  **Compilation** : `python build_pro.py`.
    *   Ce script fusionne le frontend statique dans le backend.
    *   Il crée un dossier `QuranBuilding_Release_PRO` contenant l'exécutable et les dossiers nécessaires (`quran_pages/`, `recordings/`).

---

## 📂 Structure des fichiers clés
- `backend/app/api/v1/` : Toutes les routes API (auth, analysis, users...).
- `backend/app/models/` : Schémas de la base de données SQLite.
- `frontend/src/components/audio/` : `QuranRecorder.tsx` (Microphone) et `RecordingHistory.tsx` (Lecteur).
- `quran_pages/` : Images JPG des pages du Coran (indispensables).

---

## 📝 Bon à savoir
*   **Heartbeat** : L'application s'arrête seule si aucun onglet n'est ouvert (voir `system.py`).
*   **Database** : `quran_app.db` est une base SQLite locale.
*   **Audio** : Les enregistrements sont stockés temporairement dans le dossier `recordings/`.
