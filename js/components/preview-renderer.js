/**
 * Direct-Manipulation WYSIWYG Preview Renderer
 * Renders European CV templates as live, directly-editable typography on A4 paper.
 * Supports custom section ordering, localization (en/de/fr), and regional compliance.
 */

import { TEMPLATE_IDS, normalizeSectionOrder, isSafePhotoUrl } from '../model/cv-schema.js';
import { adaptCVForCountry } from '../engines/country-rules.js';

const VALID_PREVIEW_TEMPLATES = new Set(Object.values(TEMPLATE_IDS));

export function renderCVPreview(cv, containerElement) {
  if (!containerElement || !cv || typeof cv !== 'object') return;

  const rawCountry = typeof cv.meta?.targetCountry === 'string' ? cv.meta.targetCountry : 'DE';
  const adaptedCV = adaptCVForCountry(cv, rawCountry);
  const countryCode = adaptedCV.meta?.targetCountry || 'DE';

  const rawTpl = adaptedCV.meta?.template;
  const templateId = VALID_PREVIEW_TEMPLATES.has(rawTpl) ? rawTpl : TEMPLATE_IDS.GERMAN_DIN;
  const spacingMode = ['compact', 'normal', 'spacious'].includes(adaptedCV.meta?.spacing)
    ? adaptedCV.meta.spacing
    : 'normal';
  const spacingClass = spacingMode !== 'normal' ? `spacing-${spacingMode}` : '';

  const rawLang = typeof adaptedCV.meta?.language === 'string' ? adaptedCV.meta.language.trim().toLowerCase() : '';
  const docLang = ['en', 'de', 'fr', 'ru', 'uz'].includes(rawLang) ? rawLang : 'en';
  const rawAccent = typeof adaptedCV.meta?.accentColor === 'string' ? adaptedCV.meta.accentColor.trim() : '';
  const safeAccent = /^#[0-9a-f]{3,8}$/i.test(rawAccent) ? rawAccent : '#1e3a8a';

  containerElement.setAttribute('lang', docLang);
  containerElement.className = `a4-sheet template-${templateId} country-${countryCode.toLowerCase()} ${spacingClass}`.trim();
  containerElement.style.setProperty('--cv-accent', safeAccent);

  const L = getLocalizedLabels(adaptedCV);
  const headerHTML = buildTemplateHeaderHTML(adaptedCV, templateId, L);
  const sectionOrder = normalizeSectionOrder(adaptedCV.meta?.sectionOrder);
  const effectiveOrder = sectionOrder.includes('additional')
    ? sectionOrder
    : [...sectionOrder, 'additional'];
  const sectionsHTML = effectiveOrder
    .map(sectionId => buildSectionHTML(sectionId, adaptedCV, L, templateId))
    .filter(Boolean)
    .join('');

  const signatureHTML = buildSignatureHTML(adaptedCV, templateId);
  containerElement.innerHTML = `${headerHTML}${sectionsHTML}${signatureHTML}`;
}

function formatDateRange(startDate, endDate, current, presentLabel) {
  const start = typeof startDate === 'string' ? startDate.trim() : '';
  const end = typeof endDate === 'string' ? endDate.trim() : '';
  const resolvedEnd = end || (current ? presentLabel : '');
  if (start && resolvedEnd) return `${start} – ${resolvedEnd}`;
  return start || resolvedEnd || '';
}

