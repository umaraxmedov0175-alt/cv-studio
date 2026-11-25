/**
 * ATS (Applicant Tracking System) Compliance & Scoring Engine
 * Calibrated for European, UK, and DACH corporate recruitment filters.
 * Default language: English (with multi-language EN/DE/FR action verb & metric support).
 */

import { adaptCVForCountry } from './country-rules.js';

export const ACTION_VERBS = {
  en: [
    'led', 'developed', 'architected', 'optimized', 'reduced', 'increased',
    'implemented', 'built', 'spearheaded', 'automated', 'streamlined', 'managed',
    'designed', 'engineered', 'delivered', 'improved', 'scaled', 'constructed',
    'mentored', 'launched', 'migrated', 'elevated'
  ],
  de: [
    'entwicklung', 'entwickelt', 'leitung', 'geleitet', 'optimierung', 'optimiert',
    'steigerung', 'gesteigert', 'konzeption', 'konzipiert', 'einführung', 'eingeführt',
    'reduzierung', 'reduziert', 'implementierung', 'implementiert', 'aufbau', 'aufgebaut',
    'analyse', 'analysiert', 'automation', 'automatisiert', 'koordination', 'koordiniert'
  ],
  fr: [
    'conçu', 'développé', 'automatisé', 'optimisé', 'réduit', 'déployé',
    'piloté', 'coordonné', 'dirigé', 'géré', 'amélioré', 'réalisé', 'conception'
  ]
};

const ALL_ACTION_VERBS = [...ACTION_VERBS.en, ...ACTION_VERBS.de, ...ACTION_VERBS.fr]
  .map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

export const ACTION_VERB_REGEX = new RegExp(
  `(?:^|[^\\p{L}])(${ALL_ACTION_VERBS.join('|')})(?=$|[^\\p{L}])`,
  'iu'
);

export const METRIC_REGEX = /(?:^|[^\p{L}\d])(?:\d+(?:[.,]\d+)?\s*%|[€$£]\s*\d+(?:[.,]\d+)?(?:\s*(?:k|m|b|mio|bn))?|\d+(?:[.,]\d+)?\s*(?:\+|x(?=$|[^\p{L}\d])|[€$£]|(?:k|m|mio|bn|ms|s|hrs?|hours?|minutes?|seconds?|days?|months?|years?|percent|jahre?n?|monate?n?|tage?n?|prozent|std\.?|ans?|mois|users?|engineers?|developers?|clients?|customers?|teams?|members?|projects?|nutzer|entwickler|kunden|utilisateurs?|ingénieurs?)(?=$|[^\p{L}\d]))|(?!19\d{2}(?=$|[^\p{L}\d])|20\d{2}(?=$|[^\p{L}\d]))\d{2,}(?=$|[^\p{L}\d]))/iu;

const CEFR_LEVEL_REGEX = /^(A[12]|B[12]|C[12]|Native\b)/i;

export function hasActionVerb(text) {
  return typeof text === 'string' && ACTION_VERB_REGEX.test(text);
}

export function hasQuantifiableMetric(text) {
  return typeof text === 'string' && METRIC_REGEX.test(text);
}

function trimStr(val) {
  return typeof val === 'string' ? val.trim() : '';
}

