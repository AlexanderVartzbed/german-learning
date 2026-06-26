export async function loadDictionary() {
  const response = await fetch('./data/dictionary.json');
  if (!response.ok) throw new Error('Could not load dictionary.json');
  return response.json();
}

export function getDisplayGerman(entry) {
  if (entry.type === 'noun' && entry.article) return `${entry.article} ${entry.word}`;
  return entry.word;
}

export function mapDictionaryById(dictionary) {
  return new Map(dictionary.map(entry => [entry.id, entry]));
}