function getLocalizedLabels(cv) {
  const lang = cv.meta?.language || 'en';
  const countryCode = cv.meta?.targetCountry || 'DE';
  const isUK = countryCode === 'UK';
  const useCitizenship = countryCode === 'RU' || countryCode === 'UZ';

  if (lang === 'de') {
    return {
      experience: 'Berufserfahrung',
      education: 'Ausbildung & Studium',
      skills: 'Kenntnisse & Qualifikationen',
      languages: 'Sprachkenntnisse (GER / CEFR)',
      projects: 'Ausgewählte Projekte',
      certifications: 'Zertifizierungen',
      additional: 'Weitere Angaben',
      projectTag: 'Projekt',
      addExp: '+ Station hinzufügen',
      addEdu: '+ Abschluss hinzufügen',
      email: 'E-Mail:',
      phone: 'Tel:',
      telegram: 'Telegram:',
      location: 'Wohnort:',
      birth: 'Geburtsdatum:',
      nationality: useCitizenship ? 'Staatsangehörigkeit:' : 'Staatsangehörigkeit:',
      workPermission: 'Arbeitserlaubnis:',
      maritalStatus: 'Familienstand:',
      gender: 'Geschlecht:',
      desiredSalary: 'Gehaltswunsch:',
      drivingLicence: 'Führerschein:',
      businessTrips: 'Dienstreisen:',
      relocation: 'Umzugsbereitschaft:',
      nativeLabel: 'Native / Bilingual',
      grade: 'Abschlussnote:',
      present: 'Heute'
    };
  }

  if (lang === 'fr') {
    return {
      experience: 'Expériences professionnelles',
      education: 'Formation & Diplômes',
      skills: 'Compétences & Technologies',
      languages: 'Langues (CECRL)',
      projects: 'Projets',
      certifications: 'Certifications',
      additional: 'Informations complémentaires',
      projectTag: 'Projet',
      addExp: '+ Ajouter une expérience',
      addEdu: '+ Ajouter une formation',
      email: 'E-mail :',
      phone: 'Tél :',
      telegram: 'Telegram :',
      location: 'Ville :',
      birth: 'Date de naissance :',
      nationality: 'Nationalité :',
      workPermission: 'Autorisation de travail :',
      maritalStatus: 'Situation familiale :',
      gender: 'Genre :',
      desiredSalary: 'Prétentions salariales :',
      drivingLicence: 'Permis de conduire :',
      businessTrips: 'Déplacements :',
      relocation: 'Mobilité :',
      nativeLabel: 'Native / Bilingual',
      grade: 'Mention :',
      present: 'Présent'
    };
  }

  if (lang === 'ru') {
    return {
      experience: 'Опыт работы',
      education: 'Образование',
      skills: 'Навыки',
      languages: 'Языки',
      projects: 'Проекты',
      certifications: 'Сертификаты',
      additional: 'Дополнительная информация',
      projectTag: 'Проект',
      addExp: '+ Добавить опыт',
      addEdu: '+ Добавить образование',
      email: 'Эл. почта:',
      phone: 'Тел:',
      telegram: 'Telegram:',
      location: 'Город:',
      birth: 'Дата рождения:',
      nationality: 'Гражданство:',
      workPermission: 'Разрешение на работу:',
      maritalStatus: 'Семейное положение:',
      gender: 'Пол:',
      desiredSalary: 'Желаемая зарплата:',
      drivingLicence: 'Водительские права:',
      businessTrips: 'Командировки:',
      relocation: 'Готовность к переезду:',
      nativeLabel: 'Родной',
      grade: 'Оценка:',
      present: 'по настоящее время'
    };
  }

  if (lang === 'uz') {
    return {
      experience: 'Ish tajribasi',
      education: 'Taʼlim',
      skills: 'Koʻnikmalar',
      languages: 'Tillar',
      projects: 'Loyihalar',
      certifications: 'Sertifikatlar',
      additional: 'Qoʻshimcha maʼlumotlar',
      projectTag: 'Loyiha',
      addExp: '+ Tajriba qoʻshish',
      addEdu: '+ Taʼlim qoʻshish',
      email: 'Elektron pochta:',
      phone: 'Tel:',
      telegram: 'Telegram:',
      location: 'Shahar:',
      birth: 'Tugʻilgan sana:',
      nationality: 'Fuqarolik:',
      workPermission: 'Ishlash uchun ruxsatnoma:',
      maritalStatus: 'Oilaviy ahvoli:',
      gender: 'Jinsi:',
      desiredSalary: 'Kutilayotgan maosh:',
      drivingLicence: 'Haydovchilik guvohnomasi:',
      businessTrips: 'Xizmat safarlari:',
      relocation: 'Koʻchib oʻtishga tayyorlik:',
      nativeLabel: 'Ona tili',
      grade: 'Baho:',
      present: 'hozirgacha'
    };
  }

  return {
    experience: isUK ? 'Employment History' : 'Professional Experience',
    education: 'Education & Qualifications',
    skills: 'Key Competencies & Technologies',
    languages: 'Languages (CEFR)',
    projects: 'Selected Projects',
    certifications: 'Certifications',
    additional: 'Additional Information',
    projectTag: 'Project',
    addExp: '+ Add Position',
    addEdu: '+ Add Degree',
    email: 'Email:',
    phone: 'Phone:',
    telegram: 'Telegram:',
    location: 'Location:',
    birth: 'Date of Birth:',
    nationality: useCitizenship ? 'Citizenship:' : 'Nationality:',
    workPermission: 'Work permission:',
    maritalStatus: 'Marital status:',
    gender: 'Gender:',
    desiredSalary: 'Desired salary:',
    drivingLicence: 'Driving licence:',
    businessTrips: 'Business trips:',
    relocation: 'Willing to relocate:',
    nativeLabel: 'Native / Bilingual',
    grade: 'Grade:',
    present: 'Present'
  };
}

