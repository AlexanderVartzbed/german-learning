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
  sessionReviewIds: new Set(),

  courseProgress: {},

  lastCourseId: null,
  lastMode: "de-en"
};

const els = {
  subtitle: document.getElementById("subtitle"),
  homeBtn: document.getElementById("homeBtn"),

  homeScreen: document.getElementById("homeScreen"),
  browseScreen: document.getElementById("browseScreen"),
  courseScreen: document.getElementById("courseScreen"),
  practiceScreen: document.getElementById("practiceScreen"),
  completeScreen: document.getElementById("completeScreen"),
  bottomBar: document.getElementById("bottomBar"),

  continuePanel: document.getElementById("continuePanel"),
  continueTitle: document.getElementById("continueTitle"),
  continueMeta: document.getElementById("continueMeta"),
  continueBtn: document.getElementById("continueBtn"),

  startTodayBtn: document.getElementById("startTodayBtn"),
  startTodayMeta: document.getElementById("startTodayMeta"),
  reviewMistakesBtn: document.getElementById("reviewMistakesBtn"),
  reviewMistakesMeta: document.getElementById("reviewMistakesMeta"),
  browseCoursesBtn: document.getElementById("browseCoursesBtn"),
  resetProgressBtn: document.getElementById("resetProgressBtn"),
  backFromBrowseBtn: document.getElementById("backFromBrowseBtn"),

  groupChips: document.getElementById("groupChips"),
  courseGroupTitle: document.getElementById("courseGroupTitle"),
  courseCount: document.getElementById("courseCount"),
  courseList: document.getElementById("courseList"),

  courseTitle: document.getElementById("courseTitle"),
  courseDescription: document.getElementById("courseDescription"),
  courseMeta: document.getElementById("courseMeta"),
  courseLevel: document.getElementById("courseLevel"),
  courseDetailProgressBar: document.getElementById("courseDetailProgressBar"),
  courseDetailProgressText: document.getElementById("courseDetailProgressText"),
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

  completeMeta: document.getElementById("completeMeta"),
  repeatBtn: document.getElementById("repeatBtn"),
  continueNextBtn: document.getElementById("continueNextBtn"),
  reviewSessionBtn: document.getElementById("reviewSessionBtn")
};

init();

async function init() {
  try {
    const [dictionary, courses] = await Promise.all([
      fetchJson("./data/dictionary.json"),
      fetchJson("./data/courses.json")
    ]);

    state.dictionary = dictionary;
    state.courses = [...courses].sort(sortCourses);

    loadProgress();
    bindEvents();
    renderHome();
    showScreen("home");
  } catch (error) {
    console.error(error);
    els.subtitle.textContent = "Data error. Check your JSON files.";
  }
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  return response.json();
}

function sortCourses(a, b) {
  const groupSort = (a.group || "").localeCompare(b.group || "");
  if (groupSort !== 0) return groupSort;
  return (a.order || 999) - (b.order || 999);
}

function bindEvents() {
  els.homeBtn.addEventListener("click", () => showScreen("home"));
  els.backFromBrowseBtn.addEventListener("click", () => showScreen("home"));
  els.backToCoursesBtn.addEventListener("click", () => showScreen("browse"));

  els.continueBtn.addEventListener("click", continueLastCourse);
  els.startTodayBtn.addEventListener("click", startToday);
  els.reviewMistakesBtn.addEventListener("click", startMistakeReview);
  els.browseCoursesBtn.addEventListener("click", () => showScreen("browse"));
  els.resetProgressBtn.addEventListener("click", resetProgress);

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => startPractice(button.dataset.mode));
  });

  els.flashcard.addEventListener("click", flipCard);
  els.flipBtn.addEventListener("click", flipCard);
  els.speakBtn.addEventListener("click", speakCurrentGerman);
  els.shuffleBtn.addEventListener("click", shuffleCurrentCourse);
  els.knowBtn.addEventListener("click", markKnown);

  els.repeatBtn.addEventListener("click", repeatCurrentDeck);
  els.continueNextBtn.addEventListener("click", continueToNextCourse);
  els.reviewSessionBtn.addEventListener("click", reviewCurrentSession);
}

