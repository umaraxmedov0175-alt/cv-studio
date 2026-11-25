/**
 * European CV Studio — Application Orchestrator
 * 2-Pane Editorial Studio with Guided Stepper, Collapsible Accordions,
 * Visual Template Gallery, Section Reordering, Strength Meter, and Theme Switcher.
 */

import { loadStoredCV, saveCVDirect, hasStoredCV, exportCVAsJSON, importCVFromJSON } from './model/storage.js';
import {
  createSampleEuropeanCV,
  createEmptyCV,
  TEMPLATE_IDS,
  CEFR_LEVELS,
  normalizeSectionOrder
} from './model/cv-schema.js';
import { renderCVPreview } from './components/preview-renderer.js';
import { exportCVToPDF } from './engines/pdf-exporter.js';
import { COUNTRY_STANDARDS } from './engines/country-rules.js';
import { analyzeCVForATS } from './engines/ats-scorer.js';
import { calculateJobMatch } from './engines/job-matcher.js';
import { calculateCVCompletion } from './engines/completion-engine.js';

const THEME_STORAGE_KEY = 'european_cv_studio_theme';

const SECTION_LABELS = {
  identity: 'Identity',
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  languages: 'Languages',
  projects: 'Projects',
  certifications: 'Certifications'
};

const TEMPLATE_NAMES = {
  [TEMPLATE_IDS.GERMAN_DIN]: 'Frankfurt',
  [TEMPLATE_IDS.MINIMAL_SWISS]: 'Zurich',
  [TEMPLATE_IDS.MODERN_EUROPEAN]: 'Paris'
};

const COUNTRY_SHORT_LABELS = {
  DE: 'Germany (DIN 5008)',
  UK: 'UK & Ireland',
  FR: 'France (1-Page)',
  NL: 'Netherlands'
};

const LANGUAGE_LABELS = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français'
};

const SPACING_LABELS = {
  compact: 'Compact',
  normal: 'Standard',
  spacious: 'Spacious'
};

const COLOR_NAMES = {
  '#1e3a8a': 'Prussian Navy',
  '#065f46': 'Racing Green',
  '#0f172a': 'Obsidian Slate',
  '#701a75': 'Bordeaux Wine',
  '#334155': 'Charcoal'
};

let currentCV = null;
let currentZoom = 0.85;
let activeSectionId = 'identity';
let draggedSectionId = null;

