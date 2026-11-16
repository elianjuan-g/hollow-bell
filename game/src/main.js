// HOLLOW BELL — main.js
// The game's spine: the canvas and the loop, the screen state machine
// (title / playing / result / gameover / paused), input, striking,
// scoring, chamber flow and the slow-motion and shake that make a
// crossing feel like something. Every other file does one job; this
// one wires them together.

import {
  VIEW_W, VIEW_H, FLOOR, CENTER, RING_MAX_RADIUS,
  START_BREATHS, CHAIN_WINDOW,
  SCORE_SEAL, SCORE_MUTE, SCORE_CHARGE, SCORE_TIME_PER_SECOND,
  SLOW_MO_SECONDS, SLOW_MO_SCALE, SHAKE_PIXELS, SHAKE_SECONDS,
} from './config.js';
import { makeRng } from './rng.js';
import { strikeRing, updateRings, pruneRings, distance } from './rings.js';
import { createSeal, updateSeals, checkSealCrossings, allSealsShattered } from './seals.js';
import { createMute, updateMutes, checkMuteCrossings, pruneMutes } from './mutes.js';
import { placeBell, bellAt, bellById, removeBell, moveBell } from './bells.js';
import { buildChamber } from './levels.js';
import { createAudio } from './audio.js';
import { drawWorld } from './render.js';
import { drawHUD, drawTitle, drawResult, drawGameOver, drawPaused } from './hud.js';
import { parseShotParams, stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const audio = createAudio();

const state = {
  screen: 'title',
  chamber: 1,
  chamberName: 'FIRST LIGHT',
  hint: '',
  score: 0,
  breaths: START_BREATHS,
  bells: [],
  maxBells: 2,
  charges: 10,
  maxCharges: 10,
  rings: [],
  seals: [],
  mutes: [],
  pillars: [],
  conductor: null,
  particles: [],
  flares: [],
  shake: 0,
  slowMoUntil: 0,
  damageFlash: 0,
  time: 0,
  chamberTime: 0,
  chain: 1,
  lastShatterTime: -10,
  muteSpawnTimer: 0,
  mutesSpawned: 0,
  muteDef: { total: 0, interval: 14, speed: 18 },
  parTime: 30,
  window: 0.25,
  result: null,
  chambersCleared: 0,
  sealsBrokenTotal: 0,
  mouse: { x: 0, y: 0, down: false, dragBell: null, downX: 0, downY: 0, dragged: false },
  rng: makeRng(1),
  seed: 1,
  frozen: false,
};

// ---- view: fit the 960x640 logical view into the window, letterboxed.
let viewScale = 1;
let offsetX = 0;
let offsetY = 0;

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  viewScale = scale * dpr;
  offsetX = (window.innerWidth * dpr - VIEW_W * viewScale) / 2;
  offsetY = (window.innerHeight * dpr - VIEW_H * viewScale) / 2;
}

window.addEventListener('resize', resize);
resize();

function toLogical(clientX, clientY) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  return {
    x: (clientX * dpr - offsetX) / viewScale,
    y: (clientY * dpr - offsetY) / viewScale,
  };
}

// ---- chambers

function loadChamber(n) {
  const def = buildChamber(n, state.rng);
  state.chamber = n;
  state.chamberName = def.name;
  state.hint = def.hint;
  state.maxBells = def.bells;
  state.maxCharges = def.charges;
  state.charges = def.charges;
  state.parTime = def.parTime;
  state.window = def.window;
  state.seals = def.seals.map((s) => createSeal(s.x, s.y, s));
  state.pillars = def.pillars.map((p) => ({ ...p }));
  state.conductor = def.conductor ? { ...def.conductor } : null;
  state.muteDef = def.mutes;
  state.bells = [];
  state.rings = [];
  state.mutes = [];
  state.particles = [];
  state.flares = [];
  state.chamberTime = 0;
  state.chain = 1;
  state.lastShatterTime = -10;
  state.muteSpawnTimer = 6;
  state.mutesSpawned = 0;
}

