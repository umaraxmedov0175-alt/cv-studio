/**
 * Unit Tests for Direct-Manipulation Preview Renderer
 */

import { renderCVPreview } from '../js/components/preview-renderer.js';
import { createEmptyCV, createSampleEuropeanCV, TEMPLATE_IDS } from '../js/model/cv-schema.js';

export function runPreviewRendererTests(assert) {
  assert.suite('Preview Renderer & XSS Sanitization Tests');

  assert.test('escapes XSS payloads across all CV sections without injecting script or event elements', () => {
    const cv = createSampleEuropeanCV();
    const xssImg = '<img src=x onerror="window.__xssTriggered=true">';
    const xssScript = '<script>window.__xssTriggered=true</script>';

    cv.meta.sectionOrder = ['summary', 'experience', 'education', 'skills', 'languages', 'projects', 'certifications'];
    cv.personal.firstName = `Alex${xssScript}`;
    cv.personal.lastName = `Wright${xssImg}`;
    cv.personal.title = `Architect${xssImg}`;
    cv.personal.email = `a@b.com${xssImg}`;
    cv.personal.phone = `+49${xssImg}`;
    cv.personal.city = `Berlin${xssImg}`;
    cv.personal.birthDate = `01.01.1990${xssImg}`;
    cv.personal.nationality = `DE${xssImg}`;
    cv.personal.linkedin = `linkedin.com/in/x${xssImg}`;
    cv.summary = `Summary ${xssScript} ${xssImg}`;
    cv.experience = [{
      position: `Lead ${xssImg}`,
      company: `Corp ${xssImg}`,
      city: `Munich ${xssImg}`,
      startDate: `01/2020${xssImg}`,
      endDate: `01/2024${xssImg}`,
      current: false,
      bullets: [`Built ${xssScript} ${xssImg}`],
      technologies: [`JS${xssImg}`]
    }];
    cv.education = [{
      degree: `MSc ${xssImg}`,
      institution: `TU ${xssImg}`,
      city: `Berlin ${xssImg}`,
      startDate: `2015${xssImg}`,
      endDate: `2017${xssImg}`,
      grade: `1.0${xssImg}`
    }];
    cv.skills.technical = [`TypeScript${xssImg}`];
    cv.skills.languages = [{ language: `German${xssImg}`, level: `C1${xssImg}` }];
    cv.projects = [{
      name: `Proj${xssImg}`,
      description: `Desc${xssScript}`,
      technologies: `TS${xssImg}`,
      year: `2024${xssImg}`
    }];
    cv.certifications = [{
      name: `Cert${xssImg}`,
      issuer: `Issuer${xssScript}`,
      year: `2025${xssImg}`
    }];
    cv.signature = {
      place: `Hamburg${xssImg}`,
      date: `25.11.2026${xssImg}`,
      signeeName: `Alex${xssScript}`
    };

    const container = document.createElement('div');
    renderCVPreview(cv, container);

    assert.equal(container.querySelectorAll('script').length, 0, 'no <script> elements injected');
    assert.equal(container.querySelectorAll('img[onerror]').length, 0, 'no <img onerror> elements injected');
    assert.notOk(window.__xssTriggered, 'XSS payload did not execute');
    assert.ok(container.textContent.includes('<script>'), 'escaped script payload rendered safely as visible text');
  });

  assert.test('blocks unsafe photoUrl schemes (javascript:, data:text/html, data:image/svg+xml) while allowing safe PNG data URLs', () => {
    const unsafeUrls = [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+PC9zdmc+'
    ];

    for (const url of unsafeUrls) {
      const cv = createSampleEuropeanCV();
      cv.personal.photoUrl = url;
      const container = document.createElement('div');
      renderCVPreview(cv, container);
      assert.equal(container.querySelectorAll('img').length, 0, `blocked unsafe photoUrl: ${url}`);
      assert.ok(container.querySelector('.photo-slot-empty.no-print'), `renders safe empty photo slot for blocked URL: ${url}`);
    }

    const safeCv = createSampleEuropeanCV();
    safeCv.personal.photoUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const safeContainer = document.createElement('div');
    renderCVPreview(safeCv, safeContainer);
    const img = safeContainer.querySelector('.photo-slot img');
    assert.ok(img, 'renders <img> for safe data:image/png;base64 URL');
    assert.ok(img.getAttribute('src').startsWith('data:image/png;base64,'), 'preserves safe PNG data URI');
  });

  assert.test('renders all 3 templates (Frankfurt, Zurich, Paris including personal.linkedin) and spacing classes', () => {
    const cv = createSampleEuropeanCV();
    const container = document.createElement('div');

    // Frankfurt DIN 5008 + compact spacing
    cv.meta.template = TEMPLATE_IDS.GERMAN_DIN;
    cv.meta.spacing = 'compact';
    renderCVPreview(cv, container);
    assert.ok(container.classList.contains('template-german-din-5008'), 'applies Frankfurt template class');
    assert.ok(container.classList.contains('spacing-compact'), 'applies spacing-compact class');
    assert.ok(container.querySelector('.din-signature-block'), 'Frankfurt renders DIN signature block');
    assert.ok(container.querySelector('.photo-slot-empty.no-print'), 'Frankfurt renders .photo-slot-empty.no-print when no photo');

    // Zurich Minimal Swiss + spacious spacing
    cv.meta.template = TEMPLATE_IDS.MINIMAL_SWISS;
    cv.meta.spacing = 'spacious';
    renderCVPreview(cv, container);
    assert.ok(container.classList.contains('template-minimal-swiss'), 'applies Zurich template class');
    assert.ok(container.classList.contains('spacing-spacious'), 'applies spacing-spacious class');
    assert.ok(container.querySelector('.swiss-header'), 'Zurich renders .swiss-header');
    assert.notOk(container.querySelector('.din-signature-block'), 'Zurich omits DIN signature block');

    // Paris Modern European + normal spacing + personal.linkedin
    cv.meta.template = TEMPLATE_IDS.MODERN_EUROPEAN;
    cv.meta.spacing = 'normal';
    cv.personal.linkedin = 'linkedin.com/in/alexwright-dev';
    renderCVPreview(cv, container);
    assert.ok(container.classList.contains('template-modern-european'), 'applies Paris template class');
    assert.notOk(container.classList.contains('spacing-normal'), 'normal spacing omits spacing-* modifier');
    assert.ok(container.querySelector('[data-bind="personal.linkedin"]'), 'Paris renders personal.linkedin in header');
    assert.ok(container.textContent.includes('linkedin.com/in/alexwright-dev'), 'Paris shows LinkedIn text');
  });

  assert.test('applies localized headings and lang attribute for en, de, and fr', () => {
    const cv = createSampleEuropeanCV();
    const container = document.createElement('div');

    cv.meta.language = 'en';
    cv.meta.targetCountry = 'DE';
    renderCVPreview(cv, container);
    assert.equal(container.getAttribute('lang'), 'en', 'sets lang="en"');
    assert.ok(container.textContent.includes('Professional Experience'), 'EN experience heading');

    cv.meta.language = 'de';
    renderCVPreview(cv, container);
    assert.equal(container.getAttribute('lang'), 'de', 'sets lang="de"');
    assert.ok(container.textContent.includes('Berufserfahrung'), 'DE experience heading');
    assert.ok(container.textContent.includes('Sprachkenntnisse (GER / CEFR)'), 'DE languages heading');

    cv.meta.language = 'fr';
    renderCVPreview(cv, container);
    assert.equal(container.getAttribute('lang'), 'fr', 'sets lang="fr"');
    assert.ok(container.textContent.includes('Expériences professionnelles'), 'FR experience heading');
    assert.ok(container.textContent.includes('Langues (CECRL)'), 'FR languages heading');
  });

  assert.test('UK compliance suppresses photo, birthDate, nationality, and signature block in preview', () => {
    const cv = createSampleEuropeanCV();
    cv.meta.template = TEMPLATE_IDS.GERMAN_DIN;
    cv.meta.targetCountry = 'UK';
    cv.meta.language = 'en';
    cv.meta.showPhoto = true;
    cv.meta.includeSignatureBlock = true;

    const container = document.createElement('div');
    renderCVPreview(cv, container);

    assert.equal(container.querySelectorAll('.photo-slot').length, 0, 'UK hides photo slot');
    assert.equal(container.querySelectorAll('[data-bind="personal.birthDate"]').length, 0, 'UK hides birthDate');
    assert.equal(container.querySelectorAll('[data-bind="personal.nationality"]').length, 0, 'UK hides nationality');
    assert.equal(container.querySelectorAll('.din-signature-block').length, 0, 'UK hides signature block');
    assert.ok(container.textContent.includes('Employment History'), 'UK uses Employment History heading');
  });

  assert.test('Frankfurt projects render tech stack in .proj-tech-line without colliding with .entry-dates', () => {
    const cv = createSampleEuropeanCV();
    cv.meta.template = TEMPLATE_IDS.GERMAN_DIN;
    cv.meta.sectionOrder = ['projects', 'experience', 'education', 'skills', 'languages', 'summary'];
    cv.projects = [{
      id: 'proj-1',
      name: 'OpenCV-Engine',
      description: 'Automated CV compliance engine',
      technologies: 'TypeScript, TailwindCSS, Playwright, WebAssembly',
      year: '2026'
    }];

    const container = document.createElement('div');
    renderCVPreview(cv, container);

    const projSection = container.querySelector('section[data-section-id="projects"]');
    assert.ok(projSection, 'projects section rendered');
    const dateCell = projSection.querySelector('.entry-dates');
    const techLine = projSection.querySelector('.proj-tech-line');
    assert.ok(dateCell, 'has .entry-dates cell');
    assert.equal(dateCell.textContent.trim(), '2026', 'entry-dates holds year/tag, not technologies');
    assert.ok(techLine, 'renders .proj-tech-line');
    assert.equal(techLine.textContent.trim(), 'TypeScript, TailwindCSS, Playwright, WebAssembly', 'tech stack placed in .proj-tech-line');
  });

  assert.test('renders accessible button triggers, role="textbox", aria-labels, and omits dangling dash on empty dates', () => {
    const cv = createEmptyCV();
    cv.experience = [{
      position: 'Engineer',
      company: 'Acme',
      startDate: '',
      endDate: '',
      current: false,
      bullets: ['Delivered feature']
    }];
    cv.education = [{
      degree: 'B.Sc.',
      institution: 'Uni',
      startDate: '',
      endDate: ''
    }];

    const container = document.createElement('div');
    renderCVPreview(cv, container);

    const addExpBtn = container.querySelector('#btn-trigger-add-exp');
    assert.ok(addExpBtn, '#btn-trigger-add-exp exists');
    assert.equal(addExpBtn.tagName, 'BUTTON', '#btn-trigger-add-exp is a <button>');
    assert.equal(addExpBtn.getAttribute('type'), 'button', 'has type="button"');
    assert.ok(addExpBtn.classList.contains('add-item-trigger'), 'has add-item-trigger class');

    const editables = Array.from(container.querySelectorAll('[contenteditable="true"]'));
    assert.ok(editables.length > 0, 'has contenteditable elements');
    const allAccessible = editables.every(el =>
      el.getAttribute('role') === 'textbox' &&
      Boolean(el.getAttribute('aria-label')?.trim())
    );
    assert.ok(allAccessible, 'every [contenteditable="true"] has role="textbox" and non-empty aria-label');
    const bulletItem = container.querySelector('ul.bullet-list > li');
    assert.ok(bulletItem, 'achievement is inside a semantic list item');
    assert.notOk(bulletItem.hasAttribute('role'), 'list item keeps its native list semantics');
    assert.ok(bulletItem.querySelector('span[contenteditable="true"][role="textbox"]'),
      'achievement text remains directly editable inside the list item');

    const expDate = container.querySelector('[data-exp-field="dateRange"]');
    const eduDate = container.querySelector('[data-edu-field="dateRange"]');
    assert.equal(expDate.textContent.trim(), '', 'empty experience dates do not render dangling " – "');
    assert.equal(eduDate.textContent.trim(), '', 'empty education dates do not render dangling " – "');
  });

  assert.test('renders Russian and Uzbek headings, test strings, opt-in fields, and proper lang attributes', () => {
    const ruCv = createEmptyCV();
    ruCv.meta.targetCountry = 'RU';
    ruCv.meta.language = 'ru';
    ruCv.personal.firstName = 'Щукин';
    ruCv.personal.lastName = 'Ёлкин';
    ruCv.personal.patronymic = 'Юрьевич';
    ruCv.personal.telegram = '@shchukin';
    ruCv.personal.desiredSalary = '200 000 ₽';
    ruCv.summary = 'Объём съёмки: Щукин, Юрьев, Ёлкин. Электроинженер. Жизнь, шёлк, чаща.';
    ruCv.skills.languages = [{ language: 'Русский', level: 'Native / Bilingual' }];

    const container = document.createElement('div');
    renderCVPreview(ruCv, container);
    assert.equal(container.getAttribute('lang'), 'ru', 'sets lang="ru"');
    assert.ok(container.textContent.includes('Опыт работы'), 'renders Russian experience heading');
    assert.ok(container.textContent.includes('Родной'), 'renders Родной for Native language level');
    assert.notOk(container.textContent.includes('Юрьевич'), 'hides patronymic when opt-in toggle is off');
    assert.notOk(container.textContent.includes('200 000 ₽'), 'hides desired salary when opt-in toggle is off');

    ruCv.meta.showPatronymic = true;
    ruCv.meta.showSalary = true;
    renderCVPreview(ruCv, container);
    assert.ok(container.textContent.includes('Юрьевич'), 'renders patronymic when toggled on');
    assert.ok(container.textContent.includes('200 000 ₽'), 'renders desired salary when toggled on');

    const uzCv = createEmptyCV();
    uzCv.meta.targetCountry = 'UZ';
    uzCv.meta.language = 'uz';
    uzCv.summary = 'Oʻzbekiston Respublikasi, Gʻijduvon, Toʻraqoʻrgʻon, maʼlumot, Shahrisabz.';
    uzCv.skills.languages = [{ language: 'Oʻzbek tili', level: 'Native / Bilingual' }];
    renderCVPreview(uzCv, container);
    assert.equal(container.getAttribute('lang'), 'uz', 'sets lang="uz"');
    assert.ok(container.textContent.includes('Ish tajribasi'), 'renders Uzbek experience heading');
    assert.ok(container.textContent.includes('Ona tili'), 'renders Ona tili for Native language level');
    assert.ok(container.textContent.includes('maʼlumot'), 'preserves U+02BC in Uzbek text');
  });
}
