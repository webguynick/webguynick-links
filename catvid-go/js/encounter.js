/* ==========================================================================
   CatVid GO — encounter.js
   Full-screen encounter: idle cat up top, shrinking/growing attention ring,
   flick the treat with real physics (swipe velocity + gravity arc).
   ========================================================================== */

const Encounter = {
  form: null,          // the cat form being encountered
  misses: 0,
  ringPhase: 0,        // oscillator phase for the attention ring
  ringFrozen: false,   // laser pointer effect (one throw)
  rafId: null,
  lastTs: 0,
  throwing: null,      // active projectile state or null
  resolved: false,

  els: {},             // cached DOM nodes

  cache() {
    ['encounter', 'enc-cat', 'enc-ring', 'enc-treat', 'enc-name', 'enc-stars',
     'enc-misses', 'enc-banner', 'enc-stage', 'enc-treat-select', 'enc-laser', 'enc-flee']
      .forEach((id) => { this.els[id] = document.getElementById(id); });
  },

  open(form) {
    if (!this.els.encounter) this.cache();
    this.form = form;
    this.misses = 0;
    this.ringFrozen = false;
    this.throwing = null;
    this.resolved = false;
    this.ringPhase = Math.random() * Math.PI * 2;

    const r = CONFIG.rarity[form.rarity];
    State.data.stats.encounters += 1;
    State.save();

    // header: name + gold stars
    this.els['enc-name'].textContent = `${form.catName} · ${form.moodName}`;
    this.els['enc-stars'].textContent = '★'.repeat(r.stars);
    this.updateMisses();

    // cat sprite (idle bob via CSS)
    const catBox = this.els['enc-cat'];
    catBox.innerHTML = '';
    catBox.appendChild(Assets.catNode(form, '150px'));
    catBox.className = 'enc-cat idle' + (form.rarity === 'legendary' ? ' legendary-glow' : '');

    this.els['enc-banner'].classList.add('hidden');

    // unhide FIRST so the stage has real dimensions, then lay out the treat
    this.els.encounter.classList.remove('hidden');
    document.getElementById('tabbar').classList.add('hidden');
    this.renderTreatBar();
    this.resetTreat();
    Sound.meow();
    if (form.rarity === 'legendary') Sound.sparkle();

    this.lastTs = 0;
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame((t) => this.tick(t));
  },

  close() {
    cancelAnimationFrame(this.rafId);
    this.els.encounter.classList.add('hidden');
    document.getElementById('tabbar').classList.remove('hidden');
    UI.updateHud();
  },

  updateMisses() {
    const max = CONFIG.catchRules.maxMisses;
    const isRarePlus = this.form.rarity === 'rare' || this.form.rarity === 'legendary';
    this.els['enc-misses'].textContent = isRarePlus
      ? '❌'.repeat(this.misses) + '·'.repeat(Math.max(0, max - this.misses))
      : '';
  },

  /* --------------------- treat selector + laser button ------------------- */

  renderTreatBar() {
    const bar = this.els['enc-treat-select'];
    bar.innerHTML = '';
    Object.entries(CONFIG.treats).forEach(([id, t]) => {
      if (!State.data.treatsOwned[id]) return;
      const b = document.createElement('button');
      b.className = 'treat-pick' + (State.data.selectedTreat === id ? ' active' : '');
      b.title = t.name;
      b.appendChild(Assets.treatNode(id, '26px'));
      b.addEventListener('click', () => {
        State.data.selectedTreat = id;
        State.save();
        Sound.pop();
        this.renderTreatBar();
        this.resetTreat();
      });
      bar.appendChild(b);
    });

    const laser = this.els['enc-laser'];
    const count = State.data.items.laser;
    laser.textContent = `🔴 ×${count}`;
    laser.disabled = count <= 0 || this.ringFrozen;
    laser.classList.toggle('armed', this.ringFrozen);
    laser.onclick = () => {
      if (State.data.items.laser <= 0 || this.ringFrozen) return;
      State.data.items.laser -= 1;
      State.save();
      this.ringFrozen = true;
      Sound.pop();
      UI.toast('Ring frozen for one throw! 🔴');
      this.renderTreatBar();
    };

    this.els['enc-flee'].onclick = () => { Sound.pop(); this.close(); };
  },

  /* ------------------------- the game loop (60fps) ----------------------- */

  tick(ts) {
    if (!this.lastTs) this.lastTs = ts;
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000); // clamp long frames
    this.lastTs = ts;

    // 1) attention ring: sinusoidal shrink/grow, speed scales with rarity
    if (!this.ringFrozen) {
      this.ringPhase += dt * CONFIG.rarity[this.form.rarity].ringSpeed * 2.2;
    }
    const s = this.ringScale();
    this.els['enc-ring'].style.transform = `translate(-50%, -50%) scale(${s})`;

    // 2) treat projectile physics
    if (this.throwing) this.stepThrow(dt);

    if (!this.resolved) this.rafId = requestAnimationFrame((t) => this.tick(t));
  },

  /** Ring scale oscillates 0.35 → 1.0. Smaller = better catch bonus. */
  ringScale() {
    return 0.675 + 0.325 * Math.sin(this.ringPhase);
  },

  /** 0 (ring huge) → 1 (ring at its smallest). */
  ringTightness() {
    return 1 - (this.ringScale() - 0.35) / 0.65;
  },

  /* --------------------------- flick physics ----------------------------- */

  resetTreat() {
    const treat = this.els['enc-treat'];
    treat.innerHTML = '';
    treat.appendChild(Assets.treatNode(State.data.selectedTreat, '44px'));
    treat.style.transition = 'none';
    treat.style.opacity = '1';
    this.throwing = null;

    const stage = this.els['enc-stage'];
    const home = () => ({ x: stage.clientWidth / 2, y: stage.clientHeight - 70 });
    let pos = home();
    const setPos = (p, scale = 1) => {
      treat.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%,-50%) scale(${scale})`;
    };
    setPos(pos);

    // drag-and-flick handling with velocity sampling
    let samples = [];
    let dragging = false;

    treat.onpointerdown = (e) => {
      if (this.throwing || this.resolved) return;
      dragging = true;
      treat.setPointerCapture(e.pointerId);
      samples = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
      e.preventDefault();
    };
    treat.onpointermove = (e) => {
      if (!dragging) return;
      const rect = stage.getBoundingClientRect();
      pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setPos(pos);
      samples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (samples.length > 8) samples.shift();
    };
    const release = () => {
      if (!dragging) return;
      dragging = false;

      // velocity from the last ~100 ms of pointer movement
      const now = performance.now();
      const recent = samples.filter((sm) => now - sm.t < 110);
      if (recent.length < 2) { setPos(pos = home()); return; }
      const a = recent[0], b = recent[recent.length - 1];
      const dtS = Math.max(0.016, (b.t - a.t) / 1000);
      let vx = ((b.x - a.x) / dtS) * CONFIG.catchRules.throwPower;
      let vy = ((b.y - a.y) / dtS) * CONFIG.catchRules.throwPower;

      const speed = Math.hypot(vx, vy);
      if (speed < CONFIG.catchRules.minThrowSpeed || vy > -100) {
        // too soft or not upward → treat plops back home
        setPos(pos = home());
        return;
      }
      Sound.throwWhoosh();
      this.throwing = { x: pos.x, y: pos.y, vx, vy, evaluated: false, setPos };
    };
    treat.onpointerup = release;
    treat.onpointercancel = release;
  },

  stepThrow(dt) {
    const th = this.throwing;
    const stage = this.els['enc-stage'];
    th.vy += CONFIG.catchRules.gravity * dt;
    th.x += th.vx * dt;
    th.y += th.vy * dt;

    // depth illusion: shrink as it flies toward the cat
    const catY = stage.clientHeight * 0.26;
    const startY = stage.clientHeight - 70;
    const progress = Math.max(0, Math.min(1, (startY - th.y) / (startY - catY)));
    th.setPos(th, 1 - 0.45 * progress);

    // reached the cat's plane while still rising/level → evaluate the landing
    if (!th.evaluated && th.y <= catY) {
      th.evaluated = true;
      this.evaluateLanding(th.x);
      return;
    }
    // fell off the bottom or flew wide → miss (short throw)
    if (th.y > stage.clientHeight + 60 || th.x < -80 || th.x > stage.clientWidth + 80) {
      this.throwing = null;
      this.registerMiss('The treat went wide!');
    }
  },

  evaluateLanding(landX) {
    const stage = this.els['enc-stage'];
    const r = CONFIG.rarity[this.form.rarity];
    const catX = stage.clientWidth / 2;
    const hitRadius = stage.clientWidth * CONFIG.catchRules.hitRadiusFrac;
    this.throwing = null;
    this.els['enc-treat'].style.opacity = '0';

    if (Math.abs(landX - catX) > hitRadius) {
      this.registerMiss('Missed! The cat is unimpressed.');
      return;
    }

    // the cat may bat the treat away mid-air (rarer = sassier)
    if (Math.random() < r.batChance) {
      this.batAway();
      return;
    }

    // catch roll: base + treat bonus + ring-tightness bonus
    const treatBonus = CONFIG.treats[State.data.selectedTreat].bonus;
    const ringBonus = CONFIG.catchRules.ringBonusMax * this.ringTightness();
    const chance = Math.min(0.98, r.baseCatch + treatBonus + ringBonus);
    this.ringFrozen = false; // laser is spent on this throw either way

    if (Math.random() < chance) {
      this.gotcha();
    } else {
      this.registerMiss('So close! The cat wriggled away from the treat.');
    }
  },

  batAway() {
    this.ringFrozen = false;
    const cat = this.els['enc-cat'];
    cat.classList.add('bat');
    setTimeout(() => cat.classList.remove('bat'), 450);
    this.registerMiss('BATTED AWAY! The audacity of this cat.');
  },

  registerMiss(msg) {
    this.misses += 1;
    this.updateMisses();
    UI.toast(msg);
    const isRarePlus = this.form.rarity === 'rare' || this.form.rarity === 'legendary';
    const limit = isRarePlus ? CONFIG.catchRules.maxMisses : CONFIG.catchRules.maxMisses + 2;
    if (this.misses >= limit) {
      this.escape();
    } else {
      setTimeout(() => this.resetTreat(), 350);
    }
  },

  escape() {
    this.resolved = true;
    State.data.stats.escapes += 1;
    State.save();
    Sound.sadMeow();
    const cat = this.els['enc-cat'];
    cat.classList.add('flee');
    const banner = this.els['enc-banner'];
    banner.textContent = 'IT RAN AWAY 💨';
    banner.classList.remove('hidden', 'gotcha');
    banner.classList.add('escaped');
    setTimeout(() => this.close(), 1600);
  },

  gotcha() {
    this.resolved = true;
    const form = this.form;
    const r = CONFIG.rarity[form.rarity];

    // rewards (daily bonus doubles the FIRST catch of the day)
    let coins = r.coins;
    let dailyBonus = false;
    if (State.dailyBonusAvailable()) {
      coins *= CONFIG.daily.firstCatchCoinMult;
      State.consumeDailyBonus();
      dailyBonus = true;
    }
    const d = State.data;
    d.coins += coins;
    d.stats.coinsEarned += coins;
    d.stats.catches += 1;
    if (form.rarity === 'legendary') d.stats.legendary += 1;
    d.collection[form.key] = (d.collection[form.key] || 0) + 1;
    const newLevels = State.addXp(r.xp); // saves internally

    Sound.purr();
    setTimeout(() => Sound.coin(), 500);

    // heart burst + GOTCHA banner
    UI.heartBurst(this.els['enc-stage']);
    const banner = this.els['enc-banner'];
    banner.textContent = 'GOTCHA! 🐾';
    banner.classList.remove('hidden', 'escaped');
    banner.classList.add('gotcha');
    this.els['enc-cat'].classList.add('caught');

    const notes = [`+${coins} 🐾 coins · +${r.xp} XP`];
    if (dailyBonus) notes.push('DAILY BONUS ×2! ☀️');
    UI.toast(notes.join('  '));

    setTimeout(() => {
      this.close();
      this.els['enc-cat'].classList.remove('caught');
      if (newLevels.length) UI.showLevelUp(newLevels[newLevels.length - 1]);
    }, 1700);
  },
};
