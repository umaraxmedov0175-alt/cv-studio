/**
 * Reactive Form Builder Component
 * Generates and binds all form sections for European and German CV attributes.
 */

import { CEFR_LEVELS } from '../model/cv-schema.js';

export function initializeFormBuilder(cv, containerElement, onCVChangeCallback) {
  if (!containerElement || !cv) return;

  containerElement.innerHTML = `
    <!-- 1. PERSONAL DETAILS -->
    <div class="form-section">
      <div class="section-header" data-toggle="personal">
        <span class="section-header-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          Persönliche Daten (DIN 5008)
        </span>
        <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
      </div>
      <div class="section-body" id="body-personal">
        <div class="input-row">
          <div class="input-group">
            <label class="input-label">Vorname *</label>
            <input type="text" class="input-field" id="p-firstName" value="${escapeAttr(cv.personal?.firstName || '')}">
          </div>
          <div class="input-group">
            <label class="input-label">Nachname *</label>
            <input type="text" class="input-field" id="p-lastName" value="${escapeAttr(cv.personal?.lastName || '')}">
          </div>
        </div>
        <div class="input-group">
          <label class="input-label">Berufsbezeichnung / Angestrebte Position</label>
          <input type="text" class="input-field" id="p-title" value="${escapeAttr(cv.personal?.title || '')}">
        </div>
        <div class="input-row">
          <div class="input-group">
            <label class="input-label">E-Mail *</label>
            <input type="email" class="input-field" id="p-email" value="${escapeAttr(cv.personal?.email || '')}">
          </div>
          <div class="input-group">
            <label class="input-label">Telefonnummer</label>
            <input type="tel" class="input-field" id="p-phone" value="${escapeAttr(cv.personal?.phone || '')}">
          </div>
        </div>
        <div class="input-row">
          <div class="input-group">
            <label class="input-label">Straße & Hausnummer</label>
            <input type="text" class="input-field" id="p-address" value="${escapeAttr(cv.personal?.address || '')}">
          </div>
          <div class="input-group">
            <label class="input-label">PLZ & Stadt</label>
            <input type="text" class="input-field" id="p-city" value="${escapeAttr((cv.personal?.postalCode ? cv.personal.postalCode + ' ' : '') + (cv.personal?.city || ''))}">
          </div>
        </div>
        <div class="input-row">
          <div class="input-group">
            <label class="input-label">Geburtsdatum (DD.MM.YYYY)</label>
            <input type="text" class="input-field" id="p-birthDate" placeholder="14.05.1994" value="${escapeAttr(cv.personal?.birthDate || '')}">
          </div>
          <div class="input-group">
            <label class="input-label">Staatsangehörigkeit</label>
            <input type="text" class="input-field" id="p-nationality" placeholder="deutsch" value="${escapeAttr(cv.personal?.nationality || '')}">
          </div>
        </div>
        <div class="input-group">
          <label class="input-label">LinkedIn / Portfolio URL</label>
          <input type="text" class="input-field" id="p-linkedin" value="${escapeAttr(cv.personal?.linkedin || '')}">
        </div>
        <div class="input-group">
          <label class="input-label">Bewerbungsfoto hochladen (Optional)</label>
          <input type="file" id="p-photo-upload" accept="image/*" class="input-field" style="padding: 4px;">
        </div>
      </div>
    </div>

    <!-- 2. KURZPROFIL / SUMMARY -->
    <div class="form-section">
      <div class="section-header" data-toggle="summary">
        <span class="section-header-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          Kurzprofil / Zusammenfassung
        </span>
        <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
      </div>
      <div class="section-body" id="body-summary">
        <div class="input-group">
          <label class="input-label">Professionelle Zusammenfassung (3-4 Sätze für HR & ATS)</label>
          <textarea class="input-field" id="f-summary" rows="3">${escapeAttr(cv.summary || '')}</textarea>
        </div>
      </div>
    </div>

    <!-- 3. BERUFSERFAHRUNG -->
    <div class="form-section">
      <div class="section-header" data-toggle="experience">
        <span class="section-header-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
          Berufserfahrung
        </span>
        <button class="btn btn-secondary" id="btn-add-exp" style="font-size: 11px; padding: 4px 8px;">+ Station hinzufügen</button>
      </div>
      <div class="section-body" id="body-experience">
        <div id="experience-list" style="display: flex; flex-direction: column; gap: 12px;"></div>
      </div>
    </div>

    <!-- 4. AUSBILDUNG -->
    <div class="form-section">
      <div class="section-header" data-toggle="education">
        <span class="section-header-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>
          Ausbildung & Studium
        </span>
        <button class="btn btn-secondary" id="btn-add-edu" style="font-size: 11px; padding: 4px 8px;">+ Abschluss hinzufügen</button>
      </div>
      <div class="section-body" id="body-education">
        <div id="education-list" style="display: flex; flex-direction: column; gap: 12px;"></div>
      </div>
    </div>

    <!-- 5. KOMPETENZEN & SPRACHEN -->
    <div class="form-section">
      <div class="section-header" data-toggle="skills">
        <span class="section-header-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          Kenntnisse & Sprachen (CEFR)
        </span>
        <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
      </div>
      <div class="section-body" id="body-skills">
        <div class="input-group">
          <label class="input-label">Fachkompetenzen (Komma-getrennt)</label>
          <input type="text" class="input-field" id="f-skills-tech" value="${escapeAttr((cv.skills?.technical || []).join(', '))}">
        </div>
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <label class="input-label">Sprachkenntnisse nach GER/CEFR</label>
            <button class="btn btn-secondary" id="btn-add-lang" style="font-size: 10px; padding: 2px 6px;">+ Sprache</button>
          </div>
          <div id="language-list" style="display: flex; flex-direction: column; gap: 8px;"></div>
        </div>
      </div>
    </div>

    <!-- 6. FORMALITÄTEN & SIGNATUR (DIN 5008) -->
    <div class="form-section">
      <div class="section-header" data-toggle="signature">
        <span class="section-header-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>
          Datum & Unterschrift (DIN 5008)
        </span>
        <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
      </div>
      <div class="section-body" id="body-signature">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <input type="checkbox" id="f-include-sig" ${cv.meta?.includeSignatureBlock ? 'checked' : ''}>
          <label for="f-include-sig" style="font-size: 13px; color: #f1f5f9; cursor: pointer;">DIN 5008 Unterschriftenblock einbinden</label>
        </div>
        <div class="input-row">
          <div class="input-group">
            <label class="input-label">Ort</label>
            <input type="text" class="input-field" id="f-sig-place" value="${escapeAttr(cv.signature?.place || '')}">
          </div>
          <div class="input-group">
            <label class="input-label">Datum</label>
            <input type="text" class="input-field" id="f-sig-date" value="${escapeAttr(cv.signature?.date || '')}">
          </div>
        </div>
      </div>
    </div>
  `;

  renderExperienceItems(cv, onCVChangeCallback);
  renderEducationItems(cv, onCVChangeCallback);
  renderLanguageItems(cv, onCVChangeCallback);
  bindEventListeners(cv, onCVChangeCallback);
}

