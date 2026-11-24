/**
 * Live A4 Document Preview Renderer
 * Renders European CV state into precise, printable HTML structures.
 */

import { TEMPLATE_IDS } from '../model/cv-schema.js';

export function renderCVPreview(cv, containerElement) {
  if (!containerElement || !cv) return;

  const templateId = cv.meta?.template || TEMPLATE_IDS.GERMAN_DIN;
  containerElement.className = `a4-sheet template-${templateId}`;
  containerElement.style.setProperty('--cv-accent', cv.meta?.accentColor || '#1e3a8a');

  switch (templateId) {
    case TEMPLATE_IDS.MODERN_EUROPEAN:
      containerElement.innerHTML = buildModernEuropeanHTML(cv);
      break;
    case TEMPLATE_IDS.MINIMAL_SWISS:
      containerElement.innerHTML = buildMinimalSwissHTML(cv);
      break;
    case TEMPLATE_IDS.GERMAN_DIN:
    default:
      containerElement.innerHTML = buildGermanDINHTML(cv);
      break;
  }
}

/**
 * 1. German DIN 5008 Lebenslauf Template Builder
 */
function buildGermanDINHTML(cv) {
  const p = cv.personal || {};
  const isDe = (cv.meta?.language || 'de') === 'de';

  // Section Labels
  const L = isDe ? {
    experience: 'Berufserfahrung',
    education: 'Ausbildung & Studium',
    skills: 'Kenntnisse & Qualifikationen',
    languages: 'Sprachkenntnisse',
    certifications: 'Zertifikate & Weiterbildung',
    projects: 'Projekte',
    birth: 'Geburtsdaten',
    nationality: 'Staatsangehörigkeit',
    signatureLabel: 'Unterschrift (Unterschrift & Ort)'
  } : {
    experience: 'Professional Experience',
    education: 'Education',
    skills: 'Skills & Qualifications',
    languages: 'Languages',
    certifications: 'Certifications',
    projects: 'Key Projects',
    birth: 'Date of Birth',
    nationality: 'Nationality',
    signatureLabel: 'Signature & Place'
  };

  // Header & Personal details
  let headerContactHTML = `
    <div class="header-contact-grid">
      ${p.email ? `<div class="contact-row"><span class="contact-label">E-Mail:</span><span class="contact-value">${escapeHTML(p.email)}</span></div>` : ''}
      ${p.phone ? `<div class="contact-row"><span class="contact-label">Tel.:</span><span class="contact-value">${escapeHTML(p.phone)}</span></div>` : ''}
      ${p.city ? `<div class="contact-row"><span class="contact-label">Wohnort:</span><span class="contact-value">${p.postalCode ? escapeHTML(p.postalCode) + ' ' : ''}${escapeHTML(p.city)}${p.country ? ', ' + escapeHTML(p.country) : ''}</span></div>` : ''}
      ${p.birthDate ? `<div class="contact-row"><span class="contact-label">${L.birth}:</span><span class="contact-value">${escapeHTML(p.birthDate)}${p.birthPlace ? ' in ' + escapeHTML(p.birthPlace) : ''}</span></div>` : ''}
      ${p.nationality ? `<div class="contact-row"><span class="contact-label">${L.nationality}:</span><span class="contact-value">${escapeHTML(p.nationality)}</span></div>` : ''}
      ${p.linkedin ? `<div class="contact-row"><span class="contact-label">LinkedIn:</span><span class="contact-value">${escapeHTML(p.linkedin)}</span></div>` : ''}
    </div>
  `;

  let photoHTML = '';
  if (cv.meta?.showPhoto) {
    if (p.photoUrl) {
      photoHTML = `<div class="photo-frame"><img src="${p.photoUrl}" alt="Bewerbungsfoto"></div>`;
    } else {
      photoHTML = `
        <div class="photo-frame">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>`;
    }
  }

  // Work Experience HTML
  let experienceHTML = '';
  if (cv.experience && cv.experience.length > 0) {
    experienceHTML = `
      <section class="cv-section">
        <h2 class="section-title">${L.experience}</h2>
        ${cv.experience.map(exp => `
          <div class="chronological-entry cv-item">
            <div class="entry-date">${escapeHTML(exp.startDate || '')} – ${escapeHTML(exp.endDate || (exp.current ? 'Heute' : ''))}</div>
            <div class="entry-content">
              <div class="entry-role">${escapeHTML(exp.position || '')}</div>
              <div class="entry-company">${escapeHTML(exp.company || '')}${exp.city ? ' · ' + escapeHTML(exp.city) : ''}</div>
              ${exp.bullets && exp.bullets.length > 0 ? `
                <ul class="entry-bullets">
                  ${exp.bullets.map(b => `<li>${escapeHTML(b)}</li>`).join('')}
                </ul>
              ` : ''}
              ${exp.technologies && exp.technologies.length > 0 ? `
                <div class="tag-list">
                  ${exp.technologies.map(t => `<span class="tag-item">${escapeHTML(t)}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </section>
    `;
  }

  // Education HTML
  let educationHTML = '';
  if (cv.education && cv.education.length > 0) {
    educationHTML = `
      <section class="cv-section">
        <h2 class="section-title">${L.education}</h2>
        ${cv.education.map(edu => `
          <div class="chronological-entry cv-item">
            <div class="entry-date">${escapeHTML(edu.startDate || '')} – ${escapeHTML(edu.endDate || '')}</div>
            <div class="entry-content">
              <div class="entry-role">${escapeHTML(edu.degree || '')}</div>
              <div class="entry-company">${escapeHTML(edu.institution || '')}${edu.city ? ' · ' + escapeHTML(edu.city) : ''}</div>
              ${edu.grade ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">Abschlussnote: <strong>${escapeHTML(edu.grade)}</strong></div>` : ''}
              ${edu.thesis ? `<div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">Abschlussarbeit: <em>${escapeHTML(edu.thesis)}</em></div>` : ''}
            </div>
          </div>
        `).join('')}
      </section>
    `;
  }

  // Skills & Languages HTML
  let skillsHTML = '';
  const tech = cv.skills?.technical || [];
  const langs = cv.skills?.languages || [];
  if (tech.length > 0 || langs.length > 0) {
    skillsHTML = `
      <section class="cv-section">
        <h2 class="section-title">${L.skills}</h2>
        ${tech.length > 0 ? `
          <div class="chronological-entry cv-item">
            <div class="entry-date">Fachkompetenzen</div>
            <div class="entry-content">
              <div class="tag-list">
                ${tech.map(t => `<span class="tag-item">${escapeHTML(t)}</span>`).join('')}
              </div>
            </div>
          </div>
        ` : ''}
        ${langs.length > 0 ? `
          <div class="chronological-entry cv-item">
            <div class="entry-date">${L.languages}</div>
            <div class="entry-content">
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; font-size: 9pt;">
                ${langs.map(l => `
                  <div><strong>${escapeHTML(l.language)}:</strong> ${escapeHTML(l.level || '')}</div>
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}
      </section>
    `;
  }

  // Signature Block (Crucial German DIN 5008 Requirement)
  let signatureHTML = '';
  if (cv.meta?.includeSignatureBlock) {
    const place = cv.signature?.place || p.city || 'Berlin';
    const date = cv.signature?.date || new Date().toLocaleDateString('de-DE');
    const name = cv.signature?.signeeName || `${p.firstName || ''} ${p.lastName || ''}`.trim();
    signatureHTML = `
      <div class="signature-block">
        <div>
          <div>${escapeHTML(place)}, den ${escapeHTML(date)}</div>
        </div>
        <div class="signature-line">
          ${escapeHTML(name)}
        </div>
      </div>
    `;
  }

  return `
    <header class="cv-header">
      <div class="header-name-block">
        <h1 class="applicant-name">${escapeHTML(p.firstName || '')} ${escapeHTML(p.lastName || '')}</h1>
        ${p.title ? `<div class="applicant-title">${escapeHTML(p.title)}</div>` : ''}
        ${headerContactHTML}
      </div>
      ${photoHTML}
    </header>

    ${cv.summary ? `
      <section class="cv-section">
        <p style="font-size: 9.5pt; color: #334155; line-height: 1.5; margin-bottom: 14px;">${escapeHTML(cv.summary)}</p>
      </section>
    ` : ''}

    ${experienceHTML}
    ${educationHTML}
    ${skillsHTML}
    ${signatureHTML}
  `;
}

/**
 * 2. Modern European Template Builder
 */
function buildModernEuropeanHTML(cv) {
  const p = cv.personal || {};
  return `
    <div class="modern-header">
      <div>
        <h1 class="applicant-name">${escapeHTML(p.firstName || '')} ${escapeHTML(p.lastName || '')}</h1>
        <div class="applicant-title">${escapeHTML(p.title || '')}</div>
      </div>
      <div style="font-size: 9pt; text-align: right; color: #e2e8f0; line-height: 1.5;">
        ${p.email ? `<div>${escapeHTML(p.email)}</div>` : ''}
        ${p.phone ? `<div>${escapeHTML(p.phone)}</div>` : ''}
        ${p.city ? `<div>${escapeHTML(p.city)}, ${escapeHTML(p.country || '')}</div>` : ''}
      </div>
    </div>
    <div class="modern-body">
      <main>
        <section class="cv-section">
          <h2 class="section-title">Berufserfahrung</h2>
          ${(cv.experience || []).map(exp => `
            <div class="timeline-item cv-item">
              <div class="role-title">${escapeHTML(exp.position || '')}</div>
              <div class="role-meta">${escapeHTML(exp.company || '')} · ${escapeHTML(exp.startDate || '')} – ${escapeHTML(exp.endDate || '')}</div>
              <ul style="padding-left: 14px; font-size: 9pt; color: #334155;">
                ${(exp.bullets || []).map(b => `<li>${escapeHTML(b)}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </section>
        <section class="cv-section">
          <h2 class="section-title">Ausbildung</h2>
          ${(cv.education || []).map(edu => `
            <div class="timeline-item cv-item">
              <div class="role-title">${escapeHTML(edu.degree || '')}</div>
              <div class="role-meta">${escapeHTML(edu.institution || '')} · ${escapeHTML(edu.startDate || '')} – ${escapeHTML(edu.endDate || '')}</div>
            </div>
          `).join('')}
        </section>
      </main>
      <aside>
        <div class="sidebar-box">
          <h4>Kompetenzen</h4>
          <div style="display: flex; flex-wrap: wrap; gap: 4px;">
            ${(cv.skills?.technical || []).map(s => `<span class="tag-item">${escapeHTML(s)}</span>`).join('')}
          </div>
        </div>
        <div class="sidebar-box">
          <h4>Sprachen (GER/CEFR)</h4>
          ${(cv.skills?.languages || []).map(l => `
            <div style="margin-bottom: 5px; font-size: 8.5pt;">
              <strong>${escapeHTML(l.language)}:</strong> ${escapeHTML(l.level || '')}
            </div>
          `).join('')}
        </div>
      </aside>
    </div>
  `;
}

/**
 * 3. Minimal Swiss Template Builder
 */
function buildMinimalSwissHTML(cv) {
  const p = cv.personal || {};
  return `
    <header class="swiss-header">
      <h1 class="applicant-name">${escapeHTML(p.firstName || '')} ${escapeHTML(p.lastName || '')}</h1>
      <div style="font-size: 11pt; font-weight: 600; color: #4b5563; margin-top: 4px;">${escapeHTML(p.title || '')}</div>
      <div style="display: flex; gap: 16px; font-size: 9pt; color: #6b7280; margin-top: 8px;">
        <span>${escapeHTML(p.email || '')}</span>
        <span>${escapeHTML(p.phone || '')}</span>
        <span>${escapeHTML(p.city || '')}</span>
      </div>
    </header>
    <section class="cv-section">
      <h2 class="section-title">Berufserfahrung</h2>
      ${(cv.experience || []).map(exp => `
        <div style="display: grid; grid-template-columns: 35mm 1fr; gap: 8mm; margin-bottom: 12px; font-size: 9.5pt;">
          <div style="font-weight: 700; color: #374151;">${escapeHTML(exp.startDate || '')} – ${escapeHTML(exp.endDate || '')}</div>
          <div>
            <div style="font-weight: 700;">${escapeHTML(exp.position || '')} · ${escapeHTML(exp.company || '')}</div>
            <ul style="padding-left: 14px; margin-top: 4px; font-size: 9pt; color: #4b5563;">
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