function buildPhotoPlaceholderSVG() {
  return `
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4"></circle>
      <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"></path>
    </svg>
  `;
}

function buildTemplateHeaderHTML(cv, templateId, L) {
  const p = cv.personal && typeof cv.personal === 'object' ? cv.personal : {};
  const rules = cv.rules || {};
  const meta = cv.meta || {};
  const first = typeof p.firstName === 'string' ? p.firstName : '';
  const patronymic = (meta.showPatronymic && typeof p.patronymic === 'string' && p.patronymic.trim()) ? p.patronymic.trim() : '';
  const last = typeof p.lastName === 'string' ? p.lastName : '';
  const fullName = [first, patronymic, last].filter(Boolean).map(escapePreviewHTML).join(' ').trim() || 'Your Name';
  const roleTitle = (typeof p.title === 'string' && p.title.trim()) ? escapePreviewHTML(p.title) : 'Target Job Title';

  const extraMetaItems = [];
  if (rules.allowBirthDate && typeof p.birthDate === 'string' && p.birthDate.trim()) {
    extraMetaItems.push({ label: L.birth, val: p.birthDate, bind: 'personal.birthDate', aria: 'Date of birth' });
  }
  if (rules.allowNationality && typeof p.nationality === 'string' && p.nationality.trim()) {
    extraMetaItems.push({ label: L.nationality, val: p.nationality, bind: 'personal.nationality', aria: 'Citizenship or nationality' });
  }
  if ((rules.allowWorkPermission || meta.showWorkPermission) && typeof p.workPermission === 'string' && p.workPermission.trim()) {
    extraMetaItems.push({ label: L.workPermission, val: p.workPermission, bind: 'personal.workPermission', aria: 'Work permission' });
  }
  if (meta.showMaritalStatus && (typeof p.maritalStatus === 'string' && p.maritalStatus.trim() || typeof p.children === 'string' && p.children.trim())) {
    const combined = [p.maritalStatus, p.children].filter(v => typeof v === 'string' && v.trim()).join(', ');
    extraMetaItems.push({ label: L.maritalStatus, val: combined, bind: 'personal.maritalStatus', aria: 'Marital status' });
  }
  if (meta.showGender && typeof p.gender === 'string' && p.gender.trim()) {
    extraMetaItems.push({ label: L.gender, val: p.gender, bind: 'personal.gender', aria: 'Gender' });
  }
  if (meta.showSalary && typeof p.desiredSalary === 'string' && p.desiredSalary.trim()) {
    extraMetaItems.push({ label: L.desiredSalary, val: p.desiredSalary, bind: 'personal.desiredSalary', aria: 'Desired salary' });
  }

  if (templateId === TEMPLATE_IDS.MINIMAL_SWISS) {
    return `
      <header class="swiss-header">
        <h1 class="applicant-name" contenteditable="true" role="textbox" aria-label="Full name" data-bind="personal.fullName">${fullName}</h1>
        <div class="applicant-title" contenteditable="true" role="textbox" aria-label="Target job title" data-bind="personal.title">${roleTitle}</div>
        <div style="display: flex; flex-wrap: wrap; gap: 10pt 14pt; font-size: 8.5pt; color: #475569; margin-top: 6pt;">
          ${typeof p.email === 'string' && p.email ? `<span contenteditable="true" role="textbox" aria-label="Email address" data-bind="personal.email">${escapePreviewHTML(p.email)}</span>` : ''}
          ${typeof p.phone === 'string' && p.phone ? `<span contenteditable="true" role="textbox" aria-label="Phone number" data-bind="personal.phone">${escapePreviewHTML(p.phone)}</span>` : ''}
          ${typeof p.telegram === 'string' && p.telegram ? `<span contenteditable="true" role="textbox" aria-label="Telegram handle" data-bind="personal.telegram">${escapePreviewHTML(p.telegram)}</span>` : ''}
          ${typeof p.city === 'string' && p.city ? `<span contenteditable="true" role="textbox" aria-label="Location" data-bind="personal.city">${escapePreviewHTML(p.city)}</span>` : ''}
          ${typeof p.linkedin === 'string' && p.linkedin ? `<span contenteditable="true" role="textbox" aria-label="LinkedIn profile" data-bind="personal.linkedin">${escapePreviewHTML(p.linkedin)}</span>` : ''}
          ${extraMetaItems.map(it => `<span><strong>${it.label}</strong> <span contenteditable="true" role="textbox" aria-label="${it.aria}" data-bind="${it.bind}">${escapePreviewHTML(it.val)}</span></span>`).join('')}
        </div>
      </header>
    `;
  }

  if (templateId === TEMPLATE_IDS.MODERN_EUROPEAN) {
    const items = [
      typeof p.city === 'string' && p.city ? `<span contenteditable="true" role="textbox" aria-label="Location" data-bind="personal.city">${escapePreviewHTML(p.city)}</span>` : '',
      typeof p.email === 'string' && p.email ? `<span contenteditable="true" role="textbox" aria-label="Email address" data-bind="personal.email">${escapePreviewHTML(p.email)}</span>` : '',
      typeof p.phone === 'string' && p.phone ? `<span contenteditable="true" role="textbox" aria-label="Phone number" data-bind="personal.phone">${escapePreviewHTML(p.phone)}</span>` : '',
      typeof p.telegram === 'string' && p.telegram ? `<span contenteditable="true" role="textbox" aria-label="Telegram handle" data-bind="personal.telegram">${escapePreviewHTML(p.telegram)}</span>` : '',
      typeof p.linkedin === 'string' && p.linkedin ? `<span contenteditable="true" role="textbox" aria-label="LinkedIn profile" data-bind="personal.linkedin">${escapePreviewHTML(p.linkedin)}</span>` : ''
    ].filter(Boolean).join(' · ');
    const extraLine = extraMetaItems.length
      ? `<div style="font-size: 8pt; color: #4b5563; margin-top: 3pt;">${extraMetaItems.map(it => `<span><strong>${it.label}</strong> ${escapePreviewHTML(it.val)}</span>`).join(' · ')}</div>`
      : '';

    return `
      <header style="text-align: center; border-bottom: 0.5pt solid #111827; padding-bottom: 12pt; margin-bottom: 14pt;">
        <h1 class="applicant-name" contenteditable="true" role="textbox" aria-label="Full name" data-bind="personal.fullName">${fullName}</h1>
        <div class="applicant-title" contenteditable="true" role="textbox" aria-label="Target job title" data-bind="personal.title">${roleTitle}</div>
        <div style="font-size: 8.3pt; color: #4b5563; letter-spacing: 0.02em; margin-top: 4pt;">${items}</div>
        ${extraLine}
      </header>
    `;
  }

  // Frankfurt DIN 5008 default header
  const contactParts = [];
  if (typeof p.email === 'string' && p.email) {
    contactParts.push(`<span class="contact-meta-item"><strong>${L.email}</strong> <span contenteditable="true" role="textbox" aria-label="Email address" data-bind="personal.email">${escapePreviewHTML(p.email)}</span></span>`);
  }
  if (typeof p.phone === 'string' && p.phone) {
    contactParts.push(`<span class="contact-meta-item"><strong>${L.phone}</strong> <span contenteditable="true" role="textbox" aria-label="Phone number" data-bind="personal.phone">${escapePreviewHTML(p.phone)}</span></span>`);
  }
  if (typeof p.telegram === 'string' && p.telegram) {
    contactParts.push(`<span class="contact-meta-item"><strong>${L.telegram}</strong> <span contenteditable="true" role="textbox" aria-label="Telegram handle" data-bind="personal.telegram">${escapePreviewHTML(p.telegram)}</span></span>`);
  }
  if (typeof p.city === 'string' && p.city) {
    contactParts.push(`<span class="contact-meta-item"><strong>${L.location}</strong> <span contenteditable="true" role="textbox" aria-label="Location" data-bind="personal.city">${escapePreviewHTML(p.city)}</span></span>`);
  }
  for (const it of extraMetaItems) {
    contactParts.push(`<span class="contact-meta-item"><strong>${it.label}</strong> <span contenteditable="true" role="textbox" aria-label="${it.aria}" data-bind="${it.bind}">${escapePreviewHTML(it.val)}</span></span>`);
  }
  if (typeof p.linkedin === 'string' && p.linkedin) {
    contactParts.push(`<span class="contact-meta-item"><strong>LinkedIn:</strong> <span contenteditable="true" role="textbox" aria-label="LinkedIn profile" data-bind="personal.linkedin">${escapePreviewHTML(p.linkedin)}</span></span>`);
  }

  let photoHTML = '';
  if (rules.allowPhoto && cv.meta?.showPhoto) {
    const rawPhoto = typeof p.photoUrl === 'string' ? p.photoUrl.trim() : '';
    const hasSafePhoto = Boolean(rawPhoto && isSafePhotoUrl(rawPhoto));
    photoHTML = hasSafePhoto
      ? `<div class="photo-slot"><img src="${escapePreviewHTML(rawPhoto)}" alt="Applicant portrait"></div>`
      : `<div class="photo-slot photo-slot-empty no-print">${buildPhotoPlaceholderSVG()}</div>`;
  }

  return `
    <header class="cv-header">
      <div style="flex: 1;">
        <h1 class="applicant-name" contenteditable="true" role="textbox" aria-label="Full name" data-bind="personal.fullName">${fullName}</h1>
        <div class="applicant-title" contenteditable="true" role="textbox" aria-label="Target job title" data-bind="personal.title">${roleTitle}</div>
        <div class="contact-meta-row">${contactParts.join('')}</div>
      </div>
      ${photoHTML}
    </header>
  `;
}

