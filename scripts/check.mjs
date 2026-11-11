import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, access } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const html = await readFile(resolve(root, 'index.html'), 'utf8');
const checks = [];
function check(name, fn) { fn(); checks.push(name); }
const attributes = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/gs)].map((match) => [match[1].toLowerCase(), match[3]]));

check('Complete English HTML document and responsive viewport', () => {
  assert.match(html, /<!doctype html>/i);
  assert.match(html, /<html\b[^>]*lang=["']en(?:-[A-Za-z]+)?["']/i);
  assert.match(html, /<meta\b[^>]*name=["']viewport["'][^>]*>/i);
  assert.match(html, /<title>[^<]+<\/title>/i);
  assert.equal([...html.matchAll(/<h1\b/gi)].length, 1, 'Use exactly one main heading');
});

const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => attributes(match[0]));
const csp = metas.find((meta) => meta['http-equiv']?.toLowerCase() === 'content-security-policy')?.content;
check('Inline scripts and styles match the Content Security Policy hashes', () => {
  assert.ok(csp, 'Missing Content-Security-Policy meta element');
  assert.ok(!csp.includes("'unsafe-inline'"), 'Inline content must use hashes');
  assert.ok(!csp.includes("'unsafe-eval'"), 'Runtime evaluation must remain disabled');
  const directives = Object.fromEntries(csp.split(';').map((value) => value.trim().split(/\s+/)).filter(([key]) => key).map(([key, ...values]) => [key, values]));
  assert.ok(directives['default-src']?.includes("'none'"), 'Default policy should deny undeclared resources');
  assert.ok(directives['object-src']?.includes("'none'"), 'Object embedding must be disabled');
  for (const [tagName, directive] of [['script', 'script-src'], ['style', 'style-src']]) {
    const blocks = [...html.matchAll(new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, 'gi'))];
    for (const [, rawAttributes, content] of blocks) {
      const attrs = attributes(rawAttributes);
      assert.ok(!attrs.src, 'All runtime JavaScript must be embedded in the standalone HTML');
      // JSON data blocks do not execute and are not subject to script-src.
      if (tagName === 'script' && /^(application\/ld\+json|application\/json)$/i.test(attrs.type || '')) continue;
      const digest = `'sha256-${createHash('sha256').update(content.replace(/\r\n?/g, '\n')).digest('base64')}'`;
      assert.ok(directives[directive]?.includes(digest), `${tagName} content changed: update the ${directive} CSP hash to ${digest}`);
    }
  }
  assert.doesNotMatch(html, /\s(?:on[a-z]+|style)\s*=/i, 'Inline handlers or style attributes would violate the hash policy');
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = attributes(tag);
    assert.notEqual(attrs.rel, 'stylesheet', 'All runtime CSS must be embedded in the standalone HTML');
  }
});

check('Inline JavaScript parses successfully', () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  scripts.forEach(([, rawAttributes, content], index) => {
    const { type } = attributes(rawAttributes);
    if (type && /json$/i.test(type)) return;
    new Script(content, { filename: `portfolio-inline-${index}.js` });
  });
});

check('Unique IDs, valid fragment targets, and safe external links', () => {
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'Duplicate element IDs');
  const idSet = new Set(ids);
  for (const [, fragment] of html.matchAll(/\bhref=["']#([^"']+)["']/g)) assert.ok(idSet.has(fragment), `Broken fragment: #${fragment}`);
  for (const [, tag] of html.matchAll(/(<a\b[^>]*>)/gi)) {
    const attrs = attributes(tag);
    if (attrs.target === '_blank') assert.match(attrs.rel || '', /\bnoopener\b/, 'New tabs require rel="noopener"');
    assert.ok(!attrs.href?.startsWith('javascript:'), 'JavaScript navigation is prohibited');
  }
});

check('Machine-readable profile JSON is valid', () => {
  const jsonBlocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(([, raw]) => /type=["']application\/(?:ld\+)?json["']/i.test(raw));
  assert.ok(jsonBlocks.length, 'Missing JSON profile or structured data');
  for (const [, , content] of jsonBlocks) assert.ok(JSON.parse(content), 'Invalid embedded JSON');
});

const localAssets = [...html.matchAll(/<(?:a|link|script|img|source)\b[^>]*>/gi)].flatMap(([tag]) => {
  const attrs = attributes(tag);
  return [attrs.src, attrs.href].filter((value) => value && !/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value));
});
for (const asset of localAssets) {
  const pathname = decodeURIComponent(asset.split(/[?#]/)[0]);
  const path = resolve(root, `.${pathname.startsWith('/') ? '' : '/'}${pathname}`);
  assert.ok(path === root || path.startsWith(`${root}${sep}`), `Asset escapes dist: ${asset}`);
  await access(path);
}
checks.push(`All ${localAssets.length} local asset references exist`);
for (const result of checks) console.log(`PASS ${result}`);
