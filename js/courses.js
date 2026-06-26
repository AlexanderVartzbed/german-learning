export async function loadCourses() {
  const response = await fetch('./data/courses.json');
  if (!response.ok) throw new Error('Could not load courses.json');
  return response.json();
}

export function hydrateCourse(course, dictionaryById) {
  return {
    ...course,
    entries: course.wordIds
      .map(id => dictionaryById.get(id))
      .filter(Boolean)
  };
}
