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
const shownProjects = async (page) => (await Promise.all((await page.locator('[data-project]').all()).map((item) => item.isVisible()))).filter(Boolean).length;
const themeSnapshot = (page) => page.evaluate(() => ({ theme: document.documentElement.dataset.theme, className: document.documentElement.className, background: getComputedStyle(document.body).backgroundColor }));

async function captureScreenshot(page, options) {
  capturingScreenshot.add(page);
  try { return await page.screenshot(options); }
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
  await writeFile(resolve(resultsDir, `axe-${browserName}-${theme}.json`), JSON.stringify(result, null, 2));
  assert.equal(result.violations.length, 0, `${theme} accessibility violations: ${result.violations.map(({ id, nodes }) => `${id} (${nodes.map(({ target }) => target.join(', ')).join('; ')})`).join('\n')}`);
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
  for (const filter of ['full-stack', 'data']) {
    await page.locator(`[data-filter="${filter}"]`).click();
    assert.ok(await shownProjects(page) >= 1, `${filter} should show the documented project`);
  }
  await page.locator('[data-filter="devops"]').click();
  assert.equal(await shownProjects(page), 0, 'DevOps should have an honest empty state');
  await page.locator('[data-filter="all"]').click();
  assert.ok(await shownProjects(page) >= 1, 'All filter must restore the project');
  const actualOpener = page.locator('[data-project]').filter({ visible: true }).first();
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
  const storedData = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  assert.ok(!/QA Visitor|visitor@example\.com|A portfolio QA message/.test(storedData), 'Contact details must not be persisted in browser storage');

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
      if (await page.evaluate(() => document.documentElement.dataset.theme) !== 'light') await page.locator('[data-theme-toggle]').click();
      assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light', 'Theme control must expose light mode');
      for (const width of [360, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
        await page.evaluate(() => scrollTo(0, 0));
        const dimensions = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
        assert.ok(dimensions.content <= dimensions.viewport + 1, `Horizontal overflow at ${width}px (${dimensions.content}px)`);
        const path = resolve(resultsDir, `${name}-${width}-light.png`);
        await captureScreenshot(page, { path, fullPage: true });
        report.screenshots.push(path);
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      await audit(page, name, 'light');
      const before = await themeSnapshot(page);
      await page.locator('[data-theme-toggle]').click();
      const after = await themeSnapshot(page);
      assert.notDeepEqual(after, before, 'Theme toggle must change the displayed theme');
      await page.reload({ waitUntil: 'networkidle' });
      assert.deepEqual(await themeSnapshot(page), after, 'Selected theme must persist after reload');
      await audit(page, name, 'dark');
      const darkPath = resolve(resultsDir, `${name}-1440-dark.png`);
      await captureScreenshot(page, { path: darkPath, fullPage: true });
      report.screenshots.push(darkPath);
      await interactions(page);
      assert.deepEqual(errors, [], 'Browser errors or failed resources');
      report.browsers.push({ name, status: 'passed', harnessWarnings, checks: ['four responsive sizes', 'both themes', 'WCAG AA audit', 'theme persistence', 'mobile menu', 'project filters', 'modal focus', 'skills keyboard tabs', 'experience disclosure', 'contact validation and draft', 'privacy dialog', 'no application console errors or CSP violations outside screenshot capture'] });
      console.log(`PASS ${name}: responsive layout, accessibility, keyboard, themes, navigation, projects, contact`);
    } catch (error) {
      failures.push(`${name}: ${error.stack || error}`);
      report.browsers.push({ name, status: 'failed', reason: String(error) });
      await captureScreenshot(page, { path: resolve(resultsDir, `${name}-failure.png`), fullPage: true }).catch(() => {});
      console.error(`FAIL ${name}: ${error.message}`);
    } finally {
      await browser.close();
    }
  }
  if (failures.length) throw new Error(failures.join('\n\n'));
  assert.ok(report.browsers.some(({ status }) => status === 'passed'), 'No browser successfully completed the checks');
} finally {
  await writeFile(resolve(resultsDir, requestedBrowser ? `qa-report-${requestedBrowser}.json` : 'qa-report.json'), JSON.stringify(report, null, 2));
  await new Promise((accept) => server.close(accept));
}
console.log(`QA artifacts: ${resultsDir}`);
