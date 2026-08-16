import os
import json
import re
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found. Please set it in your .env file.")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-3.5-flash")


def ask_gemini(prompt: str) -> str:
    """Send a prompt to Gemini and return the text response."""
    response = model.generate_content(prompt)
    return response.text.strip()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/explain", methods=["POST"])
def explain():
    """Explain a concept in simple terms."""
    data = request.get_json()
    topic = data.get("topic", "").strip()
    level = data.get("level", "high school").strip()

    if not topic:
        return jsonify({"error": "Topic is required."}), 400

    prompt = (
        f"You are a friendly tutor. Explain the concept of '{topic}' in simple, clear terms "
        f"suitable for a {level} student. Use analogies and examples where helpful. "
        f"Structure your explanation with:\n"
        f"1. A simple one-sentence definition\n"
        f"2. A detailed explanation (3-5 sentences)\n"
        f"3. A real-world analogy or example\n"
        f"4. Key points to remember (bullet list)\n"
        f"Use plain text without markdown symbols like ** or ##."
    )

    explanation = ask_gemini(prompt)
    return jsonify({"explanation": explanation})


@app.route("/api/summarize", methods=["POST"])
def summarize():
    """Summarize study notes into key points."""
    data = request.get_json()
    notes = data.get("notes", "").strip()

    if not notes:
        return jsonify({"error": "Notes are required."}), 400

    if len(notes) < 20:
        return jsonify({"error": "Notes are too short to summarize."}), 400

    prompt = (
        f"You are a study assistant. Summarize the following study notes concisely.\n\n"
        f"Notes:\n{notes}\n\n"
        f"Provide:\n"
        f"1. A 2-3 sentence overall summary\n"
        f"2. Key concepts (bullet list, max 8 points)\n"
        f"3. Important terms to remember (if any)\n"
        f"Use plain text without markdown symbols like ** or ##."
    )

    summary = ask_gemini(prompt)
    return jsonify({"summary": summary})


@app.route("/api/quiz", methods=["POST"])
def generate_quiz():
    """Generate multiple-choice quiz questions."""
    data = request.get_json()
    topic = data.get("topic", "").strip()
    num_questions = min(int(data.get("num_questions", 5)), 10)

    if not topic:
        return jsonify({"error": "Topic is required."}), 400

    prompt = (
        f"Generate {num_questions} multiple-choice quiz questions about '{topic}'.\n"
        f"Return ONLY a valid JSON array (no extra text, no markdown) in this exact format:\n"
        f'[{{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "A) ...", "explanation": "..."}}]\n'
        f"Each question must have exactly 4 options labeled A), B), C), D). "
        f"The answer must match one of the options exactly."
    )

    raw = ask_gemini(prompt)

    # Strip markdown code fences if present
    raw = re.sub(r"```(?:json)?", "", raw).strip()
    # Extract the JSON array portion
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if not match:
        return jsonify({"error": "Failed to parse quiz. Please try again."}), 500

    try:
        questions = json.loads(match.group())
    except json.JSONDecodeError:
        return jsonify({"error": "Failed to parse quiz JSON. Please try again."}), 500

    return jsonify({"questions": questions})


@app.route("/api/flashcards", methods=["POST"])
def generate_flashcards():
    """Generate study flashcards for a topic or from notes."""
    data = request.get_json()
    topic = data.get("topic", "").strip()
    notes = data.get("notes", "").strip()
    num_cards = min(int(data.get("num_cards", 8)), 15)

    if not topic and not notes:
        return jsonify({"error": "Topic or notes are required."}), 400

    source = f"the topic '{topic}'" if topic else "the following notes"
    notes_section = f"\n\nNotes:\n{notes}" if notes else ""

    prompt = (
        f"Generate {num_cards} flashcards for {source}.{notes_section}\n"
        f"Return ONLY a valid JSON array (no extra text, no markdown) in this exact format:\n"
        f'[{{"front": "Question or term here", "back": "Answer or definition here"}}]\n'
        f"Make the fronts concise questions or key terms, and backs clear, brief answers."
    )

    raw = ask_gemini(prompt)

    # Strip markdown code fences if present
    raw = re.sub(r"```(?:json)?", "", raw).strip()
    match = re.search(r"\[.*\]", raw, re.DOTALL)
    if not match:
        return jsonify({"error": "Failed to parse flashcards. Please try again."}), 500

    try:
        cards = json.loads(match.group())
    except json.JSONDecodeError:
        return jsonify({"error": "Failed to parse flashcard JSON. Please try again."}), 500

    return jsonify({"flashcards": cards})


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": "gemini-3.5-flash"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
