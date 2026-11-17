      const menuButton = $('[data-menu-toggle]');
      const nav = $('#primary-nav');
      const mobileViewport = window.matchMedia('(max-width: 640px)');
      const views = new Map($$('#main > section[id]').map((section) => [section.id, section]));
      const viewTitles = { home: 'Melvin Gamana Jr. — Software Engineer', work: 'Work — Melvin Gamana Jr.', experience: 'Experience — Melvin Gamana Jr.', about: 'About — Melvin Gamana Jr.', skills: 'Skills — Melvin Gamana Jr.', contact: 'Contact — Melvin Gamana Jr.' };
      let lastViewUrl = '';
      let viewTimer;
      const closeMenu = (restoreFocus = false) => {
        nav.classList.remove('is-open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Open navigation');
        if (restoreFocus) menuButton.focus();
      };
      const resolveView = (hash) => {
        let id;
        try { id = decodeURIComponent(hash.replace(/^#/, '')); } catch { return null; }
        if (!id || id === 'top') return { section: views.get('home'), target: views.get('home') };
        if (id === 'main') return { skip: true };
        const target = document.getElementById(id);
        const section = target?.closest('#main > section');
        return section && views.has(section.id) ? { section, target } : null;
      };
      const showView = (resolved, { focus = false, animate = false } = {}) => {
        const section = resolved?.section || views.get('home');
        clearTimeout(viewTimer);
        $$('dialog[open]').forEach((dialog) => dialog.close());
        views.forEach((candidate) => {
          const selected = candidate === section;
          candidate.classList.remove('view-enter');
          candidate.hidden = !selected;
          candidate.classList.toggle('is-active', selected);
        });
        document.documentElement.dataset.view = section.id;
        document.body.dataset.view = section.id;
        document.title = viewTitles[section.id];
        $$('a', nav).forEach((link) => {
          if (resolveView(link.hash)?.section === section) link.setAttribute('aria-current', 'page');
          else link.removeAttribute('aria-current');
        });
        closeMenu();
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        if (animate) {
          section.classList.add('view-enter');
          viewTimer = setTimeout(() => section.classList.remove('view-enter'), 220);
        }
        if (focus) {
          const heading = $('h1, h2', section) || section;
          let target = resolved?.target === section ? heading : resolved?.target || heading;
          if (!target.getClientRects().length) target = heading;
          if (!target.matches('a[href], button, input, textarea, select, [tabindex]')) target.tabIndex = -1;
          target.focus({ preventScroll: true });
        }
        lastViewUrl = location.href;
      };
      menuButton.addEventListener('click', () => {
        const open = menuButton.getAttribute('aria-expanded') !== 'true';
        nav.classList.toggle('is-open', open);
        menuButton.setAttribute('aria-expanded', String(open));
        menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true);
      });
      document.addEventListener('pointerdown', (event) => {
        if (!event.target.closest('.site-header')) closeMenu();
      });
      mobileViewport.addEventListener('change', () => closeMenu());
      document.addEventListener('click', (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a[href]');
        if (!link || link.hasAttribute('download') || (link.target && link.target.toLowerCase() !== '_self')) return;
        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search || !link.getAttribute('href').includes('#')) return;
        const resolved = resolveView(url.hash);
        if (!resolved) return;
        event.preventDefault();
        if (resolved.skip) {
          closeMenu();
          $('#main').tabIndex = -1;
          $('#main').focus({ preventScroll: true });
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          return;
        }
        if (url.href !== location.href) history.pushState(null, '', url.href);
        showView(resolved, { focus: true, animate: true });
      });
      const handleViewHistory = () => {
        if (lastViewUrl === location.href) return;
        const resolved = resolveView(location.hash);
        if (resolved?.skip) { lastViewUrl = location.href; return; }
        showView(resolved, { focus: true, animate: true });
      };
      window.addEventListener('popstate', handleViewHistory);
      window.addEventListener('hashchange', handleViewHistory);
      showView(resolveView(location.hash));
