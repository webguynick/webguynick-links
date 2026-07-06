// ============================================================================
//  WebGuyNick Links — a self-hosted Linktree clone with full stats tracking.
//
//  Zero external dependencies. Run with:  node server.js
//
//  Env vars (all optional):
//    PORT            server port (default 3000)
//    STATS_PASSWORD  password for the /stats dashboard (default 'changeme')
//    TRUST_PROXY     '1' to read client IP from X-Forwarded-For (behind a
//                    reverse proxy / CDN like nginx, Cloudflare, Vercel)
// ============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const config = require('./config');
const { renderPage } = require('./lib/render');
const { renderStats } = require('./lib/stats');

const PORT = parseInt(process.env.PORT || '3000', 10);
const STATS_PASSWORD = process.env.STATS_PASSWORD || 'changeme';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';

const DATA_DIR = path.join(__dirname, 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.ndjson');
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ---- Event logging ---------------------------------------------------------
// Every event is one JSON object per line (NDJSON). Append-only = crash-safe
// and trivial to back up, tail, or import elsewhere.

function clientIp(req) {
  if (TRUST_PROXY) {
    const fwd = req.headers['x-forwarded-for'];
    if (fwd) return fwd.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '';
}

// A privacy-preserving visitor id: we never store raw IPs. We hash IP+UA with
// a per-day salt so a visitor is countable within a day but not identifiable
// across days, and the raw IP is never written to disk.
function visitorId(req) {
  const day = new Date().toISOString().slice(0, 10);
  const raw = clientIp(req) + '|' + (req.headers['user-agent'] || '') + '|' + day;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

function parseDevice(ua = '') {
  const s = ua.toLowerCase();
  let device = 'desktop';
  if (/ipad|tablet|kindle|playbook|silk/.test(s)) device = 'tablet';
  else if (/mobi|iphone|android.*mobile|phone|ipod/.test(s)) device = 'mobile';

  let os = 'other';
  if (/windows/.test(s)) os = 'Windows';
  else if (/iphone|ipad|ipod|ios/.test(s)) os = 'iOS';
  else if (/mac os x|macintosh/.test(s)) os = 'macOS';
  else if (/android/.test(s)) os = 'Android';
  else if (/linux/.test(s)) os = 'Linux';

  let browser = 'other';
  if (/edg\//.test(s)) browser = 'Edge';
  else if (/chrome|crios/.test(s) && !/edg\//.test(s)) browser = 'Chrome';
  else if (/firefox|fxios/.test(s)) browser = 'Firefox';
  else if (/safari/.test(s) && !/chrome|crios/.test(s)) browser = 'Safari';

  return { device, os, browser };
}

function refHost(referer = '') {
  if (!referer) return 'direct';
  try {
    const h = new URL(referer).hostname.replace(/^www\./, '');
    return h || 'direct';
  } catch {
    return 'direct';
  }
}

function logEvent(req, type, extra = {}) {
  const ua = req.headers['user-agent'] || '';
  const { device, os, browser } = parseDevice(ua);
  const event = {
    ts: new Date().toISOString(),
    type, // 'pageview' | 'click'
    visitor: visitorId(req),
    referrer: refHost(req.headers['referer'] || req.headers['referrer'] || ''),
    device,
    os,
    browser,
    ...extra,
  };
  fs.appendFile(EVENTS_FILE, JSON.stringify(event) + '\n', (err) => {
    if (err) console.error('Failed to log event:', err.message);
  });
}

// ---- Static file serving ---------------------------------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

function serveStatic(req, res, urlPath) {
  // Prevent path traversal.
  const safePath = path
    .normalize(decodeURIComponent(urlPath))
    .replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return send(res, 403, 'Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'Not found');
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
    });
    res.end(data);
  });
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', ...headers });
  res.end(body);
}

// ---- Auth for /stats -------------------------------------------------------

function checkAuth(req) {
  const header = req.headers['authorization'] || '';
  if (!header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const idx = decoded.indexOf(':');
  const pass = idx === -1 ? decoded : decoded.slice(idx + 1);
  // Constant-time comparison.
  const a = Buffer.from(pass);
  const b = Buffer.from(STATS_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---- Request router --------------------------------------------------------

const linkById = {};
for (const l of [...config.links, ...config.socials]) linkById[l.id] = l;

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsed.pathname;

  // Home page — the public links page.
  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    logEvent(req, 'pageview', { path: '/' });
    const html = renderPage(config);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  // Tracked redirect: /r/<id> logs a click, then 302s to the destination.
  // Works even with JavaScript disabled — clicks are always counted.
  if (req.method === 'GET' && pathname.startsWith('/r/')) {
    const id = pathname.slice(3);
    const link = linkById[id];
    if (!link) return send(res, 404, 'Unknown link');
    logEvent(req, 'click', { linkId: id, title: link.title || link.icon, url: link.url });
    res.writeHead(302, { Location: link.url, 'Cache-Control': 'no-store' });
    return res.end();
  }

  // Optional richer client beacon (screen size etc.) — best effort.
  if (req.method === 'POST' && pathname === '/api/beacon') {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > 2048) req.destroy();
    });
    req.on('end', () => {
      let extra = {};
      try {
        const j = JSON.parse(body || '{}');
        if (j.screen) extra.screen = String(j.screen).slice(0, 20);
        if (j.lang) extra.lang = String(j.lang).slice(0, 12);
      } catch {}
      logEvent(req, 'beacon', extra);
      send(res, 204, '');
    });
    return;
  }

  // Stats dashboard (password protected).
  if (req.method === 'GET' && (pathname === '/stats' || pathname === '/stats/')) {
    if (!checkAuth(req)) {
      return send(res, 401, 'Authentication required', {
        'WWW-Authenticate': 'Basic realm="Stats", charset="UTF-8"',
      });
    }
    const events = readEvents();
    const html = renderStats(events, config);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  // Raw stats JSON (same auth) — for exporting / custom dashboards.
  if (req.method === 'GET' && pathname === '/stats/events.json') {
    if (!checkAuth(req)) {
      return send(res, 401, 'Authentication required', {
        'WWW-Authenticate': 'Basic realm="Stats", charset="UTF-8"',
      });
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(readEvents()));
  }

  // Health check.
  if (req.method === 'GET' && pathname === '/healthz') {
    return send(res, 200, 'ok');
  }

  // Everything else -> static files in /public.
  if (req.method === 'GET') {
    return serveStatic(req, res, pathname);
  }

  send(res, 405, 'Method not allowed');
});

function readEvents() {
  try {
    const raw = fs.readFileSync(EVENTS_FILE, 'utf8');
    return raw
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

server.listen(PORT, () => {
  console.log(`\n  WebGuyNick Links running:`);
  console.log(`    Public page : http://localhost:${PORT}/`);
  console.log(`    Stats board : http://localhost:${PORT}/stats  (user: any, pass: ${STATS_PASSWORD})`);
  console.log(`\n  Edit config.js to change your profile & links.\n`);
});
