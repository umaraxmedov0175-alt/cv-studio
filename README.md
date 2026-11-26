# European CV Studio

A browser-native, zero-dependency European CV Studio engineered for the German (DACH) and broader European employment market. Combines a 2-pane interactive editor and live WYSIWYG A4 canvas with regional compliance rules, CEFR language proficiency tracking, ATS scoring, job description keyword matching, and selectable vector PDF export.

---

## Key Features

1. **Three Editorial A4 Templates**:
   - **Frankfurt** (`german-din-5008`): German DIN 5008 asymmetric date grid (`32mm` date track), optional portrait photo slot (`Bewerbungsfoto`), per-role skill tags, and formal place/date/signature block.
   - **Zurich** (`minimal-swiss`): Swiss modernist architectural grid with system sans-serif and monospaced typography.
   - **Paris** (`modern-european`): Editorial layout pairing Georgia serif typography with system monospace date margins.

2. **Porcelain Atelier & Dark Mode with 6 Ink Themes**:
   - Tactile **Light** default (`Porcelain Atelier`) and **Dark Mode** workspace toggle (`#btn-theme-toggle`), persisted locally.
   - Six WCAG AA contrast-checked studio ink palettes: **Ultramarine Cobalt**, **Prussian Navy**, **Botanical Emerald**, **Bordeaux Plum**, **Burnt Sienna**, and **Obsidian Slate**.

3. **European Market Compliance & Localization**:
   - **Target Market Rules (`DE`, `UK`, `FR`, `NL`)**:
     - **Germany / DACH (`DE`)**: DIN 5008 format supporting candidate photo, date of birth, nationality, and closing signature block.
     - **United Kingdom & Ireland (`UK`)**: UK Equality Act 2010 anti-bias adaptation (omits photo, date of birth, nationality, and signature block; uses *Employment History* heading).
     - **France (`FR`)**: Compact 1-page executive profile (omits date of birth, nationality, and signature block; photo optional).
     - **Netherlands / Benelux (`NL`)**: Direct achievement-oriented layout (omits nationality and signature block; photo and date of birth optional).
   - **CV Headings Language (`en` / `de` / `fr`)**: Instant switching across **English**, **Deutsch**, and **Français** headings and date labels.
   - **Interactive 7-Pill CEFR Tracker**: Quick selection across **Native**, **C2**, **C1**, **B2**, **B1**, **A2**, and **A1**.

4. **Inline A4 Editing, Coaching & Reordering**:
   - **Direct WYSIWYG Editing**: Click any field on the live A4 sheet (`contenteditable`) to edit in place with bidirectional sync back to the sidebar editor.
   - **Guided Stepper & Reorderable Accordions**: Drag-and-drop or keyboard `↑`/`↓` section reordering, optional **Projects** and **Certifications** sections, and live completion strength tracking.
   - **Impact Bullet Coach**: Built-in EN/DE/FR strong action verbs and quantified X-Y-Z achievement formulas.
   - **Page Fit & Density**: Real-time A4 page budget meter with **Compact**, **Standard**, and **Spacious** spacing modes plus one-click **Auto-fit 1 page**.

5. **ATS Health & Job Keyword Matcher**:
   - Live 0–100 ATS score (`A+`–`D`) evaluating contact completeness, action verbs, quantified metrics, technical skills, CEFR languages, and formatting compliance.
   - Slide-over **Job Match** drawer extracting technical keywords from pasted job descriptions and letting you insert missing skills in one click.

6. **Multi-Page Vector A4 PDF Export & Offline Privacy**:
   - Strict A4 print stylesheet (`@page { size: A4 portrait; margin: 12mm 15mm; }`) producing pure selectable vector text across single-page and multi-page CVs.
   - Zero server storage or telemetry: auto-saved to `localStorage` with portable JSON backup export and import. Portraits are resized/compressed and capped at 180 KB of embedded data to protect browser storage.
   - System font stacks keep both the landing page and editor usable without external font requests.

---

## Running Locally

### Option 1 — Direct `file://` Usage (Zero Server Required)

Open `index.html` directly in your browser (double-click or launch from terminal):

```powershell
start index.html
```

When opened over `file://`, `index.html` automatically loads the classic bundle `js/app.bundle.js` so no CORS errors occur.

### Option 2 — Local HTTP Server (ES Modules)

Serve the project directory over HTTP to load modular ES sources directly from `js/app.js`:

```powershell
python -m http.server 8080
```

Then open `http://localhost:8080/` (or open `http://localhost:8080/tests/run-tests.html` for the interactive test runner).

---

## Development, Bundling & Testing

The app has no runtime package dependencies. Optional development checks use Node.js and npm:

```powershell
npm ci
npx playwright install chromium
npm run test:all
```

This runs the browser unit suite, A4 print checks, accessibility checks, responsive-layout checks, and a desktop visual regression snapshot. GitHub Actions runs the same checks on pushes and pull requests.

Use `npm run build:bundle` to regenerate the file-protocol bundle, or `npm run build` to also generate the standalone artifact.

### Running unit tests from the terminal

`run_tests.ps1` runs `tests/run-tests.html` in headless Chrome or Edge and exits with a non-zero code on failures:

```powershell
powershell -ExecutionPolicy Bypass -File .\run_tests.ps1
```

### Checking print / PDF output

`tests/print-check.ps1` renders `index.html` to PDF in headless Chrome or Edge and asserts each scenario (`sample`, `empty`, `long`) produces a real A4 PDF, fits cleanly on Page 1 for short CVs, and paginates multi-page CVs without clipping:

```powershell
powershell -ExecutionPolicy Bypass -File .\tests\print-check.ps1
```

### Rebuilding the bundle

`index.html` loads `js/app.bundle.js` over `file://` and modular `js/app.js` over HTTP. After modifying any file under `js/`, rebuild the bundle and standalone single-file HTML (`dist/european_cv_builder.html`):

```powershell
npm run build
```

Use `npm run build:bundle` to rebuild only `js/app.bundle.js`.
