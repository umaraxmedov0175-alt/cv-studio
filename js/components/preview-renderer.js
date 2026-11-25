/**
 * Direct-Manipulation WYSIWYG Preview Renderer
 * Renders European CV templates as live, directly-editable typography on A4 paper.
 * Default language: English (with DIN 5008, Swiss grid, and French formatting).
 */

import { TEMPLATE_IDS } from '../model/cv-schema.js';
import { adaptCVForCountry } from '../engines/country-rules.js';

export function renderCVPreview(cv, containerElement) {
  if (!containerElement || !cv) return;

  const countryCode = cv.meta?.targetCountry || 'DE';
  const adaptedCV = adaptCVForCountry(cv, countryCode);

  const templateId = cv.meta?.template || TEMPLATE_IDS.GERMAN_DIN;
  const spacingMode = cv.meta?.spacing || 'normal';
  const spacingClass = spacingMode !== 'normal' ? `spacing-${spacingMode}` : '';

  containerElement.className = `a4-sheet template-${templateId} country-${countryCode.toLowerCase()} ${spacingClass}`.trim();
  containerElement.style.setProperty('--cv-accent', cv.meta?.accentColor || '#1e3a8a');

  switch (templateId) {
    case TEMPLATE_IDS.MODERN_EUROPEAN:
      containerElement.innerHTML = buildParisianEditorialHTML(adaptedCV);
      break;
    case TEMPLATE_IDS.MINIMAL_SWISS:
      containerElement.innerHTML = buildZurichModernistHTML(adaptedCV);
      break;
    case TEMPLATE_IDS.GERMAN_DIN:
    default:
      containerElement.innerHTML = buildFrankfurtDINHTML(adaptedCV);
      break;
  }
}

function getLocalizedLabels(cv) {
  const lang = cv.meta?.language || 'en';
  const countryCode = cv.meta?.targetCountry || 'DE';
  const isUK = countryCode === 'UK';

  if (lang === 'de') {
    return {
      experience: 'Berufserfahrung',
      education: 'Ausbildung & Studium',
      skills: 'Kenntnisse & Qualifikationen',
      languages: 'Sprachkenntnisse (GER / CEFR)',
      addExp: '+ Station hinzufügen',
      addEdu: '+ Abschluss hinzufügen',
      email: 'E-Mail:',
      phone: 'Tel:',
      location: 'Wohnort:',
      birth: 'Geburtsdatum:',
      nationality: 'Staatsangehörigkeit:',
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
      addExp: '+ Ajouter une expérience',
      addEdu: '+ Ajouter une formation',
      email: 'E-mail :',
      phone: 'Tél :',
      location: 'Ville :',
      birth: 'Date de naissance :',
      nationality: 'Nationalité :',
      grade: 'Mention :',
      present: 'Présent'
    };
  }

  // English default (accessible across all European markets)
  return {
    experience: isUK ? 'Employment History' : 'Professional Experience',
    education: 'Education & Qualifications',
    skills: 'Key Competencies & Technologies',
    languages: 'Languages (CEFR)',
    addExp: '+ Add Position',
    addEdu: '+ Add Degree',
    email: 'Email:',
    phone: 'Phone:',
    location: 'Location:',
    birth: 'Date of Birth:',
    nationality: 'Nationality:',
    grade: 'Grade:',
    present: 'Present'
  };
}

function buildPhotoPlaceholderSVG() {
  return `
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4"></circle>
      <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"></path>
    </svg>
  `;
}

