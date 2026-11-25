/**
 * Unit Tests for Completion Scoring, Section Order & Preview Rendering
 */

import { calculateCVCompletion } from '../js/engines/completion-engine.js';
import { createEmptyCV, createSampleEuropeanCV, DEFAULT_SECTION_ORDER, normalizeSectionOrder } from '../js/model/cv-schema.js';
import { renderCVPreview } from '../js/components/preview-renderer.js';

export function runCompletionEngineTests(assert) {
  assert.suite('Completion Engine & Section Ordering Tests');

  assert.test('calculateCVCompletion scores empty CV at 0% in Draft Mode with identity prompt', () => {
    const emptyCV = createEmptyCV();
    const res = calculateCVCompletion(emptyCV);
    assert.equal(res.percentage, 0, 'empty CV is 0%');
    assert.equal(res.tier, 'Draft Mode', '0% is Draft Mode');
    assert.equal(res.nextAction.sectionId, 'identity', 'prompts for identity first');
  });

  assert.test('calculateCVCompletion assigns Interview Ready tier for partial CV (31-70%)', () => {
    const cv = createEmptyCV();
    cv.personal.firstName = 'Elena';
    cv.personal.lastName = 'Vance';
    cv.personal.email = 'elena@example.com';
    cv.personal.phone = '+49 170 555000';
    cv.personal.title = 'Product Designer';
    cv.summary = 'Product designer with 5 years of experience shaping B2B SaaS tools across Europe.';
    cv.experience = [{
      position: 'Senior Designer',
      company: 'Studio Nord',
      bullets: ['Designed end-to-end onboarding workflows']
    }];
    const res = calculateCVCompletion(cv);
    assert.ok(res.percentage >= 31 && res.percentage <= 70, `expected 31-70%, got ${res.percentage}%`);
    assert.equal(res.tier, 'Interview Ready', 'tier matches Interview Ready');
  });

  assert.test('calculateCVCompletion reaches 100% All-Star on complete European sample CV', () => {
    const sample = createSampleEuropeanCV();
    const res = calculateCVCompletion(sample);
    assert.equal(res.percentage, 100, `sample CV should reach 100%, got ${res.percentage}%`);
    assert.equal(res.tier, 'All-Star', '100% reaches All-Star');
    assert.equal(res.sectionStatus.identity, 'complete');
    assert.equal(res.sectionStatus.experience, 'complete');
    assert.equal(res.sectionStatus.education, 'complete');
    assert.equal(res.sectionStatus.skills, 'complete');
    assert.equal(res.sectionStatus.languages, 'complete');
  });

  assert.test('DEFAULT_SECTION_ORDER and normalizeSectionOrder preserve valid order and append missing core sections', () => {
    assert.ok(Array.isArray(DEFAULT_SECTION_ORDER), 'DEFAULT_SECTION_ORDER exported');
    const custom = ['skills', 'experience', 'summary'];
    const normalized = normalizeSectionOrder(custom);
    assert.equal(normalized[0], 'skills', 'skills comes first');
    assert.equal(normalized[1], 'experience', 'experience comes second');
    assert.equal(normalized[2], 'summary', 'summary comes third');
    assert.ok(normalized.includes('education'), 'missing core section education appended');
    assert.ok(normalized.includes('languages'), 'missing core section languages appended');
  });

  assert.test('renderCVPreview honors custom cv.meta.sectionOrder across templates', () => {
    const cv = createSampleEuropeanCV();
    cv.meta.sectionOrder = ['skills', 'education', 'experience', 'languages', 'summary'];
    const container = document.createElement('div');
    renderCVPreview(cv, container);
    const renderedIds = Array.from(container.querySelectorAll('section.cv-section[data-section-id]'))
      .map(el => el.getAttribute('data-section-id'));
    assert.equal(renderedIds[0], 'skills', 'first rendered section matches custom order skills');
    assert.equal(renderedIds[1], 'education', 'second rendered section matches custom order education');
    assert.equal(renderedIds[2], 'experience', 'third rendered section matches custom order experience');
  });
}
