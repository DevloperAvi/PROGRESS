// QuizMaster - improved UI/UX, Leaderboard removed

/* ===== Utilities ===== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
  remove(key) { localStorage.removeItem(key); }
};

const KEYS = {
  THEME: "qm_theme",
  USERS: "qm_users",
  SESSION: "qm_session",
  QUESTIONS: "qm_questions",
  HISTORY: "qm_history"
};

// simple hash (demo only)
async function hash(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/* ===== Seed Data ===== */
const seedQuestions = [
  {id: uid(), title: "General Science", category: "Science", type: "mcq",
    text: "What is the chemical symbol for water?", options: ["H2O","O2","CO2","H2"], answer: "A", expl: "Water is H2O."},
  {id: uid(), title: "General Science", category: "Science", type: "mcq",
    text: "What planet is known as the Red Planet?", options: ["Earth","Mars","Jupiter","Venus"], answer: "B", expl: "Mars appears red due to iron oxide."},
  {id: uid(), title: "World History", category: "History", type: "mcq",
    text: "Who was the first President of the United States?", options: ["Abraham Lincoln","George Washington","Thomas Jefferson","John Adams"], answer: "B"},
  {id: uid(), title: "World History", category: "History", type: "mcq",
    text: "The Great Wall of China was built to protect against which group?", options: ["Mongols","Romans","Persians","Vikings"], answer: "A"},
  {id: uid(), title: "World Geography", category: "Geography", type: "mcq",
    text: "What is the capital of France?", options: ["Berlin","Madrid","Paris","Rome"], answer: "C"},
  {id: uid(), title: "World Geography", category: "Geography", type: "mcq",
    text: "Which river is the longest in the world?", options: ["Amazon","Nile","Yangtze","Mississippi"], answer: "B"},
  {id: uid(), title: "Movies & Books", category: "Entertainment", type: "mcq",
    text: 'Who directed the movie "Inception"?', options: ["Steven Spielberg","Christopher Nolan","Martin Scorsese","Quentin Tarantino"], answer: "B"},
  {id: uid(), title: "Movies & Books", category: "Entertainment", type: "mcq",
    text: "What is the name of the wizarding school in the Harry Potter series?", options: ["Hogwarts","Narnia","Middle-earth","Westeros"], answer: "A"},
  {id: uid(), title: "Sports Basics", category: "Sports", type: "mcq",
    text: "In which sport would you perform a slam dunk?", options: ["Soccer","Basketball","Tennis","Baseball"], answer: "B"},
  {id: uid(), title: "Sports Basics", category: "Sports", type: "mcq",
    text: "Which country hosted the 2016 Summer Olympics?", options: ["China","Brazil","UK","USA"], answer: "B"},
  {id: uid(), title: "General Science", category: "Science", type: "tf",
    text: "The sun is a star.", answer: "True", expl: "Yes, the Sun is a G-type main-sequence star."},
  {id: uid(), title: "World Geography", category: "Geography", type: "fib",
    text: "Mount ____ is the highest mountain above sea level.", answer: "Everest"}
];

function ensureSeed() {
  if (!store.get(KEYS.QUESTIONS, null)) store.set(KEYS.QUESTIONS, seedQuestions);
  if (!store.get(KEYS.USERS, null)) store.set(KEYS.USERS, []);
  if (!store.get(KEYS.HISTORY, null)) store.set(KEYS.HISTORY, {});
}
ensureSeed();

/* ===== Theme ===== */
function applyTheme() {
  const theme = store.get(KEYS.THEME, "dark");
  document.body.classList.toggle("light", theme === "light");
}
applyTheme();
$("#theme-toggle").addEventListener("click", () => {
  const theme = store.get(KEYS.THEME, "dark") === "dark" ? "light" : "dark";
  store.set(KEYS.THEME, theme); applyTheme();
});

