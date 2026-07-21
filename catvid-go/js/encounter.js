/* ==========================================================================
   CatVid GO — encounter.js
   Two encounter styles:
   • MOOD (Minnie/Biscuit): flick a treat with swipe physics → BEFRIEND them
   • STRAY (photo mode): the cat wanders — tap the shutter when it's centered
     and the attention ring is small. A great pic wins its trust, then you
     NAME it and it joins your Cat Family.
   ========================================================================== */

const Encounter = {
  subject: null,       // { kind:'mood', form } | { kind:'stray', breed, rarity }
  misses: 0,           // treat misses OR photos used
  ringPhase: 0,
  ringFrozen: false,   // laser pointer effect (one throw / one snap)
  rafId: null,
  lastTs: 0,
  throwing: null,      // active treat projectile or null
  resolved: false,
  stray: null,         // wander state for photo mode: {x,y,tx,ty,nextAt}

  els: {},

  cache() {
    ['encounter', 'enc-cat', 'enc-cat-wrap', 'enc-ring', 'enc-treat', 'enc-name',
     'enc-stars', 'enc-misses', 'enc-banner', 'enc-stage', 'enc-treat-select',
     'enc-laser', 'enc-flee', 'enc-snap', 'enc-viewfinder', 'enc-flash']
      .forEach((id) => { this.els[id] = document.getElementById(id); });
  },

  isStray() { return this.subject.kind === 'stray'; },
  rarity() { return CONFIG.rarity[this.subject.rarity || this.subject.form.rarity]; },

  open(subject) {
    if (!this.els.encounter) this.cache();
    this.subject = subject;
    this.misses = 0;
    this.ringFrozen = false;
    this.throwing = null;
    this.resolved = false;
    this.ringPhase = Math.random() * Math.PI * 2;

    State.data.stats.encounters += 1;
    State.save();

    const stray = this.isStray();
    const r = this.rarity();

    // header
    this.els['enc-name'].textContent = stray
      ? `Stray · ${subject.breed.name}`
      : `${subject.form.catName} · ${subject.form.moodName}`;
    this.els['enc-stars'].textContent = '★'.repeat(r.stars);

    // cat sprite
    const catBox = this.els['enc-cat'];
    catBox.innerHTML = '';
    catBox.appendChild(stray
      ? Assets.strayNode(subject.breed, '150px')
      : Assets.catNode(subject.form, '150px'));
    const legendary = (stray ? subject.rarity : subject.form.rarity) === 'legendary';
    catBox.className = 'enc-cat idle' + (legendary ? ' legendary-glow' : '');

    this.els['enc-banner'].classList.add('hidden');

    // unhide FIRST so the stage has real dimensions, then lay out controls
    this.els.encounter.classList.remove('hidden');
    document.getElementById('tabbar').classList.add('hidden');

    // mode-specific chrome
    this.els.encounter.classList.toggle('photo-mode', stray);
    this.els['enc-viewfinder'].classList.toggle('hidden', !stray);
    this.els['enc-snap'].classList.toggle('hidden', !stray);
    this.els['enc-treat'].style.display = stray ? 'none' : '';
    this.els['enc-treat-select'].style.display = stray ? 'none' : '';
    document.querySelector('.enc-hint').textContent = stray
      ? '📸 snap when the cat is centered & the ring is small!'
      : 'flick the treat at the cat! small ring = better catch';

    this.renderTreatBar();
    if (stray) {
      this.initStrayWander();
      this.els['enc-snap'].onclick = () => this.takePhoto();
    } else {
      this.centerCatWrap();
      this.resetTreat();
    }
    this.updateMisses();

    Sound.meow();
    if (legendary) Sound.sparkle();

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
    if (this.isStray()) {
      const left = CONFIG.strays.shots - this.misses;
      this.els['enc-misses'].textContent = '📷'.repeat(left) + '·'.repeat(this.misses);
      return;
    }
    const max = CONFIG.catchRules.maxMisses;
    const rar = this.subject.form.rarity;
    const isRarePlus = rar === 'rare' || rar === 'legendary';
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
      UI.toast(this.isStray() ? 'Ring frozen for one snap! 🔴' : 'Ring frozen for one throw! 🔴');
      this.renderTreatBar();
    };

    this.els['enc-flee'].onclick = () => { Sound.pop(); this.close(); };
  },

  /* ------------------------- the game loop (60fps) ----------------------- */

  tick(ts) {
    if (!this.lastTs) this.lastTs = ts;
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
    this.lastTs = ts;

    // 1) attention ring
    if (!this.ringFrozen) {
      this.ringPhase += dt * this.rarity().ringSpeed * 2.2;
    }
    const s = this.ringScale();
    this.els['enc-ring'].style.transform = `translate(-50%, -50%) scale(${s})`;

    // 2) mode physics
    if (this.stray && !this.resolved) this.stepWander(dt, ts);
    if (this.throwing) this.stepThrow(dt);

    if (!this.resolved) this.rafId = requestAnimationFrame((t) => this.tick(t));
  },

  ringScale() { return 0.675 + 0.325 * Math.sin(this.ringPhase); },
  ringTightness() { return 1 - (this.ringScale() - 0.35) / 0.65; },

  /* ----------------------- photo mode: wandering cat --------------------- */

  centerCatWrap() {
    const wrap = this.els['enc-cat-wrap'];
    wrap.style.left = '50%';
    wrap.style.top = '26%';
    this.stray = null;
  },

  initStrayWander() {
    const stage = this.els['enc-stage'];
    const cx = stage.clientWidth / 2, cy = stage.clientHeight * 0.34;
    this.stray = { x: cx, y: cy, tx: cx, ty: cy, nextAt: 0 };
  },

  stepWander(dt, ts) {
    const st = this.stray;
    const stage = this.els['enc-stage'];
    const [lo, hi] = CONFIG.strays.wanderIntervalMs;

    if (ts >= st.nextAt) {
      // pick a new lounging spot in the upper 2/3 of the stage
      st.tx = stage.clientWidth * (0.22 + Math.random() * 0.56);
      st.ty = stage.clientHeight * (0.15 + Math.random() * 0.42);
      st.nextAt = ts + lo + Math.random() * (hi - lo);
    }
    const k = Math.min(1, CONFIG.strays.wanderSpeed * dt);
    st.x += (st.tx - st.x) * k;
    st.y += (st.ty - st.y) * k;

    const wrap = this.els['enc-cat-wrap'];
    wrap.style.left = `${st.x}px`;
    wrap.style.top = `${st.y}px`;
  },

  /** Shutter press: quality = centering in the viewfinder + ring tightness. */
  takePhoto() {
    if (this.resolved || !this.stray) return;
    const stage = this.els['enc-stage'];

    // camera flash + shutter sfx
    const flash = this.els['enc-flash'];
    flash.classList.remove('hidden');
    flash.classList.remove('go'); void flash.offsetWidth; // restart animation
    flash.classList.add('go');
    Sound.pop();
    State.data.stats.snaps += 1;
    State.save();

    const cx = stage.clientWidth / 2, cy = stage.clientHeight * 0.34;
    const dist = Math.hypot(this.stray.x - cx, this.stray.y - cy);
    const maxDist = Math.hypot(stage.clientWidth * 0.5, stage.clientHeight * 0.4);
    const centering = Math.max(0, 1 - dist / (maxDist * 0.55));
    const quality = 0.55 * centering + 0.45 * this.ringTightness();
    const stars = quality >= 0.75 ? 3 : quality >= 0.45 ? 2 : 1;
    this.ringFrozen = false; // a laser freeze is spent on this snap

    const S = CONFIG.strays;
    const chance = Math.max(0.05, Math.min(0.97,
      this.rarity().baseCatch - S.qualityShift + quality * S.qualitySwing));

    setTimeout(() => {
      if (Math.random() < chance) {
        this.strayBefriended(stars);
      } else {
        const excuse = stars >= 2
          ? 'They blinked! So dramatic.'
          : 'Blurry! The cat refuses to be perceived.';
        this.registerMiss(excuse);
      }
    }, 320);
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

      const now = performance.now();
      const recent = samples.filter((sm) => now - sm.t < 110);
      if (recent.length < 2) { setPos(pos = home()); return; }
      const a = recent[0], b = recent[recent.length - 1];
      const dtS = Math.max(0.016, (b.t - a.t) / 1000);
      let vx = ((b.x - a.x) / dtS) * CONFIG.catchRules.throwPower;
      let vy = ((b.y - a.y) / dtS) * CONFIG.catchRules.throwPower;

      const speed = Math.hypot(vx, vy);
      if (speed < CONFIG.catchRules.minThrowSpeed || vy > -100) {
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

    // gold sparkle trail behind the flying treat
    th.trailAcc = (th.trailAcc || 0) + dt;
    if (th.trailAcc > 0.03) {
      th.trailAcc = 0;
      const dot = document.createElement('div');
      dot.className = 'treat-trail';
      dot.style.left = `${th.x + (Math.random() * 8 - 4)}px`;
      dot.style.top = `${th.y + (Math.random() * 8 - 4)}px`;
      stage.appendChild(dot);
      setTimeout(() => dot.remove(), 520);
    }

    const catY = stage.clientHeight * 0.26;
    const startY = stage.clientHeight - 70;
    const progress = Math.max(0, Math.min(1, (startY - th.y) / (startY - catY)));
    th.setPos(th, 1 - 0.45 * progress);

    if (!th.evaluated && th.y <= catY) {
      th.evaluated = true;
      this.evaluateLanding(th.x);
      return;
    }
    if (th.y > stage.clientHeight + 60 || th.x < -80 || th.x > stage.clientWidth + 80) {
      this.throwing = null;
      this.registerMiss('The treat went wide!');
    }
  },

  evaluateLanding(landX) {
    const stage = this.els['enc-stage'];
    const r = this.rarity();
    const catX = stage.clientWidth / 2;
    const hitRadius = stage.clientWidth * CONFIG.catchRules.hitRadiusFrac;
    this.throwing = null;
    this.els['enc-treat'].style.opacity = '0';

    if (Math.abs(landX - catX) > hitRadius) {
      this.registerMiss('Missed! The cat is unimpressed.');
      return;
    }
    if (Math.random() < r.batChance) {
      this.batAway();
      return;
    }
    const treatBonus = CONFIG.treats[State.data.selectedTreat].bonus;
    const ringBonus = CONFIG.catchRules.ringBonusMax * this.ringTightness();
    const chance = Math.min(0.98, r.baseCatch + treatBonus + ringBonus);
    this.ringFrozen = false;

    if (Math.random() < chance) {
      this.befriended();
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

    let limit;
    if (this.isStray()) {
      limit = CONFIG.strays.shots;
    } else {
      const rar = this.subject.form.rarity;
      const isRarePlus = rar === 'rare' || rar === 'legendary';
      limit = isRarePlus ? CONFIG.catchRules.maxMisses : CONFIG.catchRules.maxMisses + 2;
    }
    if (this.misses >= limit) {
      this.escape();
    } else if (!this.isStray()) {
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
    banner.textContent = this.isStray() ? 'IT SCAMPERED OFF 💨' : 'IT RAN AWAY 💨';
    banner.classList.remove('hidden', 'gotcha');
    banner.classList.add('escaped');
    setTimeout(() => { cat.classList.remove('flee'); this.close(); }, 1600);
  },

  /* ------------------------ shared reward plumbing ----------------------- */

  payRewards(baseCoins) {
    let coins = baseCoins;
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
    return { coins, dailyBonus };
  },

  /* ----------------- success: mood form (treat) befriended --------------- */

  befriended() {
    this.resolved = true;
    const form = this.subject.form;
    const r = this.rarity();

    const { coins, dailyBonus } = this.payRewards(r.coins);
    const d = State.data;
    if (form.rarity === 'legendary') d.stats.legendary += 1;
    d.collection[form.key] = (d.collection[form.key] || 0) + 1;
    const newLevels = State.addXp(r.xp);

    Sound.purr();
    setTimeout(() => Sound.coin(), 500);

    UI.heartBurst(this.els['enc-stage']);
    const banner = this.els['enc-banner'];
    banner.textContent = 'BEFRIENDED! 💖';
    banner.classList.remove('hidden', 'escaped');
    banner.classList.add('gotcha');
    this.els['enc-cat'].classList.add('caught');

    const notes = [`+${coins} 🐾 coins · +${r.xp} XP`];
    if (dailyBonus) notes.push('DAILY BONUS ×2! ☀️');
    UI.toast(notes.join('  '));

    const rare = form.rarity === 'rare' || form.rarity === 'legendary';
    setTimeout(() => {
      this.close();
      this.els['enc-cat'].classList.remove('caught');
      const after = () => { if (newLevels.length) UI.showLevelUp(newLevels[newLevels.length - 1]); };
      if (rare) UI.rareCelebration(form.rarity, Assets.catNode(form, '140px'), after);
      else after();
    }, 1700);
  },

  /* ------------- success: stray photographed → name & adopt -------------- */

  strayBefriended(stars) {
    this.resolved = true;
    const breed = this.subject.breed;
    const rarity = this.subject.rarity;
    const r = this.rarity();

    const baseCoins = Math.round(r.coins * breed.bonus) + stars * CONFIG.strays.starCoinBonus;
    const { coins, dailyBonus } = this.payRewards(baseCoins);
    if (rarity === 'legendary') State.data.stats.legendary += 1;
    const newLevels = State.addXp(r.xp);

    Sound.purr();
    setTimeout(() => Sound.coin(), 500);

    UI.heartBurst(this.els['enc-stage']);
    const banner = this.els['enc-banner'];
    banner.textContent = 'NEW FRIEND! 📸';
    banner.classList.remove('hidden', 'escaped');
    banner.classList.add('gotcha');
    this.els['enc-cat'].classList.add('caught');

    const notes = [`${'⭐'.repeat(stars)} photo! +${coins} 🐾 · +${r.xp} XP`];
    if (breed.bonus > 1) notes.push(`${breed.name} bonus ×${breed.bonus}!`);
    if (dailyBonus) notes.push('DAILY ×2! ☀️');
    UI.toast(notes.join('  '));

    const rare = rarity === 'rare' || rarity === 'legendary';
    setTimeout(() => {
      this.close();
      this.els['enc-cat'].classList.remove('caught');
      // name & adopt → then celebrate rares → then any level-up
      UI.promptAdoptName(breed, stars, rarity, () => {
        const after = () => { if (newLevels.length) UI.showLevelUp(newLevels[newLevels.length - 1]); };
        if (rare) UI.rareCelebration(rarity, Assets.strayNode(breed, '140px'), after);
        else after();
      });
    }, 1500);
  },
};
