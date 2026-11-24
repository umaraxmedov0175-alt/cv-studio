/**
 * European CV Schema & Validation Specifications
 * Designed to conform to German DIN 5008 Lebenslauf conventions and European standards.
 */

export const CEFR_LEVELS = [
  { code: 'native', label: 'Muttersprache / Native' },
  { code: 'C2', label: 'C2 – Exzellente Kenntnisse / Mastery' },
  { code: 'C1', label: 'C1 – Verhandlungssicher / Effective Operational' },
  { code: 'B2', label: 'B2 – Fließend / Vantage' },
  { code: 'B1', label: 'B1 – Gute Mittelstufe / Threshold' },
  { code: 'A2', label: 'A2 – Grundkenntnisse / Waystage' },
  { code: 'A1', label: 'A1 – Einstiegsstufe / Breakthrough' }
];

export const TEMPLATE_IDS = {
  GERMAN_DIN: 'german-din-5008',
  MODERN_EUROPEAN: 'modern-european',
  MINIMAL_SWISS: 'minimal-swiss'
};

export function createEmptyCV() {
  return {
    meta: {
      version: '1.0.0',
      template: TEMPLATE_IDS.GERMAN_DIN,
      language: 'de', // 'de' or 'en'
      accentColor: '#1e3a8a', // Deep Navy (German corporate precision)
      fontFamily: 'Inter',
      showPhoto: true,
      includeSignatureBlock: true
    },
    personal: {
      firstName: '',
      lastName: '',
      title: '', // e.g. "Senior Software Architect" / "Wirtschaftswissenschaftler"
      email: '',
      phone: '',
      address: '',
      city: '',
      postalCode: '',
      country: 'Deutschland',
      birthDate: '', // DD.MM.YYYY (German standard)
      birthPlace: '',
      nationality: 'deutsch',
      maritalStatus: '', // optional in German CVs, usually omitted or optional
      website: '',
      linkedin: '',
      github: '',
      photoUrl: ''
    },
    summary: '',
    experience: [], // Array of Job objects
    education: [],  // Array of Education objects
    skills: {
      technical: [],
      languages: [], // { language: string, level: string, certification?: string }
      tools: [],
      interests: []
    },
    certifications: [],
    projects: [],
    signature: {
      place: 'Berlin',
      date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      signeeName: ''
    }
  };
}