/* ===== Auth ===== */
const session = {
  current() { return store.get(KEYS.SESSION, null); },
  async register({username, email, password}) {
    const users = store.get(KEYS.USERS, []);
    if (users.find(u => u.username === username)) throw new Error("Username taken");
    const passhash = await hash(password);
    const user = { id: uid(), username, email, passhash, admin: false, createdAt: Date.now() };
    users.push(user); store.set(KEYS.USERS, users);
    store.set(KEYS.SESSION, { username, email, admin: false });
    return user;
  },
  async login({username, email, password}) {
    const users = store.get(KEYS.USERS, []);
    const passhash = await hash(password);
    const user = users.find(u => u.username === username && u.email === email && u.passhash === passhash);
    if (!user) throw new Error("Invalid credentials");
    store.set(KEYS.SESSION, { username: user.username, email: user.email, admin: !!user.admin });
    return user;
  },
  logout() { store.remove(KEYS.SESSION); }
};

function updateAuthUI() {
  const s = session.current();
  if (s) {
    $("#auth-guest").classList.add("hidden");
    $("#auth-user").classList.remove("hidden");
    $("#user-greeting").textContent = `Hi, ${s.username}`;
  } else {
    $("#auth-guest").classList.remove("hidden");
    $("#auth-user").classList.add("hidden");
  }
}
updateAuthUI();

/* ===== Views & Navigation ===== */
const views = {
  home: $("#view-home"),
  quiz: $("#view-quiz"),
  results: $("#view-results"),
  admin: $("#view-admin")
};
function showView(name) {
  Object.values(views).forEach(v => v.classList.add("hidden"));
  views[name].classList.remove("hidden");
  if (name === "quiz") $("#question-container").classList.add("fade-in");
}

$("#nav-home").onclick = () => showView("home");
$("#nav-admin").onclick = () => showView("admin");
$("#btn-login").onclick = () => openAuthDialog("login");
$("#btn-register").onclick = () => openAuthDialog("register");
$("#btn-logout").onclick = () => { session.logout(); updateAuthUI(); showView("home"); };

/* ===== Categories ===== */
function getCategories() {
  const qs = store.get(KEYS.QUESTIONS, []);
  const map = new Map();
  for (const q of qs) {
    const k = `${q.category}::${q.title}`;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.entries()).map(([key, count]) => {
    const [category, title] = key.split("::");
    return { category, title, count };
  });
}

