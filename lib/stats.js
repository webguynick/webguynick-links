// Aggregates the NDJSON event log into a stats dashboard.

const { esc } = require('./render');

function pct(n, total) {
  if (!total) return '0%';
  return Math.round((n / total) * 100) + '%';
}

function topN(counter, n = 8) {
  return Object.entries(counter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

function bar(label, value, max, sublabel = '') {
  const w = max ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return `<div class="row">
    <div class="row-label" title="${esc(label)}">${esc(label)}${sublabel ? `<span class="row-sub">${esc(sublabel)}</span>` : ''}</div>
    <div class="row-track"><div class="row-fill" style="width:${w}%"></div></div>
    <div class="row-val">${value.toLocaleString()}</div>
  </div>`;
}

function renderStats(events, config) {
  const pageviews = events.filter((e) => e.type === 'pageview');
  const clicks = events.filter((e) => e.type === 'click');

  const totalViews = pageviews.length;
  const totalClicks = clicks.length;
  const uniqueVisitors = new Set(events.map((e) => e.visitor)).size;
  const ctr = totalViews ? pct(totalClicks, totalViews) : '—';

  // Clicks per link.
  const clicksByLink = {};
  for (const c of clicks) {
    const key = c.title || c.linkId || 'unknown';
    clicksByLink[key] = (clicksByLink[key] || 0) + 1;
  }

  // Referrers / device / os / browser (across all events with those fields).
  const refCount = {};
  const deviceCount = {};
  const osCount = {};
  const browserCount = {};
  for (const e of events) {
    if (e.referrer) refCount[e.referrer] = (refCount[e.referrer] || 0) + 1;
    if (e.device) deviceCount[e.device] = (deviceCount[e.device] || 0) + 1;
    if (e.os) osCount[e.os] = (osCount[e.os] || 0) + 1;
    if (e.browser) browserCount[e.browser] = (browserCount[e.browser] || 0) + 1;
  }

  // Views over the last 14 days.
  const days = [];
  const dayMap = {};
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
    days.push(d);
    dayMap[d] = 0;
  }
  for (const p of pageviews) {
    const d = (p.ts || '').slice(0, 10);
    if (d in dayMap) dayMap[d]++;
  }
  const maxDay = Math.max(1, ...days.map((d) => dayMap[d]));

  const linkRows = topN(clicksByLink, 20);
  const maxLink = linkRows.length ? linkRows[0][1] : 1;
  const maxRef = Math.max(1, ...Object.values(refCount));

  const spark = days
    .map((d) => {
      const h = Math.round((dayMap[d] / maxDay) * 100);
      return `<div class="spark-col" title="${d}: ${dayMap[d]} views">
        <div class="spark-bar" style="height:${Math.max(3, h)}%"></div>
        <div class="spark-day">${d.slice(5)}</div>
      </div>`;
    })
    .join('');

  const statsSince = events.length ? esc(events[0].ts.slice(0, 10)) : '—';

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Stats — ${esc(config.profile.name)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
  background:#0b1020;color:#e5e7eb;padding:32px 20px 60px;line-height:1.4}
.wrap{max-width:860px;margin:0 auto}
h1{font-size:1.5rem;margin-bottom:4px}
.sub{color:#94a3b8;font-size:.85rem;margin-bottom:28px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:32px}
.card{background:#151b2e;border:1px solid #232a41;border-radius:14px;padding:18px 20px}
.card .num{font-size:2rem;font-weight:700;letter-spacing:-.02em}
.card .lbl{color:#94a3b8;font-size:.8rem;margin-top:4px;text-transform:uppercase;letter-spacing:.04em}
.card .num.accent{color:#a78bfa}
section{background:#151b2e;border:1px solid #232a41;border-radius:14px;padding:22px 24px;margin-bottom:22px}
section h2{font-size:1rem;margin-bottom:16px;font-weight:600}
.row{display:grid;grid-template-columns:180px 1fr 60px;align-items:center;gap:12px;margin-bottom:10px}
.row-label{font-size:.85rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row-sub{color:#64748b;font-size:.75rem;margin-left:6px}
.row-track{background:#0b1020;border-radius:6px;height:12px;overflow:hidden}
.row-fill{background:linear-gradient(90deg,#8b5cf6,#6366f1);height:100%;border-radius:6px}
.row-val{text-align:right;font-variant-numeric:tabular-nums;font-size:.85rem;color:#cbd5e1}
.spark{display:flex;align-items:flex-end;gap:6px;height:140px;margin-top:6px}
.spark-col{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%}
.spark-bar{width:70%;background:linear-gradient(180deg,#a78bfa,#6366f1);border-radius:4px 4px 0 0;min-height:3px}
.spark-day{font-size:.62rem;color:#64748b;margin-top:6px;transform:rotate(-40deg);white-space:nowrap}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:22px}
@media(max-width:640px){.grid2{grid-template-columns:1fr}.row{grid-template-columns:120px 1fr 48px}}
.empty{color:#64748b;font-size:.85rem;padding:8px 0}
.foot{color:#475569;font-size:.75rem;margin-top:24px;text-align:center}
.foot a{color:#94a3b8}
</style></head><body>
<div class="wrap">
  <h1>📊 ${esc(config.profile.name)} — Analytics</h1>
  <div class="sub">Tracking since ${statsSince} · ${events.length.toLocaleString()} total events · auto-updates on refresh · <a href="/stats/events.json" style="color:#94a3b8">export JSON</a></div>

  <div class="cards">
    <div class="card"><div class="num">${totalViews.toLocaleString()}</div><div class="lbl">Page Views</div></div>
    <div class="card"><div class="num accent">${totalClicks.toLocaleString()}</div><div class="lbl">Link Clicks</div></div>
    <div class="card"><div class="num">${uniqueVisitors.toLocaleString()}</div><div class="lbl">Unique Visitors</div></div>
    <div class="card"><div class="num">${ctr}</div><div class="lbl">Click Rate</div></div>
  </div>

  <section>
    <h2>Page views — last 14 days</h2>
    <div class="spark">${spark}</div>
  </section>

  <section>
    <h2>Clicks by link</h2>
    ${linkRows.length ? linkRows.map(([k, v]) => bar(k, v, maxLink, pct(v, totalClicks))).join('') : '<div class="empty">No clicks yet. Share your page!</div>'}
  </section>

  <div class="grid2">
    <section>
      <h2>Top referrers</h2>
      ${
        Object.keys(refCount).length
          ? topN(refCount).map(([k, v]) => bar(k, v, maxRef)).join('')
          : '<div class="empty">No data yet.</div>'
      }
    </section>
    <section>
      <h2>Devices</h2>
      ${
        Object.keys(deviceCount).length
          ? topN(deviceCount).map(([k, v]) => bar(k, v, Math.max(1, ...Object.values(deviceCount)))).join('')
          : '<div class="empty">No data yet.</div>'
      }
    </section>
  </div>

  <div class="grid2">
    <section>
      <h2>Operating systems</h2>
      ${
        Object.keys(osCount).length
          ? topN(osCount).map(([k, v]) => bar(k, v, Math.max(1, ...Object.values(osCount)))).join('')
          : '<div class="empty">No data yet.</div>'
      }
    </section>
    <section>
      <h2>Browsers</h2>
      ${
        Object.keys(browserCount).length
          ? topN(browserCount).map(([k, v]) => bar(k, v, Math.max(1, ...Object.values(browserCount)))).join('')
          : '<div class="empty">No data yet.</div>'
      }
    </section>
  </div>

  <div class="foot">Self-hosted analytics · no third-party trackers · IPs are never stored (hashed daily) · <a href="/">← back to links page</a></div>
</div>
</body></html>`;
}

module.exports = { renderStats };
