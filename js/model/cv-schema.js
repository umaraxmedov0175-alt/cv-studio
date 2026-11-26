/**
 * European CV Schema & Validation Specifications
 * Default language: English (accessible to international applicants)
 * Features DIN 5008, UK Anti-Bias, French & Swiss regional rules.
 */

export const CEFR_LEVELS = [
  { code: 'native', label: 'Native / Bilingual' },
  { code: 'C2', label: 'C2 – Mastery / Native-like' },
  { code: 'C1', label: 'C1 – Effective Operational / Fluent' },
  { code: 'B2', label: 'B2 – Vantage / Professional Working' },
  { code: 'B1', label: 'B1 – Threshold / Intermediate' },
  { code: 'A2', label: 'A2 – Waystage / Elementary' },
  { code: 'A1', label: 'A1 – Breakthrough / Beginner' }
];

export const TEMPLATE_IDS = {
  GERMAN_DIN: 'german-din-5008',
  MODERN_EUROPEAN: 'modern-european',
  MINIMAL_SWISS: 'minimal-swiss'
};

const VALID_TEMPLATES = new Set(Object.values(TEMPLATE_IDS));
const VALID_LANGUAGES = new Set(['en', 'de', 'fr', 'ru', 'uz']);
const VALID_COUNTRIES = new Set(['DE', 'UK', 'FR', 'NL', 'RU', 'UZ']);
const VALID_SPACING = new Set(['compact', 'normal', 'spacious']);
export const MAX_EMBEDDED_PHOTO_DATA_URL_LENGTH = 180_000;

export const DEFAULT_SECTION_ORDER = [
  'summary',
  'experience',
  'education',
  'skills',
  'languages'
];

export const OPTIONAL_SECTION_IDS = ['projects', 'certifications', 'additional'];

const ALL_BODY_SECTIONS = [...DEFAULT_SECTION_ORDER, ...OPTIONAL_SECTION_IDS];

/**
 * Normalizes a persisted section ordering so known sections appear once
 * and all core sections are guaranteed present.
 */
