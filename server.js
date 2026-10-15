// Missionathon timer server. Serves the site from dist/ and the small API the
// projector screens and the admin panel use. No database: the timer is kept in
// memory and in data/timer.json. Settings (admin password, port) are in
// settings.js.
//
//   node server.js          run the built site (dist/)
//   node server.js --dev    run from source with live reload (needs npm install)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, CONFIG_FILE, config, loadSettings } from './lib/config.js';

await loadSettings();
import state from './api/state.js';
import time from './api/time.js';
import login from './api/login.js';
import admin from './api/admin.js';
import image from './api/image.js';

const DEV = process.argv.includes('--dev');
const PORT = Number(process.env.PORT || config().port || 3000);
const DIST = path.join(ROOT, 'dist');
const routes = { '/api/state': state, '/api/time': time, '/api/login': login, '/api/admin': admin, '/api/image': image };

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
}

// Static files from dist/. Anything unknown gets the page itself, so /#control
// and / both work. Paths can't escape the dist folder.
function serveStatic(req, res) {
  let rel;
  try {
    rel = decodeURIComponent(req.url.split('?')[0]);
  } catch {
    rel = '/';
  }
  let file = path.normalize(path.join(DIST, rel));
  if (!file.startsWith(DIST + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  if (!fs.existsSync(file)) {
    res.statusCode = 500;
    return res.end('The site is not built. Run "npm run build" first.');
  }
  const ext = path.extname(file).toLowerCase();
  res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', ext === '.html' ? 'no-cache' : 'public, max-age=86400');
  fs.createReadStream(file).pipe(res);
}

const vite = DEV ? await (await import('vite')).createServer({ server: { middlewareMode: true }, appType: 'spa' }) : null;

http
  .createServer(async (req, res) => {
    securityHeaders(res);
    const p = req.url.split('?')[0];
    if (p.startsWith('/api/')) {
      const handler = routes[p];
      if (!handler) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        return res.end('{"error":"Not found"}');
      }
      return handler(req, res);
    }
    if (vite) return vite.middlewares(req, res);
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      return res.end();
    }
    serveStatic(req, res);
  })
  .listen(PORT, () => {
    console.log(`Missionathon timer running on port ${PORT}`);
    console.log(`  Projector:     http://localhost:${PORT}/`);
    console.log(`  Admin control: http://localhost:${PORT}/#control`);
    if (String(config().adminPassword || '').length < 8) console.log(`\n  ! Set "adminPassword" (8+ characters) in ${CONFIG_FILE} to use the admin control.`);
  });