// ---- effects

function burst(x, y, color, count, speed = 120) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.3 + Math.random() * 0.7);
    state.particles.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0.5 + Math.random() * 0.6,
      maxLife: 1.1,
      color,
      size: 1 + Math.random() * 2,
    });
  }
}

function addFlare(x, y) {
  state.flares.push({ x, y, life: 1 });
}

function triggerSlowMo() {
  state.slowMoUntil = performance.now() / 1000 + SLOW_MO_SECONDS;
}

function triggerShake() {
  state.shake = SHAKE_PIXELS;
}

function loseBreath(reason) {
  state.breaths -= 1;
  state.damageFlash = 1;
  triggerShake();
  audio.loseBreath();
  if (state.breaths <= 0) {
    state.screen = 'gameover';
    audio.gameOver();
  }
}

// ---- striking

function strikeBell(bell) {
  if (state.screen !== 'playing' || state.charges <= 0) return false;
  state.charges -= 1;
  bell.lastStrike = state.time;
  strikeRing(state.rings, bell.x, bell.y, String(bell.id));
  audio.strike(bell.id);
  return true;
}

function strikeAll() {
  if (state.screen !== 'playing') return;
  for (const bell of [...state.bells]) {
    if (state.charges <= 0) break;
    strikeBell(bell);
  }
}

// A decorative strike for the title backdrop: no charge, no sound.
function decorativeStrike(bell) {
  bell.lastStrike = state.time;
  strikeRing(state.rings, bell.x, bell.y, String(bell.id));
}

// ---- pillars: a ring front hitting one reflects into a second front.

function checkPillarReflections() {
  for (const ring of state.rings) {
    if (ring.dead) continue;
    for (const pillar of state.pillars) {
      if (ring.hitPillars.has(pillar)) continue;
      const d = distance(ring.x, ring.y, pillar.x, pillar.y);
      if (ring.prevRadius < d && d <= ring.radius) {
        ring.hitPillars.add(pillar);
        strikeRing(state.rings, pillar.x, pillar.y, `${ring.source}r`, 300);
      }
    }
  }
}

// ---- Mute spawning

function spawnMute() {
  const edge = state.rng.int(0, 3);
  let x;
  let y;
  if (edge === 0) { x = state.rng.range(FLOOR.x + 20, FLOOR.x + FLOOR.w - 20); y = FLOOR.y + 10; }
  else if (edge === 1) { x = state.rng.range(FLOOR.x + 20, FLOOR.x + FLOOR.w - 20); y = FLOOR.y + FLOOR.h - 10; }
  else if (edge === 2) { x = FLOOR.x + 10; y = state.rng.range(FLOOR.y + 20, FLOOR.y + FLOOR.h - 20); }
  else { x = FLOOR.x + FLOOR.w - 10; y = state.rng.range(FLOOR.y + 20, FLOOR.y + FLOOR.h - 20); }
  state.mutes.push(createMute(x, y, state.muteDef.speed));
  state.mutesSpawned += 1;
}

// ---- update

