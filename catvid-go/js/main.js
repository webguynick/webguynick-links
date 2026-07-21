/* ==========================================================================
   CatVid GO — main.js
   Boot sequence: load save → probe assets → wire UI → start the map.
   ========================================================================== */

window.addEventListener('DOMContentLoaded', async () => {
  State.load();
  await Assets.probeAll();   // fast: parallel probes, 404s just flag placeholders

  // real logo if present (white background auto-removed), else text logo stays
  if (Assets.has(ASSET_MANIFEST.logo)) {
    const src = Assets.cutouts[ASSET_MANIFEST.logo] || ASSET_MANIFEST.logo;
    document.querySelectorAll('.logo-slot').forEach((slot) => {
      slot.innerHTML = `<img src="${src}" alt="CatVid GO" class="logo-img">`;
    });
  }

  UI.init();
  GameMap.init();
  UI.show('map');
});

/* Register the service worker (PWA install + offline). Only possible over
   http(s) — silently skipped when opened via file:// . */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode unavailable */ });
  });
}
