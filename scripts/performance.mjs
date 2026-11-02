import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { chromium, devices } from 'playwright';
import { startServer } from './serve.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = join(projectRoot, 'dist');
const outputPath = join(projectRoot, 'test-results', 'performance.json');

async function browserPath() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1200', 'chrome-win64', 'chrome.exe'),
    chromium.executablePath(),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { await access(candidate); return candidate; } catch { /* Try the next installed browser. */ }
  }
  throw new Error('No Chromium installation found. Set CHROME_PATH or run npx playwright install chromium.');
}

async function assetSizes(directory) {
  const assets = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) assets.push(...await assetSizes(path));
    else if (entry.isFile()) {
      const body = await readFile(path);
      assets.push({ path: relative(distRoot, path).replaceAll('\\', '/'), rawBytes: body.byteLength, gzipBytes: gzipSync(body).byteLength });
    }
  }
  return assets;
}

const rounded = value => Math.round(value * 100) / 100;
const { server, url } = await startServer({ port: 0 });
let browser;
try {
  const executablePath = await browserPath();
  browser = await chromium.launch({ executablePath, headless: true });
  const runs = [];
  for (const [name, contextOptions] of [
    ['desktop', { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 }],
    ['mobile', { ...devices['Pixel 7'] }],
  ]) {
    const context = await browser.newContext(contextOptions);
    try {
      const page = await context.newPage();
      await page.addInitScript(() => {
        const metrics = { lcp: 0, cls: 0, longTaskCount: 0 };
        for (const [type, update] of [
          ['largest-contentful-paint', entries => { for (const entry of entries) metrics.lcp = entry.startTime; }],
          ['layout-shift', entries => { for (const entry of entries) if (!entry.hadRecentInput) metrics.cls += entry.value; }],
          ['longtask', entries => { metrics.longTaskCount += entries.length; }],
        ]) {
          if (PerformanceObserver.supportedEntryTypes.includes(type)) {
            const observer = new PerformanceObserver(list => update(list.getEntries()));
            observer.observe({ type, buffered: true });
          }
        }
        window.__portfolioMetrics = metrics;
      });
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForLoadState('networkidle');
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise(accept => requestAnimationFrame(() => requestAnimationFrame(accept)));
      });
      const timings = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paints = performance.getEntriesByType('paint');
        const resources = [navigation, ...performance.getEntriesByType('resource')];
        return {
          fcpMs: paints.find(entry => entry.name === 'first-contentful-paint')?.startTime ?? null,
          lcpMs: window.__portfolioMetrics.lcp || null,
          cls: window.__portfolioMetrics.cls,
          domContentLoadedMs: navigation.domContentLoadedEventEnd,
          loadMs: navigation.loadEventEnd,
          responseMs: navigation.responseEnd,
          longTaskCount: window.__portfolioMetrics.longTaskCount,
          resourceCount: resources.length,
          encodedBodyBytes: resources.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
          transferBytes: resources.reduce((sum, entry) => sum + entry.transferSize, 0),
        };
      });
      runs.push({ name, viewport: contextOptions.viewport, ...Object.fromEntries(Object.entries(timings).map(([key, value]) => [key, typeof value === 'number' ? rounded(value) : value])) });
    } finally { await context.close(); }
  }
  const assets = (await assetSizes(distRoot)).sort((a, b) => b.rawBytes - a.rawBytes);
  const report = {
    generatedAt: new Date().toISOString(),
    methodology: 'Local, unthrottled Chromium measurements of the initial viewport with a fresh browser context per device. These are not Lighthouse scores or production benchmarks. Gzip sizes are estimates; the local preview server does not compress responses. CLS covers the initial observation period only.',
    browser: { version: browser.version(), executablePath },
    runs,
    assetBudget: {
      rawBytes: assets.reduce((sum, asset) => sum + asset.rawBytes, 0),
      gzipBytes: assets.reduce((sum, asset) => sum + asset.gzipBytes, 0),
      assets,
    },
  };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(report.methodology);
  console.table(runs);
  console.log(`Static assets: ${report.assetBudget.rawBytes} bytes raw; ${report.assetBudget.gzipBytes} bytes gzip estimate.`);
  console.log(`Report: ${outputPath}`);
} finally {
  await browser?.close();
  await new Promise((accept, reject) => server.close(error => error ? reject(error) : accept()));
}
