    (() => {
      'use strict';
      document.documentElement.classList.add('js');
      const data = JSON.parse(document.getElementById('portfolio-data').textContent);
      const $ = (selector, root = document) => root.querySelector(selector);
      const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
      const create = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
      const createIcon = (name) => {
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        icon.classList.add('icon');
        icon.setAttribute('aria-hidden', 'true');
        use.setAttribute('href', `#i-${name}`);
        icon.append(use);
        return icon;
      };
      const themeButton = $('[data-theme-toggle]');
      const mediaTheme = window.matchMedia('(prefers-color-scheme: light)');
      let explicitTheme = null;
      try { explicitTheme = localStorage.getItem('portfolio-theme'); } catch { /* Storage is optional. */ }
      const setTheme = (theme) => { document.documentElement.dataset.theme = theme; themeButton.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`); $('meta[name="theme-color"]').content = theme === 'dark' ? '#111715' : '#f6f7f0'; };
      setTheme(['dark', 'light'].includes(explicitTheme) ? explicitTheme : mediaTheme.matches ? 'light' : 'dark');
      themeButton.addEventListener('click', () => { explicitTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; setTheme(explicitTheme); try { localStorage.setItem('portfolio-theme', explicitTheme); } catch { /* Keep the theme for this page only. */ } });
      mediaTheme.addEventListener('change', (event) => { if (!explicitTheme) setTheme(event.matches ? 'light' : 'dark'); });
      $('#year').textContent = String(new Date().getFullYear());

      // Preview feedback reflects the real image request, including cached loads.
      $$('[data-preview]').forEach((preview) => {
        const image = $('[data-preview-image]', preview);
        const status = $('[data-preview-status]', preview);
        const error = $('[data-preview-error]', preview);
        if (!image || !status || !error) return;
        const setPreviewState = (state) => {
          preview.classList.toggle('is-loading', state === 'loading');
          preview.classList.toggle('is-loaded', state === 'loaded');
          preview.classList.toggle('is-error', state === 'error');
          preview.setAttribute('aria-busy', String(state === 'loading'));
          status.hidden = state !== 'loading';
          error.hidden = state !== 'error';
        };
        image.addEventListener('load', () => setPreviewState('loaded'));
        image.addEventListener('error', () => setPreviewState('error'));
        setPreviewState(image.complete ? image.naturalWidth > 0 ? 'loaded' : 'error' : 'loading');
      });

      const menuButton = $('[data-menu-toggle]');
      const nav = $('#primary-nav');
      const closeMenu = (restoreFocus = false) => { nav.classList.remove('is-open'); menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open navigation'); if (restoreFocus) menuButton.focus(); };
      menuButton.addEventListener('click', () => { const open = menuButton.getAttribute('aria-expanded') !== 'true'; nav.classList.toggle('is-open', open); menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); });
      $$('a', nav).forEach((link) => link.addEventListener('click', () => closeMenu()));
      document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') closeMenu(true); });
      document.addEventListener('click', (event) => { if (!event.target.closest('.site-header')) closeMenu(); });
      const mobileViewport = window.matchMedia('(max-width: 640px)');
      mobileViewport.addEventListener('change', () => closeMenu());
      if ('IntersectionObserver' in window) { const observer = new IntersectionObserver((entries) => { entries.forEach((entry) => { if (entry.isIntersecting) { $$('a', nav).forEach((link) => { if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); }); } }); }, { rootMargin: '-20% 0px -55% 0px', threshold: 0 }); $$('main > section[id]').forEach((section) => observer.observe(section)); }

      const openers = new WeakMap();
      const showDialog = (dialog, trigger) => { openers.set(dialog, trigger); dialog.showModal(); document.body.classList.add('dialog-open'); };
      $$('dialog').forEach((dialog) => { $('[data-close-dialog]', dialog).addEventListener('click', () => dialog.close()); dialog.addEventListener('click', (event) => { const box = dialog.getBoundingClientRect(); if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close(); }); dialog.addEventListener('close', () => { if (!document.querySelector('dialog[open]')) document.body.classList.remove('dialog-open'); const trigger = openers.get(dialog); if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true }); }); dialog.addEventListener('keydown', (event) => { if (event.key !== 'Tab') return; const focusable = $$('a[href], button:not([disabled]), input, textarea, [tabindex="0"]', dialog).filter((node) => !node.hidden && node.getClientRects().length > 0); const first = focusable[0]; if (!first) { event.preventDefault(); return; } const current = focusable.indexOf(document.activeElement); const next = event.shiftKey ? (current <= 0 ? focusable.length - 1 : current - 1) : (current + 1) % focusable.length; event.preventDefault(); focusable[next].focus(); }); });
      $$('[data-project]').forEach((button) => button.addEventListener('click', () => {
        const project = data.projects.find((item) => item.id === button.dataset.project);
        const content = $('#project-dialog-content');
        content.replaceChildren();
        $('#project-dialog-title').textContent = project.title;
        $('#project-dialog-meta').textContent = `${project.type} / ${project.period}`;
        const description = create('p', '', project.description);
        description.id = 'project-dialog-description';
        content.append(description);
        const impact = create('div', 'dialog-impact');
        impact.append(create('strong', '', project.result), create('p', '', project.resultLabel));
        content.append(impact, create('h3', '', project.problemHeading || 'The problem'), create('p', '', project.problem), create('h3', '', project.approachHeading || 'My approach'));
        const list = create('ul');
        project.approach.forEach((item) => list.append(create('li', '', item)));
        content.append(list, create('h3', '', project.focusHeading || 'Areas of focus'));
        content.append(create('p', 'project-tech', project.tags.join(' · ')));
        const foot = create('div', 'dialog-foot');
        foot.append(create('p', '', project.note));
        const actions = create('div', 'dialog-actions');
        const links = [
          { url: project.demoUrl, label: 'Play game' },
          { url: project.repositoryUrl || data.person.github, label: project.repositoryUrl ? 'View source code' : 'Visit my GitHub profile' }
        ];
        links.filter((item) => item.url).forEach(({ url, label }) => {
          const link = create('a', `button${url === project.demoUrl ? ' primary' : ''}`, label);
          link.append(createIcon('up-right'));
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.setAttribute('aria-label', `${label} (opens in a new tab)`);
          actions.append(link);
        });
        foot.append(actions);
        content.append(foot);
        showDialog($('#project-dialog'), button);
      }));
      $$('[data-privacy]').forEach((button) => button.addEventListener('click', () => showDialog($('#privacy-dialog'), button)));

      const tabs = $$('.skill-tab');
      const tablist = $('.skill-tabs');
      const skillSortStatus = create('p', 'visually-hidden');
      skillSortStatus.id = 'skill-sort-status';
      skillSortStatus.setAttribute('role', 'status');
      skillSortStatus.setAttribute('aria-live', 'polite');
      skillSortStatus.setAttribute('aria-atomic', 'true');
      $('.skills-layout').after(skillSortStatus);
      let skillDrag = null;
      const updateSkillPositions = (container) => {
        const pills = $$('.skill-pill', container);
        pills.forEach((pill, index) => pill.setAttribute('aria-label', `${pill.textContent}, position ${index + 1} of ${pills.length}`));
      };
      const clearSkillMarkers = () => $$('.skill-pill.drop-before, .skill-pill.drop-after').forEach((pill) => pill.classList.remove('drop-before', 'drop-after'));
      const announceSkillPosition = (pill, container) => {
        const pills = $$('.skill-pill', container);
        skillSortStatus.textContent = `${pill.textContent} is now at position ${pills.indexOf(pill) + 1} of ${pills.length}.`;
      };
      const finishSkillDrag = (commit = false) => {
        if (!skillDrag) return;
        const { pill, container, reference, valid } = skillDrag;
        if (commit && valid && reference !== pill) container.insertBefore(pill, reference);
        pill.classList.remove('is-dragging');
        container.classList.remove('is-sorting');
        clearSkillMarkers();
        updateSkillPositions(container);
        skillDrag = null;
        pill.focus({ preventScroll: true });
        if (commit && valid) announceSkillPosition(pill, container);
        else skillSortStatus.textContent = 'Rearrangement canceled.';
      };
      const markSkillInsertion = (container, x, y) => {
        clearSkillMarkers();
        const candidates = $$('.skill-pill', container).filter((pill) => pill !== skillDrag.pill).map((pill) => ({ pill, box: pill.getBoundingClientRect() }));
        if (!candidates.length) return null;
        const nearestRow = candidates.reduce((nearest, item) => Math.abs(y - item.box.top - item.box.height / 2) < Math.abs(y - nearest.box.top - nearest.box.height / 2) ? item : nearest);
        const row = candidates.filter(({ box }) => Math.abs(box.top - nearestRow.box.top) < 3);
        const before = row.find(({ box }) => x < box.left + box.width / 2);
        if (before) { before.pill.classList.add('drop-before'); return before.pill; }
        const last = row[row.length - 1].pill;
        last.classList.add('drop-after');
        return last.nextElementSibling;
      };
      data.skills.forEach((skill) => {
        let panel = $(`#panel-${skill.id}`);
        if (!panel) {
          panel = create('div', 'skill-panel');
          panel.id = `panel-${skill.id}`;
          panel.setAttribute('role', 'tabpanel');
          panel.setAttribute('aria-labelledby', `tab-${skill.id}`);
          panel.tabIndex = 0;
          panel.hidden = true;
          $('#skill-panels').append(panel);
        }
        panel.replaceChildren(create('p', '', skill.description));
        const pills = create('div', 'skill-pills');
        const help = create('p', 'skill-reorder-note', 'Drag to rearrange. Keyboard: focus a skill, then use Alt + arrow keys.');
        help.id = `skill-help-${skill.id}`;
        pills.setAttribute('role', 'group');
        pills.setAttribute('aria-label', `${$(`#tab-${skill.id}`).textContent.trim()} skills`);
        pills.setAttribute('aria-describedby', help.id);
        skill.items.forEach((item) => {
          const pill = create('button', 'skill-pill', item);
          pill.type = 'button';
          pill.draggable = true;
          pill.setAttribute('aria-keyshortcuts', 'Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown');
          pill.addEventListener('dragstart', (event) => {
            finishSkillDrag();
            skillDrag = { pill, container: pills, reference: null, valid: false };
            if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', pill.textContent); }
            pill.classList.add('is-dragging');
            pills.classList.add('is-sorting');
            skillSortStatus.textContent = `Picked up ${pill.textContent}. Drop it at the insertion marker to rearrange.`;
          });
          pill.addEventListener('dragend', () => { if (skillDrag?.pill === pill) finishSkillDrag(); });
          pill.addEventListener('keydown', (event) => {
            if (!event.altKey || event.ctrlKey || event.metaKey || skillDrag) return;
            const direction = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
            if (!direction) return;
            event.preventDefault();
            const order = $$('.skill-pill', pills);
            const index = order.indexOf(pill);
            const next = index + direction;
            if (next >= 0 && next < order.length) pills.insertBefore(pill, direction < 0 ? order[next] : order[next].nextElementSibling);
            updateSkillPositions(pills);
            pill.focus({ preventScroll: true });
            announceSkillPosition(pill, pills);
          });
          pills.append(pill);
        });
        pills.addEventListener('dragover', (event) => {
          if (!skillDrag || skillDrag.container !== pills) return;
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
          skillDrag.reference = markSkillInsertion(pills, event.clientX, event.clientY);
          skillDrag.valid = true;
        });
        pills.addEventListener('drop', (event) => {
          if (!skillDrag || skillDrag.container !== pills) return;
          event.preventDefault();
          event.stopPropagation();
          finishSkillDrag(true);
        });
        panel.append(pills, help);
        updateSkillPositions(pills);
      });
      document.addEventListener('dragover', (event) => {
        if (!skillDrag || skillDrag.container.contains(event.target)) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'none';
        skillDrag.valid = false;
        clearSkillMarkers();
      });
      document.addEventListener('drop', (event) => { if (skillDrag) { event.preventDefault(); finishSkillDrag(); } });
      document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && skillDrag) { event.preventDefault(); finishSkillDrag(); } });
      const activateTab = (tab, focus = false) => { finishSkillDrag(); tabs.forEach((item) => { const selected = item === tab; item.setAttribute('aria-selected', String(selected)); item.tabIndex = selected ? 0 : -1; $(`#${item.getAttribute('aria-controls')}`).hidden = !selected; }); if (focus) tab.focus(); };
      const updateTabOrientation = () => tablist.setAttribute('aria-orientation', mobileViewport.matches ? 'horizontal' : 'vertical'); updateTabOrientation(); mobileViewport.addEventListener('change', updateTabOrientation);
      tabs.forEach((tab, index) => { tab.addEventListener('click', () => activateTab(tab)); tab.addEventListener('keydown', (event) => { const horizontal = tablist.getAttribute('aria-orientation') === 'horizontal'; const previous = horizontal ? 'ArrowLeft' : 'ArrowUp'; const next = horizontal ? 'ArrowRight' : 'ArrowDown'; let target; if (event.key === next) target = (index + 1) % tabs.length; else if (event.key === previous) target = (index - 1 + tabs.length) % tabs.length; else if (event.key === 'Home') target = 0; else if (event.key === 'End') target = tabs.length - 1; if (target !== undefined) { event.preventDefault(); activateTab(tabs[target], true); } }); });

      const copyStates = new WeakMap();
      const copyText = async (text, status, success, button) => {
        let state = copyStates.get(button);
        if (!state) {
          state = { pending: false, timer: null, nodes: [...button.childNodes].map((node) => node.cloneNode(true)), label: button.getAttribute('aria-label') };
          copyStates.set(button, state);
        }
        if (state.pending) return;
        clearTimeout(state.timer);
        const restoreButton = () => {
          button.replaceChildren(...state.nodes.map((node) => node.cloneNode(true)));
          if (state.label === null) button.removeAttribute('aria-label');
          else button.setAttribute('aria-label', state.label);
        };
        state.pending = true;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        status.textContent = 'Copying…';
        if (button.id === 'copy-email') button.setAttribute('aria-label', 'Copying email address');
        else button.textContent = 'Copying…';
        try {
          if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
          await navigator.clipboard.writeText(text);
          status.textContent = success;
          if (button.id === 'copy-email') {
            button.replaceChildren(createIcon('check'));
            button.setAttribute('aria-label', 'Email address copied');
          } else {
            button.replaceChildren(document.createTextNode('Copied'), createIcon('check'));
          }
          state.timer = setTimeout(restoreButton, 2500);
        } catch {
          restoreButton();
          status.textContent = 'Copy is unavailable here. Select the text to copy it manually.';
        } finally {
          state.pending = false;
          button.disabled = false;
          button.removeAttribute('aria-busy');
        }
      };
      const copyEmail = $('#copy-email');
      copyEmail.addEventListener('click', () => copyText(data.person.email, $('#copy-status'), 'Email address copied.', copyEmail));
      const form = $('#contact-form');
      const submitButton = $('button[type="submit"]', form);
      const submitContent = [...submitButton.childNodes].map((node) => node.cloneNode(true));
      const fields = ['name', 'email', 'message'].map((id) => $(`#${id}`));
      let draftText = '';
      const fieldError = (field) => { const value = field.value.trim(); if (!value) return field.id === 'message' ? 'Please add a short message.' : `Please enter your ${field.id === 'name' ? 'name' : 'email address'}.`; if (field.id === 'email' && !field.validity.valid) return 'Enter a valid email address, such as alex@company.com.'; if (field.id === 'name' && /[\r\n\u0000-\u001f]/.test(value)) return 'Please enter your name on one line.'; if (field.id === 'message' && value.length < 10) return 'Please write at least 10 characters.'; if (value.length > field.maxLength) return `Please use no more than ${field.maxLength} characters.`; return ''; };
      const validate = (field) => { const error = fieldError(field); $(`#${field.id}-error`).textContent = error; field.setAttribute('aria-invalid', String(Boolean(error))); return !error; };
      fields.forEach((field) => field.addEventListener('input', () => {
        if (field.hasAttribute('aria-invalid')) validate(field);
        $('#draft-result').hidden = true;
        $('#draft-result').classList.remove('feedback-enter');
        $('#email-draft').href = `mailto:${data.person.email}`;
        $('#draft-copy-status').textContent = '';
        submitButton.disabled = false;
        submitButton.replaceChildren(...submitContent.map((node) => node.cloneNode(true)));
        draftText = '';
      }));
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (submitButton.disabled) return;
        const valid = fields.map(validate);
        if (valid.includes(false)) { fields[valid.indexOf(false)].focus(); return; }
        const [name, email, message] = fields.map((field) => field.value.trim());
        const subject = `Portfolio inquiry from ${name}`;
        draftText = `Hi Melvin,\n\n${message}\n\nFrom: ${name}\nReply to: ${email}`;
        $('#email-draft').href = `mailto:${data.person.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draftText)}`;
        const result = $('#draft-result');
        result.hidden = false;
        result.classList.add('feedback-enter');
        $('#draft-copy-status').textContent = '';
        submitButton.disabled = true;
        submitButton.replaceChildren(document.createTextNode('Draft ready'), createIcon('check'));
      });
      $('#draft-result').addEventListener('animationend', (event) => { if (event.target === event.currentTarget) event.currentTarget.classList.remove('feedback-enter'); });
      const copyDraft = $('#copy-draft');
      copyDraft.addEventListener('click', () => { if (draftText) copyText(draftText, $('#draft-copy-status'), 'Message copied. You can paste it into your email app.', copyDraft); });
    })();
