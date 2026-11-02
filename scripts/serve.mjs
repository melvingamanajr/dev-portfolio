import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(projectRoot, 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.pdf': 'application/pdf', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

export async function startServer({ port = 4173, host = '127.0.0.1' } = {}) {
  const server = http.createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { Allow: 'GET, HEAD' }).end();
        return;
      }
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const target = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (target !== root && !target.startsWith(`${root}${sep}`)) {
        response.writeHead(403).end('Forbidden');
        return;
      }
      const info = await stat(target);
      if (!info.isFile()) throw new Error('Not a file');
      const body = await readFile(target);
      response.writeHead(200, {
        'Content-Type': types[extname(target)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    }
  });
  await new Promise((accept, reject) => {
    server.once('error', reject);
    server.listen(port, host, accept);
  });
  return { server, url: `http://${host}:${server.address().port}` };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { server, url } = await startServer({ port: Number(process.env.PORT || 4173) });
  console.log(`Portfolio preview: ${url}`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}