function buildLanguagesSectionHTML(cv, L) {
  const langs = cv.skills?.languages || [];
  if (!langs.length) return '';
  return `
    <section class="cv-section">
      <h2 class="section-heading">${L.languages}</h2>
      <div class="lang-grid">
        ${langs.map(l => `
          <div class="lang-item">
            <span class="lang-name">${escapePreviewHTML(l.language || '')}</span>
            <span class="lang-level">${escapePreviewHTML(l.level || '')}</span>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

/**
 * 1. Frankfurt Executive (DIN 5008 Chronological Asymmetric)
 */
function buildFrankfurtDINHTML(cv) {
  const p = cv.personal || {};
  const rules = cv.rules || {};
  const countryCode = cv.meta?.targetCountry || 'DE';
  const isUK = countryCode === 'UK';
  const L = getLocalizedLabels(cv);

  // Contact Info Line
  const contactParts = [];
  if (p.email) contactParts.push(`<span class="contact-meta-item"><strong>${L.email}</strong> <span contenteditable="true" data-bind="personal.email">${escapePreviewHTML(p.email)}</span></span>`);
  if (p.phone) contactParts.push(`<span class="contact-meta-item"><strong>${L.phone}</strong> <span contenteditable="true" data-bind="personal.phone">${escapePreviewHTML(p.phone)}</span></span>`);
  if (p.city) contactParts.push(`<span class="contact-meta-item"><strong>${L.location}</strong> <span contenteditable="true" data-bind="personal.city">${escapePreviewHTML(p.city)}</span></span>`);

  if (!isUK && rules.allowBirthDate && p.birthDate) {
    contactParts.push(`<span class="contact-meta-item"><strong>${L.birth}</strong> <span contenteditable="true" data-bind="personal.birthDate">${escapePreviewHTML(p.birthDate)}</span></span>`);
  }
  if (!isUK && rules.allowNationality && p.nationality) {
    contactParts.push(`<span class="contact-meta-item"><strong>${L.nationality}</strong> <span contenteditable="true" data-bind="personal.nationality">${escapePreviewHTML(p.nationality)}</span></span>`);
  }
  if (p.linkedin) {
    contactParts.push(`<span class="contact-meta-item"><strong>LinkedIn:</strong> <span contenteditable="true" data-bind="personal.linkedin">${escapePreviewHTML(p.linkedin)}</span></span>`);
  }

  // Photo
  let photoHTML = '';
  if (!isUK && rules.allowPhoto && cv.meta?.showPhoto) {
    photoHTML = `
      <div class="photo-slot">
        ${p.photoUrl
          ? `<img src="${escapePreviewHTML(p.photoUrl)}" alt="Applicant portrait">`
          : buildPhotoPlaceholderSVG()
        }
      </div>
    `;
  }

  // Experience
  const expHTML = (cv.experience || []).map((exp, idx) => `
    <div class="entry-row item-block" data-exp-idx="${idx}">
      <div class="entry-dates" contenteditable="true" data-exp-field="dateRange" data-idx="${idx}">${escapePreviewHTML(exp.startDate || '')} – ${escapePreviewHTML(exp.endDate || (exp.current ? L.present : ''))}</div>
      <div>
        <div class="entry-role" contenteditable="true" data-exp-field="position" data-idx="${idx}">${escapePreviewHTML(exp.position || '')}</div>
        <div class="entry-institution"><span contenteditable="true" data-exp-field="company" data-idx="${idx}">${escapePreviewHTML(exp.company || '')}</span>${exp.city ? ` · <span contenteditable="true" data-exp-field="city" data-idx="${idx}">${escapePreviewHTML(exp.city)}</span>` : ''}</div>
        <ul class="bullet-list">
          ${(exp.bullets || []).map((bullet, bIdx) => `
            <li contenteditable="true" data-exp-bullet="${idx}:${bIdx}">${escapePreviewHTML(bullet)}</li>
          `).join('')}
        </ul>
        ${(exp.technologies || []).length ? `
          <div class="skills-matrix">
            ${exp.technologies.map(t => `<span class="skill-pill">${escapePreviewHTML(t)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
      <div class="item-actions no-print">
        <button class="item-action-btn" title="Add bullet" data-add-bullet="${idx}">+</button>
        <button class="item-action-btn delete" title="Delete entry" data-delete-exp="${idx}">×</button>
      </div>
    </div>
  `).join('');

  // Education
  const eduHTML = (cv.education || []).map((edu, idx) => `
    <div class="entry-row item-block" data-edu-idx="${idx}">
      <div class="entry-dates" contenteditable="true" data-edu-field="dateRange" data-idx="${idx}">${escapePreviewHTML(edu.startDate || '')} – ${escapePreviewHTML(edu.endDate || '')}</div>
      <div>
        <div class="entry-role" contenteditable="true" data-edu-field="degree" data-idx="${idx}">${escapePreviewHTML(edu.degree || '')}</div>
        <div class="entry-institution"><span contenteditable="true" data-edu-field="institution" data-idx="${idx}">${escapePreviewHTML(edu.institution || '')}</span>${edu.city ? ` · <span contenteditable="true" data-edu-field="city" data-idx="${idx}">${escapePreviewHTML(edu.city)}</span>` : ''}</div>
        ${edu.grade ? `<div style="font-size: 8.2pt; color: #6b7280;">${L.grade} <strong contenteditable="true" data-edu-field="grade" data-idx="${idx}">${escapePreviewHTML(edu.grade)}</strong></div>` : ''}
      </div>
      <div class="item-actions no-print">
        <button class="item-action-btn delete" title="Delete entry" data-delete-edu="${idx}">×</button>
      </div>
    </div>
  `).join('');

  // Signature Block (Formal European closing: Place, Date + Signature)
  let signatureHTML = '';
  if (!isUK && rules.allowSignatureBlock && cv.meta?.includeSignatureBlock) {
    const place = cv.signature?.place || p.city || 'Berlin';
    const date = cv.signature?.date || new Date().toLocaleDateString('en-GB');
    const name = cv.signature?.signeeName || `${p.firstName || ''} ${p.lastName || ''}`.trim();
    signatureHTML = `
      <div class="din-signature-block">
        <div>
          <span contenteditable="true" data-bind="signature.place">${escapePreviewHTML(place)}</span>, 
          <span contenteditable="true" data-bind="signature.date">${escapePreviewHTML(date)}</span>
        </div>
        <div class="din-signature-line" contenteditable="true" data-bind="signature.signeeName">${escapePreviewHTML(name)}</div>
      </div>
    `;
  }

  return `
    <header class="cv-header">
      <div style="flex: 1;">
        <h1 class="applicant-name" contenteditable="true" data-bind="personal.fullName">${escapePreviewHTML(p.firstName || '')} ${escapePreviewHTML(p.lastName || '')}</h1>
        <div class="applicant-title" contenteditable="true" data-bind="personal.title">${escapePreviewHTML(p.title || '')}</div>
        <div class="contact-meta-row">${contactParts.join('')}</div>
      </div>
      ${photoHTML}
    </header>

    <section class="cv-section">
      <p style="font-size: 9.2pt; color: #374151; line-height: 1.5; margin-bottom: 10pt;" contenteditable="true" data-bind="summary">${escapePreviewHTML(cv.summary || '')}</p>
    </section>

    <section class="cv-section">
      <h2 class="section-heading">${L.experience}</h2>
      ${expHTML}
      <div class="no-print"><span class="add-item-trigger" id="btn-trigger-add-exp">${L.addExp}</span></div>
    </section>

    <section class="cv-section">
      <h2 class="section-heading">${L.education}</h2>
      ${eduHTML}
      <div class="no-print"><span class="add-item-trigger" id="btn-trigger-add-edu">${L.addEdu}</span></div>
    </section>

    <section class="cv-section">
      <h2 class="section-heading">${L.skills}</h2>
      <div class="skills-matrix">
        ${(cv.skills?.technical || []).map(t => `<span class="skill-pill">${escapePreviewHTML(t)}</span>`).join('')}
      </div>
    </section>

    ${buildLanguagesSectionHTML(cv, L)}

    ${signatureHTML}
  `;
}

/**
 * 2. Zurich Modernist (Swiss Grid / Josef Müller-Brockmann)
 */
function buildZurichModernistHTML(cv) {
  const p = cv.personal || {};
  const L = getLocalizedLabels(cv);
  return `
    <header class="swiss-header">
      <h1 class="applicant-name" contenteditable="true" data-bind="personal.fullName">${escapePreviewHTML(p.firstName || '')} ${escapePreviewHTML(p.lastName || '')}</h1>
      <div class="applicant-title" contenteditable="true" data-bind="personal.title">${escapePreviewHTML(p.title || '')}</div>
      <div style="display: flex; flex-wrap: wrap; gap: 14pt; font-size: 8.5pt; color: #64748b; margin-top: 6pt;">
        <span contenteditable="true" data-bind="personal.email">${escapePreviewHTML(p.email || '')}</span>
        <span contenteditable="true" data-bind="personal.phone">${escapePreviewHTML(p.phone || '')}</span>
        <span contenteditable="true" data-bind="personal.city">${escapePreviewHTML(p.city || '')}</span>
        ${p.linkedin ? `<span contenteditable="true" data-bind="personal.linkedin">${escapePreviewHTML(p.linkedin)}</span>` : ''}
      </div>
    </header>

    <section class="cv-section">
      <p style="font-size: 9pt; color: #334155; line-height: 1.5; margin-bottom: 10pt;" contenteditable="true" data-bind="summary">${escapePreviewHTML(cv.summary || '')}</p>
    </section>

    <section class="cv-section">
      <h2 class="section-heading">${L.experience}</h2>
      ${(cv.experience || []).map((exp, idx) => `
        <div class="entry-row item-block">
          <div class="entry-dates" contenteditable="true" data-exp-field="dateRange" data-idx="${idx}">${escapePreviewHTML(exp.startDate || '')} – ${escapePreviewHTML(exp.endDate || (exp.current ? L.present : ''))}</div>
          <div>
            <div class="entry-role"><span contenteditable="true" data-exp-field="position" data-idx="${idx}">${escapePreviewHTML(exp.position || '')}</span> · <span contenteditable="true" data-exp-field="company" data-idx="${idx}">${escapePreviewHTML(exp.company || '')}</span></div>
            <ul class="bullet-list" style="padding-left: 12pt; margin-top: 3pt; font-size: 8.5pt; color: #334155;">
              ${(exp.bullets || []).map((b, bIdx) => `<li contenteditable="true" data-exp-bullet="${idx}:${bIdx}">${escapePreviewHTML(b)}</li>`).join('')}
            </ul>
          </div>
          <div class="item-actions no-print">
            <button class="item-action-btn" title="Add bullet" data-add-bullet="${idx}">+</button>
            <button class="item-action-btn delete" title="Delete entry" data-delete-exp="${idx}">×</button>
          </div>
        </div>
      `).join('')}
      <div class="no-print"><span class="add-item-trigger" id="btn-trigger-add-exp">${L.addExp}</span></div>
    </section>

    <section class="cv-section">
      <h2 class="section-heading">${L.education}</h2>
      ${(cv.education || []).map((edu, idx) => `
        <div class="entry-row item-block">
          <div class="entry-dates" contenteditable="true" data-edu-field="dateRange" data-idx="${idx}">${escapePreviewHTML(edu.startDate || '')} – ${escapePreviewHTML(edu.endDate || '')}</div>
          <div>
            <div class="entry-role"><span contenteditable="true" data-edu-field="degree" data-idx="${idx}">${escapePreviewHTML(edu.degree || '')}</span> · <span contenteditable="true" data-edu-field="institution" data-idx="${idx}">${escapePreviewHTML(edu.institution || '')}</span></div>
            ${edu.grade ? `<div style="font-size: 8.2pt; color: #64748b;">${L.grade} <span contenteditable="true" data-edu-field="grade" data-idx="${idx}">${escapePreviewHTML(edu.grade)}</span></div>` : ''}
          </div>
          <div class="item-actions no-print">
            <button class="item-action-btn delete" title="Delete entry" data-delete-edu="${idx}">×</button>
          </div>
        </div>
      `).join('')}
      <div class="no-print"><span class="add-item-trigger" id="btn-trigger-add-edu">${L.addEdu}</span></div>
    </section>

    <section class="cv-section">
      <h2 class="section-heading">${L.skills}</h2>
      <div class="skills-matrix">
        ${(cv.skills?.technical || []).map(t => `<span class="skill-pill">${escapePreviewHTML(t)}</span>`).join('')}
      </div>
    </section>

    ${buildLanguagesSectionHTML(cv, L)}
  `;
}

/**
 * 3. Parisian Editorial (Executive Newsreader Serif)
 */
function buildParisianEditorialHTML(cv) {
  const p = cv.personal || {};
  const L = getLocalizedLabels(cv);
  return `
    <header style="text-align: center; border-bottom: 0.5pt solid #111827; padding-bottom: 12pt; margin-bottom: 14pt;">
      <h1 class="applicant-name" contenteditable="true" data-bind="personal.fullName">${escapePreviewHTML(p.firstName || '')} ${escapePreviewHTML(p.lastName || '')}</h1>
      <div class="applicant-title" contenteditable="true" data-bind="personal.title">${escapePreviewHTML(p.title || '')}</div>
      <div style="font-size: 8.3pt; color: #6b7280; letter-spacing: 0.02em; margin-top: 4pt;">
        <span contenteditable="true" data-bind="personal.city">${escapePreviewHTML(p.city || '')}</span> ·
        <span contenteditable="true" data-bind="personal.email">${escapePreviewHTML(p.email || '')}</span> ·
        <span contenteditable="true" data-bind="personal.phone">${escapePreviewHTML(p.phone || '')}</span>
      </div>
    </header>

    <section class="cv-section">
      <p style="font-size: 9.2pt; color: #374151; line-height: 1.5; margin-bottom: 10pt; font-style: italic;" contenteditable="true" data-bind="summary">${escapePreviewHTML(cv.summary || '')}</p>
    </section>

    <section class="cv-section">
      <h2 class="section-heading">${L.experience}</h2>
      ${(cv.experience || []).map((exp, idx) => `
        <div class="entry-row item-block">
          <div class="entry-dates" contenteditable="true" data-exp-field="dateRange" data-idx="${idx}">${escapePreviewHTML(exp.startDate || '')} – ${escapePreviewHTML(exp.endDate || (exp.current ? L.present : ''))}</div>
          <div>
            <div class="entry-role" contenteditable="true" data-exp-field="position" data-idx="${idx}">${escapePreviewHTML(exp.position || '')}</div>
            <div class="entry-institution"><span contenteditable="true" data-exp-field="company" data-idx="${idx}">${escapePreviewHTML(exp.company || '')}</span>${exp.city ? ` · <span contenteditable="true" data-exp-field="city" data-idx="${idx}">${escapePreviewHTML(exp.city)}</span>` : ''}</div>
            <ul class="bullet-list" style="padding-left: 12pt; font-size: 8.8pt; color: #374151;">
              ${(exp.bullets || []).map((b, bIdx) => `<li contenteditable="true" data-exp-bullet="${idx}:${bIdx}">${escapePreviewHTML(b)}</li>`).join('')}
            </ul>
          </div>
          <div class="item-actions no-print">
            <button class="item-action-btn" title="Add bullet" data-add-bullet="${idx}">+</button>
            <button class="item-action-btn delete" title="Delete entry" data-delete-exp="${idx}">×</button>
          </div>
        </div>
      `).join('')}
      <div class="no-print"><span class="add-item-trigger" id="btn-trigger-add-exp">${L.addExp}</span></div>
    </section>

    <section class="cv-section">
      <h2 class="section-heading">${L.education}</h2>
      ${(cv.education || []).map((edu, idx) => `
        <div class="entry-row item-block">
          <div class="entry-dates" contenteditable="true" data-edu-field="dateRange" data-idx="${idx}">${escapePreviewHTML(edu.startDate || '')} – ${escapePreviewHTML(edu.endDate || '')}</div>
          <div>
            <div class="entry-role" contenteditable="true" data-edu-field="degree" data-idx="${idx}">${escapePreviewHTML(edu.degree || '')}</div>
            <div class="entry-institution"><span contenteditable="true" data-edu-field="institution" data-idx="${idx}">${escapePreviewHTML(edu.institution || '')}</span>${edu.grade ? ` · ${L.grade} <span contenteditable="true" data-edu-field="grade" data-idx="${idx}">${escapePreviewHTML(edu.grade)}</span>` : ''}</div>
          </div>
          <div class="item-actions no-print">
            <button class="item-action-btn delete" title="Delete entry" data-delete-edu="${idx}">×</button>
          </div>
        </div>
      `).join('')}
      <div class="no-print"><span class="add-item-trigger" id="btn-trigger-add-edu">${L.addEdu}</span></div>
    </section>

    <section class="cv-section">
      <h2 class="section-heading">${L.skills}</h2>
      <div class="skills-matrix">
        ${(cv.skills?.technical || []).map(t => `<span class="skill-pill">${escapePreviewHTML(t)}</span>`).join('')}
      </div>
    </section>

    ${buildLanguagesSectionHTML(cv, L)}
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
