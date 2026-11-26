/**
 * European CV Studio — Landing Page Motion & Interaction Controller
 * Uses only transform and opacity; respects prefers-reduced-motion; pauses offscreen.
 */
(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Hero word-by-word reveal + 3-sheet rotation + desktop cursor parallax
  const heroTitle = document.getElementById('hero-title');
  if (heroTitle) {
    const words = heroTitle.querySelectorAll('.word');
    words.forEach((word, idx) => {
      word.style.transitionDelay = `${idx * 65}ms`;
    });
    requestAnimationFrame(() => heroTitle.classList.add('is-revealed'));
  }

  const heroStage = document.getElementById('hero-stage');
  const heroCards = heroStage ? Array.from(heroStage.querySelectorAll('[data-hero-card]')) : [];
  const positions = ['sheet-pos-front', 'sheet-pos-mid', 'sheet-pos-back'];
  let heroRotationOffset = 0;
  let heroTimer = null;
  let heroVisible = true;

  function applyHeroPositions() {
    heroCards.forEach((card, i) => {
      positions.forEach(cls => card.classList.remove(cls));
      const posClass = positions[(i + heroRotationOffset) % positions.length];
      card.classList.add(posClass);
    });
  }

  if (!reducedMotion && heroCards.length === 3) {
    heroTimer = setInterval(() => {
      if (!heroVisible) return;
      heroRotationOffset = (heroRotationOffset + 1) % 3;
      applyHeroPositions();
    }, 3800);

    if (window.matchMedia('(pointer: fine)').matches && heroStage) {
      let rafId = null;
      heroStage.addEventListener('pointermove', (e) => {
        if (!heroVisible || rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          const rect = heroStage.getBoundingClientRect();
          const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
          const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
          heroStage.style.transform = `translate3d(${(nx * 6).toFixed(1)}px, ${(ny * 6).toFixed(1)}px, 0)`;
        });
      });
      heroStage.addEventListener('pointerleave', () => {
        heroStage.style.transform = 'translate3d(0, 0, 0)';
      });
    }
  }

  // 2. Market Switcher (DE / UK / FR / NL tabs with ArrowLeft/Right keyboard nav)
  const marketTabs = Array.from(document.querySelectorAll('[data-market]'));
  const marketPanels = Array.from(document.querySelectorAll('[data-market-panel]'));
  const marketImgs = Array.from(document.querySelectorAll('[data-market-img]'));

  function selectMarket(code, focusTab) {
    marketTabs.forEach((tab) => {
      const active = tab.dataset.market === code;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.setAttribute('tabindex', active ? '0' : '-1');
      if (active && focusTab) tab.focus();
    });
    marketPanels.forEach((panel) => {
      const active = panel.dataset.marketPanel === code;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    marketImgs.forEach((img) => {
      img.classList.toggle('is-active', img.dataset.marketImg === code);
    });
  }

  marketTabs.forEach((tab, idx) => {
    tab.addEventListener('click', () => selectMarket(tab.dataset.market, false));
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const next = marketTabs[(idx + dir + marketTabs.length) % marketTabs.length];
        selectMarket(next.dataset.market, true);
      }
    });
  });

  // 3. IntersectionObserver for ATS counter, chip stagger, Privacy, Steps, Final Print-Up, Marquee & Hero pause
  const atsVisual = document.getElementById('ats-visual');
  const atsCounter = document.getElementById('ats-counter');
  const chipCloud = document.getElementById('ats-chip-cloud');
  if (chipCloud) {
    Array.from(chipCloud.children).forEach((chip, idx) => {
      chip.style.transitionDelay = `${idx * 70}ms`;
    });
  }

  let atsAnimated = false;
  function animateAtsCounter() {
    if (atsAnimated || !atsCounter) return;
    atsAnimated = true;
    const target = Number(atsCounter.dataset.target || 97);
    if (reducedMotion) {
      atsCounter.textContent = String(target);
      return;
    }
    const start = performance.now();
    const dur = 850;
    function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      atsCounter.textContent = String(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const marqueeWrap = document.getElementById('portrait-marquee');
  const stepsRail = document.getElementById('steps-rail');
  const privacyPhoto = document.querySelector('.privacy-photo');
  const printReveal = document.getElementById('print-sheet-reveal');

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        if (el === heroStage) {
          heroVisible = entry.isIntersecting;
          return;
        }
        if (el === marqueeWrap) {
          el.classList.toggle('is-paused', !entry.isIntersecting);
          return;
        }
        if (entry.isIntersecting) {
          el.classList.add('is-inview');
          if (el === atsVisual) animateAtsCounter();
          io.unobserve(el);
        }
      });
    }, { threshold: 0.18 });

    [heroStage, marqueeWrap, atsVisual, stepsRail, privacyPhoto, printReveal].forEach((el) => {
      if (el) io.observe(el);
    });
  } else {
    [atsVisual, stepsRail, privacyPhoto, printReveal].forEach((el) => el?.classList.add('is-inview'));
    animateAtsCounter();
  }

  // 4. Desktop subtle scroll-driven horizontal glide on Layouts gallery (transform only)
  const layoutsSection = document.getElementById('layouts');
  const layoutsTrack = document.getElementById('layouts-track');
  if (!reducedMotion && layoutsSection && layoutsTrack) {
    let glideRaf = null;
    const updateGlide = () => {
      glideRaf = null;
      if (window.innerWidth < 1024) {
        layoutsTrack.style.transform = '';
        return;
      }
      const rect = layoutsSection.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      if (rect.bottom < 0 || rect.top > vh) return;
      const progress = Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height)));
      const shift = (0.5 - progress) * 48;
      layoutsTrack.style.transform = `translate3d(${shift.toFixed(1)}px, 0, 0)`;
    };
    window.addEventListener('scroll', () => {
      if (!glideRaf) glideRaf = requestAnimationFrame(updateGlide);
    }, { passive: true });
    window.addEventListener('resize', () => {
      if (!glideRaf) glideRaf = requestAnimationFrame(updateGlide);
    }, { passive: true });
  }
})();
