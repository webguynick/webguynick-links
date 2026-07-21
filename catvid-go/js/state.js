/* ==========================================================================
   CatVid GO — state.js
   All player progress, saved to localStorage on every change.
   ========================================================================== */

const SAVE_KEY = 'catvidgo_save_v1';

/** Today's date as YYYY-MM-DD in the player's local timezone. */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Yesterday's date string, for streak checks. */
function yesterdayStr() {
  const d = new Date(Date.now() - 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function defaultState() {
  return {
    coins: 0,
    level: 1,
    xp: 0,                       // xp accumulated within current level
    muted: false,
    collection: {},              // { 'minnie_friendly': timesCaught, ... }
    treatsOwned: { kibble: true, salmon: false, churu: false },
    selectedTreat: 'kibble',
    items: { laser: 0, lure: 0 },   // consumable counts
    stats: { catches: 0, encounters: 0, escapes: 0, legendary: 0, coinsEarned: 0,
             snaps: 0, straysAdopted: 0 },
    streak: { count: 0, lastDay: null },
    dailyBonusDay: null,         // last day the double-coin bonus was used
    currentZone: 'backyard',
    // Cat Family: adopted strays + custom looks for the two stars
    family: [],                  // [{id,name,breedId,rarity,stars,colors,collar,accessory,adoptedAt}]
    famCustom: {
      minnie:  { collar: null, accessory: 'none' },
      biscuit: { collar: null, accessory: 'none' },
    },
  };
}

const State = {
  data: defaultState(),

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        // merge over defaults so new fields survive old saves — nested
        // objects get their own merge so new stat keys don't vanish
        const def = defaultState();
        const saved = JSON.parse(raw);
        ['stats', 'items', 'treatsOwned', 'streak', 'famCustom'].forEach((k) => {
          if (saved[k]) saved[k] = Object.assign(def[k], saved[k]);
        });
        this.data = Object.assign(def, saved);
      }
    } catch (e) { /* corrupted save → start fresh */ }
    this.touchStreak();
    return this.data;
  },

  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* storage full/blocked */ }
  },

  reset() {
    this.data = defaultState();
    this.touchStreak();
    this.save();
  },

  /** Update the consecutive-days-played streak. Called on boot. */
  touchStreak() {
    const s = this.data.streak;
    const today = todayStr();
    if (s.lastDay === today) return;              // already counted today
    s.count = (s.lastDay === yesterdayStr()) ? s.count + 1 : 1;
    s.lastDay = today;
    this.save();
  },

  /** True if this catch qualifies for the daily double-coin bonus. */
  dailyBonusAvailable() {
    return this.data.dailyBonusDay !== todayStr();
  },
  consumeDailyBonus() {
    this.data.dailyBonusDay = todayStr();
    this.save();
  },

  /** Add XP; returns array of levels gained (may be empty). */
  addXp(amount) {
    const d = this.data;
    const gained = [];
    d.xp += amount;
    while (d.level < CONFIG.levels.maxLevel && d.xp >= CONFIG.levels.xpForLevel(d.level)) {
      d.xp -= CONFIG.levels.xpForLevel(d.level);
      d.level += 1;
      gained.push(d.level);
    }
    this.save();
    return gained;
  },

  zoneUnlocked(zoneId) {
    return this.data.level >= (CONFIG.levels.zoneUnlocks[zoneId] || 1);
  },

  /** Adopt a stray into the Cat Family. Returns the new family entry. */
  adoptStray({ name, breedId, rarity, stars }) {
    const entry = {
      id: `fam_${Date.now()}_${Math.floor(Math.random() * 1e5)}`,
      name, breedId, rarity, stars,
      colors: {},                 // player recolors land here
      collar: null,
      accessory: 'none',
      adoptedAt: todayStr(),
    };
    this.data.family.push(entry);
    this.data.stats.straysAdopted += 1;
    this.save();
    return entry;
  },
};
