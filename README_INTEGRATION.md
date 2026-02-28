# Guide d'Intégration et de Démarrage

Votre projet "The Coran Building" est maintenant configuré avec une architecture moderne hybride.

## 🚀 Démarrage Rapide (Automatisé)

Un script a été créé pour installer toutes les dépendances et lancer les serveurs en une seule fois.

1.  Allez à la racine du dossier (`e:\Keg-Trading\Stitch - The Coran Building`).
2.  Double-cliquez sur le fichier **`START_APP.bat`**.

Ce script va :
*   Ouvrir une console pour le Backend (API + Ancien Dashboard).
*   Ouvrir une console pour le Frontend (Nouveau Module IA).
*   Installer automatiquement les bibliothèques requises (pip et npm) au premier lancement.
*   Ouvrir votre navigateur sur la nouvelle interface (`http://localhost:3000`).

---

## Démarrage Manuel (Si besoin)

### 1. Lancer le Backend (Serveur API + Dashboard)
Ouvrez un terminal à la racine :

```powershell
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --host 0.0.0.0 --port 8001 --reload
```
(Adresse : `http://localhost:8001/`)

### 2. Lancer le Frontend (Nouveau Module IA)
Ouvrez un **deuxième terminal** à la racine :

```powershell
cd frontend
npm install
npm run dev
```
(Adresse : `http://localhost:3000/`)

## Architecture
- **Backend (API)** : FastAPI (`backend/`). Gère l'IA, la base de données et sert l'ancien dashboard.
- **Frontend (Module IA)** : Next.js (`frontend/`). Gère l'enregistrement.
- **Ancien Dashboard** : Toujours disponible sur le port 8001.
