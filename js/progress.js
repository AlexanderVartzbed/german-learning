const STORAGE_KEY = 'german-learning-progress';

export function getProgress() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
}

export function saveAttempt(wordId, wasCorrect) {
  const progress = getProgress();
  const current = progress[wordId] || {
    seen: 0,
    correct: 0,
    wrong: 0,
    lastSeen: null,
    mastery: 0
  };

  current.seen += 1;
  if (wasCorrect) current.correct += 1;
  else current.wrong += 1;
  current.lastSeen = new Date().toISOString();
  current.mastery = current.correct / current.seen;

  progress[wordId] = current;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  return current;
}
