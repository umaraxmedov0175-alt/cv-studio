# European CV Builder (German Lebenslauf & ATS Engine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

A focused, studio-grade European CV Builder engineered specifically for the DACH (Germany, Austria, Switzerland) and wider European market. Built around German DIN 5008 conventions, CEFR language grading (A1–C2), mandatory formal signature blocks, ATS-first selectable text output, and zero-compromise typography.

---

## File Structure & System Architecture

```text
d:\Codes\agy\
├── index.html                      # Main entrypoint, reactive dual-pane studio layout
├── css/
│   ├── app.css                     # Studio UI styling (dark mode editor, clean controls)
│   ├── print-a4.css                # Precision A4 print/PDF pagination rules & typography
│   └── templates.css               # German Classic (DIN 5008) and Modern European styles
├── js/
│   ├── model/
│   │   ├── cv-schema.js            # European CV schema, DIN 5008 defaults, sample data
│   │   └── storage.js              # LocalStorage persistence, JSON export/import
│   ├── engines/
│   │   ├── ats-scorer.js           # ATS text compliance, keyword density, section check
│   │   └── pdf-exporter.js         # Vector A4 PDF generation with print stylesheets
│   ├── components/
│   │   ├── form-builder.js         # Reactive input forms for all European CV sections
│   │   ├── preview-renderer.js     # Real-time A4 preview renderer
│   │   └── ats-gauge.js            # Live ATS compliance gauge & suggestion panel
│   └── app.js                      # Application coordinator & event bus
├── tests/
│   ├── cv-schema.test.js           # Data model & sample validation tests
│   ├── ats-scorer.test.js          # ATS scoring engine unit tests
│   └── run-tests.html              # In-browser test runner with live reporting
└── README.md                       # Product documentation, DIN 5008 compliance notes
```

---

## Tasks

### Task 1: European CV Data Model & Persistence
- [ ] Define `cv-schema.js` with complete European specifications:
  - Personal details: Name, Professional Title, Email, Phone, Location (City, Country), Birthdate & Nationality (German standard optional), LinkedIn, Portfolio.
  - Photo toggle: Professional headshot support (Bewerbungsfoto) with anti-bias / anonymous application toggle.
  - Work Experience: Company, Role, City/Country, Start/End dates (MM/YYYY), Bullet points, Technologies.
  - Education: Institution, Degree, Field of study, Thesis/Grade (e.g. 1.3 German GPA scale), Dates.
  - Languages: Language name + official CEFR Level (A1, A2, B1, B2, C1, C2, Muttersprache).
  - Hard & Soft Skills categorized.
  - Certifications & Projects.
  - Formal European Declaration & Signature block: Place, Date, Signature line (standard German requirement).
- [ ] Implement `storage.js` for robust auto-saving to `localStorage` and JSON export/import.
- [ ] Write unit tests for schema validation and storage serialization in `tests/cv-schema.test.js`.

### Task 2: ATS Compliance & Analysis Engine
- [ ] Create `ats-scorer.js`:
  - Analyzes presence of standard headings (Berufserfahrung, Ausbildung, Kenntnisse, etc.).
  - Calculates action-verb density and quantifiable achievement metrics (percentages, numbers).
  - Checks for non-parseable elements (tables, nested floating frames) that break standard ATS tools.
  - Generates an actionable 0–100 ATS Score with specific recommendations.
- [ ] Write tests in `tests/ats-scorer.test.js` verifying score calculation and edge cases.

### Task 3: Precision A4 German Lebenslauf & Modern Templates
- [ ] Implement `css/print-a4.css` guaranteeing:
  - Exact 210mm x 297mm A4 geometry.
  - Pure selectable text layer (zero canvas rasterization, OCR-friendly).
  - Clean page-break control (`break-inside: avoid;`).
- [ ] Implement `css/templates.css`:
  - **Template 1: German Classic (DIN 5008)**: Two-column chronological layout, structured dates left, details right, formal Bewerbungsfoto frame, bottom signature block.
  - **Template 2: Modern European (Tech & Executive)**: Sleek header, accent sidebar, clean timeline, skills matrix.
- [ ] Ensure font pairing with high legibility: Inter / Plus Jakarta Sans for body, Geist/Fira Code for technical skills.

### Task 4: Reactive Dual-Pane Builder UI
- [ ] Implement `index.html` and `css/app.css`:
  - Studio workbench: left pane contains accordion section editors; right pane contains a live, scaled A4 sheet preview with zoom controls (Fit, 75%, 100%).
  - Real-time reactivity: every keystroke in the form immediately updates the A4 document preview.
  - Top navigation bar: Template switcher, Sample data loader, Clear, Download PDF, Export/Import JSON.
- [ ] Implement `form-builder.js` and `preview-renderer.js`:
  - Dynamic item addition (add job, add degree, add skill, add language).
  - Drag-and-drop or reorder controls for experiences.
  - Photo upload with local DataURL preview and crop helper.

### Task 5: In-Browser Test Suite & Verification
- [ ] Create `tests/run-tests.html` using a zero-dependency in-browser test runner to execute and verify all unit tests.
- [ ] Verify PDF print fidelity, ATS text selection, and sample loading.
