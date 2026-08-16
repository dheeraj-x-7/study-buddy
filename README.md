# 📚 AI Study Buddy

An AI-powered study tool built with **Python (Flask)** and **Google Gemini AI** that helps students understand complex topics, summarize notes, generate quizzes, and create interactive flashcards.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Explain** | Enter any concept and get a plain-English explanation tailored to your level |
| **Summarize** | Paste lecture notes or textbook content and get a structured summary |
| **Quiz** | Auto-generate multiple-choice questions with instant grading and explanations |
| **Flashcards** | Create interactive flip-cards for efficient memorization |

---

## 🛠️ Tech Stack

- **Backend:** Python 3.10+, Flask, Flask-CORS
- **AI:** Google Gemini 1.5 Flash (`google-generativeai`)
- **Frontend:** Vanilla HTML5 / CSS3 / JavaScript (no frameworks)
- **Config:** python-dotenv

---

## 🚀 Quick Start

### 1. Clone & enter the project
```bash
cd study_buddy
```

### 2. Create a virtual environment
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Set up your API key

Copy the example env file and fill in your key:
```bash
cp .env.example .env
```

Edit `.env`:
```
GEMINI_API_KEY=your_actual_key_here
```

> Get a free API key at: https://aistudio.google.com/app/apikey

### 5. Run the app
```bash
python app.py
```

Open your browser at **http://localhost:5000**

---

## 📁 Project Structure

```
study_buddy/
├── app.py                  # Flask backend + AI endpoints
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variable template
├── templates/
│   └── index.html          # Main single-page UI
└── static/
    ├── css/
    │   └── style.css       # All styles
    └── js/
        └── app.js          # Frontend logic
```

---

## 🔌 API Endpoints

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/explain` | `{topic, level}` | Explain a concept |
| POST | `/api/summarize` | `{notes}` | Summarize study notes |
| POST | `/api/quiz` | `{topic, num_questions}` | Generate quiz questions |
| POST | `/api/flashcards` | `{topic, notes, num_cards}` | Generate flashcards |
| GET  | `/api/health` | — | Health check |
