// ─── State ─────────────────────────────────────────────────
const state = {
  quiz: { questions: [], current: 0, score: 0, answered: [] },
  flashcards: { cards: [], current: 0, flipped: false },
};

// ─── DOM Helpers ────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const hide = (el) => el.classList.add("hidden");
const show = (el) => el.classList.remove("hidden");

// ─── Loader ─────────────────────────────────────────────────
function showLoader(msg = "Thinking…") {
  $("loader-text").textContent = msg;
  show($("loader-overlay"));
}
function hideLoader() { hide($("loader-overlay")); }

// ─── Toast ──────────────────────────────────────────────────
function toast(msg, duration = 2200) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  t.classList.add("show");
  setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.classList.add("hidden"), 300);
  }, duration);
}

// ─── Tab Navigation ─────────────────────────────────────────
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    $(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// ─── API Fetch Wrapper ───────────────────────────────────────
async function apiPost(endpoint, body) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

// ─── Copy to Clipboard ───────────────────────────────────────
document.querySelectorAll(".btn-copy").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = $(btn.dataset.target);
    navigator.clipboard.writeText(target.textContent).then(() => toast("Copied to clipboard!"));
  });
});

// ─── Character Counter ───────────────────────────────────────
$("summarize-notes").addEventListener("input", function () {
  $("notes-char-count").textContent = `${this.value.length} characters`;
});

// ═══════════════════════════════════════════════════════════
// EXPLAIN
// ═══════════════════════════════════════════════════════════
$("explain-btn").addEventListener("click", async () => {
  const topic = $("explain-topic").value.trim();
  const level = $("explain-level").value;

  if (!topic) { toast("Please enter a topic."); return; }

  showLoader("Explaining…");
  try {
    const data = await apiPost("/api/explain", { topic, level });
    $("explain-content").textContent = data.explanation;
    show($("explain-result"));
    $("explain-result").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    toast("Error: " + err.message);
  } finally {
    hideLoader();
  }
});

// ═══════════════════════════════════════════════════════════
// SUMMARIZE
// ═══════════════════════════════════════════════════════════
$("summarize-btn").addEventListener("click", async () => {
  const notes = $("summarize-notes").value.trim();

  if (!notes) { toast("Please paste your notes first."); return; }
  if (notes.length < 20) { toast("Notes are too short to summarize."); return; }

  showLoader("Summarizing…");
  try {
    const data = await apiPost("/api/summarize", { notes });
    $("summarize-content").textContent = data.summary;
    show($("summarize-result"));
    $("summarize-result").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    toast("Error: " + err.message);
  } finally {
    hideLoader();
  }
});

// ═══════════════════════════════════════════════════════════
// QUIZ
// ═══════════════════════════════════════════════════════════
$("quiz-btn").addEventListener("click", async () => {
  const topic = $("quiz-topic").value.trim();
  const num_questions = parseInt($("quiz-count").value);

  if (!topic) { toast("Please enter a topic for the quiz."); return; }

  showLoader("Generating quiz questions…");
  try {
    const data = await apiPost("/api/quiz", { topic, num_questions });
    state.quiz.questions = data.questions;
    state.quiz.score = 0;
    state.quiz.answered = new Array(data.questions.length).fill(false);
    renderQuiz();
    show($("quiz-container"));
    $("quiz-container").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    toast("Error: " + err.message);
  } finally {
    hideLoader();
  }
});

function renderQuiz() {
  const { questions } = state.quiz;
  const container = $("quiz-questions");
  container.innerHTML = "";

  $("quiz-progress").textContent = `${questions.length} Questions`;
  $("quiz-score-display").textContent = "Score: 0";
  hide($("quiz-footer"));

  questions.forEach((q, idx) => {
    const block = document.createElement("div");
    block.className = "quiz-question-block";
    block.id = `q-block-${idx}`;

    block.innerHTML = `
      <div class="quiz-q-num">Question ${idx + 1}</div>
      <div class="quiz-q-text">${escapeHtml(q.question)}</div>
      <div class="options-grid" id="options-${idx}">
        ${q.options.map((opt) => `
          <button class="option-btn" data-q="${idx}" data-opt="${escapeHtml(opt)}">
            ${escapeHtml(opt)}
          </button>
        `).join("")}
      </div>
      <div class="quiz-explanation" id="exp-${idx}">${escapeHtml(q.explanation || "")}</div>
    `;

    container.appendChild(block);
  });

  // Attach option click handlers
  container.querySelectorAll(".option-btn").forEach((btn) => {
    btn.addEventListener("click", handleOptionClick);
  });
}