export function createSampleGermanCV() {
  return {
    meta: {
      version: '1.0.0',
      template: TEMPLATE_IDS.GERMAN_DIN,
      language: 'de',
      accentColor: '#1e293b',
      fontFamily: 'Inter',
      showPhoto: true,
      includeSignatureBlock: true
    },
    personal: {
      firstName: 'Maximilian',
      lastName: 'Schmidt',
      title: 'Full-Stack Softwareentwickler & Systemarchitekt',
      email: 'm.schmidt.dev@example.de',
      phone: '+49 170 12345678',
      address: 'Friedrichstraße 42',
      city: 'Berlin',
      postalCode: '10117',
      country: 'Deutschland',
      birthDate: '14.05.1994',
      birthPlace: 'Hamburg',
      nationality: 'deutsch',
      maritalStatus: '',
      website: 'https://maxschmidt.tech',
      linkedin: 'linkedin.com/in/maxschmidt-dev',
      github: 'github.com/maxschmidt',
      photoUrl: '' // Handled by avatar placeholder or uploaded image
    },
    summary: 'Erfahrener Softwareentwickler mit 6+ Jahren Erfahrung in der Konzeption und Implementierung skalierbarer Webanwendungen und verteilter Microservices. Fokus auf TypeScript, React, Go und Cloud-Infrastruktur.',
    experience: [
      {
        id: 'exp-1',
        position: 'Senior Full-Stack Engineer',
        company: 'FinTech Solutions GmbH',
        city: 'Berlin',
        country: 'Deutschland',
        startDate: '03/2022',
        endDate: 'Heute',
        current: true,
        bullets: [
          'Leitung der Entwicklung einer hochverfügbaren Zahlungs-API mit über 500.000 täglichen Transaktionen.',
          'Reduzierung der API-Latenz um 42% durch Migration auf Go-Microservices und Redis-Caching.',
          'Mentoring von 4 Junior- und Mid-Level Entwicklern sowie Einführung von CI/CD-Pipelines mit GitHub Actions.'
        ],
        technologies: ['TypeScript', 'React', 'Go', 'PostgreSQL', 'Docker', 'AWS']
      },
      {
        id: 'exp-2',
        position: 'Software Developer',
        company: 'DataMetrics Technologies AG',
        city: 'München',
        country: 'Deutschland',
        startDate: '09/2018',
        endDate: '02/2022',
        current: false,
        bullets: [
          'Entwicklung interaktiver Analyse-Dashboards für Unternehmenskunden mit React und D3.js.',
          'Optimierung komplexer SQL-Abfragen, wodurch Berichtslaufzeiten von 12 Minuten auf 45 Sekunden sanken.',
          'Aufbau automatisierter E2E-Tests mit Playwright zur Sicherstellung der Softwarequalität.'
        ],
        technologies: ['JavaScript', 'React', 'Node.js', 'Python', 'PostgreSQL']
      }
    ],
    education: [
      {
        id: 'edu-1',
        degree: 'Master of Science (M.Sc.) Informatik',
        institution: 'Technische Universität Berlin',
        city: 'Berlin',
        startDate: '10/2016',
        endDate: '08/2018',
        grade: 'Sehr gut (1,3)',
        thesis: 'Verteilte Konsensus-Algorithmen in latenzkritischen Netzwerken'
      },
      {
        id: 'edu-2',
        degree: 'Bachelor of Science (B.Sc.) Angewandte Informatik',
        institution: 'Universität Hamburg',
        city: 'Hamburg',
        startDate: '10/2013',
        endDate: '07/2016',
        grade: 'Gut (1,7)',
        thesis: 'Entwicklung einer reaktiven Single-Page-Application für Geodaten'
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
        'REST & GraphQL APIs',
        'Git & CI/CD Pipelines'
      ],
      languages: [
        { language: 'Deutsch', level: 'Muttersprache / Native' },
        { language: 'Englisch', level: 'C1 – Verhandlungssicher / Fluent' },
        { language: 'Französisch', level: 'B1 – Gute Grundkenntnisse' }
      ],
      tools: ['VS Code', 'Docker Desktop', 'Figma', 'Postman', 'Jira / Confluence'],
      interests: ['Open-Source-Entwicklung', 'Langstreckenlauf', 'Schach']
    },
    certifications: [
      {
        id: 'cert-1',
        name: 'AWS Certified Solutions Architect – Associate',
        issuer: 'Amazon Web Services',
        year: '2023'
      },
      {
        id: 'cert-2',
        name: 'Certified Kubernetes Application Developer (CKAD)',
        issuer: 'Linux Foundation',
        year: '2022'
      }
    ],
    projects: [
      {
        id: 'proj-1',
        name: 'OpenCV-Engine',
        description: 'Open-Source Bibliothek zur automatisierten Validierung europäischer Lebenslauf-Standards.',
        technologies: 'TypeScript, TailwindCSS',
        link: 'https://github.com/maxschmidt/opencv-engine'
      }
    ],
    signature: {
      place: 'Berlin',
      date: '24.11.2026',
      signeeName: 'Maximilian Schmidt'
    }
  };
}

export function validateCV(cv) {
  const errors = [];
  if (!cv) {
    return { valid: false, errors: ['CV-Objekt darf nicht leer sein.'] };
  }
  if (!cv.personal?.firstName?.trim()) {
    errors.push('Vorname ist erforderlich.');
  }
  if (!cv.personal?.lastName?.trim()) {
    errors.push('Nachname ist erforderlich.');
  }
  if (!cv.personal?.email?.trim()) {
    errors.push('E-Mail-Adresse ist erforderlich.');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cv.personal.email)) {
    errors.push('E-Mail-Adresse hat ein ungültiges Format.');
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