function bindEventListeners(cv, onCVChangeCallback) {
  const triggerChange = () => {
    // Read static form fields
    cv.personal.firstName = document.getElementById('p-firstName')?.value || '';
    cv.personal.lastName = document.getElementById('p-lastName')?.value || '';
    cv.personal.title = document.getElementById('p-title')?.value || '';
    cv.personal.email = document.getElementById('p-email')?.value || '';
    cv.personal.phone = document.getElementById('p-phone')?.value || '';
    cv.personal.address = document.getElementById('p-address')?.value || '';

    const cityRaw = document.getElementById('p-city')?.value || '';
    const parts = cityRaw.trim().split(' ');
    if (parts.length > 1 && /^\d+$/.test(parts[0])) {
      cv.personal.postalCode = parts[0];
      cv.personal.city = parts.slice(1).join(' ');
    } else {
      cv.personal.city = cityRaw;
    }

    cv.personal.birthDate = document.getElementById('p-birthDate')?.value || '';
    cv.personal.nationality = document.getElementById('p-nationality')?.value || '';
    cv.personal.linkedin = document.getElementById('p-linkedin')?.value || '';
    cv.summary = document.getElementById('f-summary')?.value || '';

    // Skills
    const techRaw = document.getElementById('f-skills-tech')?.value || '';
    cv.skills.technical = techRaw.split(',').map(s => s.trim()).filter(Boolean);

    // Signature
    cv.meta.includeSignatureBlock = document.getElementById('f-include-sig')?.checked || false;
    cv.signature.place = document.getElementById('f-sig-place')?.value || '';
    cv.signature.date = document.getElementById('f-sig-date')?.value || '';
    cv.signature.signeeName = `${cv.personal.firstName} ${cv.personal.lastName}`.trim();

    if (typeof onCVChangeCallback === 'function') {
      onCVChangeCallback(cv);
    }
  };

  // Attach input listeners
  const inputIds = [
    'p-firstName', 'p-lastName', 'p-title', 'p-email', 'p-phone',
    'p-address', 'p-city', 'p-birthDate', 'p-nationality', 'p-linkedin',
    'f-summary', 'f-skills-tech', 'f-sig-place', 'f-sig-date', 'f-include-sig'
  ];

  inputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', triggerChange);
      el.addEventListener('change', triggerChange);
    }
  });

  // Photo Upload Handler
  const photoInput = document.getElementById('p-photo-upload');
  if (photoInput) {
    photoInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          cv.personal.photoUrl = event.target?.result || '';
          triggerChange();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Add Item Buttons
  document.getElementById('btn-add-exp')?.addEventListener('click', (e) => {
    e.stopPropagation();
    cv.experience = cv.experience || [];
    cv.experience.unshift({
      id: 'exp-' + Date.now(),
      position: 'Neue Position',
      company: 'Unternehmen GmbH',
      city: 'Berlin',
      startDate: '01/2024',
      endDate: 'Heute',
      current: true,
      bullets: ['Kernaufgabe und messbarer Erfolg.'],
      technologies: []
    });
    renderExperienceItems(cv, onCVChangeCallback);
    triggerChange();
  });

  document.getElementById('btn-add-edu')?.addEventListener('click', (e) => {
    e.stopPropagation();
    cv.education = cv.education || [];
    cv.education.unshift({
      id: 'edu-' + Date.now(),
      degree: 'Abschluss / Studiengang',
      institution: 'Universität / Hochschule',
      city: 'Berlin',
      startDate: '2020',
      endDate: '2023',
      grade: ''
    });
    renderEducationItems(cv, onCVChangeCallback);
    triggerChange();
  });

  document.getElementById('btn-add-lang')?.addEventListener('click', (e) => {
    e.stopPropagation();
    cv.skills = cv.skills || {};
    cv.skills.languages = cv.skills.languages || [];
    cv.skills.languages.push({
      language: 'Englisch',
      level: 'B2 – Fließend / Vantage'
    });
    renderLanguageItems(cv, onCVChangeCallback);
    triggerChange();
  });
}

