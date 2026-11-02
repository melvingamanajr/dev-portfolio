import { createServer } from 'node:http';
import { readFile, copyFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from '../../melvin-portfolio/node_modules/playwright/index.mjs';

const root = resolve(import.meta.dirname, 'src');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const server = createServer(async (req, res) => {
  try {
    const file = resolve(root, '.' + (new URL(req.url, 'http://localhost').pathname === '/' ? '/index.html' : new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Users/m-gamana/AppData/Local/ms-playwright/chromium-1200/chrome-win64/chrome.exe' });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 }, reducedMotion: 'reduce' });
  await page.addInitScript(() => { localStorage.setItem('hangmanMuted', 'true'); Math.random = () => 0.5; });
  await page.route('**/assets/sounds/**', r => r.abort());
  await page.route('https://**', r => r.abort());
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#start-game-btn').click();
  await page.locator('#category-buttons-container button').first().click();
  await page.locator('#difficulty-buttons button').first().click();
  await page.locator('#game-screen').waitFor({ state: 'visible' });
  await page.keyboard.press('e');
  await page.keyboard.press('l');
  await page.keyboard.press('a');
  const panel = await page.locator('.game-content-wrapper').boundingBox();
  await page.screenshot({ path: resolve(import.meta.dirname, 'hangman-preview.png'), clip: { x: 50, y: panel.y - 30, width: 1100, height: 760 } });
  await copyFile(resolve(import.meta.dirname, 'hangman-preview.png'), resolve(import.meta.dirname, '../../melvin-portfolio/dist/assets/hangman-preview.png'));
  console.log(JSON.stringify({ title: await page.title(), screenshot: 'hangman-preview.png', source: 'downloaded main branch, local screenshot', errors }));
} finally { await browser.close(); await new Promise(r => server.close(r)); }
