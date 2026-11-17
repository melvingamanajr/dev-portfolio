import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, devices, webkit } from 'playwright';
import { startServer } from './serve.mjs';

const browserName = process.argv.find((argument) => argument.startsWith('--browser='))?.split('=')[1] || 'chromium';
assert.ok(['chromium', 'webkit'].includes(browserName), 'Use --browser=chromium or --browser=webkit');
const engine = { chromium, webkit }[browserName];
async function availableExecutable() {
  if (existsSync(engine.executablePath()) || process.platform !== 'win32' || !process.env.LOCALAPPDATA) return undefined;
  const cache = process.env.PLAYWRIGHT_BROWSERS_PATH || resolve(process.env.LOCALAPPDATA, 'ms-playwright');
  const folders = (await readdir(cache).catch(() => [])).filter((entry) => entry.startsWith(`${browserName}-`)).sort((left, right) => Number(right.split('-').at(-1)) - Number(left.split('-').at(-1)));
  for (const folder of folders) {
    const executable = resolve(cache, folder, ...(browserName === 'chromium' ? ['chrome-win64', 'chrome.exe'] : ['Playwright.exe']));
    if (existsSync(executable)) return executable;
  }
}

const { server, url } = await startServer({ port: 0 });
let browser;
// Follow the public visual result, rather than comparing CSS declarations to
// themselves. Hidden content and running offscreen animation are the failures.
async function readable(page, selector) {
  await page.waitForFunction((target) => {
    const element = document.querySelector(target);
    if (!element || !element.getClientRects().length) return false;
    for (let current = element; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      if (current.hidden || style.visibility === 'hidden' || Number(style.opacity) < .98) return false;
    }
    return true;
  }, selector, { timeout: 3000 });
}
async function heroAnimations(page) {
  return page.locator('[data-hero-art]').evaluate((art) => art.getAnimations({ subtree: true }).filter((animation) => animation.effect?.getTiming().iterations === Infinity).map((animation) => ({ name: animation.animationName || 'web-animation', state: animation.playState })));
}
async function settledHero(page, playing) {
  await page.waitForFunction((shouldPlay) => {
    const art = document.querySelector('[data-hero-art]');
    const animations = art?.getAnimations({ subtree: true }).filter((animation) => animation.effect?.getTiming().iterations === Infinity) || [];
    return shouldPlay ? animations.some((animation) => animation.playState === 'running') : animations.every((animation) => animation.playState !== 'running');
  }, playing, { timeout: 3000 });
}
async function scrollTo(page, selector) {
  await page.locator(selector).evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
}
async function keyboardReveal(page) {
  // Reach content that has not been observed yet, using the normal tab order.
  const hasPendingTarget = await page.evaluate(() => {
    const focusable = [...document.querySelectorAll('a[href], button, input, textarea, select, [tabindex]')].filter((element) => element.tabIndex >= 0 && !element.disabled && element.getClientRects().length);
    const index = focusable.findIndex((element, position) => position > 0 && element.closest('.reveal-pending'));
    if (index < 1) return false;
    focusable[index - 1].focus({ preventScroll: true });
    return true;
  });
  if (!hasPendingTarget) return false;
  await page.keyboard.press('Tab');
  assert.ok(await page.evaluate(() => {
    if (document.activeElement === document.body) return false;
    for (let element = document.activeElement; element; element = element.parentElement) {
      const style = getComputedStyle(element);
      if (element.hidden || style.visibility === 'hidden' || Number(style.opacity) < .98) return false;
    }
    return true;
  }), 'Keyboard focus must expose its content immediately, without an invisible animation delay');
  return true;
}

async function scenario(name, options, motionAllowed) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await readable(page, '#hero-title');
    assert.equal(await page.locator('[data-hero-art]').count(), 1, 'The creative hero illustration should be present');
    assert.deepEqual(await page.locator('#main > section').evaluateAll((sections) => sections.filter((section) => section.getClientRects().length && !section.hidden).map((section) => section.id)), ['home', 'work', 'experience', 'about', 'skills', 'contact'], 'Motion must preserve every section in the scrolling document');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'The creative layout must fit the viewport');
    await settledHero(page, motionAllowed);
    const initialAnimations = await heroAnimations(page);
    if (options.reducedMotion === 'reduce') {
      assert.equal(await page.evaluate(() => document.getAnimations().filter((animation) => animation.effect?.getTiming().iterations === Infinity && animation.playState === 'running').length), 0, 'Reduced motion must stop continuous animation throughout the page');
      assert.equal(await page.locator('.reveal-pending').count(), 0, 'Reduced motion should expose content without a reveal delay');
    }
    const exercisedKeyboardReveal = await keyboardReveal(page);
    await scrollTo(page, '#work');
    await readable(page, '#work h2');
    await scrollTo(page, '#contact');
    await readable(page, '#contact h2');
    await settledHero(page, false);
    await page.waitForFunction(() => {
      const element = document.querySelector('.scroll-progress > span');
      const progress = element && new DOMMatrixReadOnly(getComputedStyle(element).transform).a;
      return progress > .5 && progress <= 1.01;
    }, null, { timeout: 3000 });
    assert.equal(await page.locator('.scroll-progress').getAttribute('aria-hidden'), 'true', 'Reading progress is decorative');
    await scrollTo(page, '#home');
    await settledHero(page, motionAllowed);
    // A direct link must not leave the destination behind an unobserved reveal.
    await page.goto(`${url}/#experience`, { waitUntil: 'networkidle' });
    await readable(page, '#experience h2');
    assert.ok(await page.locator('#experience h2').evaluate((heading) => { const bounds = heading.getBoundingClientRect(); return bounds.top < innerHeight && bounds.bottom > document.querySelector('.site-header').getBoundingClientRect().bottom; }), 'A direct section link should bring its readable heading into view');
    await settledHero(page, false);
    assert.deepEqual(errors, [], 'Creative motion must not produce runtime errors');
    return { scenario: name, heroContinuousAnimations: initialAnimations, keyboardReveal: exercisedKeyboardReveal ? 'checked' : 'no pending focusable target', result: 'passed' };
  } finally {
    await context.close();
  }
}

try {
  browser = await engine.launch({ headless: true, executablePath: await availableExecutable() });
  const scenarios = [
    ['desktop-natural-motion', { viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' }, true],
    ['mobile-natural-motion', { ...devices['Pixel 7'], reducedMotion: 'no-preference' }, false],
    ['desktop-reduced-motion', { viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }, false],
    ['mobile-reduced-motion', { ...devices['Pixel 7'], reducedMotion: 'reduce' }, false],
  ];
  const results = await Promise.allSettled(scenarios.map((entry) => scenario(...entry)));
  const failures = [];
  for (let index = 0; index < results.length; index++) {
    const result = results[index];
    if (result.status === 'fulfilled') console.log(JSON.stringify(result.value));
    else failures.push(`${scenarios[index][0]}: ${result.reason.stack || result.reason}`);
  }
  assert.deepEqual(failures, [], failures.join('\n'));
  console.log(`PASS ${browserName}: creative motion, offscreen pausing, mobile static art, reduced motion, keyboard visibility, deep links, and continuous scrolling`);
} finally {
  if (browser) await browser.close();
  await new Promise((accept) => server.close(accept));
}
