/**
 * Unit Tests for ATS Scoring Engine
 */

import { analyzeCVForATS } from '../js/engines/ats-scorer.js';
import { createSampleGermanCV, createEmptyCV } from '../js/model/cv-schema.js';

export function runATSTests(assert) {
  assert.suite('ATS Scoring Engine Tests');

  assert.test('analyzeCVForATS returns low score for empty CV', () => {
    const emptyCV = createEmptyCV();
    const result = analyzeCVForATS(emptyCV);
    assert.ok(result.score < 30, 'empty CV scores below 30');
    assert.equal(result.grade, 'D', 'empty CV gets grade D');
    assert.ok(result.suggestions.length > 0, 'provides actionable suggestions');
  });

  assert.test('analyzeCVForATS awards high score for comprehensive German sample CV', () => {
    const sample = createSampleGermanCV();
    const result = analyzeCVForATS(sample);
    assert.ok(result.score >= 90, `sample CV scores >= 90 (got ${result.score})`);
    assert.ok(['A', 'A+'].includes(result.grade), `sample CV gets grade A or A+ (got ${result.grade})`);

    const checksPassed = result.checks.filter(c => c.passed).length;
    assert.ok(checksPassed >= 4, 'passes the majority of standard category checks');
  });

  assert.test('analyzeCVForATS accurately identifies action verbs and metrics', () => {
    const cv = createSampleGermanCV();
    // Add custom experience with quantifiable metrics
    cv.experience = [{
      position: 'Senior Architekt',
      company: 'Tech AG',
      bullets: [
        'Leitung eines Teams von 12 Entwicklern und Steigerung des Durchsatzes um 45%.',
        'Implementierung von Kubernetes Microservices mit 99.9% Verfügbarkeit.'
      ]
    }];

    const result = analyzeCVForATS(cv);
    const expCheck = result.checks.find(c => c.category === 'Work Experience' || c.category === 'Berufserfahrung');
    assert.ok(expCheck, 'work experience category checked');
    assert.ok(expCheck.points >= 20, 'awards points for action verbs and quantifiable metrics');
  });
}
