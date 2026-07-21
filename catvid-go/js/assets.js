/* ==========================================================================
   CatVid GO — assets.js
   Probes every path in ASSET_MANIFEST once at boot. Anything missing gets a
   styled CSS placeholder instead, so the game never breaks on missing art.
   ========================================================================== */

const Assets = {
  available: {},   // { 'assets/cats/minnie_loaf.png': true/false }
  images: {},      // preloaded Image objects for available assets

  /** Try to load one image; remember whether it exists. */
  probe(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.available[src] = true; this.images[src] = img; resolve(true); };
      img.onerror = () => { this.available[src] = false; resolve(false); };
      img.src = src;
    });
  },

  /** Probe every slot in the manifest. Resolves fast; failures are cheap 404s. */
  async probeAll() {
    const paths = [
      ASSET_MANIFEST.logo,
      ...Object.values(ASSET_MANIFEST.treats),
      ...Object.values(ASSET_MANIFEST.maps),
      ...ALL_FORMS.map((f) => f.sprite),
    ];
    // file:// probes error instantly; http probes are parallel — either way quick
    await Promise.all(paths.map((p) => this.probe(p)));
  },

  has(src) { return !!this.available[src]; },

  /**
   * Build a DOM node for a cat form: real <img> if the sprite exists,
   * otherwise a styled placeholder card (coat-colored circle + emoji).
   * `size` is a CSS length like '72px' or '100%'.
   */
  catNode(form, size) {
    if (this.has(form.sprite)) {
      const img = document.createElement('img');
      img.src = form.sprite;
      img.alt = `${form.catName} — ${form.moodName}`;
      img.className = 'cat-sprite';
      img.style.width = size;
      img.style.height = size;
      img.draggable = false;
      return img;
    }
    const cat = CATS[form.catId];
    const ph = document.createElement('div');
    ph.className = `cat-ph cat-ph--${form.catId}`;
    ph.style.width = size;
    ph.style.height = size;
    ph.style.background = `linear-gradient(145deg, ${cat.coat1} 55%, ${cat.coat2} 55%)`;
    ph.innerHTML = `<span class="cat-ph__emoji">${cat.emoji}</span><span class="cat-ph__mood">${form.emoji}</span>`;
    return ph;
  },

  /** Treat sprite or emoji fallback. */
  treatNode(treatId, size) {
    const src = ASSET_MANIFEST.treats[treatId];
    if (this.has(src)) {
      const img = document.createElement('img');
      img.src = src;
      img.alt = CONFIG.treats[treatId].name;
      img.style.width = size; img.style.height = size;
      img.draggable = false;
      return img;
    }
    const span = document.createElement('span');
    span.className = 'treat-emoji';
    span.style.fontSize = `calc(${size} * 0.8)`;
    span.textContent = CONFIG.treats[treatId].emoji;
    return span;
  },
};
