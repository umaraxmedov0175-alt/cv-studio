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

export const DEFAULT_SECTION_ORDER = [
  'summary',
  'experience',
  'education',
  'skills',
  'languages'
];

export const OPTIONAL_SECTION_IDS = ['projects', 'certifications'];

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

export function createEmptyCV() {
  return {
    meta: {
      version: '2.0.0',
      template: TEMPLATE_IDS.GERMAN_DIN,
      language: 'en',
      targetCountry: 'DE',
      accentColor: '#1e3a8a',
      fontFamily: 'Plus Jakarta Sans',
      spacing: 'normal',
      showPhoto: true,
      includeSignatureBlock: true,
      sectionOrder: [...DEFAULT_SECTION_ORDER]
    },
    personal: {
      firstName: '',
      lastName: '',
      title: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postalCode: '',
      country: 'Germany',
      birthDate: '',
      birthPlace: '',
      nationality: '',
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
    signature: {
      place: 'Berlin',
      date: new Date().toLocaleDateString('en-GB'),
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
      accentColor: '#1e3a8a',
      fontFamily: 'Plus Jakarta Sans',
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

export function validateCV(cv) {
  const errors = [];
  if (!cv) {
    return { valid: false, errors: ['CV object cannot be empty.'] };
  }
  if (!cv.personal?.firstName?.trim()) {
    errors.push('First name is required.');
  }
  if (!cv.personal?.lastName?.trim()) {
    errors.push('Last name is required.');
  }
  if (!cv.personal?.email?.trim()) {
    errors.push('Email address is required.');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cv.personal.email)) {
    errors.push('Invalid email address format.');
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
