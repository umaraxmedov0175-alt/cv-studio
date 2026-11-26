/**
 * European CV Studio — Application Orchestrator
 * 2-Pane Editorial Studio with Guided Stepper, Collapsible Accordions,
 * Visual Template Gallery, Section Reordering, Strength Meter, and Theme Switcher.
 */

import { loadStoredCV, saveCVWithStatus, hasStoredCV, exportCVAsJSON, importCVFromJSON } from './model/storage.js';
import {
  createSampleEuropeanCV,
  createSampleCVForMarket,
  createEmptyCV,
  TEMPLATE_IDS,
  CEFR_LEVELS,
  normalizeSectionOrder,
  isSafePhotoUrl,
  MAX_EMBEDDED_PHOTO_DATA_URL_LENGTH
} from './model/cv-schema.js';
import { renderCVPreview } from './components/preview-renderer.js';
import { exportCVToPDF } from './engines/pdf-exporter.js';
import { COUNTRY_STANDARDS, getCountryFieldRules } from './engines/country-rules.js';
import { analyzeCVForATS } from './engines/ats-scorer.js';
import { calculateJobMatch } from './engines/job-matcher.js';
import { calculateCVCompletion } from './engines/completion-engine.js';
import { createSectionEditors } from './ui/section-editors.js';

const THEME_STORAGE_KEY = 'european_cv_studio_theme';

const SECTION_LABELS = {
  identity: 'Identity',
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  languages: 'Languages',
  projects: 'Projects',
  certifications: 'Certifications',
  additional: 'Additional'
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
  NL: 'Netherlands',
  RU: 'Russia, 1-page',
  UZ: 'Uzbekistan, formal'
};

const LANGUAGE_LABELS = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  ru: 'Русский',
  uz: 'Oʻzbekcha'
};

const SPACING_LABELS = {
  compact: 'Compact',
  normal: 'Standard',
  spacious: 'Spacious'
};

const COLOR_NAMES = {
  '#2b3fe8': 'Ultramarine',
  '#1e3a8a': 'Prussian Navy',
  '#065f46': 'Botanical Emerald',
  '#701a75': 'Bordeaux Plum',
  '#b4432a': 'Burnt Sienna',
  '#0f172a': 'Obsidian Slate',
  '#334155': 'Obsidian Slate'
};

const STUDIO_INK_KEYS = {
  '#2b3fe8': 'ultramarine',
  '#1e3a8a': 'prussian',
  '#065f46': 'emerald',
  '#701a75': 'bordeaux',
  '#b4432a': 'sienna',
  '#0f172a': 'obsidian',
  '#334155': 'obsidian'
};

const DISPLAY_KEYWORD_MAP = {
  'typescript': 'TypeScript',
  'javascript': 'JavaScript',
  'next.js': 'Next.js',
  'node.js': 'Node.js',
  'vue': 'Vue',
  'c++': 'C++',
  'c#': 'C#',
  '.net': '.NET',
  'sql': 'SQL',
  'postgresql': 'PostgreSQL',
  'mysql': 'MySQL',
  'mongodb': 'MongoDB',
  'aws': 'AWS',
  'gcp': 'GCP',
  'ci/cd': 'CI/CD',
  'github actions': 'GitHub Actions',
  'rest': 'REST',
  'graphql': 'GraphQL',
  'grpc': 'gRPC',
  'ui/ux': 'UI/UX',
  'css': 'CSS',
  'html': 'HTML',
  'tdd': 'TDD',
  'fastapi': 'FastAPI'
};

const BACKGROUND_LANDMARKS_SELECTOR = 'header.app-header, nav.settings-toolbar, .mobile-pane-tabs, main.studio-layout, footer.strength-footer';
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]'
].join(', ');

let currentCV = null;
let currentZoom = 0.85;
let activeSectionId = 'identity';
let draggedSectionId = null;
let manualSpacingOverride = false;
let autoAppliedCompact = false;
let lastScrolledTabId = null;

