/* ==========================================================================
   CatVid GO — config.js
   ==========================================================================
   EVERYTHING you might want to tweak lives in this file:
   - ASSET_MANIFEST : every image slot the game looks for (drop in real art!)
   - CONFIG         : spawn rates, catch chances, prices, XP curve, physics
   - CATS / MOODS   : the 24 collectible forms + their meme descriptions

   The game probes each asset path on boot. If the file exists it is used;
   if not, a styled CSS placeholder (colored card + cat emoji) is shown, so
   the game is 100% playable with an empty /assets folder.
   ========================================================================== */

/* --------------------------------------------------------------------------
   ASSET_MANIFEST — exact filenames the game expects.
   Replace placeholders by simply dropping files at these paths.

   CAT SPRITES (512x512 PNG, transparent background):
     assets/cats/minnie_friendly.png      assets/cats/biscuit_friendly.png
     assets/cats/minnie_loaf.png          assets/cats/biscuit_loaf.png
     assets/cats/minnie_attentive.png     assets/cats/biscuit_attentive.png
     assets/cats/minnie_mine.png          assets/cats/biscuit_mine.png
     assets/cats/minnie_belly.png         assets/cats/biscuit_belly.png
     assets/cats/minnie_cautious.png      assets/cats/biscuit_cautious.png
     assets/cats/minnie_focus.png         assets/cats/biscuit_focus.png
     assets/cats/minnie_hunting.png       assets/cats/biscuit_hunting.png
     assets/cats/minnie_irritated.png     assets/cats/biscuit_irritated.png
     assets/cats/minnie_murdermode.png    assets/cats/biscuit_murdermode.png
     assets/cats/minnie_floof.png         assets/cats/biscuit_floof.png
     assets/cats/minnie_zoomies.png       assets/cats/biscuit_zoomies.png

   MAP TILES (1024x1024 PNG, top-down cartoon):
     assets/map/backyard.png        — grass, fence, flower beds
     assets/map/living_room.png     — couch, rug, cat tree
     assets/map/kitchen.png         — counters, food bowls
     assets/map/midnight.png        — dark "3AM zoomies" night zone

   TREAT SPRITES (256x256 PNG, transparent background):
     assets/ui/treat_kibble.png
     assets/ui/treat_salmon.png
     assets/ui/treat_churu.png

   BRANDING:
     assets/logo.png                — 800x300 PNG, game logo
     assets/icon-192.png            — 192x192 PWA icon (generated, replaceable)
     assets/icon-512.png            — 512x512 PWA icon (generated, replaceable)

   FONT (optional — falls back to system fonts if missing):
     assets/fonts/Poppins-Bold.woff2
     assets/fonts/Poppins-SemiBold.woff2
     assets/fonts/Poppins-Regular.woff2
   -------------------------------------------------------------------------- */

const ASSET_MANIFEST = {
  logo: 'assets/logo.png',
  treats: {
    kibble: 'assets/ui/treat_kibble.png',
    salmon: 'assets/ui/treat_salmon.png',
    churu:  'assets/ui/treat_churu.png',
  },
  maps: {
    backyard: 'assets/map/backyard.png',
    living:   'assets/map/living_room.png',
    kitchen:  'assets/map/kitchen.png',
    midnight: 'assets/map/midnight.png',
  },
  // cat sprite path builder: assets/cats/<catId>_<moodId>.png
  catSprite: (catId, moodId) => `assets/cats/${catId}_${moodId}.png`,
};

/* --------------------------------------------------------------------------
   CONFIG — the master tuning object.
   -------------------------------------------------------------------------- */
