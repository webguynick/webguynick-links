/* ==========================================================================
   CatVid GO — assets.js
   Probes every path in ASSET_MANIFEST once at boot. Anything missing gets a
   drawn SVG cat (see catsvg.js) instead, so the game never breaks on
   missing art — and stray cats stay recolorable by the player.
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
      ...BREEDS.map((b) => ASSET_MANIFEST.straySprite(b.id)),
    ];
    await Promise.all(paths.map((p) => this.probe(p)));
  },

  has(src) { return !!this.available[src]; },

  /**
   * DOM node for a Minnie/Biscuit mood form: real <img> if the sprite
   * exists, otherwise the drawn SVG cat with a mood badge.
   * `custom` (optional) = saved collar/accessory for the star cats.
   */
  catNode(form, size, custom) {
    if (this.has(form.sprite)) {
      return this._imgNode(form.sprite, `${form.catName} — ${form.moodName}`, size, custom);
    }
    const wrap = document.createElement('div');
    wrap.className = 'cat-draw';
    wrap.style.width = size;
    wrap.style.height = size;
    const look = Object.assign({}, STAR_LOOKS[form.catId], custom || {});
    wrap.innerHTML = catSVG(look) + `<span class="cat-draw__mood">${form.emoji}</span>`;
    return wrap;
  },

  /**
   * DOM node for a stray breed. `colors` overrides the breed's default look
   * (that's how player customization recolors the cat). Real art at
   * assets/cats/stray_<id>.png wins if present.
   */
  strayNode(breed, size, colors) {
    const src = ASSET_MANIFEST.straySprite(breed.id);
    if (this.has(src)) {
      return this._imgNode(src, breed.name, size, colors);
    }
    const wrap = document.createElement('div');
    wrap.className = 'cat-draw';
    wrap.style.width = size;
    wrap.style.height = size;
    wrap.innerHTML = catSVG(Object.assign({}, breed.look, colors || {}));
    return wrap;
  },

  /** Real <img>, with the accessory emoji overlaid if one is equipped. */
  _imgNode(src, alt, size, custom) {
    const wrap = document.createElement('div');
    wrap.className = 'cat-draw';
    wrap.style.width = size;
    wrap.style.height = size;
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.className = 'cat-sprite';
    img.draggable = false;
    wrap.appendChild(img);
    const accId = custom && custom.accessory;
    const acc = accId && accId !== 'none' && ACCESSORIES.find((a) => a.id === accId);
    if (acc) wrap.insertAdjacentHTML('beforeend', `<span class="cat-draw__acc">${acc.emoji}</span>`);
    return wrap;
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
