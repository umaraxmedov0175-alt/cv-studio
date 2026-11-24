/**
 * Direct-Manipulation WYSIWYG Preview Renderer
 * Renders European CV templates as live, directly-editable typography on A4 paper.
 */

import { TEMPLATE_IDS } from '../model/cv-schema.js';
import { adaptCVForCountry } from '../engines/country-rules.js';

export function renderCVPreview(cv, containerElement) {
  if (!containerElement || !cv) return;

  const countryCode = cv.meta?.targetCountry || 'DE';
  const adaptedCV = adaptCVForCountry(cv, countryCode);

  const templateId = cv.meta?.template || TEMPLATE_IDS.GERMAN_DIN;
  containerElement.className = `a4-sheet template-${templateId} country-${countryCode.toLowerCase()}`;
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

/**
 * 1. Frankfurt Executive (DIN 5008 Chronological)
 */
function buildFrankfurtDINHTML(cv) {
  const p = cv.personal || {};
  const rules = cv.rules || {};
  const countryCode = cv.meta?.targetCountry || 'DE';
  const isUK = countryCode === 'UK';
  const isFR = countryCode === 'FR';

  const L = isFR ? {
    experience: 'Expériences professionnelles',
    education: 'Formation & Diplômes',
    skills: 'Compétences & Outils',
    languages: 'Langues vivantes',
    addExp: '+ Ajouter une expérience',
    addEdu: '+ Ajouter une formation'
  } : (isUK ? {
    experience: 'Employment History',
    education: 'Education & Qualifications',
    skills: 'Key Competencies & Technologies',
    languages: 'Languages',
    addExp: '+ Add role',
    addEdu: '+ Add education'
  } : {
    experience: 'Berufserfahrung',
    education: 'Ausbildung & Studium',
    skills: 'Kenntnisse & Qualifikationen',
    languages: 'Sprachkenntnisse',
    addExp: '+ Station hinzufügen',
    addEdu: '+ Abschluss hinzufügen'
  });

  // Contact Info Line
  const contactParts = [];
  if (p.email) contactParts.push(`<span class="contact-meta-item"><strong>E-Mail:</strong> <span contenteditable="true" data-bind="personal.email">${escapeHTML(p.email)}</span></span>`);
  if (p.phone) contactParts.push(`<span class="contact-meta-item"><strong>Tel:</strong> <span contenteditable="true" data-bind="personal.phone">${escapeHTML(p.phone)}</span></span>`);
  if (p.city) contactParts.push(`<span class="contact-meta-item"><strong>Wohnort:</strong> <span contenteditable="true" data-bind="personal.city">${escapeHTML(p.city)}</span></span>`);

  if (!isUK && rules.allowBirthDate && p.birthDate) {
    contactParts.push(`<span class="contact-meta-item"><strong>Geburtsdaten:</strong> <span contenteditable="true" data-bind="personal.birthDate">${escapeHTML(p.birthDate)}</span></span>`);
  }
  if (!isUK && rules.allowNationality && p.nationality) {
    contactParts.push(`<span class="contact-meta-item"><strong>Staatsangehörigkeit:</strong> <span contenteditable="true" data-bind="personal.nationality">${escapeHTML(p.nationality)}</span></span>`);
  }
  if (p.linkedin) {
    contactParts.push(`<span class="contact-meta-item"><strong>LinkedIn:</strong> <span contenteditable="true" data-bind="personal.linkedin">${escapeHTML(p.linkedin)}</span></span>`);
  }

  // Photo
  let photoHTML = '';
  if (!isUK && rules.allowPhoto && cv.meta?.showPhoto) {
    photoHTML = `
      <div class="photo-slot">
        ${p.photoUrl
          ? `<img src="${p.photoUrl}" alt="Bewerbungsfoto">`
          : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 24pt;">👤</div>`
        }
      </div>
    `;
  }

  // Experience
  const expHTML = (cv.experience || []).map((exp, idx) => `
    <div class="entry-row item-block" data-exp-idx="${idx}">
      <div class="entry-dates" contenteditable="true" data-exp-field="dateRange" data-idx="${idx}">
        ${escapeHTML(exp.startDate || '')} – ${escapeHTML(exp.endDate || (exp.current ? 'Heute' : ''))}
      </div>
      <div>
        <div class="entry-role" contenteditable="true" data-exp-field="position" data-idx="${idx}">${escapeHTML(exp.position || '')}</div>
        <div class="entry-institution" contenteditable="true" data-exp-field="company" data-idx="${idx}">${escapeHTML(exp.company || '')}${exp.city ? ' · ' + escapeHTML(exp.city) : ''}</div>
        <ul class="bullet-list">
          ${(exp.bullets || []).map((bullet, bIdx) => `
            <li contenteditable="true" data-exp-bullet="${idx}:${bIdx}">${escapeHTML(bullet)}</li>
          `).join('')}
        </ul>
        <div class="skills-matrix">
          ${(exp.technologies || []).map(t => `<span class="skill-pill">${escapeHTML(t)}</span>`).join('')}
        </div>
      </div>
      <div class="item-actions no-print">
        <button class="item-action-btn" title="Aufzählungspunkt hinzufügen" data-add-bullet="${idx}">+</button>
        <button class="item-action-btn delete" title="Eintrag löschen" data-delete-exp="${idx}">×</button>
      </div>
    </div>
  `).join('');

  // Education
  const eduHTML = (cv.education || []).map((edu, idx) => `
    <div class="entry-row item-block" data-edu-idx="${idx}">
      <div class="entry-dates" contenteditable="true" data-edu-field="dateRange" data-idx="${idx}">
        ${escapeHTML(edu.startDate || '')} – ${escapeHTML(edu.endDate || '')}
      </div>
      <div>
        <div class="entry-role" contenteditable="true" data-edu-field="degree" data-idx="${idx}">${escapeHTML(edu.degree || '')}</div>
        <div class="entry-institution" contenteditable="true" data-edu-field="institution" data-idx="${idx}">${escapeHTML(edu.institution || '')}${edu.city ? ' · ' + escapeHTML(edu.city) : ''}</div>
        ${edu.grade ? `<div style="font-size: 8.5pt; color: #6b7280;">Abschlussnote: <strong contenteditable="true" data-edu-field="grade" data-idx="${idx}">${escapeHTML(edu.grade)}</strong></div>` : ''}
      </div>
      <div class="item-actions no-print">
        <button class="item-action-btn delete" title="Löschen" data-delete-edu="${idx}">×</button>
      </div>
    </div>
  `).join('');

  // Signature Block
  let signatureHTML = '';
  if (!isUK && rules.allowSignatureBlock && cv.meta?.includeSignatureBlock) {
    const place = cv.signature?.place || p.city || 'Berlin';
    const date = cv.signature?.date || new Date().toLocaleDateString('de-DE');
    const name = cv.signature?.signeeName || `${p.firstName || ''} ${p.lastName || ''}`.trim();
    signatureHTML = `
      <div class="din-signature-block">
        <div>
          <span contenteditable="true" data-bind="signature.place">${escapeHTML(place)}</span>, den 
          <span contenteditable="true" data-bind="signature.date">${escapeHTML(date)}</span>
        </div>
        <div class="din-signature-line" contenteditable="true" data-bind="signature.signeeName">
          ${escapeHTML(name)}
        </div>
      </div>
    `;
  }

  return `
    <header class="cv-header">
      <div style="flex: 1;">
        <h1 class="applicant-name" contenteditable="true" data-bind="personal.fullName">${escapeHTML(p.firstName || '')} ${escapeHTML(p.lastName || '')}</h1>
        <div class="applicant-title" contenteditable="true" data-bind="personal.title">${escapeHTML(p.title || '')}</div>
        <div class="contact-meta-row">${contactParts.join('')}</div>
      </div>
      ${photoHTML}
    </header>

    <section class="cv-section">
      <p style="font-size: 9.5pt; color: #374151; line-height: 1.55; margin-bottom: 14pt;" contenteditable="true" data-bind="summary">
        ${escapeHTML(cv.summary || '')}
      </p>
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
      <div class="skills-matrix" contenteditable="true" data-bind="skills.technical">
        ${(cv.skills?.technical || []).map(t => `<span class="skill-pill">${escapeHTML(t)}</span>`).join('')}
      </div>
    </section>

    ${signatureHTML}
  `;
}

/**
 * 2. Zurich Modernist (Swiss Grid / Müller-Brockmann)
 */
function buildZurichModernistHTML(cv) {
  const p = cv.personal || {};
  return `
    <header class="swiss-header">
      <h1 class="applicant-name" contenteditable="true" data-bind="personal.fullName">${escapeHTML(p.firstName || '')} ${escapeHTML(p.lastName || '')}</h1>
      <div class="applicant-title" contenteditable="true" data-bind="personal.title">${escapeHTML(p.title || '')}</div>
      <div style="display: flex; gap: 14pt; font-size: 8.5pt; color: #64748b; margin-top: 6pt;">
        <span contenteditable="true" data-bind="personal.email">${escapeHTML(p.email || '')}</span>
        <span contenteditable="true" data-bind="personal.phone">${escapeHTML(p.phone || '')}</span>
        <span contenteditable="true" data-bind="personal.city">${escapeHTML(p.city || '')}</span>
      </div>
    </header>

    <section class="cv-section">
      <h2 class="section-heading">Erfahrung</h2>
      ${(cv.experience || []).map((exp, idx) => `
        <div class="entry-row item-block">
          <div class="entry-dates">${escapeHTML(exp.startDate || '')} – ${escapeHTML(exp.endDate || '')}</div>
          <div>
            <div class="entry-role">${escapeHTML(exp.position || '')} · ${escapeHTML(exp.company || '')}</div>
            <ul style="padding-left: 12pt; margin-top: 4pt; font-size: 8.5pt; color: #334155;">
              ${(exp.bullets || []).map(b => `<li>${escapeHTML(b)}</li>`).join('')}
            </ul>
          </div>
        </div>
      `).join('')}
    </section>
  `;
}

/**
 * 3. Parisian Editorial (Newsreader Serif)
 */
function buildParisianEditorialHTML(cv) {
  const p = cv.personal || {};
  return `
    <header style="text-align: center; border-bottom: 0.5pt solid #111827; padding-bottom: 14pt; margin-bottom: 16pt;">
      <h1 class="applicant-name" contenteditable="true" data-bind="personal.fullName">${escapeHTML(p.firstName || '')} ${escapeHTML(p.lastName || '')}</h1>
      <div class="applicant-title" contenteditable="true" data-bind="personal.title">${escapeHTML(p.title || '')}</div>
      <div style="font-size: 8.5pt; color: #6b7280; letter-spacing: 0.02em;">
        ${escapeHTML(p.city || '')} · ${escapeHTML(p.email || '')} · ${escapeHTML(p.phone || '')}
      </div>
    </header>

    <section class="cv-section">
      <h2 class="section-heading">Expériences professionnelles</h2>
      ${(cv.experience || []).map(exp => `
        <div class="entry-row item-block">
          <div class="entry-dates">${escapeHTML(exp.startDate || '')} – ${escapeHTML(exp.endDate || '')}</div>
          <div>
            <div class="entry-role">${escapeHTML(exp.position || '')}</div>
            <div class="entry-institution">${escapeHTML(exp.company || '')}</div>
            <ul style="padding-left: 12pt; font-size: 9pt; color: #374151;">
              ${(exp.bullets || []).map(b => `<li>${escapeHTML(b)}</li>`).join('')}
            </ul>
          </div>
        </div>
      `).join('')}
    </section>
  `;
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
