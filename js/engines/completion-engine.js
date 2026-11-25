/**
 * CV Completion & Strength Scoring Engine
 * Computes weighted readiness percentage (0-100), strength tiers,
 * per-section completeness states, and next-best-action prompts.
 */

const METRIC_REGEX = /\b\d+(\.\d+)?%|\d+\s*(years|months|k|m|€|\$|ms|s|x|\+)/i;

/**
 * Evaluates a CV document and returns weighted completion metrics.
 * Weights: Identity (10), Summary (10), Experience (40), Education (15), Skills & Languages (25).
 */
export function calculateCVCompletion(cv) {
  const safeCV = cv || {};
  const p = safeCV.personal || {};
  const summaryText = (safeCV.summary || '').trim();
  const experiences = Array.isArray(safeCV.experience) ? safeCV.experience : [];
  const education = Array.isArray(safeCV.education) ? safeCV.education : [];
  const techSkills = Array.isArray(safeCV.skills?.technical) ? safeCV.skills.technical.filter(Boolean) : [];
  const languages = Array.isArray(safeCV.skills?.languages) ? safeCV.skills.languages.filter(l => l?.language?.trim()) : [];
  const projects = Array.isArray(safeCV.projects) ? safeCV.projects : [];
  const certifications = Array.isArray(safeCV.certifications) ? safeCV.certifications : [];

  // 1. Identity (10 pts)
  let identityPts = 0;
  if (p.firstName?.trim() && p.lastName?.trim()) identityPts += 4;
  if (p.email?.trim() && p.email.includes('@')) identityPts += 3;
  if (p.phone?.trim() || p.city?.trim()) identityPts += 2;
  if (p.title?.trim()) identityPts += 1;

  // 2. Summary (10 pts)
  let summaryPts = 0;
  if (summaryText.length >= 30) {
    summaryPts = 10;
  } else if (summaryText.length > 0) {
    summaryPts = 5;
  }

  // 3. Experience (40 pts)
  let expPts = 0;
  let hasExpMetrics = false;
  let totalBullets = 0;
  if (experiences.length > 0) {
    expPts += 15;
    totalBullets = experiences.reduce((acc, item) => acc + ((item.bullets || []).filter(Boolean).length), 0);
    if (experiences.length >= 2 || totalBullets >= 3) {
      expPts += 15;
    } else if (totalBullets >= 1) {
      expPts += 7;
    }
    const bulletText = experiences.flatMap(item => item.bullets || []).join(' ');
    if (METRIC_REGEX.test(bulletText)) {
      expPts += 10;
      hasExpMetrics = true;
    }
  }

  // 4. Education (15 pts)
  let eduPts = 0;
  if (education.length > 0) {
    const completeEdu = education.some(e => e.degree?.trim() && e.institution?.trim());
    eduPts = completeEdu ? 15 : 8;
  }

  // 5. Skills & Languages (25 pts combined: 15 tech + 10 lang)
  let techPts = 0;
  if (techSkills.length >= 5) techPts = 15;
  else if (techSkills.length >= 1) techPts = 8;

  let langPts = 0;
  if (languages.length >= 2) langPts = 10;
  else if (languages.length === 1) langPts = 6;

  const percentage = Math.min(100, Math.max(0, identityPts + summaryPts + expPts + eduPts + techPts + langPts));

  let tier = 'Draft Mode';
  if (percentage >= 100) tier = 'All-Star';
  else if (percentage >= 71) tier = 'Recruiter Magnet';
  else if (percentage >= 31) tier = 'Interview Ready';

  const sectionStatus = {
    identity: identityPts >= 9 ? 'complete' : identityPts > 0 ? 'partial' : 'empty',
    summary: summaryPts >= 10 ? 'complete' : summaryPts > 0 ? 'partial' : 'empty',
    experience: expPts >= 35 ? 'complete' : experiences.length > 0 ? 'partial' : 'empty',
    education: eduPts >= 15 ? 'complete' : education.length > 0 ? 'partial' : 'empty',
    skills: techPts >= 15 ? 'complete' : techSkills.length > 0 ? 'partial' : 'empty',
    languages: langPts >= 10 ? 'complete' : languages.length > 0 ? 'partial' : 'empty',
    projects: projects.length > 0 ? 'complete' : 'empty',
    certifications: certifications.length > 0 ? 'complete' : 'empty'
  };

  const nextAction = pickNextAction({
    identityPts,
    experiences,
    hasExpMetrics,
    totalBullets,
    techSkills,
    eduPts,
    summaryPts,
    languages,
    percentage
  });

  return {
    percentage,
    tier,
    sectionStatus,
    nextAction
  };
}

function pickNextAction({ identityPts, experiences, hasExpMetrics, totalBullets, techSkills, eduPts, summaryPts, languages, percentage }) {
  if (identityPts < 7) {
    return { sectionId: 'identity', prompt: 'Add your name, target title, and email (+10%)' };
  }
  if (experiences.length === 0) {
    return { sectionId: 'experience', prompt: 'Add 1 work experience to reach Interview Ready (+40%)' };
  }
  if (techSkills.length < 3) {
    return { sectionId: 'skills', prompt: 'Add core technical skills to lift your ATS match (+15%)' };
  }
  if (!hasExpMetrics) {
    return { sectionId: 'experience', prompt: 'Add a measurable number or % to an achievement (+10%)' };
  }
  if (eduPts < 15) {
    return { sectionId: 'education', prompt: 'Add your university degree or qualification (+15%)' };
  }
  if (summaryPts < 10) {
    return { sectionId: 'summary', prompt: 'Write a crisp 2–3 sentence professional summary (+10%)' };
  }
  if (languages.length < 1) {
    return { sectionId: 'languages', prompt: 'Add spoken languages with CEFR levels (+10%)' };
  }
  if (experiences.length < 2 && totalBullets < 3) {
    return { sectionId: 'experience', prompt: 'Add a second achievement bullet to strengthen your history' };
  }
  if (percentage < 100) {
    return {
      sectionId: techSkills.length < 5 ? 'skills' : 'languages',
      prompt: 'Reach 5+ skills and 2+ CEFR languages for All-Star status'
    };
  }
  return { sectionId: 'export', prompt: 'All-Star CV ready — Download A4 PDF or run Job Matcher' };
}
