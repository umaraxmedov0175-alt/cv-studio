# European CV Builder (German DIN 5008 & ATS Studio)

A studio-grade, browser-native European CV Builder engineered specifically for the German (DACH) and broader European employment market. Built around strict German DIN 5008 standards, CEFR language levels (A1–C2), mandatory formal signature blocks, and ATS-optimized selectable text output.

---

## Key Features

1. **DIN 5008 Standard Compliance**:
   - Standard 2-column chronological structure (dates left, roles & companies right).
   - German personal details: Geburtsdatum, Geburtsort, Staatsangehörigkeit, Wohnort.
   - Formal Bewerbungsfoto frame (with optional anonymous/anti-bias toggle).
   - German DIN 5008 datum & signature block (`Ort, den DD.MM.YYYY` + signee name).

2. **Real-Time ATS Optimization Engine**:
   - Instant 0–100 scoring with letter grades (A+ to D).
   - Evaluates action-verb density and quantifiable achievement metrics (numbers, %, €).
   - Real-time checklist and actionable recruitment tips drawer.

3. **Multi-Template European Architecture**:
   - **🇩🇪 German Classic (DIN 5008)**: The standard for German corporate, engineering, and enterprise applications.
   - **🇪🇺 Modern European**: Dual-column executive layout with dark accent header.
   - **🇨🇭 Minimal Swiss**: Architectural, typography-driven layout with generous whitespace.

4. **Vector A4 PDF Engine**:
   - Strict 210mm × 297mm A4 geometry (`@page { size: A4 portrait; margin: 0; }`).
   - Pure selectable vector text layer (never blurred, zero canvas rasterization artifacts).
   - Direct print-to-PDF triggered via the navbar button.

5. **Privacy & Offline Persistence**:
   - Zero telemetry, zero server storage.
   - Real-time `localStorage` auto-saving.
   - JSON export & import for saving/loading resumes locally.

---

## Quick Start

Open `index.html` in any modern web browser:

```bash
# Windows
start index.html
```

Or open `tests/run-tests.html` to run the automated unit test suite.
