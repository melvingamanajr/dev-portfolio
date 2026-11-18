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
const playable = 'a[href="https://melvingamanajr.github.io/hangman-game/src/index.html"]';
async function geometry(page) {
  return page.locator('[data-preview]').evaluate((frame) => {
    const image = frame.querySelector('[data-preview-image]');
    const frameBounds = frame.getBoundingClientRect();
    const imageBounds = image.getBoundingClientRect();
    // Reveal translations alter painted bounds without moving surrounding
    // content. Measure document flow independently of that transient transform.
    let flowTop = 0;
    for (let current = frame; current; current = current.offsetParent) flowTop += current.offsetTop;
    return { top: flowTop, width: frameBounds.width, height: frameBounds.height, imageWidth: imageBounds.width, imageHeight: imageBounds.height };
  });
}
async function pendingScenario(label, options, outcome = 'loaded') {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  let release;
  let requested = false;
  const gate = new Promise((resolveGate) => { release = resolveGate; });
  await page.route('**/assets/hangman-preview.*', async (route) => {
    requested = true;
    await gate;
    if (outcome === 'error') await route.abort('failed');
    else await route.continue();
  });
  try {
    const imageRequest = page.waitForRequest('**/assets/hangman-preview.*', { timeout: 3000 });
    await page.goto(`${url}/#work`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-preview]').scrollIntoViewIfNeeded();
    await imageRequest;
    await page.waitForFunction(() => {
      const frame = document.querySelector('[data-preview]');
      const skeleton = frame?.querySelector('[data-preview-skeleton]');
      return frame?.getAttribute('aria-busy') === 'true' && skeleton && !skeleton.hidden && skeleton.getClientRects().length > 0;
    }, null, { timeout: 3000 });
    // The handler has actually intercepted a network request. This state is not
    // produced by an arbitrary timeout or by adding a loading class in the test.
    assert.ok(requested, 'Skeleton must cover the pending real product image request');
    assert.equal(await page.locator('[data-preview-skeleton]').getAttribute('aria-hidden'), 'true', 'The illustrative skeleton must be decorative');
    assert.equal(await page.locator('[data-preview-status]').getAttribute('role'), 'status', 'Real loading has one accessible status');
    assert.ok(await page.locator('[data-preview-status]').isVisible(), 'Loading feedback remains available while the image is pending');
    assert.equal(await page.locator('[data-preview-error]').isVisible(), false, 'The image must not report an error before its request completes');
    await page.locator(playable).first().click({ trial: true });
    assert.ok(await page.locator('#work h2').isVisible(), 'Project copy must be available before its image finishes');
    const menu = page.locator('[data-menu-toggle]');
    if (await menu.isVisible()) {
      await menu.click();
      assert.equal(await menu.getAttribute('aria-expanded'), 'true', 'Mobile navigation must work while the image loads');
      await page.keyboard.press('Escape');
    } else {
      await page.locator('#primary-nav a[href="#home"]').click({ trial: true });
    }
    const before = await geometry(page);
    assert.ok(before.imageWidth > 0 && before.imageHeight > 0, 'A pending product image must reserve its layout');
    assert.ok(Math.abs(before.imageWidth / before.imageHeight - 1100 / 760) < .01, 'Pending image space must retain the final screenshot aspect ratio');
    if (options.reducedMotion === 'reduce' || options.isMobile || options.hasTouch) {
      const running = await page.locator('[data-preview-skeleton]').evaluate((skeleton) => skeleton.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length);
      assert.equal(running, 0, 'Reduced-motion and coarse-pointer skeletons must remain static');
    }
    release();
    await page.waitForFunction((expected) => {
      const frame = document.querySelector('[data-preview]');
      return frame?.classList.contains(`is-${expected}`) && frame.getAttribute('aria-busy') === 'false';
    }, outcome, { timeout: 3000 });
    assert.equal(await page.locator('[data-preview-skeleton]').isVisible(), false, 'A completed request must remove its skeleton');
    assert.equal(await page.locator('[data-preview-status]').isVisible(), false, 'A completed request must clear its loading announcement');
    assert.equal(await page.locator('[data-preview-error]').isVisible(), outcome === 'error', 'Only a failed image exposes the preview error');
    assert.ok(await page.locator(playable).first().isVisible(), 'The direct game link survives either image result');
    const after = await geometry(page);
    for (const dimension of ['top', 'width', 'height', 'imageWidth', 'imageHeight']) {
      assert.ok(Math.abs(after[dimension] - before[dimension]) < 1, `Image completion must preserve ${dimension}, rather than shifting content (before: ${before[dimension]}, after: ${after[dimension]})`);
    }
    if (outcome === 'loaded') {
      assert.ok(await page.locator('[data-preview-image]').evaluate(async (image) => {
        await image.decode();
        return image.complete && image.naturalWidth > 0;
      }), 'The successful state must expose a decoded product screenshot');
    }
    assert.deepEqual(pageErrors, [], 'Skeleton feedback must not cause runtime errors');
    console.log(`PASS ${browserName}: ${label} (${outcome})`);
  } finally {
    release();
    await context.close();
  }
}

async function noScriptFallback() {
  const context = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 } });
  try {
    const page = await context.newPage();
    await page.goto(`${url}/#work`, { waitUntil: 'load' });
    await page.locator('[data-preview-image]').evaluate((image) => image.scrollIntoView({ block: 'center', behavior: 'instant' }));
    assert.equal(await page.locator('[data-preview-skeleton]').isVisible(), false, 'No-JavaScript visitors must never be stuck on a skeleton');
    assert.ok(await page.locator('[data-preview-image]').isVisible(), 'The real product image remains visible without JavaScript');
    assert.ok(await page.locator(playable).first().isVisible(), 'The direct game link remains available without JavaScript');
    console.log(`PASS ${browserName}: no-JavaScript image fallback`);
  } finally {
    await context.close();
  }
}

try {
  browser = await engine.launch({ executablePath: await availableExecutable(), headless: true });
  for (const theme of ['dark', 'light']) {
    await pendingScenario(`desktop ${theme}`, { viewport: { width: 1440, height: 1000 }, colorScheme: theme, reducedMotion: 'no-preference' });
    await pendingScenario(`Pixel 7 ${theme}`, { ...devices['Pixel 7'], colorScheme: theme, reducedMotion: 'no-preference' });
  }
  await pendingScenario('reduced motion', { viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await pendingScenario('failed image', { ...devices['Pixel 7'], reducedMotion: 'reduce' }, 'error');
  await noScriptFallback();
} finally {
  await browser?.close();
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
}