function handleOptionClick(e) {
  const btn = e.currentTarget;
  const qIdx = parseInt(btn.dataset.q);
  const chosen = btn.dataset.opt;
  const q = state.quiz.questions[qIdx];

  if (state.quiz.answered[qIdx]) return;
  state.quiz.answered[qIdx] = true;

  // Disable all options for this question
  const allOpts = document.querySelectorAll(`[data-q="${qIdx}"]`);
  allOpts.forEach((b) => (b.disabled = true));

  // Mark correct/wrong
  const isCorrect = chosen === q.answer;
  btn.classList.add(isCorrect ? "correct" : "wrong");

  if (!isCorrect) {
    allOpts.forEach((b) => {
      if (b.dataset.opt === q.answer) b.classList.add("correct");
    });
  }

  if (isCorrect) {
    state.quiz.score++;
    $("quiz-score-display").textContent = `Score: ${state.quiz.score}`;
  }

  // Show explanation
  const expEl = $(`exp-${qIdx}`);
  if (q.explanation) expEl.style.display = "block";

  // Check if all answered
  if (state.quiz.answered.every(Boolean)) {
    const total = state.quiz.questions.length;
    const pct = Math.round((state.quiz.score / total) * 100);
    const grade = pct >= 80 ? "🎉 Excellent!" : pct >= 60 ? "👍 Good job!" : "📚 Keep studying!";
    $("quiz-final-score").textContent = `${grade}  You scored ${state.quiz.score} / ${total} (${pct}%)`;
    show($("quiz-footer"));
    $("quiz-footer").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

$("quiz-restart-btn").addEventListener("click", () => {
  hide($("quiz-container"));
  $("quiz-topic").value = "";
});

// ═══════════════════════════════════════════════════════════
// FLASHCARDS
// ═══════════════════════════════════════════════════════════
$("fc-btn").addEventListener("click", async () => {
  const topic = $("fc-topic").value.trim();
  const notes = $("fc-notes").value.trim();
  const num_cards = parseInt($("fc-count").value);

  if (!topic && !notes) { toast("Please enter a topic or paste some notes."); return; }

  showLoader("Creating flashcards…");
  try {
    const data = await apiPost("/api/flashcards", { topic, notes, num_cards });
    state.flashcards.cards = data.flashcards;
    state.flashcards.current = 0;
    state.flashcards.flipped = false;
    renderFlashcard();
    show($("flashcard-area"));
    $("flashcard-area").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    toast("Error: " + err.message);
  } finally {
    hideLoader();
  }
});

function renderFlashcard() {
  const { cards, current } = state.flashcards;
  const card = cards[current];

  $("fc-front").textContent = card.front;
  $("fc-back").textContent = card.back;
  $("fc-counter").textContent = `${current + 1} / ${cards.length}`;

  // Reset flip
  state.flashcards.flipped = false;
  $("flashcard-inner").classList.remove("flipped");

  // Progress bar
  const pct = ((current + 1) / cards.length) * 100;
  $("fc-progress-fill").style.width = `${pct}%`;

  // Disable prev/next
  $("fc-prev").disabled = current === 0;
  $("fc-next").disabled = current === cards.length - 1;
}

// Flip on card click
$("flashcard").addEventListener("click", () => {
  state.flashcards.flipped = !state.flashcards.flipped;
  $("flashcard-inner").classList.toggle("flipped", state.flashcards.flipped);
});

$("fc-prev").addEventListener("click", () => {
  if (state.flashcards.current > 0) {
    state.flashcards.current--;
    renderFlashcard();
  }
});

$("fc-next").addEventListener("click", () => {
  if (state.flashcards.current < state.flashcards.cards.length - 1) {
    state.flashcards.current++;
    renderFlashcard();
  }
});

// ─── Utility ─────────────────────────────────────────────────
function escapeHtml(str) {
  const d = document.createElement("div");
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}
