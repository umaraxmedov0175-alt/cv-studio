/**
 * Unit Tests for Job Description ATS Keyword Matcher
 */

import { extractKeywordsFromJob, calculateJobMatch } from '../js/engines/job-matcher.js';
import { createSampleGermanCV } from '../js/model/cv-schema.js';

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
  });

  assert.test('calculateJobMatch identifies matched vs missing skills accurately', () => {
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
  });

  assert.test('calculateJobMatch handles empty job text gracefully', () => {
    const cv = createSampleGermanCV();
    const matchResult = calculateJobMatch(cv, '');
    assert.equal(matchResult.matchPercentage, 0, 'empty job gives 0%');
    assert.equal(matchResult.matched.length, 0, 'no matched');
    assert.equal(matchResult.missing.length, 0, 'no missing');
  });
}
