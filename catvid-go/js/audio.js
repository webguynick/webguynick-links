/* ==========================================================================
   CatVid GO — audio.js
   All sound effects are synthesized with the Web Audio API (oscillators),
   so no audio files are needed. Respects the mute toggle in Settings.
   ========================================================================== */

const Sound = {
  ctx: null,

  /** Lazily create the AudioContext (must happen after a user gesture). */
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  /** Play one oscillator note with a simple envelope. */
  tone({ freq = 440, endFreq = null, type = 'sine', dur = 0.15, vol = 0.25, delay = 0 }) {
    if (State.data.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  },

  /* --- The game's sound vocabulary -------------------------------------- */

  pop()  { this.tone({ freq: 500, endFreq: 900, type: 'sine', dur: 0.09, vol: 0.3 }); },

  meow() { // rising-then-falling "mrrow?"
    this.tone({ freq: 420, endFreq: 780, type: 'triangle', dur: 0.18, vol: 0.22 });
    this.tone({ freq: 780, endFreq: 500, type: 'triangle', dur: 0.22, vol: 0.2, delay: 0.16 });
  },

  sadMeow() { // downward whine on escape
    this.tone({ freq: 600, endFreq: 220, type: 'triangle', dur: 0.5, vol: 0.22 });
  },

  purr() { // low rumble: quick pulse train
    if (State.data.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    for (let i = 0; i < 14; i++) {
      this.tone({ freq: 55 + (i % 2) * 12, type: 'sawtooth', dur: 0.05, vol: 0.14, delay: i * 0.055 });
    }
  },

  coin()  { this.tone({ freq: 900, endFreq: 1400, type: 'square', dur: 0.1, vol: 0.12 });
            this.tone({ freq: 1400, endFreq: 1800, type: 'square', dur: 0.12, vol: 0.1, delay: 0.09 }); },

  throwWhoosh() { this.tone({ freq: 300, endFreq: 90, type: 'sine', dur: 0.25, vol: 0.15 }); },

  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) =>
      this.tone({ freq: f, type: 'triangle', dur: 0.18, vol: 0.2, delay: i * 0.12 }));
  },

  sparkle() { // legendary shimmer
    [1200, 1600, 2100].forEach((f, i) =>
      this.tone({ freq: f, type: 'sine', dur: 0.12, vol: 0.1, delay: i * 0.07 }));
  },
};
