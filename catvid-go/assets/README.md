# CatVid GO — asset slots

Drop real art at these exact paths and the game picks it up automatically
(no code changes needed — missing files fall back to styled placeholders).
The full machine-readable list also lives at the top of `js/config.js`
(`ASSET_MANIFEST`).

## Cat sprites — `assets/cats/` (512×512 PNG, transparent background)

| Minnie Mouse (tuxedo) | Biscuit (grey & white) |
|---|---|
| `minnie_friendly.png` | `biscuit_friendly.png` |
| `minnie_loaf.png` | `biscuit_loaf.png` |
| `minnie_attentive.png` | `biscuit_attentive.png` |
| `minnie_mine.png` | `biscuit_mine.png` |
| `minnie_belly.png` | `biscuit_belly.png` |
| `minnie_cautious.png` | `biscuit_cautious.png` |
| `minnie_focus.png` | `biscuit_focus.png` |
| `minnie_hunting.png` | `biscuit_hunting.png` |
| `minnie_irritated.png` | `biscuit_irritated.png` |
| `minnie_murdermode.png` | `biscuit_murdermode.png` |
| `minnie_floof.png` | `biscuit_floof.png` |
| `minnie_zoomies.png` | `biscuit_zoomies.png` |

## Stray breed sprites — `assets/cats/` (512×512 PNG, transparent) — OPTIONAL

The game draws strays as cute recolorable vector cats out of the box. If you
add real art it is used as-is (player recoloring then only applies collar +
accessory overlays).

`stray_orange_tabby.png` · `stray_grey_tabby.png` · `stray_void.png` ·
`stray_siamese.png` · `stray_russian_blue.png` · `stray_snowshoe.png` ·
`stray_tortie.png` · `stray_calico.png` · `stray_bengal.png` ·
`stray_maine_coon.png` · `stray_sphynx.png` · `stray_scottish_fold.png`

## Map tiles — `assets/map/` (1024×1024 PNG, tileable, top-down cartoon)

- `backyard.png` — grass, fence, flower beds
- `living_room.png` — couch, rug, cat tree
- `kitchen.png` — counters, food bowls
- `midnight.png` — dark "3AM zoomies" night zone

## Treat sprites — `assets/ui/` (256×256 PNG, transparent)

- `treat_kibble.png`
- `treat_salmon.png`
- `treat_churu.png`

## Branding — `assets/`

- `logo.png` — 800×300 PNG game logo (replaces the text logo on the splash screen)
- `icon-192.png` / `icon-512.png` — PWA icons (paw placeholders included; replace freely)

## Fonts — `assets/fonts/` (optional)

- `Poppins-Regular.woff2`
- `Poppins-SemiBold.woff2`
- `Poppins-Bold.woff2`

Without these the game uses a system font stack that looks close to Poppins.
Free download: https://fonts.google.com/specimen/Poppins (convert TTF → woff2).