function renderExperienceItems(cv, onCVChangeCallback) {
  const container = document.getElementById('experience-list');
  if (!container) return;

  container.innerHTML = (cv.experience || []).map((exp, idx) => `
    <div class="dynamic-item-card">
      <button class="dynamic-item-remove" data-remove-exp="${idx}">×</button>
      <div class="input-row">
        <div class="input-group">
          <label class="input-label">Position / Rolle</label>
          <input type="text" class="input-field" data-exp-field="position" data-idx="${idx}" value="${escapeAttr(exp.position || '')}">
        </div>
        <div class="input-group">
          <label class="input-label">Unternehmen</label>
          <input type="text" class="input-field" data-exp-field="company" data-idx="${idx}" value="${escapeAttr(exp.company || '')}">
        </div>
      </div>
      <div class="input-row">
        <div class="input-group">
          <label class="input-label">Zeitraum (z. B. 03/2022 – Heute)</label>
          <input type="text" class="input-field" data-exp-field="dateRange" data-idx="${idx}" value="${escapeAttr((exp.startDate || '') + ' – ' + (exp.endDate || ''))}">
        </div>
        <div class="input-group">
          <label class="input-label">Stadt / Land</label>
          <input type="text" class="input-field" data-exp-field="city" data-idx="${idx}" value="${escapeAttr(exp.city || '')}">
        </div>
      </div>
      <div class="input-group">
        <label class="input-label">Aufgaben & Erfolge (1 pro Zeile)</label>
        <textarea class="input-field" data-exp-field="bullets" data-idx="${idx}" rows="2">${escapeAttr((exp.bullets || []).join('\n'))}</textarea>
      </div>
    </div>
  `).join('');

  // Wire item changes
  container.querySelectorAll('[data-exp-field]').forEach(input => {
    input.addEventListener('input', () => {
      const idx = parseInt(input.getAttribute('data-idx'), 10);
      const field = input.getAttribute('data-exp-field');
      const item = cv.experience[idx];
      if (!item) return;

      if (field === 'dateRange') {
        const parts = input.value.split('–').map(s => s.trim());
        item.startDate = parts[0] || '';
        item.endDate = parts[1] || '';
      } else if (field === 'bullets') {
        item.bullets = input.value.split('\n').filter(Boolean);
      } else {
        item[field] = input.value;
      }
      onCVChangeCallback(cv);
    });
  });

  // Wire remove
  container.querySelectorAll('[data-remove-exp]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-remove-exp'), 10);
      cv.experience.splice(idx, 1);
      renderExperienceItems(cv, onCVChangeCallback);
      onCVChangeCallback(cv);
    });
  });
}