export function normalizeSectionOrder(order) {
  const input = Array.isArray(order) ? order : [];
  const seen = new Set();
  const result = [];

  for (const id of input) {
    if (ALL_BODY_SECTIONS.includes(id) && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }

  for (const coreId of DEFAULT_SECTION_ORDER) {
    if (!seen.has(coreId)) {
      seen.add(coreId);
      result.push(coreId);
    }
  }

  return result;
}

export function isSafePhotoUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed === '') return true;
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return false;

  if (/^data:/i.test(trimmed)) {
    if (trimmed.length > MAX_EMBEDDED_PHOTO_DATA_URL_LENGTH) return false;
    return /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+$/i.test(trimmed);
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  // Allow only relative paths without a URI scheme or protocol-relative // prefix
  if (trimmed.startsWith('//') || trimmed.includes('://') || /^[^/?#]*:/.test(trimmed)) {
    return false;
  }
  return true;
}

function asPlainObject(val) {
  return val && typeof val === 'object' && !Array.isArray(val) ? val : {};
}

function asString(val, fallback = '') {
  return typeof val === 'string' ? val : fallback;
}

export function createEmptyCV() {
  return {
    meta: {
      version: '2.1.0',
      template: TEMPLATE_IDS.GERMAN_DIN,
      language: 'en',
      targetCountry: 'DE',
      accentColor: '#2b3fe8',
      spacing: 'normal',
      showPhoto: true,
      includeSignatureBlock: true,
      showPatronymic: false,
      showMaritalStatus: false,
      showGender: false,
      showSalary: false,
      showWorkPermission: false,
      sectionOrder: [...DEFAULT_SECTION_ORDER]
    },
    personal: {
      firstName: '',
      lastName: '',
      patronymic: '',
      title: '',
      email: '',
      phone: '',
      telegram: '',
      address: '',
      city: '',
      postalCode: '',
      country: 'Germany',
      birthDate: '',
      birthPlace: '',
      nationality: '',
      workPermission: '',
      maritalStatus: '',
      children: '',
      gender: '',
      desiredSalary: '',
      website: '',
      linkedin: '',
      github: '',
      photoUrl: ''
    },
    summary: '',
    experience: [],
    education: [],
    skills: {
      technical: [],
      languages: [],
      tools: []
    },
    certifications: [],
    projects: [],
    additional: {
      drivingLicence: '',
      businessTrips: '',
      relocation: ''
    },
    signature: {
      place: 'Berlin',
      date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      signeeName: ''
    }
  };
}

export function createSampleEuropeanCV() {
  return {
    meta: {
      version: '2.0.0',
      template: TEMPLATE_IDS.GERMAN_DIN,
      language: 'en',
      targetCountry: 'DE',
      accentColor: '#2b3fe8',
      spacing: 'normal',
      showPhoto: true,
      includeSignatureBlock: true,
      sectionOrder: [...DEFAULT_SECTION_ORDER]
    },
    personal: {
      firstName: 'Alexander',
      lastName: 'Wright',
      title: 'Senior Full-Stack Engineer & System Architect',
      email: 'alex.wright.dev@example.com',
      phone: '+49 170 12345678',
      address: 'Friedrichstraße 42',
      city: 'Berlin',
      postalCode: '10117',
      country: 'Germany',
      birthDate: '14.05.1994',
      birthPlace: 'Hamburg',
      nationality: 'German',
      website: 'https://alexwright.dev',
      linkedin: 'linkedin.com/in/alexwright-dev',
      github: 'github.com/alexwright',
      photoUrl: ''
    },
    summary: 'Full-Stack Software Engineer with 6+ years of experience designing and scaling fault-tolerant web applications and distributed microservices. Specialist in TypeScript, React, Go, and cloud-native infrastructure.',
    experience: [
      {
        id: 'exp-1',
        position: 'Senior Full-Stack Engineer',
        company: 'FinTech Solutions GmbH',
        city: 'Berlin, Germany',
        startDate: '03/2022',
        endDate: 'Present',
        current: true,
        bullets: [
          'Architected high-availability payment pipeline processing 500,000+ daily transactions with 99.99% uptime.',
          'Reduced API p95 response latency by 42% by migrating core endpoints to Go microservices with Redis caching.',
          'Mentored 5 junior and mid-level engineers and implemented automated CI/CD deployment pipelines via GitHub Actions.'
        ],
        technologies: ['TypeScript', 'React', 'Go', 'PostgreSQL', 'Docker', 'AWS']
      },
      {
        id: 'exp-2',
        position: 'Software Developer',
        company: 'DataMetrics Technologies AG',
        city: 'Munich, Germany',
        startDate: '09/2018',
        endDate: '02/2022',
        current: false,
        bullets: [
          'Engineered interactive real-time analytics dashboards for enterprise clients using React and D3.js.',
          'Optimized mission-critical PostgreSQL queries, reducing analytical report execution times from 12 minutes to 45 seconds.',
          'Constructed automated end-to-end testing suites with Playwright, elevating test coverage to 94%.'
        ],
        technologies: ['JavaScript', 'React', 'Node.js', 'Python', 'PostgreSQL']
      }
    ],
    education: [
      {
        id: 'edu-1',
        degree: 'M.Sc. Computer Science',
        institution: 'Technical University of Berlin',
        city: 'Berlin, Germany',
        startDate: '10/2016',
        endDate: '08/2018',
        grade: '1.3 (Highest Distinction / First Class)',
        thesis: 'Distributed Consensus Algorithms in Latency-Critical Networks'
      },
      {
        id: 'edu-2',
        degree: 'B.Sc. Applied Informatics',
        institution: 'University of Hamburg',
        city: 'Hamburg, Germany',
        startDate: '10/2013',
        endDate: '07/2016',
        grade: '1.7 (Upper Second Class Honours)',
        thesis: 'Reactive Geospatial Visualization Engine'
      }
    ],
    skills: {
      technical: [
        'TypeScript / JavaScript',
        'React / Next.js',
        'Go (Golang)',
        'Node.js & Express',
        'PostgreSQL & Redis',
        'Docker & Kubernetes',
        'AWS Cloud Infrastructure',
        'REST & GraphQL APIs',
        'CI/CD & Git'
      ],
      languages: [
        { language: 'English', level: 'Native / Bilingual' },
        { language: 'German', level: 'C1 – Effective Operational / Fluent' },
        { language: 'French', level: 'B1 – Threshold / Intermediate' }
      ],
      tools: ['VS Code', 'Docker Desktop', 'Figma', 'Postman', 'Jira / Confluence']
    },
    certifications: [
      {
        id: 'cert-1',
        name: 'AWS Certified Solutions Architect – Associate',
        issuer: 'Amazon Web Services',
        year: '2023'
      }
    ],
    projects: [
      {
        id: 'proj-1',
        name: 'OpenCV-Engine',
        description: 'Open-source engine for automated European CV compliance and ATS optimization.',
        technologies: 'TypeScript, TailwindCSS',
        link: 'https://github.com/alexwright/opencv-engine'
      }
    ],
    signature: {
      place: 'Berlin',
      date: '24.11.2026',
      signeeName: 'Alexander Wright'
    }
  };
}

// Backward compatibility alias
export const createSampleGermanCV = createSampleEuropeanCV;

export function createSampleRussianCV() {
  return {
    meta: {
      version: '2.1.0',
      template: TEMPLATE_IDS.MINIMAL_SWISS,
      language: 'ru',
      targetCountry: 'RU',
      accentColor: '#2b3fe8',
      spacing: 'compact',
      showPhoto: true,
      includeSignatureBlock: false,
      showPatronymic: false,
      showMaritalStatus: false,
      showGender: false,
      showSalary: false,
      showWorkPermission: false,
      sectionOrder: [...DEFAULT_SECTION_ORDER]
    },
    personal: {
      firstName: 'Алексей',
      lastName: 'Воронов',
      patronymic: '',
      title: 'Старший backend-разработчик (Go / PostgreSQL)',
      email: 'a.voronov.dev@example.com',
      phone: '+7 900 000-00-00',
      telegram: '@voronov_dev',
      address: '',
      city: 'Москва',
      postalCode: '',
      country: 'Россия',
      birthDate: '12.04.1993',
      birthPlace: '',
      nationality: 'Россия',
      workPermission: '',
      maritalStatus: '',
      children: '',
      gender: '',
      desiredSalary: '',
      website: '',
      linkedin: 'hh.ru/resume/voronov-example',
      github: 'github.com/avoronov-dev',
      photoUrl: '/assets/portrait-03.webp'
    },
    summary: 'Backend-разработчик с опытом более 6 лет в проектировании высоконагруженных микросервисов и платёжных систем. Специализируюсь на Go, PostgreSQL, Kafka и отказоустойчивой инфраструктуре.',
    experience: [
      {
        id: 'exp-1',
        position: 'Старший разработчик Go',
        company: 'ООО «СеверПлатформа»',
        city: 'Москва',
        startDate: '04.2022',
        endDate: 'по настоящее время',
        current: true,
        bullets: [
          'Разработал биллинговый сервис на Go с нагрузкой 450 000+ транзакций в сутки и доступностью 99.98%.',
          'Сократил время отклика ключевых API на 38% за счёт оптимизации запросов PostgreSQL и кэширования в Redis.',
          'Внедрил автоматическое тестирование и CI/CD-пайплайны, ускорив выкладку релизов в 2 раза.'
        ],
        technologies: ['Go', 'PostgreSQL', 'Redis', 'Kafka', 'Docker', 'Kubernetes']
      },
      {
        id: 'exp-2',
        position: 'Backend-разработчик',
        company: 'АО «ТехноМетрика»',
        city: 'Санкт-Петербург',
        startDate: '09.2019',
        endDate: '03.2022',
        current: false,
        bullets: [
          'Создал модуль аналитики событий на Python и ClickHouse для 120 корпоративных клиентов.',
          'Оптимизировал фоновые очереди обработки данных, снизив потребление памяти на 30%.'
        ],
        technologies: ['Python', 'Go', 'PostgreSQL', 'Linux', 'GitLab CI']
      }
    ],
    education: [
      {
        id: 'edu-1',
        degree: 'Магистр информатики и вычислительной техники',
        institution: 'Московский технический университет (учебный пример)',
        city: 'Москва',
        startDate: '09.2015',
        endDate: '06.2017',
        grade: '',
        thesis: ''
      }
    ],
    skills: {
      technical: ['Go', 'PostgreSQL', 'Redis', 'Kafka', 'Docker', 'Kubernetes', 'REST / gRPC', 'Linux', 'Git'],
      languages: [
        { language: 'Русский', level: 'Native / Bilingual' },
        { language: 'Английский', level: 'B2 – Vantage / Professional Working' }
      ],
      tools: ['Docker', 'GitLab CI', 'Prometheus']
    },
    certifications: [],
    projects: [],
    additional: {
      drivingLicence: '',
      businessTrips: '',
      relocation: ''
    },
    signature: { place: 'Москва', date: '26.11.2026', signeeName: 'Алексей Воронов' }
  };
}

export function createSampleUzbekCV() {
  return {
    meta: {
      version: '2.1.0',
      template: TEMPLATE_IDS.GERMAN_DIN,
      language: 'uz',
      targetCountry: 'UZ',
      accentColor: '#2b3fe8',
      spacing: 'compact',
      showPhoto: true,
      includeSignatureBlock: false,
      showPatronymic: false,
      showMaritalStatus: false,
      showGender: false,
      showSalary: false,
      showWorkPermission: true,
      sectionOrder: [...DEFAULT_SECTION_ORDER]
    },
    personal: {
      firstName: 'Jasurbek',
      lastName: 'Tursunov',
      patronymic: '',
      title: 'Frontend va Full-Stack dasturchi (React / TypeScript)',
      email: 'j.tursunov.dev@example.com',
      phone: '+998 90 000 00 00',
      telegram: '@jtursunov_dev',
      address: '',
      city: 'Toshkent',
      postalCode: '',
      country: 'Oʻzbekiston',
      birthDate: '18.08.1995',
      birthPlace: '',
      nationality: 'Oʻzbekiston',
      workPermission: 'Oʻzbekiston',
      maritalStatus: '',
      children: '',
      gender: '',
      desiredSalary: '',
      website: '',
      linkedin: 'hh.uz/resume/tursunov-example',
      github: 'github.com/jtursunov-dev',
      photoUrl: '/assets/portrait-05.webp'
    },
    summary: '5 yildan ortiq tajribaga ega Full-Stack dasturchi. TypeScript, React va Node.js asosida tezkor hamda ishonchli veb-tizimlarni loyihalash va ishlab chiqish boʻyicha mutaxassis.',
    experience: [
      {
        id: 'exp-1',
        position: 'Katta Frontend dasturchi',
        company: '«Navoiy Digital Solutions» MChJ',
        city: 'Toshkent',
        startDate: '02.2022',
        endDate: 'hozirgacha',
        current: true,
        bullets: [
          '150 000 dan ortiq foydalanuvchiga xizmat koʻrsatuvchi toʻlov kabinetini React va TypeScript asosida ishlab chiqdi.',
          'Sahifa yuklanish tezligini 42% ga oshirdi va avtomatlashtirilgan UI test qamrovini 88% ga yetkazdi.'
        ],
        technologies: ['TypeScript', 'React', 'Next.js', 'REST API', 'Playwright']
      },
      {
        id: 'exp-2',
        position: 'Veb-dasturchi',
        company: '«Samarqand Tech Lab» MChJ',
        city: 'Samarqand',
        startDate: '09.2019',
        endDate: '01.2022',
        current: false,
        bullets: [
          'Korporativ boshqaruv paneli va hisobotlar modulini Node.js hamda PostgreSQL yordamida yaratdi.',
          'Maʼlumotlar bazasi soʻrovlarini optimallashtirib, hisobot tayyorlash vaqtini 3 baravar qisqartirdi.'
        ],
        technologies: ['JavaScript', 'Node.js', 'PostgreSQL', 'Docker', 'Git']
      }
    ],
    education: [
      {
        id: 'edu-1',
        degree: 'Bakalavr, Axborot texnologiyalari',
        institution: 'Toshkent axborot texnologiyalari universiteti (namuna)',
        city: 'Toshkent',
        startDate: '09.2014',
        endDate: '06.2018',
        grade: '',
        thesis: ''
      }
    ],
    skills: {
      technical: ['TypeScript', 'React', 'Next.js', 'Node.js', 'PostgreSQL', 'REST API', 'Docker', 'Git'],
      languages: [
        { language: 'Oʻzbek tili', level: 'Native / Bilingual' },
        { language: 'Rus tili', level: 'C2 – Mastery / Native-like' },
        { language: 'Ingliz tili', level: 'B2 – Vantage / Professional Working' }
      ],
      tools: ['VS Code', 'Figma', 'GitHub Actions']
    },
    certifications: [],
    projects: [],
    additional: {
      drivingLicence: 'B toifa',
      businessTrips: 'Xizmat safarlariga tayyor',
      relocation: ''
    },
    signature: { place: 'Toshkent', date: '26.11.2026', signeeName: 'Jasurbek Tursunov' }
  };
}

export function createSampleCVForMarket(countryCode = 'DE', languageCode = 'en') {
  const c = typeof countryCode === 'string' ? countryCode.trim().toUpperCase() : 'DE';
  const l = typeof languageCode === 'string' ? languageCode.trim().toLowerCase() : 'en';
  if (c === 'RU' || l === 'ru') return createSampleRussianCV();
  if (c === 'UZ' || l === 'uz') return createSampleUzbekCV();
  return createSampleEuropeanCV();
}

/**
 * Coerces untrusted or partial CV payloads into a safe, well-typed CV object.
 */
export function sanitizeCVData(raw) {
  const base = createEmptyCV();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return base;
  }

  const rawMeta = asPlainObject(raw.meta);
  const rawCountry = typeof rawMeta.targetCountry === 'string' ? rawMeta.targetCountry.trim().toUpperCase() : '';
  const rawAccent = typeof rawMeta.accentColor === 'string' ? rawMeta.accentColor.trim() : '';

  const meta = {
    version: asString(rawMeta.version, base.meta.version),
    template: VALID_TEMPLATES.has(rawMeta.template) ? rawMeta.template : base.meta.template,
    language: VALID_LANGUAGES.has(rawMeta.language) ? rawMeta.language : base.meta.language,
    targetCountry: VALID_COUNTRIES.has(rawCountry) ? rawCountry : base.meta.targetCountry,
    accentColor: /^#[0-9a-f]{3,8}$/i.test(rawAccent) ? rawAccent : base.meta.accentColor,
    spacing: VALID_SPACING.has(rawMeta.spacing) ? rawMeta.spacing : base.meta.spacing,
    showPhoto: typeof rawMeta.showPhoto === 'boolean' ? rawMeta.showPhoto : base.meta.showPhoto,
    includeSignatureBlock: typeof rawMeta.includeSignatureBlock === 'boolean'
      ? rawMeta.includeSignatureBlock
      : base.meta.includeSignatureBlock,
    showPatronymic: typeof rawMeta.showPatronymic === 'boolean' ? rawMeta.showPatronymic : false,
    showMaritalStatus: typeof rawMeta.showMaritalStatus === 'boolean' ? rawMeta.showMaritalStatus : false,
    showGender: typeof rawMeta.showGender === 'boolean' ? rawMeta.showGender : false,
    showSalary: typeof rawMeta.showSalary === 'boolean' ? rawMeta.showSalary : false,
    showWorkPermission: typeof rawMeta.showWorkPermission === 'boolean'
      ? rawMeta.showWorkPermission
      : (VALID_COUNTRIES.has(rawCountry) && rawCountry === 'UZ'),
    sectionOrder: normalizeSectionOrder(rawMeta.sectionOrder)
  };

  const rawPersonal = asPlainObject(raw.personal);
  const rawPhoto = typeof rawPersonal.photoUrl === 'string' ? rawPersonal.photoUrl.trim() : '';
  const personal = {
    firstName: asString(rawPersonal.firstName),
    lastName: asString(rawPersonal.lastName),
    patronymic: asString(rawPersonal.patronymic),
    title: asString(rawPersonal.title),
    email: asString(rawPersonal.email),
    phone: asString(rawPersonal.phone),
    telegram: asString(rawPersonal.telegram),
    address: asString(rawPersonal.address),
    city: asString(rawPersonal.city),
    postalCode: asString(rawPersonal.postalCode),
    country: rawPersonal.country === undefined || rawPersonal.country === null
      ? base.personal.country
      : asString(rawPersonal.country),
    birthDate: asString(rawPersonal.birthDate),
    birthPlace: asString(rawPersonal.birthPlace),
    nationality: asString(rawPersonal.nationality || rawPersonal.citizenship),
    workPermission: asString(rawPersonal.workPermission),
    maritalStatus: asString(rawPersonal.maritalStatus),
    children: asString(rawPersonal.children),
    gender: asString(rawPersonal.gender),
    desiredSalary: asString(rawPersonal.desiredSalary),
    website: asString(rawPersonal.website),
    linkedin: asString(rawPersonal.linkedin),
    github: asString(rawPersonal.github),
    photoUrl: isSafePhotoUrl(rawPhoto) ? rawPhoto : ''
  };

  const experience = (Array.isArray(raw.experience) ? raw.experience : [])
    .filter(item => item && typeof item === 'object' && !Array.isArray(item))
    .map((exp, idx) => ({
      id: asString(exp.id) || `exp-${idx + 1}`,
      position: asString(exp.position),
      company: asString(exp.company),
      city: asString(exp.city),
      startDate: asString(exp.startDate),
      endDate: asString(exp.endDate),
      current: Boolean(exp.current),
      bullets: Array.isArray(exp.bullets)
        ? exp.bullets.filter(b => typeof b === 'string' || typeof b === 'number').map(b => String(b))
        : [],
      technologies: Array.isArray(exp.technologies)
        ? exp.technologies.filter(t => typeof t === 'string').map(t => t.trim()).filter(Boolean)
        : []
    }));

  const education = (Array.isArray(raw.education) ? raw.education : [])
    .filter(item => item && typeof item === 'object' && !Array.isArray(item))
    .map((edu, idx) => ({
      id: asString(edu.id) || `edu-${idx + 1}`,
      degree: asString(edu.degree),
      institution: asString(edu.institution),
      city: asString(edu.city),
      startDate: asString(edu.startDate),
      endDate: asString(edu.endDate),
      grade: asString(edu.grade),
      thesis: asString(edu.thesis)
    }));

  const rawSkills = asPlainObject(raw.skills);
  const skills = {
    technical: Array.isArray(rawSkills.technical)
      ? rawSkills.technical.filter(s => typeof s === 'string').map(s => s.trim()).filter(Boolean)
      : [],
    languages: (Array.isArray(rawSkills.languages) ? rawSkills.languages : [])
      .filter(l => l && typeof l === 'object' && !Array.isArray(l))
      .map(l => ({
        language: asString(l.language),
        level: asString(l.level)
      })),
    tools: Array.isArray(rawSkills.tools)
      ? rawSkills.tools.filter(t => typeof t === 'string').map(t => t.trim()).filter(Boolean)
      : []
  };

  const certifications = (Array.isArray(raw.certifications) ? raw.certifications : [])
    .filter(c => c && typeof c === 'object' && !Array.isArray(c))
    .map((c, idx) => ({
      id: asString(c.id) || `cert-${idx + 1}`,
      name: asString(c.name),
      issuer: asString(c.issuer),
      year: typeof c.year === 'number' && Number.isFinite(c.year) ? String(c.year) : asString(c.year)
    }));

  const projects = (Array.isArray(raw.projects) ? raw.projects : [])
    .filter(p => p && typeof p === 'object' && !Array.isArray(p))
    .map((p, idx) => ({
      id: asString(p.id) || `proj-${idx + 1}`,
      name: asString(p.name),
      description: asString(p.description),
      technologies: asString(p.technologies),
      link: asString(p.link)
    }));

  const rawAdditional = asPlainObject(raw.additional);
  const additional = {
    drivingLicence: asString(rawAdditional.drivingLicence),
    businessTrips: asString(rawAdditional.businessTrips),
    relocation: asString(rawAdditional.relocation)
  };

  const rawSig = asPlainObject(raw.signature);
  const signature = {
    place: typeof rawSig.place === 'string' ? rawSig.place : base.signature.place,
    date: typeof rawSig.date === 'string' ? rawSig.date : base.signature.date,
    signeeName: typeof rawSig.signeeName === 'string' ? rawSig.signeeName : base.signature.signeeName
  };

  return {
    meta,
    personal,
    summary: asString(raw.summary),
    experience,
    education,
    skills,
    certifications,
    projects,
    additional,
    signature
  };
}

