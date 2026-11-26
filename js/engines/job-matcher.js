/**
 * Job Description ATS Keyword Matcher
 * Parses job descriptions and calculates matching vs missing skills.
 */

const KNOWN_SKILL_KEYWORDS = [
  'typescript', 'javascript', 'react', 'next.js', 'vue', 'angular', 'svelte',
  'node.js', 'express', 'python', 'django', 'fastapi', 'flask',
  'go', 'rust', 'c++', 'c#', '.net', 'java', 'spring', 'kotlin', 'swift',
  'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
  'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'cloud', 'terraform',
  'ci/cd', 'git', 'github actions', 'gitlab', 'linux', 'bash',
  'rest', 'graphql', 'grpc', 'microservices', 'distributed systems',
  'figma', 'ui/ux', 'tailwind', 'css', 'html', 'playwright', 'cypress', 'jest',
  'agile', 'scrum', 'jira', 'confluence', 'tdd', 'architecture'
];

const LEFT_BOUND = '(?:^|[^a-z0-9#+.])';
const RIGHT_BOUND = '(?=$|[^a-z0-9#+.])';

const SKILL_ALIAS_PATTERNS = {
  react: /(?:^|[^a-z0-9#+.])(?:react(?:\.js)?|reactjs)(?=$|[^a-z0-9#+.])/i,
  vue: /(?:^|[^a-z0-9#+.])(?:vue(?:\.js)?|vuejs)(?=$|[^a-z0-9#+.])/i,
  'next.js': /(?:^|[^a-z0-9#+.])(?:next\.js|nextjs)(?=$|[^a-z0-9#+.])/i,
  'node.js': /(?:^|[^a-z0-9#+.])(?:node\.js|nodejs)(?=$|[^a-z0-9#+.])/i
};

const AMBIGUOUS_PROSE_MATCHERS = {
  go: (text) =>
    /(?:^|[^a-z0-9#+.])golang(?=$|[^a-z0-9#+.])/i.test(text) ||
    /(?:^|[^a-z0-9#+.])Go(?=$|[^a-z0-9#+.])(?!\s+(?:to|beyond|through|into|for|on|up|out|back|ahead|live|fast|far|away|wrong)\b)/.test(text) ||
    /(?:^|[,/&])\s*go\s*(?=[,/&]|$)/i.test(text),
  rest: (text) =>
    /(?:^|[^a-z0-9#+.])REST(?:ful)?(?=$|[^a-z0-9#+.])/.test(text) ||
    /(?:^|[^a-z0-9#+.])rest\s*(?:apis?|services?|endpoints?|architecture|interfaces?|&|\/)(?=$|[^a-z0-9#+.])/i.test(text),
  express: (text) =>
    /(?:^|[^a-z0-9#+.])express(?:\.?js)(?=$|[^a-z0-9#+.])/i.test(text) ||
    /(?:^|[^a-z0-9#+.])Express(?=$|[^a-z0-9#+.])(?!\s+(?:interest|yourself|delivery|shipping|lane|opinion|views|concerns|gratitude)\b)/.test(text),
  spring: (text) =>
    /(?:^|[^a-z0-9#+.])spring\s*(?:boot|framework|cloud|mvc|data|security|batch|integration)(?=$|[^a-z0-9#+.])/i.test(text) ||
    /(?:^|[^a-z0-9#+.])Spring(?=$|[^a-z0-9#+.])(?!\s+(?:19\d\d|20\d\d|semester|break|intern\w*|cohort|quarter|term|season|cleaning)\b)/.test(text),
  swift: (text) =>
    /(?:^|[^a-z0-9#+.])swiftui(?=$|[^a-z0-9#+.])/i.test(text) ||
    /(?:^|[^a-z0-9#+.])Swift(?=$|[^a-z0-9#+.])(?!\s+(?:response|action|decision|delivery|execution|resolution|transition)\b)/.test(text),
  cloud: (text) =>
    /(?:^|[^a-z0-9#+.])Cloud(?=$|[^a-z0-9#+.])/.test(text) ||
    /(?:^|[^a-z0-9#+.])cloud[- ](?:native|computing|infrastructure|architecture|platform|services?|engineering|security|deployment|experience|skills?|technologies|environments?)(?=$|[^a-z0-9#+.])/i.test(text) ||
    /(?:^|[^a-z0-9#+.])(?:aws|azure|gcp|public|private|hybrid|multi[- ])\s*cloud(?=$|[^a-z0-9#+.])/i.test(text) ||
    /(?:^|[^a-z0-9#+.])in the cloud(?=$|[^a-z0-9#+.])/i.test(text)
};

const RU_STOP_WORDS = new Set([
  'и', 'в', 'во', 'не', 'что', 'он', 'на', 'я', 'с', 'со', 'как', 'а', 'то', 'все',
  'она', 'так', 'его', 'но', 'да', 'ты', 'к', 'у', 'же', 'вы', 'за', 'бы', 'по',
  'только', 'ее', 'мне', 'было', 'вот', 'от', 'меня', 'еще', 'нет', 'о', 'из',
  'ему', 'теперь', 'когда', 'даже', 'ну', 'вдруг', 'ли', 'если', 'уже', 'или',
  'ни', 'быть', 'был', 'него', 'до', 'вас', 'нибудь', 'опять', 'уж', 'вам',
  'ведь', 'там', 'потом', 'себя', 'ничего', 'ей', 'может', 'они', 'тут', 'где',
  'есть', 'надо', 'ней', 'для', 'мы', 'тебя', 'их', 'чем', 'была', 'сам', 'чтоб',
  'без', 'будто', 'чего', 'раз', 'тоже', 'себе', 'под', 'будет', 'ж', 'тогда',
  'кто', 'этот', 'того', 'потому', 'этого', 'какой', 'совсем', 'ним', 'здесь',
  'этом', 'один', 'почти', 'мой', 'тем', 'чтобы', 'нее', 'сейчас', 'были', 'куда',
  'зачем', 'всех', 'никогда', 'можно', 'при', 'наконец', 'два', 'об', 'другой',
  'хоть', 'после', 'над', 'больше', 'тот', 'через', 'эти', 'нас', 'про', 'всего',
  'них', 'какая', 'много', 'разве', 'три', 'эту', 'моя', 'впрочем', 'хорошо',
  'свою', 'этой', 'перед', 'иногда', 'лучше', 'чуть', 'том', 'нельзя', 'такой',
  'им', 'более', 'всегда', 'конечно', 'всю', 'между', 'опыт', 'работы', 'работа',
  'требования', 'обязанности', 'условия', 'умение', 'знание', 'навыки'
]);

const UZ_STOP_WORDS = new Set([
  'va', 'ham', 'bilan', 'uchun', 'bu', 'u', 'esa', 'yoki', 'lekin', 'ammo', 'biroq',
  'agar', 'chunki', 'shuningdek', 'hamda', 'qadar', 'kabi', 'boʼyicha', 'orqali',
  'boshqa', 'barcha', 'har', 'bir', 'ikki', 'uch', 'bor', 'yoʼq', 'kerak', 'lozim',
  'mumkin', 'haqida', 'ichida', 'ustida', 'oldin', 'keyin', 'soʻng', 'doim',
  'tajriba', 'bilim', 'koʻnikma', 'ish', 'talablar', 'vazifalar', 'sharoitlar',
  'oʼz', 'biz', 'siz', 'ular', 'men', 'sen', 'uni', 'buni', 'shuni', 'nima', 'kim'
]);

export function normalizeUnicodeText(text) {
  if (typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[ʻʼ'‘’`]/g, 'ʼ');
}

function detectPostingLanguage(jobText) {
  const norm = normalizeUnicodeText(jobText);
  if (/[а-я]/i.test(norm)) return 'ru';
  if (/[ʻʼ]/.test(jobText) || /\b(?:uchun|bilan|tajriba|koʼnikma|lavozim|bilim|ishlab)\b/i.test(norm)) {
    return 'uz';
  }
  return 'latin';
}

// Heuristic: prefix-stem matching for inflected Russian and Uzbek words
function tokensMatchHeuristic(a, b) {
  if (a === b) return true;
  if (a.length >= 5 && b.length >= 5) {
    const minLen = Math.min(a.length, b.length);
    const prefixLen = Math.max(4, Math.min(6, minLen - 1));
    if (a.slice(0, prefixLen) === b.slice(0, prefixLen)) return true;
  }
  return false;
}

function tokenizeUnicodeTerms(text, lang) {
  const norm = normalizeUnicodeText(text);
  const matches = norm.match(/[\p{L}\p{N}ʼ#+.]{2,}/gu) || [];
  const stops = lang === 'ru' ? RU_STOP_WORDS : (lang === 'uz' ? UZ_STOP_WORDS : new Set());
  const seen = new Set();
  const out = [];
  for (const rawTok of matches) {
    const tok = rawTok.replace(/^[.-]+|[.-]+$/g, '');
    if (tok.length < 3) continue;
    if (/^\d+$/.test(tok)) continue;
    if (stops.has(tok) || RU_STOP_WORDS.has(tok) || UZ_STOP_WORDS.has(tok)) continue;
    if (!seen.has(tok)) {
      seen.add(tok);
      out.push(tok);
    }
  }
  return out;
}

function normalizeMatchText(text) {
  if (typeof text !== 'string' || !text.trim()) return '';
  return text
    .replace(/["'()[\]{}]/g, ' ')
    .replace(/[.,;:!?]+(?=\s|$)/g, ' ');
}

function collectKeywordsFromText(rawText, { isStructured = false } = {}) {
  const normalized = normalizeMatchText(rawText);
  const found = new Set();
  if (!normalized) return found;

  for (const skill of KNOWN_SKILL_KEYWORDS) {
    if (!isStructured && AMBIGUOUS_PROSE_MATCHERS[skill]) {
      if (AMBIGUOUS_PROSE_MATCHERS[skill](normalized)) {
        found.add(skill);
      }
      continue;
    }

    if (skill === 'go' && isStructured) {
      if (/(?:^|[^a-z0-9#+.])(?:go|golang)(?=$|[^a-z0-9#+.])/i.test(normalized)) {
        found.add('go');
      }
      continue;
    }

    const pattern = SKILL_ALIAS_PATTERNS[skill];
    if (pattern) {
      if (pattern.test(normalized)) found.add(skill);
      continue;
    }

    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${LEFT_BOUND}${escaped}${RIGHT_BOUND}`, 'i');
    if (regex.test(normalized)) {
      found.add(skill);
    }
  }

  return found;
}

export function extractKeywordsFromJob(jobText) {
  if (!jobText || typeof jobText !== 'string') return [];
  const techKeywords = Array.from(collectKeywordsFromText(jobText, { isStructured: false }));
  const lang = detectPostingLanguage(jobText);
  if (lang === 'latin') return techKeywords;

  const unicodeTerms = tokenizeUnicodeTerms(jobText, lang).slice(0, 24);
  const combined = new Set(techKeywords);
  for (const term of unicodeTerms) {
    combined.add(term);
  }
  return Array.from(combined);
}

export function extractCVKeywords(cv) {
  if (!cv || typeof cv !== 'object' || Array.isArray(cv)) return new Set();

  const structuredTokens = [];
  const proseTokens = [];
  const pushStr = (arr, val) => {
    if (typeof val === 'string' && val.trim()) arr.push(val);
  };

  if (Array.isArray(cv.skills?.technical)) {
    cv.skills.technical.forEach(s => pushStr(structuredTokens, s));
  }
  if (Array.isArray(cv.skills?.tools)) {
    cv.skills.tools.forEach(t => pushStr(structuredTokens, t));
  }

  if (Array.isArray(cv.experience)) {
    for (const exp of cv.experience) {
      if (!exp || typeof exp !== 'object') continue;
      pushStr(proseTokens, exp.position);
      pushStr(proseTokens, exp.company);
      if (Array.isArray(exp.technologies)) {
        exp.technologies.forEach(t => pushStr(structuredTokens, t));
      }
      if (Array.isArray(exp.bullets)) {
        exp.bullets.forEach(b => pushStr(proseTokens, b));
      }
    }
  }

  pushStr(proseTokens, cv.summary);

  if (Array.isArray(cv.education)) {
    for (const edu of cv.education) {
      if (!edu || typeof edu !== 'object') continue;
      pushStr(proseTokens, edu.degree);
      pushStr(proseTokens, edu.thesis);
    }
  }

  if (Array.isArray(cv.projects)) {
    for (const proj of cv.projects) {
      if (!proj || typeof proj !== 'object') continue;
      pushStr(proseTokens, proj.name);
      pushStr(proseTokens, proj.description);
      pushStr(structuredTokens, proj.technologies);
    }
  }

  if (Array.isArray(cv.certifications)) {
    for (const cert of cv.certifications) {
      if (!cert || typeof cert !== 'object') continue;
      pushStr(proseTokens, cert.name);
      pushStr(proseTokens, cert.issuer);
    }
  }

  const cvKeywords = collectKeywordsFromText(structuredTokens.join(', '), { isStructured: true });
  for (const kw of collectKeywordsFromText(proseTokens.join(' '), { isStructured: false })) {
    cvKeywords.add(kw);
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
      recommendations: ['Paste a job description to extract key requirements and benchmark your CV.']
    };
  }

  const cvKeywords = extractCVKeywords(cv);
  const lang = detectPostingLanguage(jobText);
  const cvUnicodeTokens = lang === 'latin'
    ? []
    : tokenizeUnicodeTerms([
      cv?.personal?.title,
      cv?.summary,
      ...(Array.isArray(cv?.skills?.technical) ? cv.skills.technical : []),
      ...(Array.isArray(cv?.skills?.tools) ? cv.skills.tools : []),
      ...(Array.isArray(cv?.experience) ? cv.experience.flatMap(e => [e?.position, e?.company, ...(e?.bullets || []), ...(e?.technologies || [])]) : []),
      ...(Array.isArray(cv?.education) ? cv.education.flatMap(e => [e?.degree, e?.thesis]) : []),
      ...(Array.isArray(cv?.projects) ? cv.projects.flatMap(p => [p?.name, p?.description, p?.technologies]) : [])
    ].filter(Boolean).join(' '), lang);

  const matched = [];
  const missing = [];

  for (const kw of targetKeywords) {
    const isMatched = cvKeywords.has(kw) || (
      lang !== 'latin' && cvUnicodeTokens.some(cvTok => tokensMatchHeuristic(kw, cvTok))
    );
    if (isMatched) {
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  }

  const matchPercentage = Math.round((matched.length / targetKeywords.length) * 100);

  const recommendations = [];
  if (missing.length > 0) {
    recommendations.push(`Consider incorporating these requested competencies where applicable: ${missing.slice(0, 5).join(', ')}.`);
  } else {
    recommendations.push('Strong match! All detected technical qualifications are already highlighted in your CV.');
  }

  return {
    matchPercentage,
    totalKeywords: targetKeywords.length,
    matched,
    missing,
    recommendations
  };
}
