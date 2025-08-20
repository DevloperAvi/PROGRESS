# QuizMaster — User Manual

## Overview
QuizMaster is a local-first quiz application that runs entirely in your browser using `localStorage`. It supports:
- Multiple question types: Multiple Choice (MCQ), True/False (TF), Fill-in-the-blank (FIB).
- Timer per quiz (optional).
- Admin interface to add, edit, import, export questions.
- Local user accounts (demo, password hashed locally).
- History of quiz attempts.

## Quick Start (end users)
1. Open `index.html` in your browser (or host the project on GitHub Pages / Netlify).
2. From the Home screen, choose a category and a quiz title.
3. (Optional) Set a timer and question count, then click **Start Quiz**.
4. Answer questions, navigate with Next / Prev and click **Submit** when done.
5. After submission you can review answers and share your score.

## Quick Start (developers)
- To serve locally: `npx serve` in project root and open `http://localhost:5000`.
- Files of interest:
  - `app.js` (or the main script): quiz logic, storage, UI hooks.
  - `index.html` — structure and UI containers.
  - `styles.css` — site styling.

## Admin features
- Enter the admin key (`QUIZMASTER2025`) to access admin controls.
- From Admin you can:
  - List, search, filter questions.
  - Create new questions (MCQ/TF/FIB).
  - Edit or delete questions.
  - Export questions as JSON (button: Export).
  - Import questions (button: Import) — JSON array of question objects.

### Question object format (JSON)
Each question uses this shape:
```json
{
  "id": "unique-id",
  "title": "Quiz title",
  "category": "Category name",
  "type": "mcq|tf|fib",
  "text": "Question text",
  "options": ["A", "B", "C", "D"],         // only for mcq
  "answer": "A" | "True" | "answer text",
  "expl": "Optional explanation text"
}
```

## Exporting and sharing
- Use **Admin → Export** to download a `questions.json` file of all stored questions.
- To ship a default sample, include a `questions_sample.json` in your project root and link to it from the Home page.

## Removing sample data
If the app shipped with sample questions and you want to clear them:
- In the browser console (or a one-time script), run:
```js
localStorage.removeItem('qm_questions');
localStorage.removeItem('qm_users');
localStorage.removeItem('qm_history');
```
Or set empty values:
```js
localStorage.setItem('qm_questions', JSON.stringify([]));
localStorage.setItem('qm_users', JSON.stringify([]));
localStorage.setItem('qm_history', JSON.stringify({}));
```

## How to add a downloadable manual + JSON to the site
1. Place the `QuizMaster_User_Manual.md` (or `.pdf`) and `questions_sample.json` in your project root.
2. Add simple download links in `index.html`, e.g.:
```html
<div class="downloads">
  <a href="/QuizMaster_User_Manual.md" download class="btn">Download User Manual</a>
  <a href="/questions_sample.json" download class="btn">Download Questions JSON</a>
</div>
```
3. If hosting on GitHub Pages, push these files and the links will work automatically.

## FAQ
**Q:** Will removing sample data break the app?  
**A:** No — the code includes guards. If you remove samples, ensure Admin or import is available to add new questions.

**Q:** Can users import their own quizzes?  
**A:** Yes — Admin → Import accepts a JSON array matching the question object format.

---

If you'd like, I can also generate a PDF version of this manual, or a shorter printable quick-start card (A4). Tell me which format you prefer.