function buildSectionHTML(sectionId, cv, L, templateId) {
  switch (sectionId) {
    case 'summary':
      return buildSummarySectionHTML(cv, templateId);
    case 'experience':
      return buildExperienceSectionHTML(cv, L, templateId);
    case 'education':
      return buildEducationSectionHTML(cv, L, templateId);
    case 'skills':
      return buildSkillsSectionHTML(cv, L);
    case 'languages':
      return buildLanguagesSectionHTML(cv, L);
    case 'projects':
      return buildProjectsSectionHTML(cv, L);
    case 'certifications':
      return buildCertificationsSectionHTML(cv, L);
    case 'additional':
      return buildAdditionalSectionHTML(cv, L);
    default:
      return '';
  }
}

function buildSummarySectionHTML(cv, templateId) {
  const summaryText = typeof cv.summary === 'string' ? cv.summary : '';
  if (!summaryText.trim()) return '';
  const isItalic = templateId === TEMPLATE_IDS.MODERN_EUROPEAN ? 'font-style: italic;' : '';
  const color = templateId === TEMPLATE_IDS.MINIMAL_SWISS ? '#334155' : '#374151';
  const fontSize = templateId === TEMPLATE_IDS.MINIMAL_SWISS ? '9pt' : '9.2pt';
  return `
    <section class="cv-section" data-section-id="summary">
      <p style="font-size: ${fontSize}; color: ${color}; line-height: 1.5; margin-bottom: 10pt; ${isItalic}" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Professional summary" data-bind="summary">${escapePreviewHTML(summaryText)}</p>
    </section>
  `;
}

