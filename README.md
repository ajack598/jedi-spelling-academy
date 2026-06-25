# Jedi Spelling Academy

A browser-based spelling streak game with a Jedi-inspired theme. The app is fully static, so it can be hosted on GitHub Pages without a build step.

## Project structure

```text
.
├── index.html
├── src
│   ├── app.js
│   ├── styles.css
│   └── words.js
└── .gitignore
```

## Running locally

Open `index.html` directly in a browser, or serve the folder with any static server. For example:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Editing the word list

The vocabulary lives in `src/words.js`. Add or edit entries using this shape:

```js
{
  word: "Accommodate",
  definition: "To provide space or make room for someone or something.",
  example: "The hotel can accommodate two hundred guests."
}
```

## Persistence

Leaderboard data is stored in the browser using `localStorage`, so scores are saved per browser and device.

## Deploying to GitHub Pages

1. Create a new GitHub repository.
2. Upload or commit these files to the repository root.
3. In GitHub, go to **Settings → Pages**.
4. Set the source to your main branch and root folder.
5. Save, then wait for GitHub Pages to publish the site.

## Notes

- No framework or package manager is required.
- Fonts are loaded from Google Fonts in `src/styles.css`.
- The app currently uses inline `onclick` attributes in `index.html` to match the original game behaviour exactly. A future clean-up could move those event bindings fully into `src/app.js`.
