/**
 * ATS (Applicant Tracking System) Compliance & Scoring Engine
 * Calibrated for European & German corporate recruitment filters.
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
  'designed', 'engineered', 'delivered', 'improved', 'scaled'
];

export function analyzeCVForATS(cv) {
  let score = 0;
  const checks = [];
  const suggestions = [];

  if (!cv || !cv.personal) {
    return {
      score: 0,
      grade: 'F',
      status: 'Kritisch unvollständig',
      checks: [{ label: 'Daten vorhanden', passed: false, points: 0 }],
      suggestions: ['Bitte füllen Sie Ihre Kontaktdaten aus.']
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
    category: 'Kontaktdaten',
    label: 'Vollständige Kontakt- & Adressdaten',
    passed: contactPts >= 17,
    points: contactPts,
    maxPoints: 20
  });

  if (contactPts < 17) {
    suggestions.push('Fügen Sie Ihre vollständige Telefonnummer, Stadt und eine professionelle Berufsbezeichnung hinzu.');
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

    // Check for quantifiable impact (numbers, %, €, $)
    const metricRegex = /\b\d+(\.\d+)?%|\b\d+\s*(jahre|monate|k|m|€|\$|tage|prozent)|\b\d{2,}\b/i;
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
      suggestions.push('Fügen Sie messbare Erfolge hinzu (z. B. "Latenz um 40% reduziert" oder "Team von 5 Entwicklern").');
    }
    if (!hasActionVerbs) {
      suggestions.push('Nutzen Sie prägnante Aktionsverben wie "Konzeptioniert", "Geleitet", "Optimiert" oder "Implementiert".');
    }
  } else {
    suggestions.push('Fügen Sie mindestens eine berufliche Station oder ein Praktikum hinzu.');
  }
  score += expPts;

  checks.push({
    category: 'Berufserfahrung',
    label: 'Erfahrung mit messbaren Resultaten',
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
    const hasDates = education.some(e => e.startDate?.trim() && e.endDate?.trim());
    if (hasDegree) eduPts += 4;
    if (hasDates) eduPts += 3;
  } else {
    suggestions.push('Geben Sie Ihren höchsten Bildungsabschluss oder Ihre Ausbildung an.');
  }
  score += eduPts;

  checks.push({
    category: 'Ausbildung',
    label: 'Bildungsstationen & Abschlüsse',
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
    suggestions.push('Listen Sie mindestens 4-6 relevante Fachkompetenzen oder Technologien auf.');
  } else {
    suggestions.push('Fügen Sie technische Kenntnisse und Fachkompetenzen hinzu.');
  }

  if (languages.length >= 2) {
    const hasCefr = languages.some(l => l.level && (l.level.includes('A') || l.level.includes('B') || l.level.includes('C') || l.level.toLowerCase().includes('mutter')));
    skillPts += hasCefr ? 10 : 7;
  } else if (languages.length === 1) {
    skillPts += 5;
    suggestions.push('Fügen Sie Fremdsprachenkenntnisse mit offiziellem GER/CEFR-Niveau (z. B. B2, C1) hinzu.');
  }
  score += skillPts;

  checks.push({
    category: 'Kompetenzen & Sprachen',
    label: 'Fachkenntnisse & CEFR-Sprachniveau',
    passed: skillPts >= 17,
    points: skillPts,
    maxPoints: 20
  });

  // 5. European / German Formalities (Max: 15 pts)
  let formalPts = 0;
  if (cv.meta?.includeSignatureBlock) {
    if (cv.signature?.place?.trim() && cv.signature?.date?.trim()) formalPts += 8;
    if (cv.signature?.signeeName?.trim() || (cv.personal?.firstName && cv.personal?.lastName)) formalPts += 7;
  } else {
    formalPts += 10; // Neutral if disabled for international
  }
  score += formalPts;

  checks.push({
    category: 'Formale Standards',
    label: 'DIN 5008 Datum- & Signaturblock',
    passed: formalPts >= 12,
    points: formalPts,
    maxPoints: 15
  });

  // Determine Grade & Status
  let grade = 'A+';
  let status = 'Exzellent für ATS & HR';
  if (score < 50) {
    grade = 'D';
    status = 'Verbesserungsbedarf';
  } else if (score < 70) {
    grade = 'C';
    status = 'Grundlegend solide';
  } else if (score < 85) {
    grade = 'B';
    status = 'Gut – Fast marktreif';
  } else if (score < 95) {
    grade = 'A';
    status = 'Sehr gut optimiert';
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    grade,
    status,
    checks,
    suggestions: suggestions.slice(0, 4) // Top 4 priority actionable suggestions
  };
}
