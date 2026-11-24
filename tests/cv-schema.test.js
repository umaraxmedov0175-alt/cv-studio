/**
 * Unit Tests for European CV Schema & Validation
 */

import { createEmptyCV, createSampleGermanCV, validateCV, CEFR_LEVELS } from '../js/model/cv-schema.js';

export function runSchemaTests(assert) {
  assert.suite('CV Schema & Model Tests');

  assert.test('createEmptyCV returns correct baseline structure', () => {
    const cv = createEmptyCV();
    assert.ok(cv.meta, 'meta object exists');
    assert.equal(cv.meta.template, 'german-din-5008', 'defaults to German DIN 5008');
    assert.ok(Array.isArray(cv.experience), 'experience is an array');
    assert.ok(Array.isArray(cv.education), 'education is an array');
    assert.ok(cv.signature, 'signature block exists');
  });

  assert.test('createSampleGermanCV contains all mandatory German DIN 5008 fields', () => {
    const cv = createSampleGermanCV();
    assert.equal(cv.personal.firstName, 'Maximilian');
    assert.equal(cv.personal.lastName, 'Schmidt');
    assert.ok(cv.personal.birthDate.length > 0, 'contains birth date');
    assert.ok(cv.personal.nationality.length > 0, 'contains nationality');
    assert.ok(cv.experience.length >= 2, 'contains at least 2 experiences');
    assert.ok(cv.education.length >= 2, 'contains education history');
    assert.ok(cv.signature.place.length > 0, 'contains signature location');
    assert.ok(cv.signature.signeeName.length > 0, 'contains signature signee');
  });

  assert.test('validateCV rejects empty names or invalid emails', () => {
    const invalidCV = createEmptyCV();
    const result1 = validateCV(invalidCV);
    assert.notOk(result1.valid, 'empty CV is invalid');
    assert.ok(result1.errors.length >= 2, 'reports multiple missing fields');

    const validCV = createSampleGermanCV();
    const result2 = validateCV(validCV);
    assert.ok(result2.valid, 'sample German CV is valid');
    assert.equal(result2.errors.length, 0, 'no errors on valid sample');
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
