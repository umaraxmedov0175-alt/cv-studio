/**
 * Job Description ATS Keyword Matcher
 * Parses job descriptions and calculates matching vs missing skills.
 */

const KNOWN_SKILL_KEYWORDS = [
  'typescript', 'javascript', 'react', 'next.js', 'vue', 'angular', 'svelte',
  'node.js', 'express', 'python', 'django', 'fastapi', 'flask',
  'go', 'golang', 'rust', 'c++', 'c#', '.net', 'java', 'spring', 'kotlin', 'swift',
  'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
  'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'cloud', 'terraform',
  'ci/cd', 'git', 'github actions', 'gitlab', 'linux', 'bash',
  'rest', 'graphql', 'grpc', 'microservices', 'distributed systems',
  'figma', 'ui/ux', 'tailwind', 'css', 'html', 'playwright', 'cypress', 'jest',
  'agile', 'scrum', 'jira', 'confluence', 'tdd', 'architecture'
];

export function extractKeywordsFromJob(jobText) {
  if (!jobText || typeof jobText !== 'string') return [];

  // Clean trailing punctuation like sentence periods while preserving internal dots in "node.js" or "next.js"
  const normalized = jobText
    .toLowerCase()
    .replace(/[.,;:!?]+(\s|$)/g, ' $1')
    .replace(/["'()[\]{}]/g, ' ');

  const found = new Set();

  for (const skill of KNOWN_SKILL_KEYWORDS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-z0-9#+])${escaped}([^a-z0-9#+]|$)`, 'i');
    if (regex.test(normalized)) {
      found.add(skill);
    }
  }

  return Array.from(found);
}

export function extractCVKeywords(cv) {
  if (!cv) return new Set();

  const collected = [];

  // Skills
  if (cv.skills?.technical) {
    collected.push(...cv.skills.technical);
  }
  if (cv.skills?.tools) {
    collected.push(...cv.skills.tools);
  }

  // Experience
  if (cv.experience) {
    for (const exp of cv.experience) {
      if (exp.position) collected.push(exp.position);
      if (exp.company) collected.push(exp.company);
      if (exp.technologies) collected.push(...exp.technologies);
      if (exp.bullets) collected.push(...exp.bullets);
    }
  }

  // Summary & Education
  if (cv.summary) collected.push(cv.summary);
  if (cv.education) {
    for (const edu of cv.education) {
      if (edu.degree) collected.push(edu.degree);
      if (edu.thesis) collected.push(edu.thesis);
    }
  }

  const normalizedText = collected.join(' ').toLowerCase();
  const cvKeywords = new Set();

  for (const skill of KNOWN_SKILL_KEYWORDS) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-z0-9#+.])${escaped}([^a-z0-9#+.]|$)`, 'i');
    if (regex.test(normalizedText)) {
      cvKeywords.add(skill);
    }
  }

  return cvKeywords;
}

export function calculateJobMatch(cv, jobText) {
  const targetKeywords = extractKeywordsFromJob(jobText);

  if (targetKeywords.length === 0) {
    return {
      matchPercentage: 0,
      totalKeywords: 0,
      matched: [],
      missing: [],
      recommendations: ['Fügen Sie eine Stellenanzeige ein, um fehlende Keywords zu analysieren.']
    };
  }

  const cvKeywords = extractCVKeywords(cv);
  const matched = [];
  const missing = [];

  for (const kw of targetKeywords) {
    if (cvKeywords.has(kw)) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const matchPercentage = Math.round((matched.length / targetKeywords.length) * 100);

  const recommendations = [];
  if (missing.length > 0) {
    recommendations.push(`Fügen Sie folgende gesuchte Schlüsselbegriffe hinzu: ${missing.slice(0, 5).join(', ')}.`);
  } else {
    recommendations.push('Exzellente Übereinstimmung! Alle identifizierten Schlüsselqualifikationen sind in Ihrem Lebenslauf vorhanden.');
  }

  return {
    matchPercentage,
    totalKeywords: targetKeywords.length,
    matched,
    missing,
    recommendations
  };
}
