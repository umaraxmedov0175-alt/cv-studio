/**
 * Unit Tests for Job Description ATS Keyword Matcher
 */

import { extractKeywordsFromJob, calculateJobMatch } from '../js/engines/job-matcher.js';
import { createEmptyCV, createSampleGermanCV } from '../js/model/cv-schema.js';

export function runJobMatcherTests(assert) {
  assert.suite('Job Description ATS Keyword Matcher Tests');

  assert.test('extractKeywordsFromJob extracts relevant technical & professional skills', () => {
    const jobText = `
      Wir suchen einen Senior Software Engineer mit fundierten Kenntnissen in
      TypeScript, React, Docker, Kubernetes und PostgreSQL.
      Erfahrung mit AWS Cloud und CI/CD Pipelines ist erforderlich.
      Fließende Deutsch- und Englischkenntnisse werden vorausgesetzt.
    `;
    const keywords = extractKeywordsFromJob(jobText);
    assert.ok(keywords.includes('typescript'), 'extracted typescript');
    assert.ok(keywords.includes('react'), 'extracted react');
    assert.ok(keywords.includes('docker'), 'extracted docker');
    assert.ok(keywords.includes('kubernetes'), 'extracted kubernetes');
    assert.ok(keywords.includes('postgresql'), 'extracted postgresql');
    assert.ok(keywords.includes('ci/cd'), 'extracted ci/cd');
  });

  assert.test('extractKeywordsFromJob and calculateJobMatch handle special-character skills (C++, C#, .NET, Node.js, Next.js, CI/CD)', () => {
    const jobText = 'Must have production experience with C++, C#, .NET, Node.js, Next.js, and CI/CD.';
    const extracted = extractKeywordsFromJob(jobText);
    for (const expected of ['c++', 'c#', '.net', 'node.js', 'next.js', 'ci/cd']) {
      assert.ok(extracted.includes(expected), `extracted special skill ${expected}`);
    }

    const cv = createEmptyCV();
    cv.skills.technical = ['C++', 'C#', '.NET', 'Node.js', 'Next.js', 'CI/CD'];
    const match = calculateJobMatch(cv, jobText);
    assert.equal(match.matchPercentage, 100, '100% match across all special-character skills');
    assert.equal(match.missing.length, 0, 'zero missing special-character skills');
  });

  assert.test('handles punctuation symmetry for React.js and Node.js. in both CV and job descriptions', () => {
    const cv = createEmptyCV();
    cv.summary = 'Built frontend apps using React.js and backend services with Node.js.';
    cv.skills.technical = ['Vue.js'];

    const jobText = 'Looking for an engineer fluent in React.js, Vue.js, and Node.js.';
    const match = calculateJobMatch(cv, jobText);

    assert.ok(match.matched.includes('react'), 'matched React.js symmetrically');
    assert.ok(match.matched.includes('vue'), 'matched Vue.js symmetrically');
    assert.ok(match.matched.includes('node.js'), 'matched Node.js. symmetrically');
    assert.equal(match.matchPercentage, 100, 'symmetric punctuation yields 100% match');
  });

  assert.test('coalesces go and golang without double counting and filters ambiguous English prose', () => {
    const proseOnly = 'We will go to great lengths in spring 2026 to express interest in swift action and rest easy.';
    const proseKeywords = extractKeywordsFromJob(proseOnly);
    assert.equal(proseKeywords.length, 0, `ambiguous English prose should extract 0 skills, got [${proseKeywords.join(', ')}]`);

    const goAndGolangJob = 'Seeking backend engineer proficient in Go and Golang with RESTful APIs and Spring Boot.';
    const techKeywords = extractKeywordsFromJob(goAndGolangJob);
    assert.equal(techKeywords.filter(k => k === 'go').length, 1, 'go and golang coalesce to single "go" entry');
    assert.ok(techKeywords.includes('rest'), 'RESTful matches rest');
    assert.ok(techKeywords.includes('spring'), 'Spring Boot matches spring');
  });

  assert.test('calculateJobMatch identifies matched vs missing skills and emits 100% match recommendation', () => {
    const cv = createSampleGermanCV(); // Has TypeScript, React, Go, Docker, PostgreSQL, etc.
    const jobText = `
      Required: TypeScript, React, Docker, Rust, Terraform, Kubernetes.
    `;
    const matchResult = calculateJobMatch(cv, jobText);
    assert.ok(matchResult.matched.includes('typescript'), 'typescript is matched');
    assert.ok(matchResult.matched.includes('react'), 'react is matched');
    assert.ok(matchResult.matched.includes('docker'), 'docker is matched');
    assert.ok(matchResult.missing.includes('rust'), 'rust is marked as missing');
    assert.ok(matchResult.missing.includes('terraform'), 'terraform is marked as missing');
    assert.ok(matchResult.matchPercentage > 40 && matchResult.matchPercentage < 90, `match percentage reasonable: ${matchResult.matchPercentage}%`);

    const perfectMatch = calculateJobMatch(cv, 'We need TypeScript, React, and Docker.');
    assert.equal(perfectMatch.matchPercentage, 100, '100% match percentage');
    assert.ok(
      perfectMatch.recommendations[0].includes('Strong match!'),
      `expected 100% match recommendation, got "${perfectMatch.recommendations[0]}"`
    );
  });

  assert.test('calculateJobMatch handles empty job text gracefully', () => {
    const cv = createSampleGermanCV();
    const matchResult = calculateJobMatch(cv, '');
    assert.equal(matchResult.matchPercentage, 0, 'empty job gives 0%');
    assert.equal(matchResult.matched.length, 0, 'no matched');
    assert.equal(matchResult.missing.length, 0, 'no missing');
  });
}