function buildExperienceSectionHTML(cv, L, templateId) {
  const isSwiss = templateId === TEMPLATE_IDS.MINIMAL_SWISS;
  const isParis = templateId === TEMPLATE_IDS.MODERN_EUROPEAN;
  const rawExperiences = Array.isArray(cv.experience) ? cv.experience : [];

  const expHTML = rawExperiences.map((exp, idx) => {
    if (!exp || typeof exp !== 'object' || Array.isArray(exp)) return '';
    const dateRange = formatDateRange(exp.startDate, exp.endDate, Boolean(exp.current), L.present);
    const position = typeof exp.position === 'string' ? exp.position : '';
    const company = typeof exp.company === 'string' ? exp.company : '';
    const city = typeof exp.city === 'string' ? exp.city : '';
    const bullets = Array.isArray(exp.bullets) ? exp.bullets : [];
    const techs = (Array.isArray(exp.technologies) ? exp.technologies : [])
      .filter(t => typeof t === 'string' && t.trim());

    const bulletsHTML = bullets.map((bullet, bIdx) => {
      if (typeof bullet !== 'string' && typeof bullet !== 'number') return '';
      return `<li><span contenteditable="true" role="textbox" aria-label="Achievement ${bIdx + 1} for position ${idx + 1}" data-exp-bullet="${idx}:${bIdx}">${escapePreviewHTML(String(bullet))}</span></li>`;
    }).filter(Boolean).join('');

    return `
      <div class="entry-row item-block" data-exp-idx="${idx}">
        <div class="entry-dates" contenteditable="true" role="textbox" aria-label="Dates for position ${idx + 1}" data-exp-field="dateRange" data-idx="${idx}">${escapePreviewHTML(dateRange)}</div>
        <div>
          ${isSwiss
            ? `<div class="entry-role"><span contenteditable="true" role="textbox" aria-label="Job title for position ${idx + 1}" data-exp-field="position" data-idx="${idx}">${escapePreviewHTML(position)}</span> · <span contenteditable="true" role="textbox" aria-label="Company for position ${idx + 1}" data-exp-field="company" data-idx="${idx}">${escapePreviewHTML(company)}</span></div>`
            : `<div class="entry-role" contenteditable="true" role="textbox" aria-label="Job title for position ${idx + 1}" data-exp-field="position" data-idx="${idx}">${escapePreviewHTML(position)}</div>
               <div class="entry-institution"><span contenteditable="true" role="textbox" aria-label="Company for position ${idx + 1}" data-exp-field="company" data-idx="${idx}">${escapePreviewHTML(company)}</span>${city ? ` · <span contenteditable="true" role="textbox" aria-label="City for position ${idx + 1}" data-exp-field="city" data-idx="${idx}">${escapePreviewHTML(city)}</span>` : ''}</div>`
          }
          <ul class="bullet-list" ${isSwiss ? 'style="padding-left: 12pt; margin-top: 3pt; font-size: 8.5pt; color: #334155;"' : isParis ? 'style="padding-left: 12pt; font-size: 8.8pt; color: #374151;"' : ''}>
            ${bulletsHTML}
          </ul>
          ${(!isSwiss && !isParis && techs.length) ? `
            <div class="skills-matrix">
              ${techs.map(t => `<span class="skill-pill">${escapePreviewHTML(t)}</span>`).join('')}
            </div>
          ` : ''}
        </div>
        <div class="item-actions no-print">
          <button type="button" class="item-action-btn" title="Add bullet" aria-label="Add achievement bullet to position ${idx + 1}" data-add-bullet="${idx}">+</button>
          <button type="button" class="item-action-btn delete" title="Delete entry" aria-label="Delete position ${idx + 1}" data-delete-exp="${idx}">×</button>
        </div>
      </div>
    `;
  }).filter(Boolean).join('');

  return `
    <section class="cv-section" data-section-id="experience">
      <h2 class="section-heading">${L.experience}</h2>
      ${expHTML || '<p style="font-size: 8.5pt; color: #64748b; font-style: italic;">No positions added yet.</p>'}
      <div class="no-print"><button type="button" class="add-item-trigger" id="btn-trigger-add-exp">${L.addExp}</button></div>
    </section>
  `;
}

