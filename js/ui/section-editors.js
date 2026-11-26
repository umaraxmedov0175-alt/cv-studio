import { CEFR_LEVELS } from '../model/cv-schema.js';
import { hasActionVerb, hasQuantifiableMetric } from '../engines/ats-scorer.js';

export function createSectionEditors(dependencies) {
  const {
    initialCV,
    persistCV,
    refreshCanvas,
    splitDateRange,
    formatInputDateRange,
    escapeHTML,
    escapeAttr,
    addNewExperience,
    addNewEducation,
    addNewLanguage,
    addNewProject,
    addNewCert,
    closeAllPopovers,
    setActivePopoverTrigger
  } = dependencies;
  let currentCV = initialCV;
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

  const analyzeExperienceBullets = (bullets) => {
    const clean = (bullets || []).map(b => String(b).trim()).filter(Boolean);
    const count = clean.length;
    if (count === 0) {
      return { state: 'neutral', text: 'One achievement per line — lead with outcomes' };
    }
    const joined = clean.join(' ');
    const hasMetrics = hasQuantifiableMetric(joined);
    const hasVerb = hasActionVerb(joined);
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
      const dateValue = formatInputDateRange(exp);
      return `
      <div class="subcard">
        <div class="subcard-head">
          <span class="subcard-title">${escapeHTML(exp.position || 'Position')} · ${escapeHTML(exp.company || 'Company')}</span>
          <button class="btn-remove-inline" data-del-exp="${idx}" type="button">Remove</button>
        </div>
        <div class="subcard-body">
          <div class="field-grid-2">
            <div class="field-group">
              <label class="field-label" for="exp-${idx}-position">Role title</label>
              <input type="text" id="exp-${idx}-position" class="field-input" data-exp-f="position" data-idx="${idx}" value="${escapeAttr(exp.position || '')}">
            </div>
            <div class="field-group">
              <label class="field-label" for="exp-${idx}-company">Company</label>
              <input type="text" id="exp-${idx}-company" class="field-input" data-exp-f="company" data-idx="${idx}" value="${escapeAttr(exp.company || '')}">
            </div>
          </div>
          <div class="field-grid-2">
            <div class="field-group">
              <label class="field-label" for="exp-${idx}-dateRange">Date range</label>
              <input type="text" id="exp-${idx}-dateRange" class="field-input" data-exp-f="dateRange" data-idx="${idx}" value="${escapeAttr(dateValue)}">
            </div>
            <div class="field-group">
              <label class="field-label" for="exp-${idx}-city">City / country</label>
              <input type="text" id="exp-${idx}-city" class="field-input" data-exp-f="city" data-idx="${idx}" value="${escapeAttr(exp.city || '')}">
            </div>
          </div>
          <div class="field-group">
            <label class="field-label" for="exp-${idx}-bullets">Achievements &amp; impact (1 per line)</label>
            <textarea id="exp-${idx}-bullets" class="field-input" data-exp-f="bullets" data-idx="${idx}" rows="3">${escapeHTML((exp.bullets || []).join('\n'))}</textarea>
          </div>
          <div class="bullet-coach-row">
            <span class="bullet-diag" data-bullet-diag="${idx}">
              <span class="diag-dot ${diag.state}" aria-hidden="true"></span>
              <span class="diag-text">${escapeHTML(diag.text)}</span>
            </span>
            <div class="bullet-coach-trigger-wrap">
              <button type="button" class="bullet-coach-trigger" data-toggle-bullet-popover="${idx}" aria-expanded="false">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                <span>Impact guide</span>
                <svg class="chevron-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
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
          const { startDate, endDate } = splitDateRange(inp.value);
          item.startDate = startDate;
          item.endDate = endDate;
          item.current = /^(present|heute|présent|current|now|aktuell)$/i.test(endDate);
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
        persistCV();
        refreshCanvas();
      });
    });

    container.querySelectorAll('[data-del-exp]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-del-exp'), 10);
        currentCV.experience.splice(idx, 1);
        persistCV();
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
        closeAllPopovers({ restoreFocus: false });
        if (willOpen && pop) {
          pop.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
          setActivePopoverTrigger(btn);
          const btnRect = btn.getBoundingClientRect();
          const popRect = pop.getBoundingClientRect();
          if (popRect.bottom > window.innerHeight - 48 && btnRect.top - popRect.height > 120) {
            pop.classList.add('pop-up');
          }
          if (popRect.left < 12) {
            pop.style.right = 'auto';
            pop.style.left = '0';
          }
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
        persistCV();
        refreshCanvas();
        closeAllPopovers({ restoreFocus: false });

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

    container.innerHTML = list.map((edu, idx) => {
      const dateValue = formatInputDateRange(edu);
      return `
      <div class="subcard">
        <div class="subcard-head">
          <span class="subcard-title">${escapeHTML(edu.degree || 'Degree')}</span>
          <button class="btn-remove-inline" data-del-edu="${idx}" type="button">Remove</button>
        </div>
        <div class="subcard-body">
          <div class="field-grid-2">
            <div class="field-group">
              <label class="field-label" for="edu-${idx}-degree">Degree / field</label>
              <input type="text" id="edu-${idx}-degree" class="field-input" data-edu-f="degree" data-idx="${idx}" value="${escapeAttr(edu.degree || '')}">
            </div>
            <div class="field-group">
              <label class="field-label" for="edu-${idx}-institution">Institution</label>
              <input type="text" id="edu-${idx}-institution" class="field-input" data-edu-f="institution" data-idx="${idx}" value="${escapeAttr(edu.institution || '')}">
            </div>
          </div>
          <div class="field-grid-2">
            <div class="field-group">
              <label class="field-label" for="edu-${idx}-dateRange">Dates</label>
              <input type="text" id="edu-${idx}-dateRange" class="field-input" data-edu-f="dateRange" data-idx="${idx}" value="${escapeAttr(dateValue)}">
            </div>
            <div class="field-group">
              <label class="field-label" for="edu-${idx}-grade">Honors / grade</label>
              <input type="text" id="edu-${idx}-grade" class="field-input" data-edu-f="grade" data-idx="${idx}" placeholder="e.g. 1.3 / First Class" value="${escapeAttr(edu.grade || '')}">
            </div>
          </div>
        </div>
      </div>
    `;
    }).join('');

    container.querySelectorAll('[data-edu-f]').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = parseInt(inp.getAttribute('data-idx'), 10);
        const f = inp.getAttribute('data-edu-f');
        const item = currentCV.education[idx];
        if (!item) return;

        if (f === 'dateRange') {
          const { startDate, endDate } = splitDateRange(inp.value);
          item.startDate = startDate;
          item.endDate = endDate;
        } else {
          item[f] = inp.value;
        }

        const headerTitle = inp.closest('.subcard')?.querySelector('.subcard-title');
        if (headerTitle) headerTitle.textContent = item.degree || 'Degree';

        persistCV();
        refreshCanvas();
      });
    });

    container.querySelectorAll('[data-del-edu]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-del-edu'), 10);
        currentCV.education.splice(idx, 1);
        persistCV();
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
        persistCV();
        renderSkillsChips();
        refreshCanvas();
      });
    });
  };

  const CEFR_SHORT_BADGE = {
    native: 'Native',
    C2: 'C2 · Mastery',
    C1: 'C1 · Fluent',
    B2: 'B2 · Upper-Int.',
    B1: 'B1 · Interm.',
    A2: 'A2 · Elem.',
    A1: 'A1 · Beginner'
  };
  const ORDERED_CEFR = [...CEFR_LEVELS].reverse();

  const resolveCEFRMatch = (levelStr) => {
    const val = String(levelStr || '').trim();
    return CEFR_LEVELS.find(l => l.label === val)
      || CEFR_LEVELS.find(l => val.toLowerCase().startsWith(l.code.toLowerCase()))
      || CEFR_LEVELS[2];
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

    container.innerHTML = langs.map((lang, idx) => {
      const matched = resolveCEFRMatch(lang.level);
      const badgeLabel = CEFR_SHORT_BADGE[matched.code] || matched.code;
      const langDisplay = lang.language?.trim() || `Language ${idx + 1}`;
      return `
      <div class="lang-pill-card" data-lang-card="${idx}">
        <div class="lang-card-top">
          <input type="text" id="lang-${idx}-name" class="field-input lang-name-input" aria-label="Language name" placeholder="Language (e.g. German)" data-lang-f="language" data-idx="${idx}" value="${escapeAttr(lang.language || '')}">
          <span class="lang-level-badge" data-lang-badge="${idx}">${escapeHTML(badgeLabel)}</span>
          <button class="btn-icon-remove" data-del-lang="${idx}" type="button" title="Remove language" aria-label="Remove ${escapeAttr(langDisplay)}">×</button>
        </div>
        <div class="cefr-track" role="radiogroup" aria-label="CEFR level for ${escapeAttr(langDisplay)}">
          ${ORDERED_CEFR.map(lvl => {
            const isSelected = matched.code === lvl.code;
            const shortCode = lvl.code === 'native' ? 'Native' : lvl.code;
            return `<button type="button" class="cefr-pill ${isSelected ? 'active' : ''}" role="radio" aria-checked="${isSelected}" tabindex="${isSelected ? '0' : '-1'}" data-set-cefr="${idx}" data-cefr-code="${escapeAttr(lvl.code)}" data-level-val="${escapeAttr(lvl.label)}">${shortCode}</button>`;
          }).join('')}
        </div>
        <div class="cefr-desc-caption" data-lang-desc="${idx}">${escapeHTML(matched.label)}</div>
      </div>
    `;
    }).join('');

    const selectCefrPill = (pill, { focusPill = false } = {}) => {
      const idx = parseInt(pill.getAttribute('data-set-cefr'), 10);
      const code = pill.getAttribute('data-cefr-code');
      const nextLevel = pill.getAttribute('data-level-val');
      const entry = currentCV.skills.languages[idx];
      if (!entry) return;

      entry.level = nextLevel;
      const card = container.querySelector(`[data-lang-card="${idx}"]`);
      card?.querySelectorAll('[data-set-cefr]').forEach(btn => {
        const active = btn === pill;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-checked', String(active));
        btn.setAttribute('tabindex', active ? '0' : '-1');
      });
      const badgeEl = container.querySelector(`[data-lang-badge="${idx}"]`);
      if (badgeEl) badgeEl.textContent = CEFR_SHORT_BADGE[code] || code;
      const descEl = container.querySelector(`[data-lang-desc="${idx}"]`);
      if (descEl) descEl.textContent = nextLevel;

      persistCV();
      refreshCanvas();
      if (focusPill) pill.focus();
    };

    container.querySelectorAll('[data-lang-f="language"]').forEach(el => {
      el.addEventListener('input', () => {
        const idx = parseInt(el.getAttribute('data-idx'), 10);
        if (currentCV.skills.languages[idx]) {
          currentCV.skills.languages[idx].language = el.value;
          const card = container.querySelector(`[data-lang-card="${idx}"]`);
          const track = card?.querySelector('.cefr-track');
          if (track) track.setAttribute('aria-label', `CEFR level for ${el.value.trim() || `Language ${idx + 1}`}`);
          persistCV();
          refreshCanvas();
        }
      });
    });

    container.querySelectorAll('[data-set-cefr]').forEach(pill => {
      pill.addEventListener('click', () => selectCefrPill(pill));
      pill.addEventListener('keydown', (e) => {
        const track = pill.closest('.cefr-track');
        if (!track) return;
        const pills = Array.from(track.querySelectorAll('[data-set-cefr]'));
        const idx = pills.indexOf(pill);
        if (idx < 0) return;

        let nextIdx = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIdx = (idx + 1) % pills.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIdx = (idx - 1 + pills.length) % pills.length;
        else if (e.key === 'Home') nextIdx = 0;
        else if (e.key === 'End') nextIdx = pills.length - 1;

        if (nextIdx >= 0) {
          e.preventDefault();
          selectCefrPill(pills[nextIdx], { focusPill: true });
        }
      });
    });

    container.querySelectorAll('[data-del-lang]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-del-lang'), 10);
        currentCV.skills.languages.splice(idx, 1);
        persistCV();
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
              <label class="field-label" for="proj-${idx}-name">Project name</label>
              <input type="text" id="proj-${idx}-name" class="field-input" data-proj-f="name" data-idx="${idx}" value="${escapeAttr(proj.name || '')}">
            </div>
            <div class="field-group">
              <label class="field-label" for="proj-${idx}-technologies">Technologies</label>
              <input type="text" id="proj-${idx}-technologies" class="field-input" data-proj-f="technologies" data-idx="${idx}" value="${escapeAttr(proj.technologies || '')}">
            </div>
          </div>
          <div class="field-group">
            <label class="field-label" for="proj-${idx}-description">Summary</label>
            <input type="text" id="proj-${idx}-description" class="field-input" data-proj-f="description" data-idx="${idx}" value="${escapeAttr(proj.description || '')}">
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
          persistCV();
          refreshCanvas();
        }
      });
    });

    container.querySelectorAll('[data-del-proj]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-del-proj'), 10);
        currentCV.projects.splice(idx, 1);
        persistCV();
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
            <label class="field-label" for="cert-${idx}-name">Credential name</label>
            <input type="text" id="cert-${idx}-name" class="field-input" data-cert-f="name" data-idx="${idx}" value="${escapeAttr(cert.name || '')}">
          </div>
          <div class="field-grid-2">
            <div class="field-group">
              <label class="field-label" for="cert-${idx}-issuer">Issuer</label>
              <input type="text" id="cert-${idx}-issuer" class="field-input" data-cert-f="issuer" data-idx="${idx}" value="${escapeAttr(cert.issuer || '')}">
            </div>
            <div class="field-group">
              <label class="field-label" for="cert-${idx}-year">Year</label>
              <input type="text" id="cert-${idx}-year" class="field-input" data-cert-f="year" data-idx="${idx}" value="${escapeAttr(cert.year || '')}">
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
          persistCV();
          refreshCanvas();
        }
      });
    });

    container.querySelectorAll('[data-del-cert]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-del-cert'), 10);
        currentCV.certifications.splice(idx, 1);
        persistCV();
        renderCertificationsCards();
        refreshCanvas();
      });
    });
  };


  return {
    renderExperienceCards,
    renderEducationCards,
    renderSkillsChips,
    renderLanguageCards,
    renderProjectsCards,
    renderCertificationsCards,
    setCurrentCV(nextCV) {
      currentCV = nextCV;
    }
  };
}