function renderCategories() {
  const cats = getCategories();
  const wrap = $("#categories");
  wrap.innerHTML = "";
  cats.forEach(({category, title, count}) => {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <h3>${title}</h3>
      <p class="muted">${category} • ${count} question(s)</p>
      <div class="grid-2">
        <label>Timer (mins)
          <input type="number" min="0" max="180" value="0" class="timer-input"/>
        </label>
        <label>Question Count
          <input type="number" min="1" max="${count}" value="${Math.min(10, count)}" class="count-input"/>
        </label>
      </div>
      <div style="display:flex; gap:.5rem; margin-top:.5rem">
        <button class="btn start-btn">Start Quiz</button>
      </div>
    `;
    $(".start-btn", el).onclick = () => {
      const minutes = parseInt($(".timer-input", el).value || "0", 10);
      const qcount = parseInt($(".count-input", el).value || "10", 10);
      startQuiz({ category, title, minutes, limit: qcount });
    };
    wrap.appendChild(el);
  });
}
renderCategories();

/* ===== Quiz Engine ===== */
let quizState = null;
let timerInterval = null;

function startQuiz({ category, title, minutes = 0, limit = 10 }) {
  const pool = store.get(KEYS.QUESTIONS, []).filter(q => q.category === category && q.title === title);
  const questions = shuffle(pool).slice(0, Math.min(limit, pool.length));
  quizState = {
    category, title, questions,
    index: 0,
    answers: {}, // id => userAnswer
    startTime: Date.now(),
    endTime: minutes > 0 ? Date.now() + minutes*60*1000 : null,
    submitted: false
  };
  $("#quiz-title").textContent = `${title} (${category})`;
  renderQuestion(true);
  updateProgressBar();
  showView("quiz");
  if (quizState.endTime) startTimer();
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderQuestion(animate=false) {
  const { index, questions, answers, submitted } = quizState;
  $("#progress").textContent = `Q ${index+1}/${questions.length}`;

  const q = questions[index];
  const box = $("#question-container");
  box.innerHTML = `<h3>${q.text}</h3>`;

  if (q.type === "mcq") {
    const labels = ["A","B","C","D"];
    q.options.forEach((opt, i) => {
      const wrap = document.createElement("label");
      wrap.className = "option";
      wrap.innerHTML = `
        <input type="radio" name="mcq" value="${labels[i]}"/>
        <span><b>${labels[i]}.</b> ${opt}</span>
      `;
      const input = $("input", wrap);
      input.checked = answers[q.id] === labels[i];
      input.disabled = submitted; // disable in review
      input.onchange = () => { quizState.answers[q.id] = labels[i]; };
      box.appendChild(wrap);
    });
  } else if (q.type === "tf") {
    ["True","False"].forEach(val => {
      const wrap = document.createElement("label");
      wrap.className = "option";
      wrap.innerHTML = `
        <input type="radio" name="tf" value="${val}"/>
        <span>${val}</span>
      `;
      const input = $("input", wrap);
      input.checked = answers[q.id] === val;
      input.disabled = submitted;
      input.onchange = () => { quizState.answers[q.id] = val; };
      box.appendChild(wrap);
    });
  } else if (q.type === "fib") {
    const inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = "Type your answer";
    inp.value = answers[q.id] || "";
    inp.disabled = submitted;
    inp.oninput = (e) => { quizState.answers[q.id] = e.target.value; };
    box.appendChild(inp);
  }

  // Highlight correct/wrong in review
  if (submitted && q.type !== "fib") {
    $$("#question-container .option").forEach(optEl => {
      const val = $("input", optEl).value;
      if (val === q.answer) optEl.classList.add("correct");
      const chosen = answers[q.id];
      if (chosen && val === chosen && chosen !== q.answer) optEl.classList.add("wrong");
    });
    if (q.expl) {
      const explEl = document.createElement("div");
      explEl.className = "muted";
      explEl.textContent = `Explanation: ${q.expl}`;
      box.appendChild(explEl);
    }
  }

  $("#btn-prev").disabled = index === 0;
  $("#btn-next").disabled = index === questions.length - 1;

  if (animate) { box.classList.remove("fade-in"); void box.offsetWidth; box.classList.add("fade-in"); }
  updateProgressBar();
}

function updateProgressBar() {
  const { index, questions } = quizState;
  const pct = ((index) / (questions.length)) * 100;
  $("#progress-bar").style.width = `${pct}%`;
}

$("#btn-prev").onclick = () => { quizState.index--; renderQuestion(true); };
$("#btn-next").onclick = () => { quizState.index++; renderQuestion(true); };
$("#btn-submit").onclick = () => submitQuiz();

$("#back-to-home").onclick = () => { clearInterval(timerInterval); showView("home"); };

function startTimer() {
  clearInterval(timerInterval);
  const pill = $("#timer");
  function tick() {
    const now = Date.now();
    const remain = Math.max(0, quizState.endTime - now);
    const m = Math.floor(remain / 60000).toString().padStart(2, "0");
    const s = Math.floor((remain % 60000) / 1000).toString().padStart(2, "0");
    pill.textContent = `${m}:${s}`;

    const total = (quizState.endTime - quizState.startTime);
    const ratio = remain / total;
    pill.classList.remove("ok","warn","danger");
    if (ratio > .66) pill.classList.add("ok");
    else if (ratio > .33) pill.classList.add("warn");
    else pill.classList.add("danger");

    if (remain <= 0) { clearInterval(timerInterval); submitQuiz(true); }
  }
  tick(); timerInterval = setInterval(tick, 250);
}

function normalize(text) {
  return (text ?? "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

function submitQuiz(auto=false) {
  if (quizState.submitted) return;
  quizState.submitted = true;
  clearInterval(timerInterval);

  const { questions, answers, category, title } = quizState;
  let correct = 0;
  const detail = [];

  for (const q of questions) {
    const userAns = answers[q.id];
    let isCorrect = false;
    if (q.type === "mcq" || q.type === "tf") {
      isCorrect = (userAns === q.answer);
    } else if (q.type === "fib") {
      isCorrect = normalize(userAns) === normalize(q.answer);
    }
    if (isCorrect) correct++;
    detail.push({ id: q.id, text: q.text, type: q.type, userAns, correctAns: q.answer, isCorrect, expl: q.expl || "" });
  }

  // decorate current question options to give immediate feedback
  const q = questions[quizState.index];
  if (q.type !== "fib") {
    $$("#question-container .option").forEach((optEl) => {
      const val = $("input", optEl).value;
      if (val === q.answer) optEl.classList.add("correct");
      const chosen = quizState.answers[q.id];
      if (chosen && val === chosen && chosen !== q.answer) optEl.classList.add("wrong");
    });
  }

  const total = questions.length;
  const scorePct = Math.round((correct / total) * 100);

  // Save history (leaderboard removed)
  const sess = store.get(KEYS.SESSION, null);
  const user = sess?.username || "Guest";
  const stamp = new Date().toISOString();
  const hist = store.get(KEYS.HISTORY, {});
  hist[user] = hist[user] || [];
  hist[user].push({ category, title, correct, total, scorePct, date: stamp });
  store.set(KEYS.HISTORY, hist);

  renderResults({ correct, total, scorePct, detail, category, title });
  showView("results");
}

function renderResults({ correct, total, scorePct, detail, category, title }) {
  const target = scorePct;
  const el = $("#results-summary");
  let n = 0;
  const step = Math.max(1, Math.round(target / 30));
  const i = setInterval(() => {
    n = Math.min(target, n + step);
    el.textContent = `You scored ${n}% • ${correct}/${total} correct • ${category} • ${title}`;
    if (n >= target) clearInterval(i);
  }, 20);

  const review = $("#answer-review");
  review.innerHTML = "";

  detail.forEach(d => {
    const wrap = document.createElement("div");
    wrap.className = "card";
    let ua = d.userAns ?? "—";

    wrap.innerHTML = `
      <div class="row"><b>${d.text}</b> <span class="${d.isCorrect?'':'muted'}">${d.isCorrect ? "✔️" : "❌"}</span></div>
      <div>Correct: <b>${d.correctAns}</b> • Your answer: <b>${ua}</b></div>
      ${d.expl ? `<div class="muted">${d.expl}</div>` : ""}
    `;

    // Make wrong answers clickable
    if (!d.isCorrect) {
      wrap.style.cursor = "pointer";
      wrap.title = "Click to view question and explanation";
      wrap.onclick = () => {
        // Show this question in quiz view
        quizState.index = quizState.questions.findIndex(q => q.id === d.id);
        quizState.submitted = true; // mark submitted to highlight answers
        renderQuestion(true);
        showView("quiz");
      };
    }

    review.appendChild(wrap);
  });

  // Share buttons
  $("#btn-share").onclick = async () => {
    const text = `I scored ${scorePct}% on ${title} (${category}) on QuizMaster!`;
    try { if (navigator.share) await navigator.share({ title: "QuizMaster", text, url: location.href }); } catch {}
  };
  const shareURL = encodeURIComponent(location.href);
  const shareText = encodeURIComponent(`I scored ${scorePct}% on ${title} (${category}) on QuizMaster!`);
  $("#share-twitter").href = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareURL}`;
  $("#share-whatsapp").href = `https://wa.me/?text=${shareText}%20${shareURL}`;

  $("#btn-retry").onclick = () => startQuiz({ category, title, minutes: 0, limit: total });
  $("#btn-results-home").onclick = () => showView("home");
}

/* ===== Admin ===== */
const ADMIN_KEY = "QUIZMASTER2025";
$("#btn-admin-enter").onclick = () => {
  const key = $("#admin-key").value.trim();
  if (key === ADMIN_KEY) {
    $("#admin-gate").classList.add("hidden");
    $("#admin-controls").classList.remove("hidden");
    renderAdmin();
  } else {
    alert("Invalid key");
  }
};

function renderAdmin() {
  const qs = store.get(KEYS.QUESTIONS, []);
  const categories = Array.from(new Set(qs.map(q => q.category))).sort();
  const sel = $("#admin-category-filter");
  sel.innerHTML = `<option value="">All categories</option>` + categories.map(c => `<option>${c}</option>`).join("");
  sel.onchange = () => listQuestions();
  $("#admin-search").oninput = () => listQuestions();
  $("#btn-new-question").onclick = () => openQuestionEditor();
  $("#btn-export").onclick = () => exportQuestions();
  $("#import-file").onchange = (e) => importQuestions(e.target.files[0]);
  listQuestions();
}

function listQuestions() {
  const wrap = $("#admin-list");
  wrap.innerHTML = "";
  const qs = store.get(KEYS.QUESTIONS, []);
  const cat = $("#admin-category-filter").value;
  const qtext = $("#admin-search").value.toLowerCase();
  const filtered = qs.filter(q =>
    (cat ? q.category === cat : true) &&
    (qtext ? q.text.toLowerCase().includes(qtext) : true)
  );
  if (filtered.length === 0) {
    wrap.innerHTML = `<div class="card">No questions found.</div>`;
    return;
  }
  filtered.forEach(q => {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div class="row">
        <b>[${q.category}] ${q.title}</b>
        <div><button class="btn outline edit-btn">Edit</button></div>
      </div>
      <div>${q.text}</div>
      <div class="muted">Type: ${q.type.toUpperCase()}</div>
    `;
    $(".edit-btn", item).onclick = () => openQuestionEditor(q);
    wrap.appendChild(item);
  });
}

function exportQuestions() {
  const data = store.get(KEYS.QUESTIONS, []);
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "questions.json"; a.click();
  URL.revokeObjectURL(url);
}

function importQuestions(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error("Invalid JSON format");
      const existing = store.get(KEYS.QUESTIONS, []);
      const map = new Map(existing.map(q => [q.id, q]));
      for (const q of data) { if (!q.id) q.id = uid(); map.set(q.id, q); }
      store.set(KEYS.QUESTIONS, Array.from(map.values()));
      alert("Imported successfully."); listQuestions(); renderCategories();
    } catch (e) { alert("Import failed: " + e.message); }
  };
  reader.readAsText(file);
}

/* ===== Question Editor ===== */
const qeDialog = $("#dialog-qe");
let qeCurrentId = null;

function openQuestionEditor(q=null) {
  qeCurrentId = q?.id || null;
  $("#qe-title").textContent = q ? "Edit Question" : "New Question";
  $("#qe-category").value = q?.category || "";
  $("#qe-title-input").value = q?.title || "";
  $("#qe-type").value = q?.type || "mcq";
  $("#qe-text").value = q?.text || "";
  $("#qe-answer").value = q?.answer || "";
  $("#qe-expl").value = q?.expl || "";
  renderOptionInputs($("#qe-type").value, q?.options || []);
  $("#qe-delete").style.display = q ? "inline-flex" : "none";
  qeDialog.showModal();
}

function renderOptionInputs(type, options=[]) {
  const box = $("#qe-options"); box.innerHTML = "";
  if (type === "mcq") {
    for (let i=0;i<4;i++) {
      const inp = document.createElement("input");
      inp.type = "text"; inp.placeholder = `Option ${String.fromCharCode(65+i)}`;
      inp.value = options[i] || "";
      box.appendChild(inp);
    }
  } else {
    box.innerHTML = `<div class="muted">No options for this type.</div>`;
  }
}
$("#qe-type").onchange = (e) => renderOptionInputs(e.target.value);

$("#qe-save").onclick = (e) => {
  e.preventDefault();
  const category = $("#qe-category").value.trim();
  const title = $("#qe-title-input").value.trim();
  const type = $("#qe-type").value;
  const text = $("#qe-text").value.trim();
  const answer = $("#qe-answer").value.trim();
  const expl = $("#qe-expl").value.trim();
  if (!category || !title || !text || !answer) { alert("Please fill required fields."); return; }
  let options = null;
  if (type === "mcq") {
    options = $$("#qe-options input").map(i => i.value.trim());
    if (options.some(o => !o)) { alert("Please fill all MCQ options."); return; }
  }
  const qs = store.get(KEYS.QUESTIONS, []);
  if (qeCurrentId) {
    const idx = qs.findIndex(x => x.id === qeCurrentId);
    if (idx >= 0) qs[idx] = { ...qs[idx], category, title, type, text, options, answer, expl };
  } else {
    qs.push({ id: uid(), category, title, type, text, options, answer, expl });
  }
  store.set(KEYS.QUESTIONS, qs);
  qeDialog.close(); renderCategories(); renderAdmin();
};

$("#qe-delete").onclick = () => {
  if (!qeCurrentId) return;
  const qs = store.get(KEYS.QUESTIONS, []);
  const next = qs.filter(q => q.id !== qeCurrentId);
  store.set(KEYS.QUESTIONS, next);
  qeDialog.close(); renderCategories(); renderAdmin();
};

$("#qe-cancel").onclick = (e) => { e.preventDefault(); qeDialog.close(); };

/* ===== Auth Dialog ===== */
const authDialog = $("#dialog-auth");
function openAuthDialog(mode="login") {
  $("#auth-title").textContent = mode === "login" ? "Log in" : "Sign up";
  $("#auth-submit").dataset.mode = mode;
  $("#auth-username").value = "";
  $("#auth-email").value = "";
  $("#auth-password").value = "";
  authDialog.showModal();
}
$("#auth-cancel").onclick = () => authDialog.close();
$("#auth-submit").onclick = async (e) => {
  e.preventDefault();
  const username = $("#auth-username").value.trim();
  const email = $("#auth-email").value.trim();
  const password = $("#auth-password").value;
  const mode = e.target.dataset.mode;
  try {
    if (mode === "login") await session.login({username, email, password});
    else await session.register({username, email, password});
    authDialog.close(); updateAuthUI();
  } catch (err) {
    alert(err.message || "Auth failed");
  }
};

/* ===== Misc ===== */
$("#year").textContent = new Date().getFullYear();
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  if ($("#view-quiz") && !$("#view-quiz").classList.contains("hidden") && quizState?.endTime) {
    const remain = Math.max(0, quizState.endTime - Date.now());
    const m = Math.floor(remain / 60000).toString().padStart(2, "0");
    const s = Math.floor((remain % 60000) / 1000).toString().padStart(2, "0");
    $("#timer").textContent = `${m}:${s}`;
  }
});

/* ================== RESPONSIVE NAV ================== */

// Create a mobile menu toggle button dynamically
const header = document.querySelector("header.container");
const nav = document.querySelector("nav");

if (header && nav) {
  const menuBtn = document.createElement("button");
  menuBtn.innerHTML = "☰"; // hamburger icon
  menuBtn.classList.add("menu-toggle");
  header.insertBefore(menuBtn, nav);

  // Toggle nav visibility
  menuBtn.addEventListener("click", () => {
    nav.classList.toggle("nav-open");
  });
}

/* ================== DIALOG IMPROVEMENTS ================== */
// Ensure dialogs scale on small screens
document.querySelectorAll("dialog").forEach(dialog => {
  dialog.addEventListener("cancel", e => e.preventDefault()); // prevent ESC auto-close
  dialog.style.maxWidth = "95%";
  dialog.style.margin = "auto";
});
