const state = {
  dictionary: [],
  courses: [],
  currentCourse: null,
  currentCards: [],
  currentIndex: 0,
  currentMode: "de-en",
  answerVisible: false,
  knownIds: new Set(),
  reviewIds: new Set()
};

const els = {
  courseSelect: document.getElementById("courseSelect"),
  modeSelect: document.getElementById("modeSelect"),
  cardCounter: document.getElementById("cardCounter"),
  scoreCounter: document.getElementById("scoreCounter"),
  flashcard: document.getElementById("flashcard"),
  cardQuestion: document.getElementById("cardQuestion"),
  cardAnswer: document.getElementById("cardAnswer"),
  flipBtn: document.getElementById("flipBtn"),
  speakBtn: document.getElementById("speakBtn"),
  knowBtn: document.getElementById("knowBtn"),
  dontKnowBtn: document.getElementById("dontKnowBtn"),
  shuffleBtn: document.getElementById("shuffleBtn"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  resetProgressBtn: document.getElementById("resetProgressBtn"),
  reviewList: document.getElementById("reviewList")
};

init();

async function init() {
  try {
    const [dictionary, courses] = await Promise.all([
      fetchJson("./data/dictionary.json"),
      fetchJson("./data/courses.json")
    ]);

    state.dictionary = dictionary;
    state.courses = courses;

    loadProgress();
    renderCourses();
    selectCourse(courses[0]?.id);
    bindEvents();
  } catch (error) {
    console.error(error);
    els.cardQuestion.textContent = "Could not load GermanFlash.";
    els.cardAnswer.textContent = "Check dictionary.json and courses.json.";
    els.cardAnswer.classList.remove("hidden");
  }
}

async function fetchJson(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }

  return response.json();
}

function bindEvents() {
  els.courseSelect.addEventListener("change", () => {
    selectCourse(els.courseSelect.value);
  });

  els.modeSelect.addEventListener("change", () => {
    state.currentMode = els.modeSelect.value;
    state.answerVisible = false;
    renderCard();
  });

  els.flashcard.addEventListener("click", flipCard);
  els.flipBtn.addEventListener("click", flipCard);
  els.speakBtn.addEventListener("click", speakCurrentGerman);
  els.knowBtn.addEventListener("click", markKnown);
  els.dontKnowBtn.addEventListener("click", markReview);
  els.shuffleBtn.addEventListener("click", shuffleCurrentCourse);
  els.prevBtn.addEventListener("click", previousCard);
  els.nextBtn.addEventListener("click", nextCard);
  els.resetProgressBtn.addEventListener("click", resetProgress);
}

function renderCourses() {
  els.courseSelect.innerHTML = "";

  state.courses.forEach((course) => {
    const option = document.createElement("option");
    option.value = course.id;
    option.textContent = course.title;
    els.courseSelect.appendChild(option);
  });
}

function selectCourse(courseId) {
  const course = state.courses.find((item) => item.id === courseId);

  if (!course) return;

  state.currentCourse = course;
  els.courseSelect.value = course.id;

  state.currentCards = course.wordIds
    .map((id) => state.dictionary.find((entry) => entry.id === id))
    .filter(Boolean);

  state.currentIndex = 0;
  state.answerVisible = false;

  renderCard();
}

function renderCard() {
  const card = getCurrentCard();

  if (!card) {
    els.cardQuestion.textContent = "No cards found.";
    els.cardAnswer.textContent = "";
    els.cardAnswer.classList.add("hidden");
    updateStats();
    return;
  }

  const content = getCardContent(card, state.currentMode);

  els.cardQuestion.textContent = content.question;
  els.cardAnswer.textContent = content.answer;
  els.cardAnswer.classList.toggle("hidden", !state.answerVisible);

  updateStats();
  renderReviewList();
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
      answer: card.article
        ? `${card.article} ${card.word}`
        : "No article for this entry"
    };
  }

  return {
    question: formatGerman(card),
    answer: card.english
  };
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

function nextCard() {
  if (!state.currentCards.length) return;

  state.currentIndex = (state.currentIndex + 1) % state.currentCards.length;
  state.answerVisible = false;
  renderCard();
}

function previousCard() {
  if (!state.currentCards.length) return;

  state.currentIndex =
    (state.currentIndex - 1 + state.currentCards.length) %
    state.currentCards.length;

  state.answerVisible = false;
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

  els.cardCounter.textContent = `Card ${position} / ${total}`;
  els.scoreCounter.textContent = `Known: ${state.knownIds.size} | Review: ${state.reviewIds.size}`;
}

function renderReviewList() {
  const reviewCards = [...state.reviewIds]
    .map((id) => state.dictionary.find((entry) => entry.id === id))
    .filter(Boolean);

  els.reviewList.innerHTML = "";

  if (!reviewCards.length) {
    const li = document.createElement("li");
    li.textContent = "Nothing yet. Suspiciously perfect.";
    els.reviewList.appendChild(li);
    return;
  }

  reviewCards.forEach((card) => {
    const li = document.createElement("li");
    li.textContent = `${formatGerman(card)} — ${card.english}`;
    els.reviewList.appendChild(li);
  });
}

function speakCurrentGerman() {
  const card = getCurrentCard();
  if (!card || !("speechSynthesis" in window)) return;

  const text = formatGerman(card);
  const utterance = new SpeechSynthesisUtterance(text);

  utterance.lang = "de-DE";
  utterance.rate = 0.85;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function saveProgress() {
  const progress = {
    knownIds: [...state.knownIds],
    reviewIds: [...state.reviewIds]
  };

  localStorage.setItem("germanflash-progress", JSON.stringify(progress));
}

function loadProgress() {
  const raw = localStorage.getItem("germanflash-progress");

  if (!raw) return;

  try {
    const progress = JSON.parse(raw);
    state.knownIds = new Set(progress.knownIds || []);
    state.reviewIds = new Set(progress.reviewIds || []);
  } catch {
    state.knownIds = new Set();
    state.reviewIds = new Set();
  }
}

function resetProgress() {
  const confirmed = confirm("Reset all GermanFlash progress?");

  if (!confirmed) return;

  state.knownIds.clear();
  state.reviewIds.clear();

  localStorage.removeItem("germanflash-progress");
  renderCard();
}

function shuffleArray(array) {
  return array
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}