function showScreen(screen) {
  els.homeScreen.classList.remove("active");
  els.browseScreen.classList.remove("active");
  els.courseScreen.classList.remove("active");
  els.practiceScreen.classList.remove("active");
  els.completeScreen.classList.remove("active");
  els.bottomBar.classList.add("hidden");

  if (screen === "home") {
    renderHome();
    els.homeScreen.classList.add("active");
    els.homeBtn.classList.add("hidden");
    els.subtitle.textContent = "Small lessons. No chaos.";
  }

  if (screen === "browse") {
    renderBrowse();
    els.browseScreen.classList.add("active");
    els.homeBtn.classList.remove("hidden");
    els.subtitle.textContent = "Progress by course.";
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

  if (screen === "complete") {
    markCourseCompletedIfNeeded();
    renderCompleteScreen();
    els.completeScreen.classList.add("active");
    els.homeBtn.classList.remove("hidden");
    els.subtitle.textContent = "Deck finished.";
  }
}

function renderHome() {
  renderContinuePanel();
  renderReviewButton();
  renderStartTodayButton();
}

function renderBrowse() {
  renderGroupChips();
  renderCourseList();
}

function renderContinuePanel() {
  if (!state.lastCourseId) {
    els.continuePanel.classList.add("hidden");
    return;
  }

  const course = getCourseById(state.lastCourseId);

  if (!course) {
    els.continuePanel.classList.add("hidden");
    return;
  }

  const progress = getCourseProgress(course);

  els.continueTitle.textContent = course.title;
  els.continueMeta.textContent =
    `${progress.statusLabel} · ${progress.knownCount}/${progress.total} known · ${getModeLabel(state.lastMode)}`;

  els.continuePanel.classList.remove("hidden");
}

function renderReviewButton() {
  const count = state.reviewIds.size;

  if (!count) {
    els.reviewMistakesBtn.classList.add("hidden");
    return;
  }

  els.reviewMistakesMeta.textContent = `${count} card${count === 1 ? "" : "s"} waiting`;
  els.reviewMistakesBtn.classList.remove("hidden");
}

function renderStartTodayButton() {
  const course = getStartTodayCourse();

  if (!course) {
    els.startTodayMeta.textContent = "All recommended lessons complete";
    return;
  }

  const progress = getCourseProgress(course);
  els.startTodayMeta.textContent = `${course.title} · ${progress.statusLabel}`;
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
      renderBrowse();
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

  const grouped = groupCourses(courses);

  Object.entries(grouped).forEach(([group, groupCoursesList]) => {
    if (state.activeGroup === "All") {
      const heading = document.createElement("div");
      heading.className = "section-heading";
      heading.innerHTML = `<h2>${group}</h2><span>${groupCoursesList.length}</span>`;
      els.courseList.appendChild(heading);
    }

    groupCoursesList.forEach((course) => {
      els.courseList.appendChild(createCourseRow(course));
    });
  });
}

function groupCourses(courses) {
  return courses.reduce((groups, course) => {
    const group = course.group || "Other";
    if (!groups[group]) groups[group] = [];
    groups[group].push(course);
    return groups;
  }, {});
}

function createCourseRow(course) {
  const button = document.createElement("button");
  const progress = getCourseProgress(course);

  button.className = "course-row";
  button.innerHTML = `
    <div class="course-row-top">
      <div>
        <strong>${course.title}</strong>
        <span>${course.group || "Course"} · ${course.wordIds.length} cards</span>
      </div>
      <span class="mini-pill ${progress.statusClass}">${progress.statusLabel}</span>
    </div>

    <div class="course-row-progress">
      <div class="progress-track">
        <div class="progress-fill" style="width: ${progress.percent}%"></div>
      </div>
      <div class="course-row-progress-meta">
        <span>${progress.knownCount}/${progress.total} known</span>
        <span>${progress.reviewCount} review</span>
      </div>
    </div>
  `;

  button.addEventListener("click", () => openCourse(course.id));
  return button;
}

function getCourseProgress(course) {
  const total = course.wordIds.length;
  const knownCount = course.wordIds.filter((id) => state.knownIds.has(id)).length;
  const reviewCount = course.wordIds.filter((id) => state.reviewIds.has(id)).length;
  const percent = total ? Math.round((knownCount / total) * 100) : 0;

  let statusLabel = "Not Started";
  let statusClass = "status-not-started";

  if (knownCount === total && total > 0 && reviewCount === 0) {
    statusLabel = "Complete";
    statusClass = "status-complete";
  } else if (reviewCount > 0) {
    statusLabel = "Needs Review";
    statusClass = "status-needs-review";
  } else if (knownCount > 0 || isCourseStarted(course.id)) {
    statusLabel = "In Progress";
    statusClass = "status-in-progress";
  }

  return {
    total,
    knownCount,
    reviewCount,
    percent,
    statusLabel,
    statusClass
  };
}

function isCourseStarted(courseId) {
  return Boolean(state.courseProgress[courseId]?.started);
}

function ensureCourseProgress(courseId) {
  if (!courseId) return null;

  if (!state.courseProgress[courseId]) {
    state.courseProgress[courseId] = {
      started: false,
      completed: false,
      lastMode: "de-en",
      lastIndex: 0,
      completedAt: null
    };
  }

  return state.courseProgress[courseId];
}

function continueLastCourse() {
  if (!state.lastCourseId) return;

  const course = getCourseById(state.lastCourseId);
  if (!course) return;

  openCourse(course.id, { showCourseScreen: false });

  const progress = ensureCourseProgress(course.id);
  state.currentMode = progress.lastMode || state.lastMode || "de-en";
  state.currentIndex = clampIndex(progress.lastIndex || 0, state.currentCards.length);
  state.answerVisible = false;
  state.sessionReviewIds = new Set();

  showScreen("practice");
  renderCard();
}

function startToday() {
  const course = getStartTodayCourse();

  if (!course) return;

  openCourse(course.id, { showCourseScreen: false });
  startPractice("de-en");
}

function getStartTodayCourse() {
  return (
    state.courses.find((course) => course.recommended && getCourseProgress(course).statusLabel !== "Complete") ||
    state.courses.find((course) => getCourseProgress(course).statusLabel !== "Complete") ||
    state.courses[0]
  );
}

function startMistakeReview() {
  const reviewCards = [...state.reviewIds]
    .map((id) => state.dictionary.find((entry) => entry.id === id))
    .filter(Boolean);

  if (!reviewCards.length) return;

  state.currentCourse = {
    id: "review-mistakes",
    title: "Review Mistakes",
    group: "Review",
    level: "Practice",
    description: "Cards marked for review.",
    wordIds: reviewCards.map((card) => card.id),
    temporary: true
  };

  state.currentCards = reviewCards;
  state.currentIndex = 0;
  state.answerVisible = false;
  state.currentMode = "de-en";
  state.sessionReviewIds = new Set();

  showScreen("practice");
  renderCard();
}

function openCourse(courseId, options = {}) {
  const { showCourseScreen = true } = options;
  const course = getCourseById(courseId);
  if (!course) return;

  state.currentCourse = course;
  state.currentCards = course.wordIds
    .map((id) => state.dictionary.find((entry) => entry.id === id))
    .filter(Boolean);

  const progress = ensureCourseProgress(course.id);

  state.currentIndex = clampIndex(progress.lastIndex || 0, state.currentCards.length);
  state.answerVisible = false;

  const courseProgress = getCourseProgress(course);

  els.courseTitle.textContent = course.title;
  els.courseDescription.textContent = course.description || "";
  els.courseMeta.textContent = `${course.group || "Course"} · ${course.wordIds.length} cards`;
  els.courseLevel.textContent = course.level || "A1";
  els.courseDetailProgressBar.style.width = `${courseProgress.percent}%`;
  els.courseDetailProgressText.textContent =
    `${courseProgress.knownCount} / ${courseProgress.total} known · ${courseProgress.reviewCount} review`;

  if (showCourseScreen) {
    showScreen("course");
  }
}

function startPractice(mode) {
  state.currentMode = mode;
  state.lastMode = mode;
  state.lastCourseId = state.currentCourse?.id || null;
  state.answerVisible = false;
  state.sessionReviewIds = new Set();

  if (state.currentCourse && !state.currentCourse.temporary) {
    const progress = ensureCourseProgress(state.currentCourse.id);
    progress.started = true;
    progress.lastMode = mode;
    progress.lastIndex = state.currentIndex || 0;
  }

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
  saveCurrentCoursePosition();
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
  const card = getCurrentCard();

  if (card && !state.answerVisible) {
    addCardToReview(card);
  }

  state.answerVisible = !state.answerVisible;
  renderCard();
}

function addCardToReview(card) {
  state.reviewIds.add(card.id);
  state.sessionReviewIds.add(card.id);
  state.knownIds.delete(card.id);
  saveProgress();
}

function markKnown() {
  const card = getCurrentCard();
  if (!card) return;

  state.knownIds.add(card.id);

  if (!state.sessionReviewIds.has(card.id)) {
    state.reviewIds.delete(card.id);
  }

  saveProgress();
  nextCard();
}

function nextCard() {
  if (!state.currentCards.length) return;

  if (state.currentIndex >= state.currentCards.length - 1) {
    state.answerVisible = false;
    saveCurrentCoursePosition();
    showScreen("complete");
    return;
  }

  state.currentIndex += 1;
  state.answerVisible = false;
  saveCurrentCoursePosition();
  renderCard();
}

function markCourseCompletedIfNeeded() {
  if (!state.currentCourse || state.currentCourse.temporary) return;

  const progress = ensureCourseProgress(state.currentCourse.id);

  progress.started = true;
  progress.completed = true;
  progress.lastMode = state.currentMode;
  progress.lastIndex = 0;
  progress.completedAt = new Date().toISOString();

  saveProgress();
}

function renderCompleteScreen() {
  const total = state.currentCards.length;
  const reviewCount = state.sessionReviewIds.size;
  const progress = state.currentCourse && !state.currentCourse.temporary
    ? getCourseProgress(state.currentCourse)
    : null;

  if (progress) {
    els.completeMeta.textContent =
      reviewCount > 0
        ? `${total} cards finished. ${reviewCount} to review. Course is ${progress.percent}% known.`
        : `${total} cards finished. Nothing to review. Suspiciously good.`;
  } else {
    els.completeMeta.textContent =
      reviewCount > 0
        ? `${total} cards finished. ${reviewCount} to review.`
        : `${total} cards finished. Nothing to review.`;
  }

  els.reviewSessionBtn.disabled = reviewCount === 0;
}

function repeatCurrentDeck() {
  state.currentIndex = 0;
  state.answerVisible = false;
  state.sessionReviewIds = new Set();

  if (state.currentCourse && !state.currentCourse.temporary) {
    const progress = ensureCourseProgress(state.currentCourse.id);
    progress.started = true;
    progress.lastMode = state.currentMode;
    progress.lastIndex = 0;
  }

  saveProgress();
  showScreen("practice");
  renderCard();
}

function continueToNextCourse() {
  const nextCourse = getNextCourse();

  if (!nextCourse) {
    showScreen("home");
    return;
  }

  openCourse(nextCourse.id);
}

function reviewCurrentSession() {
  const reviewCards = [...state.sessionReviewIds]
    .map((id) => state.dictionary.find((entry) => entry.id === id))
    .filter(Boolean);

  if (!reviewCards.length) return;

  state.currentCourse = {
    id: "session-review",
    title: "Session Review",
    group: "Review",
    level: "Practice",
    description: "Words flipped during this session.",
    wordIds: reviewCards.map((card) => card.id),
    temporary: true
  };

  state.currentCards = reviewCards;
  state.currentIndex = 0;
  state.answerVisible = false;
  state.currentMode = state.lastMode || "de-en";
  state.sessionReviewIds = new Set();

  showScreen("practice");
  renderCard();
}

function getNextCourse() {
  if (!state.currentCourse) return null;

  const currentIndex = state.courses.findIndex(
    (course) => course.id === state.currentCourse.id
  );

  if (currentIndex === -1) return null;

  return state.courses[currentIndex + 1] || null;
}

function shuffleCurrentCourse() {
  state.currentCards = shuffleArray([...state.currentCards]);
  state.currentIndex = 0;
  state.answerVisible = false;
  saveCurrentCoursePosition();
  renderCard();
}

function saveCurrentCoursePosition() {
  if (!state.currentCourse || state.currentCourse.temporary) return;

  const progress = ensureCourseProgress(state.currentCourse.id);
  progress.started = true;
  progress.lastMode = state.currentMode;
  progress.lastIndex = state.currentIndex;

  state.lastCourseId = state.currentCourse.id;
  state.lastMode = state.currentMode;

  saveProgress();
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

function resetProgress() {
  const confirmed = confirm("Reset all GermanFlash progress on this device?");

  if (!confirmed) return;

  state.knownIds.clear();
  state.reviewIds.clear();
  state.sessionReviewIds.clear();
  state.courseProgress = {};
  state.lastCourseId = null;
  state.lastMode = "de-en";

  localStorage.removeItem("germanflash-progress");

  state.currentIndex = 0;
  state.answerVisible = false;

  renderHome();
  showScreen("home");
}

function saveProgress() {
  localStorage.setItem(
    "germanflash-progress",
    JSON.stringify({
      knownIds: [...state.knownIds],
      reviewIds: [...state.reviewIds],
      courseProgress: state.courseProgress,
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
    state.courseProgress = progress.courseProgress || {};
    state.lastCourseId = progress.lastCourseId || null;
    state.lastMode = progress.lastMode || "de-en";
  } catch {
    state.knownIds = new Set();
    state.reviewIds = new Set();
    state.courseProgress = {};
    state.lastCourseId = null;
    state.lastMode = "de-en";
  }
}

function getCourseById(courseId) {
  return state.courses.find((course) => course.id === courseId);
}

function clampIndex(index, length) {
  if (!length) return 0;
  return Math.max(0, Math.min(index, length - 1));
}

function shuffleArray(array) {
  return array
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}