const state = {
  dictionary: [],
  courses: [],
  activeGroup: "All",
  currentCourse: null,
  currentCards: [],
  currentIndex: 0,
  currentMode: "de-en",
  answerVisible: false,
  knownIds: new Set(),
  reviewIds: new Set(),
  lastCourseId: null,
  lastMode: "de-en"
};

const els = {
  subtitle: document.getElementById("subtitle"),
  homeBtn: document.getElementById("homeBtn"),
  homeScreen: document.getElementById("homeScreen"),
  courseScreen: document.getElementById("courseScreen"),
  practiceScreen: document.getElementById("practiceScreen"),
  bottomBar: document.getElementById("bottomBar"),

  continuePanel: document.getElementById("continuePanel"),
  continueTitle: document.getElementById("continueTitle"),
  continueMeta: document.getElementById("continueMeta"),
  continueBtn: document.getElementById("continueBtn"),

  recommendedList: document.getElementById("recommendedList"),
  recommendedCount: document.getElementById("recommendedCount"),
  groupChips: document.getElementById("groupChips"),
  courseGroupTitle: document.getElementById("courseGroupTitle"),
  courseCount: document.getElementById("courseCount"),
  courseList: document.getElementById("courseList"),

  courseTitle: document.getElementById("courseTitle"),
  courseDescription: document.getElementById("courseDescription"),
  courseMeta: document.getElementById("courseMeta"),
  courseLevel: document.getElementById("courseLevel"),
  backToCoursesBtn: document.getElementById("backToCoursesBtn"),

  cardCounter: document.getElementById("cardCounter"),
  scoreCounter: document.getElementById("scoreCounter"),
  flashcard: document.getElementById("flashcard"),
  modeLabel: document.getElementById("modeLabel"),
  cardQuestion: document.getElementById("cardQuestion"),
  cardAnswer: document.getElementById("cardAnswer"),
  flipBtn: document.getElementById("flipBtn"),
  speakBtn: document.getElementById("speakBtn"),
  shuffleBtn: document.getElementById("shuffleBtn"),
  knowBtn: document.getElementById("knowBtn"),
  reviewBtn: document.getElementById("reviewBtn")
};

init();

async function init() {
  try {
    const [dictionary, courses] = await Promise.all([
      fetchJson("./data/dictionary.json"),
      fetchJson("./data/courses.json")
    ]);

    state.dictionary = dictionary;
    state.courses = [...courses].sort((a, b) => {
      const groupSort = (a.group || "").localeCompare(b.group || "");
      if (groupSort !== 0) return groupSort;
      return (a.order || 999) - (b.order || 999);
    });

    loadProgress();
    bindEvents();
    renderHome();
    showScreen("home");
  } catch (error) {
    console.error(error);
    els.courseList.innerHTML = `
      <div class="course-row">
        <div>
          <strong>Could not load GermanFlash.</strong>
          <span>Check data/dictionary.json and data/courses.json.</span>
        </div>
      </div>
    `;
  }
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

function bindEvents() {
  els.homeBtn.addEventListener("click", () => showScreen("home"));
  els.backToCoursesBtn.addEventListener("click", () => showScreen("home"));

  els.continueBtn.addEventListener("click", () => {
    if (!state.lastCourseId) return;
    openCourse(state.lastCourseId);
    startPractice(state.lastMode || "de-en");
  });

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      startPractice(button.dataset.mode);
    });
  });

  els.flashcard.addEventListener("click", flipCard);
  els.flipBtn.addEventListener("click", flipCard);
  els.speakBtn.addEventListener("click", speakCurrentGerman);
  els.shuffleBtn.addEventListener("click", shuffleCurrentCourse);
  els.knowBtn.addEventListener("click", markKnown);
  els.reviewBtn.addEventListener("click", markReview);
}

function showScreen(screen) {
  els.homeScreen.classList.remove("active");
  els.courseScreen.classList.remove("active");
  els.practiceScreen.classList.remove("active");
  els.bottomBar.classList.add("hidden");

  if (screen === "home") {
    renderHome();
    els.homeScreen.classList.add("active");
    els.homeBtn.classList.add("hidden");
    els.subtitle.textContent = "Small lessons. No chaos.";
  }

  if (screen === "course") {
    els.courseScreen.classList.add("active");
    els.homeBtn.classList.remove("hidden");
    els.subtitle.textContent = "Choose practice mode.";
  }

  if (screen === "practice") {
    els.practiceScreen.classList.add("active");
    els.homeBtn.classList.remove("hidden");
    els.bottomBar.classList.remove("hidden");
    els.subtitle.textContent = state.currentCourse?.title || "Practice";
  }
}

function renderHome() {
  renderContinuePanel();
  renderRecommended();
  renderGroupChips();
  renderCourseList();
}

function renderContinuePanel() {
  if (!state.lastCourseId) {
    els.continuePanel.classList.add("hidden");
    return;
  }

  const course = state.courses.find((item) => item.id === state.lastCourseId);
  if (!course) {
    els.continuePanel.classList.add("hidden");
    return;
  }

  els.continueTitle.textContent = course.title;
  els.continueMeta.textContent = `${course.level || "A1"} · ${course.wordIds.length} cards · ${getModeLabel(state.lastMode)}`;
  els.continuePanel.classList.remove("hidden");
}

function renderRecommended() {
  const recommended = state.courses
    .filter((course) => course.recommended)
    .slice(0, 3);

  els.recommendedCount.textContent = `${recommended.length}`;
  els.recommendedList.innerHTML = "";

  recommended.forEach((course) => {
    els.recommendedList.appendChild(createCourseRow(course));
  });
}