export function analyzeCVForATS(cv) {
  let score = 0;
  const checks = [];
  const suggestions = [];

  if (!cv || typeof cv !== 'object' || Array.isArray(cv) || !cv.personal || typeof cv.personal !== 'object' || Array.isArray(cv.personal)) {
    return {
      score: 0,
      grade: 'F',
      status: 'Critically Incomplete',
      checks: [{ id: 'data', category: 'Contact Information', label: 'Data available', passed: false, points: 0, maxPoints: 20 }],
      suggestions: ['Please provide your contact details (name, email, phone).']
    };
  }

  const targetCountry = trimStr(cv.meta?.targetCountry) || 'DE';
  const adapted = adaptCVForCountry(cv, targetCountry);
  const p = adapted.personal && typeof adapted.personal === 'object' ? adapted.personal : {};

  // 1. Personal & Contact Info (Max: 20 pts)
  let contactPts = 0;
  const firstName = trimStr(p.firstName);
  const lastName = trimStr(p.lastName);
  const email = trimStr(p.email);
  const phone = trimStr(p.phone);
  const city = trimStr(p.city);
  const title = trimStr(p.title);

  if (firstName && lastName) contactPts += 5;
  if (email && email.includes('@')) contactPts += 5;
  if (phone) contactPts += 4;
  if (city) contactPts += 3;
  if (title) contactPts += 3;
  score += contactPts;

  checks.push({
    id: 'contact',
    category: 'Contact Information',
    label: 'Complete Contact & Location Details',
    passed: contactPts >= 17,
    points: contactPts,
    maxPoints: 20
  });

  if (contactPts < 17) {
    suggestions.push('Add your full phone number, target city/country, and a descriptive role title.');
  }

  // 2. Work Experience & Quantifiable Achievements (Max: 30 pts)
  let expPts = 0;
  const experiences = (Array.isArray(adapted.experience) ? adapted.experience : [])
    .filter(e => e && typeof e === 'object' && !Array.isArray(e));
  if (experiences.length > 0) {
    expPts += 10;
    let hasMetrics = false;
    let hasVerbs = false;

    const bullets = experiences
      .flatMap(e => (Array.isArray(e.bullets) ? e.bullets : []))
      .filter(b => typeof b === 'string' && b.trim());
    const bulletText = bullets.join(' ');

    if (bullets.length >= 3) {
      expPts += 8;
    }

    if (hasQuantifiableMetric(bulletText)) {
      expPts += 6;
      hasMetrics = true;
    }

    if (hasActionVerb(bulletText)) {
      expPts += 6;
      hasVerbs = true;
    }

    if (!hasMetrics) {
      suggestions.push('Quantify your achievements with numbers or percentages (e.g., "Reduced latency by 40%").');
    }
    if (!hasVerbs) {
      suggestions.push('Start bullet points with impactful action verbs like "Architected", "Spearheaded", or "Optimized".');
    }
  } else {
    suggestions.push('Add at least one professional work experience or relevant internship.');
  }
  score += expPts;

  checks.push({
    id: 'experience',
    category: 'Work Experience',
    label: 'Experience with Measurable Impact',
    passed: expPts >= 24,
    points: expPts,
    maxPoints: 30
  });

  // 3. Education & Formal Qualification (Max: 15 pts)
  let eduPts = 0;
  const education = (Array.isArray(adapted.education) ? adapted.education : [])
    .filter(e => e && typeof e === 'object' && !Array.isArray(e));
  if (education.length > 0) {
    eduPts += 8;
    const hasDegree = education.some(e => Boolean(trimStr(e.degree)));
    const hasDates = education.some(e => Boolean(trimStr(e.startDate) || trimStr(e.dateRange)));
    if (hasDegree) eduPts += 4;
    if (hasDates) eduPts += 3;
  } else {
    suggestions.push('List your highest degree, university, or vocational training.');
  }
  score += eduPts;

  checks.push({
    id: 'education',
    category: 'Education',
    label: 'Academic Degrees & Institutions',
    passed: eduPts >= 12,
    points: eduPts,
    maxPoints: 15
  });

  // 4. Skills & Language Breakdown with CEFR (Max: 20 pts: up to 12 tech + up to 8 CEFR languages)
  let skillPts = 0;
  const techSkills = (Array.isArray(adapted.skills?.technical) ? adapted.skills.technical : [])
    .filter(s => typeof s === 'string' && s.trim());
  const languages = (Array.isArray(adapted.skills?.languages) ? adapted.skills.languages : [])
    .filter(l => l && typeof l === 'object' && Boolean(trimStr(l.language)));

  if (techSkills.length >= 4) {
    skillPts += 12;
  } else if (techSkills.length > 0) {
    skillPts += 6;
    suggestions.push('List at least 5-8 relevant technical competencies or tools.');
  } else {
    suggestions.push('Add your technical skill competencies and tools.');
  }

  const cefrCount = languages.filter(l => CEFR_LEVEL_REGEX.test(trimStr(l.level))).length;
  let langPts = 0;
  if (languages.length === 0) {
    langPts = 0;
    suggestions.push('Add spoken languages with official CEFR proficiency levels (e.g., B2, C1, Native).');
  } else if (languages.length === 1) {
    langPts = cefrCount >= 1 ? 4 : 2;
    suggestions.push('Add a second language with an official CEFR level (e.g., B2, C1, Native).');
  } else {
    if (cefrCount >= 2) {
      langPts = 8;
    } else if (cefrCount === 1) {
      langPts = 6;
      suggestions.push('Specify official CEFR proficiency levels (A1–C2, Native) for your languages.');
    } else {
      langPts = 4;
      suggestions.push('Specify official CEFR proficiency levels (A1–C2, Native) for your languages.');
    }
  }
  skillPts += langPts;
  score += skillPts;

  checks.push({
    id: 'skills',
    category: 'Skills & Languages',
    label: 'Technical Stack & CEFR Languages',
    passed: skillPts >= 17,
    points: skillPts,
    maxPoints: 20
  });

  // 5. European / Regional Formalities (Max: 15 pts)
  let formalPts = 0;
  const hasName = Boolean(firstName && lastName);
  const sigPlace = trimStr(adapted.signature?.place);
  const sigDate = trimStr(adapted.signature?.date);
  const sigName = trimStr(adapted.signature?.signeeName);
  const hasCandidateIdentity = hasName || Boolean(sigName);
  const hasSubstantiveContent = (hasName || Boolean(email)) && (expPts > 0 || eduPts > 0 || skillPts > 0);

  if (adapted.meta?.includeSignatureBlock) {
    if (hasCandidateIdentity && sigPlace && sigDate) {
      formalPts += 8;
    }
    if (hasCandidateIdentity) {
      formalPts += 7;
    }
  } else if (hasSubstantiveContent) {
    formalPts += adapted.rules?.allowSignatureBlock ? 12 : 15;
  }
  score += formalPts;

  checks.push({
    id: 'formalities',
    category: 'Regional Standards',
    label: 'European Format & Regional Compliance',
    passed: formalPts >= 12,
    points: formalPts,
    maxPoints: 15
  });

  // Determine Grade & Status
  let grade = 'A+';
  let status = 'Excellent for ATS & Hiring Managers';
  if (score < 50) {
    grade = 'D';
    status = 'Needs Significant Optimization';
  } else if (score < 70) {
    grade = 'C';
    status = 'Basic Structure Present';
  } else if (score < 85) {
    grade = 'B';
    status = 'Strong ATS Pass Rate';
  } else if (score < 95) {
    grade = 'A';
    status = 'Well Optimized for European Roles';
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    grade,
    status,
    checks,
    suggestions: suggestions.slice(0, 4) // Top 4 priority actionable suggestions
  };
}
