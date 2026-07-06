# WebGuyNick Links 🔗

A self-hosted **Linktree clone with full stats tracking**. One page for all your
links, plus a private analytics dashboard that tracks *everything* — page views,
per-link clicks, referrers, devices, browsers, operating systems, unique
visitors, and a 14-day trend — all without any third-party trackers.

- **Zero dependencies.** Pure Node.js. No `npm install`, no build step.
- **Privacy-friendly.** Raw IP addresses are never written to disk — visitors
  are counted via a daily-salted hash.
- **Tracks clicks even with JavaScript off** — every link goes through a
  server-side tracking redirect (`/r/<id>`).

<br>

## Quick start

```bash
node server.js
```

Then open:

- **Public page** → http://localhost:3000/
- **Stats dashboard** → http://localhost:3000/stats

The stats page is protected with HTTP Basic Auth. Log in with **any username**
and the password (default `changeme` — change it, see below).

<br>

## Customize your page

Everything is driven by **`config.js`** — edit your name, bio, avatar, theme
colors, links, and social icons there. No other file needs touching.

```js
profile: {
  name: 'WebGuyNick',
  handle: '@webguynick',
  bio: '...',
  avatar: '/avatar.svg',   // swap for a real photo: drop it in /public and set '/me.jpg'
  theme: { bgStart, bgEnd, accent, text, muted },
},
links:   [ { id, title, url, subtitle?, featured? }, ... ],
socials: [ { id, icon, url }, ... ],
```

Built-in social icons: `youtube`, `instagram`, `tiktok`, `x`, `github`,
`linkedin`, `facebook`, `twitch`, `email`, `website`.

> **Note:** This page was seeded with placeholder links built from your handle
> (`@webguynick`) and email domain (`webguynick.com`). I couldn't scrape your
> live `link.me/webguynick` page (the network policy for this environment blocks
> that host), so **double-check the URLs in `config.js`** and fix any that
> differ from your real ones.

<br>

## Configuration (environment variables)

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Port to listen on |
| `STATS_PASSWORD` | `changeme` | Password for `/stats` — **change this!** |
| `TRUST_PROXY` | _unset_ | Set to `1` when running behind nginx / Cloudflare / Vercel so real client IPs are read from `X-Forwarded-For` |

Example:

```bash
PORT=8080 STATS_PASSWORD='my-secret' TRUST_PROXY=1 node server.js
```

<br>

## What gets tracked

Every event is appended as one JSON line to `data/events.ndjson` (gitignored):

| Field | Example | Notes |
| --- | --- | --- |
| `ts` | `2026-07-06T12:00:00Z` | timestamp |
| `type` | `pageview` / `click` / `beacon` | event kind |
| `visitor` | `a1b2c3…` | daily-salted hash of IP+UA (not reversible) |
| `referrer` | `instagram.com` / `direct` | where they came from |
| `device` | `mobile` / `tablet` / `desktop` | parsed from UA |
| `os` / `browser` | `iOS` / `Safari` | parsed from UA |
| `linkId` / `title` / `url` | `youtube` | on click events |
| `screen` / `lang` | `1920x1080` / `en-US` | best-effort client beacon |

Export the raw log anytime from **`/stats/events.json`** (same password).

<br>

## Deploy

It's a single long-running Node process serving HTTP — deploy it anywhere Node
runs:

- **A VPS / any Linux box:** run it under `pm2`, `systemd`, or Docker, and put
  nginx/Caddy in front for HTTPS. Set `TRUST_PROXY=1`.
- **Render / Railway / Fly.io / a container host:** start command `node server.js`,
  expose `$PORT`. Mount a volume at `data/` so your stats persist across deploys.
- Point your domain (e.g. `links.webguynick.com`) at it.

> Because stats are stored on the local filesystem (`data/events.ndjson`),
> use a host that gives you a **persistent disk**. Fully static hosts
> (GitHub Pages, plain Netlify) can serve the page but can't run the tracking
> backend — you'd lose the analytics.

<br>

## Project structure

```
config.js          ← edit your profile, links, theme
server.js          ← HTTP server, routing, event logging
lib/render.js      ← public page HTML + social icons
lib/stats.js       ← analytics dashboard
public/            ← avatar, favicon, any static assets
data/events.ndjson ← captured events (created at runtime, gitignored)
```

MIT licensed.