function renderGroupChips() {
  const groups = ["All", ...new Set(state.courses.map((course) => course.group || "Other"))];

  els.groupChips.innerHTML = "";

  groups.forEach((group) => {
    const button = document.createElement("button");
    button.className = group === state.activeGroup ? "chip active" : "chip";
    button.textContent = group;

    button.addEventListener("click", () => {
      state.activeGroup = group;
      renderHome();
    });

    els.groupChips.appendChild(button);
  });
}

function renderCourseList() {
  const courses =
    state.activeGroup === "All"
      ? state.courses
      : state.courses.filter((course) => course.group === state.activeGroup);

  els.courseGroupTitle.textContent =
    state.activeGroup === "All" ? "All Courses" : state.activeGroup;

  els.courseCount.textContent = `${courses.length}`;
  els.courseList.innerHTML = "";

  courses.forEach((course) => {
    els.courseList.appendChild(createCourseRow(course));
  });
}

function createCourseRow(course) {
  const button = document.createElement("button");
  const count = course.wordIds.length;

  button.className = "course-row";
  button.innerHTML = `
    <div>
      <strong>${course.title}</strong>
      <span>${course.group || "Course"} · ${count} cards</span>
    </div>
    <span class="mini-pill">${course.level || "A1"}</span>
  `;

  button.addEventListener("click", () => openCourse(course.id));

  return button;
}

function openCourse(courseId) {
  const course = state.courses.find((item) => item.id === courseId);
  if (!course) return;

  state.currentCourse = course;
  state.currentCards = course.wordIds
    .map((id) => state.dictionary.find((entry) => entry.id === id))
    .filter(Boolean);

  state.currentIndex = 0;
  state.answerVisible = false;

  els.courseTitle.textContent = course.title;
  els.courseDescription.textContent = course.description || "";
  els.courseMeta.textContent = `${course.group || "Course"} · ${course.wordIds.length} cards`;
  els.courseLevel.textContent = course.level || "A1";

  showScreen("course");
}

function startPractice(mode) {
  state.currentMode = mode;
  state.lastMode = mode;
  state.lastCourseId = state.currentCourse?.id || null;
  state.currentIndex = 0;
  state.answerVisible = false;

  saveProgress();
  showScreen("practice");
  renderCard();
}

function renderCard() {
  const card = getCurrentCard();

  els.flashcard.classList.toggle("flipped", state.answerVisible);

  if (!card) {
    els.cardQuestion.textContent = "No cards";
    els.cardAnswer.textContent = "";
    return;
  }

  const content = getCardContent(card, state.currentMode);

  els.modeLabel.textContent = getModeLabel(state.currentMode);
  els.cardQuestion.textContent = content.question;
  els.cardAnswer.textContent = content.answer;

  updateStats();
}

function getCardContent(card, mode) {
  if (mode === "en-de") {
    return {
      question: card.english,
      answer: formatGerman(card)
    };
  }

  if (mode === "article") {
    return {
      question: card.word,
      answer: card.article ? `${card.article} ${card.word}` : "No article"
    };
  }

  return {
    question: formatGerman(card),
    answer: card.english
  };
}

function getModeLabel(mode) {
  if (mode === "en-de") return "English → German";
  if (mode === "article") return "Article Quiz";
  return "German → English";
}

function formatGerman(card) {
  if (card.type === "noun" && card.article) {
    return `${card.article} ${card.word}`;
  }

  return card.word;
}

function flipCard() {
  state.answerVisible = !state.answerVisible;
  renderCard();
}

function markKnown() {
  const card = getCurrentCard();
  if (!card) return;

  state.knownIds.add(card.id);
  state.reviewIds.delete(card.id);

  saveProgress();
  nextCard();
}

function markReview() {
  const card = getCurrentCard();
  if (!card) return;

  state.reviewIds.add(card.id);
  state.knownIds.delete(card.id);

  saveProgress();
  nextCard();
}

function nextCard() {
  if (!state.currentCards.length) return;

  state.currentIndex = (state.currentIndex + 1) % state.currentCards.length;
  state.answerVisible = false;
  renderCard();
}

function shuffleCurrentCourse() {
  state.currentCards = shuffleArray([...state.currentCards]);
  state.currentIndex = 0;
  state.answerVisible = false;
  renderCard();
}

function getCurrentCard() {
  return state.currentCards[state.currentIndex];
}

function updateStats() {
  const total = state.currentCards.length;
  const position = total ? state.currentIndex + 1 : 0;

  els.cardCounter.textContent = `${position} / ${total}`;
  els.scoreCounter.textContent = `Known ${state.knownIds.size} · Review ${state.reviewIds.size}`;
}

function speakCurrentGerman() {
  const card = getCurrentCard();
  if (!card || !("speechSynthesis" in window)) return;

  const utterance = new SpeechSynthesisUtterance(formatGerman(card));
  utterance.lang = "de-DE";
  utterance.rate = 0.85;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function saveProgress() {
  localStorage.setItem(
    "germanflash-progress",
    JSON.stringify({
      knownIds: [...state.knownIds],
      reviewIds: [...state.reviewIds],
      lastCourseId: state.lastCourseId,
      lastMode: state.lastMode
    })
  );
}

function loadProgress() {
  const raw = localStorage.getItem("germanflash-progress");
  if (!raw) return;

  try {
    const progress = JSON.parse(raw);
    state.knownIds = new Set(progress.knownIds || []);
    state.reviewIds = new Set(progress.reviewIds || []);
    state.lastCourseId = progress.lastCourseId || null;
    state.lastMode = progress.lastMode || "de-en";
  } catch {
    state.knownIds = new Set();
    state.reviewIds = new Set();
    state.lastCourseId = null;
    state.lastMode = "de-en";
  }
}

function shuffleArray(array) {
  return array
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}