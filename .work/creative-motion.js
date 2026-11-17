      // One-time reveals use a single observer and never delay keyboard access.
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const revealTargets = $$('.section-head, .project-copy, .product-frame, .case-study, .experience-aside, .experience-item, .about-top, .skills-layout, .learning-grid, .contact-layout > div, .contact-form');
      const revealElement = (element, instant = false) => {
        if (instant) element.classList.add('reveal-instant');
        element.classList.remove('reveal-pending');
      };
      if ('IntersectionObserver' in window && !reducedMotion.matches) {
        const reveals = new IntersectionObserver((entries) => {
          entries.forEach(({ target, isIntersecting }) => {
            if (!isIntersecting) return;
            revealElement(target);
            reveals.unobserve(target);
          });
        }, { rootMargin: '0px 0px -24px 0px', threshold: 0 });
        revealTargets.forEach((element) => {
          if (element.getBoundingClientRect().top < window.innerHeight || element.contains(document.activeElement)) return;
          element.classList.add('motion-reveal', 'reveal-pending');
          reveals.observe(element);
        });
      }
      document.addEventListener('focusin', (event) => {
        const target = event.target.closest('.reveal-pending');
        if (target) revealElement(target, true);
      });
      reducedMotion.addEventListener('change', () => {
        if (reducedMotion.matches) $$('.reveal-pending').forEach((element) => revealElement(element, true));
      });

      // The small desktop schematic sleeps when it leaves the screen or tab.
      const heroArt = $('[data-hero-art]');
      const fineMotion = window.matchMedia('(min-width: 851px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
      let artVisible = heroArt.getBoundingClientRect().bottom > 0 && heroArt.getBoundingClientRect().top < window.innerHeight;
      const updateArtMotion = () => heroArt.classList.toggle('is-in-view', artVisible && fineMotion.matches && !document.hidden);
      if ('IntersectionObserver' in window) {
        const artObserver = new IntersectionObserver(([entry]) => { artVisible = entry.isIntersecting; updateArtMotion(); });
        artObserver.observe(heroArt);
      }
      fineMotion.addEventListener('change', updateArtMotion);
      document.addEventListener('visibilitychange', updateArtMotion);
      updateArtMotion();

      // A transform-only line quietly shows progress through the full portfolio.
      const progressFill = $('.scroll-progress > span');
      let progressFrame = 0;
      const requestProgress = () => {
        if (progressFrame) return;
        progressFrame = requestAnimationFrame(() => {
          progressFrame = 0;
          const distance = document.documentElement.scrollHeight - window.innerHeight;
          const progress = distance > 0 ? Math.max(0, Math.min(1, window.scrollY / distance)) : 0;
          progressFill.style.transform = `scaleX(${progress})`;
        });
      };
      window.addEventListener('scroll', requestProgress, { passive: true });
      window.addEventListener('resize', requestProgress);
      if ('ResizeObserver' in window) new ResizeObserver(requestProgress).observe(document.body);
      requestProgress();
