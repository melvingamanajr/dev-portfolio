import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const htmlPath = fileURLToPath(new URL('../dist/index.html', import.meta.url));
let html = (await readFile(htmlPath, 'utf8')).replace(/\r\n?/g, '\n');
const hashes = (tag) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi'))]
  .map((match) => `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`);
const policy = ["default-src 'none'", `script-src ${hashes('script').join(' ')}`, `style-src ${hashes('style').join(' ')}`, "img-src 'self' data:", "font-src 'self'", "connect-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"].join('; ');
html = html.replace(/(<meta http-equiv="Content-Security-Policy" content=")[^"]*(">)/, `$1${policy}$2`);
await writeFile(htmlPath, html);
const headers = `/*\n  Content-Security-Policy: ${policy}; frame-ancestors 'none'\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Content-Type-Options: nosniff\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n\n/assets/*\n  Cache-Control: public, max-age=86400\n`;
await writeFile(new URL('../dist/_headers', import.meta.url), headers);
console.log('Updated inline CSP hashes and static-host security headers.');
