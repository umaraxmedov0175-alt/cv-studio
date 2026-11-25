/**
 * ATS (Applicant Tracking System) Compliance & Scoring Engine
 * Calibrated for European, UK, and DACH corporate recruitment filters.
 * Default language: English (with multi-language action verb support).
 */

const GERMAN_ACTION_VERBS = [
  'entwicklung', 'entwickelt', 'leitung', 'geleitet', 'optimierung', 'optimiert',
  'steigerung', 'gesteigert', 'konzeption', 'konzipiert', 'einführung', 'eingeführt',
  'reduzierung', 'reduziert', 'implementierung', 'implementiert', 'aufbau', 'aufgebaut',
  'analyse', 'analysiert', 'automation', 'automatisiert', 'koordination', 'koordiniert'
];

const ENGLISH_ACTION_VERBS = [
  'led', 'developed', 'architected', 'optimized', 'reduced', 'increased',
  'implemented', 'built', 'spearheaded', 'automated', 'streamlined', 'managed',
  'designed', 'engineered', 'delivered', 'improved', 'scaled', 'constructed'
];

export function analyzeCVForATS(cv) {
  let score = 0;
  const checks = [];
  const suggestions = [];

  if (!cv || !cv.personal) {
    return {
      score: 0,
      grade: 'F',
      status: 'Critically Incomplete',
      checks: [{ id: 'data', category: 'Contact Information', label: 'Data available', passed: false, points: 0 }],
      suggestions: ['Please provide your contact details (name, email, phone).']
    };
  }

  // 1. Personal & Contact Info (Max: 20 pts)
  let contactPts = 0;
  if (cv.personal.firstName?.trim() && cv.personal.lastName?.trim()) contactPts += 5;
  if (cv.personal.email?.trim() && cv.personal.email.includes('@')) contactPts += 5;
  if (cv.personal.phone?.trim()) contactPts += 4;
  if (cv.personal.city?.trim()) contactPts += 3;
  if (cv.personal.title?.trim()) contactPts += 3;
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
  const experiences = cv.experience || [];
  if (experiences.length > 0) {
    expPts += 10;
    let hasBullets = false;
    let hasMetrics = false;
    let hasActionVerbs = false;

    const allText = experiences
      .flatMap(e => [...(e.bullets || []), e.position || '', e.company || ''])
      .join(' ')
      .toLowerCase();

    // Check for bullets
    const totalBullets = experiences.reduce((acc, cur) => acc + (cur.bullets?.length || 0), 0);
    if (totalBullets >= 3) {
      expPts += 8;
      hasBullets = true;
    }

    // Check for quantifiable impact (numbers, %, €, $, k, m)
    const metricRegex = /\b\d+(\.\d+)?%|\b\d+\s*(years|months|jahre|monate|k|m|€|\$|days|percent|tage|prozent)|\b\d{2,}\b/i;
    if (metricRegex.test(allText)) {
      expPts += 6;
      hasMetrics = true;
    }

    // Check for action verbs
    const matchesGerman = GERMAN_ACTION_VERBS.some(v => allText.includes(v));
    const matchesEnglish = ENGLISH_ACTION_VERBS.some(v => allText.includes(v));
    if (matchesGerman || matchesEnglish) {
      expPts += 6;
      hasActionVerbs = true;
    }

    if (!hasMetrics) {
      suggestions.push('Quantify your achievements with numbers or percentages (e.g., "Reduced latency by 40%").');
    }
    if (!hasActionVerbs) {
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
  const education = cv.education || [];
  if (education.length > 0) {
    eduPts += 8;
    const hasDegree = education.some(e => e.degree?.trim());
    const hasDates = education.some(e => (e.startDate?.trim() || e.dateRange?.trim()));
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

  // 4. Skills & Language Breakdown with CEFR (Max: 20 pts)
  let skillPts = 0;
  const techSkills = cv.skills?.technical || [];
  const languages = cv.skills?.languages || [];

  if (techSkills.length >= 4) {
    skillPts += 10;
  } else if (techSkills.length > 0) {
    skillPts += 5;
    suggestions.push('List at least 5-8 relevant technical competencies or tools.');
  } else {
    suggestions.push('Add your technical skill competencies and tools.');
  }

  if (languages.length >= 2) {
    const hasCefr = languages.some(l => l.level && (l.level.includes('A') || l.level.includes('B') || l.level.includes('C') || l.level.toLowerCase().includes('native') || l.level.toLowerCase().includes('mutter')));
    skillPts += hasCefr ? 10 : 7;
  } else if (languages.length === 1) {
    skillPts += 5;
    suggestions.push('Add language competencies with official CEFR proficiency levels (e.g., B2, C1, Native).');
  } else {
    // If languages aren't in array, give baseline if technical skills are comprehensive
    if (techSkills.length >= 6) skillPts += 8;
  }
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
  if (cv.meta?.includeSignatureBlock) {
    if (cv.signature?.place?.trim() && cv.signature?.date?.trim()) formalPts += 8;
    if (cv.signature?.signeeName?.trim() || (cv.personal?.firstName && cv.personal?.lastName)) formalPts += 7;
  } else {
    formalPts += 15; // UK Anti-bias or clean executive layout
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
