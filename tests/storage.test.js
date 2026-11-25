/**
 * Unit Tests for LocalStorage & JSON Import/Export Persistence Engine
 */

import {
  hasStoredCV,
  loadStoredCV,
  saveCVWithStatus,
  saveCVDirect,
  exportCVAsJSON,
  importCVFromJSON,
  getLastStorageError
} from '../js/model/storage.js';
import { createEmptyCV, createSampleEuropeanCV } from '../js/model/cv-schema.js';

const STORAGE_KEY = 'european_cv_studio_v2';

/**
 * Helper to run importCVFromJSON with deterministic in-process FileReader delivery
 * so headless `--dump-dom` snapshots never race async disk/IPC FileReader tasks.
 */
async function runImportWithText(text, filename = 'test.json') {
  const file = new File([text], filename, { type: 'application/json' });
  const OrigFileReader = window.FileReader;
  window.FileReader = class MockFileReader {
    readAsText() {
      if (typeof this.onload === 'function') {
        this.onload({ target: { result: text } });
      }
    }
  };
  try {
    return await importCVFromJSON(file);
  } finally {
    window.FileReader = OrigFileReader;
  }
}

export function runStorageTests(assert) {
  assert.suite('Storage & JSON Persistence Tests');

  assert.test('hasStoredCV reflects localStorage presence accurately', () => {
    const prev = localStorage.getItem(STORAGE_KEY);
    try {
      localStorage.removeItem(STORAGE_KEY);
      assert.notOk(hasStoredCV(), 'returns false when storage key is absent');

      saveCVDirect(createEmptyCV());
      assert.ok(hasStoredCV(), 'returns true after saving CV');
    } finally {
      if (prev === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, prev);
    }
  });

  assert.test('loadStoredCV falls back cleanly on corrupt JSON', () => {
    const prev = localStorage.getItem(STORAGE_KEY);
    const origWarn = console.warn;
    try {
      console.warn = () => {};
      localStorage.setItem(STORAGE_KEY, '{corrupt json!!!');
      const loaded = loadStoredCV();
      assert.ok(loaded && typeof loaded === 'object', 'returns fallback object');
      assert.equal(loaded.personal.firstName, 'Alexander', 'falls back to sample CV on corrupt JSON');
    } finally {
      console.warn = origWarn;
      if (prev === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, prev);
    }
  });

  assert.test('loadStoredCV sanitizes primitive personal and applies normalizeSectionOrder', () => {
    const prev = localStorage.getItem(STORAGE_KEY);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        meta: {
          sectionOrder: ['skills', 'skills', 'unknown-sec', 'summary']
        },
        personal: 'not-an-object',
        experience: [{ position: 'Dev', bullets: 'not-an-array' }]
      }));

      const loaded = loadStoredCV();
      assert.ok(loaded.personal && typeof loaded.personal === 'object' && !Array.isArray(loaded.personal),
        'primitive personal coerced to plain object');
      assert.equal(loaded.personal.firstName, '', 'personal.firstName defaults to empty string');
      assert.ok(Array.isArray(loaded.experience[0].bullets), 'non-array bullets coerced to array');
      assert.equal(loaded.meta.sectionOrder.filter(s => s === 'skills').length, 1, 'deduplicates sectionOrder');
      assert.notOk(loaded.meta.sectionOrder.includes('unknown-sec'), 'strips unknown sections');
      assert.equal(loaded.meta.sectionOrder[0], 'skills', 'preserves valid first section');
      assert.ok(loaded.meta.sectionOrder.includes('education'), 'appends missing core sections');
    } finally {
      if (prev === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, prev);
    }
  });

  assert.test('saveCVWithStatus and saveCVDirect handle QuotaExceededError safely', () => {
    const prev = localStorage.getItem(STORAGE_KEY);
    const origSetItem = Storage.prototype.setItem;
    const origError = console.error;
    try {
      console.error = () => {};
      Storage.prototype.setItem = function () {
        const err = new Error('Storage quota exceeded');
        err.name = 'QuotaExceededError';
        err.code = 22;
        throw err;
      };

      const cv = createSampleEuropeanCV();
      const status = saveCVWithStatus(cv);
      assert.notOk(status.ok, 'saveCVWithStatus returns ok: false');
      assert.ok(status.isQuotaError, 'flags isQuotaError: true');
      assert.ok(typeof status.error === 'string' && status.error.length > 0, 'provides user-facing quota error message');
      assert.ok(getLastStorageError()?.isQuotaError, 'updates getLastStorageError()');

      const directOk = saveCVDirect(cv);
      assert.equal(directOk, false, 'saveCVDirect returns false on quota error');
    } finally {
      Storage.prototype.setItem = origSetItem;
      console.error = origError;
      if (prev === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, prev);
    }
  });

  assert.test('saveCVWithStatus and saveCVDirect succeed normally and clear last error', () => {
    const prev = localStorage.getItem(STORAGE_KEY);
    try {
      const cv = createSampleEuropeanCV();
      const status = saveCVWithStatus(cv);
      assert.ok(status.ok, 'saveCVWithStatus returns ok: true');
      assert.equal(status.error, null, 'error is null');
      assert.notOk(status.isQuotaError, 'isQuotaError is false');
      assert.equal(getLastStorageError(), null, 'clears getLastStorageError()');
      assert.equal(saveCVDirect(cv), true, 'saveCVDirect returns true');
    } finally {
      if (prev === null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, prev);
    }
  });

  assert.test('exportCVAsJSON sanitizes unsafe characters in filename and uses fallback when blank', () => {
    const origClick = HTMLAnchorElement.prototype.click;
    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;
    const capturedDownloads = [];

    try {
      URL.createObjectURL = () => 'blob:mock-url';
      URL.revokeObjectURL = () => {};
      HTMLAnchorElement.prototype.click = function () {
        capturedDownloads.push(this.download);
      };

      const cvUnsafe = createSampleEuropeanCV();
      cvUnsafe.personal.lastName = '../evil<name>:"/\\|?*';
      exportCVAsJSON(cvUnsafe);

      const cvBlank = createEmptyCV();
      cvBlank.personal.lastName = '   ...   ';
      exportCVAsJSON(cvBlank);

      assert.equal(capturedDownloads.length, 2, 'triggered two export downloads');
      assert.notOk(/[<>:"/\\|?*]/.test(capturedDownloads[0]), 'stripped unsafe filesystem characters');
      assert.notOk(capturedDownloads[0].includes('..'), 'stripped path traversal dots');
      assert.ok(capturedDownloads[0].endsWith('.json'), 'ends with .json');
      assert.ok(capturedDownloads[1].startsWith('european-cv_'), 'falls back to european-cv_ prefix when stem is empty');
    } finally {
      HTMLAnchorElement.prototype.click = origClick;
      URL.createObjectURL = origCreateObjectURL;
      URL.revokeObjectURL = origRevokeObjectURL;
    }
  });

  assert.test('importCVFromJSON rejects invalid JSON', async () => {
    let errMsg = '';
    try {
      await runImportWithText('{not valid json', 'broken.json');
    } catch (err) {
      errMsg = err.message;
    }
    assert.ok(errMsg.includes('Invalid JSON'), `expected Invalid JSON rejection, got "${errMsg}"`);
  });

  assert.test('importCVFromJSON rejects non-string personal fields via schema validation', async () => {
    const badSchema = {
      personal: { firstName: 12345, lastName: 'Doe', email: 'doe@example.com' }
    };
    let errMsg = '';
    try {
      await runImportWithText(JSON.stringify(badSchema), 'bad-schema.json');
    } catch (err) {
      errMsg = err.message;
    }
    assert.ok(errMsg.includes('Invalid CV schema'), `expected schema rejection, got "${errMsg}"`);
  });

  assert.test('importCVFromJSON supports draft partial-CV re-import round-trip', async () => {
    const draft = createEmptyCV();
    draft.personal.city = 'Munich';
    draft.summary = 'Work in progress draft';

    const imported = await runImportWithText(JSON.stringify(draft), 'draft.json');
    assert.equal(imported.personal.firstName, '', 'allows empty firstName on draft re-import');
    assert.equal(imported.personal.city, 'Munich', 'preserves draft city');
    assert.equal(imported.summary, 'Work in progress draft', 'preserves draft summary');
  });

  assert.test('importCVFromJSON rejects unsafe photoUrl via schema validation', async () => {
    const unsafePhoto = {
      personal: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', photoUrl: 'javascript:alert(1)' }
    };
    let errMsg = '';
    try {
      await runImportWithText(JSON.stringify(unsafePhoto), 'unsafe-photo.json');
    } catch (err) {
      errMsg = err.message;
    }
    assert.ok(errMsg.includes('unsafe photo URL'), `expected unsafe photo URL rejection, got "${errMsg}"`);
  });

  assert.test('importCVFromJSON sanitizes malformed non-array bullets, null entries, and non-string fields', async () => {
    const malformed = {
      meta: {
        template: 'evil-template',
        sectionOrder: ['experience', 'experience', 'fake-section']
      },
      personal: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        title: { nested: true },
        photoUrl: ''
      },
      summary: 999,
      experience: [
        null,
        {
          position: 'Mathematician',
          company: 'Analytical Engine',
          bullets: 'not-an-array',
          technologies: ['Math', 42, null]
        }
      ],
      skills: {
        technical: ['Algorithms', 123, null],
        languages: [{ language: 'English', level: 'Native' }, null]
      }
    };

    const imported = await runImportWithText(JSON.stringify(malformed), 'malformed.json');

    assert.equal(imported.meta.template, 'german-din-5008', 'invalid template resets to default');
    assert.equal(imported.personal.title, '', 'non-string title coerced to empty string');
    assert.equal(imported.summary, '', 'non-string summary coerced to empty string');
    assert.equal(imported.experience.length, 1, 'null experience item filtered out');
    assert.ok(Array.isArray(imported.experience[0].bullets), 'non-array bullets coerced to array');
    assert.equal(imported.experience[0].bullets.length, 0, 'invalid bullets string becomes empty array');
    assert.equal(imported.experience[0].technologies.length, 1, 'non-string experience technologies filtered');
    assert.equal(imported.skills.technical.length, 1, 'non-string skills filtered');
    assert.equal(imported.skills.languages.length, 1, 'null language entry filtered');
    assert.notOk(imported.meta.sectionOrder.includes('fake-section'), 'unknown section stripped');
  });
}
