/**
 * CV Completion & Strength Scoring Engine
 * Computes weighted readiness percentage (0-100), strength tiers,
 * per-section completeness states, and next-best-action prompts.
 */

import { hasQuantifiableMetric } from './ats-scorer.js';

function cleanStr(val) {
  return typeof val === 'string' ? val.trim() : '';
}

/**
 * Evaluates a CV document and returns weighted completion metrics.
 * Weights: Identity (10), Summary (10), Experience (40), Education (15), Skills & Languages (25).
 */
export function calculateCVCompletion(cv) {
  const safeCV = cv && typeof cv === 'object' && !Array.isArray(cv) ? cv : {};
  const p = safeCV.personal && typeof safeCV.personal === 'object' && !Array.isArray(safeCV.personal)
    ? safeCV.personal
    : {};
  const summaryText = cleanStr(safeCV.summary);
  const experiences = (Array.isArray(safeCV.experience) ? safeCV.experience : [])
    .filter(item => item && typeof item === 'object' && !Array.isArray(item));
  const education = (Array.isArray(safeCV.education) ? safeCV.education : [])
    .filter(item => item && typeof item === 'object' && !Array.isArray(item));
  const techSkills = (Array.isArray(safeCV.skills?.technical) ? safeCV.skills.technical : [])
    .filter(s => typeof s === 'string' && s.trim());
  const languages = (Array.isArray(safeCV.skills?.languages) ? safeCV.skills.languages : [])
    .filter(l => l && typeof l === 'object' && Boolean(cleanStr(l.language)));
  const projects = (Array.isArray(safeCV.projects) ? safeCV.projects : [])
    .filter(item => item && typeof item === 'object' && !Array.isArray(item));
  const certifications = (Array.isArray(safeCV.certifications) ? safeCV.certifications : [])
    .filter(item => item && typeof item === 'object' && !Array.isArray(item));

  // 1. Identity (10 pts)
  let identityPts = 0;
  if (cleanStr(p.firstName) && cleanStr(p.lastName)) identityPts += 4;
  if (cleanStr(p.email).includes('@')) identityPts += 3;
  if (cleanStr(p.phone) || cleanStr(p.city)) identityPts += 2;
  if (cleanStr(p.title)) identityPts += 1;

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
    const allBullets = experiences.flatMap(item =>
      (Array.isArray(item.bullets) ? item.bullets : [])
        .filter(b => typeof b === 'string' || typeof b === 'number')
        .map(b => String(b).trim())
        .filter(Boolean)
    );
    totalBullets = allBullets.length;
    if (experiences.length >= 2 || totalBullets >= 3) {
      expPts += 15;
    } else if (totalBullets >= 1) {
      expPts += 7;
    }
    const bulletText = allBullets.join(' ');
    if (hasQuantifiableMetric(bulletText)) {
      expPts += 10;
      hasExpMetrics = true;
    }
  }

  // 4. Education (15 pts)
  let eduPts = 0;
  if (education.length > 0) {
    const completeEdu = education.some(e => Boolean(cleanStr(e.degree) && cleanStr(e.institution)));
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

  const completeExp = experiences.some(e =>
    Boolean(cleanStr(e.position) && cleanStr(e.company) && Array.isArray(e.bullets) && e.bullets.some(b => cleanStr(String(b))))
  );

  const sectionStatus = {
    identity: identityPts >= 9 ? 'complete' : identityPts > 0 ? 'partial' : 'empty',
    summary: summaryPts >= 10 ? 'complete' : summaryPts > 0 ? 'partial' : 'empty',
    experience: completeExp ? 'complete' : experiences.length > 0 ? 'partial' : 'empty',
    education: eduPts >= 15 ? 'complete' : education.length > 0 ? 'partial' : 'empty',
    skills: techSkills.length >= 3 ? 'complete' : techSkills.length > 0 ? 'partial' : 'empty',
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
    languages
  });

  return {
    percentage,
    tier,
    sectionStatus,
    nextAction
  };
}

function pickNextAction({ identityPts, experiences, hasExpMetrics, totalBullets, techSkills, eduPts, summaryPts, languages }) {
  if (identityPts < 10) {
    return {
      sectionId: 'identity',
      prompt: identityPts < 7
        ? 'Add your name, target title, and email (+10%)'
        : 'Add your phone, city, and target role title to complete Identity'
    };
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
  if (techSkills.length < 5) {
    return {
      sectionId: 'skills',
      prompt: 'Reach 5+ skills to unlock All-Star status'
    };
  }
  if (languages.length < 2) {
    return {
      sectionId: 'languages',
      prompt: 'Add 2+ CEFR languages to unlock All-Star status'
    };
  }
  return { sectionId: 'export', prompt: 'All-Star CV ready — Download A4 PDF or run Job Matcher' };
}