function initStudio() {
  const isFirstVisit = !hasStoredCV();
  currentCV = loadStoredCV();
  ensureCVShape(currentCV);

  const previewSheet = document.getElementById('preview-sheet');
  const togglePhoto = document.getElementById('toggle-photo');
  const toggleSignature = document.getElementById('toggle-signature');
  const complianceBox = document.getElementById('compliance-note-box');
  const budgetFill = document.getElementById('budget-fill');
  const budgetLabel = document.getElementById('budget-status-label');
  const btnAutoFit = document.getElementById('btn-auto-fit');
  const drawer = document.getElementById('job-drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const launchOverlay = document.getElementById('launch-overlay');
  const toastEl = document.getElementById('toast-notice');
  const studioLayout = document.getElementById('studio-layout');

  let toastTimer = null;
  const showToast = (message) => {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  };

  /* ------------------------------------------------------------------
     Theme Management (Light default + Dark Toggle)
     ------------------------------------------------------------------ */
  const applyTheme = (theme) => {
    const resolved = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', resolved);
    const moon = document.getElementById('icon-theme-moon');
    const sun = document.getElementById('icon-theme-sun');
    if (moon) moon.style.display = resolved === 'dark' ? 'none' : 'block';
    if (sun) sun.style.display = resolved === 'dark' ? 'block' : 'none';
    try {
      localStorage.setItem(THEME_STORAGE_KEY, resolved);
    } catch (_) { /* ignore storage restrictions */ }
  };

  let savedTheme = 'light';
  try {
    savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'light';
  } catch (_) { /* ignore */ }
  applyTheme(savedTheme);

  document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  /* ------------------------------------------------------------------
     Popovers & Global Escape / Outside-Click Close
     ------------------------------------------------------------------ */
  const popoverConfigs = [
    { btnId: 'btn-country-popover', menuId: 'popover-country' },
    { btnId: 'btn-language-popover', menuId: 'popover-language' },
    { btnId: 'btn-regional-popover', menuId: 'popover-regional' },
    { btnId: 'btn-template-popover', menuId: 'popover-template' },
    { btnId: 'btn-color-popover', menuId: 'popover-color' },
    { btnId: 'btn-spacing-popover', menuId: 'popover-spacing' },
    { btnId: 'btn-quick-add-toggle', menuId: 'quick-add-menu' }
  ];

  const closeBulletPopovers = () => {
    document.querySelectorAll('.bullet-assistant-popover.open').forEach(p => {
      p.classList.remove('open', 'pop-up');
    });
    document.querySelectorAll('[data-toggle-bullet-popover]').forEach(btn => {
      btn.setAttribute('aria-expanded', 'false');
    });
  };

  const clampPopoverToViewport = (menu) => {
    if (!menu) return;
    menu.classList.remove('align-right');
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth - 12) {
      menu.classList.add('align-right');
    }
  };

  const closeAllPopovers = () => {
    popoverConfigs.forEach(({ btnId, menuId }) => {
      document.getElementById(menuId)?.classList.remove('open');
      document.getElementById(btnId)?.setAttribute('aria-expanded', 'false');
    });
    closeBulletPopovers();
  };

  popoverConfigs.forEach(({ btnId, menuId }) => {
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !menu?.classList.contains('open');
      closeAllPopovers();
      if (willOpen && menu) {
        menu.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        clampPopoverToViewport(menu);
      }
    });
    menu?.addEventListener('click', (e) => e.stopPropagation());
  });

  document.addEventListener('click', closeAllPopovers);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllPopovers();
      closeDrawer();
      closeLaunchModal();
    }
  });

  /* ------------------------------------------------------------------
     Static Inputs, Toolbar State, Photo Preview
     ------------------------------------------------------------------ */
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
      if (el && el.value !== val) el.value = val;
    });

    const charHint = document.getElementById('summary-char-hint');
    if (charHint) {
      const len = (currentCV.summary || '').trim().length;
      charHint.textContent = len ? `${len} chars` : 'Recommended: 120–260 chars';
    }

    syncPhotoThumb();
  };

  const syncPhotoThumb = () => {
    const thumb = document.getElementById('photo-mini-preview');
    if (!thumb) return;
    if (currentCV.personal?.photoUrl) {
      thumb.innerHTML = `<img src="${escapeAttr(currentCV.personal.photoUrl)}" alt="Portrait thumbnail">`;
    } else {
      thumb.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"></circle><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"></path></svg>`;
    }
  };

  const syncToolbarState = () => {
    const country = currentCV.meta.targetCountry || 'DE';
    const lang = currentCV.meta.language || 'en';
    const spacing = currentCV.meta.spacing || 'normal';

    const countryCodeEl = document.getElementById('active-country-code');
    const countryLabelEl = document.getElementById('active-country-label');
    if (countryCodeEl) countryCodeEl.textContent = country;
    if (countryLabelEl) countryLabelEl.textContent = COUNTRY_SHORT_LABELS[country] || country;
    document.querySelectorAll('#popover-country .studio-menu-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-country-val') === country);
    });

    const langLabelEl = document.getElementById('active-language-label');
    if (langLabelEl) langLabelEl.textContent = LANGUAGE_LABELS[lang] || 'English';
    document.querySelectorAll('#popover-language .studio-menu-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang-val') === lang);
    });

    const spacingLabelEl = document.getElementById('active-spacing-label');
    if (spacingLabelEl) spacingLabelEl.textContent = SPACING_LABELS[spacing] || 'Standard';
    document.querySelectorAll('#popover-spacing .studio-menu-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-spacing-val') === spacing);
    });

    if (togglePhoto) togglePhoto.checked = currentCV.meta.showPhoto !== false;
    if (toggleSignature) toggleSignature.checked = currentCV.meta.includeSignatureBlock !== false;

    const std = COUNTRY_STANDARDS[country] || COUNTRY_STANDARDS.DE;
    if (complianceBox) complianceBox.textContent = std.complianceNote;

    const isUK = country === 'UK';
    const regIdentity = document.getElementById('regional-identity-fields');
    const photoUploadGrp = document.getElementById('group-photo-upload');
    const formalSection = document.getElementById('formal-toggles-section');
    if (regIdentity) regIdentity.style.display = isUK ? 'none' : 'grid';
    if (photoUploadGrp) photoUploadGrp.style.display = isUK ? 'none' : 'flex';
    if (formalSection) formalSection.style.display = isUK ? 'none' : 'block';

    const tplId = currentCV.meta.template || TEMPLATE_IDS.GERMAN_DIN;
    const tplLabel = document.getElementById('active-template-label');
    if (tplLabel) tplLabel.textContent = TEMPLATE_NAMES[tplId] || 'Frankfurt';
    document.querySelectorAll('#template-gallery .template-card-option').forEach(card => {
      card.classList.toggle('active', card.getAttribute('data-template-id') === tplId);
    });

    const activeColor = currentCV.meta.accentColor || '#1e3a8a';
    const activeDot = document.getElementById('active-color-dot');
    const activeColorName = document.getElementById('active-color-name');
    if (activeDot) activeDot.style.background = activeColor;
    if (activeColorName) activeColorName.textContent = COLOR_NAMES[activeColor] || 'Accent';
    document.querySelectorAll('#popover-color .color-dot').forEach(dot => {
      dot.classList.toggle('active', dot.getAttribute('data-color') === activeColor);
    });
  };

  /* ------------------------------------------------------------------
     Stepper, Accordion Expand/Collapse, Summary Previews & Strength Meter
     ------------------------------------------------------------------ */
  const getOrderedAllSections = () => {
    currentCV.meta.sectionOrder = normalizeSectionOrder(currentCV.meta.sectionOrder);
    return ['identity', ...currentCV.meta.sectionOrder];
  };

  const setActiveSection = (sectionId, { focusInput = false } = {}) => {
    const ordered = getOrderedAllSections();
    if (!ordered.includes(sectionId)) return;

    activeSectionId = sectionId;
    document.querySelectorAll('.accordion-card').forEach(card => {
      const id = card.getAttribute('data-section-id');
      const isOpen = id === sectionId;
      card.classList.toggle('is-open', isOpen);
      const header = card.querySelector('.accordion-header');
      header?.setAttribute('aria-expanded', String(isOpen));
    });

    renderStepper();

    const activeCard = document.querySelector(`.accordion-card[data-section-id="${sectionId}"]`);
    if (activeCard) {
      activeCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      if (focusInput) {
        const firstInput = activeCard.querySelector('input:not([type="file"]), textarea');
        firstInput?.focus();
      }
    }
  };

  const toggleSection = (sectionId) => {
    const targetCard = document.querySelector(`.accordion-card[data-section-id="${sectionId}"]`);
    const alreadyOpen = targetCard?.classList.contains('is-open');
    if (alreadyOpen) {
      targetCard.classList.remove('is-open');
      targetCard.querySelector('.accordion-header')?.setAttribute('aria-expanded', 'false');
      activeSectionId = null;
      renderStepper();
    } else {
      setActiveSection(sectionId);
    }
  };

  const syncAccordionOrderDOM = () => {
    const container = document.getElementById('reorderable-sections');
    if (!container) return;
    const order = normalizeSectionOrder(currentCV.meta.sectionOrder);
    currentCV.meta.sectionOrder = order;

    const allCards = Array.from(container.querySelectorAll('.accordion-card'));
    const cardMap = Object.fromEntries(allCards.map(el => [el.getAttribute('data-section-id'), el]));

    // Show active ordered sections in sequence, keep inactive optional sections hidden at bottom
    order.forEach(id => {
      const card = cardMap[id];
      if (card) {
        card.style.display = 'block';
        container.appendChild(card);
      }
    });

    allCards.forEach(card => {
      const id = card.getAttribute('data-section-id');
      if (!order.includes(id)) {
        card.style.display = 'none';
        container.appendChild(card);
      }
    });

    renderStepper();
  };

  const renderStepper = () => {
    const bar = document.getElementById('stepper-bar');
    if (!bar) return;
    const completion = calculateCVCompletion(currentCV);
    const ordered = getOrderedAllSections();

    bar.innerHTML = ordered.map((id) => {
      const status = completion.sectionStatus[id] || 'empty';
      const statusClass = status === 'complete' ? 'done' : status === 'partial' ? 'partial' : '';
      const isActive = activeSectionId === id;
      return `
        <button type="button" class="step-tab ${isActive ? 'active' : ''} ${statusClass}" data-step-target="${id}" role="tab" aria-selected="${isActive}">
          <span class="step-dot" aria-hidden="true"></span>
          <span>${SECTION_LABELS[id] || id}</span>
        </button>
      `;
    }).join('');

    bar.querySelectorAll('[data-step-target]').forEach(tab => {
      tab.addEventListener('click', () => {
        setActiveSection(tab.getAttribute('data-step-target'), { focusInput: false });
      });
    });
  };

  const updateAccordionSummariesAndStrength = () => {
    const completion = calculateCVCompletion(currentCV);
    const p = currentCV.personal || {};

    // Update collapsed 1-line previews
    const summaryMap = {
      identity: [
        [p.firstName, p.lastName].filter(Boolean).join(' '),
        p.title,
        p.city
      ].filter(Boolean).join(' · ') || 'Name, target role & contact details',
      summary: currentCV.summary?.trim()
        ? currentCV.summary.trim().slice(0, 72) + (currentCV.summary.trim().length > 72 ? '…' : '')
        : 'Add a 2–3 sentence executive bio',
      experience: currentCV.experience?.length
        ? `${currentCV.experience.length} ${currentCV.experience.length === 1 ? 'position' : 'positions'} · ${currentCV.experience[0]?.company || ''}`
        : 'Empty — add your most recent role',
      education: currentCV.education?.length
        ? `${currentCV.education.length} ${currentCV.education.length === 1 ? 'degree' : 'degrees'} · ${currentCV.education[0]?.degree || ''}`
        : 'Empty — add degree or qualification',
      skills: currentCV.skills?.technical?.length
        ? `${currentCV.skills.technical.length} skills · ${currentCV.skills.technical.slice(0, 3).join(', ')}`
        : 'Empty — add key competencies',
      languages: currentCV.skills?.languages?.length
        ? currentCV.skills.languages.map(l => `${l.language || ''}`).filter(Boolean).join(', ')
        : 'Add spoken languages (CEFR)',
      projects: currentCV.projects?.length
        ? `${currentCV.projects.length} ${currentCV.projects.length === 1 ? 'project' : 'projects'}`
        : 'Add notable projects',
      certifications: currentCV.certifications?.length
        ? `${currentCV.certifications.length} ${currentCV.certifications.length === 1 ? 'certification' : 'certifications'}`
        : 'Add industry certifications'
    };

    Object.entries(summaryMap).forEach(([id, text]) => {
      const sumEl = document.querySelector(`[data-summary-for="${id}"]`);
      if (sumEl) sumEl.textContent = text;

      const dotEl = document.querySelector(`[data-status-dot="${id}"]`);
      if (dotEl) {
        const st = completion.sectionStatus[id] || 'empty';
        dotEl.className = `section-status-dot ${st === 'empty' ? '' : st}`.trim();
        dotEl.textContent = st === 'complete' ? '✓' : '•';
      }
    });

    // Update sticky bottom Strength Meter
    const pctEl = document.getElementById('strength-pct');
    const fillEl = document.getElementById('strength-fill');
    const tierEl = document.getElementById('strength-tier');
    const nextBtn = document.getElementById('strength-next-btn');

    if (pctEl) pctEl.textContent = `${completion.percentage}%`;
    if (fillEl) fillEl.style.width = `${completion.percentage}%`;
    if (tierEl) tierEl.textContent = completion.tier;
    if (nextBtn) {
      nextBtn.textContent = completion.nextAction.prompt;
      nextBtn.setAttribute('data-jump-section', completion.nextAction.sectionId);
    }

    renderStepper();
  };

  document.getElementById('strength-next-btn')?.addEventListener('click', (e) => {
    const target = e.currentTarget.getAttribute('data-jump-section');
    if (target === 'export') {
      exportCVToPDF(currentCV);
    } else if (target) {
      if (target !== 'identity' && !currentCV.meta.sectionOrder.includes(target)) {
        currentCV.meta.sectionOrder.push(target);
        syncAccordionOrderDOM();
      }
      setActiveSection(target, { focusInput: true });
      if (window.innerWidth < 768) switchMobileView('editor');
    }
  });

  /* ------------------------------------------------------------------
     ATS Health & Live Page Budget
     ------------------------------------------------------------------ */
  const updateATSReport = () => {
    const ats = analyzeCVForATS(currentCV);
    const circumference = 47.12;
    const score = Math.max(0, Math.min(100, ats.score || 0));
    const arc = document.getElementById('ats-ring-arc');
    const scoreNum = document.getElementById('ats-score-num');
    const pillLabel = document.getElementById('ats-score-label');
    const pill = document.getElementById('btn-ats-pill');
    if (arc) arc.style.strokeDashoffset = (circumference * (1 - score / 100)).toFixed(2);
    if (scoreNum) scoreNum.textContent = String(score);
    if (pillLabel) pillLabel.textContent = `ATS · ${ats.grade}`;
    if (pill) {
      pill.classList.remove('state-warn', 'state-low');
      if (score < 40) pill.classList.add('state-low');
      else if (score < 70) pill.classList.add('state-warn');
    }

    const badge = document.getElementById('drawer-ats-badge');
    const checksEl = document.getElementById('drawer-ats-checks');
    const tipsEl = document.getElementById('drawer-ats-tips');
    if (badge) {
      badge.textContent = `${ats.score}/100 (${ats.grade}) · ${ats.status}`;
      badge.className = `ats-pill ${ats.score < 40 ? 'state-low' : ats.score < 70 ? 'state-warn' : ''}`.trim();
    }
    if (checksEl) {
      checksEl.innerHTML = ats.checks.map(c => `
        <div class="ats-check-row">
          <span style="color: ${c.passed ? 'var(--success)' : 'var(--warning)'};">${c.passed ? '✓' : '!'} ${escapeHTML(c.category)}</span>
          <span style="color: var(--text-secondary);">${c.points}/${c.maxPoints} pts</span>
        </div>
      `).join('');
    }
    if (tipsEl) {
      tipsEl.innerHTML = ats.suggestions.length
        ? ats.suggestions.map(s => `<div>• ${escapeHTML(s)}</div>`).join('')
        : '<span style="color: var(--success); font-weight: 600;">All core European ATS criteria met.</span>';
    }
  };

  const calculatePageBudget = () => {
    requestAnimationFrame(() => {
      if (!previewSheet) return;
      const singlePageMax = 1123;
      const actualScrollHeight = previewSheet.scrollHeight;

      let contentHeight = actualScrollHeight;
      const lastChild = previewSheet.lastElementChild;
      if (actualScrollHeight <= singlePageMax + 2 && lastChild && previewSheet.offsetWidth > 0) {
        const sheetRect = previewSheet.getBoundingClientRect();
        const lastRect = lastChild.getBoundingClientRect();
        const actualScale = (sheetRect.width / previewSheet.offsetWidth) || currentZoom || 1;
        contentHeight = Math.round(((lastRect.bottom - sheetRect.top) / actualScale) + 48);
      }

      if (actualScrollHeight <= singlePageMax + 2) {
        const pct = Math.min(99, Math.max(12, Math.round((contentHeight / singlePageMax) * 100)));
        if (budgetFill) {
          budgetFill.style.width = `${pct}%`;
          budgetFill.style.backgroundColor = 'var(--success)';
        }
        if (budgetLabel) {
          budgetLabel.textContent = `Page 1: ${pct}% full`;
          budgetLabel.style.color = 'var(--success)';
        }
        if (btnAutoFit) btnAutoFit.style.display = 'none';
      } else {
        const page2Px = actualScrollHeight - singlePageMax;
        const page2Pct = Math.min(100, Math.max(1, Math.round((page2Px / singlePageMax) * 100)));
        if (budgetFill) {
          budgetFill.style.width = '100%';
          budgetFill.style.backgroundColor = 'var(--warning)';
        }
        if (budgetLabel) {
          budgetLabel.textContent = `Page 2: +${page2Pct}% overflow`;
          budgetLabel.style.color = 'var(--warning)';
        }
        if (btnAutoFit) btnAutoFit.style.display = 'inline-flex';
      }
    });
  };

  const refreshCanvas = () => {
    renderCVPreview(currentCV, previewSheet);
    calculatePageBudget();
    updateATSReport();
    updateAccordionSummariesAndStrength();
  };

  /* ------------------------------------------------------------------
     Modular Section Editors (With Empty Coaching States)
     ------------------------------------------------------------------ */
  const renderEmptyCoaching = ({ title, tip, buttonLabel, buttonId }) => `
    <div class="empty-coaching">
      <div class="empty-coaching-title">${escapeHTML(title)}</div>
      <div class="empty-coaching-tip">${escapeHTML(tip)}</div>
      <div>
        <button type="button" class="btn btn-primary" id="${buttonId}">${escapeHTML(buttonLabel)}</button>
      </div>
    </div>
  `;

  const BULLET_COACH_CONTENT = {
    en: {
      title: 'Impact writing guide',
      verbsLabel: 'Action verbs',
      formulasLabel: 'Quantified X-Y-Z templates',
      verbs: ['Architected', 'Engineered', 'Automated', 'Reduced', 'Streamlined', 'Optimized', 'Spearheaded', 'Scaled'],
      formulas: [
        'Engineered [system/feature] with [tech], reducing [latency/cost] by [X%]',
        'Automated [workflow], saving [X hrs/week] across [team/service]',
        'Led [scope/initiative] to deliver [outcome] for [N+ users/clients]'
      ]
    },
    de: {
      title: 'Wirkungsorientiert formulieren',
      verbsLabel: 'Starke Aktionsverben',
      formulasLabel: 'Strukturierte Erfolgsformeln',
      verbs: ['Entwickelt', 'Konzipiert', 'Optimiert', 'Reduziert', 'Automatisiert', 'Eingeführt', 'Geleitet', 'Gesteigert'],
      formulas: [
        'Entwickelt [System/Komponente] mit [Technologie] zur Senkung von [Kosten/Latenz] um [X %]',
        'Automatisiert [Prozess], wodurch [X Std./Woche] im Team eingespart wurden',
        'Geleitet [Projekt/Initiative] für [N+ Nutzer/Kunden] mit [messbarem Ergebnis]'
      ]
    },
    fr: {
      title: 'Guide d’impact',
      verbsLabel: 'Verbes d’action forts',
      formulasLabel: 'Modèles de résultats chiffrés',
      verbs: ['Conçu', 'Développé', 'Automatisé', 'Optimisé', 'Réduit', 'Déployé', 'Piloté', 'Coordonné'],
      formulas: [
        'Conçu [système/fonctionnalité] avec [tech], réduisant [latence/coût] de [X %]',
        'Automatisé [processus], économisant [X h/semaine] pour [équipe/service]',
        'Piloté [projet] afin de livrer [résultat] auprès de [N+ utilisateurs]'
      ]
    }
  };

  const COACH_VERBS_REGEX = /\b(architected|engineered|built|developed|automated|reduced|streamlined|optimized|spearheaded|scaled|led|designed|implemented|managed|delivered|improved|constructed|entwickelt|konzipiert|optimiert|reduziert|automatisiert|eingeführt|geleitet|gesteigert|conçu|développé|automatisé|optimisé|réduit|déployé|piloté|coordonné)\b/i;
  const COACH_METRICS_REGEX = /\b\d+(\.\d+)?%|\d+\s*(years|months|jahre|monate|ans|mois|k|m|€|\$|ms|s|x|\+|hrs|hours|std|users|clients)|\b\d{2,}\b/i;

  const analyzeExperienceBullets = (bullets) => {
    const clean = (bullets || []).map(b => String(b).trim()).filter(Boolean);
    const count = clean.length;
    if (count === 0) {
      return { state: 'neutral', text: 'One achievement per line — lead with outcomes' };
    }
    const joined = clean.join(' ');
    const hasMetrics = COACH_METRICS_REGEX.test(joined);
    const hasVerb = COACH_VERBS_REGEX.test(joined);
    const plural = count === 1 ? 'bullet' : 'bullets';

    if (hasMetrics && hasVerb) {
      return { state: 'strong', text: `${count} ${plural} · verb-led & quantified` };
    }
    if (!hasVerb) {
      return { state: 'hint', text: `${count} ${plural} · lead with a strong action verb` };
    }
    return { state: 'hint', text: `${count} ${plural} · add a metric (%, €, time) for impact` };
  };

  const formatFormulaPreviewHTML = (formula) => {
    return escapeHTML(formula).replace(/\[([^\]]+)\]/g, '<span class="coach-token">[$1]</span>');
  };

  const renderExperienceCards = () => {
    const container = document.getElementById('experience-card-list');
    if (!container) return;

    const list = currentCV.experience || [];
    if (list.length === 0) {
      container.innerHTML = renderEmptyCoaching({
        title: 'Add your most recent role',
        tip: 'Tip: Start bullet points with action verbs ("Architected", "Reduced") and include one number or percentage.',
        buttonLabel: '+ Add first position',
        buttonId: 'btn-empty-add-job'
      });
      document.getElementById('btn-empty-add-job')?.addEventListener('click', addNewExperience);
      return;
    }

    const lang = currentCV.meta?.language || 'en';
    const coach = BULLET_COACH_CONTENT[lang] || BULLET_COACH_CONTENT.en;

    container.innerHTML = list.map((exp, idx) => {
      const diag = analyzeExperienceBullets(exp.bullets);
      return `
      <div class="subcard">
        <div class="subcard-head">
          <span class="subcard-title">${escapeHTML(exp.position || 'Position')} · ${escapeHTML(exp.company || 'Company')}</span>
          <button class="btn-remove-inline" data-del-exp="${idx}" type="button">Remove</button>
        </div>
        <div class="subcard-body">
          <div class="field-grid-2">
            <div class="field-group">
              <label class="field-label">Role title</label>
              <input type="text" class="field-input" data-exp-f="position" data-idx="${idx}" value="${escapeAttr(exp.position || '')}">
            </div>
            <div class="field-group">
              <label class="field-label">Company</label>
              <input type="text" class="field-input" data-exp-f="company" data-idx="${idx}" value="${escapeAttr(exp.company || '')}">
            </div>
          </div>
          <div class="field-grid-2">
            <div class="field-group">
              <label class="field-label">Date range</label>
              <input type="text" class="field-input" data-exp-f="dateRange" data-idx="${idx}" value="${escapeAttr((exp.startDate || '') + ' – ' + (exp.endDate || ''))}">
            </div>
            <div class="field-group">
              <label class="field-label">City / country</label>
              <input type="text" class="field-input" data-exp-f="city" data-idx="${idx}" value="${escapeAttr(exp.city || '')}">
            </div>
          </div>
          <div class="field-group">
            <label class="field-label">Achievements &amp; impact (1 per line)</label>
            <textarea class="field-input" data-exp-f="bullets" data-idx="${idx}" rows="3">${escapeHTML((exp.bullets || []).join('\n'))}</textarea>
          </div>
          <div class="bullet-coach-row">
            <span class="bullet-diag" data-bullet-diag="${idx}">
              <span class="diag-dot ${diag.state}" aria-hidden="true"></span>
              <span class="diag-text">${escapeHTML(diag.text)}</span>
            </span>
            <div class="bullet-coach-trigger-wrap">
              <button type="button" class="bullet-coach-trigger" data-toggle-bullet-popover="${idx}" aria-expanded="false">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                <span>Impact guide</span>
                <svg class="chevron-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div class="bullet-assistant-popover" id="bullet-popover-${idx}">
                <div class="coach-pop-head">
                  <span class="coach-pop-title">${escapeHTML(coach.title)}</span>
                  <span class="coach-pop-esc">Esc</span>
                </div>
                <div>
                  <div class="coach-section-label">${escapeHTML(coach.verbsLabel)}</div>
                  <div class="coach-verb-grid">
                    ${coach.verbs.map(v => `<button type="button" class="coach-verb-btn" data-coach-insert="${escapeAttr(v + ' ')}" data-idx="${idx}" data-is-formula="false">${escapeHTML(v)}</button>`).join('')}
                  </div>
                </div>
                <div>
                  <div class="coach-section-label">${escapeHTML(coach.formulasLabel)}</div>
                  <div class="coach-formula-list">
                    ${coach.formulas.map(f => `<button type="button" class="coach-formula-btn" data-coach-insert="${escapeAttr(f)}" data-idx="${idx}" data-is-formula="true">${formatFormulaPreviewHTML(f)}</button>`).join('')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    }).join('');

    const syncBulletDiagnosticUI = (idx) => {
      const diag = analyzeExperienceBullets(currentCV.experience?.[idx]?.bullets);
      const diagEl = container.querySelector(`[data-bullet-diag="${idx}"]`);
      if (!diagEl) return;
      const dot = diagEl.querySelector('.diag-dot');
      const txt = diagEl.querySelector('.diag-text');
      if (dot) dot.className = `diag-dot ${diag.state}`;
      if (txt) txt.textContent = diag.text;
    };

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
          syncBulletDiagnosticUI(idx);
        } else {
          item[f] = inp.value;
        }

        const headerTitle = inp.closest('.subcard')?.querySelector('.subcard-title');
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

    container.querySelectorAll('[data-toggle-bullet-popover]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = btn.getAttribute('data-toggle-bullet-popover');
        const pop = document.getElementById(`bullet-popover-${idx}`);
        const willOpen = pop && !pop.classList.contains('open');
        closeAllPopovers();
        if (willOpen && pop) {
          const btnRect = btn.getBoundingClientRect();
          if (btnRect.bottom + 270 > window.innerHeight - 48) {
            pop.classList.add('pop-up');
          }
          pop.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });

    container.querySelectorAll('.bullet-assistant-popover').forEach(pop => {
      pop.addEventListener('click', (e) => e.stopPropagation());
    });

    container.querySelectorAll('[data-coach-insert]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        const snippet = btn.getAttribute('data-coach-insert') || '';
        const isFormula = btn.getAttribute('data-is-formula') === 'true';
        const textarea = container.querySelector(`textarea[data-exp-f="bullets"][data-idx="${idx}"]`);
        const item = currentCV.experience[idx];
        if (!textarea || !item) return;

        const existing = textarea.value.replace(/\s+$/, '');
        const insertionStart = existing.length ? existing.length + 1 : 0;
        const nextValue = existing.length ? `${existing}\n${snippet}` : snippet;

        textarea.value = nextValue;
        item.bullets = nextValue.split('\n').filter(Boolean);
        syncBulletDiagnosticUI(idx);
        saveCVDirect(currentCV);
        refreshCanvas();
        closeAllPopovers();

        textarea.focus();
        if (isFormula) {
          const bracketMatch = snippet.match(/\[([^\]]+)\]/);
          if (bracketMatch) {
            const selStart = insertionStart + bracketMatch.index;
            const selEnd = selStart + bracketMatch[0].length;
            textarea.setSelectionRange(selStart, selEnd);
            return;
          }
        }
        textarea.setSelectionRange(nextValue.length, nextValue.length);
      });
    });
  };

  const renderEducationCards = () => {
    const container = document.getElementById('education-card-list');
    if (!container) return;

    const list = currentCV.education || [];
    if (list.length === 0) {
      container.innerHTML = renderEmptyCoaching({
        title: 'List your highest degree or training',
        tip: 'In DACH & France, include exact start/end dates and final honors or GPA when recent.',
        buttonLabel: '+ Add degree',
        buttonId: 'btn-empty-add-edu'
      });
      document.getElementById('btn-empty-add-edu')?.addEventListener('click', addNewEducation);
      return;
    }

    container.innerHTML = list.map((edu, idx) => `
      <div class="subcard">
        <div class="subcard-head">
          <span class="subcard-title">${escapeHTML(edu.degree || 'Degree')}</span>
          <button class="btn-remove-inline" data-del-edu="${idx}" type="button">Remove</button>
        </div>
        <div class="subcard-body">
          <div class="field-grid-2">
            <div class="field-group">
              <label class="field-label">Degree / field</label>
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
              <label class="field-label">Honors / grade</label>
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

        const headerTitle = inp.closest('.subcard')?.querySelector('.subcard-title');
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

  const renderSkillsChips = () => {
    const chipContainer = document.getElementById('skills-chip-list');
    const commaInput = document.getElementById('f-skills-tech');
    const skills = currentCV.skills?.technical || [];
    if (commaInput && document.activeElement !== commaInput) {
      commaInput.value = skills.join(', ');
    }
    if (!chipContainer) return;

    if (skills.length === 0) {
      chipContainer.innerHTML = '<span style="font-size:12px; color:var(--text-secondary);">Type a skill above and press Enter (e.g. TypeScript, React, SQL) to improve your ATS score.</span>';
      return;
    }

    chipContainer.innerHTML = skills.map((skill, idx) => `
      <span class="skill-chip-editable">
        <span>${escapeHTML(skill)}</span>
        <button type="button" class="skill-chip-remove" data-del-skill="${idx}" aria-label="Remove ${escapeAttr(skill)}">×</button>
      </span>
    `).join('');

    chipContainer.querySelectorAll('[data-del-skill]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-del-skill'), 10);
        currentCV.skills.technical.splice(idx, 1);
        saveCVDirect(currentCV);
        renderSkillsChips();
        refreshCanvas();
      });
    });
  };

  const renderLanguageCards = () => {
    const container = document.getElementById('language-card-list');
    if (!container) return;

    const langs = currentCV.skills?.languages || [];
    if (langs.length === 0) {
      container.innerHTML = renderEmptyCoaching({
        title: 'Add spoken languages with CEFR proficiency',
        tip: 'European recruiters look for explicit levels such as "English — C1" or "German — B2".',
        buttonLabel: '+ Add first language',
        buttonId: 'btn-empty-add-lang'
      });
      document.getElementById('btn-empty-add-lang')?.addEventListener('click', addNewLanguage);
      return;
    }

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

  const renderProjectsCards = () => {
    const container = document.getElementById('projects-card-list');
    if (!container) return;
    const list = currentCV.projects || [];
    if (list.length === 0) {
      container.innerHTML = renderEmptyCoaching({
        title: 'Highlight a signature project',
        tip: 'Open-source repositories, side products, or capstone builds add depth for engineering roles.',
        buttonLabel: '+ Add project',
        buttonId: 'btn-empty-add-proj'
      });
      document.getElementById('btn-empty-add-proj')?.addEventListener('click', addNewProject);
      return;
    }

    container.innerHTML = list.map((proj, idx) => `
      <div class="subcard">
        <div class="subcard-head">
          <span class="subcard-title">${escapeHTML(proj.name || 'Project')}</span>
          <button class="btn-remove-inline" data-del-proj="${idx}" type="button">Remove</button>
        </div>
        <div class="subcard-body">
          <div class="field-grid-2">
            <div class="field-group">
              <label class="field-label">Project name</label>
              <input type="text" class="field-input" data-proj-f="name" data-idx="${idx}" value="${escapeAttr(proj.name || '')}">
            </div>
            <div class="field-group">
              <label class="field-label">Technologies</label>
              <input type="text" class="field-input" data-proj-f="technologies" data-idx="${idx}" value="${escapeAttr(proj.technologies || '')}">
            </div>
          </div>
          <div class="field-group">
            <label class="field-label">Summary</label>
            <input type="text" class="field-input" data-proj-f="description" data-idx="${idx}" value="${escapeAttr(proj.description || '')}">
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-proj-f]').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = parseInt(inp.getAttribute('data-idx'), 10);
        const f = inp.getAttribute('data-proj-f');
        if (currentCV.projects[idx]) {
          currentCV.projects[idx][f] = inp.value;
          const title = inp.closest('.subcard')?.querySelector('.subcard-title');
          if (title) title.textContent = currentCV.projects[idx].name || 'Project';
          saveCVDirect(currentCV);
          refreshCanvas();
        }
      });
    });

    container.querySelectorAll('[data-del-proj]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-del-proj'), 10);
        currentCV.projects.splice(idx, 1);
        saveCVDirect(currentCV);
        renderProjectsCards();
        refreshCanvas();
      });
    });
  };

  const renderCertificationsCards = () => {
    const container = document.getElementById('certifications-card-list');
    if (!container) return;
    const list = currentCV.certifications || [];
    if (list.length === 0) {
      container.innerHTML = renderEmptyCoaching({
        title: 'Add certifications or licenses',
        tip: 'Include issuer and completion year (e.g. AWS Solutions Architect · 2024).',
        buttonLabel: '+ Add certification',
        buttonId: 'btn-empty-add-cert'
      });
      document.getElementById('btn-empty-add-cert')?.addEventListener('click', addNewCert);
      return;
    }

    container.innerHTML = list.map((cert, idx) => `
      <div class="subcard">
        <div class="subcard-head">
          <span class="subcard-title">${escapeHTML(cert.name || 'Certification')}</span>
          <button class="btn-remove-inline" data-del-cert="${idx}" type="button">Remove</button>
        </div>
        <div class="subcard-body">
          <div class="field-group">
            <label class="field-label">Credential name</label>
            <input type="text" class="field-input" data-cert-f="name" data-idx="${idx}" value="${escapeAttr(cert.name || '')}">
          </div>
          <div class="field-grid-2">
            <div class="field-group">
              <label class="field-label">Issuer</label>
              <input type="text" class="field-input" data-cert-f="issuer" data-idx="${idx}" value="${escapeAttr(cert.issuer || '')}">
            </div>
            <div class="field-group">
              <label class="field-label">Year</label>
              <input type="text" class="field-input" data-cert-f="year" data-idx="${idx}" value="${escapeAttr(cert.year || '')}">
            </div>
          </div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('[data-cert-f]').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = parseInt(inp.getAttribute('data-idx'), 10);
        const f = inp.getAttribute('data-cert-f');
        if (currentCV.certifications[idx]) {
          currentCV.certifications[idx][f] = inp.value;
          const title = inp.closest('.subcard')?.querySelector('.subcard-title');
          if (title) title.textContent = currentCV.certifications[idx].name || 'Certification';
          saveCVDirect(currentCV);
          refreshCanvas();
        }
      });
    });

    container.querySelectorAll('[data-del-cert]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-del-cert'), 10);
        currentCV.certifications.splice(idx, 1);
        saveCVDirect(currentCV);
        renderCertificationsCards();
        refreshCanvas();
      });
    });
  };

  /* ------------------------------------------------------------------
     Bind Static Fields, Skill Quick-Add & Section Mutators
     ------------------------------------------------------------------ */
  const bindStaticField = (id, setter) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', (e) => {
      setter(e.target.value);
      saveCVDirect(currentCV);
      if (id === 'f-summary') {
        const charHint = document.getElementById('summary-char-hint');
        if (charHint) {
          const len = e.target.value.trim().length;
          charHint.textContent = len ? `${len} chars` : 'Recommended: 120–260 chars';
        }
      }
      refreshCanvas();
    });
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

  document.getElementById('f-skills-tech')?.addEventListener('input', (e) => {
    currentCV.skills.technical = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
    saveCVDirect(currentCV);
    renderSkillsChips();
    refreshCanvas();
  });

  const addSkillFromQuickInput = () => {
    const input = document.getElementById('skill-quick-input');
    const raw = (input?.value || '').trim();
    if (!raw) return;
    const additions = raw.split(',').map(s => s.trim()).filter(Boolean);
    const existingLower = new Set((currentCV.skills.technical || []).map(s => s.toLowerCase()));
    additions.forEach(skill => {
      if (!existingLower.has(skill.toLowerCase())) {
        currentCV.skills.technical.push(skill);
        existingLower.add(skill.toLowerCase());
      }
    });
    if (input) input.value = '';
    saveCVDirect(currentCV);
    renderSkillsChips();
    refreshCanvas();
  };

  document.getElementById('btn-add-skill-chip')?.addEventListener('click', addSkillFromQuickInput);
  document.getElementById('skill-quick-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkillFromQuickInput();
    }
  });

  // Photo upload & clear
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
      syncPhotoThumb();
      refreshCanvas();
      showToast('Portrait photo updated.');
    };
    reader.readAsDataURL(file);
  });
  document.getElementById('btn-clear-photo')?.addEventListener('click', () => {
    currentCV.personal.photoUrl = '';
    if (photoInput) photoInput.value = '';
    saveCVDirect(currentCV);
    syncPhotoThumb();
    refreshCanvas();
    showToast('Portrait photo cleared.');
  });

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
    setActiveSection('experience');
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
    setActiveSection('education');
    refreshCanvas();
  };

  const addNewLanguage = () => {
    currentCV.skills.languages = currentCV.skills.languages || [];
    currentCV.skills.languages.push({ language: 'German', level: CEFR_LEVELS[2].label });
    saveCVDirect(currentCV);
    renderLanguageCards();
    setActiveSection('languages');
    refreshCanvas();
  };

  const addNewProject = () => {
    currentCV.projects = currentCV.projects || [];
    currentCV.projects.push({
      name: 'Open Source Tooling',
      description: 'Designed modular TypeScript CLI used by internal engineering teams.',
      technologies: 'TypeScript, Node.js'
    });
    saveCVDirect(currentCV);
    renderProjectsCards();
    refreshCanvas();
  };

  const addNewCert = () => {
    currentCV.certifications = currentCV.certifications || [];
    currentCV.certifications.push({
      name: 'AWS Solutions Architect',
      issuer: 'Amazon Web Services',
      year: '2024'
    });
    saveCVDirect(currentCV);
    renderCertificationsCards();
    refreshCanvas();
  };

  document.getElementById('btn-add-job')?.addEventListener('click', addNewExperience);
  document.getElementById('btn-add-edu')?.addEventListener('click', addNewEducation);
  document.getElementById('btn-add-lang')?.addEventListener('click', addNewLanguage);
  document.getElementById('btn-add-project')?.addEventListener('click', addNewProject);
  document.getElementById('btn-add-cert')?.addEventListener('click', addNewCert);

  /* ------------------------------------------------------------------
     Accordion Header Clicks, Stepper Next/Back, & Optional Sections
     ------------------------------------------------------------------ */
  document.querySelectorAll('[data-toggle-section]').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('.drag-handle')) return;
      toggleSection(header.getAttribute('data-toggle-section'));
    });
    header.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === header) {
        e.preventDefault();
        toggleSection(header.getAttribute('data-toggle-section'));
      }
    });
  });

  document.querySelectorAll('[data-goto-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      const fromId = btn.getAttribute('data-goto-next');
      const ordered = getOrderedAllSections();
      const idx = ordered.indexOf(fromId);
      if (idx >= 0 && idx < ordered.length - 1) {
        setActiveSection(ordered[idx + 1], { focusInput: true });
      } else {
        exportCVToPDF(currentCV);
      }
    });
  });

  document.querySelectorAll('[data-goto-prev]').forEach(btn => {
    btn.addEventListener('click', () => {
      const fromId = btn.getAttribute('data-goto-prev');
      const ordered = getOrderedAllSections();
      const idx = ordered.indexOf(fromId);
      if (idx > 0) {
        setActiveSection(ordered[idx - 1], { focusInput: false });
      }
    });
  });

  document.querySelectorAll('[data-remove-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const secId = btn.getAttribute('data-remove-section');
      currentCV.meta.sectionOrder = currentCV.meta.sectionOrder.filter(id => id !== secId);
      saveCVDirect(currentCV);
      syncAccordionOrderDOM();
      setActiveSection('experience');
      refreshCanvas();
      showToast(`Removed ${SECTION_LABELS[secId] || secId} from CV layout.`);
    });
  });

  document.querySelectorAll('[data-quick-action]').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.getAttribute('data-quick-action');
      closeAllPopovers();
      if (action === 'experience') addNewExperience();
      else if (action === 'education') addNewEducation();
      else if (action === 'language') addNewLanguage();
      else if (action === 'section-projects') {
        if (!currentCV.meta.sectionOrder.includes('projects')) {
          currentCV.meta.sectionOrder.push('projects');
        }
        if (!(currentCV.projects || []).length) addNewProject();
        syncAccordionOrderDOM();
        saveCVDirect(currentCV);
        setActiveSection('projects');
        refreshCanvas();
      } else if (action === 'section-certifications') {
        if (!currentCV.meta.sectionOrder.includes('certifications')) {
          currentCV.meta.sectionOrder.push('certifications');
        }
        if (!(currentCV.certifications || []).length) addNewCert();
        syncAccordionOrderDOM();
        saveCVDirect(currentCV);
        setActiveSection('certifications');
        refreshCanvas();
      }
    });
  });

  /* ------------------------------------------------------------------
     Drag-and-Drop & Accessible Keyboard Section Reordering
     ------------------------------------------------------------------ */
  const moveSectionByOffset = (sectionId, delta) => {
    const order = [...normalizeSectionOrder(currentCV.meta.sectionOrder)];
    const idx = order.indexOf(sectionId);
    const targetIdx = idx + delta;
    if (idx < 0 || targetIdx < 0 || targetIdx >= order.length) return;
    [order[idx], order[targetIdx]] = [order[targetIdx], order[idx]];
    currentCV.meta.sectionOrder = order;
    saveCVDirect(currentCV);
    syncAccordionOrderDOM();
    refreshCanvas();
    showToast(`Moved ${SECTION_LABELS[sectionId]} ${delta < 0 ? 'up' : 'down'}.`);
  };

  document.querySelectorAll('[data-move-up]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      moveSectionByOffset(btn.getAttribute('data-move-up'), -1);
    });
  });
  document.querySelectorAll('[data-move-down]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      moveSectionByOffset(btn.getAttribute('data-move-down'), 1);
    });
  });

  document.querySelectorAll('#reorderable-sections .accordion-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      if (e.target.closest('input, textarea, select')) {
        e.preventDefault();
        return;
      }
      draggedSectionId = card.getAttribute('data-section-id');
      card.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedSectionId);
      }
    });

    card.addEventListener('dragend', () => {
      draggedSectionId = null;
      document.querySelectorAll('.accordion-card').forEach(el => {
        el.classList.remove('dragging', 'drag-over');
      });
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      const targetId = card.getAttribute('data-section-id');
      if (draggedSectionId && draggedSectionId !== targetId) {
        card.classList.add('drag-over');
      }
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      const targetId = card.getAttribute('data-section-id');
      if (!draggedSectionId || !targetId || draggedSectionId === targetId) return;

      const order = [...normalizeSectionOrder(currentCV.meta.sectionOrder)];
      const fromIdx = order.indexOf(draggedSectionId);
      const toIdx = order.indexOf(targetId);
      if (fromIdx < 0 || toIdx < 0) return;

      const [moved] = order.splice(fromIdx, 1);
      order.splice(toIdx, 0, moved);
      currentCV.meta.sectionOrder = order;
      saveCVDirect(currentCV);
      syncAccordionOrderDOM();
      refreshCanvas();
    });
  });

  /* ------------------------------------------------------------------
     Direct WYSIWYG Canvas Editing
     ------------------------------------------------------------------ */
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
        currentCV.personal[bind.split('.')[1]] = text;
      } else if (bind === 'summary') {
        currentCV.summary = text;
      } else if (bind.startsWith('signature.')) {
        currentCV.signature = currentCV.signature || {};
        currentCV.signature[bind.split('.')[1]] = text;
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
    updateAccordionSummariesAndStrength();
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

    if (e.target.closest('#btn-trigger-add-exp')) addNewExperience();
    else if (e.target.closest('#btn-trigger-add-edu')) addNewEducation();
  });

  /* ------------------------------------------------------------------
     Toolbar Controls & Gallery Wiring
     ------------------------------------------------------------------ */
  document.querySelectorAll('#popover-country [data-country-val]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCV.meta.targetCountry = btn.getAttribute('data-country-val');
      saveCVDirect(currentCV);
      syncToolbarState();
      closeAllPopovers();
      refreshCanvas();
    });
  });

  document.querySelectorAll('#popover-language [data-lang-val]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang-val');
      currentCV.meta.language = lang;
      saveCVDirect(currentCV);
      syncToolbarState();
      closeAllPopovers();
      renderExperienceCards();
      refreshCanvas();
      showToast(`CV headings updated (${LANGUAGE_LABELS[lang] || lang}).`);
    });
  });

  document.querySelectorAll('#popover-spacing [data-spacing-val]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCV.meta.spacing = btn.getAttribute('data-spacing-val');
      saveCVDirect(currentCV);
      syncToolbarState();
      closeAllPopovers();
      refreshCanvas();
    });
  });

  document.querySelectorAll('#template-gallery .template-card-option').forEach(card => {
    card.addEventListener('click', () => {
      currentCV.meta.template = card.getAttribute('data-template-id');
      saveCVDirect(currentCV);
      syncToolbarState();
      closeAllPopovers();
      refreshCanvas();
    });
  });

  document.querySelectorAll('#popover-color .color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      currentCV.meta.accentColor = dot.getAttribute('data-color');
      saveCVDirect(currentCV);
      syncToolbarState();
      closeAllPopovers();
      refreshCanvas();
    });
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
    syncToolbarState();
    saveCVDirect(currentCV);
    refreshCanvas();
    showToast('Margins tightened to fit cleanly onto 1 A4 page.');
  });

  /* ------------------------------------------------------------------
     Zoom & Mobile View Switcher
     ------------------------------------------------------------------ */
  const computeFitZoom = () => {
    const canvasPane = document.querySelector('.pane-canvas');
    if (!canvasPane) return 0.85;
    const availW = canvasPane.clientWidth - 40;
    const a4WidthPx = 794;
    if (availW <= 0) return 0.85;
    return Math.min(0.88, Math.max(0.36, Math.floor((availW / a4WidthPx) * 100) / 100));
  };

  const applyZoom = (scale) => {
    if (previewSheet) previewSheet.style.transform = `scale(${scale})`;
  };

  document.getElementById('zoom-in')?.addEventListener('click', () => {
    currentZoom = Math.min(1.25, +(currentZoom + 0.1).toFixed(2));
    applyZoom(currentZoom);
  });
  document.getElementById('zoom-out')?.addEventListener('click', () => {
    currentZoom = Math.max(0.35, +(currentZoom - 0.1).toFixed(2));
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

  const switchMobileView = (view) => {
    if (!studioLayout) return;
    studioLayout.setAttribute('data-mobile-view', view);
    document.getElementById('tab-mobile-editor')?.classList.toggle('active', view === 'editor');
    document.getElementById('tab-mobile-preview')?.classList.toggle('active', view === 'preview');
    if (view === 'preview') {
      requestAnimationFrame(() => {
        currentZoom = computeFitZoom();
        applyZoom(currentZoom);
        calculatePageBudget();
      });
    }
  };

  document.getElementById('tab-mobile-editor')?.addEventListener('click', () => switchMobileView('editor'));
  document.getElementById('tab-mobile-preview')?.addEventListener('click', () => switchMobileView('preview'));

  /* ------------------------------------------------------------------
     Launch Modal ("How would you like to start?") + JSON Import/Export
     ------------------------------------------------------------------ */
  const openLaunchModal = () => launchOverlay?.classList.add('open');
  const closeLaunchModal = () => launchOverlay?.classList.remove('open');

  document.getElementById('btn-open-launch')?.addEventListener('click', openLaunchModal);
  document.getElementById('btn-close-launch')?.addEventListener('click', () => {
    saveCVDirect(currentCV);
    closeLaunchModal();
  });
  launchOverlay?.addEventListener('click', (e) => {
    if (e.target === launchOverlay) {
      saveCVDirect(currentCV);
      closeLaunchModal();
    }
  });

  const hydrateAll = () => {
    ensureCVShape(currentCV);
    syncStaticInputsFromCV();
    syncToolbarState();
    syncAccordionOrderDOM();
    renderExperienceCards();
    renderEducationCards();
    renderSkillsChips();
    renderLanguageCards();
    renderProjectsCards();
    renderCertificationsCards();
    refreshCanvas();
  };

  document.getElementById('btn-start-guided')?.addEventListener('click', () => {
    currentCV = createEmptyCV();
    saveCVDirect(currentCV);
    hydrateAll();
    closeLaunchModal();
    setActiveSection('identity', { focusInput: true });
    showToast('Guided mode ready — start with your name and target role.');
  });

  document.getElementById('btn-start-sample')?.addEventListener('click', () => {
    currentCV = createSampleEuropeanCV();
    saveCVDirect(currentCV);
    hydrateAll();
    closeLaunchModal();
    setActiveSection('experience');
    showToast('Sample European CV loaded.');
  });

  const importFileInput = document.getElementById('import-json-file');
  document.getElementById('btn-start-import')?.addEventListener('click', () => importFileInput?.click());
  importFileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importCVFromJSON(file);
      currentCV = imported;
      saveCVDirect(currentCV);
      hydrateAll();
      closeLaunchModal();
      showToast('CV imported cleanly from JSON.');
    } catch (err) {
      showToast(err.message || 'Could not import JSON file.');
    } finally {
      importFileInput.value = '';
    }
  });

  document.getElementById('btn-export-json')?.addEventListener('click', () => {
    exportCVAsJSON(currentCV);
    showToast('JSON backup downloaded.');
  });

  document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
    exportCVToPDF(currentCV);
  });

  /* ------------------------------------------------------------------
     ATS & Job Matcher Drawer
     ------------------------------------------------------------------ */
  const openDrawer = () => {
    updateATSReport();
    drawer?.classList.add('open');
    drawerBackdrop?.classList.add('active');
  };
  const closeDrawer = () => {
    drawer?.classList.remove('open');
    drawerBackdrop?.classList.remove('active');
  };

  document.getElementById('btn-ats-pill')?.addEventListener('click', openDrawer);
  document.getElementById('btn-open-matcher')?.addEventListener('click', () => {
    openDrawer();
    document.getElementById('job-description-input')?.focus();
  });
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
    const badge = document.getElementById('job-match-badge');
    badge.textContent = `${match.matchPercentage}% Match`;
    badge.className = `ats-pill ${match.matchPercentage < 40 ? 'state-low' : match.matchPercentage < 70 ? 'state-warn' : ''}`.trim();

    const matchedBox = document.getElementById('job-matched-tags');
    matchedBox.innerHTML = match.matched.length > 0
      ? match.matched.map(m => `<span class="tag-interactive tag-matched">✓ ${escapeHTML(m)}</span>`).join('')
      : '<span style="font-size: 12px; color: var(--text-secondary);">No direct keyword matches yet.</span>';

    const missingBox = document.getElementById('job-missing-tags');
    missingBox.innerHTML = match.missing.length > 0
      ? match.missing.map(m => `<span class="tag-interactive tag-missing" data-add-kw="${escapeAttr(m)}" title="Click to add to your skills">+ ${escapeHTML(m)}</span>`).join('')
      : '<span style="font-size: 12px; color: var(--success); font-weight: 600;">All detected qualifications are present.</span>';

    missingBox.querySelectorAll('[data-add-kw]').forEach(pill => {
      pill.addEventListener('click', () => {
        const kw = pill.getAttribute('data-add-kw');
        currentCV.skills.technical = currentCV.skills.technical || [];
        if (!currentCV.skills.technical.map(s => s.toLowerCase()).includes(kw.toLowerCase())) {
          currentCV.skills.technical.push(kw.charAt(0).toUpperCase() + kw.slice(1));
          saveCVDirect(currentCV);
          renderSkillsChips();
          refreshCanvas();
          document.getElementById('btn-analyze-job').click();
        }
      });
    });

    document.getElementById('job-match-recs').textContent = match.recommendations.join(' ');
  });

  // Initial Mount
  currentZoom = computeFitZoom();
  hydrateAll();
  setActiveSection('identity');
  applyZoom(currentZoom);

  if (isFirstVisit) {
    openLaunchModal();
  }
}

function ensureCVShape(cv) {
  cv.meta = cv.meta || {};
  cv.meta.sectionOrder = normalizeSectionOrder(cv.meta.sectionOrder);
  cv.personal = cv.personal || {};
  cv.experience = Array.isArray(cv.experience) ? cv.experience : [];
  cv.education = Array.isArray(cv.education) ? cv.education : [];
  cv.skills = cv.skills || { technical: [], languages: [] };
  cv.skills.technical = Array.isArray(cv.skills.technical) ? cv.skills.technical : [];
  cv.skills.languages = Array.isArray(cv.skills.languages) ? cv.skills.languages : [];
  cv.projects = Array.isArray(cv.projects) ? cv.projects : [];
  cv.certifications = Array.isArray(cv.certifications) ? cv.certifications : [];
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