function update(dt) {
  state.time += dt;
  if (state.screen === 'title') {
    // Keep the title's two rings crossing behind the text.
    if (state.rings.length === 0 && state.bells.length >= 2) {
      decorativeStrike(state.bells[0]);
      decorativeStrike(state.bells[1]);
    }
    updateRings(state.rings, dt, null);
    pruneRings(state.rings);
    return;
  }
  if (state.screen !== 'playing') return;

  state.chamberTime += dt;
  updateSeals(state.seals, dt, state.time);
  updateRings(state.rings, dt, state.conductor);
  checkPillarReflections();

  const crossWindow = state.window;
  const sealHits = checkSealCrossings(state.seals, state.rings, state.time, crossWindow);
  for (const seal of sealHits.cracked) audio.crack();
  for (const seal of sealHits.shattered) {
    if (state.time - state.lastShatterTime <= CHAIN_WINDOW) state.chain += 1;
    else state.chain = 1;
    state.lastShatterTime = state.time;
    state.score += SCORE_SEAL * state.chain;
    state.sealsBrokenTotal += 1;
    burst(seal.x, seal.y, 'rgba(255, 243, 214, A)', 26, 150);
    burst(seal.x, seal.y, 'rgba(127, 231, 255, A)', 14, 90);
    addFlare(seal.x, seal.y);
    triggerSlowMo();
    triggerShake();
    audio.shatter();
  }

  const muteHits = checkMuteCrossings(state.mutes, state.rings, state.time, crossWindow);
  for (const mute of muteHits.stunned) audio.stun();
  for (const mute of muteHits.killed) {
    state.score += SCORE_MUTE;
    burst(mute.x, mute.y, 'rgba(255, 90, 78, A)', 18, 110);
    addFlare(mute.x, mute.y);
    triggerShake();
    audio.shatter();
  }

  const muteEvents = updateMutes(state.mutes, state.bells, dt, state.time);
  for (const ev of muteEvents) {
    if (ev.type === 'ate-bell') {
      removeBell(state.bells, ev.bell);
      burst(ev.bell.x, ev.bell.y, 'rgba(232, 179, 75, A)', 20, 120);
      audio.growl();
      loseBreath('bell eaten');
    } else if (ev.type === 'reached-center') {
      burst(CENTER.x, CENTER.y, 'rgba(255, 90, 78, A)', 20, 120);
      audio.growl();
      loseBreath('centre reached');
    }
    if (state.screen !== 'playing') break;
  }

  // Mute spawning, on a timer, up to the chamber's total (endless: forever).
  if (state.mutesSpawned < state.muteDef.total) {
    state.muteSpawnTimer -= dt;
    if (state.muteSpawnTimer <= 0) {
      spawnMute();
      state.muteSpawnTimer = state.muteDef.interval;
    }
  }

  // Particles, flares, shake, flash.
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const f of state.flares) f.life -= dt * 1.8;
  state.flares = state.flares.filter((f) => f.life > 0);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * (SHAKE_PIXELS / SHAKE_SECONDS));
  if (state.damageFlash > 0) state.damageFlash = Math.max(0, state.damageFlash - dt * 2.5);

  pruneRings(state.rings);
  pruneMutes(state.mutes);

  // Chamber cleared: bonuses, then the result card.
  if (allSealsShattered(state.seals)) {
    const chargeBonus = state.charges * SCORE_CHARGE;
    const timeBonus = Math.max(0, Math.round(state.parTime - state.chamberTime)) * SCORE_TIME_PER_SECOND;
    state.score += chargeBonus + timeBonus;
    state.chambersCleared += 1;
    state.result = {
      chamber: state.chamber,
      sealsBroken: state.seals.length,
      chargeBonus,
      timeBonus,
      score: state.score,
    };
    state.screen = 'result';
    audio.clear();
  }
}

