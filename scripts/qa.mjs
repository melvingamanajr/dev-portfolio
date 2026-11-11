import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { startServer } from './serve.mjs';

const resultsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'test-results');
await mkdir(resultsDir, { recursive: true });
const { server, url } = await startServer({ port: 0 });
const report = { url, browsers: [], screenshots: [] };
const failures = [];
const capturingScreenshot = new WeakSet();
const requestedBrowser = process.argv.find((argument) => argument.startsWith('--browser='))?.split('=')[1];
assert.ok(!requestedBrowser || ['chromium', 'firefox', 'webkit'].includes(requestedBrowser), 'Use --browser=chromium, firefox, or webkit');
const themeSnapshot = (page) => page.evaluate(() => ({ theme: document.documentElement.dataset.theme, className: document.documentElement.className, background: getComputedStyle(document.body).backgroundColor }));

async function captureScreenshot(page, options, target = page) {
  capturingScreenshot.add(page);
  try { return await target.screenshot(options); }
  finally { capturingScreenshot.delete(page); }
}

async function availableExecutable(name, engine) {
  if (existsSync(engine.executablePath())) return undefined;
  // Reuse an already installed Windows browser without requiring a large download.
  if (process.platform !== 'win32' || !process.env.LOCALAPPDATA) return undefined;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || resolve(process.env.LOCALAPPDATA, 'ms-playwright');
  const folders = (await readdir(cache).catch(() => [])).filter((entry) => entry.startsWith(`${name}-`)).sort((left, right) => Number(right.split('-').at(-1)) - Number(left.split('-').at(-1)));
  const relativePath = { chromium: ['chrome-win64', 'chrome.exe'], firefox: ['firefox', 'firefox.exe'], webkit: ['Playwright.exe'] }[name];
  for (const folder of folders) {
    const executable = resolve(cache, folder, ...relativePath);
    if (existsSync(executable)) return executable;
  }
}

async function audit(page, browserName, theme) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  await writeFile(resolve(resultsDir, `unslop-axe-${browserName}-${theme}.json`), JSON.stringify(result, null, 2));
  assert.equal(result.violations.length, 0, `${theme} accessibility violations: ${result.violations.map(({ id, nodes }) => `${id} (${nodes.map(({ target }) => target.join(', ')).join('; ')})`).join('\n')}`);
}

async function previewLoaded(page) {
  const image = page.locator('[data-preview-image]');
  await image.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const preview = document.querySelector('[data-preview]');
    const image = document.querySelector('[data-preview-image]');
    return preview?.classList.contains('is-loaded') && preview.getAttribute('aria-busy') === 'false' && image?.complete && image.naturalWidth > 0;
  });
  assert.ok(!await page.locator('[data-preview-status]').isVisible(), 'Loaded product preview must stop announcing loading');
  assert.ok(!await page.locator('[data-preview-error]').isVisible(), 'Successful product preview must not expose an error');
}

async function previewFailure(context) {
  // Isolate the deliberate failed resource from the normal-page error collector.
  const failedPage = await context.newPage();
  try {
    await failedPage.route('**/assets/hangman-preview.*', (route) => route.abort('failed'));
    await failedPage.goto(url, { waitUntil: 'networkidle' });
    await failedPage.locator('[data-preview]').scrollIntoViewIfNeeded();
    await failedPage.waitForFunction(() => {
      const preview = document.querySelector('[data-preview]');
      return preview?.classList.contains('is-error') && preview.getAttribute('aria-busy') === 'false';
    });
    assert.ok(!await failedPage.locator('[data-preview-status]').isVisible(), 'Failed product image must leave its loading state');
    assert.ok(await failedPage.locator('[data-preview-error]').isVisible(), 'Failed product image must explain the unavailable preview');
    assert.ok(await failedPage.locator('a[href="https://melvingamanajr.github.io/hangman-game/src/index.html"]').first().isVisible(), 'An unavailable preview must retain the playable game link');
  } finally {
    await failedPage.close();
  }
}

