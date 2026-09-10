import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const fresh = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
// Yesterday's shell: same page, but pointing at a bundle hash that no longer exists.
const stale = fresh.replace(/\/assets\/index-[A-Za-z0-9_-]+\.js/, '/assets/index-YESTERDAY.js');

let served = 0;
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/' || url === '/index.html') {
    served++;
    // First hit = the stale shell the phone was holding. A reload revalidates
    // and gets the current one, exactly like Vercel's must-revalidate HTML.
    const body = served === 1 ? stale : fresh;
    console.log(`  server: GET / -> ${served === 1 ? 'STALE shell' : 'fresh shell'}`);
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' });
    return res.end(body);
  }

  const file = path.join(DIST, url);
  if (file.startsWith(DIST) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    return res.end(fs.readFileSync(file));
  }

  // The bug being reproduced: Vercel's SPA rewrite answers a missing asset
  // with the HTML shell, 200 OK. Chrome then refuses to execute it as a module.
  console.log(`  server: MISSING ${url} -> index.html as text/html (the bug)`);
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(fresh);
}).listen(5312, () => console.log('sim on 5312'));