// ---- render

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#07090c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(viewScale, 0, 0, viewScale, offsetX, offsetY);
  const t = performance.now() / 1000;
  drawWorld(ctx, state, t);
  if (state.screen === 'playing' || state.screen === 'paused') drawHUD(ctx, state);
  if (state.screen === 'title') drawTitle(ctx, t);
  if (state.screen === 'result' && state.result) drawResult(ctx, state.result);
  if (state.screen === 'gameover') drawGameOver(ctx, state);
  if (state.screen === 'paused') drawPaused(ctx);
  if (state.damageFlash > 0) {
    ctx.fillStyle = `rgba(255, 60, 50, ${0.16 * state.damageFlash})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

// ---- the loop

let lastT = performance.now();

function frame(now) {
  const rawDt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const scaled = now / 1000 < state.slowMoUntil ? SLOW_MO_SCALE : 1;
  if (!state.frozen) update(rawDt * scaled);
  render();
  if (!state.frozen) requestAnimationFrame(frame);
}

// ---- input

function startRun() {
  state.score = 0;
  state.breaths = START_BREATHS;
  state.chambersCleared = 0;
  state.sealsBrokenTotal = 0;
  state.rng = makeRng(state.seed);
  loadChamber(1);
  state.screen = 'playing';
}

canvas.addEventListener('mousedown', (e) => {
  audio.ensure();
  const p = toLogical(e.clientX, e.clientY);
  state.mouse.down = true;
  state.mouse.dragged = false;
  state.mouse.downX = p.x;
  state.mouse.downY = p.y;
  if (state.screen === 'title') {
    startRun();
    return;
  }
  if (state.screen === 'result') {
    loadChamber(state.chamber + 1);
    state.screen = 'playing';
    return;
  }
  if (state.screen === 'gameover') {
    startRun();
    return;
  }
  if (state.screen !== 'playing') return;
  const bell = bellAt(state.bells, p.x, p.y);
  if (bell) {
    state.mouse.dragBell = bell;
  } else if (state.bells.length < state.maxBells) {
    const placed = placeBell(state.bells, state.maxBells, p.x, p.y);
    if (placed) audio.click();
  }
});

canvas.addEventListener('mousemove', (e) => {
  const p = toLogical(e.clientX, e.clientY);
  state.mouse.x = p.x;
  state.mouse.y = p.y;
  if (state.mouse.down && state.mouse.dragBell) {
    if (Math.hypot(p.x - state.mouse.downX, p.y - state.mouse.downY) > 8) {
      state.mouse.dragged = true;
      moveBell(state.mouse.dragBell, p.x, p.y);
    }
  }
});

canvas.addEventListener('mouseup', () => {
  if (state.mouse.down && state.mouse.dragBell && !state.mouse.dragged) {
    strikeBell(state.mouse.dragBell);
  }
  state.mouse.down = false;
  state.mouse.dragBell = null;
});

window.addEventListener('keydown', (e) => {
  audio.ensure();
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === 'm') {
    audio.setMuted(!audio.isMuted());
    return;
  }
  if (state.screen === 'title') {
    startRun();
    return;
  }
  if (state.screen === 'result' && (k === 'enter' || k === ' ')) {
    loadChamber(state.chamber + 1);
    state.screen = 'playing';
    return;
  }
  if (state.screen === 'gameover' && k === 'r') {
    startRun();
    return;
  }
  if (k === 'p' || k === 'escape') {
    if (state.screen === 'playing') state.screen = 'paused';
    else if (state.screen === 'paused') state.screen = 'playing';
    return;
  }
  if (state.screen !== 'playing') return;
  if (k === '1' || k === '2' || k === '3') {
    const bell = bellById(state.bells, Number(k));
    if (bell) strikeBell(bell);
  } else if (k === ' ') {
    e.preventDefault();
    strikeAll();
  } else if (k === 'r') {
    // Out of charges: spend a Breath to ring again.
    if (state.charges === 0 && state.breaths > 0) {
      state.breaths -= 1;
      state.charges = state.maxCharges;
      audio.clear();
      if (state.breaths <= 0) {
        state.screen = 'gameover';
        audio.gameOver();
      }
    }
  }
});

// ---- boot

// A handle for play-testing (read-only from the outside): the live
// game state, so an automated test can place bells, strike, and read
// back the score, seals and Breaths without poking at pixels.
window.__hollowBell = state;
// Jump to a chamber for play-testing (also resets to the playing screen).
window.__hollowBellLoad = (n) => { loadChamber(n); state.screen = 'playing'; };

const { shot, seed } = parseShotParams();
state.seed = seed;
if (shot) {
  loadChamber(1);
  // A decorative pair of bells behind the title.
  state.bells = [
    { id: 1, x: 300, y: 320, lastStrike: -10 },
    { id: 2, x: 660, y: 320, lastStrike: -10 },
  ];
  stageShot(state, shot, seed);
  render();
} else {
  loadChamber(1);
  // Two bells behind the title, ringing on their own until play starts.
  state.bells = [
    { id: 1, x: 300, y: 320, lastStrike: -10 },
    { id: 2, x: 660, y: 320, lastStrike: -10 },
  ];
  requestAnimationFrame(frame);
}
