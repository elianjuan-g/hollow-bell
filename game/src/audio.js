// HOLLOW BELL — audio.js
// Every sound is synthesized with the Web Audio API — no audio files.
// A bell is a struck sine with an inharmonic partial; a shatter is a
// bright noise burst under a high cluster; a Mute growls low. The
// context is created on the first user gesture (browsers forbid sound
// before one) and a soft drone hums under play once it exists.

export function createAudio() {
  let ctx = null;
  let master = null;
  let drone = null;
  let muted = false;

  // Create (or resume) the context. Call from any user gesture.
  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      startDrone();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  }

  function startDrone() {
    if (!ctx || drone) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const g = ctx.createGain();
    g.gain.value = 0.035;
    osc.connect(g);
    g.connect(master);
    osc.start();
    drone = osc;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noiseBurst(dur, vol, freq, when = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
  }

  return {
    ensure,
    setMuted(m) {
      muted = m;
    },
    isMuted() {
      return muted;
    },
    // A strike chime: the bell's fundamental with its inharmonic partial.
    // Higher bells ring higher.
    strike(bellId) {
      ensure();
      const base = 196 * Math.pow(1.122, (bellId - 1) * 2);
      tone(base, 1.6, 'sine', 0.5);
      tone(base * 2.76, 0.9, 'sine', 0.16);
      tone(base * 5.4, 0.4, 'sine', 0.06);
    },
    // A lone arrival ticking a crack into the crystal.
    crack() {
      tone(1240, 0.12, 'triangle', 0.12);
    },
    // A seal shattering: bright noise and a high cluster that falls.
    shatter() {
      noiseBurst(0.35, 0.5, 2400);
      tone(1568, 0.7, 'sine', 0.28, 0, 880);
      tone(2093, 0.6, 'sine', 0.2, 0.02, 1174);
      tone(2637, 0.5, 'sine', 0.12, 0.04, 1318);
    },
    // A Mute stunned: a soft low thud.
    stun() {
      tone(110, 0.25, 'sine', 0.3, 0, 70);
    },
    // A Mute growling: low sawtooth through a lowpass.
    growl() {
      if (!ctx || muted) return;
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, t0);
      osc.frequency.exponentialRampToValueAtTime(55, t0 + 0.5);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.22, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
      osc.connect(filter);
      filter.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + 0.6);
    },
    // A chamber cleared: a rising three-note arpeggio.
    clear() {
      tone(392, 0.5, 'sine', 0.3);
      tone(523.25, 0.5, 'sine', 0.3, 0.09);
      tone(783.99, 0.9, 'sine', 0.3, 0.18);
    },
    // A Breath lost: a low falling tone.
    loseBreath() {
      tone(220, 0.8, 'sine', 0.3, 0, 110);
      tone(165, 0.8, 'sine', 0.2, 0.1, 82);
    },
    // The run ending.
    gameOver() {
      tone(196, 1.2, 'sine', 0.3, 0, 98);
      tone(147, 1.4, 'sine', 0.25, 0.25, 73);
      tone(98, 1.8, 'sine', 0.25, 0.5, 49);
    },
    // A UI click.
    click() {
      tone(880, 0.07, 'triangle', 0.15);
    },
  };
}