function formatSkillKeyword(kw) {
  const lower = String(kw || '').trim().toLowerCase();
  if (!lower) return '';
  if (DISPLAY_KEYWORD_MAP[lower]) return DISPLAY_KEYWORD_MAP[lower];
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function splitDateRange(rawValue) {
  const str = String(rawValue || '').trim();
  if (!str) return { startDate: '', endDate: '' };
  const match = str.match(/^(.*?)\s*(?:[–—]|\s+-\s+|\s+(?:to|bis)\s+)\s*(.*)$/i);
  if (match) {
    return { startDate: match[1].trim(), endDate: match[2].trim() };
  }
  return { startDate: str, endDate: '' };
}

function formatInputDateRange(item) {
  const start = typeof item?.startDate === 'string' ? item.startDate.trim() : '';
  const end = typeof item?.endDate === 'string' ? item.endDate.trim() : '';
  const resolvedEnd = end || (item?.current ? 'Present' : '');
  if (start && resolvedEnd) return `${start} – ${resolvedEnd}`;
  return start || resolvedEnd || '';
}

function generateEntryId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(el => {
    if (el.closest('[inert]') || el.hasAttribute('disabled')) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

function handleFocusTrapKeydown(e, container) {
  if (e.key !== 'Tab' || !container) return;
  const focusables = getFocusableElements(container);
  if (focusables.length === 0) {
    e.preventDefault();
    return;
  }
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first || !container.contains(document.activeElement)) {
      e.preventDefault();
      last.focus();
    }
  } else if (document.activeElement === last || !container.contains(document.activeElement)) {
    e.preventDefault();
    first.focus();
  }
}

function downscalePhotoFile(file, maxWidth = 600, maxHeight = 750, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const origW = img.naturalWidth || img.width || 1;
        const origH = img.naturalHeight || img.height || 1;
        const scale = Math.min(1, maxWidth / origW, maxHeight / origH);
        let targetW = Math.max(1, Math.round(origW * scale));
        let targetH = Math.max(1, Math.round(origH * scale));

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not initialize image processor.'));
          return;
        }
        const qualities = [...new Set([Math.min(quality, 0.82), 0.72, 0.62, 0.52])];
        while (targetW >= 128 && targetH >= 128) {
          canvas.width = targetW;
          canvas.height = targetH;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);
          for (const imageQuality of qualities) {
            const dataUrl = canvas.toDataURL('image/jpeg', imageQuality);
            if (dataUrl.length <= MAX_EMBEDDED_PHOTO_DATA_URL_LENGTH) {
              resolve(dataUrl);
              return;
            }
          }
          targetW = Math.round(targetW * 0.8);
          targetH = Math.round(targetH * 0.8);
        }
        reject(new Error('This portrait is too large to store in your browser. Choose a smaller image.'));
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read the selected image file.'));
    };
    img.src = objectUrl;
  });
}

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
  const showToast = (message, durationMs = 2600) => {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), durationMs);
  };

  let lastQuotaToastAt = 0;
  const handleStorageStatus = (status, { forceToast = false } = {}) => {
    if (!status || status.ok) return true;
    const now = Date.now();
    if (forceToast || now - lastQuotaToastAt > 3500) {
      lastQuotaToastAt = now;
      showToast(status.error || 'Could not save CV to browser storage.', 4200);
    }
    return false;
  };

  const persistCV = (options = {}) => handleStorageStatus(saveCVWithStatus(currentCV), options);

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

  let activePopoverTrigger = null;
  let lastLaunchOpener = null;
  let lastDrawerOpener = null;

  const hasOpenPopover = () => {
    if (document.querySelector('.bullet-assistant-popover.open')) return true;
    return popoverConfigs.some(({ menuId }) => document.getElementById(menuId)?.classList.contains('open'));
  };

  const closeBulletPopovers = () => {
    document.querySelectorAll('.bullet-assistant-popover.open').forEach(p => {
      p.classList.remove('open', 'pop-up');
      p.style.left = '';
      p.style.right = '';
    });
    document.querySelectorAll('[data-toggle-bullet-popover]').forEach(btn => {
      btn.setAttribute('aria-expanded', 'false');
    });
  };

  const clampPopoverToViewport = (menu) => {
    if (!menu) return;
    menu.style.left = '';
    menu.style.right = '';
    menu.style.top = '';
    menu.style.bottom = '';

    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth - 12) {
      const shiftLeft = rect.right - (window.innerWidth - 12);
      menu.style.left = `${-shiftLeft}px`;
    }
    const adjusted = menu.getBoundingClientRect();
    if (adjusted.left < 12) {
      menu.style.left = `${(parseFloat(menu.style.left || '0') || 0) + (12 - adjusted.left)}px`;
    }

    const yRect = menu.getBoundingClientRect();
    if (yRect.top < 12) {
      if (menu.id === 'quick-add-menu') {
        menu.style.bottom = 'auto';
        menu.style.top = 'calc(100% + 8px)';
        const flipped = menu.getBoundingClientRect();
        if (flipped.bottom > window.innerHeight - 12) {
          const currentTop = parseFloat(getComputedStyle(menu).top || '0') || 0;
          menu.style.top = `${currentTop - (flipped.bottom - (window.innerHeight - 12))}px`;
        }
      } else {
        const currentTop = parseFloat(getComputedStyle(menu).top || '0') || 0;
        menu.style.top = `${currentTop + (12 - yRect.top)}px`;
      }
    } else if (yRect.bottom > window.innerHeight - 12) {
      const overflow = yRect.bottom - (window.innerHeight - 12);
      if (menu.id === 'quick-add-menu') {
        const currentBottom = parseFloat(getComputedStyle(menu).bottom || '0') || 0;
        menu.style.bottom = `${currentBottom + overflow}px`;
      } else {
        const parentRect = menu.parentElement?.getBoundingClientRect();
        if (parentRect && parentRect.top - yRect.height - 8 >= 12) {
          menu.style.top = 'auto';
          menu.style.bottom = 'calc(100% + 6px)';
        } else {
          const currentTop = parseFloat(getComputedStyle(menu).top || '0') || 0;
          menu.style.top = `${currentTop - overflow}px`;
        }
      }
    }
  };

  const closeAllPopovers = ({ restoreFocus = false } = {}) => {
    const triggerToRestore = restoreFocus ? activePopoverTrigger : null;
    popoverConfigs.forEach(({ btnId, menuId }) => {
      document.getElementById(menuId)?.classList.remove('open');
      document.getElementById(btnId)?.setAttribute('aria-expanded', 'false');
    });
    closeBulletPopovers();
    activePopoverTrigger = null;
    if (triggerToRestore && triggerToRestore.isConnected && typeof triggerToRestore.focus === 'function') {
      triggerToRestore.focus();
    }
  };

  const openToolbarPopover = (btn, menu, { focusOption = null } = {}) => {
    if (!btn || !menu) return;
    closeAllPopovers({ restoreFocus: false });
    menu.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    activePopoverTrigger = btn;
    clampPopoverToViewport(menu);

    const listbox = menu.querySelector('[role="listbox"]');
    if (listbox) {
      const options = Array.from(listbox.querySelectorAll('[role="option"]'));
      if (options.length) {
        let targetOption = null;
        if (focusOption === 'first') targetOption = options[0];
        else if (focusOption === 'last') targetOption = options[options.length - 1];
        else targetOption = options.find(opt => opt.getAttribute('aria-selected') === 'true' || opt.classList.contains('active')) || options[0];
        targetOption?.focus();
      }
    }
  };

  popoverConfigs.forEach(({ btnId, menuId }) => {
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !menu?.classList.contains('open');
      if (willOpen && menu) {
        openToolbarPopover(btn, menu);
      } else {
        closeAllPopovers({ restoreFocus: false });
      }
    });
    btn?.addEventListener('keydown', (e) => {
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && menu?.querySelector('[role="listbox"]')) {
        e.preventDefault();
        e.stopPropagation();
        openToolbarPopover(btn, menu, { focusOption: e.key === 'ArrowUp' ? 'last' : 'active' });
      }
    });
    menu?.addEventListener('click', (e) => e.stopPropagation());

    const listbox = menu?.querySelector('[role="listbox"]');
    listbox?.addEventListener('keydown', (e) => {
      const options = Array.from(listbox.querySelectorAll('[role="option"]'));
      if (!options.length) return;
      const idx = options.indexOf(document.activeElement);
      let nextIdx = -1;
      if (e.key === 'ArrowDown') nextIdx = idx >= 0 ? (idx + 1) % options.length : 0;
      else if (e.key === 'ArrowUp') nextIdx = idx >= 0 ? (idx - 1 + options.length) % options.length : options.length - 1;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = options.length - 1;
      if (nextIdx >= 0) {
        e.preventDefault();
        options[nextIdx]?.focus();
      }
    });
  });

  document.addEventListener('click', () => closeAllPopovers({ restoreFocus: false }));

  document.addEventListener('keydown', (e) => {
    if (launchOverlay?.classList.contains('open')) {
      if (e.key === 'Tab') {
        handleFocusTrapKeydown(e, launchOverlay);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        persistCV();
        closeLaunchModal({ restoreFocus: true });
        return;
      }
    }

    if (e.key === 'Escape' && hasOpenPopover()) {
      e.preventDefault();
      closeAllPopovers({ restoreFocus: true });
      return;
    }

    if (drawer?.classList.contains('open')) {
      if (e.key === 'Tab') {
        handleFocusTrapKeydown(e, drawer);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDrawer({ restoreFocus: true });
      }
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
      'p-telegram': currentCV.personal.telegram || '',
      'p-patronymic': currentCV.personal.patronymic || '',
      'p-work-permission': currentCV.personal.workPermission || '',
      'p-salary': currentCV.personal.desiredSalary || '',
      'p-marital-status': currentCV.personal.maritalStatus || '',
      'p-gender': currentCV.personal.gender || '',
      'p-linkedin': currentCV.personal.linkedin || '',
      'a-driving': currentCV.additional?.drivingLicence || '',
      'a-trips': currentCV.additional?.businessTrips || '',
      'a-relocation': currentCV.additional?.relocation || '',
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

    const emailHint = document.getElementById('email-format-hint');
    if (emailHint) {
      const emailVal = (currentCV.personal.email || '').trim();
      emailHint.style.display = (emailVal && !emailVal.includes('@')) ? 'block' : 'none';
    }

    syncPhotoThumb();
  };

  const syncPhotoThumb = () => {
    const thumb = document.getElementById('photo-mini-preview');
    if (!thumb) return;
    const rawPhoto = typeof currentCV.personal?.photoUrl === 'string' ? currentCV.personal.photoUrl.trim() : '';
    if (rawPhoto && isSafePhotoUrl(rawPhoto)) {
      thumb.innerHTML = `<img src="${escapeAttr(rawPhoto)}" alt="Portrait thumbnail">`;
    } else {
      thumb.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"></path></svg>`;
    }
  };

  const syncToolbarState = () => {
    const country = currentCV.meta.targetCountry || 'DE';
    const lang = currentCV.meta.language || 'en';
    const spacing = currentCV.meta.spacing || 'normal';
    const tplId = currentCV.meta.template || TEMPLATE_IDS.GERMAN_DIN;
    const rules = getCountryFieldRules(country);

    const countryCodeEl = document.getElementById('active-country-code');
    const countryLabelEl = document.getElementById('active-country-label');
    if (countryCodeEl) countryCodeEl.textContent = country;
    if (countryLabelEl) countryLabelEl.textContent = COUNTRY_SHORT_LABELS[country] || country;
    document.querySelectorAll('#popover-country .studio-menu-item').forEach(btn => {
      const isSelected = btn.getAttribute('data-country-val') === country;
      btn.classList.toggle('active', isSelected);
      btn.setAttribute('aria-selected', String(isSelected));
    });

    const langLabelEl = document.getElementById('active-language-label');
    if (langLabelEl) langLabelEl.textContent = LANGUAGE_LABELS[lang] || 'English';
    document.querySelectorAll('#popover-language .studio-menu-item').forEach(btn => {
      const isSelected = btn.getAttribute('data-lang-val') === lang;
      btn.classList.toggle('active', isSelected);
      btn.setAttribute('aria-selected', String(isSelected));
    });

    const spacingLabelEl = document.getElementById('active-spacing-label');
    if (spacingLabelEl) spacingLabelEl.textContent = SPACING_LABELS[spacing] || 'Standard';
    document.querySelectorAll('#popover-spacing .studio-menu-item').forEach(btn => {
      const isSelected = btn.getAttribute('data-spacing-val') === spacing;
      btn.classList.toggle('active', isSelected);
      btn.setAttribute('aria-selected', String(isSelected));
    });

    if (togglePhoto) togglePhoto.checked = currentCV.meta.showPhoto !== false;
    if (toggleSignature) toggleSignature.checked = currentCV.meta.includeSignatureBlock !== false;
    const togglePatronymic = document.getElementById('toggle-patronymic');
    const toggleWorkPerm = document.getElementById('toggle-work-permission');
    const toggleMarital = document.getElementById('toggle-marital-status');
    const toggleGender = document.getElementById('toggle-gender');
    const toggleSalary = document.getElementById('toggle-salary');
    if (togglePatronymic) togglePatronymic.checked = Boolean(currentCV.meta.showPatronymic);
    if (toggleWorkPerm) toggleWorkPerm.checked = Boolean(currentCV.meta.showWorkPermission || rules.allowWorkPermission);
    if (toggleMarital) toggleMarital.checked = Boolean(currentCV.meta.showMaritalStatus);
    if (toggleGender) toggleGender.checked = Boolean(currentCV.meta.showGender);
    if (toggleSalary) toggleSalary.checked = Boolean(currentCV.meta.showSalary);

    const std = COUNTRY_STANDARDS[country] || COUNTRY_STANDARDS.DE;
    let complianceText = std.complianceNote;
    if (rules.compactMode) {
      complianceText += ' Compact spacing is recommended for 1-page presentation.';
    }
    if (tplId !== TEMPLATE_IDS.GERMAN_DIN && (rules.allowPhoto || rules.allowSignatureBlock)) {
      complianceText += ` Note: ${TEMPLATE_NAMES[tplId] || 'This'} layout omits portrait photo and closing signature blocks.`;
    }
    if (complianceBox) complianceBox.textContent = complianceText;

    const isRuOrUz = country === 'RU' || country === 'UZ';
    const photoHint = document.getElementById('photo-toggle-hint');
    if (photoHint) {
      if (country === 'RU') {
        photoHint.textContent = 'In Russia a photo is optional. If you add one, use a neutral business portrait.';
        photoHint.style.display = 'block';
      } else if (country === 'UZ') {
        photoHint.textContent = 'A neutral business portrait is common in Uzbekistan; you can switch it off anytime.';
        photoHint.style.display = 'block';
      } else {
        photoHint.style.display = 'none';
      }
    }

    const regIdentity = document.getElementById('regional-identity-fields');
    const groupBirth = document.getElementById('group-birth');
    const groupNationality = document.getElementById('group-nationality');
    const labelNationality = document.getElementById('label-nationality');
    const inputNationality = document.getElementById('p-nationality');
    const inputPhone = document.getElementById('p-phone');
    const inputLinkedin = document.getElementById('p-linkedin');
    const photoUploadGrp = document.getElementById('group-photo-upload');
    const rowTogglePhoto = document.getElementById('row-toggle-photo');
    const rowToggleSignature = document.getElementById('row-toggle-signature');
    const rowTogglePatronymic = document.getElementById('row-toggle-patronymic');
    const rowToggleWorkPerm = document.getElementById('row-toggle-work-permission');
    const rowToggleMarital = document.getElementById('row-toggle-marital-status');
    const rowToggleGender = document.getElementById('row-toggle-gender');
    const rowToggleSalary = document.getElementById('row-toggle-salary');
    const formalSection = document.getElementById('formal-toggles-section');

    if (labelNationality) labelNationality.textContent = isRuOrUz ? 'Citizenship' : 'Nationality';
    if (inputNationality) inputNationality.placeholder = country === 'RU' ? 'e.g. Russia' : (country === 'UZ' ? 'e.g. Uzbekistan' : 'e.g. German');
    if (inputPhone && std.phonePlaceholder) inputPhone.placeholder = std.phonePlaceholder;
    else if (inputPhone) inputPhone.placeholder = '+49 170 12345678';
    if (inputLinkedin && std.profileLinkLabel) inputLinkedin.placeholder = std.profileLinkLabel;
    else if (inputLinkedin) inputLinkedin.placeholder = 'linkedin.com/in/yourname';

    if (groupBirth) groupBirth.style.display = rules.allowBirthDate ? '' : 'none';
    if (groupNationality) groupNationality.style.display = rules.allowNationality ? '' : 'none';
    if (regIdentity) regIdentity.style.display = (rules.allowBirthDate || rules.allowNationality) ? 'grid' : 'none';

    const showTelegram = Boolean(rules.allowTelegram || (currentCV.personal.telegram || '').trim());
    const showPatronymic = Boolean(currentCV.meta.showPatronymic);
    const showWorkPerm = Boolean(rules.allowWorkPermission || currentCV.meta.showWorkPermission);
    const showMarital = Boolean(currentCV.meta.showMaritalStatus);
    const showGender = Boolean(currentCV.meta.showGender);
    const showSalary = Boolean(currentCV.meta.showSalary);

    const setDisp = (id, show) => { const el = document.getElementById(id); if (el) el.style.display = show ? '' : 'none'; };
    setDisp('group-telegram', showTelegram);
    setDisp('group-patronymic', showPatronymic);
    setDisp('group-work-permission', showWorkPerm);
    setDisp('group-marital-status', showMarital);
    setDisp('group-gender', showGender);
    setDisp('group-salary', showSalary);
    const hasAdditional = Boolean(
      (currentCV.additional?.drivingLicence || '').trim() ||
      (currentCV.additional?.businessTrips || '').trim() ||
      (currentCV.additional?.relocation || '').trim()
    );
    setDisp('additional-info-fields', isRuOrUz || hasAdditional);

    if (photoUploadGrp) photoUploadGrp.style.display = rules.allowPhoto ? 'flex' : 'none';
    if (rowTogglePhoto) rowTogglePhoto.style.display = rules.allowPhoto ? 'flex' : 'none';
    if (rowToggleSignature) rowToggleSignature.style.display = rules.allowSignatureBlock ? 'flex' : 'none';
    if (rowTogglePatronymic) rowTogglePatronymic.style.display = isRuOrUz ? 'flex' : 'none';
    if (rowToggleWorkPerm) rowToggleWorkPerm.style.display = isRuOrUz ? 'flex' : 'none';
    if (rowToggleMarital) rowToggleMarital.style.display = isRuOrUz ? 'flex' : 'none';
    if (rowToggleGender) rowToggleGender.style.display = country === 'UZ' ? 'flex' : 'none';
    if (rowToggleSalary) rowToggleSalary.style.display = isRuOrUz ? 'flex' : 'none';
    if (formalSection) formalSection.style.display = (rules.allowPhoto || rules.allowSignatureBlock || isRuOrUz) ? 'block' : 'none';

    const tplLabel = document.getElementById('active-template-label');
    if (tplLabel) tplLabel.textContent = TEMPLATE_NAMES[tplId] || 'Frankfurt';
    document.querySelectorAll('#template-gallery .template-card-option').forEach(card => {
      const isActive = card.getAttribute('data-template-id') === tplId;
      card.classList.toggle('active', isActive);
      card.setAttribute('aria-pressed', String(isActive));
    });

    const activeColor = (currentCV.meta.accentColor || '#2b3fe8').toLowerCase();
    const inkKey = STUDIO_INK_KEYS[activeColor] || 'ultramarine';
    document.documentElement.setAttribute('data-studio-ink', inkKey);

    const activeDot = document.getElementById('active-color-dot');
    const activeColorName = document.getElementById('active-color-name');
    if (activeDot) activeDot.style.background = activeColor;
    if (activeColorName) activeColorName.textContent = COLOR_NAMES[activeColor] || 'Accent';
    document.querySelectorAll('#popover-color .color-dot').forEach(dot => {
      const isActive = (dot.getAttribute('data-color') || '').toLowerCase() === activeColor;
      dot.classList.toggle('active', isActive);
      dot.setAttribute('aria-pressed', String(isActive));
    });
  };

  /* ------------------------------------------------------------------
     Stepper, Accordion Expand/Collapse, Summary Previews & Strength Meter
     ------------------------------------------------------------------ */
  const getOrderedAllSections = () => {
    currentCV.meta.sectionOrder = normalizeSectionOrder(currentCV.meta.sectionOrder);
    return ['identity', ...currentCV.meta.sectionOrder];
  };

  const syncStepNavFooters = () => {
    const ordered = getOrderedAllSections();
    document.querySelectorAll('[data-step-next]').forEach(btn => {
      const secId = btn.getAttribute('data-step-next');
      const idx = ordered.indexOf(secId);
      if (idx >= 0 && idx < ordered.length - 1) {
        const nextId = ordered[idx + 1];
        btn.textContent = `Next: ${SECTION_LABELS[nextId] || nextId}`;
      } else {
        btn.textContent = 'Finish & Export';
      }
    });
  };

  const setActiveSection = (sectionId, { focusInput = false } = {}) => {
    const ordered = getOrderedAllSections();
    if (!ordered.includes(sectionId)) return;

    activeSectionId = sectionId;
    document.querySelectorAll('.accordion-card').forEach(card => {
      const id = card.getAttribute('data-section-id');
      const isOpen = id === sectionId;
      card.classList.toggle('is-open', isOpen);
      const toggleBtn = card.querySelector(`.accordion-toggle[data-section-toggle="${id}"]`);
      toggleBtn?.setAttribute('aria-expanded', String(isOpen));
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
      targetCard.querySelector(`.accordion-toggle[data-section-toggle="${sectionId}"]`)?.setAttribute('aria-expanded', 'false');
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
    order.forEach((id, idx) => {
      const card = cardMap[id];
      if (card) {
        card.style.display = 'block';
        container.appendChild(card);
        const upBtn = card.querySelector(`[data-move-up="${id}"]`);
        const downBtn = card.querySelector(`[data-move-down="${id}"]`);
        if (upBtn) upBtn.disabled = idx === 0;
        if (downBtn) downBtn.disabled = idx === order.length - 1;
      }
    });

    allCards.forEach(card => {
      const id = card.getAttribute('data-section-id');
      if (!order.includes(id)) {
        card.style.display = 'none';
        container.appendChild(card);
      }
    });

    syncStepNavFooters();
    renderStepper();
  };

  const stepperBar = document.getElementById('stepper-bar');
  stepperBar?.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-step-target]');
    if (tab) {
      setActiveSection(tab.getAttribute('data-step-target'), { focusInput: false });
    }
  });
  stepperBar?.addEventListener('keydown', (e) => {
    const tab = e.target.closest('[data-step-target]');
    if (!tab) return;
    const tabs = Array.from(stepperBar.querySelectorAll('[data-step-target]'));
    const idx = tabs.indexOf(tab);
    if (idx < 0) return;

    let nextIdx = -1;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = tabs.length - 1;

    if (nextIdx >= 0) {
      e.preventDefault();
      const targetId = tabs[nextIdx].getAttribute('data-step-target');
      setActiveSection(targetId, { focusInput: false });
      stepperBar.querySelector(`[data-step-target="${targetId}"]`)?.focus();
    }
  });

  const renderStepper = () => {
    if (!stepperBar) return;
    const completion = calculateCVCompletion(currentCV);
    const ordered = getOrderedAllSections();
    const focusableId = (activeSectionId && ordered.includes(activeSectionId)) ? activeSectionId : ordered[0];

    const existingTabs = Array.from(stepperBar.querySelectorAll('[data-step-target]'));
    const matchesOrder = existingTabs.length === ordered.length &&
      existingTabs.every((tab, i) => tab.getAttribute('data-step-target') === ordered[i]);

    if (matchesOrder) {
      existingTabs.forEach((tab, i) => {
        const id = ordered[i];
        const status = completion.sectionStatus[id] || 'empty';
        const isActive = activeSectionId === id;
        tab.classList.toggle('active', isActive);
        tab.classList.toggle('done', status === 'complete');
        tab.classList.toggle('partial', status === 'partial');
        tab.setAttribute('aria-selected', String(isActive));
        tab.setAttribute('aria-controls', `body-${id}`);
        tab.setAttribute('tabindex', id === focusableId ? '0' : '-1');
      });
    } else {
      stepperBar.innerHTML = ordered.map((id) => {
        const status = completion.sectionStatus[id] || 'empty';
        const statusClass = status === 'complete' ? 'done' : status === 'partial' ? 'partial' : '';
        const isActive = activeSectionId === id;
        const tabIdx = id === focusableId ? '0' : '-1';
        return `
          <button type="button" class="step-tab ${isActive ? 'active' : ''} ${statusClass}" id="step-tab-${id}" data-step-target="${id}" role="tab" aria-selected="${isActive}" aria-controls="body-${id}" tabindex="${tabIdx}">
            <span class="step-dot" aria-hidden="true"></span>
            <span>${SECTION_LABELS[id] || id}</span>
          </button>
        `;
      }).join('');
    }

    if (activeSectionId && activeSectionId !== lastScrolledTabId) {
      lastScrolledTabId = activeSectionId;
      const activeTab = stepperBar.querySelector(`[data-step-target="${activeSectionId}"]`);
      activeTab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
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
    const trackEl = document.getElementById('strength-track');
    const tierEl = document.getElementById('strength-tier');
    const nextBtn = document.getElementById('strength-next-btn');

    if (pctEl) pctEl.textContent = `${completion.percentage}%`;
    if (fillEl) fillEl.style.width = `${completion.percentage}%`;
    if (trackEl) trackEl.setAttribute('aria-valuenow', String(completion.percentage));
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
      if (!previewSheet || previewSheet.offsetParent === null || previewSheet.offsetWidth === 0) return;
      const singlePageMax = 1123;
      const actualScrollHeight = previewSheet.scrollHeight;
      const budgetTrack = document.getElementById('budget-track');

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
        if (budgetTrack) budgetTrack.setAttribute('aria-valuenow', String(pct));
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
        if (budgetTrack) budgetTrack.setAttribute('aria-valuenow', '100');
        if (budgetLabel) {
          budgetLabel.textContent = `Page 2: +${page2Pct}% overflow`;
          budgetLabel.style.color = 'var(--warning)';
        }
        const canCompact = (currentCV.meta?.spacing || 'normal') !== 'compact';
        if (btnAutoFit) btnAutoFit.style.display = canCompact ? 'inline-flex' : 'none';
      }
    });
  };

  let syncJobMatchIfOpen = () => {};

  const refreshCanvas = () => {
    renderCVPreview(currentCV, previewSheet);
    calculatePageBudget();
    updateATSReport();
    updateAccordionSummariesAndStrength();
    syncJobMatchIfOpen();
  };

  const sectionEditors = createSectionEditors({
    initialCV: currentCV,
    persistCV,
    refreshCanvas,
    splitDateRange,
    formatInputDateRange,
    escapeHTML,
    escapeAttr,
    addNewExperience: () => addNewExperience(),
    addNewEducation: () => addNewEducation(),
    addNewLanguage: () => addNewLanguage(),
    addNewProject: () => addNewProject(),
    addNewCert: () => addNewCert(),
    closeAllPopovers,
    setActivePopoverTrigger: trigger => { activePopoverTrigger = trigger; }
  });
  const {
    renderExperienceCards,
    renderEducationCards,
    renderSkillsChips,
    renderLanguageCards,
    renderProjectsCards,
    renderCertificationsCards
  } = sectionEditors;
  /* ------------------------------------------------------------------
     Bind Static Fields, Skill Quick-Add & Section Mutators
     ------------------------------------------------------------------ */
  const bindStaticField = (id, setter) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', (e) => {
      setter(e.target.value);
      persistCV();
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

  const syncSignatureNameIfLinked = (prevFullName) => {
    const nextFullName = [currentCV.personal.firstName, currentCV.personal.lastName].filter(Boolean).join(' ').trim();
    const curSigName = (currentCV.signature?.signeeName || '').trim();
    if (!curSigName || curSigName === prevFullName) {
      currentCV.signature = currentCV.signature || {};
      currentCV.signature.signeeName = nextFullName;
    }
  };

  bindStaticField('p-first-name', val => {
    const prevFull = [currentCV.personal.firstName, currentCV.personal.lastName].filter(Boolean).join(' ').trim();
    currentCV.personal.firstName = val;
    syncSignatureNameIfLinked(prevFull);
  });
  bindStaticField('p-last-name', val => {
    const prevFull = [currentCV.personal.firstName, currentCV.personal.lastName].filter(Boolean).join(' ').trim();
    currentCV.personal.lastName = val;
    syncSignatureNameIfLinked(prevFull);
  });
  bindStaticField('p-title', val => { currentCV.personal.title = val; });
  bindStaticField('p-email', val => {
    currentCV.personal.email = val;
    const emailHint = document.getElementById('email-format-hint');
    if (emailHint) {
      const trimmed = val.trim();
      emailHint.style.display = (trimmed && !trimmed.includes('@')) ? 'block' : 'none';
    }
  });
  bindStaticField('p-phone', val => { currentCV.personal.phone = val; });
  bindStaticField('p-city', val => {
    const prevCity = (currentCV.personal.city || '').trim();
    currentCV.personal.city = val;
    const curSigPlace = (currentCV.signature?.place || '').trim();
    if (!curSigPlace || curSigPlace === prevCity || curSigPlace === 'Berlin') {
      currentCV.signature = currentCV.signature || {};
      currentCV.signature.place = val.trim() || 'Berlin';
    }
  });
  bindStaticField('p-birth', val => { currentCV.personal.birthDate = val; });
  bindStaticField('p-nationality', val => { currentCV.personal.nationality = val; });
  bindStaticField('p-telegram', val => { currentCV.personal.telegram = val; });
  bindStaticField('p-patronymic', val => { currentCV.personal.patronymic = val; });
  bindStaticField('p-work-permission', val => { currentCV.personal.workPermission = val; });
  bindStaticField('p-salary', val => { currentCV.personal.desiredSalary = val; });
  bindStaticField('p-marital-status', val => { currentCV.personal.maritalStatus = val; });
  bindStaticField('p-gender', val => { currentCV.personal.gender = val; });
  bindStaticField('p-linkedin', val => { currentCV.personal.linkedin = val; });
  bindStaticField('a-driving', val => { currentCV.additional = currentCV.additional || {}; currentCV.additional.drivingLicence = val; });
  bindStaticField('a-trips', val => { currentCV.additional = currentCV.additional || {}; currentCV.additional.businessTrips = val; });
  bindStaticField('a-relocation', val => { currentCV.additional = currentCV.additional || {}; currentCV.additional.relocation = val; });
  bindStaticField('f-summary', val => { currentCV.summary = val; });

  document.getElementById('f-skills-tech')?.addEventListener('input', (e) => {
    currentCV.skills.technical = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
    persistCV();
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
    persistCV();
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

  // Photo upload & clear (with MIME validation, canvas downscale & storage quota rollback)
  const photoInput = document.getElementById('p-photo-file');
  document.getElementById('btn-upload-photo')?.addEventListener('click', () => photoInput?.click());
  photoInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_MIME_TYPES.has((file.type || '').toLowerCase())) {
      photoInput.value = '';
      showToast('Please select a JPEG, PNG, WebP, or GIF image.', 3600);
      return;
    }

    const prevPhoto = currentCV.personal.photoUrl || '';
    const prevShowPhoto = currentCV.meta.showPhoto;
    try {
      const compressedDataUrl = await downscalePhotoFile(file, 600, 750, 0.85);
      currentCV.personal.photoUrl = compressedDataUrl;
      currentCV.meta.showPhoto = true;
      const saveStatus = saveCVWithStatus(currentCV);
      if (!saveStatus.ok) {
        currentCV.personal.photoUrl = prevPhoto;
        currentCV.meta.showPhoto = prevShowPhoto;
        if (togglePhoto) togglePhoto.checked = prevShowPhoto !== false;
        syncPhotoThumb();
        handleStorageStatus(saveStatus, { forceToast: true });
        return;
      }
      if (togglePhoto) togglePhoto.checked = true;
      syncPhotoThumb();
      refreshCanvas();
      showToast('Portrait photo updated.');
    } catch (err) {
      currentCV.personal.photoUrl = prevPhoto;
      currentCV.meta.showPhoto = prevShowPhoto;
      showToast(err?.message || 'Could not process selected photo.', 3600);
    } finally {
      photoInput.value = '';
    }
  });
  document.getElementById('btn-clear-photo')?.addEventListener('click', () => {
    currentCV.personal.photoUrl = '';
    if (photoInput) photoInput.value = '';
    persistCV();
    syncPhotoThumb();
    refreshCanvas();
    showToast('Portrait photo cleared.');
  });

  const addNewExperience = () => {
    currentCV.experience = currentCV.experience || [];
    currentCV.experience.unshift({
      id: generateEntryId('exp'),
      position: 'Senior Engineer',
      company: 'Tech Enterprise',
      city: 'Berlin, Germany',
      startDate: '01/2023',
      endDate: 'Present',
      current: true,
      bullets: ['Spearheaded cross-functional initiative delivering 30% latency reduction.'],
      technologies: ['TypeScript', 'Go']
    });
    persistCV();
    renderExperienceCards();
    setActiveSection('experience');
    refreshCanvas();
  };

  const addNewEducation = () => {
    currentCV.education = currentCV.education || [];
    currentCV.education.unshift({
      id: generateEntryId('edu'),
      degree: 'B.Sc. Computer Science',
      institution: 'Technical University',
      startDate: '10/2019',
      endDate: '07/2023',
      grade: 'First Class'
    });
    persistCV();
    renderEducationCards();
    setActiveSection('education');
    refreshCanvas();
  };

  const addNewLanguage = () => {
    currentCV.skills.languages = currentCV.skills.languages || [];
    currentCV.skills.languages.push({ language: 'German', level: CEFR_LEVELS[2].label });
    persistCV();
    renderLanguageCards();
    setActiveSection('languages');
    refreshCanvas();
  };

  const addNewProject = () => {
    currentCV.projects = currentCV.projects || [];
    currentCV.projects.push({
      id: generateEntryId('proj'),
      name: 'Open Source Tooling',
      description: 'Designed modular TypeScript CLI used by internal engineering teams.',
      technologies: 'TypeScript, Node.js'
    });
    persistCV();
    renderProjectsCards();
    refreshCanvas();
  };

  const addNewCert = () => {
    currentCV.certifications = currentCV.certifications || [];
    currentCV.certifications.push({
      id: generateEntryId('cert'),
      name: 'AWS Solutions Architect',
      issuer: 'Amazon Web Services',
      year: '2024'
    });
    persistCV();
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
  document.querySelectorAll('button.accordion-toggle[data-section-toggle]').forEach(toggleBtn => {
    toggleBtn.addEventListener('click', () => {
      toggleSection(toggleBtn.getAttribute('data-section-toggle'));
    });
    toggleBtn.addEventListener('keydown', (e) => {
      const visibleToggles = Array.from(document.querySelectorAll('button.accordion-toggle[data-section-toggle]'))
        .filter(btn => btn.closest('.accordion-card')?.style.display !== 'none');
      const idx = visibleToggles.indexOf(toggleBtn);
      if (idx < 0) return;

      let nextIdx = -1;
      if (e.key === 'ArrowDown') nextIdx = (idx + 1) % visibleToggles.length;
      else if (e.key === 'ArrowUp') nextIdx = (idx - 1 + visibleToggles.length) % visibleToggles.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = visibleToggles.length - 1;

      if (nextIdx >= 0) {
        e.preventDefault();
        visibleToggles[nextIdx]?.focus();
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
      persistCV();
      syncAccordionOrderDOM();
      setActiveSection('experience');
      refreshCanvas();
      showToast(`Removed ${SECTION_LABELS[secId] || secId} from CV layout.`);
    });
  });

  document.querySelectorAll('[data-quick-action]').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.getAttribute('data-quick-action');
      closeAllPopovers({ restoreFocus: false });
      if (action === 'experience') addNewExperience();
      else if (action === 'education') addNewEducation();
      else if (action === 'language') addNewLanguage();
      else if (action === 'section-projects') {
        if (!currentCV.meta.sectionOrder.includes('projects')) {
          currentCV.meta.sectionOrder.push('projects');
        }
        if (!(currentCV.projects || []).length) addNewProject();
        syncAccordionOrderDOM();
        persistCV();
        setActiveSection('projects');
        refreshCanvas();
      } else if (action === 'section-certifications') {
        if (!currentCV.meta.sectionOrder.includes('certifications')) {
          currentCV.meta.sectionOrder.push('certifications');
        }
        if (!(currentCV.certifications || []).length) addNewCert();
        syncAccordionOrderDOM();
        persistCV();
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
    persistCV();
    syncAccordionOrderDOM();
    refreshCanvas();

    const card = document.querySelector(`.accordion-card[data-section-id="${sectionId}"]`);
    if (card) {
      const preferred = card.querySelector(delta < 0 ? `[data-move-up="${sectionId}"]` : `[data-move-down="${sectionId}"]`);
      const alternate = card.querySelector(delta < 0 ? `[data-move-down="${sectionId}"]` : `[data-move-up="${sectionId}"]`);
      const targetBtn = (preferred && !preferred.disabled) ? preferred : alternate;
      targetBtn?.focus();
    }
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

  document.addEventListener('mouseup', () => {
    if (!draggedSectionId) {
      document.querySelectorAll('#reorderable-sections .accordion-card').forEach(el => {
        el.draggable = false;
      });
    }
  });

  document.querySelectorAll('#reorderable-sections .accordion-card').forEach(card => {
    card.draggable = false;
    const handle = card.querySelector('.drag-handle');
    handle?.addEventListener('mousedown', () => {
      card.draggable = true;
    });
    handle?.addEventListener('mouseup', () => {
      if (!draggedSectionId) card.draggable = false;
    });

    card.addEventListener('dragstart', (e) => {
      if (!card.draggable || e.target.closest('input, textarea, select, button')) {
        e.preventDefault();
        card.draggable = false;
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
        el.draggable = false;
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
      persistCV();
      syncAccordionOrderDOM();
      refreshCanvas();
    });
  });

  /* ------------------------------------------------------------------
     Direct WYSIWYG Canvas Editing
     ------------------------------------------------------------------ */
  previewSheet?.addEventListener('keydown', (e) => {
    const target = e.target?.closest?.('[contenteditable="true"]');
    if (!target) return;
    if (e.key === 'Enter') {
      const isMultiline = target.getAttribute('data-bind') === 'summary' || target.getAttribute('aria-multiline') === 'true';
      if (!isMultiline) {
        e.preventDefault();
      }
    }
  });

  previewSheet?.addEventListener('paste', (e) => {
    const target = e.target?.closest?.('[contenteditable="true"]');
    if (!target) return;
    e.preventDefault();
    const rawText = (e.clipboardData || window.clipboardData)?.getData('text/plain') || '';
    const isMultiline = target.getAttribute('data-bind') === 'summary' || target.getAttribute('aria-multiline') === 'true';
    const cleanText = isMultiline ? rawText : rawText.replace(/[\r\n]+/g, ' ');
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(cleanText);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  previewSheet?.addEventListener('input', (e) => {
    const target = e.target;
    if (!target || target.getAttribute('contenteditable') !== 'true') return;
    const text = target.textContent.trim();

    const bind = target.getAttribute('data-bind');
    if (bind) {
      if (bind === 'personal.fullName') {
        const prevFull = [currentCV.personal.firstName, currentCV.personal.lastName].filter(Boolean).join(' ').trim();
        const parts = text.split(/\s+/);
        currentCV.personal.firstName = parts[0] || '';
        currentCV.personal.lastName = parts.slice(1).join(' ') || '';
        syncSignatureNameIfLinked(prevFull);
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
          const { startDate, endDate } = splitDateRange(text);
          item.startDate = startDate;
          item.endDate = endDate;
          item.current = /^(present|heute|présent|current|now|aktuell)$/i.test(endDate);
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
          const { startDate, endDate } = splitDateRange(text);
          item.startDate = startDate;
          item.endDate = endDate;
        } else {
          item[eduField] = text;
        }
        renderEducationCards();
      }
    }

    persistCV();
    calculatePageBudget();
    updateATSReport();
    updateAccordionSummariesAndStrength();
    syncJobMatchIfOpen();
  });

  previewSheet?.addEventListener('click', (e) => {
    const addBulletBtn = e.target.closest('[data-add-bullet]');
    if (addBulletBtn) {
      const idx = parseInt(addBulletBtn.getAttribute('data-add-bullet'), 10);
      const item = currentCV.experience?.[idx];
      if (item) {
        item.bullets = item.bullets || [];
        item.bullets.push('Delivered scalable engineering outcome with measurable performance gains.');
        persistCV();
        renderExperienceCards();
        refreshCanvas();
      }
      return;
    }

    const delExpBtn = e.target.closest('[data-delete-exp]');
    if (delExpBtn) {
      const idx = parseInt(delExpBtn.getAttribute('data-delete-exp'), 10);
      currentCV.experience.splice(idx, 1);
      persistCV();
      renderExperienceCards();
      refreshCanvas();
      return;
    }

    const delEduBtn = e.target.closest('[data-delete-edu]');
    if (delEduBtn) {
      const idx = parseInt(delEduBtn.getAttribute('data-delete-edu'), 10);
      currentCV.education.splice(idx, 1);
      persistCV();
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
      const nextCountry = btn.getAttribute('data-country-val');
      currentCV.meta.targetCountry = nextCountry;
      const nextRules = getCountryFieldRules(nextCountry);
      const std = COUNTRY_STANDARDS[nextCountry];
      if (nextCountry === 'RU' || nextCountry === 'UZ') {
        currentCV.meta.language = std.languageCode;
        currentCV.meta.template = std.templateDefault;
        currentCV.meta.showWorkPermission = nextCountry === 'UZ';
      }
      if (nextRules.compactMode && !manualSpacingOverride && currentCV.meta.spacing === 'normal') {
        currentCV.meta.spacing = 'compact';
        autoAppliedCompact = true;
      } else if (!nextRules.compactMode && autoAppliedCompact && !manualSpacingOverride && currentCV.meta.spacing === 'compact') {
        currentCV.meta.spacing = 'normal';
        autoAppliedCompact = false;
      }
      persistCV();
      syncToolbarState();
      closeAllPopovers({ restoreFocus: true });
      refreshCanvas();
    });
  });

  document.querySelectorAll('#popover-language [data-lang-val]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.getAttribute('data-lang-val');
      currentCV.meta.language = lang;
      persistCV();
      syncToolbarState();
      closeAllPopovers({ restoreFocus: true });
      renderExperienceCards();
      refreshCanvas();
      showToast(`CV headings updated (${LANGUAGE_LABELS[lang] || lang}).`);
    });
  });

  document.querySelectorAll('#popover-spacing [data-spacing-val]').forEach(btn => {
    btn.addEventListener('click', () => {
      manualSpacingOverride = true;
      autoAppliedCompact = false;
      currentCV.meta.spacing = btn.getAttribute('data-spacing-val');
      persistCV();
      syncToolbarState();
      closeAllPopovers({ restoreFocus: true });
      refreshCanvas();
    });
  });

  document.querySelectorAll('#template-gallery .template-card-option').forEach(card => {
    card.addEventListener('click', () => {
      currentCV.meta.template = card.getAttribute('data-template-id');
      persistCV();
      syncToolbarState();
      closeAllPopovers({ restoreFocus: true });
      refreshCanvas();
    });
  });

  document.querySelectorAll('#popover-color .color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      currentCV.meta.accentColor = dot.getAttribute('data-color');
      persistCV();
      syncToolbarState();
      closeAllPopovers({ restoreFocus: true });
      refreshCanvas();
    });
  });

  togglePhoto?.addEventListener('change', (e) => {
    currentCV.meta.showPhoto = e.target.checked;
    persistCV();
    refreshCanvas();
  });

  toggleSignature?.addEventListener('change', (e) => {
    currentCV.meta.includeSignatureBlock = e.target.checked;
    persistCV();
    refreshCanvas();
  });

  [
    ['toggle-patronymic', 'showPatronymic'],
    ['toggle-work-permission', 'showWorkPermission'],
    ['toggle-marital-status', 'showMaritalStatus'],
    ['toggle-gender', 'showGender'],
    ['toggle-salary', 'showSalary']
  ].forEach(([elId, metaKey]) => {
    document.getElementById(elId)?.addEventListener('change', (e) => {
      currentCV.meta[metaKey] = e.target.checked;
      persistCV();
      syncToolbarState();
      refreshCanvas();
    });
  });

  btnAutoFit?.addEventListener('click', () => {
    if (currentCV.meta.spacing === 'compact') return;
    manualSpacingOverride = true;
    autoAppliedCompact = false;
    currentCV.meta.spacing = 'compact';
    syncToolbarState();
    persistCV();
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
    closeAllPopovers({ restoreFocus: false });
    currentZoom = computeFitZoom();
    applyZoom(currentZoom);
    calculatePageBudget();
  });

  const switchMobileView = (view) => {
    if (!studioLayout) return;
    studioLayout.setAttribute('data-mobile-view', view);
    const editorTab = document.getElementById('tab-mobile-editor');
    const previewTab = document.getElementById('tab-mobile-preview');
    editorTab?.classList.toggle('active', view === 'editor');
    editorTab?.setAttribute('aria-pressed', String(view === 'editor'));
    previewTab?.classList.toggle('active', view === 'preview');
    previewTab?.setAttribute('aria-pressed', String(view === 'preview'));
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
  const setBackgroundInert = (isInert) => {
    document.querySelectorAll(BACKGROUND_LANDMARKS_SELECTOR).forEach(el => {
      if (isInert) el.setAttribute('inert', '');
      else el.removeAttribute('inert');
    });
  };

  const openLaunchModal = (opener = null) => {
    if (!launchOverlay) return;
    if (!launchOverlay.classList.contains('open')) {
      lastLaunchOpener = opener || document.activeElement;
    }
    setBackgroundInert(true);
    launchOverlay.classList.add('open');
    const focusTarget = document.getElementById('btn-start-sample') || getFocusableElements(launchOverlay)[0];
    focusTarget?.focus();
  };

  const closeLaunchModal = ({ restoreFocus = true } = {}) => {
    if (!launchOverlay?.classList.contains('open')) return;
    launchOverlay.classList.remove('open');
    if (!drawer?.classList.contains('open')) {
      setBackgroundInert(false);
    }
    if (restoreFocus && lastLaunchOpener && lastLaunchOpener !== document.body && lastLaunchOpener.isConnected) {
      lastLaunchOpener.focus();
    }
    lastLaunchOpener = null;
  };

  document.getElementById('btn-open-launch')?.addEventListener('click', (e) => openLaunchModal(e.currentTarget));
  document.getElementById('btn-close-launch')?.addEventListener('click', () => {
    persistCV();
    closeLaunchModal({ restoreFocus: true });
  });
  launchOverlay?.addEventListener('click', (e) => {
    if (e.target === launchOverlay) {
      persistCV();
      closeLaunchModal({ restoreFocus: true });
    }
  });

  const resetJobMatchResults = () => {
    const resultsBox = document.getElementById('job-analysis-results');
    if (resultsBox) resultsBox.style.display = 'none';
  };

  const hydrateAll = ({ clearJobMatch = true } = {}) => {
    ensureCVShape(currentCV);
    if (clearJobMatch) resetJobMatchResults();
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
    sectionEditors.setCurrentCV(currentCV);
    manualSpacingOverride = false;
    autoAppliedCompact = false;
    persistCV();
    hydrateAll({ clearJobMatch: true });
    closeLaunchModal({ restoreFocus: false });
    setActiveSection('identity', { focusInput: true });
    showToast('Guided mode ready — start with your name and target role.');
  });

  document.getElementById('btn-start-sample')?.addEventListener('click', () => {
    const activeCountry = currentCV?.meta?.targetCountry || 'DE';
    const activeLang = currentCV?.meta?.language || 'en';
    currentCV = createSampleCVForMarket(activeCountry, activeLang);
    sectionEditors.setCurrentCV(currentCV);
    manualSpacingOverride = false;
    autoAppliedCompact = false;
    persistCV();
    hydrateAll({ clearJobMatch: true });
    closeLaunchModal({ restoreFocus: false });
    setActiveSection('experience', { focusInput: true });
    const sampleLabel = activeCountry === 'RU' || activeLang === 'ru'
      ? 'Russian'
      : (activeCountry === 'UZ' || activeLang === 'uz' ? 'Uzbek' : 'European');
    showToast(`Sample ${sampleLabel} CV loaded.`);
  });

  const importFileInput = document.getElementById('import-json-file');
  document.getElementById('btn-start-import')?.addEventListener('click', () => importFileInput?.click());
  importFileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importCVFromJSON(file);
      currentCV = imported;
      sectionEditors.setCurrentCV(currentCV);
      manualSpacingOverride = false;
      autoAppliedCompact = false;
      persistCV();
      hydrateAll({ clearJobMatch: true });
      closeLaunchModal({ restoreFocus: false });
      setActiveSection('identity', { focusInput: true });
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
  const openDrawer = ({ focusTargetId = 'btn-close-drawer', opener = null } = {}) => {
    if (!drawer) return;
    if (!drawer.classList.contains('open')) {
      lastDrawerOpener = opener || document.activeElement;
    }
    updateATSReport();
    setBackgroundInert(true);
    drawer.removeAttribute('inert');
    drawer.classList.add('open');
    drawerBackdrop?.classList.add('active');
    const focusTarget = document.getElementById(focusTargetId) || getFocusableElements(drawer)[0];
    focusTarget?.focus();
  };
  const closeDrawer = ({ restoreFocus = true } = {}) => {
    if (!drawer?.classList.contains('open')) return;
    drawer.classList.remove('open');
    drawer.setAttribute('inert', '');
    drawerBackdrop?.classList.remove('active');
    if (!launchOverlay?.classList.contains('open')) {
      setBackgroundInert(false);
    }
    if (restoreFocus && lastDrawerOpener && lastDrawerOpener !== document.body && lastDrawerOpener.isConnected) {
      lastDrawerOpener.focus();
    }
    lastDrawerOpener = null;
  };

  document.getElementById('btn-ats-pill')?.addEventListener('click', (e) => {
    openDrawer({ focusTargetId: 'btn-close-drawer', opener: e.currentTarget });
  });
  document.getElementById('btn-open-matcher')?.addEventListener('click', (e) => {
    openDrawer({ focusTargetId: 'job-description-input', opener: e.currentTarget });
  });
  document.getElementById('btn-close-drawer')?.addEventListener('click', () => closeDrawer({ restoreFocus: true }));
  drawerBackdrop?.addEventListener('click', () => closeDrawer({ restoreFocus: true }));

  let isUpdatingJobMatch = false;
  const runJobMatchAnalysis = ({ silent = false, focusMissingIdx = null } = {}) => {
    const text = document.getElementById('job-description-input')?.value || '';
    const resultsBox = document.getElementById('job-analysis-results');
    if (!text.trim()) {
      if (resultsBox) resultsBox.style.display = 'none';
      if (!silent) showToast('Paste a job posting first to run keyword matching.');
      return;
    }

    isUpdatingJobMatch = true;
    try {
      const match = calculateJobMatch(currentCV, text);
      if (resultsBox) resultsBox.style.display = 'block';
      const badge = document.getElementById('job-match-badge');
      if (badge) {
        badge.textContent = `${match.matchPercentage}% Match`;
        badge.className = `ats-pill ${match.matchPercentage < 40 ? 'state-low' : match.matchPercentage < 70 ? 'state-warn' : ''}`.trim();
      }

      const matchedBox = document.getElementById('job-matched-tags');
      if (matchedBox) {
        matchedBox.innerHTML = match.matched.length > 0
          ? match.matched.map(m => `<span class="tag-interactive tag-matched">✓ ${escapeHTML(formatSkillKeyword(m))}</span>`).join('')
          : '<span style="font-size: 12px; color: var(--text-secondary);">No direct keyword matches yet.</span>';
      }

      const missingBox = document.getElementById('job-missing-tags');
      if (missingBox) {
        missingBox.innerHTML = match.missing.length > 0
          ? match.missing.map(m => {
            const label = formatSkillKeyword(m);
            return `<button type="button" class="tag-interactive tag-missing" data-add-kw="${escapeAttr(m)}" title="Add ${escapeAttr(label)} to skills">+ ${escapeHTML(label)}</button>`;
          }).join('')
          : '<span style="font-size: 12px; color: var(--success); font-weight: 600;">All detected qualifications are present.</span>';

        const missingBtns = Array.from(missingBox.querySelectorAll('[data-add-kw]'));
        missingBtns.forEach((pill, pillIdx) => {
          pill.addEventListener('click', () => {
            const kw = pill.getAttribute('data-add-kw') || '';
            const formatted = formatSkillKeyword(kw);
            currentCV.skills.technical = currentCV.skills.technical || [];
            if (!currentCV.skills.technical.map(s => s.toLowerCase()).includes(formatted.toLowerCase())) {
              currentCV.skills.technical.push(formatted);
              persistCV();
              renderSkillsChips();
              refreshCanvas();
            }
            runJobMatchAnalysis({ silent: true, focusMissingIdx: pillIdx });
          });
        });

        if (focusMissingIdx !== null) {
          if (missingBtns.length > 0) {
            missingBtns[Math.min(focusMissingIdx, missingBtns.length - 1)]?.focus();
          } else {
            document.getElementById('btn-analyze-job')?.focus();
          }
        }
      }

      const recsEl = document.getElementById('job-match-recs');
      if (recsEl) {
        const formattedRecs = match.recommendations.map(rec =>
          match.missing.length > 0
            ? `Consider incorporating these requested competencies where applicable: ${match.missing.slice(0, 5).map(formatSkillKeyword).join(', ')}.`
            : rec
        );
        recsEl.textContent = formattedRecs.join(' ');
      }
    } finally {
      isUpdatingJobMatch = false;
    }
  };

  syncJobMatchIfOpen = () => {
    if (isUpdatingJobMatch) return;
    const resultsBox = document.getElementById('job-analysis-results');
    if (resultsBox && resultsBox.style.display !== 'none') {
      runJobMatchAnalysis({ silent: true });
    }
  };

  document.getElementById('btn-analyze-job')?.addEventListener('click', () => {
    runJobMatchAnalysis({ silent: false });
  });

  // Initial Mount
  currentZoom = computeFitZoom();
  hydrateAll({ clearJobMatch: true });
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
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
