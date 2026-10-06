import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./dist/', import.meta.url)));
await stat(resolve(root, 'index.html'));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.startsWith('/api/')) { res.writeHead(404); res.end('API unavailable on static deployment'); return; }
    const target = resolve(root, '.' + pathname);
    if (!target.startsWith(root + sep) && target !== resolve(root)) { res.writeHead(403); res.end(); return; }
    let file = target;
    try { if (!(await stat(file)).isFile()) file = resolve(root, 'index.html'); }
    catch { if (extname(pathname)) { res.writeHead(404); res.end(); return; } file = resolve(root, 'index.html'); }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(400); res.end('Invalid request'); }
});
server.listen(Number(process.env.PORT || 8080), '0.0.0.0', () => console.log('Passion Go listening on PORT=' + (process.env.PORT || 8080)));
