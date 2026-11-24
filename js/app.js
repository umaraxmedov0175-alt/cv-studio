/**
 * Application Orchestrator & Coordinator
 */

import { loadStoredCV, autoSaveCV, exportCVAsJSON, importCVFromJSON, saveCVDirect } from './model/storage.js';
import { createSampleGermanCV, createEmptyCV, TEMPLATE_IDS } from './model/cv-schema.js';
import { initializeFormBuilder } from './components/form-builder.js';
import { renderCVPreview } from './components/preview-renderer.js';
import { updateATSGauge } from './components/ats-gauge.js';
import { exportCVToPDF } from './engines/pdf-exporter.js';

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
  const accentColorInput = document.getElementById('input-accent-color');
  const autosaveIndicator = document.getElementById('autosave-indicator');

  // Set initial template in dropdown
  if (templateSelect) {
    templateSelect.value = currentCV.meta?.template || TEMPLATE_IDS.GERMAN_DIN;
  }
  if (accentColorInput) {
    accentColorInput.value = currentCV.meta?.accentColor || '#1e3a8a';
  }

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

  // 4. Wire Top Navbar & Controls
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

  // Clear CV
  document.getElementById('btn-clear-cv')?.addEventListener('click', () => {
    if (confirm('Möchten Sie wirklich alle Felder leeren?')) {
      currentCV = createEmptyCV();
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
});

function applyZoom(scale) {
  const sheet = document.getElementById('preview-sheet');
  if (sheet) {
    sheet.style.transform = `scale(${scale})`;
  }
}
