import requests
import re
import logging

logger = logging.getLogger(__name__)

def get_quran_page_text(page_number):
    try:
        url = f"http://api.alquran.cloud/v1/page/{page_number}/quran-uthmani"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            ayahs = data['data']['ayahs']
            return " ".join([ayah['text'] for ayah in ayahs])
        return None
    except Exception as e:
        logger.error(f"Error fetching Quran text: {e}")
        return None

def normalize_arabic(text):
    # Supprimer les diacritiques (Tashkeel)
    text = re.sub(r'[\u064B-\u065F\u0670]', '', text)
    # Normaliser les Alifs (أ, إ, آ -> ا)
    text = re.sub(r'[أإآ]', 'ا', text)
    # Normaliser les Ya (ى -> ي)
    text = re.sub(r'ى', 'ي', text)
    # Normaliser les Waw (ؤ -> و)
    text = re.sub(r'ؤ', 'و', text)
    # Supprimer le Tatweel (ـ)
    text = re.sub(r'ـ', '', text)
    # Supprimer la ponctuation, les chiffres et caractères non-alphanumériques (sauf espaces)
    text = re.sub(r'[^\w\s]', '', text)
    text = re.sub(r'\d+', '', text)
    return text.strip()
