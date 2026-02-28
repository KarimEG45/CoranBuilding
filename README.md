<div align="center">

# 🕌 The Coran Building — مبنى القرآن

**Application de mémorisation coranique gamifiée avec analyse Tajweed par IA**
**تطبيق تحفيظ القرآن الكريم بنظام تشييد البناء وتحليل التجويد بالذكاء الاصطناعي**

![Version](https://img.shields.io/badge/version-1.0.0-green)
![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![License](https://img.shields.io/badge/license-MIT-lightgrey)
![Sadaqa Jariya](https://img.shields.io/badge/صدقة_جارية-إن_شاء_الله-brightgreen)

</div>

---

<div dir="rtl">

## بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ

> *«وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ»*
> سورة القمر — ١٧

هذا التطبيق **صدقة جارية**، أُنجز بنية خالصة لوجه الله، ليبقى نفعه جارياً بإذن الله حتى بعد وفاة صاحبه.
كل من حفظ آية بمساعدة هذا البرنامج، فأجره في ميزان من بناه.

---

## ما هو مبنى القرآن؟

**مبنى القرآن** تطبيق مكتبي (Windows) يجعل من حفظ القرآن الكريم تجربة بصرية وتفاعلية.
تخيّل أن كل صفحة تحفظها هي **طابق جديد** يُضاف إلى مبناك — حتى يكتمل القرآن كاملاً.

### المميزات الرئيسية

- **مبنى بصري تفاعلي** — كل صفحة تحفظها تُضيء في البناء
- **تحليل التلاوة بالذكاء الاصطناعي** — يستمع إليك ويصحح تلاوتك
- **محرك تجويد كامل** — يكتشف: القلقلة، الغنة، المد، النون والميم الساكنة
- **ثلاثة مستويات** — مبتدئ / متوسط / إجازة حفص
- **متعدد المستخدمين** — كل فرد في الأسرة له حسابه الخاص
- **يعمل محلياً بالكامل** — لا إنترنت، لا بيانات ترسل للخارج
- **تحديث تلقائي** — يتحدث نفسه عند توفر نسخة جديدة

---

## المتطلبات (للتشغيل المباشر)

لا شيء. فقط حمّل الملف التنفيذي من قسم [Releases](https://github.com/KarimEG45/CoranBuilding/releases) وشغّله مباشرة.

---

## التثبيت للمطورين

### المتطلبات الأساسية
- Python 3.10 أو أحدث
- Node.js 18 أو أحدث
- FFmpeg (ضروري لمعالجة الصوت مع Whisper)
- Ollama (اختياري، للتغذية الراجعة التفصيلية)

### 1 — إعداد الواجهة الخلفية

```bash
git clone https://github.com/KarimEG45/CoranBuilding.git
cd CoranBuilding

# نسخ ملف الإعدادات
cp .env.example .env
# (عدّل .env حسب إعداداتك)

# تثبيت المكتبات
cd backend
pip install -r requirements.txt
```

### 2 — إعداد الواجهة الأمامية

```bash
cd frontend
npm install
npm run dev
```

### 3 — تشغيل الخادم

```bash
# من مجلد المشروع الجذر
python backend/app/main.py
```

ثم افتح المتصفح على: **http://localhost:8001**

---

## بناء النسخة التنفيذية (exe)

```bash
# بناء الواجهة الأمامية أولاً
cd frontend && npm run build && cd ..

# ثم بناء الملف التنفيذي
python build_pro.py
```

الناتج في: `QuranBuilding_Release_PRO/`

---

## البنية التقنية

```
CoranBuilding/
├── backend/
│   ├── app/
│   │   ├── api/v1/          ← نقاط API (تحليل، مستخدمون، تحديثات)
│   │   ├── services/
│   │   │   ├── tajweed_engine.py   ← محرك التجويد الكامل
│   │   │   ├── transcription.py    ← Whisper + timestamps
│   │   │   ├── audio_analysis.py   ← تحليل librosa صوتي
│   │   │   └── quran.py            ← API alquran.cloud
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   └── src/components/
│       ├── dashboard/       ← BuildingView, TajweedText...
│       └── audio/           ← QuranRecorder, AudioPlayer...
├── quran_pages/             ← 604 صورة لصفحات المصحف
├── version.json
├── build_pro.py
└── .env.example
```

---

## كيف تساهم؟

كل مساهمة صدقة جارية. إن كنت:
- مطوراً — افتح Pull Request
- عالماً بالتجويد — ساعد في ضبط قواعد المحرك
- مختبراً — أبلغ عن الأخطاء عبر Issues

---

## الترخيص

**MIT License** — حر الاستخدام، التعديل، والتوزيع، بشرط الإبقاء على الإسناد.
اللهم اجعله في ميزان الحسنات.

</div>

---
---

## 🇫🇷 Version Française

## Qu'est-ce que The Coran Building ?

**The Coran Building** est une application de bureau (Windows) qui transforme la mémorisation du Coran en une expérience visuelle et gamifiée.
Chaque page mémorisée ajoute un **étage à ton immeuble** — jusqu'à ce que les 604 pages soient complètes.

Ce projet est une **sadaqa jariya** (aumône continue) : offert librement, pour que ses bénéfices perdurent au-delà de son créateur, إن شاء الله.

---

## Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| Immeuble visuel | Chaque page mémorisée s'illumine dans la vue bâtiment |
| Analyse IA | Whisper transcrit ta récitation et la compare au texte attendu |
| Moteur Tajweed | Détecte Qalqalah, Ghunnah, Madd, Noon/Meem Sakinah |
| 3 niveaux | Débutant (15%) / Intermédiaire (50%) / Ijaza Hafs (80%) |
| Multi-utilisateurs | Un compte par membre de la famille |
| 100% local | Aucune donnée envoyée sur internet |
| Auto-updater | Mise à jour automatique depuis GitHub Releases |

---

## Utilisation (pour les utilisateurs)

1. Télécharger la dernière version depuis [Releases](https://github.com/KarimEG45/CoranBuilding/releases)
2. Double-cliquer sur `QuranBuildingPro.exe`
3. Ouvrir le navigateur à : **http://localhost:8001**

Aucune installation requise. L'application est autonome.

---

## Installation (pour les développeurs)

### Prérequis
- Python 3.10+
- Node.js 18+
- FFmpeg (obligatoire pour Whisper)
- Ollama (optionnel, pour le feedback détaillé)

### 1 — Backend

```bash
git clone https://github.com/KarimEG45/CoranBuilding.git
cd CoranBuilding

cp .env.example .env
# Édite .env selon ta configuration

cd backend
pip install -r requirements.txt
```

### 2 — Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3 — Lancer le serveur

```bash
python backend/app/main.py
```

Accéder à : **http://localhost:8001**

---

## Build de l'exécutable

```bash
# 1. Builder le frontend
cd frontend && npm run build && cd ..

# 2. Builder le .exe
python build_pro.py
```

Résultat dans : `QuranBuilding_Release_PRO/`

---

## Architecture technique

```
CoranBuilding/
├── backend/
│   ├── app/
│   │   ├── api/v1/               ← Routes API REST
│   │   ├── services/
│   │   │   ├── tajweed_engine.py ← Moteur Tajweed complet
│   │   │   ├── transcription.py  ← Whisper + word timestamps
│   │   │   ├── audio_analysis.py ← Vérification acoustique librosa
│   │   │   └── quran.py          ← API alquran.cloud + normalisation
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   └── src/components/
│       ├── dashboard/            ← BuildingView, TajweedText...
│       └── audio/                ← QuranRecorder, AudioPlayer...
├── quran_pages/                  ← 604 images des pages du Coran
├── version.json
├── build_pro.py
└── .env.example
```

### Stack technique
- **Backend** : FastAPI · Python 3.10+ · SQLite · SQLAlchemy
- **IA** : OpenAI Whisper · Ollama (LLM local) · librosa
- **Frontend** : React 19 · Next.js · TypeScript · Tailwind CSS
- **Distribution** : PyInstaller → `.exe` autonome

---

## Niveaux Tajweed

| Niveau | Seuil | Règles vérifiées |
|---|---|---|
| 1 — Débutant | 15% | Présence des mots uniquement |
| 2 — Intermédiaire | 50% | Qalqalah, Noon Sakinah, Meem Sakinah, Ghunnah |
| 3 — Ijaza Hafs | 80% | + Madd (Tabii / Muttasil / Munfasil) |

---

## Contribuer

Toute contribution est une sadaqa jariya. Tu peux :
- **Développeur** → ouvrir une Pull Request
- **Expert en Tajweed** → aider à affiner les règles du moteur
- **Testeur** → signaler les bugs via Issues

---

## Licence

**MIT License** — Libre d'utilisation, modification et distribution, à condition de conserver l'attribution.

---

<div align="center">

*اللهم تقبّل هذا العمل، وانفع به المسلمين، واجعله في ميزان حسنات من أسهم فيه*
*«رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ»*

</div>