export function validateCV(cv, options = {}) {
  const errors = [];
  const { allowDraft = false } = options && typeof options === 'object' ? options : {};

  if (!cv || typeof cv !== 'object' || Array.isArray(cv)) {
    return { valid: false, errors: ['CV object cannot be empty.'] };
  }
  if (!cv.personal || typeof cv.personal !== 'object' || Array.isArray(cv.personal)) {
    return { valid: false, errors: ['Personal details object is missing or invalid.'] };
  }

  const rawVer = typeof cv.meta?.version === 'string' ? cv.meta.version.trim() : '';
  const majorVer = rawVer ? Number.parseInt(rawVer.split('.')[0], 10) : 2;
  if (Number.isFinite(majorVer) && majorVer > 2) {
    return { valid: false, errors: [`Unsupported CV schema version (${rawVer}). Please update the app to import this file.`] };
  }

  const p = cv.personal;
  if (p.firstName !== undefined && p.firstName !== null && typeof p.firstName !== 'string') {
    errors.push('First name must be text.');
  } else if (!allowDraft && !(typeof p.firstName === 'string' && p.firstName.trim())) {
    errors.push('First name is required.');
  }

  if (p.lastName !== undefined && p.lastName !== null && typeof p.lastName !== 'string') {
    errors.push('Last name must be text.');
  } else if (!allowDraft && !(typeof p.lastName === 'string' && p.lastName.trim())) {
    errors.push('Last name is required.');
  }

  if (p.email !== undefined && p.email !== null && typeof p.email !== 'string') {
    errors.push('Email address must be text.');
  } else {
    const emailStr = typeof p.email === 'string' ? p.email.trim() : '';
    if (!allowDraft && !emailStr) {
      errors.push('Email address is required.');
    } else if (emailStr && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
      errors.push('Invalid email address format.');
    }
  }

  if (p.photoUrl !== undefined && p.photoUrl !== null && !isSafePhotoUrl(p.photoUrl)) {
    errors.push('Invalid or unsafe photo URL.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