function buildEducationSectionHTML(cv, L, templateId) {
  const isSwiss = templateId === TEMPLATE_IDS.MINIMAL_SWISS;
  const isParis = templateId === TEMPLATE_IDS.MODERN_EUROPEAN;
  const rawEducation = Array.isArray(cv.education) ? cv.education : [];

  const eduHTML = rawEducation.map((edu, idx) => {
    if (!edu || typeof edu !== 'object' || Array.isArray(edu)) return '';
    const dateRange = formatDateRange(edu.startDate, edu.endDate, Boolean(edu.current), L.present);
    const degree = typeof edu.degree === 'string' ? edu.degree : '';
    const institution = typeof edu.institution === 'string' ? edu.institution : '';
    const city = typeof edu.city === 'string' ? edu.city : '';
    const grade = typeof edu.grade === 'string' ? edu.grade : '';

    return `
      <div class="entry-row item-block" data-edu-idx="${idx}">
        <div class="entry-dates" contenteditable="true" role="textbox" aria-label="Study dates for education ${idx + 1}" data-edu-field="dateRange" data-idx="${idx}">${escapePreviewHTML(dateRange)}</div>
        <div>
          ${isSwiss
            ? `<div class="entry-role"><span contenteditable="true" role="textbox" aria-label="Degree for education ${idx + 1}" data-edu-field="degree" data-idx="${idx}">${escapePreviewHTML(degree)}</span> · <span contenteditable="true" role="textbox" aria-label="Institution for education ${idx + 1}" data-edu-field="institution" data-idx="${idx}">${escapePreviewHTML(institution)}</span></div>
               ${grade ? `<div style="font-size: 8.2pt; color: #475569;">${L.grade} <span contenteditable="true" role="textbox" aria-label="Grade for education ${idx + 1}" data-edu-field="grade" data-idx="${idx}">${escapePreviewHTML(grade)}</span></div>` : ''}`
            : `<div class="entry-role" contenteditable="true" role="textbox" aria-label="Degree for education ${idx + 1}" data-edu-field="degree" data-idx="${idx}">${escapePreviewHTML(degree)}</div>
               <div class="entry-institution"><span contenteditable="true" role="textbox" aria-label="Institution for education ${idx + 1}" data-edu-field="institution" data-idx="${idx}">${escapePreviewHTML(institution)}</span>${isParis && grade ? ` · ${L.grade} <span contenteditable="true" role="textbox" aria-label="Grade for education ${idx + 1}" data-edu-field="grade" data-idx="${idx}">${escapePreviewHTML(grade)}</span>` : (!isParis && city ? ` · <span contenteditable="true" role="textbox" aria-label="City for education ${idx + 1}" data-edu-field="city" data-idx="${idx}">${escapePreviewHTML(city)}</span>` : '')}</div>
               ${(!isParis && grade) ? `<div style="font-size: 8.2pt; color: #4b5563;">${L.grade} <strong contenteditable="true" role="textbox" aria-label="Grade for education ${idx + 1}" data-edu-field="grade" data-idx="${idx}">${escapePreviewHTML(grade)}</strong></div>` : ''}`
          }
        </div>
        <div class="item-actions no-print">
          <button type="button" class="item-action-btn delete" title="Delete entry" aria-label="Delete education entry ${idx + 1}" data-delete-edu="${idx}">×</button>
        </div>
      </div>
    `;
  }).filter(Boolean).join('');

  return `
    <section class="cv-section" data-section-id="education">
      <h2 class="section-heading">${L.education}</h2>
      ${eduHTML || '<p style="font-size: 8.5pt; color: #64748b; font-style: italic;">No degrees added yet.</p>'}
      <div class="no-print"><button type="button" class="add-item-trigger" id="btn-trigger-add-edu">${L.addEdu}</button></div>
    </section>
  `;
}

