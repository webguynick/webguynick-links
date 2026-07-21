/* ==========================================================================
   CatVid GO — ui.js
   Screens & chrome: navigation, HUD, Cat-alog, Shop, Profile, Settings,
   share card renderer, toasts, hearts, level-up celebration.
   ========================================================================== */

/* Inline paw SVG used for header + currency + tabs (uses currentColor). */
const PAW_SVG = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <ellipse cx="6" cy="9.5" rx="2.1" ry="2.8"/>
  <ellipse cx="12" cy="7.5" rx="2.2" ry="2.9"/>
  <ellipse cx="18" cy="9.5" rx="2.1" ry="2.8"/>
  <path d="M12 12c-3.4 0-6.3 2.5-6.3 5.2 0 1.7 1.3 2.8 3 2.8 1.2 0 2.1-.5 3.3-.5s2.1.5 3.3.5c1.7 0 3-1.1 3-2.8C18.3 14.5 15.4 12 12 12z"/>
</svg>`;

const RARITY_ORDER = { legendary: 4, rare: 3, uncommon: 2, common: 1 };

const UI = {
  currentScreen: 'map',

  init() {
    // stamp paw icons everywhere they're declared
    document.querySelectorAll('.paw-icon').forEach((el) => { el.innerHTML = PAW_SVG; });

    // bottom tab navigation
    document.querySelectorAll('#tabbar .tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        Sound.pop();
        this.show(tab.dataset.screen);
      });
    });

    document.getElementById('play-btn').addEventListener('click', () => {
      Sound.ensure(); // unlock audio on first gesture
      Sound.pop();
      document.getElementById('splash').classList.add('gone');
      setTimeout(() => document.getElementById('splash').remove(), 600);
    });

    // Enter key submits the name modal
    document.getElementById('name-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('name-ok').click();
    });

    this.initSettings();
    this.updateHud();
  },

  /* ---------------------------- navigation ------------------------------ */

  show(name) {
    this.currentScreen = name;
    document.querySelectorAll('main .screen').forEach((s) => {
      s.classList.toggle('active', s.id === `screen-${name}`);
    });
    document.querySelectorAll('#tabbar .tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.screen === name);
    });
    if (name === 'catalog') this.renderCatalog();
    if (name === 'family') this.renderFamily();
    if (name === 'shop') this.renderShop();
    if (name === 'profile') this.renderProfile();
    this.updateHud();
  },

  /* ------------------------------- HUD ---------------------------------- */

  updateHud() {
    document.getElementById('hud-coins').textContent = State.data.coins;
    document.getElementById('hud-level').textContent = `Lv ${State.data.level}`;
  },

  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  },

  /** Burst of floating hearts (used on successful catch). */
  heartBurst(container) {
    for (let i = 0; i < 14; i++) {
      const h = document.createElement('div');
      h.className = 'heart';
      h.textContent = ['💖', '💕', '😻', '✨'][i % 4];
      h.style.left = `${35 + Math.random() * 30}%`;
      h.style.top = `${20 + Math.random() * 20}%`;
      h.style.animationDelay = `${Math.random() * 0.4}s`;
      h.style.fontSize = `${18 + Math.random() * 22}px`;
      container.appendChild(h);
      setTimeout(() => h.remove(), 1800);
    }
  },

  /* --------------------------- level-up screen --------------------------- */

  showLevelUp(newLevel) {
    Sound.levelUp();
    const ov = document.getElementById('levelup');
    document.getElementById('levelup-num').textContent = newLevel;

    // did this level unlock a zone?
    const unlocked = Object.entries(CONFIG.levels.zoneUnlocks)
      .filter(([, lv]) => lv === newLevel)
      .map(([zoneId]) => ZONES.find((z) => z.id === zoneId));
    document.getElementById('levelup-unlock').textContent = unlocked.length
      ? `NEW ZONE UNLOCKED: ${unlocked[0].icon} ${unlocked[0].name}!`
      : '';

    ov.classList.remove('hidden');
    this.heartBurst(ov);
    document.getElementById('levelup-close').onclick = () => {
      Sound.pop();
      ov.classList.add('hidden');
      GameMap.renderZoneTabs(); // reflect any new unlocks
    };
  },

  /* ------------------------------ Cat-alog ------------------------------- */

  renderCatalog() {
    const grid = document.getElementById('catalog-grid');
    grid.innerHTML = '';
    const caughtCount = ALL_FORMS.filter((f) => State.data.collection[f.key]).length;
    document.getElementById('catalog-count').textContent = `${caughtCount} / ${ALL_FORMS.length} befriended`;

    ALL_FORMS.forEach((form) => {
      const times = State.data.collection[form.key] || 0;
      const r = CONFIG.rarity[form.rarity];
      const card = document.createElement('div');
      card.className = `cata-card rarity-${form.rarity}` + (times ? '' : ' uncaught');

      if (times) {
        const art = document.createElement('div');
        art.className = 'cata-art';
        art.appendChild(Assets.catNode(form, '76px'));
        card.appendChild(art);
        card.insertAdjacentHTML('beforeend', `
          <div class="cata-name">${form.moodName}</div>
          <div class="cata-cat">${form.catName}</div>
          <div class="cata-stars">${'★'.repeat(r.stars)}</div>
          <div class="cata-times">befriended ×${times}</div>
          <div class="cata-desc">${form.desc}</div>`);
      } else {
        card.insertAdjacentHTML('beforeend', `
          <div class="cata-art"><div class="cata-mystery">?</div></div>
          <div class="cata-name">???</div>
          <div class="cata-cat">${form.catName}</div>
          <div class="cata-stars dim">${'★'.repeat(r.stars)}</div>
          <div class="cata-times">${r.label}</div>`);
      }
      grid.appendChild(card);
    });

    document.getElementById('share-btn').onclick = () => { Sound.pop(); this.renderShareCard(); };
  },

  /* --------------------- share card (1080×1080 PNG) ---------------------- */

  renderShareCard() {
    const caught = ALL_FORMS
      .filter((f) => State.data.collection[f.key])
      .sort((a, b) => RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity]
        || (State.data.collection[b.key] - State.data.collection[a.key]));

    if (!caught.length) { this.toast('Befriend a cat first, then flex. 😼'); return; }

    const c = document.createElement('canvas');
    c.width = 1080; c.height = 1080;
    const ctx = c.getContext('2d');
    const B = CONFIG.brand;
    const F = (w, s) => `${w} ${s}px Poppins, 'Segoe UI', system-ui, sans-serif`;

    // background + header band
    ctx.fillStyle = B.cream; ctx.fillRect(0, 0, 1080, 1080);
    ctx.fillStyle = B.coral; ctx.fillRect(0, 0, 1080, 190);
    ctx.fillStyle = '#fff';
    ctx.font = F(800, 76); ctx.textAlign = 'center';
    ctx.fillText('🐾 CatVid GO', 540, 95);
    ctx.font = F(600, 40);
    ctx.fillText(`My Cat-alog · Level ${State.data.level} Trainer`, 540, 155);

    // top 6 rarest catches as rounded cards
    const top = caught.slice(0, 6);
    const cw = 300, ch = 330, gap = 40;
    const x0 = (1080 - (3 * cw + 2 * gap)) / 2;
    top.forEach((form, i) => {
      const x = x0 + (i % 3) * (cw + gap);
      const y = 250 + Math.floor(i / 3) * (ch + gap);
      const r = CONFIG.rarity[form.rarity];

      // card
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = form.rarity === 'legendary' ? B.gold : '#eadfce';
      ctx.lineWidth = form.rarity === 'legendary' ? 8 : 3;
      this.roundRect(ctx, x, y, cw, ch, 28);
      ctx.fill(); ctx.stroke();

      // art: sprite if present, else coat-gradient + emoji placeholder
      if (Assets.has(form.sprite)) {
        ctx.drawImage(Assets.images[form.sprite], x + 70, y + 25, 160, 160);
      } else {
        const cat = CATS[form.catId];
        const g = ctx.createLinearGradient(x, y, x + cw, y + 180);
        g.addColorStop(0, cat.coat1); g.addColorStop(1, cat.coat2);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x + cw / 2, y + 105, 80, 0, Math.PI * 2); ctx.fill();
        ctx.font = '80px serif';
        ctx.fillText(cat.emoji, x + cw / 2, y + 135);
      }

      ctx.fillStyle = B.charcoal;
      ctx.font = F(700, 30);
      ctx.fillText(form.moodName, x + cw / 2, y + 235);
      ctx.font = F(400, 24);
      ctx.fillText(form.catName, x + cw / 2, y + 268);
      ctx.fillStyle = B.gold;
      ctx.font = F(700, 30);
      ctx.fillText('★'.repeat(r.stars), x + cw / 2, y + 305);
    });

    // footer branding
    ctx.fillStyle = B.charcoal;
    ctx.font = F(600, 36);
    ctx.fillText(`${State.data.stats.catches} cats befriended · ${State.data.stats.legendary} legendary`, 540, 1000);
    ctx.fillStyle = B.coral;
    ctx.font = F(800, 44);
    ctx.fillText('befriend them all at crazycatvid.com 🐾', 540, 1055);

    // download as PNG
    c.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'catvid-go-share.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      this.toast('Share card downloaded! 📸');
    }, 'image/png');
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  /* ------------------------------ Cat Family ------------------------------ */

  renderFamily() {
    const list = document.getElementById('family-list');
    list.innerHTML = '';
    const d = State.data;

    // the two stars are always family
    CAT_IDS.forEach((catId) => {
      const cat = CATS[catId];
      const custom = d.famCustom[catId];
      list.appendChild(this.familyCard({
        node: Assets.catNode(
          { catId, sprite: ASSET_MANIFEST.catSprite(catId, 'friendly'), catName: cat.name, moodName: 'Friendly', emoji: '⭐' },
          '90px',
          { collar: custom.collar, accessory: custom.accessory }
        ),
        name: cat.name,
        sub: `${cat.blurb}`,
        badge: '⭐ Original',
        onCustomize: () => this.openCustomizer({ starId: catId }),
      }));
    });

    // adopted strays
    d.family.forEach((fam) => {
      const breed = BREEDS.find((b) => b.id === fam.breedId);
      if (!breed) return;
      const r = CONFIG.rarity[fam.rarity];
      list.appendChild(this.familyCard({
        node: Assets.strayNode(breed, '90px',
          Object.assign({}, fam.colors, { collar: fam.collar, accessory: fam.accessory })),
        name: fam.name,
        sub: `${breed.name} · adopted ${fam.adoptedAt}`,
        badge: `${'★'.repeat(r.stars)} · ${'⭐'.repeat(fam.stars)} photo`,
        onCustomize: () => this.openCustomizer({ fam }),
        onRename: () => this.promptRename(fam),
      }));
    });

    document.getElementById('family-count').textContent =
      `${2 + d.family.length} cats`;
    document.getElementById('family-empty').classList.toggle('hidden', d.family.length > 0);
  },

  familyCard({ node, name, sub, badge, onCustomize, onRename }) {
    const card = document.createElement('div');
    card.className = 'fam-card';
    const art = document.createElement('div');
    art.className = 'fam-art';
    art.appendChild(node);
    const info = document.createElement('div');
    info.className = 'fam-info';
    info.innerHTML = `<div class="fam-name">${name}</div>
      <div class="fam-sub">${sub}</div>
      <div class="fam-badge">${badge}</div>`;
    const btns = document.createElement('div');
    btns.className = 'fam-btns';
    const cust = document.createElement('button');
    cust.className = 'btn btn-gold fam-btn';
    cust.textContent = '🎨';
    cust.title = 'Customize';
    cust.addEventListener('click', () => { Sound.pop(); onCustomize(); });
    btns.appendChild(cust);
    if (onRename) {
      const ren = document.createElement('button');
      ren.className = 'btn btn-outline fam-btn';
      ren.textContent = '✏️';
      ren.title = 'Rename';
      ren.addEventListener('click', () => { Sound.pop(); onRename(); });
      btns.appendChild(ren);
    }
    card.append(art, info, btns);
    return card;
  },

  /* --------------------- adopt / rename name prompt ----------------------- */

  /** Modal asking the player to name a freshly-photographed stray. */
  promptAdoptName(breed, stars, rarity, done) {
    const ov = document.getElementById('name-modal');
    const art = document.getElementById('name-art');
    art.innerHTML = '';
    art.appendChild(Assets.strayNode(breed, '110px'));
    document.getElementById('name-title').textContent = `You made a friend!`;
    document.getElementById('name-sub').textContent =
      `A ${breed.name} wants to join your Cat Family. What's their name?`;
    const input = document.getElementById('name-input');
    input.value = '';

    document.getElementById('name-random').onclick = () => {
      Sound.pop();
      input.value = NAME_SUGGESTIONS[Math.floor(Math.random() * NAME_SUGGESTIONS.length)];
    };
    document.getElementById('name-ok').onclick = () => {
      const name = (input.value.trim() || breed.name).slice(0, 20);
      State.adoptStray({ name, breedId: breed.id, rarity, stars });
      ov.classList.add('hidden');
      Sound.purr();
      this.toast(`${name} joined your Cat Family! 🏡`);
      this.updateHud();
      done && done();
    };
    ov.classList.remove('hidden');
    setTimeout(() => input.focus(), 250);
  },

  /** Rename an adopted family cat. */
  promptRename(fam) {
    const ov = document.getElementById('name-modal');
    const breed = BREEDS.find((b) => b.id === fam.breedId);
    const art = document.getElementById('name-art');
    art.innerHTML = '';
    art.appendChild(Assets.strayNode(breed, '110px',
      Object.assign({}, fam.colors, { collar: fam.collar, accessory: fam.accessory })));
    document.getElementById('name-title').textContent = `Rename ${fam.name}`;
    document.getElementById('name-sub').textContent = 'New name, same attitude.';
    const input = document.getElementById('name-input');
    input.value = fam.name;

    document.getElementById('name-random').onclick = () => {
      Sound.pop();
      input.value = NAME_SUGGESTIONS[Math.floor(Math.random() * NAME_SUGGESTIONS.length)];
    };
    document.getElementById('name-ok').onclick = () => {
      fam.name = (input.value.trim() || fam.name).slice(0, 20);
      State.save();
      ov.classList.add('hidden');
      this.toast('Renamed! They pretend not to care. 😼');
      this.renderFamily();
    };
    ov.classList.remove('hidden');
  },

  /* ---------------------- customize (colors & style) ---------------------- */

  /**
   * Customizer modal. Pass { fam } for an adopted stray (full recolor) or
   * { starId } for Minnie/Biscuit (collar + accessory only — you don't get
   * to repaint the real cats, they have a brand to maintain).
   */
  openCustomizer(target) {
    const ov = document.getElementById('custom-modal');
    const isStar = !!target.starId;
    const fam = target.fam;
    const breed = isStar ? null : BREEDS.find((b) => b.id === fam.breedId);

    // working copy (only saved on ✓)
    const work = isStar
      ? Object.assign({ collar: null, accessory: 'none' }, State.data.famCustom[target.starId])
      : Object.assign({ collar: fam.collar, accessory: fam.accessory }, fam.colors);

    document.getElementById('custom-title').textContent =
      isStar ? `Style ${CATS[target.starId].name}` : `Customize ${fam.name}`;

    const preview = document.getElementById('custom-preview');
    const paint = () => {
      preview.innerHTML = '';
      preview.appendChild(isStar
        ? Assets.catNode(
            { catId: target.starId, sprite: ASSET_MANIFEST.catSprite(target.starId, 'friendly'),
              catName: CATS[target.starId].name, moodName: 'Friendly', emoji: '⭐' },
            '130px', work)
        : Assets.strayNode(breed, '130px', work));
    };
    paint();

    const rows = document.getElementById('custom-rows');
    rows.innerHTML = '';

    const swatchRow = (label, colors, key, allowNone) => {
      const row = document.createElement('div');
      row.className = 'custom-row';
      row.innerHTML = `<span class="custom-label">${label}</span>`;
      const box = document.createElement('div');
      box.className = 'swatches';
      if (allowNone) {
        const none = document.createElement('button');
        none.className = 'swatch none' + (!work[key] ? ' active' : '');
        none.textContent = '✕';
        none.addEventListener('click', () => { work[key] = null; Sound.pop(); rebuild(); });
        box.appendChild(none);
      }
      colors.forEach((c) => {
        const b = document.createElement('button');
        b.className = 'swatch' + (work[key] === c ? ' active' : '');
        b.style.background = c;
        b.addEventListener('click', () => { work[key] = c; Sound.pop(); rebuild(); });
        box.appendChild(b);
      });
      row.appendChild(box);
      return row;
    };

    const accRow = () => {
      const row = document.createElement('div');
      row.className = 'custom-row';
      row.innerHTML = `<span class="custom-label">Accessory</span>`;
      const box = document.createElement('div');
      box.className = 'swatches';
      ACCESSORIES.forEach((a) => {
        const b = document.createElement('button');
        b.className = 'swatch acc' + (work.accessory === a.id ? ' active' : '');
        b.textContent = a.emoji;
        b.title = a.name;
        b.addEventListener('click', () => { work.accessory = a.id; Sound.pop(); rebuild(); });
        box.appendChild(b);
      });
      row.appendChild(box);
      return row;
    };

    const rebuild = () => {
      rows.innerHTML = '';
      if (!isStar) {
        rows.appendChild(swatchRow('Coat', CUSTOM_COLORS, 'body'));
        rows.appendChild(swatchRow('Markings', CUSTOM_COLORS, 'patch'));
      }
      rows.appendChild(swatchRow('Collar', COLLAR_COLORS, 'collar', true));
      rows.appendChild(accRow());
      paint();
    };
    rebuild();

    document.getElementById('custom-reset').onclick = () => {
      Sound.pop();
      delete work.body; delete work.patch;
      work.collar = null; work.accessory = 'none';
      rebuild();
    };
    document.getElementById('custom-ok').onclick = () => {
      if (isStar) {
        State.data.famCustom[target.starId] = { collar: work.collar, accessory: work.accessory };
      } else {
        fam.collar = work.collar;
        fam.accessory = work.accessory;
        fam.colors = {};
        if (work.body) fam.colors.body = work.body;
        if (work.patch) fam.colors.patch = work.patch;
      }
      State.save();
      ov.classList.add('hidden');
      Sound.coin();
      this.toast('Lookin\' good! ✨');
      this.renderFamily();
    };
    document.getElementById('custom-cancel').onclick = () => ov.classList.add('hidden');
    ov.classList.remove('hidden');
  },

  /* ----------------- rare befriend celebration (the flex) ----------------- */

  /**
   * Full-screen celebration for rare/legendary friends: spinning light rays,
   * confetti rain, sparkle burst, chunky banner. `node` = cat art to show.
   */
  rareCelebration(rarity, node, done) {
    const ov = document.getElementById('celebrate');
    const isLegend = rarity === 'legendary';
    ov.className = 'overlay celebrate ' + (isLegend ? 'legend' : 'rare');

    document.getElementById('celebrate-title').textContent =
      isLegend ? '🌟 LEGENDARY FRIEND 🌟' : '✨ RARE FRIEND ✨';

    const artBox = document.getElementById('celebrate-art');
    artBox.innerHTML = '';
    if (node) artBox.appendChild(node);

    // confetti rain
    const confBox = document.getElementById('celebrate-confetti');
    confBox.innerHTML = '';
    const bits = ['🎉', '✨', '⭐', '💖', '🐾', '🎊'];
    for (let i = 0; i < 34; i++) {
      const c = document.createElement('span');
      c.className = 'confetti';
      c.textContent = bits[i % bits.length];
      c.style.left = `${Math.random() * 100}%`;
      c.style.animationDelay = `${Math.random() * 1.2}s`;
      c.style.animationDuration = `${1.6 + Math.random() * 1.4}s`;
      c.style.fontSize = `${14 + Math.random() * 20}px`;
      confBox.appendChild(c);
    }

    Sound.sparkle();
    setTimeout(() => Sound.levelUp(), 300);
    ov.classList.remove('hidden');

    const finish = () => {
      ov.classList.add('hidden');
      done && done();
    };
    document.getElementById('celebrate-close').onclick = () => { Sound.pop(); finish(); };
    // auto-dismiss so it never blocks play
    clearTimeout(this._celebTimer);
    this._celebTimer = setTimeout(() => {
      if (!ov.classList.contains('hidden')) finish();
    }, 4200);
  },

  /* -------------------------------- Shop --------------------------------- */

  renderShop() {
    const list = document.getElementById('shop-list');
    list.innerHTML = '';
    const d = State.data;

    // treats (permanent upgrades)
    Object.entries(CONFIG.treats).forEach(([id, t]) => {
      const owned = d.treatsOwned[id];
      list.appendChild(this.shopRow({
        icon: Assets.treatNode(id, '40px'),
        name: t.name, desc: t.desc, cost: t.cost,
        btnLabel: owned ? (d.selectedTreat === id ? 'EQUIPPED' : 'EQUIP') : `${t.cost} 🐾`,
        disabled: owned && d.selectedTreat === id,
        onBuy: () => {
          if (owned) { d.selectedTreat = id; State.save(); Sound.pop(); this.renderShop(); return; }
          if (d.coins < t.cost) { this.toast('Not enough paw coins! 🐾'); return; }
          d.coins -= t.cost;
          d.treatsOwned[id] = true;
          d.selectedTreat = id;
          State.save(); Sound.coin();
          this.toast(`${t.name} unlocked & equipped! 🎉`);
          this.renderShop(); this.updateHud();
        },
      }));
    });

    // consumables
    Object.entries(CONFIG.items).forEach(([id, item]) => {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'treat-emoji';
      iconSpan.style.fontSize = '32px';
      iconSpan.textContent = item.emoji;
      list.appendChild(this.shopRow({
        icon: iconSpan,
        name: `${item.name} (×${d.items[id]})`, desc: item.desc, cost: item.cost,
        btnLabel: `${item.cost} 🐾`,
        onBuy: () => {
          if (d.coins < item.cost) { this.toast('Not enough paw coins! 🐾'); return; }
          d.coins -= item.cost;
          d.items[id] += 1;
          State.save(); Sound.coin();
          if (id === 'lure') {
            GameMap.activateLure();
            this.toast('Catnip Lure active — cats incoming! 🌿');
            this.show('map');
          } else {
            this.toast(`${item.name} added to your bag!`);
          }
          this.renderShop(); this.updateHud();
        },
      }));
    });
  },

  shopRow({ icon, name, desc, btnLabel, disabled, onBuy }) {
    const row = document.createElement('div');
    row.className = 'shop-row';
    const iconBox = document.createElement('div');
    iconBox.className = 'shop-icon';
    iconBox.appendChild(icon);
    const info = document.createElement('div');
    info.className = 'shop-info';
    info.innerHTML = `<div class="shop-name">${name}</div><div class="shop-desc">${desc}</div>`;
    const btn = document.createElement('button');
    btn.className = 'btn btn-coral shop-buy';
    btn.textContent = btnLabel;
    btn.disabled = !!disabled;
    btn.addEventListener('click', onBuy);
    row.append(iconBox, info, btn);
    return row;
  },

  /* ------------------------------ Profile -------------------------------- */

  renderProfile() {
    const d = State.data;
    const need = CONFIG.levels.xpForLevel(d.level);
    document.getElementById('prof-level').textContent = d.level;
    document.getElementById('prof-xp-label').textContent = `${d.xp} / ${need} XP`;
    document.getElementById('prof-xp-fill').style.width = `${Math.min(100, (d.xp / need) * 100)}%`;
    document.getElementById('prof-streak').textContent = `${d.streak.count} day${d.streak.count === 1 ? '' : 's'}`;
    document.getElementById('prof-daily').textContent = State.dailyBonusAvailable()
      ? 'Available — next catch = ×2 coins! ☀️' : 'Used today — back tomorrow!';

    const s = d.stats;
    document.getElementById('prof-stats').innerHTML = `
      <div class="stat"><b>${s.catches}</b><span>befriended</span></div>
      <div class="stat"><b>${s.legendary}</b><span>legendary</span></div>
      <div class="stat"><b>${s.encounters}</b><span>encounters</span></div>
      <div class="stat"><b>${s.snaps}</b><span>pics snapped</span></div>
      <div class="stat"><b>${s.straysAdopted}</b><span>strays adopted</span></div>
      <div class="stat"><b>${s.coinsEarned}</b><span>coins earned</span></div>
      <div class="stat"><b>${s.escapes}</b><span>got away</span></div>
      <div class="stat"><b>${ALL_FORMS.filter((f) => d.collection[f.key]).length}/24</b><span>Cat-alog</span></div>
      <div class="stat"><b>${2 + d.family.length}</b><span>family cats</span></div>`;
  },

  /* ------------------------------ Settings ------------------------------- */

  initSettings() {
    const muteBtn = document.getElementById('set-mute');
    const paint = () => { muteBtn.textContent = State.data.muted ? '🔇 Sound: OFF' : '🔊 Sound: ON'; };
    paint();
    muteBtn.addEventListener('click', () => {
      State.data.muted = !State.data.muted;
      State.save();
      paint();
      Sound.pop(); // audible confirmation when unmuting
    });

    document.getElementById('set-reset').addEventListener('click', () => {
      if (confirm('Reset ALL progress? Your cats will miss you. This cannot be undone.')) {
        State.reset();
        this.updateHud();
        this.toast('Progress reset. Fresh start! 🐾');
        GameMap.setZone('backyard');
        this.show('map');
      }
    });
  },
};
