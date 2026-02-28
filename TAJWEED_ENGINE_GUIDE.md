# Guide Technique : Extension du Moteur Tajweed (V3 PRO)

En tant qu'Architecte Senior, ce guide vous explique comment passer d'une validation de "texte" à une validation de "qualité de prononciation" au sein de la nouvelle architecture PRO.

## 1. Architecture du Pipeline
Le flux de données suit cette séquence :
`Audio (Micro)` -> `FastAPI (/analyze)` -> `Whisper (Timestamps)` -> `TajweedEngine (Signal Analysis)` -> `Frontend (Surlignage)`

## 2. Comment ajouter une nouvelle règle (ex: Ghunnah)

### Étape A : Mise à jour du Service Backend
Ouvrez `backend/app/services/tajweed_engine.py` et ajoutez une méthode de détection acoustique.

```python
# Exemple pour la Ghunnah (nasalisation) sur le Noun ou Mim
def detect_ghunnah(audio_segment, sample_rate):
    # Logique : Analyse du ratio d'énergie dans les basses fréquences
    # La Ghunnah est une vibration nasale continue.
    return True # Retourne True si détecté
```

### Étape B : Intégration dans la boucle d'analyse
Dans `backend/app/api/v1/analysis.py`, appelez le moteur pour chaque mot :

```python
from backend.app.services.tajweed_engine import TajweedEngine

# Dans la boucle for i, word in enumerate(words_expected):
word_audio = extract_segment(full_audio, start_time, end_time)
rule_results = TajweedEngine.analyze_word_audio(word_audio, 16000, word)

analysis_words.append({
    "text": word,
    "tajweed_rules": rule_results, # <--- C'est ici que la magie opère
    # ... rest of field
})
```

## 3. Visualisation Frontend
Le composant `TajweedText.tsx` est déjà conçu pour mapper automatiquement toute règle ajoutée au JSON. 
Si vous ajoutez une règle `"Ikhfa"`, elle apparaîtra automatiquement dans le tooltip du mot correspondant sans modifier le code React.

## 4. Conseils pour l'Expert Tajweed (ML)
Pour des résultats optimaux :
1. **Normalisation** : Toujours normaliser l'audio (gain) avant l'analyse.
2. **Pitch Tracking** : Utilisez des bibliothèques comme `librosa` ou `parselmouth` pour suivre la courbe de fréquence (fondamental) des prolongations.
3. **Seuils Adaptatifs** : Calculez la vitesse de parole globale de l'utilisateur (mots/min) pour ajuster les durées de Madd (ne pas comparer un enfant qui récite lentement à un adulte rapide).

---
*Document conçu pour l'évolution de la plateforme The Coran Building Pro.*
