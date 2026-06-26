import { loadDictionary, mapDictionaryById, getDisplayGerman } from './js/dictionary.js';
import { loadCourses, hydrateCourse } from './js/courses.js';
import { buildCard } from './js/flashcards.js';
import { saveAttempt } from './js/progress.js';
import { shuffleArray } from './js/utils.js';

const state = {
  dictionary: [],
  courses: [],
  activeCourse: null,
  activeEntries: [],
  cardIndex: 0,
  isFlipped: false,
  mode: 'de-en'
};

const elements = {
  courseList: document.querySelector('#courseList'),
  courseMeta: document.querySelector('#courseMeta'),
  modeSelect: document.querySelector('#modeSelect'),
  shuffleBtn: document.querySelector('#shuffleBtn'),
  flashcard: document.querySelector('#flashcard'),
  cardFront: document.querySelector('#cardFront'),
  cardBack: document.querySelector('#cardBack'),
  prevBtn: document.querySelector('#prevBtn'),
  flipBtn: document.querySelector('#flipBtn'),
  speakBtn: document.querySelector('#speakBtn'),
  nextBtn: document.querySelector('#nextBtn'),
  wrongBtn: document.querySelector('#wrongBtn'),
  knownBtn: document.querySelector('#knownBtn'),
  statusText: document.querySelector('#statusText')
};

async function init() {
  const [dictionary, rawCourses] = await Promise.all([loadDictionary(), loadCourses()]);
  const dictionaryById = mapDictionaryById(dictionary);

  state.dictionary = dictionary;
  state.courses = rawCourses.map(course => hydrateCourse(course, dictionaryById));

  renderCourses();
  renderCard();
}

function renderCourses() {
  elements.courseList.innerHTML = '';

  state.courses.forEach(course => {
    const button = document.createElement('button');
    button.className = 'course-button';
    if (state.activeCourse?.id === course.id) button.classList.add('active');
    button.innerHTML = `<strong>${course.title}</strong><span>${course.description} · ${course.entries.length} cards</span>`;
    button.addEventListener('click', () => selectCourse(course));
    elements.courseList.appendChild(button);
  });
}

function selectCourse(course) {
  state.activeCourse = course;
  state.activeEntries = [...course.entries];
  state.cardIndex = 0;
  state.isFlipped = false;
  renderCourses();
  renderCard();
}

function renderCard() {
  const entry = state.activeEntries[state.cardIndex];
  const card = buildCard(entry, state.mode, state.isFlipped);

  elements.cardFront.textContent = card.front;
  elements.cardBack.textContent = card.back;

  if (state.activeCourse) {
    elements.courseMeta.innerHTML = `<h2>${state.activeCourse.title}</h2><p>${state.activeCourse.description}</p>`;
    elements.statusText.textContent = `Card ${state.cardIndex + 1} of ${state.activeEntries.length}`;
  } else {
    elements.statusText.textContent = 'No course loaded.';
  }

  const hasCards = state.activeEntries.length > 0;
  elements.prevBtn.disabled = !hasCards;
  elements.flipBtn.disabled = !hasCards;
  elements.speakBtn.disabled = !hasCards;
  elements.nextBtn.disabled = !hasCards;
  elements.wrongBtn.disabled = !hasCards;
  elements.knownBtn.disabled = !hasCards;
}

function flipCard() {
  if (!state.activeEntries.length) return;
  state.isFlipped = !state.isFlipped;
  renderCard();
}

function moveCard(direction) {
  if (!state.activeEntries.length) return;
  state.cardIndex = (state.cardIndex + direction + state.activeEntries.length) % state.activeEntries.length;
  state.isFlipped = false;
  renderCard();
}

function markCard(wasCorrect) {
  const entry = state.activeEntries[state.cardIndex];
  if (!entry) return;
  saveAttempt(entry.id, wasCorrect);
  moveCard(1);
}

function speakCurrentCard() {
  const entry = state.activeEntries[state.cardIndex];
  if (!entry || !('speechSynthesis' in window)) return;

  const utterance = new SpeechSynthesisUtterance(getDisplayGerman(entry));
  utterance.lang = 'de-DE';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function shuffleCurrentCourse() {
  if (!state.activeEntries.length) return;
  state.activeEntries = shuffleArray(state.activeEntries);
  state.cardIndex = 0;
  state.isFlipped = false;
  renderCard();
}

elements.flashcard.addEventListener('click', flipCard);
elements.flipBtn.addEventListener('click', flipCard);
elements.prevBtn.addEventListener('click', () => moveCard(-1));
elements.nextBtn.addEventListener('click', () => moveCard(1));
elements.knownBtn.addEventListener('click', () => markCard(true));
elements.wrongBtn.addEventListener('click', () => markCard(false));
elements.speakBtn.addEventListener('click', speakCurrentCard);
elements.shuffleBtn.addEventListener('click', shuffleCurrentCourse);
elements.modeSelect.addEventListener('change', event => {
  state.mode = event.target.value;
  state.isFlipped = false;
  renderCard();
});

init().catch(error => {
  console.error(error);
  elements.statusText.textContent = 'Something failed to load. Check the console.';
});
