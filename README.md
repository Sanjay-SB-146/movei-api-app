# CinePulse — Movie Search & Discovery Web App

A modern, responsive Movie Search application built with **Vanilla JavaScript (ES6+)**, semantic HTML5, and Modern CSS. Integrated with the public [OMDb API](https://www.omdbapi.com/) to search movies, view high-resolution posters, inspect multi-source ratings, read plot synopses, and manage a personal watchlist.

---

## 🎯 Requirements & Features Implemented

| Requirement | Implementation Details |
| :--- | :--- |
| **Search movies using public API** | Integrated with OMDb API (`s=${query}&page=${page}`). Features debounced live search, enter-to-submit, media type filtering (Movies, Series, Episodes), year filtering, and pagination. |
| **Display posters & details** | Responsive cards with `aspect-ratio: 2/3`, lazy image loading, SVG placeholder fallbacks for missing/broken images, and a comprehensive modal dialog (`<dialog>`) showing Director, Writers, Cast, Full Plot, Box Office, and Awards. |
| **Show ratings & release info** | Multi-source ratings display: IMDb rating (score & votes), Rotten Tomatoes percentage with consensus icon, and color-coded Metascore. Detailed release year, exact date, runtime, and age certification badges (PG-13, R, etc.). |
| **Handle invalid search queries** | Validates against empty inputs, too-short terms (< 2 chars), "Movie not found", "Too many results", network dropouts, and invalid API keys with friendly UI alerts and retry actions. |
| **Responsive user interface** | Mobile-first CSS layout using modern Container Queries (`@container`), Dynamic Viewport Units (`dvh`), fluid typography (`clamp()`), Dark/Light mode toggle, and Grid/List view toggle. |
| **JavaScript Core (ES6+) Focus** | Pure modern JavaScript with modular OOP architecture, `async/await`, `AbortController`, destructuring, arrow functions, and array methods. |

---

## 🚀 Live Demo & How to Run

### Option 1: Using the Built-in Node Server (Recommended)
This repository includes a lightweight zero-dependency Node.js server:

```bash
# 1. Start the local server
npm start

# 2. Open your browser and navigate to:
http://localhost:3000
```

### Option 2: Using Any Static Server
You can serve the folder using any HTTP server:
```bash
# Using Python:
python -m http.server 3000

# Using npx serve:
npx serve .
```

> **Note**: Because ES6 Modules (`import`/`export`) are used for clean code separation, modern browsers require files to be served via HTTP/HTTPS rather than bare `file://` protocol.

---

## 💡 JavaScript Core (ES6+) Highlights for Students

This application serves as a comprehensive reference for modern ES6+ concepts:

### 1. ES6 Modular Classes & OOP
Code is cleanly decoupled across modular ES6 classes:
- [`MovieAPI`](file:///c:/Users/Admin/OneDrive/Desktop/movei-api-app/js/api.js): Handles HTTP requests, query construction, and error normalization.
- [`StorageManager`](file:///c:/Users/Admin/OneDrive/Desktop/movei-api-app/js/storage.js): Manages `localStorage` for watchlist, theme, and search history with safe JSON boundaries.
- [`UIManager`](file:///c:/Users/Admin/OneDrive/Desktop/movei-api-app/js/ui.js): Handles DOM creation, shimmering skeleton placeholders, modal rendering, and non-blocking toast notifications.
- [`MovieApp`](file:///c:/Users/Admin/OneDrive/Desktop/movei-api-app/js/app.js): Central orchestrator managing state, debounced inputs, event delegation, and pagination.

### 2. Async/Await & Fetch with `AbortController`
Prevents race conditions when users type rapidly by aborting previous in-flight HTTP requests:
```javascript
if (this.currentAbortController) {
  this.currentAbortController.abort(); // Cancel previous request
}
this.currentAbortController = new AbortController();

const response = await fetch(url, { signal: this.currentAbortController.signal });
```

### 3. Object & Array Destructuring with Default Values
Extracts nested API properties cleanly without verbose intermediate variables:
```javascript
const {
  Title = 'Untitled',
  Year = 'N/A',
  imdbID = '',
  Type = 'movie',
  Ratings = [],
  Plot = 'No synopsis available.'
} = movieData;
```

### 4. Optional Chaining (`?.`) & Nullish Coalescing (`??`)
Safely extracts nested ratings without throwing `TypeError`:
```javascript
const rtRating = Ratings.find(r => r.Source === 'Rotten Tomatoes')?.Value ?? 'N/A';
```

### 5. Higher-Order Array Methods
Avoids manual `for` loops by leveraging functional methods:
- `.map()` to transform API objects into HTML templates.
- `.filter()` to apply local filters and deduplicate history.
- `.some()` to verify if an item already exists in the Watchlist.
- `.sort()` with `localeCompare()` and numeric year parsing for sorting.

### 6. Template Literals & HTML Sanitization
Uses multi-line template literals for declarative UI rendering, with HTML escaping to prevent XSS.

---

## 🎨 Modern CSS & UI Architecture

1. **Container Queries (`container-type: inline-size` & `@container`)**:
   Movie cards adapt their layout (stacked vs. side-by-side) based on their own container width rather than arbitrary viewport breakpoints.
2. **Aspect Ratio (`aspect-ratio: 2 / 3`)**:
   Eliminates Cumulative Layout Shift (CLS) by reserving exact space for movie posters prior to image download.
3. **Dynamic Viewport Units (`dvh`)**:
   Prevents mobile address bar clipping on iOS Safari and Android Chrome.
4. **Fluid Typography (`clamp()`)**:
   Headings scale dynamically between mobile and desktop screen sizes.
5. **Modern `<dialog>` & Light Dismiss**:
   Uses the native `<dialog closedby="any">` element with `showModal()`, platform `Esc` key handling, and a click-outside backdrop dismissal fallback.

---

## 🔑 OMDb API Key Configuration

The app comes pre-configured with the default working public educational key (`trilogy`).

If you wish to use your own private key:
1. Click the **Settings (gear icon)** in the top-right navbar.
2. Enter your key (get one free at [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx)).
3. Click **Test Connection** to verify it.
4. Click **Save Key** (persisted in `localStorage`).
5. You can toggle **Demo / Offline Mode** in the footer at any time to test with curated offline movie data.

---

## 📁 Project Structure

```
movei-api-app/
├── index.html          # Semantic HTML5, landmarks, accessible modal dialogs
├── package.json        # NPM metadata and start script
├── server.js           # Zero-dependency local Node.js static server
├── README.md           # Documentation and student guide
├── css/
│   └── styles.css      # Modern CSS (tokens, container queries, clamp, dark/light)
└── js/
    ├── config.js       # App configuration, constants, and offline fallback dataset
    ├── storage.js      # Watchlist, search history, theme, and API key storage
    ├── api.js          # OMDb API service with fetch, AbortController, error handling
    ├── ui.js           # DOM rendering, skeleton loaders, modals, and toasts
    └── app.js          # App orchestrator, event delegation, search & filter logic
```
