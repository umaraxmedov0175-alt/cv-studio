/**
 * European CV Studio - Direct Manipulation Orchestrator
 */

import { loadStoredCV, autoSaveCV, saveCVDirect } from './model/storage.js';
import { createSampleGermanCV, TEMPLATE_IDS } from './model/cv-schema.js';
import { renderCVPreview } from './components/preview-renderer.js';
import { analyzeCVForATS } from './engines/ats-scorer.js';
import { exportCVToPDF } from './engines/pdf-exporter.js';
import { COUNTRY_STANDARDS } from './engines/country-rules.js';
import { calculateJobMatch } from './engines/job-matcher.js';

let currentCV = null;

document.addEventListener('DOMContentLoaded', () => {
  currentCV = loadStoredCV();

  const previewSheet = document.getElementById('preview-sheet');
  const templateSelect = document.getElementById('select-template');
  const countrySelect = document.getElementById('select-country');
  const complianceText = document.getElementById('compliance-note-text');
  const autosaveIndicator = document.getElementById('autosave-indicator');
  const atsScoreNum = document.getElementById('ats-score-num');

  // Set initial control values
  if (templateSelect) templateSelect.value = currentCV.meta?.template || TEMPLATE_IDS.GERMAN_DIN;
  if (countrySelect) countrySelect.value = currentCV.meta?.targetCountry || 'DE';

  const updateComplianceNote = (code) => {
    const std = COUNTRY_STANDARDS[code] || COUNTRY_STANDARDS.DE;
    if (complianceText) complianceText.textContent = `${std.flag} ${std.complianceNote}`;
  };
  updateComplianceNote(currentCV.meta?.targetCountry || 'DE');

  // Central Render & ATS Update
  const refreshUI = () => {
    renderCVPreview(currentCV, previewSheet);
    const analysis = analyzeCVForATS(currentCV);
    if (atsScoreNum) atsScoreNum.textContent = analysis.score;
  };

  refreshUI();

  // 1. DIRECT-MANIPULATION TWO-WAY DATA BINDING
  // Handles real-time input directly from the editable A4 sheet without resetting DOM/cursor
  previewSheet.addEventListener('input', (e) => {
    const target = e.target;
    const bindPath = target.getAttribute('data-bind');
    const text = target.innerText.trim();

    if (bindPath) {
      if (bindPath === 'personal.fullName') {
        const parts = text.split(' ');
        currentCV.personal.firstName = parts[0] || '';
        currentCV.personal.lastName = parts.slice(1).join(' ') || '';
      } else if (bindPath.startsWith('personal.')) {
        const key = bindPath.replace('personal.', '');
        currentCV.personal[key] = text;
      } else if (bindPath === 'summary') {
        currentCV.summary = text;
      } else if (bindPath.startsWith('signature.')) {
        const key = bindPath.replace('signature.', '');
        currentCV.signature[key] = text;
      }
    } else if (target.hasAttribute('data-exp-field')) {
      const idx = parseInt(target.getAttribute('data-idx'), 10);
      const field = target.getAttribute('data-exp-field');
      if (currentCV.experience[idx]) {
        if (field === 'dateRange') {
          const parts = text.split('–').map(s => s.trim());
          currentCV.experience[idx].startDate = parts[0] || '';
          currentCV.experience[idx].endDate = parts[1] || '';
        } else {
          currentCV.experience[idx][field] = text;
        }
      }
    } else if (target.hasAttribute('data-exp-bullet')) {
      const [idx, bIdx] = target.getAttribute('data-exp-bullet').split(':').map(Number);
      if (currentCV.experience[idx] && currentCV.experience[idx].bullets) {
        currentCV.experience[idx].bullets[bIdx] = text;
      }
    } else if (target.hasAttribute('data-edu-field')) {
      const idx = parseInt(target.getAttribute('data-idx'), 10);
      const field = target.getAttribute('data-edu-field');
      if (currentCV.education[idx]) {
        if (field === 'dateRange') {
          const parts = text.split('–').map(s => s.trim());
          currentCV.education[idx].startDate = parts[0] || '';
          currentCV.education[idx].endDate = parts[1] || '';
        } else {
          currentCV.education[idx][field] = text;
        }
      }
    }

    // Debounced silent background save
    autoSaveCV(currentCV, (time) => {
      if (autosaveIndicator) {
        autosaveIndicator.textContent = `✓ Gespeichert`;
      }
    });

    // Update ATS Score live
    const analysis = analyzeCVForATS(currentCV);
    if (atsScoreNum) atsScoreNum.textContent = analysis.score;
  });

  // 2. DOCUMENT CLICK ACTIONS (ADD / DELETE ITEMS)
  previewSheet.addEventListener('click', (e) => {
    const target = e.target;

    // Delete Experience
    if (target.hasAttribute('data-delete-exp')) {
      const idx = parseInt(target.getAttribute('data-delete-exp'), 10);
      currentCV.experience.splice(idx, 1);
      saveCVDirect(currentCV);
      refreshUI();
    }
    // Add Bullet to Experience
    else if (target.hasAttribute('data-add-bullet')) {
      const idx = parseInt(target.getAttribute('data-add-bullet'), 10);
      currentCV.experience[idx].bullets = currentCV.experience[idx].bullets || [];
      currentCV.experience[idx].bullets.push('Neuer messbarer Erfolg.');
      saveCVDirect(currentCV);
      refreshUI();
    }
    // Delete Education
    else if (target.hasAttribute('data-delete-edu')) {
      const idx = parseInt(target.getAttribute('data-delete-edu'), 10);
      currentCV.education.splice(idx, 1);
      saveCVDirect(currentCV);
      refreshUI();
    }
    // Add New Experience Position
    else if (target.id === 'btn-trigger-add-exp') {
      currentCV.experience = currentCV.experience || [];
      currentCV.experience.unshift({
        position: 'Neue Position',
        company: 'Unternehmen GmbH',
        startDate: '2024',
        endDate: 'Heute',
        current: true,
        bullets: ['Verantwortung und quantifizierbarer Projekterfolg.'],
        technologies: ['TypeScript', 'Docker']
      });
      saveCVDirect(currentCV);
      refreshUI();
    }
    // Add New Education Qualification
    else if (target.id === 'btn-trigger-add-edu') {
      currentCV.education = currentCV.education || [];
      currentCV.education.unshift({
        degree: 'Bachelor / Master of Science',
        institution: 'Universität / Hochschule',
        startDate: '2020',
        endDate: '2023',
        grade: '1,5'
      });
      saveCVDirect(currentCV);
      refreshUI();
    }
  });

  // 3. EXECUTIVE DOCK CONTROLS
  countrySelect?.addEventListener('change', (e) => {
    const code = e.target.value;
    currentCV.meta.targetCountry = code;
    updateComplianceNote(code);

    if (code === 'UK' && currentCV.meta.template === TEMPLATE_IDS.GERMAN_DIN) {
      currentCV.meta.template = TEMPLATE_IDS.MODERN_EUROPEAN;
      if (templateSelect) templateSelect.value = TEMPLATE_IDS.MODERN_EUROPEAN;
    }
    saveCVDirect(currentCV);
    refreshUI();
  });

  templateSelect?.addEventListener('change', (e) => {
    currentCV.meta.template = e.target.value;
    saveCVDirect(currentCV);
    refreshUI();
  });

  document.getElementById('btn-load-sample')?.addEventListener('click', () => {
    if (confirm('Musterlebenslauf laden? Vorhandene Änderungen werden überschrieben.')) {
      currentCV = createSampleGermanCV();
      saveCVDirect(currentCV);
      refreshUI();
    }
  });

  document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
    exportCVToPDF(currentCV);
  });

  // 4. SLIDE-OVER ATS JOB MATCHER DRAWER
  const drawer = document.getElementById('job-drawer');
  const btnOpenMatcher = document.getElementById('btn-open-job-matcher');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const atsBadge = document.getElementById('ats-badge');
  const btnAnalyze = document.getElementById('btn-analyze-job');
  const jobInput = document.getElementById('job-description-input');
  const jobResults = document.getElementById('job-analysis-results');
  const jobMatchBadge = document.getElementById('job-match-badge');
  const matchedTagsBox = document.getElementById('job-matched-tags');
  const missingTagsBox = document.getElementById('job-missing-tags');
  const recsBox = document.getElementById('job-match-recs');

  const openDrawer = () => drawer?.classList.add('open');
  const closeDrawer = () => drawer?.classList.remove('open');

  btnOpenMatcher?.addEventListener('click', openDrawer);
  atsBadge?.addEventListener('click', openDrawer);
  btnCloseDrawer?.addEventListener('click', closeDrawer);

  btnAnalyze?.addEventListener('click', () => {
    const text = jobInput?.value || '';
    if (!text.trim()) {
      alert('Bitte fügen Sie den Text einer Stellenanzeige ein.');
      return;
    }

    const runAnalysis = () => {
      const match = calculateJobMatch(currentCV, text);
      jobResults.style.display = 'block';

      if (jobMatchBadge) {
        jobMatchBadge.textContent = `${match.matchPercentage}% Match`;
        jobMatchBadge.style.background = match.matchPercentage >= 75 ? '#ecfdf5' : '#fef2f2';
        jobMatchBadge.style.color = match.matchPercentage >= 75 ? '#065f46' : '#991b1b';
      }

      if (matchedTagsBox) {
        matchedTagsBox.innerHTML = match.matched.length > 0
          ? match.matched.map(m => `<span class="tag-interactive tag-matched">✓ ${m}</span>`).join('')
          : '<span style="font-size: 11px; color: #9ca3af;">Keine Übereinstimmungen bisher.</span>';
      }

      if (missingTagsBox) {
        missingTagsBox.innerHTML = match.missing.length > 0
          ? match.missing.map(m => `
              <span class="tag-interactive tag-missing" data-add="${m}" title="Klicken zum Hinzufügen">
                + ${m}
              </span>
            `).join('')
          : '<span style="font-size: 11px; color: #059669; font-weight: 600;">Alle gesuchten Keywords vorhanden!</span>';

        // 1-Click addition of missing skill
        missingTagsBox.querySelectorAll('[data-add]').forEach(pill => {
          pill.addEventListener('click', () => {
            const skill = pill.getAttribute('data-add');
            currentCV.skills = currentCV.skills || {};
            currentCV.skills.technical = currentCV.skills.technical || [];
            if (!currentCV.skills.technical.map(s => s.toLowerCase()).includes(skill)) {
              currentCV.skills.technical.push(skill);
              saveCVDirect(currentCV);
              refreshUI();
              runAnalysis();
            }
          });
        });
      }

      if (recsBox) {
        recsBox.textContent = match.recommendations.join(' ');
      }
    };

    runAnalysis();
  });
});
