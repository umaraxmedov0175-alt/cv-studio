/**
 * Application Orchestrator & Coordinator
 */

import { loadStoredCV, autoSaveCV, exportCVAsJSON, importCVFromJSON, saveCVDirect } from './model/storage.js';
import { createSampleGermanCV, createEmptyCV, TEMPLATE_IDS } from './model/cv-schema.js';
import { initializeFormBuilder } from './components/form-builder.js';
import { renderCVPreview } from './components/preview-renderer.js';
import { updateATSGauge } from './components/ats-gauge.js';
import { exportCVToPDF } from './engines/pdf-exporter.js';
import { COUNTRY_STANDARDS, adaptCVForCountry } from './engines/country-rules.js';
import { calculateJobMatch } from './engines/job-matcher.js';

let currentCV = null;
let currentZoom = 0.85;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize State
  currentCV = loadStoredCV();

  const formContainer = document.getElementById('form-container');
  const previewSheet = document.getElementById('preview-sheet');
  const atsBadge = document.getElementById('ats-badge');
  const atsDrawer = document.getElementById('ats-drawer');
  const templateSelect = document.getElementById('select-template');
  const countrySelect = document.getElementById('select-country');
  const accentColorInput = document.getElementById('input-accent-color');
  const autosaveIndicator = document.getElementById('autosave-indicator');
  const complianceBannerText = document.getElementById('compliance-note-text');

  // Set initial template & country in dropdowns
  if (templateSelect) {
    templateSelect.value = currentCV.meta?.template || TEMPLATE_IDS.GERMAN_DIN;
  }
  if (countrySelect) {
    countrySelect.value = currentCV.meta?.targetCountry || 'DE';
  }
  if (accentColorInput) {
    accentColorInput.value = currentCV.meta?.accentColor || '#1e3a8a';
  }

  // Update compliance banner note
  const updateComplianceBanner = (code) => {
    const std = COUNTRY_STANDARDS[code] || COUNTRY_STANDARDS.DE;
    if (complianceBannerText) {
      complianceBannerText.innerHTML = `${std.flag} ${std.complianceNote}`;
    }
  };
  updateComplianceBanner(currentCV.meta?.targetCountry || 'DE');

  // 2. Central Update Routine
  const onStateChanged = (newCV) => {
    currentCV = newCV;
    renderCVPreview(currentCV, previewSheet);
    updateATSGauge(currentCV, atsBadge, atsDrawer);

    autoSaveCV(currentCV, (saveTime) => {
      if (autosaveIndicator) {
        autosaveIndicator.textContent = `Gespeichert ${saveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
        autosaveIndicator.style.opacity = '1';
        setTimeout(() => {
          autosaveIndicator.style.opacity = '0.7';
        }, 2000);
      }
    });
  };

  // 3. Mount UI
  initializeFormBuilder(currentCV, formContainer, onStateChanged);
  renderCVPreview(currentCV, previewSheet);
  updateATSGauge(currentCV, atsBadge, atsDrawer);
  applyZoom(currentZoom);

  // 4. Country Selector Listener
  countrySelect?.addEventListener('change', (e) => {
    const code = e.target.value;
    currentCV.meta.targetCountry = code;
    updateComplianceBanner(code);

    // Apply country defaults if switching
    if (code === 'UK' && currentCV.meta.template === TEMPLATE_IDS.GERMAN_DIN) {
      currentCV.meta.template = TEMPLATE_IDS.MODERN_EUROPEAN;
      if (templateSelect) templateSelect.value = TEMPLATE_IDS.MODERN_EUROPEAN;
    }

    onStateChanged(currentCV);
  });

  // 5. Wire Top Navbar & Controls
  templateSelect?.addEventListener('change', (e) => {
    currentCV.meta.template = e.target.value;
    onStateChanged(currentCV);
  });

  accentColorInput?.addEventListener('input', (e) => {
    currentCV.meta.accentColor = e.target.value;
    onStateChanged(currentCV);
  });

  // Load German Sample
  document.getElementById('btn-load-sample')?.addEventListener('click', () => {
    if (confirm('Musterlebenslauf laden? Vorhandene ungespeicherte Eingaben werden überschrieben.')) {
      currentCV = createSampleGermanCV();
      saveCVDirect(currentCV);
      initializeFormBuilder(currentCV, formContainer, onStateChanged);
      onStateChanged(currentCV);
    }
  });

  // Export PDF
  document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
    exportCVToPDF(currentCV);
  });

  // Export JSON
  document.getElementById('btn-export-json')?.addEventListener('click', () => {
    exportCVAsJSON(currentCV);
  });

  // Import JSON
  const importFileInput = document.getElementById('input-import-json');
  document.getElementById('btn-import-json')?.addEventListener('click', () => {
    importFileInput?.click();
  });

  importFileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const imported = await importCVFromJSON(file);
        currentCV = imported;
        saveCVDirect(currentCV);
        initializeFormBuilder(currentCV, formContainer, onStateChanged);
        onStateChanged(currentCV);
        alert('Lebenslauf erfolgreich importiert!');
      } catch (err) {
        alert('Import-Fehler: ' + err.message);
      }
    }
  });

  // ATS Drawer Toggle
  atsBadge?.addEventListener('click', () => {
    atsDrawer?.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (atsDrawer?.classList.contains('active') && !atsDrawer.contains(e.target) && !atsBadge.contains(e.target)) {
      atsDrawer.classList.remove('active');
    }
  });

  // Zoom Controls
  document.getElementById('zoom-in')?.addEventListener('click', () => {
    currentZoom = Math.min(1.4, currentZoom + 0.1);
    applyZoom(currentZoom);
  });

  document.getElementById('zoom-out')?.addEventListener('click', () => {
    currentZoom = Math.max(0.5, currentZoom - 0.1);
    applyZoom(currentZoom);
  });

  document.getElementById('zoom-fit')?.addEventListener('click', () => {
    currentZoom = 0.85;
    applyZoom(currentZoom);
  });

  // 6. Job Matcher Modal Logic
  const jobModal = document.getElementById('job-matcher-modal');
  const btnOpenJobModal = document.getElementById('btn-open-job-matcher');
  const btnCloseJobModal = document.getElementById('btn-close-job-modal');
  const btnAnalyzeJob = document.getElementById('btn-analyze-job');
  const jobInput = document.getElementById('job-description-input');
  const jobResults = document.getElementById('job-analysis-results');
  const jobMatchBadge = document.getElementById('job-match-badge');
  const jobMatchedTags = document.getElementById('job-matched-tags');
  const jobMissingTags = document.getElementById('job-missing-tags');
  const jobMatchRecs = document.getElementById('job-match-recs');

  btnOpenJobModal?.addEventListener('click', () => {
    jobModal.style.display = 'flex';
  });

  btnCloseJobModal?.addEventListener('click', () => {
    jobModal.style.display = 'none';
  });

  jobModal?.addEventListener('click', (e) => {
    if (e.target === jobModal) {
      jobModal.style.display = 'none';
    }
  });

  btnAnalyzeJob?.addEventListener('click', () => {
    const text = jobInput?.value || '';
    if (!text.trim()) {
      alert('Bitte fügen Sie den Text einer Stellenanzeige ein.');
      return;
    }

    const runAnalysis = () => {
      const match = calculateJobMatch(currentCV, text);
      jobResults.style.display = 'block';

      // Badge
      if (jobMatchBadge) {
        jobMatchBadge.textContent = `${match.matchPercentage}% Match`;
        jobMatchBadge.style.color = match.matchPercentage >= 75 ? '#34d399' : (match.matchPercentage >= 50 ? '#fbbf24' : '#f87171');
        jobMatchBadge.style.background = match.matchPercentage >= 75 ? 'rgba(16, 185, 129, 0.2)' : (match.matchPercentage >= 50 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)');
      }

      // Matched
      if (jobMatchedTags) {
        jobMatchedTags.innerHTML = match.matched.length > 0
          ? match.matched.map(m => `<span class="tag-pill-matched">✓ ${m}</span>`).join('')
          : '<span style="font-size: 11px; color: #94a3b8;">Keine Übereinstimmungen bisher.</span>';
      }

      // Missing with 1-click addition
      if (jobMissingTags) {
        jobMissingTags.innerHTML = match.missing.length > 0
          ? match.missing.map(m => `
              <span class="tag-pill-missing" data-add-skill="${m}" title="Klicken, um zu Kenntnissen hinzuzufügen">
                + ${m}
              </span>
            `).join('')
          : '<span style="font-size: 11px; color: #34d399;">Alle gesuchten Keywords vorhanden!</span>';

        // Wire 1-click add
        jobMissingTags.querySelectorAll('[data-add-skill]').forEach(pill => {
          pill.addEventListener('click', () => {
            const skillToAdd = pill.getAttribute('data-add-skill');
            currentCV.skills = currentCV.skills || {};
            currentCV.skills.technical = currentCV.skills.technical || [];
            if (!currentCV.skills.technical.map(s => s.toLowerCase()).includes(skillToAdd)) {
              currentCV.skills.technical.push(skillToAdd);
              const techInput = document.getElementById('f-skills-tech');
              if (techInput) {
                techInput.value = currentCV.skills.technical.join(', ');
              }
              onStateChanged(currentCV);
              runAnalysis(); // Re-run analysis immediately
            }
          });
        });
      }

      // Recommendations
      if (jobMatchRecs) {
        jobMatchRecs.textContent = match.recommendations.join(' ');
      }
    };

    runAnalysis();
  });
});

function applyZoom(scale) {
  const sheet = document.getElementById('preview-sheet');
  if (sheet) {
    sheet.style.transform = `scale(${scale})`;
  }
}
