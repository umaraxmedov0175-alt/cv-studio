/**
 * LocalStorage and JSON Import/Export Persistence Engine
 */

import { createSampleGermanCV, validateCV } from './cv-schema.js';

const STORAGE_KEY = 'european_cv_studio_v2';
const AUTOSAVE_DELAY = 400; // ms debounce

let debounceTimer = null;

export function loadStoredCV() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.personal) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Storage] Failed to read from localStorage:', err);
  }
  return createSampleGermanCV();
}

export function saveCVDirect(cv) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cv));
    return true;
  } catch (err) {
    console.error('[Storage] Save failed:', err);
    return false;
  }
}

export function autoSaveCV(cv, onSavedCallback) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    saveCVDirect(cv);
    if (typeof onSavedCallback === 'function') {
      onSavedCallback(new Date());
    }
  }, AUTOSAVE_DELAY);
}

export function exportCVAsJSON(cv) {
  const filename = `${(cv.personal?.lastName || 'Candidate')}_CV_${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(cv, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importCVFromJSON(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file selected.'));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const validation = validateCV(parsed);
        if (!validation.valid) {
          return reject(new Error('Invalid CV schema: ' + validation.errors.join(', ')));
        }
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON file: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
