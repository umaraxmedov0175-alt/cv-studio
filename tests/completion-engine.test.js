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
    assert.equal(res.nextAction.sectionId, 'export', 'All-Star CV recommends export/Job Matcher');
  });

  assert.test('calculateCVCompletion recognizes European decimal comma metrics like 12,5%', () => {
    const cv = createEmptyCV();
    cv.personal.firstName = 'Lukas';
    cv.personal.lastName = 'Weber';
    cv.personal.email = 'lukas@example.de';
    cv.personal.phone = '+49 170 111222';
    cv.personal.title = 'Product Analyst';
    cv.skills.technical = ['SQL', 'Python', 'Tableau'];
    cv.experience = [{
      position: 'Analyst',
      company: 'Data GmbH',
      bullets: ['Steigerung der Conversion-Rate um 12,5% im Checkout']
    }];

    const res = calculateCVCompletion(cv);
    // Identity (10) + Exp (15 + 7 + 10 metric = 32) + Skills (8) = 50%
    assert.equal(res.percentage, 50, `expected 50% with 12,5% metric bonus, got ${res.percentage}%`);
    assert.notOk(res.nextAction.sectionId === 'experience' && res.nextAction.prompt.includes('measurable'),
      'does not ask for a metric when 12,5% is present');
  });

  assert.test('pickNextAction prompts to complete partial identity (7-9/10) and respects maxed skills/languages', () => {
    // 7/10 identity: name (4) + email (3), missing phone/city (2) and title (1)
    const partialId = createEmptyCV();
    partialId.personal.firstName = 'Clara';
    partialId.personal.lastName = 'Bauer';
    partialId.personal.email = 'clara@example.com';
    const resPartial = calculateCVCompletion(partialId);
    assert.equal(resPartial.nextAction.sectionId, 'identity', 'prompts for partial identity');
    assert.ok(resPartial.nextAction.prompt.includes('phone'), 'specifically prompts for missing phone/city/title');

    // Maxed skills (5+) and languages (2+) on a CV with 1 exp & 1 bullet
    const maxedSkillsLangs = createSampleEuropeanCV();
    maxedSkillsLangs.experience = [{
      position: 'Engineer',
      company: 'Acme',
      bullets: ['Reduced build times by 40%']
    }];
    const resMaxed = calculateCVCompletion(maxedSkillsLangs);
    assert.equal(resMaxed.nextAction.sectionId, 'experience', 'prompts for second bullet instead of already-maxed skills/languages');
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