async function previewAlreadyComplete(context) {
  // Defer only the page's unchanged runtime so that the image finishes first.
  // This exercises the same initialization order as a cached image without
  // depending on a particular browser's HTTP-cache timing.
  const cachedPage = await context.newPage();
  try {
    await cachedPage.route(url, async (route) => {
      const response = await route.fetch();
      const html = await response.text();
      let deferred = false;
      const body = html.replace(/<script>([\s\S]*?)<\/script>/g, (script, content) => {
        if (!content.includes('data-preview-image')) return script;
        deferred = true;
        return `<script type="text/plain" data-qa-deferred-runtime>${content}</script>`;
      });
      assert.ok(deferred, 'Already-complete preview check must defer the actual application runtime');
      await route.fulfill({ response, body });
    });
    await cachedPage.goto(url, { waitUntil: 'networkidle' });
    await cachedPage.locator('[data-preview-image]').scrollIntoViewIfNeeded();
    await cachedPage.waitForFunction(() => {
      const image = document.querySelector('[data-preview-image]');
      return image?.complete && image.naturalWidth > 0;
    });
    assert.ok(!await cachedPage.locator('[data-preview]').evaluate((element) => element.classList.contains('is-loaded')), 'Runtime must still be deferred when the image completes');
    const runtime = await cachedPage.locator('[data-qa-deferred-runtime]').textContent();
    await cachedPage.addScriptTag({ content: runtime });
    await previewLoaded(cachedPage);
  } finally {
    await cachedPage.close();
  }
}

async function mouseDrag(page, source, target, side = 'after', cancel = false) {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  assert.ok(from && to, 'Skill drag endpoints must be visible');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 8, from.y + from.height / 2 + 2, { steps: 4 });
  await page.mouse.move(from.x + from.width / 2 + 14, from.y + from.height / 2 + 3, { steps: 3 });
  const x = to.x + to.width * (side === 'after' ? .85 : .15);
  const y = to.y + to.height / 2;
  await page.mouse.move(x, y, { steps: 14 });
  await page.mouse.move(x + (side === 'after' ? 1 : -1), y, { steps: 2 });
  if (cancel) await page.keyboard.press('Escape');
  await page.mouse.up();
}

async function skillReordering(page) {
  await page.locator('#tab-frontend').click();
  const container = page.locator('#panel-frontend .skill-pills');
  await container.scrollIntoViewIfNeeded();
  const pills = container.locator('.skill-pill');
  const baseline = await pills.allTextContents();
  assert.ok(baseline.length >= 3, 'Frontend skills should have enough examples to demonstrate rearrangement');
  assert.equal(await container.locator('button[draggable="true"]').count(), baseline.length, 'Every skill should remain draggable and keyboard focusable');
  await pills.first().focus();
  await page.keyboard.press('Alt+ArrowRight');
  assert.deepEqual(await pills.allTextContents(), [baseline[1], baseline[0], ...baseline.slice(2)], 'Keyboard rearrangement should move the focused skill');
  assert.equal(await page.evaluate(() => document.activeElement?.textContent), baseline[0], 'Keyboard rearrangement should preserve focus');
  await page.keyboard.press('Alt+ArrowLeft');
  assert.deepEqual(await pills.allTextContents(), baseline, 'Keyboard rearrangement should move in both directions');
  const skill = (text) => pills.filter({ hasText: text });
  await mouseDrag(page, skill(baseline[0]), skill(baseline.at(-1)));
  assert.deepEqual(await pills.allTextContents(), [...baseline.slice(1), baseline[0]], 'Actual mouse drag should append the first skill');
  await mouseDrag(page, skill(baseline[0]), skill(baseline[1]), 'before');
  assert.deepEqual(await pills.allTextContents(), baseline, 'Actual mouse drag should restore the first skill');
  await mouseDrag(page, skill(baseline[0]), skill(baseline.at(-1)), 'after', true);
  assert.deepEqual(await pills.allTextContents(), baseline, 'Escape should cancel an active drag');
  assert.equal(await page.locator('.is-dragging, .drop-before, .drop-after').count(), 0, 'Finished drag should clear its feedback');
  const backend = await page.locator('#panel-backend .skill-pill').allTextContents();
  await pills.first().focus();
  await page.keyboard.press('Alt+ArrowRight');
  const rearranged = await pills.allTextContents();
  await page.locator('#tab-backend').click();
  assert.deepEqual(await page.locator('#panel-backend .skill-pill').allTextContents(), backend, 'Rearrangement must not alter another category');
  await page.locator('#tab-frontend').click();
  assert.deepEqual(await pills.allTextContents(), rearranged, 'Switching tabs should retain skill order');
}

