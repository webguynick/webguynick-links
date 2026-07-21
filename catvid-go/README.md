# 🐾 CatVid GO

A Pokémon-GO-style cat-collecting PWA starring **Minnie Mouse** and **Biscuit**,
the real cats of [crazycatvid.com](https://crazycatvid.com).

Plain HTML + CSS + vanilla JS. No build tools, no dependencies, no audio files
(all SFX are synthesized with the Web Audio API). Installs to a phone home
screen and plays offline.

Two ways to make friends:

- **Minnie & Biscuit moods** — flick a treat (swipe physics) to BEFRIEND them
  and fill the 24-form Cat-alog.
- **Strays** 📸 — unknown neighborhood cats (look for the camera badge on the
  map). Photograph them: tap SNAP when they're centered in the viewfinder and
  the ring is small. Win their trust, **name them**, and they join your **Cat
  Family**, where you can recolor their coat, add collars, and pick
  accessories. 12 breeds across 4 rarity tiers — Tortoiseshell pays a 2×
  rare-breed coin bonus, and rare/legendary friends trigger a full-screen
  rays-and-confetti celebration.

## Run it locally

Any static file server works. From this folder:

```bash
# Python (pre-installed on macOS/Linux)
python3 -m http.server 8000

# or Node
npx serve .
```

Then open http://localhost:8000 — on your phone, use your computer's LAN IP
(e.g. `http://192.168.1.20:8000`) while on the same Wi-Fi.

> Opening `index.html` directly via `file://` also works for playing, but the
> PWA install + offline features require http(s) — that's a browser rule, not
> a game limitation.

## Deploy free

**Netlify (fastest):** go to https://app.netlify.com/drop and drag this
`catvid-go` folder onto the page. Done — you get a live https link instantly.

**GitHub Pages:** push this folder to a repo, then Settings → Pages →
deploy from branch. If the game is in a subfolder, either move it to the repo
root or serve via the `/docs` folder convention.

## Tweak the game

Everything tunable is in `js/config.js`:

- `CONFIG.spawn` — spawn timing, despawn, lure strength
- `CONFIG.rarity` — spawn weights, coin/XP rewards, ring speed, catch chances
- `CONFIG.catchRules` — throw physics (gravity, power), hit radius, miss limits
- `CONFIG.treats` / `CONFIG.items` — shop prices and bonuses
- `CONFIG.levels` — XP curve and zone unlock levels
- `MOODS` — the 24 Cat-alog descriptions

## Add real art

See `assets/README.md` — drop PNGs at the listed paths and the game uses them
automatically; anything missing falls back to a styled placeholder.

> Note: on boot the game probes every asset slot to see which art exists, so
> the browser's Network tab shows a few 404s for art you haven't added yet.
> That's the art detector working as intended — they disappear as you add
> files, and there are zero JavaScript errors.
