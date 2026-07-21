/* ==========================================================================
   CatVid GO — map.js
   The scrolling neighborhood: drag to pan, cats spawn/wiggle/despawn,
   tap a cat to open an encounter. Zones unlock with level.
   ========================================================================== */

const GameMap = {
  WORLD_W: 1600,
  WORLD_H: 1600,

  viewport: null,
  world: null,
  offset: { x: 0, y: 0 },
  cats: [],              // live spawns: { el, form, timer }
  spawnTimer: null,
  lureUntil: 0,

  /* ----- zone scenery, drawn with emoji props when no tile art exists -----
     Each prop: [emoji, x%, y%, fontSizePx]                                  */
  SCENERY: {
    backyard: {
      props: [
        ['🏠', 12, 8, 84], ['🏡', 72, 12, 84], ['🌳', 30, 22, 64], ['🌳', 88, 40, 64],
        ['🌷', 22, 48, 36], ['🌻', 58, 30, 36], ['⛲', 48, 58, 72], ['🌳', 10, 70, 64],
        ['🪴', 80, 68, 44], ['🌼', 40, 82, 36], ['🏠', 65, 85, 84], ['🌿', 90, 90, 40],
        ['🧺', 25, 92, 44],
      ],
    },
    living: {
      props: [
        ['🛋️', 40, 15, 96], ['📺', 15, 10, 64], ['🪑', 70, 25, 56], ['🧶', 30, 40, 40],
        ['🐾', 55, 45, 32], ['🪟', 88, 12, 64], ['🧸', 20, 60, 48], ['📚', 75, 55, 48],
        ['🛏️', 50, 75, 84], ['🪴', 10, 85, 52], ['🎁', 82, 82, 44], ['🧦', 35, 90, 32],
      ],
    },
    kitchen: {
      props: [
        ['🍳', 20, 10, 64], ['🥘', 70, 8, 56], ['🍽️', 45, 20, 48], ['🥫', 85, 30, 44],
        ['🐟', 30, 38, 40], ['🥛', 60, 42, 40], ['🍗', 15, 55, 44], ['🧀', 80, 60, 44],
        ['🥣', 45, 65, 56], ['🍤', 25, 80, 40], ['🫙', 65, 85, 44], ['🍚', 90, 90, 40],
      ],
    },
    midnight: {
      props: [
        ['🌙', 80, 6, 72], ['⭐', 20, 8, 32], ['✨', 55, 14, 32], ['🏠', 12, 25, 84],
        ['💤', 40, 30, 40], ['⭐', 70, 35, 28], ['🛋️', 60, 50, 80], ['👀', 25, 55, 36],
        ['✨', 85, 60, 32], ['🕯️', 45, 72, 40], ['⭐', 15, 80, 28], ['🌌', 75, 85, 56],
      ],
    },
  },

  init() {
    this.viewport = document.getElementById('map-viewport');
    this.world = document.getElementById('map-world');
    this.bindDrag();
    this.renderZoneTabs();
    this.setZone(State.data.currentZone, true);
  },

  /* ------------------------------ zones -------------------------------- */

  renderZoneTabs() {
    const bar = document.getElementById('zone-tabs');
    bar.innerHTML = '';
    ZONES.forEach((z) => {
      const unlocked = State.zoneUnlocked(z.id);
      const btn = document.createElement('button');
      btn.className = 'zone-tab' + (State.data.currentZone === z.id ? ' active' : '') + (unlocked ? '' : ' locked');
      btn.innerHTML = unlocked
        ? `${z.icon} <span>${z.name}</span>`
        : `🔒 <span>${z.name} · Lv ${CONFIG.levels.zoneUnlocks[z.id]}</span>`;
      btn.addEventListener('click', () => {
        if (!unlocked) { UI.toast(`Unlocks at level ${CONFIG.levels.zoneUnlocks[z.id]}! 🔒`); return; }
        Sound.pop();
        this.setZone(z.id);
      });
      bar.appendChild(btn);
    });
  },

  setZone(zoneId, skipSave) {
    if (!State.zoneUnlocked(zoneId)) zoneId = 'backyard';
    State.data.currentZone = zoneId;
    if (!skipSave) State.save();

    // clear existing spawns
    this.cats.forEach((c) => { clearTimeout(c.timer); c.el.remove(); });
    this.cats = [];

    // paint the world
    const zone = ZONES.find((z) => z.id === zoneId);
    const scen = this.SCENERY[zoneId];
    const tile = ASSET_MANIFEST.maps[zoneId];
    const hasArt = Assets.has(tile);
    this.world.className = 'map-world zone-' + zoneId + (zone.night ? ' night' : '');
    if (hasArt) {
      // full-map illustration: stretch a single 1:1 image across the world
      this.world.style.background = `url(${tile}) center / 100% 100% no-repeat`;
    } else {
      this.world.style.background = ''; // CSS zone textures take over
    }
    this.world.querySelectorAll('.map-prop, .map-star').forEach((n) => n.remove());
    if (!hasArt) {
      // emoji scenery only when there's no real map art
      scen.props.forEach(([emoji, x, y, size]) => {
        const p = document.createElement('div');
        p.className = 'map-prop';
        p.textContent = emoji;
        p.style.left = `${x}%`;
        p.style.top = `${y}%`;
        p.style.fontSize = `${size}px`;
        this.world.appendChild(p);
      });
    }
    if (zone.night) {
      // twinkling stars over the midnight zone (on top of art or CSS ground)
      for (let i = 0; i < 26; i++) {
        const s = document.createElement('div');
        s.className = 'map-star';
        s.style.left = `${Math.random() * 98}%`;
        s.style.top = `${Math.random() * 98}%`;
        s.style.animationDelay = `${Math.random() * 3}s`;
        s.style.animationDuration = `${1.6 + Math.random() * 2.4}s`;
        this.world.appendChild(s);
      }
    }

    // center camera
    this.offset.x = -(this.WORLD_W - this.viewport.clientWidth) / 2;
    this.offset.y = -(this.WORLD_H - this.viewport.clientHeight) / 2;
    this.applyOffset();
    this.renderZoneTabs();
    this.scheduleSpawn(true);
  },

  /* --------------------------- drag to scroll --------------------------- */

  bindDrag() {
    let dragging = false;
    let last = { x: 0, y: 0 };
    const vp = this.viewport;

    vp.addEventListener('pointerdown', (e) => {
      dragging = true;
      last = { x: e.clientX, y: e.clientY };
      vp.setPointerCapture(e.pointerId);
    });
    vp.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      this.offset.x += e.clientX - last.x;
      this.offset.y += e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      this.applyOffset();
    });
    const end = () => { dragging = false; };
    vp.addEventListener('pointerup', end);
    vp.addEventListener('pointercancel', end);
  },

  applyOffset() {
    // clamp so the world always fills the viewport
    const minX = Math.min(0, this.viewport.clientWidth - this.WORLD_W);
    const minY = Math.min(0, this.viewport.clientHeight - this.WORLD_H);
    this.offset.x = Math.max(minX, Math.min(0, this.offset.x));
    this.offset.y = Math.max(minY, Math.min(0, this.offset.y));
    this.world.style.transform = `translate3d(${this.offset.x}px, ${this.offset.y}px, 0)`;
  },

  /* ------------------------------ spawning ------------------------------ */

  lureActive() { return Date.now() < this.lureUntil; },

  activateLure() {
    this.lureUntil = Date.now() + CONFIG.spawn.lureDurationMs;
    const el = document.getElementById('lure-timer');
    el.classList.remove('hidden');
    const tick = () => {
      const left = Math.ceil((this.lureUntil - Date.now()) / 1000);
      if (left <= 0) { el.classList.add('hidden'); return; }
      el.textContent = `🌿 Catnip Lure: ${left}s`;
      setTimeout(tick, 500);
    };
    tick();
    // respawn timer immediately at boosted rate
    this.scheduleSpawn(true);
  },

  scheduleSpawn(immediate) {
    clearTimeout(this.spawnTimer);
    const { minDelayMs, maxDelayMs } = CONFIG.spawn;
    let delay = minDelayMs + Math.random() * (maxDelayMs - minDelayMs);
    if (this.lureActive()) delay /= CONFIG.spawn.lureMultiplier;
    if (immediate) delay = Math.min(delay, 1800); // quick first spawn per zone
    this.spawnTimer = setTimeout(() => {
      this.spawnCat();
      this.scheduleSpawn(false);
    }, delay);
  },

  /** Weighted-random rarity, honoring the midnight legendary boost. */
  rollRarity() {
    const isNight = ZONES.find((z) => z.id === State.data.currentZone).night;
    const entries = Object.entries(CONFIG.rarity).map(([id, r]) => {
      let w = r.weight;
      if (id === 'legendary' && isNight) w *= CONFIG.spawn.midnightLegendaryMult;
      return [id, w];
    });
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let roll = Math.random() * total;
    for (const [id, w] of entries) {
      roll -= w;
      if (roll <= 0) return id;
    }
    return 'common';
  },

  spawnCat() {
    if (this.cats.length >= CONFIG.spawn.maxCatsOnMap) return;
    if (document.hidden) return; // don't pile up spawns in background tabs

    const rarity = this.rollRarity();

    // stray (photograph & adopt) or one of the stars in a mood (treat toss)?
    let subject;
    if (Math.random() < CONFIG.strays.spawnChance) {
      const pool = BREEDS.filter((b) => b.rarity === rarity);
      subject = { kind: 'stray', breed: pool[Math.floor(Math.random() * pool.length)], rarity };
    } else {
      const pool = ALL_FORMS.filter((f) => f.rarity === rarity);
      subject = { kind: 'mood', form: pool[Math.floor(Math.random() * pool.length)], rarity };
    }

    const el = document.createElement('div');
    const aura = CONFIG.rarity[rarity].aura;
    el.className = 'map-cat wiggle' + (aura ? ` aura-${aura}` : '');
    el.style.left = `${8 + Math.random() * 84}%`;
    el.style.top = `${10 + Math.random() * 80}%`;
    el.appendChild(subject.kind === 'stray'
      ? Assets.strayNode(subject.breed, '52px')
      : Assets.catNode(subject.form, '52px'));
    if (subject.kind === 'stray') {
      el.insertAdjacentHTML('beforeend', '<span class="map-cat__snap">📸</span>');
    }
    if (rarity === 'legendary') el.classList.add('sparkle');

    // tap (not drag) opens the encounter — stopPropagation keeps the map's
    // pan handler from capturing the pointer and swallowing our pointerup
    let down = null;
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      down = { x: e.clientX, y: e.clientY };
    });
    el.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved < 12) {
        Sound.pop();
        this.removeCat(entry);
        Encounter.open(subject);
      }
    });

    const entry = { el, subject, timer: setTimeout(() => this.removeCat(entry, true), CONFIG.spawn.despawnMs) };
    this.cats.push(entry);
    this.world.appendChild(el);
  },

  removeCat(entry, faded) {
    clearTimeout(entry.timer);
    this.cats = this.cats.filter((c) => c !== entry);
    if (faded) {
      entry.el.classList.add('despawn');
      setTimeout(() => entry.el.remove(), 400);
    } else {
      entry.el.remove();
    }
  },
};