const CONFIG = {

  brand: {
    site: 'crazycatvid.com',
    coral:    '#FF6F61',
    gold:     '#F4B942',
    charcoal: '#2B2826',
    cream:    '#FFF6EC',
  },

  /* --- Map spawning ------------------------------------------------------ */
  spawn: {
    minDelayMs: 5000,     // a new cat appears every 5–15 s
    maxDelayMs: 15000,
    despawnMs: 20000,     // untapped cats vanish after 20 s
    maxCatsOnMap: 6,      // hard cap of simultaneous cats
    lureMultiplier: 2,    // Catnip Lure: spawn rate multiplier
    lureDurationMs: 60000,
    // In the Midnight Zoomies zone, legendary spawn weight is multiplied:
    midnightLegendaryMult: 2,
  },

  /* --- Rarity table ------------------------------------------------------
     weight     : relative spawn chance (60/25/10/5 = %)
     coins / xp : reward per catch
     ringSpeed  : attention-ring oscillation speed (higher = harder)
     baseCatch  : catch chance before ring & treat bonuses
     batChance  : chance the cat bats the treat away mid-air
     aura       : map glow color (null = none)                              */
  rarity: {
    common:    { weight: 60, coins: 10,  xp: 10,  ringSpeed: 1.0, baseCatch: 0.80, batChance: 0.00, aura: null,    stars: 1, label: 'Common' },
    uncommon:  { weight: 25, coins: 25,  xp: 25,  ringSpeed: 1.5, baseCatch: 0.62, batChance: 0.06, aura: 'green', stars: 2, label: 'Uncommon' },
    rare:      { weight: 10, coins: 75,  xp: 60,  ringSpeed: 2.1, baseCatch: 0.45, batChance: 0.14, aura: 'blue',  stars: 3, label: 'Rare' },
    legendary: { weight: 5,  coins: 250, xp: 150, ringSpeed: 2.8, baseCatch: 0.30, batChance: 0.22, aura: 'gold',  stars: 4, label: 'Legendary' },
  },

  /* --- Encounter / catch mechanic ---------------------------------------- */
  catchRules: {
    ringBonusMax: 0.35,   // bonus catch chance when the ring is at its smallest
    hitRadiusFrac: 0.16,  // treat must land within this fraction of screen width of cat center
    maxMisses: 3,         // rare+ cats run away after this many misses
    gravity: 2400,        // px/s² pulling the thrown treat down
    throwPower: 1.15,     // multiplier on swipe velocity (feel tuning)
    minThrowSpeed: 350,   // px/s — softer swipes just drop the treat
  },

  /* --- Shop -------------------------------------------------------------- */
  treats: {
    kibble: { name: 'Basic Kibble',  bonus: 0.00, cost: 0,   emoji: '🥣', desc: 'Free forever. Gets the job done. Ish.' },
    salmon: { name: 'Salmon Snack',  bonus: 0.15, cost: 100, emoji: '🐟', desc: '+15% catch rate. Smells like commitment.' },
    churu:  { name: 'Churu Tube',    bonus: 0.35, cost: 300, emoji: '🍦', desc: '+35% catch rate. Cats sign contracts for this.' },
  },
  items: {
    laser: { name: 'Laser Pointer', cost: 150, emoji: '🔴', desc: 'Freezes the attention ring for one throw.' },
    lure:  { name: 'Catnip Lure',   cost: 200, emoji: '🌿', desc: 'Doubles cat spawns for 60 seconds.' },
  },

  /* --- Levels & zone unlocks --------------------------------------------- */
  levels: {
    // XP needed to go from level N to N+1:
    xpForLevel: (lvl) => 80 + (lvl - 1) * 50,
    maxLevel: 50,
    zoneUnlocks: { backyard: 1, living: 3, kitchen: 5, midnight: 8 },
  },

  /* --- Daily bonus / streak ---------------------------------------------- */
  daily: {
    firstCatchCoinMult: 2,   // first catch of the day = double coins
  },
};

/* --------------------------------------------------------------------------
   THE STARS — Minnie Mouse & Biscuit, the real cats of crazycatvid.com
   -------------------------------------------------------------------------- */
const CATS = {
  minnie: {
    name: 'Minnie Mouse',
    emoji: '🐈‍⬛',
    // placeholder card colors (tuxedo: black w/ white chest)
    coat1: '#2B2826', coat2: '#f5f0e8',
    blurb: 'Tuxedo cat. Permanently dressed for an award show she did not attend.',
  },
  biscuit: {
    name: 'Biscuit',
    emoji: '🐈',
    // placeholder card colors (grey tabby patches on white)
    coat1: '#9aa2ad', coat2: '#ffffff',
    blurb: 'Grey & white. Round of belly, pure of heart, motivated by snacks.',
  },
};

/* --------------------------------------------------------------------------
   MOODS — 12 mood forms × 2 cats = 24 Cat-alog entries.
   `desc` holds the meme-voice one-liner per cat.
   -------------------------------------------------------------------------- */
