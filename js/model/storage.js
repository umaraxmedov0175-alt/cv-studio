/**
 * LocalStorage and JSON Import/Export Persistence Engine
 */

import { createSampleEuropeanCV, validateCV, sanitizeCVData } from './cv-schema.js';

const STORAGE_KEY = 'european_cv_studio_v2';
const AUTOSAVE_DELAY = 400; // ms debounce

let debounceTimer = null;
let lastStorageError = null;

export function getLastStorageError() {
  return lastStorageError;
}

export function hasStoredCV() {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY));
  } catch (err) {
    return false;
  }
}

export function loadStoredCV() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return sanitizeCVData(parsed);
      }
    }
  } catch (err) {
    console.warn('[Storage] Failed to read from localStorage:', err);
  }
  return createSampleEuropeanCV();
}

export function saveCVWithStatus(cv) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cv));
    lastStorageError = null;
    return { ok: true, error: null, isQuotaError: false };
  } catch (err) {
    const isQuotaError = Boolean(
      err && (
        err.name === 'QuotaExceededError' ||
        err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        err.code === 22 ||
        err.code === 1014
      )
    );
    const message = isQuotaError
      ? 'Browser storage quota exceeded. Remove or shrink your portrait photo, or download a JSON backup.'
      : (err?.message || 'Could not save CV to browser storage.');
    lastStorageError = { name: err?.name || 'StorageError', message, isQuotaError };
    console.error('[Storage] Save failed:', err);
    return { ok: false, error: message, isQuotaError };
  }
}

export function saveCVDirect(cv) {
  return saveCVWithStatus(cv).ok;
}

export function autoSaveCV(cv, onSavedCallback) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    const status = saveCVWithStatus(cv);
    if (typeof onSavedCallback === 'function') {
      onSavedCallback(new Date(), status);
    }
  }, AUTOSAVE_DELAY);
}

function sanitizeDownloadStem(rawName) {
  if (typeof rawName !== 'string') return '';
  return rawName
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 48);
}

export function exportCVAsJSON(cv) {
  const safeStem = sanitizeDownloadStem(cv?.personal?.lastName);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = safeStem
    ? `${safeStem}_CV_${dateStamp}.json`
    : `european-cv_${dateStamp}.json`;

  const blob = new Blob([JSON.stringify(cv, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
        const validation = validateCV(parsed, { allowDraft: true });
        if (!validation.valid) {
          return reject(new Error('Invalid CV schema: ' + validation.errors.join(', ')));
        }
        resolve(sanitizeCVData(parsed));
      } catch (err) {
        reject(new Error('Invalid JSON file: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
