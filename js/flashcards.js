import { getDisplayGerman } from './dictionary.js';

export function buildCard(entry, mode, isFlipped) {
  if (!entry) {
    return { front: 'No card', back: 'Select a course first.' };
  }

  if (mode === 'en-de') {
    return isFlipped
      ? { front: entry.english, back: getDisplayGerman(entry) }
      : { front: entry.english, back: 'Click to reveal German' };
  }

  if (mode === 'article') {
    const answer = entry.type === 'noun' ? `${entry.article} ${entry.word}` : 'This card is not a noun.';
    return isFlipped
      ? { front: entry.word, back: answer }
      : { front: entry.word, back: 'Which article: der, die, or das?' };
  }

  return isFlipped
    ? { front: getDisplayGerman(entry), back: entry.english }
    : { front: getDisplayGerman(entry), back: 'Click to reveal English' };
}
