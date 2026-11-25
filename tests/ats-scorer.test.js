/**
 * Unit Tests for ATS Scoring Engine
 */

import { analyzeCVForATS, hasActionVerb, hasQuantifiableMetric } from '../js/engines/ats-scorer.js';
import { createSampleGermanCV, createEmptyCV } from '../js/model/cv-schema.js';

export function runATSTests(assert) {
  assert.suite('ATS Scoring Engine Tests');

  assert.test('analyzeCVForATS returns low score for empty CV (including zero signature freebies)', () => {
    const emptyCV = createEmptyCV();
    const result = analyzeCVForATS(emptyCV);
    assert.equal(result.score, 0, `empty CV scores 0 (got ${result.score})`);
    assert.equal(result.grade, 'D', 'empty CV gets grade D');
    assert.ok(result.suggestions.length > 0, 'provides actionable suggestions');
  });

  assert.test('analyzeCVForATS guards null, array, and malformed personal inputs safely', () => {
    const nullRes = analyzeCVForATS(null);
    assert.equal(nullRes.score, 0, 'null CV scores 0');
    assert.equal(nullRes.grade, 'F', 'null CV gets grade F');

    const arrRes = analyzeCVForATS([]);
    assert.equal(arrRes.score, 0, 'array CV scores 0');
    assert.equal(arrRes.grade, 'F', 'array CV gets grade F');

    const badPersonal = analyzeCVForATS({ personal: 'not-an-object' });
    assert.equal(badPersonal.score, 0, 'primitive personal scores 0');
    assert.equal(badPersonal.grade, 'F', 'primitive personal gets grade F');
  });

  assert.test('analyzeCVForATS awards high score for comprehensive German sample CV', () => {
    const sample = createSampleGermanCV();
    const result = analyzeCVForATS(sample);
    assert.equal(result.score, 100, `sample CV scores 100 (got ${result.score})`);
    assert.equal(result.grade, 'A+', `sample CV gets grade A+ (got ${result.grade})`);

    const checksPassed = result.checks.filter(c => c.passed).length;
    assert.equal(checksPassed, 5, 'passes all 5 standard category checks');
  });

  assert.test('analyzeCVForATS covers D, C, B, A, and A+ grade boundaries accurately', () => {
    const base = createEmptyCV();
    base.personal.firstName = 'Jane';
    base.personal.lastName = 'Doe';
    base.personal.email = 'jane@example.com';
    base.personal.phone = '+49 170 111';
    base.personal.city = 'Berlin';
    base.personal.title = 'Engineer';
    // Contact = 20, Formalities = 15 -> 35 (D)
    const resD = analyzeCVForATS(base);
    assert.equal(resD.score, 35);
    assert.equal(resD.grade, 'D', 'score < 50 maps to D');

    // Add Education (15) -> 50 (C)
    base.education = [{ degree: 'MSc', institution: 'TU', startDate: '2018' }];
    const resC = analyzeCVForATS(base);
    assert.equal(resC.score, 50);
    assert.equal(resC.grade, 'C', '50 <= score < 70 maps to C');

    // Add Experience (10 + 6 metric + 6 verb = 22; total 72 -> B)
    base.experience = [{
      position: 'Dev',
      company: 'Corp',
      bullets: ['Architected API reducing latency by 30%']
    }];
    const resB = analyzeCVForATS(base);
    assert.equal(resB.score, 72);
    assert.equal(resB.grade, 'B', '70 <= score < 85 maps to B');

    // Add 4 skills (12) + 1 non-CEFR language (2) -> 86 (A)
    base.skills.technical = ['TS', 'React', 'Go', 'SQL'];
    base.skills.languages = [{ language: 'English', level: 'Basic' }];
    const resA = analyzeCVForATS(base);
    assert.equal(resA.score, 86);
    assert.equal(resA.grade, 'A', '85 <= score < 95 maps to A');

    // Upgrade to 3 bullets (+8) + 2 CEFR languages (+6) -> 100 (A+)
    base.experience[0].bullets.push('Developed CI/CD pipelines', 'Mentored 4 engineers');
    base.skills.languages = [
      { language: 'English', level: 'Native / Bilingual' },
      { language: 'German', level: 'C1' }
    ];
    const resAPlus = analyzeCVForATS(base);
    assert.equal(resAPlus.score, 100);
    assert.equal(resAPlus.grade, 'A+', 'score >= 95 maps to A+');
  });

  assert.test('language scoring is strictly monotonic (0 < 1 <= 2 langs) and enforces strict CEFR levels', () => {
    const makeCVWithLangs = (langs) => {
      const cv = createSampleGermanCV();
      cv.skills.languages = langs;
      return analyzeCVForATS(cv).checks.find(c => c.id === 'skills').points;
    };

    const zeroLangs = makeCVWithLangs([]);
    const oneBasic = makeCVWithLangs([{ language: 'German', level: 'Basic' }]);
    const oneCefr = makeCVWithLangs([{ language: 'German', level: 'B2' }]);
    const twoBasic = makeCVWithLangs([
      { language: 'German', level: 'Basic' },
      { language: 'French', level: 'Conversational' }
    ]);
    const twoCefr = makeCVWithLangs([
      { language: 'German', level: 'B2' },
      { language: 'French', level: 'C1' }
    ]);

    assert.equal(zeroLangs, 12, '0 languages awards 12 tech + 0 lang');
    assert.equal(oneBasic, 14, '1 non-CEFR language ("Basic") does not get CEFR bonus (12 + 2)');
    assert.equal(oneCefr, 16, '1 CEFR language awards 12 + 4');
    assert.equal(twoBasic, 16, '2 non-CEFR languages award 12 + 4');
    assert.equal(twoCefr, 20, '2 CEFR languages award full 20');
    assert.ok(zeroLangs < oneBasic && oneBasic < oneCefr && oneCefr <= twoCefr,
      'language scoring is strictly monotonic');
  });

  assert.test('EN/DE/FR action verbs enforce word boundaries and detect European comma decimals', () => {
    assert.notOk(hasActionVerb('Skilled in JavaScript and installed packages'),
      '"skilled" and "installed" must NOT false-match "led"');
    assert.ok(hasActionVerb('Led a cross-functional engineering squad'), 'matches EN verb "Led"');
    assert.ok(hasActionVerb('Entwicklung einer skalierbaren Plattform'), 'matches DE verb "Entwicklung"');
    assert.ok(hasActionVerb('Développé une architecture microservices résiliente'), 'matches FR verb "Développé"');

    assert.ok(hasQuantifiableMetric('Erhöhte Conversion-Rate um 12,5% im Q4'), 'matches European decimal comma 12,5%');
    assert.ok(hasQuantifiableMetric('Saved € 45k annually across 3 teams'), 'matches € 45k');
  });

  assert.test('UK adapted signature awards 15 formalities points while empty DE signature awards 0', () => {
    const ukCV = createSampleGermanCV();
    ukCV.meta.targetCountry = 'UK';
    ukCV.meta.includeSignatureBlock = true; // Should be adapted off by adaptCVForCountry
    const ukRes = analyzeCVForATS(ukCV);
    const ukFormal = ukRes.checks.find(c => c.id === 'formalities');
    assert.equal(ukFormal.points, 15, 'UK CV with substantive content gets full 15 formalities points after adaptation');

    const emptyDE = createEmptyCV();
    emptyDE.meta.targetCountry = 'DE';
    emptyDE.meta.includeSignatureBlock = false;
    const deRes = analyzeCVForATS(emptyDE);
    const deFormal = deRes.checks.find(c => c.id === 'formalities');
    assert.equal(deFormal.points, 0, 'empty DE CV gets 0 formalities points even when includeSignatureBlock is false');
  });
}
