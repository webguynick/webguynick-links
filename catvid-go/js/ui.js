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
    document.getElementById('catalog-count').textContent = `${caughtCount} / ${ALL_FORMS.length} caught`;

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
          <div class="cata-times">caught ×${times}</div>
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

    if (!caught.length) { this.toast('Catch a cat first, then flex. 😼'); return; }

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
    ctx.fillText(`${State.data.stats.catches} cats caught · ${State.data.stats.legendary} legendary`, 540, 1000);
    ctx.fillStyle = B.coral;
    ctx.font = F(800, 44);
    ctx.fillText('catch them all at crazycatvid.com 🐾', 540, 1055);

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
      <div class="stat"><b>${s.catches}</b><span>cats caught</span></div>
      <div class="stat"><b>${s.legendary}</b><span>legendary</span></div>
      <div class="stat"><b>${s.encounters}</b><span>encounters</span></div>
      <div class="stat"><b>${s.escapes}</b><span>escapes</span></div>
      <div class="stat"><b>${s.coinsEarned}</b><span>coins earned</span></div>
      <div class="stat"><b>${ALL_FORMS.filter((f) => d.collection[f.key]).length}/24</b><span>Cat-alog</span></div>`;
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
