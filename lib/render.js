// Renders the public links page HTML from config.

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Minimal inline SVG icon set (currentColor). Keys match config.socials.icon.
const ICONS = {
  youtube: '<path d="M23 12s0-3.6-.46-5.32a2.78 2.78 0 0 0-1.95-1.96C18.88 4.25 12 4.25 12 4.25s-6.88 0-8.59.47A2.78 2.78 0 0 0 1.46 6.7 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.32 2.78 2.78 0 0 0 1.95 1.96c1.71.47 8.59.47 8.59.47s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.96C23 15.6 23 12 23 12zM9.75 15.25v-6.5L15.5 12z"/>',
  instagram: '<rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.4" cy="6.6" r="1.3"/>',
  tiktok: '<path d="M16.5 3c.4 2.3 1.8 3.9 4 4.2v3c-1.5.1-2.8-.3-4-1v6.1c0 4-2.9 6.7-6.6 6.1-3-.5-4.9-3.4-4.3-6.4.5-2.6 3-4.4 5.7-4v3.1c-.5-.1-1-.1-1.5 0-1.2.3-1.9 1.4-1.6 2.6.3 1.2 1.5 1.9 2.7 1.5 1-.3 1.5-1.1 1.5-2.3V3z"/>',
  x: '<path d="M18.9 3H21l-6.5 7.4L22 21h-6.2l-4.3-5.6L6.5 21H4l7-7.9L3.5 3h6.3l3.9 5.2zm-1.1 16.2h1.3L8.3 4.7H6.9z"/>',
  github: '<path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/>',
  linkedin: '<path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57z"/>',
  facebook: '<path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/>',
  twitch: '<path d="M4.3 3 3 6.6v13.1h4.4V22h2.5l2.3-2.3h3.6L21 15V3zm14.5 11.1-2.5 2.5h-3.9l-2.3 2.3v-2.3H6.9V4.7h11.9z"/><path d="M13.6 7.9h1.7v4.5h-1.7zm4.5 0H16.4v4.5h1.7z"/>',
  email: '<path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm.4 2 8.6 6 8.6-6zM4 8.3V17h16V8.3l-8 5.6z"/>',
  website: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.95a15.7 15.7 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.9 8zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14a7.96 7.96 0 0 1 0-4h3.38a16.5 16.5 0 0 0 0 4zm.84 2h2.95c.35 1.28.82 2.5 1.38 3.56A8.03 8.03 0 0 1 5.1 16zm2.95-8H5.1a8.03 8.03 0 0 1 4.33-3.56A15.7 15.7 0 0 0 8.05 8zM12 19.96a13.5 13.5 0 0 1-1.91-3.96h3.82A13.5 13.5 0 0 1 12 19.96zM14.36 14H9.64a14.7 14.7 0 0 1 0-4h4.72a14.7 14.7 0 0 1 0 4zm.53 5.56c.56-1.06 1.03-2.28 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56zM16.36 14a16.5 16.5 0 0 0 0-4h3.38a7.96 7.96 0 0 1 0 4z"/>',
};

function iconSvg(key) {
  const body = ICONS[key] || ICONS.website;
  return `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">${body}</svg>`;
}

function renderPage(config) {
  const { profile, links, socials } = config;
  const t = profile.theme;

  const linkButtons = links
    .map((l) => {
      const sub = l.subtitle ? `<span class="sub">${esc(l.subtitle)}</span>` : '';
      const cls = l.featured ? 'link featured' : 'link';
      return `<a class="${cls}" href="/r/${esc(l.id)}" rel="noopener">
        <span class="link-title">${esc(l.title)}${sub}</span>
        <span class="arrow" aria-hidden="true">→</span>
      </a>`;
    })
    .join('\n');

  const socialIcons = socials
    .map(
      (s) =>
        `<a class="social" href="/r/${esc(s.id)}" rel="noopener" aria-label="${esc(s.icon)}">${iconSvg(s.icon)}</a>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(profile.pageTitle || profile.name)}</title>
<meta name="description" content="${esc(profile.bio)}">
<meta property="og:title" content="${esc(profile.pageTitle || profile.name)}">
<meta property="og:description" content="${esc(profile.bio)}">
<meta property="og:type" content="website">
<link rel="icon" href="/favicon.svg">
<style>
:root{
  --bg-start:${esc(t.bgStart)}; --bg-end:${esc(t.bgEnd)};
  --accent:${esc(t.accent)}; --text:${esc(t.text)}; --muted:${esc(t.muted)};
}
*{box-sizing:border-box;margin:0;padding:0}
body{
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  color:var(--text);min-height:100vh;
  background:linear-gradient(160deg,var(--bg-start),var(--bg-end));
  display:flex;justify-content:center;padding:56px 20px 40px;
}
.wrap{width:100%;max-width:560px;text-align:center}
.avatar{
  width:96px;height:96px;border-radius:50%;object-fit:cover;
  border:3px solid rgba(255,255,255,.15);
  box-shadow:0 8px 30px rgba(0,0,0,.35);margin:0 auto 16px;display:block;background:#000;
}
h1{font-size:1.5rem;font-weight:700;letter-spacing:-.01em}
.handle{color:var(--muted);font-size:.95rem;margin-top:2px}
.bio{color:var(--text);opacity:.85;margin:14px auto 28px;max-width:420px;line-height:1.5;font-size:.98rem}
.links{display:flex;flex-direction:column;gap:14px}
.link{
  display:flex;align-items:center;justify-content:space-between;
  background:rgba(255,255,255,.08);backdrop-filter:blur(8px);
  border:1px solid rgba(255,255,255,.12);border-radius:14px;
  padding:16px 20px;color:var(--text);text-decoration:none;font-weight:600;
  transition:transform .12s ease,background .2s ease,border-color .2s ease;
}
.link:hover{transform:translateY(-2px);background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.25)}
.link.featured{background:var(--accent);border-color:transparent;box-shadow:0 8px 24px rgba(139,92,246,.35)}
.link.featured:hover{filter:brightness(1.08)}
.link-title{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left}
.sub{font-weight:400;font-size:.8rem;color:var(--muted)}
.link.featured .sub{color:rgba(255,255,255,.85)}
.arrow{opacity:.6;font-size:1.1rem}
.socials{display:flex;justify-content:center;gap:18px;margin-top:32px}
.social{color:var(--muted);transition:color .2s ease,transform .12s ease;display:inline-flex}
.social:hover{color:var(--text);transform:translateY(-2px)}
.footer{margin-top:36px;color:var(--muted);font-size:.75rem;opacity:.7}
.footer a{color:var(--muted)}
</style>
</head>
<body>
<main class="wrap">
  <img class="avatar" src="${esc(profile.avatar)}" alt="${esc(profile.name)}" width="96" height="96">
  <h1>${esc(profile.name)}</h1>
  <div class="handle">${esc(profile.handle)}</div>
  <p class="bio">${esc(profile.bio)}</p>
  <nav class="links">
    ${linkButtons}
  </nav>
  <div class="socials">
    ${socialIcons}
  </div>
  <div class="footer">© <span id="yr"></span> ${esc(profile.name)}</div>
</main>
<script>
  document.getElementById('yr').textContent = new Date().getFullYear();
  // Best-effort richer pageview beacon (screen size + language).
  try{
    navigator.sendBeacon('/api/beacon', JSON.stringify({
      screen: window.screen ? (screen.width+'x'+screen.height) : '',
      lang: navigator.language || ''
    }));
  }catch(e){}
</script>
</body>
</html>`;
}

module.exports = { renderPage, esc, iconSvg };
