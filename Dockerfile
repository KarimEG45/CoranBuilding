# Utiliser une image Python légère
FROM python:3.10-slim

# Éviter la génération de fichiers .pyc et activer le mode non interactif
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV RUNNING_IN_DOCKER true

# Installer les dépendances système (ffmpeg pour Whisper)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail
WORKDIR /app

# Copier le fichier des dépendances
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier le reste du code
COPY . .

# Exposer le port sur lequel l'app tourne
EXPOSE 8001

# Commande pour lancer l'application
CMD ["python", "backend_server.py"]