function buildSkillsSectionHTML(cv, L) {
  const skills = (Array.isArray(cv.skills?.technical) ? cv.skills.technical : [])
    .filter(s => typeof s === 'string' && s.trim());
  return `
    <section class="cv-section" data-section-id="skills">
      <h2 class="section-heading">${L.skills}</h2>
      <div class="skills-matrix">
        ${skills.length
          ? skills.map(t => `<span class="skill-pill">${escapePreviewHTML(t)}</span>`).join('')
          : '<span style="font-size: 8.5pt; color: #64748b; font-style: italic;">Add technical competencies in the editor.</span>'}
      </div>
    </section>
  `;
}

function buildLanguagesSectionHTML(cv, L) {
  const langs = (Array.isArray(cv.skills?.languages) ? cv.skills.languages : [])
    .filter(l => l && typeof l === 'object' && !Array.isArray(l));
  if (!langs.length) return '';
  return `
    <section class="cv-section" data-section-id="languages">
      <h2 class="section-heading">${L.languages}</h2>
      <div class="lang-grid">
        ${langs.map(l => {
          const rawLvl = typeof l.level === 'string' ? l.level : '';
          const displayLvl = /^native/i.test(rawLvl.trim()) ? L.nativeLabel : rawLvl;
          return `
          <div class="lang-item">
            <span class="lang-name">${escapePreviewHTML(typeof l.language === 'string' ? l.language : '')}</span>
            <span class="lang-level">${escapePreviewHTML(displayLvl)}</span>
          </div>
        `;
        }).join('')}
      </div>
    </section>
  `;
}