const MOODS = [
  /* ------------------------------- COMMON ------------------------------- */
  { id: 'friendly', name: 'Friendly', rarity: 'common', emoji: '😺',
    desc: {
      minnie:  'Tail up, tuxedo on. She is approaching YOU, which legally makes you the chosen one.',
      biscuit: 'Trots over with the belly gently swinging. Snack radar: fully operational.',
    } },
  { id: 'loaf', name: 'Relaxed Loaf', rarity: 'common', emoji: '🍞',
    desc: {
      minnie:  'A perfect tuxedo loaf. Paws fully retracted. Do not disturb — she is rendering.',
      biscuit: 'A fresh-baked Biscuit, straight out of the oven. Warm, round, zero thoughts detected.',
    } },
  { id: 'attentive', name: 'Attentive', rarity: 'common', emoji: '🧐',
    desc: {
      minnie:  'Sitting tall like she pays rent here. (She does not pay rent here.)',
      biscuit: 'Sitting at full height to supervise the kitchen. Self-appointed inspector of snacks.',
    } },
  /* ------------------------------ UNCOMMON ------------------------------ */
  { id: 'mine', name: 'This Is Mine', rarity: 'uncommon', emoji: '🫠',
    desc: {
      minnie:  'She rubbed her face on it, so it is hers now. That includes you, the couch, and your tax documents.',
      biscuit: 'Head-bonked your laptop three times. Congratulations, your career belongs to Biscuit now.',
    } },
  { id: 'belly', name: 'Trusting Belly', rarity: 'uncommon', emoji: '🙃',
    desc: {
      minnie:  'The famous tuxedo belly reveal. Touching it voids your warranty and also your skin.',
      biscuit: 'The roundest, softest trap ever deployed. Success rate: 100% since the dawn of time.',
    } },
  { id: 'cautious', name: 'Cautious', rarity: 'uncommon', emoji: '🤨',
    desc: {
      minnie:  'Low tail, maximum side-eye. You said the word "vet" out loud, didn\'t you.',
      biscuit: 'Side-eye engaged. He heard the vacuum\'s name mentioned in casual conversation.',
    } },
  /* -------------------------------- RARE -------------------------------- */
  { id: 'focus', name: 'Focus Mode', rarity: 'rare', emoji: '🎯',
    desc: {
      minnie:  'Locked onto a dust particle with the intensity of a heist movie.',
      biscuit: 'Crouched and locked on… to a piece of kibble that fell behind the fridge in 2023.',
    } },
  { id: 'hunting', name: 'Hunting', rarity: 'rare', emoji: '🥷',
    desc: {
      minnie:  'Slow-motion stalk activated. The red dot never stood a chance. Neither do your ankles.',
      biscuit: 'The Great Stalk begins. Target: a moth. ETA: right after this quick 4-hour nap.',
    } },
  { id: 'irritated', name: 'Irritated', rarity: 'rare', emoji: '😤',
    desc: {
      minnie:  'Tail thumping in Morse code. It spells "dinner was 4 minutes late and I will remember this."',
      biscuit: 'The tail thump of a cat whose bowl is visibly, criminally, 15% less full. Court is in session.',
    } },
  /* ------------------------------ LEGENDARY ----------------------------- */
  { id: 'murdermode', name: 'MURDER MODE', rarity: 'legendary', emoji: '😳',
    desc: {
      minnie:  'Pupils at 100% dilation. Butt wiggle detected. Say your goodbyes to that ankle.',
      biscuit: 'Huge eyes. Pounce loading… 99%… deployed on the milk cap. It is always the milk cap.',
    } },
  { id: 'floof', name: 'Super Floof', rarity: 'legendary', emoji: '🧨',
    desc: {
      minnie:  'Tail circumference tripled, back arched. Threat level: adorable. Cause: a plastic bag.',
      biscuit: 'Bottle-brush tail, crab walk activated. He spooked himself with his own reflection. Again.',
    } },
  { id: 'zoomies', name: '3AM Zoomies', rarity: 'legendary', emoji: '💨',
    desc: {
      minnie:  '3AM. Hallway. Full gallop. Nobody knows why. Science has officially given up.',
      biscuit: 'A grey-and-white blur. That is not motion blur in the photo — that is just Biscuit.',
    } },
];

/* Handy derived lists ------------------------------------------------------ */
const CAT_IDS = Object.keys(CATS);                       // ['minnie','biscuit']
const ALL_FORMS = [];                                    // 24 entries
CAT_IDS.forEach((catId) => {
  MOODS.forEach((mood) => {
    ALL_FORMS.push({
      key: `${catId}_${mood.id}`,
      catId, moodId: mood.id,
      catName: CATS[catId].name,
      moodName: mood.name,
      rarity: mood.rarity,
      emoji: mood.emoji,
      desc: mood.desc[catId],
      sprite: ASSET_MANIFEST.catSprite(catId, mood.id),
    });
  });
});

/* Map zones (drawn with CSS if no tile art present) ------------------------ */
const ZONES = [
  { id: 'backyard', name: 'Backyard',        icon: '🌳', night: false },
  { id: 'living',   name: 'Living Room',     icon: '🛋️', night: false },
  { id: 'kitchen',  name: 'Kitchen',         icon: '🍳', night: false },
  { id: 'midnight', name: 'Midnight Zoomies', icon: '🌙', night: true  },
];
