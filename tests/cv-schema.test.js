/**
 * Unit Tests for European CV Schema & Validation
 */

import {
  createEmptyCV,
  createSampleGermanCV,
  validateCV,
  CEFR_LEVELS,
  isSafePhotoUrl,
  sanitizeCVData,
  normalizeSectionOrder
} from '../js/model/cv-schema.js';

export function runSchemaTests(assert) {
  assert.suite('CV Schema & Model Tests');

  assert.test('createEmptyCV returns correct baseline structure and DIN dot date format', () => {
    const cv = createEmptyCV();
    assert.ok(cv.meta, 'meta object exists');
    assert.equal(cv.meta.template, 'german-din-5008', 'defaults to German DIN 5008');
    assert.ok(Array.isArray(cv.experience), 'experience is an array');
    assert.ok(Array.isArray(cv.education), 'education is an array');
    assert.ok(cv.signature, 'signature block exists');
    assert.ok(/^\d{2}\.\d{2}\.\d{4}$/.test(cv.signature.date), `expected DD.MM.YYYY DIN date, got "${cv.signature.date}"`);
  });

  assert.test('createSampleGermanCV contains all mandatory German DIN 5008 fields', () => {
    const cv = createSampleGermanCV();
    assert.equal(cv.personal.firstName, 'Alexander');
    assert.equal(cv.personal.lastName, 'Wright');
    assert.ok(cv.personal.birthDate.length > 0, 'contains birth date');
    assert.ok(cv.personal.nationality.length > 0, 'contains nationality');
    assert.ok(cv.experience.length >= 2, 'contains at least 2 experiences');
    assert.ok(cv.education.length >= 2, 'contains education history');
    assert.ok(cv.signature.place.length > 0, 'contains signature location');
    assert.ok(cv.signature.signeeName.length > 0, 'contains signature signee');
  });

  assert.test('validateCV rejects empty names or invalid emails and accepts allowDraft partial CVs', () => {
    const emptyCV = createEmptyCV();
    const result1 = validateCV(emptyCV);
    assert.notOk(result1.valid, 'empty CV is invalid in strict mode');
    assert.ok(result1.errors.length >= 2, 'reports multiple missing fields');

    const draftResult = validateCV(emptyCV, { allowDraft: true });
    assert.ok(draftResult.valid, 'empty/draft CV is valid when allowDraft: true');

    const draftInvalidEmail = createEmptyCV();
    draftInvalidEmail.personal.email = 'not-an-email';
    assert.notOk(validateCV(draftInvalidEmail, { allowDraft: true }).valid, 'rejects malformed email even in draft mode');

    const validCV = createSampleGermanCV();
    const result2 = validateCV(validCV);
    assert.ok(result2.valid, 'sample German CV is valid');
    assert.equal(result2.errors.length, 0, 'no errors on valid sample');
  });

  assert.test('validateCV handles null, primitive, and non-string personal fields safely without throwing', () => {
    assert.notOk(validateCV(null).valid, 'rejects null');
    assert.notOk(validateCV([]).valid, 'rejects array');
    assert.notOk(validateCV({ personal: 'string' }).valid, 'rejects primitive personal');

    const nonStringCV = {
      personal: {
        firstName: 123,
        lastName: { obj: true },
        email: ['a@b.com'],
        photoUrl: 'javascript:alert(1)'
      }
    };
    const res = validateCV(nonStringCV);
    assert.notOk(res.valid, 'rejects non-string fields and unsafe photoUrl');
    assert.ok(res.errors.length >= 4, 'reports errors for all invalid fields');
  });

  assert.test('isSafePhotoUrl accepts safe URLs/data-URIs and blocks dangerous schemes', () => {
    assert.ok(isSafePhotoUrl(''), 'empty string allowed');
    assert.ok(isSafePhotoUrl('https://example.com/photo.jpg'), 'https allowed');
    assert.ok(isSafePhotoUrl('http://localhost:8080/avatar.png'), 'http allowed');
    assert.ok(isSafePhotoUrl('assets/avatar.png'), 'relative path allowed');
    assert.ok(isSafePhotoUrl('data:image/png;base64,iVBORw0KGgo='), 'data:image/png;base64 allowed');
    assert.ok(isSafePhotoUrl('data:image/jpeg;base64,/9j/4AAQ'), 'data:image/jpeg;base64 allowed');
    assert.ok(isSafePhotoUrl('data:image/webp;base64,UklGRg=='), 'data:image/webp;base64 allowed');

    assert.notOk(isSafePhotoUrl('javascript:alert(1)'), 'blocks javascript:');
    assert.notOk(isSafePhotoUrl('vbscript:msgbox(1)'), 'blocks vbscript:');
    assert.notOk(isSafePhotoUrl('data:text/html,<script>alert(1)</script>'), 'blocks data:text/html');
    assert.notOk(isSafePhotoUrl('data:image/svg+xml;base64,PHN2Zz4='), 'blocks data:image/svg+xml');
    assert.notOk(isSafePhotoUrl('//evil.example.com/x.png'), 'blocks protocol-relative //');
    assert.notOk(isSafePhotoUrl(null), 'rejects non-string');
  });

  assert.test('sanitizeCVData coerces malformed payloads into a safe well-typed CV object', () => {
    const cleanFromNull = sanitizeCVData(null);
    assert.ok(cleanFromNull.personal && typeof cleanFromNull.personal === 'object', 'handles null input');

    const dirty = {
      meta: {
        template: 'unknown-tpl',
        language: 'es',
        targetCountry: 'XX',
        accentColor: 'red;position:fixed',
        spacing: 'giant',
        sectionOrder: ['projects', 'projects', 'bogus', 'summary']
      },
      personal: 'bad-personal',
      summary: 42,
      experience: [null, 'bad-item', { position: 'Dev', bullets: 'not-array', technologies: ['Go', 123] }],
      education: [null, { degree: 'BSc', institution: 999 }],
      skills: {
        technical: ['TS', 42, ''],
        languages: [null, { language: 'German', level: 'C1' }]
      },
      certifications: [{ name: 'AWS', year: 2024 }],
      projects: 'not-array'
    };

    const sanitized = sanitizeCVData(dirty);
    assert.equal(sanitized.meta.template, 'german-din-5008', 'resets invalid template');
    assert.equal(sanitized.meta.language, 'en', 'resets invalid language');
    assert.equal(sanitized.meta.targetCountry, 'DE', 'resets invalid country');
    assert.equal(sanitized.meta.accentColor, '#2b3fe8', 'resets invalid CSS color');
    assert.equal(sanitized.meta.spacing, 'normal', 'resets invalid spacing');
    assert.equal(sanitized.summary, '', 'coerces non-string summary');
    assert.equal(sanitized.experience.length, 1, 'drops null/primitive experience items');
    assert.ok(Array.isArray(sanitized.experience[0].bullets), 'coerces non-array bullets to array');
    assert.equal(sanitized.experience[0].technologies.length, 1, 'filters non-string technologies');
    assert.equal(sanitized.education.length, 1, 'drops null education items');
    assert.equal(sanitized.education[0].institution, '', 'coerces non-string institution');
    assert.equal(sanitized.skills.technical.length, 1, 'filters non-string/empty technical skills');
    assert.equal(sanitized.skills.languages.length, 1, 'filters null language entries');
    assert.equal(sanitized.certifications[0].year, '2024', 'coerces numeric cert year to string');
    assert.ok(Array.isArray(sanitized.projects) && sanitized.projects.length === 0, 'coerces non-array projects');
  });

  assert.test('normalizeSectionOrder deduplicates, strips unknown IDs, and guarantees core sections', () => {
    const normalized = normalizeSectionOrder(['projects', 'skills', 'skills', 'bogus', 'summary', 'projects']);
    assert.equal(normalized[0], 'projects', 'keeps first valid optional section');
    assert.equal(normalized[1], 'skills', 'keeps skills once');
    assert.equal(normalized[2], 'summary', 'keeps summary');
    assert.equal(normalized.filter(id => id === 'skills').length, 1, 'no duplicate skills');
    assert.equal(normalized.filter(id => id === 'projects').length, 1, 'no duplicate projects');
    assert.notOk(normalized.includes('bogus'), 'strips unknown section id');
    assert.ok(normalized.includes('experience'), 'appends missing core experience');
    assert.ok(normalized.includes('education'), 'appends missing core education');
    assert.ok(normalized.includes('languages'), 'appends missing core languages');
  });

  assert.test('CEFR_LEVELS contains standard European levels', () => {
    const codes = CEFR_LEVELS.map(l => l.code);
    assert.ok(codes.includes('native'), 'includes native');
    assert.ok(codes.includes('C2'), 'includes C2');
    assert.ok(codes.includes('C1'), 'includes C1');
    assert.ok(codes.includes('B2'), 'includes B2');
    assert.ok(codes.includes('A1'), 'includes A1');
  });
}
