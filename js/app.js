/**
 * European CV Studio - Application Orchestrator
 * Three-Pane Modular Architecture with Live Page-Budget Gauge, ATS Diagnostics & Bullet Polisher
 */

import { loadStoredCV, saveCVDirect } from './model/storage.js';
import { createSampleEuropeanCV, TEMPLATE_IDS, CEFR_LEVELS } from './model/cv-schema.js';
import { renderCVPreview } from './components/preview-renderer.js';
import { exportCVToPDF } from './engines/pdf-exporter.js';
import { COUNTRY_STANDARDS } from './engines/country-rules.js';
import { analyzeCVForATS } from './engines/ats-scorer.js';
import { calculateJobMatch } from './engines/job-matcher.js';

let currentCV = null;
let currentZoom = 0.85;

function initStudio() {
  currentCV = loadStoredCV();
  currentCV.meta = currentCV.meta || {};
  currentCV.personal = currentCV.personal || {};
  currentCV.skills = currentCV.skills || { technical: [], languages: [] };

  const previewSheet = document.getElementById('preview-sheet');
  const countrySelect = document.getElementById('country-select');
  const languageSelect = document.getElementById('language-select');
  const templateSelect = document.getElementById('template-select');
  const spacingSelect = document.getElementById('spacing-select');
  const togglePhoto = document.getElementById('toggle-photo');
  const toggleSignature = document.getElementById('toggle-signature');
  const complianceBox = document.getElementById('compliance-note-box');
  const budgetFill = document.getElementById('budget-fill');
  const budgetLabel = document.getElementById('budget-status-label');
  const btnAutoFit = document.getElementById('btn-auto-fit');
  const drawer = document.getElementById('job-drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const toastEl = document.getElementById('toast-notice');

  const showToast = (message) => {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2800);
  };

  // Populate static inputs from loaded CV
  const syncStaticInputsFromCV = () => {
    const map = {
      'p-first-name': currentCV.personal.firstName || '',
      'p-last-name': currentCV.personal.lastName || '',
      'p-title': currentCV.personal.title || '',
      'p-email': currentCV.personal.email || '',
      'p-phone': currentCV.personal.phone || '',
      'p-city': currentCV.personal.city || '',
      'p-birth': currentCV.personal.birthDate || '',
      'p-nationality': currentCV.personal.nationality || '',
      'p-linkedin': currentCV.personal.linkedin || '',
      'f-summary': currentCV.summary || '',
      'f-skills-tech': (currentCV.skills.technical || []).join(', ')
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
  };

  const syncRailState = () => {
    const country = currentCV.meta.targetCountry || 'DE';
    if (countrySelect) countrySelect.value = country;
    if (languageSelect) languageSelect.value = currentCV.meta.language || 'en';
    if (templateSelect) templateSelect.value = currentCV.meta.template || TEMPLATE_IDS.GERMAN_DIN;
    if (spacingSelect) spacingSelect.value = currentCV.meta.spacing || 'normal';
    if (togglePhoto) togglePhoto.checked = currentCV.meta.showPhoto !== false;
    if (toggleSignature) toggleSignature.checked = currentCV.meta.includeSignatureBlock !== false;

    const std = COUNTRY_STANDARDS[country] || COUNTRY_STANDARDS.DE;
    if (complianceBox) complianceBox.textContent = std.complianceNote;

    const isUK = country === 'UK';
    const birthGrp = document.getElementById('group-birth');
    const natGrp = document.getElementById('group-nationality');
    const photoUploadGrp = document.getElementById('group-photo-upload');
    const formalSection = document.getElementById('formal-toggles-section');
    if (birthGrp) birthGrp.style.display = isUK ? 'none' : 'flex';
    if (natGrp) natGrp.style.display = isUK ? 'none' : 'flex';
    if (photoUploadGrp) photoUploadGrp.style.display = isUK ? 'none' : 'flex';
    if (formalSection) formalSection.style.display = isUK ? 'none' : 'block';

    const activeColor = currentCV.meta.accentColor || '#1e3a8a';
    document.querySelectorAll('.color-dot').forEach(dot => {
      dot.classList.toggle('active', dot.getAttribute('data-color') === activeColor);
    });
  };

  // Update Live ATS Score Pill & Drawer Diagnostics
  const updateATSReport = () => {
    const ats = analyzeCVForATS(currentCV);
    const pillLabel = document.getElementById('ats-score-label');
    const pill = document.getElementById('btn-ats-pill');
    if (pillLabel) pillLabel.textContent = `ATS: ${ats.score}/100 (${ats.grade})`;
    if (pill) {
      const strong = ats.score >= 85;
      pill.style.color = strong ? '#34d399' : '#fbbf24';
      pill.style.borderColor = strong ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.35)';
      pill.style.background = strong ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)';
    }

    const badge = document.getElementById('drawer-ats-badge');
    const checksEl = document.getElementById('drawer-ats-checks');
    const tipsEl = document.getElementById('drawer-ats-tips');
    if (badge) badge.textContent = `${ats.score}/100 (${ats.grade}) · ${ats.status}`;
    if (checksEl) {
      checksEl.innerHTML = ats.checks.map(c => `
        <div class="ats-check-row">
          <span style="color: ${c.passed ? '#34d399' : '#fbbf24'};">${c.passed ? '✓' : '!'} ${escapeHTML(c.category)}</span>
          <span style="color: #a1a7b5;">${c.points}/${c.maxPoints} pts</span>
        </div>
      `).join('');
    }
    if (tipsEl) {
      tipsEl.innerHTML = ats.suggestions.length
        ? ats.suggestions.map(s => `<div>• ${escapeHTML(s)}</div>`).join('')
        : '<span style="color: #34d399;">All core European ATS criteria met.</span>';
    }
  };

  // Live Page Budget Calculator
  const calculatePageBudget = () => {
    requestAnimationFrame(() => {
      if (!previewSheet) return;
      const singlePageMax = 1123; // 297mm at 96 DPI (~1122.5px rounded)
      const actualScrollHeight = previewSheet.scrollHeight;

      let contentHeight = actualScrollHeight;
      const lastChild = previewSheet.lastElementChild;
      if (actualScrollHeight <= singlePageMax + 2 && lastChild) {
        const sheetRect = previewSheet.getBoundingClientRect();
        const lastRect = lastChild.getBoundingClientRect();
        const scale = currentZoom || 1;
        contentHeight = Math.round(((lastRect.bottom - sheetRect.top) / scale) + 48);
      }

      if (actualScrollHeight <= singlePageMax + 2) {
        const pct = Math.min(99, Math.max(15, Math.round((contentHeight / singlePageMax) * 100)));
        if (budgetFill) {
          budgetFill.style.width = `${pct}%`;
          budgetFill.style.backgroundColor = '#10b981';
        }
        if (budgetLabel) {
          budgetLabel.textContent = `Page 1: ${pct}% full (Ideal 1-Page Fit)`;
          budgetLabel.style.color = '#34d399';
        }
        if (btnAutoFit) btnAutoFit.style.display = 'none';
      } else {
        const page2Px = actualScrollHeight - singlePageMax;
        const page2Pct = Math.min(100, Math.max(1, Math.round((page2Px / singlePageMax) * 100)));
        if (budgetFill) {
          budgetFill.style.width = '100%';
          budgetFill.style.backgroundColor = '#f59e0b';
        }
        if (budgetLabel) {
          budgetLabel.textContent = `Page 2: +${page2Pct}% spillover`;
          budgetLabel.style.color = '#fbbf24';
        }
        if (btnAutoFit) btnAutoFit.style.display = 'inline-flex';
      }
    });
  };

  // Central Live Render
  const refreshCanvas = () => {
    renderCVPreview(currentCV, previewSheet);
    calculatePageBudget();
    updateATSReport();
  };

  // Render Modular CMS Experience Cards
  const renderExperienceCards = () => {
    const container = document.getElementById('experience-card-list');
    if (!container) return;

    container.innerHTML = (currentCV.experience || []).map((exp, idx) => `
      <div class="cms-subcard">
        <div class="cms-subcard-head">
          <span class="cms-subcard-title">${escapeHTML(exp.position || 'Position')} · ${escapeHTML(exp.company || 'Company')}</span>
          <button class="btn-remove-inline" data-del-exp="${idx}" type="button">Remove</button>
        </div>
        <div style="padding: 11px; display: flex; flex-direction: column; gap: 8px;">
          <div class="field-grid-2">
            <div class="field-group">
              <label class="field-label">Role Title</label>
              <input type="text" class="field-input" data-exp-f="position" data-idx="${idx}" value="${escapeAttr(exp.position || '')}">
            </div>
            <div class="field-group">
              <label class="field-label">Company Name</label>
              <input type="text" class="field-input" data-exp-f="company" data-idx="${idx}" value="${escapeAttr(exp.company || '')}">
            </div>
          </div>
          <div class="field-grid-2">
            <div class="field-group">
              <label class="field-label">Date Range</label>
              <input type="text" class="field-input" data-exp-f="dateRange" data-idx="${idx}" value="${escapeAttr((exp.startDate || '') + ' – ' + (exp.endDate || ''))}">
            </div>
            <div class="field-group">
              <label class="field-label">City / Country</label>
              <input type="text" class="field-input" data-exp-f="city" data-idx="${idx}" value="${escapeAttr(exp.city || '')}">
            </div>
          </div>
          <div class="field-group">
            <label class="field-label">Achievements &amp; Impact (1 per line)</label>
            <textarea class="field-input" data-exp-f="bullets" data-idx="${idx}" rows="3">${escapeHTML((exp.bullets || []).join('\n'))}</textarea>
          </div>

          <!-- Bullet Polisher Helper -->
          <div class="bullet-polisher-bar">
            <span>Action Verb Enhancers (click to append):</span>
            <div class="bullet-action-chips">
              <button class="chip-btn" type="button" data-insert-verb="Architected" data-idx="${idx}">+ Architected...</button>
              <button class="chip-btn" type="button" data-insert-verb="Reduced latency by 40%" data-idx="${idx}">+ Reduced latency...</button>
              <button class="chip-btn" type="button" data-insert-verb="Spearheaded" data-idx="${idx}">+ Spearheaded...</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-exp-f]').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = parseInt(inp.getAttribute('data-idx'), 10);
        const f = inp.getAttribute('data-exp-f');
        const item = currentCV.experience[idx];
        if (!item) return;

        if (f === 'dateRange') {
          const parts = inp.value.split(/[–-]/).map(s => s.trim());
          item.startDate = parts[0] || '';
          item.endDate = parts[1] || '';
        } else if (f === 'bullets') {
          item.bullets = inp.value.split('\n').filter(Boolean);
        } else {
          item[f] = inp.value;
        }

        const headerTitle = inp.closest('.cms-subcard')?.querySelector('.cms-subcard-title');
        if (headerTitle) {
          headerTitle.textContent = `${item.position || 'Position'} · ${item.company || 'Company'}`;
        }
        saveCVDirect(currentCV);
        refreshCanvas();
      });
    });

    container.querySelectorAll('[data-del-exp]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-del-exp'), 10);
        currentCV.experience.splice(idx, 1);
        saveCVDirect(currentCV);
        renderExperienceCards();
        refreshCanvas();
      });
    });

    container.querySelectorAll('[data-insert-verb]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const verb = btn.getAttribute('data-insert-verb');
        const item = currentCV.experience[idx];
        if (item) {
          item.bullets = item.bullets || [];
          item.bullets.push(`${verb} mission-critical services delivering measurable business impact.`);
          saveCVDirect(currentCV);
          renderExperienceCards();
          refreshCanvas();
        }
      });
    });
  };

  // Render Education Cards
  const renderEducationCards = () => {
    const container = document.getElementById('education-card-list');
    if (!container) return;

    container.innerHTML = (currentCV.education || []).map((edu, idx) => `
      <div class="cms-subcard">
        <div class="cms-subcard-head">
          <span class="cms-subcard-title">${escapeHTML(edu.degree || 'Degree')}</span>
          <button class="btn-remove-inline" data-del-edu="${idx}" type="button">Remove</button>
        </div>
        <div style="padding: 11px; display: flex; flex-direction: column; gap: 8px;">
          <div class="field-grid-2">
            <div class="field-group">
              <label class="field-label">Degree / Field</label>
              <input type="text" class="field-input" data-edu-f="degree" data-idx="${idx}" value="${escapeAttr(edu.degree || '')}">
            </div>
            <div class="field-group">
              <label class="field-label">Institution</label>
              <input type="text" class="field-input" data-edu-f="institution" data-idx="${idx}" value="${escapeAttr(edu.institution || '')}">
            </div>
          </div>
          <div class="field-grid-2">
            <div class="field-group">
              <label class="field-label">Dates</label>
              <input type="text" class="field-input" data-edu-f="dateRange" data-idx="${idx}" value="${escapeAttr((edu.startDate || '') + ' – ' + (edu.endDate || ''))}">
            </div>
            <div class="field-group">
              <label class="field-label">Honors / Grade</label>
              <input type="text" class="field-input" data-edu-f="grade" data-idx="${idx}" placeholder="e.g. 1.3 / First Class" value="${escapeAttr(edu.grade || '')}">
            </div>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-edu-f]').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = parseInt(inp.getAttribute('data-idx'), 10);
        const f = inp.getAttribute('data-edu-f');
        const item = currentCV.education[idx];
        if (!item) return;

        if (f === 'dateRange') {
          const parts = inp.value.split(/[–-]/).map(s => s.trim());
          item.startDate = parts[0] || '';
          item.endDate = parts[1] || '';
        } else {
          item[f] = inp.value;
        }

        const headerTitle = inp.closest('.cms-subcard')?.querySelector('.cms-subcard-title');
        if (headerTitle) headerTitle.textContent = item.degree || 'Degree';

        saveCVDirect(currentCV);
        refreshCanvas();
      });
    });

    container.querySelectorAll('[data-del-edu]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-del-edu'), 10);
        currentCV.education.splice(idx, 1);
        saveCVDirect(currentCV);
        renderEducationCards();
        refreshCanvas();
      });
    });
  };

  // Render Languages (CEFR) Cards
  const renderLanguageCards = () => {
    const container = document.getElementById('language-card-list');
    if (!container) return;

    const langs = currentCV.skills?.languages || [];
    container.innerHTML = langs.map((lang, idx) => `
      <div class="lang-cms-row">
        <input type="text" class="field-input" placeholder="Language" data-lang-f="language" data-idx="${idx}" value="${escapeAttr(lang.language || '')}">
        <select class="select-box" data-lang-f="level" data-idx="${idx}">
          ${CEFR_LEVELS.map(lvl => `
            <option value="${escapeAttr(lvl.label)}" ${lang.level === lvl.label ? 'selected' : ''}>${escapeHTML(lvl.label)}</option>
          `).join('')}
        </select>
        <button class="btn-remove-inline" data-del-lang="${idx}" type="button" title="Remove language">×</button>
      </div>
    `).join('');

    container.querySelectorAll('[data-lang-f]').forEach(el => {
      const evt = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(evt, () => {
        const idx = parseInt(el.getAttribute('data-idx'), 10);
        const f = el.getAttribute('data-lang-f');
        if (currentCV.skills.languages[idx]) {
          currentCV.skills.languages[idx][f] = el.value;
          saveCVDirect(currentCV);
          refreshCanvas();
        }
      });
    });

    container.querySelectorAll('[data-del-lang]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-del-lang'), 10);
        currentCV.skills.languages.splice(idx, 1);
        saveCVDirect(currentCV);
        renderLanguageCards();
        refreshCanvas();
      });
    });
  };

  // Bind Static Personal & Summary Fields
  const bindStaticField = (id, setter) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => {
        setter(e.target.value);
        saveCVDirect(currentCV);
        refreshCanvas();
      });
    }
  };

  bindStaticField('p-first-name', val => { currentCV.personal.firstName = val; });
  bindStaticField('p-last-name', val => { currentCV.personal.lastName = val; });
  bindStaticField('p-title', val => { currentCV.personal.title = val; });
  bindStaticField('p-email', val => { currentCV.personal.email = val; });
  bindStaticField('p-phone', val => { currentCV.personal.phone = val; });
  bindStaticField('p-city', val => { currentCV.personal.city = val; });
  bindStaticField('p-birth', val => { currentCV.personal.birthDate = val; });
  bindStaticField('p-nationality', val => { currentCV.personal.nationality = val; });
  bindStaticField('p-linkedin', val => { currentCV.personal.linkedin = val; });
  bindStaticField('f-summary', val => { currentCV.summary = val; });
  bindStaticField('f-skills-tech', val => {
    currentCV.skills.technical = val.split(',').map(s => s.trim()).filter(Boolean);
  });

  // Photo Upload & Clear
  const photoInput = document.getElementById('p-photo-file');
  document.getElementById('btn-upload-photo')?.addEventListener('click', () => photoInput?.click());
  photoInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      currentCV.personal.photoUrl = ev.target.result;
      currentCV.meta.showPhoto = true;
      if (togglePhoto) togglePhoto.checked = true;
      saveCVDirect(currentCV);
      refreshCanvas();
      showToast('Portrait photo updated.');
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('btn-clear-photo')?.addEventListener('click', () => {
    currentCV.personal.photoUrl = '';
    if (photoInput) photoInput.value = '';
    saveCVDirect(currentCV);
    refreshCanvas();
    showToast('Portrait photo removed.');
  });

  // Add Position / Degree / Language Handlers
  const addNewExperience = () => {
    currentCV.experience = currentCV.experience || [];
    currentCV.experience.unshift({
      position: 'Senior Engineer',
      company: 'Tech Enterprise',
      city: 'Berlin, Germany',
      startDate: '01/2023',
      endDate: 'Present',
      bullets: ['Spearheaded cross-functional initiative delivering 30% latency reduction.'],
      technologies: ['TypeScript', 'Go']
    });
    saveCVDirect(currentCV);
    renderExperienceCards();
    refreshCanvas();
  };

  const addNewEducation = () => {
    currentCV.education = currentCV.education || [];
    currentCV.education.unshift({
      degree: 'B.Sc. Computer Science',
      institution: 'Technical University',
      startDate: '10/2019',
      endDate: '07/2023',
      grade: 'First Class'
    });
    saveCVDirect(currentCV);
    renderEducationCards();
    refreshCanvas();
  };

  document.getElementById('btn-add-job')?.addEventListener('click', addNewExperience);
  document.getElementById('btn-add-edu')?.addEventListener('click', addNewEducation);
  document.getElementById('btn-add-lang')?.addEventListener('click', () => {
    currentCV.skills.languages = currentCV.skills.languages || [];
    currentCV.skills.languages.push({ language: 'Spanish', level: CEFR_LEVELS[3].label });
    saveCVDirect(currentCV);
    renderLanguageCards();
    refreshCanvas();
  });

  // Direct Canvas Contenteditable Editing & Hover Actions (No focus reset on keystroke)
  previewSheet?.addEventListener('input', (e) => {
    const target = e.target;
    if (!target || target.getAttribute('contenteditable') !== 'true') return;
    const text = target.textContent.trim();

    const bind = target.getAttribute('data-bind');
    if (bind) {
      if (bind === 'personal.fullName') {
        const parts = text.split(/\s+/);
        currentCV.personal.firstName = parts[0] || '';
        currentCV.personal.lastName = parts.slice(1).join(' ') || '';
      } else if (bind.startsWith('personal.')) {
        const prop = bind.split('.')[1];
        currentCV.personal[prop] = text;
      } else if (bind === 'summary') {
        currentCV.summary = text;
      } else if (bind.startsWith('signature.')) {
        const prop = bind.split('.')[1];
        currentCV.signature = currentCV.signature || {};
        currentCV.signature[prop] = text;
      }
      syncStaticInputsFromCV();
    }

    const expField = target.getAttribute('data-exp-field');
    if (expField) {
      const idx = parseInt(target.getAttribute('data-idx'), 10);
      const item = currentCV.experience?.[idx];
      if (item) {
        if (expField === 'dateRange') {
          const parts = text.split(/[–-]/).map(s => s.trim());
          item.startDate = parts[0] || '';
          item.endDate = parts[1] || '';
        } else {
          item[expField] = text;
        }
        renderExperienceCards();
      }
    }

    const expBulletAttr = target.getAttribute('data-exp-bullet');
    if (expBulletAttr) {
      const [idxStr, bIdxStr] = expBulletAttr.split(':');
      const idx = parseInt(idxStr, 10);
      const bIdx = parseInt(bIdxStr, 10);
      if (currentCV.experience?.[idx]?.bullets) {
        currentCV.experience[idx].bullets[bIdx] = text;
        renderExperienceCards();
      }
    }

    const eduField = target.getAttribute('data-edu-field');
    if (eduField) {
      const idx = parseInt(target.getAttribute('data-idx'), 10);
      const item = currentCV.education?.[idx];
      if (item) {
        if (eduField === 'dateRange') {
          const parts = text.split(/[–-]/).map(s => s.trim());
          item.startDate = parts[0] || '';
          item.endDate = parts[1] || '';
        } else {
          item[eduField] = text;
        }
        renderEducationCards();
      }
    }

    saveCVDirect(currentCV);
    calculatePageBudget();
    updateATSReport();
  });

  previewSheet?.addEventListener('click', (e) => {
    const addBulletBtn = e.target.closest('[data-add-bullet]');
    if (addBulletBtn) {
      const idx = parseInt(addBulletBtn.getAttribute('data-add-bullet'), 10);
      const item = currentCV.experience?.[idx];
      if (item) {
        item.bullets = item.bullets || [];
        item.bullets.push('Delivered scalable engineering outcome with measurable performance gains.');
        saveCVDirect(currentCV);
        renderExperienceCards();
        refreshCanvas();
      }
      return;
    }

    const delExpBtn = e.target.closest('[data-delete-exp]');
    if (delExpBtn) {
      const idx = parseInt(delExpBtn.getAttribute('data-delete-exp'), 10);
      currentCV.experience.splice(idx, 1);
      saveCVDirect(currentCV);
      renderExperienceCards();
      refreshCanvas();
      return;
    }

    const delEduBtn = e.target.closest('[data-delete-edu]');
    if (delEduBtn) {
      const idx = parseInt(delEduBtn.getAttribute('data-delete-edu'), 10);
      currentCV.education.splice(idx, 1);
      saveCVDirect(currentCV);
      renderEducationCards();
      refreshCanvas();
      return;
    }

    if (e.target.closest('#btn-trigger-add-exp')) {
      addNewExperience();
      return;
    }
    if (e.target.closest('#btn-trigger-add-edu')) {
      addNewEducation();
    }
  });

  // Rail Settings Controls
  countrySelect?.addEventListener('change', (e) => {
    currentCV.meta.targetCountry = e.target.value;
    syncRailState();
    saveCVDirect(currentCV);
    refreshCanvas();
  });

  languageSelect?.addEventListener('change', (e) => {
    currentCV.meta.language = e.target.value;
    saveCVDirect(currentCV);
    refreshCanvas();
    showToast(`CV headings set to ${e.target.options[e.target.selectedIndex].text}.`);
  });

  templateSelect?.addEventListener('change', (e) => {
    currentCV.meta.template = e.target.value;
    saveCVDirect(currentCV);
    refreshCanvas();
  });

  spacingSelect?.addEventListener('change', (e) => {
    currentCV.meta.spacing = e.target.value;
    saveCVDirect(currentCV);
    refreshCanvas();
  });

  togglePhoto?.addEventListener('change', (e) => {
    currentCV.meta.showPhoto = e.target.checked;
    saveCVDirect(currentCV);
    refreshCanvas();
  });

  toggleSignature?.addEventListener('change', (e) => {
    currentCV.meta.includeSignatureBlock = e.target.checked;
    saveCVDirect(currentCV);
    refreshCanvas();
  });

  btnAutoFit?.addEventListener('click', () => {
    currentCV.meta.spacing = 'compact';
    if (spacingSelect) spacingSelect.value = 'compact';
    saveCVDirect(currentCV);
    refreshCanvas();
    showToast('Auto-fitted margins onto 1 physical A4 page.');
  });

  // Color Swatches
  document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      currentCV.meta.accentColor = dot.getAttribute('data-color');
      saveCVDirect(currentCV);
      refreshCanvas();
    });
  });

  // Zoom Controls (Auto-fits canvas width gracefully across desktop & sidebar panes)
  const computeFitZoom = () => {
    const canvasPane = document.querySelector('.pane-canvas');
    if (!canvasPane) return 0.85;
    const availW = canvasPane.clientWidth - 48;
    const a4WidthPx = 794; // 210mm at 96 DPI
    if (availW <= 0) return 0.85;
    return Math.min(0.88, Math.max(0.45, Math.floor((availW / a4WidthPx) * 100) / 100));
  };

  const applyZoom = (scale) => {
    if (previewSheet) previewSheet.style.transform = `scale(${scale})`;
  };

  document.getElementById('zoom-in')?.addEventListener('click', () => {
    currentZoom = Math.min(1.3, +(currentZoom + 0.1).toFixed(2));
    applyZoom(currentZoom);
  });

  document.getElementById('zoom-out')?.addEventListener('click', () => {
    currentZoom = Math.max(0.4, +(currentZoom - 0.1).toFixed(2));
    applyZoom(currentZoom);
  });

  document.getElementById('zoom-fit')?.addEventListener('click', () => {
    currentZoom = computeFitZoom();
    applyZoom(currentZoom);
    calculatePageBudget();
  });

  window.addEventListener('resize', () => {
    currentZoom = computeFitZoom();
    applyZoom(currentZoom);
    calculatePageBudget();
  });

  // Sample Loader
  document.getElementById('btn-load-sample')?.addEventListener('click', () => {
    if (confirm('Reset to default European English sample CV? Your current changes will be replaced.')) {
      currentCV = createSampleEuropeanCV();
      saveCVDirect(currentCV);
      syncStaticInputsFromCV();
      syncRailState();
      renderExperienceCards();
      renderEducationCards();
      renderLanguageCards();
      refreshCanvas();
      showToast('Sample CV restored.');
    }
  });

  // PDF Export
  document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
    exportCVToPDF(currentCV);
  });

  // ATS & Job Matcher Drawer
  const openDrawer = () => {
    updateATSReport();
    drawer?.classList.add('open');
    drawerBackdrop?.classList.add('active');
  };
  const closeDrawer = () => {
    drawer?.classList.remove('open');
    drawerBackdrop?.classList.remove('active');
  };

  document.getElementById('btn-open-matcher')?.addEventListener('click', openDrawer);
  document.getElementById('btn-ats-pill')?.addEventListener('click', openDrawer);
  document.getElementById('btn-close-drawer')?.addEventListener('click', closeDrawer);
  drawerBackdrop?.addEventListener('click', closeDrawer);

  document.getElementById('btn-analyze-job')?.addEventListener('click', () => {
    const text = document.getElementById('job-description-input')?.value || '';
    if (!text.trim()) {
      showToast('Paste a job posting first to run keyword matching.');
      return;
    }

    const match = calculateJobMatch(currentCV, text);
    document.getElementById('job-analysis-results').style.display = 'block';
    document.getElementById('job-match-badge').textContent = `${match.matchPercentage}% Match`;

    const matchedBox = document.getElementById('job-matched-tags');
    matchedBox.innerHTML = match.matched.length > 0
      ? match.matched.map(m => `<span class="tag-interactive tag-matched">✓ ${escapeHTML(m)}</span>`).join('')
      : '<span style="font-size: 11px; color: #a1a7b5;">No direct keyword matches yet.</span>';

    const missingBox = document.getElementById('job-missing-tags');
    missingBox.innerHTML = match.missing.length > 0
      ? match.missing.map(m => `
          <span class="tag-interactive tag-missing" data-add-kw="${escapeAttr(m)}" title="Click to add to your skills">
            + ${escapeHTML(m)}
          </span>
        `).join('')
      : '<span style="font-size: 11px; color: #34d399; font-weight: 600;">All detected qualifications are present.</span>';

    missingBox.querySelectorAll('[data-add-kw]').forEach(pill => {
      pill.addEventListener('click', () => {
        const kw = pill.getAttribute('data-add-kw');
        currentCV.skills.technical = currentCV.skills.technical || [];
        if (!currentCV.skills.technical.map(s => s.toLowerCase()).includes(kw.toLowerCase())) {
          currentCV.skills.technical.push(kw.charAt(0).toUpperCase() + kw.slice(1));
          const techInput = document.getElementById('f-skills-tech');
          if (techInput) techInput.value = currentCV.skills.technical.join(', ');
          saveCVDirect(currentCV);
          refreshCanvas();
          document.getElementById('btn-analyze-job').click();
        }
      });
    });

    document.getElementById('job-match-recs').textContent = match.recommendations.join(' ');
  });

  // Initial Mount
  currentZoom = computeFitZoom();
  syncStaticInputsFromCV();
  syncRailState();
  renderExperienceCards();
  renderEducationCards();
  renderLanguageCards();
  applyZoom(currentZoom);
  refreshCanvas();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStudio);
} else {
  initStudio();
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;');
}