function renderEducationItems(cv, onCVChangeCallback) {
  const container = document.getElementById('education-list');
  if (!container) return;

  container.innerHTML = (cv.education || []).map((edu, idx) => `
    <div class="dynamic-item-card">
      <button class="dynamic-item-remove" data-remove-edu="${idx}">×</button>
      <div class="input-row">
        <div class="input-group">
          <label class="input-label">Abschluss / Studiengang</label>
          <input type="text" class="input-field" data-edu-field="degree" data-idx="${idx}" value="${escapeAttr(edu.degree || '')}">
        </div>
        <div class="input-group">
          <label class="input-label">Bildungseinrichtung</label>
          <input type="text" class="input-field" data-edu-field="institution" data-idx="${idx}" value="${escapeAttr(edu.institution || '')}">
        </div>
      </div>
      <div class="input-row">
        <div class="input-group">
          <label class="input-label">Zeitraum</label>
          <input type="text" class="input-field" data-edu-field="dateRange" data-idx="${idx}" value="${escapeAttr((edu.startDate || '') + ' – ' + (edu.endDate || ''))}">
        </div>
        <div class="input-group">
          <label class="input-label">Abschlussnote / Prädikat</label>
          <input type="text" class="input-field" data-edu-field="grade" data-idx="${idx}" placeholder="1,3" value="${escapeAttr(edu.grade || '')}">
        </div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('[data-edu-field]').forEach(input => {
    input.addEventListener('input', () => {
      const idx = parseInt(input.getAttribute('data-idx'), 10);
      const field = input.getAttribute('data-edu-field');
      const item = cv.education[idx];
      if (!item) return;

      if (field === 'dateRange') {
        const parts = input.value.split('–').map(s => s.trim());
        item.startDate = parts[0] || '';
        item.endDate = parts[1] || '';
      } else {
        item[field] = input.value;
      }
      onCVChangeCallback(cv);
    });
  });

  container.querySelectorAll('[data-remove-edu]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-remove-edu'), 10);
      cv.education.splice(idx, 1);
      renderEducationItems(cv, onCVChangeCallback);
      onCVChangeCallback(cv);
    });
  });
}

function renderLanguageItems(cv, onCVChangeCallback) {
  const container = document.getElementById('language-list');
  if (!container) return;

  container.innerHTML = (cv.skills?.languages || []).map((lang, idx) => `
    <div style="display: flex; gap: 8px; align-items: center;">
      <input type="text" class="input-field" style="flex: 1;" data-lang-name="${idx}" value="${escapeAttr(lang.language || '')}">
      <select class="select-control" style="flex: 1.2;" data-lang-level="${idx}">
        ${CEFR_LEVELS.map(lvl => `
          <option value="${lvl.label}" ${lang.level === lvl.label ? 'selected' : ''}>${lvl.label}</option>
        `).join('')}
      </select>
      <button class="dynamic-item-remove" style="position: static;" data-remove-lang="${idx}">×</button>
    </div>
  `).join('');

  container.querySelectorAll('[data-lang-name]').forEach(input => {
    input.addEventListener('input', () => {
      const idx = parseInt(input.getAttribute('data-lang-name'), 10);
      if (cv.skills.languages[idx]) {
        cv.skills.languages[idx].language = input.value;
        onCVChangeCallback(cv);
      }
    });
  });

  container.querySelectorAll('[data-lang-level]').forEach(select => {
    select.addEventListener('change', () => {
      const idx = parseInt(select.getAttribute('data-lang-level'), 10);
      if (cv.skills.languages[idx]) {
        cv.skills.languages[idx].level = select.value;
        onCVChangeCallback(cv);
      }
    });
  });

  container.querySelectorAll('[data-remove-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-remove-lang'), 10);
      cv.skills.languages.splice(idx, 1);
      renderLanguageItems(cv, onCVChangeCallback);
      onCVChangeCallback(cv);
    });
  });
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;');
}