function buildProjectsSectionHTML(cv, L) {
  const projects = (Array.isArray(cv.projects) ? cv.projects : [])
    .filter(proj => proj && typeof proj === 'object' && !Array.isArray(proj));
  if (!projects.length) return '';
  return `
    <section class="cv-section" data-section-id="projects">
      <h2 class="section-heading">${L.projects}</h2>
      ${projects.map(proj => {
        const name = typeof proj.name === 'string' ? proj.name : '';
        const description = typeof proj.description === 'string' ? proj.description : '';
        const technologies = typeof proj.technologies === 'string' ? proj.technologies.trim() : '';
        const leftLabel = typeof proj.year === 'string' && proj.year.trim() ? proj.year.trim() : L.projectTag;
        return `
          <div class="entry-row item-block">
            <div class="entry-dates">${escapePreviewHTML(leftLabel)}</div>
            <div>
              <div class="entry-role">${escapePreviewHTML(name)}</div>
              ${description ? `<div class="entry-institution">${escapePreviewHTML(description)}</div>` : ''}
              ${technologies ? `<div class="proj-tech-line">${escapePreviewHTML(technologies)}</div>` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </section>
  `;
}

function buildCertificationsSectionHTML(cv, L) {
  const certs = (Array.isArray(cv.certifications) ? cv.certifications : [])
    .filter(cert => cert && typeof cert === 'object' && !Array.isArray(cert));
  if (!certs.length) return '';
  return `
    <section class="cv-section" data-section-id="certifications">
      <h2 class="section-heading">${L.certifications}</h2>
      ${certs.map(cert => `
        <div class="entry-row item-block">
          <div class="entry-dates">${escapePreviewHTML(cert.year !== undefined && cert.year !== null ? String(cert.year) : '')}</div>
          <div>
            <div class="entry-role">${escapePreviewHTML(typeof cert.name === 'string' ? cert.name : '')}</div>
            ${typeof cert.issuer === 'string' && cert.issuer ? `<div class="entry-institution">${escapePreviewHTML(cert.issuer)}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </section>
  `;
}

function buildAdditionalSectionHTML(cv, L) {
  const add = cv.additional && typeof cv.additional === 'object' ? cv.additional : {};
  const rows = [
    add.drivingLicence && typeof add.drivingLicence === 'string' && add.drivingLicence.trim()
      ? `<div class="lang-item"><span class="lang-name">${L.drivingLicence}</span><span class="lang-level">${escapePreviewHTML(add.drivingLicence)}</span></div>`
      : '',
    add.businessTrips && typeof add.businessTrips === 'string' && add.businessTrips.trim()
      ? `<div class="lang-item"><span class="lang-name">${L.businessTrips}</span><span class="lang-level">${escapePreviewHTML(add.businessTrips)}</span></div>`
      : '',
    add.relocation && typeof add.relocation === 'string' && add.relocation.trim()
      ? `<div class="lang-item"><span class="lang-name">${L.relocation}</span><span class="lang-level">${escapePreviewHTML(add.relocation)}</span></div>`
      : ''
  ].filter(Boolean);

  if (!rows.length) return '';
  return `
    <section class="cv-section" data-section-id="additional">
      <h2 class="section-heading">${L.additional}</h2>
      <div class="lang-grid">${rows.join('')}</div>
    </section>
  `;
}

function buildSignatureHTML(cv, templateId) {
  if (templateId !== TEMPLATE_IDS.GERMAN_DIN) return '';
  const p = cv.personal && typeof cv.personal === 'object' ? cv.personal : {};
  const rules = cv.rules || {};
  if (!rules.allowSignatureBlock || !cv.meta?.includeSignatureBlock) return '';

  const sigPlace = typeof cv.signature?.place === 'string' && cv.signature.place.trim() ? cv.signature.place : '';
  const pCity = typeof p.city === 'string' && p.city.trim() ? p.city : '';
  const place = sigPlace || pCity || 'Berlin';
  const date = (typeof cv.signature?.date === 'string' && cv.signature.date.trim())
    ? cv.signature.date
    : new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const sigName = typeof cv.signature?.signeeName === 'string' && cv.signature.signeeName.trim() ? cv.signature.signeeName : '';
  const pFirst = typeof p.firstName === 'string' ? p.firstName : '';
  const pLast = typeof p.lastName === 'string' ? p.lastName : '';
  const name = sigName || `${pFirst} ${pLast}`.trim();

  return `
    <div class="din-signature-block">
      <div>
        <span contenteditable="true" role="textbox" aria-label="Signature location" data-bind="signature.place">${escapePreviewHTML(place)}</span>,
        <span contenteditable="true" role="textbox" aria-label="Signature date" data-bind="signature.date">${escapePreviewHTML(date)}</span>
      </div>
      <div class="din-signature-line" contenteditable="true" role="textbox" aria-label="Signee name" data-bind="signature.signeeName">${escapePreviewHTML(name)}</div>
    </div>
  `;
}

function escapePreviewHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
