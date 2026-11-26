/**
 * European CV Studio — Phase 2 Landing Page Motion & Interaction Controller
 * Hero preserved intact; below-hero uses IntersectionObserver, transform/opacity/clip-path only.
 */
(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 0. Hero word-by-word reveal + 3-sheet rotation + desktop cursor parallax (Unchanged)
  const heroTitle = document.getElementById('hero-title');
  if (heroTitle) {
    heroTitle.querySelectorAll('.word').forEach((word, idx) => {
      word.style.transitionDelay = `${idx * 65}ms`;
    });
    requestAnimationFrame(() => heroTitle.classList.add('is-revealed'));
  }

  const heroStage = document.getElementById('hero-stage');
  const heroCards = heroStage ? Array.from(heroStage.querySelectorAll('[data-hero-card]')) : [];
  const positions = ['sheet-pos-front', 'sheet-pos-mid', 'sheet-pos-back'];
  let heroRotationOffset = 0;
  let heroVisible = true;

  function applyHeroPositions() {
    heroCards.forEach((card, i) => {
      positions.forEach(cls => card.classList.remove(cls));
      card.classList.add(positions[(i + heroRotationOffset) % positions.length]);
    });
  }

  if (!reducedMotion && heroCards.length === 3) {
    setInterval(() => {
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

  // 2. Expanding City Panels (hover, keyboard focus, click/tap)
  const cityPanels = Array.from(document.querySelectorAll('[data-city-panel]'));
  function activateCityPanel(target) {
    cityPanels.forEach((panel) => {
      const isMatch = panel === target;
      panel.classList.toggle('is-active', isMatch);
      panel.setAttribute('aria-expanded', String(isMatch));
    });
  }
  cityPanels.forEach((panel) => {
    panel.addEventListener('mouseenter', () => activateCityPanel(panel));
    panel.addEventListener('focus', () => activateCityPanel(panel));
    panel.addEventListener('click', () => activateCityPanel(panel));
    panel.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activateCityPanel(panel);
      }
    });
  });

  // 5. ATS Counter + Staggered Chips
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

  // 6. How It Works: Sticky Crossfade & Progress Line
  const stepItems = Array.from(document.querySelectorAll('[data-step-item]'));
  const stepPhotos = Array.from(document.querySelectorAll('[data-step-photo]'));
  const stepsFill = document.getElementById('steps-line-fill');
  const stepBadge = document.getElementById('how-step-badge');

  function setActiveStep(numStr) {
    const num = Number(numStr) || 1;
    stepItems.forEach((s) => s.classList.toggle('is-active', Number(s.dataset.stepItem) === num));
    stepPhotos.forEach((p) => p.classList.toggle('is-active', Number(p.dataset.stepPhoto) === num));
    if (stepsFill) {
      stepsFill.style.transform = `scaleY(${(num / 3).toFixed(2)})`;
    }
    if (stepBadge) {
      stepBadge.textContent = `Step 0${num} / 03`;
    }
  }

  stepItems.forEach((item) => {
    item.addEventListener('click', () => setActiveStep(item.dataset.stepItem));
  });

  // IntersectionObserver for reveals, sticky steps, nav highlight, and mobile sticky CTA
  const printReveal = document.getElementById('print-sheet-reveal');
  const revealTargets = Array.from(document.querySelectorAll('[data-reveal]'));
  const mobileCta = document.getElementById('mobile-sticky-cta');
  const finalSection = document.getElementById('start');
  const navLinks = Array.from(document.querySelectorAll('[data-nav-section]'));
  const trackedSections = ['markets', 'layouts', 'ats', 'faq']
    .map(id => document.getElementById(id))
    .filter(Boolean);

  let heroOut = false;
  let finalIn = false;
  function syncMobileCta() {
    if (!mobileCta) return;
    mobileCta.hidden = !(heroOut && !finalIn);
  }

  if ('IntersectionObserver' in window) {
    const revealIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        if (entry.isIntersecting) {
          el.classList.add('is-inview');
          if (el === atsVisual) animateAtsCounter();
          revealIO.unobserve(el);
        }
      });
    }, { threshold: 0.05 });

    [atsVisual, printReveal, ...revealTargets].forEach((el) => {
      if (el) revealIO.observe(el);
    });

    const heroSection = document.getElementById('hero');
    const visibilityIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === heroStage) {
          heroVisible = entry.isIntersecting;
        } else if (entry.target === heroSection) {
          heroOut = !entry.isIntersecting;
          syncMobileCta();
        } else if (entry.target === finalSection) {
          finalIn = entry.isIntersecting;
          syncMobileCta();
        }
      });
    }, { threshold: 0.08 });

    [heroStage, heroSection, finalSection].forEach((el) => {
      if (el) visibilityIO.observe(el);
    });

    const stepIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveStep(entry.target.dataset.stepItem);
        }
      });
    }, { rootMargin: '-35% 0px -45% 0px', threshold: 0.1 });
    stepItems.forEach((el) => stepIO.observe(el));

    const navIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach((a) => {
            const match = a.dataset.navSection === id;
            a.classList.toggle('is-current', match);
            if (match) a.setAttribute('aria-current', 'location');
            else a.removeAttribute('aria-current');
          });
        }
      });
    }, { rootMargin: '-30% 0px -55% 0px', threshold: 0.05 });
    trackedSections.forEach((el) => navIO.observe(el));
  } else {
    [atsVisual, printReveal, ...revealTargets].forEach((el) => el?.classList.add('is-inview'));
    animateAtsCounter();
  }

  // Subtle masked parallax on ATS mood photo (transform only, disabled under reduced motion)
  const parallaxImg = document.querySelector('.parallax-img');
  if (!reducedMotion && parallaxImg && atsVisual) {
    let pRaf = null;
    const onScroll = () => {
      pRaf = null;
      const rect = atsVisual.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      if (rect.bottom < 0 || rect.top > vh) return;
      const factor = window.innerWidth < 768 ? 14 : 32;
      const prog = ((vh - rect.top) / (vh + rect.height)) - 0.5;
      parallaxImg.style.transform = `scale(1.08) translate3d(0, ${(prog * factor).toFixed(1)}px, 0)`;
    };
    window.addEventListener('scroll', () => {
      if (!pRaf) pRaf = requestAnimationFrame(onScroll);
    }, { passive: true });
  }
})();
