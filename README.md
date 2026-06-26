# German Learning

A static German learning app for kids, designed for GitHub + Netlify.

## Project idea

The dictionary is the source of truth. Courses only reference dictionary IDs. This keeps vocabulary clean and reusable across flashcards, quizzes, typing practice, listening practice, and future games.

## Structure

```txt
index.html
style.css
app.js
data/
  dictionary.json
  courses.json
  grammar.json
js/
  dictionary.js
  courses.js
  flashcards.js
  quiz.js
  progress.js
  utils.js
assets/
  audio/
  images/
```

## Local testing

Because the app uses `fetch()` to load JSON files, run it with a local server instead of opening `index.html` directly.

```bash
python3 -m http.server 8888
```

Then open:

```txt
http://localhost:8888
```

## Netlify

Publish directory: `/`

No build command is needed.
