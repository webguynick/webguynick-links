/* ==========================================================================
   CatVid GO — assets.js
   Probes every path in ASSET_MANIFEST once at boot. Anything missing gets a
   drawn SVG cat (see catsvg.js) instead, so the game never breaks on
   missing art — and stray cats stay recolorable by the player.
   ========================================================================== */

const Assets = {
  available: {},   // { 'assets/cats/minnie_loaf.png': true/false }
  images: {},      // preloaded Image/Canvas objects for available assets
  cutouts: {},     // data-URLs of sprites with their white background removed

  /** Sprites (not map tiles) get their white background auto-removed. */
  needsCutout(src) {
    return src.startsWith('assets/cats/') || src.startsWith('assets/ui/') || src === ASSET_MANIFEST.logo;
  },

  /** Try to load one image; remember whether it exists. */
  probe(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.available[src] = true;
        this.images[src] = img;
        if (this.needsCutout(src)) {
          try { this.cutouts[src] = this.removeWhite(img); } catch (e) { /* keep original */ }
        }
        resolve(true);
      };
      img.onerror = () => { this.available[src] = false; resolve(false); };
      img.src = src;
    });
  },

  /**
   * Strip a plain white/near-white background from a sprite so AI-generated
   * art on white works like a transparent PNG. Flood-fills from the borders
   * (so white INSIDE the cat, like Minnie's chest, is preserved) and feathers
   * light-grey edge pixels. Returns a data URL.
   */
  removeWhite(img) {
    const S = 512; // plenty for in-game sizes, keeps processing fast
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, S, S);
    const im = ctx.getImageData(0, 0, S, S);
    const d = im.data;
    const white = (i) => d[i] > 234 && d[i + 1] > 234 && d[i + 2] > 234;
    const seen = new Uint8Array(S * S);
    const queue = [];
    // seed with all border pixels that are near-white
    for (let x = 0; x < S; x++) { queue.push(x, (S - 1) * S + x); }
    for (let y = 0; y < S; y++) { queue.push(y * S, y * S + S - 1); }
    while (queue.length) {
      const p = queue.pop();
      if (seen[p]) continue;
      seen[p] = 1;
      const i = p * 4;
      if (!white(i)) continue;
      d[i + 3] = 0; // transparent
      const x = p % S, y = (p / S) | 0;
      if (x > 0) queue.push(p - 1);
      if (x < S - 1) queue.push(p + 1);
      if (y > 0) queue.push(p - S);
      if (y < S - 1) queue.push(p + S);
    }
    // feather: light-grey pixels touching the removed area fade out softly
    for (let p = 0; p < S * S; p++) {
      const i = p * 4;
      if (d[i + 3] === 0) continue;
      const x = p % S, y = (p / S) | 0;
      const nearClear =
        (x > 0 && d[(p - 1) * 4 + 3] === 0) || (x < S - 1 && d[(p + 1) * 4 + 3] === 0) ||
        (y > 0 && d[(p - S) * 4 + 3] === 0) || (y < S - 1 && d[(p + S) * 4 + 3] === 0);
      if (!nearClear) continue;
      const bright = (d[i] + d[i + 1] + d[i + 2]) / 3;
      const spread = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]);
      if (bright > 205 && spread < 24) d[i + 3] = Math.round(255 * (255 - bright) / 50);
    }
    ctx.putImageData(im, 0, 0);
    return c.toDataURL('image/png');
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

  /** Real <img> (white-bg cutout if processed), accessory emoji overlaid. */
  _imgNode(src, alt, size, custom) {
    const wrap = document.createElement('div');
    wrap.className = 'cat-draw';
    wrap.style.width = size;
    wrap.style.height = size;
    const img = document.createElement('img');
    img.src = this.cutouts[src] || src;
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
      img.src = this.cutouts[src] || src;
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