async function interactions(page) {
  const menu = page.locator('[data-menu-toggle]');
  await page.setViewportSize({ width: 390, height: 844 });
  if (await menu.isVisible()) {
    await menu.click();
    assert.equal(await menu.getAttribute('aria-expanded'), 'true', 'Mobile menu must announce its open state');
    const navLink = page.locator('#primary-nav a[href^="#"]').first();
    assert.ok(await navLink.isVisible(), 'Opened mobile menu should expose its navigation');
    await navLink.click();
    assert.equal(await menu.getAttribute('aria-expanded'), 'false', 'Selecting mobile navigation should close the menu');
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  assert.equal(await page.locator('[data-filter]').count(), 0, 'Project filter badges should be removed');
  for (const project of ['attendance', 'hangman']) {
    assert.ok(await page.locator(`[data-project-card="${project}"]`).isVisible(), `${project} should remain available without filtering`);
  }
  assert.equal(await page.locator('.hero-art, .art-orbit, .art-node, .art-core, .filter-bar, .filter-button, .tags, .tag, .badge, h1 em, h2 em, h3 em').count(), 0, 'Decorative orbit, filter bars, badges, and random headline italics should be absent');
  const actualOpener = page.locator('[data-project]').first();
  await actualOpener.click();
  const dialog = page.locator('#project-dialog');
  await dialog.waitFor({ state: 'visible' });
  assert.ok(await dialog.evaluate((element) => element.open), 'Project details must open a native dialog');
  for (let count = 0; count < 12; count++) {
    await page.keyboard.press('Tab');
    const focus = await dialog.evaluate((element) => ({ inside: element.contains(document.activeElement), activeElement: document.activeElement?.outerHTML.slice(0, 240), documentFocused: document.hasFocus() }));
    assert.ok(focus.inside, `Keyboard focus escaped the modal: ${JSON.stringify(focus)}`);
  }
  await page.keyboard.press('Escape');
  assert.ok(!await dialog.isVisible(), 'Escape should dismiss project details');
  assert.ok(await actualOpener.evaluate((element) => element === document.activeElement), 'Closing a dialog must restore opener focus');

  const tabs = page.getByRole('tab');
  assert.ok(await tabs.count() >= 2, 'Skills must expose multiple accessible tabs');
  await tabs.first().focus();
  const orientation = await page.getByRole('tablist').getAttribute('aria-orientation');
  await page.keyboard.press(orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight');
  const nextTab = tabs.nth(1);
  assert.ok(await nextTab.evaluate((element) => element === document.activeElement), 'Arrow keys must move between skills tabs in the announced orientation');
  await page.keyboard.press('Enter');
  assert.equal(await nextTab.getAttribute('aria-selected'), 'true', 'Skills tab selection must be announced');
  const panelId = await nextTab.getAttribute('aria-controls');
  assert.ok(panelId && await page.locator(`[id="${panelId}"]`).isVisible(), 'Selected skills panel should be visible');
  await skillReordering(page);

  const details = page.locator('details').first();
  assert.ok(await details.count(), 'Experience should offer an expandable disclosure');
  const original = await details.getAttribute('open');
  await details.locator('summary').click();
  assert.notEqual(await details.getAttribute('open'), original, 'Experience disclosure should expand or collapse');

  const form = page.locator('#contact-form');
  assert.ok(!await form.evaluate((element) => element.checkValidity()), 'Contact form must require its essential fields');
  await form.locator('[name="name"]').fill('QA Visitor');
  await form.locator('[name="email"]').fill('invalid-address');
  await form.locator('[name="message"]').fill('A portfolio QA message with enough detail.');
  assert.ok(!await form.evaluate((element) => element.checkValidity()), 'Malformed email addresses should fail validation');
  await form.locator('button[type="submit"]').click();
  assert.ok(!await page.locator('#email-draft').isVisible(), 'Invalid input must not prepare a draft');
  assert.ok(await form.locator('[name="email"]').evaluate((element) => element === document.activeElement), 'Invalid submission should focus the email field');
  assert.equal(await form.locator('[name="email"]').getAttribute('aria-invalid'), 'true', 'Invalid submission should announce the malformed field');
  assert.ok((await page.locator('#email-error').textContent()).trim(), 'Invalid submission must explain the error');
  await form.locator('[name="email"]').fill('visitor@example.com');
  assert.ok(await form.evaluate((element) => element.checkValidity()), 'A complete valid message should pass validation');
  await form.locator('button[type="submit"]').click();
  const draft = page.locator('#email-draft');
  await draft.waitFor({ state: 'visible' });
  const mailto = await draft.getAttribute('href');
  assert.match(mailto, /^mailto:[^?]+\?/, 'Contact should prepare an explicit email draft');
  assert.ok(decodeURIComponent(mailto).includes('QA Visitor'), 'Email draft should contain the entered name');
  assert.ok(decodeURIComponent(mailto).includes('visitor@example.com'), 'Email draft should contain the reply address');
  assert.ok(decodeURIComponent(mailto).includes('A portfolio QA message'), 'Email draft should contain the entered message');
  assert.ok(page.url().startsWith(url), 'Preparing an email must keep the visitor on the page');
  assert.ok(await form.locator('button[type="submit"]').isDisabled(), 'Ready draft should prevent duplicate preparation until an edit');
  assert.match(await page.locator('#draft-result').textContent(), /not.*sent|no message has been sent/i, 'Draft result should honestly explain that no message has been sent');
  const storedData = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  assert.ok(!/QA Visitor|visitor@example\.com|A portfolio QA message/.test(storedData), 'Contact details must not be persisted in browser storage');
  await form.locator('[name="message"]').fill('An edited message should invalidate the prepared draft.');
  assert.ok(await form.locator('button[type="submit"]').isEnabled(), 'Editing should enable preparation of a new draft');
  assert.ok(!await draft.isVisible(), 'Editing should hide the outdated draft');
  assert.equal(await draft.getAttribute('href'), 'mailto:melvingamanajr@gmail.com', 'Editing should discard the outdated draft body');

  const privacyOpener = page.locator('[aria-controls="privacy-dialog"], [data-privacy], [data-privacy-open], [data-open-privacy], a[href="#privacy-dialog"]').first();
  assert.ok(await privacyOpener.count(), 'Privacy information must have a visible trigger');
  await privacyOpener.click();
  await page.locator('#privacy-dialog').waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  assert.ok(!await page.locator('#privacy-dialog').isVisible(), 'Privacy dialog should close using Escape');
  assert.ok(await privacyOpener.evaluate((element) => element === document.activeElement), 'Privacy dialog should return focus to its opener');
}

try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    if (requestedBrowser && requestedBrowser !== name) continue;
    let browser;
    try {
      browser = await engine.launch({ headless: true, timeout: 15000, executablePath: await availableExecutable(name, engine) });
    } catch (error) {
      const reason = String(error);
      if (/Executable doesn't exist|Host system is missing dependencies|not supported/i.test(reason)) {
        report.browsers.push({ name, status: 'unavailable', reason: reason.split('\n')[0] });
        console.log(`UNAVAILABLE ${name}: ${reason.split('\n')[0]}`);
        continue;
      }
      failures.push(`${name} launch: ${error.stack || error}`);
      report.browsers.push({ name, status: 'failed', reason: reason.split('\n')[0] });
      console.error(`FAIL ${name} launch: ${reason.split('\n')[0]}`);
      continue;
    }
    const context = await browser.newContext({ colorScheme: 'light', reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    const harnessWarnings = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      // Playwright 1.56 injects "body {}" while synchronizing WebKit screenshots.
      // That test-only style is correctly rejected by the application's CSP.
      if (name === 'webkit' && capturingScreenshot.has(page) && message.text() === "Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy.") {
        harnessWarnings.push({ operation: 'screenshot', reason: 'Playwright injected an un-hashed body {} synchronization style; strict site CSP rejected it.' });
        return;
      }
      errors.push(message.text());
    });
    page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      assert.ok(await page.title(), 'Page title is required');
      assert.equal(await page.locator('h1').count(), 1, 'Portfolio must have one primary heading');
      await previewLoaded(page);
      for (const theme of ['light', 'dark']) {
        if (await page.evaluate(() => document.documentElement.dataset.theme) !== theme) await page.locator('[data-theme-toggle]').click();
        assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), theme, `Theme control must expose ${theme} mode`);
        for (const width of [320, 390, 768, 1440]) {
          await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
          const dimensions = await page.evaluate(() => {
            const image = document.querySelector('[data-preview-image]');
            const bounds = image.getBoundingClientRect();
            return { content: document.documentElement.scrollWidth, viewport: innerWidth, image: { left: bounds.left, right: bounds.right, width: bounds.width, height: bounds.height, sourceWidth: image.naturalWidth, sourceHeight: image.naturalHeight } };
          });
          assert.ok(dimensions.content <= dimensions.viewport + 1, `${theme} horizontal overflow at ${width}px (${dimensions.content}px)`);
          assert.ok(dimensions.image.width > 0 && dimensions.image.height > 0 && dimensions.image.left >= -1 && dimensions.image.right <= width + 1, `${theme} product image should stay in bounds at ${width}px: ${JSON.stringify(dimensions.image)}`);
          const ratio = dimensions.image.sourceWidth / dimensions.image.sourceHeight;
          assert.ok(Math.abs(dimensions.image.width / dimensions.image.height - ratio) < .02, `${theme} product screenshot should preserve its original aspect ratio at ${width}px`);
          await page.evaluate(() => scrollTo(0, 0));
          await audit(page, `${name}-${width}`, theme);
          const path = resolve(resultsDir, `unslop-${name}-${width}-${theme}.png`);
          await captureScreenshot(page, { path, fullPage: true });
          report.screenshots.push(path);
          if ([390, 1440].includes(width)) {
            for (const [region, selector] of [['hero', '.hero'], ['product', '[data-project-card="hangman"]']]) {
              const regionPath = resolve(resultsDir, `unslop-${name}-${width}-${theme}-${region}.png`);
              await captureScreenshot(page, { path: regionPath }, page.locator(selector));
              report.screenshots.push(regionPath);
            }
          }
        }
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      const before = await themeSnapshot(page);
      await page.locator('[data-theme-toggle]').click();
      const after = await themeSnapshot(page);
      assert.notDeepEqual(after, before, 'Theme toggle must change the displayed theme');
      await page.reload({ waitUntil: 'networkidle' });
      assert.deepEqual(await themeSnapshot(page), after, 'Selected theme must persist after reload');
      await previewLoaded(page);
      await previewFailure(context);
      await previewAlreadyComplete(context);
      await interactions(page);
      assert.deepEqual(errors, [], 'Browser errors or failed resources');
      report.browsers.push({ name, status: 'passed', harnessWarnings, checks: ['320/390/768/1440px in both themes', 'WCAG AA audit at all eight layouts', 'real product image bounds and aspect ratio', 'product loading success, reload, already-complete initialization, and isolated resource failure', 'theme persistence', 'mobile menu', 'filters and decorative orbit removed; both projects visible', 'modal focus', 'skills keyboard tabs and keyboard/mouse rearrangement', 'experience disclosure', 'contact validation, honest draft state, and edit reset', 'privacy dialog', 'no application console errors or CSP violations outside screenshot capture'] });
      console.log(`PASS ${name}: responsive layout, accessibility, product preview states, keyboard and mouse, themes, navigation, projects, contact`);
    } catch (error) {
      failures.push(`${name}: ${error.stack || error}`);
      report.browsers.push({ name, status: 'failed', reason: String(error) });
      await captureScreenshot(page, { path: resolve(resultsDir, `unslop-${name}-failure.png`), fullPage: true }).catch(() => {});
      console.error(`FAIL ${name}: ${error.message}`);
    } finally {
      await browser.close();
    }
  }
  if (failures.length) throw new Error(failures.join('\n\n'));
  assert.ok(report.browsers.some(({ status }) => status === 'passed'), 'No browser successfully completed the checks');
} finally {
  await writeFile(resolve(resultsDir, requestedBrowser ? `unslop-qa-report-${requestedBrowser}.json` : 'unslop-qa-report.json'), JSON.stringify(report, null, 2));
  await new Promise((accept) => server.close(accept));
}
console.log(`QA artifacts: ${resultsDir}`);
